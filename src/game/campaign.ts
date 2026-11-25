import type { ChapterDef, CutsceneDef, StoryLogEntry, ZoneId } from './types';

const ASSET_PATHS = {
  cutsceneStreet: '/src/assets/images/cutscene_negruzino_street_1795310999291.jpg',
  cutsceneWatchman: '/src/assets/images/cutscene_watchman_screamer_1795310999688.jpg',
} as const;

export interface ChapterLocaleMeta {
  title: string;
  objectiveSummary: string;
  introCutscene: CutsceneDef;
}

export interface TapeLocaleMeta {
  code: string;
  title: string;
  location: string;
  speaker: string;
  text: string;
}

export const ZONE_NAMES: Record<'ru' | 'en', Record<ZoneId, string>> = {
  ru: {
    hub: 'Гараж Савельевых · Хаб подготовки',
    suburb: 'Посёлок Негрузино · Улица',
    depot: 'Автопарк №4 · Шоссе КПП-3',
    substation: 'Подстанция «Луч-94» · Ядро',
  },
  en: {
    hub: 'Saveliev Garage · Prep Hub',
    suburb: 'Negruzino Suburb · Main Street',
    depot: 'Bus Depot #4 · Checkpoint-3',
    substation: 'Substation "Luch-94" · Core',
  },
};

