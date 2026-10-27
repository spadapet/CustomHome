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
  const end = source.indexOf('  const prepWindowBank =', start);
  assert.ok(helpersStart >= 0 && helpersEnd > helpersStart && start >= 0 && end > start);
  vm.runInNewContext(source.slice(helpersStart, helpersEnd) + source.slice(start, end), context);
  const towerStart = source.indexOf('  const prepTower =');
  const towerEnd = source.indexOf('  const prepCounterAppliances =', towerStart);
  vm.runInNewContext(source.slice(towerStart, towerEnd), context);
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

test('prep backsplash matches the countertop quartz without changing its envelope', () => {
  const model = buildPrepCounter();
  const backsplash = model.find('Prep quartz backsplash');
  assert.equal(backsplash.length, 1);
  assert.equal(backsplash[0].material, model.find('Prep continuous left quartz counter')[0].material);
  const b = bounds(backsplash[0]);
  for (const [actual, expected] of [[b.minX, 40.85], [b.maxX, 55.2], [b.minY, 3.04], [b.maxY, 3.04 + 4 / 12], [b.minZ, 7.18], [b.maxZ, 7.26]]) assert.ok(Math.abs(actual - expected) < 1e-9);
  assert.equal(model.find('Prep sage running-bond backsplash tile').length, 0);
  assert.equal(model.find('Prep backsplash warm-gray grout backing').length, 0);
});

test('18-inch dishwasher replaces cabinet volume beside the sink under a continuous counter', () => {
  const model = buildPrepCounter();
  const dishwasher = model.find('Prep 18 inch integrated dishwasher')[0];
  const body = bounds(model.find('Prep dishwasher appliance body')[0]);
  assert.equal(dishwasher.position.x, 49.65);
  assert.equal(dishwasher.userData.nominalWidthInches, 18);
  assert.equal(dishwasher.userData.panelReady, false);
  assert.equal(dishwasher.userData.installationVerified, false);
  assert.ok(body.minX > 48.9 && body.maxX < 50.4);
  assert.ok(body.maxY < 2.9, 'Appliance clears the quartz underside');
  const fronts = model.find('Prep dishwasher exposed stainless door');
  assert.equal(fronts.length, 1);
  assert.equal(fronts[0].material.name, 'steel');
  assert.ok(fronts[0].children.some(part => part.name === 'Prep dishwasher stainless handle'));
  assert.equal(model.find('Prep dishwasher integrated Shaker door').length, 0);
  for (const part of model.parts.filter(part => part.material.name === 'cabinetFinish' && part.parent !== fronts[0])) {
    const b = bounds(part);
    assert.ok(!(b.minX < body.maxX && b.maxX > body.minX && b.minY < body.maxY && b.maxY > body.minY && b.minZ < body.maxZ && b.maxZ > body.minZ), 'No original solid cabinet remains inside the dishwasher bay');
  }
  const slabs = model.parts.filter(part => part.material.name === 'countertop' && part.position.y === 2.97 && part.d === 2.05).map(bounds).filter(b => b.minX > 48.8).sort((a, b) => a.minX - b.minX);
  assert.ok(Math.abs(slabs[0].minX - 48.87) < 1e-9);
  assert.ok(Math.abs(slabs[0].maxX - slabs[1].minX) < 1e-9, 'Counter bridge meets the remaining cabinet slab without a gap or overlap');
  assert.ok(Math.abs(slabs[1].maxX - 52.4) < 1e-9);
  assert.ok(Math.abs(slabs[1].maxX - slabs[2].minX) < 1e-9);
  assert.equal(model.find('Prep counter extension with six drawers')[0].userData.drawers, 6);
  assert.equal(model.drawerBanks.length, 2);
});

test('prep uses common cabinet widths with separate fillers and a visible toaster clear of sink and landing', () => {
  const model = buildPrepCounter();
  const bodies = model.parts.filter(part => part.parent.name === 'Prep kitchen cabinetry' && part.userData.nominalWidthInches);
  assert.deepEqual(bodies.map(part => part.userData.nominalWidthInches), [30, 30, 24]);
  for (const body of bodies) {
    assert.equal(body.d * 12, 24);
    assert.equal(body.h * 12, 34.5);
  }
  assert.equal(model.find('Prep counter extension with six drawers')[0].userData.widthInches, 33);
  const toaster = bounds(model.find('Prep toaster stainless body')[0]);
  assert.ok(Math.abs(toaster.minY - 3.04) < 1e-9);
  assert.ok(toaster.maxX < 45.9, 'Toaster stays left of sink');
  assert.ok((toaster.minX - 40.85) * 12 > 41, 'Keep over 41 inches of clear left landing/prep counter');
  assert.equal(model.find('Prep toaster bread slot').length, 2);
});

