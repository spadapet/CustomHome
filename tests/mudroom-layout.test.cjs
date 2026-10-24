'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

function buildMudroom() {
  class Group {
    constructor() {
      this.children = [];
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = { x: 0, y: 0, z: 0 };
      this.scale = { x: 1, y: 1, z: 1, setScalar(value) { this.x = this.y = this.z = value; } };
      this.userData = {};
    }
    add(child) { child.parent = this; this.children.push(child); }
    traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
  }
  const roots = [];
  class Mesh extends Group {
    constructor(geometry, material) {
      super();
      Object.assign(this, { geometry, material });
      if (geometry.bounds) {
        const { min, max } = geometry.bounds;
        Object.assign(this, { w: max[0] - min[0], h: max[1] - min[1], d: max[2] - min[2] });
        this.position.set(...min.map((value, axis) => (value + max[axis]) / 2));
      }
    }
  }
  class Shape {
    constructor() { this.points = []; }
    moveTo(x, y) { this.points.push([x, y]); }
    lineTo(x, y) { this.points.push([x, y]); }
    closePath() {}
  }
  class ExtrudeGeometry {
    constructor(shape, options) {
      this.bounds = {
        min: [Math.min(...shape.points.map(([x]) => x)) - options.bevelSize, Math.min(...shape.points.map(([, y]) => y)) - options.bevelSize, -options.bevelThickness],
        max: [Math.max(...shape.points.map(([x]) => x)) + options.bevelSize, Math.max(...shape.points.map(([, y]) => y)) + options.bevelSize, options.depth + options.bevelThickness]
      };
    }
    computeBoundingBox() { this.boundingBox = { min: { y: this.bounds.min[1] }, max: { y: this.bounds.max[1] } }; }
    translate(x, y, z) { for (const key of ['min', 'max']) this.bounds[key] = this.bounds[key].map((value, axis) => value + [x, y, z][axis]); }
    scale(x, y, z) { for (const key of ['min', 'max']) this.bounds[key] = this.bounds[key].map((value, axis) => value * [x, y, z][axis]); }
  }
  const footwearTemplate = (kind) => ({
    clone() {
      const group = new Group();
      const part = new Group();
      Object.assign(part, kind === 'shoe' ? { w: 4.471 / 12, h: 5.911 / 12, d: 11.5 / 12 } : { w: 3.43 / 12, h: 14 / 12, d: 10 / 12 });
      part.position.y = part.h / 2;
      group.add(part);
      group.userData = { asset: kind === 'shoe' ? 'assets/models/khronos/MaterialsVariantsShoe.glb' : 'assets/models/poly-haven/rubber_boots/rubber_boots_1k.gltf', uniformScale: true };
      return group;
    }
  });
  const context = {
    THREE: {
      Group, Mesh, Shape, ExtrudeGeometry,
      SphereGeometry: class { constructor(radius) { this.bounds = { min: [-radius, 0, -radius], max: [radius, radius, radius] }; } },
      CanvasTexture: class { constructor(image) { this.image = image; } },
      PlaneGeometry: class { constructor(width, height) { this.parameters = { width, height }; } },
      MeshBasicMaterial: class { constructor(options) { Object.assign(this, options); } }
    }, ceilingHeight: 9,
    mudroomAssets: { shoe: footwearTemplate('shoe'), bootLeft: footwearTemplate('boot'), bootRight: footwearTemplate('boot') },
    document: {
      createElement() {
        const context = { fills: [], texts: [], fillRect() { this.fills.push(this.fillStyle); }, fillText(text) { this.texts.push({ text, font: this.font, color: this.fillStyle }); } };
        return { context, getContext() { return context; } };
      }
    },
    ...Object.fromEntries(['cabinetFinish', 'cabinetRailFinish', 'cabinetPanelFinish', 'cream', 'brass', 'porcelain', 'steel', 'black', 'linen', 'countertop', 'mudTileFinish', 'mudGroutFinish'].map((name) => [name, { name }])),
    rest: new Group(), garageEntry: { x: 39.5, z: 26.725, width: 3, height: 8 },
    furnishing(name, x, z, rotation = 0) {
      const group = new Group();
      group.name = name;
      group.position.set(x, 0, z);
      group.rotation.y = rotation;
      roots.push(group);
      return group;
    },
    box(parent, x, y, z, w, h, d, material) {
      assert.ok(material, 'Mudroom parts use defined materials');
      const mesh = new Group();
      Object.assign(mesh, { w, h, d, material });
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    cylinder(parent, x, y, z, radius, height, material) {
      return context.box(parent, x, y, z, radius * 2, height, radius * 2, material);
    },
    mat(color, roughness) { return { color, roughness }; }
  };
  // Reuse the real front/pull geometry, including its projection into the aisle.
  vm.runInNewContext(source.slice(source.indexOf('  function shakerFront('), source.indexOf('  function cabinetCupPull(')), context);
  vm.runInNewContext(source.slice(source.indexOf('  function tiledFloor('), source.indexOf("  const stairs = furnishing(")), context);
  const start = source.indexOf("  tiledFloor('Mudroom tile'");
  const end = source.indexOf('  const epoxy', start);
  assert.ok(start >= 0 && end > start, 'Locate the complete mudroom furnishings');
  vm.runInNewContext(source.slice(start, end), context);
  const descendants = (node) => [node, ...node.children.flatMap(descendants)];
  const all = roots.flatMap(descendants);
  return { roots, all, floorParts: context.rest.children, find: (name) => all.filter((item) => item.name === name) };
}

function bounds(root) {
  const result = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  function visit(node) {
    if (node.w !== undefined) {
      for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) {
        let [x, y, z] = [dx * node.w / 2, dy * node.h / 2, dz * node.d / 2];
        for (let current = node; current; current = current.parent) {
          const r = current.rotation;
          x *= current.scale.x;
          y *= current.scale.y;
          z *= current.scale.z;
          [x, y] = [x * Math.cos(r.z) - y * Math.sin(r.z), x * Math.sin(r.z) + y * Math.cos(r.z)];
          [x, z] = [x * Math.cos(r.y) + z * Math.sin(r.y), -x * Math.sin(r.y) + z * Math.cos(r.y)];
          [y, z] = [y * Math.cos(r.x) - z * Math.sin(r.x), y * Math.sin(r.x) + z * Math.cos(r.x)];
          x += current.position.x;
          y += current.position.y;
          z += current.position.z;
        }
        [x, y, z].forEach((value, axis) => {
          result.min[axis] = Math.min(result.min[axis], value);
          result.max[axis] = Math.max(result.max[axis], value);
        });
      }
    }
    node.children.forEach(visit);
  }
  visit(root);
  return result;
}