export const CAMPAIGN_CHAPTERS: ChapterDef[] = [
  // ==================== ACT I: NEGRUZINO SUBURB (Chapters 1–6) ====================
  {
    chapter: 1,
    zoneId: 'suburb',
    clockLabel: '23:59',
    title: 'Chapter 1: Magnetic Midnight',
    objectiveSummary: 'Restore 2 street fuse boxes and survive the first ambush.',
    targetKills: 5,
    hasBoss: false,
    spawnWeights: { crawler: 0.68, lampshade: 0.24, screamer: 0.08 },
    maxActiveEnemies: 5,
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
          text: '"Grandson, my substation resonator went runaway. I tried to hold the evening for Bus #404 and locked the street at 23:59." Your Moskvitch stalls in the wet asphalt just outside House #14.',
        },
      ],
    },
  },
  {
    chapter: 2,
    zoneId: 'suburb',
    clockLabel: '00:11',
    title: 'Chapter 2: Saveliev Tapes',
    objectiveSummary: 'Tune 2 courtyard signal relays in Yards #12 and #07.',
    targetKills: 7,
    hasBoss: false,
    spawnWeights: { crawler: 0.45, lampshade: 0.4, screamer: 0.15 },
    maxActiveEnemies: 6,
    introCutscene: {
      id: 'ch2_intro',
      chapter: 2,
      title: 'Act I · Saveliev Tapes',
      subtitle: 'Reel-to-Reel Archive · Sync Drift 00:11',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'TAPE #02 · MIKHAIL SAVELIEV',
          timestamp: '00:11:05',
          text: 'The Moskvitch radio crackles to life: "I wired LOOP_00 to hold one hour... but the magnetic tape started flaking into shadows."',
        },
      ],
    },
  },
  {
    chapter: 3,
    zoneId: 'suburb',
    clockLabel: '00:24',
    title: 'Chapter 3: The Blind Quarter',
    objectiveSummary: 'Push into blacked-out Yards #08 & #15 and restart 2 phase stabilizers.',
    targetKills: 8,
    hasBoss: false,
    spawnWeights: { crawler: 0.34, lampshade: 0.38, screamer: 0.28 },
    maxActiveEnemies: 7,
    introCutscene: {
      id: 'ch3_intro',
      chapter: 3,
      title: 'Act I · The Blind Quarter',
      subtitle: 'Houses #08 & #15 · Blackout Sector · 00:24',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'NEIGHBOR · HOUSE #08',
          timestamp: '00:24:03',
          text: '"Misha, kill the transformer! Headlights are stuck behind the northern pines!"',
        },
      ],
    },
  },
  {
    chapter: 4,
    zoneId: 'suburb',
    clockLabel: '00:38',
    title: 'Chapter 4: Route 404',
    objectiveSummary: 'Activate 3 perimeter beacons across North Yards #04, #03 & the South Road.',
    targetKills: 9,
    hasBoss: false,
    spawnWeights: { crawler: 0.3, lampshade: 0.38, screamer: 0.32 },
    maxActiveEnemies: 7,
    introCutscene: {
      id: 'ch4_intro',
      chapter: 4,
      title: 'Act I · Route 404',
      subtitle: 'Northern Perimeter · The Bus That Never Crashed · 00:38',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'DISPATCH LOG',
          timestamp: '00:38:08',
          text: 'Bus #404 never crashed — traffic police held it safely at Checkpoint-3 until dawn.',
        },
      ],
    },
  },
  {
    chapter: 5,
    zoneId: 'suburb',
    clockLabel: '00:50',
    title: 'Chapter 5: Substation Counter-Phase',
    objectiveSummary: 'Release 2 transformer ground couplings on the square and hold the surge.',
    targetKills: 10,
    hasBoss: false,
    spawnWeights: { crawler: 0.26, lampshade: 0.38, screamer: 0.36 },
    maxActiveEnemies: 8,
    introCutscene: {
      id: 'ch5_intro',
      chapter: 5,
      title: 'Act I · Substation Counter-Phase',
      subtitle: 'Transformer Ring · Critical Resonance · 00:50',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'TRANSFORMER SIREN · 00:50',
          timestamp: '00:50:03',
          text: 'The mirror dome cracks — every shadow in Negruzino surges toward the central square.',
        },
      ],
    },
  },
  {
    chapter: 6,
    zoneId: 'suburb',
    clockLabel: '00:59',
    title: 'Chapter 6: First Projection of the Watchman',
    objectiveSummary: 'Shatter the Watchman Projection on the square to breach the Highway Gate.',
    targetKills: 1,
    hasBoss: true,
    spawnWeights: { crawler: 0.4, lampshade: 0.3, screamer: 0.3 },
    maxActiveEnemies: 5,
    introCutscene: {
      id: 'ch6_intro',
      chapter: 6,
      title: 'Act I Finale · The Gatekeeper Shadow',
      subtitle: 'Central Square · 00:59 · Highway Barrier',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'RADIO SIGNAL · KPP-3',
          timestamp: '00:59:04',
          text: 'A projection of the Midnight Watchman blocks the northern road to Bus Depot #4!',
        },
      ],
    },
  },

  // ==================== ACT II: BUS DEPOT #4 & KPP-3 (Chapters 7–12) ====================
  {
    chapter: 7,
    zoneId: 'depot',
    clockLabel: '01:08',
    title: 'Chapter 7: Highway Checkpoint-3',
    objectiveSummary: 'Power the KPP-3 barrier breaker and east generator shed.',
    targetKills: 7,
    hasBoss: false,
    spawnWeights: { crawler: 0.46, lampshade: 0.34, screamer: 0.2 },
    maxActiveEnemies: 6,
    introCutscene: {
      id: 'ch7_intro',
      chapter: 7,
      title: 'Act II · Highway Checkpoint-3',
      subtitle: 'Bus Depot #4 · Route 404 Corridor · 01:08',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'KPP-3 INTERCOM',
          timestamp: '01:08:02',
          text: 'You broke through the suburb barrier, only to find the loop stretched all the way to Bus Depot #4.',
        },
      ],
    },
  },
  {
    chapter: 8,
    zoneId: 'depot',
    clockLabel: '01:17',
    title: 'Chapter 8: Ghost of Bus #404',
    objectiveSummary: 'Recover Bus #404 black box and West Hangar inspection telemetry.',
    targetKills: 8,
    hasBoss: false,
    spawnWeights: { crawler: 0.36, lampshade: 0.38, screamer: 0.26 },
    maxActiveEnemies: 7,
    introCutscene: {
      id: 'ch8_intro',
      chapter: 8,
      title: 'Act II · Ghost of Bus #404',
      subtitle: 'Central Depot Tarmac · 01:17',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'BUS #404 RECORDER',
          timestamp: '01:17:11',
          text: 'Bus #404 stands idling in the rain — empty, headlights glowing with phantom magnetic haze.',
        },
      ],
    },
  },
  {
    chapter: 9,
    zoneId: 'depot',
    clockLabel: '01:28',
    title: 'Chapter 9: Fuel Cistern Blackout',
    objectiveSummary: 'Shut off 2 fuel cistern valves in the northwest tank farm.',
    targetKills: 9,
    hasBoss: false,
    spawnWeights: { crawler: 0.32, lampshade: 0.36, screamer: 0.32 },
    maxActiveEnemies: 7,
    introCutscene: {
      id: 'ch9_intro',
      chapter: 9,
      title: 'Act II · Fuel Cistern Blackout',
      subtitle: 'Northwest Tank Farm · 01:28',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'DEPOT MECHANIC TAPE',
          timestamp: '01:28:05',
          text: 'The diesel backup generators are feeding the loop relay from the tank farm.',
        },
      ],
    },
  },
  {
    chapter: 10,
    zoneId: 'depot',
    clockLabel: '01:39',
    title: 'Chapter 10: Inspection Bay Ambush',
    objectiveSummary: 'Sever 3 depot busbars across the East Hangar, tarmac, and west yard.',
    targetKills: 10,
    hasBoss: false,
    spawnWeights: { crawler: 0.28, lampshade: 0.38, screamer: 0.34 },
    maxActiveEnemies: 8,
    introCutscene: {
      id: 'ch10_intro',
      chapter: 10,
      title: 'Act II · Inspection Bay Ambush',
      subtitle: 'Repair Hangars #1 & #2 · 01:39',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'RADIO LOG · 01:39',
          timestamp: '01:39:14',
          text: 'Three heavy welding busbars still bridge the depot grid directly into Substation Luch-94.',
        },
      ],
    },
  },
  {
    chapter: 11,
    zoneId: 'depot',
    clockLabel: '01:49',
    title: 'Chapter 11: Dispatch Tower Signal',
    objectiveSummary: 'Align the Dispatch Tower dish and unlock the North Tunnel Gate.',
    targetKills: 10,
    hasBoss: false,
    spawnWeights: { crawler: 0.25, lampshade: 0.37, screamer: 0.38 },
    maxActiveEnemies: 8,
    introCutscene: {
      id: 'ch11_intro',
      chapter: 11,
      title: 'Act II · Dispatch Tower Signal',
      subtitle: 'Radio Mast Sector · 01:49',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'DISPATCH TOWER · 01:49',
          timestamp: '01:49:06',
          text: 'Triangulate the antenna toward Luch-94 — the tunnel road to the real Resonator is just ahead.',
        },
      ],
    },
  },
  {
    chapter: 12,
    zoneId: 'depot',
    clockLabel: '01:58',
    title: 'Chapter 12: Phantom Convoy Warden',
    objectiveSummary: 'Defeat the Depot Watchman Warden to open the tunnel to Luch-94.',
    targetKills: 1,
    hasBoss: true,
    spawnWeights: { crawler: 0.34, lampshade: 0.33, screamer: 0.33 },
    maxActiveEnemies: 6,
    introCutscene: {
      id: 'ch12_intro',
      chapter: 12,
      title: 'Act II Finale · Phantom Convoy Warden',
      subtitle: 'Bus Depot #4 · 01:58 · Tunnel Threshold',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'BUS #404 HORN · 01:58',
          timestamp: '01:58:01',
          text: 'The Depot Warden emerges beside Bus #404, guarding the tunnel into Substation Luch-94!',
        },
      ],
    },
  },

  // ==================== ACT III: SUBSTATION "LUCH-94" & CORE (Chapters 13–18) ====================
  {
    chapter: 13,
    zoneId: 'substation',
    clockLabel: '02:06',
    title: 'Chapter 13: Gates of Luch-94',
    objectiveSummary: 'Shut down the SW and SE Cooling Pylon valves around the core.',
    targetKills: 8,
    hasBoss: false,
    spawnWeights: { crawler: 0.34, lampshade: 0.36, screamer: 0.3 },
    maxActiveEnemies: 7,
    introCutscene: {
      id: 'ch13_intro',
      chapter: 13,
      title: 'Act III · Gates of Luch-94',
      subtitle: 'Substation "Luch-94" · High-Voltage Yard · 02:06',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'SUB-STATION PA · 02:06',
          timestamp: '02:06:04',
          text: 'You step inside Substation Luch-94. The Resonator Core hums at the heart of the yard.',
        },
      ],
    },
  },
  {
    chapter: 14,
    zoneId: 'substation',
    clockLabel: '02:18',
    title: 'Chapter 14: Capacitor Storm',
    objectiveSummary: 'Discharge both West and East High-Voltage Capacitor Banks.',
    targetKills: 9,
    hasBoss: false,
    spawnWeights: { crawler: 0.3, lampshade: 0.36, screamer: 0.34 },
    maxActiveEnemies: 8,
    introCutscene: {
      id: 'ch14_intro',
      chapter: 14,
      title: 'Act III · Capacitor Storm',
      subtitle: 'Capacitor Halls · 02:18',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'MIKHAIL SAVELIEV · ARCHIVE',
          timestamp: '02:18:10',
          text: '"The machine is no longer obeying my tape — it is feeding on everyone who fears tomorrow."',
        },
      ],
    },
  },
  {
    chapter: 15,
    zoneId: 'substation',
    clockLabel: '02:30',
    title: 'Chapter 15: The Archive Bunker',
    objectiveSummary: 'Unlock the Archive Bunker cipher and retrieve Mikhail’s master tape.',
    targetKills: 10,
    hasBoss: false,
    spawnWeights: { crawler: 0.28, lampshade: 0.36, screamer: 0.36 },
    maxActiveEnemies: 8,
    introCutscene: {
      id: 'ch15_intro',
      chapter: 15,
      title: 'Act III · The Archive Bunker',
      subtitle: 'North Vault · Master Tape LOOP_00 · 02:30',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'VAULT TERMINAL · 02:30',
          timestamp: '02:30:05',
          text: 'Inside the Archive Bunker lies the true master reel of October 14, 1994.',
        },
      ],
    },
  },
  {
    chapter: 16,
    zoneId: 'substation',
    clockLabel: '02:41',
    title: 'Chapter 16: Mirror Corridor',
    objectiveSummary: 'Trip the NW & NE Pylon breakers and the South Gatehouse shunt.',
    targetKills: 11,
    hasBoss: false,
    spawnWeights: { crawler: 0.26, lampshade: 0.35, screamer: 0.39 },
    maxActiveEnemies: 9,
    introCutscene: {
      id: 'ch16_intro',
      chapter: 16,
      title: 'Act III · Mirror Corridor',
      subtitle: 'Magnetic Containment Ring · 02:41',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'RESONATOR TELEMETRY · 02:41',
          timestamp: '02:41:12',
          text: 'Reality fractures across the yard — break all three containment locks to expose the Core!',
        },
      ],
    },
  },
  {
    chapter: 17,
    zoneId: 'substation',
    clockLabel: '02:52',
    title: 'Chapter 17: Core Overload',
    objectiveSummary: 'Pull both Resonator Core limiters and survive the final swarm.',
    targetKills: 12,
    hasBoss: false,
    spawnWeights: { crawler: 0.24, lampshade: 0.36, screamer: 0.4 },
    maxActiveEnemies: 9,
    introCutscene: {
      id: 'ch17_intro',
      chapter: 17,
      title: 'Act III · Core Overload',
      subtitle: 'Resonator Core Ring · 02:52',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'GRISHA · DAWN HERALD',
          timestamp: '02:52:09',
          text: 'Pull both limiters right beside the glowing Core — sunrise is one heartbeat away!',
        },
      ],
    },
  },
  {
    chapter: 18,
    zoneId: 'substation',
    clockLabel: '02:59',
    title: 'Chapter 18: The True Midnight Watchman',
    objectiveSummary: 'Destroy the True Midnight Watchman at the Resonator Core to bring 06:00 Dawn.',
    targetKills: 1,
    hasBoss: true,
    spawnWeights: { crawler: 0.32, lampshade: 0.34, screamer: 0.34 },
    maxActiveEnemies: 7,
    introCutscene: {
      id: 'ch18_intro',
      chapter: 18,
      title: 'Grand Finale · The True Watchman',
      subtitle: 'Substation "Luch-94" Core · 02:59 · Break The Loop',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'MIKHAIL SAVELIEV · FINAL SIGNAL',
          timestamp: '02:59:04',
          text: 'The Resonator sheds its final shell. Shatter the True Midnight Watchman and let October 15, 1994 begin!',
        },
      ],
    },
  },
];

