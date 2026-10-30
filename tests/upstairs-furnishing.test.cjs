const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const layout = require('../upstairs-layout.js');
const g = require('../floor-plan-upstairs.js').getUpstairsMeasuredGeometry();

class Group {
  constructor() {
    this.children = [];
    this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.userData = {};
  }
  add(child) { this.children.push(child); child.parent = this; }
  updateMatrixWorld() {}
  getWorldPosition(vector) {
    vector.y=0;
    for(let node=this;node;node=node.parent) vector.y+=node.position.y;
    return vector;
  }
  traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
}
class Mesh extends Group {
  constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; }
}
class CylinderGeometry {
  constructor(top, bottom, length) { this.length = length; }
}
class BufferGeometry {
  constructor() { this.attributes = {}; }
  setAttribute(name, attribute) { this.attributes[name] = attribute; }
  setIndex(index) { this.index = index; }
  computeVertexNormals() {}
}
class Float32BufferAttribute {
  constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; }
}
function build(edits = layout.empty()) {
  const context = { UpstairsLayout: layout, HomeRoof: require('../floor-plan-roof.js') };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'floor-plan-upstairs.js'), 'utf8'), context);
  const material = { clone() { return { ...this }; } };
  const helpers = {
    box(parent, x, y, z, w, h, d) {
      const mesh = new Mesh({ w, h, d }, material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    mat: () => material, wood: material, wallMaterial: material, windowTrim: material,
    oak: material, cream: material, black: material, steel: material, linen: material,
    windowFrame() {}, openingCasing() {}
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'floor-plan-3d.js'), 'utf8');
  const doorContext = { THREE: { Group }, box: helpers.box, windowTrim: material };
  vm.runInNewContext(source.slice(source.indexOf('  function singlePanelDoor('), source.indexOf('  function shakerFront(')), doorContext);
  helpers.singlePanelDoor = doorContext.singlePanelDoor;
  const casingContext={THREE:{Group,Vector3:class{}},box:helpers.box,windowTrim:material,walls:[],casingSideWidth:3.5/12,casingReveal:.125/12};
  vm.runInNewContext(source.slice(source.indexOf('  function openingCasing('),source.indexOf('  const baseTrimSections')),casingContext);
  helpers.openingCasing=casingContext.openingCasing;
  return context.buildUpstairsModel({ Group, Mesh, CylinderGeometry, BufferGeometry, Float32BufferAttribute, DoubleSide: 2 }, helpers, layout.stairOpening(), 10, edits);
}
const model = build();
test('wall-backed stair edges have no redundant guards; exposed east hall edge stays guarded', () => {
  const opening = layout.stairOpening();
  const right = opening.x + opening.width;
  const back = opening.z + opening.depth;
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
  const guards = model.group.children.filter(child => child.name === 'Upstairs Stair opening guard');
  assert.equal(guards.length, 1, 'Never restore north/west/south perimeter rails where the owner retained walls');
  const guard = guards[0];
  const rails = guard.children.filter(child => child.geometry.h === 0.07);
  const posts = guard.children.filter(child => child.geometry.h === 3);
  assert.equal(rails.length, 4);
  assert.equal(posts.length, 3);
  close(guard.rotation.y, -Math.PI / 2);
  close(guard.position.x, right);
  close(guard.position.z, (opening.z + model.baseline.arrival.z) / 2);
  const railBounds = bounds(guard);
  close(railBounds.minZ, opening.z - 0.04);
  close(railBounds.maxZ, model.baseline.arrival.z + 0.04);
  close(railBounds.minX, right - 0.04);
  close(railBounds.maxX, right + 0.04);
  for (const part of rails) close(part.geometry.w, model.baseline.arrival.z - opening.z);
  const panels = name => {
    const wall = model.group.children.find(child => child.name === `Upstairs wall: ${name}`);
    assert.ok(wall, `${name} wall must remain instead of a redundant guard`);
    return wall.children.filter(child => child.name === 'Upstairs partition');
  };
  const north = panels('Primary south');
  assert.ok(north.some(panel => {
    const b = bounds(panel);
    return b.minX <= opening.x && b.maxX >= right && b.maxZ <= opening.z && opening.z - b.maxZ < 0.1;
  }), 'North wall spans the opening with less than 1.2 in between paint and the opening');
  const west = panels('Stairwell west');
  const westSpans = west.filter(panel => panel.position.y - panel.geometry.h / 2 <= 1e-8 &&
    panel.position.y + panel.geometry.h / 2 >= 3).map(panel => {
    const b = bounds(panel);
    close(b.maxX, opening.x);
    return [b.minZ, b.maxZ];
  }).sort((a, b) => a[0] - b[0]);
  let westEnd = opening.z;
  for (const [start, end] of westSpans) {
    assert.ok(start <= westEnd + 1e-8, 'No gap in wall backing below the high west window');
    westEnd = Math.max(westEnd, end);
  }
  assert.ok(westEnd >= back, 'West wall constituents back the full opening at guard height');
  const south = panels('West bath north');
  assert.ok(south.every(panel => bounds(panel).minZ > back));
  assert.ok(south.some(panel => bounds(panel).minX < opening.x && bounds(panel).maxX >= 9.35));
  assert.ok(model.baseline.arrival.z < back, 'Upper arrival remains unblocked beyond the retained east guard');
});
test('owner image dimensions are physical paint-face gaps, not just room labels', () => {
  const face = (name, axis, side) => {
    const parts = model.group.getObjectByName
      ? model.group.getObjectByName(`Upstairs wall: ${name}`).children
      : model.group.children.find(o => o.name === `Upstairs wall: ${name}`).children;
    const panels = parts.filter(m => m.name === 'Upstairs partition');
    assert.ok(panels.length);
    return Math[side === 'min' ? 'min' : 'max'](...panels.map(p => bounds(p)[`${side}${axis}`]));
  };
  const gap = (a, b, axis) => face(b, axis, 'min') - face(a, axis, 'max');
  const closeInches = (feet, expectedFeet) => assert.ok(Math.abs((feet - expectedFeet) * 12) < .001, `${feet * 12} in != ${expectedFeet * 12} in`);
  closeInches(gap('Primary west', 'Primary suite entry', 'X'), 14 + 8 / 12);
  closeInches(gap('Primary north', 'Primary south', 'Z'), 19 + 8 / 12 + 5 / 192);
  closeInches(gap('Primary suite entry', 'Primary closet east', 'X'), 17 + 6 / 12 + 7 / 96);
  closeInches(gap('Bath south', 'Primary closet south', 'Z'), 8 + 1 / 12 + 9 / 192);
  closeInches(gap('Primary closet east', 'Bedroom 2 east', 'X'), 13);
  closeInches(gap('Bedroom 2 north', 'Bedroom 2 south', 'Z'), 12.5);
  closeInches(gap('Laundry west', 'Loft west storage', 'X'), 8.5);
  closeInches(gap('Laundry entry', 'Laundry south', 'Z'), 9.5);
  closeInches(gap('Loft west storage', 'Loft east', 'X'), 15 + 2 / 12 + 1 / 48);
  closeInches(gap('Closet 2 south', 'Loft south exterior', 'Z'), 15 + 2 / 12 + 5 / 192);
  closeInches(gap('Bedroom 3 west', 'Bedroom 3 closet', 'X'), 12.5);
  closeInches(gap('Bedroom 4 closet', 'Bedroom 4 east', 'X'), 12.5);
  closeInches(gap('Bedroom 3 north', 'Bedrooms south', 'Z'), 13);
  closeInches(gap('Bedroom 3 closet', 'Bedroom 4 closet', 'X'), 5.5 + 1 / 48);
});
test('upper arrival is one flush hardwood floor constituent with continuous gallery access', () => {
  const parts = [];
  model.group.traverse(part => { if (part.name === 'Upstairs floor: Stair arrival') parts.push(part); });
  assert.equal(parts.length, 1);
  const arrival = parts[0];
  const a = layout.stairOpening();
  const close = (x, y) => assert.ok(Math.abs(x - y) < 1e-8, `${x} != ${y}`);
  const b = bounds(arrival);
  close(b.minX, a.x + a.width);
  close(b.maxX, 13.675);
  close(b.minZ, a.z + 44 / 12 + 0.25);
  close(b.maxZ, a.z + a.depth);
  close(arrival.geometry.w * 12, 44);
  close(arrival.geometry.d * 12, 46.9);
  close(model.group.position.y + arrival.position.y + arrival.geometry.h / 2, 10);
  const gallery = model.group.children.find(p => p.name === 'Upstairs floor: Arrival gallery');
  close(bounds(gallery).minX, b.maxX);
  close(gallery.position.y + gallery.geometry.h / 2, arrival.position.y + arrival.geometry.h / 2);
  assert.equal(arrival.material, gallery.material);
  assert.equal(arrival.userData.walkSurface, true);
  const matchingAreas = model.areas.filter(p => Math.abs(p.x - b.minX) < 1e-8 && Math.abs(p.z - b.minZ) < 1e-8);
  assert.equal(matchingAreas.length, 1, 'Arrival remains in walk-surface coverage exactly once');
  close(matchingAreas[0].w, arrival.geometry.w);
  close(matchingAreas[0].d, arrival.geometry.d);
});
test('arrival floor hides and restores through the production floor selector without losing coverage', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'floor-plan-3d.js'), 'utf8');
  const object = () => ({ visible: true });
  const element = () => ({ setAttribute() {}, closest: () => ({}) });
  const state = {
    upstairs: model, stairs: object(), basementStairs: object(), upstairsStairParts: [],
    activeFloor: 'ground', groundVisibility: new Map(), groundModelRoots: [], frontPorchChairs: [],
    groundLayoutPreview: null, exterior: object(), tourMapBounds: {}, tourMap: { width: 200, setAttribute() {} },
    viewport: element(), islandLightsInput: element(), navigationMode: 'rotate',
    document: { getElementById: element, querySelector: element, querySelectorAll: () => [] },
    floorAreas: () => model.areas
  };
  vm.runInNewContext(source.slice(source.indexOf('  function selectFloor(floor) {'),
    source.indexOf('  function refreshUpstairsDimensions() {')), state);
  const arrival = model.group.children.find(p => p.name === 'Upstairs floor: Stair arrival');
  const desksAndAccessories = model.group.children.filter(p => /Bedroom [234] (writing desk|desk chair|desk wall lamp)|Upstairs Loft desk/.test(p.name));
  const poses = () => desksAndAccessories.map(p => [p.name, p.position.x, p.position.z, p.rotation.y, p.children.length]);
  const originalPoses = poses();
  for (const floor of ['upstairs', 'ground', 'exterior', 'upstairs', 'ground', 'upstairs']) {
    state.selectFloor(floor);
    assert.equal(model.group.visible, floor === 'upstairs');
    assert.equal(arrival.parent, model.group);
    assert.equal(arrival.userData.walkSurface, true);
    assert.equal(model.group.children.filter(p => p.name === arrival.name).length, 1);
    assert.deepEqual(poses(), originalPoses, 'Floor/view restoration preserves wall-backed desks and coherent accessories');
  }
});
test('upstairs room-width openings receive trim-matched single-panel operable doors', () => {
  const leaves = [];
  model.group.traverse((part) => { if (part.userData.doorStyle === 'Single recessed panel') leaves.push(part); });
  assert.equal(leaves.length, 17);
  for (const leaf of leaves) {
    assert.equal(leaf.children.filter((part) => part.name === 'Interior door single recessed field').length, 1);
    assert.equal(leaf.userData.height, 7.96);
    assert.equal(leaf.parent.userData.interactiveHouseDoor.openAngleDegrees, 0);
    assert.equal(leaf.parent.userData.interactiveHouseDoor.maxAngleDegrees, 90);
  }
});
const item = (name) => {
  const result = model.group.children.find((child) => child.name === `Upstairs ${name}`);
  assert.ok(result, `${name} exists`);
  return result;
};
function bounds(group) {
  const result = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  group.traverse((mesh) => {
    const { w, d } = mesh.geometry ?? {};
    if (w === undefined) return;
    for (const dx of [-w / 2, w / 2]) for (const dz of [-d / 2, d / 2]) {
      let worldX = dx;
      let worldZ = dz;
      for (let node = mesh; node; node = node.parent) {
        const cosine = Math.cos(node.rotation.y);
        const sine = Math.sin(node.rotation.y);
        [worldX, worldZ] = [node.position.x + cosine * worldX + sine * worldZ, node.position.z - sine * worldX + cosine * worldZ];
      }
      result.minX = Math.min(result.minX, worldX);
      result.maxX = Math.max(result.maxX, worldX);
      result.minZ = Math.min(result.minZ, worldZ);
      result.maxZ = Math.max(result.maxZ, worldZ);
    }
  });
  return result;
}

