'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const HomeRoof = require('../floor-plan-roof.js');
const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');

function render(metal = false, override = null) {
  class Vector {
    constructor(x = 0, y = 0, z = 0) { Object.assign(this, { x, y, z }); }
    clone() { return new Vector(this.x, this.y, this.z); }
    sub(other) { this.x -= other.x; this.y -= other.y; this.z -= other.z; return this; }
    length() { return Math.hypot(this.x, this.y, this.z); }
    normalize() { const length = this.length(); this.x /= length; this.y /= length; this.z /= length; return this; }
  }
  class Group {
    constructor() {
      this.children = []; this.userData = {};
      this.position = new Vector();
      this.quaternion = { setFromUnitVectors: (from, to) => { this.axis = to.clone(); } };
    }
    add(child) { child.parent = this; this.children.push(child); }
  }
  class Geometry {
    constructor() { this.attributes = {}; }
    setAttribute(name, attribute) { this.attributes[name] = attribute; }
    computeVertexNormals() {}
  }
  const context = {
    THREE: {
      Group, Vector3: Vector, DoubleSide: 2, BufferGeometry: Geometry,
      Float32BufferAttribute: class { constructor(array) { this.array = array; } },
      Mesh: class extends Group { constructor(geometry, material) { super(); Object.assign(this, { geometry, material }); } }
    },
    HomeRoof, group: new Group(), white: { clone: () => ({}) }, trim: {}, mat: () => ({}),
    box(parent, x, y, z, width, height, depth, material) {
      const mesh = new Group();
      Object.assign(mesh, { geometry: { width, height, depth }, material });
      Object.assign(mesh.position, { x, y, z });
      parent.add(mesh);
      return mesh;
    }
  };
  vm.createContext(context);
  const start = source.indexOf('  function renderRoofEnvelope('), end = source.indexOf('  const slateFinish =', start);
  assert.ok(start >= 0 && end > start);
  vm.runInContext(source.slice(start, end), context);
  const definitions = override || (metal ? HomeRoof.getPorchRoofDefinitions() : HomeRoof.getConnectedRoofDefinitions());
  const model = context.renderRoofEnvelope('Test connected roofs', definitions, {}, metal);
  return { model, definitions };
}

test('roof edges receive closed soffits and deep trim only along the envelope perimeter, not across valleys', () => {
  const { model } = render();
  const surfaces = model.children.filter((part) => part.userData.roofSurface);
  assert.ok(surfaces.length > 10);
  assert.equal(surfaces.length, model.userData.faceCount);
  const fascia = model.children.filter((part) => /Connected roof (rake|eaves) fascia/.test(part.name));
  assert.ok(fascia.length > 5);
  for (const part of fascia) assert.equal(part.geometry.height, 0.45);
  assert.ok(model.children.some((part) => part.name === 'Connected roof closed edge soffit'));
  assert.ok(model.children.some((part) => part.name === 'Connected roof perimeter gutter'));
  assert.ok(model.children.some((part) => part.name === 'Stepped roof wall-abutment flashing'));
  for (const join of model.children.filter((part) => part.userData.roofJoin === 'valley')) {
    assert.equal(join.geometry.height, 0.015, 'Valleys have slim flashing, not thick white eaves');
  }
  const undersides = model.children.filter((part) => part.name === 'Closed connected roof underside');
  assert.equal(undersides.length, surfaces.length);
  assert.ok(undersides.every((part) => part.userData.noExteriorShadow));
});

test('garage roof is one full-width front gable joined to the retained hip, with real roof faces and no brow canopy', () => {
  const { model, definitions } = render(false, HomeRoof.getLowerRoofDefinitions());
  const plan = HomeRoof.buildRoofEnvelope(definitions);
  const gable = definitions.find(({ id }) => id === 'Garage front gable');
  assert.deepEqual(gable.bounds, [30.3, 56.2, 37.5, 49.85]);
  close(Math.hypot(gable.planes[0][0], gable.planes[0][1]) * 12, 7.2 / 12.95 * 12);
  close(HomeRoof.heightAt(gable.planes[0], [43.25, 49.85]), 16.1);
  const garageFaces = model.children.filter((part) => part.userData.roofSurface && part.userData.roof === gable.id);
  assert.ok(garageFaces.length >= 2, 'The actual roof mesh contains both broad gable slopes');
  for (const part of garageFaces) {
    const face = plan.faces.find(({ id }) => id === part.userData.patch);
    assert.ok(face);
    const positions = part.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      close(positions[i + 1], HomeRoof.heightAt(face.plane, [positions[i], positions[i + 2]]));
    }
  }
  const frontApex = plan.faces.find((face) => face.roof === gable.id && HomeRoof.contains(face.polygon, [43.25, 49.225]));
  assert.ok(frontApex);
  close(HomeRoof.heightAt(frontApex.plane, [43.25, 49.225]), 15.73562753036437);
  assert.ok(plan.joins.some((join) => join.type === 'valley' && join.roofs.includes(gable.id) && join.roofs.includes('Garage hip')));
  const undersides = model.children.filter((part) => part.name === 'Closed connected roof underside');
  assert.equal(undersides.length, model.children.filter((part) => part.userData.roofSurface).length);
  const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  assert.doesNotMatch(source, /Garage metal canopy|Garage brow|GarageCanopyDefinitions/);
  function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-5, `${actual} != ${expected}`); }
});

