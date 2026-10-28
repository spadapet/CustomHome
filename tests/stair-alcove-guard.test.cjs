'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const layout = require('../upstairs-layout.js');
const { getGuestEntryLayout, getGroundFloorDefaultPlan } = require('../floor-plan-ground.js');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
const entry = getGuestEntryLayout();
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

function build() {
  const parts = [], beams = [];
  class Group { constructor() { this.userData = {}; } add() {} }
  vm.runInNewContext(source.slice(source.indexOf('  const alcoveGuard ='), source.indexOf('  for (const upper of [false, true])')), {
    guestEntry: entry, black: {},
    THREE: { Group }, stairs: new Group(), stairOpening: layout.stairOpening(), stairDepth: layout.stairOpening().depth,
    stairFloorToFloor: 10, stairRise: 7.5 / 12, stairGoing: 10 / 12, stairRun: 70 / 12, landingHeight: 5, oak: {},
    stairBeam(name, start, end) { beams.push({ name, start, end }); },
    furnishing(name, x, z, rotation, elevation) { close(elevation, 0.005); return { name }; },
    box(parent, x, y, z, w, h, d) { const part = { x, y, z, w, h, d }; parts.push(part); return part; }
  });
  parts.beams = beams;
  return parts;
}

test('only the photo-matched ground alcove extension is removed; powder privacy and doorway stay', () => {
  const plan = getGroundFloorDefaultPlan();
  assert.deepEqual(plan.walls.find(([name]) => name === 'Powder north'), ['Powder north', 0, 35.1, 7.45, 35.1]);
  close((12.2 - entry.stairGuard.x) * 12, 57);
  close((entry.stairGuard.x - entry.powderDoor.x) * 12, 4.2);
  assert.deepEqual(entry.powderDoor, { x: 7.1, z: 35.6, width: 2.5, height: 8 });
  assert.deepEqual(plan.walls.find(([name]) => name === 'Powder east').at(-1), [[0.5, 3, 0, 8]]);
  assert.match(source, /\[0, powderNorthZ, guestEntry\.stairGuard\.x, powderNorthZ\]/);
  assert.ok(plan.floors.some(f => f.room === 'Guest entry alcove' && f.x === 7.1 && f.z === 35.1 && f.w === 5.1 && f.d === 3.5));
});

test('newly exposed upper-flight edge is guarded through the upstairs guard junction', () => {
  const parts = build(), beams = parts.beams;
  const handrails = beams.filter(b => b.name === 'Exposed upper-flight handrail');
  assert.equal(handrails.length, 2);
  close(layout.stairOpening().x + layout.stairOpening().width - handrails[0].start[0], entry.stairGuard.x);
  assert.deepEqual(handrails[0].end, handrails[1].start);
  assert.deepEqual(Array.from(handrails[1].end), [0, 13, layout.stairOpening().depth]);
  assert.equal(beams.filter(b => b.name === 'Exposed upper-flight horizontal rail').length, 16);
  assert.equal(parts.filter(p => p.name === 'Exposed upper-flight guard post').length, 3);
});

test('production guard has continuous end contact, top and bars without perimeter gaps', () => {
  const parts = build(), g = entry.stairGuard;
  const posts = parts.filter(p => p.name === 'Alcove stair guard post');
  const top = parts.find(p => p.name === 'Alcove stair guard top rail');
  const bars = parts.filter(p => p.name === 'Alcove stair horizontal guard rail');
  assert.equal(posts.length, 2); assert.equal(bars.length, 11);
  close(posts[0].x - posts[0].w / 2, g.x);
  close(posts[1].x + posts[1].w / 2, g.endX);
  close(top.y + top.h / 2, 42 / 12);
  for (const p of [...bars, top]) {
    close(p.x - p.w / 2, g.x); close(p.x + p.w / 2, g.endX); close(p.z, 35.1);
    for (const post of posts) assert.ok(p.y + p.h / 2 <= post.h + 1e-8);
  }
  const levels = [0, ...bars.map(p => p.y), top.y - top.h / 2];
  for (let i = 1; i < levels.length; i++) assert.ok((levels[i] - levels[i - 1]) * 12 <= 3.5 + 1e-8);
  for (const post of posts) close(post.y - post.h / 2, 0);
});

test('cut back only the continuous-floor end; extend the retained half to the actual stair corner', () => {
  const g = entry.stairGuard, opening = layout.stairOpening();
  close(g.endX, opening.x + opening.width);
  close((12.2 - g.endX) * 12, 26.3);
  close((g.endX - (7.45 + 12.2) / 2) * 12, 2.2);
  close((g.endX - g.x) * 12, 30.7);
  const plan = getGroundFloorDefaultPlan();
  assert.ok(plan.floors.some(f => f.x <= g.endX && f.x + f.w >= 12.2 && f.z <= opening.z && f.z + f.d >= opening.z + opening.depth),
    'Removed rail must back onto the continuous ground-floor strip beyond the stair void');
  for (const p of build().filter(p => /^Alcove stair/.test(p.name))) {
    assert.ok(p.x + p.w / 2 <= g.endX + 1e-8, 'No post/bar may remain in front of the doors beyond the stair corner');
  }
});

test('guard leaves the existing alcove route and door approach; no invisible wall across rails', () => {
  const top = build().find(p => p.name === 'Alcove stair guard top rail');
  const southBaseboardFace = entry.coatCloset.z - 0.175 - 0.75 / 12;
  close((southBaseboardFace - (top.z + top.d / 2)) * 12, 38.43);
  // An 18-inch-radius visitor can approach the powder door from the east.
  const radius = 1.5, z = 36.85;
  assert.ok(z - radius > top.z + top.d / 2);
  assert.ok(z + radius < southBaseboardFace);
  assert.ok(entry.powderDoor.z + 0.175 > top.z + top.d / 2);
  const wall = getGroundFloorDefaultPlan().walls.find(([name]) => name === 'Powder north');
  assert.ok(wall[3] < 8, 'The removed span cannot remain a shared wall/route obstacle');
  assert.match(source, /box\(alcoveGuard, .*0\.12, 0\.12, black\)/, 'Top rail remains a physical tour obstacle');
  assert.match(source, /cover\(new THREE\.Vector2\(guestEntry\.stairGuard\.x, guestEntry\.stairGuard\.z - 0\.175\), new THREE\.Vector2\(guestEntry\.stairGuard\.x, guestEntry\.stairGuard\.z \+ 0\.175\), new THREE\.Vector2\(1, 0\)\)/,
    'Omit the wall-end baseboard return where the post and low bars meet the painted wall');
});
