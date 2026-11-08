'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const svg = fs.readFileSync(path.join(__dirname, '..', 'assets', 'images', 'plans', 'upstairs-2000', 'version-h.svg'), 'utf8');

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
}

function element(id) {
  const match = svg.match(new RegExp(`<[^>]+\\bid="${id}"[^>]*>`));
  assert.ok(match, id);
  return attributes(match[0]);
}

function item(room, name) {
  const match = svg.match(new RegExp(`<g data-room="${room}" data-item="${name}"[^>]*>([\\s\\S]*?)</g>`));
  assert.ok(match, `${room}: ${name}`);
  return match[1];
}

function rectangle(source) {
  const match = source.match(/<rect\b[^>]*>/);
  assert.ok(match, 'Expected a rectangle');
  const a = attributes(match[0]);
  const stroke = a.class === 'shower' ? .04 : .035;
  return { x: Number(a.x || 0), y: Number(a.y || 0), w: Number(a.width), h: Number(a.height), stroke };
}

function footprint(room, name) {
  const source = item(room, name);
  const use = source.match(/<use\b[^>]*>/);
  if (!use) return rectangle(source);
  const a = attributes(use[0]);
  const symbol = svg.match(new RegExp(`<g id="${a.href.slice(1)}">([\\s\\S]*?)</g>`));
  assert.ok(symbol, a.href);
  const shapes = [...symbol[1].matchAll(/<(?:rect|ellipse)\b[^>]*>/g)].map(match => {
    const s = attributes(match[0]);
    return match[0].startsWith('<rect') ? rectangle(match[0]) : {
      x: Number(s.cx) - Number(s.rx), y: Number(s.cy) - Number(s.ry),
      w: Number(s.rx) * 2, h: Number(s.ry) * 2, stroke: .035
    };
  });
  const x = Math.min(...shapes.map(s => s.x - s.stroke));
  const y = Math.min(...shapes.map(s => s.y - s.stroke));
  return {
    x: Number(a.x) + x, y: Number(a.y) + y,
    w: Math.max(...shapes.map(s => s.x + s.w + s.stroke)) - x,
    h: Math.max(...shapes.map(s => s.y + s.h + s.stroke)) - y, stroke: 0
  };
}

function bounds(box) {
  return { left: box.x - box.stroke, top: box.y - box.stroke, right: box.x + box.w + box.stroke, bottom: box.y + box.h + box.stroke };
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function near(actual, expected) {
  assert.ok(Math.abs(actual - expected) < .00001, `${actual} != ${expected} (feet or inches as asserted)`);
}

test('Version H gallery lounge keeps full-size footprints and the measured north route', () => {
  const sofa = footprint('gallery', '84 by 36 inch couch');
  const coffee = footprint('gallery', '48 by 24 inch coffee table');
  const table = footprint('gallery', '18-inch side table');
  near(sofa.x, 18); near(sofa.y, 30); near(sofa.w * 12, 84); near(sofa.h * 12, 36);
  near(coffee.x, 19.5); near(coffee.y, 34.35); near(coffee.w * 12, 48); near(coffee.h * 12, 24);
  near(table.w * 12, 18); near(table.h * 12, 18);
  near((sofa.y - 26.9875) * 12, 36.15);
  near((coffee.y - sofa.y - sofa.h) * 12, 16.2);
  assert.equal(overlaps(bounds(sofa), bounds(coffee)), false);
  assert.equal(overlaps(bounds(sofa), bounds(table)), false);
  assert.equal([...svg.matchAll(/data-room="gallery" data-item=/g)].length, 4);
  item('gallery', 'Armchair');
  assert.match(svg, /ground alternative not adopted/);
});

test('Version H has a toilet and sink in every bathroom and retains upstairs fixtures', () => {
  for (const room of ['powder', 'guestBath', 'primaryBath', 'bath2', 'bath3', 'bath4']) {
    assert.equal([...svg.matchAll(new RegExp(`data-room="${room}" data-item="Toilet"`, 'g'))].length, 1, room);
    if (room === 'primaryBath') {
      item(room, '60-inch vanity');
      item(room, '48-inch vanity');
      item(room, 'Freestanding tub');
    } else {
      const vanity = footprint(room, '36-inch vanity');
      near(vanity.w - .07, 3);
    }
  }
  const shower = footprint('guestBath', '36 by 60 inch shower');
  near(shower.w * 12, 36);
  near(shower.h * 12, 60);
});

test('ground bathroom fixtures fit drawn wall faces without positive overlaps', () => {
  for (const [room, shell, names] of [
    ['powder', { left: .225, top: 35.225, right: 6.975, bottom: 40.5542 }, ['Toilet', '36-inch vanity']],
    ['guestBath', { left: 19.325, top: 34.8617, right: 31.075, bottom: 40.1542 }, ['Toilet', '36-inch vanity', '36 by 60 inch shower']]
  ]) {
    const boxes = names.map(name => bounds(footprint(room, name)));
    for (const box of boxes) {
      assert.ok(box.left >= shell.left && box.top >= shell.top && box.right <= shell.right && box.bottom <= shell.bottom, room);
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) assert.equal(overlaps(boxes[i], boxes[j]), false, room);
    }
  }
});

