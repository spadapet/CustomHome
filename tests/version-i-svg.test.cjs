'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ground = require('../assets/js/floor-plan-ground.js');
const root = path.join(__dirname, '..');
const directory = path.join(root, 'assets', 'images', 'plans', 'upstairs-2000');
const svg = fs.readFileSync(path.join(directory, 'version-i.svg'), 'utf8');
const plan = ground.getGroundFloorDefaultPlan();

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
}

function element(id) {
  const match = svg.match(new RegExp(`<[^>]+\\bid="${id}"[^>]*>`));
  assert.ok(match, id);
  return attributes(match[0]);
}

function group(id) {
  const match = svg.match(new RegExp(`<g\\b[^>]*\\bid="${id}"[^>]*>([\\s\\S]*?)</g>`));
  assert.ok(match, id);
  return match[1];
}

function tags(source, name) {
  return [...source.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map(match => attributes(match[0]));
}

function near(actual, expected, tolerance = .000001) {
  assert.ok(Math.abs(Number(actual) - expected) <= tolerance, `${actual} != ${expected}`);
}

function segments(d) {
  let x = 0, y = 0, startX = 0, startY = 0;
  const result = [];
  for (const match of d.matchAll(/([MLHVZ])([^MLHVZ]*)/g)) {
    const values = match[2].trim().split(/[ ,]+/).filter(Boolean).map(Number);
    assert.ok(values.every(Number.isFinite), d);
    const command = match[1];
    if (command === 'M') {
      [x, y] = values;
      [startX, startY] = values;
      continue;
    }
    const nextX = command === 'H' || command === 'L' ? values[0] : command === 'Z' ? startX : x;
    const nextY = command === 'V' ? values[0] : command === 'L' ? values[1] : command === 'Z' ? startY : y;
    result.push([x, y, nextX, nextY]);
    [x, y] = [nextX, nextY];
  }
  return result;
}

function expectedWall([, x1, z1, x2, z2, openings = []]) {
  const length = Math.hypot(x2 - x1, z2 - z1);
  const dx = (x2 - x1) / length, dz = (z2 - z1) / length;
  const segment = (from, to) => [x1 + from * dx, z1 + from * dz, x1 + to * dx, z1 + to * dz];
  const result = [];
  let from = 0;
  for (const [a, b] of [...openings].sort((a, b) => a[0] - b[0])) {
    if (a > from) result.push(segment(from, a));
    from = Math.max(from, b);
  }
  if (from < length) result.push(segment(from, length));
  return result;
}

const upstairsFloors = tags(group('upstairs-floors'), 'rect');
const upstairsWalls = tags(group('upstairs-walls'), 'path').flatMap(wall => segments(wall.d));

test('per-floor and combined areas are visible estimates with the stairway counted only downstairs', () => {
  const basis = element('area-basis');
  assert.equal(basis['data-stairs-counted-on'], 'downstairs');
  const outline = basis['data-upstairs-outline'].split(' ').map(point => point.split(',').map(Number));
  const shoelace = Math.abs(outline.reduce((sum, [x, y], index) => {
    const [nextX, nextY] = outline[(index + 1) % outline.length];
    return sum + x * nextY - nextX * y;
  }, 0)) / 2;
  near(shoelace, upstairsFloors.reduce((sum, floor) => sum + Number(floor.width) * Number(floor.height), 0));
  let perimeter = 0;
  const inside = (x, y) => upstairsFloors.some(floor => x > Number(floor.x) && x < Number(floor.x) + Number(floor.width) && y > Number(floor.y) && y < Number(floor.y) + Number(floor.height));
  outline.forEach(([x, y], index) => {
    const [nextX, nextY] = outline[(index + 1) % outline.length];
    assert.ok(x === nextX || y === nextY, 'orthogonal gross outline');
    perimeter += Math.hypot(nextX - x, nextY - y);
    for (let t = .03; t < 1; t += .03) {
      const sampleX = x + (nextX - x) * t, sampleY = y + (nextY - y) * t;
      const dx = x === nextX ? .01 : 0, dy = y === nextY ? .01 : 0;
      assert.notEqual(inside(sampleX + dx, sampleY + dy), inside(sampleX - dx, sampleY - dy), 'area outline follows the exterior, not an internal partition');
    }
  });
  const thickness = Number(basis['data-wall-thickness-feet']);
  const styleMatch = svg.match(/\.wall\s*\{([^}]+)\}/);
  assert.ok(styleMatch, 'drawn wall style');
  const widthMatch = styleMatch[1].match(/stroke-width:\s*([\d.]+)/);
  assert.ok(widthMatch, 'drawn wall thickness');
  near(thickness, Number(widthMatch[1]));
  const halfWall = thickness / 2;
  const gross = shoelace + perimeter * halfWall + 4 * halfWall * halfWall;
  const stair = upstairsFloors.find(floor => floor['data-room'] === 'Stairs');
  const deduction = Number(stair.width) * Number(stair.height);
  const downstairs = ground.getLivableFloorArea(plan, { includeStairs: true });
  const upstairs = gross - deduction;
  near(element('upstairs-area')['data-stair-deduction'], deduction);
  near(element('ground-area')['data-square-feet'], downstairs);
  near(element('upstairs-area')['data-square-feet'], upstairs);
  near(element('combined-area')['data-square-feet'], downstairs + upstairs);
  for (const [id, value] of [['ground-area', downstairs], ['upstairs-area', upstairs], ['combined-area', downstairs + upstairs]]) {
    const label = svg.match(new RegExp(`<text\\b[^>]*id="${id}"[^>]*>([^<]+)</text>`))[1];
    assert.ok(label.includes(value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })), `${id}: visible rounded square footage`);
    assert.match(label, /sq ft/);
  }
  assert.match(svg, /upstairs trace and area are approximate|Upstairs trace and area are approximate/);
  const instructions = fs.readFileSync(path.join(root, '.github', 'instructions', 'svg-plan.instructions.md'), 'utf8');
  assert.match(instructions, /Always display square footage for each floor and the combined total/);
  assert.match(instructions, /Count the stairway only once/);
});

