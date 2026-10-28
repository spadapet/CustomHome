'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

test('mudroom and kitchen lighting stay scoped and restore other floor/view settings', () => {
  class Light {
    constructor(color, intensity, distance, angle, penumbra, decay) {
      Object.assign(this, { color, intensity, distance, angle, penumbra, decay });
      this.position = { set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.target = { position: { set(x, y, z) { Object.assign(this, { x, y, z }); } } };
      this.shadow = { camera: {}, mapSize: { set(width, height) { Object.assign(this, { width, height }); } } };
    }
  }
  const context = {
    THREE: { AmbientLight: Light, PointLight: Light, SpotLight: Light, DirectionalLight: Light, VSMShadowMap: 'VSM', PCFSoftShadowMap: 'PCFSoft' },
    scene: { add() {}, updateMatrixWorld() {} }, renderer: { shadowMap: { enabled: false } },
    activeFloor: 'ground', currentView: 'mudroom', nightLighting: true, renderFrame: null, pickTargets: null,
    exteriorSun: { visible: false },
    indoorBackground: {}, outdoorSky: {}, outdoorReflection: { texture: {} },
    updateKitchenLighting() {}, updateHomeLighting() {}, updateStairLighting() {}, updateExteriorLighting() {}
  };
  const start = source.indexOf('  const ambientLight =');
  const end = source.indexOf('  const mat =', start);
  const renderStart = source.indexOf('  function render() {');
  const renderEnd = source.indexOf('    updateVehicleDoorControls();', renderStart);
  assert.ok(start >= 0 && end > start && renderStart >= 0 && renderEnd > renderStart);
  vm.runInNewContext(source.slice(start, end) + source.slice(renderStart, renderEnd) + '}\nglobalThis.lights = { ambientLight, mudroomKeyLight, kitchenKeyLight, studioFill };', context);
  const { ambientLight, mudroomKeyLight, kitchenKeyLight, studioFill } = context.lights;
  assert.equal(mudroomKeyLight.color, '#fff3e3');
  assert.equal(mudroomKeyLight.intensity, 120);
  assert.equal(mudroomKeyLight.shadow.radius, 4);
  assert.equal(mudroomKeyLight.shadow.blurSamples, 12);
  assert.equal(mudroomKeyLight.castShadow, true);
  assert.equal(mudroomKeyLight.shadow.mapSize.width, 2048);
  assert.ok(mudroomKeyLight.penumbra >= 0.5);
  assert.ok(mudroomKeyLight.position.y < 9, 'Key light is inside the room, below the nominal ceiling');
  for (const night of [true, false]) for (const [floor, view, enabled] of [
    ['ground', 'mudroom', true], ['ground', 'mudroom-cubbies', true], ['ground', 'mudroom-storage', true],
    ['ground', 'kitchen', false], ['ground', 'prep-counter', false], ['ground', 'prep-kitchen', false], ['ground', 'pantry', false],
    ['ground', 'sink-storage', false], ['ground', 'cooktop', false], ['ground', 'island', false], ['ground', 'fridge', false],
    ['ground', 'whole', false], ['ground', 'top', false],
    ['ground', 'walk', false], ['upstairs', 'walk', false], ['ground', 'living', false],
    ['upstairs', 'kitchen', false], ['upstairs', 'upstairs', false], ['upstairs', 'top', false],
    ['ground', 'mudroom-cubbies', true], ['exterior', 'exterior', false]
  ]) {
    context.activeFloor = floor;
    context.currentView = view;
    context.nightLighting = night;
    context.render();
    assert.equal(context.exteriorSun.visible, floor === 'exterior' && !night);
    assert.equal(context.scene.environment, floor === 'exterior' && !night ? context.outdoorReflection.texture : null);
    assert.equal(context.scene.background, floor === 'exterior' && !night ? context.outdoorSky : context.indoorBackground);
    assert.equal(mudroomKeyLight.visible, enabled, view);
    const kitchenLighting = floor === 'ground' && ['kitchen', 'prep-counter', 'prep-kitchen', 'pantry', 'sink-storage', 'cooktop', 'island', 'fridge'].includes(view);
    assert.equal(kitchenKeyLight.visible, kitchenLighting, view);
    assert.equal(context.renderer.shadowMap.enabled, enabled || floor === 'exterior' && !night, view);
    assert.equal(ambientLight.intensity, floor === 'exterior' && !night ? 0.55 : night ? 0.5 : 2.5, view);
    assert.equal(studioFill.intensity, floor === 'exterior' && !night ? 0 : night ? 250 : 650, view);
    assert.equal(context.renderer.toneMappingExposure, floor === 'exterior' && !night ? 0.95 : night ? 0.75 : 1.25, view);
    assert.equal(context.renderer.shadowMap.type, enabled ? 'VSM' : 'PCFSoft', view);
    if (kitchenLighting) {
      const prep = ['prep-counter', 'prep-kitchen', 'pantry'].includes(view);
      assert.equal(kitchenKeyLight.position.x, prep ? 40.5 : 29);
      assert.equal(kitchenKeyLight.target.position.x, prep ? 48.5 : 35);
      assert.notEqual(kitchenKeyLight.castShadow, true, 'Use soft screen-space contact shading rather than harsh cast silhouettes');
      assert.ok(kitchenKeyLight.position.y < 9);
    }
  }
});

test('menu lighting toggle defaults to Night and changes only lighting state', () => {
  const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
  assert.match(html, /id="toggle-night-lighting" aria-pressed="true"[^>]*disabled>Night lighting<\/button>/);
  assert.match(source, /let nightLighting = true;/);
  let click;
  let renders = 0;
  const button = { disabled: true, addEventListener(event, callback) { assert.equal(event, 'click'); click = callback; }, setAttribute(name, value) { this[name] = value; } };
  const input = { checked: true };
  const context = { nightLightingButton: button, islandLightsInput: input, render() { renders++; } };
  const start = source.indexOf('  nightLightingButton.disabled = false;');
  const end = source.indexOf('\n  });', start) + '\n  });'.length;
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext('let nightLighting = true;\nlet daytimeIslandLights = false;\n' + source.slice(start, end), context);
  assert.equal(button.disabled, false);
  click();
  assert.equal(button['aria-pressed'], 'false');
  assert.equal(button.textContent, 'Day lighting');
  assert.equal(input.checked, false);
  click();
  assert.equal(button['aria-pressed'], 'true');
  assert.equal(button.textContent, 'Night lighting');
  assert.equal(input.checked, true);
  assert.equal(renders, 2);
});

test('prep inspection shows more worktop without changing the quartz finish', () => {
  const preset = source.match(/^    'prep-counter': (.+),$/m);
  assert.ok(preset);
  const view = vm.runInNewContext(`(${preset[1]})`, { prepCounterZ: 8.25 });
  assert.deepEqual(Array.from(view.target), [46.6, 4.5, 8.25]);
  assert.deepEqual(Array.from(view.offset), [0, 1.2, 2.6]);
  assert.equal(view.span, 14);
  const formerTopVisibility = 0.4 / Math.hypot(0.4, 2.6);
  const currentTopVisibility = view.offset[1] / Math.hypot(view.offset[1], view.offset[2]);
  assert.ok(currentTopVisibility > 2.5 * formerTopVisibility, 'The downward angle shows substantially more of the horizontal worktop');
  assert.match(source, /const countertop = new THREE\.MeshPhysicalMaterial\(\{ map: quartzTexture\(\), roughness: 0\.48, metalness: 0, clearcoat: 0\.1, clearcoatRoughness: 0\.5 \}\)/);
  assert.match(source, /function quartzTexture\(baseColor = '#c8b99d', veinColor = 'rgba\(133, 124, 109, 0\.3\)'\)/);
});

test('interior contact shading reuses its composer and follows camera projection and viewport changes', () => {
  class Composer {
    constructor() { this.passes = []; this.renders = 0; this.renderTarget1 = {}; this.renderTarget2 = {}; }
    addPass(pass) { this.passes.push(pass); }
    setSize(width, height) { this.size = [width, height]; this.resizes = (this.resizes ?? 0) + 1; }
    render() { this.renders++; }
  }
  class Pass {
    constructor(scene, camera) {
      Object.assign(this, { scene, camera });
      const matrix = () => ({ value: { copy(value) { this.copied = value; } } });
      this.ssaoMaterial = { defines: {}, uniforms: { cameraNear: {}, cameraFar: {}, cameraProjectionMatrix: matrix(), cameraInverseProjectionMatrix: matrix() } };
    }
  }
  const context = {
    EffectComposer: Composer, RenderPass: Pass, SSAOPass: Pass, OutputPass: Pass,
    renderer: { capabilities: { maxSamples: 8 } }, scene: {}, camera: { isPerspectiveCamera: false, near: 0.1, far: 500, projectionMatrix: {}, projectionMatrixInverse: {} },
    viewport: { clientWidth: 900, clientHeight: 700 }
  };
  const start = source.indexOf('  function renderInterior() {');
  const end = source.indexOf('  function render() {', start);
  vm.runInNewContext('let interiorPost = null;\n' + source.slice(start, end) + '\nglobalThis.post = () => interiorPost;', context);
  context.renderInterior();
  const first = context.post();
  assert.equal(first.composer.passes.length, 3, 'SSAO blends over scene color from the required beauty pass');
  assert.equal(first.composer.renderTarget1.samples, 4);
  assert.equal(first.composer.renderTarget2.samples, 4);
  assert.equal(first.occlusion.kernelRadius, 0.35, 'Contact shading radius is in modeled feet');
  assert.equal(first.occlusion.ssaoMaterial.defines.PERSPECTIVE_CAMERA, 0);
  assert.equal(first.occlusion.ssaoMaterial.uniforms.cameraFar.value, 500);
  assert.deepEqual(first.composer.size, [900, 700]);
  context.camera = { isPerspectiveCamera: true, near: 0.2, far: 300, projectionMatrix: {}, projectionMatrixInverse: {} };
  context.viewport.clientWidth = 600;
  context.renderInterior();
  assert.equal(context.post(), first, 'No new composer or targets are created for every frame');
  assert.equal(first.beauty.camera, context.camera);
  assert.equal(first.occlusion.camera, context.camera);
  assert.equal(first.occlusion.ssaoMaterial.defines.PERSPECTIVE_CAMERA, 1);
  assert.equal(first.occlusion.ssaoMaterial.uniforms.cameraNear.value, 0.2);
  assert.deepEqual(first.composer.size, [600, 700]);
  assert.equal(first.composer.renders, 2);
  assert.equal(first.composer.resizes, 2);
  context.renderInterior();
  assert.equal(first.composer.resizes, 2, 'Unchanged viewport must not reallocate post-processing targets');
  assert.equal(first.occlusion.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copied, context.camera.projectionMatrix);
  assert.equal(first.occlusion.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copied, context.camera.projectionMatrixInverse);
  assert.match(source, /if \(\(mudroomLighting \|\| kitchenLighting\) && !orbitInteracting\) renderInterior\(\);\s+else renderer\.render\(scene, camera\);/);
});

function buildMudroom() {
  class Group {
    constructor() {
      this.children = [];
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = { x: 0, y: 0, z: 0 };
      this.scale = { x: 1, y: 1, z: 1, setScalar(value) { this.x = this.y = this.z = value; } };
      this.userData = {};
    }
    add(child) { child.parent = this; this.children.push(child); }
    traverse(callback) { callback(this); this.children.forEach((child) => child.traverse(callback)); }
  }
  const roots = [];
  class Mesh extends Group {
    constructor(geometry, material) {
      super();
      Object.assign(this, { geometry, material });
      if (geometry.bounds) {
        const { min, max } = geometry.bounds;
        Object.assign(this, { w: max[0] - min[0], h: max[1] - min[1], d: max[2] - min[2] });
        this.position.set(...min.map((value, axis) => (value + max[axis]) / 2));
      }
    }
  }
  class Shape {
    constructor() { this.points = []; }
    moveTo(x, y) { this.points.push([x, y]); }
    lineTo(x, y) { this.points.push([x, y]); }
    closePath() {}
  }
  class ExtrudeGeometry {
    constructor(shape, options) {
      this.bounds = {
        min: [Math.min(...shape.points.map(([x]) => x)) - options.bevelSize, Math.min(...shape.points.map(([, y]) => y)) - options.bevelSize, -options.bevelThickness],
        max: [Math.max(...shape.points.map(([x]) => x)) + options.bevelSize, Math.max(...shape.points.map(([, y]) => y)) + options.bevelSize, options.depth + options.bevelThickness]
      };
    }
    computeBoundingBox() { this.boundingBox = { min: { y: this.bounds.min[1] }, max: { y: this.bounds.max[1] } }; }
    translate(x, y, z) { for (const key of ['min', 'max']) this.bounds[key] = this.bounds[key].map((value, axis) => value + [x, y, z][axis]); }
    scale(x, y, z) { for (const key of ['min', 'max']) this.bounds[key] = this.bounds[key].map((value, axis) => value * [x, y, z][axis]); }
  }
  const footwearTemplate = (kind) => ({
    clone() {
      const group = new Group();
      const part = new Group();
      Object.assign(part, kind === 'shoe' ? { w: 4.471 / 12, h: 5.911 / 12, d: 11.5 / 12 } : { w: 3.43 / 12, h: 14 / 12, d: 10 / 12 });
      part.position.y = part.h / 2;
      group.add(part);
      group.userData = { asset: kind === 'shoe' ? 'assets/models/khronos/MaterialsVariantsShoe.glb' : 'assets/models/poly-haven/rubber_boots/rubber_boots_1k.gltf', uniformScale: true };
      return group;
    }
  });
  const context = {
    THREE: {
      Group, Mesh, Shape, ExtrudeGeometry,
      DataTexture: class {
        constructor(data, width, height) { this.image = { data, width, height }; this.repeat = { set(x, y) { Object.assign(this, { x, y }); } }; }
      },
      PMREMGenerator: class {
        fromScene() { return { texture: { name: 'Local room reflections' } }; }
        dispose() {}
      },
      RepeatWrapping: 'repeat', LinearMipmapLinearFilter: 'mipmaps', LinearFilter: 'linear',
      SphereGeometry: class { constructor(radius) { this.bounds = { min: [-radius, 0, -radius], max: [radius, radius, radius] }; } },
      CanvasTexture: class { constructor(image) { this.image = image; } },
      PlaneGeometry: class { constructor(width, height) { this.parameters = { width, height }; } },
      MeshBasicMaterial: class { constructor(options) { Object.assign(this, options); } }
    }, ceilingHeight: 9, renderer: {},
    RoomEnvironment: class { dispose() {} },
    mudroomAssets: { shoe: footwearTemplate('shoe'), bootLeft: footwearTemplate('boot'), bootRight: footwearTemplate('boot') },
    document: {
      createElement() {
        const context = { fills: [], texts: [], fillRect() { this.fills.push(this.fillStyle); }, fillText(text) { this.texts.push({ text, font: this.font, color: this.fillStyle }); } };
        return { context, getContext() { return context; } };
      }
    },
    ...Object.fromEntries(['cabinetFinish', 'cabinetRailFinish', 'cabinetPanelFinish', 'cream', 'brass', 'porcelain', 'steel', 'black', 'linen', 'countertop', 'mudTileFinish', 'mudGroutFinish'].map((name) => [name, { name, clone() { return { ...this }; } }])),
    rest: new Group(), garageEntry: { x: 38, z: 26.725, width: 3, height: 8 },
    furnishing(name, x, z, rotation = 0) {
      const group = new Group();
      group.name = name;
      group.position.set(x, 0, z);
      group.rotation.y = rotation;
      roots.push(group);
      return group;
    },
    box(parent, x, y, z, w, h, d, material) {
      assert.ok(material, 'Mudroom parts use defined materials');
      const mesh = new Group();
      Object.assign(mesh, { w, h, d, material });
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    },
    cylinder(parent, x, y, z, radius, height, material) {
      return context.box(parent, x, y, z, radius * 2, height, radius * 2, material);
    },
    mat(color, roughness) { return { color, roughness }; }
  };
  // Reuse the real front/pull geometry, including its projection into the aisle.
  context.windowTrim = { name: 'White interior window trim', color: '#faf9f5' };
  vm.runInNewContext(source.slice(source.indexOf('  function singlePanelDoor('), source.indexOf('  function cabinetCupPull(')), context);
  vm.runInNewContext(source.slice(source.indexOf('  function tiledFloor('), source.indexOf("  const stairs = furnishing(")), context);
  const start = source.indexOf("  tiledFloor('Mudroom tile'");
  const end = source.indexOf('  const epoxy', start);
  assert.ok(start >= 0 && end > start, 'Locate the complete mudroom furnishings');
  vm.runInNewContext(source.slice(start, end), context);
  const descendants = (node) => [node, ...node.children.flatMap(descendants)];
  const all = roots.flatMap(descendants);
  return { roots, all, floorParts: context.rest.children, shared: { brass: context.brass, cabinetFinish: context.cabinetFinish }, find: (name) => all.filter((item) => item.name === name) };
}

function bounds(root) {
  const result = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  function visit(node) {
    if (node.w !== undefined) {
      for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) {
        let [x, y, z] = [dx * node.w / 2, dy * node.h / 2, dz * node.d / 2];
        for (let current = node; current; current = current.parent) {
          const r = current.rotation;
          x *= current.scale.x;
          y *= current.scale.y;
          z *= current.scale.z;
          [x, y] = [x * Math.cos(r.z) - y * Math.sin(r.z), x * Math.sin(r.z) + y * Math.cos(r.z)];
          [x, z] = [x * Math.cos(r.y) + z * Math.sin(r.y), -x * Math.sin(r.y) + z * Math.cos(r.y)];
          [y, z] = [y * Math.cos(r.x) - z * Math.sin(r.x), y * Math.sin(r.x) + z * Math.cos(r.x)];
          x += current.position.x;
          y += current.position.y;
          z += current.position.z;
        }
        [x, y, z].forEach((value, axis) => {
          result.min[axis] = Math.min(result.min[axis], value);
          result.max[axis] = Math.max(result.max[axis], value);
        });
      }
    }
    node.children.forEach(visit);
  }
  visit(root);
  return result;
}

