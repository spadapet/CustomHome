'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

function buildPrepCounter() {
  class Group {
    constructor() {
      this.children = [];
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = { x: 0, y: 0, z: 0 };
      this.scale = { x: 1, y: 1, z: 1 };
      this.userData = {};
    }
    add(child) { child.parent = this; this.children.push(child); }
  }
  const roots = [], parts = [], drawerBanks = [];
  const context = {
    THREE: { Group, MeshStandardMaterial: class {} },
    prepSinkX: 47.4, prepCounterZ: 8.25, kitchenWindowWallZ: 7, rest: new Group(),
    ...Object.fromEntries(['cabinetFinish', 'cabinetPanelFinish', 'cabinetRailFinish', 'countertop', 'steel', 'black', 'brass', 'porcelain'].map(name => [name, { name }])),
    furnishing(name, x, z) {
      const group = new Group();
      group.name = name;
      group.position.set(x, 0, z);
      roots.push(group);
      return group;
    },
    box(parent, x, y, z, w, h, d, material) {
      assert.ok(material);
      const part = new Group();
      Object.assign(part, { w, h, d, material });
      part.position.set(x, y, z);
      parent.add(part);
      parts.push(part);
      return part;
    },
    cylinder(parent, x, y, z, r, h, material) { return context.box(parent, x, y, z, r * 2, h, r * 2, material); },
    drawerFront(...args) { drawerBanks.push(args); },
    mat() { return {}; }
  };
  const helpersStart = source.indexOf('  function shakerFront(');
  const helpersEnd = source.indexOf('  function cabinetCupPull(', helpersStart);
  const start = source.indexOf('  function cabinet(');
  const end = source.indexOf('  for (const x of prepWindowCenters)', start);
  assert.ok(helpersStart >= 0 && helpersEnd > helpersStart && start >= 0 && end > start);
  vm.runInNewContext(source.slice(helpersStart, helpersEnd) + source.slice(start, end), context);
  const specsStart = source.indexOf('  const prepCounterAppliances =');
  const specsEnd = source.indexOf('  const prepShelfStart =', specsStart);
  assert.ok(specsStart >= 0 && specsEnd > specsStart);
  vm.runInNewContext(source.slice(specsStart, specsEnd) + '\nglobalThis.specs = prepApplianceSpecs;', context);
  const descendants = node => [node, ...node.children.flatMap(descendants)];
  const all = [...roots, context.rest].flatMap(descendants);
  return { parts, drawerBanks, specs: context.specs, find: name => all.filter(part => part.name === name) };
}

function bounds(part) {
  const position = { x: 0, y: 0, z: 0 };
  for (let node = part; node; node = node.parent) for (const axis of ['x', 'y', 'z']) position[axis] += node.position[axis];
  return { minX: position.x - part.w / 2, maxX: position.x + part.w / 2, minY: position.y - part.h / 2, maxY: position.y + part.h / 2, minZ: position.z - part.d / 2, maxZ: position.z + part.d / 2 };
}

test('prep cooktop is removed while the continuous left quartz counter and main cooktop remain', () => {
  const model = buildPrepCounter();
  for (const name of ['Prep 12 inch induction cooktop', 'Prep induction glass surface', 'Prep induction cooking zone', 'Prep induction touch control']) assert.equal(model.find(name).length, 0);
  const slabs = model.parts.filter(part => part.parent.name === 'Prep kitchen cabinetry' && part.material.name === 'countertop' && part.position.y === 2.97 && part.position.x < 45.9);
  assert.equal(slabs.length, 1, 'Keep one uninterrupted left prep worktop');
  const b = bounds(slabs[0]);
  for (const [actual, expected] of [[b.minX, 40.82], [b.maxX, 45.93], [b.minZ, 7.225], [b.maxZ, 9.275], [b.maxY, 3.04]]) assert.ok(Math.abs(actual - expected) < 1e-9);
  assert.doesNotMatch(source, /\bprepInduction\b/);
  assert.match(source, /cooktop\.name = '36 inch induction cooktop'/, 'Keep the separate main-kitchen cooktop');
});

