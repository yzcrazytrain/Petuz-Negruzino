import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyReload,
  buildSuburbLayout,
  computeBipedGaitPose,
  computeBreathRecoveryHp,
  computeCharacterProgression,
  computeComboMultiplier,
  computeCoopScaling,
  computeCoopSlotSpawnOffset,
  computeDifficultyScaledEnemyStats,
  computeDistanceEyeIntensity,
  computeEnemySteering,
  computeLoopScaling,
  computeRoosterGaitPose,
  computeScaledChapterKillTarget,
  computeWeaponDamage,
  createInitialAmmo,
  evaluateCutsceneSkipVote,
  evaluateHubBoarding,
  findShotHitEnemy,
  keepRoosterOutOfLineOfFire,
  pickUpgradeChoices,
  resolveCircleVsAABBs,
  resolveCircleVsCircles,
  shouldAutoReload,
  stepRoosterCompanion,
} from './rules';
import { UPGRADE_IDS, WEAPONS } from './constants';

test('suburb layout creates small houses with fenced lawns, open gates, and clear spawn', () => {
  const layout = buildSuburbLayout();
  assert.equal(layout.houses.length, 8);
  assert.ok(layout.lamps.length >= 5);
  assert.ok(layout.objectives.length >= 5);

  // Verify player spawns cleanly on open road without intersecting any collider
  const resolved = resolveCircleVsAABBs(
    layout.spawn.x,
    layout.spawn.z,
    0.55,
    layout.colliders,
    layout.bounds
  );
  assert.equal(resolved.hitWall, false);
  assert.equal(resolved.x, layout.spawn.x);
  assert.equal(resolved.z, layout.spawn.z);

  // Verify House #14 gate is passable (wide open path from road into front lawn)
  const h14 = layout.houses[0];
  const gateCheck = resolveCircleVsAABBs(
    h14.yardMaxX,
    h14.gateZ,
    0.55,
    layout.colliders,
    layout.bounds
  );
  assert.equal(gateCheck.hitWall, false);
});

test('weapon ballistics enforce shotgun close 1-tap, AWP long-range lethality & slow reload', () => {
  // Shotgun 8 pellets at close range (4m) deals lethal 1-tap damage (>150)
  const shotgunPerPellet = computeWeaponDamage('shotgun', 4, false);
  assert.ok(shotgunPerPellet * WEAPONS.shotgun.pellets >= 180);

  // Shotgun drops off significantly at 28m
  const shotgunFar = computeWeaponDamage('shotgun', 28, false);
  assert.ok(shotgunFar < shotgunPerPellet);

  // AWP deals full lethal damage at long range (80m) and has slow reload (>3s)
  const awpLong = computeWeaponDamage('awp', 80, false);
  assert.equal(awpLong, WEAPONS.awp.damage);
  assert.ok(WEAPONS.awp.reloadTime >= 3.0);

  // Reload transfers exact rounds from reserve to mag
  const ammo = createInitialAmmo();
  const afterShot = { mag: 2, reserve: 10 };
  const reloaded = applyReload('awp', afterShot);
  assert.equal(reloaded.mag, 5);
  assert.equal(reloaded.reserve, 7);
  assert.equal(ammo.p90.mag, 50);
  assert.equal(ammo.minigun.mag, 150);
});

test('rooster companion alerts on nearby danger, flies around player, and responds to pats', () => {
  // 1. Pat interaction increments count, triggers patted mode, and grants morale heal
  const patted = stepRoosterCompanion({
    x: 1,
    y: 0,
    z: 33,
    mode: 'follow',
    orbitAngle: 0,
    flightTimer: 2,
    patTimer: 0,
    patCooldown: 0,
    patCount: 0,
    crowCooldown: 0,
    playerX: 0,
    playerZ: 35,
    playerYaw: 0,
    nearestThreat: null,
    patRequested: true,
    dt: 0.016,
  });
  assert.equal(patted.mode, 'patted');
  assert.equal(patted.triggeredPat, true);
  assert.equal(patted.patCount, 1);
  assert.ok(patted.healAmount > 0);

  // 2. Danger behind player triggers crow alert with BEHIND YOU callout
  const alerted = stepRoosterCompanion({
    x: 1,
    y: 0,
    z: 33,
    mode: 'follow',
    orbitAngle: 0,
    flightTimer: 2,
    patTimer: 0,
    patCooldown: 0,
    patCount: 1,
    crowCooldown: 0,
    playerX: 0,
    playerZ: 35,
    playerYaw: 0, // facing -Z
    nearestThreat: { x: 0, z: 42, dist: 7, kind: 'screamer' }, // behind at +Z
    patRequested: false,
    dt: 0.016,
  });
  assert.equal(alerted.mode, 'alert');
  assert.equal(alerted.alertActive, true);
  assert.equal(alerted.triggeredCrow, true);
  assert.match(alerted.alertLabel, /SCREAMER BEHIND YOU/);
  assert.ok(alerted.y > 0.05); // lifts into flight to warn player

  // 3. Switches into circle_fly mode when flightTimer expires
  const flying = stepRoosterCompanion({
    x: 1,
    y: 0,
    z: 33,
    mode: 'follow',
    orbitAngle: 0,
    flightTimer: 0.005,
    patTimer: 0,
    patCooldown: 0,
    patCount: 1,
    crowCooldown: 0,
    playerX: 0,
    playerZ: 35,
    playerYaw: 0,
    nearestThreat: null,
    patRequested: false,
    dt: 0.016,
  });
  assert.equal(flying.mode, 'circle_fly');
  assert.ok(flying.wingFlapSpeed >= 18);
});