function boxParts(model, root) {
  return model.all.filter((part) => {
    if (part.w === undefined) return false;
    for (let node = part; node; node = node.parent) if (node === root) return true;
    return false;
  });
}

test('five backed cubbies have side-panel hooks and unobstructed floor-level large-shoe openings', () => {
  const model = buildMudroom();
  const cubbies = model.find('Mudroom family cubby');
  assert.equal(cubbies.length, 5);
  assert.equal(model.find('Mudroom gold coat hook').length, 10);
  for (const cubby of cubbies) {
    assert.equal(cubby.children.filter((part) => part.name === 'Mudroom gold coat hook').length, 2);
    assert.equal(cubby.children.filter((part) => part.name === 'Open cubby shoe shelf').length, 0, 'No shelf lip or intermediate shelf obstructs kicking shoes in');
    for (const hook of cubby.children.filter((part) => part.name === 'Mudroom gold coat hook')) {
      assert.equal(hook.userData.mount, 'Cubby side panel');
      assert.ok(Math.abs(Math.abs(hook.rotation.y) - Math.PI / 2) < 1e-9);
      const plate = bounds(hook.children.find((part) => part.name === 'Hook mounting plate'));
      const divider = model.find('Mudroom cubby partition').map(bounds).find((panel) => Math.abs(plate.min[2] - panel.max[2]) < 1e-8 || Math.abs(plate.max[2] - panel.min[2]) < 1e-8);
      assert.ok(divider, 'Hook mounting plate touches an actual side divider');
    }
    assert.equal(cubby.children.filter((part) => part.name === 'Mudroom upper cubby shelf').length, 3);
    assert.ok(cubby.userData.clearWidthInches > 17);
  }
  const seat = model.find('Mudroom light stone bench seat')[0];
  assert.equal(seat.w * 12, 90);
  assert.equal(seat.d * 12, 18);
  assert.equal((seat.position.y + seat.h / 2) * 12, 18);
  assert.ok(model.find('Mudroom cubby partition').every((part) => part.d === seat.d && part.position.z === 0), 'Upper dividers now align with the bench front without enlarging its footprint');
  assert.ok(model.find('Mudroom upper cubby shelf').every((part) => part.d === seat.d && part.position.z === 0));
  const backing = model.find('Continuous mudroom cubby backing')[0];
  assert.equal(backing.material.name, 'Muted sage-greige mudroom backing');
  assert.equal(backing.h, 8.75);
  assert.ok((seat.position.y - seat.h / 2 - 0.0405) * 12 >= 14, 'At least 14-inch actual clear height above finished tile/grout');
  assert.ok((0.75 - (backing.position.z + backing.d / 2)) * 12 >= 16, 'At least 16-inch clear shoe depth');
});

test('conventional enclosed coat closet has a transverse rail and standard bifold door', () => {
  const model = buildMudroom();
  assert.equal(model.roots.length, 6);
  for (const name of ['Mudroom stacked washer and dryer', 'Mudroom washer concept', 'Mudroom dryer concept', 'Provisional laundry stacking kit', 'Laundry reservation side panel', 'Laundry overhead compartment floor']) {
    assert.equal(model.find(name).length, 0, `${name} must not remain in the mudroom`);
  }
  assert.equal(model.find('Mudroom coat hanging rail').length, 1);
  assert.equal(model.find('Mudroom hanging coat').length, 4);
  assert.equal(model.find('Closet open shoe shelf').length, 2);
  assert.equal(model.find('Coat closet upper shelf').length, 3);
  assert.equal(model.find('Mudroom sliding coat closet door').length, 0);
  assert.equal(model.find('Full-overlay Shaker cabinet front').length, 0, 'Mudroom uses simple builder-installed open shelving');
  assert.equal(model.find('Mudroom keys and charging drop zone').length, 0, 'Removed with the pictured west run');
  const closet = model.find('Mudroom hanging coat closet')[0];
  assert.equal(closet.userData.widthInches, 36);
  assert.equal(closet.userData.depthInches, 24);
  assert.equal(closet.userData.doorHeightInches, 96);
  assert.equal(closet.userData.railOrientation, 'Side to side');
  assert.match(closet.userData.doorStyle, /32-inch bifold/);
  assert.equal(model.find('Mudroom standard bifold door panel').length, 4);
  for (const leaf of model.find('Mudroom standard bifold door panel')) {
    assert.equal(leaf.h, 7.96);
    assert.ok(Math.abs((bounds(leaf).min[1] + bounds(leaf).max[1]) / 2 - 4) < 1e-9, 'Interactive leaves remain centered four feet above the floor');
  }
  for (const jamb of model.find('Mudroom closet door jamb')) assert.equal(jamb.h, 8);
  const headwall = model.find('Mudroom closet headwall')[0];
  assert.equal(headwall.position.y - headwall.h / 2, 8);
  assert.equal(model.find('Mudroom closet headwall').length, 1);
  assert.equal(model.find('Mudroom coat hanging rail')[0].rotation.z, Math.PI / 2);
  for (const coat of model.find('Mudroom hanging coat')) {
    const b = bounds(coat), c = bounds(closet);
    assert.ok(b.min.every((value, axis) => value >= c.min[axis]) && b.max.every((value, axis) => value <= c.max[axis]), 'Illustrated front-facing coats fit inside shallow bay');
  }
});

test('pictured west shoe-and-bin section and its overhead rail are removed', () => {
  const model = buildMudroom();
  const owners = ['Peter', 'Lila', 'Jacob', 'Ada', 'Lucas'];
  assert.deepEqual(model.find('Mudroom family cubby').map((cubby) => cubby.userData.owner), owners);
  for (const name of ['Mudroom family container and shoe tower', 'Mudroom extra family shoe wall', 'Mudroom personal accessory bin', 'Removable accessory container', 'Family upper shoe divider', 'Family tower top cap', 'Mudroom continuous west top rail', 'Mudroom charging outlet allowance']) {
    assert.equal(model.find(name).length, 0, `${name} is removed, not merely hidden`);
  }
  assert.equal(model.find('Mudroom basket built-in return').length, 1, 'New connecting joinery replaces the gap, not the deleted shoe/bin towers');
});

