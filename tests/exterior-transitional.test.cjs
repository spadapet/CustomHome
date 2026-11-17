'use strict';
// November 15 English-French Transitional exterior: full brick, entrance-only cast stone,
// and geometry preservation against the committed pre-change baseline
// (tests/fixtures/exterior-geometry-baseline.json, captured from HEAD 1e61f87).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ground = require('../assets/js/floor-plan-ground.js');
const upper = require('../assets/js/floor-plan-upstairs.js');
const HomeRoof = require('../assets/js/floor-plan-roof.js');
const UpstairsLayout = require('../assets/js/upstairs-layout.js');
const { runExteriorWalls, roofFaces } = require('./exterior-geometry-harness.cjs');
const baseline = require('./fixtures/exterior-geometry-baseline.json');
const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'), 'utf8');
const round = (value) => JSON.parse(JSON.stringify(value, (key, x) => typeof x === 'number' ? Math.round(x * 1e6) / 1e6 : x));

test('existing openings stay fixed while two approved garage attic windows are added', () => {
  const { walls } = runExteriorWalls();
  const openingGeometry=wall=>wall.map((value,index)=>index===7&&wall[0]==='garage front'?value.filter(opening=>opening.door):value).filter((value,index)=>index!==6);
  assert.deepEqual(round(walls.map(openingGeometry)), baseline.exteriorWalls.map(openingGeometry), 'wall lines, datums and every opening tuple unchanged; garage wall head intentionally rises');
  const openings = walls.flatMap((wall) => wall[7] ?? []);
  assert.equal(openings.filter((o) => o.door).length, baseline.exteriorWalls.flatMap((w) => w[7] ?? []).filter((o) => o.door).length);
  assert.equal(openings.length,34,'two attic windows added; existing openings retained');
  assert.deepEqual(round(ground.getGroundFrontWindows()), baseline.groundFrontWindows);
  const { spring, radius, centerY, ...rectangularEntry } = baseline.frontEntry;
  assert.deepEqual(round(ground.getFrontEntryLayout()), rectangularEntry, 'entry x/z/width/height, hinge and surround width unchanged; arch profile explicitly superseded');
  assert.deepEqual(round(ground.getLivingRoomFeatureLayout()), baseline.livingFeature);
  assert.deepEqual(round(ground.getGarageClerestoryLayout(-1.25)), baseline.garageClerestories);
  assert.deepEqual(round(ground.getPrepWindowLayout()), baseline.prepWindows);
  assert.deepEqual(round(ground.getPrepWindowBankLayout()), baseline.prepBank);
  assert.deepEqual(round(ground.getKitchenWindowBankLayout()), baseline.kitchenBank);
  assert.deepEqual(round(ground.getGuestEntryLayout().windows), baseline.guestEntryWindows);
  assert.deepEqual(round(upper.getUpstairsFrontWindows()), baseline.upstairsFrontWindows);
  assert.deepEqual(round(upper.getUpstairsSideWindows()), baseline.upstairsSideWindows);
  assert.deepEqual(round(upper.getUpstairsExteriorSegments()), baseline.upstairsSegments);
  assert.deepEqual(round(upper.getUpstairsDefaultPlan(UpstairsLayout.stairOpening()).windows), baseline.upstairsPlanWindows);
  assert.deepEqual(round(upper.getUpstairsExteriorSegments().map(([n, x1, z1, x2, z2]) => [n, upper.getUpstairsExteriorOpenings(x1, z1, x2, z2, 10)])), baseline.upstairsExteriorOpenings);
});