test('enemy archetypes exhibit distinct steering policies', () => {
  // Lampshade moves faster when behind the player than when looked at directly
  const shadeFront = computeEnemySteering({
    kind: 'lampshade',
    x: 0,
    z: 20,
    playerX: 0,
    playerZ: 35,
    playerYaw: 0, // looking toward -Z (directly at shade)
    phaseTime: 1,
    seed: 1.5,
    canClaimAttackToken: true,
  });
  const shadeBack = computeEnemySteering({
    kind: 'lampshade',
    x: 0,
    z: 45,
    playerX: 0,
    playerZ: 35,
    playerYaw: 0, // looking away from shade
    phaseTime: 1,
    seed: 1.5,
    canClaimAttackToken: true,
  });
  const speedFront = Math.hypot(shadeFront.vx, shadeFront.vz);
  const speedBack = Math.hypot(shadeBack.vx, shadeBack.vz);
  assert.ok(speedBack > speedFront);

  // Screamer triggers screamer burst at mid-range
  const screamer = computeEnemySteering({
    kind: 'screamer',
    x: 0,
    z: 27,
    playerX: 0,
    playerZ: 35,
    playerYaw: 0,
    phaseTime: 1,
    seed: 0.5,
    canClaimAttackToken: true,
  });
  assert.equal(screamer.wantsScreamerBurst, true);
});

test('localization supports Russian default and English fallback for alerts and UI copy', async () => {
  const { TRANSLATIONS, formatRoosterAlert } = await import('./i18n');
  assert.equal(TRANSLATIONS.ru.brandTitle, 'НЕГРУЗИНО');
  assert.equal(TRANSLATIONS.en.brandTitle, 'NEGRUZINO');

  const ruAlert = formatRoosterAlert('ru', 'screamer', Math.PI, 8);
  assert.match(ruAlert, /СКРИМЕР СЗАДИ \(8м\)/);

  const enAlert = formatRoosterAlert('en', 'screamer', Math.PI, 8);
  assert.match(enAlert, /SCREAMER BEHIND YOU \(8m\)/);
});

test('replayability rules: combo multiplier, loop scaling, upgrade draft & upgraded ballistics', () => {
  assert.equal(computeComboMultiplier(0), 1);
  assert.equal(computeComboMultiplier(2), 2);
  assert.equal(computeComboMultiplier(3), 3);
  assert.equal(computeComboMultiplier(5), 4);
  assert.equal(computeComboMultiplier(8), 5);

  const loop1 = computeLoopScaling(1);
  const loop3 = computeLoopScaling(3);
  assert.equal(loop1.hpMult, 1);
  assert.ok(loop3.hpMult > loop1.hpMult);
  assert.ok(loop3.speedMult > loop1.speedMult);
  assert.ok(loop3.spawnIntervalMult < loop1.spawnIntervalMult);
  assert.ok(loop3.extraActiveEnemies >= 2);

  const draft = pickUpgradeChoices(UPGRADE_IDS, ['buckshot_overpressure'], 42, 3);
  assert.equal(draft.length, 3);
  assert.ok(!draft.includes('buckshot_overpressure'));
  assert.equal(new Set(draft).size, 3);

  const baseShotgun = computeWeaponDamage('shotgun', 4, false);
  const upgradedShotgun = computeWeaponDamage('shotgun', 4, false, ['buckshot_overpressure']);
  assert.ok(upgradedShotgun > baseShotgun);

  const baseP90 = computeWeaponDamage('p90', 10, false);
  const upgradedP90 = computeWeaponDamage('p90', 10, false, ['hollowpoint_smg']);
  assert.ok(upgradedP90 > baseP90);
});

test('solid player-monster circle collision pushes overlapping entities apart safely', () => {
  const pushed = resolveCircleVsCircles(0.2, 0, 0.55, [
    { x: 0, z: 0, radius: 0.75 },
  ]);
  assert.equal(pushed.hitEntity, true);
  assert.ok(Math.hypot(pushed.x, pushed.z) >= 1.29);

  // Exact overlap (zero distance) still separates cleanly without NaN
  const zeroDist = resolveCircleVsCircles(5, 5, 0.55, [
    { x: 5, z: 5, radius: 0.7 },
  ]);
  assert.equal(zeroDist.hitEntity, true);
  assert.ok(Number.isFinite(zeroDist.x) && Number.isFinite(zeroDist.z));
  assert.ok(Math.hypot(zeroDist.x - 5, zeroDist.z - 5) >= 1.24);

  // Distant monster does not move player
  const clear = resolveCircleVsCircles(0, 0, 0.55, [
    { x: 10, z: 0, radius: 0.75 },
  ]);
  assert.equal(clear.hitEntity, false);
  assert.equal(clear.x, 0);
  assert.equal(clear.z, 0);
});

test('P90 automatic reload triggers whenever magazine is empty and reserve ammo remains', () => {
  assert.equal(shouldAutoReload('p90', { mag: 0, reserve: 50 }, false, false), true);
  assert.equal(shouldAutoReload('p90', { mag: 0, reserve: 12 }, false, true), true);
  assert.equal(shouldAutoReload('p90', { mag: 1, reserve: 50 }, false, false), false);
  assert.equal(shouldAutoReload('p90', { mag: 0, reserve: 0 }, false, true), false);
  assert.equal(shouldAutoReload('p90', { mag: 0, reserve: 50 }, true, true), false);
  // Other weapons only auto-reload on justFiredEmpty, not passively when swapped/idle
  assert.equal(shouldAutoReload('pistol', { mag: 0, reserve: 30 }, false, false), false);
  assert.equal(shouldAutoReload('pistol', { mag: 0, reserve: 30 }, false, true), true);
});

