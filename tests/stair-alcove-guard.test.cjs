'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const layout = require('../assets/js/upstairs-layout.js');
const { getGuestEntryLayout, getGroundFloorDefaultPlan } = require('../assets/js/floor-plan-ground.js');
const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
const entry = getGuestEntryLayout();
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

function build() {
  const parts = [], beams = [];
  class Group { constructor() { this.userData = {}; } add() {} }
  const start = source.indexOf('  const exposedUpperGuard = new THREE.Group();');
  const end = source.indexOf('  for (const upper of [false, true])', start);
  assert.ok(start >= 0 && end > start);
  vm.runInNewContext(source.slice(start, end), {
    guestEntry: entry, black: {},
    THREE: { Group }, stairs: new Group(), stairOpening: layout.stairOpening(), stairDepth: layout.stairOpening().depth,
    outerStairRailZ: layout.stairOpening().depth - .08,
    stairFloorToFloor: 10, stairRise: 7.5 / 12, stairGoing: 10 / 12, stairRun: 70 / 12, landingHeight: 5, oak: {},
    stairBeam(name, start, end) { beams.push({ name, start, end }); },
    furnishing(name, x, z, rotation, elevation) { close(elevation, 0.005); return { name }; },
    box(parent, x, y, z, w, h, d) { const part = { x, y, z, w, h, d }; parts.push(part); return part; }
  });
  parts.beams = beams;
  return parts;
}

test('October 31 closet closes the north wall and moves powder access to the south end of the alcove', () => {
  const plan = getGroundFloorDefaultPlan();
  assert.deepEqual(plan.walls.find(([name]) => name === 'Powder north'), ['Powder north', 0, 35.1, 12.2, 35.1]);
  close(entry.powderDoor.z, 38);
  close(entry.powderDoor.width, 2.5);
  assert.equal(entry.powderDoor.height, 8);
  const opening = plan.walls.find(([name]) => name === 'Powder east').at(-1)[0];
  for (const [i, value] of [2.9, 5.4, 0, 8].entries()) close(opening[i], value);
  assert.match(source, /\[0, powderNorthZ, guestEntry\.coatCloset\.x \+ guestEntry\.coatCloset\.w, powderNorthZ\]/);
  assert.ok(plan.floors.some(f => f.room === 'Guest entry alcove' && f.x === 7.1 && f.z === 37.5 && f.w === 5.1 && f.d === 3.5));
});

test('complete upper-flight edge follows the nosings through the upstairs guard junction', () => {
  const parts = build(), beams = parts.beams;
  const handrails = beams.filter(b => b.name === 'Exposed upper-flight handrail');
  assert.equal(handrails.length, 2);
  close(handrails[0].start[0],70/12);
  close(handrails[0].start[1],5+7.5/12+3);
  assert.deepEqual(handrails[0].end, handrails[1].start);
  for(const beam of handrails)for(const [x,y] of [beam.start,beam.end])close(y,13-x*.75);
  assert.deepEqual(Array.from(handrails[1].end), [0, 13, layout.stairOpening().depth - .08]);
  const upper = require('../assets/js/floor-plan-upstairs.js').getUpstairsDefaultPlan(layout.stairOpening());
  const wall = upper.walls.find(w => w[0] === 'West bath north');
  for (const rail of handrails) for (const point of [rail.start, rail.end])
    close((wall[2] - .175 - (layout.stairOpening().z + point[2] + .06)) * 12, 1.24);
  assert.equal(beams.filter(b => b.name === 'Exposed upper-flight horizontal rail').length, 16);
  assert.equal(parts.filter(p => p.name === 'Exposed upper-flight guard post').length, 3);
});

test('restored solid closet wall replaces only the ground guard, without a buried rail or old wall-end trim exclusion', () => {
  assert.ok(!source.includes("furnishing('Guest entry stair-side guard'"));
  assert.ok(!source.includes('box(alcoveGuard,'));
  assert.ok(!source.includes('cover(new THREE.Vector2(guestEntry.stairGuard.x'));
  assert.equal(build().filter(p => /^Alcove stair/.test(p.name)).length, 0);
  assert.ok(source.includes('Retain protection above the restored wall'));
});