test('full-size stack fits enlarged northeast niche and has an open south front', () => {
  const walls = element('guest-laundry-walls');
  const coords = walls.d.match(/^M([\d.]+) ([\d.]+)V([\d.]+)H([\d.]+)M([\d.]+) ([\d.]+)H([\d.]+)$/);
  assert.ok(coords);
  const [, west, north, south, openingWest, openingEast, returnY, east] = coords.map(Number);
  const thickness = Number(walls['stroke-width']);
  near((east - west - thickness) * 12, 33);
  near((south - north - thickness) * 12, 33);
  near(returnY, south);
  const stack = footprint('guestLaundry', '27 by 32 inch washer dryer stack');
  near(stack.w * 12, 27);
  near(stack.h * 12, 32);
  const box = bounds(stack);
  assert.ok(box.left > west + thickness / 2 && box.right < east - thickness / 2);
  assert.ok(box.top > north + thickness / 2 && box.bottom < south);
  assert.ok(box.left > openingWest && box.right < openingEast);
  near((40.2792 - .125 - stack.y - stack.h) * 12, 30.450396);
  const toilet = bounds(footprint('guestBath', 'Toilet'));
  assert.ok(toilet.right < west - thickness / 2);
  assert.match(item('guestLaundry', '27 by 32 inch washer dryer stack'), /FIT TBD/);
});

test('closet partition creates a continuous 39-inch hall with unchanged closet and bath openings', () => {
  const wall = element('guest-closet-right-wall');
  const floor = element('guest-bath-hall-floor');
  const coords = wall.d.match(/^M([\d.]+) ([\d.]+)V([\d.]+)$/);
  assert.ok(coords);
  near(Number(coords[1]), Number(floor.x));
  near(Number(coords[2]), Number(floor.y));
  near(Number(coords[3]), Number(floor.y) + Number(floor.height));
  near((Number(floor.width) - Number(wall['stroke-width'])) * 12, 39);
  assert.match(svg, /M19\.2000 42\.6792L19\.9500 42\.6792M22\.4500 42\.6792L23\.3500 42\.6792M27\.3500 42\.6792L27\.7000 42\.6792/);
  assert.match(svg, /M19\.2000 40\.2792L27\.9500 40\.2792M30\.4500 40\.2792L31\.2000 40\.2792/);
  assert.doesNotMatch(svg, /M28\.9000 34\.7367L28\.9000 36\.7367/);
});

test('ground bath 96-inch doors sweep clear of fixtures and the guest closet partition', () => {
  for (const [id, room, names, expectedHinge] of [
    ['powder-door-sweep', 'powder', ['Toilet', '36-inch vanity'], [7.1, 40.5]],
    ['guest-bath-door-sweep', 'guestBath', ['Toilet', '36-inch vanity', '36 by 60 inch shower'], [30.45, 40.2792]]
  ]) {
    const door = element(id);
    assert.equal(Number(door['data-height-inches']), 96);
    assert.equal(Number(door['data-width-inches']), 30);
    const coords = door.d.match(/^M([\d.]+) ([\d.]+)([HV])([\d.]+)A([\d.]+) ([\d.]+) 0 0 1 ([\d.]+) ([\d.]+)$/);
    assert.ok(coords, door.d);
    const x = Number(coords[1]), y = Number(coords[2]), radius = Number(coords[5]);
    assert.deepEqual([x, y], expectedHinge);
    near(radius, 2.5);
    const boxes = names.map(name => bounds(footprint(room, name)));
    if (room === 'guestBath') boxes.push(bounds(footprint('guestLaundry', '27 by 32 inch washer dryer stack')));
    for (let angle = 0; angle <= 90; angle++) {
      for (let distance = 0; distance <= radius; distance += .025) {
        const a = angle * Math.PI / 180;
        const px = x - distance * Math.cos(a);
        const py = y + distance * Math.sin(a) * (room === 'powder' ? -1 : 1);
        const leaf = { left: px - .035, right: px + .035, top: py - .035, bottom: py + .035 };
        for (const box of boxes) assert.equal(overlaps(leaf, box), false, `${id}: ${angle} degrees`);
        if (room === 'guestBath') assert.ok(leaf.left > 27.825);
      }
    }
  }
});
