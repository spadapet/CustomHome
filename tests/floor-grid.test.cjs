'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
const gridSource = source.slice(source.indexOf('  const floorGrid ='), source.indexOf('  const groundVisibility ='));

function createGrid() {
  class BufferGeometry {
    setAttribute(name, attribute) { this[name] = attribute; }
    dispose() { this.disposed = true; }
  }
  class Float32BufferAttribute {
    constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; }
  }
  class LineBasicMaterial {
    constructor(options) { Object.assign(this, { depthTest: true }, options); }
  }
  class LineSegments {
    constructor(geometry, material) { this.geometry = geometry; this.material = material; }
  }
  const context = {
    THREE: { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments },
    scene: { add(object) { this.grid = object; } },
    floorGridInput: { checked: true, disabled: true },
    activeFloor: 'ground', currentView: 'whole',
    walkFloorAreas: [{ x: 0, z: 0, w: 3, d: 2, elevation: 0 }],
    upstairs: { areas: [{ x: 0, z: 0, w: 2, d: 2, elevation: 10 }] },
    groundLayoutPreview: null
  };
  vm.createContext(context);
  vm.runInContext(gridSource, context);
  return { context, grid: context.scene.grid, update: () => vm.runInContext('updateFloorGrid();', context) };
}

test('floor grid has exactly one-foot spacing in both directions, clipped to floor edges', () => {
  const { context, grid, update } = createGrid();
  context.walkFloorAreas = [{ x: -1.4, z: 0.2, w: 3.8, d: 2.1, elevation: 0 }];
  update();
  assert.equal(grid.visible, true);
  assert.equal(context.floorGridInput.disabled, false);
  assert.equal(grid.userData.spacingFeet, 1);
  assert.equal(grid.geometry.position.itemSize, 3);
  assert.deepEqual(Array.from(grid.geometry.position.array), [
    -1, 0.025, 0.2, -1, 0.025, 2.3000000000000003,
    0, 0.025, 0.2, 0, 0.025, 2.3000000000000003,
    1, 0.025, 0.2, 1, 0.025, 2.3000000000000003,
    2, 0.025, 0.2, 2, 0.025, 2.3000000000000003,
    -1.4, 0.025, 1, 2.4, 0.025, 1,
    -1.4, 0.025, 2, 2.4, 0.025, 2
  ]);
});

test('grid follows garage elevation and edited floor shapes without changing geometry on camera resets', () => {
  const { context, grid, update } = createGrid();
  context.walkFloorAreas.push({ x: 5, z: 0, w: 2, d: 2, elevation: -1.25 });
  update();
  const original = grid.geometry;
  const heights = new Set(original.position.array.filter((_, index) => index % 3 === 1));
  assert.deepEqual([...heights], [0.025, -1.225]);
  update();
  assert.equal(grid.geometry, original);
  context.groundLayoutPreview = { plan: { floors: [{ x: 7, z: 8, w: 2, d: 3 }] } };
  update();
  assert.equal(original.disposed, true);
  assert.deepEqual(Array.from(grid.geometry.position.array.slice(0, 6)), [7, 0.025, 8, 7, 0.025, 11]);
  context.groundLayoutPreview = null;
  update();
  assert.equal(grid.geometry.position.array[0], 0);
});

test('checkbox choice survives floor changes and temporarily unsupported views', () => {
  const { context, grid, update } = createGrid();
  update();
  context.floorGridInput.checked = false;
  update();
  assert.equal(grid.visible, false);
  context.activeFloor = 'upstairs';
  context.currentView = 'upstairs';
  update();
  assert.equal(grid.visible, false);
  context.floorGridInput.checked = true;
  update();
  assert.equal(grid.visible, true);
  assert.equal(grid.geometry.position.array[1], 10.025);
  for (const [floor, view] of [['exterior', 'exterior'], ['ground', 'basement']]) {
    context.activeFloor = floor;
    context.currentView = view;
    update();
    assert.equal(grid.visible, false);
    assert.equal(context.floorGridInput.disabled, true);
    assert.equal(context.floorGridInput.checked, true);
  }
  context.currentView = 'whole';
  update();
  assert.equal(grid.visible, true);
  assert.equal(context.floorGridInput.disabled, false);
  assert.equal(grid.geometry.position.array[1], 0.025);
});

test('grid is occluded by furniture and excluded from tour collision and floor picking', () => {
  const { grid } = createGrid();
  assert.equal(grid.material.depthTest, true);
  assert.equal(grid.material.depthWrite, false);
  assert.equal(grid.userData.tourDecoration, true);
  const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
  assert.match(html, /<label[^>]*><input type="checkbox" id="show-floor-grid" disabled> 1 ft grid<\/label>/);
  assert.match(source, /floorGridInput\.addEventListener\('change', \(\) => \{\s*updateFloorGrid\(\);\s*render\(\);/);
  const errorSource = source.slice(source.indexOf('function showModelError('), source.indexOf('function buildPreview('));
  assert.match(errorSource, /floorGridInput\.disabled = true/);
});

test('grid starts hidden with the page default and can be enabled', () => {
  const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
  const input = html.match(/<input\b[^>]*\bid="show-floor-grid"[^>]*>/)[0];
  const { context, grid, update } = createGrid();
  context.floorGridInput.checked = /\bchecked\b/.test(input);
  update();
  assert.equal(context.floorGridInput.checked, false);
  assert.equal(context.floorGridInput.disabled, false);
  assert.equal(grid.visible, false);
  context.floorGridInput.checked = true;
  update();
  assert.equal(grid.visible, true);
});