test('upstairs builds without canvas labels and retains navigation destinations', () => {
  assert.equal(model.labels, undefined);
  assert.equal(model.group.children.some((child) => /label/i.test(child.name)), false);
  assert.equal(model.mapLabels.length, model.rooms.length);
});

test('all bedrooms have bedside furniture, lighting and separate dressers', () => {
  for (const name of ['Primary', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4']) {
    const bed = item(`${name} bed`);
    assert.equal(bed.children.filter((mesh) => mesh.geometry.w === 1.55 && mesh.geometry.h === 1.9).length, name === 'Primary' ? 2 : 1);
    const mattress = bed.children.find((mesh) => mesh.name === 'Bed mattress');
    assert.equal(mattress.geometry.w * 12, name === 'Primary' ? 60 : 54);
    assert.equal(mattress.geometry.d * 12, name === 'Primary' ? 80 : 75);
    item(`${name} desk chair`);
    item(`${name} writing desk`);
    assert.equal(item(`${name} desk wall lamp`).userData.wallMounted, true);
    const bedside = name === 'Bedroom 3' ? 'right' : 'left';
    assert.equal(item(`${name} bed bedside wall lamp ${bedside}`).userData.wallMounted, true);
    item(`${name} dresser`);
  }
  for (const name of ['Bedroom 2 reading chair', 'Bedroom 3 reading chair', 'Bedroom 4 reading chair',
    'Primary media console', 'Loft reading chair', 'Loft media console', 'Loft coffee table and rug',
    'Loft desk chair', 'Laundry wall cupboards']) item(name);
});

test('bedroom furnishings clear finished room edges and each other above rugs', () => {
  for (const name of ['Primary', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4']) {
    const room = model.rooms.find((room) => room.name === (name === 'Primary' ? 'Primary bedroom' : name));
    const furnishings = ['bed', 'dresser', 'writing desk', 'desk chair'].map((suffix) => item(`${name} ${suffix}`));
    if (name === 'Primary') furnishings.push(item('Primary sitting chair 1'), item('Primary sitting chair 2'),
      item('Primary sitting side table'), item('Primary media console'));
    else furnishings.push(item(`${name} reading chair`));
    const solids = furnishings.map((furnishing) => {
      const proxy = new Group();
      proxy.position = furnishing.position;
      proxy.rotation = furnishing.rotation;
      proxy.children = furnishing.children.filter((mesh) => mesh.position.y > 0.1);
      return bounds(proxy);
    });
    for (let i = 0; i < solids.length; i++) {
      const a = solids[i];
      assert.ok(a.minX >= room.x + 0.175 - 1e-8 && a.maxX <= room.x + room.w - 0.175 + 1e-8 && a.minZ >= room.z + 0.175 - 1e-8 && a.maxZ <= room.z + room.d - 0.175 + 1e-8, furnishings[i].name);
      for (let j = 0; j < i; j++) {
        const meshes = (furnishing) => furnishing.children.filter((mesh) => mesh.position.y > 0.1).map(bounds);
        for (const first of meshes(furnishings[i])) for (const second of meshes(furnishings[j])) {
          assert.ok(Math.min(first.maxX, second.maxX) <= Math.max(first.minX, second.minX) + 0.001 || Math.min(first.maxZ, second.maxZ) <= Math.max(first.minZ, second.minZ) + 0.001, `${furnishings[i].name} overlaps ${furnishings[j].name}`);
        }
      }
    }
  }
  item('Primary wall TV');
});

test('upstairs furniture follows the supplied staged-plan composition within measured room bounds', () => {
  const primary = model.rooms.find(room => room.name === 'Primary bedroom');
  const primaryCenterX = primary.x + primary.w / 2;
  const primaryBed = item('Primary bed');
  assert.ok(Math.abs(primaryBed.position.x - g.primaryEast * 0.39) < 1e-8);
  assert.ok(Math.abs(primaryBed.position.z - (g.north + 6.7)) < 1e-8);
  assert.equal(primaryBed.rotation.y, 0, 'Primary headboard faces north');
  const primaryTV = item('Primary wall TV');
  const primaryMedia = item('Primary media console');
  assert.equal(primaryTV.rotation.y, -Math.PI / 2, 'Primary screen faces into the room from the east wall');
  assert.ok(Math.abs(primaryTV.position.x + 0.06 - (primary.x + primary.w - 0.175)) < 1e-8);
  assert.ok(Math.abs(primaryTV.position.z - (g.north + 11)) < 1e-8);
  assert.ok(Math.abs(primaryMedia.position.z - primaryTV.position.z) < 1e-8);
  const sittingChairs = [item('Primary sitting chair 1'), item('Primary sitting chair 2')];
  const sittingAxis = (sittingChairs[0].position.x + sittingChairs[1].position.x) / 2;
  assert.ok(Math.abs(sittingAxis - primaryCenterX) < 1e-8);
  assert.ok(Math.abs(item('Primary sitting side table').position.x - sittingAxis) < 1e-8);
  assert.ok(sittingChairs.every(chair => Math.abs(chair.position.z - (g.north + 14)) < 1e-8));

  const bedroom2Bed = item('Bedroom 2 bed');
  assert.ok(Math.abs(bedroom2Bed.position.x - (g.bedEast - 4.85)) < 1e-8);
  assert.ok(Math.abs(bedroom2Bed.position.z - (g.north + 4.1)) < 1e-8);
  assert.equal(bedroom2Bed.rotation.y, 0, 'Bedroom 2 headboard faces north');
  const bedroom2Chair = item('Bedroom 2 reading chair');
  assert.ok(Math.abs(bedroom2Chair.position.x - (g.bedEast - 5.2)) < 1e-8);
  assert.ok(Math.abs(bedroom2Chair.position.z - (g.loftNorth - 2.4)) < 1e-8);
  const bedroom3Bed = item('Bedroom 3 bed');
  const bedroom4Bed = item('Bedroom 4 bed');
  assert.ok(Math.abs(bedroom3Bed.position.x - 3.3) < 1e-8, 'Bedroom 3 bed shifts to the west-side zone');
  assert.ok(Math.abs(bedroom4Bed.position.x - (g.southEast - 3.3)) < 1e-8, 'Bedroom 4 bed shifts to the east-side zone');
  assert.ok([bedroom3Bed, bedroom4Bed].every(bed => bed.rotation.y === 0), 'Both southern headboards face north');
  const bedroom3Chair = item('Bedroom 3 reading chair');
  const bedroom4Chair = item('Bedroom 4 reading chair');
  assert.ok(Math.abs(bedroom3Chair.position.x - 2.5) < 1e-8);
  assert.ok(Math.abs(bedroom3Chair.position.z - (g.south - 2.6)) < 1e-8);
  assert.ok(Math.abs(bedroom4Chair.position.x - (g.southEast - 2.1)) < 1e-8);
  assert.ok(Math.abs(bedroom4Chair.position.z - (g.south - 1.9)) < 1e-8);
  const loungeChairs = [...sittingChairs, bedroom2Chair, bedroom3Chair, bedroom4Chair, item('Loft reading chair')];
  assert.ok(loungeChairs.every(chair => chair.children.some(mesh => mesh.geometry.w >= 2.3 && mesh.geometry.h >= 1.2 && mesh.geometry.d <= 0.55)),
    'Reference seating uses upholstered armchair-scale backs, not desk chairs');

  const loftSofa = item('Loft sofa');
  const loftMedia = item('Loft media console');
  const loftTable = item('Loft coffee table and rug');
  const loftCenterX = (g.laundryEast + g.east) / 2;
  assert.equal(loftSofa.rotation.y, 0, 'Loft sofa faces the north-wall media console');
  assert.ok(Math.abs(loftSofa.position.x - loftCenterX) < 1e-8);
  assert.ok(Math.abs(loftSofa.position.z - (g.serviceSouth - 1.9)) < 1e-8);
  assert.ok(Math.abs(loftTable.position.x - loftCenterX) < 1e-8);
  assert.ok(Math.abs(loftTable.position.z - (g.loftNorth + 10.05)) < 1e-8);
  assert.ok(loftMedia.position.z < loftTable.position.z, 'Media console remains north of the seating group');
  const loftRoomWidth = g.east - g.laundryEast;
  assert.ok((loftRoomWidth - 0.35 - 6) / 2 * 12 > 54, 'Centered sofa leaves over 54 in to both painted side walls');
  const sofaRearClearanceInches = (g.serviceSouth - (loftSofa.position.z + 2.8 / 2) - 0.175) * 12;
  assert.ok(Math.abs(sofaRearClearanceInches - 3.9) < 1e-8, 'Sofa clears the south finished wall by 3.9 in');
  const sofaFrontZ = loftSofa.position.z - 2.8 / 2;
  const tableSouthZ = loftTable.position.z + 2 / 2;
  assert.ok(Math.abs((sofaFrontZ - tableSouthZ) * 12 - 14.3125) < 1e-8,
    'Sofa front to coffee-table edge is about 14.3 in');
  const loftChair = item('Loft reading chair');
  assert.equal(loftChair.rotation.y, Math.PI / 4, 'Reading chair faces diagonally into the sofa group');
  assert.ok(Math.abs(loftChair.position.x - (loftCenterX + 4.8)) < 1e-8);
  assert.ok(Math.abs(loftChair.position.z - (g.loftNorth + 8.5)) < 1e-8);
  const readingTable = item('Loft reading side table');
  assert.ok(Math.abs(readingTable.position.x - (loftCenterX + 2.7)) < 1e-8);
  assert.ok(Math.abs(readingTable.position.z - (g.loftNorth + 6.4)) < 1e-8);
  const readingTableChairGap = (Math.hypot(loftChair.position.x - readingTable.position.x,
    loftChair.position.z - readingTable.position.z) - 2.25 / 2 - 1.5 / Math.SQRT2) * 12;
  assert.ok(readingTableChairGap >= 9 && readingTableChairGap <= 10,
    `Reading table is 9-10 in from chair footprint along its front axis, found ${readingTableChairGap}`);
  assert.ok(item('Loft sofa').userData.viewerFurniture);
  assert.ok(item('Loft coffee table and rug').userData.viewerFurniture);
});

test('closets have continuous rods and clothing rather than shelves called rails', () => {
  for (const name of ['Primary closet long hanging', 'Primary closet double hanging', 'Primary closet return hanging', 'Bedroom 2 closet hanging', 'Bedroom 3 closet hanging', 'Bedroom 4 closet hanging']) {
    const bay = item(name);
    const rods = bay.children.filter((mesh) => mesh.name === 'Continuous hanging rod');
    assert.equal(rods.length, bay.userData.doubleHang ? 2 : 1);
    assert.ok(rods.every((rod) => rod.geometry.length > 3.5));
    assert.ok(bay.children.some((mesh) => mesh.geometry.h === (bay.userData.doubleHang ? 2.6 : 4.8)));
    assert.equal(bay.userData.storageDepthFeet, 2);
  }
});

test('front redesign leaves window approaches and occupied desk-to-bed route clear', () => {
  const dresser = bounds(item('Bedroom 3 dresser'));
  assert.ok(dresser.minX >= g.southClosetWest - 2.2 && dresser.maxZ < g.south - 1.5, 'East-wall dresser including handles clears both front windows and entry');
  const desk = bounds(item('Bedroom 4 writing desk'));
  const chair = bounds(item('Bedroom 4 desk chair'));
  const bed = item('Bedroom 4 bed').children.find(m => m.name === 'Bed mattress');
  const mattress = bounds(bed);
  assert.ok(desk.maxZ <= 48.35 + 1e-8, 'Desk clears the closet door operating through its complete 90-degree sweep');
  assert.ok(chair.maxZ < 49.2, 'Occupied chair stays north of closet approach');
  assert.ok((mattress.minX - chair.maxX) * 12 >= 24, 'At least 24 inches remain between chair and mattress, not a certified passage');
  for (const name of ['Bedroom 3', 'Bedroom 4']) {
    for (const suffix of ['bed', 'dresser', 'writing desk', 'desk chair']) {
      const object = item(`${name} ${suffix}`);
      for (const mesh of object.children.filter(m => m.position.y > 0.1)) {
        assert.ok(bounds(mesh).maxZ < g.south - .3, `${name} front wall has no furnishings against window cranks`);
      }
    }
  }
});

test('all child and shared loft desks back onto actual wall faces with trim-clear legs and coherent accessories', () => {
  for (const [name, wallName, rotation] of [
    ['Bedroom 2', 'Bedroom 2 north', 0],
    ['Bedroom 3', 'Bedroom 3 closet', -Math.PI / 2],
    ['Bedroom 4', 'Bedroom 4 closet', Math.PI / 2],
    ['Loft', 'Loft east', -Math.PI / 2]
  ]) {
    const desk = item(name === 'Loft' ? 'Loft desk' : `${name} writing desk`);
    const wall = model.plan.walls.find(w => w.name === wallName);
    const top = desk.children.find(m => /desktop/i.test(m.name));
    const sine = Math.sin(rotation), cosine = Math.cos(rotation);
    const normal = b => Math.abs(sine) > 0.5 ? (sine > 0 ? b.minX : -b.maxX) : b.minZ;
    const face = (Math.abs(sine) > 0.5 ? sine * wall.x1 : wall.z1) + wall.thickness / 2;
    assert.equal(desk.rotation.y, rotation);
    assert.ok(Math.abs(normal(bounds(top)) - face) < 1e-8, `${name}: rear desktop meets paint, not its front`);
    const legs = desk.children.filter(m => m.geometry.h === 2.5);
    assert.equal(legs.length, 2);
    for (const leg of legs) assert.ok(Math.abs((normal(bounds(leg)) - face - .0625) * 12 - .45) < 1e-8, `${name}: legs clear 3/4-inch baseboard by .45 inch`);
    const seat = item(`${name} desk chair`);
    assert.ok(Math.abs(seat.position.x - desk.position.x - sine * 1.9) < 1e-8);
    assert.ok(Math.abs(seat.position.z - desk.position.z - cosine * 1.9) < 1e-8);
    if (name !== 'Loft') {
      const light = item(`${name} desk wall lamp`);
      assert.ok(Math.abs(normal(bounds(light.children[0])) - face) < 1e-8, 'Backplate meets paint without penetration');
    }
    for (const mesh of meshes(desk)) {
      for (const wallGroup of model.group.children.filter(o => o.name?.startsWith('Upstairs wall:'))) {
        for (const part of meshes(wallGroup)) assert.ok(!positiveOverlap(constituent(mesh), constituent(part)), `${name} hits ${wallGroup.name}/${part.name}`);
      }
    }
  }
});

test('desk wall backing follows resolved saved wall thickness without modifying the saved document', () => {
  const edits = layout.empty();
  const wall = model.plan.walls.find(w => w.name === 'Bedroom 4 closet');
  edits.walls.push({ name: wall.name, x1: wall.x1, z1: wall.z1, x2: wall.x2, z2: wall.z2, thickness: .5 });
  const before = JSON.stringify(edits);
  const changed = build(edits);
  const get = name => changed.group.children.find(o => o.name === `Upstairs Bedroom 4 ${name}`);
  assert.ok(Math.abs(bounds(get('writing desk').children[0]).minX - (g.southClosetEast + .25)) < 1e-8);
  assert.ok(Math.abs(get('desk chair').position.x - get('writing desk').position.x - 1.9) < 1e-8);
  assert.ok(Math.abs(bounds(get('desk wall lamp').children[0]).minX - (g.southClosetEast + .25)) < 1e-8);
  assert.equal(JSON.stringify(edits), before);
});

test('wall lamps mount on solid wall rather than across windows or door openings', () => {
  for (const lamp of model.group.children.filter((object) => object.userData.wallMounted)) {
    const { x, z } = lamp.position;
    const host = model.plan.walls.find((wall) => {
      const vertical = Math.abs(wall.x1 - wall.x2) < 0.001;
      const along = vertical ? z - wall.z1 : x - wall.x1;
      return Math.abs((vertical ? x : z) - (vertical ? wall.x1 : wall.z1)) < 0.3 && along > 0 && along < Math.hypot(wall.x2 - wall.x1, wall.z2 - wall.z1);
    });
    assert.ok(host, `${lamp.name} has a supporting wall`);
    const along = Math.abs(host.x1 - host.x2) < 0.001 ? z - host.z1 : x - host.x1;
    assert.ok(host.openings.every(([start, end, bottom, top]) => top < 4.9 || bottom > 5.6 || along + 0.28 <= start || along - 0.28 >= end), `${lamp.name} clears openings`);
  }
});

test('measured primary closet includes hardware in its aisle and clears the bedroom entry', () => {
  const dresser = bounds(item('Primary closet drawers'));
  const hanging = bounds(item('Primary closet long hanging'));
  assert.ok(Math.abs((hanging.minZ - dresser.maxZ) * 12 - 52.5625) < 0.001);
  for (const name of ['Primary closet long hanging', 'Primary closet double hanging', 'Primary closet folded clothes']) {
    const b = bounds(item(name));
    assert.ok(b.minZ >= g.closetNorth + 4, `${name} clears west entry`);
    assert.ok(b.maxZ <= g.loftNorth - .2375, `${name} clears south wall trim`);
    assert.ok(b.maxX <= g.closetEast - .2375, `${name} clears east wall`);
  }
  assert.ok(bounds(item('Primary closet return hanging')).minZ > g.north + .2375);
});

test('bedroom 2 toilet no longer overlaps the vanity', () => {
  const toilet = bounds(item('Bedroom 2 toilet'));
  const vanity = bounds(item('Bedroom 2 vanity'));
  assert.ok(toilet.maxZ < vanity.minZ);
});

test('primary bathroom follows owner marks: east-wall tub, north-window double vanity and west linen door', () => {
  const tub = item('Primary built-in tub'), shower = item('Primary shower'), vanity = item('Primary double vanity');
  assert.ok(!model.group.children.some(o => o.name === 'Upstairs Primary freestanding tub'));
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
  const t = bounds(tub), s = bounds(shower), v = bounds(vanity);
  close((t.maxX - t.minX) * 12, 36);
  close((t.maxZ - t.minZ) * 12, 66);
  const deck = meshes(tub).filter(o => o.name.startsWith('Primary tub deck ') && !o.name.includes('faucet'));
  assert.equal(deck.length, 4);
  close(Math.max(...deck.map(m => constituent(m).high)) - 10, 20 / 12);
  const window = model.plan.windows.find(w => w[0] === 'Primary bath');
  assert.ok(window);
  close(tub.rotation.y, Math.PI / 2);
  close((g.bathEast - g.t / 2 - t.maxX) * 12, 1.5);
  close((t.minZ - g.bathNorth - g.t / 2) * 12, 1.5);
  close((g.closetNorth - g.t / 2 - s.maxZ) * 12, 1.5);
  close((s.maxX - s.minX) * 12, 48);
  close((s.maxZ - s.minZ) * 12, 60);
  close((s.minZ - t.maxZ) * 12, 15.2375);
  assert.deepEqual(Array.from(vanity.userData.cabinetWidthsInches), [30, 12, 30]);
  assert.equal(meshes(vanity).filter(m => m.name === 'Primary vanity bowl bottom').length, 2);
  const mirrors = item('Primary bath mirrors');
  assert.equal(meshes(mirrors).filter(m => m.name === 'Primary vanity mirror').length, 2);
  assert.ok(bounds(mirrors).minZ > g.closetNorth - 0.35, 'Mirrors retained on solid south wall, not over window');
  close(vanity.rotation.y, 0);
  assert.ok(window[1] > v.minX && window[1] < v.maxX, 'Vanity now sits beneath retained north window');
  close(v.minZ - (g.bathNorth + g.t / 2), 0.075);
  close((t.minX - v.maxX) * 12, 17.8875);
  assert.ok(t.minZ < v.maxZ, 'Tub occupies marked northeast zone beside, not south of, the vanity');
  close(shower.rotation.y, Math.PI);
  for (const m of meshes(vanity).filter(o => !o.name?.includes('faucet'))) assert.ok(constituent(m).high < 13, 'Counter and backsplash remain below the 36-inch window sill');
  for (const [a, b] of [[tub, shower], [tub, vanity], [shower, vanity], [mirrors, shower], [mirrors, tub]]) {
    for (const m of meshes(a)) for (const n of meshes(b)) assert.ok(!positiveOverlap(constituent(m), constituent(n)), `${a.name}/${b.name}`);
  }
});

test('primary fixture approaches and shower entrance have physical clear space, not only labels', () => {
  const fixtures = ['Primary built-in tub', 'Primary shower', 'Primary double vanity', 'Primary toilet'].map(item);
  const walls = model.group.children.filter(o => o.name?.startsWith('Upstairs wall:')).flatMap(meshes);
  const solids = [...walls, ...fixtures.flatMap(meshes)].map(constituent);
  const clearRectangle = (x, z, width, depth) => {
    const region = { vertices: [[x-width/2,z-depth/2],[x+width/2,z-depth/2],[x+width/2,z+depth/2],[x-width/2,z+depth/2]], low: 10.25, high: 16 };
    for (const solid of solids) assert.ok(!positiveOverlap(region, solid), `Blocked approach at ${x}, ${z}`);
  };
  const vanity = item('Primary double vanity'), v = bounds(vanity);
  for (const dx of [-1.75, 1.75]) clearRectangle(vanity.position.x + dx, v.maxZ + 1.25, 2.5, 2.5);
  const tub = bounds(item('Primary built-in tub'));
  clearRectangle(tub.minX - 1.25, tub.maxZ - 1.3, 2.5, 2.5);
  const shower = item('Primary shower');
  const entryGlass = bounds(meshes(shower).find(m => m.name === 'Primary shower fixed entry glass'));
  const s = bounds(shower);
  const northGlass = bounds(meshes(shower).find(m => m.name === 'Primary shower fixed north glass'));
  assert.ok((entryGlass.minZ - northGlass.maxZ) * 12 >= 35.6, 'West entry retains at least 35.6 inches between actual glass constituents');
  clearRectangle(s.minX - 1.3, (entryGlass.minZ + northGlass.maxZ) / 2, 2.5, 2.5);
  const door = item('wall: Toilet partition').children.find(o => o.userData.interactiveHouseDoor);
  assert.equal(door.userData.interactiveHouseDoor.closedRotationY, Math.PI, 'South-jamb hinge clears the tub without moving the WC opening');
});

test('mark 3 is an enclosed linen closet with an operable 18 by 96 inch door and four fixed shelves', () => {
  const host = item('wall: Toilet partition');
  const doors = host.children.filter(o => o.userData.interactiveHouseDoor);
  assert.equal(doors.length, 2, 'Private WC entry and a separate linen entry');
  const door = doors.find(o => o.userData.nominalOpeningFeet === 1.5);
  assert.ok(door);
  assert.equal(door.userData.interactiveHouseDoor.openAngleDegrees, 0);
  const leaf = door.children.find(o => o.userData.doorStyle);
  assert.equal(leaf.userData.height, 7.96);
  const shelves = item('Primary bath linen shelves');
  assert.equal(meshes(shelves).filter(m => m.name === 'Primary linen fixed shelf').length, 4);
  const b = bounds(shelves);
  assert.ok(b.minX > g.primaryEast - 3.35 + g.t / 2);
  assert.ok(b.maxX < g.primaryEast - g.t / 2);
  assert.ok(b.minZ > g.north - 2.35 + g.t / 2);
  assert.ok(b.maxZ < g.north - g.t / 2);
  for (const m of meshes(shelves)) {
    assert.equal(m.geometry.w * 12, 15);
    assert.ok(Math.abs(m.geometry.d * 12 - 22.8) < 0.001);
  }
});

test('primary vanity cabinet doors and three center drawers operate clear of the shell and adjacent fixtures', () => {
  const fresh = build(), vanity = fresh.group.children.find(o => o.name === 'Upstairs Primary double vanity');
  const source = fs.readFileSync(path.join(__dirname, '..', 'floor-plan-3d.js'), 'utf8');
  const start = source.indexOf('  function toggleCabinet('), end = source.indexOf('  function singlePanelDoor(');
  assert.ok(start > 0 && end > start);
  const material = {};
  const context = {
    cabinetRailFinish: material, cabinetFinish: material,
    box(parent, x, y, z, w, h, d) {
      const mesh = new Mesh({ w, h, d }, material);
      mesh.position.set(x, y, z); parent.add(mesh); return mesh;
    }
  };
  vm.runInNewContext(source.slice(start, end), context);
  context.prepareCabinetInteractions(vanity);
  const fronts = [];
  vanity.traverse(o => { if (o.userData.interactiveCabinet) fronts.push(o); });
  assert.equal(fronts.filter(o => o.userData.interactiveCabinet.kind === 'drawer').length, 3);
  assert.equal(fronts.filter(o => o.userData.interactiveCabinet.kind === 'hinged').length, 4);
  const external = fresh.group.children.filter(o => o !== vanity && (o.name?.startsWith('Upstairs wall:') || /Upstairs Primary (built-in tub|shower|toilet)/.test(o.name))).flatMap(meshes);
  const fixedCabinet = meshes(vanity).filter(m => {
    for (let node = m; node !== vanity; node = node.parent) if (node.userData.cabinetFront) return false;
    return true;
  });
  for (const front of fronts) {
    const operation = front.userData.interactiveCabinet;
    const closed = { ...front.position };
    context.toggleCabinet(front);
    for (let step = 0; step <= 30; step++) {
      const fraction = step / 30;
      const angle = operation.kind === 'hinged' ? operation.hingeSide * fraction * Math.PI / 2 : 0;
      const hinge = operation.hingeSide * front.userData.width / 2;
      front.rotation.y = angle;
      front.position.x = closed.x + (operation.kind === 'hinged' ? hinge * (1 - Math.cos(angle)) : 0);
      front.position.z = closed.z + (operation.kind === 'hinged' ? hinge * Math.sin(angle) : fraction * operation.travel);
      for (const m of meshes(front)) for (const obstacle of [...external, ...fixedCabinet]) assert.ok(!positiveOverlap(constituent(m), constituent(obstacle)), `${front.name} clashes at ${fraction} with ${obstacle.name}`);
    }
    if (operation.kind === 'drawer') assert.ok(Math.abs((front.position.z - closed.z) * 12 - 15) < 0.001);
    context.toggleCabinet(front);
    assert.deepEqual(front.position, closed);
    assert.equal(front.rotation.y, 0);
    assert.equal(operation.open, false);
  }
});

test('closet inspection reveals hanging contents and other views restore canopy shelves', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'floor-plan-3d.js'), 'utf8');
  const start = source.indexOf('    upstairs.group.traverse((object) => {', source.indexOf('  function setView(name)'));
  assert.ok(start > 0);
  const end = source.indexOf('    const planView', start);
  const canopies = [];
  model.group.traverse((object) => { if (object.userData.closetCanopy) canopies.push(object); });
  assert.equal(canopies.length, 6);
  for (const name of ['upstairs-primary-closet', 'upstairs', 'whole', 'upstairs-bedroom-2-closet', 'upstairs-top']) {
    vm.runInNewContext(source.slice(start, end), { upstairs: model, name });
    assert.ok(canopies.every((object) => object.visible === !name.includes('closet')), name);
  }
});