test('remaining east shoe tower fits seven larger pair envelopes', () => {
  const model = buildMudroom();
  const wall = model.find('Mudroom corner shoe tower')[0];
  const cells = model.find('Mudroom extra shoe pair cell');
  assert.equal(wall.userData.extraPairTarget, 7);
  assert.equal(cells.length, 7);
  assert.equal(model.find('Stored extra shoe').length, 14);
  assert.equal(cells.filter((cell) => cell.userData.zone === 'Beside cubbies').length, 7);
  assert.equal(cells.filter((cell) => cell.userData.zone !== 'Beside cubbies').length, 0);
  const shelves = model.find('Extra shoe pair shelf').map(bounds);
  const caps = model.find('Corner shoe tower top cap').map(bounds);
  const trimBottom = bounds(model.find('Mudroom continuous east top rail')[0]).min[1];
  for (const cell of cells) {
    const [width, depth, height] = cell.userData.pairEnvelopeInches;
    assert.ok(cell.userData.clearWidthInches >= width);
    assert.ok(cell.userData.depthInches >= depth);
    assert.ok(cell.userData.clearHeightInches >= height);
    assert.equal(cell.userData.pairs, 1);
    const shelf = bounds(cell.children.find((part) => part.name === 'Extra shoe pair shelf'));
    assert.ok((shelf.max[2] - shelf.min[2]) * 12 >= width, 'Actual shelf fits target pair width');
    assert.ok((shelf.max[0] - shelf.min[0]) * 12 >= depth, 'Actual shelf fits target pair depth');
    const above = [...shelves, ...caps].filter((next) => next.min[1] > shelf.max[1] && [0, 2].every((axis) => Math.min(next.max[axis], shelf.max[axis]) - Math.max(next.min[axis], shelf.min[axis]) > 0.000001));
    assert.ok((Math.min(trimBottom, ...above.map((next) => next.min[1])) - shelf.max[1]) * 12 >= height, 'Actual shelf and front-trim opening fit the target height, not just a metadata allowance');
  }
  assert.equal(model.find('Extra shoe wall seasonal shelf').length, 0);
  const shoeBounds = bounds(wall);
  assert.ok(Math.abs((shoeBounds.max[2] - shoeBounds.min[2]) * 12 - 18.72) < 0.000001);
});

test('five named cubbies contain family outerwear, three backpacks, a hat and a real four-foot coat', () => {
  const model = buildMudroom();
  const cubbies = model.find('Mudroom family cubby');
  assert.deepEqual(cubbies.map((cubby) => cubby.userData.owner), ['Peter', 'Lila', 'Jacob', 'Ada', 'Lucas']);
  for (const cubby of cubbies) {
    const owner = cubby.userData.owner;
    assert.equal(model.find(`Mudroom decorative name: ${owner}`).length, 1);
    const garment = cubby.children.find((part) => part.name === `${owner} cubby ${owner === 'Lila' ? 'long coat' : 'jacket'}`);
    assert.ok(garment, `${owner} has outerwear`);
    const body = garment.children.find((part) => part.name === 'Contoured hanging outerwear');
    const bodyBounds = bounds(body);
    const seat = bounds(model.find('Mudroom light stone bench seat')[0]);
    const firstShelf = cubby.children.find((part) => part.name === 'Mudroom upper cubby shelf');
    assert.ok(bodyBounds.min[1] > seat.max[1], 'Hem clears the actual bench top');
    assert.ok(bodyBounds.max[1] < bounds(firstShelf).min[1], 'Outerwear clears the first shelf');
    assert.equal(garment.rotation.y, -Math.PI / 2, 'Outerwear hangs along the side divider, not against the back');
    const rightHook = cubby.children.filter((part) => part.name === 'Mudroom gold coat hook')[1];
    const loop = bounds(garment.children.find((part) => part.name === 'Outerwear hanging loop'));
    const hookTip = bounds(rightHook.children.find((part) => part.name === 'Coat hook upturn'));
    assert.ok(loop.max.every((value, axis) => value >= hookTip.min[axis] && loop.min[axis] <= hookTip.max[axis]), 'Garment loop actually meets the right hook tip');
    for (const divider of model.find('Mudroom cubby partition')) {
      const panel = bounds(divider);
      assert.ok(bodyBounds.max.some((value, axis) => value <= panel.min[axis] || bodyBounds.min[axis] >= panel.max[axis]), 'Turned sleeves clear all cubby partitions');
    }
    if (owner === 'Lila') {
      assert.ok(Math.abs((bodyBounds.max[1] - bodyBounds.min[1]) * 12 - 48) < 1e-9, 'Four feet is actual mesh height, not metadata');
      assert.equal(firstShelf.position.y, 6.35);
      assert.ok(cubby.children.filter((part) => part.name === 'Mudroom gold coat hook').every((hook) => hook.position.y === 5.55));
    }
  }
  for (const owner of ['Jacob', 'Ada', 'Lucas']) {
    const backpack = model.find(`${owner} backpack`)[0];
    assert.ok(backpack);
    assert.equal(backpack.rotation.y, Math.PI / 2);
    const leftHook = backpack.parent.children.filter((part) => part.name === 'Mudroom gold coat hook')[0];
    const handle = bounds(backpack.children.find((part) => part.name === 'Backpack hanging handle'));
    const hookTip = bounds(leftHook.children.find((part) => part.name === 'Coat hook upturn'));
    assert.ok(handle.max.every((value, axis) => value >= hookTip.min[axis] && handle.min[axis] <= hookTip.max[axis]), 'Backpack handle actually meets the left hook tip');
  }
  assert.equal(model.find('Peter backpack').length, 0);
  assert.equal(model.find('Lila backpack').length, 0);
  assert.equal(model.find('Peter hat').length, 1);
  const hat = bounds(model.find('Peter hat')[0]);
  const peterShelf = cubbies[0].children.find((part) => part.name === 'Mudroom upper cubby shelf');
  assert.ok(hat.min[1] >= bounds(peterShelf).max[1], 'Hat rests above, not inside, its shelf');
});