function boxParts(model, root) {
  return model.all.filter((part) => {
    if (part.w === undefined) return false;
    for (let node = part; node; node = node.parent) if (node === root) return true;
    return false;
  });
}

test('five backed cubbies have side-panel hooks and unobstructed floor-level large-shoe openings', () => {
  const model = buildMudroom();
  const cubbies = model.find('Mudroom family cubby');
  assert.equal(cubbies.length, 5);
  assert.equal(model.find('Mudroom gold coat hook').length, 16);
  for (const cubby of cubbies) {
    const hooks = cubby.children.filter((part) => part.name === 'Mudroom gold coat hook');
    assert.equal(hooks.length, ['Peter', 'Lila'].includes(cubby.userData.owner) ? 2 : 4);
    assert.equal(hooks.filter((hook) => hook.position.y === 5.55).length, 2);
    assert.equal(hooks.filter((hook) => hook.position.y === 4.2).length, ['Peter', 'Lila'].includes(cubby.userData.owner) ? 0 : 2);
    assert.equal(cubby.children.filter((part) => part.name === 'Open cubby shoe shelf').length, 0, 'No shelf lip or intermediate shelf obstructs kicking shoes in');
    for (const hook of cubby.children.filter((part) => part.name === 'Mudroom gold coat hook')) {
      assert.equal(hook.userData.mount, 'Cubby side panel');
      assert.ok(Math.abs(Math.abs(hook.rotation.y) - Math.PI / 2) < 1e-9);
      const plate = bounds(hook.children.find((part) => part.name === 'Hook mounting plate'));
      const divider = model.find('Mudroom cubby partition').map(bounds).find((panel) => Math.abs(plate.min[2] - panel.max[2]) < 1e-8 || Math.abs(plate.max[2] - panel.min[2]) < 1e-8);
      assert.ok(divider, 'Hook mounting plate touches an actual side divider');
    }
    assert.equal(cubby.children.filter((part) => part.name === 'Mudroom upper cubby shelf').length, 3);
    assert.ok(cubby.userData.clearWidthInches > 17);
  }
  const seat = model.find('Mudroom light stone bench seat')[0];
  assert.equal(seat.w * 12, 90);
  assert.equal(seat.d * 12, 18);
  assert.equal((seat.position.y + seat.h / 2) * 12, 18);
  assert.ok(model.find('Mudroom cubby partition').every((part) => part.d === seat.d && part.position.z === 0), 'Upper dividers now align with the bench front without enlarging its footprint');
  assert.ok(model.find('Mudroom upper cubby shelf').every((part) => part.d === seat.d && part.position.z === 0));
  const backing = model.find('Continuous mudroom cubby backing')[0];
  assert.equal(backing.material.name, 'Warm painted mudroom backing');
  assert.equal(backing.h, 8.75);
  assert.ok((seat.position.y - seat.h / 2 - 0.0405) * 12 >= 14, 'At least 14-inch actual clear height above finished tile/grout');
  assert.ok((0.75 - (backing.position.z + backing.d / 2)) * 12 >= 16, 'At least 16-inch clear shoe depth');
});

