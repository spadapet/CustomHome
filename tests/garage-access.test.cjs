'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
const { getGroundFloorDefaultPlan, getGarageClerestoryLayout } = require('../floor-plan-ground.js');

test('three high garage picture openings share the lowered slab datum and preserve the side door', () => {
  const windows = getGarageClerestoryLayout();
  assert.equal(windows.length, 3);
  assert.deepEqual(windows.map((window) => window.z), [19.5, 29.5, 39.5]);
  for (const window of windows) {
    assert.equal(window.x, 55.5);
    assert.equal(window.width * 12, 72);
    assert.equal(window.height * 12, 18);
    assert.equal((window.sill + 1.25) * 12, 90, 'Sill is 90 inches above the garage slab, not house datum');
    assert.equal((window.sill + window.height + 1.25) * 12, 108);
    assert.equal(window.fixed, true);
    assert.ok(window.z + window.width / 2 < 44, 'No window cuts the pedestrian door');
  }
  const east = getGroundFloorDefaultPlan().walls.find(([name]) => name === 'Garage east');
  assert.deepEqual(east[5].slice(0, 3), windows.map(({ z, width, sill, height }) => [z - width / 2 - 15, z + width / 2 - 15, sill, sill + height]));
  assert.deepEqual(east[5][3], [29, 32, -1.25, 6.75]);
  assert.ok(source.includes('const garageClerestories = getGarageClerestoryLayout(garageFloorY)'));
  assert.ok(source.includes('sill, -Math.PI / 2, rest, 1, { picture: true }'));
});

test('exterior stone cuts reverse the east-wall windows correctly without covering the side door', () => {
  const exterior = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');
  let openings;
  const start = exterior.indexOf('  const garageSideWall =');
  const end = exterior.indexOf('  const garageSideDoor =', start);
  vm.runInNewContext(exterior.slice(start, end), {
    garageFloorY: -1.25, garageSideDoorCenterZ: 45.5, garageSideDoorWidth: 3,
    garageClerestories: getGarageClerestoryLayout(),
    win: (center, width, sill, height) => ({ center, width, sill, height }),
    wall(...args) { openings = args[7]; }
  });
  assert.equal(openings.length, 5, 'Three garage windows, existing prep window and unchanged side door');
  assert.deepEqual(Array.from(openings.filter((opening) => opening.picture), (opening) => opening.center), [9.5, 19.5, 29.5]);
  for (let i = 1; i < openings.length; i++) assert.ok(openings[i].center - openings[i].width / 2 > openings[i - 1].center + openings[i - 1].width / 2);
});