test('bottom area chart lists every counted room and reconciles stairs, wall allowances and combined area', () => {
  const rows = (id, attribute) => {
    const section = svg.match(new RegExp(`<g id="${id}"[^>]*>([\\s\\S]*?)\\n    </g>`));
    assert.ok(section, `${id}: chart section`);
    const entries = [...section[1].matchAll(new RegExp(`<g ${attribute}="([^"]+)"[^>]*>([\\s\\S]*?)</g>`, 'g'))];
    const result = new Map();
    for (const [, key, content] of entries) {
      const texts = [...content.matchAll(/<text\b[^>]*>([^<]+)<\/text>/g)].map(match => match[1]);
      assert.equal(texts.length, 2, `${key}: label and value columns`);
      assert.ok(!result.has(key), `${key}: no duplicate row`);
      result.set(key, Number(texts[1].replace(/ sq ft$/, '').replaceAll(',', '')));
    }
    return result;
  };
  const rounded = value => Number(value.toFixed(2));
  const groundRooms = new Map();
  for (const floor of plan.floors.filter(floor => !/^(Garage|Front porch)/.test(floor.room ?? ''))) {
    const room = floor.room ?? 'Circulation';
    groundRooms.set(room, (groundRooms.get(room) ?? 0) + floor.w * floor.d);
  }
  const upperRooms = new Map();
  for (const floor of upstairsFloors.filter(floor => floor['data-room'] !== 'Stairs')) {
    const room = floor['data-room'];
    upperRooms.set(room, (upperRooms.get(room) ?? 0) + Number(floor.width) * Number(floor.height));
  }
  for (const [id, expected] of [['ground-area-chart', groundRooms], ['upstairs-area-chart', upperRooms]]) {
    const displayed = rows(id, 'data-area-room');
    assert.equal(displayed.size, expected.size, `${id}: full room inventory`);
    for (const [room, area] of expected) assert.equal(displayed.get(room), rounded(area), `${id}: ${room}`);
  }
  const groundSubtotal = [...groundRooms.values()].reduce((sum, area) => sum + area, 0);
  const upstairsSubtotal = [...upperRooms.values()].reduce((sum, area) => sum + area, 0);
  const stairs = plan.stairs.width * plan.stairs.depth - (plan.stairs.voids ?? []).reduce((sum, cut) => sum + cut.w * cut.d, 0);
  const lowerTotal = ground.getLivableFloorArea(plan, { includeStairs: true });
  const upperTotal = Number(element('upstairs-area')['data-square-feet']);
  const lowerWalls = lowerTotal - groundSubtotal - stairs;
  const upperWalls = upperTotal - upstairsSubtotal;
  const lowerItems = rows('ground-area-chart', 'data-area-item');
  const upperItems = rows('upstairs-area-chart', 'data-area-item');
  const wallItems = rows('wall-area-chart', 'data-area-item');
  for (const [key, value] of [['rooms', groundSubtotal], ['stairs', stairs], ['walls', lowerWalls], ['total', lowerTotal]]) assert.equal(lowerItems.get(key), rounded(value), key);
  for (const [key, value] of [['rooms', upstairsSubtotal], ['walls', upperWalls], ['total', upperTotal], ['excluded-stairs', Number(element('upstairs-area')['data-stair-deduction'])]]) assert.equal(upperItems.get(key), rounded(value), key);
  for (const [key, value] of [['ground-walls', lowerWalls], ['upstairs-walls', upperWalls], ['combined-walls', lowerWalls + upperWalls], ['combined-total', lowerTotal + upperTotal]]) assert.equal(wallItems.get(key), rounded(value), key);
  assert.match(svg, /NOT vertical wall surface area or the whole wall footprint/);
  assert.match(svg, /already within the room allocations; do not add them again/);
  assert.match(svg, /hundredths are arithmetic precision only/);
  const rootTag = attributes(svg.slice(0, svg.indexOf('>') + 1));
  assert.equal(rootTag.viewBox, `0 0 ${rootTag.width} ${rootTag.height}`);
  assert.ok(Number(rootTag.height) > 2136, 'canvas extends below chart notes');
});

