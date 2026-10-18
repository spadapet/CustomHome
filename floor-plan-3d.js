const viewport = document.getElementById('model-viewport');
const message = viewport.querySelector('.model-message');
const viewButtons = document.querySelectorAll('[data-view]');
const islandLightsInput = document.getElementById('show-island-lights');
const resetButton = document.getElementById('reset-view');
const freezerButton = document.getElementById('freezer-swing');
const navigationButtons = document.querySelectorAll('[data-navigation]');
const notesButton = document.getElementById('toggle-design-notes');
const notes = document.getElementById('design-notes');

function setRoomMenuVisible(visible) {
  notes.hidden = !visible;
  document.querySelector('.design-workspace').classList.toggle('notes-hidden', !visible);
  notesButton.setAttribute('aria-expanded', String(visible));
  notesButton.textContent = visible ? 'Hide room menu' : 'Show room menu';
}

notesButton.addEventListener('click', () => setRoomMenuVisible(notes.hidden));
document.getElementById('close-design-notes').addEventListener('click', () => {
  setRoomMenuVisible(false);
  notesButton.focus();
});

document.querySelectorAll('.furniture-photo img').forEach((image) => {
  function showPhotoError() {
    image.removeEventListener('error', showPhotoError);
    console.error(`Furniture photo could not load: ${image.src}`);
    image.hidden = true;
    const notice = document.createElement('span');
    notice.className = 'photo-error';
    notice.textContent = 'Photo unavailable. Use the retailer link below to view this piece.';
    image.parentElement.append(notice);
  }
  image.addEventListener('error', showPhotoError, { once: true });
  if (image.complete && !image.naturalWidth) showPhotoError();
});

// A classic entry script also runs from file URLs; remote dependencies remain modules.
async function initializePreview() {
  try {
    const [THREE, { OrbitControls }, { RoundedBoxGeometry }] = await Promise.all([
      import('three'),
      import('three/addons/controls/OrbitControls.js'),
      import('three/addons/geometries/RoundedBoxGeometry.js')
    ]);
    buildPreview(THREE, OrbitControls, RoundedBoxGeometry);
  } catch (error) {
    console.error('The 3D floor plan could not start.', error);
    showModelError('The 3D preview could not load. WebGL and an internet connection to jsDelivr are required.');
  }
}

initializePreview();

function showModelError(text) {
  message.replaceChildren(document.createTextNode(text));
  const link = document.createElement('a');
  link.href = 'assets/ground-floor-3d-source.png';
  link.textContent = 'View your original floor plan instead';
  message.append(link);
  message.hidden = false;
  viewButtons.forEach((button) => { button.disabled = true; });
  islandLightsInput.disabled = true;
  resetButton.disabled = true;
  freezerButton.disabled = true;
  navigationButtons.forEach((button) => { button.disabled = true; });
}