test('decorative names sit inside cubbies on transparent backgrounds instead of white nameplates', () => {
  const model = buildMudroom();
  for (const cubby of model.find('Mudroom family cubby')) {
    const name = model.find(`Mudroom decorative name: ${cubby.userData.owner}`)[0];
    assert.equal(name.parent, cubby);
    assert.equal(name.position.y, 5.1);
    assert.ok(name.position.z > -0.6875 && name.position.z < -0.68, 'Lettering sits just in front of the solid backing, not on the shelf edge');
    assert.ok(name.geometry.parameters.width * 12 < cubby.userData.clearWidthInches);
    assert.equal(name.material.transparent, true);
    assert.equal(name.material.alphaTest, 0.05);
    assert.equal(name.material.depthWrite, false);
    const drawing = name.material.map.image.context;
    assert.equal(drawing.fills.length, 0, 'No rectangular background is painted');
    assert.equal(drawing.texts[0].text, cubby.userData.owner);
    assert.match(drawing.texts[0].font, /italic.*Script.*cursive/);
    assert.equal(drawing.texts[0].color, '#806239');
    assert.equal(model.find(`Mudroom label: ${cubby.userData.owner}`).length, 0);
    assert.ok(cubby.children.filter((part) => part.name === 'Mudroom upper cubby shelf')[0].position.y === 6.35, 'First shelf line now aligns across all five cubbies');
  }
  const safety = model.find('Mudroom label: Safe high access required')[0];
  assert.equal(safety.material.transparent, false, 'High-access warning retains its readable background');
});

test('daily boots and sneakers fit under the bench and shelf boots clear the shelf above', () => {
  const model = buildMudroom();
  const daily = model.find('Mudroom daily footwear');
  assert.equal(daily.length, 10);
  assert.equal(daily.filter((shoe) => shoe.userData.kind === 'boot').length, 4);
  const seat = bounds(model.find('Mudroom light stone bench seat')[0]);
  for (const shoe of daily) {
    const b = bounds(shoe);
    assert.ok(b.min[1] >= 0.0405 - 1e-9 && b.max[1] < seat.min[1], 'Daily footwear fits above tile and below the seat');
    assert.equal(shoe.userData.uniformScale, true);
  }
  const stored = model.find('Stored extra shoe');
  assert.equal(stored.filter((shoe) => shoe.userData.kind === 'boot').length, 4);
  for (const shoe of stored) {
    const cell = shoe.parent;
    const b = bounds(shoe);
    const shelf = bounds(cell.children.find((part) => part.name === 'Extra shoe pair shelf'));
    assert.ok(b.min[1] >= shelf.max[1] - 1e-9);
    assert.ok((b.max[1] - shelf.max[1]) * 12 < cell.userData.clearHeightInches);
  }
  assert.equal(model.find('Stored shoe sole').length, 0, 'Old flat shoe blocks are gone');
});

test('deeper basket shelves retain a 50.8-inch static aisle opposite the bench', () => {
  const model = buildMudroom();
  const bench = bounds(model.find('Five-cubby mudroom bench')[0]);
  const tower = model.find('Mudroom arrival-wall basket shelves')[0];
  const drawerBounds = bounds(tower);
  const closed = (bench.min[0] - drawerBounds.max[0]) * 12;
  assert.ok(Math.abs(closed - 50.8) < 1e-8, `Closed-case aisle is ${closed} inches`);
  assert.equal(tower.userData.baskets, 10);
  assert.equal(tower.userData.drawerTravelInches, undefined);
  assert.equal(tower.userData.depthInches, 12);
  const coat = model.find('Mudroom hanging coat closet')[0];
  assert.ok(Math.abs(coat.position.x - (37.5 + 44.9 - 2 / 12) / 2) < 1e-9, 'Coat closet stays centered across the narrowed mudroom');
  assert.equal(coat.rotation.y, 0, 'Closed coat doors face into the room, not sideways from the corner');
});

test('garage entry door defaults inward at ninety degrees and its full sweep clears moved baskets and cubbies', () => {
  const model = buildMudroom();
  const door = model.find('Mudroom garage entry door')[0];
  const leaf = model.find('Mudroom inward garage door leaf')[0];
  const operation = leaf.userData.interactiveHouseDoor;
  assert.equal(door.userData.nominalWidthInches, 36);
  assert.equal(door.userData.nominalHeightInches, 96);
  assert.equal(door.userData.thicknessInches, 1.75);
  assert.equal(operation.openAngleDegrees, 90);
  assert.equal(operation.maxAngleDegrees, 90);
  assert.equal(operation.openRotationSign, 1);
  assert.equal(leaf.rotation.y, Math.PI / 2);
  const obstacles = model.all.filter((part) => {
    if (part.w === undefined) return false;
    for (let node = part; node; node = node.parent) if (node === door) return false;
    return true;
  }).map((part) => ({ name: part.name, bounds: bounds(part) }));
  const doorParts = boxParts(model, door);
  try {
    for (let degrees = 0; degrees <= 90; degrees++) {
      leaf.rotation.y = degrees * Math.PI / 180;
      for (const part of doorParts) {
        const moving = bounds(part);
        for (const obstacle of obstacles) {
          const fixed = obstacle.bounds;
          assert.ok(moving.max.some((value, axis) => value <= fixed.min[axis] + 1e-6 || fixed.max[axis] <= moving.min[axis] + 1e-6), `${part.name} clears ${obstacle.name} at ${degrees} degrees, including handles`);
        }
      }
    }
    leaf.rotation.y = 0;
    const panel = bounds(model.find('Solid mudroom garage door panel')[0]);
    assert.ok(panel.min[0] > 39.5 && panel.max[0] < 42.5, 'Leaf fits the unchanged garage opening when closed');
    assert.ok(panel.min[1] > 0 && panel.max[1] < 8);
    assert.ok(Math.abs((panel.min[1] - 0.0405) * 12 - 0.5) < 1e-9, 'Door bottom clears finished tile/grout by the modeled half inch, not merely the structural floor datum');
  } finally {
    leaf.rotation.y = Math.PI / 2;
  }
  const bench = bounds(model.find('Five-cubby mudroom bench')[0]);
  const openDoor = bounds(door);
  assert.ok((bench.min[0] - openDoor.max[0]) * 12 > 36.7, 'Parked-open leaf and both levers retain over 36.7 inches to the bench');
  assert.match(door.userData.approval, /Rated\/self-closing.*unverified/);
});

