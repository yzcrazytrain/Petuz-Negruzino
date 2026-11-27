import { buildSuburbLayout } from './rules';
import type { AABB, LampSpec, ObjectiveSpec, SuburbLayout, TapeSpec, ZoneId } from './types';

/**
 * Bright, safe golden-hour preparation garage courtyard ("Гаражный двор Савельевых · 1994").
 * Features free exploration, a 5-dummy firing range, an arsenal specs terminal,
 * and the parked Moskvitch-412 that launches the campaign when all players board.
 */
export function buildHubLayout(): SuburbLayout {
  const colliders: AABB[] = [
    // South garage workshop building behind player
    { id: 'hub_garage_main', minX: -14, maxX: 14, minZ: 18.5, maxZ: 24, height: 4.5, kind: 'house' },
    // West wooden tool shed
    { id: 'hub_west_shed', minX: -24, maxX: -17.5, minZ: -6, maxZ: 8, height: 3.4, kind: 'house' },
    // East timber cover & workbench canopy behind Specs Terminal
    { id: 'hub_east_bench', minX: 11.2, maxX: 14.5, minZ: 3.2, maxZ: 8.8, height: 1.5, kind: 'prop' },
    // Moskvitch-412 departure car solid body (boarding trigger surrounds it cleanly)
    { id: 'hub_moskvitch_body', minX: -10.8, maxX: -7.2, minZ: 2.2, maxZ: 6.6, height: 1.65, kind: 'prop' },
    // Firing range low waist-high safety counter separating walkway from range lane
    { id: 'hub_range_divider_l', minX: -12.5, maxX: -2.4, minZ: -2.6, maxZ: -1.8, height: 1.1, kind: 'prop' },
    { id: 'hub_range_divider_r', minX: 2.4, maxX: 12.5, minZ: -2.6, maxZ: -1.8, height: 1.1, kind: 'prop' },
    // Range backstop earthen/timber berm
    { id: 'hub_range_backstop', minX: -15, maxX: 15, minZ: -23.5, maxZ: -21.8, height: 3.6, kind: 'fence' },
    // Courtyard perimeter wooden fences
    { id: 'hub_fence_west', minX: -25.2, maxX: -24.6, minZ: -23, maxZ: 22, height: 2.2, kind: 'fence' },
    { id: 'hub_fence_east', minX: 24.6, maxX: 25.2, minZ: -23, maxZ: 22, height: 2.2, kind: 'fence' },
  ];

  const lamps: LampSpec[] = [
    { id: 'hub_lamp_1', x: -13.5, z: 12, armDirX: 1, flickerSeed: 0.4, hasPointLight: false },
    { id: 'hub_lamp_2', x: 13.5, z: 12, armDirX: -1, flickerSeed: 1.2, hasPointLight: false },
    { id: 'hub_lamp_3', x: -13.5, z: -12, armDirX: 1, flickerSeed: 2.1, hasPointLight: false },
    { id: 'hub_lamp_4', x: 13.5, z: -12, armDirX: -1, flickerSeed: 3.0, hasPointLight: false },
  ];

  return {
    zoneId: 'hub',
    houses: [],
    lamps,
    colliders,
    objectives: [],
    tapes: [],
    bounds: { minX: -24, maxX: 24, minZ: -21, maxZ: 18 },
    spawn: { x: 0, z: 11.5, yaw: 0 },
    hubAnchors: {
      carPos: { x: -9.0, z: 4.4 },
      carRadius: 4.6,
      terminalPos: { x: 9.6, z: 6.0 },
      terminalRadius: 3.6,
      rangeDummies: [
        { id: 'dummy_10m_l', kind: 'crawler', x: -6.0, z: -7.5, maxHp: 120, distanceLabel: '10м' },
        { id: 'dummy_14m_c', kind: 'lampshade', x: 0.0, z: -11.5, maxHp: 180, distanceLabel: '14м' },
        { id: 'dummy_14m_r', kind: 'screamer', x: 6.2, z: -11.5, maxHp: 150, distanceLabel: '14м' },
        { id: 'dummy_20m_heavy', kind: 'heavy', x: -3.2, z: -17.0, maxHp: 420, distanceLabel: '20м' },
        { id: 'dummy_22m_sniper', kind: 'lampshade', x: 4.5, z: -19.2, maxHp: 225, distanceLabel: '22м' },
      ],
    },
  };
}