test('rooster companion defaults to Grisha and switches cleanly to Vanya with Russian declensions', async () => {
  const { formatRoosterAlert, localizeRoosterCopy, TRANSLATIONS } = await import('./i18n');

  assert.equal(TRANSLATIONS.ru.petyaName, 'ГРИША');
  assert.equal(TRANSLATIONS.en.petyaName, 'GRISHA');
  assert.equal(localizeRoosterCopy('ГРИША', 'ru', 'grisha'), 'ГРИША');
  assert.equal(localizeRoosterCopy('ГРИША', 'ru', 'vanya'), 'ВАНЯ');
  assert.equal(
    localizeRoosterCopy('Погладить Гришу · Благословение Гриши · с Гришей · Грише', 'ru', 'vanya'),
    'Погладить Ваню · Благословение Вани · с Ваней · Ване'
  );
  assert.equal(localizeRoosterCopy('GRISHA_GUARD.EXE — Grisha', 'en', 'vanya'), 'VANYA_GUARD.EXE — Vanya');

  const ruGrishaAlert = formatRoosterAlert('ru', 'screamer', Math.PI, 8, 'grisha');
  const ruVanyaAlert = formatRoosterAlert('ru', 'screamer', Math.PI, 8, 'vanya');
  assert.match(ruGrishaAlert, /^Гриша кричит:/);
  assert.match(ruVanyaAlert, /^Ваня кричит:/);
});

test('shots register accurately onto bots in 3D pitch and pass straight through the rooster', () => {
  // Player at (0, 1.68, 35) aiming along -Z; rooster is directly in front at (0, 0.6, 32), bot is behind at (0, z=25)
  const hitThroughRooster = findShotHitEnemy(
    { x: 0, y: 1.68, z: 35 },
    { x: 0, y: -0.02, z: -0.9998 },
    60,
    [
      { id: 101, x: 0, z: 25, radius: 0.56, hitHeight: 2.35, dying: false },
      { id: 102, x: 5, z: 20, radius: 0.55, hitHeight: 1.75, dying: false },
    ]
  );
  assert.ok(hitThroughRooster !== null);
  assert.equal(hitThroughRooster.enemyId, 101);
  assert.ok(hitThroughRooster.distance > 9.0 && hitThroughRooster.distance < 10.6);

  // Aiming steeply upward (pitch +0.35 rad) toward a tall boss head still hits accurately
  const dirLen = Math.hypot(0, 0.35, -1);
  const pitchedHit = findShotHitEnemy(
    { x: 0, y: 1.68, z: 10 },
    { x: 0, y: 0.35 / dirLen, z: -1 / dirLen },
    60,
    [{ id: 201, x: 0, z: 6, radius: 1.05, hitHeight: 3.55, dying: false }]
  );
  assert.ok(pitchedHit !== null);
  assert.equal(pitchedHit.enemyId, 201);
  assert.equal(pitchedHit.isHeadshot, true);
});

test('rooster companion stays strictly clear of the player-to-monster line of fire', () => {
  // Monster directly in front of player along -Z at (0, 27); rooster starts directly in between at (0, 32)
  const pushed = keepRoosterOutOfLineOfFire(0.05, 32, 0, 35, 0, {
    x: 0,
    z: 27,
    dist: 8,
  });
  // Lateral clearance |x| from the (0,35)->(0,27) line must be >= 1.85m
  assert.ok(Math.abs(pushed.x) >= 1.85);

  // Simulating alert steps keeps the rooster flanking off to the side, never between player & monster
  let rx = 0.1;
  let ry = 0;
  let rz = 32;
  let mode: 'follow' | 'circle_fly' | 'alert' | 'patted' = 'follow';
  let orbitAngle = 0;
  let flightTimer = 3;
  for (let i = 0; i < 40; i++) {
    const out = stepRoosterCompanion({
      x: rx,
      y: ry,
      z: rz,
      mode,
      orbitAngle,
      flightTimer,
      patTimer: 0,
      patCooldown: 0,
      patCount: 0,
      crowCooldown: 1,
      playerX: 0,
      playerZ: 35,
      playerYaw: 0,
      nearestThreat: { x: 0, z: 26, dist: 9, kind: 'crawler' },
      patRequested: false,
      dt: 0.05,
    });
    rx = out.x;
    ry = out.y;
    rz = out.z;
    mode = out.mode;
    orbitAngle = out.orbitAngle;
    flightTimer = out.flightTimer;
    // Must stay outside the player<->monster firing lane (x=0, z in [26..35])
    if (rz < 35 && rz > 26) {
      assert.ok(Math.abs(rx) >= 1.85, `rooster entered line of fire at x=${rx}, z=${rz}`);
    }
  }
});

test('balanced weapon niches keep Minigun DPS highest, P90 agile, Shotgun 1-tap, and AWP precision', () => {
  const minigunDps = WEAPONS.minigun.damage / WEAPONS.minigun.fireInterval;
  const p90Dps = WEAPONS.p90.damage / WEAPONS.p90.fireInterval;
  assert.ok(minigunDps > p90Dps * 1.4, 'minigun should out-DPS P90 as heavy boss melter');
  assert.ok(WEAPONS.p90.moveSpeedMult > 1.0, 'P90 should grant high mobility');
  assert.ok(WEAPONS.minigun.moveSpeedMult < 0.9, 'minigun should be heavier to carry');
  assert.ok(WEAPONS.shotgun.damage * WEAPONS.shotgun.pellets >= 180);
  assert.ok(WEAPONS.awp.damage >= 220 && WEAPONS.awp.reloadTime >= 3.0);
});

test('difficulty presets scale enemy stats cleanly and breath recovery respects floor', () => {
  const easy = computeDifficultyScaledEnemyStats(100, 14, 'easy', 1);
  const normal = computeDifficultyScaledEnemyStats(100, 14, 'normal', 1);
  const hard = computeDifficultyScaledEnemyStats(100, 14, 'hard', 1);

  assert.ok(easy.hp < normal.hp && normal.hp < hard.hp);
  assert.ok(easy.damage < normal.damage && normal.damage < hard.damage);
  assert.ok(easy.speedMult < normal.speedMult && normal.speedMult < hard.speedMult);

  // Breath recovery does nothing while recently in combat (< 6s)
  assert.equal(computeBreathRecoveryHp(30, 100, 4.0, 'normal', 1.0), 30);
  // Recovers smoothly after 6s out of combat up to difficulty floor (55 normal, 75 easy)
  const recNormal = computeBreathRecoveryHp(30, 100, 7.0, 'normal', 2.0);
  assert.ok(recNormal > 30 && recNormal <= 55);
  assert.equal(computeBreathRecoveryHp(54, 100, 9.0, 'normal', 2.0), 55);
  assert.equal(computeBreathRecoveryHp(60, 100, 9.0, 'normal', 2.0), 60);
  // Easy recovers up to 75 HP; Hard never passively recovers
  assert.ok(computeBreathRecoveryHp(60, 120, 8.0, 'easy', 1.0) > 60);
  assert.equal(computeBreathRecoveryHp(30, 100, 12.0, 'hard', 2.0), 30);
});

