import type { DifficultyId, EnemyKind, GameMode, WeaponId, ZoneId } from './types';

export const COOP_MAX_PLAYERS = 4;
export const COOP_MAX_PAYLOAD_BYTES = 16_384;
export const COOP_MAX_ENEMIES_SYNC = 48;
export const COOP_MAX_PICKUPS_SYNC = 24;

export interface CoopPlayerSummary {
  id: string;
  name: string;
  isHost: boolean;
  ready: boolean;
  hp: number;
  maxHp: number;
  kills: number;
  isDowned: boolean;
  weaponId: WeaponId;
}

export interface CoopPlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  weaponId: WeaponId;
  hp: number;
  maxHp: number;
  isFiring: boolean;
  isReloading: boolean;
  reloadProgress: number;
  isMoving: boolean;
  isDowned: boolean;
  kills: number;
}

export type CoopPickupKind = 'medkit' | 'ammo' | 'overclock';

export interface CoopSyncedPickup {
  id: string;
  kind: CoopPickupKind;
  x: number;
  z: number;
}

export interface CoopSyncedEnemy {
  id: string;
  kind: EnemyKind;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  state: string;
  hitFlash: number;
}

export interface CoopRoomSnapshot {
  code: string;
  hostId: string;
  mode: GameMode;
  difficulty: DifficultyId;
  inHub: boolean;
  started: boolean;
  zoneId: ZoneId;
  chapterIndex: number;
  boardedPlayers: string[];
  cutsceneId: string | null;
  cutsceneSkipVotes: string[];
  completedObjectives: string[];
  collectedTapes: string[];
  players: CoopPlayerSummary[];
}

export interface CoopPublicRoomInfo {
  code: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  started: boolean;
  mode: GameMode;
  difficulty: DifficultyId;
  chapterIndex: number;
}

export interface CoopLanInfoResponse {
  port: number;
  addresses: string[];
  rooms: CoopPublicRoomInfo[];
}

export type CoopClientMessage =
  | { type: 'ping'; ts?: number }
  | { type: 'room:create'; name: string; mode: GameMode; difficulty: DifficultyId }
  | { type: 'room:join'; code: string; name: string }
  | { type: 'room:leave' }
  | { type: 'lobby:config'; mode: GameMode; difficulty: DifficultyId }
  | { type: 'lobby:ready'; ready: boolean }
  | { type: 'lobby:start' }
  | { type: 'hub:enter' }
  | { type: 'hub:board'; boarded: boolean }
  | { type: 'cutscene:open'; cutsceneId: string }
  | { type: 'cutscene:vote_skip'; cutsceneId: string; vote: boolean }
  | { type: 'player:state'; state: Omit<CoopPlayerState, 'id' | 'name'> }
  | { type: 'player:shoot'; weaponId: WeaponId; ox: number; oy: number; oz: number; dx: number; dy: number; dz: number }
  | { type: 'player:revive'; targetId: string }
  | { type: 'player:ping'; x: number; z: number; label: string }
  | { type: 'world:enemies'; enemies: CoopSyncedEnemy[]; chapterKills: number; chapterTarget: number }
  | { type: 'world:pickups'; pickups: CoopSyncedPickup[] }
  | { type: 'pickup:take'; pickupId: string }
  | { type: 'enemy:damage'; enemyId: string; damage: number; headshot: boolean }
  | { type: 'objective:complete'; objectiveId: string }
  | { type: 'tape:collect'; tapeId: string }
  | { type: 'chapter:advance'; chapterIndex: number; victory?: boolean };

export type CoopServerMessage =
  | { type: 'welcome'; clientId: string }
  | { type: 'pong'; ts: number }
  | { type: 'room:state'; room: CoopRoomSnapshot }
  | { type: 'room:left'; reason?: string }
  | { type: 'player:left'; playerId: string; playerName: string; newHostId?: string; newHostName?: string }
  | { type: 'hub:enter'; room: CoopRoomSnapshot }
  | { type: 'hub:board_state'; boardedIds: string[]; totalPlayers: number }
  | { type: 'cutscene:votes'; cutsceneId: string; votedIds: string[]; totalPlayers: number }
  | { type: 'cutscene:skipped'; cutsceneId: string }
  | { type: 'game:start'; room: CoopRoomSnapshot }
  | { type: 'player:state'; state: CoopPlayerState }
  | { type: 'player:shoot'; playerId: string; weaponId: WeaponId; ox: number; oy: number; oz: number; dx: number; dy: number; dz: number }
  | { type: 'player:revived'; targetId: string; byId: string; byName: string }
  | { type: 'player:ping'; playerId: string; playerName: string; x: number; z: number; label: string }
  | { type: 'world:enemies'; enemies: CoopSyncedEnemy[]; chapterKills: number; chapterTarget: number }
  | { type: 'world:pickups'; pickups: CoopSyncedPickup[] }
  | { type: 'pickup:take'; pickupId: string; byId: string; byName: string }
  | { type: 'enemy:damage'; fromId: string; enemyId: string; damage: number; headshot: boolean }
  | { type: 'objective:complete'; objectiveId: string; byName: string }
  | { type: 'tape:collect'; tapeId: string; byName: string }
  | { type: 'chapter:advance'; chapterIndex: number; victory?: boolean }
  | { type: 'error'; code: string; message: string };

