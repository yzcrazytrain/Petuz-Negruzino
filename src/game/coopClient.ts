import type { DifficultyId, GameMode, WeaponId } from './types';
import type {
  CoopClientMessage,
  CoopLanInfoResponse,
  CoopPlayerState,
  CoopRoomSnapshot,
  CoopServerMessage,
  CoopSyncedEnemy,
  CoopSyncedPickup,
} from './coopProtocol';

export interface CoopClientCallbacks {
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected', error?: string) => void;
  onWelcome?: (clientId: string) => void;
  onRoomState?: (room: CoopRoomSnapshot) => void;
  onRoomLeft?: (reason?: string) => void;
  onPlayerLeft?: (evt: Extract<CoopServerMessage, { type: 'player:left' }>) => void;
  onHubEnter?: (room: CoopRoomSnapshot) => void;
  onHubBoardState?: (boardedIds: string[], totalPlayers: number) => void;
  onCutsceneVotes?: (cutsceneId: string, votedIds: string[], totalPlayers: number) => void;
  onCutsceneSkipped?: (cutsceneId: string) => void;
  onGameStart?: (room: CoopRoomSnapshot) => void;
  onRemotePlayerState?: (state: CoopPlayerState) => void;
  onRemotePlayerShoot?: (evt: Extract<CoopServerMessage, { type: 'player:shoot' }>) => void;
  onPlayerRevived?: (evt: Extract<CoopServerMessage, { type: 'player:revived' }>) => void;
  onPlayerPing?: (evt: Extract<CoopServerMessage, { type: 'player:ping' }>) => void;
  onWorldEnemies?: (enemies: CoopSyncedEnemy[], chapterKills: number, chapterTarget: number) => void;
  onWorldPickups?: (pickups: CoopSyncedPickup[]) => void;
  onPickupTake?: (evt: Extract<CoopServerMessage, { type: 'pickup:take' }>) => void;
  onEnemyDamage?: (evt: Extract<CoopServerMessage, { type: 'enemy:damage' }>) => void;
  onObjectiveComplete?: (objectiveId: string, byName: string) => void;
  onTapeCollect?: (tapeId: string, byName: string) => void;
  onChapterAdvance?: (chapterIndex: number, victory?: boolean) => void;
  onError?: (message: string) => void;
}

