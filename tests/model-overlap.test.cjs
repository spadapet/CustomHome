'use strict';
// Regression coverage for the November 15 whole-model overlap audit. Each test builds the
// actual constituent boxes from a source slice and checks them against the finished faces
// they used to penetrate (tolerance: 0.25 in of intended contact/joinery).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ground = require('../assets/js/floor-plan-ground.js');
const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
const exteriorSource = fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'), 'utf8');
const JOINT = 0.25 / 12;

class Node {
  constructor(name = '') {
    this.name = name; this.children = []; this.userData = {}; this.visible = true;
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = { x: 1, y: 1, z: 1, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
  }
  add(child) { child.parent = this; this.children.push(child); }
  traverse(visit) { visit(this); this.children.forEach((child) => child.traverse(visit)); }
  clone() { const copy = new Node(this.name); Object.assign(copy.userData, this.userData); copy.size = this.size; return copy; }
  getWorldPosition() { return { y: this.position.y }; }
}
function slice(text, from, to) {
  const start = text.indexOf(from);
  const end = text.indexOf(to, start + 1);
  assert.ok(start >= 0 && end > start, `${from} .. ${to}`);
  return text.slice(start, end);
}
function helpers(extra = {}) {
  class Vector2 {
    constructor(x, y) { Object.assign(this, { x, y }); }
    clone() { return new Vector2(this.x, this.y); }
    addScaledVector(other, scale) { this.x += other.x * scale; this.y += other.y * scale; return this; }
  }
  const context = {
    THREE: { Group: Node, Mesh: Node, Vector2, Vector3: class {}, TorusGeometry: class { constructor(r, t) { this.r = r + t; } }, SphereGeometry: class { constructor(r) { this.r = r; } }, MeshStandardMaterial: class {} },
    mat: () => ({}), steel: {}, black: {}, brass: {}, windowTrim: {}, cream: {}, oak: {}, linen: {},
    box(parent, x, y, z, w, h, d) {
      const part = new Node(); part.size = [w, h, d]; part.position.set(x, y, z); parent.add(part); return part;
    },
    cylinder(parent, x, y, z, radius, height) { return context.box(parent, x, y, z, radius * 2, height, radius * 2); },
    stairBeam() { return new Node(); },
    ...extra
  };
  return context;
}
function bounds(node) {
  const result = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  node.traverse((part) => {
    const size = part.size ?? (part.geometry?.r ? Array(3).fill(part.geometry.r * 2) : null);
    if (!size) return;
    for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) {
      let x = dx * size[0] / 2, y = dy * size[1] / 2, z = dz * size[2] / 2;
      for (let current = part; current; current = current.parent) {
        x *= current.scale.x; y *= current.scale.y; z *= current.scale.z;
        const angle = current.rotation.y;
        [x, z] = [x * Math.cos(angle) + z * Math.sin(angle), -x * Math.sin(angle) + z * Math.cos(angle)];
        x += current.position.x; y += current.position.y; z += current.position.z;
      }
      result.minX = Math.min(result.minX, x); result.maxX = Math.max(result.maxX, x);
      result.minY = Math.min(result.minY, y); result.maxY = Math.max(result.maxY, y);
      result.minZ = Math.min(result.minZ, z); result.maxZ = Math.max(result.maxZ, z);
    }
  });
  return result;
}

test('refrigeration bank (owner garage-view slab) stays on the kitchen side of the kitchen/garage wall face', () => {
  const refrigeration = ground.getKitchenRefrigerationLayout();
  const plan = ground.getGroundFloorDefaultPlan();
  const kitchenSouth = plan.walls.find(([name]) => name === 'Kitchen south');
  const wallFace = kitchenSouth[2] - 0.175;
  assert.equal(refrigeration.wallSetback, 0, 'No setback into the wall');
  const kitchen = new Node('kitchen');
  const context = helpers({
    kitchen, ceilingHeight: 9, kitchenRefrigeration: refrigeration, cabinetFinish: {}, cabinetRailFinish: {}, cabinetPanelFinish: {},
    shakerFront(parent, x, y, z, w, h, rotation = 0, depth = 0.08) {
      const front = new Node('Shaker front'); front.size = [w, h, depth]; front.position.set(x, y, z); front.rotation.y = rotation; parent.add(front); return front;
    },
    cabinetPull() {}
  });
  vm.runInNewContext(slice(source, '  const bottomRun =', '  const island ='), context);
  const parts = [];
  kitchen.traverse((part) => { if (part.size) parts.push(part); });
  assert.ok(parts.length > 30, `${parts.length} constituent boxes`);
  const cornice = parts.find((part) => part.name === 'Continuous refrigeration cabinet cornice');
  const chassis = parts.filter((part) => part.name === 'Sub-Zero Designer chassis envelope');
  assert.ok(cornice && chassis.length === 2);
  for (const part of parts) {
    const b = bounds(part);
    assert.ok(b.maxZ <= wallFace + 1e-9, `${part.name || 'part'} reaches z${b.maxZ.toFixed(4)} past the wall face z${wallFace}`);
  }
  // The full-height oak cornice and chassis bear on the face rather than float.
  assert.ok(Math.abs(bounds(cornice).maxZ - wallFace) < 1e-9);
  for (const unit of chassis) assert.ok(Math.abs(bounds(unit).maxZ - wallFace) < 1e-9);
  // Its kids-room wall stays flush with the cabinet face (owner constraint) after the bank moved.
  const kids = plan.floors.find((floor) => floor.room === 'Kids room');
  assert.ok(Math.abs(kids.z - 0.175 - refrigeration.bodyFaceZ) < 1e-9);
});

test('garage yard-tool storage and garden rail stay clear of the entry tread and wall faces', () => {
  const garageEntry = vm.runInNewContext(`(${source.match(/const garageEntry = (\{[^}]+\});/)[1]})`);
  const furnishings = [];
  const garageAssets = new Proxy({}, { get: (target, id) => Object.assign(new Node(id), { size: [0.1, 0.1, 0.1], userData: { heightInches: 6, depthInches: 2 } }) });
  const context = helpers({
    garageFloorY: -1.25, garageAssets, bicycleGeometry: new Node(),
    furnishing(name, x, z, rotation = 0, y = 0) { const group = new Node(name); group.position.set(x, y, z); group.rotation.y = rotation; furnishings.push(group); return group; }
  });
  vm.runInNewContext(slice(source, '  const yardTools = furnishing(', '  const rake = new THREE.Group();'), context);
  const yard = furnishings.find((group) => group.name === 'Garage yard-tool storage');
  const vacuum = yard.children.find((part) => part.name === 'Large rolling shop vacuum');
  const treadWest = garageEntry.x + garageEntry.width / 2 - garageEntry.treadWidth / 2;
  assert.ok(bounds(vacuum).maxX <= treadWest - JOINT, 'Shop vac drum clears the intermediate tread');
  const garageSideFace = 26.9 + 0.175;
  assert.ok(bounds(yard).minZ >= garageSideFace - 1e-9, 'Tool board and shelves start at the garage wall face');
  const rail = furnishings.find((group) => group.name === 'Accessible garage garden-tool rail');
  for (const part of rail.children.filter((child) => child.name === 'Garage garden-tool mounting rail')) {
    assert.ok(bounds(part).minZ >= 15 + 0.175 - 1e-9, 'Mounting rail is fixed to, not buried in, the north garage wall');
  }
});

