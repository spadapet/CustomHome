// Shared by the furnished plan and masonry elevation; nominal 3060 is NOT
// implied: these are 36 x 60 inch concept envelopes, pending product selection.
function getUpstairsMeasuredGeometry() {
  // Approved October 31 compact SVG: wall centerlines in feet.
  // Legacy field names remain for shared roof/camera consumers, not old rooms.
  const t = 0.35;
  const primaryEast = 15.1, closetEast = 29, bedEast = 44;
  const bedroom2ClosetEast = 34.65;
  const southClosetWest = 12.85, southClosetEast = 18.7;
  const southEast = 31.2, laundryEast = 44, east = 44;
  const serviceSouth = 35.1, primarySouth = 26.75, north = 6.65;
  const loftNorth = 23.35; // Gallery north; there is no loft.
  const bathWest = 15.1, bathEast = 29, bathNorth = north;
  const closetNorth = 16.8, toiletEast = 18.725, toiletSouth = 11.925;
  const closetTailWest = 18.45, closetTailEast = 25.65;
  const bedNorth = 40.45, southClosetSouth = 51.8;
  return { t, primaryEast, closetEast, bedEast, bedroom2ClosetEast, southClosetWest, southClosetEast, southClosetSouth,
    southEast, laundryEast, east, serviceSouth, loftNorth, north, primarySouth,
    closetNorth, closetTailWest, closetTailEast, bathWest, bathEast, bathNorth, toiletEast, toiletSouth, bedNorth, south: 52.3,
    laundryNorth: 26.75, laundryWest: 30.225, serviceNorth: 35.1,
    linenWest: 22.55, furnaceWest: 37.5, serviceEast: 43.85,
    bath4West: 28.15, bath4East: 37.5 };
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
    ['Primary bath', 20.9, g.bathNorth + 0.1, 3, 0, 1],
    ['Bath 2', 39.325, g.north + 0.1, 2, 0, 1],
    ['Bedroom 2 east 1', g.east - .1, 16.5, 4, -Math.PI / 2, 1],
    ['Bedroom 2 east 2', g.east - .1, 23, 4, -Math.PI / 2, 1],
    ['Laundry east', g.east - .1, 30.7, 3, -Math.PI / 2, 1],
    ['Stairwell', 0.1, 31.1, 3, -Math.PI / 2, -1],
    ['Bedroom 3 west', 0.1, g.bedNorth + 6, 4, -Math.PI / 2, -1]
  ];
}

