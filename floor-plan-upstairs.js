// Shared by the furnished plan and masonry elevation; nominal 3060 is NOT
// implied: these are 36 x 60 inch concept envelopes, pending product selection.
function getUpstairsMeasuredGeometry() {
  // Owner's October 28 measured image. Dimensions are BETWEEN PAINT FACES;
  // wall centerlines include the existing 4.2-inch study partition allowance.
  const t = 0.35;
  const primaryEast = 14 + 8 / 12 + t;
  const closetEast = primaryEast + 17 + 6 / 12 + 7 / 96 + t;
  const bedEast = closetEast + 13 + t;
  const southClosetWest = 12.5 + t;
  const southClosetEast = southClosetWest + 5.5 + 1 / 48 + t;
  const southEast = southClosetEast + 12.5 + t;
  const laundryEast = southEast + 8.5 + t;
  const east = laundryEast + 15 + 2 / 12 + 1 / 48 + t;
  const serviceSouth = 35.1; // Preserve ground stair, not the screenshot stair.
  const loftNorth = serviceSouth - (15 + 2 / 12 + 5 / 192) - t;
  const north = loftNorth - 12.5 - t;
  const primarySouth = north + 19 + 8 / 12 + 5 / 192 + t;
  const closetNorth = loftNorth - (8 + 1 / 12 + 9 / 192) - t;
  const bathEast = primaryEast + 11 + 10 / 12 + 11 / 192 + t;
  const bathNorth = north - 8;
  const bedNorth = serviceSouth + 5 + t;
  return { t, primaryEast, closetEast, bedEast, southClosetWest, southClosetEast,
    southEast, laundryEast, east, serviceSouth, loftNorth, north, primarySouth,
    closetNorth, bathEast, bathNorth, bedNorth, south: bedNorth + 13 + t,
    laundryNorth: serviceSouth - 9.5 - t, serviceNorth: serviceSouth - 5.1,
    linenWest: southEast - 9.35, furnaceWest: southEast - 6.85 };
}

function getUpstairsFrontWindows() {
  const g = getUpstairsMeasuredGeometry();
  return [g.southClosetWest / 2 - 2, g.southClosetWest / 2 + 2,
    (g.southClosetEast + g.southEast) / 2 - 2,
    (g.southClosetEast + g.southEast) / 2 + 2].map((center, index) => ({
    name: `Bedroom ${index < 2 ? 3 : 4} south ${index % 2 ? 'right' : 'left'}`,
    center, width: 3, sill: 3, height: 5
  }));
}

function getUpstairsRoomClearDimensions(room, walls) {
  const allowance = (axis, coordinate) => {
    const along = axis === 'x' ? ['z1', 'z2', room.z, room.z + room.d] : ['x1', 'x2', room.x, room.x + room.w];
    const candidates = walls.filter(w => Math.abs(w[`${axis}1`] - coordinate) < .001
      && Math.abs(w[`${axis}2`] - coordinate) < .001)
      .map(w => ({ w, overlap: Math.min(w[along[1]], along[3]) - Math.max(w[along[0]], along[2]) }))
      .filter(c => c.overlap > 0).sort((a, b) => b.overlap - a.overlap);
    return (candidates[0]?.w.thickness ?? .35) / 2;
  };
  return { w: room.w - allowance('x', room.x) - allowance('x', room.x + room.w),
    d: room.d - allowance('z', room.z) - allowance('z', room.z + room.d) };
}

function getUpstairsSideWindows() {
  // Furnished frame centers; their 0.1 ft normal inset is ignored when
  // projecting the same openings onto the exterior masonry wall centerline.
  const g = getUpstairsMeasuredGeometry();
  return [
    ['Primary west 1', 0.1, g.north + 5, 4, -Math.PI / 2, -1],
    ['Primary west 2', 0.1, g.north + 14, 4, -Math.PI / 2, -1],
    ['Primary bath', g.primaryEast + 5, g.bathNorth + 0.1, 3, 0, 1],
    ['Bedroom 2', (g.closetEast + g.bedEast) / 2, g.north + 0.1, 4, 0, 1],
    ['Bath 2', (g.bedEast + g.east) / 2, g.north + 0.1, 2, 0, 1],
    ['Loft 1', g.east - 0.1, g.loftNorth + 5, 4, -Math.PI / 2, 1],
    ['Loft 2', g.east - 0.1, g.loftNorth + 11, 4, -Math.PI / 2, 1],
    ['Loft south 1', g.laundryEast + 4.25, g.serviceSouth - 0.1, 4, 0, -1],
    ['Loft south 2', g.east - 4.25, g.serviceSouth - 0.1, 4, 0, -1],
    ['Stairwell', 0.1, 31.1, 3, -Math.PI / 2, -1],
    ['Bedroom 3 west', 0.1, g.bedNorth + 6, 4, -Math.PI / 2, -1]
  ];
}

