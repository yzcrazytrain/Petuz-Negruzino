import { ASSET_PATHS } from './constants';
import {
  EXTRA_CHAPTER_META_EN,
  EXTRA_CHAPTER_META_RU,
  EXTRA_OBJECTIVE_LABELS_EN,
  EXTRA_OBJECTIVE_LABELS_RU,
  EXTRA_STORY_LOGS_EN,
  EXTRA_STORY_LOGS_RU,
  EXTRA_STORY_TAPES_EN,
  EXTRA_STORY_TAPES_RU,
  ZONE_NAMES,
} from './campaign';
import type {
  BindableAction,
  CutsceneDef,
  DifficultyId,
  EnemyKind,
  GraphicsQuality,
  Language,
  MusicTrackId,
  RoosterNameId,
  StoryLogEntry,
  TexturePatternKind,
  TextureSlot,
  UpgradeId,
  WeaponId,
  ZoneId,
} from './types';

export const LANG_STORAGE_KEY = 'negruzino_language';
export const ROOSTER_NAME_STORAGE_KEY = 'negruzino_rooster_name';
export const DIFFICULTY_STORAGE_KEY = 'negruzino_difficulty';
export const SENSITIVITY_STORAGE_KEY = 'negruzino_mouse_sensitivity';
export const GRAPHICS_QUALITY_STORAGE_KEY = 'negruzino_graphics_quality';

export function loadInitialLanguage(): Language {
  try {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'ru') return saved;
  } catch {
    // Ignore storage access failures
  }
  return 'ru';
}

export function saveLanguage(lang: Language): void {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Ignore storage access failures
  }
}

export function loadInitialRoosterName(): RoosterNameId {
  try {
    const saved = window.localStorage.getItem(ROOSTER_NAME_STORAGE_KEY);
    if (saved === 'grisha' || saved === 'vanya') return saved;
  } catch {
    // Ignore storage access failures
  }
  return 'grisha';
}

export function saveRoosterName(name: RoosterNameId): void {
  try {
    window.localStorage.setItem(ROOSTER_NAME_STORAGE_KEY, name);
  } catch {
    // Ignore storage access failures
  }
}

export function loadInitialDifficulty(): DifficultyId {
  try {
    const saved = window.localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (saved === 'easy' || saved === 'normal' || saved === 'hard') return saved;
  } catch {
    // Ignore storage access failures
  }
  return 'normal';
}

export function saveDifficulty(difficulty: DifficultyId): void {
  try {
    window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, difficulty);
  } catch {
    // Ignore storage access failures
  }
}

export function loadInitialSensitivity(): number {
  try {
    const raw = window.localStorage.getItem(SENSITIVITY_STORAGE_KEY);
    if (raw) {
      const val = Number(raw);
      if (Number.isFinite(val) && val >= 0.4 && val <= 2.2) return Number(val.toFixed(2));
    }
  } catch {
    // Ignore storage access failures
  }
  return 1.0;
}

export function saveSensitivity(sens: number): void {
  try {
    window.localStorage.setItem(SENSITIVITY_STORAGE_KEY, String(sens));
  } catch {
    // Ignore storage access failures
  }
}

export function loadInitialGraphicsQuality(isTouchDevice: boolean): GraphicsQuality {
  try {
    const saved = window.localStorage.getItem(GRAPHICS_QUALITY_STORAGE_KEY);
    if (saved === 'eco' || saved === 'balanced' || saved === 'high') return saved;
  } catch {
    // Ignore storage access failures
  }
  return isTouchDevice ? 'eco' : 'balanced';
}

export function saveGraphicsQuality(quality: GraphicsQuality): void {
  try {
    window.localStorage.setItem(GRAPHICS_QUALITY_STORAGE_KEY, quality);
  } catch {
    // Ignore storage access failures
  }
}

/**
 * Rewrites canonical Grisha / Гриша companion text into Vanya / Ваня
 * with proper Russian grammatical declensions when selected in Settings.
 */
export function localizeRoosterCopy(
  text: string,
  lang: Language,
  nameId: RoosterNameId
): string {
  if (nameId === 'grisha') return text;
  if (lang === 'ru') {
    return text
      .replace(/GRISHA/g, 'VANYA')
      .replace(/ГРИША/g, 'ВАНЯ')
      .replace(/Гриша/g, 'Ваня')
      .replace(/Гришу/g, 'Ваню')
      .replace(/Гриши/g, 'Вани')
      .replace(/Гришей/g, 'Ваней')
      .replace(/Грише/g, 'Ване');
  }
  return text.replace(/GRISHA/g, 'VANYA').replace(/Grisha/g, 'Vanya');
}

/**
 * Strips PC keyboard/mouse shortcut hints like [E], [F], [L], [N], [R], [1–3], (N)
 * from UI text when running on touch/mobile devices.
 */
