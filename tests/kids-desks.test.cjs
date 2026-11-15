'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ground = require('../assets/js/floor-plan-ground.js');
const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
const suite = ground.getGuestSuiteLayout();
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

class Group {
  constructor() {
    this.children = []; this.userData = {};
    this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    this.rotation = { x: 0, y: 0, z: 0 };
  }
  add(child) { child.parent = this; this.children.push(child); }
}
function build() {
  const roots = [];
  const context = {
    THREE: { Group }, guestSuite: suite,
    kidsRoom: { x: 19, z: ground.getKitchenRefrigerationLayout().bodyFaceZ, width: ground.getKitchenRefrigerationLayout().returnX - 19, southWidth: 12.2 },
    kidsDoorway: { x: 19, z: 27, width: 4.5, height: 8 },
    groundFrontWallZ: ground.getGroundFrontLayout().wallZ,
    casingSideWidth: 2.5 / 12, casingReveal: 0.125 / 12,
    ...Object.fromEntries(['linen', 'cabinetFinish', 'cabinetRailFinish', 'brass', 'oak', 'cream', 'porcelain', 'black', 'windowTrim'].map(name => [name, { name }])),
    mat: color => ({ color }),
    furnishing(name, x, z, rotation = 0) {
      const g = new Group(); g.name = name; g.position.set(x, 0, z); g.rotation.y = rotation; roots.push(g); return g;
    },
    box(parent, x, y, z, w, h, d, material) {
      assert.ok(material);
      const p = new Group(); Object.assign(p, { w, h, d, material }); p.position.set(x, y, z); parent.add(p); return p;
    },
    cylinder(parent, x, y, z, r, h, material) { return context.box(parent, x, y, z, 2 * r, h, 2 * r, material); },
    singlePanelDoor(parent, x, y, z, w, h, d, material) { return context.box(parent, x, y, z, w, h, d, material); }
  };
  for (const [first, last] of [
    ['  const kidsClay =', '  const officeDeskWidth =']
  ]) {
    const start = source.indexOf(first), end = source.indexOf(last, start);
    assert.ok(start >= 0 && end > start);
    vm.runInNewContext(source.slice(start, end), context);
  }
  const descend = node => [node, ...node.children.flatMap(descend)];
  const all = roots.flatMap(descend);
  return { roots, all, find: name => all.filter(p => p.name === name), context };
}
// Constituent corner transforms, including every ancestor, not enclosing empty space.
function bounds(root) {
  const result = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  function visit(node) {
    if (node.w !== undefined) for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
      let x = dx * node.w / 2, z = dz * node.d / 2;
      for (let p = node; p; p = p.parent) {
        const c = Math.cos(p.rotation.y), s = Math.sin(p.rotation.y);
        [x, z] = [c * x + s * z + p.position.x, -s * x + c * z + p.position.z];
      }
      result.minX = Math.min(result.minX, x); result.maxX = Math.max(result.maxX, x);
      result.minZ = Math.min(result.minZ, z); result.maxZ = Math.max(result.maxZ, z);
    }
    node.children.forEach(visit);
  }
  visit(root); return result;
}
const intersects = (a, b) => Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > 1e-8 &&
  Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ) > 1e-8;

