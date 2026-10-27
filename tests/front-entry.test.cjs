'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { getFrontEntryLayout, buildArchedFrontEntry } = require('../floor-plan-ground.js');

class Group {
  constructor() {
    this.children = [];
    this.userData = {};
    this.position = { x: 0, y: 0, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
  }
  add(child) { child.parent = this; this.children.push(child); }
  traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
}
class Shape {
  constructor() { this.points = []; }
  moveTo(x, y) { this.points.push([x, y]); }
  lineTo(x, y) { this.points.push([x, y]); }
  closePath() {}
}
function build() {
  const THREE = {
    Group, Shape,
    ExtrudeGeometry: class { constructor(shape, options) { Object.assign(this, { shape, options }); } },
    Mesh: class extends Group { constructor(geometry, material) { super(); Object.assign(this, { geometry, material }); } }
  };
  const parent = new Group();
  const leaves = buildArchedFrontEntry(THREE, {
    wood: {}, trim: {}, hardware: {}, field: {},
    box(target, x, y, z, width, height, depth, material) {
      const part = new Group();
      Object.assign(part.position, { x, y, z });
      Object.assign(part, { width, height, depth, material });
      target.add(part);
      return part;
    }
  }, parent);
  return { parent, leaves };
}

test('actual curved leaf contours follow the shared arch, not a rectangle under decorative trim', () => {
  const { parent, leaves } = build();
  const layout = getFrontEntryLayout();
  assert.equal(leaves.length, 2);
  assert.equal(layout.height, 8);
  assert.equal(parent.userData.heightInches, 96);
  for (const leaf of leaves) {
    const body = leaf.children.find((part) => part.name === 'Curved oak entry leaf body');
    const points = body.geometry.shape.points.map(([x, y]) => [x + leaf.position.x, y]);
    assert.ok(points.every(([x, y]) => x >= -2.45 && x <= 2.45 && y >= 0.04 && y <= 8));
    const crown = Math.max(...points.map(([, y]) => y));
    const outerEdge = points.filter(([x]) => Math.abs(x) > 2.44);
    assert.ok(crown > 7.98);
    assert.ok(Math.max(...outerEdge.map(([, y]) => y)) < 7.2, 'Outer corners genuinely curve down from the crown');
    assert.equal(leaf.userData.interactiveHouseDoor.openAngleDegrees, 0);
    assert.equal(leaf.userData.interactiveHouseDoor.maxAngleDegrees, 110);
    assert.equal(body.userData.tourObstacle, true);
  }
  assert.equal(parent.children.filter((part) => part.name === 'Arch-shaped wall closure above door').length, 2);
});

test('deep white frame, molded panels and paired dark pulls form one entry in both model surfaces', () => {
  const { parent, leaves } = build();
  const surround = parent.children.find((part) => part.name === 'Deep white arched entry surround');
  assert.equal(surround.geometry.options.depth, 0.28);
  assert.equal(surround.position.z, 0.19);
  assert.ok(parent.children.some((part) => part.name === 'Projecting outer arch molding'));
  for (const leaf of leaves) {
    assert.equal(leaf.children.filter((part) => part.name === 'Arched recessed upper oak panel').length, 2);
    assert.equal(leaf.children.filter((part) => part.name === 'Recessed lower oak entry panel').length, 2);
    assert.equal(leaf.children.filter((part) => part.name === 'Arched entry dark pull').length, 2);
    assert.ok(!leaf.children.some((part) => /glazing/i.test(part.name)));
  }
});

test('wider front stairs have equal risers, flush nosings and join the existing approach without overlapping it', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  const parts = [];
  class Steps extends Group { constructor() { super(); this.position.set = (x, y, z) => Object.assign(this.position, { x, y, z }); } }
  const context = {
    THREE: { Group: Steps, PointLight: class extends Steps {} }, group: new Steps(),
    stepStone: {}, stepEdge: {}, glow: {},
    box(parent, x, y, z, width, height, depth) { const part = { x, y, z, width, height, depth }; parts.push(part); parent.add(part); return part; }
  };
  const start = source.indexOf('  function exteriorSteps('), end = source.indexOf('  const livingAccess =', start);
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  const call = source.split('\n').find((line) => line.includes("exteriorSteps(group, 'Contrasting front entry steps'"));
  assert.ok(call);
  vm.runInContext(call, context);
  const treads = parts.filter((part) => part.name === 'Darker stone entry tread');
  const nosings = parts.filter((part) => part.name === 'Contrasting step nosing');
  assert.equal(treads.length, 3);
  for (const [index, tread] of treads.entries()) {
    assert.equal(tread.width, 10.8);
    assert.equal(tread.depth, 1.05);
    assert.ok(Math.abs(tread.y + tread.height / 2 + (index + 1) * 0.45) < 1e-9);
    assert.ok(Math.abs(nosings[index].y + 0.025 - tread.y - tread.height / 2) < 1e-9);
  }
  assert.ok(Math.abs(treads.at(-1).z + treads.at(-1).depth / 2 - 64.5) < 1e-9);
});

