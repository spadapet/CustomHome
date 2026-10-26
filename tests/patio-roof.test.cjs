'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function buildRoof() {
  class BoxGeometry {
    constructor(w, h, d) {
      this.parameters = { width: w, height: h, depth: d };
      const vertices = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x * w / 2, y * h / 2, z * d / 2])));
      this.attributes = { position: { count: vertices.length, getX: (i) => vertices[i][0], getY: (i) => vertices[i][1], getZ: (i) => vertices[i][2], setY: (i, y) => { vertices[i][1] = y; } } };
    }
    computeVertexNormals() {}
  }
  class Mesh {
    constructor(geometry, material) {
      Object.assign(this, { geometry, material, rotation: {}, userData: {} });
      this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.scale = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
    }
  }
  const walls = [], meshes = [];
  class Group {
    constructor() { this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } }; this.rotation = {}; this.userData = {}; }
    add(mesh) { mesh.parent = this; meshes.push(mesh); }
  }
  const context = {
    lot: { left: -13.605, right: 61.395, rear: -32.325 }, fenceBoundaryInset: 0.5,
    THREE: { BoxGeometry, SphereGeometry: class extends BoxGeometry { constructor(radius) { super(radius * 2, radius * 2, radius * 2); } }, PointLight: class extends Group { constructor(color, intensity, distance, decay) { super(); Object.assign(this, { color, intensity, distance, decay }); } }, Mesh, Group }, livingFeatureWall: require('../floor-plan-ground.js').getLivingRoomFeatureLayout(), glass: {}, mat: () => ({}), wallThickness: 0.45, frontBrick: {}, brickFaceUVs() {}, wood: {}, dark: {}, white: {}, baseStone: {}, stepStone: {}, stepEdge: {}, glow: {},
    patio: { add(mesh) { meshes.push(mesh); } },
    group: { add(mesh) { meshes.push(mesh); } },
    texturedBox(parent, x, y, z, w, h, d) {
      const mesh = new Mesh(new BoxGeometry(w, h, d), {});
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    wall(name, x1, z1, x2, z2, bottom, top) { walls.push({ name, x1, z1, x2, z2, bottom, top }); }
  };
  context.box = context.texturedBox;
  context.paving = (parent, name, x, z, w, d, top = -1.35, thickness = 0.3) => {
    const mesh = context.box(parent, x + w / 2, top - thickness / 2, z + d / 2, w, thickness, d);
    mesh.name = name;
    mesh.userData = { x, z, widthFeet: w, depthFeet: d, topFeet: top };
    return mesh;
  };
  const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  const start = source.indexOf('  const patioBounds =');
  const end = source.indexOf('  const portableFirepit =', start);
  assert.ok(start >= 0 && end > start);
  vm.createContext(context);
  const siteStart = source.indexOf('  const fenceLeft =');
  const siteEnd = source.indexOf('  const eaves =', siteStart);
  assert.ok(siteStart >= 0 && siteEnd > siteStart);
  vm.runInContext(source.slice(siteStart, siteEnd), context);
  vm.runInContext(source.slice(start, end), context);
  const stepsStart = source.indexOf('  function exteriorSteps(');
  const stepsEnd = source.indexOf("  paving(group, 'Covered front porch'", stepsStart);
  assert.ok(stepsStart >= 0 && stepsEnd > stepsStart);
  vm.runInContext(source.slice(stepsStart, stepsEnd), context);
  return { walls, meshes, context, underside: vm.runInContext('patioRoofUndersideAt', context) };
}

test('sloping cover relocates behind living room and leaves both kitchen frontages open', () => {
  const { walls, meshes, underside } = buildRoof();
  const roof = meshes.find((mesh) => mesh.name === 'Brown-shingle covered patio roof');
  assert.equal(roof.userData.pitch, 3 / 16);
  assert.equal(roof.userData.limits.rear, -0.325);
  assert.equal(roof.userData.limits.front, 8.225);
  assert.equal(roof.userData.limits.left, 0);
  assert.equal(roof.userData.limits.right, 13.2);
  assert.equal(roof.geometry.parameters.width, 13.2);
  assert.equal(roof.position.x, 6.6);
  assert.equal(roof.position.y, 9.1);
  assert.ok(underside(0.625) > 8.35, 'Roof clears the dining west-window head trim including its projection beyond the opening');
  assert.equal(roof.userData.kitchenAndPrepFrontageOpen, true);
  assert.equal(roof.userData.coversDiningLanding, false);
  assert.equal(roof.userData.livingRoomDaylightReduced, true);
  assert.equal(roof.userData.daylightPerformanceVerified, false);
  const headwall = walls.find((wall) => wall.name === 'Patio roof raised headwall');
  assert.equal(headwall.x1, 13.2);
  assert.equal(headwall.x2, 0);
  assert.equal(headwall.z1, 8);
  assert.equal(headwall.bottom, 9);
  assert.ok(headwall.top >= underside(8 + 0.225), 'Wall reaches the underside across its full thickness');
  assert.ok(!walls.some((wall) => wall.name === 'Patio roof upper-wall return'), 'No obsolete prep-side upper return remains');
});

