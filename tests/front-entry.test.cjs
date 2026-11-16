'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { getFrontEntryLayout, buildRectangularFrontEntry } = require('../assets/js/floor-plan-ground.js');

class Group {
  constructor() {
    this.children = [];
    this.userData = {};
    this.position = { x: 0, y: 0, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
  }
  add(child) { child.parent = this; this.children.push(child); }
  traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
}
class Shape {
  constructor() { this.points = []; }
  moveTo(x, y) { this.points.push([x, y]); }
  lineTo(x, y) { this.points.push([x, y]); }
  closePath() {}
}
function build() {
  const THREE = {
    Group, Shape,
    ExtrudeGeometry: class { constructor(shape, options) { Object.assign(this, { shape, options }); } },
    Mesh: class extends Group { constructor(geometry, material) { super(); Object.assign(this, { geometry, material }); } }
  };
  const parent = new Group();
  const leaves = buildRectangularFrontEntry(THREE, {
    wood: {}, trim: {}, hardware: {}, field: {},
    box(target, x, y, z, width, height, depth, material) {
      const part = new Group();
      Object.assign(part.position, { x, y, z });
      Object.assign(part, { width, height, depth, material });
      target.add(part);
      return part;
    }
  }, parent);
  return { parent, leaves };
}

test('actual leaf contours have full-height straight heads in the unchanged 60 by 96 inch opening', () => {
  const { parent, leaves } = build();
  const layout = getFrontEntryLayout();
  assert.equal(leaves.length, 2);
  assert.equal(layout.height, 8);
  assert.equal(parent.userData.heightInches, 96);
  for (const leaf of leaves) {
    const body = leaf.children.find((part) => part.name === 'Rectangular oak entry leaf body');
    const points = body.geometry.shape.points.map(([x, y]) => [x + leaf.position.x, y]);
    assert.ok(points.every(([x, y]) => x >= -2.45 && x <= 2.45 && y >= 0.04 && y <= 8));
    const crown = Math.max(...points.map(([, y]) => y));
    const outerEdge = points.filter(([x]) => Math.abs(x) > 2.44);
    assert.ok(crown > 7.98);
    assert.ok(Math.abs(Math.max(...outerEdge.map(([, y]) => y)) - 7.985) < 1e-10, 'Outer corners are full-height, not arched');
    assert.equal(leaf.userData.interactiveHouseDoor.openAngleDegrees, 0);
    assert.equal(leaf.userData.interactiveHouseDoor.maxAngleDegrees, 110);
    assert.equal(body.userData.tourObstacle, true);
  }
  assert.equal(parent.children.filter((part) => /arch|spandrel|curved/i.test(part.name)).length, 0);
});

test('straight cast-stone surround, molded oak panels and paired pulls form one entry in both model surfaces', () => {
  const { parent, leaves } = build();
  const surround = parent.children.find((part) => part.name === 'Deep cast-stone rectangular entry surround');
  assert.equal(surround.geometry.options.depth, 0.28);
  assert.equal(surround.position.z, 0.19);
  assert.ok(parent.children.some((part) => part.name === 'Projecting straight entry molding'));
  for (const leaf of leaves) {
    assert.equal(leaf.children.filter((part) => part.name === 'Rectangular recessed upper oak panel').length, 2);
    assert.equal(leaf.children.filter((part) => part.name === 'Recessed lower oak entry panel').length, 2);
    assert.equal(leaf.children.filter((part) => part.name === 'Rectangular entry dark pull').length, 2);
    assert.ok(!leaf.children.some((part) => /glazing/i.test(part.name)));
  }
});

test('horizontal porch lining has constant finished height and physical clearance beneath every retained roof corner', () => {
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'), 'utf8');
  const front = require('../assets/js/floor-plan-ground.js').getGroundFrontLayout();
  const roof = require('../assets/js/floor-plan-roof.js');
  const parts = [];
  const context = { group: {}, frontWallZ: front.wallZ, frontLayout: front, porchCeilingFinish: {}, trim: {},
    box(parent, x, y, z, w, h, d, material) {
      const points = [-1, 1].flatMap(a => [-1, 1].flatMap(b => [-1, 1].map(c => [a*w/2, b*h/2, c*d/2])));
      const part = { position: {x,y,z}, w,h,d, material, geometry: { attributes: {
        position: { count: points.length, getX: i => points[i][0], getY: i => points[i][1], getZ: i => points[i][2] },
        uv: { setXY() {} }
      } } };
      parts.push(part);
      return part;
    } };
  const start = source.indexOf('  const porchCeilingHeight =');
  const end = source.indexOf('  porchRoof.userData.ceiling =', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start,end),context);
  const lining = parts.find(p => p.name === 'Horizontal warm wood porch ceiling');
  assert.equal(lining.w,31.2);
  assert.equal(lining.d,7);
  assert.equal(lining.h,0.0625);
  assert.equal(lining.position.y-lining.h/2,9.6);
  assert.equal(lining.position.z-lining.d/2,front.wallZ);
  assert.equal(lining.position.z+lining.d/2,front.porchEdgeZ);
  const envelope = roof.buildRoofEnvelope(roof.getPorchRoofDefinitions());
  for (const x of [0,31.2]) for (const z of [front.wallZ,front.porchEdgeZ]) {
    const face = envelope.faces.find(f => roof.contains(f.polygon,[x,z]));
    assert.ok(face, 'Every lining corner is beneath retained roof coverage');
    assert.ok(roof.heightAt(face.plane,[x,z])-0.16-(lining.position.y+lining.h/2)>0.1, 'Over 1.2 in between lining top and roof underside');
  }
  assert.doesNotMatch(source, /HomeRoof\.getPorchRoofDefinitions\(\), porchMetal, true, null, porchCeilingFinish/, 'Sloping roof underside is not a second finished wood ceiling');
});

