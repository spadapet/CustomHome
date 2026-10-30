'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { getGroundFrontWindows } = require('../floor-plan-ground.js');
const { getUpstairsFrontWindows, getUpstairsMeasuredGeometry, getUpstairsExteriorOpenings } = require('../floor-plan-upstairs.js');
const source = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');

test('exterior shutter geometry and its unused material are removed', () => {
  assert.doesNotMatch(source, /shutter/i);
});

test('all eight front openings retain their windows and front grilles without shutters', () => {
  class Group {
    constructor() {
      this.children = [];
      this.position = { set() {} };
      this.rotation = {};
    }
    add(child) { this.children.push(child); }
  }
  const windows = [];
  const context = {
    THREE: { Group }, group: new Group(), wallThickness: 0.45, trim: {},
    box(parent, x, y, z, w, h, d) {
      const mesh = { x, y, z, w, h, d };
      parent.add(mesh);
      return mesh;
    },
    windowUnit(parent, center, sill, width, height, privacy, picture, perimeterTrim, front) {
      windows.push({ center, sill, width, height, front });
    },
    articulateUpperMasonry() {}
  };
  context.brickBox = context.box;
  const start = source.indexOf('  function wall(');
  const end = source.indexOf('  // Applied stone', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  const g = getUpstairsMeasuredGeometry();
  const fronts = [
    ['front ground floor', getGroundFrontWindows()],
    ['upper front bedrooms', getUpstairsFrontWindows().filter(o => o.center < g.southClosetWest).map(o => ({ ...o, sill: o.sill + 10 }))],
    ['upper front bedroom 4', getUpstairsFrontWindows().filter(o => o.center > g.southClosetEast).map(o => ({ ...o, center: o.center - g.southClosetEast, sill: o.sill + 10 }))],
    ['upper loft south', getUpstairsExteriorOpenings(g.southEast, g.serviceSouth, g.east, g.serviceSouth)]
  ];
  for (const [name, openings] of fronts) {
    const before = JSON.stringify(openings);
    const firstWindow = windows.length;
    const wall = context.wall(name, 0, 0, 60, 0, -0.4, 19, openings);
    assert.equal(JSON.stringify(openings), before);
    assert.deepEqual(windows.slice(firstWindow), openings.map(({ center, sill, width, height }) =>
      ({ center, sill, width, height, front: true })));
    assert.ok(wall.children.every(child => !/shutter/i.test(child.name ?? '')));
  }
  assert.equal(windows.length, 8);
});
