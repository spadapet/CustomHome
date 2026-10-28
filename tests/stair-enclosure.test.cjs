'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const layout = require('../upstairs-layout.js');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

// Execute production constructors, not a separately described storage layout.
function build() {
  class Group {
    constructor() {
      this.children = []; this.userData = {}; this.visible = true;
      this.position = { set() {} };
    }
    add(part) { this.children.push(part); }
  }
  const meshes = [], beams = [], stairs = new Group();
  const opening = layout.stairOpening();
  const context = {
    THREE: { Group, PointLight: Group }, stairs, stairOpening: opening,
    stairWidth: 44 / 12, wallSideStairWidth: opening.depth - 44 / 12 - 0.25,
    stairGap: 0.25, stairDepth: opening.depth, stairRun: 70 / 12,
    stairGoing: 10 / 12, stairRise: 7.5 / 12, stairRisers: 8,
    landingHeight: 5, stairLandingDepth: 4, landingEndX: opening.width, stairEnclosureDepth: 11 / 12,
    stairFloorToFloor: 10, floorAssemblyDepth: 1, outerStairRailZ: opening.depth - 0.08,
    stairwellWallThickness: 0.16, roomDimensions() {},
    oak: {}, walnut: {}, cream: {}, black: {}, wallMaterial: {}, windowTrim: {},
    stairStepGlow: {},
    box(parent, x, y, z, w, h, d) {
      const mesh = { x, y, z, w, h, d, userData: {}, visible: true };
      parent.add(mesh); meshes.push(mesh); return mesh;
    },
    stairBeam(name, start, end) { beams.push({ name, start, end }); }
  };
  vm.runInNewContext(source.slice(source.indexOf('  for (const upper of [false, true])'),
    source.indexOf('  function cabinet(parent,')) +
    '\nthis.upstairsParts = upstairsStairParts; this.basement = basementStairs;', context);
  return { meshes, beams, stairs, opening, context };
}

test('all four former recess zones are closed by adjoining constituent wall/soffit geometry', () => {
  const { meshes, opening } = build();
  const side = meshes.filter(m => /Continuous .*side enclosure/.test(m.name));
  assert.equal(side.length, 8, 'Seven lower-flight panels plus continuous landing panel');
  const soffits = meshes.filter(m => /soffit/.test(m.name));
  let end = 0;
  for (const [i, m] of side.entries()) {
    close(m.x - m.w / 2, end);
    end = m.x + m.w / 2;
    close(m.y - m.h / 2, 0);
    close(m.z - m.d / 2, 0);
    close(m.z + m.d / 2, 11 / 12);
    close(m.y + m.h / 2, i < 7 ? (i + 1) * 7.5 / 12 - 0.2 : 4.7);
    const soffit = soffits.find(s => Math.abs(s.x - m.x) < 1e-8 && Math.abs(s.y - s.h / 2 - m.h) < 1e-8);
    assert.ok(soffit, 'Wall top contacts actual soffit underside, no infill hole');
    close(soffit.x - soffit.w / 2, m.x - m.w / 2);
    close(soffit.x + soffit.w / 2, end);
    assert.ok(soffit.z - soffit.d / 2 <= 1e-8);
    assert.ok(soffit.z + soffit.d / 2 >= 11 / 12);
    // Shared assembly rotates pi and mirrors local z. Check actual transformed extents.
    const worldX = opening.x + opening.width - end;
    const worldZ = opening.z + m.z - m.d / 2;
    assert.ok(worldX >= opening.x - 1e-8);
    close(worldZ, opening.z);
  }
  close(end, opening.width);
  assert.doesNotMatch(source, /stairBookcases|bookcaseBays|Bookcase backing|Bookcase side|Bookcase plinth|Bookcase top|Open bookcase shelf|Built-in shelf book|Bookcase .*infill/);
  assert.ok(meshes.every(m => !/bookcase|shelf|book\b/i.test(m.name)));
});

test('treads, platforms, guards and flat trim remain with no projecting casework', () => {
  const { meshes, beams } = build();
  const treads = meshes.filter(m => m.name === 'Upstairs oak tread');
  assert.equal(treads.length, 14);
  for (const [i, m] of treads.entries()) {
    close(m.w * 12, 10); close(m.h, 0.1);
    close(m.y + m.h / 2, (i % 7 + 1) * 7.5 / 12 + (i >= 7 ? 5 : 0));
  }
  const landing = meshes.find(m => m.name === 'U-turn stair landing');
  close(landing.w, 4); close(landing.y + landing.h / 2, 5);
  assert.equal(meshes.filter(m => m.name === 'Upper stair arrival landing').length, 0,
    'No tan upper platform remains in the always-visible stair assembly');
  assert.equal(beams.filter(b => b.name === 'Stair stringer').length, 4);
  assert.equal(beams.filter(b => b.name === 'Sloped stair handrail').length, 3);
  assert.equal(beams.filter(b => b.name === 'Horizontal stair guard rail').length, 24);
  assert.equal(beams.filter(b => b.name === 'Turning landing side handrail').length, 1);
  assert.equal(beams.filter(b => b.name === 'Horizontal landing guard rail').length, 8);
  assert.equal(meshes.filter(m => m.name === 'Landing guard post').length, 2);
  assert.equal(meshes.filter(m => m.name === 'Stair guard post').length, 9);
  const trim = meshes.filter(m => /baseboard|trim return/.test(m.name));
  assert.equal(trim.length, 4);
  assert.ok(trim.every(m => m.z - m.d / 2 >= -0.75 / 12 - 1e-8));
  assert.ok(trim.every(m => m.z + m.d / 2 <= 44 / 12 + 1e-8));
});

