// Shared by the furnished plan and masonry elevation; nominal 3060 is NOT
// implied: these are 36 x 60 inch concept envelopes, pending product selection.
function getUpstairsFrontWindows() {
  return [4.5, 8.5, 22.5, 26.5].map((center, index) => ({
    name: `Bedroom ${index < 2 ? 3 : 4} south ${index % 2 ? 'right' : 'left'}`,
    center, width: 3, sill: 3, height: 5
  }));
}

function getUpstairsSideWindows() {
  // Furnished frame centers; their 0.1 ft normal inset is ignored when
  // projecting the same openings onto the exterior masonry wall centerline.
  return [
    ['Primary west 1', 0.1, 12.6, 4, -Math.PI / 2, -1],
    ['Primary west 2', 0.1, 21.6, 4, -Math.PI / 2, -1],
    ['Primary bath', 18.7, 2.2, 3, 0, 1],
    ['Bedroom 2', 37.5, 10.1, 4, 0, 1],
    ['Bath 2', 49, 10.1, 2, 0, 1],
    ['Loft 1', 51.9, 27, 4, -Math.PI / 2, 1],
    ['Loft 2', 51.9, 33, 4, -Math.PI / 2, 1],
    ['Loft south 1', 40.75, 36.1, 4, 0, -1],
    ['Loft south 2', 47.75, 36.1, 4, 0, -1],
    ['Stairwell', 0.1, 31.1, 3, -Math.PI / 2, -1],
    ['Bedroom 3 west', 0.1, 47.2, 4, -Math.PI / 2, -1]
  ];
}

