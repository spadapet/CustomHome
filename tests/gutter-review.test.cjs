'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const roof = require('../assets/js/floor-plan-roof.js');
const ground = require('../assets/js/floor-plan-ground.js');
const upstairs = require('../assets/js/floor-plan-upstairs.js');
const html = fs.readFileSync(require.resolve('../artifacts/coordinated-roof-sketch.html'), 'utf8');

function render(api = roof)
{
  const nodes = [];
  const makeNode = (tag, attributes = {}, text = '') =>
  {
    const node = { tag, attributes, text, children: [], dataset: {}, setAttribute(name, value) { this.attributes[name] = value; } };
    nodes.push(node);
    return node;
  };
  const upper = makeNode('svg'), lower = makeNode('svg'), status = makeNode('p');
  const roots = { 'gutter-plan': upper, 'gutter-lower-plan': lower, 'gutter-plan-status': status };
  const context = {
    HomeRoof: api, geometry: upstairs.getUpstairsMeasuredGeometry(), getLivingRoomFeatureLayout: ground.getLivingRoomFeatureLayout,
    mainBounds: roof.getConnectedRoofDefinitions().find(item => item.id === 'Main house').bounds,
    mainEaveDatum: 20.6, canopyFrame: null,
    getLivingPatioCanopyFrame: () => ({ rear: -.325, right: 13.2 }),
    document: { getElementById: id => roots[id] },
    element(parent, tag, attributes, text)
    {
      const node = makeNode(tag, attributes, text);
      parent.children.push(node);
      return node;
    }
  };
  const start = html.indexOf('function drawGutterReview()'), end = html.indexOf('function drawGutterPlan()', start);
  const canopyStart = html.indexOf('function getLivingPatioCanopyFrameForPlan()');
  const canopyEnd = html.indexOf('const porchDefinitions=', canopyStart);
  assert.ok(start > 0 && end > start && canopyStart > 0 && canopyEnd > canopyStart);
  vm.createContext(context);
  vm.runInContext(html.slice(canopyStart, canopyEnd) + '\ncanopyFrame=getLivingPatioCanopyFrameForPlan();', context);
  vm.runInContext(html.slice(start, end) + '\ndrawGutterReview();', context);
  return { upper, lower, status, nodes, audit: JSON.parse(upper.dataset.drainageAudit) };
}

test('coordinated review confirms all six upper valleys are collected, including the adopted D0 receiver', () =>
{
  const { audit, upper } = render();
  assert.equal(audit.frontValleyTerminals.length, 6);
  assert.equal(audit.missingCollectorCount, 0);
  const missing = audit.frontValleyTerminals.filter(item => !item.collected);
  assert.deepEqual(missing, []);
  assert.equal(audit.levelOgeeRuns, 0);
  assert.ok(upper.children.some(node => node.attributes['data-modeled-collector'] === 'D0'));
});

test('2D proposal separates upper/lower collection and does not mutate production roof or routing data', () =>
{
  const before = JSON.stringify([roof.getConnectedRoofDefinitions(), roof.getRoofDrainageLayout()]);
  const { upper, lower, audit } = render();
  assert.equal(audit.proposalOnly, false);
  assert.equal(lower.dataset.proposalOnly, 'false');
  assert.equal(upper.children.filter(node => node.attributes['data-retained-run']).length, 6);
  assert.equal(lower.children.filter(node => node.attributes['data-retained-run']).length, 5);
  assert.deepEqual(audit.heldRoutes, ['D1', 'D3', 'D8', 'AB1', 'D10']);
  assert.equal(JSON.stringify([roof.getConnectedRoofDefinitions(), roof.getRoofDrainageLayout()]), before);
  assert.match(html, /D0 and physical gutter falls are now modeled/);
});

test('valley arrows really point downhill on the current roof, including its segmented east intersection', () =>
{
  const { upper } = render();
  const definitions = roof.getConnectedRoofDefinitions();
  const arrows = upper.children.filter(node => node.attributes['data-valley-flow']);
  assert.equal(arrows.length, 7);
  function height([x, z])
  {
    return Math.max(...definitions.filter(item => x >= item.bounds[0] - 1e-6 && x <= item.bounds[1] + 1e-6 &&
      z >= item.bounds[2] - 1e-6 && z <= item.bounds[3] + 1e-6)
      .map(item => Math.min(...item.planes.map(plane => roof.heightAt(plane, [x, z])))));
  }
  for (const arrow of arrows)
  {
    const [a, b] = arrow.attributes.points.split(' ').map(value =>
    {
      const [x, y] = value.split(',').map(Number);
      return [(x - 95) / 10 - 6, (y - 110) / 10 - 5];
    });
    assert.ok(height(a) > height(b) + 1e-6, 'Roof-derived valley arrow must descend');
  }
});

test('fall arithmetic and held dining assembly are explicit without claiming hydraulic approval', () =>
{
  const { audit, lower } = render();
  assert.equal(audit.mainRearLengthFeet, 44.25);
  assert.ok(Math.abs(audit.rearOutletFallsInches.west - 1.3578125) < 1e-8);
  assert.ok(Math.abs(audit.rearOutletFallsInches.east - 1.3390625) < 1e-8);
  assert.deepEqual(JSON.parse(lower.dataset.proposedAssembly), { id: 'AB1', state: 'held', outlet: 'D10', notIn3D: true });
  assert.match(html, /not a rainfall\/capacity calculation/);
  assert.match(html, /No buried network, sewer connection, drywell or discharge point is selected/);
});

test('changed collection data fails visibly instead of displaying a stale missing-valley finding', () =>
{
  assert.throws(() => render({
    ...roof,
    getRoofDrainageLayout: () =>
    {
      const layout = roof.getRoofDrainageLayout();
      layout.gutters = layout.gutters.filter(run => run.id !== 'upper-4');
      return layout;
    }
  }), /Roof runoff has changed/);
});