function noWallAcross(from, to) {
  const vertical = from[0] === to[0];
  const axis = vertical ? 1 : 0, fixed = 1 - axis;
  for (const wall of upstairsWalls) {
    if (Math.abs(wall[fixed] - wall[fixed + 2]) < .000001) {
      if (Math.abs(wall[fixed] - from[fixed]) >= .000001) continue;
      const overlap = Math.min(Math.max(from[axis], to[axis]), Math.max(wall[axis], wall[axis + 2])) -
        Math.max(Math.min(from[axis], to[axis]), Math.min(wall[axis], wall[axis + 2]));
      assert.ok(overlap < .000001, `Wall ${wall} covers opening/route ${from} -> ${to}`);
    } else {
      const coordinate = wall[axis];
      const crosses = coordinate > Math.min(from[axis], to[axis]) + .000001 && coordinate < Math.max(from[axis], to[axis]) - .000001 &&
        from[fixed] > Math.min(wall[fixed], wall[fixed + 2]) + .000001 && from[fixed] < Math.max(wall[fixed], wall[fixed + 2]) - .000001;
      assert.equal(crosses, false, `Wall ${wall} crosses route ${from} -> ${to}`);
    }
  }
}

test('Version I is standalone accessible vector SVG and preserves Version H byte-for-byte', () => {
  const h = fs.readFileSync(path.join(directory, 'version-h.svg'));
  assert.equal(crypto.createHash('sha256').update(h).digest('hex'), '9fa8b3a4014c8eccfc121afaaa71ff1f449f3ee6dcd07ee8160f1e9e3d4ea952');
  assert.match(svg, /role="img" aria-labelledby="title desc"/);
  assert.match(svg, /<title id="title">Version I:/);
  assert.doesNotMatch(svg, /<(?:image|script|foreignObject)\b/);
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of svg.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(match[1]), match[1]);
  assert.match(element('ground-plan').transform, /scale\(12\)/);
  assert.match(element('upstairs-plan').transform, /scale\(12\)/);
  assert.equal(element('upstairs-plan')['data-model-adopted'], 'false');
});

