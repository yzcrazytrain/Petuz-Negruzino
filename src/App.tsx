import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraRainOverlay } from './components/CameraRainOverlay';
import { CutsceneModal } from './components/CutsceneModal';
import { GameHud } from './components/GameHud';
import { HubSpecsModal } from './components/HubSpecsModal';
import { LanCoopModal } from './components/LanCoopModal';
import {
  LandscapePromptOverlay,
  MobileControls,
  MobileHudEditor,
} from './components/MobileControls';
import { StatusModal } from './components/StatusModal';
import { TitleScreen } from './components/TitleScreen';
import { UpgradeModal } from './components/UpgradeModal';
import { WorkshopDrawer, type WorkshopTabId } from './components/WorkshopDrawer';
import { DEFAULT_MUSIC_SETTINGS } from './game/constants';
import { CoopClient } from './game/coopClient';
import type { CoopLanInfoResponse, CoopRoomSnapshot } from './game/coopProtocol';
import { NegruzinoEngine } from './game/engine';
import {
  loadMobileHudLayout,
  resetMobileHudLayout,
  saveMobileHudLayout,
  type MobileHudLayoutState,
  type MobileHudOrientationLayout,
} from './game/mobileHudLayout';
import type {
  BindableAction,
  CutsceneDef,
  CustomTextureSpec,
  DifficultyId,
  GameMode,
  GraphicsQuality,
  HudSnapshot,
  Language,
  MusicSettings,
  RoosterNameId,
  ScreamerIntensity,
  TextureSlot,
  UpgradeId,
  WeaponId,
} from './game/types';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<NegruzinoEngine | null>(null);
  const coopClientRef = useRef<CoopClient | null>(null);

  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [workshopOpen, setWorkshopOpen] = useState(false);
  const [workshopTab, setWorkshopTab] = useState<WorkshopTabId>('music');
  const [hubSpecsOpen, setHubSpecsOpen] = useState(false);
  const [hudEditorOpen, setHudEditorOpen] = useState(false);
  const [mobileHudLayout, setMobileHudLayout] = useState<MobileHudLayoutState>(() =>
    loadMobileHudLayout()
  );
  const [portraitDismissed, setPortraitDismissed] = useState(false);
  const [musicSettings, setMusicSettings] = useState<MusicSettings>({
    ...DEFAULT_MUSIC_SETTINGS,
  });

  // LAN Co-op state
  const [coopOpen, setCoopOpen] = useState(false);
  const [coopStatus, setCoopStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [coopError, setCoopError] = useState<string | null>(null);
  const [coopClientId, setCoopClientId] = useState<string | null>(null);
  const [coopRoom, setCoopRoom] = useState<CoopRoomSnapshot | null>(null);
  const [lanInfo, setLanInfo] = useState<CoopLanInfoResponse | null>(null);
  const [coopServerHost, setCoopServerHost] = useState('');

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';

    const engine = new NegruzinoEngine(
      mount,
      (snapshot) => {
        setHud(snapshot);
      },
      autostart
    );
    engineRef.current = engine;
    engine.setOpenHubSpecsHandler(() => {
      setHubSpecsOpen(true);
    });
    engine.setMusicPlaylistListener((updated) => {
      setMusicSettings(updated);
    });
    setMusicSettings(engine.getMusicSettings());

    const coop = new CoopClient();
    coopClientRef.current = coop;
    coop.setCallbacks({
      onStatusChange: (status, err) => {
        setCoopStatus(status);
        if (err) setCoopError(err);
        else if (status === 'connected') setCoopError(null);
      },
      onWelcome: (id) => {
        setCoopClientId(id);
      },
      onRoomState: (room) => {
        setCoopError(null);
        setCoopRoom(room);
        engineRef.current?.updateCoopRoomSnapshot(room);
      },
      onRoomLeft: (reason) => {
        setCoopRoom(null);
        if (reason) setCoopError(reason);
        engineRef.current?.stopCoopSession();
      },
      onHubEnter: (room) => {
        setCoopError(null);
        setCoopRoom(room);
        setCoopOpen(false);
        setWorkshopOpen(false);
        setHubSpecsOpen(false);
        engineRef.current?.enterCoopHub(coop, room);
      },
      onHubBoardState: (boardedPlayers, totalPlayers) => {
        engineRef.current?.handleCoopHubBoardState(boardedPlayers, totalPlayers);
      },
      onGameStart: (room) => {
        setCoopError(null);
        setCoopRoom(room);
        setCoopOpen(false);
        setWorkshopOpen(false);
        setHubSpecsOpen(false);
        engineRef.current?.startCoopSession(coop, room);
      },
      onCutsceneVotes: (cutsceneId, votedIds, totalPlayers) => {
        engineRef.current?.handleCoopCutsceneVotes(cutsceneId, votedIds, totalPlayers);
      },
      onCutsceneSkipped: () => {
        engineRef.current?.handleCoopCutsceneSkipped();
      },
      onRemotePlayerState: (st) => {
        engineRef.current?.handleRemotePlayerState(st);
      },
      onRemotePlayerShoot: (evt) => {
        engineRef.current?.handleRemotePlayerShoot(
          evt.playerId,
          evt.ox,
          evt.oy,
          evt.oz,
          evt.dx,
          evt.dy,
          evt.dz
        );
      },
      onPlayerRevived: (evt) => {
        engineRef.current?.handleRemotePlayerRevived(evt.targetId, evt.byName);
      },
      onPlayerPing: (evt) => {
        engineRef.current?.handleRemotePing(evt.playerName, evt.x, evt.z, evt.label);
      },
      onPlayerLeft: (evt) => {
        engineRef.current?.handleRemotePlayerLeft(
          evt.playerId,
          evt.playerName,
          evt.newHostId,
          evt.newHostName
        );
      },
      onWorldEnemies: (enemies, kills, target) => {
        engineRef.current?.handleRemoteWorldEnemies(enemies, kills, target);
      },
      onWorldPickups: (pickups) => {
        engineRef.current?.handleRemoteWorldPickups(pickups);
      },
      onPickupTake: (evt) => {
        engineRef.current?.handleRemotePickupTake(evt.pickupId, evt.byId);
      },
      onEnemyDamage: (evt) => {
        engineRef.current?.handleRemoteEnemyDamage(evt.enemyId, evt.damage, evt.headshot);
      },
      onObjectiveComplete: (objectiveId, byName) => {
        engineRef.current?.handleRemoteObjectiveComplete(objectiveId, byName);
      },
      onTapeCollect: (tapeId, byName) => {
        engineRef.current?.handleRemoteTapeCollect(tapeId, byName);
      },
      onChapterAdvance: (chapterIndex, victory) => {
        engineRef.current?.handleRemoteChapterAdvance(chapterIndex, victory);
      },
      onError: (msg) => {
        setCoopError(msg);
      },
    });

    return () => {
      coop.disconnect();
      coopClientRef.current = null;
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Re-enable portrait prompt if phone was rotated to landscape and back again
  useEffect(() => {
    if (hud && !hud.isPortrait && portraitDismissed) {
      setPortraitDismissed(false);
    }
  }, [hud, portraitDismissed]);

  const handleOpenWorkshop = (tab: WorkshopTabId = 'music') => {
    const engine = engineRef.current;
    if (engine) {
      setMusicSettings(engine.getMusicSettings());
      if (hud?.phase === 'playing' || hud?.phase === 'hub') {
        engine.setPaused(true);
      }
    }
    setWorkshopTab(tab);
    setWorkshopOpen(true);
  };

  const handleNextTrack = () => {
    const engine = engineRef.current;
    if (!engine) return;
    setMusicSettings(engine.cycleMusicTrack());
  };

  const handleChangeLanguage = (lang: Language) => {
    engineRef.current?.setLanguage(lang);
  };

  const handleChangeRoosterName = (name: RoosterNameId) => {
    engineRef.current?.setRoosterName(name);
  };

  const handleChangeScreamerIntensity = (mode: ScreamerIntensity) => {
    engineRef.current?.setScreamerIntensity(mode);
  };

  const handleChangeDifficulty = (difficulty: DifficultyId) => {
    engineRef.current?.setDifficulty(difficulty);
  };

  const handleChangeSensitivity = (sensitivity: number) => {
    engineRef.current?.setMouseSensitivity(sensitivity);
  };

  const handleChangeGraphicsQuality = (quality: GraphicsQuality) => {
    engineRef.current?.setGraphicsQuality(quality);
  };

  const handleRebindAction = useCallback((action: BindableAction, code: string) => {
    engineRef.current?.setKeybind(action, code);
  }, []);

  const handleResetKeybinds = useCallback(() => {
    engineRef.current?.resetKeybinds();
  }, []);

  const handleKeybindCaptureChange = useCallback((active: boolean) => {
    engineRef.current?.setKeybindCaptureMode(active);
  }, []);

  const handleUpdateMusic = (partial: Partial<MusicSettings>) => {
    const engine = engineRef.current;
    if (!engine) return;
    setMusicSettings(engine.updateMusicSettings(partial));
  };

  const handleAddCustomMusicFiles = async (files: File[]) => {
    const engine = engineRef.current;
    if (!engine) return;
    setMusicSettings(await engine.addCustomMusicFiles(files));
  };

  const handleSelectCustomTrack = (id: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    setMusicSettings(engine.selectCustomMusicTrack(id));
  };

  const handleRemoveCustomTrack = async (id: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    setMusicSettings(await engine.removeCustomMusicTrack(id));
  };

  const handleStopCustomPlayback = () => {
    const engine = engineRef.current;
    if (!engine) return;
    setMusicSettings(engine.stopCustomPlaybackToSynth());
  };

  const handleClearAllCustomTracks = async () => {
    const engine = engineRef.current;
    if (!engine) return;
    setMusicSettings(await engine.clearAllCustomMusicTracks());
  };

  const handleApplyPack = (packId: string) => {
    engineRef.current?.applyTexturePreset(packId);
  };

  const handleApplyCustomTexture = (spec: CustomTextureSpec) => {
    engineRef.current?.applyCustomTexture(spec);
  };

  const handleUploadTexture = async (slot: TextureSlot, file: File) => {
    if (!engineRef.current) return;
    await engineRef.current.applyUploadedTexture(slot, file);
  };

  const handlePlayCutscene = (cs: CutsceneDef) => {
    engineRef.current?.openCutscene(cs, false);
  };

  const leaveCoopIfActive = () => {
    if (coopClientRef.current?.getRoom()) {
      coopClientRef.current.leaveRoom();
    }
    engineRef.current?.stopCoopSession();
    setCoopRoom(null);
  };

  const handleConnectAndRefreshCoop = useCallback(
    async (customHost?: string) => {
      const coop = coopClientRef.current;
      if (!coop) return;
      const targetHost = customHost ?? coopServerHost;
      setCoopError(null);
      const info = await coop.fetchLanInfo(targetHost);
      if (info) setLanInfo(info);
      try {
        await coop.connect(targetHost);
        const refreshed = await coop.fetchLanInfo(targetHost);
        if (refreshed) setLanInfo(refreshed);
      } catch {
        // Error surfaced via onStatusChange
      }
    },
    [coopServerHost]
  );

  const handleCreateCoopRoom = useCallback(
    async (callsign: string, mode: GameMode, difficulty: DifficultyId) => {
      const coop = coopClientRef.current;
      if (!coop) return;
      setCoopError(null);
      try {
        await coop.connect(coopServerHost);
        coop.createRoom(callsign, mode, difficulty);
        window.setTimeout(() => {
          void coop.fetchLanInfo(coopServerHost).then((info) => {
            if (info) setLanInfo(info);
          });
        }, 250);
      } catch {
        // Error surfaced via onStatusChange
      }
    },
    [coopServerHost]
  );

  const handleJoinCoopRoom = useCallback(
    async (code: string, callsign: string) => {
      const coop = coopClientRef.current;
      if (!coop) return;
      setCoopError(null);
      try {
        await coop.connect(coopServerHost);
        coop.joinRoom(code, callsign);
      } catch {
        // Error surfaced via onStatusChange
      }
    },
    [coopServerHost]
  );

  const handleLeaveCoopRoom = useCallback(() => {
    coopClientRef.current?.leaveRoom();
    engineRef.current?.stopCoopSession();
    setCoopRoom(null);
    void coopClientRef.current?.fetchLanInfo(coopServerHost).then((info) => {
      if (info) setLanInfo(info);
    });
  }, [coopServerHost]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0b0f17]">
      {/* Isolated WebGL viewport container — never re-mounted by HUD updates */}
      <div
        ref={canvasMountRef}
        data-testid="negruzino-canvas"
        className="fixed inset-0 w-full h-full"
      />

      {/* Cinematic outer-edge camera-lens light drizzle droplets (hidden in bright Hub & AWP scope) */}
      {hud?.phase !== 'hub' && !(hud?.phase === 'playing' && hud.isScoped) && (
        <CameraRainOverlay
          intensity={hud?.phase === 'title' ? 0.78 : 1.0}
          paused={hud?.phase === 'paused' || workshopOpen || hubSpecsOpen || hudEditorOpen}
          eco={hud?.graphicsQuality === 'eco'}
        />
      )}

      {hud && hud.phase === 'title' && (
        <TitleScreen
          language={hud.language}
          roosterName={hud.roosterName}
          difficulty={hud.difficulty}
          muted={hud.muted}
          isTouchDevice={hud.isTouchDevice}
          records={hud.records}
          onChangeDifficulty={handleChangeDifficulty}
          onStartStory={() => {
            leaveCoopIfActive();
            engineRef.current?.enterHub('story');
          }}
          onQuickPlay={() => {
            leaveCoopIfActive();
            engineRef.current?.startPlayImmediate();
          }}
          onStartEndless={() => {
            leaveCoopIfActive();
            engineRef.current?.enterHub('endless');
          }}
          onOpenCoop={() => setCoopOpen(true)}
          onOpenWorkshop={() => handleOpenWorkshop('music')}
          onOpenSettings={() => handleOpenWorkshop('story')}
          onToggleMute={() => engineRef.current?.toggleMute()}
        />
      )}

      {hud && hud.phase === 'cutscene' && hud.activeCutscene && (
        <CutsceneModal
          language={hud.language}
          roosterName={hud.roosterName}
          cutscene={hud.activeCutscene}
          beatIndex={hud.cutsceneBeatIndex}
          isTouchDevice={hud.isTouchDevice}
          cutsceneVote={hud.cutsceneVote}
          onAdvance={() => engineRef.current?.advanceCutscene()}
          onSkip={() => engineRef.current?.skipCutscene()}
        />
      )}

      {hud && hud.phase === 'upgrade' && hud.upgradeChoices.length > 0 && (
        <UpgradeModal
          language={hud.language}
          roosterName={hud.roosterName}
          loopNumber={hud.loopNumber}
          choices={hud.upgradeChoices}
          ownedCount={hud.ownedUpgrades.length}
          isTouchDevice={hud.isTouchDevice}
          onSelect={(id: UpgradeId) => engineRef.current?.selectUpgrade(id)}
        />
      )}

      {hud && (hud.phase === 'playing' || hud.phase === 'hub') && (
        <GameHud
          hud={hud}
          onSelectWeapon={(id: WeaponId) => engineRef.current?.selectWeapon(id)}
          onPatRooster={() => engineRef.current?.patRooster()}
          onPause={() => engineRef.current?.setPaused(true)}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onNextTrack={handleNextTrack}
          onOpenWorkshop={() => handleOpenWorkshop('story')}
          onBoardMoskvitch={() => engineRef.current?.toggleHubMoskvitchBoard()}
          onOpenHubSpecs={() => setHubSpecsOpen(true)}
        />
      )}

      {/* Multi-Touch Smartphone Controls (active in Playing & Hub; strictly hidden on Desktop PC) */}
      {hud &&
        (hud.phase === 'playing' || hud.phase === 'hub') &&
        hud.isTouchDevice &&
        !workshopOpen &&
        !hubSpecsOpen &&
        !hudEditorOpen && (
          <MobileControls
            hud={hud}
            layout={
              hud.isPortrait ? mobileHudLayout.portrait : mobileHudLayout.landscape
            }
            onVirtualMove={(x, y, sprint) =>
              engineRef.current?.setVirtualMove(x, y, sprint)
            }
            onTouchLook={(dx, dy) => engineRef.current?.applyTouchLook(dx, dy)}
            onVirtualFire={(active) => engineRef.current?.setVirtualFire(active)}
            onJump={() => engineRef.current?.triggerVirtualJump()}
            onReload={() => engineRef.current?.triggerReload()}
            onInteract={() => engineRef.current?.triggerInteract()}
            onPatRooster={() => engineRef.current?.patRooster()}
            onToggleScope={() => engineRef.current?.toggleScope()}
            onToggleFlashlight={() => engineRef.current?.toggleFlashlight()}
            onSelectWeapon={(id: WeaponId) => engineRef.current?.selectWeapon(id)}
          />
        )}

      {/* Hub Specs / Arsenal / Co-op Scaling Terminal Modal */}
      {hubSpecsOpen && hud && (
        <HubSpecsModal
          language={hud.language}
          roosterName={hud.roosterName}
          activeWeapon={hud.activeWeapon}
          isTouchDevice={hud.isTouchDevice}
          onSelectWeapon={(id: WeaponId) => engineRef.current?.selectWeapon(id)}
          onClose={() => setHubSpecsOpen(false)}
        />
      )}

      {/* Interactive Mobile Touch HUD Layout Editor */}
      {hud && hudEditorOpen && (
        <MobileHudEditor
          language={hud.language}
          initialLayout={
            hud.isPortrait ? mobileHudLayout.portrait : mobileHudLayout.landscape
          }
          onSave={(updatedOrientation: MobileHudOrientationLayout) => {
            const key = hud.isPortrait ? 'portrait' : 'landscape';
            const next: MobileHudLayoutState = {
              ...mobileHudLayout,
              [key]: updatedOrientation,
            };
            saveMobileHudLayout(next);
            setMobileHudLayout(next);
            setHudEditorOpen(false);
          }}
          onReset={() => {
            const key = hud.isPortrait ? 'portrait' : 'landscape';
            const next = resetMobileHudLayout(key, mobileHudLayout);
            setMobileHudLayout(next);
            return next[key];
          }}
          onCancel={() => setHudEditorOpen(false)}
        />
      )}

      {/* Portrait Rotate-to-Landscape Prompt on Smartphones */}
      {hud &&
        hud.isTouchDevice &&
        hud.isPortrait &&
        !portraitDismissed &&
        !hudEditorOpen && (
          <LandscapePromptOverlay
            language={hud.language}
            onDismiss={() => setPortraitDismissed(true)}
          />
        )}

      {hud &&
        (hud.phase === 'paused' ||
          hud.phase === 'victory' ||
          hud.phase === 'gameover') &&
        !workshopOpen &&
        !hudEditorOpen && (
          <StatusModal
            hud={hud}
            onResume={() => engineRef.current?.setPaused(false)}
            onRestart={() =>
              hud.mode === 'endless'
                ? engineRef.current?.startEndlessLoop()
                : engineRef.current?.startPlayImmediate()
            }
            onNextLoop={() => engineRef.current?.enterNextLoop()}
            onReturnTitle={() => {
              leaveCoopIfActive();
              engineRef.current?.returnToTitle();
            }}
            onOpenWorkshop={() => handleOpenWorkshop('story')}
            onChangeScreamerIntensity={handleChangeScreamerIntensity}
            onChangeLanguage={handleChangeLanguage}
            onChangeRoosterName={handleChangeRoosterName}
            onChangeDifficulty={handleChangeDifficulty}
            onChangeSensitivity={handleChangeSensitivity}
          />
        )}

      {workshopOpen && hud && (
        <WorkshopDrawer
          language={hud.language}
          roosterName={hud.roosterName}
          difficulty={hud.difficulty}
          mouseSensitivity={hud.mouseSensitivity}
          graphicsQuality={hud.graphicsQuality}
          keybinds={hud.keybinds}
          initialTab={workshopTab}
          screamerIntensity={hud.screamerIntensity}
          musicSettings={musicSettings}
          collectedTapes={hud.collectedTapes}
          isTouchDevice={hud.isTouchDevice}
          onOpenHudEditor={() => {
            setWorkshopOpen(false);
            setPortraitDismissed(true);
            setHudEditorOpen(true);
          }}
          onChangeLanguage={handleChangeLanguage}
          onChangeRoosterName={handleChangeRoosterName}
          onChangeDifficulty={handleChangeDifficulty}
          onChangeSensitivity={handleChangeSensitivity}
          onChangeGraphicsQuality={handleChangeGraphicsQuality}
          onRebindAction={handleRebindAction}
          onResetKeybinds={handleResetKeybinds}
          onKeybindCaptureChange={handleKeybindCaptureChange}
          onChangeScreamerIntensity={handleChangeScreamerIntensity}
          onUpdateMusic={handleUpdateMusic}
          onAddCustomMusicFiles={handleAddCustomMusicFiles}
          onSelectCustomTrack={handleSelectCustomTrack}
          onRemoveCustomTrack={handleRemoveCustomTrack}
          onStopCustomPlayback={handleStopCustomPlayback}
          onClearAllCustomTracks={handleClearAllCustomTracks}
          onApplyTexturePack={handleApplyPack}
          onApplyCustomTexture={handleApplyCustomTexture}
          onUploadTexture={handleUploadTexture}
          onPlayCutscene={handlePlayCutscene}
          onPreviewScreamer={() => engineRef.current?.triggerScreamerPreview()}
          onClose={() => setWorkshopOpen(false)}
        />
      )}

      {coopOpen && hud && (
        <LanCoopModal
          language={hud.language}
          status={coopStatus}
          error={coopError}
          clientId={coopClientId}
          room={coopRoom}
          lanInfo={lanInfo}
          defaultDifficulty={hud.difficulty}
          serverHost={coopServerHost}
          onChangeServerHost={setCoopServerHost}
          onConnectAndRefresh={handleConnectAndRefreshCoop}
          onCreateRoom={handleCreateCoopRoom}
          onJoinRoom={handleJoinCoopRoom}
          onLeaveRoom={handleLeaveCoopRoom}
          onUpdateConfig={(mode, difficulty) =>
            coopClientRef.current?.updateLobbyConfig(mode, difficulty)
          }
          onToggleReady={(ready) => coopClientRef.current?.setReady(ready)}
          onStartMatch={() => coopClientRef.current?.enterHub()}
          onClose={() => setCoopOpen(false)}
        />
      )}
    </main>
  );
}