test('storage fits below the ceiling with no case overlap and keeps the entry route clear', () => {
  const model = buildMudroom();
  const [bench, closet] = model.roots.map(bounds);
  for (const root of model.roots.filter((root) => root.name !== 'Mudroom garage entry door')) {
    const b = bounds(root);
    assert.ok(b.min[0] >= 37.675 - 1e-9 && b.max[0] <= 44.6);
    const fitted = root.name === 'Continuous mudroom built-in enclosure';
    assert.ok(b.min[2] >= 14.8 && b.max[2] <= (fitted ? 26.725 : 26.9 - 0.175 - 1 / 12) + 1e-9, 'Cases retain their footprint; fitted end scribes meet the south wall');
    assert.ok(b.min[1] >= -1e-9 && b.max[1] <= (fitted ? 9 : 8.75) + 1e-9);
  }
  for (let first = 0; first < model.roots.length; first++) for (let second = first + 1; second < model.roots.length; second++) {
    for (const aPart of boxParts(model, model.roots[first])) for (const bPart of boxParts(model, model.roots[second])) {
      const a = bounds(aPart), b = bounds(bPart);
      assert.ok(a.max.some((value, axis) => value <= b.min[axis] + 0.000001 || b.max[axis] <= a.min[axis] + 0.000001), `${aPart.name} and ${bPart.name} join without positive overlap`);
    }
  }
  assert.ok(closet.max[2] < 21.675 - (3.5 + 0.125) / 12, 'Closet clears kitchen-entry casing');
  assert.ok(bench.min[0] > 42.5 + (3.5 + 0.125) / 12, 'Bench clears garage-entry casing');
  assert.ok(closet.max[2] < 21.675 && bench.min[0] > 42.9, 'Kitchen-to-garage route remains open');
  const entryTurningArea = { min: [39.875, 0, 21.5], max: [42.9, 6, 26.5] };
  for (const part of model.all.filter((part) => part.w !== undefined)) {
    const b = bounds(part);
    assert.ok(b.max.some((value, axis) => value <= entryTurningArea.min[axis] || b.min[axis] >= entryTurningArea.max[axis]), 'With the door parked open, keep a conservative 36.3 by 60 inch static passing strip, not accessibility approval');
  }
});

test('the entire enclosed coat front has a 36-inch deep storage-free approach', () => {
  const model = buildMudroom();
  const coat = model.find('Mudroom hanging coat closet')[0];
  const c = bounds(coat);
  const approach = { min: [c.min[0], 0, c.max[2]], max: [c.max[0], 6.4, c.max[2] + 3] };
  for (const part of model.all.filter((part) => part.w !== undefined)) {
    let inCoat = false;
    for (let node = part; node; node = node.parent) if (node === coat) inCoat = true;
    if (inCoat) continue;
    const b = bounds(part);
    assert.ok(b.max.some((value, axis) => value <= approach.min[axis] || b.min[axis] >= approach.max[axis]), 'No shoe tower, shelf return, or bin unit blocks any part of the coat approach');
  }
});

test('kitchen wall shifts six inches while both passage widths and garage entry location stay fixed', () => {
  assert.ok(source.includes('const garageEntry = { x: 39.5, z: 26.725, width: 3, going: 11 / 12, height: 8 }'));
  assert.match(source, /const kitchenSideOpenings = \[9\.725, 21\.675\]/);
  const plan = require('../floor-plan-ground.js').getGroundFloorDefaultPlan();
  const kitchen = plan.walls.find((wall) => wall[0] === 'Kitchen east');
  const garage = plan.walls.find((wall) => wall[0] === 'Mudroom south');
  assert.deepEqual(kitchen[5][1], [14.675, 17.175, 0, 8]);
  assert.equal(kitchen[1], 37.5);
  assert.equal(kitchen[3], 37.5);
  assert.deepEqual(garage[5], [[2, 5, 0, 8]]);
  assert.equal(garage[1] + garage[5][0][0], 39.5);
  assert.equal(garage[1] + garage[5][0][1], 42.5);
});

test('uniform enclosure closes both blind corners instead of leaving shelf bridges and open gaps', () => {
  const model = buildMudroom();
  const corners = model.find('Mudroom enclosed corner return');
  assert.equal(corners.length, 2);
  assert.equal(model.find('Mudroom connecting upper shelf').length, 0);
  assert.equal(model.find('Mudroom east return upper shelf').length, 0);
  for (const corner of corners) {
    assert.equal(corner.userData.accessibleStorage, false, 'Blind corners are explicitly not counted as usable storage');
    assert.ok(Math.abs(bounds(corner).max[1] * 12 - 105) < 0.000001);
    assert.ok(Math.abs(bounds(corner).min[2] - 15.4) < 0.000001);
    assert.ok(Math.abs(bounds(corner).max[2] - 17.54) < 0.000001);
    assert.equal(corner.children.filter((part) => part.name === 'Enclosed corner front').length, 1);
    assert.equal(corner.children.filter((part) => part.name === 'Enclosed corner cheek').length, 2);
  }
});

test('prep/mudroom divider aligns with the garage wall while kitchen openings and garage entry stay fixed', () => {
  const plan = require('../floor-plan-ground.js').getGroundFloorDefaultPlan();
  assert.deepEqual(plan.walls.find(([name]) => name === 'Mudroom north').slice(1), [37.5, 15, 44.9 - 2 / 12, 15]);
  assert.deepEqual(plan.walls.find(([name]) => name === 'Mudroom east').slice(1), [44.9 - 2 / 12, 15, 44.9 - 2 / 12, 26.9]);
  const mud = plan.rooms.find((room) => room.name === 'Mudroom');
  assert.equal(mud.z, 15);
  assert.equal(mud.d, 11.9);
  assert.equal(mud.w, 7.4 - 2 / 12);
  const garageFloor = plan.floors.find((floor) => floor.room === 'Garage' && floor.z === 15);
  assert.equal(garageFloor.x, 44.9 - 2 / 12);
  assert.equal(garageFloor.w, 10.6 + 2 / 12);
  const prepFloors = plan.floors.filter((floor) => floor.room === 'Prep kitchen');
  assert.ok(Math.abs(prepFloors.reduce((area, floor) => area + floor.w * floor.d, 0) - 18 * 8) < 1e-9);
  assert.equal(plan.walls.find(([name]) => name === 'Mudroom south')[2], 26.9);
  assert.equal(plan.walls.find(([name]) => name === 'Kitchen north')[2], 7);
  assert.deepEqual(plan.walls.find(([name]) => name === 'Kitchen east')[5], [[2.725, 5.225, 0, 8], [14.675, 17.175, 0, 8]]);
  const model = buildMudroom();
  assert.equal(model.find('Mudroom hanging coat closet')[0].position.z, 16.4);
  assert.equal(model.find('Five-cubby mudroom bench')[0].position.z, 22.85);
});

