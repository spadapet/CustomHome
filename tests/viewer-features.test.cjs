'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = (file) => fs.readFileSync(require.resolve(`../${file}`), 'utf8');

test('footer keeps area totals and controls without the furnished-concept legend', () => {
  const footer = read('floor-plan-3d.html').split('<div class="model-footer">')[1].split('</div>')[0];
  assert.doesNotMatch(footer, /Furnished concept|legend-dot/);
  for (const id of ['livable-area', 'refresh-model', 'reset-view']) assert.ok(footer.includes(`id="${id}"`));
  assert.doesNotMatch(read('floor-plan-3d.js'), /querySelector\('\.model-footer span'\)/);
});

test('room navigation gives every room its own floor-aware camera and keeps inspection shortcuts out of the toolbar', () => {
  const { getGroundFloorDefaultPlan } = require('../floor-plan-ground.js');
  const UpstairsLayout = require('../upstairs-layout.js');
  const upstairsScope = {};
  vm.runInNewContext(read('floor-plan-upstairs.js'), upstairsScope);
  const stairOpening = UpstairsLayout.stairOpening();
  const upstairs = { rooms: upstairsScope.getUpstairsDefaultPlan(stairOpening).rooms, start: [16.5, 33] };
  const containers = Object.fromEntries(['ground', 'upstairs'].map((floor) => [`${floor}-room-views`, { children: [], append(button) { this.children.push(button); } }]));
  const context = {
    getGroundFloorDefaultPlan, upstairs, stairOpening, stairFloorToFloor: 10, presets: {}, viewButtons: [],
    cooktopCenterZ: 16.95, kitchenCenterZ: 16.95, prepCounterZ: 8.25,
    document: {
      getElementById(id) { return containers[id]; },
      createElement() { return { dataset: {}, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } }; },
      querySelectorAll() { return Object.values(containers).flatMap((container) => container.children); }
    }
  };
  const source = read('floor-plan-3d.js');
  vm.runInNewContext(source.slice(source.indexOf('  const roomViewAliases ='), source.indexOf('  function fitEditedUpstairs(')), context);
  const groundButtons = containers['ground-room-views'].children;
  const upstairsButtons = containers['upstairs-room-views'].children;
  assert.equal(groundButtons.length, getGroundFloorDefaultPlan().rooms.length + 1);
  assert.equal(upstairsButtons.length, upstairs.rooms.length);
  assert.equal(new Set(context.viewButtons.map((button) => button.dataset.view)).size, context.viewButtons.length);
  for (const [floor, buttons] of [['ground', groundButtons], ['upstairs', upstairsButtons]]) {
    for (const button of buttons) {
      const preset = context.presets[button.dataset.view];
      assert.equal(preset.floor, floor);
      assert.ok(preset.target.every(Number.isFinite));
      assert.ok(preset.span > 0);
      assert.equal(button.attributes['aria-pressed'], 'false');
      assert.equal(button.dataset.floor, floor);
    }
  }
  for (const [view, label] of [['living', 'Living room'], ['dining', 'Dining room'], ['powder', 'Powder room'], ['prep-kitchen', 'Prep kitchen'], ['guest-bathroom', 'Guest bathroom'], ['office', 'Office']]) {
    assert.equal(groundButtons.find((button) => button.dataset.view === view)?.textContent, label);
  }
  const toolbar = read('floor-plan-3d.html').split('<div class="model-toolbar">')[1].split('<div class="exterior-views"')[0];
  assert.doesNotMatch(toolbar, /data-view="(?:social|prep|mudroom-cubbies|mudroom-storage)"/);
  for (const key of ['social:', 'prep:', "'mudroom-cubbies':", "'mudroom-storage':"]) assert.ok(source.includes(key), 'Legacy inspection/deep-link presets remain available');
  assert.ok(source.includes("presets[name].floor ??"));
  assert.match(source, /'guest-bathroom': \{ target: \[27\.85, 1\.5, 38\.8\], offset: \[0\.2, 14, 1\], span: 10 \}/);
  const startSource = source.slice(source.indexOf('  function startWalking('), source.indexOf('    buildWalkObstacles();', source.indexOf('  function startWalking(')));
  vm.runInNewContext(`${startSource}return { x, z, lookX, lookZ }; }`, context);
  for (const view of ['powder', 'prep-kitchen', 'office', upstairsButtons[0].dataset.view]) {
    context.currentView = view;
    const start = context.startWalking();
    assert.ok(Object.values(start).every(Number.isFinite), `${view} has a usable tour-start request`);
  }
});