// Constituent oriented rectangles: do not mistake the empty interior of an
// assembled cabinet, chair or shower for solid material.
function constituent(mesh) {
  const { w, h, d } = mesh.geometry;
  let y = 0;
  for (let node = mesh; node; node = node.parent) y += node.position.y;
  const vertices = [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,z]) => {
    for (let node = mesh; node; node = node.parent) {
      const c = Math.cos(node.rotation.y), s = Math.sin(node.rotation.y);
      [x,z] = [node.position.x+c*x+s*z,node.position.z-s*x+c*z];
    }
    return [x,z];
  });
  return { vertices, low: y-h/2, high: y+h/2 };
}
function positiveOverlap(a, b, tolerance = 0.015) {
  if (Math.min(a.high,b.high)-Math.max(a.low,b.low) <= tolerance) return false;
  for (const vertices of [a.vertices,b.vertices]) for (let i=0;i<4;i++) {
    const p=vertices[i], q=vertices[(i+1)%4], ax=-(q[1]-p[1]), az=q[0]-p[0];
    const first=a.vertices.map(([x,z])=>x*ax+z*az), second=b.vertices.map(([x,z])=>x*ax+z*az);
    if (Math.min(Math.max(...first),Math.max(...second))-Math.max(Math.min(...first),Math.min(...second)) <= tolerance*Math.hypot(ax,az)) return false;
  }
  return true;
}
function meshes(root) {
  const result=[];
  root.traverse(o=>{if(o.geometry?.w !== undefined) result.push(o);});
  return result;
}
test('closed leaves and full 90-degree sweeps clear fixtures/walls with tucked and pulled-out desk chairs', () => {
  const doors=[];
  model.group.traverse(o=>{if(o.userData.interactiveHouseDoor) doors.push(o);});
  const chairs=['Primary','Bedroom 2','Bedroom 3','Bedroom 4'].map(n=>item(`${n} desk chair`));
  const poses=chairs.map(c=>({...c.position}));
  for(const pullback of [0,.75]) {
  chairs.forEach((c,i)=>{
    c.position.x=poses[i].x+Math.sin(c.rotation.y)*pullback;
    c.position.z=poses[i].z+Math.cos(c.rotation.y)*pullback;
  });
  for (const door of doors) {
    const obstacles=meshes(model.group).filter(m=>{
      let n=m;
      while(n && n!==model.group) {
        if(n===door.parent) return false; // Own jamb contact is intentional.
        n=n.parent;
      }
      const b=constituent(m);
      return b.high>10.1 && b.low<18 && !m.name?.includes('floor:');
    }).map(m=>({m,b:constituent(m)}));
    for(let degrees=0;degrees<=90;degrees+=3) {
      door.rotation.y=door.userData.interactiveHouseDoor.closedRotationY+degrees*Math.PI/180*door.userData.interactiveHouseDoor.openRotationSign;
      for(const leaf of meshes(door)) for(const {m,b} of obstacles) {
        assert.ok(!positiveOverlap(constituent(leaf),b),`${door.name} at ${degrees} overlaps ${m.parent.name}/${m.name}`);
      }
    }
    door.rotation.y=door.userData.interactiveHouseDoor.closedRotationY;
    assert.equal(door.userData.interactiveHouseDoor.openAngleDegrees,0);
  }
  }
  chairs.forEach((c,i)=>Object.assign(c.position,poses[i]));
});

