'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { room, generate, overlap, assess } = require('../kids-room-options.js');
const options = generate();

test('comparison covers all 54 unique wall assignments with stable numbers', () => {
  assert.equal(options.length, 54);
  assert.equal(new Set(options.map(o => o.assignment.join(','))).size, 54);
  assert.deepEqual(options.map(o => o.id), Array.from({ length: 54 }, (_, i) => i + 1));
  assert.equal(options.filter(o => o.assignment[0] === o.assignment[1]).length, 18);
});

test('shown samples preserve product size, wall assignment, room bounds and static separation', () => {
  assert.ok(options.some(o => o.layout), 'At least one usable sample must be generated');
  for (const option of options.filter(o => o.layout)) {
    assert.equal(option.layout.parts.length, 4);
    option.layout.parts.forEach((part, index) => {
      assert.equal(part.wall, option.assignment[index]);
      const length = index < 2 ? 47.25 : 39;
      const depth = index < 2 ? 31.5 : 17.375;
      assert.equal(part.w, part.wall === 'E' ? depth : length);
      assert.equal(part.d, part.wall === 'E' ? length : depth);
      assert.ok(part.x >= 0 && part.y >= 0 && part.x + part.w <= room.width && part.y + part.d <= room.depth);
      for (const other of option.layout.parts.slice(index + 1)) assert.equal(overlap(part, other), false);
    });
    assert.deepEqual(assess(option.layout.parts), { score: option.layout.score, warnings: option.layout.warnings });
  }
});

test('use screening detects entry obstruction and furniture conflicts instead of claiming approval', () => {
  const part = { x: 0, y: room.entryStart, w: 39, d: 17.375, label: 'Bins A', desk: false, use: { x: 0, y: room.entryStart - 17.375, w: 39, d: 17.375 } };
  const result = assess([part]);
  assert.ok(result.score >= 100);
  assert.ok(result.warnings.some(w => w.includes('entry approach')));
  assert.equal(overlap({ x: 0, y: 0, w: 10, d: 10 }, { x: 10, y: 0, w: 10, d: 10 }), false);
});
