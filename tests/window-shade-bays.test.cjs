'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { addWindowShadeDivisions, getWindowProductIntent, getKitchenWindowBankLayout, getPrepWindowBankLayout, getGroundFrontWindows, getGroundFloorDefaultPlan } = require('../floor-plan-ground.js');
const { getUpstairsSideWindows } = require('../floor-plan-upstairs.js');
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('owner X-marked office porch bank matches the circled guest bank without moving either center', () => {
  const [office, guest] = getGroundFrontWindows();
  assert.equal(office.center, 6);
  assert.equal(guest.center, 25);
  for (const window of [office, guest]) {
    close(window.width * 12, 91.2);
    close(window.height * 12, 60);
    close(window.sill * 12, 36);
    const intent = getWindowProductIntent(window.width, window.height);
    assert.equal(intent.columns, 3);
    assert.equal(intent.rows, 1);
    assert.deepEqual(intent.pictureColumns, [1]);
    assert.equal(intent.operation, 'casement / fixed picture / casement');
    close(intent.unitWidthFeet * 12, 30.4);
  }
  const wall = getGroundFloorDefaultPlan().walls.find(([name]) => name === 'House south');
  for (const window of [office, guest]) {
    const cut = wall[5].find(([left, right]) => Math.abs((left + right) / 2 - window.center) < 1e-8);
    assert.ok(cut, `${window.name} has a coordinated structural wall opening`);
    close(cut[1] - cut[0], window.width);
    close(cut[2], window.sill);
    close(cut[3], window.sill + window.height);
  }
});

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