/**
 * Location 2 (Act II, Chapters 7–12): Заброшенный Автопарк №4 и Шоссе КПП-3 (Route 404 Depot).
 * Concrete repair hangars, rusted Bus #404 frozen in the tarmac, KPP-3 checkpoint booth,
 * fuel cisterns, dispatch tower, and perimeter floodlights.
 */
export function buildDepotLayout(): SuburbLayout {
  const colliders: AABB[] = [
    // KPP-3 Guardhouse on west side of highway entry
    { id: 'depot_kpp_booth', minX: -14.5, maxX: -7.5, minZ: 22.0, maxZ: 28.0, height: 3.8, kind: 'house' },
    // East concrete checkpoint generator shed
    { id: 'depot_east_gen', minX: 9.5, maxX: 16.5, minZ: 22.5, maxZ: 29.0, height: 3.6, kind: 'house' },
    // West Bus Repair Hangar #1 (solid north & south walls leaving open drive lanes around it)
    { id: 'depot_hangar_west', minX: -26.5, maxX: -14.5, minZ: -6.0, maxZ: 10.0, height: 6.2, kind: 'house' },
    // East Bus Repair Hangar #2
    { id: 'depot_hangar_east', minX: 14.5, maxX: 26.5, minZ: -10.0, maxZ: 8.0, height: 6.2, kind: 'house' },
    // Wrecked & frozen Route #404 Bus parked slightly angled across central tarmac
    { id: 'depot_bus_404', minX: -3.0, maxX: 3.0, minZ: -5.5, maxZ: 5.5, height: 3.3, kind: 'prop' },
    // North-West Fuel Cistern Farm
    { id: 'depot_cistern_1', minX: -23.0, maxX: -13.0, minZ: -29.0, maxZ: -22.5, height: 4.0, kind: 'prop' },
    { id: 'depot_cistern_2', minX: -23.0, maxX: -13.0, minZ: -38.5, maxZ: -32.0, height: 4.0, kind: 'prop' },
    // North-East Dispatch Tower Base
    { id: 'depot_dispatch_tower', minX: 14.0, maxX: 22.5, minZ: -34.0, maxZ: -25.0, height: 9.0, kind: 'house' },
    // Concrete highway Jersey barriers & depot yard fences
    { id: 'depot_barrier_sw', minX: -28.0, maxX: -15.5, minZ: 15.0, maxZ: 16.2, height: 1.4, kind: 'fence' },
    { id: 'depot_barrier_se', minX: 15.5, maxX: 28.0, minZ: 15.0, maxZ: 16.2, height: 1.4, kind: 'fence' },
    { id: 'depot_barrier_n', minX: -11.0, maxX: 11.0, minZ: -41.5, maxZ: -40.2, height: 1.8, kind: 'fence' },
  ];

  const lamps: LampSpec[] = [
    { id: 'depot_lamp_1', x: -6.2, z: 33, armDirX: 1, flickerSeed: 1.3, hasPointLight: true },
    { id: 'depot_lamp_2', x: 6.2, z: 18, armDirX: -1, flickerSeed: 2.8, hasPointLight: true },
    { id: 'depot_lamp_3', x: -9.5, z: 2, armDirX: 1, flickerSeed: 4.1, hasPointLight: true },
    { id: 'depot_lamp_4', x: 9.5, z: -14, armDirX: -1, flickerSeed: 5.5, hasPointLight: true },
    { id: 'depot_lamp_5', x: -7.5, z: -30, armDirX: 1, flickerSeed: 7.2, hasPointLight: true },
    { id: 'depot_lamp_6', x: 7.5, z: -38, armDirX: -1, flickerSeed: 8.6, hasPointLight: false },
  ];

  const objectives: ObjectiveSpec[] = [
    // Chapter 7: Tactical EMP Breach on KPP-3 Gate Power
    { id: 'ch7_kpp_1', chapter: 7, label: 'KPP-3 Barrier Breaker (West Booth)', x: -5.8, z: 25.0, completed: false, kind: 'interact' },
    { id: 'ch7_kpp_2', chapter: 7, label: 'Highway Generator Switch (East Shed)', x: 7.6, z: 25.5, completed: false, kind: 'interact' },
    // Chapter 8: Hold-the-Zone Telemetry Extraction at Bus #404 & West Hangar
    { id: 'ch8_bus_1', chapter: 8, label: 'Bus #404 Driver Cabin Black Box', x: -4.8, z: 1.5, completed: false, kind: 'hold', holdDuration: 5.5, holdProgress: 0 },
    { id: 'ch8_bus_2', chapter: 8, label: 'West Hangar Inspection Console', x: -12.0, z: 3.5, completed: false, kind: 'hold', holdDuration: 5.5, holdProgress: 0 },
    // Chapter 9: Shoot & Rupture 2 Corrupted Fuel Cistern Valves
    { id: 'ch9_fuel_1', chapter: 9, label: 'Cistern Pump Valve Alpha (NW)', x: -10.8, z: -25.8, completed: false, kind: 'destroy', maxHp: 220, hp: 220 },
    { id: 'ch9_fuel_2', chapter: 9, label: 'Cistern Pump Valve Beta (NW)', x: -10.8, z: -35.2, completed: false, kind: 'destroy', maxHp: 220, hp: 220 },
    // Chapter 10: Shoot & Sever 3 Overloaded Repair Bay Busbars
    { id: 'ch10_bay_1', chapter: 10, label: 'East Hangar Welding Busbar', x: 12.0, z: -1.0, completed: false, kind: 'destroy', maxHp: 220, hp: 220 },
    { id: 'ch10_bay_2', chapter: 10, label: 'Central Tarmac Signal Box', x: 5.2, z: -12.5, completed: false, kind: 'destroy', maxHp: 220, hp: 220 },
    { id: 'ch10_bay_3', chapter: 10, label: 'West Yard Floodlight Relay', x: -29.0, z: 4.0, completed: false, kind: 'destroy', maxHp: 220, hp: 220 },
    // Chapter 11: Hold Dispatch Tower Dish & North Tunnel Gate Lock
    { id: 'ch11_tower_1', chapter: 11, label: 'Dispatch Tower Antenna Dish (NE)', x: 11.8, z: -29.5, completed: false, kind: 'hold', holdDuration: 6.0, holdProgress: 0 },
    { id: 'ch11_tower_2', chapter: 11, label: 'North Highway Tunnel Gate Lock', x: 0.0, z: -38.5, completed: false, kind: 'hold', holdDuration: 6.0, holdProgress: 0 },
  ];

  const tapes: TapeSpec[] = [
    { id: 'tape_07', chapterHint: 7, x: -5.5, z: 30.2, collected: false },
    { id: 'tape_08', chapterHint: 8, x: 4.8, z: 2.4, collected: false },
    { id: 'tape_09', chapterHint: 9, x: -11.4, z: -19.5, collected: false },
    { id: 'tape_10', chapterHint: 10, x: 12.2, z: 9.8, collected: false },
    { id: 'tape_11', chapterHint: 11, x: 11.5, z: -23.0, collected: false },
    { id: 'tape_12', chapterHint: 12, x: -4.2, z: -35.5, collected: false },
  ];

  return {
    zoneId: 'depot',
    houses: [],
    lamps,
    colliders,
    objectives,
    tapes,
    bounds: { minX: -34, maxX: 34, minZ: -46, maxZ: 44 },
    spawn: { x: 0, z: 37, yaw: 0 },
  };
}

