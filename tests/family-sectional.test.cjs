'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { getLivingRoomFeatureLayout } = require('../assets/js/floor-plan-ground.js');

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
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
  const loungeSource = source.slice(source.indexOf('  const referenceLounge ='), source.indexOf('  const tableX ='));
  vm.runInContext(loungeSource, context);
  const placeSource = source.slice(source.indexOf('  scene.add(piano);'), source.indexOf('\n', source.indexOf('  piano.userData.location =')));
  context.stairOpening = require('../assets/js/upstairs-layout.js').stairOpening();
  context.pianoDepth = 411 / 304.8;
  context.kidsRoom = { x: 19, z: 26.9, width: 8.75 };
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
  near(measured.minZ, 12.5, 'North return back');
  near(measured.maxZ, 23.5, 'South return back');
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
  near((measured.minZ - getLivingRoomFeatureLayout().wallStartZ) * 12, 39.3, 'North window-wall clearance');
  near((getLivingRoomFeatureLayout().wallEndZ - measured.maxZ) * 12, 39.3, 'Equal south wall clearance');
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
  assert.equal((lighting.match(/fixture\([^)]*'ground', true\)/g) || []).length, 0, 'Removed living task lamps have no remaining light');
});

test('living piano, bench and attached lamp are removed rather than hidden or relocated', () => {
  const { source, scene } = buildLounge();
  const names = [];
  scene.traverse((part) => names.push(part.name || ''));
  assert.ok(!names.some((name) => /piano|bench|music lamp/i.test(name)));
  assert.doesNotMatch(source, /Yamaha CLP-825|livingPiano|livingPianoBench/);
});

test('default living furniture is only the U sectional and rug at their authored poses', () => {
  const { source, scene } = buildLounge();
  assert.deepEqual(scene.children.map((child) => child.name), ['Fireplace-facing U sectional - fit study']);
  const lounge = scene.children[0];
  assert.equal(lounge.visible, true);
  assert.deepEqual([lounge.position.x, lounge.position.y, lounge.position.z, lounge.rotation.y], [0, 0, 0, 0]);
  assert.deepEqual([...lounge.userData.centerOffset], [0, 0, 0]);
  lounge.traverse((part) => assert.ok(part.visible !== false && !part.userData.livingLayoutHidden));
  const sofa = worldBounds(lounge.children[0]);
  near(sofa.maxX, 12.75, 'U back');
  near(sofa.minZ, 12.5, 'U north edge');
  const start = source.indexOf("  viewport.dataset.livingLayout = 'reference-lounge';");
  const end = source.indexOf('  const initialParameters =', start);
  assert.ok(start > 0 && end > start && end - start < 200, 'Default living setup is a bounded two-statement block');
  let walkBuilds = 0;
  const context = { viewport: { dataset: {} }, buildWalkObstacles() { walkBuilds++; } };
  vm.runInNewContext(source.slice(start, end), context);
  assert.equal(context.viewport.dataset.livingLayout, 'reference-lounge');
  assert.equal(walkBuilds, 1);
  assert.doesNotMatch(source, /livingLayouts|applyLivingLayout|livingLayoutHidden|familySectional|familyLiving|downloadedSofa|livingArmchairs|loungeChairs/);
});

test('both fireplace built-ins are removed with no constituent meshes, group or userData', () => {
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
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
