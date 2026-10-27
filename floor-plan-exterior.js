// Display-calibrated albedo, not a physical brick/product color specification.
// Keep this conversion on diffuse bytes only; normals/roughness are independent.
function gradeExteriorBrickPixels(data, redBase = false) {
  for (let i = 0; i < data.length; i += 4) {
    const luminance = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (redBase) {
      // Source scan has pale low-chroma mortar; retain it, not red joints.
      const mortar = Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]) < 24 && luminance > 115;
      data[i] = mortar ? 164 + luminance * 0.18 : 92 + luminance * 0.48;
      data[i + 1] = mortar ? 158 + luminance * 0.18 : 38 + luminance * 0.34;
      data[i + 2] = mortar ? 145 + luminance * 0.18 : 26 + luminance * 0.27;
    } else {
      // Remove ALL source chroma, not just its average: red photograph tails
      // must not survive as peach faces. Small yellow-axis bias, near-zero a*.
      const value = Math.min(246, 194 + luminance * 0.265);
      data[i] = value + 4;
      data[i + 1] = value + 3;
      data[i + 2] = value - 2;
    }
  }
  return data;
}

// Physical per-face projection: narrow column returns must not stretch a full
// front-face repeat. Scan contains five 8-inch modules and fourteen 3.125-inch courses.
function mapBrickBoxUVs(geometry, widthFeet, heightFeet) {
  const p = geometry.attributes.position, n = geometry.attributes.normal, uv = geometry.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    uv.setXY(i, (Math.abs(n.getX(i)) > 0.5 ? p.getZ(i) : p.getX(i)) / widthFeet,
      (Math.abs(n.getY(i)) > 0.5 ? p.getZ(i) : p.getY(i)) / heightFeet);
  }
  uv.needsUpdate = true;
}