test('dining-side tapered closure meets the roof slope without adding a wall on the open west side', () => {
  const { meshes, underside } = buildRoof();
  const closures = meshes.filter((mesh) => /tapered closure/.test(mesh.name));
  assert.equal(closures.length, 1);
  assert.equal(closures[0].name, 'Patio roof east tapered closure');
  assert.equal(closures[0].position.x, 13.2);
  for (const mesh of closures) {
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = mesh.position.y + p.getY(i), z = mesh.position.z + p.getZ(i);
      assert.ok(y >= 9, 'No closure intrudes into doors/windows below the wall head');
      if (y > 9) assert.ok(Math.abs(y - underside(z) - 0.02) < 1e-9, 'Sloped top closes directly against roof underside');
    }
  }
});

test('one retained post and two compact patio chairs leave the dining-step approach open', () => {
  const { meshes } = buildRoof();
  const posts = meshes.filter((mesh) => mesh.name === 'Patio timber support post');
  const feet = meshes.filter((mesh) => mesh.name === 'Patio post stone foot');
  assert.equal(posts.length, 1);
  assert.equal(feet.length, 1);
  assert.equal(posts[0].position.x, 0.75);
  assert.ok(Math.abs(posts[0].position.z - 0.275) < 1e-9);
  assert.equal(feet[0].position.x, posts[0].position.x);
  assert.equal(feet[0].position.z, posts[0].position.z);
  for (const post of meshes.filter((mesh) => mesh.name === 'Patio timber support post')) {
    assert.equal(post.geometry.parameters.width, 0.75);
    assert.equal(post.geometry.parameters.depth, 0.75);
    assert.equal(post.userData.widthInches, 9);
  }
  assert.equal(meshes.filter((mesh) => mesh.name === 'Patio perimeter beam').length, 2);
  const chairs = meshes.filter((mesh) => mesh.name === 'Outdoor patio chair');
  assert.equal(chairs.length, 2);
  assert.ok(!meshes.some((mesh) => /Outdoor dining chair|Outdoor dining table/.test(mesh.name)), 'Old four-seat dining set is removed');
  const table = meshes.find((mesh) => mesh.name === 'Outdoor small side table');
  assert.equal(table.position.x, 3.5);
  assert.ok(Math.abs(table.position.z - 6.65) < 1e-9);
  assert.equal(table.geometry.parameters.width * 12, 18);
  assert.equal(table.geometry.parameters.depth * 12, 18);
  assert.ok(Math.abs((table.position.y + table.geometry.parameters.height / 2) * 12 - 20) < 1e-9);
  assert.ok(Math.abs((chairs[0].position.x + chairs[1].position.x) / 2 - table.position.x) < 1e-9, 'Small table sits between the two chairs');
  assert.equal(table.parent.position.y, -1.625);
  for (const mesh of meshes.filter((mesh) => /Patio (timber|post|perimeter)|Outdoor/.test(mesh.name))) {
    const { width, depth } = mesh.geometry.parameters;
    const left = mesh.position.x - width / 2, right = mesh.position.x + width / 2;
    const rear = mesh.position.z - depth / 2, front = mesh.position.z + depth / 2;
    assert.ok(left >= 0.25 && right <= 12.95, `${mesh.name} stays on the living-room terrace`);
    assert.ok(rear >= -0.325 && front <= 7.75, `${mesh.name} stays on the living-room terrace`);
    if (mesh.name.startsWith('Outdoor')) assert.ok(right <= 6.55 + 1e-9, `${mesh.name} clears the west-descending stair`);
    if (mesh.name.startsWith('Outdoor')) assert.ok(rear >= 5.5, `${mesh.name} preserves a 5.5 ft-deep static approach strip at z = 0-5.5, not occupied-use approval`);
    if (mesh.name.startsWith('Outdoor')) assert.ok(front <= 7.5 + 1e-9, `${mesh.name} stays about 3.3 inches off the wall face at z = 7.775`);
    if (mesh.name === 'Patio timber support post' || mesh.name === 'Patio post stone foot') assert.ok(Math.abs(mesh.position.y - mesh.geometry.parameters.height / 2 + 1.625) < 1e-9, 'Support base meets ground-level patio');
  }
  assert.ok(!posts.some((post) => post.position.x > 10 || post.position.z > 6), 'All three circled posts are removed rather than hidden');
  const terrace = meshes.find((mesh) => mesh.name === 'Ground-level living-room patio terrace');
  assert.equal(terrace.userData.topFeet, -1.625);
  assert.ok(Math.abs(terrace.userData.x + 5.855) < 1e-9);
  assert.ok(Math.abs(terrace.userData.widthFeet - 18.805) < 1e-9);
  assert.ok(Math.abs(terrace.userData.depthFeet - 12.1) < 1e-9);
  assert.equal(terrace.userData.z, -4.325);
  const roof = meshes.find((mesh) => mesh.name === 'Brown-shingle covered patio roof');
  assert.equal(roof.userData.limits.rear - terrace.userData.z, 4, 'Four-foot yard extension is beyond the unchanged roof');
  assert.equal(roof.userData.limits.left, 0, 'No roof enlargement over the new side extension');
  const transition = meshes.find((mesh) => mesh.name === 'Patio to west fence-path grade transition');
  assert.ok(Math.abs(transition.userData.x + 8.855) < 1e-9, 'Patio reaches the west fence-path inner edge');
  assert.ok(Math.abs(transition.userData.x + transition.userData.widthFeet - terrace.userData.x) < 1e-9, 'Graded strip joins the level terrace without overlap');
  assert.equal(transition.userData.depthFeet, terrace.userData.depthFeet);
  const positions = transition.geometry.attributes.position;
  for (const [x, expected] of [[-1.5, -1.35], [1.5, -1.625]]) {
    const tops = [];
    for (let index = 0; index < positions.count; index++) if (positions.getX(index) === x) tops.push(transition.position.y + positions.getY(index));
    assert.ok(Math.abs(Math.max(...tops) - expected) < 1e-9, 'Graded strip meets each finished surface without a lip');
  }
});