function getUpstairsExteriorSegments() {
  const g = getUpstairsMeasuredGeometry();
  return [
    ['front bedrooms', 0, g.south, g.southClosetWest, g.south],
    ['closet 4 west return', g.southClosetWest, g.south, g.southClosetWest, g.southClosetSouth],
    ['closet 4 front', g.southClosetWest, g.southClosetSouth, g.southClosetEast, g.southClosetSouth],
    ['closet 4 east return', g.southClosetEast, g.southClosetSouth, g.southClosetEast, g.south],
    ['front bedroom 4', g.southClosetEast, g.south, g.southEast, g.south],
    ['west', 0, g.north, 0, g.south],
    ['primary rear', 0, g.north, g.bathWest, g.north],
    ['bath rear', g.bathWest, g.bathNorth, g.bathEast, g.bathNorth],
    ['bedroom rear', g.bathEast, g.north, g.east, g.north],
    ['east rooms', g.east, g.north, g.east, g.serviceSouth],
    ['service east step', g.east, g.serviceSouth, g.serviceEast, g.serviceSouth],
    ['service east', g.serviceEast, g.serviceSouth, g.serviceEast, g.bedNorth],
    ['service south', g.southEast, g.bedNorth, g.serviceEast, g.bedNorth],
    ['bedroom east return', g.southEast, g.bedNorth, g.southEast, g.south]
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
  // Stable names preserve navigation; coordinates follow the approved SVG.
  const room = (name, x, z, right, bottom, tile = false) => ({ name, x, z, w: right - x, d: bottom - z, tile });
  const rooms = [
    room('Primary bedroom', 0, n, p, ps),
    room('Primary bath', p, bn, be, cn, true),
    room('Primary toilet', g.bathWest, bn, g.toiletEast, g.toiletSouth, true),
    room('Primary closet', p, cn, c, h),
    room('Bedroom 2', c, 12, b, ps),
    room('Bedroom 2 bath', g.bedroom2ClosetEast, n, e, 12, true),
    room('Bedroom 2 closet', c, n, g.bedroom2ClosetEast, 14),
    room('Laundry (relocated)', g.laundryWest, ln, le, ss, true),
    room('Shared bath west', 0, ss, 9.35, sn, true),
    room('Shared bath east', g.bath4West, ss, g.bath4East, sn, true),
    room('Bedroom 3', 0, sn, cw, s),
    room('Bedroom 3 closet', cw, sn, ce, sn + 6.5),
    room('Bedroom 4', ce, sn, se, s),
    room('Bedroom 4 closet', cw, sn + 6.5, ce, g.southClosetSouth),
    room('Mechanical (relocated)', fw, ss, g.serviceEast, sn),
    { ...room('Gallery', p, ps, g.laundryWest, ss), circulationOnly: true }
  ];
  const floors = [];
  function slab(name, x, z, w, d, room = null) {
    floors.push({ name, x, z, w, d, room });
  }
  for (const room of rooms) {
    if (room.circulationOnly) continue; // Irregular gallery floor is assembled below.
    if (room.name === 'Primary bath') {
      slab('Primary bath north', g.toiletEast, bn, be - g.toiletEast, g.toiletSouth - bn, room.name);
      slab(room.name, p, g.toiletSouth, be - p, cn - g.toiletSouth, room.name);
    } else if (room.name === 'Bedroom 2') {
      slab(room.name, c, 14, b - c, ps - 14, room.name);
      slab('Bedroom 2 north east', g.bedroom2ClosetEast, 12, b - g.bedroom2ClosetEast, 2, room.name);
    } else slab(room.name, room.x, room.z, room.w, room.d, room.name);
  }
  slab('Primary closet linen extension', g.closetTailWest, h, g.closetTailEast - g.closetTailWest, ps - h, 'Primary closet');
  slab('North gallery west route', p, h, g.closetTailWest - p, ps - h);
  slab('North gallery east route', g.closetTailEast, h, c - g.closetTailEast, ps - h);
  slab('Central gallery', g.linenWest, ps, g.laundryWest - g.linenWest, ss - ps);
  slab('West gallery return', p, ps, g.linenWest - p, ss - ps);
  const arrivalLeft = stairOpening.x + stairOpening.width;
  const arrivalDepth = stairOpening.depth - 44 / 12 - 0.25;
  const arrival = { x: arrivalLeft, z: stairOpening.z + stairOpening.depth - arrivalDepth, w: 44 / 12, d: arrivalDepth };
  slab('Arrival gallery', arrivalLeft + arrival.w, ps, p - arrivalLeft - arrival.w, ss - ps);
  slab('North stair edge', 0, ps, arrivalLeft + arrival.w, stairOpening.z - ps);
  slab('West stair edge', 0, stairOpening.z, stairOpening.x, stairOpening.depth);
  slab('North arrival approach', arrivalLeft, stairOpening.z, arrival.w, stairOpening.depth - arrivalDepth);
  slab('South hall', 9.35, ss, g.bath4West - 9.35, sn - ss);
  slab('South landing connection', 0, stairOpening.z + stairOpening.depth, arrivalLeft + arrival.w, ss - stairOpening.z - stairOpening.depth);
  const door = (start, width = 3) => [start, start + width, 0, 8];
  const win = (start, width = 4) => [start, start + width, 3, 8];
  const walls = [
    ['Primary west', 0, n, 0, ps, [win(3), win(12)], [-1]],
    ['Primary north', 0, n, g.bathWest, n, [], [1]],
    ['Primary suite entry', p, n, p, ps, [door(12.2), door(16.95)]],
    ['Primary south', 0, ps, p, ps],
    ['Bath north', g.bathWest, bn, be, bn, [win(20.9 - g.bathWest - 1.5, 3)], [1]],
    ['Toilet partition', g.toiletEast, bn, g.toiletEast, g.toiletSouth],
    ['Toilet south', g.bathWest, g.toiletSouth, g.toiletEast, g.toiletSouth, [door(.525, 2.5)]],
    ['Bath south', p, cn, be, cn, [door(10.55)]],
    ['Primary closet east', c, n, c, ps, [door(16.9)]],
    ['Primary closet south', p, h, g.closetTailWest, h],
    ['Primary closet south east', g.closetTailEast, h, c, h],
    ['Primary closet linen west', g.closetTailWest, h, g.closetTailWest, ps],
    ['Primary closet linen east', g.closetTailEast, h, g.closetTailEast, ps],
    ['Primary closet linen south', g.closetTailWest, ps, g.closetTailEast, ps],
    ['Bedroom 2 east', b, 12, b, ps, [win(2.5), win(9)], [1]],
    ['Bedroom 2 south', c, ps, b, ps],
    ['Bath 2 north', g.bedroom2ClosetEast, n, e, n, [win(3.675, 2)], [1]],
    ['Closet 2 north', c, n, g.bedroom2ClosetEast, n, [], [1]],
    ['Bath 2 east', e, n, e, 12, [], [1]],
    ['Bath 2 south', g.bedroom2ClosetEast, 12, e, 12, [door(1)]],
    ['Closet 2 east', g.bedroom2ClosetEast, n, g.bedroom2ClosetEast, 14],
    ['Closet 2 south', c, 14, g.bedroom2ClosetEast, 14, [door(.6, 2.5)]],
    ['Stairwell west', 0, ps, 0, sn, [win(31.1 - ps - 1.5, 3)], [-1]],
    ['Laundry north', c, ln, le, ln],
    ['Laundry west', g.laundryWest, ln, g.laundryWest, ss, [door(2.6)]],
    ['Laundry east', le, ln, le, ss, [win(2.45, 3)], [1]],
    ['Laundry south', g.bath4West, ss, g.serviceEast, ss, [door(9.75, 2.5)]],
    ['West bath north', 0, ss, 9.35, ss],
    ['West bath entry', 9.35, ss, 9.35, sn],
    ['East bath entry', g.bath4West, ss, g.bath4West, sn],
    ['Bedroom 3 north', 0, sn, cw, sn, [door(.8, 2.5), door(9.9, 2.5)]],
    ['Bedroom 3 west', 0, sn, 0, s, [win(4)], [-1]],
    ['Bedrooms south', 0, s, cw, s, getUpstairsFrontWindows().slice(0, 2).map(w => [w.center - w.width / 2, w.center + w.width / 2, w.sill, w.sill + w.height]), [-1]],
    ['Bedroom 4 south', ce, s, se, s, getUpstairsFrontWindows().slice(2).map(w => [w.center - ce - w.width / 2, w.center - ce + w.width / 2, w.sill, w.sill + w.height]), [-1]],
    ['Closet 4 south', cw, g.southClosetSouth, ce, g.southClosetSouth, [], [-1]],
    ['Bedroom 3 closet', cw, sn, cw, g.southClosetSouth, [door(0.6, 2.5)]],
    ['Closet 4 west return', cw, g.southClosetSouth, cw, s, [], [1]],
    ['Closet divider', cw, sn + 6.5, ce, sn + 6.5],
    ['Bedroom 4 closet', ce, sn, ce, g.southClosetSouth, [door(8.5, 2.5)]],
    ['Closet 4 east return', ce, g.southClosetSouth, ce, s, [], [-1]],
    ['Bedroom 4 north', cw, sn, se, sn, [door(6.4, 2.5), door(15.75, 2.5)]],
    ['Bedroom 4 east', se, sn, se, s, [], [1]],
    ['Linen furnace divider', fw, ss, fw, sn],
    ['Service east', g.serviceEast, ss, g.serviceEast, sn, [], [1]],
    ['Service east step', e, ss, g.serviceEast, ss, [], [-1]],
    ['Service south', se, sn, g.serviceEast, sn, [], [-1]]
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
      // Fixed cabinet runs and shower trays terminate at paint. Do not run
      // projecting baseboard through their backs or wet wall interfaces.
      if (['Laundry north', 'Laundry south', 'Laundry east', 'Bath 2 east',
        'Bath 2 north', 'Bath 2 south', 'West bath entry', 'East bath entry',
        'Bedroom 2 south', 'Service south', 'Bath north', 'Bath south', 'Toilet south',
        'Primary closet south', 'Primary closet south east', 'Primary closet linen south'].includes(name)) return;
      for (const side of sides) {
        // Bath wet-wall / fitted closet backs on the west face; retain the
        // Bedroom 2 finish on the other side and gallery-return baseboards.
        if (name === 'Primary closet east' && side === 1 && from === 0) continue;
        if (name === 'Primary closet linen west' && side === -1) continue;
        box(parent, (start + end) / 2, 1 / 3, side * (thickness / 2 + 0.03125), end - start, 2 / 3, 0.0625, windowTrim).name = 'Upstairs white baseboard';
      }
    }
    let cursor = 0;
    for (const [start, end, bottom, top] of openings) {
      section(cursor, start, 0, wallHeight);
      section(start, end, 0, bottom);
      section(start, end, top, wallHeight);
      if (bottom === 0) for (const side of sides) {
        // Slim side boards at the two front entries keep the projecting head
        // caps clear of the perpendicular bathroom/closet wall returns.
        const sideWidth = ['Bedroom 3 north', 'Bedroom 4 north', 'Primary suite entry', 'Bath south'].includes(name) ? 0.75 / 12 : 3.5 / 12;
        openingCasing(parent, (start + end) / 2, 0, end - start, top, thickness / 2, side, false, { sideWidth });
      }
      if (bottom === 0 && end - start <= 3.05) {
        // Deliberate 90-degree operating envelopes, not a 180-degree fold-back
        // through casings, fixtures or furniture. Default leaves remain closed.
        const rightHinge = (name === 'Bedroom 4 north' && start > 10) || name === 'Toilet partition'
          || name === 'Toilet south' || name === 'Bath south' || name === 'Primary closet east' || name === 'Bedroom 4 closet'
          || (name === 'Primary suite entry' && start > 16);
        const swingSign = name === 'Bath south' || (name === 'Primary suite entry' && start > 16) ? 1 : rightHinge ? -1 : (name === 'Bedroom 3 north' && start < 4) ? 1
          // Bath 2 reverses the diagram's outward arc, keeping its exact
          // wall opening and closed pose while avoiding the bed-head corner.
          : ['Primary suite entry', 'Bedroom 3 north', 'Bedroom 4 north', 'Laundry west', 'Closet 2 south'].includes(name) ? -1 : 1;
        const closedRotationY = rightHinge ? Math.PI : 0;
        const hinge = new THREE.Group();
        hinge.name = name === 'Toilet partition' && start > 5 ? 'Upstairs Primary bath linen closet door hinge' : `Upstairs ${name} interior door hinge`;
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
  function shelving(name, x, z, width, rotation = 0, depth = 1.3) {
    const item = furniture(name, x, z, rotation);
    for (const dx of [-width / 2, width / 2]) box(item, dx, 3.6, 0, 0.09, 7.2, depth, oak);
    for (const y of [0.3, 1.7, 3.1, 4.5, 5.9, 7.2]) {
      box(item, 0, y, 0, width, 0.09, depth, oak);
      if (y < 7) for (const dx of [-width / 4, width / 4]) {
        for (let fold = 0; fold < 3; fold++) box(item, dx, y + 0.13 + fold * 0.12, 0, width * 0.35, 0.12, 0.85, fold % 2 ? linen : cream, true);
      }
    }
    return item;
  }
  const primaryCenterX = g.primaryEast / 2;
  const primaryWestWall = plan.walls.find(wall => wall.name === 'Primary west');
  const primaryBedX = primaryWestWall.x1 + primaryWestWall.thickness / 2 + 0.0625 + 1 / 12 + 0.09 + (80 / 12 + 0.2) / 2;
  for (const [name, x, z, mattressWidth, mattressLength, rotation, bedsideSide] of [
    ['Primary bed', primaryBedX, g.north + 9.5, 5, 80 / 12, Math.PI / 2, -1],
    ['Bedroom 2 bed', 38.85, 18.475, 4.5, 6.25, 0, 1],
    ['Bedroom 3 bed', 0.175 + 0.0625 + 1 / 12 + 0.09 + (6.25 + 0.2) / 2, g.bedNorth + 5.3, 4.5, 6.25, Math.PI / 2, 1],
    ['Bedroom 4 bed', 27.214166666666667, g.bedNorth + 6.5, 4.5, 6.25, -Math.PI / 2, -1]
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
      const lampMount = name === 'Primary bed'
        ? { x: primaryWestWall.x1 + primaryWestWall.thickness / 2 + 0.04, z: z - side * 2, rotation: Math.PI / 2 }
        : name === 'Bedroom 2 bed'
          ? { x: g.bedEast - 0.215, z: 19.75, rotation: -Math.PI / 2 }
          : name === 'Bedroom 3 bed'
            ? { x: 0.215, z: z - dx, rotation: Math.PI / 2 }
            : { x: g.southEast - 0.215, z: z + dx, rotation: -Math.PI / 2 };
      wallLamp(`${name} bedside wall lamp ${side < 0 ? 'left' : 'right'}`, lampMount.x, lampMount.z, lampMount.rotation);
    }
  }
  // Full-size independent cabinets at the SVG coordinates.
  for (const [name, x, z] of [
    ['Primary nightstand 1', 1.375, 12.3], ['Primary nightstand 2', 1.375, 19.95],
    ['Bedroom 2 nightstand', 42.275, 16.25], ['Bedroom 3 nightstand', 1.375, 49.1],
    ['Bedroom 4 nightstand', 29.275, 50.5]
  ]) cabinet(furniture(name, x, z, 0, true), 0, 0, 1.55, 1.9, 1.5, 2);
  const primaryDeskSeat = desk('Primary', 8.8, 7.85, 0);
  primaryDeskSeat.position.z = 9.9;
  const bed2DeskSeat = desk('Bedroom 2', 38.25, 25.45, Math.PI);
  bed2DeskSeat.position.z = 23.3;
  const bed3DeskSeat = desk('Bedroom 3', 10.5, 50.85, Math.PI);
  bed3DeskSeat.position.z = 48.8;
  const bed4DeskSeat = desk('Bedroom 4', 19.9, 46.9, Math.PI / 2);
  bed4DeskSeat.position.set(21.9, 0, 47.05);
  // Exact desk footprints remain; mount task lights on paint, not at a
  // guessed offset or through the closet/bedroom opening.
  for (const [name, x, z] of [
    ['Primary', 8.8, g.north + .215], ['Bedroom 2', 38.25, g.primarySouth - .215],
    ['Bedroom 3', 10.5, g.south - .215], ['Bedroom 4', g.southClosetEast + .215, 46.9]
  ]) {
    const light = group.children.find(o => o.name === `Upstairs ${name} desk wall lamp`);
    light.position.set(x, 0, z);
  }
  const primarySouthWall = plan.walls.find(wall => wall.name === 'Primary south');
  const primarySeatingRearZ = primarySouthWall.z1 - primarySouthWall.thickness / 2 - 0.0625 - 1 / 12;
  loungeChair('Primary sitting chair 1', primaryCenterX - 0.9 - 3.15, primarySeatingRearZ - 2.25 / 2);
  loungeChair('Primary sitting chair 2', primaryCenterX - 0.9 + 3.15, primarySeatingRearZ - 2.25 / 2);
  const sittingTable = furniture('Primary sitting side table', primaryCenterX - 0.9, primarySeatingRearZ - 1.4 / 2, Math.PI, true);
  cabinet(sittingTable, 0, 0, 1.4, 1.8, 1.4, 1);
  // Retain the console/TV, shifted one foot north to clear the relocated
  // suite entry and its occupied approach, not just the closed leaf.
  const primaryMedia = furniture('Primary media console', g.primaryEast - 0.175 - 0.6, g.north + 10, -Math.PI / 2, true);
  cabinet(primaryMedia, 0, 0, 4, 1.6, 1.2, 2);
  const primaryTV = furniture('Primary wall TV', g.primaryEast - 0.235, g.north + 10, -Math.PI / 2);
  box(primaryTV, 0, 4.7, 0, 4, 2.3, 0.12, black).name = 'Primary TV screen';
  loungeChair('Bedroom 2 reading chair', 42.075, 24.725);
  loungeChair('Bedroom 3 reading chair', 5.125, 50.175);
  loungeChair('Bedroom 4 reading chair', 26.975, 50.775);
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
  vanity('Primary north vanity', 22.45, 15.65, 5, Math.PI);
  vanity('Primary south vanity', 17.75, 15.65, 4, Math.PI);
  vanity('Bedroom 2 vanity', 36.5, 7.9, 3);
  vanity('West bath vanity', 1.85, 36.35, 3);
  vanity('East bath vanity', 30, 36.35, 3);
  toilet('Primary toilet', 17, 7.85);
  toilet('Bedroom 2 toilet', 39.375, 8.15);
  toilet('West bath toilet', 4.725, 36.6);
  toilet('East bath toilet', 32.925, 36.6);
  for (const [name, x, z, w, d, rotation = 0] of [
    ['Primary shower', 25.8, 8.625, 3.5, 6, Math.PI / 2],
    ['Bedroom 2 shower', 42.325, 9.325, 3, 5],
    ['West bath shower', 7.675, 37.775, 3, 5],
    ['East bath shower', 35.825, 37.775, 3, 5]
  ]) {
    const item = furniture(name, x, z, rotation);
    box(item, 0, 0.12, 0, w, 0.24, d, cream);
    box(item, 0, 3, -d / 2 + 0.08, w, 6, 0.12, tile);
    box(item, 0, 5.5, -d / 2 + 0.4, 0.5, 0.06, 0.5, steel);
    box(item, 0, 3.2, -d / 2 + 0.18, 0.25, 0.4, 0.08, steel);
    box(item, 0, 0.25, 0, 0.3, 0.015, 0.3, steel);
  }
  // Balance the complete faucet envelope against the WC paint face and the
  // full shower body: 4.5 in on both sides, without scaling either fixture.
  const tub = furniture('Primary freestanding tub', 21.025, 9.45);
  box(tub, 0, 1, 0, 2.8, 2, 5.2, windowTrim, true);
  box(tub, 0, 1.9, 0, 2.25, 0.15, 4.4, cream, true);
  box(tub, 0, 1.99, 0, 1.9, 0.025, 3.9, windowTrim, true);
  box(tub, -1.7, 1.3, 0, 0.1, 2.6, 0.1, steel);
  box(tub, -1.4, 2.6, 0, 0.7, 0.1, 0.1, steel);
  for (const [index, z] of [30.55, 33.425].entries()) {
    const machine = furniture(index === 0 ? 'Washer' : 'Dryer', 42.2, z, -Math.PI / 2);
    box(machine, 0, 1.6, 0, 2.8, 3.2, 2.8, windowTrim);
    box(machine, 0, 1.5, 1.43, 1.8, 1.8, 0.08, black, true);
    box(machine, 0, 1.5, 1.48, 1.4, 1.4, 0.04, steel, true);
    box(machine, 0.8, 2.85, 1.45, 0.22, 0.22, 0.08, black, true);
  }
  const laundryStorage = furniture('Laundry wall cupboards', 43.2, 31.8, -Math.PI / 2);
  for (const x of [-2, 0, 2]) cabinet(laundryStorage, x, 0, 2, 2, 1.2, 1, true);
  laundryStorage.position.y = 5.2;
  const northUppers = furniture('Laundry north cupboards', 40.5, 27.675);
  for (const x of [-1, 1]) cabinet(northUppers, x, 0, 2, 2, 1.45, 1, true);
  northUppers.position.y = 5.2;
  const laundryCounter = furniture('Laundry folding counter', 30.5, 27.95);
  let baseStart = 0;
  for (const width of [2, 3, 3, 2]) {
    cabinet(laundryCounter, baseStart + width / 2, 0, width, 2.8, 2, 2, true);
    baseStart += width;
  }
  box(laundryCounter, 6.525, 2.95, .05, 13.25, .15, 2.1, cream).name = 'North laundry countertop to west wall';
  const southCounter = furniture('Laundry south bases', 30.5, 33.925, Math.PI);
  for (const x of [-1, -3, -5]) cabinet(southCounter, x, 0, 2, 2.8, 2, 2, true);
  box(southCounter, -3.25, 2.95, .05, 6.7, .15, 2.1, cream).name = 'South laundry countertop to west wall';
  box(group, 42.175, 2.95, 32, 2.95, .15, 5.8, cream).name = 'Laundry appliance counter east return';
  const furnace = furniture('Mechanical equipment reservation', 39.3, 38.9);
  box(furnace, 0, 3, 0, 2.5, 6, 2, steel);
  hangingBay('Primary closet long hanging', 17.9, 17.975, 5);
  hangingBay('Primary closet double hanging', 23, 17.975, 5, 0, true);
  shelving('Primary closet folded clothes', 16.9, 22.175, 2.7, Math.PI, 2);
  shelving('Primary closet east return shelves', 22.05, 25.9, 6.6, Math.PI);
  hangingBay('Primary closet return hanging', 26.1, 22.175, 5, Math.PI, true);
  const closetDresser = furniture('Primary closet drawers', 19.325, 23.2, Math.PI / 2);
  cabinet(closetDresser, 0, 0, 4, 2.9, 1.4, 4);
  hangingBay('Bedroom 2 closet hanging', 33.3, 10.95, 4.8, -Math.PI / 2, true);
  shelving('Bedroom 2 closet shelves', 31.65, 7.6, 4.6);
  hangingBay('Bedroom 3 closet hanging', 15.7, 45.7, 5, Math.PI, true);
  shelving('Bedroom 3 closet shelves', 17.75, 42.55, 3.5, -Math.PI / 2);
  hangingBay('Bedroom 4 closet hanging', 15.7, 48.3, 5, 0, true);
  shelving('Bedroom 4 closet shelves', 14.85, 50.8, 3.3, Math.PI);
  // Owner correction: north/west/south already have walls, not perimeter guards.
  // Retain the exposed east hall edge; leave the upper arrival open.
  const guardY = 1.5;
  const right = stairOpening.x + stairOpening.width;
  const front = stairOpening.z;
  const length = baseline.arrival.z - front;
  const rail = furniture('Stair opening guard', right, (front + baseline.arrival.z) / 2, -Math.PI / 2);
  for (const y of [0.7, 1.5, 2.3, 3]) box(rail, 0, y, 0, length, 0.07, 0.07, black);
  for (let position = -length / 2; position <= length / 2 + 0.01; position += length / Math.ceil(length / 3)) box(rail, position, guardY, 0, 0.08, 3, 0.08, black);
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
    primaryBrass.dispose();
    primaryPanel.dispose();
    primaryGlass.dispose();
  }
  return { group, rooms, areas, plan, baseline, dispose, coordinationWarnings, start: [16.5, 33], mapLabels: rooms.map((room) => [room.name, room.x + room.w / 2, room.z + room.d / 2]) };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getUpstairsRoomClearDimensions, getUpstairsMeasuredGeometry, getUpstairsExteriorSegments, getUpstairsDefaultPlan, getUpstairsFrontWindows, getUpstairsSideWindows, getUpstairsExteriorOpenings };