test('full north closet has a transverse rail and standard 48-inch French pair', () => {
  const model = buildMudroom();
  assert.equal(model.roots.length, 5);
  for (const name of ['Mudroom stacked washer and dryer', 'Mudroom washer concept', 'Mudroom dryer concept', 'Provisional laundry stacking kit', 'Laundry reservation side panel', 'Laundry overhead compartment floor']) {
    assert.equal(model.find(name).length, 0, `${name} must not remain in the mudroom`);
  }
  assert.equal(model.find('Mudroom coat hanging rail').length, 1);
  assert.equal(model.find('Mudroom hanging coat').length, 4);
  assert.equal(model.find('Closet open shoe shelf').length, 2);
  assert.equal(model.find('Coat closet upper shelf').length, 3);
  assert.equal(model.find('Mudroom sliding coat closet door').length, 0);
  assert.equal(model.find('Full-overlay Shaker cabinet front').length, 0, 'Mudroom uses simple builder-installed open shelving');
  assert.equal(model.find('Mudroom keys and charging drop zone').length, 0, 'Removed with the pictured west run');
  const closet = model.find('Mudroom hanging coat closet')[0];
  assert.equal(closet.userData.widthInches, 61.5);
  assert.equal(closet.userData.depthInches, 24);
  assert.equal(closet.userData.doorHeightInches, 96);
  assert.equal(closet.userData.railOrientation, 'Side to side');
  assert.match(closet.userData.doorStyle, /48 x 96-inch solid/);
  assert.deepEqual(Array.from(closet.userData.roughOpeningReserveInches), [50, 98]);
  assert.equal(model.find('Mudroom standard hinged closet door panel').length, 2);
  for (const leaf of model.find('Mudroom standard hinged closet door panel')) {
    assert.equal(leaf.userData.height, 7.96);
    assert.ok(Math.abs((bounds(leaf).min[1] + bounds(leaf).max[1]) / 2 - 4) < 1e-9, 'Interactive leaves remain centered four feet above the floor');
  }
  for (const jamb of model.find('Mudroom closet door jamb')) assert.equal(jamb.h, 8);
  const headwall = model.find('Mudroom closet headwall')[0];
  assert.ok(Math.abs(headwall.position.y - headwall.h / 2 - 98 / 12) < 1e-9);
  assert.equal(model.find('Mudroom closet headwall').length, 1);
  assert.equal(model.find('Mudroom coat hanging rail')[0].rotation.z, Math.PI / 2);
  for (const coat of model.find('Mudroom hanging coat')) {
    const b = bounds(coat), c = bounds(closet);
    assert.ok(b.min.every((value, axis) => value >= c.min[axis]) && b.max.every((value, axis) => value <= c.max[axis]), 'Illustrated front-facing coats fit inside shallow bay');
  }
});

test('pictured west shoe-and-bin section and its overhead rail are removed', () => {
  const model = buildMudroom();
  const owners = ['Peter', 'Lila', 'Jacob', 'Ada', 'Lucas'];
  assert.deepEqual(model.find('Mudroom family cubby').map((cubby) => cubby.userData.owner), owners);
  for (const name of ['Mudroom family container and shoe tower', 'Mudroom extra family shoe wall', 'Mudroom personal accessory bin', 'Removable accessory container', 'Family upper shoe divider', 'Family tower top cap', 'Mudroom continuous west top rail', 'Mudroom charging outlet allowance']) {
    assert.equal(model.find(name).length, 0, `${name} is removed, not merely hidden`);
  }
  assert.equal(model.find('Mudroom basket built-in return').length, 0, 'West run is entirely removed');
});

test('remaining east shoe tower fits seven larger pair envelopes', () => {
  const model = buildMudroom();
  const wall = model.find('Mudroom corner shoe tower')[0];
  const cells = model.find('Mudroom extra shoe pair cell');
  assert.equal(wall.userData.extraPairTarget, 7);
  assert.equal(cells.length, 7);
  assert.equal(model.find('Stored extra shoe').length, 14);
  assert.equal(cells.filter((cell) => cell.userData.zone === 'Beside cubbies').length, 7);
  assert.equal(cells.filter((cell) => cell.userData.zone !== 'Beside cubbies').length, 0);
  const shelves = model.find('Extra shoe pair shelf').map(bounds);
  const caps = model.find('Corner shoe tower top cap').map(bounds);
  const trimBottom = bounds(model.find('Mudroom continuous east top rail')[0]).min[1];
  for (const cell of cells) {
    const [width, depth, height] = cell.userData.pairEnvelopeInches;
    assert.ok(cell.userData.clearWidthInches >= width);
    assert.ok(cell.userData.depthInches >= depth);
    assert.ok(cell.userData.clearHeightInches >= height);
    assert.equal(cell.userData.pairs, 1);
    const shelf = bounds(cell.children.find((part) => part.name === 'Extra shoe pair shelf'));
    assert.ok((shelf.max[2] - shelf.min[2]) * 12 >= width, 'Actual shelf fits target pair width');
    assert.ok((shelf.max[0] - shelf.min[0]) * 12 >= depth, 'Actual shelf fits target pair depth');
    const above = [...shelves, ...caps].filter((next) => next.min[1] > shelf.max[1] && [0, 2].every((axis) => Math.min(next.max[axis], shelf.max[axis]) - Math.max(next.min[axis], shelf.min[axis]) > 0.000001));
    assert.ok((Math.min(trimBottom, ...above.map((next) => next.min[1])) - shelf.max[1]) * 12 >= height, 'Actual shelf and front-trim opening fit the target height, not just a metadata allowance');
  }
  assert.equal(model.find('Extra shoe wall seasonal shelf').length, 0);
  const shoeBounds = bounds(wall);
  assert.ok(Math.abs((shoeBounds.max[2] - shoeBounds.min[2]) * 12 - 18.72) < 0.000001);
});