test('image service core has west linen/furnace and a usable laundry aisle', () => {
  const wall=(name)=>model.plan.walls.find(w=>w.name===name);
  assert.equal(wall('Laundry entry').x1,g.southEast);
  const trimProjection=.175+.0625;
  assert.ok(wall('Storage west').x1 < wall('Laundry west').x1);
  assert.ok((g.laundryNorth-g.loftNorth-2*trimProjection)*12>62);
  const washer=bounds(item('Washer')), counter=bounds(item('Laundry folding counter'));
  assert.ok((washer.minZ-counter.maxZ)*12>=45,'Hardware included in folding aisle');
  assert.ok((g.serviceSouth-trimProjection-washer.maxZ)*12>=4.3,'Reserve rear hookup depth beyond finished baseboard');
  assert.equal(wall('Primary closet east').openings.length,0,'No access through another child bedroom');
  assert.deepEqual(Array.from(model.start),[16.5,33]);
});

test('changed fixtures clear finished walls and gallery floor pieces do not overlap', () => {
  const walls=model.group.children.filter(o=>o.name?.startsWith('Upstairs wall:')).flatMap(o=>o.children.filter(m=>m.geometry?.w!==undefined));
  for(const name of ['Primary built-in tub','Primary shower','Primary double vanity','Primary toilet','Primary bath mirrors','Primary bath linen shelves','Washer','Dryer','Laundry folding counter','Laundry wall cupboards','Linen shelves','Mechanical equipment reservation','West bath vanity','East bath vanity','West bath toilet','East bath toilet','West bath shower','East bath shower']) {
    for(const m of meshes(item(name))) for(const w of walls) assert.ok(!positiveOverlap(constituent(m),constituent(w)),`${name} penetrates ${w.parent.name}/${w.name}`);
  }
  const floors=model.plan.floors;
  for(let i=0;i<floors.length;i++)for(let j=0;j<i;j++){
    const a=floors[i],b=floors[j];
    assert.ok(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)<.001 || Math.min(a.z+a.d,b.z+b.d)-Math.max(a.z,b.z)<.001,`${a.name}/${b.name} have duplicate floor coverage`);
  }
});

