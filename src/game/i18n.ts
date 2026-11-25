import { ASSET_PATHS } from './constants';
import type {
  BindableAction,
  CutsceneDef,
  DifficultyId,
  EnemyKind,
  Language,
  MusicTrackId,
  RoosterNameId,
  StoryLogEntry,
  TexturePatternKind,
  TextureSlot,
  UpgradeId,
  WeaponId,
} from './types';

export const LANG_STORAGE_KEY = 'negruzino_language';
export const ROOSTER_NAME_STORAGE_KEY = 'negruzino_rooster_name';
export const DIFFICULTY_STORAGE_KEY = 'negruzino_difficulty';
export const SENSITIVITY_STORAGE_KEY = 'negruzino_mouse_sensitivity';

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
  mobilePat: string;
  mobileJump: string;
  mobileFlash: string;
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
  storyLogs: Record<
    | 'ch1_start'
    | 'ch1_fuse_1'
    | 'ch1_fuse_2'
    | 'ch2_start'
    | 'ch2_relay_1'
    | 'ch2_relay_2'
    | 'ch2_relay_3'
    | 'boss_arrival',
    StoryLogEntry
  >;
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
    mobilePat: 'Погладить',
    mobileJump: 'Прыжок',
    mobileFlash: 'Фонарик',
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
      ch2_relay_3: 'Ретранслятор В (Двор №04)',
    },
    chapterMeta: [
      {
        title: 'Глава 1: Магнитная полночь',
        objectiveSummary: 'Запустите 2 уличных щитка и переживите первую засаду петли.',
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
              text: '«Внук, если ты читаешь это — мой резонатор на подстанции пошёл вразнос. Я хотел удержать вечер до последнего автобуса, но запер весь посёлок в 23:59. Забери ключи у дома №14 и не бросай Гришу». Ваш «Москвич» заглох в лужах прямо у въездного знака.',
            },
            {
              speaker: 'ПЕТУХ ГРИША · ВЕСТНИК РАССВЕТА',
              timestamp: '23:59:18',
              text: 'В этом закольцованном дожде живым остался лишь дедов петух Гриша — единственное существо, чей крик будит утро. Он чувствует тени за секунду до броска, никогда не лезет под пули и возвращает выдержку, если погладить его [F].',
            },
            {
              speaker: 'ВНУТРЕННИЙ МОНОЛОГ',
              timestamp: '23:59:31',
              text: 'Руки ещё дрожат на старом ТОЗ-194 из дедова багажника, но пути назад нет — шоссе замкнулось в кольцо. Включите два уличных щитка [E] по оранжевым маякам, и вы начнёте вспоминать, как устроена эта машина времени.',
            },
          ],
        },
      },
      {
        title: 'Глава 2: Плёнки Савельева',
        objectiveSummary: 'Пройдите через дворы и настройте 3 радиоретранслятора.',
        introCutscene: {
          id: 'ch2_intro',
          chapter: 2,
          title: 'Акт II · Плёнки Савельева',
          subtitle: 'Архив катушечной памяти · Сбой синхронизации 00:13',
          image: ASSET_PATHS.cutsceneWatchman,
          beats: [
            {
              speaker: 'КАССЕТА ДЕДА №02 · ИНЖЕНЕРНЫЙ ДНЕВНИК',
              timestamp: '00:13:05',
              text: 'Щитки оживили радио «Москвича», и из помех прорвался усталый голос деда: «Когда в тот октябрь шторм оборвал трассу и последний рейс не пришёл, я подключил катушечный резонатор LOOP_00 к трансформатору. Я надеялся перемотать один-единственный час...»',
            },
            {
              speaker: 'ОСОЗНАНИЕ · ПРИРОДА ТЕНЕЙ',
              timestamp: '00:13:19',
              text: '«Но плёнка начала гнить. Твари за заборами и Пустые Скримеры — не чужаки, а разорванные эхо страха и ожидания, размазанные по сотням повторов одной ночи. Каждый бой делает тебя сильнее и возвращает память».',
            },
            {
              speaker: 'ПЛАН ПРОРЫВА',
              timestamp: '00:13:34',
              text: 'Найдите три садовых ретранслятора [E] по зелёным лучам и сломайте фазу петли. Вы больше не случайный гость на трассе — переключите кассету [N], держите Гришу на фланге и идите к сердцу подстанции.',
            },
          ],
        },
      },
      {
        title: 'Глава 3: Тень, которая не отпустила',
        objectiveSummary: 'Разбейте фонарь Полуночного Смотрителя на центральной площади.',
        introCutscene: {
          id: 'ch3_intro',
          chapter: 3,
          title: 'Акт III · Тень, которая не отпустила',
          subtitle: 'Трансформаторная площадь · 00:59 · Финальный рубеж',
          image: ASSET_PATHS.cutsceneWatchman,
          beats: [
            {
              speaker: 'ПОСЛЕДНЯЯ ЗАПИСЬ МИХАИЛА САВЕЛЬЕВА',
              timestamp: '00:59:04',
              text: 'Все три ретранслятора сошлись в противофазе. Над вышкой треснуло небо: из трансформаторного гула вышел Полуночный Смотритель — застывшая оболочка самого дедова горя, сжимающая фонарь с украденной минутой.',
            },
            {
              speaker: 'РЕШИМОСТЬ · ХРАНИТЕЛЬ РАССВЕТА',
              timestamp: '00:59:19',
              text: '«Прости, дед. Удерживать прошлое силой — значит хоронить живых». Вы перехватываете ствол без страха. Гриша взлетает с боевым кличем: разбейте фонарь Смотрителя на площади — и впервые за тридцать лет пробьёт 01:00.',
            },
          ],
        },
      },
    ],
    victoryCutscene: {
      id: 'epilogue',
      chapter: 4,
      title: 'Эпилог · 01:00 — Рассвет над Негрузино',
      subtitle: 'Петля 1994 года разомкнута. Время снова течёт вперёд.',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'ТИШИНА ПОСЛЕ ГРОЗЫ · 01:00',
          timestamp: '01:00:02',
          text: 'Фонарь Смотрителя осыпался холодными искрами, и гул подстанции оборвался навсегда. За окнами деревянных и кирпичных домов мягко тикнули настенные часы, а над соснами проступила тонкая розовая полоска настоящего утра.',
        },
        {
          speaker: 'ПЕТУХ ГРИША · ХРАНИТЕЛЬ УТРА',
          timestamp: '01:00:16',
          text: 'Дождь стих. Гриша взлетел на тёплый капот «Москвича», расправил изумрудные перья и выдал чистое, звонкое кукареку — закрывая октябрь 1994-го, который больше никому не нужно бояться.',
        },
        {
          speaker: 'ДОРОГА В БУДУЩЕЕ',
          timestamp: '01:00:31',
          text: 'На сиденье лежит ключ от дома №14 и последняя кассета деда с подписью «Отпусти». Вы гладите Гришу по гребешку, заводите мотор — и впервые видите прямую дорогу на шоссе, свободную до самого горизонта.',
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
        text: '«Москвич» заглох у дома №14. Включите 2 уличных щитка [E] — клавиша [N] меняет кассету на магнитоле.',
      },
      ch1_fuse_1: {
        speaker: 'ДНЕВНИК САВЕЛЬЕВА · ЩИТОК №14',
        text: '«14.10.1994. Резонатор зацепил 23:59, но съедает живую память. Единственный якорь реальности — Гриша».',
      },
      ch1_fuse_2: {
        speaker: 'РАДИОПЕРЕХВАТ · ДОМ №11',
        text: 'Сеть ожила! За садовыми заборами запели три ретранслятора — они хранят код сброса петли.',
      },
      ch2_start: {
        speaker: 'КАССЕТА №02 · МИХАИЛ САВЕЛЬЕВ',
        text: '«Я боялся завтрашнего дня и запер всех в дожде. Сбей фазу на трёх зелёных ретрансляторах [E]».',
      },
      ch2_relay_1: {
        speaker: 'РЕТРАНСЛЯТОР А · ДВОР №12',
        text: 'На плёнке слышен звон последнего автобуса 1994-го — вы чувствуете, как возвращается хладнокровие.',
      },
      ch2_relay_2: {
        speaker: 'РЕТРАНСЛЯТОР Б · ДВОР №07',
        text: '«Если бы я мог переиграть ту ночь, я бы отпустил её. Остался последний узел во дворе №04!»',
      },
      ch2_relay_3: {
        speaker: 'РЕТРАНСЛЯТОР В · ДВОР №04',
        text: 'Резонатор сорван! Подстанция в центре дрожит — готовьтесь встретить Смотрителя лицом к лицу.',
      },
      boss_arrival: {
        speaker: 'ТРАНСФОРМАТОР · 00:59',
        text: 'Полуночный Смотритель вышел на площадь! Разбейте его фонарь и освободите Негрузино!',
      },
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
    mobilePat: 'Pat',
    mobileJump: 'Jump',
    mobileFlash: 'Light',
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
      ch2_relay_3: 'Signal Relay C (Yard #04)',
    },
    chapterMeta: [
      {
        title: 'Chapter 1: Magnetic Midnight',
        objectiveSummary: 'Restore 2 street fuse boxes and survive the first ambush.',
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
              text: '“If you are reading this, my substation resonator ran away. I tried to hold onto the night before the last bus vanished—and locked the whole village in 23:59. Take the keys at House #14 and never leave Grisha behind.” Your Moskvitch stalls in the rain-filled road.',
            },
            {
              speaker: 'GRISHA · HERALD OF DAWN',
              timestamp: '23:59:18',
              text: 'Only Grandfather’s red-crested rooster Grisha still breathes outside the tape loop—the one creature whose crow calls the morning. He flanks clear of your sights, cries before shadows strike, and steadies your heart when patted [F].',
            },
            {
              speaker: 'INNER MONOLOGUE',
              timestamp: '23:59:31',
              text: 'Your hands still tremble around the TOZ-194 from the trunk, yet the highway behind has folded back into rain. Follow the amber beams, restore two Fuse Boxes [E], and begin unraveling the machine Grandfather built.',
            },
          ],
        },
      },
      {
        title: 'Chapter 2: Saveliev’s Tapes',
        objectiveSummary: 'Cross the fenced lawns and align 3 Signal Relays.',
        introCutscene: {
          id: 'ch2_intro',
          chapter: 2,
          title: 'Act II · Saveliev’s Tapes',
          subtitle: 'Magnetic Tape Archive · Sync Drift 00:13',
          image: ASSET_PATHS.cutsceneWatchman,
          beats: [
            {
              speaker: 'TAPE #02 · ENGINEER’S LOG',
              timestamp: '00:13:05',
              text: 'Power snaps back and Grandfather’s voice cuts through the car radio: “When the October storm severed the highway and the last bus never returned, I wired the LOOP_00 tape resonator into the transformer. I only wanted to rewind a single hour...”',
            },
            {
              speaker: 'REVELATION · ECHOES IN THE RAIN',
              timestamp: '00:13:19',
              text: '“Instead, the tape began to rot. The creatures behind the fences and the Hollow Screamers are shattered echoes of fear and waiting, smeared across hundreds of replays. Every fight sharpens your resolve.”',
            },
            {
              speaker: 'BREAKOUT PLAN',
              timestamp: '00:13:34',
              text: 'Link all three garden Signal Relays [E] along the green light pillars to break phase lock. You are no longer a lost traveler—flip the cassette [N], keep Grisha on your flank, and push toward the substation.',
            },
          ],
        },
      },
      {
        title: 'Chapter 3: The Shadow That Held On',
        objectiveSummary: 'Shatter the Midnight Watchman’s lantern in the central square.',
        introCutscene: {
          id: 'ch3_intro',
          chapter: 3,
          title: 'Act III · The Shadow That Held On',
          subtitle: 'Transformer Square · 00:59 · Final Threshold',
          image: ASSET_PATHS.cutsceneWatchman,
          beats: [
            {
              speaker: 'FINAL TAPE · MIKHAIL SAVELIEV',
              timestamp: '00:59:04',
              text: 'All three relays lock in counter-phase. The clouds crack above the tower as the Midnight Watchman steps into the square—the crystallized shell of Grandfather’s own grief, clutching the lantern that hoards the stolen minute.',
            },
            {
              speaker: 'RESOLVE · DAWNBEARER',
              timestamp: '00:59:19',
              text: '“Forgive me, Grandfather—forcing the past to stay only buries the living.” Your grip is steady now. Grisha rises with a battle crow: shatter the Watchman’s lantern and let 01:00 finally arrive.',
            },
          ],
        },
      },
    ],
    victoryCutscene: {
      id: 'epilogue',
      chapter: 4,
      title: 'Epilogue · 01:00 — Dawn Over Negruzino',
      subtitle: 'The 1994 loop is broken. Time flows forward once more.',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'STILLNESS AFTER THE STORM · 01:00',
          timestamp: '01:00:02',
          text: 'The Watchman’s lantern dissolves into cool sparks and the substation hum dies forever. Behind every timber and brick wall, kitchen clocks tick softly past midnight while a pale rose dawn breaks above the pines.',
        },
        {
          speaker: 'GRISHA · KEEPER OF MORNING',
          timestamp: '01:00:16',
          text: 'The rain eases to mist. Grisha flutters onto the warm hood of the Moskvitch, spreads his emerald tail, and lets out one clear, ringing morning crow—closing October 1994 in peace.',
        },
        {
          speaker: 'THE ROAD FORWARD',
          timestamp: '01:00:31',
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
        text: 'Your Moskvitch stalled outside House #14. Restore 2 Fuse Boxes [E] — press [N] anytime to switch cassette tracks.',
      },
      ch1_fuse_1: {
        speaker: 'SAVELIEV’S LOG · FUSE #14',
        text: '“14.10.1994. The resonator locked 23:59, but it devours memory. Only Grisha stays anchored in real time.”',
      },
      ch1_fuse_2: {
        speaker: 'INTERCEPT · HOUSE #11',
        text: 'Street grid online! Three courtyard relays are humming ahead—they carry the loop override code.',
      },
      ch2_start: {
        speaker: 'TAPE #02 · MIKHAIL SAVELIEV',
        text: '“I feared tomorrow and trapped us in rain. Break phase on the three green Signal Relays [E].”',
      },
      ch2_relay_1: {
        speaker: 'SIGNAL RELAY A · YARD #12',
        text: 'Distant 1994 bus bells echo through the tape—your aim feels steadier as the loop weakens.',
      },
      ch2_relay_2: {
        speaker: 'SIGNAL RELAY B · YARD #07',
        text: '“If I could replay that night, I would have let it go. One last relay in Yard #04!”',
      },
      ch2_relay_3: {
        speaker: 'SIGNAL RELAY C · YARD #04',
        text: 'Resonator broken! The central transformer tower is surging—brace to face the Watchman.',
      },
      boss_arrival: {
        speaker: 'TRANSFORMER · 00:59',
        text: 'The Midnight Watchman has entered the square! Shatter his lantern and free Negruzino!',
      },
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
