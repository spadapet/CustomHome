'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');

test('arched entry is coordinated through the same builder for furnished and exterior views', () => {
  const layout = require('../floor-plan-ground.js').getFrontEntryLayout();
  assert.equal(layout.width, 5);
  assert.equal(layout.height, 8);
  assert.equal(layout.spring, 7.1);
  assert.match(source, /archedEntry\.position\.set\(15\.6, 0, 54\.2\)/);
  assert.match(source, /buildArchedFrontEntry\(THREE, .*archedEntry\)/);
  assert.match(fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8'), /const frontEntryLeaves = buildArchedFrontEntry/);
});

test('farmhouse porch has four white columns and its raised beam clears the eight-foot door', () => {
  assert.doesNotMatch(source, /entryArch|Reference arched front-door surround|Reference arched entry side casing|notch\.absellipse/);
  const meshes = [];
  const context = {
    THREE: { Group: class { constructor() { this.userData = {}; } } },
    group: { add() {} }, trim: {}, dark: {}, accentStone: {}, porchColumnFinish: {}, porchPillars: [], fitTrimTopToPorchRoof: (part) => part,
    box(parent, x, y, z, w, h, d) { const mesh = { x, y, z, w, h, d }; meshes.push(mesh); return mesh; },
    brickBox(parent, x, y, z, w, h, d) { const mesh = { name: 'Column brick base', x, y, z, w, h, d }; meshes.push(mesh); return mesh; }
  };
  const start = source.indexOf('  for (const x of [1, 11.65, 19.55, 30.2])');
  const end = source.indexOf('  const porchCanopyHeight =', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  const columns = meshes.filter((mesh) => mesh.name === 'White farmhouse porch column');
  assert.equal(columns.length, 4);
  for (const column of columns) {
    assert.equal(column.w, column.userData.entryColumn ? 1.3 : 1);
    assert.equal(column.d, column.w);
    assert.ok(Math.abs(column.userData.widthInches - column.w * 12) < 1e-9);
  }
  const header = source.split('\n').find((line) => line.includes("name = 'Raised farmhouse porch header clear of eight-foot door'"));
  assert.ok(header);
  vm.runInNewContext(header, context);
  const beam = meshes.at(-1);
  assert.ok(Math.abs(beam.y - beam.h / 2 - 9.7) < 1e-9, 'Header has 1.7 ft clearance above the door head');
  assert.equal(beam.w, 32.5);
  assert.doesNotMatch(source, /Continuous porch fascia and cornice|Continuous shingle porch roof/);
});

test('brick texture uses contrasting warm taupe variations and mortar relief with the original bond', () => {
  const fills = [];
  const paint = { fillStyle: '', fillRect(...bounds) { fills.push({ color: this.fillStyle, bounds }); } };
  const context = {
    document: { createElement() { return { getContext() { return paint; } }; } },
    THREE: { CanvasTexture: class { constructor(canvas) { this.image = canvas; } }, MeshStandardMaterial: class { constructor(options) { Object.assign(this, options); } }, SRGBColorSpace: 'srgb', RepeatWrapping: 'repeat' }
  };
  vm.createContext(context);
  const start = source.indexOf('  const frontBrick =');
  const end = source.indexOf('  function brickBox(', start);
  vm.runInContext(source.slice(start, end), context);
  assert.equal(fills[0].color, '#ddd5c5');
  assert.deepEqual([...new Set(fills.slice(1).map((fill) => fill.color))].sort(), ['#d3c8b3', '#d8ccb8', '#e3d8c3', '#e8ddc8']);
  assert.equal(fills.length, 41);
  assert.ok(fills.slice(1).every((fill) => fill.bounds[2] === 60 && fill.bounds[3] === 28));
});

test('farmhouse windows restore white trim on every elevation and inside', () => {
  const meshes = [];
  class Group {
    constructor() { this.userData = {}; this.position = { set() {} }; }
    add(mesh) { meshes.push(mesh); }
  }
  const context = { THREE: { Group }, dark: {}, trim: {}, windowBlack: {}, glass: {}, privacyGlass: {}, box(parent, x, y, z, w, h, d, material) { const mesh = { x, y, z, w, h, d, material }; parent.add(mesh); return mesh; } };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function windowUnit('), source.indexOf('  function wall(')), context);
  vm.runInContext('windowUnit(new THREE.Group(), 6, 3, 6, 5, false, false, true, true)', context);
  assert.equal(meshes.filter((mesh) => mesh.name === 'Front window horizontal grille').length, 3);
  assert.equal(meshes.filter((mesh) => mesh.name === 'Front window vertical grille').length, 1);
  assert.ok(meshes.filter((mesh) => mesh.material && mesh.material !== context.glass).every((mesh) => mesh.material === context.trim));
  meshes.length = 0;
  vm.runInContext('windowUnit(new THREE.Group(), 6, 3, 6, 5)', context);
  assert.equal(meshes.filter((mesh) => /grille/.test(mesh.name ?? '')).length, 0);
  assert.ok(meshes.filter((mesh) => mesh.material && mesh.material !== context.glass).every((mesh) => mesh.material === context.trim));
  assert.match(source, /exteriorTrim: 'White'/);
  const viewer = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  assert.match(viewer, /const windowExterior = windowTrim;/);
  assert.match(viewer, /const exteriorFinish = 'White';/);
});

test('reference elevation uses fixed brick without an optional finish control', () => {
  const repeats = [];
  const frontBrick = { clone() { return {}; }, map: { clone() { return { repeat: { set(...values) { repeats.push(values); } } }; } } };
  const context = { frontBrick, masonryMaps: null, box(parent, x, y, z, w, h, d, material) { return { material }; } };
  vm.runInNewContext(source.slice(source.indexOf('  const brickTextureWidthFeet ='), source.indexOf('  group.userData.brickFormat =')) + '\nglobalThis.brickTextureWidthFeet = brickTextureWidthFeet; globalThis.brickTextureHeightFeet = brickTextureHeightFeet;', context);
  vm.createContext(context);
  const start = source.indexOf('  function brickBox(');
  const end = source.indexOf('  function texturedBox(', start);
  vm.runInContext(source.slice(start, end), context);
  const base = vm.runInContext('brickBox({}, 0, 0, 0, 6, 1, 0.45)', context);
  assert.equal(base.name, 'Cream exterior brick masonry');
  assert.ok(base.material.map);
  assert.equal(base.material.bumpMap, base.material.map);
  assert.deepEqual(repeats, [[2.25, 12 / 25]]);
  assert.doesNotMatch(source, /setFrontBrick|frontBrickEnabled|Optional front brick/);
  assert.doesNotMatch(fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8'), /front-brick-toggle/);
});

test('cream brick constituents respect every fixed opening without applied siding or battens', () => {
  const meshes = [], walls = [];
  class Group {
    constructor() { this.userData = {}; this.position = { set() {} }; this.rotation = {}; }
    add(mesh) { meshes.push(mesh); }
  }
  const context = { THREE: { Group }, white: {}, trim: {}, garageFloorY: -1.25, group: { add(wall) { walls.push(wall); } }, wallThickness: 0.45, box(parent, x, y, z, w, h, d) { const mesh = { x, y, z, w, h, d, finish: 'siding' }; parent.add(mesh); return mesh; }, brickBox(parent, x, y, z, w, h, d) { const mesh = { x, y, z, w, h, d, finish: 'brick' }; parent.add(mesh); return mesh; }, windowUnit() {} };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function wall('), source.indexOf('  const win =')), context);
  for (const name of ['front ground floor', 'west ground floor', 'kitchen and prep rear', 'east ground floor', 'upper front bedrooms', 'upper loft south']) {
    vm.runInContext(`wall('${name}', 0, 0, 10, 0, -0.4, 9, [{center:5,width:2,sill:3,height:5}])`, context);
  }
  assert.equal(walls.length, 6);
  assert.ok(walls.every((wall) => wall.name.startsWith('Exterior brick wall:')));
  assert.ok(meshes.filter((mesh) => mesh.finish !== 'brick').every((mesh) => /course|Cornice|Upper window/.test(mesh.name)));
  assert.ok(!meshes.some((mesh) => /batten|siding/.test(mesh.name ?? '')));
  for (const mesh of meshes.filter((mesh) => mesh.finish === 'brick')) {
    assert.ok(mesh.x + mesh.w / 2 <= 4 + 1e-9 || mesh.x - mesh.w / 2 >= 6 - 1e-9 || mesh.y + mesh.h / 2 <= 3 + 1e-9 || mesh.y - mesh.h / 2 >= 8 - 1e-9, 'Panels and battens do not fill the window opening');
  }
  assert.doesNotMatch(source, /board-and-batten siding|siding vertical batten|gable vertical batten|Coursed cream limestone|Limestone gable end|White front gable end/);
});

test('brick gables and tapered closures use the same physical course scale', () => {
  const context = { brickTextureWidthFeet: 8 / 3, brickTextureHeightFeet: 25 / 12, THREE: { Float32BufferAttribute: class { constructor(array) { this.array = array; } } } };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function brickFaceUVs('), source.indexOf('  function texturedBox(')), context);
  const attributes = {};
  const geometry = { attributes: { position: { count: 2, getX: (index) => index * 8 / 3, getY: (index) => index * 25 / 12, getZ: (index) => index * 16 / 3 } }, setAttribute(name, attribute) { attributes[name] = attribute; } };
  context.geometry = geometry;
  vm.runInContext('brickFaceUVs(geometry)', context);
  assert.deepEqual(Array.from(attributes.uv.array), [0, 0, 1, 1]);
  vm.runInContext("brickFaceUVs(geometry, 'z')", context);
  assert.deepEqual(Array.from(attributes.uv.array), [0, 0, 2, 1]);
});

test('hipped exterior removes applied front gables and retains fixed openings without adding a floor', () => {
  const walls = [], gables = [];
  const context = { group: { userData: {} }, dark: {}, box() { return {}; }, wall(name, ...args) { const value = { name, args, userData: {} }; walls.push(value); return value; }, win(center, width, sill = 3, height = 5) { return { center, width, sill, height }; }, floorToFloor: 10, upper: 10, eaves: 19 };
  vm.createContext(context);
  const lines = source.split('\n');
  for (const name of ['front ground floor', 'upper front bedrooms']) {
    const line = lines.find((line) => line.includes(`wall('${name}'`));
    assert.ok(line);
    vm.runInContext(line, context);
  }
  const start = source.indexOf('  const garageFacadeEaves =');
  const end = source.indexOf('  function renderRoofEnvelope(', start);
  vm.runInContext(source.slice(start, end), context);
  const ground = walls.find((wall) => wall.name === 'front ground floor').args.at(-1);
  assert.equal(ground.filter((opening) => !opening.door).length, 4);
  const upper = walls.find((wall) => wall.name === 'upper front bedrooms').args.at(-1);
  assert.equal(upper.length, 6);
  assert.ok(!walls.some((wall) => /Garage.*upper/.test(wall.name)));
  context.gable = (...args) => gables.push(args);
  context.hipRoof = (...args) => gables.push(args);
  assert.doesNotMatch(source, /gable\('(West|Central|Garage) farmhouse gable'/);
  assert.doesNotMatch(source, /gable\('Entry porch gable'|Reference garage standing-seam eyebrow canopy/);
  assert.match(source, /renderRoofEnvelope\('Connected standing-seam porch and entry roof'/);
  assert.match(source, /HomeRoof\.getPorchRoofDefinitions\(\), porchMetal, true/);
  assert.doesNotMatch(source, /gable\('Entry farmhouse pediment'/);
});

test('six exterior upper-front windows match furnished upstairs wall openings and frames', () => {
  const plan = require('../floor-plan-upstairs.js').getUpstairsDefaultPlan(require('../upstairs-layout.js').stairOpening());
  const wall = plan.walls.find(([name]) => name === 'Bedrooms south');
  const frames = plan.windows.filter(([name]) => /Bedroom [34] south/.test(name));
  let exteriorOpenings;
  const line = source.split('\n').find((text) => text.includes("wall('upper front bedrooms'"));
  vm.runInNewContext(line, {
    upper: 10, eaves: 19,
    win: (center, width, sill, height = 5) => ({ center, width, sill, height }),
    wall(...args) { exteriorOpenings = args[7]; }
  });
  assert.equal(frames.length, 6);
  assert.equal(wall[5].length, 6);
  for (const [index, frame] of frames.entries()) {
    const opening = exteriorOpenings[index];
    assert.ok(Math.abs(frame[1] - opening.center) < 1e-8);
    assert.equal(frame[3], opening.width);
    assert.ok(Math.abs((wall[5][index][0] + wall[5][index][1]) / 2 - opening.center) < 1e-8);
    assert.deepEqual(wall[5][index].slice(2), [3, 8]);
    assert.equal(opening.sill, 13);
    assert.equal(opening.height, 5);
  }
});
