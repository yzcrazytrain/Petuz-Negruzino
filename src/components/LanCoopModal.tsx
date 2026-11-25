import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Crown,
  Play,
  Radio,
  RefreshCw,
  ShieldCheck,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { DIFFICULTY_ORDER } from '../game/constants';
import {
  COOP_MAX_PLAYERS,
  type CoopLanInfoResponse,
  type CoopRoomSnapshot,
} from '../game/coopProtocol';
import { TRANSLATIONS } from '../game/i18n';
import type { DifficultyId, GameMode, Language } from '../game/types';

interface LanCoopModalProps {
  language: Language;
  status: 'disconnected' | 'connecting' | 'connected';
  error: string | null;
  clientId: string | null;
  room: CoopRoomSnapshot | null;
  lanInfo: CoopLanInfoResponse | null;
  defaultDifficulty: DifficultyId;
  serverHost: string;
  onChangeServerHost: (host: string) => void;
  onConnectAndRefresh: (customHost?: string) => Promise<void>;
  onCreateRoom: (callsign: string, mode: GameMode, difficulty: DifficultyId) => Promise<void>;
  onJoinRoom: (code: string, callsign: string) => Promise<void>;
  onLeaveRoom: () => void;
  onUpdateConfig: (mode: GameMode, difficulty: DifficultyId) => void;
  onToggleReady: (ready: boolean) => void;
  onStartMatch: () => void;
  onClose: () => void;
}

const CALLSIGN_STORAGE_KEY = 'negruzino_lan_callsign_v1';

function loadSavedCallsign(lang: Language): string {
  try {
    const saved = window.localStorage.getItem(CALLSIGN_STORAGE_KEY);
    if (saved && saved.trim().length > 0) return saved.trim().slice(0, 18);
  } catch {
    // ignore storage errors
  }
  return lang === 'ru' ? 'Выживший' : 'Survivor';
}