test('reference-inspired mudroom uses consistent sage-greige paint, light stone and warm gold without changing shared finishes', () => {
  const model = buildMudroom();
  const ivoryParts = [
    'Open shoe bay divider', 'Mudroom cubby partition', 'Mudroom upper cubby shelf', 'Coat closet side panel',
    'Closet open shoe shelf', 'Coat closet upper shelf', 'Arrival basket tower side', 'Arrival basket fixed shelf', 'Basket return connecting shelf', 'Mudroom continuous recessed plinth',
    'Extra shoe pair shelf', 'Corner shoe tower side', 'Corner shoe tower top cap',
    'Enclosed corner horizontal panel', 'Enclosed corner back', 'Enclosed corner front', 'Enclosed corner cheek',
    'Coat header top return', 'Mudroom continuous north top rail', 'Mudroom continuous east top rail',
    'Mudroom north wall scribe', 'Mudroom west wall scribe', 'Mudroom east wall scribe', 'Mudroom cubby end scribe',
    'Mudroom north ceiling infill', 'Mudroom west ceiling infill', 'Mudroom east ceiling infill'
  ];
  const backingParts = [
    'Continuous mudroom cubby backing', 'Coat closet backing', 'Arrival basket tower backing', 'Corner shoe tower backing', 'Basket return continuous backing'
  ];
  const oakFrontParts = ['Mudroom closet door jamb', 'Mudroom closet headwall', 'Mudroom standard bifold door panel', 'Mudroom bifold recessed panel'];
  const binParts = ['Arrival basket bottom', 'Arrival basket side', 'Arrival basket face'];
  for (const [names, finish, color] of [
    [ivoryParts.concat(oakFrontParts), 'Muted sage-greige mudroom casework', '#aaa99a'],
    [backingParts, 'Muted sage-greige mudroom backing', '#aaa99a'],
    [binParts, 'Natural woven mudroom baskets', '#b89a70']
  ]) {
    for (const name of names) {
      const parts = model.find(name);
      assert.ok(parts.length > 0, `${name} exists`);
      for (const part of parts) {
        assert.equal(part.material.name, finish, `${name} uses its intended finish`);
        assert.equal(part.material.color, color);
      }
    }
  }
  for (const [name, count] of [['Mudroom closet door jamb', 2], ['Mudroom closet headwall', 1], ['Mudroom standard bifold door panel', 4]]) {
    const parts = model.find(name);
    assert.equal(parts.length, count);
    assert.ok(parts.every((part) => part.material.name === 'Muted sage-greige mudroom casework'), `${name} matches the painted enclosure`);
  }
  const recessed = model.find('Mudroom bifold recessed panel');
  assert.equal(recessed.length, 8);
  assert.ok(recessed.every((part) => part.material.name === 'Muted sage-greige mudroom casework'), 'Recessed bifold panels match the painted leaves');
  const wood = model.all.filter((part) => ['cabinetFinish', 'cabinetRailFinish', 'cabinetPanelFinish'].includes(part.material?.name));
  assert.equal(wood.length, 0, 'Mudroom recoloring replaces local material assignments, not shared kitchen finishes');
  const seat = model.find('Mudroom light stone bench seat')[0];
  assert.equal(seat.material.name, 'countertop');
  assert.ok(model.find('Mudroom gold coat hook').every((hook) => hook.children.every((part) => part.material.name === 'brass')));
  assert.ok(model.find('Mudroom closet gold knob').every((part) => part.material.name === 'brass'));
  assert.ok(model.find('Stored extra shoe').every((part) => part.userData.asset && part.userData.uniformScale), 'Shelf footwear is a uniformly scaled licensed asset, not flat blocks');
});

test('all five remaining case groups share a 105-inch top with connected north and east trim', () => {
  const model = buildMudroom();
  const enclosure = model.find('Continuous mudroom built-in enclosure')[0];
  assert.equal(enclosure.userData.uniformTopInches, 105);
  assert.equal(enclosure.userData.extraPairTarget, 7);
  assert.equal(enclosure.userData.blindCornersCountedAsStorage, false);
  const rails = ['north', 'east'].map((side) => bounds(model.find(`Mudroom continuous ${side} top rail`)[0]));
  assert.ok(rails.every((rail) => Math.abs(rail.max[1] * 12 - 105) < 1e-9 && rail.min[1] * 12 >= 103.5));
  assert.ok(Math.abs(rails[0].max[0] - rails[1].min[0]) < 1e-9, 'Back and east top rails meet with no horizontal gap');
  const joinParts = boxParts(model, enclosure).map(bounds);
  for (const root of model.roots.filter((root) => root !== enclosure && root.name !== 'Mudroom garage entry door')) {
    assert.ok(Math.abs(bounds(root).max[1] * 12 - 105) < 1e-9, `${root.name} keeps the same top height`);
    assert.ok(boxParts(model, root).some((part) => {
      const b = bounds(part);
      return joinParts.some((joint) => {
        const overlaps = b.max.map((max, axis) => Math.min(max, joint.max[axis]) - Math.max(b.min[axis], joint.min[axis]));
        return overlaps.every((value) => value >= -1e-6) && overlaps.some((value) => Math.abs(value) <= 1e-6);
      });
    }), `${root.name} actually touches the shared enclosure, not merely matching its color`);
  }
});

test('arrival-wall shelves hold ten removable baskets clear of the fixed kitchen casing and arrival allowance', () => {
  const model = buildMudroom();
  const tower = model.find('Mudroom arrival-wall basket shelves')[0];
  const b = bounds(tower);
  assert.ok(Math.abs((b.max[2] - b.min[2]) * 12 - 24) < 1e-9);
  assert.ok(Math.abs((b.max[0] - b.min[0]) * 12 - 12) < 1e-9);
  assert.ok(b.max[2] < 21.675 - (3.5 + 0.125) / 12, 'Relocated shelves finish north of the kitchen casing');
  assert.ok(Math.abs(b.min[2] - 18.9) < 1e-9 && Math.abs(b.max[2] - 20.9) < 1e-9, 'Baskets move to the other side of the kitchen opening');
  assert.ok(Math.abs(b.max[0] - 38.675) < 1e-9, 'Case depth remains twelve inches');
  assert.equal(model.find('Arrival basket fixed shelf').length, 6);
  assert.equal(model.find('Arrival basket center divider').length, 5);
  assert.equal(model.find('Removable arrival-wall basket').length, 10);
  const benchBounds = bounds(model.find('Five-cubby mudroom bench')[0]);
  for (const basket of model.find('Removable arrival-wall basket')) {
    assert.equal(basket.userData.purchasedSeparately, true);
    const basketBounds = bounds(basket);
    assert.ok(basketBounds.min[0] >= b.min[0] && basketBounds.max[0] <= b.max[0], 'Basket including woven ribs stays within shelf depth');
    assert.ok(Math.abs((basketBounds.max[0] - basketBounds.min[0]) * 12 - 10) < 1e-9, 'Actual basket depth, including rims, is ten inches');
    assert.ok(Math.abs((basketBounds.max[2] - basketBounds.min[2]) * 12 - 9) < 1e-9);
    assert.ok((benchBounds.min[0] - basketBounds.max[0] - 10 / 12) * 12 >= 40, 'A conceptual ten-inch straight basket withdrawal retains at least forty inches to the bench, excluding the user');
  }
  assert.match(tower.userData.highStorage, /safe access.*unverified/);
  assert.equal(model.find('Mudroom label: Safe high access required').length, 1);
  for (const divider of model.find('Arrival basket center divider')) {
    assert.equal(divider.w * 12, 0.75);
    assert.equal(divider.position.x, 0);
    const b = bounds(divider);
    for (const basket of model.find('Removable arrival-wall basket')) {
      const bb = bounds(basket);
      assert.ok(b.max.some((value, axis) => value <= bb.min[axis] + 1e-9 || b.min[axis] >= bb.max[axis] - 1e-9), 'Divider clears both removable baskets');
    }
  }
});

