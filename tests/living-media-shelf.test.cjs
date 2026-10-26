'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('rejected media shelves, brackets and basket are removed while under-stair shelves remain', () => {
  const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
  assert.doesNotMatch(source, /livingMediaShelf|cableBasket|Open media shelf oak board|Media shelf wall bracket|Media shelf support arm|Cable basket bottom/);
  assert.match(source, /stairBookcases\.name = 'Recessed under-stair bookcases'/);
  assert.match(source, /piano\.name = 'Yamaha CLP-825 Rosewood digital piano'/);
});
