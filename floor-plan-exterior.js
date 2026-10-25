function buildExteriorModel(THREE, { box, mat }, floorToFloor, garageFloorY) {
  const group = new THREE.Group();
  group.name = 'English-country exterior concept';
  group.visible = false;
  group.userData = { provisional: true, style: 'English country: cream limestone, medium-brown shingles, black window trim, oak entry', floorToFloorFeet: floorToFloor, coordinatedConstructionDrawings: false };
  const wallThickness = 0.45;
  const fenceBoundaryInset = 0.5, fenceRailOffset = 0.1, fenceRailDepth = 0.14;
  const eastWallFaceX = 55.5 + wallThickness / 2;
  const lot = { widthFeet: 75, depthFeet: 130, rearSetbackFeet: 32, eastFenceClearanceFeet: 5, rearWallZ: -0.1 - wallThickness / 2 };
  // Coordinates stay house-local; offset the parcel to reposition the house within it.
  lot.right = eastWallFaceX + lot.eastFenceClearanceFeet + fenceRailOffset + fenceRailDepth / 2 + fenceBoundaryInset;
  lot.left = lot.right - lot.widthFeet;
  lot.centerX = (lot.left + lot.right) / 2;
  lot.rear = lot.rearWallZ - lot.rearSetbackFeet;
  lot.front = lot.rear + lot.depthFeet;
  group.userData.lot = lot;
  const eaves = floorToFloor + 9;
  const trim = mat('#e4d5b8');
  const white = mat('#f3eddf');
  const garageDoorFinish = mat('#e6d7b9');
  garageDoorFinish.name = 'Warm cream garage door - screen approximation';
  const garageDoorDetail = mat('#ddcba7');
  garageDoorDetail.name = 'Cream garage door panel detail - screen approximation';
  const garageSurround = mat('#a18d70');
  garageSurround.name = 'Warm taupe garage opening surround - screen approximation';
  const dark = mat('#393b38', 0.65);
  const windowBlack = mat('#202321');
  const roofCap = mat('#8e7255');
  const wood = mat('#956c3e');
  const glass = new THREE.MeshStandardMaterial({ color: '#819ba2', metalness: 0.25, roughness: 0.22 });
  const privacyGlass = new THREE.MeshStandardMaterial({ color: '#e0e8e4', roughness: 1 });
  const glow = new THREE.MeshStandardMaterial({ color: '#ffe3ad', emissive: '#ffbf68', emissiveIntensity: 0.8 });
  const baseStone = new THREE.MeshStandardMaterial({ color: '#897b6a', roughness: 0.98 });
  const stepStone = mat('#796c5b', 0.98);
  const stepEdge = mat('#514b43', 0.98);
  const paverTexture = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Paver stone textures require a 2D canvas context.');
    context.fillStyle = '#6e685e';
    context.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 4; row++) {
      for (let column = -1; column < 3; column++) {
        const shade = (row * 13 + column * 7 + 28) % 19;
        context.fillStyle = `rgb(${146 + shade},${134 + shade},${116 + shade})`;
        context.fillRect(column * 128 + (row % 2) * 64 + 2, row * 64 + 2, 124, 60);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  })();
  function paving(parent, name, x, z, width, depth, top = -1.35, thickness = 0.3, finish = null) {
    const texture = (finish ? finish.map : paverTexture).clone();
    texture.repeat.set(width / 4, depth / 4);
    const material = finish ? finish.clone() : new THREE.MeshStandardMaterial({ roughness: 0.98 });
    material.map = texture;
    const mesh = box(parent, x + width / 2, top - thickness / 2, z + depth / 2, width, thickness, depth, material);
    mesh.name = name;
    mesh.userData = { x, z, widthFeet: width, depthFeet: depth, topFeet: top };
    return mesh;
  }

  function surfaceTexture(roof) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Exterior masonry and roof textures require a 2D canvas context.');
    context.fillStyle = roof ? '#70583f' : '#b9aa8e';
    context.fillRect(0, 0, 512, 512);
    let seed = roof ? 73 : 19;
    function random() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }
    const courses = roof ? 16 : 12;
    const height = 512 / courses;
    for (let row = 0; row < courses; row++) {
      let x = row % 2 ? -37 : 0;
      while (x < 512) {
        const width = roof ? 32 : 43 + Math.floor(random() * 47);
        const shade = Math.floor(random() * (roof ? 22 : 16));
        context.fillStyle = roof ? `rgb(${135 + shade},${105 + shade},${76 + shade})` : `rgb(${211 + shade},${198 + shade},${174 + shade})`;
        context.fillRect(x + 1, row * height + 1, width - 2, height - 2);
        context.fillStyle = roof ? '#ffffff0b' : '#ffffff28';
        context.fillRect(x + 2, row * height + 2, width - 4, 2);
        x += width;
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    return texture;
  }
  const stoneTexture = surfaceTexture(false);
  baseStone.map = stoneTexture;
  const roofTexture = surfaceTexture(true);
  const limestone = new THREE.MeshStandardMaterial({ map: stoneTexture, roughness: 0.95 });
  function texturedBox(parent, x, y, z, w, h, d, roof = false) {
    const material = new THREE.MeshStandardMaterial({ map: (roof ? roofTexture : stoneTexture).clone(), roughness: 0.95 });
    material.map.repeat.set((roof ? d : Math.max(w, d)) / 8, (roof ? w : h) / 8);
    return box(parent, x, y, z, w, h, d, material);
  }
  function windowUnit(parent, center, sill, width, height, privacyLowerHalf = false, picture = false) {
    const frame = new THREE.Group();
    frame.name = 'Exterior black-trimmed concept window';
    frame.userData = { exteriorTrim: 'Black', interiorTrimUnchanged: true };
    if (picture) frame.userData.operation = 'fixed picture window';
    if (privacyLowerHalf) Object.assign(frame.userData, { room: 'Powder room', privacyLowerHalf: true, privacyVerified: false });
    frame.position.set(center, sill, 0.25);
    parent.add(frame);
    if (privacyLowerHalf) {
      box(frame, 0, height / 4, 0, width, height / 2, 0.12, privacyGlass).name = 'Exterior powder frosted lower-half pane';
      box(frame, 0, height * 3 / 4, 0, width, height / 2, 0.12, glass).name = 'Exterior powder clear upper-half pane';
    } else {
      box(frame, 0, height / 2, 0, width, height, 0.12, glass);
    }
    for (const x of [-width / 2, width / 2]) box(frame, x, height / 2, 0.08, 0.16, height + 0.3, 0.16, windowBlack);
    for (const y of [0, height]) box(frame, 0, y, 0.08, width + 0.3, 0.16, 0.16, windowBlack);
    if (!privacyLowerHalf && !picture) box(frame, 0, height / 2, 0.1, 0.1, height, 0.08, windowBlack);
    box(frame, 0, -0.13, 0.05, width + 0.65, 0.22, 0.45, windowBlack);
    box(frame, 0, height + 0.2, 0.03, width + 0.65, 0.3, 0.3, windowBlack);
  }
  function wall(name, x1, z1, x2, z2, bottom, top, openings = []) {
    const wallGroup = new THREE.Group();
    wallGroup.name = `Exterior stone wall: ${name}`;
    wallGroup.position.set(x1, 0, z1);
    wallGroup.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    group.add(wallGroup);
    const length = Math.hypot(x2 - x1, z2 - z1);
    function fill(start, end, low, high) {
      if (end <= start || high <= low) return;
      const creamLow = low < 1.25 && bottom < 0 ? Math.max(low, 1.31) : low;
      if (high > creamLow) texturedBox(wallGroup, (start + end) / 2, (creamLow + high) / 2, 0, end - start, high - creamLow, wallThickness).name = 'Coursed cream limestone';
      if (low < 1.25 && bottom < 0) {
        const baseLow = low === bottom ? -1.65 : low;
        const baseHigh = Math.min(high, 1.25);
        if (baseHigh > baseLow) {
          box(wallGroup, (start + end) / 2, (baseLow + baseHigh) / 2, 0, end - start, baseHigh - baseLow, wallThickness, baseStone).name = 'Contrasting taupe-brown stone base';
          if (baseHigh === 1.25) box(wallGroup, (start + end) / 2, 1.27, 0, end - start, 0.08, wallThickness, stepStone).name = 'Stone base cap';
        }
      }
    }
    let cursor = 0;
    for (const opening of openings) {
      const { center, width, sill, height, door } = opening;
      fill(cursor, center - width / 2, bottom, top);
      fill(center - width / 2, center + width / 2, bottom, sill);
      fill(center - width / 2, center + width / 2, sill + height, top);
      if (!door) windowUnit(wallGroup, center, opening.frameSill ?? sill, opening.frameWidth ?? width, opening.frameHeight ?? height, opening.privacyLowerHalf, opening.picture);
      cursor = center + width / 2;
    }
    fill(cursor, length, bottom, top);
    return wallGroup;
  }
  const win = (center, width = 4, sill = 3, height = 5) => ({ center, width, sill, height });
  const garageSideDoorCenterZ = 45.5;
  const garageSideDoorWidth = 3;
  const garageClerestories = getGarageClerestoryLayout(garageFloorY);
  const westFrontWindowCenterZ = 49;
  const westFrontWindowWidth = 4;
  wall('front ground floor', 0, 54.2, 31.2, 54.2, -0.4, 9, [win(6, 6), { center: 15.6, width: 5, sill: 0, height: 8, door: true }, win(25, 7.6)]);
  const livingFeatureWall = getLivingRoomFeatureLayout();
  const guestEntry = getGuestEntryLayout();
  wall('west ground floor', 0, 8, 0, 54.2, -0.4, 9, [
    ...livingFeatureWall.windowCenters.map((z) => win(z - 8)),
    ...guestEntry.windows.map(({ z, width, height, sill, openingWidth, openingHeight, openingSill, privacyLowerHalf }) => ({ center: z - 8, width: openingWidth, height: openingHeight, sill: openingSill, frameWidth: width, frameHeight: height, frameSill: sill, privacyLowerHalf })),
    win(westFrontWindowCenterZ - 8, westFrontWindowWidth)
  ]);
  wall('living rear return', 13.2, 8, 0, 8, -0.4, 9, [win(1.8, 1.5), win(6.6, 5), win(11.4, 1.5)]);
  wall('dining west', 13.2, -0.1, 13.2, 8, -0.4, 9, [win(4.05, 6)]);
  wall('dining rear', 26.875, -0.1, 13.2, -0.1, -0.4, 9, [win(6.8375, 6)]);
  wall('dining patio', 26.875, 7, 26.875, -0.1, -0.4, 9, [win(3.55, 6, 0, 8)]);
  wall('kitchen and prep rear', 55.5, 7, 26.875, 7, -0.4, 9, [{ ...win(8.1, 5, 4.25, 3.5), picture: true }, win(19.75, 1.5, 53 / 12, 3.5), win(23.5, 4.5, 53 / 12, 3.5), win(27.25, 1.5, 53 / 12, 3.5)]);
  const garageSideWall = wall('east ground floor', 55.5, 49, 55.5, 7, garageFloorY - 0.3, 9, [
    { center: 49 - garageSideDoorCenterZ, width: garageSideDoorWidth, sill: garageFloorY, height: 8, door: true },
    ...garageClerestories.map(({ z, width, sill, height }) => ({ center: 49 - z, width, sill, height, picture: true })),
    win(37.45, 2, 4.25, 3.5)
  ].sort((a, b) => a.center - b.center));
  const garageSideDoor = new THREE.Group();
  garageSideDoor.name = 'Solid garage exterior pedestrian door';
  garageSideDoor.position.set(49 - garageSideDoorCenterZ, garageFloorY, 0.25);
  garageSideWall.add(garageSideDoor);
  const garageSideLeaf = new THREE.Group();
  garageSideLeaf.name = 'Garage side pedestrian door leaf';
  garageSideLeaf.position.x = 1.5;
  garageSideLeaf.userData = { interactiveHouseDoor: { operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 180, openRotationSign: -1 } };
  garageSideDoor.add(garageSideLeaf);
  box(garageSideLeaf, -1.5, 4, 0, 3, 8, 0.18, white).name = 'Opaque insulated exterior door slab';
  for (const x of [-1.58, 1.58]) box(garageSideDoor, x, 4, 0.08, 0.16, 8.16, 0.16, windowBlack);
  box(garageSideDoor, 0, 8.08, 0.08, 3.32, 0.16, 0.16, windowBlack);
  box(garageSideDoor, 0, 0.02, 0.08, 3, 0.04, 0.3, dark).name = 'Exterior door threshold';
  for (const side of [-1, 1]) {
    box(garageSideLeaf, -0.35, 3.1, side * 0.14, 0.12, 0.5, 0.08, dark).name = 'Exterior door lockset';
    box(garageSideLeaf, -0.48, 3.1, side * 0.2, 0.35, 0.08, 0.1, dark).name = 'Exterior door lever';
  }
  wall('garage front', 31.2, 49, 55.5, 49, garageFloorY - 0.3, 9, [
    { center: 5.8, width: 9, sill: garageFloorY, height: 8, door: true },
    { center: 17.3, width: 9, sill: garageFloorY, height: 8, door: true }
  ]);
  wall('garage porch return', 31.2, 54.2, 31.2, 49, -0.4, 9);
  const upper = floorToFloor;
  wall('upper front bedrooms', 0, 53.2, 31, 53.2, 9, eaves, [win(6.5, 4, upper + 3), win(24.5, 4, upper + 3)]);
  wall('upper west', 0, 7.6, 0, 53.2, 9, eaves, [win(5, 4, upper + 3), win(14, 4, upper + 3), win(22, 3, upper + 3), win(37.6, 4, upper + 3)]);
  wall('upper primary rear', 10.2, 7.6, 0, 7.6, 9, eaves);
  wall('upper bath west return', 10.2, 2.1, 10.2, 7.6, 9, eaves);
  wall('upper bath rear', 25.7, 2.1, 10.2, 2.1, 9, eaves, [win(7, 3, upper + 3)]);
  wall('upper bath east', 25.7, 10, 25.7, 2.1, 9, eaves);
  wall('upper bedroom rear', 54, 10, 25.7, 10, 9, eaves, [win(5, 2, upper + 3), win(16.5, 4, upper + 3)]);
  wall('upper east bath', 54, 15.4, 54, 10, 9, eaves);
  wall('upper closet return', 52, 15.4, 54, 15.4, 9, eaves);
  wall('upper east loft', 52, 36.2, 52, 15.4, 9, eaves, [win(8.2, 4, upper + 3), win(14.2, 4, upper + 3)]);
  wall('upper loft south', 36.5, 36.2, 52, 36.2, 9, eaves);
  wall('upper bedroom east return', 31, 53.2, 31, 36.2, 9, eaves);

  function gable(name, left, right, back, front, base, rise) {
    const roof = new THREE.Group();
    roof.name = name;
    group.add(roof);
    const center = (left + right) / 2;
    const half = (right - left) / 2;
    for (const z of [back, front]) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([left, base, z, right, base, z, center, base + rise, z], 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, half / 4, 0, half / 8, rise / 8], 2));
      geometry.computeVertexNormals();
      const faceMaterial = limestone.clone();
      faceMaterial.side = THREE.DoubleSide;
      const face = new THREE.Mesh(geometry, faceMaterial);
      face.name = 'Limestone gable end';
      roof.add(face);
    }
    const pitch = Math.atan2(rise, half);
    const overhang = 0.65;
    const slope = Math.hypot(half, rise) + overhang;
    for (const side of [-1, 1]) {
      const panel = texturedBox(roof, center + side * (half / 2 + overhang * Math.cos(pitch) / 2), base + rise / 2 - overhang * Math.sin(pitch) / 2, (back + front) / 2, slope, 0.16, front - back + 1.3, true);
      panel.name = 'Brown-shingle pitched roof';
      panel.rotation.z = -side * pitch;
      const fascia = box(roof, panel.position.x, panel.position.y - 0.09, front + 0.68, slope, 0.16, 0.18, trim);
      fascia.rotation.z = panel.rotation.z;
      box(roof, side < 0 ? left - 0.5 : right + 0.5, base - 0.35, (back + front) / 2, 0.2, 0.2, front - back + 1.3, dark).name = 'Dark eaves gutter';
    }
    box(roof, center, base + rise + 0.1, (back + front) / 2, 0.22, 0.16, front - back + 1.4, roofCap).name = 'Brown-shingle roof ridge cap';
  }
  gable('West bedroom gable', 0, 14.2, 7.6, 53.2, eaves, 8.8);
  gable('Central bedroom gable', 14.2, 31, 2.1, 53.2, eaves, 10);
  gable('Rear east-wing roof', 25.7, 54, 10, 36.2, eaves, 8);
  gable('Single-story garage roof', 31, 55.5, 36.2, 49.2, 9, 6);
  gable('Dining rear projection roof', 13.2, 26.875, -0.1, 2.1, 9, 5.5);
  const patio = new THREE.Group();
  patio.name = 'Covered kitchen-dining patio';
  const patioBounds = { left: 26.5, right: 55.5, rear: -2.1, front: 7 };
  const patioWidth = patioBounds.right - patioBounds.left;
  const patioDepth = patioBounds.front - patioBounds.rear;
  const patioCenterX = (patioBounds.left + patioBounds.right) / 2;
  const patioCenterZ = (patioBounds.rear + patioBounds.front) / 2;
  const terraceLeft = patioBounds.left + 0.25;
  const terraceFront = patioBounds.front - 0.25;
  const patioStepX = patioBounds.right - 4.5;
  const patioStepStartZ = patioBounds.rear + 3 * 1.1;
  const patioStepHalfWidth = 3.4;
  patio.userData = { x: patioBounds.left, z: patioBounds.rear, widthFeet: patioWidth, depthFeet: patioDepth, limits: patioBounds, stepsInset: true, stepCenterXFeet: patioStepX, openSides: true, doorAndWindowsUnchanged: true, roofSupportVerified: false };
  group.add(patio);
  paving(patio, 'Raised patio paver terrace', terraceLeft, patioStepStartZ, patioBounds.right - terraceLeft, terraceFront - patioStepStartZ, 0, 1.65, baseStone);
  paving(patio, 'Patio terrace west return', terraceLeft, patioBounds.rear, patioStepX - patioStepHalfWidth - terraceLeft, patioStepStartZ - patioBounds.rear, 0, 1.65, baseStone);
  paving(patio, 'Patio terrace east return', patioStepX + patioStepHalfWidth, patioBounds.rear, patioBounds.right - patioStepX - patioStepHalfWidth, patioStepStartZ - patioBounds.rear, 0, 1.65, baseStone);
  const patioRoofPitch = 3 / 16;
  const patioRoofAngle = Math.atan(patioRoofPitch);
  const patioRoofThickness = 0.18;
  const patioRoofFront = 10;
  const patioRoofCenterZ = (patioBounds.rear + patioRoofFront) / 2;
  const patioRoofY = 9.5;
  const patioRoofLength = (patioRoofFront - patioBounds.rear - patioRoofThickness * Math.sin(patioRoofAngle)) / Math.cos(patioRoofAngle);
  const patioRoof = texturedBox(patio, patioCenterX, patioRoofY, patioRoofCenterZ, patioWidth, patioRoofThickness, patioRoofLength, true);
  patioRoof.name = 'Brown-shingle covered patio roof';
  patioRoof.userData = { continuousPrepAndPatioCover: true, limits: { ...patioBounds, front: patioRoofFront }, centerHeightFeet: patioRoofY, pitch: patioRoofPitch };
  patioRoof.rotation.x = -patioRoofAngle;
  function patioRoofUndersideAt(z) {
    return patioRoofY + (z - patioRoofCenterZ) * patioRoofPitch - patioRoofThickness / (2 * Math.cos(patioRoofAngle));
  }
  wall('Patio roof raised headwall', 55.5, 7, 26.875, 7, 9, patioRoofUndersideAt(7 + wallThickness / 2) + 0.02);
  wall('Patio roof upper-wall return', 54, 10, 55.5, 10, 9, patioRoofUndersideAt(10) + 0.02);
  for (const { x, rear, name } of [
    { x: 26.875, rear: 2.75, name: 'Patio roof west tapered closure' },
    { x: 55.5, rear: 7, name: 'Patio roof east tapered closure' }
  ]) {
    const geometry = new THREE.BoxGeometry(wallThickness, 1, patioRoofFront - rear);
    const positions = geometry.attributes.position;
    const centerZ = (rear + patioRoofFront) / 2;
    for (let i = 0; i < positions.count; i++) {
      positions.setY(i, positions.getY(i) > 0 ? patioRoofUndersideAt(centerZ + positions.getZ(i)) + 0.02 - 9 : 0);
    }
    geometry.computeVertexNormals();
    const closure = new THREE.Mesh(geometry, limestone);
    closure.name = name;
    closure.position.set(x, 9, centerZ);
    group.add(closure);
  }
  for (const z of [patioBounds.rear + 0.6, patioBounds.front - 0.6]) {
    const beamTop = patioRoofUndersideAt(z);
    const middlePostX = z < patioCenterZ ? patioCenterX + 3.5 : patioCenterX;
    for (const x of [patioBounds.left + 0.6, middlePostX, patioBounds.right - 0.6]) {
      box(patio, x, (beamTop - 0.32) / 2, z, 0.45, beamTop - 0.32, 0.45, wood).name = 'Patio timber support post';
      box(patio, x, 0.6, z, 0.7, 1.2, 0.7, baseStone).name = 'Patio post stone foot';
    }
    box(patio, patioCenterX, beamTop - 0.16, z, patioWidth - 0.75, 0.32, 0.3, wood).name = 'Patio perimeter beam';
  }
  const patioTableX = patioCenterX - 3.5;
  const patioTableZ = patioCenterZ + 1;
  box(patio, patioTableX, 2.4, patioTableZ, 3, 0.2, 5, wood).name = 'Outdoor dining table';
  for (const x of [patioTableX - 1, patioTableX + 1]) for (const z of [patioTableZ - 2, patioTableZ + 2]) box(patio, x, 1.15, z, 0.12, 2.3, 0.12, dark).name = 'Outdoor table leg';
  for (const x of [patioTableX - 2.2, patioTableX + 2.2]) for (const z of [patioTableZ - 1.6, patioTableZ + 1.6]) {
    box(patio, x, 1.4, z, 1.7, 0.18, 1.7, white).name = 'Outdoor dining chair';
    box(patio, x + (x < patioTableX ? -0.75 : 0.75), 2.05, z, 0.12, 1.2, 1.7, wood).name = 'Outdoor dining chair back';
    for (const side of [-0.65, 0.65]) box(patio, x, 0.65, z + side, 1.4, 1.3, 0.1, dark).name = 'Outdoor dining chair side frame';
  }
  const portableFirepit = new THREE.Group();
  portableFirepit.name = 'Portable firepit - rear-yard cold storage only';
  portableFirepit.position.set(40, -1.6, -15);
  portableFirepit.userData = { diameterInches: 30.72, heightInches: 19.56, provisional: true, modelSelected: false, fuel: 'Wood assumed; model unconfirmed', coldStorageOnly: true, operationApproved: false, useClearanceSatisfied: false, localPortableClearanceFeet: 15, instruction: 'Requested rear-yard location is for fully extinguished, cold storage only. It does not meet the checked Birmingham operating clearances between the house/patio and cedar fence. Do not light here or under the patio roof. No approved burn location is established; confirm the actual unit and site with the Fire Department.' };
  group.add(portableFirepit);
  box(group, 40, -1.635, -15, 4, 0.06, 4, stepStone).name = 'Rear firepit cold-storage pad, not a burn area';
  const firepitBody = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1, 1.1, 32, 1, true), dark);
  firepitBody.name = 'Unlit portable firepit open bowl';
  firepitBody.position.y = 0.9;
  portableFirepit.add(firepitBody);
  const firepitGrate = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.04, 24), dark);
  firepitGrate.name = 'Empty firepit grate, no fire shown';
  firepitGrate.position.y = 0.38;
  portableFirepit.add(firepitGrate);
  const firepitLid = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.28, 0.08, 32), dark);
  firepitLid.name = 'Portable firepit closed cold-storage lid';
  firepitLid.position.y = 1.49;
  portableFirepit.add(firepitLid);
  box(portableFirepit, 0, 1.58, 0, 0.35, 0.1, 0.12, dark).name = 'Firepit lid handle';
  for (const x of [-0.7, 0.7]) for (const z of [-0.7, 0.7]) box(portableFirepit, x, 0.175, z, 0.12, 0.35, 0.12, dark).name = 'Portable firepit foot';
  const firewoodRack = new THREE.Group();
  firewoodRack.name = 'Side-yard firewood rack beside waste bins - clearance review required';
  firewoodRack.position.set(56.65, -1.35, 22);
  firewoodRack.userData = { widthFeet: 8, depthFeet: 16 / 12, stackHeightFeet: 4, raisedBaseFeet: 0.5, openSides: true, topCovered: true, location: 'Along the garage wall immediately north of the waste-bin storage', requestedStorageLocation: true, houseSeparationApproved: false, localStorageApprovalRequired: true, maximumLogLengthInches: 16, neighboringHazardsVerified: false, provisional: true, instruction: 'Requested storage position only, not fire-safety approval. Wood is close to the house and does not meet the preferred 30-foot woodpile separation. Verify fire/pest/moisture risk, local rules, actual logs, cart-lid travel and passage before construction.' };
  group.add(firewoodRack);
  box(group, (55.825 + 56.645) / 2, -1.5, 22, 56.645 - 55.825, 0.3, 8.5, stepStone).name = 'Firewood rack infill pad beside existing walkway';
  for (const x of [-0.606, 0.606]) for (const z of [-3.94, 3.94]) box(firewoodRack, x, 2.1, z, 0.12, 4.2, 0.12, dark).name = 'Firewood rack upright';
  box(firewoodRack, 0, 0.45, 0, 16 / 12, 0.1, 8, dark).name = 'Firewood rack raised ventilated base';
  box(firewoodRack, 0, 4.25, 0, 1.5, 0.1, 8.2, dark).name = 'Firewood rack rain cover, open sides';
  for (let row = 0; row < 7; row++) for (let log = 0; log < 16; log++) {
    const splitLog = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.19, 16 / 12, 7), wood);
    splitLog.name = 'Seasoned firewood placeholder';
    splitLog.rotation.z = Math.PI / 2;
    splitLog.position.set(0, 0.72 + row * 0.43, -3.5 + log * 0.46);
    firewoodRack.add(splitLog);
  }

  function exteriorSteps(parent, name, x, startZ, direction, width) {
    const steps = new THREE.Group();
    steps.name = name;
    steps.userData = { risers: 3, riseFeet: 0.45, goingFeet: 1.1, contrastNosing: true, provisional: true };
    parent.add(steps);
    for (let step = 0; step < 3; step++) {
      const top = -(step + 1) * 0.45;
      const z = startZ + direction * (step * 1.1 + 0.55);
      box(steps, x, (top - 1.65) / 2, z, width + step * 0.4, top + 1.65, 1.1, stepStone).name = 'Darker stone entry tread';
      box(steps, x, top + 0.025, z + direction * 0.48, width + step * 0.4, 0.05, 0.14, stepEdge).name = 'Contrasting step nosing';
      box(steps, x, -step * 0.45 - 0.16, startZ + direction * (step * 1.1 + 0.015), 0.6, 0.08, 0.03, glow).name = 'Shielded warm step marker';
    }
  }
  exteriorSteps(patio, 'Patio garden steps', patioStepX, patioStepStartZ, -1, 6);
  paving(group, 'Covered front porch', 0, 54.2, 31.2, 7, 0, 1.65);
  const porchPillars = [];
  for (const [index, x] of [1, 11.9, 19.3, 30.2].entries()) {
    const entryColumn = index === 1 || index === 2;
    const height = entryColumn ? 8 : 8.4;
    const pillar = texturedBox(group, x, height / 2, 60.5, 0.65, height, 0.65);
    pillar.name = 'Limestone porch column';
    pillar.userData = { entryColumn, widthInches: 7.8, heightFeet: height, provisional: true };
    porchPillars.push(pillar);
    box(group, x, 0.5, 60.5, 0.95, 1, 0.95, baseStone).name = 'Porch column stone foot';
    if (!entryColumn) box(group, x, 8.25, 60.5, 0.95, 0.3, 0.95, trim).name = 'Outer porch column cap';
  }
  const entryHeader = box(group, 15.6, 8.25, 60.5, 8.2, 0.5, 0.65, trim);
  entryHeader.name = 'Single entry portico header';
  entryHeader.userData = { clearOpeningWidthFeet: 6.75, undersideFeet: 8, structuralDesignVerified: false };
  const porchRoof = texturedBox(group, 15.6, 9.1, 57.5, 32.5, 0.18, 9.5, true);
  porchRoof.name = 'Brown-shingle porch canopy';
  porchRoof.rotation.x = 0.22;
  gable('Entry porch gable', 11.5, 19.7, 54.4, 61.7, 8.5, 4);
  for (const side of [-1, 1]) {
    const leaf = new THREE.Group();
    leaf.name = `Exterior front entry ${side < 0 ? 'left' : 'right'} door leaf`;
    leaf.position.set(15.6 + side * 2.455, 0, 54.48);
    leaf.userData = { interactiveHouseDoor: { operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 180, openRotationSign: -side } };
    group.add(leaf);
    box(leaf, -side * 1.215, 4, 0, 2.43, 7.96, 0.2, wood).name = 'Warm oak double entry door';
    for (const y of [2, 5.8]) box(leaf, -side * 1.215, y, 0.13, 1.85, 3.1, 0.07, wood).name = 'Raised oak door panel';
    box(leaf, -side * 2.255, 3.1, 0.26, 0.07, 0.7, 0.1, dark).name = 'Entry pull';
  }
  for (const center of [37, 48.5]) {
    const assembly = new THREE.Group();
    assembly.name = 'Cream garage door with contrasting surround';
    assembly.position.set(center, garageFloorY, 49);
    assembly.userData = { openingWidthFeet: 9, openingHeightFeet: 8, doorColor: '#e6d7b9', surroundColor: '#a18d70', sideTrimInches: 6, headerTrimInches: 8, trimDepthInches: 3, provisional: true };
    group.add(assembly);
    const garageLeaf = new THREE.Group();
    garageLeaf.name = 'Conceptual overhead garage door leaf';
    garageLeaf.position.set(0, 8, 0.28);
    garageLeaf.userData = { interactiveHouseDoor: { operation: 'overhead', open: false, maxAngleDegrees: 90 } };
    assembly.add(garageLeaf);
    box(garageLeaf, 0, -4, 0, 9, 8, 0.16, garageDoorFinish).name = 'Cream carriage-style garage door';
    for (let panel = 0; panel < 6; panel++) box(garageLeaf, -3.75 + panel * 1.5, -5, 0.11, 0.06, 5.6, 0.05, garageDoorDetail).name = 'Cream garage door panel detail';
    for (const offset of [-3, -1, 1, 3]) box(garageLeaf, offset, -1.2, 0.13, 1.6, 1, 0.05, glass).name = 'Garage door glazing';
    for (const side of [-1, 1]) {
      box(garageLeaf, side * 0.25, -4.4, 0.17, 0.06, 0.6, 0.08, dark).name = 'Garage door dark handle';
      box(assembly, side * 4.75, 4, 0.35, 0.5, 8, 0.25, garageSurround).name = 'Garage door six-inch side surround';
    }
    box(assembly, 0, 8 + 1 / 3, 0.35, 10, 2 / 3, 0.25, garageSurround).name = 'Garage door eight-inch header surround';
    box(assembly, 0, 8 + 2 / 3 + 0.06, 0.415, 10.25, 0.12, 0.38, garageSurround).name = 'Garage door projecting trim cap';
  }
  function lantern(parent, x, y, z) {
    const fixture = new THREE.Group();
    fixture.name = parent === group ? 'Garage wall lantern' : 'Porch pillar lantern';
    fixture.position.set(x, y, z);
    parent.add(fixture);
    box(fixture, 0, 0, 0, 0.32, 0.8, 0.25, glow).name = 'Warm exterior lantern';
    for (const side of [-1, 1]) box(fixture, side * 0.19, 0, 0.04, 0.04, 0.9, 0.3, dark);
    for (const dy of [-0.48, 0.48]) box(fixture, 0, dy, 0, 0.48, 0.1, 0.4, dark);
    const light = new THREE.PointLight('#ffcf8c', 15, 7, 2);
    light.position.set(0, 0, 0.4);
    fixture.add(light);
  }
  for (const pillar of porchPillars.filter((column) => column.userData.entryColumn)) lantern(pillar, 0, 5.8 - pillar.position.y, 0.45);
  for (const x of [37, 48.5]) lantern(group, x, 8.7, 49.7);
  exteriorSteps(group, 'Contrasting front entry steps', 15.6, 61.2, 1, 9);
  box(group, lot.centerX, -1.8, (lot.rear + lot.front) / 2, lot.widthFeet, 0.35, lot.depthFeet, mat('#83936b')).name = '75 by 130 ft lot lawn, not surveyed grade';
  const driveway = new THREE.Group();
  driveway.name = 'Garage driveway concept';
  group.add(driveway);
  const drivewayMaterial = mat('#c6c0ae');
  const drivewayLeft = 30.9;
  const drivewayWidth = 25;
  box(driveway, drivewayLeft + drivewayWidth / 2, garageFloorY - 0.18, (49 + lot.front) / 2, drivewayWidth, 0.16, lot.front - 49, drivewayMaterial).name = 'Continuous garage driveway and pedestrian crossing';
  const paths = new THREE.Group();
  paths.name = 'Fence-edge perimeter walkway';
  const fenceLeft = lot.left + fenceBoundaryInset, fenceRight = lot.right - fenceBoundaryInset, fenceRear = lot.rear + fenceBoundaryInset;
  const westFenceReturnZ = westFrontWindowCenterZ - westFrontWindowWidth / 2 - 2;
  const eastFenceReturnZ = garageSideDoorCenterZ - garageSideDoorWidth / 2 - 3;
  const fencePaverGap = 0.75;
  const westPaverEdgeX = fenceLeft + fencePaverGap, eastPaverEdgeX = fenceRight - fencePaverGap;
  const pathWidth = 3.5;
  const westGateCenterX = westPaverEdgeX + pathWidth / 2;
  const rearPaverEdgeZ = fenceRear + fencePaverGap;
  paths.userData = { minimumWidthFeet: pathWidth, fenceCenterlineGapFeet: fencePaverGap, placement: 'Inside rear and side fences; lawn toward house except access connectors', surface: 'Warm gray-brown paver stone', provisional: true };
  group.add(paths);
  const eastGateApproachZ = eastFenceReturnZ - fencePaverGap - pathWidth;
  const pathAreas = [];
  function addWalk(name, x, z, width, depth) {
    let pieces = [{ x, z, width, depth }];
    // Join access strips without layering paver meshes at corners and junctions.
    for (const occupied of pathAreas) {
      pieces = pieces.flatMap((area) => {
        const left = Math.max(area.x, occupied.x), right = Math.min(area.x + area.width, occupied.x + occupied.width);
        const rear = Math.max(area.z, occupied.z), front = Math.min(area.z + area.depth, occupied.z + occupied.depth);
        if (right <= left || front <= rear) return [area];
        return [
          { x: area.x, z: area.z, width: left - area.x, depth: area.depth },
          { x: right, z: area.z, width: area.x + area.width - right, depth: area.depth },
          { x: left, z: area.z, width: right - left, depth: rear - area.z },
          { x: left, z: front, width: right - left, depth: area.z + area.depth - front }
        ].filter((piece) => piece.width > 0.0001 && piece.depth > 0.0001);
      });
    }
    for (const piece of pieces) {
      pathAreas.push(piece);
      paving(paths, name, piece.x, piece.z, piece.width, piece.depth);
    }
  }
  addWalk('Rear fence-edge walkway', westPaverEdgeX, rearPaverEdgeZ, eastPaverEdgeX - westPaverEdgeX, pathWidth);
  addWalk('West fence-edge walkway', westPaverEdgeX, rearPaverEdgeZ, pathWidth, westFenceReturnZ - fencePaverGap - rearPaverEdgeZ);
  addWalk('East fence-edge walkway', eastPaverEdgeX - pathWidth, rearPaverEdgeZ, pathWidth, eastFenceReturnZ - fencePaverGap - rearPaverEdgeZ);
  addWalk('East gate connector', 56.5, eastGateApproachZ, eastPaverEdgeX - 56.5, pathWidth);
  addWalk('West gate to front approach', westPaverEdgeX, westFenceReturnZ - fencePaverGap, pathWidth, 68 - westFenceReturnZ + fencePaverGap);
  const garageApproachFrontZ = 49 + pathWidth;
  addWalk('East gate to garage side door', 56.5, eastGateApproachZ, pathWidth, garageApproachFrontZ - eastGateApproachZ);
  addWalk('Garage side door threshold connector', 55.725, garageSideDoorCenterZ - garageSideDoorWidth / 2, 56.5 - 55.725, garageSideDoorWidth);
  addWalk('Garage driveway to side path connector', drivewayLeft + drivewayWidth, 49, 56.5 - drivewayLeft - drivewayWidth, pathWidth);
  addWalk('Front paver walk west of driveway', westPaverEdgeX, 64.5, drivewayLeft - westPaverEdgeX, pathWidth);
  addWalk('East fence walkway to patio steps', patioStepX - pathWidth / 2, patioBounds.rear - pathWidth, eastPaverEdgeX - patioStepX + pathWidth / 2, pathWidth);
  const cartWidth = 28 / 12, cartDepth = 32 / 12, cartWallGap = 1 / 12;
  const cartOuterX = eastWallFaceX + cartWallGap + cartWidth;
  addWalk('City collection cart storage pad', eastWallFaceX, 27.4, cartWidth + 2 * cartWallGap, 6.7);
  const trashCans = new THREE.Group();
  trashCans.name = 'Recycling and garbage city collection carts';
  trashCans.userData = { count: 2, widthInches: 28, depthInches: 32, heightInches: 44, productSelected: false, fullSizeCurbsideBins: true, storageOnly: true, clearToFenceFeet: lot.eastFenceClearanceFeet - cartWallGap - cartWidth };
  paths.userData.minimumClearWidthFeet = eastPaverEdgeX - cartOuterX;
  paths.userData.clearWidthLimitation = 'Full-size collection carts narrow the paved passage locally; not a verified accessible route';
  group.add(trashCans);
  const trashWheel = mat('#222522', 0.96);
  for (const { stream, z, color, lidColor } of [
    { stream: 'Recycling', z: 29, color: '#2e6284', lidColor: '#234961' },
    { stream: 'Garbage', z: 32.5, color: '#42473f', lidColor: '#292f29' }
  ]) {
    const trashBody = mat(color, 0.9);
    const trashLid = mat(lidColor, 0.88);
    const can = new THREE.Group();
    can.name = `${stream} curbside collection cart`;
    can.position.set(eastWallFaceX + cartWallGap + cartWidth / 2, -1.35, z);
    can.userData = { wasteStream: stream, widthFeet: cartWidth, depthFeet: cartDepth, heightFeet: 44 / 12, lidClosed: true, rollDirection: 'Along the wall toward the garage-side gate and driveway' };
    trashCans.add(can);
    const bodyGeometry = new THREE.CylinderGeometry(1, 0.82, 3, 4);
    bodyGeometry.rotateY(Math.PI / 4);
    const body = new THREE.Mesh(bodyGeometry, trashBody);
    body.name = 'Tapered full-size collection cart body';
    body.scale.set(2.1 / Math.SQRT2, 1, 2.45 / Math.SQRT2);
    body.position.y = 1.85;
    can.add(body);
    box(can, 0, 3.4, 0, cartWidth, 0.16, cartDepth, trashLid).name = 'Closed hinged collection cart lid';
    box(can, 0, 3.6, -1.15, 1.4, 2 / 15, 0.12, trashLid).name = 'Collection cart pull handle';
    for (const side of [-1, 1]) {
      box(can, side * 0.65, 3.4, -1.15, 0.1, 0.4, 0.12, trashLid);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 16), trashWheel);
      wheel.name = 'Large curbside cart wheel';
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 1.08, 0.34, -0.85);
      can.add(wheel);
    }
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512;
    labelCanvas.height = 192;
    const labelContext = labelCanvas.getContext('2d');
    if (!labelContext) throw new Error('Collection cart labels require a 2D canvas context.');
    labelContext.fillStyle = '#edece3';
    labelContext.fillRect(0, 0, 512, 192);
    labelContext.fillStyle = '#25342c';
    labelContext.font = 'bold 64px sans-serif';
    labelContext.textAlign = 'center';
    labelContext.textBaseline = 'middle';
    labelContext.fillText(stream.toUpperCase(), 256, 96, 480);
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    labelTexture.colorSpace = THREE.SRGBColorSpace;
    const cartLabel = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.5), new THREE.MeshStandardMaterial({ map: labelTexture, roughness: 0.95 }));
    cartLabel.name = `${stream} identification label`;
    cartLabel.position.set(0, 2.1, 1.24);
    can.add(cartLabel);
  }
  const fence = new THREE.Group();
  fence.name = 'Cedar rear and side privacy fence';
  fence.userData = { heightFeet: 6, boundaryInsetFeet: 0.5, gateWidthFeet: 4, westReturnZFeet: westFenceReturnZ, eastReturnZFeet: eastFenceReturnZ, frontYardOpen: true, ordinanceVerified: false };
  group.add(fence);
  const cedar = mat('#976f4d');
  function fenceRun(name, x1, z1, x2, z2, gate = false) {
    const run = new THREE.Group();
    run.name = name;
    run.position.set(x1, 0, z1);
    run.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    const length = Math.hypot(x2 - x1, z2 - z1);
    run.userData = { lengthFeet: length, gate };
    fence.add(run);
    const count = Math.ceil(length / 0.5);
    const boards = new THREE.InstancedMesh(new THREE.BoxGeometry(length / count - 0.025, 6, 0.1), cedar, count);
    boards.name = 'Vertical cedar fence boards';
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      matrix.makeTranslation((i + 0.5) * length / count, 1.375, 0);
      boards.setMatrixAt(i, matrix);
    }
    boards.instanceMatrix.needsUpdate = true;
    run.add(boards);
    for (const y of [-0.65, 3.5]) box(run, length / 2, y, fenceRailOffset, length, 0.14, fenceRailDepth, cedar);
    const posts = Math.ceil(length / 6);
    for (let i = 0; i <= posts; i++) box(run, i * length / posts, 1.5, 0, 0.25, 6.25, 0.25, cedar).name = 'Cedar fence post';
    if (gate) box(run, length - 0.3, 1.2, -0.14, 0.1, 0.5, 0.12, dark).name = 'Side gate latch';
  }
  fenceRun('Rear boundary fence', fenceLeft, fenceRear, fenceRight, fenceRear);
  fenceRun('West side fence', fenceLeft, fenceRear, fenceLeft, westFenceReturnZ);
  fenceRun('East side fence', fenceRight, fenceRear, fenceRight, eastFenceReturnZ);
  fenceRun('West fence return', fenceLeft, westFenceReturnZ, westGateCenterX - 2, westFenceReturnZ);
  fenceRun('West 4 ft pedestrian gate', westGateCenterX - 2, westFenceReturnZ, westGateCenterX + 2, westFenceReturnZ, true);
  fenceRun('West wall connection', westGateCenterX + 2, westFenceReturnZ, -0.225, westFenceReturnZ);
  fenceRun('East wall connection', 55.725, eastFenceReturnZ, 56.25, eastFenceReturnZ);
  fenceRun('East 4 ft pedestrian gate', 56.25, eastFenceReturnZ, 60.25, eastFenceReturnZ, true);
  fenceRun('East fence return', 60.25, eastFenceReturnZ, fenceRight, eastFenceReturnZ);
  const boundaryMaterial = new THREE.LineBasicMaterial({ color: '#4c5343' });
  const boundary = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(lot.left, -1.1, lot.rear), new THREE.Vector3(lot.right, -1.1, lot.rear),
    new THREE.Vector3(lot.right, -1.1, lot.front), new THREE.Vector3(lot.left, -1.1, lot.front)
  ]), boundaryMaterial);
  boundary.name = '75 by 130 ft property boundary';
  group.add(boundary);
  const annotations = new THREE.Group();
  annotations.name = 'Lot plan annotations';
  annotations.visible = false;
  group.add(annotations);
  function label(text, x, z, width = 28, parent = annotations) {
    const canvas = document.createElement('canvas');
    canvas.width = text.length <= 3 ? 128 : 768;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Lot dimension labels require a 2D canvas context.');
    context.fillStyle = '#f6f3e9';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#304237';
    context.font = 'bold 64px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 32);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
    sprite.name = text;
    sprite.position.set(x, 1, z);
    sprite.scale.set(width, width * canvas.height / canvas.width, 1);
    parent.add(sprite);
  }
  const dimension = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-5, -1, lot.rear), new THREE.Vector3(-5, -1, lot.rearWallZ),
    new THREE.Vector3(-7, -1, lot.rear), new THREE.Vector3(-3, -1, lot.rear),
    new THREE.Vector3(-7, -1, lot.rearWallZ), new THREE.Vector3(-3, -1, lot.rearWallZ),
    new THREE.Vector3(-5, -1, lot.rearWallZ), new THREE.Vector3(13.2, -1, lot.rearWallZ)
  ]), boundaryMaterial);
  dimension.name = '32 ft dining rear-wall setback dimension';
  annotations.add(dimension);
  label('REAR / BACK', lot.centerX, lot.rear - 5, 22);
  label('75 ft lot width', lot.centerX, lot.front + 5);
  label('130 ft lot depth', lot.right + 9, 66, 30);
  label('32 ft dining rear wall setback', lot.centerX, lot.rear + 16, 36);
  label('FRONT / STREET', lot.centerX, lot.front - 5);
  const lighting = new THREE.Group();
  lighting.name = 'Outdoor lighting additions';
  lighting.userData = { colorTemperatureKelvin: 2700, shielded: true, photometryVerified: false, controls: 'Dimmable patio; motion-boost drive and side access; no path-post lights' };
  group.add(lighting);
  function downlight(name, x, y, z, targetX = x, targetZ = z, intensity = 22) {
    const fixture = new THREE.Group();
    fixture.name = name;
    fixture.position.set(x, y, z);
    lighting.add(fixture);
    box(fixture, 0, 0, 0, 0.3, 0.15, 0.3, dark);
    box(fixture, 0, -0.09, 0, 0.2, 0.025, 0.2, glow);
    const light = new THREE.SpotLight('#ffd09a', intensity, 16, Math.PI / 3.2, 0.65, 2);
    light.position.set(x, y - 0.15, z);
    light.target.position.set(targetX, -1.35, targetZ);
    lighting.add(light, light.target);
  }
  for (const x of [patioCenterX - 5, patioCenterX + 5]) downlight('Shielded warm patio ceiling light', x, patioRoofUndersideAt(patioCenterZ) - 0.075, patioCenterZ);
  downlight('Driveway motion-boost downlight', 43, 8.6, 49.6, 43, 58, 32);
  downlight('West side-entry downlight', -0.6, 7, 42, westGateCenterX, westFenceReturnZ);
  downlight('East side-entry downlight', 56, 7, garageSideDoorCenterZ, 58.25, eastFenceReturnZ);
  const cameras = new THREE.Group();
  cameras.name = 'Outdoor camera placements';
  cameras.userData = { connection: 'Home-run exterior-rated CAT6 PoE to NVR', privacyMasksRequired: true, coverageVerified: false };
  group.add(cameras);
  const securityPlan = new THREE.Group();
  securityPlan.name = 'Security plan annotations';
  securityPlan.visible = false;
  group.add(securityPlan);
  const cameraSchedule = [
    { id: 'C1', purpose: 'Front door visitor identification', position: [18.5, 4.2, 54.65], aim: [15.6, 61], doorbell: true },
    { id: 'C2', purpose: 'Garage doors and own driveway', position: [43, 7.8, 49.6], aim: [43, 80] },
    { id: 'C3', purpose: 'Covered patio and dining access', position: [patioCenterX, 8.5, 6.05], aim: [28, 0] },
    { id: 'C4', purpose: 'Rear lawn and rear fence approach', position: [patioBounds.left + 0.6, 7.8, patioBounds.rear + 0.35], aim: [22, -23] },
    { id: 'C5', purpose: 'West side path and gate', position: [-0.55, 7.5, 9], aim: [westGateCenterX, westFenceReturnZ] },
    { id: 'C6', purpose: 'East side access and gate', position: [56, 7.5, 15], aim: [58.25, eastFenceReturnZ] }
  ];
  cameras.userData.schedule = cameraSchedule;
  for (const camera of cameraSchedule) {
    const unit = new THREE.Group();
    unit.name = `${camera.id}: ${camera.purpose}`;
    unit.position.set(...camera.position);
    unit.userData = { ...camera, privacyMask: 'Exclude neighboring windows/yards and public areas; do not aim through house glazing', fieldOfViewVerified: false };
    cameras.add(unit);
    if (camera.doorbell) {
      box(unit, 0, 0, 0, 0.18, 0.4, 0.1, dark);
      box(unit, 0, 0.1, 0.06, 0.11, 0.1, 0.04, windowBlack);
    } else {
      box(unit, 0, 0, -0.14, 0.3, 0.3, 0.1, dark);
      box(unit, 0, 0, 0.1, 0.3, 0.28, 0.55, white).name = 'PoE camera housing';
      box(unit, 0, 0, 0.39, 0.2, 0.18, 0.025, windowBlack).name = 'Camera lens';
    }
    unit.lookAt(new THREE.Vector3(camera.aim[0], 1.5, camera.aim[1]));
    const start = new THREE.Vector3(camera.position[0], 0, camera.position[2]);
    const direction = new THREE.Vector3(camera.aim[0], 0, camera.aim[1]).sub(start);
    const arrow = new THREE.ArrowHelper(direction.clone().normalize(), start, direction.length(), '#37685e', 2, 1.1);
    arrow.name = `${camera.id} intended viewing direction, not verified coverage`;
    for (const part of [arrow.line, arrow.cone]) {
      part.material.depthTest = false;
      part.renderOrder = 5;
    }
    securityPlan.add(arrow);
    label(camera.id, camera.position[0] + (camera.id === 'C5' ? -3 : 3), camera.position[2] - 2, 6, securityPlan);
  }
  const mulch = mat('#65452f', 0.98);
  const foliage = mat('#4c6240');
  const frontShrubRadius = 0.9;
  const frontShrubCount = 6;
  for (const [name, left, right] of [['West front porch mulch bed', 0, 10.7], ['East front porch mulch bed', 20.5, drivewayLeft]]) {
    const bed = box(group, (left + right) / 2, -1.65, (61.2 + 64.5) / 2, right - left, 0.1, 64.5 - 61.2, mulch);
    bed.name = name;
    bed.userData = { surface: 'Brown mulch / soil planting bed', limits: { left, right, rear: 61.2, front: 64.5 }, topFeet: -1.6 };
    const edgeInset = frontShrubRadius + 0.2;
    for (let index = 0; index < frontShrubCount; index++) {
      const shrub = new THREE.Mesh(new THREE.SphereGeometry(frontShrubRadius, 10, 8), foliage);
      shrub.name = 'Front mulch-bed shrub';
      shrub.position.set(left + edgeInset + index * (right - left - 2 * edgeInset) / (frontShrubCount - 1), bed.userData.topFeet + frontShrubRadius, bed.position.z);
      shrub.userData = { plantingBed: name, baseFeet: bed.userData.topFeet, provisional: true };
      group.add(shrub);
    }
  }
  for (const [start, end, z] of [[32, 54, 8]]) {
    for (let x = start; x <= end; x += 1.7) {
      const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 7), foliage);
      shrub.name = 'Concept foundation planting';
      shrub.position.set(x, -0.05, z);
      group.add(shrub);
    }
  }
  return group;
}