// Localized Russian & English story data for Chapters 7–18 (Chapters 1–6 stay seamless in i18n.ts and extend cleanly!)
export const EXTRA_CHAPTER_META_RU: ChapterLocaleMeta[] = [
  {
    title: 'Глава 7: Шоссе и КПП-3',
    objectiveSummary: 'Запитайте шлагбаум КПП-3 и восточный генератор на въезде в Автопарк №4.',
    introCutscene: {
      id: 'ch7_intro',
      chapter: 7,
      title: 'Акт II · Шоссе и КПП-3',
      subtitle: 'Заброшенный Автопарк №4 · 01:08 · Новая локация',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'ШЛАГБАУМ КПП-3 · 01:08',
          timestamp: '01:08:04',
          text: 'Проекция Смотрителя на площади рассыпалась, но дождь не кончился: «Москвич» прорвался сквозь северный шлагбаум и выкатился на бетонный плац Автопарка №4. Здесь петля вдвое глубже.',
        },
        {
          speaker: 'ПОВОРОТ СЮЖЕТА · АВТОБУС №404',
          timestamp: '01:08:21',
          text: 'В центре пустого плаца, прямо под синими прожекторами, стоит застывший оранжево-белый автобус №404 с горящими фарами. Внутри никого нет — но в салоне всё ещё работает рация.',
        },
        {
          speaker: 'ЗАДАЧА · ЭНЕРГИЯ КПП',
          timestamp: '01:08:35',
          text: 'Запустите рубильник КПП-3 и восточный генератор [E], чтобы оживить прожекторы автопарка и открыть доступ к чёрному ящику автобуса.',
        },
      ],
    },
  },
  {
    title: 'Глава 8: Призрак рейса №404',
    objectiveSummary: 'Заберите чёрный ящик в кабине автобуса №404 и консоль западного ангара.',
    introCutscene: {
      id: 'ch8_intro',
      chapter: 8,
      title: 'Акт II · Призрак рейса №404',
      subtitle: 'Центральный плац Автопарка №4 · 01:17',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'БОРТОВОЙ САМОПИСЕЦ · РЕЙС №404',
          timestamp: '01:17:09',
          text: 'Когда зажглись прожекторы, корпус автобуса пошёл рябью. Это не сам автобус — это его магнитный слепок! Резонатор деда отразился от вышки автопарка и скопировал всю трассу целиком.',
        },
        {
          speaker: 'ГРИША · ЧУТЬЁ',
          timestamp: '01:17:24',
          text: 'Гриша тревожно забил крыльями у ворот ремонтного ангара: в смотровых канавах прячутся твари, стянувшиеся на гул дизеля.',
        },
        {
          speaker: 'ЗАДАЧА',
          timestamp: '01:17:38',
          text: 'Снимите показания с кабины автобуса №404 и консоли западного ангара [E], отбиваясь от засады.',
        },
      ],
    },
  },
  {
    title: 'Глава 9: Топливные цистерны',
    objectiveSummary: 'Перекройте 2 клапана топливных цистерн в северо-западном секторе.',
    introCutscene: {
      id: 'ch9_intro',
      chapter: 9,
      title: 'Акт II · Топливные цистерны',
      subtitle: 'Северо-западный топливный узел · 01:28',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'ЗАПИСЬ МЕХАНИКА · АВТОПАРК №4',
          timestamp: '01:28:06',
          text: '«Подстанция „Луч-94“ сосёт аварийный ток прямо с наших дизельных генераторов! Пока качают цистерны, магнитный мост между посёлком и автопарком не рухнет».',
        },
        {
          speaker: 'ЗАДАЧА',
          timestamp: '01:28:22',
          text: 'Прорвитесь к двум ржавым цистернам на северо-западе и перекройте оба клапана Альфа и Бета [E].',
        },
      ],
    },
  },
  {
    title: 'Глава 10: Засада в ремонтных боксах',
    objectiveSummary: 'Разомкните 3 силовые шины в восточном ангаре, на плацу и западной площадке.',
    introCutscene: {
      id: 'ch10_intro',
      chapter: 10,
      title: 'Акт II · Засада в ремонтных боксах',
      subtitle: 'Ремонтные ангары №1 и №2 · 01:39',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'РАДИОПЕРЕХВАТ · ПОДСТАНЦИЯ «ЛУЧ-94»',
          timestamp: '01:39:05',
          text: 'Цистерны замолчали — и в эфире впервые пробился настоящий источник гула: закрытая подстанция «Луч-94» за северным тоннелем. Именно там Михаил спрятал настоящее ядро резонатора.',
        },
        {
          speaker: 'НАТИСК ТЕНЕЙ',
          timestamp: '01:39:19',
          text: 'Скримеры и Тени хлынули из обоих ремонтных ангаров, защищая последние три силовые шины автопарка.',
        },
        {
          speaker: 'ЗАДАЧА',
          timestamp: '01:39:33',
          text: 'Отключите 3 силовые точки [E]: в восточном ангаре, на центральном плацу и на западной площадке прожекторов.',
        },
      ],
    },
  },
  {
    title: 'Глава 11: Диспетчерская вышка',
    objectiveSummary: 'Наведите антенну диспетчерской вышки и откройте замок северного тоннеля.',
    introCutscene: {
      id: 'ch11_intro',
      chapter: 11,
      title: 'Акт II · Диспетчерская вышка',
      subtitle: 'Сектор радиомачты · 01:49',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'ДИСПЕТЧЕРСКАЯ · 01:49',
          timestamp: '01:49:08',
          text: 'На верхней площадке вышки всё ещё крутится ржавый радар. Если развернуть антенну в противофазу, магнитный замок северного тоннеля на «Луч-94» откроется.',
        },
        {
          speaker: 'ЗАДАЧА',
          timestamp: '01:49:23',
          text: 'Перенастройте антенну диспетчерской вышки и снимите блокировку ворот северного тоннеля [E].',
        },
      ],
    },
  },
  {
    title: 'Глава 12: Страж Призрачного Конвоя',
    objectiveSummary: 'Уничтожьте Стража Автопарка у автобуса №404 и прорвитесь к подстанции «Луч-94».',
    introCutscene: {
      id: 'ch12_intro',
      chapter: 12,
      title: 'Финал Акта II · Страж Конвоя',
      subtitle: 'Автопарк №4 · 01:58 · Ворота тоннеля',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'ГУДОК АВТОБУСА №404 · 01:58',
          timestamp: '01:58:02',
          text: 'Замок тоннеля щёлкнул — и фары автобуса №404 вспыхнули ослепительным янтарём. Из бетонного смога шагнул Страж Конвоя — усиленная оболочка Смотрителя, спаянная из гула ночной трассы.',
        },
        {
          speaker: 'РЕШИМОСТЬ',
          timestamp: '01:58:18',
          text: 'Разбейте Стража на плацу автопарка — за северным тоннелем нас ждёт само сердце петли, подстанция «Луч-94»!',
        },
      ],
    },
  },
  {
    title: 'Глава 13: Ворота «Луча-94»',
    objectiveSummary: 'Отключите клапаны юго-западного и юго-восточного пилонов охлаждения.',
    introCutscene: {
      id: 'ch13_intro',
      chapter: 13,
      title: 'Акт III · Ворота «Луча-94»',
      subtitle: 'Подстанция «Луч-94» · 02:06 · Финальная локация',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'ГРОМКОГОВОРИТЕЛЬ «ЛУЧ-94» · 02:06',
          timestamp: '02:06:04',
          text: 'Тоннель вывел вас прямо во двор режимной подстанции «Луч-94». В центре кольца, оплетённый синими молниями, пульсирует гигантский катушечный Резонатор LOOP_00.',
        },
        {
          speaker: 'ОТКРОВЕНИЕ · ГОЛОС ДЕДА',
          timestamp: '02:06:19',
          text: '«Внук... я пытался выключить его ещё в девяносто пятом, но машина научилась питаться тревогой каждого, кто помнит ту ночь. Сначала остуди пилоны, иначе к ядру не подойти!»',
        },
        {
          speaker: 'ЗАДАЧА',
          timestamp: '02:06:34',
          text: 'Отключите оба южных пилона охлаждения [E] по бокам двора подстанции.',
        },
      ],
    },
  },
  {
    title: 'Глава 14: Гроза конденсаторов',
    objectiveSummary: 'Разрядите западный и восточный залы высоковольтных конденсаторов.',
    introCutscene: {
      id: 'ch14_intro',
      chapter: 14,
      title: 'Акт III · Гроза конденсаторов',
      subtitle: 'Высоковольтные залы · 02:18',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'ТЕЛЕМЕТРИЯ «ЛУЧ-94» · 02:18',
          timestamp: '02:18:07',
          text: 'Южные пилоны затихли, но огромные конденсаторные батареи по флангам продолжают закачивать мегаватты в магнитное кольцо. Воздух пахнет озоном и мокрой сталью.',
        },
        {
          speaker: 'ЗАДАЧА',
          timestamp: '02:18:22',
          text: 'Пробейтесь к западному и восточному блокам конденсаторов и сбросьте их заряд [E].',
        },
      ],
    },
  },
  {
    title: 'Глава 15: Архивный бункер',
    objectiveSummary: 'Снимите шифрозамок северного бункера и заберите мастер-катушку LOOP_00.',
    introCutscene: {
      id: 'ch15_intro',
      chapter: 15,
      title: 'Акт III · Архивный бункер',
      subtitle: 'Северный бункер · Исповедь Савельева · 02:30',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'АРХИВНЫЙ БУНКЕР · 02:30',
          timestamp: '02:30:04',
          text: 'За ядром открылся бетонный вход в архивный бункер инженеров. Там хранится оригинальная мастер-катушка 14 октября 1994 года и ключ аварийной остановки.',
        },
        {
          speaker: 'ПОСЛЕДНЯЯ ТАЙНА',
          timestamp: '02:30:19',
          text: 'Мать и все пассажиры рейса №404 давно живут в настоящем — но Михаил оставил в петле собственную тень, чтобы никто другой не потерял близких в том дожде.',
        },
        {
          speaker: 'ЗАДАЧА',
          timestamp: '02:30:33',
          text: 'Разблокируйте шифрозамок и заберите мастер-катушку на деке бункера [E].',
        },
      ],
    },
  },
  {
    title: 'Глава 16: Зеркальный коридор',
    objectiveSummary: 'Вырубите северные пилоны С-З, С-В и шунт у южного КПП подстанции.',
    introCutscene: {
      id: 'ch16_intro',
      chapter: 16,
      title: 'Акт III · Зеркальный коридор',
      subtitle: 'Магнитный контур сдерживания · 02:41',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'СБОЙ РЕАЛЬНОСТИ · 02:41',
          timestamp: '02:41:08',
          text: 'Как только вы сняли мастер-катушку, Резонатор перешёл в режим самозащиты: небо над «Лучом-94» раскололось синими дугами, а твари пошли сплошной стеной.',
        },
        {
          speaker: 'ЗАДАЧА',
          timestamp: '02:41:23',
          text: 'Отключите 3 последних узла сдерживания [E]: северные пилоны С-З и С-В и шунт у главных ворот.',
        },
      ],
    },
  },
  {
    title: 'Глава 17: Перегрузка Ядра',
    objectiveSummary: 'Сорвите оба ограничителя прямо у Ядра Резонатора и выдержите финальную волну.',
    introCutscene: {
      id: 'ch17_intro',
      chapter: 17,
      title: 'Акт III · Перегрузка Ядра',
      subtitle: 'Кольцо Резонатора · 02:52',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'ГРИША · ВЕСТНИК РАССВЕТА',
          timestamp: '02:52:06',
          text: 'Защитный купол Ядра пал! Гриша взмыл над кольцом искр и звонко прокричал — за горизонтом впервые за тридцать лет блеснула живая полоска рассвета.',
        },
        {
          speaker: 'ЗАДАЧА',
          timestamp: '02:52:21',
          text: 'Сорвите западный и восточный ограничители прямо у Ядра [E] и отбейте последний натиск теней!',
        },
      ],
    },
  },
  {
    title: 'Глава 18: Истинный Смотритель Полночи',
    objectiveSummary: 'Сокрушите Истинного Полуночного Смотрителя у Ядра Резонатора и верните рассвет 06:00!',
    introCutscene: {
      id: 'ch18_intro',
      chapter: 18,
      title: 'Гранд-финал · Истинный Смотритель',
      subtitle: 'Ядро подстанции «Луч-94» · 02:59 · Конец петли',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'ЯДРО РЕЗОНАТОРА · 02:59',
          timestamp: '02:59:03',
          text: 'Обе катушки Ядра раскалились добела. Из самого сердца LOOP_00 вырвался Истинный Полуночный Смотритель — воплощение всех запертых ночей, страхов и тридцатилетнего эха 1994 года.',
        },
        {
          speaker: 'ФИНАЛЬНЫЙ ВЫСТРЕЛ',
          timestamp: '02:59:19',
          text: '«Пора домой, дед. Эта ночь закончена». Все стволы наготове, Гриша прикрывает с фланга — разбейте Истинного Смотрителя и подарите Негрузино настоящее утро 15 октября!',
        },
      ],
    },
  },
];

