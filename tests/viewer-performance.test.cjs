'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

test('orbit events coalesce into one frame and synchronous draws cancel redundant queued work', () => {
  const callbacks = new Map();
  let nextId = 0, renders = 0;
  const context = {
    requestAnimationFrame(callback) { callbacks.set(++nextId, callback); return nextId; },
    cancelAnimationFrame(id) { callbacks.delete(id); },
    render() { renders++; }
  };
  vm.createContext(context);
  const start = source.indexOf('  let renderFrame = null;');
  vm.runInContext(source.slice(start, source.indexOf("  controls.addEventListener('change'", start)), context);
  for (let i = 0; i < 20; i++) context.requestRender();
  assert.equal(callbacks.size, 1);
  const callback = [...callbacks.values()][0];
  callbacks.clear();
  callback();
  assert.equal(renders, 1);
  context.requestRender();
  const renderStart = source.indexOf('  function render() {');
  vm.runInContext(`let pickTargets = [];\n${source.slice(renderStart, source.indexOf('    updateKitchenLighting();', renderStart))}}`, context);
  context.render();
  assert.equal(callbacks.size, 0, 'Immediate scene changes cancel a pending orbit render');
});

test('resize observer ignores identical and zero-size notifications', () => {
  const sizes = [], views = [];
  const context = {
    viewport: { clientWidth: 900, clientHeight: 700 },
    renderer: { setSize(width, height) { sizes.push([width, height]); } },
    navigationMode: 'rotate', currentView: 'living',
    setView(view) { views.push(view); }
  };
  vm.createContext(context);
  const start = source.indexOf('  let viewportWidth = 0, viewportHeight = 0;');
  vm.runInContext(source.slice(start, source.indexOf('  function renderInterior()', start)), context);
  context.resize();
  context.resize();
  assert.deepEqual(sizes, [[900, 700]]);
  assert.deepEqual(views, ['living']);
  context.viewport.clientWidth = 0;
  context.resize();
  context.viewport.clientWidth = 600;
  context.resize();
  assert.deepEqual(sizes, [[900, 700], [600, 700]]);
});

test('orbit interaction restores full-quality rendering after release', () => {
  const handlers = {}, frames = [];
  const states = [];
  const context = {
    controls: { addEventListener(name, callback) { handlers[name] = callback; } },
    window: { addEventListener() {} },
    requestAnimationFrame(callback) { frames.push(callback); return frames.length; },
    render() { states.push(context.interacting()); }
  };
  vm.createContext(context);
  const start = source.indexOf('  let renderFrame = null;');
  const end = source.indexOf('  function setNavigationMode(', start);
  vm.runInContext(source.slice(start, end) + '\nglobalThis.interacting = () => orbitInteracting;', context);
  handlers.start();
  handlers.change();
  frames.shift()();
  handlers.end();
  frames.shift()();
  assert.deepEqual(states, [true, false]);
  const renderBody = source.slice(source.indexOf('  function render() {'), source.indexOf('  function applyLivingLayout('));
  assert.match(renderBody, /!orbitInteracting\) renderInterior\(\)/);
});

test('high-DPI dragging reduces render pixels and restores native sharpness without repeated reallocations', () => {
  const start = source.indexOf('  function updateRenderResolution() {');
  const end = source.indexOf('  function requestRender()', start);
  for (const fullPixelRatio of [1, 1.25, 2]) {
    let ratio = fullPixelRatio;
    const changes = [];
    const context = {
      fullPixelRatio, orbitInteracting: false,
      renderer: { getPixelRatio() { return ratio; }, setPixelRatio(value) { changes.push(value); ratio = value; } }
    };
    vm.runInNewContext(source.slice(start, end), context);
    context.updateRenderResolution();
    assert.equal(changes.length, 0);
    context.orbitInteracting = true;
    for (let frame = 0; frame < 10; frame++) context.updateRenderResolution();
    assert.equal(ratio, 1);
    assert.equal(changes.length, fullPixelRatio === 1 ? 0 : 1);
    context.orbitInteracting = false;
    context.updateRenderResolution();
    context.updateRenderResolution();
    assert.equal(ratio, fullPixelRatio);
    assert.equal(changes.length, fullPixelRatio === 1 ? 0 : 2);
  }
});

