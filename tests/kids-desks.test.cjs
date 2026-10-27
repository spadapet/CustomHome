'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

function buildKidsRoom() {
  class Group {
    constructor() {
      this.children = [];
      this.rotation = { y: 0 };
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.userData = {};
    }
    add(child) { child.parent = this; this.children.push(child); }
  }
  const roots = [];
  const kidsRoom = { x: 19, z: 26.725 - 25 / 12 - 0.08 + 0.175, width: 10, southWidth: 12.2 };
  const context = {
    kidsRoom,
    guestSuite: require('../floor-plan-ground.js').getGuestSuiteLayout(),
    kidsDoorway: { x: 19, z: 27, width: 4.5, height: 8 },
    casingSideWidth: 3.5 / 12,
    casingReveal: 0.125 / 12,
    ...Object.fromEntries(['linen', 'cabinetFinish', 'cabinetRailFinish', 'cabinetPanelFinish', 'brass', 'oak', 'cream', 'porcelain', 'black'].map((name) => [name, { name }])),
    THREE: { Group },
    mat: (color) => ({ color }),
    furnishing(name, x, z, rotation = 0) {
      const group = new Group();
      group.name = name;
      group.position.set(x, 0, z);
      group.rotation.y = rotation;
      roots.push(group);
      return group;
    },
    box(parent, x, y, z, w, h, d, material) {
      assert.ok(material, 'All kids-room parts have defined materials');
      const mesh = new Group();
      Object.assign(mesh, { w, h, d, material });
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    cylinder(parent, x, y, z, radius, height, material) {
      return context.box(parent, x, y, z, radius * 2, height, radius * 2, material);
    }
  };
  vm.runInNewContext(source.slice(source.indexOf('  function shakerFront('), source.indexOf('  function cabinetCupPull(')), context);
  const start = source.indexOf('  const kidsClay =');
  const end = source.indexOf('  for (const [index, [deskX, deskZ, rotation]]', start);
  assert.ok(start >= 0 && end > start, 'Locate the complete kids-room furnishings');
  vm.runInNewContext(source.slice(start, end), context);
  const descendants = (node) => [node, ...node.children.flatMap(descendants)];
  const all = roots.flatMap(descendants);
  return { roots, kidsRoom, find: (name) => all.filter((item) => item.name === name) };
}

function bounds(root) {
  const b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  function visit(node) {
    if (node.w !== undefined) {
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
        let [x, z] = [dx * node.w / 2, dz * node.d / 2];
        for (let current = node; current; current = current.parent) {
          const angle = current.rotation.y;
          [x, z] = [x * Math.cos(angle) + z * Math.sin(angle), -x * Math.sin(angle) + z * Math.cos(angle)];
          x += current.position.x;
          z += current.position.z;
        }
        b.minX = Math.min(b.minX, x);
        b.maxX = Math.max(b.maxX, x);
        b.minZ = Math.min(b.minZ, z);
        b.maxZ = Math.max(b.maxZ, z);
      }
    }
    node.children.forEach(visit);
  }
  visit(root);
  return b;
}