export const EXTRA_CHAPTER_META_EN: ChapterLocaleMeta[] = [
  {
    title: 'Chapter 7: Highway Checkpoint-3',
    objectiveSummary: 'Power the KPP-3 barrier breaker and east generator at Bus Depot #4.',
    introCutscene: {
      id: 'ch7_intro',
      chapter: 7,
      title: 'Act II · Highway Checkpoint-3',
      subtitle: 'Abandoned Bus Depot #4 · 01:08 · New Location',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'CHECKPOINT-3 BARRIER · 01:08',
          timestamp: '01:08:04',
          text: 'The square projection shattered, yet the rain refused to lift. Your Moskvitch punches past the northern gate onto the cracked tarmac of Bus Depot #4.',
        },
        {
          speaker: 'PLOT TWIST · BUS #404',
          timestamp: '01:08:21',
          text: 'Right under the cold blue floodlights sits Bus #404, headlights glowing in the rain. No passengers inside — only a live radio humming on the dashboard.',
        },
        {
          speaker: 'OBJECTIVE',
          timestamp: '01:08:35',
          text: 'Restore the KPP-3 barrier breaker and the east generator shed [E] to light the depot tarmac.',
        },
      ],
    },
  },
  {
    title: 'Chapter 8: Ghost of Bus #404',
    objectiveSummary: 'Recover Bus #404 black box and the West Hangar inspection console.',
    introCutscene: {
      id: 'ch8_intro',
      chapter: 8,
      title: 'Act II · Ghost of Bus #404',
      subtitle: 'Central Depot Tarmac · 01:17',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'BUS #404 BLACK BOX',
          timestamp: '01:17:09',
          text: 'The bus flickers under the lamps — it is a magnetic imprint! Grandfather’s signal bounced off the depot mast and cloned the entire highway night.',
        },
        {
          speaker: 'OBJECTIVE',
          timestamp: '01:17:26',
          text: 'Pull the Bus #404 recorder and the West Hangar telemetry console [E] while holding back the ambush.',
        },
      ],
    },
  },
  {
    title: 'Chapter 9: Fuel Cistern Blackout',
    objectiveSummary: 'Shut off 2 fuel cistern valves in the northwest tank farm.',
    introCutscene: {
      id: 'ch9_intro',
      chapter: 9,
      title: 'Act II · Fuel Cistern Blackout',
      subtitle: 'Northwest Tank Farm · 01:28',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'DEPOT MECHANIC LOG',
          timestamp: '01:28:06',
          text: '"Substation Luch-94 is siphoning emergency power straight from our diesel tanks! Cut the fuel valves or the highway bridge never drops."',
        },
        {
          speaker: 'OBJECTIVE',
          timestamp: '01:28:22',
          text: 'Fight into the northwest tank farm and close both Cistern Valves Alpha and Beta [E].',
        },
      ],
    },
  },
  {
    title: 'Chapter 10: Inspection Bay Ambush',
    objectiveSummary: 'Sever 3 depot busbars across the East Hangar, tarmac, and west yard.',
    introCutscene: {
      id: 'ch10_intro',
      chapter: 10,
      title: 'Act II · Inspection Bay Ambush',
      subtitle: 'Repair Hangars #1 & #2 · 01:39',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'INTERCEPT · SUBSTATION LUCH-94',
          timestamp: '01:39:05',
          text: 'With the tanks silent, the real source roars beyond the north tunnel: classified Substation Luch-94, where Mikhail hid the true Resonator Core.',
        },
        {
          speaker: 'OBJECTIVE',
          timestamp: '01:39:22',
          text: 'Cut 3 power links [E] across the East Hangar, central tarmac, and west floodlight yard.',
        },
      ],
    },
  },
  {
    title: 'Chapter 11: Dispatch Tower Signal',
    objectiveSummary: 'Align the Dispatch Tower dish and unlock the North Tunnel Gate.',
    introCutscene: {
      id: 'ch11_intro',
      chapter: 11,
      title: 'Act II · Dispatch Tower Signal',
      subtitle: 'Radio Mast Sector · 01:49',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'DISPATCH TOWER · 01:49',
          timestamp: '01:49:08',
          text: 'Turn the rusted roof radar out of phase to pop the magnetic lock on the northern tunnel to Luch-94.',
        },
        {
          speaker: 'OBJECTIVE',
          timestamp: '01:49:23',
          text: 'Align the Dispatch Tower dish and release the North Tunnel Gate lock [E].',
        },
      ],
    },
  },
  {
    title: 'Chapter 12: Phantom Convoy Warden',
    objectiveSummary: 'Defeat the Depot Watchman Warden beside Bus #404 to reach Luch-94.',
    introCutscene: {
      id: 'ch12_intro',
      chapter: 12,
      title: 'Act II Finale · Convoy Warden',
      subtitle: 'Bus Depot #4 · 01:58 · Tunnel Threshold',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'BUS #404 HORN · 01:58',
          timestamp: '01:58:02',
          text: 'The tunnel lock clicks open — and the Convoy Warden steps from the diesel fog beside Bus #404 to guard the road to Luch-94!',
        },
      ],
    },
  },
  {
    title: 'Chapter 13: Gates of Luch-94',
    objectiveSummary: 'Shut down the SW and SE Cooling Pylon valves around the core.',
    introCutscene: {
      id: 'ch13_intro',
      chapter: 13,
      title: 'Act III · Gates of Luch-94',
      subtitle: 'Substation "Luch-94" · 02:06 · Final Location',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'LUCH-94 PA SYSTEM · 02:06',
          timestamp: '02:06:04',
          text: 'Beyond the tunnel lies Substation Luch-94. At its heart pulses the true LOOP_00 Resonator Core, wreathed in electric arcs.',
        },
        {
          speaker: 'MIKHAIL SAVELIEV · TRANSMISSION',
          timestamp: '02:06:20',
          text: '"I tried to shut it down in 1995, grandson, but it feeds on every soul afraid of tomorrow. Cut the cooling pylons first!"',
        },
      ],
    },
  },
  {
    title: 'Chapter 14: Capacitor Storm',
    objectiveSummary: 'Discharge both West and East High-Voltage Capacitor Banks.',
    introCutscene: {
      id: 'ch14_intro',
      chapter: 14,
      title: 'Act III · Capacitor Storm',
      subtitle: 'High-Voltage Halls · 02:18',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'LUCH-94 TELEMETRY · 02:18',
          timestamp: '02:18:07',
          text: 'Two massive capacitor halls still pump megawatts into the Core. Drain both banks [E] before the storm seals the yard.',
        },
      ],
    },
  },
  {
    title: 'Chapter 15: The Archive Bunker',
    objectiveSummary: 'Unlock the Archive Bunker cipher and retrieve Mikhail’s master tape.',
    introCutscene: {
      id: 'ch15_intro',
      chapter: 15,
      title: 'Act III · The Archive Bunker',
      subtitle: 'North Vault · Saveliev’s Confession · 02:30',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'ARCHIVE BUNKER · 02:30',
          timestamp: '02:30:04',
          text: 'North of the Core sits the engineers’ vault holding the original October 14, 1994 master reel and the emergency shutdown cipher.',
        },
        {
          speaker: 'OBJECTIVE',
          timestamp: '02:30:22',
          text: 'Crack the vault cipher lock and pull the master tape deck [E].',
        },
      ],
    },
  },
  {
    title: 'Chapter 16: Mirror Corridor',
    objectiveSummary: 'Trip the NW & NE Pylon breakers and the South Gatehouse shunt.',
    introCutscene: {
      id: 'ch16_intro',
      chapter: 16,
      title: 'Act III · Mirror Corridor',
      subtitle: 'Magnetic Containment Ring · 02:41',
      image: ASSET_PATHS.cutsceneStreet,
      beats: [
        {
          speaker: 'CONTAINMENT BREACH · 02:41',
          timestamp: '02:41:08',
          text: 'The Resonator lashes back! Trip both northern pylons and the gatehouse grounding shunt [E] to strip its shield.',
        },
      ],
    },
  },
  {
    title: 'Chapter 17: Core Overload',
    objectiveSummary: 'Pull both Resonator Core limiters and survive the final swarm.',
    introCutscene: {
      id: 'ch17_intro',
      chapter: 17,
      title: 'Act III · Core Overload',
      subtitle: 'Resonator Core Ring · 02:52',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'GRISHA · DAWN HERALD',
          timestamp: '02:52:06',
          text: 'The Core shield drops! Pull the West and East Core limiters [E] right beside the coils and hold off the last swarm!',
        },
      ],
    },
  },
  {
    title: 'Chapter 18: The True Midnight Watchman',
    objectiveSummary: 'Destroy the True Midnight Watchman at the Core to bring 06:00 Dawn!',
    introCutscene: {
      id: 'ch18_intro',
      chapter: 18,
      title: 'Grand Finale · The True Watchman',
      subtitle: 'Substation "Luch-94" Core · 02:59 · End The Loop',
      image: ASSET_PATHS.cutsceneWatchman,
      beats: [
        {
          speaker: 'RESONATOR CORE · 02:59',
          timestamp: '02:59:03',
          text: 'The coils glow blinding white. From the heart of LOOP_00 steps the True Midnight Watchman — thirty years of trapped rain and grief.',
        },
        {
          speaker: 'FINAL STAND',
          timestamp: '02:59:19',
          text: '"Time to come home, Grandfather." Shatter the True Watchman and let October 15, 1994 finally dawn!',
        },
      ],
    },
  },
];