function buildPreview(THREE, OrbitControls, RoundedBoxGeometry) {
  // Model coordinates are feet; the supplied raster is a concept trace, not CAD.
  const ceilingHeight = 9;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eeeee6');
  const perspectiveCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
  const cooktopElevationCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
  let camera = perspectiveCamera;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  viewport.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Furnished 3D concept of the supplied ground floor');
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-describedby', 'room-dimension-summary');
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.minDistance = 12;
  controls.maxDistance = 250;
  controls.maxPolarAngle = Math.PI / 2.12;
  controls.target.set(14, 0, 12);
  controls.addEventListener('change', render);
  function setNavigationMode(mode) {
    const moving = mode === 'move';
    controls.mouseButtons.LEFT = moving ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    controls.mouseButtons.RIGHT = moving ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
    controls.touches.ONE = moving ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    navigationButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.navigation === mode));
    });
    viewport.querySelector('.model-help').textContent = moving
      ? 'Drag to move | Right-drag to rotate | Scroll or pinch to zoom'
      : 'Drag to rotate | Right-drag to move | Scroll or pinch to zoom';
    viewport.setAttribute('aria-label', `3D ground floor. Drag to ${moving ? 'move' : 'rotate'}; scroll or pinch to zoom. Keyboard: left/right arrows rotate, plus/minus zoom, Home resets.`);
  }
  navigationButtons.forEach((button) => {
    button.addEventListener('click', () => setNavigationMode(button.dataset.navigation));
  });

  scene.add(new THREE.AmbientLight('#ffffff', 2.5));
  const studioFill = new THREE.PointLight('#ffffff', 650, 0, 2);
  studioFill.position.set(25, 32, 29);
  scene.add(studioFill);

  const mat = (color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });
  const cream = mat('#e9e0cd');
  const cushion = mat('#f3eddf');
  const tanLeather = mat('#a87549', 0.65);
  tanLeather.name = 'Warm tan leather upholstery - screen approximation';
  const tanLeatherCushion = mat('#b88558', 0.65);
  tanLeatherCushion.name = 'Light brown leather cushions - screen approximation';
  const oak = mat('#c2a071');
  const walnut = mat('#79543b');
  const black = mat('#30372f');
  const wallMaterial = mat('#d1c7b8');
  wallMaterial.name = 'Accessible Beige SW 7036 - screen approximation';
  const windowTrim = mat('#faf9f5');
  windowTrim.name = 'White interior window trim';
  const stone = mat('#c6c2af');
  const shellFloor = mat('#d9dcd1');
  const walls = [];
  const interiorFloorAreas = [];
  const shell = new THREE.Group();
  scene.add(shell);

  function box(parent, x, y, z, w, h, d, material, rounded = false) {
    const geometry = rounded ? new RoundedBoxGeometry(w, h, d, 3, Math.min(0.12, h / 3)) : new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function cylinder(parent, x, y, z, radius, height, material, topRadius = radius) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(topRadius, radius, height, 32), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const plankRows = 16;
  const plankWidth = 7 / 12;
  const woodTileWidth = 32;
  const woodTileDepth = plankRows * plankWidth;

  function woodTexture(planks = true) {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('A 2D canvas is required to create the oak finish.');
    let seed = 26;
    function random() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    const rows = planks ? plankRows : 1;
    const rowHeight = canvas.height / rows;
    ctx.fillStyle = planks ? '#88704e' : '#bca581';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < rows; row++) {
      const y = row * rowHeight;
      let x = planks ? -random() * 420 : 0;
      while (x < canvas.width) {
        const length = planks ? (4 + random() * 4) / woodTileWidth * canvas.width : canvas.width;
        const lightness = (planks ? 42 : 52) + random() * 3;
        const hue = 33 + random() * 3;
        const saturation = planks ? 29 : 26;
        const wash = ctx.createLinearGradient(0, y, 0, y + rowHeight);
        wash.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness - 0.8}%)`);
        wash.addColorStop(0.45, `hsl(${hue}, ${saturation - 1}%, ${lightness + 0.6}%)`);
        wash.addColorStop(1, `hsl(${hue}, ${saturation}%, ${lightness - 0.4}%)`);
        const endGap = planks ? 0.7 : 0;
        const rowGap = planks ? 0.6 : 0;
        ctx.fillStyle = wash;
        ctx.fillRect(x, y, length - endGap, rowHeight - rowGap);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, length - endGap, rowHeight - rowGap);
        ctx.clip();
        const knotX = length * (0.2 + random() * 0.6);
        const knotY = rowHeight * (0.25 + random() * 0.5);
        const phase = random() * Math.PI * 2;
        const hasKnot = planks && random() < 0.24;
        const grainCount = planks ? 85 : 96;
        for (let line = 0; line < grainCount; line++) {
          const lane = random() * rowHeight;
          const distance = lane - knotY;
          const bend = (distance < 0 ? -1 : 1) * Math.exp(-Math.abs(distance) / 13) * (hasKnot ? 10 : 4);
          ctx.strokeStyle = `rgba(69, 47, 25, ${(planks ? 0.025 : 0.08) + random() * (planks ? 0.09 : 0.14)})`;
          ctx.lineWidth = (planks ? 0.45 : 1.5) + random() * (planks ? 0.6 : 2);
          ctx.beginPath();
          for (let step = 0; step <= 40; step++) {
            const u = step / 40 * length;
            const wave = Math.sin(u / 65 + phase + lane / 22) * 1.1;
            const grainY = y + lane + wave + bend * Math.exp(-(((u - knotX) / 48) ** 2));
            if (step === 0) ctx.moveTo(x + u, grainY);
            else ctx.lineTo(x + u, grainY);
          }
          ctx.stroke();
        }
        if (hasKnot) {
          for (let ring = 4; ring >= 1; ring--) {
            ctx.beginPath();
            ctx.ellipse(x + knotX, y + knotY, ring * 4, ring * 0.95, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(73, 49, 27, ${0.16 - ring * 0.025})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
        ctx.restore();
        x += length;
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  }
  const wood = new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.95 });
  wood.name = 'Muted honey oak - photo-inspired screen approximation';
  const cabinetGrain = woodTexture(false);
  cabinetGrain.center.set(0.5, 0.5);
  cabinetGrain.rotation = Math.PI / 2;
  const cabinetFinish = new THREE.MeshStandardMaterial({ map: cabinetGrain, roughness: 0.6 });
  cabinetFinish.name = 'Stained white oak - vertical grain';
  const cabinetRailFinish = cabinetFinish.clone();
  cabinetRailFinish.name = 'Stained white oak - horizontal grain';
  cabinetRailFinish.map = cabinetGrain.clone();
  cabinetRailFinish.map.rotation = 0;
  const cabinetPanelFinish = cabinetFinish.clone();
  cabinetPanelFinish.name = 'Stained white oak - recessed panel';
  cabinetPanelFinish.color.set('#e6dccb');
  const brass = new THREE.MeshStandardMaterial({ color: '#b99a60', metalness: 0.65, roughness: 0.35 });
  brass.name = 'Satin gold hardware';

  function shakerFront(parent, x, y, z, width, height, rotation = 0) {
    const front = new THREE.Group();
    front.name = 'Full-overlay Shaker cabinet front';
    front.userData = { construction: 'Frameless', style: 'Shaker', finish: 'Stained white oak', width, height };
    front.position.set(x, y, z);
    front.rotation.y = rotation;
    parent.add(front);
    const rail = Math.min(2.25 / 12, width / 4, height / 4);
    box(front, 0, 0, -0.015, width - 2 * rail, height - 2 * rail, 0.05, cabinetPanelFinish).name = 'Shaker recessed center panel';
    for (const side of [-1, 1]) {
      box(front, side * (width - rail) / 2, 0, 0, rail, height, 0.08, cabinetFinish).name = 'Shaker vertical stile';
      box(front, 0, side * (height - rail) / 2, 0, width - 2 * rail, rail, 0.08, cabinetRailFinish).name = 'Shaker horizontal rail';
    }
    return front;
  }

  function cabinetPull(parent, x, y, z, length, vertical = false) {
    const pull = new THREE.Group();
    pull.name = 'Gold cabinet pull';
    pull.position.set(x, y, z);
    parent.add(pull);
    box(pull, 0, 0, 0.05, vertical ? 0.045 : length, vertical ? length : 0.045, 0.045, brass);
    for (const side of [-1, 1]) box(pull, vertical ? 0 : side * length * 0.38, vertical ? side * length * 0.38 : 0, 0, 0.04, 0.04, 0.1, brass);
  }

  function floor(x, z, w, d, furnished = false, parent = shell, interior = true) {
    if (interior) interiorFloorAreas.push({ x, z, w, d });
    box(parent, x + w / 2, -0.24, z + d / 2, w, 0.45, d, furnished ? oak : shellFloor);
    if (furnished) {
      const texture = wood.map.clone();
      texture.repeat.set(w / woodTileWidth, d / woodTileDepth);
      texture.offset.set(x / woodTileWidth, -(z + d) / woodTileDepth);
      const material = wood.clone();
      material.map = texture;
      const surface = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
      surface.name = 'Hardwood floor';
      surface.userData = { x, z, width: w, depth: d, plankWidthInches: 7 };
      surface.rotation.x = -Math.PI / 2;
      surface.position.set(x + w / 2, 0.005, z + d / 2);
      surface.receiveShadow = true;
      parent.add(surface);
    }
  }

  const casingSideWidth = 3.5 / 12;
  const casingReveal = 0.125 / 12;
  function openingCasing(parent, x, bottom, width, height, faceDepth, side = 1, window = false, sillOptions = {}) {
    const casing = new THREE.Group();
    casing.name = window ? 'Craftsman window casing' : 'Craftsman opening casing';
    casing.position.set(x, bottom, side * faceDepth);
    casing.rotation.y = side === -1 ? Math.PI : 0;
    casing.userData = { width, height, window, side, sideWidthInches: 3.5, headerHeightInches: 5.5 };
    parent.add(casing);
    const sideWidth = casingSideWidth;
    const reveal = casingReveal;
    const outerWidth = width + 2 * (sideWidth + reveal);
    function part(name, x, y, z, w, h, d, material = windowTrim) {
      const mesh = box(casing, x, y, z, w, h, d, material);
      mesh.name = name;
      const worldY = mesh.getWorldPosition(new THREE.Vector3()).y;
      mesh.userData = { bottom: worldY - h / 2, top: worldY + h / 2, offsetY: worldY - y };
      walls.push(mesh);
    }
    for (const edge of [-1, 1]) {
      part('White casing side board', edge * (width / 2 + reveal + sideWidth / 2), height / 2, 0.03125, sideWidth, height, 0.0625);
    }
    part('White casing header', 0, height + reveal + 5.5 / 24, 0.03125, outerWidth, 5.5 / 12, 0.0625);
    part('White casing header bead', 0, height + reveal + 0.03125, 0.05, outerWidth + 0.0625, 0.0625, 0.1);
    part('White casing projecting cap', 0, height + reveal + 5.5 / 12 + 0.0416667, 0.0625, outerWidth + 0.125, 1 / 12, 0.125);
    if (window) {
      const { material = windowTrim, depth = 0.25, notchWidth = 0 } = sillOptions;
      const sillWidth = outerWidth + 0.125;
      const sillZ = sillOptions.material ? depth / 2 - faceDepth : 0.0625;
      const sillName = sillOptions.material ? 'Quartz plant window sill' : 'White window projecting sill';
      if (notchWidth > 0) {
        const wingWidth = (sillWidth - notchWidth) / 2;
        for (const edge of [-1, 1]) part(sillName, edge * (notchWidth + wingWidth) / 2, -0.5 / 12, sillZ, wingWidth, 1 / 12, depth, material);
        const rearDepth = 1.5 / 12;
        part('Quartz sill behind faucet notch', 0, -0.5 / 12, -faceDepth + rearDepth / 2, notchWidth, 1 / 12, rearDepth, material);
      } else {
        part(sillName, 0, -0.5 / 12, sillZ, sillWidth, 1 / 12, depth, material);
      }
      part('White window apron', 0, -1 / 12 - sideWidth / 2, 0.03125, outerWidth, sideWidth, 0.0625);
    }
  }

  function wall(x1, z1, x2, z2, furnished = false, openings = [], height = ceilingHeight, trimSides = [-1, 1]) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const group = new THREE.Group();
    group.position.set(x1, 0, z1);
    group.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    (furnished ? scene : shell).add(group);
    function baseTrim(start, end) {
      const casingWidth = (3.5 + 0.125) / 12;
      if (openings.some(([a, b, bottom]) => bottom === 0 && Math.abs(b - start) < 0.001)) start += casingWidth;
      if (openings.some(([a, b, bottom]) => bottom === 0 && Math.abs(a - end) < 0.001)) end -= casingWidth;
      if (end <= start) return;
      const dx = (x2 - x1) / length;
      const dz = (z2 - z1) / length;
      const depth = 0.75 / 12;
      const radius = 0.75 / 12;
      for (const side of trimSides) {
        const sampleX = x1 - dz * side * 0.3;
        const sampleZ = z1 + dx * side * 0.3;
        const runs = [];
        for (const area of interiorFloorAreas) {
          let from = start;
          let to = end;
          for (const [origin, direction, min, max] of [[sampleX, dx, area.x, area.x + area.w], [sampleZ, dz, area.z, area.z + area.d]]) {
            if (Math.abs(direction) < 0.0001) {
              if (origin <= min || origin >= max) to = from;
            } else {
              const a = (min - origin) / direction;
              const b = (max - origin) / direction;
              from = Math.max(from, Math.min(a, b));
              to = Math.min(to, Math.max(a, b));
            }
          }
          if (to > from) runs.push([from, to]);
        }
        runs.sort((a, b) => a[0] - b[0]);
        const merged = [];
        for (const run of runs) {
          const previous = merged[merged.length - 1];
          if (previous && run[0] <= previous[1] + 0.001) previous[1] = Math.max(previous[1], run[1]);
          else merged.push([...run]);
        }
        for (const [from, to] of merged) {
          const board = box(group, (from + to) / 2, 0.005 + 8 / 24, side * (0.175 + depth / 2), to - from, 8 / 12, depth, windowTrim);
          board.name = '8 inch interior baseboard';
          board.userData = { heightInches: 8, thicknessInches: 0.75, side, start: from, end: to };
          const profile = new THREE.Shape();
          profile.moveTo(0, 0);
          profile.lineTo(-side * radius, 0);
          profile.absarc(0, 0, radius, side === 1 ? Math.PI : 0, Math.PI / 2, side === 1);
          profile.closePath();
          const geometry = new THREE.ExtrudeGeometry(profile, { depth: to - from, bevelEnabled: false, curveSegments: 8 });
          geometry.rotateY(Math.PI / 2);
          const shoe = new THREE.Mesh(geometry, windowTrim);
          shoe.name = 'Quarter-round baseboard shoe';
          shoe.position.set(from, 0.005, side * (0.175 + depth));
          shoe.userData = { radiusInches: 0.75, side, start: from, end: to };
          shoe.castShadow = shoe.receiveShadow = true;
          group.add(shoe);
        }
      }
    }
    function part(start, end, bottom, top) {
      if (end <= start || top <= bottom) return;
      const mesh = box(group, (start + end) / 2, (bottom + top) / 2, 0, end - start, top - bottom, 0.35, wallMaterial);
      mesh.name = 'House wall';
      mesh.userData = { bottom, top };
      walls.push(mesh);
      if (bottom === 0 && top >= 8 / 12) baseTrim(start, end);
    }
    let cursor = 0;
    openings.forEach(([start, end, bottom, top]) => {
      part(cursor, start, 0, height);
      part(start, end, 0, bottom);
      part(start, end, top, height);
      if (bottom === 0) {
        for (const side of trimSides) openingCasing(group, (start + end) / 2, 0, end - start, top, 0.175, side);
      }
      cursor = end;
    });
    part(cursor, length, 0, height);
  }

  function feet(value) {
    const inches = Math.round(value * 12);
    return `${Math.floor(inches / 12)}' ${inches % 12}"`;
  }

  function roomDimensions(text, width, depth, irregular = false) {
    const dimensions = `~ ${feet(width)} x ${feet(depth)}${irregular ? ' max' : ''}`;
    const item = document.createElement('li');
    item.textContent = `${text}: ${dimensions}`;
    document.getElementById('room-dimension-summary').append(item);
  }

  const kitchenWallLeft = 26.5;
  const kitchenWallRight = 38;
  const kitchenSinkX = (kitchenWallLeft + kitchenWallRight) / 2;
  const kitchenSinkWindowWidth = 5.5;
  const kitchenPassageWidth = 2.5;
  const kitchenSideOpenings = [[2.725, 2.725 + kitchenPassageWidth, 0, 8], [13.675, 13.675 + kitchenPassageWidth, 0, 8]];
  const cooktopCenterZ = 8 + (kitchenSideOpenings[0][1] + kitchenSideOpenings[1][0]) / 2;
  const kitchenSinkWindowHeight = 3.5;
  const kitchenSinkWindowSill = 4.25;
  const kitchenSinkWindows = [
    { name: 'Kitchen left counter window', x: kitchenSinkX - 4.5, width: 1.5 },
    { name: 'Kitchen sink window', x: kitchenSinkX, width: kitchenSinkWindowWidth },
    { name: 'Kitchen right counter window', x: kitchenSinkX + 4.5, width: 1.5 }
  ];
  const prepSinkX = 47.4;
  const prepWindowWidth = 2.5;
  const prepWindowHeight = 3.5;
  const prepWindowSill = 4.25;
  const prepWindowCenters = [prepSinkX - 1.75, prepSinkX + 1.75];
  const diningSideWindowCenters = [2.95];
  const diningSideWindowWidth = 6;
  const diningSideWindowHeight = 5;
  const diningSideWindowSill = 3;

  const stairWidth = 44 / 12;
  const stairGap = 0.25;
  const stairwellWallThickness = 0.16;
  const stairWallFaceZ = 34.6 - 0.175;
  const wallSideStairWidth = stairWallFaceZ - (26.6 + stairWidth + stairGap);
  const stairOpening = { x: 17.4, z: 26.6, width: 29 - 0.175 - 17.4, depth: stairWallFaceZ - 26.6 };

  // Stepped footprint and room adjacencies follow the user's attached plan.
  floor(0, 8, 13.2, 17.7, true, scene);
  floor(13.2, -2.1, 13.3, 10.1, true, scene);
  floor(13.2, 8, 13.3, 17.7, true, scene);
  floor(26.5, 8, 11.5, stairOpening.z - 8, true, scene);
  floor(stairOpening.x + stairOpening.width, stairOpening.z, 38 - stairOpening.x - stairOpening.width, 26.9 - stairOpening.z, true, scene);
  floor(38, 8, 17.5, 7, true, scene);
  [
    [38, 15, 7.4, 11.9], [45.4, 15, 10.1, 11.9, false, false], [29, 26.9, 26.5, 7.7, false, false],
    [31.2, 34.6, 24.3, 14.4, false, false], [0, 25.7, 12.2, 10.4, true],
    [12.2, 25.7, stairOpening.x - 12.2, 8.9, true],
    [stairOpening.x + stairOpening.width, 25.7, 29 - stairOpening.x - stairOpening.width, 8.9, true],
    [stairOpening.x, 25.7, stairOpening.width, stairOpening.z - 25.7, true],
    [stairOpening.x, stairOpening.z + stairOpening.depth, stairOpening.width, 34.6 - stairOpening.z - stairOpening.depth, true],
    [12.2, 34.6, 6.8, 19.6, true], [0, 36.1, 7.1, 4.9], [7.1, 38.5, 5.1, 2.5],
    [0, 41, 12.2, 13.2, true], [19, 34.6, 6, 7.4, true], [25, 34.6, 6.2, 4.6],
    [25, 39.2, 6.2, 2.8], [19, 42, 12.2, 12.2, true], [0, 54.2, 31.2, 7, false, false],
    [7.1, 36.1, 5.1, 2.4, true]
  ].forEach(([x, z, w, d, hardwood = false, interior = true]) => floor(x, z, w, d, hardwood, shell, interior));

  [
    [0, 8, 13.2, 8, true, [[4.2, 9.2, 3, 8]]],
    [13.2, -2.1, 13.2, 8, true, diningSideWindowCenters.map((z) => [z - diningSideWindowWidth / 2 + 2.1, z + diningSideWindowWidth / 2 + 2.1, diningSideWindowSill, diningSideWindowSill + diningSideWindowHeight])],
    [13.2, -2.1, 26.5, -2.1, true, [[3.65, 9.65, 3, 8]]],
    [26.5, -2.1, 26.5, 8, true, [[2.1, 8.1, 0, 8]], ceilingHeight, [1]],
    [kitchenWallLeft, 8, kitchenWallRight, 8, true, kitchenSinkWindows.map(({ x, width }) => [x - width / 2 - kitchenWallLeft, x + width / 2 - kitchenWallLeft, kitchenSinkWindowSill, kitchenSinkWindowSill + kitchenSinkWindowHeight])],
    [38, 8, 55.5, 8, false, prepWindowCenters.map((x) => [x - prepWindowWidth / 2 - 38, x + prepWindowWidth / 2 - 38, prepWindowSill, prepWindowSill + prepWindowHeight])],
    [55.5, 8, 55.5, 49, false, [[36, 39, 0, 7]], ceilingHeight, [1]], [55.5, 49, 31.2, 49, false, [[2.5, 11.5, 0, 8], [14, 23, 0, 8]], ceilingHeight, [1]],
    [31.2, 49, 31.2, 54.2], [31.2, 54.2, 31.2, 61.2, false, [], 2.6], [31.2, 61.2, 0, 61.2, false, [], 2.6],
    [0, 61.2, 0, 54.2, false, [], 2.6], [0, 54.2, 0, 25.7, false, [[3.2, 7.2, 3, 8], [22.2, 26.2, 3, 8]]],
    [0, 25.7, 0, 8, true, [[1.7, 4.7, 2.6, 8.4], [13.3, 16.3, 2.6, 8.4]]],
    [0, 25.7, 13.2, 25.7, true, [[9, 13.2, 0, 7]]], [12.2, 25.7, 12.2, 36.1, false, [[0, 3, 0, 7]]], [0, 36.1, 7.1, 36.1, false, [[4, 6.8, 0, 7]]],
    [7.1, 36.1, 7.1, 38.5], [7.1, 38.5, 12.2, 38.5], [12.2, 38.5, 12.2, 54.2, false, [[5, 8.5, 0, 7]]],
    [0, 41, 12.2, 41], [0, 54.2, 31.2, 54.2, false, [[12.2, 19, 0, 7], [21.2, 28.8, 3, 8]], ceilingHeight, [-1]],
    [19, 34.6, 19, 54.2, false, [[7.4, 10.4, 0, 7]]], [19, 34.6, 25, 34.6],
    [25, 34.6, 25, 42], [19, 42, 25, 42, false, [[1.4, 4.6, 0, 7]]], [25, 39.2, 31.2, 39.2, false, [[2, 4.7, 0, 7]]],
    [25, 34.6, 31.2, 34.6], [31.2, 34.6, 31.2, 49], [29, 26.9, 29, 34.6],
    [29, 26.9, 29.6875, 26.9, true],
    [29.6875, 26.9, 37.8, 26.9, true, [], ceilingHeight, [1]],
    [37.8, 26.9, 38, 26.9, true],
    [38, 8, 38, 25.3, true, kitchenSideOpenings],
    [38, 25.3, 38, 26.9, true, [], ceilingHeight, [-1]], [38, 15, 55.5, 15],
    [45.4, 15, 45.4, 26.9], [38, 26.9, 45.4, 26.9, false, [[3, 6, 0, 7]]]
  ].forEach((segment) => wall(...segment));

  [
    ['Living room', 13.2, 17.7], ['Dining room', 13.3, 10.1], ['Kitchen', 11.5, 18.9],
    ['Hall', 13.3, 17.7], ['Prep kitchen', 17.5, 7], ['Mudroom', 7.4, 11.9],
    ['Garage', 26.5, 34, true], ['Kids room', 12.2, 10.4],
    ['Powder room', 7.1, 4.9], ['Office', 12.2, 13.2],
    ['Closet', 6, 7.4], ['Bath', 6.2, 4.6],
    ['Bedroom', 12.2, 12.2], ['Porch', 31.2, 7]
  ].forEach((room) => roomDimensions(...room));

  // Proposed feature wall, following the existing living-room requirements.
  const fireplace = new THREE.Group();
  fireplace.name = 'Floor-to-ceiling stone fireplace';
  scene.add(fireplace);
  const mortar = mat('#a9a394');
  box(fireplace, 0.28, ceilingHeight / 2, 16.8, 0.52, ceilingHeight, 6, mortar).name = 'Fireplace stone backing';
  const stoneCanvas = document.createElement('canvas');
  stoneCanvas.width = stoneCanvas.height = 128;
  const stoneContext = stoneCanvas.getContext('2d');
  if (!stoneContext) throw new Error('A 2D canvas is required to create the fireplace stone finish.');
  stoneContext.fillStyle = '#eee9df';
  stoneContext.fillRect(0, 0, 128, 128);
  let stoneSeed = 73;
  for (let i = 0; i < 4500; i++) {
    stoneSeed = (stoneSeed * 1664525 + 1013904223) >>> 0;
    const x = stoneSeed / 4294967296 * 128;
    stoneSeed = (stoneSeed * 1664525 + 1013904223) >>> 0;
    const y = stoneSeed / 4294967296 * 128;
    stoneContext.fillStyle = i % 2 ? 'rgba(99, 88, 71, 0.12)' : 'rgba(255, 255, 255, 0.35)';
    stoneContext.fillRect(x, y, 1.5, 1);
  }
  const stoneTexture = new THREE.CanvasTexture(stoneCanvas);
  stoneTexture.colorSpace = THREE.SRGBColorSpace;
  stoneTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const fireplaceStones = ['#d5cebf', '#c5bdad', '#e0d9cb', '#bcb6a9', '#cec9bd'].map((color) => {
    const material = new THREE.MeshStandardMaterial({ color, map: stoneTexture, roughness: 0.95 });
    material.name = 'Warm limestone fireplace veneer';
    return material;
  });
  for (let row = 0; row < ceilingHeight / 0.5; row++) {
    const y = row * 0.5 + 0.25;
    let start = 13.8;
    for (let column = 0; start < 19.8; column++) {
      const length = Math.min(column === 0 && row % 2 ? 0.65 : 1.1 + ((row + column * 3) % 5) * 0.17, 19.8 - start);
      const material = fireplaceStones[(row * 3 + column) % fireplaceStones.length];
      const depth = 0.065 + ((row + column) % 3) * 0.008;
      box(fireplace, 0.54 + depth / 2, y, start + length / 2, depth, 0.475, length - 0.025, material).name = 'Fireplace face stone';
      start += length;
    }
    for (const z of [13.77, 19.83]) {
      box(fireplace, 0.28, y, z, 0.52, 0.475, 0.06, fireplaceStones[row % fireplaceStones.length]).name = 'Fireplace stone side return';
    }
  }
  box(fireplace, 0.28, ceilingHeight - 0.015, 16.8, 0.52, 0.03, 6, fireplaceStones[0]).name = 'Fireplace stone top cap';
  box(scene, 0.58, 2.4, 16.8, 0.12, 1.25, 4.6, black).name = 'Fireplace firebox';
  const ember = new THREE.MeshStandardMaterial({ color: '#c7793e', emissive: '#c65c20', emissiveIntensity: 1 });
  box(scene, 0.66, 2.12, 16.8, 0.06, 0.12, 4.1, ember);
  box(scene, 0.62, 5.8, 16.8, 0.15, 2.7, 4.6, black, true).name = 'Fireplace television';
  const glass = new THREE.MeshStandardMaterial({ color: '#b3cad0', roughness: 0.15, metalness: 0.15, transparent: true, opacity: 0.52 });
  function windowFrame(name, x, z, width, height, sill, rotation = 0, parent = scene, interiorSide = 1, sillOptions = {}) {
    const frame = new THREE.Group();
    frame.name = name;
    frame.position.set(x, sill, z);
    frame.rotation.y = rotation;
    frame.userData = { interiorTrim: 'white', interiorSide, sillDepthInches: (sillOptions.depth ?? 0.25) * 12, sillMaterial: sillOptions.material ? 'quartz' : 'white trim', faucetNotchWidthInches: (sillOptions.notchWidth ?? 0) * 12 };
    parent.add(frame);
    const frameMaterials = [black, black, black, black, interiorSide === 1 ? windowTrim : black, interiorSide === -1 ? windowTrim : black];
    for (const side of [-1, 1]) {
      box(frame, side * (width - 0.12) / 2, height / 2, 0, 0.12, height, 0.18, frameMaterials);
      box(frame, 0, side < 0 ? 0.06 : height - 0.06, 0, width, 0.12, 0.18, frameMaterials);
    }
    box(frame, 0, height / 2, 0, width - 0.24, height - 0.24, 0.06, glass);
    box(frame, 0, height / 2, interiorSide * 0.04, 0.07, height - 0.24, 0.08, frameMaterials);
    openingCasing(frame, 0, 0, width, height, 0.2, interiorSide, sill > 0, sillOptions);
  }
  windowFrame('Living side window', 6.7, 8.1, 5, 5, 3);
  windowFrame('Dining rear window', 19.85, -2, 6, 5, 3);
  for (const [index, z] of diningSideWindowCenters.entries()) {
    windowFrame(`Dining left window ${index + 1}`, 13.2, z, diningSideWindowWidth, diningSideWindowHeight, diningSideWindowSill, -Math.PI / 2, scene, -1);
  }
  const patioDoor = new THREE.Group();
  patioDoor.name = 'Dining picture window and inswing patio door';
  patioDoor.position.set(26.5, 0, 3);
  patioDoor.rotation.y = -Math.PI / 2;
  patioDoor.userData = { widthFeet: 6, heightFeet: 8, sliding: false, provisional: true, exteriorDirection: 'increasing x' };
  scene.add(patioDoor);
  for (const side of [-1, 1]) {
    box(patioDoor, side * 2.94, 4, 0, 0.12, 8, 0.3, black).name = 'Patio door jamb';
  }
  box(patioDoor, 0, 7.94, 0, 6, 0.12, 0.3, black).name = 'Patio door header';
  box(patioDoor, 0, 0.04, 0, 6, 0.08, 0.4, black).name = 'Patio door threshold';
  box(patioDoor, 0, 4, 0, 0.12, 8, 0.3, black).name = 'Picture window and door mullion';
  const pictureWindow = new THREE.Group();
  pictureWindow.name = 'Dining tall fixed picture window';
  pictureWindow.position.x = 1.47;
  pictureWindow.userData = { fixed: true, interiorTrim: 'white', interiorSide: -1 };
  patioDoor.add(pictureWindow);
  const pictureWindowMaterials = [black, black, black, black, black, windowTrim];
  for (const edge of [-1, 1]) {
    box(pictureWindow, edge * 1.37, 4, 0, 0.08, 7.76, 0.12, pictureWindowMaterials).name = 'Picture window stile';
    box(pictureWindow, 0, edge < 0 ? 0.16 : 7.84, 0, 2.82, 0.08, 0.12, pictureWindowMaterials).name = 'Picture window rail';
  }
  box(pictureWindow, 0, 4, 0, 2.66, 7.6, 0.05, glass).name = 'Uninterrupted picture window glazing';
  const doorLeaf = new THREE.Group();
  doorLeaf.name = 'Inward-opening hinged patio door';
  doorLeaf.position.x = -2.88;
  doorLeaf.rotation.y = -Math.PI / 6;
  doorLeaf.userData = { outswing: false, openAngleDegrees: 30, nominalWidthFeet: 3 };
  patioDoor.add(doorLeaf);
  for (const edge of [0.04, 2.78]) {
    box(doorLeaf, edge, 3.98, 0, 0.08, 7.76, 0.14, black).name = 'Hinged patio door stile';
  }
  for (const y of [0.16, 7.8]) box(doorLeaf, 1.41, y, 0, 2.82, 0.12, 0.14, black).name = 'Hinged patio door rail';
  box(doorLeaf, 1.41, 3.98, 0, 2.66, 7.52, 0.05, glass).name = 'Hinged patio door glazing';
  for (const y of [0.6, 4, 7.3]) cylinder(doorLeaf, 0, y, 0, 0.045, 0.25, black).name = 'Patio door hinge';
  for (const side of [-1, 1]) {
    box(doorLeaf, 2.65, 3.5, side * 0.1, 0.08, 0.3, 0.08, black).name = 'Patio door handle plate';
    box(doorLeaf, 2.53, 3.5, side * 0.16, 0.3, 0.06, 0.06, black).name = 'Patio door lever';
  }
  const livingWindowMaterials = [windowTrim, black, black, black, black, black];
  for (const z of [10.9, 22.5]) {
    const casing = new THREE.Group();
    casing.position.set(0.22, 2.6, z);
    casing.rotation.y = Math.PI / 2;
    scene.add(casing);
    openingCasing(casing, 0, 0, 3, 5.8, 0.32, 1, true);
    for (const side of [-1, 1]) {
      box(scene, 0.22, 5.5, z + side * 1.43, 0.28, 5.8, 0.14, livingWindowMaterials).name = 'Living window white interior frame';
      box(scene, 0.22, 5.5 + side * 2.83, z, 0.28, 0.14, 3, livingWindowMaterials).name = 'Living window white interior frame';
    }
    box(scene, 0.4, 5.5, z, 0.08, 5.5, 2.7, glass);
    box(scene, 0.47, 5.5, z, 0.1, 0.07, 2.7, livingWindowMaterials).name = 'Living window white interior mullion';
  }

  const sofa = new THREE.Group();
  sofa.name = 'Extra-deep straight four-seat sofa';
  sofa.userData = { seats: 4, widthInches: 122, depthInches: 54, sectional: false };
  sofa.position.set(10.5, 0, 16.8);
  sofa.rotation.y = -Math.PI / 2;
  scene.add(sofa);
  const sofaWidth = 122 / 12;
  const sofaDepth = 54 / 12;
  const armWidth = 9.875 / 12;
  const seatWidth = (sofaWidth - 2 * armWidth) / 4;
  box(sofa, 0, 0.75, 0, sofaWidth, 0.95, sofaDepth, tanLeather, true);
  box(sofa, 0, 1.65, -sofaDepth / 2 + 0.2, sofaWidth, 1.366, 0.4, tanLeather, true);
  for (const x of [-(sofaWidth - armWidth) / 2, (sofaWidth - armWidth) / 2]) box(sofa, x, 1.25, 0, armWidth, 2.166, sofaDepth, tanLeather, true);
  for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * seatWidth;
    const seat = box(sofa, x, 1.3, 0.2, seatWidth - 0.035, 0.42, sofaDepth - 0.4, tanLeatherCushion, true);
    seat.name = 'Sofa seat';
    const pillow = box(sofa, x, 1.9, -sofaDepth / 2 + 0.5, seatWidth - 0.05, 0.8, 0.45, tanLeatherCushion, true);
    pillow.rotation.x = -0.12;
  }

  function loungeChair(x, z, rotation) {
    const chair = new THREE.Group();
    chair.name = 'Upholstered lounge chair';
    chair.userData = { seats: 1 };
    chair.position.set(x, 0, z);
    chair.rotation.y = rotation;
    scene.add(chair);
    for (const dx of [-1.05, 1.05]) for (const dz of [-1.05, 1.05]) box(chair, dx, 0.3, dz, 0.18, 0.6, 0.18, oak, true);
    box(chair, 0, 0.9, 0, 34 / 12, 0.7, 34.5 / 12, tanLeather, true);
    box(chair, 0, 1.28, 0.15, 2.2, 0.36, 2.35, tanLeatherCushion, true);
    for (const side of [-1.25, 1.25]) box(chair, side, 1.45, 0, 1 / 3, 1, 34.5 / 12, tanLeather, true);
    box(chair, 0, 1.9, -1.25, 34 / 12, 1.533, 0.375, tanLeatherCushion, true);
  }
  loungeChair(4.4, 10.3, -0.35);
  loungeChair(4.4, 23.2, Math.PI + 0.35);

  const tableX = 19.85;
  const tableZ = 2.95;
  const tableLength = 71 / 12;
  const tableDepth = 37.5 / 12;
  const diningWalnut = mat('#60412e', 0.6);
  diningWalnut.name = 'Dining walnut finish - screen approximation';
  const diningLeather = mat('#292724', 0.72);
  diningLeather.name = 'Black dining leather - screen approximation';
  const diningTable = box(scene, tableX, 29 / 12 - 0.09, tableZ, tableLength, 0.18, tableDepth, diningWalnut, true);
  diningTable.name = 'Dining table';
  diningTable.userData = { reference: 'Article Seno walnut', lengthInches: 71, depthInches: 37.5, heightInches: 29, seats: 6 };
  for (const x of [-2.5, 2.5]) for (const z of [-1.1, 1.1]) box(scene, tableX + x, 1.15, tableZ + z, 0.16, 2.3, 0.16, diningWalnut, true).name = 'Dining table leg';
  function diningChair(x, z, rotation) {
    const chair = new THREE.Group();
    chair.name = 'Dining chair';
    chair.userData = { reference: 'Article Nosh walnut and black leather', widthInches: 20, depthInches: 21, heightInches: 31, seatHeightInches: 19, outwardMoveInches: 2, provisional: true };
    chair.position.set(x, 0, z);
    chair.rotation.y = rotation;
    scene.add(chair);
    box(chair, 0, 19 / 12 - 0.09, 0, 20 / 12, 0.18, 16 / 12, diningLeather, true).name = 'Black leather dining seat';
    box(chair, 0, 31 / 12 - 0.45, -0.75, 19 / 12, 0.9, 0.16, diningLeather, true).name = 'Black leather dining back';
    for (const dx of [-0.7, 0.7]) {
      box(chair, dx, (31 / 12 - 0.08) / 2, -0.75, 0.12, 31 / 12 - 0.08, 0.12, diningWalnut).name = 'Dining chair rear post';
      box(chair, dx, 0.73, 0.75, 0.12, 1.46, 0.12, diningWalnut).name = 'Dining chair front leg';
    }
  }
  const diningChairInset = (7.2 - 2) / 12;
  const diningChairPairOffset = 10.5 / 12;
  for (const x of [-diningChairPairOffset, diningChairPairOffset]) {
    diningChair(tableX + x, tableZ - tableDepth / 2 + diningChairInset, 0);
    diningChair(tableX + x, tableZ + tableDepth / 2 - diningChairInset, Math.PI);
  }
  diningChair(tableX - tableLength / 2 + diningChairInset, tableZ, Math.PI / 2);
  diningChair(tableX + tableLength / 2 - diningChairInset, tableZ, -Math.PI / 2);
  cylinder(scene, tableX, 2.8, tableZ, 0.22, 0.55, stone, 0.14);
  const pendant = new THREE.Group();
  scene.add(pendant);
  cylinder(pendant, tableX, (ceilingHeight + 5) / 2, tableZ, 0.025, ceilingHeight - 5, black).name = 'Dining pendant cord';
  cylinder(pendant, tableX, 5.2, tableZ, 1.05, 0.65, cream, 0.3);

  const kitchen = new THREE.Group();
  kitchen.name = 'Kitchen furnishings';
  scene.add(kitchen);
  function quartzTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('A 2D canvas is required to create the quartz finish.');
    ctx.fillStyle = '#c8b99d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let seed = 42;
    for (let i = 0; i < 2400; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const x = seed / 4294967296 * canvas.width;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const y = seed / 4294967296 * canvas.height;
      ctx.fillStyle = i % 2 ? 'rgba(137, 121, 98, 0.07)' : 'rgba(233, 218, 190, 0.2)';
      ctx.fillRect(x, y, 1.2, 1.2);
    }
    const veins = [
      [-0.05, 0.12, 0.28, 0.2, 0.34, 0.43, 1.05, 0.57],
      [-0.05, 0.64, 0.31, 0.52, 0.58, 0.92, 1.05, 0.88],
      [0.42, -0.05, 0.55, 0.1, 0.72, 0.16, 1.05, 0.22],
      [0.34, 0.31, 0.4, 0.43, 0.49, 0.47, 0.53, 0.63],
      [0.64, 0.79, 0.73, 0.67, 0.83, 0.71, 1.05, 0.68]
    ];
    ctx.lineCap = 'round';
    for (const [index, points] of veins.entries()) {
      ctx.beginPath();
      ctx.moveTo(points[0] * canvas.width, points[1] * canvas.height);
      ctx.bezierCurveTo(...points.slice(2).map((value) => value * canvas.width));
      ctx.strokeStyle = 'rgba(157, 143, 121, 0.12)';
      ctx.lineWidth = index < 3 ? 11 : 5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(133, 124, 109, 0.3)';
      ctx.lineWidth = index < 3 ? 2.8 : 1.2;
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  }
  const countertop = new THREE.MeshPhysicalMaterial({ map: quartzTexture(), roughness: 0.48, metalness: 0, clearcoat: 0.1, clearcoatRoughness: 0.5 });
  countertop.name = 'Warm ivory quartz with soft warm-gray veining';
  const steel = new THREE.MeshStandardMaterial({ color: '#a9afad', metalness: 0.7, roughness: 0.32 });
  const light = new THREE.MeshStandardMaterial({ color: '#fff0c9', emissive: '#ffe3a3', emissiveIntensity: 0.5 });

  function drawerFront(x, z, width, rotation = 0, parent = kitchen) {
    const cabinet = new THREE.Group();
    cabinet.position.set(x, 0, z);
    cabinet.rotation.y = rotation;
    parent.add(cabinet);
    for (let row = 0; row < 3; row++) {
      const front = shakerFront(cabinet, 0, 0.65 + row * 0.79, 0, width, 0.74);
      cabinetPull(front, 0, 0.22, 0.09, width * 0.55);
    }
  }

  for (const [x, width] of [[kitchenSinkX - 3.525, 4.05], [kitchenSinkX + 4.525, 2.05]]) box(kitchen, x, 1.44, 9.2, width, 2.85, 2, cabinetFinish);
  for (const x of [kitchenSinkX - 3.525, kitchenSinkX + 3.525]) box(kitchen, x, 2.96, 9.2, 4.05, 0.18, 2.05, countertop, true).name = 'Top kitchen quartz counter';
  box(kitchen, kitchenSinkX, 1.1, 9.2, 3, 2, 2, cabinetFinish);
  for (const [x, width] of [[kitchenSinkX - 4.25, 2.45], [kitchenSinkX + 4.525, 1.9]]) drawerFront(x, 10.23, width);
  const trash = new THREE.Group();
  trash.name = 'Pull-out trash left of sink';
  trash.position.set(kitchenSinkX - 2.25, 0, 9.2);
  kitchen.add(trash);
  const trashFront = shakerFront(trash, 0, 1.45, 1.055, 1.45, 2.65);
  cabinetPull(trashFront, 0, 1, 0.09, 0.9);
  const dishwasher = new THREE.Group();
  dishwasher.name = '24 inch dishwasher right of sink';
  dishwasher.position.set(kitchenSinkX + 2.5, 0, 9.2);
  kitchen.add(dishwasher);
  box(dishwasher, 0, 1.45, 0, 1.98, 2.8, 1.95, steel, true);
  box(dishwasher, 0, 1.45, 1.05, 1.98, 2.65, 0.08, steel, true);
  box(dishwasher, 0, 2.66, 1.1, 1.85, 0.12, 0.04, black);
  box(dishwasher, 0, 2.4, 1.15, 1.4, 0.07, 0.07, steel);
  box(dishwasher, 0, 0.23, 1.1, 1.8, 0.12, 0.04, black);
  for (const x of [kitchenSinkX - 0.74, kitchenSinkX + 0.74]) {
    const front = shakerFront(kitchen, x, 1.15, 10.23, 1.43, 1.8);
    cabinetPull(front, x < kitchenSinkX ? 0.5 : -0.5, 0.5, 0.09, 0.4, true);
  }
  const porcelain = mat('#fbfaf5', 0.22);
  const sink = new THREE.Group();
  sink.name = '36 inch unequal-bowl farmhouse sink';
  const sinkSmallBowlFraction = 10.3125 / (10.3125 + 18.8125);
  const sinkClearBowlWidth = 2.72 - 0.12;
  const sinkDividerX = -1.36 + sinkClearBowlWidth * sinkSmallBowlFraction + 0.06;
  const sinkBowlCenters = [
    -1.36 + sinkClearBowlWidth * sinkSmallBowlFraction / 2,
    sinkDividerX + 0.06 + sinkClearBowlWidth * (1 - sinkSmallBowlFraction) / 2
  ];
  sink.userData = { candidate: 'Kohler Whitehaven K-6427-0', bowlWidthRatio: [sinkSmallBowlFraction, 1 - sinkSmallBowlFraction], smallBowlSide: 'left', lowDivider: true, provisional: true };
  sink.position.set(kitchenSinkX, 0, 9.2);
  kitchen.add(sink);
  box(sink, 0, 2.65, 1, 3, 0.85, 0.18, porcelain, true).name = 'Farmhouse apron front';
  box(sink, 0, 2.65, -0.635, 3, 0.85, 0.14, porcelain, true).name = 'Farmhouse sink rear wall';
  for (const x of [-1.43, 1.43]) box(sink, x, 2.65, 0.1925, 0.14, 0.85, 1.795, porcelain, true);
  box(sink, 0, 2.25, 0.1725, 2.72, 0.12, 1.475, porcelain, true);
  box(sink, sinkDividerX, 2.535, 0.1725, 0.12, 0.45, 1.475, porcelain, true).name = 'Unequal-bowl low divider';
  for (const [index, x] of sinkBowlCenters.entries()) {
    cylinder(sink, x, 2.315, 0.1725, 0.09, 0.012, steel).name = index === 0 ? 'Small basin drain' : 'Large basin drain';
  }
  box(kitchen, kitchenSinkX, 2.96, 8.335, 3, 0.18, 0.32, countertop).name = 'Sink faucet and dispenser mounting deck';
  cylinder(kitchen, kitchenSinkX, 3.65, 8.36, 0.055, 1.3, steel).name = 'Main sink faucet stem';
  box(kitchen, kitchenSinkX, 4.25, 8.68, 0.11, 0.11, 0.65, steel, true).name = 'Main sink faucet spout';
  const waterDispenser = new THREE.Group();
  waterDispenser.name = 'Hot and cold filtered water dispenser';
  waterDispenser.position.set(kitchenSinkX - 1.05, 3.05, 8.36);
  waterDispenser.userData = { supplies: ['hot', 'cold'], filtered: true, separateFromMainFaucet: true, provisional: true };
  kitchen.add(waterDispenser);
  cylinder(waterDispenser, 0, 0.02, 0, 0.085, 0.04, steel).name = 'Water dispenser deck base';
  cylinder(waterDispenser, 0, 0.26, 0, 0.035, 0.48, steel);
  box(waterDispenser, 0, 0.49, 0.22, 0.07, 0.07, 0.44, steel, true).name = 'Water dispenser spout';
  cylinder(waterDispenser, 0, 0.455, 0.42, 0.035, 0.07, steel);
  for (const [side, name, color] of [[-1, 'Hot', '#a54f43'], [1, 'Cold', '#4b779a']]) {
    box(waterDispenser, side * 0.105, 0.16, 0, 0.18, 0.045, 0.05, steel, true).name = `${name} water lever`;
    cylinder(waterDispenser, side * 0.17, 0.188, 0, 0.025, 0.012, mat(color)).name = `${name} water indicator`;
  }
  const soapDispenser = new THREE.Group();
  soapDispenser.name = 'Built-in sink soap dispenser';
  soapDispenser.position.set(kitchenSinkX + 1.05, 3.05, 8.36);
  soapDispenser.userData = { underCounterReservoir: true, provisional: true };
  kitchen.add(soapDispenser);
  cylinder(soapDispenser, 0, 0.02, 0, 0.085, 0.04, steel).name = 'Soap dispenser deck base';
  cylinder(soapDispenser, 0, 0.15, 0, 0.045, 0.26, steel);
  box(soapDispenser, 0, 0.29, 0.13, 0.1, 0.06, 0.34, steel, true).name = 'Soap dispenser pump';
  for (const { name, x, width } of kitchenSinkWindows) {
    windowFrame(name, x, 8.1, width, kitchenSinkWindowHeight, kitchenSinkWindowSill, 0, scene, 1, { material: countertop, depth: 8 / 12, notchWidth: x === kitchenSinkX ? 4 / 12 : 0 });
  }
  const sinkBacksplashBottom = 3.05;
  const sinkBacksplashTop = kitchenSinkWindowSill - (1 + 3.5) / 12;
  const sinkBacksplash = box(kitchen, kitchenSinkX, (sinkBacksplashBottom + sinkBacksplashTop) / 2, 8.22, 11.1, sinkBacksplashTop - sinkBacksplashBottom, 0.08, countertop);
  sinkBacksplash.name = 'Sink quartz backsplash';
  sinkBacksplash.userData = { bottom: sinkBacksplashBottom, top: sinkBacksplashTop };
  walls.push(sinkBacksplash);
  const kitchenCenterZ = (8 + 26.9) / 2;
  const cooktopRunWidth = kitchenSideOpenings[1][0] - kitchenSideOpenings[0][1] - 2 * (casingSideWidth + casingReveal);
  const cooktopEndFillerWidth = 1.5 / 12;
  const cooktopSideBayWidth = (cooktopRunWidth - 3) / 2;
  const cooktopSideDrawerWidth = cooktopSideBayWidth - cooktopEndFillerWidth - 0.04;
  const cooktopSideDrawerOffset = 1.5 + (cooktopSideBayWidth - cooktopEndFillerWidth) / 2;
  const cooktopCabinetry = new THREE.Group();
  cooktopCabinetry.name = 'Extended cooktop base cabinetry';
  cooktopCabinetry.userData = { widthInches: cooktopRunWidth * 12, sideDrawerWidthInches: cooktopSideDrawerWidth * 12, endFillerWidthInches: cooktopEndFillerWidth * 12, provisional: true };
  kitchen.add(cooktopCabinetry);
  box(cooktopCabinetry, 37, 1.44, cooktopCenterZ, 2, 2.85, cooktopRunWidth, cabinetFinish).name = 'Cooktop base cabinet run';
  box(cooktopCabinetry, 37, 2.96, cooktopCenterZ, 2.05, 0.18, cooktopRunWidth, countertop, true).name = 'Extended cooktop quartz counter';
  for (const side of [-1, 1]) {
    drawerFront(36, cooktopCenterZ + side * cooktopSideDrawerOffset, cooktopSideDrawerWidth, -Math.PI / 2, cooktopCabinetry);
    box(cooktopCabinetry, 35.98, 1.44, cooktopCenterZ + side * (cooktopRunWidth - cooktopEndFillerWidth) / 2, 0.08, 2.85, cooktopEndFillerWidth, cabinetFinish).name = 'Cooktop casing-side scribe filler';
  }
  const cooktop = box(kitchen, 37, 3.075, cooktopCenterZ, 1.75, 0.05, 3, black, true);
  cooktop.name = '36 inch induction cooktop';
  for (const [x, z] of [[36.58, cooktopCenterZ - 0.75], [37.42, cooktopCenterZ - 0.75], [36.58, cooktopCenterZ + 0.75], [37.42, cooktopCenterZ + 0.75], [37, cooktopCenterZ]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.018, 8, 32), steel);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 3.12, z);
    kitchen.add(ring);
  }
  drawerFront(36, cooktopCenterZ, 2.7, -Math.PI / 2, cooktopCabinetry);
  const cooktopHood = new THREE.Group();
  cooktopHood.name = 'Kitchen cooktop hood';
  cooktopHood.userData = { style: 'Tapered warm-white plaster with walnut lower band', widthInches: 48, topWidthInches: 36, concealedInsertAllowanceInches: 46, provisional: true };
  kitchen.add(cooktopHood);
  const hoodWidth = 48 / 12;
  const hoodTopWidth = 36 / 12;
  const hoodDepth = 24 / 12;
  const hoodTopDepth = hoodDepth * hoodTopWidth / hoodWidth;
  const hoodBack = 37.8;
  const hoodBottom = 6.3;
  const hoodBodyBottom = hoodBottom + 0.2;
  const hoodBodyHeight = ceilingHeight - hoodBodyBottom;
  const hoodCenterShift = (hoodDepth - hoodTopDepth) / 2;
  const hoodGeometry = new THREE.CylinderGeometry(hoodTopWidth / Math.SQRT2, hoodWidth / Math.SQRT2, hoodBodyHeight, 4, 1, false, Math.PI / 4).toNonIndexed();
  hoodGeometry.scale(hoodDepth / hoodWidth, 1, 1);
  const hoodVertices = hoodGeometry.getAttribute('position');
  // Shear the taper so the rear face stays flush with the wall.
  for (let i = 0; i < hoodVertices.count; i++) hoodVertices.setX(i, hoodVertices.getX(i) + hoodVertices.getY(i) / hoodBodyHeight * hoodCenterShift);
  hoodGeometry.computeVertexNormals();
  const hoodSurround = new THREE.Mesh(hoodGeometry, mat('#e9e4d8', 1));
  hoodSurround.name = 'Plaster tapered hood surround';
  hoodSurround.position.set(hoodBack - (hoodDepth + hoodTopDepth) / 4, (hoodBodyBottom + ceilingHeight) / 2, cooktopCenterZ);
  hoodSurround.castShadow = hoodSurround.receiveShadow = true;
  cooktopHood.add(hoodSurround);
  box(cooktopHood, hoodBack - hoodDepth / 2, hoodBottom + 0.1, cooktopCenterZ, hoodDepth, 0.2, hoodWidth, walnut).name = 'Hood walnut lower band';
  box(cooktopHood, hoodBack - hoodDepth / 2, hoodBottom - 0.015, cooktopCenterZ, 20 / 12, 0.03, 46 / 12, black).name = 'Concealed hood insert underside';
  box(cooktopHood, 36.65, hoodBottom - 0.045, cooktopCenterZ, 0.12, 0.025, 2.6, light).name = 'Cooktop hood task-light strip';
  const cookingDetails = new THREE.Group();
  cookingDetails.name = 'Cooktop finishing details';
  kitchen.add(cookingDetails);
  const cooktopBacksplashBottom = 3.05;
  const cooktopBacksplashWidth = kitchenSideOpenings[1][0] - kitchenSideOpenings[0][1];
  const cooktopBacksplash = box(cookingDetails, 37.795, (cooktopBacksplashBottom + ceilingHeight) / 2, cooktopCenterZ, 0.06, ceilingHeight - cooktopBacksplashBottom, cooktopBacksplashWidth, countertop);
  cooktopBacksplash.name = 'Full-height cooktop quartz backsplash';
  cooktopBacksplash.userData = { bottom: cooktopBacksplashBottom, top: ceilingHeight };
  walls.push(cooktopBacksplash);

  const cuttingBoard = new THREE.Group();
  cuttingBoard.name = 'Walnut cutting board';
  cuttingBoard.position.set(37.64, 3.05, cooktopCenterZ - 1.9);
  cookingDetails.add(cuttingBoard);
  box(cuttingBoard, 0, 0.43, 0, 0.08, 0.86, 0.58, walnut, true);
  box(cuttingBoard, 0, 0.95, 0, 0.08, 0.24, 0.17, walnut, true);
  const boardHole = cylinder(cuttingBoard, -0.045, 0.99, 0, 0.035, 0.012, black);
  boardHole.rotation.z = Math.PI / 2;

  const utensilCrock = new THREE.Group();
  utensilCrock.name = 'Ceramic utensil crock';
  utensilCrock.position.set(36.8, 3.05, cooktopCenterZ - 1.9);
  cookingDetails.add(utensilCrock);
  const crockFinish = mat('#a79881');
  cylinder(utensilCrock, 0, 0.24, 0, 0.18, 0.48, crockFinish);
  cylinder(utensilCrock, 0, 0.481, 0, 0.145, 0.008, black);
  for (const [index, offset] of [-0.09, 0, 0.09].entries()) {
    const utensil = new THREE.Group();
    utensil.position.set(offset, 0.4, index === 1 ? 0.06 : -0.03);
    utensil.rotation.z = (index - 1) * 0.13;
    utensilCrock.add(utensil);
    cylinder(utensil, 0, 0.29, 0, 0.018, 0.58, oak);
    box(utensil, 0, 0.63, 0, index === 1 ? 0.14 : 0.09, 0.17, 0.035, oak, true);
  }

  const seasoningTray = new THREE.Group();
  seasoningTray.name = 'Cooking oil and seasoning tray';
  seasoningTray.position.set(37.03, 3.05, cooktopCenterZ + 1.92);
  cookingDetails.add(seasoningTray);
  box(seasoningTray, 0, 0.035, 0, 1.2, 0.07, 0.55, walnut, true);
  const oilGlass = mat('#596344', 0.3);
  cylinder(seasoningTray, -0.35, 0.28, 0, 0.09, 0.42, oilGlass);
  cylinder(seasoningTray, -0.35, 0.55, 0, 0.045, 0.12, oilGlass);
  cylinder(seasoningTray, -0.35, 0.63, 0, 0.05, 0.04, black);
  cylinder(seasoningTray, 0, 0.28, 0, 0.1, 0.42, walnut, 0.065);
  cylinder(seasoningTray, 0, 0.54, 0, 0.095, 0.1, walnut);
  cylinder(seasoningTray, 0, 0.602, 0, 0.022, 0.024, steel);
  cylinder(seasoningTray, 0.36, 0.14, 0, 0.12, 0.14, porcelain);
  cylinder(seasoningTray, 0.36, 0.23, 0, 0.125, 0.04, oak);
  const bottomRun = new THREE.Group();
  bottomRun.name = 'Bottom kitchen cabinet run';
  kitchen.add(bottomRun);
  const columnWidth = 30 / 12;
  const columnHeight = 84 / 12;
  const columnPanel = 0.75 / 12;
  const bottomRunLeft = 29.6875;
  const bottomRunRight = 37.8;
  const endStorageWidth = 6 / 12;
  const bottomRunCabinetLeft = bottomRunLeft - endStorageWidth;
  const bottomRunCenterX = (bottomRunCabinetLeft + bottomRunRight) / 2;
  const bottomRunWidth = bottomRunRight - bottomRunCabinetLeft;
  const wallFillerWidth = 2.85 / 12;
  const fridgeLeft = bottomRunLeft + columnPanel;
  const freezerRight = bottomRunRight - wallFillerWidth - columnPanel;
  const pantryLeft = fridgeLeft + columnWidth + columnPanel;
  const pantryRight = freezerRight - columnWidth - columnPanel;
  const pantryWidth = pantryRight - pantryLeft;
  const pantryCenterX = (pantryLeft + pantryRight) / 2;
  const upperStorageBottom = columnHeight + 0.15;
  const upperStorageTop = ceilingHeight - 0.15;
  bottomRun.userData = { layout: 'Wall-side freezer separated from stair-side fridge by steam-oven storage tower', pantryWidthInches: pantryWidth * 12, endStorageWidthInches: endStorageWidth * 12, wallFillerWidthInches: wallFillerWidth * 12, ceilingHeight, provisional: true };
  const refrigerationPantry = new THREE.Group();
  refrigerationPantry.name = 'Steam oven and pantry tower';
  refrigerationPantry.position.x = pantryCenterX;
  bottomRun.add(refrigerationPantry);
  const pantryDepth = 25 / 12;
  const pantryDoorHeight = upperStorageBottom - 0.3;
  const pantryDoorCenterY = (upperStorageBottom + 0.3) / 2;
  const endStorage = new THREE.Group();
  endStorage.name = 'Stair-side narrow pull-out cabinet';
  endStorage.position.x = bottomRunCabinetLeft + endStorageWidth / 2;
  endStorage.userData = { widthInches: endStorageWidth * 12, depthInches: 25, pullOut: true, provisional: true };
  bottomRun.add(endStorage);
  box(endStorage, 0, pantryDoorCenterY, 26.725 - pantryDepth / 2, endStorageWidth, pantryDoorHeight, pantryDepth, cabinetFinish).name = 'Narrow pull-out carcass';
  box(endStorage, 0, 0.15, 25.8, endStorageWidth - 0.1, 0.3, 1.7, black).name = 'Narrow pull-out recessed toe-kick';
  const endStorageFront = shakerFront(endStorage, 0, pantryDoorCenterY, 26.725 - pantryDepth - 0.04, endStorageWidth - 0.04, pantryDoorHeight - 0.06, Math.PI);
  cabinetPull(endStorageFront, 0, 3.9 - pantryDoorCenterY, 0.09, 2.6, true);
  const endUpperHeight = upperStorageTop - upperStorageBottom;
  const endUpperCenterY = (upperStorageTop + upperStorageBottom) / 2;
  box(endStorage, 0, endUpperCenterY, 26.725 - pantryDepth / 2, endStorageWidth, endUpperHeight, pantryDepth, cabinetFinish).name = 'Narrow end overhead cabinet';
  const endUpperFront = shakerFront(endStorage, 0, endUpperCenterY, 26.725 - pantryDepth - 0.04, endStorageWidth - 0.04, endUpperHeight - 0.06, Math.PI);
  cabinetPull(endUpperFront, 0, upperStorageBottom + 0.45 - endUpperCenterY, 0.09, 0.55, true);
  const steamOvenBottom = 3;
  const steamOvenTop = 5;
  const towerSideThickness = 0.75 / 12;
  refrigerationPantry.userData = { widthInches: pantryWidth * 12, clearWidthInches: (pantryWidth - 2 * towerSideThickness) * 12, depthInches: pantryDepth * 12, provisional: true };
  for (const side of [-1, 1]) {
    box(refrigerationPantry, side * (pantryWidth - towerSideThickness) / 2, pantryDoorCenterY, 26.725 - pantryDepth / 2, towerSideThickness, pantryDoorHeight, pantryDepth, cabinetFinish).name = 'Steam-oven tower side';
  }
  box(refrigerationPantry, 0, pantryDoorCenterY, 26.7, pantryWidth - 2 * towerSideThickness, pantryDoorHeight, 0.05, cabinetFinish).name = 'Steam-oven tower backing';
  for (const y of [steamOvenBottom - towerSideThickness / 2, steamOvenTop + towerSideThickness / 2]) {
    box(refrigerationPantry, 0, y, 26.725 - pantryDepth / 2, pantryWidth - 2 * towerSideThickness, towerSideThickness, pantryDepth, cabinetRailFinish).name = 'Steam-oven compartment shelf';
  }
  box(refrigerationPantry, 0, 0.15, 25.8, pantryWidth - 0.2, 0.3, 1.7, black).name = 'Pantry recessed toe-kick';
  for (const [bottom, top] of [[0.3, steamOvenBottom - towerSideThickness], [steamOvenTop + towerSideThickness, upperStorageBottom]]) {
    const centerY = (bottom + top) / 2;
    for (const side of [-1, 1]) {
      const front = shakerFront(refrigerationPantry, side * pantryWidth / 4, centerY, 26.725 - pantryDepth - 0.04, pantryWidth / 2 - 0.04, top - bottom - 0.04, Math.PI);
      cabinetPull(front, side * (pantryWidth / 4 - 0.12), bottom < steamOvenBottom ? (top - bottom) / 2 - 0.45 : -(top - bottom) / 2 + 0.45, 0.09, 0.6, true);
    }
  }
  const steamOven = new THREE.Group();
  steamOven.name = '30-inch steam oven concept';
  steamOven.userData = { nominalWidthInches: 30, allowanceHeightInches: 24, allowanceDepthInches: 24, bottomInches: 36, modelSelected: false, provisional: true };
  steamOven.position.set(0, (steamOvenBottom + steamOvenTop) / 2, 26.725 - pantryDepth - 0.04);
  steamOven.rotation.y = Math.PI;
  refrigerationPantry.add(steamOven);
  box(steamOven, 0, 0, -1, 2.5, 2, 2, steel).name = 'Steam-oven provisional envelope';
  box(steamOven, 0, 0, 0.025, 2.5, 2, 0.05, steel).name = 'Steam-oven stainless front';
  box(steamOven, 0, -0.14, 0.06, 2.2, 1.28, 0.02, black).name = 'Steam-oven glass door';
  box(steamOven, 0, 0.76, 0.06, 2.2, 0.28, 0.02, black).name = 'Steam-oven control panel';
  box(steamOven, 0, 0.47, 0.14, 2.1, 0.07, 0.1, steel).name = 'Steam-oven handle';
  box(bottomRun, bottomRunRight - wallFillerWidth / 2, upperStorageTop / 2, 26, wallFillerWidth, upperStorageTop, 1.4, cabinetFinish).name = 'Recessed freezer wall-clearance filler';
  for (const x of [fridgeLeft - columnPanel / 2, fridgeLeft + columnWidth + columnPanel / 2, pantryRight + columnPanel / 2, freezerRight + columnPanel / 2]) {
    box(bottomRun, x, upperStorageTop / 2, 26.725 - 25 / 24, columnPanel, upperStorageTop, 25 / 12, cabinetFinish).name = 'Full-height refrigeration side panel';
  }
  for (const x of [fridgeLeft + columnWidth / 2, freezerRight - columnWidth / 2]) {
    box(bottomRun, x, columnHeight + 0.075, 26.725 - 25 / 24, columnWidth, 0.15, 25 / 12, cabinetRailFinish).name = 'Individual refrigeration upper rail';
  }
  for (const [name, x, width, depth] of [
    ['Freezer overhead cabinet', freezerRight - columnWidth / 2, columnWidth, 25 / 12],
    ['Fridge overhead cabinet', fridgeLeft + columnWidth / 2, columnWidth, 25 / 12],
    ['Pantry overhead cabinet', pantryCenterX, pantryWidth, pantryDepth]
  ]) {
    const upper = new THREE.Group();
    upper.name = name;
    upper.position.x = x;
    bottomRun.add(upper);
    const height = upperStorageTop - upperStorageBottom;
    const centerY = (upperStorageTop + upperStorageBottom) / 2;
    box(upper, 0, centerY, 26.725 - depth / 2, width, height, depth, cabinetFinish).name = 'Refrigeration upper carcass';
    for (const side of [-1, 1]) {
      const front = shakerFront(upper, side * width / 4, centerY, 26.725 - depth - 0.04, width / 2 - 0.04, height - 0.06, Math.PI);
      cabinetPull(front, side * (width / 4 - 0.12), upperStorageBottom + 0.45 - centerY, 0.09, 0.55, true);
    }
  }
  box(bottomRun, bottomRunCenterX, upperStorageTop + 0.075, 25.65, bottomRunWidth, 0.15, 2.15, cabinetRailFinish).name = 'Continuous refrigeration cabinet cornice';
  const freezerDoor = new THREE.Group();
  freezerDoor.name = 'Freezer conceptual hinged door';
  freezerDoor.userData = { openAngleDegrees: 0, conceptualHinge: true };
  for (const [name, model, x, handleX] of [
    ['Column freezer', 'RS3084FLJK1', freezerRight - columnWidth / 2, 1.05],
    ['Column fridge', 'RS3084SRHK1', fridgeLeft + columnWidth / 2, -1.05]
  ]) {
    const appliance = new THREE.Group();
    appliance.name = name;
    appliance.userData = { manufacturer: 'Fisher & Paykel', model, nominalWidthInches: 30, productWidthInches: 29.75, heightInches: 84, bodyDepthInches: 24, cavityDepthInches: 25, finish: 'Stainless panel concept', provisional: true };
    appliance.position.set(x, 0, 25.725);
    appliance.rotation.y = Math.PI;
    kitchen.add(appliance);
    box(appliance, 0, columnHeight / 2, 0, 29.75 / 12, columnHeight, 2, steel).name = 'Fisher & Paykel column body';
    let doorParent = appliance;
    let hingeX = 0;
    let hingeZ = 0;
    if (name === 'Column freezer') {
      // Approximate an articulating hinge ahead of the panel; this is not manufacturer hinge CAD.
      hingeX = -29.75 / 24;
      hingeZ = 1.13;
      freezerDoor.position.set(hingeX, 0, hingeZ);
      appliance.add(freezerDoor);
      doorParent = freezerDoor;
    }
    box(doorParent, -hingeX, (columnHeight + 4 / 12) / 2, 1 + 0.75 / 24 - hingeZ, 29.75 / 12, columnHeight - 4 / 12, 0.75 / 12, steel).name = 'Column stainless door panel';
    box(doorParent, handleX - hingeX, 3.9, 1.13 - hingeZ, 0.065, 2.6, 0.1, black).name = 'Column tower-facing handle';
    box(appliance, 0, 2 / 12, 1.01, 29.5 / 12, 4 / 12, 0.04, black).name = 'Column ventilation toe-kick';
    for (const y of [0.08, 0.16, 0.24]) box(appliance, 0, y, 1.035, 29 / 12, 0.025, 0.015, steel).name = 'Column ventilation grille';
  }

  const island = new THREE.Group();
  island.name = 'Kitchen island';
  island.userData = { width: 3.5, length: 7, kneeOverhang: 1.25, seats: 4, sideSeatSpacingInches: 20, finish: 'White-oak cabinetry with quartz waterfall ends' };
  island.position.set(-2, 0, kitchenCenterZ - 18.5);
  kitchen.add(island);
  const islandCabinetLength = 7 - 4 / 12;
  box(island, 31.15, 0.19, 18.5, 1.7, 0.36, islandCabinetLength - 0.2, black).name = 'Island recessed toe-kick';
  box(island, 31.15, 1.59, 18.5, 2, 2.46, islandCabinetLength, cabinetFinish).name = 'Island simple white-oak storage base';
  box(island, 30.65, 2.935, 18.5, 3.5, 0.23, 7, countertop, true).name = 'Island light quartz slab';
  for (const z of [15 + 1 / 12, 22 - 1 / 12]) {
    box(island, 30.65, 1.41, z, 3.5, 2.82, 2 / 12, countertop).name = 'Island quartz waterfall end';
  }
  for (const offset of [-1, 0, 1]) drawerFront(32.2, 18.5 + offset * islandCabinetLength / 3, islandCabinetLength / 3 - 0.08, Math.PI / 2, island);
  const stoolFabric = mat('#a17c57', 0.98);
  stoolFabric.name = 'Brown stool upholstery';
  const stoolWood = mat('#98704e', 0.6);
  for (const offset of [-1.5, -0.5, 0.5, 1.5]) {
    const stool = new THREE.Group();
    stool.name = 'Kitchen stool';
    stool.userData = { widthInches: 18, centerSpacingInches: 20, reference: 'Dark-frame stool with brown seat and wood back' };
    stool.position.set(29.28, 0, 18.5 + offset * 20 / 12);
    stool.rotation.y = Math.PI / 2;
    island.add(stool);
    box(stool, 0, 2.12, 0, 1.5, 0.12, 1.5, black, true).name = 'Stool dark seat frame';
    box(stool, 0, 2.225, 0, 1.46, 0.09, 1.46, stoolFabric, true).name = 'Stool brown upholstered seat';
    for (const x of [-0.62, 0.62]) {
      for (const z of [-0.62, 0.62]) box(stool, x, 1.08, z, 0.065, 2.08, 0.065, black).name = 'Stool straight dark leg';
      box(stool, x, 2.55, -0.67, 0.065, 1.22, 0.065, black).name = 'Stool dark back upright';
      box(stool, x, 0.75, 0, 0.055, 0.055, 1.24, black).name = 'Stool side stretcher';
    }
    box(stool, 0, 0.75, 0.62, 1.24, 0.065, 0.065, black).name = 'Stool front footrest';
    box(stool, 0, 2.94, -0.685, 1.22, 0.3, 0.085, stoolWood, true).name = 'Stool brown wood backrest';
  }
  const islandPendants = new THREE.Group();
  islandPendants.name = 'Island pendant lights';
  islandPendants.position.x = island.position.x;
  scene.add(islandPendants);
  for (const z of [kitchenCenterZ - 2.25, kitchenCenterZ + 2.25]) {
    cylinder(islandPendants, 30.65, (ceilingHeight + 7.8) / 2, z, 0.025, ceilingHeight - 7.8, black).name = 'Island pendant cord';
    cylinder(islandPendants, 30.65, 7.8, z, 0.65, 0.45, cream, 0.2);
  }

  const rest = new THREE.Group();
  rest.name = 'Remaining ground-floor furnishings';
  shell.add(rest);
  const tile = mat('#c5c2b6');
  const linen = mat('#b2b5a4');

  function furnishing(name, x, z, rotation = 0) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    rest.add(group);
    return group;
  }

  function tiledFloor(name, x, z, width, depth, material = tile) {
    const surface = box(rest, x + width / 2, 0.02, z + depth / 2, width, 0.03, depth, material);
    surface.name = name;
    for (let col = 2; col < width; col += 2) box(rest, x + col, 0.038, z + depth / 2, 0.015, 0.005, depth, cream);
    for (let row = 2; row < depth; row += 2) box(rest, x + width / 2, 0.038, z + row, width, 0.005, 0.015, cream);
  }

  const stairs = furnishing('U-shaped hall staircase', stairOpening.x, stairOpening.z);
  scene.add(stairs);
  const stairRisers = 10;
  const stairRise = 11 / (2 * stairRisers);
  const stairGoing = 10 / 12;
  const stairRun = (stairRisers - 1) * stairGoing;
  const stairDepth = stairOpening.depth;
  const outerStairRailZ = stairDepth - 0.08;
  const landingHeight = stairRisers * stairRise;
  const landingEndX = 29 - 0.175 - stairs.position.x;
  const stairBookcaseDepth = 11 / 12;
  const stairBookcaseSplitX = 26.6 - stairs.position.x;
  stairs.userData = { flightWidthInches: 44, wallSideFlightWidthInches: wallSideStairWidth * 12, risersPerFlight: stairRisers, riseInches: stairRise * 12, treadDepthInches: 10, floorToFloorFeet: 11, provisional: true };
  roomDimensions('Stairs (kitchen-side flight)', stairWidth, stairRun);
  roomDimensions('Stairs (wall-side flight)', wallSideStairWidth, stairRun);

  function stairBeam(name, start, end, width, depth, material, parent = stairs) {
    const from = new THREE.Vector3(...start);
    const to = new THREE.Vector3(...end);
    const direction = to.clone().sub(from);
    const beam = box(parent, 0, 0, 0, width, direction.length(), depth, material);
    beam.name = name;
    beam.position.copy(from).add(to).multiplyScalar(0.5);
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return beam;
  }

  function stairBookcaseHeight(start) {
    return start >= stairRun ? landingHeight - 0.85 : start * (landingHeight - stairRise) / stairRun - 0.13;
  }

  for (const upper of [false, true]) {
    const flight = new THREE.Group();
    flight.name = upper ? 'Upper stair flight' : 'Lower stair flight';
    const flightWidth = upper ? wallSideStairWidth : stairWidth;
    flight.userData = { treadWidthInches: flightWidth * 12, risers: stairRisers };
    stairs.add(flight);
    const direction = upper ? -1 : 1;
    const startX = upper ? stairRun : 0;
    const baseHeight = upper ? landingHeight : 0;
    const centerZ = (upper ? stairWidth + stairGap : 0) + flightWidth / 2;
    for (let step = 0; step < stairRisers - 1; step++) {
      const x = startX + direction * (step + 0.5) * stairGoing;
      const height = baseHeight + (step + 1) * stairRise;
      const recessedBookcase = !upper && step >= 3;
      const enclosureDepth = recessedBookcase ? flightWidth - stairBookcaseDepth : flightWidth;
      const enclosureZ = centerZ + (recessedBookcase ? stairBookcaseDepth / 2 : 0);
      const backingX = x + direction * 0.04;
      const backingLength = stairGoing - 0.08;
      box(flight, backingX, height - 0.15, enclosureZ, backingLength, 0.1, enclosureDepth, wallMaterial).name = 'Hollow stairwell soffit';
      if (recessedBookcase) {
        const caseHeight = stairBookcaseHeight(Math.floor(step / 3) * 3 * stairGoing);
        const infillHeight = height - 0.1 - caseHeight;
        box(flight, backingX, caseHeight + infillHeight / 2, stairBookcaseDepth / 2, backingLength, infillHeight, stairBookcaseDepth, wallMaterial).name = 'Bookcase stair-slope infill';
      }
      box(flight, x, height - 0.05, centerZ, stairGoing, 0.1, flightWidth, oak).name = 'Upstairs oak tread';
      box(flight, x - direction * (stairGoing / 2 - 0.02), height + 0.003, centerZ, 0.04, 0.006, flightWidth, walnut).name = 'Stair tread nosing';
      box(flight, x - direction * (stairGoing / 2 - 0.04), height - (stairRise + 0.1) / 2, centerZ, 0.08, stairRise - 0.1, flightWidth, cream).name = 'Stair riser';
    }
    const endX = startX + direction * stairRun;
    const endHeight = baseHeight + landingHeight;
    // The top riser sits before the landing and stops beneath its 0.2 ft slab.
    box(flight, endX - direction * 0.04, endHeight - (stairRise + 0.2) / 2, centerZ, 0.08, stairRise - 0.2, flightWidth, cream).name = 'Landing riser';
    for (const side of [-1, 1]) {
      const stringerZ = centerZ + side * (flightWidth / 2 - 0.12);
      stairBeam('Stair stringer', [startX, baseHeight - 0.2, stringerZ], [endX, endHeight - stairRise - 0.2, stringerZ], 0.12, 0.3, oak);
      const railZ = upper && side === 1 ? outerStairRailZ : centerZ + side * (flightWidth / 2 + 0.08);
      const firstX = startX + direction * stairGoing / 2;
      const lastX = endX - direction * stairGoing / 2;
      stairBeam('Sloped stair handrail', [firstX, baseHeight + stairRise + 3, railZ], [lastX, endHeight - stairRise + 3, railZ], 0.12, 0.12, oak);
      for (let rail = 1; rail <= 8; rail++) {
        const height = rail / 3;
        stairBeam('Horizontal stair guard rail', [firstX, baseHeight + stairRise + height, railZ], [lastX, endHeight - stairRise + height, railZ], 0.045, 0.045, black);
      }
      for (const step of [0, 4, stairRisers - 2]) {
        const x = startX + direction * (step + 0.5) * stairGoing;
        const height = baseHeight + (step + 1) * stairRise;
        box(stairs, x, height + 1.5, railZ, 0.09, 3, 0.09, black).name = 'Stair guard post';
      }
    }
  }
  box(stairs, (stairRun + landingEndX) / 2, landingHeight - 0.1, stairDepth / 2, landingEndX - stairRun, 0.2, stairDepth, oak).name = 'U-turn stair landing';
  box(stairs, -stairWidth / 2, 2 * landingHeight - 0.1, stairWidth + stairGap + wallSideStairWidth / 2, stairWidth, 0.2, wallSideStairWidth, oak).name = 'Upper stair arrival landing';
  box(stairs, (stairRun + landingEndX) / 2, landingHeight - 0.25, (stairDepth + stairBookcaseDepth) / 2, landingEndX - stairRun, 0.1, stairDepth - stairBookcaseDepth, wallMaterial).name = 'Hollow turning-landing soffit';
  const landingCaseHeight = stairBookcaseHeight(stairRun);
  const landingInfillHeight = landingHeight - 0.2 - landingCaseHeight;
  box(stairs, (stairRun + landingEndX) / 2, landingCaseHeight + landingInfillHeight / 2, stairBookcaseDepth / 2, landingEndX - stairRun, landingInfillHeight, stairBookcaseDepth, wallMaterial).name = 'Bookcase landing infill';
  const stairBookcases = new THREE.Group();
  stairBookcases.name = 'Recessed under-stair bookcases';
  stairBookcases.userData = { bays: 4, depthInches: 11, recessed: true, provisional: true };
  stairs.add(stairBookcases);
  const bookcaseBays = [
    { start: 3 * stairGoing, width: 3 * stairGoing },
    { start: 6 * stairGoing, width: 3 * stairGoing },
    { start: stairRun, width: stairBookcaseSplitX - stairRun },
    { start: stairBookcaseSplitX, width: landingEndX - stairBookcaseSplitX }
  ];
  for (const { start, width } of bookcaseBays) {
    const bay = new THREE.Group();
    bay.name = 'Under-stair bookcase bay';
    bay.position.x = start;
    const height = stairBookcaseHeight(start);
    bay.userData = { widthFeet: width, heightFeet: height, depthInches: 11 };
    stairBookcases.add(bay);
    box(bay, width / 2, height / 2, stairBookcaseDepth - 0.03, width, height, 0.06, cream).name = 'Bookcase backing';
    for (const x of [0.04, width - 0.04]) box(bay, x, height / 2, stairBookcaseDepth / 2, 0.08, height, stairBookcaseDepth, cream).name = 'Bookcase side';
    box(bay, width / 2, 0.1, stairBookcaseDepth / 2, width - 0.16, 0.2, stairBookcaseDepth - 0.04, cream).name = 'Bookcase plinth';
    box(bay, width / 2, height - 0.05, stairBookcaseDepth / 2, width, 0.1, stairBookcaseDepth, oak).name = 'Bookcase top';
    for (let shelfY = 0.26; shelfY < height - 0.5; shelfY += 1.05) {
      box(bay, width / 2, shelfY, stairBookcaseDepth / 2 - 0.02, width - 0.16, 0.08, stairBookcaseDepth - 0.04, oak).name = 'Open bookcase shelf';
      const availableHeight = Math.min(1.05, height - 0.1 - shelfY) - 0.08;
      for (let book = 0; book < 4; book++) {
        const bookHeight = Math.min(0.6 + (book % 3) * 0.1, availableHeight - 0.08);
        box(bay, 0.25 + book * 0.21, shelfY + 0.04 + bookHeight / 2, 0.4, 0.14, bookHeight, 0.55, [walnut, linen, cream, oak][book]).name = 'Built-in shelf book';
      }
    }
  }
  for (const z of [-0.08, outerStairRailZ]) {
    stairBeam('Turning landing side handrail', [stairRun, landingHeight + 3, z], [landingEndX, landingHeight + 3, z], 0.12, 0.12, oak);
    for (let rail = 1; rail <= 8; rail++) {
      stairBeam('Horizontal landing guard rail', [stairRun, landingHeight + rail / 3, z], [landingEndX, landingHeight + rail / 3, z], 0.045, 0.045, black);
    }
    for (const x of [stairRun, landingEndX - 0.05]) box(stairs, x, landingHeight + 1.5, z, 0.09, 3, 0.09, black).name = 'Landing guard post';
  }

  const upstairsStairParts = stairs.children.slice();
  const basementStairs = new THREE.Group();
  basementStairs.name = 'Basement U-shaped staircase';
  basementStairs.userData = { flightWidthInches: 44, entryFlightWidthInches: wallSideStairWidth * 12, floorToFloorFeet: 11, risersPerFlight: stairRisers, riseInches: stairRise * 12, treadDepthInches: 10, entry: 'Hall beneath upper stair arrival', provisional: true };
  stairs.add(basementStairs);
  roomDimensions('Basement stairs (entry flight)', wallSideStairWidth, stairRun);
  roomDimensions('Basement stairs (return flight)', stairWidth, stairRun);
  for (const returning of [false, true]) {
    const flight = new THREE.Group();
    flight.name = returning ? 'Basement returning flight' : 'Basement descending entry flight';
    const flightWidth = returning ? stairWidth : wallSideStairWidth;
    flight.userData = { treadWidthInches: flightWidth * 12 };
    basementStairs.add(flight);
    const direction = returning ? -1 : 1;
    const startX = returning ? stairRun : 0;
    const baseY = returning ? -landingHeight : 0;
    const centerZ = (returning ? 0 : stairWidth + stairGap) + flightWidth / 2;
    for (let step = 0; step < stairRisers - 1; step++) {
      const x = startX + direction * (step + 0.5) * stairGoing;
      const y = baseY - (step + 1) * stairRise;
      box(flight, x, y - 0.05, centerZ, stairGoing, 0.1, flightWidth, oak).name = 'Basement oak tread';
      box(flight, x - direction * (stairGoing / 2 - 0.04), y + (stairRise - 0.1) / 2, centerZ, 0.08, stairRise - 0.1, flightWidth, cream).name = 'Basement closed riser';
    }
    const endX = startX + direction * stairRun;
    box(flight, endX + direction * 0.04, baseY - landingHeight + (stairRise - 0.1) / 2, centerZ, 0.08, stairRise - 0.1, flightWidth, cream).name = 'Basement landing riser';
    for (const side of [-1, 1]) {
      const railZ = !returning && side === 1 ? outerStairRailZ : centerZ + side * (flightWidth / 2 + 0.08);
      stairBeam('Basement stair stringer', [startX, baseY - stairRise - 0.2, railZ], [endX, baseY - landingHeight - 0.2, railZ], 0.12, 0.3, oak, flight);
      stairBeam('Basement sloped handrail', [startX, baseY + 3, railZ], [endX, baseY - landingHeight + 3, railZ], 0.12, 0.12, oak, flight);
      for (let rail = 1; rail <= 8; rail++) stairBeam('Basement sloped guard rail', [startX, baseY + rail / 3, railZ], [endX, baseY - landingHeight + rail / 3, railZ], 0.045, 0.045, black, flight);
      for (const step of [0, 4, 8]) {
        box(flight, startX + direction * step * stairGoing, baseY - step * stairRise + 1.5, railZ, 0.09, 3, 0.09, black).name = 'Basement stair guard post';
      }
    }
  }
  box(basementStairs, (stairRun + landingEndX) / 2, -landingHeight - 0.1, stairDepth / 2, landingEndX - stairRun, 0.2, stairDepth, oak).name = 'Basement turning landing';
  box(basementStairs, -stairWidth / 2, -2 * landingHeight - 0.1, stairWidth / 2, stairWidth, 0.2, stairWidth, oak).name = 'Basement arrival landing';
  // Meet the floor slab's underside instead of duplicating its opening-edge faces.
  const stairwellWallTop = -0.24 - 0.45 / 2;
  const stairwellWallHeight = 2 * landingHeight + stairwellWallTop;
  const stairwellWallCenterY = -2 * landingHeight + stairwellWallHeight / 2;
  box(basementStairs, landingEndX + stairwellWallThickness / 2, stairwellWallCenterY, stairDepth / 2, stairwellWallThickness, stairwellWallHeight, stairDepth, wallMaterial).name = 'Basement stairwell end wall';
  for (const z of [-stairwellWallThickness / 2, stairDepth + stairwellWallThickness / 2]) box(basementStairs, landingEndX / 2, stairwellWallCenterY, z, landingEndX, stairwellWallHeight, stairwellWallThickness, wallMaterial).name = 'Basement stairwell side wall';

  function cabinet(parent, x, z, width, depth = 2, height = 2.85) {
    box(parent, x, height / 2 + 0.05, z, width, height, depth, cabinetFinish);
    box(parent, x, height + 0.12, z, width + 0.06, 0.14, depth + 0.05, countertop);
    const doors = Math.max(1, Math.round(width / 1.5));
    for (let i = 0; i < doors; i++) {
      const center = x - width / 2 + (i + 0.5) * width / doors;
      const front = shakerFront(parent, center, height / 2 + 0.05, z + depth / 2 + 0.04, width / doors - 0.04, height - 0.04);
      cabinetPull(front, 0, Math.min(height - 0.3, 4) - (height / 2 + 0.05), 0.09, 0.65);
    }
  }

  const prep = furnishing('Prep kitchen cabinetry', 0, 0);
  for (const [x, width] of [[prepSinkX - 3.775, 4.55], [prepSinkX + 3.225, 3.45]]) cabinet(prep, x, 9.25, width);
  const prepExtension = furnishing('Prep counter extension with six drawers', 53.775, 9.25);
  prepExtension.userData = { widthInches: 34.2, depthInches: 24, drawerBanks: 2, drawers: 6, provisional: true };
  box(prepExtension, 0, 1.475, 0, 2.85, 2.85, 2, cabinetFinish).name = 'Prep extension cabinet carcass';
  box(prepExtension, 0, 2.97, 0, 2.91, 0.14, 2.05, countertop).name = 'Prep extension quartz counter';
  for (const x of [-0.7125, 0.7125]) drawerFront(x, 1.04, 1.385, 0, prepExtension);
  const prepSink = new THREE.Group();
  prepSink.name = 'Prep single-bowl sink and base';
  prepSink.position.set(prepSinkX, 0, 9.25);
  prepSink.userData = { nominalSinkWidthInches: 30, sinkDepthInches: 18, baseWidthInches: 36, provisional: true };
  prep.add(prepSink);
  box(prepSink, 0, 1.1, 0, 3, 2.1, 2, cabinetFinish).name = 'Prep sink low cabinet carcass';
  for (const side of [-1, 1]) {
    box(prepSink, side * (1.5 - 0.03125), 2.5, 0, 0.0625, 0.7, 2, cabinetFinish).name = 'Prep sink cabinet side';
    const front = shakerFront(prepSink, side * 0.75, 1.475, 1.04, 1.46, 2.81);
    cabinetPull(front, -side * 0.55, 0.9, 0.09, 0.6, true);
    box(prepSink, side * 1.375, 2.97, 0, 0.25, 0.14, 2.05, countertop).name = 'Prep sink side counter';
    box(prepSink, 0, 2.97, side * 0.8875, 2.5, 0.14, 0.275, countertop).name = 'Prep sink front or rear counter';
    box(prepSink, side * 1.22, 2.68, 0, 0.06, 0.6, 1.5, steel).name = 'Prep sink basin side';
    box(prepSink, 0, 2.68, side * 0.72, 2.38, 0.6, 0.06, steel).name = 'Prep sink basin end';
  }
  box(prepSink, 0, 2.345, 0, 2.5, 0.07, 1.5, steel).name = 'Prep sink basin floor';
  cylinder(prepSink, 0, 2.386, 0, 0.09, 0.012, black).name = 'Prep sink drain';
  cylinder(prepSink, 0, 3.55, -0.88, 0.045, 1.16, steel).name = 'Prep sink faucet stem';
  box(prepSink, 0, 4.08, -0.57, 0.09, 0.09, 0.64, steel, true).name = 'Prep sink faucet spout';
  cylinder(prepSink, 0, 3.98, -0.28, 0.045, 0.2, steel).name = 'Prep sink faucet outlet';
  box(prep, 48.275, 3.45, 8.22, 13.85, 0.82, 0.08, countertop).name = 'Prep quartz backsplash';
  for (const [index, x] of prepWindowCenters.entries()) {
    windowFrame(`Prep counter window ${index + 1}`, x, 8, prepWindowWidth, prepWindowHeight, prepWindowSill, 0, rest);
  }
  const prepTower = furnishing('Prep microwave and wall oven tower', 39.875, 8.25 + 25 / 24);
  const prepTowerWidth = 33 / 12;
  const prepTowerDepth = 25 / 12;
  const prepTowerSide = 0.75 / 12;
  const prepApplianceBottom = 2;
  const prepApplianceTop = 6;
  const prepTowerFront = prepTowerDepth / 2 + 0.04;
  prepTower.userData = { widthInches: 33, depthInches: 25, nominalApplianceWidthInches: 30, allowanceHeightInches: 48, modelSelected: false, provisional: true };
  for (const side of [-1, 1]) {
    box(prepTower, side * (prepTowerWidth - prepTowerSide) / 2, 4.575, 0, prepTowerSide, 8.55, prepTowerDepth, cabinetFinish).name = 'Prep appliance tower side';
  }
  box(prepTower, 0, 4.575, -prepTowerDepth / 2 + 0.025, prepTowerWidth - 2 * prepTowerSide, 8.55, 0.05, cabinetFinish).name = 'Prep appliance tower backing';
  box(prepTower, 0, 0.15, 0, prepTowerWidth - 0.2, 0.3, prepTowerDepth - 0.2, black).name = 'Prep appliance tower toe-kick';
  for (const y of [prepApplianceBottom - prepTowerSide / 2, prepApplianceTop + prepTowerSide / 2]) {
    box(prepTower, 0, y, 0, prepTowerWidth - 2 * prepTowerSide, prepTowerSide, prepTowerDepth, cabinetRailFinish).name = 'Prep appliance support shelf';
  }
  for (const [bottom, top] of [[0.3, prepApplianceBottom - prepTowerSide], [prepApplianceTop + prepTowerSide, 8.85]]) {
    for (const side of [-1, 1]) {
      const front = shakerFront(prepTower, side * prepTowerWidth / 4, (bottom + top) / 2, prepTowerFront, prepTowerWidth / 2 - 0.04, top - bottom - 0.04);
      cabinetPull(front, -side * (prepTowerWidth / 4 - 0.15), bottom < prepApplianceBottom ? (top - bottom) / 2 - 0.35 : -(top - bottom) / 2 + 0.35, 0.09, 0.6, true);
    }
  }
  box(prepTower, 0, 8.925, 0, prepTowerWidth, 0.15, prepTowerDepth, cabinetRailFinish).name = 'Prep appliance tower cornice';
  const prepCombination = new THREE.Group();
  prepCombination.name = '30-inch microwave and wall oven combination';
  prepCombination.userData = { nominalWidthInches: 30, allowanceHeightInches: 48, allowanceDepthInches: 24, bottomInches: 24, modelSelected: false, provisional: true };
  prepTower.add(prepCombination);
  box(prepCombination, 0, 4, 0, 2.5, 4, 2, steel).name = 'Prep combination appliance envelope';
  for (const [name, y, height, handleY] of [['Wall oven', 3.25, 2.1, 4.15], ['Microwave', 5.2, 1.15, 4.72]]) {
    box(prepCombination, 0, y, prepTowerFront + 0.03, 2.25, height, 0.02, black).name = `Prep ${name} glass door`;
    box(prepCombination, 0, handleY, prepTowerFront + 0.12, 2.1, 0.07, 0.1, steel).name = `Prep ${name} handle`;
  }
  box(prepCombination, 0, 5.9, prepTowerFront + 0.03, 2.25, 0.15, 0.02, black).name = 'Prep combination appliance controls';
  const coffeeStation = furnishing('Prep coffee station', 43.8, 9.45);
  box(coffeeStation, 0, 3.765, 0, 1.1, 1.45, 1.1, black, true);
  cylinder(coffeeStation, 0.75, 3.19, 0.1, 0.16, 0.3, porcelain);

  const prepShelves = furnishing('Prep open pantry shelves', 47, 14.15);
  const prepShelfWidth = 15;
  const prepShelfDepth = 1;
  const prepShelfThickness = 0.75 / 12;
  const prepShelfBays = 5;
  prepShelves.userData = { widthInches: 180, depthInches: 12, bays: prepShelfBays, shelfLevels: 6, provisional: true };
  for (let support = 0; support <= prepShelfBays; support++) {
    const x = -prepShelfWidth / 2 + prepShelfThickness / 2 + support * (prepShelfWidth - prepShelfThickness) / prepShelfBays;
    box(prepShelves, x, 4.375, 0, prepShelfThickness, 7.25, prepShelfDepth, cabinetFinish).name = 'Pantry shelf upright';
  }
  for (const y of [1, 2.3, 3.6, 4.9, 6.2, 7.5]) {
    for (let bay = 0; bay < prepShelfBays; bay++) {
      const bayWidth = (prepShelfWidth - prepShelfThickness) / prepShelfBays;
      const x = -prepShelfWidth / 2 + prepShelfThickness / 2 + (bay + 0.5) * bayWidth;
      box(prepShelves, x, y, 0, bayWidth - prepShelfThickness, prepShelfThickness, prepShelfDepth, cabinetRailFinish).name = 'Open pantry shelf';
    }
  }

  tiledFloor('Mudroom tile', 38, 15, 7.4, 11.9);
  const mudBench = furnishing('Six-cubby mudroom bench', 44.25, 22.75, -Math.PI / 2);
  mudBench.userData = { cubbies: 6, hooks: 12 };
  box(mudBench, 0, 1.55, 0, 7.8, 0.18, 1.8, oak);
  box(mudBench, 0, 0.2, 0, 7.8, 0.15, 1.65, oak);
  box(mudBench, 0, 4.2, -0.82, 7.8, 5, 0.12, cream);
  for (let i = 0; i <= 6; i++) box(mudBench, -3.9 + i * 1.3, 0.88, 0, 0.08, 1.3, 1.65, oak);
  for (let i = 0; i < 6; i++) {
    const x = -3.25 + i * 1.3;
    for (const dx of [-0.25, 0.25]) cylinder(mudBench, x + dx, 4.2, -0.66, 0.07, 0.18, brass);
    box(mudBench, x, 6.45, -0.2, 1.22, 0.1, 1.3, oak);
  }
  const laundry = furnishing('Future stacked laundry reservation', 39.8, 16.7);
  laundry.userData = { reserved: true, width: 3, depth: 3, height: 7 };
  box(laundry, 0, 3.5, 0, 3, 7, 3, linen);
  for (const y of [1.85, 5.05]) {
    const drum = cylinder(laundry, 0, 0, 0, 0.8, 0.08, black);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(0, y, 1.55);
    box(laundry, 0, y + 1, 1.55, 2.5, 0.12, 0.06, cream);
  }
  const mudCoats = furnishing('Mudroom coat and vacuum closet', 39.25, 19.6, Math.PI / 2);
  box(mudCoats, 0, 4, 0, 2.25, 8, 2, cabinetFinish);
  const mudCoatFront = shakerFront(mudCoats, 0, 4, 1.05, 2.21, 7.96);
  cabinetPull(mudCoatFront, -0.85, 0.3, 0.09, 1, true);
  const dropZone = furnishing('Mudroom drop zone', 43.3, 16.1);
  cabinet(dropZone, 0, 0, 1.7, 1.4);
  box(dropZone, 0, 4.5, -0.65, 1.5, 1.8, 0.08, black);

  const epoxy = mat('#a7aaa6', 0.55);
  for (const [x, z, width, depth] of [[45.4, 15, 10.1, 11.9], [29, 26.9, 26.5, 7.7], [31.2, 34.6, 24.3, 14.4]]) {
    box(rest, x + width / 2, 0.02, z + depth / 2, width, 0.03, depth, epoxy).name = 'Garage epoxy floor';
  }

  function vehicle(name, x, z, lengthInches, bodyWidthInches, mirrorWidthInches, heightInches, wheelbaseInches, pickup) {
    const car = furnishing(name, x, z);
    const length = lengthInches / 12;
    const width = bodyWidthInches / 12;
    const height = heightInches / 12;
    car.userData = { lengthInches, bodyWidthInches, mirrorWidthInches, heightInches, wheelbaseInches, approximate: true };
    const paint = new THREE.MeshStandardMaterial({ color: pickup ? '#a8aca9' : '#3c4650', metalness: 0.55, roughness: 0.3 });
    const glazing = mat('#35454b', 0.18);
    box(car, 0, pickup ? 2 : 1.5, 0, width, pickup ? 1.7 : 1.4, length, paint, true).name = 'Vehicle body envelope';
    const cabZ = pickup ? -2 : -0.25;
    const cabDepth = pickup ? 7.3 : 7.6;
    const cabBottom = pickup ? 2.85 : 2.2;
    box(car, 0, (height + cabBottom) / 2, cabZ, width - 0.5, height - cabBottom, cabDepth, paint, true);
    box(car, 0, height - 1.1, cabZ - cabDepth / 2 - 0.02, width - 0.9, 1.5, 0.08, glazing);
    box(car, 0, height - 1.1, cabZ + cabDepth / 2 + 0.02, width - 0.9, 1.5, 0.08, glazing);
    for (const side of [-1, 1]) {
      box(car, side * (width / 2 - 0.21), height - 1.1, cabZ, 0.08, 1.5, cabDepth - 0.6, glazing);
      box(car, side * (width / 2 - 0.14), height - 1.1, cabZ, 0.1, 1.65, 0.12, paint);
      box(car, side * (mirrorWidthInches / 24 - 0.16), pickup ? 4.4 : 3.3, cabZ - 2.6, 0.32, 0.32, 0.62, black, true).name = 'Vehicle mirror';
      for (const axle of [-1, 1]) {
        const wheel = cylinder(car, side * (width / 2 - 0.4), pickup ? 1.35 : 1.08, axle * wheelbaseInches / 24, pickup ? 1.35 : 1.08, 0.7, black);
        wheel.rotation.z = Math.PI / 2;
        const rim = cylinder(car, side * (width / 2 - 0.02), pickup ? 1.35 : 1.08, axle * wheelbaseInches / 24, pickup ? 0.86 : 0.72, 0.06, steel);
        rim.rotation.z = Math.PI / 2;
      }
    }
    if (pickup) {
      box(car, 0, 2.91, 5.65, width - 0.7, 0.12, 7.2, black).name = 'Pickup open bed';
      for (const side of [-1, 1]) box(car, side * (width / 2 - 0.16), 3.5, 5.65, 0.32, 1.25, 7.2, paint);
      box(car, 0, 3.5, length / 2 - 0.2, width, 1.25, 0.3, paint);
    }
    for (const side of [-1, 1]) {
      box(car, side * (width / 2 - 0.65), pickup ? 2.7 : 1.9, -length / 2 + 0.025, 0.9, 0.22, 0.04, light);
      box(car, side * (width / 2 - 0.5), pickup ? 2.7 : 1.9, length / 2 - 0.025, 0.55, 0.28, 0.04, mat('#ad4335'));
    }
    return car;
  }
  vehicle('GMC Sierra EV', 48.5, 37, 233.42, 83.8, 95.7, 80, 145.7, true);
  vehicle('BMW i4', 37, 38.4, 188.5, 72.9, 81.6, 57, 112.4, false);
  for (const x of [32.5, 41.5, 44, 53]) box(rest, x, 0.045, 38.2, 0.05, 0.01, 21.2, cream).name = 'Garage bay stripe';
  for (const x of [37, 48.5]) box(rest, x, 0.045, 48.9, 9, 0.01, 0.12, black).name = 'Nine-foot garage door threshold';
  for (const x of [31.6, 55.1]) {
    const charger = furnishing('EV charger', x, 42, x < 40 ? Math.PI / 2 : -Math.PI / 2);
    box(charger, 0, 4.4, 0, 0.7, 1.3, 0.35, black, true);
    const cable = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 8, 32), black);
    cable.position.set(0, 3.25, 0.12);
    charger.add(cable);
  }
  const workbench = furnishing('Garage tool workbench', 48.6, 16.4);
  cabinet(workbench, 0, 0, 5.5, 1.8);
  box(workbench, 0, 5, -0.85, 5.5, 3, 0.08, black);
  for (let i = 0; i < 6; i++) box(workbench, -2.1 + i * 0.8, 5, -0.74, 0.06, 1, 0.08, steel);
  const bikeRack = furnishing('Six-bike garage rack', 54.35, 21.6, -Math.PI / 2);
  bikeRack.userData = { bikes: 6 };
  box(bikeRack, 0, 6.1, -0.1, 6.6, 0.12, 0.12, steel);
  for (let i = 0; i < 6; i++) {
    const x = -2.75 + i * 1.1;
    for (const y of [1.4, 5.15]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.065, 8, 32), black);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(x, y, 0.5);
      bikeRack.add(wheel);
    }
    box(bikeRack, x, 3.25, 0.5, 0.12, 3.9, 0.12, oak);
    box(bikeRack, x, 3.2, 0.9, 0.12, 0.12, 1.5, steel);
    box(bikeRack, x, 3.9, 1.05, 0.65, 0.12, 0.15, black);
  }

  const kidsRug = furnishing('Kids play rug', 6.6, 31.1);
  box(kidsRug, 0, 0.07, 0, 7.2, 0.06, 5.8, linen, true);
  const toyStorage = furnishing('Kids low toy storage', 6.2, 26.7);
  cabinet(toyStorage, 0, 0, 6.8, 1.2, 1.8);
  const readingBench = furnishing('Kids reading bench', 1.2, 31, Math.PI / 2);
  cabinet(readingBench, 0, 0, 5.5, 1.5, 1.2);
  box(readingBench, 0, 1.47, 0, 5.4, 0.25, 1.45, cushion, true);
  const activityTable = furnishing('Kids activity table', 6.6, 31.1);
  box(activityTable, 0, 1.65, 0, 3.2, 0.12, 2.4, oak, true);
  for (const x of [-1.25, 1.25]) for (const z of [-0.9, 0.9]) box(activityTable, x, 0.8, z, 0.1, 1.6, 0.1, oak);
  for (const x of [-2.5, 2.5]) {
    const seat = furnishing('Kids activity stool', 6.6 + x, 31.1);
    cylinder(seat, 0, 1.05, 0, 0.55, 0.18, cream);
    for (const dx of [-0.3, 0.3]) box(seat, dx, 0.5, 0, 0.1, 1, 0.6, oak);
  }

  const officeDesk = furnishing('Article Culla office desk', 6.5, 42.25);
  officeDesk.userData = { widthInches: 55, depthInches: 20 };
  box(officeDesk, 0, 2.4, 0, 55 / 12, 0.2, 20 / 12, oak);
  for (const x of [-2, 2]) for (const z of [-0.62, 0.62]) box(officeDesk, x, 1.2, z, 0.12, 2.4, 0.12, oak);
  box(officeDesk, 0, 3.5, -0.25, 1.9, 1.1, 0.1, black, true);
  box(officeDesk, 0, 2.53, -0.25, 0.9, 0.06, 0.5, steel);
  box(officeDesk, 0, 2.8, -0.25, 0.08, 0.55, 0.08, steel);
  box(officeDesk, 0, 2.53, 0.45, 1.2, 0.06, 0.4, black);
  const deskChair = furnishing('Office task chair', 6.5, 44.6, Math.PI);
  box(deskChair, 0, 1.6, 0, 1.8, 0.3, 1.7, black, true);
  box(deskChair, 0, 2.5, -0.7, 1.8, 1.6, 0.2, black, true);
  cylinder(deskChair, 0, 0.8, 0, 0.12, 1.5, steel);
  for (const angle of [0, Math.PI / 3, 2 * Math.PI / 3]) {
    const foot = box(deskChair, 0, 0.15, 0, 2.2, 0.12, 0.1, black);
    foot.rotation.y = angle;
  }
  const officeStorage = furnishing('Office bookcase', 2.4, 41.9);
  box(officeStorage, 0, 3.5, 0, 3.3, 7, 1.15, oak);
  for (let shelf = 0; shelf < 5; shelf++) {
    box(officeStorage, 0, 0.8 + shelf * 1.3, 0.61, 3.1, 0.1, 0.12, cream);
    for (let book = 0; book < 7; book++) box(officeStorage, -1.3 + book * 0.35, 1.2 + shelf * 1.3, 0.66, 0.18, 0.65, 0.55, book % 2 ? linen : cream);
  }
  const officeLounge = furnishing('Office reading chair', 3, 50, -0.2);
  box(officeLounge, 0, 1, 0, 2.7, 0.8, 2.8, cream, true);
  box(officeLounge, 0, 2, -1.15, 2.7, 1.4, 0.35, cushion, true);
  for (const side of [-1.2, 1.2]) box(officeLounge, side, 1.5, 0, 0.3, 0.8, 2.8, cream, true);
  const officeSide = furnishing('Office side table', 5.5, 50.2);
  cylinder(officeSide, 0, 1.7, 0, 0.6, 0.12, oak);
  cylinder(officeSide, 0, 0.85, 0, 0.12, 1.7, black);

  const bed = furnishing('Article Lenia queen bed', 25.1, 48.15);
  bed.userData = { widthInches: 63.5, depthInches: 82.75 };
  box(bed, 0, 1, 0, 63.5 / 12, 0.5, 82.75 / 12, oak);
  for (const x of [-2.25, 2.25]) for (const z of [-3, 3]) box(bed, x, 0.4, z, 0.18, 0.8, 0.18, oak);
  box(bed, 0, 2.1, -82.75 / 24 + 0.1, 63.5 / 12, 3.3, 0.2, oak, true);
  box(bed, 0, 1.63, 0.05, 5, 0.75, 6.65, cushion, true);
  box(bed, 0, 2.02, 1.1, 5.03, 0.08, 3.8, linen, true);
  for (const x of [-1.25, 1.25]) box(bed, x, 2.12, -2.2, 2.1, 0.35, 1.35, porcelain, true);
  for (const x of [21.4, 28.8]) {
    const nightstand = furnishing('Bedroom nightstand', x, 45.7);
    cabinet(nightstand, 0, 0, 1.5, 1.3, 1.6);
    cylinder(nightstand, 0, 2.4, 0, 0.05, 1.2, brass);
    cylinder(nightstand, 0, 3, 0, 0.4, 0.45, cream, 0.25);
  }
  const wardrobe = furnishing('Walk-in closet fittings', 0, 0);
  box(wardrobe, 20.25, 7.6, 37.8, 1.8, 0.15, 5.8, oak);
  const closetRail = cylinder(wardrobe, 20.25, 5.8, 37.8, 0.045, 5.8, brass);
  closetRail.rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) {
    const longHang = i < 4;
    box(wardrobe, 20.25, longHang ? 3.2 : 4.6, 35.6 + i * 0.62, 1.25, longHang ? 4.8 : 2, 0.12, i % 2 ? cream : linen);
    if (!longHang) box(wardrobe, 20.25, 1.9, 35.6 + i * 0.62, 1.25, 2, 0.12, cream);
  }
  const shortHangRail = cylinder(wardrobe, 20.25, 3.1, 39.15, 0.045, 2.7, brass);
  shortHangRail.rotation.x = Math.PI / 2;
  cabinet(wardrobe, 23.2, 35.5, 2.8, 1.3, 2.85);
  const linenStorage = furnishing('Bathroom linen cabinet', 30.4, 40.55, -Math.PI / 2);
  cabinet(linenStorage, 0, 0, 2.1, 1.2, 6.8);
  const hallStorage = furnishing('Powder linen storage', 11.4, 39.75, -Math.PI / 2);
  cabinet(hallStorage, 0, 0, 2, 1.2, 6.8);

  function toilet(name, x, z, rotation = 0) {
    const wc = furnishing(name, x, z, rotation);
    box(wc, 0, 1.45, -0.75, 1.65, 2.4, 0.6, porcelain, true);
    cylinder(wc, 0, 0.6, 0, 0.43, 1.15, porcelain);
    const seat = new THREE.Mesh(new THREE.TorusGeometry(0.51, 0.13, 12, 32), porcelain);
    seat.rotation.x = Math.PI / 2;
    seat.scale.y = 1.2;
    seat.position.set(0, 1.3, 0.08);
    wc.add(seat);
    box(wc, 0, 2.7, -0.75, 1.75, 0.1, 0.7, porcelain, true);
  }

  function vanity(name, x, z, width, rotation = 0) {
    const unit = furnishing(name, x, z, rotation);
    cabinet(unit, 0, 0, width, 1.5, 2.65);
    box(unit, 0, 2.86, 0, width * 0.6, 0.16, 1, porcelain, true);
    cylinder(unit, 0, 3.1, -0.55, 0.04, 0.65, brass);
    box(unit, 0, 3.4, -0.4, 0.08, 0.08, 0.35, brass);
    box(unit, 0, 5.1, -0.72, width * 0.82, 2.3, 0.06, steel, true);
  }
  tiledFloor('Powder room tile', 0, 36.1, 7.1, 4.9);
  toilet('Powder toilet', 1.6, 37.65);
  vanity('Powder vanity', 5.5, 39.95, 2.3, Math.PI);
  tiledFloor('Guest bathroom tile', 25, 34.6, 6.2, 4.6);
  vanity('Guest bathroom vanity', 29.8, 36, 2.2, -Math.PI / 2);
  toilet('Guest bathroom toilet', 26.55, 36.3);

  const entry = furnishing('Entry console', 18.25, 47.5, -Math.PI / 2);
  cabinet(entry, 0, 0, 4, 0.9, 2.6);
  box(entry, 0, 4.9, -0.4, 2.5, 2.4, 0.05, steel, true);
  const rug = mat('#ded5be');
  box(rest, 15.6, 0.05, 49.9, 3.2, 0.05, 6.2, rug).name = 'Entry runner';
  const frontDoor = furnishing('Double front entry', 15.6, 54.2);
  for (const side of [-1, 1]) {
    box(frontDoor, side * 1.25, 3.45, 0, 2.45, 6.9, 0.12, oak);
    box(frontDoor, side * 1.25, 4.15, -0.08, 1.65, 3.6, 0.04, glass);
    box(frontDoor, side * 0.22, 3.15, -0.14, 0.06, 1, 0.08, brass);
    windowFrame('Entry sidelight', side * 2.825, 0, 0.7, 6.9, 0, 0, frontDoor, -1);
  }
  tiledFloor('Porch paving', 0, 54.2, 31.2, 7, mat('#c9c7bc'));
  for (const x of [5, 26.2]) {
    const porchBench = furnishing('Porch bench', x, 55.4);
    box(porchBench, 0, 1.4, 0, 5, 0.2, 1.7, oak);
    box(porchBench, 0, 2.1, -0.7, 5, 1.3, 0.15, oak);
    for (const side of [-2.1, 2.1]) box(porchBench, side, 0.7, 0, 0.15, 1.4, 1.5, black);
  }
  windowFrame('Office side window', 0.1, 49, 4, 5, 3, -Math.PI / 2, rest, -1);
  windowFrame('Kids side window', 0.1, 30, 4, 5, 3, -Math.PI / 2, rest, -1);
  windowFrame('Bedroom porch window', 25, 54.1, 7.6, 5, 3, 0, rest, -1);

  const ground = new THREE.Group();
  ground.name = 'Site ground around basement stairwell';
  scene.add(ground);
  const groundMaterial = mat('#eeeee6');
  const excavationLeft = stairOpening.x - stairWidth;
  // Soil meets the retaining walls' outer faces, not their visible stairwell faces.
  const excavationRight = stairOpening.x + stairOpening.width + stairwellWallThickness;
  const excavationFront = stairOpening.z - stairwellWallThickness;
  const excavationBack = stairOpening.z + stairOpening.depth + stairwellWallThickness;
  for (const [x, z, width, depth] of [
    [-95, -92, excavationLeft + 95, 240],
    [excavationRight, -92, 145 - excavationRight, 240],
    [excavationLeft, -92, excavationRight - excavationLeft, excavationFront + 92],
    [excavationLeft, excavationBack, excavationRight - excavationLeft, 148 - excavationBack]
  ]) {
    const part = box(ground, x + width / 2, -0.75, z + depth / 2, width, 0.5, depth, groundMaterial);
    part.name = 'Site ground outside stair excavation';
    part.castShadow = false;
  }
  const presets = {
    social: { target: [19, 2, 12], offset: [27, 55, 32], span: 43 },
    living: { target: [6.7, 1, 16.4], offset: [24, 23, 22], span: 24 },
    dining: { target: [19.8, 1, 2.6], offset: [16, 19, 23], span: 20 },
    kitchen: { target: [32.2, 2, kitchenCenterZ], offset: [-22, 35, 27], span: 26 },
    cooktop: { target: [37, 5.3, cooktopCenterZ], offset: [-18, 0, 0], span: 11 },
    fridge: { target: [bottomRunCenterX, 5, 26.9], offset: [0, 0, -18], span: 12 },
    island: { target: [30.65 + island.position.x, 1.5, kitchenCenterZ], offset: [-12, 9, 10], span: 15 },
    whole: { target: [27, 0, 29], offset: [35, 75, 50], span: 78 },
    garage: { target: [43, 1, 33], offset: [28, 48, 36], span: 42 },
    prep: { target: [44, 1, 16], offset: [-28, 44, 30], span: 28 },
    private: { target: [15.6, 1, 43], offset: [32, 49, 37], span: 40 },
    basement: { target: [22, -3, 30.4], offset: [-4, 30, 5], span: 21 },
    top: { target: [27, 0, 29], offset: [0, 110, 0.1], span: 72 }
  };
  let currentView = 'whole';

  function updatePendantVisibility() {
    const showPendants = currentView !== 'top' && currentView !== 'fridge' && currentView !== 'cooktop';
    pendant.visible = showPendants;
    islandPendants.visible = showPendants && islandLightsInput.checked;
  }

  function setView(name) {
    currentView = name;
    const elevationView = name === 'fridge' || name === 'cooktop';
    controls.maxPolarAngle = elevationView ? Math.PI / 2 : Math.PI / 2.12;
    const preset = presets[name];
    const aspect = viewport.clientWidth / viewport.clientHeight;
    const offset = new THREE.Vector3(...preset.offset);
    const portraitPadding = aspect < 1 ? 1.25 : 1;
    camera = name === 'cooktop' ? cooktopElevationCamera : perspectiveCamera;
    controls.object = camera;
    camera.zoom = 1;
    if (camera.isOrthographicCamera) {
      const halfHeight = preset.span * portraitPadding / (2 * Math.min(aspect, 1));
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
    } else {
      camera.aspect = aspect;
      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const minimumDistance = preset.span * portraitPadding / (2 * Math.tan(verticalFov / 2) * Math.min(aspect, 1));
      offset.setLength(Math.max(offset.length(), minimumDistance));
    }
    camera.updateProjectionMatrix();
    controls.target.set(...preset.target);
    camera.position.copy(controls.target).add(offset);
    controls.update();
    const showWholeFloor = !['social', 'living', 'dining', 'kitchen', 'cooktop', 'island', 'fridge'].includes(name);
    const basementCutaway = name === 'basement';
    shell.visible = showWholeFloor && !basementCutaway;
    stairs.visible = showWholeFloor || ['kitchen', 'fridge'].includes(name);
    for (const part of upstairsStairParts) part.visible = !basementCutaway;
    island.visible = !elevationView;
    cooktopHood.visible = name !== 'fridge';
    updatePendantVisibility();
    for (const accessory of [cuttingBoard, utensilCrock, seasoningTray]) accessory.visible = name !== 'cooktop';
    viewButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.view === name));
    });
    document.querySelectorAll('.furniture-card').forEach((card) => {
      card.classList.toggle('selected', card.dataset.room === name);
    });
    renderer.domElement.setAttribute('aria-label', basementCutaway ? '3D floor plan: basement stair cutaway, surrounding shell and upstairs stairs hidden' : `3D floor plan: ${name === 'social' ? 'living, dining and kitchen' : name} view, full-height walls`);
    render();
  }

  viewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setView(button.dataset.view);
      if (button.closest('.furniture-card')) viewport.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
  });
  function setFreezerAngle(angle) {
    freezerDoor.rotation.y = -THREE.MathUtils.degToRad(angle);
    freezerDoor.userData.openAngleDegrees = angle;
    freezerButton.textContent = angle ? `Left freezer: ${angle}\u00b0 (concept)` : 'Left freezer: closed';
    freezerButton.setAttribute('aria-pressed', String(angle !== 0));
  }
  freezerButton.addEventListener('click', () => {
    const angles = [0, 90, 115];
    setFreezerAngle(angles[(angles.indexOf(freezerDoor.userData.openAngleDegrees) + 1) % angles.length]);
    render();
  });
  islandLightsInput.addEventListener('change', () => {
    updatePendantVisibility();
    render();
  });
  resetButton.disabled = false;
  resetButton.addEventListener('click', () => {
    setFreezerAngle(0);
    setView('whole');
  });
  viewport.addEventListener('keydown', (event) => {
    if (event.target !== viewport) return;
    const moves = { ArrowLeft: -0.15, ArrowRight: 0.15 };
    if (event.key in moves) {
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), moves[event.key]);
      camera.position.copy(controls.target).add(offset);
    } else if (event.key === '+' || event.key === '-' || event.key === '=') {
      if (camera.isOrthographicCamera) {
        camera.zoom = THREE.MathUtils.clamp(camera.zoom * (event.key === '-' ? 0.9 : 1.1), 0.1, 20);
        camera.updateProjectionMatrix();
      } else {
        const offset = camera.position.clone().sub(controls.target);
        offset.setLength(THREE.MathUtils.clamp(offset.length() * (event.key === '-' ? 1.1 : 0.9), controls.minDistance, controls.maxDistance));
        camera.position.copy(controls.target).add(offset);
      }
    } else if (event.key === 'Home') {
      setFreezerAngle(0);
      setView('whole');
    } else {
      return;
    }
    event.preventDefault();
    controls.update();
    render();
  });
  setNavigationMode('rotate');
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    console.error('The 3D floor plan lost its WebGL context.');
    showModelError('The 3D renderer lost its graphics connection. Reload this page to try again.');
  });
  function resize() {
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    setView(currentView);
  }
  function render() {
    renderer.render(scene, camera);
  }
  new ResizeObserver(resize).observe(viewport);
  resize();
  message.hidden = true;
  viewport.dataset.ready = 'true';
  freezerButton.disabled = false;
  islandLightsInput.disabled = false;
  navigationButtons.forEach((button) => { button.disabled = false; });
}