test('window grille geometry fits sash apertures and keeps white interior and bronze exterior faces', () => {
  const { addFrontWindowGrilles } = require('../assets/js/floor-plan-ground.js');
  const white = {}, bronze = {}, parts = [];
  const box = (parent,x,y,z,w,h,d,material) => {const part={x,y,z,w,h,d,material};parts.push(part);return part;};
  addFrontWindowGrilles({},box,bronze,3,5,1,1,0.04,0.235,white,-1);
  assert.equal(parts.length,6);
  assert.equal(parts.filter(p => p.material === white && p.z < 0).length,3);
  assert.equal(parts.filter(p => p.material === bronze && p.z > 0).length,3);
  for (const p of parts) {
    assert.ok(p.x-p.w/2>=-1.265-1e-10 && p.x+p.w/2<=1.265+1e-10);
    assert.ok(p.y-p.h/2>=0.235-1e-10 && p.y+p.h/2<=4.765+1e-10);
  }
  parts.length=0;
  addFrontWindowGrilles({},box,bronze,6,1.5);
  assert.equal(parts.length,4, 'Short picture uses four lights, not compressed six lights');
});

test('wider front stairs have equal risers, flush nosings and join the existing approach without overlapping it', () => {
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'), 'utf8');
  const parts = [];
  class Steps extends Group { constructor() { super(); this.position.set = (x, y, z) => Object.assign(this.position, { x, y, z }); } }
  const context = {
    THREE: { Group: Steps, PointLight: class extends Steps {} }, group: new Steps(),
    stepStone: {}, stepEdge: {}, glow: {},
    frontShift: require('../assets/js/floor-plan-ground.js').getGroundFrontLayout().extension,
    frontLayout:require('../assets/js/floor-plan-ground.js').getGroundFrontLayout(),
    frontWallZ:require('../assets/js/floor-plan-ground.js').getGroundFrontLayout().wallZ,
    box(parent, x, y, z, width, height, depth) { const part = { x, y, z, width, height, depth }; parts.push(part); parent.add(part); return part; }
  };
  const start = source.indexOf('  function exteriorSteps('), end = source.indexOf('  const livingAccess =', start);
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  const call = source.split('\n').find((line) => line.includes("exteriorSteps(group, 'Contrasting front entry steps'"));
  assert.ok(call);
  vm.runInContext(call, context);
  const treads = parts.filter((part) => part.name === 'Darker stone entry tread');
  const nosings = parts.filter((part) => part.name === 'Contrasting step nosing');
  assert.equal(treads.length, 2);
  for (const [index, tread] of treads.entries()) {
    assert.equal(tread.width, 10.8);
    assert.equal(tread.depth, 1);
    assert.ok(Math.abs(tread.y + tread.height / 2 + (index + 1) * 0.45) < 1e-9);
    assert.ok(Math.abs(nosings[index].y + 0.025 - tread.y - tread.height / 2) < 1e-9);
  }
  assert.ok(Math.abs(treads.at(-1).z + treads.at(-1).depth / 2 - (context.frontWallZ+context.frontLayout.porchDepth+.15+2)) < 1e-9);
  let approach;
  Object.assign(context, {
    westPaverEdgeX: -11.355, drivewayLeft: 30.9, pathWidth: 3.5,
    addWalk(name, x, z, width, depth) { approach = { name, x, z, width, depth }; }
  });
  const approachStart=source.indexOf("  addWalk('Front two-tread stair approach'");
  const approachEnd=source.indexOf(';',approachStart)+1;
  assert.ok(approachStart>0&&approachEnd>approachStart);
  vm.runInContext(source.slice(approachStart,approachEnd), context);
  assert.ok(Math.abs(treads.at(-1).z + treads.at(-1).depth / 2 - approach.z) < 1e-9, 'Final tread meets the real approach without duplicate paving');
  assert.ok(Math.abs(approach.z+approach.depth-(64.5+context.frontShift))<1e-9);
});