export const EXTRA_OBJECTIVE_LABELS_RU: Record<string, string> = {
  ch7_kpp_1: 'Рубильник шлагбаума КПП-3 (Запад)',
  ch7_kpp_2: 'Генератор шоссе (Восточный пост)',
  ch8_bus_1: 'Чёрный ящик автобуса №404',
  ch8_bus_2: 'Консоль смотровой канавы (Западный ангар)',
  ch9_fuel_1: 'Клапан цистерны Альфа (С-З)',
  ch9_fuel_2: 'Клапан цистерны Бета (С-З)',
  ch10_bay_1: 'Силовая шина (Восточный ангар)',
  ch10_bay_2: 'Щит центрального плаца',
  ch10_bay_3: 'Реле прожекторов (Западный двор)',
  ch11_tower_1: 'Антенна диспетчерской вышки (С-В)',
  ch11_tower_2: 'Замок ворот северного тоннеля',
  ch13_pylon_1: 'Клапан пилона охлаждения Ю-З',
  ch13_pylon_2: 'Клапан пилона охлаждения Ю-В',
  ch14_cap_1: 'Разрядник западных конденсаторов',
  ch14_cap_2: 'Разрядник восточных конденсаторов',
  ch15_vault_1: 'Шифрозамок архивного бункера',
  ch15_vault_2: 'Мастер-дека катушки LOOP_00',
  ch16_mirror_1: 'Автомат пилона охлаждения С-З',
  ch16_mirror_2: 'Автомат пилона охлаждения С-В',
  ch16_mirror_3: 'Шунт заземления главных ворот',
  ch17_core_1: 'Ограничитель Ядра (Запад)',
  ch17_core_2: 'Ограничитель Ядра (Восток)',
};

