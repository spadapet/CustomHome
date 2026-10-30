// One product intent for furnished ground/upstairs and all masonry elevations.
// Envelopes are not SKUs: the manufacturer's headline limits are only a screen.
function getWindowProductIntent(width, height, picture = false, privacy = false) {
  const columns = picture ? 1 : Math.ceil(width / 3);
  const rows = picture ? 1 : Math.ceil(height / 6);
  const unitWidth = width / columns, unitHeight = height / rows;
  return {
    manufacturer: 'Andersen', series: '100 Series', material: 'Fibrex composite',
    exteriorFinish: 'White', interiorFinish: 'White', grilles: 'none',
    operation: picture ? 'fixed picture window' : columns === 3 ? 'casement / fixed picture / casement' : 'casement',
    pictureColumns: picture ? [0] : columns === 3 ? [1] : [],
    columns, rows, widthFeet: width, heightFeet: height,
    unitWidthFeet: unitWidth, unitHeightFeet: unitHeight,
    standardSizeVerified: false, productSelected: false, assemblyApproved: false,
    sizeReview: picture
      ? 'Dealer chart/area/aspect-ratio and combination review required; 8 ft headline is not an 8 x 8 approval'
      : unitWidth < 17.5 / 12 || unitWidth > 35.5 / 12 || unitHeight < 23.5 / 12 || unitHeight > 71.5 / 12
        ? 'Outside single-casement frame range 17.5–35.5 x 23.5–71.5 inches: reconcile rough opening, resize or review operation; concept preserved'
        : 'Dealer size/rough-opening/egress and combination review required',
    privacyReview: privacy ? 'Partial-height obscure treatment is a concept, not a verified factory option' : null
  };
}
// Trim covers the unit joint from recessed frame to room reveal; not a wall pier.
function addWindowShadeDivisions(parent, box, material, joints, sill, height, faceDepth, interiorSide = 1, name = 'Full-depth white shade-bay division') {
  for (const x of joints) {
    const division = box(parent, x, sill + height / 2, interiorSide * (faceDepth - 0.25), 3.5 / 12, height, 0.5, material);
    division.name = name;
    division.userData = { trimStudy: true, structuralPier: false, shadeMountingVerified: false, assemblyApproved: false };
  }
}
function getGroundFrontWindows() {
  return [
    {name: 'Office porch window', center: 6, width: 7.6, sill: 3, height: 5},
    {name: 'Bedroom porch window', center: 25, width: 7.6, sill: 3, height: 5}
  ];
}
function getGroundFrontLayout() {
  const extension = 23 / 48;
  const wallZ = 54.2 + extension;
  const porchDepth = 7;
  return { extension, wallZ, porchDepth, porchEdgeZ: wallZ + porchDepth };
}
// Six-light colonial concept per unit. Bars sit off the glazing faces;
// this is not a selected Andersen grille option or approved order.
function addFrontWindowGrilles(parent, box, material, width, height, columns = 1, rows = 1, glassDepth = 0.04, inset = 0.235) {
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const w = width / columns - inset * 2, h = height / rows - inset * 2;
    const x = -width / 2 + (column + 0.5) * width / columns;
    const bottom = row * height / rows + inset;
    for (const side of [-1, 1]) {
      const z = side * (glassDepth / 2 + 0.022);
      box(parent, x, bottom + h / 2, z, 0.0625, h, 0.035, material).name = 'Front colonial grille vertical';
      for (const fraction of [1 / 3, 2 / 3])
        box(parent, x, bottom + h * fraction, z, w, 0.0625, 0.035, material).name = 'Front colonial grille horizontal';
    }
  }
}
function addSingleHungSashes(parent, box, material, glass, width, height, glassDepth = 0.04) {
  const apertureWidth = width - 0.24, half = (height - 0.24) / 2;
  for (const upper of [false, true]) {
    const bottom = 0.12 + (upper ? half : 0), offset = upper ? -0.035 : 0.035;
    for (const edge of [-1, 1]) {
      box(parent, edge * (apertureWidth - 0.1) / 2, bottom + half / 2, offset, 0.1, half, 0.1, material).name = 'Single-hung sash stile';
      box(parent, 0, bottom + (edge < 0 ? 0.05 : half - 0.05), offset, apertureWidth - 0.2, 0.1, 0.1, material).name = edge < 0 && upper ? 'Single-hung midheight meeting rail' : 'Single-hung sash rail';
    }
    box(parent, 0, bottom + half / 2, offset, apertureWidth - 0.2, half - 0.2, glassDepth, glass).name = upper ? 'Single-hung fixed upper glazing' : 'Single-hung clear sliding lower glazing';
    if (upper) for (const side of [-1, 1]) {
      const z = offset + side * (glassDepth / 2 + 0.022);
      box(parent, 0, bottom + half / 2, z, 0.0625, half - 0.2, 0.035, material).name = 'Single-hung upper grille vertical';
      box(parent, 0, bottom + half / 2, z, apertureWidth - 0.2, 0.0625, 0.035, material).name = 'Single-hung upper grille horizontal';
    }
  }
}
if (typeof module !== 'undefined' && module.exports) Object.assign(module.exports, { getWindowProductIntent, addSingleHungSashes });
(function (root) {
  'use strict';
  const UpstairsLayout = typeof module !== 'undefined' && module.exports ? require('./upstairs-layout.js') : root.UpstairsLayout;

  function getLivingRoomFeatureLayout(stairs = UpstairsLayout.stairOpening()) {
    const wallStartZ = 8 + 0.35 / 2;
    // Keep the approved fireplace/window/furniture composition fixed when
    // closing the stair's powder-side gap; this is its original design datum.
    const wallEndZ = 26.775;
    const centerZ = (wallStartZ + wallEndZ) / 2;
    const sideWindowBank = {
      name: 'Living joined return window bank', x: 6.6, z: 8, width: 7.5, height: 5, sill: 3,
      openingWidth: 7.5, openingHeight: 5, openingSill: 3, trimLabel: 'Living',
      divisionWidth: 3.5 / 12, divisionDepth: 6 / 12, shadeMountingVerified: false,
      units: [-1, 0, 1].map((side) => ({
        name: side < 0 ? 'Living left side window' : side > 0 ? 'Living right side window' : 'Living side window',
        x: 6.6 + side * 2.5, z: 8, width: 2.5, height: 5, sill: 3, picture: side === 0, singleHung: false
      }))
    };
    const patioDoor = { x: 13.2, z: 3.95, width: 3, height: 8 };
    const fireplaceWindows = { width: 4, sill: 2.6, height: 5.4, head: 8 };
    return { wallStartZ, wallEndZ, centerZ, windowCenters: [centerZ - 5.8, centerZ + 5.8], fireplaceWindows, sideWindowBank, patioDoor };
  }

  function getFrontEntryLayout() {
    const width = 5, height = 8, spring = 7.1;
    const radius = ((width / 2) ** 2 + (height - spring) ** 2) / (2 * (height - spring));
    return { x: 15.6, z: getGroundFrontLayout().wallZ, width, height, spring, radius, centerY: height - radius, surroundWidth: 0.65, hingeZ: -0.34 };
  }

  function buildArchedFrontEntry(THREE, { box, wood, trim, hardware, field, oakMaps }, parent) {
    const layout = getFrontEntryLayout();
    const half = layout.width / 2;
    const topAt = (x, radius = layout.radius) => layout.centerY + Math.sqrt(Math.max(0, radius * radius - x * x));
    const leafWood = oakMaps ? new THREE.MeshStandardMaterial({ ...oakMaps, color: '#fff2d8', roughness: 0.72, normalScale: new THREE.Vector2(0.15, 0.15) }) : wood;
    const leafField = oakMaps ? leafWood.clone() : field;
    if (oakMaps) leafField.color.set('#eee0c8');
    function mesh(shape, depth, material, name, target = parent, z = 0) {
      const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 40 });
      if (oakMaps && (material === leafWood || material === leafField)) {
        const positions = geometry.attributes.position, uv = geometry.attributes.uv;
        for (let index = 0; index < positions.count; index++) uv.setXY(index, (positions.getX(index) + target.position.x) / 2.43, positions.getY(index) / 8);
        uv.needsUpdate = true;
      }
      const part = new THREE.Mesh(geometry, material);
      part.name = name;
      part.position.z = z;
      part.castShadow = part.receiveShadow = true;
      part.userData = { archedEntryPart: true, tourObstacle: true };
      target.add(part);
      return part;
    }
    function archBand(innerHalf, outerHalf, innerRadius, outerRadius, bottom) {
      const shape = new THREE.Shape();
      shape.moveTo(-outerHalf, bottom);
      for (let index = 0; index <= 40; index++) {
        const x = -outerHalf + outerHalf * 2 * index / 40;
        shape.lineTo(x, topAt(x, outerRadius));
      }
      shape.lineTo(outerHalf, bottom);
      shape.lineTo(innerHalf, bottom);
      for (let index = 0; index <= 40; index++) {
        const x = innerHalf - innerHalf * 2 * index / 40;
        shape.lineTo(x, topAt(x, innerRadius));
      }
      shape.lineTo(-innerHalf, bottom);
      shape.closePath();
      return shape;
    }
    const surround = archBand(half, half + layout.surroundWidth, layout.radius, layout.radius + layout.surroundWidth, 0);
    mesh(surround, 0.28, trim, 'Deep white arched entry surround', parent, 0.19);
    mesh(surround, 0.12, trim, 'Interior arched entry casing', parent, -0.31);
    mesh(archBand(half + 0.48, half + 0.72, layout.radius + 0.48, layout.radius + 0.72, 0.1), 0.1, trim, 'Projecting outer arch molding', parent, 0.47);
    for (const side of [-1, 1]) {
      const spandrel = new THREE.Shape();
      const outerX = side * half;
      spandrel.moveTo(outerX, layout.height);
      spandrel.lineTo(0, layout.height);
      for (let index = 0; index <= 30; index++) {
        const x = side * half * index / 30;
        spandrel.lineTo(x, topAt(x));
      }
      spandrel.closePath();
      mesh(spandrel, 0.35, trim, 'Arch-shaped wall closure above door', parent, -0.175);
    }
    const leaves = [];
    for (const side of [-1, 1]) {
      const leaf = new THREE.Group();
      leaf.name = `Front entry ${side < 0 ? 'left' : 'right'} arched oak door leaf`;
      leaf.position.x = side * 2.47;
      leaf.position.z = layout.hingeZ;
      leaf.userData = { arched: true, crownHeightFeet: 8, springHeightFeet: 7.1, interactiveHouseDoor: { operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 110, openRotationSign: -side } };
      parent.add(leaf);
      const min = side < 0 ? -2.45 : 0.02, max = side < 0 ? -0.02 : 2.45;
      const localX = (x) => x - leaf.position.x;
      const shape = new THREE.Shape();
      shape.moveTo(localX(min), 0.04);
      shape.lineTo(localX(max), 0.04);
      for (let index = 0; index <= 40; index++) {
        const x = max - (max - min) * index / 40;
        shape.lineTo(localX(x), topAt(x) - 0.015);
      }
      shape.closePath();
      mesh(shape, 0.18, leafWood, 'Curved oak entry leaf body', leaf, -0.09);
      const center = localX((min + max) / 2), panelWidth = max - min - 0.56;
      for (const face of [-1, 1]) {
        box(leaf, center, 1.15, face * 0.11, panelWidth, 1.25, 0.04, leafField).name = 'Recessed lower oak entry panel';
        for (const edge of [-1, 1]) box(leaf, center + edge * (panelWidth / 2 + 0.04), 1.15, face * 0.14, 0.08, 1.4, 0.06, leafWood).name = 'Lower entry panel molding';
        for (const y of [0.45, 1.85]) box(leaf, center, y, face * 0.14, panelWidth, 0.08, 0.06, leafWood).name = 'Lower entry panel rail';
        const upper = new THREE.Shape();
        upper.moveTo(localX(min + 0.28), 2.15);
        upper.lineTo(localX(max - 0.28), 2.15);
        for (let index = 0; index <= 24; index++) {
          const x = max - 0.28 - (max - min - 0.56) * index / 24;
          upper.lineTo(localX(x), topAt(x) - 0.4);
        }
        upper.closePath();
        mesh(upper, 0.025, leafField, 'Arched recessed upper oak panel', leaf, face > 0 ? 0.1 : -0.125);
        for (let x = min + 0.5; x < max - 0.4; x += 0.36) {
          const top = topAt(x) - 0.43;
          box(leaf, localX(x), (top + 2.18) / 2, face * 0.14, 0.012, top - 2.18, 0.012, leafWood).name = 'Fine vertical oak panel joint';
        }
        box(leaf, -side * 2.24, 3.55, face * 0.2, 0.07, 0.9, 0.1, hardware).name = 'Arched entry dark pull';
      }
      leaves.push(leaf);
    }
    box(parent, 0, 0.015, 0, 5, 0.03, 0.5, hardware).name = 'Arched entry threshold';
    parent.userData = { ...parent.userData, arched: true, heightInches: 96, springHeightInches: 85.2, widthInches: 60, productSelected: false, clearanceVerified: false };
    return leaves;
  }

  function getGarageClerestoryLayout(floorY = -1.25) {
    return [19.5, 29.5, 39.5].map((z, index) => ({
      name: `Garage high window ${index + 1}`, x: 55.5, z, width: 6, height: 1.5,
      sill: floorY + 7.5, sillAboveFloor: 7.5, fixed: true
    }));
  }

  function getKitchenPassageLayout() {
    const wallZ = 7;
    const openings = [2.725, 14.675].map((start) => [start, start + 2.5, 0, 8]);
    const passages = ['Kitchen to prep', 'Kitchen to mudroom'].map((name, index) => ({ name, startZ: wallZ + openings[index][0], endZ: wallZ + openings[index][1] }));
    return { wallX: 37.5, wallZ, clearWidth: 2.5, clearHeight: 8, doorless: true, passages, openings };
  }

  function getPrepWindowLayout() {
    return [
      { name: 'Prep left counter window', x: 47.4 - 83 / 24, z: 7, openingWidth: 2, openingHeight: 5, openingSill: 41 / 12, standardSizeCode: '2050', picture: false },
      { name: 'Prep sink picture window', x: 47.4, z: 7, openingWidth: 5, openingHeight: 5, openingSill: 41 / 12, standardSizeCode: '5050', picture: true },
      { name: 'Prep right counter window', x: 47.4 + 83 / 24, z: 7, openingWidth: 2, openingHeight: 5, openingSill: 41 / 12, standardSizeCode: '2050', picture: false },
      { name: 'Prep end-wall window', x: 55.5, z: 11.55, openingWidth: 2, openingHeight: 6, openingSill: 29 / 12, standardSizeCode: '2060', picture: false }
    ].map((window) => ({ ...window, width: window.openingWidth - 0.5 / 12, height: window.openingHeight - 0.5 / 12, sill: window.openingSill + 0.25 / 12 }));
  }

  function getPrepWindowBankLayout() {
    const units = getPrepWindowLayout().filter((window) => window.z === 7);
    const width = units.reduce((sum, window) => sum + window.width, 0);
    return { name: 'Prep joined counter window bank', x: 47.4, z: 7, width, height: units[0].height, sill: units[0].sill, openingWidth: width + 0.5 / 12, openingHeight: 5, openingSill: 41 / 12, units };
  }

  function getKitchenWindowBankLayout() {
    // Nominal joined bank; factory SKUs and mulling remain unapproved.
    const x = 32, z = 7, height = 4.5, sill = 3.5;
    const sideWidth = 18 / 12, pictureWidth = 54 / 12;
    const sideOffset = (pictureWidth + sideWidth) / 2;
    const units = [
      { name: 'Kitchen sink left casement', x: x - sideOffset, z, width: sideWidth, height, sill, picture: false },
      { name: 'Kitchen sink window', x, z, width: pictureWidth, height, sill, picture: true },
      { name: 'Kitchen sink right casement', x: x + sideOffset, z, width: sideWidth, height, sill, picture: false }
    ];
    const width = units.reduce((sum, unit) => sum + unit.width, 0);
    return { name: 'Kitchen sink joined window bank', x, z, width, height, sill, openingWidth: width, openingHeight: height, openingSill: sill, units, trimLabel: 'Kitchen', assemblyApproved: false };
  }

  function getGuestEntryLayout(stairs = UpstairsLayout.stairOpening()) {
    // Fixed room/door datum: moving the shared stair opening must not move rooms.
    const northZ = 35.1;
    return {
      powder: { x: 0, z: northZ, w: 7.1, d: 5.9 },
      coatCloset: { x: 7.1, z: northZ + 3.5, w: 5.1, d: 2.4 },
      alcove: { x: 7.1, z: northZ, w: 5.1, d: 3.5 },
      stairGuard: { x: 7.45, z: northZ, endX: stairs.x + stairs.width, height: 42 / 12, postWidth: 0.09, barCount: 11, barSpacing: 3.5 / 12 },
      officeNorthZ: northZ + 5.9,
      powderDoor: { x: 7.1, z: northZ + 0.5, width: 2.5, height: 8 },
      closetDoor: { x: 7.65, z: northZ + 3.5, width: 4, height: 8 },
      toilet: { x: 1.65, z: northZ + 4.55, rotation: Math.PI },
      vanity: { x: 4.75, z: northZ + 4.775, width: 3.5, depth: 1.75, rotation: Math.PI },
      windows: [{ x: 0, z: northZ + 2.95, width: 29.5 / 12, height: 47.5 / 12, sill: 48.25 / 12, openingWidth: 2.5, openingHeight: 4, openingSill: 4, standardSizeCode: '2640', privacyLowerHalf: true }]
    };
  }

  function getGuestSuiteLayout() {
    // Include the projecting header cap, not just the 2.5-inch casing legs.
    const closetRight = 25.75 - 0.175 - (2.5 / 12 + 0.125 / 12 + 0.125 / 2);
    const closetDoorWidth = 2.5;
    return {
      closet: { x: 19, z: 37.2, w: 6.75, d: 6 },
      kidsExtension: { x: 19, z: 34.6, w: 6.75, d: 2.6 },
      bedroomDoor: { x: 19, z: 43.8, width: 3, height: 8 },
      closetDoor: { x: closetRight - closetDoorWidth, z: 43.2, width: closetDoorWidth, height: 8,
        pocket: { x: 19.175, w: closetRight - closetDoorWidth - 19.175, retract: 'left', leafWidth: closetDoorWidth + 0.08, travel: closetDoorWidth + 0.04, approvalRequired: true } },
      bathroom: { x: 25.75, z: 33.6, w: 5.45, d: 9.6 },
      closetStorage: {
        hanging: [
          { x: 2.25, z: 0.25, w: 2, d: 2, double: false },
          { x: 4.25, z: 0.25, w: 2, d: 2, double: true }
        ],
        corner: { x: 0.25, z: 0.25, w: 2, d: 2, clip: 1.25 },
        shelves: { x: 0.25, z: 2.25, w: 2, d: 2 },
        westShelving: { x: 0.25, z: 4.25, w: 2, d: 1.5 },
        northFiller: { x: 6.25, z: 0.25, w: 0.25, d: 2 }
      },
      bathroomDoor: { x: 26.2, z: 43.2, width: 28 / 12, height: 8, hinge: 'west', inward: true, maxAngleDegrees: 90 },
      shower: { x: 25.95, z: 33.8, w: 5.05, d: 3.2, rotation: 0, clearWidth: 4.85, clearDepth: 3, entryOffset: 0.2, doorWidth: 2.5, height: 8 },
      toilet: { x: 29.9, z: 38.5, rotation: -Math.PI / 2 },
      vanity: { x: 30.15, z: 41.4, width: 2.5, mirrorWidth: 2, rotation: -Math.PI / 2, basinCount: 1 }
    };
  }

  function getLivableFloorArea(plan) {
    const floors = plan.floors.filter((floor) => !/^(Garage|Front porch|Mechanical(?:\b|$))/.test(floor.room ?? floor.name ?? ''));
    for (const floor of floors) {
      if (![floor.x, floor.z, floor.w, floor.d].every(Number.isFinite) || floor.w < 0 || floor.d < 0) throw new Error('Cannot calculate livable area from invalid floor geometry.');
    }
    const edges = [...new Set(floors.flatMap(({ x, w }) => [x, x + w]))].sort((a, b) => a - b);
    let area = 0;
    for (let index = 1; index < edges.length; index++) {
      const left = edges[index - 1], right = edges[index];
      const spans = floors.filter(({ x, w }) => x < right && x + w > left).map(({ z, d }) => [z, z + d]).sort((a, b) => a[0] - b[0]);
      let end = -Infinity, depth = 0;
      for (const [start, stop] of spans) {
        depth += Math.max(0, stop - Math.max(start, end));
        end = Math.max(end, stop);
      }
      area += (right - left) * depth;
    }
    return area;
  }

  function getGroundFloorDefaultPlan() {
    const stairs = UpstairsLayout.stairOpening();
    const livingFeatureWall = getLivingRoomFeatureLayout(stairs);
    const guestEntry = getGuestEntryLayout(stairs);
    const guestSuite = getGuestSuiteLayout();
    const kitchenPassages = getKitchenPassageLayout();
    const front = getGroundFrontLayout();
    const powderZ = guestEntry.powder.z;
    const entryZ = guestEntry.alcove.z, officeZ = guestEntry.officeNorthZ;
    const kidsNorthZ = 26.725 - 25 / 12 - 0.08 + 0.175;
    const garageNorthWestX = 44.9 - 8 / 12, garageWestX = 31.2, garageEastX = 55.5;
    const garageNorthZ = 15, garageStepZ = 26.9, garageSouthZ = 49;
    const rooms = [
      ['Living room', 0, 8, 13.2, 17.7], ['Dining room', 13.2, -0.1, 13.675, 8.1],
      ['Hall', 13.2, 8, 13.3, kidsNorthZ - 8], ['Kitchen', 26.5, 7, 11, 19.9],
      ['Prep kitchen', 37.5, 7, 18, 8], ['Mudroom', 37.5, 15, 7.4 - 8 / 12, 11.9],
      ['Kids room', 19, kidsNorthZ, 12.2, 33.6 - kidsNorthZ], ['Powder room', 0, powderZ, 7.1, guestEntry.powder.d],
      ['Guest coat closet', 7.1, guestEntry.coatCloset.z, 5.1, guestEntry.coatCloset.d], ['Guest entry alcove', 7.1, entryZ, 5.1, guestEntry.alcove.d],
      ['Office', 0, officeZ, 12.2, front.wallZ - officeZ], ['Entry hall', 12.2, 34.6, 6.8, front.wallZ - 34.6],
      ...[['Kids room extension', guestSuite.kidsExtension], ['Closet', guestSuite.closet], ['Bathroom', guestSuite.bathroom]].map(([name, { x, z, w, d }]) => [name, x, z, w, d]),
      ['Guest room', 19, 43.2, 12.2, front.wallZ - 43.2],
      ['Garage', garageWestX, garageNorthZ, garageEastX - garageWestX, garageSouthZ - garageNorthZ], ['Front porch', 0, front.wallZ, 31.2, front.porchDepth]
    ].map(([name, x, z, w, d]) => ({ name, x, z, w, d }));
    const floors = [
      [0, 8, 13.2, 17.7, 'Living room'], [13.2, -0.1, 13.675, 8.1, 'Dining room'],
      [13.2, 8, 5.8, 17.7, 'Hall'], [19, 8, 7.5, kidsNorthZ - 8, 'Hall'],
      [26.875, 7, 10.625, 1, 'Kitchen'], [26.5, 8, 11, kidsNorthZ - 8, 'Kitchen'], [29, kidsNorthZ, 8.5, 26.9 - kidsNorthZ, 'Kitchen'],
      [37.5, 7, 7.9, 8, 'Prep kitchen'], [45.4, 7, 10.1, 8, 'Prep kitchen'], [37.5, 15, 7.4 - 8 / 12, 11.9, 'Mudroom'],
      [0, 25.7, 12.2, stairs.z - 25.7], [0, stairs.z, stairs.x, stairs.depth],
      [stairs.x + stairs.width, stairs.z, 12.2 - stairs.x - stairs.width, stairs.depth],
      [0, stairs.z + stairs.depth, 12.2, powderZ - stairs.z - stairs.depth],
      [12.2, 25.7, 6.8, 8.9], [19, kidsNorthZ, 6.75, 34.6 - kidsNorthZ, 'Kids room'],
      [25.75, kidsNorthZ, 3.25, 33.6 - kidsNorthZ, 'Kids room'],
      [29, 26.9, 2.2, 6.7, 'Kids room'],
      [12.2, 34.6, 6.8, front.wallZ - 34.6, 'Entry hall'], [0, powderZ, 7.1, guestEntry.powder.d, 'Powder room'],
      [7.1, entryZ, 5.1, guestEntry.alcove.d, 'Guest entry alcove'],       [0, officeZ, 12.2, front.wallZ - officeZ, 'Office'],
      ...[['Kids room extension', guestSuite.kidsExtension], ['Closet', guestSuite.closet], ['Bathroom', guestSuite.bathroom]].map(([name, { x, z, w, d }]) => [x, z, w, d, name]),
      [19, 43.2, 12.2, front.wallZ - 43.2, 'Guest room'],
      [7.1, guestEntry.coatCloset.z, 5.1, guestEntry.coatCloset.d, 'Guest coat closet'],
      [garageNorthWestX, garageNorthZ, garageEastX - garageNorthWestX, garageStepZ - garageNorthZ, 'Garage', -1.25],
      [garageWestX, garageStepZ, garageEastX - garageWestX, 34.6 - garageStepZ, 'Garage', -1.25],
      [garageWestX, 34.6, garageEastX - garageWestX, garageSouthZ - 34.6, 'Garage', -1.25], [0, front.wallZ, 31.2, front.porchDepth, 'Front porch']
    ].map(([x, z, w, d, room, elevation = 0]) => ({ x, z, w, d, room: room ?? null, elevation }));
    const sideWindows = [livingFeatureWall.sideWindowBank].map(({ x, openingWidth, openingSill, openingHeight }) => [x - openingWidth / 2, x + openingWidth / 2, openingSill, openingSill + openingHeight]);
    const segments = [
      ['Living north', 0, 8, 13.2, 8, sideWindows],
      ['Dining west', 13.2, -0.1, 13.2, 8, [[livingFeatureWall.patioDoor.z - 1.5 + 0.1, livingFeatureWall.patioDoor.z + 1.5 + 0.1, 0, 8]]],
      ['Dining north', 13.2, -0.1, 26.875, -0.1, [[3.8375, 9.8375, 3, 8]]],
      ['Dining east', 26.875, -0.1, 26.875, 7, [[0.6, 6.6, 3, 8]]],
      ['Kitchen north', 26.875, 7, 37.5, 7, [getKitchenWindowBankLayout()].map(({ x, openingWidth, openingSill, openingHeight }) => [x - openingWidth / 2 - 26.875, x + openingWidth / 2 - 26.875, openingSill, openingSill + openingHeight])],
      ['Prep north', 37.5, 7, 55.5, 7, [getPrepWindowBankLayout()].map(({ x, openingWidth, openingSill, openingHeight }) => [x - openingWidth / 2 - 37.5, x + openingWidth / 2 - 37.5, openingSill, openingSill + openingHeight])],
      ['Prep east', 55.5, 7, 55.5, 15, getPrepWindowLayout().filter((window) => window.x === 55.5).map(({ z, openingWidth, openingSill, openingHeight }) => [z - openingWidth / 2 - 7, z + openingWidth / 2 - 7, openingSill, openingSill + openingHeight])],
      ['Garage east', 55.5, 15, 55.5, 49, [...getGarageClerestoryLayout().map(({ z, width, sill, height }) => [z - width / 2 - 15, z + width / 2 - 15, sill, sill + height]), [29, 32, -1.25, 6.75]]],
      ['Garage south', 31.2, 49, 55.5, 49, [[1.3, 10.3, -1.25, 6.75], [12.8, 21.8, -1.25, 6.75]]],
      ['Guest east', 31.2, 49, 31.2, front.wallZ],
      ['Porch east', 31.2, front.wallZ, 31.2, front.porchEdgeZ], ['Porch south', 0, front.porchEdgeZ, 31.2, front.porchEdgeZ],
      ['Porch west', 0, front.wallZ, 0, front.porchEdgeZ],
      ['Office west', 0, livingFeatureWall.wallEndZ, 0, front.wallZ, [
        ...guestEntry.windows.map(({ z, openingWidth, openingSill, openingHeight }) => [z - openingWidth / 2 - livingFeatureWall.wallEndZ, z + openingWidth / 2 - livingFeatureWall.wallEndZ, openingSill, openingSill + openingHeight]),
        [21.3 - (livingFeatureWall.wallEndZ - 25.7), 25.3 - (livingFeatureWall.wallEndZ - 25.7), 3, 8]
      ]],
      ['Living west', 0, 8, 0, livingFeatureWall.wallEndZ, livingFeatureWall.windowCenters.map((z) => [z - 8 - livingFeatureWall.fireplaceWindows.width / 2, z - 8 + livingFeatureWall.fireplaceWindows.width / 2, livingFeatureWall.fireplaceWindows.sill, livingFeatureWall.fireplaceWindows.head])],
      ['Kids north', 19, kidsNorthZ, 29, kidsNorthZ], ['Kids west', 19, kidsNorthZ, 19, 34.6, [[27 - kidsNorthZ, 31.5 - kidsNorthZ, 0, 8]]],
      ['Kids east return', 29, kidsNorthZ, 29, 26.9], ['Powder north', 0, powderZ, guestEntry.stairGuard.x, powderZ],
      ['Powder east', 7.1, powderZ, 7.1, officeZ, [[guestEntry.powderDoor.z - powderZ, guestEntry.powderDoor.z - powderZ + guestEntry.powderDoor.width, 0, guestEntry.powderDoor.height]]],
      ['Guest coat closet front', 7.1, guestEntry.closetDoor.z, 12.2, guestEntry.closetDoor.z, [[guestEntry.closetDoor.x - 7.1, guestEntry.closetDoor.x - 7.1 + guestEntry.closetDoor.width, 0, guestEntry.closetDoor.height]]],
      ['Guest coat closet east', 12.2, guestEntry.coatCloset.z, 12.2, officeZ],
      ['Office east', 12.2, officeZ, 12.2, front.wallZ, [[45.25 - 2.5 - officeZ, 45.25 + 2.5 - officeZ, 0, 8]]],
      ['Office north', 0, officeZ, 12.2, officeZ],
      ['House south', 0, front.wallZ, 31.2, front.wallZ, [...getGroundFrontWindows().map(w => [w.center-w.width/2,w.center+w.width/2,w.sill,w.sill+w.height]), [13.1,18.1,0,8]].sort((a,b)=>a[0]-b[0])],
      ['Guest west', 19, 34.6, 19, front.wallZ, [[guestSuite.bedroomDoor.z - 34.6, guestSuite.bedroomDoor.z + guestSuite.bedroomDoor.width - 34.6, 0, 8]]],
      ['Closet north', 19, guestSuite.closet.z, guestSuite.bathroom.x, guestSuite.closet.z], ['Closet east', guestSuite.bathroom.x, guestSuite.bathroom.z, guestSuite.bathroom.x, guestSuite.bathroomDoor.z],
      ['Closet south', 19, guestSuite.closetDoor.z, guestSuite.bathroom.x, guestSuite.closetDoor.z, [[guestSuite.closetDoor.x - 19, guestSuite.closetDoor.x - 19 + guestSuite.closetDoor.width, 0, guestSuite.closetDoor.height]]],
      ['Bathroom south', guestSuite.bathroom.x, guestSuite.bathroomDoor.z, 31.2, guestSuite.bathroomDoor.z, [[guestSuite.bathroomDoor.x - guestSuite.bathroom.x, guestSuite.bathroomDoor.x - guestSuite.bathroom.x + guestSuite.bathroomDoor.width, 0, guestSuite.bathroomDoor.height]]],
      ['Bathroom north', guestSuite.bathroom.x, guestSuite.bathroom.z, 31.2, guestSuite.bathroom.z],
      ['Garage west', 31.2, 34.6, 31.2, 49], ['Garage west return', 31.2, 26.9, 31.2, 34.6],
      ['Kitchen south left', 29, 26.9, 29.1875, 26.9], ['Kids kitchen return', 29.1875, 26.9, 31.2, 26.9],
      ['Kitchen south', 31.2, 26.9, 37.3, 26.9],
      ['Kitchen south right', 37.3, 26.9, 37.5, 26.9],
      ['Kitchen east', kitchenPassages.wallX, kitchenPassages.wallZ, kitchenPassages.wallX, 25.3, kitchenPassages.openings],
      ['Kitchen east return', 37.5, 25.3, 37.5, 26.9], ['Mudroom north', 37.5, 15, 44.9 - 8 / 12, 15],
      ['Garage north', 44.9 - 8 / 12, 15, 55.5, 15], ['Mudroom east', 44.9 - 8 / 12, 15, 44.9 - 8 / 12, 26.9],
      ['Mudroom south', 37.5, 26.9, 44.9 - 8 / 12, 26.9, [[0.5, 3.5, 0, 8]]]
    ];
    return { rooms, floors, walls: segments, windows: [], stairs, floorName: 'first-floor' };
  }

  root.getLivingRoomFeatureLayout = getLivingRoomFeatureLayout;
  root.getFrontEntryLayout = getFrontEntryLayout;
  root.buildArchedFrontEntry = buildArchedFrontEntry;
  root.getGarageClerestoryLayout = getGarageClerestoryLayout;
  root.getGuestEntryLayout = getGuestEntryLayout;
  root.getGuestSuiteLayout = getGuestSuiteLayout;
  root.getGroundFloorDefaultPlan = getGroundFloorDefaultPlan;
  root.getKitchenPassageLayout = getKitchenPassageLayout;
  root.getPrepWindowLayout = getPrepWindowLayout;
  root.getPrepWindowBankLayout = getPrepWindowBankLayout;
  root.getKitchenWindowBankLayout = getKitchenWindowBankLayout;
  root.getLivableFloorArea = getLivableFloorArea;
  root.buildGroundLayoutPreview = function (THREE, baseline, edits) {
    const plan = UpstairsLayout.resolve(baseline, edits);
    const group = new THREE.Group();
    group.name = 'Edited first-floor layout (structure only)';
    const floorMaterial = new THREE.MeshStandardMaterial({ color: '#e7ddc6', roughness: 0.95 });
    const wallMaterial = new THREE.MeshStandardMaterial({ color: '#ece9dc', roughness: 0.9 });
    const glassMaterial = new THREE.MeshStandardMaterial({ color: '#8eb8c8', transparent: true, opacity: 0.45 });
    function box(x, y, z, w, h, d, material) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    }
    for (const floor of plan.floors) {
      box(floor.x + floor.w / 2, (floor.elevation ?? 0) - 0.24, floor.z + floor.d / 2, floor.w, 0.45, floor.d, floorMaterial).userData.walkSurface = true;
    }
    for (const wall of plan.walls) {
      const distance = UpstairsLayout.length(wall), dx = (wall.x2 - wall.x1) / distance, dz = (wall.z2 - wall.z1) / distance;
      const base = wall.name.startsWith('Garage') || ['Kitchen south left', 'Kitchen south', 'Kitchen south right', 'Mudroom south', 'Mudroom east'].includes(wall.name) ? -1.25 : 0;
      const height = wall.name.startsWith('Porch') ? 2.6 : 9;
      function part(start, end, bottom, top, material = wallMaterial) {
        if (end <= start || top <= bottom) return;
        const mesh = box(wall.x1 + dx * (start + end) / 2, (bottom + top) / 2, wall.z1 + dz * (start + end) / 2, end - start, top - bottom, wall.thickness, material);
        mesh.rotation.y = -Math.atan2(dz, dx);
      }
      let cursor = 0;
      for (const [start, end, bottom, top] of wall.openings) {
        part(cursor, start, base, height);
        part(start, end, base, bottom);
        part(start, end, top, height);
        if (bottom > 0) part(start, end, bottom, top, glassMaterial);
        cursor = end;
      }
      part(cursor, distance, base, height);
    }
    return {
      group, plan,
      dispose() {
        group.traverse((object) => { if (object.isMesh) object.geometry.dispose(); });
        for (const material of [floorMaterial, wallMaterial, glassMaterial]) material.dispose();
      }
    };
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = { addWindowShadeDivisions, addSingleHungSashes, getGroundFrontWindows, getGroundFrontLayout, getWindowProductIntent, getGroundFloorDefaultPlan, getKitchenPassageLayout, getPrepWindowLayout, getPrepWindowBankLayout, getKitchenWindowBankLayout, getLivableFloorArea, getLivingRoomFeatureLayout, getGarageClerestoryLayout, getGuestEntryLayout, getGuestSuiteLayout, getFrontEntryLayout, buildArchedFrontEntry };
})(typeof globalThis !== 'undefined' ? globalThis : this);
