// Version I provisional wall centerlines, in feet; products remain unselected.
function getUpstairsMeasuredGeometry() {
  return { t: .35, north: 7.4, primaryEast: 15.059524, closetEast: 29.267857,
    bathWest: 15.059524, bathEast: 29.267857, bathNorth: 7.4, closetNorth: 19.775,
    primarySouth: 27.763095, bedEast: 43.869048, bedroom2ClosetEast: 34.440476,
    bedroom2North: 12.834523, bedroom2ClosetSouth: 15.911905,
    east: 55.916667, loftWest: 43.869048, loftNorth: 19.775,
    laundryEast: 55.916667, laundryNorth: 33.459524, laundryWest: 42.559524,
    laundryNotchEast: 43.869048, laundryNotchSouth: 36.144048,
    serviceNorth: 36.144048, serviceSouth: 41.578571, serviceEast: 55.916667,
    furnaceWest: 37.583333, furnaceEast: 42.559524, bath4West: 27.172619, bath4East: 37.583333,
    bath3East: 10.541667, stairTraceEast: 11.065476,
    bedNorth: 41.578571, southClosetWest: 13.160714, southClosetEast: 19.053571,
    southClosetDivider: 46.161905, southClosetSouth: 55.066667,
    southEast: 32.017857, south: 55.066667 };
}

function getUpstairsFrontWindows() {
  const g = getUpstairsMeasuredGeometry();
  return [g.southClosetWest / 2, (g.southClosetEast + g.southEast) / 2].flatMap((center, index) =>
    [-1.25, 1.25].map((offset, unit) => ({
      name: `Bedroom ${index + 3} south ${unit ? 'right' : 'left'}`,
      openingId: `Bedroom ${index + 3} front`, center: center + offset,
      width: 2.5, sill: 3, height: 5
    })));
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
  const g = getUpstairsMeasuredGeometry();
  return [
    ['Primary west north', .1, 12, 5, -Math.PI / 2, -1],
    ['Primary west south', .1, 22.5, 5, -Math.PI / 2, -1],
    ['Primary north', 7.5, g.north + .1, 5, 0, 1],
    ['Primary bath north', 22.15, g.north + .1, 5, 0, 1],
    ['Closet 2 north', 31.854167, g.north + .1, 2.5, 0, 1],
    ['Bath 2 north', 38.9, g.north + .1, 2.5, 0, 1],
    ['Bedroom 2 east north', g.bedEast - .1, 16, 5, -Math.PI / 2, 1],
    ['Loft north', 49.9, g.loftNorth + .1, 5, 0, 1],
    ['Loft east', g.east - .1, 27.5, 5, -Math.PI / 2, 1],
    ['Laundry east', g.east - .1, 37.8, 3, -Math.PI / 2, 1],
    ['Laundry south', 49.238095, g.serviceSouth - .1, 3, 0, -1],
    ['Stairs west', .1, 30.75, 2.5, -Math.PI / 2, -1],
    ['Bath 3 west', .1, 38.75, 2.5, -Math.PI / 2, -1],
    ['Bedroom 3 west', .1, 48.5, 5, -Math.PI / 2, -1],
    ['Closet 4 front', 16.107143, g.south - .1, 2.5, 0, -1],
    ['Bath 4 south', 34.800595, g.serviceSouth - .1, 2.5, 0, -1]
  ];
}

function getUpstairsExteriorSegments() {
  const g = getUpstairsMeasuredGeometry();
  return [
    ['front bedrooms', 0, g.south, g.southClosetWest, g.south],
    ['closet 4 front', g.southClosetWest, g.south, g.southClosetEast, g.south],
    ['front bedroom 4', g.southClosetEast, g.south, g.southEast, g.south],
    ['west', 0, g.north, 0, g.south],
    ['primary rear', 0, g.north, g.bathWest, g.north],
    ['bath rear', g.bathWest, g.north, g.bathEast, g.north],
    ['bedroom rear', g.bathEast, g.north, g.bedEast, g.north],
    ['bedroom 2 east', g.bedEast, g.north, g.bedEast, g.loftNorth],
    ['loft rear', g.bedEast, g.loftNorth, g.east, g.loftNorth],
    ['east rooms', g.east, g.loftNorth, g.east, g.serviceSouth],
    ['service south', g.southEast, g.serviceSouth, g.east, g.serviceSouth],
    ['bedroom east return', g.southEast, g.bedNorth, g.southEast, g.south]
  ];
}

