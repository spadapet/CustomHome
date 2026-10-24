function getUpstairsDefaultPlan(stairOpening) {
  const rooms = [
    { name: 'Primary bedroom', x: 0, z: 7.6, w: 14.2, d: 19, source: '13 ft 11 1/2 in x 19 ft' },
    { name: 'Primary bath', x: 13.2, z: 2.1, w: 12.5, d: 12.6, tile: true, source: '12 ft 6 in wide; traced bath/toilet envelope' },
    { name: 'Primary toilet', x: 10.2, z: 2.1, w: 3, d: 5.5, tile: true },
    { name: 'Primary closet', x: 14.2, z: 14.7, w: 16.8, d: 7.3, source: '16 ft 10 7/8 in wide' },
    { name: 'Bedroom 2', x: 31, z: 10, w: 13, d: 12, source: '13 ft x 12 ft' },
    { name: 'Bedroom 2 bath', x: 44, z: 10, w: 10, d: 5.4, tile: true },
    { name: 'Bedroom 2 closet', x: 44, z: 15.4, w: 8, d: 6.6 },
    { name: 'Loft', x: 36.5, z: 22, w: 15.5, d: 14.2, source: 'Approximately 15 ft 4 in x 13 ft 7 in; circulation adapted' },
    { name: 'Laundry (relocated)', x: 19, z: 26.6, w: 10.175, d: 9.6, tile: true, source: 'Moved to the former central stair area after the ground-floor stairs/kids-room swap' },
    { name: 'Shared bath west', x: 0, z: 36.2, w: 9.5, d: 5, tile: true, source: 'Source Room 20 interpreted as bath from furnished image' },
    { name: 'Shared bath east', x: 21.5, z: 36.2, w: 9.5, d: 5, tile: true },
    { name: 'Bedroom 3', x: 0, z: 41.2, w: 13, d: 12, source: '13 ft x 12 ft' },
    { name: 'Bedroom 3 closet', x: 13, z: 41.2, w: 5, d: 5.8 },
    { name: 'Bedroom 4', x: 18, z: 41.2, w: 13, d: 12, source: '13 ft x 12 ft' },
    { name: 'Bedroom 4 closet', x: 13, z: 47, w: 5, d: 6.2 },
    { name: 'Linen (relocated)', x: 29.175, z: 26.6, w: 7.325, d: 3.2 },
    { name: 'Mechanical (relocated)', x: 29.175, z: 29.8, w: 7.325, d: 6.4 }
  ];
  const floors = [];
  function slab(name, x, z, w, d, room = null) {
    floors.push({ name, x, z, w, d, room });
  }
  for (const room of rooms) {
    if (room.name === 'Primary bath') {
      slab(room.name, 13.2, 2.1, 12.5, 5.5, room.name);
      slab('Primary bath return', 14.2, 7.6, 11.5, 7.1, room.name);
    } else slab(room.name, room.x, room.z, room.w, room.d, room.name);
  }
  slab('Primary closet return', 25.7, 10, 5.3, 4.7, 'Primary closet');
  slab('North hall', 14.2, 22, 22.3, 4.6);
  const arrivalLeft = stairOpening.x + stairOpening.width;
  const arrivalDepth = stairOpening.depth - 44 / 12 - 0.25;
  const arrival = { x: arrivalLeft, z: stairOpening.z + stairOpening.depth - arrivalDepth, w: 44 / 12, d: arrivalDepth };
  slab('West hall', arrivalLeft + arrival.w, stairOpening.z, 19 - arrivalLeft - arrival.w, stairOpening.depth);
  slab('North stair edge', 0, 26.6, 19, stairOpening.z - 26.6);
  slab('West stair edge', 0, stairOpening.z, stairOpening.x, stairOpening.depth);
  slab('North arrival approach', arrivalLeft, stairOpening.z, arrival.w, stairOpening.depth - arrivalDepth);
  slab('South hall', 9.5, 36.2, 12, 5);
  slab('South landing connection', 0, stairOpening.z + stairOpening.depth, 19, 36.2 - stairOpening.z - stairOpening.depth);
  const door = (start, width = 3) => [start, start + width, 0, 8];
  const win = (start, width = 4) => [start, start + width, 3, 8];
  const walls = [
    ['Primary west', 0, 7.6, 0, 26.6, [win(3), win(12)], [-1]],
    ['Primary north', 0, 7.6, 10.2, 7.6, [], [1]],
    ['Primary suite entry', 14.2, 7.6, 14.2, 26.6, [door(1, 2.5), door(9.1, 2.5), door(15.4)]],
    ['Primary south', 0, 26.6, 14.2, 26.6],
    ['Toilet west', 10.2, 2.1, 10.2, 7.6, [], [-1]],
    ['Bath north', 10.2, 2.1, 25.7, 2.1, [win(7, 3)], [1]],
    ['Toilet partition', 13.2, 2.1, 13.2, 7.6, [door(2.4, 2.5)]],
    ['Toilet south', 10.2, 7.6, 14.2, 7.6],
    ['Bath east', 25.7, 2.1, 25.7, 14.7, [], [1]],
    ['Bath south', 14.2, 14.7, 25.7, 14.7],
    ['Closet north return', 25.7, 10, 31, 10, [], [1]],
    ['Primary closet east', 31, 10, 31, 22, [door(7.8, 2.5)]],
    ['Primary closet south', 14.2, 22, 31, 22],
    ['Bedroom 2 north', 31, 10, 44, 10, [win(4.5)], [1]],
    ['Bedroom 2 east', 44, 10, 44, 22, [door(1, 2.5), door(7.4, 2.5)]],
    ['Bedroom 2 south', 31, 22, 44, 22, [door(0.8)]],
    ['Bath 2 north', 44, 10, 54, 10, [win(4, 2)], [1]],
    ['Bath 2 east', 54, 10, 54, 15.4, [], [1]],
    ['Bath 2 south', 44, 15.4, 54, 15.4],
    ['Closet 2 east', 52, 15.4, 52, 22, [], [1]],
    ['Closet 2 south', 44, 22, 52, 22],
    ['Loft east', 52, 22, 52, 36.2, [win(3), win(9)], [1]],
    ['Loft west storage', 36.5, 26.6, 36.5, 36.2, [door(5, 2.5)]],
    ['Stairwell west', 0, 26.6, 0, 41.2, [win(3, 3)], [-1]],
    ['Laundry entry', 19, 26.6, 19, 36.2, [door(5.3)]],
    ['Laundry north', 19, 26.6, 29.175, 26.6],
    ['Laundry south', 19, 36.2, 21.5, 36.2],
    ['West bath north', 0, 36.2, 9.5, 36.2],
    ['West bath entry', 9.5, 36.2, 9.5, 41.2, [door(1.2, 2.5)]],
    ['East bath north', 21.5, 36.2, 31, 36.2],
    ['East bath entry', 21.5, 36.2, 21.5, 41.2, [door(1.2, 2.5)]],
    ['Bedroom 3 north', 0, 41.2, 13, 41.2, [door(9.3)]],
    ['Bedroom 3 west', 0, 41.2, 0, 53.2, [win(4)], [-1]],
    ['Bedrooms south', 0, 53.2, 31, 53.2, [win(4.5), win(22.5)], [-1]],
    ['Bedroom 3 closet', 13, 41.2, 13, 53.2, [door(1.1, 2.5)]],
    ['Closet divider', 13, 47, 18, 47],
    ['Bedroom 4 closet', 18, 41.2, 18, 53.2, [door(7.2, 2.5)]],
    ['Bedroom 4 north', 13, 41.2, 31, 41.2, [door(5.7)]],
    ['Bedroom 4 east', 31, 36.2, 31, 53.2],
    ['Storage north', 29.175, 26.6, 36.5, 26.6, [door(2.2, 2.5)]],
    ['Linen south', 29.175, 29.8, 36.5, 29.8],
    ['Storage west', 29.175, 26.6, 29.175, 36.2],
    ['Storage south', 29.175, 36.2, 36.5, 36.2],
    ['Loft south exterior', 36.5, 36.2, 52, 36.2, [], [-1]]
  ];
  const windows = [
    ['Primary west 1', 0.1, 12.6, 4, -Math.PI / 2, -1],
    ['Primary west 2', 0.1, 21.6, 4, -Math.PI / 2, -1],
    ['Primary bath', 18.7, 2.2, 3, 0, 1],
    ['Bedroom 2', 37.5, 10.1, 4, 0, 1],
    ['Bath 2', 49, 10.1, 2, 0, 1],
    ['Loft 1', 51.9, 27, 4, -Math.PI / 2, 1],
    ['Loft 2', 51.9, 33, 4, -Math.PI / 2, 1],
    ['Stairwell', 0.1, 31.1, 3, -Math.PI / 2, -1],
    ['Bedroom 3 west', 0.1, 47.2, 4, -Math.PI / 2, -1],
    ['Bedroom 3 south', 6.5, 53.1, 4, 0, -1],
    ['Bedroom 4 south', 24.5, 53.1, 4, 0, -1]
  ];
  return { rooms, floors, walls, windows, arrival, stairs: { ...stairOpening } };
}

