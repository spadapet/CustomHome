'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { addWindowShadeDivisions, getWindowProductIntent, getKitchenWindowBankLayout, getPrepWindowBankLayout, getGroundFrontWindows } = require('../floor-plan-ground.js');
const { getUpstairsSideWindows } = require('../floor-plan-upstairs.js');
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('all paired/triple column joints have full six-inch reveal depth on either interior side', () => {
  for (const width of [4, 6, 7.6]) for (const side of [-1, 1]) {
    const intent = getWindowProductIntent(width, 5);
    const joints = Array.from({ length: intent.columns - 1 }, (_, index) => -width / 2 + width * (index + 1) / intent.columns);
    const parts = [];
    addWindowShadeDivisions({}, (parent, x, y, z, w, h, d) => { const part = { x, y, z, w, h, d }; parts.push(part); return part; }, {}, joints, 3, 5, 0.075, side);
    assert.equal(parts.length, intent.columns - 1);
    parts.forEach((part, index) => {
      close(part.x, joints[index]); close(part.y - part.h / 2, 3); close(part.y + part.h / 2, 8);
      close(part.w * 12, 3.5); close(part.d * 12, 6);
      close(side * part.z + part.d / 2, 0.075);
      close(side * part.z - part.d / 2, 0.075 - 0.5);
      assert.equal(part.userData.structuralPier, false);
      assert.equal(part.userData.shadeMountingVerified, false);
    });
  }
});

test('joined counter banks retain their unequal section boundaries and fixed center', () => {
  for (const bank of [getKitchenWindowBankLayout(), getPrepWindowBankLayout()]) {
    assert.deepEqual(bank.units.map(unit => unit.picture), [false, true, false]);
    for (let index = 0; index < bank.units.length - 1; index++)
      close(bank.units[index].x + bank.units[index].width / 2, bank.units[index + 1].x - bank.units[index + 1].width / 2);
  }
});

test('only triple operable groups gain a center picture; pictures and singles remain single', () => {
  assert.deepEqual(getWindowProductIntent(getGroundFrontWindows()[1].width, 5).pictureColumns, [1]);
  for (const [, , , width] of getUpstairsSideWindows()) {
    assert.ok(width <= 4);
    assert.deepEqual(getWindowProductIntent(width, 5).pictureColumns, []);
  }
  for (const [width, height] of [[6, 1.5], [4.5, 4.5], [3, 5]]) {
    const picture = getWindowProductIntent(width, height, true);
    assert.equal(picture.columns, 1); assert.equal(picture.rows, 1);
    assert.equal(picture.operation, 'fixed picture window');
  }
});
