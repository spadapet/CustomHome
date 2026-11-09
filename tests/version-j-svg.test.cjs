'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const directory = path.join(root, 'assets', 'images', 'plans', 'upstairs-2000');
const svg = fs.readFileSync(path.join(directory, 'version-j.svg'), 'utf8');
const versionI = fs.readFileSync(path.join(directory, 'version-i.svg'), 'utf8');

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
}

function close(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} != ${expected}`);
}

function chartRows(id, attribute) {
  const source = svg.match(new RegExp(`<g id="${id}"[^>]*>([\\s\\S]*?)\\n    </g>`));
  assert.ok(source, `${id} chart`);
  return new Map([...source[1].matchAll(new RegExp(`<g ${attribute}="([^"]+)"[^>]*>([\\s\\S]*?)</g>`, 'g'))].map(([, key, content]) => {
    const values = [...content.matchAll(/<text\b[^>]*>([^<]+)<\/text>/g)].map(match => match[1]);
    assert.equal(values.length, 2, `${id}: ${key}`);
    return [key, Number(values[1].replace(/ sq ft$/, '').replaceAll(',', ''))];
  }));
}

test('Version J is a polished two-floor composite with Version I downstairs preserved', () => {
  assert.match(svg, /<title id="title">Version J:/);
  assert.match(svg, /id="ground-plan"/);
  assert.match(svg, /DOWNSTAIRS \| Version I current 3D layout/);
  assert.match(svg, /UPSTAIRS \| Version J image trace/);
  assert.match(svg, /data-model-adopted="false"/);
  assert.match(svg, /Version H remains the active upstairs layout/);
  assert.doesNotMatch(svg, /<(?:image|script|foreignObject)\b/i);

  const panel = source => source.slice(source.indexOf('<g id="ground-plan"'), source.indexOf('<g id="upstairs-plan"'));
  assert.equal(panel(svg), panel(versionI), 'the complete downstairs drawing is byte-for-byte unchanged');
  const chart = source => source.slice(source.indexOf('<g id="ground-area-chart"'), source.indexOf('<g id="upstairs-area-chart"'));
  assert.equal(chart(svg), chart(versionI), 'the downstairs area chart is unchanged');

  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'SVG IDs are unique');
  const upper = svg.match(/<g id="upstairs-plan"[^>]*>/);
  assert.ok(upper);
  assert.match(upper[0], /data-source-pixels-per-foot="14\.727272727272728" data-model-adopted="false"/);
  const floors = svg.match(/<g id="upstairs-floors"[^>]*>([\s\S]*?)<\/g>/);
  assert.ok(floors, 'upstairs floors');
  const rooms = [...floors[1].matchAll(/<rect\b[^>]*data-room="([^"]+)"/g)].map(match => match[1]);
  for (const room of ['Primary bedroom', 'Primary bath', 'Primary closet', 'Closet', 'Bath', 'Bedroom 3', 'Hall', 'Stairs', 'Bath 1', 'Bedroom 1', 'Closet 1', 'Closet 2', 'Bedroom 2', 'Bath 2', 'Linen', 'Furnace', 'Laundry']) {
    assert.ok(rooms.includes(room), `traced room ${room}`);
  }
  assert.equal(new Set(rooms).size, 17);
  assert.doesNotMatch(floors[1], /data-room="(?:Loft|Bath 3|Bedroom 4|Closet 3|Bath 4)"/);
  assert.doesNotMatch(floors[1], /data-window=/, 'no window schedule is invented from the image');
  for (const dimension of ['14\' 8"', '13\' 6"', '19\' 8 5/16"', '11\' 10 3/8"', '14\' 3 15/16"', '32\' 3 7/8"', '12\' 6"']) {
    assert.ok(svg.includes(dimension), `source dimension ${dimension}`);
  }
});