const VALID_WEAPONS = new Set<WeaponId>(['shotgun', 'awp', 'pistol', 'minigun', 'p90']);
const VALID_MODES = new Set<GameMode>(['story', 'endless']);
const VALID_DIFFS = new Set<DifficultyId>(['easy', 'normal', 'hard']);
const VALID_KINDS = new Set<EnemyKind>(['crawler', 'lampshade', 'screamer', 'watchman']);
const VALID_PICKUP_KINDS = new Set<CoopPickupKind>(['medkit', 'ammo', 'overclock']);

export function sanitizeCallsign(raw: unknown, fallback = 'ВЫЖИВШИЙ'): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw
    .replace(/[^A-Za-zА-Яа-яЁё0-9 _-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 18);
  return cleaned.length > 0 ? cleaned : fallback;
}

export function normalizeRoomCode(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

export function generateRoomCode(existingCodes: { has(code: string): boolean }): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 40; attempt += 1) {
    let code = '';
    for (let i = 0; i < 4; i += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    if (!existingCodes.has(code)) return code;
  }
  return `N${Math.floor(100 + Math.random() * 899)}`;
}

export function clampCoord(v: unknown, min = -160, max = 160): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  return Math.max(min, Math.min(max, n));
}

export function clampNum(v: unknown, min: number, max: number, fallback = min): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return Math.max(min, Math.min(max, n));
}

export function sanitizeWeaponId(raw: unknown): WeaponId {
  return typeof raw === 'string' && VALID_WEAPONS.has(raw as WeaponId) ? (raw as WeaponId) : 'shotgun';
}

export function sanitizeMode(raw: unknown): GameMode {
  return typeof raw === 'string' && VALID_MODES.has(raw as GameMode) ? (raw as GameMode) : 'story';
}

export function sanitizeDifficulty(raw: unknown): DifficultyId {
  return typeof raw === 'string' && VALID_DIFFS.has(raw as DifficultyId) ? (raw as DifficultyId) : 'normal';
}

export function sanitizeShortId(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 48);
}

export function sanitizePingLabel(raw: unknown): string {
  if (typeof raw !== 'string') return 'МЕТКА';
  const cleaned = raw
    .replace(/[^A-Za-zА-Яа-яЁё0-9 !?.,_-]/g, '')
    .trim()
    .slice(0, 32);
  return cleaned || 'МЕТКА';
}