test('character progression scales ranks 1..5, XP progress, and combat bonuses cleanly', () => {
  const lv1 = computeCharacterProgression(0);
  const lv2 = computeCharacterProgression(320);
  const lv3 = computeCharacterProgression(820);
  const lv4 = computeCharacterProgression(1550);
  const lv5 = computeCharacterProgression(2600);

  assert.equal(lv1.level, 1);
  assert.equal(lv1.xpProgress, 0);
  assert.equal(lv1.bonusMaxHp, 0);
  assert.equal(lv1.damageMult, 1.0);

  assert.equal(lv2.level, 2);
  assert.ok(lv2.bonusMaxHp > lv1.bonusMaxHp);
  assert.ok(lv2.damageMult > lv1.damageMult);

  assert.equal(lv3.level, 3);
  assert.equal(lv4.level, 4);
  assert.equal(lv5.level, 5);
  assert.equal(lv5.xpProgress, 1);
  assert.ok(lv5.bonusMaxHp >= 45);
  assert.ok(lv5.damageMult >= 1.3);
  assert.ok(lv5.reloadSpeedMult > 1.2);
  assert.ok(lv5.moveSpeedMult > 1.1);

  const mid = computeCharacterProgression(160);
  assert.equal(mid.level, 1);
  assert.ok(mid.xpProgress > 0.45 && mid.xpProgress < 0.55);
  assert.equal(computeCharacterProgression(-50).xp, 0);
});

test('biomechanical biped gait bends knee sharply during swing phase, straightens in stance, and stops when idle', () => {
  // Left leg mid-stance (phi = PI/2): foot bears weight, knee nearly straight
  const midStance = computeBipedGaitPose({
    kind: 'lampshade',
    gaitPhase: Math.PI * 0.5,
    speedRatio: 1.0,
    timeSec: 4.0,
    seed: 1.5,
    telegraphRatio: 0,
    flinchRatio: 0,
    turnRate: 0,
  });
  // Left leg mid-swing (phi = 1.45 * PI): knee must bend sharply backward (> 0.65 rad) to clear ground!
  const midSwing = computeBipedGaitPose({
    kind: 'lampshade',
    gaitPhase: Math.PI * 1.45,
    speedRatio: 1.0,
    timeSec: 4.0,
    seed: 1.5,
    telegraphRatio: 0,
    flinchRatio: 0,
    turnRate: 0,
  });

  assert.ok(
    midSwing.leftKneeX > midStance.leftKneeX + 0.45,
    `expected swing knee bend (${midSwing.leftKneeX}) >> stance knee (${midStance.leftKneeX})`
  );
  // Opposite legs are out of phase: while left is in mid-stance, right is in mid-swing
  assert.ok(midStance.rightKneeX > midStance.leftKneeX + 0.35);
  // Spine yaw counter-rotates opposite pelvis yaw
  assert.ok(midStance.spineYaw * midStance.pelvisYaw <= 0);

  // Standing completely still (speedRatio = 0): no cyclic hip pumping regardless of gaitPhase
  const idleA = computeBipedGaitPose({
    kind: 'watchman',
    gaitPhase: 0.4,
    speedRatio: 0,
    timeSec: 5.0,
    seed: 2.1,
    telegraphRatio: 0,
    flinchRatio: 0,
    turnRate: 0,
  });
  const idleB = computeBipedGaitPose({
    kind: 'watchman',
    gaitPhase: 3.5,
    speedRatio: 0,
    timeSec: 5.0,
    seed: 2.1,
    telegraphRatio: 0,
    flinchRatio: 0,
    turnRate: 0,
  });
  assert.equal(idleA.leftHipX, idleB.leftHipX);
  assert.equal(idleA.leftKneeX, idleB.leftKneeX);

  // Different seeds yield distinct non-identical poses
  const otherEntity = computeBipedGaitPose({
    kind: 'crawler',
    gaitPhase: Math.PI * 1.4,
    speedRatio: 1.0,
    timeSec: 4.0,
    seed: 9.7,
    telegraphRatio: 0,
    flinchRatio: 0,
    turnRate: 0,
  });
  assert.notEqual(otherEntity.leftHipX, midSwing.leftHipX);
});

test('rooster gait solver tucks legs cleanly when flying and steps with alternating joints on ground', () => {
  const flying = computeRoosterGaitPose({
    stepPhase: 0,
    groundSpeed: 0,
    altitude: 0.9,
    mode: 'circle_fly',
    timeSec: 2.5,
    patTimer: 0,
    wingPhase: 1.2,
  });
  assert.ok(flying.leftHipX > 0.4 && flying.leftKneeX < -0.7);
  assert.ok(Math.abs(flying.leftWingFlapZ) > 0.4);

  const walking = computeRoosterGaitPose({
    stepPhase: Math.PI * 0.5,
    groundSpeed: 2.2,
    altitude: 0,
    mode: 'follow',
    timeSec: 2.5,
    patTimer: 0,
    wingPhase: 1.2,
  });
  // Left leg lifted in swing while right leg supports weight
  assert.ok(walking.leftKneeX < walking.rightKneeX - 0.3);
  // Wings stay tucked cleanly while walking normally
  assert.ok(Math.abs(walking.leftWingFlapZ) < 0.2);
});