test('split-floor garage doorway has one threshold, not a coincident wall stub', () => {
  const walls = [];
  const context = helpers({
    walls, windowWallDatums: [], baseTrimSections: [], wallMaterial: {}, scene: new Node(), shell: new Node(),
    casingSideWidth: 2.5 / 12, casingReveal: 0.125 / 12, ceilingHeight: 9, groundFrontWallZ: 54.675, garageRise: 7.5 / 12,
    openingCasing() {}
  });
  vm.runInNewContext(`${slice(source, '  function wall(', '  function joinWallCorners()')}
    wall(37.5, 26.9, 44.9 - 8 / 12, 26.9, false, [[0.5, 3.5, 0, 8]], 9, [-1, 1], 0, -1.25, { sideWidth: 2.5 / 12, splitFloor: true });`, context);
  const stubs = walls.filter((mesh) => mesh.userData.top <= 0 && Math.abs(mesh.position.x - 2) < 1.5 + 1e-9);
  assert.equal(stubs.length, 0, 'The garage-entry threshold assembly alone fills the doorway below the house floor');
});

test('door casing legs and head ends are scribed to an adjoining wall face', () => {
  const parts = [];
  const context = helpers({ casingSideWidth: 2.5 / 12, casingReveal: 0.125 / 12, walls: parts });
  vm.runInNewContext(slice(source, '  function openingCasing(', '  const baseTrimSections ='), context);
  const parent = new Node();
  const extent = () => { const b = bounds(parent); return [b.minX, b.maxX]; };
  context.openingCasing(parent, 0, 0, 2.5, 8, 0.175, 1, false, {});
  const [freeMin, freeMax] = extent();
  assert.ok(Math.abs(freeMax - (1.25 + 0.125 / 12 + 2.5 / 12 + 0.0625)) < 1e-9, 'Unconstrained casing is unchanged');
  assert.ok(Math.abs(freeMin + freeMax) < 1e-9);
  for (const side of [1, -1]) {
    parent.children.length = 0;
    // Guest WC door: 1.96 in from the south jamb to the bathroom-south wall face.
    context.openingCasing(parent, 0, 0, 2.5, 8, 0.175, side, false, { edgeRoom: { [-1]: Infinity, 1: 0.163 } });
    const b = bounds(parent);
    assert.ok(b.maxX <= 1.25 + 0.163 + 1e-9, `side ${side}: casing stops at the adjoining wall face`);
    assert.ok(Math.abs(b.minX + freeMax) < 1e-9, 'Unconstrained edge keeps the full casing');
  }
});

test('office French-door leaves open within the jamb, clear of the wall and casing', () => {
  const groups = [];
  const context = helpers({
    officeEntry: { x: 12.2, z: 45.25, width: 5, height: 8 }, groundFrontWallZ: 54.675, officeFurnitureInset: 0.5, officeNorthZ: 40.5,
    furnishing(name, x, z, rotation = 0) { const group = new Node(name); group.position.set(x, 0, z); group.rotation.y = rotation; groups.push(group); return group; }
  });
  context.THREE.SphereGeometry = class { constructor(r) { this.r = r; } };
  vm.runInNewContext(slice(source, '  const officeDoors = furnishing(', '  const ellipticalLength ='), context);
  const doors = groups.find((group) => group.name === 'Office white ten-lite French doors');
  const local = new Node(); // Measure leaf frames in the door frame: x runs along the opening.
  for (const leaf of doors.children) {
    assert.equal(Math.abs(leaf.rotation.y), Math.PI / 2, 'Default display pose stays open 90 degrees');
    const frame = leaf.children.filter((part) => /French-door (stile|rail)/.test(part.name));
    assert.equal(frame.length, 4);
    local.children = [leaf]; leaf.parent = local;
    const saved = leaf.children; leaf.children = frame;
    const b = bounds(local);
    leaf.children = saved; leaf.parent = doors;
    assert.ok(b.minX >= -2.5 + 0.125 / 12 - 1e-9 && b.maxX <= 2.5 - 0.125 / 12 + 1e-9, 'Open leaf stays inside the 60-in opening');
    assert.ok(b.minZ < -2.3 && b.maxZ <= 0.175, 'Leaf swings into the office from within the wall thickness');
  }
});

test('fireplace stone, firebox and mantel start at the finished wall and stone faces', () => {
  const parts = [];
  const context = { fireplaceFaceX: 1.38, livingCenterZ: 15, ceilingHeight: 9, fireboxBottom: 1, fireboxHeight: 1.25, fireplace: {}, scene: {}, mortar: {}, black: {}, cabinetRailFinish: {},
    box(parent, x, y, z, w, h, d) { const part = { x, w }; parts.push(part); return part; } };
  vm.runInNewContext(`${source.match(/  const fireplaceBackingFrontX = .+/)[0]}\n${source.match(/  const fireplaceBackingDepth = .+/)[0]}
    ${source.match(/^  box\(fireplace, .*'Fireplace stone backing';$/m)[0]}
    ${source.match(/^  const firebox = box\(.+$/m)[0]}
    ${source.match(/^  const mantel = box\(.+$/m)[0]}`, context);
  const [backing, firebox, mantel] = parts;
  const deepestStoneFace = 1.38 - 0.08 + 0.065 + 2 * 0.008;
  assert.ok(Math.abs(backing.x - backing.w / 2 - 0.175) < 1e-9, 'Stone backing starts at the west wall face');
  assert.ok(firebox.x - firebox.w / 2 >= deepestStoneFace - 1e-9, 'Firebox face is applied in front of the stone');
  assert.ok(mantel.x - mantel.w / 2 >= deepestStoneFace - 1e-9, 'Mantel bears on the stone face');
});

test('front beds, shrubs and rear foundation planting stay off the steps and outside the house', () => {
  const group = new Node();
  const context = helpers({
    group, drivewayLeft: 30.9, frontPorchEdgeZ: ground.getGroundFrontLayout().porchEdgeZ, frontShift: ground.getGroundFrontLayout().extension
  });
  context.THREE.Mesh = class extends Node { constructor(geometry) { super(); this.geometry = geometry; } };
  vm.runInNewContext(slice(exteriorSource, '  const mulch =', '  // Finished masonry stop for every low roof'), context);
  const steps = { minX: 15.6 - 10.8 / 2, maxX: 15.6 + 10.8 / 2 };
  let front = 0, rear = 0;
  for (const part of group.children) {
    const b = bounds(part);
    if (/front-bed|mulch bed|stone edge|Front mulch-bed shrub/i.test(part.name)) {
      front++;
      assert.ok(b.maxX <= steps.minX + 1e-9 || b.minX >= steps.maxX - 1e-9, `${part.name} stays beside the entry steps`);
    }
    if (part.name === 'Concept foundation planting') {
      rear++;
      assert.ok(b.maxZ <= 6.75 + 1e-9, 'Foundation shrub sits outside the rear stone face');
      assert.ok(Math.abs(b.minY + 1.64) < 1e-9, 'Shrub rests on the garden soil');
    }
  }
  assert.ok(front > 20 && rear >= 10);
  const shrubs = group.children.filter((part) => part.name === 'Concept foundation planting');
  for (let index = 1; index < shrubs.length; index++) assert.ok(shrubs[index].position.x - shrubs[index - 1].position.x >= 1.8, 'Rear shrubs do not interpenetrate');
});

// Positive interpenetration of two axis-aligned constituent boxes (feet), or <= 0 when clear.
function penetration(a, b) {
  return Math.min(Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX), Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY), Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));
}
function sizedParts(root) {
  const parts = [];
  root.traverse((part) => { if (part.size) parts.push(part); });
  return parts;
}

