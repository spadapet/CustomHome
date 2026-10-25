(function (root) {
  'use strict';
  const UpstairsLayout = typeof module !== 'undefined' && module.exports ? require('./upstairs-layout.js') : root.UpstairsLayout;

  function getLivingRoomFeatureLayout(stairs = UpstairsLayout.stairOpening()) {
    const wallStartZ = 8 + 0.35 / 2;
    const wallEndZ = stairs.z;
    const centerZ = (wallStartZ + wallEndZ) / 2;
    return { wallStartZ, wallEndZ, centerZ, windowCenters: [centerZ - 5.8, centerZ + 5.8] };
  }

  function getGarageClerestoryLayout(floorY = -1.25) {
    return [19.5, 29.5, 39.5].map((z, index) => ({
      name: `Garage high window ${index + 1}`, x: 55.5, z, width: 6, height: 1.5,
      sill: floorY + 7.5, sillAboveFloor: 7.5, fixed: true
    }));
  }

  function getGuestEntryLayout(stairs = UpstairsLayout.stairOpening()) {
    const northZ = stairs.z + stairs.depth + 0.5;
    return {
      powder: { x: 0, z: northZ, w: 7.1, d: 5.9 },
      coatCloset: { x: 7.1, z: northZ, w: 5.1, d: 2.4 },
      alcove: { x: 7.1, z: northZ + 2.4, w: 5.1, d: 3.5 },
      officeNorthZ: northZ + 5.9,
      powderDoor: { x: 7.1, z: northZ + 2.9, width: 2.5, height: 8 },
      closetDoor: { x: 7.65, z: northZ + 2.4, width: 4, height: 8 },
      toilet: { x: 1.65, z: northZ + 1.35, rotation: 0 },
      vanity: { x: 4.75, z: northZ + 1.125, width: 3.5, depth: 1.75, rotation: 0 },
      windows: [{ x: 0, z: northZ + 2.95, width: 29.5 / 12, height: 47.5 / 12, sill: 48.25 / 12, openingWidth: 2.5, openingHeight: 4, openingSill: 4, standardSizeCode: '2640', privacyLowerHalf: true }]
    };
  }

  function getGuestSuiteLayout() {
    return {
      closet: { x: 19, z: 34.6, w: 5.5, d: 7.4 },
      closetDoor: { x: 21.35, z: 42, width: 2.5, height: 8, doorless: true },
      bathroom: { x: 24.5, z: 34.6, w: 6.7, d: 5 },
      sinkAlcove: { x: 24.5, z: 39.6, w: 6.7, d: 3.4 },
      vanityPrivacyWall: { x: 29.3225, z: 43.2, w: 1.8775 },
      closetStorage: {
        hanging: [
          { x: 0.08, z: 0.08, w: 3.63, d: 1.84, double: false },
          { x: 3.79, z: 0.08, w: 1.9, d: 1.84, double: true }
        ],
        shelves: { x: 5.77, z: 0.08, w: 0.98, d: 1.84 }
      },
      bathroomDoor: { x: 25, z: 39.6, width: 2.5, height: 8, pocket: { x: 27.5, w: 2.65, targetClearWidth: 28 / 12, approvalRequired: true } },
      shower: { x: 31.025, z: 34.775, w: 4.65, d: 3.2, rotation: -Math.PI / 2, clearWidth: 4.45, clearDepth: 3, entryOffset: 2, doorWidth: 2.5, height: 8 },
      toilet: { x: 26, z: 35.95, rotation: 0 },
      vanity: { x: 30.2, z: 41.4, width: 3, mirrorWidth: 2.5, rotation: -Math.PI / 2, basinCount: 1 }
    };
  }

  function getGroundFloorDefaultPlan() {
    const stairs = UpstairsLayout.stairOpening();
    const livingFeatureWall = getLivingRoomFeatureLayout(stairs);
    const guestEntry = getGuestEntryLayout(stairs);
    const guestSuite = getGuestSuiteLayout();
    const powderZ = guestEntry.powder.z;
    const entryZ = guestEntry.alcove.z, officeZ = guestEntry.officeNorthZ;
    const kidsNorthZ = 26.725 - 25 / 12 - 0.08 + 0.175;
    const rooms = [
      ['Living room', 0, 8, 13.2, 17.7], ['Dining room', 13.2, -0.1, 13.675, 8.1],
      ['Hall', 13.2, 8, 13.3, kidsNorthZ - 8], ['Kitchen', 26.5, 7, 11, 19.9],
      ['Prep kitchen', 37.5, 7, 18, 8], ['Mudroom', 37.5, 15, 7.4 - 2 / 12, 11.9],
      ['Kids room', 19, kidsNorthZ, 10, 34.6 - kidsNorthZ], ['Powder room', 0, powderZ, 7.1, guestEntry.powder.d],
      ['Guest coat closet', 7.1, powderZ, 5.1, guestEntry.coatCloset.d], ['Guest entry alcove', 7.1, entryZ, 5.1, guestEntry.alcove.d],
      ['Office', 0, officeZ, 12.2, 54.2 - officeZ], ['Entry hall', 12.2, 34.6, 6.8, 19.6],
      ['Closet', 19, 34.6, 5.5, 7.4], ['Bathroom', 24.5, 34.6, 6.7, guestSuite.bathroom.d],
      ['Guest sink alcove', guestSuite.sinkAlcove.x, guestSuite.sinkAlcove.z, guestSuite.sinkAlcove.w, guestSuite.sinkAlcove.d],
      ['Guest room', 19, 43, 12.2, 11.2],
      ['Guest room entry', 19, 42, 5.5, 1],
      ['Garage', 29, 15, 26.5, 34], ['Front porch', 0, 54.2, 31.2, 7]
    ].map(([name, x, z, w, d]) => ({ name, x, z, w, d }));
    const floors = [
      [0, 8, 13.2, 17.7, 'Living room'], [13.2, -0.1, 13.675, 8.1, 'Dining room'],
      [13.2, 8, 5.8, 17.7, 'Hall'], [19, 8, 7.5, kidsNorthZ - 8, 'Hall'],
      [26.875, 7, 10.625, 1, 'Kitchen'], [26.5, 8, 11, kidsNorthZ - 8, 'Kitchen'], [29, kidsNorthZ, 8.5, 26.9 - kidsNorthZ, 'Kitchen'],
      [37.5, 7, 7.9, 8, 'Prep kitchen'], [45.4, 7, 10.1, 8, 'Prep kitchen'], [37.5, 15, 7.4 - 2 / 12, 11.9, 'Mudroom'],
      [0, 25.7, 12.2, stairs.z - 25.7], [0, stairs.z, stairs.x, stairs.depth],
      [stairs.x + stairs.width, stairs.z, 12.2 - stairs.x - stairs.width, stairs.depth],
      [0, stairs.z + stairs.depth, 12.2, powderZ - stairs.z - stairs.depth],
      [12.2, 25.7, 6.8, 8.9], [19, kidsNorthZ, 10, 34.6 - kidsNorthZ, 'Kids room'],
      [12.2, 34.6, 6.8, 19.6, 'Entry hall'], [0, powderZ, 7.1, guestEntry.powder.d, 'Powder room'],
      [7.1, entryZ, 5.1, guestEntry.alcove.d, 'Guest entry alcove'], [0, officeZ, 12.2, 54.2 - officeZ, 'Office'],
      [19, 34.6, 5.5, 7.4, 'Closet'], [24.5, 34.6, 6.7, guestSuite.bathroom.d, 'Bathroom'],
      [guestSuite.sinkAlcove.x, guestSuite.sinkAlcove.z, guestSuite.sinkAlcove.w, guestSuite.sinkAlcove.d, 'Guest sink alcove'],
      [19, 43, 12.2, 11.2, 'Guest room'],
      [19, 42, 5.5, 1, 'Guest room entry'],
      [7.1, powderZ, 5.1, guestEntry.coatCloset.d, 'Guest coat closet'],
      [44.9 - 2 / 12, 15, 10.6 + 2 / 12, 11.9, 'Garage', -1.25], [29, 26.9, 26.5, 7.7, 'Garage', -1.25],
      [31.2, 34.6, 24.3, 14.4, 'Garage', -1.25], [0, 54.2, 31.2, 7, 'Front porch']
    ].map(([x, z, w, d, room, elevation = 0]) => ({ x, z, w, d, room: room ?? null, elevation }));
    const sideWindows = [6.6 - 10 / 3, 6.6, 6.6 + 10 / 3].map((x) => [x - 1.25, x + 1.25, 3, 8]);
    const segments = [
      ['Living north', 0, 8, 13.2, 8, sideWindows],
      ['Dining west', 13.2, -0.1, 13.2, 8, [[1.05, 7.05, 3, 8]]],
      ['Dining north', 13.2, -0.1, 26.875, -0.1, [[3.8375, 9.8375, 3, 8]]],
      ['Dining east', 26.875, -0.1, 26.875, 7, [[0.6, 6.6, 0, 8]]],
      ['Kitchen north', 26.875, 7, 37.5, 7, [[0.625, 2.125, 53 / 12, 95 / 12], [2.875, 7.375, 53 / 12, 95 / 12], [8.125, 9.625, 53 / 12, 95 / 12]]],
      ['Prep north', 37.5, 7, 55.5, 7, [[7.4, 12.4, 4.25, 7.75]]],
      ['Prep east', 55.5, 7, 55.5, 15, [[3.55, 5.55, 4.25, 7.75]]],
      ['Garage east', 55.5, 15, 55.5, 49, [...getGarageClerestoryLayout().map(({ z, width, sill, height }) => [z - width / 2 - 15, z + width / 2 - 15, sill, sill + height]), [29, 32, -1.25, 6.75]]],
      ['Garage south', 31.2, 49, 55.5, 49, [[1.3, 10.3, -1.25, 6.75], [12.8, 21.8, -1.25, 6.75]]],
      ['Guest east', 31.2, 49, 31.2, 54.2],
      ['Porch east', 31.2, 54.2, 31.2, 61.2], ['Porch south', 0, 61.2, 31.2, 61.2],
      ['Porch west', 0, 54.2, 0, 61.2],
      ['Office west', 0, livingFeatureWall.wallEndZ, 0, 54.2, [
        ...guestEntry.windows.map(({ z, openingWidth, openingSill, openingHeight }) => [z - openingWidth / 2 - livingFeatureWall.wallEndZ, z + openingWidth / 2 - livingFeatureWall.wallEndZ, openingSill, openingSill + openingHeight]),
        [21.3 - (livingFeatureWall.wallEndZ - 25.7), 25.3 - (livingFeatureWall.wallEndZ - 25.7), 3, 8]
      ]],
      ['Living west', 0, 8, 0, livingFeatureWall.wallEndZ, livingFeatureWall.windowCenters.map((z) => [z - 8 - 2, z - 8 + 2, 2.6, 8])],
      ['Kids north', 19, kidsNorthZ, 29, kidsNorthZ], ['Kids west', 19, kidsNorthZ, 19, 34.6, [[27 - kidsNorthZ, 31.5 - kidsNorthZ, 0, 8]]],
      ['Kids east return', 29, kidsNorthZ, 29, 26.9], ['Powder north', 0, powderZ, 12.2, powderZ],
      ['Powder east', 7.1, powderZ, 7.1, officeZ, [[guestEntry.powderDoor.z - powderZ, guestEntry.powderDoor.z - powderZ + guestEntry.powderDoor.width, 0, guestEntry.powderDoor.height]]],
      ['Guest coat closet front', 7.1, entryZ, 12.2, entryZ, [[guestEntry.closetDoor.x - 7.1, guestEntry.closetDoor.x - 7.1 + guestEntry.closetDoor.width, 0, guestEntry.closetDoor.height]]],
      ['Guest coat closet east', 12.2, powderZ, 12.2, entryZ],
      ['Office east', 12.2, officeZ, 12.2, 54.2, [[45.25 - 2.5 - officeZ, 45.25 + 2.5 - officeZ, 0, 8]]],
      ['Office north', 0, officeZ, 12.2, officeZ],
      ['House south', 0, 54.2, 31.2, 54.2, [[3, 9, 3, 8], [13.1, 18.1, 0, 8], [21.2, 28.8, 3, 8]]],
      ['Guest west', 19, 34.6, 19, 54.2, [[7.4, 10.4, 0, 8]]],
      ['Closet north', 19, 34.6, 24.5, 34.6], ['Closet east', 24.5, 34.6, 24.5, 42],
      ['Closet south', 19, 42, 24.5, 42, [[guestSuite.closetDoor.x - 19, guestSuite.closetDoor.x - 19 + guestSuite.closetDoor.width, 0, guestSuite.closetDoor.height]]],
      ['Bathroom south', 24.5, guestSuite.bathroomDoor.z, 31.2, guestSuite.bathroomDoor.z, [[guestSuite.bathroomDoor.x - 24.5, guestSuite.bathroomDoor.x - 24.5 + guestSuite.bathroomDoor.width, 0, guestSuite.bathroomDoor.height]]],
      ['Guest vanity privacy return', guestSuite.vanityPrivacyWall.x, guestSuite.vanityPrivacyWall.z, guestSuite.vanityPrivacyWall.x + guestSuite.vanityPrivacyWall.w, guestSuite.vanityPrivacyWall.z],
      ['Bathroom north', 24.5, 34.6, 29, 34.6], ['Garage southwest return', 29, 34.6, 31.2, 34.6],
      ['Garage west', 31.2, 34.6, 31.2, 49], ['Garage west return', 29, 26.9, 29, 34.6],
      ['Kitchen south left', 29, 26.9, 29.1875, 26.9], ['Kitchen south', 29.1875, 26.9, 37.3, 26.9],
      ['Kitchen south right', 37.3, 26.9, 37.5, 26.9],
      ['Kitchen east', 37.5, 7, 37.5, 25.3, [[2.725, 5.225, 0, 8], [14.675, 17.175, 0, 8]]],
      ['Kitchen east return', 37.5, 25.3, 37.5, 26.9], ['Mudroom north', 37.5, 15, 44.9 - 2 / 12, 15],
      ['Garage north', 44.9 - 2 / 12, 15, 55.5, 15], ['Mudroom east', 44.9 - 2 / 12, 15, 44.9 - 2 / 12, 26.9],
      ['Mudroom south', 37.5, 26.9, 44.9 - 2 / 12, 26.9, [[2, 5, 0, 8]]]
    ];
    return { rooms, floors, walls: segments, windows: [], stairs, floorName: 'first-floor' };
  }

  root.getLivingRoomFeatureLayout = getLivingRoomFeatureLayout;
  root.getGarageClerestoryLayout = getGarageClerestoryLayout;
  root.getGuestEntryLayout = getGuestEntryLayout;
  root.getGuestSuiteLayout = getGuestSuiteLayout;
  root.getGroundFloorDefaultPlan = getGroundFloorDefaultPlan;
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
  if (typeof module !== 'undefined' && module.exports) module.exports = { getGroundFloorDefaultPlan, getLivingRoomFeatureLayout, getGarageClerestoryLayout, getGuestEntryLayout, getGuestSuiteLayout };
})(typeof globalThis !== 'undefined' ? globalThis : this);
