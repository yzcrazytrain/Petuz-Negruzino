import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraRainOverlay } from './components/CameraRainOverlay';
import { CutsceneModal } from './components/CutsceneModal';
import { GameHud } from './components/GameHud';
import {
  LandscapePromptOverlay,
  MobileControls,
} from './components/MobileControls';
import { StatusModal } from './components/StatusModal';
import { TitleScreen } from './components/TitleScreen';
import { UpgradeModal } from './components/UpgradeModal';
import { WorkshopDrawer, type WorkshopTabId } from './components/WorkshopDrawer';
import { DEFAULT_MUSIC_SETTINGS } from './game/constants';
import { NegruzinoEngine } from './game/engine';
import type {
  BindableAction,
  CutsceneDef,
  CustomTextureSpec,
  DifficultyId,
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

  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [workshopOpen, setWorkshopOpen] = useState(false);
  const [workshopTab, setWorkshopTab] = useState<WorkshopTabId>('music');
  const [portraitDismissed, setPortraitDismissed] = useState(false);
  const [musicSettings, setMusicSettings] = useState<MusicSettings>({
    ...DEFAULT_MUSIC_SETTINGS,
  });

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
    engine.setMusicPlaylistListener((updated) => {
      setMusicSettings(updated);
    });
    setMusicSettings(engine.getMusicSettings());

    return () => {
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
      if (hud?.phase === 'playing') {
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

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0b0f17]">
      {/* Isolated WebGL viewport container — never re-mounted by HUD updates */}
      <div
        ref={canvasMountRef}
        data-testid="negruzino-canvas"
        className="fixed inset-0 w-full h-full"
      />

      {/* Cinematic outer-edge camera-lens light drizzle droplets (hidden only inside AWP scope) */}
      {!(hud?.phase === 'playing' && hud.isScoped) && (
        <CameraRainOverlay intensity={hud?.phase === 'title' ? 0.78 : 1.0} />
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
          onStartStory={() => engineRef.current?.startStory()}
          onQuickPlay={() => engineRef.current?.startPlayImmediate()}
          onStartEndless={() => engineRef.current?.startEndlessLoop()}
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
          onSelect={(id: UpgradeId) => engineRef.current?.selectUpgrade(id)}
        />
      )}

      {hud && hud.phase === 'playing' && (
        <GameHud
          hud={hud}
          onSelectWeapon={(id: WeaponId) => engineRef.current?.selectWeapon(id)}
          onPatRooster={() => engineRef.current?.patRooster()}
          onPause={() => engineRef.current?.setPaused(true)}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onNextTrack={handleNextTrack}
          onOpenWorkshop={() => handleOpenWorkshop('story')}
        />
      )}

      {/* Multi-Touch Smartphone Controls (strictly hidden on Desktop PC) */}
      {hud && hud.phase === 'playing' && hud.isTouchDevice && !workshopOpen && (
        <MobileControls
          hud={hud}
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

      {/* Portrait Rotate-to-Landscape Prompt on Smartphones */}
      {hud && hud.isTouchDevice && hud.isPortrait && !portraitDismissed && (
        <LandscapePromptOverlay
          language={hud.language}
          onDismiss={() => setPortraitDismissed(true)}
        />
      )}

      {hud &&
        (hud.phase === 'paused' ||
          hud.phase === 'victory' ||
          hud.phase === 'gameover') &&
        !workshopOpen && (
          <StatusModal
            hud={hud}
            onResume={() => engineRef.current?.setPaused(false)}
            onRestart={() =>
              hud.mode === 'endless'
                ? engineRef.current?.startEndlessLoop()
                : engineRef.current?.startPlayImmediate()
            }
            onNextLoop={() => engineRef.current?.enterNextLoop()}
            onReturnTitle={() => engineRef.current?.returnToTitle()}
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
          keybinds={hud.keybinds}
          initialTab={workshopTab}
          screamerIntensity={hud.screamerIntensity}
          musicSettings={musicSettings}
          onChangeLanguage={handleChangeLanguage}
          onChangeRoosterName={handleChangeRoosterName}
          onChangeDifficulty={handleChangeDifficulty}
          onChangeSensitivity={handleChangeSensitivity}
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
    </main>
  );
}
