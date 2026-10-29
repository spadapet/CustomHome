'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

class Group {
  constructor() {
    this.children = [];
    this.userData = {};
    this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    this.rotation = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    this.scale = { x: 1, y: 1, z: 1, set(x, y, z) { Object.assign(this, { x, y, z }); } };
  }
  add(child) { this.children.push(child); child.parent = this; }
  traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
}
class Mesh extends Group {
  constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; }
}
class CylinderGeometry {
  constructor(radius, bottom, height, segments = 32, rows = 1, open = false, start = 0) {
    Object.assign(this, { radius, bottom, height, segments, start });
  }
}
class TorusGeometry { constructor(radius, tube) { Object.assign(this, { radius, tube }); } }

function build(cookingCenterOffset = 0) {
  const material = { clone() { return { ...this }; } };
  const context = {
    THREE: { Group, Mesh, CylinderGeometry, TorusGeometry, DoubleSide: 2 },
    ...Object.fromEntries(['kitchen', 'prep', 'prepExtension', 'island', 'cooktopCabinetry', 'cooktopUppers', 'refrigerationPantry', 'trashFront'].map((name) => [name, new Group()])),
    ...Object.fromEntries(['porcelain', 'steel', 'pantryGlass', 'black', 'cream', 'brass', 'cabinetRailFinish', 'cabinetFinish'].map((name) => [name, material])),
    mat: () => material, pantryWidth: 2.625, prepSinkX: 47.4, prepCounterZ: 8.25, islandCabinetLength: 8 - 4 / 12, cooktopCenterZ: 16.95,
    kitchenSinkX: 32, kitchenWindowWallZ: 7, kitchenTaskDiffuser: material,
    shakerFront(parent, x, y, z, width, height) {
      const front = new Group();
      front.position.set(x, y, z);
      front.userData = { cabinetFront: true, width, height };
      parent.add(front);
      return front;
    },
    cabinetPull() {},
    box(parent, x, y, z, w, h, d, finish) {
      const mesh = new Mesh({ w, h, d }, finish);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    cylinder(parent, x, y, z, radius, height, finish) {
      const mesh = new Mesh(new CylinderGeometry(radius, radius, height), finish);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }
  };
  context.kitchen.add(context.island);
  context.kitchen.add(context.cooktopCabinetry);
  context.cooktopCabinetry.position.z = context.cooktopCenterZ + cookingCenterOffset;
  const islandBanks = [-1, 0, 1].map((offset) => {
    const bank = new Group();
    bank.position.z = 18.5 + offset * context.islandCabinetLength / 3;
    context.island.add(bank);
    return bank;
  });
  function drawers(root, width, cooking = false) {
    for (let row = 0; row < 3; row++) {
      const front = new Group();
      const bottom = cooking ? [4.125, 16.5, 28.875][row] / 12 : 0.28 + row * 0.79;
      const height = cooking ? (row === 2 ? 5.5 : 12.25) / 12 : 0.74;
      front.position.y = bottom + height / 2;
      front.userData = { kitchenDrawerRow: row, width, height, drawerTravelFeet: 1.5,
        ...(cooking ? { drawerFloorY: -height / 2 + 0.09 } : {}) };
      root.add(front);
    }
  }
  for (const root of [context.kitchen, ...islandBanks, context.cooktopCabinetry, context.prepExtension])
    drawers(root, root === context.kitchen ? 2.2 : root === context.cooktopCabinetry ? 35.875 / 12 : 2.5, root === context.cooktopCabinetry);
  for (let index = 0; index < 2; index++) {
    const bank = new Group();
    bank.position.z = 16.95 + (index === 0 ? -2.625 : 2.625);
    context.cooktopCabinetry.add(bank);
    drawers(bank, 26.875 / 12, true);
    const upper = new Group();
    upper.name = `Cooktop ${index === 0 ? 'prep-side' : 'mudroom-side'} upper stack`;
    upper.userData.widthInches = 27;
    context.cooktopUppers.add(upper);
    const narrow = new Group();
    narrow.userData = { narrowStorageRole: index === 0 ? 'Spices' : 'Boards and trays', drawerFloorY: -1.17 };
    context.cooktopCabinetry.add(narrow);
  }
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function furnishKitchenStorage()'), source.indexOf('  const upstairsHelpers =')), context);
  context.furnishKitchenStorage();
  return context;
}
const find = (root, name) => {
  const result = [];
  root.traverse((part) => { if (part.name === name) result.push(part); });
  return result;
};

function boundsIn(root, ancestor) {
  const bounds = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  root.traverse((mesh) => {
    if (!mesh.geometry) return;
    const g = mesh.geometry;
    const radius = g.radius + (g.tube ?? 0);
    const squareRadius = g.segments === 4 ? g.radius / Math.SQRT2 : g.radius;
    const extent = g.w !== undefined ? [g.w / 2, g.h / 2, g.d / 2]
      : g.tube !== undefined ? [radius, radius, g.tube] : [squareRadius, g.height / 2, squareRadius];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      let [x, y, z] = [sx * extent[0], sy * extent[1], sz * extent[2]];
      for (let part = mesh; part !== ancestor; part = part.parent) {
        assert.ok(part, 'Measured object belongs to the reference frame');
        x *= part.scale.x; y *= part.scale.y; z *= part.scale.z;
        const r = part.rotation;
        [x, y] = [x * Math.cos(r.z) - y * Math.sin(r.z), x * Math.sin(r.z) + y * Math.cos(r.z)];
        [x, z] = [x * Math.cos(r.y) + z * Math.sin(r.y), -x * Math.sin(r.y) + z * Math.cos(r.y)];
        [y, z] = [y * Math.cos(r.x) - z * Math.sin(r.x), y * Math.sin(r.x) + z * Math.cos(r.x)];
        x += part.position.x; y += part.position.y; z += part.position.z;
      }
      [x, y, z].forEach((value, axis) => {
        bounds.min[axis] = Math.min(bounds.min[axis], value);
        bounds.max[axis] = Math.max(bounds.max[axis], value);
      });
    }
  });
  return bounds;
}

