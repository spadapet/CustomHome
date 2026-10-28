'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { getGuestSuiteLayout } = require('../floor-plan-ground.js');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

class Group {
  constructor() {
    this.children = []; this.userData = {};
    this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    this.rotation = { x: 0, y: 0, z: 0 };
  }
  add(p) { p.parent = this; this.children.push(p); }
  traverse(fn) { fn(this); this.children.forEach(p => p.traverse(fn)); }
}
function build() {
  const context = {
    THREE: { Group,
      Shape: class { constructor() { this.points = []; } moveTo(x,y) { this.points.push([x,y]); } lineTo(x,y) { this.points.push([x,y]); } closePath() {} },
      ExtrudeGeometry: class { constructor(shape, options) { this.vertices = shape.points.flatMap(([x,y]) => [0, options.depth].map(z => ({x,y,z}))); } },
      Mesh: class extends Group { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; this.isMesh = true; } }
    }, guestSuite: getGuestSuiteLayout(),
    oak: {}, brass: {}, black: {}, cream: {}, linen: {}, cabinetFinish: {}, cabinetPanelFinish: {}, cabinetRailFinish: {},
    furnishing(name, x, z) { const g = new Group(); g.name = name; g.position.set(x, 0, z); return g; },
    box(parent, x, y, z, width, height, depth, material) {
      const m = new Group(); m.isMesh = true; m.material = material;
      m.geometry = { parameters: { width, height, depth } }; m.position.set(x, y, z); parent.add(m); return m;
    },
    cylinder(parent, x, y, z, radius, height, material) {
      return this.box(parent, x, y, z, radius * 2, height, radius * 2, material);
    }
  };
  // VM global calls do not bind this.
  context.cylinder = (parent, x, y, z, radius, height, material) =>
    context.box(parent, x, y, z, radius * 2, height, radius * 2, material);
  vm.runInNewContext(source.slice(source.indexOf('  function toggleCabinet('), source.indexOf('  function cabinetCupPull(')), context);
  vm.runInNewContext(source.slice(source.indexOf("  const wardrobe = furnishing("), source.indexOf('  const bathroomOpening =')), context);
  const w = vm.runInNewContext('wardrobe', context);
  context.prepareCabinetInteractions(w);
  return { w, context };
}
// Transform every constituent box corner through all parent rotations/placements.
// Browser verification additionally uses actual THREE.Box3 after matrix updates.
function bounds(m) {
  if (!m.geometry) {
    const children = meshes(m).map(bounds);
    return { min: Object.fromEntries(['x', 'y', 'z'].map(k => [k, Math.min(...children.map(b => b.min[k]))])),
      max: Object.fromEntries(['x', 'y', 'z'].map(k => [k, Math.max(...children.map(b => b.max[k]))])) };
  }
  const p = m.geometry.parameters, points = [];
  const vertices = m.geometry.vertices ?? [-p.width/2,p.width/2].flatMap(x => [-p.height/2,p.height/2].flatMap(y => [-p.depth/2,p.depth/2].map(z => ({x,y,z}))));
  for (const vertex of vertices) {
    let a = { ...vertex };
    for (let n = m; n; n = n.parent) {
      for (const axis of ['x', 'y', 'z']) {
        const angle = n.rotation[axis] || 0, c = Math.cos(angle), s = Math.sin(angle), b = { ...a };
        if (axis === 'x') { a.y = c * b.y - s * b.z; a.z = s * b.y + c * b.z; }
        if (axis === 'y') { a.x = c * b.x + s * b.z; a.z = -s * b.x + c * b.z; }
        if (axis === 'z') { a.x = c * b.x - s * b.y; a.y = s * b.x + c * b.y; }
      }
      for (const axis of ['x', 'y', 'z']) a[axis] += n.position[axis];
    }
    points.push(a);
  }
  return { min: Object.fromEntries(['x', 'y', 'z'].map(k => [k, Math.min(...points.map(p => p[k]))])),
    max: Object.fromEntries(['x', 'y', 'z'].map(k => [k, Math.max(...points.map(p => p[k]))])) };
}
const meshes = root => { const result = []; root.traverse(p => { if (p.isMesh) result.push(p); }); return result; };
const overlap = (a, b) => ['x', 'y', 'z'].every(k => Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]) > 1e-7);
test('connected L has uniform depths/tops and contact-only corner shelves with open diagonal access', () => {
  const { w } = build(), parts = meshes(w);
  const sides = parts.filter(p => p.name === 'Guest closet full-height side panel');
  assert.equal(sides.length, 6);
  for (const p of sides) {
    const b = bounds(p);
    assert.ok(Math.abs(b.max.y - 7.25) < 1e-7);
    assert.ok(Math.abs(p.geometry.parameters.depth - 2) < 1e-7);
  }
  const decks = parts.filter(p => p.name === 'Guest closet connected diagonal corner shelf');
  const returns = parts.filter(p => p.name === 'Guest closet full-height corner return panel');
  assert.equal(returns.length, 2);
  for (const p of returns) assert.equal(p.geometry.parameters.depth, 0.75);
  // Test a hand/bin retrieval line through the diagonal opening, not an
  // empty metadata envelope behind intersecting full-depth side panels.
  for (let i = 0; i <= 20; i++) {
    const t = i / 20, x = 22 - 1.4*t, z = 40.2 - 1.4*t;
    const retrieval = { min: {x:x-0.06,y:3.1,z:z-0.06}, max:{x:x+0.06,y:3.3,z:z+0.06} };
    for (const p of parts) assert.ok(!overlap(bounds(p), retrieval), `Corner retrieval clears ${p.name}`);
  }
  assert.equal(decks.length, 7);
  const cap = decks.at(-1), b = bounds(cap);
  assert.ok(Math.abs(b.max.y - 7.25) < 1e-7);
  assert.ok(Math.abs(b.max.x - 21.25) < 1e-7 && Math.abs(b.max.z - 39.45) < 1e-7);
  const vertices = cap.geometry.vertices;
  assert.ok(vertices.some(p => p.x === 2 && p.y === 0.75));
  assert.ok(vertices.some(p => p.x === 0.75 && p.y === 2));
  assert.ok(!vertices.some(p => p.x === 2 && p.y === 2), 'Clipped corner is real geometry, not an inaccessible square');
  const diagonal = Math.hypot(1.25, 1.25) * 12;
  assert.ok(diagonal > 21.2 && diagonal < 21.3);
  const structural = parts.filter(p => /side panel|floor or cap|back panel|corner.*back|recessed plinth/.test(p.name));
  for (const deck of decks) for (const panel of structural)
    assert.ok(!overlap(bounds(deck), bounds(panel)), `${deck.name} contacts without overlapping ${panel.name}`);
  const datums = parts.filter(p => p.name === 'Guest wardrobe adjustable folded-clothes shelf').map(p => bounds(p).min.y);
  for (const y of datums) assert.ok(decks.some(p => Math.abs(bounds(p).min.y-y) < 1e-7));
});
test('fitted constituents clear finished trim, have usable long hanging and contact-only panel joints', () => {
  const { w } = build(), parts = meshes(w);
  for (const p of parts) {
    const b = bounds(p);
    assert.ok(b.min.x >= 19.2375 - 1e-7 && b.max.x <= 25.5125 + 1e-7, p.name);
    assert.ok(b.min.z >= 37.4375 - 1e-7 && b.max.z <= 42.9625 + 1e-7, p.name);
    assert.ok(b.min.y >= -1e-7, `${p.name} above floor`);
  }
  const panels = parts.filter(p => /side panel|floor or cap|back panel/.test(p.name));
  for (let i = 0; i < panels.length; i++) for (let j = i + 1; j < panels.length; j++)
    assert.ok(!overlap(bounds(panels[i]), bounds(panels[j])), 'Panel joints do not double occupy corners');
  const garments = parts.filter(p => p.name === 'Guest closet hanging garment');
  assert.equal(garments.length, 12);
  assert.equal(garments.filter(p => p.geometry.parameters.height > 5).length, 4);
  for (const p of garments) for (const panel of panels) assert.ok(!overlap(bounds(p), bounds(panel)));
});
test('three real drawers sweep 15 inches, preserve occupied approach and restore closed', () => {
  const { w, context } = build(), fronts = [];
  w.traverse(p => { if (p.userData.cabinetFront) fronts.push(p); });
  assert.equal(fronts.length, 3);
  const fixed = meshes(w).filter(p => !fronts.some(f => {
    for (let n = p; n; n = n.parent) if (n === f.parent) return true;
    return false;
  }));
  for (const front of fronts) {
    const drawer = front.parent, closed = bounds(front);
    assert.equal(meshes(drawer).filter(p => p.name === 'Guest closet drawer floor').length, 1);
    for (let step = 0; step <= 15; step++) {
      drawer.position.z = step / 12;
      for (const p of meshes(drawer)) for (const solid of fixed)
        assert.ok(!overlap(bounds(p), bounds(solid)), `${p.name} sweep clears ${solid.name}`);
    }
    drawer.position.z = 0;
    context.toggleCabinet(front);
    const extended = meshes(drawer).map(bounds);
    const edge = Math.max(...extended.map(b => b.max.x));
    assert.ok((25.5125 - edge) * 12 > 33, 'More than 33 inches east of open pulls; 24-inch user leaves >9 inches, not passing');
    assert.ok(Math.abs(bounds(front).max.x - closed.max.x - 1.25) < 1e-7);
    context.toggleCabinet(front);
    assert.ok(Math.abs(bounds(front).max.x - closed.max.x) < 1e-7);
  }
  // A continuous 31.2-inch strip from the 36-inch south opening to both
  // hanging fronts and the east-facing tower; north end stops at clothing zone.
  const route = { min: { x: 22.4, y: 0.4, z: 39.55 }, max: { x: 25, y: 6, z: 43.2 } };
  const entry = getGuestSuiteLayout().closetDoor;
  assert.ok(route.min.x > entry.x && route.max.x < entry.x + entry.width, 'Route stays between the relocated entry jambs');
  for (const p of meshes(w)) assert.ok(!overlap(bounds(p), route), `Closed route clears ${p.name}`);
});