function getUpstairsExteriorOpenings(x1, z1, x2, z2, elevation = 10) {
  const dx = x2 - x1, dz = z2 - z1, length = Math.hypot(dx, dz);
  return getUpstairsSideWindows().flatMap(([name, x, z, width]) => {
    const center = ((x - x1) * dx + (z - z1) * dz) / length;
    const normalDistance = Math.abs((x - x1) * dz - (z - z1) * dx) / length;
    return normalDistance < 0.15 && center - width / 2 >= 0 && center + width / 2 <= length
      ? [{ name, center, width, sill: elevation + 3, height: 5 }] : [];
  }).sort((a, b) => a.center - b.center);
}

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
    { name: 'Laundry (relocated)', x: 24, z: 27.6, w: 7.5, d: 8.6, tile: true, source: 'Enclosed service core east of the open arrival gallery' },
    { name: 'Shared bath west', x: 0, z: 36.2, w: 9.5, d: 5, tile: true, source: 'Source Room 20 interpreted as bath from furnished image' },
    { name: 'Shared bath east', x: 21.5, z: 36.2, w: 9.5, d: 5, tile: true },
    { name: 'Bedroom 3', x: 0, z: 41.2, w: 13, d: 12, source: '13 ft x 12 ft' },
    { name: 'Bedroom 3 closet', x: 13, z: 41.2, w: 5, d: 5.8 },
    { name: 'Bedroom 4', x: 18, z: 41.2, w: 13, d: 12, source: '13 ft x 12 ft' },
    { name: 'Bedroom 4 closet', x: 13, z: 47, w: 5, d: 6.2 },
    { name: 'Linen (relocated)', x: 31.5, z: 27.6, w: 5, d: 3.2 },
    { name: 'Mechanical (relocated)', x: 31.5, z: 30.8, w: 5, d: 5.4 },
    { name: 'Arrival gallery', x: 13.675, z: 27.6, w: 10.325, d: 8.6, circulationOnly: true }
  ];
  const floors = [];
  function slab(name, x, z, w, d, room = null) {
    floors.push({ name, x, z, w, d, room });
  }
  for (const room of rooms) {
    if (room.circulationOnly) continue; // Irregular gallery floor is assembled below.
    if (room.name === 'Primary bath') {
      slab(room.name, 13.2, 2.1, 12.5, 5.5, room.name);
      slab('Primary bath return', 14.2, 7.6, 11.5, 7.1, room.name);
    } else slab(room.name, room.x, room.z, room.w, room.d, room.name);
  }
  slab('Primary closet return', 25.7, 10, 5.3, 4.7, 'Primary closet');
  slab('North gallery', 14.2, 22, 22.3, 5.6);
  const arrivalLeft = stairOpening.x + stairOpening.width;
  const arrivalDepth = stairOpening.depth - 44 / 12 - 0.25;
  const arrival = { x: arrivalLeft, z: stairOpening.z + stairOpening.depth - arrivalDepth, w: 44 / 12, d: arrivalDepth };
  slab('Arrival gallery', arrivalLeft + arrival.w, 27.6, 24 - arrivalLeft - arrival.w, 36.2 - 27.6);
  slab('Gallery north return', arrivalLeft + arrival.w, stairOpening.z, 14.2 - arrivalLeft - arrival.w, 27.6 - stairOpening.z);
  slab('North stair edge', 0, 26.6, 14.2, stairOpening.z - 26.6);
  slab('West stair edge', 0, stairOpening.z, stairOpening.x, stairOpening.depth);
  slab('North arrival approach', arrivalLeft, stairOpening.z, arrival.w, stairOpening.depth - arrivalDepth);
  slab('South hall', 9.5, 36.2, 12, 5);
  slab('South landing connection', 0, stairOpening.z + stairOpening.depth, arrivalLeft + arrival.w, 36.2 - stairOpening.z - stairOpening.depth);
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
    ['Primary closet east', 31, 10, 31, 22],
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
    ['Loft west storage', 36.5, 27.6, 36.5, 36.2, [door(3.8, 2.5)]],
    ['Stairwell west', 0, 26.6, 0, 41.2, [win(3, 3)], [-1]],
    ['Laundry entry', 24, 27.6, 24, 36.2, [door(3.6)]],
    ['Laundry north', 24, 27.6, 31.5, 27.6],
    ['Laundry south', 31, 36.2, 31.5, 36.2],
    ['West bath north', 0, 36.2, 9.5, 36.2],
    ['West bath entry', 9.5, 36.2, 9.5, 41.2, [door(1.2, 2.5)]],
    ['East bath north', 21.5, 36.2, 31, 36.2],
    ['East bath entry', 21.5, 36.2, 21.5, 41.2, [door(1.2, 2.5)]],
    ['Bedroom 3 north', 0, 41.2, 13, 41.2, [door(10, 2.5)]],
    ['Bedroom 3 west', 0, 41.2, 0, 53.2, [win(4)], [-1]],
    ['Bedrooms south', 0, 53.2, 31, 53.2, getUpstairsFrontWindows().map(w => [w.center - w.width / 2, w.center + w.width / 2, w.sill, w.sill + w.height]), [-1]],
    ['Bedroom 3 closet', 13, 41.2, 13, 53.2, [door(0.6, 2.5)]],
    ['Closet divider', 13, 47, 18, 47],
    ['Bedroom 4 closet', 18, 41.2, 18, 53.2, [door(8, 2.5)]],
    ['Bedroom 4 north', 13, 41.2, 31, 41.2, [door(5.5, 2.5)]],
    ['Bedroom 4 east', 31, 36.2, 31, 53.2],
    ['Storage north', 31.5, 27.6, 36.5, 27.6, [door(1.25, 2.5)]],
    ['Linen south', 31.5, 30.8, 36.5, 30.8],
    ['Storage west', 31.5, 27.6, 31.5, 36.2],
    ['Storage south', 31.5, 36.2, 36.5, 36.2],
    ['Loft south exterior', 36.5, 36.2, 52, 36.2, [win(2.25), win(9.25)], [-1]]
  ];
  const windows = [
    ...getUpstairsSideWindows(),
    ...getUpstairsFrontWindows().map(w => [w.name, w.center, 53.1, w.width, 0, -1])
  ];
  return { rooms, floors, walls, windows, arrival, stairs: { ...stairOpening } };
}