function getUpstairsExteriorSegments() {
  const g = getUpstairsMeasuredGeometry();
  return [
    ['front bedrooms', 0, g.south, g.southEast, g.south],
    ['west', 0, g.north, 0, g.south],
    ['primary rear', 0, g.north, g.primaryEast - 3.35, g.north],
    ['bath west return', g.primaryEast - 3.35, g.bathNorth, g.primaryEast - 3.35, g.north],
    ['bath rear', g.primaryEast - 3.35, g.bathNorth, g.bathEast, g.bathNorth],
    ['bath east', g.bathEast, g.bathNorth, g.bathEast, g.north],
    ['bedroom rear', g.bathEast, g.north, g.east, g.north],
    ['east loft', g.east, g.north, g.east, g.serviceSouth],
    ['loft south', g.southEast, g.serviceSouth, g.east, g.serviceSouth],
    ['bedroom east return', g.southEast, g.serviceSouth, g.southEast, g.south]
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
  const g = getUpstairsMeasuredGeometry();
  const { t, primaryEast: p, closetEast: c, bedEast: b, east: e,
    north: n, loftNorth: h, closetNorth: cn, bathEast: be, bathNorth: bn,
    primarySouth: ps, serviceSouth: ss, southEast: se, southClosetWest: cw,
    southClosetEast: ce, bedNorth: sn, south: s, laundryEast: le,
    laundryNorth: ln, serviceNorth: fs, linenWest: lw, furnaceWest: fw } = g;
  // Stable model names keep navigation and empty saved-layout compatibility.
  // Image Bed 3 = Bedroom 2; image Bed 1/2 = Bedroom 3/4.
  const room = (name, x, z, right, bottom, tile = false) => ({ name, x, z, w: right - x, d: bottom - z, tile });
  const rooms = [
    room('Primary bedroom', 0, n, p, ps),
    room('Primary bath', p, bn, be, cn, true),
    room('Primary toilet', p - 3.35, bn, p, n - 2.35, true),
    room('Primary closet', p, cn, c, h),
    room('Bedroom 2', c, n, b, h),
    room('Bedroom 2 bath', b, n, e, n + 5.85, true),
    room('Bedroom 2 closet', b, n + 5.85, e, h),
    room('Loft', le, h, e, ss),
    room('Laundry (relocated)', se, ln, le, ss, true),
    room('Shared bath west', 0, ss, 9.35, sn, true),
    room('Shared bath east', se - 9.35, ss, se, sn, true),
    room('Bedroom 3', 0, sn, cw, s),
    room('Bedroom 3 closet', cw, sn, ce, sn + 6.5),
    room('Bedroom 4', ce, sn, se, s),
    room('Bedroom 4 closet', cw, sn + 6.5, ce, s),
    room('Linen (relocated)', lw, fs, fw, ss),
    room('Mechanical (relocated)', fw, fs, se, ss)
  ];
  const floors = [];
  function slab(name, x, z, w, d, room = null) {
    floors.push({ name, x, z, w, d, room });
  }
  for (const room of rooms) {
    if (room.circulationOnly) continue; // Irregular gallery floor is assembled below.
    if (room.name === 'Primary bath') {
      slab(room.name, p, bn, be - p, cn - bn, room.name);
      slab('Primary bath west return', p - 3.35, n - 2.35, 3.35, 2.35, room.name);
    } else slab(room.name, room.x, room.z, room.w, room.d, room.name);
  }
  slab('Primary closet return', be, n, c - be, cn - n, 'Primary closet');
  slab('North gallery', p, h, le - p, ln - h);
  const arrivalLeft = stairOpening.x + stairOpening.width;
  const arrivalDepth = stairOpening.depth - 44 / 12 - 0.25;
  const arrival = { x: arrivalLeft, z: stairOpening.z + stairOpening.depth - arrivalDepth, w: 44 / 12, d: arrivalDepth };
  slab('Arrival gallery', arrivalLeft + arrival.w, ps, lw - arrivalLeft - arrival.w, ss - ps);
  slab('Hall west return', p, ln, lw - p, ps - ln);
  slab('Hall service approach', lw, ln, se - lw, fs - ln);
  slab('North stair edge', 0, ps, arrivalLeft + arrival.w, stairOpening.z - ps);
  slab('West stair edge', 0, stairOpening.z, stairOpening.x, stairOpening.depth);
  slab('North arrival approach', arrivalLeft, stairOpening.z, arrival.w, stairOpening.depth - arrivalDepth);
  slab('South hall', 9.35, ss, se - 18.7, sn - ss);
  slab('South landing connection', 0, stairOpening.z + stairOpening.depth, arrivalLeft + arrival.w, ss - stairOpening.z - stairOpening.depth);
  const door = (start, width = 3) => [start, start + width, 0, 8];
  const win = (start, width = 4) => [start, start + width, 3, 8];
  const walls = [
    ['Primary west', 0, n, 0, ps, [win(3), win(12)], [-1]],
    ['Primary north', 0, n, p - 3.35, n, [], [1]],
    ['Primary suite entry', p, n, p, ps, [door(0.8, 2.5), door(cn - n + 0.9, 2.5), door(ps - n - 3.8)]],
    ['Primary south', 0, ps, p, ps],
    ['Toilet west', p - 3.35, bn, p - 3.35, n, [], [-1]],
    ['Bath north', p - 3.35, bn, be, bn, [win(6.85, 3)], [1]],
    ['Toilet partition', p, bn, p, n, [door(2.3, 2.5)]],
    ['Toilet south', p - 3.35, n - 2.35, p, n - 2.35],
    ['Toilet linen south', p - 3.35, n, p, n],
    ['Bath east', be, bn, be, cn, [], [1]],
    ['Bath south', p, cn, be, cn],
    ['Closet north return', be, n, c, n, [], [1]],
    ['Primary closet east', c, n, c, h],
    ['Primary closet south', p, h, c, h],
    ['Bedroom 2 north', c, n, b, n, [win((b - c) / 2 - 2)], [1]],
    ['Bedroom 2 east', b, n, b, h, [door(0.8, 2.5), door(8, 2.5)]],
    ['Bedroom 2 south', c, h, b, h, [door(0.8)]],
    ['Bath 2 north', b, n, e, n, [win((e - b) / 2 - 1, 2)], [1]],
    ['Bath 2 east', e, n, e, n + 5.85, [], [1]],
    ['Bath 2 south', b, n + 5.85, e, n + 5.85],
    ['Closet 2 east', e, n + 5.85, e, h, [], [1]],
    ['Closet 2 south', b, h, e, h],
    ['Loft east', e, h, e, ss, [win(3), win(9)], [1]],
    ['Loft west storage', le, ln, le, ss],
    ['Stairwell west', 0, ps, 0, sn, [win(31.1 - ps - 1.5, 3)], [-1]],
    ['Laundry entry', se, ln, le, ln, [door(0.8)]],
    ['Laundry west', se, ln, se, ss],
    ['Laundry south', se, ss, le, ss, [], [-1]],
    ['West bath north', 0, ss, 9.35, ss],
    ['West bath entry', 9.35, ss, 9.35, sn],
    ['East bath north', lw, ss, se, ss],
    ['East bath entry', lw, ss, lw, sn],
    ['Bedroom 3 north', 0, sn, cw, sn, [door(0.8, 2.5), door(cw - 2.95, 2.5)]],
    ['Bedroom 3 west', 0, sn, 0, s, [win(4)], [-1]],
    ['Bedrooms south', 0, s, se, s, getUpstairsFrontWindows().map(w => [w.center - w.width / 2, w.center + w.width / 2, w.sill, w.sill + w.height]), [-1]],
    ['Bedroom 3 closet', cw, sn, cw, s, [door(0.6, 2.5)]],
    ['Closet divider', cw, sn + 6.5, ce, sn + 6.5],
    ['Bedroom 4 closet', ce, sn, ce, s, [door(9, 2.5)]],
    ['Bedroom 4 north', cw, sn, se, sn, [door(ce - cw + 0.55, 2.5), door(se - cw - 3.3, 2.5)]],
    ['Bedroom 4 east', se, ss, se, s, [], [1]],
    ['Storage north', lw, fs, fw, fs],
    ['Linen south', lw, ss, fw, ss],
    ['Storage west', lw, fs, lw, ss, [door(1.6, 2.5)]],
    ['Linen furnace divider', fw, fs, fw, ss],
    ['Furnace entry', fw, fs, se, fs, [door(1.3, 2.5)]],
    ['Loft south exterior', le, ss, e, ss, [win(2.25), win(e - le - 6.25)], [-1]]
  ];
  const windows = [
    ...getUpstairsSideWindows(),
    ...getUpstairsFrontWindows().map(w => [w.name, w.center, s - 0.1, w.width, 0, -1])
  ];
  return { rooms, floors: floors.filter(f => f.w > 0 && f.d > 0), walls, windows, arrival, stairs: { ...stairOpening } };
}

function buildUpstairsModel(THREE, { box, mat, wood, wallMaterial, windowTrim, oak, cream, black, steel, linen, windowFrame, openingCasing, singlePanelDoor }, stairOpening, elevation, edits = UpstairsLayout.empty()) {
  const g = getUpstairsMeasuredGeometry();
  const baseline = getUpstairsDefaultPlan(stairOpening);
  const plan = UpstairsLayout.resolve(baseline, edits);
  const { rooms } = plan;
  const group = new THREE.Group();
  group.name = 'Upstairs adapted dimensioned-plan study';
  group.position.y = elevation;
  group.visible = false;
  group.userData = { elevationFeet: elevation, ceilingHeightFeet: 9, stairRegistration: 'Fixed ground stair; measured-image rooms with adapted stair-side hall', provisional: true };
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
        const rightHinge = name === 'Bedroom 4 north' && start > 10;
        const swingSign = rightHinge ? -1 : (name === 'Bedroom 3 north' && start < 4) ? 1
          : ['Primary suite entry', 'Storage west', 'Bedroom 3 north', 'Bedroom 4 north', 'Furnace entry'].includes(name) ? -1 : 1;
        const closedRotationY = rightHinge ? Math.PI : 0;
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
  function furniture(name, x, z, rotation = 0, viewerFurniture = false) {
    const item = new THREE.Group();
    item.name = `Upstairs ${name}`;
    if (viewerFurniture) item.userData.viewerFurniture = true;
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
    const item = furniture(name, x, z, rotation, true);
    box(item, 0, 1.5, 0, 1.65, 0.22, 1.65, linen, true);
    box(item, 0, 2.15, 0.75, 1.65, 1.3, 0.15, oak);
    for (const dx of [-0.65, 0.65]) for (const dz of [-0.65, 0.65]) box(item, dx, 0.7, dz, 0.1, 1.4, 0.1, oak);
    return item;
  }
  function loungeChair(name, x, z, rotation = 0) {
    const item = furniture(name, x, z, rotation, true);
    box(item, 0, 0.75, 0, 2, 0.5, 1.9, oak);
    box(item, 0, 1.35, 0, 2.35, 0.8, 2.25, linen, true);
    box(item, 0, 2.25, 0.8, 2.35, 1.2, 0.55, linen, true);
    box(item, 0, 1.85, -0.15, 1.85, 0.18, 1.55, cream, true);
    for (const x of [-1.035, 1.035]) box(item, x, 1.75, 0.05, 0.28, 0.9, 1.75, linen, true);
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
    const item = furniture(`${name} writing desk`, x, z, rotation, true);
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
    return seat;
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
  const primaryCenterX = g.primaryEast / 2;
  for (const [name, x, z, mattressWidth, mattressLength, rotation, bedsideSide] of [
    ['Primary bed', g.primaryEast * 0.39, g.north + 6.7, 5, 80 / 12, 0, -1],
    ['Bedroom 2 bed', g.bedEast - 4.85, g.north + 4.1, 4.5, 6.25, 0, -1],
    ['Bedroom 3 bed', 3.3, g.bedNorth + 5.3, 4.5, 6.25, 0, 1],
    ['Bedroom 4 bed', g.southEast - 3.3, g.bedNorth + 6.5, 4.5, 6.25, 0, -1]
  ]) {
    const bed = furniture(name, x, z, rotation, true);
    const width = mattressWidth + 0.2, length = mattressLength + 0.2;
    bed.userData = { mattressWidthInches: mattressWidth * 12, mattressLengthInches: mattressLength * 12, viewerFurniture: true };
    box(bed, 0, 0.6, 0, width, 0.8, length, oak);
    box(bed, 0, 1.15, 0, mattressWidth, 0.5, mattressLength, cream, true).name = 'Bed mattress';
    box(bed, 0, 1.45, 1, width - 0.12, 0.15, 4.5, linen);
    box(bed, 0, 1.6, -2.5, width - 0.5, 0.3, 1.3, cream, true);
    box(bed, 0, 1.7, -length / 2, width, 2, 0.18, oak);
    for (const dx of [-width / 4, width / 4]) box(bed, dx, 1.8, -2.3, width / 2 - 0.35, 0.28, 1.2, windowTrim, true);
    for (const side of name === 'Primary bed' ? [-1, 1] : [bedsideSide]) {
      const dx = side * (width / 2 + 1);
      const bedsideZ = -length / 2 + 0.85;
      cabinet(bed, dx, bedsideZ, 1.55, 1.9, 1.5, 2);
      const lampMount = name === 'Primary bed'
        ? { x: x + dx, z: g.north + 0.215, rotation: 0 }
        : name === 'Bedroom 2 bed'
          ? { x: g.bedEast - 0.215, z: g.north + 5.5, rotation: -Math.PI / 2 }
          : name === 'Bedroom 3 bed'
            ? { x: 0.215, z: g.bedNorth + 2.5, rotation: Math.PI / 2 }
            : { x: g.southEast - 0.215, z: g.bedNorth + 4.3, rotation: -Math.PI / 2 };
      wallLamp(`${name} bedside wall lamp ${side < 0 ? 'left' : 'right'}`, lampMount.x, lampMount.z, lampMount.rotation);
    }
    box(bed, 0, 0.025, 0.6, width + 2, 0.04, 8.3, linen);
  }
  for (const [name, x, z, width, rotation] of [
    ['Primary dresser', 1.1, g.north + 9.5, 4, Math.PI / 2],
    ['Bedroom 2 dresser', g.closetEast + 1.4, g.north + 5.5, 3, Math.PI / 2],
    ['Bedroom 3 dresser', g.southClosetWest - 1.2, g.south - 3.3, 3.5, -Math.PI / 2],
    ['Bedroom 4 dresser', 24, g.south - 3.8, 3.5, 0]
  ]) cabinet(furniture(name, x, z, rotation, true), 0, 0, width, 2.8, 1.6);
  const primaryDeskChair = desk('Primary', 9.3, g.north + 1.2, 0, 'Primary north');
  primaryDeskChair.position.x = 11.2;
  desk('Bedroom 2', g.closetEast + 2.2, g.north + 1.2, 0, 'Bedroom 2 north');
  desk('Bedroom 3', g.southClosetWest - 1.2, g.bedNorth + 5.5, -Math.PI / 2, 'Bedroom 3 closet');
  desk('Bedroom 4', g.southClosetEast + 1.2, g.bedNorth + 5.15, Math.PI / 2, 'Bedroom 4 closet');
  loungeChair('Primary sitting chair 1', primaryCenterX - 3.15, g.north + 14);
  loungeChair('Primary sitting chair 2', primaryCenterX + 3.15, g.north + 14);
  const sittingTable = furniture('Primary sitting side table', primaryCenterX, g.north + 14, 0, true);
  cabinet(sittingTable, 0, 0, 1.4, 1.8, 1.4, 1);
  const primaryMedia = furniture('Primary media console', g.primaryEast - 0.175 - 0.6, g.north + 11, -Math.PI / 2, true);
  cabinet(primaryMedia, 0, 0, 4, 1.6, 1.2, 2);
  const primaryTV = furniture('Primary wall TV', g.primaryEast - 0.235, g.north + 11, -Math.PI / 2);
  box(primaryTV, 0, 4.7, 0, 4, 2.3, 0.12, black).name = 'Primary TV screen';
  loungeChair('Bedroom 2 reading chair', g.bedEast - 5.2, g.loftNorth - 2.4);
  loungeChair('Bedroom 3 reading chair', 2.5, g.south - 2.6, -Math.PI / 4);
  loungeChair('Bedroom 4 reading chair', g.southEast - 2.1, g.south - 1.9);
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
  vanity('Primary double vanity', g.primaryEast + 3.5, g.bathNorth + 1.2, 6);
  vanity('Bedroom 2 vanity', g.bedEast + 2, g.north + 4.65, 3, Math.PI);
  vanity('West bath vanity', 1.75, g.serviceSouth + 1.25, 2.5);
  vanity('East bath vanity', g.southEast - 1.75, g.serviceSouth + 1.25, 2.5);
  toilet('Primary toilet', g.primaryEast - 1.675, g.bathNorth + 1.5);
  toilet('Bedroom 2 toilet', g.bedEast + 4.8, g.north + 1.5);
  toilet('West bath toilet', 4.8, g.serviceSouth + 1.3);
  toilet('East bath toilet', g.southEast - 4.7, g.serviceSouth + 1.3);
  for (const [name, x, z, w, d] of [
    ['Primary shower', g.bathEast - 2.3, g.bathNorth + 2.3, 3.5, 3.8],
    ['Bedroom 2 shower', g.east - 1.6, g.north + 2.925, 2.5, 5],
    ['West bath shower', 7.6, g.serviceSouth + 2.675, 3, 4.4],
    ['East bath shower', g.linenWest + 1.75, g.serviceSouth + 2.675, 3, 4.4]
  ]) {
    const item = furniture(name, x, z);
    box(item, 0, 0.12, 0, w, 0.24, d, cream);
    box(item, 0, 3, -d / 2 + 0.08, w, 6, 0.12, tile);
    box(item, 0, 5.5, -d / 2 + 0.2, 0.5, 0.06, 0.5, steel);
    box(item, 0, 3.2, -d / 2 + 0.18, 0.25, 0.4, 0.08, steel);
    box(item, 0, 0.25, 0, 0.3, 0.015, 0.3, steel);
  }
  const tub = furniture('Primary freestanding tub', g.bathEast - 2.3, g.closetNorth - 3.2);
  box(tub, 0, 1, 0, 2.8, 2, 5.2, windowTrim, true);
  box(tub, 0, 1.9, 0, 2.25, 0.15, 4.4, cream, true);
  box(tub, 0, 1.99, 0, 1.9, 0.025, 3.9, windowTrim, true);
  box(tub, -1.7, 1.3, 0, 0.1, 2.6, 0.1, steel);
  box(tub, -1.4, 2.6, 0, 0.7, 0.1, 0.1, steel);
  for (const [index, x] of [g.southEast + 2, g.southEast + 5.4].entries()) {
    const machine = furniture(index === 0 ? 'Washer' : 'Dryer', x, g.serviceSouth - 2, Math.PI);
    box(machine, 0, 1.6, 0, 2.8, 3.2, 2.8, windowTrim);
    box(machine, 0, 1.5, 1.43, 1.8, 1.8, 0.08, black, true);
    box(machine, 0, 1.5, 1.48, 1.4, 1.4, 0.04, steel, true);
    box(machine, 0.8, 2.85, 1.45, 0.22, 0.22, 0.08, black, true);
  }
  const laundryStorage = furniture('Laundry wall cupboards', g.southEast + 4, g.serviceSouth - 0.9, Math.PI);
  for (const x of [-2, 0, 2]) cabinet(laundryStorage, x, 0, 2, 2, 1.2, 1, true);
  laundryStorage.position.y = 5.2;
  const laundryCounter = furniture('Laundry folding counter', g.southEast + 6.2, g.laundryNorth + 1.1);
  for (const x of [-1, 1]) cabinet(laundryCounter, x, 0, 2, 2.8, 1.7, 1, true);
  box(laundryCounter, 0, 2.9, 0, 4.1, 0.15, 1.8, cream);
  const furnace = furniture('Mechanical equipment reservation', g.southEast - 1.6, g.serviceSouth - 1.5);
  box(furnace, 0, 3, 0, 2.5, 6, 2, steel);
  hangingBay('Primary closet long hanging', g.primaryEast + 3.8, g.loftNorth - 1.3, 5, Math.PI);
  hangingBay('Primary closet double hanging', g.primaryEast + 8.9, g.loftNorth - 1.3, 5, Math.PI, true);
  shelving('Primary closet folded clothes', g.primaryEast + 13, g.loftNorth - 0.9, 2.7, Math.PI);
  hangingBay('Primary closet return hanging', g.closetEast - 1.3, g.north + 3, 4.8, Math.PI / 2);
  const closetDresser = furniture('Primary closet drawers', g.primaryEast + 5.8, g.closetNorth + 0.95, 0, true);
  cabinet(closetDresser, 0, 0, 6, 2.9, 1.4, 4);
  hangingBay('Bedroom 2 closet hanging', g.east - 1.3, g.loftNorth - 3.4, 5, Math.PI / 2, true);
  shelving('Bedroom 2 closet shelves', g.bedEast + 2.7, g.loftNorth - 0.95, 3, Math.PI);
  hangingBay('Bedroom 3 closet hanging', (g.southClosetWest + g.southClosetEast) / 2, g.bedNorth + 5.2, 4, Math.PI, true);
  hangingBay('Bedroom 4 closet hanging', (g.southClosetWest + g.southClosetEast) / 2, g.south - 1.3, 4, Math.PI, true);
  shelving('Linen shelves', (g.linenWest + g.furnaceWest) / 2, g.serviceSouth - 0.95, 1.8, Math.PI);
  const loftCenterX = (g.laundryEast + g.east) / 2;
  const loftSofa = furniture('Loft sofa', loftCenterX, g.serviceSouth - 1.9, 0, true);
  box(loftSofa, 0, 0.9, 0, 6, 1.2, 2.8, linen, true);
  box(loftSofa, 0, 1.8, -1.2, 6, 1.6, 0.3, linen, true);
  for (const x of [-2.8, 2.8]) box(loftSofa, x, 1.4, 0, 0.4, 1.3, 2.8, linen, true);
  for (const x of [-1.8, 0, 1.8]) box(loftSofa, x, 1.55, 0, 1.6, 0.2, 2.1, cream, true);
  for (const x of [-2, 2]) box(loftSofa, x, 2, -0.8, 0.9, 0.8, 0.25, oak, true);
  const loftTable = furniture('Loft coffee table and rug', loftCenterX, g.loftNorth + 10.05, 0, true);
  box(loftTable, 0, 0.03, 0, 8, 0.05, 7, linen);
  box(loftTable, 0, 1.3, 0, 3.8, 0.15, 2, oak);
  for (const x of [-1.5, 1.5]) for (const z of [-0.7, 0.7]) box(loftTable, x, 0.65, z, 0.12, 1.3, 0.12, black);
  const media = furniture('Loft media console', loftCenterX, g.loftNorth + 1.05, 0, true);
  cabinet(media, 0, 0, 6, 1.6, 1.2, 1);
  box(media, 0, 3.3, -0.35, 4.5, 2.6, 0.12, black);
  loungeChair('Loft reading chair', loftCenterX + 4.8, g.loftNorth + 8.5, Math.PI / 4);
  const sideTable = furniture('Loft reading side table', loftCenterX + 2.7, g.loftNorth + 6.4, 0, true);
  cabinet(sideTable, 0, 0, 1.5, 1.8, 1.5, 1);
  lamp(sideTable, 0, 1.8, 0);
  const loftDesk = furniture('Loft desk', g.east - 1.2, g.loftNorth + 2.8, -Math.PI / 2, true);
  backDeskToWall(loftDesk, 'Loft east', 1.8);
  box(loftDesk, 0, 2.5, 0, 4.5, 0.15, 1.8, oak).name = 'Loft desktop';
  for (const x of [-2, 2]) box(loftDesk, x, 1.25, 0, 0.12, 2.5, 1.6, black);
  box(loftDesk, 0, 3.25, -0.5, 1.8, 1.1, 0.1, black);
  box(loftDesk, 0, 2.6, 0.2, 1.3, 0.06, 0.45, steel);
  const loftDeskChair = chair('Loft desk chair', g.east - 3.1, g.loftNorth + 2.8, -Math.PI / 2);
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

if (typeof module !== 'undefined' && module.exports) module.exports = { getUpstairsRoomClearDimensions, getUpstairsMeasuredGeometry, getUpstairsExteriorSegments, getUpstairsDefaultPlan, getUpstairsFrontWindows, getUpstairsSideWindows, getUpstairsExteriorOpenings };