export function LanCoopModal({
  language,
  status,
  error,
  clientId,
  room,
  lanInfo,
  defaultDifficulty,
  serverHost,
  onChangeServerHost,
  onConnectAndRefresh,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onUpdateConfig,
  onToggleReady,
  onStartMatch,
  onClose,
}: LanCoopModalProps) {
  const t = TRANSLATIONS[language];
  const c = t.lanCoop;

  const [callsign, setCallsign] = useState<string>(() => loadSavedCallsign(language));
  const [joinCode, setJoinCode] = useState('');
  const [hostMode, setHostMode] = useState<GameMode>('story');
  const [hostDifficulty, setHostDifficulty] = useState<DifficultyId>(defaultDifficulty);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void onConnectAndRefresh(serverHost);
    // Refresh on modal open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistCallsign = (value: string) => {
    setCallsign(value);
    try {
      window.localStorage.setItem(CALLSIGN_STORAGE_KEY, value.trim().slice(0, 18));
    } catch {
      // ignore
    }
  };

  const copyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1800);
    } catch {
      // Fallback: silent no-op if clipboard blocked
    }
  };

  const handleHostCreate = async () => {
    setBusy(true);
    try {
      await onCreateRoom(callsign.trim() || (language === 'ru' ? 'Выживший' : 'Survivor'), hostMode, hostDifficulty);
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (codeOverride?: string) => {
    const code = (codeOverride ?? joinCode).trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    try {
      await onJoinRoom(code, callsign.trim() || (language === 'ru' ? 'Выживший' : 'Survivor'));
    } finally {
      setBusy(false);
    }
  };

  const myPlayer = room?.players.find((p) => p.id === clientId) ?? null;
  const isHost = Boolean(room && clientId && room.hostId === clientId);
  const lanPort = lanInfo?.port ?? 3000;
  const lanAddresses = lanInfo?.addresses ?? [];
  const openRooms = lanInfo?.rooms ?? [];

  const statusBadgeClass =
    status === 'connected'
      ? 'bg-[#132920] border-[#5fa88e]/50 text-[#7fe0bd]'
      : status === 'connecting'
        ? 'bg-[#2a2112] border-[#e8963a]/50 text-[#f3b664]'
        : 'bg-[#281316] border-[#c93b3b]/50 text-[#f0a5a5]';

  const statusText =
    status === 'connected'
      ? c.statusConnected
      : status === 'connecting'
        ? c.statusConnecting
        : c.statusOffline;

  return (
    <div
      data-testid="lan-coop-modal"
      className="fixed inset-0 z-40 bg-[#070a10]/84 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={c.title}
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded bg-[#0e141f] border border-[#e8963a]/35 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#ece7dc]/12 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-2.5">
              <div className="flex items-center gap-2 text-[#e8963a]">
                <Wifi className="w-5 h-5 shrink-0" />
                <h2 className="font-display text-2xl font-bold tracking-wider uppercase text-[#ece7dc]">
                  {c.title}
                </h2>
              </div>
              <span
                data-testid="coop-status-badge"
                className={`px-2 py-0.5 rounded border text-[10px] font-mono-num uppercase tracking-wider font-bold ${statusBadgeClass}`}
              >
                {statusText}
              </span>
            </div>
            <p className="text-xs text-[#9aa3b0] mt-1">{c.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeStudio}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded border border-[#ece7dc]/18 text-[#ece7dc] hover:border-[#e8963a] hover:text-[#e8963a] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div
              data-testid="coop-error-banner"
              className="px-3.5 py-2.5 rounded bg-[#2a1216] border border-[#c93b3b]/60 text-xs text-[#f3c6c6] font-mono-num"
            >
              {error}
            </div>
          )}

          {/* LAN Shareable Addresses Bar */}
          {lanAddresses.length > 0 && (
            <div className="p-3.5 rounded bg-[#121926] border border-[#5fa88e]/30 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono-num uppercase tracking-wider text-[#5fa88e] font-semibold flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  <span>{c.yourLanHeading}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {lanAddresses.map((ip) => {
                  const url = `http://${ip}:${lanPort}`;
                  const isCopied = copiedKey === url;
                  return (
                    <button
                      key={ip}
                      type="button"
                      onClick={() => void copyText(url, url)}
                      className="px-2.5 py-1.5 rounded bg-[#0b1019] border border-[#ece7dc]/16 hover:border-[#5fa88e] text-xs font-mono-num text-[#ece7dc] inline-flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <span>{url}</span>
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-[#5fa88e]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[#9aa3b0]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW A: LOBBY BROWSER (NO ROOM YET) */}
          {!room && (
            <div className="space-y-5">
              {/* Callsign & Optional Server Host */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded bg-[#121926] border border-[#ece7dc]/14">
                <label className="block space-y-1">
                  <span className="text-[11px] font-mono-num uppercase tracking-wider text-[#9aa3b0]">
                    {c.callsignLabel}
                  </span>
                  <input
                    type="text"
                    maxLength={18}
                    data-testid="coop-callsign-input"
                    value={callsign}
                    onChange={(e) => persistCallsign(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-[#0b1019] border border-[#ece7dc]/18 text-sm text-[#ece7dc] focus:outline-none focus:border-[#e8963a]"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] font-mono-num uppercase tracking-wider text-[#9aa3b0]">
                    {c.serverAddrLabel}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      data-testid="coop-server-input"
                      placeholder={c.serverAddrPlaceholder}
                      value={serverHost}
                      onChange={(e) => onChangeServerHost(e.target.value)}
                      className="min-w-0 flex-1 px-3 py-2 rounded bg-[#0b1019] border border-[#ece7dc]/18 text-sm font-mono-num text-[#ece7dc] placeholder:text-[#667080] focus:outline-none focus:border-[#e8963a]"
                    />
                    <button
                      type="button"
                      onClick={() => void onConnectAndRefresh(serverHost)}
                      title={c.refreshBtn}
                      className="h-[38px] px-3 rounded bg-[#1a2436] border border-[#ece7dc]/20 text-xs font-mono-num text-[#ece7dc] hover:border-[#e8963a] hover:text-[#e8963a] inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{c.connectBtn}</span>
                    </button>
                  </div>
                </label>
              </div>

              {/* Create Room vs Join by Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Host New Room */}
                <div className="p-4 rounded bg-[#141c2a] border border-[#e8963a]/35 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="text-xs font-mono-num uppercase tracking-wider text-[#e8963a] font-bold flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5" />
                      <span>{c.createRoomBtn}</span>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-1.5 bg-[#0b1019] p-1 rounded border border-[#ece7dc]/12">
                        <button
                          type="button"
                          onClick={() => setHostMode('story')}
                          className={`py-1.5 rounded text-xs font-mono-num uppercase transition-colors cursor-pointer ${
                            hostMode === 'story'
                              ? 'bg-[#e8963a] text-[#0b0f17] font-bold'
                              : 'text-[#9aa3b0] hover:text-[#ece7dc]'
                          }`}
                        >
                          {t.playStory}
                        </button>
                        <button
                          type="button"
                          onClick={() => setHostMode('endless')}
                          className={`py-1.5 rounded text-xs font-mono-num uppercase transition-colors cursor-pointer ${
                            hostMode === 'endless'
                              ? 'bg-[#c93b3b] text-[#ece7dc] font-bold'
                              : 'text-[#9aa3b0] hover:text-[#ece7dc]'
                          }`}
                        >
                          {t.endlessBtn}
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-1 bg-[#0b1019] p-1 rounded border border-[#ece7dc]/12">
                        {DIFFICULTY_ORDER.map((diffId) => (
                          <button
                            key={diffId}
                            type="button"
                            onClick={() => setHostDifficulty(diffId)}
                            className={`py-1 rounded text-[11px] font-mono-num uppercase transition-colors cursor-pointer ${
                              hostDifficulty === diffId
                                ? diffId === 'hard'
                                  ? 'bg-[#c93b3b] text-[#ece7dc] font-bold'
                                  : 'bg-[#e8963a] text-[#0b0f17] font-bold'
                                : 'text-[#9aa3b0] hover:text-[#ece7dc]'
                            }`}
                          >
                            {t.difficulties[diffId].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    data-testid="coop-create-btn"
                    onClick={() => void handleHostCreate()}
                    className="w-full py-2.5 rounded bg-[#e8963a] text-[#0b0f17] font-display text-base font-bold tracking-wider uppercase hover:bg-[#f2a853] disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {c.createRoomBtn}
                  </button>
                </div>

                {/* Join by Code */}
                <div className="p-4 rounded bg-[#141c2a] border border-[#ece7dc]/16 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="text-xs font-mono-num uppercase tracking-wider text-[#ece7dc] font-bold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#5fa88e]" />
                      <span>{c.joinRoomBtn}</span>
                    </div>
                    <input
                      type="text"
                      maxLength={8}
                      data-testid="coop-join-code-input"
                      placeholder={c.roomCodePlaceholder}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleJoin();
                      }}
                      className="w-full px-3 py-2.5 rounded bg-[#0b1019] border border-[#ece7dc]/20 font-mono-num text-lg font-bold tracking-[0.22em] uppercase text-center text-[#e8963a] placeholder:text-[#556072] placeholder:text-xs placeholder:tracking-normal focus:outline-none focus:border-[#e8963a]"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={busy || joinCode.trim().length < 3}
                    data-testid="coop-join-btn"
                    onClick={() => void handleJoin()}
                    className="w-full py-2.5 rounded bg-[#1b2938] border border-[#5fa88e]/55 text-[#8fe8c7] font-display text-base font-bold tracking-wider uppercase hover:bg-[#5fa88e] hover:text-[#0b0f17] disabled:opacity-45 transition-colors cursor-pointer"
                  >
                    {c.joinRoomBtn}
                  </button>
                </div>
              </div>

              {/* Open LAN Rooms Discovery List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono-num uppercase tracking-wider text-[#9aa3b0]">
                    {c.openRoomsHeading}
                  </h3>
                  <button
                    type="button"
                    onClick={() => void onConnectAndRefresh(serverHost)}
                    className="text-[11px] font-mono-num text-[#e8963a] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{c.refreshBtn}</span>
                  </button>
                </div>

                {openRooms.length === 0 ? (
                  <div className="px-4 py-3 rounded bg-[#121926] border border-[#ece7dc]/10 text-xs text-[#9aa3b0]">
                    {c.noOpenRooms}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {openRooms.map((r) => (
                      <div
                        key={r.code}
                        data-testid={`coop-open-room-${r.code}`}
                        className="px-4 py-3 rounded bg-[#121926] border border-[#ece7dc]/14 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono-num text-sm font-bold text-[#e8963a] tracking-widest">
                              {r.code}
                            </span>
                            <span className="text-xs font-semibold text-[#ece7dc] truncate">
                              {r.hostName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-[#1a2334] text-[10px] font-mono-num text-[#9aa3b0] uppercase">
                              {r.mode === 'endless' ? t.endlessBtn : t.playStory} · {t.difficulties[r.difficulty].label}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono-num text-xs text-[#5fa88e] font-bold">
                            {r.playerCount}/{r.maxPlayers}
                          </span>
                          <button
                            type="button"
                            disabled={busy || r.playerCount >= r.maxPlayers}
                            onClick={() => void handleJoin(r.code)}
                            className="px-3 py-1.5 rounded bg-[#e8963a] text-[#0b0f17] font-mono-num text-xs font-bold uppercase hover:bg-[#f2a853] disabled:opacity-40 cursor-pointer"
                          >
                            {c.joinRoomBtn}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW B: INSIDE A LAN ROOM LOBBY */}
          {room && (
            <div className="space-y-5">
              {/* Room Code & Quick Copy */}
              <div className="p-4 rounded bg-[#141c2a] border border-[#e8963a]/45 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-mono-num uppercase tracking-widest text-[#9aa3b0]">
                    {language === 'ru' ? 'КОД LAN-КОМНАТЫ' : 'LAN ROOM CODE'}
                  </div>
                  <div
                    data-testid="coop-room-code"
                    className="font-mono-num text-3xl font-bold tracking-[0.26em] text-[#e8963a] leading-tight mt-0.5"
                  >
                    {room.code}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void copyText('room_code', room.code)}
                    className="px-3.5 py-2 rounded bg-[#0b1019] border border-[#ece7dc]/20 text-xs font-mono-num uppercase tracking-wider text-[#ece7dc] hover:border-[#e8963a] hover:text-[#e8963a] inline-flex items-center gap-2 cursor-pointer"
                  >
                    {copiedKey === 'room_code' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#5fa88e]" />
                        <span className="text-[#5fa88e]">{c.copiedBadge}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{c.copyCodeBtn}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Match Config (Editable by Host) */}
              <div className="p-4 rounded bg-[#121926] border border-[#ece7dc]/14 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateConfig('story', room.difficulty)}
                    className={`px-3 py-1.5 rounded text-xs font-mono-num uppercase transition-colors ${
                      room.mode === 'story'
                        ? 'bg-[#e8963a] text-[#0b0f17] font-bold'
                        : 'bg-[#0b1019] text-[#9aa3b0]'
                    } ${isHost ? 'cursor-pointer' : 'opacity-80 cursor-default'}`}
                  >
                    {t.playStory}
                  </button>
                  <button
                    type="button"
                    disabled={!isHost}
                    onClick={() => onUpdateConfig('endless', room.difficulty)}
                    className={`px-3 py-1.5 rounded text-xs font-mono-num uppercase transition-colors ${
                      room.mode === 'endless'
                        ? 'bg-[#c93b3b] text-[#ece7dc] font-bold'
                        : 'bg-[#0b1019] text-[#9aa3b0]'
                    } ${isHost ? 'cursor-pointer' : 'opacity-80 cursor-default'}`}
                  >
                    {t.endlessBtn}
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-[#0b1019] p-1 rounded border border-[#ece7dc]/12">
                  {DIFFICULTY_ORDER.map((diffId) => (
                    <button
                      key={diffId}
                      type="button"
                      disabled={!isHost}
                      onClick={() => onUpdateConfig(room.mode, diffId)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono-num uppercase transition-colors ${
                        room.difficulty === diffId
                          ? diffId === 'hard'
                            ? 'bg-[#c93b3b] text-[#ece7dc] font-bold'
                            : 'bg-[#e8963a] text-[#0b0f17] font-bold'
                          : 'text-[#9aa3b0]'
                      } ${isHost ? 'cursor-pointer' : 'opacity-80 cursor-default'}`}
                    >
                      {t.difficulties[diffId].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Squad Roster */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono-num uppercase tracking-wider text-[#9aa3b0]">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#5fa88e]" />
                    <span>{c.squadHeading}</span>
                  </span>
                  <span data-testid="coop-player-count" className="text-[#ece7dc] font-bold">
                    {room.players.length} / {COOP_MAX_PLAYERS}
                  </span>
                </div>

                <div className="space-y-2">
                  {room.players.map((p) => {
                    const isSelf = p.id === clientId;
                    return (
                      <div
                        key={p.id}
                        data-testid={`coop-player-row-${p.id}`}
                        className={`px-3.5 py-2.5 rounded border flex items-center justify-between gap-3 ${
                          isSelf
                            ? 'bg-[#1a2434] border-[#e8963a]/50'
                            : 'bg-[#121926] border-[#ece7dc]/14'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded bg-[#0b1019] border border-[#e8963a]/40 flex items-center justify-center font-display text-sm font-bold text-[#e8963a] shrink-0">
                            {p.name.slice(0, 1).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-[#ece7dc] truncate">
                            {p.name}
                          </span>
                          {p.isHost && (
                            <span className="px-1.5 py-0.5 rounded bg-[#e8963a]/20 border border-[#e8963a]/50 text-[10px] font-mono-num font-bold text-[#e8963a] uppercase shrink-0">
                              {c.hostTag}
                            </span>
                          )}
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded font-mono-num text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                            p.ready || p.isHost
                              ? 'bg-[#142a21] border border-[#5fa88e]/55 text-[#7de5be]'
                              : 'bg-[#1a2230] border border-[#ece7dc]/14 text-[#9aa3b0]'
                          }`}
                        >
                          {p.ready || p.isHost ? c.readyTag : c.waitingTag}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pre-Match Hub Rule Hint */}
              <div className="p-3 rounded bg-[#132128] border border-[#5fa88e]/35 text-xs text-[#bce8d8] leading-relaxed">
                {c.hubRuleHint}
              </div>

              {/* Lobby Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#ece7dc]/10">
                <button
                  type="button"
                  data-testid="coop-leave-btn"
                  onClick={onLeaveRoom}
                  className="px-4 py-2.5 rounded border border-[#c93b3b]/50 bg-[#231014] text-xs font-mono-num uppercase tracking-wider text-[#f3baba] hover:bg-[#c93b3b] hover:text-white transition-colors cursor-pointer"
                >
                  {c.leaveRoomBtn}
                </button>

                <div className="flex flex-wrap items-center gap-2.5">
                  {!isHost && myPlayer && (
                    <button
                      type="button"
                      data-testid="coop-ready-btn"
                      onClick={() => onToggleReady(!myPlayer.ready)}
                      className={`px-4 py-2.5 rounded font-display text-base font-bold uppercase tracking-wider inline-flex items-center gap-2 transition-colors cursor-pointer ${
                        myPlayer.ready
                          ? 'bg-[#183026] border border-[#5fa88e] text-[#8be8c5]'
                          : 'bg-[#e8963a] text-[#0b0f17] hover:bg-[#f2a853]'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{myPlayer.ready ? c.unreadyBtn : c.readyBtn}</span>
                    </button>
                  )}

                  {isHost && (
                    <button
                      type="button"
                      data-testid="coop-start-btn"
                      onClick={onStartMatch}
                      className="px-6 py-2.5 rounded bg-[#e8963a] text-[#0b0f17] font-display text-lg font-bold uppercase tracking-wider inline-flex items-center gap-2 hover:bg-[#f2a853] shadow-lg shadow-black/40 transition-colors cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>{c.startMatchBtn}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
