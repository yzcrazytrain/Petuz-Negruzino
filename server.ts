import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import {
  COOP_MAX_PAYLOAD_BYTES,
  addPlayerToRoom,
  createRoomRecord,
  generateRoomCode,
  parseClientMessage,
  removePlayerFromRoom,
  serializePublicRoomInfo,
  serializeRoomSnapshot,
  type CoopServerMessage,
  type RoomRecord,
} from './src/game/coopProtocol';

const PORT = 3000;
const MAX_ROOMS = 64;

const HEARTBEAT_INTERVAL_MS = 15_000;
const STALE_CLIENT_TIMEOUT_MS = 38_000;

interface ClientSession {
  id: string;
  ws: WebSocket;
  roomCode: string | null;
  badFrameCount: number;
  isAlive: boolean;
  lastSeenAt: number;
}

function getLanIPv4Addresses(): string[] {
  const nets = os.networkInterfaces();
  const preferred: string[] = [];
  const fallback: string[] = [];
  for (const entries of Object.values(nets)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family === 'IPv4' && !entry.internal) {
        if (entry.address.startsWith('169.254.')) {
          fallback.push(entry.address);
        } else {
          preferred.push(entry.address);
        }
      }
    }
  }
  const chosen = preferred.length > 0 ? preferred : fallback;
  return Array.from(new Set(chosen));
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  const rooms = new Map<string, RoomRecord>();
  const clients = new Map<string, ClientSession>();

  const send = (ws: WebSocket, msg: CoopServerMessage) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  const broadcastRoom = (room: RoomRecord, msg: CoopServerMessage, excludeId?: string) => {
    const raw = JSON.stringify(msg);
    for (const playerId of room.players.keys()) {
      if (excludeId && playerId === excludeId) continue;
      const client = clients.get(playerId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(raw);
      }
    }
  };

  const leaveCurrentRoom = (session: ClientSession, notifySelf = false) => {
    if (!session.roomCode) return;
    const room = rooms.get(session.roomCode);
    session.roomCode = null;
    if (!room) return;
    const departingName = room.players.get(session.id)?.name ?? 'ВЫЖИВШИЙ';
    const previousHostId = room.hostId;
    const isEmpty = removePlayerFromRoom(room, session.id);
    if (isEmpty) {
      rooms.delete(room.code);
    } else {
      const migrated = previousHostId !== room.hostId;
      const newHostName = migrated ? room.players.get(room.hostId)?.name : undefined;
      broadcastRoom(room, {
        type: 'player:left',
        playerId: session.id,
        playerName: departingName,
        newHostId: migrated ? room.hostId : undefined,
        newHostName,
      });
      broadcastRoom(room, { type: 'room:state', room: serializeRoomSnapshot(room) });

      // Re-evaluate Hub Moskvitch boarding after disconnect so remaining players aren't stuck
      if (room.inHub && !room.started) {
        const boardedIds = Array.from(room.boardedPlayers);
        broadcastRoom(room, {
          type: 'hub:board_state',
          boardedIds,
          totalPlayers: room.players.size,
        });
        if (boardedIds.length >= room.players.size && room.players.size > 0) {
          room.inHub = false;
          room.started = true;
          room.zoneId = 'suburb';
          room.chapterIndex = 0;
          room.boardedPlayers.clear();
          room.cutsceneId = null;
          room.cutsceneSkipVotes.clear();
          room.completedObjectives.clear();
          room.collectedTapes.clear();
          room.takenPickups.clear();
          for (const p of room.players.values()) {
            p.hp = p.maxHp;
            p.isDowned = false;
            p.kills = 0;
          }
          broadcastRoom(room, { type: 'game:start', room: serializeRoomSnapshot(room) });
        }
      }

      // Re-evaluate Cutscene Skip Vote after disconnect so remaining voters auto-skip if unanimous
      if (room.cutsceneId) {
        const votedIds = Array.from(room.cutsceneSkipVotes);
        const activeCsId = room.cutsceneId;
        broadcastRoom(room, {
          type: 'cutscene:votes',
          cutsceneId: activeCsId,
          votedIds,
          totalPlayers: room.players.size,
        });
        if (votedIds.length >= room.players.size && room.players.size > 0) {
          room.cutsceneId = null;
          room.cutsceneSkipVotes.clear();
          broadcastRoom(room, { type: 'cutscene:skipped', cutsceneId: activeCsId });
        }
      }
    }
    if (notifySelf) {
      send(session.ws, { type: 'room:left' });
    }
  };

  app.get('/api/lan-info', (_req, res) => {
    const openRooms = Array.from(rooms.values())
      .slice(0, 24)
      .map((room) => serializePublicRoomInfo(room));
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      port: PORT,
      addresses: getLanIPv4Addresses(),
      rooms: openRooms,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({
    server,
    path: '/ws/coop',
    maxPayload: COOP_MAX_PAYLOAD_BYTES,
  });

  const heartbeatTimer = setInterval(() => {
    const now = Date.now();
    for (const [clientId, session] of clients.entries()) {
      if (session.ws.readyState !== WebSocket.OPEN) {
        leaveCurrentRoom(session, false);
        clients.delete(clientId);
        continue;
      }
      if (!session.isAlive || now - session.lastSeenAt > STALE_CLIENT_TIMEOUT_MS) {
        leaveCurrentRoom(session, false);
        clients.delete(clientId);
        try {
          session.ws.terminate();
        } catch {
          // ignore
        }
        continue;
      }
      session.isAlive = false;
      try {
        session.ws.ping();
      } catch {
        // ignore
      }
    }
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => {
    clearInterval(heartbeatTimer);
  });

  wss.on('connection', (ws) => {
    const clientId = `p_${crypto.randomBytes(6).toString('hex')}`;
    const session: ClientSession = {
      id: clientId,
      ws,
      roomCode: null,
      badFrameCount: 0,
      isAlive: true,
      lastSeenAt: Date.now(),
    };
    clients.set(clientId, session);
    send(ws, { type: 'welcome', clientId });

    ws.on('pong', () => {
      session.isAlive = true;
      session.lastSeenAt = Date.now();
    });

    ws.on('error', () => {
      leaveCurrentRoom(session, false);
      clients.delete(clientId);
    });

    ws.on('message', (data) => {
      session.isAlive = true;
      session.lastSeenAt = Date.now();
      const rawText = typeof data === 'string' ? data : data.toString('utf8');
      const msg = parseClientMessage(rawText);
      if (!msg) {
        session.badFrameCount += 1;
        if (session.badFrameCount >= 12) {
          ws.close(1008, 'Malformed payload limit exceeded');
        } else {
          send(ws, { type: 'error', code: 'BAD_PAYLOAD', message: 'Некорректное сообщение протокола.' });
        }
        return;
      }

      if (msg.type === 'ping') {
        send(ws, { type: 'pong', ts: msg.ts ?? Date.now() });
        return;
      }

      if (msg.type === 'room:create') {
        leaveCurrentRoom(session, false);
        if (rooms.size >= MAX_ROOMS) {
          send(ws, { type: 'error', code: 'SERVER_FULL', message: 'Слишком много открытых LAN-комнат.' });
          return;
        }
        const code = generateRoomCode(rooms);
        const room = createRoomRecord(code, session.id, msg.name, msg.mode, msg.difficulty);
        rooms.set(code, room);
        session.roomCode = code;
        send(ws, { type: 'room:state', room: serializeRoomSnapshot(room) });
        return;
      }

      if (msg.type === 'room:join') {
        leaveCurrentRoom(session, false);
        const room = rooms.get(msg.code);
        if (!room) {
          send(ws, { type: 'error', code: 'ROOM_NOT_FOUND', message: `Комната ${msg.code} не найдена.` });
          return;
        }
        const joinRes = addPlayerToRoom(room, session.id, msg.name);
        if (!joinRes.ok) {
          send(ws, { type: 'error', code: joinRes.code, message: joinRes.message });
          return;
        }
        session.roomCode = room.code;
        const snapshot = serializeRoomSnapshot(room);
        broadcastRoom(room, { type: 'room:state', room: snapshot });
        if (room.started) {
          send(ws, { type: 'game:start', room: snapshot });
        } else if (room.inHub) {
          send(ws, { type: 'hub:enter', room: snapshot });
          broadcastRoom(room, {
            type: 'hub:board_state',
            boardedIds: Array.from(room.boardedPlayers),
            totalPlayers: room.players.size,
          });
        }
        return;
      }

      if (msg.type === 'room:leave') {
        leaveCurrentRoom(session, true);
        return;
      }

      if (!session.roomCode) return;
      const room = rooms.get(session.roomCode);
      if (!room) {
        session.roomCode = null;
        return;
      }
      const me = room.players.get(session.id);
      if (!me) return;

      switch (msg.type) {
        case 'lobby:config':
          if (room.hostId !== session.id) return;
          room.mode = msg.mode;
          room.difficulty = msg.difficulty;
          broadcastRoom(room, { type: 'room:state', room: serializeRoomSnapshot(room) });
          break;

        case 'lobby:ready':
          me.ready = room.hostId === session.id ? true : msg.ready;
          broadcastRoom(room, { type: 'room:state', room: serializeRoomSnapshot(room) });
          break;

        case 'hub:enter':
          if (room.hostId !== session.id) return;
          room.inHub = true;
          room.started = false;
          room.zoneId = 'hub';
          room.boardedPlayers.clear();
          room.cutsceneId = null;
          room.cutsceneSkipVotes.clear();
          broadcastRoom(room, { type: 'hub:enter', room: serializeRoomSnapshot(room) });
          broadcastRoom(room, {
            type: 'hub:board_state',
            boardedIds: [],
            totalPlayers: room.players.size,
          });
          break;

        case 'hub:board': {
          if (!room.inHub || room.started) return;
          if (msg.boarded) {
            room.boardedPlayers.add(session.id);
          } else {
            room.boardedPlayers.delete(session.id);
          }
          const boardedIds = Array.from(room.boardedPlayers);
          broadcastRoom(room, {
            type: 'hub:board_state',
            boardedIds,
            totalPlayers: room.players.size,
          });
          broadcastRoom(room, { type: 'room:state', room: serializeRoomSnapshot(room) });

          // Match starts ONLY when ALL active players in the hub have boarded the Moskvitch!
          if (boardedIds.length >= room.players.size && room.players.size > 0) {
            room.inHub = false;
            room.started = true;
            room.zoneId = 'suburb';
            room.chapterIndex = 0;
            room.boardedPlayers.clear();
            room.cutsceneId = null;
            room.cutsceneSkipVotes.clear();
            room.completedObjectives.clear();
            room.collectedTapes.clear();
            room.takenPickups.clear();
            for (const p of room.players.values()) {
              p.hp = p.maxHp;
              p.isDowned = false;
              p.kills = 0;
            }
            broadcastRoom(room, { type: 'game:start', room: serializeRoomSnapshot(room) });
          }
          break;
        }

        case 'cutscene:open':
          room.cutsceneId = msg.cutsceneId;
          room.cutsceneSkipVotes.clear();
          broadcastRoom(room, {
            type: 'cutscene:votes',
            cutsceneId: msg.cutsceneId,
            votedIds: [],
            totalPlayers: room.players.size,
          });
          break;

        case 'cutscene:vote_skip': {
          if (room.cutsceneId !== msg.cutsceneId) {
            room.cutsceneId = msg.cutsceneId;
            room.cutsceneSkipVotes.clear();
          }
          if (msg.vote) {
            room.cutsceneSkipVotes.add(session.id);
          } else {
            room.cutsceneSkipVotes.delete(session.id);
          }
          const votedIds = Array.from(room.cutsceneSkipVotes);
          broadcastRoom(room, {
            type: 'cutscene:votes',
            cutsceneId: msg.cutsceneId,
            votedIds,
            totalPlayers: room.players.size,
          });
          if (votedIds.length >= room.players.size && room.players.size > 0) {
            room.cutsceneId = null;
            room.cutsceneSkipVotes.clear();
            broadcastRoom(room, { type: 'cutscene:skipped', cutsceneId: msg.cutsceneId });
          }
          break;
        }

        case 'lobby:start':
          if (room.hostId !== session.id) return;
          room.inHub = false;
          room.started = true;
          room.zoneId = 'suburb';
          room.chapterIndex = 0;
          room.boardedPlayers.clear();
          room.cutsceneId = null;
          room.cutsceneSkipVotes.clear();
          room.completedObjectives.clear();
          room.collectedTapes.clear();
          room.takenPickups.clear();
          for (const p of room.players.values()) {
            p.hp = p.maxHp;
            p.isDowned = false;
            p.kills = 0;
          }
          broadcastRoom(room, { type: 'game:start', room: serializeRoomSnapshot(room) });
          break;

        case 'player:state':
          me.hp = msg.state.hp;
          me.maxHp = msg.state.maxHp;
          me.isDowned = msg.state.isDowned;
          me.weaponId = msg.state.weaponId;
          me.kills = msg.state.kills;
          broadcastRoom(
            room,
            {
              type: 'player:state',
              state: {
                id: session.id,
                name: me.name,
                ...msg.state,
              },
            },
            session.id,
          );
          break;

        case 'player:shoot':
          broadcastRoom(
            room,
            {
              type: 'player:shoot',
              playerId: session.id,
              weaponId: msg.weaponId,
              ox: msg.ox,
              oy: msg.oy,
              oz: msg.oz,
              dx: msg.dx,
              dy: msg.dy,
              dz: msg.dz,
            },
            session.id,
          );
          break;

        case 'player:revive': {
          const target = room.players.get(msg.targetId);
          if (!target) return;
          target.isDowned = false;
          target.hp = Math.max(60, Math.round(target.maxHp * 0.65));
          broadcastRoom(room, {
            type: 'player:revived',
            targetId: msg.targetId,
            byId: session.id,
            byName: me.name,
          });
          broadcastRoom(room, { type: 'room:state', room: serializeRoomSnapshot(room) });
          break;
        }

        case 'player:ping':
          broadcastRoom(room, {
            type: 'player:ping',
            playerId: session.id,
            playerName: me.name,
            x: msg.x,
            z: msg.z,
            label: msg.label,
          });
          break;

        case 'world:enemies':
          if (room.hostId !== session.id) return;
          broadcastRoom(
            room,
            {
              type: 'world:enemies',
              enemies: msg.enemies,
              chapterKills: msg.chapterKills,
              chapterTarget: msg.chapterTarget,
            },
            session.id,
          );
          break;

        case 'world:pickups':
          if (room.hostId !== session.id) return;
          broadcastRoom(
            room,
            {
              type: 'world:pickups',
              pickups: msg.pickups.filter((p) => !room.takenPickups.has(p.id)),
            },
            session.id,
          );
          break;

        case 'pickup:take':
          if (!room.takenPickups.has(msg.pickupId)) {
            room.takenPickups.add(msg.pickupId);
            broadcastRoom(room, {
              type: 'pickup:take',
              pickupId: msg.pickupId,
              byId: session.id,
              byName: me.name,
            });
          }
          break;

        case 'enemy:damage': {
          const hostSession = clients.get(room.hostId);
          if (hostSession && hostSession.id !== session.id) {
            send(hostSession.ws, {
              type: 'enemy:damage',
              fromId: session.id,
              enemyId: msg.enemyId,
              damage: msg.damage,
              headshot: msg.headshot,
            });
          }
          break;
        }

        case 'objective:complete':
          if (!room.completedObjectives.has(msg.objectiveId)) {
            room.completedObjectives.add(msg.objectiveId);
            broadcastRoom(room, {
              type: 'objective:complete',
              objectiveId: msg.objectiveId,
              byName: me.name,
            });
          }
          break;

        case 'tape:collect':
          if (!room.collectedTapes.has(msg.tapeId)) {
            room.collectedTapes.add(msg.tapeId);
            broadcastRoom(room, {
              type: 'tape:collect',
              tapeId: msg.tapeId,
              byName: me.name,
            });
          }
          break;

        case 'chapter:advance':
          if (room.hostId !== session.id) return;
          room.chapterIndex = msg.chapterIndex;
          room.zoneId =
            msg.chapterIndex < 6 ? 'suburb' : msg.chapterIndex < 12 ? 'depot' : 'substation';
          room.takenPickups.clear();
          room.cutsceneId = null;
          room.cutsceneSkipVotes.clear();
          broadcastRoom(
            room,
            {
              type: 'chapter:advance',
              chapterIndex: msg.chapterIndex,
              victory: msg.victory,
            },
            session.id,
          );
          break;
      }
    });

    ws.on('close', () => {
      leaveCurrentRoom(session, false);
      clients.delete(clientId);
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`NEGRUZINO LAN server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start NEGRUZINO server:', err);
  process.exit(1);
});