test('lowered appliance openings and storage fronts follow the reachable appliance heights', () => {
  const model = buildPrepCounter();
  const tower = model.find('Prep microwave and wall oven tower')[0];
  assert.equal(tower.userData.widthInches, 33);
  assert.equal(tower.userData.depthInches, 24);
  assert.equal(tower.userData.heightInches, 96);
  assert.equal(bounds(model.find('Prep appliance tower cornice')[0]).maxY * 12, 96);
  const envelope = bounds(model.find('Prep combination appliance envelope')[0]);
  assert.equal(envelope.minY * 12, 12);
  assert.equal(envelope.maxY * 12, 60);
  const controls = bounds(model.find('Prep combination appliance controls')[0]);
  assert.ok(controls.maxY * 12 < 60);
  const shelves = model.find('Prep appliance support shelf').map(bounds);
  assert.ok(shelves.some(b => Math.abs(b.maxY - envelope.minY) < 1e-9));
  assert.ok(shelves.some(b => Math.abs(b.minY - envelope.maxY) < 1e-9));
  for (const front of tower.children.filter(part => part.userData.cabinetFront)) {
    const minY = front.position.y - front.userData.height / 2;
    const maxY = front.position.y + front.userData.height / 2;
    assert.ok(maxY <= envelope.minY || minY >= envelope.maxY, 'Storage does not cover the lowered appliances');
  }
  assert.match(source, /const steamOvenBottom = 2\.5;/);
  assert.match(source, /const steamOvenTop = 4\.5;/);
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

test('the appliance row moves forward to clear the taller window trim and stays on the worktop', () => {
  const model = buildPrepCounter();
  const mixer = model.find('Prep stand mixer')[0];
  assert.ok(Math.abs(mixer.position.z - 8.125) < 1e-9);
  assert.ok(7.425 > 7 + 0.2 + 0.0625 + 0.25 / 2, 'Appliance envelopes clear the widest projecting window sill');
  const foot = bounds(model.find('Stand mixer foot')[0]);
  assert.ok(foot.minZ > 7.225 && foot.maxZ < 9.275, 'Mixer remains within the worktop');
});

test('prep adds two standard tall casements and uses the tallest fitting standard heights', () => {
  const frames = [];
  const casings = [];
  const context = {
    casingSideWidth: 3.5 / 12, casingReveal: 0.125 / 12, rest: { add() {} }, garageClerestories: [], ...require('../floor-plan-ground.js'),
    THREE: { Group: class { constructor() { this.userData = {}; this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } }; } } },
    windowFrame(...args) { frames.push(args); return { userData: {} }; },
    openingCasing(...args) { casings.push(args); }
  };
  const start = source.indexOf('  const kitchenWallLeft =');
  context.getKitchenWindowBankLayout = require('../floor-plan-ground.js').getKitchenWindowBankLayout;
  const end = source.indexOf('  const kidsRoomNorthZ =', start);
  const framesStart = source.indexOf('  const prepWindowBank =');
  const framesEnd = source.indexOf('  const prepTower =', framesStart);
  assert.ok(start >= 0 && end > start && framesStart >= 0 && framesEnd > framesStart);
  vm.runInNewContext(source.slice(start, end) + source.slice(framesStart, framesEnd), context);
  assert.equal(frames.length, 4);
  const [left, picture, right, casement] = frames;
  assert.equal(picture[0], 'Prep sink picture window');
  assert.equal(picture[1] + picture[7].position.x, 47.4);
  assert.equal(picture[3] * 12, 59.5);
  assert.equal(picture[9].picture, true, 'One uninterrupted pane, not two casements with a center rail');
  assert.equal(casement[0], 'Prep end-wall window');
  assert.equal(casement[3] * 12, 23.5);
  assert.equal(casement[4] * 12, 71.5);
  assert.equal(casement[9].standardSizeCode, '2060');
  assert.equal(left[9].standardSizeCode, '2050');
  assert.equal(right[9].standardSizeCode, '2050');
  assert.equal(picture[9].standardSizeCode, '5050');
  assert.equal(casings.length, 1, 'One perimeter casing and sill, not separate trim on each unit');
  assert.ok(Math.abs(casings[0][3] * 12 - 106.5) < 1e-9);
  for (const frame of [left, picture, right]) assert.equal(frame[9].casing, false);
  assert.ok(Math.abs(left[1] + left[3] / 2 - (picture[1] - picture[3] / 2)) < 1e-9, 'Left frames join without a wall pier');
  assert.ok(Math.abs(picture[1] + picture[3] / 2 - (right[1] - right[3] / 2)) < 1e-9, 'Right frames join without a wall pier');
  assert.ok(Math.abs(casement[2] - (9.275 + 13.825) / 2) < 1e-9);
  for (const frame of frames) {
    assert.ok(Math.abs((frame[5] + frame[4]) * 12 - 100.75) < 1e-9);
    const capTop = (frame[5] + frame[4]) * 12 + 0.125 + 5.5 + 1;
    assert.ok(capTop < 108, 'Projecting Craftsman cap stays below ceiling');
    if (frame !== casement) {
      assert.equal(frame[4] * 12, 59.5);
      assert.equal(frame[5] * 12, 41.25);
      assert.ok(frame[5] - 0.75 / 12 > 3.04 + 4 / 12, 'Sill clears the reduced matching quartz backsplash');
      assert.ok(capTop + 6 > 108, 'Next standard six-inch height increment cannot fit over the retained worktop');
    }
  }
  const plan = require('../floor-plan-ground.js').getGroundFloorDefaultPlan();
  const bank = context.getPrepWindowBankLayout();
  const bankWall = plan.walls.find(([label]) => label === 'Prep north');
  assert.equal(bankWall[5].length, 1, 'One structural opening for the three-unit bank');
  assert.ok(Math.abs((bankWall[5][0][1] - bankWall[5][0][0]) * 12 - 107) < 1e-9);
  assert.ok(Math.abs((bankWall[5][0][0] + bankWall[5][0][1]) / 2 + 37.5 - bank.x) < 1e-9);
  for (const [name, frame, coordinate, index] of [['Prep east', casement, 2, 0]]) {
    const wall = plan.walls.find(([label]) => label === name);
    assert.equal(wall[5].length, 1);
    const [a, b, sill, head] = wall[5][index];
    assert.ok(Math.abs((a + b) / 2 + wall[coordinate] - frame[coordinate]) < 1e-9);
    assert.ok(Math.abs(b - a - frame[3] - 0.5 / 12) < 1e-9);
    assert.ok(Math.abs(sill + 0.25 / 12 - frame[5]) < 1e-9);
    assert.ok(Math.abs(head - 0.25 / 12 - frame[5] - frame[4]) < 1e-9);
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
  context.getPrepWindowLayout = require('../floor-plan-ground.js').getPrepWindowLayout;
  context.getPrepWindowBankLayout = require('../floor-plan-ground.js').getPrepWindowBankLayout;
  context.getKitchenWindowBankLayout = require('../floor-plan-ground.js').getKitchenWindowBankLayout;
  const rear = exterior.match(/^  wall\('kitchen and prep rear'.+$/m);
  const sideStart = exterior.indexOf('  const garageSideWall =');
  const sideEnd = exterior.indexOf('  const garageSideDoor =', sideStart);
  assert.ok(rear && sideStart >= 0 && sideEnd > sideStart);
  vm.runInNewContext(rear[0] + exterior.slice(sideStart, sideEnd), context);
  const bank = walls[0][7][0];
  const picture = bank.units[1];
  const casement = walls[1][7][1];
  assert.equal(walls[0][7].length, 2, 'Joined prep and main-kitchen banks each use one wall opening');
  assert.equal(walls[0][7][1].units.length, 3);
  assert.equal(walls[0][7][1].trimLabel, 'Kitchen');
  assert.equal(55.5 - bank.center, 47.4);
  assert.ok(Math.abs(bank.width * 12 - 107) < 1e-9);
  assert.equal(bank.units.length, 3);
  assert.equal(picture.picture, true);
  assert.equal(picture.width * 12, 59.5);
  assert.equal(picture.height * 12, 59.5);
  assert.equal(casement.frameHeight * 12, 71.5);
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
    getWindowProductIntent: require('../floor-plan-ground.js').getWindowProductIntent,
    THREE: { Group }, glass: {}, privacyGlass: {}, windowBlack: {}, trim: {},
    box(parent, x, y, z, w, h, d) { const part = { x, y, z, w, h, d }; parts.push(part); return part; }
  });
  assert.equal(parts.filter(part => part.x === 0 && part.w === 0.1 && part.h === 3.5 && part.d === 0.08).length, 0, 'Exterior picture glazing is uninterrupted too');
});