function getUpstairsExteriorOpenings(x1, z1, x2, z2, elevation = 10) {
  const dx = x2 - x1, dz = z2 - z1, length = Math.hypot(dx, dz);
  const g = getUpstairsMeasuredGeometry();
  const front = [['Bedroom 3 front', g.southClosetWest / 2, g.south - .1, 5],
    ['Bedroom 4 front', (g.southClosetEast + g.southEast) / 2, g.south - .1, 5]];
  return [...getUpstairsSideWindows(), ...front].flatMap(([name, x, z, width]) => {
    const center = ((x - x1) * dx + (z - z1) * dz) / length;
    const normalDistance = Math.abs((x - x1) * dz - (z - z1) * dx) / length;
    return normalDistance < .15 && center - width / 2 >= -1e-6 && center + width / 2 <= length + 1e-6
      ? [{ name, center, width, sill: elevation + 3, height: 5 }] : [];
  }).sort((a, b) => a.center - b.center);
}

function getUpstairsDefaultPlan(stairOpening) {
  const g = getUpstairsMeasuredGeometry();
  const { primaryEast: p, closetEast: c, bedEast: b, east: e, north: n, closetNorth: cn,
    primarySouth: ps, serviceNorth: ss, southEast: se, southClosetWest: cw,
    southClosetEast: ce, bedNorth: sn, south: s, laundryNorth: ln, laundryWest: lw,
    furnaceWest: fw, bedroom2North: b2n, bedroom2ClosetSouth: c2s } = g;
  const right = stairOpening.x + stairOpening.width;
  const arrivalDepth = stairOpening.depth - 44 / 12 - .25;
  const arrival = { x: right, z: stairOpening.z + stairOpening.depth - arrivalDepth, w: 44 / 12, d: arrivalDepth };
  const primaryNotchNorth = stairOpening.z - g.t / 2;
  const westServiceNorth = stairOpening.z + stairOpening.depth + g.t / 2;
  const room = (name, x, z, r, bottom, tile = false) => ({ name, x, z, w: r - x, d: bottom - z, tile });
  const rooms = [
    { ...room('Primary bedroom', 0, n, p, primaryNotchNorth),
      tracedFootprint: { x: 0, z: n, w: p, d: ps - n }, registrationException: 'Straight south wall aligned to fixed downstairs stair; former return belongs to hall' },
    room('Primary bath', p, n, c, cn, true),
    room('Primary closet', p, cn, c, ps),
    room('Bedroom 2', c, b2n, b, ps),
    room('Bedroom 2 bath', g.bedroom2ClosetEast, n, b, b2n, true),
    room('Bedroom 2 closet', c, n, g.bedroom2ClosetEast, c2s),
    room('Loft', b, g.loftNorth, e, ln),
    { ...room('Hallway', right, ps, b, ss), circulationOnly: true },
    { ...room('Shared bath west', 0, westServiceNorth, g.bath3East, sn, true),
      tracedFootprint: room('Shared bath west', 0, ss, g.bath3East, sn, true) },
    { ...room('Linen', g.bath3East, westServiceNorth, cw, sn), accessApprovalRequired: true,
      tracedFootprint: room('Linen', g.bath3East, ss, cw, sn) },
    room('Bedroom 3', 0, sn, cw, s),
    room('Bedroom 4', ce, sn, se, s),
    room('Bedroom 3 closet', ce, ss, g.bath4West, sn),
    room('Shared bath east', g.bath4West, ss, fw, sn, true),
    { ...room('Mechanical (relocated)', fw, ss, g.furnaceEast, sn), accessApprovalRequired: true },
    room('Bedroom 4 closet', cw, g.southClosetDivider, ce, s),
    room('Laundry (relocated)', lw, ln, e, sn, true)
  ];
  const rawFloors = [];
  const slab = (name, x, z, w, d, owner = null) => rawFloors.push({ name, x, z, w, d, room: owner });
  for (const r of rooms) {
    if (r.circulationOnly) continue;
    if (r.name === 'Bedroom 2') {
      slab(r.name, c, c2s, b - c, ps - c2s, r.name);
      slab('Bedroom 2 north east', g.bedroom2ClosetEast, b2n, b - g.bedroom2ClosetEast, c2s - b2n, r.name);
    } else if (r.name === 'Laundry (relocated)') {
      slab('Laundry north', b, ln, e - b, ss - ln, r.name);
      slab('Laundry main', lw, ss, e - lw, sn - ss, r.name);
    } else slab(r.name, r.x, r.z, r.w, r.d, r.name);
  }
  slab('Primary stair-notch wall floor', stairOpening.x, primaryNotchNorth, stairOpening.width, stairOpening.z - primaryNotchNorth, 'Primary bedroom');
  slab('Hall stair-side approach', right, primaryNotchNorth, p - right, ps - primaryNotchNorth);
  slab('West stair wall edge', 0, primaryNotchNorth, stairOpening.x, ps - primaryNotchNorth);
  slab('Main hallway', right, ps, b - right, westServiceNorth - ps);
  slab('Service hall connection', cw, westServiceNorth, b - cw, ss - westServiceNorth);
  slab('South hallway', cw, ss, ce - cw, g.southClosetDivider - ss);
  slab('West stair edge', 0, ps, stairOpening.x, stairOpening.z + stairOpening.depth - ps);
  slab('South stair wall floor', 0, stairOpening.z + stairOpening.depth, right, g.t / 2);
  function subtract(rect, cut) {
    const left = Math.max(rect.x, cut.x), r = Math.min(rect.x + rect.w, cut.x + cut.w);
    const back = Math.max(rect.z, cut.z), front = Math.min(rect.z + rect.d, cut.z + cut.d);
    if (r <= left || front <= back) return [rect];
    return [{ ...rect, w: left - rect.x }, { ...rect, x: r, w: rect.x + rect.w - r },
      { ...rect, x: left, w: r - left, d: back - rect.z },
      { ...rect, x: left, z: front, w: r - left, d: rect.z + rect.d - front }].filter(f => f.w > 1e-7 && f.d > 1e-7);
  }
  const protectedStairs = { x: stairOpening.x, z: stairOpening.z, w: stairOpening.width, d: stairOpening.depth };
  const floors = rawFloors.flatMap(f => subtract(f, protectedStairs)).flatMap(f => subtract(f, arrival)).filter(f => f.w > 0 && f.d > 0);
  const door = (start, width = 2.5) => [start, start + width, 0, 8];
  const win = (center, width) => [center - width / 2, center + width / 2, 3, 8];
  const walls = [
    ['Primary west', 0, n, 0, ps, [win(12 - n, 5), win(22.5 - n, 5)], [-1]],
    ['Primary north', 0, n, p, n, [win(7.5, 5)], [1]],
    ['Primary suite entry', p, n, p, ps, [door(13.15 - n)]],
    ['Primary south', right, primaryNotchNorth, p, primaryNotchNorth, [door(p - 3.125 - right)]],
    ['Primary south stair notch', 0, primaryNotchNorth, right, primaryNotchNorth],
    ['Bath north', p, n, c, n, [win(22.15 - p, 5)], [1]],
    ['Primary WC east', 18.9, n, 18.9, 12.8, [door(9.675 - n)]],
    ['Primary WC south', p, 12.8, 18.9, 12.8],
    ['Bath south', p, cn, c, cn, [door(20.654762 - p)]],
    ['Primary closet east', c, n, c, ps],
    ['Primary closet south', p, ps, c, ps],
    ['Bedroom 2 east', b, b2n, b, ps, [win(16 - b2n, 5)], [1]],
    ['Bedroom 2 south', c, ps, b, ps, [door(.625)]],
    ['Bath 2 north', g.bedroom2ClosetEast, n, b, n, [win(38.9 - g.bedroom2ClosetEast, 2.5)], [1]],
    ['Closet 2 north', c, n, g.bedroom2ClosetEast, n, [win(31.854167 - c, 2.5)], [1]],
    ['Bath 2 east', b, n, b, b2n, [], [1]],
    ['Bath 2 south', g.bedroom2ClosetEast, b2n, b, b2n, [door(37.2 - g.bedroom2ClosetEast)]],
    ['Closet 2 east', g.bedroom2ClosetEast, n, g.bedroom2ClosetEast, c2s],
    ['Closet 2 south', c, c2s, g.bedroom2ClosetEast, c2s, [door(g.bedroom2ClosetEast - 3.125 - c)]],
    ['Stairwell west', 0, ps, 0, westServiceNorth, [win(30.75 - ps, 2.5)], [-1]],
    ['Loft north', b, g.loftNorth, e, g.loftNorth, [win(49.9 - b, 5)], [1]],
    ['Loft east', e, g.loftNorth, e, ln, [win(27.5 - g.loftNorth, 5)], [1]],
    ['Laundry north', b, ln, e, ln, [door(.625)]],
    ['Laundry notch west', b, ln, b, ss],
    ['Laundry notch return', lw, ss, b, ss],
    ['Laundry west', lw, ss, lw, sn],
    ['Laundry east', e, ln, e, sn, [win(37.8 - ln, 3)], [1]],
    ['Laundry south', lw, sn, e, sn, [win(49.238095 - lw, 3)], [-1]],
    ['West bath north', 0, westServiceNorth, cw, westServiceNorth],
    ['West bath entry', g.bath3East, westServiceNorth, g.bath3East, sn],
    ['West bath west', 0, westServiceNorth, 0, sn, [win(38.75 - westServiceNorth, 2.5)], [-1]],
    ['Linen east', cw, westServiceNorth, cw, sn, [door(37.5 - westServiceNorth)]],
    ['Bedroom 3 north', 0, sn, cw, sn, [door(.625)]],
    ['Bedroom 3 entry', cw, sn, cw, g.southClosetDivider, [door(.625)]],
    ['Bedroom 3 west', 0, sn, 0, s, [win(48.5 - sn, 5)], [-1]],
    ['Bedrooms south', 0, s, cw, s, [win(cw / 2, 5)], [-1]],
    ['Bedroom 4 south', ce, s, se, s, [win((se - ce) / 2, 5)], [-1]],
    ['Closet 4 south', cw, s, ce, s, [win(16.107143 - cw, 2.5)], [-1]],
    ['Bedroom 3 closet', ce, ss, g.bath4West, ss],
    ['Closet 3 east', g.bath4West, ss, g.bath4West, sn],
    ['Bedroom 4 north', ce, sn, se, sn, [door(24.172619 - ce), door(27.672619 - ce)]],
    ['Bedroom 4 entry', ce, sn, ce, s, [door(.625)]],
    ['Bedroom 4 closet', cw, g.southClosetDivider, cw, s, [door(s - 3.125 - g.southClosetDivider)]],
    ['Closet divider', cw, g.southClosetDivider, ce, g.southClosetDivider],
    ['South hallway east', ce, ss, ce, sn],
    ['East bath north', g.bath4West, ss, lw, ss, [door(38.15 - g.bath4West, 3)]],
    ['Linen furnace divider', fw, ss, fw, sn],
    ['Service south', se, sn, lw, sn, [win(34.800595 - se, 2.5)], [-1]],
    ['Bedroom 4 east', se, sn, se, s, [], [1]]
  ];
  const windows = [...getUpstairsSideWindows(),
    ['Bedroom 3 front', cw / 2, s - .1, 5, 0, -1],
    ['Bedroom 4 front', (ce + se) / 2, s - .1, 5, 0, -1]];
  return { rooms, floors, walls, windows, arrival, stairs: { ...stairOpening },
    registrationException: { primaryNotchNorth, primaryTracedSouth: ps, stairTraceEast: g.stairTraceEast, westServiceNorth,
      protectedStairs, protectedArrival: arrival, unresolvedAccess: ['Furnace equipment-specific service/removal unverified', 'Linen occupied retrieval unverified'] } };
}