export function parseClientMessage(rawText: string): CoopClientMessage | null {
  if (typeof rawText !== 'string' || rawText.length > COOP_MAX_PAYLOAD_BYTES) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const msg = parsed as Record<string, unknown>;
  const type = msg.type;
  if (typeof type !== 'string') return null;

  switch (type) {
    case 'ping':
      return {
        type,
        ts: typeof msg.ts === 'number' && Number.isFinite(msg.ts) ? msg.ts : Date.now(),
      };
    case 'room:create':
      return {
        type,
        name: sanitizeCallsign(msg.name),
        mode: sanitizeMode(msg.mode),
        difficulty: sanitizeDifficulty(msg.difficulty),
      };
    case 'room:join': {
      const code = normalizeRoomCode(msg.code);
      if (code.length < 3) return null;
      return { type, code, name: sanitizeCallsign(msg.name) };
    }
    case 'room:leave':
      return { type };
    case 'lobby:config':
      return {
        type,
        mode: sanitizeMode(msg.mode),
        difficulty: sanitizeDifficulty(msg.difficulty),
      };
    case 'lobby:ready':
      return { type, ready: Boolean(msg.ready) };
    case 'lobby:start':
      return { type };
    case 'hub:enter':
      return { type };
    case 'hub:board':
      return { type, boarded: Boolean(msg.boarded) };
    case 'cutscene:open': {
      const cutsceneId = sanitizeShortId(msg.cutsceneId);
      if (!cutsceneId) return null;
      return { type, cutsceneId };
    }
    case 'cutscene:vote_skip': {
      const cutsceneId = sanitizeShortId(msg.cutsceneId);
      if (!cutsceneId) return null;
      return { type, cutsceneId, vote: Boolean(msg.vote) };
    }
    case 'player:state': {
      const st = msg.state;
      if (!st || typeof st !== 'object') return null;
      const s = st as Record<string, unknown>;
      return {
        type,
        state: {
          x: clampCoord(s.x),
          y: clampCoord(s.y, -4, 16),
          z: clampCoord(s.z),
          yaw: clampNum(s.yaw, -Math.PI * 4, Math.PI * 4, 0),
          pitch: clampNum(s.pitch, -1.5, 1.5, 0),
          weaponId: sanitizeWeaponId(s.weaponId),
          hp: Math.round(clampNum(s.hp, 0, 250, 100)),
          maxHp: Math.round(clampNum(s.maxHp, 50, 250, 100)),
          isFiring: Boolean(s.isFiring),
          isReloading: Boolean(s.isReloading),
          reloadProgress: clampNum(s.reloadProgress, 0, 1, 0),
          isMoving: Boolean(s.isMoving),
          isDowned: Boolean(s.isDowned),
          kills: Math.round(clampNum(s.kills, 0, 9999, 0)),
        },
      };
    }
    case 'player:shoot':
      return {
        type,
        weaponId: sanitizeWeaponId(msg.weaponId),
        ox: clampCoord(msg.ox),
        oy: clampCoord(msg.oy, -4, 16),
        oz: clampCoord(msg.oz),
        dx: clampNum(msg.dx, -1.5, 1.5, 0),
        dy: clampNum(msg.dy, -1.5, 1.5, 0),
        dz: clampNum(msg.dz, -1.5, 1.5, -1),
      };
    case 'player:revive': {
      const targetId = sanitizeShortId(msg.targetId);
      if (!targetId) return null;
      return { type, targetId };
    }
    case 'player:ping':
      return {
        type,
        x: clampCoord(msg.x),
        z: clampCoord(msg.z),
        label: sanitizePingLabel(msg.label),
      };
    case 'world:enemies': {
      if (!Array.isArray(msg.enemies)) return null;
      const enemies: CoopSyncedEnemy[] = [];
      const count = Math.min(msg.enemies.length, COOP_MAX_ENEMIES_SYNC);
      for (let i = 0; i < count; i += 1) {
        const item = msg.enemies[i];
        if (!item || typeof item !== 'object') continue;
        const e = item as Record<string, unknown>;
        const id = sanitizeShortId(e.id);
        const kind = typeof e.kind === 'string' && VALID_KINDS.has(e.kind as EnemyKind) ? (e.kind as EnemyKind) : null;
        if (!id || !kind) continue;
        enemies.push({
          id,
          kind,
          x: clampCoord(e.x),
          y: clampCoord(e.y, -4, 16),
          z: clampCoord(e.z),
          yaw: clampNum(e.yaw, -Math.PI * 4, Math.PI * 4, 0),
          hp: Math.round(clampNum(e.hp, 0, 5000, 100)),
          maxHp: Math.round(clampNum(e.maxHp, 1, 5000, 100)),
          state: typeof e.state === 'string' ? e.state.slice(0, 20) : 'chase',
          hitFlash: clampNum(e.hitFlash, 0, 1, 0),
        });
      }
      return {
        type,
        enemies,
        chapterKills: Math.round(clampNum(msg.chapterKills, 0, 9999, 0)),
        chapterTarget: Math.round(clampNum(msg.chapterTarget, 1, 999, 5)),
      };
    }
    case 'world:pickups': {
      if (!Array.isArray(msg.pickups)) return null;
      const pickups: CoopSyncedPickup[] = [];
      const count = Math.min(msg.pickups.length, COOP_MAX_PICKUPS_SYNC);
      for (let i = 0; i < count; i += 1) {
        const item = msg.pickups[i];
        if (!item || typeof item !== 'object') continue;
        const p = item as Record<string, unknown>;
        const id = sanitizeShortId(p.id);
        const kind =
          typeof p.kind === 'string' && VALID_PICKUP_KINDS.has(p.kind as CoopPickupKind)
            ? (p.kind as CoopPickupKind)
            : null;
        if (!id || !kind) continue;
        pickups.push({
          id,
          kind,
          x: clampCoord(p.x),
          z: clampCoord(p.z),
        });
      }
      return { type, pickups };
    }
    case 'pickup:take': {
      const pickupId = sanitizeShortId(msg.pickupId);
      if (!pickupId) return null;
      return { type, pickupId };
    }
    case 'enemy:damage': {
      const enemyId = sanitizeShortId(msg.enemyId);
      if (!enemyId) return null;
      return {
        type,
        enemyId,
        damage: clampNum(msg.damage, 1, 450, 15),
        headshot: Boolean(msg.headshot),
      };
    }
    case 'objective:complete': {
      const objectiveId = sanitizeShortId(msg.objectiveId);
      if (!objectiveId) return null;
      return { type, objectiveId };
    }
    case 'tape:collect': {
      const tapeId = sanitizeShortId(msg.tapeId);
      if (!tapeId) return null;
      return { type, tapeId };
    }
    case 'chapter:advance':
      return {
        type,
        chapterIndex: Math.round(clampNum(msg.chapterIndex, 0, 20, 0)),
        victory: Boolean(msg.victory),
      };
    default:
      return null;
  }
}