function buildUpstairsModel(THREE, { box, mat, wood, wallMaterial, windowTrim, oak, cream, black, steel, linen, windowFrame, openingCasing, singlePanelDoor }, stairOpening, elevation, edits = UpstairsLayout.empty()) {
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
  // Fixed stair arrival follows the canonical opening, not saved room edits.
  // Match the adjoining hardwood slab and its floor visibility; keep access.
  const arrival = baseline.arrival;
  const arrivalFloor = box(group, arrival.x + arrival.w / 2, -0.12, arrival.z + arrival.d / 2, arrival.w, 0.24, arrival.d, wood);
  arrivalFloor.name = 'Upstairs floor: Stair arrival';
  arrivalFloor.userData.walkSurface = true;
  areas.push({ ...arrival, elevation });
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
      if (bottom === 0) for (const side of sides) {
        // Slim side boards at the two front entries keep the projecting head
        // caps clear of the perpendicular bathroom/closet wall returns.
        const sideWidth = ['Bedroom 3 north', 'Bedroom 4 north'].includes(name) ? 2.5 / 12 : 3.5 / 12;
        openingCasing(parent, (start + end) / 2, 0, end - start, top, thickness / 2, side, false, { sideWidth });
      }
      if (bottom === 0 && end - start <= 3.05) {
        // Deliberate 90-degree operating envelopes, not a 180-degree fold-back
        // through casings, fixtures or furniture. Default leaves remain closed.
        const swingSign = ['Primary suite entry', 'Loft west storage', 'Laundry entry', 'East bath entry', 'Bedroom 3 north', 'Bedroom 4 north'].includes(name) ? -1 : 1;
        const closedRotationY = 0;
        const hinge = new THREE.Group();
        hinge.name = `Upstairs ${name} interior door hinge`;
        hinge.position.set(closedRotationY ? end - 0.02 : start + 0.02, 0, 0);
        hinge.rotation.y = closedRotationY;
        hinge.userData = { interactiveHouseDoor: { operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 90, openRotationSign: swingSign, closedRotationY }, nominalOpeningFeet: end - start };
        parent.add(hinge);
        const width = end - start - 0.04;
        singlePanelDoor(hinge, width / 2, top / 2, 0, width, top - 0.04, 0.13, windowTrim);
        for (const side of [-1, 1]) box(hinge, width - 0.22, 3, side * 0.1, 0.12, 0.12, 0.08, steel).name = 'Upstairs interior door handle';
      }
      cursor = end;
    }
    section(cursor, length, 0, wallHeight);
  }
  for (const [name, x, z, width, rotation, side] of plan.windows) windowFrame(`Upstairs ${name} window`, x, z, width, 5, 3, rotation, group, side, { installationWalls: plan.walls, frontGrid: rotation === 0 && side === -1 });
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
  function cabinet(parent, x, z, width, height, depth, drawers = 3, hinged = false) {
    box(parent, x, height / 2, z, width, height, depth, oak).userData.cabinetBody = 'z+';
    for (let row = 0; row < drawers; row++) {
      const y = (row + 0.5) * (height - 0.2) / drawers + 0.1;
      const front = box(parent, x, y, z + depth / 2 + 0.035, width - 0.12, (height - 0.2) / drawers - 0.06, 0.07, cream);
      front.name = hinged ? 'Upstairs cupboard door' : 'Upstairs drawer front';
      front.userData = { cabinetFront: true, width: width - 0.12, height: (height - 0.2) / drawers - 0.06, ...(hinged ? {} : { drawerTravelFeet: depth - 0.2 }) };
      box(front, 0, 0, 0.075, Math.min(0.7, width / 3), 0.05, 0.08, black).name = 'Upstairs cabinet handle';
    }
  }
  function lamp(parent, x, y, z) {
    box(parent, x, y + 0.04, z, 0.55, 0.08, 0.55, black, true);
    box(parent, x, y + 0.45, z, 0.06, 0.8, 0.06, steel);
    box(parent, x, y + 0.95, z, 0.8, 0.65, 0.8, cream, true);
  }
  function chair(name, x, z, rotation = 0) {
    const item = furniture(name, x, z, rotation);
    box(item, 0, 1.5, 0, 1.65, 0.22, 1.65, linen, true);
    box(item, 0, 2.15, 0.75, 1.65, 1.3, 0.15, oak);
    for (const dx of [-0.65, 0.65]) for (const dz of [-0.65, 0.65]) box(item, dx, 0.7, dz, 0.1, 1.4, 0.1, oak);
    return item;
  }
  function wallLamp(name, x, z, rotation = 0) {
    const item = furniture(name, x, z, rotation);
    item.userData.wallMounted = true;
    box(item, 0, 5.2, 0, 0.28, 0.65, 0.08, black).name = 'Wall lamp backplate';
    box(item, 0, 5.2, 0.25, 0.08, 0.08, 0.5, steel);
    box(item, 0, 5.15, 0.5, 0.55, 0.45, 0.45, cream, true).name = 'Wall lamp shade';
    return item;
  }
  function backDeskToWall(item, wallName, depth) {
    const wall = plan.walls.find((wall) => wall.name === wallName);
    const sine = Math.sin(item.rotation.y), cosine = Math.cos(item.rotation.y);
    const distance = wall.thickness / 2 + depth / 2;
    if (Math.abs(sine) > 0.5) item.position.x = wall.x1 + sine * distance;
    else item.position.z = wall.z1 + cosine * distance;
  }
  function desk(name, x, z, rotation = 0, wallName = null) {
    const item = furniture(`${name} writing desk`, x, z, rotation);
    if (wallName) backDeskToWall(item, wallName, 1.8);
    box(item, 0, 2.5, 0, 4, 0.14, 1.8, oak).name = 'Writing desktop';
    for (const dx of [-1.8, 1.8]) box(item, dx, 1.25, 0, 0.12, 2.5, 1.6, black);
    const sine = Math.sin(rotation), cosine = Math.cos(rotation);
    const seat = chair(`${name} desk chair`, x + sine * 1.9, z + cosine * 1.9, rotation);
    const light = wallLamp(`${name} desk wall lamp`, x - sine * 1.05, z - cosine * 1.05, rotation);
    if (wallName) {
      seat.position.set(item.position.x + sine * 1.9, 0, item.position.z + cosine * 1.9);
      // Backplate rear meets paint; the arm/shade project into the room.
      light.position.set(item.position.x - sine * 0.86, 0, item.position.z - cosine * 0.86);
    }
  }
  function hangingBay(name, x, z, width, rotation = 0, double = false) {
    const item = furniture(name, x, z, rotation);
    item.userData = { storageDepthFeet: 2, continuousRods: true, doubleHang: double };
    for (const dx of [-width / 2, width / 2]) box(item, dx, 3.7, 0, 0.09, 7.4, 2, oak);
    box(item, 0, 7.35, 0, width, 0.1, 2, oak).userData.closetCanopy = true;
    for (const y of double ? [3.4, 6.8] : [6.5]) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, width - 0.15, 12), steel);
      rod.rotation.z = Math.PI / 2;
      rod.position.set(0, y, 0.15);
      rod.name = 'Continuous hanging rod';
      item.add(rod);
      const length = double ? 2.6 : 4.8;
      for (let dx = -width / 2 + 0.35, index = 0; dx < width / 2 - 0.2; dx += 0.32, index++) {
        box(item, dx, y - 0.16, 0.15, 0.045, 0.12, 1.35, oak);
        box(item, dx, y - length / 2 - 0.25, 0.15, 0.12, length, 1.55, index % 3 === 0 ? linen : index % 3 === 1 ? cream : windowTrim, true);
      }
    }
    return item;
  }
  function shelving(name, x, z, width, rotation = 0) {
    const item = furniture(name, x, z, rotation);
    for (const dx of [-width / 2, width / 2]) box(item, dx, 3.6, 0, 0.09, 7.2, 1.3, oak);
    for (const y of [0.3, 1.7, 3.1, 4.5, 5.9, 7.2]) {
      box(item, 0, y, 0, width, 0.09, 1.3, oak);
      if (y < 7) for (const dx of [-width / 4, width / 4]) {
        for (let fold = 0; fold < 3; fold++) box(item, dx, y + 0.13 + fold * 0.12, 0, width * 0.35, 0.12, 0.85, fold % 2 ? linen : cream, true);
      }
    }
    return item;
  }
  for (const [name, x, z, mattressWidth, mattressLength, rotation] of [
    ['Primary bed', 5, 22.75, 5, 80 / 12, Math.PI],
    ['Bedroom 2 bed', 38, 18.3, 4.5, 6.25, Math.PI],
    ['Bedroom 3 bed', 4.8, 44.9, 4.5, 6.25, 0],
    ['Bedroom 4 bed', 27.3, 47.2, 4.5, 6.25, -Math.PI / 2]
  ]) {
    const bed = furniture(name, x, z, rotation);
    const width = mattressWidth + 0.2, length = mattressLength + 0.2;
    bed.userData = { mattressWidthInches: mattressWidth * 12, mattressLengthInches: mattressLength * 12 };
    box(bed, 0, 0.6, 0, width, 0.8, length, oak);
    box(bed, 0, 1.15, 0, mattressWidth, 0.5, mattressLength, cream, true).name = 'Bed mattress';
    box(bed, 0, 1.45, 1, width - 0.12, 0.15, 4.5, linen);
    box(bed, 0, 1.6, -2.5, width - 0.5, 0.3, 1.3, cream, true);
    box(bed, 0, 1.7, -length / 2, width, 2, 0.18, oak);
    for (const dx of [-width / 4, width / 4]) box(bed, dx, 1.8, -2.3, width / 2 - 0.35, 0.28, 1.2, windowTrim, true);
    for (const dx of name === 'Primary bed' ? [-width / 2 - 1, width / 2 + 1] : [-width / 2 - 1]) {
      const bedsideZ = -length / 2 + 0.85;
      cabinet(bed, dx, bedsideZ, 1.55, 1.9, 1.5, 2);
      wallLamp(`${name} bedside wall lamp ${dx < 0 ? 'left' : 'right'}`, x + Math.cos(rotation) * dx - Math.sin(rotation) * (length / 2 + 0.24), z - Math.sin(rotation) * dx - Math.cos(rotation) * (length / 2 + 0.24), rotation);
    }
    box(bed, 0, 0.025, 0.6, width + 2, 0.04, 8.3, linen);
  }
  for (const [name, x, z, width, rotation] of [
    ['Primary dresser', 9, 8.85, 4, 0],
    ['Bedroom 2 dresser', 42, 11.2, 3, 0],
    ['Bedroom 3 dresser', 11.8, 47.5, 3.5, -Math.PI / 2],
    ['Bedroom 4 dresser', 25, 42.4, 3.5, 0]
  ]) cabinet(furniture(name, x, z, rotation), 0, 0, width, 2.8, 1.6);
  desk('Primary', 13, 13.5, -Math.PI / 2);
  desk('Bedroom 2', 33.4, 11.2, 0, 'Bedroom 2 north');
  desk('Bedroom 3', 1.2, 50.8, Math.PI / 2, 'Bedroom 3 west');
  desk('Bedroom 4', 19.2, 46.35, Math.PI / 2, 'Bedroom 4 closet');
  chair('Primary sitting chair 1', 3, 12.8, Math.PI);
  chair('Primary sitting chair 2', 7, 12.8, Math.PI);
  const sittingTable = furniture('Primary sitting side table', 5, 12.8);
  cabinet(sittingTable, 0, 0, 1.4, 1.8, 1.4, 1);
  const primaryTV = furniture('Primary wall TV', 5, 7.85);
  box(primaryTV, 0, 4.7, 0, 4, 2.3, 0.12, black).name = 'Primary TV screen';
  function vanity(name, x, z, width, rotation = 0) {
    const item = furniture(name, x, z, rotation);
    box(item, 0, 1.3, 0, width, 2.6, 1.8, oak).userData.cabinetBody = 'z+';
    box(item, 0, 2.7, 0, width + 0.05, 0.15, 1.9, cream);
    for (const dx of width > 5 ? [-width / 4, width / 4] : [0]) {
      box(item, dx, 2.8, 0, 1.45, 0.08, 1.1, windowTrim, true);
      box(item, dx, 2.845, 0, 1.1, 0.015, 0.75, steel, true);
      box(item, dx, 3.05, -0.65, 0.08, 0.55, 0.08, steel);
      box(item, dx, 3.3, -0.45, 0.08, 0.08, 0.45, steel);
    }
    const doors = Math.ceil(width / 1.5);
    for (let index = 0; index < doors; index++) {
      const doorWidth = width / doors - 0.04;
      const front = box(item, -width / 2 + (index + 0.5) * width / doors, 1.3, 0.935, doorWidth, 2.4, 0.07, oak);
      front.name = 'Upstairs vanity cabinet door';
      front.userData = { cabinetFront: true, width: doorWidth, height: 2.4, hingeSide: index % 2 === 0 ? -1 : 1 };
      box(front, 0, 0.2, 0.075, 0.5, 0.06, 0.08, black).name = 'Upstairs vanity handle';
    }
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
  vanity('West bath vanity', 7.8, 37.45, 2.5);
  vanity('East bath vanity', 23, 37.45, 2.5);
  toilet('Primary toilet', 11.7, 3.6);
  toilet('Bedroom 2 toilet', 49.5, 11.5);
  toilet('West bath toilet', 5, 37.5);
  toilet('East bath toilet', 26.5, 37.5);
  for (const [name, x, z, w, d] of [
    ['Primary shower', 23.3, 4.3, 3.5, 3.8],
    ['Bedroom 2 shower', 52.4, 12.7, 2.5, 4.5],
    ['West bath shower', 1.75, 38.7, 3, 4.4],
    ['East bath shower', 29.25, 38.7, 3, 4.4]
  ]) {
    const item = furniture(name, x, z);
    box(item, 0, 0.12, 0, w, 0.24, d, cream);
    box(item, 0, 3, -d / 2 + 0.08, w, 6, 0.12, tile);
    box(item, 0, 5.5, -d / 2 + 0.2, 0.5, 0.06, 0.5, steel);
    box(item, 0, 3.2, -d / 2 + 0.18, 0.25, 0.4, 0.08, steel);
    box(item, 0, 0.25, 0, 0.3, 0.015, 0.3, steel);
  }
  const tub = furniture('Primary freestanding tub', 23.2, 11.2);
  box(tub, 0, 1, 0, 2.8, 2, 5.2, windowTrim, true);
  box(tub, 0, 1.9, 0, 2.25, 0.15, 4.4, cream, true);
  box(tub, 0, 1.99, 0, 1.9, 0.025, 3.9, windowTrim, true);
  box(tub, -1.7, 1.3, 0, 0.1, 2.6, 0.1, steel);
  box(tub, -1.4, 2.6, 0, 0.7, 0.1, 0.1, steel);
  for (const x of [25.9, 29.3]) {
    const machine = furniture(x < 27 ? 'Washer' : 'Dryer', x, 29.6);
    box(machine, 0, 1.6, 0, 2.8, 3.2, 2.8, windowTrim);
    box(machine, 0, 1.5, 1.43, 1.8, 1.8, 0.08, black, true);
    box(machine, 0, 1.5, 1.48, 1.4, 1.4, 0.04, steel, true);
    box(machine, 0.8, 2.85, 1.45, 0.22, 0.22, 0.08, black, true);
  }
  const laundryStorage = furniture('Laundry wall cupboards', 27.65, 28.5);
  for (const x of [-2, 0, 2]) cabinet(laundryStorage, x, 0, 2, 2, 1.2, 1, true);
  laundryStorage.position.y = 5.2;
  const laundryCounter = furniture('Laundry folding counter', 27.7, 35.1, Math.PI);
  for (const x of [-2, 0, 2]) cabinet(laundryCounter, x, 0, 2, 2.8, 1.7, 1, true);
  box(laundryCounter, 0, 2.9, 0, 6.1, 0.15, 1.8, cream);
  const furnace = furniture('Mechanical equipment reservation', 33.25, 34.7);
  box(furnace, 0, 3, 0, 2.5, 6, 2, steel);
  hangingBay('Primary closet long hanging', 18, 20.7, 5, Math.PI);
  hangingBay('Primary closet double hanging', 23.1, 20.7, 5, Math.PI, true);
  shelving('Primary closet folded clothes', 27.1, 21.1, 2.7, Math.PI);
  hangingBay('Primary closet return hanging', 29.7, 13, 4.8, Math.PI / 2);
  const closetDresser = furniture('Primary closet drawers', 20, 15.65);
  cabinet(closetDresser, 0, 0, 6, 2.9, 1.4, 4);
  closetDresser.userData.aisleToHangingFeet = 3.2;
  hangingBay('Bedroom 2 closet hanging', 50.7, 18.7, 5, Math.PI / 2, true);
  shelving('Bedroom 2 closet shelves', 46.7, 21.05, 3, Math.PI);
  hangingBay('Bedroom 3 closet hanging', 15.5, 45.7, 4, Math.PI, true);
  hangingBay('Bedroom 4 closet hanging', 15.5, 51.9, 4, Math.PI, true);
  shelving('Linen shelves', 34, 29.85, 4, Math.PI);
  const loftSofa = furniture('Loft sofa', 47, 32, Math.PI);
  box(loftSofa, 0, 0.9, 0, 6, 1.2, 2.8, linen, true);
  box(loftSofa, 0, 1.8, -1.2, 6, 1.6, 0.3, linen, true);
  for (const x of [-2.8, 2.8]) box(loftSofa, x, 1.4, 0, 0.4, 1.3, 2.8, linen, true);
  for (const x of [-1.8, 0, 1.8]) box(loftSofa, x, 1.55, 0, 1.6, 0.2, 2.1, cream, true);
  for (const x of [-2, 2]) box(loftSofa, x, 2, -0.8, 0.9, 0.8, 0.25, oak, true);
  const loftTable = furniture('Loft coffee table and rug', 46.5, 28.6);
  box(loftTable, 0, 0.03, 0, 8, 0.05, 7, linen);
  box(loftTable, 0, 1.3, 0, 3.8, 0.15, 2, oak);
  for (const x of [-1.5, 1.5]) for (const z of [-0.7, 0.7]) box(loftTable, x, 0.65, z, 0.12, 1.3, 0.12, black);
  const media = furniture('Loft media console', 45, 23.05);
  cabinet(media, 0, 0, 6, 1.6, 1.2, 1);
  box(media, 0, 3.3, -0.35, 4.5, 2.6, 0.12, black);
  chair('Loft reading chair', 41.2, 29, -Math.PI / 2);
  const sideTable = furniture('Loft reading side table', 40.7, 32);
  cabinet(sideTable, 0, 0, 1.5, 1.8, 1.5, 1);
  lamp(sideTable, 0, 1.8, 0);
  const loftDesk = furniture('Loft desk', 50.8, 24.8, -Math.PI / 2);
  backDeskToWall(loftDesk, 'Loft east', 1.8);
  box(loftDesk, 0, 2.5, 0, 4.5, 0.15, 1.8, oak).name = 'Loft desktop';
  for (const x of [-2, 2]) box(loftDesk, x, 1.25, 0, 0.12, 2.5, 1.6, black);
  box(loftDesk, 0, 3.25, -0.5, 1.8, 1.1, 0.1, black);
  box(loftDesk, 0, 2.6, 0.2, 1.3, 0.06, 0.45, steel);
  const loftDeskChair = chair('Loft desk chair', 48.9, 24.8, -Math.PI / 2);
  loftDeskChair.position.set(loftDesk.position.x - 1.9, 0, loftDesk.position.z);
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
  // The upper flight stays visible below the flush hardwood arrival floor.
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
  }
  return { group, rooms, areas, plan, baseline, dispose, coordinationWarnings, start: [16.5, 33], mapLabels: rooms.map((room) => [room.name, room.x + room.w / 2, room.z + room.d / 2]) };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getUpstairsDefaultPlan, getUpstairsFrontWindows, getUpstairsSideWindows, getUpstairsExteriorOpenings };