test('saved layouts load concurrently, preserve floor association and expose each failing file', async () => {
  const start = source.indexOf('      [savedUpstairsLayout, savedGroundLayout] = await Promise.all(');
  const end = source.lastIndexOf('    }', source.indexOf('    const loader =', start));
  const code = `(async () => { let savedUpstairsLayout, savedGroundLayout; ${source.slice(start, end)} return [savedUpstairsLayout, savedGroundLayout]; })()`;
  const pending = new Map();
  const loaded = vm.runInNewContext(code, {
    fetch(file, options) {
      assert.equal(options.cache, 'no-store');
      return new Promise(resolve => pending.set(file, resolve));
    }
  });
  assert.equal(pending.size, 2);
  pending.get('ground-layout.json')({ ok: true, json: async () => ({ floor: 'ground' }) });
  pending.get('upstairs-layout.json')({ ok: true, json: async () => ({ floor: 'upstairs' }) });
  assert.deepEqual(JSON.parse(JSON.stringify(await loaded)), [{ floor: 'upstairs' }, { floor: 'ground' }]);
  for (const failed of ['ground-layout.json', 'upstairs-layout.json']) {
    await assert.rejects(vm.runInNewContext(code, {
      fetch: async file => ({ ok: file !== failed, status: 503, json: async () => ({}) })
    }), error => error.message.includes(`${failed} (503)`));
  }
});

test('picking traverses only visible meshes and reuses the list until the next render', () => {
  const shown = { visible: true, isMesh: true, children: [] };
  const hidden = { visible: false, children: [{ visible: true, isMesh: true, children: [] }] };
  const annotation = { visible: true, isMesh: false, children: [] };
  let scans = 0;
  const context = {
    scene: {
      traverseVisible(callback) {
        scans++;
        function visit(object) {
          if (!object.visible) return;
          callback(object);
          object.children.forEach(visit);
        }
        [shown, hidden, annotation].forEach(visit);
      }
    }
  };
  vm.createContext(context);
  const start = source.indexOf('  let pickTargets = null;');
  vm.runInContext(source.slice(start, source.indexOf('  function setPatioDoorOpen(', start)), context);
  const first = context.visiblePickTargets();
  assert.equal(first.length, 1);
  assert.equal(first[0], shown);
  assert.equal(context.visiblePickTargets(), first);
  assert.equal(scans, 1);
  hidden.visible = true;
  vm.runInContext('pickTargets = null;', context);
  assert.equal(context.visiblePickTargets().length, 2);
  assert.equal(scans, 2);
});

test('all exterior texture families begin loading concurrently', async () => {
  const pending = [], maps = {};
  const context = {
    textureLoader: { loadAsync() { return new Promise(resolve => pending.push(resolve)); } },
    masonryMaps: maps,
    document: { createElement() { return { getContext() { return { drawImage() {} }; } }; } },
    THREE: { CanvasTexture: class {}, SRGBColorSpace: 'sRGB', NoColorSpace: '', RepeatWrapping: 1000 }
  };
  const start = source.indexOf("    await Promise.all([['brick'");
  const end = source.indexOf('    const { RGBELoader }', start);
  const loaded = vm.runInNewContext(`(async () => { ${source.slice(start, end)} })()`, context);
  assert.equal(pending.length, 15, 'Five families of three textures must not form a serial waterfall');
  for (const resolve of pending) resolve({ image: { width: 1024, height: 1024 }, dispose() {} });
  await loaded;
  assert.deepEqual(Object.keys(maps).sort(), ['brick', 'grass', 'oak', 'roof', 'stone']);
});
