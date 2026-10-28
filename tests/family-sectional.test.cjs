'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { getLivingRoomFeatureLayout } = require('../floor-plan-ground.js');

test('family L sectional has five full cushions without counting its corner and preserves measured access gaps', () => {
  class Group {
    constructor() { this.children = []; this.userData = {}; }
    add(child) { this.children.push(child); }
    traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
  }
  const feature = getLivingRoomFeatureLayout();
  const scene = new Group();
  const context = {
    THREE: { Group, MeshStandardMaterial: class {} }, scene, livingCenterZ: feature.centerZ,
    livingWeaveTexture() {},
    box(parent, x, y, z, w, h, d) {
      const part = new Group();
      Object.assign(part, { x, y, z, w, h, d, isMesh: true });
      parent.add(part);
      return part;
    }
  };
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  vm.runInNewContext(source.slice(source.indexOf('  const familySectional ='), source.indexOf('  const livingLayouts =')), context);
  const sectional = scene.children[0];
  assert.equal(sectional.userData.planningSeats, 5);
  assert.equal(sectional.userData.cornerCounted, false);
  assert.equal(sectional.userData.comfortVerified, false);
  assert.equal(sectional.userData.productSelected, false);
  const seats = sectional.children.filter((part) => part.name === 'L sectional full seating cushion');
  assert.equal(seats.length, 5);
  assert.equal(sectional.children.filter((part) => part.name === 'L sectional uncounted corner cushion').length, 1);
  seats.forEach((seat) => {
    assert.ok(seat.w * 12 >= 27 && seat.d * 12 >= 30, 'Every counted cushion has full seat width and depth');
    assert.equal(seat.userData.tourObstacle, true);
  });

  for (let i = 0; i < seats.length; i++) for (let j = i + 1; j < seats.length; j++) {
    assert.ok(Math.abs(seats[i].x - seats[j].x) >= (seats[i].w + seats[j].w) / 2 ||
      Math.abs(seats[i].z - seats[j].z) >= (seats[i].d + seats[j].d) / 2, 'Counted cushions do not overlap');
  }
  const bounds = {
    minX: Math.min(...sectional.children.map((part) => part.x - part.w / 2)),
    maxX: Math.max(...sectional.children.map((part) => part.x + part.w / 2)),
    minZ: Math.min(...sectional.children.map((part) => part.z - part.d / 2)),
    maxZ: Math.max(...sectional.children.map((part) => part.z + part.d / 2))
  };
  assert.ok(Math.abs((bounds.maxX - bounds.minX) * 12 - 104) < 0.001);
  assert.ok(Math.abs((bounds.maxZ - bounds.minZ) * 12 - 144) < 0.001);
  assert.ok((bounds.minZ - feature.wallStartZ) * 12 >= 39.5);
  assert.ok((feature.wallEndZ - bounds.maxZ) * 12 >= 39.5);
  // Built-ins removed: the L return end faces both the continuous baseboard and the stone face.
  const familyReturn = sectional.children.filter((part) => part.name === 'L sectional upholstered base').sort((a, b) => a.x - b.x)[0];
  assert.ok(familyReturn.z - familyReturn.d / 2 < feature.centerZ - 3.06 && familyReturn.z + familyReturn.d / 2 > feature.centerZ - 3.06, 'Return spans the stone return and the baseboard run');
  assert.ok((bounds.minX - 1.38) * 12 >= 28.2, 'Return end clears the stone face');
  assert.ok(Math.abs((bounds.minX - 0.2375) * 12 - 41.95) < 0.01, 'Return end to the continuous fireplace-wall baseboard');
  const ottoman = { x: 6.0666667, z: feature.centerZ + 1.5, w: 32 / 12, d: 4 };
  const mainFront = 10.5666667 - 44 / 24;
  assert.ok(Math.abs((mainFront - ottoman.x - ottoman.w / 2) * 12 - 16) < 0.001);
  assert.ok((ottoman.z - ottoman.d / 2 - (feature.centerZ - 25 / 6 + 44 / 24)) * 12 >= 21.9);
  assert.ok(bounds.maxX < 13.25, 'Sectional leaves the existing hall circulation strip clear');
  assert.match(source, /place\(familySectional, layout\.familySectional \? \[0, 0, 0\] : null\)/);
});

