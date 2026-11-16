'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'), 'utf8');
const upperPlan = require('../assets/js/floor-plan-upstairs.js');
function drawMeasuredUpper(context) {
  const start = source.indexOf('  const measuredUpper =');
  const end = source.indexOf('  const garageFacadeEaves =', start);
  assert.ok(start > 0 && end > start);
  vm.runInNewContext(source.slice(start, end), { ...upperPlan, HomeRoof: require('../assets/js/floor-plan-roof.js'), upper: 10, eaves: 19, ...context });
}

test('one whole-house window policy distinguishes product intent from orderable sizes', () => {
  const intent = require('../assets/js/floor-plan-ground.js').getWindowProductIntent;
  for (const [w,h,picture] of [[3,5,false],[4,5,false],[1.5,5,false],[6,1.5,true],[5,5,true],[2,6,false]]) {
    const data = intent(w,h,picture);
    assert.equal(data.series, '100 Series');
    assert.equal(data.material, 'Fibrex composite');
    assert.match(data.grilles, /traditional 2 wide by 3 high/);
    assert.equal(data.productSelected, false);
    assert.equal(data.standardSizeVerified, false);
    assert.equal(data.columns, picture ? 1 : Math.ceil(w/3));
    assert.equal(data.rows, picture ? 1 : Math.ceil(h/6));
  }
  assert.match(intent(3,5).sizeReview, /Outside/);
  assert.match(intent(2,6).sizeReview, /Outside/);
  assert.match(intent(6,1.5,true).sizeReview, /aspect-ratio/);
  assert.match(intent(2.5,4,false,true).privacyReview, /not a verified factory/);
});

test('upper corner leaders follow different upper/lower walls with a short canopy bypass', () => {
  const routes=[];
  const measuredUpper = upperPlan.getUpstairsMeasuredGeometry();
  const context={HomeRoof:require('../assets/js/floor-plan-roof.js'),floorToFloor:10,measuredUpper,group:{},drainageRoute(parent,name,points,brackets){routes.push({name,points,brackets});}};
  const start=source.indexOf('  for (const east of [false, true])');
  vm.runInNewContext(source.slice(start,source.indexOf('  // Dining is hipped',start)),context);
  assert.equal(routes.length,2);
  for(const [index,r] of routes.entries()){
    const p=r.points;
    assert.equal(p.length,8);
    assert.equal(p[0][2],measuredUpper.south + .75,'actual front gutter');
    assert.equal(p[1][0],index?measuredUpper.southEast + .4:-0.4,'upper side-wall corner');
    assert.equal(p[1][2],measuredUpper.south - .15);
    assert.equal(p[5][0],index?30.9:-0.4,'different lower wall corner');
    assert.equal(p[5][2],index?54.65:54.05);
    assert.ok(p[3][0]+0.07 < -0.65 || p[3][0]-0.07>31.85,'canopy bypass');
    assert.ok(p[3][2]-0.07>54.22,'garage-return clearance');
    assert.ok(p.slice(1).every((v,i)=>v[1]<p[i][1]),'continuous descending route');
    assert.ok(r.brackets.every(([a,b])=>Math.hypot(...a.map((v,i)=>v-b[i]))<0.24),'short wall-fixed brackets, not arms');
  }
});