test('two electric IKEA MITTZON desks use the referenced product dimensions', () => {
  const model = buildKidsRoom();
  const desks = model.roots.filter((item) => item.name.startsWith('IKEA MITTZON kids desk '));
  assert.equal(desks.length, 2);
  assert.equal(model.roots.filter((item) => item.name.startsWith('Kids desk chair ')).length, 2);
  assert.equal(model.find('MITTZON desktop').length, 2);
  assert.equal(model.find('Kids all-in-one PC').length, 1);
  assert.equal(model.find('Kids PC keyboard').length, 1);
  assert.equal(model.find('Homework writing mat').length, 1);
  assert.equal(model.find('Removable art supply caddy').length, 1);
  for (const desk of desks) {
    assert.equal(desk.userData.model, 'MITTZON');
    assert.equal(desk.userData.minHeightInches, 24.375);
    assert.equal(desk.userData.maxHeightInches, 49.625);
    const top = desk.children.find((part) => part.name === 'MITTZON desktop');
    assert.ok(Math.abs(top.w * 12 - 47.25) < 1e-9);
    assert.ok(Math.abs(top.d * 12 - 31.5) < 1e-9);
    assert.ok(Math.abs((top.position.y + top.h / 2) * 12 - 29.5) < 1e-9);
  }
  for (const desk of desks) {
    assert.equal(desk.rotation.y, Math.PI);
    assert.equal(desk.position.z, 31.9375);
    assert.ok(Math.abs((33.425 - bounds(desk).maxZ) * 12 - 2.1) < 1e-9, 'Desks back onto shifted south wall with trim clearance');
  }
  const rightWallFace = model.kidsRoom.x + model.kidsRoom.southWidth - 0.175;
  assert.ok(Math.abs((rightWallFace - bounds(desks[1]).maxX) * 12 - 1) < 1e-9, 'Right desk is one inch off the finished east wall');
  assert.ok(Math.abs(desks[0].position.x - 24.8729166667) < 1e-9, 'PC shifts east 26.4 inches and stays left of homework desk');
  const craftChair = model.find('Kids desk chair 2')[0];
  assert.equal(craftChair.rotation.y, 2 * Math.PI);
  assert.equal(craftChair.position.x, desks[1].position.x);
  assert.ok(craftChair.position.z < desks[1].position.z, 'Chair sits north of south-facing desk');
  assert.ok(bounds(desks[0]).maxX < bounds(desks[1]).minX, 'Desks do not overlap');
  assert.ok(Math.abs((bounds(desks[1]).minX - bounds(desks[0]).maxX) * 12 - 1.95) < 1e-9);
});

test('bench, floor books and upper artwork are removed while TROFAST bins remain', () => {
  const model = buildKidsRoom();
  for (const name of ['Kids reading bench', 'Reading bench storage base', 'Sage reading bench cushion', 'Reading nook back cushion']) assert.equal(model.find(name).length, 0);
  assert.equal(model.find('Kids face-out book display').length, 0);
  assert.equal(model.find('Displayed picture book').length, 0);
  assert.equal(model.find('Rotating child artwork').length, 0);
  assert.equal(model.find('Kids low toy storage').length, 0);
  assert.equal(model.find('IKEA TROFAST toy storage 1').length, 1);
  assert.equal(model.find('IKEA TROFAST toy storage 2').length, 1);
  assert.equal(model.find('Kids art display board').length, 0);
  assert.equal(model.find('Kids activity table').length, 0);
  assert.equal(model.find('Kids activity stool').length, 0);
  assert.equal(model.find('Kids play rug').length, 0, 'Oak floor stays exposed without a carpet or rug');
});

