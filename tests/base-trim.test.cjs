'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = (file) => fs.readFileSync(require.resolve(`../${file}`), 'utf8');
const source = read('floor-plan-3d.js');

test('all model trim excludes quarter-round and shoe molding while retaining flat baseboards', () => {
  for (const file of ['floor-plan-3d.js', 'floor-plan-upstairs.js', 'floor-plan-exterior.js']) {
    assert.doesNotMatch(read(file), /quarter[- ]round|shoeProfile|stairShoe|firstStepShoe|endShoe|shoeRadiusInches/i, file);
  }
  class Shape {
    constructor() { this.points = []; }
    moveTo(x, y) { this.points.push([x, y]); }
    lineTo(x, y) { this.points.push([x, y]); }
    closePath() {}
  }
  const profile = vm.runInNewContext(`${source.slice(source.indexOf('    const depth = 0.75 / 12;'), source.indexOf('    scene.updateMatrixWorld(true);', source.indexOf('    const depth = 0.75 / 12;')))}boardProfile;`, { THREE: { Shape } });
  assert.deepEqual(profile.points.map((point) => Array.from(point)), [[0, 0], [0.75 / 12, 0], [0.75 / 12, 8 / 12], [0, 8 / 12]]);
  assert.match(source, /mesh\.name = '8 inch interior baseboard'/);
  assert.match(source, /heightInches: 8, thicknessInches: 0\.75, side: run\.side/);
  assert.match(read('floor-plan-upstairs.js'), /box\(parent, .*2 \/ 3, 0\.0625, windowTrim\)\.name = 'Upstairs white baseboard'/);
});

test('under-stair flat boards retain their bottom-step and bookcase-end returns without extra molding', () => {
  class Group {
    constructor() { this.children = []; }
    add(part) { this.children.push(part); }
  }
  const stairs = new Group();
  const context = {
    THREE: { Group }, stairs, stairOpening: { width: 9 }, stairGoing: 10 / 12,
    stairRise: 7.5 / 12, stairWidth: 44 / 12, landingEndX: 9, stairBookcaseDepth: 11 / 12,
    windowTrim: {},
    box(parent, x, y, z, w, h, d) {
      const part = { x, y, z, w, h, d };
      parent.add(part);
      return part;
    }
  };
  vm.runInNewContext(source.slice(source.indexOf('  const stairBaseTrim ='), source.indexOf('  const landingGuardZ =')), context);
  const trim = stairs.children[0];
  assert.deepEqual(Object.keys(trim.userData).sort(), ['heightInches', 'thicknessInches']);
  assert.deepEqual(trim.children.map((part) => part.name), [
    'Under-stair white baseboard', 'Bottom-step baseboard extension',
    'Bottom-step front trim return', 'Bookcase end baseboard return'
  ]);
  assert.equal(trim.children[0].h * 12, 8);
  assert.equal(trim.children[0].d * 12, 0.75);
  assert.ok(trim.children[1].h < context.stairRise);
  assert.equal(trim.children[2].w * 12, 0.75);
  assert.equal(trim.children[3].w * 12, 0.75);
});

test('trim requirements consistently specify no quarter-round or shoe molding', () => {
  for (const file of ['viewer-reference-notes.md', 'foyer/living-room.html', 'floor-plan-reference.md', 'design-context.md']) {
    assert.match(read(file), /no quarter-round or shoe molding/i, file);
  }
});

test('baseboards stop behind the fitted mudroom cases and remain outside the kitchen opening', () => {
  const covered = [];
  class Vector2 { constructor(x, y) { Object.assign(this, { x, y }); } }
  const start = source.indexOf('      // Fitted mudroom joinery meets');
  const end = source.indexOf('      for (const wall of baseTrimSections)', start);
  assert.ok(start > 0 && end > start);
  vm.runInNewContext(source.slice(start, end), { THREE: { Vector2 }, cover(a, b, normal) { covered.push({ a, b, normal }); } });
  assert.equal(covered.length, 4);
  const east = 44.9 - 2 / 12 - 0.175;
  assert.deepEqual(covered.map(({ a, b, normal }) => [a.x, a.y, b.x, b.y, normal.x, normal.y]), [
    [37.675, 15.175, east, 15.175, 0, 1],
    [37.675, 15.175, 37.675, 20.9, 1, 0],
    [east, 15.175, east, 26.725, -1, 0],
    [43.075 - 2 / 12, 26.725, east, 26.725, 0, -1]
  ]);
  assert.ok(covered[1].b.y < 21.675, 'West trim returns before the unchanged kitchen opening');
  assert.ok(covered[3].a.x > 42.5, 'No fitted joinery or trim cuts across the garage opening');
});