test('real soffit vertices stay below the visible roof instead of projecting white panels through hips', () => {
  const { model, definitions } = render();
  const plan = HomeRoof.buildRoofEnvelope(definitions);
  const soffits = model.children.filter((part) => part.name === 'Connected roof closed edge soffit');
  assert.ok(soffits.length >= 8, 'The simplified measured perimeter still has actual soffit constituents');
  for (const soffit of soffits) {
    const positions = soffit.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const point = [positions[i], positions[i + 2]];
      const faces = plan.faces.filter((face) => HomeRoof.contains(face.polygon, point));
      assert.ok(faces.length, 'Soffit stays inside visible roof footprint');
      const roofY = Math.max(...faces.map((face) => HomeRoof.heightAt(face.plane, point)));
      assert.ok(positions[i + 1] <= roofY - 0.19, `Soffit at ${point} must not pierce roofing`);
    }
  }
});

test('lower mixed roof renders clipped metal ribs and opaque undersides on the derived envelope', () => {
  const definitions = HomeRoof.getLowerRoofDefinitions();
  const { model } = render(false, definitions);
  const plan = HomeRoof.buildRoofEnvelope(definitions);
  const skins = model.children.filter(p => p.userData.roofSurface);
  assert.equal(skins.length, plan.faces.length);
  assert.equal(model.children.filter(p => p.name === 'Closed connected roof underside').length, skins.length);
  for (const skin of skins) {
    const face = plan.faces.find(f => f.id === skin.userData.patch &&
      JSON.stringify(f.polygon) === JSON.stringify(skin.userData.polygon));
    assert.ok(face);
    const positions = skin.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      assert.ok(Math.abs(positions[i + 1] - HomeRoof.heightAt(face.plane, [positions[i], positions[i + 2]])) < 1e-5);
    }
  }
  assert.ok(model.children.some(p => p.name === 'Clipped standing-seam roof rib'));
  const metalPerimeter = model.children.filter(p => /Connected roof .*fascia/.test(p.name) &&
    p.position.x > 55.7 && p.position.z < 35.55);
  assert.equal(metalPerimeter.length, 0, 'Metal eaves receive their own fitted sections, not slate fascia');
});

test('metal ribs follow clipped porch/entry polygons with one shared finish and no standalone intersecting panels', () => {
  const { model, definitions } = render(true);
  const finish = model.children.find((part) => part.userData.roofSurface).material;
  assert.ok(definitions.every((definition) => definition.finish === 'metal'));
  assert.ok(model.children.filter((part) => part.userData.roofSurface).every((part) => part.material === finish));
  const ribs = model.children.filter((part) => part.name === 'Clipped standing-seam roof rib');
  assert.ok(ribs.length > 10);
  assert.ok(ribs.every((part) => part.material === finish && part.userData.noExteriorShadow));
  const barrelRibs = ribs.filter(part => part.userData.roof === 'Entry barrel metal');
  assert.ok(barrelRibs.length > 4);
  assert.ok(barrelRibs.every(part => Math.abs(part.axis.x) < 1e-8), 'Barrel seams run longitudinally, not as sixteen diagonal grids');
  assert.ok(!model.children.some(part => part.userData.roofJoin &&
    part.userData.roofs.every(roof => roof === 'Entry barrel metal')), 'Curved approximation facets are not separate raised hip caps');
  assert.ok(model.children.some((part) => part.name === 'Connected roof valley'), 'Barrel accent joins the porch through actual clipped valleys');
  assert.ok(!model.children.some((part) => /fascia|gutter/.test(part.name)), 'Preserve the corrected metal-roof perimeter trim rather than adding crossing white strips');
});