test('matching return physically connects the basket tower and north enclosure at every shelf level', () => {
  const model = buildMudroom();
  const connector = model.find('Mudroom basket built-in return')[0];
  const b = bounds(connector);
  assert.ok(Math.abs((b.max[2] - b.min[2]) * 12 - 16.32) < 1e-9);
  assert.ok(Math.abs((b.max[0] - b.min[0]) * 12 - 12) < 1e-9);
  assert.ok(Math.abs(b.max[1] * 12 - 105) < 1e-9);
  assert.equal(connector.userData.addedBasketCount, 0);
  assert.equal(connector.userData.capacityVerified, false);
  assert.equal(model.find('Continuous mudroom built-in enclosure')[0].userData.basketReturnConnected, true);
  const basket = model.find('Mudroom arrival-wall basket shelves')[0];
  const northParts = boxParts(model, model.find('Mudroom enclosed corner return')[0]).map(bounds);
  const basketParts = boxParts(model, basket).map(bounds);
  const touches = (a, b) => {
    const overlaps = a.max.map((value, axis) => Math.min(value, b.max[axis]) - Math.max(a.min[axis], b.min[axis]));
    return overlaps.every((value) => value >= -1e-8) && overlaps.some((value) => Math.abs(value) < 1e-8);
  };
  const shelves = model.find('Basket return connecting shelf');
  assert.equal(shelves.length, 6);
  for (const shelf of shelves) {
    const s = bounds(shelf);
    assert.ok(northParts.some((part) => touches(s, part)), 'Connecting shelf meets actual north-case geometry, not its empty bounding box');
    assert.ok(basketParts.some((part) => touches(s, part)), 'Connecting shelf meets actual basket-side geometry');
    assert.ok(Math.abs(s.max[0] - bounds(basket).max[0]) < 1e-9, 'Fronts align on the twelve-inch depth line');
  }
  assert.equal(model.find('Mudroom continuous recessed plinth').length, 2);
  assert.equal(model.find('Removable arrival-wall basket').length, 10);
});