function buildExteriorModel(THREE, { box, mat, masonryMaps, windowInstallations = [] }, floorToFloor, garageFloorY) {
  const group = new THREE.Group();
  group.name = 'Hipped cream-brick transitional exterior concept';
  group.visible = false;
  group.userData = { provisional: true, style: 'Restrained transitional warm-white brick house with red-brown brick base, quiet hipped roofs, white eaves and natural oak doors', floorToFloorFeet: floorToFloor, coordinatedConstructionDrawings: false, frontElevationStudy: true, frontOpeningsCoordinatedWithInteriors: true, garageUpperVolume: 'Unoccupied roof void only; no room, storage or access approval', wallCladding: 'Neutral warm-white queen brick veneer with red-brown brick base; physical samples, support and wall assembly require design' };
  const wallThickness = 0.45;
  const fenceBoundaryInset = 0.5, fenceRailOffset = 0.1, fenceRailDepth = 0.14;
  const eastWallFaceX = 55.5 + wallThickness / 2;
  const lot = { widthFeet: 75, depthFeet: 130, rearSetbackFeet: 32, eastFenceClearanceFeet: 6, rearWallZ: -0.1 - wallThickness / 2 };
  // Owner clearance: finished garage wall to nearest inward fence rail face,
  // not the fence centerline or a surveyed/legal property-line setback.
  // Coordinates stay house-local; offset the parcel to reposition the house within it.
  lot.right = eastWallFaceX + lot.eastFenceClearanceFeet + fenceRailOffset + fenceRailDepth / 2 + fenceBoundaryInset;
  lot.left = lot.right - lot.widthFeet;
  lot.centerX = (lot.left + lot.right) / 2;
  lot.rear = lot.rearWallZ - lot.rearSetbackFeet;
  lot.front = lot.rear + lot.depthFeet;
  group.userData.lot = lot;
  const fenceLeft = lot.left + fenceBoundaryInset, fenceRight = lot.right - fenceBoundaryInset, fenceRear = lot.rear + fenceBoundaryInset;
  const fencePaverGap = 0.75;
  const pathWidth = 3.5;
  const westPaverEdgeX = fenceLeft + fencePaverGap, eastPaverEdgeX = fenceRight - fencePaverGap;
  const eaves = floorToFloor + 9;
  const trim = mat('#f5f2ea');
  const white = mat('#f3eddf');
  const garageDoorFinish = mat('#c6a274');
  garageDoorFinish.name = 'Natural oak carriage garage door - screen approximation';
  const garageDoorDetail = mat('#98784e');
  garageDoorDetail.name = 'Natural wood garage door panel detail - screen approximation';
  const garageSurround = mat('#f5f2ea');
  garageSurround.name = 'Pale limestone garage opening surround - screen approximation';
  const dark = mat('#393b38', 0.65);
  const windowBlack = mat('#202321');
  const wood = mat('#956c3e');
  const entryWood = mat('#c99f6b');
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
    const moduleFeet = 4;
    texture.repeat.set(width / moduleFeet, depth / moduleFeet);
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
    context.fillStyle = roof ? '#625f57' : '#b9aa8e';
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
        context.fillStyle = roof ? `rgb(${116 + shade},${112 + shade},${102 + shade})` : `rgb(${211 + shade},${198 + shade},${174 + shade})`;
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
  // Retain the previous quiet sand paving, separate from wall-brick grading.
  const pavingCanvas = document.createElement('canvas');
  pavingCanvas.width = pavingCanvas.height = 512;
  const pavingPaint = pavingCanvas.getContext('2d');
  pavingPaint.drawImage(stoneTexture.image, 0, 0);
  const pavingPixels = pavingPaint.getImageData(0, 0, 512, 512);
  for (let i = 0; i < pavingPixels.data.length; i += 4) {
    const l = (pavingPixels.data[i] + pavingPixels.data[i + 1] + pavingPixels.data[i + 2]) / 3;
    pavingPixels.data[i] = 153 + l * 0.19;
    pavingPixels.data[i + 1] = 148 + l * 0.19;
    pavingPixels.data[i + 2] = 133 + l * 0.19;
  }
  pavingPaint.putImageData(pavingPixels, 0, 0);
  const palePavingMap = new THREE.CanvasTexture(pavingCanvas);
  palePavingMap.colorSpace = THREE.SRGBColorSpace;
  palePavingMap.wrapS = palePavingMap.wrapT = THREE.RepeatWrapping;
  const palePaving = new THREE.MeshStandardMaterial({ color: '#ffffff', map: palePavingMap, bumpMap: stoneTexture, bumpScale: 0.018, roughness: 0.95 });
  palePaving.name = 'Pale sand stone paving concept - exterior performance unverified';
  const accentStone = new THREE.MeshStandardMaterial({ color: '#eee3ce', map: stoneTexture, bumpMap: stoneTexture, bumpScale: 0.035, roughness: 0.95 });
  if (masonryMaps) {
    for (const material of [accentStone, garageSurround]) {
      Object.assign(material, masonryMaps.stone);
      material.bumpMap = null;
      material.normalScale = new THREE.Vector2(0.4, 0.4);
      material.color.set('#fff4df');
    }
  }
  garageSurround.color.set('#f1ecdf');
  garageSurround.map = null;
  garageSurround.bumpMap = masonryMaps ? null : stoneTexture;
  garageSurround.bumpScale = 0.025;
  group.userData.materialStudy = 'Unchanged neutral warm-white main brick; decorative red-brown brick base to 30 inches above house floor, matching porch foundation, pillar bases, landing nose and risers. Pale coping and stone walking finishes. Approve brick/mortar samples, veneer support/flashing and coping/drips; select exterior slip/frost-rated paving and drainage separately. Wall veneer is not approved paving. No structural approval.';
  const roofTexture = masonryMaps?.roof?.map ?? surfaceTexture(true);
  const porchColumnFinish = mat('#f4f1e9', 0.95);
  const brickTextureWidthFeet = masonryMaps ? 10 / 3 : 8 / 3;
  const brickTextureHeightFeet = masonryMaps ? 175 / 48 : 25 / 12;
  group.userData.brickFormat = 'Cream queen face brick; nominal 8 x 3.125 inch face module including mortar';
  const frontBrick = (() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Exterior brick texture requires a 2D canvas context.');
    context.fillStyle = '#d7d6d1';
    context.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row++) for (let column = -1; column < 4; column++) {
      context.fillStyle = ['#e5e4df', '#f0efea', '#eae9e4', '#f6f5f0'][(row * 3 + column + 4) % 4];
      context.fillRect(column * 64 + (row % 2) * 32 + 2, row * 32 + 2, 60, 28);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    return new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 0.025, roughness: 0.98 });
  })();
  let baseBrick;
  function brickBox(parent, x, y, z, w, h, d, base = false) {
    const finish = base ? baseBrick : frontBrick;
    const brick = finish.clone();
    brick.map = finish.map.clone();
    brick.map.repeat.set(base ? 1 : Math.max(w, d) / brickTextureWidthFeet, base ? 1 : h / brickTextureHeightFeet);
    brick.bumpMap = masonryMaps ? null : brick.map;
    if (masonryMaps) for (const key of ['normalMap', 'roughnessMap']) {
      brick[key] = finish[key].clone();
      brick[key].repeat.copy(brick.map.repeat);
    }
    const mesh = box(parent, x, y, z, w, h, d, brick);
    if (base) mapBrickBoxUVs(mesh.geometry, brickTextureWidthFeet, brickTextureHeightFeet);
    mesh.name = 'Cream exterior brick masonry';
    return mesh;
  }
  if (masonryMaps) {
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = colorCanvas.height = 1024;
    const paint = colorCanvas.getContext('2d');
    if (!paint) throw new Error('Masonry color grading requires a 2D canvas context.');
    paint.filter = 'none';
    paint.drawImage(masonryMaps.brick.map.image, 0, 0, 1024, 1024);
    // Retain the photographed queen-brick joints and variation, but grade the
    // albedo to the owner's cream brick, not the source photograph's red/brown.
    const pixels = paint.getImageData(0, 0, 1024, 1024);
    gradeExteriorBrickPixels(pixels.data);
    paint.putImageData(pixels, 0, 0);
    const brickColor = new THREE.CanvasTexture(colorCanvas);
    brickColor.colorSpace = THREE.SRGBColorSpace;
    brickColor.wrapS = brickColor.wrapT = THREE.RepeatWrapping;
    brickColor.anisotropy = 4;
    Object.assign(frontBrick, masonryMaps.brick, { map: brickColor, bumpMap: null });
    frontBrick.color.set('#ffffff');
    frontBrick.normalScale = new THREE.Vector2(0.5, 0.5);
  }
  // Independent diffuse Source from the licensed brick scan BEFORE white grading.
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = baseCanvas.height = 1024;
  const basePaint = baseCanvas.getContext('2d');
  basePaint.drawImage((masonryMaps?.brick.map ?? frontBrick.map).image, 0, 0, 1024, 1024);
  const basePixels = basePaint.getImageData(0, 0, 1024, 1024);
  gradeExteriorBrickPixels(basePixels.data, true);
  basePaint.putImageData(basePixels, 0, 0);
  const baseMap = new THREE.CanvasTexture(baseCanvas);
  baseMap.colorSpace = THREE.SRGBColorSpace;
  baseMap.wrapS = baseMap.wrapT = THREE.RepeatWrapping;
  baseMap.anisotropy = 4;
  baseBrick = new THREE.MeshStandardMaterial({ ...(masonryMaps?.brick ?? {}), color: '#ffffff', map: baseMap, bumpMap: null, roughness: 0.95 });
  baseBrick.normalScale = new THREE.Vector2(0.5, 0.5);
  baseBrick.name = 'Decorative red-brown queen brick base - sample and assembly unverified';
  function brickFaceUVs(geometry, axis = 'x') {
    const positions = geometry.attributes.position;
    const uv = [];
    for (let index = 0; index < positions.count; index++) uv.push((axis === 'x' ? positions.getX(index) : positions.getZ(index)) / brickTextureWidthFeet, positions.getY(index) / brickTextureHeightFeet);
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  }
  function texturedBox(parent, x, y, z, w, h, d, roof = false) {
    const material = new THREE.MeshStandardMaterial({ map: (roof ? roofTexture : stoneTexture).clone(), roughness: 0.95 });
    if (roof && masonryMaps?.roof) {
      for (const key of ['normalMap', 'roughnessMap']) material[key] = masonryMaps.roof[key].clone();
      material.normalScale.set(0.35, 0.35);
      material.map.repeat.set(d / (3 / 0.3048), w / (3 / 0.3048));
      for (const key of ['normalMap', 'roughnessMap']) material[key].repeat.copy(material.map.repeat);
      const panel = box(parent, x, y, z, w, h, d, material);
      const uv = panel.geometry.attributes.uv;
      for (let index = 0; index < uv.count; index++) {
        const u = uv.getX(index), v = uv.getY(index);
        uv.setXY(index, v, u);
      }
      uv.needsUpdate = true;
      return panel;
    }
    material.map.repeat.set((roof ? w : Math.max(w, d)) / 8, (roof ? d : h) / 8);
    return box(parent, x, y, z, w, h, d, material);
  }
  function windowUnit(parent, center, sill, width, height, privacyLowerHalf = false, picture = false, perimeterTrim = true, front = false) {
    const frame = new THREE.Group();
    frame.name = 'Andersen 100 Series exterior concept window';
    const intent = getWindowProductIntent(width, height, picture, privacyLowerHalf);
    frame.userData = { ...intent, exteriorTrim: 'White', interiorTrimUnchanged: true, frontGrid: false };
    const windowFinish = trim;
    if (picture) frame.userData.operation = 'fixed picture window';
    if (privacyLowerHalf) Object.assign(frame.userData, { room: 'Powder room', privacyLowerHalf: true, privacyVerified: false });
    frame.position.set(center, sill, 0.25);
    parent.add(frame);
    parent.updateWorldMatrix(true, false);
    const openingWorld = parent.localToWorld(new THREE.Vector3(center, sill, 0));
    const installation = windowInstallations.filter((unit) =>
      Math.abs(unit.y - openingWorld.y) < 0.02 && Math.abs(unit.width - width) < 0.02 &&
      Math.hypot(unit.x - openingWorld.x, unit.z - openingWorld.z) < 0.8
    ).sort((a, b) => Math.hypot(a.x - openingWorld.x, a.z - openingWorld.z) - Math.hypot(b.x - openingWorld.x, b.z - openingWorld.z))[0];
    if (installation) {
      frame.position.z = parent.worldToLocal(new THREE.Vector3(installation.x, installation.y, installation.z)).z;
      frame.userData.installationConcept = true;
    }
    // Solid local installation bucks connect the displaced frame to existing
    // masonry. These are depth allowances, NOT engineered framing or flashing.
    const outerFace = frame.position.z + 0.12;
    const revealStart = installation ? frame.position.z - 0.62 : -wallThickness / 2;
    const revealDepth = outerFace - revealStart;
    for (const edge of [-1, 1]) {
      box(parent, center + edge * (width / 2 + 0.05), sill + height / 2,
        (outerFace + revealStart) / 2, 0.1, height, revealDepth, trim).name = 'Window installation solid jamb depth allowance';
      box(parent, center, sill + (edge < 0 ? -0.05 : height + 0.05),
        (outerFace + revealStart) / 2, width + 0.2, 0.1, revealDepth, trim).name = 'Window installation solid head/sill depth allowance';
    }
    if (privacyLowerHalf) {
      box(frame, 0, height / 4, 0, width, height / 2, 0.12, privacyGlass).name = 'Exterior powder frosted lower-half pane';
      box(frame, 0, height * 3 / 4, 0, width, height / 2, 0.12, glass).name = 'Exterior powder clear upper-half pane';
    } else {
      box(frame, 0, height / 2, 0, width, height, 0.12, glass);
    }
    for (const x of [-(width - 0.12) / 2, (width - 0.12) / 2]) box(frame, x, height / 2, 0, 0.12, height, 0.24, windowFinish);
    for (const y of [0.06, height - 0.06]) box(frame, 0, y, 0, width - 0.24, 0.12, 0.24, windowFinish);
    // Structural unit divisions, never decorative grilles; match furnished units.
    for (let column = 1; column < intent.columns; column++)
      box(frame, -width / 2 + width * column / intent.columns, height / 2, 0.1, 0.12, height, 0.08, windowFinish).name = 'Casement combination mullion';
    for (let row = 1; row < intent.rows; row++)
      box(frame, 0, height * row / intent.rows, 0.1, width, 0.12, 0.08, windowFinish).name = 'Casement combination horizontal mullion';
    if (perimeterTrim) {
      box(parent, center, sill - 0.13, 0.3, width + 0.65, 0.22, 0.45, windowFinish);
      box(parent, center, sill + height + 0.2, 0.28, width + 0.65, 0.3, 0.3, windowFinish);
    }
  }
  function wall(name, x1, z1, x2, z2, bottom, top, openings = []) {
    const front = ['front ground floor', 'upper front bedrooms', 'upper loft south', 'garage front', 'garage porch return'].includes(name);
    const wallGroup = new THREE.Group();
    wallGroup.name = `Exterior brick wall: ${name}`;
    wallGroup.position.set(x1, 0, z1);
    wallGroup.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    group.add(wallGroup);
    const length = Math.hypot(x2 - x1, z2 - z1);
    function fill(start, end, low, high) {
      if (end <= start || high <= low) return;
      const baseLow = low === bottom && bottom < 0 ? Math.min(low, -1.65) : low;
      const plinthTop = 2.5;
      if (baseLow < plinthTop) {
        const base = brickBox(wallGroup, (start + end) / 2, (baseLow + Math.min(high, plinthTop)) / 2, 0.025, end - start, Math.min(high, plinthTop) - baseLow, wallThickness + 0.05, true);
        base.name = 'Continuous red-brown brick base - 30 inch house datum';
        if (high >= plinthTop) box(wallGroup, (start + end) / 2, plinthTop - 0.05, 0.04, end - start, 0.1, wallThickness + 0.1, trim).name = 'Pale base transition coping course';
      }
      const panelLow = Math.max(baseLow, plinthTop);
      if (high <= panelLow) return;
      brickBox(wallGroup, (start + end) / 2, (panelLow + high) / 2, 0, end - start, high - panelLow, wallThickness);
    }
    let cursor = 0;
    for (const opening of openings) {
      const { center, width, sill, height, door } = opening;
      fill(cursor, center - width / 2, bottom, top);
      fill(center - width / 2, center + width / 2, bottom, sill);
      fill(center - width / 2, center + width / 2, sill + height, top);
      if (opening.units) {
        for (const unit of opening.units) windowUnit(wallGroup, center + opening.bankX - unit.x, unit.sill, unit.width, unit.height, false, unit.picture, false);
        box(wallGroup, center, opening.frameSill - 0.13, 0.3, opening.frameWidth + 0.65, 0.22, 0.45, trim).name = `${opening.trimLabel ?? 'Prep'} bank continuous exterior sill`;
        box(wallGroup, center, opening.frameSill + opening.frameHeight + 0.2, 0.28, opening.frameWidth + 0.65, 0.3, 0.3, trim).name = `${opening.trimLabel ?? 'Prep'} bank continuous exterior header trim`;
      } else if (!door) windowUnit(wallGroup, center, opening.frameSill ?? sill, opening.frameWidth ?? width, opening.frameHeight ?? height, opening.privacyLowerHalf, opening.picture, true, front);
      cursor = center + width / 2;
    }
    fill(cursor, length, bottom, top);
    if (name.startsWith('upper ')) articulateUpperMasonry(wallGroup, length, top, openings);
    return wallGroup;
  }
  // Applied stone is a supported veneer concept, never a substitute for headers.
  // Work in each actual wall's local coordinates so every return is coordinated.
  function articulateUpperMasonry(parent, length, top, openings) {
    const stone = trim;
    const pairedFront = parent.name === 'Exterior brick wall: upper front bedrooms';
    const blindLoft = parent.name === 'Exterior brick wall: upper loft south';
    for (const [y, height, depth, label] of [
      [10.05, 0.3, 0.36, 'Upper masonry base course'],
      [top - 0.65, 0.18, 0.38, 'Cornice lower bed molding'],
      [top - 0.36, 0.4, 0.28, 'Cornice frieze'],
      [top - 0.1, 0.12, 0.46, 'Cornice projecting crown']
    ]) {
      if ((pairedFront || blindLoft) && /lower bed|frieze/.test(label)) continue;
      box(parent, length / 2, y, 0.27, length, height, depth, stone).name = label;
    }
    if (pairedFront || blindLoft) {
      // Thickened veneer, not moved rooms: the original masonry is the
      // recessed field. Piers and bridging heads make real shadow pockets.
      const bays = pairedFront ? [[1.5, 11.5], [19.5, 29.5]] : [[1.5, 7], [8.5, 14]];
      const piers = pairedFront ? [0.75, 12.25, 18.75, 30.25] : [0.75, 7.75, 14.75];
      for (const x of piers) {
        brickBox(parent, x, 14.25, 0.30, 1, 8.1, 0.25).name = 'Upper bay projecting masonry pier';
      }
      for (const [left, right] of bays) {
        brickBox(parent, (left + right) / 2, 18.55, 0.30, right - left, 0.5, 0.25).name = 'Upper bay bridging masonry head';
        box(parent, (left + right) / 2, 18.86, 0.46, right - left + 0.12, 0.12, 0.64, stone).name = 'Upper bay head weathering cap - flashing required';
        if (pairedFront) {
          box(parent, (left + right) / 2, 12.72, 0.48, right - left, 0.22, 0.7, stone).name = 'Paired window continuous stone sill';
        }
      }
      parent.userData.bayStudy = '12 inch finish piers, 2.4 inch projection beyond wall face; rooms fixed. Veneer bearing, ties, shelf supports, weathering and flashing require design.';
      parent.userData.stonework = 'Supported veneer, flashing, drip grooves and anchors require professional detailing';
      return;
    }
    for (const { center, width, sill, height } of openings) {
      box(parent, center, sill - 0.23, 0.32, width + 0.9, 0.2, 0.64, stone).name = 'Upper window stone stool';
      box(parent, center, sill + height + 0.32, 0.3, width + 0.9, 0.38, 0.5, stone).name = 'Upper window stone lintel';
      for (const side of [-1, 1]) {
        box(parent, center + side * (width / 2 + 0.29), sill + height / 2, 0.28,
          0.24, height + 0.2, 0.36, stone).name = 'Upper window stone jamb';
      }
    }
    parent.userData.stonework = 'Supported veneer, flashing, drip grooves and anchors require professional detailing';
  }
  const win = (center, width = 4, sill = 3, height = 5) => ({ center, width, sill, height });
  const garageSideDoorCenterZ = 45.5;
  const garageSideDoorWidth = 3;
  const garageClerestories = getGarageClerestoryLayout(garageFloorY);
  const westFrontWindowCenterZ = 49;
  const westFrontWindowWidth = 4;
  wall('front ground floor', 0, 54.2, 31.2, 54.2, -0.4, 9, [...getGroundFrontWindows(), { center: 15.6, width: 5, sill: 0, height: 8, door: true }].sort((a,b)=>a.center-b.center));
  const archedEntry = new THREE.Group();
  archedEntry.name = 'Coordinated arched oak entry and deep white surround';
  archedEntry.position.set(15.6, 0, 54.2);
  group.add(archedEntry);
  buildArchedFrontEntry(THREE, { box, wood: entryWood, field: mat('#b88e5a'), oakMaps: masonryMaps?.oak, trim, hardware: dark }, archedEntry);
  for (const {center: x, width} of getGroundFrontWindows()) {
    box(group, x, 8.32, 54.54, width + 0.65, 0.35, 0.24, trim).name = 'Front window projecting limestone lintel';
    box(group, x, 2.78, 54.55, width + 0.6, 0.18, 0.3, trim).name = 'Front window cut-stone sill';
  }
  const livingFeatureWall = getLivingRoomFeatureLayout();
  const guestEntry = getGuestEntryLayout();
  wall('west ground floor', 0, 8, 0, 54.2, -0.4, 9, [
    ...livingFeatureWall.windowCenters.map((z) => win(z - 8, 4, 2.6, 5.4)),
    ...guestEntry.windows.map(({ z, width, height, sill, openingWidth, openingHeight, openingSill, privacyLowerHalf }) => ({ center: z - 8, width: openingWidth, height: openingHeight, sill: openingSill, frameWidth: width, frameHeight: height, frameSill: sill, privacyLowerHalf })),
    win(westFrontWindowCenterZ - 8, westFrontWindowWidth)
  ]);
  wall('living rear return', 13.2, 8, 0, 8, -0.4, 9, [livingFeatureWall.sideWindowBank].map((bank) => ({
    ...win(13.2 - bank.x, bank.openingWidth, bank.openingSill, bank.openingHeight),
    bankX: bank.x, frameWidth: bank.width, frameHeight: bank.height, frameSill: bank.sill, units: bank.units, trimLabel: bank.trimLabel
  })));
  wall('dining west', 13.2, -0.1, 13.2, 8, -0.4, 9, [{ center: livingFeatureWall.patioDoor.z + 0.1, width: 3, sill: 0, height: 8, door: true }]);
  wall('dining rear', 26.875, -0.1, 13.2, -0.1, -0.4, 9, [win(6.8375, 6)]);
  wall('dining patio', 26.875, 7, 26.875, -0.1, -0.4, 9, [win(3.5, 6, 3, 5)]);
  wall('kitchen and prep rear', 55.5, 7, 26.875, 7, -0.4, 9, [getPrepWindowBankLayout(), getKitchenWindowBankLayout()].map((bank) => ({ ...win(55.5 - bank.x, bank.openingWidth, bank.openingSill, bank.openingHeight), bankX: bank.x, frameWidth: bank.width, frameHeight: bank.height, frameSill: bank.sill, units: bank.units, trimLabel: bank.trimLabel })));
  const garageSideWall = wall('east ground floor', 55.5, 49, 55.5, 7, garageFloorY - 0.3, 9, [
    { center: 49 - garageSideDoorCenterZ, width: garageSideDoorWidth, sill: garageFloorY, height: 8, door: true },
    ...garageClerestories.map(({ z, width, sill, height }) => ({ center: 49 - z, width, sill, height, picture: true })),
    ...getPrepWindowLayout().filter((window) => window.x === 55.5).map((window) => ({ ...win(49 - window.z, window.openingWidth, window.openingSill, window.openingHeight), frameWidth: window.width, frameHeight: window.height, frameSill: window.sill }))
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
  wall('upper front bedrooms', 0, 53.2, 31, 53.2, 9, eaves, getUpstairsFrontWindows().map(w => win(w.center, w.width, upper + w.sill, w.height)));
  wall('upper west', 0, 7.6, 0, 53.2, 9, eaves, getUpstairsExteriorOpenings(0, 7.6, 0, 53.2, upper));
  wall('upper primary rear', 10.2, 7.6, 0, 7.6, 9, eaves);
  wall('upper bath west return', 10.2, 2.1, 10.2, 7.6, 9, eaves);
  wall('upper bath rear', 25.7, 2.1, 10.2, 2.1, 9, eaves, getUpstairsExteriorOpenings(25.7, 2.1, 10.2, 2.1, upper));
  wall('upper bath east', 25.7, 10, 25.7, 2.1, 9, eaves);
  wall('upper bedroom rear', 54, 10, 25.7, 10, 9, eaves, getUpstairsExteriorOpenings(54, 10, 25.7, 10, upper));
  wall('upper east bath', 54, 15.4, 54, 10, 9, eaves);
  wall('upper closet return', 52, 15.4, 54, 15.4, 9, eaves);
  wall('upper east loft', 52, 36.2, 52, 15.4, 9, eaves, getUpstairsExteriorOpenings(52, 36.2, 52, 15.4, upper));
  wall('upper loft south', 36.5, 36.2, 52, 36.2, 9, eaves, getUpstairsExteriorOpenings(36.5, 36.2, 52, 36.2, upper));
  // The resolved Storage south wall continues to the bedroom return.
  // Do not leave a facade slit when the lower garage roof exposes this wall.
  wall('upper storage south', 31, 36.2, 36.5, 36.2, 9, eaves);
  wall('upper bedroom east return', 31, 53.2, 31, 36.2, 9, eaves);
  // The resolved upstairs stops at z=36.2 east of x=31.
  // This is a garage roof void, not a second-floor facade or bonus room.
  const garageFacadeEaves = 9;
  group.userData.garageUpperVolume = 'Unoccupied garage roof void only; no upper room, floor, windows, storage or access approval';

  function renderRoofEnvelope(name, definitions, material, metal = false, metalFinish = null) {
    const plan = HomeRoof.buildRoofEnvelope(definitions);
    const model = new THREE.Group();
    model.name = name;
    model.userData = { connectedRoof: true, faceCount: plan.faces.length, valleyCount: plan.joins.filter((join) => join.type === 'valley').length, framingAndDrainageVerified: false };
    group.add(model);
    const soffitFinish = white.clone();
    soffitFinish.side = THREE.DoubleSide;
    function surface(polygon, plane, finish, label, offset = 0) {
      const positions = [], uv = [];
      const gradient = Math.hypot(plane[0], plane[1]);
      const tileFeet = 3 / 0.3048;
      const vertex = (point) => {
        positions.push(point[0], HomeRoof.heightAt(plane, point) + offset, point[1]);
        uv.push(
          gradient ? (plane[1] * point[0] - plane[0] * point[1]) / gradient / tileFeet : point[0] / tileFeet,
          gradient ? (plane[0] * point[0] + plane[1] * point[1]) / gradient * Math.sqrt(1 + gradient * gradient) / tileFeet : point[1] / tileFeet
        );
      };
      for (let index = 1; index < polygon.length - 1; index++) {
        vertex(polygon[0]); vertex(polygon[index + 1]); vertex(polygon[index]);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, finish);
      mesh.name = label;
      mesh.castShadow = mesh.receiveShadow = true;
      model.add(mesh);
      return mesh;
    }
    function linePart(start, end, width, height, finish, label, lift = 0) {
      const a = new THREE.Vector3(start[0], start[1] + lift, start[2]);
      const b = new THREE.Vector3(end[0], end[1] + lift, end[2]);
      const direction = b.clone().sub(a);
      if (direction.length() < 0.01) return;
      const part = box(model, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, direction.length(), height, width, finish);
      part.name = label;
      part.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.normalize());
      return part;
    }
    for (const face of plan.faces) {
      const faceMaterial = face.finish === 'metal' && metalFinish ? metalFinish : material;
      const mesh = surface(face.polygon, face.plane, faceMaterial, `${face.roof} connected roof surface`);
      mesh.userData = { roofSurface: true, roof: face.roof, patch: face.id, plane: face.plane, polygon: face.polygon };
      const underside = surface(face.polygon, face.plane, soffitFinish, 'Closed connected roof underside', -0.16);
      underside.userData.noExteriorShadow = true;
      if (metal || face.finish === 'metal') {
        const [gx, gz] = face.plane, gradient = Math.hypot(gx, gz);
        const u = gradient ? [gz / gradient, -gx / gradient] : [1, 0];
        const projections = face.polygon.map(([x, z]) => x * u[0] + z * u[1]);
        for (let seam = Math.ceil(Math.min(...projections) / 1.5) * 1.5; seam < Math.max(...projections); seam += 1.5) {
          const points = [];
          for (let index = 0; index < face.polygon.length; index++) {
            const a = face.polygon[index], b = face.polygon[(index + 1) % face.polygon.length];
            const av = a[0] * u[0] + a[1] * u[1] - seam, bv = b[0] * u[0] + b[1] * u[1] - seam;
            if (Math.abs(av) < 1e-7) points.push(a);
            if (av * bv < 0) {
              const t = av / (av - bv);
              points.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
            }
          }
          const unique = points.filter((point, index) => !points.slice(0, index).some((other) => Math.hypot(point[0] - other[0], point[1] - other[1]) < 1e-6));
          if (unique.length >= 2) {
            unique.sort((a, b) => a[0] * -u[1] + a[1] * u[0] - b[0] * -u[1] - b[1] * u[0]);
            const point = (p) => [p[0], HomeRoof.heightAt(face.plane, p), p[1]];
            const rib = linePart(point(unique[0]), point(unique.at(-1)), 0.025, 0.045, faceMaterial, 'Clipped standing-seam roof rib', 0.035);
            if (rib) rib.userData.noExteriorShadow = true;
          }
        }
      }
    }
    const valleyFinish = metal ? material : mat('#655f53', 0.8);
    for (const join of plan.joins) {
      const part = linePart(join.start, join.end, join.type === 'valley' ? 0.14 : 0.24, join.type === 'valley' ? 0.015 : 0.12, join.type === 'valley' ? valleyFinish : material, `Connected roof ${join.type}`, join.type === 'valley' ? 0.018 : 0.045);
      if (part) part.userData = { roofJoin: join.type, roofs: join.roofs };
    }
    for (const edge of plan.boundaries) {
      const dx = edge.end[0] - edge.start[0], dz = edge.end[2] - edge.start[2], length = Math.hypot(dx, dz);
      if (length < 0.02) continue;
      const outside = [(edge.start[0] + edge.end[0]) / 2 + dz / length * 0.005, (edge.start[2] + edge.end[2]) / 2 - dx / length * 0.005];
      const outsideRoof = plan.patches.filter((patch) => HomeRoof.contains(patch.polygon, outside));
      const outsideHeight = Math.max(-Infinity, ...outsideRoof.map((patch) => HomeRoof.heightAt(patch.plane, outside)));
      const edgeHeight = (edge.start[1] + edge.end[1]) / 2;
      if (outsideHeight > edgeHeight + 0.01) {
        linePart(edge.start, edge.end, 0.12, 0.12, valleyFinish, 'Stepped roof wall-abutment flashing', 0.02);
        continue;
      }
      if (metal || definitions.find(({ id }) => id === edge.roof)?.finish === 'metal') continue;
      const rake = Math.abs(edge.start[1] - edge.end[1]) > 0.05;
      linePart(edge.start, edge.end, 0.26, 0.45, trim, rake ? 'Connected roof rake fascia' : 'Connected roof eaves fascia', -0.3);
      const width = 0.65;
      const a = [edge.start[0], edge.start[2]], b = [edge.end[0], edge.end[2]];
      const c = [b[0] - dz / length * width, b[1] + dx / length * width], d = [a[0] - dz / length * width, a[1] + dx / length * width];
      // Level eaves, not extensions of the steep hip plane: the latter rose
      // through adjoining roof slopes at both rear corners. Clip rake/eaves
      // strips to their actual visible face, including valley terminations.
      for (const face of plan.faces) {
        if (!face.plane.every((value, i) => Math.abs(value - edge.plane[i]) < 1e-7)) continue;
        const polygon = HomeRoof.intersectPolygons([a, b, c, d], face.polygon);
        if (polygon.length) surface(polygon, rake ? edge.plane : [0, 0, edge.start[1]],
          white, 'Connected roof closed edge soffit', -0.2);
      }
      if (!rake) linePart(edge.start, edge.end, 0.24, 0.2, trim, 'Connected roof perimeter gutter', -0.1);
    }
    return model;
  }
  const slateFinish = new THREE.MeshStandardMaterial({ ...(masonryMaps?.roof ?? {}), map: roofTexture, roughness: 0.95, side: THREE.DoubleSide });
  slateFinish.normalScale.set(0.35, 0.35);
  const houseRoof = renderRoofEnvelope('Connected main-house roof system', HomeRoof.getConnectedRoofDefinitions(floorToFloor)
    .filter(({ id }) => !['Garage hip', 'Dining rear projection'].includes(id)), slateFinish);
  const setbackFinish = mat('#716c60', 0.85);
  const setbackRoofs = renderRoofEnvelope('Closed ground-floor setback roofs', HomeRoof.getLowerRoofDefinitions(), slateFinish, false, setbackFinish);
  setbackRoofs.userData.designReview = 'Illustrative low-slope metal roof closure; selected roofing minimum slope, tapered build-up, wall flashing, support and east-side drainage require design. No terrace or added room.';
  const setbackPlan = HomeRoof.buildRoofEnvelope(HomeRoof.getLowerRoofDefinitions());
  const abutments = HomeRoof.getSetbackAbutments();
  function isSetbackAbutment(edge) {
    return abutments.some(([x1, z1, x2, z2]) => {
      const on = (p) => Math.abs((x2 - x1) * (p[2] - z1) - (z2 - z1) * (p[0] - x1)) < 1e-5
        && p[0] >= Math.min(x1, x2) - 1e-5 && p[0] <= Math.max(x1, x2) + 1e-5
        && p[2] >= Math.min(z1, z2) - 1e-5 && p[2] <= Math.max(z1, z2) + 1e-5;
      return on(edge.start) && on(edge.end);
    });
  }
  // Vertex-defined prisms retain vertical ends and exact sloping top/bottom
  // datums. No rotated fascia boxes crossing the room-side masonry face.
  function setbackSection(name, start, end, width, bottomAt, topAt, finish) {
    const dx = end[0] - start[0], dz = end[2] - start[2], length = Math.hypot(dx, dz);
    const geometry = new THREE.BoxGeometry(length, 1, width);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const t = (p.getX(i) + length / 2) / length;
      p.setY(i, p.getY(i) > 0 ? topAt(t) : bottomAt(t));
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, finish);
    mesh.name = name;
    mesh.position.set((start[0] + end[0]) / 2, 0, (start[2] + end[2]) / 2);
    mesh.rotation.y = -Math.atan2(dz, dx);
    mesh.castShadow = mesh.receiveShadow = true;
    setbackRoofs.add(mesh);
    return mesh;
  }
  for (const edge of setbackPlan.boundaries) {
    if (!edge.roof.includes('setback roof')) continue;
    const y = t => edge.start[1] + (edge.end[1] - edge.start[1]) * t;
    if (isSetbackAbutment(edge)) {
      setbackSection('Setback roof wall counterflashing - design required', edge.start, edge.end, 0.06, t => y(t) - 0.03, t => y(t) + 0.35, setbackFinish);
    } else {
      setbackSection('Setback roof closed perimeter fascia', edge.start, edge.end, 0.12, () => 8.88, y, trim);
    }
  }
  // Close the entire wall-head band at the actual lower exterior wall faces.
  // Eaves fascia alone did not seal the gap behind its overhang.
  for (const [a, b] of [[[26.875, 7], [55.5, 7]], [[55.5, 7], [55.5, 36.2]]]) {
    for (const segment of HomeRoof.wallHeadSegments(setbackPlan, a, b, 9)) {
      setbackSection('Lower setback fitted wall-head closure', segment.start, segment.end, wallThickness,
        () => 9, t => segment.start[1] + (segment.end[1] - segment.start[1]) * t + 0.01, white);
    }
  }
  const collectorStart = [55.96, 0, 6.7], collectorEnd = [55.96, 0, 35.55];
  const collectorBase = t => 8.8 + (35.55 - 6.7) * t / 192;
  setbackSection('Setback east collector trough base - outlet sizing unverified',
    collectorStart, collectorEnd, 0.32, t => collectorBase(t) - 0.04, collectorBase, trim);
  for (const x of [55.8, 56.12]) {
    setbackSection('Setback east collector upstand', [x, 0, 6.7], [x, 0, 35.55], 0.04,
      collectorBase, t => collectorBase(t) + 0.22, trim);
  }
  for (const [z, y] of [[6.7, 8.8], [35.55, collectorBase(1)]]) {
    box(setbackRoofs, 55.96, y + 0.11, z, 0.32, 0.22, 0.04, trim).name = 'Setback collector end closure';
  }
  box(setbackRoofs, 55.96, 8.76, 6.975, 0.14, 0.14, 0.55, trim).name = 'Setback collector outlet offset';
  box(setbackRoofs, 55.96, (8.76 - 1.65) / 2, 7.25, 0.14, 8.76 + 1.65, 0.14, trim).name = 'Setback east leader - below-grade drainage unverified';
  for (const y of [0.5, 4.5, 8.5]) {
    box(setbackRoofs, 55.83, y, 7.25, 0.26, 0.08, 0.2, dark).name = 'Setback leader masonry bracket';
  }
  setbackRoofs.userData.drainageIntent = 'East collector falls 1/16:12 toward rear corner leader, separate from patio; capacity, freeze protection, connection and lawful underground discharge require design.';
  // The upper bathroom projects beyond the lower living wall. A closed
  // finish underside is not a designed floor/cantilever or a load path.
  const projectionSoffit = box(group, (9.975 + 25.925) / 2, 9.03, (1.875 + 8.225) / 2,
    25.925 - 9.975, 0.06, 8.225 - 1.875, white);
  projectionSoffit.name = 'Rear upper projection opaque underside - support unverified';
  projectionSoffit.userData = { finishOnly: true, structuralApproval: false };
  const houseRoofPlan = HomeRoof.buildRoofEnvelope(HomeRoof.getConnectedRoofDefinitions(floorToFloor));
  // Fixed room walls/windows stay put; close the attic-wall band up to the
  // real roof underside, including the stepped loft/garage abutment.
  const upperWallHeads = [
    [0, 53.2, 31, 53.2],
    [0, 7.6, 0, 53.2], [10.2, 7.6, 0, 7.6],
    [10.2, 2.1, 10.2, 7.6], [25.7, 2.1, 10.2, 2.1],
    [25.7, 10, 25.7, 2.1], [54, 10, 25.7, 10],
    [54, 15.4, 54, 10], [52, 15.4, 54, 15.4],
    [52, 36.2, 52, 15.4], [36.5, 36.2, 52, 36.2],
    [31, 53.2, 31, 36.2], [31, 36.2, 36.5, 36.2]
  ];
  for (const [x1, z1, x2, z2] of upperWallHeads) {
    for (const { start: a, end: b, bottom } of HomeRoof.wallHeadSegments(houseRoofPlan, [x1, z1], [x2, z2], eaves)) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([
        a[0], bottom, a[2], b[0], bottom, b[2], b[0], b[1], b[2],
        a[0], bottom, a[2], b[0], b[1], b[2], a[0], a[1], a[2]
      ], 3));
      geometry.computeVertexNormals();
      brickFaceUVs(geometry, Math.abs(x2 - x1) > Math.abs(z2 - z1) ? 'x' : 'z');
      const finish = frontBrick.clone();
      finish.side = THREE.DoubleSide;
      const closure = new THREE.Mesh(geometry, finish);
      closure.name = 'Fitted upper attic wall-head closure';
      closure.userData = { finishOnly: true, structuralSupportDesigned: false };
      closure.castShadow = closure.receiveShadow = true;
      houseRoof.add(closure);
    }
  }
  houseRoof.userData.drainageIntent = 'Main and wing hips fall to perimeter gutters; their derived valley drains outward. Garage hip meets the taller walls through stepped flashing, not a fictional continuous valley. Upper rear rainwater must be piped separately, never discharged onto the post-free canopy; outlet sizing and routes remain to design.';
  houseRoof.userData.framingAllowanceInches = 18;
  houseRoof.userData.framingAllowanceVerified = false;

  function drainageRoute(parent, name, points, brackets = []) {
    const route = new THREE.Group();
    route.name = name;
    route.userData = { routePoints: points, sizingAndOutletVerified: false };
    parent.add(route);
    function segment(a, b, size, label, finish) {
      const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
      const delta = end.clone().sub(start);
      const pipe = box(route, (start.x + end.x) / 2, (start.y + end.y) / 2,
        (start.z + end.z) / 2, size, delta.length() + size, size, finish);
      pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
      pipe.name = label;
    }
    for (let i = 1; i < points.length; i++) segment(points[i - 1], points[i], 0.14, 'Connected rainwater leader segment', trim);
    for (const [a, b] of brackets) segment(a, b, 0.055, 'Wall-fixed rainwater bracket', dark);
    return route;
  }
  // Follow the REAL stepped walls. Only the short canopy bypass is stood off;
  // the upper/lower vertical runs are corner-mounted, not 20-foot free drops.
  for (const east of [false, true]) {
    const upperX = east ? 31.4 : -0.4, bypassX = east ? 32.1 : -0.95;
    // East lower return faces WEST, not east into the garage volume.
    // Wrap its front end and mount on the FRONT face instead.
    const lowerX = east ? 30.9 : -0.4, lowerZ = east ? 54.65 : 54.05;
    drainageRoute(group, `Upper ${east ? 'east' : 'west'} corner rainwater route`, [
      [east ? 31.65 : -0.65, 19.1, 54.95],
      [upperX, 17.6, 53.05], [upperX, 12.2, 53.05],
      [bypassX, 11.2, 54.65], [bypassX, 9.15, 54.65],
      [lowerX, 8.3, lowerZ], [lowerX, -1.35, lowerZ],
      [lowerX, -1.6, lowerZ + 0.35]
    ], [16, 13].map(y => [[east ? 31.225 : -0.225, y, 53.05], [upperX, y, 53.05]])
      .concat([1, 4, 7].map(y => [
        east ? [lowerX, y, 54.425] : [-0.225, y, lowerZ],
        [lowerX, y, lowerZ]
      ])));
  }
  // Dining is hipped in the shared envelope; no independent triangle at
  // z = 2.1 (it would rise through that hip's surface).
  const patio = new THREE.Group();
  patio.name = 'Kitchen-prep vegetable garden';
  const patioBounds = { left: 26.5, right: 55.5, rear: -0.1 - wallThickness / 2, front: 7 };
  const patioWidth = patioBounds.right - patioBounds.left;
  const patioDepth = patioBounds.front - patioBounds.rear;
  const terraceLeft = patioBounds.left + 0.25;
  const terraceFront = patioBounds.front - 0.25;
  const patioGrade = -1.625;
  patio.userData = { x: patioBounds.left, z: patioBounds.rear, widthFeet: patioWidth, depthFeet: patioDepth, limits: patioBounds, topFeet: patioGrade, stepsAtDiningDoor: false, garden: true, oldDoorReplacedByWindow: true, openSides: true, plantingAndDrainageVerified: false };
  group.add(patio);
  const kitchenGarden = box(patio, (terraceLeft + patioBounds.right) / 2, patioGrade - 0.12, (patioBounds.rear + terraceFront) / 2, patioBounds.right - terraceLeft, 0.2, terraceFront - patioBounds.rear, mat('#66513d'));
  kitchenGarden.name = 'Kitchen-prep garden soil';
  kitchenGarden.userData = { x: terraceLeft, z: patioBounds.rear, widthFeet: patioBounds.right - terraceLeft, depthFeet: terraceFront - patioBounds.rear, topFeet: patioGrade - 0.02 };
  const vegetableGarden = new THREE.Group();
  vegetableGarden.name = 'Cucumbers, green beans and pumpkins';
  vegetableGarden.userData = { crops: ['Cucumbers', 'Green beans', 'Pumpkins'], illustrativeMatureGrowth: true, sunlightAndSpacingVerified: false, foundationDrainageVerified: false };
  patio.add(vegetableGarden);
  const vineGreen = mat('#446b2d'), leafGreen = mat('#4c803a'), cucumberGreen = mat('#31552a'), beanGreen = mat('#78a648'), pumpkinOrange = mat('#d48026');
  function gardenOval(parent, name, x, y, z, sx, sy, sz, material) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    parent.add(mesh);
    return mesh;
  }
  const soilTop = patioGrade - 0.02;
  for (const [crop, left, fruitMaterial] of [['Cucumber', 30.5, cucumberGreen], ['Green bean', 39.5, beanGreen]]) {
    const row = new THREE.Group();
    row.name = `${crop} trellis row`;
    row.userData = { crop, leftFeet: left, rightFeet: left + 6.5, zFeet: 4.4, heightFeet: 5, provisional: true };
    vegetableGarden.add(row);
    for (const x of [left, left + 6.5]) box(row, x, soilTop + 2.5, 4.4, 0.12, 5, 0.12, wood).name = `${crop} trellis upright`;
    for (const height of [1, 2, 3, 4, 5]) box(row, left + 3.25, soilTop + height, 4.4, 6.5, 0.035, 0.035, wood).name = `${crop} trellis horizontal`;
    for (const offset of [0.9, 3.25, 5.6]) {
      const x = left + offset;
      box(row, x, soilTop + 2.35, 4.3, 0.045, 4.7, 0.045, vineGreen).name = `${crop} climbing vine`;
      for (let level = 0; level < 6; level++) {
        const side = level % 2 ? 1 : -1, y = soilTop + 0.65 + level * 0.68;
        const leaf = gardenOval(row, `${crop} leaf`, x + side * 0.32, y, 4.15, crop === 'Cucumber' ? 0.38 : 0.27, 0.19, 0.16, leafGreen);
        leaf.rotation.z = side * 0.45;
        gardenOval(row, crop === 'Cucumber' ? 'Growing cucumber' : 'Hanging green bean pod', x - side * 0.12, y - 0.25, 4.02, crop === 'Cucumber' ? 0.11 : 0.035, crop === 'Cucumber' ? 0.32 : 0.4, crop === 'Cucumber' ? 0.1 : 0.035, fruitMaterial);
      }
    }
  }
  for (const x of [49, 52.5]) {
    const patch = new THREE.Group();
    patch.name = 'Pumpkin vine and fruit';
    patch.userData = { crop: 'Pumpkin', xFeet: x, zFeet: 3, provisional: true };
    vegetableGarden.add(patch);
    box(patch, x, soilTop + 0.035, 3, 2.6, 0.05, 0.06, vineGreen).name = 'Trailing pumpkin vine';
    for (const [dx, dz] of [[-1, -0.5], [-0.45, 0.65], [0.65, -0.55], [1.1, 0.6]]) gardenOval(patch, 'Broad pumpkin leaf', x + dx, soilTop + 0.16, 3 + dz, 0.48, 0.1, 0.4, leafGreen);
    for (let lobe = 0; lobe < 8; lobe++) {
      const angle = lobe * Math.PI / 4;
      gardenOval(patch, 'Orange pumpkin rib', x + Math.cos(angle) * 0.22, soilTop + 0.33, 3 + Math.sin(angle) * 0.22, 0.27, 0.33, 0.27, pumpkinOrange);
    }
    const stem = box(patch, x, soilTop + 0.76, 3, 0.1, 0.25, 0.1, vineGreen);
    stem.name = 'Pumpkin stem';
    stem.rotation.z = 0.2;
  }
  const livingPatio = new THREE.Group();
  livingPatio.name = 'Living-room patio with covered seating and open yard extension';
  const livingPatioBounds = { left: 0, right: 13.2, rear: patioBounds.rear, front: 8 };
  const livingTerraceLeft = westPaverEdgeX + pathWidth;
  const livingTerraceFlatLeft = livingTerraceLeft + 3;
  const livingTerraceRight = livingPatioBounds.right - 0.25;
  const livingTerraceRear = livingPatioBounds.rear - 4;
  const livingTerraceFront = livingPatioBounds.front - wallThickness / 2;
  const livingPatioCenterZ = (livingPatioBounds.rear + livingTerraceFront) / 2;
  const diningPatioStairWidth = 4;
  const diningLandingRear = livingFeatureWall.patioDoor.z - 2;
  const diningLandingLeft = livingTerraceRight - diningPatioStairWidth;
  livingPatio.userData = { limits: { left: livingTerraceLeft, right: livingTerraceRight, rear: livingTerraceRear, front: livingTerraceFront }, coveredLimits: livingPatioBounds, uncoveredYardExtensionFeet: 4, connectsToWestFencePath: true, flatAreaLeftFeet: livingTerraceFlatLeft, topFeet: patioGrade, directHouseDoor: true, levelDiningWalkout: false, stepsAtDiningDoor: true, connectedByGardenPath: true, structureVerified: false, drainageVerified: false, daylightPerformanceVerified: false };
  group.add(livingPatio);
  const livingExit = new THREE.Group();
  livingExit.name = 'Dining covered-patio glazed exterior door, 36 by 96 inches';
  livingExit.position.set(livingFeatureWall.patioDoor.x, 0, livingFeatureWall.patioDoor.z);
  livingExit.rotation.y = -Math.PI / 2;
  livingPatio.add(livingExit);
  for (const x of [-1.44, 1.44]) box(livingExit, x, 4, 0, 0.12, 8, 0.2, white).name = 'Living exterior door stile';
  for (const y of [0.08, 7.92]) box(livingExit, 0, y, 0, 3, 0.16, 0.2, white).name = 'Living exterior door rail';
  box(livingExit, 0, 4, 0, 2.76, 7.68, 0.05, glass).name = 'Living exterior door glazing';
  box(livingExit, -1.15, 3, 0.16, 0.08, 0.4, 0.12, dark).name = 'Living exterior door handle';
  paving(livingPatio, 'Ground-level living-room patio terrace', livingTerraceFlatLeft, livingTerraceRear, livingTerraceRight - livingTerraceFlatLeft, livingTerraceFront - livingTerraceRear, patioGrade, 0.3, baseStone);
  const westPatioTransition = paving(livingPatio, 'Patio to west fence-path grade transition', livingTerraceLeft, livingTerraceRear, livingTerraceFlatLeft - livingTerraceLeft, livingTerraceFront - livingTerraceRear, patioGrade, 0.3, baseStone);
  const westPatioPositions = westPatioTransition.geometry.attributes.position;
  for (let index = 0; index < westPatioPositions.count; index++) westPatioPositions.setY(index, westPatioPositions.getY(index) + (1.5 - westPatioPositions.getX(index)) / 3 * (-1.35 - patioGrade));
  westPatioPositions.needsUpdate = true;
  westPatioTransition.geometry.computeVertexNormals();
  westPatioTransition.userData = { ...westPatioTransition.userData, westTopFeet: -1.35, eastTopFeet: patioGrade, slopeVerified: false, accessibleRouteVerified: false };
  // The continuous terrace below restores the removed platform/flight footprint.
  paving(livingPatio, 'Covered dining patio door landing', diningLandingLeft, diningLandingRear, 4, 4, 0, -patioGrade + 0.3, baseStone);
  paving(livingPatio, 'Dining patio threshold', diningLandingLeft + 4, livingFeatureWall.patioDoor.z - 1.5, livingFeatureWall.patioDoor.x - diningLandingLeft - 4, 3, 0, 0.3, baseStone);
  livingPatio.userData.stairReview = 'Concept only: 48 by 48 inch top landing, 48 inch flight toward yard, three 6.5 inch risers, two 13.2 inch goings. Keep 48 by 48 inch bottom arrival clear on existing terrace. No guard or handrail approval: review exposed 19.5 inch landing edges, handhold/guard requirements, foundations, frost, slip resistance, drainage and threshold waterproofing before construction.';
  const patioRoofPitch = 3 / 16;
  const patioRoofLeft = livingPatioBounds.left;
  const patioRoofRight = livingPatioBounds.right;
  const patioRoofWidth = patioRoofRight - patioRoofLeft;
  const patioRoofCenterX = (patioRoofLeft + patioRoofRight) / 2;
  const patioRoofAngle = Math.atan(patioRoofPitch);
  const patioRoofThickness = 0.18;
  const patioRoofFront = livingPatioBounds.front + wallThickness / 2;
  const patioRoofCenterZ = (livingPatioBounds.rear + patioRoofFront) / 2;
  // Lift only the canopy, not the openings: the deeper soffit must clear the
  // eight-foot dining door and its head trim at the low end of the opening.
  const patioRoofY = 9.5;
  const patioRoofLength = patioRoofFront - livingPatioBounds.rear;
  const patioRoof = texturedBox(livingPatio, patioRoofCenterX, patioRoofY, patioRoofCenterZ, patioRoofWidth, patioRoofThickness, patioRoofLength, true);
  patioRoof.name = 'Brown-shingle covered patio roof';
  patioRoof.userData = { location: 'Behind living room', limits: { ...livingPatioBounds, front: patioRoofFront }, centerHeightFeet: patioRoofY, pitch: patioRoofPitch, kitchenAndPrepFrontageOpen: true, coversDiningLanding: false, livingRoomDaylightReduced: true, attachmentVerified: false, daylightPerformanceVerified: false };
  const patioRoofVertices = patioRoof.geometry.attributes.position;
  for (let i = 0; i < patioRoofVertices.count; i++) {
    patioRoofVertices.setY(i, patioRoofVertices.getZ(i) * patioRoofPitch
      + (patioRoofVertices.getY(i) > 0 ? 1 : -1) * patioRoofThickness / (2 * Math.cos(patioRoofAngle)));
  }
  patioRoof.geometry.computeVertexNormals();
  function patioRoofUndersideAt(z) {
    return patioRoofY + (z - patioRoofCenterZ) * patioRoofPitch - patioRoofThickness / (2 * Math.cos(patioRoofAngle));
  }
  wall('Patio roof raised headwall', patioRoofRight, 8, patioRoofLeft, 8, 9, patioRoofUndersideAt(patioRoofFront) + 0.02);
  const patioSideClosureStart = patioRoofCenterZ + (9 - patioRoofY + patioRoofThickness / (2 * Math.cos(patioRoofAngle))) / patioRoofPitch;
  for (const { x, rear, name } of [
    { x: patioRoofRight, rear: patioSideClosureStart, name: 'Patio roof east tapered closure' }
  ]) {
    const geometry = new THREE.BoxGeometry(wallThickness, 1, patioRoofFront - rear);
    const positions = geometry.attributes.position;
    const centerZ = (rear + patioRoofFront) / 2;
    for (let i = 0; i < positions.count; i++) {
      positions.setY(i, positions.getY(i) > 0 ? patioRoofUndersideAt(centerZ + positions.getZ(i)) + 0.02 - 9 : 0);
    }
    geometry.computeVertexNormals();
    brickFaceUVs(geometry, 'z');
    const closure = new THREE.Mesh(geometry, white);
    closure.name = name;
    closure.position.set(x, 9, centerZ);
    livingPatio.add(closure);
  }
  patioRoof.userData.supportConcept = 'Post-free house-supported cantilever; structural engineering required, do not build from model';
  patioRoof.userData.structuralApproval = false;
  patioRoof.userData.conceptFasciaDepthInches = 9;
  // All finish edges share the same world-space section. Rotating separate
  // boxes shifts their end points and previously put fascia through the roof.
  const canopyDepth = 9 / 12;
  const canopySoffitBottomAt = (z) => patioRoofUndersideAt(z) - canopyDepth;
  function canopySection(name, left, right, rear, front, bottomAt, topAt, material = trim) {
    const geometry = new THREE.BoxGeometry(right - left, 1, front - rear);
    const p = geometry.attributes.position;
    const zCenter = (rear + front) / 2;
    for (let i = 0; i < p.count; i++) {
      const z = zCenter + p.getZ(i);
      p.setY(i, p.getY(i) > 0 ? topAt(z) : bottomAt(z));
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set((left + right) / 2, 0, zCenter);
    livingPatio.add(mesh);
    return mesh;
  }
  const canopySoffit = canopySection('Post-free canopy warm-white soffit - engineering required',
    patioRoofLeft, patioRoofRight, livingPatioBounds.rear, patioRoofFront,
    canopySoffitBottomAt, (z) => canopySoffitBottomAt(z) + 0.06);
  canopySoffit.name = 'Post-free canopy warm-white soffit - engineering required';
  canopySoffit.userData = { structuralApproval: false, framingAndBackspanDesigned: false, finishOnly: true };
  const canopyLightXs = [patioRoofCenterX - patioRoofWidth / 4, Math.min(patioRoofCenterX + patioRoofWidth / 4, 9.5)];
  for (const [x, z] of [...canopyLightXs.map(x => [x, livingPatioCenterZ]), [3.3, 0.8]]) {
    canopySection('Canopy downlight sloped mounting plate', x - 0.16, x + 0.16,
      z - 0.16, z + 0.16, () => canopySoffitBottomAt(z) - 0.04, canopySoffitBottomAt, dark);
  }
  for (const x of [patioRoofLeft, patioRoofRight - 0.1]) {
    canopySection('Cantilever canopy side fascia - concept depth only', x, x + 0.1,
      livingPatioBounds.rear, patioRoofFront, canopySoffitBottomAt, patioRoofUndersideAt);
  }
  canopySection('Cantilever canopy outer fascia', patioRoofLeft, patioRoofRight,
    livingPatioBounds.rear, livingPatioBounds.rear + 0.1, canopySoffitBottomAt, patioRoofUndersideAt);
  canopySection('Canopy closed house abutment', patioRoofLeft, patioRoofRight,
    7.98, 8.08, canopySoffitBottomAt, patioRoofUndersideAt);
  canopySection('Canopy dining-wall stepped abutment flashing', patioRoofRight - 0.02, patioRoofRight + 0.04,
    livingPatioBounds.rear, 7.5,
    (z) => Math.min(patioRoofUndersideAt(z) + 0.16, 9.2),
    (z) => Math.max(patioRoofUndersideAt(z) + 0.2, 9.2) + 0.15, dark);
  canopySection('Canopy house counterflashing - waterproofing concept', patioRoofLeft, patioRoofRight,
    7.94, 8.02, (z) => patioRoofUndersideAt(z) + 0.16,
    (z) => patioRoofUndersideAt(z) + 0.55, dark);
  // Open trough, falling east to a wall-mounted leader, not a new patio post.
  const gutterRear = livingPatioBounds.rear - 0.3;
  const gutterFront = livingPatioBounds.rear;
  const gutterHigh = patioRoofUndersideAt(livingPatioBounds.rear) - 0.12;
  const gutterEndX = patioRoofRight + 0.3;
  function gutterPart(name, x, z, width, height, depth, offset) {
    const mesh = box(livingPatio, x, gutterHigh - x / 192 + offset, z, width, height, depth, trim);
    // Fall along x; constituent geometry is measured in regression tests.
    mesh.rotation.z = -Math.atan(1 / 192);
    mesh.name = name;
    return mesh;
  }
  gutterPart('Canopy gutter trough base', gutterEndX / 2, (gutterRear + gutterFront) / 2, gutterEndX, 0.04, 0.3, -0.2);
  for (const z of [gutterRear, gutterFront]) gutterPart('Canopy gutter upstand', gutterEndX / 2, z, gutterEndX, 0.22, 0.04, -0.11);
  for (const x of [0.02, gutterEndX - 0.02]) gutterPart('Canopy gutter end closure', x, (gutterRear + gutterFront) / 2, 0.04, 0.22, 0.3, -0.11);
  const leaderTop = gutterHigh - gutterEndX / 192 - 0.2;
  box(livingPatio, gutterEndX - 0.08, (leaderTop + patioGrade - 0.3) / 2, gutterRear + 0.15,
    0.14, leaderTop - patioGrade + 0.3, 0.14, trim).name = 'Canopy dining-wall rainwater leader - drain design required';
  for (const y of [1, 5, 8]) box(livingPatio, gutterEndX - 0.08, y, -0.47, 0.22, 0.08, 0.3, dark).name = 'Canopy leader wall bracket';
  patioRoof.userData.drainageIntent = 'East-falling open gutter to dining-wall leader; below-grade outlet placeholder, capacity and stormwater design unverified';
  // The upstairs bathroom occupies this footprint. Roof skin, deep soffit,
  // fascia and headwall previously continued through its floor/walls.
  // Keep the accepted canopy outside that volume; its coverage here is
  // supplied by the existing upper projection, not a second crossing roof.
  const projectionBounds = [9.975, 25.925, 1.875, 8.225];
  const canopyParts = [];
  livingPatio.traverse(part => {
    if (part.isMesh && (part === patioRoof || /soffit|fascia|abutment|tapered closure/i.test(part.name))) canopyParts.push(part);
  });
  const raisedHeadwall = group.getObjectByName('Exterior brick wall: Patio roof raised headwall');
  raisedHeadwall.traverse(part => { if (part.isMesh) canopyParts.push(part); });
  for (const part of canopyParts) {
    part.updateWorldMatrix(true, false);
    const input = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry;
    const p = input.attributes.position, uv = input.attributes.uv, triangles = [];
    for (let i = 0; i < p.count; i += 3) {
      triangles.push([0, 1, 2].map(j => {
        const point = part.localToWorld(new THREE.Vector3().fromBufferAttribute(p, i + j));
        return [...point.toArray(), uv ? uv.getX(i + j) : 0, uv ? uv.getY(i + j) : 0];
      }));
    }
    const clipped = HomeRoof.trianglesOutsideRectangle(triangles, projectionBounds);
    const positions = [], textureUV = [];
    for (const triangle of clipped) for (const vertex of triangle) {
      positions.push(...part.worldToLocal(new THREE.Vector3(...vertex.slice(0, 3))).toArray());
      textureUV.push(...vertex.slice(3));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(textureUV, 2));
    geometry.computeVertexNormals();
    if (input !== part.geometry) input.dispose();
    part.geometry.dispose();
    part.geometry = geometry;
  }
  canopySection('Canopy upper-projection west wall counterflashing', 9.94, 10.01, 1.875, 8.08,
    z => patioRoofUndersideAt(z) + 0.16, z => patioRoofUndersideAt(z) + 0.5, dark);
  canopySection('Canopy upper-projection north wall counterflashing', 9.975, 13.2, 1.84, 1.91,
    z => patioRoofUndersideAt(z) + 0.16, z => patioRoofUndersideAt(z) + 0.5, dark);
  const patioTableX = 3.5;
  const patioTableZ = 6.65;
  const patioFurniture = new THREE.Group();
  patioFurniture.name = 'Two patio chairs and small side table';
  patioFurniture.userData = { seats: 2, tableWidthInches: 18, tableDepthInches: 18, tableHeightInches: 20, productSelected: false, occupiedAccessVerified: false };
  patioFurniture.position.y = patioGrade;
  livingPatio.add(patioFurniture);
  const patioTableHeight = 20 / 12;
  box(patioFurniture, patioTableX, patioTableHeight - 0.05, patioTableZ, 1.5, 0.1, 1.5, wood).name = 'Outdoor small side table';
  for (const x of [patioTableX - 0.55, patioTableX + 0.55]) for (const z of [patioTableZ - 0.55, patioTableZ + 0.55]) box(patioFurniture, x, (patioTableHeight - 0.1) / 2, z, 0.1, patioTableHeight - 0.1, 0.1, dark).name = 'Outdoor table leg';
  for (const x of [patioTableX - 1.9, patioTableX + 1.9]) {
    box(patioFurniture, x, 1.4, patioTableZ, 1.7, 0.18, 1.7, white).name = 'Outdoor patio chair';
    box(patioFurniture, x, 2.05, patioTableZ + 0.75, 1.7, 1.2, 0.12, wood).name = 'Outdoor patio chair back';
    for (const side of [-0.65, 0.65]) box(patioFurniture, x + side, 0.65, patioTableZ, 0.1, 1.3, 1.4, dark).name = 'Outdoor patio chair side frame';
  }
  const portableFirepit = new THREE.Group();
  portableFirepit.name = 'Portable firepit - uncovered patio cold storage only';
  // Keep the entire cold-storage footprint on flat terrace as the west path moves.
  portableFirepit.position.set(-3.5, patioGrade, livingTerraceRear + 2);
  portableFirepit.userData = { diameterInches: 30.72, heightInches: 19.56, provisional: true, modelSelected: false, fuel: 'Wood assumed; model unconfirmed', coldStorageOnly: true, operationApproved: false, useClearanceSatisfied: false, localPortableClearanceFeet: 15, outsideRoofFootprint: true, manufacturerClearanceVerified: false, instruction: 'Uncovered outer patio corner is for fully extinguished, cold storage only. Being outside the roof does not meet the Birmingham 15-foot separation from structures and combustible materials, including the nearby roof and cedar fence. Do not light here or under the patio roof. Confirm the selected unit instructions and site with the Fire Department before any use.' };
  group.add(portableFirepit);
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
  // Rack feet now bear on the continuous east-side paving, not a second pad.
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

  function exteriorSteps(parent, name, x, startZ, direction, width, { riseFeet = 0.45, baseFeet = -1.65, treadCount = 3, goingFeet = 1.1, flareFeet = 0.4, flushNosing = false } = {}) {
    const steps = new THREE.Group();
    steps.name = name;
    steps.userData = { risers: 3, riseFeet, goingFeet, contrastNosing: true, provisional: true };
    parent.add(steps);
    for (let step = 0; step < treadCount; step++) {
      const top = -(step + 1) * riseFeet;
      const z = startZ + direction * (step * goingFeet + goingFeet / 2);
      box(steps, x, (top + baseFeet) / 2, z, width + step * flareFeet, top - baseFeet, goingFeet, stepStone).name = 'Darker stone entry tread';
      box(steps, x, top + (flushNosing ? -0.025 : 0.025), z + direction * (goingFeet / 2 - 0.07), width + step * flareFeet, 0.05, 0.14, stepEdge).name = 'Contrasting step nosing';
      box(steps, x, -step * riseFeet - 0.16, startZ + direction * (step * goingFeet + 0.015), 0.6, 0.08, 0.03, glow).name = 'Shielded warm step marker';
      const wash = new THREE.PointLight('#ffd09a', 1.4, 3, 2);
      wash.name = 'Shielded warm entry-step wash';
      wash.position.set(x, -step * riseFeet - 0.16, startZ + direction * (step * goingFeet + 0.06));
      steps.add(wash);
    }
  }
  const livingAccess = new THREE.Group();
  livingAccess.name = 'Dining west door to covered patio access';
  livingAccess.position.set(diningLandingLeft + diningPatioStairWidth / 2, 0, diningLandingRear);
  livingPatio.add(livingAccess);
  exteriorSteps(livingAccess, 'Covered dining patio steps', 0, 0, -1, diningPatioStairWidth, { riseFeet: -patioGrade / 3, baseFeet: patioGrade - 0.3, treadCount: 2, flareFeet: 0, flushNosing: true });
  paving(group, 'Covered front porch', 0, 54.2, 31.2, 7, 0, 1.65, palePaving);
  const porchPaving = group.getObjectByName('Covered front porch');
  const porchFoundation = brickBox(group, 15.6, -0.825, 57.7, 31.2, 1.65, 7, true);
  porchFoundation.name = 'Red-brown brick porch exposed foundation';
  const porchTop = palePaving.clone();
  porchTop.map = palePaving.map.clone();
  porchTop.map.repeat.set(1, 1);
  const porchUV = porchFoundation.geometry.attributes.uv, porchPositions = porchFoundation.geometry.attributes.position, porchNormals = porchFoundation.geometry.attributes.normal;
  for (let i = 0; i < porchPositions.count; i++) if (porchNormals.getY(i) > 0.5) porchUV.setXY(i, porchPositions.getX(i) / 4, porchPositions.getZ(i) / 4);
  porchFoundation.material = [porchFoundation.material, porchFoundation.material, porchTop, porchFoundation.material, porchFoundation.material, porchFoundation.material];
  porchPaving.visible = false; // Same solid envelope; pale top, brick vertical faces.
  porchPaving.userData.finishReview = 'Pale stone paving contrast; wall veneer is not approved paving. Verify exterior slip, frost, drainage and nosing products';
  const porchPillars = [];
  for (const x of [1, 11.65, 19.55, 30.2]) {
    const height = 9.7;
    const entryColumn = x === 11.65 || x === 19.55;
    const width = 1;
    const pillar = box(group, x, height / 2, 60.5, width, height, width, porchColumnFinish);
    pillar.name = 'White farmhouse porch column';
    pillar.userData = { entryColumn, widthInches: width * 12, heightFeet: height, provisional: true };
    porchPillars.push(pillar);
    brickBox(group, x, 1.25, 60.5, 7 / 6, 2.5, 7 / 6, true).name = 'Red-brown brick porch-column base';
    box(group, x, 2.55, 60.5, 1.25, 0.1, 1.25, trim).name = 'Limestone column base coping';
    box(group, x, 9.6, 60.5, 1.25, 0.2, 1.25, trim).name = 'White porch column capital';
  }
  // Deep, flat-headed entry portal beneath the retained single roof plane.
  // Preserve the existing posts/support positions and the full central approach.
  const entryPortal = new THREE.Group();
  entryPortal.name = 'Deep limestone entrance portal - support concept';
  entryPortal.userData = { supportApproved: false, beamUndersideFeet: 8.9, clearWidthFeet: 6.65 };
  group.add(entryPortal);
  for (const x of [11.65, 19.55]) {
    box(entryPortal, x, 5.75, 60.5, 1, 6.3, 1, trim).name = 'Entry portal masonry pier jacket';
    brickBox(entryPortal, x, 0.1, 60.5, 1.25, 0.2, 1.25, true).name = 'Entry portal brick foot';
    box(entryPortal, x, 8.8, 60.5, 1.25, 0.2, 1.25, trim).name = 'Entry portal impost';
  }
  box(entryPortal, 15.6, 9.3, 60.5, 9.15, 0.8, 1.25, trim).name = 'Entry portal deep stone entablature';
  // Recessed inner face makes the structural depth legible from street eye.
  box(entryPortal, 15.6, 9.03, 61.08, 6.65, 0.16, 0.12, porchColumnFinish).name = 'Entry portal recessed lintel face';
  const porchCanopyHeight = 10.5, porchCanopyAngle = 0.13, porchCanopyThickness = 0.22, porchCanopyCenterZ = 57.5;
  function porchCanopyUndersideAt(z) {
    return porchCanopyHeight - (z - porchCanopyCenterZ) * Math.tan(porchCanopyAngle) - porchCanopyThickness / 2 / Math.cos(porchCanopyAngle);
  }
  function fitTrimTopToPorchRoof(part) {
    const positions = part.geometry.attributes.position;
    for (let index = 0; index < positions.count; index++) {
      if (positions.getY(index) > 0) positions.setY(index, porchCanopyUndersideAt(part.position.z + positions.getZ(index)) - part.position.y);
    }
    part.geometry.computeVertexNormals();
    part.userData.topFollowsPorchUnderside = true;
    return part;
  }
  const porchMetal = mat('#665e4f', 0.65);
  const porchRoof = renderRoofEnvelope('Connected standing-seam porch and entry roof', HomeRoof.getPorchRoofDefinitions(), porchMetal, true);
  const garageCanopy = renderRoofEnvelope('Stepped garage metal canopy and porch return', HomeRoof.getGarageCanopyDefinitions(), porchMetal, true);
  const garageCanopyPlan = HomeRoof.buildRoofEnvelope(HomeRoof.getGarageCanopyDefinitions());
  // Match the porch's white 3.6-inch fascia; close every exposed brow edge
  // and collect the low edge rather than leaving a floating metal sheet.
  for (const edge of garageCanopyPlan.boundaries) {
    const a = new THREE.Vector3(...edge.start), b = new THREE.Vector3(...edge.end);
    const direction = b.clone().sub(a);
    const part = box(garageCanopy, (a.x + b.x) / 2, (a.y + b.y) / 2 - 0.31, (a.z + b.z) / 2,
      direction.length(), 0.3, 0.18, trim);
    part.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.normalize());
    part.name = 'Garage metal canopy closed white fascia';
    if (Math.abs(a.y - b.y) < 0.01 && a.z > 51) {
      box(garageCanopy, (a.x + b.x) / 2, a.y - 0.08, a.z + 0.12, Math.abs(b.x - a.x), 0.18, 0.24, trim).name = 'Garage brow low-edge gutter';
    }
  }
  box(garageCanopy, 55.8, 8.14, 50.3, 0.16, 0.16, 2.16, trim).name = 'Garage brow gutter return to wall leader';
  box(garageCanopy, 55.8, 3.245, 49.3, 0.16, 9.79, 0.16, trim).name = 'Garage brow rainwater leader concept';
  // Closed stepped wall abutment at the porch end; no invented level
  // roof or new support post between the two different wall heights.
  const canopyStepBottom = 7.55 - 0.16;
  const canopyStepTop = porchCanopyUndersideAt(54.22);
  fitTrimTopToPorchRoof(box(garageCanopy, 30.4375, (canopyStepBottom + canopyStepTop) / 2, 54.16,
    1.075, canopyStepTop - canopyStepBottom, 0.12, trim)).name = 'Canopy stepped porch-end closure and flashing concept';
  garageCanopy.userData = { supportConcept: 'Wall-ledger and outriggers; connections and garage header loads not designed',
    drainageIntent: 'Brow gutter to east leader; return falls to porch-end collector, outlets unverified', constructionApproved: false };
  fitTrimTopToPorchRoof(box(group, 15.6, 9.95, 60.5, 32.5, 0.5, 0.7, trim)).name = 'Raised farmhouse porch header clear of eight-foot door';
  const porchFasciaZ = 62.15, porchFasciaDepth = 0.3, porchFasciaHeight = 0.3;
  const porchFasciaTop = porchCanopyUndersideAt(porchFasciaZ + porchFasciaDepth / 2);
  box(group, 15.6, porchFasciaTop - porchFasciaHeight / 2, porchFasciaZ, 32.5, porchFasciaHeight, porchFasciaDepth, trim).name = 'White farmhouse porch fascia';
  for (const center of [37, 48.5]) {
    const assembly = new THREE.Group();
    assembly.name = 'Natural oak carriage garage door with white surround';
    assembly.position.set(center, garageFloorY, 49);
    assembly.userData = { openingWidthFeet: 9, openingHeightFeet: 8, doorColor: '#c6a274', surroundColor: '#eee3ce', sideTrimInches: 6, headerTrimInches: 8, trimDepthInches: 3, provisional: true };
    group.add(assembly);
    const garageLeaf = new THREE.Group();
    garageLeaf.name = 'Conceptual overhead garage door leaf';
    garageLeaf.position.set(0, 8, 0.28);
    garageLeaf.userData = { interactiveHouseDoor: { operation: 'overhead', open: false, maxAngleDegrees: 90 } };
    assembly.add(garageLeaf);
    box(garageLeaf, 0, -4, 0, 9, 8, 0.16, garageDoorFinish).name = 'Natural oak carriage-style garage door';
    for (let panel = 0; panel < 6; panel++) box(garageLeaf, -3.75 + panel * 1.5, -5, 0.11, 0.06, 5.6, 0.05, garageDoorDetail).name = 'Natural wood garage door panel detail';
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
    const metal = parent === group ? dark : mat('#aa8240', 0.45);
    if (parent !== group) metal.metalness = 0.65;
    box(fixture, 0, 0, -0.18, 0.24, 0.6, 0.08, metal).name = 'Exterior lantern wall backplate';
    box(fixture, 0, 0, 0, 0.32, 0.8, 0.25, glow).name = 'Warm exterior lantern';
    for (const side of [-1, 1]) box(fixture, side * 0.19, 0, 0.04, 0.04, 0.9, 0.3, metal);
    for (const dy of [-0.48, 0.48]) box(fixture, 0, dy, 0, 0.48, 0.1, 0.4, metal);
    const light = new THREE.PointLight('#ffcf8c', 15, 7, 2);
    light.position.set(0, 0, 0.4);
    fixture.add(light);
  }
  for (const pillar of porchPillars.filter((column) => column.userData.entryColumn)) lantern(pillar, 0, 5.8 - pillar.position.y, 0.72);
  for (const x of [37, 48.5]) lantern(group, x, 8.7, 49.7);
  brickBox(group, 15.6, -0.15, 61.275, 10.8, 0.3, 0.15, true).name = 'Entry landing brick nose';
  exteriorSteps(group, 'Contrasting front entry steps', 15.6, 61.35, 1, 10.8, { riseFeet: 0.45, baseFeet: -1.65, treadCount: 3, goingFeet: 1.05, flareFeet: 0, flushNosing: true });
  const frontSteps = group.getObjectByName('Contrasting front entry steps');
  for (const tread of frontSteps.children.filter((part) => part.name === 'Darker stone entry tread')) {
    const brick = baseBrick.clone();
    brick.map = baseBrick.map.clone();
    brick.map.repeat.set(1, 1);
    for (const key of ['normalMap', 'roughnessMap']) if (brick[key]) {
      brick[key] = brick[key].clone();
      brick[key].repeat.set(1, 1);
    }
    const positions = tread.geometry.attributes.position, normals = tread.geometry.attributes.normal, uv = tread.geometry.attributes.uv;
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index) + tread.position.x, y = positions.getY(index) + tread.position.y, z = positions.getZ(index) + tread.position.z;
      const horizontal = Math.abs(normals.getY(index)) > 0.5;
      uv.setXY(index, (Math.abs(normals.getX(index)) > 0.5 ? z : x) / (horizontal ? 4 : brickTextureWidthFeet), (horizontal ? z : y) / (horizontal ? 4 : brickTextureHeightFeet));
    }
    uv.needsUpdate = true;
    tread.material = [brick, brick, palePaving, brick, brick, brick];
    tread.name = 'Pale stone front-entry tread with red-brown brick risers';
  }
  const driveway = new THREE.Group();
  driveway.name = 'Garage driveway concept';
  group.add(driveway);
  const drivewayMaterial = mat('#c6c0ae');
  const drivewayLeft = 30.9;
  const drivewayWidth = 25;
  box(driveway, drivewayLeft + drivewayWidth / 2, garageFloorY - 0.18, (49 + lot.front) / 2, drivewayWidth, 0.16, lot.front - 49, drivewayMaterial).name = 'Continuous garage driveway and pedestrian crossing';
  const paths = new THREE.Group();
  paths.name = 'Fence-edge perimeter walkway';
  const westFenceReturnZ = westFrontWindowCenterZ - westFrontWindowWidth / 2 - 2;
  const eastFenceReturnZ = garageSideDoorCenterZ - garageSideDoorWidth / 2 - 3;
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
  // Owner photo: fill only the house-side strip, not the rear garden.
  // Finish at the innermost rail face derived from the same fence section.
  const eastStripRight = fenceRight - fenceRailOffset - fenceRailDepth / 2;
  const eastStripRear = 7;
  addWalk('Full east side-yard paver infill', eastWallFaceX, eastStripRear, eastStripRight - eastWallFaceX, garageApproachFrontZ - eastStripRear);
  paths.userData.eastStrip = {
    left: eastWallFaceX, right: eastStripRight, rear: eastStripRear, front: garageApproachFrontZ,
    topFeet: -1.35,
    areaSquareFeet: (eastStripRight - eastWallFaceX) * (garageApproachFrontZ - eastStripRear),
    review: 'Continuous matching pavers to inner fence rail plane; no lawn strip. Edge restraint, isolation joints at masonry/posts, drainage away from house, downspout discharge, frost base and permeability require site design; no code or accessible-route approval.'
  };
  paths.userData.placement = 'Rear/west fence paths retained; east house-side strip fully paved, including storage and door approach; rear garden unchanged';
  addWalk('East gate to garage side door', 56.5, eastGateApproachZ, pathWidth, garageApproachFrontZ - eastGateApproachZ);
  addWalk('Garage side door threshold connector', 55.725, garageSideDoorCenterZ - garageSideDoorWidth / 2, 56.5 - 55.725, garageSideDoorWidth);
  addWalk('Garage driveway to side path connector', drivewayLeft + drivewayWidth, 49, 56.5 - drivewayLeft - drivewayWidth, pathWidth);
  addWalk('Front paver walk west of driveway', westPaverEdgeX, 64.5, drivewayLeft - westPaverEdgeX, pathWidth);
  // Bounded follow-up interpretation: west of the raised porch only, not the front lawn.
  const westPorchPocket = {
    left: westPaverEdgeX + pathWidth, right: -wallThickness / 2,
    rear: 54.2, front: 64.5
  };
  addWalk('West porch pocket paver infill', westPorchPocket.left, westPorchPocket.rear,
    westPorchPocket.right - westPorchPocket.left, westPorchPocket.front - westPorchPocket.rear);
  paths.userData.westPorchPocket = {
    ...westPorchPocket, topFeet: -1.35,
    areaSquareFeet: (westPorchPocket.right - westPorchPocket.left) * (westPorchPocket.front - westPorchPocket.rear),
    assumedLocation: true,
    review: 'Reversible photo interpretation, west porch-side pocket only. Porch remains raised at y=0; this is not a step-free connection. Review porch-edge transition, isolation, frost base and drainage away from masonry before construction.'
  };
  paths.userData.placement = 'Rear/west fence paths retained; east strip and bounded west porch-side pocket paved; gardens and open front lawn retained';
  const patioConnectorX = livingTerraceRight;
  const patioRampEndX = eastPaverEdgeX - pathWidth;
  const patioRampX = patioRampEndX - 3;
  paving(paths, 'Ground-level patio garden connector', patioConnectorX, patioBounds.rear - pathWidth, patioRampX - patioConnectorX, pathWidth, patioGrade);
  const patioRamp = paving(paths, 'Patio connector grade transition', patioRampX, patioBounds.rear - pathWidth, 3, pathWidth, patioGrade);
  const rampPositions = patioRamp.geometry.attributes.position;
  for (let index = 0; index < rampPositions.count; index++) rampPositions.setY(index, rampPositions.getY(index) + (rampPositions.getX(index) + 1.5) / 3 * (-1.35 - patioGrade));
  rampPositions.needsUpdate = true;
  patioRamp.geometry.computeVertexNormals();
  patioRamp.userData = { ...patioRamp.userData, startTopFeet: patioGrade, endTopFeet: -1.35, slopeVerified: false };
  const lawn = new THREE.Shape();
  lawn.moveTo(lot.left, -lot.rear);
  lawn.lineTo(lot.right, -lot.rear);
  lawn.lineTo(lot.right, -lot.front);
  lawn.lineTo(lot.left, -lot.front);
  lawn.closePath();
  const patioCutout = new THREE.Path();
  for (const [index, [x, z]] of [
    [livingTerraceLeft, livingTerraceRear], [livingTerraceLeft, livingTerraceFront],
    [livingTerraceRight, livingTerraceFront], [livingTerraceRight, livingPatioBounds.rear],
    [terraceLeft, patioBounds.rear], [terraceLeft, terraceFront],
    [patioBounds.right, terraceFront], [patioBounds.right, patioBounds.rear],
    [patioRampEndX, patioBounds.rear], [patioRampEndX, patioBounds.rear - pathWidth],
    [patioConnectorX, patioBounds.rear - pathWidth], [patioConnectorX, livingTerraceRear]
  ].entries()) {
    if (index === 0) patioCutout.moveTo(x, -z);
    else patioCutout.lineTo(x, -z);
  }
  patioCutout.closePath();
  lawn.holes.push(patioCutout);
  const lawnGeometry = new THREE.ShapeGeometry(lawn);
  const lawnMaterial = mat('#83936b');
  if (masonryMaps?.grass) {
    Object.assign(lawnMaterial, masonryMaps.grass);
    lawnMaterial.color.set('#bdd596');
    lawnMaterial.normalScale.set(0.2, 0.2);
    const positions = lawnGeometry.attributes.position;
    const uv = lawnGeometry.attributes.uv;
    for (let index = 0; index < positions.count; index++) uv.setXY(index, (positions.getX(index) - lot.left) / 12, (-positions.getY(index) - lot.rear) / 12);
    uv.needsUpdate = true;
  }
  const lawnMesh = new THREE.Mesh(lawnGeometry, lawnMaterial);
  lawnMesh.name = '75 by 130 ft lot lawn, not surveyed grade';
  lawnMesh.rotation.x = -Math.PI / 2;
  lawnMesh.position.y = patioGrade;
  group.add(lawnMesh);
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
  lighting.userData = { colorTemperatureKelvin: 2700, shielded: true, photometryVerified: false, glareAndSpillVerified: false, productSelected: false, controls: 'Night/Day preview; dimmable patio and porch, motion-boost drive and side access are design intent only; no path-post lights' };
  group.add(lighting);
  function downlight(name, x, y, z, targetX = x, targetZ = z, intensity = 22, targetY = -1.35) {
    const fixture = new THREE.Group();
    fixture.name = name;
    fixture.userData = { mount: 'ceiling', colorTemperatureKelvin: 2700, downwardOnly: true, productSelected: false, photometryVerified: false };
    fixture.position.set(x, y, z);
    lighting.add(fixture);
    box(fixture, 0, 0, 0, 0.3, 0.15, 0.3, dark);
    box(fixture, 0, -0.09, 0, 0.2, 0.025, 0.2, glow);
    const light = new THREE.SpotLight('#ffd09a', intensity, 16, Math.PI / 3.2, 0.65, 2);
    light.name = `${name} light source`;
    light.position.set(x, y - 0.15, z);
    light.target.position.set(targetX, targetY, targetZ);
    lighting.add(light, light.target);
    return fixture;
  }
  function wallDownlight(name, x, y, z, rotation, targetX, targetZ, intensity = 22, targetY = -1.35) {
    const fixture = downlight(name, x, y, z, targetX, targetZ, intensity, targetY);
    fixture.rotation.y = rotation;
    fixture.userData.mount = 'wall';
    box(fixture, 0, 0, -0.2, 0.3, 0.3, 0.1, dark).name = 'Exterior downlight wall backplate';
    return fixture;
  }
  function canopyDownlight(name, x, z, targetX = x, targetZ = z, intensity = 22) {
    const fixture = downlight(name, x, canopySoffitBottomAt(z) - 0.115, z, targetX, targetZ, intensity, patioGrade);
    // Slope-fitting mounting plate; fixture and beam remain vertical.
    return fixture;
  }
  for (const x of canopyLightXs) canopyDownlight('Shielded warm patio ceiling light', x, livingPatioCenterZ);
  canopyDownlight('Open-patio approach ceiling light', 3.3, 0.8, 0, -2, 26);
  for (const x of [4.2, 26.5]) downlight('Front porch approach ceiling light', x, porchCanopyUndersideAt(58.5) - 0.075, 58.5, x, 60.5, 24, 0);
  wallDownlight('Front door wall downlight', 15.6, 8.6, 54.875, 0, 15.6, 59.5, 26, 0);
  wallDownlight('Driveway motion-boost downlight', 43, 8.6, 49.475, 0, 43, 58, 32);
  for (const z of [14, 28]) wallDownlight('West side-path wall downlight', -0.475, 8.6, z, -Math.PI / 2, westGateCenterX, z, 30);
  wallDownlight('West side-entry downlight', -0.475, 8.6, 42, -Math.PI / 2, westGateCenterX, westFenceReturnZ, 30);
  for (const z of [18, 31]) wallDownlight('East side-path wall downlight', 55.975, 8.6, z, Math.PI / 2, 58.25, z, 26);
  wallDownlight('East side-entry downlight', 55.975, 8.6, garageSideDoorCenterZ, Math.PI / 2, 58.25, eastFenceReturnZ, 26);
  wallDownlight('Dining patio steps wall downlight', 12.725, 8.2, 1, -Math.PI / 2, 10.95, 0.85, 26, -1.1);
  wallDownlight('Rear dining path wall downlight', 20.0375, 8.6, -0.575, Math.PI, 20.0375, -3, 22, patioGrade);
  wallDownlight('Rear kitchen garden wall downlight', 38.75, 8.6, 6.525, Math.PI, 32, -1.75, 24, patioGrade);
  wallDownlight('Rear prep garden wall downlight', 53.5, 8.6, 6.525, Math.PI, 47.4, -1.75, 24, patioGrade);
  // Mount in the actual closed upper-roof underside, not at a guessed eave Y.
  const upperSoffitPlan = HomeRoof.buildRoofEnvelope(HomeRoof.getConnectedRoofDefinitions(floorToFloor)
    .filter(({ id }) => ['Main house', 'East rear wing'].includes(id)));
  const upperSoffitPositions = [
    ...[3.5, 10, 21, 27.5].map(x => [x, 54.3]),
    ...[12, 25, 40, 49].map(z => [-0.5, z]),
    [15, 1.65], [22, 1.65], [52.4, 22], [52.4, 32]
  ];
  for (const [index, [x, z]] of upperSoffitPositions.entries()) {
    const face = upperSoffitPlan.faces.find(face => HomeRoof.contains(face.polygon, [x, z]));
    if (!face) throw new Error('Upper soffit fixture is outside the roof');
    const underside = HomeRoof.heightAt(face.plane, [x, z]) - 0.16;
    const fixture = downlight(`Upper soffit recessed light ${index + 1}`, x, underside, z, x, z, 10, underside - 6);
    fixture.userData.mount = 'upper soffit recessed';
    fixture.userData.soffitUndersideFeet = underside;
    fixture.userData.installationReview = 'Wet-location product, driver access, ventilation and framing clearances required; not a cutout approval';
    const [housing, lens] = fixture.children;
    housing.material = white;
    housing.scale.y = 0.4;
    housing.position.y = 0.025;
    lens.position.y = -0.01;
  }
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
    { id: 'C3', purpose: 'Covered living-room patio, wall-mounted after post removal', position: [12.9, 8, 6.65], aim: [5, 1] },
    { id: 'C4', purpose: 'Rear lawn and rear fence approach', position: [25.8, 8.5, -0.5], aim: [22, -23] },
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
  const frontShrubCount = 5;
  const frontBedEdge = mat('#b8b09e', 0.9);
  const lowFoliage = mat('#839277', 0.95);
  for (const [name, left, right] of [['West front porch mulch bed', 0, 10.7], ['East front porch mulch bed', 20.5, drivewayLeft]]) {
    const bed = box(group, (left + right) / 2, -1.65, (61.2 + 64.5) / 2, right - left, 0.1, 64.5 - 61.2, mulch);
    bed.name = name;
    bed.userData = { surface: 'Brown mulch / soil planting bed', limits: { left, right, rear: 61.2, front: 64.5 }, topFeet: -1.6 };
    const edgeInset = frontShrubRadius + 0.2;
    for (let index = 0; index < frontShrubCount; index++) {
      const shrub = new THREE.Mesh(new THREE.SphereGeometry(frontShrubRadius, 10, 8), foliage);
      shrub.name = 'Front mulch-bed shrub';
      shrub.position.set(left + edgeInset + index * (right - left - 2 * edgeInset) / (frontShrubCount - 1), bed.userData.topFeet + frontShrubRadius, 62.35);
      shrub.userData = { plantingBed: name, baseFeet: bed.userData.topFeet, provisional: true };
      group.add(shrub);
    }
    // Keep every constituent inside the existing beds, not in the step approach,
    // front walk or driveway. Low foreground masses soften the rigid ball row.
    for (let index = 0; index < 7; index++) {
      const plant = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), lowFoliage);
      plant.name = 'Low front-bed planting mound';
      plant.scale.set(0.42, 0.34, 0.42);
      plant.position.set(left + 0.7 + index * (right - left - 1.4) / 6, bed.userData.topFeet + 0.34, 63.85);
      plant.userData = { plantingBed: name, provisional: true, speciesAndMatureSpreadUnselected: true };
      group.add(plant);
    }
    // Two-inch coping stays within the soil footprint; no raised walk obstruction.
    const edge = box(group, (left + right) / 2, -1.6, 64.5 - 1 / 12,
      right - left, 0.16, 1 / 6, frontBedEdge);
    edge.name = 'Front planting-bed stone edge';
    edge.userData = { plantingBed: name, drainageAndFrostDetailRequired: true };
    for (const x of [left + 1 / 12, right - 1 / 12]) {
      box(group, x, -1.6, (61.2 + 64.5 - 1 / 6) / 2,
        1 / 6, 0.16, 3.3 - 1 / 6, frontBedEdge).name = 'Front planting-bed stone edge return';
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