test('archived roof remains available while approved massing changes preserve the porch plane', () => {
  assert.deepEqual(round(roofFaces(HomeRoof.getHistoricalRoofDefinitions(10))), baseline.roof.connected);
  assert.deepEqual(round(roofFaces(HomeRoof.getHistoricalRoofDefinitions().filter(d=>d.id.startsWith('Garage')||d.id==='Dining rear projection'))), baseline.roof.lower);
  assert.equal(HomeRoof.getConnectedRoofDefinitions(10).filter((d) => /^(East|West) front gable$/.test(d.id)).length, 2, 'paired front gables remain');
  assert.doesNotMatch(source, /dormer/i, 'no new dormers');
  // Intentional November 15 delta: the segmental 'Entry barrel metal' hump is removed.
  // The main porch plane (pitch, eave line, sides, front edge) equals the baseline;
  // only its concealed rear edge moves into the upper wall and a coplanar recess
  // infill reaches the closet-4 brick, so it meets masonry everywhere.
  const before = baseline.roof.porchDefinitions, after = round(HomeRoof.getPorchRoofDefinitions());
  assert.ok(before.some((d) => d.id === 'Entry barrel metal'), 'baseline recorded the arched entry roof');
  assert.ok(!after.some((d) => /barrel|arch|curv|segment/i.test(d.id)), 'no arched/curved porch roof definition remains');
  const [beforeMain] = before, [afterMain, recess] = after;
  assert.equal(afterMain.id, beforeMain.id);
  assert.deepEqual(afterMain.planes, beforeMain.planes, 'same porch pitch and eave height');
  assert.deepEqual([afterMain.bounds[0], afterMain.bounds[1], afterMain.bounds[3]], [beforeMain.bounds[0], beforeMain.bounds[1], beforeMain.bounds[3]], 'same sides and front eave');
  const g = upper.getUpstairsMeasuredGeometry();
  assert.equal(afterMain.bounds[2], g.south, 'rear edge is concealed in the upper bedroom wall');
  assert.deepEqual(recess, { id: 'Porch recess metal', finish: 'metal', bounds: [g.southClosetWest, g.southClosetEast, g.southClosetSouth, g.south], planes: beforeMain.planes });
  const faces = roofFaces(HomeRoof.getPorchRoofDefinitions());
  assert.ok(faces.every((f) => f.plane.every((v, i) => Math.abs(v - beforeMain.planes[0][i]) < 1e-6)), 'every porch face lies on the single straight plane');
  const baselineFaces = baseline.roof.porch.filter((f) => f.roof === 'Porch metal');
  const eave = (polygons) => polygons.flatMap((f) => f.polygon).filter(([, z]) => Math.abs(z - beforeMain.bounds[3]) < 1e-6).map(([x]) => x);
  assert.deepEqual([Math.min(...eave(faces)), Math.max(...eave(faces))], [Math.min(...eave(baselineFaces)), Math.max(...eave(baselineFaces))], 'eave runs the same full width');
});

test('porch roof has no arched or curved meshes and a continuous straight fascia at constant height', () => {
  assert.doesNotMatch(source, /Entry barrel metal|closureProfile|barrelTopAt|entry roof end closure|entry-bay porch ceiling|Straight entry fascia|Porch side fascia/);
  const fasciaCalls = source.match(/porchFascia\.name = '[^']+'/g) ?? [];
  assert.deepEqual(fasciaCalls, ["porchFascia.name = 'Continuous straight porch fascia'"]);
  assert.match(source, /box\(group, 15\.6, porchFasciaTop - porchFasciaHeight \/ 2, porchFasciaZ,\s+31\.85 \+ 0\.65, porchFasciaHeight, porchFasciaDepth, trim\)/,
    'one member from x-0.65 to x31.85 at the side-bay fascia height');
  assert.match(source, /porchRoof\.traverse|for \(const root of \[setbackRoofs, porchRoof\]\)/, 'porch roof still passes the masonry stop');
  assert.match(source, /counterflashing\.name = 'Porch roof-to-brick counterflashing'/);
});