test('five named cubbies contain family outerwear, three backpacks, a hat and a real four-foot coat', () => {
  const model = buildMudroom();
  const cubbies = model.find('Mudroom family cubby');
  assert.deepEqual(cubbies.map((cubby) => cubby.userData.owner), ['Peter', 'Lila', 'Jacob', 'Ada', 'Lucas']);
  for (const cubby of cubbies) {
    const owner = cubby.userData.owner;
    assert.equal(model.find(`Mudroom decorative name: ${owner}`).length, 1);
    const garment = cubby.children.find((part) => part.name === `${owner} cubby ${owner === 'Lila' ? 'long coat' : 'jacket'}`);
    assert.ok(garment, `${owner} has outerwear`);
    const body = garment.children.find((part) => part.name === 'Contoured hanging outerwear');
    const bodyBounds = bounds(body);
    const seat = bounds(model.find('Mudroom light stone bench seat')[0]);
    const firstShelf = cubby.children.find((part) => part.name === 'Mudroom upper cubby shelf');
    assert.ok(bodyBounds.min[1] > seat.max[1], 'Hem clears the actual bench top');
    assert.ok(bodyBounds.max[1] < bounds(firstShelf).min[1], 'Outerwear clears the first shelf');
    assert.equal(garment.rotation.y, -Math.PI / 2, 'Outerwear hangs along the side divider, not against the back');
    const rightHook = cubby.children.filter((part) => part.name === 'Mudroom gold coat hook')[1];
    const loop = bounds(garment.children.find((part) => part.name === 'Outerwear hanging loop'));
    const hookTip = bounds(rightHook.children.find((part) => part.name === 'Coat hook upturn'));
    assert.ok(loop.max.every((value, axis) => value >= hookTip.min[axis] && loop.min[axis] <= hookTip.max[axis]), 'Garment loop actually meets the right hook tip');
    for (const divider of model.find('Mudroom cubby partition')) {
      const panel = bounds(divider);
      assert.ok(bodyBounds.max.some((value, axis) => value <= panel.min[axis] || bodyBounds.min[axis] >= panel.max[axis]), 'Turned sleeves clear all cubby partitions');
    }
    if (owner === 'Lila') {
      assert.ok(Math.abs((bodyBounds.max[1] - bodyBounds.min[1]) * 12 - 48) < 1e-9, 'Four feet is actual mesh height, not metadata');
      assert.equal(firstShelf.position.y, 6.35);
      assert.ok(cubby.children.filter((part) => part.name === 'Mudroom gold coat hook').every((hook) => hook.position.y === 5.55));
    }
  }
  for (const owner of ['Jacob', 'Ada', 'Lucas']) {
    const backpack = model.find(`${owner} backpack`)[0];
    assert.ok(backpack);
    assert.equal(backpack.rotation.y, Math.PI / 2);
    const leftHook = backpack.parent.children.filter((part) => part.name === 'Mudroom gold coat hook')[0];
    const handle = bounds(backpack.children.find((part) => part.name === 'Backpack hanging handle'));
    const hookTip = bounds(leftHook.children.find((part) => part.name === 'Coat hook upturn'));
    assert.ok(handle.max.every((value, axis) => value >= hookTip.min[axis] && handle.min[axis] <= hookTip.max[axis]), 'Backpack handle actually meets the left hook tip');
  }
  assert.equal(model.find('Peter backpack').length, 0);
  assert.equal(model.find('Lila backpack').length, 0);
  assert.equal(model.find('Peter hat').length, 1);
  const hat = bounds(model.find('Peter hat')[0]);
  const peterShelf = cubbies[0].children.find((part) => part.name === 'Mudroom upper cubby shelf');
  assert.ok(hat.min[1] >= bounds(peterShelf).max[1], 'Hat rests above, not inside, its shelf');
});

test('decorative names sit inside cubbies on transparent backgrounds instead of white nameplates', () => {
  const model = buildMudroom();
  for (const cubby of model.find('Mudroom family cubby')) {
    const name = model.find(`Mudroom decorative name: ${cubby.userData.owner}`)[0];
    assert.equal(name.parent, cubby);
    assert.equal(name.position.y, 5.1);
    assert.ok(name.position.z > -0.6875 && name.position.z < -0.68, 'Lettering sits just in front of the solid backing, not on the shelf edge');
    assert.ok(name.geometry.parameters.width * 12 < cubby.userData.clearWidthInches);
    assert.equal(name.material.transparent, true);
    assert.equal(name.material.alphaTest, 0.05);
    assert.equal(name.material.depthWrite, false);
    const drawing = name.material.map.image.context;
    assert.equal(drawing.fills.length, 0, 'No rectangular background is painted');
    assert.equal(drawing.texts[0].text, cubby.userData.owner);
    assert.match(drawing.texts[0].font, /italic.*Script.*cursive/);
    assert.equal(drawing.texts[0].color, '#493827');
    assert.equal(model.find(`Mudroom label: ${cubby.userData.owner}`).length, 0);
    assert.ok(cubby.children.filter((part) => part.name === 'Mudroom upper cubby shelf')[0].position.y === 6.35, 'First shelf line now aligns across all five cubbies');
  }
  assert.equal(model.find('Mudroom label: Safe high access required').length, 0, 'Owner removed the tower sign; high-access caution stays in design notes');
});

test('daily boots and sneakers fit under the bench and shelf boots clear the shelf above', () => {
  const model = buildMudroom();
  const daily = model.find('Mudroom daily footwear');
  assert.equal(daily.length, 10);
  assert.equal(daily.filter((shoe) => shoe.userData.kind === 'boot').length, 4);
  const seat = bounds(model.find('Mudroom light stone bench seat')[0]);
  for (const shoe of daily) {
    const b = bounds(shoe);
    assert.ok(b.min[1] >= 0.0405 - 1e-9 && b.max[1] < seat.min[1], 'Daily footwear fits above tile and below the seat');
    assert.equal(shoe.userData.uniformScale, true);
  }
  const stored = model.find('Stored extra shoe');
  assert.equal(stored.filter((shoe) => shoe.userData.kind === 'boot').length, 4);
  for (const shoe of stored) {
    const cell = shoe.parent;
    const b = bounds(shoe);
    const shelf = bounds(cell.children.find((part) => part.name === 'Extra shoe pair shelf'));
    assert.ok(b.min[1] >= shelf.max[1] - 1e-9);
    assert.ok((b.max[1] - shelf.max[1]) * 12 < cell.userData.clearHeightInches);
  }
  assert.equal(model.find('Stored shoe sole').length, 0, 'Old flat shoe blocks are gone');
});

test('clear west wall retains a 56.8-inch wall-to-bench aisle', () => {
  const model = buildMudroom();
  const bench = bounds(model.find('Five-cubby mudroom bench')[0]);
  const closed = (bench.min[0] - 37.675) * 12;
  assert.ok(Math.abs(closed - 56.8) < 1e-8, `Wall-to-bench aisle is ${closed} inches`);
  const coat = model.find('Mudroom hanging coat closet')[0];
  assert.equal(coat.position.x, 40.3875, 'Full frontage encloses the former basket bay');
  assert.equal(coat.rotation.y, 0, 'Closed coat doors face into the room, not sideways from the corner');
});

test('garage entry door defaults 90 degrees and its full inward sweep clears remaining storage', () => {
  const model = buildMudroom();
  const door = model.find('Mudroom garage entry door')[0];
  const leaf = model.find('Mudroom inward garage door leaf')[0];
  const operation = leaf.userData.interactiveHouseDoor;
  assert.equal(door.userData.nominalWidthInches, 36);
  assert.equal(door.userData.nominalHeightInches, 96);
  assert.equal(door.userData.thicknessInches, 1.75);
  assert.equal(operation.openAngleDegrees, 90);
  assert.equal(operation.maxAngleDegrees, 90);
  assert.equal(operation.openRotationSign, 1);
  assert.equal(leaf.rotation.y, Math.PI / 2);
  const obstacles = model.all.filter((part) => {
    if (part.w === undefined) return false;
    for (let node = part; node; node = node.parent) if (node === door) return false;
    return true;
  }).map((part) => ({ name: part.name, bounds: bounds(part) }));
  const doorParts = boxParts(model, door);
  try {
    for (let degrees = 0; degrees <= 90; degrees++) {
      leaf.rotation.y = degrees * Math.PI / 180;
      for (const part of doorParts) {
        const moving = bounds(part);
        for (const obstacle of obstacles) {
          const fixed = obstacle.bounds;
          assert.ok(moving.max.some((value, axis) => value <= fixed.min[axis] + 1e-6 || fixed.max[axis] <= moving.min[axis] + 1e-6), `${part.name} clears ${obstacle.name} at ${degrees} degrees, including handles`);
        }
      }
    }
    leaf.rotation.y = 0;
    const panel = bounds(model.find('Solid mudroom garage door panel')[0]);
    assert.ok(panel.min[0] > 38 && panel.max[0] < 41, 'Leaf fits the relocated garage opening when closed');
    assert.ok(panel.min[1] > 0 && panel.max[1] < 8);
    assert.ok(Math.abs((panel.min[1] - 0.0405) * 12 - 0.5) < 1e-9, 'Door bottom clears finished tile/grout by the modeled half inch, not merely the structural floor datum');
  } finally {
    leaf.rotation.y = 0;
  }
  const bench = bounds(model.find('Five-cubby mudroom bench')[0]);
  const openDoor = bounds(door);
  assert.ok((bench.min[0] - openDoor.max[0]) * 12 > 12, 'Closed leaf clears bench; full open operating sweep checked above');
  assert.match(door.userData.approval, /Rated\/self-closing.*professional review/);
});