test('every downstairs floor strip and its actual kids area match the shared 3D plan', () => {
  const floors = tags(group('ground-floors'), 'rect');
  assert.equal(floors.length, plan.floors.length);
  floors.forEach((floor, index) => {
    const expected = plan.floors[index];
    assert.equal(Number(floor['data-floor']), index);
    assert.equal(floor['data-room'], expected.room ?? 'Hall');
    for (const [a, b] of [['x', 'x'], ['y', 'z'], ['width', 'w'], ['height', 'd']]) near(floor[a], expected[b]);
  });
  const kids = floors.filter(floor => floor['data-room'] === 'Kids room');
  near(kids.reduce((sum, floor) => sum + Number(floor.width) * Number(floor.height), 0), 144.5891666667, .00001);
  near(ground.getLivableFloorArea(plan, { includeStairs: true }), 1966.4427083333);
  for (const [a, b] of [['x', 'x'], ['y', 'z'], ['width', 'width'], ['height', 'depth']]) near(element('ground-stairs')[a], plan.stairs[b]);
});

test('every drawn downstairs wall and window opening matches current shared coordinates', () => {
  const walls = tags(group('ground-walls'), 'path').filter(wall => wall['data-wall']);
  assert.equal(walls.length, plan.walls.length);
  for (const wall of walls) {
    const expected = plan.walls.find(candidate => candidate[0] === wall['data-wall']);
    assert.ok(expected, wall['data-wall']);
    const actual = segments(wall.d), wanted = expectedWall(expected);
    assert.equal(actual.length, wanted.length, wall['data-wall']);
    actual.forEach((segment, i) => segment.forEach((value, j) => near(value, wanted[i][j])));
  }
  const windows = tags(group('ground-walls'), 'path').filter(wall => wall['data-window']);
  const expected = plan.walls.flatMap(([name, x1, z1, x2, z2, openings = []]) => {
    const length = Math.hypot(x2 - x1, z2 - z1);
    return openings.filter(opening => opening[2] > 0).map(([a, b]) => ({ name, segment: [x1 + a * (x2 - x1) / length, z1 + a * (z2 - z1) / length, x1 + b * (x2 - x1) / length, z1 + b * (z2 - z1) / length] }));
  });
  assert.equal(windows.length, expected.length);
  windows.forEach((window, i) => {
    assert.equal(window['data-window'], expected[i].name);
    segments(window.d)[0].forEach((value, j) => near(value, expected[i].segment[j]));
  });
});