function buildUpstairsModel(THREE, { box, mat, wood, wallMaterial, windowTrim, oak, cream, black, steel, linen, windowFrame, openingCasing }, stairOpening, elevation, edits = UpstairsLayout.empty()) {
  const baseline = getUpstairsDefaultPlan(stairOpening);
  const plan = UpstairsLayout.resolve(baseline, edits);
  const { rooms } = plan;
  const group = new THREE.Group();
  group.name = 'Upstairs adapted dimensioned-plan study';
  group.position.y = elevation;
  group.visible = false;
  group.userData = { elevationFeet: elevation, ceilingHeightFeet: 9, stairRegistration: 'Relocated west stair, east-side arrival; editable upstairs partitions', provisional: true };
  const areas = [];
  const tile = mat('#c9c6bc');
  for (const floor of plan.floors) {
    const material = rooms.find((room) => room.name === floor.room)?.tile ? tile : wood;
    const mesh = box(group, floor.x + floor.w / 2, -0.12, floor.z + floor.d / 2, floor.w, 0.24, floor.d, material);
    mesh.name = `Upstairs floor: ${floor.name}`;
    mesh.userData.walkSurface = true;
    areas.push({ x: floor.x, z: floor.z, w: floor.w, d: floor.d, elevation });
  }
  areas.push({ ...baseline.arrival, elevation });
  const wallHeight = 9;
  for (const wall of plan.walls) {
    const { name, x1, z1, x2, z2, openings, sides, thickness } = wall;
    const length = Math.hypot(x2 - x1, z2 - z1);
    const parent = new THREE.Group();
    parent.name = `Upstairs wall: ${name}`;
    parent.position.set(x1, 0, z1);
    parent.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    group.add(parent);
    function section(from, to, bottom, top) {
      if (to <= from || top <= bottom) return;
      box(parent, (from + to) / 2, (bottom + top) / 2, 0, to - from, top - bottom, thickness, wallMaterial).name = 'Upstairs partition';
      if (bottom !== 0) return;
      const casing = (3.5 + 0.125) / 12;
      const start = from + (openings.some(([a, b, low]) => low === 0 && Math.abs(b - from) < 0.001) ? casing : 0);
      const end = to - (openings.some(([a, b, low]) => low === 0 && Math.abs(a - to) < 0.001) ? casing : 0);
      if (end <= start) return;
      for (const side of sides) box(parent, (start + end) / 2, 1 / 3, side * (thickness / 2 + 0.03125), end - start, 2 / 3, 0.0625, windowTrim).name = 'Upstairs white baseboard';
    }
    let cursor = 0;
    for (const [start, end, bottom, top] of openings) {
      section(cursor, start, 0, wallHeight);
      section(start, end, 0, bottom);
      section(start, end, top, wallHeight);
      if (bottom === 0) for (const side of sides) openingCasing(parent, (start + end) / 2, 0, end - start, top, thickness / 2, side);
      cursor = end;
    }
    section(cursor, length, 0, wallHeight);
  }
  for (const [name, x, z, width, rotation, side] of plan.windows) windowFrame(`Upstairs ${name} window`, x, z, width, 5, 3, rotation, group, side);
  const furnitureAnchors = [];
  function furniture(name, x, z, rotation = 0) {
    const item = new THREE.Group();
    item.name = `Upstairs ${name}`;
    const anchor = name === 'Stair opening guard' ? { x, z } : UpstairsLayout.furniturePosition(baseline, plan, x, z);
    item.position.set(anchor.x, 0, anchor.z);
    item.rotation.y = rotation;
    group.add(item);
    if (name !== 'Stair opening guard') furnitureAnchors.push({ item, x, z });
    return item;
  }
  for (const [name, x, z, width, rotation] of [
    ['Primary bed', 4.5, 16.8, 6.4, Math.PI / 2],
    ['Bedroom 2 bed', 37.5, 14.5, 5.3, Math.PI],
    ['Bedroom 3 bed', 4, 47.2, 5.3, Math.PI / 2],
    ['Bedroom 4 bed', 26.5, 47.2, 5.3, -Math.PI / 2]
  ]) {
    const bed = furniture(name, x, z, rotation);
    box(bed, 0, 0.6, 0, width, 0.8, 7, oak);
    box(bed, 0, 1.15, 0, width - 0.15, 0.5, 6.8, cream, true);
    box(bed, 0, 1.45, 1, width - 0.12, 0.15, 4.5, linen);
    box(bed, 0, 1.6, -2.5, width - 0.5, 0.3, 1.3, cream, true);
    box(bed, 0, 1.7, -3.5, width, 2, 0.18, oak);
  }
  function vanity(name, x, z, width, rotation = 0) {
    const item = furniture(name, x, z, rotation);
    box(item, 0, 1.3, 0, width, 2.6, 1.8, oak);
    box(item, 0, 2.7, 0, width + 0.05, 0.15, 1.9, cream);
    box(item, 0, 2.8, 0, width * 0.65, 0.08, 1.1, windowTrim, true);
    box(item, 0, 4.7, -0.85, width - 0.1, 2.5, 0.08, steel);
  }
  function toilet(name, x, z, rotation = 0) {
    const item = furniture(name, x, z, rotation);
    box(item, 0, 1.4, -0.6, 1.5, 2.5, 0.6, windowTrim, true);
    box(item, 0, 0.8, 0.1, 1.4, 1.5, 1.7, windowTrim, true);
    box(item, 0, 1.58, 0.1, 1.2, 0.08, 1.5, cream, true);
  }
  vanity('Primary double vanity', 18, 3.3, 5.5);
  vanity('Bedroom 2 vanity', 47, 14.1, 3, Math.PI);
  vanity('West bath vanity', 1.8, 37.3, 2.5);
  vanity('East bath vanity', 29.6, 38.7, 2.5, -Math.PI / 2);
  toilet('Primary toilet', 11.7, 3.6);
  toilet('Bedroom 2 toilet', 50, 13);
  toilet('West bath toilet', 5, 37.9);
  toilet('East bath toilet', 26.5, 38.2);
  for (const [name, x, z, w, d] of [
    ['Primary shower', 23.3, 4.3, 3.5, 3.8],
    ['Bedroom 2 shower', 52.4, 12.7, 2.5, 4.5],
    ['West bath shower', 7.7, 38.7, 3, 4.4],
    ['East bath shower', 23.3, 38.7, 3, 4.4]
  ]) {
    const item = furniture(name, x, z);
    box(item, 0, 0.12, 0, w, 0.24, d, cream);
    box(item, 0, 3, -d / 2 + 0.08, w, 6, 0.12, tile);
    box(item, 0, 5.5, -d / 2 + 0.2, 0.5, 0.06, 0.5, steel);
  }
  const tub = furniture('Primary freestanding tub', 23.2, 11.2);
  box(tub, 0, 1, 0, 2.8, 2, 5.2, windowTrim, true);
  box(tub, 0, 1.9, 0, 2.25, 0.15, 4.4, cream, true);
  for (const x of [21.3, 24.6]) {
    const machine = furniture(x < 23 ? 'Washer' : 'Dryer', x, 28.5);
    box(machine, 0, 1.6, 0, 2.8, 3.2, 2.8, windowTrim);
    box(machine, 0, 1.5, 1.43, 1.8, 1.8, 0.08, black, true);
  }
  const laundryCounter = furniture('Laundry folding counter', 24.1, 35);
  box(laundryCounter, 0, 1.4, 0, 7.5, 2.8, 1.7, oak);
  box(laundryCounter, 0, 2.9, 0, 7.6, 0.15, 1.8, cream);
  const furnace = furniture('Mechanical equipment reservation', 31, 34.6);
  box(furnace, 0, 3, 0, 2.5, 6, 2.7, steel);
  for (const [name, x, z, width, rotation] of [
    ['Primary closet rail', 22, 15.7, 12, 0],
    ['Bedroom 2 closet rail', 50.9, 18.7, 5, -Math.PI / 2],
    ['Bedroom 3 closet rail', 15.5, 46, 4, Math.PI],
    ['Bedroom 4 closet rail', 15.5, 52.2, 4, Math.PI],
    ['Linen shelves', 33, 29, 5.5, Math.PI]
  ]) {
    const item = furniture(name, x, z, rotation);
    for (const y of [1, 3, 5.5, 7.3]) box(item, 0, y, 0, width, 0.08, 1.3, oak);
  }
  const loftSofa = furniture('Loft sofa', 47, 32, Math.PI);
  box(loftSofa, 0, 0.9, 0, 6, 1.2, 2.8, linen, true);
  box(loftSofa, 0, 1.8, -1.2, 6, 1.6, 0.3, linen, true);
  const loftDesk = furniture('Loft desk', 50.8, 24.8, -Math.PI / 2);
  box(loftDesk, 0, 2.5, 0, 4.5, 0.15, 1.8, oak);
  for (const x of [-2, 2]) box(loftDesk, x, 1.25, 0, 0.12, 2.5, 1.6, black);
  // Leave the east-side upper arrival open to the hall; guard the remaining void edges.
  const guardY = 1.5;
  const left = stairOpening.x;
  const right = left + stairOpening.width;
  const front = stairOpening.z;
  const back = front + stairOpening.depth;
  for (const [x1, z1, x2, z2] of [[left, front, right, front], [left, front, left, back], [left, back, right, back], [right, front, right, baseline.arrival.z]]) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const rail = furniture('Stair opening guard', (x1 + x2) / 2, (z1 + z2) / 2, -Math.atan2(z2 - z1, x2 - x1));
    for (const y of [0.7, 1.5, 2.3, 3]) box(rail, 0, y, 0, length, 0.07, 0.07, black);
    for (let position = -length / 2; position <= length / 2 + 0.01; position += length / Math.ceil(length / 3)) box(rail, position, guardY, 0, 0.08, 3, 0.08, black);
  }
  // The upper flight stays visible below this level without duplicating its arrival slab.
  const labelMaterial = new THREE.SpriteMaterial({ color: '#ffffff', transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const labels = new THREE.Group();
  labels.name = 'Upstairs room labels';
  group.add(labels);
  for (const room of rooms) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Upstairs room labels require a 2D canvas context.');
    context.fillStyle = '#30483c';
    context.font = 'bold 36px sans-serif';
    context.textAlign = 'center';
    context.fillText(room.name, 256, 35);
    context.font = '28px sans-serif';
    context.fillText(`${room.w.toFixed(1)} x ${room.d.toFixed(1)} ft`, 256, 66);
    const material = labelMaterial.clone();
    material.map = new THREE.CanvasTexture(canvas);
    material.map.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(material);
    sprite.name = `Room label: ${room.name}`;
    sprite.raycast = () => {};
    sprite.position.set(room.x + room.w / 2, wallHeight + 0.3, room.z + room.d / 2);
    sprite.scale.set(10, 1.875, 1);
    labels.add(sprite);
  }
  const coordinationWarnings = [];
  group.updateMatrixWorld(true);
  for (const { item, x, z } of furnitureAnchors) {
    const original = baseline.rooms.filter((room) => x >= room.x && x <= room.x + room.w && z >= room.z && z <= room.z + room.d).sort((a, b) => a.w * a.d - b.w * b.d)[0];
    if (!original || !edits.rooms.some((room) => room.name === original.name)) continue;
    const room = rooms.find((room) => room.name === original.name);
    const bounds = new THREE.Box3().setFromObject(item);
    if (bounds.min.x < room.x + 0.175 || bounds.max.x > room.x + room.w - 0.175 || bounds.min.z < room.z + 0.175 || bounds.max.z > room.z + room.d - 0.175) coordinationWarnings.push(`${item.name} reaches a changed room edge; reposition/check its full operating clearance.`);
  }
  function dispose() {
    group.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.isSprite) {
        object.material.map.dispose();
        object.material.dispose();
      }
    });
    tile.dispose();
    labelMaterial.dispose();
  }
  return { group, rooms, areas, labels, plan, baseline, dispose, coordinationWarnings, start: [16.5, 33], mapLabels: rooms.map((room) => [room.name, room.x + room.w / 2, room.z + room.d / 2]) };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getUpstairsDefaultPlan };