test('exterior taps reach the entry-door picker while orbit drags do not open doors', () => {
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
  const listeners = {};
  let doorPicks = 0, floorPicks = 0;
  const context = {
    activeFloor: 'exterior', navigationMode: 'rotate', walkDrag: null,
    renderer: { domElement: { addEventListener(name, callback) { listeners[name] = callback; } } },
    pickPatioDoor: () => false,
    pickHouseDoor() { doorPicks++; return true; },
    pickVehicleDoor: () => false,
    pickTourFloor() { floorPicks++; }
  };
  const start = source.indexOf("  renderer.domElement.addEventListener('pointerdown'");
  const end = source.indexOf("  for (const eventName of ['pointerup'", start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  const event = { pointerId: 1, button: 0, isPrimary: true, clientX: 100, clientY: 100 };
  listeners.pointerdown(event);
  listeners.pointerup(event);
  assert.equal(doorPicks, 1);
  assert.equal(floorPicks, 0);
  listeners.pointerdown(event);
  listeners.pointermove({ ...event, clientX: 120 });
  listeners.pointerup({ ...event, clientX: 120 });
  assert.equal(doorPicks, 1, 'Orbit drag is not treated as a door tap');
  assert.match(source, /function pickTourFloor\(event\) \{\s+if \(activeFloor === 'exterior'\) return;/);
  assert.match(source, /const exteriorWidth = name === 'exterior-entry' \? 20 :/, 'Entry close-up must not inherit the 66-foot whole-facade framing');
});

test('straight porch roof replaces the segmental entry hump, without a pediment', () => {
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'), 'utf8');
  const definitions = require('../assets/js/floor-plan-roof.js').getPorchRoofDefinitions();
  assert.equal(definitions.length, 2, 'Main porch plane plus coplanar recess infill');
  assert.ok(definitions.every((definition) => definition.planes.length === 1), 'No curved facets or rear return');
  assert.ok(!definitions.some((definition) => /barrel|arch|curv/i.test(definition.id)));
  assert.doesNotMatch(source, /const entryPediment = gable/);
  assert.ok(definitions.every((definition) => definition.finish === 'metal'));
  const frontWallZ = require('../assets/js/floor-plan-ground.js').getGroundFrontLayout().wallZ;
  assert.ok(definitions[0].bounds[2] < frontWallZ - 0.225, 'Main metal plane reaches past the ground brick face into the upper wall');
});

test('porch fascia remains below the sloped metal underside instead of striping the roof surface', () => {
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'), 'utf8');
  const parts = [];
  const context = {
    HomeRoof: require('../assets/js/floor-plan-roof.js'), group: {}, trim: {}, entryPortal: {}, frontShift: require('../assets/js/floor-plan-ground.js').getGroundFrontLayout().extension,
    box(parent, x, y, z, width, height, depth) { const part = { x, y, z, width, height, depth }; parts.push(part); return part; }
  };
  vm.createContext(context);
  const roofStart = source.indexOf('  const porchCanopyHeight =');
  const roofEnd = source.indexOf('  const porchMetal =', roofStart);
  const fasciaStart = source.indexOf('  const porchFasciaZ =');
  const fasciaEnd = source.indexOf('  porchFascia.name =', fasciaStart);
  assert.ok(roofStart >= 0 && roofEnd > roofStart && fasciaStart >= 0 && fasciaEnd > fasciaStart);
  vm.runInContext(source.slice(roofStart, roofEnd) + source.slice(fasciaStart, fasciaEnd), context);
  assert.equal(parts.length, 1, 'One continuous fascia member, no separate entry-bay fascia');
  const fascia = parts[0];
  assert.ok(Math.abs(fascia.x - fascia.width / 2 + 0.65) < 1e-9 && Math.abs(fascia.x + fascia.width / 2 - 31.85) < 1e-9, 'Fascia spans the full porch roof width at one height');
  for (const z of [fascia.z - fascia.depth / 2, fascia.z, fascia.z + fascia.depth / 2]) {
    const underside = context.porchCanopyUndersideAt(z);
    assert.ok(fascia.y + fascia.height / 2 <= underside + 1e-9, 'No white fascia vertex is above the roof underside');
  }
  const vertices = [-0.35, 0.35].flatMap((z) => [-0.25, 0.25].map((y) => ({ y, z })));
  const header = {
    position: { y: 9.95, z: 60.5 + context.frontShift }, userData: {},
    geometry: {
      attributes: { position: {
        count: vertices.length, getY: (index) => vertices[index].y, getZ: (index) => vertices[index].z,
        setY: (index, y) => { vertices[index].y = y; }
      } },
      computeVertexNormals() {}
    }
  };
  context.fitTrimTopToPorchRoof(header);
  for (const [index, vertex] of vertices.entries()) {
    if (index % 2 === 0) assert.ok(Math.abs(vertex.y + header.position.y - 9.7) < 1e-9, 'Door-clearance underside is preserved');
    else assert.ok(Math.abs(vertex.y + header.position.y - context.porchCanopyUndersideAt(vertex.z + header.position.z)) < 1e-9, 'Header top meets the roof underside rather than protruding through its surface');
  }
  assert.equal(header.userData.topFollowsPorchUnderside, true);
});
