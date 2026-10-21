(function (root) {
  'use strict';
  const UpstairsLayout = typeof module !== 'undefined' && module.exports ? require('./upstairs-layout.js') : root.UpstairsLayout;

  function getLivingRoomFeatureLayout(stairs = UpstairsLayout.stairOpening()) {
    const wallStartZ = 8 + 0.35 / 2;
    const wallEndZ = stairs.z;
    const centerZ = (wallStartZ + wallEndZ) / 2;
    return { wallStartZ, wallEndZ, centerZ, windowCenters: [centerZ - 5.8, centerZ + 5.8] };
  }

  function getGuestEntryLayout(stairs = UpstairsLayout.stairOpening()) {
    const northZ = stairs.z + stairs.depth + 0.5;
    return {
      powder: { x: 0, z: northZ, w: 7.1, d: 5.9 },
      coatCloset: { x: 7.1, z: northZ, w: 5.1, d: 2.4 },
      alcove: { x: 7.1, z: northZ + 2.4, w: 5.1, d: 3.5 },
      officeNorthZ: northZ + 5.9,
      powderDoor: { x: 7.1, z: northZ + 2.9, width: 2.5, height: 7 },
      closetDoor: { x: 7.65, z: northZ + 2.4, width: 4, height: 7 },
      toilet: { x: 1.6, z: northZ + 1.55 },
      vanity: { x: 3.25, z: northZ + 4.85, width: 2.3, rotation: Math.PI }
    };
  }

  function getGuestSuiteLayout() {
    return {
      closet: { x: 19, z: 34.6, w: 6, d: 7.4 },
      bathroom: { x: 25, z: 34.6, w: 6.2, d: 7.4 },
      closetDoor: { x: 19.55, z: 42, width: 2.5, height: 7, doorless: true },
      closetStorage: {
        hanging: [
          { x: 19.325, z: 34.775, w: 5.35, d: 2, double: false },
          { x: 22.5, z: 39.825, w: 2.175, d: 2, double: true }
        ],
        shelves: { x: 19.325, z: 36.95, w: 1, d: 2.4 }
      },
      bathroomDoor: { x: 28.15, z: 42, width: 2.5, height: 7 },
      shower: { x: 25.175, z: 34.775, w: 3.2, d: 4.2, clearWidth: 3, clearDepth: 4, doorWidth: 2.5 },
      toilet: { x: 29.7, z: 35.9 },
      vanity: { x: 26.05, z: 40.5, width: 2, rotation: Math.PI / 2 }
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
      ['Living room', 0, 8, 13.2, 17.7], ['Dining room', 13.2, -2.1, 13.3, 10.1],
      ['Hall', 13.2, 8, 13.3, kidsNorthZ - 8], ['Kitchen', 26.5, 7, 11.5, 19.9],
      ['Prep kitchen', 38, 7, 17.5, 8], ['Mudroom', 38, 15, 7.4, 11.9],
      ['Kids room', 19, kidsNorthZ, 10, 34.6 - kidsNorthZ], ['Powder room', 0, powderZ, 7.1, guestEntry.powder.d],
      ['Guest coat closet', 7.1, powderZ, 5.1, guestEntry.coatCloset.d], ['Guest entry alcove', 7.1, entryZ, 5.1, guestEntry.alcove.d],
      ['Office', 0, officeZ, 12.2, 54.2 - officeZ], ['Entry hall', 12.2, 34.6, 6.8, 19.6],
      ['Closet', 19, 34.6, 6, 7.4], ['Bathroom', 25, 34.6, 6.2, guestSuite.bathroom.d],
      ['Guest room', 19, 42, 12.2, 12.2],
      ['Garage', 29, 15, 26.5, 34], ['Front porch', 0, 54.2, 31.2, 7]
    ].map(([name, x, z, w, d]) => ({ name, x, z, w, d }));
    const floors = [
      [0, 8, 13.2, 17.7, 'Living room'], [13.2, -2.1, 13.3, 10.1, 'Dining room'],
      [13.2, 8, 5.8, 17.7, 'Hall'], [19, 8, 7.5, kidsNorthZ - 8, 'Hall'],
      [26.5, 7, 11.5, kidsNorthZ - 7, 'Kitchen'], [29, kidsNorthZ, 9, 26.9 - kidsNorthZ, 'Kitchen'],
      [38, 7, 17.5, 8, 'Prep kitchen'], [38, 15, 7.4, 11.9, 'Mudroom'],
      [0, 25.7, 12.2, stairs.z - 25.7], [0, stairs.z, stairs.x, stairs.depth],
      [stairs.x + stairs.width, stairs.z, 12.2 - stairs.x - stairs.width, stairs.depth],
      [0, stairs.z + stairs.depth, 12.2, powderZ - stairs.z - stairs.depth],
      [12.2, 25.7, 6.8, 8.9], [19, kidsNorthZ, 10, 34.6 - kidsNorthZ, 'Kids room'],
      [12.2, 34.6, 6.8, 19.6, 'Entry hall'], [0, powderZ, 7.1, guestEntry.powder.d, 'Powder room'],
      [7.1, entryZ, 5.1, guestEntry.alcove.d, 'Guest entry alcove'], [0, officeZ, 12.2, 54.2 - officeZ, 'Office'],
      [19, 34.6, 6, 7.4, 'Closet'], [25, 34.6, 6.2, guestSuite.bathroom.d, 'Bathroom'],
      [19, 42, 12.2, 12.2, 'Guest room'],
      [7.1, powderZ, 5.1, guestEntry.coatCloset.d, 'Guest coat closet'],
      [45.4, 15, 10.1, 11.9, 'Garage', -1.25], [29, 26.9, 26.5, 7.7, 'Garage', -1.25],
      [31.2, 34.6, 24.3, 14.4, 'Garage', -1.25], [0, 54.2, 31.2, 7, 'Front porch']
    ].map(([x, z, w, d, room, elevation = 0]) => ({ x, z, w, d, room: room ?? null, elevation }));
    const sideWindows = [6.6 - 10 / 3, 6.6, 6.6 + 10 / 3].map((x) => [x - 1.25, x + 1.25, 3, 8]);
    const segments = [
      ['Living north', 0, 8, 13.2, 8, sideWindows],
      ['Dining west', 13.2, -2.1, 13.2, 8, [[2.05, 8.05, 3, 8]]],
      ['Dining north', 13.2, -2.1, 26.5, -2.1, [[3.65, 9.65, 3, 8]]],
      ['Dining east', 26.5, -2.1, 26.5, 7, [[2.1, 8.1, 0, 8]]],
      ['Kitchen north', 26.5, 7, 38, 7, [[1, 2.5, 53 / 12, 95 / 12], [3.5, 8, 53 / 12, 95 / 12], [9, 10.5, 53 / 12, 95 / 12]]],
      ['Prep north', 38, 7, 55.5, 7, [[6.4, 8.9, 4.25, 7.75], [9.9, 12.4, 4.25, 7.75]]],
      ['Prep east', 55.5, 7, 55.5, 15, [[4, 6, 4.25, 7.75]]],
      ['Garage east', 55.5, 15, 55.5, 49, [[29, 32, -1.25, 6.75]]],
      ['Garage south', 31.2, 49, 55.5, 49, [[1.3, 10.3, -1.25, 6.75], [12.8, 21.8, -1.25, 6.75]]],
      ['Guest east', 31.2, 49, 31.2, 54.2],
      ['Porch east', 31.2, 54.2, 31.2, 61.2], ['Porch south', 0, 61.2, 31.2, 61.2],
      ['Porch west', 0, 54.2, 0, 61.2],
      ['Office west', 0, livingFeatureWall.wallEndZ, 0, 54.2, [[21.3 - (livingFeatureWall.wallEndZ - 25.7), 25.3 - (livingFeatureWall.wallEndZ - 25.7), 3, 8]]],
      ['Living west', 0, 8, 0, livingFeatureWall.wallEndZ, livingFeatureWall.windowCenters.map((z) => [z - 8 - 2, z - 8 + 2, 2.6, 8])],
      ['Kids north', 19, kidsNorthZ, 29, kidsNorthZ], ['Kids west', 19, kidsNorthZ, 19, 34.6, [[27 - kidsNorthZ, 31.5 - kidsNorthZ, 0, 8]]],
      ['Kids east return', 29, kidsNorthZ, 29, 26.9], ['Powder north', 0, powderZ, 12.2, powderZ],
      ['Powder east', 7.1, powderZ, 7.1, officeZ, [[guestEntry.powderDoor.z - powderZ, guestEntry.powderDoor.z - powderZ + guestEntry.powderDoor.width, 0, 7]]],
      ['Guest coat closet front', 7.1, entryZ, 12.2, entryZ, [[guestEntry.closetDoor.x - 7.1, guestEntry.closetDoor.x - 7.1 + guestEntry.closetDoor.width, 0, 7]]],
      ['Guest coat closet east', 12.2, powderZ, 12.2, entryZ],
      ['Office east', 12.2, officeZ, 12.2, 54.2, [[45.25 - 2.5 - officeZ, 45.25 + 2.5 - officeZ, 0, 8]]],
      ['Office north', 0, officeZ, 12.2, officeZ],
      ['House south', 0, 54.2, 31.2, 54.2, [[3, 9, 3, 8], [13.1, 18.1, 0, 7], [21.2, 28.8, 3, 8]]],
      ['Guest west', 19, 34.6, 19, 54.2, [[7.4, 10.4, 0, 7]]],
      ['Closet north', 19, 34.6, 25, 34.6], ['Closet east', 25, 34.6, 25, 42],
      ['Closet south', 19, 42, 25, 42, [[guestSuite.closetDoor.x - 19, guestSuite.closetDoor.x - 19 + guestSuite.closetDoor.width, 0, 7]]],
      ['Bathroom south', 25, 42, 31.2, 42, [[guestSuite.bathroomDoor.x - 25, guestSuite.bathroomDoor.x - 25 + guestSuite.bathroomDoor.width, 0, 7]]],
      ['Bathroom north', 25, 34.6, 29, 34.6], ['Garage southwest return', 29, 34.6, 31.2, 34.6],
      ['Garage west', 31.2, 34.6, 31.2, 49], ['Garage west return', 29, 26.9, 29, 34.6],
      ['Kitchen south left', 29, 26.9, 29.6875, 26.9], ['Kitchen south', 29.6875, 26.9, 37.8, 26.9],
      ['Kitchen south right', 37.8, 26.9, 38, 26.9],
      ['Kitchen east', 38, 7, 38, 25.3, [[2.725, 5.225, 0, 8], [14.675, 17.175, 0, 8]]],
      ['Kitchen east return', 38, 25.3, 38, 26.9], ['Mudroom north', 38, 15, 45.4, 15],
      ['Garage north', 45.4, 15, 55.5, 15], ['Mudroom east', 45.4, 15, 45.4, 26.9],
      ['Mudroom south', 38, 26.9, 45.4, 26.9, [[1.5, 4.5, 0, 8]]]
    ];
    return { rooms, floors, walls: segments, windows: [], stairs, floorName: 'first-floor' };
  }

  root.getLivingRoomFeatureLayout = getLivingRoomFeatureLayout;
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
  if (typeof module !== 'undefined' && module.exports) module.exports = { getGroundFloorDefaultPlan, getLivingRoomFeatureLayout, getGuestEntryLayout, getGuestSuiteLayout };
})(typeof globalThis !== 'undefined' ? globalThis : this);