test('Classic pair, retained oven/tower and separate fillers use full-size actual model envelopes', () => {
  const layout = ground.getKitchenRefrigerationLayout();
  near(element('ground-refrigeration')['data-run-left'], layout.runLeft);
  near(element('ground-refrigeration')['data-run-right'], layout.runRight);
  near((layout.runRight - layout.runLeft) * 12, 112.35);
  for (const [id, x, model] of [['fridge', 28.25, 'CL3650R/S/T/R'], ['freezer', 34, 'CL3650F/S/T/L']]) {
    const unit = element(id);
    near(unit.x, x); near(Number(unit.width) * 12, 36);
    near(unit.y, 24.5375); near(Number(unit.height) * 12, 26.1875, .00001);
    assert.equal(unit['data-model'], model);
  }
  near(Number(element('oven-tower').width) * 12, 31.5);
  near(Number(element('oven-tower').height) * 12, 25, .00001);
  near(Number(element('oven').width) * 12, 30);
  near(Number(element('oven').height) * 12, 24);
  assert.equal(element('oven')['data-height-inches'], '24');
  assert.equal(element('oven')['data-bottom-inches'], '30');
  near(Number(element('fridge-filler').width) * 12, 3);
  near(Number(element('freezer-filler').width) * 12, 2.85);
  for (const panel of segments(element('column-panels').d)) near((panel[3] - panel[1]) * 12, 23.875, .00001);
  near(Number(element('kids-trofast').x) + Number(element('kids-trofast').width) / 2, 25.775);
  near(Number(element('kids-trofast').y) + Number(element('kids-trofast').height) / 2, 25.810625, .000001);
  near(Number(element('family-board').x) + Number(element('family-board').width) / 2, 23.375);
  assert.equal(element('ground-refrigeration')['data-stop-degrees'], '90');
});

test('upstairs traces the new image shell, east loft, inset hall, service row and flush front closet', () => {
  const required = ['Primary', 'Primary bath', 'Primary closet', 'Bedroom 2', 'Closet 2', 'Bath 2', 'Loft', 'Hallway', 'Stairs', 'Bath 3', 'Linen', 'Bedroom 3', 'Closet 3', 'Bedroom 4', 'Closet 4', 'Bath 4', 'Furnace', 'Laundry'];
  assert.deepEqual([...new Set(upstairsFloors.map(floor => floor['data-room']))].sort(), required.sort());
  const scale = 224 / (14 + 8 / 12);
  const traced = (pixel, origin) => (pixel - origin) / scale;
  const primary = upstairsFloors.find(floor => floor['data-room'] === 'Primary');
  near(primary.width, traced(375, 145));
  near(Number(primary.y) + Number(primary.height), 7.4 + traced(330, 19));
  const loft = upstairsFloors.find(floor => floor['data-room'] === 'Loft');
  near(loft.x, traced(815, 145)); near(loft.y, 7.4 + traced(208, 19));
  const laundry = upstairsFloors.filter(floor => floor['data-room'] === 'Laundry');
  assert.equal(laundry.length, 2);
  near(laundry[0].x, traced(795, 145));
  near(Number(laundry[1].y) + Number(laundry[1].height), Number(laundry[0].y));
  const closet = upstairsFloors.find(floor => floor['data-room'] === 'Closet 4');
  for (const room of ['Bedroom 3', 'Bedroom 4']) {
    const bedroom = upstairsFloors.find(floor => floor['data-room'] === room);
    near(Number(closet.y) + Number(closet.height), Number(bedroom.y) + Number(bedroom.height));
  }
  assert.equal(segments(element('loft-laundry-wall').d).length, 2);
  assert.match(svg, /source-image-not-measured-clearances/);
  assert.match(svg, /upstairs and combined areas are approximate, not certified finished area/);
  assert.doesNotMatch(group('upstairs-floors'), /data-item|<use|<image/);
});