test('every enemy archetype closes distance relentlessly toward the player with zero sideways-only pacing', () => {
  const kinds = ['crawler', 'lampshade', 'screamer', 'watchman'] as const;
  for (const kind of kinds) {
    let ex = 0;
    let ez = 15; // 20m directly in front of player at (0, 35) while player stares straight at them
    const startDist = Math.hypot(0 - ex, 35 - ez);
    for (let step = 0; step < 60; step++) {
      const steer = computeEnemySteering({
        kind,
        x: ex,
        z: ez,
        playerX: 0,
        playerZ: 35,
        playerYaw: 0, // player staring directly at monster along -Z
        phaseTime: step * 0.08,
        seed: 2.3,
        canClaimAttackToken: true,
        tacticMode: step % 20 < 10 ? 'flank_arc' : 'approach',
        flankSign: 1,
      });
      ex += steer.vx * 0.08;
      ez += steer.vz * 0.08;
    }
    const endDist = Math.hypot(0 - ex, 35 - ez);
    assert.ok(
      endDist < startDist - 9.0,
      `expected ${kind} to close strongly from ${startDist}m, got ${endDist.toFixed(2)}m`
    );
  }
});

test('keybind manager supports Mouse4/Mouse5 side buttons, clean conflict swap, and RU/EN labels', async () => {
  const {
    DEFAULT_KEYBINDS,
    applyKeybindUpdate,
    formatBindingLabel,
    mouseButtonToBindingCode,
  } = await import('./keybinds');

  assert.equal(mouseButtonToBindingCode(3), 'Mouse3');
  assert.equal(mouseButtonToBindingCode(4), 'Mouse4');
  assert.match(formatBindingLabel('Mouse3', 'ru'), /M4/);
  assert.match(formatBindingLabel('Mouse4', 'ru'), /M5/);
  assert.equal(formatBindingLabel('Mouse3', 'ru', true), 'M4');

  const withSideBtn = applyKeybindUpdate(DEFAULT_KEYBINDS, 'reload', 'Mouse3');
  assert.equal(withSideBtn.reload, 'Mouse3');
  // Assigning the same side button to another action swaps cleanly so no duplicate conflict remains
  const swapped = applyKeybindUpdate(withSideBtn, 'patRooster', 'Mouse3');
  assert.equal(swapped.patRooster, 'Mouse3');
  assert.equal(swapped.reload, DEFAULT_KEYBINDS.patRooster);
});

test('device detector distinguishes PC vs mobile touch and adapts vertical FOV to aspect ratio', async () => {
  const { detectDeviceProfile } = await import('./device');

  const desktop = detectDeviceProfile({
    width: 1440,
    height: 900,
    coarsePointer: false,
    maxTouchPoints: 0,
  });
  assert.equal(desktop.isTouch, false);
  assert.equal(desktop.isPortrait, false);
  assert.equal(desktop.recommendedFov, 72);
  assert.equal(desktop.maxPixelRatio, 2);

  const mobileLandscape = detectDeviceProfile({
    width: 844,
    height: 390,
    coarsePointer: true,
    maxTouchPoints: 5,
  });
  assert.equal(mobileLandscape.isTouch, true);
  assert.equal(mobileLandscape.isPortrait, false);
  assert.equal(mobileLandscape.maxPixelRatio, 1.25);

  const mobilePortrait = detectDeviceProfile({
    width: 390,
    height: 844,
    coarsePointer: true,
    maxTouchPoints: 5,
  });
  assert.equal(mobilePortrait.isTouch, true);
  assert.equal(mobilePortrait.isPortrait, true);
  assert.ok(mobilePortrait.recommendedFov >= 80);
});

test('expanded 18-chapter 3-zone campaign has 3 act bosses, 33 objectives, and 18 MK-60 story tapes', async () => {
  const { CHAPTERS } = await import('./constants');
  const { TRANSLATIONS } = await import('./i18n');
  const { buildZoneLayout } = await import('./zones');

  assert.equal(CHAPTERS.length, 18);
  assert.equal(CHAPTERS[5].hasBoss, true);
  assert.equal(CHAPTERS[11].hasBoss, true);
  assert.equal(CHAPTERS[17].hasBoss, true);
  assert.equal(TRANSLATIONS.ru.chapterMeta.length, 18);
  assert.equal(TRANSLATIONS.en.chapterMeta.length, 18);

  const suburb = buildZoneLayout('suburb');
  const depot = buildZoneLayout('depot');
  const substation = buildZoneLayout('substation');

  const allObjectives = [...suburb.objectives, ...depot.objectives, ...substation.objectives];
  const allTapes = [...suburb.tapes, ...depot.tapes, ...substation.tapes];
  assert.equal(allObjectives.length, 33);
  assert.equal(allTapes.length, 18);

  // Every non-boss chapter (1-5, 7-11, 13-17) has at least 2 objectives in its zone
  for (const ch of CHAPTERS) {
    if (!ch.hasBoss) {
      const chObjs = allObjectives.filter((o) => o.chapter === ch.chapter);
      assert.ok(chObjs.length >= 2, `chapter ${ch.chapter} should have at least 2 objectives`);
    }
  }

  for (const layout of [suburb, depot, substation]) {
    assert.equal(layout.tapes.length, 6);
    for (const tape of layout.tapes) {
      assert.ok(
        tape.x >= layout.bounds.minX && tape.x <= layout.bounds.maxX,
        `tape ${tape.id} x out of bounds`
      );
      assert.ok(
        tape.z >= layout.bounds.minZ && tape.z <= layout.bounds.maxZ,
        `tape ${tape.id} z out of bounds`
      );
      assert.ok(tape.id in TRANSLATIONS.ru.storyTapes, `RU copy missing for ${tape.id}`);
      assert.ok(tape.id in TRANSLATIONS.en.storyTapes, `EN copy missing for ${tape.id}`);
    }
  }
});

