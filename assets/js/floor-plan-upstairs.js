// Shared by the furnished plan and masonry elevation; nominal 3060 is NOT
// implied: these are 36 x 60 inch concept envelopes, pending product selection.
function getUpstairsMeasuredGeometry() {
  // Owner-approved Version H SVG: wall centerlines in feet.
  const t = 0.35;
  const primaryEast = 14.35, closetEast = 28.25, bedEast = 42 + 7 / 12;
  const bedroom2ClosetEast = 33.6;
  const southClosetWest = 12.35, southClosetEast = 18.85;
  const southEast = 31.2, laundryEast = bedEast, east = bedEast;
  const serviceSouth = 35.1, primarySouth = 26.75, north = 7.4;
  const bathWest = primaryEast, bathEast = closetEast, bathNorth = north;
  const closetNorth = 19, toiletEast = 17.975, toiletSouth = 12.675;
  const bedNorth = 40.45, southClosetSouth = 51.8;
  return { t, primaryEast, closetEast, bedEast, bedroom2ClosetEast, southClosetWest, southClosetEast, southClosetSouth,
    southEast, laundryEast, east, serviceSouth, north, primarySouth,
    closetNorth, bathWest, bathEast, bathNorth, toiletEast, toiletSouth, bedNorth, south: 53.8,
    laundryNorth: 26.75, laundryWest: 31 + 2.8 / 12, laundryNotchEast: 32 + 2.8 / 12,
    laundryNotchSouth: 29.8, serviceNorth: 35.1,
    furnaceWest: 36.75, serviceEast: bedEast, bath4West: 27.4, bath4East: 36.75,
    bedroom2North: 13.4, bedroom2ClosetSouth: 14.4, southClosetDivider: 46.45,
    atticEast: 55.5, atticNorth: 15, atticSouth: 40.45 };
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

// Exact half of the former garage-attic floor reservation, not the gallery.
function getUpstairsLoftGeometry() {
  const g = getUpstairsMeasuredGeometry();
  const x = g.east + .225, z = (g.atticNorth + g.atticSouth) / 2;
  return { x, z, w: g.atticEast - x, d: g.atticSouth - z };
}

function getUpstairsRoomClearDimensions(room, walls) {
  const allowance = (axis, coordinate) => {
    // Loft west bound is already the finished lining face, not a centerline.
    if (room.ceilingProfile === 'garage-loft' && axis === 'x' && Math.abs(coordinate-room.x)<.001) return 0;
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
    ['Primary west 1', 0.1, 12.4, 4, -Math.PI / 2, -1],
    ['Primary west 2', 0.1, 21.4, 4, -Math.PI / 2, -1],
    ['Primary bath', 21.19, g.bathNorth + 0.1, 3, 0, 1],
    ['Bath 2', 38.575, g.north + 0.1, 2, 0, 1],
    ['Bedroom 2 east 1', g.east - .1, 16.5, 4, -Math.PI / 2, 1],
    ['Bedroom 2 east 2', g.east - .1, 23, 4, -Math.PI / 2, 1],
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
  const { primaryEast: p, closetEast: c, bedEast: b, east: e,
    north: n, closetNorth: cn, bathEast: be, bathNorth: bn,
    primarySouth: ps, serviceSouth: ss, southEast: se, southClosetWest: cw,
    southClosetEast: ce, bedNorth: sn, south: s, laundryEast: le,
    laundryNorth: ln, furnaceWest: fw, bedroom2North: b2n, bedroom2ClosetSouth: c2s } = g;
  const room = (name, x, z, right, bottom, tile = false) => ({ name, x, z, w: right - x, d: bottom - z, tile });
  const rooms = [
    room('Primary bedroom', 0, n, p, ps),
    room('Primary bath', p, bn, be, cn, true),
    room('Primary toilet', g.bathWest, bn, g.toiletEast, g.toiletSouth, true),
    room('Primary closet', p, cn, c, ps),
    room('Bedroom 2', c, b2n, b, ps),
    room('Bedroom 2 bath', g.bedroom2ClosetEast, n, e, b2n, true),
    room('Bedroom 2 closet', c, n, g.bedroom2ClosetEast, c2s),
    room('Laundry (relocated)', g.laundryWest, ln, le, ss, true),
    room('Shared bath west', 0, ss, 9.35, sn, true),
    room('Shared bath east', g.bath4West, ss, g.bath4East, sn, true),
    room('Bedroom 3', 0, sn, cw, s),
    room('Bedroom 3 closet', cw, sn, ce, g.southClosetDivider),
    room('Bedroom 4', ce, sn, se, s),
    room('Bedroom 4 closet', cw, g.southClosetDivider, ce, g.southClosetSouth),
    room('Mechanical (relocated)', fw, ss, g.serviceEast, sn),
    { name: 'Finished loft', ...getUpstairsLoftGeometry(), ceilingProfile: 'garage-loft',
      finishedIntent: true, conditioningApproved: false, headroomApproved: false },
    { ...room('Gallery', p, ps, g.laundryWest, ss), circulationOnly: true }
  ];
  const floors = [];
  function slab(name, x, z, w, d, room = null) {
    floors.push({ name, x, z, w, d, room });
  }
  for (const room of rooms) {
    if (room.circulationOnly) continue;
    if (room.name === 'Primary bath') {
      slab('Primary bath north', g.toiletEast, bn, be - g.toiletEast, g.toiletSouth - bn, room.name);
      slab(room.name, p, g.toiletSouth, be - p, cn - g.toiletSouth, room.name);
    } else if (room.name === 'Bedroom 2') {
      slab(room.name, c, c2s, b - c, ps - c2s, room.name);
      slab('Bedroom 2 north east', g.bedroom2ClosetEast, b2n, b - g.bedroom2ClosetEast, c2s - b2n, room.name);
    } else if (room.name === 'Laundry (relocated)') {
      slab('Laundry north', g.laundryNotchEast, ln, le - g.laundryNotchEast, g.laundryNotchSouth - ln, room.name);
      slab('Laundry main', g.laundryWest, g.laundryNotchSouth, le - g.laundryWest, ss - g.laundryNotchSouth, room.name);
    } else slab(room.name, room.x, room.z, room.w, room.d, room.name);
  }
  slab('Central gallery', p, ps, g.laundryWest - p, ss - ps);
  slab('Bedroom 2 entry notch', g.laundryWest, ln, g.laundryNotchEast - g.laundryWest, g.laundryNotchSouth - ln);
  slab('Finished loft doorway', e, 29.8, .225, 3, 'Finished loft');
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
    ['Primary suite entry', p, n, p, ps, [door(6.1)]],
    ['Primary south', 0, ps, p, ps, [door(10.85)]],
    ['Bath north', g.bathWest, bn, be, bn, [win(21.19 - g.bathWest - 1.5, 3)], [1]],
    ['Toilet partition', g.toiletEast, bn, g.toiletEast, g.toiletSouth],
    ['Toilet south', g.bathWest, g.toiletSouth, g.toiletEast, g.toiletSouth, [door(.55, 2.5)]],
    ['Bath south', p, cn, be, cn, [door(6.35, 2.5)]],
    ['Primary closet east', c, n, c, ps],
    ['Primary closet south', p, ps, c, ps],
    ['Bedroom 2 east', b, b2n, b, ps, [win(1.1), win(7.6)], [1]],
    ['Bedroom 2 south', c, ps, b, ps, [door(.6)]],
    ['Bath 2 north', g.bedroom2ClosetEast, n, e, n, [win(3.975, 2)], [1]],
    ['Closet 2 north', c, n, g.bedroom2ClosetEast, n, [], [1]],
    ['Bath 2 east', e, n, e, b2n, [], [1]],
    ['Bath 2 south', g.bedroom2ClosetEast, b2n, e, b2n, [door(1.3)]],
    ['Closet 2 east', g.bedroom2ClosetEast, n, g.bedroom2ClosetEast, c2s],
    ['Closet 2 south', c, c2s, g.bedroom2ClosetEast, c2s, [door(.6, 2.5)]],
    ['Stairwell west', 0, ps, 0, sn, [win(31.1 - ps - 1.5, 3)], [-1]],
    ['Laundry north', g.laundryNotchEast, ln, le, ln],
    ['Laundry notch west', g.laundryNotchEast, ln, g.laundryNotchEast, g.laundryNotchSouth],
    ['Laundry notch return', g.laundryWest, g.laundryNotchSouth, g.laundryNotchEast, g.laundryNotchSouth],
    ['Laundry west', g.laundryWest, g.laundryNotchSouth, g.laundryWest, ss, [door(.25)]],
    ['Laundry east', le, ln, le, ss, [door(3.05)]],
    ['Laundry south', g.bath4West, ss, g.serviceEast, ss, [door(11.825)]],
    ['West bath north', 0, ss, 9.35, ss],
    ['West bath entry', 9.35, ss, 9.35, sn],
    ['East bath entry', g.bath4West, ss, g.bath4West, sn],
    ['Bedroom 3 north', 0, sn, cw, sn, [door(.8, 2.5), door(9.6, 2.5)]],
    ['Bedroom 3 west', 0, sn, 0, s, [win(4)], [-1]],
    ['Bedrooms south', 0, s, cw, s, getUpstairsFrontWindows().slice(0, 2).map(w => [w.center - w.width / 2, w.center + w.width / 2, w.sill, w.sill + w.height]), [-1]],
    ['Bedroom 4 south', ce, s, se, s, getUpstairsFrontWindows().slice(2).map(w => [w.center - ce - w.width / 2, w.center - ce + w.width / 2, w.sill, w.sill + w.height]), [-1]],
    ['Closet 4 south', cw, g.southClosetSouth, ce, g.southClosetSouth, [], [-1]],
    ['Bedroom 3 closet', cw, sn, cw, g.southClosetSouth, [door(.6, 2.5)]],
    ['Closet 4 west return', cw, g.southClosetSouth, cw, s, [], [1]],
    ['Closet divider', cw, g.southClosetDivider, ce, g.southClosetDivider],
    ['Bedroom 4 closet', ce, sn, ce, g.southClosetSouth, [door(8.5, 2.5)]],
    ['Closet 4 east return', ce, g.southClosetSouth, ce, s, [], [-1]],
    ['Bedroom 4 north', cw, sn, se, sn, [door(6.95, 2.5), door(16, 2.5)]],
    ['Bedroom 4 east', se, sn, se, s, [], [1]],
    ['Linen furnace divider', fw, ss, fw, sn],
    ['Service east', g.serviceEast, ss, g.serviceEast, sn, [], [1]],
    ['Service south', se, sn, g.serviceEast, sn, [], [-1]],
    ['Finished loft north', g.east + .225, (g.atticNorth + g.atticSouth) / 2, g.atticEast, (g.atticNorth + g.atticSouth) / 2],
    ['Finished loft south', g.east + .225, g.atticSouth, g.atticEast, g.atticSouth],
    ['Finished loft east', g.atticEast, (g.atticNorth + g.atticSouth) / 2, g.atticEast, g.atticSouth]
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
    if (wall.name.startsWith('Finished loft ')) continue; // Roof-fitted shell below.
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
        // Clip only the affected finish face at wet trays / fitted wardrobe
        // backs. In particular retain the Bedroom 3 face of its bath wall.
        const exclusions = name === 'West bath north' && side === 1 ? [[6.175, 9.175]]
          : name === 'Bedroom 3 north' && side === -1 ? [[6.175, 9.175]]
          : name === 'Linen furnace divider' && side === 1 ? [[.175, 5.175]]
          : name === 'Closet 2 east' && side === 1 ? [[1.05, 5.5]]
          : [];
        let spans = [[start, end]];
        for (const [a, b] of exclusions) spans = spans.flatMap(([l, r]) => r <= a || l >= b ? [[l, r]] : [[l, Math.min(r, a)], [Math.max(l, b), r]].filter(([u, v]) => v > u));
        for (const [a, b] of spans) box(parent, (a + b) / 2, 1 / 3, side * (thickness / 2 + 0.03125), b - a, 2 / 3, 0.0625, windowTrim).name = 'Upstairs white baseboard';
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
        const sideWidth = ['Bedroom 3 north', 'Bedroom 4 north', 'Primary suite entry', 'Bath south', 'Laundry west', 'Laundry south'].includes(name) ? 0.75 / 12 : 3.5 / 12;
        openingCasing(parent, (start + end) / 2, 0, end - start, top, thickness / 2, side, false, { sideWidth, flushHeadEnds: name === 'Laundry west' });
      }
      if (bottom === 0 && end - start <= 3.05) {
        // Deliberate 90-degree operating envelopes, not a 180-degree fold-back
        // through casings, fixtures or furniture. Default leaves remain closed.
        const rightHinge = ['Primary south', 'Bath south', 'Laundry west', 'Laundry south', 'Bedroom 4 closet'].includes(name)
          || (name === 'Bedroom 4 north' && start > 10);
        const swingSign = ['Laundry west', 'Laundry south', 'Laundry east', 'Toilet south', 'Bedroom 2 south', 'Bath 2 south', 'Bedroom 3 closet'].includes(name) ? 1
          : name === 'Bedroom 3 north' && start < 4 ? 1 : -1;
        const closedRotationY = rightHinge ? Math.PI : 0;
        const hinge = new THREE.Group();
        hinge.name = name === 'Toilet partition' && start > 5 ? 'Upstairs Primary bath linen closet door hinge' : `Upstairs ${name} interior door hinge`;
        // Surface hinge axis lies beyond paint + casing + half leaf thickness.
        // Centerline pivots cut their own jamb at intermediate angles. This
        // rebated/offset-hinge concept retains the aperture and full 90° motion.
        const openingSide = -(rightHinge ? -1 : 1) * swingSign;
        const hingeOffset = thickness / 2 + .0625 + .13 / 2 + 1 / 96;
        // Painted aperture lining and stops complete the offset-leaf concept;
        // these sit behind its closing face, not across the operating sweep.
        // Lining/wall contact is intentional joinery, not a second partition.
        const jambDepth = thickness + .125;
        for (const [edge, direction] of [[start, -1], [end, 1]]) {
          box(parent, edge + direction * .02, top / 2, 0, .04, top, jambDepth, windowTrim).name = 'Upstairs painted door jamb lining';
          box(parent, edge + direction * .005, top / 2, openingSide * (jambDepth / 2 + .005),
            .05, top, .01, windowTrim).name = 'Upstairs door jamb stop';
        }
        box(parent, (start + end) / 2, top + .02, 0, end - start, .04, jambDepth, windowTrim).name = 'Upstairs painted door head lining';
        box(parent, (start + end) / 2, top + .005, openingSide * (jambDepth / 2 + .005),
          end - start, .05, .01, windowTrim).name = 'Upstairs door head stop';
        hinge.position.set(closedRotationY ? end - 0.02 : start + 0.02, 0, openingSide * hingeOffset);
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
  const primaryBedX = 3.8;
  for (const [name, x, z, mattressWidth, mattressLength, rotation, bedsideSide] of [
    ['Primary bed', primaryBedX, 16.15, 5, 80 / 12, Math.PI / 2, -1],
    ['Bedroom 2 bed', 38, 19.325, 4.5, 6.25, 0, -1],
    ['Bedroom 3 bed', 5.5, 49.9, 4.5, 6.25, Math.PI, 1],
    ['Bedroom 4 bed', 26.5, 49.9, 4.5, 6.25, Math.PI, -1]
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
        ? { x: primaryWestWall.x1 + primaryWestWall.thickness / 2 + 0.04, z: side < 0 ? 18.8 : 14.95, rotation: Math.PI / 2 }
        : name === 'Bedroom 2 bed'
          ? { x: g.bedEast - .215, z: 19.75, rotation: -Math.PI / 2 }
          : name === 'Bedroom 3 bed'
            ? { x: 2.2, z: g.south - .215, rotation: Math.PI }
            : { x: 29.8, z: g.south - .215, rotation: Math.PI };
      wallLamp(`${name} bedside wall lamp ${side < 0 ? 'left' : 'right'}`, lampMount.x, lampMount.z, lampMount.rotation);
    }
  }
  // Drawer fronts face the bed-foot direction, never across the mattress.
  for (const [name, x, z, rotation] of [
    ['Primary nightstand 1', 1.2, 12.6, Math.PI / 2], ['Primary nightstand 2', 1.2, 19.7, Math.PI / 2],
    ['Bedroom 2 nightstand', 34.7, 17.35, 0], ['Bedroom 3 nightstand', 2.2, 52, Math.PI],
    ['Bedroom 4 nightstand', 29.8, 52, Math.PI]
  ]) cabinet(furniture(name, x, z, rotation, true), 0, 0, 1.55, 1.9, 1.5, 2);
  const primaryDeskSeat = desk('Primary', 8.8, 8.6, 0);
  primaryDeskSeat.position.set(8.8, 0, 10.65);
  const bed2DeskSeat = desk('Bedroom 2', 34, 25.45, Math.PI);
  bed2DeskSeat.position.set(34, 0, 23.4);
  const bed3DeskSeat = desk('Bedroom 3', 6.4, 41.6, 0);
  bed3DeskSeat.position.set(6.4, 0, 43.65);
  const bed4DeskSeat = desk('Bedroom 4', 25.1, 41.6, 0);
  bed4DeskSeat.position.set(25.1, 0, 43.65);
  // Exact desk footprints remain; mount task lights on paint, not at a
  // guessed offset or through the closet/bedroom opening.
  for (const [name, x, z] of [
    ['Primary', 8.8, g.north + .215], ['Bedroom 2', 34, g.primarySouth - .215],
    ['Bedroom 3', 6.4, g.bedNorth + .215], ['Bedroom 4', 25.1, g.bedNorth + .215]
  ]) {
    const light = group.children.find(o => o.name === `Upstairs ${name} desk wall lamp`);
    light.position.set(x, 0, z);
  }
  const primarySouthWall = plan.walls.find(wall => wall.name === 'Primary south');
  const primarySeatingRearZ = primarySouthWall.z1 - primarySouthWall.thickness / 2 - 0.0625 - 1 / 12;
  loungeChair('Primary sitting chair 1', 3.875, 25.225);
  loungeChair('Primary sitting chair 2', 9.075, 25.225);
  const sittingTable = furniture('Primary sitting side table', 7.025, 25.65, Math.PI, true);
  cabinet(sittingTable, 0, 0, 1.4, 1.8, 1.4, 1);
  const primaryMedia = furniture('Primary media console', 13.3, 19.6, -Math.PI / 2, true);
  cabinet(primaryMedia, 0, 0, 4, 1.6, 1.2, 2);
  const primaryTV = furniture('Primary wall TV', g.primaryEast - 0.235, 19.6, -Math.PI / 2);
  box(primaryTV, 0, 4.7, 0, 4, 2.3, 0.12, black).name = 'Primary TV screen';
  loungeChair('Bedroom 2 reading chair', 40.825, 24.725);
  loungeChair('Bedroom 3 reading chair', 1.6, 44.3, -Math.PI / 2);
  loungeChair('Bedroom 4 reading chair', 29.7, 44.3, Math.PI / 2);
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
      // Bath 2's partition-side door hinges toward the centre of its box,
      // keeping the real pull projection away from the closet partition.
      if (name === 'Bedroom 2 vanity' && index === 0) front.userData.hingeSide = 1;
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
  vanity('Primary north vanity', 17.35, 17.875, 5, Math.PI);
  vanity('Primary south vanity', 25.85, 17.875, 4, Math.PI);
  vanity('Bedroom 2 vanity', 35.35, 8.65, 3);
  vanity('West bath vanity', 1.85, 36.35, 3);
  vanity('East bath vanity', 29.25, 36.35, 3);
  toilet('Primary toilet', 16.25, 8.65);
  toilet('Bedroom 2 toilet', 38.141666666666666, 8.6);
  toilet('West bath toilet', 4.725, 36.3);
  toilet('East bath toilet', 32.175, 36.3);
  for (const [name, x, z, w, d, rotation = 0] of [
    ['Primary shower', 26.15, 10.75, 3.5, 6],
    ['Bedroom 2 shower', 40.90833333333333, 10.075, 3, 5],
    ['West bath shower', 7.675, 37.775, 3, 5],
    ['East bath shower', 35.075, 37.775, 3, 5]
  ]) {
    const item = furniture(name, x, z, rotation);
    box(item, 0, 0.12, 0, w, 0.24, d, cream);
    box(item, 0, 3, -d / 2 + 0.08, w, 6, 0.12, tile);
    box(item, 0, 5.5, -d / 2 + 0.4, 0.5, 0.06, 0.5, steel);
    box(item, 0, 3.2, -d / 2 + 0.18, 0.25, 0.4, 0.08, steel);
    box(item, 0, 0.25, 0, 0.3, 0.015, 0.3, steel);
  }
  // Full-size tub runs east-west along the rear wall as drawn in Version H.
  const tub = furniture('Primary freestanding tub', 21.19, 9.15, Math.PI / 2);
  box(tub, 0, 1, 0, 2.8, 2, 5.2, windowTrim, true);
  box(tub, 0, 1.9, 0, 2.25, 0.15, 4.4, cream, true);
  box(tub, 0, 1.99, 0, 1.9, 0.025, 3.9, windowTrim, true);
  box(tub, -1.7, 1.3, 0, 0.1, 2.6, 0.1, steel);
  box(tub, -1.4, 2.6, 0, 0.7, 0.1, 0.1, steel);
  for (const [index, x] of [37.95, 40.85].entries()) {
    const machine = furniture(index === 0 ? 'Washer' : 'Dryer', x, 28.325);
    box(machine, 0, 1.6, 0, 2.8, 3.2, 2.8, windowTrim);
    box(machine, 0, 1.5, 1.43, 1.8, 1.8, 0.08, black, true);
    box(machine, 0, 1.5, 1.48, 1.4, 1.4, 0.04, steel, true);
    box(machine, 0.8, 2.85, 1.45, 0.22, 0.22, 0.08, black, true);
  }
  const northUppers = furniture('Laundry north cupboards', 34.5, 27.675);
  for (const x of [-1, 1]) cabinet(northUppers, x, 0, 2, 2, 1.45, 1, true);
  northUppers.position.y = 5.2;
  const southUppers = furniture('Laundry wall cupboards', 34.5, 34.325, Math.PI);
  for (const x of [-2, 0, 2]) cabinet(southUppers, x, 0, 2, 2, 1.2, 1, true);
  southUppers.position.y = 5.2;
  const laundryCounter = furniture('Laundry folding counter', 32.5, 27.95);
  for (const x of [1, 3]) cabinet(laundryCounter, x, 0, 2, 2.8, 2, 2, true);
  box(laundryCounter, 2, 2.95, .05, 4.1, .15, 2.1, cream).name = 'North laundry countertop';
  const southCounter = furniture('Laundry south bases', 38.6, 33.925, Math.PI);
  let baseStart = 0;
  for (const width of [2, 2, 3]) {
    cabinet(southCounter, baseStart + width / 2, 0, width, 2.8, 2, 2, true);
    baseStart += width;
  }
  const fillerStart = g.laundryWest + g.t / 2 + .0625 + .01;
  const fillerEnd = 38.6 - 7;
  box(group, (fillerStart + fillerEnd) / 2, 1.4, 33.925,
    fillerEnd - fillerStart, 2.8, 2, oak).name = 'Laundry west separate trim-side filler';
  box(southCounter, 3.5, 2.95, .05, 7.1, .15, 2.1, cream).name = 'South laundry countertop';
  const furnace = furniture('Mechanical equipment reservation', 38.4, 39.25);
  box(furnace, 0, 3, 0, 2.5, 6, 2, steel);
  hangingBay('Primary closet long hanging', 17.2, 25.5, 5, Math.PI);
  hangingBay('Primary closet double hanging', 22.3, 25.5, 5, Math.PI, true);
  shelving('Primary closet folded clothes', 16.9, 19.9, 4);
  shelving('Primary closet north return shelves', 19.65, 19.9, 1.2, 0, .75);
  hangingBay('Primary closet return hanging', 25.9, 25.5, 2, Math.PI, true);
  const closetDresser = furniture('Primary closet drawers', 25.65, 19.95);
  cabinet(closetDresser, 0, 0, 4, 2.9, 1.4, 4);
  hangingBay('Bedroom 2 closet hanging', 32.4, 10.675, 4.25, -Math.PI / 2, true);
  // This five-foot closet cannot hold opposing 24 / 15.6-inch runs with
  // a useful aisle. Retain the intact folded-storage bay on the bedroom's
  // solid west wall, immediately outside the wardrobe approach.
  shelving('Bedroom 2 closet shelves', 29.15, 20, 4.6, Math.PI / 2);
  hangingBay('Bedroom 3 closet hanging', 17.6, 43.45, 5, -Math.PI / 2, true);
  shelving('Bedroom 3 closet shelves', 11.4, 47, 3.1, -Math.PI / 2);
  hangingBay('Bedroom 4 closet hanging', 15.55, 47.7, 5.6, 0, true);
  // Preserve the complete shelf bay/contents in its bedroom, not a shallow
  // substitute across Closet 4's unusable 16-inch aisle.
  shelving('Bedroom 4 closet shelves', 19.8, 45.7, 4.5, Math.PI / 2);

  const sofa = furniture('Gallery sofa', 21.5, 31.5, Math.PI, true);
  sofa.userData = { viewerFurniture: true, widthFeet: 7, depthFeet: 3, heightFeet: 2.8, productSelected: false };
  box(sofa, 0, .55, 0, 6.6, .7, 2.6, oak);
  for (const x of [-2.9, 2.9]) for (const z of [-1.05, 1.05]) box(sofa, x, .2, z, .2, .4, .2, oak);
  box(sofa, 0, 1.3, 0, 7, .8, 3, linen, true);
  box(sofa, 0, 2.2, 1.2, 7, 1.2, .6, linen, true);
  for (const x of [-3.25, 3.25]) box(sofa, x, 1.8, 0, .5, 1.2, 2.8, linen, true);
  for (const x of [-2, 0, 2]) box(sofa, x, 1.8, -.35, 1.9, .2, 1.8, cream, true);
  const coffee = furniture('Gallery coffee table', 21.5, 35.35, 0, true);
  box(coffee, 0, 1.4, 0, 4, .18, 2, oak, true);
  for (const x of [-1.7, 1.7]) for (const z of [-.7, .7]) box(coffee, x, .65, z, .12, 1.3, .12, black);
  loungeChair('Gallery armchair', 25.2, 35.3, Math.PI / 2);
  const endTable = furniture('Gallery side table', 16.8, 32, 0, true);
  box(endTable, 0, 1.8, 0, 1.5, .15, 1.5, oak, true);
  for (const x of [-.6, .6]) for (const z of [-.6, .6]) box(endTable, x, .85, z, .1, 1.7, .1, black);

  const loft = new THREE.Group();
  loft.name = 'Upstairs Finished loft - professional approval required';
  const section = HomeRoof.getFinishedLoftSection(elevation);
  loft.userData = { finishedIntent: true, areaCounted: true, supportApproved: false,
    walkOnApproved: false, headroomApproved: false, conditioningApproved: false,
    minimumModeledHeadroomFeet: section.heightAt(g.atticEast),
    framingReserveFeet: section.framingReserveFeet };
  group.add(loft);
  const footprint = getUpstairsLoftGeometry();
  // Northern half is an unmodeled, unfinished roof void, not another tan floor.
  const attic = new THREE.Group();
  attic.name = 'Upstairs Northern unfinished attic - excluded roof void';
  attic.userData = { storageOnly: true, areaCounted: false, walkOnApproved: false,
    supportApproved: false, headroomApproved: false,
    bounds: { ...footprint, z: g.atticNorth, d: footprint.z - g.atticNorth } };
  group.add(attic);
  function finishedPanel(name, x1, x2, z1, z2, bottom, ceiling = false) {
    const points = [];
    for (const [x, z] of [[x1,z1],[x2,z1],[x2,z2],[x1,z2]]) points.push([x, ceiling ? section.heightAt(x) : bottom, z]);
    for (const [x, z] of [[x1,z1],[x2,z1],[x2,z2],[x1,z2]]) points.push([x, section.heightAt(x) + (ceiling ? .05 : 0), z]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    geometry.setIndex([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, wallMaterial);
    mesh.name = name;
    mesh.userData.tourObstacle = !ceiling;
    loft.add(mesh);
    return mesh;
  }
  for (const wall of plan.walls.filter(w => w.name.startsWith('Finished loft '))) {
    const vertical = wall.x1 === wall.x2, half = wall.thickness / 2;
    finishedPanel(`Upstairs wall: ${wall.name}`, wall.x1 - (vertical ? half : 0),
      wall.x2 + (vertical ? half : 0), wall.z1 - (vertical ? 0 : half),
      wall.z2 + (vertical ? 0 : half), 0);
    box(loft, (wall.x1 + wall.x2) / 2 - (vertical ? half + .03125 : 0), 1 / 3,
      (wall.z1 + wall.z2) / 2 + (vertical ? 0 : wall.name.endsWith('north') ? half + .03125 : -half - .03125),
      vertical ? .0625 : wall.x2 - wall.x1, 2 / 3,
      vertical ? wall.z2 - wall.z1 : .0625, windowTrim).name = 'Finished loft white baseboard';
  }
  // Finish the former exterior face continuously to the exact slab edge.
  // Retain the existing 36 x 96-inch laundry aperture and its actual casing.
  for (const [a,b] of [[footprint.z,29.8],[32.8,g.atticSouth]]) {
    box(loft, g.east + .2, 4.5, (a+b)/2, .05, 9, b-a, wallMaterial).name = 'Finished loft west painted lining';
    const start=a===32.8?a+.3020833333:a, end=b===29.8?b-.3020833333:b;
    box(loft, footprint.x+.03125, 1/3, (start+end)/2, .0625, 2/3, end-start, windowTrim).name = 'Finished loft west white baseboard';
  }
  box(loft, g.east+.2, 8.5, 31.3, .05, 1, 3, wallMaterial).name = 'Finished loft retained doorway head lining';
  const ceiling = finishedPanel('Finished loft flat nine-foot painted ceiling', footprint.x, g.atticEast,
    footprint.z, g.atticSouth, 0, true);
  ceiling.userData.tourCeiling = true;
  ceiling.visible = false; // Cutaway views; restored for the actual room tour.
  // Three inches north clears the new south baseboard at full 36-in leaf travel.
  const atticBases = furniture('Finished loft retained standard bases', 49.8, 36.05);
  atticBases.userData = { finishedIntent: true, supportApproved: false };
  cabinet(atticBases, 1.5, 0, 3, 2.8, 2, 2, true);
  cabinet(atticBases, 4, 0, 2, 2.8, 2, 2, true);
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
  return { group, rooms, areas, plan, baseline, dispose, coordinationWarnings, start: [14.625, 33.125], mapLabels: rooms.map((room) => [room.name, room.x + room.w / 2, room.z + room.d / 2]) };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getUpstairsLoftGeometry, getUpstairsRoomClearDimensions, getUpstairsMeasuredGeometry, getUpstairsExteriorSegments, getUpstairsDefaultPlan, getUpstairsFrontWindows, getUpstairsSideWindows, getUpstairsExteriorOpenings };