test('desks, chairs and relocated storage clear room edges and preserve a passage', () => {
  const model = buildKidsRoom();
  const desks = model.roots.filter((item) => item.name.startsWith('IKEA MITTZON kids desk ')).map(bounds);
  const chairs = model.roots.filter((item) => item.name.startsWith('Kids desk chair ')).map(bounds);
  const storage = model.roots.filter((item) => item.name.startsWith('IKEA TROFAST toy storage '));
  const toyBounds = storage.map(bounds);
  const toyFront = Math.max(...toyBounds.map((b) => b.maxZ));
  for (const root of model.roots) {
    if (['Family glass dry-erase and cork board', 'Family message wall panelling', 'Family message wall white edge trim', 'Hall-facing white wall panelling'].includes(root.name)) continue;
    const b = bounds(root);
    const eastFace = b.minZ < 26.9 + 0.175 ? 28.825 : 31.025;
    assert.ok(b.minX >= 19.3 && b.maxX <= eastFace + 1e-9, root.name);
    assert.ok(b.minZ >= model.kidsRoom.z + 0.3 && b.maxZ <= 33.425 + 1e-9, root.name);
  }
  const deskFront = desks[0].minZ;
  const pulledFront = toyFront + storage[0].userData.binPullAllowanceInches / 12;
  assert.ok((deskFront - toyFront) * 12 > 49, 'Shifted opposing furniture fronts have over 49 inches');
  assert.ok((deskFront - 30 / 12 - pulledFront) * 12 > 1, 'Chair and full bin-pull allowances remain separate but do not leave a passing aisle');
  for (const chair of chairs) assert.ok((chair.minZ - pulledFront) * 12 > 22, 'Full bin pull leaves over 22 inches to tucked chairs, not occupied approval');
  assert.ok(Math.min(...toyBounds.map(b => b.minX)) > 21.9, 'Storage is east-aligned, not across west entrance');
  const approach = { minX: 19.175, maxX: 21.675, minZ: 27, maxZ: 30.625 };
  for (const b of [...desks, ...chairs, ...toyBounds]) {
    assert.ok(b.minX >= approach.maxX || b.maxX <= approach.minX || b.minZ >= approach.maxZ || b.maxZ <= approach.minZ, 'Furniture clears a 30-inch-wide by 43.5-inch entry approach');
  }
});

test('two TROFAST combinations match the linked size and contain removable boxes, not drawers', () => {
  const model = buildKidsRoom();
  const storage = model.roots.filter((item) => item.name.startsWith('IKEA TROFAST toy storage '));
  assert.equal(storage.length, 2);
  assert.equal(model.find('TROFAST removable mesh box').length, 18);
  assert.equal(model.find('Separate LEGO organizer insert').length, 9);
  assert.equal(model.find('LEGO organizer removable lid').length, 9);
  for (const unit of storage) {
    const b = bounds(unit);
    assert.ok(Math.abs((b.maxX - b.minX) * 12 - 39) < 1e-9);
    assert.ok(Math.abs((b.maxZ - b.minZ) * 12 - 17.375) < 1e-9);
    assert.equal(unit.userData.heightInches, 37);
    const top = unit.children.filter((part) => part.name === 'TROFAST white horizontal frame').at(-1);
    assert.ok(Math.abs((top.position.y + top.h / 2) * 12 - 37) < 1e-9);
    assert.equal(unit.userData.articleNumber, '796.131.29');
    assert.equal(unit.userData.wallAnchorageRequired, true);
    const bins = unit.children.filter((part) => part.name === 'TROFAST removable mesh box');
    assert.equal(bins.length, 9);
    for (const bin of bins) {
      assert.equal(bin.userData.removable, true);
      assert.equal(bin.userData.builtInDrawer, false);
      const bb = bounds(bin);
      assert.ok(bb.minX > b.minX && bb.maxX < b.maxX && bb.minZ > b.minZ && bb.maxZ < b.maxZ, 'Bins fit inside each frame');
    }
  }
  assert.ok(Math.abs((bounds(storage[1]).minX - bounds(storage[0]).maxX) * 12 - 2) < 1e-9);
  assert.ok(Math.abs((28.825 - bounds(storage[1]).maxX) * 12 - 2.1) < 1e-9, 'Storage aligns east with trim clearance');
  for (const unit of storage) {
    assert.equal(unit.rotation.y, 0);
    assert.ok(Math.abs((bounds(unit).minZ - model.kidsRoom.z - 0.175) * 12 - 2.1) < 1e-9, 'Storage backs onto north wall');
  }
});

