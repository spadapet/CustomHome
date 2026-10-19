const viewport = document.getElementById('model-viewport');
const message = viewport.querySelector('.model-message');
const viewButtons = document.querySelectorAll('[data-view]');
const islandLightsInput = document.getElementById('show-island-lights');
const resetButton = document.getElementById('reset-view');
const navigationButtons = document.querySelectorAll('[data-navigation]');
const walkControls = document.getElementById('walk-controls');
const tourMap = document.getElementById('tour-map');
const tourStatus = document.getElementById('tour-status');
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
    let savedUpstairsLayout = UpstairsLayout.empty();
    let savedGroundLayout = UpstairsLayout.empty();
    if (window.location.protocol === 'file:') {
      console.warn('File preview uses the original upstairs layout. Serve the repository over HTTP to load saved edits and use the designer.');
      document.querySelector('.designer-launch span').textContent = 'Serve this folder over HTTP to load saved upstairs edits and use the designer.';
    } else {
      const response = await fetch('upstairs-layout.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Could not load upstairs-layout.json (${response.status}). Restore that file before starting the designer.`);
      savedUpstairsLayout = await response.json();
      const groundResponse = await fetch('ground-layout.json', { cache: 'no-store' });
      if (!groundResponse.ok) throw new Error(`Could not load ground-layout.json (${groundResponse.status}). Restore that file before starting the designer.`);
      savedGroundLayout = await groundResponse.json();
    }
    buildPreview(THREE, OrbitControls, RoundedBoxGeometry, savedUpstairsLayout, savedGroundLayout);
  } catch (error) {
    console.error('The 3D floor plan could not start.', error);
    showModelError(`The 3D preview could not load: ${error.message}. WebGL, a valid upstairs layout, and access to jsDelivr are required.`);
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
  navigationButtons.forEach((button) => { button.disabled = true; });
  walkControls.hidden = true;
  tourStatus.textContent = '';
  tourStatus.classList.remove('tour-notice');
  viewport.classList.remove('walking');
}