function buildUpstairsModel(THREE, { box, mat, wood, wallMaterial, windowTrim, oak, cream, black, steel, linen, windowFrame, openingCasing, singlePanelDoor }, stairOpening, elevation, edits = UpstairsLayout.empty()) {
  const g = getUpstairsMeasuredGeometry();
  const baseline = getUpstairsDefaultPlan(stairOpening);
  const plan = UpstairsLayout.resolve(baseline, edits);
  const { rooms } = plan;
  const group = new THREE.Group();
  group.name = 'Upstairs Version I registered-plan study';
  group.position.y = elevation;
  group.visible = false;
  group.userData = { elevationFeet: elevation, ceilingHeightFeet: 9, adoptedPlan: 'Version I with owner corrections', stairRegistration: 'Explicit registration exception: primary and west service walls meet canonical stair north/south edges; no traced east wall stubs; unchanged 44-inch arrival', registrationException: baseline.registrationException, unresolvedAccess: baseline.registrationException.unresolvedAccess, operationApprovalRequired: true, doorJambRegistrationReviewRequired: true, provisional: true };
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
        'Primary closet south', 'Primary closet south east', 'Primary closet linen south', 'Linen furnace divider'].includes(name)) return;
      for (const side of sides) {
        // Bath wet-wall / fitted closet backs on the west face; retain the
        // Bedroom 2 finish on the other side and gallery-return baseboards.
        if (name === 'Primary closet east' && side === 1 && from === 0) continue;
        if (name === 'Primary closet linen west' && side === -1) continue;
        const fittedRuns = {
          'West bath north': [[1, .375 - x1, 3.425 - x1], [1, 7.15 - x1, 10.15 - x1]],
          'Bedroom 3 north': [[-1, 7.15 - x1, 10.15 - x1]],
          'East bath north': [[1, 27.425 - x1, 30.475 - x1], [1, 34.35 - x1, 37.35 - x1]],
          'Closet 2 east': [[-1, 7.675 - z1, 10.725 - z1]],
          'Closet divider': [[1, g.southClosetEast - .175 - 2 - .075 - x1, g.southClosetEast - .175 - .075 - x1]]
        }[name] ?? [];
        let runs = [[start, end]];
        for (const [fittedSide, from, to] of fittedRuns) if (fittedSide === side) runs = runs.flatMap(([a, b]) => [[a, Math.min(b, from)], [Math.max(a, to), b]]).filter(([a, b]) => b > a);
        if (name === 'West bath north' && side === -1) runs = runs.map(([a, b]) => [Math.max(a, stairOpening.x + stairOpening.width + .06 - x1), b]);
        if ((name === 'West bath north' && side === 1) || (name === 'Bedroom 3 north' && side === -1)) runs = runs.map(([a, b]) => [a, Math.min(b, g.bath3East + .175 - x1)]);
        if (name === 'Linen east' && side === 1) runs = runs.map(([a, b]) => [Math.max(a, 1.3), Math.min(b, length - 1.3)]);
        for (const [a, b] of runs) if (b > a) box(parent, (a + b) / 2, 1 / 3, side * (thickness / 2 + 0.03125), b - a, 2 / 3, 0.0625, windowTrim).name = 'Upstairs white baseboard';
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
        const rightHinge = ['Primary south', 'Primary WC east', 'Closet 2 south', 'Bedroom 4 closet'].includes(name)
          || (name === 'Bedroom 4 north' && start < 7);
        const swingSign = ['Primary suite entry', 'Primary WC east', 'Bedroom 2 south', 'Linen east', 'Bedroom 3 north', 'Bedroom 4 entry', 'East bath north'].includes(name)
          || (name === 'Bedroom 4 north' && start > 7) ? 1 : -1;
        const closedRotationY = rightHinge ? Math.PI : 0;
        const hinge = new THREE.Group();
        hinge.name = `Upstairs ${name} interior door hinge`;
        const swingSide = rightHinge ? swingSign : -swingSign;
        const hingeOffset = thickness / 2 + .125 / 12;
        hinge.position.set(closedRotationY ? end - 0.02 : start + 0.02, 0, swingSide * hingeOffset);
        hinge.rotation.y = closedRotationY;
        hinge.userData = { interactiveHouseDoor: { operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 90, openRotationSign: swingSign, closedRotationY }, nominalOpeningFeet: end - start, hingeOffsetInches: hingeOffset * 12 };
        parent.add(hinge);
        const width = end - start - 0.04;
        // Hinge axis sits at the opening face; the closed leaf is recessed
        // behind it, not displaced into the room to evade its own casing.
        const leafZ = -swingSide * Math.cos(closedRotationY) * .065;
        singlePanelDoor(hinge, width / 2, top / 2, leafZ, width, top - 0.04, 0.13, windowTrim);
        for (const side of [-1, 1]) box(hinge, width - 0.22, 3, leafZ + side * 0.1, 0.12, 0.12, 0.08, steel).name = 'Upstairs interior door handle';
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
  function backToWall(item, wallName, depth) {
    const wall = plan.walls.find((wall) => wall.name === wallName);
    const sine = Math.sin(item.rotation.y), cosine = Math.cos(item.rotation.y);
    const distance = wall.thickness / 2 + depth / 2;
    if (Math.abs(sine) > 0.5) item.position.x = wall.x1 + sine * distance;
    else item.position.z = wall.z1 + cosine * distance;
  }
  function desk(name, x, z, rotation = 0, wallName = null) {
    const item = furniture(`${name} writing desk`, x, z, rotation, true);
    if (wallName) backToWall(item, wallName, 1.8);
    box(item, 0, 2.5, 0, 4, 0.14, 1.8, oak).name = 'Writing desktop';
    for (const dx of [-1.8, 1.8]) box(item, dx, 1.25, 0, 0.12, 2.5, 1.6, black);
    const sine = Math.sin(rotation), cosine = Math.cos(rotation);
    const seat = chair(`${name} desk chair`, x + sine * 1.95, z + cosine * 1.95, rotation);
    const light = wallLamp(`${name} desk wall lamp`, x - sine * 1.05, z - cosine * 1.05, rotation);
    if (wallName) {
      seat.position.set(item.position.x + sine * 1.95, 0, item.position.z + cosine * 1.95);
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
        for (let fold = 0; fold < 3; fold++) box(item, dx, y + 0.13 + fold * 0.12, 0, width * 0.35, 0.12, Math.min(.85, depth - .08), fold % 2 ? linen : cream, true);
      }
    }
    return item;
  }
  const primaryCenterX = g.primaryEast / 2;
  const primaryWestWall = plan.walls.find(wall => wall.name === 'Primary west');
  const headboardWallOffset = g.t / 2 + .0625 + 1 / 12 + .09;
  const primaryBedX = headboardWallOffset + (80 / 12 + .2) / 2;
  for (const [name, x, z, mattressWidth, mattressLength, rotation, bedsideSide] of [
    ['Primary bed', primaryBedX, 17, 5, 80 / 12, Math.PI / 2, -1],
    ['Bedroom 2 bed', g.bedEast - headboardWallOffset - 6.45 / 2, 22.1, 4.5, 6.25, -Math.PI / 2, -1],
    ['Bedroom 3 bed', headboardWallOffset + 6.45 / 2, 47.7, 4.5, 6.25, Math.PI / 2, -1],
    ['Bedroom 4 bed', g.southEast - headboardWallOffset - 6.45 / 2, 48.2, 4.5, 6.25, -Math.PI / 2, 1]
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
        ? { x: primaryWestWall.x1 + primaryWestWall.thickness / 2 + 0.04, z: side < 0 ? 19.5 : 15, rotation: Math.PI / 2 }
        : name === 'Bedroom 2 bed'
          ? { x: g.bedEast - 0.215, z: 19.2, rotation: -Math.PI / 2 }
          : name === 'Bedroom 3 bed'
            ? { x: 0.215, z: 51.55, rotation: Math.PI / 2 }
            : { x: g.southEast - 0.215, z: z + dx, rotation: -Math.PI / 2 };
      wallLamp(`${name} bedside wall lamp ${side < 0 ? 'left' : 'right'}`, lampMount.x, lampMount.z, lampMount.rotation);
    }
  }
  const nightstandWallOffset = g.t / 2 + .0625 + 1 / 12 + .75;
  for (const [name, x, z, rotation] of [
    ['Primary nightstand 1', nightstandWallOffset, 13.2, Math.PI / 2],
    ['Primary nightstand 2', nightstandWallOffset, 20.85, Math.PI / 2],
    ['Bedroom 2 nightstand', g.bedEast - nightstandWallOffset, 18.8, -Math.PI / 2],
    ['Bedroom 3 nightstand', nightstandWallOffset, 51.1, Math.PI / 2],
    ['Bedroom 4 nightstand', g.southEast - nightstandWallOffset, 51.65, -Math.PI / 2]
  ]) cabinet(furniture(name, x, z, rotation, true), 0, 0, 1.55, 1.9, 1.5, 2);
  desk('Primary', 11.3, 8.7, 0, 'Primary north');
  desk('Bedroom 2', 34.8, 26.5, Math.PI, 'Bedroom 2 south');
  desk('Bedroom 3', g.southClosetWest - .175 - .9, 48.6, -Math.PI / 2, 'Bedroom 4 closet');
  desk('Bedroom 4', 20.3, 49.6, Math.PI / 2, 'Bedroom 4 entry');
  const primarySouthWall = plan.walls.find(wall => wall.name === 'Primary south');
  const primarySeatingRearZ = primarySouthWall.z1 - primarySouthWall.thickness / 2 - 0.0625 - 1 / 12;
  loungeChair('Primary sitting chair 1', primaryCenterX - 2.6, primarySeatingRearZ - 1.125);
  loungeChair('Primary sitting chair 2', primaryCenterX + 2.6, primarySeatingRearZ - 1.125);
  const sittingTable = furniture('Primary sitting side table', primaryCenterX, primarySeatingRearZ - .7, Math.PI, true);
  cabinet(sittingTable, 0, 0, 1.4, 1.8, 1.4, 1);
  const primaryMedia = furniture('Primary media console', g.primaryEast - 1.05, 20, -Math.PI / 2, true);
  cabinet(primaryMedia, 0, 0, 4, 1.6, 1.2, 2);
  const primaryTV = furniture('Primary wall TV', g.primaryEast - 0.235, 20, -Math.PI / 2);
  box(primaryTV, 0, 4.7, 0, 4, 2.3, 0.12, black).name = 'Primary TV screen';
  loungeChair('Bedroom 2 reading chair', 40.6, 26.1, Math.PI / 2);
  loungeChair('Bedroom 3 reading chair', 5.125, 53.4);
  loungeChair('Bedroom 4 reading chair', 26.4, 53.55);
  function vanity(name, x, z, width, rotation, wallName) {
    const item = furniture(name, x, z, rotation);
    backToWall(item, wallName, 1.9);
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
    box(item, 0, 4.7, -.91, width - 0.1, 2.5, 0.08, steel).name = 'Vanity wall mirror';
  }
  function toilet(name, x, z, rotation = 0) {
    const item = furniture(name, x, z, rotation);
    box(item, 0, 1.4, -0.6, 1.5, 2.5, 0.6, windowTrim, true);
    box(item, 0, 0.8, 0.1, 1.4, 1.5, 1.7, windowTrim, true);
    box(item, 0, 1.58, 0.1, 1.2, 0.08, 1.5, cream, true);
  }
  const westServiceShift = baseline.registrationException.westServiceNorth - g.serviceNorth;
  vanity('Primary north vanity', 18, 18.6, 5, Math.PI, 'Bath south');
  vanity('Primary south vanity', 26.5, 18.6, 4, Math.PI, 'Bath south');
  vanity('Bedroom 2 vanity', 35.565476, 9.2, 3, Math.PI / 2, 'Closet 2 east');
  vanity('West bath vanity', 1.9, 37.45 + westServiceShift, 3, 0, 'West bath north');
  vanity('East bath vanity', 28.95, 37.45, 3, 0, 'East bath north');
  toilet('Primary toilet', 16.8, 8.7);
  toilet('Bedroom 2 toilet', 38.9, 8.655);
  toilet('West bath toilet', 4.9, 37.4 + westServiceShift);
  toilet('East bath toilet', 32.15, 37.4);
  for (const [name, x, z, w, d, rotation = 0] of [
    ['Primary shower', 27.17, 10.8, 3.5, 6],
    ['Bedroom 2 shower', 42.075, (g.north + g.bedroom2North) / 2, 3, 5],
    ['West bath shower', 8.65, (g.serviceNorth + g.bedNorth) / 2 + westServiceShift, 3, 5],
    ['East bath shower', 35.85, (g.serviceNorth + g.bedNorth) / 2, 3, 5]
  ]) {
    const item = furniture(name, x, z, rotation);
    box(item, 0, 0.12, 0, w, 0.24, d, cream);
    box(item, 0, 3, -d / 2 + 0.08, w, 6, 0.12, tile);
    box(item, 0, 5.5, -d / 2 + 0.4, 0.5, 0.06, 0.5, steel);
    box(item, 0, 3.2, -d / 2 + 0.18, 0.25, 0.4, 0.08, steel);
    box(item, 0, 0.25, 0, 0.3, 0.015, 0.3, steel);
  }
  // Retained full-size tub along the Version I north bathroom wall.
  const tub = furniture('Primary freestanding tub', 22.15, 9.2, Math.PI / 2);
  box(tub, 0, 1, 0, 2.8, 2, 5.2, windowTrim, true);
  box(tub, 0, 1.9, 0, 2.25, 0.15, 4.4, cream, true);
  box(tub, 0, 1.99, 0, 1.9, 0.025, 3.9, windowTrim, true);
  box(tub, -1.7, 1.3, 0, 0.1, 2.6, 0.1, steel);
  box(tub, -1.4, 2.6, 0, 0.7, 0.1, 0.1, steel);
  for (const [index, z] of [37.05, 39.95].entries()) {
    const machine = furniture(index === 0 ? 'Washer' : 'Dryer', 54.25, z, -Math.PI / 2);
    box(machine, 0, 1.6, 0, 2.8, 3.2, 2.8, windowTrim);
    box(machine, 0, 1.5, 1.43, 1.8, 1.8, 0.08, black, true);
    box(machine, 0, 1.5, 1.48, 1.4, 1.4, 0.04, steel, true);
    box(machine, 0.8, 2.85, 1.45, 0.22, 0.22, 0.08, black, true);
  }
  const northUppers = furniture('Laundry north cupboards', 43.46, 38.8, Math.PI / 2);
  for (const x of [-1, 1]) cabinet(northUppers, x, 0, 2, 2, 1.45, 1, true);
  northUppers.position.y = 5.2;
  const southUppers = furniture('Laundry wall cupboards', 51.25, 34.24);
  for (const x of [-2, 0, 2]) cabinet(southUppers, x, 0, 2, 2, 1.2, 1, true);
  southUppers.position.y = 5.2;
  const laundryCounter = furniture('Laundry folding counter', 48.65, 34.65);
  for (const x of [1, 3]) cabinet(laundryCounter, x, 0, 2, 2.8, 2, 2, true);
  box(laundryCounter, 2, 2.95, .05, 4.1, .15, 2.1, cream).name = 'North laundry countertop';
  const southCounter = furniture('Laundry south bases', 49.9, g.serviceSouth - .175 - .0625 - .125 / 12 - 1, Math.PI);
  let baseStart = 0;
  for (const width of [2, 2, 3]) {
    cabinet(southCounter, baseStart + width / 2, 0, width, 2.8, 2, 2, true);
    baseStart += width;
  }
  box(southCounter, 3.5, 2.95, .05, 7.1, .15, 2.1, cream).name = 'South laundry countertop';
  const furnace = furniture('Mechanical equipment reservation', 41.3, 38.8, Math.PI / 2);
  box(furnace, 0, 3, 0, 2.5, 6, 2, steel);
  hangingBay('Primary closet long hanging', g.primaryEast + .175 + 1 + .075, 24.7, 5, Math.PI / 2);
  hangingBay('Primary closet double hanging', g.closetEast - .175 - 1 - .075, 24.7, 5, -Math.PI / 2, true);
  shelving('Primary closet folded clothes', 18.3, 20.65, 4);
  shelving('Primary closet return shelves', 25.1, g.closetNorth + .175 + .375 + .075, 1.2, 0, .75);
  hangingBay('Primary closet return hanging', 24, g.primarySouth - .175 - 1 - .075, 2, Math.PI, true);
  const closetDresser = furniture('Primary closet drawers', 20.5, g.primarySouth - .175 - .7 - .075, Math.PI);
  cabinet(closetDresser, 0, 0, 4, 2.9, 1.4, 4);
  hangingBay('Bedroom 2 closet hanging', 30.55, 12, 4.25, Math.PI / 2, true);
  shelving('Bedroom 2 closet shelves', 31.85, 8.7, 4.6);
  hangingBay('Bedroom 3 closet hanging', 21.95, 37.43, 5, 0, true);
  shelving('Bedroom 3 closet shelves', 21.1, 40.62, 3.1, Math.PI);
  hangingBay('Bedroom 4 closet hanging', g.southClosetEast - .175 - 1 - .075, 49.22, 5.6, -Math.PI / 2, true);
  shelving('Bedroom 4 closet shelves', g.southClosetWest + .175 + .65 + .075, 49.6, 4.5, Math.PI / 2);

  const sofa = furniture('Loft sofa', 49.8, 24.5, Math.PI, true);
  sofa.userData = { viewerFurniture: true, widthFeet: 7, depthFeet: 3, heightFeet: 2.8, productSelected: false };
  box(sofa, 0, .55, 0, 6.6, .7, 2.6, oak);
  for (const x of [-2.9, 2.9]) for (const z of [-1.05, 1.05]) box(sofa, x, .2, z, .2, .4, .2, oak);
  box(sofa, 0, 1.3, 0, 7, .8, 3, linen, true);
  box(sofa, 0, 2.2, 1.2, 7, 1.2, .6, linen, true);
  for (const x of [-3.25, 3.25]) box(sofa, x, 1.8, 0, .5, 1.2, 2.8, linen, true);
  for (const x of [-2, 0, 2]) box(sofa, x, 1.8, -.35, 1.9, .2, 1.8, cream, true);
  const coffee = furniture('Loft coffee table', 49.8, 28.35, 0, true);
  box(coffee, 0, 1.4, 0, 4, .18, 2, oak, true);
  for (const x of [-1.7, 1.7]) for (const z of [-.7, .7]) box(coffee, x, .65, z, .12, 1.3, .12, black);
  loungeChair('Loft armchair', 53.5, 28.3, Math.PI / 2);
  const endTable = furniture('Loft side table', 45.1, 25, 0, true);
  box(endTable, 0, 1.8, 0, 1.5, .15, 1.5, oak, true);
  for (const x of [-.6, .6]) for (const z of [-.6, .6]) box(endTable, x, .85, z, .1, 1.7, .1, black);

  furnace.userData = { approvalRequired: true, serviceAccessApproved: false };
  const linenCenterX = (g.bath3East + g.southClosetWest) / 2;
  for (const [name, z, rotation] of [
    ['Linen shelves - access approval required', baseline.registrationException.westServiceNorth + .175 + .5, 0],
    ['Linen south shelves - access approval required', g.serviceSouth - .175 - .5, Math.PI]
  ]) shelving(name, linenCenterX, z, 2.15, rotation, 1).userData.approvalRequired = true;

  // Owner correction: north/west/south already have walls, not perimeter guards.
  // Retain the exposed east hall edge; leave the upper arrival open.
  const guardY = 1.5;
  const right = stairOpening.x + stairOpening.width;
  const front = stairOpening.z;
  const length = baseline.arrival.z - front - .175;
  const rail = furniture('Stair opening guard', right + .05, (front + baseline.arrival.z + .075) / 2, -Math.PI / 2);
  for (const y of [0.7, 1.5, 2.3, 3]) box(rail, 0, y, 0, length, 0.07, 0.07, black);
  for (let position = -length / 2; position <= length / 2 + 0.01; position += length / Math.ceil(length / 3)) box(rail, position, guardY, 0, 0.08, 3, 0.08, black);
  // The upper flight stays visible below the flush hardwood arrival floor.
  const coordinationWarnings = ['Owner-corrected Bath 2 keeps a full 36 x 60-inch shower in a deeper room; fixture use, outward entry swing and product installation require review.', 'Furnace has a north 36 x 96-inch access door and no storage; equipment-specific service/removal requires approval.', 'Version I Bedroom 2 and Bedroom 4 south bands project above the unchanged ground garage; bearing, fire separation, conditioning and roof coordination require approval.', 'Laundry machines and cabinets are separated; appliance doors, hoses, venting, window reach and simultaneous cabinet use require product review.', 'Door openings and swing-side hinges clear modeled returns; selected jambs, hardware, occupied routes and linen retrieval remain unapproved.'];
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
  return { group, rooms, areas, plan, baseline, dispose, coordinationWarnings, start: [15.5, 33.125], mapLabels: rooms.map((room) => [room.name, room.x + room.w / 2, room.z + room.d / 2]) };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { getUpstairsRoomClearDimensions, getUpstairsMeasuredGeometry, getUpstairsExteriorSegments, getUpstairsDefaultPlan, getUpstairsFrontWindows, getUpstairsSideWindows, getUpstairsExteriorOpenings };