test('LAN co-op protocol validates/sanitizes payloads, enforces 4-player cap, and migrates host cleanly', async () => {
  const {
    COOP_MAX_PLAYERS,
    addPlayerToRoom,
    createRoomRecord,
    normalizeRoomCode,
    parseClientMessage,
    removePlayerFromRoom,
    sanitizeCallsign,
    serializeRoomSnapshot,
  } = await import('./coopProtocol');
  const { resolveCoopUrls } = await import('./coopClient');

  assert.equal(sanitizeCallsign('<script>alert(1)</script> Саша'), 'scriptalert1script');
  assert.equal(sanitizeCallsign('   ', 'Игрок'), 'Игрок');
  assert.equal(normalizeRoomCode(' ab-7k! '), 'AB7K');

  // Valid player state clamps extreme coordinates & weapon IDs safely
  const parsed = parseClientMessage(
    JSON.stringify({
      type: 'player:state',
      state: {
        x: 9999,
        y: 1.7,
        z: -9999,
        yaw: 0,
        pitch: 0,
        weaponId: 'invalid_gun',
        hp: 999,
        maxHp: 100,
        isFiring: false,
        isMoving: true,
        isDowned: false,
        kills: 5,
      },
    })
  );
  assert.ok(parsed && parsed.type === 'player:state');
  assert.equal(parsed.state.x, 160);
  assert.equal(parsed.state.z, -160);
  assert.equal(parsed.state.hp, 250);
  assert.equal(parsed.state.weaponId, 'shotgun');

  // Oversized or malformed payloads are rejected
  assert.equal(parseClientMessage('{bad json'), null);
  assert.equal(parseClientMessage('x'.repeat(20_000)), null);
  assert.equal(parseClientMessage(JSON.stringify({ type: 'unknown:op' })), null);

  // Room creation, 4-player cap, and host migration on disconnect
  const room = createRoomRecord('7K4P', 'p1', 'Григорий', 'story', 'normal');
  assert.equal(addPlayerToRoom(room, 'p2', 'Антон').ok, true);
  assert.equal(addPlayerToRoom(room, 'p3', 'Марина').ok, true);
  assert.equal(addPlayerToRoom(room, 'p4', 'Дима').ok, true);
  assert.equal(room.players.size, COOP_MAX_PLAYERS);

  const fifth = addPlayerToRoom(room, 'p5', 'Лишний');
  assert.equal(fifth.ok, false);

  // Host leaves -> migrates cleanly to p2
  const emptyAfterHostLeft = removePlayerFromRoom(room, 'p1');
  assert.equal(emptyAfterHostLeft, false);
  assert.equal(room.hostId, 'p2');
  assert.equal(serializeRoomSnapshot(room).players.find((p) => p.id === 'p2')?.isHost, true);

  // Removing remaining players marks room empty for cleanup
  assert.equal(removePlayerFromRoom(room, 'p2'), false);
  assert.equal(removePlayerFromRoom(room, 'p3'), false);
  assert.equal(removePlayerFromRoom(room, 'p4'), true);

  // LAN host URL resolver supports bare IPv4s and custom ports
  const lanResolved = resolveCoopUrls('192.168.1.42');
  assert.equal(lanResolved.httpBase, 'http://192.168.1.42:3000');
  assert.equal(lanResolved.wsUrl, 'ws://192.168.1.42:3000/ws/coop');

  // Stage 1: Reload animation sync fields, ping/pong, and pickup sync messages
  const reloadState = parseClientMessage(
    JSON.stringify({
      type: 'player:state',
      state: {
        x: 2,
        y: 1.7,
        z: 10,
        yaw: 0.4,
        pitch: -0.1,
        weaponId: 'p90',
        hp: 85,
        maxHp: 100,
        isFiring: false,
        isMoving: false,
        isReloading: true,
        reloadProgress: 1.8,
        isDowned: false,
        kills: 3,
      },
    })
  );
  assert.ok(reloadState && reloadState.type === 'player:state');
  assert.equal(reloadState.state.isReloading, true);
  assert.equal(reloadState.state.reloadProgress, 1);

  const pingParsed = parseClientMessage(JSON.stringify({ type: 'ping', ts: 12345 }));
  assert.deepEqual(pingParsed, { type: 'ping', ts: 12345 });

  const pickupsMsg = parseClientMessage(
    JSON.stringify({
      type: 'world:pickups',
      pickups: [{ id: 'pk_12', kind: 'medkit', x: 3.5, z: -8.2 }],
    })
  );
  assert.ok(pickupsMsg && pickupsMsg.type === 'world:pickups');
  assert.equal(pickupsMsg.pickups.length, 1);
  assert.equal(pickupsMsg.pickups[0].kind, 'medkit');

  const takeMsg = parseClientMessage(JSON.stringify({ type: 'pickup:take', pickupId: 'pk_12' }));
  assert.deepEqual(takeMsg, { type: 'pickup:take', pickupId: 'pk_12' });
});

test('mobile HUD layout enforces non-overlapping portrait/landscape defaults and clamps coordinates', async () => {
  const {
    clampHudControlPos,
    getDefaultMobileHudLayout,
    HUD_SCALE_MAX,
    HUD_SCALE_MIN,
  } = await import('./mobileHudLayout');
  const { stripPcKeyHints } = await import('./i18n');

  const defaults = getDefaultMobileHudLayout();
  // On 390x844 portrait, Fire button (72px tall, center at yPct) must not overlap Weapons bar (32px tall)
  const vh = 844;
  const fireBottomPx = (defaults.portrait.fire.yPct / 100) * vh + 36 * defaults.portrait.fire.scale;
  const weaponsTopPx = (defaults.portrait.weapons.yPct / 100) * vh - 16 * defaults.portrait.weapons.scale;
  assert.ok(
    fireBottomPx + 24 < weaponsTopPx,
    `expected portrait fire bottom (${fireBottomPx.toFixed(1)}px) well above weapons bar (${weaponsTopPx.toFixed(1)}px)`
  );

  // Joystick must also sit well above weapons bar
  const stickBottomPx =
    (defaults.portrait.joystick.yPct / 100) * vh + 56 * defaults.portrait.joystick.scale;
  assert.ok(
    stickBottomPx + 12 < weaponsTopPx,
    `expected portrait joystick bottom (${stickBottomPx.toFixed(1)}px) above weapons bar (${weaponsTopPx.toFixed(1)}px)`
  );

  // Clamping enforces safe viewport margins & scale bounds
  const clamped = clampHudControlPos({ xPct: -40, yPct: 120, scale: 9 }, defaults.portrait.fire, 'fire');
  assert.equal(clamped.xPct, 7);
  assert.equal(clamped.yPct, 96);
  assert.equal(clamped.scale, HUD_SCALE_MAX);

  const clampedSmall = clampHudControlPos({ scale: 0.1 }, defaults.portrait.reload, 'reload');
  assert.equal(clampedSmall.scale, HUD_SCALE_MIN);

  // stripPcKeyHints removes bracketed PC key prompts cleanly for touch screens
  assert.equal(
    stripPcKeyHints('Включите фонарик [L] и щиток [E], смена трека (N).'),
    'Включите фонарик и щиток, смена трека.'
  );
  assert.equal(stripPcKeyHints('Выберите 1 модуль [1–3]:'), 'Выберите 1 модуль:');
});