test('rectangular entry is coordinated through the same builder for furnished and exterior views', () => {
  const layout = require('../assets/js/floor-plan-ground.js').getFrontEntryLayout();
  assert.equal(layout.width, 5);
  assert.equal(layout.height, 8);
  assert.equal(layout.spring, undefined);
  assert.match(source, /rectangularEntry\.position\.set\(15\.6, 0, frontWallZ\)/);
  assert.match(source, /buildRectangularFrontEntry\(THREE, .*rectangularEntry\)/);
  assert.match(fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8'), /const frontEntryLeaves = buildRectangularFrontEntry/);
});

test('porch keeps four straight square warm cream columns and one straight beam clear of the eight-foot door', () => {
  assert.doesNotMatch(source, /Reference arched front-door surround|Reference arched entry side casing|notch\.absellipse/);
  const meshes = [];
  const context = {
    THREE: { Group: class { constructor() { this.userData = {}; } } },
    frontShift: require('../assets/js/floor-plan-ground.js').getGroundFrontLayout().extension,
    group: { add() {} }, trim: {}, baseBrick: {}, dark: {}, porchColumnFinish: { name: 'cream' }, porchPillars: [], fitTrimTopToPorchRoof: (part) => part,
    finishes: { porchColumn: { name: 'Warm cream painted straight square porch column' } },
    box(parent, x, y, z, w, h, d, material) { const mesh = { x, y, z, w, h, d, material }; meshes.push(mesh); return mesh; },
    brickBox(parent, x, y, z, w, h, d) { const mesh = { name: 'Column brick base', x, y, z, w, h, d }; meshes.push(mesh); return mesh; }
  };
  const start = source.indexOf('  for (const x of [1, 11.65, 19.55, 30.2])');
  const end = source.indexOf('  const porchCanopyHeight =', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  const columns = meshes.filter((mesh) => mesh.name === 'Straight square warm cream porch column');
  assert.equal(columns.length, 4);
  for (const column of columns) {
    assert.equal(column.w, 1);
    assert.equal(column.d, column.w);
    assert.equal(column.material, context.porchColumnFinish);
    assert.equal(column.userData.profile, 'square');
    assert.equal(column.userData.curvedBrackets, false);
    assert.ok(Math.abs(column.userData.widthInches - column.w * 12) < 1e-9);
  }
  const bases = meshes.filter(m => m.name === 'Simple square warm cream column base');
  assert.equal(bases.length, 4);
  assert.ok(bases.every(m => m.w === 7/6 && m.d === 7/6 && m.y+m.h/2===2.5 && m.material === context.porchColumnFinish));
  assert.equal(meshes.filter(m => m.name === 'Simple square porch column capital').length, 4);
  assert.ok(!meshes.some(m => /stone|limestone|ashlar|bracket|brace|corbel|arch/i.test(m.name)));
  const headerStart = source.indexOf('  for (const [left, right] of [[-0.65, 11.025]');
  context.entryPortal = {};
  vm.runInNewContext(source.slice(headerStart, source.indexOf('  const porchFasciaZ =', headerStart)), context);
  const headers = meshes.filter(m => m.name === 'Raised porch side header clear of eight-foot door');
  const entryBeam = meshes.find(m => m.name === 'Straight entry beam between square columns');
  assert.equal(headers.length, 2);
  for (const beam of [...headers, entryBeam]) {
    assert.ok(Math.abs(beam.y - beam.h / 2 - 9.7) < 1e-9, 'Header has 1.7 ft clearance above the door head');
    assert.equal(beam.z, headers[0].z);
  }
  assert.ok(Math.abs(headers[0].w - 11.675) < 1e-8);
  assert.ok(Math.abs(headers[0].x + headers[0].w / 2 - (entryBeam.x - entryBeam.w / 2)) < 1e-9 &&
    Math.abs(entryBeam.x + entryBeam.w / 2 - (headers[1].x - headers[1].w / 2)) < 1e-9, 'One continuous straight beam line');
  assert.doesNotMatch(source, /Continuous porch fascia and cornice|Continuous shingle porch roof/);
});

test('slim column lantern constituents mount at the face without positive embedding', () => {
  const parts=[];
  class Group {
    constructor(){this.position={set(x,y,z){Object.assign(this,{x,y,z});}};}
    add(o){o.parent=this;}
  }
  const context={facadePrototype:false,HomeRoof:{studyAlternative:'historical'},THREE:{Group,PointLight:class extends Group{}},group:{},dark:{},glow:{},lanternBronze:{name:'bronze'},
    finishes:{lantern:{name:'Dark bronze European lantern',kelvin:2700}},
    mat:()=>({}),box(parent,x,y,z,w,h,d){
      const m={x,y,z,w,h,d,parent};parts.push(m);return m;
    }};
  vm.createContext(context);
  const start=source.indexOf('  function lantern('),end=source.indexOf('  brickBox(group, 15.6, -0.15,',start);
  assert.ok(start >= 0 && end > start, 'Porch lantern extraction ends before the entry landing');
  context.porchPillars=[{userData:{entryColumn:true},position:{y:4.85},add(o){o.parent=this;}}];
  vm.runInContext(source.slice(start,end),context);
  for(const p of parts) {
    const minZ=p.parent.position.z+p.z-p.d/2;
    assert.ok(minZ>=0.5-1e-8,`${p.name||'lantern frame'} embedded in 12-inch shaft`);
  }
  assert.ok(Math.abs(parts.find(p=>p.name==='Exterior lantern wall backplate').parent.position.z-0.72)<1e-8);
});

test('procedural fallback brick retains the original bond and applies warm ivory grading', () => {
  const fills = [];
  let written;
  const paint = {
    fillStyle: '', fillRect(...bounds) { fills.push({ color: this.fillStyle, bounds }); },
    getImageData() { return { data: new Uint8ClampedArray([168,120,96,255, 205,205,200,255]) }; },
    putImageData(image) { written = [...image.data]; }
  };
  const context = {
    document: { createElement() { return { getContext() { return paint; } }; } },
    THREE: { CanvasTexture: class { constructor(canvas) { this.image = canvas; } }, MeshStandardMaterial: class { constructor(options) { Object.assign(this, options); } }, SRGBColorSpace: 'srgb', RepeatWrapping: 'repeat' }
  };
  vm.createContext(context);
  const start = source.indexOf('  const frontBrick =');
  const end = source.indexOf('  function brickBox(', start);
  vm.runInContext(source.slice(0, source.indexOf('function buildExteriorModel')) + '\n' + source.slice(start, end), context);
  assert.equal(fills[0].color, '#d3cec4');
  assert.deepEqual([...new Set(fills.slice(1).map((fill) => fill.color))].sort(), ['#a8735a', '#ad7b60', '#b8836a', '#c08c70']);
  assert.equal(fills.length, 41);
  assert.ok(fills.slice(1).every((fill) => fill.bounds[2] === 60 && fill.bounds[3] === 28));
  // A chromatic scan face becomes warm ivory brick; a pale neutral joint becomes cream mortar.
  assert.deepEqual(written, [232,214,184,255, 248,239,219,255]);
});

test('Dark Bronze window frames have restrained six-light grilles on every elevation; sills and heads stay warm cream', () => {
  const meshes = [];
  class Group {
    constructor() { this.userData = {}; this.position = { set() {} }; }
    add(mesh) { meshes.push(mesh); }
    updateWorldMatrix() {}
    localToWorld(vector) { return vector; }
  }
  const context = { facadePrototype: false, windowInstallations: [], wallThickness: 0.45, getWindowProductIntent: require('../assets/js/floor-plan-ground.js').getWindowProductIntent, THREE: { Group, Vector3: class { constructor(x,y,z) { Object.assign(this,{x,y,z}); } } }, dark: {}, trim: { name: 'trim' }, windowBronze: { name: 'bronze' }, windowBlack: {}, glass: {}, privacyGlass: {}, box(parent, x, y, z, w, h, d, material) { const mesh = { x, y, z, w, h, d, material, parent }; parent.add(mesh); return mesh; } };
  vm.createContext(context);
  const groundSource = fs.readFileSync(require.resolve('../assets/js/floor-plan-ground.js'), 'utf8');
  context.addWindowShadeDivisions = require('../assets/js/floor-plan-ground.js').addWindowShadeDivisions;
  vm.runInContext(source.slice(0, source.indexOf('function buildExteriorModel')) + '\nconst finishes = getExteriorMaterialConfig();', context);
  vm.runInContext(groundSource.slice(groundSource.indexOf('function addFrontWindowGrilles('), groundSource.indexOf("if (typeof module !== 'undefined' && module.exports) module.exports.getWindowProductIntent")), context);
  vm.runInContext(source.slice(source.indexOf('  function windowUnit('), source.indexOf('  function wall(')), context);
  for (const front of [true, false]) {
    meshes.length = 0;
    context.front = front;
    vm.runInContext('windowUnit(new THREE.Group(), 6, 3, 6, 5, false, false, true, front)', context);
    assert.equal(meshes.filter((mesh) => /grille/i.test(mesh.name ?? '')).length, 12, 'Two units, two faces, one vertical and two horizontal bars');
    assert.equal(meshes.filter((mesh) => mesh.name === 'Dark Bronze joined-unit mullion cover' && mesh.d === 0.5 && mesh.w === 3.5 / 12).length, 1);
    const frameParts = meshes.filter((mesh) => mesh.material && mesh.material !== context.glass && !/depth allowance/.test(mesh.name ?? '') && mesh.y > 0 && mesh.y < 5 && mesh.parent.userData.manufacturer);
    assert.ok(frameParts.length >= 5 && frameParts.every((mesh) => mesh.material === context.windowBronze), 'Slim frames, sashes and mullions are Dark Bronze');
    const surround = meshes.filter((mesh) => mesh.material && !mesh.parent.userData.manufacturer && !/depth allowance/.test(mesh.name ?? ''));
    assert.equal(surround.length, 2);
    assert.ok(surround.every((mesh) => mesh.material === context.trim), 'Sill and head trim stay warm cream, not bright white');
  }
  assert.match(source, /exteriorTrim: 'Dark Bronze'/);
  assert.equal(vm.runInContext('finishes.window.frontGrilles', context), true);
  assert.equal(require('../assets/js/floor-plan-ground.js').getWindowProductIntent(3, 5).exteriorFinish, 'Dark Bronze');
  const viewer = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
  assert.match(viewer, /const windowExterior = mat\(getExteriorMaterialConfig\(\)\.window\.exterior, 0\.6\);/);
  assert.match(viewer, /const exteriorFinish = 'Dark Bronze';/);
  assert.match(viewer, /addFrontWindowGrilles\(grilles, box, exteriorMaterial/);
  assert.doesNotMatch(fs.readFileSync(require.resolve('../assets/js/floor-plan-upstairs.js'), 'utf8'), /frontGrid/);
});

test('reference elevation uses fixed brick without an optional finish control', () => {
  const repeats = [];
  const frontBrick = { clone() { return {}; }, map: { clone() { return { repeat: { set(...values) { repeats.push(values); } } }; } } };
  const context = { frontBrick, masonryMaps: null, box(parent, x, y, z, w, h, d, material) { return { material }; } };
  vm.runInNewContext(source.slice(source.indexOf('  const brickTextureWidthFeet ='), source.indexOf('  group.userData.brickFormat =')) + '\nglobalThis.brickTextureWidthFeet = brickTextureWidthFeet; globalThis.brickTextureHeightFeet = brickTextureHeightFeet;', context);
  vm.createContext(context);
  const start = source.indexOf('  function brickBox(');
  const end = source.indexOf('  if (masonryMaps) {', start);
  vm.runInContext(source.slice(start, end), context);
  const base = vm.runInContext('brickBox({}, 0, 0, 0, 6, 1, 0.45)', context);
  assert.equal(base.name, 'Warm ivory brick masonry');
  assert.ok(base.material.map);
  assert.equal(base.material.bumpMap, base.material.map);
  assert.deepEqual(repeats, [[2.25, 12 / 25]]);
  assert.doesNotMatch(source, /setFrontBrick|frontBrickEnabled|Optional front brick/);
  assert.doesNotMatch(fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8'), /front-brick-toggle/);
});

test('full brick constituents respect every fixed opening without stone bands, applied siding or battens', () => {
  const meshes = [], walls = [];
  class Group {
    constructor() { this.userData = {}; this.position = { set() {} }; this.rotation = {}; }
    add(mesh) { mesh.wall = this; meshes.push(mesh); }
  }
  const context = { facadePrototype: false, stoneTexture: { clone: () => ({repeat:{set(){}}}) }, THREE: { Group }, white: {}, trim: {}, garageFloorY: -1.25, group: { add(wall) { walls.push(wall); } }, wallThickness: 0.45, box(parent, x, y, z, w, h, d) { const mesh = { x, y, z, w, h, d, finish: 'siding' }; parent.add(mesh); return mesh; }, brickBox(parent, x, y, z, w, h, d) { const mesh = { x, y, z, w, h, d, finish: 'brick' }; parent.add(mesh); return mesh; }, windowUnit() {}, getUpstairsExteriorSegments: () => [] };
  context.brickSoldierBox = context.brickBox;
  vm.createContext(context);
  vm.runInContext(source.slice(0, source.indexOf('function buildExteriorModel')) + '\nconst cladding = getExteriorCladdingStudy();', context);
  vm.runInContext(source.slice(source.indexOf('  function wall('), source.indexOf('  const win =')), context);
  for (const name of ['front ground floor', 'west ground floor', 'kitchen and prep rear', 'east ground floor', 'upper west', 'upper bath rear', 'garage front']) {
    vm.runInContext(`wall('${name}', 0, 0, 10, 0, -0.4, 9, [{center:5,width:2,sill:3,height:5}])`, context);
  }
  assert.equal(walls.length, 7);
  assert.ok(walls.every((wall) => wall.name.startsWith('Exterior brick wall:')));
  assert.ok(meshes.filter((mesh) => mesh.finish !== 'brick').every((mesh) => /course|Cornice|Upper window|limestone plinth/.test(mesh.name)));
  assert.ok(!meshes.some((mesh) => /batten|siding/.test(mesh.name ?? '')));
  for (const mesh of meshes.filter((mesh) => mesh.finish === 'brick')) {
    assert.ok(mesh.x + mesh.w / 2 <= 4 + 1e-9 || mesh.x - mesh.w / 2 >= 6 - 1e-9 || mesh.y + mesh.h / 2 <= 3 + 1e-9 || mesh.y - mesh.h / 2 >= 8 - 1e-9, 'Panels and battens do not fill the window opening');
  }
  const stone = meshes.filter(m => /stone|wainscot|coping/i.test(m.name ?? '') || m.finish === 'stone');
  assert.equal(stone.length, 0, 'No continuous stone wainscot, coping or foundation band');
  const fields = meshes.filter(m => m.finish === 'brick' && m.z === 0);
  assert.ok(fields.length > 21);
  for (const wall of walls) {
    const own = fields.filter(m => m.wall === wall);
    if (own.length) assert.ok(Math.min(...own.map(m => m.y - m.h / 2)) <= -0.4 + 1e-9, `${wall.name}: brick runs down to the footing`);
  }
  assert.doesNotMatch(source, /board-and-batten siding|siding vertical batten|gable vertical batten|Coursed cream limestone|Limestone gable end|White front gable end|Continuous low stone wainscot|Pale base transition coping/);
});

test('slim paired masonry bays create 2.4-inch pockets without occupying fixed apertures', () => {
  const meshes = [];
  const context = {
    trim: {}, wallThickness: 0.45,
    brickBox(parent, x, y, z, w, h, d) { const m = { x, y, z, w, h, d }; meshes.push(m); return m; },
    box(parent, x, y, z, w, h, d) { const m = { x, y, z, w, h, d, rotation: { x: 0 } }; meshes.push(m); return m; }
  };
  context.brickSoldierBox = context.brickBox;
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('  function articulateUpperMasonry('), source.indexOf('  const win =')), context);
  context.frontOpenings = upperPlan.getUpstairsFrontWindows();
  vm.runInContext("articulateUpperMasonry({name:'Exterior brick wall: upper front bedrooms',userData:{}},31.570833333333,19,frontOpenings)", context);
  const piers = meshes.filter(m => m.name === 'Upper bay projecting masonry pier');
  const centers = upperPlan.getUpstairsFrontWindows().map(w => w.center);
  assert.ok(piers.every((p, i) => Math.abs(p.x - [centers[0]-3.75, centers[1]+3.75, centers[2]-3.75, centers[3]+3.75][i]) < 1e-8));
  for (const pier of piers) {
    assert.equal(pier.w, 1);
    assert.ok(Math.abs((pier.z + pier.d / 2 - 0.225) * 12 - 2.4) < 1e-8);
  }
  const sills = meshes.filter(m => m.name === 'Paired window continuous brick rowlock sill');
  assert.equal(sills.length, 2);
  assert.ok(sills.every((m, i) => Math.abs(m.x - (centers[i*2]+centers[i*2+1])/2) < 1e-8 && m.w === 10));
  for (const m of meshes) for (const x of centers) {
    assert.ok(m.x + m.w / 2 <= x - 1.5 || m.x - m.w / 2 >= x + 1.5 ||
      m.y + m.h / 2 <= 13 || m.y - m.h / 2 >= 18, `${m.name} crosses glazing`);
  }
});

test('warm ivory brick and entrance cast stone have independent diffuse sources and relief', () => {
  const pixels = { data: new Uint8ClampedArray([40,40,40,255,200,200,200,255]) };
  let ivoryBytes;
  const paint = { drawImage() {}, getImageData() { return pixels; }, putImageData() { if (!ivoryBytes) ivoryBytes = [...pixels.data]; } };
  const normalMap = {}, roughnessMap = {};
  const context = {
    document: { createElement() { return { getContext: () => paint }; } },
    masonryMaps: { brick: { map: { image: {} }, normalMap, roughnessMap } }, stoneTexture: { image: {} },
    frontBrick: { color: { set() {} }, clone() { return {}; } },
    THREE: { CanvasTexture: class {
      constructor(image) { this.source = { data: image }; }
      get image() { return this.source.data; }
      set image(value) { this.source.data = value; }
      clone() { const clone = new this.constructor(); clone.source = this.source; return clone; }
    }, MeshStandardMaterial: class { constructor(options) { Object.assign(this,options); } }, Vector2: class { constructor(x,y) { Object.assign(this,{x,y}); } }, SRGBColorSpace: 'srgb', RepeatWrapping: 'repeat' }
  };
  const start = source.indexOf('  if (masonryMaps) {', source.indexOf('  function brickBox('));
  vm.runInNewContext(source.slice(0, source.indexOf('function buildExteriorModel')) + '\nconst finishes = getExteriorMaterialConfig();\nlet baseBrick;\n' + source.slice(start, source.indexOf('  function brickFaceUVs(', start)) + '\nglobalThis.testBaseBrick = baseBrick;', context);
  assert.equal(paint.filter, 'none');
  assert.deepEqual(ivoryBytes, [203,189,165,255,248,239,219,255], 'Ivory brick face and cream mortar keep joint separation without source red cast');
  assert.equal(context.frontBrick.normalMap, normalMap);
  assert.equal(context.frontBrick.roughnessMap, roughnessMap);
  assert.equal(context.frontBrick.bumpMap, null);
  assert.equal(context.frontBrick.normalScale.x, 0.18);
  assert.notEqual(context.testBaseBrick.map.source, context.frontBrick.map.source,
    'actual palette construction must not share Three Texture Source');
  assert.notEqual(context.testBaseBrick.map.image, context.frontBrick.map.image);
  assert.equal(context.testBaseBrick.map.colorSpace, 'srgb');
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
  const getUpstairsFrontWindows = require('../assets/js/floor-plan-upstairs.js').getUpstairsFrontWindows;
  const context = { HomeRoof:require('../assets/js/floor-plan-roof.js'),group: { userData: {} }, dark: {}, box() { return {}; }, wall(name, ...args) { const value = { name, args, userData: {} }; walls.push(value); return value; }, win(center, width, sill = 3, height = 5) { return { center, width, sill, height }; }, floorToFloor: 10, upper: 10, eaves: 19 };
  context.getUpstairsFrontWindows = getUpstairsFrontWindows;
  context.getGroundFrontWindows = require('../assets/js/floor-plan-ground.js').getGroundFrontWindows;
  context.frontWallZ = require('../assets/js/floor-plan-ground.js').getGroundFrontLayout().wallZ;
  vm.createContext(context);
  const lines = source.split('\n');
  for (const name of ['front ground floor']) {
    const line = lines.find((line) => line.includes(`wall('${name}'`));
    assert.ok(line);
    vm.runInContext(line, context);
  }
  drawMeasuredUpper(context);
  const start = source.indexOf('  const garageFacadeEaves =');
  const end = source.indexOf('  function renderRoofEnvelope(', start);
  vm.runInContext(source.slice(start, end), context);
  const ground = walls.find((wall) => wall.name === 'front ground floor').args.at(-1);
  assert.deepEqual(JSON.parse(JSON.stringify(ground.filter((opening) => !opening.door))), require('../assets/js/floor-plan-ground.js').getGroundFrontWindows());
  const upper = walls.filter(wall => ['upper front bedrooms', 'upper front bedroom 4'].includes(wall.name)).flatMap(wall => wall.args.at(-1));
  assert.equal(upper.length, 4);
  assert.ok(!walls.some((wall) => /Garage.*upper/.test(wall.name)));
  context.gable = (...args) => gables.push(args);
  context.hipRoof = (...args) => gables.push(args);
  assert.doesNotMatch(source, /gable\('(West|Central|Garage) farmhouse gable'/);
  assert.doesNotMatch(source, /gable\('Entry porch gable'|Reference garage standing-seam eyebrow canopy/);
  assert.match(source, /renderRoofEnvelope\('Connected standing-seam porch and entry roof'/);
  assert.match(source, /HomeRoof\.getPorchRoofDefinitions\(\), porchMetal, true/);
  assert.doesNotMatch(source, /gable\('Entry farmhouse pediment'/);
});

test('four balanced exterior upper-front windows match furnished upstairs wall openings and frames', () => {
  const plan = require('../assets/js/floor-plan-upstairs.js').getUpstairsDefaultPlan(require('../assets/js/upstairs-layout.js').stairOpening());
  const walls = plan.walls.filter(([name]) => ['Bedrooms south', 'Bedroom 4 south'].includes(name));
  const cuts = walls.flatMap(([, x, , , , holes]) => holes.map(([a, b, low, high]) => [x + a, x + b, low, high]));
  const frames = plan.windows.filter(([name]) => /Bedroom [34] south/.test(name));
  const exteriorOpenings = [];
  drawMeasuredUpper({
    win: (center, width, sill, height = 5) => ({ center, width, sill, height }),
    wall(...args) {
      if (['upper front bedrooms', 'upper front bedroom 4'].includes(args[0])) {
        exteriorOpenings.push(...args[7].map(o => ({ ...o, center: args[1] + o.center })));
      }
    }
  });
  assert.equal(frames.length, 4);
  assert.equal(cuts.length, 4);
  for (const name of ['Bedroom 3', 'Bedroom 4']) {
    const room = plan.rooms.find(r => r.name === name);
    assert.ok(Math.abs(room.w - .35 - 12) < 1e-8);
    assert.ok(Math.abs(room.d - .35 - 13) < 1e-8);
    const pair = frames.filter(f => f[0].startsWith(name));
    assert.ok(Math.abs((pair[0][1] + pair[1][1])/2 - (room.x + room.w/2)) < 1e-8);
  }
  for (const closet of plan.rooms.filter(r => /Bedroom [34] closet/.test(r.name))) assert.ok(Math.abs(closet.w - .35 - 6.15) < 1e-8);
  for (const [index, frame] of frames.entries()) {
    const opening = exteriorOpenings[index];
    assert.ok(Math.abs(frame[1] - opening.center) < 1e-8);
    assert.equal(frame[3], opening.width);
    assert.ok(Math.abs((cuts[index][0] + cuts[index][1]) / 2 - opening.center) < 1e-8);
    assert.deepEqual(cuts[index].slice(2), [3, 8]);
    assert.equal(opening.sill, 13);
    assert.equal(opening.height, 5);
  }
});