test('Bath 2 window: painted casing stops at the Bedroom 2 shower face; tiled returns and a notched tile wall clear the opening', () => {
  const layout = require('../assets/js/upstairs-layout.js');
  class Group extends Node {
    add(...children) { children.forEach((child) => super.add(child)); }
    updateMatrixWorld() {}
  }
  const tileMaterial = { name: 'tile' }, material = { clone() { return { ...this }; } };
  const make = (name = '') => new Group(name);
  const box = (parent, x, y, z, w, h, d, finish = material) => {
    const part = make(); part.size = [w, h, d]; part.material = finish; part.geometry = { parameters: { width: w, height: h, depth: d }, dispose() {} };
    part.position.set(x, y, z); parent.add(part); return part;
  };
  const casing = { THREE: { Group, Vector3: class { constructor() { this.y = 0; } } }, box, windowTrim: material, walls: [], casingSideWidth: 3.5 / 12, casingReveal: 0.125 / 12 };
  vm.runInNewContext(slice(source, '  function openingCasing(', '  const baseTrimSections'), casing);
  const doors = { THREE: { Group }, box, windowTrim: material };
  vm.runInNewContext(slice(source, '  function singlePanelDoor(', '  function shakerFront('), doors);
  const frames = [];
  const windowFrame = (name, x, z, width, height, sill, rotation, parent, side, options) => {
    const frame = make(name); frame.position.set(x, sill, z); frame.rotation.y = rotation; parent.add(frame);
    frames.push({ name, frame, options });
    // Rear (rotation 0) windows: interior face of the 0.35 ft wall is 0.075 ft from the frame line.
    if (rotation === 0 && side === 1) casing.openingCasing(frame, 0, 0, width, height, 0.075, side, true, options);
  };
  const context = { UpstairsLayout: layout, HomeRoof: require('../assets/js/floor-plan-roof.js') };
  vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/floor-plan-upstairs.js'), 'utf8'), context);
  const helpers = { box, mat: (color) => (color === '#c9c6bc' ? tileMaterial : material), wood: material, wallMaterial: material, windowTrim: material, oak: material, cream: material, black: material, steel: material, linen: material, windowFrame, openingCasing: () => {}, singlePanelDoor: doors.singlePanelDoor };
  const THREE = { Group, Mesh: class extends Group { constructor(geometry) { super(); this.geometry = geometry; } }, BufferGeometry: class { setAttribute() {} setIndex() {} computeVertexNormals() {} dispose() {} }, Float32BufferAttribute: class {}, DoubleSide: 2, CylinderGeometry: class {} };
  const model = context.buildUpstairsModel(THREE, helpers, layout.stairOpening(), 10);
  const bath2 = frames.find((entry) => entry.name === 'Upstairs Bath 2 window');
  assert.ok(bath2?.options.wetEdge, 'Bath 2 window carries a wet (shower-side) edge');
  assert.equal(bath2.options.wetEdge.edge, 1);
  assert.equal(bath2.options.wetEdge.material, tileMaterial, 'Tiled returns use the shower tile');
  assert.equal(frames.filter((entry) => entry.options?.wetEdge).length, 1, 'No other window is altered');
  const shower = model.group.children.find((item) => item.name === 'Upstairs Bedroom 2 shower');
  const showerParts = sizedParts(shower);
  const showerWest = bounds(shower.children[0]).minX;
  const trim = sizedParts(bath2.frame);
  assert.ok(trim.length >= 8);
  const sideBoards = trim.filter((part) => part.name === 'White casing side board');
  assert.equal(sideBoards.length, 1, 'Shower-side painted leg omitted: the enclosure face lies inside the opening');
  assert.ok(trim.some((part) => part.name === 'Tiled shower window jamb return' && part.material === tileMaterial));
  assert.ok(trim.some((part) => part.name === 'Tiled shower window sill return' && part.material === tileMaterial));
  const bottom = trim.find((part) => part.name === 'White casing flat bottom board');
  assert.ok(Math.abs(bounds(bottom).maxX - showerWest) < 1e-9, 'Bottom board stops at the shower enclosure face');
  for (const part of trim.filter((piece) => /^White /.test(piece.name))) {
    const b = bounds(part);
    if (b.minY < 10 + 6) assert.ok(b.maxX <= showerWest + 1e-9, `${part.name} stays out of the shower below the tile top`);
  }
  for (const part of trim) for (const fixture of showerParts) {
    assert.ok(penetration(bounds(part), bounds(fixture)) <= JOINT, `${part.name} penetrates ${fixture.name || 'shower part'}`);
  }
  // Tile wall is notched: none covers the opening above its sill.
  const opening = { minX: 38.575 - 1, maxX: 38.575 + 1, sill: 10 + 3 };
  const tiles = showerParts.filter((part) => /^Shower tile/.test(part.name));
  assert.equal(tiles.length, 2);
  for (const tile of tiles) {
    const b = bounds(tile);
    if (Math.min(b.maxX, opening.maxX) - Math.max(b.minX, opening.minX) > 1e-9) assert.ok(b.maxY <= opening.sill + 1e-9, 'Tile below the sill only');
  }
  for (const name of ['Primary shower', 'West bath shower', 'East bath shower']) {
    const other = model.group.children.find((item) => item.name === `Upstairs ${name}`);
    assert.equal(sizedParts(other).filter((part) => part.name === 'Shower tile wall').length, 1, `${name} keeps its full tile wall`);
  }
});

test('basement U-stair: each well-side rail stays in its own half of the 3-in well, clear of the other flight stringer', () => {
  const layout = require('../assets/js/upstairs-layout.js');
  const stairOpening = layout.stairOpening();
  const stairWidth = 44 / 12, stairGap = 0.25, stairRise = 10 / 16, stairRisers = 8, stairGoing = 10 / 12;
  const beams = [], boxes = [];
  const context = helpers({
    stairWidth, stairGap, wallSideStairWidth: stairOpening.depth - stairWidth - stairGap, outerStairRailZ: stairOpening.depth - 0.08,
    stairRise, stairRisers, stairGoing, stairRun: (stairRisers - 1) * stairGoing, landingHeight: stairRisers * stairRise,
    basementStairs: new Node('Basement U-shaped staircase'), roomDimensions() {},
    stairBeam(name, start, end, width, depth, material, parent) { beams.push({ name, z: start[2], half: depth / 2, flight: parent.name, ends: [start, end] }); },
    box(parent, x, y, z, w, h, d) { boxes.push({ name: '', z, half: d / 2, flight: parent.name }); const part = new Node(); part.size = [w, h, d]; parent.add(part); return part; }
  });
  vm.runInNewContext(slice(source, '  for (const returning of [false, true]) {', '  box(basementStairs, (stairRun + landingEndX) / 2, -landingHeight - 0.1'), context);
  const posts = [];
  for (const flight of ['Basement returning flight', 'Basement descending entry flight']) {
    for (const entry of boxes) if (entry.flight === flight && entry.half < 0.05) posts.push(entry);
  }
  const zRange = (member) => [member.z - member.half, member.z + member.half];
  const overlapZ = (a, b) => Math.min(zRange(a)[1], zRange(b)[1]) - Math.max(zRange(a)[0], zRange(b)[0]);
  const well = [stairWidth, stairWidth + stairGap];
  const flights = { returning: 'Basement returning flight', entry: 'Basement descending entry flight' };
  const inWell = (member) => zRange(member)[1] > well[0] - 0.2 && zRange(member)[0] < well[1] + 0.2;
  for (const [own, other] of [[flights.returning, flights.entry], [flights.entry, flights.returning]]) {
    const rails = [...beams.filter((beam) => beam.flight === own && /handrail|guard rail/.test(beam.name)), ...posts.filter((post) => post.flight === own)].filter(inWell);
    const stringers = beams.filter((beam) => beam.flight === other && /stringer/.test(beam.name)).filter(inWell);
    assert.ok(rails.length >= 9 && stringers.length === 1, `${own}: inner rails and opposite inner stringer found`);
    for (const rail of rails) assert.ok(overlapZ(rail, stringers[0]) <= 1e-9, `${own} ${rail.name || 'post'} stays out of the ${other} stringer`);
    const otherRails = beams.filter((beam) => beam.flight === other && /handrail/.test(beam.name)).filter(inWell);
    for (const rail of rails) for (const opposite of otherRails) assert.ok(overlapZ(rail, opposite) <= 1e-9, 'Opposing well rails meet at most face to face');
  }
  // Layout unchanged: 44-in kitchen-side flight, 3-in well, eight risers per flight, wall-side entry rail still omitted.
  assert.equal(beams.filter((beam) => beam.name === 'Basement sloped handrail').length, 3);
  assert.equal(beams.filter((beam) => beam.name === 'Basement stair stringer').length, 4);
});