function buildLounge() {
  class Group {
    constructor() {
      this.children = []; this.userData = {}; this.visible = true; this.parent = null;
      this.rotation = { x: 0, y: 0, z: 0 };
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    }
    add(child) { if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1); child.parent = this; this.children.push(child); }
    traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
  }
  const feature = getLivingRoomFeatureLayout();
  const scene = new Group();
  const context = {
    THREE: { Group, MeshStandardMaterial: class { constructor(options) { Object.assign(this, options); } } },
    scene, walnut: {}, livingCenterZ: feature.centerZ, livingWeaveTexture(color) { return color; },
    box(parent, x, y, z, w, h, d, material) {
      const part = new Group();
      Object.assign(part, { w, h, d, material, isMesh: true });
      part.position.set(x, y, z);
      parent.add(part);
      return part;
    }
  };
  vm.createContext(context);
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  const loungeSource = source.slice(source.indexOf('  const referenceLounge ='), source.indexOf('  const familySectional ='));
  vm.runInContext(loungeSource, context);
  const placeSource = source.slice(source.indexOf('  scene.add(piano);'), source.indexOf('\n', source.indexOf('  piano.userData.location =')));
  context.stairOpening = require('../upstairs-layout.js').stairOpening();
  context.pianoDepth = 411 / 304.8;
  vm.runInContext(placeSource, context);
  return { context, source, loungeSource, scene, Group, feature };
}