test('porch footprint stays 31 ft 2 in by 7 ft at its existing location', () => {
  const front = ground.getGroundFrontLayout();
  assert.deepEqual(round(front), baseline.groundFrontLayout);
  assert.equal(front.porchDepth, 7);
  assert.match(source, /paving\(group, 'Covered front porch', 0, frontWallZ, 31\.2, frontLayout\.porchDepth, 0, 1\.65, palePaving\)/);
  assert.match(source, /brickBox\(group, 15\.6, -0\.825, 57\.7 \+ frontShift, 31\.2, 1\.65, frontLayout\.porchDepth\);/);
  assert.match(source, /for \(const x of \[1, 11\.65, 19\.55, 30\.2\]\) \{/, 'four existing column positions retained');
});

test('all perimeter walls, returns, upper floor and garage are continuous brick with no stone band', () => {
  const { group, walls, materials } = runExteriorWalls();
  assert.equal(walls.length, 10 + upper.getUpstairsExteriorSegments().length);
  for (const [name, x1, z1, x2, z2, bottom, top, holes = []] of walls) {
    const wall = group.children.find((o) => o.name === `Exterior brick wall: ${name}`);
    assert.ok(wall, name);
    const fields = wall.children.filter((o) => o.material && Math.abs(o.z) < 1e-8);
    const length = Math.hypot(x2 - x1, z2 - z1);
    let solid = 0;
    // Every solid sample has exactly one field panel, and it is brick from footing to wall head.
    for (let x = 0.137; x < length; x += 0.31) for (let y = Math.max(bottom, -0.2) + 0.113; y < top; y += 0.23) {
      const hole = holes.some((o) => x > o.center - o.width / 2 && x < o.center + o.width / 2 && y > o.sill && y < o.sill + o.height);
      const hits = fields.filter((o) => x > o.x - o.w / 2 && x < o.x + o.w / 2 && y > o.y - o.h / 2 && y < o.y + o.h / 2);
      assert.equal(hits.length, hole ? 0 : 1, `${name} field at ${x},${y}`);
      if (!hole) { solid++; assert.equal(hits[0].material, materials.brick, `${name} at y=${y.toFixed(2)} is brick`); }
    }
    assert.ok(solid > 0, name);
    assert.ok(!wall.children.some((o) => o.material === materials.castStone), `${name}: no cast stone on the walls`);
    assert.ok(!wall.children.some((o) => /stone|wainscot|coping|limestone/i.test(o.name ?? '')), `${name}: no stone band pieces`);
  }
  for (const name of ['front ground floor', 'garage front', 'east ground floor', 'garage porch return', 'upper front bedrooms', 'upper front bedroom 4'])
    assert.ok(walls.some(([wallName]) => wallName === name), `${name} is a brick wall`);
});

test('former applied stone is brick (soldier/rowlock/jamb) or warm cream trim; cast stone is entrance-only', () => {
  const { meshes, materials } = runExteriorWalls();
  const named = (pattern) => meshes.filter((o) => pattern.test(o.name ?? ''));
  assert.ok(named(/Upper window brick rowlock sill/).length >= 8);
  assert.ok(named(/Upper window brick soldier head/).every((o) => o.material === materials.soldier));
  assert.ok(named(/Upper window brick jamb return/).every((o) => o.material === materials.brick));
  assert.equal(named(/Paired window continuous brick rowlock sill/).length, 2);
  assert.ok(named(/Upper masonry base course/).every((o) => o.material === materials.soldier), 'belt course is a brick soldier course');
  assert.ok(named(/Cornice frieze/).every((o) => o.material === materials.brick), 'corbelled brick frieze');
  assert.ok(named(/Cornice (projecting crown|lower bed molding)|weathering cap/).every((o) => o.material === materials.trim));
  // Production source: every cast-stone (base) brickBox and the cast-stone surround are at the entrance.
  const castCalls = [...source.matchAll(/brickBox\(([^;]*), true\)(?:\.name = '([^']+)')?/g)];
  assert.deepEqual(castCalls.map((m) => m[2]), ['Entry landing cast-stone nose']);
  assert.match(source, /buildRectangularFrontEntry\(THREE, \{[^}]*surroundFinish: entryCastStone/);
  // Every other cast-stone reference is the entry surround or the front entry steps.
  const lines = source.split(/\r?\n/);
  const builderStart = lines.findIndex((line) => line.startsWith('function buildExteriorModel'));
  const uses = lines.map((line, index) => [line, index]).filter(([line, index]) => index > builderStart && !/finishes\.castStone/.test(line) && /\b(castStone|entryCastStone|baseBrick)\b/.test(line));
  const allowed = [
    /const castStone = baseBrick|baseBrick = new THREE|baseBrick\.(name|normalScale)|let baseBrick|const finish = base \? baseBrick/,
    /entryCastStone/, /const brick = baseBrick\.clone\(\)|brick\.map = baseBrick\.map\.clone\(\)/
  ];
  for (const [line, index] of uses) assert.ok(allowed.some((pattern) => pattern.test(line)), `Line ${index + 1} uses cast stone outside the entrance: ${line.trim()}`);
  const stepLoop = lines.findIndex((line) => line.includes("part.name === 'Darker stone entry tread'"));
  for (const [line, index] of uses.filter(([line]) => /baseBrick\.clone\(\)|baseBrick\.map\.clone/.test(line))) assert.ok(index > stepLoop && index < stepLoop + 4, 'only the front entry step risers');
  assert.doesNotMatch(source, /Continuous low stone wainscot|Pale base transition coping|Ashlar stone|limestone lintel|cut-stone sill|Pale limestone garage/);
  // The unfinished attic void's north gable end is closed in brick (rear elevation), butting the east closure.
  assert.match(source, /'Loft north fitted brick closure'/);
  assert.match(source, /'Garage rear roof-zone brick infill'/);
  const lower = HomeRoof.buildRoofEnvelope(HomeRoof.getConnectedRoofDefinitions());
  const [segment] = HomeRoof.wallHeadSegments(lower, [42.583333333333336 + 0.225, 27.725], [55.5, 27.725], 9);
  assert.ok(segment && segment.start[1] > 14 && segment.end[1] > 14, 'closure rises from the 9 ft wall head to the actual garage gable underside');
});

test('actual fitted gable/attic wall closures use the same brick material as the remaining wall height', () => {
  const { c, run, Group } = runExteriorWalls();
  c.eaves = 19; c.frontBrick = { clone() { return { brick: true }; } };
  c.houseRoof = new Group(); c.brickFaceUVs = () => {};
  c.THREE.BufferGeometry = class {
    constructor() { this.attributes = {}; }
    setAttribute(name, a) { this.attributes[name] = a; }
    computeVertexNormals() {}
  };
  c.THREE.Float32BufferAttribute = class { constructor(array) { this.array = array; } };
  c.THREE.Mesh = class extends Group { constructor(geometry, material) { super(); Object.assign(this, { geometry, material }); } };
  run(source, '  const houseRoofPlan =', '  houseRoof.userData.drainageIntent =');
  const closures = c.houseRoof.children;
  assert.ok(closures.length >= 10);
  assert.ok(closures.every((o) => o.material.brick && o.userData.cladding === 'brick'));
  const ys = closures.flatMap((o) => o.geometry.attributes.position.array.filter((_, i) => i % 3 === 1));
  assert.ok(Math.min(...ys) >= 19);
  assert.ok(Math.max(...ys) > 24, 'Both tall front gable wall closures remain brick');
});

test('garage doors are warm taupe recessed-panel carriage doors in the unchanged 9 x 8 ft openings', () => {
  const start = source.indexOf('  for (const center of [37, 48.5]) {');
  const block = source.slice(start, source.indexOf('  function lantern(', start));
  assert.match(block, /openingWidthFeet: 9, openingHeightFeet: 8/);
  assert.match(block, /box\(garageLeaf, 0, -4, 0, 9, 8, 0\.16, garageDoorFinish\)\.name = 'Warm taupe recessed-panel garage door'/);
  assert.match(block, /doorColor: finishes\.garageDoor\.color/);
  assert.doesNotMatch(block, /oak|Natural wood/i);
  assert.match(source, /const garageDoorFinish = mat\(finishes\.garageDoor\.color, finishes\.garageDoor\.roughness\)/);
  const { walls } = runExteriorWalls();
  const garage = walls.find(([name]) => name === 'garage front')[7];
  assert.deepEqual(garage.filter(opening=>opening.door).map(({ center, width, height }) => [center, width, height]), [[5.8, 9, 8], [17.3, 9, 8]]);
});

test('front entry keeps its 5 x 8 ft opening with rectangular matte natural oak double doors', () => {
  const layout = ground.getFrontEntryLayout();
  assert.equal(layout.width, 5);
  assert.equal(layout.height, 8);
  assert.match(source, /oakFinish: oakDoorFinish/);
  const viewer = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
  assert.match(viewer, /oakFinish: exteriorFinishes\.entryDoor/);
  const vm = require('node:vm'), context = {};
  vm.runInNewContext(source.slice(0, source.indexOf('function buildExteriorModel')), context);
  const door = context.getExteriorMaterialConfig().entryDoor;
  assert.ok(door.roughness >= 0.75, 'matte / low sheen');
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(door.leafTint.slice(i, i + 2), 16));
  assert.ok(r > g && g > b && r - b < 80, 'warm medium oak tint, not orange/red or gray-washed');
});