test('2D plans use orthographic projection and pan without changing the layout', () => {
  const source = read('floor-plan-3d.js');
  assert.match(read('floor-plan-3d.html'), /data-view="top"[^>]*>2D floor plan</);
  assert.match(source, /const planView = name === 'top' \|\| name === 'upstairs-top'/);
  assert.match(source, /planView \|\| name === 'cooktop'.*\? cooktopElevationCamera : perspectiveCamera/);
  assert.match(source, /setNavigationMode\(planView \? 'move' : navigationMode\)/);
  assert.match(source, /controls.enableRotate = currentView !== 'top' && currentView !== 'upstairs-top'/);
  assert.match(source, /setView\(button.dataset.view === 'top' && activeFloor === 'upstairs' \? 'upstairs-top'/);
  assert.match(source, /if \(currentView === 'top' \|\| currentView === 'upstairs-top'\) return/);
  for (const name of ['top', "'upstairs-top'"]) {
    assert.ok(source.includes(`${name}: { target:`));
  }
  assert.match(source, /'upstairs-top': .*offset: \[0, 110, 0\]/);
  assert.match(source, /top: .*offset: \[0, 110, 0\]/);
});

test('viewer removes both editors without removing saved layout loading or viewing tools', () => {
  const html = read('floor-plan-3d.html');
  const source = read('floor-plan-3d.js');
  assert.doesNotMatch(html, /upstairs-designer|ground-designer|designer-save-status/);
  assert.doesNotMatch(source, /createUpstairsDesigner|designer-open|designer-launch/);
  for (const file of ['upstairs-layout.json', 'ground-layout.json']) assert.ok(source.includes(`fetch('${file}'`));
  for (const control of ['show-floor-grid', 'data-navigation="walk"', 'data-view="upstairs"', 'data-view="exterior"']) assert.ok(html.includes(control));
  for (const id of ['ground-preview-status', 'upstairs-preview-status', 'firepit-storage-note']) assert.match(html, new RegExp(`id="${id}"[^>]*hidden`));
  assert.ok(source.includes("!['exterior-patio', 'exterior-firepit', 'exterior-wood'].includes(name)"));
});

test('model refresh reloads fresh files into Whole floor and Rotate by default', () => {
  const html = read('floor-plan-3d.html');
  const source = read('floor-plan-3d.js');
  assert.match(html, /id="refresh-model"[^>]*>Refresh model/);
  assert.match(html, /data-view="whole" aria-pressed="true"/);
  assert.match(html, /data-view="top" aria-pressed="false"/);
  assert.match(html, /data-navigation="rotate" aria-pressed="true"/);
  assert.match(source, /let currentView = 'whole';/);
  assert.match(source, /let navigationMode = 'rotate';/);
  assert.match(source, /refreshButton\?\.addEventListener\('click', \(\) => \{\r?\n  refreshButton\.disabled = true;\r?\n  location\.replace\(location\.pathname\);/);
  assert.match(source, /setView\('whole'\);\r?\n    setNavigationMode\('rotate'\);/);
  assert.doesNotMatch(html, /floor-caption|viewport-caption|CONCEPT 01/);
  assert.doesNotMatch(source, /floor-caption|ADAPTED STUDY/);
});

test('reference sections below the viewer live in markdown, not on the page', () => {
  const html = read('floor-plan-3d.html');
  const source = read('floor-plan-3d.js');
  const notes = read('viewer-reference-notes.md');
  assert.doesNotMatch(html, /Living-room layout lab|Meet the furniture|Model assumptions|furniture-card|concept-details|data-living-choice/);
  assert.doesNotMatch(source, /living-layout-options|living-layout-status|furniture-card|furniture-photo|function livingPlan/);
  assert.match(source, /applyLivingLayout\(livingLayouts\[0\], false\);/);
  assert.match(html, /class="studio-footer"/);
  for (const heading of ['## Living-room layout alternatives', '## Furniture references', '## Model assumptions, dimensions and vehicle references']) assert.ok(notes.includes(heading), heading);
});

test('dimensioned 2D links show every current room and retain a plain plan option', () => {
  const source = read('floor-plan-3d.js');
  for (const file of ['floor-plan-design.html']) {
    const html = read(file);
    for (const href of ['?view=top"', '?view=top&amp;dimensions=1"', '?view=upstairs-top&amp;dimensions=1"']) assert.ok(html.includes(href));
  }
  const element = () => ({
    children: [], style: {}, hidden: true,
    append(...items) { this.children.push(...items); },
    replaceChildren() { this.children = []; }
  });

  const elements = Object.fromEntries(['show-room-dimensions', 'plan-dimension-labels', 'plan-dimensions', 'plan-dimension-list'].map((id) => [id, element()]));
  elements['show-room-dimensions'].addEventListener = () => {};
  const { getGroundFloorDefaultPlan } = require('../floor-plan-ground.js');
  const scope = {};
  vm.runInNewContext(read('floor-plan-upstairs.js'), scope);
  const context = {
    document: { getElementById: (id) => elements[id], createElement: element },
    currentView: 'top', activeFloor: 'ground', groundBaseline: getGroundFloorDefaultPlan(),
    upstairs: { rooms: scope.getUpstairsDefaultPlan(require('../upstairs-layout.js').stairOpening()).rooms }
  };
  const start = source.indexOf('  let groundLayoutPreview = null;');
  vm.runInNewContext(source.slice(source.indexOf('  function feet('), source.indexOf('  function roomDimensions(')) + source.slice(start, source.indexOf('  const upstairsHelpers =', start)), context);
  const input = elements['show-room-dimensions'];
  input.checked = true;
  for (const [floor, view, rooms] of [['ground', 'top', context.groundBaseline.rooms], ['upstairs', 'upstairs-top', context.upstairs.rooms]]) {
    context.activeFloor = floor;
    context.currentView = view;
    context.updatePlanDimensions();
    assert.equal(elements['plan-dimensions'].hidden, false);
    assert.equal(elements['plan-dimension-labels'].children.length, rooms.length);
    assert.equal(elements['plan-dimension-list'].children.length, rooms.length);
    rooms.forEach((room, index) => {
      assert.equal(elements['plan-dimension-labels'].children[index].children[0].textContent, room.name);
      assert.equal(elements['plan-dimension-list'].children[index].textContent, `${room.name}: ~ ${context.feet(room.w)} x ${context.feet(room.d)}`);
    });
  }
  context.activeFloor = 'ground';
  context.currentView = 'top';
  vm.runInNewContext("groundLayoutPreview = { plan: { rooms: [{ name: 'Saved room', x: 0, z: 0, w: 7.25, d: 9.5 }] } };", context);
  context.updatePlanDimensions();
  assert.equal(elements['plan-dimension-list'].children[0].textContent, 'Saved room: ~ 7\' 3" x 9\' 6"');
  input.checked = false;
  context.updatePlanDimensions();
  assert.equal(elements['plan-dimensions'].hidden, true);
  input.checked = true;
  context.currentView = 'whole';
  context.updatePlanDimensions();
  assert.equal(input.disabled, true);
  assert.equal(elements['plan-dimension-labels'].hidden, true);
  assert.match(source, /roomDimensionsInput.checked = initialParameters.get\('dimensions'\) === '1'/);
  assert.match(source, /function render\(\) \{[^}]*updateVehicleDoorControls\(\);\s+positionPlanDimensions\(\)/);
});

test('viewer consolidates controls in a collapsible sidebar without duplicate plan links', () => {
  const html = read('floor-plan-3d.html');
  const source = read('floor-plan-3d.js');
  const sidebar = html.split('<details class="viewer-navigation"')[1].split('<div class="viewer-stage">')[0];
  for (const control of ['data-view="top"', 'id="ground-room-views"', 'id="upstairs-room-views"', 'id="show-room-dimensions"', 'id="show-floor-grid"', 'id="exterior-views"', 'data-navigation="walk"']) assert.ok(sidebar.includes(control));
  assert.equal((sidebar.match(/data-view="exterior"/g) || []).length, 1);
  assert.doesNotMatch(html, /class="plan-links"|Show room menu/);
  assert.match(html, /<summary>Menu<\/summary>/);
  assert.match(source, /viewerNavigation.open = !narrowViewer.matches/);
  assert.match(source, /if \(button.closest\('\.viewer-navigation'\)\) collapseMobileNavigation\(\)/);
  const summary = { focus() { this.focused = true; } };
  const context = { narrowViewer: { matches: false }, viewerNavigation: { open: true, querySelector: () => summary } };
  vm.runInNewContext(source.slice(source.indexOf('function collapseMobileNavigation()'), source.indexOf('function setRoomMenuVisible(')), context);
  context.collapseMobileNavigation();
  assert.equal(context.viewerNavigation.open, true);
  context.narrowViewer.matches = true;
  context.collapseMobileNavigation();
  assert.equal(context.viewerNavigation.open, false);
  assert.equal(summary.focused, true);
});

test('viewer omits promotional heading and visible garage explanation without breaking accessible door feedback', () => {
  const html = read('floor-plan-3d.html');
  assert.doesNotMatch(html, /YOUR HOME, A LITTLE MORE REAL|TWO-FLOOR CONCEPT|class="studio-heading"|class="concept-badge"|Garage door study:/);
  assert.match(html, /<p id="vehicle-door-status" class="tour-screen-reader" role="status" hidden><\/p>/);
  assert.match(read('floor-plan-3d.css'), /\.tour-screen-reader\{[^}]*position:absolute;[^}]*width:1px;height:1px/);
});

test('night lighting applies to all bathrooms without prematurely selecting a switch product', () => {
  assert.match(read('bathrooms.html'), /Built-in night lighting in every bathroom, including powder rooms and all upstairs bathrooms/);
  assert.match(read('electrical.html'), /every bathroom and powder room on every floor/);
  assert.match(read('electrical.html'), /switch-integrated night light is a candidate, not a selected product/);
});

test('firepit returns to rear cold storage and a narrow wood rack fits beside the waste bins', () => {
  class Group {
    constructor() {
      this.children = [];
      this.userData = {};
      this.rotation = {};
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
    }
    add(child) { this.children.push(child); }
  }
  class Mesh extends Group {
    constructor(geometry, material) { super(); Object.assign(this, geometry, { material }); }
  }
  class CylinderGeometry {
    constructor(top, bottom, height) { this.w = this.d = 2 * Math.max(top, bottom); this.h = height; }
  }
  const group = new Group();
  const context = {
    THREE: { Group, Mesh, CylinderGeometry }, group, dark: {}, stepStone: {}, wood: {},
    box(parent, x, y, z, w, h, d, material) {
      const mesh = new Mesh({ w, h, d }, material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }
  };
  const source = read('floor-plan-exterior.js');
  const start = source.indexOf('  const portableFirepit =');
  const end = source.indexOf('  function exteriorSteps(', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  const firepit = group.children.find((part) => part.name === 'Portable firepit - rear-yard cold storage only');
  assert.equal(firepit.userData.coldStorageOnly, true);
  assert.equal(firepit.userData.operationApproved, false);
  assert.equal(firepit.userData.useClearanceSatisfied, false);
  assert.equal(firepit.userData.modelSelected, false);
  assert.equal(firepit.userData.localPortableClearanceFeet, 15);
  assert.ok(firepit.children.some((part) => part.name === 'Unlit portable firepit open bowl'));
  assert.ok(firepit.children.some((part) => part.name === 'Portable firepit closed cold-storage lid'));
  assert.equal(firepit.children.filter((part) => part.name === 'Portable firepit foot').length, 4);
  for (const part of firepit.children) {
    const minX = firepit.position.x + part.position.x - part.w / 2;
    const maxX = firepit.position.x + part.position.x + part.w / 2;
    const minZ = firepit.position.z + part.position.z - part.d / 2;
    const maxZ = firepit.position.z + part.position.z + part.d / 2;
    assert.ok(minX >= 38 && maxX <= 42 && minZ >= -17 && maxZ <= -13, 'Firepit is on its rear storage pad, not the front lawn or patio');
    assert.ok(part.position.y - part.h / 2 >= -1e-9, 'Feet rest on paving');
  }
  const rack = group.children.find((part) => part.name === 'Side-yard firewood rack beside waste bins - clearance review required');
  assert.equal(rack.userData.widthFeet, 8);
  assert.equal(rack.userData.depthFeet, 16 / 12);
  assert.equal(rack.userData.localStorageApprovalRequired, true);
  assert.equal(rack.userData.houseSeparationApproved, false);
  assert.ok(rack.position.z + 4.1 < 27.4, 'Rack stops north of the waste-bin pad');
  assert.ok((60.145 - rack.position.x - 0.75) * 12 >= 32, 'Roof does not reduce the paved passage below 32 inches locally');
  assert.ok((60.725 - rack.position.x - 0.75) * 12 >= 36, 'At least 36 inches to the modeled fence rail at the rack');
  const pad = group.children.find((part) => part.name === 'Firewood rack infill pad beside existing walkway');
  assert.ok(pad.position.x + pad.w / 2 <= 56.645, 'New pad stops at the existing walk instead of adding a coplanar overlapping slab');
  assert.ok(group.children.every((part) => part.position.z < 54.2), 'No firepit, rack or associated pads remain in the front yard');
  assert.equal(rack.children.filter((part) => part.name === 'Seasoned firewood placeholder').length, 112);
  assert.match(read('patio.html'), /Do not operate the firepit under (this|the patio) roof/);
});