// World-space corners after composing every ancestor transform (Euler XYZ, like Three.js).
function worldCorners(part) {
  const corners = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    let p = [sx * part.w / 2, sy * part.h / 2, sz * part.d / 2];
    for (let node = part; node; node = node.parent) {
      const { x: rx = 0, y: ry = 0, z: rz = 0 } = node.rotation;
      let [x, y, z] = p;
      [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
      [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
      [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
      p = [x + node.position.x, y + node.position.y, z + node.position.z];
    }
    corners.push(p);
  }
  return corners;
}
function worldBounds(object) {
  const points = [];
  object.traverse((part) => { if (part.isMesh) points.push(...worldCorners(part)); });
  return {
    minX: Math.min(...points.map((p) => p[0])), maxX: Math.max(...points.map((p) => p[0])),
    minZ: Math.min(...points.map((p) => p[2])), maxZ: Math.max(...points.map((p) => p[2]))
  };
}
const near = (a, b, message, tolerance = 1e-6) => assert.ok(Math.abs(a - b) < tolerance, `${message}: ${a} vs ${b}`);

test('default living layout is a true mirrored U sectional with continuous backs and six counted seats', () => {
  const { context, loungeSource, scene } = buildLounge();
  const lounge = scene.children.find((child) => child.name === 'Fireplace-facing U sectional - fit study');
  assert.ok(lounge);
  assert.equal(lounge.userData.shape, 'U');
  assert.equal(lounge.userData.planningSeats, 6);
  assert.equal(lounge.userData.cornerSeatsCounted, false);
  assert.equal(lounge.userData.guestChairs, 0);
  assert.deepEqual([...lounge.userData.centerOffset], [0, 0, 0]);
  assert.equal(lounge.children.length, 2, 'Only the U sectional and its rug remain in the lounge group');
  const sofa = lounge.children.find((child) => child.name === 'Reference mushroom U sectional facing fireplace');
  assert.equal(sofa.rotation.y, -Math.PI / 2, 'Main run faces the fireplace (world -x)');
  assert.doesNotMatch(loungeSource, /scale\.(?:set|x|y|z)/, 'Mirroring uses constituent coordinates, not negative scales');
  const named = (name) => sofa.children.filter((part) => part.name === name);
  const bounds = (part) => worldBounds({ traverse: (cb) => cb(part) });
  // Measured overall envelope and clearances.
  const measured = worldBounds(sofa);
  near(measured.minX, 4.5, 'Return ends');
  near(measured.maxX, 12.75, 'Main back');
  near(measured.minZ, 11.975, 'North return back');
  near(measured.maxZ, 22.975, 'South return back');
  near((measured.maxZ - measured.minZ) * 12, 132, 'Main run length');
  near((measured.maxX - measured.minX) * 12, 99, 'Return length');
  near((13.25 - measured.maxX) * 12, 6, 'Stops 6 in before the 36 in main hall strip');
  // Built-ins removed: each return end faces the continuous fireplace-wall baseboard and, inboard, the stone face.
  near((measured.minX - 1.38) * 12, 37.44, 'Return ends to the stone face');
  near((measured.minX - 0.2375) * 12, 51.15, 'Return ends to the continuous fireplace-wall baseboard face', 1e-3);
  near((measured.minX - 0.175) * 12, 51.9, 'Return ends to the painted fireplace wall', 1e-3);
  for (const ret of named('U sectional return base').map(bounds)) {
    const side = ret.maxZ < context.livingCenterZ ? -1 : 1;
    const stoneReturn = context.livingCenterZ + side * 3.06;
    // Each return straddles a stone side return: its outer part faces open baseboard, its inner part faces stone.
    assert.ok(Math.min(ret.minZ, ret.maxZ) < stoneReturn && Math.max(ret.minZ, ret.maxZ) > stoneReturn, 'Return end spans baseboard and stone');
  }
  near((measured.minZ - (context.livingCenterZ - 3.06)) * 12, -29.28, 'North return back extends past the dining-side stone return', 1e-3);
  near((context.livingCenterZ + 3.06 - measured.maxZ) * 12, -29.28, 'South return back extends past the stair-side stone return', 1e-3);
  near((measured.minZ - 8.175) * 12, 45.6, 'North window-wall clearance');
  near((measured.minZ + measured.maxZ) / 2, context.livingCenterZ, 'U centers on the fireplace axis');
  // Both returns: base, back, corner back and end arm exist on each side, mirrored about the U centerline.
  for (const name of ['U sectional return base', 'U sectional return back', 'U sectional continuous corner back', 'U sectional return end arm', 'U sectional return recessed plinth']) {
    const pair = named(name).map(bounds).sort((a, b) => a.minZ - b.minZ);
    assert.equal(pair.length, 2, name);
    near(pair[0].minX, pair[1].minX, `${name} mirrored x`);
    near(pair[0].maxX, pair[1].maxX, `${name} mirrored x`);
    near(pair[0].minZ - measured.minZ, measured.maxZ - pair[1].maxZ, `${name} mirrored z`);
  }
  const mainBack = bounds(named('U sectional continuous main back')[0]);
  near(mainBack.minZ, measured.minZ, 'Main back spans the full run');
  near(mainBack.maxZ, measured.maxZ, 'Main back spans the full run');
  for (const side of [0, 1]) {
    const corner = named('U sectional continuous corner back').map(bounds).sort((a, b) => a.minZ - b.minZ)[side];
    const ret = named('U sectional return back').map(bounds).sort((a, b) => a.minZ - b.minZ)[side];
    const arm = named('U sectional return end arm').map(bounds).sort((a, b) => a.minZ - b.minZ)[side];
    near(corner.maxX, mainBack.minX, 'Corner back meets the main back without a gap');
    near(ret.maxX, corner.minX, 'Return back meets the corner back without a gap');
    near(ret.minX, arm.maxX, 'Return back meets the end arm');
    near(corner.minZ, ret.minZ, 'Corner and return backs share one outer face');
    near(arm.minX, measured.minX, 'Arm closes the return end');
  }
  const counted = [...named('U sectional main seat cushion'), ...named('U sectional return seat cushion')];
  assert.equal(named('U sectional main seat cushion').length, 2);
  assert.equal(named('U sectional return seat cushion').length, 4);
  assert.equal(counted.length, lounge.userData.planningSeats, 'Counted seats exclude both corners');
  assert.equal(named('U sectional uncounted corner cushion').length, 2);
  assert.equal(named('U sectional accent pillow').length, 4);
  assert.equal(named('U sectional main loose back cushion').length + named('U sectional return loose back cushion').length, 6);
  for (const seat of counted.map(bounds)) {
    assert.ok((seat.maxX - seat.minX) * 12 >= 26 && (seat.maxZ - seat.minZ) * 12 >= 26, 'Counted cushions are full-size seats');
  }
  const seats = [...counted, ...named('U sectional uncounted corner cushion')].map(bounds);
  for (let i = 0; i < seats.length; i++) for (let j = i + 1; j < seats.length; j++) {
    const a = seats[i], b = seats[j];
    assert.ok(a.maxX <= b.minX + 1e-9 || b.maxX <= a.minX + 1e-9 || a.maxZ <= b.minZ + 1e-9 || b.maxZ <= a.minZ + 1e-9, 'Seat cushions do not overlap');
  }
  // Open well between returns frames the fireplace axis.
  const returns = named('U sectional return base').map(bounds).sort((a, b) => a.minZ - b.minZ);
  near((returns[1].minZ - returns[0].maxZ) * 12, 54, 'Open well width between returns');
  assert.ok(returns[0].maxZ < context.livingCenterZ && returns[1].minZ > context.livingCenterZ, 'Fireplace axis stays inside the open well');
  const rug = lounge.children.find((part) => part.name.includes('low-pile rug'));
  const rugBounds = bounds(rug);
  near((rugBounds.minX + rugBounds.maxX) / 2, (measured.minX + measured.maxX) / 2, 'Rug centered under U (x)');
  near((rugBounds.minZ + rugBounds.maxZ) / 2, (measured.minZ + measured.maxZ) / 2, 'Rug centered under U (z)');
  assert.ok(rugBounds.maxX < 13.25, 'Rug stays out of the main hall');
  lounge.traverse((part) => { if (part.isMesh && !part.userData.tourDecoration) assert.equal(part.userData.tourObstacle, true); });
});

test('reading chair, end table and its lamp and light are removed, not hidden', () => {
  const { loungeSource, source, scene } = buildLounge();
  const names = [];
  scene.traverse((part) => names.push(part.name || ''));
  assert.ok(!names.some((name) => /POANG|reading chair|end table|Reading lamp|Mirrored L/i.test(name)));
  assert.doesNotMatch(loungeSource, /referenceEndTable|chairSize|endTable|POANG/);
  assert.doesNotMatch(source, /referenceEndTable|'Living reading'|Reference small oak end table|Reference oak POANG/);
  const lighting = source.slice(source.indexOf('  function buildHomeLighting()'), source.indexOf('  const upstairsHelpers ='));
  assert.equal((lighting.match(/fixture\([^)]*'ground', true\)/g) || []).length, 1, 'Only the piano task lamp remains');
});

test('piano moves west and against trim with tucked bench, with no built-in beside it', () => {
  const { context, scene } = buildLounge();
  const piano = scene.children.find((child) => child.name === 'Yamaha CLP-825 Rosewood digital piano');
  assert.ok(piano, 'Piano is a direct scene child, independent of seating layouts');
  const stairs = require('../floor-plan-ground.js').getGroundFloorDefaultPlan().stairs;
  const wallMin = stairs.x, wallMax = stairs.x + stairs.width;
  near(wallMin, 0.175, 'Enclosure starts at the living west wall face');
  const cabinet = worldBounds({ traverse: (cb) => cb(piano.children.find((part) => part.name === 'Piano console cabinet')) });
  near((cabinet.minX + cabinet.maxX) / 2, (wallMin + wallMax) / 2 - 16 / 12, 'Six more inches west, sixteen inches total from wall midpoint');
  near((stairs.z - cabinet.maxZ) * 12, 1, 'Rear gap to the enclosure face');
  near((stairs.z - 0.75 / 12 - cabinet.maxZ) * 12, 0.25, 'Clearance beyond baseboard');
  const bench = worldBounds(piano.children.find((part) => part.name.startsWith('Piano bench -')));
  near((bench.minX + bench.maxX) / 2, piano.position.x, 'Bench stays centered with the piano');
  const whole = worldBounds(piano);
  const sofa = worldBounds(scene.children.find((child) => child.name === 'Fireplace-facing U sectional - fit study').children[0]);
  near((bench.minZ - sofa.maxZ) * 12, 24.4094, 'Tucked bench to U back', 1e-3);
  near((cabinet.minZ - sofa.maxZ) * 12, 31.3197, 'Keyboard front to U back', 1e-3);
  // Built-ins removed: the piano's west end faces the continuous fireplace-wall baseboard.
  assert.doesNotMatch(piano.userData.location, /door conflicts|halved|cabinet end/);
  assert.match(piano.userData.location, /fireplace built-ins removed, west end 15\.68 in to continuous window-wall baseboard \(16\.43 in to paint\)/);
  near((whole.minX - 0.2375) * 12, 15.68, 'Piano west end to window-wall baseboard face', 0.01);
  near((whole.minX - 0.175) * 12, 16.43, 'Piano west end to painted window wall', 0.01);
  const feature = getLivingRoomFeatureLayout();
  assert.ok(whole.minZ > context.livingCenterZ + 3.06 && whole.minZ < feature.wallEndZ, 'Piano west end faces the open baseboard run, not the stone');
  near((cabinet.minZ - (context.livingCenterZ + 3.06)) * 12, 22.41 + 38.19, 'Piano console to stair-side stone return', 0.01);
  assert.ok(cabinet.minZ > getLivingRoomFeatureLayout().windowCenters[1] + 2, 'Piano console stays south of the stair-side window opening');
  assert.ok(whole.maxX < wallMax && whole.minX > wallMin);
  assert.ok(whole.maxZ < stairs.z && bench.minZ > sofa.maxZ);
  const benchGroup = piano.children.find((part) => part.name.startsWith('Piano bench -'));
  near(benchGroup.position.z, 0.75, 'Bench tucks 6.6 inches from its previous 1.3 foot offset');
  const seat = benchGroup.children.find((part) => part.name === 'Piano bench seat');
  near(seat.w * 12, 24, 'Seat width unchanged');
  near(seat.d * 12, 12, 'Seat depth unchanged');
  near(seat.position.y * 12, 18, 'Seat center height unchanged');
  const consoleParts = [];
  piano.children.filter((part) => part !== benchGroup).forEach((part) => part.traverse((mesh) => { if (mesh.isMesh) consoleParts.push(mesh); }));
  for (const legOrSeat of benchGroup.children) for (const part of consoleParts) {
    const a = worldCorners(legOrSeat), b = worldCorners(part);
    const overlaps = [0, 1, 2].every((axis) => Math.min(Math.max(...a.map((p) => p[axis])), Math.max(...b.map((p) => p[axis]))) -
      Math.max(Math.min(...a.map((p) => p[axis])), Math.min(...b.map((p) => p[axis]))) > 1e-6);
    assert.ok(!overlaps, `${legOrSeat.name} clears ${part.name}`);
  }
});

test('U layout placement tuple restores after switching living layouts', () => {
  const { context, source, scene } = buildLounge();
  const lounge = scene.children.find((child) => child.name === 'Fireplace-facing U sectional - fit study');
  const stub = () => { const g = new (lounge.constructor)(); return g; };
  Object.assign(context, {
    navigationMode: 'rotate', activeFloor: 'ground', referenceLounge: lounge,
    sofa: stub(), sectional: stub(), downloadedSofa: stub(), familySectional: stub(), familyLiving: stub(),
    familyOttoman: { position: {} }, readingLamp: stub(), livingArmchairs: [stub(), stub()], loungeChairs: [stub(), stub()],
    cornerOttoman: stub(), readingOttoman: stub(), livingFeatureWall: getLivingRoomFeatureLayout(),
    document: { querySelectorAll: () => [], getElementById: () => ({}) }, viewport: { dataset: {} }, buildWalkObstacles() {}
  });
  context.familyLiving.userData.ottoman = { x: 0, z: 0 };
  vm.runInContext(source.slice(source.indexOf('  const livingLayouts ='), source.indexOf('  const tableX =')), context);
  vm.runInContext(source.slice(source.indexOf('  function applyLivingLayout('), source.indexOf('  applyLivingLayout(livingLayouts[0], false);')), context);
  const layouts = vm.runInContext('livingLayouts', context);
  assert.equal(layouts[0].id, 'reference-lounge');
  assert.match(layouts[0].title, /U sectional/);
  assert.doesNotMatch(layouts[0].note, /POANG|reading chair sits|end table\/lamp beside/);
  lounge.position.set(9, 0, 9);
  for (const layout of [layouts[0], layouts.find((item) => item.id === 'double-chaise'), layouts[0]]) {
    context.applyLivingLayout(layout, false);
    const active = layout === layouts[0];
    assert.equal(lounge.visible, active);
    lounge.traverse((part) => assert.equal(part.userData.livingLayoutHidden, !active));
  }
  assert.deepEqual([lounge.position.x, lounge.position.z, lounge.rotation.y], [...lounge.userData.centerOffset]);
  const sofa = worldBounds(lounge.children[0]);
  near(sofa.maxX, 12.75, 'Restored U back');
  near(sofa.minZ, 11.975, 'Restored U north edge');
});

test('both fireplace built-ins are removed with no constituent meshes, group or userData', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  for (const name of ['Paired low white-oak fireplace built-ins', 'halved fireplace built-in', 'Fireplace cabinet recessed plinth', 'Standard 36 inch cabinet side',
    'Fireplace cabinet media shelf', 'Closed Shaker media door', 'Stone-side cabinet scribe filler', 'Finished exposed cabinet end panel', 'Continuous low oak built-in top']) {
    assert.ok(!source.includes(name), `${name} is deleted, not hidden`);
  }
  assert.doesNotMatch(source, /fireplaceBuiltIns|fireplaceBuiltInLayout|cabinetsPerSide|outerBoxesRemoved|builtInsHalved|builtInFrontX/);
  // The fireplace block runs straight from the TV to the sconces with nothing in between.
  const tv = source.indexOf("'Fireplace television';");
  const sconces = source.indexOf('  const livingSconces = new THREE.Group();');
  assert.ok(tv > 0 && sconces > tv);
  assert.doesNotMatch(source.slice(tv, sconces), /box\(|new THREE\.Group|shakerFront\(/, 'No geometry between the TV and the sconces');
  const { scene } = buildLounge();
  const names = [];
  scene.traverse((part) => names.push(part.name || ''));
  assert.ok(!names.some((name) => /built-in|fireplace cabinet|media door|scribe filler/i.test(name)), 'Living lounge and piano contain no built-in parts');
  const lounge = scene.children.find((child) => child.name === 'Fireplace-facing U sectional - fit study');
  assert.equal(lounge.userData.fireplaceSideCabinets, 0);
  near(lounge.userData.stoneFaceX, 1.38, 'Stone face plane recorded for clearance checks');
});