test('custom track validation rejects oversized or non-audio files and cleans filenames', async () => {
  const {
    cleanTrackDisplayName,
    isSupportedAudioFile,
    MAX_CUSTOM_TRACK_BYTES,
  } = await import('./customTracks');

  assert.equal(cleanTrackDisplayName('01_Bagrovy_Fantomas_-_Biker.mp3'), '01 Bagrovy Fantomas - Biker');
  assert.equal(
    isSupportedAudioFile({ name: 'song.mp3', type: 'audio/mpeg', size: 4_000_000 } as File),
    true
  );
  assert.equal(
    isSupportedAudioFile({ name: 'song.flac', type: '', size: 10_000_000 } as File),
    true
  );
  assert.equal(
    isSupportedAudioFile({ name: 'huge.wav', type: 'audio/wav', size: MAX_CUSTOM_TRACK_BYTES + 1 } as File),
    false
  );
  assert.equal(
    isSupportedAudioFile({ name: 'image.png', type: 'image/png', size: 1024 } as File),
    false
  );
});

test('Stage 2 dynamic co-op scaling scales smoothly across 1..4 players and reacts to chapter kill targets', () => {
  const s1 = computeCoopScaling(1);
  const s2 = computeCoopScaling(2);
  const s3 = computeCoopScaling(3);
  const s4 = computeCoopScaling(4);

  assert.equal(s1.playerCount, 1);
  assert.equal(s1.enemyHpMult, 1);
  assert.equal(s1.enemyDamageMult, 1);
  assert.equal(s1.maxActiveBonus, 0);
  assert.equal(s1.pickupDropChanceBonus, 0);
  assert.equal(s1.ammoRefillMult, 1);

  assert.ok(s2.enemyHpMult > s1.enemyHpMult && s3.enemyHpMult > s2.enemyHpMult && s4.enemyHpMult > s3.enemyHpMult);
  assert.equal(s4.enemyHpMult, 2.05);
  assert.equal(s4.enemyDamageMult, 1.36);
  assert.equal(s4.spawnRateMult, 1.75);
  assert.equal(s4.maxActiveBonus, 6);
  assert.equal(s4.pickupDropChanceBonus, 0.24);
  assert.equal(s4.ammoRefillMult, 1.9);

  // Clamps out-of-range player counts safely to 1..4
  assert.equal(computeCoopScaling(0).playerCount, 1);
  assert.equal(computeCoopScaling(99).playerCount, 4);

  // Chapter kill target scales with player count
  assert.equal(computeScaledChapterKillTarget(10, 1), 10);
  assert.ok(computeScaledChapterKillTarget(10, 2) > 10);
  assert.ok(computeScaledChapterKillTarget(10, 4) > computeScaledChapterKillTarget(10, 2));
});

test('Stage 2 Hub Moskvitch boarding and Cutscene Skip voting require unanimous quorum and recalculate on disconnect', () => {
  // 1. Solo boarding launches immediately (1/1)
  const soloBoard = evaluateHubBoarding(new Set(['p1']), ['p1']);
  assert.equal(soloBoard.boardedCount, 1);
  assert.equal(soloBoard.totalPlayers, 1);
  assert.equal(soloBoard.allReady, true);

  // 2. 2-player squad: 1/2 does NOT launch; 2/2 launches
  const partialBoard = evaluateHubBoarding(new Set(['p1']), ['p1', 'p2']);
  assert.equal(partialBoard.boardedCount, 1);
  assert.equal(partialBoard.totalPlayers, 2);
  assert.equal(partialBoard.allReady, false);

  const fullBoard = evaluateHubBoarding(new Set(['p1', 'p2']), ['p1', 'p2']);
  assert.equal(fullBoard.allReady, true);

  // Stale IDs from disconnected players are ignored
  const afterLeaveBoard = evaluateHubBoarding(new Set(['p1', 'p2']), ['p1']);
  assert.equal(afterLeaveBoard.boardedCount, 1);
  assert.equal(afterLeaveBoard.totalPlayers, 1);
  assert.equal(afterLeaveBoard.allReady, true);

  // 3. Cutscene skip voting: 1/3 cannot skip alone; unanimous 3/3 skips; disconnect drops quorum
  const vote1 = evaluateCutsceneSkipVote(new Set(['p1']), ['p1', 'p2', 'p3']);
  assert.equal(vote1.voteCount, 1);
  assert.equal(vote1.totalPlayers, 3);
  assert.equal(vote1.shouldSkip, false);

  const voteAll = evaluateCutsceneSkipVote(new Set(['p1', 'p2', 'p3']), ['p1', 'p2', 'p3']);
  assert.equal(voteAll.shouldSkip, true);

  // If p3 disconnects while p1 and p2 already voted -> quorum becomes 2/2 -> skips!
  const voteAfterDisconnect = evaluateCutsceneSkipVote(new Set(['p1', 'p2', 'p3']), ['p1', 'p2']);
  assert.equal(voteAfterDisconnect.voteCount, 2);
  assert.equal(voteAfterDisconnect.totalPlayers, 2);
  assert.equal(voteAfterDisconnect.shouldSkip, true);
});