export const EXTRA_OBJECTIVE_LABELS_EN: Record<string, string> = {
  ch7_kpp_1: 'KPP-3 Barrier Breaker (West)',
  ch7_kpp_2: 'Highway Generator Switch (East)',
  ch8_bus_1: 'Bus #404 Black Box Recorder',
  ch8_bus_2: 'West Hangar Inspection Console',
  ch9_fuel_1: 'Cistern Valve Alpha (NW)',
  ch9_fuel_2: 'Cistern Valve Beta (NW)',
  ch10_bay_1: 'East Hangar Welding Busbar',
  ch10_bay_2: 'Central Tarmac Signal Box',
  ch10_bay_3: 'West Yard Floodlight Relay',
  ch11_tower_1: 'Dispatch Tower Antenna (NE)',
  ch11_tower_2: 'North Tunnel Gate Lock',
  ch13_pylon_1: 'Cooling Pylon SW Valve',
  ch13_pylon_2: 'Cooling Pylon SE Valve',
  ch14_cap_1: 'West Capacitor Discharge',
  ch14_cap_2: 'East Capacitor Discharge',
  ch15_vault_1: 'Archive Bunker Cipher Lock',
  ch15_vault_2: 'LOOP_00 Master Tape Deck',
  ch16_mirror_1: 'Cooling Pylon NW Breaker',
  ch16_mirror_2: 'Cooling Pylon NE Breaker',
  ch16_mirror_3: 'Gatehouse Grounding Shunt',
  ch17_core_1: 'Resonator Core Limiter West',
  ch17_core_2: 'Resonator Core Limiter East',
};

export const EXTRA_STORY_LOGS_RU: Record<string, StoryLogEntry> = {
  ch7_start: { speaker: 'КПП-3 · 01:08', text: 'Вы в Автопарке №4! Запитайте рубильник КПП-3 и восточный генератор [E].' },
  ch7_kpp_1: { speaker: 'ПОСТ КПП-3', text: 'Шлагбаум дрогнул — на табло высветилась дата «14.10.1994 · РЕЙС 404 ЗАДЕРЖАН».' },
  ch7_kpp_2: { speaker: 'ГЕНЕРАТОР ШОССЕ', text: 'Прожекторы плаца вспыхнули! В центре стоит призрачный остов автобуса №404.' },
  ch8_start: { speaker: 'АВТОБУС №404 · 01:17', text: 'Проверьте чёрный ящик в кабине автобуса и консоль западного ангара [E].' },
  ch8_bus_1: { speaker: 'САМОПИСЕЦ №404', text: 'На плёнке слышно, как пассажиры смеются и пьют чай на сухом посту — это лишь отражение.' },
  ch8_bus_2: { speaker: 'ЗАПАДНЫЙ АНГАР', text: 'Телеметрия показала утечку мощности к северо-западным топливным цистернам!' },
  ch9_start: { speaker: 'ТОПЛИВНЫЙ УЗЕЛ · 01:28', text: 'Дизели питают петлю! Перекройте оба клапана цистерн на северо-западе [E].' },
  ch9_fuel_1: { speaker: 'КЛАПАН АЛЬФА', text: 'Давление упало вдвое — слышен визг срываемых турбин за ангарами.' },
  ch9_fuel_2: { speaker: 'КЛАПАН БЕТА', text: 'Подача дизеля перекрыта! Но силовые шины ангаров всё ещё горят дугой.' },
  ch10_start: { speaker: 'РЕМОНТНЫЕ БОКСЫ · 01:39', text: 'Обесточьте 3 силовые шины автопарка [E] и держите оборону!' },
  ch10_bay_1: { speaker: 'ВОСТОЧНЫЙ АНГАР', text: 'Первая шина погашена! Остались центральный плац и западный прожектор.' },
  ch10_bay_2: { speaker: 'ЦЕНТРАЛЬНЫЙ ПЛАЦ', text: 'Сигнал к подстанции «Луч-94» ослаб — ещё один узел!' },
  ch10_bay_3: { speaker: 'ЗАПАДНЫЙ ДВОР', text: 'Все шины обесточены! Диспетчерская вышка на северо-востоке готова к перенастройке.' },
  ch11_start: { speaker: 'ДИСПЕТЧЕРСКАЯ · 01:49', text: 'Разверните антенну вышки и снимите замок северного тоннеля [E].' },
  ch11_tower_1: { speaker: 'РАДИОМАЧТА', text: 'Противофаза поймана! Магнитная заслонка тоннеля искрит — бегите к северным воротам.' },
  ch11_tower_2: { speaker: 'СЕВЕРНЫЙ ТОННЕЛЬ', text: 'Замок сорван! Но гудок автобуса №404 созвал Стража Конвоя!' },
  ch12_start: { speaker: 'АВТОПАРК №4 · 01:58', text: 'Страж Конвоя вышел на плац! Сокрушите его, чтобы прорваться в «Луч-94»!' },
  ch13_start: { speaker: 'ПОДСТАНЦИЯ «ЛУЧ-94» · 02:06', text: 'Вы внутри «Луча-94»! Остудите юго-западный и юго-восточный пилоны [E].' },
  ch13_pylon_1: { speaker: 'ПИЛОН Ю-З', text: 'Пар вырвался в ночное небо — температура внешнего контура пошла вниз.' },
  ch13_pylon_2: { speaker: 'ПИЛОН Ю-В', text: 'Южные пилоны остановлены! Теперь разрядите залы конденсаторов по бокам двора.' },
  ch14_start: { speaker: 'КОНДЕНСАТОРЫ · 02:18', text: 'Разрядите западный и восточный блоки высоковольтных конденсаторов [E].' },
  ch14_cap_1: { speaker: 'ЗАПАДНЫЙ ЗАЛ', text: 'Молния ударила в громоотвод! Остался восточный конденсаторный блок.' },
  ch14_cap_2: { speaker: 'ВОСТОЧНЫЙ ЗАЛ', text: 'Заряд сброшен! Дверь северного архивного бункера наконец открыта.' },
  ch15_start: { speaker: 'АРХИВНЫЙ БУНКЕР · 02:30', text: 'Снимите шифрозамок и заберите мастер-катушку LOOP_00 у северного бункера [E].' },
  ch15_vault_1: { speaker: 'ШИФРОЗАМОК', text: 'Код «14-10-94» принят — бронедверь бункера отворилась!' },
  ch15_vault_2: { speaker: 'МАСТЕР-КАТУШКА', text: 'Катушка у вас! Резонатор впал в панику — вырубайте последние три узла сдерживания!' },
  ch16_start: { speaker: 'ЗЕРКАЛЬНЫЙ КОРИДОР · 02:41', text: 'Отключите северные пилоны С-З, С-В и шунт у главных ворот [E].' },
  ch16_mirror_1: { speaker: 'ПИЛОН С-З', text: 'Первый северный контур погашен!' },
  ch16_mirror_2: { speaker: 'ПИЛОН С-В', text: 'Второй северный контур сорван! Остался шунт у южного КПП.' },
  ch16_mirror_3: { speaker: 'ШУНТ ВОРОТ', text: 'Магнитный купол рухнул! Ядро Резонатора открыто для перегрузки!' },
  ch17_start: { speaker: 'ЯДРО РЕЗОНАТОРА · 02:52', text: 'Сорвите оба ограничителя прямо у Ядра [E] и выдержите последнюю волну!' },
  ch17_core_1: { speaker: 'ОГРАНИЧИТЕЛЬ ЗАПАД', text: 'Катушки завыли на пределе! Остался восточный ограничитель Ядра!' },
  ch17_core_2: { speaker: 'ОГРАНИЧИТЕЛЬ ВОСТОК', text: 'ПЕРЕГРУЗКА! Ядро сбрасывает последнюю оболочку — Истинный Смотритель идёт!' },
  ch18_start: { speaker: 'ЯДРО «ЛУЧ-94» · 02:59', text: 'Истинный Полуночный Смотритель вышел к Ядру! Покончите с петлёй 1994 года!' },
};