test('raised landing guard retains its full run and posts with the owner-requested junction break', () => {
  const { meshes, beams, opening } = build();
  const cap = beams.find(b => b.name === 'Turning landing side handrail');
  close(cap.start[0], 70 / 12);
  close(cap.end[0], opening.width);
  close(cap.end[0] - cap.start[0], 4);
  for (const point of [cap.start, cap.end]) {
    close(point[1], 8);
    close(point[2], -0.08);
  }
  const transitions = beams.filter(b => b.name === 'Landing guard nosing transition' || b.name === 'Landing guard transition rail');
  assert.equal(transitions.length, 0);
  const sloped = beams.find(b => b.name === 'Sloped stair handrail' && Math.abs(b.end[2] - cap.start[2]) < 1e-8);
  close((cap.start[0] - sloped.end[0]) * 12, 5);
  close((cap.start[1] - sloped.end[1]) * 12, 7.5);
  assert.equal(beams.filter(b => b.name === 'Horizontal landing guard rail').length, 8);
  assert.equal(meshes.filter(m => m.name === 'Landing guard post').length, 2);
  for (const post of meshes.filter(m => m.name === 'Landing guard post')) {
    close(post.y - post.h / 2, 5);
    close(post.y + post.h / 2, 8);
    close(post.z, -0.08);
  }
});

test('basement access/enclosure survives and floor cutaway restores every enclosure part', () => {
  const { meshes, beams, stairs, context } = build();
  assert.equal(meshes.filter(m => m.name === 'Basement oak tread').length, 14);
  assert.equal(beams.filter(m => m.name === 'Basement sloped handrail').length, 3);
  assert.equal(beams.filter(m => m.name === 'Basement sloped guard rail').length, 24);
  assert.equal(beams.filter(m => m.name === 'Basement stair stringer').length, 4);
  assert.equal(meshes.filter(m => m.name === 'Basement stair guard post').length, 9);
  const wallRailZ = context.outerStairRailZ;
  assert.ok(beams.some(b => b.name === 'Basement stair stringer' && b.start[2] === wallRailZ));
  assert.ok(beams.filter(b => /Basement sloped/.test(b.name)).every(b => b.start[2] !== wallRailZ),
    'Only the photo-matched entry outer assembly is omitted; center and return guards remain');
  assert.equal(meshes.filter(m => m.name === 'Basement stairwell side wall').length, 2);
  const landing = meshes.find(m => m.name === 'Basement turning landing');
  close(landing.w, 4); close(landing.y + landing.h / 2, -5);
  const arrival = meshes.find(m => m.name === 'Basement arrival landing');
  close(arrival.w * 12, 44); close(arrival.d * 12, 44);
  close(arrival.y + arrival.h / 2, -10);
  const branch = source.slice(source.indexOf('    if (outside) {', source.indexOf('    const basementCutaway =')),
    source.indexOf("    exterior.getObjectByName('Lot plan annotations')", source.indexOf('    const basementCutaway =')));
  const object = () => ({ visible: true });
  const state = {
    stairs, upstairsStairParts: context.upstairsParts, basementStairs: context.basement,
    shell: object(), upstairs: { group: object() }, outside: false, activeFloor: 'ground',
    name: 'whole', basementCutaway: false, elevationView: false, sinkStorageView: false,
    island: object(), christmasTree: object(), piano: object(), cooktopCabinetry: object(), cooktop: object(),
    cooktopBurners: object(), cookingDetails: object(), cooktopHood: object(),
    cooktopUppers: object(), cuttingBoard: object(), utensilCrock: object(), seasoningTray: object(),
    updatePendantVisibility() {}
  };
  state.groundModelRoots = [state.shell, stairs];
  state.frontPorchChairs = [];
  for (const [view, floor] of [['basement', 'ground'], ['upstairs', 'upstairs'], ['whole', 'ground'], ['fridge', 'ground']]) {
    Object.assign(state, { name: view, activeFloor: floor, basementCutaway: view === 'basement' });
    vm.runInNewContext(branch, state);
    assert.ok(context.upstairsParts.every(p => p.visible === (view !== 'basement')));
    assert.equal(stairs.visible, true);
  }
});