test('requested inventory is complete: two baskets, six mixing bowls, ten bottles and a twelve-container set with lids', () => {
  const model = build();
  assert.equal(find(model.kitchen, 'Nested drain basket').length, 2);
  assert.equal(find(model.kitchen, 'Nested food storage container').length, 12);
  assert.equal(find(model.kitchen, 'Matching food container lid').length, 12);
  const bowls = find(model.prep, 'Nested mixing bowl');
  assert.equal(bowls.length, 6);
  for (const diameter of [8, 10, 12]) assert.equal(bowls.filter(b => b.userData.diameterInches === diameter).length, 2);
  const bottles = find(model.prep, 'Stored reusable water bottle');
  assert.equal(bottles.length, 10);
  assert.ok(bottles.every(b => b.userData.heightInches === 10.5 && b.userData.diameterInches === 3.25));
  assert.ok(bowls.every(b => b.parent.position.x === 44.65));
  assert.ok(bottles.every(b => b.parent.parent.position.x === 51.4));
  for (const size of ['small', 'medium', 'large']) {
    assert.equal(find(model.kitchen, 'Nested food storage container').filter(b => b.userData.size === size).length, 4);
    assert.equal(find(model.kitchen, 'Matching food container lid').filter(b => b.userData.size === size).length, 4);
  }
});

