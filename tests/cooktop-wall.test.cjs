'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');

function buildCookingWall() {
  class Group {
    constructor() {
      this.children = [];
      this.rotation = { y: 0 };
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.userData = {};
    }
    add(child) { child.parent = this; this.children.push(child); }
  }
  class Mesh extends Group {
    constructor(geometry, material) { super(); Object.assign(this, { geometry, material }); }
  }
  class CylinderGeometry {
    constructor(topRadius, bottomRadius, height) {
      const points = [];
      for (const [radius, y] of [[topRadius, height / 2], [bottomRadius, -height / 2]]) {
        for (let corner = 0; corner < 4; corner++) {
          const angle = Math.PI / 4 + corner * Math.PI / 2;
          points.push({ x: radius * Math.sin(angle), y, z: radius * Math.cos(angle) });
        }
      }
      this.points = points;
    }
    toNonIndexed() { return this; }
    computeVertexNormals() {}
    getAttribute() {
      return { count: this.points.length, getX: (i) => this.points[i].x, getY: (i) => this.points[i].y, setX: (i, x) => { this.points[i].x = x; } };
    }
  }
  const context = {
    THREE: { Group, Mesh, CylinderGeometry }, kitchen: new Group(), ceilingHeight: 9, cookingWallShiftX: -0.5,
    cooktopRunWidth: 21.675 - 12.225 - 2 * (3.625 / 12), cooktopEndFillerWidth: 1.5 / 12, cooktopCenterZ: 16.95,
    ...Object.fromEntries(['cabinetFinish', 'cabinetRailFinish', 'cabinetPanelFinish', 'brass', 'black', 'light'].map((name) => [name, { name }])),
    mat: (color) => ({ color }),
    box(parent, x, y, z, w, h, d, material) {
      assert.ok(material, 'Every part has a defined finish');
      const mesh = new Mesh({ w, h, d }, material);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }
  };
  vm.createContext(context);
  const helpers = source.slice(source.indexOf('  function shakerFront('), source.indexOf('  function cabinetCupPull('));
  vm.runInContext(helpers, context);
  vm.runInContext(source.slice(source.indexOf('  const cooktopHood ='), source.indexOf('  const cookingDetails =')), context);
  const descendants = (node) => [node, ...node.children.flatMap(descendants)];
  const all = descendants(context.kitchen);
  return { context, all, find: (name) => all.filter((item) => item.name === name) };
}

function bounds(root) {
  const result = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
  function visit(node) {
    if (node.geometry) {
      const { w, h, d, points } = node.geometry;
      const vertices = points ?? [-1, 1].flatMap((dx) => [-1, 1].flatMap((dy) => [-1, 1].map((dz) => ({ x: dx * w / 2, y: dy * h / 2, z: dz * d / 2 }))));
      for (const point of vertices) {
        let { x, y, z } = point;
        for (let current = node; current; current = current.parent) {
          const angle = current.rotation.y;
          [x, z] = [x * Math.cos(angle) + z * Math.sin(angle), -x * Math.sin(angle) + z * Math.cos(angle)];
          x += current.position.x;
          y += current.position.y;
          z += current.position.z;
        }
        for (const [axis, value] of [['X', x], ['Y', y], ['Z', z]]) {
          result[`min${axis}`] = Math.min(result[`min${axis}`], value);
          result[`max${axis}`] = Math.max(result[`max${axis}`], value);
        }
      }
    }
    node.children.forEach(visit);
  }
  visit(root);
  return result;
}

function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} should equal ${expected}`); }

test('hood stays 48 inches wide, tapers only in depth and keeps a flush rear plane', () => {
  const model = buildCookingWall();
  const surround = model.find('Plaster tapered hood surround')[0];
  for (const [localY, depth] of [[-1, 24 / 12], [1, 13 / 12]]) {
    const vertices = surround.geometry.points.filter((point) => Math.sign(point.y) === localY);
    close(Math.max(...vertices.map((p) => p.z)) - Math.min(...vertices.map((p) => p.z)), 4);
    close(Math.max(...vertices.map((p) => p.x)) - Math.min(...vertices.map((p) => p.x)), depth);
    close(bounds(surround).maxX, 37.3);
  }
  close(bounds(surround).minY, 6.5);
  close(bounds(surround).maxY, 8.85);
  close(bounds(model.find('Plaster hood ceiling cornice')[0]).maxY, 9);
  assert.equal(model.find('Hood walnut lower band').length, 0);
  assert.equal(model.find('Plain plaster hood lower edge')[0].material, surround.material);
  close(bounds(model.find('Plain plaster hood lower edge')[0]).minY, 6.3);
  assert.equal(model.find('Concealed hood insert underside').length, 1);
  assert.equal(model.find('Cooktop hood task-light strip').length, 1);
});

test('two frameless oak stacks have two tiers, eight Shaker doors and gold pulls', () => {
  const model = buildCookingWall();
  const stacks = model.all.filter((item) => item.name?.endsWith('upper stack'));
  assert.equal(stacks.length, 2);
  assert.equal(model.find('Full-overlay Shaker cabinet front').length, 8);
  assert.equal(model.find('Gold cabinet pull').length, 8);
  for (const stack of stacks) {
    close(stack.userData.widthInches, 27.575);
    assert.equal(stack.userData.construction, 'Frameless');
    assert.equal(stack.userData.finish, 'Stained white oak');
    const carcass = stack.children.find((item) => item.name === 'Cooktop upper cabinet carcass');
    close(bounds(carcass).minY, 4.55);
    close(bounds(carcass).maxY, 8.85);
    close(carcass.geometry.d, 1);
    assert.equal(carcass.material, model.context.cabinetFinish);
    close(bounds(stack).maxY, 9);
  }
  assert.equal(model.find('Cooktop under-cabinet task-light strip').length, 2);
});

test('upper cabinets touch the hood without overlap and leave the casing-end allowance', () => {
  const model = buildCookingWall();
  const hood = bounds(model.find('Kitchen cooktop hood')[0]);
  const prep = bounds(model.find('Cooktop prep-side upper stack')[0]);
  const mudroom = bounds(model.find('Cooktop mudroom-side upper stack')[0]);
  close(prep.maxZ, hood.minZ);
  close(mudroom.minZ, hood.maxZ);
  close(prep.minZ, 16.95 - model.context.cooktopRunWidth / 2 + 1.5 / 12);
  close(mudroom.maxZ, 16.95 + model.context.cooktopRunWidth / 2 - 1.5 / 12);
  close((prep.minZ + mudroom.maxZ) / 2, 16.95);
  close(bounds(model.find('Cooktop upper ceiling cornice')[0]).minX, bounds(model.find('Plaster hood ceiling cornice')[0]).minX);
});

test('Fridge wall inspection hides the new uppers together with the hood', () => {
  assert.match(source, /cooktopHood\.visible = name !== 'fridge';\s*cooktopUppers\.visible = name !== 'fridge';/);
});