test('Version J room tiles, stair deduction and two-floor area chart reconcile to calibrated trace', () => {
  const basis = attributes(svg.match(/<metadata id="area-basis"[^>]*>/)[0]);
  const outline = basis['data-upstairs-outline'].split(' ').map(point => point.split(',').map(Number));
  const pixelsSquared = Math.abs(outline.reduce((sum, [x, y], index) => {
    const [nextX, nextY] = outline[(index + 1) % outline.length];
    return sum + x * nextY - nextX * y;
  }, 0)) / 2;
  let perimeter = 0;
  for (let i = 0; i < outline.length; i++) {
    const [x, y] = outline[i], [nextX, nextY] = outline[(i + 1) % outline.length];
    assert.ok(x === nextX || y === nextY, 'orthogonal image outline');
    perimeter += Math.hypot(nextX - x, nextY - y);
  }

  const floorGroup = svg.match(/<g id="upstairs-floors"[^>]*>([\s\S]*?)<\/g>/)[1];
  const floors = [...floorGroup.matchAll(/<rect\b[^>]*>/g)].map(match => attributes(match[0]));
  const roomPixels = new Map();
  for (const floor of floors) {
    const area = Number(floor.width) * Number(floor.height);
    roomPixels.set(floor['data-room'], (roomPixels.get(floor['data-room']) ?? 0) + area);
  }
  const stair = floors.find(floor => floor['data-room'] === 'Stairs');
  const stairPixels = Number(stair.width) * Number(stair.height);
  close(floors.reduce((sum, floor) => sum + Number(floor.width) * Number(floor.height), 0), pixelsSquared, 'floor regions cover the traced outline exactly');

  const pixelsPerFoot = Number(basis['data-source-pixels-per-foot']);
  const netUpstairs = (pixelsSquared - stairPixels) / pixelsPerFoot ** 2;
  const stairArea = stairPixels / pixelsPerFoot ** 2;
  const halfWall = Number(basis['data-wall-thickness-feet']) / 2;
  const wallAllowance = perimeter / pixelsPerFoot * halfWall + 4 * halfWall ** 2;
  const upstairs = netUpstairs + wallAllowance;
  const groundArea = Number(attributes(svg.match(/<text id="ground-area"[^>]*>/)[0])['data-square-feet']);
  const upstairsLabel = attributes(svg.match(/<text id="upstairs-area"[^>]*>/)[0]);
  const combinedLabel = attributes(svg.match(/<text id="combined-area"[^>]*>/)[0]);
  close(Number(upstairsLabel['data-square-feet']), upstairs, 'upstairs total includes outward wall allowance');
  close(Number(upstairsLabel['data-stair-deduction']), stairArea, 'upstairs stair deduction');
  close(Number(combinedLabel['data-square-feet']), groundArea + upstairs, 'combined area');

  const displayedRooms = chartRows('upstairs-area-chart', 'data-area-room');
  assert.equal(displayedRooms.size, roomPixels.size - 1, 'all non-stair rooms appear once in the chart');
  for (const [room, area] of roomPixels) {
    if (room === 'Stairs') continue;
    close(displayedRooms.get(room), Number((area / pixelsPerFoot ** 2).toFixed(2)), `${room} chart row`);
  }
  const items = chartRows('upstairs-area-chart', 'data-area-item');
  close(items.get('rooms'), Number(netUpstairs.toFixed(2)), 'room subtotal');
  close(items.get('walls'), Number(wallAllowance.toFixed(2)), 'wall allowance');
  close(items.get('total'), Number(upstairs.toFixed(2)), 'upstairs area chart total');
  close(items.get('excluded-stairs'), Number(stairArea.toFixed(2)), 'excluded stair area');
  assert.match(svg, /1,947\.50/);
  assert.match(svg, /1,982\.77/);
  assert.match(svg, /3,907\.10/);

  for (const filename of ['floor-plan-reference.md', 'design-context.md', 'upstairs.html']) {
    const notes = fs.readFileSync(path.join(root, filename), 'utf8');
    assert.match(notes, /version-j\.svg/);
    assert.match(notes, /Version H remains|active Version H|Version H remains the active/i);
  }
});