test('both full electric MITTZON desks, PC and homework activities remain with two chairs', () => {
  const m = build();
  for (const name of ['MITTZON desktop', 'MITTZON cable tray', 'MITTZON height control']) assert.equal(m.find(name).length, 2);
  for (const name of ['Kids all-in-one PC', 'All-in-one PC stand', 'Kids PC keyboard', 'Kids PC mouse', 'Homework writing mat', 'Homework notebook', 'Removable art supply caddy']) assert.equal(m.find(name).length, 1);
  assert.equal(m.find('MITTZON T foot').length, 4);
  assert.equal(m.find('Kids desk chair seat').length, 2);
  for (let i = 1; i <= 2; i++) {
    const desk = m.find(`IKEA MITTZON kids desk ${i}`)[0], b = bounds(desk);
    close((b.maxX - b.minX) * 12, 47.25); close((b.maxZ - b.minZ) * 12, 31.5);
    assert.equal(desk.userData.minHeightInches, 24.375); assert.equal(desk.userData.maxHeightInches, 49.625);
    assert.equal(desk.userData.childUseRequiresReview, true);
    assert.equal(desk.rotation.y, Math.PI);
    const top = m.find('MITTZON desktop')[i - 1];
    close((top.position.y + top.h / 2) * 12, 29.5);
    const chair = m.find(`Kids desk chair ${i}`)[0];
    close(chair.position.x, desk.position.x);
    close(chair.position.z, suite.kidsSouthZ - 0.175 - 31.5 / 12 - 0.025);
  }
});

test('south desk pair and tall bookcase fit without overlap and retain an open north route', () => {
  const m = build(), desks = [1, 2].map(i => m.find(`IKEA MITTZON kids desk ${i}`)[0]);
  const toys = m.find('Kids tall standing bookcase')[0], tb = bounds(toys);
  const furniture = [...desks, ...[1, 2].map(i => m.find(`Kids desk chair ${i}`)[0]), toys];
  for (const p of furniture) {
    const b = bounds(p);
    assert.ok(b.minX >= 19.175 && b.maxX <= 31.025 + 1e-8);
    assert.ok(b.minZ >= 26.9 && b.maxZ <= suite.kidsSouthZ - 0.175 + 1e-8);
  }
  // Tucked chairs intentionally partly tuck under desk tops at a different height.
  close(bounds(desks[0]).minX, 21.4);
  close(bounds(desks[0]).maxX, bounds(desks[1]).minX);
  close(bounds(desks[1]).maxX, 29.275);
  for (const d of desks) assert.equal(intersects(bounds(d), tb), false);
  close(tb.maxX, 30.95);
  close((tb.minX - bounds(desks[1]).maxX) * 12, 8.1);
  close(tb.minZ, 27.45); close(tb.maxZ, 29.95);
  const northRoute = { minX: 19.175, maxX: 27.8375, minZ: m.context.kidsRoom.z, maxZ: 27 };
  for (const p of furniture) assert.equal(intersects(bounds(p), northRoute), false);
  close((northRoute.maxX - northRoute.minX) * 12, 103.95);
});

test('drawer unit is removed and a full-height bookcase provides open shelving with anchorage required', () => {
  const m = build(), toy = m.find('Kids tall standing bookcase')[0], b = bounds(toy);
  assert.equal(m.find('IKEA TROFAST toy storage 1').length, 0);
  assert.equal(m.find('TROFAST removable mesh box').length, 0);
  assert.equal(toy.userData.wallAnchorageRequired, true);
  close((b.maxZ - b.minZ) * 12, 30); close((b.maxX - b.minX) * 12, 12);
  assert.equal(toy.userData.heightInches, 72); assert.equal(toy.rotation.y, -Math.PI / 2);
  assert.equal(m.find('Kids bookcase shelf').length, 6);
  assert.equal(toy.userData.upperShelvesAdultAccess, true);
});

test('blackboard has standing access on the west wall and bookcase access clears occupied desk chairs', () => {
  const m = build(), t = bounds(m.find('Kids tall standing bookcase')[0]);
  const c = bounds(m.find('Kids desk chair 2')[0]);
  const occupied = { minX: c.minX - 0.5, maxX: c.maxX + 0.5, minZ: c.minZ - 0.75 - 0.5, maxZ: c.maxZ - 0.75 + 0.5 };
  assert.equal(intersects(occupied, t), false);
  const board = m.find('Kids wall blackboard')[0], bb = bounds(board);
  assert.equal(board.userData.bottomInches, 24);
  close(bb.minZ, 26.75); close(bb.maxZ, 29.75);
  const writingZone = { minX: bb.maxX, maxX: bb.maxX + 2, minZ: bb.minZ, maxZ: bb.maxZ };
  for (const item of [t, ...[1, 2].map(i => bounds(m.find(`IKEA MITTZON kids desk ${i}`)[0]))]) assert.equal(intersects(writingZone, item), false);
  assert.equal(intersects(writingZone, occupied), false);
  const openRoute = { minX: 19.175, maxX: 21.25, minZ: 27, maxZ: 31.5 };
  assert.equal(intersects(occupied, openRoute), false);
});