test('two ten-piece cookware sets each contain two frying pans, two saucepans, a saute pan, a stockpot and four lids', () => {
  const model = build();
  for (const setNumber of [1, 2]) {
    const items = [];
    for (const root of [model.kitchen, model.refrigerationPantry]) root.traverse(part => {
      if (part.userData.setNumber === setNumber) items.push(part);
    });
    assert.equal(items.length, 10);
    for (const [name, count] of [['Stored frying pan', 2], ['Stored saucepan', 2], ['Stored saute pan', 1], ['Large stockpot', 1], ['Stored cookware lid', 4]])
      assert.equal(items.filter(item => item.name === name).length, count, `Set ${setNumber}: ${name}`);
    assert.deepEqual(items.filter(i => i.name === 'Stored frying pan').map(i => i.userData.diameterInches).sort((a,b) => a-b), [8, 10]);
    assert.deepEqual(items.filter(i => i.name === 'Stored saucepan').map(i => i.userData.diameterInches).sort((a,b) => a-b), [6.5, 8]);
  }
  assert.equal(find(model.cooktopCabinetry, 'Stored cookware lid').length, 8);
  assert.equal(find(model.refrigerationPantry, 'Stored cookware lid').length, 0);
});

test('new sink and cooking drawer contents fit their actual usable width, depth and next-drawer underside', () => {
  const model = build();
  const inventories = find(model.kitchen, 'Kitchen drawer inventory').filter(item =>
    /^(Two nested|Twelve food|Two saute|Set [12]|Eight cookware)/.test(item.userData.storageRole));
  assert.equal(inventories.length, 8);
  for (const item of inventories) {
    const front = item.parent;
    const b = boundsIn(item, front);
    const halfWidth = (front.userData.width - 0.23) / 2;
    assert.ok(b.min[0] >= -halfWidth - 1e-8 && b.max[0] <= halfWidth + 1e-8, `${item.userData.storageRole}: side walls`);
    assert.ok(b.min[2] >= -1.41 + 0.25 / 12 && b.max[2] <= -0.05 - 0.25 / 12, `${item.userData.storageRole}: at least quarter-inch back/front allowance`);
    assert.ok(b.min[1] >= (front.userData.drawerFloorY ?? -0.2) + 0.02 - 1e-8, `${item.userData.storageRole}: floor support`);
    const next = front.parent.children.find(p => p.userData.kitchenDrawerRow === front.userData.kitchenDrawerRow + 1);
    assert.ok(next);
    const ceiling = next.position.y + (next.userData.drawerFloorY ?? -0.2) - 0.02 - front.position.y;
    assert.ok(b.max[1] < ceiling, `${item.userData.storageRole}: next drawer underside`);
  }
});

test('floating-point centerline noise does not turn the center saute drawer into a side-bank assignment', () => {
  const model = build(1e-12);
  assert.equal(find(model.cooktopCabinetry, 'Stored saute pan').length, 2);
  assert.equal(find(model.cooktopCabinetry, 'Stored frying pan').length, 4);
  assert.equal(find(model.cooktopCabinetry, 'Stored cookware lid').length, 8);
});

test('cupboard contents fit existing shelf supports and stockpots fit below the unchanged oven', () => {
  const model = build();
  const mixing = find(model.prep, 'Prep cupboard mixing and serving storage').find(p => p.position.x === 44.65);
  const bottles = find(model.prep, 'Removable ten-bottle rack')[0];
  for (const [root, width, depth] of [[mixing, 28.5, 21.6], [bottles, 22.5, 21.6]]) {
    const reference = root === mixing ? mixing : bottles.parent;
    const b = boundsIn(root, reference);
    assert.ok(b.min[0] >= -width / 24 && b.max[0] <= width / 24);
    assert.ok(b.min[2] >= -depth / 24 && b.max[2] <= depth / 24);
    assert.ok(b.max[1] + reference.position.y < 34.5 / 12 - 0.0625);
  }
  const pots = find(model.refrigerationPantry, 'Large stockpot');
  const b = boundsIn(find(model.refrigerationPantry, 'Large cookware below steam oven')[0], model.refrigerationPantry);
  assert.ok(b.min[0] > -(model.pantryWidth - 0.15) / 2 && b.max[0] < (model.pantryWidth - 0.15) / 2);
  assert.ok(b.max[1] < 2.5 - 0.0625);
  const left = boundsIn(pots[0], model.refrigerationPantry), right = boundsIn(pots[1], model.refrigerationPantry);
  assert.ok(Math.abs((right.min[0] - left.max[0]) * 12 - 0.76) < 1e-8);
  assert.equal(find(model.prep, 'Stored serving platter').length, 3);
  assert.equal(find(model.prep, 'Prep cupboard adjustable shelf').length, 1);
});

