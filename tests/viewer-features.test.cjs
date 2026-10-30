'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const read = (file) => fs.readFileSync(require.resolve(`../${file}`), 'utf8');

test('compact footer keeps windows first, area, size and controls without verbose visible text', () => {
  const footer = read('floor-plan-3d.html').split('<div class="model-footer">')[1].split('</div>')[0];
  assert.doesNotMatch(footer, /Furnished concept|legend-dot/);
  for (const id of ['livable-area', 'first-floor-area', 'second-floor-area', 'building-envelope', 'window-count', 'refresh-model', 'reset-view']) assert.ok(footer.includes(`id="${id}"`));
  assert.match(footer, /id="first-floor-area" aria-label="First-floor area"[^>]*>1st: \.\.\.<\/output>/);
  assert.match(footer, /id="second-floor-area" aria-label="Second-floor area"[^>]*>2nd: \.\.\.<\/output>/);
  assert.match(footer, /Size: ~56 ft &times; 64 ft/);
  assert.match(footer, /front porch slab edge z=61\.67917 ft, approximately 64 ft 0\.05 in/);
  assert.match(footer, /exactly 55 ft 11 3\/8 in \(shown rounded to 56 ft\)/);
  assert.match(footer, /not a surveyed or Birmingham zoning\/buildable envelope/i);
  assert.ok(footer.indexOf('id="window-count"') < footer.indexOf('id="livable-area"'));
  const visible = footer.replace(/<[^>]*>/g, '');
  assert.doesNotMatch(visible, /modeled|zoning|calculating|First floor|Second floor|openings|units/);
  assert.ok(visible.length < 100);
  assert.doesNotMatch(read('floor-plan-3d.js'), /querySelector\('\.model-footer span'\)/);
});

test('viewer uses concise controls and collapses dimension explanations without hiding plan labels', () => {
  const html = read('floor-plan-3d.html');
  const labels = [
    ['show-floor-grid', 'Grid'], ['show-furniture', 'Furniture'],
    ['toggle-night-lighting', 'Night'], ['show-room-dimensions', 'Dimensions']
  ];
  for (const [id, label] of labels) assert.match(html, new RegExp(`id="${id}"[^>]*> ${label}</label>`));
  const panel = html.split('<section id="plan-dimensions"')[1].split('</section>')[0];
  assert.match(panel, /<details>\s*<summary id="plan-dimensions-title">Sizes<\/summary>/);
  assert.match(panel, /<ul id="plan-dimension-list"/);
  assert.doesNotMatch(panel, /<details[^>]*\bopen\b/);
  assert.ok(html.indexOf('id="plan-dimension-labels"') < html.indexOf('<section id="plan-dimensions"'));
  assert.match(read('floor-plan-3d.js'), /notesButton.textContent = 'Notes'/);
});