test('front-entry projecting casing caps clear perpendicular bathroom and closet returns', () => {
  for(const name of ['Bedroom 3 north','Bedroom 4 north']) {
    const host=item(`wall: ${name}`);
    const casings=host.children.filter(o=>o.name==='Craftsman opening casing');
    assert.equal(casings.length,4, 'Bedroom and ensuite bathroom cuts are both trimmed');
    for(const casing of casings) {
      assert.equal(casing.userData.sideWidthInches,2.5);
      for(const m of meshes(casing)) for(const wall of model.group.children.filter(o=>o.name?.startsWith('Upstairs wall:')&&o!==host)) {
        for(const n of wall.children.filter(o=>o.geometry?.w!==undefined)) assert.ok(!positiveOverlap(constituent(m),constituent(n)),`${name}: ${m.name} penetrates ${wall.name}`);
      }
    }
  }
});

test('open-door tour routes reach every private room and service without crossing shower pans', () => {
  const doors=[];
  model.group.traverse(o=>{if(o.userData.interactiveHouseDoor) doors.push(o);});
  for(const d of doors) d.rotation.y=d.userData.interactiveHouseDoor.closedRotationY+Math.PI/2*d.userData.interactiveHouseDoor.openRotationSign;
  for(let i=0;i<doors.length;i++)for(let j=0;j<i;j++)for(const a of meshes(doors[i]))for(const b of meshes(doors[j]))assert.ok(!positiveOverlap(constituent(a),constituent(b)),`${doors[i].name} clashes with ${doors[j].name} when all leaves are open`);
  const floors=[...model.areas];
  const obstacles=meshes(model.group).filter(m=>{
    const b=constituent(m);
    return b.high>10.5 && b.low<15.5;
  }).map(bounds);
  // A pan is a destination, not a through-route to a toilet or another room.
  for(const name of ['West bath shower','East bath shower','Bedroom 2 shower','Primary shower']) obstacles.push(bounds(item(name)));
  const inside=(x,z)=>floors.some(f=>x>=f.x&&x<=f.x+f.w&&z>=f.z&&z<=f.z+f.d);
  const can=(x,z)=>[[-.5,-.5],[-.5,.5],[.5,-.5],[.5,.5]].every(([dx,dz])=>inside(x+dx,z+dz)) &&
    !obstacles.some(b=>Math.hypot(x-Math.max(b.minX,Math.min(x,b.maxX)),z-Math.max(b.minZ,Math.min(z,b.maxZ)))<.5-.001);
  const queue=[[16.5,33]], visited=new Set(['66,132']);
  for(let n=0;n<queue.length;n++){
    const [x,z]=queue[n];
    for(const [dx,dz] of [[.25,0],[-.25,0],[0,.25],[0,-.25]]){
      const a=x+dx,b=z+dz,key=`${a*4},${b*4}`;
      if(a<0||a>57||b< -2||b>55||visited.has(key)||!can(a,b)) continue;
      visited.add(key);queue.push([a,b]);
    }
  }
  const destinations={
    'primary bedroom':[11,24], 'primary bath':[20,8], 'primary toilet':[13.25,2.25],
    'primary tub approach':[22.5,3.25], 'primary shower approach':[21.5,7.5],
    'primary vanity west basin':[17.75,3], 'primary vanity east basin':[21.25,3],
    'primary linen approach':[16.5,5.5], 'primary linen shelf access':[14,5.5],
    'primary closet':[21,15.75], 'bedroom 2':[35,17], 'bedroom 2 bath':[48,9.5],
    'bedroom 2 closet':[49,16],     'bedroom 3':[7,47], 'bedroom 3 closet':[14.5,43],
    'bedroom 4':[22.75,48.5], 'bedroom 4 closet':[16,49], 'west toilet approach':[4.75,39],
    'east toilet approach':[26.75,39], laundry:[36,30], linen:[23.5,32],
    mechanical:[27,32], loft:[41,23], 'loft seating':[45,29]
  };
  const missing=Object.entries(destinations).filter(([, [x,z]])=>!visited.has(`${x*4},${z*4}`)).map(([name,[x,z]])=>`${name} (${can(x,z)?'disconnected':'destination blocked'})`);
  assert.deepEqual(missing,[],'Every destination has a continuous route for the 12-inch-diameter model tour avatar');
  for(const d of doors) d.rotation.y=d.userData.interactiveHouseDoor.closedRotationY;
  assert.ok(queue.length>1000);
});

