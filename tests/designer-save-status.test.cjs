'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../upstairs-designer.js'), 'utf8');
const update = source.slice(source.indexOf('  function updateSaveStatus()'), source.indexOf('  function queueSave()'));

for (const title of ['First-floor designer', 'Upstairs designer']) {
  test(`${title} hides saved confirmations but shows pending saves and errors`, () => {
    const button = {};
    const saveStatus = { dataset: {}, setAttribute(name, value) { this[name] = value; } };
    const state = { dirty: false };
    const context = { title, saveStatus, saving: false, saveError: '', dirty: () => state.dirty, element: () => button };
    vm.createContext(context);
    vm.runInContext(update, context);
    const refresh = () => vm.runInContext('updateSaveStatus();', context);

    refresh();
    assert.equal(saveStatus.hidden, true);
    assert.equal(saveStatus.textContent, '');
    assert.equal(button.textContent, title);
    assert.equal(saveStatus['aria-label'], `${title} save status`);

    state.dirty = true;
    refresh();
    assert.equal(saveStatus.hidden, false);
    assert.equal(saveStatus.textContent, 'Changes waiting to save automatically...');
    assert.equal(button.textContent, `${title} *`);

    context.saving = true;
    refresh();
    assert.equal(saveStatus.hidden, false);
    assert.equal(saveStatus.textContent, 'Saving changes to the project...');

    context.saving = false;
    context.saveError = 'Connection failed';
    state.dirty = false;
    refresh();
    assert.equal(saveStatus.hidden, false);
    assert.match(saveStatus.textContent, /Not saved: Connection failed/);
    assert.equal(saveStatus.dataset.error, 'true');
    assert.equal(button.textContent, `${title} *`);

    context.saveError = '';
    refresh();
    assert.equal(saveStatus.hidden, true);
    assert.equal(saveStatus.textContent, '');
    assert.equal(saveStatus.dataset.error, 'false');
    assert.equal(button.textContent, title);
  });
}

test('both save-status regions start hidden before the designers initialize', () => {
  const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
  for (const id of ['designer-save-status', 'ground-designer-save-status']) {
    assert.match(html, new RegExp(`<p id="${id}"[^>]*\\bhidden\\b[^>]*>`));
  }
});