export const EXTRA_STORY_LOGS_EN: Record<string, StoryLogEntry> = {
  ch7_start: { speaker: 'KPP-3 · 01:08', text: 'You reached Bus Depot #4! Power the KPP-3 breaker and east generator [E].' },
  ch7_kpp_1: { speaker: 'KPP-3 BOOTH', text: 'The barrier shudders — display reads "14.10.1994 · ROUTE 404 DELAYED".' },
  ch7_kpp_2: { speaker: 'HIGHWAY GENERATOR', text: 'Depot floodlights flare on, revealing Bus #404 frozen on the tarmac!' },
  ch8_start: { speaker: 'BUS #404 · 01:17', text: 'Pull the Bus #404 black box and the West Hangar telemetry console [E].' },
  ch8_bus_1: { speaker: 'BUS #404 RECORDER', text: 'Laughter and warm tea on the tape — the real passengers made it safely.' },
  ch8_bus_2: { speaker: 'WEST HANGAR', text: 'Telemetry traces heavy power draw straight to the northwest fuel tanks!' },
  ch9_start: { speaker: 'TANK FARM · 01:28', text: 'Diesel generators feed the loop! Close Cistern Valves Alpha & Beta [E].' },
  ch9_fuel_1: { speaker: 'VALVE ALPHA', text: 'Pressure drops by half — turbines shriek behind the hangars.' },
  ch9_fuel_2: { speaker: 'VALVE BETA', text: 'Diesel cut! Three welding busbars still arc inside the repair bays.' },
  ch10_start: { speaker: 'REPAIR BAYS · 01:39', text: 'Sever all 3 depot busbars [E] and hold off the ambush!' },
  ch10_bay_1: { speaker: 'EAST HANGAR', text: 'First busbar severed — tarmac box and west floodlights remain.' },
  ch10_bay_2: { speaker: 'CENTRAL TARMAC', text: 'Link to Substation Luch-94 weakens — one relay left!' },
  ch10_bay_3: { speaker: 'WEST YARD', text: 'Busbars dead! Head northeast to align the Dispatch Tower dish.' },
  ch11_start: { speaker: 'DISPATCH TOWER · 01:49', text: 'Align the roof antenna and release the North Tunnel Gate lock [E].' },
  ch11_tower_1: { speaker: 'RADIO MAST', text: 'Counter-phase locked! Run to the northern tunnel gate.' },
  ch11_tower_2: { speaker: 'NORTH TUNNEL', text: 'Gate unlocked — but Bus #404’s horn summons the Convoy Warden!' },
  ch12_start: { speaker: 'BUS DEPOT #4 · 01:58', text: 'The Convoy Warden enters the tarmac! Defeat it to reach Luch-94!' },
  ch13_start: { speaker: 'LUCH-94 · 02:06', text: 'Inside Substation Luch-94! Shut off the SW and SE Cooling Pylons [E].' },
  ch13_pylon_1: { speaker: 'PYLON SW', text: 'Steam vents into the rain — outer coolant loop dropping.' },
  ch13_pylon_2: { speaker: 'PYLON SE', text: 'Southern pylons down! Now discharge both Capacitor Halls.' },
  ch14_start: { speaker: 'CAPACITORS · 02:18', text: 'Discharge the West and East High-Voltage Capacitor Banks [E].' },
  ch14_cap_1: { speaker: 'WEST HALL', text: 'Arcs dump to ground! East capacitor bank remains.' },
  ch14_cap_2: { speaker: 'EAST HALL', text: 'Capacitors drained! The North Archive Bunker is now accessible.' },
  ch15_start: { speaker: 'ARCHIVE BUNKER · 02:30', text: 'Crack the vault cipher and pull the LOOP_00 master tape [E].' },
  ch15_vault_1: { speaker: 'VAULT CIPHER', text: 'Code "14-10-94" accepted — vault seals release!' },
  ch15_vault_2: { speaker: 'MASTER REEL', text: 'Master reel secured! The Core panics — trip the last 3 containment locks!' },
  ch16_start: { speaker: 'MIRROR CORRIDOR · 02:41', text: 'Trip NW & NE Pylons plus the South Gatehouse grounding shunt [E].' },
  ch16_mirror_1: { speaker: 'PYLON NW', text: 'Northwest containment breaker tripped!' },
  ch16_mirror_2: { speaker: 'PYLON NE', text: 'Northeast breaker tripped — gatehouse shunt left!' },
  ch16_mirror_3: { speaker: 'GATE SHUNT', text: 'Containment dome shattered! The Resonator Core is exposed!' },
  ch17_start: { speaker: 'RESONATOR CORE · 02:52', text: 'Pull both Core limiters [E] and survive the final swarm!' },
  ch17_core_1: { speaker: 'WEST LIMITER', text: 'Coils screaming — pull the East Core limiter!' },
  ch17_core_2: { speaker: 'EAST LIMITER', text: 'OVERLOAD! The True Midnight Watchman emerges from the Core!' },
  ch18_start: { speaker: 'LUCH-94 CORE · 02:59', text: 'The True Midnight Watchman stands before you — end the 1994 loop forever!' },
};

