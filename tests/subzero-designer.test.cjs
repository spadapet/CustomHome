'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ground = require('../assets/js/floor-plan-ground.js');
const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');

function buildBank() {
  class Group {
    constructor() {
      this.children = []; this.userData = {}; this.rotation = { y: 0 };
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    }
    add(child) { child.parent = this; this.children.push(child); }
  }
  const kitchen = new Group();
  const context = {
    THREE: { Group }, kitchen, ceilingHeight: 9,
    kitchenRefrigeration: ground.getKitchenRefrigerationLayout(),
    ...Object.fromEntries(['cabinetFinish', 'cabinetRailFinish', 'cabinetPanelFinish', 'brass', 'black', 'steel'].map(name => [name, { name }])),
    box(parent, x, y, z, w, h, d, material) {
      assert.ok(w > 0 && h > 0 && d > 0 && material);
      const part = new Group(); Object.assign(part, { w, h, d, material });
      part.position.set(x, y, z); parent.add(part); return part;
    },
    cylinder(parent, x, y, z, radius, height, material) {
      return context.box(parent, x, y, z, radius * 2, height, radius * 2, material);
    },
    shakerFront(parent, x, y, z, w, h, rotation = 0, depth = 0.08) {
      const front = new Group();
      front.position.set(x, y, z); front.rotation.y = rotation;
      front.userData = { width: w, height: h, style: 'Shaker' };
      parent.add(front);
      const rail = Math.min(2.25 / 12, w / 4, h / 4);
      const panelDepth = depth * 0.625;
      context.box(front, 0, 0, -(depth - panelDepth) / 2, w - 2 * rail, h - 2 * rail, panelDepth, context.cabinetPanelFinish).name = 'Shaker recessed center panel';
      for (const side of [-1, 1]) {
        context.box(front, side * (w - rail) / 2, 0, 0, rail, h, depth, context.cabinetFinish).name = 'Shaker vertical stile';
        context.box(front, 0, side * (h - rail) / 2, 0, w - 2 * rail, rail, depth, context.cabinetRailFinish).name = 'Shaker horizontal rail';
      }
      return front;
    },
    cabinetPull() {}
  };
  const start = source.indexOf('  const bottomRun =');
  const end = source.indexOf('  const island =', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  const descendants = node => [node, ...node.children.flatMap(descendants)];
  const all = descendants(kitchen);
  return { kitchen, all, find: name => all.filter(part => part.name === name) };
}

function bounds(node) {
  const result = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  function visit(part) {
    if (part.w) for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) {
      let x = dx * part.w / 2, y = dy * part.h / 2, z = dz * part.d / 2;
      for (let current = part; current; current = current.parent) {
        const angle = current.rotation.y;
        [x, z] = [x * Math.cos(angle) + z * Math.sin(angle), -x * Math.sin(angle) + z * Math.cos(angle)];
        x += current.position.x; y += current.position.y; z += current.position.z;
      }
      result.minX = Math.min(result.minX, x); result.maxX = Math.max(result.maxX, x);
      result.minY = Math.min(result.minY, y); result.maxY = Math.max(result.maxY, y);
      result.minZ = Math.min(result.minZ, z); result.maxZ = Math.max(result.maxZ, z);
    }
    part.children.forEach(visit);
  }
  visit(node); return result;
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('Designer units use cabinet-matching Shaker panels, mirrored hinges and satin-gold handles', () => {
  const bank = buildBank();
  const freezer = bank.find('Column freezer')[0], fridge = bank.find('Column fridge')[0];
  assert.ok(freezer.position.x > fridge.position.x, 'Freezer is view-left looking south from kitchen');
  close(freezer.position.x, 35.5 - 0.75 / 12); close(fridge.position.x, 29.75);
  assert.equal(freezer.userData.model, 'DEC3650FI/L');
  assert.equal(fridge.userData.model, 'DEC3650R/R');
  for (const unit of [freezer, fridge]) {
    assert.equal(unit.userData.manufacturer, 'Sub-Zero');
    assert.equal(unit.userData.productWidthInches, 36);
    assert.equal(unit.userData.wallSetbackInches, 1.5);
    assert.equal(unit.userData.inboardShiftInches, unit.name === 'Column freezer' ? 0.75 : 0);
    close(unit.position.z, 25.725 + 1.5 / 12);
    assert.equal(unit.userData.heightInches, 84);
    assert.equal(unit.userData.series, 'Designer');
    assert.equal(unit.userData.bodyDepthInches, 24);
    assert.equal(unit.userData.depthWithCustomPanelInches, 24.75);
    assert.equal(unit.userData.panelWidthInches, 35.75);
    assert.equal(unit.userData.panelHeightInches, 79.875);
    assert.equal(unit.userData.panelDepthInches, 0.75);
    assert.equal(unit.userData.panelMinimumThicknessInches, 0.625);
    assert.equal(unit.userData.panelMaximumWeightPounds, 75);
    assert.equal(unit.userData.panelRevealInches, 0.125);
    assert.equal(unit.userData.panelFinishAllSidesRequired, true);
    assert.equal(unit.userData.panelWeightVerified, false);
    assert.equal(unit.userData.panelStyle, 'Shaker with recessed center field');
    assert.equal(unit.userData.handleFinish, 'Satin gold');
    assert.equal(unit.userData.handleLengthInches, 50.125);
    assert.equal(unit.userData.handleDiameterInches, 0.75);
    assert.equal(unit.userData.handleProjectionInches, 1.75);
    assert.equal(unit.userData.doorStopDegrees, 90);
    assert.equal(unit.userData.doorClearanceAt105Inches, 34.5);
    assert.equal(unit.userData.hingeSideClearanceAt105Inches, 7.25);
    const b = bounds(unit);
    close((b.maxX - b.minX) * 12, 35.75); close(b.maxY * 12, 84);
    const sideWallFace = unit.name === 'Column freezer' ? 37.5 - 0.175 : ground.getKitchenRefrigerationLayout().returnX + 0.175;
    const sideReserveInches = (unit.name === 'Column freezer' ? sideWallFace - b.maxX : b.minX - sideWallFace) * 12;
    close(sideReserveInches, unit.name === 'Column freezer' ? 4.775 : 4.025);
    const cavity = unit.children.find(part => part.name === 'Sub-Zero Designer chassis envelope');
    const wallGapInches = (26.9 - bounds(cavity).maxZ) * 12;
    close(wallGapInches, 0.6);
    const door = unit.children.find(part => part.userData.interactiveHouseDoor);
    const leaf = door.children.find(part => part.name === 'Sub-Zero Designer custom white-oak Shaker panel');
    assert.equal(door.rotation.y, 0);
    const leafBounds = bounds(leaf);
    close((leafBounds.maxX - leafBounds.minX) * 12, 35.75);
    close((leafBounds.maxY - leafBounds.minY) * 12, 79.875);
    close((leafBounds.maxZ - leafBounds.minZ) * 12, 0.75);
    if (unit.name === 'Column fridge') {
      const fridgeBayLeft = ground.getKitchenRefrigerationLayout().runLeft + ground.getKitchenRefrigerationLayout().fridgeFillerWidth + 0.75 / 12;
      close((leafBounds.minX - fridgeBayLeft) * 12, 0.125);
      close((fridgeBayLeft + 3 - leafBounds.maxX) * 12, 0.125);
    }
    assert.equal(leaf.children.filter(part => part.name === 'Shaker recessed center panel').length, 1);
    assert.equal(leaf.children.filter(part => part.name === 'Shaker vertical stile').length, 2);
    assert.equal(leaf.children.filter(part => part.name === 'Shaker horizontal rail').length, 2);
    assert.equal(leaf.children.find(part => part.name === 'Shaker recessed center panel').material.name, 'cabinetPanelFinish');
    close(door.userData.hingeInsetInches, 1.438331642221335);
    close(door.userData.hingeProjectionInches, 0.982454679790221);
    assert.equal(door.userData.doorClearanceAt105Inches, 34.5);
    assert.equal(door.userData.hingeSideClearanceAt105Inches, 7.25);
    assert.equal(door.userData.interactiveHouseDoor.maxAngleDegrees, 90);
    assert.equal(door.userData.interactiveHouseDoor.animateOpenClose, true);
    assert.equal(door.userData.interactiveHouseDoor.animationDurationMs, 300);
    assert.equal(unit.userData.factoryMaxAngleDegrees, 105);
    const handle = bank.find('Sub-Zero tower-facing satin-gold tubular handle').find(part => part.parent === door);
    assert.ok(handle.position.x * door.position.x < 0, 'Handle is opposite its outer hinge');
    assert.equal(handle.h * 12, 50.125);
    assert.equal(handle.w * 12, 0.75);
    assert.equal(handle.material.name, 'brass');
    for (const post of door.children.filter(part => part.name === 'Sub-Zero satin-gold handle mounting post')) assert.equal(post.material.name, 'brass');
    assert.equal(unit.children.filter(part => /top grille|ventilation/i.test(part.name)).length, 0);
  }
  assert.equal(bank.find('Column ventilation grille').length, 0, 'Do not reuse integrated-column bottom ventilation');
  assert.equal(bank.find('Recessed fridge wall-clearance filler').length, 0);
  assert.equal(bank.find('Recessed freezer wall-clearance filler').length, 1);
  assert.equal(bank.find('Full-height refrigeration side panel').length, 4);
  const cornice = bank.find('Continuous refrigeration cabinet cornice')[0];
  close(bounds(cornice).minX, ground.getKitchenRefrigerationLayout().runLeft + ground.getKitchenRefrigerationLayout().fridgeFillerWidth);
  close(bounds(cornice).maxX, ground.getKitchenRefrigerationLayout().runRight);
  const uppers = bank.find('Refrigeration upper carcass');
  assert.equal(uppers.length, 3);
  assert.deepEqual(uppers.map(part => part.w * 12), [36, 36, 31.5]);
});

test('center oven and tower retain exact size, owner-reachable mounting and independent storage', () => {
  const bank = buildBank();
  const tower = bank.find('Steam oven and pantry tower')[0];
  const oven = bank.find('Steam-oven provisional envelope')[0];
  const b = bounds(oven);
  close(tower.position.x, 32.625);
  close(tower.userData.widthInches, 31.5); close(tower.userData.clearWidthInches, 30);
  close((b.maxX - b.minX) * 12, 30); close((b.maxY - b.minY) * 12, 24);
  close((b.maxZ - b.minZ) * 12, 24); close(b.minY * 12, 30);
  assert.equal(bank.find('Steam-oven compartment shelf').length, 2);
});

test('stopped door and handle sweeps clear current geometry while the hinge proxy matches the 105-degree endpoint', () => {
  const bank = buildBank();
  const returnFace = ground.getKitchenRefrigerationLayout().returnX + 0.175;
  const eastFace = 37.5 - 0.175;
  const panels = bank.find('Full-height refrigeration side panel');
  const polygon = part => [-1, 1].flatMap(dx => [-1, 1].map(dz => {
    let x = dx * part.w / 2, z = dz * part.d / 2;
    for (let current = part; current; current = current.parent) {
      const angle = current.rotation.y;
      [x, z] = [x * Math.cos(angle) + z * Math.sin(angle), -x * Math.sin(angle) + z * Math.cos(angle)];
      x += current.position.x; z += current.position.z;
    }
    return { x, z };
  }));
  const overlaps = (a, b) => {
    const points = [polygon(a), polygon(b)];
    for (const p of points) for (const edge of [1, 2]) {
      const axis = { x: p[edge].x - p[0].x, z: p[edge].z - p[0].z };
      const projections = points.map(corners => corners.map(corner => corner.x * axis.x + corner.z * axis.z));
      if (Math.min(...projections[0]) >= Math.max(...projections[1]) - 1e-9 || Math.min(...projections[1]) >= Math.max(...projections[0]) - 1e-9) return false;
    }
    return true;
  };
  const cooktopCounter = { w: 25.5 / 12, d: 108 / 12, position: { x: 37.5 - 0.175 - 25.5 / 24, z: 16.95 }, rotation: { y: 0 }, parent: null };
  for (const name of ['Column fridge', 'Column freezer']) {
    const unit = bank.find(name)[0];
    const door = unit.children.find(part => part.userData.interactiveHouseDoor);
    const leaf = door.children.find(part => part.name === 'Sub-Zero Designer custom white-oak Shaker panel');
    const leafParts = leaf.children.filter(part => part.w && part.d);
    const movingParts = [...leafParts, ...door.children.filter(item => item.w && item.d)];
    for (const panel of panels) assert.ok(bounds(panel).minZ >= bounds(leaf).maxZ - 1e-9, 'Frame fronts meet but do not overlap the closed custom panel backs');
    for (let step = 0; step <= 900; step++) {
      const degrees = step / 10;
      door.rotation.y = degrees * Math.PI / 180 * door.userData.interactiveHouseDoor.openRotationSign;
      const b = bounds(door);
      assert.ok(b.minX > returnFace && b.maxX < eastFace, `${name} at ${degrees} degrees stays between finished side walls`);
      assert.ok(b.minZ > 20.95, `${name} at ${degrees} degrees stays beyond island end, including pull`);
      for (const panel of panels) for (const part of leafParts) assert.ok(!overlaps(part, panel), `${name} at ${degrees} degrees clears recessed appliance framing`);
      for (const part of movingParts) {
        assert.ok(!overlaps(part, cooktopCounter), `${name} leaf/handle at ${degrees} degrees clears the 108-inch cooktop counter`);
      }
    }
    door.rotation.y = 105 * Math.PI / 180 * door.userData.interactiveHouseDoor.openRotationSign;
    const body = unit.children.find(part => part.name === 'Sub-Zero Designer chassis envelope');
    const openLeaf = bounds(leaf);
    const bodyBounds = bounds(body);
    close((bodyBounds.minZ - openLeaf.minZ) * 12, 34.5);
    const sideClearance = name === 'Column freezer' ? openLeaf.maxX - (unit.position.x + 1.5) : unit.position.x - 1.5 - openLeaf.minX;
    close(sideClearance * 12, 7.25);
    door.rotation.y = 0;
  }
  const fridgeDoor = bank.find('Sub-Zero Designer custom white-oak Shaker panel')[1];
  close((bounds(fridgeDoor).minZ - 20.95) * 12, 46.05);
  const handle = bank.find('Sub-Zero tower-facing satin-gold tubular handle')[1];
  close((bounds(handle).minZ - 20.95) * 12, 44.3);
});

test('interior floor transfer preserves total area and all passage, stair and garage boundaries', () => {
  const plan = ground.getGroundFloorDefaultPlan();
  const kidsArea = plan.floors.filter(part => part.room === 'Kids room').reduce((sum, part) => sum + part.w * part.d, 0);
  close(kidsArea, 125.66);
  close(plan.rooms.find(room => room.name === 'Kids room').z, 26.9, 'Latest north wall stays aligned with the refrigerator-wall return');
  close(ground.getLivableFloorArea(plan, { includeStairs: true }), 1924.3327083333334);
  assert.equal(ground.getKitchenPassageLayout().wallX, 37.5);
  assert.equal(ground.getKitchenPassageLayout().clearWidth, 2.5);
  assert.equal(plan.walls.find(([name]) => name === 'Garage west return')[1], 31.2);
  assert.deepEqual(plan.walls.find(([name]) => name === 'Kids west')[5], [[27 - plan.rooms.find(room => room.name === 'Kids room').z, 31.5 - plan.rooms.find(room => room.name === 'Kids room').z, 0, 8]]);
});