test('family board is centered on the kitchen face without entering the desk lift zone', () => {
  const model = buildKidsRoom();
  const board = model.find('Family glass dry-erase and cork board')[0];
  const b = bounds(board);
  assert.equal(board.position.x, model.kidsRoom.x + model.kidsRoom.width / 2);
  assert.equal(board.rotation.y, Math.PI);
  assert.equal(board.userData.widthInches, 84);
  assert.equal(board.userData.heightInches, 48);
  assert.equal(board.userData.bottomInches, 30);
  assert.equal(model.find('Family charcoal dry-erase glass').length, 1);
  assert.equal(model.find('Family charcoal chalkboard').length, 0);
  assert.equal(model.find('Family board chalk').length, 0);
  assert.equal(model.find('Family board dry-erase marker').length, 2);
  assert.match(board.userData.writingMedium, /approved for black glass/);
  assert.equal(board.userData.safetyGlazingRequired, true);
  assert.equal(model.find('Family cork pinboard').length, 1);
  assert.equal(model.find('Pinned family paper').length, 3);
  assert.ok(b.minX >= 19.175 && b.maxX <= 28.825, 'Frame stays inside wall ends');
  const wallFace = model.kidsRoom.z - 0.175;
  assert.ok(b.maxZ < wallFace, 'Every board part stays outside the wall and kids room');
  assert.ok((wallFace - b.minZ) * 12 <= 3.5, 'Tray projects less than 3.5 inches');
  assert.ok(Math.abs((wallFace - b.minZ) * 12 - 3.08) < 1e-9, 'Projection includes new panelling and tray');
  assert.ok(model.roots.filter((item) => item.name.startsWith('IKEA MITTZON kids desk ')).every((desk) => bounds(desk).minZ > b.maxZ), 'No overlap with moving desks at any height');
});

test('warm-white wall panelling fits above the existing baseboard and behind the family board', () => {
  const model = buildKidsRoom();
  const panelling = model.find('Family message wall panelling')[0];
  const panels = model.find('Family vertical wall panel');
  assert.equal(panels.length, 20);
  assert.equal(panels[0].material.color, '#f2efe7');
  assert.equal(panelling.userData.finish, 'Warm-white painted vertical grooved panelling');
  assert.notEqual(panels[0].material.color, model.find('Family panelling recessed groove backing')[0].material.color, 'Grooves stay visible without renderer shadows');
  const b = bounds(panelling);
  const wallFace = model.kidsRoom.z - 0.175;
  assert.ok(Math.abs(b.minX - 19.175) < 1e-9);
  assert.ok(Math.abs(b.maxX - 28.825) < 1e-9);
  assert.ok(Math.abs(b.maxZ - wallFace) < 1e-9, 'Backing meets finished wall');
  assert.ok(Math.abs((wallFace - b.minZ) * 12 - 0.5) < 1e-9);
  for (const panel of panels) {
    assert.ok(Math.abs((panel.position.y - panel.h / 2) * 12 - 8) < 1e-9, 'Stop above flat white baseboard');
    assert.ok(Math.abs((panel.position.y + panel.h / 2) * 12 - 108) < 1e-9, 'Full-height finish');
  }
  const board = bounds(model.find('Family glass dry-erase and cork board')[0]);
  assert.ok(board.maxZ < b.minZ, 'Board is remounted outside panel face, not embedded in it');
});