export function resolveCoopUrls(customHostInput?: string): { httpBase: string; wsUrl: string } {
  const trimmed = (customHostInput ?? '').trim();
  if (trimmed) {
    let cleaned = trimmed.replace(/\/+$/, '');
    if (cleaned.startsWith('ws://') || cleaned.startsWith('wss://')) {
      const wsUrl = cleaned.endsWith('/ws/coop') ? cleaned : `${cleaned}/ws/coop`;
      const httpBase = cleaned
        .replace(/^wss:\/\//, 'https://')
        .replace(/^ws:\/\//, 'http://')
        .replace(/\/ws\/coop$/, '');
      return { httpBase, wsUrl };
    }
    if (!/^https?:\/\//i.test(cleaned)) {
      cleaned = `http://${cleaned}`;
    }
    try {
      const parsed = new URL(cleaned);
      const portPart = parsed.port ? `:${parsed.port}` : ':3000';
      const origin = `${parsed.protocol}//${parsed.hostname}${portPart}`;
      const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return {
        httpBase: origin,
        wsUrl: `${wsProto}//${parsed.hostname}${portPart}/ws/coop`,
      };
    } catch {
      // Fall through to current origin
    }
  }

  if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return {
      httpBase: window.location.origin,
      wsUrl: `${wsProto}//${window.location.host}/ws/coop`,
    };
  }

  return {
    httpBase: 'http://localhost:3000',
    wsUrl: 'ws://localhost:3000/ws/coop',
  };
}

export class CoopClient {
  private ws: WebSocket | null = null;
  private status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private clientId: string | null = null;
  private room: CoopRoomSnapshot | null = null;
  private serverHost = '';
  private callbacks: CoopClientCallbacks = {};
  private heartbeatIntervalId: number | null = null;
  private reconnectTimerId: number | null = null;
  private lastPongAt = 0;
  private intentionalDisconnect = false;
  private reconnectAttempts = 0;
  private savedRoomCode: string | null = null;
  private savedCallsign = 'ВЫЖИВШИЙ';

  setCallbacks(callbacks: CoopClientCallbacks) {
    this.callbacks = callbacks;
  }

  getClientId(): string | null {
    return this.clientId;
  }

  getRoom(): CoopRoomSnapshot | null {
    return this.room;
  }

  getStatus(): 'disconnected' | 'connecting' | 'connected' {
    return this.status;
  }

  isHost(): boolean {
    return Boolean(this.room && this.clientId && this.room.hostId === this.clientId);
  }

  isInActiveSession(): boolean {
    return Boolean(this.room && (this.room.started || this.room.inHub) && this.status === 'connected');
  }

  async fetchLanInfo(customHost?: string): Promise<CoopLanInfoResponse | null> {
    try {
      const { httpBase } = resolveCoopUrls(customHost ?? this.serverHost);
      const resp = await fetch(`${httpBase}/api/lan-info`, { cache: 'no-store' });
      if (!resp.ok) return null;
      return (await resp.json()) as CoopLanInfoResponse;
    } catch {
      return null;
    }
  }

  private stopHeartbeat() {
    if (this.heartbeatIntervalId !== null) {
      window.clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimerId !== null) {
      window.clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.lastPongAt = Date.now();
    this.heartbeatIntervalId = window.setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      if (Date.now() - this.lastPongAt > 28_000) {
        try {
          this.ws.close(4000, 'Heartbeat timeout');
        } catch {
          // ignore
        }
        return;
      }
      this.send({ type: 'ping', ts: Date.now() });
    }, 10_000);
  }

  private scheduleReconnect() {
    if (this.intentionalDisconnect || !this.savedRoomCode) return;
    if (this.reconnectAttempts >= 4) {
      this.savedRoomCode = null;
      this.room = null;
      this.callbacks.onStatusChange?.('disconnected', 'Связь с LAN-сервером потеряна.');
      this.callbacks.onRoomLeft?.('disconnect');
      return;
    }
    const attempt = this.reconnectAttempts;
    this.reconnectAttempts += 1;
    const delayMs = Math.min(7000, 1200 * Math.pow(1.8, attempt));
    this.clearReconnectTimer();
    this.callbacks.onStatusChange?.('connecting', `Переподключение (${this.reconnectAttempts}/4)...`);
    this.reconnectTimerId = window.setTimeout(() => {
      this.reconnectTimerId = null;
      const roomToRejoin = this.savedRoomCode;
      if (this.intentionalDisconnect || !roomToRejoin) return;
      this.connect(this.serverHost)
        .then(() => {
          if (this.savedRoomCode) {
            this.joinRoom(this.savedRoomCode, this.savedCallsign);
          }
        })
        .catch(() => {
          this.scheduleReconnect();
        });
    }, delayMs);
  }

  connect(customHost?: string): Promise<void> {
    const nextHost = (customHost ?? this.serverHost).trim();
    if (this.ws && this.status === 'connected' && nextHost === this.serverHost) {
      return Promise.resolve();
    }
    this.serverHost = nextHost;
    this.intentionalDisconnect = false;
    this.clearReconnectTimer();
    this.disconnect(false, true);

    return new Promise((resolve, reject) => {
      const { wsUrl } = resolveCoopUrls(this.serverHost);
      this.status = 'connecting';
      this.callbacks.onStatusChange?.('connecting');

      let settled = false;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      const timeout = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          try {
            ws.close();
          } catch {
            // ignore
          }
          this.status = 'disconnected';
          this.callbacks.onStatusChange?.('disconnected', 'Таймаут подключения к LAN-серверу.');
          reject(new Error('LAN server connection timeout'));
        }
      }, 6000);

      ws.onopen = () => {
        window.clearTimeout(timeout);
        this.status = 'connected';
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.callbacks.onStatusChange?.('connected');
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      ws.onmessage = (event) => {
        this.lastPongAt = Date.now();
        if (typeof event.data !== 'string') return;
        let msg: CoopServerMessage;
        try {
          msg = JSON.parse(event.data) as CoopServerMessage;
        } catch {
          return;
        }
        this.handleMessage(msg);
      };

      ws.onerror = () => {
        window.clearTimeout(timeout);
        if (!settled) {
          this.status = 'disconnected';
          this.callbacks.onStatusChange?.('disconnected', 'Не удалось подключиться к LAN-серверу.');
          settled = true;
          reject(new Error('Failed to connect to LAN server'));
        }
      };

      ws.onclose = () => {
        window.clearTimeout(timeout);
        this.stopHeartbeat();
        if (this.ws === ws) {
          this.ws = null;
        }
        const wasConnected = this.status === 'connected';
        this.status = 'disconnected';
        if (!this.intentionalDisconnect && this.savedRoomCode) {
          this.scheduleReconnect();
          return;
        }
        this.room = null;
        this.callbacks.onStatusChange?.('disconnected', wasConnected ? 'Соединение с LAN-сервером закрыто.' : undefined);
        this.callbacks.onRoomLeft?.();
      };
    });
  }

  disconnect(clearRoom = true, silentReconnectPrep = false) {
    if (!silentReconnectPrep) {
      this.intentionalDisconnect = true;
      this.clearReconnectTimer();
      this.savedRoomCode = null;
      this.reconnectAttempts = 0;
    }
    this.stopHeartbeat();
    if (this.ws) {
      const old = this.ws;
      this.ws = null;
      try {
        old.onclose = null;
        old.onerror = null;
        old.onmessage = null;
        old.close();
      } catch {
        // ignore
      }
    }
    this.status = 'disconnected';
    if (clearRoom) {
      this.room = null;
    }
    if (!silentReconnectPrep) {
      this.callbacks.onStatusChange?.('disconnected');
    }
  }

  private send(msg: CoopClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  createRoom(name: string, mode: GameMode, difficulty: DifficultyId) {
    this.savedCallsign = name;
    this.send({ type: 'room:create', name, mode, difficulty });
  }

  joinRoom(code: string, name: string) {
    this.savedCallsign = name;
    this.savedRoomCode = code;
    this.send({ type: 'room:join', code, name });
  }

  leaveRoom() {
    this.savedRoomCode = null;
    this.clearReconnectTimer();
    this.send({ type: 'room:leave' });
    this.room = null;
    this.callbacks.onRoomLeft?.();
  }

  updateLobbyConfig(mode: GameMode, difficulty: DifficultyId) {
    this.send({ type: 'lobby:config', mode, difficulty });
  }

  setReady(ready: boolean) {
    this.send({ type: 'lobby:ready', ready });
  }

  startMatch() {
    this.send({ type: 'lobby:start' });
  }

  enterHub() {
    this.send({ type: 'hub:enter' });
  }

  setHubBoarded(boarded: boolean) {
    this.send({ type: 'hub:board', boarded });
  }

  notifyCutsceneOpen(cutsceneId: string) {
    this.send({ type: 'cutscene:open', cutsceneId });
  }

  voteCutsceneSkip(cutsceneId: string, vote: boolean) {
    this.send({ type: 'cutscene:vote_skip', cutsceneId, vote });
  }

  sendPlayerState(state: Omit<CoopPlayerState, 'id' | 'name'>) {
    this.send({ type: 'player:state', state });
  }

  sendPlayerShoot(weaponId: WeaponId, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number) {
    this.send({ type: 'player:shoot', weaponId, ox, oy, oz, dx, dy, dz });
  }

  sendRevive(targetId: string) {
    this.send({ type: 'player:revive', targetId });
  }

  sendPing(x: number, z: number, label: string) {
    this.send({ type: 'player:ping', x, z, label });
  }

  sendWorldEnemies(enemies: CoopSyncedEnemy[], chapterKills: number, chapterTarget: number) {
    this.send({ type: 'world:enemies', enemies, chapterKills, chapterTarget });
  }

  sendWorldPickups(pickups: CoopSyncedPickup[]) {
    this.send({ type: 'world:pickups', pickups });
  }

  sendPickupTake(pickupId: string) {
    this.send({ type: 'pickup:take', pickupId });
  }

  sendEnemyDamage(enemyId: string, damage: number, headshot: boolean) {
    this.send({ type: 'enemy:damage', enemyId, damage, headshot });
  }

  sendObjectiveComplete(objectiveId: string) {
    this.send({ type: 'objective:complete', objectiveId });
  }

  sendTapeCollect(tapeId: string) {
    this.send({ type: 'tape:collect', tapeId });
  }

  sendChapterAdvance(chapterIndex: number, victory?: boolean) {
    this.send({ type: 'chapter:advance', chapterIndex, victory });
  }

  private handleMessage(msg: CoopServerMessage) {
    switch (msg.type) {
      case 'welcome':
        this.clientId = msg.clientId;
        this.callbacks.onWelcome?.(msg.clientId);
        break;
      case 'pong':
        this.lastPongAt = Date.now();
        break;
      case 'room:state':
        this.room = msg.room;
        this.savedRoomCode = msg.room.code;
        this.callbacks.onRoomState?.(msg.room);
        break;
      case 'room:left':
        this.room = null;
        this.savedRoomCode = null;
        this.callbacks.onRoomLeft?.(msg.reason);
        break;
      case 'player:left':
        this.callbacks.onPlayerLeft?.(msg);
        break;
      case 'hub:enter':
        this.room = msg.room;
        this.savedRoomCode = msg.room.code;
        this.callbacks.onRoomState?.(msg.room);
        this.callbacks.onHubEnter?.(msg.room);
        break;
      case 'hub:board_state':
        if (this.room) {
          this.room = { ...this.room, boardedPlayers: msg.boardedIds };
        }
        this.callbacks.onHubBoardState?.(msg.boardedIds, msg.totalPlayers);
        break;
      case 'cutscene:votes':
        if (this.room) {
          this.room = {
            ...this.room,
            cutsceneId: msg.cutsceneId,
            cutsceneSkipVotes: msg.votedIds,
          };
        }
        this.callbacks.onCutsceneVotes?.(msg.cutsceneId, msg.votedIds, msg.totalPlayers);
        break;
      case 'cutscene:skipped':
        if (this.room) {
          this.room = { ...this.room, cutsceneId: null, cutsceneSkipVotes: [] };
        }
        this.callbacks.onCutsceneSkipped?.(msg.cutsceneId);
        break;
      case 'game:start':
        this.room = msg.room;
        this.savedRoomCode = msg.room.code;
        this.callbacks.onRoomState?.(msg.room);
        this.callbacks.onGameStart?.(msg.room);
        break;
      case 'player:state':
        this.callbacks.onRemotePlayerState?.(msg.state);
        break;
      case 'player:shoot':
        this.callbacks.onRemotePlayerShoot?.(msg);
        break;
      case 'player:revived':
        this.callbacks.onPlayerRevived?.(msg);
        break;
      case 'player:ping':
        this.callbacks.onPlayerPing?.(msg);
        break;
      case 'world:enemies':
        this.callbacks.onWorldEnemies?.(msg.enemies, msg.chapterKills, msg.chapterTarget);
        break;
      case 'world:pickups':
        this.callbacks.onWorldPickups?.(msg.pickups);
        break;
      case 'pickup:take':
        this.callbacks.onPickupTake?.(msg);
        break;
      case 'enemy:damage':
        this.callbacks.onEnemyDamage?.(msg);
        break;
      case 'objective:complete':
        this.callbacks.onObjectiveComplete?.(msg.objectiveId, msg.byName);
        break;
      case 'tape:collect':
        this.callbacks.onTapeCollect?.(msg.tapeId, msg.byName);
        break;
      case 'chapter:advance':
        this.callbacks.onChapterAdvance?.(msg.chapterIndex, msg.victory);
        break;
      case 'error':
        if (msg.code === 'ROOM_NOT_FOUND' || msg.code === 'ROOM_FULL') {
          this.savedRoomCode = null;
        }
        this.callbacks.onError?.(msg.message);
        break;
    }
  }
}