test('exterior taps reach the entry-door picker while orbit drags do not open doors', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  const listeners = {};
  let doorPicks = 0, floorPicks = 0;
  const context = {
    activeFloor: 'exterior', navigationMode: 'rotate', walkDrag: null,
    renderer: { domElement: { addEventListener(name, callback) { listeners[name] = callback; } } },
    pickPatioDoor: () => false,
    pickHouseDoor() { doorPicks++; return true; },
    pickVehicleDoor: () => false,
    pickTourFloor() { floorPicks++; }
  };
  const start = source.indexOf("  renderer.domElement.addEventListener('pointerdown'");
  const end = source.indexOf("  for (const eventName of ['pointerup'", start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  const event = { pointerId: 1, button: 0, isPrimary: true, clientX: 100, clientY: 100 };
  listeners.pointerdown(event);
  listeners.pointerup(event);
  assert.equal(doorPicks, 1);
  assert.equal(floorPicks, 0);
  listeners.pointerdown(event);
  listeners.pointermove({ ...event, clientX: 120 });
  listeners.pointerup({ ...event, clientX: 120 });
  assert.equal(doorPicks, 1, 'Orbit drag is not treated as a door tap');
  assert.match(source, /function pickTourFloor\(event\) \{\s+if \(activeFloor === 'exterior'\) return;/);
  assert.match(source, /const exteriorWidth = name === 'exterior-entry' \? 20 :/, 'Entry close-up must not inherit the 66-foot whole-facade framing');
});

test('entry uses an uninterrupted porch plane instead of a decorative pediment', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  const definitions = require('../floor-plan-roof.js').getPorchRoofDefinitions();
  assert.equal(definitions.length, 1);
  assert.equal(definitions[0].planes.length, 1);
  assert.doesNotMatch(source, /const entryPediment = gable/);
  assert.ok(definitions.every((definition) => definition.finish === 'metal'));
  assert.ok(definitions.every((definition) => definition.bounds[2] < 53.2), 'Metal plane reaches the house');
});

test('porch fascia remains below the sloped metal underside instead of striping the roof surface', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  const parts = [];
  const context = {
    group: {}, trim: {},
    box(parent, x, y, z, width, height, depth) { const part = { x, y, z, width, height, depth }; parts.push(part); return part; }
  };
  vm.createContext(context);
  const roofStart = source.indexOf('  const porchCanopyHeight =');
  const roofEnd = source.indexOf('  const porchMetal =', roofStart);
  const fasciaStart = source.indexOf('  const porchFasciaZ =');
  const fasciaEnd = source.indexOf('  for (const center of [37, 48.5])', fasciaStart);
  assert.ok(roofStart >= 0 && roofEnd > roofStart && fasciaStart >= 0 && fasciaEnd > fasciaStart);
  vm.runInContext(source.slice(roofStart, roofEnd) + source.slice(fasciaStart, fasciaEnd), context);
  const fascia = parts[0];
  assert.equal(fascia.name, 'White farmhouse porch fascia');
  for (const z of [fascia.z - fascia.depth / 2, fascia.z, fascia.z + fascia.depth / 2]) {
    const underside = context.porchCanopyUndersideAt(z);
    assert.ok(fascia.y + fascia.height / 2 <= underside + 1e-9, 'No white fascia vertex is above the roof underside');
  }
  const vertices = [-0.35, 0.35].flatMap((z) => [-0.25, 0.25].map((y) => ({ y, z })));
  const header = {
    position: { y: 9.95, z: 60.5 }, userData: {},
    geometry: {
      attributes: { position: {
        count: vertices.length, getY: (index) => vertices[index].y, getZ: (index) => vertices[index].z,
        setY: (index, y) => { vertices[index].y = y; }
      } },
      computeVertexNormals() {}
    }
  };
  context.fitTrimTopToPorchRoof(header);
  for (const [index, vertex] of vertices.entries()) {
    if (index % 2 === 0) assert.ok(Math.abs(vertex.y + header.position.y - 9.7) < 1e-9, 'Door-clearance underside is preserved');
    else assert.ok(Math.abs(vertex.y + header.position.y - context.porchCanopyUndersideAt(vertex.z + header.position.z)) < 1e-9, 'Header top meets the roof underside rather than protruding through its surface');
  }
  assert.equal(header.userData.topFollowsPorchUnderside, true);
});
