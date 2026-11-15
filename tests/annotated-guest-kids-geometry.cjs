'use strict';
// Optional real-Three.js evidence, without adding a package dependency or debug globals.
// CLI: node tests/annotated-guest-kids-geometry.cjs <path-to-three-0.170.0.cjs>
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ground = require('../assets/js/floor-plan-ground.js');

function measure(THREE) {
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
  const scene = new THREE.Scene(), shell = new THREE.Group(), kitchen = new THREE.Group();
  scene.add(shell, kitchen);
  const suite = ground.getGuestSuiteLayout(), refrigeration = ground.getKitchenRefrigerationLayout();
  const material = new THREE.MeshBasicMaterial();
  const context = {
    THREE, scene, shell, kitchen, guestSuite: suite, kitchenRefrigeration: refrigeration,
    kidsRoom: { x: 19, z: refrigeration.bodyFaceZ, width: refrigeration.returnX - 19, southWidth: 12.2 },
    groundFrontWallZ: ground.getGroundFrontLayout().wallZ,
    ceilingHeight: 9, casingSideWidth: 2.5 / 12, casingReveal: 0.125 / 12,
    walls: [], baseTrimSections: [], windowWallDatums: [],
    mat: () => material,
    ...Object.fromEntries(['linen', 'cabinetFinish', 'cabinetRailFinish', 'cabinetPanelFinish',
      'brass', 'oak', 'cream', 'porcelain', 'black', 'windowTrim', 'steel', 'wallMaterial',
      'countertop', 'glass', 'guestVanityStone'].map(name => [name, material])),
    furnishing(name, x, z, rotation = 0) {
      const root = new THREE.Group(); root.name = name;
      root.position.set(x, 0, z); root.rotation.y = rotation; scene.add(root); return root;
    },
    box(parent, x, y, z, w, h, d, finish) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), finish);
      mesh.position.set(x, y, z); parent.add(mesh); return mesh;
    },
    cylinder(parent, x, y, z, radius, height, finish) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), finish);
      mesh.position.set(x, y, z); parent.add(mesh); return mesh;
    }
  };
  vm.createContext(context);
  function run(first, last) {
    const start = source.indexOf(first), end = source.indexOf(last, start);
    assert.ok(start >= 0 && end > start, `${first} ... ${last}`);
    vm.runInContext(source.slice(start, end), context);
  }
  run('  function singlePanelDoor(', '  function cabinetCupPull(');
  run('  function openingCasing(', '  function wall(');
  run('  function wall(', '  function joinWallCorners()');
  run('  const bottomRun =', '  const island =');
  run('  const kidsClay =', '  const officeDeskWidth =');
  run('  for (const compartment of guestSuite.closets)', '  const guestCoats =');
  run('  function toilet(name,', '  const powderBasin');
  context.toilet('Guest bathroom toilet', suite.toilet.x, suite.toilet.z, suite.toilet.rotation);
  context.vanity('Guest bathroom vanity', suite.vanity.x, suite.vanity.z, suite.vanity.width,
    suite.vanity.rotation, suite.vanity.basinCount, suite.vanity.mirrorWidth);
  run('  const showerLayout = guestSuite.shower;', '  const frontDoor =');
  run('  const guestTowel =', "  toilet('Guest bathroom toilet'");
  for (const [name, x1, z1, x2, z2, openings = []] of ground.getGroundFloorDefaultPlan().walls.filter(([name]) =>
    ['Kids north', 'Kids south', 'Kids west', 'Guest west', 'Guest west north', 'Piano recess back', 'Closet south', 'Bathroom south', 'Guest WC privacy'].includes(name))) {
    const door = name === 'Closet south' ? suite.closetDoor : name === 'Bathroom south' ? suite.bathroomDoor : null;
    const options = door ? { pocket: { ...door.pocket, x: door.pocket.x - x1 } } : {};
    const first = context.walls.length;
    context.wall(x1, z1, x2, z2, false, openings, 9, [-1, 1], 0, 0, options);
    context.walls[first].parent.name = `Evidence ${name}`;
  }
  scene.updateMatrixWorld(true);
  const named = name => scene.getObjectByName(name);
  const parts = root => {
    const found = []; root.traverse(p => { if (p.isMesh) found.push(p); }); return found;
  };
  function bounds(root) {
    const total = new THREE.Box3();
    for (const part of parts(root)) {
      part.geometry.computeBoundingBox();
      total.union(part.geometry.boundingBox.clone().applyMatrix4(part.matrixWorld));
    }
    return { minX: total.min.x, maxX: total.max.x, minY: total.min.y, maxY: total.max.y, minZ: total.min.z, maxZ: total.max.z };
  }
  const intersect = (a, b) => ['X', 'Y', 'Z'].every(axis =>
    Math.min(a[`max${axis}`], b[`max${axis}`]) - Math.max(a[`min${axis}`], b[`min${axis}`]) > 1e-6);
  const close = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
  const west = bounds(named('Evidence Kids west'));
  close(west.minX, 18.825); close(west.maxX, 19.175);
  close(west.minZ, refrigeration.bodyFaceZ); close(west.maxZ, suite.kidsSouthZ);
  const infill = parts(named('Evidence Kids west')).filter(p => p.name === 'House wall');
  assert.equal(infill.length, 1, 'Continuous west wall with no old doorway/header parts');
  assert.equal(parts(named('Evidence Kids west')).some(p => /casing/.test(p.name)), false);
  const northParts = parts(named('Evidence Kids north'));
  const northSolids = northParts.filter(p => p.name === 'House wall').map(bounds);
  assert.equal(northSolids.length, 3, 'Two piers and one real head above opening');
  close(northSolids[0].maxX, 20.875);
  close(northSolids[1].minX, 20.875); close(northSolids[1].maxX, 25.875);
  close(northSolids[1].minY, 8);
  close(northSolids[2].minX, 25.875);
  const entryVoid = { minX: 20.875 + 1e-4, maxX: 25.875 - 1e-4,
    minY: 0.001, maxY: 7.999, minZ: refrigeration.bodyFaceZ - 0.3, maxZ: refrigeration.bodyFaceZ + 0.3 };
  northParts.forEach(p => assert.equal(intersect(bounds(p), entryVoid), false, `${p.name} stays outside north threshold`));
  assert.ok(!named('Kids room paired west entry doors'));
  const carcasses = [];
  scene.traverse(p => { if (p.name === 'Refrigeration upper carcass') carcasses.push(p); });
  assert.equal(carcasses.length, 3);
  const faces = carcasses.map(p => bounds(p).minZ);
  faces.forEach(z => close(z, refrigeration.bodyFaceZ));
  const piano = bounds(named('Yamaha ARIUS YDP-145 dimensioned study proxy'));
  // BoxGeometry positions are Float32; allow one ten-thousandth millimeter.
  close((piano.maxZ - piano.minZ) * 304.8, 1357, 1e-4);
  close((piano.maxX - piano.minX) * 304.8, 422, 1e-4);
  close(piano.maxY * 304.8, 969, 1e-4);
  const bench = bounds(named('Guest piano provisional 24 x 12 inch bench'));
  const pianoParts = parts(named('Yamaha ARIUS YDP-145 dimensioned study proxy'));
  const benchParts = parts(named('Guest piano provisional 24 x 12 inch bench'));
  for (const a of benchParts) for (const b of pianoParts)
    assert.equal(intersect(bounds(a), bounds(b)), false, `${a.name} / ${b.name}`);
  const seat = bounds(named('Guest piano bench seat')), rail = bounds(named('YDP-145 pedal rail'));
  const console = bounds(named('YDP-145 rear console housing'));
  const legEast = Math.max(...benchParts.filter(p => p.name === 'Guest piano bench leg').map(p => bounds(p).maxX));
  const wc = named('Guest private WC inward sound-door study'), wcState = wc.userData.interactiveHouseDoor;
  const fixtureParts = [
    ...['Guest bathroom toilet', 'Guest bathroom vanity', 'Guest bathroom shower', 'Guest bathroom wall-mounted towel hook'].flatMap(n => parts(named(n))),
    ...context.walls
  ];
  let wcSamples = 0, wcMinimumSouthGap = Infinity, wcMinimumEastGap = Infinity, wcMinimumWestGap = Infinity;
  for (let degrees = 0; degrees <= 90; degrees += 5) {
    wc.rotation.y = wcState.closedRotationY + wcState.openRotationSign * degrees * Math.PI / 180;
    scene.updateMatrixWorld(true);
    for (const part of parts(wc)) {
      const b = bounds(part);
      for (const fixed of fixtureParts) assert.equal(intersect(b, bounds(fixed)), false, `WC ${degrees}: ${part.name}/${fixed.name}`);
      wcMinimumWestGap = Math.min(wcMinimumWestGap, b.minX - suite.wc.x - 0.175);
      wcMinimumEastGap = Math.min(wcMinimumEastGap, 31.025 - b.maxX);
      wcMinimumSouthGap = Math.min(wcMinimumSouthGap, suite.bathroomDoor.z - 0.175 - b.maxZ);
    }
    wcSamples++;
  }
  assert.ok(wcMinimumWestGap > 0 && wcMinimumEastGap > 0 && wcMinimumSouthGap > 0);
  const wcOpenThresholdInches = (bounds(wc).minZ - suite.wcDoor.z) * 12;
  wc.rotation.y = wcState.closedRotationY;
  scene.updateMatrixWorld(true);
  const storage = ['west', 'east'].map(side => bounds(named(`Guest ${side} end closet storage`)));
  const leaves = ['Guest walk-through closet pocket door', 'Guest bathroom pocket entry from closet'];
  let samples = 0;
  const pocketClearThresholdsInches = [];
  for (const name of leaves) {
    const door = named(name), state = door.userData.interactiveHouseDoor;
    for (let i = 0; i <= 20; i++) {
      door.position.x = state.closedCenterX + (state.openCenterX - state.closedCenterX) * i / 20;
      scene.updateMatrixWorld(true);
      for (const part of parts(door)) for (const wall of context.walls) {
        assert.equal(intersect(bounds(part), bounds(wall)), false, `${name}: wall collision sample ${i}`);
      }
      samples++;
    }
    // Test the production endpoint interaction including deployed edge pull.
    const edge = parts(door).find(p => p.userData.pocketEdgePull);
    edge.position.x = edge.userData.extendedX;
    scene.updateMatrixWorld(true);
    for (const part of parts(door)) for (const wall of context.walls)
      assert.equal(intersect(bounds(part), bounds(wall)), false, `${name}: deployed pull/wall`);
    const opening = name === leaves[0] ? suite.closetDoor : suite.bathroomDoor;
    const edgeBounds = bounds(edge);
    const projection = name === leaves[0] ? opening.x + opening.width - edgeBounds.minX : edgeBounds.maxX - opening.x;
    pocketClearThresholdsInches.push((opening.width - projection) * 12);
    edge.position.x = edge.userData.retractedX;
    door.position.x = state.closedCenterX;
  }
  scene.updateMatrixWorld(true);
  const desks = [1, 2].map(i => bounds(named(`IKEA MITTZON kids desk ${i}`)));
  const chairs = [1, 2].map(i => bounds(named(`Kids desk chair ${i}`)));
  const toy = bounds(named('IKEA TROFAST toy storage 1'));
  const evidence = {
    threeRevision: THREE.REVISION, matrixWorldUpdated: true,
    cabinetCarcassFacesZ: faces, kidsNorthZ: refrigeration.bodyFaceZ,
    northOpeningNominalInches: [60, 96], northOpeningSidesInches: [22.5, 22.5],
    solidWestInfill: west, pocketClearThresholdsInches, wcOpenThresholdInches,
    piano, pianoEndGapsInches: [(piano.minZ - suite.notch.z - 0.175) * 12, (suite.closetSouthZ - 0.175 - piano.maxZ) * 12],
    bench, benchConstituentPianoCollisions: 0,
    benchSeatInsertionInches: (seat.maxX - piano.minX) * 12,
    benchLegPedalRailGapInches: (rail.minX - legEast) * 12,
    benchSeatConsoleVerticalGapInches: (console.minY - seat.maxY) * 12,
    wcSamples, wcFixtureCollisions: 0,
    wcMinimumPaintGapsInches: { west: wcMinimumWestGap * 12, east: wcMinimumEastGap * 12, south: wcMinimumSouthGap * 12 },
    toiletFrontToSouthPaintInches: (suite.bathroomDoor.z - 0.175 - bounds(named('Guest bathroom toilet')).maxZ) * 12,
    bathNominalDepthInches: suite.bathroom.d * 12, wcClearDepthInches: (suite.wc.d - 0.35) * 12,
    storage, closetClearDepthInches: (suite.closet.d - 0.35) * 12,
    storageFrontAisleInches: (storage[1].minX - storage[0].maxX) * 12,
    bedroomFullClearDepthInches: (ground.getGroundFrontLayout().wallZ - 0.225 - suite.bedroom.z - 0.175) * 12,
    pocketSamples: samples, pocketConstituentWallCollisions: 0, desks, chairs, toy,
    toyDeskCornerGapInches: (toy.minX - desks[1].maxX) * 12,
    fullBinToTuckedChairGapInches: (toy.minX - 17.375 / 12 - chairs[1].maxX) * 12,
    absent: ['Family glass dry-erase and cork board', 'Family message wall panelling', 'Family off-white open shelf tower'].every(name => !named(name))
  };
  scene.traverse(p => { if (p.isMesh) p.geometry.dispose(); });
  material.dispose();
  return evidence;
}
module.exports = { measure };
if (require.main === module) {
  assert.ok(process.argv[2], 'Pass the viewer-matching Three.js CommonJS library path.');
  console.log(JSON.stringify(measure(require(require('node:path').resolve(process.argv[2]))), null, 2));
}