test('Stage 2 Hub, Bus Depot #4, and Substation Luch-94 layouts have clear spawns and Hub anchors/dummies', async () => {
  const { buildZoneLayout } = await import('./zones');

  for (const zoneId of ['hub', 'suburb', 'depot', 'substation'] as const) {
    const layout = buildZoneLayout(zoneId);
    assert.equal(layout.zoneId, zoneId);
    const resolved = resolveCircleVsAABBs(
      layout.spawn.x,
      layout.spawn.z,
      0.55,
      layout.colliders,
      layout.bounds
    );
    assert.equal(resolved.hitWall, false, `${zoneId} spawn intersects a collider`);
    assert.equal(resolved.x, layout.spawn.x);
    assert.equal(resolved.z, layout.spawn.z);
  }

  const hub = buildZoneLayout('hub');
  assert.ok(hub.hubAnchors, 'Hub must expose interactive anchors');
  assert.equal(hub.hubAnchors!.rangeDummies.length, 5, 'Hub must have 5 firing-range dummies');
  for (const dummy of hub.hubAnchors!.rangeDummies) {
    assert.ok(dummy.maxHp >= 120, `dummy ${dummy.id} should have solid HP pool`);
    assert.ok(dummy.distanceLabel.endsWith('м'));
  }
});

test('Stage 2 coopProtocol parses Hub and Cutscene Skip vote messages and cleans quorum sets on disconnect', async () => {
  const {
    addPlayerToRoom,
    createRoomRecord,
    parseClientMessage,
    removePlayerFromRoom,
    serializeRoomSnapshot,
  } = await import('./coopProtocol');

  assert.deepEqual(parseClientMessage(JSON.stringify({ type: 'hub:enter' })), { type: 'hub:enter' });
  assert.deepEqual(parseClientMessage(JSON.stringify({ type: 'hub:board', boarded: true })), {
    type: 'hub:board',
    boarded: true,
  });
  assert.deepEqual(
    parseClientMessage(JSON.stringify({ type: 'cutscene:open', cutsceneId: 'act2_depot' })),
    { type: 'cutscene:open', cutsceneId: 'act2_depot' }
  );
  assert.deepEqual(
    parseClientMessage(JSON.stringify({ type: 'cutscene:vote_skip', cutsceneId: 'act2_depot', vote: true })),
    { type: 'cutscene:vote_skip', cutsceneId: 'act2_depot', vote: true }
  );

  // Removing a player cleans their ID from boardedPlayers & cutsceneSkipVotes
  const room = createRoomRecord('HUB2', 'p1', 'Саша', 'story', 'normal');
  addPlayerToRoom(room, 'p2', 'Дима');
  room.inHub = true;
  room.boardedPlayers.add('p1');
  room.boardedPlayers.add('p2');
  room.cutsceneId = 'intro_1';
  room.cutsceneSkipVotes.add('p2');

  removePlayerFromRoom(room, 'p2');
  const snap = serializeRoomSnapshot(room);
  assert.deepEqual(snap.boardedPlayers, ['p1']);
  assert.deepEqual(snap.cutsceneSkipVotes, []);
});

test('distance eye dimming preserves crisp dots at close range, dims smoothly at 15-60m+, and caps telegraph surge', () => {
  const base = 1.6;
  const close = computeDistanceEyeIntensity(base, 8, 0);
  const mid = computeDistanceEyeIntensity(base, 30, 0);
  const far = computeDistanceEyeIntensity(base, 60, 0);
  const veryFar = computeDistanceEyeIntensity(base, 120, 0);

  assert.equal(close, base);
  assert.ok(mid < close && mid > far, `expected smooth dimming: close=${close}, mid=${mid}, far=${far}`);
  assert.ok(far > 0.5 && far < base * 0.5, `expected far eye glow softly dimmed, got ${far}`);
  assert.equal(veryFar, far);

  // Telegraph boost stays tightly capped (<= 2.25) so monster eyes never flare into bloom streaks
  const closeTelegraph = computeDistanceEyeIntensity(base, 6, 1.0);
  assert.ok(closeTelegraph > close && closeTelegraph <= 2.25);

  const farTelegraph = computeDistanceEyeIntensity(base, 55, 1.0);
  assert.ok(farTelegraph < closeTelegraph && farTelegraph <= 2.25);
});

test('co-op 4-player slot spawn offsets are distinct and collision-free in Hub, Suburb, Depot, and Substation', async () => {
  const { buildZoneLayout } = await import('./zones');

  const offsets = [0, 1, 2, 3].map((slot) => computeCoopSlotSpawnOffset(slot));
  assert.deepEqual(offsets[0], { dx: 0, dz: 0 });
  // All 4 slots must have pairwise separation >= 1.4m so avatars never clip into each other
  for (let i = 0; i < offsets.length; i++) {
    for (let j = i + 1; j < offsets.length; j++) {
      const dist = Math.hypot(offsets[i].dx - offsets[j].dx, offsets[i].dz - offsets[j].dz);
      assert.ok(dist >= 1.4, `slots ${i} and ${j} too close (${dist.toFixed(2)}m)`);
    }
  }

  for (const zoneId of ['hub', 'suburb', 'depot', 'substation'] as const) {
    const layout = buildZoneLayout(zoneId);
    for (let slot = 0; slot < 4; slot++) {
      const off = offsets[slot];
      const px = layout.spawn.x + off.dx;
      const pz = layout.spawn.z + off.dz;
      const resolved = resolveCircleVsAABBs(px, pz, 0.5, layout.colliders, layout.bounds);
      assert.equal(
        resolved.hitWall,
        false,
        `zone ${zoneId} slot ${slot} (${px}, ${pz}) clipped collider or out of bounds`
      );
    }
  }
});