test('assumed west location is solid and north entry reserves 60 x 96 without leaves or hardware', () => {
  const m = build(), plan = ground.getGroundFloorDefaultPlan();
  const west = plan.walls.find(([name]) => name === 'Kids west');
  assert.equal(west[5], undefined);
  const north = plan.walls.find(([name]) => name === 'Kids north');
  assert.deepEqual(north.slice(1, 5), [19, ground.getKitchenRefrigerationLayout().bodyFaceZ + 0.175, 28.0125, ground.getKitchenRefrigerationLayout().bodyFaceZ + 0.175]);
  assert.deepEqual(north[5], [[1.875, 6.875, 0, 8]]);
  close(north[5][0][0] * 12, 22.5);
  close((north[3] - north[1] - north[5][0][1]) * 12, 25.65);
  assert.equal(m.find('Kids room paired west entry doors').length, 0);
  assert.doesNotMatch(source, /kidsDoorway|Kids room (north|south) entry leaf hinge|const kidsEntry/);
});

test('demolished north assembly leaves no floating board, shelves, panels, edge returns or lights', () => {
  const m = build();
  for (const name of ['Family glass dry-erase and cork board', 'Family message wall panelling', 'Family vertical wall panel',
    'Family message wall white edge trim', 'Family off-white open shelf tower', 'Family white edge front strip', 'Family white edge corner return']) assert.equal(m.find(name).length, 0);
  assert.doesNotMatch(source, /familyBoard\.add|familyShelfTowers|Family board soft wash beam|Family shelf task beam/);
  assert.equal(ground.getGroundFloorDefaultPlan().walls.filter(([name]) => name === 'Kids north').length, 1);
  assert.doesNotMatch(source, /\[kidsRoom\.x, kidsRoom\.z, kidsRoom\.x \+ kidsRoom\.width, kidsRoom\.z/);
});

test('hall white panels still meet the new north end and avoid doors and the closet-only recess', () => {
  const m = build(), hall = m.find('Hall-facing white wall panelling')[0], b = bounds(hall);
  close(b.maxX, 18.825); close(b.minX, 18.825 - 0.5 / 12);
  close(b.minZ, m.context.kidsRoom.z + 0.175);
  close(b.maxZ, ground.getGroundFrontLayout().wallZ - 0.175);
  assert.ok(m.find('Hall vertical wall panel').length > 50);
  const cutouts = [[44.8 - 2.625 / 12, 47.8 + 2.625 / 12, 8.46875],
    [suite.notch.z - 0.175, suite.notch.z + suite.notch.d + 0.175, 9]];
  for (const p of hall.children) {
    const pb = bounds(p), bottom = p.position.y - p.h / 2, top = p.position.y + p.h / 2;
    assert.ok(bottom >= 8 / 12 && top <= 9 + 1e-8);
    for (const [start, end, height] of cutouts) assert.ok(pb.maxZ <= start + 1e-8 || pb.minZ >= end - 1e-8 || bottom >= height - 1e-8);
  }
  assert.ok(hall.children.some(p => {
    const b = bounds(p);
    return b.minZ < 29 && b.maxZ > 29 && p.position.y - p.h / 2 < 4 && p.position.y + p.h / 2 > 4;
  }), 'Hall finish fills the former west doorway at seated/standing height');
});

module.exports = { build, bounds };