/**
 * Location 3 (Act III, Chapters 13–18): Подстанция «Луч-94» и Ядро Резонатора.
 * High-voltage transformer yard, 4 cooling pylons, capacitor banks,
 * Archive Bunker Vault, and the central circular Resonator Core arena.
 */
export function buildSubstationLayout(): SuburbLayout {
  const colliders: AABB[] = [
    // South Entry Gatehouse Pillars
    { id: 'sub_gate_west', minX: -14.0, maxX: -6.5, minZ: 24.0, maxZ: 29.0, height: 4.8, kind: 'house' },
    { id: 'sub_gate_east', minX: 6.5, maxX: 14.0, minZ: 24.0, maxZ: 29.0, height: 4.8, kind: 'house' },
    // 4 Cooling Pylons ringing the central Resonator Core
    { id: 'sub_pylon_sw', minX: -17.5, maxX: -12.5, minZ: 6.5, maxZ: 11.5, height: 9.5, kind: 'prop' },
    { id: 'sub_pylon_se', minX: 12.5, maxX: 17.5, minZ: 6.5, maxZ: 11.5, height: 9.5, kind: 'prop' },
    { id: 'sub_pylon_nw', minX: -17.5, maxX: -12.5, minZ: -19.5, maxZ: -14.5, height: 9.5, kind: 'prop' },
    { id: 'sub_pylon_ne', minX: 12.5, maxX: 17.5, minZ: -19.5, maxZ: -14.5, height: 9.5, kind: 'prop' },
    // West & East High-Voltage Capacitor Bank Buildings
    { id: 'sub_cap_west', minX: -29.0, maxX: -22.0, minZ: -11.0, maxZ: 3.0, height: 5.4, kind: 'house' },
    { id: 'sub_cap_east', minX: 22.0, maxX: 29.0, minZ: -11.0, maxZ: 3.0, height: 5.4, kind: 'house' },
    // North Archive Bunker Vault
    { id: 'sub_archive_bunker', minX: -11.0, maxX: 11.0, minZ: -41.0, maxZ: -32.0, height: 5.2, kind: 'house' },
    // Central Resonator Core Pedestal (player fights around the glowing coil ring!)
    { id: 'sub_core_pedestal', minX: -2.4, maxX: 2.4, minZ: -6.4, maxZ: -1.6, height: 8.0, kind: 'prop' },
    // Security chain-link perimeter walls
    { id: 'sub_fence_sw', minX: -30.0, maxX: -15.0, minZ: 25.5, maxZ: 26.5, height: 2.6, kind: 'fence' },
    { id: 'sub_fence_se', minX: 15.0, maxX: 30.0, minZ: 25.5, maxZ: 26.5, height: 2.6, kind: 'fence' },
  ];

  const lamps: LampSpec[] = [
    { id: 'sub_lamp_1', x: -5.5, z: 32, armDirX: 1, flickerSeed: 1.5, hasPointLight: true },
    { id: 'sub_lamp_2', x: 5.5, z: 18, armDirX: -1, flickerSeed: 3.1, hasPointLight: true },
    { id: 'sub_lamp_3', x: -11.0, z: -4, armDirX: 1, flickerSeed: 4.7, hasPointLight: true },
    { id: 'sub_lamp_4', x: 11.0, z: -4, armDirX: -1, flickerSeed: 6.2, hasPointLight: true },
    { id: 'sub_lamp_5', x: 0.0, z: -26, armDirX: 1, flickerSeed: 7.9, hasPointLight: true },
  ];

  const objectives: ObjectiveSpec[] = [
    // Chapter 13: Shoot & Destroy Outer Cooling Pylon Anomaly Valves
    { id: 'ch13_pylon_1', chapter: 13, label: 'Cooling Pylon SW Valve', x: -10.4, z: 9.0, completed: false, kind: 'destroy', maxHp: 240, hp: 240 },
    { id: 'ch13_pylon_2', chapter: 13, label: 'Cooling Pylon SE Valve', x: 10.4, z: 9.0, completed: false, kind: 'destroy', maxHp: 240, hp: 240 },
    // Chapter 14: Hold West & East Capacitor Bank Discharge Zones
    { id: 'ch14_cap_1', chapter: 14, label: 'West Capacitor Discharge Switch', x: -19.8, z: -4.0, completed: false, kind: 'hold', holdDuration: 6.0, holdProgress: 0 },
    { id: 'ch14_cap_2', chapter: 14, label: 'East Capacitor Discharge Switch', x: 19.8, z: -4.0, completed: false, kind: 'hold', holdDuration: 6.0, holdProgress: 0 },
    // Chapter 15: Tactical EMP Breach on Archive Bunker Vault
    { id: 'ch15_vault_1', chapter: 15, label: 'Archive Bunker Cipher Lock (West)', x: -8.0, z: -29.8, completed: false, kind: 'interact' },
    { id: 'ch15_vault_2', chapter: 15, label: 'Archive Bunker Master Tape Deck', x: 7.8, z: -29.8, completed: false, kind: 'interact' },
    // Chapter 16: Shoot & Shatter Northern Pylon Breakers & Gatehouse Shunt
    { id: 'ch16_mirror_1', chapter: 16, label: 'Cooling Pylon NW Breaker', x: -10.4, z: -17.0, completed: false, kind: 'destroy', maxHp: 260, hp: 260 },
    { id: 'ch16_mirror_2', chapter: 16, label: 'Cooling Pylon NE Breaker', x: 10.4, z: -17.0, completed: false, kind: 'destroy', maxHp: 260, hp: 260 },
    { id: 'ch16_mirror_3', chapter: 16, label: 'Gatehouse Grounding Shunt', x: 0.0, z: 22.5, completed: false, kind: 'destroy', maxHp: 260, hp: 260 },
    // Chapter 17: Hold Both Resonator Core Limiter Perimeters
    { id: 'ch17_core_1', chapter: 17, label: 'Resonator Core Limiter West', x: -5.2, z: -4.0, completed: false, kind: 'hold', holdDuration: 6.5, holdProgress: 0 },
    { id: 'ch17_core_2', chapter: 17, label: 'Resonator Core Limiter East', x: 5.2, z: -4.0, completed: false, kind: 'hold', holdDuration: 6.5, holdProgress: 0 },
  ];

  const tapes: TapeSpec[] = [
    { id: 'tape_13', chapterHint: 13, x: -4.6, z: 27.0, collected: false },
    { id: 'tape_14', chapterHint: 14, x: -19.5, z: 3.8, collected: false },
    { id: 'tape_15', chapterHint: 15, x: 0.0, z: -29.5, collected: false },
    { id: 'tape_16', chapterHint: 16, x: 19.5, z: -11.5, collected: false },
    { id: 'tape_17', chapterHint: 17, x: -6.4, z: -10.5, collected: false },
    { id: 'tape_18', chapterHint: 18, x: 0.0, z: 2.2, collected: false },
  ];

  return {
    zoneId: 'substation',
    houses: [],
    lamps,
    colliders,
    objectives,
    tapes,
    bounds: { minX: -34, maxX: 34, minZ: -46, maxZ: 44 },
    spawn: { x: 0, z: 37, yaw: 0 },
  };
}

export function buildZoneLayout(zoneId: ZoneId): SuburbLayout {
  switch (zoneId) {
    case 'hub':
      return buildHubLayout();
    case 'depot':
      return buildDepotLayout();
    case 'substation':
      return buildSubstationLayout();
    case 'suburb':
    default: {
      const sub = buildSuburbLayout();
      sub.zoneId = 'suburb';
      return sub;
    }
  }
}