test('real upstairs door/cabinet click handler invalidates tour collisions after each operation', () => {
  const source=fs.readFileSync(path.join(__dirname,'..','floor-plan-3d.js'),'utf8');
  const wall=item('wall: Bedroom 3 north');
  const hinge=wall.children.find(o=>o.userData.interactiveHouseDoor);
  let selected=hinge.children[0], rebuilds=0, cabinetToggles=0;
  for(let n=selected;n;n=n.parent)n.visible=true;
  const context={
    activeFloor:'upstairs',groundLayoutPreview:null,
    visiblePickTargets(){return[];},
    renderer:{domElement:{getBoundingClientRect:()=>({left:0,top:0,width:800,height:600})}},
    scene:{children:[],updateMatrixWorld(){}},camera:{updateMatrixWorld(){}},
    THREE:{Vector2:class{},Raycaster:class{setFromCamera(){}intersectObjects(){return[{object:selected}]}},MathUtils:{degToRad:d=>d*Math.PI/180}},
    buildWalkObstacles(){rebuilds++;},render(){},toggleCabinet(){cabinetToggles++;}
  };
  vm.runInNewContext(source.slice(source.indexOf('  function pickHouseDoor('),source.indexOf('  const charger = furnishing(')),context);
  assert.equal(context.pickHouseDoor({clientX:400,clientY:300}),true);
  assert.equal(hinge.userData.interactiveHouseDoor.openAngleDegrees,90);
  assert.equal(hinge.rotation.y,Math.PI/2, 'The first cut is the image ensuite, swinging into the bath');
  assert.equal(context.pickHouseDoor({clientX:400,clientY:300}),true);
  assert.equal(hinge.rotation.y,0);
  selected={visible:true,userData:{interactiveCabinet:{}}};
  context.pickHouseDoor({clientX:400,clientY:300});
  assert.equal(cabinetToggles,1);
  assert.equal(rebuilds,3);
});
