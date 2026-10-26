'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');

test('front entry has a straight header and thicker square columns without a curved surround or gable notch', () => {
  assert.doesNotMatch(source, /entryArch|Reference arched front-door surround|Reference arched entry side casing|notch\.absellipse/);
  const meshes = [];
  const context = {
    group: {}, trim: {}, porchColumnFinish: {}, porchPillars: [],
    box(parent, x, y, z, w, h, d) { const mesh = { x, y, z, w, h, d }; meshes.push(mesh); return mesh; },
    brickBox(parent, x, y, z, w, h, d) { meshes.push({ name: 'Column brick base', x, y, z, w, h, d }); }
  };
  const start = source.indexOf('  for (const [index, x] of [1, 11.9, 19.3, 30.2].entries())');
  const end = source.indexOf('  const porchMetal =', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  const columns = meshes.filter((mesh) => mesh.name === 'White porch column');
  assert.equal(columns.length, 4);
  for (const column of columns) {
    assert.equal(column.w, 1);
    assert.equal(column.d, 1);
    assert.equal(column.userData.widthInches, 12);
  }
  const header = source.split('\n').find((line) => line.includes("name = 'Straight front entry header'"));
  assert.ok(header);
  vm.runInNewContext(header, context);
  const beam = meshes.at(-1);
  assert.equal(beam.y - beam.h / 2, 8, 'Straight header preserves eight-foot entry height');
});

test('brick texture uses cream variations and contrasting warm mortar with the original bond', () => {
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
  assert.equal(fills[0].color, '#bfb3a0');
  assert.deepEqual([...new Set(fills.slice(1).map((fill) => fill.color))].sort(), ['#dccdb0', '#e0d2b7', '#e8ddc4', '#efe5d0']);
  assert.equal(fills.length, 41);
  assert.ok(fills.slice(1).every((fill) => fill.bounds[2] === 60 && fill.bounds[3] === 28));
});

test('all exterior windows use white trim while grilles remain front-only', () => {
  const meshes = [];
  class Group {
    constructor() { this.userData = {}; this.position = { set() {} }; }
    add(mesh) { meshes.push(mesh); }
  }
  const context = { THREE: { Group }, trim: {}, windowBlack: {}, glass: {}, privacyGlass: {}, box(parent, x, y, z, w, h, d, material) { const mesh = { x, y, z, w, h, d, material }; parent.add(mesh); return mesh; } };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function windowUnit('), source.indexOf('  function wall(')), context);
  vm.runInContext('windowUnit(new THREE.Group(), 6, 3, 6, 5, false, false, true, true)', context);
  assert.equal(meshes.filter((mesh) => mesh.name === 'Front window horizontal grille').length, 3);
  assert.equal(meshes.filter((mesh) => mesh.name === 'Front window vertical grille').length, 1);
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
  const context = { frontBrick, box(parent, x, y, z, w, h, d, material) { return { material }; } };
  vm.runInNewContext(source.slice(source.indexOf('  const brickTextureWidthFeet ='), source.indexOf('  group.userData.brickFormat =')) + '\nglobalThis.brickTextureWidthFeet = brickTextureWidthFeet; globalThis.brickTextureHeightFeet = brickTextureHeightFeet;', context);
  vm.createContext(context);
  const start = source.indexOf('  function brickBox(');
  const end = source.indexOf('  function texturedBox(', start);
  vm.runInContext(source.slice(start, end), context);
  const base = vm.runInContext('brickBox({}, 0, 0, 0, 6, 1, 0.45)', context);
  assert.equal(base.name, 'Cream exterior brick masonry');
  assert.ok(base.material.map);
  assert.deepEqual(repeats, [[2.25, 12 / 25]]);
  assert.doesNotMatch(source, /setFrontBrick|frontBrickEnabled|Optional front brick/);
  assert.doesNotMatch(fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8'), /front-brick-toggle/);
});

test('brick cladding fills every wall orientation without siding or limestone bands', () => {
  const meshes = [], walls = [];
  class Group {
    constructor() { this.position = { set() {} }; this.rotation = {}; }
    add(mesh) { meshes.push(mesh); }
  }
  const context = { THREE: { Group }, group: { add(wall) { walls.push(wall); } }, wallThickness: 0.45, brickBox(parent, x, y, z, w, h, d) { const mesh = { x, y, z, w, h, d, finish: 'brick' }; parent.add(mesh); return mesh; }, windowUnit() {} };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function wall('), source.indexOf('  const win =')), context);
  for (const name of ['front ground floor', 'west ground floor', 'kitchen and prep rear', 'east ground floor', 'upper front bedrooms', 'Garage front upper elevation study']) {
    vm.runInContext(`wall('${name}', 0, 0, 10, 0, -0.4, 9, [{center:5,width:2,sill:3,height:5}])`, context);
  }
  assert.equal(walls.length, 6);
  assert.ok(walls.every((wall) => wall.name.startsWith('Exterior brick wall:')));
  assert.ok(meshes.every((mesh) => mesh.finish === 'brick'));
  assert.equal(meshes.length, 24, 'Every wall has brick at sides, sill and head');
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

test('photo elevation has paired windows and a taller unassigned garage facade, without adding an interior floor', () => {
  const walls = [], gables = [];
  const context = { wall(name, ...args) { const value = { name, args, userData: {} }; walls.push(value); return value; }, win(center, width, sill = 3, height = 5) { return { center, width, sill, height }; }, floorToFloor: 10, upper: 10, eaves: 19 };
  vm.createContext(context);
  const lines = source.split('\n');
  for (const name of ['front ground floor', 'upper front bedrooms']) {
    const line = lines.find((line) => line.includes(`wall('${name}'`));
    assert.ok(line);
    vm.runInContext(line, context);
  }
  const start = source.indexOf('  const garageUpperStudy =');
  const end = source.indexOf('  function gable(', start);
  vm.runInContext(source.slice(start, end), context);
  const ground = walls.find((wall) => wall.name === 'front ground floor').args.at(-1);
  assert.equal(ground.filter((opening) => !opening.door).length, 4);
  const upper = walls.find((wall) => wall.name === 'upper front bedrooms').args.at(-1);
  assert.equal(upper.length, 6);
  const garage = walls.find((wall) => wall.name === 'Garage front upper elevation study');
  assert.equal(garage.args.at(-1).length, 2);
  assert.equal(garage.userData.floorAdded, false);
  assert.equal(garage.userData.habitableRoom, false);
  context.gable = (...args) => gables.push(args);
  for (const name of ['West bedroom gable', 'Central bedroom gable', 'Reference garage-front gable study']) vm.runInContext(lines.find((line) => line.includes(`gable('${name}'`)), context);
  assert.equal(gables.length, 3);
  assert.ok(gables.every((gable) => gable[5] === 19 && gable[6] === 8.8));
});