test('lower-roof gutters stop at the finished brick face with end caps and never run inside masonry', () => {
  const HomeRoof = require('../assets/js/floor-plan-roof.js');
  const upper = require('../assets/js/floor-plan-upstairs.js');
  class Vector {
    constructor(x = 0, y = 0, z = 0) { Object.assign(this, { x, y, z }); }
    clone() { return new Vector(this.x, this.y, this.z); }
    sub(other) { this.x -= other.x; this.y -= other.y; this.z -= other.z; return this; }
    length() { return Math.hypot(this.x, this.y, this.z); }
    normalize() { const length = this.length(); this.x /= length; this.y /= length; this.z /= length; return this; }
  }
  class Group {
    constructor() { this.children = []; this.userData = {}; this.position = new Vector(); this.quaternion = { setFromUnitVectors: (from, to) => { this.axis = to.clone(); } }; }
    add(child) { child.parent = this; this.children.push(child); }
  }
  // Actual masonry footprints from the exterior wall calls (rear ground walls and every upper wall).
  const footprints = [];
  const floorToFloor = 10, eaves = floorToFloor + 9;
  const wallContext = {
    footprints, livingFeatureWall: ground.getLivingRoomFeatureLayout(), getPrepWindowBankLayout: ground.getPrepWindowBankLayout, getKitchenWindowBankLayout: ground.getKitchenWindowBankLayout,
    win: (center, width = 4, sill = 3, height = 5) => ({ center, width, sill, height }),
    wall: (name, x1, z1, x2, z2, bottom, top) => footprints.push({ name, x1, z1, x2, z2, bottom, top, thickness: 0.45 })
  };
  const lines = exteriorSource.split(/\r?\n/);
  for (const name of ['dining west', 'dining rear', 'dining patio', 'kitchen and prep rear']) vm.runInNewContext(lines.find((line) => line.includes(`wall('${name}'`)), wallContext);
  for (const [name, x1, z1, x2, z2] of upper.getUpstairsExteriorSegments()) wallContext.wall(`upper ${name}`, x1, z1, x2, z2, 9, eaves);
  assert.equal(exteriorSource.match(/thickness: wallThickness/g)?.length, 2, 'Wall footprints and the canopy closure footprint');
  assert.match(exteriorSource, /const wallThickness = 0\.45;/);
  function render(masonryFootprints, definitions) {
    const context = {
      THREE: { Group, Vector3: Vector, Vector2: class { constructor(x, y) { Object.assign(this, { x, y }); } },
        ShapeUtils: { triangulateShape: () => [[0, 1, 2]] }, DoubleSide: 2,
        BufferGeometry: class { constructor() { this.attributes = {}; } setAttribute(name, value) { this.attributes[name] = value; } computeVertexNormals() {} },
        Float32BufferAttribute: class { constructor(array) { this.array = array; } },
        Mesh: class extends Group { constructor(geometry) { super(); this.geometry = geometry; } } },
      HomeRoof, finishes:{brick:{face:[232,214,184]}},facadePrototype: false, group: new Group(), white: { clone: () => ({}) }, trim: {}, gutterFinish: { clone: () => ({}) }, mat: () => ({}), masonryFootprints,
      box(parent, x, y, z, width, height, depth) { const mesh = new Group(); mesh.geometry = { width, height, depth }; Object.assign(mesh.position, { x, y, z }); parent.add(mesh); return mesh; }
    };
    vm.createContext(context);
    vm.runInContext(slice(exteriorSource, 'function clipGutterToMasonry(', 'function buildExteriorModel('), context);
    vm.runInContext(slice(exteriorSource, '  function prototypeGutter(', '  const slateFinish ='), context);
    return context.renderRoofEnvelope('Test roofs', definitions, {}, false, {});
  }
  const lower = HomeRoof.getLowerRoofDefinitions();
  // The living-patio canopy's east brick closure rises from y9 on the dining roof's west eave line.
  const frameContext = {getUpstairsMeasuredGeometry:require('../assets/js/floor-plan-upstairs.js').getUpstairsMeasuredGeometry};
  vm.runInNewContext(slice(exteriorSource, 'function getLivingPatioCanopyFrame(', 'function buildExteriorModel(') + '\nthis.frame = getLivingPatioCanopyFrame(0.45, ' + ground.getLivingRoomFeatureLayout().returnWallZ + ');', frameContext);
  const canopy = frameContext.frame;
  assert.ok(Math.abs(canopy.closureStart - 1.772) < 0.001 && Math.abs(canopy.front - 7.175) < 1e-9 && canopy.right === 13.2, `Closure z${canopy.closureStart}..${canopy.front}`);
  const closurePush = exteriorSource.indexOf('masonryFootprints.push(livingPatioCanopy.closureFootprint);');
  assert.ok(closurePush > 0 && closurePush < exteriorSource.indexOf("renderRoofEnvelope('Closed ground-floor setback roofs'"), 'Closure registered before the setback gutters are cut');
  assert.match(exteriorSource, /\[patioSideClosureStart, livingPatioCanopy\.closureStart\]/, 'Canopy builder checks its closure against the shared frame');
  footprints.push(canopy.closureFootprint);
  const model = render(footprints, lower);
  const gutterParts = model.children.filter((part) => part.userData.gutterId);
  // Plan/height box of a horizontal gutter part along its axis.
  const extent = (part) => {
    if (part.geometry.attributes?.position)
    {
      const positions = part.geometry.attributes.position.array;
      const axis = index => positions.filter((_, i) => i % 3 === index);
      return { minX: Math.min(...axis(0)), maxX: Math.max(...axis(0)), minY: Math.min(...axis(1)), maxY: Math.max(...axis(1)),
        minZ: Math.min(...axis(2)), maxZ: Math.max(...axis(2)) };
    }
    const { x, y, z } = part.position, half = part.geometry.width / 2, across = part.geometry.depth / 2;
    const alongX = Math.abs(part.axis.x) > 0.5;
    return { minX: x - (alongX ? half : across), maxX: x + (alongX ? half : across), minY: y - part.geometry.height / 2, maxY: y + part.geometry.height / 2,
      minZ: z - (alongX ? across : half), maxZ: z + (alongX ? across : half) };
  };
  for (const part of gutterParts) {
    assert.ok(part.userData.stations.some(station => station.dropFeet > 0), 'Actual trough mesh has modeled fall');
    const g = extent(part);
    for (const wall of footprints) {
      const brick = { minX: Math.min(wall.x1, wall.x2) - (wall.x1 === wall.x2 ? 0.225 : 0), maxX: Math.max(wall.x1, wall.x2) + (wall.x1 === wall.x2 ? 0.225 : 0),
        minZ: Math.min(wall.z1, wall.z2) - (wall.z1 === wall.z2 ? 0.225 : 0), maxZ: Math.max(wall.z1, wall.z2) + (wall.z1 === wall.z2 ? 0.225 : 0), minY: wall.bottom, maxY: wall.top };
      assert.ok(penetration(g, brick) <= JOINT, `${part.name} at x${part.position.x.toFixed(2)} z${part.position.z.toFixed(2)} enters ${wall.name} by ${(penetration(g, brick) * 12).toFixed(2)} in`);
    }
  }
  assert.equal(gutterParts.length, 3, 'Dining L-shaped collection and independent low east eave');
  assert.ok(gutterParts.every(part => part.userData.endCaps.length === 2));
  assert.ok(!gutterParts.some(part => part.userData.gutterId === 'dining-west'), 'No isolated stub beside the unresolved canopy closure');
  assert.ok(!gutterParts.some((part) => extent(part).minX < 13.2 + 0.225 && extent(part).maxZ > canopy.closureStart), 'No dining west-eave gutter in the patio canopy closure, roof, soffit or fascia');
  const eastGutter = gutterParts.find(part => part.userData.gutterId === 'dining-east');
  assert.ok(Math.abs(extent(eastGutter).maxZ - 6.775) < 1e-9, 'East trough stops at the kitchen rear brick face');
  assert.ok(!gutterParts.some(part => extent(part).maxX < 43 && extent(part).maxZ > 7.175 + JOINT && extent(part).minZ < 7.625), 'No gutter run along the upper bath rear wall');
  // Main-house eaves gutters are untouched by the masonry clip.
  const main = HomeRoof.getConnectedRoofDefinitions(floorToFloor).filter(({ id }) => !id.startsWith('Garage') && id !== 'Dining rear projection');
  const count = (m) => m.children.filter((part) => part.userData.gutterId).length;
  assert.equal(count(render(footprints, main)), count(render([], main)));
  assert.equal(count(model), count(render([], lower)), 'Shared drainage layout already excludes the wall abutment');
  // Rear dining path wall light (backplate 0.3 x 0.3 ft, housing projecting 0.4 ft from the face) sits on the
  // east pier: at least 1 in below the rear eave gutter/fascia it used to enter, clear of the window head trim.
  const lightCall = lines.find((line) => line.includes("wallDownlight('Rear dining path wall downlight'"));
  const [lightX, lightY] = lightCall.match(/downlight', ([\d.]+), ([\d.]+),/).slice(1).map(Number);
  const rearFace = ground.getLivingRoomFeatureLayout().diningRearZ - 0.225;
  const light = { minX: lightX - 0.15, maxX: lightX + 0.15, minY: lightY - 0.15, maxY: lightY + 0.15, minZ: rearFace - 0.4, maxZ: rearFace };
  const eaveParts = model.children.filter(part => part.userData.gutterId || (part.name === 'Connected roof eaves fascia' && Math.abs(part.axis.y) < 1e-6));
  const rearEave = eaveParts.filter((part) => { const e = extent(part); return e.maxX > light.minX && e.minX < light.maxX && e.maxZ > light.minZ && e.minZ < light.maxZ; });
  assert.equal(rearEave.length, 1, 'Only the fascia overlaps the light in plan; the ogee trough is outboard');
  assert.ok(extent(gutterParts.find(part => part.userData.gutterId === 'dining-rear')).minY - light.maxY >= 1 / 12,
    'Outboard gutter also preserves the required modeled one-inch vertical gap');
  for (const part of rearEave) assert.ok(extent(part).minY - light.maxY >= 1 / 12 - 1e-9, `${part.name} clears the light by ${((extent(part).minY - light.maxY) * 12).toFixed(2)} in`);
  const diningRear = lines.find((line) => line.includes("wall('dining rear'"));
  const [wallEastX, windowOffset, windowWidth] = diningRear.match(/wall\('dining rear', ([\d.]+),.*win\(([\d.]+), ([\d.]+)\)/).slice(1).map(Number);
  const headTrimEast = wallEastX - windowOffset + windowWidth / 2 + 0.325;
  assert.ok(light.minX >= headTrimEast + 1 / 12 && light.maxX <= wallEastX + 0.225 - 1 / 12, 'On the east pier, clear of the window trim and corner');
  assert.ok(lightY + 0.15 <= 8 + 1e-9 && lightY - 0.15 >= 7, 'Wall-light top at or below the 8-ft head datum');
});

// Exterior masonry-stop helpers (convex masonry solids, penetration test) and the
// shared canopy frame, evaluated from the production source.
function masonryStopContext() {
  const context = {getUpstairsMeasuredGeometry:require('../assets/js/floor-plan-upstairs.js').getUpstairsMeasuredGeometry};
  vm.runInNewContext(slice(exteriorSource, 'function getLivingPatioCanopyFrame(', 'function buildExteriorModel(')
    + '\nthis.frame = getLivingPatioCanopyFrame; this.prism = prismMasonrySolid; this.penetrates = penetratesMasonry; this.boxSolid = boxMasonrySolid;'
    + ' this.fit = fitMasonrySolidToMember; this.pieces = connectedTrianglePieces; this.inPlan = pointInPlanPolygon;', context);
  return context;
}
const boxTriangles = (c) => [[0, 1, 3], [0, 3, 2], [4, 6, 7], [4, 7, 5], [0, 4, 5], [0, 5, 1], [2, 3, 7], [2, 7, 6], [0, 2, 6], [0, 6, 4], [1, 5, 7], [1, 7, 3]]
  .map((face) => face.map((i) => [...c[i], 0, 0]));
const triangleArea = ([a, b, c]) => Math.hypot(
  (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
  (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) / 2;

test('masonry stop removes exactly the triangle area inside a convex masonry solid and keeps faces that only touch it', () => {
  const HomeRoof = require('../assets/js/floor-plan-roof.js');
  const { prism, penetrates, boxSolid } = masonryStopContext();
  // A 4 x 4 ft horizontal sheet at y=1 crossing a 1 ft-thick wall (x 1..2, y 0..3).
  const sheet = [[[0, 1, 0, 0, 0], [4, 1, 0, 1, 0], [4, 1, 4, 1, 1]], [[0, 1, 0, 0, 0], [4, 1, 4, 1, 1], [0, 1, 4, 0, 1]]];
  const wall = prism('wall', [[1, 0], [2, 0], [2, 4], [1, 4]], 0, [0, 0, 3]);
  assert.ok(penetrates(sheet, wall.planes));
  const kept = HomeRoof.trianglesOutsideConvex(sheet, wall.planes);
  assert.ok(Math.abs(kept.reduce((sum, t) => sum + triangleArea(t), 0) - 12) < 1e-9, 'Only the 4 sq ft inside the wall is removed');
  for (const t of kept) for (const p of t) {
    assert.ok(p[0] <= 1 + 1e-9 || p[0] >= 2 - 1e-9, 'Cut exactly at the wall faces');
    assert.ok(Math.abs(p[3] - p[0] / 4) < 1e-9 && Math.abs(p[4] - p[2] / 4) < 1e-9, 'UVs are interpolated');
  }
  assert.ok(!penetrates(kept, wall.planes));
  // Sloping top plane: a sheet above the sloping top is untouched; contact on a face is not a penetration.
  const ramp = prism('ramp', [[1, 0], [2, 0], [2, 4], [1, 4]], 0, [0, 0.25, 0.5]);
  assert.ok(!penetrates([[[0, 2, 1, 0, 0], [4, 2, 1, 0, 0], [4, 2, 0, 0, 0]]], ramp.planes), 'Above the sloping top at z<=1');
  assert.ok(!penetrates([[[1, 0, 0, 0, 0], [1, 3, 0, 0, 0], [1, 3, 4, 0, 0]]], wall.planes), 'Coplanar contact on the wall face');
  // Rotated box solid built from a mesh world matrix (90 degrees about y, 2 x 1 x 0.5 at (5, 1, 5)).
  const solid = boxSolid({ name: 'box', geometry: { parameters: { width: 2, height: 1, depth: 0.5 } }, matrixWorld: { elements: [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 5, 1, 5, 1] } });
  const inside = (p) => solid.planes.every((plane) => plane[0] * p[0] + plane[1] * p[1] + plane[2] * p[2] + plane[3] >= -1e-12);
  assert.ok(inside([5.2, 1.4, 5.9]) && !inside([5.3, 1, 5]) && !inside([5, 1, 6.1]));
  // A 3-in board buried in the wall except 0.06 in past its far face: the far plane is
  // extended over that razor sliver, while the near face (with real board beyond) stays exact.
  const { fit, pieces, inPlan } = masonryStopContext();
  const corners = [];
  for (const x of [0.5, 2.005]) for (const y of [1, 1.25]) for (const z of [1, 3]) corners.push([x, y, z]);
  const board = boxTriangles(corners);
  const fitted = fit(board, wall.planes);
  const keptBoard = HomeRoof.trianglesOutsideConvex(board, fitted);
  assert.ok(keptBoard.every((t) => t.every((p) => p[0] <= 1 + 1e-9)), 'No sliver left beyond the far face');
  assert.ok(keptBoard.some((t) => t.some((p) => Math.abs(p[0] - 0.5) < 1e-9)), 'The real outside part remains');
  assert.equal(fitted.filter((plane, i) => plane !== wall.planes[i]).length, 1);
  // Connected pieces and the plan test used to drop hidden fragments.
  const longCorners = [];
  for (const x of [0, 4]) for (const y of [1, 1.25]) for (const z of [1, 3]) longCorners.push([x, y, z]);
  const twoEnds = HomeRoof.trianglesOutsideConvex(boxTriangles(longCorners), wall.planes);
  assert.equal(pieces(twoEnds).length, 2, 'A board cut through by a wall leaves two separate end pieces');
  const square = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.ok(inPlan(square, [5, 5]) && inPlan(square, [10, 5]) && !inPlan(square, [10.1, 5]));
});

test('low-roof fascia, rakes, soffits and skins stop at the finished brick/stone face (no masonry penetration)', () => {
  const HomeRoof = require('../assets/js/floor-plan-roof.js');
  const upper = require('../assets/js/floor-plan-upstairs.js');
  const { frame, prism, penetrates, fit } = masonryStopContext();
  const layout = ground.getLivingRoomFeatureLayout();
  const footprints = [];
  const wallContext = {
    footprints, livingFeatureWall: layout, getPrepWindowBankLayout: ground.getPrepWindowBankLayout, getKitchenWindowBankLayout: ground.getKitchenWindowBankLayout,
    win: (center, width = 4, sill = 3, height = 5) => ({ center, width, sill, height }),
    wall: (name, x1, z1, x2, z2, bottom, top) => footprints.push({ name, x1, z1, x2, z2, bottom, top })
  };
  const lines = exteriorSource.split(/\r?\n/);
  for (const name of ['dining west', 'dining rear', 'dining patio', 'kitchen and prep rear']) vm.runInNewContext(lines.find((line) => line.includes(`wall('${name}'`)), wallContext);
  for (const [name, x1, z1, x2, z2] of upper.getUpstairsExteriorSegments()) wallContext.wall(`upper ${name}`, x1, z1, x2, z2, 9, 19);
  const solids = footprints.map(({ name, x1, z1, x2, z2, bottom, top }) => {
    const ax = x1 === x2 ? 0.225 : 0, az = z1 === z2 ? 0.225 : 0;
    return prism(name, [[Math.min(x1, x2) - ax, Math.min(z1, z2) - az], [Math.max(x1, x2) + ax, Math.min(z1, z2) - az], [Math.max(x1, x2) + ax, Math.max(z1, z2) + az], [Math.min(x1, x2) - ax, Math.max(z1, z2) + az]], bottom, [0, 0, top]);
  });
  const canopy = frame(0.45, layout.returnWallZ);
  solids.push(canopy.closureSolid);
  // The closure solid's sloping top is the canopy underside + 0.02 ft over x13.2 +/- 0.225 from closureStart.
  const top = canopy.closureSolid.planes.at(-1);
  for (const z of [canopy.closureStart, 5, canopy.front]) assert.ok(top[0] === 0 && top[1] === -1 && Math.abs(top[2] * z + top[3] - (canopy.undersideAt(z) + 0.02)) < 1e-9);
  const stop = (triangles, member = false) => solids.reduce((kept, solid) => penetrates(kept, solid.planes)
    ? HomeRoof.trianglesOutsideConvex(kept, member ? fit(kept, solid.planes) : solid.planes) : kept, triangles);
  const plan = HomeRoof.buildRoofEnvelope(HomeRoof.getLowerRoofDefinitions());
  const fascia = [];
  for (const edge of plan.boundaries.filter((e) => e.roof === 'Dining rear projection')) {
    const dx = edge.end[0] - edge.start[0], dz = edge.end[2] - edge.start[2], length = Math.hypot(dx, dz);
    const nx = -dz / length * 0.13, nz = dx / length * 0.13;
    const corners = [];
    for (const p of [edge.start, edge.end]) for (const y of [-0.525, -0.075]) for (const s of [-1, 1]) corners.push([p[0] + s * nx, p[1] + y, p[2] + s * nz]);
    // corner order: (start|end) x (bottom|top) x (side -|+)
    fascia.push({ edge, triangles: boxTriangles([corners[0], corners[1], corners[2], corners[3], corners[4], corners[5], corners[6], corners[7]]) });
  }
  const buried = fascia.filter(({ triangles }) => solids.some((solid) => penetrates(triangles, solid.planes)));
  assert.ok(buried.length >= 4, `Dining west eave, north rake and east-eave end start inside masonry (${buried.length})`);
  for (const piece of fascia) {
    const kept = stop(piece.triangles, true);
    for (const solid of solids) assert.ok(!penetrates(kept, solid.planes), `Fascia at ${piece.edge.start.map((v) => v.toFixed(2))} still enters ${solid.name}`);
    const westEave = piece.edge.start[0] === 13.2 && piece.edge.end[0] === 13.2 && Math.min(piece.edge.start[2], piece.edge.end[2]) >= 1.9 - 1e-9;
    const northRake = piece.edge.start[2] === 7.5 && piece.edge.end[2] === 7.5;
    if (northRake) for (const t of kept) for (const p of t) assert.ok(p[1] <= 9 + 1e-6 || p[2] >= 7.625 - 1e-6, 'No north-edge fascia left within or in front of the upper rear wall');
    if (westEave) for (const t of kept) for (const p of t) assert.ok(p[2] <= 1.9 + 1e-9 || p[1] >= canopy.undersideAt(p[2]) + 0.02 - 1e-6, `West-eave fascia survives only above the closure top (or as its end face on the wall start) ${p.map((v) => v.toFixed(4))}`);
    if (piece.edge.start[2] === 1.25 && piece.edge.end[2] === 1.25) assert.equal(kept.length, piece.triangles.length, 'The free rear eave fascia is untouched');
  }
  // Roof skins, closed undersides (-0.16) and edge soffits (-0.2): nothing remains inside masonry.
  for (const face of plan.faces.filter((f) => f.roof === 'Dining rear projection')) {
    for (const offset of [0, -0.16, -0.2]) {
      const triangles = face.polygon.slice(1, -1).map((p, i) => [face.polygon[0], p, face.polygon[i + 2]]
        .map(([x, z]) => [x, HomeRoof.heightAt(face.plane, [x, z]) + offset, z, 0, 0]));
      const kept = stop(triangles);
      for (const solid of solids) assert.ok(!penetrates(kept, solid.planes), `Roof surface ${face.id}${offset} enters ${solid.name}`);
      for (const t of kept) for (const p of t) assert.ok(p[2] <= 7.175 + 1e-6 || p[1] <= 9 + 1e-6, `Dining roof ends at the upper rear wall face ${p.map((v) => v.toFixed(4))}`);
    }
  }
  // Production wiring: every low roof, the canopy and the porch pass through the stop, and fitted
  // closures register exact solids.
  assert.match(exteriorSource, /for \(const root of \[setbackRoofs, porchRoof\]\)/);
  assert.match(exteriorSource, /\^\(Charcoal shingle covered patio roof\|Post-free canopy\|Cantilever canopy\|Canopy \)/);
  assert.match(exteriorSource, /masonrySolids\.push\(prismMasonrySolid\('Garage front gable fitted brick wall-head closure', polygon, garageFacadeEaves/);
  assert.match(exteriorSource, /masonrySolids\.push\(prismMasonrySolid\('Lower setback fitted wall-head closure'/);
  assert.match(exteriorSource, /masonryStopSolids = \[\.\.\.masonrySolids, livingPatioCanopy\.closureSolid, \.\.\.porchFlashingStops\]/);
  // Porch counterflashing stops clip standing-seam ribs only, never the skin or ceiling.
  assert.match(exteriorSource, /if \(solid\.ribsOnly && part\.name !== 'Clipped standing-seam roof rib'\) continue;/);
  assert.match(exteriorSource, /Register the headwall as a masonry-stop solid before its notch clip/);
  assert.match(exteriorSource, /HomeRoof\.trianglesOutsideConvex\(triangles, solidMember \? fitMasonrySolidToMember\(triangles, solid\.planes\) : solid\.planes\)/);
  // The dining-side canopy flashing sits on the closure's east face and bears on the dining roof skin.
  assert.match(exteriorSource, /diningFlashLeft = patioRoofRight \+ wallThickness \/ 2/);
  assert.match(exteriorSource, /p\.getY\(i\) > 0 \? Math\.max\(diningRoofAt\(x\), Math\.min\(diningRoofAt\(x\) \+ 0\.35, patioRoofUndersideAt\(z\) \+ 0\.02\)\) : diningRoofAt\(x\)/);
});

test('dining patio steps wall light backplate bears flush on the dining west brick face below the canopy soffit', () => {
  const { frame } = masonryStopContext();
  const layout = ground.getLivingRoomFeatureLayout();
  const lines = exteriorSource.split(/\r?\n/);
  const call = lines.find((line) => line.includes("wallDownlight('Dining patio steps wall downlight'"));
  const [x, y, z] = call.match(/downlight', ([\d.]+), ([\d.]+), ([\d.]+), -Math\.PI \/ 2,/).slice(1).map(Number);
  assert.match(exteriorSource, /box\(fixture, 0, 0, -0\.2, 0\.3, 0\.3, 0\.1, lanternBronze\)\.name = 'Exterior downlight wall backplate'/);
  // rotation -90 deg: local -z (backplate at -0.2, 0.1 deep) points to +x.
  const back = { minX: x + 0.15, maxX: x + 0.25, minY: y - 0.15, maxY: y + 0.15, minZ: z - 0.15, maxZ: z + 0.15 };
  const wallFace = 13.2 - 0.225;
  assert.ok(Math.abs(back.maxX - wallFace) < 1e-9, `Backplate gap to brick ${((wallFace - back.maxX) * 12).toFixed(2)} in`);
  assert.ok(back.minZ >= layout.diningRearZ - 1e-9, 'Brick exists behind the whole backplate (dining west wall starts at the rear wall centre)');
  assert.ok(back.maxZ <= layout.patioDoor.z - 1.5 - 1 / 12, 'Clear of the patio door opening');
  const canopy = frame(0.45, layout.returnWallZ);
  const soffitBottom = Math.min(canopy.undersideAt(back.minZ), canopy.undersideAt(back.maxZ)) - 0.75;
  assert.ok(back.maxY <= soffitBottom - 1 / 12, `Below the canopy soffit (${((soffitBottom - back.maxY) * 12).toFixed(2)} in clear)`);
  assert.ok(back.minY >= 0, 'On full-height brick (no stone or coping band)');
});

test('upper bay-head caps, brick sills/heads/jambs, window trim and cornice courses bear on (not in) the brick face and stop at adjoining faces', () => {
  const upper = require('../assets/js/floor-plan-upstairs.js');
  const pieces = [];
  const context = {
    trim: {}, wallThickness: 0.45, getUpstairsExteriorSegments: upper.getUpstairsExteriorSegments,
    box(parent, x, y, z, w, h, d) { const m = { wall: parent.name, x, y, z, w, h, d, rotation: { x: 0 } }; pieces.push(m); return m; }
  };
  context.brickBox = context.box;
  context.brickSoldierBox = context.box;
  vm.createContext(context);
  vm.runInContext(slice(exteriorSource, '  const upperCourseOnlyWalls', '  const win ='), context);
  const segments = upper.getUpstairsExteriorSegments();
  const frames = {};
  for (const [name, x1, z1, x2, z2] of segments) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    frames[`Exterior brick wall: upper ${name}`] = { x1, z1, vx: (x2 - x1) / length, vz: (z2 - z1) / length, length };
    // Same opening sources as the production upper-wall loop (floor-to-floor 10, eaves 19).
    const openings = name === 'front bedrooms' || name === 'front bedroom 4'
      ? upper.getUpstairsFrontWindows().filter((w) => w.center - w.width / 2 >= x1 && w.center + w.width / 2 <= x2)
        .map((w) => ({ center: w.center - x1, width: w.width, sill: 10 + w.sill, height: w.height }))
      : upper.getUpstairsExteriorOpenings(x1, z1, x2, z2, 10);
    context.args = [{ name: `Exterior brick wall: upper ${name}`, userData: {} }, length, 19, openings, context.localUpperNeighbours(name)];
    vm.runInContext('articulateUpperMasonry(...args)', context);
  }
  const face = 0.225, crownBottom = 19 - 0.16;
  const caps = pieces.filter((p) => /weathering cap/.test(p.name));
  const flat = pieces.filter((p) => !caps.includes(p));
  assert.equal(caps.length, 2, 'One bay-head cap on each paired front wall');
  // Exact rotated-box corners (Three.js X rotation): y' = y cos - z sin, z' = y sin + z cos.
  const capCorners = (p) => {
    const c = Math.cos(p.rotation.x), s = Math.sin(p.rotation.x), out = [];
    for (const dy of [-1, 1]) for (const dz of [-1, 1]) {
      const y = dy * p.h / 2, z = dz * p.d / 2;
      out.push({ back: dz < 0, top: dy > 0, y: p.y + y * c - z * s, z: p.z + y * s + z * c });
    }
    return out;
  };
  for (const cap of caps) {
    const corners = capCorners(cap);
    const backTop = corners.find((k) => k.back && k.top), backBottom = corners.find((k) => k.back && !k.top);
    const frontTop = corners.find((k) => !k.back && k.top), frontBottom = corners.find((k) => !k.back && !k.top);
    assert.ok(Math.min(...corners.map((k) => k.z)) >= face - 1e-9, `Cap bears on the brick face (back at ${((Math.min(...corners.map((k) => k.z)) - face) * 12).toFixed(3)} in)`);
    assert.ok(Math.abs(backBottom.z - face) < 1e-9, 'Cap back-bottom edge sits on the brick face');
    assert.ok(Math.max(...corners.map((k) => k.y)) <= crownBottom + 1e-9, 'Cap stops at the cornice crown soffit');
    assert.ok(Math.abs(backTop.y - crownBottom) < 1e-9, 'Cap back-top edge meets the crown (contact, no gap)');
    assert.ok(frontTop.y < backTop.y - 0.04 && Math.abs((backTop.y - frontTop.y) / (frontTop.z - backTop.z) - 1 / 12) < 1e-9, 'Cap washes outward at 1:12');
    const head = flat.find((p) => p.wall === cap.wall && /bridging masonry head/.test(p.name));
    const headFront = head.z + head.d / 2, headTop = head.y + head.h / 2;
    const undersideAtHeadFront = backBottom.y + (frontBottom.y - backBottom.y) * (headFront - backBottom.z) / (frontBottom.z - backBottom.z);
    assert.ok(Math.abs(undersideAtHeadFront - headTop) < 1e-9, 'Sloping cap underside bears on the head front arris (no penetration)');
    assert.ok(frontBottom.z - headFront >= 0.25, `Drip projects ${((frontBottom.z - headFront) * 12).toFixed(2)} in past the bridging head`);
    assert.ok(Math.abs(frontTop.z - 0.788) < 0.01, 'Drip line stays at the former 0.78 ft cap projection');
    for (const pier of flat.filter((p) => p.wall === cap.wall && /pier/.test(p.name))) {
      assert.ok(pier.x + pier.w / 2 <= cap.x - cap.w / 2 + 1e-9 || pier.x - pier.w / 2 >= cap.x + cap.w / 2 - 1e-9, 'Cap ends clear of the piers');
    }
  }
  // Every flat applied piece starts at its own wall's brick face.
  for (const p of flat) assert.ok(Math.abs(p.z - p.d / 2 - face) < 1e-9, `${p.name} on ${p.wall} starts ${((p.z - p.d / 2 - face) * 12).toFixed(2)} in from the face`);
  // World-space boxes (all upper walls are axis-aligned).
  const world = (p) => {
    const f = frames[p.wall], pts = [];
    for (const a of [p.x - p.w / 2, p.x + p.w / 2]) for (const o of [p.z - p.d / 2, p.z + p.d / 2]) pts.push([f.x1 + a * f.vx - o * f.vz, f.z1 + a * f.vz + o * f.vx]);
    return { wall: p.wall, name: p.name, minX: Math.min(...pts.map((q) => q[0])), maxX: Math.max(...pts.map((q) => q[0])), minY: p.y - p.h / 2, maxY: p.y + p.h / 2,
      minZ: Math.min(...pts.map((q) => q[1])), maxZ: Math.max(...pts.map((q) => q[1])) };
  };
  const depth = (a, b) => Math.min(a.maxX - b.minX, b.maxX - a.minX, a.maxY - b.minY, b.maxY - a.minY, a.maxZ - b.minZ, b.maxZ - a.minZ);
  const boxes = flat.map(world);
  const bricks = segments.map(([name, x1, z1, x2, z2]) => ({ wall: `Exterior brick wall: upper ${name}`, name: 'brick',
    minX: Math.min(x1, x2) - (x1 === x2 ? face : 0), maxX: Math.max(x1, x2) + (x1 === x2 ? face : 0), minY: 9, maxY: 19,
    minZ: Math.min(z1, z2) - (z1 === z2 ? face : 0), maxZ: Math.max(z1, z2) + (z1 === z2 ? face : 0) }));
  for (const piece of boxes) for (const brick of bricks) {
    assert.ok(depth(piece, brick) <= 1e-9, `${piece.name} (${piece.wall}) enters ${brick.wall} brick by ${(depth(piece, brick) * 12).toFixed(2)} in`);
  }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    assert.ok(depth(boxes[i], boxes[j]) <= 1e-9, `${boxes[i].name} (${boxes[i].wall}) overlaps ${boxes[j].name} (${boxes[j].wall}) by ${(depth(boxes[i], boxes[j]) * 12).toFixed(2)} in`);
  }
  // Rear/side brick soldier heads rise only to the frieze; the bed molding stops at each head end.
  const lintels = pieces.filter((p) => /brick soldier head/.test(p.name));
  assert.ok(lintels.length >= 8 && lintels.every((l) => Math.abs(l.y + l.h / 2 - (19 - 0.56)) < 1e-9));
  // Recessed closet-4 cornice: front courses run into the inside corners, the returns butt them.
  const closetFrontCrown = boxes.find((b) => b.wall.endsWith('closet 4 front') && b.name === 'Cornice projecting crown');
  assert.ok(Math.abs(closetFrontCrown.minX - (12.35 + face)) < 1e-9 && Math.abs(closetFrontCrown.maxX - (18.85 - face)) < 1e-9);
  for (const ret of boxes.filter((b) => /closet 4 (west|east) return/.test(b.wall) && b.name === 'Cornice projecting crown')) assert.ok(Math.abs(ret.minZ - closetFrontCrown.maxZ) < 1e-9);
  // Production wiring: upper walls build their own trim; the ground front head trim stops under the brick soldier head.
  assert.match(exteriorSource, /opening\.picture, !name\.startsWith\('upper '\), front, false,\r?\n\s+name === 'front ground floor' \? groundFrontLintel\.y - groundFrontLintel\.height \/ 2 : Infinity\)/);
  assert.match(exteriorSource, /brickSoldierBox\(group, x, groundFrontLintel\.y, frontWallZ \+ 0\.34, width \+ 0\.65, groundFrontLintel\.height,/);
  assert.match(exteriorSource, /articulateUpperMasonry\(wallGroup, length, top, openings, localUpperNeighbours\(name\.slice\('upper '\.length\)\)\)/);
  // Ground front: warm cream head trim (frame head + 0.05 ft) stops beneath the brick soldier head.
  const lintelBottom = 8.32 - 0.35 / 2;
  for (const w of ground.getGroundFrontWindows()) {
    const head = (w.frameSill ?? w.sill) + (w.frameHeight ?? w.height);
    assert.ok(head + 0.05 < lintelBottom && head + 0.35 > lintelBottom, 'The trim was capped by (and is now cut at) the lintel');
  }
});