test('garage entry retains contrasting nosings without LED lighting', () => {
  const parts = [];
  const stair = { add(part) { parts.push(part); } };
  const context = {
    THREE: {
      MeshStandardMaterial: class { constructor(options) { Object.assign(this, options); } },
      PointLight: class {
        constructor(color, intensity, distance) {
          Object.assign(this, { color, intensity, distance });
          this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
        }
      }
    },
    garageEntry: { x: 39.5, z: 26.725, width: 3, going: 11 / 12 },
    garageRisers: 2, garageRise: 0.625, garageFloorY: -1.25, epoxy: {}, cream: {},
    furnishing() { return stair; },
    box(parent, x, y, z, w, h, d, material) {
      const part = { x, y, z, w, h, d, material, userData: {} };
      parent.add(part);
      return part;
    }
  };
  const start = source.indexOf('  const garageStair =');
  const end = source.indexOf('  function vehicle(', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  const strips = parts.filter((part) => part.name?.startsWith('Garage entry LED strip'));
  assert.equal(strips.length, 0);
  for (let index = 0; index < 2; index++) {
    const tread = parts.find((part) => part.name === `Garage entry tread ${index + 1}`);
    assert.equal(tread.w, 3);
    assert.equal(tread.d, 11 / 12);
  }
  assert.equal(parts.filter((part) => part.name === 'Contrasting garage stair nosing').length, 2);
  assert.equal(parts.filter((part) => part.name?.startsWith('Garage entry LED wash')).length, 0);
});

test('interior stair LEDs remain off and sit below and outside the risers on both flight directions', () => {
  assert.match(source, /const stairStepGlow = new THREE\.MeshStandardMaterial\(\{[^\n]*emissiveIntensity: 0,/);
  const start = source.indexOf('    for (let step = 0; step < stairRisers - 1; step++)');
  const end = source.indexOf('    const endX =', start);
  assert.ok(start >= 0 && end > start);
  for (const upper of [false, true]) {
    const parts = [];
    const context = {
      upper, direction: upper ? -1 : 1, startX: upper ? 7.5 : 0, baseHeight: upper ? 5 : 0,
      centerZ: 2, flightWidth: 44 / 12, stairRisers: 10, stairGoing: 10 / 12, stairRise: 0.5,
      stairBookcaseDepth: 11 / 12, stairBookcaseFlightSplitStep: 6, stairBookcaseHeight() { return 0; },
      THREE: { PointLight: class {
        constructor(color, intensity) { this.intensity = intensity; this.position = { set() {} }; }
      } },
      flight: { add(part) { parts.push(part); } }, wallMaterial: {}, oak: {}, walnut: {}, cream: {}, stairStepGlow: {},
      box(parent, x, y, z, w, h, d) {
        const part = { x, y, z, w, h, d };
        parts.push(part);
        return part;
      }
    };
    vm.runInNewContext(source.slice(start, end), context);
    const strips = parts.filter((part) => part.name === 'Interior stair LED strip');
    const treads = parts.filter((part) => part.name === 'Upstairs oak tread');
    assert.equal(strips.length, 9);
    assert.equal(parts.filter((part) => part.name === 'Interior stair LED tread wash').length, 9);
    parts.filter((part) => part.name === 'Interior stair LED tread wash').forEach((light) => assert.equal(light.intensity, 0));
    strips.forEach((strip, index) => {
      const tread = treads[index];
      assert.equal(strip.userData.colorTemperatureKelvin, 2700);
      assert.equal(strip.d, tread.d - 0.25);
      assert.ok(strip.y + strip.h / 2 < tread.y - tread.h / 2);
      assert.ok(Math.abs(strip.x - tread.x) >= tread.w / 2);
    });
  }
});

function buildEquipment(bikes = false) {
  class Group {
    constructor() {
      this.children = [];
      this.userData = {};
      this.rotation = {};
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.scale = { set() {} };
      this.quaternion = { setFromUnitVectors() {} };
    }
    add(part) { this.children.push(part); }
    traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
  }
  class Mesh extends Group {
    constructor(geometry, material) { super(); Object.assign(this, { geometry, material }); }
  }
  const roots = [];
  const garageAssets = Object.fromEntries(['adjustable_wrench', 'combination_wrench', 'cross_pein_hammer', 'handsaw_wood', 'Drill_01', 'metal_toolbox', 'plastic_crate_01'].map((id) => {
    const userData = { asset: `assets/models/poly-haven/${id}/${id}_1k.gltf`, widthInches: 12, heightInches: 12, depthInches: 2, uniformScale: true };
    return [id, { userData, clone() { const group = new Group(); group.userData = { ...userData }; return group; } }];
  }));
  const context = {
    THREE: { Group, Mesh, TorusGeometry: class {}, SphereGeometry: class {}, Vector3: class {} }, garageFloorY: -1.25, ceilingHeight: 9,
    steel: {}, black: {}, linen: {}, oak: {}, mat() { return {}; },
    bicycleGeometry: {
      userData: { asset: 'assets/models/poly-pizza/bicycle-google.glb', lengthInches: 65, widthInches: 22.36, uniformScale: true },
      clone() { return new Group(); }
    },
    garageAssets,
    furnishing(name, x, z, rotation, elevation) {
      const group = new Group();
      group.name = name;
      group.position.set(x, elevation, z);
      group.rotation.y = rotation;
      roots.push(group);
      return group;
    },
    box(parent, x, y, z, w, h, d) {
      const part = new Group();
      part.position.set(x, y, z);
      Object.assign(part, { w, h, d });
      parent.add(part);
      return part;
    },
    cylinder(parent, x, y, z, radius, h) { return this.box(parent, x, y, z, radius * 2, h, radius * 2); },
    stairBeam(name, from, to, w, d, material, parent) {
      const part = new Group();
      Object.assign(part, { name, from, to });
      parent.add(part);
      return part;
    }
  };
  context.cylinder = (parent, x, y, z, radius, h) => context.box(parent, x, y, z, radius * 2, h, radius * 2);
  const start = source.indexOf(bikes ? '  const bikeRack =' : '  const yardTools =');
  const end = source.indexOf(bikes ? '  bikeRack.traverse(' : '  yardTools.traverse(', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  const all = [];
  roots.forEach((root) => root.traverse((part) => all.push(part)));
  return { roots, find: (name) => all.filter((part) => part.name === name) };
}

test('five right-wall bikes alternate head-to-tail with floor parking and a west aisle', () => {
  const model = buildEquipment(true);
  const rack = model.roots[0];
  assert.equal(rack.rotation.y, -Math.PI / 2);
  assert.equal(rack.position.x, 52.5);
  assert.equal(rack.position.z, 21);
  assert.equal(rack.userData.retrievalVerified, false);
  assert.equal(rack.userData.alternatingDirections, true);
  assert.equal(rack.userData.spacingInches, 24);
  const bikes = rack.children.filter((part) => part.name?.startsWith('Floor-parked bicycle'));
  assert.equal(bikes.length, 5);
  assert.equal(model.find('Individual floor stand base').length, 10);
  assert.equal(model.find('Downloaded bicycle model').length, 5);
  const dimensions = rack.userData.bicycleDimensions;
  assert.equal(dimensions.lengthInches, 65);
  assert.equal(dimensions.uniformScale, true);
  bikes.forEach((bike, index) => {
    assert.equal(bike.userData.wheelsOnFloor, true);
    assert.equal(bike.userData.liftingRequired, false);
    assert.equal(bike.rotation.y, index % 2 === 0 ? 0 : Math.PI);
    assert.equal(bike.userData.wheelInStand, index % 2 === 0 ? 'Front' : 'Rear');
    if (index) assert.equal((bike.position.x - bikes[index - 1].position.x) * 12, 24);
    const z = rack.position.z - bike.position.x;
    assert.ok(z - dimensions.widthInches / 24 > 15.175 && z + dimensions.widthInches / 24 < 26.725, 'Bikes stay inside the alcove');
  });
  assert.ok(rack.userData.spacingInches - dimensions.widthInches >= 1.5, 'Keep at least 1.5 inches between full model width envelopes during a straight pull-out');
  assert.ok(4 * rack.userData.spacingInches + dimensions.widthInches <= 120, 'Five bikes occupy no more than ten feet along the wall');
  assert.ok((rack.position.x - dimensions.lengthInches / 24 - 45.575) * 12 > 50, 'Parked bikes leave over 50 inches west of the bikes');
  assert.ok(rack.position.x + dimensions.lengthInches / 24 < 55.325, 'Bikes clear right wall');
});

test('downloaded bicycle loads before the viewer builds, scales uniformly and includes attribution', () => {
  const loading = source.slice(source.indexOf('    const loader ='), source.indexOf('    const bicycleTemplate ='));
  assert.ok(loading.includes('await Promise.all(['), 'Required models finish loading before the viewer is built');
  assert.ok(loading.includes("loader.loadAsync('assets/models/poly-pizza/bicycle-google.glb')"));
  assert.match(source, /bicycleTemplate\.scale\.setScalar\(\(65 \/ 12\) \/ bicycleLength\)/);
  assert.doesNotMatch(source, /function bicycleTube|function bicycleRing/);
  const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
  assert.match(html, /Poly by Google/);
  assert.match(html, /https:\/\/poly\.pizza\/m\/19VoUuA2pcN/);
  assert.match(html, /https:\/\/creativecommons\.org\/licenses\/by\/3\.0\//);
});

test('mower remains on four wheels with its full-length handle unfolded and no upright rotation', () => {
  const model = buildEquipment();
  const mower = model.find('Conventional floor-parked lawn mower')[0];
  assert.equal(mower.userData.foldedHandle, false);
  assert.equal(mower.userData.uprightStorageRequired, false);
  assert.equal(mower.userData.wheelsOnFloor, true);
  assert.ok(mower.children.every((part) => part.rotation.x !== Math.PI / 2));
  assert.equal(model.find('Unfolded mower handle').length, 2);
  assert.equal(model.find('Unfolded mower handle grip')[0].position.z, 3.25);
  assert.equal(model.find('Leaf blower dedicated wall-mount cradle').length, 1);
  assert.equal(model.find('Wall-hung battery leaf blower')[0].userData.wallMounted, true);
});

test('downloaded garage props replace tools and bins without removing equipment or battery storage', () => {
  const model = buildEquipment();
  const tools = model.find('Downloaded garage wall tool');
  assert.equal(tools.length, 5);
  assert.equal(new Set(tools.map((tool) => tool.userData.asset)).size, 5);
  assert.ok(tools.every((tool) => tool.userData.uniformScale && tool.userData.wallMounted));
  assert.equal(model.find('Hanging hand tool').length, 0);
  assert.equal(model.find('Downloaded garage metal toolbox').length, 1);
  assert.equal(model.find('Garage tool storage bin').length, 4);
  assert.ok(model.find('Garage tool storage bin').every((bin) => bin.userData.asset.includes('plastic_crate_01') && bin.position.y === 6.56));
  assert.equal(model.find('Garage tool shelf').length, 2);
  assert.equal(model.find('Removable tool battery and charging dock').length, 3);
  assert.equal(model.find('Large rolling shop vacuum').length, 1);
  assert.equal(model.roots[0].position.x, 32.95);
  assert.equal(model.roots[0].position.z, 27.115);
});

test('rake broom and dustpan hang beside the entry instead of behind the mower', () => {
  const model = buildEquipment();
  const rail = model.find('Accessible garage garden-tool rail')[0];
  assert.ok(rail);
  assert.equal(rail.position.x, 37.75);
  assert.equal(rail.position.z, 27.115);
  assert.equal(rail.position.y, -1.25);
  assert.equal(rail.userData.floorStorage, false);
  assert.equal(rail.userData.widthInches, 30);
  assert.ok(rail.position.x - 1.25 > 36.35, 'Rail is beside, not above the equipment station');
  assert.ok(rail.position.x + 1.25 < 39.5 - 3.625 / 12, 'Rail clears the full house-entry casing');
  for (const name of ['Wall-hung garage rake', 'Wall-hung garage broom', 'Wall-hung garage dustpan']) assert.equal(model.find(name)[0].userData.wallMounted, true);
  assert.equal(model.find('Rake steel tine').length, 16);
  assert.equal(model.find('Broom bristle bundle').length, 24);
  assert.equal(model.find('Spare garage wall hook').length, 4);
  assert.equal(model.find('Long-handle garden tool').length, 0, 'Remove the former anonymous tool stand-ins');
});

test('over-bike lift and its retrieval steps are removed without removing the floor bike rack', () => {
  const model = buildEquipment();
  assert.equal(model.find('Garage access standing platform, not storage deck').length, 0);
  assert.doesNotMatch(source, /bikeStorage|storageAccessSteps|storage-access|Over-bike seasonal storage bin/);
  assert.match(source, /furnishing\('Five-bike roll-in floor rack'/);
  const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
  assert.doesNotMatch(html, /show-bike-storage|data-view="storage-access"|data-view="bike-storage"|Prep\/mudroom divider moved 6 inches/);
  for (const file of ['kitchen.html', 'mud-room.html']) {
    assert.doesNotMatch(fs.readFileSync(require.resolve(`../${file}`), 'utf8'), /October 23 divider|closed oven-handle clearance 43\.3/);
  }
});

test('truck remains in the right bay while parking alignment and BMW rear clearance improve', () => {
  const vehicles = [];
  const start = source.indexOf("  const sierra = vehicle(");
  const end = source.indexOf('  for (const x of [32.5,', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), { vehicle(name, x, z, length, width, mirrors) { vehicles.push({ name, x, z, length, width, mirrors }); } });
  const truck = vehicles.find((car) => car.name === 'GMC Sierra EV'), bmw = vehicles.find((car) => car.name === 'BMW i4');
  assert.equal(truck.x, (44 + 53) / 2, 'Align truck with its right-hand nine-foot garage opening');
  assert.equal(truck.length, 233.42, 'No shrinking truck dimensions to manufacture a clearance');
  assert.equal(bmw.length, 188.5);
  assert.equal(bmw.z, 40, 'BMW moves six inches farther into the garage');
  assert.ok((48.825 - bmw.z - bmw.length / 24) * 12 >= 11.6, 'BMW gains six inches behind, rather than remaining under six inches from the rear wall');
  assert.ok((bmw.z - bmw.length / 24 - 29.105) * 12 >= 36, 'Retain at least three feet ahead to the vacuum/bin projections in the parking lane');
  assert.ok((truck.x - truck.mirrors / 24 - bmw.x - bmw.mirrors / 24) * 12 >= 49, 'Center mirror aisle gains six inches');
  assert.ok((55.325 - truck.x - truck.mirrors / 24) * 12 >= 34, 'Truck retains side-wall mirror clearance');
  assert.ok((truck.x - truck.width / 24 - 42.5) * 12 >= 30, 'Truck body gains separation from the mudroom steps');
});