test('scribed backs and ends close every perimeter gap and fitted top infills meet the ceiling', () => {
  const model = buildMudroom();
  const west = 37.675, east = 44.9 - 2 / 12 - 0.175, north = 15.175, south = 26.725;
  const enclos = model.find('Continuous mudroom built-in enclosure')[0];
  assert.equal(enclos.userData.wallFitted, true);
  assert.equal(enclos.userData.fittedTopInches, 108);
  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} meets ${b} without an open strip`);
  const rear = bounds(model.find('Mudroom north wall scribe')[0]);
  near(rear.min[0], west); near(rear.max[0], east); near(rear.min[2], north);
  near(rear.max[2], 15.4);
  near((rear.max[2] - rear.min[2]) * 12, 2.7);
  const left = bounds(model.find('Mudroom west wall scribe')[0]);
  near(left.min[0], west); near(left.max[0], 37.825); near(left.min[2], rear.max[2]);
  const right = bounds(model.find('Mudroom east wall scribe')[0]);
  near(right.max[0], east);
  near(right.min[0], bounds(model.find('Continuous mudroom cubby backing')[0]).max[0]);
  const end = bounds(model.find('Mudroom cubby end scribe')[0]);
  near(end.max[2], south); near(end.min[2], bounds(model.find('Five-cubby mudroom bench')[0]).max[2]);
  near(end.max[0], east); near(end.min[0], bounds(model.find('Mudroom light stone bench seat')[0]).min[0]);
  for (const name of ['Mudroom north wall scribe', 'Mudroom west wall scribe', 'Mudroom east wall scribe', 'Mudroom cubby end scribe']) {
    const part = model.find(name)[0], b = bounds(part);
    near(b.min[1], 0.0405); near(b.max[1], 8.75);
    assert.equal(part.userData.countedAsStorage, false);
  }
  for (const name of ['Mudroom north ceiling infill', 'Mudroom west ceiling infill', 'Mudroom east ceiling infill']) {
    const b = bounds(model.find(name)[0]);
    near(b.min[1], 8.75); near(b.max[1], 9);
    assert.ok(b.min[0] >= west - 1e-8 && b.max[0] <= east + 1e-8 && b.min[2] >= north - 1e-8 && b.max[2] <= south + 1e-8);
  }
  near(bounds(model.find('Mudroom west ceiling infill')[0]).max[2], 20.9);
  assert.equal(model.find('Removable arrival-wall basket').length, 10);
});

test('storage returns fill the former side gaps without widening the working aisle footprint', () => {
  const model = buildMudroom();
  const corner = bounds(model.find('Mudroom corner shoe tower')[0]);
  const bench = bounds(model.find('Five-cubby mudroom bench')[0]);
  assert.ok(Math.abs(corner.min[2] - 17.54) < 1e-9);
  assert.ok(Math.abs(corner.max[2] - bench.min[2]) < 1e-9);
  assert.ok(Math.abs(corner.min[0] - bench.min[0]) < 1e-9, 'New right return and cubby faces stay on the same 18-inch-deep footprint');
  assert.equal(model.find('Personal bin support shelf').length, 0);
  assert.equal(model.find('Removable accessory container').length, 0);
  assert.equal(model.find('Mudroom personal accessory drawer').length, 0);
});

test('mudroom floor uses 24 by 48 inch tile spacing with 1/16 inch matching grout, without changing other floors', () => {
  const model = buildMudroom();
  const surface = model.floorParts.find((part) => part.name === 'Mudroom tile');
  assert.deepEqual({ ...surface.userData }, { tileWidthInches: 24, tileDepthInches: 48, groutWidthInches: 1 / 16 });
  assert.equal(surface.material.name, 'mudTileFinish');
  assert.equal(surface.w, 7.4 - 2 / 12);
  assert.equal(surface.d, 11.9);
  const joints = model.floorParts.filter((part) => part.name === 'Mudroom tile grout');
  assert.equal(joints.length, 5, 'Three long joints and two cross joints, not the old eight-joint square grid');
  assert.equal(joints.filter((part) => part.w < 0.01).length, 3);
  assert.equal(joints.filter((part) => part.d < 0.01).length, 2);
  assert.ok(joints.every((part) => Math.abs(Math.min(part.w, part.d) * 12 - 1 / 16) < 1e-9 && part.material.name === 'mudGroutFinish'));
  assert.ok(joints.every((part) => part.position.y + part.h / 2 < 0.05), 'One-foot inspection grid stays above tile and grout');
  const parts = [];
  const context = {
    rest: {}, tile: { name: 'default tile' }, cream: { name: 'default grout' },
    box(parent, x, y, z, w, h, d, material) { const part = { position: { x, y, z }, w, h, d, material }; parts.push(part); return part; }
  };
  vm.runInNewContext(source.slice(source.indexOf('  function tiledFloor('), source.indexOf("  const stairs = furnishing(")), context);
  context.tiledFloor('Other room', 0, 0, 7, 11);
  assert.equal(parts[0].material.name, 'default tile');
  assert.equal(parts.length, 9, 'Other floors keep their original two-foot square grid');
  assert.ok(parts.slice(1).every((part) => Math.min(part.w, part.d) === 0.015 && part.material.name === 'default grout'));
});

test('dedicated mudroom camera is available in the toolbar and room menu', () => {
  const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
  assert.match(source, /mudroom: \{ target: \[41\.55, 2, 20\.9\]/);
  assert.equal((html.match(/data-view="mudroom"/g) || []).length, 1, 'Room note links to the mudroom camera');
  assert.match(source, /for \(const \[floor, rooms\] of \[\['ground', groundRooms\]/, 'Room menu is generated from the ground-floor rooms, including Mudroom');
});

test('enclosure inspection uses an inside-room perspective without moving outside on portrait screens', () => {
  const start = source.indexOf('    const aspect = viewport.clientWidth / viewport.clientHeight;', source.indexOf('  function setView(name) {'));
  const end = source.indexOf('    const basementCutaway', start);
  const preset = source.match(/'mudroom-storage': (\{ target: \[[^\]]+\], offset: \[[^\]]+\], span: [\d.]+ \})/);
  assert.ok(start >= 0 && end > start && preset, 'Locate the actual camera selection, framing and storage preset');
  class Vector3 {
    constructor(...values) { this.values = values; }
    set(...values) { this.values = values; }
    copy(other) { this.values = [...other.values]; return this; }
    add(other) { this.values = this.values.map((value, index) => value + other.values[index]); return this; }
    setLength() { assert.fail('Interior camera must not be pushed through the garage wall to fit the screen'); }
  }
  const makeCamera = (fov) => ({ fov, position: new Vector3(), updateProjectionMatrix() {} });
  for (const [width, height] of [[1200, 800], [420, 800]]) {
    const interior = makeCamera(85);
    const ordinary = makeCamera(38);
    const context = {
      name: 'mudroom-storage', mudroomInteriorView: true, mudroomInspectionView: true, prepElevationView: false, exteriorElevation: false,
      viewport: { clientWidth: width, clientHeight: height }, mudroomInteriorCamera: interior, perspectiveCamera: ordinary, cooktopElevationCamera: {},
      controls: { target: new Vector3(), update() {} }, camera: null,
      preset: vm.runInNewContext(`(${preset[1]})`),
      THREE: { Vector3, MathUtils: { degToRad: (value) => value * Math.PI / 180, radToDeg: (value) => value * 180 / Math.PI } }
    };
    vm.runInNewContext(source.slice(start, end), context);
    assert.equal(context.camera, interior);
    assert.ok(Math.abs(interior.position.values[0] - (41.2 - 1 / 12)) < 1e-9);
    assert.ok(Math.abs(interior.position.values[1] - 5.5) < 1e-9);
    assert.ok(Math.abs(interior.position.values[2] - 26.25) < 1e-9, 'Camera stays inside the garage-entry wall');
    assert.ok(Math.abs(Math.tan(interior.fov * Math.PI / 360) * Math.min(width / height, 1) - Math.tan(85 * Math.PI / 360)) < 1e-9);
    assert.equal(ordinary.fov, 38, 'Other room cameras retain their original field of view');
  }
});

test('all three mudroom views have tour starts clear of the actual enclosure parts', () => {
  const start = source.indexOf('    const starts = {', source.indexOf('  function startWalking('));
  const end = source.indexOf('\n    };', start);
  assert.ok(start >= 0 && end > start);
  const starts = vm.runInNewContext(`(() => { ${source.slice(start, end + 7)} return starts; })()`, {
    upstairs: { start: [16, 23] }, cooktopCenterZ: 16.95, kitchenCenterZ: 16.95, prepCounterZ: 9
  });
  const model = buildMudroom();
  const parts = model.all.filter((part) => part.w !== undefined).map(bounds).filter((b) => b.max[1] > 0.5 && b.min[1] < 5.4);
  for (const name of ['mudroom', 'mudroom-cubbies', 'mudroom-storage']) {
    const coordinates = starts[name];
    assert.equal(coordinates?.length, 4, `${name} has a tour start and look target`);
    assert.ok(coordinates.every(Number.isFinite));
    const [x, z] = coordinates;
    assert.ok(x >= 38.9 && x <= 42.9 && z >= 22 && z <= 26, 'Tour starts in the clear arrival zone');
    for (const b of parts) {
      const dx = Math.max(b.min[0] - x, 0, x - b.max[0]);
      const dz = Math.max(b.min[2] - z, 0, z - b.max[2]);
      assert.ok(dx * dx + dz * dz >= 0.25, 'Actual case parts leave room for the half-foot tour radius');
    }
  }
});