test('open sink wall has no former upper cabinets, trial dishes or under-cabinet strips', () => {
  assert.equal(source.includes('Sink wall plate and bowl upper cabinets'), false);
  assert.equal(source.includes('Sink under-cabinet task-light strip'), false);
  assert.equal(source.includes('Trial 21-inch sink wall cabinets'), false);
  assert.equal(source.includes('Trial sink upper dish inventory'), false);
  const model = build();
  assert.equal(find(model.kitchen, 'Sink wall plate and bowl upper cabinets').length, 0);
});

test('one prep-side cooking drawer carries a removable full-size board without changing dish storage', () => {
  const model = build();
  const fronts = find(model.cooktopCabinetry, 'Cooking-area cutting-board pull-out drawer');
  assert.equal(fronts.length, 1);
  assert.ok(fronts[0].parent.position.z < model.cooktopCenterZ - 1.5);
  assert.equal(fronts[0].userData.kitchenDrawerRow, 2);
  const board = find(fronts[0], 'Removable horizontal cutting board')[0];
  assert.equal(board.userData.widthInches, 22);
  assert.equal(board.userData.depthInches, 14);
  assert.equal(board.userData.thicknessInches, 0.75);
  assert.equal(board.userData.useOnCountertop, true);
  assert.ok(22 / 12 < fronts[0].userData.width - 0.23);
  assert.ok(14 / 12 < 1.32);
  assert.equal(find(fronts[0], 'Cooking utensil organizer').length, 0);
  assert.equal(find(model.island, 'Stored dinner plate').length, 30);
});

test('storage includes cutlery, cooking tools, plates, bowls, containers, pots and pans in moving drawers', () => {
  const model = build();
  for (const name of ['Fork', 'Spoon', 'Table knife', 'Wooden cooking spoon', 'Spatula', 'Stored dinner plate', 'Nested drain basket', 'Stored frying pan', 'Stored saucepan']) {
    assert.ok(find(model.kitchen, name).length > 0, name);
  }
  assert.ok(find(model.prepExtension, 'Stacked prep or cereal bowl').length > 0, 'Existing prep drawer bowls remain');
  for (const root of [model.kitchen, model.prepExtension]) {
    root.traverse((part) => {
      if (part.name !== 'Kitchen drawer inventory') return;
      assert.equal(part.parent.userData.kitchenDrawerRow !== undefined, true, 'Contents are attached to the moving front, not the carcass');
      assert.equal(part.position.y, part.parent.userData.drawerFloorY !== undefined ? part.parent.userData.drawerFloorY + 0.02 : -0.18);
      assert.ok(part.userData.representativeInventory);
      assert.ok(part.parent.userData.storageRole);
    });
  }
});

test('trash has two separate open removable bins attached to the tall pull-out above its corrected low floor', () => {
  const model = build();
  const contents = find(model.trashFront, 'Separate trash and recycling bins')[0];
  assert.equal(contents.parent, model.trashFront);
  assert.equal(contents.position.y, -0.93);
  for (const name of ['Trash bin', 'Recycling bin']) {
    const bin = find(contents, name)[0];
    assert.deepEqual(Array.from(bin.userData.envelopeInches), [13.2, 8.4, 19.8]);
    assert.equal(bin.children.filter((part) => part.name === 'Removable bin side').length, 2);
    assert.equal(bin.children.filter((part) => part.name === 'Removable bin end').length, 2);
    assert.ok(bin.position.z - 0.35 >= -1.7);
    assert.ok(bin.position.z + 0.35 <= -0.05);
  }
  assert.match(source, /trashFront\.userData\.drawerFloorY = -0\.95/);
  assert.match(source, /trashFront\.userData\.drawerTravelFeet = 1\.75/);
});