test('landing and both treads span the entire dining side while the patio stays at lawn grade', () => {
  const { meshes } = buildRoof();
  const terrace = meshes.find((mesh) => mesh.name === 'Kitchen-prep garden soil');
  assert.equal(terrace.userData.topFeet, -1.645);
  assert.ok(!meshes.some((mesh) => /Ground-level patio paver terrace|Dining door patio steps/.test(mesh.name)));
  assert.equal(terrace.userData.z, -0.325);
  assert.equal(terrace.userData.depthFeet, 7.075);
  assert.ok(!meshes.some((mesh) => /Patio garden steps|terrace west return|terrace east return/.test(mesh.name)));
  assert.ok(!meshes.some((mesh) => mesh.name === 'Dining door exterior landing'), 'Removed garden door leaves no obsolete landing');
  assert.ok(!meshes.some((mesh) => /Raised living-room patio terrace|Patio to garden steps|Patio stair lower garden landing/.test(mesh.name)));
  const deck = meshes.find((mesh) => mesh.name === 'Ground-level living-room patio terrace');
  const threshold = meshes.find((mesh) => mesh.name === 'Dining patio threshold');
  assert.equal(deck.userData.topFeet, -1.625);
  assert.equal(threshold.userData.topFeet, 0);
  assert.equal(threshold.userData.x, deck.userData.x + deck.userData.widthFeet);
  assert.equal(threshold.userData.x + threshold.userData.widthFeet, 13.2);
  const access = meshes.find((mesh) => mesh.name === 'Dining west door to covered patio access');
  assert.equal(access.position.x, 8.975);
  assert.equal(access.position.y, 0);
  assert.ok(Math.abs(access.position.z - 3.725) < 1e-9);
  assert.equal(access.rotation.y, -Math.PI / 2);
  const steps = meshes.find((mesh) => mesh.name === 'Covered dining patio steps');
  assert.equal(steps.userData.risers, 3);
  assert.equal(steps.userData.riseFeet * 12, 6.5);
  assert.equal(meshes.filter((mesh) => mesh.name === 'Shielded warm entry-step wash').length, 2);
  const treads = meshes.filter((mesh) => mesh.name === 'Darker stone entry tread');
  assert.equal(treads.length, 2, 'Patio is the surface after the third riser');
  for (const [index, tread] of treads.entries()) {
    assert.ok(Math.abs(tread.position.y + tread.geometry.parameters.height / 2 + (index + 1) * 1.625 / 3) < 1e-9);
    assert.equal(tread.geometry.parameters.width, 8.1);
    assert.ok(Math.abs(access.position.z - tread.geometry.parameters.width / 2 + 0.325) < 1e-9, 'Each tread starts at the dining rear exterior face');
    assert.ok(Math.abs(access.position.z + tread.geometry.parameters.width / 2 - 7.775) < 1e-9, 'Each tread reaches the living-wall exterior face at the dining end');
    const westEdge = access.position.x - tread.position.z - tread.geometry.parameters.depth / 2;
    assert.ok(westEdge > 6.55, 'Door-side steps clear tucked chairs');
    assert.equal(tread.geometry.parameters.depth, 1.1);
  }
  const livingLanding = meshes.find((mesh) => mesh.name === 'Covered dining patio door landing');
  assert.equal(livingLanding.userData.topFeet, 0);
  assert.equal(livingLanding.userData.widthFeet, 4);
  assert.equal(livingLanding.userData.depthFeet, 8.1);
  assert.equal(livingLanding.userData.x, 8.975);
  assert.equal(livingLanding.userData.z, -0.325);
  assert.ok(Math.abs(livingLanding.userData.z + livingLanding.userData.depthFeet - 7.775) < 1e-9);
  const door = meshes.find((mesh) => mesh.name === 'Dining covered-patio glazed exterior door, 36 by 96 inches');
  assert.equal(door.position.x, 13.2);
  assert.equal(door.position.z, 3.95);
  assert.equal(door.rotation.y, -Math.PI / 2);
  const nosings = meshes.filter((mesh) => mesh.name === 'Contrasting step nosing');
  for (const [index, nosing] of nosings.entries()) assert.ok(Math.abs(nosing.position.y + 0.025 + (index + 1) * 1.625 / 3) < 1e-9, 'Nosing is flush with tread, preserving equal risers');
});