export const EXTRA_STORY_TAPES_RU: Record<string, TapeLocaleMeta> = {
  tape_07: {
    code: 'МК-60 #07',
    title: 'Журнал КПП-3',
    location: 'Автопарк №4 · Въезд КПП-3',
    speaker: 'СЕРЖАНТ ГАИ · 14.10.1994',
    text: '«Ливень смыл кювет на девятом километре. Завернули автобус №404 обратно в автопарк на ночёвку. В Негрузино связь пропала — сплошной гул в трубке».',
  },
  tape_08: {
    code: 'МК-60 #08',
    title: 'Билет до Негрузино',
    location: 'Автопарк №4 · У автобуса №404',
    speaker: 'ВОДИТЕЛЬ РЕЙСА №404',
    text: '«В салоне осталась забытая авоська и кассета с роком. Странно: стрелка спидометра подрагивает, хотя мотор давно остыл».',
  },
  tape_09: {
    code: 'МК-60 #09',
    title: 'Записка механика',
    location: 'Автопарк №4 · Топливный узел',
    speaker: 'МЕХАНИК ИГНАТ · 1994',
    text: '«Кто-то прокинул высоковольтный кабель от наших резервных дизелей прямо в тоннель к старой подстанции „Луч-94“. Счётчик крутится назад».',
  },
  tape_10: {
    code: 'МК-60 #10',
    title: 'Тени в смотровой яме',
    location: 'Автопарк №4 · Восточный ангар',
    speaker: 'СТОРОЖ АВТОПАРКА',
    text: '«По ночам в ангаре слышны шаги, но следов на мокром бетоне нет. Только когда Гриша кукарекает вдали, прожекторы перестают мигать».',
  },
  tape_11: {
    code: 'МК-60 #11',
    title: 'Пеленг на «Луч-94»',
    location: 'Автопарк №4 · Диспетчерская вышка',
    speaker: 'ДИСПЕТЧЕР · 01:45',
    text: '«Антенна поймала несущую частоту 50,04 Гц из северного тоннеля. Это не авария — это зацикленный магнитный камертон».',
  },
  tape_12: {
    code: 'МК-60 #12',
    title: 'Ключ от тоннеля',
    location: 'Автопарк №4 · Северный тоннель',
    speaker: 'МИХАИЛ САВЕЛЬЕВ · 1995',
    text: '«Если ты прошёл автопарк, значит, ты сильнее моей ошибки. Не бойся синего света за тоннелем — я оставил аварийные рубильники на каждом пилоне».',
  },
  tape_13: {
    code: 'МК-60 #13',
    title: 'Паспорт объекта «Луч-94»',
    location: 'Подстанция «Луч-94» · Главные ворота',
    speaker: 'ИНЖЕНЕРНЫЙ ОТЧЁТ · 1991',
    text: '«Экспериментальный резонатор фазовой стабилизации законсервирован в 1991 году. Повторный запуск без экрана грозит локальной петлёй памяти».',
  },
  tape_14: {
    code: 'МК-60 #14',
    title: 'Заряд конденсаторов',
    location: 'Подстанция «Луч-94» · Западный зал',
    speaker: 'МИХАИЛ САВЕЛЬЕВ · ПОВТОР #44',
    text: '«Я перенаправил конденсаторы на удержание 23:59, думая, что выиграю час. Через неделю я понял, что машина запомнила мой страх лучше, чем мой голос».',
  },
  tape_15: {
    code: 'МК-60 #15',
    title: 'Исповедь из бункера',
    location: 'Подстанция «Луч-94» · Архивный бункер',
    speaker: 'МИХАИЛ САВЕЛЬЕВ · АРХИВ',
    text: '«Когда я наконец услышал, что твоя мать жива, я попытался выдернуть рубильник — но Смотритель уже отделился от Ядра и не пустил меня к пульту».',
  },
  tape_16: {
    code: 'МК-60 #16',
    title: 'Эффект зеркала',
    location: 'Подстанция «Луч-94» · Восточный зал',
    speaker: 'ТЕХНИЧЕСКИЙ ЛОГ LOOP_00',
    text: '«Каждый раз, когда петля сбрасывается, резонатор клонирует участок дороги и сгущает туман. Только живой голос рассвета рвёт синхронизацию».',
  },
  tape_17: {
    code: 'МК-60 #17',
    title: 'Инструкция по перегрузке',
    location: 'Подстанция «Луч-94» · Кольцо Ядра',
    speaker: 'МИХАИЛ САВЕЛЬЕВ · СРОЧНО',
    text: '«Сорви оба ограничителя прямо у Ядра. Смотритель потеряет броню и выйдет на открытый бой. Бей в фонарь — там заперта последняя секунда».',
  },
  tape_18: {
    code: 'МК-60 #18',
    title: 'Утро 15 октября',
    location: 'Подстанция «Луч-94» · Центр Ядра',
    speaker: 'ПИСЬМО СЕМЬЕ САВЕЛЬЕВЫХ',
    text: '«Если эта плёнка доиграет до конца — значит, наступило 06:00. Забирай Гришу, садись в „Москвич“ и поезжай навстречу солнцу. Я наконец спокоен».',
  },
};

export const EXTRA_STORY_TAPES_EN: Record<string, TapeLocaleMeta> = {
  tape_07: {
    code: 'MK-60 #07',
    title: 'Checkpoint-3 Log',
    location: 'Bus Depot #4 · KPP-3 Entry',
    speaker: 'TRAFFIC SERGEANT · 14.10.1994',
    text: '"Rain washed out the culvert at km 9. Held Bus #404 safely at the depot overnight. Phone lines to Negruzino only play a steady hum."',
  },
  tape_08: {
    code: 'MK-60 #08',
    title: 'Ticket to Negruzino',
    location: 'Bus Depot #4 · Beside Bus #404',
    speaker: 'ROUTE #404 DRIVER',
    text: '"Someone left a rock cassette on seat four. Weirdest part: the speedometer needle still twitches even with the engine cold."',
  },
  tape_09: {
    code: 'MK-60 #09',
    title: 'Mechanic’s Note',
    location: 'Bus Depot #4 · Fuel Tank Farm',
    speaker: 'MECHANIC IGNAT · 1994',
    text: '"Someone ran a high-voltage line from our backup diesels straight through the tunnel to Substation Luch-94. The meter spins backward."',
  },
  tape_10: {
    code: 'MK-60 #10',
    title: 'Steps in the Inspection Pit',
    location: 'Bus Depot #4 · East Hangar',
    speaker: 'DEPOT NIGHT WATCH',
    text: '"Footsteps echo in the hangar with zero tracks on wet concrete. Only when Grisha crows in the distance do the floodlights steady."',
  },
  tape_11: {
    code: 'MK-60 #11',
    title: 'Bearing to Luch-94',
    location: 'Bus Depot #4 · Dispatch Tower',
    speaker: 'DISPATCHER · 01:45',
    text: '"The roof dish locked onto 50.04 Hz from the north tunnel. That isn’t a power fault — it’s a magnetic tuning fork."',
  },
  tape_12: {
    code: 'MK-60 #12',
    title: 'Key to the Tunnel',
    location: 'Bus Depot #4 · North Tunnel',
    speaker: 'MIKHAIL SAVELIEV · 1995',
    text: '"If you crossed the depot, you are stronger than my mistake. Do not fear the blue arcs inside Luch-94 — I left manual breakers on every pylon."',
  },
  tape_13: {
    code: 'MK-60 #13',
    title: 'Luch-94 Dossier',
    location: 'Substation Luch-94 · Main Gate',
    speaker: 'ENGINEERING REPORT · 1991',
    text: '"Experimental phase resonator mothballed in 1991. Unshielded ignition risks localized temporal-memory looping."',
  },
  tape_14: {
    code: 'MK-60 #14',
    title: 'Capacitor Charge',
    location: 'Substation Luch-94 · West Hall',
    speaker: 'MIKHAIL SAVELIEV · LOOP #44',
    text: '"I routed the capacitor banks to hold 23:59 for one hour. A week later I realized the machine remembered my terror better than my voice."',
  },
  tape_15: {
    code: 'MK-60 #15',
    title: 'Bunker Confession',
    location: 'Substation Luch-94 · Archive Bunker',
    speaker: 'MIKHAIL SAVELIEV · ARCHIVE',
    text: '"When I finally heard your mother survived, I ran to pull the breaker — but the Watchman had already split from the Core and barred the console."',
  },
  tape_16: {
    code: 'MK-60 #16',
    title: 'Mirror Effect',
    location: 'Substation Luch-94 · East Hall',
    speaker: 'LOOP_00 TECHNICAL LOG',
    text: '"Each loop reset clones more of the highway and thickens the mist. Only a living dawn call breaks phase lock."',
  },
  tape_17: {
    code: 'MK-60 #17',
    title: 'Overload Protocol',
    location: 'Substation Luch-94 · Core Ring',
    speaker: 'MIKHAIL SAVELIEV · URGENT',
    text: '"Pull both limiters beside the Core. The Watchman will lose its shield and face you directly. Aim for the lantern — the trapped second lives inside."',
  },
  tape_18: {
    code: 'MK-60 #18',
    title: 'Morning of October 15',
    location: 'Substation Luch-94 · Core Center',
    speaker: 'LETTER TO THE SAVELIEV FAMILY',
    text: '"If this tape finishes playing, then 06:00 has arrived. Take Grisha, start the Moskvitch, and drive into the sun. I am finally at peace."',
  },
};