test('closet closure leaves the canonical stair footprint and retained upper guard endpoint unchanged', () => {
  const g = entry.stairGuard, opening = layout.stairOpening();
  close(g.endX, opening.x + opening.width);
  close((12.2 - g.endX) * 12, 26.3);
  close((g.endX - (7.45 + 12.2) / 2) * 12, 2.2);
  close((g.endX - g.x) * 12, 30.7);
  const plan = getGroundFloorDefaultPlan();
  assert.ok(plan.floors.some(f => f.x <= g.endX && f.x + f.w >= 12.2 && f.z <= opening.z && f.z + f.d >= opening.z + opening.depth),
    'Removed rail must back onto the continuous ground-floor strip beyond the stair void');
  close(entry.powder.z - 0.175 - opening.z - opening.depth, 1 / 12);
  const north = plan.walls.find(([name]) => name === 'Powder north');
  assert.ok(north[3] >= g.endX, 'Wall encloses the whole closet, not only the former rail span');
});

test('south alcove remains open to the hall with the same measured baseboard-to-baseboard approach', () => {
  const northFace = entry.alcove.z + 0.175 + 0.75 / 12;
  const southFace = entry.officeNorthZ - 0.175 - 0.75 / 12;
  close((southFace - northFace) * 12, 36.3);
  const z = (northFace + southFace) / 2;
  assert.ok(z - 1.5 > northFace && z + 1.5 < southFace, 'A modeled 36-inch-wide strip fits between baseboards; not occupied-use approval');
  const plan = getGroundFloorDefaultPlan();
  const east = plan.walls.find(([name]) => name === 'Guest coat closet east');
  close(east[4], entry.alcove.z);
  assert.ok(!plan.walls.some(([, x1, z1, x2, z2]) => x1 === 12.2 && x2 === 12.2 &&
    Math.min(z1, z2) < entry.officeNorthZ && Math.max(z1, z2) > entry.alcove.z), 'No wall closes the hall-facing alcove');
});