test('vegetable garden includes trellised cucumbers and beans plus trailing pumpkin plants', () => {
  const { meshes } = buildRoof();
  const garden = meshes.find((mesh) => mesh.name === 'Cucumbers, green beans and pumpkins');
  assert.deepEqual(Array.from(garden.userData.crops), ['Cucumbers', 'Green beans', 'Pumpkins']);
  assert.equal(meshes.filter((mesh) => mesh.name === 'Growing cucumber').length, 18);
  assert.equal(meshes.filter((mesh) => mesh.name === 'Hanging green bean pod').length, 18);
  assert.equal(meshes.filter((mesh) => mesh.name === 'Orange pumpkin rib').length, 16);
  for (const row of meshes.filter((mesh) => /trellis row$/.test(mesh.name))) {
    assert.ok(row.userData.leftFeet > 26.75 && row.userData.rightFeet < 55.5);
    assert.equal(row.userData.heightFeet, 5);
  }
  for (const leaf of meshes.filter((mesh) => /leaf$/.test(mesh.name))) {
    assert.ok(leaf.position.x - leaf.scale.x >= 26.75 && leaf.position.x + leaf.scale.x <= 55.5);
    assert.ok(leaf.position.z - leaf.scale.z > -0.325 && leaf.position.z + leaf.scale.z < 6.75);
  }
});

test('patio camera mounts to the dining wall after its post is removed', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  const start = source.indexOf('  const cameraSchedule =');
  const end = source.indexOf('  cameras.userData.schedule', start);
  assert.ok(start >= 0 && end > start);
  const context = { patioRoofRight: 13.2, westGateCenterX: -10.605, westFenceReturnZ: 64.5, eastFenceReturnZ: 64.5 };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  const cameras = vm.runInContext('cameraSchedule', context);
  assert.deepEqual(Array.from(cameras.find((camera) => camera.id === 'C3').position), [12.9, 8, 6.65]);
  const rear = cameras.find((camera) => camera.id === 'C4').position;
  assert.deepEqual(Array.from(rear), [25.8, 8.5, -0.5]);
  assert.ok(rear[0] - 0.4 > 23.0375 && rear[0] + 0.4 < 26.65, 'Camera housing fits the solid pier east of dining rear glazing');
  assert.ok(rear[1] - 0.4 > 8, 'Housing clears the window head');
});