test('corrected Bedroom 3 doors swing toward the bath and exterior, and laundry enters from the north', () => {
  const doors = tags(group('upstairs-doors'), 'path');
  for (const [name, hinge, open, closed, room] of [
    ['Bedroom 3 entry', [13.160714, 41.578571], [10.660714, 41.578571], [13.160714, 44.078571], 'Bedroom 3'],
    ['Bath 3', [.25, 41.578571], [.25, 39.078571], [2.75, 41.578571], 'Bath 3'],
    ['Laundry', [44.219048, 33.459524], [44.219048, 35.959524], [46.719048, 33.459524], 'Laundry']
  ]) {
    const door = doors.find(candidate => candidate['data-door'] === name);
    assert.ok(door, name);
    const match = door.d.match(/^M([\d.]+) ([\d.]+)([HV])([\d.]+)A2\.5 2\.5 0 0 ([01]) ([\d.]+) ([\d.]+)$/);
    assert.ok(match, name);
    near(match[1], hinge[0]); near(match[2], hinge[1]);
    near(match[4], match[3] === 'H' ? open[0] : open[1]);
    near(match[6], closed[0]); near(match[7], closed[1]);
    const openAngle = Math.atan2(open[1] - hinge[1], open[0] - hinge[0]);
    const cross = (open[0] - hinge[0]) * (closed[1] - hinge[1]) - (open[1] - hinge[1]) * (closed[0] - hinge[0]);
    assert.equal(Number(match[5]), cross > 0 ? 1 : 0, `${name}: correct minor sweep arc`);
    for (let angle = 0; angle <= 90; angle++) {
      const a = openAngle + Math.sign(cross) * angle * Math.PI / 180;
      for (let distance = .1; distance <= 2.5; distance += .1) {
        const x = hinge[0] + distance * Math.cos(a), y = hinge[1] + distance * Math.sin(a);
        assert.ok(upstairsFloors.some(floor => floor['data-room'] === room && x >= Number(floor.x) - .000001 && x <= Number(floor.x) + Number(floor.width) + .000001 && y >= Number(floor.y) - .000001 && y <= Number(floor.y) + Number(floor.height) + .000001), `${name}: ${angle} degrees remains inside ${room}`);
      }
    }
    noWallAcross(hinge, closed);
  }
  assert.deepEqual(segments(element('laundry-entry-step').d), [[43.869048, 33.459524, 43.869048, 36.144048], [43.869048, 36.144048, 42.559524, 36.144048]]);
  noWallAcross([44.5, 32], [44.5, 36]);
});

test('provisional upstairs windows cut exterior walls and cover requested habitable rooms without inventing interior glazing', () => {
  const windows = tags(group('upstairs-windows'), 'path').filter(window => window['data-window']);
  assert.equal(windows.length, 18);
  assert.equal(windows.reduce((sum, window) => sum + Number(window['data-units']), 0), 28);
  assert.equal(element('upstairs-windows')['data-status'], 'provisional-svg-only');
  assert.equal(element('upstairs-windows')['data-sill-inches'], '36');
  assert.equal(element('upstairs-windows')['data-head-inches'], '96');
  const inside = (x, y, room) => upstairsFloors.some(floor => (!room || floor['data-room'] === room) && x > Number(floor.x) && x < Number(floor.x) + Number(floor.width) && y > Number(floor.y) && y < Number(floor.y) + Number(floor.height));
  for (const window of windows) {
    const [segment] = segments(window.d);
    const [x1, y1, x2, y2] = segment;
    near(Math.hypot(x2 - x1, y2 - y1) * 12, Number(window['data-width-inches']));
    noWallAcross([x1, y1], [x2, y2]);
    for (let t = .05; t < 1; t += .05) {
      const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      const dx = x1 === x2 ? .01 : 0, dy = y1 === y2 ? .01 : 0;
      const a = inside(x + dx, y + dy), b = inside(x - dx, y - dy);
      assert.notEqual(a, b, `${window['data-window']}: actual exterior boundary`);
      assert.ok(inside(x + dx, y + dy, window['data-room']) || inside(x - dx, y - dy, window['data-room']), window['data-window']);
    }
  }
  for (const room of ['Primary', 'Bedroom 2', 'Bedroom 3', 'Bedroom 4', 'Loft', 'Laundry', 'Primary bath', 'Bath 2', 'Bath 3', 'Bath 4', 'Stairs', 'Closet 2', 'Closet 4']) assert.ok(windows.some(window => window['data-room'] === room), room);
  assert.ok(windows.every(window => !/Primary closet|Closet 3|Linen|Furnace/.test(window['data-room'])));
  for (const room of ['Closet 2', 'Closet 4', 'Bath 4']) {
    const window = windows.find(candidate => candidate['data-room'] === room);
    const [x1, y1, x2, y2] = segments(window.d)[0];
    near(Number(window['data-width-inches']), 30);
    if (room === 'Bath 4') {
      near(y1, 41.578571); near(y2, y1);
      assert.ok(x1 > 32.017857 && x2 < 37.583333, 'Bath 4 window lies beyond the Bedroom 4 east wall');
      assert.equal(window['data-privacy'], 'review-required');
    } else {
      const floor = upstairsFloors.find(candidate => candidate['data-room'] === room);
      near((x1 + x2) / 2, Number(floor.x) + Number(floor.width) / 2);
      near(y1, Number(floor.y) + (room === 'Closet 4' ? Number(floor.height) : 0));
    }
  }
  const laundrySouth = windows.find(window => window['data-window'] === 'Laundry south');
  assert.ok(laundrySouth, 'south laundry opening retained alongside its east window');
  const [southX1, southY1, southX2, southY2] = segments(laundrySouth.d)[0];
  near(Number(laundrySouth['data-width-inches']), 36);
  near(southY1, 41.578571); near(southY2, southY1);
  near((southX1 + southX2) / 2, (42.559524 + 55.916667) / 2);
  assert.equal(windows.filter(window => window['data-room'] === 'Laundry').length, 2);
  for (const room of ['Bedroom 3', 'Bedroom 4']) {
    const front = windows.find(window => window['data-room'] === room && window['data-window'].endsWith('front'));
    const [x1, , x2] = segments(front.d)[0];
    const floor = upstairsFloors.find(candidate => candidate['data-room'] === room);
    near((x1 + x2) / 2, Number(floor.x) + Number(floor.width) / 2);
  }
});