test('storage fits below the ceiling with no case overlap and keeps the entry route clear', () => {
  const model = buildMudroom();
  const [bench, closet] = model.roots.map(bounds);
  for (const root of model.roots.filter((root) => root.name !== 'Mudroom garage entry door')) {
    const b = bounds(root);
    assert.ok(b.min[0] >= 37.675 - 1e-9 && b.max[0] <= 44.9 - 8 / 12 - 0.175 + 1e-9);
    const fitted = root.name === 'Continuous mudroom built-in enclosure';
    assert.ok(b.min[2] >= 14.8 && b.max[2] <= (fitted ? 26.725 : 26.9 - 0.175 - 1 / 12) + 1e-9, 'Cases retain their footprint; fitted end scribes meet the south wall');
    assert.ok(b.min[1] >= -1e-9 && b.max[1] <= (fitted ? 9 : 8.75) + 1e-9);
  }
  for (let first = 0; first < model.roots.length; first++) for (let second = first + 1; second < model.roots.length; second++) {
    for (const aPart of boxParts(model, model.roots[first])) for (const bPart of boxParts(model, model.roots[second])) {
      const a = bounds(aPart), b = bounds(bPart);
      assert.ok(a.max.some((value, axis) => value <= b.min[axis] + 0.000001 || b.max[axis] <= a.min[axis] + 0.000001), `${aPart.name} and ${bPart.name} join without positive overlap`);
    }
  }
  assert.ok(closet.max[2] < 21.175 - (3.5 + 0.125) / 12, 'Closet clears kitchen-entry casing');
  assert.ok(bench.min[0] > 41 + (2.5 + 0.125) / 12, 'Bench clears actual garage-entry casing');
  assert.ok(closet.max[2] < 21.175 && bench.min[0] > 42.4, 'Kitchen-to-garage route remains open');
  const entryTurningArea = { min: [39.875, 0, 21.5], max: [42.4, 6, 26.5] };
  const leaf = model.find('Mudroom inward garage door leaf')[0];
  leaf.rotation.y = Math.PI / 2;
  for (const part of model.all.filter((part) => part.w !== undefined)) {
    const b = bounds(part);
    assert.ok(b.max.some((value, axis) => value <= entryTurningArea.min[axis] || b.min[axis] >= entryTurningArea.max[axis]), 'With the door parked open, keep a conservative 30.3 by 60 inch static passing strip, not accessibility approval');
  }
  leaf.rotation.y = 0;
});

test('the 48-inch coat doorway has a 36-inch deep storage-free approach', () => {
  const model = buildMudroom();
  const coat = model.find('Mudroom hanging coat closet')[0];
  const c = bounds(coat);
  const approach = { min: [coat.position.x - 4 / 12 - 2, 0, c.max[2]], max: [coat.position.x - 4 / 12 + 2, 6.4, c.max[2] + 3] };
  for (const part of model.all.filter((part) => part.w !== undefined)) {
    let inCoat = false;
    for (let node = part; node; node = node.parent) if (node === coat) inCoat = true;
    if (inCoat) continue;
    const b = bounds(part);
    assert.ok(b.max.some((value, axis) => value <= approach.min[axis] || b.min[axis] >= approach.max[axis]), 'No shoe tower, shelf return, or bin unit blocks any part of the coat approach');
  }
});

test('basket bay is removed and French leaves and garage door sweep clear of retained cases', () => {
  const model = buildMudroom();
  assert.equal(model.find('Mudroom north basket shelves').length, 0);
  assert.equal(model.find('Mudroom removable north basket').length, 0);
  assert.equal(model.find('Mudroom north basket closet filler').length, 0);
  const separate = (a, b) => a.max.some((v, k) => v <= b.min[k] + 1e-6 || b.max[k] <= a.min[k] + 1e-6);
  const closet = model.find('Mudroom hanging coat closet')[0];
  const leafNames = ['Mudroom left French closet leaf', 'Mudroom right French closet leaf', 'Mudroom inward garage door leaf'];
  const moving = leafNames.map((name) => model.find(name)[0]);
  const fixed = model.all.filter((p) => p.w !== undefined && !moving.some((leaf) => {
    for (let n = p; n; n = n.parent) if (n === leaf) return true;
    return false;
  }));
  const cheeks = model.find('Coat closet side panel').map(bounds);
  assert.ok(Math.abs((cheeks[1].max[0] - cheeks[0].min[0]) * 12 - 61.5) < 1e-8);
  assert.ok(Math.abs(cheeks[0].min[0] - 37.825) < 1e-8);
  assert.ok(Math.abs(cheeks[1].max[0] - 42.95) < 1e-8);
  for (const leaf of moving.slice(0, 2)) assert.equal(leaf.userData.nominalWidthInches, 24);
  for (const name of ['Mudroom left French closet leaf', 'Mudroom right French closet leaf', 'Mudroom inward garage door leaf']) {
    const leaf = model.find(name)[0];
    for (let degrees = 0; degrees <= 90; degrees++) {
      leaf.rotation.y = degrees * Math.PI / 180 * leaf.userData.interactiveHouseDoor.openRotationSign;
      {
        for (const a of boxParts(model, leaf)) for (const b of fixed) {
          assert.ok(separate(bounds(a), bounds(b)), `${name} at ${degrees} clears ${b.name}`);
        }
      }
    }
    leaf.rotation.y = leaf.userData.interactiveHouseDoor.openAngleDegrees * Math.PI / 180;
  }
  const sweeps = moving.map((leaf) => {
    const poses = [];
    for (let degrees = 0; degrees <= 90; degrees++) {
      leaf.rotation.y = degrees * Math.PI / 180 * leaf.userData.interactiveHouseDoor.openRotationSign;
      poses.push(boxParts(model, leaf).map(bounds));
    }
    leaf.rotation.y = leaf.userData.interactiveHouseDoor.openAngleDegrees * Math.PI / 180;
    return poses;
  });
  for (const [first, second] of [[0, 1], [0, 2], [1, 2]]) {
    for (const a of sweeps[first]) for (const b of sweeps[second]) {
      for (const A of a) for (const B of b) assert.ok(separate(A, B), 'Independent door poses clear one another');
    }
  }
  assert.equal(moving[0].rotation.y, 0);
  assert.equal(moving[1].rotation.y, 0);
  assert.equal(moving[2].rotation.y, Math.PI / 2);
  assert.equal(closet.position.x, 40.3875);
  assert.equal(closet.userData.doorOffsetInches, -4);
  assert.deepEqual(Array.from(closet.userData.sideFillerWidthsInches), [2.75, 10.75]);
  const jambs = model.find('Mudroom closet door jamb');
  assert.deepEqual(jambs.map((part) => part.w * 12), [2.75, 10.75]);
  assert.ok(Math.abs((moving[0].position.x + moving[1].position.x) / 2 + 4 / 12) < 1e-9);
  assert.equal(model.find('Mudroom closet head jamb reserve')[0].position.x, -4 / 12);
});

test('kitchen opening stays fixed while garage entry shifts eighteen inches west', () => {
  assert.ok(source.includes('const garageEntry = { x: 38, z: 26.725, width: 3, treadWidth: 4, going: 11 / 12, height: 8, thresholdDepth: 0.35 }'));
  assert.match(source, /const kitchenSideOpenings = kitchenPassages\.openings/);
  const plan = require('../floor-plan-ground.js').getGroundFloorDefaultPlan();
  const kitchen = plan.walls.find((wall) => wall[0] === 'Kitchen east');
  const garage = plan.walls.find((wall) => wall[0] === 'Mudroom south');
  assert.deepEqual(kitchen[5][1], [14.675, 17.175, 0, 8]);
  assert.equal(kitchen[1], 37.5);
  assert.equal(kitchen[3], 37.5);
  assert.deepEqual(garage[5], [[0.5, 3.5, 0, 8]]);
  assert.equal(garage[1] + garage[5][0][0], 38);
  assert.equal(garage[1] + garage[5][0][1], 41);
});

