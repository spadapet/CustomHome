const viewport = document.getElementById('model-viewport');
const message = viewport.querySelector('.model-message');
const viewButtons = document.querySelectorAll('[data-view]');
const wallButton = document.querySelector('.wall-toggle');
const resetButton = document.getElementById('reset-view');
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

function showModelError(text) {
  message.replaceChildren(document.createTextNode(text));
  const link = document.createElement('a');
  link.href = 'assets/ground-floor-3d-source.png';
  link.textContent = 'View your original floor plan instead';
  message.append(link);
  message.hidden = false;
  viewButtons.forEach((button) => { button.disabled = true; });
  wallButton.disabled = true;
  resetButton.disabled = true;
  navigationButtons.forEach((button) => { button.disabled = true; });
}

function buildPreview(THREE, OrbitControls, RoundedBoxGeometry) {
  // Model coordinates are feet; the supplied raster is a concept trace, not CAD.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eeeee6');
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
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

  function woodTexture() {
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
    const rowHeight = canvas.height / plankRows;
    ctx.fillStyle = '#88704e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let row = 0; row < plankRows; row++) {
      const y = row * rowHeight;
      let x = -random() * 420;
      while (x < canvas.width) {
        const length = (4 + random() * 4) / woodTileWidth * canvas.width;
        const lightness = 42 + random() * 3;
        const hue = 33 + random() * 3;
        const wash = ctx.createLinearGradient(0, y, 0, y + rowHeight);
        wash.addColorStop(0, `hsl(${hue}, 29%, ${lightness - 0.8}%)`);
        wash.addColorStop(0.45, `hsl(${hue}, 28%, ${lightness + 0.6}%)`);
        wash.addColorStop(1, `hsl(${hue}, 29%, ${lightness - 0.4}%)`);
        ctx.fillStyle = wash;
        ctx.fillRect(x, y, length - 0.7, rowHeight - 0.6);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, length - 0.7, rowHeight - 0.6);
        ctx.clip();
        const knotX = length * (0.2 + random() * 0.6);
        const knotY = rowHeight * (0.25 + random() * 0.5);
        const phase = random() * Math.PI * 2;
        const hasKnot = random() < 0.24;
        for (let line = 0; line < 85; line++) {
          const lane = random() * rowHeight;
          const distance = lane - knotY;
          const bend = (distance < 0 ? -1 : 1) * Math.exp(-Math.abs(distance) / 13) * (hasKnot ? 10 : 4);
          ctx.strokeStyle = `rgba(69, 47, 25, ${0.025 + random() * 0.09})`;
          ctx.lineWidth = 0.45 + random() * 0.6;
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

  function floor(x, z, w, d, furnished = false, parent = shell) {
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

  function openingCasing(parent, x, bottom, width, height, faceDepth, side = 1, window = false) {
    const casing = new THREE.Group();
    casing.name = window ? 'Craftsman window casing' : 'Craftsman opening casing';
    casing.position.set(x, bottom, side * faceDepth);
    casing.rotation.y = side === -1 ? Math.PI : 0;
    casing.userData = { width, height, window, side, sideWidthInches: 3.5, headerHeightInches: 5.5 };
    parent.add(casing);
    const sideWidth = 3.5 / 12;
    const reveal = 0.125 / 12;
    const outerWidth = width + 2 * (sideWidth + reveal);
    function part(name, x, y, z, w, h, d) {
      const mesh = box(casing, x, y, z, w, h, d, windowTrim);
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
      part('White window projecting sill', 0, -0.5 / 12, 0.0625, outerWidth + 0.125, 1 / 12, 0.25);
      part('White window apron', 0, -1 / 12 - sideWidth / 2, 0.03125, outerWidth, sideWidth, 0.0625);
    }
  }

  function wall(x1, z1, x2, z2, furnished = false, openings = [], height = 10, trimSides = [-1, 1]) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const group = new THREE.Group();
    group.position.set(x1, 0, z1);
    group.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    (furnished ? scene : shell).add(group);
    function part(start, end, bottom, top) {
      if (end <= start || top <= bottom) return;
      const mesh = box(group, (start + end) / 2, (bottom + top) / 2, 0, end - start, top - bottom, 0.35, wallMaterial);
      mesh.name = 'House wall';
      mesh.userData = { bottom, top };
      walls.push(mesh);
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

  // Stepped footprint and room adjacencies follow the user's attached plan.
  floor(0, 8, 13.2, 17.7, true, scene);
  floor(13.2, -2.1, 13.3, 10.1, true, scene);
  floor(13.2, 8, 13.3, 17.7, true, scene);
  floor(26.5, 8, 11.5, 18.9, true, scene);
  floor(38, 8, 17.5, 7, true, scene);
  [
    [38, 15, 7.4, 11.9], [45.4, 15, 10.1, 11.9], [29, 26.9, 26.5, 7.7],
    [31.2, 34.6, 24.3, 14.4], [0, 25.7, 12.2, 10.4, true], [12.2, 25.7, 16.8, 8.9, true],
    [12.2, 34.6, 6.8, 19.6, true], [0, 36.1, 7.1, 4.9], [7.1, 38.5, 5.1, 2.5],
    [0, 41, 12.2, 13.2, true], [19, 34.6, 6, 7.4, true], [25, 34.6, 6.2, 4.6],
    [25, 39.2, 6.2, 2.8], [19, 42, 12.2, 12.2, true], [0, 54.2, 31.2, 7],
    [7.1, 36.1, 5.1, 2.4, true]
  ].forEach(([x, z, w, d, hardwood = false]) => floor(x, z, w, d, hardwood));

  [
    [0, 8, 13.2, 8, true, [[4.2, 9.2, 3, 8]]], [13.2, -2.1, 13.2, 8, true],
    [13.2, -2.1, 26.5, -2.1, true, [[3.65, 9.65, 3, 8]]],
    [26.5, -2.1, 26.5, 8, true, [[2.1, 8.1, 0, 8]], 10, [1]],
    [kitchenWallLeft, 8, kitchenWallRight, 8, true, [[kitchenSinkX - kitchenSinkWindowWidth / 2 - kitchenWallLeft, kitchenSinkX + kitchenSinkWindowWidth / 2 - kitchenWallLeft, 3.75, 7.25]]],
    [38, 8, 55.5, 8],
    [55.5, 8, 55.5, 49, false, [[36, 39, 0, 7]], 10, [1]], [55.5, 49, 31.2, 49, false, [[2.5, 11.5, 0, 8], [14, 23, 0, 8]], 10, [1]],
    [31.2, 49, 31.2, 54.2], [31.2, 54.2, 31.2, 61.2, false, [], 2.6], [31.2, 61.2, 0, 61.2, false, [], 2.6],
    [0, 61.2, 0, 54.2, false, [], 2.6], [0, 54.2, 0, 25.7, false, [[3.2, 7.2, 3, 8], [22.2, 26.2, 3, 8]]],
    [0, 25.7, 0, 8, true, [[1.7, 4.7, 2.6, 8.4], [13.3, 16.3, 2.6, 8.4]]],
    [0, 25.7, 13.2, 25.7, true, [[9, 13.2, 0, 7]]], [12.2, 25.7, 12.2, 36.1, false, [[0, 3, 0, 7]]], [0, 36.1, 7.1, 36.1, false, [[4, 6.8, 0, 7]]],
    [7.1, 36.1, 7.1, 38.5], [7.1, 38.5, 12.2, 38.5], [12.2, 38.5, 12.2, 54.2, false, [[5, 8.5, 0, 7]]],
    [0, 41, 12.2, 41], [0, 54.2, 31.2, 54.2, false, [[12.2, 19, 0, 7], [21.2, 28.8, 3, 8]], 10, [-1]],
    [19, 34.6, 19, 54.2, false, [[7.4, 10.4, 0, 7]]], [19, 34.6, 25, 34.6],
    [25, 34.6, 25, 42], [19, 42, 25, 42, false, [[1.4, 4.6, 0, 7]]], [25, 39.2, 31.2, 39.2, false, [[2, 4.7, 0, 7]]],
    [25, 34.6, 31.2, 34.6], [31.2, 34.6, 31.2, 49], [29, 26.9, 29, 34.6],
    [29, 26.9, 38, 26.9, true],
    [38, 8, 38, 26.9, true, [[2.725, 5.225, 0, 8], [13.175, 16.175, 0, 8]]], [38, 15, 55.5, 15, false, [[4, 7, 0, 7]]],
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
  box(fireplace, 0.28, 5, 16.8, 0.52, 10, 6, mortar).name = 'Fireplace stone backing';
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
  for (let row = 0; row < 20; row++) {
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
  box(fireplace, 0.28, 9.985, 16.8, 0.52, 0.03, 6, fireplaceStones[0]).name = 'Fireplace stone top cap';
  box(scene, 0.58, 2.4, 16.8, 0.12, 1.25, 4.6, black).name = 'Fireplace firebox';
  const ember = new THREE.MeshStandardMaterial({ color: '#c7793e', emissive: '#c65c20', emissiveIntensity: 1 });
  box(scene, 0.66, 2.12, 16.8, 0.06, 0.12, 4.1, ember);
  box(scene, 0.62, 5.8, 16.8, 0.15, 2.7, 4.6, black, true).name = 'Fireplace television';
  const glass = new THREE.MeshStandardMaterial({ color: '#b3cad0', roughness: 0.15, metalness: 0.15, transparent: true, opacity: 0.52 });
  function windowFrame(name, x, z, width, height, sill, rotation = 0, parent = scene, interiorSide = 1) {
    const frame = new THREE.Group();
    frame.name = name;
    frame.position.set(x, sill, z);
    frame.rotation.y = rotation;
    frame.userData = { interiorTrim: 'white', interiorSide };
    parent.add(frame);
    const frameMaterials = [black, black, black, black, interiorSide === 1 ? windowTrim : black, interiorSide === -1 ? windowTrim : black];
    for (const side of [-1, 1]) {
      box(frame, side * (width - 0.12) / 2, height / 2, 0, 0.12, height, 0.18, frameMaterials);
      box(frame, 0, side < 0 ? 0.06 : height - 0.06, 0, width, 0.12, 0.18, frameMaterials);
    }
    box(frame, 0, height / 2, 0, width - 0.24, height - 0.24, 0.06, glass);
    box(frame, 0, height / 2, interiorSide * 0.04, 0.07, height - 0.24, 0.08, frameMaterials);
    openingCasing(frame, 0, 0, width, height, 0.2, interiorSide, sill > 0);
  }
  windowFrame('Living side window', 6.7, 8.1, 5, 5, 3);
  windowFrame('Dining rear window', 19.85, -2, 6, 5, 3);
  const patioDoor = new THREE.Group();
  patioDoor.name = 'Dining picture window and outswing patio door';
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
  doorLeaf.name = 'Outward-opening hinged patio door';
  doorLeaf.position.x = -2.88;
  doorLeaf.rotation.y = Math.PI / 6;
  doorLeaf.userData = { outswing: true, openAngleDegrees: 30, nominalWidthFeet: 3 };
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
  cylinder(pendant, tableX, 7.4, tableZ, 0.025, 4.8, black);
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

  function drawerFront(x, z, width, rotation = 0, finish = oak, parent = kitchen) {
    const cabinet = new THREE.Group();
    cabinet.position.set(x, 0, z);
    cabinet.rotation.y = rotation;
    parent.add(cabinet);
    for (let row = 0; row < 3; row++) {
      box(cabinet, 0, 0.65 + row * 0.79, 0, width, 0.74, 0.08, finish, true);
      box(cabinet, 0, 0.87 + row * 0.79, 0.065, width * 0.55, 0.045, 0.045, black);
    }
  }

  for (const [x, width] of [[kitchenSinkX - 3.525, 4.05], [kitchenSinkX + 4.525, 2.05]]) box(kitchen, x, 1.44, 9.2, width, 2.85, 2, oak);
  for (const x of [kitchenSinkX - 3.525, kitchenSinkX + 3.525]) box(kitchen, x, 2.96, 9.2, 4.05, 0.18, 2.05, countertop, true).name = 'Top kitchen quartz counter';
  box(kitchen, kitchenSinkX, 1.1, 9.2, 3, 2, 2, oak);
  for (const [x, width] of [[kitchenSinkX - 4.25, 2.45], [kitchenSinkX + 4.525, 1.9]]) drawerFront(x, 10.23, width);
  const trash = new THREE.Group();
  trash.name = 'Pull-out trash left of sink';
  trash.position.set(kitchenSinkX - 2.25, 0, 9.2);
  kitchen.add(trash);
  box(trash, 0, 1.45, 1.055, 1.45, 2.65, 0.1, oak, true);
  box(trash, 0, 2.45, 1.13, 0.9, 0.06, 0.06, black);
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
    box(kitchen, x, 1.15, 10.23, 1.43, 1.8, 0.08, oak, true);
    box(kitchen, x + (x < kitchenSinkX ? 0.5 : -0.5), 1.65, 10.3, 0.05, 0.4, 0.05, black);
  }
  const porcelain = mat('#fbfaf5', 0.22);
  const sink = new THREE.Group();
  sink.name = '36 inch farmhouse sink';
  sink.position.set(kitchenSinkX, 0, 9.2);
  kitchen.add(sink);
  box(sink, 0, 2.65, 1, 3, 0.85, 0.18, porcelain, true).name = 'Farmhouse apron front';
  box(sink, 0, 2.65, -0.93, 3, 0.85, 0.14, porcelain, true);
  for (const x of [-1.43, 1.43]) box(sink, x, 2.65, 0, 0.14, 0.85, 1.9, porcelain, true);
  box(sink, 0, 2.25, 0, 2.72, 0.12, 1.8, porcelain, true);
  cylinder(sink, 0, 2.315, 0, 0.09, 0.012, steel);
  cylinder(kitchen, kitchenSinkX, 3.65, 8.65, 0.055, 1.3, steel);
  box(kitchen, kitchenSinkX, 4.25, 8.95, 0.11, 0.11, 0.65, steel, true);
  windowFrame('Kitchen sink window', kitchenSinkX, 8.1, kitchenSinkWindowWidth, 3.5, 3.75);
  box(kitchen, kitchenSinkX, 3.4, 8.22, 11.1, 0.6, 0.08, countertop);
  const kitchenUpperOffset = kitchenSinkWindowWidth / 2 + 4 / 12 + 1.5 / 2;
  for (const x of [kitchenSinkX - kitchenUpperOffset, kitchenSinkX + kitchenUpperOffset]) {
    const upper = new THREE.Group();
    upper.name = 'Matching window upper cabinet';
    upper.position.set(x, 0, 8.7);
    kitchen.add(upper);
    box(upper, 0, 6, 0, 1.5, 2.5, 1, oak);
    box(upper, 0, 6, 0.54, 1.42, 2.42, 0.08, cream, true);
    box(upper, x < kitchenSinkX ? 0.48 : -0.48, 5.55, 0.61, 0.045, 0.6, 0.05, black);
    box(upper, 0, 4.71, 0.05, 1.3, 0.04, 0.8, light);
  }
  const kitchenCenterZ = (8 + 26.9) / 2;
  // Keep the centered cooktop run below the prep-kitchen boundary at z = 15.
  box(kitchen, 37, 1.44, kitchenCenterZ, 2, 2.85, 4.4, oak);
  box(kitchen, 37, 2.96, kitchenCenterZ, 2.05, 0.18, 4.5, countertop, true);
  for (const z of [kitchenCenterZ - 1.8, kitchenCenterZ + 1.8]) drawerFront(36, z, 0.55, -Math.PI / 2);
  const cooktop = box(kitchen, 37, 3.075, kitchenCenterZ, 1.75, 0.05, 3, black, true);
  cooktop.name = '36 inch induction cooktop';
  for (const [x, z] of [[36.58, kitchenCenterZ - 0.75], [37.42, kitchenCenterZ - 0.75], [36.58, kitchenCenterZ + 0.75], [37.42, kitchenCenterZ + 0.75], [37, kitchenCenterZ]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.018, 8, 32), steel);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 3.12, z);
    kitchen.add(ring);
  }
  drawerFront(36, kitchenCenterZ, 2.7, -Math.PI / 2);
  const cooktopHood = new THREE.Group();
  cooktopHood.name = 'Kitchen cooktop hood';
  kitchen.add(cooktopHood);
  box(cooktopHood, 37, 6.5, kitchenCenterZ, 2, 0.4, 3.5, steel, true);
  box(cooktopHood, 37.6, 8.1, kitchenCenterZ, 0.8, 2.8, 1.5, steel);
  const bottomRun = new THREE.Group();
  bottomRun.name = 'Bottom kitchen cabinet run';
  kitchen.add(bottomRun);
  const columnWidth = 30 / 12;
  const columnHeight = 84 / 12;
  const columnPanel = 0.75 / 12;
  const bottomRunLeft = 29.6875;
  const bottomRunRight = 37.8;
  const bottomRunCenterX = (bottomRunLeft + bottomRunRight) / 2;
  const bottomRunWidth = bottomRunRight - bottomRunLeft;
  const wallFillerWidth = 2.85 / 12;
  const freezerLeft = bottomRunLeft + columnPanel;
  const fridgeRight = bottomRunRight - wallFillerWidth - columnPanel;
  const nicheLeft = freezerLeft + columnWidth + columnPanel;
  const nicheRight = fridgeRight - columnWidth - columnPanel;
  const nicheWidth = nicheRight - nicheLeft;
  const nicheCenterX = (nicheLeft + nicheRight) / 2;
  const drawerWidth = 30 / 12;
  const nicheFillerWidth = (nicheWidth - drawerWidth) / 2;
  const backsplashBottom = 3.05;
  const upperStorageBottom = columnHeight + 0.15;
  const upperStorageTop = 9.6;
  const backsplash = box(bottomRun, nicheCenterX, (backsplashBottom + upperStorageBottom) / 2, 26.4, nicheWidth, upperStorageBottom - backsplashBottom, 0.06, countertop);
  backsplash.name = 'Refrigeration niche quartz backsplash';
  backsplash.userData = { bottom: backsplashBottom, top: upperStorageBottom };
  walls.push(backsplash);
  bottomRun.userData = { layout: 'Separated columns with central landing niche', nicheWidthInches: nicheWidth * 12, drawerWidthInches: 30, provisional: true };
  box(bottomRun, nicheCenterX, 1.44, 25.7, nicheWidth, 2.85, 2, oak).name = 'Central refrigeration landing cabinet';
  box(bottomRun, nicheCenterX, 2.96, 25.7, nicheWidth, 0.18, 2.05, countertop, true).name = 'Central refrigeration landing counter';
  drawerFront(nicheCenterX, 24.67, drawerWidth - 0.02, Math.PI, oak, bottomRun);
  for (const side of [-1, 1]) {
    box(bottomRun, nicheCenterX + side * (nicheWidth - nicheFillerWidth) / 2, 1.45, 24.67, nicheFillerWidth, 2.65, 0.08, oak).name = 'Niche drawer filler';
  }
  box(bottomRun, bottomRunRight - wallFillerWidth / 2, upperStorageTop / 2, 26, wallFillerWidth, upperStorageTop, 1.4, oak).name = 'Recessed refrigerator wall-clearance filler';
  for (const x of [freezerLeft - columnPanel / 2, freezerLeft + columnWidth + columnPanel / 2, fridgeRight - columnWidth - columnPanel / 2, fridgeRight + columnPanel / 2]) {
    box(bottomRun, x, upperStorageTop / 2, 26.725 - 25 / 24, columnPanel, upperStorageTop, 25 / 12, oak).name = 'Full-height refrigeration side panel';
  }
  for (const [name, x, width, depth] of [
    ['Freezer overhead cabinet', freezerLeft + columnWidth / 2, columnWidth, 25 / 12],
    ['Recessed niche upper cabinet', nicheCenterX, nicheWidth, 1],
    ['Fridge overhead cabinet', fridgeRight - columnWidth / 2, columnWidth, 25 / 12]
  ]) {
    const upper = new THREE.Group();
    upper.name = name;
    upper.position.x = x;
    bottomRun.add(upper);
    const height = upperStorageTop - upperStorageBottom;
    const centerY = (upperStorageTop + upperStorageBottom) / 2;
    box(upper, 0, centerY, 26.725 - depth / 2, width, height, depth, oak).name = 'Refrigeration upper carcass';
    for (const side of [-1, 1]) {
      box(upper, side * width / 4, centerY, 26.725 - depth - 0.04, width / 2 - 0.04, height - 0.06, 0.08, cream).name = 'Refrigeration upper door';
      box(upper, side * 0.12, upperStorageBottom + 0.45, 26.725 - depth - 0.11, 0.045, 0.55, 0.05, black).name = 'Refrigeration upper pull';
    }
  }
  box(bottomRun, bottomRunCenterX, 9.675, 25.65, bottomRunWidth, 0.15, 2.15, oak).name = 'Continuous refrigeration cabinet cornice';
  box(bottomRun, nicheCenterX, 5.1, 25.91, nicheWidth, 0.1, 0.9, oak).name = 'Refrigeration niche display shelf';
  for (const [name, model, x, handleX] of [
    ['Column freezer', 'RS3084FLJK1', freezerLeft + columnWidth / 2, -1.05],
    ['Column fridge', 'RS3084SRHK1', fridgeRight - columnWidth / 2, 1.05]
  ]) {
    const appliance = new THREE.Group();
    appliance.name = name;
    appliance.userData = { manufacturer: 'Fisher & Paykel', model, nominalWidthInches: 30, productWidthInches: 29.75, heightInches: 84, bodyDepthInches: 24, cavityDepthInches: 25, finish: 'Stainless panel concept', provisional: true };
    appliance.position.set(x, 0, 25.725);
    appliance.rotation.y = Math.PI;
    kitchen.add(appliance);
    box(appliance, 0, columnHeight / 2, 0, 29.75 / 12, columnHeight, 2, steel).name = 'Fisher & Paykel column body';
    box(appliance, 0, (columnHeight + 4 / 12) / 2, 1 + 0.75 / 24, 29.75 / 12, columnHeight - 4 / 12, 0.75 / 12, steel).name = 'Column stainless door panel';
    box(appliance, handleX, 3.9, 1.13, 0.065, 2.6, 0.1, black).name = 'Column niche-facing handle';
    box(appliance, 0, 2 / 12, 1.01, 29.5 / 12, 4 / 12, 0.04, black).name = 'Column ventilation toe-kick';
    for (const y of [0.08, 0.16, 0.24]) box(appliance, 0, y, 1.035, 29 / 12, 0.025, 0.015, steel).name = 'Column ventilation grille';
  }

  const island = new THREE.Group();
  island.name = 'Kitchen island';
  island.userData = { width: 3.5, length: 7, kneeOverhang: 1.25 };
  island.position.z = kitchenCenterZ - 18.5;
  kitchen.add(island);
  const islandFinish = mat('#e8e2d6');
  const islandInset = mat('#dcd6ca');
  box(island, 31.15, 0.19, 18.5, 1.7, 0.36, 4.2, black).name = 'Island recessed toe-kick';
  box(island, 31.15, 1.59, 18.5, 2, 2.46, 4.5, islandFinish).name = 'Island warm-white storage carcass';
  box(island, 30.65, 2.935, 18.5, 3.5, 0.23, 7, countertop, true).name = 'Island light quartz slab';
  for (const z of [17.04, 18.5, 19.96]) box(island, 30.12, 1.59, z, 0.08, 1.86, 1.26, islandInset).name = 'Island recessed back panel';
  for (const y of [0.57, 2.61]) box(island, 30.075, y, 18.5, 0.15, 0.18, 4.5, islandFinish).name = 'Island back panel rail';
  for (const z of [16.33, 17.77, 19.23, 20.67]) box(island, 30.075, 1.59, z, 0.15, 2.22, 0.16, islandFinish).name = 'Island back panel stile';
  for (const [z, facing] of [[16.23, -1], [20.77, 1]]) {
    box(island, 31.15, 1.59, z, 2.12, 2.46, 0.12, islandFinish).name = 'Island painted end panel';
    box(island, 31.15, 1.59, z + facing * 0.07, 1.68, 1.86, 0.04, islandInset).name = 'Island recessed end panel';
    for (const y of [0.57, 2.61]) box(island, 31.15, y, z + facing * 0.1, 2.12, 0.18, 0.08, islandFinish).name = 'Island end panel rail';
    for (const x of [30.17, 32.13]) box(island, x, 1.59, z + facing * 0.1, 0.16, 2.22, 0.08, islandFinish).name = 'Island end panel stile';
  }
  const islandSupport = new THREE.Group();
  islandSupport.name = 'Island traditional corner posts and apron';
  island.add(islandSupport);
  for (const x of [29.25, 32.05]) {
    box(islandSupport, x, 2.67, 18.5, 0.18, 0.3, 6.2, islandFinish).name = 'Island painted side apron';
    for (const z of [15.4, 21.6]) {
      box(islandSupport, x, 1.57, z, 0.42, 2.5, 0.42, islandFinish).name = 'Island square support post';
      box(islandSupport, x, 0.17, z, 0.55, 0.34, 0.55, islandFinish).name = 'Island post plinth';
      box(islandSupport, x, 0.04, z, 0.62, 0.08, 0.62, islandFinish).name = 'Island post base molding';
      box(islandSupport, x, 2.73, z, 0.52, 0.18, 0.52, islandFinish).name = 'Island post capital';
    }
  }
  for (const z of [15.4, 21.6]) box(islandSupport, 30.65, 2.67, z, 2.8, 0.3, 0.18, islandFinish).name = 'Island painted end apron';
  for (const z of [17.35, 19.65]) drawerFront(32.2, z, 2.1, Math.PI / 2, islandFinish, island);
  const stoolFabric = mat('#a17c57', 0.98);
  stoolFabric.name = 'Light brown stool upholstery';
  const stoolWood = mat('#98704e', 0.6);
  const brass = new THREE.MeshStandardMaterial({ color: '#b99a60', metalness: 0.65, roughness: 0.35 });
  const stoolCushionGeometry = new THREE.LatheGeometry([
    new THREE.Vector2(0, -0.11), new THREE.Vector2(0.59, -0.11), new THREE.Vector2(0.65, -0.085),
    new THREE.Vector2(0.675, -0.03), new THREE.Vector2(0.675, 0.045), new THREE.Vector2(0.65, 0.095),
    new THREE.Vector2(0.6, 0.11), new THREE.Vector2(0, 0.11)
  ], 48);
  // Seat rims stop just short of the island's back stiles and end panels.
  for (const [x, z, rotation] of [[29.28, 16.5, Math.PI / 2], [29.28, 18.5, Math.PI / 2], [29.28, 20.5, Math.PI / 2], [30.65, 15.45, 0], [30.65, 21.55, Math.PI]]) {
    const stool = new THREE.Group();
    stool.name = 'Kitchen stool';
    stool.position.set(x, 0, z);
    stool.rotation.y = rotation;
    island.add(stool);
    cylinder(stool, 0, 2, 0, 0.7, 0.12, stoolWood).name = 'Stool round wood seat rim';
    const cushion = new THREE.Mesh(stoolCushionGeometry, stoolFabric);
    cushion.name = 'Stool round light brown upholstered cushion';
    cushion.position.y = 2.16;
    cushion.castShadow = cushion.receiveShadow = true;
    stool.add(cushion);
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI / 4 + i * Math.PI / 2;
      const foot = new THREE.Vector3(Math.cos(angle) * 0.64, 0.04, Math.sin(angle) * 0.64);
      const top = new THREE.Vector3(Math.cos(angle) * 0.44, 1.96, Math.sin(angle) * 0.44);
      const direction = top.clone().sub(foot);
      const length = direction.length();
      const leg = new THREE.Group();
      leg.name = 'Stool splayed tapered leg';
      leg.position.copy(foot).add(top).multiplyScalar(0.5);
      leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      stool.add(leg);
      cylinder(leg, 0, 0, 0, 0.048, length, stoolWood, 0.075).name = 'Stool tapered wood leg';
      cylinder(leg, 0, -length / 2 + 0.16, 0, 0.052, 0.32, brass, 0.057).name = 'Stool brass leg cap';
      cylinder(leg, 0, -length / 2 - 0.02, 0, 0.05, 0.04, black).name = 'Stool protective foot glide';
    }
    const footRing = new THREE.Mesh(new THREE.TorusGeometry(0.575, 0.025, 12, 64), brass);
    footRing.name = 'Stool circular brass footrest';
    footRing.rotation.x = Math.PI / 2;
    footRing.position.y = 0.67;
    footRing.castShadow = footRing.receiveShadow = true;
    stool.add(footRing);
  }
  for (const z of [kitchenCenterZ - 2.25, kitchenCenterZ + 2.25]) {
    cylinder(pendant, 30.65, 8.8, z, 0.025, 2, black);
    cylinder(pendant, 30.65, 7.8, z, 0.65, 0.45, cream, 0.2);
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

  const stairs = furnishing('U-shaped hall staircase', 17.4, 26.6);
  scene.add(stairs);
  const stairWidth = 44 / 12;
  const stairGap = 0.25;
  const stairRisers = 10;
  const stairRise = 11 / (2 * stairRisers);
  const stairGoing = 10 / 12;
  const stairRun = (stairRisers - 1) * stairGoing;
  const stairDepth = 2 * stairWidth + stairGap;
  const landingHeight = stairRisers * stairRise;
  const landingEndX = 29 - 0.175 - stairs.position.x;
  const stairBookcaseDepth = 11 / 12;
  const stairBookcaseSplitX = 26.6 - stairs.position.x;
  stairs.userData = { flightWidthInches: 44, risersPerFlight: stairRisers, riseInches: stairRise * 12, treadDepthInches: 10, floorToFloorFeet: 11, provisional: true };
  roomDimensions('Stairs (each flight)', stairWidth, stairRun);

  function stairBeam(name, start, end, width, depth, material) {
    const from = new THREE.Vector3(...start);
    const to = new THREE.Vector3(...end);
    const direction = to.clone().sub(from);
    const beam = box(stairs, 0, 0, 0, width, direction.length(), depth, material);
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
    flight.userData = { clearWidthInches: 44, risers: stairRisers };
    stairs.add(flight);
    const direction = upper ? -1 : 1;
    const startX = upper ? stairRun : 0;
    const baseHeight = upper ? landingHeight : 0;
    const centerZ = (upper ? stairWidth + stairGap : 0) + stairWidth / 2;
    for (let step = 0; step < stairRisers - 1; step++) {
      const x = startX + direction * (step + 0.5) * stairGoing;
      const height = baseHeight + (step + 1) * stairRise;
      const recessedBookcase = !upper && step >= 3;
      const enclosureDepth = recessedBookcase ? stairWidth - stairBookcaseDepth : stairWidth;
      const enclosureZ = centerZ + (recessedBookcase ? stairBookcaseDepth / 2 : 0);
      box(flight, x, (height - 0.1) / 2, enclosureZ, stairGoing, height - 0.1, enclosureDepth, wallMaterial).name = 'Under-stair enclosure';
      if (recessedBookcase) {
        const caseHeight = stairBookcaseHeight(Math.floor(step / 3) * 3 * stairGoing);
        const infillHeight = height - 0.1 - caseHeight;
        box(flight, x, caseHeight + infillHeight / 2, stairBookcaseDepth / 2, stairGoing, infillHeight, stairBookcaseDepth, wallMaterial).name = 'Bookcase stair-slope infill';
      }
      box(flight, x, height - 0.05, centerZ, stairGoing, 0.1, stairWidth, oak).name = '44-inch stair tread';
      box(flight, x - direction * (stairGoing / 2 - 0.02), height + 0.003, centerZ, 0.04, 0.006, stairWidth, walnut).name = 'Stair tread nosing';
      box(flight, x - direction * (stairGoing / 2 - 0.04), height - (stairRise + 0.1) / 2, centerZ, 0.08, stairRise - 0.1, stairWidth, cream).name = 'Stair riser';
    }
    const endX = startX + direction * stairRun;
    const endHeight = baseHeight + landingHeight;
    box(flight, endX + direction * 0.04, endHeight - (stairRise + 0.1) / 2, centerZ, 0.08, stairRise - 0.1, stairWidth, cream).name = 'Landing riser';
    for (const side of [-1, 1]) {
      const stringerZ = centerZ + side * (stairWidth / 2 - 0.12);
      stairBeam('Stair stringer', [startX, baseHeight + 0.05, stringerZ], [endX, endHeight - stairRise + 0.05, stringerZ], 0.12, 0.3, oak);
      const railZ = centerZ + side * (stairWidth / 2 + 0.08);
      const firstX = startX + direction * stairGoing / 2;
      const lastX = endX - direction * stairGoing / 2;
      const wallSide = !upper && side === 1;
      if (wallSide) continue;
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
  box(stairs, stairRun / 2, (landingHeight + 3) / 2, stairWidth + 0.08, stairRun, landingHeight + 3, 0.08, wallMaterial).name = 'Lower flight continuous backing wall';
  box(stairs, (stairRun + landingEndX) / 2, landingHeight - 0.1, stairDepth / 2, landingEndX - stairRun, 0.2, stairDepth, oak).name = 'U-turn stair landing';
  box(stairs, -stairWidth / 2, 2 * landingHeight - 0.1, stairWidth + stairGap + stairWidth / 2, stairWidth, 0.2, stairWidth, oak).name = 'Upper stair arrival landing';
  box(stairs, (stairRun + landingEndX) / 2, (landingHeight - 0.2) / 2, (stairDepth + stairBookcaseDepth) / 2, landingEndX - stairRun, landingHeight - 0.2, stairDepth - stairBookcaseDepth, wallMaterial).name = 'Under-landing enclosure';
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
  for (const z of [-0.08, stairDepth + 0.08]) {
    stairBeam('Turning landing side handrail', [stairRun, landingHeight + 3, z], [landingEndX, landingHeight + 3, z], 0.12, 0.12, oak);
    for (let rail = 1; rail <= 8; rail++) {
      stairBeam('Horizontal landing guard rail', [stairRun, landingHeight + rail / 3, z], [landingEndX, landingHeight + rail / 3, z], 0.045, 0.045, black);
    }
    for (const x of [stairRun, landingEndX - 0.05]) box(stairs, x, landingHeight + 1.5, z, 0.09, 3, 0.09, black).name = 'Landing guard post';
  }

  function cabinet(parent, x, z, width, depth = 2, height = 2.85) {
    box(parent, x, height / 2 + 0.05, z, width, height, depth, oak);
    box(parent, x, height + 0.12, z, width + 0.06, 0.14, depth + 0.05, countertop);
    const doors = Math.max(1, Math.round(width / 1.5));
    for (let i = 0; i < doors; i++) {
      const center = x - width / 2 + (i + 0.5) * width / doors;
      box(parent, center, height / 2 + 0.1, z + depth / 2 + 0.04, width / doors - 0.05, height - 0.18, 0.08, cream, true);
      box(parent, center, Math.min(height - 0.3, 4), z + depth / 2 + 0.11, 0.65, 0.04, 0.05, brass);
    }
  }

  const prep = furnishing('Prep kitchen cabinetry', 0, 0);
  cabinet(prep, 47.4, 9.25, 10.8);
  for (const x of [43.8, 47.4, 51]) {
    box(prep, x, 6.2, 8.75, 3.4, 2.7, 1.1, oak);
    box(prep, x, 6.2, 9.34, 3.3, 2.6, 0.08, cream, true);
  }
  const pantry = furnishing('Prep tall pantry', 54.1, 9.45);
  box(pantry, 0, 4.1, 0, 2, 8.2, 2.3, oak);
  box(pantry, 0, 4.1, 1.2, 1.9, 8, 0.08, cream, true);
  box(pantry, -0.65, 4.6, 1.28, 0.05, 1, 0.05, brass);
  const coffeeStation = furnishing('Prep coffee station', 43.8, 10);
  box(coffeeStation, 0, 3.765, 0, 1.1, 1.45, 1.1, black, true);
  cylinder(coffeeStation, 0.75, 3.19, 0.1, 0.16, 0.3, porcelain);
  const prepOven = furnishing('Prep countertop oven', 51, 10);
  box(prepOven, 0, 3.64, 0, 1.8, 1.2, 1.2, steel, true);
  box(prepOven, 0, 3.64, 0.64, 1.5, 0.85, 0.05, black);

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
  box(mudCoats, 0, 4, 0, 2.25, 8, 2, oak);
  box(mudCoats, 0, 4, 1.05, 2.15, 7.8, 0.08, cream);
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

  const ground = box(scene, 25, -0.75, 28, 240, 0.5, 240, mat('#eeeee6'));
  ground.castShadow = false;
  const presets = {
    social: { target: [19, 2, 12], offset: [27, 55, 32], span: 43 },
    living: { target: [6.7, 1, 16.4], offset: [24, 23, 22], span: 24 },
    dining: { target: [19.8, 1, 2.6], offset: [16, 19, 23], span: 20 },
    kitchen: { target: [32.2, 2, kitchenCenterZ], offset: [-22, 35, 27], span: 26 },
    fridge: { target: [bottomRunCenterX, 5, 26.9], offset: [0, 0, -18], span: 12 },
    island: { target: [30.65, 1.5, kitchenCenterZ], offset: [-12, 9, 10], span: 15 },
    whole: { target: [27, 0, 29], offset: [35, 75, 50], span: 78 },
    garage: { target: [43, 1, 33], offset: [28, 48, 36], span: 42 },
    prep: { target: [44, 1, 16], offset: [-28, 44, 30], span: 28 },
    private: { target: [15.6, 1, 43], offset: [32, 49, 37], span: 40 },
    top: { target: [27, 0, 29], offset: [0, 110, 0.1], span: 72 }
  };
  let currentView = 'whole';
  let fullHeight = true;

  function setView(name) {
    currentView = name;
    controls.maxPolarAngle = name === 'fridge' ? Math.PI / 2 : Math.PI / 2.12;
    const preset = presets[name];
    const aspect = viewport.clientWidth / viewport.clientHeight;
    const offset = new THREE.Vector3(...preset.offset);
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const portraitPadding = aspect < 1 ? 1.25 : 1;
    const minimumDistance = preset.span * portraitPadding / (2 * Math.tan(verticalFov / 2) * Math.min(aspect, 1));
    offset.setLength(Math.max(offset.length(), minimumDistance));
    controls.target.set(...preset.target);
    camera.position.copy(controls.target).add(offset);
    controls.update();
    const showWholeFloor = !['social', 'living', 'dining', 'kitchen', 'island', 'fridge'].includes(name);
    shell.visible = showWholeFloor;
    stairs.visible = showWholeFloor || ['kitchen', 'fridge'].includes(name);
    island.visible = name !== 'fridge';
    cooktopHood.visible = name !== 'fridge';
    pendant.visible = !['top', 'fridge'].includes(name);
    viewButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.view === name));
    });
    document.querySelectorAll('.furniture-card').forEach((card) => {
      card.classList.toggle('selected', card.dataset.room === name);
    });
    renderer.domElement.setAttribute('aria-label', `3D floor plan: ${name === 'social' ? 'living, dining and kitchen' : name} view, ${fullHeight ? 'full-height' : 'cutaway'} walls`);
    render();
  }

  viewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setView(button.dataset.view);
      if (button.closest('.furniture-card')) viewport.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
  });
  wallButton.disabled = false;
  wallButton.addEventListener('click', () => {
    fullHeight = !fullHeight;
    wallButton.setAttribute('aria-pressed', String(fullHeight));
    const height = fullHeight ? 10 : 2.6;
    walls.forEach((mesh) => {
      const { bottom, top } = mesh.userData;
      const visibleHeight = Math.max(0, Math.min(top, height) - bottom);
      mesh.visible = visibleHeight > 0;
      mesh.scale.y = visibleHeight / (top - bottom);
      mesh.position.y = bottom + visibleHeight / 2 - (mesh.userData.offsetY ?? 0);
    });
    renderer.domElement.setAttribute('aria-label', `3D floor plan: ${currentView} view, ${fullHeight ? 'full-height' : 'cutaway'} walls`);
    render();
  });
  resetButton.disabled = false;
  resetButton.addEventListener('click', () => setView('whole'));
  viewport.addEventListener('keydown', (event) => {
    if (event.target !== viewport) return;
    const moves = { ArrowLeft: -0.15, ArrowRight: 0.15 };
    if (event.key in moves) {
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), moves[event.key]);
      camera.position.copy(controls.target).add(offset);
    } else if (event.key === '+' || event.key === '-' || event.key === '=') {
      const offset = camera.position.clone().sub(controls.target);
      offset.setLength(THREE.MathUtils.clamp(offset.length() * (event.key === '-' ? 1.1 : 0.9), controls.minDistance, controls.maxDistance));
      camera.position.copy(controls.target).add(offset);
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
    console.error('The 3D floor plan lost its WebGL context.');
    showModelError('The 3D renderer lost its graphics connection. Reload this page to try again.');
  });
  function resize() {
    camera.aspect = viewport.clientWidth / viewport.clientHeight;
    camera.updateProjectionMatrix();
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
  navigationButtons.forEach((button) => { button.disabled = false; });
}