test('prep sage tile contrasts with quartz without changing the backsplash envelope', () => {
  const model = buildPrepCounter();
  assert.equal(model.find('Prep quartz backsplash').length, 0);
  const backing = bounds(model.find('Prep backsplash warm-gray grout backing')[0]);
  const tiles = model.find('Prep sage running-bond backsplash tile');
  assert.equal(tiles.length, 67);
  for (const tile of tiles) {
    const b = bounds(tile);
    assert.equal(tile.material.name, 'Prep muted deep sage ceramic tile');
    assert.ok(b.minX > backing.minX && b.maxX < backing.maxX);
    assert.ok(b.minY > 3.04 && b.maxY < 3.86);
    assert.ok(Math.abs(b.minZ - backing.maxZ) < 1e-9, 'Tile meets the grout backing');
    assert.ok(Math.abs(b.maxZ - 7.26) < 1e-9, 'Original appliance alignment face is unchanged');
  }
  assert.equal(new Set(tiles.map(tile => tile.position.y)).size, 3);
  for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) {
    const a = bounds(tiles[i]), b = bounds(tiles[j]);
    assert.ok(a.maxX <= b.minX || b.maxX <= a.minX || a.maxY <= b.minY || b.maxY <= a.minY, 'Tiles have open grout joints, not overlaps');
  }
});

test('18-inch dishwasher replaces cabinet volume beside the sink under a continuous counter', () => {
  const model = buildPrepCounter();
  const dishwasher = model.find('Prep 18 inch integrated dishwasher')[0];
  const body = bounds(model.find('Prep dishwasher appliance body')[0]);
  assert.equal(dishwasher.position.x, 49.65);
  assert.equal(dishwasher.userData.nominalWidthInches, 18);
  assert.equal(dishwasher.userData.panelReady, true);
  assert.equal(dishwasher.userData.installationVerified, false);
  assert.ok(body.minX > 48.9 && body.maxX < 50.4);
  assert.ok(body.maxY < 2.9, 'Appliance clears the quartz underside');
  const fronts = model.find('Prep dishwasher integrated Shaker door');
  assert.equal(fronts.length, 1);
  assert.equal(fronts[0].userData.finish, 'Stained white oak');
  assert.ok(fronts[0].children.some(part => part.name === 'Gold cabinet pull'));
  for (const part of model.parts.filter(part => part.material.name === 'cabinetFinish' && part.parent !== fronts[0])) {
    const b = bounds(part);
    assert.ok(!(b.minX < body.maxX && b.maxX > body.minX && b.minY < body.maxY && b.maxY > body.minY && b.minZ < body.maxZ && b.maxZ > body.minZ), 'No original solid cabinet remains inside the dishwasher bay');
  }
  const slabs = model.parts.filter(part => part.material.name === 'countertop' && part.position.y === 2.97 && part.d === 2.05).map(bounds).filter(b => b.minX > 48.8).sort((a, b) => a.minX - b.minX);
  assert.ok(Math.abs(slabs[0].minX - 48.87) < 1e-9);
  assert.ok(Math.abs(slabs[0].maxX - slabs[1].minX) < 1e-9, 'Counter bridge meets the remaining cabinet slab without a gap or overlap');
  assert.ok(Math.abs(slabs[1].maxX - 52.38) < 1e-9);
  assert.equal(model.find('Prep counter extension with six drawers')[0].userData.drawers, 6);
  assert.equal(model.drawerBanks.length, 2);
});

test('all four countertop appliances remain at original sizes in a two-inch-spaced right-hand row', () => {
  const { specs } = buildPrepCounter();
  assert.equal(specs.length, 4);
  const intervals = specs.map(([name, x, width, depth, height]) => ({ name, left: x - width / 24, right: x + width / 24, width, depth, height }));
  assert.ok(Math.abs(intervals[0].left - 50.3) < 1e-9);
  assert.ok(Math.abs(intervals[3].right - 54.925) < 1e-9);
  for (let i = 1; i < intervals.length; i++) assert.ok(Math.abs((intervals[i].left - intervals[i - 1].right) * 12 - 2) < 1e-9);
  assert.deepEqual(Array.from(specs, spec => Array.from(spec.slice(2))), [[12.6, 16.8, 16.8], [8.1, 10.5, 18.1], [12, 14.4, 12.6], [16.8, 15.6, 13.2]]);
});

test('the appliance row aligns at the backsplash and the mixer clears the narrower window bank', () => {
  const model = buildPrepCounter();
  const mixer = model.find('Prep stand mixer')[0];
  assert.ok(Math.abs(mixer.position.z - 7.96) < 1e-9);
  for (const name of ['Mixer pedestal', 'Mixer motor head']) assert.ok(bounds(model.find(name)[0]).minX > 49.9 + 0.4, 'Tall mixer parts clear the picture-window casing and sill');
  const foot = bounds(model.find('Stand mixer foot')[0]);
  assert.ok(foot.minZ > 7.225 && foot.maxZ < 9.275, 'Mixer remains within the worktop');
});