test('2D room dimensions identify garage maximum extents and explain adjacent room widths', () => {
  const html = read('floor-plan-3d.html');
  assert.match(html, /garage label gives maximum extents of its outlined L-shaped floor/i);
  assert.match(html, /porch spans x=0-31\.2 ft at z=54\.679-61\.679 ft/i);
  assert.match(html, /garage floor spans x=31\.2-55\.5 ft at z=15-49 ft/i);
  assert.match(html, /they are separated north-south and do not touch/i);
  assert.match(html, /plan's centerline span is 55 ft 6 in/i);
  assert.match(html, /narrower north leg shown in orange/i);
  assert.match(html, /id="plan-garage-outline"/);
  assert.match(html, /footer gives the larger outside-face overall dimensions/i);
  const { getGroundFloorDefaultPlan } = require('../floor-plan-ground.js');
  const plan = getGroundFloorDefaultPlan();
  const garage = plan.rooms.find(room => room.name === 'Garage');
  assert.equal(garage.x, 31.2);
  assert.ok(Math.abs(garage.x + garage.w - 55.5) < 1e-9);
  assert.ok(Math.abs(garage.w - 24.3) < 1e-9);
  const garageFloors = plan.floors.filter(floor => floor.room === 'Garage');
  assert.equal(garageFloors.length, 3);
  assert.equal(Math.min(...garageFloors.map(floor => floor.x)), 31.2);
  assert.equal(Math.max(...garageFloors.map(floor => floor.x + floor.w)), 55.5);
  assert.equal(garageFloors.some(floor => floor.x < 40 && floor.x + floor.w > 40 && floor.z < 20 && floor.z + floor.d > 20), false, 'The bounding-box corner is not garage floor');
});

test('whole-house window count separates fixed roof windows from wall casements and pictures', () => {
  const source = read('floor-plan-3d.js');
  assert.match(source, /filter\(window => window\.roofWindow\)/);
  assert.match(source, /units - pictures - singleHung - roofWindows/);
  assert.match(source, /\$\{roofWindows\} fixed roof windows/);
  const exterior = read('floor-plan-exterior.js');
  assert.match(exterior, /roofWindow: true/);
  assert.match(exterior, /windowInstallations\.push\(\{[\s\S]*?roofWindow: true/);
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
  assert.match(source, /'guest-bathroom': \{ target: \[28\.45, 1\.5, 39\.4\], offset: \[0\.2, 14, 1\], span: 11 \}/);
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
  assert.match(read('floor-plan-3d.html'), /data-view="top"[^>]*>2D</);
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
  for (const file of ['upstairs-layout.json', 'ground-layout.json']) assert.ok(source.includes(`'${file}'`));
  assert.match(source, /fetch\(file, \{ cache: 'no-store' \}\)/);
  for (const control of ['show-floor-grid', 'data-navigation="walk"', 'data-view="upstairs"', 'data-view="exterior"']) assert.ok(html.includes(control));
  for (const id of ['ground-preview-status', 'upstairs-preview-status', 'firepit-storage-note']) assert.match(html, new RegExp(`id="${id}"[^>]*hidden`));
  assert.ok(source.includes("!['exterior-patio', 'exterior-firepit', 'exterior-wood'].includes(name)"));
});

test('furniture checkbox hides and restores only tagged loose furniture', () => {
  const html = read('floor-plan-3d.html');
  const source = read('floor-plan-3d.js');
  assert.match(html, /id="show-furniture" checked disabled> Furniture<\/label>/);
  const input = {
    checked: false,
    disabled: true,
    addEventListener(name, callback) { assert.equal(name, 'change'); this.change = callback; }
  };
  const layer = () => ({ contents: { visible: true } });
  const nested = [{ visible: true }, { visible: true }];
  const upstairs = [{ visible: true }, { visible: true }];
  const exterior = [{ visible: true }];
  let renders = 0;
  const context = {
    furnitureInput: input,
    groundFurnitureLayer: layer(),
    roomFurnitureLayer: layer(),
    nestedFurniture: nested,
    upstairsFurniture: upstairs,
    exteriorFurniture: exterior,
    render() { renders++; }
  };
  const start = source.indexOf('  furnitureInput.disabled = false;');
  const end = source.indexOf('\n  });', start) + '\n  });'.length;
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  assert.equal(input.disabled, false);
  input.change();
  assert.equal(context.groundFurnitureLayer.contents.visible, false);
  assert.equal(context.roomFurnitureLayer.contents.visible, false);
  assert.ok(nested.every((object) => !object.visible));
  assert.ok(upstairs.every((object) => !object.visible));
  assert.ok(exterior.every((object) => !object.visible));
  input.checked = true;
  input.change();
  assert.equal(context.groundFurnitureLayer.contents.visible, true);
  assert.equal(context.roomFurnitureLayer.contents.visible, true);
  assert.ok(nested.every((object) => object.visible));
  assert.ok(upstairs.every((object) => object.visible));
  assert.ok(exterior.every((object) => object.visible));
  assert.equal(renders, 2);
  assert.match(source, /if \(object !== root && object\.userData\.viewerFurniture\)/);
});

test('model refresh reloads fresh files into Whole floor and Rotate by default', () => {
  const html = read('floor-plan-3d.html');
  const source = read('floor-plan-3d.js');
  assert.match(html, /id="refresh-model"[^>]*>Refresh<\/button>/);
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

test('floor-plan archive preserves both revisions and marks the shower option as not adopted', () => {
  const source = read('floor-plan-3d.js');
  const archive = read('floor-plan-design.html');
  for (const image of ['revision-1-ground.png', 'revision-1-upstairs.png', 'revision-2-ground.png', 'revision-2-upstairs.png']) {
    assert.ok(archive.includes(`assets/${image}`), `${image} is archived`);
  }
  assert.ok(archive.includes('Revision 2 — not adopted'));
  assert.ok(archive.includes('href="floor-plan-3d.html">Open the current 3D model</a>'));
  const element = () => ({
    children: [], style: {}, hidden: true,
    append(...items) { this.children.push(...items); },
    replaceChildren() { this.children = []; }
  });

  const elements = Object.fromEntries(['show-room-dimensions', 'plan-dimension-labels', 'plan-garage-outline', 'plan-dimensions', 'plan-dimension-list'].map((id) => [id, element()]));
  elements['plan-garage-outline'].append(element(), element());
  elements['show-room-dimensions'].addEventListener = () => {};
  for (const outline of elements['plan-garage-outline'].children) {
    outline.setAttribute = function (name, value) { this[name] = value; };
  }
  elements['plan-garage-outline'].setAttribute = function (name, value) { this[name] = value; };
  const { getGroundFloorDefaultPlan } = require('../floor-plan-ground.js');
  const scope = {};
  vm.runInNewContext(read('floor-plan-upstairs.js'), scope);
  const upstairsPlan = require('../upstairs-layout.js').resolve(
    scope.getUpstairsDefaultPlan(require('../upstairs-layout.js').stairOpening()),
    require('../upstairs-layout.js').empty()
  );
  const context = {
    document: { getElementById: (id) => elements[id], createElement: element },
    currentView: 'top', activeFloor: 'ground', groundBaseline: getGroundFloorDefaultPlan(),
    getUpstairsRoomClearDimensions: scope.getUpstairsRoomClearDimensions,
    upstairs: { rooms: upstairsPlan.rooms, plan: upstairsPlan },
    viewport: { clientWidth: 960, clientHeight: 720 },
    camera: { left: -36, right: 36, top: 36, bottom: -36, zoom: 1 },
    stairFloorToFloor: 10,
    THREE: { Vector3: class {
      constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
      project() { return this; }
    } }
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
    context.positionPlanDimensions();
    assert.equal(elements['plan-garage-outline'].hidden, floor !== 'ground');
    if (floor === 'ground') {
      const outline = elements['plan-garage-outline'].children[0].d;
      assert.match(outline, /^M/);
      assert.ok(outline.length > 100, 'Garage outline traces the actual stepped floor boundary');
      assert.equal(elements['plan-garage-outline'].children[1].d, outline);
    }
    rooms.forEach((room, index) => {
      const label = elements['plan-dimension-labels'].children[index];
      const fontSize = Number.parseFloat(label.style.fontSize);
      assert.ok(fontSize > 0 && fontSize <= 10, 'Plan text remains small on both floors');
      assert.equal(label.children.length, 2, 'Only a short name and dimension appear on the plan');
      assert.equal(label.children[0].textContent, context.planRoomName(room.name));
      const clear = floor === 'upstairs' ? scope.getUpstairsRoomClearDimensions(room, upstairsPlan.walls) : room;
      const maxExtent = floor === 'ground' && room.name === 'Garage';
      const size = floor === 'ground' && room.name === 'Kids room' ? '127.67 sq ft, stepped plan; west edge to z37.2, east edge to z33.6' : `${context.feet(clear.w)} x ${context.feet(clear.d)}${floor === 'upstairs' ? ' paint-face' : ''}${maxExtent ? ' max extents; L-shaped footprint' : ''}`;
      assert.equal(elements['plan-dimension-list'].children[index].textContent, `${room.name}: ~ ${size}`);
      assert.equal(label.title, `${room.name}: ${size}`, 'Detailed names and qualifications remain available');
      assert.doesNotMatch(label.children[1].textContent, /paint-face|stepped|edge|to z/);
      const compact = floor === 'ground' && room.name === 'Kids room' ? '127.67 sq ft'
        : `${context.feet(clear.w)} x ${context.feet(clear.d)}${maxExtent ? ' max' : ''}`.replace(/' /g, "'").replace(/'0"/g, "'");
      assert.equal(label.children[1].textContent, compact);
      if (floor === 'upstairs' && room.name === 'Bedroom 2') {
        assert.equal(label.children[1].textContent, '13\' x 12\'6"', 'Whole feet omit zero inches without losing the dimension separator');
      }
    });
  }
  for (const [full, short] of [
    ['Primary bedroom', 'Primary'], ['Primary closet', 'P. closet'],
    ['Bedroom 2', 'Bed 2'], ['Bedroom 2 bath', 'Bath 2'],
    ['Bedroom 4 closet', 'Closet 4'], ['Shared bath west', 'Bath W'],
    ['Laundry (relocated)', 'Laundry'], ['Mechanical (relocated)', 'Mech.'],
    ['Guest coat closet', 'Coats'], ['Saved room', 'Saved room']
  ]) assert.equal(context.planRoomName(full), short);
  for (const zoom of [0.01, 8]) {
    context.camera.zoom = zoom;
    context.positionPlanDimensions();
    for (const label of elements['plan-dimension-labels'].children) {
      const fontSize = Number.parseFloat(label.style.fontSize);
      assert.ok(fontSize >= 1 && fontSize <= 10, 'Zoom never creates negative or oversized label fonts');
    }
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
  assert.match(source, /roomDimensionsInput.checked = initialParameters.get\('dimensions'\) !== '0'/);
  const renderBody = source.slice(source.indexOf('  function render() {'), source.indexOf('  function applyLivingLayout('));
  assert.match(renderBody, /updateVehicleDoorControls\(\);\s+positionPlanDimensions\(\)/);
});

test('2D dimensions default on and explicit URL choices survive toggle and reload', () => {
  const source = read('floor-plan-3d.js');
  assert.match(read('floor-plan-3d.html'), /id="show-room-dimensions" checked disabled/);
  const initialization = source.split('\n').find(line => line.includes('roomDimensionsInput.checked = initialParameters'));
  assert.ok(initialization);
  for (const [query, expected] of [['', true], ['dimensions=1', true], ['dimensions=0', false]]) {
    const input = {};
    vm.runInNewContext(initialization, { roomDimensionsInput: input, initialParameters: new URLSearchParams(query) });
    assert.equal(input.checked, expected, query || 'No parameter defaults on');
  }
  let change;
  let updates = 0, renders = 0;
  const input = { checked: true, addEventListener(event, callback) { assert.equal(event, 'change'); change = callback; } };
  const location = { href: 'http://localhost/floor-plan-3d.html?view=top&keep=1' };
  const context = {
    URL, roomDimensionsInput: input, currentView: 'upstairs-top',
    updatePlanDimensions() { updates++; }, render() { renders++; },
    window: { location, history: { replaceState(state, title, url) { location.href = url.href; } } }
  };
  const start = source.indexOf("  roomDimensionsInput.addEventListener('change'");
  const end = source.indexOf('\n  });', start) + '\n  });'.length;
  assert.ok(start > 0 && end > start);
  vm.runInNewContext(source.slice(start, end), context);
  for (const checked of [false, true]) {
    input.checked = checked;
    change();
    const parameters = new URL(location.href).searchParams;
    assert.equal(parameters.get('dimensions'), checked ? '1' : '0');
    assert.equal(parameters.get('view'), 'upstairs-top');
    assert.equal(parameters.get('keep'), '1');
    const reloaded = {};
    vm.runInNewContext(initialization, { roomDimensionsInput: reloaded, initialParameters: parameters });
    assert.equal(reloaded.checked, checked);
  }
  assert.equal(updates, 2);
  assert.equal(renders, 2);
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

test('firepit moves to uncovered patio cold storage and the wood rack stays beside the waste bins', () => {
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
    THREE: { Group, Mesh, CylinderGeometry }, group, dark: {}, stepStone: {}, wood: {}, patioGrade: -1.625, livingTerraceRear: -4.325,
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
  const firepit = group.children.find((part) => part.name === 'Portable firepit - uncovered patio cold storage only');
  assert.equal(firepit.position.x, -3.5);
  assert.equal(firepit.position.y, -1.625);
  assert.ok(Math.abs(firepit.position.z + 2.325) < 1e-9);
  assert.ok(!group.children.some((part) => part.name === 'Rear firepit cold-storage pad, not a burn area'));
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
    assert.ok(minX > -5.855 && maxX < 0 && minZ > -4.325 && maxZ < -0.325, 'Entire firepit fits the flat uncovered patio corner, clear of the roof, graded strip and terrace edge');
    assert.ok(part.position.y - part.h / 2 >= -1e-9, 'Feet rest on paving');
  }
  const rack = group.children.find((part) => part.name === 'Side-yard firewood rack beside waste bins - clearance review required');
  assert.equal(rack.userData.widthFeet, 8);
  assert.equal(rack.userData.depthFeet, 16 / 12);
  assert.equal(rack.userData.localStorageApprovalRequired, true);
  assert.equal(rack.userData.houseSeparationApproved, false);
  assert.ok(rack.position.z + 4.1 < 27.4, 'Rack stops north of the waste-bin pad');
  assert.ok((61.725 - rack.position.x - 0.75) * 12 >= 51.9 - 1e-8, 'Full-strip paving extends to the current rail face');
  const pad = group.children.find((part) => part.name === 'Firewood rack infill pad beside existing walkway');
  assert.equal(pad, undefined, 'Continuous east paving replaces the former rack infill pad');
  assert.ok(group.children.every((part) => part.position.z < 54.2), 'No firepit, rack or associated pads remain in the front yard');
  assert.equal(rack.children.filter((part) => part.name === 'Seasoned firewood placeholder').length, 112);
  assert.match(read('patio.html'), /Do not operate the firepit under (this|the patio) roof/);
});