test('upper cups and glasses have real support shelves and large cookware stays below the oven', () => {
  const model = build();
  assert.equal(find(model.cooktopUppers, 'Kitchen upper adjustable shelf').length, 4);
  assert.equal(find(model.cooktopUppers, 'Stored drinking glass').length, 5);
  assert.equal(find(model.cooktopUppers, 'Stored mug').length, 5);
  for (const upper of model.cooktopUppers.children.filter((part) => part.name.includes('prep-side'))) {
    const inventory = find(upper, 'Kitchen upper shelf inventory');
    const mugs = inventory.find((item) => item.userData.dishCategory === 'mugs');
    const glasses = inventory.find((item) => item.userData.dishCategory === 'drinking cups');
    assert.equal(mugs.position.y, 4.6125, 'mugs sit on the cabinet floor, the first reachable compartment');
    assert.equal(find(mugs, 'Stored mug').length, 5);
    assert.equal(glasses.position.y, 5.58125);
    assert.equal(find(glasses, 'Stored drinking glass').length, 5);
    assert.deepEqual(inventory.filter((item) => item.userData.spare).map((item) => item.position.y), [6.63125, 7.6125]);
    for (const mug of find(mugs, 'Stored mug')) assert.ok(mugs.position.y + mug.position.y + 0.32 < 5.55, 'mugs fit below the first shelf');
  }
  assert.equal(find(model.refrigerationPantry, 'Large stockpot').length, 2);
  assert.equal(find(model.cooktopCabinetry, 'Stored cookware lid').length, 8);
  assert.equal(find(model.prep, 'Nested mixing bowl').length, 6);
  assert.equal(find(model.prep, 'Stored serving platter').length, 3);
});

test('right mudroom-side upper has seasoning spinners and rare spices; left prep-side keeps cups', () => {
  const model = build();
  const upper = model.cooktopUppers.children[1];
  const inventory = find(upper, 'Kitchen upper shelf inventory');
  const daily = inventory.find((part) => part.userData.storageRole === 'Daily seasoning turntables');
  const rare = inventory.find((part) => part.userData.storageRole === 'Rarely used spices');
  const trays = find(upper, 'IKEA VARIERA metal seasoning turntable');
  assert.equal(trays.length, 2);
  assert.equal(daily.position.y, 4.6125);
  assert.equal(rare.position.y, 5.58125);
  assert.equal(find(daily, 'Stored seasoning jar').length, 14);
  assert.equal(find(rare, 'Stored seasoning jar').length, 8);
  assert.equal(find(upper, 'Stored drinking glass').length, 0);
  assert.equal(find(upper, 'Stored mug').length, 0);
  assert.deepEqual(inventory.filter((part) => part.userData.spare).map((part) => part.position.y), [6.63125, 7.6125]);
  const radius = 26 / 30.48 / 2;
  assert.ok(trays[1].position.x - trays[0].position.x > 2 * radius);
  for (const tray of trays) {
    assert.equal(tray.parent, daily, 'fixed inventory, not moving door contents');
    assert.equal(tray.userData.removable, true);
    assert.equal(tray.userData.diameterCm, 26);
    assert.equal(tray.userData.heightCm, 4);
    assert.match(tray.userData.material, /steel/);
    assert.ok(Math.abs(tray.position.x) + radius < 27 / 24 - 0.0625);
    assert.ok(tray.position.z - radius > -0.5 + 0.0625);
    assert.ok(tray.position.z + radius < 0.5);
    const deck = find(tray, 'Metal turntable deck')[0];
    assert.equal(deck.geometry.radius, radius);
    assert.ok(Math.abs(deck.position.y + deck.geometry.height / 2 - 0.045) < 1e-8);
    for (const jar of find(tray, 'Stored seasoning jar')) {
      assert.equal(jar.position.y, 0.045);
      assert.ok(Math.hypot(jar.position.x, jar.position.z) + 0.09 < radius - 0.012, 'entire jar/lid rotates inside rim');
      assert.ok(daily.position.y + jar.position.y + 0.2775 < 5.55 - 0.03125);
    }
  }
  for (const jar of find(rare, 'Stored seasoning jar')) {
    assert.ok(jar.userData.label);
    assert.equal(jar.userData.frequency, 'Rare');
    assert.ok(rare.position.y + 0.2775 < 6.6 - 0.03125);
  }
  assert.equal(find(model.cooktopUppers.children[0], 'IKEA VARIERA metal seasoning turntable').length, 0);
  assert.equal(find(model.cooktopUppers.children[0], 'Stored mug').length, 5);
  assert.equal(find(model.cooktopUppers.children[0], 'Stored drinking glass').length, 5);
});