export function stripPcKeyHints(text: string): string {
  return text
    .replace(/\s*\[[A-Za-zА-Яа-я0-9/+\-–—\s]{1,16}\]/g, '')
    .replace(/\s*\([A-Z]\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?:;»"])/g, '$1')
    .trim();
}

export interface WeaponText {
  name: string;
  shortName: string;
  role: string;
}

export interface UiStrings {
  pageTitle: string;
  brandTitle: string;
  brandSubtitle: string;
  titleDescription: string;
  playStory: string;
  jumpIntoStreet: string;
  musicAndTextures: string;
  settingsBtn: string;
  controlsHint: string;
  muteAudio: string;
  unmuteAudio: string;
  pauseGame: string;
  openStudio: string;
  skipCutscene: string;
  continueBtn: string;
  enterNegruzino: string;
  vitality: string;
  kills: string;
  score: string;
  reloading: string;
  reloadHint: string;
  scopeReloadHint: string;
  spinLabel: string;
  awpScopeBanner: string;
  pointerLockHint: string;
  petyaName: string;
  patsLabel: string;
  patButton: string;
  patAria: string;
  roosterHopping: string;
  roosterFlying: string;
  roosterAlerting: string;
  roosterHappyHeal: (hp: number) => string;
  roosterHappyCluck: string;
  roosterAlertPrefix: string;
  dirBehind: string;
  dirAhead: string;
  dirRight: string;
  dirLeft: string;
  enemyNames: Record<EnemyKind, string>;
  bossName: string;
  bossObjective: string;
  objectiveProgress: (
    summary: string,
    done: number,
    total: number,
    kills: number,
    targetKills: number
  ) => string;
  clearRemainingEntities: (kills: number, targetKills: number) => string;
  restorePrompt: (label: string) => string;
  screamerCaptions: {
    fence: string;
    hollow: string;
    watchman: string;
    fog: string;
    preview: string;
  };
  controlsHeading: string;
  controlsDesc: string;
  controlsListening: string;
  controlsResetBtn: string;
  controlsSideMouseHint: string;
  bindActions: Record<BindableAction, string>;
  mobileRotateTitle: string;
  mobileRotateDesc: string;
  mobileRotateBtn: string;
  mobilePlayAnyway: string;
  mobileFire: string;
  mobileScope: string;
  mobileReload: string;
  mobileInteract: string;
  mobileInteractLabels: {
    objective: string;
    tape: string;
    revive: string;
    hubCarBoard: string;
    hubCarLeave: string;
    hubSpecs: string;
  };
  mobilePat: string;
  mobileJump: string;
  mobileFlash: string;
  graphicsQualityLabel: string;
  graphicsModes: Record<GraphicsQuality, { label: string; hint: string }>;
  hudEditorTitle: string;
  hudEditorDesc: string;
  hudEditorOpenBtn: string;
  hudEditorSave: string;
  hudEditorReset: string;
  hudEditorCancel: string;
  hudEditorScale: string;
  hudEditorHint: string;
  hudControlNames: {
    joystick: string;
    fire: string;
    reload: string;
    jump: string;
    interact: string;
    pat: string;
    flashlight: string;
    scope: string;
    weapons: string;
  };
  audioUploading: string;
  audioUploadError: string;
  pauseHeading: string;
  pauseSubcopy: string;
  victoryHeading: string;
  victorySubcopy: string;
  gameoverHeading: string;
  gameoverSubcopy: string;
  statTime: string;
  statEntities: string;
  statPats: string;
  languageLabel: string;
  screamerIntensityLabel: string;
  screamerFull: string;
  screamerReduced: string;
  resumeGame: string;
  playAgain: string;
  tryAgain: string;
  restartRun: string;
  titleScreen: string;
  returnToTitle: string;
  studioTitle: string;
  studioSubtitle: string;
  closeStudio: string;
  tabMusic: string;
  tabTextures: string;
  tabStorySettings: string;
  originalSoundtracks: string;
  tempoBpm: string;
  fogDrone: string;
  tapeWarble: string;
  musicVolume: string;
  customFileActive: (name: string) => string;
  uploadAudioHint: string;
  restoreSynth: string;
  loadAudioFile: string;
  cassetteDeckHeading: string;
  cassetteDeckNote: string;
  cassetteAddFiles: string;
  cassetteEmpty: string;
  cassettePlayingTag: string;
  cassetteClearAll: string;
  cassetteRemoveTrack: (name: string) => string;
  cassetteTracksLoaded: (count: number) => string;
  texturePacksHeading: string;
  surfaceBuilderHeading: string;
  surfaceSlots: Record<TextureSlot, string>;
  patternLabel: string;
  patterns: Record<TexturePatternKind, string>;
  baseColorLabel: string;
  accentColorLabel: string;
  grimeLabel: string;
  wearLabel: string;
  applyToSurface: (slot: TextureSlot) => string;
  uploadImageTexture: string;
  languageSettingsHeading: string;
  languageSettingsDesc: string;
  cutsceneArchiveHeading: string;
  testScreamer: string;
  arsenalGuideHeading: string;
  msgNowPlaying: (name: string) => string;
  msgLoadedAudio: (name: string) => string;
  msgAppliedPack: (name: string) => string;
  msgAppliedCustom: (pattern: string, slot: string) => string;
  msgAppliedUpload: (file: string, slot: string) => string;
  msgUploadError: string;
  weapons: Record<WeaponId, WeaponText>;
  musicTracks: Record<MusicTrackId, { name: string; mood: string }>;
  texturePacks: Record<string, { name: string; description: string }>;
  objectiveLabels: Record<string, string>;
  chapterMeta: Array<{
    title: string;
    objectiveSummary: string;
    introCutscene: CutsceneDef;
  }>;
  victoryCutscene: CutsceneDef;
  endlessBtn: string;
  nextLoopBtn: (nextLoop: number) => string;
  loopBadge: (loop: number) => string;
  endlessWaveTitle: (wave: number) => string;
  endlessObjective: (kills: number, target: number) => string;
  bestRecordLine: (score: number, loop: number) => string;
  flashlightOn: string;
  flashlightOff: string;
  headshotCallout: string;
  overclockLabel: (sec: number) => string;
  comboLabel: (mult: number) => string;
  pickupAmmo: string;
  pickupMedkit: string;
  pickupOverclock: string;
  metersSuffix: string;
  upgradeModalTitle: string;
  upgradeModalSubtitle: (loop: number) => string;
  upgradeKeyHint: string;
  upgrades: Record<UpgradeId, { file: string; name: string; desc: string; tag: string }>;
  p90AutoReloadHint: string;
  roosterNameLabel: string;
  roosterNameDesc: string;
  roosterGrisha: string;
  roosterVanya: string;
  exportHeading: string;
  exportDesc: string;
  downloadHtmlBtn: string;
  downloadDesktopBtn: string;
  difficultyLabel: string;
  difficulties: Record<DifficultyId, { label: string; hint: string }>;
  sensitivityLabel: string;
  cutsceneKeyHint: string;
  storyLogs: Record<string, StoryLogEntry>;
  storyTapes: Record<
    string,
    { code: string; title: string; location: string; speaker: string; text: string }
  >;
  tapeArchiveHeading: string;
  tapeLockedHint: string;
  tapeCollectPrompt: (title: string) => string;
  tapeCollectedToast: (title: string, found: number, total: number) => string;
  tapesCounterLabel: string;
  lanCoopBtn: string;
  lanCoop: {
    title: string;
    subtitle: string;
    callsignLabel: string;
    serverAddrLabel: string;
    serverAddrPlaceholder: string;
    connectBtn: string;
    refreshBtn: string;
    createRoomBtn: string;
    joinRoomBtn: string;
    roomCodePlaceholder: string;
    openRoomsHeading: string;
    noOpenRooms: string;
    yourLanHeading: string;
    copyCodeBtn: string;
    copiedBadge: string;
    readyBtn: string;
    unreadyBtn: string;
    startMatchBtn: string;
    enterHubBtn: string;
    hubRuleHint: string;
    leaveRoomBtn: string;
    hostTag: string;
    readyTag: string;
    waitingTag: string;
    statusConnected: string;
    statusConnecting: string;
    statusOffline: string;
    squadHeading: string;
    revivePrompt: (name: string) => string;
    downedBanner: string;
    pingHint: string;
    pingSentLabel: string;
    scalingBadge: (players: number, hpMult: string, dmgMult: string) => string;
  };
  zoneNames: Record<ZoneId, string>;
  hub: {
    title: string;
    subtitle: string;
    freeExploreHint: string;
    moskvitchBoardPrompt: string;
    moskvitchLeavePrompt: string;
    moskvitchBoardBtn: string;
    moskvitchLeaveBtn: string;
    moskvitchCounter: (boarded: number, total: number) => string;
    moskvitchWaiting: (missing: number) => string;
    moskvitchLaunching: string;
    terminalPrompt: string;
    terminalBtn: string;
    rangeHint: string;
    rangeHitReadout: (dummy: string, dmg: number, dist: number, crit: boolean, destroyed: boolean) => string;
    rangeDummyNames: {
      crawler: string;
      lampshade: string;
      screamer: string;
      heavy: string;
    };
    enterHubBtn: string;
    quickStartBtn: string;
    ammoInfiniteBadge: string;
    zoneTransitionBanner: (zoneName: string) => string;
  };
  specsModal: {
    title: string;
    subtitle: string;
    closeBtn: string;
    tabWeapons: string;
    tabUpgrades: string;
    tabEnemies: string;
    tabCoop: string;
    statDamage: string;
    statPellets: string;
    statRpm: string;
    statMag: string;
    statReload: string;
    statRange: string;
    statSpecial: string;
    secSuffix: string;
    enemyHpLabel: string;
    enemySpeedLabel: string;
    enemyThreatLabel: string;
    enemyProfiles: Array<{
      kind: EnemyKind;
      hp: string;
      speed: string;
      behavior: string;
      counter: string;
    }>;
    roosterCardTitle: string;
    roosterCardDesc: string;
    coopIntro: string;
    coopColPlayers: string;
    coopColHp: string;
    coopColDmg: string;
    coopColSpeed: string;
    coopColCaps: string;
    coopColKills: string;
    coopColLoot: string;
    coopRulesNote: string;
  };
  cutsceneVote: {
    voteBtn: string;
    votedBtn: string;
    counter: (votes: number, total: number) => string;
    waitingHint: string;
  };
  characterRanks: [string, string, string, string, string];
  levelShort: string;
  levelUpBanner: (level: number, rank: string) => string;
  nextTrackBtn: string;
  trackToastPrefix: string;
}

export const TRANSLATIONS: Record<Language, UiStrings> = {
  ru: {
    pageTitle: 'НЕГРУЗИНО.EXE: Полуночная петля',
    brandTitle: 'НЕГРУЗИНО',
    brandSubtitle: 'ПОЛУНОЧНАЯ ПЕТЛЯ · 1994 · EXE',
    titleDescription:
      'Октябрь 1994-го. Дед-радиоинженер Михаил Савельев замкнул подстанцию Негрузино на 23:59, чтобы не отпускать ту дождливую ночь. Вы приехали к дому №14, чтобы распутать магнитную петлю, услышать правду и вывести петуха Гришу к рассвету.',
    playStory: 'Начать сюжет',
    jumpIntoStreet: 'Быстрая игра',
    musicAndTextures: 'Звук и вид',
    settingsBtn: 'Настройки',
    controlsHint:
      'WASD Ходьба · Мышь / Стрелки Обзор · ЛКМ Огонь · ПКМ Прицел · 1-5 Оружие · N Музыка · L Фонарик · F Погладить · E Щиток · Esc Пауза',
    muteAudio: 'Выключить звук (M)',
    unmuteAudio: 'Включить звук (M)',
    pauseGame: 'Пауза (P)',
    openStudio: 'Настройки звука, графики и игры',
    skipCutscene: 'Пропустить',
    continueBtn: 'Далее',
    enterNegruzino: 'Выйти на улицу',
    vitality: 'ЗДОРОВЬЕ',
    kills: 'УБИТО',
    score: 'СЧЁТ',
    reloading: 'ПЕРЕЗАРЯДКА...',
    reloadHint: '[R] ПЕРЕЗАРЯДКА',
    scopeReloadHint: '[ПКМ] ПРИЦЕЛ · [R] ПЕРЕЗАРЯДКА',
    spinLabel: 'РАСКРУТКА',
    awpScopeBanner: 'AWP-96 ОПТИКА · 3.2× · [ПКМ] ВЫХОД',
    pointerLockHint:
      'Кликните по экрану для обзора мышью · Стрелки тоже поворачивают · [F] Погладить Гришу',
    petyaName: 'ГРИША',
    patsLabel: 'ЛАСК',
    patButton: '[F] ГЛАДИТЬ',
    patAria: 'Погладить петуха Гришу (F)',
    roosterHopping: 'Прыгает рядом',
    roosterFlying: 'Летает вокруг вас',
    roosterAlerting: 'Тревога! Кукарекает!',
    roosterHappyHeal: (hp) => `Рад ласке! +${hp} ОЗ`,
    roosterHappyCluck: 'Гриша рад ласке!',
    roosterAlertPrefix: 'Гриша кричит:',
    dirBehind: 'СЗАДИ',
    dirAhead: 'СПЕРЕДИ',
    dirRight: 'СПРАВА',
    dirLeft: 'СЛЕВА',
    enemyNames: {
      crawler: 'ТВАРЬ',
      lampshade: 'ТЕНЬ ФОНАРЯ',
      screamer: 'СКРИМЕР',
      watchman: 'СМОТРИТЕЛЬ',
    },
    bossName: 'ПОЛУНОЧНЫЙ СМОТРИТЕЛЬ',
    bossObjective: 'Победите Полуночного Смотрителя на центральной площади',
    objectiveProgress: (summary, done, total, kills, targetKills) =>
      `${summary} (${done}/${total} узлов · ${kills}/${targetKills} целей)`,
    clearRemainingEntities: (kills, targetKills) =>
      `Уничтожьте оставшихся монстров (${kills}/${targetKills})`,
    restorePrompt: (label) => `[E] Запустить: ${label}`,
    screamerCaptions: {
      fence: 'ОНО НАШЛО ТЕБЯ ЗА ЗАБОРОМ',
      hollow: 'КРИК ПУСТОГО СКРИМЕРА',
      watchman: 'СМОТРИТЕЛЬ ЗАБИРАЕТ ПОЛНОЧЬ',
      fog: 'ТЕНЬ ЗА ТВОЕЙ СПИНОЙ',
      preview: 'НЕГРУЗИНО ВИДИТ ТЕБЯ',
    },
    controlsHeading: 'Управление и боковые кнопки мыши',
    controlsDesc:
      'Нажмите на действие и выберите клавишу или боковую кнопку мыши (M4 / M5). Навигация браузера «Назад/Вперёд» блокируется автоматически.',
    controlsListening: 'Нажмите клавишу или M4/M5...',
    controlsResetBtn: 'Сбросить по умолчанию',
    controlsSideMouseHint: 'Поддерживаются клавиатура, ЛКМ/ПКМ/СКМ и боковые кнопки мыши M4 и M5',
    bindActions: {
      reload: 'Перезарядка',
      interact: 'Взаимодействие (Щиток / Ретранслятор)',
      patRooster: 'Погладить Гришу',
      flashlight: 'Фонарик',
      scope: 'Оптический прицел (AWP)',
      nextTrack: 'Следующий трек кассеты',
      nextWeapon: 'Сменить оружие',
      jump: 'Прыжок',
      sprint: 'Бег (удерживать)',
    },
    mobileRotateTitle: 'Поверните экран горизонтально',
    mobileRotateDesc:
      'Для удобного прицеливания и полного обзора ночной улицы игра оптимизирована под горизонтальный режим смартфона.',
    mobileRotateBtn: 'Перейти в горизонтальный режим',
    mobilePlayAnyway: 'Продолжить вертикально',
    mobileFire: 'ОГОНЬ',
    mobileScope: 'Прицел',
    mobileReload: 'Перезарядка',
    mobileInteract: 'Щиток',
    mobileInteractLabels: {
      objective: 'Щиток',
      tape: 'Кассета',
      revive: 'Поднять',
      hubCarBoard: 'В машину',
      hubCarLeave: 'Выйти',
      hubSpecs: 'Стенд ТТХ',
    },
    mobilePat: 'Погладить',
    mobileJump: 'Прыжок',
    mobileFlash: 'Фонарик',
    graphicsQualityLabel: 'Графика и энергосбережение',
    graphicsModes: {
      eco: {
        label: 'Эко (Батарея)',
        hint: '36 FPS, без тяжёлых пост-эффектов, мягкое энергопотребление и меньше нагрева смартфона.',
      },
      balanced: {
        label: 'Баланс',
        hint: '60 FPS, оптимизированный свет, плавный bloom и умеренная нагрузка на видеокарту.',
      },
      high: {
        label: 'Высокое',
        hint: '60 FPS, тени 2048px, полный 4x MSAA и динамические тени фонарика.',
      },
    },
    pauseHeading: 'Пауза',
    pauseSubcopy: 'Фонари замерли, пока вы переводите дух.',
    victoryHeading: 'Рассвет над Негрузино',
    victorySubcopy: 'Фонарь Смотрителя разбит. Вы выбрались из петли вместе с Гришей.',
    gameoverHeading: 'Поглощён полночью',
    gameoverSubcopy: 'Петля сбросилась у дома №14. Перезарядитесь и попробуйте снова.',
    statTime: 'Время',
    statEntities: 'Убито',
    statPats: 'Погладил Гришу',
    languageLabel: 'Язык / Language',
    screamerIntensityLabel: 'Яркость скримеров',
    screamerFull: 'Полная',
    screamerReduced: 'Мягкая',
    resumeGame: 'Продолжить',
    playAgain: 'Играть снова',
    tryAgain: 'Попробовать снова',
    restartRun: 'Начать заново',
    titleScreen: 'В меню',
    returnToTitle: 'Выйти в главное меню',
    studioTitle: 'Настройки НЕГРУЗИНО.EXE',
    studioSubtitle: 'Язык, имя петуха, саундтрек, материалы карты и локальный экспорт',
    closeStudio: 'Закрыть настройки',
    tabMusic: 'Саундтрек',
    tabTextures: 'Материалы',
    tabStorySettings: 'Настройки и файлы',
    originalSoundtracks: 'Записи кассетного магнитофона',
    tempoBpm: 'ТЕМП (BPM)',
    fogDrone: 'ГУЛ ТУМАНА',
    tapeWarble: 'ДЕТОНАЦИЯ ПЛЁНКИ',
    musicVolume: 'ГРОМКОСТЬ МУЗЫКИ',
    customFileActive: (name) => `Играет ваш трек: ${name}`,
    uploadAudioHint: 'Загрузите один или сразу несколько MP3 / WAV / OGG треков — они сохранятся в игре',
    restoreSynth: 'К встроенным трекам',
    loadAudioFile: 'Добавить MP3 / OGG / WAV',
    cassetteDeckHeading: 'Кассетная дека 1994 — Реальные треки (MP3 / OGG / WAV)',
    cassetteDeckNote:
      'Из-за авторских прав оригинальные студийные записи «Багрового Фантомаса» нельзя вшить напрямую в код. Добавьте свои MP3-файлы сюда — они сохранятся в памяти браузера, будут сами переключаться по очереди и по клавише [N].',
    cassetteAddFiles: 'Выбрать MP3 файлы (можно сразу все)',
    cassetteEmpty: 'Плейлист пуст — добавьте любимые треки (например, «Никогда Нихрена», «Крот-Телепат», «Сон Купца»).',
    cassettePlayingTag: 'ИГРАЕТ',
    cassetteClearAll: 'Очистить кассету',
    cassetteRemoveTrack: (name) => `Удалить трек ${name}`,
    cassetteTracksLoaded: (count) => `Сохранено на кассете: ${count} трек(а/ов). Клавиша [N] переключает их в игре.`,
    texturePacksHeading: 'Пресеты окружения пригорода',
    surfaceBuilderHeading: 'Настройка поверхностей карты',
    surfaceSlots: {
      house: 'Дома',
      fence: 'Заборы',
      road: 'Дорога',
      lawn: 'Газоны',
    },
    patternLabel: 'Узор материала',
    patterns: {
      stucco_brick: 'Штукатурка и кирпич',
      timber_planks: 'Старые доски забора',
      cracked_asphalt: 'Мокрый треснутый асфальт',
      concrete_panels: 'Советские бетонные плиты',
      night_grass: 'Ночная сырая трава',
      anomaly_grid: 'Лиминальная VHS-аномалия',
    },
    baseColorLabel: 'Основной цвет',
    accentColorLabel: 'Цвет потёртостей',
    grimeLabel: 'ГРЯЗЬ / СЫРОСТЬ',
    wearLabel: 'ТРЕЩИНЫ / ИЗНОС',
    applyToSurface: (slot) => {
      const map: Record<TextureSlot, string> = {
        house: 'Применить на дома',
        fence: 'Применить на заборы',
        road: 'Применить на дорогу',
        lawn: 'Применить на газоны',
      };
      return map[slot];
    },
    uploadImageTexture: 'Загрузить свою текстуру',
    languageSettingsHeading: 'Язык интерфейса / Interface Language',
    languageSettingsDesc:
      'Переключайте язык в любой момент — все кат-сцены, интерфейс и подсказки Гриши обновятся сразу.',
    cutsceneArchiveHeading: 'Архив сюжетных кат-сцен',
    testScreamer: 'Тест скримера',
    arsenalGuideHeading: 'Арсенал',
    msgNowPlaying: (name) => `Сейчас играет: «${name}».`,
    msgLoadedAudio: (name) => `Загружен ваш саундтрек: «${name}».`,
    msgAppliedPack: (name) => `Пресет «${name}» применён.`,
    msgAppliedCustom: (pattern, slot) => `Материал «${pattern}» применён: ${slot}.`,
    msgAppliedUpload: (file, slot) => `Изображение «${file}» наложено на: ${slot}.`,
    msgUploadError: 'Не удалось загрузить изображение. Попробуйте PNG или JPG.',
    weapons: {
      shotgun: {
        name: 'ТОЗ-194 Дробовик',
        shortName: 'ДРОБОВИК',
        role: 'Ваншот вблизи · картечь',
      },
      awp: {
        name: 'AWP-96 Снайперка',
        shortName: 'AWP',
        role: 'Дальний бой · оптика',
      },
      pistol: {
        name: 'DE-50 Крупнокалиберный',
        shortName: 'ПИСТОЛЕТ',
        role: 'Тяжёлый полуавтомат',
      },
      minigun: {
        name: 'ГШГ-6 Миниган',
        shortName: 'МИНИГАН',
        role: '6 вращающихся стволов',
      },
      p90: {
        name: 'P90-N Тактический ПП',
        shortName: 'P90',
        role: 'Автоперезарядка · 50 патронов',
      },
    },
    musicTracks: {
      telepath_mole: {
        name: 'Крот-Телепат (Психо-рок)',
        mood: 'Фузз-гитара, плотный грув и полуночная телепатия в духе Багрового Фантомаса',
      },
      nikogda_nihrena: {
        name: 'Никогда Нихрена (Панк-рок)',
        mood: 'Грязный гаражный драйв, живые ударные и дерзкий рифф на перестрелку',
      },
      oruzhenosets_bike: {
        name: 'Оруженосец / Байк (Рок-мотор)',
        mood: 'Тяжёлый байкерский галоп и рёв перегруженной гитары по мокрой трассе',
      },
      electric_giraffe: {
        name: 'Электрический Жираф (Синт-рок)',
        mood: 'Пружинистый диско-рок, неоновые клавиши и искры подстанции',
      },
      merchant_dream: {
        name: 'Сон Купца (Арт-рок баллада)',
        mood: 'Гипнотический вальс, переливчатые струнные и тёплый винтажный дисторшн',
      },
      you_know_metal: {
        name: 'You Know (Хэви-метал)',
        mood: 'Двойная бочка, стальные пауэр-аккорды и шквальное соло для босса',
      },
      moonlight_sonata: {
        name: 'Лунная соната 1994 (Классика)',
        mood: 'Камерный клавесин и тревожные струнные под ночным дождём',
      },
      midnight_fog: {
        name: 'Негрузино 00:00 (Пост-панк)',
        mood: 'Холодный советский пост-панк бас и гул натриевых фонарей',
      },
      watchman_dread: {
        name: 'Колокол Смотрителя (Дум-метал)',
        mood: 'Сокрушительный дум-рифф и тяжёлый колокол трансформаторной вышки',
      },
    },
    texturePacks: {
      classic_1994: {
        name: 'Негрузино 1994 (Стандарт)',
        description: 'Облупленная штукатурка, советская вагонка, кирпич, сырой газон и мокрый асфальт',
      },
      rusted_iron: {
        name: 'Ржавый промсектор',
        description: 'Ржавые заборы, бетонные плиты и тёмный битум',
      },
      frost_loop: {
        name: 'Ноябрьский иней 1994',
        description: 'Подмороженные газоны, белёные дома и ледяной асфальт',
      },
      blood_anomaly: {
        name: 'NEGRUZINO.EXE (Сбой)',
        description: 'Треснутый бетон, тёмная ржавчина и помехи на стенах',
      },
    },
    objectiveLabels: {
      ch1_fuse_1: 'Электрощиток №14 (Западный двор)',
      ch1_fuse_2: 'Электрощиток №11 (Восточное крыльцо)',
      ch2_relay_1: 'Ретранслятор А (Двор №12)',
      ch2_relay_2: 'Ретранслятор Б (Двор №07)',
      ch3_stab_1: 'Стабилизатор фазы №08 (Тёмный двор)',
      ch3_stab_2: 'Стабилизатор фазы №15 (Восточный сад)',
      ch4_beacon_1: 'Маяк периметра С-З (Двор №04)',
      ch4_beacon_2: 'Маяк периметра С-В (Двор №03)',
      ch4_beacon_3: 'Дорожное зеркало (Южное шоссе)',
      ch5_core_1: 'Заземление подстанции (Запад)',
      ch5_core_2: 'Заземление подстанции (Восток)',
      ...EXTRA_OBJECTIVE_LABELS_RU,
    },
    chapterMeta: [
      {
        title: 'Глава 1: Магнитная полночь',
        objectiveSummary: 'Расстреляйте 2 аномальных узла у щитков и переживите первую засаду петли.',
        introCutscene: {
          id: 'ch1_intro',
          chapter: 1,
          title: 'Акт I · Магнитная полночь',
          subtitle: 'Посёлок НЕГРУЗИНО · 14 октября 1994 · 23:59',
          image: ASSET_PATHS.cutsceneStreet,
          beats: [
            {
              speaker: 'ТЕЛЕГРАММА · МИХАИЛ САВЕЛЬЕВ',
              timestamp: '23:59:04',
              text: '«Внук, если ты читаешь это — мой резонатор на подстанции пошёл вразнос. Я хотел удержать вечер до последнего автобуса №404, но запер весь посёлок в 23:59. Забери ключи у дома №14 и не бросай Гришу». Ваш «Москвич» заглох в мокром асфальте прямо у въезда.',
            },
            {
              speaker: 'ПЕТУХ ГРИША · ВЕСТНИК РАССВЕТА',
              timestamp: '23:59:18',
              text: 'В этом закольцованном дожде живым остался лишь дедов петух Гриша — единственное существо, чей крик будит утро. Он чувствует тени за секунду до броска, никогда не лезет под пули и возвращает выдержку, если погладить его [F].',
            },
            {
              speaker: 'ВНУТРЕННИЙ МОНОЛОГ',
              timestamp: '23:59:31',
              text: 'Руки ещё дрожат на старом ТОЗ-194 из багажника, но дорога назад замкнулась в кольцо. Включите два уличных щитка [E] и собирайте по дворам кассеты МК-60 деда — в них вся правда о том вечере.',
            },
          ],
        },
      },
      {
        title: 'Глава 2: Плёнки Савельева',
        objectiveSummary: 'Удерживайте 2 зоны синхронизации во дворах №12 и №07 под натиском теней.',
        introCutscene: {
          id: 'ch2_intro',
          chapter: 2,
          title: 'Акт II · Плёнки Савельева',
          subtitle: 'Архив катушечной памяти · Сбой синхронизации 00:11',
          image: ASSET_PATHS.cutsceneWatchman,
          beats: [
            {
              speaker: 'КАССЕТА ДЕДА №02 · ИНЖЕНЕРНЫЙ ДНЕВНИК',
              timestamp: '00:11:05',
              text: 'Щитки оживили радио «Москвича», и из хрипа прорвался усталый голос деда: «Когда октябрьский ливень размыл трассу и рейс №404 с твоей матерью не пришёл вовремя, я подцепил резонатор LOOP_00 к подстанции. Хотел отмотать один-единственный час...»',
            },
            {
              speaker: 'ОСОЗНАНИЕ · ПРИРОДА ТЕНЕЙ',
              timestamp: '00:11:19',
              text: '«Но магнитная лента начала осыпаться. Твари в траве и Тени под фонарями — не чужаки, а разорванные отпечатки тревоги, записанные поверх друг друга сотню раз».',
            },
            {
              speaker: 'ПЛАН ПРОРЫВА',
              timestamp: '00:11:34',
              text: 'Настройте ретрансляторы во дворах №12 и №07 [E], чтобы выловить чистую частоту диспетчерской. Каждый бой возвращает ясность и закаляет вашу хватку.',
            },
          ],
        },
      },
      {
        title: 'Глава 3: Глухой квартал',
        objectiveSummary: 'Прорвитесь в тёмные дворы №08 и №15 и активируйте 2 ЭМИ-стабилизатора.',
        introCutscene: {
          id: 'ch3_intro',
          chapter: 3,
          title: 'Акт III · Глухой квартал',
          subtitle: 'Дома №08 и №15 · Сектор блэкаута · 00:24',
          image: ASSET_PATHS.cutsceneStreet,
          beats: [
            {
              speaker: 'РАДИОПЕРЕХВАТ · СОСЕД ИЗ ДОМА №08',
              timestamp: '00:24:03',
              text: 'Через ретрансляторы пробился сбивчивый голос соседа с тёмной стороны улицы: «Миша, выключи трансформатор! За северными соснами горят фары — но они не могут доехать, пока улица крутится по кругу!»',
            },
            {
              speaker: 'БЛЭКАУТ КВАРТАЛА',
              timestamp: '00:24:18',
              text: 'Лампы у домов №08 и №15 моргнули и погасли. Тени стали хитрее — они заходят с флангов через калитки, а Пустые Скримеры караулят прямо за штакетником.',
            },
            {
              speaker: 'ЗАДАЧА',
              timestamp: '00:24:30',
              text: 'Включите фонарик [L], прорвитесь в неосвещённые дворы №08 и №15 и перезапустите оба стабилизатора фазы [E], иначе блэкаут отрежет вас от подстанции.',
            },
          ],
        },
      },
      {
        title: 'Глава 4: Рейс №404',
        objectiveSummary: 'Расстреляйте 3 маяка-глушилки у северных дворов и заглохшего «Москвича».',
        introCutscene: {
          id: 'ch4_intro',
          chapter: 4,
          title: 'Акт IV · Рейс №404',
          subtitle: 'Северный рубеж · Автобус, который не погиб · 00:38',
          image: ASSET_PATHS.cutsceneWatchman,
          beats: [
            {
              speaker: 'ДИСПЕТЧЕРСКАЯ · ПОЛНАЯ РАСШИФРОВКА',
              timestamp: '00:38:08',
              text: 'Стабилизаторы очистили ленту до конца — и правда ударила холодным током: рейс №404 НЕ разбился. ГАИ остановила автобус на сухом посту в десяти километрах, и все пассажиры благополучно дождались утра.',
            },
            {
              speaker: 'ТРАГЕДИЯ МИХАИЛА САВЕЛЬЕВА',
              timestamp: '00:38:22',
              text: 'Утром по телефону пытались дозвониться до дома №14 — но дед так и не услышал звонка. Его собственный резонатор снова и снова сбрасывал часы на 23:59, запирая его в самом страшном часе жизни.',
            },
            {
              speaker: 'ПРОРЫВ ПЕРИМЕТРА',
              timestamp: '00:38:36',
              text: 'Чтобы разомкнуть зеркальное кольцо вокруг посёлка, включите три маяка периметра [E]: в северных дворах №04 и №03 и у самого «Москвича» на южном въезде.',
            },
          ],
        },
      },
      {
        title: 'Глава 5: Противофаза подстанции',
        objectiveSummary: 'Удерживайте 2 зоны заземления у центральной вышки и выдержите штурм теней.',
        introCutscene: {
          id: 'ch5_intro',
          chapter: 5,
          title: 'Акт V · Противофаза подстанции',
          subtitle: 'Трансформаторное кольцо · Критический резонанс · 00:50',
          image: ASSET_PATHS.cutsceneWatchman,
          beats: [
            {
              speaker: 'СИРЕНА ПОДСТАНЦИИ · 00:50',
              timestamp: '00:50:03',
              text: 'Зеркальный барьер за лесом лопнул с глухим звоном. Все тени, копившиеся в Негрузино тридцать лет, хлынули к центральной площади, чтобы защитить гудящий трансформатор.',
            },
            {
              speaker: 'ПЕТУХ ГРИША · БОЕВОЙ КЛИЧ',
              timestamp: '00:50:18',
              text: 'Гриша взмыл под проливными каплями над перекрёстком и прокричал навстречу тучам. Впереди самый тяжёлый бой — не останавливайтесь, подбирайте аптечки и выжгите петлю дотла.',
            },
            {
              speaker: 'ЗАДАЧА',
              timestamp: '00:50:31',
              text: 'Разомкните оба заземления подстанции [E] по бокам площади и отобейтесь от волны — тогда само сердце петли выйдет на свет.',
            },
          ],
        },
      },
      {
        title: 'Глава 6: Тень, которая не отпустила',
        objectiveSummary: 'Разбейте фонарь Полуночного Смотрителя на центральной площади.',
        introCutscene: {
          id: 'ch6_intro',
          chapter: 6,
          title: 'Акт VI · Тень, которая не отпустила',
          subtitle: 'Трансформаторная площадь · 00:59 · Финальный рубеж',
          image: ASSET_PATHS.cutsceneWatchman,
          beats: [
            {
              speaker: 'ПОСЛЕДНЯЯ ЗАПИСЬ МИХАИЛА САВЕЛЬЕВА',
              timestamp: '00:59:04',
              text: 'Заземления вылетели снопом синих искр. Над вышкой треснуло небо: из трансформаторного гула вышел Полуночный Смотритель — застывшая оболочка самого дедова горя, сжимающая фонарь с украденной минутой.',
            },
            {
              speaker: 'РЕШИМОСТЬ · ПРОРЫВ НА ШОССЕ',
              timestamp: '00:59:19',
              text: '«Прости, дед. Но за этой улицей — автопарк, рейс №404 и сама подстанция «Луч-94»». Разбейте фонарь Смотрителя, чтобы пробить дорогу на шоссе КПП-3!',
            },
          ],
        },
      },
      ...EXTRA_CHAPTER_META_RU,
    ],
    victoryCutscene: {
      id: 'epilogue',
      chapter: 19,
      title: 'Эпилог · 06:00 — Рассвет над Негрузино',
      subtitle: 'Ядро «Луч-94» остановлено. Все три сектора освобождены, время снова течёт вперёд.',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'ТИШИНА ПОСЛЕ ГРОЗЫ · 01:00',
          timestamp: '01:00:02',
          text: 'Фонарь Смотрителя осыпался холодными искрами, и тридцатилетний гул подстанции оборвался навсегда. За окнами деревянных и кирпичных домов мягко тикнули настенные часы, а над соснами проступила тонкая розовая полоска настоящего утра.',
        },
        {
          speaker: 'ГОЛОС ПО РАЦИИ · ПОСЛЕДНИЙ ЩЕЛЧОК',
          timestamp: '01:00:14',
          text: 'Из динамика «Москвича» на секунду донёсся чистый, спокойный вздох Михаила Савельева без единой помехи: «Спасибо, что выключил плёнку. Береги Гришу...» — и катушка мягко остановилась.',
        },
        {
          speaker: 'ПЕТУХ ГРИША · ХРАНИТЕЛЬ УТРА',
          timestamp: '01:00:26',
          text: 'Дождь стих. Гриша взлетел на тёплый капот «Москвича», расправил изумрудные перья и выдал чистое, звонкое кукареку — закрывая октябрь 1994-го, который больше никому не нужно бояться.',
        },
        {
          speaker: 'ДОРОГА В БУДУЩЕЕ',
          timestamp: '01:00:41',
          text: 'На сиденье лежит ключ от дома №14 и кассета с подписью «Отпусти». Вы гладите Гришу по гребешку, поворачиваете ключ зажигания — и впервые видите прямую дорогу на шоссе, свободную до самого горизонта.',
        },
      ],
    },
    endlessBtn: 'Бесконечная петля',
    nextLoopBtn: (nextLoop) => `Войти в Петлю #${nextLoop} (.EXE+)`,
    loopBadge: (loop) => `ПЕТЛЯ #${loop}`,
    endlessWaveTitle: (wave) => `Бесконечная петля · Волна ${wave}`,
    endlessObjective: (kills, target) =>
      `Удержите улицу: уничтожьте монстров (${kills}/${target}) и собирайте трофеи.`,
    bestRecordLine: (score, loop) => `РЕКОРД: ${score} · ЛУЧШАЯ ПЕТЛЯ: #${loop}`,
    flashlightOn: 'Фонарик ВКЛ (L)',
    flashlightOff: 'Фонарик ВЫКЛ (L)',
    headshotCallout: 'В ГОЛОВУ!',
    overclockLabel: (sec) => `РАЗГОН .EXE · ${sec}с`,
    comboLabel: (mult) => `КОМБО ×${mult}`,
    pickupAmmo: '+ПАТРОНЫ (ВСЕ СТВОЛЫ)',
    pickupMedkit: '+АПТЕЧКА (+35 ОЗ)',
    pickupOverclock: 'ЯДРО .EXE · РАЗГОН 8с!',
    metersSuffix: 'м',
    upgradeModalTitle: 'NEGRUZINO.EXE — УСТАНОВКА ПАТЧА',
    upgradeModalSubtitle: (loop) =>
      `Петля #${loop} перестраивается. Выберите 1 модуль [1–3] для усиления арсенала:`,
    upgradeKeyHint: 'Нажмите [1], [2] или [3], либо кликните по модулю',
    upgrades: {
      buckshot_overpressure: {
        file: 'BUCKSHOT_OP.DLL',
        name: 'Магнум-картечь',
        desc: '+35% урона и усиленное отбрасывание дробовика ТОЗ-194.',
        tag: 'ДРОБОВИК',
      },
      awp_fastbolt: {
        file: 'AWP_BOLT94.DLL',
        name: 'Смазанный затвор AWP',
        desc: 'Перезарядка AWP быстрее на 35%, +40% крит-урона в голову.',
        tag: 'AWP',
      },
      rotary_coolant: {
        file: 'GSHG_COOL.SYS',
        name: 'Охлаждение стволов',
        desc: 'Миниган раскручивается в 2 раза быстрее и +50 патронов в коробе.',
        tag: 'МИНИГАН',
      },
      petya_blessing: {
        file: 'GRISHA_GUARD.EXE',
        name: 'Благословение Гриши',
        desc: 'Поглаживание [F] лечит +24 ОЗ в 2 раза чаще, Гриша чует врагов дальше.',
        tag: 'КОМПАНЬОН',
      },
      vampiric_loop: {
        file: 'BLOOD_LOOP.SYS',
        name: 'Вампиризм петли',
        desc: 'Каждое убийство монстра восстанавливает +8 ОЗ и заряд выносливости.',
        tag: 'ВЫЖИВАНИЕ',
      },
      adrenaline_sprint: {
        file: 'ADRENALINE.DLL',
        name: 'Ночной адреналин',
        desc: '+22% к скорости бега и ускоренное восстановление выносливости.',
        tag: 'МОБИЛЬНОСТЬ',
      },
      hollowpoint_smg: {
        file: 'HOLLOW_P90.DLL',
        name: 'Экспансивные пули',
        desc: '+30% урона для P90 и DE-50, мгновенное пополнение боезапаса.',
        tag: 'P90 / DE-50',
      },
    },
    p90AutoReloadHint: 'АВТОПЕРЕЗАРЯДКА · [R] ВРУЧНУЮ',
    roosterNameLabel: 'Имя петуха',
    roosterNameDesc: 'Выберите кличку спутника — обновится в интерфейсе, диалогах и кат-сценах.',
    roosterGrisha: 'Гриша',
    roosterVanya: 'Ваня',
    exportHeading: 'Скачать копию игры (HTML и .EXE)',
    exportDesc:
      'Офлайн HTML-версия запускается двойным кликом в любом браузере без интернета. Архив Electron содержит десктопный движок и скрипт build-exe.bat для сборки NEGRUZINO.exe на Windows.',
    downloadHtmlBtn: 'Скачать NEGRUZINO.html',
    downloadDesktopBtn: 'Скачать .EXE движок (ZIP)',
    difficultyLabel: 'Сложность',
    difficulties: {
      easy: {
        label: 'Лёгкая',
        hint: 'Больше здоровья, мягкий урон, передышка вне боя до 75 ОЗ',
      },
      normal: {
        label: 'Обычная',
        hint: 'Честный баланс хоррора и перестрелок, передышка до 55 ОЗ',
      },
      hard: {
        label: 'Кошмар',
        hint: 'Без автолечения, злее монстры, ×1.4 к очкам',
      },
    },
    sensitivityLabel: 'Чувствительность мыши',
    cutsceneKeyHint: '[Enter / Пробел] Далее · [Esc] Пропустить',
    storyLogs: {
      ch1_start: {
        speaker: 'РАЦИЯ · 23:59',
        text: '«Москвич» заглох у дома №14. Расстреляйте 2 аномальных узла у щитков и ищите янтарные кассеты деда по дворам.',
      },
      ch1_fuse_1: {
        speaker: 'ДНЕВНИК САВЕЛЬЕВА · ЩИТОК №14',
        text: '«14.10.1994. Резонатор зацепил 23:59, но съедает живую память. Единственный якорь реальности — Гриша».',
      },
      ch1_fuse_2: {
        speaker: 'РАДИОПЕРЕХВАТ · ДОМ №11',
        text: 'Уличная сеть ожила! В дворах №12 и №07 загудели ретрансляторы — на них записан сигнал рейса №404.',
      },
      ch2_start: {
        speaker: 'КАССЕТА №02 · МИХАИЛ САВЕЛЬЕВ',
        text: '«Я боялся завтрашнего дня и запер всех в дожде. Удерживай зоны синхронизации во дворах №12 и №07!»',
      },
      ch2_relay_1: {
        speaker: 'РЕТРАНСЛЯТОР А · ДВОР №12',
        text: 'Сквозь треск плёнки слышен шум автовокзала и гудок автобуса №404 — помехи начинают расходиться.',
      },
      ch2_relay_2: {
        speaker: 'РЕТРАНСЛЯТОР Б · ДВОР №07',
        text: 'Сигнал вывел на глухой квартал! У домов №08 и №15 погасли фонари — там спрятаны стабилизаторы фазы.',
      },
      ch3_start: {
        speaker: 'СОСЕД · ДОМ №08 · 00:24',
        text: '«Свет погас по обе стороны! Включай фонарик [L] и активируй ЭМИ-стабилизаторы во дворах №08 и №15!»',
      },
      ch3_stab_1: {
        speaker: 'СТАБИЛИЗАТОР №08',
        text: 'Частота пошла вверх — в эфире прорвался голос диспетчера: «Рейс 404 остановлен на КПП-3, все живы...»',
      },
      ch3_stab_2: {
        speaker: 'СТАБИЛИЗАТОР №15',
        text: 'Обе фазы выровнены! Осталось разбить глушилки периметра у северных домов и южного въезда.',
      },
      ch4_start: {
        speaker: 'ДИСПЕТЧЕРСКАЯ · 00:38',
        text: 'Автобус уцелел в ту ночь! Расстреляйте 3 маяка-глушилки во дворах №04, №03 и у «Москвича».',
      },
      ch4_beacon_1: {
        speaker: 'МАЯК №04 · СЕВЕРНЫЙ РУБЕЖ',
        text: 'За соснами на миг мелькнули настоящие звёзды — магнитный купол начинает трещать по швам.',
      },
      ch4_beacon_2: {
        speaker: 'МАЯК №03 · ВОСТОЧНЫЙ РУБЕЖ',
        text: 'Вторая дуга пробита! Остался последний маяк на южном шоссе рядом с вашим «Москвичом».',
      },
      ch4_beacon_3: {
        speaker: 'ДОРОЖНОЕ ЗЕРКАЛО · ШОССЕ',
        text: 'Периметр пал! Все тени стягиваются к центральной площади — готовьтесь к штурму подстанции!',
      },
      ch5_start: {
        speaker: 'ПОДСТАНЦИЯ · 00:50',
        text: 'Критический резонанс! Удерживайте обе зоны заземления по бокам площади под натиском теней.',
      },
      ch5_core_1: {
        speaker: 'ЗАЗЕМЛЕНИЕ ЗАПАД',
        text: 'Искры ударили по лужам! Трансформатор завыл на октаву ниже — осталась восточная шина.',
      },
      ch5_core_2: {
        speaker: 'ЗАЗЕМЛЕНИЕ ВОСТОК',
        text: 'Обе шины сорваны! Дождь над площадью замер в воздухе — сам Смотритель сходит с вышки.',
      },
      boss_arrival: {
        speaker: 'ТРАНСФОРМАТОР · 00:59',
        text: 'Полуночный Смотритель вышел на площадь! Разбейте его фонарь и откройте путь на шоссе!',
      },
      ...EXTRA_STORY_LOGS_RU,
    },
    storyTapes: {
      tape_01: {
        code: 'МК-60 #01',
        title: 'Последний поворот',
        location: 'У «Москвича» на въезде',
        speaker: 'ВОДИТЕЛЬ «МОСКВИЧА» · 1994',
        text: '«Стрелка часов на приборке снова прыгнула с 23:59:59 на 23:59:00. Дворники скребут по стеклу, а у дома №14 горит один-единственный жёлтый свет».',
      },
      tape_02: {
        code: 'МК-60 #02',
        title: 'Схема LOOP_00',
        location: 'Крыльцо дома №14',
        speaker: 'МИХАИЛ САВЕЛЬЕВ · 14.10.1994',
        text: '«Если замкнуть катушечный генератор через понижающий трансформатор, время в радиусе ста метров вязнет, как сырая плёнка. Мне нужен всего час, пока не придёт автобус».',
      },
      tape_03: {
        code: 'МК-60 #03',
        title: 'Почему Гриша не замер',
        location: 'Угол двора №11',
        speaker: 'МИХАИЛ САВЕЛЬЕВ · ПОВТОР #17',
        text: '«Часы стоят, соседи повторяют одни и те же шаги, и только петух Гриша ходит свободно. Наверное, потому что он ждёт рассвета, а не вчерашнего вечера».',
      },
      tape_04: {
        code: 'МК-60 #04',
        title: 'Шёпот из-за штакетника',
        location: 'Тёмный двор дома №08',
        speaker: 'СОСЕД ВАСИЛИЙ · ДОМ №08',
        text: '«С каждым откатом плёнка трётся. Сначала пропали лица на фото, потом люди за заборами стали вытягиваться в тени. Не слушай их крик — это просто испорченная дорожка».',
      },
      tape_05: {
        code: 'МК-60 #05',
        title: 'Звонок с КПП-3',
        location: 'Северный двор дома №03',
        speaker: 'ДИСПЕТЧЕР АВТОПАРКА · 06:15',
        text: '«Алло, Негрузино? Передайте Савельеву: рейс №404 переждал ливень на КПП-3, все пассажиры целы и пьют горячий чай. Почему у вас постоянно занято?..»',
      },
      tape_06: {
        code: 'МК-60 #06',
        title: 'Кассета «Отпусти»',
        location: 'Подножие центральной вышки',
        speaker: 'МИХАИЛ САВЕЛЬЕВ · ПОСЛЕДНЯЯ ЗАПИСЬ',
        text: '«Если ты добрался до вышки, внук — значит, я сам уже стал частью этой тени. Не жалей её. Разбей фонарь на площади и выведи Гришу на солнце».',
      },
      ...EXTRA_STORY_TAPES_RU,
    },
    tapeArchiveHeading: 'Найденные кассеты МК-60 (Досье сюжета)',
    tapeLockedHint: 'Не найдена — обыщите дворы, автопарк и подстанцию по янтарному свечению кассет.',
    tapeCollectPrompt: (title) => `[E] Подобрать кассету: «${title}»`,
    tapeCollectedToast: (title, found, total) => `КАССЕТА ${found}/${total}: «${title}»`,
    tapesCounterLabel: 'КАССЕТЫ',
    lanCoopBtn: 'LAN Кооп',
    lanCoop: {
      title: 'LAN Кооператив · 1994',
      subtitle: 'Играйте вместе по локальной сети (Wi-Fi / Ethernet) до 4 выживших в одном хабе и кампании',
      callsignLabel: 'Ваш позывной',
      serverAddrLabel: 'Адрес LAN-сервера (пусто = этот хост)',
      serverAddrPlaceholder: 'например 192.168.1.42:3000',
      connectBtn: 'Подключиться',
      refreshBtn: 'Обновить',
      createRoomBtn: 'Создать LAN-комнату',
      joinRoomBtn: 'Войти по коду',
      roomCodePlaceholder: 'КОД (напр. 7K4P)',
      openRoomsHeading: 'Открытые комнаты в сети',
      noOpenRooms: 'В локальной сети пока нет открытых комнат — создайте первую!',
      yourLanHeading: 'Адрес для друзей в вашей Wi-Fi / LAN сети',
      copyCodeBtn: 'Копировать код',
      copiedBadge: 'Скопировано!',
      readyBtn: 'Готов к выходу',
      unreadyBtn: 'Отменить готовность',
      startMatchBtn: 'В 3D-хаб подготовки',
      enterHubBtn: 'Войти в 3D-хаб',
      hubRuleHint: 'Сначала отряд попадёт в светлый гаражный хаб со стрельбищем и стендом ТТХ. Матч начнётся, когда ВСЕ игроки сядут в «Москвич».',
      leaveRoomBtn: 'Выйти из комнаты',
      hostTag: 'ХОСТ',
      readyTag: 'ГОТОВ',
      waitingTag: 'ЖДЁТ',
      statusConnected: 'Подключено к LAN',
      statusConnecting: 'Подключение...',
      statusOffline: 'Нет связи с сервером',
      squadHeading: 'ОТРЯД LAN',
      revivePrompt: (name) => `[E] Поднять напарника: ${name}`,
      downedBanner: 'ВЫ РАНЕНЫ · НАПАРНИК МОЖЕТ ПОДНЯТЬ ВАС [E]',
      pingHint: '[G] Метка отряду',
      pingSentLabel: 'МЕТКА НАПАРНИКА',
      scalingBadge: (players, hpMult, dmgMult) => `КООП ×${players} · ОЗ ${hpMult} · УРОН ${dmgMult}`,
    },
    zoneNames: ZONE_NAMES.ru,
    hub: {
      title: 'ГАРАЖ САВЕЛЬЕВЫХ · ХАБ ПОДГОТОВКИ',
      subtitle: 'Безопасная зона · 1994 · Проверьте оружие на тире, изучите ТТХ и садитесь в «Москвич»',
      freeExploreHint: 'Свободное перемещение · Бесконечный запас патронов в тире · Стреляйте по манекенам для проверки отдачи',
      moskvitchBoardPrompt: '[E] Сесть в «Москвич-412» (готов к выезду)',
      moskvitchLeavePrompt: '[E] Выйти из «Москвича»',
      moskvitchBoardBtn: 'Сесть в «Москвич»',
      moskvitchLeaveBtn: 'Выйти из машины',
      moskvitchCounter: (boarded, total) => `В «Москвиче»: ${boarded}/${total}`,
      moskvitchWaiting: (missing) => `Ожидание отряда — осталось сесть: ${missing}`,
      moskvitchLaunching: 'Все на борту! Заводим «Москвич» — выезд в Негрузино...',
      terminalPrompt: '[E] Открыть стенд ТТХ оружия и врагов',
      terminalBtn: 'Стенд ТТХ',
      rangeHint: 'Полигон: 5 AFK-манекенов (10м–22м) · Попадания показывают урон и крит в голову',
      rangeHitReadout: (dummy, dmg, dist, crit, destroyed) =>
        `${dummy} (${dist}м): −${dmg} ОЗ${crit ? ' · КРИТ!' : ''}${destroyed ? ' · УНИЧТОЖЕН (респ. 2.5с)' : ''}`,
      rangeDummyNames: {
        crawler: 'Манекен «Тварь»',
        lampshade: 'Манекен «Тень»',
        screamer: 'Манекен «Скример»',
        heavy: 'Бронированный манекен',
      },
      enterHubBtn: 'В хаб подготовки',
      quickStartBtn: 'Сразу в Главу 1',
      ammoInfiniteBadge: 'ТИР · ПАТРОНЫ ∞',
      zoneTransitionBanner: (zoneName) => `ПЕРЕХОД В ЛОКАЦИЮ: ${zoneName}`,
    },
    specsModal: {
      title: 'СТЕНД АРСЕНАЛА И ТАКТИКИ · 1994',
      subtitle: 'Точные ТТХ всех 5 стволов, модулей усиления, бестиарий и формулы кооперативного баланса',
      closeBtn: 'Закрыть стенд',
      tabWeapons: 'Оружие (5)',
      tabUpgrades: 'Патчи .EXE',
      tabEnemies: 'Враги и Гриша',
      tabCoop: 'Баланс Коопа',
      statDamage: 'Урон',
      statPellets: 'Дробины',
      statRpm: 'Темп/мин',
      statMag: 'Магазин / Запас',
      statReload: 'Перезарядка',
      statRange: 'Дистанция',
      statSpecial: 'Особенность',
      secSuffix: 'с',
      enemyHpLabel: 'Прочность',
      enemySpeedLabel: 'Скорость',
      enemyThreatLabel: 'Тактика и контрмеры',
      enemyProfiles: [
        {
          kind: 'crawler',
          hp: '78 ОЗ',
          speed: 'Быстрый (5.0 м/с)',
          behavior: 'Рывками заходит с флангов, ускоряется вблизи.',
          counter: 'ТОЗ-194 в упор или очередь P90 по корпусу.',
        },
        {
          kind: 'lampshade',
          hp: '115 ОЗ',
          speed: 'Средний (4.0 м/с)',
          behavior: 'Скрывается у фонарей, держит дугу обхода и наносит тяжёлый удар.',
          counter: 'Хедшот из DE-50 / AWP сбивает замах.',
        },
        {
          kind: 'screamer',
          hp: '92 ОЗ',
          speed: 'Резкий (4.6 м/с)',
          behavior: 'Выскакивает из-за укрытий и провоцирует звуковой скример в упор.',
          counter: 'Слушайте предупреждение Гриши и сбивайте до сближения.',
        },
        {
          kind: 'watchman',
          hp: '780–1150 ОЗ (Босс)',
          speed: 'Уверенный (3.8 м/с)',
          behavior: 'Босс конца каждого акта (Гл. 6, 12, 18). Запускает тёмные волны и таранные выпады.',
          counter: 'Держите дистанцию, бейте AWP в фонарь/голову или заливайте миниганом ГШГ-6.',
        },
      ],
      roosterCardTitle: 'Спутник Гриша (Вестник рассвета)',
      roosterCardDesc:
        'Гриша летает рядом, заранее кукарекает о направлении и дистанции ближайшей угрозы и никогда не лезет на линию огня. Погладьте его [F], чтобы восстановить здоровье и сбить панику.',
      coopIntro:
        'Сложность динамически пересчитывается в реальном времени при входе или выходе любого игрока (1–4 выживших):',
      coopColPlayers: 'Отряд',
      coopColHp: 'ОЗ врагов',
      coopColDmg: 'Урон врагов',
      coopColSpeed: 'Скорость',
      coopColCaps: 'Лимит / Спавн',
      coopColKills: 'Цели главы',
      coopColLoot: 'Дроп / Патроны',
      coopRulesNote:
        'Пропуск сюжетных кат-сцен в коопе работает по единогласному голосованию (X/Y). При выходе игрока кворум хаба и кат-сцен автоматически пересчитывается без зависаний.',
    },
    cutsceneVote: {
      voteBtn: 'Голосовать за пропуск',
      votedBtn: 'Голос за пропуск принят',
      counter: (votes, total) => `Пропуск катсцены: ${votes}/${total}`,
      waitingHint: 'Катсцена пропустится, когда проголосуют все игроки отряда',
    },
    characterRanks: [
      'Гость на трассе',
      'Свидетель 1994',
      'Хранитель рации',
      'Разрушитель петли',
      'Несущий рассвет',
    ],
    levelShort: 'УР.',
    levelUpBanner: (level, rank) => `НОВЫЙ РАНГ · УР. ${level} — ${rank}`,
    nextTrackBtn: 'Сменить трек (N)',
    trackToastPrefix: 'КАССЕТА',
    hudEditorTitle: 'Сенсорное управление',
    hudEditorDesc: 'Перетаскивайте кнопки и джойстик на удобные места и настраивайте их размер отдельно для вертикального и горизонтального экрана.',
    hudEditorOpenBtn: 'Настроить кнопки на экране',
    hudEditorSave: 'Сохранить',
    hudEditorReset: 'Сбросить',
    hudEditorCancel: 'Отмена',
    hudEditorScale: 'Размер',
    hudEditorHint: 'Перетащите элемент пальцем, чтобы переместить его',
    hudControlNames: {
      joystick: 'Джойстик',
      fire: 'Огонь',
      reload: 'Перезарядка',
      jump: 'Прыжок',
      interact: 'Взаимодействие',
      pat: 'Погладить',
      flashlight: 'Фонарик',
      scope: 'Прицел',
      weapons: 'Оружие',
    },
    audioUploading: 'Загрузка трека в память…',
    audioUploadError: 'Не удалось прочитать аудиофайл. Проверьте формат (MP3, WAV, OGG, M4A) и размер до 48 МБ.',
  },

  en: {
    pageTitle: 'NEGRUZINO.EXE: Midnight Loop',
    brandTitle: 'NEGRUZINO',
    brandSubtitle: 'MIDNIGHT LOOP · 1994 · EXE',
    titleDescription:
      'October 1994. Radio engineer Mikhail Saveliev wired Negruzino’s substation to freeze 23:59 forever out of grief. Return to House #14, uncover the magnetic tapes, grow stronger through the storm, and guide Grisha into dawn.',
    playStory: 'Start Story',
    jumpIntoStreet: 'Quick Play',
    musicAndTextures: 'Audio & Look',
    settingsBtn: 'Settings',
    controlsHint:
      'WASD Move · Mouse / Arrows Aim · LMB Shoot · RMB Scope · 1-5 Weapons · N Music · L Flashlight · F Pat · E Fuse · Esc Pause',
    muteAudio: 'Mute audio (M)',
    unmuteAudio: 'Unmute audio (M)',
    pauseGame: 'Pause game (P)',
    openStudio: 'Open Audio, Graphics and Settings',
    skipCutscene: 'Skip Cutscene',
    continueBtn: 'Continue',
    enterNegruzino: 'Enter Negruzino',
    vitality: 'VITALITY',
    kills: 'KILLS',
    score: 'SCORE',
    reloading: 'RELOADING...',
    reloadHint: '[R] RELOAD',
    scopeReloadHint: '[RMB] SCOPE · [R] RELOAD',
    spinLabel: 'SPIN',
    awpScopeBanner: 'AWP-96 OPTIC · 3.2× · [RMB] EXIT',
    pointerLockHint:
      'Click street for Mouse Look · Arrow Keys also steer · [F] Pat Grisha',
    petyaName: 'GRISHA',
    patsLabel: 'PATS',
    patButton: '[F] PAT',
    patAria: 'Pat Grisha the Rooster (F)',
    roosterHopping: 'Hopping by your side',
    roosterFlying: 'Flying around you',
    roosterAlerting: 'Crowing danger warning!',
    roosterHappyHeal: (hp) => `Happy clucks! +${hp} HP`,
    roosterHappyCluck: 'Grisha clucks joyfully!',
    roosterAlertPrefix: 'Grisha crows:',
    dirBehind: 'BEHIND YOU',
    dirAhead: 'AHEAD',
    dirRight: 'TO YOUR RIGHT',
    dirLeft: 'TO YOUR LEFT',
    enemyNames: {
      crawler: 'ENTITY',
      lampshade: 'SHADE',
      screamer: 'SCREAMER',
      watchman: 'WATCHMAN',
    },
    bossName: 'THE MIDNIGHT WATCHMAN',
    bossObjective: 'Defeat The Midnight Watchman in the Central Square',
    objectiveProgress: (summary, done, total, kills, targetKills) =>
      `${summary} (${done}/${total} nodes · ${kills}/${targetKills} targets)`,
    clearRemainingEntities: (kills, targetKills) =>
      `Clear remaining entities (${kills}/${targetKills})`,
    restorePrompt: (label) => `[E] Restore ${label}`,
    screamerCaptions: {
      fence: 'IT FOUND YOU BEHIND THE FENCE',
      hollow: 'HOLLOW SCREAMER SHRIEK',
      watchman: 'THE WATCHMAN CLAIMS MIDNIGHT',
      fog: 'SHADOW RIGHT BEHIND YOU',
      preview: 'NEGRUZINO SEES YOU',
    },
    controlsHeading: 'Controls & Mouse Side Buttons',
    controlsDesc:
      'Click any action and press a keyboard key or mouse side button (M4 / M5). Browser Back/Forward navigation is automatically prevented.',
    controlsListening: 'Press a key or M4/M5...',
    controlsResetBtn: 'Reset Defaults',
    controlsSideMouseHint: 'Supports keyboard keys, LMB/RMB/MMB, and mouse side buttons M4 & M5',
    bindActions: {
      reload: 'Reload',
      interact: 'Interact (Fuse Box / Relay)',
      patRooster: 'Pat Grisha',
      flashlight: 'Flashlight',
      scope: 'Optical Scope (AWP)',
      nextTrack: 'Next Cassette Track',
      nextWeapon: 'Cycle Weapon',
      jump: 'Jump',
      sprint: 'Sprint (hold)',
    },
    mobileRotateTitle: 'Rotate Phone to Landscape',
    mobileRotateDesc:
      'For wide midnight visibility and comfortable dual-thumb aiming, Negruzino is designed for horizontal landscape play.',
    mobileRotateBtn: 'Switch to Landscape Mode',
    mobilePlayAnyway: 'Continue in Portrait',
    mobileFire: 'FIRE',
    mobileScope: 'Scope',
    mobileReload: 'Reload',
    mobileInteract: 'Activate',
    mobileInteractLabels: {
      objective: 'Panel',
      tape: 'Tape',
      revive: 'Revive',
      hubCarBoard: 'Board Car',
      hubCarLeave: 'Exit Car',
      hubSpecs: 'Specs',
    },
    mobilePat: 'Pat',
    mobileJump: 'Jump',
    mobileFlash: 'Light',
    graphicsQualityLabel: 'Graphics & Power Mode',
    graphicsModes: {
      eco: {
        label: 'Eco (Battery)',
        hint: '36 FPS cap, direct shading without heavy bloom passes — minimizes battery drain & heat.',
      },
      balanced: {
        label: 'Balanced',
        hint: '60 FPS cap, tuned shadows & lightweight post-processing for smooth everyday play.',
      },
      high: {
        label: 'High',
        hint: '60 FPS, 2048px shadows, 4x MSAA bloom & dynamic flashlight shadows.',
      },
    },
    pauseHeading: 'Paused',
    pauseSubcopy: 'The streetlamps hold still while you catch your breath.',
    victoryHeading: 'Dawn Over Negruzino',
    victorySubcopy: 'You shattered the Watchman lantern and walked out with Grisha.',
    gameoverHeading: 'Claimed By Midnight',
    gameoverSubcopy: 'The midnight loop reset at House #14. Reload and try again.',
    statTime: 'Time',
    statEntities: 'Kills',
    statPats: 'Grisha Pats',
    languageLabel: 'Language / Язык',
    screamerIntensityLabel: 'Screamer Intensity',
    screamerFull: 'Full',
    screamerReduced: 'Reduced',
    resumeGame: 'Resume',
    playAgain: 'Play Again',
    tryAgain: 'Try Again',
    restartRun: 'Restart Run',
    titleScreen: 'Title Screen',
    returnToTitle: 'Return to Title Screen',
    studioTitle: 'NEGRUZINO.EXE Settings',
    studioSubtitle: 'Language, rooster name, soundtrack, surface look, and offline exports',
    closeStudio: 'Close settings',
    tabMusic: 'Soundtrack',
    tabTextures: 'Materials',
    tabStorySettings: 'Settings & Files',
    originalSoundtracks: 'Cassette Tape Recordings',
    tempoBpm: 'TEMPO (BPM)',
    fogDrone: 'FOG DRONE DEPTH',
    tapeWarble: 'TAPE FLUTTER',
    musicVolume: 'MUSIC VOLUME',
    customFileActive: (name) => `Playing your track: ${name}`,
    uploadAudioHint: 'Import one or multiple MP3 / WAV / OGG files — saved persistently across reloads',
    restoreSynth: 'Back to Built-in Tracks',
    loadAudioFile: 'Add MP3 / OGG / WAV',
    cassetteDeckHeading: '1994 Cassette Deck — Real Audio Tracks (MP3 / OGG / WAV)',
    cassetteDeckNote:
      'Due to copyright, original studio recordings of Bagrovy Fantomas cannot be bundled directly. Drop your MP3 files here — they persist in browser storage, auto-advance, and cycle live with [N].',
    cassetteAddFiles: 'Select MP3 Files (Multi-Select)',
    cassetteEmpty: 'Tape deck empty — add your real MP3 tracks to play during combat.',
    cassettePlayingTag: 'PLAYING',
    cassetteClearAll: 'Clear Tape',
    cassetteRemoveTrack: (name) => `Remove track ${name}`,
    cassetteTracksLoaded: (count) => `Saved on cassette: ${count} track(s). Press [N] in-game to skip.`,
    texturePacksHeading: 'Neighborhood Look Presets',
    surfaceBuilderHeading: 'Surface Material Override',
    surfaceSlots: {
      house: 'Houses',
      fence: 'Fences',
      road: 'Roads',
      lawn: 'Lawns',
    },
    patternLabel: 'Pattern',
    patterns: {
      stucco_brick: 'Stucco & Exposed Brick',
      timber_planks: 'Weathered Timber Planks',
      cracked_asphalt: 'Cracked Wet Asphalt',
      concrete_panels: 'Soviet Concrete Panels',
      night_grass: 'Overgrown Night Grass',
      anomaly_grid: 'Corrupted Signal Grid',
    },
    baseColorLabel: 'Base Color',
    accentColorLabel: 'Weathering Accent',
    grimeLabel: 'GRIME',
    wearLabel: 'CRACKS / WEAR',
    applyToSurface: (slot) => `Apply to ${slot}s`,
    uploadImageTexture: 'Upload Image Texture',
    languageSettingsHeading: 'Interface Language / Язык интерфейса',
    languageSettingsDesc:
      'Switch language anytime — all cutscenes, HUD labels, and Grisha alerts update immediately.',
    cutsceneArchiveHeading: 'Story Cutscenes Archive',
    testScreamer: 'Test Screamer',
    arsenalGuideHeading: 'Arsenal Field Guide',
    msgNowPlaying: (name) => `Now playing "${name}".`,
    msgLoadedAudio: (name) => `Playing custom soundtrack "${name}".`,
    msgAppliedPack: (name) => `Applied "${name}" look preset.`,
    msgAppliedCustom: (pattern, slot) => `Applied "${pattern}" material to ${slot}.`,
    msgAppliedUpload: (file, slot) => `Applied "${file}" onto ${slot} surfaces.`,
    msgUploadError: 'Could not load that image file. Try a PNG or JPG.',
    weapons: {
      shotgun: {
        name: 'TOZ-194 Shotgun',
        shortName: 'SHOTGUN',
        role: 'Close 1-Tap Buckshot',
      },
      awp: {
        name: 'AWP-96 Sniper',
        shortName: 'AWP',
        role: 'Long-Range · Optical Scope',
      },
      pistol: {
        name: 'DE-50 High-Caliber',
        shortName: 'PISTOL',
        role: 'Heavy Semi-Auto Sidearm',
      },
      minigun: {
        name: 'GShG-6 Rotary Minigun',
        shortName: 'MINIGUN',
        role: 'Spinning 6-Barrel Hailstorm',
      },
      p90: {
        name: 'P90-N Tactical PDW',
        shortName: 'P90',
        role: 'Auto-Reload · 50-Round Mag',
      },
    },
    musicTracks: {
      telepath_mole: {
        name: 'Telepath Mole (Psych-Rock)',
        mood: 'Fuzz guitar, punchy garage groove & surreal underground rock energy',
      },
      nikogda_nihrena: {
        name: 'Nikogda Nihrena (Punk Rock)',
        mood: 'Raw garage overdrive, driving drums & defiant midnight riffs',
      },
      oruzhenosets_bike: {
        name: 'Squire / Bike (Biker Rock)',
        mood: 'Galloping highway rock rhythm & roaring overdrive guitars',
      },
      electric_giraffe: {
        name: 'Electric Giraffe (Synth-Rock)',
        mood: 'Bouncy disco-rock groove, glowing keys & substation sparks',
      },
      merchant_dream: {
        name: 'Merchant’s Dream (Art-Rock)',
        mood: 'Hypnotic waltz, shimmering strings & warm vintage distortion',
      },
      you_know_metal: {
        name: 'You Know (Heavy Metal)',
        mood: 'Double-kick drums, steel power chords & shredding boss lead',
      },
      moonlight_sonata: {
        name: 'Moonlight 1994 (Classical)',
        mood: 'Chamber harpsichord & haunting strings in midnight rain',
      },
      midnight_fog: {
        name: 'Negruzino 00:00 (Post-Punk)',
        mood: 'Cold post-punk bassline & sodium-lamp hum',
      },
      watchman_dread: {
        name: 'Watchman Bell (Doom Metal)',
        mood: 'Crushing doom riff & substation iron bell',
      },
    },
    texturePacks: {
      classic_1994: {
        name: 'Negruzino 1994 (Default)',
        description: 'Peeling stucco, Soviet timber siding, red brick, damp grass & wet tarmac',
      },
      rusted_iron: {
        name: 'Rusted Industrial',
        description: 'Corrugated rust fences, concrete panels, oil-slicked road',
      },
      frost_loop: {
        name: 'November Frost 1994',
        description: 'Hoarfrost lawns, pale limewashed cottages, icy tarmac',
      },
      blood_anomaly: {
        name: 'NEGRUZINO.EXE (Corrupted)',
        description: 'Cracked dark concrete with crimson rust and signal interference',
      },
    },
    objectiveLabels: {
      ch1_fuse_1: 'Fuse Box #14 (West Yard)',
      ch1_fuse_2: 'Fuse Box #11 (East Porch)',
      ch2_relay_1: 'Signal Relay A (Yard #12)',
      ch2_relay_2: 'Signal Relay B (Yard #07)',
      ch3_stab_1: 'Phase Stabilizer #08 (Dark Yard)',
      ch3_stab_2: 'Phase Stabilizer #15 (East Garden)',
      ch4_beacon_1: 'Perimeter Beacon NW (Yard #04)',
      ch4_beacon_2: 'Perimeter Beacon NE (Yard #03)',
      ch4_beacon_3: 'Highway Mirror Beacon (South Road)',
      ch5_core_1: 'Substation Ground Coupling (West)',
      ch5_core_2: 'Substation Ground Coupling (East)',
      ...EXTRA_OBJECTIVE_LABELS_EN,
    },
    chapterMeta: [
      {
        title: 'Chapter 1: Magnetic Midnight',
        objectiveSummary: 'Shoot & shatter 2 anomaly fuse cores and survive the first ambush.',
        introCutscene: {
          id: 'ch1_intro',
          chapter: 1,
          title: 'Act I · Magnetic Midnight',
          subtitle: 'NEGRUZINO Suburb · October 14, 1994 · 23:59',
          image: ASSET_PATHS.cutsceneStreet,
          beats: [
            {
              speaker: 'TELEGRAM · MIKHAIL SAVELIEV',
              timestamp: '23:59:04',
              text: '“If you are reading this, my substation resonator ran away. I tried to hold onto the night until Bus #404 returned—and locked the whole village in 23:59. Take the keys at House #14 and never leave Grisha behind.” Your Moskvitch stalls in the rain-slicked road.',
            },
            {
              speaker: 'GRISHA · HERALD OF DAWN',
              timestamp: '23:59:18',
              text: 'Only Grandfather’s red-crested rooster Grisha still breathes outside the tape loop—the one creature whose crow calls the morning. He stays clear of your sights, cries before shadows strike, and steadies your heart when patted [F].',
            },
            {
              speaker: 'INNER MONOLOGUE',
              timestamp: '23:59:31',
              text: 'Your hands still tremble around the TOZ-194 from the trunk, yet the highway behind has folded into a loop. Restore two Fuse Boxes [E] and gather Grandfather’s glowing MK-60 cassette tapes scattered across the yards.',
            },
          ],
        },
      },
      {
        title: 'Chapter 2: Saveliev’s Tapes',
        objectiveSummary: 'Hold 2 signal relay zones in Yards #12 & #07 against incoming waves.',
        introCutscene: {
          id: 'ch2_intro',
          chapter: 2,
          title: 'Act II · Saveliev’s Tapes',
          subtitle: 'Magnetic Tape Archive · Sync Drift 00:11',
          image: ASSET_PATHS.cutsceneWatchman,
          beats: [
            {
              speaker: 'TAPE #02 · ENGINEER’S LOG',
              timestamp: '00:11:05',
              text: 'Power snaps back and Grandfather’s voice cuts through the car radio: “When the October storm washed out the highway and Bus #404 never arrived, I wired LOOP_00 into the transformer. I only wanted to rewind one single hour...”',
            },
            {
              speaker: 'REVELATION · ECHOES IN THE RAIN',
              timestamp: '00:11:19',
              text: '“Instead, the magnetic tape began to rot. The creatures in the grass and the Shades beneath the lamps are torn imprints of dread recorded over themselves a hundred times.”',
            },
            {
              speaker: 'BREAKOUT PLAN',
              timestamp: '00:11:34',
              text: 'Tune the courtyard Signal Relays [E] in Yards #12 and #07 to pull a clean dispatch channel out of the static.',
            },
          ],
        },
      },
      {
        title: 'Chapter 3: The Blind Quarter',
        objectiveSummary: 'Push into dark Yards #08 & #15 and trigger 2 EMP Phase Stabilizers.',
        introCutscene: {
          id: 'ch3_intro',
          chapter: 3,
          title: 'Act III · The Blind Quarter',
          subtitle: 'Houses #08 & #15 · Blackout Sector · 00:24',
          image: ASSET_PATHS.cutsceneStreet,
          beats: [
            {
              speaker: 'INTERCEPT · NEIGHBOR AT HOUSE #08',
              timestamp: '00:24:03',
              text: 'A shaken neighbor breaks over the tuned relay: “Mikhail, kill the transformer! Headlights are glowing beyond the northern pines—they can’t reach us while the street keeps looping!”',
            },
            {
              speaker: 'SECTOR BLACKOUT',
              timestamp: '00:24:18',
              text: 'The streetlamps beside Houses #08 and #15 gutter out. Shades now flank through the open picket gates while Hollow Screamers stalk the dark yards.',
            },
            {
              speaker: 'OBJECTIVE BRIEF',
              timestamp: '00:24:30',
              text: 'Flip on your flashlight [L], clear Yards #08 and #15, and reboot both Phase Stabilizers [E] before the blackout seals off the square.',
            },
          ],
        },
      },
      {
        title: 'Chapter 4: Route 404',
        objectiveSummary: 'Shoot & destroy 3 perimeter jammer cores across the northern yards & south road.',
        introCutscene: {
          id: 'ch4_intro',
          chapter: 4,
          title: 'Act IV · Route 404',
          subtitle: 'Northern Barrier · The Bus That Survived · 00:38',
          image: ASSET_PATHS.cutsceneWatchman,
          beats: [
            {
              speaker: 'DISPATCH ARCHIVE · FULL PLAYBACK',
              timestamp: '00:38:08',
              text: 'The stabilizers clear the last layer of hiss—and the truth hits hard: Bus #404 never crashed. Highway patrol held it safely at Checkpoint 3 ten kilometers away until morning.',
            },
            {
              speaker: 'MIKHAIL’S TRAGEDY',
              timestamp: '00:38:22',
              text: 'They tried calling House #14 at dawn—yet Grandfather never heard the phone ring. His own resonator kept snapping the clock back to 23:59, trapping him in his worst hour.',
            },
            {
              speaker: 'BREAK THE PERIMETER',
              timestamp: '00:38:36',
              text: 'Activate all three Perimeter Beacons [E]—in Yards #04 and #03, and beside the stalled Moskvitch on the south road—to shatter the mirror boundary.',
            },
          ],
        },
      },
      {
        title: 'Chapter 5: Counter-Phase',
        objectiveSummary: 'Hold 2 Substation Grounding zones in the square and survive the siege.',
        introCutscene: {
          id: 'ch5_intro',
          chapter: 5,
          title: 'Act V · Counter-Phase',
          subtitle: 'Substation Ring · Critical Resonance · 00:50',
          image: ASSET_PATHS.cutsceneWatchman,
          beats: [
            {
              speaker: 'SUBSTATION ALARM · 00:50',
              timestamp: '00:50:03',
              text: 'The mirror boundary beyond the pines shatters like wet glass. Every shadow built up in Negruzino surges toward the central square to defend the humming transformer tower.',
            },
            {
              speaker: 'GRISHA · BATTLE CRY',
              timestamp: '00:50:18',
              text: 'Grisha spirals above the rain-slicked intersection and crows straight into the storm. Heavy siege ahead—stay mobile, scavenge medkits, and burn the loop out.',
            },
            {
              speaker: 'OBJECTIVE BRIEF',
              timestamp: '00:50:31',
              text: 'Overload both Substation Ground Couplings [E] flanking the central square and clear the surge to drag the Watchman into the open.',
            },
          ],
        },
      },
      {
        title: 'Chapter 6: The Shadow That Held On',
        objectiveSummary: 'Shatter the Midnight Watchman’s lantern in the central square.',
        introCutscene: {
          id: 'ch6_intro',
          chapter: 6,
          title: 'Act VI · The Shadow That Held On',
          subtitle: 'Transformer Square · 00:59 · Final Threshold',
          image: ASSET_PATHS.cutsceneWatchman,
          beats: [
            {
              speaker: 'FINAL TAPE · MIKHAIL SAVELIEV',
              timestamp: '00:59:04',
              text: 'Both ground couplings blow in blue lightning. The clouds crack above the tower as the Midnight Watchman steps forward—the crystallized shell of Grandfather’s own grief, hoarding the stolen minute.',
            },
            {
              speaker: 'RESOLVE · BREAKOUT TO THE HIGHWAY',
              timestamp: '00:59:19',
              text: '“Forgive me, Grandfather. Beyond this street lie Bus Depot #4 and Substation Luch-94.” Shatter the Watchman’s lantern and break through onto Checkpoint-3 Highway!',
            },
          ],
        },
      },
      ...EXTRA_CHAPTER_META_EN,
    ],
    victoryCutscene: {
      id: 'epilogue',
      chapter: 19,
      title: 'Epilogue · 06:00 — Dawn Over Negruzino',
      subtitle: 'The Luch-94 Resonator Core is silenced. All three sectors are free and time flows forward once more.',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'STILLNESS AFTER THE STORM · 01:00',
          timestamp: '01:00:02',
          text: 'The Watchman’s lantern dissolves into cool sparks and the thirty-year substation hum dies forever. Behind every timber and brick wall, kitchen clocks tick softly past midnight while a pale rose dawn breaks above the pines.',
        },
        {
          speaker: 'CAR RADIO · ONE FINAL CLICK',
          timestamp: '01:00:14',
          text: 'Through the Moskvitch speaker comes Mikhail Saveliev’s calm, clear voice without a trace of static: “Thank you for stopping the tape. Take care of Grisha...” — and the reel gently stops.',
        },
        {
          speaker: 'GRISHA · KEEPER OF MORNING',
          timestamp: '01:00:26',
          text: 'The rain eases to mist. Grisha flutters onto the warm hood of the Moskvitch, spreads his emerald tail, and lets out one clear, ringing morning crow—closing October 1994 in peace.',
        },
        {
          speaker: 'THE ROAD FORWARD',
          timestamp: '01:00:41',
          text: 'House #14’s key and Grandfather’s last cassette—labeled “Let Go”—rest beside you. You give Grisha one last pat, turn the ignition, and see the open highway stretching straight into daylight.',
        },
      ],
    },
    endlessBtn: 'Endless Loop',
    nextLoopBtn: (nextLoop) => `Enter Loop #${nextLoop} (.EXE+)`,
    loopBadge: (loop) => `LOOP #${loop}`,
    endlessWaveTitle: (wave) => `Endless Loop · Wave ${wave}`,
    endlessObjective: (kills, target) =>
      `Hold the street: eliminate targets (${kills}/${target}) and scavenge drops.`,
    bestRecordLine: (score, loop) => `BEST SCORE: ${score} · HIGHEST LOOP: #${loop}`,
    flashlightOn: 'Flashlight ON (L)',
    flashlightOff: 'Flashlight OFF (L)',
    headshotCallout: 'HEADSHOT!',
    overclockLabel: (sec) => `.EXE OVERCLOCK · ${sec}s`,
    comboLabel: (mult) => `COMBO ×${mult}`,
    pickupAmmo: '+AMMO PACK (ALL WEAPONS)',
    pickupMedkit: '+MEDKIT (+35 HP)',
    pickupOverclock: '.EXE CORE · OVERCLOCK 8s!',
    metersSuffix: 'm',
    upgradeModalTitle: 'NEGRUZINO.EXE — PATCH TERMINAL',
    upgradeModalSubtitle: (loop) =>
      `Loop #${loop} memory recompiled. Choose 1 module [1–3] to upgrade your run:`,
    upgradeKeyHint: 'Press [1], [2], or [3] or click a module to install',
    upgrades: {
      buckshot_overpressure: {
        file: 'BUCKSHOT_OP.DLL',
        name: 'Magnum Buckshot',
        desc: '+35% TOZ-194 Shotgun damage and heavier knockback punch.',
        tag: 'SHOTGUN',
      },
      awp_fastbolt: {
        file: 'AWP_BOLT94.DLL',
        name: 'Oiled AWP Bolt',
        desc: '35% faster AWP reload and +40% sniper headshot multiplier.',
        tag: 'AWP',
      },
      rotary_coolant: {
        file: 'GSHG_COOL.SYS',
        name: 'Rotary Coolant',
        desc: 'Minigun spins up 2× faster and gains +50 magazine capacity.',
        tag: 'MINIGUN',
      },
      petya_blessing: {
        file: 'GRISHA_GUARD.EXE',
        name: "Grisha's Blessing",
        desc: 'Patting [F] heals +24 HP twice as often and boosts alert range.',
        tag: 'COMPANION',
      },
      vampiric_loop: {
        file: 'BLOOD_LOOP.SYS',
        name: 'Vampiric Loop',
        desc: 'Every monster kill restores +8 HP and refreshes sprint stamina.',
        tag: 'SURVIVAL',
      },
      adrenaline_sprint: {
        file: 'ADRENALINE.DLL',
        name: 'Midnight Adrenaline',
        desc: '+22% movement speed and rapid stamina regeneration.',
        tag: 'MOBILITY',
      },
      hollowpoint_smg: {
        file: 'HOLLOW_P90.DLL',
        name: 'Hollow-Point Rounds',
        desc: '+30% damage for P90 & DE-50 Pistol plus instant ammo restock.',
        tag: 'P90 / DE-50',
      },
    },
    p90AutoReloadHint: 'AUTO-RELOAD · [R] MANUAL',
    roosterNameLabel: 'Rooster Name',
    roosterNameDesc: 'Choose your companion name — updates HUD, alerts, and story cutscenes.',
    roosterGrisha: 'Grisha',
    roosterVanya: 'Vanya',
    exportHeading: 'Download Offline Copy (HTML & .EXE)',
    exportDesc:
      'The standalone HTML file plays offline in any browser. The Electron archive includes the full desktop engine plus build-exe.bat to build NEGRUZINO.exe on Windows.',
    downloadHtmlBtn: 'Download NEGRUZINO.html',
    downloadDesktopBtn: 'Download .EXE Engine (ZIP)',
    difficultyLabel: 'Difficulty',
    difficulties: {
      easy: {
        label: 'Easy',
        hint: 'More health, gentler hits, out-of-combat breath recovery to 75 HP',
      },
      normal: {
        label: 'Normal',
        hint: 'Balanced survival horror, breath recovery up to 55 HP',
      },
      hard: {
        label: 'Nightmare',
        hint: 'No passive recovery, tougher monsters, ×1.4 score bonus',
      },
    },
    sensitivityLabel: 'Mouse Sensitivity',
    cutsceneKeyHint: '[Enter / Space] Next · [Esc] Skip',
    storyLogs: {
      ch1_start: {
        speaker: 'CAR RADIO · 23:59',
        text: 'Your Moskvitch stalled outside House #14. Shoot & shatter 2 Anomaly Fuse Cores and search the yards for glowing cassette tapes.',
      },
      ch1_fuse_1: {
        speaker: 'SAVELIEV’S LOG · FUSE #14',
        text: '“14.10.1994. The resonator locked 23:59, but it devours memory. Only Grisha stays anchored in real time.”',
      },
      ch1_fuse_2: {
        speaker: 'INTERCEPT · HOUSE #11',
        text: 'Street grid online! Relays in Yards #12 and #07 are humming—they carry the Route #404 dispatch signal.',
      },
      ch2_start: {
        speaker: 'TAPE #02 · MIKHAIL SAVELIEV',
        text: '“I feared tomorrow and trapped us in rain. Hold both Signal Relay zones in Yards #12 & #07!”',
      },
      ch2_relay_1: {
        speaker: 'SIGNAL RELAY A · YARD #12',
        text: 'Through tape crackle, you hear bus terminal announcements and Route #404’s horn—the static is clearing.',
      },
      ch2_relay_2: {
        speaker: 'SIGNAL RELAY B · YARD #07',
        text: 'Signal locked on the blind quarter! Streetlamps at Houses #08 & #15 just went dark—trigger their EMP stabilizers.',
      },
      ch3_start: {
        speaker: 'NEIGHBOR · HOUSE #08 · 00:24',
        text: '“Lights are dead on both sides! Switch on your flashlight [L] and trigger the EMP stabilizers in Yards #08 & #15!”',
      },
      ch3_stab_1: {
        speaker: 'STABILIZER #08',
        text: 'Frequency climbing—dispatch breaks through: “Bus 404 held safely at Checkpoint 3, all passengers accounted for...”',
      },
      ch3_stab_2: {
        speaker: 'STABILIZER #15',
        text: 'Both phases aligned! Now shatter the 3 jammer cores at the northern yards and south highway.',
      },
      ch4_start: {
        speaker: 'DISPATCH · 00:38',
        text: 'The bus survived that night! Shoot & destroy 3 Perimeter Jammer Cores in Yards #04, #03, and beside your Moskvitch.',
      },
      ch4_beacon_1: {
        speaker: 'BEACON #04 · NORTH-WEST',
        text: 'Real stars flash briefly above the pines—the magnetic dome is starting to fracture.',
      },
      ch4_beacon_2: {
        speaker: 'BEACON #03 · NORTH-EAST',
        text: 'Second arc broken! One final jammer core waits beside your stalled Moskvitch on the south road.',
      },
      ch4_beacon_3: {
        speaker: 'HIGHWAY MIRROR · SOUTH ROAD',
        text: 'Perimeter shattered! Every shadow is rushing the central square—prepare for the substation siege!',
      },
      ch5_start: {
        speaker: 'SUBSTATION · 00:50',
        text: 'Critical resonance! Hold both Grounding Zones flanking the square against the incoming surge.',
      },
      ch5_core_1: {
        speaker: 'WEST COUPLING',
        text: 'Blue arcs spray across the puddles! The transformer drops an octave—trip the eastern coupling.',
      },
      ch5_core_2: {
        speaker: 'EAST COUPLING',
        text: 'Both couplings blown! Rain hangs still over the square—the Watchman himself is descending.',
      },
      boss_arrival: {
        speaker: 'TRANSFORMER · 00:59',
        text: 'The Midnight Watchman has entered the square! Shatter his lantern and open the road to the highway!',
      },
      ...EXTRA_STORY_LOGS_EN,
    },
    storyTapes: {
      tape_01: {
        code: 'MK-60 #01',
        title: 'The Last Turn',
        location: 'Beside the stalled Moskvitch',
        speaker: 'MOSKVITCH DRIVER · 1994',
        text: '“The dash clock jumped from 23:59:59 straight back to 23:59:00 again. Wipers scrape the glass, and only one yellow window burns at House #14.”',
      },
      tape_02: {
        code: 'MK-60 #02',
        title: 'LOOP_00 Schematic',
        location: 'House #14 porch steps',
        speaker: 'MIKHAIL SAVELIEV · 14.10.1994',
        text: '“Wire the reel generator through the step-down transformer and time within a hundred meters gums up like wet tape. I only need one hour until the bus gets in.”',
      },
      tape_03: {
        code: 'MK-60 #03',
        title: 'Why Grisha Never Froze',
        location: 'Yard #11 fence corner',
        speaker: 'MIKHAIL SAVELIEV · LOOP #17',
        text: '“Clocks stand still, neighbors repeat the same steps, yet Grisha walks free. Maybe because he waits for sunrise instead of yesterday’s storm.”',
      },
      tape_04: {
        code: 'MK-60 #04',
        title: 'Whispers Behind the Pickets',
        location: 'Dark Yard #08',
        speaker: 'NEIGHBOR VASILY · HOUSE #08',
        text: '“Every rewind wears the oxide thinner. First faces blurred on photos, then folks behind the fences stretched into shades. Don’t listen to their shriek—it’s ruined tape.”',
      },
      tape_05: {
        code: 'MK-60 #05',
        title: 'Call From Checkpoint 3',
        location: 'Northern Yard #03',
        speaker: 'DEPOT DISPATCHER · 06:15',
        text: '“Hello, Negruzino? Tell Saveliev that Bus #404 waited out the storm at Checkpoint 3—every passenger is safe and drinking hot tea. Why is your line always busy?..”',
      },
      tape_06: {
        code: 'MK-60 #06',
        title: 'Tape “Let Go”',
        location: 'Base of the Central Transformer',
        speaker: 'MIKHAIL SAVELIEV · FINAL LOG',
        text: '“If you reached the tower, then I have already become part of the shadow guarding it. Show it no hesitation. Shatter the lantern and walk Grisha into sunlight.”',
      },
      ...EXTRA_STORY_TAPES_EN,
    },
    tapeArchiveHeading: 'Recovered MK-60 Cassette Tapes (Story Dossier)',
    tapeLockedHint: 'Not recovered yet — search the suburb yards, Bus Depot #4, and Substation Luch-94 for glowing amber cassettes.',
    tapeCollectPrompt: (title) => `[E] Pick up cassette: “${title}”`,
    tapeCollectedToast: (title, found, total) => `CASSETTE ${found}/${total}: “${title}”`,
    tapesCounterLabel: 'TAPES',
    lanCoopBtn: 'LAN Co-op',
    lanCoop: {
      title: 'LAN Co-op · 1994',
      subtitle: 'Play together over local Wi-Fi / Ethernet — up to 4 survivors in one prep hub and campaign',
      callsignLabel: 'Your Callsign',
      serverAddrLabel: 'LAN Server Address (blank = this host)',
      serverAddrPlaceholder: 'e.g. 192.168.1.42:3000',
      connectBtn: 'Connect',
      refreshBtn: 'Refresh',
      createRoomBtn: 'Host LAN Room',
      joinRoomBtn: 'Join by Code',
      roomCodePlaceholder: 'CODE (e.g. 7K4P)',
      openRoomsHeading: 'Open Rooms on Your LAN',
      noOpenRooms: 'No open LAN rooms yet — host one and share your code!',
      yourLanHeading: 'Address for friends on your Wi-Fi / LAN',
      copyCodeBtn: 'Copy Code',
      copiedBadge: 'Copied!',
      readyBtn: 'Ready Up',
      unreadyBtn: 'Not Ready',
      startMatchBtn: 'Enter 3D Prep Hub',
      enterHubBtn: 'Enter 3D Hub',
      hubRuleHint: 'Your squad enters the sunlit Garage Hub with a firing range and specs stand. The match launches once ALL players board the Moskvitch.',
      leaveRoomBtn: 'Leave Room',
      hostTag: 'HOST',
      readyTag: 'READY',
      waitingTag: 'WAITING',
      statusConnected: 'Connected to LAN',
      statusConnecting: 'Connecting...',
      statusOffline: 'Server Unreachable',
      squadHeading: 'LAN SQUAD',
      revivePrompt: (name) => `[E] Revive Teammate: ${name}`,
      downedBanner: 'DOWNED · TEAMMATE CAN REVIVE YOU [E]',
      pingHint: '[G] Squad Ping',
      pingSentLabel: 'SQUAD PING',
      scalingBadge: (players, hpMult, dmgMult) => `CO-OP ×${players} · HP ${hpMult} · DMG ${dmgMult}`,
    },
    zoneNames: ZONE_NAMES.en,
    hub: {
      title: 'SAVELIEV GARAGE · PREP HUB',
      subtitle: 'Safe Staging Yard · 1994 · Test weapons on the firing range, inspect specs, and board the Moskvitch',
      freeExploreHint: 'Free movement · Infinite range reserve ammo · Shoot target dummies to test recoil and reload',
      moskvitchBoardPrompt: '[E] Board Moskvitch-412 (ready to depart)',
      moskvitchLeavePrompt: '[E] Step out of Moskvitch',
      moskvitchBoardBtn: 'Board Moskvitch',
      moskvitchLeaveBtn: 'Step Out',
      moskvitchCounter: (boarded, total) => `In Moskvitch: ${boarded}/${total}`,
      moskvitchWaiting: (missing) => `Waiting for squad — ${missing} more to board`,
      moskvitchLaunching: 'All aboard! Starting the Moskvitch — heading to Negruzino...',
      terminalPrompt: '[E] Open Arsenal & Tactical Specs Stand',
      terminalBtn: 'Specs Stand',
      rangeHint: 'Firing Range: 5 AFK Dummies (10m–22m) · Hits report exact damage & headshots',
      rangeHitReadout: (dummy, dmg, dist, crit, destroyed) =>
        `${dummy} (${dist}m): −${dmg} HP${crit ? ' · CRIT!' : ''}${destroyed ? ' · DESTROYED (2.5s respawn)' : ''}`,
      rangeDummyNames: {
        crawler: 'Crawler Dummy',
        lampshade: 'Shade Dummy',
        screamer: 'Screamer Dummy',
        heavy: 'Armored Heavy Dummy',
      },
      enterHubBtn: 'Enter Prep Hub',
      quickStartBtn: 'Jump to Chapter 1',
      ammoInfiniteBadge: 'RANGE · AMMO ∞',
      zoneTransitionBanner: (zoneName) => `ENTERING SECTOR: ${zoneName}`,
    },
    specsModal: {
      title: 'ARSENAL & TACTICAL SPECS STAND · 1994',
      subtitle: 'Exact stats for all 5 weapons, .EXE patches, enemy profiles, and co-op difficulty scaling',
      closeBtn: 'Close Stand',
      tabWeapons: 'Weapons (5)',
      tabUpgrades: '.EXE Patches',
      tabEnemies: 'Enemies & Grisha',
      tabCoop: 'Co-op Balance',
      statDamage: 'Damage',
      statPellets: 'Pellets',
      statRpm: 'RPM',
      statMag: 'Mag / Reserve',
      statReload: 'Reload',
      statRange: 'Range',
      statSpecial: 'Role',
      secSuffix: 's',
      enemyHpLabel: 'Health',
      enemySpeedLabel: 'Speed',
      enemyThreatLabel: 'Behavior & Counterplay',
      enemyProfiles: [
        {
          kind: 'crawler',
          hp: '78 HP',
          speed: 'Fast (5.0 m/s)',
          behavior: 'Rushes along flanks in low bounds and accelerates up close.',
          counter: 'One-tap with TOZ-194 buckshot or sweep with P90.',
        },
        {
          kind: 'lampshade',
          hp: '115 HP',
          speed: 'Medium (4.0 m/s)',
          behavior: 'Stalks near streetlamps, orbits on an arc, and lands heavy blows.',
          counter: 'DE-50 or AWP headshots stagger its strike.',
        },
        {
          kind: 'screamer',
          hp: '92 HP',
          speed: 'Erratic (4.6 m/s)',
          behavior: 'Darts from cover and triggers a close-range acoustic screamer.',
          counter: 'Heed Grisha’s direction crow and drop it before it closes in.',
        },
        {
          kind: 'watchman',
          hp: '780–1150 HP (Boss)',
          speed: 'Relentless (3.8 m/s)',
          behavior: 'Act finale boss (Ch. 6, 12, 18). Unleashes dark surges and heavy charges.',
          counter: 'Keep moving, snipe the lantern/head with AWP, or shred with GShG-6 Minigun.',
        },
      ],
      roosterCardTitle: 'Grisha the Rooster (Herald of Dawn)',
      roosterCardDesc:
        'Grisha flies beside you, crows early with threat direction and distance, and never blocks your sights. Pat him [F] to recover vitality and steady your nerves.',
      coopIntro:
        'Difficulty dynamically recalculates whenever players join or leave a co-op session (1–4 survivors):',
      coopColPlayers: 'Squad',
      coopColHp: 'Enemy HP',
      coopColDmg: 'Enemy DMG',
      coopColSpeed: 'Speed',
      coopColCaps: 'Cap / Spawn',
      coopColKills: 'Kill Quota',
      coopColLoot: 'Drop / Ammo',
      coopRulesNote:
        'Cutscene skipping in co-op requires a unanimous squad vote (X/Y). Disconnecting players are automatically removed from both Hub boarding and Cutscene skip quorums.',
    },
    cutsceneVote: {
      voteBtn: 'Vote to Skip',
      votedBtn: 'Skip Vote Cast',
      counter: (votes, total) => `Skip cutscene: ${votes}/${total}`,
      waitingHint: 'Cutscene skips once all active squad members vote',
    },
    characterRanks: [
      'Highway Stranger',
      '1994 Witness',
      'Radio Keeper',
      'Loop Breaker',
      'Dawnbearer',
    ],
    levelShort: 'LV.',
    levelUpBanner: (level, rank) => `RANK UP · LV. ${level} — ${rank}`,
    nextTrackBtn: 'Next track (N)',
    trackToastPrefix: 'TAPE',
    hudEditorTitle: 'Touch HUD Layout',
    hudEditorDesc: 'Drag buttons and the thumbstick anywhere on screen and tune their size separately for portrait and landscape modes.',
    hudEditorOpenBtn: 'Customize On-Screen Controls',
    hudEditorSave: 'Save',
    hudEditorReset: 'Reset',
    hudEditorCancel: 'Cancel',
    hudEditorScale: 'Size',
    hudEditorHint: 'Drag any control to reposition it',
    hudControlNames: {
      joystick: 'Joystick',
      fire: 'Fire',
      reload: 'Reload',
      jump: 'Jump',
      interact: 'Interact',
      pat: 'Pat',
      flashlight: 'Flashlight',
      scope: 'Scope',
      weapons: 'Weapons',
    },
    audioUploading: 'Loading track into storage…',
    audioUploadError: 'Could not read audio file. Please use MP3, WAV, OGG or M4A under 48 MB.',
  },
};

export function formatRoosterAlert(
  lang: Language,
  kind: EnemyKind,
  angleRad: number,
  distMeters: number,
  roosterName: RoosterNameId = 'grisha'
): string {
  const t = TRANSLATIONS[lang];
  const absA = Math.abs(angleRad);
  const dirWord =
    absA > 2.2
      ? t.dirBehind
      : absA < 0.65
        ? t.dirAhead
        : angleRad > 0
          ? t.dirRight
          : t.dirLeft;
  const distUnit = lang === 'ru' ? 'м' : 'm';
  const raw = `${t.roosterAlertPrefix} ${t.enemyNames[kind]} ${dirWord} (${Math.round(distMeters)}${distUnit})`;
  return localizeRoosterCopy(raw, lang, roosterName);
}