function buildPreview(THREE, OrbitControls, RoundedBoxGeometry, savedUpstairsLayout, savedGroundLayout) {
  // Model coordinates are feet; the supplied raster is a concept trace, not CAD.
  const ceilingHeight = 9;
  const garageRisers = 2;
  const garageRise = 7.5 / 12;
  const garageFloorY = -garageRisers * garageRise;
  const garageFloorAreas = [
    { x: 45.4, z: 15, w: 10.1, d: 11.9 },
    { x: 29, z: 26.9, w: 26.5, d: 7.7 },
    { x: 31.2, z: 34.6, w: 24.3, d: 14.4 }
  ];
  const garageEntry = { x: 40, z: 26.725, width: 3, going: 11 / 12 };
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
  let navigationMode = 'rotate';
  let activeFloor = 'ground';
  controls.enableDamping = false;
  controls.minDistance = 12;
  controls.maxDistance = 250;
  controls.maxPolarAngle = Math.PI / 2.12;
  controls.target.set(14, 0, 12);
  controls.addEventListener('change', render);
  function setNavigationMode(mode, start) {
    if (mode === 'walk' && activeFloor === 'exterior') return;
    if (mode === 'walk' && activeFloor === 'ground' && groundLayoutPreview) {
      setTourStatus('Tours are unavailable in the edited structure-only preview.');
      return;
    }
    const wasWalking = navigationMode === 'walk';
    if (mode === 'walk' && !wasWalking && !startWalking(start)) return;
    navigationMode = mode;
    if (wasWalking && mode !== 'walk') stopWalking();
    const walking = mode === 'walk';
    upstairs.labels.visible = !walking;
    const moving = mode === 'move';
    controls.enabled = !walking;
    controls.mouseButtons.LEFT = moving ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    controls.mouseButtons.RIGHT = moving ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
    controls.touches.ONE = moving ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    navigationButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.navigation === mode));
    });
    walkControls.hidden = !walking;
    viewport.classList.toggle('walking', walking);
    viewport.setAttribute('aria-label', activeFloor === 'exterior' ? `3D English-country exterior concept. Drag to ${moving ? 'move' : 'rotate'}; scroll or pinch to zoom. Select Front, Rear, West side, or East side for elevations.` : walking
      ? `3D ${activeFloor === 'upstairs' ? 'upstairs' : 'ground floor'} third-person tour. Click the floor or plan to travel; drag to look. Tour or Escape exits, Home resets.`
      : `3D ${activeFloor === 'upstairs' ? 'upstairs' : 'ground floor'}. Click the floor to enter the tour. Drag to ${moving ? 'move' : 'rotate'}; scroll or pinch to zoom. Keyboard: left/right arrows rotate, plus/minus zoom, Home resets.`);
    setTourStatus(walking ? 'Tour on.' : '');
    if (walking) viewport.focus({ preventScroll: true });
    else walkControls.querySelector('.tour-plan').open = false;
  }
  navigationButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.navigation;
      setNavigationMode(mode === 'walk' && navigationMode === 'walk' ? orbitSnapshot.navigationMode : mode);
    });
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
  const walkFloorAreas = [];
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
  const cupHardware = brass.clone();
  cupHardware.name = 'Top Knobs Honey Bronze - screen approximation';
  cupHardware.side = THREE.DoubleSide;

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

  function cabinetCupPull(parent, x, y, z) {
    const pull = new THREE.Group();
    pull.name = 'Top Knobs Dakota Charlotte M2223 cup pull';
    pull.position.set(x, y, z);
    pull.userData = { manufacturer: 'Top Knobs', model: 'M2223', finish: 'Honey Bronze', centerToCenterInches: 2 + 9 / 16, overallWidthInches: 3.75, heightInches: 1.125, projectionInches: 15 / 16, simplifiedGeometry: true };
    parent.add(pull);
    const height = 1.125 / 12;
    const projection = 15 / 16 / 12;
    const lipRadius = 0.03 / 12;
    const shellBottom = -height / 2 + lipRadius;
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 12, 0, Math.PI, 0, Math.PI / 2), cupHardware);
    shell.name = 'Downward-open bronze cup shell';
    shell.scale.set(1.5 / 12, height - lipRadius, projection - lipRadius);
    shell.position.y = shellBottom;
    pull.add(shell);
    const lipPoints = [];
    for (let step = 0; step <= 24; step++) {
      const angle = step * Math.PI / 24;
      lipPoints.push(new THREE.Vector3(Math.cos(angle) * 1.5 / 12, shellBottom, Math.sin(angle) * (projection - lipRadius)));
    }
    const lip = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lipPoints), 32, lipRadius, 8, false), cupHardware);
    lip.name = 'Rounded cup finger lip';
    pull.add(lip);
    for (const side of [-1, 1]) {
      box(pull, side * 1.5 / 12, 0, 0.03 / 12, 0.75 / 12, 0.5 / 12, 0.06 / 12, cupHardware, true).name = 'Cup pull mounting ear';
      const screw = cylinder(pull, side * 1.625 / 12, 0, 0.08 / 12, 0.09 / 12, 0.04 / 12, cupHardware);
      screw.name = 'Decorative cup pull screw';
      screw.rotation.x = Math.PI / 2;
      const slot = box(pull, side * 1.625 / 12, 0, 0.105 / 12, 0.13 / 12, 0.018 / 12, 0.01 / 12, black);
      slot.rotation.z = -0.5;
    }
  }

  function floor(x, z, w, d, furnished = false, parent = shell, interior = true, elevation = 0) {
    walkFloorAreas.push({ x, z, w, d, elevation });
    if (interior) interiorFloorAreas.push({ x, z, w, d });
    box(parent, x + w / 2, elevation - 0.24, z + d / 2, w, 0.45, d, furnished ? oak : shellFloor).userData.walkSurface = true;
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
    function part(name, x, y, z, w, h, d, material = sillOptions.casingMaterial ?? windowTrim, rounded = false) {
      const mesh = box(casing, x, y, z, w, h, d, material, rounded);
      mesh.name = name;
      const worldY = mesh.getWorldPosition(new THREE.Vector3()).y;
      mesh.userData = { bottom: worldY - h / 2, top: worldY + h / 2, offsetY: worldY - y };
      walls.push(mesh);
    }
    for (const edge of [-1, 1]) {
      part('White casing side board', edge * (width / 2 + reveal + sideWidth / 2), (height + reveal) / 2, 0.03125, sideWidth, height + reveal, 0.0625);
    }
    part('White casing header', 0, height + reveal + 5.5 / 24, 0.03125, outerWidth, 5.5 / 12, 0.0625);
    part('White casing header bead', 0, height + reveal + 0.03125, 0.05, outerWidth + 0.0625, 0.0625, 0.1);
    part('White casing projecting cap', 0, height + reveal + 5.5 / 12 + 0.0416667, 0.0625, outerWidth + 0.125, 1 / 12, 0.125);
    if (window) {
      const { material = windowTrim, depth = 0.25, thickness = 1 / 12, apronHeight = sideWidth, extraWidth = 0.125, rounded = false } = sillOptions;
      const sillWidth = outerWidth + extraWidth;
      const sillZ = sillOptions.material ? depth / 2 - faceDepth : 0.0625;
      const sillName = sillOptions.material ? 'Quartz plant window sill' : 'White window projecting sill';
      part(sillName, 0, -thickness / 2, sillZ, sillWidth, thickness, depth, material, rounded);
      const apronMaterial = sillOptions.apronMaterial ?? sillOptions.casingMaterial ?? windowTrim;
      const apronName = sillOptions.apronMaterial ? 'Quartz window apron' : 'White window apron';
      part(apronName, 0, -thickness - apronHeight / 2, 0.03125 - (sillOptions.apronInset ?? 0), outerWidth, apronHeight, 0.0625, apronMaterial);
    }
  }

  const baseTrimSections = [];
  function wall(x1, z1, x2, z2, furnished = false, openings = [], height = ceilingHeight, trimSides = [-1, 1], quartzSide = 0, base = 0) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const group = new THREE.Group();
    group.position.set(x1, 0, z1);
    group.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    (furnished ? scene : shell).add(group);
    function baseTrim(start, end, mesh) {
      const casingWidth = (3.5 + 0.125) / 12;
      const startCasing = openings.some(([a, b, bottom]) => bottom === 0 && Math.abs(b - start) < 0.001);
      const endCasing = openings.some(([a, b, bottom]) => bottom === 0 && Math.abs(a - end) < 0.001);
      const dx = (x2 - x1) / length;
      const dz = (z2 - z1) / length;
      const origin = new THREE.Vector2(x1, z1);
      const along = new THREE.Vector2(dx, dz);
      const across = new THREE.Vector2(-dz, dx);
      baseTrimSections.push({
        group, mesh, origin, along, across, start, end, startCasing, endCasing, wallLength: length,
        from: start + (startCasing ? casingWidth : 0), to: end - (endCasing ? casingWidth : 0),
        sides: trimSides.filter((side) => side !== quartzSide),
        footprint: { origin: origin.clone().addScaledVector(along, start), along, across, minU: 0, maxU: end - start, minV: -0.175, maxV: 0.175 }
      });
    }
    function part(start, end, bottom, top) {
      if (end <= start || top <= bottom) return;
      const mesh = box(group, (start + end) / 2, (bottom + top) / 2, 0, end - start, top - bottom, 0.35, wallMaterial);
      mesh.name = 'House wall';
      mesh.userData = { bottom, top, quartzSide };
      walls.push(mesh);
      if (bottom <= 0 && top >= 8 / 12) baseTrim(start, end, mesh);
    }
    let cursor = 0;
    openings.forEach(([start, end, bottom, top]) => {
      part(cursor, start, base, height);
      part(start, end, base, bottom);
      part(start, end, top, height);
      if (bottom === 0 || bottom === base) {
        for (const side of trimSides) openingCasing(group, (start + end) / 2, bottom, end - start, top - bottom, 0.175, side);
      }
      cursor = end;
    });
    part(cursor, length, base, height);
  }

  function joinWallCorners() {
    const tolerance = 0.000001;
    function meetsWall(section, distance, direction) {
      const point = section.origin.clone().addScaledVector(section.along, distance);
      const beyond = point.clone().addScaledVector(section.along, direction * 0.0875);
      if (baseTrimSections.some((other) => {
        if (other === section || other.mesh.userData.bottom > section.mesh.userData.bottom || Math.abs(section.along.dot(other.along)) < 1 - tolerance) return false;
        const relative = beyond.clone().sub(other.origin);
        return Math.abs(relative.dot(other.across)) < tolerance && relative.dot(other.along) > other.start && relative.dot(other.along) < other.end;
      })) return false;
      return baseTrimSections.some((other) => {
        if (other === section || Math.abs(section.along.dot(other.along)) > tolerance) return false;
        const relative = point.clone().sub(other.origin);
        const along = relative.dot(other.along);
        return Math.abs(relative.dot(other.across)) < tolerance &&
          along >= other.start + (other.startCasing ? 0.175 : 0) - tolerance && along <= other.end - (other.endCasing ? 0.175 : 0) + tolerance;
      });
    }
    const extensions = baseTrimSections.map((section) => ({
      section,
      start: Math.abs(section.start) < tolerance && !section.startCasing && meetsWall(section, section.start, -1) ? -0.175 : 0,
      end: Math.abs(section.end - section.wallLength) < tolerance && !section.endCasing && meetsWall(section, section.end, 1) ? 0.175 : 0
    }));
    for (const { section, start, end } of extensions) {
      if (!start && !end) continue;
      section.start += start;
      section.end += end;
      section.from += start;
      section.to += end;
      section.footprint.origin.copy(section.origin).addScaledVector(section.along, section.start);
      section.footprint.maxU = section.end - section.start;
      const { height, depth } = section.mesh.geometry.parameters;
      section.mesh.geometry.dispose();
      section.mesh.geometry = new THREE.BoxGeometry(section.end - section.start, height, depth);
      section.mesh.position.x = (section.start + section.end) / 2;
    }
  }

  function buildBaseTrim() {
    const tolerance = 0.000001;
    const edges = [];
    const floorAreas = interiorFloorAreas.map((area) => ({
      origin: new THREE.Vector2(area.x, area.z), along: new THREE.Vector2(1, 0), across: new THREE.Vector2(0, 1),
      minU: 0, maxU: area.w, minV: 0, maxV: area.d
    }));
    function intersection(a, b, rectangle) {
      const origin = a.clone().sub(rectangle.origin);
      const delta = b.clone().sub(a);
      let from = 0;
      let to = 1;
      for (const [axis, min, max] of [[rectangle.along, rectangle.minU, rectangle.maxU], [rectangle.across, rectangle.minV, rectangle.maxV]]) {
        const position = origin.dot(axis);
        const direction = delta.dot(axis);
        if (Math.abs(direction) < tolerance) {
          if (position < min || position > max) return null;
        } else {
          const first = (min - position) / direction;
          const last = (max - position) / direction;
          from = Math.max(from, Math.min(first, last));
          to = Math.min(to, Math.max(first, last));
        }
      }
      return to - from > tolerance ? [from, to] : null;
    }
    function merge(intervals) {
      intervals.sort((a, b) => a[0] - b[0]);
      const merged = [];
      for (const interval of intervals) {
        const previous = merged[merged.length - 1];
        if (previous && interval[0] <= previous[1] + tolerance) previous[1] = Math.max(previous[1], interval[1]);
        else merged.push([...interval]);
      }
      return merged;
    }
    function edge(section, a, b, normal, side) {
      if (a.distanceTo(b) < tolerance) return;
      if (normal.x * (b.y - a.y) - normal.y * (b.x - a.x) < 0) [a, b] = [b, a];
      const probeA = a.clone().addScaledVector(normal, 0.0001);
      const probeB = b.clone().addScaledVector(normal, 0.0001);
      const covered = [];
      const delta = b.clone().sub(a);
      function cover(c, d, faceNormal) {
        if (normal.dot(faceNormal) < 1 - tolerance || Math.abs(c.clone().sub(a).dot(normal)) > tolerance) return;
        const first = c.clone().sub(a).dot(delta) / delta.lengthSq();
        const last = d.clone().sub(a).dot(delta) / delta.lengthSq();
        const from = Math.max(0, Math.min(first, last));
        const to = Math.min(1, Math.max(first, last));
        if (to - from > tolerance) covered.push([from, to]);
      }
      for (const run of edges) cover(run.a, run.b, run.normal);
      for (const wall of baseTrimSections) {
        for (const side of [-1, 1]) {
          if (wall.sides.includes(side)) continue;
          const offset = wall.across.clone().multiplyScalar(side * 0.175);
          cover(wall.origin.clone().addScaledVector(wall.along, wall.start).add(offset),
            wall.origin.clone().addScaledVector(wall.along, wall.end).add(offset), wall.across.clone().multiplyScalar(side));
        }
      }
      const blocked = merge([...covered, ...baseTrimSections.map((wall) => intersection(probeA, probeB, wall.footprint)).filter(Boolean)]);
      const finished = merge(floorAreas.map((area) => intersection(probeA, probeB, area)).filter(Boolean));
      for (const [from, to] of finished) {
        let cursor = from;
        for (const [first, last] of [...blocked, [to, to]]) {
          const end = Math.min(first, to);
          if (end - cursor > tolerance) edges.push({ a: a.clone().lerp(b, cursor), b: a.clone().lerp(b, end), normal, group: section.group, side });
          cursor = Math.max(cursor, last);
          if (cursor >= to) break;
        }
      }
    }
    // Trace exposed wall faces, including end returns, before joining their trim profiles.
    for (const section of baseTrimSections) {
      const point = (along, across) => section.origin.clone().addScaledVector(section.along, along).addScaledVector(section.across, across);
      if (section.to > section.from) {
        for (const side of section.sides) edge(section, point(section.from, side * 0.175), point(section.to, side * 0.175), section.across.clone().multiplyScalar(side), side);
      }
      if (!section.sides.length) continue;
      if (!section.startCasing) edge(section, point(section.start, -0.175), point(section.start, 0.175), section.along.clone().negate(), 0);
      if (!section.endCasing) edge(section, point(section.end, -0.175), point(section.end, 0.175), section.along.clone(), 0);
    }
    const joints = new Map();
    const key = (point) => `${Math.round(point.x / tolerance)},${Math.round(point.y / tolerance)}`;
    for (const run of edges) {
      for (const point of [run.a, run.b]) {
        const id = key(point);
        if (!joints.has(id)) joints.set(id, []);
        joints.get(id).push(run);
      }
    }
    function miter(run, point) {
      const adjacent = joints.get(key(point)).find((other) => other !== run && other.normal.dot(run.normal) > -1 + tolerance);
      return adjacent ? run.normal.clone().add(adjacent.normal).divideScalar(1 + run.normal.dot(adjacent.normal)) : run.normal;
    }
    const depth = 0.75 / 12;
    const radius = 0.75 / 12;
    const boardProfile = new THREE.Shape();
    boardProfile.moveTo(0, 0);
    boardProfile.lineTo(depth, 0);
    boardProfile.lineTo(depth, 8 / 12);
    boardProfile.lineTo(0, 8 / 12);
    boardProfile.closePath();
    const shoeProfile = new THREE.Shape();
    shoeProfile.moveTo(depth, 0);
    shoeProfile.lineTo(depth + radius, 0);
    shoeProfile.absarc(depth, 0, radius, 0, Math.PI / 2);
    shoeProfile.closePath();
    scene.updateMatrixWorld(true);
    for (const run of edges) {
      const length = run.a.distanceTo(run.b);
      const startMiter = miter(run, run.a);
      const endMiter = miter(run, run.b);
      const inverse = run.group.matrixWorld.clone().invert();
      for (const [profile, name, dimensions] of [
        [boardProfile, '8 inch interior baseboard', { heightInches: 8, thicknessInches: 0.75 }],
        [shoeProfile, 'Quarter-round baseboard shoe', { radiusInches: 0.75 }]
      ]) {
        const geometry = new THREE.ExtrudeGeometry(profile, { depth: length, bevelEnabled: false, curveSegments: 8 });
        const positions = geometry.getAttribute('position');
        for (let i = 0; i < positions.count; i++) {
          const progress = THREE.MathUtils.clamp(positions.getZ(i) / length, 0, 1);
          const offset = positions.getX(i);
          const point = run.a.clone().lerp(run.b, progress).addScaledVector(startMiter, offset * (1 - progress)).addScaledVector(endMiter, offset * progress);
          const local = new THREE.Vector3(point.x, 0.005 + positions.getY(i), point.y).applyMatrix4(inverse);
          positions.setXYZ(i, local.x, local.y, local.z);
        }
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, windowTrim);
        mesh.name = name;
        mesh.userData = { ...dimensions, side: run.side, startFeet: run.a.toArray(), endFeet: run.b.toArray(), startMiter: startMiter.toArray(), endMiter: endMiter.toArray() };
        mesh.castShadow = mesh.receiveShadow = true;
        run.group.add(mesh);
      }
    }
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
  const kitchenWindowWallZ = 7;
  const kitchenSinkRunZ = kitchenWindowWallZ + 1.2;
  const prepCounterZ = kitchenWindowWallZ + 1.25;
  const kitchenSinkX = (kitchenWallLeft + kitchenWallRight) / 2;
  const kitchenSinkWindowWidth = 4.5;
  const kitchenPassageWidth = 2.5;
  const kitchenSideOpenings = [9.725, 21.675].map((z) => [z - kitchenWindowWallZ, z - kitchenWindowWallZ + kitchenPassageWidth, 0, 8]);
  const cooktopRunStartZ = kitchenWindowWallZ + kitchenSideOpenings[0][1];
  const cooktopRunEndZ = kitchenWindowWallZ + kitchenSideOpenings[1][0];
  const cooktopCenterZ = (cooktopRunStartZ + cooktopRunEndZ) / 2;
  const kitchenSinkWindowHeight = 3.5;
  const kitchenSinkWindowSill = 53 / 12;
  const kitchenSinkWindows = [
    { name: 'Kitchen left counter window', x: kitchenSinkX - 4, width: 1.5, picture: false },
    { name: 'Kitchen sink window', x: kitchenSinkX, width: kitchenSinkWindowWidth, picture: true },
    { name: 'Kitchen right counter window', x: kitchenSinkX + 4, width: 1.5, picture: false }
  ];
  const kitchenWindowCapExtension = casingSideWidth + casingReveal + 0.125 / 2;
  const kitchenEndSconceCenters = [
    (kitchenWallLeft + kitchenSinkWindows[0].x - kitchenSinkWindows[0].width / 2 - kitchenWindowCapExtension) / 2,
    (kitchenWallRight + kitchenSinkWindows[2].x + kitchenSinkWindows[2].width / 2 + kitchenWindowCapExtension) / 2
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
  const prepEndWindowZ = 12;
  const prepEndWindowWidth = 2;
  const kidsRoomNorthZ = 26.725 - 25 / 12 - 0.08 + 0.175;
  const kidsRoom = { x: 19, z: kidsRoomNorthZ, width: 10, depth: 34.6 - kidsRoomNorthZ };
  const kidsDoorway = { x: kidsRoom.x, z: 27, width: 4.5, height: 8 };
  const officeEntry = { x: 12.2, z: 45.25, width: 5, height: 8 };
  const livingFeatureWall = getLivingRoomFeatureLayout();
  const livingWindowCenters = livingFeatureWall.windowCenters;
  const livingCenterZ = livingFeatureWall.centerZ;
  const livingWindowWidth = 4;
  const livingWindowSill = 2.6;
  const livingWindowHead = 8;
  const livingSideWindowSill = 3;
  const livingSideWindowWidth = 30 / 12;
  const livingSideWindowSpacing = livingSideWindowWidth + 10 / 12;
  const livingSideWindows = [
    { name: 'Living left side window', center: 6.6 - livingSideWindowSpacing, width: livingSideWindowWidth, picture: false },
    { name: 'Living side window', center: 6.6, width: livingSideWindowWidth, picture: true },
    { name: 'Living right side window', center: 6.6 + livingSideWindowSpacing, width: livingSideWindowWidth, picture: false }
  ];
  const livingSideSconceCenters = [0.95, 13.2 - 0.95];
  const fireplaceFaceX = 1.38;
  const fireplaceBackingFrontX = fireplaceFaceX - 0.08;
  const fireplaceBackingDepth = fireplaceBackingFrontX - 0.02;

  const stairWidth = 44 / 12;
  const stairGap = 0.25;
  const stairwellWallThickness = 0.16;
  const floorAssemblyDepth = 1; // Provisional 12-inch allowance; confirm the actual structural assembly.
  const stairFloorToFloor = ceilingHeight + floorAssemblyDepth;
  const stairRisers = Math.ceil(stairFloorToFloor / (2 * 7.5 / 12));
  const stairRise = stairFloorToFloor / (2 * stairRisers);
  const stairGoing = 10 / 12;
  const stairRun = (stairRisers - 1) * stairGoing;
  const stairLandingDepth = 4;
  const stairOpening = UpstairsLayout.stairOpening(stairFloorToFloor);
  const wallSideStairWidth = stairOpening.depth - stairWidth - stairGap;
  const guestEntry = getGuestEntryLayout(stairOpening);
  const powderNorthZ = guestEntry.powder.z;
  const powderEntryWallZ = guestEntry.alcove.z;
  const officeNorthZ = guestEntry.officeNorthZ;

  // Stepped footprint and room adjacencies follow the user's attached plan.
  floor(0, 8, 13.2, 17.7, true, scene);
  floor(13.2, -2.1, 13.3, 10.1, true, scene);
  floor(13.2, 8, 5.8, 17.7, true, scene);
  floor(19, 8, 7.5, kidsRoom.z - 8, true, scene);
  floor(26.5, kitchenWindowWallZ, 11.5, kidsRoom.z - kitchenWindowWallZ, true, scene);
  floor(29, kidsRoom.z, 9, 26.9 - kidsRoom.z, true, scene);
  floor(38, kitchenWindowWallZ, 17.5, 15 - kitchenWindowWallZ, true, scene);
  for (const { x, z, w, d } of garageFloorAreas) floor(x, z, w, d, false, shell, false, garageFloorY);
  [
    [38, 15, 7.4, 11.9],
    [0, 25.7, 12.2, stairOpening.z - 25.7, true],
    [0, stairOpening.z, stairOpening.x, stairOpening.depth, true],
    [stairOpening.x + stairOpening.width, stairOpening.z, 12.2 - stairOpening.x - stairOpening.width, stairOpening.depth, true],
    [0, stairOpening.z + stairOpening.depth, 12.2, powderNorthZ - stairOpening.z - stairOpening.depth, true],
    [12.2, 25.7, kidsRoom.x - 12.2, 8.9, true],
    [kidsRoom.x, kidsRoom.z, kidsRoom.width, kidsRoom.depth, true],
    [12.2, 34.6, 6.8, 19.6, true], [0, powderNorthZ, 7.1, guestEntry.powder.d], [7.1, powderEntryWallZ, 5.1, guestEntry.alcove.d, true],
    [0, officeNorthZ, 12.2, 54.2 - officeNorthZ, true], [19, 34.6, 6, 7.4, true], [25, 34.6, 6.2, 4.6],
    [25, 39.2, 6.2, 2.8], [19, 42, 12.2, 12.2, true], [0, 54.2, 31.2, 7, false, false],
    [7.1, powderNorthZ, 5.1, guestEntry.coatCloset.d, true]
  ].forEach(([x, z, w, d, hardwood = false, interior = true]) => floor(x, z, w, d, hardwood, shell, interior));

  [
    [0, 8, 13.2, 8, true, livingSideWindows.map(({ center, width }) => [center - width / 2, center + width / 2, livingSideWindowSill, livingWindowHead])],
    [13.2, -2.1, 13.2, 8, true, diningSideWindowCenters.map((z) => [z - diningSideWindowWidth / 2 + 2.1, z + diningSideWindowWidth / 2 + 2.1, diningSideWindowSill, diningSideWindowSill + diningSideWindowHeight])],
    [13.2, -2.1, 26.5, -2.1, true, [[3.65, 9.65, 3, 8]]],
    [26.5, -2.1, 26.5, kitchenWindowWallZ, true, [[2.1, 8.1, 0, 8]], ceilingHeight, [1]],
    [kitchenWallLeft, kitchenWindowWallZ, kitchenWallRight, kitchenWindowWallZ, true, kitchenSinkWindows.map(({ x, width }) => [x - width / 2 - kitchenWallLeft, x + width / 2 - kitchenWallLeft, kitchenSinkWindowSill, kitchenSinkWindowSill + kitchenSinkWindowHeight]), ceilingHeight, [-1, 1], 1],
    [38, kitchenWindowWallZ, 55.5, kitchenWindowWallZ, false, prepWindowCenters.map((x) => [x - prepWindowWidth / 2 - 38, x + prepWindowWidth / 2 - 38, prepWindowSill, prepWindowSill + prepWindowHeight])],
    [55.5, kitchenWindowWallZ, 55.5, 15, false, [[prepEndWindowZ - prepEndWindowWidth / 2 - kitchenWindowWallZ, prepEndWindowZ + prepEndWindowWidth / 2 - kitchenWindowWallZ, prepWindowSill, prepWindowSill + prepWindowHeight]], ceilingHeight, [1]],
    [55.5, 15, 55.5, 49, false, [[29, 32, garageFloorY, garageFloorY + 8]], ceilingHeight, [1], 0, garageFloorY],
    [55.5, 49, 31.2, 49, false, [[2.5, 11.5, garageFloorY, garageFloorY + 8], [14, 23, garageFloorY, garageFloorY + 8]], ceilingHeight, [1], 0, garageFloorY],
    [31.2, 49, 31.2, 54.2], [31.2, 54.2, 31.2, 61.2, false, [], 2.6], [31.2, 61.2, 0, 61.2, false, [], 2.6],
    [0, 61.2, 0, 54.2, false, [], 2.6],     [0, 54.2, 0, livingFeatureWall.wallEndZ, false, [[3.2, 7.2, 3, 8]]],
    [0, livingFeatureWall.wallEndZ, 0, 8, true, [...livingWindowCenters].reverse().map((z) => [livingFeatureWall.wallEndZ - z - livingWindowWidth / 2, livingFeatureWall.wallEndZ - z + livingWindowWidth / 2, livingWindowSill, livingWindowHead])],
    [kidsRoom.x, kidsRoom.z, kidsRoom.x + kidsRoom.width, kidsRoom.z, true],
    [kidsDoorway.x, kidsRoom.z, kidsDoorway.x, 34.6, true, [[kidsDoorway.z - kidsRoom.z, kidsDoorway.z - kidsRoom.z + kidsDoorway.width, 0, kidsDoorway.height]]],
    [29, kidsRoom.z, 29, 26.9, true], [0, powderNorthZ, 12.2, powderNorthZ],
    [7.1, powderNorthZ, 7.1, officeNorthZ, false, [[guestEntry.powderDoor.z - powderNorthZ, guestEntry.powderDoor.z - powderNorthZ + guestEntry.powderDoor.width, 0, guestEntry.powderDoor.height]]],
    [7.1, powderEntryWallZ, 12.2, powderEntryWallZ, false, [[guestEntry.closetDoor.x - 7.1, guestEntry.closetDoor.x - 7.1 + guestEntry.closetDoor.width, 0, guestEntry.closetDoor.height]]],
    [12.2, powderNorthZ, 12.2, powderEntryWallZ],
    [officeEntry.x, officeNorthZ, officeEntry.x, 54.2, false, [[officeEntry.z - officeEntry.width / 2 - officeNorthZ, officeEntry.z + officeEntry.width / 2 - officeNorthZ, 0, officeEntry.height]]],
    [0, officeNorthZ, 12.2, officeNorthZ], [0, 54.2, 31.2, 54.2, false, [[3, 9, 3, 8], [13.1, 18.1, 0, 7], [21.2, 28.8, 3, 8]], ceilingHeight, [-1]],
    [19, 34.6, 19, 54.2, false, [[7.4, 10.4, 0, 7]]], [19, 34.6, 25, 34.6],
    [25, 34.6, 25, 42], [19, 42, 25, 42, false, [[1.4, 4.6, 0, 7]]], [25, 39.2, 31.2, 39.2, false, [[2, 4.7, 0, 7]]],
    [25, 34.6, 29, 34.6], [29, 34.6, 31.2, 34.6, false, [], ceilingHeight, [-1, 1], 0, garageFloorY],
    [31.2, 34.6, 31.2, 49, false, [], ceilingHeight, [-1, 1], 0, garageFloorY], [29, 26.9, 29, 34.6, false, [], ceilingHeight, [-1, 1], 0, garageFloorY],
    [29, 26.9, 29.6875, 26.9, true, [], ceilingHeight, [-1, 1], -1, garageFloorY],
    [29.6875, 26.9, 37.8, 26.9, true, [], ceilingHeight, [1], -1, garageFloorY],
    [37.8, 26.9, 38, 26.9, true, [], ceilingHeight, [-1, 1], -1, garageFloorY],
    [38, kitchenWindowWallZ, 38, 25.3, true, kitchenSideOpenings, ceilingHeight, [-1, 1], 1],
    [38, 25.3, 38, 26.9, true, [], ceilingHeight, [-1], 1], [38, 15, 45.4, 15],
    [45.4, 15, 55.5, 15, false, [], ceilingHeight, [-1, 1], 0, garageFloorY],
    [45.4, 15, 45.4, 26.9, false, [], ceilingHeight, [-1, 1], 0, garageFloorY],
    [38, 26.9, 45.4, 26.9, false, [[garageEntry.x - 38, garageEntry.x - 38 + garageEntry.width, 0, 7]], ceilingHeight, [-1, 1], 0, garageFloorY]
  ].forEach((segment) => wall(...segment));

  joinWallCorners();
  buildBaseTrim();

  [
    ['Living room', 13.2, 17.7], ['Dining room', 13.3, 10.1], ['Kitchen', 11.5, 26.9 - kitchenWindowWallZ],
    ['Hall', 13.3, kidsRoom.z - 8], ['Prep kitchen', 17.5, 15 - kitchenWindowWallZ], ['Mudroom', 7.4, 11.9],
    ['Garage', 26.5, 34, true], ['Kids room', kidsRoom.width, kidsRoom.depth],
    ['Powder room', 7.1, guestEntry.powder.d], ['Guest coat closet', 5.1, guestEntry.coatCloset.d], ['Guest entry alcove', 5.1, guestEntry.alcove.d], ['Office', 12.2, 54.2 - officeNorthZ],
    ['Closet', 6, 7.4], ['Bath', 6.2, 4.6],
    ['Bedroom', 12.2, 12.2], ['Porch', 31.2, 7]
  ].forEach((room) => roomDimensions(...room));

  // Proposed feature wall, following the existing living-room requirements.
  const fireplace = new THREE.Group();
  fireplace.name = 'Floor-to-ceiling stone fireplace';
  scene.add(fireplace);
  const mortar = mat('#635a50');
  box(fireplace, 0.02 + fireplaceBackingDepth / 2, ceilingHeight / 2, livingCenterZ, fireplaceBackingDepth, ceilingHeight, 6, mortar).name = 'Fireplace stone backing';
  const stoneCanvas = document.createElement('canvas');
  stoneCanvas.width = stoneCanvas.height = 128;
  const stoneContext = stoneCanvas.getContext('2d');
  if (!stoneContext) throw new Error('A 2D canvas is required to create the fireplace stone finish.');
  stoneContext.fillStyle = '#ddd5ca';
  stoneContext.fillRect(0, 0, 128, 128);
  let stoneSeed = 73;
  for (let i = 0; i < 4500; i++) {
    stoneSeed = (stoneSeed * 1664525 + 1013904223) >>> 0;
    const x = stoneSeed / 4294967296 * 128;
    stoneSeed = (stoneSeed * 1664525 + 1013904223) >>> 0;
    const y = stoneSeed / 4294967296 * 128;
    stoneContext.fillStyle = i % 2 ? 'rgba(76, 64, 52, 0.16)' : 'rgba(235, 224, 209, 0.2)';
    stoneContext.fillRect(x, y, 1.5, 1);
  }
  const stoneTexture = new THREE.CanvasTexture(stoneCanvas);
  stoneTexture.colorSpace = THREE.SRGBColorSpace;
  stoneTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const fireplaceStones = ['#82715f', '#6d6256', '#958472', '#625b52', '#8b7b68'].map((color) => {
    const material = new THREE.MeshStandardMaterial({ color, map: stoneTexture, roughness: 0.95 });
    material.name = 'Photo-reference taupe-brown stacked stone - screen approximation';
    return material;
  });
  for (let row = 0; row < ceilingHeight / 0.5; row++) {
    const y = row * 0.5 + 0.25;
    let start = livingCenterZ - 3;
    for (let column = 0; start < livingCenterZ + 3; column++) {
      const length = Math.min(column === 0 && row % 2 ? 0.65 : 1.1 + ((row + column * 3) % 5) * 0.17, livingCenterZ + 3 - start);
      const material = fireplaceStones[(row * 3 + column) % fireplaceStones.length];
      const depth = 0.065 + ((row + column) % 3) * 0.008;
      box(fireplace, fireplaceBackingFrontX + depth / 2, y, start + length / 2, depth, 0.475, length - 0.025, material).name = 'Fireplace face stone';
      start += length;
    }
    for (const z of [livingCenterZ - 3.03, livingCenterZ + 3.03]) {
      box(fireplace, 0.02 + fireplaceBackingDepth / 2, y, z, fireplaceBackingDepth, 0.475, 0.06, fireplaceStones[row % fireplaceStones.length]).name = 'Fireplace stone side return';
    }
  }
  box(fireplace, 0.02 + fireplaceBackingDepth / 2, ceilingHeight - 0.015, livingCenterZ, fireplaceBackingDepth, 0.03, 6, fireplaceStones[0]).name = 'Fireplace stone top cap';
  box(scene, fireplaceFaceX + 0.02, 2.4, livingCenterZ, 0.12, 1.25, 4.6, black).name = 'Fireplace firebox';
  const ember = new THREE.MeshStandardMaterial({ color: '#c7793e', emissive: '#c65c20', emissiveIntensity: 1 });
  box(scene, fireplaceFaceX + 0.1, 2.01, livingCenterZ, 0.06, 0.08, 4.1, ember).name = 'Glowing fireplace ember bed';
  const fire = new THREE.Group();
  fire.name = 'Visible fireplace flames';
  scene.add(fire);
  const flameOuter = new THREE.MeshBasicMaterial({ color: '#ff852d', side: THREE.DoubleSide });
  const flameInner = new THREE.MeshBasicMaterial({ color: '#ffe9a3', side: THREE.DoubleSide });
  for (let index = 0; index < 17; index++) {
    const height = 0.3 + ((index * 7) % 5) * 0.095;
    const outline = new THREE.Shape();
    outline.moveTo(-0.09, 0);
    outline.bezierCurveTo(-0.2, height * 0.4, 0.08, height * 0.55, 0.015, height);
    outline.bezierCurveTo(0.2, height * 0.58, 0.15, height * 0.15, 0.09, 0);
    outline.closePath();
    const geometry = new THREE.ShapeGeometry(outline);
    for (const inner of [false, true]) {
      const flame = new THREE.Mesh(geometry, inner ? flameInner : flameOuter);
      flame.name = inner ? 'Bright flame core' : 'Amber flame';
      flame.rotation.y = Math.PI / 2;
      flame.position.set(fireplaceFaceX + (inner ? 0.145 : 0.14), 2.04, livingCenterZ + (index - 8) * 0.23);
      if (inner) flame.scale.set(0.5, 0.65, 1);
      fire.add(flame);
    }
  }
  const mantel = box(scene, fireplaceFaceX + 0.25, 4.15, livingCenterZ, 0.65, 0.3, 6.2, cabinetRailFinish);
  mantel.name = 'White oak fireplace mantel';
  mantel.userData = { widthInches: 74.4, thicknessInches: 3.6, bottomInches: 48, clearanceVerified: false, provisional: true };
  box(scene, fireplaceFaceX + 0.06, 5.8, livingCenterZ, 0.15, 2.7, 4.6, black, true).name = 'Fireplace television';
  const mediaBuiltIns = [];
  const mediaWidth = 24 / 12;
  const mediaRearX = 0.4;
  const mediaDepth = fireplaceFaceX - mediaRearX;
  const mediaHeight = 26 / 12;
  for (const side of [-1, 1]) {
    const mediaBuiltIn = new THREE.Group();
    mediaBuiltIn.name = `${side === -1 ? 'Dining' : 'Stair'}-side fireplace media and charging built-in`;
    mediaBuiltIn.userData = {
      widthInches: mediaWidth * 12, depthInches: mediaDepth * 12, heightInches: 26, rearServiceGapInches: 3,
      location: `${side === -1 ? 'Dining' : 'Stair'} side, directly adjoining fireplace stone`, openBack: true, openFront: false,
      doors: 'Two closed Shaker doors with concealed push latches', frontX: fireplaceFaceX,
      storage: 'Consoles, controllers and device charging concealed inside; verify shallow equipment fit and closed-door ventilation',
      power: 'Concealed receptacles and replaceable USB-C PD charging hub',
      data: 'Ethernet and accessible conduit to TV for at least three HDMI runs',
      clearanceVerified: false, provisional: true
    };
    mediaBuiltIn.position.set(mediaRearX + mediaDepth / 2, 0, livingCenterZ + side * (3.06 + mediaWidth / 2));
    mediaBuiltIn.rotation.y = Math.PI / 2;
    scene.add(mediaBuiltIn);
    mediaBuiltIns.push(mediaBuiltIn);
    box(mediaBuiltIn, 0, 0.2, 0, mediaWidth - 0.25, 0.4, mediaDepth - 0.25, cabinetFinish).name = 'Media cabinet recessed plinth';
    for (const edge of [-1, 1]) {
      box(mediaBuiltIn, edge * (mediaWidth / 2 - 0.03125), mediaHeight / 2, -0.04, 0.0625, mediaHeight, mediaDepth - 0.08, cabinetFinish).name = 'Media cabinet oak side';
    }
    box(mediaBuiltIn, 0, mediaHeight - 1 / 24, 0, mediaWidth, 1 / 12, mediaDepth, cabinetRailFinish).name = 'Clear oak cabinet top flush with fireplace';
    box(mediaBuiltIn, 0, 0.4, -0.04, mediaWidth - 0.125, 0.0625, mediaDepth - 0.08, cabinetRailFinish).name = 'Concealed cabinet bottom';
    box(mediaBuiltIn, 0, 10 / 12, -0.04, mediaWidth - 0.125, 0.0625, mediaDepth - 0.08, cabinetRailFinish).name = 'Concealed equipment and charging shelf';
    for (const edge of [-1, 1]) {
      const door = shakerFront(mediaBuiltIn, edge * mediaWidth / 4, (0.4 + mediaHeight - 1 / 12) / 2, mediaDepth / 2 - 0.04, mediaWidth / 2 - 0.04, mediaHeight - 1 / 12 - 0.4 - 0.04);
      door.name = 'Closed media cabinet Shaker door';
      door.userData.hardware = 'Concealed push latch; no projecting pull';
    }
  }
  const livingSconces = new THREE.Group();
  livingSconces.name = 'Living-room wall sconces';
  livingSconces.userData = { fixtures: 2, placement: 'Outer ends of the grouped living-room side windows', finish: 'Satin gold with warm opal diffusers', provisional: true };
  scene.add(livingSconces);
  const sconceGlow = new THREE.MeshStandardMaterial({ color: '#fff0d7', emissive: '#ffd5a0', emissiveIntensity: 0.6, roughness: 0.65 });
  function wallSconce(parent, x, z, rotation) {
    const sconce = new THREE.Group();
    sconce.name = 'Warm vertical wall sconce';
    sconce.position.set(x, 6.3, z);
    sconce.rotation.y = rotation;
    parent.add(sconce);
    box(sconce, 0, 0, 0, 0.05, 1.55, 0.22, brass).name = 'Sconce gold backplate';
    cylinder(sconce, 0.14, 0, 0, 0.1, 1.2, sconceGlow).name = 'Warm opal sconce diffuser';
    for (const y of [-0.64, 0.64]) cylinder(sconce, 0.14, y, 0, 0.11, 0.08, brass).name = 'Sconce gold end cap';
    const accentLight = new THREE.PointLight('#ffd3a0', 12, 5, 2);
    accentLight.name = 'Warm wall accent light';
    accentLight.position.set(0.35, 0, 0);
    sconce.add(accentLight);
  }
  for (const [x, z, rotation] of livingSideSconceCenters.map((x) => [x, 8.205, -Math.PI / 2])) {
    wallSconce(livingSconces, x, z, rotation);
  }
  const diningSconces = new THREE.Group();
  diningSconces.name = 'Dining-room wall sconces';
  diningSconces.userData = { fixtures: 2, placement: 'Flanking the rear dining window', finish: 'Satin gold with warm opal diffusers', chandelier: false, provisional: true };
  scene.add(diningSconces);
  for (const x of [15.3, 24.4]) wallSconce(diningSconces, x, -1.895, -Math.PI / 2);
  const kitchenSconces = new THREE.Group();
  kitchenSconces.name = 'Kitchen sink-wall end sconces';
  kitchenSconces.userData = { fixtures: 2, placement: 'Outside the kitchen window-bank ends', finish: 'Satin gold with warm opal diffusers', provisional: true };
  scene.add(kitchenSconces);
  for (const x of kitchenEndSconceCenters) wallSconce(kitchenSconces, x, kitchenWindowWallZ + 0.205, -Math.PI / 2);
  const glass = new THREE.MeshStandardMaterial({ color: '#b3cad0', roughness: 0.15, metalness: 0.15, transparent: true, opacity: 0.52 });
  const windowExterior = mat('#181818');
  windowExterior.name = 'Andersen Black exterior - screen approximation';
  function windowFrame(name, x, z, width, height, sill, rotation = 0, parent = scene, interiorSide = 1, options = {}) {
    const frame = new THREE.Group();
    frame.name = name;
    frame.position.set(x, sill, z);
    frame.rotation.y = rotation;
    const picture = options.picture === true;
    const fixed = options.fixed === true || picture;
    const exteriorFinish = options.whiteExterior ? 'White' : 'Black';
    const exteriorMaterial = options.whiteExterior ? windowTrim : windowExterior;
    // Group large openings without claiming these concept dimensions are catalog sizes.
    const columns = fixed ? 1 : Math.ceil(width / 3);
    const rows = fixed ? 1 : Math.ceil(height / 6);
    frame.userData = { manufacturer: !fixed || picture ? 'Andersen' : null, series: !fixed || picture ? '100 Series' : null, operation: picture ? 'fixed picture window' : fixed ? 'fixed door sidelight' : 'casement', geometry: 'simplified concept, not manufacturer CAD', standardSizeVerified: false, exteriorFinish, interiorFinish: 'White', interiorTrim: 'white', interiorSide, columns, rows, widthFeet: width, heightFeet: height, sillDepthInches: (options.depth ?? 0.25) * 12, sillMaterial: options.material ? 'quartz' : 'white trim', faucetNotchWidthInches: (options.notchWidth ?? 0) * 12 };
    frame.userData.casingMaterial = (options.casingMaterial ?? windowTrim).name;
    parent.add(frame);
    function ring(parent, w, h, border, depth, offset, material, name) {
      for (const side of [-1, 1]) {
        box(parent, side * (w - border) / 2, h / 2, offset, border, h, depth, material).name = name;
        box(parent, 0, side < 0 ? border / 2 : h - border / 2, offset, w - 2 * border, border, depth, material).name = name;
      }
    }
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const unit = new THREE.Group();
        unit.name = picture ? 'Fixed picture window unit' : fixed ? 'Fixed sidelight unit' : 'Andersen 100 Series casement concept';
        const unitWidth = width / columns;
        const unitHeight = height / rows;
        unit.position.set(-width / 2 + (column + 0.5) * unitWidth, row * unitHeight, 0);
        unit.userData = { operation: fixed ? 'fixed' : 'outward casement', shownClosed: true, widthFeet: unitWidth, heightFeet: unitHeight, provisional: true };
        frame.add(unit);
        ring(unit, unitWidth, unitHeight, 0.12, 0.12, -interiorSide * 0.06, exteriorMaterial, `${exteriorFinish} exterior window frame`);
        ring(unit, unitWidth, unitHeight, 0.12, 0.12, interiorSide * 0.06, windowTrim, 'White interior window frame');
        const sash = new THREE.Group();
        sash.name = fixed ? 'Fixed glazing surround' : 'Closed side-hinged casement sash';
        sash.position.y = 0.135;
        unit.add(sash);
        const sashWidth = unitWidth - 0.27;
        const sashHeight = unitHeight - 0.27;
        ring(sash, sashWidth, sashHeight, 0.1, 0.08, -interiorSide * 0.04, exteriorMaterial, `${exteriorFinish} exterior sash`);
        ring(sash, sashWidth, sashHeight, 0.1, 0.08, interiorSide * 0.04, windowTrim, 'White interior sash');
        box(sash, 0, sashHeight / 2, 0, sashWidth - 0.2, sashHeight - 0.2, 0.04, glass).name = fixed ? 'Fixed glazing pane' : 'Single casement glazing pane';
        if (!fixed) {
          box(unit, 0, 0.2, interiorSide * 0.16, 0.28, 0.07, 0.08, windowTrim).name = 'White casement crank housing';
          box(unit, 0.08, 0.2, interiorSide * 0.23, 0.16, 0.045, 0.06, windowTrim).name = 'Casement crank handle';
          box(unit, unitWidth / 2 - 0.18, unitHeight * 0.4, interiorSide * 0.15, 0.05, 0.22, 0.06, windowTrim).name = 'Casement sash lock';
        }
      }
    }
    if (options.casing !== false) openingCasing(frame, 0, 0, width, height, 0.2, interiorSide, sill > 0, options);
  }
  for (const { name, center, width, picture } of livingSideWindows) {
    windowFrame(name, center, 8.1, width, livingWindowHead - livingSideWindowSill, livingSideWindowSill, 0, scene, 1, { picture });
  }
  windowFrame('Dining rear window', 19.85, -2, 6, 5, 3);
  for (const [index, z] of diningSideWindowCenters.entries()) {
    windowFrame(`Dining left window ${index + 1}`, 13.2, z, diningSideWindowWidth, diningSideWindowHeight, diningSideWindowSill, -Math.PI / 2, scene, -1);
  }
  const patioDoor = new THREE.Group();
  patioDoor.name = 'Dining casement windows and inswing patio door';
  patioDoor.position.set(26.5, 0, 3);
  patioDoor.rotation.y = -Math.PI / 2;
  patioDoor.userData = { widthFeet: 6, heightFeet: 8, sliding: false, provisional: true, exteriorDirection: 'increasing x' };
  scene.add(patioDoor);
  for (const side of [-1, 1]) {
    box(patioDoor, side * 2.94, 4, 0, 0.12, 8, 0.3, windowTrim).name = 'Patio door jamb';
  }
  box(patioDoor, 0, 7.94, 0, 6, 0.12, 0.3, windowTrim).name = 'Patio door header';
  box(patioDoor, 0, 0.04, 0, 6, 0.08, 0.4, black).name = 'Patio door threshold';
  box(patioDoor, 0, 4, 0, 0.12, 8, 0.3, windowTrim).name = 'Picture window and door mullion';
  windowFrame('Dining patio-side stacked casements', -1.47, 0, 2.82, 7.76, 0.12, 0, patioDoor, -1, { casing: false, whiteExterior: true });
  const doorLeaf = new THREE.Group();
  doorLeaf.name = 'Inward-opening hinged patio door';
  doorLeaf.position.x = 2.88;
  doorLeaf.rotation.y = 0;
  doorLeaf.userData = { outswing: false, openAngleDegrees: 0, nominalWidthFeet: 3, finish: 'White' };
  patioDoor.add(doorLeaf);
  for (const edge of [-0.04, -2.78]) {
    box(doorLeaf, edge, 3.98, 0, 0.08, 7.76, 0.14, windowTrim).name = 'Hinged patio door stile';
  }
  for (const y of [0.16, 7.8]) box(doorLeaf, -1.41, y, 0, 2.82, 0.12, 0.14, windowTrim).name = 'Hinged patio door rail';
  box(doorLeaf, -1.41, 3.98, 0, 2.66, 7.52, 0.05, glass).name = 'Hinged patio door glazing';
  for (const y of [0.6, 4, 7.3]) cylinder(doorLeaf, 0, y, 0, 0.045, 0.25, black).name = 'Patio door hinge';
  for (const side of [-1, 1]) {
    box(doorLeaf, -2.65, 3.5, side * 0.1, 0.08, 0.3, 0.08, black).name = 'Patio door handle plate';
    box(doorLeaf, -2.53, 3.5, side * 0.16, 0.3, 0.06, 0.06, black).name = 'Patio door lever';
  }
  for (const [index, z] of livingWindowCenters.entries()) {
    windowFrame(`Living fireplace-side casement ${index + 1}`, 0.1, z, livingWindowWidth, livingWindowHead - livingWindowSill, livingWindowSill, -Math.PI / 2, scene, -1);
  }

  const sofa = new THREE.Group();
  sofa.name = 'Crate & Barrel Lounge Deep 105-inch Leather Grande Sofa reference';
  sofa.userData = { familySeatTarget: 4, seatCushions: 3, widthInches: 105, depthInches: 46, heightInches: 37, sectional: false, productURL: 'https://www.crateandbarrel.com/lounge-deep-105-leather-grande-sofa/s336140', purchaseSelected: false };
  sofa.position.set(11.6, 0, livingCenterZ);
  sofa.rotation.y = -Math.PI / 2;
  scene.add(sofa);
  const sofaWidth = sofa.userData.widthInches / 12;
  const sofaDepth = sofa.userData.depthInches / 12;
  const sofaHeight = sofa.userData.heightInches / 12;
  const armWidth = 4 / 12;
  const seatWidth = (sofaWidth - 2 * armWidth) / sofa.userData.seatCushions;
  box(sofa, 0, 0.75, 0, sofaWidth, 0.95, sofaDepth, tanLeather, true);
  box(sofa, 0, 1.65, -sofaDepth / 2 + 0.2, sofaWidth, 1.366, 0.4, tanLeather, true);
  for (const x of [-(sofaWidth - armWidth) / 2, (sofaWidth - armWidth) / 2]) box(sofa, x, 1.15, 0, armWidth, 1.866, sofaDepth, tanLeather, true);
  for (let i = 0; i < sofa.userData.seatCushions; i++) {
    const x = (i - (sofa.userData.seatCushions - 1) / 2) * seatWidth;
    const seat = box(sofa, x, 1.3, 0.2, seatWidth - 0.035, 0.42, sofaDepth - 0.4, tanLeatherCushion, true);
    seat.name = 'Sofa seat';
    box(sofa, x, 2.35, -sofaDepth / 2 + 0.5, seatWidth - 0.05, (sofaHeight - 2.35) * 2, 0.65, tanLeatherCushion, true).name = 'Lounge-style loose back cushion';
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
    return chair;
  }
  const loungeChairs = [loungeChair(3.6, 10.9, Math.PI / 3), loungeChair(2.9, livingFeatureWall.wallEndZ - 2.175, 2 * Math.PI / 3)];
  loungeChairs[0].userData = { seats: 1, use: 'Window-corner lounge chair with matching ottoman', provisional: true };
  loungeChairs[1].userData = { seats: 1, use: 'Corner reading chair beside stair bookcases', provisional: true };
  function loungeOttoman(chair) {
    const ottoman = new THREE.Group();
    ottoman.name = 'Matching lounge chair ottoman';
    ottoman.position.z = 2.7;
    ottoman.userData = { widthInches: 24, depthInches: 20, heightInches: 16, provisional: true };
    chair.add(ottoman);
    for (const x of [-0.8, 0.8]) for (const z of [-0.63, 0.63]) box(ottoman, x, 0.25, z, 0.14, 0.5, 0.14, oak).name = 'Ottoman oak leg';
    box(ottoman, 0, 0.85, 0, 2, 0.8, 20 / 12, tanLeather, true).name = 'Ottoman upholstered base';
    box(ottoman, 0, 1.25, 0, 2, 1 / 6, 20 / 12, tanLeatherCushion, true).name = 'Ottoman cushion';
    return ottoman;
  }
  const cornerOttoman = loungeOttoman(loungeChairs[0]);
  const readingOttoman = loungeOttoman(loungeChairs[1]);
  const readingBook = new THREE.Group();
  readingBook.name = 'Book on reading chair';
  readingBook.position.set(-0.2, 1.46, 0.25);
  readingBook.rotation.y = -0.25;
  loungeChairs[1].add(readingBook);
  const bookCover = mat('#355775');
  for (const y of [0.01, 0.07]) box(readingBook, 0, y, 0, 0.55, 0.02, 0.8, bookCover).name = 'Reading book blue cover';
  box(readingBook, 0, 0.04, 0, 0.51, 0.04, 0.76, cream).name = 'Reading book pages';
  box(readingBook, 0.12, 0.04, 0.42, 0.045, 0.015, 0.12, brass).name = 'Reading book ribbon bookmark';
  readingBook.traverse((part) => { part.userData.tourDecoration = true; });

  const christmasTree = new THREE.Group();
  christmasTree.name = 'Dining-corner Christmas tree';
  christmasTree.position.set(15.25, 0, -0.05);
  christmasTree.userData = { heightInches: 84, diameterInches: 36, location: 'Northwest dining corner between the exterior windows', seasonal: true, provisional: true };
  scene.add(christmasTree);
  const evergreen = mat('#344f3a');
  const treeGold = mat('#ba914b', 0.45);
  const treeLight = new THREE.MeshBasicMaterial({ color: '#ffe4a0' });
  cylinder(christmasTree, 0, 0.45, 0, 0.42, 0.9, walnut).name = 'Tree stand basket';
  for (let layer = 0; layer < 8; layer++) {
    const bottom = 0.7 + layer * 0.65;
    const radius = 1.5 - layer * 0.16;
    const branches = cylinder(christmasTree, 0, bottom + 0.7, 0, radius, 1.4, evergreen, 0);
    branches.name = 'Christmas tree branches';
    branches.userData.tourObstacle = true;
    for (let light = 0; light < 6; light++) {
      const angle = light * Math.PI / 3 + layer * 0.7;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), treeLight);
      bulb.position.set(Math.cos(angle) * radius * 0.73, bottom + 0.4, Math.sin(angle) * radius * 0.73);
      bulb.name = 'Warm white tree light';
      christmasTree.add(bulb);
      if (light % 2 === 0) {
        const ornament = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), treeGold);
        ornament.position.set(Math.cos(angle + 0.2) * radius * 0.65, bottom + 0.5, Math.sin(angle + 0.2) * radius * 0.65);
        ornament.name = 'Muted gold tree ornament';
        christmasTree.add(ornament);
      }
    }
  }
  const treeCross = new THREE.Group();
  treeCross.name = 'Christmas tree cross';
  treeCross.position.y = 6.82;
  treeCross.rotation.y = Math.PI / 2;
  christmasTree.add(treeCross);
  const topperGold = new THREE.MeshBasicMaterial({ color: '#e6bc65' });
  box(treeCross, 0, 0, 0, 0.055, 0.36, 0.04, topperGold).name = 'Cross upright';
  box(treeCross, 0, 0.055, 0, 0.24, 0.055, 0.04, topperGold).name = 'Cross arms';

  const livingLayouts = [
    {
      id: 'centered', title: 'E / Conversation pair', recommended: true,
      note: 'Move the dining-side chair toward the window corner with a matching ottoman. Keep the stair-side reading chair, its ottoman and book, centered sofa and flush closed media cabinets fixed.',
      sofa: [11.6, livingCenterZ, -Math.PI / 2], chairs: [[3.6, 10.9, Math.PI / 3], [2.9, livingFeatureWall.wallEndZ - 2.175, 2 * Math.PI / 3]],
    },
    {
      id: 'airy', title: 'A / Airy holiday',
      note: 'Earlier one-chair study: one floated, angled chair and more breathing room. Omits the second chair and gives up one seat.',
      sofa: [10.5, 16, -Math.PI / 2], chairs: [[5.8, 21.5, 2.55], null],
    },
    {
      id: 'angled', title: 'B / Staggered pair',
      note: 'Keep both chairs, pulled off the wall and staggered toward the fireplace. More seating, but tighter knee room and cabinet access than A.',
      sofa: [10.5, 16, -Math.PI / 2], chairs: [[5.7, 22, 2.55], [9.7, 23.5, 3.3]],
    },
    {
      id: 'split', title: 'C / Split conversation',
      note: 'A chair at each end creates a conversational U instead of a row. Keeps both chairs; chairs turn to watch TV.',
      sofa: [10.5, 16, -Math.PI / 2], chairs: [[4.8, 11.4, 0.18], [5.8, 20.3, Math.PI - 0.18]],
    },
    {
      id: 'return', title: 'D / Sofa return',
      note: 'Rotate the sofa beneath the side window and float the chairs opposite. A conversation-first alternative, not a comfortable straight-on TV layout.',
      sofa: [7, 10.5, 0], chairs: [[6.6, 21.5, 2.85], [10.6, 21.5, 3.4]],
    }
  ];

  const tableX = 19.35;
  const tableZ = 3.95;
  const tableLength = 71 / 12;
  const tableDepth = 37.5 / 12;
  const diningSet = new THREE.Group();
  diningSet.name = 'Dining table and six chairs';
  diningSet.position.set(tableX, 0, tableZ);
  diningSet.rotation.y = Math.PI / 2;
  diningSet.userData = { rotationDegrees: 90, longAxis: 'z' };
  scene.add(diningSet);
  const diningWalnut = mat('#60412e', 0.6);
  diningWalnut.name = 'Dining walnut finish - screen approximation';
  const diningLeather = mat('#292724', 0.72);
  diningLeather.name = 'Black dining leather - screen approximation';
  const diningTable = box(diningSet, 0, 29 / 12 - 0.09, 0, tableLength, 0.18, tableDepth, diningWalnut, true);
  diningTable.name = 'Dining table';
  diningTable.userData = { reference: 'Article Seno walnut', lengthInches: 71, depthInches: 37.5, heightInches: 29, seats: 6 };
  for (const x of [-2.5, 2.5]) for (const z of [-1.1, 1.1]) box(diningSet, x, 1.15, z, 0.16, 2.3, 0.16, diningWalnut, true).name = 'Dining table leg';
  function diningChair(x, z, rotation) {
    const chair = new THREE.Group();
    chair.name = 'Dining chair';
    chair.userData = { reference: 'Article Nosh walnut and black leather', widthInches: 20, depthInches: 21, heightInches: 31, seatHeightInches: 19, outwardMoveInches: 2, provisional: true };
    chair.position.set(x - tableX, 0, z - tableZ);
    chair.rotation.y = rotation;
    diningSet.add(chair);
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

  const kitchen = new THREE.Group();
  kitchen.name = 'Kitchen furnishings';
  scene.add(kitchen);
  function quartzTexture(baseColor = '#c8b99d', veinColor = 'rgba(133, 124, 109, 0.3)') {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('A 2D canvas is required to create the quartz finish.');
    ctx.fillStyle = baseColor;
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
      ctx.strokeStyle = veinColor;
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
  for (const mesh of walls) {
    const { quartzSide } = mesh.userData;
    if (!quartzSide) continue;
    mesh.material = [wallMaterial, wallMaterial, wallMaterial, wallMaterial, quartzSide === 1 ? countertop : wallMaterial, quartzSide === -1 ? countertop : wallMaterial];
    mesh.name = 'Kitchen wall with floor-to-ceiling quartz face';
  }
  const kitchenSillQuartz = countertop.clone();
  kitchenSillQuartz.name = 'Smoky blue-gray quartz kitchen window sills with pale veining';
  kitchenSillQuartz.map = quartzTexture('#98a9b0', 'rgba(235, 239, 240, 0.65)');
  kitchenSillQuartz.roughness = 0.32;
  kitchenSillQuartz.clearcoat = 0.18;
  const steel = new THREE.MeshStandardMaterial({ color: '#a9afad', metalness: 0.7, roughness: 0.32 });
  const light = new THREE.MeshStandardMaterial({ color: '#fff0c9', emissive: '#ffe3a3', emissiveIntensity: 0.5 });

  function drawerFront(x, z, width, rotation = 0, parent = kitchen) {
    const cabinet = new THREE.Group();
    cabinet.position.set(x, 0, z);
    cabinet.rotation.y = rotation;
    parent.add(cabinet);
    for (let row = 0; row < 3; row++) {
      const front = shakerFront(cabinet, 0, 0.65 + row * 0.79, 0, width, 0.74);
      const pullOffsets = width >= 30 / 12 ? [-width / 4, width / 4] : [0];
      front.userData.hardware = 'Top Knobs Dakota Charlotte M2223 cup pull';
      front.userData.pullCount = pullOffsets.length;
      for (const offset of pullOffsets) cabinetCupPull(front, offset, 0.22, 0.045);
    }
  }

  for (const [x, width] of [[kitchenSinkX - 3.525, 4.05], [kitchenSinkX + 4.525, 2.05]]) box(kitchen, x, 1.44, kitchenSinkRunZ, width, 2.85, 2, cabinetFinish);
  for (const x of [kitchenSinkX - 3.525, kitchenSinkX + 3.525]) box(kitchen, x, 2.96, kitchenSinkRunZ, 4.05, 0.18, 2.05, countertop, true).name = 'Top kitchen quartz counter';
  box(kitchen, kitchenSinkX, 1.1, kitchenSinkRunZ, 3, 2, 2, cabinetFinish);
  for (const [x, width] of [[kitchenSinkX - 4.25, 2.45], [kitchenSinkX + 4.525, 1.9]]) drawerFront(x, kitchenSinkRunZ + 1.03, width);
  const trash = new THREE.Group();
  trash.name = 'Pull-out trash left of sink';
  trash.position.set(kitchenSinkX - 2.25, 0, kitchenSinkRunZ);
  kitchen.add(trash);
  const trashFront = shakerFront(trash, 0, 1.45, 1.055, 1.45, 2.65);
  cabinetPull(trashFront, 0, 1, 0.09, 0.9);
  const dishwasher = new THREE.Group();
  dishwasher.name = '24 inch dishwasher right of sink';
  dishwasher.position.set(kitchenSinkX + 2.5, 0, kitchenSinkRunZ);
  kitchen.add(dishwasher);
  box(dishwasher, 0, 1.45, 0, 1.98, 2.8, 1.95, steel, true);
  box(dishwasher, 0, 1.45, 1.05, 1.98, 2.65, 0.08, steel, true);
  box(dishwasher, 0, 2.66, 1.1, 1.85, 0.12, 0.04, black);
  box(dishwasher, 0, 2.4, 1.15, 1.4, 0.07, 0.07, steel);
  box(dishwasher, 0, 0.23, 1.1, 1.8, 0.12, 0.04, black);
  for (const x of [kitchenSinkX - 0.74, kitchenSinkX + 0.74]) {
    const front = shakerFront(kitchen, x, 1.15, kitchenSinkRunZ + 1.03, 1.43, 1.8);
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
  sink.position.set(kitchenSinkX, 0, kitchenSinkRunZ);
  kitchen.add(sink);
  box(sink, 0, 2.65, 1, 3, 0.85, 0.18, porcelain, true).name = 'Farmhouse apron front';
  box(sink, 0, 2.65, -0.635, 3, 0.85, 0.14, porcelain, true).name = 'Farmhouse sink rear wall';
  for (const x of [-1.43, 1.43]) box(sink, x, 2.65, 0.1925, 0.14, 0.85, 1.795, porcelain, true);
  box(sink, 0, 2.25, 0.1725, 2.72, 0.12, 1.475, porcelain, true);
  box(sink, sinkDividerX, 2.535, 0.1725, 0.12, 0.45, 1.475, porcelain, true).name = 'Unequal-bowl low divider';
  for (const [index, x] of sinkBowlCenters.entries()) {
    cylinder(sink, x, 2.315, 0.1725, 0.09, 0.012, steel).name = index === 0 ? 'Small basin drain' : 'Large basin drain';
  }
  box(kitchen, kitchenSinkX, 2.96, kitchenWindowWallZ + 0.335, 3, 0.18, 0.32, countertop).name = 'Sink faucet and dispenser mounting deck';
  cylinder(kitchen, kitchenSinkX, 3.65, kitchenWindowWallZ + 0.36, 0.055, 1.3, steel).name = 'Main sink faucet stem';
  box(kitchen, kitchenSinkX, 4.25, kitchenWindowWallZ + 0.68, 0.11, 0.11, 0.65, steel, true).name = 'Main sink faucet spout';
  const waterDispenser = new THREE.Group();
  waterDispenser.name = 'Hot and cold filtered water dispenser';
  waterDispenser.position.set(kitchenSinkX - 1.05, 3.05, kitchenWindowWallZ + 0.36);
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
  soapDispenser.position.set(kitchenSinkX + 1.05, 3.05, kitchenWindowWallZ + 0.36);
  soapDispenser.userData = { underCounterReservoir: true, provisional: true };
  kitchen.add(soapDispenser);
  cylinder(soapDispenser, 0, 0.02, 0, 0.085, 0.04, steel).name = 'Soap dispenser deck base';
  cylinder(soapDispenser, 0, 0.15, 0, 0.045, 0.26, steel);
  box(soapDispenser, 0, 0.29, 0.13, 0.1, 0.06, 0.34, steel, true).name = 'Soap dispenser pump';
  const dishRack = new THREE.Group();
  dishRack.name = 'Compact dish rack right of main sink';
  dishRack.position.set(kitchenSinkX + 2.35, 3.05, kitchenSinkRunZ + 0.1);
  dishRack.userData = { trayWidthInches: 16, trayDepthInches: 14, removableCatchPan: true, manualEmptying: true, drainSpout: false, provisional: true };
  kitchen.add(dishRack);
  const catchPanFinish = mat('#b8b8ae', 0.65);
  const catchPan = new THREE.Group();
  catchPan.name = 'Removable dish rack catch pan';
  catchPan.userData = { removable: true, manualEmptying: true, closedBottom: true };
  dishRack.add(catchPan);
  box(catchPan, 0, 0.03, 0, 16 / 12, 0.06, 14 / 12, catchPanFinish).name = 'Dish rack catch pan base';
  for (const side of [-1, 1]) {
    box(catchPan, side * (8 / 12 - 0.015), 0.09, 0, 0.03, 0.06, 14 / 12 - 0.06, catchPanFinish).name = 'Catch pan side rim';
    box(catchPan, 0, 0.09, side * (7 / 12 - 0.015), 16 / 12, 0.06, 0.03, catchPanFinish).name = 'Catch pan end rim';
  }
  for (const side of [-1, 1]) {
    for (const y of [0.16, 0.42]) {
      box(dishRack, 0, y, side * 0.5, 1.18, 0.025, 0.025, steel);
      box(dishRack, side * 0.58, y, 0, 0.025, 0.025, 1, steel);
    }
    for (const z of [-0.5, 0.5]) cylinder(dishRack, side * 0.58, 0.25, z, 0.014, 0.38, steel);
  }
  for (let slot = 0; slot < 6; slot++) {
    const x = -0.45 + slot * 0.16;
    box(dishRack, x, 0.14, 0, 0.018, 0.018, 0.92, steel);
    for (const side of [-1, 1]) cylinder(dishRack, x, 0.26, side * 0.38, 0.01, 0.24, steel);
  }
  for (const x of [-0.37, -0.13, 0.11]) {
    const plate = cylinder(dishRack, x, 0.43, -0.05, 0.29, 0.025, porcelain);
    plate.name = 'Dish rack small white plate';
    plate.rotation.z = Math.PI / 2 - 0.12;
  }
  cylinder(dishRack, 0.43, 0.22, 0.28, 0.11, 0.3, catchPanFinish).name = 'Dish rack utensil cup';
  for (const x of [0.38, 0.43, 0.48]) cylinder(dishRack, x, 0.4, 0.28, 0.012, 0.45, steel);
  for (const { name, x, width, picture } of kitchenSinkWindows) {
    windowFrame(name, x, kitchenWindowWallZ + 0.1, width, kitchenSinkWindowHeight, kitchenSinkWindowSill, 0, scene, 1, {
      picture, material: kitchenSillQuartz, rounded: true,
      depth: 4.5 / 12, thickness: 0.75 / 12, apronHeight: 2 / 12, apronInset: 1.5 / 12, extraWidth: 1 / 12
    });
  }
  const sillFlowers = new THREE.Group();
  sillFlowers.name = 'Three small kitchen windowsill flower pots';
  kitchen.add(sillFlowers);
  const potCream = mat('#e8e1d5', 0.8);
  const potClay = mat('#b77e66', 0.95);
  const potSoil = mat('#493b30');
  const leafGreen = mat('#667653');
  const flowerIvory = mat('#f1e8d4');
  const flowerPink = mat('#d4afa5');
  const flowerCenter = mat('#b69a54');
  for (const [index, x] of [kitchenSinkWindows[0].x, kitchenSinkX + 1.75, kitchenSinkWindows[2].x].entries()) {
    const pot = new THREE.Group();
    pot.name = `Kitchen sill flower pot ${index + 1}`;
    pot.position.set(x, kitchenSinkWindowSill, kitchenWindowWallZ + 1 / 3);
    pot.scale.setScalar(0.55);
    pot.userData = { saucerDiameterInches: 3.168, provisional: true };
    sillFlowers.add(pot);
    const ceramic = index === 1 ? potClay : potCream;
    cylinder(pot, 0, 0.015, 0, 0.24, 0.03, ceramic).name = 'Plant drip saucer';
    cylinder(pot, 0, 0.19, 0, 0.14, 0.32, ceramic, 0.205).name = 'Small ceramic flower pot';
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.018, 8, 32), ceramic);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.35;
    pot.add(rim);
    cylinder(pot, 0, 0.35, 0, 0.185, 0.012, potSoil);
    for (const [stemIndex, [offsetX, offsetZ, height]] of [[-0.09, -0.04, 0.78], [0.08, 0.02, 0.91], [0, 0.1, 0.71]].entries()) {
      cylinder(pot, offsetX, (0.35 + height) / 2, offsetZ, 0.009, height - 0.35, leafGreen);
      for (const side of [-1, 1]) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), leafGreen);
        leaf.scale.set(0.045, 0.11, 0.02);
        leaf.rotation.z = side * 0.65;
        leaf.position.set(offsetX + side * 0.05, 0.48 + stemIndex * 0.04, offsetZ);
        pot.add(leaf);
      }
      for (let petal = 0; petal < 5; petal++) {
        const angle = petal * Math.PI * 2 / 5;
        const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 6), index === 1 ? flowerPink : flowerIvory);
        bloom.scale.y = 0.5;
        bloom.position.set(offsetX + Math.cos(angle) * 0.05, height, offsetZ + Math.sin(angle) * 0.05);
        pot.add(bloom);
      }
      cylinder(pot, offsetX, height + 0.012, offsetZ, 0.027, 0.02, flowerCenter);
    }
  }
  const kitchenCenterZ = cooktopCenterZ;
  const cooktopRunWidth = cooktopRunEndZ - cooktopRunStartZ - 2 * (casingSideWidth + casingReveal);
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
  const islandLength = 8;
  const stoolSpacingInches = 24;
  island.userData = { width: 3.5, length: islandLength, kneeOverhang: 1.25, seats: 4, sideSeatSpacingInches: stoolSpacingInches, finish: 'White-oak cabinetry with quartz waterfall ends' };
  island.position.set(-2, 0, kitchenCenterZ - 18.5);
  kitchen.add(island);
  const islandCabinetLength = islandLength - 4 / 12;
  box(island, 31.15, 0.19, 18.5, 1.7, 0.36, islandCabinetLength - 0.2, black).name = 'Island recessed toe-kick';
  box(island, 31.15, 1.59, 18.5, 2, 2.46, islandCabinetLength, cabinetFinish).name = 'Island simple white-oak storage base';
  box(island, 30.65, 2.935, 18.5, 3.5, 0.23, islandLength, countertop, true).name = 'Island light quartz slab';
  for (const z of [18.5 - islandLength / 2 + 1 / 12, 18.5 + islandLength / 2 - 1 / 12]) {
    box(island, 30.65, 1.41, z, 3.5, 2.82, 2 / 12, countertop).name = 'Island quartz waterfall end';
  }
  for (const offset of [-1, 0, 1]) drawerFront(32.2, 18.5 + offset * islandCabinetLength / 3, islandCabinetLength / 3 - 0.08, Math.PI / 2, island);
  const stoolFabric = mat('#a17c57', 0.98);
  stoolFabric.name = 'Brown stool upholstery';
  const stoolWood = mat('#98704e', 0.6);
  for (const offset of [-1.5, -0.5, 0.5, 1.5]) {
    const stool = new THREE.Group();
    stool.name = 'Kitchen stool';
    stool.userData = { widthInches: 18, centerSpacingInches: stoolSpacingInches, reference: 'Dark-frame stool with brown seat and wood back' };
    stool.position.set(29.28, 0, 18.5 + offset * stoolSpacingInches / 12);
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

  function furnishing(name, x, z, rotation = 0, elevation = 0) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(x, elevation, z);
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

  const stairs = furnishing('U-shaped hall staircase', stairOpening.x + stairOpening.width, stairOpening.z, stairOpening.rotation);
  stairs.scale.z = -1;
  scene.add(stairs);
  const stairDepth = stairOpening.depth;
  const outerStairRailZ = stairDepth - 0.08;
  const landingHeight = stairRisers * stairRise;
  const landingEndX = stairRun + stairLandingDepth;
  const stairBookcaseDepth = 11 / 12;
  const stairBookcaseSplitX = stairRun + 21.3 / 12;
  const stairBookcaseFlightSplitStep = Math.floor((stairRisers + 2) / 2);
  stairs.userData = { flightWidthInches: 44, wallSideFlightWidthInches: wallSideStairWidth * 12, risersPerFlight: stairRisers, riseInches: stairRise * 12, treadDepthInches: 10, landingDepthInches: stairLandingDepth * 12, floorToFloorFeet: stairFloorToFloor, floorAssemblyInches: floorAssemblyDepth * 12, provisional: true };
  roomDimensions('Stairs (kitchen-side flight)', stairWidth, stairRun);
  roomDimensions('Stairs (wall-side flight)', wallSideStairWidth, stairRun);
  roomDimensions('Stair turning landings', stairDepth, stairLandingDepth);

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
      if (!upper) {
        const caseHeight = recessedBookcase ? stairBookcaseHeight((step < stairBookcaseFlightSplitStep ? 3 : stairBookcaseFlightSplitStep) * stairGoing) : 0;
        const infillDepth = recessedBookcase ? stairBookcaseDepth : 0.08;
        const riserBottom = height - stairRise;
        const lowerHeight = riserBottom - caseHeight;
        // Only recess the infill beside the riser; keep the enclosure below it continuous.
        if (lowerHeight > 0) {
          box(flight, x, caseHeight + lowerHeight / 2, infillDepth / 2, stairGoing, lowerHeight, infillDepth, wallMaterial).name = 'Continuous stair-side enclosure';
        }
        const upperHeight = stairRise - 0.1;
        box(flight, backingX, riserBottom + upperHeight / 2, infillDepth / 2, backingLength, upperHeight, infillDepth, wallMaterial).name = 'Bookcase stair-slope infill';
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
      // The powder-room wall replaces the upper flight's outer freestanding guard, not its stringer.
      if (upper && side === 1) continue;
      const railZ = centerZ + side * (flightWidth / 2 + 0.08);
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
    { start: 3 * stairGoing, width: (stairBookcaseFlightSplitStep - 3) * stairGoing },
    { start: stairBookcaseFlightSplitStep * stairGoing, width: stairRun - stairBookcaseFlightSplitStep * stairGoing },
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
    const panelHeight = height - 0.1;
    const shelfDepth = stairBookcaseDepth - 0.06;
    box(bay, width / 2, panelHeight / 2, stairBookcaseDepth - 0.03, width - 0.16, panelHeight, 0.06, cream).name = 'Bookcase backing';
    for (const x of [0.04, width - 0.04]) box(bay, x, panelHeight / 2, stairBookcaseDepth / 2, 0.08, panelHeight, stairBookcaseDepth, cream).name = 'Bookcase side';
    box(bay, width / 2, 0.36, shelfDepth / 2, width - 0.16, 0.72, shelfDepth, cream).name = 'Bookcase plinth';
    box(bay, width / 2, height - 0.05, stairBookcaseDepth / 2, width, 0.1, stairBookcaseDepth, oak).name = 'Bookcase top';
    for (let shelfY = 0.76; shelfY < height - 0.5; shelfY += 1.05) {
      box(bay, width / 2, shelfY, shelfDepth / 2, width - 0.16, 0.08, shelfDepth, oak).name = 'Open bookcase shelf';
      const availableHeight = Math.min(1.05, height - 0.1 - shelfY) - 0.08;
      for (let book = 0; book < 4; book++) {
        const bookHeight = Math.min(0.6 + (book % 3) * 0.1, availableHeight - 0.08);
        box(bay, 0.25 + book * 0.21, shelfY + 0.04 + bookHeight / 2, 0.4, 0.14, bookHeight, 0.55, [walnut, linen, cream, oak][book]).name = 'Built-in shelf book';
      }
    }
  }
  const stairBaseTrim = new THREE.Group();
  stairBaseTrim.name = 'Under-stair base trim';
  stairBaseTrim.userData = { heightInches: 8, thicknessInches: 0.75, shoeRadiusInches: 0.75 };
  stairs.add(stairBaseTrim);
  const stairBaseTrimEndX = stairOpening.width;
  box(stairBaseTrim, (stairGoing + stairBaseTrimEndX) / 2, 0.005 + 4 / 12, -0.75 / 24, stairBaseTrimEndX - stairGoing, 8 / 12, 0.75 / 12, windowTrim).name = 'Under-stair white baseboard';
  const stairShoeProfile = new THREE.Shape();
  stairShoeProfile.moveTo(0, 0);
  stairShoeProfile.lineTo(0.75 / 12, 0);
  stairShoeProfile.absarc(0, 0, 0.75 / 12, 0, Math.PI / 2);
  stairShoeProfile.closePath();
  const stairShoe = new THREE.Mesh(new THREE.ExtrudeGeometry(stairShoeProfile, { depth: stairBaseTrimEndX - stairGoing, bevelEnabled: false, curveSegments: 8 }), windowTrim);
  stairShoe.name = 'Under-stair quarter-round shoe';
  stairShoe.rotation.y = Math.PI / 2;
  stairShoe.position.set(stairGoing, 0.005, -0.75 / 12);
  stairBaseTrim.add(stairShoe);
  const firstStepTrimHeight = Math.min(8 / 12, stairRise - 0.1);
  box(stairBaseTrim, stairGoing / 2, 0.005 + firstStepTrimHeight / 2, -0.75 / 24, stairGoing, firstStepTrimHeight, 0.75 / 12, windowTrim).name = 'Bottom-step baseboard extension';
  const firstStepShoe = new THREE.Mesh(new THREE.ExtrudeGeometry(stairShoeProfile, { depth: stairGoing, bevelEnabled: false, curveSegments: 8 }), windowTrim);
  firstStepShoe.name = 'Bottom-step quarter-round extension';
  firstStepShoe.rotation.y = Math.PI / 2;
  firstStepShoe.position.set(0, 0.005, -0.75 / 12);
  stairBaseTrim.add(firstStepShoe);
  box(stairBaseTrim, -0.75 / 24, 0.005 + firstStepTrimHeight / 2, (stairWidth - 0.75 / 12) / 2, 0.75 / 12, firstStepTrimHeight, stairWidth + 0.75 / 12, windowTrim).name = 'Bottom-step front trim return';
  box(stairBaseTrim, landingEndX + 0.75 / 24, 0.005 + 4 / 12, (stairBookcaseDepth - 0.75 / 12) / 2, 0.75 / 12, 8 / 12, stairBookcaseDepth + 0.75 / 12, windowTrim).name = 'Bookcase end baseboard return';
  const endShoe = new THREE.Mesh(new THREE.ExtrudeGeometry(stairShoeProfile, { depth: stairBookcaseDepth + 0.75 / 12, bevelEnabled: false, curveSegments: 8 }), windowTrim);
  endShoe.name = 'Bookcase end quarter-round return';
  endShoe.position.set(landingEndX + 0.75 / 12, 0.005, -0.75 / 12);
  stairBaseTrim.add(endShoe);
  const landingGuardZ = -0.08;
  stairBeam('Turning landing side handrail', [stairRun, landingHeight + 3, landingGuardZ], [landingEndX, landingHeight + 3, landingGuardZ], 0.12, 0.12, oak);
  for (let rail = 1; rail <= 8; rail++) {
    stairBeam('Horizontal landing guard rail', [stairRun, landingHeight + rail / 3, landingGuardZ], [landingEndX, landingHeight + rail / 3, landingGuardZ], 0.045, 0.045, black);
  }
  for (const x of [stairRun, landingEndX - 0.05]) box(stairs, x, landingHeight + 1.5, landingGuardZ, 0.09, 3, 0.09, black).name = 'Landing guard post';

  const upstairsStairParts = stairs.children.slice();
  const basementStairs = new THREE.Group();
  basementStairs.name = 'Basement U-shaped staircase';
  basementStairs.userData = { flightWidthInches: 44, entryFlightWidthInches: wallSideStairWidth * 12, floorToFloorFeet: stairFloorToFloor, floorAssemblyInches: floorAssemblyDepth * 12, risersPerFlight: stairRisers, riseInches: stairRise * 12, treadDepthInches: 10, landingDepthInches: stairLandingDepth * 12, entry: 'Hall beneath upper stair arrival', provisional: true };
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
      for (const step of [0, 4, stairRisers - 2]) {
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
  for (const [x, width] of [[prepSinkX - 3.775, 4.55], [prepSinkX + 3.225, 3.45]]) cabinet(prep, x, prepCounterZ, width);
  const prepExtension = furnishing('Prep counter extension with six drawers', 53.775, prepCounterZ);
  prepExtension.userData = { widthInches: 34.2, depthInches: 24, drawerBanks: 2, drawers: 6, provisional: true };
  box(prepExtension, 0, 1.475, 0, 2.85, 2.85, 2, cabinetFinish).name = 'Prep extension cabinet carcass';
  box(prepExtension, 0, 2.97, 0, 2.91, 0.14, 2.05, countertop).name = 'Prep extension quartz counter';
  for (const x of [-0.7125, 0.7125]) drawerFront(x, 1.04, 1.385, 0, prepExtension);
  const prepSink = new THREE.Group();
  prepSink.name = 'Prep single-bowl sink and base';
  prepSink.position.set(prepSinkX, 0, prepCounterZ);
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
  box(prep, 48.275, 3.45, kitchenWindowWallZ + 0.22, 13.85, 0.82, 0.08, countertop).name = 'Prep quartz backsplash';
  for (const [index, x] of prepWindowCenters.entries()) {
    windowFrame(`Prep counter window ${index + 1}`, x, kitchenWindowWallZ, prepWindowWidth, prepWindowHeight, prepWindowSill, 0, rest);
  }
  windowFrame('Prep end-wall window', 55.5, prepEndWindowZ, prepEndWindowWidth, prepWindowHeight, prepWindowSill, -Math.PI / 2, rest);
  const prepTower = furnishing('Prep microwave and wall oven tower', 39.875, kitchenWindowWallZ + 0.25 + 25 / 24);
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
  const prepCounterAppliances = new THREE.Group();
  prepCounterAppliances.name = 'Prep countertop appliances';
  rest.add(prepCounterAppliances);
  const blenderGlass = new THREE.MeshStandardMaterial({ color: '#d8e5df', transparent: true, opacity: 0.45, roughness: 0.15, depthWrite: false });
  const mixerPaint = mat('#ded8c9', 0.35);
  const prepApplianceSpecs = [
    ['Prep stand mixer', 41.65 + 12.6 / 24, 12.6, 16.8, 16.8],
    ['Breville Super Q blender', 41.65 + (12.6 + 2 + 8.1 / 2) / 12, 8.1, 10.5, 18.1],
    ['Prep rice cooker', 52.858333333333334, 12, 14.4, 12.6],
    ['Prep Ninja air fryer', 54.225, 16.8, 15.6, 13.2]
  ];
  const prepApplianceRearZ = kitchenWindowWallZ + 0.26;
  for (const [name, x, widthInches, depthInches, heightInches] of prepApplianceSpecs) {
    const appliance = new THREE.Group();
    appliance.name = name;
    appliance.userData = { widthInches, depthInches, heightInches, provisional: true, operatingClearancesVerified: false };
    prepCounterAppliances.add(appliance);
    const w = widthInches / 12;
    const d = depthInches / 12;
    const h = heightInches / 12;
    appliance.position.set(x, 3.04, prepApplianceRearZ + d / 2);
    if (name === 'Breville Super Q blender') {
      box(appliance, 0, 0.25, 0, w, 0.5, d, steel, true).name = 'Super Q motor base';
      box(appliance, 0, 0.27, d / 2 + 0.01, w * 0.8, 0.19, 0.02, black).name = 'Super Q control panel';
      const dial = cylinder(appliance, 0, 0, 0, 0.075, 0.035, steel);
      dial.rotation.x = Math.PI / 2;
      dial.position.set(0, 0.27, d / 2 + 0.04);
      cylinder(appliance, -0.04, 0.91, 0, 0.23, 0.82, blenderGlass, 0.28).name = 'Super Q blender jug';
      cylinder(appliance, -0.04, h - 0.07, 0, 0.29, 0.14, black).name = 'Super Q jug lid';
      box(appliance, 0.285, 0.94, 0, 0.07, 0.55, 0.13, black).name = 'Blender handle grip';
      for (const y of [0.7, 1.18]) box(appliance, 0.23, y, 0, 0.17, 0.055, 0.13, black);
    } else if (name === 'Prep rice cooker') {
      cylinder(appliance, 0, 0.45, 0, w / 2, 0.9, porcelain).scale.z = d / w;
      const lid = cylinder(appliance, 0, h - 0.075, 0, w / 2, 0.15, steel);
      lid.scale.z = d / w;
      box(appliance, 0, h - 0.025, 0, 0.32, 0.05, 0.18, black).name = 'Rice cooker lid grip';
      box(appliance, 0, 0.4, d / 2 - 0.02, 0.45, 0.24, 0.06, black).name = 'Rice cooker controls';
    } else if (name === 'Prep Ninja air fryer') {
      box(appliance, 0, h / 2, 0, w, h, d, black, true).name = 'Provisional Ninja air fryer body';
      box(appliance, 0, h * 0.84, d / 2 + 0.01, w * 0.8, 0.15, 0.02, steel).name = 'Air fryer control strip';
      for (const side of [-1, 1]) {
        box(appliance, side * w / 4, h * 0.38, d / 2 + 0.02, w * 0.43, h * 0.55, 0.04, steel).name = 'Air fryer drawer front';
        box(appliance, side * w / 4, h * 0.51, d / 2 + 0.09, 0.1, 0.28, 0.12, black).name = 'Air fryer drawer handle';
      }
    } else {
      box(appliance, 0, 0.065, 0, w, 0.13, d, mixerPaint, true).name = 'Stand mixer foot';
      box(appliance, 0, h * 0.48, -d * 0.32, 0.32, h * 0.85, 0.35, mixerPaint, true).name = 'Mixer pedestal';
      box(appliance, 0, h - 0.16, 0, 0.5, 0.32, d * 0.9, mixerPaint, true).name = 'Mixer motor head';
      cylinder(appliance, 0, 0.43, d * 0.16, 0.25, 0.6, steel, 0.42).name = 'Mixer stainless bowl';
      cylinder(appliance, 0, 0.86, d * 0.16, 0.035, 0.38, steel).name = 'Mixer beater shaft';
    }
  }

  const prepShelfStart = 38 + 0.175;
  const prepShelfEnd = 55.5 - 0.175;
  const prepShelves = furnishing('Prep open pantry shelves', (prepShelfStart + prepShelfEnd) / 2, 14.15);
  const prepShelfWidth = prepShelfEnd - prepShelfStart;
  const prepShelfDepth = 1;
  const prepShelfThickness = 0.75 / 12;
  const prepShelfBottom = 0.75;
  const prepShelfLevels = [1, 2.3, 3.6, 4.9, 6.2, 7.5, ceilingHeight - prepShelfThickness / 2];
  const prepShelfBays = 5;
  prepShelves.userData = { widthInches: prepShelfWidth * 12, depthInches: 12, bays: prepShelfBays, shelfLevels: prepShelfLevels.length, ceilingHeight, provisional: true };
  for (let support = 0; support <= prepShelfBays; support++) {
    const x = -prepShelfWidth / 2 + prepShelfThickness / 2 + support * (prepShelfWidth - prepShelfThickness) / prepShelfBays;
    box(prepShelves, x, (prepShelfBottom + ceilingHeight) / 2, 0, prepShelfThickness, ceilingHeight - prepShelfBottom, prepShelfDepth, cabinetFinish).name = 'Pantry shelf upright';
  }
  for (const y of prepShelfLevels) {
    for (let bay = 0; bay < prepShelfBays; bay++) {
      const bayWidth = (prepShelfWidth - prepShelfThickness) / prepShelfBays;
      const x = -prepShelfWidth / 2 + prepShelfThickness / 2 + (bay + 0.5) * bayWidth;
      box(prepShelves, x, y, 0, bayWidth - prepShelfThickness, prepShelfThickness, prepShelfDepth, cabinetRailFinish).name = 'Open pantry shelf';
    }
  }

  const pantryContents = new THREE.Group();
  pantryContents.name = 'Prep pantry contents';
  prepShelves.add(pantryContents);
  const pantryGrains = [mat('#dfc795'), mat('#be925f'), mat('#eee4ca')];
  const pantryPackages = [mat('#ac684b'), mat('#71846a'), mat('#c4a25b')];
  const pantryWicker = mat('#b48b5c');
  const pantryGlass = new THREE.MeshStandardMaterial({ color: '#e2ede6', transparent: true, opacity: 0.25, roughness: 0.18, depthWrite: false });
  const pantryBottle = mat('#526342', 0.28);
  for (let level = 0; level < prepShelfLevels.length - 1; level++) {
    for (let bay = 0; bay < prepShelfBays; bay++) {
      const bayWidth = (prepShelfWidth - prepShelfThickness) / prepShelfBays;
      const supplies = new THREE.Group();
      supplies.name = `Pantry supplies bay ${bay + 1} level ${level + 1}`;
      supplies.position.set(-prepShelfWidth / 2 + prepShelfThickness / 2 + (bay + 0.5) * bayWidth, prepShelfLevels[level] + prepShelfThickness / 2, 0);
      pantryContents.add(supplies);
      const style = (bay + level) % 4;
      if (style === 0) {
        for (const x of [-0.74, 0.74]) {
          box(supplies, x, 0.035, 0, 1.2, 0.07, 0.78, pantryWicker).name = 'Pantry basket bottom';
          for (const side of [-1, 1]) {
            box(supplies, x + side * 0.575, 0.35, 0, 0.05, 0.7, 0.78, pantryWicker);
            for (let row = 0; row < 6; row++) box(supplies, x, 0.1 + row * 0.11, side * 0.37, 1.2, 0.055, 0.04, pantryWicker);
            for (let slat = 0; slat < 8; slat++) box(supplies, x - 0.53 + slat * 0.15, 0.35, side * 0.38, 0.025, 0.7, 0.025, oak);
          }
          box(supplies, x, 0.36, -0.41, 0.4, 0.18, 0.025, cream).name = 'Basket label';
          for (const dx of [-0.25, 0.25]) box(supplies, x + dx, 0.53, 0, 0.33, 0.6, 0.42, pantryPackages[bay % 3]).name = 'Bagged pantry staples';
        }
      } else {
        for (let item = 0; item < 4; item++) {
          const x = (item - 1.5) * 0.68;
          const h = 0.7 + ((bay + item) % 3) * 0.13;
          const color = pantryPackages[(bay + item) % 3];
          if (style === 1) {
            cylinder(supplies, x, h / 2, 0, 0.23, h, pantryGlass).name = 'Clear dry-goods jar';
            cylinder(supplies, x, (h - 0.12) / 2, 0, 0.205, h - 0.12, pantryGrains[item % 3]).name = 'Jar grains and pasta';
            cylinder(supplies, x, h + 0.025, 0, 0.245, 0.05, oak).name = 'Wood jar lid';
            box(supplies, x, h / 2, -0.235, 0.25, 0.22, 0.02, cream).name = 'Jar label';
          } else if (style === 2) {
            box(supplies, x, h / 2, 0, 0.47, h, 0.55, color).name = 'Cereal and pasta package';
            box(supplies, x, h * 0.58, -0.285, 0.33, h * 0.4, 0.02, cream).name = 'Dry-goods package label';
          } else if (item < 2) {
            cylinder(supplies, x, 0.37, 0, 0.18, 0.74, pantryBottle).name = 'Pantry oil bottle';
            cylinder(supplies, x, 0.85, 0, 0.07, 0.22, pantryBottle);
            cylinder(supplies, x, 0.98, 0, 0.075, 0.06, brass).name = 'Bottle cap';
            box(supplies, x, 0.36, -0.185, 0.23, 0.3, 0.02, cream).name = 'Bottle label';
          } else {
            for (let stack = 0; stack < 2; stack++) {
              const y = 0.19 + stack * 0.39;
              cylinder(supplies, x, y, 0, 0.23, 0.38, color).name = 'Stacked pantry can';
              cylinder(supplies, x, y + 0.18, 0, 0.235, 0.025, steel).name = 'Can lid';
              box(supplies, x, y, -0.235, 0.28, 0.18, 0.02, cream).name = 'Can label';
            }
          }
        }
      }
    }
  }

  tiledFloor('Mudroom tile', 38, 15, 7.4, 11.9);
  const mudBench = furnishing('Six-cubby mudroom bench', 44.25, 21.75, -Math.PI / 2);
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
  for (const { x, z, w, d } of garageFloorAreas) {
    const surface = box(rest, x + w / 2, garageFloorY - 0.01, z + d / 2, w, 0.03, d, epoxy);
    surface.name = 'Garage epoxy floor';
    surface.userData.walkSurface = true;
  }
  const garageSideDoor = furnishing('Solid garage exterior pedestrian door', 55.5, 45.5, 0, garageFloorY);
  box(garageSideDoor, 0, 4, 0, 0.18, 8, 3, cream).name = 'Opaque insulated exterior door slab';
  for (const side of [-1, 1]) {
    box(garageSideDoor, side * 0.14, 3.1, -1.15, 0.08, 0.5, 0.12, black).name = 'Exterior door lockset';
    box(garageSideDoor, side * 0.2, 3.1, -1.02, 0.1, 0.08, 0.35, black).name = 'Exterior door lever';
  }
  const garageStair = furnishing('Two-step garage-to-house entry', garageEntry.x + garageEntry.width / 2, garageEntry.z);
  garageStair.userData = { risers: garageRisers, riseInches: garageRise * 12, totalRiseInches: -garageFloorY * 12, treadDepthInches: 11, widthInches: garageEntry.width * 12, landing: false, rails: false, provisional: true };
  for (let step = 0; step < garageRisers; step++) {
    const top = -step * garageRise;
    const tread = box(garageStair, 0, (garageFloorY + top) / 2, (step + 0.5) * garageEntry.going, garageEntry.width, top - garageFloorY, garageEntry.going, epoxy);
    tread.name = `Garage entry tread ${step + 1}`;
    tread.userData.walkSurface = true;
    const nosing = box(garageStair, 0, top - 0.008, (step + 1) * garageEntry.going - 0.04, garageEntry.width - 0.12, 0.016, 0.08, cream);
    nosing.name = 'Contrasting garage stair nosing';
    nosing.userData.walkSurface = true;
  }

  function vehicle(name, x, z, lengthInches, bodyWidthInches, mirrorWidthInches, heightInches, wheelbaseInches, pickup) {
    const car = furnishing(name, x, z, 0, garageFloorY);
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
  vehicle('GMC Sierra EV', 48, 38, 233.42, 83.8, 95.7, 80, 145.7, true);
  vehicle('BMW i4', 37, 40.5, 188.5, 72.9, 81.6, 57, 112.4, false);
  for (const x of [32.5, 41.5, 44, 53]) {
    const stripe = box(rest, x, garageFloorY + 0.012, 40.5, 0.05, 0.01, 16.6, cream);
    stripe.name = 'Garage bay stripe';
    stripe.userData.walkSurface = true;
  }
  for (const x of [37, 48.5]) {
    const threshold = box(rest, x, garageFloorY + 0.012, 48.9, 9, 0.01, 0.12, black);
    threshold.name = 'Nine-foot garage door threshold';
    threshold.userData.walkSurface = true;
  }
  const charger = furnishing('EV charger', 42.75, 48.65, Math.PI, garageFloorY);
  charger.userData = { location: 'Interior face of pier between the two garage doors', provisional: true, cableReachVerified: false };
  box(charger, 0, 4.4, 0, 0.7, 1.3, 0.35, black, true);
  box(charger, 0, 4.55, 0.18, 0.35, 0.35, 0.02, light).name = 'EV charger status screen';
  const chargingCable = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 8, 32), black);
  chargingCable.position.set(0, 3.5, 0.22);
  charger.add(chargingCable);
  const bikeRack = furnishing('Five-bike roll-in floor rack', 50.4, 18.5, 0, garageFloorY);
  bikeRack.userData = { bikes: 5, storage: 'Floor-level wheel stands; no lifting', spacingInches: 22.2, provisional: true };
  for (const z of [-2.05, -1.25]) box(bikeRack, 0, 0.1, z, 9.4, 0.1, 0.1, steel).name = 'Floor rack base rail';
  const bicycleColors = [mat('#516f77'), mat('#b78355'), mat('#859b6b'), mat('#a75f59'), mat('#697b92')];
  for (let i = 0; i < 5; i++) {
    const x = -3.7 + i * 1.85;
    for (const side of [-1, 1]) {
      box(bikeRack, x + side * 0.13, 0.4, -2.05, 0.05, 0.7, 0.05, steel).name = 'Roll-in wheel stand upright';
      box(bikeRack, x + side * 0.13, 0.75, -1.78, 0.05, 0.05, 0.59, steel).name = 'Roll-in wheel stand top';
      stairBeam('Roll-in wheel stand brace', [x + side * 0.13, 0.75, -1.5], [x + side * 0.13, 0.15, -1.25], 0.05, 0.05, steel, bikeRack);
    }
    const bicycle = new THREE.Group();
    bicycle.name = `Floor-parked bicycle ${i + 1}`;
    bicycle.position.x = x;
    bicycle.userData = { wheelsOnFloor: true, liftingRequired: false };
    bikeRack.add(bicycle);
    const radius = [1, 0.85, 0.8, 0.85, 1][i];
    const axleHeight = radius + 0.06;
    for (const z of [-1.65, 1.65]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.055, 8, 32), black);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(0, axleHeight, z);
      wheel.name = 'Bicycle wheel on floor';
      bicycle.add(wheel);
      for (const slope of [-1, 1]) stairBeam('Bicycle wheel spoke', [0, axleHeight - radius * 0.85, z - slope * radius * 0.5], [0, axleHeight + radius * 0.85, z + slope * radius * 0.5], 0.018, 0.018, steel, bicycle);
    }
    const pedal = [0, axleHeight - 0.2, 0.35];
    const saddle = [0, axleHeight + 1.05, 0.65];
    const steering = [0, axleHeight + 1.15, -1.3];
    for (const [from, to] of [[pedal, saddle], [saddle, steering], [steering, pedal], [saddle, [0, axleHeight, 1.65]], [pedal, [0, axleHeight, 1.65]], [steering, [0, axleHeight, -1.65]]]) {
      stairBeam('Bicycle frame tube', from, to, 0.08, 0.08, bicycleColors[i], bicycle);
    }
    box(bicycle, 0, axleHeight + 1.15, 0.65, 0.5, 0.12, 0.65, black, true).name = 'Bicycle saddle';
    stairBeam('Bicycle handlebar stem', steering, [0, axleHeight + 1.55, -1.3], 0.07, 0.07, steel, bicycle);
    box(bicycle, 0, axleHeight + 1.55, -1.3, 1.5, 0.08, 0.1, black).name = 'Bicycle handlebar';
    box(bicycle, 0, axleHeight - 0.25, 0.35, 0.65, 0.08, 0.25, black).name = 'Bicycle pedals';
  }
  bikeRack.traverse((object) => { if (object.isMesh) object.userData.tourObstacle = true; });

  const yardTools = furnishing('Garage yard-tool storage', 32.95, 27.115, 0, garageFloorY);
  yardTools.userData = { location: 'House-side wall in front of the BMW, clear of the house-entry steps', storage: 'Upright-storage battery mower and rolling shop vac; wall rail, hand-tool board, and battery shelf', provisional: true };
  const toolGreen = mat('#67826a');
  for (const y of [4.4, 6.5]) box(yardTools, 0, y, 0.8, 6.8, 0.12, 1.6, steel).name = 'Garage tool shelf';
  box(yardTools, 0, 5.4, 0.03, 6.8, 1.8, 0.08, black).name = 'Garage hand-tool board';
  for (let i = 0; i < 6; i++) box(yardTools, -2.5 + i, 5.35, 0.15, 0.08, 0.9, 0.12, steel).name = 'Hanging hand tool';
  for (const x of [-1.5, 0, 1.5]) box(yardTools, x, 4.62, 0.8, 0.6, 0.25, 0.5, black, true).name = 'Removable tool battery and charging dock';
  for (const x of [-3.2, 3.2]) box(yardTools, x, 5.45, 0.02, 0.1, 2.3, 0.12, black).name = 'Wall-mounted shelf standard';
  box(yardTools, 0, 3.8, 0.02, 6.8, 0.15, 0.12, black).name = 'Garden-tool hanging rail';
  for (const x of [-0.5, 0.35, 1.2]) {
    stairBeam('Long-handle garden tool', [x, 0.7, 0.18], [x, 3.8, 0.18], 0.05, 0.05, oak, yardTools);
    box(yardTools, x, 3.85, 0.2, 0.4, 0.2, 0.12, steel).name = 'Garden-tool head and hook';
  }
  const mower = new THREE.Group();
  mower.name = 'Upright-stored battery lawn mower';
  mower.position.set(2.1, 0, 0.15);
  mower.userData = { provisional: true, foldedHandle: true, uprightStorageRequired: true, widthInches: 24, storedDepthInches: 16.1 };
  yardTools.add(mower);
  box(mower, 0, 0.45, 0, 1.8, 0.5, 2.5, toolGreen, true).name = 'Battery mower deck';
  box(mower, 0, 0.9, -0.2, 0.8, 0.4, 0.8, black, true).name = 'Mower battery housing';
  for (const x of [-0.85, 0.85]) {
    for (const z of [-0.85, 0.85]) {
      const wheel = cylinder(mower, x, 0.32, z, 0.32, 0.25, black);
      wheel.rotation.z = Math.PI / 2;
    }
    stairBeam('Folded mower handle', [x, 0.6, -0.85], [x, 1.3, 0.65], 0.06, 0.06, steel, mower);
  }
  box(mower, 0, 1.3, 0.65, 1.7, 0.08, 0.08, black).name = 'Folded mower handle grip';
  const uprightMower = new THREE.Group();
  for (const part of [...mower.children]) uprightMower.add(part);
  uprightMower.rotation.x = Math.PI / 2;
  uprightMower.position.y = 1.25;
  mower.add(uprightMower);
  const shopVac = new THREE.Group();
  shopVac.name = 'Large rolling shop vacuum';
  shopVac.position.set(-2.65, 0, 1);
  yardTools.add(shopVac);
  cylinder(shopVac, 0, 1.25, 0, 0.85, 1.9, steel).name = 'Large shop vac drum';
  box(shopVac, 0, 2.3, 0, 1.55, 0.35, 1.55, black, true).name = 'Shop vac motor lid';
  for (const x of [-0.7, 0.7]) for (const z of [-0.7, 0.7]) cylinder(shopVac, x, 0.15, z, 0.15, 0.25, black).name = 'Shop vac caster';
  const hose = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 8, 24), black);
  hose.position.set(0, 1.3, 0.9);
  hose.name = 'Shop vac hose on storage hook';
  shopVac.add(hose);
  const blower = box(yardTools, -2.25, 3.2, 0.4, 0.8, 0.65, 0.6, toolGreen, true);
  blower.name = 'Wall-hung battery leaf blower';
  stairBeam('Leaf blower nozzle', [-2.25, 3.2, 0.7], [-2.25, 2.65, 1.5], 0.22, 0.22, black, yardTools);
  for (const x of [-2.1, -0.7, 0.7, 2.1]) box(yardTools, x, 6.85, 0.8, 1.05, 0.55, 1.25, linen, true).name = 'Garage tool storage bin';
  yardTools.traverse((object) => { if (object.isMesh) object.userData.tourObstacle = true; });

  const kidsClay = mat('#b98369');
  const kidsBlue = mat('#78949a');
  const kidsRug = furnishing('Kids play rug', 24.5, 29.8);
  kidsRug.userData = { widthInches: 90, depthInches: 72, finish: 'Muted sage, washable low-pile direction', provisional: true };
  box(kidsRug, 0, 0.07, 0, 7.5, 0.06, 6, linen, true);
  const toyStorage = furnishing('Kids low toy storage', 24, 33.65, Math.PI);
  toyStorage.userData = { widthInches: 96, depthInches: 15, heightInches: 24, closedStorage: true, wallAnchorageRequired: true, provisional: true };
  box(toyStorage, 0, 0.15, -0.1, 7.9, 0.3, 1.05, cabinetFinish).name = 'Toy storage recessed plinth';
  box(toyStorage, 0, 1.1, 0, 8, 1.7, 1.25, cabinetFinish).name = 'Low toy storage cabinet';
  box(toyStorage, 0, 1.95, 0, 8, 0.1, 1.25, cabinetRailFinish).name = 'Toy storage oak top';
  for (let door = 0; door < 4; door++) {
    const front = shakerFront(toyStorage, (door - 1.5) * 2, 1.1, 0.665, 1.96, 1.66);
    cabinetPull(front, 0, 0.55, 0.09, 0.35);
  }
  const readingBench = furnishing('Kids reading bench', 23.5, 26.75);
  readingBench.userData = { widthInches: 60, depthInches: 18, seatHeightInches: 18, upholstery: 'Washable sage direction', wallAnchorageRequired: true, provisional: true };
  box(readingBench, 0, 0.7, 0, 5, 1.25, 1.5, cabinetFinish).name = 'Reading bench storage base';
  box(readingBench, 0, 1.4, 0, 5, 0.2, 1.5, linen, true).name = 'Sage reading bench cushion';
  for (const side of [-1, 1]) {
    const front = shakerFront(readingBench, side * 1.25, 0.7, 0.79, 2.46, 1.21);
    cabinetPull(front, 0, 0.4, 0.09, 0.35);
    box(readingBench, side * 1.25, 1.85, -0.55, 1.5, 0.7, 0.3, side < 0 ? kidsClay : linen, true).name = 'Reading nook back cushion';
  }
  const kidsBooks = furnishing('Kids face-out book display', 28.4, 31.8, -Math.PI / 2);
  kidsBooks.userData = { widthInches: 18, depthInches: 6, heightInches: 36, wallAnchorageRequired: true, provisional: true };
  box(kidsBooks, 0, 1.5, -0.2, 1.5, 3, 0.08, cabinetFinish).name = 'Low book display backing';
  for (const y of [0.5, 1.7]) {
    box(kidsBooks, 0, y, 0, 1.5, 0.08, 0.5, cabinetRailFinish).name = 'Face-out book ledge';
    box(kidsBooks, 0, y + 0.12, 0.22, 1.5, 0.2, 0.06, cabinetRailFinish).name = 'Book ledge retaining lip';
    for (const [index, material] of [kidsClay, kidsBlue, linen].entries()) {
      box(kidsBooks, (index - 1) * 0.45, y + 0.42, 0.08, 0.4, 0.72, 0.07, material).name = 'Displayed picture book';
    }
  }
  const artDisplay = furnishing('Kids art display board', 24, 34.34, Math.PI);
  box(artDisplay, 0, 4.5, 0, 7, 2.25, 0.08, linen).name = 'Sage art display backing';
  for (const x of [-3.5, 3.5]) box(artDisplay, x, 4.5, 0.03, 0.08, 2.33, 0.08, cabinetFinish);
  for (const y of [3.375, 5.625]) box(artDisplay, 0, y, 0.03, 7, 0.08, 0.08, cabinetRailFinish);
  for (const [index, material] of [kidsClay, kidsBlue, oak].entries()) {
    const x = (index - 1) * 2.1;
    box(artDisplay, x, 4.5, 0.06, 1.65, 1.7, 0.025, cream).name = 'Rotating child artwork';
    box(artDisplay, x - 0.2, 4.65, 0.08, 0.6, 0.5, 0.015, material);
    box(artDisplay, x + 0.2, 4.2, 0.08, 0.5, 0.3, 0.015, material);
  }
  const activityTable = furnishing('Kids activity table', 23.5, 29.6);
  activityTable.userData = { diameterInches: 32, heightInches: 20, shape: 'Round', provisional: true };
  const activityTop = cylinder(activityTable, 0, 20 / 12 - 0.06, 0, 16 / 12, 0.12, cabinetRailFinish);
  activityTop.name = 'Round kids activity tabletop';
  activityTop.userData.tourObstacle = true;
  for (const x of [-0.8, 0.8]) for (const z of [-0.8, 0.8]) box(activityTable, x, 0.75, z, 0.12, 1.5, 0.12, oak);
  for (const x of [-2, 2]) {
    const seat = furnishing('Kids activity stool', 23.5 + x, 29.6);
    cylinder(seat, 0, 1.05, 0, 0.55, 0.18, cream);
    for (const dx of [-0.3, 0.3]) box(seat, dx, 0.5, 0, 0.1, 1, 0.6, oak);
  }

  for (const [index, [deskX, deskZ, rotation]] of [[3.8, officeNorthZ + 1.35, 0], [6, 52.8, Math.PI]].entries()) {
    const officeDesk = furnishing(`60-inch office desk ${index + 1}`, deskX, deskZ, rotation);
    officeDesk.userData = { widthInches: 60, depthInches: 24, provisional: true };
    box(officeDesk, 0, 2.4, 0, 5, 0.2, 2, oak).name = '60-inch desktop';
    for (const x of [-2.2, 2.2]) for (const z of [-0.8, 0.8]) box(officeDesk, x, 1.2, z, 0.12, 2.4, 0.12, oak);
    for (const monitorX of [-1.05, 1.05]) {
      box(officeDesk, monitorX, 3.5, -0.25, 1.9, 1.1, 0.1, black, true).name = 'Office monitor';
      box(officeDesk, monitorX, 2.53, -0.25, 0.9, 0.06, 0.5, steel);
      box(officeDesk, monitorX, 2.8, -0.25, 0.08, 0.55, 0.08, steel);
    }
    box(officeDesk, 0, 2.53, 0.45, 1.2, 0.06, 0.4, black);
    const deskChair = furnishing('Office task chair', deskX, deskZ + (index === 0 ? 2.35 : -2.35), rotation + Math.PI);
    box(deskChair, 0, 1.6, 0, 1.8, 0.3, 1.7, black, true);
    box(deskChair, 0, 2.5, -0.7, 1.8, 1.6, 0.2, black, true);
    cylinder(deskChair, 0, 0.8, 0, 0.12, 1.5, steel);
    for (const angle of [0, Math.PI / 3, 2 * Math.PI / 3]) {
      const foot = box(deskChair, 0, 0.15, 0, 2.2, 0.12, 0.1, black);
      foot.rotation.y = angle;
    }
  }
  const officeLounge = furnishing('Office loveseat', 10.45, 50.4, -Math.PI / 2);
  officeLounge.userData = { widthInches: 60, depthInches: 33.6, provisional: true };
  box(officeLounge, 0, 1, 0, 5, 0.8, 2.8, cream, true);
  box(officeLounge, 0, 2, -1.15, 5, 1.4, 0.35, cushion, true);
  for (const side of [-2.35, 2.35]) box(officeLounge, side, 1.5, 0, 0.3, 0.8, 2.8, cream, true);

  const officeDoors = furnishing('Office white ten-lite French doors', officeEntry.x, officeEntry.z, Math.PI / 2);
  officeDoors.userData = { widthInches: officeEntry.width * 12, heightInches: officeEntry.height * 12, leaves: 2, nominalLeafWidthInches: 30, finish: 'Painted white', style: 'Reference-photo French doors, two columns by five rows per leaf', litesPerLeaf: 10, inwardSwing: true, openAngleDegrees: 90, productSelected: false, provisional: true };
  const officeLeafWidth = 29.75 / 12;
  const officeLeafBottom = 0.5 / 12;
  const officeLeafTop = officeEntry.height - 0.125 / 12;
  const officeLeafThickness = 1.75 / 12;
  const officeStileWidth = 4.5 / 12;
  const officePanelWidth = officeLeafWidth - 2 * officeStileWidth;
  const officeGlass = new THREE.MeshStandardMaterial({ color: '#e8eee9', roughness: 0.1, transparent: true, opacity: 0.24 });
  officeGlass.name = 'Clear French-door glazing - screen approximation';
  const officeGlassBottom = 8 / 12;
  const officeGlassTop = 90.5 / 12;
  const officeMuntinWidth = 0.75 / 12;
  const officeLiteWidth = (officePanelWidth - officeMuntinWidth) / 2;
  const officeLiteHeight = (officeGlassTop - officeGlassBottom - 4 * officeMuntinWidth) / 5;
  for (const side of [-1, 1]) {
    const leaf = new THREE.Group();
    leaf.name = side < 0 ? 'Office first French door leaf' : 'Office second French door leaf';
    leaf.position.x = side * (officeEntry.width / 2 - 0.125 / 12);
    leaf.userData = { nominalWidthInches: 30, nominalHeightInches: 96, thicknessInches: 1.75, columns: 2, rows: 5, lites: 10, inwardOpenRotation: -side * Math.PI / 2, provisional: true };
    leaf.rotation.y = leaf.userData.inwardOpenRotation * officeDoors.userData.openAngleDegrees / 90;
    officeDoors.add(leaf);
    const centerX = -side * officeLeafWidth / 2;
    for (const edge of [-1, 1]) {
      box(leaf, centerX + edge * (officeLeafWidth - officeStileWidth) / 2, (officeLeafBottom + officeLeafTop) / 2, 0, officeStileWidth, officeLeafTop - officeLeafBottom, officeLeafThickness, windowTrim).name = 'Office white French-door stile';
    }
    for (const [bottom, top] of [[officeLeafBottom, officeGlassBottom], [officeGlassTop, officeLeafTop]]) {
      box(leaf, centerX, (bottom + top) / 2, 0, officePanelWidth, top - bottom, officeLeafThickness, windowTrim).name = 'Office white French-door rail';
    }
    for (let column = 0; column < 2; column++) {
      const x = centerX + (column - 0.5) * (officeLiteWidth + officeMuntinWidth);
      for (let row = 0; row < 5; row++) {
        const y = officeGlassBottom + officeLiteHeight / 2 + row * (officeLiteHeight + officeMuntinWidth);
        box(leaf, x, y, 0, officeLiteWidth, officeLiteHeight, 0.04, officeGlass).name = 'Office French-door glass lite';
      }
    }
    const handleX = centerX - side * (officeLeafWidth - officeStileWidth) / 2;
    for (const face of [-1, 1]) {
      const gridDepth = face * (officeLeafThickness / 2 - 0.02);
      box(leaf, centerX, (officeGlassBottom + officeGlassTop) / 2, gridDepth, officeMuntinWidth, officeGlassTop - officeGlassBottom, 0.04, windowTrim).name = 'Office French-door vertical muntin';
      for (let row = 1; row < 5; row++) {
        const y = officeGlassBottom + row * officeLiteHeight + (row - 0.5) * officeMuntinWidth;
        for (const column of [-1, 1]) box(leaf, centerX + column * (officeLiteWidth + officeMuntinWidth) / 2, y, gridDepth, officeLiteWidth, officeMuntinWidth, 0.04, windowTrim).name = 'Office French-door horizontal muntin';
      }
      const rose = cylinder(leaf, handleX, 38 / 12, face * (officeLeafThickness / 2 + 0.02), 0.095, 0.035, brass);
      rose.name = 'Office gold knob rose';
      rose.rotation.x = Math.PI / 2;
      const spindle = cylinder(leaf, handleX, 38 / 12, face * (officeLeafThickness / 2 + 0.09), 0.035, 0.105, brass);
      spindle.name = 'Office gold knob spindle';
      spindle.rotation.x = Math.PI / 2;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), brass);
      knob.name = 'Office round gold doorknob';
      knob.position.set(handleX, 38 / 12, face * (officeLeafThickness / 2 + 0.16));
      leaf.add(knob);
    }
    for (const y of [9, 34, 63, 87]) cylinder(leaf, 0, y / 12, 0, 0.03, 0.25, black).name = 'Office dark door hinge';
  }

  const elliptical = furnishing('SOLE E20 elliptical concept', 1.65, 50.3);
  elliptical.userData = { lengthInches: 65, widthInches: 22, heightInches: 64, provisional: true, operatingClearancesVerified: false, source: 'https://www.soletreadmills.com/products/sole-e20' };
  const ellipticalLength = 65 / 12;
  const ellipticalWidth = 22 / 12;
  for (const z of [-ellipticalLength / 2 + 0.08, ellipticalLength / 2 - 0.08]) {
    box(elliptical, 0, 0.14, z, ellipticalWidth, 0.2, 0.16, black).name = 'Elliptical floor stabilizer';
  }
  for (const side of [-1, 1]) {
    box(elliptical, side * 0.65, 0.23, 0, 0.09, 0.15, ellipticalLength - 0.2, steel).name = 'Elliptical base rail';
    box(elliptical, side * 0.43, 0.72, 0.5, 0.45, 0.14, 1.5, black, true).name = 'Elliptical foot pedal';
    stairBeam('Elliptical pedal linkage', [side * 0.43, 0.65, 1.9], [side * 0.43, 0.8, -1.6], 0.07, 0.08, steel, elliptical);
    stairBeam('Elliptical moving handle', [side * 0.65, 0.8, -1.6], [side * 0.65, 4.5, -1.9], 0.09, 0.09, black, elliptical);
    stairBeam('Elliptical hand grip', [side * 0.65, 4.5, -1.9], [side * 0.65, 4.8, -1.5], 0.12, 0.12, black, elliptical);
  }
  const flywheel = cylinder(elliptical, 0, 1, -1.65, 0.8, 0.85, black);
  flywheel.rotation.z = Math.PI / 2;
  flywheel.name = 'E20 front flywheel housing';
  stairBeam('Elliptical console mast', [0, 0.6, -1.8], [0, 4.9, -1.8], 0.16, 0.18, steel, elliptical);
  box(elliptical, 0, (4.9 + 64 / 12) / 2, -1.8, 1.25, 64 / 12 - 4.9, 0.2, black, true).name = 'SOLE E20 console';
  box(elliptical, 0, 5.12, -1.68, 0.7, 0.22, 0.03, glass).name = 'Elliptical display';

  const bedroomBedWidth = 63.5 / 12;
  const bedroomBedDepth = 82.75 / 12;
  const bedroomFurnitureBack = 31.2 - 0.175 - 0.15;
  const bedroomBedZ = 54.2 - 0.175 - 0.15 - 3.7 - 0.78;
  const bed = furnishing('Article Lenia queen bed', bedroomFurnitureBack - bedroomBedDepth / 2, bedroomBedZ, -Math.PI / 2);
  bed.userData = { widthInches: 63.5, depthInches: 82.75 };
  box(bed, 0, 1, 0, bedroomBedWidth, 0.5, bedroomBedDepth, oak);
  for (const x of [-2.25, 2.25]) for (const z of [-3, 3]) box(bed, x, 0.4, z, 0.18, 0.8, 0.18, oak);
  box(bed, 0, 2.1, -bedroomBedDepth / 2 + 0.1, bedroomBedWidth, 3.3, 0.2, oak, true);
  box(bed, 0, 1.63, 0.05, 5, 0.75, 6.65, cushion, true);
  box(bed, 0, 2.02, 1.1, 5.03, 0.08, 3.8, linen, true);
  for (const x of [-1.25, 1.25]) box(bed, x, 2.12, -2.2, 2.1, 0.35, 1.35, porcelain, true);
  for (const side of [-1, 1]) {
    const nightstand = furnishing('Bedroom nightstand', bedroomFurnitureBack - 0.675, bedroomBedZ + side * 3.7, -Math.PI / 2);
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
  const guestCoats = furnishing('Guest coat closet', 9.65, powderNorthZ + 1.2);
  guestCoats.userData = { purpose: 'Guest coats, separate from powder room', nominalWidthInches: 61.2, nominalDepthInches: 28.8, clearDepthInches: 24.6, doorWidthInches: 48, provisional: true };
  box(guestCoats, 0, 6.5, 0, 4.65, 0.1, 1.95, cabinetFinish).name = 'Guest coat closet upper shelf';
  const guestCoatRail = cylinder(guestCoats, 0, 5.65, 0, 0.045, 4.4, brass);
  guestCoatRail.rotation.z = Math.PI / 2;
  guestCoatRail.name = 'Guest coat hanging rail';
  for (const x of [-1.5, -0.5, 0.5, 1.5]) {
    box(guestCoats, x, 3.8, 0, 0.65, 3.2, 1.45, x < 0 ? linen : cream, true).name = 'Guest hanging coat';
  }
  for (const side of [-1, 1]) {
    const door = shakerFront(guestCoats, side, 3.5, 1.2, guestEntry.closetDoor.width / 2 - 0.04, 6.96);
    door.name = 'Guest coat closet closed Shaker door';
    cabinetPull(door, -side * 0.8, 0, 0.09, 0.65);
  }

  const powderDoor = furnishing('Powder room inward-opening door', guestEntry.powderDoor.x, guestEntry.powderDoor.z + guestEntry.powderDoor.width, Math.PI / 2);
  powderDoor.userData = { nominalWidthInches: 30, heightInches: 84, openAngleDegrees: 90, inwardSwing: true, hinge: 'South jamb', provisional: true };
  box(powderDoor, 0, 3.5, -1.25, 0.13, 6.96, 2.46, windowTrim).name = 'Powder painted-white door leaf';
  for (const y of [1.8, 5.15]) for (const side of [-1, 1]) box(powderDoor, side * 0.075, y, -1.25, 0.025, 2.7, 2.05, cream).name = 'Powder door recessed panel';
  for (const side of [-1, 1]) box(powderDoor, side * 0.14, 3, -2.2, 0.16, 0.15, 0.15, brass, true).name = 'Powder door satin-gold knob';

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
  tiledFloor('Powder room tile', guestEntry.powder.x, powderNorthZ, guestEntry.powder.w, guestEntry.powder.d);
  toilet('Powder toilet', guestEntry.toilet.x, guestEntry.toilet.z);
  vanity('Powder vanity', guestEntry.vanity.x, guestEntry.vanity.z, guestEntry.vanity.width, guestEntry.vanity.rotation);
  tiledFloor('Guest bathroom tile', 25, 34.6, 6.2, 4.6);
  vanity('Guest bathroom vanity', 29.8, 36, 2.2, -Math.PI / 2);
  toilet('Guest bathroom toilet', 26.55, 36.3);

  const frontDoor = furnishing('Double front entry', 15.6, 54.2);
  frontDoor.userData = { lockBrand: 'Wyze', lockModel: null, activeLeafHandingVerified: false, hardwareCompatibilityVerified: false };
  for (const side of [-1, 1]) {
    box(frontDoor, side * 1.25, 3.45, 0, 2.45, 6.9, 0.12, oak);
    box(frontDoor, side * 1.25, 4.15, -0.08, 1.65, 3.6, 0.04, glass);
    box(frontDoor, side * 0.22, 3.15, -0.14, 0.06, 1, 0.08, brass);
  }
  const entrySmartLock = new THREE.Group();
  entrySmartLock.name = 'Wyze smart-lock selection placeholder';
  entrySmartLock.position.set(0.22, 4.15, -0.08);
  entrySmartLock.userData = { brand: 'Wyze', model: null, representation: 'Schematic interior lock body, not manufacturer geometry', leafSide: 'Positive x, provisional active leaf', finishVerified: false, dimensionsVerified: false };
  frontDoor.add(entrySmartLock);
  box(entrySmartLock, 0, 0, -0.06, 0.28, 0.55, 0.12, black, true).name = 'Schematic smart-lock interior housing';
  box(entrySmartLock, 0, -0.12, -0.14, 0.16, 0.045, 0.05, steel, true).name = 'Schematic smart-lock thumbturn';
  tiledFloor('Porch paving', 0, 54.2, 31.2, 7, mat('#c9c7bc'));
  for (const x of [5, 26.2]) {
    const porchBench = furnishing('Porch bench', x, 55.4);
    box(porchBench, 0, 1.4, 0, 5, 0.2, 1.7, oak);
    box(porchBench, 0, 2.1, -0.7, 5, 1.3, 0.15, oak);
    for (const side of [-2.1, 2.1]) box(porchBench, side, 0.7, 0, 0.15, 1.4, 1.5, black);
  }
  windowFrame('Office side window', 0.1, 49, 4, 5, 3, -Math.PI / 2, rest, -1);
  windowFrame('Office porch window', 6, 54.2, 6, 5, 3, 0, rest, -1);
  windowFrame('Bedroom porch window', 25, 54.1, 7.6, 5, 3, 0, rest, -1);

  const ground = new THREE.Group();
  ground.name = 'Site ground around lowered garage and basement stairwell';
  scene.add(ground);
  const groundMaterial = mat('#eeeee6');
  const excavationLeft = stairOpening.x - stairwellWallThickness;
  // Soil meets the retaining walls' outer faces, not their visible stairwell faces.
  const excavationRight = stairOpening.x + stairOpening.width + stairWidth;
  const excavationFront = stairOpening.z - stairwellWallThickness;
  const excavationBack = stairOpening.z + stairOpening.depth + stairwellWallThickness;
  let groundAreas = [
    { x: -95, z: -92, w: excavationLeft + 95, d: 240 },
    { x: excavationRight, z: -92, w: 145 - excavationRight, d: 240 },
    { x: excavationLeft, z: -92, w: excavationRight - excavationLeft, d: excavationFront + 92 },
    { x: excavationLeft, z: excavationBack, w: excavationRight - excavationLeft, d: 148 - excavationBack }
  ];
  const garageApproaches = [{ x: 32.5, z: 49, w: 20.5, d: 3 }, { x: 55.5, z: 43.5, w: 3, d: 4 }];
  const garageExcavations = [
    ...garageFloorAreas.map(({ x, z, w, d }) => ({ x: x - 0.175, z: z - 0.175, w: w + 0.35, d: d + 0.35 })),
    ...garageApproaches
  ];
  for (const cut of garageExcavations) {
    groundAreas = groundAreas.flatMap((area) => {
      const left = Math.max(area.x, cut.x);
      const right = Math.min(area.x + area.w, cut.x + cut.w);
      const front = Math.max(area.z, cut.z);
      const back = Math.min(area.z + area.d, cut.z + cut.d);
      if (right <= left || back <= front) return [area];
      return [
        { x: area.x, z: area.z, w: left - area.x, d: area.d },
        { x: right, z: area.z, w: area.x + area.w - right, d: area.d },
        { x: left, z: area.z, w: right - left, d: front - area.z },
        { x: left, z: back, w: right - left, d: area.z + area.d - back }
      ].filter(({ w, d }) => w > 0.0001 && d > 0.0001);
    });
  }
  for (const { x, z, w, d } of groundAreas) {
    const part = box(ground, x + w / 2, -0.75, z + d / 2, w, 0.5, d, groundMaterial);
    part.name = 'Site ground outside excavations';
    part.castShadow = false;
  }
  for (const { x, z, w, d } of garageApproaches) {
    const part = box(ground, x + w / 2, garageFloorY - 0.255, z + d / 2, w, 0.5, d, groundMaterial);
    part.name = 'Provisional lower garage approach';
    part.castShadow = false;
  }
  const groundModelRoots = scene.children.filter((object) => !object.isLight);
  const originalGroundRoots = [...groundModelRoots];
  const originalGroundDimensions = [...document.querySelectorAll('#room-dimension-summary li')].map((item) => item.cloneNode(true));
  const groundBaseline = getGroundFloorDefaultPlan();
  let groundLayoutPreview = null;
  const upstairsHelpers = { box, mat, wood, wallMaterial, windowTrim, oak, cream, black, steel, linen, windowFrame, openingCasing };
  let upstairs = buildUpstairsModel(THREE, upstairsHelpers, stairOpening, stairFloorToFloor, savedUpstairsLayout);
  scene.add(upstairs.group);
  const exterior = buildExteriorModel(THREE, { box, mat }, stairFloorToFloor, garageFloorY);
  scene.add(exterior);
  const groundVisibility = new Map();
  function floorAreas() {
    return activeFloor === 'upstairs' ? upstairs.areas : walkFloorAreas;
  }
  function selectFloor(floor) {
    if (floor === activeFloor) return;
    if (floor !== 'ground') {
      groundVisibility.clear();
      for (const object of groundModelRoots) {
        groundVisibility.set(object, object.visible);
        object.visible = false;
      }
      stairs.visible = floor === 'upstairs';
      for (const part of upstairsStairParts) part.visible = true;
      basementStairs.visible = false;
    } else {
      for (const [object, visible] of groundVisibility) object.visible = visible;
      basementStairs.visible = true;
    }
    activeFloor = floor;
    const groundStatus = document.getElementById('ground-preview-status');
    if (groundStatus) groundStatus.hidden = floor !== 'ground' || !groundLayoutPreview;
    upstairs.group.visible = floor === 'upstairs';
    exterior.visible = floor === 'exterior';
    tourGrid = null;
    tourMapCursor = null;
    const areas = floorAreas();
    tourMapBounds.x = Math.min(...areas.map((area) => area.x));
    tourMapBounds.z = Math.min(...areas.map((area) => area.z));
    tourMapBounds.right = Math.max(...areas.map((area) => area.x + area.w));
    tourMapBounds.bottom = Math.max(...areas.map((area) => area.z + area.d));
    tourMapScale = (tourMap.width - 24) / Math.max(tourMapBounds.right - tourMapBounds.x, tourMapBounds.bottom - tourMapBounds.z);
    document.getElementById('floor-caption').textContent = floor === 'exterior' ? 'EXTERIOR - ENGLISH COUNTRY CONCEPT' : floor === 'upstairs' ? 'UPSTAIRS - ADAPTED STUDY' : 'GROUND FLOOR';
    viewport.setAttribute('aria-label', floor === 'exterior' ? '3D English-country exterior concept. Drag to orbit; select an elevation to view each facade.' : `3D ${floor === 'upstairs' ? 'upstairs' : 'ground floor'}. Click the floor to enter the tour. Drag to ${navigationMode === 'move' ? 'move' : 'rotate'}; scroll or pinch to zoom.`);
    tourMap.setAttribute('aria-label', `Clickable ${floor === 'upstairs' ? 'upstairs' : 'ground-floor'} plan. Arrow keys select a destination; Enter travels there.`);
    islandLightsInput.closest('details').hidden = floor !== 'ground';
    document.getElementById('exterior-views').hidden = floor !== 'exterior';
    document.querySelector('[data-navigation="walk"]').disabled = floor === 'exterior' || (floor === 'ground' && Boolean(groundLayoutPreview));
    document.querySelector('.room-dimensions').hidden = floor === 'exterior';
    for (const item of document.querySelectorAll('#room-dimension-summary li')) item.hidden = (item.dataset.floor === 'upstairs') !== (floor === 'upstairs');
  }
  function refreshUpstairsDimensions() {
    document.querySelectorAll('#room-dimension-summary [data-floor="upstairs"]').forEach((item) => item.remove());
    for (const room of upstairs.rooms) {
      roomDimensions(`Upstairs ${room.name}`, room.w, room.d);
      const item = document.getElementById('room-dimension-summary').lastElementChild;
      item.dataset.floor = 'upstairs';
      item.hidden = activeFloor !== 'upstairs';
    }
  }
  refreshUpstairsDimensions();
  const presets = {
    exterior: { target: [27, 11, 29], offset: [64, 24, 82], span: 68 },
    'exterior-front': { target: [27.75, 13, 49], offset: [0, 0, 120], span: 42 },
    'exterior-rear': { target: [27.75, 13, 7], offset: [0, 0, -120], span: 42 },
    'exterior-west': { target: [0, 13, 29.5], offset: [-120, 0, 0], span: 46 },
    'exterior-east': { target: [55.5, 13, 29.5], offset: [120, 0, 0], span: 46 },
    'exterior-site': { target: [exterior.userData.lot.centerX, 0, (exterior.userData.lot.rear + exterior.userData.lot.front) / 2], offset: [0, 160, 0.01], span: 150 },
    'exterior-patio': { target: [41, 3, 2.45], offset: [24, 22, -28], span: 44 },
    'exterior-security': { target: [exterior.userData.lot.centerX, 0, (exterior.userData.lot.rear + exterior.userData.lot.front) / 2], offset: [0, 160, 0.01], span: 150 },
    upstairs: { target: [27, stairFloorToFloor + 1, 28], offset: [34, 68, 43], span: 74 },
    'upstairs-top': { target: [27, stairFloorToFloor, 28], offset: [0, 110, 0.1], span: 70 },
    social: { target: [19, 2, 12], offset: [27, 55, 32], span: 43 },
    living: { target: [12.5, 1.5, livingCenterZ], offset: [28, 27, 7], span: 32 },
    kids: { target: [24, 1, 30.15], offset: [12, 38, -9], span: 17 },
    dining: { target: [19.8, 1, 2.6], offset: [16, 19, 23], span: 20 },
    kitchen: { target: [32.2, 2, kitchenCenterZ], offset: [-22, 35, 27], span: 26 },
    cooktop: { target: [37, 5.3, cooktopCenterZ], offset: [-18, 0, 0], span: 11 },
    fridge: { target: [bottomRunCenterX, 5, 26.9], offset: [0, 0, -18], span: 12 },
    island: { target: [30.65 + island.position.x, 1.5, kitchenCenterZ], offset: [-12, 9, 10], span: 15 },
    whole: { target: [27, 0, 29], offset: [35, 75, 50], span: 78 },
    garage: { target: [43, 0, 33], offset: [15, 58, 10], span: 42 },
    prep: { target: [44, 1, 16], offset: [-28, 44, 30], span: 28 },
    pantry: { target: [46.75, 4.5, 14.15], offset: [0, 0.2, -2.5], span: 12.5 },
    'prep-counter': { target: [46.75, 4.5, prepCounterZ], offset: [0, 0.4, 2.6], span: 12.5 },
    powder: { target: [6.1, 0, powderNorthZ + 2.95], offset: [0, 30, 4], span: 17 },
    private: { target: [15.6, 1, 43], offset: [32, 49, 37], span: 40 },
    basement: { target: [stairOpening.x + stairOpening.width / 2, -3, stairOpening.z + stairOpening.depth / 2], offset: [4, 30, 5], span: 21 },
    top: { target: [27, 0, 29], offset: [0, 110, 0.1], span: 72 }
  };
  function fitEditedUpstairs(edits) {
    const status = document.getElementById('upstairs-preview-status');
    status.textContent = upstairs.coordinationWarnings.join(' ');
    status.hidden = !status.textContent;
    if (!edits.rooms.length && !edits.walls.length) {
      presets.upstairs.target = [27, stairFloorToFloor + 1, 28];
      presets.upstairs.span = 74;
      presets['upstairs-top'].target = [27, stairFloorToFloor, 28];
      presets['upstairs-top'].span = 70;
      return;
    }
    const minX = Math.min(...upstairs.rooms.map((room) => room.x), ...upstairs.plan.walls.map((wall) => wall.x1));
    const maxX = Math.max(...upstairs.rooms.map((room) => room.x + room.w), ...upstairs.plan.walls.map((wall) => wall.x2));
    const minZ = Math.min(...upstairs.rooms.map((room) => room.z), ...upstairs.plan.walls.map((wall) => wall.z1));
    const maxZ = Math.max(...upstairs.rooms.map((room) => room.z + room.d), ...upstairs.plan.walls.map((wall) => wall.z2));
    for (const name of ['upstairs', 'upstairs-top']) {
      presets[name].target = [(minX + maxX) / 2, stairFloorToFloor + (name === 'upstairs' ? 1 : 0), (minZ + maxZ) / 2];
      presets[name].span = Math.max(maxX - minX, maxZ - minZ) + 10;
    }
  }
  fitEditedUpstairs(savedUpstairsLayout);
  let currentView = 'whole';
  const walkHeight = 5.4;
  const walkRadius = 0.5;
  const walkSpeed = 4;
  const walkKeys = new Set();
  const walkObstacles = [];
  const walkCameraObstacles = [];
  const walkPosition = new THREE.Vector3();
  const walkPath = [];
  const tourGridStep = 0.5;
  const tourRaycaster = new THREE.Raycaster();
  const tourMapContext = tourMap.getContext('2d');
  if (!tourMapContext) throw new Error('The clickable tour plan requires a 2D canvas context.');
  const tourMapBounds = {
    x: Math.min(...walkFloorAreas.map((area) => area.x)),
    z: Math.min(...walkFloorAreas.map((area) => area.z)),
    right: Math.max(...walkFloorAreas.map((area) => area.x + area.w)),
    bottom: Math.max(...walkFloorAreas.map((area) => area.z + area.d))
  };
  let tourMapScale = (tourMap.width - 24) / Math.max(tourMapBounds.right - tourMapBounds.x, tourMapBounds.bottom - tourMapBounds.z);
  const tourAvatar = new THREE.Group();
  tourAvatar.name = 'Third-person tour avatar';
  tourAvatar.visible = false;
  scene.add(tourAvatar);
  const avatarShirt = mat('#467f98');
  const avatarSkin = mat('#caa584');
  const avatarBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.5, 4, 8), avatarShirt);
  avatarBody.position.y = 3.45;
  tourAvatar.add(avatarBody);
  const avatarHead = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), avatarSkin);
  avatarHead.position.y = 5.05;
  tourAvatar.add(avatarHead);
  cylinder(tourAvatar, 0, 4.65, 0, 0.13, 0.3, avatarSkin);
  const avatarLimbs = [];
  for (const side of [-1, 1]) {
    for (const arm of [false, true]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * (arm ? 0.4 : 0.17), arm ? 4.1 : 2.4, 0);
      const limb = new THREE.Mesh(new THREE.CapsuleGeometry(arm ? 0.105 : 0.13, arm ? 1.25 : 1.85, 4, 8), arm ? avatarShirt : black);
      limb.position.y = arm ? -0.7 : -1.1;
      pivot.add(limb);
      if (!arm) box(pivot, 0, -2.22, -0.09, 0.26, 0.25, 0.5, black, true);
      tourAvatar.add(pivot);
      avatarLimbs.push({ pivot, direction: side * (arm ? -1 : 1) });
    }
  }
  const tourDestination = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.4, 32), new THREE.MeshBasicMaterial({ color: '#3982ac', side: THREE.DoubleSide }));
  tourDestination.name = 'Tour destination marker';
  tourDestination.rotation.x = -Math.PI / 2;
  tourDestination.visible = false;
  scene.add(tourDestination);
  for (const decoration of [tourAvatar, tourDestination]) decoration.traverse((object) => { object.userData.tourDecoration = true; });
  const walkKeyActions = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'backward', ArrowDown: 'backward', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyQ: 'turn-left', KeyE: 'turn-right' };
  let walkFrame = 0;
  let walkLastTime = null;
  let walkYaw = 0;
  let walkPitch = 0;
  let walkDrag = null;
  let orbitSnapshot = null;
  let tourGrid = null;
  let tourMapCursor = null;
  let avatarStride = 0;

  function walkElevationAt(x, z) {
    let elevation = null;
    for (const area of floorAreas()) {
      if (x >= area.x && x <= area.x + area.w && z >= area.z && z <= area.z + area.d) elevation = Math.max(elevation ?? -Infinity, area.elevation);
    }
    if (elevation === null) return null;
    if (activeFloor === 'ground' && x >= garageEntry.x && x <= garageEntry.x + garageEntry.width && z >= garageEntry.z && z < garageEntry.z + garageRisers * garageEntry.going) {
      return -Math.floor((z - garageEntry.z) / garageEntry.going) * garageRise;
    }
    return elevation;
  }

  function buildWalkObstacles() {
    walkObstacles.length = 0;
    walkCameraObstacles.length = 0;
    tourGrid = null;
    scene.updateMatrixWorld(true);
    scene.traverse((object) => {
      if (activeFloor === 'upstairs') {
        for (let ancestor = object; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return;
      } else {
        for (let ancestor = object; ancestor; ancestor = ancestor.parent) if (ancestor === upstairs.group) return;
      }
      if (!object.isMesh || object.userData.tourDecoration || object.userData.walkSurface || object.userData.livingLayoutHidden || (object.geometry.type !== 'BoxGeometry' && object.name !== '8 inch interior baseboard' && !object.userData.tourObstacle)) return;
      const bounds = new THREE.Box3().setFromObject(object);
      const size = bounds.getSize(new THREE.Vector3());
      const elevation = walkElevationAt((bounds.min.x + bounds.max.x) / 2, (bounds.min.z + bounds.max.z) / 2) ?? 0;
      if (bounds.max.y > elevation + 0.5 && Math.max(size.x, size.z) >= 0.5) walkCameraObstacles.push(bounds);
      if (bounds.max.y <= elevation + 0.5 || Math.min(size.x, size.z) < 0.05 || Math.max(size.x, size.z) < 0.5) return;
      if (bounds.min.y >= elevation + walkHeight) return;
      walkObstacles.push(bounds);
    });
    // Keep the follow camera in front of the stairwell guards, rather than looking through their gaps.
    walkCameraObstacles.push(new THREE.Box3(new THREE.Vector3(stairOpening.x, -0.5, stairOpening.z), new THREE.Vector3(stairOpening.x + stairOpening.width, stairFloorToFloor + ceilingHeight + 4, stairOpening.z + stairOpening.depth)));
  }

  function canWalkAt(x, z) {
    const elevation = walkElevationAt(x, z);
    if (elevation === null) return false;
    for (const [dx, dz] of [[-walkRadius, -walkRadius], [-walkRadius, walkRadius], [walkRadius, -walkRadius], [walkRadius, walkRadius]]) {
      const corner = walkElevationAt(x + dx, z + dz);
      if (corner === null || Math.abs(corner - elevation) > garageRise + 0.0001) return false;
    }
    return !walkObstacles.some((bounds) => {
      if (bounds.max.y <= elevation + 0.5 || bounds.min.y >= elevation + walkHeight) return false;
      const dx = x - THREE.MathUtils.clamp(x, bounds.min.x, bounds.max.x);
      const dz = z - THREE.MathUtils.clamp(z, bounds.min.z, bounds.max.z);
      return dx * dx + dz * dz < walkRadius * walkRadius;
    });
  }

  function findWalkStart(x, z) {
    if (canWalkAt(x, z)) return [x, z];
    for (let radius = 0.5; radius <= 4; radius += 0.5) {
      for (let step = 0; step < 16; step++) {
        const angle = step * Math.PI / 8;
        const candidate = [x + Math.cos(angle) * radius, z + Math.sin(angle) * radius];
        if (canWalkAt(...candidate)) return candidate;
      }
    }
    return null;
  }

  function setTourStatus(text, notice = false) {
    tourStatus.textContent = text;
    tourStatus.classList.toggle('tour-notice', notice);
  }

  function drawTourMap() {
    const context = tourMapContext;
    const mapX = (x) => 12 + (x - tourMapBounds.x) * tourMapScale;
    const mapZ = (z) => 12 + (z - tourMapBounds.z) * tourMapScale;
    context.fillStyle = '#f6f6ef';
    context.fillRect(0, 0, tourMap.width, tourMap.height);
    context.fillStyle = '#e0d5bd';
    for (const area of floorAreas()) context.fillRect(mapX(area.x), mapZ(area.z), area.w * tourMapScale, area.d * tourMapScale);
    context.fillStyle = '#777e73';
    for (const bounds of walkObstacles) {
      context.fillRect(mapX(bounds.min.x), mapZ(bounds.min.z), (bounds.max.x - bounds.min.x) * tourMapScale, (bounds.max.z - bounds.min.z) * tourMapScale);
    }
    context.strokeStyle = '#777e73';
    context.lineWidth = 1;
    for (let step = 0; activeFloor === 'ground' && step < garageRisers; step++) {
      const z = garageEntry.z + (step + 1) * garageEntry.going;
      context.beginPath();
      context.moveTo(mapX(garageEntry.x), mapZ(z));
      context.lineTo(mapX(garageEntry.x + garageEntry.width), mapZ(z));
      context.stroke();
    }
    context.font = 'bold 10px sans-serif';
    context.textAlign = 'center';
    context.lineWidth = 3;
    context.strokeStyle = '#f6f6ef';
    context.fillStyle = '#30483c';
    const mapLabels = activeFloor === 'upstairs' ? upstairs.mapLabels : [['Living', 12.5, livingCenterZ], ['Dining', 19.8, 2.6], ['Kitchen', 32.2, kitchenCenterZ], ['Prep', 44, 16], ['Garage', 43, 33], ['Hall', 15.6, 43], ['Kids', 24, 30.15], ['Stairs', 5.1, 30.7]];
    for (const [label, x, z] of mapLabels) {
      context.strokeText(label, mapX(x), mapZ(z));
      context.fillText(label, mapX(x), mapZ(z));
    }
    context.strokeStyle = '#2475a1';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(mapX(walkPosition.x), mapZ(walkPosition.z));
    for (const point of walkPath) context.lineTo(mapX(point.x), mapZ(point.z));
    context.stroke();
    if (walkPath.length) {
      const goal = walkPath[walkPath.length - 1];
      context.beginPath();
      context.arc(mapX(goal.x), mapZ(goal.z), 4, 0, Math.PI * 2);
      context.stroke();
    }
    context.save();
    context.translate(mapX(walkPosition.x), mapZ(walkPosition.z));
    context.rotate(-walkYaw);
    context.fillStyle = '#2475a1';
    context.beginPath();
    context.moveTo(0, -7);
    context.lineTo(-5, 5);
    context.lineTo(5, 5);
    context.closePath();
    context.fill();
    context.restore();
    if (tourMapCursor) {
      context.strokeStyle = '#a15d25';
      context.beginPath();
      context.arc(mapX(tourMapCursor.x), mapZ(tourMapCursor.z), 5, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function walkSegmentClear(from, to) {
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.1));
    for (let step = 1; step <= steps; step++) {
      const fraction = step / steps;
      if (!canWalkAt(from.x + (to.x - from.x) * fraction, from.z + (to.z - from.z) * fraction)) return false;
    }
    return true;
  }

  function findWalkPath(goal) {
    if (!canWalkAt(goal.x, goal.z)) return null;
    if (walkSegmentClear(walkPosition, goal)) return [goal];
    if (!tourGrid) {
      const width = Math.ceil((tourMapBounds.right - tourMapBounds.x) / tourGridStep) + 1;
      const height = Math.ceil((tourMapBounds.bottom - tourMapBounds.z) / tourGridStep) + 1;
      const cells = new Uint8Array(width * height);
      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) cells[row * width + col] = Number(canWalkAt(tourMapBounds.x + col * tourGridStep, tourMapBounds.z + row * tourGridStep));
      }
      tourGrid = { width, height, cells };
    }
    const { width, height, cells } = tourGrid;
    const pointAt = (index) => ({ x: tourMapBounds.x + index % width * tourGridStep, z: tourMapBounds.z + Math.floor(index / width) * tourGridStep });
    const nearestCell = (point) => {
      const col = Math.round((point.x - tourMapBounds.x) / tourGridStep);
      const row = Math.round((point.z - tourMapBounds.z) / tourGridStep);
      let nearest = -1;
      let distance = Infinity;
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (col + dx < 0 || col + dx >= width || row + dz < 0 || row + dz >= height) continue;
          const index = (row + dz) * width + col + dx;
          if (!cells[index]) continue;
          const candidate = pointAt(index);
          const length = Math.hypot(candidate.x - point.x, candidate.z - point.z);
          if (length < distance && walkSegmentClear(point, candidate)) {
            nearest = index;
            distance = length;
          }
        }
      }
      return nearest;
    };
    const start = nearestCell(walkPosition);
    const end = nearestCell(goal);
    if (start < 0 || end < 0) return null;
    const previous = new Int32Array(cells.length).fill(-1);
    const queue = new Int32Array(cells.length);
    let head = 0;
    let tail = 1;
    queue[0] = start;
    previous[start] = start;
    while (head < tail && previous[end] < 0) {
      const index = queue[head++];
      const col = index % width;
      const row = Math.floor(index / width);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nextCol = col + dx;
        const nextRow = row + dz;
        if (nextCol < 0 || nextCol >= width || nextRow < 0 || nextRow >= height) continue;
        const next = nextRow * width + nextCol;
        if (!cells[next] || previous[next] >= 0 || !walkSegmentClear(pointAt(index), pointAt(next))) continue;
        previous[next] = index;
        queue[tail++] = next;
      }
    }
    if (previous[end] < 0) return null;
    const points = [goal];
    for (let index = end; index !== start; index = previous[index]) points.push(pointAt(index));
    points.push(pointAt(start));
    points.reverse();
    const path = [];
    let anchor = walkPosition;
    for (let index = 0; index < points.length; index++) {
      while (index + 1 < points.length && walkSegmentClear(anchor, points[index + 1])) index++;
      path.push(points[index]);
      anchor = points[index];
    }
    return path;
  }

  function stopTourTravel() {
    walkPath.length = 0;
    tourDestination.visible = false;
    avatarLimbs.forEach(({ pivot }) => { pivot.rotation.x = 0; });
    drawTourMap();
  }

  function travelTo(x, z) {
    if (navigationMode !== 'walk') return;
    clearWalkInput();
    render();
    const goal = { x, z };
    if (!canWalkAt(x, z)) {
      setTourStatus('Choose a clear floor area.', true);
      return;
    }
    if (Math.hypot(x - walkPosition.x, z - walkPosition.z) < 0.05) {
      setTourStatus('Already here.');
      return;
    }
    const path = findWalkPath(goal);
    if (!path) {
      setTourStatus('No clear route to that spot.', true);
      return;
    }
    walkPath.splice(0, walkPath.length, ...path);
    tourDestination.position.set(x, walkElevationAt(x, z) + 0.12, z);
    tourDestination.visible = true;
    setTourStatus('Moving.');
    drawTourMap();
  }

  function updateWalkCamera() {
    tourAvatar.position.copy(walkPosition);
    const target = walkPosition.clone().add(new THREE.Vector3(0, 2.7, 0));
    const offset = new THREE.Vector3(Math.sin(walkYaw) * 9, 5 - Math.sin(walkPitch) * 9, Math.cos(walkYaw) * 9);
    const distance = offset.length();
    const direction = offset.normalize();
    const ray = new THREE.Ray(target, direction);
    let clearDistance = distance;
    for (const bounds of walkCameraObstacles) {
      const hit = ray.intersectBox(bounds, new THREE.Vector3());
      if (hit) clearDistance = Math.min(clearDistance, Math.max(0.05, target.distanceTo(hit) - 0.2));
    }
    camera.position.copy(target).addScaledVector(direction, clearDistance);
    camera.lookAt(target);
    tourAvatar.visible = clearDistance > 4;
    const fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(2 * Math.atan(5.4 / clearDistance)), 65, 95);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
    drawTourMap();
    render();
  }

  function clearWalkInput() {
    walkKeys.clear();
    if (walkPath.length) setTourStatus('Paused.');
    const pointerId = walkDrag?.id;
    walkDrag = null;
    if (pointerId !== undefined && renderer.domElement.hasPointerCapture(pointerId)) renderer.domElement.releasePointerCapture(pointerId);
    stopTourTravel();
    walkLastTime = null;
    if (navigationMode === 'walk' && !renderer.getContext().isContextLost()) render();
  }

  function startWalking(requestedStart) {
    const starts = {
      upstairs: [...upstairs.start, 16.5, 23], 'upstairs-top': [...upstairs.start, 16.5, 23],
      whole: [15.6, 50, 15.6, 42], top: [15.6, 50, 15.6, 42], social: [20, 18, 20, 3],
      living: [14.8, 23.9, 5, 16], kids: [20.1, 29, 23.5, 29.6], dining: [23, 7, 19.8, 2.6], kitchen: [33, 19.5, 32.25, 8],
      cooktop: [33, cooktopCenterZ, 37, cooktopCenterZ], fridge: [33, 23, 33, 26.9], island: [33, kitchenCenterZ, 28.65, kitchenCenterZ],
      prep: [43, 12, 48, prepCounterZ], pantry: [47, 12, 47, 14.15], 'prep-counter': [47, 12, 47, prepCounterZ],
      private: [15.6, 46, 15.6, 41], basement: [11.5, 33, 5, 30], garage: [43, 29, 43, 38]
    };
    const [x, z, lookX, lookZ] = starts[currentView];
    buildWalkObstacles();
    const start = requestedStart ? (canWalkAt(...requestedStart) ? requestedStart : null) : findWalkStart(x, z);
    if (!start) {
      if (!requestedStart) console.error(`No clear tour start was found for the ${currentView} view.`);
      setTourStatus('Choose a clear floor area.', true);
      return false;
    }
    const startingYaw = requestedStart
      ? Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z)
      : Math.atan2(start[0] - lookX, start[1] - lookZ);
    orbitSnapshot = { view: currentView, navigationMode, position: camera.position.clone(), target: controls.target.clone(), zoom: camera.zoom, fov: perspectiveCamera.fov };
    setView(activeFloor === 'upstairs' ? 'upstairs' : 'whole');
    currentView = 'walk';
    camera = perspectiveCamera;
    controls.object = camera;
    camera.fov = 65;
    camera.aspect = viewport.clientWidth / viewport.clientHeight;
    camera.updateProjectionMatrix();
    walkPosition.set(start[0], walkElevationAt(start[0], start[1]), start[1]);
    walkYaw = startingYaw;
    walkPitch = 0;
    clearWalkInput();
    viewButtons.forEach((button) => button.setAttribute('aria-pressed', 'false'));
    tourMapCursor = { x: start[0], z: start[1] };
    renderer.domElement.setAttribute('aria-label', `3D ${activeFloor === 'upstairs' ? 'upstairs' : 'ground floor'}: third-person click-to-move tour`);
    tourAvatar.rotation.y = walkYaw;
    updateWalkCamera();
    walkFrame = requestAnimationFrame(animateWalk);
    return true;
  }

  function stopWalking() {
    cancelAnimationFrame(walkFrame);
    clearWalkInput();
    tourAvatar.visible = false;
    perspectiveCamera.fov = orbitSnapshot.fov;
    setView(orbitSnapshot.view);
    camera.position.copy(orbitSnapshot.position);
    camera.zoom = orbitSnapshot.zoom;
    camera.updateProjectionMatrix();
    controls.target.copy(orbitSnapshot.target);
    controls.update();
    render();
  }

  function moveWalking(actions, delta) {
    const forward = Number(actions.has('forward')) - Number(actions.has('backward'));
    const sideways = Number(actions.has('right')) - Number(actions.has('left'));
    const turning = Number(actions.has('turn-left')) - Number(actions.has('turn-right'));
    walkYaw += turning * delta * 1.4;
    const length = Math.hypot(forward, sideways);
    if (length) {
      const distance = walkSpeed * delta / length;
      const dx = (-Math.sin(walkYaw) * forward + Math.cos(walkYaw) * sideways) * distance;
      const dz = (-Math.cos(walkYaw) * forward - Math.sin(walkYaw) * sideways) * distance;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.1));
      for (let step = 0; step < steps; step++) {
        if (canWalkAt(walkPosition.x + dx / steps, walkPosition.z)) walkPosition.x += dx / steps;
        if (canWalkAt(walkPosition.x, walkPosition.z + dz / steps)) walkPosition.z += dz / steps;
      }
      walkPosition.y = walkElevationAt(walkPosition.x, walkPosition.z);
      tourAvatar.rotation.y = Math.atan2(-dx, -dz);
    }
    if (length || turning) updateWalkCamera();
  }

  function animateWalk(time) {
    if (navigationMode !== 'walk') return;
    const delta = walkLastTime === null ? 0 : Math.min((time - walkLastTime) / 1000, 0.1);
    walkLastTime = time;
    const actions = new Set([...walkKeys].map((key) => walkKeyActions[key]));
    moveWalking(actions, delta);
    let distance = walkSpeed * delta;
    let moved = false;
    let blocked = false;
    let heading = walkYaw;
    while (walkPath.length && distance > 0) {
      const goal = walkPath[0];
      const dx = goal.x - walkPosition.x;
      const dz = goal.z - walkPosition.z;
      const length = Math.hypot(dx, dz);
      if (length < 0.001) {
        walkPosition.set(goal.x, walkElevationAt(goal.x, goal.z), goal.z);
        walkPath.shift();
        moved = true;
        continue;
      }
      const step = Math.min(length, distance, 0.1);
      const next = { x: walkPosition.x + dx / length * step, z: walkPosition.z + dz / length * step };
      if (!canWalkAt(next.x, next.z)) {
        stopTourTravel();
        setTourStatus('Route blocked. Choose another spot.', true);
        blocked = true;
        break;
      }
      walkPosition.set(next.x, walkElevationAt(next.x, next.z), next.z);
      heading = Math.atan2(-dx, -dz);
      tourAvatar.rotation.y = heading;
      distance -= step;
      avatarStride += step * 5;
      moved = true;
      if (length <= step + 0.001) walkPath.shift();
    }
    if (moved) {
      const turn = Math.atan2(Math.sin(heading - walkYaw), Math.cos(heading - walkYaw));
      walkYaw += turn * (1 - Math.exp(-delta * 8));
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      avatarLimbs.forEach(({ pivot, direction }) => { pivot.rotation.x = reducedMotion || !walkPath.length ? 0 : Math.sin(avatarStride) * 0.3 * direction; });
      if (!walkPath.length && !blocked) {
        tourDestination.visible = false;
        setTourStatus('Arrived.');
      }
      updateWalkCamera();
    }
    walkFrame = requestAnimationFrame(animateWalk);
  }

  function pickTourFloor(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) return;
    tourRaycaster.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2), camera);
    const hit = tourRaycaster.intersectObjects(scene.children, true).find(({ object }) => {
      for (let parent = object; parent; parent = parent.parent) if (!parent.visible || parent.userData.tourDecoration) return false;
      return true;
    });
    const elevation = hit ? walkElevationAt(hit.point.x, hit.point.z) : null;
    if (!hit || elevation === null || Math.abs(hit.point.y - elevation) > 0.1 || !hit.face || hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y < 0.5) {
      if (navigationMode === 'walk') clearWalkInput();
      setTourStatus('Choose a clear floor area.', true);
      return;
    }
    if (navigationMode === 'walk') travelTo(hit.point.x, hit.point.z);
    else setNavigationMode('walk', [hit.point.x, hit.point.z]);
  }

  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (activeFloor === 'exterior') return;
    if (walkDrag) {
      walkDrag.moved = true;
      return;
    }
    if (event.button !== 0 || !event.isPrimary) return;
    walkDrag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false };
    if (navigationMode === 'walk') {
      event.preventDefault();
      viewport.focus({ preventScroll: true });
      renderer.domElement.setPointerCapture(event.pointerId);
    }
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (!walkDrag || walkDrag.id !== event.pointerId) return;
    const moved = Math.hypot(event.clientX - walkDrag.startX, event.clientY - walkDrag.startY) > 6;
    if (moved && !walkDrag.moved && navigationMode === 'walk') {
      stopTourTravel();
      setTourStatus('Paused.');
    }
    walkDrag.moved ||= moved;
    if (navigationMode !== 'walk' || !walkDrag.moved) return;
    walkYaw -= (event.clientX - walkDrag.x) * 0.004;
    walkPitch = THREE.MathUtils.clamp(walkPitch - (event.clientY - walkDrag.y) * 0.003, -0.8, 0.25);
    walkDrag.x = event.clientX;
    walkDrag.y = event.clientY;
    updateWalkCamera();
  });
  renderer.domElement.addEventListener('pointerup', (event) => {
    if (walkDrag?.id !== event.pointerId) return;
    const tap = !walkDrag.moved && Math.hypot(event.clientX - walkDrag.startX, event.clientY - walkDrag.startY) <= 6;
    walkDrag = null;
    if (tap) pickTourFloor(event);
  });
  for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    renderer.domElement.addEventListener(eventName, (event) => {
      if (walkDrag?.id === event.pointerId) walkDrag = null;
    });
  }
  tourMap.addEventListener('click', (event) => {
    const bounds = tourMap.getBoundingClientRect();
    const x = tourMapBounds.x + ((event.clientX - bounds.left) * tourMap.width / bounds.width - 12) / tourMapScale;
    const z = tourMapBounds.z + ((event.clientY - bounds.top) * tourMap.height / bounds.height - 12) / tourMapScale;
    tourMapCursor = { x, z };
    travelTo(x, z);
  });
  tourMap.addEventListener('keydown', (event) => {
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (directions[event.key]) {
      const [dx, dz] = directions[event.key];
      tourMapCursor.x = THREE.MathUtils.clamp(tourMapCursor.x + dx, tourMapBounds.x, tourMapBounds.right);
      tourMapCursor.z = THREE.MathUtils.clamp(tourMapCursor.z + dz, tourMapBounds.z, tourMapBounds.bottom);
      drawTourMap();
      setTourStatus(`Plan cursor: ${tourMapCursor.x.toFixed(1)} ft across, ${tourMapCursor.z.toFixed(1)} ft down. Press Enter to travel.`);
    } else if (event.key === 'Enter' || event.key === ' ') travelTo(tourMapCursor.x, tourMapCursor.z);
    else return;
    event.preventDefault();
  });
  window.addEventListener('keydown', (event) => {
    if (navigationMode !== 'walk') return;
    if (event.key === 'Escape') setNavigationMode(orbitSnapshot.navigationMode);
    else if (event.key === 'Home' && viewport.contains(document.activeElement)) {
      setView('whole');
    } else return;
    viewport.focus({ preventScroll: true });
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => walkKeys.delete(event.code));
  window.addEventListener('blur', clearWalkInput);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearWalkInput();
  });
  viewport.addEventListener('focusout', (event) => {
    if (!viewport.contains(event.relatedTarget)) clearWalkInput();
  });

  function updatePendantVisibility() {
    const showPendants = activeFloor === 'ground' && !groundLayoutPreview && currentView !== 'top' && currentView !== 'fridge' && currentView !== 'cooktop';
    islandPendants.visible = showPendants && islandLightsInput.checked;
  }

  function setView(name) {
    if (navigationMode === 'walk') setNavigationMode('rotate');
    const outside = name === 'exterior' || name.startsWith('exterior-');
    const floor = outside ? 'exterior' : name === 'upstairs' || name === 'upstairs-top' ? 'upstairs' : 'ground';
    if (activeFloor !== 'ground' && floor !== activeFloor) selectFloor('ground');
    selectFloor(floor);
    currentView = name;
    const prepElevationView = name === 'pantry' || name === 'prep-counter';
    const exteriorElevation = outside && !['exterior', 'exterior-patio'].includes(name);
    const elevationView = name === 'fridge' || name === 'cooktop' || prepElevationView || exteriorElevation;
    controls.minDistance = prepElevationView ? 1 : 12;
    controls.maxPolarAngle = elevationView ? Math.PI / 2 : Math.PI / 2.12;
    const preset = presets[name];
    const aspect = viewport.clientWidth / viewport.clientHeight;
    const offset = new THREE.Vector3(...preset.offset);
    const portraitPadding = aspect < 1 ? 1.25 : 1;
    camera = name === 'cooktop' || prepElevationView || exteriorElevation ? cooktopElevationCamera : perspectiveCamera;
    controls.object = camera;
    camera.zoom = 1;
    if (camera.isOrthographicCamera) {
      const exteriorWidth = name === 'exterior-site' || name === 'exterior-security' ? 128 : name === 'exterior-west' || name === 'exterior-east' ? 74 : 66;
      const halfHeight = exteriorElevation ? Math.max(preset.span / 2, exteriorWidth / (2 * aspect)) : preset.span * portraitPadding / (2 * Math.min(aspect, 1));
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
    const basementCutaway = name === 'basement';
    if (outside) {
      for (const object of groundModelRoots) object.visible = false;
      upstairs.group.visible = false;
    } else if (activeFloor === 'upstairs') {
      for (const object of groundModelRoots) object.visible = object === stairs;
      basementStairs.visible = false;
      for (const part of upstairsStairParts) part.visible = true;
    } else {
      const showWholeFloor = !['social', 'living', 'dining', 'kitchen', 'cooktop', 'island', 'fridge'].includes(name);
      shell.visible = showWholeFloor && !basementCutaway;
      stairs.visible = showWholeFloor || ['kitchen', 'fridge'].includes(name);
      for (const part of upstairsStairParts) part.visible = !basementCutaway;
      island.visible = !elevationView;
      cooktopHood.visible = name !== 'fridge';
      updatePendantVisibility();
      for (const accessory of [cuttingBoard, utensilCrock, seasoningTray]) accessory.visible = name !== 'cooktop';
    }
    exterior.getObjectByName('Lot plan annotations').visible = name === 'exterior-site' || name === 'exterior-security';
    exterior.getObjectByName('Security plan annotations').visible = name === 'exterior-security';
    document.getElementById('security-plan-key').hidden = name !== 'exterior-security';
    viewButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.view === name || (button.closest('.model-toolbar') && button.dataset.view === 'exterior' && outside) || (['upstairs', 'top'].includes(button.dataset.view) && name === 'upstairs-top')));
    });
    document.querySelectorAll('.furniture-card').forEach((card) => {
      card.classList.toggle('selected', card.dataset.room === name);
    });
    const exteriorLabel = name === 'exterior-security' ? 'camera directions and warm outdoor lighting plan, coverage unverified' : name === 'exterior-site' ? '75 by 130 ft lot plan with 30 ft rear-wall setback' : name === 'exterior-patio' ? 'covered kitchen-dining patio' : exteriorElevation ? name.slice(9) + ' elevation' : 'perspective view';
    if (groundLayoutPreview && activeFloor === 'ground') {
      for (const object of originalGroundRoots) object.visible = object === stairs;
      groundLayoutPreview.group.visible = true;
      document.getElementById('floor-caption').textContent = 'FIRST FLOOR - EDITED STRUCTURE ONLY';
      viewport.setAttribute('aria-label', 'Edited first-floor structure only. Drag to rotate or move; scroll or pinch to zoom. Tours are unavailable.');
    } else if (activeFloor === 'ground') {
      document.getElementById('floor-caption').textContent = 'GROUND FLOOR';
      viewport.setAttribute('aria-label', `3D ground floor. Click the floor to enter the tour. Drag to ${navigationMode === 'move' ? 'move' : 'rotate'}; scroll or pinch to zoom.`);
    }
    document.querySelector('.model-footer span').lastChild.textContent = groundLayoutPreview && activeFloor === 'ground' ? ' Structure-only concept' : ' Furnished concept';
    renderer.domElement.setAttribute('aria-label', outside ? `3D English-country exterior concept: ${exteriorLabel}, provisional stone facade and roof` : basementCutaway ? '3D floor plan: basement stair cutaway, surrounding shell and upstairs stairs hidden' : `3D floor plan: ${name === 'social' ? 'living, dining and kitchen' : name} view, full-height walls`);
    render();
  }

  viewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setView(button.dataset.view === 'top' && activeFloor === 'upstairs' ? 'upstairs-top' : button.dataset.view);
      if (button.closest('.furniture-card')) viewport.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
  });
  islandLightsInput.addEventListener('change', () => {
    updatePendantVisibility();
    render();
  });
  resetButton.disabled = false;
  resetButton.addEventListener('click', () => {
    setView('whole');
  });
  viewport.addEventListener('keydown', (event) => {
    if (event.target !== viewport) return;
    if (navigationMode === 'walk' && event.key !== 'Home') {
      if (!event.altKey && !event.ctrlKey && !event.metaKey && walkKeyActions[event.code]) {
        stopTourTravel();
        walkKeys.add(event.code);
        setTourStatus('Keyboard navigation.');
      }
      else return;
      event.preventDefault();
      return;
    }
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
    cancelAnimationFrame(walkFrame);
    clearWalkInput();
    console.error('The 3D floor plan lost its WebGL context.');
    showModelError('The 3D renderer lost its graphics connection. Reload this page to try again.');
  });
  function resize() {
    if (!viewport.clientWidth || !viewport.clientHeight) return;
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    if (navigationMode === 'walk') {
      camera.aspect = viewport.clientWidth / viewport.clientHeight;
      camera.updateProjectionMatrix();
      render();
    } else setView(currentView);
  }
  function render() {
    renderer.render(scene, camera);
  }
  function applyLivingLayout(layout, showLiving = true) {
    if (navigationMode === 'walk') setNavigationMode('rotate');
    if (activeFloor !== 'ground') setView('living');
    function place(object, placement) {
      object.visible = placement !== null;
      object.traverse((part) => { part.userData.livingLayoutHidden = !object.visible; });
      if (!placement) return;
      object.position.set(placement[0], 0, placement[1]);
      if (placement.length === 3) object.rotation.y = placement[2];
    }
    place(sofa, layout.sofa);
    loungeChairs.forEach((chair, index) => place(chair, layout.chairs[index]));
    [cornerOttoman, readingOttoman].forEach((ottoman, index) => {
      ottoman.visible = layout.id === 'centered' && loungeChairs[index].visible;
      ottoman.traverse((part) => { part.userData.livingLayoutHidden = !ottoman.visible; });
    });
    document.querySelectorAll('button[data-living-layout]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.livingLayout === layout.id));
    });
    document.getElementById('living-layout-status').textContent = `${layout.title}${layout.recommended ? ' — current direction' : ''}. ${layout.note}`;
    viewport.dataset.livingLayout = layout.id;
    buildWalkObstacles();
    if (showLiving) setView('living');
  }

  function livingPlan(layout) {
    const namespace = 'http://www.w3.org/2000/svg';
    function element(parent, tag, attributes) {
      const node = document.createElementNS(namespace, tag);
      for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
      parent.append(node);
      return node;
    }
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('viewBox', `0 0 332 ${(livingFeatureWall.wallEndZ - 8) * 10 + 20}`);
    svg.setAttribute('aria-hidden', 'true');
    const plan = element(svg, 'g', { transform: 'translate(10 10) scale(10)', stroke: '#6d675b', 'stroke-width': 0.06 });
    element(plan, 'rect', { x: 0, y: 0, width: 31.2, height: livingFeatureWall.wallEndZ - 8, fill: '#eee3cf' });
    element(plan, 'rect', { x: 0.02, y: livingCenterZ - 3 - 8, width: 1.36, height: 6, fill: '#82715f' });
    for (const cabinet of mediaBuiltIns) {
      element(plan, 'rect', { x: cabinet.position.x - mediaDepth / 2, y: cabinet.position.z - mediaWidth / 2 - 8, width: mediaDepth, height: mediaWidth, fill: '#c6ad87', 'data-media-built-in': 'true' });
    }
    for (const center of livingWindowCenters) element(plan, 'line', { x1: 0, x2: 0, y1: center - 10, y2: center - 6, stroke: '#729ba6', 'stroke-width': 0.2 });
    for (const { center, width } of livingSideWindows) element(plan, 'line', { x1: center - width / 2, x2: center + width / 2, y1: 0, y2: 0, stroke: '#729ba6', 'stroke-width': 0.2 });
    const islandCenterX = 30.65 + island.position.x;
    element(plan, 'rect', { x: islandCenterX - island.userData.width / 2, y: kitchenCenterZ - 8 - island.userData.length / 2, width: island.userData.width, height: island.userData.length, fill: '#e3ddcf' });
    element(plan, 'text', { x: islandCenterX, y: kitchenCenterZ - 8, 'font-size': 0.65, 'text-anchor': 'middle', stroke: 'none', fill: '#6d675b' }).textContent = 'Island';
    function seat(placement, width, depth) {
      if (!placement) return;
      const group = element(plan, 'g', { transform: `translate(${placement[0]} ${placement[1] - 8}) rotate(${-placement[2] * 180 / Math.PI})` });
      element(group, 'rect', { x: -width / 2, y: -depth / 2, width, height: depth, rx: 0.12, fill: '#b88558' });
      element(group, 'line', { x1: -width / 2 + 0.12, x2: width / 2 - 0.12, y1: -depth / 2 + 0.14, y2: -depth / 2 + 0.14, stroke: '#68452e', 'stroke-width': 0.16 });
    }
    seat(layout.sofa, 105 / 12, 46 / 12);
    layout.chairs.forEach((placement) => seat(placement, 34 / 12, 34.5 / 12));
    if (layout.id === 'centered') {
      [cornerOttoman, readingOttoman].forEach((ottoman, index) => {
        const [x, z, rotation] = layout.chairs[index];
        const group = element(plan, 'g', { transform: `translate(${x} ${z - 8}) rotate(${-rotation * 180 / Math.PI})` });
        element(group, 'rect', { x: -ottoman.userData.widthInches / 24, y: ottoman.position.z - ottoman.userData.depthInches / 24, width: ottoman.userData.widthInches / 12, height: ottoman.userData.depthInches / 12, rx: 0.12, fill: '#b88558', 'data-lounge-ottoman': 'true' });
      });
    }
    return svg;
  }

  const layoutOptions = document.getElementById('living-layout-options');
  for (const layout of livingLayouts) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'living-layout-option';
    button.dataset.livingLayout = layout.id;
    button.setAttribute('aria-pressed', 'false');
    button.append(livingPlan(layout));
    const title = document.createElement('strong');
    title.textContent = `${layout.title}${layout.recommended ? ' · Current direction' : ''}`;
    const note = document.createElement('span');
    note.textContent = layout.note;
    button.append(title, note);
    button.addEventListener('click', () => {
      applyLivingLayout(layout);
      viewport.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    layoutOptions.append(button);
  }
  applyLivingLayout(livingLayouts[0], false);
  const initialView = new URLSearchParams(window.location.search).get('view');
  if (initialView && Object.hasOwn(presets, initialView)) currentView = initialView;
  new ResizeObserver(resize).observe(viewport);
  resize();
  message.hidden = true;
  viewport.dataset.ready = 'true';
  function previewGround(edits) {
    if (navigationMode === 'walk') setNavigationMode('rotate');
    const replacement = edits.rooms.length || edits.walls.length ? buildGroundLayoutPreview(THREE, groundBaseline, edits) : null;
    if (activeFloor !== 'ground') selectFloor('ground');
    if (groundLayoutPreview) {
      scene.remove(groundLayoutPreview.group);
      groundModelRoots.splice(groundModelRoots.indexOf(groundLayoutPreview.group), 1);
      groundLayoutPreview.dispose();
    }
    groundLayoutPreview = replacement;
    for (const object of originalGroundRoots) object.visible = true;
    if (replacement) {
      scene.add(replacement.group);
      groundModelRoots.push(replacement.group);
    }
    const status = document.getElementById('ground-preview-status');
    status.hidden = !replacement;
    status.textContent = replacement ? 'Edited first-floor structure only: floors, walls and openings follow your layout. Furniture, cabinetry, fixtures and tours are hidden, not coordinated. Stairs stay fixed; upstairs and exterior remain the original concepts. Reset the layout to return to the furnished model.' : '';
    const dimensions = document.getElementById('room-dimension-summary');
    for (const item of dimensions.querySelectorAll('li:not([data-floor="upstairs"])')) item.remove();
    if (replacement) {
      for (const room of replacement.plan.rooms) roomDimensions(room.name, room.w, room.d);
    } else {
      dimensions.append(...originalGroundDimensions.map((item) => item.cloneNode(true)));
    }
    const plan = replacement?.plan ?? groundBaseline;
    const left = Math.min(...plan.floors.map((item) => item.x), ...plan.walls.map((item) => item.x1));
    const right = Math.max(...plan.floors.map((item) => item.x + item.w), ...plan.walls.map((item) => item.x2));
    const top = Math.min(...plan.floors.map((item) => item.z), ...plan.walls.map((item) => item.z1));
    const bottom = Math.max(...plan.floors.map((item) => item.z + item.d), ...plan.walls.map((item) => item.z2));
    for (const name of ['whole', 'top']) {
      presets[name].target = replacement ? [(left + right) / 2, 0, (top + bottom) / 2] : [27, 0, 29];
      presets[name].span = replacement ? Math.max(right - left, bottom - top) + 10 : name === 'whole' ? 78 : 72;
    }
    setView('whole');
    document.querySelector('[data-navigation="walk"]').disabled = Boolean(replacement);
  }
  const groundPanel = document.getElementById('upstairs-designer').cloneNode(true);
  groundPanel.querySelectorAll('[id]').forEach((node) => { node.id = node.id.startsWith('upstairs-') ? node.id.replace('upstairs-', 'ground-') : `ground-${node.id}`; });
  groundPanel.id = 'ground-designer';
  groundPanel.setAttribute('aria-labelledby', 'ground-designer-title');
  groundPanel.querySelector('h2').textContent = 'First-floor designer';
  groundPanel.querySelector('svg').setAttribute('aria-label', 'Editable first-floor plan. Use the object selector and dimension fields for keyboard editing.');
  groundPanel.querySelectorAll('a').forEach((link) => { link.href = 'floor-plan-design.html#first-floor-designer'; });
  groundPanel.querySelector('.designer-inspector p').textContent = 'Shared edges and connected wall endpoints follow edits. Window/door widths stay fixed. Stairs are locked. Edited 3D previews show structure only; furniture, cabinetry, fixtures, tours, upstairs and exterior are not coordinated.';
  document.getElementById('upstairs-designer').after(groundPanel);
  const groundStatus = document.createElement('p');
  groundStatus.id = 'ground-preview-status';
  groundStatus.className = 'designer-status';
  groundStatus.setAttribute('role', 'status');
  groundStatus.hidden = true;
  groundPanel.before(groundStatus);
  UpstairsLayout.resolve(groundBaseline, savedGroundLayout);
  if (savedGroundLayout.rooms.length || savedGroundLayout.walls.length) {
    previewGround(savedGroundLayout);
    if (initialView && Object.hasOwn(presets, initialView)) setView(initialView);
  }
  if (window.location.protocol !== 'file:') {
    createUpstairsDesigner({
      floor: 'ground',
      baseline: groundBaseline,
      initialDocument: savedGroundLayout,
      enter() { if (navigationMode === 'walk') setNavigationMode('rotate'); },
      preview: previewGround
    });
    document.getElementById('ground-designer-open').disabled = false;
    createUpstairsDesigner({
      baseline: upstairs.baseline,
      initialDocument: savedUpstairsLayout,
      enter() {
        if (navigationMode === 'walk') setNavigationMode('rotate');
      },
      preview(edits) {
        if (navigationMode === 'walk') setNavigationMode('rotate');
        const replacement = buildUpstairsModel(THREE, upstairsHelpers, stairOpening, stairFloorToFloor, edits);
        const previous = upstairs;
        scene.remove(previous.group);
        const previousParts = new Set();
        previous.group.traverse((object) => previousParts.add(object));
        for (let i = walls.length - 1; i >= 0; i--) if (previousParts.has(walls[i])) walls.splice(i, 1);
        previous.dispose();
        upstairs = replacement;
        scene.add(upstairs.group);
        fitEditedUpstairs(edits);
        refreshUpstairsDimensions();
        if (activeFloor !== 'ground') selectFloor('ground');
        setView('upstairs');
        buildWalkObstacles();
      }
    });
    document.getElementById('upstairs-designer-open').disabled = false;
    if (new URLSearchParams(window.location.search).get('designer') === 'ground') document.getElementById('ground-designer-open').click();
  }
  islandLightsInput.disabled = false;
  navigationButtons.forEach((button) => { button.disabled = button.dataset.navigation === 'walk' && (activeFloor === 'exterior' || (activeFloor === 'ground' && Boolean(groundLayoutPreview))); });
}