test('island stores exactly ten of each of three plate sizes and three bowl sizes', () => {
  const model = build();
  const inventory = find(model.island, 'Kitchen drawer inventory');
  for (const size of ['small', 'medium', 'large']) for (const type of ['plates', 'bowls']) {
    const drawer = inventory.find((item) => item.userData.dishCategory === `${size} ${type}`);
    assert.ok(drawer, `${size} ${type} has its own drawer`);
    assert.equal(drawer.userData.quantity, 10);
    if (type === 'plates') assert.equal(find(drawer, 'Stored dinner plate').length, 10);
    else assert.equal(find(drawer, `${size[0].toUpperCase() + size.slice(1)} nested bowl`).length, 10);
  }
  assert.equal(find(model.island, 'Stored dinner plate').length, 30);
  assert.equal(inventory.filter((item) => item.userData.dishCategory).length, 6);
});

test('two narrow pull-outs carry a single spice rack and single board/tray organizer', () => {
  const model = build();
  assert.equal(find(model.cooktopCabinetry, 'Narrow cooking pull-out inventory').length, 2);
  assert.equal(find(model.cooktopCabinetry, 'Narrow spice shelf').length, 3);
  assert.equal(find(model.cooktopCabinetry, 'Stored spice jar').length, 9);
  assert.equal(find(model.cooktopCabinetry, 'Narrow stored cutting board').length, 1);
  assert.equal(find(model.cooktopCabinetry, 'Narrow stored baking tray').length, 1);
});

test('sink storage inspection is opt-in, straight-on and does not force cabinet poses open', () => {
  assert.match(source, /'sink-storage': \{ target: \[32, 4\.65, 7\.8\], offset: \[0, 0, 12\], span: 9\.8/);
  assert.match(source, /sinkStorageView \? Math\.max\(preset\.span \/ 2, 11\.4 \/ \(2 \* aspect\)\)/);
  assert.match(source, /const sinkStorageView = name === 'sink-storage'/);
  assert.match(source, /island\.visible = !elevationView/);
  assert.match(source, /currentView !== 'sink-storage'/);
  const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
  assert.match(html, /data-view="sink-storage">Inspect sink-wall storage/);
});

test('drawer-bank upper rails close the missing strip without entering the island counter', () => {
  const root = new Group();
  const context = {
    THREE: { Group }, kitchen: root, cabinetFinish: {},
    box(parent, x, y, z, w, h, d) {
      const part = new Mesh({ w, h, d });
      part.position.set(x, y, z);
      parent.add(part);
      return part;
    },
    shakerFront(parent) { const front = new Group(); parent.add(front); return front; },
    cabinetCupPull() {}
  };
  vm.runInNewContext(source.slice(source.indexOf('  function drawerFront('), source.indexOf('  box(kitchen, kitchenSinkX - 3.4,')), context);
  context.drawerFront(0, 0, 2);
  context.drawerFront(0, 0, 2, Math.PI / 2, root, 2.82);
  const rails = find(root, 'Drawer-bank fixed upper rail');
  assert.equal(rails.length, 2);
  rails.forEach((rail, index) => {
    assert.ok(Math.abs(rail.position.y - rail.geometry.h / 2 - 2.62) < 1e-9);
    assert.ok(Math.abs(rail.position.y + rail.geometry.h / 2 - (index === 0 ? 2.87 : 2.82)) < 1e-9);
  });
});