test('garden connector meets patio grade and transitions to the existing perimeter path', () => {
  const { meshes, context } = buildRoof();
  Object.assign(context, { paths: context.patio, eastPaverEdgeX: 60.145, pathWidth: 3.5 });
  const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  const start = source.indexOf('  const patioConnectorX =');
  const end = source.indexOf('  const lawn =', start);
  assert.ok(start >= 0 && end > start);
  vm.runInContext(source.slice(start, end), context);
  const connector = meshes.find((mesh) => mesh.name === 'Ground-level patio garden connector');
  assert.equal(connector.userData.topFeet, -1.625);
  assert.equal(connector.userData.x, 12.95);
  const livingTerrace = meshes.find((mesh) => mesh.name === 'Ground-level living-room patio terrace');
  assert.equal(livingTerrace.userData.x + livingTerrace.userData.widthFeet, connector.userData.x, 'Path meets expanded patio edge without overlapping finishes');
  assert.ok(livingTerrace.userData.z <= connector.userData.z, 'Whole connector width joins the patio');
  assert.ok(livingTerrace.userData.z + livingTerrace.userData.depthFeet >= connector.userData.z + connector.userData.depthFeet);
  assert.ok(Math.abs(connector.userData.z + connector.userData.depthFeet + 0.325) < 1e-9);
  const ramp = meshes.find((mesh) => mesh.name === 'Patio connector grade transition');
  assert.ok(Math.abs(connector.userData.x + connector.userData.widthFeet - ramp.userData.x) < 1e-9);
  const positions = ramp.geometry.attributes.position;
  for (const [x, expected] of [[-1.5, -1.625], [1.5, -1.35]]) {
    const heights = [];
    for (let index = 0; index < positions.count; index++) if (positions.getX(index) === x) heights.push(ramp.position.y + positions.getY(index));
    assert.ok(Math.abs(Math.max(...heights) - expected) < 1e-9, 'Ramp endpoints join both finished surfaces');
  }
  assert.ok(Math.abs(ramp.userData.x + ramp.userData.widthFeet - 56.645) < 1e-9);
  class Shape {
    constructor() { this.points = []; this.holes = []; }
    moveTo(x, y) { this.points.push([x, y]); }
    lineTo(x, y) { this.points.push([x, y]); }
    closePath() {}
  }
  Object.assign(context.THREE, { Shape, Path: Shape, ShapeGeometry: class { constructor(shape) { this.shape = shape; } } });
  Object.assign(context, { lot: { left: -13.605, right: 61.395, rear: -32.325, front: 97.675 }, mat() { return {}; } });
  const lawnEnd = source.indexOf('  const cartWidth =', end);
  assert.ok(lawnEnd > end);
  vm.runInContext(source.slice(end, lawnEnd), context);
  const lawn = meshes.find((mesh) => mesh.name === '75 by 130 ft lot lawn, not surveyed grade');
  assert.equal(lawn.position.y, -1.625);
  assert.equal(lawn.geometry.shape.holes.length, 1);
  const hole = lawn.geometry.shape.holes[0].points;
  assert.equal(hole.length, 12, 'Original ground-level patio, garden and connector cutout is restored without the landing extension');
  assert.ok(hole.some(([x, y]) => Math.abs(x + 8.855) < 1e-9 && Math.abs(y - 4.325) < 1e-9), 'Lawn cutout reaches the fence-path join beneath the graded strip');
  assert.ok(hole.some(([x, y]) => Math.abs(x - 12.95) < 1e-9 && Math.abs(y - 4.325) < 1e-9));
  assert.ok(!hole.some(([, y]) => Math.abs(y - 6.025) < 1e-9), 'Removed lower landing extension returns to lawn');
  assert.ok(hole.some(([x, y]) => Math.abs(x - 56.645) < 1e-9 && Math.abs(y - 3.825) < 1e-9));
});