test('prep picture window centers on the sink and the operable end window centers in the aisle', () => {
  const frames = [];
  const context = {
    casingSideWidth: 3.5 / 12, casingReveal: 0.125 / 12, rest: {}, garageClerestories: [],
    windowFrame(...args) { frames.push(args); }
  };
  const start = source.indexOf('  const kitchenWallLeft =');
  const end = source.indexOf('  const kidsRoomNorthZ =', start);
  const framesStart = source.indexOf('  for (const x of prepWindowCenters)');
  const framesEnd = source.indexOf('  const prepTower =', framesStart);
  assert.ok(start >= 0 && end > start && framesStart >= 0 && framesEnd > framesStart);
  vm.runInNewContext(source.slice(start, end) + source.slice(framesStart, framesEnd), context);
  assert.equal(frames.length, 2);
  const [picture, casement] = frames;
  assert.equal(picture[0], 'Prep sink picture window');
  assert.equal(picture[1], 47.4);
  assert.equal(picture[3] * 12, 60);
  assert.equal(picture[9].picture, true, 'One uninterrupted pane, not two casements with a center rail');
  assert.equal(casement[0], 'Prep end-wall window');
  assert.equal(casement[3] * 12, 24);
  assert.equal(casement[9], undefined, 'End window retains the default casement operation');
  assert.ok(Math.abs(casement[2] - (9.275 + 13.825) / 2) < 1e-9);
  for (const frame of frames) {
    assert.equal(frame[5] * 12, 51);
    assert.equal((frame[5] + frame[4]) * 12, 93, 'Matching heads preserve ceiling and faucet clearance');
  }
  const plan = require('../floor-plan-ground.js').getGroundFloorDefaultPlan();
  for (const [name, frame, coordinate] of [['Prep north', picture, 1], ['Prep east', casement, 2]]) {
    const wall = plan.walls.find(([label]) => label === name);
    assert.equal(wall[5].length, 1);
    const [a, b, sill, head] = wall[5][0];
    assert.ok(Math.abs((a + b) / 2 + wall[coordinate] - frame[coordinate]) < 1e-9);
    assert.ok(Math.abs(b - a - frame[3]) < 1e-9);
    assert.equal(sill, frame[5]);
    assert.equal(head, frame[5] + frame[4]);
  }
});

test('exterior prep openings match the furnished windows and the picture pane has no center bar', () => {
  const exterior = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  const walls = [];
  const context = {
    garageSideDoorCenterZ: 45.5, garageSideDoorWidth: 3, garageFloorY: -1.25, garageClerestories: [],
    win: (center, width, sill, height) => ({ center, width, sill, height }),
    wall(...args) { walls.push(args); }
  };
  const rear = exterior.match(/^  wall\('kitchen and prep rear'.+$/m);
  const sideStart = exterior.indexOf('  const garageSideWall =');
  const sideEnd = exterior.indexOf('  const garageSideDoor =', sideStart);
  assert.ok(rear && sideStart >= 0 && sideEnd > sideStart);
  vm.runInNewContext(rear[0] + exterior.slice(sideStart, sideEnd), context);
  const picture = walls[0][7][0];
  const casement = walls[1][7][1];
  assert.equal(walls[0][7].length, 4, 'One prep picture plus the three unchanged main-kitchen windows');
  assert.equal(55.5 - picture.center, 47.4);
  assert.equal(picture.width, 5);
  assert.equal(picture.picture, true);
  assert.ok(Math.abs(49 - casement.center - 11.55) < 1e-9);
  const parts = [];
  class Group {
    constructor() { this.userData = {}; this.position = { set() {} }; }
    add() {}
  }
  const helperStart = exterior.indexOf('  function windowUnit(');
  const helperEnd = exterior.indexOf('  function wall(', helperStart);
  assert.ok(helperStart >= 0 && helperEnd > helperStart);
  vm.runInNewContext(exterior.slice(helperStart, helperEnd) + '\nwindowUnit(new THREE.Group(), 8.1, 4.25, 5, 3.5, false, true);', {
    THREE: { Group }, glass: {}, privacyGlass: {}, windowBlack: {},
    box(parent, x, y, z, w, h, d) { const part = { x, y, z, w, h, d }; parts.push(part); return part; }
  });
  assert.equal(parts.filter(part => part.x === 0 && part.w === 0.1 && part.h === 3.5 && part.d === 0.08).length, 0, 'Exterior picture glazing is uninterrupted too');
});
