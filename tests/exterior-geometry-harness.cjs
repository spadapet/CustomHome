'use strict';
// Shared bounded harness: runs the production exterior wall/opening section in a
// stub context and records every wall() call (name, end points, datums, openings)
// plus the constituent boxes. Used to compare the furnished opening schedule
// against the committed geometry baseline after exterior finish changes.
const fs = require('node:fs');
const vm = require('node:vm');
const ground = require('../assets/js/floor-plan-ground.js');
const upper = require('../assets/js/floor-plan-upstairs.js');
const HomeRoof = require('../assets/js/floor-plan-roof.js');

function runExteriorWalls() {
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'), 'utf8');
  const groundSource = fs.readFileSync(require.resolve('../assets/js/floor-plan-ground.js'), 'utf8');
  class Group {
    constructor() {
      this.name = ''; this.children = []; this.userData = {}; this.rotation = { x: 0, y: 0 };
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    }
    add(o) { o.parent = this; this.children.push(o); }
    updateWorldMatrix() {}
    localToWorld(v) { return v; }
    findLast(f) { return this.children.findLast(f); }
  }
  const meshes = [], walls = [];
  const box = (parent, x, y, z, w, h, d, material) => {
    const o = new Group(); Object.assign(o, { x, y, z, w, h, d, material });
    o.position.set(x, y, z); parent.add(o); meshes.push(o); return o;
  };
  const named = (name) => ({ name });
  const group = new Group();
  const materials = { brick: named('brick'), soldier: named('soldier'), trim: named('trim'), glass: named('glass'),
    bronze: named('bronze'), castStone: named('castStone') };
  const c = { ...ground, ...upper, HomeRoof, group, box, trim: materials.trim, glass: materials.glass, white: {}, dark: {},
    windowBlack: {}, privacyGlass: {}, windowBronze: materials.bronze, castStone: { clone: () => materials.castStone }, lanternBronze: named('lanternBronze'),
    masonryMaps: null, mat: () => ({}), wallThickness: 0.45, windowInstallations: [],
    floorToFloor: 10, eaves: 19, garageFloorY: -1.25, frontWallZ: ground.getGroundFrontLayout().wallZ,
    entryWood: {}, oakDoorFinish: {}, THREE: { Group, Vector3: class { constructor(x, y, z) { Object.assign(this, { x, y, z }); } } },
    brickBox(parent, x, y, z, w, h, d, base = false) {
      const m = box(parent, x, y, z, w, h, d, base ? materials.castStone : materials.brick);
      m.userData.cladding = base ? 'stone' : 'brick'; return m;
    },
    brickSoldierBox(parent, x, y, z, w, h, d) {
      const m = box(parent, x, y, z, w, h, d, materials.soldier);
      m.userData.cladding = 'brick'; return m;
    } };
  vm.createContext(c);
  const run = (text, start, end) => {
    const a = text.indexOf(start), b = text.indexOf(end, a);
    if (!(a >= 0 && b > a)) throw new Error(`Missing production extraction: ${start}`);
    vm.runInContext(text.slice(a, b), c);
  };
  vm.runInContext(source.slice(0, source.indexOf('function buildExteriorModel')) +
    '\nconst cladding = getExteriorCladdingStudy();\nconst finishes = getExteriorMaterialConfig();', c);
  run(groundSource, 'function addFrontWindowGrilles(', 'function addSingleHungSashes(');
  run(source, '  function windowUnit(', '  const win =');
  const actualWall = c.wall;
  c.wall = (...args) => { walls.push(JSON.parse(JSON.stringify(args))); return actualWall(...args); };
  c.buildArchedFrontEntry = () => {};
  run(source, '  const win =', '  const garageFacadeEaves =');
  return { c, group, meshes, walls, materials, run, Group, source };
}

function roofFaces(defs) {
  return HomeRoof.buildRoofEnvelope(defs).faces.map((f) => ({ roof: f.roof, plane: f.plane, polygon: f.polygon }));
}

module.exports = { runExteriorWalls, roofFaces };