test('matching white strips cover both wall edges and return around the outside corners', () => {
  const model = buildKidsRoom();
  const trim = model.find('Family message wall white edge trim')[0];
  const strips = model.find('Family white edge front strip').map(bounds).sort((a, b) => a.minX - b.minX);
  const returns = model.find('Family white edge corner return').map(bounds).sort((a, b) => a.minX - b.minX);
  const panels = bounds(model.find('Family message wall panelling')[0]);
  assert.equal(strips.length, 2);
  assert.equal(returns.length, 2);
  assert.equal(trim.userData.finish, 'Warm-white paint matching wall panelling');
  assert.equal(model.find('Family message wall oak edge trim').length, 0);
  assert.ok(Math.abs(strips[0].minX - 18.825) < 1e-9);
  assert.ok(Math.abs(strips[0].maxX - panels.minX) < 1e-9, 'Left edge meets white panelling without a gap');
  assert.ok(Math.abs(strips[1].minX - panels.maxX) < 1e-9, 'Right edge meets white panelling without a gap');
  assert.ok(Math.abs(strips[1].maxX - 29.175) < 1e-9);
  for (const [index, strip] of strips.entries()) {
    assert.ok(Math.abs(strip.minZ - panels.minZ) < 1e-9, 'Edge and main panel front faces are flush');
    assert.ok(Math.abs(returns[index].minZ - strip.minZ) < 1e-9, 'Return covers front panel thickness');
    assert.ok(Math.abs(returns[index].maxZ - model.kidsRoom.z - 0.175) < 1e-9, 'Return covers full 4.2-inch wall end');
  }
  assert.ok(Math.abs(returns[0].maxX - strips[0].minX) < 1e-9);
  assert.ok(Math.abs(returns[1].minX - strips[1].maxX) < 1e-9);
  for (const part of trim.children) {
    assert.equal(part.material, model.find('Family vertical wall panel')[0].material, 'Edges share the main panelling finish');
    assert.equal(part.material.color, '#f2efe7');
    assert.ok(Math.abs((part.position.y - part.h / 2) * 12 - 8) < 1e-9);
    assert.ok(Math.abs((part.position.y + part.h / 2) * 12 - 108) < 1e-9);
  }
});

test('white panelling continues along the hall to the foyer without blocking either cased doorway', () => {
  const model = buildKidsRoom();
  const hall = model.find('Hall-facing white wall panelling')[0];
  const b = bounds(hall);
  const corner = bounds(model.find('Family white edge corner return').find((part) => bounds(part).minX < 19));
  assert.ok(Math.abs(b.minX - (18.825 - 0.5 / 12)) < 1e-9);
  assert.ok(Math.abs(b.maxX - 18.825) < 1e-9, 'Finish stays on hall face, outside kids and guest rooms');
  assert.ok(Math.abs(b.minZ - corner.maxZ) < 1e-9, 'Continuation meets existing corner return without overlap');
  assert.ok(Math.abs(b.maxZ - 54.025) < 1e-9, 'Finish stops at foyer south-wall face');
  assert.ok(model.find('Hall vertical wall panel').length > 50, 'Continue vertical grooves along entire run');
  const white = model.find('Family vertical wall panel')[0].material;
  for (const panel of model.find('Hall vertical wall panel')) assert.equal(panel.material, white);
  const cutouts = [];
  for (const [start, end] of [[27, 31.5], [43.8, 46.8]]) {
    const sideExtent = 3.625 / 12;
    const headerTop = 8 + 0.125 / 12 + 5.5 / 12;
    cutouts.push(
      { minZ: start - sideExtent, maxZ: end + sideExtent, bottom: 0, top: headerTop },
      { minZ: start - sideExtent - 0.03125, maxZ: end + sideExtent + 0.03125, bottom: 8 + 0.125 / 12, top: 8 + 0.125 / 12 + 0.0625 },
      { minZ: start - sideExtent - 0.0625, maxZ: end + sideExtent + 0.0625, bottom: headerTop, top: headerTop + 0.0416667 + 1 / 24 }
    );
  }
  for (const part of hall.children) {
    const p = bounds(part);
    const bottom = part.position.y - part.h / 2;
    const top = part.position.y + part.h / 2;
    assert.ok(bottom >= 8 / 12 - 1e-9 && top <= 9 + 1e-9, 'Existing baseboard and ceiling preserved');
    for (const cut of cutouts) {
      assert.ok(p.maxZ <= cut.minZ + 1e-9 || p.minZ >= cut.maxZ - 1e-9 || top <= cut.bottom + 1e-9 || bottom >= cut.top - 1e-9, 'No panelling in door opening or casing envelope');
    }
  }
  for (const [start, end] of [[27, 31.5], [43.8, 46.8]]) {
    assert.ok(hall.children.some(part => {
      const p = bounds(part);
      return p.minZ < (start + end) / 2 && p.maxZ > (start + end) / 2 && part.position.y - part.h / 2 > 8.5;
    }), 'Panelling continues over each doorway header');
  }
});