test('rightmost trimmed pocket retracts left; centered bowl clears adapted drawers, plumbing and basket reserve', () => {
  const { context } = build(), items = [];
  Object.assign(context, { windowTrim: {}, steel: {}, porcelain: {}, guestVanityStone: {} });
  context.furnishing = (name, x, z, rotation = 0) => {
    const g = new Group(); g.name = name; g.position.set(x, 0, z); g.rotation.y = rotation; items.push(g); return g;
  };
  vm.runInNewContext(source.slice(source.indexOf('  function singlePanelDoor('), source.indexOf('  function cabinetCupPull(')), context);
  vm.runInNewContext(source.slice(source.indexOf('  const bathroomOpening ='), source.indexOf('  const guestCoats =')), context);
  const pocket = items.find(p => p.name === 'Guest walk-in closet left pocket door');
  const opening = context.guestSuite.closetDoor, operation = pocket.userData.interactiveHouseDoor;
  assert.ok(Math.abs(opening.x + opening.width + (2.5 + 0.125 + 0.75) / 12 - 25.575) < 1e-8, 'Cap, not just leg, limits eastward position');
  for (let step = 0; step <= 100; step++) {
    pocket.position.x = operation.closedCenterX - opening.pocket.travel * step / 100;
    const b = bounds(pocket);
    assert.ok(b.min.x >= opening.pocket.x - 1e-8, 'Actual leaf never enters west wall');
    assert.ok(b.min.z > 43.2 - 0.125 && b.max.z < 43.2 + 0.125, 'Leaf and flush pulls clear cavity skins');
  }
  assert.ok(Math.abs(bounds(pocket).max.x - opening.x) < 1e-8, 'Open leaf fully clears nominal opening');
  pocket.position.x = operation.closedCenterX;
  const bath = items.find(p => p.name === 'Guest bathroom inward-opening door');
  assert.equal(bath.userData.interactiveHouseDoor.maxAngleDegrees, 90);
  bath.rotation.y = Math.PI / 2;
  assert.ok(bounds(bath).min.x > 25.925, 'At 90 degrees actual knobs clear west finished wall');
  assert.ok(bounds(bath).min.z > 40.8, 'Inward endpoint stays south of toilet/towel');
  bath.rotation.y = 0;
  vm.runInNewContext(source.slice(source.indexOf('  function vanity('), source.indexOf('  const powderStone =')), context);
  const v = vm.runInNewContext("vanity('Regression guest vanity', 30.15, 41.4, 2.5, -Math.PI / 2)", context);
  const basin = v.children.find(p => /basin 1$/.test(p.name));
  assert.equal(basin.position.x, 0);
  const basinSolids = meshes(basin);
  const fixed = meshes(v).filter(p => /side or divider|tailpiece|trap allowance|rear supply/.test(p.name));
  const drawers = v.children.filter(p => /right pull-out drawer/.test(p.name));
  for (let step = 0; step <= 30; step++) {
    for (const drawer of drawers) {
      drawer.position.z = step / 24;
      for (const p of meshes(drawer)) for (const f of [...basinSolids, ...fixed])
        assert.ok(!overlap(bounds(p), bounds(f)), `${p.name} clears ${f.name} throughout travel`);
    }
  }
  drawers.forEach(d => d.position.z = 0);
  for (const p of basinSolids) for (const f of fixed) {
    if (!/tailpiece/.test(f.name)) assert.ok(!overlap(bounds(p), bounds(f)), 'Centered bowl clears lowered divider and supplies');
  }
  const bin = v.children.find(p => /removable hollow/.test(p.name));
  const binBounds = bounds(bin);
  const reserve = { min: { x: binBounds.min.x - 1 / 12, y: binBounds.min.y, z: binBounds.min.z - 1 / 12 },
    max: { x: binBounds.max.x + 1 / 12, y: binBounds.min.y + 1.5, z: binBounds.max.z + 1 / 12 } };
  for (const p of fixed) assert.ok(!overlap(reserve, bounds(p)), '12 x 12 x 18 reserve clears replumbed constituents');
  const soap = bounds(v.children.find(p => p.name === 'Guest vanity soap bottle'));
  assert.ok(Math.abs(soap.min.y - 2.84) < 1e-8);
  assert.ok(!overlap(soap, bounds(basin)));
});