test('east blind corner remains enclosed and is not counted as storage', () => {
  const model = buildMudroom();
  const corners = model.find('Mudroom enclosed corner return');
  assert.equal(corners.length, 1);
  assert.equal(model.find('Mudroom connecting upper shelf').length, 0);
  assert.equal(model.find('Mudroom east return upper shelf').length, 0);
  for (const corner of corners) {
    assert.equal(corner.userData.accessibleStorage, false, 'Blind corners are explicitly not counted as usable storage');
    assert.ok(Math.abs(bounds(corner).max[1] * 12 - 105) < 0.000001);
    assert.ok(Math.abs(bounds(corner).min[2] - 15.4) < 0.000001);
    assert.ok(Math.abs(bounds(corner).max[2] - 17.54) < 0.000001);
    assert.equal(corner.children.filter((part) => part.name === 'Enclosed corner front').length, 1);
    assert.equal(corner.children.filter((part) => part.name === 'Enclosed corner cheek').length, 2);
  }
});

test('prep/mudroom divider aligns with the garage wall while kitchen openings and garage entry stay fixed', () => {
  const plan = require('../floor-plan-ground.js').getGroundFloorDefaultPlan();
  assert.deepEqual(plan.walls.find(([name]) => name === 'Mudroom north').slice(1), [37.5, 15, 44.9 - 8 / 12, 15]);
  assert.deepEqual(plan.walls.find(([name]) => name === 'Mudroom east').slice(1), [44.9 - 8 / 12, 15, 44.9 - 8 / 12, 26.9]);
  const mud = plan.rooms.find((room) => room.name === 'Mudroom');
  assert.equal(mud.z, 15);
  assert.equal(mud.d, 11.9);
  assert.equal(mud.w, 7.4 - 8 / 12);
  const garageFloor = plan.floors.find((floor) => floor.room === 'Garage' && floor.z === 15);
  assert.equal(garageFloor.x, 44.9 - 8 / 12);
  assert.equal(garageFloor.w, 10.6 + 8 / 12);
  const prepFloors = plan.floors.filter((floor) => floor.room === 'Prep kitchen');
  assert.ok(Math.abs(prepFloors.reduce((area, floor) => area + floor.w * floor.d, 0) - 18 * 8) < 1e-9);
  assert.equal(plan.walls.find(([name]) => name === 'Mudroom south')[2], 26.9);
  assert.equal(plan.walls.find(([name]) => name === 'Kitchen north')[2], 7);
  assert.deepEqual(plan.walls.find(([name]) => name === 'Kitchen east')[5], [[2.725, 5.225, 0, 8], [14.675, 17.175, 0, 8]]);
  const model = buildMudroom();
  assert.equal(model.find('Mudroom hanging coat closet')[0].position.z, 16.4);
  assert.equal(model.find('Five-cubby mudroom bench')[0].position.z, 21.29);
});

test('mudroom contrast palette separates shelf backs, casework and both door types without changing shared finishes', () => {
  const model = buildMudroom();
  const ivoryParts = [
    'Open shoe bay divider', 'Mudroom cubby partition', 'Mudroom upper cubby shelf', 'Coat closet side panel',
    'Closet open shoe shelf', 'Coat closet upper shelf',
    'Extra shoe pair shelf', 'Corner shoe tower side', 'Corner shoe tower top cap',
    'Enclosed corner horizontal panel', 'Enclosed corner back', 'Enclosed corner front', 'Enclosed corner cheek',
    'Coat header top return', 'Mudroom continuous north top rail', 'Mudroom continuous east top rail',
    'Mudroom north wall scribe', 'Mudroom west wall scribe', 'Mudroom east wall scribe', 'Mudroom cubby end scribe',
    'Mudroom north ceiling infill', 'Mudroom east ceiling infill'
  ];
  const backingParts = [
    'Continuous mudroom cubby backing', 'Coat closet backing', 'Corner shoe tower backing'
  ];
  const surroundParts = ['Mudroom closet door jamb', 'Mudroom closet headwall'];
  for (const [names, finish, color] of [
    [ivoryParts, 'Off-white mudroom casework', '#e6dece'],
    [surroundParts, 'Off-white mudroom casework', '#e6dece'],
    [backingParts, 'Warm painted mudroom backing', '#e6dece']
  ]) {
    for (const name of names) {
      const parts = model.find(name);
      assert.ok(parts.length > 0, `${name} exists`);
      for (const part of parts) {
        assert.equal(part.material.name, finish, `${name} uses its intended finish`);
        assert.equal(part.material.color, color);
      }
    }
  }
  for (const [name, count] of [['Mudroom closet door jamb', 2], ['Mudroom closet headwall', 1], ['Mudroom standard hinged closet door panel', 2]]) {
    const parts = model.find(name);
    assert.equal(parts.length, count);
    const caseMaterial = model.find('Mudroom cubby partition')[0].material;
    assert.ok(parts.every((part) => name === 'Mudroom standard hinged closet door panel' ? part.children.every((mesh) => mesh.material === caseMaterial) : part.material === caseMaterial));
  }
  const recessed = model.find('Interior door single recessed field');
  assert.equal(recessed.length, 3);
  assert.equal(model.find('Mudroom bifold recessed panel').length, 0);
  const wood = model.all.filter((part) => ['cabinetFinish', 'cabinetRailFinish', 'cabinetPanelFinish'].includes(part.material?.name));
  assert.equal(wood.length, 0, 'Mudroom recoloring replaces local material assignments, not shared kitchen finishes');
  const seat = model.find('Mudroom light stone bench seat')[0];
  assert.equal(seat.material.name, 'countertop');
  assert.ok(model.find('Mudroom gold coat hook').every((hook) => hook.children.every((part) => part.material.name === 'Satin brass mudroom hardware')));
  assert.ok(model.find('Mudroom closet gold knob').every((part) => part.material.name === 'Satin brass mudroom hardware'));
  assert.ok(model.find('Stored extra shoe').every((part) => part.userData.asset && part.userData.uniformScale), 'Shelf footwear is a uniformly scaled licensed asset, not flat blocks');
});