test('all fourteen upstairs door symbols have real wall gaps, 30-inch proxy widths and 96-inch heights', () => {
  const doors = tags(group('upstairs-doors'), 'path');
  assert.equal(doors.length, 14);
  assert.equal(element('upstairs-doors')['data-height-inches'], '96');
  for (const door of doors) {
    const match = door.d.match(/^M([\d.]+) ([\d.]+)([HV])([\d.]+)A([\d.]+) ([\d.]+) 0 0 [01] ([\d.]+) ([\d.]+)$/);
    assert.ok(match, door['data-door']);
    const hinge = [Number(match[1]), Number(match[2])];
    const open = match[3] === 'H' ? [Number(match[4]), hinge[1]] : [hinge[0], Number(match[4])];
    const closed = [Number(match[7]), Number(match[8])];
    near(Math.hypot(open[0] - hinge[0], open[1] - hinge[1]) * 12, 30);
    near(Math.hypot(closed[0] - hinge[0], closed[1] - hinge[1]) * 12, 30);
    near(match[5], 2.5); near(match[6], 2.5);
    assert.equal(door['data-width-inches'], '30');
    noWallAcross(hinge, closed);
  }
});

test('the inset south hallway and west-open loft stay connected rather than closed by service walls', () => {
  for (const [from, to] of [[[16, 32], [16, 45.5]], [[16, 32], [50, 32]]]) {
    noWallAcross(from, to);
    for (let t = 0; t <= 1; t += .01) {
      const x = from[0] + t * (to[0] - from[0]), y = from[1] + t * (to[1] - from[1]);
      assert.ok(upstairsFloors.some(floor => ['Hallway', 'Loft'].includes(floor['data-room']) && x >= Number(floor.x) && x <= Number(floor.x) + Number(floor.width) && y >= Number(floor.y) && y <= Number(floor.y) + Number(floor.height)), `${x},${y}`);
    }
  }
  for (const filename of ['upstairs.html', 'floor-plan-reference.md', 'design-context.md']) {
    const notes = fs.readFileSync(path.join(root, filename), 'utf8');
    assert.match(notes, /version-i\.svg/);
    assert.match(notes, /upstairs (?:3D )?model (?:still\s+uses|still\nuses|remains) Version H|upstairs 3D schedule below remains Version H/);
  }
});