export interface RoomRecord {
  code: string;
  hostId: string;
  mode: GameMode;
  difficulty: DifficultyId;
  inHub: boolean;
  started: boolean;
  zoneId: ZoneId;
  chapterIndex: number;
  boardedPlayers: Set<string>;
  cutsceneId: string | null;
  cutsceneSkipVotes: Set<string>;
  completedObjectives: Set<string>;
  collectedTapes: Set<string>;
  takenPickups: Set<string>;
  players: Map<string, CoopPlayerSummary>;
}

export function createRoomRecord(
  code: string,
  hostId: string,
  hostName: string,
  mode: GameMode,
  difficulty: DifficultyId,
): RoomRecord {
  const players = new Map<string, CoopPlayerSummary>();
  players.set(hostId, {
    id: hostId,
    name: sanitizeCallsign(hostName),
    isHost: true,
    ready: true,
    hp: 100,
    maxHp: 100,
    kills: 0,
    isDowned: false,
    weaponId: 'shotgun',
  });
  return {
    code,
    hostId,
    mode,
    difficulty,
    inHub: false,
    started: false,
    zoneId: 'hub',
    chapterIndex: 0,
    boardedPlayers: new Set<string>(),
    cutsceneId: null,
    cutsceneSkipVotes: new Set<string>(),
    completedObjectives: new Set<string>(),
    collectedTapes: new Set<string>(),
    takenPickups: new Set<string>(),
    players,
  };
}

export function addPlayerToRoom(
  room: RoomRecord,
  playerId: string,
  name: string,
): { ok: true } | { ok: false; code: string; message: string } {
  if (room.players.has(playerId)) return { ok: true };
  if (room.players.size >= COOP_MAX_PLAYERS) {
    return { ok: false, code: 'ROOM_FULL', message: 'Комната заполнена (максимум 4 игрока).' };
  }
  room.players.set(playerId, {
    id: playerId,
    name: sanitizeCallsign(name),
    isHost: false,
    ready: false,
    hp: 100,
    maxHp: 100,
    kills: 0,
    isDowned: false,
    weaponId: 'shotgun',
  });
  return { ok: true };
}

export function removePlayerFromRoom(room: RoomRecord, playerId: string): boolean {
  room.players.delete(playerId);
  room.boardedPlayers.delete(playerId);
  room.cutsceneSkipVotes.delete(playerId);
  if (room.players.size === 0) return true;
  if (room.hostId === playerId) {
    const nextHost = room.players.values().next().value as CoopPlayerSummary | undefined;
    if (nextHost) {
      room.hostId = nextHost.id;
      nextHost.isHost = true;
      nextHost.ready = true;
    }
  }
  return false;
}

export function serializeRoomSnapshot(room: RoomRecord): CoopRoomSnapshot {
  return {
    code: room.code,
    hostId: room.hostId,
    mode: room.mode,
    difficulty: room.difficulty,
    inHub: room.inHub,
    started: room.started,
    zoneId: room.zoneId,
    chapterIndex: room.chapterIndex,
    boardedPlayers: Array.from(room.boardedPlayers),
    cutsceneId: room.cutsceneId,
    cutsceneSkipVotes: Array.from(room.cutsceneSkipVotes),
    completedObjectives: Array.from(room.completedObjectives),
    collectedTapes: Array.from(room.collectedTapes),
    players: Array.from(room.players.values()),
  };
}

export function serializePublicRoomInfo(room: RoomRecord): CoopPublicRoomInfo {
  const host = room.players.get(room.hostId);
  return {
    code: room.code,
    hostName: host?.name ?? 'ХОСТ',
    playerCount: room.players.size,
    maxPlayers: COOP_MAX_PLAYERS,
    started: room.started,
    mode: room.mode,
    difficulty: room.difficulty,
    chapterIndex: room.chapterIndex,
  };
}