test('finish colors provide measurable shelf/background and name/background separation', () => {
  const model = buildMudroom();
  const luminance = (hex) => {
    const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
  const casework = model.find('Mudroom cubby partition')[0].material;
  const backing = model.find('Continuous mudroom cubby backing')[0].material;
  const closet = model.find('Mudroom standard hinged closet door panel')[0].children[0].material;
  const entry = model.find('Solid mudroom garage door panel')[0].children[0].material;
  assert.equal(casework.color, '#e6dece');
  assert.equal(backing.color, casework.color, 'Backs match all painted cabinetry');
  assert.equal(closet.color, casework.color);
  assert.equal(backing.map, undefined, 'Painted backs no longer use exposed wood grain');
  assert.equal(entry.color, '#faf9f5', 'Garage entry retains white interior trim finish');
  for (const owner of ['Peter', 'Lila', 'Jacob', 'Ada', 'Lucas']) {
    const nameColor = model.find(`Mudroom decorative name: ${owner}`)[0].material.map.image.context.texts[0].color;
    assert.ok(contrast(nameColor, backing.color) >= 4.5, `${owner}'s name remains readable against the deeper backing`);
  }
  assert.ok(backing.roughness > casework.roughness);
});

test('paint has fine relief, varied satin response and local reflections without recoloring shared finishes', () => {
  const model = buildMudroom();
  const paintedNames = ['Mudroom cubby partition', 'Continuous mudroom cubby backing', 'Mudroom painted vertical backing board'];
  const texture = model.find(paintedNames[0])[0].material.bumpMap;
  assert.equal(texture.image.width, 128);
  assert.equal(texture.image.height, 128);
  assert.equal(texture.repeat.x, 8);
  assert.equal(texture.wrapS, 'repeat');
  assert.equal(texture.minFilter, 'mipmaps');
  const tones = new Set();
  for (let i = 0; i < texture.image.data.length; i += 4) {
    const value = texture.image.data[i];
    tones.add(value);
    assert.ok(value >= 200 && value <= 240);
    assert.equal(texture.image.data[i + 1], value);
    assert.equal(texture.image.data[i + 2], value);
    assert.equal(texture.image.data[i + 3], 255);
  }
  assert.ok(tones.size >= 35, 'Paint texture varies rather than acting as another flat scalar');
  for (const name of paintedNames) {
    const finish = model.find(name)[0].material;
    assert.equal(finish.bumpMap, texture);
    assert.equal(finish.roughnessMap, texture);
    assert.equal(finish.bumpScale, 0.0003, 'Relief is about 0.09 mm, not a visible plaster texture');
    assert.equal(finish.userData.edgeRadiusFeet * 12, 1 / 32);
    assert.equal(finish.envMap.name, 'Local room reflections');
    assert.equal(finish.envMapIntensity, 0.18);
    assert.equal(finish.map, undefined, 'Relief/roughness do not tint the selected paint color');
  }
  const hardware = model.find('Mudroom closet gold knob')[0].material;
  assert.equal(hardware.envMapIntensity, 0.7);
  assert.notEqual(hardware, model.shared.brass);
  assert.equal(model.shared.brass.envMap, undefined);
  assert.equal(model.shared.cabinetFinish.envMap, undefined);
  const second = buildMudroom().find(paintedNames[0])[0].material.bumpMap;
  assert.equal(Buffer.from(second.image.data).equals(Buffer.from(texture.image.data)), true, 'Texture is deterministic between reloads');
});

test('only opted-in painted boxes get tiny eased edges within their unchanged envelope', () => {
  class Geometry {
    constructor(width, height, depth, segments, radius) { this.parameters = { width, height, depth, segments, radius }; }
  }
  const context = {
    THREE: { BoxGeometry: Geometry, Mesh: class { constructor(geometry) { this.geometry = geometry; this.position = { set() {} }; } } },
    RoundedBoxGeometry: Geometry
  };
  const start = source.indexOf('  function box(');
  vm.runInNewContext(source.slice(start, source.indexOf('  function cylinder(', start)), context);
  const parent = { add() {} };
  const eased = context.box(parent, 0, 0, 0, 1.5, 0.08, 1.5, { userData: { edgeRadiusFeet: 1 / 384 } });
  assert.equal(eased.geometry.parameters.radius, 1 / 384);
  assert.equal(eased.geometry.parameters.width, 1.5);
  const thin = context.box(parent, 0, 0, 0, 0.3, 4, 0.004, { userData: { edgeRadiusFeet: 1 / 384 } });
  assert.ok(thin.geometry.parameters.radius <= 0.004 / 3);
  const unchanged = context.box(parent, 0, 0, 0, 1, 1, 1, {});
  assert.equal(unchanged.geometry.parameters.radius, undefined);
  const legacyRounded = context.box(parent, 0, 0, 0, 1, 0.15, 1, {}, true);
  assert.equal(legacyRounded.geometry.parameters.radius, 0.15 / 3);
});

test('solid interior leaves have one genuinely recessed field and match trim on both faces', () => {
  const model = buildMudroom();
  const leaves = [...model.find('Mudroom standard hinged closet door panel'), ...model.find('Solid mudroom garage door panel')];
  assert.equal(leaves.length, 3);
  for (const leaf of leaves) {
    const field = leaf.children.filter((part) => part.name === 'Interior door single recessed field');
    assert.equal(field.length, 1);
    const material = leaf.children[0].material;
    assert.equal(material.color, leaf.name === 'Mudroom standard hinged closet door panel' ? '#e6dece' : '#faf9f5');
    assert.ok(leaf.children.every((part) => part.material === material));
    assert.ok(field[0].d < leaf.userData.depth, 'Panel is recessed on both faces, not applied over a solid slab');
    const bottom = leaf.children.find((part) => part.name === 'Interior door bottom rail');
    const top = leaf.children.find((part) => part.name === 'Interior door top rail');
    assert.ok(bottom.h > top.h);
    assert.equal(leaf.children.filter((part) => part.name === 'Interior door full-height stile').length, 2);
  }
});

test('reference-style painted boards have narrow real joints and leave shelves, names and shoe openings clear', () => {
  const model = buildMudroom();
  const boards = model.find('Mudroom painted vertical backing board');
  assert.equal(boards.length, 60);
  for (const cubby of model.find('Mudroom family cubby')) {
    const panels = cubby.children.filter((part) => part.name === 'Mudroom painted vertical backing board');
    const label = cubby.children.find((part) => part.name.startsWith('Mudroom decorative name:'));
    const shelves = cubby.children.filter((part) => part.name === 'Mudroom upper cubby shelf');
    for (const panel of panels) {
      assert.equal(panel.material.name, 'Cream painted tongue-and-groove boards');
      assert.equal(panel.material.color, '#e6dece', 'Boards match the consistent off-white casework');
      assert.ok(panel.position.y - panel.h / 2 >= 1.5 - 1e-9, 'Shoe openings below seat remain unchanged');
      assert.ok(panel.position.z + panel.d / 2 < label.position.z, 'Name remains in front of the painted boards');
      for (const shelf of shelves) {
        const overlap = Math.min(panel.position.y + panel.h / 2, shelf.position.y + shelf.h / 2) - Math.max(panel.position.y - panel.h / 2, shelf.position.y - shelf.h / 2);
        assert.ok(overlap <= 1e-9, 'Boards stop at actual shelf faces');
      }
    }
    const row = panels.slice(0, 4);
    for (let i = 1; i < row.length; i++) {
      const gap = row[i].position.x - row[i].w / 2 - (row[i - 1].position.x + row[i - 1].w / 2);
      assert.ok(Math.abs(gap * 12 - 1 / 8) < 1e-9);
    }
  }
  assert.equal(model.find('Mudroom hook fixing screw').length, 32);
  assert.equal(model.find('Mudroom east stepped cornice').length, 2);
  assert.equal(model.find('Mudroom north stepped cornice').length, 2);
});

test('all five remaining case groups share a 105-inch top with connected north and east trim', () => {
  const model = buildMudroom();
  const enclosure = model.find('Continuous mudroom built-in enclosure')[0];
  assert.equal(enclosure.userData.uniformTopInches, 105);
  assert.equal(enclosure.userData.extraPairTarget, 7);
  assert.equal(enclosure.userData.blindCornersCountedAsStorage, false);
  const rails = ['north', 'east'].map((side) => bounds(model.find(`Mudroom continuous ${side} top rail`)[0]));
  assert.ok(rails.every((rail) => Math.abs(rail.max[1] * 12 - 105) < 1e-9 && rail.min[1] * 12 >= 103.5));
  assert.ok(Math.abs(rails[0].max[0] - rails[1].min[0]) < 1e-9, 'Back and east top rails meet with no horizontal gap');
  const joinParts = boxParts(model, enclosure).map(bounds);
  for (const root of model.roots.filter((root) => root !== enclosure && root.name !== 'Mudroom garage entry door')) {
    assert.ok(Math.abs(bounds(root).max[1] * 12 - 105) < 1e-9, `${root.name} keeps the same top height`);
    assert.ok(boxParts(model, root).some((part) => {
      const b = bounds(part);
      return joinParts.some((joint) => {
        const overlaps = b.max.map((max, axis) => Math.min(max, joint.max[axis]) - Math.max(b.min[axis], joint.min[axis]));
        return overlaps.every((value) => value >= -1e-6) && overlaps.some((value) => Math.abs(value) <= 1e-6);
      });
    }), `${root.name} actually touches the shared enclosure, not merely matching its color`);
  }
});

test('west basket tower, accessories and specific trim are entirely absent', () => {
  const model = buildMudroom();
  for (const name of ['Mudroom arrival-wall basket shelves', 'Arrival basket tower side', 'Arrival basket tower backing', 'Arrival basket fixed shelf', 'Arrival basket center divider', 'Removable arrival-wall basket', 'Mudroom label: Safe high access required', 'Mudroom west ceiling infill', 'Mudroom continuous recessed plinth']) {
    assert.equal(model.find(name).length, 0, `${name} removed without replacement`);
  }
});

test('west return is removed and former storage volume is clear of constituent geometry', () => {
  const model = buildMudroom();
  for (const name of ['Mudroom basket built-in return', 'Basket return connecting shelf', 'Basket return continuous backing']) {
    assert.equal(model.find(name).length, 0);
  }
  assert.equal(model.find('Continuous mudroom built-in enclosure')[0].userData.basketReturnConnected, undefined);
  const cleared = { min: [37.675, 0.5, 17.63], max: [38.675, 9, 20.775] };
  for (const part of model.all.filter(p => p.w !== undefined)) {
    const b = bounds(part);
    assert.ok(b.max.some((value, axis) => value <= cleared.min[axis] + 1e-8 || b.min[axis] >= cleared.max[axis] - 1e-8), `${part.name} leaves west wall clear above restored baseboard`);
  }
});

test('scribed backs and ends close every perimeter gap and fitted top infills meet the ceiling', () => {
  const model = buildMudroom();
  const west = 37.675, east = 44.9 - 8 / 12 - 0.175, north = 15.175, south = 26.725;
  const enclos = model.find('Continuous mudroom built-in enclosure')[0];
  assert.equal(enclos.userData.wallFitted, true);
  assert.equal(enclos.userData.fittedTopInches, 108);
  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} meets ${b} without an open strip`);
  const rear = bounds(model.find('Mudroom north wall scribe')[0]);
  near(rear.min[0], west); near(rear.max[0], east); near(rear.min[2], north);
  near(rear.max[2], 15.4);
  near((rear.max[2] - rear.min[2]) * 12, 2.7);
  const left = bounds(model.find('Mudroom west wall scribe')[0]);
  near(left.min[0], west); near(left.max[0], 37.825); near(left.min[2], rear.max[2]);
  const right = bounds(model.find('Mudroom east wall scribe')[0]);
  near(right.max[0], east);
  near(right.min[0], bounds(model.find('Continuous mudroom cubby backing')[0]).max[0]);
  const end = bounds(model.find('Mudroom cubby end scribe')[0]);
  near(end.max[2], south); near(end.min[2], bounds(model.find('Mudroom corner shoe tower')[0]).max[2]);
  near(end.max[0], east); near(end.min[0], bounds(model.find('Mudroom light stone bench seat')[0]).min[0]);
  for (const name of ['Mudroom north wall scribe', 'Mudroom west wall scribe', 'Mudroom east wall scribe', 'Mudroom cubby end scribe']) {
    const part = model.find(name)[0], b = bounds(part);
    near(b.min[1], 0.0405); near(b.max[1], 8.75);
    assert.equal(part.userData.countedAsStorage, false);
  }
  for (const name of ['Mudroom north ceiling infill', 'Mudroom east ceiling infill']) {
    const b = bounds(model.find(name)[0]);
    near(b.min[1], 8.75); near(b.max[1], 9);
    assert.ok(b.min[0] >= west - 1e-8 && b.max[0] <= east + 1e-8 && b.min[2] >= north - 1e-8 && b.max[2] <= south + 1e-8);
  }
  assert.equal(model.find('Mudroom west ceiling infill').length, 0);
});

test('south shoe tower and north cubbies swap within the same fitted east-wall footprint', () => {
  const model = buildMudroom();
  const corner = bounds(model.find('Mudroom corner shoe tower')[0]);
  const bench = bounds(model.find('Five-cubby mudroom bench')[0]);
  assert.ok(Math.abs(bench.min[2] - 17.54) < 1e-9);
  assert.ok(Math.abs(bench.max[2] - corner.min[2]) < 1e-9);
  assert.ok(Math.abs(corner.max[2] - 26.6) < 1e-9);
  const cubbies = model.find('Mudroom family cubby');
  assert.deepEqual(cubbies.map((part) => part.userData.owner), ['Peter', 'Lila', 'Jacob', 'Ada', 'Lucas']);
  for (let i = 1; i < cubbies.length; i++) assert.ok(bounds(cubbies[i]).min[2] > bounds(cubbies[i - 1]).min[2]);
  const seat = bounds(model.find('Mudroom light stone bench seat')[0]);
  assert.ok(Math.abs((seat.max[2] - seat.min[2]) * 12 - 90) < 1e-9);
  assert.ok(Math.abs((seat.max[0] - seat.min[0]) * 12 - 18) < 1e-9);
  assert.ok(Math.abs(corner.min[0] - bench.min[0]) < 1e-9, 'New right return and cubby faces stay on the same 18-inch-deep footprint');
  assert.equal(model.find('Personal bin support shelf').length, 0);
  assert.equal(model.find('Removable accessory container').length, 0);
  assert.equal(model.find('Mudroom personal accessory drawer').length, 0);
});

test('mudroom floor uses 24 by 48 inch tile spacing with 1/16 inch matching grout, without changing other floors', () => {
  const model = buildMudroom();
  const surface = model.floorParts.find((part) => part.name === 'Mudroom tile');
  assert.deepEqual({ ...surface.userData }, { tileWidthInches: 24, tileDepthInches: 48, groutWidthInches: 1 / 16 });
  assert.equal(surface.material.name, 'mudTileFinish');
  assert.equal(surface.w, 7.4 - 8 / 12);
  assert.equal(surface.d, 11.9);
  const joints = model.floorParts.filter((part) => part.name === 'Mudroom tile grout');
  assert.equal(joints.length, 5, 'Three long joints and two cross joints, not the old eight-joint square grid');
  assert.equal(joints.filter((part) => part.w < 0.01).length, 3);
  assert.equal(joints.filter((part) => part.d < 0.01).length, 2);
  assert.ok(joints.every((part) => Math.abs(Math.min(part.w, part.d) * 12 - 1 / 16) < 1e-9 && part.material.name === 'mudGroutFinish'));
  assert.ok(joints.every((part) => part.position.y + part.h / 2 < 0.05), 'One-foot inspection grid stays above tile and grout');
  const parts = [];
  const context = {
    rest: {}, tile: { name: 'default tile' }, cream: { name: 'default grout' },
    box(parent, x, y, z, w, h, d, material) { const part = { position: { x, y, z }, w, h, d, material }; parts.push(part); return part; }
  };
  vm.runInNewContext(source.slice(source.indexOf('  function tiledFloor('), source.indexOf("  const stairs = furnishing(")), context);
  context.tiledFloor('Other room', 0, 0, 7, 11);
  assert.equal(parts[0].material.name, 'default tile');
  assert.equal(parts.length, 9, 'Other floors keep their original two-foot square grid');
  assert.ok(parts.slice(1).every((part) => Math.min(part.w, part.d) === 0.015 && part.material.name === 'default grout'));
});

test('dedicated mudroom camera is available in the toolbar and room menu', () => {
  const html = fs.readFileSync(require.resolve('../floor-plan-3d.html'), 'utf8');
  assert.match(source, /mudroom: \{ target: \[41\.55, 2, 20\.9\]/);
  assert.equal((html.match(/data-view="mudroom"/g) || []).length, 1, 'Room note links to the mudroom camera');
  assert.match(source, /for \(const \[floor, rooms\] of \[\['ground', groundRooms\]/, 'Room menu is generated from the ground-floor rooms, including Mudroom');
});

test('enclosure inspection uses an inside-room perspective without moving outside on portrait screens', () => {
  const start = source.indexOf('    const aspect = viewport.clientWidth / viewport.clientHeight;', source.indexOf('  function setView(name) {'));
  const end = source.indexOf('    const basementCutaway', start);
  const preset = source.match(/'mudroom-storage': (\{ target: \[[^\]]+\], offset: \[[^\]]+\], span: [\d.]+ \})/);
  assert.ok(start >= 0 && end > start && preset, 'Locate the actual camera selection, framing and storage preset');
  class Vector3 {
    constructor(...values) { this.values = values; }
    set(...values) { this.values = values; }
    copy(other) { this.values = [...other.values]; return this; }
    add(other) { this.values = this.values.map((value, index) => value + other.values[index]); return this; }
    setLength() { assert.fail('Interior camera must not be pushed through the garage wall to fit the screen'); }
  }
  const makeCamera = (fov) => ({ fov, position: new Vector3(), updateProjectionMatrix() {} });
  for (const [width, height] of [[1200, 800], [420, 800]]) {
    const interior = makeCamera(85);
    const ordinary = makeCamera(38);
    const context = {
      name: 'mudroom-storage', mudroomInteriorView: true, mudroomInspectionView: true, prepElevationView: false, exteriorElevation: false,
      viewport: { clientWidth: width, clientHeight: height }, mudroomInteriorCamera: interior, perspectiveCamera: ordinary, cooktopElevationCamera: {},
      controls: { target: new Vector3(), update() {} }, camera: null,
      preset: vm.runInNewContext(`(${preset[1]})`),
      THREE: { Vector3, MathUtils: { degToRad: (value) => value * Math.PI / 180, radToDeg: (value) => value * 180 / Math.PI } }
    };
    vm.runInNewContext(source.slice(start, end), context);
    assert.equal(context.camera, interior);
    assert.ok(Math.abs(interior.position.values[0] - 40.3875) < 1e-9);
    assert.ok(Math.abs(interior.position.values[1] - 5.5) < 1e-9);
    assert.ok(Math.abs(interior.position.values[2] - 26.25) < 1e-9, 'Camera stays inside the garage-entry wall');
    assert.ok(Math.abs(Math.tan(interior.fov * Math.PI / 360) * Math.min(width / height, 1) - Math.tan(85 * Math.PI / 360)) < 1e-9);
    assert.equal(ordinary.fov, 38, 'Other room cameras retain their original field of view');
  }
});

test('all three mudroom views have tour starts clear of the actual enclosure parts', () => {
  const start = source.indexOf('    const starts = {', source.indexOf('  function startWalking('));
  const end = source.indexOf('\n    };', start);
  assert.ok(start >= 0 && end > start);
  const starts = vm.runInNewContext(`(() => { ${source.slice(start, end + 7)} return starts; })()`, {
    upstairs: { start: [16, 23] }, cooktopCenterZ: 16.95, kitchenCenterZ: 16.95, prepCounterZ: 9
  });
  const model = buildMudroom();
  const parts = model.all.filter((part) => part.w !== undefined).map(bounds).filter((b) => b.max[1] > 0.5 && b.min[1] < 5.4);
  for (const name of ['mudroom', 'mudroom-cubbies', 'mudroom-storage']) {
    const coordinates = starts[name];
    assert.equal(coordinates?.length, 4, `${name} has a tour start and look target`);
    assert.ok(coordinates.every(Number.isFinite));
    const [x, z] = coordinates;
    assert.ok(x >= 38.9 && x <= 42.9 && z >= 22 && z <= 26, 'Tour starts in the clear arrival zone');
    for (const b of parts) {
      const dx = Math.max(b.min[0] - x, 0, x - b.max[0]);
      const dz = Math.max(b.min[2] - z, 0, z - b.max[2]);
      assert.ok(dx * dx + dz * dz >= 0.25, 'Actual case parts leave room for the half-foot tour radius');
    }
  }
});