test('guest coat leaves close inside the wall and sweep clear of the jambs and each other', () =>
{
  class Group
  {
    constructor()
    {
      this.children = [];
      this.userData = {};
      this.position = { x: 0, y: 0, z: 0, set(x, y, z) { Object.assign(this, { x, y, z }); } };
      this.rotation = { x: 0, y: 0, z: 0 };
    }
    add(child) { child.parent = this; this.children.push(child); }
    traverse(fn) { fn(this); this.children.forEach(child => child.traverse(fn)); }
  }
  const box = (parent, x, y, z, width, height, depth) =>
  {
    const mesh = new Group();
    mesh.geometry = { width, height, depth };
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const roots = [];
  const context = {
    THREE: { Group }, guestEntry: entry, windowTrim: {}, cabinetFinish: {}, brass: {}, linen: {}, cream: {},
    box,
    cylinder(parent, x, y, z, radius, height) { return box(parent, x, y, z, radius * 2, height, radius * 2); },
    furnishing(name, x, z)
    {
      const group = new Group();
      group.name = name;
      group.position.set(x, 0, z);
      roots.push(group);
      return group;
    }
  };
  const doorStart = source.indexOf('  function singlePanelDoor('), doorEnd = source.indexOf('  function shakerFront(', doorStart);
  const pullStart = source.indexOf('  function cabinetPull('), pullEnd = source.indexOf('  function cabinetCupPull(', pullStart);
  const start = source.indexOf("  const guestCoats = furnishing('Guest coat closet'");
  const end = source.indexOf('  const powderDoor =', start);
  assert.ok(doorStart >= 0 && doorEnd > doorStart && pullStart >= 0 && pullEnd > pullStart && start >= 0 && end > start);
  vm.runInNewContext(source.slice(doorStart, doorEnd) + source.slice(pullStart, pullEnd) + source.slice(start, end), context);
  const hinges = roots[0].children.filter(part => part.name === 'Guest coat closet French door hinge');
  assert.equal(hinges.length, 2);
  const meshes = root =>
  {
    const result = [];
    root.traverse(item => { if (item.geometry) result.push(item); });
    return result;
  };
  const shape = mesh =>
  {
    const { width, height, depth } = mesh.geometry;
    let y = 0;
    for (let node = mesh; node; node = node.parent) y += node.position.y;
    const vertices = [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]].map(([x, z]) =>
    {
      for (let node = mesh; node; node = node.parent)
      {
        const c = Math.cos(node.rotation.y), s = Math.sin(node.rotation.y);
        [x, z] = [node.position.x + c * x + s * z, node.position.z - s * x + c * z];
      }
      return [x, z];
    });
    return { vertices, low: y - height / 2, high: y + height / 2 };
  };
  const overlaps = (a, b) =>
  {
    if (Math.min(a.high, b.high) - Math.max(a.low, b.low) <= 1e-6) return false;
    for (const polygon of [a.vertices, b.vertices]) for (let i = 0; i < polygon.length; i++)
    {
      const [x, z] = polygon[i], [nx, nz] = polygon[(i + 1) % polygon.length], axis = [z - nz, nx - x];
      const project = points => points.map(point => point[0] * axis[0] + point[1] * axis[1]);
      const p = project(a.vertices), q = project(b.vertices);
      if (Math.min(Math.max(...p), Math.max(...q)) - Math.max(Math.min(...p), Math.min(...q)) <= 1e-8) return false;
    }
    return true;
  };
  const rect = (minX, maxX, minZ, maxZ) => ({ vertices: [[minX, minZ], [maxX, minZ], [maxX, maxZ], [minX, maxZ]], low: 0, high: 8 });
  const { x, z, width } = entry.closetDoor, reveal = 0.125 / 12, casing = 3.5 / 12;
  const fixed = [
    rect(entry.coatCloset.x, x, z - .175, z + .175),
    rect(x + width, entry.coatCloset.x + entry.coatCloset.w, z - .175, z + .175),
    rect(entry.coatCloset.x - .175, entry.coatCloset.x + .175, entry.coatCloset.z, entry.officeNorthZ),
    rect(entry.coatCloset.x + entry.coatCloset.w - .175, entry.coatCloset.x + entry.coatCloset.w + .175, entry.coatCloset.z, z),
    ...roots[0].children.filter(part => part.geometry).map(shape),
    ...[-1, 1].flatMap(side =>
    {
      const a = z + side * .175, b = z + side * (.175 + .0625);
      return [rect(x - reveal - casing, x - reveal, Math.min(a, b), Math.max(a, b)),
        rect(x + width + reveal, x + width + reveal + casing, Math.min(a, b), Math.max(a, b))];
    })
  ];
  for (const hinge of hinges)
  {
    const leaf = hinge.children.find(part => part.userData.doorStyle);
    const leafShapes = leaf.children.filter(part => part.geometry).map(shape);
    close(Math.max(...leafShapes.flatMap(part => part.vertices.map(vertex => vertex[1]))), z + .175);
    close(Math.min(...leafShapes.flatMap(part => part.vertices.map(vertex => vertex[1]))), z + .175 - .13);
    const other = hinges.find(part => part !== hinge);
    for (let degrees = 0; degrees <= 90; degrees++)
    {
      hinge.rotation.y = degrees * Math.PI / 180 * hinge.userData.interactiveHouseDoor.openRotationSign;
      for (const mesh of meshes(hinge))
      {
        for (const [index, obstacle] of [...fixed, ...meshes(other).map(shape)].entries())
          assert.ok(!overlaps(shape(mesh), obstacle), `${mesh.name || mesh.parent.name} clears obstacle ${index} at ${degrees} degrees`);
      }
    }
    hinge.rotation.y = 0;
  }
});
