const viewport = document.getElementById('model-viewport');
const message = viewport.querySelector('.model-message');
let viewButtons = document.querySelectorAll('[data-view]');
const islandLightsInput = document.getElementById('show-island-lights');
const nightLightingInput = document.getElementById('toggle-night-lighting');
const furnitureInput = document.getElementById('show-furniture');
const floorGridInput = document.getElementById('show-floor-grid');
const resetButton = document.getElementById('reset-view');
const refreshButton = document.getElementById('refresh-model');
refreshButton?.addEventListener('click', () => {
  refreshButton.disabled = true;
  location.replace(location.pathname);
});
const navigationButtons = document.querySelectorAll('[data-navigation]');
const walkControls = document.getElementById('walk-controls');
const tourMap = document.getElementById('tour-map');
const tourStatus = document.getElementById('tour-status');
const notesButton = document.getElementById('toggle-design-notes');
const notes = document.getElementById('design-notes');
const viewerNavigation = document.getElementById('viewer-navigation');
const narrowViewer = window.matchMedia('(max-width: 760px)');
viewerNavigation.open = !narrowViewer.matches;
function collapseMobileNavigation() {
  if (!narrowViewer.matches) return;
  viewerNavigation.querySelector('summary').focus({ preventScroll: true });
  viewerNavigation.open = false;
}

function setRoomMenuVisible(visible) {
  notes.hidden = !visible;
  document.querySelector('.design-workspace').classList.toggle('notes-hidden', !visible);
  notesButton.setAttribute('aria-expanded', String(visible));
  notesButton.textContent = 'Notes';
}

notesButton.addEventListener('click', () => setRoomMenuVisible(notes.hidden));
document.getElementById('close-design-notes').addEventListener('click', () => {
  setRoomMenuVisible(false);
  notesButton.focus();
});


// A classic entry script also runs from file URLs; remote dependencies remain modules.
async function initializePreview() {
  try {
    const [THREE, { OrbitControls }, { RoundedBoxGeometry }, { GLTFLoader }, { EffectComposer }, { RenderPass }, { SSAOPass }, { OutputPass }, { RoomEnvironment }] = await Promise.all([
      import('three'),
      import('three/addons/controls/OrbitControls.js'),
      import('three/addons/geometries/RoundedBoxGeometry.js'),
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/SSAOPass.js'),
      import('three/addons/postprocessing/OutputPass.js'),
      import('three/addons/environments/RoomEnvironment.js')
    ]);
    let savedUpstairsLayout = UpstairsLayout.empty();
    let savedGroundLayout = UpstairsLayout.empty();
    if (window.location.protocol === 'file:') {
      console.warn('File preview uses the original layouts. Serve the repository over HTTP to load saved layout data.');
    } else {
      [savedUpstairsLayout, savedGroundLayout] = await Promise.all(['upstairs-layout.json', 'ground-layout.json'].map(async file => {
        const response = await fetch(file, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Could not load ${file} (${response.status}). Restore that file before loading the viewer.`);
        return response.json();
      }));
    }
    const loader = new GLTFLoader();
    const garageAssetDefinitions = [
      { id: 'adjustable_wrench', axis: 'y', inches: 12, rotation: [0, 0, 0] },
      { id: 'combination_wrench', axis: 'y', inches: 12, rotation: [Math.PI / 2, 0, 0] },
      { id: 'cross_pein_hammer', axis: 'y', inches: 14, rotation: [0, 0, 0] },
      { id: 'handsaw_wood', axis: 'y', inches: 16, rotation: [Math.PI / 2, 0, Math.PI / 2] },
      { id: 'Drill_01', axis: 'y', inches: 10, rotation: [0, 0, 0] },
      { id: 'metal_toolbox', axis: 'x', inches: 16, rotation: [0, 0, 0] },
      { id: 'plastic_crate_01', axis: 'x', inches: 12, rotation: [0, 0, 0] }
    ];
    const [bicycleAsset, armchairAsset, sofaAsset, sideTableAsset, garageSourceAssets, shoeAsset, bootAsset] = await Promise.all([
      loader.loadAsync('assets/models/poly-pizza/bicycle-google.glb'),
      loader.loadAsync('assets/models/poly-haven/modern_arm_chair_01/modern_arm_chair_01_1k.gltf'),
      loader.loadAsync('assets/models/khronos/GlamVelvetSofa.glb'),
      loader.loadAsync('assets/models/poly-haven/side_table_01/side_table_01_1k.gltf'),
      Promise.all(garageAssetDefinitions.map(({ id }) => loader.loadAsync(`assets/models/poly-haven/${id}/${id}_1k.gltf`))),
      loader.loadAsync('assets/models/khronos/MaterialsVariantsShoe.glb'),
      loader.loadAsync('assets/models/poly-haven/rubber_boots/rubber_boots_1k.gltf')
    ]);
    const mudroomAssets = {};
    for (const definition of [
      { id: 'shoe', source: shoeAsset.scene, rotation: Math.PI / 2, axis: 'z', inches: 11.5, asset: 'assets/models/khronos/MaterialsVariantsShoe.glb' },
      { id: 'bootLeft', source: bootAsset.scene.getObjectByName('rubber_boots_l'), rotation: 0, axis: 'y', inches: 14, asset: 'assets/models/poly-haven/rubber_boots/rubber_boots_1k.gltf' },
      { id: 'bootRight', source: bootAsset.scene.getObjectByName('rubber_boots_r'), rotation: 0, axis: 'y', inches: 14, asset: 'assets/models/poly-haven/rubber_boots/rubber_boots_1k.gltf' }
    ]) {
      if (!definition.source) throw new Error(`Missing mudroom asset component: ${definition.id}`);
      const template = new THREE.Group();
      template.add(definition.source.clone(true));
      template.rotation.y = definition.rotation;
      template.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(template);
      const size = bounds.getSize(new THREE.Vector3());
      if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) throw new Error(`Invalid mudroom asset dimensions: ${definition.id}`);
      template.scale.setScalar(definition.inches / 12 / size[definition.axis]);
      template.updateMatrixWorld(true);
      bounds.setFromObject(template);
      bounds.getSize(size);
      const center = bounds.getCenter(new THREE.Vector3());
      template.position.set(-center.x, -bounds.min.y, -center.z);
      const geometry = new THREE.Group();
      geometry.add(template);
      geometry.userData = { asset: definition.asset, widthInches: size.x * 12, heightInches: size.y * 12, depthInches: size.z * 12, uniformScale: true, manufacturerCAD: false };
      mudroomAssets[definition.id] = geometry;
    }
    const garageAssets = {};
    for (const [index, definition] of garageAssetDefinitions.entries()) {
      const template = new THREE.Group();
      template.add(garageSourceAssets[index].scene);
      template.rotation.set(...definition.rotation);
      template.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(template);
      const size = bounds.getSize(new THREE.Vector3());
      if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) throw new Error(`Invalid garage asset dimensions: ${definition.id}`);
      template.scale.setScalar((definition.inches / 12) / size[definition.axis]);
      template.updateMatrixWorld(true);
      bounds.setFromObject(template);
      bounds.getSize(size);
      const center = bounds.getCenter(new THREE.Vector3());
      template.position.set(-center.x, -bounds.min.y, -center.z);
      const geometry = new THREE.Group();
      geometry.add(template);
      geometry.userData = { asset: `assets/models/poly-haven/${definition.id}/${definition.id}_1k.gltf`, widthInches: size.x * 12, heightInches: size.y * 12, depthInches: size.z * 12, uniformScale: true, source: `https://polyhaven.com/a/${definition.id}`, license: 'CC0-1.0' };
      garageAssets[definition.id] = geometry;
    }
    const bicycleTemplate = new THREE.Group();
    bicycleTemplate.add(bicycleAsset.scene);
    bicycleTemplate.rotation.y = Math.PI / 2;
    bicycleTemplate.updateMatrixWorld(true);
    const bicycleBounds = new THREE.Box3().setFromObject(bicycleTemplate);
    const bicycleLength = bicycleBounds.max.z - bicycleBounds.min.z;
    if (!Number.isFinite(bicycleLength) || bicycleLength <= 0) throw new Error('The downloaded bicycle has invalid dimensions.');
    bicycleTemplate.scale.setScalar((65 / 12) / bicycleLength);
    bicycleTemplate.updateMatrixWorld(true);
    bicycleBounds.setFromObject(bicycleTemplate);
    const bicycleCenter = bicycleBounds.getCenter(new THREE.Vector3());
    bicycleTemplate.position.set(-bicycleCenter.x, -bicycleBounds.min.y, -bicycleCenter.z);
    bicycleTemplate.userData = { asset: 'assets/models/poly-pizza/bicycle-google.glb', lengthInches: 65, widthInches: (bicycleBounds.max.x - bicycleBounds.min.x) * 12, heightInches: (bicycleBounds.max.y - bicycleBounds.min.y) * 12, uniformScale: true };
    const bicycleGeometry = new THREE.Group();
    bicycleGeometry.add(bicycleTemplate);
    bicycleGeometry.userData = bicycleTemplate.userData;
    const armchairTemplate = armchairAsset.scene;
    armchairTemplate.updateMatrixWorld(true);
    const armchairBounds = new THREE.Box3().setFromObject(armchairTemplate);
    const armchairSize = armchairBounds.getSize(new THREE.Vector3());
    if (![armchairSize.x, armchairSize.y, armchairSize.z].every((size) => Number.isFinite(size) && size > 0)) throw new Error('The downloaded armchair has invalid dimensions.');
    armchairTemplate.scale.setScalar((32.25 / 12) / armchairSize.x);
    armchairTemplate.updateMatrixWorld(true);
    armchairBounds.setFromObject(armchairTemplate);
    const armchairCenter = armchairBounds.getCenter(new THREE.Vector3());
    armchairTemplate.position.set(-armchairCenter.x, -armchairBounds.min.y, -armchairCenter.z);
    armchairBounds.getSize(armchairSize);
    const armchairGeometry = new THREE.Group();
    armchairGeometry.add(armchairTemplate);
    armchairGeometry.userData = {
      asset: 'assets/models/poly-haven/modern_arm_chair_01/modern_arm_chair_01_1k.gltf',
      widthInches: armchairSize.x * 12, depthInches: armchairSize.z * 12, heightInches: armchairSize.y * 12,
      uniformScale: true, manufacturerCAD: false, source: 'https://polyhaven.com/a/modern_arm_chair_01', license: 'CC0-1.0'
    };
    const sofaTemplate = sofaAsset.scene;
    const champagneIndex = sofaAsset.parser.json.materials.findIndex((material) => material.name === 'GlamVelvetSofa_fabric_champagne');
    if (champagneIndex < 0) throw new Error('The downloaded sofa is missing its Champagne upholstery material.');
    const champagneMaterial = await sofaAsset.parser.getDependency('material', champagneIndex);
    sofaTemplate.traverse((part) => {
      if (part.isLight) part.visible = false;
      if (part.isMesh && part.material.name.startsWith('GlamVelvetSofa_fabric_')) part.material = champagneMaterial;
    });
    sofaTemplate.updateMatrixWorld(true);
    const sofaBounds = new THREE.Box3().setFromObject(sofaTemplate);
    const sofaSize = sofaBounds.getSize(new THREE.Vector3());
    if (![sofaSize.x, sofaSize.y, sofaSize.z].every((size) => Number.isFinite(size) && size > 0)) throw new Error('The downloaded sofa has invalid dimensions.');
    sofaTemplate.scale.setScalar((86 / 12) / sofaSize.x);
    sofaTemplate.updateMatrixWorld(true);
    sofaBounds.setFromObject(sofaTemplate);
    const sofaCenter = sofaBounds.getCenter(new THREE.Vector3());
    sofaTemplate.position.set(-sofaCenter.x, -sofaBounds.min.y, -sofaCenter.z);
    sofaBounds.getSize(sofaSize);
    const sofaGeometry = new THREE.Group();
    sofaGeometry.add(sofaTemplate);
    sofaGeometry.userData = {
      asset: 'assets/models/khronos/GlamVelvetSofa.glb', widthInches: sofaSize.x * 12, depthInches: sofaSize.z * 12, heightInches: sofaSize.y * 12,
      uniformScale: true, manufacturerCAD: false, productSelected: false, comfortVerified: false,
      source: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlamVelvetSofa',
      productURL: 'https://www.wayfair.com/furniture/pdp/mercer41-frankie-velvet-86-recessed-arm-sofa-bed-mcrf6337.html',
      license: 'CC-BY-4.0', attribution: 'GlamVelvetSofa, copyright 2021 Wayfair, LLC; Eric Chadwick. CC BY 4.0. Uniformly scaled and positioned; authored Champagne fabric selected; embedded light disabled.'
    };
    const sideTableTemplate = sideTableAsset.scene;
    sideTableTemplate.updateMatrixWorld(true);
    const sideTableBounds = new THREE.Box3().setFromObject(sideTableTemplate);
    const sideTableSize = sideTableBounds.getSize(new THREE.Vector3());
    if (![sideTableSize.x, sideTableSize.y, sideTableSize.z].every((size) => Number.isFinite(size) && size > 0)) throw new Error('The downloaded side table has invalid dimensions.');
    sideTableTemplate.scale.setScalar((20 / 12) / sideTableSize.y);
    sideTableTemplate.updateMatrixWorld(true);
    sideTableBounds.setFromObject(sideTableTemplate);
    const sideTableCenter = sideTableBounds.getCenter(new THREE.Vector3());
    sideTableTemplate.position.set(-sideTableCenter.x, -sideTableBounds.min.y, -sideTableCenter.z);
    sideTableBounds.getSize(sideTableSize);
    const sideTableGeometry = new THREE.Group();
    sideTableGeometry.add(sideTableTemplate);
    sideTableGeometry.userData = {
      asset: 'assets/models/poly-haven/side_table_01/side_table_01_1k.gltf',
      widthInches: sideTableSize.x * 12, depthInches: sideTableSize.z * 12, heightInches: sideTableSize.y * 12,
      uniformScale: true, manufacturerCAD: false, source: 'https://polyhaven.com/a/side_table_01', license: 'CC0-1.0'
    };
    const textureLoader = new THREE.TextureLoader();
    const masonryMaps = {};
    await Promise.all([['brick', 'brick_wall_001', 'diffuse'], ['stone', 'stone_wall', 'diff'], ['grass', 'grass_ground', 'diff'], ['oak', 'oak_veneer_01', 'diff'], ['roof', 'roof_slates_03', 'diff']].map(async ([name, prefix, diffuse]) => {
      const maps = await Promise.all([diffuse, 'nor_gl', 'rough'].map((suffix) => textureLoader.loadAsync(`assets/textures/exterior/${prefix}_${suffix}_1k.jpg`)));
      if (name === 'roof') {
        for (let index = 0; index < maps.length; index++) {
          const image = maps[index].image;
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1024;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Roof texture cropping requires a 2D canvas context.');
          context.drawImage(image, 0, image.height * 0.05, image.width, image.height * 0.95, 0, 0, 1024, 1024);
          maps[index].dispose();
          maps[index] = new THREE.CanvasTexture(canvas);
        }
      }
      maps.forEach((texture, index) => {
        texture.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 4;
      });
      masonryMaps[name] = { map: maps[0], normalMap: maps[1], roughnessMap: maps[2] };
    }));
    const { RGBELoader } = await import('three/addons/loaders/RGBELoader.js');
    const outdoorSky = await new RGBELoader().loadAsync('assets/textures/exterior/kloppenheim_06_puresky_1k.hdr');
    outdoorSky.mapping = THREE.EquirectangularReflectionMapping;
    buildPreview(THREE, OrbitControls, RoundedBoxGeometry, savedUpstairsLayout, savedGroundLayout, bicycleGeometry, armchairGeometry, garageAssets, sofaGeometry, sideTableGeometry, mudroomAssets, { EffectComposer, RenderPass, SSAOPass, OutputPass, RoomEnvironment, masonryMaps, outdoorSky });
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
  nightLightingInput.disabled = true;
  furnitureInput.disabled = true;
  floorGridInput.disabled = true;
  resetButton.disabled = true;
  navigationButtons.forEach((button) => { button.disabled = true; });
  walkControls.hidden = true;
  tourStatus.textContent = '';
  tourStatus.classList.remove('tour-notice');
  viewport.classList.remove('walking');
}

function buildPreview(THREE, OrbitControls, RoundedBoxGeometry, savedUpstairsLayout, savedGroundLayout, bicycleGeometry, armchairGeometry, garageAssets, sofaGeometry, sideTableGeometry, mudroomAssets, { EffectComposer, RenderPass, SSAOPass, OutputPass, RoomEnvironment, masonryMaps, outdoorSky }) {
  let nightLighting = nightLightingInput.checked;
  let daytimeIslandLights = islandLightsInput.checked;
  const nestedFurniture = [];
  if (nightLighting) islandLightsInput.checked = true;
  // Model coordinates are feet; the supplied raster is a concept trace, not CAD.
  const ceilingHeight = 9;
  const garageRisers = 2;
  const garageRise = 7.5 / 12;
  const garageFloorY = -garageRisers * garageRise;
  const garageFloorAreas = [
    { x: 44.9 - 8 / 12, z: 15, w: 10.6 + 8 / 12, d: 11.9 },
    { x: 31.2, z: 26.9, w: 24.3, d: 7.7 },
    { x: 31.2, z: 34.6, w: 24.3, d: 14.4 }
  ];
  const garageEntry = { x: 38, z: 26.725, width: 3, treadWidth: 4, going: 11 / 12, height: 8, thresholdDepth: 0.35 };
  const scene = new THREE.Scene();
  scene.matrixWorldAutoUpdate = false;
  scene.background = new THREE.Color('#eeeee6');
  const indoorBackground = scene.background;
  const perspectiveCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 500);
  const mudroomInteriorCamera = new THREE.PerspectiveCamera(85, 1, 0.1, 500);
  const cooktopElevationCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500);
  let camera = perspectiveCamera;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  let interiorPost = null;
  const fullPixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(fullPixelRatio);
  renderer.shadowMap.enabled = false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
  let renderFrame = null;
  let orbitInteracting = false;
  function updateRenderResolution() {
    const ratio = orbitInteracting ? Math.min(fullPixelRatio, 1) : fullPixelRatio;
    if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);
  }
  function requestRender() {
    if (renderFrame !== null) return;
    renderFrame = requestAnimationFrame(() => {
      renderFrame = null;
      render();
    });
  }
  controls.addEventListener('change', requestRender);
  controls.addEventListener('start', () => { orbitInteracting = true; });
  controls.addEventListener('end', () => {
    orbitInteracting = false;
    requestRender();
  });
  window.addEventListener('blur', () => {
    if (!orbitInteracting) return;
    orbitInteracting = false;
    requestRender();
  });
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
    const moving = mode === 'move' || currentView === 'top' || currentView === 'upstairs-top';
    controls.enableRotate = currentView !== 'top' && currentView !== 'upstairs-top';
    controls.enabled = !walking;
    controls.mouseButtons.LEFT = moving ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    controls.mouseButtons.RIGHT = moving ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
    controls.touches.ONE = moving ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    navigationButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.navigation === mode));
    });
    walkControls.hidden = !walking;
    viewport.classList.toggle('walking', walking);
    viewport.setAttribute('aria-label', activeFloor === 'exterior' ? `3D paired-gable stone and modern brick exterior study. Drag to ${moving ? 'move' : 'rotate'}; scroll or pinch to zoom. Select Front, Rear, West side, or East side for elevations.` : walking
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

  const ambientLight = new THREE.AmbientLight('#ffffff', 2.5);
  scene.add(ambientLight);
  const studioFill = new THREE.PointLight('#ffffff', 650, 0, 2);
  studioFill.position.set(25, 32, 29);
  scene.add(studioFill);
  const mudroomKeyLight = new THREE.SpotLight('#fff3e3', 120, 24, Math.PI / 2.6, 1, 2);
  mudroomKeyLight.name = 'Mudroom soft interior study light';
  mudroomKeyLight.position.set(39.2, 7.6, 19.6);
  mudroomKeyLight.target.position.set(43.4, 3.4, 22.85);
  mudroomKeyLight.castShadow = true;
  mudroomKeyLight.shadow.mapSize.set(2048, 2048);
  mudroomKeyLight.shadow.camera.near = 0.5;
  mudroomKeyLight.shadow.camera.far = 24;
  mudroomKeyLight.shadow.bias = -0.00015;
  mudroomKeyLight.shadow.normalBias = 0.006;
  mudroomKeyLight.shadow.radius = 4;
  mudroomKeyLight.shadow.blurSamples = 12;
  mudroomKeyLight.visible = false;
  scene.add(mudroomKeyLight, mudroomKeyLight.target);
  const kitchenKeyLight = new THREE.DirectionalLight('#fff8ed', 1.5);
  kitchenKeyLight.name = 'Kitchen directional surface study light';
  kitchenKeyLight.visible = false;
  scene.add(kitchenKeyLight, kitchenKeyLight.target);

  const mat = (color, roughness = 0.85) => new THREE.MeshStandardMaterial({ color, roughness });
  const cream = mat('#e9e0cd');
  const linen = mat('#b2b5a4');
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
    const edgeRadius = material.userData?.edgeRadiusFeet;
    const geometry = rounded ? new RoundedBoxGeometry(w, h, d, 3, Math.min(0.12, h / 3)) : edgeRadius ? new RoundedBoxGeometry(w, h, d, 3, Math.min(edgeRadius, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d);
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

  function toggleCabinet(front) {
    const operation = front.userData.interactiveCabinet;
    const target = operation.target ?? front;
    operation.open = !operation.open;
    const { x, y, z, rotation } = operation.closed;
    target.position.set(x, y, z);
    target.rotation.y = rotation;
    if (operation.kind === 'drawer') {
      const travel = operation.open ? operation.travel : 0;
      target.position.x += Math.sin(rotation) * travel;
      target.position.z += Math.cos(rotation) * travel;
    } else {
      const angle = operation.open ? operation.hingeSide * Math.PI / 2 : 0;
      const hinge = operation.hingeSide * front.userData.width / 2;
      target.rotation.y += angle;
      target.position.x += hinge * (Math.cos(rotation) - Math.cos(rotation + angle));
      target.position.z += hinge * (-Math.sin(rotation) + Math.sin(rotation + angle));
    }
    target.userData.shownClosed = !operation.open;
  }

  function prepareCabinetInteractions(root) {
    const fronts = [];
    root.traverse((part) => { if (part.userData.cabinetFront) fronts.push(part); });
    for (const front of fronts) {
      let existingOperation = false;
      for (let ancestor = front; ancestor; ancestor = ancestor.parent) {
        if (ancestor.userData.interactiveHouseDoor || ancestor.userData.interactiveCabinet) existingOperation = true;
      }
      if (existingOperation) continue;
      const drawerParent = front.parent.userData.travelFeet !== undefined ? front.parent : null;
      const target = drawerParent ?? front;
      const travel = drawerParent?.userData.travelFeet ?? front.userData.drawerTravelFeet;
      const pull = front.children.find((part) => part.name === 'Gold cabinet pull');
      const hingeSide = pull?.position.x ? -Math.sign(pull.position.x) : front.userData.hingeSide ?? -1;
      front.userData.interactiveCabinet = {
        kind: travel !== undefined ? 'drawer' : 'hinged', open: false, travel,
        hingeSide, ...(target !== front ? { target } : {}),
        closed: { x: target.position.x, y: target.position.y, z: target.position.z, rotation: target.rotation.y }
      };
      if (travel !== undefined && !drawerParent) {
        const depth = Math.max(0.4, travel - 0.1);
        const width = front.userData.width - 0.15;
        const height = front.userData.drawerBoxHeightFeet ?? Math.min(0.4, front.userData.height - 0.12);
        const floorY = front.userData.drawerFloorY ?? -height / 2;
        const wallY = floorY + height / 2;
        box(front, 0, floorY, -depth / 2 - 0.05, width, 0.04, depth, cabinetRailFinish).name = 'Pull-out drawer floor';
        for (const side of [-1, 1]) {
          box(front, side * (width - 0.04) / 2, wallY, -depth / 2 - 0.05, 0.04, height, depth, cabinetFinish).name = 'Pull-out drawer side';
        }
        box(front, 0, wallY, -depth - 0.03, width - 0.08, height, 0.04, cabinetFinish).name = 'Pull-out drawer back';
      }
    }
    const bodies = [];
    root.traverse((part) => { if (part.userData.cabinetBody) bodies.push(part); });
    for (const body of bodies) {
      const { width, height, depth } = body.geometry.parameters;
      const axis = body.userData.cabinetBody;
      const panel = 0.0625;
      body.geometry.dispose();
      body.geometry = new THREE.BufferGeometry();
      for (const side of [-1, 1]) {
        box(body, 0, side * (height - panel) / 2, 0, width, panel, depth, body.material).name = 'Cabinet top or bottom';
        if (!axis.startsWith('x') || side !== (axis.endsWith('+') ? 1 : -1)) {
          box(body, side * (width - panel) / 2, 0, 0, panel, height - 2 * panel, depth, body.material).name = 'Cabinet side';
        }
        if (!axis.startsWith('z') || side !== (axis.endsWith('+') ? 1 : -1)) {
          box(body, 0, 0, side * (depth - panel) / 2, width - 2 * panel, height - 2 * panel, panel, body.material).name = 'Cabinet back or side';
        }
      }
      delete body.userData.cabinetBody;
    }
  }

  function singlePanelDoor(parent, x, y, z, width, height, depth, material = windowTrim, rotation = 0) {
    const leaf = new THREE.Group();
    leaf.name = 'Single recessed-panel interior door';
    leaf.position.set(x, y, z);
    leaf.rotation.y = rotation;
    leaf.userData = { doorStyle: 'Single recessed panel', width, height, depth, finishMatchesTrim: true };
    parent.add(leaf);
    const stile = Math.min(4.5 / 12, width * 0.22), topRail = 5 / 12, bottomRail = 9 / 12;
    for (const side of [-1, 1]) box(leaf, side * (width - stile) / 2, 0, 0, stile, height, depth, material).name = 'Interior door full-height stile';
    box(leaf, 0, (height - topRail) / 2, 0, width - 2 * stile, topRail, depth, material).name = 'Interior door top rail';
    box(leaf, 0, -(height - bottomRail) / 2, 0, width - 2 * stile, bottomRail, depth, material).name = 'Interior door bottom rail';
    box(leaf, 0, (bottomRail - topRail) / 2, 0, width - 2 * stile, height - topRail - bottomRail, depth * 0.45, material).name = 'Interior door single recessed field';
    return leaf;
  }

  function shakerFront(parent, x, y, z, width, height, rotation = 0) {
    const front = new THREE.Group();
    front.name = 'Full-overlay Shaker cabinet front';
    front.userData = { construction: 'Frameless', style: 'Shaker', finish: 'Stained white oak', width, height, cabinetFront: true };
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
  const windowWallDatums = [];
  const windowInstallations = [];
  // Resolve the real finished wall face, not the frame group's often-offset origin.
  function windowFaceDepth(parent, x, bottom, rotation, side, datums = windowWallDatums, z = 0) {
    parent.updateWorldMatrix(true, false);
    const origin = parent.localToWorld(new THREE.Vector3(x, bottom, z));
    const normal = new THREE.Vector3(Math.sin(rotation), 0, Math.cos(rotation)).transformDirection(parent.matrixWorld).multiplyScalar(side);
    const candidates = datums.map((wall) => {
      const { x1, z1, x2, z2, thickness = 0.35 } = wall;
      const length = Math.hypot(x2 - x1, z2 - z1);
      const dx = (x2 - x1) / length, dz = (z2 - z1) / length;
      const along = (origin.x - x1) * dx + (origin.z - z1) * dz;
      const distance = (x1 - origin.x) * normal.x + (z1 - origin.z) * normal.z;
      return { valid: Math.abs(dx * normal.x + dz * normal.z) < 0.001 && along >= -0.01 && along <= length + 0.01 && Math.abs(distance) < 0.3, distance, depth: distance + thickness / 2 };
    }).filter((candidate) => candidate.valid).sort((a, b) => Math.abs(a.distance) - Math.abs(b.distance));
    if (!candidates.length) throw new Error(`No finished wall datum for window at ${origin.x}, ${origin.z}`);
    return candidates[0].depth;
  }
  function openingCasing(parent, x, bottom, width, height, faceDepth, side = 1, window = false, sillOptions = {}) {
    const casing = new THREE.Group();
    casing.name = window ? 'Craftsman window casing' : 'Craftsman opening casing';
    casing.position.set(x, bottom, side * faceDepth);
    casing.rotation.y = side === -1 ? Math.PI : 0;
    const sideWidth = sillOptions.sideWidth ?? casingSideWidth;
    casing.userData = { width, height, window, side, sideWidthInches: sideWidth * 12, headerHeightInches: 5.5 };
    parent.add(casing);
    const reveal = casingReveal;
    const outerWidth = width + 2 * (sideWidth + reveal);
    function part(name, x, y, z, w, h, d, material = sillOptions.casingMaterial ?? windowTrim, rounded = false) {
      const mesh = box(casing, x, y, z, w, h, d, material, rounded);
      mesh.name = name;
      const worldY = mesh.getWorldPosition(new THREE.Vector3()).y;
      mesh.userData = { bottom: worldY - h / 2, top: worldY + h / 2, offsetY: worldY - y };
      walls.push(mesh);
    }
    if (window) {
      // Applied trim surrounds the recessed sill without forming a projecting stool.
      casing.name = 'Flush white window returns';
      const depth = 6 / 12, thickness = 1 / 12;
      part('White inset window sill', 0, -thickness / 2, -depth / 2, width, thickness, depth, windowTrim);
      for (const edge of [-1, 1])
        part('White drywall jamb return', edge * (width / 2 + 0.025), height / 2, -depth / 2, 0.05, height, depth, windowTrim);
      part('White drywall head return', 0, height + 0.025, -depth / 2, width + 0.1, 0.05, depth, windowTrim);
      for (const edge of [-1, 1])
        part('White casing side board', edge * (width / 2 + reveal + sideWidth / 2),
          (height + reveal - thickness) / 2, 0.03125, sideWidth, height + reveal + thickness, 0.0625, windowTrim);
      if (sillOptions.bottomBoard !== false) part('White casing flat bottom board', 0, -thickness - sideWidth / 2, 0.03125, outerWidth, sideWidth, 0.0625, windowTrim);
      part('White casing header', 0, height + reveal + 5.5 / 24, 0.03125, outerWidth, 5.5 / 12, 0.0625, windowTrim);
      part('White casing header bead', 0, height + reveal + 0.03125, 0.05, outerWidth + 0.0625, 0.0625, 0.1, windowTrim);
      part('White casing projecting cap', 0, height + reveal + 5.5 / 12 + 0.0416667, 0.0625, outerWidth + 0.125, 1 / 12, 0.125, windowTrim);
      // Continue solid support around the complete frame envelope outside
      // the recess, rather than hanging the frame beyond a shallow wall.
      for (const edge of [-1, 1]) {
        part('Window solid installation jamb allowance', edge * (width / 2 + 0.05), height / 2, -depth - 0.12, 0.1, height, 0.24, windowTrim);
        part('Window solid installation head/sill allowance', 0, edge < 0 ? -thickness / 2 : height + 0.025,
          -depth - 0.12, width + 0.2, edge < 0 ? thickness : 0.05, 0.24, windowTrim);
      }
      casing.userData = { window: true, width, height, side, installationConcept: true };
      return;
    }
    for (const edge of [-1, 1]) {
      const legBottom = sillOptions.legBottom ?? 0;
      part('White casing side board', edge * (width / 2 + reveal + sideWidth / 2), (height + reveal + legBottom) / 2, 0.03125, sideWidth, height + reveal - legBottom, 0.0625);
    }
    part('White casing header', 0, height + reveal + 5.5 / 24, 0.03125, outerWidth, 5.5 / 12, 0.0625);
    part('White casing header bead', 0, height + reveal + 0.03125, 0.05, outerWidth + 0.0625, 0.0625, 0.1);
    part('White casing projecting cap', 0, height + reveal + 5.5 / 12 + 0.0416667, 0.0625, outerWidth + 0.125, 1 / 12, 0.125);
  }

  const baseTrimSections = [];
  function wall(x1, z1, x2, z2, furnished = false, openings = [], height = ceilingHeight, trimSides = [-1, 1], quartzSide = 0, base = 0, casingOptions = {}) {
    windowWallDatums.push({ x1, z1, x2, z2, thickness: 0.35 });
    const length = Math.hypot(x2 - x1, z2 - z1);
    const group = new THREE.Group();
    group.position.set(x1, 0, z1);
    group.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    (furnished ? scene : shell).add(group);
    function baseTrim(start, end, mesh) {
      const casingWidth = (casingOptions.sideWidth ?? casingSideWidth) + casingReveal;
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
      // Real void between thin skins: the closed pocket leaf must not pass
      // through a solid wall. Keep the existing wall/trim visibility registry.
      const pocket = casingOptions.pocket;
      if (pocket && bottom === 0 && start < pocket.x + pocket.w && end > pocket.x) {
        const a = Math.max(start, pocket.x), b = Math.min(end, pocket.x + pocket.w);
        const saved = casingOptions.pocket;
        delete casingOptions.pocket;
        part(start, a, bottom, top);
        part(b, end, bottom, top);
        part(a, b, 8.3, top);
        casingOptions.pocket = saved;
        for (const side of [-1, 1]) {
          const skin = box(group, (a + b) / 2, 4.15, side * 0.15, b - a, 8.3, 0.05, wallMaterial);
          skin.name = 'Guest closet pocket nonpenetrating wall skin';
          skin.userData = { bottom: 0, top: 8.3, quartzSide };
          walls.push(skin);
          if (side === -1) baseTrim(a, b, skin);
        }
        return;
      }
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
      if ((bottom === 0 || bottom === base) && !(z1 === groundFrontWallZ && z2 === groundFrontWallZ && start === 13.1 && end === 18.1)) {
        for (const side of trimSides) openingCasing(group, (start + end) / 2, bottom, end - start, top - bottom, 0.175, side, false,
          { ...casingOptions, legBottom: casingOptions.splitFloor ? (side === -1 ? 0.0405 : -garageRise) : 0 });
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
      // The guard abuts this painted wall end; a projecting trim return would cross its post and bars.
      cover(new THREE.Vector2(guestEntry.stairGuard.x, guestEntry.stairGuard.z - 0.175), new THREE.Vector2(guestEntry.stairGuard.x, guestEntry.stairGuard.z + 0.175), new THREE.Vector2(1, 0));
      // Keep timber trim out of the guest shower and behind fitted bathroom fixtures.
      cover(new THREE.Vector2(guestSuite.shower.x, guestSuite.shower.z - 0.025), new THREE.Vector2(guestSuite.shower.x + guestSuite.shower.w, guestSuite.shower.z - 0.025), new THREE.Vector2(0, 1));
      cover(new THREE.Vector2(guestSuite.bathroom.x + 0.175, guestSuite.shower.z), new THREE.Vector2(guestSuite.bathroom.x + 0.175, guestSuite.shower.z + guestSuite.shower.d), new THREE.Vector2(1, 0));
      cover(new THREE.Vector2(31.025, guestSuite.shower.z), new THREE.Vector2(31.025, guestSuite.shower.z + guestSuite.shower.d), new THREE.Vector2(-1, 0));
      cover(new THREE.Vector2(31.025, guestSuite.toilet.z - 0.9), new THREE.Vector2(31.025, guestSuite.toilet.z + 0.9), new THREE.Vector2(-1, 0));
      cover(new THREE.Vector2(31.025, guestSuite.vanity.z - 1.6), new THREE.Vector2(31.025, guestSuite.vanity.z + 1.6), new THREE.Vector2(-1, 0));
      // Fireplace stone only (built-ins removed): base trim runs continuously from each wall end to the stone side return.
      cover(new THREE.Vector2(0.175, livingFeatureWall.centerZ - fireplaceStoneHalfWidth), new THREE.Vector2(0.175, livingFeatureWall.centerZ + fireplaceStoneHalfWidth), new THREE.Vector2(1, 0));
      // Fitted mudroom joinery meets these wall faces without baseboards behind it.
      cover(new THREE.Vector2(37.675, 15.175), new THREE.Vector2(44.9 - 8 / 12 - 0.175, 15.175), new THREE.Vector2(0, 1));
      cover(new THREE.Vector2(37.675, 15.175), new THREE.Vector2(37.675, 17.54), new THREE.Vector2(1, 0));
      cover(new THREE.Vector2(44.9 - 8 / 12 - 0.175, 15.175), new THREE.Vector2(44.9 - 8 / 12 - 0.175, 26.725), new THREE.Vector2(-1, 0));
      cover(new THREE.Vector2(43.075 - 8 / 12, 26.725), new THREE.Vector2(44.9 - 8 / 12 - 0.175, 26.725), new THREE.Vector2(0, -1));
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
    const boardProfile = new THREE.Shape();
    boardProfile.moveTo(0, 0);
    boardProfile.lineTo(depth, 0);
    boardProfile.lineTo(depth, 8 / 12);
    boardProfile.lineTo(0, 8 / 12);
    boardProfile.closePath();
    scene.updateMatrixWorld(true);
    for (const run of edges) {
      const length = run.a.distanceTo(run.b);
      const startMiter = miter(run, run.a);
      const endMiter = miter(run, run.b);
      const inverse = run.group.matrixWorld.clone().invert();
      const geometry = new THREE.ExtrudeGeometry(boardProfile, { depth: length, bevelEnabled: false, curveSegments: 8 });
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
      mesh.name = '8 inch interior baseboard';
      mesh.userData = { heightInches: 8, thicknessInches: 0.75, side: run.side, startFeet: run.a.toArray(), endFeet: run.b.toArray(), startMiter: startMiter.toArray(), endMiter: endMiter.toArray() };
      mesh.castShadow = mesh.receiveShadow = true;
      run.group.add(mesh);
    }
  }

  function feet(value) {
    const inches = Math.round(value * 12);
    return `${Math.floor(inches / 12)}' ${inches % 12}"`;
  }

  function roomDimensions(text, width, depth, irregular = false) {
    const kidsArea = text === 'Kids room (L-shaped)' ? getGroundFloorDefaultPlan().floors.filter(({ room }) => /^Kids room/.test(room ?? '')).reduce((sum, { w, d }) => sum + w * d, 0) : 0;
    const dimensions = kidsArea ? `${kidsArea.toFixed(2)} sq ft, stepped boundary (west z37.2 / east z33.6)` : `~ ${feet(width)} x ${feet(depth)}${irregular ? ' max' : ''}`;
    const item = document.createElement('li');
    item.textContent = `${text}: ${dimensions}`;
    document.getElementById('room-dimension-summary').append(item);
  }

  const kitchenWallLeft = 26.5;
  const kitchenWallRight = 37.5;
  const groundFrontLayout = getGroundFrontLayout();
  const groundFrontWallZ = groundFrontLayout.wallZ;
  const frontPorchEdgeZ = groundFrontLayout.porchEdgeZ;
  const cookingWallShiftX = kitchenWallRight - 38;
  const kitchenWindowWallZ = 7;
  const kitchenSinkRunZ = kitchenWindowWallZ + 1.2;
  const prepCounterZ = kitchenWindowWallZ + 1.25;
  const kitchenSinkX = (kitchenWallLeft + kitchenWallRight) / 2;
  const kitchenPassages = getKitchenPassageLayout();
  const kitchenSideOpenings = kitchenPassages.openings;
  const cooktopRunStartZ = kitchenWindowWallZ + kitchenSideOpenings[0][1];
  const cooktopRunEndZ = kitchenWindowWallZ + kitchenSideOpenings[1][0];
  const cooktopCenterZ = (cooktopRunStartZ + cooktopRunEndZ) / 2;
  const kitchenCounterWindowBank = getKitchenWindowBankLayout();
  const kitchenSinkWindowHeight = kitchenCounterWindowBank.height;
  const kitchenSinkWindowSill = kitchenCounterWindowBank.sill;
  const kitchenSinkWindows = kitchenCounterWindowBank.units;
  const prepSinkX = 47.4;
  const prepWindows = getPrepWindowLayout();
  const prepCounterWindows = prepWindows.filter((window) => window.z === kitchenWindowWallZ);
  const prepCounterWindowBank = getPrepWindowBankLayout();
  const prepEndWindow = prepWindows.find((window) => window.x === 55.5);
  const kidsRoomNorthZ = 26.725 - 25 / 12 - 0.08 + 0.175;
  const kidsRoom = { x: 19, z: kidsRoomNorthZ, width: 10, southWidth: 12.2, depth: 34.6 - kidsRoomNorthZ };
  const kidsDoorway = { x: kidsRoom.x, z: 27, width: 4.5, height: 8 };
  const officeEntry = { x: 12.2, z: 45.25, width: 5, height: 8 };
  const livingFeatureWall = getLivingRoomFeatureLayout();
  const livingWindowCenters = livingFeatureWall.windowCenters;
  const livingCenterZ = livingFeatureWall.centerZ;
  const livingWindowWidth = livingFeatureWall.fireplaceWindows.width;
  const livingWindowSill = livingFeatureWall.fireplaceWindows.sill;
  const livingWindowHead = livingFeatureWall.fireplaceWindows.head;
  const livingSideWindowBank = livingFeatureWall.sideWindowBank;
  const livingSideWindowSill = livingSideWindowBank.sill;
  const livingSideWindows = livingSideWindowBank.units;
  const livingSideSconceCenters = [0.95, 13.2 - 0.95];
  const fireplaceFaceX = 1.38;
  // Outer face of each stone side return (October 27 owner decision: no fireplace-side built-ins).
  const fireplaceStoneHalfWidth = 3.06;
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
  const guestSuite = getGuestSuiteLayout();
  const garageClerestories = getGarageClerestoryLayout(garageFloorY);
  const powderNorthZ = guestEntry.powder.z;
  const powderEntryWallZ = guestEntry.alcove.z;
  const officeNorthZ = guestEntry.officeNorthZ;

  // Stepped footprint and room adjacencies follow the user's attached plan.
  floor(0, 8, 13.2, 17.7, true, scene);
  floor(13.2, -0.1, 13.675, 8.1, true, scene);
  floor(13.2, 8, 5.8, 17.7, true, scene);
  floor(19, 8, 7.5, kidsRoom.z - 8, true, scene);
  floor(26.875, kitchenWindowWallZ, 10.625, 8 - kitchenWindowWallZ, true, scene);
  floor(26.5, 8, 11, kidsRoom.z - 8, true, scene);
  floor(29, kidsRoom.z, 8.5, 26.9 - kidsRoom.z, true, scene);
  floor(37.5, kitchenWindowWallZ, 7.9, 15 - kitchenWindowWallZ, true, scene);
  floor(45.4, kitchenWindowWallZ, 10.1, 15 - kitchenWindowWallZ, true, scene);
  for (const { x, z, w, d } of garageFloorAreas) floor(x, z, w, d, false, shell, false, garageFloorY);
  [
    [37.5, 15, 7.4 - 8 / 12, 11.9],
    [0, 25.7, 12.2, stairOpening.z - 25.7, true],
    [0, stairOpening.z, stairOpening.x, stairOpening.depth, true],
    [stairOpening.x + stairOpening.width, stairOpening.z, 12.2 - stairOpening.x - stairOpening.width, stairOpening.depth, true],
    [0, stairOpening.z + stairOpening.depth, 12.2, powderNorthZ - stairOpening.z - stairOpening.depth, true],
    [12.2, 25.7, kidsRoom.x - 12.2, 8.9, true],
    [kidsRoom.x, kidsRoom.z, 6.75, kidsRoom.depth, true],
    [25.75, kidsRoom.z, 3.25, guestSuite.bathroom.z - kidsRoom.z, true],
    [29, 26.9, 2.2, guestSuite.bathroom.z - 26.9, true],
    [12.2, 34.6, 6.8, groundFrontWallZ - 34.6, true], [0, powderNorthZ, 7.1, guestEntry.powder.d, true], [7.1, powderEntryWallZ, 5.1, guestEntry.alcove.d, true],
    [0, officeNorthZ, 12.2, groundFrontWallZ - officeNorthZ, true],
    ...[guestSuite.kidsExtension, guestSuite.closet].map(({ x, z, w, d }) => [x, z, w, d, true]),
    [guestSuite.bathroom.x, guestSuite.bathroom.z, guestSuite.bathroom.w, guestSuite.bathroom.d],
    [19, guestSuite.bathroomDoor.z, 12.2, groundFrontWallZ - guestSuite.bathroomDoor.z, true],
    [0, groundFrontWallZ, 31.2, groundFrontLayout.porchDepth, false, false],
    [7.1, guestEntry.coatCloset.z, 5.1, guestEntry.coatCloset.d, true]
  ].forEach(([x, z, w, d, hardwood = false, interior = true]) => floor(x, z, w, d, hardwood, shell, interior));

  [
    [0, 8, 13.2, 8, true, [[livingSideWindowBank.x - livingSideWindowBank.width / 2, livingSideWindowBank.x + livingSideWindowBank.width / 2, livingSideWindowSill, livingWindowHead]]],
    [13.2, -0.1, 13.2, 8, true, [[livingFeatureWall.patioDoor.z - 1.5 + 0.1, livingFeatureWall.patioDoor.z + 1.5 + 0.1, 0, 8]]],
    [13.2, -0.1, 26.875, -0.1, true, [[3.8375, 9.8375, 3, 8]]],
    [26.875, -0.1, 26.875, kitchenWindowWallZ, true, [[0.6, 6.6, 3, 8]], ceilingHeight, [1]],
    [26.875, kitchenWindowWallZ, kitchenWallRight, kitchenWindowWallZ, true, [[kitchenCounterWindowBank.x - kitchenCounterWindowBank.width / 2 - 26.875, kitchenCounterWindowBank.x + kitchenCounterWindowBank.width / 2 - 26.875, kitchenSinkWindowSill, kitchenSinkWindowSill + kitchenSinkWindowHeight]], ceilingHeight, [-1, 1], 1],
    [37.5, kitchenWindowWallZ, 55.5, kitchenWindowWallZ, false, [prepCounterWindowBank].map(({ x, openingWidth, openingSill, openingHeight }) => [x - openingWidth / 2 - 37.5, x + openingWidth / 2 - 37.5, openingSill, openingSill + openingHeight])],
    [55.5, kitchenWindowWallZ, 55.5, 15, false, [[prepEndWindow.z - prepEndWindow.openingWidth / 2 - kitchenWindowWallZ, prepEndWindow.z + prepEndWindow.openingWidth / 2 - kitchenWindowWallZ, prepEndWindow.openingSill, prepEndWindow.openingSill + prepEndWindow.openingHeight]], ceilingHeight, [1]],
    [55.5, 15, 55.5, 49, false, [...garageClerestories.map(({ z, width, sill, height }) => [z - width / 2 - 15, z + width / 2 - 15, sill, sill + height]), [29, 32, garageFloorY, garageFloorY + 8]], ceilingHeight, [1], 0, garageFloorY],
    [55.5, 49, 31.2, 49, false, [[2.5, 11.5, garageFloorY, garageFloorY + 8], [14, 23, garageFloorY, garageFloorY + 8]], ceilingHeight, [1], 0, garageFloorY],
    [31.2, 49, 31.2, groundFrontWallZ], [31.2, groundFrontWallZ, 31.2, frontPorchEdgeZ, false, [], 2.6], [31.2, frontPorchEdgeZ, 0, frontPorchEdgeZ, false, [], 2.6],
    [0, frontPorchEdgeZ, 0, groundFrontWallZ, false, [], 2.6],     [0, groundFrontWallZ, 0, livingFeatureWall.wallEndZ, false, [
      [groundFrontWallZ - 49 - 2, groundFrontWallZ - 49 + 2, 3, 8],
      ...[...guestEntry.windows].reverse().map(({ z, openingWidth, openingSill, openingHeight }) => [groundFrontWallZ - z - openingWidth / 2, groundFrontWallZ - z + openingWidth / 2, openingSill, openingSill + openingHeight])
    ]],
    [0, livingFeatureWall.wallEndZ, 0, 8, true, [...livingWindowCenters].reverse().map((z) => [livingFeatureWall.wallEndZ - z - livingWindowWidth / 2, livingFeatureWall.wallEndZ - z + livingWindowWidth / 2, livingWindowSill, livingWindowHead])],
    [kidsRoom.x, kidsRoom.z, kidsRoom.x + kidsRoom.width, kidsRoom.z, true],
    [kidsDoorway.x, kidsRoom.z, kidsDoorway.x, 34.6, true, [[kidsDoorway.z - kidsRoom.z, kidsDoorway.z - kidsRoom.z + kidsDoorway.width, 0, kidsDoorway.height]]],
    [29, kidsRoom.z, 29, 26.9, true, [], ceilingHeight, [1]], [0, powderNorthZ, guestEntry.stairGuard.x, powderNorthZ],
    [7.1, powderNorthZ, 7.1, officeNorthZ, false, [[guestEntry.powderDoor.z - powderNorthZ, guestEntry.powderDoor.z - powderNorthZ + guestEntry.powderDoor.width, 0, guestEntry.powderDoor.height]]],
    [7.1, guestEntry.closetDoor.z, 12.2, guestEntry.closetDoor.z, false, [[guestEntry.closetDoor.x - 7.1, guestEntry.closetDoor.x - 7.1 + guestEntry.closetDoor.width, 0, guestEntry.closetDoor.height]]],
    [12.2, guestEntry.coatCloset.z, 12.2, officeNorthZ],
    [officeEntry.x, officeNorthZ, officeEntry.x, groundFrontWallZ, false, [[officeEntry.z - officeEntry.width / 2 - officeNorthZ, officeEntry.z + officeEntry.width / 2 - officeNorthZ, 0, officeEntry.height]]],
    [0, officeNorthZ, 12.2, officeNorthZ], [0, groundFrontWallZ, 31.2, groundFrontWallZ, false, [...getGroundFrontWindows().map(w => [w.center - w.width / 2, w.center + w.width / 2, w.sill, w.sill + w.height]), [13.1, 18.1, 0, 8]].sort((a, b) => a[0] - b[0]), ceilingHeight, [-1]],
    [19, 34.6, 19, groundFrontWallZ, false, [[guestSuite.bedroomDoor.z - 34.6, guestSuite.bedroomDoor.z + guestSuite.bedroomDoor.width - 34.6, 0, 8]]],
    ...getGroundFloorDefaultPlan().walls.filter(([name]) => ['Closet north', 'Closet east', 'Closet south', 'Bathroom south', 'Bathroom north'].includes(name)).map(([name, x1, z1, x2, z2, openings = []]) => [x1, z1, x2, z2, false, openings, ceilingHeight, [-1, 1], 0, 0, { sideWidth: 2.5 / 12, ...(name === 'Closet south' ? { pocket: { x: guestSuite.closetDoor.pocket.x - x1, w: guestSuite.closetDoor.pocket.w } } : {}) }]),
    [31.2, 34.6, 31.2, 49, false, [], ceilingHeight, [-1, 1], 0, garageFloorY], [31.2, 26.9, 31.2, 34.6, false, [], ceilingHeight, [-1, 1], 0, garageFloorY],
    [29, 26.9, 29.1875, 26.9, true],
    [29.1875, 26.9, 31.2, 26.9, true],
    [31.2, 26.9, 37.3, 26.9, true, [], ceilingHeight, [1], -1, garageFloorY],
    [37.3, 26.9, 37.5, 26.9, true, [], ceilingHeight, [-1, 1], -1, garageFloorY],
    [37.5, kitchenWindowWallZ, 37.5, 25.3, true, kitchenSideOpenings, ceilingHeight, [-1, 1], 1],
    [37.5, 25.3, 37.5, 26.9, true, [], ceilingHeight, [-1], 1], [37.5, 15, 44.9 - 8 / 12, 15],
    [44.9 - 8 / 12, 15, 55.5, 15, false, [], ceilingHeight, [-1, 1], 0, garageFloorY],
    [44.9 - 8 / 12, 15, 44.9 - 8 / 12, 26.9, false, [], ceilingHeight, [-1, 1], 0, garageFloorY],
    // Stock 1x3 legs on BOTH faces leave the west corner clear, including the cap.
    // Garage legs land on the centered tread; mudroom legs land on finished tile.
    [37.5, 26.9, 44.9 - 8 / 12, 26.9, false, [[garageEntry.x - 37.5, garageEntry.x - 37.5 + garageEntry.width, 0, garageEntry.height]], ceilingHeight, [-1, 1], 0, garageFloorY, { sideWidth: 2.5 / 12, splitFloor: true }]
  ].forEach((segment) => wall(...segment));

  joinWallCorners();
  buildBaseTrim();

  [
    ['Living room', 13.2, 17.7], ['Dining room', 13.675, 8.1], ['Kitchen', 11, 26.9 - kitchenWindowWallZ],
    ['Hall', 13.3, kidsRoom.z - 8], ['Prep kitchen', 18, 15 - kitchenWindowWallZ, true], ['Mudroom', 7.4 - 8 / 12, 11.9],
    ['Garage', 26.5, 34, true], ['Kids room (L-shaped)', kidsRoom.southWidth, kidsRoom.depth, true],
    ['Powder room', 7.1, guestEntry.powder.d], ['Guest coat closet', 5.1, guestEntry.coatCloset.d], ['Guest entry alcove', 5.1, guestEntry.alcove.d], ['Office', 12.2, groundFrontWallZ - officeNorthZ],
    ['Guest walk-in closet', guestSuite.closet.w, guestSuite.closet.d], ['Guest shower bathroom', guestSuite.bathroom.w, guestSuite.bathroom.d],
    ['Bedroom', 12.2, groundFrontWallZ - 43.2], ['Porch', 31.2, groundFrontLayout.porchDepth]
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
  const fireboxBottom = 1;
  const fireboxHeight = 1.25;
  const firebox = box(scene, fireplaceFaceX + 0.02, fireboxBottom + fireboxHeight / 2, livingCenterZ, 0.12, fireboxHeight, 4.6, black);
  firebox.name = 'Fireplace firebox';
  firebox.userData = { bottomInches: 12, heightInches: 15, clearanceVerified: false, provisional: true };
  const ember = new THREE.MeshStandardMaterial({ color: '#c7793e', emissive: '#c65c20', emissiveIntensity: 1 });
  box(scene, fireplaceFaceX + 0.1, fireboxBottom + 0.235, livingCenterZ, 0.06, 0.08, 4.1, ember).name = 'Glowing fireplace ember bed';
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
      flame.position.set(fireplaceFaceX + (inner ? 0.145 : 0.14), fireboxBottom + 0.265, livingCenterZ + (index - 8) * 0.23);
      if (inner) flame.scale.set(0.5, 0.65, 1);
      fire.add(flame);
    }
  }
  const mantel = box(scene, fireplaceFaceX + 0.25, 4.15, livingCenterZ, 0.65, 0.3, 6.2, cabinetRailFinish);
  mantel.name = 'White oak fireplace mantel';
  mantel.userData = { widthInches: 74.4, thicknessInches: 3.6, bottomInches: 48, clearanceVerified: false, provisional: true };
  box(scene, fireplaceFaceX + 0.06, 5.8, livingCenterZ, 0.15, 2.7, 4.6, black, true).name = 'Fireplace television';
  // Fireplace-side built-ins removed entirely (October 27 owner decision); equipment/charging storage location is undecided.
  const livingSconces = new THREE.Group();
  livingSconces.name = 'Living-room wall sconces';
  livingSconces.userData = { fixtures: 2, placement: 'Outer ends of the grouped living-room side windows', finish: 'Ivory wall-backed half-oval fabric shades and rounded brass backplates', productVerified: false, provisional: true };
  scene.add(livingSconces);
  const sconceGlow = new THREE.MeshStandardMaterial({ color: '#fff0d7', emissive: '#ffd5a0', emissiveIntensity: 0.6, roughness: 0.65 });
  function wallSconce(parent, x, z, rotation, fabricShade = true) {
    const sconce = new THREE.Group();
    sconce.name = fabricShade ? 'Living brass and ivory fabric-shade sconce' : 'Warm vertical wall sconce';
    sconce.position.set(x, 6.3, z);
    sconce.rotation.y = rotation;
    parent.add(sconce);
    if (fabricShade) {
      sconce.userData = { styleReference: 'Owner Aleena ivory wall-backed half-oval shade photo', widthInches: 7.9, heightInches: 10.2, projectionInches: 4, projectionVerified: false, manufacturerDimensionsVerified: false, electricalListingVerified: false, colorTemperatureKelvin: 2700 };
      box(sconce, 0.04, 0, 0, 0.08, 10.2 / 12, 4.8 / 12, brass, true).name = 'Aleena rounded brass backplate';
      const fabric = new THREE.MeshStandardMaterial({ color: '#eee4ce', roughness: 0.95, emissive: '#ffd5a0', emissiveIntensity: 0.15, side: THREE.DoubleSide });
      const shadePositions = [];
      for (let segment = 0; segment < 32; segment++) {
        const a = Math.PI * segment / 32, b = Math.PI * (segment + 1) / 32;
        const x1 = 0.01 + (4 / 12 - 0.01) * Math.sin(a), z1 = 7.9 / 24 * Math.cos(a);
        const x2 = 0.01 + (4 / 12 - 0.01) * Math.sin(b), z2 = 7.9 / 24 * Math.cos(b);
        const bottom = -0.165, top = bottom + 7.08 / 12;
        shadePositions.push(x1, bottom, z1, x2, bottom, z2, x2, top, z2, x1, bottom, z1, x2, top, z2, x1, top, z1);
      }
      const shadeGeometry = new THREE.BufferGeometry();
      shadeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(shadePositions, 3));
      shadeGeometry.computeVertexNormals();
      const shade = new THREE.Mesh(shadeGeometry, fabric);
      shade.name = 'Aleena ivory wall-backed half-oval fabric shade';
      sconce.add(shade);
    } else {
      box(sconce, 0, 0, 0, 0.05, 1.55, 0.22, brass).name = 'Sconce gold backplate';
      cylinder(sconce, 0.14, 0, 0, 0.1, 1.2, sconceGlow).name = 'Warm opal sconce diffuser';
      for (const y of [-0.64, 0.64]) cylinder(sconce, 0.14, y, 0, 0.11, 0.08, brass).name = 'Sconce gold end cap';
    }
    const accentLight = new THREE.PointLight('#ffd3a0', 12, 5, 2);
    accentLight.name = 'Warm wall accent light';
    accentLight.position.set(fabricShade ? 0.2 : 0.35, fabricShade ? 0.05 : 0, 0);
    sconce.add(accentLight);
  }
  for (const [x, z, rotation] of livingSideSconceCenters.map((x) => [x, 8.205, -Math.PI / 2])) {
    wallSconce(livingSconces, x, z, rotation, true);
  }
  const diningSconces = new THREE.Group();
  diningSconces.name = 'Dining-room wall sconces';
  diningSconces.userData = { fixtures: 2, placement: 'Flanking the rear dining window', finish: 'Ivory wall-backed fabric shades and rounded brass backplates', chandelier: false, provisional: true };
  scene.add(diningSconces);
  for (const x of [15.4875, 24.5875]) wallSconce(diningSconces, x, 0.105, -Math.PI / 2);
  const kitchenSconces = new THREE.Group();
  kitchenSconces.name = 'Kitchen sink-wall end sconces';
  kitchenSconces.userData = { fixtures: 2, placement: 'Outside the kitchen window-bank ends', finish: 'Ivory wall-backed fabric shades and rounded brass backplates', provisional: true, productSelected: false };
  scene.add(kitchenSconces);
  const kitchenWindowTrimExtension = (3.5 + 0.125) / 12;
  const kitchenEndSconceCenters = [
    (kitchenWallLeft + 0.175 + kitchenSinkWindows[0].x - kitchenSinkWindows[0].width / 2 - kitchenWindowTrimExtension) / 2,
    (kitchenWallRight - 0.175 + kitchenSinkWindows[2].x + kitchenSinkWindows[2].width / 2 + kitchenWindowTrimExtension) / 2
  ];
  for (const x of kitchenEndSconceCenters) wallSconce(kitchenSconces, x, kitchenWindowWallZ + 0.205, -Math.PI / 2);
  const glass = new THREE.MeshStandardMaterial({ color: '#b3cad0', roughness: 0.15, metalness: 0.15, transparent: true, opacity: 0.52 });
  const privacyGlass = new THREE.MeshStandardMaterial({ color: '#e0e8e4', roughness: 1, metalness: 0 });
  privacyGlass.name = 'Obscured lower-half bathroom glazing - privacy concept';
  const windowExterior = windowTrim;
  function windowFrame(name, x, z, width, height, sill, rotation = 0, parent = scene, interiorSide = 1, options = {}) {
    const frame = new THREE.Group();
    frame.name = name;
    frame.position.set(x, sill, z);
    frame.rotation.y = rotation;
    const picture = options.picture === true;
    const fixed = options.fixed === true || picture;
    const exteriorFinish = 'White';
    const exteriorMaterial = options.whiteExterior ? windowTrim : windowExterior;
    // Group large openings without claiming these concept dimensions are catalog sizes.
    const intent = getWindowProductIntent(width, height, fixed, options.privacyLowerHalf);
    const columns = fixed ? 1 : intent.columns;
    const rows = fixed ? 1 : intent.rows;
    frame.userData = { manufacturer: !fixed || picture ? 'Andersen' : null, series: !fixed || picture ? '100 Series' : null, operation: picture ? 'fixed picture window' : fixed ? 'fixed door sidelight' : 'casement', geometry: 'simplified concept, not manufacturer CAD', standardSizeVerified: false, exteriorFinish, interiorFinish: 'White', interiorTrim: 'white', interiorSide, columns, rows, widthFeet: width, heightFeet: height, sillDepthInches: (options.depth ?? 0.25) * 12, sillMaterial: options.material ? 'quartz' : 'white trim', faucetNotchWidthInches: (options.notchWidth ?? 0) * 12 };
    frame.userData.casingMaterial = (options.casingMaterial ?? windowTrim).name;
    if (!options.fixed || picture) Object.assign(frame.userData, intent);
    if (options.singleHung) Object.assign(frame.userData, { operation: 'single-hung', grilles: 'upper sash only: four lights; clear lower sash', upperSash: 'fixed', lowerSash: 'slides vertically', productSelected: false, assemblyApproved: false, sizeReview: 'Dealer standard single-hung size, rough opening, grille and factory combination review required; nominal envelope only' });
    frame.userData.frontGrid = options.frontGrid === true;
    if (options.frontGrid) frame.userData.grilles = 'colonial 2 wide by 3 high per unit; conceptual';
    if (options.standardSizeCode) Object.assign(frame.userData, { nominalStudyCode: options.standardSizeCode, standardSizeCode: options.standardSizeCode, standardSizeVerified: false, productSelected: false });
    if (options.privacyLowerHalf) Object.assign(frame.userData, { privacyLowerHalf: true, privacyGlassTopFeet: sill + height / 2, privacyVerified: false });
    parent.add(frame);
    const isWindow = !fixed || picture;
    const faceDepth = isWindow ? windowFaceDepth(parent, x, sill, rotation, interiorSide, options.installationWalls, z) : 0.2;
    const normalOffset = isWindow ? interiorSide * (faceDepth - 0.5 - 0.12) : 0;
    if (isWindow) {
      frame.updateWorldMatrix(true, false);
      const center = frame.localToWorld(new THREE.Vector3(0, 0, normalOffset));
      windowInstallations.push({ name, x: center.x, y: center.y, z: center.z, width, height,
        openingId: options.casing === false ? parent.uuid : frame.uuid, units: columns * rows, picture, pictureUnits: intent.pictureColumns.length * rows, singleHung: options.singleHung === true });
      Object.assign(frame.userData, { sillDepthInches: 6, sillMaterial: 'white', sillThicknessInches: 1, sillInset: true, sillRoomProjectionInches: 0, installationConcept: true });
    }
    function ring(parent, w, h, border, depth, offset, material, name) {
      for (const side of [-1, 1]) {
        box(parent, side * (w - border) / 2, h / 2, offset, border, h, depth, material).name = name;
        box(parent, 0, side < 0 ? border / 2 : h - border / 2, offset, w - 2 * border, border, depth, material).name = name;
      }
    }
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const unitFixed = fixed || intent.pictureColumns.includes(column);
        const unit = new THREE.Group();
        unit.name = picture || (!fixed && unitFixed) ? 'Fixed picture window unit' : fixed ? 'Fixed sidelight unit' : 'Andersen 100 Series casement concept';
        const unitWidth = width / columns;
        const unitHeight = height / rows;
        unit.position.set(-width / 2 + (column + 0.5) * unitWidth, row * unitHeight, normalOffset);
        unit.userData = { operation: unitFixed ? 'fixed' : 'outward casement', shownClosed: true, widthFeet: unitWidth, heightFeet: unitHeight, provisional: true };
        frame.add(unit);
        ring(unit, unitWidth, unitHeight, 0.12, 0.12, -interiorSide * 0.06, exteriorMaterial, `${exteriorFinish} exterior window frame`);
        ring(unit, unitWidth, unitHeight, 0.12, 0.12, interiorSide * 0.06, windowTrim, 'White interior window frame');
        if (options.singleHung) {
          unit.name = 'Andersen 100 Series single-hung concept';
          Object.assign(unit.userData, { operation: 'single-hung', upperSash: 'fixed', lowerSash: 'slides vertically' });
          addSingleHungSashes(unit, box, windowTrim, glass, unitWidth, unitHeight);
          continue;
        }
        const sash = new THREE.Group();
        sash.name = unitFixed ? 'Fixed glazing surround' : 'Closed side-hinged casement sash';
        sash.position.y = 0.135;
        unit.add(sash);
        const sashWidth = unitWidth - 0.27;
        const sashHeight = unitHeight - 0.27;
        ring(sash, sashWidth, sashHeight, 0.1, 0.08, -interiorSide * 0.04, exteriorMaterial, `${exteriorFinish} exterior sash`);
        ring(sash, sashWidth, sashHeight, 0.1, 0.08, interiorSide * 0.04, windowTrim, 'White interior sash');
        if (options.privacyLowerHalf) {
          const halfPaneHeight = (sashHeight - 0.2) / 2;
          box(sash, 0, 0.1 + halfPaneHeight / 2, 0, sashWidth - 0.2, halfPaneHeight, 0.04, privacyGlass).name = 'Frosted lower-half privacy pane';
          box(sash, 0, 0.1 + halfPaneHeight * 1.5, 0, sashWidth - 0.2, halfPaneHeight, 0.04, glass).name = 'Clear upper-half daylight pane';
        } else {
          box(sash, 0, sashHeight / 2, 0, sashWidth - 0.2, sashHeight - 0.2, 0.04, glass).name = unitFixed ? 'Fixed glazing pane' : 'Single casement glazing pane';
        }
        if (!unitFixed) {
          box(unit, 0, 0.2, interiorSide * 0.16, 0.28, 0.07, 0.08, windowTrim).name = 'White casement crank housing';
          box(unit, 0.08, 0.2, interiorSide * 0.23, 0.16, 0.045, 0.06, windowTrim).name = 'Casement crank handle';
          box(unit, unitWidth / 2 - 0.18, unitHeight * 0.4, interiorSide * 0.15, 0.05, 0.22, 0.06, windowTrim).name = 'Casement sash lock';
        }
      }
    }
    if (isWindow && options.frontGrid) {
      const grille = new THREE.Group();
      grille.position.z = normalOffset;
      frame.add(grille);
      addFrontWindowGrilles(grille, box, windowTrim, width, height, columns, rows);
    }
    if (isWindow && columns > 1) addWindowShadeDivisions(frame, box, windowTrim,
      Array.from({ length: columns - 1 }, (_, index) => -width / 2 + width * (index + 1) / columns), 0, height, faceDepth, interiorSide);
    if (options.casing !== false) openingCasing(frame, 0, 0, width, height, faceDepth, interiorSide, isWindow, options);
    return frame;
  }
  const livingWindowBank = new THREE.Group();
  livingWindowBank.name = livingSideWindowBank.name;
  livingWindowBank.position.set(livingSideWindowBank.x, 0, livingSideWindowBank.z + 0.1);
  livingWindowBank.userData = { windowOpening: true, unitCount: 3, assemblyApproved: false, structuralHeaderVerified: false, provisional: true };
  scene.add(livingWindowBank);
  for (const { name, x, width, height, sill, picture, singleHung } of livingSideWindows) {
    const frame = windowFrame(name, x - livingSideWindowBank.x, 0, width, height, sill, 0, livingWindowBank, 1, { picture, singleHung, casing: false });
    frame.userData.openingGroup = livingSideWindowBank.name;
  }
  openingCasing(livingWindowBank, 0, livingSideWindowBank.sill, livingSideWindowBank.width, livingSideWindowBank.height, windowFaceDepth(livingWindowBank, 0, livingSideWindowBank.sill, 0, 1), 1, true);
  const livingRevealFace = windowFaceDepth(livingWindowBank, 0, livingSideWindowBank.sill, 0, 1);
  addWindowShadeDivisions(livingWindowBank, box, windowTrim, [-1.25, 1.25], livingSideWindowBank.sill,
    livingSideWindowBank.height, livingRevealFace, 1, 'Living full-depth white shade-bay division');
  windowFrame('Dining rear window', 20.0375, 0, 6, 5, 3);
  const livingPatioDoor = new THREE.Group();
  livingPatioDoor.name = 'Dining west glazed patio door, 36 by 96 inches';
  livingPatioDoor.position.set(livingFeatureWall.patioDoor.x, 0, livingFeatureWall.patioDoor.z);
  livingPatioDoor.rotation.y = -Math.PI / 2;
  livingPatioDoor.userData = { widthFeet: 3, heightFeet: 8, westDiningChairMustBeMovedForDoor: false, provisional: true };
  scene.add(livingPatioDoor);
  for (const x of [-1.44, 1.44]) box(livingPatioDoor, x, 4, 0, 0.12, 8, 0.2, windowTrim).name = 'Living patio door stile';
  for (const y of [0.08, 7.92]) box(livingPatioDoor, 0, y, 0, 3, 0.16, 0.2, windowTrim).name = 'Living patio door rail';
  box(livingPatioDoor, 0, 4, 0, 2.76, 7.68, 0.05, glass).name = 'Living patio door glazing';
  box(livingPatioDoor, -1.15, 3, -0.16, 0.08, 0.4, 0.12, black).name = 'Living patio door handle';
  openingCasing(livingPatioDoor, 0, 0, 3, 8, 0.2, -1, false);
  const livingPatioHinge = new THREE.Group();
  livingPatioHinge.name = 'Dining west patio inward door hinge';
  livingPatioHinge.position.set(1.44, 0, 0);
  livingPatioHinge.userData = { outswing: false, openAngleDegrees: 0, maxAngleDegrees: 90, nominalWidthFeet: 3, finish: 'White' };
  livingPatioDoor.add(livingPatioHinge);
  for (const part of [...livingPatioDoor.children].filter((part) => /Living patio door (stile|rail|glazing|handle)/.test(part.name))) {
    livingPatioDoor.remove(part);
    part.position.x -= 1.44;
    livingPatioHinge.add(part);
  }
  windowFrame('Dining garden-facing casements', 26.875, 3.5, 6, 5, 3, -Math.PI / 2, scene, 1);
  const doorLeaf = livingPatioHinge;
  doorLeaf.rotation.y = 0;
  for (const [index, z] of livingWindowCenters.entries()) {
    windowFrame(`Living fireplace-side casement ${index + 1}`, 0.1, z, livingWindowWidth, livingWindowHead - livingWindowSill, livingWindowSill, -Math.PI / 2, scene, -1);
  }

  const wovenShadeCanvas = document.createElement('canvas');
  wovenShadeCanvas.width = 256;
  wovenShadeCanvas.height = 512;
  const wovenShadeContext = wovenShadeCanvas.getContext('2d');
  wovenShadeContext.fillStyle = '#c4a16d';
  wovenShadeContext.fillRect(0, 0, 256, 512);
  for (let y = 0; y < 512; y += 4) {
    wovenShadeContext.fillStyle = ['#d7bb8c', '#af8959', '#dfc69c', '#bc9967'][(y / 4) % 4];
    wovenShadeContext.fillRect(0, y, 256, 3);
    wovenShadeContext.fillStyle = '#8f714c';
    wovenShadeContext.fillRect(0, y + 3, 256, 1);
  }
  for (let x = 7; x < 256; x += 17) {
    wovenShadeContext.fillStyle = '#e2c99e';
    wovenShadeContext.fillRect(x, 0, 1, 512);
    wovenShadeContext.fillStyle = '#957950';
    wovenShadeContext.fillRect(x + 1, 0, 1, 512);
  }
  const wovenShadeTexture = new THREE.CanvasTexture(wovenShadeCanvas);
  wovenShadeTexture.colorSpace = THREE.SRGBColorSpace;
  const wovenShadeMaterial = new THREE.MeshStandardMaterial({ map: wovenShadeTexture, roughness: 1 });
  const wovenShadeEdge = new THREE.MeshStandardMaterial({ color: '#b28c59', roughness: 1 });
  function addLivingWovenShades(parent, width, height, sill, columns, face, side) {
    const shades = new THREE.Group();
    shades.name = 'Living natural woven wood Roman shades';
    shades.userData = { style: 'Warm flax and bamboo weave, owner photo reference', cordless: true, productSelected: false, mountingVerified: false, operatingClearanceVerified: false, privacyVerified: false, provisional: true };
    parent.add(shades);
    const drop = height * 0.62;
    for (let column = 0; column < columns; column++) {
      const left = -width / 2 + width * column / columns + (column === 0 ? 0.12 : 3.5 / 24) + 0.04;
      const right = -width / 2 + width * (column + 1) / columns - (column === columns - 1 ? 0.12 : 3.5 / 24) - 0.04;
      const shade = new THREE.Group();
      shade.name = `Woven Roman shade bay ${column + 1}`;
      shade.position.set((left + right) / 2, sill + height - 0.08, side * (face - 0.16));
      shade.userData = { widthFeet: right - left, dropFeet: drop, lowerGlassExposedFeet: height - drop - 0.08 };
      shades.add(shade);
      box(shade, 0, -drop / 2, 0, right - left, drop, 0.025, wovenShadeMaterial).name = 'Natural woven reed shade panel';
      box(shade, 0, -0.09, side * 0.025, right - left, 0.18, 0.09, wovenShadeMaterial).name = 'Woven shade head valance';
      box(shade, 0, -drop + 0.04, side * 0.025, right - left, 0.08, 0.08, wovenShadeEdge).name = 'Woven shade weighted bottom fold';
    }
    return shades;
  }
  addLivingWovenShades(livingWindowBank, livingSideWindowBank.width, livingSideWindowBank.height, livingSideWindowBank.sill, 3, livingRevealFace, 1);
  for (const frame of scene.children.filter((child) => /^Living fireplace-side casement /.test(child.name))) {
    const { widthFeet, heightFeet, columns, interiorSide } = frame.userData;
    const face = windowFaceDepth(scene, frame.position.x, frame.position.y, frame.rotation.y, interiorSide, windowWallDatums, frame.position.z);
    addLivingWovenShades(frame, widthFeet, heightFeet, 0, columns, face, interiorSide);
  }

  const sofa = new THREE.Group();
  sofa.name = 'Crate & Barrel Lounge Deep 105-inch Leather Grande Sofa reference';
  sofa.userData = { familySeatTarget: 4, seatCushions: 3, widthInches: 105, depthInches: 46, heightInches: 37, sectional: false, productURL: 'https://www.crateandbarrel.com/lounge-deep-105-leather-grande-sofa/s336140', purchaseSelected: false };
  sofa.userData.viewerFurniture = true;
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

  const sectional = new THREE.Group();
  sectional.name = 'U-shaped double-chaise sectional concept';
  sectional.userData = {
    widthInches: 132, depthInches: 68, baseDepthInches: 42, heightInches: 36, armWidthInches: 4,
    modules: ['chaise', 'seat', 'seat', 'chaise'], sectional: true, purchaseSelected: false, provisional: true
  };
  sectional.userData.viewerFurniture = true;
  sectional.position.set(11.25, 0, livingCenterZ);
  sectional.rotation.y = -Math.PI / 2;
  scene.add(sectional);
  const sectionalWidth = sectional.userData.widthInches / 12;
  const sectionalBaseDepth = sectional.userData.baseDepthInches / 12;
  const sectionalDepth = sectional.userData.depthInches / 12;
  const sectionalArm = sectional.userData.armWidthInches / 12;
  const sectionalSeatWidth = (sectionalWidth - 2 * sectionalArm) / sectional.userData.modules.length;
  box(sectional, 0, 0.75, 0, sectionalWidth, 0.95, sectionalBaseDepth, tanLeather, true).name = 'Sectional main base';
  box(sectional, 0, 1.8, -sectionalBaseDepth / 2 + 0.2, sectionalWidth, 2.4, 0.4, tanLeather, true).name = 'Sectional continuous back';
  const sectionalExtension = sectionalDepth - sectionalBaseDepth;
  for (const side of [-1, 1]) {
    box(sectional, side * (sectionalWidth - sectionalSeatWidth - sectionalArm) / 2, 0.75, sectionalBaseDepth / 2 + sectionalExtension / 2, sectionalSeatWidth + sectionalArm, 0.95, sectionalExtension, tanLeather, true).name = 'Sectional chaise extension';
    box(sectional, side * (sectionalWidth - sectionalArm) / 2, 1.3, sectionalExtension / 2, sectionalArm, 1.8, sectionalDepth, tanLeather, true).name = 'Sectional outer arm';
  }
  sectional.userData.modules.forEach((type, index) => {
    const x = (index - 1.5) * sectionalSeatWidth;
    const depth = (type === 'chaise' ? sectionalDepth : sectionalBaseDepth) - 0.5;
    const rear = -sectionalBaseDepth / 2 + 0.4;
    const cushion = box(sectional, x, 1.35, rear + depth / 2, sectionalSeatWidth - 0.04, 0.45, depth, tanLeatherCushion, true);
    cushion.name = `Sectional ${type} cushion ${index + 1}`;
    cushion.userData = { moduleIndex: index, type };
    box(sectional, x, 2.3, -sectionalBaseDepth / 2 + 0.5, sectionalSeatWidth - 0.05, 1.4, 0.65, tanLeatherCushion, true).name = 'Sectional loose back cushion';
  });

  const livingChairWidth = armchairGeometry.userData.widthInches / 12;
  const livingChairDepth = armchairGeometry.userData.depthInches / 12;
  const livingArmchairs = [0, 1].map((index) => {
    const chair = new THREE.Group();
    chair.name = `Poly Haven textured armchair ${index + 1}`;
    chair.userData = { ...armchairGeometry.userData, seats: 1, provisional: true };
    chair.userData.viewerFurniture = true;
    const model = armchairGeometry.clone(true);
    model.traverse((part) => {
      if (part.isMesh) part.userData.tourObstacle = true;
    });
    chair.add(model);
    scene.add(chair);
    return chair;
  });

  function loungeChair(x, z, rotation) {
    const chair = new THREE.Group();
    chair.name = 'Upholstered lounge chair';
    chair.userData = { seats: 1, viewerFurniture: true };
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
  loungeChairs[0].userData = { seats: 1, use: 'Window-corner lounge chair with matching ottoman', provisional: true, viewerFurniture: true };
  loungeChairs[1].userData = { seats: 1, use: 'Corner reading chair beside painted stair enclosure', provisional: true, viewerFurniture: true };
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
  // Northwest living corner: two feet from each finished wall face.
  // Shared feature-wall datum includes the north wall's finished face.
  christmasTree.name = 'Living northwest-corner Christmas tree';
  christmasTree.position.set(0.175 + 2, 0, livingFeatureWall.wallStartZ + 2);
  christmasTree.userData = { heightInches: 84, diameterInches: 36, location: 'Northwest living-room corner between the fireplace-window wall and joined-window wall', seasonal: true, provisional: true };
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

  const downloadedSofa = new THREE.Group();
  downloadedSofa.name = 'Wayfair Glam velvet sofa - licensed product visualization';
  downloadedSofa.userData = { ...sofaGeometry.userData, provisional: true };
  downloadedSofa.userData.viewerFurniture = true;
  downloadedSofa.add(sofaGeometry.clone(true));
  downloadedSofa.traverse((part) => { if (part.isMesh) part.userData.tourObstacle = true; });
  scene.add(downloadedSofa);

  const familyLiving = new THREE.Group();
  familyLiving.name = 'Family-of-five living-room furnishings';
  familyLiving.userData = {
    planningSeats: 5, sofaPlanningSeats: 3, chairPlanningSeats: 2, comfortVerified: false,
    rug: { x: 7.8, z: livingCenterZ, w: 9, d: 12 },
    ottoman: { x: 10.8 - sofaGeometry.userData.depthInches / 24 - 16 / 12 - 32 / 24, z: livingCenterZ, w: 32 / 12, d: 4, h: 17 / 12 },
    sideTables: [{ x: 10.8, z: livingCenterZ - 5 }, { x: 10.8, z: livingCenterZ + 5 }],
    sideTableDimensions: sideTableGeometry.userData
  };
  familyLiving.userData.viewerFurniture = true;
  scene.add(familyLiving);
  function livingWeaveTexture(color, border = false) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const context = canvas.getContext('2d');
    context.fillStyle = color;
    context.fillRect(0, 0, 512, 512);
    for (let line = 0; line < 512; line += 3) {
      context.fillStyle = line % 2 ? '#ffffff18' : '#493c2b12';
      context.fillRect(line, 0, 1, 512);
      context.fillRect(0, line, 512, 1);
    }
    if (border) {
      context.strokeStyle = '#8a88775c';
      context.lineWidth = 5;
      context.strokeRect(18, 18, 476, 476);
      context.lineWidth = 1;
      context.strokeRect(26, 26, 460, 460);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }
  const familyRug = familyLiving.userData.rug;
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(familyRug.w, familyRug.d), new THREE.MeshStandardMaterial({ map: livingWeaveTexture('#d8cebc', true), roughness: 1 }));
  rug.name = 'Family living 9 x 12 ft low-pile rug - finish study';
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(familyRug.x, 0.008, familyRug.z);
  rug.userData = { tourDecoration: true, walkSurface: true, nonSlipPadRequired: true, productSelected: false };
  familyLiving.add(rug);
  const familyOttoman = new THREE.Group();
  familyOttoman.name = 'Family living soft 48 x 32 inch ottoman';
  const ottomanDetails = familyLiving.userData.ottoman;
  familyOttoman.position.set(ottomanDetails.x, 0, ottomanDetails.z);
  familyOttoman.userData = { ...ottomanDetails, productSelected: false, seatingApproved: false, use: 'Footrest and removable-tray surface, not a sixth seat' };
  const camelFabric = new THREE.MeshStandardMaterial({ map: livingWeaveTexture('#b18c66'), roughness: 0.96 });
  for (const x of [-0.95, 0.95]) for (const z of [-1.65, 1.65]) cylinder(familyOttoman, x, 1 / 12, z, 0.08, 2 / 12, walnut).name = 'Ottoman low wood foot';
  box(familyOttoman, 0, 8 / 12, 0, ottomanDetails.w - 0.04, 1, ottomanDetails.d - 0.04, camelFabric, true).name = 'Soft ottoman upholstered base';
  box(familyOttoman, 0, 15.5 / 12, 0, ottomanDetails.w, 3 / 12, ottomanDetails.d, camelFabric, true).name = 'Soft ottoman rounded top';
  familyOttoman.traverse((part) => { if (part.isMesh) part.userData.tourObstacle = true; });
  familyLiving.add(familyOttoman);
  for (const [index, position] of familyLiving.userData.sideTables.entries()) {
    const table = new THREE.Group();
    table.name = `Family living textured side table ${index + 1}`;
    table.position.set(position.x, 0, position.z);
    table.userData = { ...sideTableGeometry.userData, productSelected: false };
    table.add(sideTableGeometry.clone(true));
    table.traverse((part) => { if (part.isMesh) part.userData.tourObstacle = true; });
    familyLiving.add(table);
  }
  const readingLamp = new THREE.Group();
  readingLamp.name = 'Family living warm reading lamp - wiring review required';
  readingLamp.position.set(10.8, 20 / 12, livingCenterZ + 5);
  readingLamp.userData = { productSelected: false, electricianReviewRequired: true, cordRoute: 'Behind sofa to proposed floor outlet, never across a walking route' };
  cylinder(readingLamp, 0, 0.035, 0, 0.23, 0.07, walnut).name = 'Reading lamp weighted base concept';
  cylinder(readingLamp, 0, 0.5, 0, 0.025, 0.95, brass).name = 'Reading lamp stem';
  const shadeMaterial = new THREE.MeshStandardMaterial({ color: '#eee4ce', roughness: 0.9, emissive: '#f6c982', emissiveIntensity: 0.25 });
  cylinder(readingLamp, 0, 1.02, 0, 0.4, 0.55, shadeMaterial, 0.28).name = 'Warm linen reading shade';
  const readingLight = new THREE.PointLight('#ffd5a0', 0.65, 6, 2);
  readingLight.position.y = 1;
  readingLamp.add(readingLight);
  readingLamp.traverse((part) => { if (part.isMesh) part.userData.tourDecoration = true; });
  familyLiving.add(readingLamp);

  const referenceLounge = new THREE.Group();
  referenceLounge.name = 'Fireplace-facing U sectional - fit study';
  // Authored at its final world pose: the main run backs onto the 6 in strip
  // before the 36 in main hall and both backed returns reach toward the fireplace.
  referenceLounge.userData = {
    shape: 'U', widthInches: 132, returnInches: 99, depthInches: 39, armInches: 6,
    backX: 12.75, centerZ: livingCenterZ, hallStripX: 13.25, stoneFaceX: 1.38, fireplaceSideCabinets: 0,
    planningSeats: 6, seatsPerRun: { main: 2, eachReturn: 2 }, cornerSeatsCounted: false, guestChairs: 0,
    comfortVerified: false, productSelected: false, centerOffset: [0, 0, 0]
  };
  referenceLounge.userData.viewerFurniture = true;
  scene.add(referenceLounge);
  const sofaFabric = new THREE.MeshStandardMaterial({ map: livingWeaveTexture('#9e8a76'), roughness: 0.97 });
  const sofaCushion = new THREE.MeshStandardMaterial({ map: livingWeaveTexture('#b49f88'), roughness: 0.98 });
  const accentFabrics = ['#705443', '#b29b7f', '#92745b'].map((color) => new THREE.MeshStandardMaterial({ map: livingWeaveTexture(color), roughness: 0.98 }));
  const uSectional = new THREE.Group();
  uSectional.name = 'Reference mushroom U sectional facing fireplace';
  const uDetails = referenceLounge.userData;
  const uWidth = uDetails.widthInches / 12, uDepth = uDetails.depthInches / 12, uArm = uDetails.armInches / 12;
  const uReturnRun = uDetails.returnInches / 12 - uDepth;
  // Local +z faces the fireplace (world -x); local x runs north-south along the main back.
  uSectional.position.set(uDetails.backX - uDepth / 2, 0, uDetails.centerZ);
  uSectional.rotation.y = -Math.PI / 2;
  uSectional.userData = { shape: 'U', widthInches: 132, returnInches: 99, depthInches: 39, planningSeats: 6, cornerSeatsCounted: false, sectional: true, productSelected: false, comfortVerified: false };
  referenceLounge.add(uSectional);
  const back = -uDepth / 2, front = uDepth / 2, returnEnd = front + uReturnRun;
  box(uSectional, 0, 0.12, 0, uWidth - 0.4, 0.24, uDepth - 0.4, walnut, true).name = 'U sectional main recessed plinth';
  box(uSectional, 0, 0.8, 0, uWidth, 1.2, uDepth, sofaFabric, true).name = 'U sectional main base';
  box(uSectional, 0, 1.95, back + 0.25, uWidth, 2.1, 0.5, sofaFabric, true).name = 'U sectional continuous main back';
  const innerSeatRun = uWidth - 2 * uDepth;
  for (let seat = 0; seat < 2; seat++) {
    const x = (seat - 0.5) * innerSeatRun / 2;
    box(uSectional, x, 1.45, 0.2, innerSeatRun / 2 - 0.04, 0.4, 2.5, sofaCushion, true).name = 'U sectional main seat cushion';
    box(uSectional, x, 2.25, -0.83, innerSeatRun / 2 - 0.04, 1.3, 0.55, sofaCushion, true).name = 'U sectional main loose back cushion';
  }
  // Mirror constituent coordinates with side = -1/+1; never use a negative object scale.
  for (const side of [-1, 1]) {
    const outer = side * uWidth / 2;
    const backFace = outer - side * 0.25;
    const seatCenter = outer - side * (0.5 + 0.075 + 2.5 / 2);
    box(uSectional, outer - side * uDepth / 2, 0.12, (front + returnEnd) / 2, uDepth - 0.4, 0.24, uReturnRun, walnut, true).name = 'U sectional return recessed plinth';
    box(uSectional, outer - side * uDepth / 2, 0.8, (front + returnEnd) / 2, uDepth, 1.2, uReturnRun, sofaFabric, true).name = 'U sectional return base';
    box(uSectional, backFace, 1.95, (back + 0.5 + front) / 2, 0.5, 2.1, front - back - 0.5, sofaFabric, true).name = 'U sectional continuous corner back';
    box(uSectional, backFace, 1.95, (front + returnEnd - uArm) / 2, 0.5, 2.1, uReturnRun - uArm, sofaFabric, true).name = 'U sectional return back';
    box(uSectional, outer - side * uDepth / 2, 1.5, returnEnd - uArm / 2, uDepth, 1.8, uArm, sofaFabric, true).name = 'U sectional return end arm';
    box(uSectional, side * 3.6, 1.45, 0.25, 2.6, 0.4, 2.6, sofaCushion, true).name = 'U sectional uncounted corner cushion';
    box(uSectional, side * (innerSeatRun / 2 + 0.02 + 2.16 / 2), 2.25, -0.83, 2.16, 1.3, 0.55, sofaCushion, true).name = 'U sectional corner loose back cushion';
    const returnSeatRun = uReturnRun - uArm;
    for (let seat = 0; seat < 2; seat++) {
      const z = front + (seat + 0.5) * returnSeatRun / 2;
      box(uSectional, seatCenter, 1.45, z, 2.5, 0.4, returnSeatRun / 2 - 0.04, sofaCushion, true).name = 'U sectional return seat cushion';
      box(uSectional, outer - side * (0.5 + 0.275), 2.25, z, 0.55, 1.3, returnSeatRun / 2 - 0.04, sofaCushion, true).name = 'U sectional return loose back cushion';
    }
    const cornerPillow = box(uSectional, side * 3.95, 2.15, -0.35, 1, 1, 0.35, accentFabrics[side < 0 ? 0 : 2], true);
    cornerPillow.name = 'U sectional accent pillow';
    cornerPillow.rotation.z = side * 0.14;
    const returnPillow = box(uSectional, outer - side * 1.23, 2.15, returnEnd - uArm - 0.75, 0.35, 1, 1, accentFabrics[1], true);
    returnPillow.name = 'U sectional accent pillow';
    returnPillow.rotation.x = side * 0.12;
  }
  const referenceFloorRug = box(referenceLounge, uDetails.backX - uDetails.returnInches / 24, 0.015, uDetails.centerZ, 9, 0.02, 12,
    new THREE.MeshStandardMaterial({ map: livingWeaveTexture('#817b71', true), roughness: 1 }));
  referenceFloorRug.name = 'Reference 9 x 12 ft charcoal taupe low-pile rug';
  referenceFloorRug.userData = { tourDecoration: true, walkSurface: true, nonSlipPadRequired: true, productSelected: false };

  const piano = new THREE.Group();
  piano.name = 'Yamaha CLP-825 Rosewood digital piano';
  piano.userData = { widthMm: 1350, depthMm: 411, heightMm: 849, musicRestHeightMm: 1003, planningSeats: 0, productURL: 'https://solichmusic.com/pianos/yamaha-digital-pianos/yamaha-clp-825-rosewood/', manufacturerCAD: false };
  const pianoWidth = 1350 / 304.8, pianoDepth = 411 / 304.8, pianoHeight = 849 / 304.8;
  const rosewood = new THREE.MeshStandardMaterial({ map: livingWeaveTexture('#482c29'), roughness: 0.55 });
  const keyWhite = new THREE.MeshStandardMaterial({ color: '#f5f0e6', roughness: 0.45 });
  const keyBlack = new THREE.MeshStandardMaterial({ color: '#171414', roughness: 0.5 });
  box(piano, 0, pianoHeight - 0.34, 0, pianoWidth, 0.68, pianoDepth, rosewood).name = 'Piano console cabinet';
  box(piano, 0, 1.15, -pianoDepth / 2 + 0.08, pianoWidth - 0.16, 2.3, 0.16, rosewood).name = 'Piano back panel';
  for (const x of [-pianoWidth / 2 + 0.07, pianoWidth / 2 - 0.07]) {
    box(piano, x, 1.1, 0, 0.14, 2.2, pianoDepth, rosewood).name = 'Piano side support';
  }
  const keyWidth = (pianoWidth - 0.35) / 52;
  for (let key = 0; key < 52; key++) {
    const x = (key - 25.5) * keyWidth;
    box(piano, x, 2.4, 0.35, keyWidth - 0.004, 0.06, 0.56, keyWhite).name = 'Piano ivory-tone white key';
    if (key < 51 && [0, 1, 3, 4, 5].includes((key + 5) % 7)) box(piano, x + keyWidth / 2, 2.45, 0.18, keyWidth * 0.58, 0.07, 0.32, keyBlack).name = 'Piano raised black key';
  }
  box(piano, 0, 0.3, 0, 2.8, 0.18, 0.45, rosewood).name = 'Piano pedal rail';
  for (const x of [-0.2, 0, 0.2]) box(piano, x, 0.24, 0.3, 0.09, 0.05, 0.3, keyWhite).name = 'Piano pedal';
  box(piano, 0, (pianoHeight + 1003 / 304.8) / 2, -0.25, 1.8, 1003 / 304.8 - pianoHeight, 0.06, rosewood).name = 'Piano raised music rest';
  const pianoBench = new THREE.Group();
  pianoBench.name = 'Piano bench - provisional 24 x 12 inch';
  pianoBench.position.set(0, 0, 0.75);
  piano.add(pianoBench);
  box(pianoBench, 0, 1.5, 0, 2, 0.18, 1, rosewood).name = 'Piano bench seat';
  for (const x of [-0.85, 0.85]) for (const z of [-0.35, 0.35]) box(pianoBench, x, 0.7, z, 0.12, 1.4, 0.12, rosewood).name = 'Piano bench leg';

  piano.traverse((part) => { if (part.isMesh) part.userData.tourObstacle = true; });
  referenceLounge.traverse((part) => { if (part.isMesh && !part.userData.tourDecoration) part.userData.tourObstacle = true; });

  const familySectional = new THREE.Group();
  familySectional.name = 'Deep L-shaped family sectional - five seats plus uncounted corner';
  familySectional.userData = {
    widthInches: 144, returnInches: 104, depthInches: 44, seatDepthInches: 30,
    planningSeats: 5, cornerCounted: false, comfortVerified: false, productSelected: false,
    seats: [[10.2, livingCenterZ - 1], [10.2, livingCenterZ + 1.6], [10.2, livingCenterZ + 4.3],
      [5.3, livingCenterZ - 4.2], [7.6, livingCenterZ - 4.2]]
  };
  familySectional.userData.viewerFurniture = true;
  scene.add(familySectional);
  const familyFabric = new THREE.MeshStandardMaterial({ map: livingWeaveTexture('#947453'), roughness: 0.96 });
  const familyCushion = new THREE.MeshStandardMaterial({ map: livingWeaveTexture('#aa8864'), roughness: 0.98 });
  const familySectionalParts = [
    [10.5666667, livingCenterZ, 44 / 12, 12],
    [6.2333333, livingCenterZ - 25 / 6, 5, 44 / 12]
  ];
  for (const [x, z, w, d] of familySectionalParts) {
    box(familySectional, x, 0.65, z, w, 0.95, d, familyFabric, true).name = 'L sectional upholstered base';
  }
  box(familySectional, 12.15, 1.8, livingCenterZ, 0.5, 2.4, 12, familyFabric, true).name = 'L sectional main back';
  box(familySectional, 6.2333333, 1.8, livingCenterZ - 5.75, 5, 2.4, 0.5, familyFabric, true).name = 'L sectional return back';
  box(familySectional, 10.5666667, 1.8, livingCenterZ - 5.75, 44 / 12, 2.4, 0.5, familyFabric, true).name = 'L sectional corner back';
  box(familySectional, 10.5666667, 1.3, livingCenterZ + 5.8, 44 / 12, 1.8, 0.4, familyFabric, true).name = 'L sectional end arm';
  box(familySectional, 3.9333333, 1.3, livingCenterZ - 25 / 6, 0.4, 1.8, 44 / 12, familyFabric, true).name = 'L sectional return arm';
  for (const [index, [x, z]] of familySectional.userData.seats.entries()) {
    const main = index < 3;
    box(familySectional, x, 1.35, z, main ? 2.5 : 2.25, 0.45, 2.5, familyCushion, true).name = 'L sectional full seating cushion';
    box(familySectional, main ? 11.6 : x, 2.2, main ? z : livingCenterZ - 5.2, main ? 0.65 : 2.25, 1.3, main ? 2.5 : 0.65, familyCushion, true).name = 'L sectional loose back cushion';
  }
  box(familySectional, 10.2, 1.35, livingCenterZ - 4.2, 2.5, 0.45, 2.5, familyCushion, true).name = 'L sectional uncounted corner cushion';
  familySectional.traverse((part) => { if (part.isMesh) part.userData.tourObstacle = true; });

  const livingLayouts = [
    {
      id: 'reference-lounge', title: 'J / U sectional facing fireplace', recommended: true, referenceLounge: true,
      note: 'A 132 in main run faces the fireplace with two backed 99 in returns reaching toward it: continuous main, corner and return backs, end arms, mirrored cushions and pillows. Overall x 4.5-12.75, z 11.975-22.975 ft, centered on the fireplace axis so the 54 x 60 in open well frames the firebox; the tucked piano bench keeps 24.4 in. Six provisional seats (two main, two per return) exclude both corners. The reading chair, end table and its lamp are removed. 9 x 12 ft rug centered under the U at (8.625,17.475). Both fireplace-side built-ins are removed; equipment/charging storage location is undecided. Flat 8 in base trim runs continuously along the fireplace wall from each wall end (z 8.175 and 26.775 ft) to the stone side return (z 14.415 and 20.535 ft), 74.88 in per side. Return ends sit 51.15 in from that baseboard (51.9 in to paint) and 37.44 in from the stone face; the back stops 6 in before the 36 in main hall; 45.6 in remains to the north window wall. Piano, bench and attached lamp move another 6 in west toward fireplace windows, 16 in total from the stair-wall midpoint, center (3.7583,26.2592), keyboard north. Rear gap stays 1 in to paint, 0.25 in beyond baseboard; ventilation and cord fit are unverified. Bench keeps its tucked pose and unchanged size/height. Piano west end faces the fireplace wall: 15.68 in to baseboard (16.43 in to paint), not an aisle; no cabinet or door sweep remains beside it. With no built-in media storage, equipment, charging and ventilation location is undecided. Occupied bench pullout, playing access and power routing require review; keep cords off circulation routes. No coffee table, cart or footstools. Joined living window bank remains. All four stair bookcases are removed; the former recess zone is closed with painted enclosure to the current flight/landing soffits and flat base trim. No new doors/storage. Keep the full 48 in living-side landing guard: oak top 36 in above the +5 ft landing, eight black bars and both posts. Owner follow-up removes only the short cap/bar connecting pieces to the lower-flight rails, retaining a junction break. Endpoint centerlines differ by 5 in horizontally and 7.5 in vertically, not verified clear-opening dimensions. Guard openings and graspable handrail continuity require professional review; this gap is not safety approval. The enclosure below is not edge protection. Actual anchorage, openings/climbability, graspability and remaining wall-backed/basement handrail omissions require professional review; restored geometry is not safety certification. Preserve flight rails/stringers, living stairwell guard, upstairs guards, basement rails/access, steps and enclosure. Enclosure framing, structural support, underside protection, fire separation and headroom require professional review. Verify products, equipment storage/ventilation, power, window access and fireplace heat clearances. Dining west patio door stays closed by default; verify its sweep and occupied access before use. Patio landing, stair, roof, guards and foundations remain approval-required.',
      sofa: null, chairs: [null, null]
    },
    {
      id: 'family-sectional', title: 'I / Earlier deep family sectional', familyZone: true, familySectional: true,
      note: 'Deep 144 x 104 in L-shaped sectional concept: five full seating positions plus an uncounted corner, 44 in overall depth and a 30 in seat-depth target. Warm brown upholstery, movable soft ottoman and no separate chairs. Main sofa-to-ottoman gap 16 in; 39.6 in around both ends and about 28.2 in from the return end to the stone face and 41.95 in to the fireplace-wall baseboard (built-ins removed). These are static model gaps, not occupied access or fireplace approval. No product selected; family sit-test, cushion support and upholstery care remain essential.',
      sofa: null, chairs: [null, null]
    },
    {
      id: 'family-five', title: 'H / Earlier sofa and two chairs', familyZone: true,
      note: 'Five planning positions: three on the 86 in textured sofa plus two inward-facing armchairs. A 9 x 12 ft rug, soft 48 x 32 in ottoman, two wood side tables and warm reading lamp form one family zone. Sofa-to-ottoman gap targets 16 in; circulation stays behind the sofa. Comfort, upholstery, fireplace clearances and lamp wiring need review.',
      downloadedSofa: [10.8, livingCenterZ, -Math.PI / 2], sofa: null, chairs: [null, null],
      armchairs: [[6.45, livingCenterZ - 5.475, Math.PI / 4], [6.45, livingCenterZ + 5.475, 3 * Math.PI / 4]]
    },
    {
      id: 'real-sofa', title: 'G / Earlier textured product sofa',
      note: 'Downloaded Wayfair Glam velvet sofa, 86 in display width, with two textured armchairs. Earlier corner-chair poses predate removal of the fireplace built-ins (halved/paired versions are historical); comparison only, not a usable layout. Licensed product visualization, not a comfort-tested selection or manufacturer CAD. No sofa-bed opening is modeled.',
      downloadedSofa: [11.25, livingCenterZ, -Math.PI / 2], sofa: null, chairs: [null, null],
      armchairs: [[2.7, 10.45, Math.PI / 3], [2.7, 2 * livingCenterZ - 10.45, 2 * Math.PI / 3]]
    },
    {
      id: 'double-chaise', title: 'F / Earlier double-chaise sectional',
      note: 'Double-chaise sectional plus two textured Poly Haven armchairs in the window corners, angled inward. Earlier corner-chair poses predate removal of the fireplace built-ins (halved/paired versions are historical); comparison only, not a usable layout. Uniformly scaled to 32.25 in wide; generic visual assets, not verified product sizes. Occupied access and heat clearances remain unverified.',
      sectional: [11.25, livingCenterZ, -Math.PI / 2], sofa: null, chairs: [null, null],
      armchairs: [[2.7, 10.45, Math.PI / 3], [2.7, 2 * livingCenterZ - 10.45, 2 * Math.PI / 3]]
    },
    {
      id: 'centered', title: 'E / Earlier corner-chair layout',
      note: 'Earlier corner-chair comparison predating removal of the fireplace built-ins (halved/paired versions are historical). Original furniture poses are preserved for comparison only, not a usable layout.',
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

  const tableX = (13.2 + 26.875) / 2;
  const tableZ = (-0.1 + 8) / 2;
  const tableLength = 84 / 12;
  const tableDepth = 38 / 12;
  const diningSet = new THREE.Group();
  diningSet.name = 'Dining table and six side chairs';
  diningSet.position.set(tableX, 0, tableZ);
  diningSet.rotation.y = 0;
  diningSet.userData = { rotationDegrees: 0, longAxis: 'x', seats: 6, endChairs: 0, centeredInDiningRoom: true, patioEndChairMustBeTuckedForDoor: false, patioEndChairMustBeMovedForDoor: false, provisional: true };
  diningSet.userData.viewerFurniture = true;
  scene.add(diningSet);
  const diningWalnut = mat('#60412e', 0.6);
  diningWalnut.name = 'Dining walnut finish - screen approximation';
  const diningLeather = mat('#292724', 0.72);
  diningLeather.name = 'Black dining leather - screen approximation';
  const diningTable = box(diningSet, 0, 29 / 12 - 0.09, 0, tableLength, 0.18, tableDepth, diningWalnut, true);
  diningTable.name = 'Dining table';
  diningTable.userData = { reference: 'Provisional 84-inch walnut table, six side chairs; not the 71-inch Seno product', lengthInches: 84, depthInches: 38, heightInches: 29, seats: 6, productSelected: false, provisional: true };
  for (const x of [-tableLength / 2 + 0.55, tableLength / 2 - 0.55]) for (const z of [-1.1, 1.1]) box(diningSet, x, 1.15, z, 0.16, 2.3, 0.16, diningWalnut, true).name = 'Dining table leg';
  function diningChair(x, z, rotation) {
    const chair = new THREE.Group();
    chair.name = 'Dining chair';
    chair.userData = { reference: 'Article Nosh walnut and black leather', widthInches: 20, depthInches: 21, heightInches: 31, seatHeightInches: 19, provisional: true };
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
  const diningChairSpacing = 24 / 12;
  for (const x of [-diningChairSpacing, 0, diningChairSpacing]) {
    diningChair(tableX + x, tableZ - tableDepth / 2 + diningChairInset, 0);
    diningChair(tableX + x, tableZ + tableDepth / 2 - diningChairInset, Math.PI);
  }


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
  const guestVanityStone = new THREE.MeshPhysicalMaterial({ map: quartzTexture('#f4f3ef', 'rgba(153, 153, 148, 0.18)'), roughness: 0.48, clearcoat: 0.1 });
  guestVanityStone.name = 'Guest vanity pale white stone concept';
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
  const kitchenTaskDiffuser = new THREE.MeshStandardMaterial({ color: '#fff1db', emissive: '#ffe0b3', emissiveIntensity: 0, roughness: 0.65 });

  function drawerFront(x, z, width, rotation = 0, parent = kitchen, cabinetTop = 2.87, drawerRows = null) {
    const cabinet = new THREE.Group();
    cabinet.position.set(x, 0, z);
    cabinet.rotation.y = rotation;
    parent.add(cabinet);
    if (!drawerRows) box(cabinet, 0, (2.62 + cabinetTop) / 2, -0.02, width, cabinetTop - 2.62, 0.08, cabinetFinish).name = 'Drawer-bank fixed upper rail';
    for (let row = 0; row < 3; row++) {
      const bottom = drawerRows ? drawerRows[row][0] : 0.28 + row * 0.79;
      const top = drawerRows ? drawerRows[row][1] : bottom + 0.74;
      const height = top - bottom;
      const front = shakerFront(cabinet, 0, (bottom + top) / 2, 0, width, height);
      front.userData.drawerTravelFeet = 1.5;
      front.userData.kitchenDrawerRow = row;
      if (drawerRows) {
        front.userData.drawerFloorY = -height / 2 + 0.09;
        front.userData.drawerBoxHeightFeet = Math.min(8 / 12, height - 0.18);
      }
      const pullOffsets = width >= 30 / 12 ? [-width / 4, width / 4] : [0];
      front.userData.hardware = 'Top Knobs Dakota Charlotte M2223 cup pull';
      front.userData.pullCount = pullOffsets.length;
      for (const offset of pullOffsets) cabinetCupPull(front, offset, drawerRows ? Math.min(0.22, height / 2 - 0.12) : 0.22, 0.045);
    }
  }

  box(kitchen, kitchenSinkX - 3.4, 1.44, kitchenSinkRunZ, 3.8, 2.85, 2, cabinetFinish).userData = { cabinetBody: 'z+' };
  for (const x of [kitchenSinkX - 3.4, kitchenSinkX + 3.4]) box(kitchen, x, 2.96, kitchenSinkRunZ, 3.8, 0.18, 2.05, countertop, true).name = 'Top kitchen quartz counter';
  box(kitchen, kitchenSinkX, 1.1, kitchenSinkRunZ, 3, 2, 2, cabinetFinish).userData = { cabinetBody: 'z+' };
  drawerFront(kitchenSinkX - 4.125, kitchenSinkRunZ + 1.03, 2.2);
  const trayCabinet = new THREE.Group();
  trayCabinet.name = 'Kitchen tray-divider cabinet right of dishwasher';
  trayCabinet.position.set(kitchenSinkX + 4.4, 0, kitchenSinkRunZ);
  trayCabinet.userData = { widthInches: 21.6, depthInches: 24, provisional: true, productSelected: false, operatingClearanceApproved: false };
  kitchen.add(trayCabinet);
  for (const side of [-1, 1]) box(trayCabinet, side * 0.86875, 1.44, 0, 0.0625, 2.85, 2, cabinetFinish).name = 'Tray cabinet side';
  box(trayCabinet, 0, 1.44, -0.975, 1.675, 2.85, 0.05, cabinetFinish).name = 'Tray cabinet back';
  for (const y of [0.38, 2.8]) box(trayCabinet, 0, y, 0, 1.675, 0.0625, 1.9, cabinetRailFinish).name = 'Tray cabinet fixed deck';
  box(trayCabinet, 0, 0.19, -0.1, 1.675, 0.3, 1.7, black).name = 'Tray cabinet recessed toe-kick';
  const trayPullout = new THREE.Group();
  trayPullout.name = 'Kitchen vertical tray pull-out';
  trayPullout.userData = { interactiveHouseDoor: { operation: 'sliding', axis: 'z', open: false, closedCenterX: 0, openCenterX: 1.75 }, travelInches: 21, defaultClosed: true };
  trayCabinet.add(trayPullout);
  const trayFront = shakerFront(trayPullout, 0, 1.45, 1.03, 1.65, 2.65);
  cabinetPull(trayFront, 0, 1, 0.09, 0.9);
  box(trayPullout, 0, 0.5, 0, 1.55, 0.0625, 1.7, cabinetRailFinish).name = 'Tray pull-out wooden floor';
  for (const z of [-0.825, 0.825]) box(trayPullout, 0, 0.9, z, 1.55, 0.75, 0.05, cabinetFinish).name = 'Tray pull-out retaining end';
  for (const x of [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75]) box(trayPullout, x, 0.95, 0, 0.04, 0.85, 1.6, cabinetFinish).name = 'Vertical tray divider';
  for (const x of [-0.8, 0.8]) box(trayPullout, x, 0.55, 0, 0.025, 0.12, 1.7, steel).name = 'Conceptual full-extension tray slide';
  for (const [x, height, depth, material, name] of [
    [-0.6, 1.5, 1.3, cabinetRailFinish, 'Stored cutting board'],
    [-0.3, 1.4, 1.5, steel, 'Stored baking sheet'],
    [0, 1.1, 1.25, black, 'Stored muffin tin'],
    [0.3, 1.2, 1.4, steel, 'Stored serving tray'],
    [0.6, 1.3, 1.2, cabinetRailFinish, 'Stored small cutting board']
  ]) box(trayPullout, x, 0.53125 + height / 2, 0, 0.06, height, depth, material).name = name;
  const trash = new THREE.Group();
  trash.name = 'Pull-out trash left of sink';
  trash.position.set(kitchenSinkX - 2.25, 0, kitchenSinkRunZ);
  kitchen.add(trash);
  const trashFront = shakerFront(trash, 0, 1.45, 1.055, 1.45, 2.65);
  trashFront.userData.drawerTravelFeet = 1.75;
  trashFront.userData.drawerFloorY = -0.95;
  trashFront.userData.storageRole = 'Trash and recycling';
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
  const kitchenWindowTrim = new THREE.Group();
  kitchenWindowTrim.name = 'Kitchen joined window bank flush white returns';
  kitchenWindowTrim.position.set(kitchenSinkX, kitchenSinkWindowSill, kitchenWindowWallZ + 0.1);
  kitchenWindowTrim.userData = { windowOpening: true, unitCount: 3, continuousDrywallHeadReturn: true, continuousSill: true, assemblyApproved: false, structuralHeaderVerified: false, provisional: true };
  scene.add(kitchenWindowTrim);
  for (const { name, x, width, picture } of kitchenSinkWindows) {
    const frame = windowFrame(name, x - kitchenSinkX, 0, width, kitchenSinkWindowHeight, 0, 0, kitchenWindowTrim, 1, {
      picture, casing: false
    });
    frame.userData.openingGroup = kitchenCounterWindowBank.name;
  }
  const kitchenWindowBankWidth = kitchenCounterWindowBank.width;
  addWindowShadeDivisions(kitchenWindowTrim, box, windowTrim,
    kitchenSinkWindows.slice(0, -1).map(unit => unit.x + unit.width / 2 - kitchenSinkX),
    0, kitchenSinkWindowHeight, windowFaceDepth(kitchenWindowTrim, 0, 0, 0, 1));
  openingCasing(kitchenWindowTrim, 0, 0, kitchenWindowBankWidth, kitchenSinkWindowHeight,
    windowFaceDepth(kitchenWindowTrim, 0, 0, 0, 1), 1, true, { bottomBoard: false });
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
  for (const [index, x] of [kitchenSinkX - 1.75, kitchenSinkX, kitchenSinkX + 1.75].entries()) {
    const pot = new THREE.Group();
    pot.name = `Kitchen sill flower pot ${index + 1}`;
    pot.position.set(x, kitchenSinkWindowSill, kitchenWindowWallZ + 0.175 - 0.25);
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
  const cooktopBaseWidths = [6, 27, 36, 27, 6].map((inches) => inches / 12);
  const cooktopBaseTotalWidth = cooktopBaseWidths.reduce((sum, width) => sum + width, 0);
  const cooktopBaseFillerWidth = (cooktopRunWidth - cooktopBaseTotalWidth) / 2;
  const cooktopFrontReveal = 0.125 / 12;
  const cooktopBaseHeight = 34.5 / 12;
  const cooktopToeHeight = 4 / 12;
  const cooktopBackX = kitchenWallRight - 0.175 - cookingWallShiftX;
  const cooktopBaseFrontX = cooktopBackX - 2;
  const cooktopDrawerRows = [[4.125, 16.375], [16.5, 28.75], [28.875, 34.375]].map(([bottom, top]) => [bottom / 12, top / 12]);
  const cooktopCabinetry = new THREE.Group();
  cooktopCabinetry.name = 'Extended cooktop base cabinetry';
  cooktopCabinetry.position.x = cookingWallShiftX;
  cooktopCabinetry.userData = { widthInches: cooktopRunWidth * 12, nominalBaseWidthsInches: [6, 27, 36, 27, 6], endFillerWidthInches: cooktopBaseFillerWidth * 12, depthInches: 24, heightInches: 34.5, frontRevealInches: 0.125, manufacturerSelected: false, provisional: true };
  kitchen.add(cooktopCabinetry);
  let cooktopModuleZ = cooktopCenterZ - cooktopBaseTotalWidth / 2;
  for (const [index, width] of cooktopBaseWidths.entries()) {
    const centerZ = cooktopModuleZ + width / 2;
    const body = box(cooktopCabinetry, cooktopBackX - 1, (cooktopToeHeight + cooktopBaseHeight) / 2, centerZ, 2, cooktopBaseHeight - cooktopToeHeight, width, cabinetFinish);
    body.name = 'Standard cooking base cabinet carcass';
    body.userData = { cabinetBody: 'x-', nominalWidthInches: width * 12, nominalHeightInches: 34.5, nominalDepthInches: 24, cooktopBase: index === 2 };
    box(cooktopCabinetry, cooktopBackX - 1.75 / 2, cooktopToeHeight / 2, centerZ, 1.75, cooktopToeHeight, width, cabinetFinish).name = 'Cooking base recessed toe-kick';
    if (width === 6 / 12) {
      const bottom = cooktopDrawerRows[0][0];
      const top = cooktopDrawerRows[2][1];
      const front = shakerFront(cooktopCabinetry, cooktopBaseFrontX - 0.04, (bottom + top) / 2, centerZ, width - cooktopFrontReveal, top - bottom, -Math.PI / 2);
      front.name = index === 0 ? 'Six-inch spice pull-out front' : 'Six-inch board pull-out front';
      front.userData = { ...front.userData, drawerTravelFeet: 1.75, drawerFloorY: -(top - bottom) / 2 + 0.09, drawerBoxHeightFeet: 0.25, narrowStorageRole: index === 0 ? 'Spices' : 'Boards and trays', nominalCabinetWidthInches: 6 };
      cabinetPull(front, 0, (top - bottom) / 2 - 0.3, 0.09, 0.55, true);
    } else {
      drawerFront(cooktopBaseFrontX - 0.04, centerZ, width - cooktopFrontReveal, -Math.PI / 2, cooktopCabinetry, cooktopBaseHeight, cooktopDrawerRows);
    }
    cooktopModuleZ += width;
  }
  const cooktopCounterDepth = 25.5 / 12;
  box(cooktopCabinetry, cooktopBackX - cooktopCounterDepth / 2, (cooktopBaseHeight + 3.05) / 2, cooktopCenterZ,
    cooktopCounterDepth, 3.05 - cooktopBaseHeight, cooktopRunWidth, countertop, true).name = 'Extended cooktop quartz counter';
  for (const side of [-1, 1]) {
    box(cooktopCabinetry, cooktopBaseFrontX - 0.04, (cooktopToeHeight + cooktopBaseHeight) / 2,
      cooktopCenterZ + side * (cooktopRunWidth - cooktopBaseFillerWidth) / 2, 0.08, cooktopBaseHeight - cooktopToeHeight, cooktopBaseFillerWidth, cabinetFinish).name = 'Cooktop casing-side scribe filler';
  }
  const cooktop = box(kitchen, cooktopBackX - 1 + cookingWallShiftX, 3.075, cooktopCenterZ, 1.75, 0.05, 3, black, true);
  cooktop.name = '36 inch induction cooktop';
  const cooktopBurners = new THREE.Group();
  cooktopBurners.name = 'Induction cooktop burner rings';
  kitchen.add(cooktopBurners);
  for (const [x, z] of [[cooktopBackX - 1.42, cooktopCenterZ - 0.75], [cooktopBackX - 0.58, cooktopCenterZ - 0.75], [cooktopBackX - 1.42, cooktopCenterZ + 0.75], [cooktopBackX - 0.58, cooktopCenterZ + 0.75], [cooktopBackX - 1, cooktopCenterZ]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.018, 8, 32), steel);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x + cookingWallShiftX, 3.12, z);
    cooktopBurners.add(ring);
  }
  const cooktopHood = new THREE.Group();
  cooktopHood.name = 'Kitchen cooktop hood';
  cooktopHood.position.x = cookingWallShiftX;
  cooktopHood.userData = { style: 'Warm-white plaster hood joined to flanking Shaker cabinets, tapered in depth', widthInches: 48, topWidthInches: 48, concealedInsertAllowanceInches: 46, provisional: true };
  kitchen.add(cooktopHood);
  const hoodWidth = 48 / 12;
  const hoodTopWidth = hoodWidth;
  const hoodDepth = 24 / 12;
  const hoodTopDepth = 13 / 12;
  const hoodBack = 37.8;
  const hoodBottom = 6.3;
  const hoodBodyBottom = hoodBottom + 0.2;
  const cooktopCorniceBottom = ceilingHeight - 0.15;
  const hoodBodyHeight = cooktopCorniceBottom - hoodBodyBottom;
  const hoodCenterShift = (hoodDepth - hoodTopDepth) / 2;
  const hoodGeometry = new THREE.CylinderGeometry(hoodTopWidth / Math.SQRT2, hoodWidth / Math.SQRT2, hoodBodyHeight, 4, 1, false, Math.PI / 4).toNonIndexed();
  const hoodVertices = hoodGeometry.getAttribute('position');
  // Taper only the front so the sides meet the cabinets and the back stays on the wall.
  for (let i = 0; i < hoodVertices.count; i++) {
    const progress = hoodVertices.getY(i) / hoodBodyHeight + 0.5;
    const depth = hoodDepth + (hoodTopDepth - hoodDepth) * progress;
    hoodVertices.setX(i, hoodVertices.getX(i) * depth / hoodWidth + (progress - 0.5) * hoodCenterShift);
  }
  hoodGeometry.computeVertexNormals();
  const hoodFinish = mat('#e9e4d8', 1);
  const hoodSurround = new THREE.Mesh(hoodGeometry, hoodFinish);
  hoodSurround.name = 'Plaster tapered hood surround';
  hoodSurround.position.set(hoodBack - (hoodDepth + hoodTopDepth) / 4, (hoodBodyBottom + cooktopCorniceBottom) / 2, cooktopCenterZ);
  hoodSurround.castShadow = hoodSurround.receiveShadow = true;
  cooktopHood.add(hoodSurround);
  box(cooktopHood, hoodBack - hoodDepth / 2, hoodBottom + 0.1, cooktopCenterZ, hoodDepth, 0.2, hoodWidth, hoodFinish).name = 'Plain plaster hood lower edge';
  box(cooktopHood, hoodBack - 7 / 12, ceilingHeight - 0.075, cooktopCenterZ, 14 / 12, 0.15, hoodWidth, hoodFinish).name = 'Plaster hood ceiling cornice';
  box(cooktopHood, hoodBack - hoodDepth / 2, hoodBottom - 0.015, cooktopCenterZ, 20 / 12, 0.03, 46 / 12, black).name = 'Concealed hood insert underside';
  box(cooktopHood, 36.65, hoodBottom - 0.045, cooktopCenterZ, 0.12, 0.025, 2.6, kitchenTaskDiffuser).name = 'Cooktop hood task-light strip';
  const cooktopUppers = new THREE.Group();
  cooktopUppers.name = 'Hood-flanking white-oak upper cabinets';
  cooktopUppers.position.x = cookingWallShiftX;
  kitchen.add(cooktopUppers);
  const cooktopUpperWidth = 27 / 12;
  const cooktopUpperDepth = 1;
  const cooktopUpperBottom = 4.55;
  for (const side of [-1, 1]) {
    const upper = new THREE.Group();
    upper.name = `Cooktop ${side === -1 ? 'prep-side' : 'mudroom-side'} upper stack`;
    upper.position.set(hoodBack - cooktopUpperDepth / 2, 0, cooktopCenterZ + side * (hoodWidth + cooktopUpperWidth) / 2);
    upper.rotation.y = -Math.PI / 2;
    upper.userData = { widthInches: cooktopUpperWidth * 12, depthInches: 12, construction: 'Frameless', style: 'Shaker', finish: 'Stained white oak', hoodGapInches: 0, provisional: true };
    cooktopUppers.add(upper);
    upper.userData.nominalTierHeightsInches = [36, 15];
    for (const [bottom, top] of [[cooktopUpperBottom, cooktopUpperBottom + 3], [cooktopUpperBottom + 3, cooktopUpperBottom + 4.25]]) {
      const upperBody = box(upper, 0, (bottom + top) / 2, 0, cooktopUpperWidth, top - bottom, cooktopUpperDepth, cabinetFinish);
      upperBody.name = 'Cooktop upper cabinet carcass';
      upperBody.userData = { cabinetBody: 'z+', nominalWidthInches: cooktopUpperWidth * 12, nominalHeightInches: (top - bottom) * 12, nominalDepthInches: 12 };
      const centerY = (bottom + top) / 2;
      const mainDoors = bottom === cooktopUpperBottom;
      for (const door of [-1, 1]) {
        const front = shakerFront(upper, door * cooktopUpperWidth / 4, centerY, cooktopUpperDepth / 2 + 0.04, cooktopUpperWidth / 2 - cooktopFrontReveal, top - bottom - cooktopFrontReveal);
        cabinetPull(front, -door * (cooktopUpperWidth / 4 - 0.2), bottom + 0.45 - centerY, 0.09, mainDoors ? 0.55 : 0.32, mainDoors);
      }
    }
    box(upper, 0, (cooktopUpperBottom + 4.25 + cooktopCorniceBottom) / 2, 0, cooktopUpperWidth, cooktopCorniceBottom - cooktopUpperBottom - 4.25, cooktopUpperDepth, cabinetFinish).name = 'Cooking upper ceiling scribe';
    box(upper, 0, ceilingHeight - 0.075, 1 / 12, cooktopUpperWidth, 0.15, 14 / 12, cabinetRailFinish).name = 'Cooktop upper ceiling cornice';
    box(upper, 0, cooktopUpperBottom - 0.02, 0.35, cooktopUpperWidth - 0.2, 0.025, 0.06, kitchenTaskDiffuser).name = 'Cooktop under-cabinet task-light strip';
  }
  const cookingDetails = new THREE.Group();
  cookingDetails.name = 'Cooktop finishing details';
  cookingDetails.position.x = cookingWallShiftX;
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
  const bottomRunLeft = 29.1875;
  const bottomRunRight = 37.3;
  const bottomRunCabinetLeft = bottomRunLeft;
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
  bottomRun.userData = { layout: 'Wall-side freezer separated from stair-side fridge by steam-oven storage tower', pantryWidthInches: pantryWidth * 12, wallFillerWidthInches: wallFillerWidth * 12, ceilingHeight, provisional: true };
  const refrigerationPantry = new THREE.Group();
  refrigerationPantry.name = 'Steam oven and pantry tower';
  refrigerationPantry.position.x = pantryCenterX;
  bottomRun.add(refrigerationPantry);
  const pantryDepth = 25 / 12;
  const pantryDoorHeight = upperStorageBottom - 0.3;
  const pantryDoorCenterY = (upperStorageBottom + 0.3) / 2;
  const steamOvenBottom = 2.5;
  const steamOvenTop = 4.5;
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
  steamOven.userData = { nominalWidthInches: 30, allowanceHeightInches: 24, allowanceDepthInches: 24, bottomInches: 30, modelSelected: false, provisional: true };
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
    const upperBody = box(upper, 0, centerY, 26.725 - depth / 2, width, height, depth, cabinetFinish);
    upperBody.name = 'Refrigeration upper carcass';
    upperBody.userData.cabinetBody = 'z-';
    for (const side of [-1, 1]) {
      const front = shakerFront(upper, side * width / 4, centerY, 26.725 - depth - 0.04, width / 2 - 0.04, height - 0.06, Math.PI);
      cabinetPull(front, side * (width / 4 - 0.12), upperStorageBottom + 0.45 - centerY, 0.09, 0.55, true);
    }
  }
  box(bottomRun, bottomRunCenterX, upperStorageTop + 0.075, 25.65, bottomRunWidth, 0.15, 2.15, cabinetRailFinish).name = 'Continuous refrigeration cabinet cornice';
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
    // Approximate an articulating hinge ahead of each panel; these are not manufacturer hinge CAD.
    const hingeX = (name === 'Column freezer' ? -1 : 1) * 29.75 / 24;
    const hingeZ = 1.13;
    const door = new THREE.Group();
    door.name = `${name} conceptual hinged door`;
    door.userData = { interactiveHouseDoor: { operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 115, openRotationSign: name === 'Column freezer' ? -1 : 1 }, conceptualHinge: true };
    door.position.set(hingeX, 0, hingeZ);
    appliance.add(door);
    box(door, -hingeX, (columnHeight + 4 / 12) / 2, 1 + 0.75 / 24 - hingeZ, 29.75 / 12, columnHeight - 4 / 12, 0.75 / 12, steel).name = 'Column stainless door panel';
    box(door, handleX - hingeX, 3.9, 1.13 - hingeZ, 0.065, 2.6, 0.1, black).name = 'Column tower-facing handle';
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
  const islandBody = box(island, 31.15, 1.59, 18.5, 2, 2.46, islandCabinetLength, cabinetFinish);
  islandBody.name = 'Island simple white-oak storage base';
  islandBody.userData.cabinetBody = 'x+';
  box(island, 30.65, 2.935, 18.5, 3.5, 0.23, islandLength, countertop, true).name = 'Island light quartz slab';
  for (const z of [18.5 - islandLength / 2 + 1 / 12, 18.5 + islandLength / 2 - 1 / 12]) {
    box(island, 30.65, 1.41, z, 3.5, 2.82, 2 / 12, countertop).name = 'Island quartz waterfall end';
  }
  for (const offset of [-1, 0, 1]) drawerFront(32.2, 18.5 + offset * islandCabinetLength / 3, islandCabinetLength / 3 - 0.08, Math.PI / 2, island, 2.82);
  const stoolFabric = mat('#a17c57', 0.98);
  const fruitBowl = new THREE.Group();
  fruitBowl.name = 'Everyday island fruit bowl';
  fruitBowl.position.set(30.65, 3.05, 16);
  fruitBowl.userData = { removable: true, diameterInches: 13.2, location: 'Main kitchen island, prep-side end' };
  island.add(fruitBowl);
  cylinder(fruitBowl, 0, 0.025, 0, 0.3, 0.05, cream);
  for (let ring = 0; ring < 5; ring++) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32 + ring * 0.05, 0.025, 8, 40), cream);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.05 + ring * 0.045;
    fruitBowl.add(rim);
  }
  for (const [x, z, color] of [[-0.19, -0.15, '#b64732'], [0.19, -0.14, '#85a34c'], [0, 0.2, '#e49a37']]) {
    addStorageFruit(fruitBowl, x, 0.23, z, color);
  }
  stoolFabric.name = 'Brown stool upholstery';
  const stoolWood = mat('#98704e', 0.6);
  for (const offset of [-1.5, -0.5, 0.5, 1.5]) {
    const stool = new THREE.Group();
    stool.name = 'Kitchen stool';
    stool.userData = { widthInches: 18, centerSpacingInches: stoolSpacingInches, reference: 'Dark-frame stool with brown seat and wood back', viewerFurniture: true };
    stool.position.set(29.28, 0, 18.5 + offset * stoolSpacingInches / 12);
    stool.rotation.y = Math.PI / 2;
    island.add(stool);
    nestedFurniture.push(stool);
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
  scene.add(piano);
  // Keep 1/4 inch beyond the 3/4-inch baseboard; product ventilation is not verified.
  piano.userData.wallRun = { minX: stairOpening.x, maxX: stairOpening.x + stairOpening.width, faceZ: stairOpening.z, rearGapInches: 1, windowShiftInches: 16 };
  piano.userData.viewerFurniture = true;
  piano.position.set((piano.userData.wallRun.minX + piano.userData.wallRun.maxX) / 2 - piano.userData.wallRun.windowShiftInches / 12, 0, stairOpening.z - 1 / 12 - pianoDepth / 2);
  piano.rotation.y = Math.PI;
  piano.userData.location = 'Living side of stair enclosure, 16 inches west toward fireplace windows, keyboard facing north; fireplace built-ins removed, west end 15.68 in to continuous window-wall baseboard (16.43 in to paint); verify occupied bench access, ventilation and power routing';
  rest.name = 'Remaining ground-floor furnishings';
  shell.add(rest);
  const tile = mat('#c5c2b6');
  const mudTileFinish = mat('#ffffff', 0.82);
  mudTileFinish.name = 'Honed warm limestone-look porcelain';
  mudTileFinish.map = quartzTexture('#ded8cd', 'rgba(151, 143, 129, 0.16)');
  const mudGroutFinish = mat('#d8d1c5', 0.95);
  mudGroutFinish.name = 'Matching warm stone grout';
  function furnishing(name, x, z, rotation = 0, elevation = 0, viewerFurniture = false) {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(x, elevation, z);
    group.rotation.y = rotation;
    if (viewerFurniture) group.userData.viewerFurniture = true;
    rest.add(group);
    return group;
  }

  function tiledFloor(name, x, z, width, depth, material = tile, { tileWidth = 2, tileDepth = 2, groutWidth = 0.015, groutMaterial = cream } = {}) {
    const surface = box(rest, x + width / 2, 0.02, z + depth / 2, width, 0.03, depth, material);
    surface.name = name;
    surface.userData = { tileWidthInches: tileWidth * 12, tileDepthInches: tileDepth * 12, groutWidthInches: groutWidth * 12 };
    for (let col = tileWidth; col < width; col += tileWidth) box(rest, x + col, 0.038, z + depth / 2, groutWidth, 0.005, depth, groutMaterial).name = `${name} grout`;
    for (let row = tileDepth; row < depth; row += tileDepth) box(rest, x + width / 2, 0.038, z + row, width, 0.005, groutWidth, groutMaterial).name = `${name} grout`;
  }

  const stairs = furnishing('U-shaped hall staircase', stairOpening.x + stairOpening.width, stairOpening.z, stairOpening.rotation);
  stairs.scale.z = -1;
  scene.add(stairs);
  const stairDepth = stairOpening.depth;
  const outerStairRailZ = stairDepth - 0.08;
  const landingHeight = stairRisers * stairRise;
  const landingEndX = stairRun + stairLandingDepth;
  // Painted enclosure occupies the former recess zone, not a removable shelf group.
  const stairEnclosureDepth = 11 / 12;
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

  const stairStepGlow = new THREE.MeshStandardMaterial({ color: '#fff0d7', emissive: '#ffd5a0', emissiveIntensity: 0, roughness: 0.6 });
  const alcoveGuard = furnishing('Guest entry stair-side guard', 0, 0, 0, 0.005);
  alcoveGuard.userData = { provisional: true, approvalRequired: true, note: '42-inch horizontal guard concept; engineer review of wall removal, jamb support, anchorage, openings and climbability required. Existing stair handrail omissions remain unresolved.' };
  const guard = guestEntry.stairGuard;
  for (const x of [guard.x + guard.postWidth / 2, guard.endX - guard.postWidth / 2]) {
    box(alcoveGuard, x, guard.height / 2, guard.z, guard.postWidth, guard.height, guard.postWidth, black).name = 'Alcove stair guard post';
  }
  box(alcoveGuard, (guard.x + guard.endX) / 2, guard.height - 0.06, guard.z, guard.endX - guard.x, 0.12, 0.12, black).name = 'Alcove stair guard top rail';
  for (let rail = 1; rail <= guard.barCount; rail++) {
    box(alcoveGuard, (guard.x + guard.endX) / 2, rail * guard.barSpacing, guard.z, guard.endX - guard.x, 0.045, 0.045, black).name = 'Alcove stair horizontal guard rail';
  }
  // The removed wall also backed part of the upper flight: a ground guard alone cannot protect it.
  const exposedUpperGuard = new THREE.Group();
  exposedUpperGuard.name = 'Newly exposed upper-flight outer guard';
  exposedUpperGuard.userData = { provisional: true, approvalRequired: true, note: 'Partial outer guard replaces removed wall backing only; remaining wall-backed handrail continuity still requires review.' };
  stairs.add(exposedUpperGuard);
  const exposedRun = stairOpening.x + stairOpening.width - guard.x;
  const exposedPitch = [
    [exposedRun, stairFloorToFloor - stairRise / 2 - exposedRun * stairRise / stairGoing],
    [stairGoing / 2, stairFloorToFloor - stairRise],
    [0, stairFloorToFloor]
  ];
  for (let segment = 1; segment < exposedPitch.length; segment++) {
    const [x1, y1] = exposedPitch[segment - 1], [x2, y2] = exposedPitch[segment];
    stairBeam('Exposed upper-flight handrail', [x1, y1 + 3, stairDepth], [x2, y2 + 3, stairDepth], 0.12, 0.12, oak, exposedUpperGuard);
    for (let rail = 1; rail <= 8; rail++) stairBeam('Exposed upper-flight horizontal rail', [x1, y1 + rail / 3, stairDepth], [x2, y2 + rail / 3, stairDepth], 0.045, 0.045, black, exposedUpperGuard);
  }
  for (const [x, y] of exposedPitch) {
    const treadY = x === 0 ? stairFloorToFloor : landingHeight + Math.floor((stairRun - x) / stairGoing + 1e-8 + 1) * stairRise;
    box(exposedUpperGuard, x, (treadY + y + 3) / 2, stairDepth, 0.09, y + 3 - treadY, 0.09, black).name = 'Exposed upper-flight guard post';
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
      const backingX = x + direction * 0.04;
      const backingLength = stairGoing - 0.08;
      box(flight, upper ? backingX : x, height - 0.15, centerZ, upper ? backingLength : stairGoing, 0.1, flightWidth, wallMaterial).name = 'Hollow stairwell soffit';
      if (!upper) {
        const enclosureHeight = height - 0.2;
        // Full-height painted infill meets the soffit underside at every tread.
        // This is a finish envelope, not a specified solid structural wall.
        box(flight, x, enclosureHeight / 2, stairEnclosureDepth / 2, stairGoing, enclosureHeight, stairEnclosureDepth, wallMaterial).name = 'Continuous stair-side enclosure';
      }
      box(flight, x, height - 0.05, centerZ, stairGoing, 0.1, flightWidth, oak).name = 'Upstairs oak tread';
      box(flight, x - direction * (stairGoing / 2 - 0.02), height + 0.003, centerZ, 0.04, 0.006, flightWidth, walnut).name = 'Stair tread nosing';
      box(flight, x - direction * (stairGoing / 2 - 0.04), height - (stairRise + 0.1) / 2, centerZ, 0.08, stairRise - 0.1, flightWidth, cream).name = 'Stair riser';
      const led = box(flight, x - direction * (stairGoing / 2 + 0.0125), height - 0.14, centerZ, 0.025, 0.04, flightWidth - 0.25, stairStepGlow);
      led.name = 'Interior stair LED strip';
      led.userData = { colorTemperatureKelvin: 2700, recessedDiffuser: true, provisional: true };
      const treadLight = new THREE.PointLight('#ffd5a0', 0, 2, 2);
      treadLight.name = 'Interior stair LED tread wash';
      treadLight.position.set(x - direction * (stairGoing / 2 + 0.15), height - 0.18, centerZ);
      flight.add(treadLight);
    }
    const endX = startX + direction * stairRun;
    const endHeight = baseHeight + landingHeight;
    // The top riser sits before the landing and stops beneath its 0.2 ft slab.
    box(flight, endX - direction * 0.04, endHeight - (stairRise + 0.2) / 2, centerZ, 0.08, stairRise - 0.2, flightWidth, cream).name = 'Landing riser';
    for (const side of [-1, 1]) {
      const stringerZ = centerZ + side * (flightWidth / 2 - 0.12);
      stairBeam('Stair stringer', [startX, baseHeight - 0.2, stringerZ], [endX, endHeight - stairRise - 0.2, stringerZ], 0.12, 0.3, oak);
      // Retained powder wall backs the rest; the newly exposed outer segment is guarded above.
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
  // The required upper arrival is flush hardwood in the upstairs floor group,
  // not a tan stair-owned platform projecting over the ground-floor cutaway.
  box(stairs, (stairRun + landingEndX) / 2, landingHeight - 0.25, stairDepth / 2, landingEndX - stairRun, 0.1, stairDepth, wallMaterial).name = 'Hollow turning-landing soffit';
  const landingEnclosureHeight = landingHeight - 0.3;
  box(stairs, (stairRun + landingEndX) / 2, landingEnclosureHeight / 2, stairEnclosureDepth / 2, landingEndX - stairRun, landingEnclosureHeight, stairEnclosureDepth, wallMaterial).name = 'Continuous landing-side enclosure';
  const stairBaseTrim = new THREE.Group();
  stairBaseTrim.name = 'Under-stair base trim';
  stairBaseTrim.userData = { heightInches: 8, thicknessInches: 0.75 };
  stairs.add(stairBaseTrim);
  const stairBaseTrimEndX = stairOpening.width;
  box(stairBaseTrim, (stairGoing + stairBaseTrimEndX) / 2, 0.005 + 4 / 12, -0.75 / 24, stairBaseTrimEndX - stairGoing, 8 / 12, 0.75 / 12, windowTrim).name = 'Under-stair white baseboard';
  const firstStepTrimHeight = Math.min(8 / 12, stairRise - 0.1);
  box(stairBaseTrim, stairGoing / 2, 0.005 + firstStepTrimHeight / 2, -0.75 / 24, stairGoing, firstStepTrimHeight, 0.75 / 12, windowTrim).name = 'Bottom-step baseboard extension';
  box(stairBaseTrim, -0.75 / 24, 0.005 + firstStepTrimHeight / 2, (stairWidth - 0.75 / 12) / 2, 0.75 / 12, firstStepTrimHeight, stairWidth + 0.75 / 12, windowTrim).name = 'Bottom-step front trim return';
  box(stairBaseTrim, landingEndX + 0.75 / 24, 0.005 + 4 / 12, (stairEnclosureDepth - 0.75 / 12) / 2, 0.75 / 12, 8 / 12, stairEnclosureDepth + 0.75 / 12, windowTrim).name = 'Enclosure end baseboard return';
  const landingGuardZ = -0.08;
  stairBeam('Turning landing side handrail', [stairRun, landingHeight + 3, landingGuardZ], [landingEndX, landingHeight + 3, landingGuardZ], 0.12, 0.12, oak);
  for (let rail = 1; rail <= 8; rail++) {
    stairBeam('Horizontal landing guard rail', [stairRun, landingHeight + rail / 3, landingGuardZ], [landingEndX, landingHeight + rail / 3, landingGuardZ], 0.045, 0.045, black);
  }
  for (const x of [stairRun, landingEndX - 0.045]) {
    box(stairs, x, landingHeight + 1.5, landingGuardZ, 0.09, 3, 0.09, black).name = 'Landing guard post';
  }

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
      // Photo-matched powder-room side of the basement entry: keep its stringer.
      // Wall/handrail continuity at the entrance remains a professional-review item.
      if (!returning && side === 1) continue;
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

  function cabinet(parent, x, z, width, depth = 2, height = 2.85, includeCounter = true) {
    const baseHeight = height === 2.85 ? 34.5 / 12 : height;
    box(parent, x, baseHeight / 2 + (height === 2.85 ? 0 : 0.05), z, width, baseHeight, depth, cabinetFinish).userData = { cabinetBody: 'z+', nominalWidthInches: width * 12 };
    if (includeCounter) box(parent, x, height + 0.12, z, width + 0.06, 0.14, depth + 0.05, countertop);
    const doors = Math.max(1, Math.round(width / 1.5));
    for (let i = 0; i < doors; i++) {
      const center = x - width / 2 + (i + 0.5) * width / doors;
      const front = shakerFront(parent, center, height / 2 + 0.05, z + depth / 2 + 0.04, width / doors - 0.04, height - 0.04);
      front.userData.hingeSide = i % 2 === 0 ? -1 : 1;
      cabinetPull(front, 0, Math.min(height - 0.3, 4) - (height / 2 + 0.05), 0.09, 0.65);
    }
  }

  const prep = furnishing('Prep kitchen cabinetry', 0, 0);
  box(prep, 48.025, 2.97, kitchenWindowWallZ + 0.2, 14.35, 0.14, 0.05, countertop).name = 'Prep quartz rear wall closure';
  box(prep, 55.2625, 1.4375, prepCounterZ, 0.125, 2.875, 2, cabinetFinish).name = 'Prep east wall scribe';
  box(prep, 55.2625, 2.97, prepCounterZ - 0.025, 0.125, 0.14, 2.1, countertop).name = 'Prep quartz east wall closure';
  for (const [x, width] of [[43.4, 5], [51.4, 2]]) {
    box(prep, x, 2.8875, prepCounterZ, width, 0.025, 2, cabinetRailFinish).name = 'Prep cabinet counter support packer';
    box(prep, x, 1.4375, kitchenWindowWallZ + 0.2125, width, 2.875, 0.075, cabinetFinish).name = 'Prep cabinet rear wall scribe';
  }
  for (const x of [42.15, 44.65]) cabinet(prep, x, prepCounterZ, 2.5, 2, 2.85, false);
  box(prep, 40.875, 1.475, prepCounterZ, 0.05, 2.85, 2, cabinetFinish).name = 'Prep left 0.6 inch scribe filler';
  box(prep, 43.375, 2.97, prepCounterZ, 5.11, 0.14, 2.05, countertop).name = 'Prep continuous left quartz counter';
  cabinet(prep, 51.4, prepCounterZ, 2, 2, 2.85, false);
  box(prep, 51.385, 2.97, prepCounterZ, 2.03, 0.14, 2.05, countertop).name = 'Prep right cupboard quartz counter';
  const prepDishwasher = furnishing('Prep 18 inch integrated dishwasher', prepSinkX + 2.25, prepCounterZ);
  prepDishwasher.userData = { nominalWidthInches: 18, bayDepthInches: 24, panelReady: false, modelSelected: false, installationVerified: false, provisional: true };
  box(prepDishwasher, 0, 1.55, 0, 1.46, 2.65, 1.92, steel).name = 'Prep dishwasher appliance body';
  const prepDishwasherFront = box(prepDishwasher, 0, 1.525, 1.04, 1.46, 2.65, 0.06, steel);
  prepDishwasherFront.name = 'Prep dishwasher exposed stainless door';
  box(prepDishwasherFront, 0, 1.12, 0.04, 1.36, 0.24, 0.03, black).name = 'Prep dishwasher visible control strip';
  box(prepDishwasherFront, 0, 0.89, 0.12, 1.1, 0.07, 0.12, steel).name = 'Prep dishwasher stainless handle';
  box(prepDishwasher, 0, 0.15, 0.97, 1.4, 0.16, 0.08, black).name = 'Prep dishwasher recessed toe-kick';
  box(prep, prepSinkX + 2.22, 2.97, prepCounterZ, 1.5, 0.14, 2.05, countertop).name = 'Prep quartz counter over dishwasher';
  const prepExtension = furnishing('Prep counter extension with six drawers', 53.775, prepCounterZ);
  prepExtension.userData = { widthInches: 33, depthInches: 24, drawerBanks: 2, drawers: 6, provisional: true };
  const prepExtensionBody = box(prepExtension, 0, 34.5 / 24, 0, 2.75, 34.5 / 12, 2, cabinetFinish);
  prepExtensionBody.name = 'Prep extension cabinet carcass';
  prepExtensionBody.userData.cabinetBody = 'z+';
  box(prepExtension, 0, 2.8875, 0, 2.75, 0.025, 2, cabinetRailFinish).name = 'Prep extension counter support packer';
  box(prepExtension, 0, 1.4375, -1.0375, 2.75, 2.875, 0.075, cabinetFinish).name = 'Prep extension rear wall scribe';
  box(prepExtension, 0.04, 2.97, 0, 2.83, 0.14, 2.05, countertop).name = 'Prep extension quartz counter';
  box(prepExtension, 1.4, 1.475, 0, 0.05, 2.85, 2, cabinetFinish).name = 'Prep right 0.6 inch scribe filler';
  for (const x of [-0.6875, 0.6875]) drawerFront(x, 1.04, 1.335, 0, prepExtension);
  const prepSink = new THREE.Group();
  prepSink.name = 'Prep single-bowl sink and base';
  prepSink.position.set(prepSinkX, 0, prepCounterZ);
  prepSink.userData = { nominalSinkWidthInches: 30, sinkDepthInches: 18, baseWidthInches: 36, provisional: true };
  prep.add(prepSink);
  const prepSinkBody = box(prepSink, 0, 1.1, 0, 3, 2.1, 2, cabinetFinish);
  prepSinkBody.name = 'Prep sink low cabinet carcass';
  prepSinkBody.userData.cabinetBody = 'z+';
  for (const side of [-1, 1]) {
    box(prepSink, side * (1.5 - 0.03125), 2.5, 0, 0.0625, 0.7, 2, cabinetFinish).name = 'Prep sink cabinet side';
    box(prepSink, side * (1.5 - 0.03125), 2.875, 0, 0.0625, 0.05, 2, cabinetRailFinish).name = 'Prep sink counter support packer';
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
  const prepTrimBottom = prepCounterWindowBank.sill - 1 / 12 - casingSideWidth;
  const prepTrimHalfWidth = prepCounterWindowBank.width / 2 + casingSideWidth + casingReveal;
  box(prep, 48.025, (3.04 + prepTrimBottom) / 2, kitchenWindowWallZ + 0.2175, 14.35, prepTrimBottom - 3.04, 0.085, countertop).name = 'Prep quartz backsplash';
  for (const [left, right] of [[40.85, prepCounterWindowBank.x - prepTrimHalfWidth - 1 / 192], [prepCounterWindowBank.x + prepTrimHalfWidth + 1 / 192, 55.2]]) {
    box(prep, (left + right) / 2, (prepTrimBottom + 3.04 + 4 / 12) / 2, kitchenWindowWallZ + 0.2175,
      right - left, 3.04 + 4 / 12 - prepTrimBottom, 0.085, countertop).name = 'Prep quartz backsplash';
  }
  const prepWindowBank = new THREE.Group();
  prepWindowBank.name = prepCounterWindowBank.name;
  prepWindowBank.position.set(prepCounterWindowBank.x, 0, prepCounterWindowBank.z);
  prepWindowBank.userData = { windowOpening: true, unitCount: 3, assemblyApproved: false, structuralHeaderVerified: false, provisional: true };
  rest.add(prepWindowBank);
  for (const window of prepCounterWindows) {
    const frame = windowFrame(window.name, window.x - prepCounterWindowBank.x, 0, window.width, window.height, window.sill, 0, prepWindowBank, 1, { picture: window.picture, standardSizeCode: window.standardSizeCode, casing: false });
    frame.userData.openingGroup = prepCounterWindowBank.name;
  }
  openingCasing(prepWindowBank, 0, prepCounterWindowBank.sill, prepCounterWindowBank.width, prepCounterWindowBank.height, windowFaceDepth(prepWindowBank, 0, prepCounterWindowBank.sill, 0, 1), 1, true);
  addWindowShadeDivisions(prepWindowBank, box, windowTrim,
    prepCounterWindows.slice(0, -1).map(unit => unit.x + unit.width / 2 - prepCounterWindowBank.x),
    prepCounterWindowBank.sill, prepCounterWindowBank.height, windowFaceDepth(prepWindowBank, 0, prepCounterWindowBank.sill, 0, 1));
  windowFrame(prepEndWindow.name, prepEndWindow.x, prepEndWindow.z, prepEndWindow.width, prepEndWindow.height, prepEndWindow.sill, -Math.PI / 2, rest, 1, { standardSizeCode: prepEndWindow.standardSizeCode });
  for (const { name, x, z, width, height, sill, sillAboveFloor } of garageClerestories) {
    const frame = windowFrame(name, x, z, width, height, sill, -Math.PI / 2, rest, 1, { picture: true });
    Object.assign(frame.userData, { room: 'Garage', sillAboveFloorInches: sillAboveFloor * 12, structureVerified: false });
  }
  const prepTower = furnishing('Prep microwave and wall oven tower', 39.375, kitchenWindowWallZ + 0.25 + 1);
  const prepTowerWidth = 33 / 12;
  const prepTowerDepth = 24 / 12;
  const prepTowerSide = 0.75 / 12;
  const prepApplianceBottom = 1;
  const prepApplianceTop = 5;
  const prepTowerFront = prepTowerDepth / 2 + 0.04;
  prepTower.userData = { widthInches: 33, depthInches: 24, heightInches: 96, nominalApplianceWidthInches: 30, allowanceHeightInches: 48, modelSelected: false, provisional: true };
  box(prepTower, -prepTowerWidth / 2 - 0.325 / 2, 4, 0, 0.325, 8, prepTowerDepth, cabinetFinish).name = 'Prep tower west wall filler';
  box(prepTower, prepTowerWidth / 2 + 0.05, 1.4375, 0, 0.1, 2.875, prepTowerDepth, cabinetFinish).name = 'Prep tower to base filler';
  box(prepTower, prepTowerWidth / 2 + 0.035, 2.97, -0.025, 0.07, 0.14, 2.1, countertop).name = 'Prep tower landing quartz closure';
  box(prepTower, -0.1625, 4, -prepTowerDepth / 2 - 0.0375, prepTowerWidth + 0.325, 8, 0.075, cabinetFinish).name = 'Prep tower rear wall scribe';
  for (const side of [-1, 1]) {
    box(prepTower, side * (prepTowerWidth - prepTowerSide) / 2, 4.075, 0, prepTowerSide, 7.55, prepTowerDepth, cabinetFinish).name = 'Prep appliance tower side';
  }
  box(prepTower, 0, 4.075, -prepTowerDepth / 2 + 0.025, prepTowerWidth - 2 * prepTowerSide, 7.55, 0.05, cabinetFinish).name = 'Prep appliance tower backing';
  box(prepTower, 0, 0.15, 0, prepTowerWidth - 0.2, 0.3, prepTowerDepth - 0.2, black).name = 'Prep appliance tower toe-kick';
  for (const y of [prepApplianceBottom - prepTowerSide / 2, prepApplianceTop + prepTowerSide / 2]) {
    box(prepTower, 0, y, 0, prepTowerWidth - 2 * prepTowerSide, prepTowerSide, prepTowerDepth, cabinetRailFinish).name = 'Prep appliance support shelf';
  }
  for (const [bottom, top] of [[0.3, prepApplianceBottom - prepTowerSide], [prepApplianceTop + prepTowerSide, 7.85]]) {
    for (const side of [-1, 1]) {
      const front = shakerFront(prepTower, side * prepTowerWidth / 4, (bottom + top) / 2, prepTowerFront, prepTowerWidth / 2 - 0.04, top - bottom - 0.04);
      cabinetPull(front, -side * (prepTowerWidth / 4 - 0.15), bottom < prepApplianceBottom ? (top - bottom) / 2 - 0.35 : -(top - bottom) / 2 + 0.35, 0.09, 0.6, true);
    }
  }
  box(prepTower, 0, 7.925, 0, prepTowerWidth, 0.15, prepTowerDepth, cabinetRailFinish).name = 'Prep appliance tower cornice';
  const prepCombination = new THREE.Group();
  prepCombination.name = '30-inch microwave and wall oven combination';
  prepCombination.userData = { nominalWidthInches: 30, allowanceHeightInches: 48, allowanceDepthInches: 24, bottomInches: 12, modelSelected: false, provisional: true };
  prepCombination.position.y = -1;
  prepTower.add(prepCombination);
  box(prepCombination, 0, 4, 0.05, 2.5, 4, 1.9, steel).name = 'Prep combination appliance envelope';
  for (const [name, y, height, handleY] of [['Wall oven', 3.25, 2.1, 4.15], ['Microwave', 5.2, 1.15, 4.72]]) {
    box(prepCombination, 0, y, prepTowerFront + 0.03, 2.25, height, 0.02, black).name = `Prep ${name} glass door`;
    box(prepCombination, 0, handleY, prepTowerFront + 0.12, 2.1, 0.07, 0.1, steel).name = `Prep ${name} handle`;
  }
  box(prepCombination, 0, 5.9, prepTowerFront + 0.03, 2.25, 0.15, 0.02, black).name = 'Prep combination appliance controls';
  const prepCounterAppliances = new THREE.Group();
  prepCounterAppliances.name = 'Prep countertop appliances';
  rest.add(prepCounterAppliances);
  const prepToaster = new THREE.Group();
  prepToaster.name = 'Prep two slice toaster';
  prepToaster.position.set(44.8, 3.04, 7.9);
  prepToaster.userData = { widthInches: 11, depthInches: 7, heightInches: 8, provisional: true, operatingClearancesVerified: false };
  prepCounterAppliances.add(prepToaster);
  box(prepToaster, 0, 1 / 3, 0, 11 / 12, 2 / 3, 7 / 12, steel, true).name = 'Prep toaster stainless body';
  for (const x of [-0.2, 0.2]) box(prepToaster, x, 0.67, 0, 0.09, 0.015, 0.43, black).name = 'Prep toaster bread slot';
  box(prepToaster, 0.48, 0.32, 0.12, 0.06, 0.08, 0.16, black).name = 'Prep toaster lever';
  const blenderGlass = new THREE.MeshStandardMaterial({ color: '#d8e5df', transparent: true, opacity: 0.45, roughness: 0.15, depthWrite: false });
  const mixerPaint = mat('#ded8c9', 0.35);
  const prepApplianceSpecs = [
    ['Prep stand mixer', 50.3 + 12.6 / 24, 12.6, 16.8, 16.8],
    ['Breville Super Q blender', 50.3 + (12.6 + 2 + 8.1 / 2) / 12, 8.1, 10.5, 18.1],
    ['Prep rice cooker', 52.858333333333334, 12, 14.4, 12.6],
    ['Prep Ninja air fryer', 54.225, 16.8, 15.6, 13.2]
  ];
  const prepApplianceRearZ = kitchenWindowWallZ + 0.425;
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

  function addStorageFruit(parent, x, y, z, color) {
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), mat(color));
    fruit.name = 'Room-temperature whole fruit';
    fruit.position.set(x, y, z);
    parent.add(fruit);
    cylinder(parent, x, y + 0.15, z, 0.012, 0.06, oak).name = 'Fruit stem';
  }

  const prepShelfStart = 37.5 + 0.175;
  const prepShelfEnd = 55.5 - 0.175;
  const prepShelves = furnishing('Prep open pantry shelves', (prepShelfStart + prepShelfEnd) / 2, 14.825 - 8 / 12);
  const prepShelfWidth = prepShelfEnd - prepShelfStart;
  const prepShelfDepth = 16 / 12;
  const prepShelfThickness = 0.75 / 12;
  const prepShelfBottom = 0.75;
  const prepShelfLevels = [1, 2.3, 3.6, 4.9, 6.2, 7.5, ceilingHeight - prepShelfThickness / 2];
  const prepShelfBays = 5;
  const prepCleaningBay = 0;
  const prepRobotBay = prepShelfBays - 1;
  prepShelves.userData = { widthInches: prepShelfWidth * 12, depthInches: 16, bays: prepShelfBays, foodBays: 4, cleaningBays: 1, cleaningBayDepthInches: 16, robotDockBay: 5, shelfLevels: prepShelfLevels.length, ceilingHeight, provisional: true };
  for (let support = 0; support <= prepShelfBays; support++) {
    const x = -prepShelfWidth / 2 + prepShelfThickness / 2 + support * (prepShelfWidth - prepShelfThickness) / prepShelfBays;
    box(prepShelves, x, (prepShelfBottom + ceilingHeight) / 2, 0, prepShelfThickness, ceilingHeight - prepShelfBottom, prepShelfDepth, cabinetFinish).name = 'Pantry shelf upright';
  }
  for (const y of prepShelfLevels) {
    for (let bay = 0; bay < prepShelfBays; bay++) {
      if (bay === prepCleaningBay || (bay === prepRobotBay && y === prepShelfLevels[0])) continue;
      const bayWidth = (prepShelfWidth - prepShelfThickness) / prepShelfBays;
      const x = -prepShelfWidth / 2 + prepShelfThickness / 2 + (bay + 0.5) * bayWidth;
      box(prepShelves, x, y, 0, bayWidth - prepShelfThickness, prepShelfThickness, prepShelfDepth, cabinetRailFinish).name = 'Open pantry shelf';
    }
  }

  const prepCleaningLeft = prepShelfStart + 0.175;
  const prepCleaningRight = prepShelfStart + (prepShelfWidth - prepShelfThickness) / prepShelfBays;
  const prepCleaningWidth = prepCleaningRight - prepCleaningLeft;
  const prepCleaningDepth = prepShelfDepth;
  const prepCleaningRearZ = 14.825;
  const cleaningStation = furnishing('Prep cleaning station', (prepCleaningLeft + prepCleaningRight) / 2, prepCleaningRearZ - prepCleaningDepth / 2);
  cleaningStation.userData = { convertedPantryBay: 1, widthInches: prepCleaningWidth * 12, clearWidthInches: (prepCleaningWidth - 2 * prepShelfThickness) * 12, depthInches: 16, tallOpeningHeightInches: (6.2 - prepShelfThickness / 2) * 12, upperShelfLevels: 2, doors: false, equipmentSelected: false, provisional: true };
  box(cleaningStation, -prepCleaningWidth / 2 - (0.175 - prepShelfThickness) / 2, (prepShelfBottom + ceilingHeight) / 2, 0, 0.175 - prepShelfThickness, ceilingHeight - prepShelfBottom, prepCleaningDepth, cabinetFinish).name = 'Prep cleaning bay end scribe';
  for (const side of [-1, 1]) {
    box(cleaningStation, side * (prepCleaningWidth - prepShelfThickness) / 2, ceilingHeight / 2, 0, prepShelfThickness, ceilingHeight, prepCleaningDepth, cabinetFinish).name = 'Cleaning station full-height side panel';
  }
  box(cleaningStation, 0, ceilingHeight / 2, prepCleaningDepth / 2 - 0.03, prepCleaningWidth - 2 * prepShelfThickness, ceilingHeight, 0.06, cabinetFinish).name = 'Cleaning station backing';
  for (const y of [6.2, 7.5, ceilingHeight - prepShelfThickness / 2]) {
    box(cleaningStation, 0, y, -0.03, prepCleaningWidth - 2 * prepShelfThickness, prepShelfThickness, prepCleaningDepth - 0.06, cabinetRailFinish).name = y > 8 ? 'Cleaning station ceiling cap' : 'Cleaning station upper shelf';
  }
  const cleaningVacuum = new THREE.Group();
  cleaningVacuum.name = 'Prep stored stick vacuum';
  cleaningVacuum.position.set(-1.05, 0, -0.05);
  cleaningVacuum.userData = { widthInches: 10.2, depthInches: 9, heightInches: 48, productSelected: false, provisional: true };
  cleaningStation.add(cleaningVacuum);
  box(cleaningVacuum, 0, 0.14, 0, 0.85, 0.28, 0.75, black, true).name = 'Stored vacuum floor head';
  cylinder(cleaningVacuum, 0, 1.9, 0, 0.045, 3.4, steel).name = 'Stored vacuum wand';
  box(cleaningVacuum, 0, 3.45, 0, 0.4, 0.75, 0.45, black, true).name = 'Stored vacuum motor and battery';
  box(cleaningVacuum, 0, 3.85, 0.1, 0.3, 0.3, 0.12, steel).name = 'Stored vacuum grip';
  box(cleaningStation, -1.05, 3.25, 0.35 + 2 / 12, 0.38, 0.65, 0.16, black).name = 'Vacuum wall charging mount allowance';
  box(cleaningStation, -1.05, 3.25, 0.22 + 1 / 12, 0.12, 0.12, 0.42 + 2 / 12, black).name = 'Vacuum mount support';
  const cleaningBroom = new THREE.Group();
  cleaningBroom.name = 'Prep stored broom';
  cleaningBroom.position.set(-0.25, 0, 0.1);
  cleaningStation.add(cleaningBroom);
  cylinder(cleaningBroom, 0, 2.35, 0, 0.035, 4.1, oak).name = 'Stored broom handle';
  box(cleaningBroom, 0, 0.35, 0, 0.5, 0.2, 0.2, black).name = 'Stored broom head';
  for (let bristle = 0; bristle < 6; bristle++) box(cleaningBroom, (bristle - 2.5) * 0.08, 0.15, 0, 0.065, 0.3, 0.18, linen).name = 'Broom bristles';
  box(cleaningStation, -0.25, 4.25, 0.28 + 1 / 12, 0.12, 0.14, 0.32 + 2 / 12, brass).name = 'Broom retaining clip allowance';
  box(cleaningStation, 0.2, 1.3, prepCleaningDepth / 2 - 0.08, 0.25, 0.4, 0.03, cream).name = 'Cleaning station power outlet allowance';
  for (const x of [-0.75, 0.75]) {
    box(cleaningStation, x, 6.55, 0, 1.15, 0.63, 0.75, linen, true).name = 'Cleaning accessory storage bin';
  }

  const prepRobotBayWidth = (prepShelfWidth - prepShelfThickness) / prepShelfBays;
  const prepRobotX = prepShelfStart + prepShelfThickness / 2 + (prepRobotBay + 0.5) * prepRobotBayWidth;
  const robotDock = furnishing('Prep robot docking station', prepRobotX, prepCleaningRearZ - 0.6, Math.PI / 2);
  robotDock.userData = { pantryBay: prepRobotBay + 1, orientation: 'Sideways, facing west along the shelves', floorLevelRobotAccess: true, threshold: false, doors: false, depthAllowanceInches: 14, overheadClearHeightInches: (prepShelfLevels[1] - prepShelfThickness / 2) * 12, dockingClearancesVerified: false, provisional: true };
  const cleaningRobot = new THREE.Group();
  cleaningRobot.name = 'Prep iRobot vacuum allowance';
  cleaningRobot.position.set(0, 0, -0.15);
  cleaningRobot.userData = { manufacturerReference: 'iRobot', modelSelected: false, diameterInches: 14, heightInches: 4, dockType: 'Compact charging base only; no self-emptying tower', dockingClearancesVerified: false, provisional: true };
  robotDock.add(cleaningRobot);
  cylinder(cleaningRobot, 0, 2 / 12, 0, 7 / 12, 4 / 12, black).name = 'Robot vacuum body allowance';
  cylinder(cleaningRobot, 0, 4 / 12 - 0.005, 0, 0.14, 0.01, steel).name = 'Robot vacuum top control';
  box(robotDock, 0, 1 / 3, 0.64, 14 / 12, 2 / 3, 0.25, black, true).name = 'Compact robot charging base allowance';
  box(robotDock, 0, 0.12, 0.48, 0.8, 0.12, 0.08, steel).name = 'Robot charging contacts allowance';
  box(prepShelves, prepRobotX - prepShelves.position.x + 0.9, 0.75, prepShelfDepth / 2 - 0.04, 0.25, 0.4, 0.03, cream).name = 'Robot dock power outlet allowance';

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
      if (bay === prepCleaningBay || (bay === prepRobotBay && level === 0)) continue;
      const bayWidth = (prepShelfWidth - prepShelfThickness) / prepShelfBays;
      const supplies = new THREE.Group();
      supplies.name = `Pantry supplies bay ${bay + 1} level ${level + 1}`;
      supplies.position.set(-prepShelfWidth / 2 + prepShelfThickness / 2 + (bay + 0.5) * bayWidth, prepShelfLevels[level] + prepShelfThickness / 2, 0);
      pantryContents.add(supplies);
      if (bay === 1 && level === 2) {
        const breadBox = new THREE.Group();
        breadBox.name = 'Removable prep pantry bread box';
        breadBox.userData = { purchasedSeparately: true, envelopeInches: [18, 10, 9], pantryBay: 2, ventilation: 'Rear slots; select a food-safe bread container' };
        supplies.add(breadBox);
        box(breadBox, 0, 0.025, 0, 1.5, 0.05, 10 / 12, oak).name = 'Bread box base';
        for (const side of [-1, 1]) box(breadBox, side * 0.725, 0.375, 0, 0.05, 0.75, 10 / 12, oak).name = 'Bread box side';
        box(breadBox, 0, 0.725, 0, 1.5, 0.05, 10 / 12, oak).name = 'Bread box lid';
        box(breadBox, 0, 0.375, -0.395, 1.4, 0.65, 0.04, cream).name = 'Bread box lift-up front';
        box(breadBox, 0, 0.18, -0.44, 0.35, 0.045, 0.06, brass).name = 'Bread box handle';
        for (let slat = 0; slat < 5; slat++) box(breadBox, 0, 0.09 + slat * 0.14, 0.395, 1.4, 0.09, 0.04, oak).name = 'Bread box ventilated back';
        continue;
      }
      if (bay === 1 && level === 1) {
        for (const [index, x] of [-0.77, 0.77].entries()) {
          const basket = new THREE.Group();
          basket.name = 'Removable prep produce basket';
          basket.position.x = x;
          basket.userData = { purchasedSeparately: true, envelopeInches: [16, 10, 5], pantryBay: 2, contents: index === 0 ? 'Apples' : 'Oranges', ventilation: 'Open slatted sides; no cabinet door' };
          supplies.add(basket);
          box(basket, 0, 0.025, 0, 16 / 12, 0.05, 10 / 12, pantryWicker).name = 'Produce basket base';
          for (const side of [-1, 1]) {
            for (let row = 0; row < 3; row++) {
              box(basket, 0, 0.1 + row * 0.13, side * 0.395, 16 / 12, 0.045, 0.04, pantryWicker).name = 'Produce basket open front slat';
              box(basket, side * 0.645, 0.1 + row * 0.13, 0, 0.04, 0.045, 10 / 12, pantryWicker).name = 'Produce basket open side slat';
            }
            for (const end of [-1, 1]) box(basket, side * 0.645, 0.23, end * 0.395, 0.04, 0.37, 0.04, oak).name = 'Produce basket corner';
          }
          for (const dx of [-0.38, 0, 0.38]) for (const dz of [-0.18, 0.18]) addStorageFruit(basket, dx, 0.19, dz, index === 0 ? '#b64732' : '#e49a37');
        }
        continue;
      }
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

  tiledFloor('Mudroom tile', 37.5, 15, 7.4 - 8 / 12, 11.9, mudTileFinish, { tileWidth: 2, tileDepth: 4, groutWidth: 1 / 16 / 12, groutMaterial: mudGroutFinish });
  const mudReflectionRoom = new RoomEnvironment();
  const mudReflectionGenerator = new THREE.PMREMGenerator(renderer);
  const mudReflectionTarget = mudReflectionGenerator.fromScene(mudReflectionRoom, 0.04);
  mudReflectionRoom.dispose();
  mudReflectionGenerator.dispose();
  const mudPaintPixels = new Uint8Array(128 * 128 * 4);
  let mudPaintSeed = 173;
  for (let pixel = 0; pixel < mudPaintPixels.length; pixel += 4) {
    mudPaintSeed = (Math.imul(mudPaintSeed, 1664525) + 1013904223) >>> 0;
    const value = 200 + (mudPaintSeed >>> 24) % 41;
    mudPaintPixels.set([value, value, value, 255], pixel);
  }
  const mudPaintTexture = new THREE.DataTexture(mudPaintPixels, 128, 128, THREE.RGBAFormat);
  mudPaintTexture.name = 'Fine eggshell paint relief and roughness, no color tint';
  mudPaintTexture.wrapS = mudPaintTexture.wrapT = THREE.RepeatWrapping;
  mudPaintTexture.repeat.set(8, 8);
  mudPaintTexture.minFilter = THREE.LinearMipmapLinearFilter;
  mudPaintTexture.magFilter = THREE.LinearFilter;
  mudPaintTexture.generateMipmaps = true;
  mudPaintTexture.needsUpdate = true;
  const mudCaseFinish = mat('#e6dece', 0.52);
  mudCaseFinish.name = 'Off-white mudroom casework';
  const mudBackingFinish = mat('#e6dece', 0.76);
  mudBackingFinish.name = 'Warm painted mudroom backing';
  const mudBoardFinish = mat('#e6dece', 0.6);
  mudBoardFinish.name = 'Cream painted tongue-and-groove boards';
  const mudClosetFinish = mat('#e6dece', 0.44);
  mudClosetFinish.name = 'Warm ivory mudroom closet doors';
  const mudClosetPanelFinish = mat('#e6dece', 0.6);
  mudClosetPanelFinish.name = 'Off-white mudroom recessed door panels';
  const mudEntryDoorFinish = mat('#e6dece', 0.44);
  mudEntryDoorFinish.name = 'Off-white mudroom entry door';
  for (const finish of [mudCaseFinish, mudBackingFinish, mudBoardFinish, mudClosetFinish, mudClosetPanelFinish, mudEntryDoorFinish]) {
    finish.bumpMap = finish.roughnessMap = mudPaintTexture;
    finish.bumpScale = 0.0003;
    finish.userData = { edgeRadiusFeet: 1 / 384 };
  }
  for (const finish of [mudCaseFinish, mudBackingFinish, mudBoardFinish, mudClosetFinish, mudClosetPanelFinish, mudEntryDoorFinish]) {
    finish.envMap = mudReflectionTarget.texture;
    finish.envMapIntensity = 0.18;
  }
  const mudHardwareFinish = brass.clone();
  mudHardwareFinish.name = 'Satin brass mudroom hardware';
  mudHardwareFinish.envMap = mudReflectionTarget.texture;
  mudHardwareFinish.envMapIntensity = 0.7;
  const mudBench = furnishing('Five-cubby mudroom bench', 43.825 - 8 / 12, 21.29, -Math.PI / 2);
  const mudStorageTop = ceilingHeight - 0.25;
  const mudBenchWidth = 7.5;
  const mudPanel = 0.75 / 12;
  const mudCubbyPitch = (mudBenchWidth - mudPanel) / 5;
  const mudFamily = ['Peter', 'Lila', 'Jacob', 'Ada', 'Lucas'];
  const mudNorthFront = 17.54;
  const mudTopRailHeight = 1.5 / 12;
  const mudTopRailBottom = mudStorageTop - mudTopRailHeight;
  function mudroomLabel(parent, text, x, y, z, width = 0.65, decorative = false) {
    const canvas = document.createElement('canvas');
    canvas.width = decorative ? 512 : 256;
    canvas.height = decorative ? 160 : 64;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('A 2D canvas is required to create the mudroom family labels.');
    if (!decorative) {
      context.fillStyle = '#eee7d6';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.fillStyle = decorative ? '#493827' : '#30372f';
    context.font = decorative ? 'italic 96px "Segoe Script", "Brush Script MT", cursive' : 'bold 36px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(width, width * canvas.height / canvas.width), new THREE.MeshBasicMaterial({ map: texture, transparent: decorative, alphaTest: decorative ? 0.05 : 0, depthWrite: !decorative }));
    label.name = decorative ? `Mudroom decorative name: ${text}` : `Mudroom label: ${text}`;
    label.position.set(x, y, z);
    parent.add(label);
  }
  function mudroomFootwear(parent, x, y, z, kind, side, scale = 1, name = 'Stored extra shoe') {
    const footwear = mudroomAssets[kind === 'boot' ? side < 0 ? 'bootLeft' : 'bootRight' : 'shoe'].clone(true);
    footwear.name = name;
    footwear.position.set(x, y, z);
    footwear.scale.setScalar(scale);
    footwear.userData = { ...footwear.userData, kind, displayScale: scale };
    parent.add(footwear);
    return footwear;
  }
  function mudroomHookAttachment(hook) {
    const tip = hook.children.find((part) => part.name === 'Coat hook upturn');
    const cosine = Math.cos(hook.rotation.y), sine = Math.sin(hook.rotation.y);
    return { x: hook.position.x + cosine * tip.position.x + sine * tip.position.z, y: hook.position.y, z: hook.position.z - sine * tip.position.x + cosine * tip.position.z };
  }
  function mudroomGarment(cubby, owner, length, hook, color) {
    const attachment = mudroomHookAttachment(hook);
    const garment = new THREE.Group();
    garment.name = `${owner} cubby ${owner === 'Lila' ? 'long coat' : 'jacket'}`;
    garment.position.set(attachment.x, attachment.y, attachment.z + 0.2);
    garment.rotation.y = -Math.PI / 2;
    garment.userData = { owner, lengthInches: length * 12, mount: 'Right cubby side hook', provisional: true };
    cubby.add(garment);
    const cloth = mat(color, 0.95);
    cloth.name = `${owner} outerwear fabric`;
    const outline = new THREE.Shape();
    const sleeve = owner === 'Lila' ? 1.8 : length / 2;
    const points = [[-0.1, -0.025], [-0.33, -0.15], [-0.58, -sleeve * 0.8], [-0.43, -sleeve], [-0.28, -sleeve * 0.7], [-0.4, -length + 0.025], [0.4, -length + 0.025], [0.28, -sleeve * 0.7], [0.43, -sleeve], [0.58, -sleeve * 0.8], [0.33, -0.15], [0.1, -0.025], [0, -0.16]];
    outline.moveTo(...points[0]);
    for (const point of points.slice(1)) outline.lineTo(...point);
    outline.closePath();
    const geometry = new THREE.ExtrudeGeometry(outline, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, steps: 1 });
    geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox;
    const garmentScale = length / (max.y - min.y);
    // Beveled corners can extend beyond the profile's nominal height.
    geometry.translate(0, -max.y, 0);
    geometry.scale(garmentScale, garmentScale, garmentScale);
    const body = new THREE.Mesh(geometry, cloth);
    body.name = 'Contoured hanging outerwear';
    body.castShadow = body.receiveShadow = true;
    garment.add(body);
    box(garment, -0.1, -0.08, 0.08, 0.22, 0.025, 0.18, brass).name = 'Outerwear hanger shoulder';
    box(garment, -0.2, -0.04, 0, 0.025, 0.08, 0.03, brass).name = 'Outerwear hanging loop';
    box(garment, 0, -length / 2 - 0.05, 0.212, 0.015, length - 0.35, 0.015, black).name = 'Outerwear front fastening';
    for (const side of [-1, 1]) box(garment, side * 0.22, -length * 0.66, 0.217, 0.18, 0.2, 0.035, cloth, true).name = 'Outerwear pocket';
  }
  mudBench.userData = { cubbies: 5, hooks: 16, hooksPerAdultCubby: 2, hooksPerChildCubby: 4, shoeOpenings: 5, shoePairEnvelopeInches: [14, 16, 14], construction: 'Builder-installed panel-and-shelf built-in', widthInches: 90, depthInches: 18, seatHeightInches: 18, heightInches: mudStorageTop * 12, provisional: true };
  box(mudBench, 0, 1.425, 0, mudBenchWidth, 0.15, 1.5, countertop).name = 'Mudroom light stone bench seat';
  box(mudBench, 0, mudStorageTop / 2, -0.71875, mudBenchWidth, mudStorageTop, mudPanel, mudBackingFinish).name = 'Continuous mudroom cubby backing';
  for (let i = 0; i <= 5; i++) {
    const x = -mudBenchWidth / 2 + mudPanel / 2 + i * mudCubbyPitch;
    box(mudBench, x, 0.675, 0, mudPanel, 1.35, 1.5, mudCaseFinish).name = 'Open shoe bay divider';
    box(mudBench, x, (1.5 + mudStorageTop) / 2, 0, mudPanel, mudStorageTop - 1.5, 1.5, mudCaseFinish).name = 'Mudroom cubby partition';
  }
  for (let i = 0; i < 5; i++) {
    const cubby = new THREE.Group();
    cubby.name = 'Mudroom family cubby';
    cubby.position.x = -mudBenchWidth / 2 + mudPanel / 2 + (i + 0.5) * mudCubbyPitch;
    cubby.userData = { owner: mudFamily[i], hooks: i < 2 ? 2 : 4, clearWidthInches: (mudCubbyPitch - mudPanel) * 12, shoeLevels: 1, floorLevel: true };
    mudBench.add(cubby);
    const boardPitch = (mudCubbyPitch - mudPanel) / 4;
    const boardGap = 1 / 8 / 12;
    for (const [bottom, top] of [[1.5, 6.31], [6.39, 7.46], [7.54, mudStorageTop - 0.08]]) {
      for (let board = 0; board < 4; board++) {
        const panel = box(cubby, (board - 1.5) * boardPitch, (bottom + top) / 2, -0.6855, boardPitch - boardGap, top - bottom, 0.004, mudBoardFinish);
        panel.name = 'Mudroom painted vertical backing board';
        panel.userData = { jointGapInches: 1 / 8, finish: 'Painted tongue-and-groove concept, not exposed oak' };
      }
    }
    for (const height of (i < 2 ? [5.55] : [4.2, 5.55])) for (const side of [-1, 1]) {
      const hook = new THREE.Group();
      hook.name = 'Mudroom gold coat hook';
      hook.position.set(side * ((mudCubbyPitch - mudPanel) / 2 - 0.03), height, -0.15);
      hook.rotation.y = -side * Math.PI / 2;
      hook.userData.mount = 'Cubby side panel';
      cubby.add(hook);
      box(hook, 0, 0, 0, 0.1, 0.25, 0.06, brass, true).name = 'Hook mounting plate';
      const arm = cylinder(hook, 0, -0.05, 0.12, 0.0275, 0.24, brass);
      arm.name = 'Coat hook arm';
      arm.rotation.x = Math.PI / 2;
      box(hook, 0, 0.025, 0.225, 0.055, 0.15, 0.055, brass, true).name = 'Coat hook upturn';
      for (const y of [-0.085, 0.085]) {
        const screw = cylinder(hook, 0, y, 0.034, 0.009, 0.008, brass);
        screw.name = 'Mudroom hook fixing screw';
        screw.rotation.x = Math.PI / 2;
      }
    }
    const owner = mudFamily[i];
    const firstShelf = 6.35;
    for (const y of [firstShelf, 7.5, mudStorageTop - 0.04]) box(cubby, 0, y, 0, mudCubbyPitch - mudPanel, 0.08, 1.5, mudCaseFinish).name = 'Mudroom upper cubby shelf';
    mudroomLabel(cubby, owner, owner === 'Lila' ? -0.1 : 0, 5.1, -0.6825, 1.1, true);
    const hooks = cubby.children.filter((part) => part.name === 'Mudroom gold coat hook' && part.position.y === (i < 2 ? 5.55 : 4.2));
    mudroomGarment(cubby, owner, owner === 'Lila' ? 4 : i < 2 ? 2.6 : 2, hooks[1], ['#4e5964', '#b39a80', '#46717b', '#ae6a60', '#67784b'][i]);
    if (i >= 2) {
      const backpack = new THREE.Group();
      backpack.name = `${owner} backpack`;
      const attachment = mudroomHookAttachment(hooks[0]);
      backpack.position.set(attachment.x + 0.0575, attachment.y - 0.855, attachment.z + 0.2);
      backpack.rotation.y = Math.PI / 2;
      backpack.userData = { owner, widthInches: 10, heightInches: 15, depthInches: 5, mount: 'Left cubby side hook', provisional: true };
      cubby.add(backpack);
      const fabric = mat(['#737c77', '#a08d7b', '#9a886f'][i - 2], 0.95);
      fabric.name = `${owner} backpack fabric`;
      box(backpack, 0, 0, 0, 10 / 12, 15 / 12, 5 / 12, fabric, true).name = 'Backpack body';
      box(backpack, 0, -0.22, 0.25, 0.58, 0.45, 0.08, fabric, true).name = 'Backpack front pocket';
      for (const side of [-1, 1]) box(backpack, side * 0.23, 0.12, -0.24, 0.07, 0.95, 0.06, black, true).name = 'Backpack shoulder strap';
      box(backpack, 0.2, 0.73, -0.0575, 0.23, 0.25, 0.045, black, true).name = 'Backpack hanging handle';
      box(backpack, 0.2, 0.61, -0.14, 0.23, 0.035, 0.22, black, true).name = 'Backpack handle attachment';
    } else if (owner === 'Peter') {
      const hat = new THREE.Group();
      hat.name = 'Peter hat';
      hat.position.set(0, firstShelf + 0.065, 0);
      cubby.add(hat);
      const hatFabric = mat('#3c464b', 0.95);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), hatFabric);
      crown.name = 'Hat crown';
      hat.add(crown);
      cylinder(hat, 0, 0, 0, 0.25, 0.03, hatFabric).name = 'Hat band';
      box(hat, 0, -0.005, 0.25, 0.45, 0.035, 0.32, hatFabric, true).name = 'Hat visor';
    }
    for (const side of [-1, 1]) mudroomFootwear(cubby, side * 0.225, 0.0405, 0, i < 2 ? 'boot' : 'shoe', side, i < 2 ? 1 : 0.75, 'Mudroom daily footwear');
  }

  const mudCoats = furnishing('Mudroom hanging coat closet', (37.825 + 42.95) / 2, 16.4);
  const mudCoatWidth = 61.5 / 12;
  mudCoats.userData = { widthInches: 61.5, depthInches: 24, heightInches: mudStorageTop * 12, doorHeightInches: 96, railOrientation: 'Side to side', construction: 'Builder-installed enclosed closet, fixed rod and shelves; standard solid French doors, not drawer cabinetry', hangingRail: true, shoeShelves: 2, seasonalShelves: 2, provisional: true };
  for (const x of [-1, 1]) box(mudCoats, x * (mudCoatWidth - mudPanel) / 2, mudStorageTop / 2, 0, mudPanel, mudStorageTop, 2, mudCaseFinish).name = 'Coat closet side panel';
  box(mudCoats, 0, mudStorageTop / 2, -0.97, mudCoatWidth - 2 * mudPanel, mudStorageTop, 0.06, mudBackingFinish).name = 'Coat closet backing';
  for (const y of [0.15, 1.15, 6.4, 7.55, mudStorageTop - 0.04]) box(mudCoats, 0, y, 0, mudCoatWidth - 2 * mudPanel, 0.08, 1.8, mudCaseFinish).name = y < 2 ? 'Closet open shoe shelf' : 'Coat closet upper shelf';
  const mudCoatRail = cylinder(mudCoats, 0, 5.9, -0.05, 0.035, mudCoatWidth - 2 * mudPanel, brass);
  mudCoatRail.name = 'Mudroom coat hanging rail';
  mudCoatRail.rotation.z = Math.PI / 2;
  for (const x of [-0.95, -0.35, 0.25, 0.85]) {
    box(mudCoats, x, 4.05, -0.05, 0.18, 3, 1.7, x < 0 ? linen : cream, true).name = 'Mudroom hanging coat';
    box(mudCoats, x, 5.72, -0.05, 0.03, 0.34, 0.03, brass).name = 'Mudroom coat hanger';
  }
  // Standard 48 x 96 nominal pair: two nominal 24-inch solid leaves.
  const mudDoorWidth = 48 / 12;
  const mudDoorOffset = -4 / 12;
  for (const side of [-1, 1]) {
    const width = (mudCoatWidth - mudDoorWidth) / 2 - side * mudDoorOffset;
    box(mudCoats, side * (mudCoatWidth - width) / 2, 4, 1.01, width, 8, 0.08, mudCaseFinish).name = 'Mudroom closet door jamb';
  }
  box(mudCoats, 0, (98 / 12 + mudStorageTop) / 2, 1.01, mudCoatWidth, mudStorageTop - 98 / 12, 0.08, mudCaseFinish).name = 'Mudroom closet headwall';
  box(mudCoats, mudDoorOffset, 97 / 12, 1.01, 50 / 12, 2 / 12, 0.08, mudCaseFinish).name = 'Mudroom closet head jamb reserve';
  mudCoats.userData.doorOffsetInches = -4;
  mudCoats.userData.sideFillerWidthsInches = [2.75, 10.75];
  Object.assign(mudCoats.userData, { widthInches: 61.5, doorStyle: 'Nominal 48 x 96-inch solid single recessed panel French closet door pair; two nominal 24-inch leaves, independently clickable, closed default; product unselected', roughOpeningReserveInches: [50, 98], clearInternalWidthInches: 60, clearInternalDepthInches: 23.28, usableHangingDepthInches: 22.8, closedLeafRearDepthInches: 24, approval: '50 x 98-inch conceptual assembly reserve within separate side jamb/fillers; selected assembly, blocking, rod/shelf spans and occupied access require professional review' });
  for (const side of [-1, 1]) {
  const mudClosetHinge = new THREE.Group();
  mudClosetHinge.name = side < 0 ? 'Mudroom left French closet leaf' : 'Mudroom right French closet leaf';
  // Front-mounted hinge axis keeps the thick solid leaf clear of its own jamb.
  mudClosetHinge.position.set(mudDoorOffset + side * mudDoorWidth / 2, 4, 1.06);
  mudClosetHinge.userData = { nominalWidthInches: 24, interactiveHouseDoor: { operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 90, openRotationSign: side }, swingClearanceVerified: false };
  mudCoats.add(mudClosetHinge);
  singlePanelDoor(mudClosetHinge, -side * mudDoorWidth / 4, 0, 1.375 / 24, mudDoorWidth / 2 - 0.02, 7.96, 1.375 / 12, mudCaseFinish).name = 'Mudroom standard hinged closet door panel';
  const knob = cylinder(mudClosetHinge, -side * (mudDoorWidth / 2 - 0.2), -0.8, 0.18, 0.05, 0.12, brass);
  knob.name = 'Mudroom closet gold knob';
  knob.rotation.x = Math.PI / 2;
  }
  // Support the enlarged five-foot clear span; illustration is not structural sizing.
  box(mudCoats, 0, 6.1, -0.5, 0.08, 0.55, 0.9, mudCaseFinish).name = 'Closet center rod shelf bracket';
  for (const side of [-1, 1]) box(mudCoats, side * (mudCoatWidth / 2 - mudPanel - 0.03), 5.9, -0.05, 0.06, 0.18, 0.18, brass).name = 'Closet rod end support';

  function mudroomShoeCell(parent, x, y, width, depth, nextShelf, envelope, zone) {
    const cell = new THREE.Group();
    cell.name = 'Mudroom extra shoe pair cell';
    cell.position.set(x, y, 0);
    cell.userData = { pairs: 1, zone, clearWidthInches: width * 12, depthInches: depth * 12, clearHeightInches: (Math.min(nextShelf - 0.04, mudTopRailBottom) - y - 0.04) * 12, pairEnvelopeInches: envelope, provisional: true };
    parent.add(cell);
    box(cell, 0, 0, 0, width, 0.08, depth, mudCaseFinish).name = 'Extra shoe pair shelf';
    const kind = y < 1.4 ? 'boot' : 'shoe';
    for (const side of [-1, 1]) mudroomFootwear(cell, side * 0.225, 0.04, 0, kind, side, kind === 'boot' ? 11 / 14 : 1);
  }

  const mudCornerShoeWidth = 19.1 - mudNorthFront;
  // Swap the complete cases within the existing east-wall run, not the room.
  const mudEastRunSouth = 26.6;
  const mudCornerShoes = furnishing('Mudroom corner shoe tower', 43.825 - 8 / 12, mudEastRunSouth - mudCornerShoeWidth / 2, -Math.PI / 2);
  mudCornerShoes.userData = { widthInches: mudCornerShoeWidth * 12, depthInches: 18, heightInches: mudStorageTop * 12, shoeLevels: 7, extraPairTarget: 7, pairEnvelopeInches: [14, 16, 12], provisional: true };
  for (const side of [-1, 1]) box(mudCornerShoes, side * (mudCornerShoeWidth - mudPanel) / 2, mudStorageTop / 2, 0, mudPanel, mudStorageTop, 1.5, mudCaseFinish).name = 'Corner shoe tower side';
  box(mudCornerShoes, 0, mudStorageTop / 2, -0.72, mudCornerShoeWidth - 2 * mudPanel, mudStorageTop, 0.06, mudBackingFinish).name = 'Corner shoe tower backing';
  for (let level = 0; level < 7; level++) {
    const y = 0.12 + level * 1.2;
    mudroomShoeCell(mudCornerShoes, 0, y, mudCornerShoeWidth - 2 * mudPanel, 1.5 - 0.08, level < 6 ? y + 1.2 : mudStorageTop - 0.04, [14, 16, 12], 'Beside cubbies');
  }
  box(mudCornerShoes, 0, mudStorageTop - 0.04, 0, mudCornerShoeWidth - 2 * mudPanel, 0.08, 1.5, mudCaseFinish).name = 'Corner shoe tower top cap';

  const mudJoinery = furnishing('Continuous mudroom built-in enclosure', 0, 0);
  mudJoinery.userData = { joinedBuiltIns: true, enclosureStyle: 'Wall-fitted north and east built-ins with ceiling infill; west arrival wall clear', uniformTopInches: mudStorageTop * 12, fittedTopInches: ceilingHeight * 12, topRailUndersideInches: mudTopRailBottom * 12, extraPairTarget: 7, enclosedBlindCorners: 1, blindCornersCountedAsStorage: false, wallFitted: true, provisional: true };
  for (const [left, right] of [[42.95, 44.575 - 8 / 12]]) {
    const corner = new THREE.Group();
    corner.name = 'Mudroom enclosed corner return';
    corner.userData = { accessibleStorage: false, construction: 'Builder-fitted blind corner, not an open gap or counted storage' };
    corner.position.set((left + right) / 2, 0, (15.4 + mudNorthFront) / 2);
    mudJoinery.add(corner);
    const width = right - left, depth = mudNorthFront - 15.4;
    for (const y of [0.04, mudStorageTop - 0.04]) box(corner, 0, y, 0, width, 0.08, depth, mudCaseFinish).name = 'Enclosed corner horizontal panel';
    box(corner, 0, mudStorageTop / 2, -depth / 2 + 0.03, width, mudStorageTop - 0.16, 0.06, mudCaseFinish).name = 'Enclosed corner back';
    box(corner, 0, mudStorageTop / 2, depth / 2 - mudPanel / 2, width, mudStorageTop - 0.16, mudPanel, mudCaseFinish).name = 'Enclosed corner front';
    for (const side of [-1, 1]) box(corner, side * (width - mudPanel) / 2, mudStorageTop / 2, (0.06 - mudPanel) / 2, mudPanel, mudStorageTop - 0.16, depth - 0.06 - mudPanel, mudCaseFinish).name = 'Enclosed corner cheek';
  }
  box(mudJoinery, mudCoats.position.x, mudStorageTop - 0.04, (17.45 + mudNorthFront) / 2, mudCoatWidth, 0.08, mudNorthFront - 17.45, mudCaseFinish).name = 'Coat header top return';
  const mudWestFront = 37.675, mudEastFront = 43.075 - 8 / 12;
  box(mudJoinery, (mudWestFront + mudEastFront) / 2, mudStorageTop - mudTopRailHeight / 2, mudNorthFront + 0.025, mudEastFront - mudWestFront - 0.1, mudTopRailHeight, 0.05, mudCaseFinish).name = 'Mudroom continuous north top rail';
  box(mudJoinery, mudEastFront - 0.025, mudStorageTop - mudTopRailHeight / 2, (mudNorthFront + 26.6) / 2, 0.05, mudTopRailHeight, 26.6 - mudNorthFront, mudCaseFinish).name = 'Mudroom continuous east top rail';
  for (const [height, projection] of [[8.79, 0.025], [8.89, 0.04]]) {
    box(mudJoinery, mudEastFront - 0.05 - projection / 2, height, (mudNorthFront + 26.6) / 2, projection, 0.06, 26.6 - mudNorthFront, mudCaseFinish).name = 'Mudroom east stepped cornice';
    box(mudJoinery, (mudWestFront + mudEastFront) / 2, height, mudNorthFront + 0.05 + projection / 2, mudEastFront - mudWestFront - 0.1, 0.06, projection, mudCaseFinish).name = 'Mudroom north stepped cornice';
  }

  function mudroomFittedClosure(name, left, right, north, south, bottom = 0.0405, top = mudStorageTop) {
    const closure = box(mudJoinery, (left + right) / 2, (bottom + top) / 2, (north + south) / 2, right - left, top - bottom, south - north, mudCaseFinish);
    closure.name = name;
    closure.userData = { construction: 'Site-fitted scribe/pack-out, not added storage', countedAsStorage: false, provisional: true };
  }
  const mudFinishedWest = 37.5 + 0.175, mudFinishedEast = 44.9 - 8 / 12 - 0.175;
  const mudFinishedNorth = 15 + 0.175, mudFinishedSouth = 26.9 - 0.175;
  const mudNorthBack = mudCoats.position.z - 1, mudEastBack = mudBench.position.x + 0.75;
  const mudBenchSouth = mudEastRunSouth; // Fitted end belongs to the whole run, now the shoe tower.
  mudroomFittedClosure('Mudroom north wall scribe', mudFinishedWest, mudFinishedEast, mudFinishedNorth, mudNorthBack);
  mudroomFittedClosure('Mudroom west wall scribe', mudFinishedWest, 37.825, mudNorthBack, mudNorthFront);
  mudroomFittedClosure('Mudroom east wall scribe', mudEastBack, mudFinishedEast, mudNorthBack, mudBenchSouth);
  mudroomFittedClosure('Mudroom cubby end scribe', mudEastFront, mudFinishedEast, mudBenchSouth, mudFinishedSouth);
  mudroomFittedClosure('Mudroom north ceiling infill', mudFinishedWest, mudFinishedEast, mudFinishedNorth, mudNorthFront + 0.05, mudStorageTop, ceilingHeight);
  mudroomFittedClosure('Mudroom east ceiling infill', mudEastFront - 0.05, mudFinishedEast, mudNorthFront + 0.05, mudFinishedSouth, mudStorageTop, ceilingHeight);

  const mudGarageDoor = furnishing('Mudroom garage entry door', garageEntry.x + 0.125 / 12, garageEntry.z - 1.75 / 24);
  mudGarageDoor.userData = { nominalWidthInches: 36, nominalHeightInches: 96, thicknessInches: 1.75, swing: 'Inward into mudroom, west hinge', defaultOpenAngleDegrees: 90, approval: 'Rated/self-closing assembly, threshold, landing, rails and fire separation require professional review', provisional: true };
  const mudGarageLeaf = new THREE.Group();
  mudGarageLeaf.name = 'Mudroom inward garage door leaf';
  mudGarageLeaf.rotation.y = Math.PI / 2;
  mudGarageLeaf.userData = { interactiveHouseDoor: { operation: 'hinged', openAngleDegrees: 90, maxAngleDegrees: 90, openRotationSign: 1 } };
  mudGarageDoor.add(mudGarageLeaf);
  const mudGarageLeafWidth = (36 - 0.25) / 12, mudGarageLeafThickness = 1.75 / 12;
  const mudGarageLeafBottom = 0.0405 + 0.5 / 12, mudGarageLeafTop = 8 - 0.125 / 12;
  singlePanelDoor(mudGarageLeaf, mudGarageLeafWidth / 2, (mudGarageLeafBottom + mudGarageLeafTop) / 2, mudGarageLeafThickness / 2, mudGarageLeafWidth, mudGarageLeafTop - mudGarageLeafBottom, mudGarageLeafThickness, windowTrim).name = 'Solid mudroom garage door panel';
  for (const side of [-1, 1]) {
    box(mudGarageLeaf, mudGarageLeafWidth - 0.25, 3.15, mudGarageLeafThickness / 2 + side * (mudGarageLeafThickness / 2 + 0.035), 0.13, 0.35, 0.07, brass).name = 'Mudroom garage door lock plate';
    box(mudGarageLeaf, mudGarageLeafWidth - 0.38, 3.15, mudGarageLeafThickness / 2 + side * (mudGarageLeafThickness / 2 + 0.15), 0.3, 0.06, 0.08, brass).name = 'Mudroom garage door lever';
  }
  for (const y of [1, 4, 7]) cylinder(mudGarageLeaf, 0, y, 0, 0.035, 0.25, brass).name = 'Mudroom garage door hinge';
  for (const group of [mudBench, mudCoats, mudCornerShoes, mudJoinery, mudGarageDoor]) {
    group.traverse((part) => {
      if (part.material === brass) part.material = mudHardwareFinish;
    });
  }

  const epoxy = mat('#a7aaa6', 0.55);
  for (const { x, z, w, d } of garageFloorAreas) {
    const surface = box(rest, x + w / 2, garageFloorY - 0.01, z + d / 2, w, 0.03, d, epoxy);
    surface.name = 'Garage epoxy floor';
    surface.userData.walkSurface = true;
  }
  const garageSideDoor = furnishing('Solid garage exterior pedestrian door', 55.5, 45.5, 0, garageFloorY);
  const garageSideLeaf = new THREE.Group();
  garageSideLeaf.name = 'Garage side pedestrian door leaf';
  garageSideLeaf.position.z = -1.5;
  garageSideLeaf.userData = { interactiveHouseDoor: { operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 180, openRotationSign: 1 } };
  garageSideDoor.add(garageSideLeaf);
  box(garageSideLeaf, 0, 4, 1.5, 0.18, 8, 3, cream).name = 'Opaque insulated exterior door slab';
  for (const side of [-1, 1]) {
    box(garageSideLeaf, side * 0.14, 3.1, 0.35, 0.08, 0.5, 0.12, black).name = 'Exterior door lockset';
    box(garageSideLeaf, side * 0.2, 3.1, 0.48, 0.1, 0.08, 0.35, black).name = 'Exterior door lever';
  }
  const garageStair = furnishing('One intermediate tread garage entry — no top landing concept', garageEntry.x + garageEntry.width / 2, garageEntry.z);
  garageStair.userData = { risers: garageRisers, riseInches: garageRise * 12, totalRiseInches: -garageFloorY * 12, treadDepthInches: 11, widthInches: garageEntry.treadWidth * 12, landing: false, thresholdDepthInches: 4.2, ascent: 'North through door', rails: false, provisional: true };
  // Wall-thickness threshold only: no house-level platform beyond the garage wall face.
  const threshold = box(garageStair, 0, garageFloorY / 2, garageEntry.thresholdDepth / 2, garageEntry.width, -garageFloorY, garageEntry.thresholdDepth, epoxy);
  threshold.name = 'Garage entry wall-thickness threshold';
  threshold.userData.walkSurface = true;
  const saddle = box(garageStair, 0, 0.0405 / 2, garageEntry.thresholdDepth / 2, garageEntry.width, 0.0405, garageEntry.thresholdDepth, windowTrim);
  saddle.name = 'Garage entry finished threshold saddle';
  saddle.userData = { walkSurface: true, approval: 'Concept finish only; select rated assembly and verify landing, sill and drainage. Not operating approval.' };
  // Widen east only: keep the west edge clear of the adjoining wall and mower route.
  const treadOffsetX = 0;
  const tread = box(garageStair, treadOffsetX, (garageFloorY - garageRise) / 2, garageEntry.thresholdDepth + garageEntry.going / 2, garageEntry.treadWidth, -garageRise - garageFloorY, garageEntry.going, epoxy);
  tread.name = 'Garage entry intermediate tread';
  tread.userData.walkSurface = true;
  for (let edge = 0; edge < garageRisers; edge++) {
    const top = -edge * garageRise;
    const edgeZ = garageEntry.thresholdDepth + edge * garageEntry.going;
    const nosing = box(garageStair, edge ? treadOffsetX : 0, top - 0.008, edgeZ - 0.04, (edge ? garageEntry.treadWidth : garageEntry.width) - 0.12, 0.016, 0.08, cream);
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
    for (const side of [-1, 1]) for (const row of ['front', 'rear']) {
      const door = new THREE.Group();
      door.name = `${name} ${side === -1 ? 'driver' : 'passenger'} ${row} estimated door`;
      const doorLengthInches = row === 'front' ? 44 : 36;
      const hingeZ = cabZ - cabDepth / 2 + 0.3 + (row === 'rear' ? 44 / 12 : 0);
      door.position.set(side * (width / 2 + 0.04), 0, hingeZ);
      door.userData = { vehicleDoor: true, side, row, doorLengthInches, angleDegrees: 0, estimated: true, manufacturerVerified: false };
      car.add(door);
      const doorMaterial = new THREE.MeshStandardMaterial({ color: '#d39836', transparent: true, opacity: 0.65, side: THREE.DoubleSide, roughness: 0.6 });
      box(door, 0, (height + 0.6) / 2, doorLengthInches / 24, 0.08, height - 0.6, doorLengthInches / 12, doorMaterial).name = 'Estimated door swing panel, not manufacturer geometry';
    }
    return car;
  }
  const sierra = vehicle('GMC Sierra EV', 48.5, 38, 233.42, 83.8, 95.7, 80, 145.7, true);
  const bmw = vehicle('BMW i4', 37, 40, 188.5, 72.9, 81.6, 57, 112.4, false);
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
  const patioDoorButton = document.getElementById('patio-door-toggle');
  const patioDoorState = document.getElementById('patio-door-state');
  let pickTargets = null;
  function visiblePickTargets() {
    if (pickTargets === null) {
      pickTargets = [];
      scene.traverseVisible(object => {
        if (object.isMesh) pickTargets.push(object);
      });
    }
    return pickTargets;
  }
  function setPatioDoorOpen(open) {
    const angle = open ? doorLeaf.userData.maxAngleDegrees : 0;
    if (doorLeaf.userData.openAngleDegrees === angle) return;
    doorLeaf.userData.openAngleDegrees = angle;
    doorLeaf.rotation.y = angle ? -THREE.MathUtils.degToRad(angle) : 0;
    patioDoorButton.setAttribute('aria-pressed', String(open));
    patioDoorButton.textContent = `${open ? 'Close' : 'Open'} patio door`;
    patioDoorState.textContent = `Patio door ${open ? `open ${angle} degrees inward` : 'closed'}.`;
    stopTourTravel();
    buildWalkObstacles();
  }
  function togglePatioDoor() {
    if (activeFloor !== 'ground' || groundLayoutPreview) return;
    setPatioDoorOpen(doorLeaf.userData.openAngleDegrees === 0);
    render();
  }
  patioDoorButton.addEventListener('click', togglePatioDoor);
  function pickPatioDoor(event) {
    if (activeFloor !== 'ground' || groundLayoutPreview) return false;
    const bounds = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
    const raycaster = new THREE.Raycaster();
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(visiblePickTargets(), false).find(({ object }) => {
      for (let part = object; part; part = part.parent) if (!part.visible) return false;
      return true;
    });
    for (let part = hit?.object; part; part = part.parent) {
      if (part !== doorLeaf) continue;
      togglePatioDoor();
      return true;
    }
    return false;
  }
  const vehicleDoorControls = [];
  const vehicleDoorStatus = document.getElementById('vehicle-door-status');
  for (const car of [bmw, sierra]) {
    for (const door of car.children.filter((part) => part.userData.vehicleDoor)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'vehicle-door-button';
      button.textContent = 'Door';
      button.hidden = true;
      button.setAttribute('aria-label', `Open ${door.name} to 60 degrees`);
      button.setAttribute('aria-pressed', 'false');
      button.title = `Open ${door.name} - estimated swing only`;
      viewport.append(button);
      button.addEventListener('pointerdown', (event) => event.stopPropagation());
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const open = door.userData.angleDegrees === 0;
        door.userData.angleDegrees = open ? 60 : 0;
        door.rotation.y = door.userData.side * THREE.MathUtils.degToRad(door.userData.angleDegrees);
        button.setAttribute('aria-pressed', String(open));
        button.setAttribute('aria-label', `${open ? 'Close' : 'Open'} ${door.name}${open ? '' : ' to 60 degrees'}`);
        button.title = button.getAttribute('aria-label');
        vehicleDoorStatus.textContent = `${door.name}: ${open ? '60 degrees open' : 'closed'}. Amber panels are estimated swing overlays; the closed vehicle stand-ins remain visible. Front doors use 44 in, rear doors 36 in, for both vehicles. Hinges, mirrors and swept volumes are not manufacturer verified. Check the full sweep and occupied access on the actual vehicle; this is not a fit approval.`;
        render();
      });
      vehicleDoorControls.push({ door, button, height: car.userData.heightInches / 12 });
    }
  }
  function updateVehicleDoorControls() {
    const show = activeFloor === 'ground' && !groundLayoutPreview && navigationMode !== 'walk' && ['garage', 'bikes', 'top'].includes(currentView);
    vehicleDoorStatus.hidden = !show;
    if (!show) {
      for (const { button } of vehicleDoorControls) button.hidden = true;
      return;
    }
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster();
    for (const { door, button, height } of vehicleDoorControls) {
      const anchor = door.localToWorld(new THREE.Vector3(door.userData.side * 0.1, height - 0.25, door.userData.doorLengthInches / 24));
      const point = anchor.clone().project(camera);
      if (Math.abs(point.x) > 0.95 || Math.abs(point.y) > 0.95 || Math.abs(point.z) > 1) {
        button.hidden = true;
        continue;
      }
      raycaster.setFromCamera(new THREE.Vector2(point.x, point.y), camera);
      const distance = anchor.distanceTo(raycaster.ray.origin);
      raycaster.far = Math.max(0, distance - 0.25);
      const obstruction = show && raycaster.intersectObjects(visiblePickTargets(), false).find((hit) => {
        for (let part = hit.object; part; part = part.parent) if (!part.visible) return false;
        return hit.distance < distance - 0.25;
      });
      button.hidden = !show || Boolean(obstruction) || Math.abs(point.x) > 0.95 || Math.abs(point.y) > 0.95 || Math.abs(point.z) > 1;
      button.style.left = `${(point.x + 1) * viewport.clientWidth / 2}px`;
      button.style.top = `${(1 - point.y) * viewport.clientHeight / 2}px`;
    }
  }
  function pickVehicleDoor(event) {
    if (vehicleDoorStatus.hidden) return false;
    const bounds = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
    const raycaster = new THREE.Raycaster();
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(visiblePickTargets(), false).find(({ object }) => {
      for (let part = object; part; part = part.parent) if (!part.visible) return false;
      return true;
    });
    for (let part = hit?.object; part; part = part.parent) {
      const control = vehicleDoorControls.find(({ door }) => door === part);
      if (control) {
        control.button.click();
        return true;
      }
    }
    return false;
  }
  function pickHouseDoor(event) {
    if (!['ground', 'upstairs', 'exterior'].includes(activeFloor) || (activeFloor === 'ground' && groundLayoutPreview)) return false;
    const bounds = renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2);
    const raycaster = new THREE.Raycaster();
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(visiblePickTargets(), false).find(({ object }) => {
      for (let part = object; part; part = part.parent) if (!part.visible) return false;
      return true;
    });
    if (!hit) return false;
    let door = hit.object;
    while (door && !door.userData?.interactiveHouseDoor && !door.userData?.interactiveCabinet) door = door.parent;
    if (!door) return false;
    if (door.userData.interactiveCabinet) {
      toggleCabinet(door);
      if (activeFloor === 'upstairs') buildWalkObstacles();
      render();
      return true;
    }
    const operation = door.userData.interactiveHouseDoor;
    if (operation.operation === 'sliding') {
      operation.open = !operation.open;
      door.position[operation.axis ?? 'x'] = operation.open ? operation.openCenterX : operation.closedCenterX;
      if (door.userData.shownOpen !== undefined) door.userData.shownOpen = operation.open;
    } else if (operation.operation === 'overhead') {
      operation.open = !operation.open;
      door.rotation.x = operation.open ? THREE.MathUtils.degToRad(operation.maxAngleDegrees) : 0;
    } else {
      const open = operation.openAngleDegrees === 0;
      const angle = open ? operation.maxAngleDegrees : 0;
      operation.openAngleDegrees = angle;
      door.rotation.y = (operation.closedRotationY ?? 0) + operation.openRotationSign * THREE.MathUtils.degToRad(angle);
      if (operation.foldPanel) operation.foldPanel.rotation.y = open ? operation.openRotationSign * THREE.MathUtils.degToRad(angle) : 0;
    }
    if (activeFloor === 'upstairs') buildWalkObstacles();
    render();
    return true;
  }
  const charger = furnishing('EV charger', 42.75, 48.65, Math.PI, garageFloorY);
  charger.userData = { location: 'Interior face of pier between the two garage doors', provisional: true, cableReachVerified: false };
  box(charger, 0, 4.4, 0, 0.7, 1.3, 0.35, black, true);
  box(charger, 0, 4.55, 0.18, 0.35, 0.35, 0.02, light).name = 'EV charger status screen';
  const chargingCable = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 8, 32), black);
  chargingCable.position.set(0, 3.5, 0.22);
  charger.add(chargingCable);
  const bikeRack = furnishing('Five-bike roll-in floor rack', 52.5, 21, -Math.PI / 2, garageFloorY);
  bikeRack.userData = { bikes: 5, storage: 'Right-wall floor stands; alternate front-wheel-in and rear-wheel-in; west access aisle; no lifting', alternatingDirections: true, spacingInches: 24, bicycleDimensions: bicycleGeometry.userData, retrievalVerified: false, provisional: true };
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * bikeRack.userData.spacingInches / 12;
    for (const z of [-2.05, -1.25]) box(bikeRack, x, 0.1, z, 0.65, 0.1, 0.1, steel).name = 'Individual floor stand base';
    for (const side of [-1, 1]) {
      box(bikeRack, x + side * 0.13, 0.4, -2.05, 0.05, 0.7, 0.05, steel).name = 'Roll-in wheel stand upright';
      box(bikeRack, x + side * 0.13, 0.75, -1.78, 0.05, 0.05, 0.59, steel).name = 'Roll-in wheel stand top';
      stairBeam('Roll-in wheel stand brace', [x + side * 0.13, 0.75, -1.5], [x + side * 0.13, 0.15, -1.25], 0.05, 0.05, steel, bikeRack);
    }
    const bicycle = new THREE.Group();
    bicycle.name = `Floor-parked bicycle ${i + 1}`;
    bicycle.position.x = x;
    bicycle.rotation.y = i % 2 === 0 ? 0 : Math.PI;
    bicycle.userData = { wheelsOnFloor: true, liftingRequired: false, wheelInStand: i % 2 === 0 ? 'Front' : 'Rear' };
    bikeRack.add(bicycle);
    const downloadedBike = bicycleGeometry.clone(true);
    downloadedBike.name = 'Downloaded bicycle model';
    downloadedBike.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    bicycle.add(downloadedBike);
  }
  bikeRack.traverse((object) => { if (object.isMesh) object.userData.tourObstacle = true; });

  const yardTools = furnishing('Garage yard-tool storage', 34.6, 27.115, 0, garageFloorY);
  yardTools.userData = { location: 'House-side wall in front of the BMW, clear of the house-entry steps', storage: 'Conventional floor-parked mower with unfolded handle and rolling shop vac; textured imported hand tools, drill, toolbox and four plastic crates; original wall rail and battery shelf', provisional: true };
  function garageProp(id, name, parent, x, y, z) {
    const prop = garageAssets[id].clone(true);
    prop.name = name;
    prop.position.set(x, y, z);
    prop.userData.provisional = true;
    prop.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    parent.add(prop);
    return prop;
  }
  const toolGreen = mat('#67826a');
  for (const y of [4.4, 6.5]) box(yardTools, 0, y, 0.8, 6, 0.12, 1.6, steel).name = 'Garage tool shelf';
  box(yardTools, 0, 5.4, 0.03, 6, 1.8, 0.08, black).name = 'Garage hand-tool board';
  for (const [index, id] of ['adjustable_wrench', 'Drill_01', 'cross_pein_hammer', 'handsaw_wood', 'combination_wrench'].entries()) {
    const dimensions = garageAssets[id].userData;
    const prop = garageProp(id, 'Downloaded garage wall tool', yardTools, -1.5 + index, 5.35 - dimensions.heightInches / 24, 0.1 + dimensions.depthInches / 24);
    prop.userData.wallMounted = true;
    box(yardTools, -1.5 + index, 5.75, 0.1, 0.06, 0.08, 0.12, steel).name = 'Garage tool-board mounting allowance';
  }
  for (const x of [-1.5, 0, 1.5]) box(yardTools, x, 4.62, 0.8, 0.6, 0.25, 0.5, black, true).name = 'Removable tool battery and charging dock';
  garageProp('metal_toolbox', 'Downloaded garage metal toolbox', yardTools, 2.3, 4.46, 0.8);
  for (const x of [-2.8, 2.8]) box(yardTools, x, 5.45, 0.02, 0.1, 2.3, 0.12, black).name = 'Wall-mounted shelf standard';
  const mower = new THREE.Group();
  mower.name = 'Conventional floor-parked lawn mower';
  mower.position.set(-2.2, 0, 1.5);
  mower.userData = { provisional: true, foldedHandle: false, uprightStorageRequired: false, wheelsOnFloor: true, widthInches: 24, fuelTypeSelected: false };
  yardTools.add(mower);
  box(mower, 0, 0.45, 0, 1.8, 0.5, 2.5, toolGreen, true).name = 'Battery mower deck';
  box(mower, 0, 0.9, -0.2, 0.8, 0.4, 0.8, black, true).name = 'Provisional mower power unit';
  for (const x of [-0.85, 0.85]) {
    for (const z of [-0.85, 0.85]) {
      const wheel = cylinder(mower, x, 0.32, z, 0.32, 0.25, black);
      wheel.rotation.z = Math.PI / 2;
    }
    stairBeam('Unfolded mower handle', [x, 0.6, -0.85], [x, 3.3, 3.25], 0.06, 0.06, steel, mower);
  }
  box(mower, 0, 3.3, 3.25, 1.7, 0.08, 0.08, black).name = 'Unfolded mower handle grip';
  const shopVac = new THREE.Group();
  shopVac.name = 'Large rolling shop vacuum';
  shopVac.position.set(2.1, 0, 1);
  yardTools.add(shopVac);
  cylinder(shopVac, 0, 1.25, 0, 0.85, 1.9, steel).name = 'Large shop vac drum';
  box(shopVac, 0, 2.3, 0, 1.55, 0.35, 1.55, black, true).name = 'Shop vac motor lid';
  for (const x of [-0.7, 0.7]) for (const z of [-0.7, 0.7]) cylinder(shopVac, x, 0.15, z, 0.15, 0.25, black).name = 'Shop vac caster';
  const hose = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.09, 8, 24), black);
  hose.position.set(0, 1.3, 0.9);
  hose.name = 'Shop vac hose on storage hook';
  shopVac.add(hose);
  box(yardTools, -2.25, 5.78, 0.15, 0.8, 0.16, 0.3, black).name = 'Leaf blower dedicated wall-mount cradle';
  const blower = box(yardTools, -2.25, 5.35, 0.5, 0.85, 0.7, 0.55, toolGreen, true);
  blower.name = 'Wall-hung battery leaf blower';
  blower.userData = { wallMounted: true, dedicatedCradle: true, provisional: true };
  stairBeam('Leaf blower nozzle', [-2.25, 5.3, 0.85], [-2.25, 4.8, 1.45], 0.22, 0.22, black, yardTools);
  for (const x of [-2.1, -0.7, 0.7, 2.1]) garageProp('plastic_crate_01', 'Garage tool storage bin', yardTools, x, 6.56, 0.8);
  const hangingTools = furnishing('Accessible garage garden-tool rail', 46.75, 15.175, 0, garageFloorY);
  hangingTools.userData = { widthInches: 30, location: 'North garage wall west of the bikes, with a clear retrieval approach', contents: 'Rake, broom and dustpan, with four spare hooks', floorStorage: false, anchorageVerified: false, provisional: true };
  for (const y of [3.2, 5.05]) box(hangingTools, 0, y, 0.03, 2.5, 0.15, 0.12, black).name = 'Garage garden-tool mounting rail';
  for (const [x, y] of [[-0.8, 4.95], [-0.2, 5.05], [0.8, 5.05]]) {
    box(hangingTools, x, y, 0.12, 0.12, 0.18, 0.12, steel).name = 'Garage garden-tool wall clip';
    box(hangingTools, x, y, 0.24, 0.16, 0.06, 0.2, black).name = 'Garage garden-tool retaining clip';
  }
  const rake = new THREE.Group();
  rake.name = 'Wall-hung garage rake';
  rake.userData = { wallMounted: true, headWidthInches: 22, provisional: true };
  hangingTools.add(rake);
  cylinder(rake, -0.2, (0.85 + 5.5) / 2, 0.3, 0.035, 5.5 - 0.85, oak).name = 'Rake full-length round handle';
  const rakeHead = cylinder(rake, -0.2, 5.5, 0.3, 0.035, 22 / 12, steel);
  rakeHead.rotation.z = Math.PI / 2;
  rakeHead.name = 'Rake crosshead';
  for (let tine = 0; tine < 16; tine++) {
    const x = -0.2 - 11 / 12 + tine * 22 / (12 * 15);
    stairBeam('Rake steel tine', [x, 5.5, 0.3], [x, 5.25, 0.58], 0.018, 0.018, steel, rake);
  }
  const broom = new THREE.Group();
  broom.name = 'Wall-hung garage broom';
  broom.userData = { wallMounted: true, headWidthInches: 10.8, provisional: true };
  hangingTools.add(broom);
  cylinder(broom, 0.8, (1.04 + 5.2) / 2, 0.3, 0.035, 5.2 - 1.04, oak).name = 'Broom full-length round handle';
  box(broom, 0.8, 0.95, 0.3, 0.8, 0.18, 0.25, toolGreen, true).name = 'Broom bristle block';
  const broomBristles = mat('#b69b5c');
  for (let bristle = 0; bristle < 24; bristle++) {
    const x = 0.8 - 0.45 + bristle * 0.9 / 23;
    stairBeam('Broom bristle bundle', [0.8 + (x - 0.8) * 0.82, 0.87, 0.3], [x, 0.3, 0.34], 0.025, 0.16, broomBristles, broom);
  }
  const dustpan = new THREE.Group();
  dustpan.name = 'Wall-hung garage dustpan';
  dustpan.userData = { wallMounted: true, widthInches: 9.6, provisional: true };
  hangingTools.add(dustpan);
  box(dustpan, -0.8, 4.2, 0.14, 0.8, 0.4, 0.04, toolGreen, true).name = 'Dustpan molded back';
  box(dustpan, -0.8, 4.0, 0.32, 0.8, 0.04, 0.4, toolGreen).name = 'Dustpan collecting lip';
  for (const x of [-1.18, -0.42]) box(dustpan, x, 4.2, 0.32, 0.04, 0.4, 0.4, toolGreen).name = 'Dustpan raised side';
  cylinder(dustpan, -0.8, 4.7, 0.16, 0.04, 0.6, black).name = 'Dustpan hanging handle';
  for (const x of [-1, -0.5, 0.2, 0.6]) {
    box(hangingTools, x, 3.2, 0.12, 0.1, 0.18, 0.06, steel).name = 'Spare garage hook mounting plate';
    const hook = new THREE.Group();
    hook.name = 'Spare garage wall hook';
    hook.position.set(x, 3.2, 0.15);
    hangingTools.add(hook);
    box(hook, 0, 0, 0.12, 0.05, 0.05, 0.24, steel);
    box(hook, 0, 0.06, 0.225, 0.05, 0.15, 0.05, steel);
  }
  hangingTools.traverse((object) => { if (object.isMesh) object.userData.tourObstacle = true; });
  yardTools.traverse((object) => { if (object.isMesh) object.userData.tourObstacle = true; });

  const kidsClay = mat('#b98369');
  const kidsBlue = mat('#78949a');
  const familyPanelDepth = 0.5 / 12;
  const familyPanels = furnishing('Family message wall panelling', kidsRoom.x + kidsRoom.width / 2, kidsRoom.z - 0.175, Math.PI);
  familyPanels.userData = { finish: 'Warm-white painted vertical grooved panelling', thicknessInches: 0.5, bottomInches: 8, topInches: 108, face: 'Kitchen / hall side only', provisional: true };
  const familyPanelWidth = kidsRoom.width - 0.35;
  const familyPanelFinish = mat('#f2efe7');
  box(familyPanels, 0, (9 + 8 / 12) / 2, familyPanelDepth / 4, familyPanelWidth, 9 - 8 / 12, familyPanelDepth / 2, mat('#d1ccc1')).name = 'Family panelling recessed groove backing';
  for (let index = 0; index < 20; index++) {
    box(familyPanels, -familyPanelWidth / 2 + (index + 0.5) * familyPanelWidth / 20, (9 + 8 / 12) / 2, 3 * familyPanelDepth / 4, familyPanelWidth / 20 - 0.015, 9 - 8 / 12, familyPanelDepth / 2, familyPanelFinish).name = 'Family vertical wall panel';
  }
  const familyEdgeTrim = furnishing('Family message wall white edge trim', kidsRoom.x + kidsRoom.width / 2, kidsRoom.z - 0.175, Math.PI);
  familyEdgeTrim.userData = { finish: 'Warm-white paint matching wall panelling', thicknessInches: 0.5, frontStripWidthInches: 4.2, bottomInches: 8, topInches: 108, cornerReturns: true, provisional: true };
  for (const side of [-1, 1]) {
    box(familyEdgeTrim, side * kidsRoom.width / 2, (9 + 8 / 12) / 2, familyPanelDepth / 2, 0.35, 9 - 8 / 12, familyPanelDepth, familyPanelFinish).name = 'Family white edge front strip';
    box(familyEdgeTrim, side * (kidsRoom.width / 2 + 0.175 + familyPanelDepth / 2), (9 + 8 / 12) / 2, (familyPanelDepth - 0.35) / 2, familyPanelDepth, 9 - 8 / 12, 0.35 + familyPanelDepth, familyPanelFinish).name = 'Family white edge corner return';
  }
  const hallPanelStartZ = kidsRoom.z + 0.175;
  const hallPanelLength = groundFrontWallZ - 0.175 - hallPanelStartZ;
  const hallPanels = furnishing('Hall-facing white wall panelling', kidsRoom.x - 0.175, hallPanelStartZ, -Math.PI / 2);
  hallPanels.userData = { finish: 'Warm-white painted vertical grooved panelling', thicknessInches: 0.5, bottomInches: 8, topInches: 108, face: 'Hall side of kids and guest west walls, continuing to foyer', provisional: true };
  const hallPanelCutouts = [];
  for (const opening of [{ start: kidsDoorway.z, end: kidsDoorway.z + kidsDoorway.width, height: kidsDoorway.height }, { start: guestSuite.bedroomDoor.z, end: guestSuite.bedroomDoor.z + guestSuite.bedroomDoor.width, height: 8 }]) {
    const sideExtent = casingSideWidth + casingReveal;
    const headerTop = opening.height + casingReveal + 5.5 / 12;
    for (const [extent, bottom, top] of [
      [sideExtent, 0, headerTop],
      [sideExtent + 0.03125, opening.height + casingReveal, opening.height + casingReveal + 0.0625],
      [sideExtent + 0.0625, headerTop, headerTop + 0.0416667 + 1 / 24]
    ]) hallPanelCutouts.push({ left: opening.start - extent - hallPanelStartZ, right: opening.end + extent - hallPanelStartZ, bottom, top });
  }
  function hallPanelPart(name, left, right, depth, thickness, material) {
    let pieces = [{ left, right, bottom: 0.005 + 8 / 12, top: 9 }];
    for (const cut of hallPanelCutouts) {
      pieces = pieces.flatMap((piece) => {
        const x1 = Math.max(piece.left, cut.left);
        const x2 = Math.min(piece.right, cut.right);
        const y1 = Math.max(piece.bottom, cut.bottom);
        const y2 = Math.min(piece.top, cut.top);
        if (x2 <= x1 || y2 <= y1) return [piece];
        return [
          { ...piece, top: y1 }, { ...piece, bottom: y2 },
          { left: piece.left, right: x1, bottom: y1, top: y2 },
          { left: x2, right: piece.right, bottom: y1, top: y2 }
        ].filter((part) => part.right - part.left > 1e-6 && part.top - part.bottom > 1e-6);
      });
    }
    for (const part of pieces) box(hallPanels, (part.left + part.right) / 2, (part.bottom + part.top) / 2, depth, part.right - part.left, part.top - part.bottom, thickness, material).name = name;
  }
  hallPanelPart('Hall panelling recessed groove backing', 0, hallPanelLength, familyPanelDepth / 4, familyPanelDepth / 2, mat('#d1ccc1'));
  const hallPanelPitch = familyPanelWidth / 20;
  for (let start = 0; start < hallPanelLength; start += hallPanelPitch) {
    hallPanelPart('Hall vertical wall panel', start + 0.0075, Math.min(start + hallPanelPitch - 0.0075, hallPanelLength), 3 * familyPanelDepth / 4, familyPanelDepth / 2, familyPanelFinish);
  }
  const familyBoard = furnishing('Family glass dry-erase and cork board', kidsRoom.x + kidsRoom.width / 2, kidsRoom.z - 0.21 - familyPanelDepth, Math.PI);
  familyBoard.userData = { widthInches: 84, heightInches: 48, bottomInches: 30, maxProjectionInches: 3.5, face: 'Kitchen / hall side of kids north wall', finish: 'White oak frame, charcoal tempered dry-erase glass, natural cork', writingMedium: 'Opaque light-coloured dry-erase markers approved for black glass; no chalk or chalk markers', wallAnchorageRequired: true, safetyGlazingRequired: true, provisional: true };
  const glassBoardFinish = mat('#263531');
  glassBoardFinish.roughness = 0.18;
  const corkFinish = mat('#b79367');
  box(familyBoard, 0, 4.5, 0, 7, 4, 0.06, cabinetFinish).name = 'Family board backing';
  box(familyBoard, -1, 4.5, 0.04, 4.75, 3.75, 0.025, glassBoardFinish).name = 'Family charcoal dry-erase glass';
  box(familyBoard, 2.4375, 4.5, 0.04, 1.875, 3.75, 0.025, corkFinish).name = 'Family cork pinboard';
  for (const x of [-3.4375, 1.4375, 3.4375]) box(familyBoard, x, 4.5, 0.055, 0.125, 4, 0.08, cabinetRailFinish).name = 'Family board oak stile';
  for (const y of [2.5625, 6.4375]) box(familyBoard, 0, y, 0.055, 6.75, 0.125, 0.08, cabinetRailFinish).name = 'Family board oak rail';
  box(familyBoard, -1, 2.56, 0.09, 4.75, 0.08, 0.18, cabinetRailFinish).name = 'Shallow marker and eraser tray';
  box(familyBoard, 0.75, 2.63, 0.09, 0.35, 0.06, 0.16, black).name = 'Family board eraser';
  for (const x of [-2.9, -2.65]) {
    box(familyBoard, x, 2.62, 0.12, 0.24, 0.05, 0.05, cream).name = 'Family board dry-erase marker';
    box(familyBoard, x + 0.1, 2.62, 0.12, 0.06, 0.055, 0.055, black).name = 'Family marker captive cap';
  }
  for (const y of [4.6, 5.25, 5.9]) box(familyBoard, -1, y, 0.058, 4.3, 0.012, 0.008, cream).name = 'Dry-erase weekly planner line';
  for (let day = 1; day < 7; day++) box(familyBoard, -3.15 + day * 4.3 / 7, 5.25, 0.058, 0.012, 1.3, 0.008, cream).name = 'Dry-erase weekly planner divider';
  for (const [index, material] of [cream, kidsBlue, kidsClay].entries()) {
    box(familyBoard, 2.4375, 5.55 - index * 1.05, 0.065, 1.25, 0.8, 0.018, material).name = 'Pinned family paper';
    box(familyBoard, 2.4375, 5.87 - index * 1.05, 0.082, 0.2, 0.06, 0.015, cabinetFinish).name = 'Captive paper clip';
  }
  for (const [x, y, width] of [[-2.25, 3.9, 1.3], [-2.1, 3.65, 1.6], [0.1, 3.4, 0.9]]) {
    box(familyBoard, x, y, 0.058, width, 0.025, 0.008, cream).name = 'Dry-erase drawing stroke';
  }
  const trofastWidth = 39 / 12;
  const trofastDepth = 17.375 / 12;
  const trofastHeight = 37 / 12;
  const trofastPanel = 0.06;
  const trofastBay = (trofastWidth - 4 * trofastPanel) / 3;
  const trofastMesh = mat('#555e5c');
  const trofastWire = mat('#7c8582');
  for (let index = 0; index < 1; index++) {
    const x = kidsRoom.x + kidsRoom.width - 0.35 - trofastWidth / 2;
    const storage = furnishing(`IKEA TROFAST toy storage ${index + 1}`, x, kidsRoom.z + 0.35 + trofastDepth / 2, 0, 0, true);
    storage.userData = { manufacturer: 'IKEA', model: 'TROFAST', articleNumber: '796.131.29', productURL: 'https://www.ikea.com/us/en/p/trofast-storage-combination-with-boxes-room-divider-white-dark-gray-s79613129/', widthInches: 39, depthInches: 17.375, heightInches: 37, finish: 'White frame / dark gray mesh boxes', removableBoxes: 9, wallAnchorageRequired: true, looseLegoRequiresLiddedInserts: true, binPullAllowanceInches: 17.375, manufacturerCAD: false, provisional: true };
    for (const y of [trofastPanel / 2, trofastHeight - trofastPanel / 2]) box(storage, 0, y, 0, trofastWidth, trofastPanel, trofastDepth, porcelain).name = 'TROFAST white horizontal frame';
    for (let panel = 0; panel < 4; panel++) {
      box(storage, -trofastWidth / 2 + trofastPanel / 2 + panel * (trofastBay + trofastPanel), trofastHeight / 2, 0, trofastPanel, trofastHeight - 2 * trofastPanel, trofastDepth, porcelain).name = 'TROFAST white upright';
    }
    for (let column = 0; column < 3; column++) for (let row = 0; row < 3; row++) {
      const binX = -trofastWidth / 2 + trofastPanel + trofastBay / 2 + column * (trofastBay + trofastPanel);
      const binBottom = 0.2 + row * 0.95;
      const binWidth = 11.75 / 12;
      const binDepth = 16.5 / 12;
      const binHeight = 9 / 12;
      for (const side of [-1, 1]) box(storage, binX + side * (trofastBay / 2 - 0.02), binBottom - 0.035, 0, 0.04, 0.04, binDepth, porcelain).name = 'TROFAST box guide rail';
      const bin = new THREE.Group();
      bin.name = 'TROFAST removable mesh box';
      bin.position.set(binX, binBottom, 0);
      bin.userData = { removable: true, builtInDrawer: false, widthInches: 11.75, depthInches: 16.5, heightInches: 9, purpose: index === 0 ? 'LEGO in separate lidded inserts' : 'Toys and play supplies' };
      storage.add(bin);
      box(bin, 0, 0.015, 0, binWidth, 0.03, binDepth, trofastMesh).name = 'TROFAST box bottom';
      for (const side of [-1, 1]) {
        box(bin, side * (binWidth / 2 - 0.015), binHeight / 2, 0, 0.03, binHeight, binDepth, trofastMesh).name = 'TROFAST mesh box side';
        box(bin, 0, binHeight / 2, side * (binDepth / 2 - 0.015), binWidth - 0.06, binHeight, 0.03, trofastMesh).name = 'TROFAST mesh box end';
      }
      for (let wire = 1; wire < 8; wire++) box(bin, -binWidth / 2 + wire * binWidth / 8, binHeight / 2, binDepth / 2 + 0.002, 0.008, binHeight - 0.06, 0.004, trofastWire).name = 'TROFAST mesh front wire';
      for (const y of [0.04, 0.25, 0.5, binHeight - 0.02]) box(bin, 0, y, binDepth / 2 + 0.002, binWidth - 0.04, 0.008, 0.004, trofastWire).name = 'TROFAST mesh front crosswire';
      box(bin, 0, binHeight - 0.12, binDepth / 2 + 0.006, 0.28, 0.08, 0.008, black).name = 'TROFAST box grip';
      if (index === 0) {
        box(bin, 0, 0.3, 0, 0.7, 0.5, 1, linen).name = 'Separate LEGO organizer insert';
        box(bin, 0, 0.565, 0, 0.74, 0.03, 1.04, porcelain).name = 'LEGO organizer removable lid';
      }
    }
  }
  const kidsDeskWidth = 47.25 / 12;
  const kidsDeskDepth = 31.5 / 12;
  const kidsDeskHeight = 29.5 / 12;
  const kidsDeskZ = guestSuite.bathroom.z - 0.175 - kidsDeskDepth / 2;
  for (let index = 0; index < 2; index++) {
    const rotation = Math.PI;
    const x = index === 0 ? guestSuite.kidsExtension.x + guestSuite.kidsExtension.w / 2
      : kidsRoom.x + kidsRoom.southWidth - 0.175 - 1 / 12 - kidsDeskWidth / 2;
    const z = index === 0 ? guestSuite.closet.z - 0.175 - kidsDeskDepth / 2 : kidsDeskZ;
    const desk = furnishing(`IKEA MITTZON kids desk ${index + 1}`, x, z, rotation, 0, true);
    desk.userData = { manufacturer: 'IKEA', model: 'MITTZON', widthInches: 47.25, depthInches: 31.5, heightInches: 29.5, minHeightInches: 24.375, maxHeightInches: 49.625, productURL: 'https://www.ikea.com/us/en/p/mittzon-desk-sit-stand-electric-birch-veneer-white-s09527743/', finish: 'Birch veneer / white', manufacturerCAD: false, chairAllowanceInches: 30, purpose: index === 0 ? 'All-in-one PC' : 'Homework and crafts', childUseRequiresReview: true };
    box(desk, 0, kidsDeskHeight - 0.05, 0, kidsDeskWidth, 0.1, kidsDeskDepth, oak).name = 'MITTZON desktop';
    for (const side of [-1, 1]) {
      box(desk, side * 1.45, 0.08, 0, 0.25, 0.16, 2.3, porcelain).name = 'MITTZON T foot';
      box(desk, side * 1.45, 0.85, 0, 0.2, 1.5, 0.2, porcelain).name = 'MITTZON lower lift column';
      box(desk, side * 1.45, 1.95, 0, 0.15, 0.8, 0.15, porcelain).name = 'MITTZON upper lift column';
    }
    box(desk, 0, 2.2, 0, 3.1, 0.18, 0.15, porcelain).name = 'MITTZON frame crossbar';
    box(desk, 0, 2.15, -0.95, 2.5, 0.2, 0.35, porcelain).name = 'MITTZON cable tray';
    box(desk, 1.6, 2.35, 1.22, 0.35, 0.08, 0.12, black).name = 'MITTZON height control';
    if (index === 0) {
      box(desk, 0, 3.45, -0.6, 2.05, 1.2, 0.14, black, true).name = 'Kids all-in-one PC';
      box(desk, 0, 2.7, -0.6, 0.12, 0.5, 0.12, porcelain).name = 'All-in-one PC stand';
      box(desk, 0, 2.49, -0.6, 0.75, 0.06, 0.45, porcelain).name = 'All-in-one PC base';
      box(desk, -0.2, 2.49, 0.6, 1.35, 0.06, 0.45, porcelain).name = 'Kids PC keyboard';
      box(desk, 0.8, 2.49, 0.6, 0.22, 0.06, 0.35, black).name = 'Kids PC mouse';
    } else {
      box(desk, -0.3, 2.48, 0.35, 1.5, 0.04, 1, kidsBlue).name = 'Homework writing mat';
      box(desk, -0.3, 2.51, 0.25, 0.7, 0.02, 0.85, cream).name = 'Homework notebook';
      box(desk, 1.3, 2.65, -0.75, 0.55, 0.4, 0.45, kidsClay).name = 'Removable art supply caddy';
    }
    const chairOffset = kidsDeskDepth / 2 + 0.025;
    const chair = furnishing(`Kids desk chair ${index + 1}`, x + Math.sin(rotation) * chairOffset, z + Math.cos(rotation) * chairOffset, rotation + Math.PI, 0, true);
    chair.userData = { widthInches: 18, depthInches: 18, seatHeightInches: 18, productSelected: false, provisional: true };
    box(chair, 0, 1.425, 0, 1.5, 0.15, 1.5, index === 1 ? kidsBlue : linen, true).name = 'Kids desk chair seat';
    box(chair, 0, 2.05, -0.67, 1.5, 1.2, 0.1, index === 1 ? kidsBlue : linen, true).name = 'Kids desk chair back';
    for (const dx of [-0.55, 0.55]) for (const z of [-0.5, 0.5]) box(chair, dx, 0.7, z, 0.1, 1.4, 0.1, oak).name = 'Kids desk chair leg';
  }

  const officeDeskWidth = 5;
  const officeDeskDepth = 2;
  const officeFurnitureInset = 0.175 + 0.75 / 12 + 1 / 12;
  const officeDeskPositions = [
    [officeEntry.x / 2, officeNorthZ + 0.175 + officeDeskDepth / 2, 0],
    [officeEntry.x - 0.175 - 1 / 12 - officeDeskDepth / 2, 50.85, -Math.PI / 2]
  ];
  for (const [index, [deskX, deskZ, rotation]] of officeDeskPositions.entries()) {
    const officeDesk = furnishing(`60-inch office desk ${index + 1}`, deskX, deskZ, rotation, 0, true);
    officeDesk.userData = { widthInches: officeDeskWidth * 12, depthInches: officeDeskDepth * 12, provisional: true };
    box(officeDesk, 0, 2.4, 0, officeDeskWidth, 0.2, officeDeskDepth, oak).name = '60-inch desktop';
    for (const x of [-2.2, 2.2]) for (const z of [-0.8, 0.8]) box(officeDesk, x, 1.2, z, 0.12, 2.4, 0.12, oak);
    for (const monitorX of [-1.05, 1.05]) {
      box(officeDesk, monitorX, 3.5, -0.25, 1.9, 1.1, 0.1, black, true).name = 'Office monitor';
      box(officeDesk, monitorX, 2.53, -0.25, 0.9, 0.06, 0.5, steel);
      box(officeDesk, monitorX, 2.8, -0.25, 0.08, 0.55, 0.08, steel);
    }
    box(officeDesk, 0, 2.53, 0.45, 1.2, 0.06, 0.4, black);
    const chairOffset = 2.35;
    const deskChair = furnishing('Office task chair', deskX + Math.sin(rotation) * chairOffset, deskZ + Math.cos(rotation) * chairOffset, rotation + Math.PI, 0, true);
    box(deskChair, 0, 1.6, 0, 1.8, 0.3, 1.7, black, true);
    box(deskChair, 0, 2.5, -0.7, 1.8, 1.6, 0.2, black, true);
    cylinder(deskChair, 0, 0.8, 0, 0.12, 1.5, steel);
    for (const angle of [0, Math.PI / 3, 2 * Math.PI / 3]) {
      const foot = box(deskChair, 0, 0.15, 0, 2.2, 0.12, 0.1, black);
      foot.rotation.y = angle;
    }
  }
  const officeLoveseatWidth = 5;
  const officeLounge = furnishing('Office loveseat', officeFurnitureInset + officeLoveseatWidth / 2, groundFrontWallZ - officeFurnitureInset - 1.4, Math.PI, 0, true);
  officeLounge.userData = { widthInches: 60, depthInches: 33.6, provisional: true, productSelected: false, layoutIntent: 'Restored full-size two-seat concept below the front window, facing north; compact north-wall trial superseded' };
  box(officeLounge, 0, 1, 0, officeLoveseatWidth, 0.8, 2.8, cream, true);
  box(officeLounge, 0, 2, -1.15, officeLoveseatWidth, 1.4, 0.35, cushion, true);
  for (const side of [-1, 1]) box(officeLounge, side * (officeLoveseatWidth / 2 - 0.15), 1.5, 0, 0.3, 0.8, 2.8, cream, true);

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
    leaf.userData = {
      nominalWidthInches: 30, nominalHeightInches: 96, thicknessInches: 1.75, columns: 2, rows: 5, lites: 10,
      inwardOpenRotation: -side * Math.PI / 2,
      interactiveHouseDoor: { operation: 'hinged', openAngleDegrees: 90, maxAngleDegrees: 90, openRotationSign: -side },
      provisional: true
    };
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

  const ellipticalLength = 65 / 12;
  const ellipticalWidth = 22 / 12;
  const elliptical = furnishing('SOLE E20 elliptical concept', 1.65, officeNorthZ + officeFurnitureInset + ellipticalLength / 2);
  elliptical.userData = { lengthInches: 65, widthInches: 22, heightInches: 64, provisional: true, operatingClearancesVerified: false, source: 'https://www.soletreadmills.com/products/sole-e20' };
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
  const bedroomBedZ = groundFrontWallZ - 0.175 - 0.15 - 3.7 - 0.78;
  const bed = furnishing('Article Lenia queen bed', bedroomFurnitureBack - bedroomBedDepth / 2, bedroomBedZ, -Math.PI / 2, 0, true);
  bed.userData = { widthInches: 63.5, depthInches: 82.75 };
  box(bed, 0, 1, 0, bedroomBedWidth, 0.5, bedroomBedDepth, oak);
  for (const x of [-2.25, 2.25]) for (const z of [-3, 3]) box(bed, x, 0.4, z, 0.18, 0.8, 0.18, oak);
  box(bed, 0, 2.1, -bedroomBedDepth / 2 + 0.1, bedroomBedWidth, 3.3, 0.2, oak, true);
  box(bed, 0, 1.63, 0.05, 5, 0.75, 6.65, cushion, true);
  box(bed, 0, 2.02, 1.1, 5.03, 0.08, 3.8, linen, true);
  for (const x of [-1.25, 1.25]) box(bed, x, 2.12, -2.2, 2.1, 0.35, 1.35, porcelain, true);
  for (const side of [-1, 1]) {
    const nightstand = furnishing('Bedroom nightstand', bedroomFurnitureBack - 0.675, bedroomBedZ + side * 3.7, -Math.PI / 2, 0, true);
    cabinet(nightstand, 0, 0, 1.5, 1.3, 1.6);
    cylinder(nightstand, 0, 2.4, 0, 0.05, 1.2, brass);
    cylinder(nightstand, 0, 3, 0, 0.4, 0.45, cream, 0.25);
  }
  // South-jamb hinge opens into the bedroom, away from the closet return.
  const guestBedroomEntry = furnishing('Guest bedroom entry', guestSuite.bedroomDoor.x, guestSuite.bedroomDoor.z + guestSuite.bedroomDoor.width);
  const guestBedroomLeaf = new THREE.Group();
  guestBedroomLeaf.name = 'Guest bedroom south-jamb hinged door';
  guestBedroomLeaf.userData = { interactiveHouseDoor: { operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 90, openRotationSign: -1 }, nominalHeightInches: 96, provisional: true };
  guestBedroomEntry.add(guestBedroomLeaf);
  singlePanelDoor(guestBedroomLeaf, 0, 4, -1.5, 2.96, 7.96, 1.375 / 12, windowTrim, Math.PI / 2).name = 'Guest bedroom white single-panel door';
  for (const side of [-1, 1]) cylinder(guestBedroomLeaf, side * 0.13, 3.2, -2.72, 0.07, 0.14, brass).name = 'Guest bedroom gold door knob';

  const wardrobe = furnishing('Guest walk-in closet fittings', guestSuite.closet.x, guestSuite.closet.z);
  wardrobe.userData = { hangingRunInches: 48, clothingDepthAllowanceInches: 24, doorless: true, provisional: true,
    finish: 'Proposed light natural oak-look; California Closets design direction, not selected product',
    review: 'Confirm finish, reach, adjustable fittings, loads, anchorage and drawer hardware with supplier' };
  const closetPanel = 0.0625;
  // Standard 24-inch envelopes; the dedicated clipped corner is open to the
  // aisle, not a blind square behind two perpendicular hanging reservations.
  function closetCarcass(parent, width, depth, cornerSide = 0) {
    // Corner-facing partitions stop at the diagonal opening, rather than
    // sealing the corner behind two full-depth panels that meet at a point.
    for (const side of [-1, 1]) box(parent, side * (width - closetPanel) / 2, 3.75,
      side === cornerSide ? -0.625 : 0,
      closetPanel, 7, side === cornerSide ? 0.75 : depth, oak).name =
        side === cornerSide ? 'Guest closet full-height corner return panel' : 'Guest closet full-height side panel';
    for (const y of [0.28125, 7.21875]) box(parent, 0, y, 0,
      width - 2 * closetPanel, closetPanel, depth, oak).name = 'Guest closet carcass floor or cap';
    box(parent, 0, 3.75, -depth / 2 + closetPanel / 2,
      width - 2 * closetPanel, 6.875, closetPanel, oak).name = 'Guest closet back panel';
    box(parent, 0, 0.125, -0.05, width, 0.25, depth - 0.1, oak).name = 'Guest closet recessed plinth';
  }
  for (const run of guestSuite.closetStorage.hanging) {
    const centerX = run.x + run.w / 2, centerZ = run.z + run.d / 2;
    const bay = new THREE.Group();
    bay.name = run.double ? 'Guest closet 24-inch double-hang module' : 'Guest closet 24-inch long-hang module';
    bay.position.set(centerX, 0, centerZ);
    wardrobe.add(bay);
    closetCarcass(bay, run.w, run.d, run.double ? 0 : -1);
    const shelf = box(bay, 0, 7, 0.03125, run.w - 2 * closetPanel, closetPanel, run.d - closetPanel, oak);
    shelf.name = 'Guest closet hanging-zone upper shelf';
    shelf.userData.hangingDepthInches = run.d * 12;
    for (const y of run.double ? [3.45, 6.7] : [5.8]) {
      const rail = cylinder(wardrobe, centerX, y, centerZ + 0.05, 0.035, run.w - 2 * closetPanel, brass);
      rail.rotation.z = Math.PI / 2;
      rail.name = run.double ? 'Guest closet continuous short-hang rail' : 'Guest closet continuous long-hang rail';
    }
    const count = 4;
    for (let i = 0; i < count; i++) {
      const x = run.x + (i + 0.5) * run.w / count;
      for (const railY of run.double ? [3.45, 6.7] : [5.8]) {
        const hanger = cylinder(wardrobe, x, railY - 0.14, centerZ + 0.05, 0.018, 1.5, brass);
        hanger.rotation.x = Math.PI / 2;
        hanger.name = 'Guest closet garment hanger';
        const length = run.double ? 2.8 : 5.05;
        box(wardrobe, x, railY - 0.25 - length / 2, centerZ + 0.05, 0.12, length, 1.7, i % 2 ? cream : linen).name = 'Guest closet hanging garment';
      }
    }
  }
  const closetShelves = guestSuite.closetStorage.shelves;
  const corner = guestSuite.closetStorage.corner;
  // Five-sided shelves join both runs along 9-inch edges, leaving a 21.2-inch
  // diagonal opening. Back boards stop at contact; no double-occupied corner.
  function cornerDeck(y, name) {
    const p = closetPanel;
    const shape = new THREE.Shape();
    shape.moveTo(p, p); shape.lineTo(2, p); shape.lineTo(2, 2 - corner.clip);
    shape.lineTo(2 - corner.clip, 2); shape.lineTo(p, 2); shape.closePath();
    const deck = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: p, bevelEnabled: false }), oak);
    deck.rotation.x = Math.PI / 2;
    // Shape y becomes world z; extrusion points downward.
    deck.position.set(corner.x, y + p / 2, corner.z);
    deck.name = name;
    wardrobe.add(deck);
  }
  box(wardrobe, corner.x + 1, 3.75, corner.z + closetPanel / 2, 2, 7, closetPanel, oak).name = 'Guest closet corner north back';
  box(wardrobe, corner.x + closetPanel / 2, 3.75, corner.z + 1 + closetPanel / 2, closetPanel, 7, 2 - closetPanel, oak).name = 'Guest closet corner west back';
  for (const y of [0.28125, 2.65, 3.8, 5, 6.2, 7, 7.21875])
    cornerDeck(y, 'Guest closet connected diagonal corner shelf');
  for (const [x, z, w, d] of [[1, 0.15, 2, 0.2], [0.15, 1.125, 0.2, 1.75]])
    box(wardrobe, corner.x + x, 0.125, corner.z + z, w, 0.25, d, oak).name = 'Guest closet corner recessed plinth';
  const endBay = new THREE.Group();
  const end = guestSuite.closetStorage.westShelving;
  endBay.name = 'Guest closet west 18-inch shelf module';
  endBay.position.set(end.x + end.w / 2, 0, end.z + end.d / 2);
  endBay.rotation.y = Math.PI / 2;
  wardrobe.add(endBay);
  closetCarcass(endBay, 1.5, 2);
  for (const y of [1.45, 2.65, 3.8, 5, 6.2, 7])
    box(endBay, 0, y, 0.03125, 1.375, closetPanel, 1.9375, oak).name = 'Guest closet west end adjustable shelf';
  const filler = guestSuite.closetStorage.northFiller;
  box(wardrobe, filler.x + filler.w / 2, 3.75, filler.z + filler.d - 0.03125, filler.w, 7, closetPanel, oak).name = 'Guest closet separate 3-inch east filler';
  for (const y of [0.28125, 7.21875])
    box(wardrobe, filler.x + filler.w / 2, y, filler.z + (filler.d - closetPanel) / 2,
      filler.w, closetPanel, filler.d - closetPanel, oak).name = 'Guest closet east filler floor or cap';
  box(wardrobe, filler.x + filler.w / 2, 3.75, filler.z + closetPanel / 2,
    filler.w, 6.875, closetPanel, oak).name = 'Guest closet east filler back panel';
  box(wardrobe, filler.x + filler.w / 2, 0.125, filler.z + 0.95,
    filler.w, 0.25, 1.9, oak).name = 'Guest closet east filler recessed plinth';
  const westTower = new THREE.Group();
  westTower.name = 'Guest closet west 24-inch drawer and shelf tower';
  westTower.position.set(closetShelves.x + closetShelves.w / 2, 0, closetShelves.z + closetShelves.d / 2);
  westTower.rotation.y = Math.PI / 2;
  wardrobe.add(westTower);
  closetCarcass(westTower, 2, 2, 1);
  for (const y of [2.65, 3.8, 5, 6.2, 7]) {
    box(westTower, 0, y, 0.03125, 1.875, closetPanel, 1.9375, oak).name = 'Guest wardrobe adjustable folded-clothes shelf';
    for (const side of [-1, 1]) for (const z of [-0.5, 0.5])
      box(westTower, side * 0.92, y - 0.045, z, 0.035, 0.035, 0.06, brass).name = 'Guest closet schematic shelf pin';
  }
  // Schematic 32 mm adjustment pattern, limited to a useful upper adjustment
  // band rather than thousands of individual holes throughout the house.
  for (const [bay, width] of [[westTower, 2], [endBay, 1.5]]) {
    for (const side of [-1, 1]) for (const z of [-0.75, 0.75]) for (let i = 0; i < 12; i++)
      box(bay, side * (width / 2 - closetPanel - 0.001), 4.1 + i * 32 / 304.8, z,
        0.002, 0.012, 0.012, black).name = 'Guest closet schematic 32mm shelf-pin hole';
  }
  for (let row = 0; row < 3; row++) {
    const drawer = new THREE.Group();
    drawer.name = `Guest closet pull-out drawer ${row + 1}`;
    drawer.position.y = 0.7 + row * 0.65;
    drawer.userData = { travelFeet: 1.25, shownClosed: true, hardwareSelected: false };
    westTower.add(drawer);
    const front = new THREE.Group();
    front.position.set(0, 0, 1.04);
    front.userData = { cabinetFront: true, width: 1.94, height: 0.59 };
    drawer.add(front);
    box(front, 0, 0, 0, 1.94, 0.59, 0.0625, oak).name = 'Guest closet flat drawer slab';
    front.name = 'Guest closet flat drawer front';
    front.userData.finish = 'Proposed light oak-look, not solid wood or selected vendor finish';
    front.traverse((part) => { if (part.isMesh) part.material = oak; });
    cabinetPull(front, 0, 0, 0.09, 0.5);
    box(drawer, 0, -0.22, 0.3, 1.75, 0.04, 1.3, oak).name = 'Guest closet drawer floor';
    for (const side of [-1, 1]) {
      box(drawer, side * 0.855, 0, 0.3, 0.04, 0.4, 1.3, oak).name = 'Guest closet drawer side';
      box(drawer, 0, 0, 0.3 + side * 0.63, 1.67, 0.4, 0.04, oak).name = 'Guest closet drawer end';
    }
  }
  wardrobe.traverse((part) => {
    if (part.isMesh && part.material === oak)
      part.material = /shelf|floor|cap|plinth/.test(part.name) ? cabinetRailFinish : cabinetFinish;
  });
  const bathroomOpening = guestSuite.bathroomDoor;
  const bathroomDoor = furnishing('Guest bathroom inward-opening door', bathroomOpening.x, bathroomOpening.z);
  bathroomDoor.userData = { hinge: 'West jamb', heightInches: 96, nominalWidthInches: 28, provisional: true,
    interactiveHouseDoor: { operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 90, openRotationSign: 1 } };
  singlePanelDoor(bathroomDoor, bathroomOpening.width / 2, 4, 0, bathroomOpening.width - 0.04, 7.96, 0.13, windowTrim).name = 'Guest bathroom painted-white Shaker leaf';
  for (const side of [-1, 1]) box(bathroomDoor, bathroomOpening.width - 0.2, 3, side * 0.14, 0.16, 0.15, 0.15, brass, true).name = 'Guest bathroom satin-gold knob';
  const closetOpening = guestSuite.closetDoor;
  const closetPocket = furnishing('Guest walk-in closet left pocket door', closetOpening.x + closetOpening.width / 2, closetOpening.z);
  closetPocket.userData = { nominalWidthInches: closetOpening.width * 12, heightInches: closetOpening.height * 12, provisional: true,
    interactiveHouseDoor: { operation: 'sliding', open: false, closedCenterX: closetOpening.x + closetOpening.width / 2, openCenterX: closetOpening.x + closetOpening.width / 2 - closetOpening.pocket.travel } };
  singlePanelDoor(closetPocket, 0, 4, 0, closetOpening.pocket.leafWidth, 7.96, 0.13, windowTrim).name = 'Guest closet painted-white pocket leaf';
  for (const side of [-1, 1]) box(closetPocket, closetOpening.pocket.leafWidth / 2 - 0.08, 3, side * 0.066, 0.12, 0.5, 0.012, brass).name = 'Guest closet flush pocket pull';
  // Edge pull remains exposed on the trailing edge when both face pulls tuck away.
  box(closetPocket, closetOpening.pocket.leafWidth / 2 - 0.005, 3, 0, 0.01, 0.3, 0.08, brass).name = 'Guest closet flush retractable edge pull concept';
  const closetTrack = furnishing('Guest closet pocket track framing concept', closetOpening.pocket.x, closetOpening.z);
  box(closetTrack, (closetOpening.x + closetOpening.width - closetOpening.pocket.x) / 2, 8.15, 0, closetOpening.x + closetOpening.width - closetOpening.pocket.x, 0.1, 0.12, steel).name = 'Guest closet pocket overhead track';
  const guestCoats = furnishing('Guest coat closet', 9.65, guestEntry.coatCloset.z + guestEntry.coatCloset.d / 2);
  guestCoats.scale.z = -1;
  guestCoats.userData = { purpose: 'Guest coats, separate from powder room', nominalWidthInches: 61.2, nominalDepthInches: 28.8, clearDepthInches: 24.6, doorWidthInches: 48, doorHeightInches: guestEntry.closetDoor.height * 12, provisional: true };
  box(guestCoats, 0, 6.5, 0, 4.65, 0.1, 1.95, cabinetFinish).name = 'Guest coat closet upper shelf';
  const guestCoatRail = cylinder(guestCoats, 0, 5.65, 0, 0.045, 4.4, brass);
  guestCoatRail.rotation.z = Math.PI / 2;
  guestCoatRail.name = 'Guest coat hanging rail';
  for (const x of [-1.5, -0.5, 0.5, 1.5]) {
    box(guestCoats, x, 3.8, 0, 0.65, 3.2, 1.45, x < 0 ? linen : cream, true).name = 'Guest hanging coat';
  }
  for (const side of [-1, 1]) {
    const width = guestEntry.closetDoor.width / 2 - 0.04;
    const hinge = new THREE.Group();
    hinge.name = 'Guest coat closet French door hinge';
    hinge.position.set(guestEntry.closetDoor.x + (side < 0 ? 0 : guestEntry.closetDoor.width) - 9.65, guestEntry.closetDoor.height / 2, guestCoats.position.z - guestEntry.closetDoor.z);
    hinge.userData = { interactiveHouseDoor: { operation: 'hinged', openAngleDegrees: 0, maxAngleDegrees: 90, openRotationSign: side } };
    guestCoats.add(hinge);
    const door = singlePanelDoor(hinge, -side * width / 2, 0, 0, width, guestEntry.closetDoor.height - 0.04, 0.13, windowTrim);
    door.name = 'Guest coat closet solid Shaker French door leaf';
    cabinetPull(door, -side * 0.8, 3.5 - guestEntry.closetDoor.height / 2, 0.09, 0.65);
  }

  const powderDoor = furnishing('Powder room inward-opening door', guestEntry.powderDoor.x, guestEntry.powderDoor.z);
  powderDoor.userData = { nominalWidthInches: 30, heightInches: guestEntry.powderDoor.height * 12, openAngleDegrees: 90, inwardSwing: true, hinge: 'North jamb', provisional: true };
  const powderLeaf = new THREE.Group();
  powderLeaf.position.set(0, 4, 0);
  powderLeaf.rotation.y = -Math.PI / 2;
  powderLeaf.userData = { interactiveHouseDoor: { operation: 'hinged', openAngleDegrees: 90, maxAngleDegrees: 180, openRotationSign: -1 } };
  powderDoor.add(powderLeaf);
  singlePanelDoor(powderLeaf, 0, 0, 1.25, 2.46, guestEntry.powderDoor.height - 0.04, 0.13, windowTrim, Math.PI / 2).name = 'Powder painted-white door leaf';
  for (const side of [-1, 1]) box(powderLeaf, side * 0.14, -1, 2.2, 0.16, 0.15, 0.15, brass, true).name = 'Powder door satin-gold knob';

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

  function vanity(name, x, z, width, rotation = 0, basinCount = 1, mirrorWidth = width * 0.82) {
    const unit = furnishing(name, x, z, rotation);
    const drawerWidth = 1;
    const doorWidth = width - drawerWidth;
    const dividerX = width / 2 - drawerWidth;
    const panel = 0.75 / 12;
    unit.userData = { widthInches: width * 12, depthInches: 18, basinCount, basinCenterSpacingInches: 0, cabinetDoors: 2, openBayWidthInches: (doorWidth - 1.5 * panel) * 12, finish: 'Natural white oak Shaker with satin-gold bar pulls', drawers: 3, drawerBankSide: 'Right facing sink', drawerBankWidthInches: drawerWidth * 12, drawerTravelInches: 15, provisional: true, productFitVerified: false, plumbingVerified: false };
    for (const center of [-width / 2 + panel / 2, dividerX, width / 2 - panel / 2]) {
      const divider = center === dividerX;
      box(unit, center, divider ? 1.35 : 1.5, 0, panel, divider ? 2.1 : 2.4, 1.5, cabinetFinish).name = 'Guest vanity side or divider';
    }
    box(unit, 0, 1.5, -0.75 + panel / 2, width - 2 * panel, 2.4, panel, cabinetFinish).name = 'Guest vanity back';
    // Continuous floor and recessed toe kick; removable bin rests above the floor.
    box(unit, 0, 0.32, 0, width - 2 * panel, panel, 1.5 - 2 * panel, cabinetFinish).name = 'Guest vanity cabinet floor';
    box(unit, 0, 0.15, -0.08, width - 2 * panel, 0.3, 1.3, cabinetFinish).name = 'Guest vanity recessed plinth';
    const bayCenter = (-width / 2 + panel + dividerX - panel / 2) / 2;
    // Four stone sections leave a real rectangular undermount opening.
    const bowlWidth = 14 / 12, bowlDepth = 10 / 12;
    for (const side of [-1, 1]) {
      const edge = side * (width + 0.06) / 2;
      const bowlEdge = side * bowlWidth / 2;
      box(unit, (edge + bowlEdge) / 2, 2.77, 0, Math.abs(edge - bowlEdge), 0.14, 1.55, guestVanityStone).name = 'Guest vanity countertop side';
      box(unit, 0, 2.77, side * (1.55 + bowlDepth) / 4, bowlWidth, 0.14, (1.55 - bowlDepth) / 2, guestVanityStone).name = 'Guest vanity countertop edge';
    }
    box(unit, 0, 2.6475, 0.75, width - 0.04, 0.105, 0.08, cabinetRailFinish).name = 'Guest vanity upper apron';
    for (const side of [-1, 1]) {
      // Inset hinge axes keep the open right leaf clear of closed drawer fronts.
      const leafWidth = (doorWidth - 0.14) / 2;
      const front = shakerFront(unit, bayCenter + side * (leafWidth / 2 + 0.01), 1.5, 0.79, leafWidth, 2.19);
      front.name = 'Guest vanity left cabinet door';
      front.userData.hingeSide = side;
      cabinetPull(front, -side * (leafWidth / 2 - 0.14), 0.55, 0.09, 0.4, true);
    }
    const basket = new THREE.Group();
    basket.name = 'Guest removable hollow wastebasket';
    basket.position.set(bayCenter, 0.32 + panel / 2, 0.15);
    unit.add(basket);
    const binWidth = 10 / 12, binHeight = 14 / 12, binWall = 0.025;
    box(basket, 0, binWall / 2, 0, binWidth, binWall, binWidth, oak).name = 'Guest wastebasket bottom';
    for (const side of [-1, 1]) {
      box(basket, side * (binWidth - binWall) / 2, binHeight / 2, 0, binWall, binHeight, binWidth, oak).name = 'Guest wastebasket side';
      box(basket, 0, binHeight / 2, side * (binWidth - binWall) / 2, binWidth - 2 * binWall, binHeight, binWall, oak).name = 'Guest wastebasket end';
    }
    // Schematic rear/high trap and supplies; no plumbing through the removable bin.
    cylinder(unit, 0, 2.4, -0.25, 0.045, 0.5, steel).name = 'Guest vanity waste tailpiece';
    box(unit, 0, 2.14, -0.43, 0.09, 0.09, 0.45, steel).name = 'Guest vanity rear trap allowance';
    for (const side of [-1, 1]) cylinder(unit, side * 0.15, 2.32, -0.6, 0.025, 0.45, brass).name = 'Guest vanity rear supply';
    const drawerBoxWidth = drawerWidth - 0.25;
    for (let row = 0; row < 3; row++) {
      const drawer = new THREE.Group();
      drawer.name = `Guest vanity right pull-out drawer ${row + 1}`;
      drawer.position.set((width - drawerWidth) / 2, 0.75 + row * 0.75, 0);
      drawer.userData = { side: 'Right facing sink', travelFeet: 1.25, shownClosed: true, hardwareSelected: false };
      unit.add(drawer);
      const front = shakerFront(drawer, 0, 0, 0.79, drawerWidth - 0.04, 0.69);
      front.name = 'Guest vanity drawer Shaker front';
      cabinetPull(front, 0, 0.04, 0.09, 0.4);
      box(drawer, 0, -0.255, 0.075, drawerBoxWidth, 0.04, 1.25, oak).name = 'Guest vanity drawer bottom';
      // The top box is shallow below the centered bowl; front and full travel remain.
      const boxHeight = row === 2 ? 0.16 : 0.55;
      const boxY = row === 2 ? -0.155 : 0;
      for (const edge of [-1, 1]) {
        box(drawer, edge * (drawerBoxWidth - 0.04) / 2, boxY, 0.075, 0.04, boxHeight, 1.25, oak).name = 'Guest vanity drawer side';
        box(drawer, 0, boxY, 0.075 + edge * 0.605, drawerBoxWidth - 0.08, boxHeight, 0.04, oak).name = 'Guest vanity drawer end';
      }
    }
    const centers = [0];
    for (const [index, center] of centers.entries()) {
      const bowl = new THREE.Group();
      bowl.name = `${name} basin ${index + 1}`;
      bowl.position.set(center, 0, 0);
      unit.add(bowl);
      box(bowl, 0, 2.48, 0, bowlWidth, 0.06, bowlDepth, porcelain).name = 'Guest undermount basin bottom';
      for (const side of [-1, 1]) {
        box(bowl, side * (bowlWidth + 0.04) / 2, 2.59, 0, 0.04, 0.22, bowlDepth + 0.08, porcelain).name = 'Guest undermount basin side';
        box(bowl, 0, 2.59, side * (bowlDepth + 0.04) / 2, bowlWidth, 0.22, 0.04, porcelain).name = 'Guest undermount basin end';
      }
      cylinder(unit, center, 3.1, -0.55, 0.04, 0.65, brass).name = `${name} faucet riser ${index + 1}`;
      box(unit, center, 3.4, -0.4, 0.08, 0.08, 0.35, brass).name = `${name} faucet spout ${index + 1}`;
      box(unit, 0, 5.1, -0.72, mirrorWidth, 2.3, 0.06, steel, true).name = `${name} mirror ${index + 1}`;
    }
    cylinder(unit, 0.92, 3.04, 0.06, 0.1041667, 0.4, porcelain).name = 'Guest vanity soap bottle';
    cylinder(unit, 0.92, 3.28, 0.06, 0.035, 0.08, brass).name = 'Guest vanity soap pump neck';
    box(unit, 0.92, 3.32, 0.13, 0.06, 0.04, 0.2, brass).name = 'Guest vanity soap pump';
    return unit;
  }
  const powderStone = mat('#d8cdbb', 0.9);
  const powderBasin = mat('#d9ded8', 0.35);
  const powderGlow = new THREE.MeshStandardMaterial({ color: '#fff1d7', emissive: '#ffe0a3', emissiveIntensity: 0.45, roughness: 0.6 });
  toilet('Powder toilet', guestEntry.toilet.x, guestEntry.toilet.z, guestEntry.toilet.rotation);
  const powderVanity = furnishing('Powder vanity', guestEntry.vanity.x, guestEntry.vanity.z, guestEntry.vanity.rotation);
  powderVanity.userData = { widthInches: guestEntry.vanity.width * 12, depthInches: guestEntry.vanity.depth * 12, counterHeightInches: 34, sinkBayWidthInches: 22, drawerBankWidthInches: 10, drawerBankSide: 'Both', drawers: 6, drawerTravelInches: 15, plumbingZone: { minX: -0.8, maxX: 0.8, minZ: -0.8, maxZ: 0.4 }, finish: 'Natural white oak Shaker with satin-gold knobs', provisional: true, occupiedClearancesVerified: false, plumbingVerified: false, closeDrawersBeforeEntryDoorSwing: true };
  const powderSinkX = 0;
  const powderSinkBayWidth = 22 / 12;
  const powderDrawerWidth = (guestEntry.vanity.width - powderSinkBayWidth) / 2;
  const powderDrawerBoxWidth = powderDrawerWidth - 0.25;
  const powderPanel = 0.75 / 12;
  for (const x of [-guestEntry.vanity.width / 2 + powderPanel / 2, -powderSinkBayWidth / 2, powderSinkBayWidth / 2, guestEntry.vanity.width / 2 - powderPanel / 2]) {
    box(powderVanity, x, 1.425, 0, powderPanel, 2.55, guestEntry.vanity.depth, cabinetFinish).name = 'Powder vanity side or divider';
  }
  box(powderVanity, 0, 1.425, -guestEntry.vanity.depth / 2 + powderPanel / 2, guestEntry.vanity.width - 2 * powderPanel, 2.55, powderPanel, cabinetFinish).name = 'Powder vanity back';
  box(powderVanity, 0, 0.35, 0, guestEntry.vanity.width - 2 * powderPanel, powderPanel, guestEntry.vanity.depth - 2 * powderPanel, cabinetFinish).name = 'Powder vanity cabinet floor';
  box(powderVanity, 0, 0.15, -0.08, guestEntry.vanity.width - 0.2, 0.3, 1.5, cabinetFinish).name = 'Powder vanity recessed plinth';
  for (const side of [-1, 1]) {
    const doorWidth = powderSinkBayWidth / 2;
    const powderSinkDoor = shakerFront(powderVanity, side * doorWidth / 2, 1.425, 0.915, doorWidth - 0.04, 2.46);
    powderSinkDoor.name = 'Powder plumbing-access Shaker door';
    powderSinkDoor.userData.hingeSide = side;
    const knob = cylinder(powderSinkDoor, -side * (doorWidth / 2 - 0.15), 0.925, 0.1, 0.055, 0.1, brass);
    knob.name = 'Powder sink-door gold knob';
    knob.rotation.x = Math.PI / 2;
  }
  for (const side of [-1, 1]) for (let row = 0; row < 3; row++) {
    const drawer = new THREE.Group();
    drawer.name = `Powder vanity drawer ${side < 0 ? row + 1 : row + 4}`;
    drawer.position.set(side * (powderSinkBayWidth + powderDrawerWidth) / 2, 0.75 + row * 0.75, 0);
    drawer.userData = { side: side < 0 ? 'Left' : 'Right', travelFeet: 1.25, shownClosed: true, hardwareSelected: false };
    powderVanity.add(drawer);
    const front = shakerFront(drawer, 0, 0, 0.915, powderDrawerWidth - 0.04, 0.69);
    front.name = 'Powder drawer Shaker front';
    const knob = cylinder(front, 0, 0.12, 0.1, 0.055, 0.1, brass);
    knob.name = 'Powder drawer gold knob';
    knob.rotation.x = Math.PI / 2;
    box(drawer, 0, -0.255, 0.135, powderDrawerBoxWidth, 0.04, 1.25, oak).name = 'Powder drawer bottom';
    for (const edge of [-1, 1]) {
      box(drawer, edge * (powderDrawerBoxWidth - 0.04) / 2, 0, 0.135, 0.04, 0.55, 1.25, oak).name = 'Powder drawer side';
      box(drawer, 0, 0, 0.135 + edge * 0.605, powderDrawerBoxWidth - 0.08, 0.55, 0.04, oak).name = 'Powder drawer end';
    }
  }
  const powderCounterWidth = guestEntry.vanity.width + 0.06;
  const powderCounterDepth = guestEntry.vanity.depth + 0.05;
  for (const [start, end] of [[-powderCounterWidth / 2, powderSinkX - 0.725], [powderSinkX + 0.725, powderCounterWidth / 2]]) {
    box(powderVanity, (start + end) / 2, 2.77, 0, end - start, 0.14, powderCounterDepth, countertop).name = 'Powder counter beside basin opening';
  }
  for (const [start, end] of [[-powderCounterDepth / 2, 0.03 - 0.425], [0.03 + 0.425, powderCounterDepth / 2]]) {
    box(powderVanity, powderSinkX, 2.77, (start + end) / 2, 1.45, 0.14, end - start, countertop).name = 'Powder counter ahead or behind basin opening';
  }
  box(powderVanity, powderSinkX, 2.36, 0.03, 1.45, 0.04, 0.85, powderBasin, true).name = 'Powder inset basin interior';
  for (const side of [-1, 1]) {
    box(powderVanity, powderSinkX + side * 0.76, 2.86, 0.03, 0.09, 0.08, 1, porcelain).name = 'Powder basin side rim';
    box(powderVanity, powderSinkX, 2.86, 0.03 + side * 0.455, 1.45, 0.08, 0.09, porcelain).name = 'Powder basin end rim';
    box(powderVanity, powderSinkX + side * 0.705, 2.6, 0.03, 0.04, 0.48, 0.85, porcelain).name = 'Powder basin side wall';
    box(powderVanity, powderSinkX, 2.6, 0.03 + side * 0.405, 1.37, 0.48, 0.04, porcelain).name = 'Powder basin end wall';
  }
  cylinder(powderVanity, powderSinkX, 3.08, -0.58, 0.04, 0.52, brass).name = 'Powder brass faucet stem';
  box(powderVanity, powderSinkX, 3.32, -0.43, 0.08, 0.08, 0.35, brass).name = 'Powder brass faucet spout';
  box(powderVanity, 0, 3.03, -0.89, guestEntry.vanity.width + 0.06, 0.4, 0.07, countertop).name = 'Powder low stone backsplash';
  const powderMirrorFrame = cylinder(powderVanity, powderSinkX, 5.2, -0.925, 1.04, 0.045, brass);
  powderMirrorFrame.rotation.x = Math.PI / 2;
  powderMirrorFrame.name = 'Powder round brass mirror frame';
  const powderMirror = cylinder(powderVanity, powderSinkX, 5.2, -0.89, 0.98, 0.035, steel);
  powderMirror.rotation.x = Math.PI / 2;
  powderMirror.name = 'Powder round mirror glass';
  for (const side of [-1, 1]) {
    box(powderVanity, powderSinkX + side * 1.4, 5.2, -0.91, 0.18, 0.6, 0.06, brass).name = 'Powder sconce backplate';
    box(powderVanity, powderSinkX + side * 1.4, 5.2, -0.75, 0.08, 0.08, 0.3, brass).name = 'Powder sconce arm';
    cylinder(powderVanity, powderSinkX + side * 1.4, 5.25, -0.59, 0.13, 0.8, powderGlow).name = 'Powder warm opal sconce';
  }
  box(powderVanity, 0, 0.11, 0.98, 3.2, 0.045, 0.04, powderGlow).name = 'Powder low-level night-light concept';
  const powderTowel = furnishing('Powder wall-mounted hand towel', guestEntry.powder.w - 0.175, officeNorthZ - 2.15);
  powderTowel.userData = { wall: 'East, beside vanity and south of entry casing', hookHeightInches: 48, towelSizeInches: [16, 28], foldedWidthInches: 8, provisional: true };
  box(powderTowel, -0.035, 4, 0, 0.06, 0.2, 0.14, brass).name = 'Powder towel hook backplate';
  box(powderTowel, -0.15, 4, 0, 0.22, 0.045, 0.045, brass).name = 'Powder towel hook arm';
  cylinder(powderTowel, -0.25, 4.04, 0, 0.035, 0.14, brass).name = 'Powder towel hook upturned tip';
  box(powderTowel, -0.27, 3.3, 0, 0.035, 1.3, 8 / 12, linen, true).name = 'Powder hanging hand towel';
  box(powderTowel, -0.29, 2.68, 0, 0.045, 0.08, 8 / 12, linen).name = 'Powder hand towel hem';
  cylinder(powderVanity, -1.25, 3.02, -0.3, 0.1, 0.35, porcelain).name = 'Powder soap dispenser';
  box(powderVanity, -1.25, 3.23, -0.25, 0.06, 0.07, 0.2, brass).name = 'Powder soap pump';
  const powderPaper = furnishing('Powder toilet paper holder', 0.4, guestEntry.toilet.z - 0.6);
  box(powderPaper, 0, 2, 0, 0.4, 0.08, 0.08, brass).name = 'Powder paper holder arm';
  const powderRoll = cylinder(powderPaper, 0.15, 2, 0, 0.16, 0.36, porcelain);
  powderRoll.rotation.x = Math.PI / 2;
  powderRoll.name = 'Powder toilet paper roll';
  for (const [index, window] of guestEntry.windows.entries()) {
    windowFrame(`Powder privacy window ${index + 1}`, window.x + 0.1, window.z, window.width, window.height, window.sill, -Math.PI / 2, rest, -1, { privacyLowerHalf: window.privacyLowerHalf, standardSizeCode: window.standardSizeCode });
  }
  tiledFloor('Guest bathroom tile', guestSuite.bathroom.x, guestSuite.bathroom.z, guestSuite.bathroom.w, guestSuite.bathroom.d);
  const guestVanity = vanity('Guest bathroom vanity', guestSuite.vanity.x, guestSuite.vanity.z, guestSuite.vanity.width, guestSuite.vanity.rotation, guestSuite.vanity.basinCount, guestSuite.vanity.mirrorWidth);
  guestVanity.userData.mirrorWidthInches = guestSuite.vanity.mirrorWidth * 12;
  // Separate service/scribe infill, not an enlarged nonstandard cabinet.
  box(guestVanity, 0, 2.77, -0.825, guestSuite.vanity.width + 0.06, 0.14, 0.1, guestVanityStone).name = 'Guest vanity rear counter scribe';
  box(guestVanity, 0, 5.1, -0.8125, guestSuite.vanity.mirrorWidth, 2.3, 0.125, oak).name = 'Guest vanity mirror mounting pack';
  for (const side of [-1, 1]) {
    box(guestVanity, side * 1.45, 5.1, -0.8125, 0.18, 0.6, 0.125, oak).name = 'Guest vanity sconce mounting pack';
    box(guestVanity, side * 1.45, 5.1, -0.72, 0.18, 0.6, 0.06, brass).name = 'Guest bathroom warm sconce backplate';
    box(guestVanity, side * 1.45, 5.1, -0.56, 0.08, 0.08, 0.28, brass).name = 'Guest bathroom warm sconce arm';
    const diffuser = cylinder(guestVanity, side * 1.45, 5.1, -0.39, 0.12, 0.65, powderGlow);
    diffuser.name = 'Guest bathroom warm opal vanity sconce';
    diffuser.userData = { colorTemperatureKelvin: 2700, provisional: true };
    const light = new THREE.PointLight('#ffd3a0', 8, 5, 2);
    light.name = 'Guest bathroom warm vanity light';
    light.position.set(side * 1.45, 5.1, -0.35);
    guestVanity.add(light);
  }
  const guestNightLight = furnishing('Guest bathroom independent night-light concept', guestSuite.vanity.x, guestSuite.vanity.z, guestSuite.vanity.rotation);
  box(guestNightLight, 0, 0.15, 0.9, 2.5, 0.05, 0.04, powderGlow).name = 'Guest bathroom warm low-level night light';
  const guestTowel = furnishing('Guest bathroom wall-mounted towel hook', guestSuite.bathroom.x + 0.3, guestSuite.toilet.z - 0.5, Math.PI);
  guestTowel.userData = { wall: 'West, beside the shower approach', hookHeightInches: 48, towelSizeInches: [16, 28], provisional: true };
  box(guestTowel, 0.035, 4, 0, 0.06, 0.2, 0.14, brass).name = 'Guest bathroom towel hook backplate';
  box(guestTowel, -0.08, 4, 0, 0.22, 0.045, 0.045, brass).name = 'Guest bathroom towel hook arm';
  cylinder(guestTowel, -0.18, 4.04, 0, 0.035, 0.14, brass).name = 'Guest bathroom towel hook upturned tip';
  box(guestTowel, -0.2, 3.3, 0, 0.035, 1.3, 16 / 12, linen, true).name = 'Guest bathroom hanging towel';
  box(guestTowel, -0.22, 2.68, 0, 0.045, 0.08, 16 / 12, linen).name = 'Guest bathroom towel hem';
  toilet('Guest bathroom toilet', guestSuite.toilet.x, guestSuite.toilet.z, guestSuite.toilet.rotation);
  const showerLayout = guestSuite.shower;
  const guestShower = furnishing('Guest bathroom shower', showerLayout.x, showerLayout.z, showerLayout.rotation);
  guestShower.userData = { clearWidthInches: showerLayout.clearWidth * 12, clearDepthInches: showerLayout.clearDepth * 12, doorOpeningInches: showerLayout.doorWidth * 12, provisional: true };
  box(guestShower, showerLayout.w / 2, 0.1, showerLayout.d / 2, showerLayout.w, 0.2, showerLayout.d, porcelain).name = 'Guest shower pan';
  for (const x of [0.05, showerLayout.w - 0.05]) box(guestShower, x, 0.22, showerLayout.d / 2, 0.1, 0.24, showerLayout.d, countertop).name = 'Guest shower side curb';
  for (const z of [0.05, showerLayout.d - 0.05]) box(guestShower, showerLayout.w / 2, 0.22, z, showerLayout.w, 0.24, 0.1, countertop).name = 'Guest shower end curb';
  const showerGlassCenterY = 0.2 + showerLayout.height / 2;
  box(guestShower, 0.05, showerGlassCenterY, showerLayout.d / 2, 0.08, showerLayout.height, showerLayout.d, cream).name = 'Guest shower west tile';
  box(guestShower, showerLayout.w / 2, showerGlassCenterY, 0.05, showerLayout.w, showerLayout.height, 0.08, cream).name = 'Guest shower north tile';
  box(guestShower, showerLayout.entryOffset / 2, showerGlassCenterY, showerLayout.d - 0.05, showerLayout.entryOffset, showerLayout.height, 0.06, glass).name = 'Guest shower fixed southwest glass';
  const showerRightStart = showerLayout.entryOffset + showerLayout.doorWidth;
  const showerRightWidth = showerLayout.w - showerRightStart;
  box(guestShower, showerRightStart + showerRightWidth / 2, showerGlassCenterY, showerLayout.d - 0.05, showerRightWidth, showerLayout.height, 0.06, glass).name = 'Guest shower fixed southeast glass';
  box(guestShower, showerLayout.w - 0.05, showerGlassCenterY, showerLayout.d / 2, 0.06, showerLayout.height, showerLayout.d, glass).name = 'Guest shower fixed east glass';
  guestShower.userData = { ...guestShower.userData, entryType: 'Open walk-in, fixed splash glass only', slidingDoor: false };
  box(guestShower, showerLayout.w / 2, 0.21, 0.65, 0.55, 0.02, 0.18, steel).name = 'Guest shower drain';
  cylinder(guestShower, 1.6, 5.8, 0.16, 0.035, 2.2, brass).name = 'Guest shower riser';
  box(guestShower, 1.6, 6.85, 0.42, 0.07, 0.07, 0.6, brass).name = 'Guest shower head arm';
  box(guestShower, 1.6, 6.8, 0.65, 0.6, 0.06, 0.6, brass).name = 'Guest shower rain head';
  box(guestShower, 2.85, 3.5, 0.16, 0.18, 0.35, 0.12, brass).name = 'Guest shower mixer control';

  const frontDoor = furnishing('Double front entry', 15.6, groundFrontWallZ);
  frontDoor.userData = { heightInches: 96, lockBrand: 'Wyze', lockModel: null, activeLeafHandingVerified: false, hardwareCompatibilityVerified: false };
  const frontEntryLeaves = buildArchedFrontEntry(THREE, { box, wood: mat('#c99f6b'), field: mat('#b88e5a'), oakMaps: masonryMaps.oak, trim: windowTrim, hardware: black }, frontDoor);
  const activeFrontEntryLeaf = frontEntryLeaves[1];
  const entrySmartLock = new THREE.Group();
  entrySmartLock.name = 'Wyze smart-lock selection placeholder';
  entrySmartLock.position.set(-2.255, 4.15, -0.08);
  entrySmartLock.userData = { brand: 'Wyze', model: null, representation: 'Schematic interior lock body, not manufacturer geometry', leafSide: 'Positive x, provisional active leaf', finishVerified: false, dimensionsVerified: false };
  activeFrontEntryLeaf.add(entrySmartLock);
  box(entrySmartLock, 0, 0, -0.06, 0.28, 0.55, 0.12, black, true).name = 'Schematic smart-lock interior housing';
  box(entrySmartLock, 0, -0.12, -0.14, 0.16, 0.045, 0.05, steel, true).name = 'Schematic smart-lock thumbturn';
  tiledFloor('Porch paving', 0, groundFrontWallZ, 31.2, groundFrontLayout.porchDepth, mat('#c9c7bc'));
  const porchCushion = mat('#a49780', 0.95);
  const porchPillow = mat('#74745b', 0.96);
  const frontPorchChairs = [];
  for (const x of [3.2, 8]) {
    const chair = furnishing('Front porch cushioned lounge chair', x, groundFrontWallZ + 1.95, 0, 0.035, true);
    frontPorchChairs.push(chair);
    chair.userData = { widthFeet: 2.6, depthFeet: 2.65, seatHeightFeet: 1.5, backHeightFeet: 2.75, outdoorProductSelected: false };
    for (const side of [-1, 1]) {
      for (const z of [-1.05, 1.05])
        box(chair, side * 1.14, 0.66, z, 0.16, 1.32, 0.16, oak, true).name = 'Porch chair timber leg';
      box(chair, side * 1.2, 1.98, 0, 0.2, 0.16, 2.65, oak, true).name = 'Porch chair timber arm';
      box(chair, side * 1.14, 1.1, 0, 0.14, 0.2, 2.35, oak).name = 'Porch chair side rail';
    }
    box(chair, 0, 1.18, 0, 2.3, 0.16, 2.4, oak).name = 'Porch chair seat support';
    box(chair, 0, 1.39, 0.04, 2.18, 0.22, 2.35, porchCushion, true).name = 'Porch chair outdoor seat cushion';
    box(chair, 0, 2, -1.12, 2.3, 1.5, 0.15, oak, true).name = 'Porch chair timber back';
    const back = box(chair, 0, 2.12, -0.93, 2.15, 1.22, 0.32, porchCushion, true);
    back.name = 'Porch chair outdoor back cushion';
    back.rotation.x = -0.08;
    box(chair, 0, 1.83, -0.64, 1.3, 0.55, 0.26, porchPillow, true).name = 'Porch chair olive lumbar pillow';
  }
  const frontPorchTable = furnishing('Front porch small table between chairs', 5.6, groundFrontWallZ + 1.95, 0, 0.035, true);
  box(frontPorchTable, 0, 1.65, 0, 1.5, 0.12, 1.5, oak, true).name = 'Porch side-table top';
  for (const x of [-0.57, 0.57]) for (const z of [-0.57, 0.57])
    box(frontPorchTable, x, 0.795, z, 0.12, 1.59, 0.12, oak).name = 'Porch side-table leg';
  windowFrame('Office side window', 0.1, 49, 4, 5, 3, -Math.PI / 2, rest, -1);
  const officeFront = getGroundFrontWindows()[0];
  windowFrame(officeFront.name, officeFront.center, groundFrontWallZ, officeFront.width, officeFront.height, officeFront.sill, 0, rest, -1, { frontGrid: true });
  const guestFront = getGroundFrontWindows()[1];
  windowFrame(guestFront.name, guestFront.center, groundFrontWallZ, guestFront.width, guestFront.height, guestFront.sill, 0, rest, -1, { frontGrid: true });

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
  function groupViewerFurniture(parent, name) {
    const root = new THREE.Group();
    root.name = name;
    const contents = new THREE.Group();
    contents.name = `${name} items`;
    root.add(contents);
    parent.add(root);
    for (const object of [...parent.children]) {
      if (object !== root && object.userData.viewerFurniture) {
        parent.remove(object);
        contents.add(object);
      }
    }
    return { root, contents };
  }
  const groundFurnitureLayer = groupViewerFurniture(scene, 'Ground-floor furniture visibility group');
  const roomFurnitureLayer = groupViewerFurniture(rest, 'Room furniture visibility group');
  const groundModelRoots = scene.children.filter((object) => !object.isLight);
  const originalGroundRoots = [...groundModelRoots];
  const originalGroundDimensions = [...document.querySelectorAll('#room-dimension-summary li')].map((item) => item.cloneNode(true));
  const groundBaseline = getGroundFloorDefaultPlan();
  let groundLayoutPreview = null;
  function updateLivableArea() {
    const groundArea = getLivableFloorArea(groundLayoutPreview?.plan ?? groundBaseline, { includeStairs: true });
    const upstairsArea = getLivableFloorArea({ floors: [...upstairs.plan.floors, upstairs.baseline.arrival] });
    const format = (area) => Math.round(area).toLocaleString('en-US');
    const output = document.getElementById('livable-area');
    output.textContent = `Area: ~${format(groundArea + upstairsArea)} sq ft`;
    output.title = `Ground floor: ~${format(groundArea)} sq ft; upstairs: ~${format(upstairsArea)} sq ft. Combined modeled interior plan area; overlaps counted once. Includes closets, halls, bathrooms and laundry. Stair footprint counted once on the first floor; upstairs arrival landing included, open stair void excluded. Excludes garage, porch and mechanical space. Not certified living area; wall thickness and headroom eligibility are not verified.`;
    const firstFloorOutput = document.getElementById('first-floor-area');
    firstFloorOutput.textContent = `1st: ~${format(groundArea)} sq ft`;
    firstFloorOutput.title = output.title;
    const secondFloorOutput = document.getElementById('second-floor-area');
    secondFloorOutput.textContent = `2nd: ~${format(upstairsArea)} sq ft`;
    secondFloorOutput.title = output.title;
    const openings = new Set(windowInstallations.map(window => window.openingId)).size;
    const units = windowInstallations.reduce((total, window) => total + window.units, 0);
    const pictures = windowInstallations.reduce((total, window) => total + (window.pictureUnits ?? (window.picture ? window.units : 0)), 0);
    const singleHung = windowInstallations.filter(window => window.singleHung).reduce((total, window) => total + window.units, 0);
    const roofWindows = windowInstallations.filter(window => window.roofWindow).reduce((total, window) => total + window.units, 0);
    const windowOutput = document.getElementById('window-count');
    windowOutput.textContent = `Windows: ${units}`;
    windowOutput.title = `Whole house, both floors including garage: ${openings} openings containing ${units} individual units (${units - pictures - singleHung - roofWindows} casements, ${singleHung} single-hung, ${pictures} fixed pictures, ${roofWindows} fixed roof windows). A joined bank counts as one opening and each section as one unit. Includes hidden windows; excludes door glazing and duplicate exterior representations. Modeled count, not an approved order schedule.`;
  }
  const roomDimensionsInput = document.getElementById('show-room-dimensions');
  const planDimensionLabels = document.getElementById('plan-dimension-labels');
  const planDimensionsPanel = document.getElementById('plan-dimensions');
  let dimensionRooms = [];
  function planRoomName(name) {
    const shortNames = {
      'Primary bedroom': 'Primary', 'Primary bath': 'P. bath',
      'Primary toilet': 'P. WC', 'Primary closet': 'P. closet',
      'Shared bath west': 'Bath W', 'Shared bath east': 'Bath E',
      'Living room': 'Living', 'Dining room': 'Dining', 'Prep kitchen': 'Prep',
      'Mudroom': 'Mud', 'Kids room': 'Kids', 'Kids room extension': 'Kids ext.',
      'Powder room': 'Powder', 'Guest coat closet': 'Coats',
      'Guest entry alcove': 'Guest entry', 'Entry hall': 'Entry',
      'Guest room': 'Guest', 'Front porch': 'Porch', 'Mechanical': 'Mech.'
    };
    const clean = name.replace(' (relocated)', '');
    return shortNames[clean] ?? clean.replace(/^Bedroom (\d+) bath$/, 'Bath $1')
      .replace(/^Bedroom (\d+) closet$/, 'Closet $1').replace(/^Bedroom /, 'Bed ');
  }
  function updatePlanDimensions() {
    const planView = currentView === 'top' || currentView === 'upstairs-top';
    const visible = planView && roomDimensionsInput.checked;
    roomDimensionsInput.disabled = !planView;
    planDimensionLabels.hidden = planDimensionsPanel.hidden = !visible;
    if (!visible) return;
    const rooms = activeFloor === 'upstairs' ? upstairs.rooms : (groundLayoutPreview?.plan ?? groundBaseline).rooms;
    if (rooms === dimensionRooms) return;
    dimensionRooms = rooms;
    planDimensionLabels.replaceChildren();
    const list = document.getElementById('plan-dimension-list');
    list.replaceChildren();
    for (const room of rooms) {
      const kidsShape = activeFloor === 'ground' && room.name === 'Kids room';
      const kidsArea = kidsShape ? groundBaseline.floors.filter(({ room }) => /^Kids room/.test(room ?? '')).reduce((sum, { w, d }) => sum + w * d, 0) : 0;
      const clear = activeFloor === 'upstairs' ? getUpstairsRoomClearDimensions(room, upstairs.plan.walls) : room;
      const maxExtent = activeFloor === 'ground' && room.name === 'Garage';
      const dimensions = kidsShape ? `${kidsArea.toFixed(2)} sq ft, stepped plan; west edge to z37.2, east edge to z33.6` : `${feet(clear.w)} x ${feet(clear.d)}${activeFloor === 'upstairs' ? ' paint-face' : ''}${maxExtent ? ' max extents; L-shaped footprint' : ''}`;
      const label = document.createElement('div');
      label.className = 'plan-dimension-label';
      label.title = `${room.name}: ${dimensions}`;
      const name = document.createElement('strong');
      name.textContent = planRoomName(room.name);
      const size = document.createElement('span');
      size.textContent = kidsShape ? `${kidsArea.toFixed(2)} sq ft`
        : `${feet(clear.w)} x ${feet(clear.d)}${maxExtent ? ' max' : ''}`.replace(/' /g, "'").replace(/'0"/g, "'");
      label.append(name, size);
      planDimensionLabels.append(label);
      const item = document.createElement('li');
      item.textContent = `${room.name}: ~ ${dimensions}`;
      list.append(item);
    }
  }
  function positionPlanDimensions() {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (planDimensionLabels.hidden) return;
    dimensionRooms.forEach((room, index) => {
      const center = new THREE.Vector3(room.x + room.w / 2, activeFloor === 'upstairs' ? stairFloorToFloor : 0, room.z + room.d / 2).project(camera);
      const roomWidth = room.w * width / (camera.right - camera.left) * camera.zoom;
      const roomDepth = room.d * height / (camera.top - camera.bottom) * camera.zoom;
      const label = planDimensionLabels.children[index];
      label.style.left = `${(center.x + 1) * width / 2}px`;
      label.style.top = `${(1 - center.y) * height / 2}px`;
      const characters = Math.max(...Array.from(label.children, (part) => part.textContent.length));
      label.style.fontSize = `${Math.max(1, Math.min(10, (roomWidth - 4) / (characters * 0.65), (roomDepth - 2) / 2.3))}px`;
    });
  }
  roomDimensionsInput.addEventListener('change', () => {
    updatePlanDimensions();
    const url = new URL(window.location.href);
    if (roomDimensionsInput.checked) url.searchParams.set('dimensions', '1');
    else url.searchParams.set('dimensions', '0');
    url.searchParams.set('view', currentView);
    window.history.replaceState(null, '', url);
    render();
  });
  function furnishKitchenStorage() {
    const ceramic = porcelain;
    const bowlCeramic = porcelain.clone();
    bowlCeramic.side = THREE.DoubleSide;
    const binGray = mat('#555f60', 0.8);
    const recycleBlue = mat('#547c83', 0.8);
    const cookingMetal = steel.clone();
    cookingMetal.side = THREE.DoubleSide;
    const drinkingGlass = pantryGlass.clone();
    drinkingGlass.side = THREE.DoubleSide;
    function contents(parent, name, x, y, z) {
      const item = new THREE.Group();
      item.name = name;
      item.position.set(x, y, z);
      item.userData = { kitchenStorageContents: true, representativeInventory: true, productSelected: false };
      parent.add(item);
      return item;
    }
    function rim(parent, x, y, z, radius, material, tube = 0.015) {
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 32), material);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(x, y, z);
      mesh.name = 'Storage item rolled rim';
      parent.add(mesh);
    }
    function vessel(parent, name, x, y, z, radius, height, material, bottomRadius = radius) {
      const item = contents(parent, name, x, y, z);
      cylinder(item, 0, 0.015, 0, bottomRadius, 0.03, material).name = 'Storage vessel bottom';
      const sides = new THREE.Mesh(new THREE.CylinderGeometry(radius, bottomRadius, height, 32, 1, true), material);
      sides.position.y = height / 2;
      sides.name = 'Open storage vessel sides';
      item.add(sides);
      rim(item, 0, height, 0, radius, material);
      return item;
    }
    function plates(parent, x, z, radius = 0.43, count = 6) {
      const stack = contents(parent, 'Stack of dinner plates', x, 0, z);
      stack.userData.quantity = count;
      stack.userData.diameterInches = radius * 24;
      for (let level = 0; level < count; level++) {
        cylinder(stack, 0, 0.02 + level * 0.04, 0, radius, 0.025, ceramic).name = 'Stored dinner plate';
        rim(stack, 0, 0.03 + level * 0.04, 0, radius - 0.025, ceramic, 0.012);
      }
    }
    function utensils(parent, width, cooking) {
      const tray = contents(parent, cooking ? 'Cooking utensil organizer' : 'Cutlery organizer', 0, 0, 0);
      const lanes = 3;
      for (let lane = 0; lane < lanes; lane++) {
        const x = (lane - 1) * width / 3;
        box(tray, x, 0.018, 0, width / 3 - 0.025, 0.035, 1.12, cabinetRailFinish).name = 'Removable utensil tray floor';
        for (const side of [-1, 1]) box(tray, x + side * (width / 6 - 0.025), 0.065, 0, 0.025, 0.1, 1.12, cabinetFinish).name = 'Utensil tray divider';
        const quantity = cooking ? 2 : 4;
        for (let index = 0; index < quantity; index++) {
          const utensil = contents(tray, cooking ? ['Wooden cooking spoon', 'Spatula', 'Serving spoon'][lane] : ['Fork', 'Spoon', 'Table knife'][lane],
            x + (index - (quantity - 1) / 2) * Math.min(0.09, width / 15), 0.075, 0);
          const material = cooking && lane === 0 ? cabinetRailFinish : steel;
          box(utensil, 0, 0, 0.13, 0.025, 0.02, cooking ? 0.65 : 0.45, material).name = 'Utensil handle';
          if (lane === 0 && !cooking) {
            for (const dx of [-0.03, -0.01, 0.01, 0.03]) box(utensil, dx, 0, -0.21, 0.012, 0.018, 0.15, steel).name = 'Fork tine';
          } else {
            box(utensil, 0, 0, cooking ? -0.28 : -0.18, lane === 2 && !cooking ? 0.035 : 0.1, 0.025, 0.2, material, true).name = 'Utensil head';
          }
        }
      }
    }
    function storedCookware(parent, name, setNumber, diameter, height, x = 0, y = 0, z = -0.15, longHandle = true) {
      const radius = diameter / 24;
      const item = vessel(parent, name, x, y, z, radius, height / 12, cookingMetal, radius * (longHandle ? 0.7 : 0.98));
      Object.assign(item.userData, { inventoryCategory: 'Cookware vessel', setNumber, quantity: 1,
        diameterInches: diameter, heightInches: height, handleLengthInches: longHandle ? 5.5 : 1.44 });
      if (longHandle) {
        box(item, 0, height / 12 - 0.04, radius + 5.5 / 24, 0.07, 0.05, 5.5 / 12, black, true).name = 'Cookware long handle';
      } else {
        for (const side of [-1, 1]) box(item, side * (radius + 0.06), height / 12 - 0.14, 0,
          0.12, 0.06, 0.2, black).name = 'Cookware side handle';
      }
      return item;
    }
    function cookware(parent, width, bank, row) {
      if (row === 1 && bank !== 0) {
        const setNumber = bank < 0 ? 1 : 2;
        storedCookware(parent, 'Stored frying pan', setNumber, 10, 2);
        storedCookware(parent, 'Stored frying pan', setNumber, 8, 1.75, 0, 1.25 / 12);
      } else if (row === 1) {
        for (const setNumber of [1, 2])
          storedCookware(parent, 'Stored saute pan', setNumber, 10, 3, 0, (setNumber - 1) * 2 / 12);
      } else if (bank !== 1) {
        const setNumber = bank < 0 ? 1 : 2;
        storedCookware(parent, 'Stored saucepan', setNumber, 8, 5.5);
        storedCookware(parent, 'Stored saucepan', setNumber, 6.5, 4, 0, 2.5 / 12);
      } else {
        for (const setNumber of [1, 2]) for (const [level, diameter] of [11, 10, 8, 6.5].entries()) {
          const lid = contents(parent, 'Stored cookware lid', (setNumber === 1 ? -1 : 1) * width / 4, level * 0.1, 0);
          Object.assign(lid.userData, { inventoryCategory: 'Cookware lid', setNumber, quantity: 1, diameterInches: diameter });
          cylinder(lid, 0, 0.03, 0, diameter / 24, 0.035, cookingMetal).name = 'Cookware lid disk';
          box(lid, 0, 0.08, 0, 0.2, 0.04, 0.045, black).name = 'Cookware lid grip';
        }
      }
    }
    function drainBaskets(parent) {
      for (const [index, diameter] of [12, 10].entries()) {
        const radius = diameter / 24, bottomRadius = radius * 0.6;
        const height = (index ? 4 : 4.5) / 12;
        const basket = contents(parent, 'Nested drain basket', 0, index * 1.3 / 12 + 0.01, 0);
        Object.assign(basket.userData, { inventoryCategory: 'Drain basket', quantity: 1,
          diameterInches: diameter, heightInches: height * 12, dryBeforeStorage: true });
        for (let ring = 0; ring <= 6; ring++)
          rim(basket, 0, height * ring / 6, 0, bottomRadius + (radius - bottomRadius) * ring / 6, steel, 0.008);
        for (let spoke = 0; spoke < 12; spoke++) {
          const angle = spoke * Math.PI / 6;
          const rib = box(basket, Math.cos(angle) * (radius + bottomRadius) / 2, height / 2,
            Math.sin(angle) * (radius + bottomRadius) / 2, 0.012, Math.hypot(height, radius - bottomRadius), 0.012, steel);
          rib.name = 'Drain basket wire rib';
          rib.rotation.set(0, -angle, -Math.atan((radius - bottomRadius) / height));
        }
        for (const side of [-1, 1])
          box(basket, side * (radius + 0.05), height - 0.03, 0, 0.1, 0.04, 0.16, steel).name = 'Drain basket lifting handle';
        for (const offset of [-0.16, 0, 0.16]) {
          const span = 2 * Math.sqrt(bottomRadius ** 2 - offset ** 2);
          box(basket, offset, 0, 0, 0.012, 0.012, span, steel).name = 'Drain basket base wire';
          box(basket, 0, 0, offset, span, 0.012, 0.012, steel).name = 'Drain basket base wire';
        }
      }
    }
    function foodContainerSet(parent) {
      const set = contents(parent, 'Twelve-container food storage set', 0, 0, 0.065);
      for (const [index, [width, depth, height]] of [[9, 7, 3.5], [7.5, 5.5, 3], [6, 4.5, 2.5]].entries()) {
        const x = (index === 1 ? 5.5 : -5.5) / 12;
        const z = (index === 2 ? 3.75 : -3.75) / 12;
        for (let level = 0; level < 4; level++) {
          const container = contents(set, 'Nested food storage container', x, level * 0.65 / 12 + 0.003, z);
          Object.assign(container.userData, { inventoryCategory: 'Food container', quantity: 1,
            size: ['large', 'medium', 'small'][index], envelopeInches: [width, height, depth] });
          const shell = new THREE.Mesh(new THREE.CylinderGeometry(1, 0.75, height / 12, 4, 1, true, Math.PI / 4), drinkingGlass);
          shell.scale.set(width / (12 * Math.SQRT2), 1, depth / (12 * Math.SQRT2));
          shell.position.y = height / 24;
          shell.name = 'Tapered food container shell';
          container.add(shell);
          box(container, 0, 0.002, 0, width * 0.75 / 12, 0.004, depth * 0.75 / 12, drinkingGlass).name = 'Food container base';
          const lid = contents(set, 'Matching food container lid', 5.5 / 12, (index * 4 + level) * 0.12 / 12 + 0.004, 3.75 / 12);
          Object.assign(lid.userData, { inventoryCategory: 'Food container lid', quantity: 1, size: container.userData.size });
          box(lid, 0, 0, 0, (width + 0.1) / 12, 0.08 / 12, (depth + 0.1) / 12, recycleBlue, true).name = 'Separate matching container lid';
        }
      }
    }
    const drawers = [];
    const islandDishSizes = [
      { size: 'Small', plateDiameter: 7, bowlDiameter: 4.5 },
      { size: 'Medium', plateDiameter: 9, bowlDiameter: 6 },
      { size: 'Large', plateDiameter: 10.5, bowlDiameter: 8 }
    ];
    for (const root of [kitchen, prep, prepExtension]) root.traverse((part) => {
      if (part.userData.kitchenDrawerRow !== undefined) drawers.push(part);
    });
    for (const front of drawers) {
      const row = front.userData.kitchenDrawerRow;
      const width = front.userData.width - 0.28;
      const item = contents(front, 'Kitchen drawer inventory', 0, front.userData.drawerFloorY !== undefined ? front.userData.drawerFloorY + 0.02 : -0.18, -0.8);
      let inCooktop = false;
      let inIsland = false;
      let inPrep = false;
      for (let parent = front.parent; parent; parent = parent.parent) {
        inCooktop ||= parent === cooktopCabinetry;
        inIsland ||= parent === island;
        inPrep ||= parent === prep || parent === prepExtension;
      }
      const inMainSink = !inCooktop && !inIsland && !inPrep;
      const cookingOffset = inCooktop ? front.parent.position.z - cooktopCenterZ : 0;
      const cookingBank = Math.abs(cookingOffset) < 0.01 ? 0 : Math.sign(cookingOffset);
      const islandBankIndex = inIsland ? Math.round((front.parent.position.z - 18.5) / (islandCabinetLength / 3)) + 1 : -1;
      const dishSize = inIsland ? islandDishSizes[islandBankIndex] : null;
      const cuttingBoardDrawer = inCooktop && row === 2 && front.parent.position.z < cooktopCenterZ - 1.5;
      const role = cuttingBoardDrawer ? 'Removable cutting-board pull-out' : row === 2 ? (inCooktop ? 'Cooking utensils' : 'Cutlery and serving utensils')
        : inCooktop ? (row === 1 ? (cookingBank === 0 ? 'Two saute pans' : `Set ${cookingBank < 0 ? 1 : 2} frying pans`)
          : cookingBank === 1 ? 'Eight cookware lids' : `Set ${cookingBank < 0 ? 1 : 2} saucepans`)
          : inMainSink ? (row === 1 ? 'Two nested drain baskets' : 'Twelve food containers and twelve matching lids')
          : inIsland ? `${dishSize.size} ${row === 1 ? 'plates' : 'bowls'}: 10` : row === 1 ? 'Prep bowls' : 'Food containers';
      front.userData.storageRole = role;
      item.userData.storageRole = role;
      if (cuttingBoardDrawer) {
        front.name = 'Cooking-area cutting-board pull-out drawer';
        const board = contents(item, 'Removable horizontal cutting board', 0, 0.75 / 24, 0);
        board.userData = { ...board.userData, widthInches: 22, depthInches: 14, thicknessInches: 0.75, removable: true, foodSafeFinishRequired: true, useOnCountertop: true, loadedSlideApprovalRequired: true };
        box(board, 0, 0, 0, 22 / 12, 0.75 / 12, 14 / 12, cabinetRailFinish, true).name = 'Cutting-board solid wood slab';
        for (const x of [-10.2 / 12, 10.2 / 12]) {
          box(board, x, 0.75 / 24 + 0.001, 0, 0.045, 0.004, 3 / 12, black, true).name = 'Cutting-board recessed finger-grip indication';
        }
      } else if (row === 2) utensils(item, width, inCooktop);
      else if (inCooktop) cookware(item, width, cookingBank, row);
      else if (inMainSink && row === 1) drainBaskets(item);
      else if (inMainSink && row === 0) foodContainerSet(item);
      else if (inIsland && row === 1) {
        item.userData.dishCategory = `${dishSize.size.toLowerCase()} plates`;
        item.userData.quantity = 10;
        for (const side of [-1, 1]) plates(item, side * width / 4, 0, dishSize.plateDiameter / 24, 5);
      } else if (inIsland && row === 0) {
        item.userData.dishCategory = `${dishSize.size.toLowerCase()} bowls`;
        item.userData.quantity = 10;
        for (const side of [-1, 1]) for (let level = 0; level < 5; level++) {
          const radius = dishSize.bowlDiameter / 24;
          const bowl = contents(item, `${dishSize.size} nested bowl`, side * width / 4, level * 0.07, 0);
          bowl.userData = { ...bowl.userData, dishCategory: item.userData.dishCategory, quantity: 1, diameterInches: dishSize.bowlDiameter };
          cylinder(bowl, 0, 0.01, 0, radius * 0.5, 0.02, ceramic).name = 'Nested bowl foot';
          const shell = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.5, 0.22, 32, 1, true), ceramic);
          shell.position.y = 0.12;
          shell.name = 'Tapered nesting bowl shell';
          bowl.add(shell);
          rim(bowl, 0, 0.23, 0, radius, ceramic, 0.008);
        }
      } else if (row === 0 && !inIsland) {
        for (const side of [-1, 1]) {
          const container = contents(item, 'Food storage container and lid', side * width / 4, 0, 0);
          const size = Math.min(0.6, width / 2 - 0.1);
          box(container, 0, 0.15, 0, size, 0.3, 0.7, ceramic, true).name = 'Reusable food container';
          box(container, 0, 0.31, 0, size + 0.02, 0.03, 0.72, recycleBlue).name = 'Food container lid';
        }
      } else {
        for (const side of [-1, 1]) for (let level = 0; level < 3; level++) {
          vessel(item, 'Stacked prep or cereal bowl', side * width / 4, level * 0.21, 0, Math.min(0.34, width / 4 - 0.06), 0.18, ceramic);
        }
      }
    }
    const narrowFronts = [];
    cooktopCabinetry.traverse((part) => { if (part.userData.narrowStorageRole) narrowFronts.push(part); });
    for (const front of narrowFronts) {
      const item = contents(front, 'Narrow cooking pull-out inventory', 0, front.userData.drawerFloorY + 0.02, -0.875);
      item.userData.storageRole = front.userData.narrowStorageRole;
      if (front.userData.narrowStorageRole === 'Spices') {
        for (const y of [0, 0.65, 1.3]) {
          box(item, 0, y + 0.02, 0, 0.25, 0.04, 1.5, cabinetRailFinish).name = 'Narrow spice shelf';
          for (const z of [-0.5, 0, 0.5]) {
            const jar = vessel(item, 'Stored spice jar', 0, y + 0.04, z, 0.085, 0.25, drinkingGlass);
            cylinder(jar, 0, 0.26, 0, 0.09, 0.035, black).name = 'Spice jar lid';
            cylinder(jar, 0, 0.1, 0, 0.07, 0.17, mat(z < 0 ? '#9c7650' : '#a69a65')).name = 'Spice contents';
          }
          for (const side of [-1, 1]) box(item, side * 0.115, y + 0.12, 0, 0.02, 0.03, 1.5, brass).name = 'Spice shelf retaining rail';
        }
        for (const x of [-0.115, 0.115]) box(item, x, 0.7, -0.73, 0.02, 1.4, 0.04, cabinetFinish).name = 'Spice carrier upright';
      } else {
        for (const x of [-0.1, 0.1]) box(item, x, 0.3, 0, 0.025, 0.6, 1.5, cabinetFinish).name = 'Narrow board slot divider';
        box(item, -0.045, 0.75, 0, 0.035, 1.5, 1.3, cabinetRailFinish).name = 'Narrow stored cutting board';
        box(item, 0.045, 0.6, 0, 0.025, 1.2, 1.4, steel).name = 'Narrow stored baking tray';
      }
    }
    const bins = contents(trashFront, 'Separate trash and recycling bins', 0, -0.93, 0);
    for (const [name, z, material] of [['Trash bin', -0.44, binGray], ['Recycling bin', -1.23, recycleBlue]]) {
      const bin = contents(bins, name, 0, 0, z);
      bin.userData.envelopeInches = [13.2, 8.4, 19.8];
      box(bin, 0, 0.025, 0, 1.1, 0.05, 0.7, material).name = 'Removable bin bottom';
      for (const side of [-1, 1]) {
        box(bin, side * 0.53, 0.825, 0, 0.04, 1.65, 0.7, material).name = 'Removable bin side';
        box(bin, 0, 0.825, side * 0.33, 1.02, 1.65, 0.04, material).name = 'Removable bin end';
      }
      if (name === 'Trash bin') {
        for (const side of [-1, 1]) box(bin, side * 0.51, 1.59, 0, 0.025, 0.12, 0.62, cream).name = 'Trash liner folded over rim';
      } else {
        box(bin, -0.18, 0.16, 0, 0.35, 0.2, 0.35, cabinetRailFinish).name = 'Sample clean recycling carton';
      }
    }
    for (const upper of cooktopUppers.children) {
      const width = upper.userData.widthInches / 12 - 0.16;
      const seasoningBay = upper.name === 'Cooktop mudroom-side upper stack';
      for (const [y, tierFloor, category] of [[4.6125, true, 'mugs'], [5.55, false, 'drinking cups'], [6.6, false, null], [7.6125, true, null]]) {
        if (!tierFloor) box(upper, 0, y, 0, width, 0.0625, 0.84, cabinetRailFinish).name = 'Kitchen upper adjustable shelf';
        const shelf = contents(upper, 'Kitchen upper shelf inventory', 0, y + (tierFloor ? 0 : 0.03125), 0);
        if (!category) {
          shelf.userData.spare = true;
          continue;
        }
        if (seasoningBay) {
          const daily = tierFloor;
          shelf.userData.storageRole = daily ? 'Daily seasoning turntables' : 'Rarely used spices';
          shelf.userData.quantity = daily ? 14 : 8;
          const spiceNames = daily
            ? ['Salt', 'Pepper', 'Paprika', 'Cumin', 'Oregano', 'Garlic', 'Chilli']
            : ['Allspice', 'Cloves', 'Cardamom', 'Nutmeg', 'Fennel', 'Anise', 'Sumac', 'Fenugreek'];
          const spiceJar = (parent, name, x, z, baseY, index) => {
            const jar = vessel(parent, 'Stored seasoning jar', x, baseY, z, 0.085, 0.25, drinkingGlass);
            jar.userData = { ...jar.userData, label: name, frequency: daily ? 'Daily' : 'Rare', heightInches: 3.33 };
            cylinder(jar, 0, 0.26, 0, 0.09, 0.035, black).name = 'Spice jar lid';
            cylinder(jar, 0, 0.11, 0, 0.07, 0.18, mat(['#a35c35', '#8e8248', '#c69962', '#67553b'][index % 4])).name = 'Spice contents';
            box(jar, 0, 0.14, 0.085, 0.11, 0.09, 0.008, cream).name = `${name} spice label`;
          };
          if (daily) {
            const diameter = 26 / 30.48;
            const height = 4 / 30.48;
            const trayFinish = mat('#eeeae1', 0.4);
            trayFinish.metalness = 0.65;
            trayFinish.side = THREE.DoubleSide;
            for (const side of [-1, 1]) {
              const tray = contents(shelf, 'IKEA VARIERA metal seasoning turntable', side * 0.49, 0, 0.025);
              tray.userData = { ...tray.userData, removable: true, productSelected: true, articleNumber: '105.361.57', diameterCm: 26, heightCm: 4, rotationEnvelopeRadiusFeet: diameter / 2, material: 'Powder-coated galvanized steel tray; plastic base', maxLoadKg: 5 };
              cylinder(tray, 0, 0.0175, 0, diameter / 2 - 0.04, 0.035, black).name = 'Turntable rotating base';
              const deckY = 0.045;
              cylinder(tray, 0, deckY - 0.005, 0, diameter / 2, 0.01, trayFinish).name = 'Metal turntable deck';
              const wall = new THREE.Mesh(new THREE.CylinderGeometry(diameter / 2 - 0.006, diameter / 2 - 0.006, height - deckY - 0.006, 64, 1, true), trayFinish);
              wall.position.y = (height + deckY) / 2 - 0.003;
              wall.name = 'Metal turntable raised edge';
              tray.add(wall);
              rim(tray, 0, height - 0.006, 0, diameter / 2 - 0.006, trayFinish, 0.006);
              spiceJar(tray, spiceNames[0], 0, 0, deckY, 0);
              for (let index = 0; index < 6; index++) {
                const angle = index * Math.PI / 3;
                spiceJar(tray, spiceNames[index + 1], Math.cos(angle) * 0.27, Math.sin(angle) * 0.27, deckY, index + 1);
              }
            }
          } else {
            for (let index = 0; index < spiceNames.length; index++) {
              spiceJar(shelf, spiceNames[index], (index % 4 - 1.5) * 0.4, index < 4 ? -0.2 : 0.2, 0, index);
            }
          }
          continue;
        }
        const mugs = category === 'mugs';
        shelf.userData.dishCategory = category;
        shelf.userData.quantity = 5;
        const spacing = Math.min(width / 3, width / 2 - 0.31);
        for (const [x, z] of [[-spacing, -0.21], [0, -0.21], [spacing, -0.21], [-spacing / 2, 0.21], [spacing / 2, 0.21]]) {
          const cup = vessel(shelf, mugs ? 'Stored mug' : 'Stored drinking glass', x, 0, z, 0.13, mugs ? 0.32 : 0.45, mugs ? ceramic : drinkingGlass);
          if (mugs) {
            const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 8, 24), ceramic);
            handle.position.set(0.17, 0.18, 0);
            handle.name = 'Mug handle';
            cup.add(handle);
          }
        }
      }
    }
    const towerFloor = 0.4;
    box(refrigerationPantry, 0, towerFloor - 0.03125, 25.65, pantryWidth - 0.15, 0.0625, 1.85, cabinetRailFinish).name = 'Oven tower lower storage floor';
    const towerGoods = contents(refrigerationPantry, 'Large cookware below steam oven', 0, towerFloor, 25.65);
    towerGoods.userData.storageRole = 'Two stockpots below steam oven';
    for (const setNumber of [1, 2])
      storedCookware(towerGoods, 'Large stockpot', setNumber, 11, 9.5, (setNumber === 1 ? -1 : 1) * 0.61, 0, 0, false);
    for (const [x, width] of [[42.15, 2.5], [44.65, 2.5], [51.4, 2]]) {
      const shelf = contents(prep, 'Prep cupboard mixing and serving storage', x, 0.42, prepCounterZ);
      box(shelf, 0, -0.03125, 0, width - 0.15, 0.0625, 1.8, cabinetRailFinish).name = 'Prep cupboard storage shelf';
      if (x === 44.65) {
        shelf.userData.storageRole = 'Six nested mixing bowls beside prep sink';
        for (const side of [-1, 1]) for (const [level, diameter] of [12, 10, 8].entries()) {
          const bowl = vessel(shelf, 'Nested mixing bowl', side * 0.58, level / 12 + 0.01, 0,
            diameter / 24, (6 - level) / 12, cookingMetal, diameter / 48);
          Object.assign(bowl.userData, { inventoryCategory: 'Mixing bowl', quantity: 1, diameterInches: diameter });
        }
      } else if (x === 51.4) {
        shelf.userData.storageRole = 'Ten water bottles beside prep sink';
        box(shelf, 0, 0.78 - 0.03125, 0, width - 0.15, 0.0625, 1.8, cabinetRailFinish).name = 'Water bottle rack support shelf';
        const rack = contents(shelf, 'Removable ten-bottle rack', 0, 0.78, 0.2);
        rack.userData.capacity = 10;
        box(rack, 0, 0.02, 0, 21 / 12, 0.04, 11 / 12, cabinetRailFinish).name = 'Bottle rack removable base';
        for (const side of [-1, 1])
          box(rack, side * 10.375 / 12, 0.12, 0, 0.25 / 12, 0.2, 11 / 12, cabinetRailFinish).name = 'Bottle rack side rail';
        for (let row = 0; row < 2; row++) for (let column = 0; column < 5; column++) {
          const bottle = contents(rack, 'Stored reusable water bottle', (column - 2) * 4 / 12, 0.04, (row - 0.5) * 5 / 12);
          Object.assign(bottle.userData, { inventoryCategory: 'Water bottle', quantity: 1,
            diameterInches: 3.25, heightInches: 10.5, dryBeforeStorage: true });
          cylinder(bottle, 0, 8.5 / 24, 0, 3.25 / 24, 8.5 / 12, column % 2 ? cookingMetal : recycleBlue).name = 'Water bottle body';
          cylinder(bottle, 0, 9 / 12, 0, 1.7 / 24, 1 / 12, cookingMetal).name = 'Water bottle neck';
          cylinder(bottle, 0, 10 / 12, 0, 2 / 24, 1 / 12, black).name = 'Water bottle cap';
        }
      } else {
        shelf.userData.storageRole = 'Serving platters with spare lower space';
        box(shelf, 0, 1.1, 0, width - 0.15, 0.0625, 1.8, cabinetRailFinish).name = 'Prep cupboard adjustable shelf';
        const dish = contents(shelf, 'Serving platter stack', 0, 1.14, 0);
        for (let level = 0; level < 3; level++) box(dish, 0, 0.03 + level * 0.05, 0, 1.3, 0.04, 0.85, ceramic, true).name = 'Stored serving platter';
      }
    }
  }

  function buildKitchenLighting() {
    const group = new THREE.Group();
    group.name = 'Kitchen layered lighting';
    group.userData = { recessedCount: 4, apertureInches: 4, colorTemperatureKelvin: 3000, dimmableDesignIntent: true, photometryVerified: false, glareVerified: false };
    scene.add(group);
    const ceilingFixtures = new THREE.Group();
    ceilingFixtures.name = 'Four regressed kitchen ceiling fixtures';
    group.add(ceilingFixtures);
    const lights = [];
    function spot(parent, name, position, target, intensity, distance, angle) {
      const lamp = new THREE.SpotLight('#ffe0b3', 0, distance, angle, 1, 2);
      lamp.name = name;
      lamp.position.set(...position);
      lamp.target.position.set(...target);
      lamp.userData = { nightIntensity: intensity, conceptualFixture: true, photometryVerified: false };
      parent.add(lamp, lamp.target);
      lights.push(lamp);
      return lamp;
    }
    for (const upper of cooktopUppers.children) {
      spot(upper, 'Kitchen under-cabinet task beam', [0, cooktopUpperBottom - 0.04, 0.35], [0, 3.06, 1], 9, 4, Math.PI / 4);
    }
    spot(cooktopHood, 'Cooktop hood task beam', [36.65, hoodBottom - 0.08, cooktopCenterZ], [36.5, 3.1, cooktopCenterZ], 12, 5, Math.PI / 4);
    for (const z of [kitchenCenterZ - 2.25, kitchenCenterZ + 2.25]) {
      cylinder(islandPendants, 30.65, 7.565, z, 0.5, 0.02, kitchenTaskDiffuser).name = 'Island pendant recessed diffuser';
      spot(islandPendants, 'Island pendant task beam', [30.65, 7.54, z], [30.65, 3.06, z], 22, 8, Math.PI / 5);
    }
    const baffleFinish = black.clone();
    baffleFinish.side = THREE.DoubleSide;
    const downlights = [
      { x: 32, z: 10.5, target: [32, 0.2, 10.5] },
      { x: 33.8, z: 13.8, target: [33.8, 0.2, 13.8] },
      { x: 33.8, z: 20.1, target: [33.8, 0.2, 20.1] },
      { x: 32, z: 23.2, target: [32, 0.2, 23.2] }
    ];
    for (const [index, { x, z, target }] of downlights.entries()) {
      const fixture = new THREE.Group();
      fixture.name = `Kitchen recessed ceiling light ${index + 1}`;
      fixture.position.set(x, ceilingHeight, z);
      fixture.userData = { apertureInches: 4, regressedLensInches: 1.32, dimmable: true, productSelected: false };
      ceilingFixtures.add(fixture);
      const trim = new THREE.Mesh(new THREE.TorusGeometry(0.188, 0.025, 8, 32), windowTrim);
      trim.name = 'Recessed light small white trim';
      trim.rotation.x = Math.PI / 2;
      trim.position.y = -0.005;
      fixture.add(trim);
      const baffle = new THREE.Mesh(new THREE.CylinderGeometry(2 / 12, 2 / 12, 0.125, 24, 1, true), baffleFinish);
      baffle.name = 'Recessed light dark shielding baffle';
      baffle.position.y = 0.0625;
      fixture.add(baffle);
      cylinder(fixture, 0, 0.11, 0, 0.14, 0.0125, kitchenTaskDiffuser).name = 'Regressed ceiling diffuser';
      spot(group, `Kitchen ceiling beam ${index + 1}`, [x, ceilingHeight - 0.04, z], target, 14, 14, Math.PI / 3);
    }
    const pictureLight = new THREE.Group();
    pictureLight.name = 'Family message-board shielded picture light';
    pictureLight.userData = { colorTemperatureKelvin: 3000, mountingHeightInches: 85.2, glareMockupRequired: true, productSelected: false };
    familyBoard.add(pictureLight);
    for (const x of [-1.25, 1.25]) {
      box(pictureLight, x, 7.1, 0.06, 0.18, 0.24, 0.08, brass).name = 'Board light mounting plate';
      box(pictureLight, x, 7.1, 0.305, 0.045, 0.045, 0.49, brass).name = 'Board light support arm';
    }
    box(pictureLight, 0, 7.1, 0.55, 3.75, 0.08, 0.16, brass, true).name = 'Shielded board-light housing';
    box(pictureLight, 0, 7.052, 0.55, 3.6, 0.015, 0.1, kitchenTaskDiffuser).name = 'Board-light underside diffuser';
    for (const x of [-1.25, 1.25]) {
      spot(pictureLight, 'Family board soft wash beam', [x, 7.03, 0.55], [x, 4.7, 0.07], 18, 8, Math.PI / 6);
    }
    return { group, ceilingFixtures, lights };
  }

  function updateKitchenLighting() {
    updatePendantVisibility();
    const ground = activeFloor === 'ground' && !groundLayoutPreview;
    const plan = currentView === 'top' || currentView === 'basement';
    const enabled = ground && !plan && nightLighting;
    kitchenPracticalLights.group.visible = ground && !plan;
    kitchenPracticalLights.ceilingFixtures.visible = !['fridge', 'cooktop', 'sink-storage'].includes(currentView);
    for (const lamp of kitchenPracticalLights.lights) {
      lamp.visible = enabled;
      lamp.intensity = enabled ? lamp.userData.nightIntensity : 0;
    }
    kitchenTaskDiffuser.emissiveIntensity = enabled ? 1.5 : 0;
    kitchenSconces.traverse((part) => {
      if (part.isLight) {
        part.visible = enabled;
        part.intensity = enabled ? 12 : 0;
      }
      if (part.name === 'Aleena ivory wall-backed half-oval fabric shade') part.material.emissiveIntensity = enabled ? 0.15 : 0;
    });
  }

  function buildHomeLighting() {
    const rigs = [];
    function fixture(parent, name, x, y, z, radius, intensity, floor, task = false) {
      const group = new THREE.Group();
      group.name = `${name} warm shielded ${task ? 'task lamp' : 'deep-regressed recessed ceiling light'}`;
      group.position.set(x, y, z);
      group.userData = { colorTemperatureKelvin: 2700, dimmable: true, photometryVerified: false, glareVerified: false, task };
      if (!task) Object.assign(group.userData, { apertureInches: 4, regressedLensInches: 2, purpose: 'Whole-room ambient only', productSelected: false });
      parent.add(group);
      const diffuser = new THREE.MeshStandardMaterial({ color: '#f4dfba', emissive: '#ffd29a', emissiveIntensity: 0, roughness: 0.9 });
      if (task) {
        cylinder(group, 0, 0, 0, radius, 0.16, cream).name = 'Opaque shielding shade';
        cylinder(group, 0, -0.135, 0, radius * 0.86, 0.015, diffuser).name = 'Recessed frosted underside';
      } else {
        const trim = new THREE.Mesh(new THREE.TorusGeometry(0.188, 0.025, 8, 32), windowTrim);
        trim.name = 'Recessed light small white trim';
        trim.rotation.x = Math.PI / 2;
        trim.position.y = -0.005;
        group.add(trim);
        const baffleFinish = black.clone();
        baffleFinish.side = THREE.DoubleSide;
        const baffle = new THREE.Mesh(new THREE.CylinderGeometry(2 / 12, 2 / 12, 2 / 12, 24, 1, true), baffleFinish);
        baffle.name = 'Deep recessed dark shielding baffle';
        baffle.position.y = 1 / 12;
        group.add(baffle);
        cylinder(group, 0, 2 / 12 + 0.0075, 0, 0.14, 0.015, diffuser).name = 'Deep-regressed frosted lens';
      }
      const lamp = new THREE.SpotLight('#ffdeb0', 0, task ? 6 : 17, Math.PI / 4, 1, 2);
      // Emit just below the aperture because the cutaway viewer has no ceiling cutouts.
      lamp.position.y = task ? -0.16 : -0.04;
      lamp.target.position.set(0, task ? -2 : -y + 0.2, 0);
      group.add(lamp, lamp.target);
      rigs.push({ group, lamp, diffuser, floor, intensity, task });
    }
    const groundRooms = getGroundFloorDefaultPlan().rooms;
    for (const room of groundRooms) {
      if (['Kitchen', 'Garage', 'Front porch', 'Guest room entry'].includes(room.name)) continue;
      const count = room.d > 14 || room.w > 16 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        fixture(scene, `${room.name} ${i + 1}`, room.x + room.w / 2, ceilingHeight, room.z + room.d * (i + 0.5) / count, 2 / 12, /closet|alcove/i.test(room.name) ? 9 : 22, 'ground');
      }
    }
    // Use actual garage floor pieces rather than its overlapping room envelope.
    for (const [x, z] of [[49.8, 21], [42, 30.5], [42, 41.5]]) fixture(scene, 'Garage', x, ceilingHeight + garageFloorY, z, 2 / 12, 30, 'ground');
    for (const room of upstairs.rooms) {
      fixture(upstairs.group, room.name, room.x + room.w / 2, upstairs.group.userData.ceilingHeightFeet, room.z + room.d / 2, 2 / 12, /closet|toilet|Linen/.test(room.name) ? 9 : 22, 'upstairs');
    }
    const upperDimensions = getUpstairsMeasuredGeometry();
    for (const [x, z] of [
      [19, (upperDimensions.loftNorth + upperDimensions.laundryNorth) / 2],
      [31, (upperDimensions.loftNorth + upperDimensions.laundryNorth) / 2],
      [17, 33], [15.5, (upperDimensions.serviceSouth + upperDimensions.bedNorth) / 2]
    ]) fixture(upstairs.group, 'Upstairs hall', x, upstairs.group.userData.ceilingHeightFeet, z, 2 / 12, 14, 'upstairs');
    fixture(piano, 'Piano music', 0, 3.6, 0.25, 0.24, 3, 'ground', true);
    box(piano, 0, 3.27, -0.45, 0.04, 0.66, 0.04, rosewood).name = 'Piano lamp support';
    return rigs;
  }

  function updateHomeLighting() {
    const plan = ['top', 'upstairs-top', 'basement'].includes(currentView);
    const inspection = ['cooktop', 'fridge', 'sink-storage', 'prep-counter', 'mudroom-storage'].includes(currentView);
    const guestEnabled = activeFloor === 'ground' && !plan && !groundLayoutPreview && nightLighting;
    for (const part of guestVanity.children) {
      if (part.name !== 'Guest bathroom warm vanity light') continue;
      part.visible = guestEnabled;
      part.intensity = guestEnabled ? 8 : 0;
    }
    powderGlow.emissiveIntensity = guestEnabled ? 0.45 : 0;
    for (const rig of homeLighting) {
      const visible = activeFloor === rig.floor && !plan && !(rig.floor === 'ground' && groundLayoutPreview);
      rig.group.visible = visible && (!inspection || rig.task);
      rig.lamp.visible = visible && nightLighting && (!inspection || rig.task);
      rig.lamp.intensity = visible && nightLighting ? rig.intensity : 0;
      rig.diffuser.emissiveIntensity = visible && nightLighting ? 0.4 : 0;
    }

  }

  function updateStairLighting() {
    const enabled = nightLighting && ['ground', 'upstairs'].includes(activeFloor) && !['top', 'upstairs-top', 'basement'].includes(currentView) && !groundLayoutPreview;
    stairStepGlow.emissiveIntensity = enabled ? 0.8 : 0;
    stairs.traverse((part) => {
      if (part.name === 'Interior stair LED tread wash') {
        part.visible = enabled;
        part.intensity = enabled ? 0.8 : 0;
      }
    });
  }

  const upstairsHelpers = { box, mat, wood, wallMaterial, windowTrim, oak, cream, black, steel, linen, windowFrame, openingCasing, singlePanelDoor };
  let upstairs = buildUpstairsModel(THREE, upstairsHelpers, stairOpening, stairFloorToFloor, savedUpstairsLayout);
  const upstairsFurniture = [];
  upstairs.group.traverse((object) => {
    if (object.userData.viewerFurniture) upstairsFurniture.push(object);
  });
  scene.add(upstairs.group);
  prepareCabinetInteractions(scene);
  furnishKitchenStorage();
  const kitchenPracticalLights = buildKitchenLighting();
  const homeLighting = buildHomeLighting();
  const exterior = buildExteriorModel(THREE, { box, mat, masonryMaps, windowInstallations }, stairFloorToFloor, garageFloorY);
  const exteriorFurniture = [];
  exterior.traverse((object) => {
    if (object.userData.viewerFurniture) exteriorFurniture.push(object);
  });
  scene.add(exterior);
  const exteriorSun = new THREE.DirectionalLight('#fff7eb', 2.5);
  exteriorSun.name = 'Exterior afternoon sun with architectural shadows';
  exteriorSun.position.set(-65, 52, 65);
  exteriorSun.target.position.set(25, 5, 25);
  exteriorSun.castShadow = true;
  exteriorSun.shadow.mapSize.set(2048, 2048);
  Object.assign(exteriorSun.shadow.camera, { left: -65, right: 65, top: 65, bottom: -65, near: 1, far: 200 });
  exteriorSun.shadow.normalBias = 0.04;
  exteriorSun.shadow.bias = -0.0001;
  exteriorSun.visible = false;
  scene.add(exteriorSun, exteriorSun.target);
  const outdoorEnvironmentGenerator = new THREE.PMREMGenerator(renderer);
  const outdoorReflection = outdoorEnvironmentGenerator.fromEquirectangular(outdoorSky);
  outdoorEnvironmentGenerator.dispose();
  exterior.traverse((part) => {
    if (part.isMesh) { part.castShadow = !part.userData.noExteriorShadow; part.receiveShadow = true; }
  });
  const exteriorLighting = [];
  const exteriorGlowMaterials = new Map();
  exterior.traverse((part) => {
    if (part.isLight) exteriorLighting.push({ lamp: part, intensity: part.intensity });
    const materials = Array.isArray(part.material) ? part.material : [part.material];
    for (const material of materials) {
      if (material?.emissiveIntensity > 0 && material.emissive?.getHex() > 0) exteriorGlowMaterials.set(material, material.emissiveIntensity);
    }
  });
  function updateExteriorLighting() {
    const enabled = nightLighting && activeFloor === 'exterior';
    for (const rig of exteriorLighting) {
      rig.lamp.visible = enabled;
      rig.lamp.intensity = enabled ? rig.intensity : 0;
    }
    for (const [material, intensity] of exteriorGlowMaterials) material.emissiveIntensity = enabled ? intensity : 0;
  }
  const floorGrid = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#2c6975', transparent: true, opacity: 0.65, depthWrite: false }));
  floorGrid.name = 'One-foot floor grid';
  floorGrid.userData = { spacingFeet: 1, tourDecoration: true };
  floorGrid.visible = false;
  scene.add(floorGrid);
  let gridAreas = null;
  function updateFloorGrid() {
    floorGridInput.disabled = activeFloor === 'exterior' || currentView === 'basement';
    floorGrid.visible = floorGridInput.checked && !floorGridInput.disabled;
    if (!floorGrid.visible) return;
    const areas = activeFloor === 'upstairs' ? upstairs.areas : groundLayoutPreview?.plan.floors ?? walkFloorAreas;
    if (areas === gridAreas) return;
    const positions = [];
    for (const area of areas) {
      const right = area.x + area.w;
      const bottom = area.z + area.d;
      // Furnished tile and grout rise above the structural floor datum.
      const y = (area.elevation ?? 0) + (activeFloor === 'ground' && !groundLayoutPreview ? 0.05 : 0.025);
      for (let x = Math.ceil(area.x); x <= right; x++) positions.push(x, y, area.z, x, y, bottom);
      for (let z = Math.ceil(area.z); z <= bottom; z++) positions.push(area.x, y, z, right, y, z);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    floorGrid.geometry.dispose();
    floorGrid.geometry = geometry;
    gridAreas = areas;
  }
  const groundVisibility = new Map();
  function floorAreas() {
    return activeFloor === 'upstairs' ? upstairs.areas : walkFloorAreas;
  }
  function selectFloor(floor) {
    if (floor === activeFloor) return;
    if (floor !== 'ground') {
      if (activeFloor === 'ground') {
        groundVisibility.clear();
        for (const object of groundModelRoots) {
          groundVisibility.set(object, object.visible);
          object.visible = false;
        }
      }
      stairs.visible = floor === 'upstairs';
      for (const part of upstairsStairParts) part.visible = true;
      basementStairs.visible = false;
    } else {
      for (const [object, visible] of groundVisibility) object.visible = visible;
      basementStairs.visible = true;
    }
    activeFloor = floor;
    document.getElementById('ground-room-views').hidden = floor !== 'ground';
    document.getElementById('upstairs-room-views').hidden = floor !== 'upstairs';
    document.getElementById('room-controls-title').hidden = floor === 'exterior';
    const groundStatus = document.getElementById('ground-preview-status');
    if (groundStatus) groundStatus.hidden = floor !== 'ground' || !groundLayoutPreview;
    upstairs.group.visible = floor === 'upstairs';
    exterior.visible = floor === 'exterior';
    for (const chair of frontPorchChairs) {
      (floor === 'exterior' ? exterior : rest).add(chair);
      chair.position.y = floor === 'exterior' ? 0 : 0.035;
    }
    tourGrid = null;
    tourMapCursor = null;
    const areas = floorAreas();
    tourMapBounds.x = Math.min(...areas.map((area) => area.x));
    tourMapBounds.z = Math.min(...areas.map((area) => area.z));
    tourMapBounds.right = Math.max(...areas.map((area) => area.x + area.w));
    tourMapBounds.bottom = Math.max(...areas.map((area) => area.z + area.d));
    tourMapScale = (tourMap.width - 24) / Math.max(tourMapBounds.right - tourMapBounds.x, tourMapBounds.bottom - tourMapBounds.z);
    viewport.setAttribute('aria-label', floor === 'exterior' ? '3D paired-gable stone and modern brick exterior study. Drag to orbit; select an elevation to view each facade.' : `3D ${floor === 'upstairs' ? 'upstairs' : 'ground floor'}. Click the floor to enter the tour. Drag to ${navigationMode === 'move' ? 'move' : 'rotate'}; scroll or pinch to zoom.`);
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
      const clear = getUpstairsRoomClearDimensions(room, upstairs.plan.walls);
      roomDimensions(`Upstairs ${room.name} (paint-face main rectangle)`, clear.w, clear.d);
      const item = document.getElementById('room-dimension-summary').lastElementChild;
      item.dataset.floor = 'upstairs';
      item.hidden = activeFloor !== 'upstairs';
    }
  }
  refreshUpstairsDimensions();
  const presets = {
    exterior: { target: [27.75, 12, 47], offset: [-18, -3, 100], span: 52 },
    'exterior-street': { target: [27.75, 12, 47], offset: [0, -6.5, 115], span: 34 },
    'exterior-threequarter': { target: [27.75, 12, 32], offset: [-80, -6.5, 115], span: 40 },
    'exterior-front': { target: [27.75, 13, 49], offset: [0, 0, 120], span: 42 },
    'exterior-entry': { target: [15.6, 5.5, 57], offset: [0, 0, 80], span: 14.5 },
    'exterior-rear': { target: [27.75, 13, 7], offset: [0, 0, -120], span: 42 },
    'exterior-west': { target: [0, 13, 29.5], offset: [-120, 0, 0], span: 46 },
    'exterior-east': { target: [55.5, 13, 29.5], offset: [120, 0, 0], span: 46 },
    'exterior-site': { target: [exterior.userData.lot.centerX, 0, (exterior.userData.lot.rear + exterior.userData.lot.front) / 2], offset: [0, 160, 0.01], span: 150 },
    'exterior-roof': { target: [27.75, 12, 31], offset: [0, 120, 0.01], span: 70 },
    'exterior-patio': { target: [6.6, 2.5, 3.7], offset: [-16, 5, -28], span: 28 },
    'exterior-firepit': { target: [-3.75, -0.5, -2.325], offset: [-12, 12, -16], span: 18 },
    'exterior-wood': { target: [57, 0.5, 26.5], offset: [18, 24, -16], span: 24 },
    'exterior-security': { target: [exterior.userData.lot.centerX, 0, (exterior.userData.lot.rear + exterior.userData.lot.front) / 2], offset: [0, 160, 0.01], span: 150 },
    upstairs: { target: [27, stairFloorToFloor + 1, 28], offset: [34, 68, 43], span: 74 },
    'upstairs-top': { target: [27, stairFloorToFloor, 28], offset: [0, 110, 0], span: 70 },
    'upstairs-arrival-gallery': { target: [22, stairFloorToFloor + 3, 29.5], offset: [-8, 11, 12], span: 25 },
    social: { target: [19, 2, 12], offset: [27, 55, 32], span: 43 },
    living: { target: [12.5, 1.5, livingCenterZ], offset: [28, 27, 7], span: 32 },
    kids: { target: [24, 1, 30.15], offset: [-12, 30, 18], span: 17 },
    dining: { target: [20.0375, 1, 3.95], offset: [16, 19, 23], span: 20 },
    kitchen: { target: [32.2, 2, kitchenCenterZ], offset: [-22, 35, 27], span: 26 },
    'sink-storage': { target: [32, 4.65, 7.8], offset: [0, 0, 12], span: 9.8 },
    cooktop: { target: [36.5, 5.3, cooktopCenterZ], offset: [-18, 0, 0], span: 11 },
    fridge: { target: [bottomRunCenterX, 5, 26.9], offset: [0, 0, -18], span: 12 },
    island: { target: [30.65 + island.position.x, 1.5, kitchenCenterZ], offset: [-12, 9, 10], span: 15 },
    whole: { target: [27, 0, 29], offset: [35, 75, 50], span: 78 },
    garage: { target: [43, 0, 33], offset: [-15, 58, 10], span: 42 },
    'garage-storage': { target: [35, 2.8, 28.1], offset: [4, 6, 11], span: 13 },
    bikes: { target: [52, 0.5, 21], offset: [-9, 22, 7], span: 15 },
    prep: { target: [44, 1, 16], offset: [-28, 44, 30], span: 28 },
    mudroom: { target: [41.55, 2, 20.9], offset: [0, 22, 20], span: 17 },
    'mudroom-cubbies': { target: [43.5, 4.4, 22.07], offset: [-4, 1, 0], span: 10.5 },
    'mudroom-storage': { target: [40.3875, 4.8, 17.9], offset: [0, 0.7, 8.35], span: 12 },
    pantry: { target: [46.75, 4.5, 14.325], offset: [0, 0.2, -2.5], span: 14 },
    'prep-counter': { target: [46.6, 4.5, prepCounterZ], offset: [0, 1.2, 2.6], span: 14 },
    powder: { target: [3.7, 1, powderNorthZ + 2.95], offset: [4, 34, 4], span: 12 },
    'guest-bathroom': { target: [28.45, 1.5, 39.4], offset: [0.2, 14, 1], span: 11 },
    'guest-closet': { target: [21, 3.7, 39], offset: [3.9, 1.9, 3.5], span: 9 },
    'guest-suite': { target: [25.1, 0, 42.8], offset: [0, 40, 0.01], span: 25 },
    private: { target: [15.6, 1, 43], offset: [32, 49, 37], span: 40 },
    basement: { target: [stairOpening.x + stairOpening.width / 2, -3, stairOpening.z + stairOpening.depth / 2], offset: [4, 30, 5], span: 21 },
    top: { target: [27, 0, 29], offset: [0, 110, 0], span: 72 }
  };
  const roomViewAliases = {
    'Living room': 'living', 'Dining room': 'dining', 'Kids room': 'kids', 'Powder room': 'powder',
    'Guest coat closet': 'guest-coats', 'Guest entry alcove': 'guest-entry', 'Closet': 'guest-closet',
    'Bathroom': 'guest-bathroom', 'Guest room': 'guest-bedroom'
  };
  const roomViewLabels = { Closet: 'Guest walk-in', Bathroom: 'Guest bathroom', 'Guest room': 'Guest bedroom' };
  const groundRooms = [
    ...getGroundFloorDefaultPlan().rooms,
    { name: 'Stairs', x: stairOpening.x, z: stairOpening.z, w: stairOpening.width, d: stairOpening.depth }
  ];
  for (const [floor, rooms] of [['ground', groundRooms], ['upstairs', upstairs.rooms]]) {
    const container = document.getElementById(`${floor}-room-views`);
    for (const room of rooms) {
      const roomName = room.name.replace(' (relocated)', '');
      const slug = roomName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const name = floor === 'upstairs' ? `upstairs-${slug}` : roomViewAliases[room.name] ?? slug;
      presets[name] ??= {
        target: [room.x + room.w / 2, (floor === 'upstairs' ? stairFloorToFloor : 0) + 1, room.z + room.d / 2],
        offset: [4, 34, 4], span: Math.max(room.w, room.d) + 5
      };
      Object.assign(presets[name], { floor, roomName });
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.view = name;
      button.dataset.floor = floor;
      button.setAttribute('aria-pressed', 'false');
      button.textContent = floor === 'ground' ? roomViewLabels[room.name] ?? roomName : roomName;
      container.append(button);
    }
  }
  viewButtons = document.querySelectorAll('[data-view]');

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
    const garageTreadLeft = garageEntry.x + (garageEntry.width - garageEntry.treadWidth) / 2;
    if (activeFloor === 'ground' && x >= garageTreadLeft && z >= garageEntry.z && z < garageEntry.z + garageEntry.thresholdDepth + garageEntry.going) {
      if (z < garageEntry.z + garageEntry.thresholdDepth) {
        if (x >= garageEntry.x && x <= garageEntry.x + garageEntry.width) return 0;
      } else if (x <= garageTreadLeft + garageEntry.treadWidth) return -garageRise;
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
      const z = garageEntry.z + garageEntry.thresholdDepth + step * garageEntry.going;
      context.beginPath();
      const stepLeft = garageEntry.x + (step ? (garageEntry.width - garageEntry.treadWidth) / 2 : 0);
      context.moveTo(mapX(stepLeft), mapZ(z));
      context.lineTo(mapX(stepLeft + (step ? garageEntry.treadWidth : garageEntry.width)), mapZ(z));
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
    requestRender();
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
      living: [14.8, 23.9, 5, 16], kids: [20.1, 30, 24, 26], dining: [23, 7, 20.0375, 3.95], kitchen: [33, 19.5, 32.25, 8],
      cooktop: [33, cooktopCenterZ, 36.5, cooktopCenterZ], fridge: [33, 23, 33, 26.9], island: [33, kitchenCenterZ, 28.65, kitchenCenterZ],
      prep: [43, 12, 48, prepCounterZ], pantry: [47, 12, 47, 14.325], 'prep-counter': [47, 12, 47, prepCounterZ],
      mudroom: [41.7, 23, 41.7, 17.5], 'mudroom-cubbies': [41.7, 23, 44.3, 23], 'mudroom-storage': [41.7, 23, 41.7, 17.5],
      private: [15.6, 46, 15.6, 41], basement: [11.5, 33, 5, 30], garage: [43, 29, 43, 38]
    };
    const [targetX, , targetZ] = presets[currentView].target;
    const [x, z, lookX, lookZ] = starts[currentView] ?? [targetX, targetZ, targetX, targetZ - 1];
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
    if (activeFloor === 'exterior') return;
    const bounds = renderer.domElement.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) return;
    tourRaycaster.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2), camera);
    const hit = tourRaycaster.intersectObjects(visiblePickTargets(), false).find(({ object }) => {
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
    if (tap && !pickPatioDoor(event) && !pickHouseDoor(event) && !pickVehicleDoor(event)) pickTourFloor(event);
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
    const showPendants = activeFloor === 'ground' && !groundLayoutPreview && currentView !== 'top' && currentView !== 'fridge' && currentView !== 'cooktop' && currentView !== 'sink-storage';
    islandPendants.visible = showPendants && islandLightsInput.checked;
  }

  function setView(name) {
    orbitInteracting = false;
    if (navigationMode === 'walk') setNavigationMode('rotate');
    if (name !== currentView) setPatioDoorOpen(false);
    const outside = name === 'exterior' || name.startsWith('exterior-');
    const floor = outside ? 'exterior' : presets[name].floor ?? (name === 'upstairs' || name === 'upstairs-top' ? 'upstairs' : 'ground');
    if (activeFloor !== 'ground' && floor !== activeFloor) selectFloor('ground');
    selectFloor(floor);
    currentView = name;
    upstairs.group.traverse((object) => {
      if (object.userData.closetCanopy) object.visible = !(name.startsWith('upstairs-') && name.includes('closet'));
    });
    const planView = name === 'top' || name === 'upstairs-top';
    document.getElementById('dining-clearance-note').hidden = name !== 'dining';
    document.getElementById('firepit-storage-note').hidden = !['exterior-patio', 'exterior-firepit', 'exterior-wood'].includes(name);
    const prepElevationView = name === 'pantry' || name === 'prep-counter';
    const mudroomInspectionView = name === 'mudroom-cubbies' || name === 'mudroom-storage';
    const mudroomInteriorView = name === 'mudroom-storage' || name === 'guest-closet';
    const sinkStorageView = name === 'sink-storage';
    const exteriorElevation = outside && !['exterior', 'exterior-street', 'exterior-threequarter', 'exterior-patio', 'exterior-firepit', 'exterior-wood'].includes(name);
    const elevationView = name === 'fridge' || name === 'cooktop' || sinkStorageView || prepElevationView || mudroomInspectionView || exteriorElevation;
    controls.minDistance = prepElevationView || mudroomInspectionView || name === 'guest-closet' ? 1 : 12;
    const streetEyeView = name === 'exterior-street' || name === 'exterior-threequarter';
    controls.maxPolarAngle = streetEyeView ? Math.PI * 0.55 : elevationView ? Math.PI / 2 : Math.PI / 2.12;
    const preset = presets[name];
    const aspect = viewport.clientWidth / viewport.clientHeight;
    const offset = new THREE.Vector3(...preset.offset);
    const portraitPadding = aspect < 1 ? 1.25 : 1;
    // Inside-room perspective shows the connected closet corner without
    // looking through or hiding its real full-height partitions.
    camera = mudroomInteriorView ? mudroomInteriorCamera : planView || name === 'cooktop' || name === 'guest-suite' || name === 'guest-closet' || sinkStorageView || prepElevationView || mudroomInspectionView || exteriorElevation ? cooktopElevationCamera : perspectiveCamera;
    controls.object = camera;
    camera.zoom = 1;
    if (camera.isOrthographicCamera) {
      const exteriorWidth = name === 'exterior-entry' ? 20 : name === 'exterior-site' || name === 'exterior-security' ? 128 : name === 'exterior-west' || name === 'exterior-east' ? 74 : 66;
      const halfHeight = sinkStorageView ? Math.max(preset.span / 2, 11.4 / (2 * aspect)) : exteriorElevation ? Math.max(preset.span / 2, exteriorWidth / (2 * aspect)) : preset.span * portraitPadding / (2 * Math.min(aspect, 1));
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
    } else {
      camera.aspect = aspect;
      if (mudroomInteriorView) {
        // Widen portrait framing without moving the camera through the garage wall.
        camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(85 / 2)) / Math.min(aspect, 1)));
      } else {
        camera.fov = streetEyeView ? 26 : 38;
        const verticalFov = THREE.MathUtils.degToRad(camera.fov);
        const minimumDistance = preset.span * portraitPadding / (2 * Math.tan(verticalFov / 2) * Math.min(aspect, 1));
        offset.setLength(Math.max(offset.length(), minimumDistance));
      }
    }
    camera.updateProjectionMatrix();
    controls.target.set(...preset.target);
    camera.position.copy(controls.target).add(offset);
    controls.update();
    const basementCutaway = name === 'basement';
    setNavigationMode(planView ? 'move' : navigationMode);
    document.querySelector('[data-navigation="rotate"]').disabled = planView;
    if (outside) {
      for (const object of groundModelRoots) object.visible = false;
      upstairs.group.visible = false;
    } else if (activeFloor === 'upstairs') {
      for (const object of groundModelRoots) object.visible = object === stairs;
      basementStairs.visible = false;
      for (const part of upstairsStairParts) part.visible = true;
    } else {
      const showWholeFloor = !['social', 'living', 'dining', 'kitchen', 'sink-storage', 'cooktop', 'island', 'fridge'].includes(name);
      shell.visible = showWholeFloor && !basementCutaway;
      piano.visible = !basementCutaway;
      stairs.visible = showWholeFloor || ['kitchen', 'fridge'].includes(name);
      for (const part of upstairsStairParts) part.visible = !basementCutaway;
      island.visible = !elevationView;
      christmasTree.visible = name !== 'cooktop' && !sinkStorageView;
      for (const part of [cooktopCabinetry, cooktop, cooktopBurners, cookingDetails]) part.visible = !sinkStorageView;
      cooktopHood.visible = name !== 'fridge' && !sinkStorageView;
      cooktopUppers.visible = name !== 'fridge' && !sinkStorageView;
      updatePendantVisibility();
      for (const accessory of [cuttingBoard, utensilCrock, seasoningTray]) accessory.visible = name !== 'cooktop';
    }
    exterior.getObjectByName('Lot plan annotations').visible = name === 'exterior-site' || name === 'exterior-security';
    exterior.getObjectByName('Security plan annotations').visible = name === 'exterior-security';
    document.getElementById('security-plan-key').hidden = name !== 'exterior-security';
    viewButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.view === name || (button.closest('.model-toolbar') && button.dataset.view === 'exterior' && outside) || (button.dataset.view === 'upstairs' && floor === 'upstairs') || (button.dataset.view === 'top' && name === 'upstairs-top')));
    });
    const exteriorLabel = name === 'exterior-security' ? 'camera directions and warm outdoor lighting plan, coverage unverified' : name === 'exterior-site' ? '75 by 130 ft lot plan, provisional setbacks' : name === 'exterior-roof' ? 'roof plan with computed ridges and valleys, structure and drainage unverified' : name === 'exterior-patio' ? 'two chairs and a small table tucked against the house wall; closed firepit in the uncovered outer patio corner, cold storage only, do not light; fence-side path join preserved; slope, access, setbacks, drainage and structural support require review' : name === 'exterior-firepit' ? 'closed firepit in uncovered patio corner, cold storage only, not an approved burn location' : name === 'exterior-wood' ? 'side-yard firewood beside waste bins, clearance review required' : exteriorElevation ? name.slice(9) + ' elevation' : 'perspective view';
    if (groundLayoutPreview && activeFloor === 'ground') {
      for (const object of originalGroundRoots) object.visible = object === stairs;
      groundLayoutPreview.group.visible = true;
      viewport.setAttribute('aria-label', 'Edited first-floor structure only. Drag to rotate or move; scroll or pinch to zoom. Tours are unavailable.');
    } else if (activeFloor === 'ground') {
      viewport.setAttribute('aria-label', `3D ground floor. Click the floor to enter the tour. Drag to ${navigationMode === 'move' ? 'move' : 'rotate'}; scroll or pinch to zoom.`);
    }
    if (planView) {
      viewport.setAttribute('aria-label', '2D floor plan. Drag to pan; scroll or pinch to zoom. Select Ground or Upstairs to return to 3D.');
    }
    renderer.domElement.setAttribute('aria-label', planView ? `2D ${activeFloor === 'upstairs' ? 'upstairs' : 'ground-floor'} orthographic furnished plan, north at top` : outside ? `3D paired-gable stone and modern brick study: ${exteriorLabel}, charcoal arched canopy, pale trim and oak doors; daylight sky and shadows are illustrative; roof and cladding construction unverified` : basementCutaway ? '3D floor plan: basement stair cutaway, surrounding shell and upstairs stairs hidden' : `3D floor plan: ${name === 'social' ? 'living, dining and kitchen' : name} view, full-height walls`);
    updateFloorGrid();
    updateLivableArea();
    updatePlanDimensions();
    document.querySelector('[data-navigation="walk"]').disabled = activeFloor === 'exterior' || Boolean(groundLayoutPreview);
    render();
  }

  viewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setView(button.dataset.view === 'top' && activeFloor === 'upstairs' ? 'upstairs-top' : button.dataset.view);
      if (button.closest('.viewer-navigation')) collapseMobileNavigation();
    });
  });
  islandLightsInput.addEventListener('change', () => {
    updatePendantVisibility();
    render();
  });
  floorGridInput.addEventListener('change', () => {
    updateFloorGrid();
    render();
  });
  resetButton.disabled = false;
  resetButton.addEventListener('click', () => {
    setView('whole');
    setNavigationMode('rotate');
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
      if (currentView === 'top' || currentView === 'upstairs-top') return;
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
    if (renderFrame !== null) cancelAnimationFrame(renderFrame);
    renderFrame = null;
    cancelAnimationFrame(walkFrame);
    clearWalkInput();
    console.error('The 3D floor plan lost its WebGL context.');
    showModelError('The 3D renderer lost its graphics connection. Reload this page to try again.');
  });
  let viewportWidth = 0, viewportHeight = 0;
  function resize() {
    if (!viewport.clientWidth || !viewport.clientHeight) return;
    const width = viewport.clientWidth, height = viewport.clientHeight;
    if (width === viewportWidth && height === viewportHeight) return;
    viewportWidth = width;
    viewportHeight = height;
    renderer.setSize(width, height);
    if (navigationMode === 'walk') {
      camera.aspect = viewport.clientWidth / viewport.clientHeight;
      camera.updateProjectionMatrix();
      render();
    } else setView(currentView);
  }
  function renderInterior() {
    if (!interiorPost) {
      const composer = new EffectComposer(renderer);
      composer.renderTarget1.samples = Math.min(4, renderer.capabilities.maxSamples);
      composer.renderTarget2.samples = composer.renderTarget1.samples;
      const beauty = new RenderPass(scene, camera);
      const occlusion = new SSAOPass(scene, camera, 1, 1, 32);
      occlusion.kernelRadius = 0.35;
      occlusion.minDistance = 0.0001;
      occlusion.maxDistance = 0.01;
      composer.addPass(beauty);
      composer.addPass(occlusion);
      composer.addPass(new OutputPass());
      interiorPost = { composer, beauty, occlusion, width: 0, height: 0 };
    }
    const { composer, beauty, occlusion } = interiorPost;
    beauty.camera = camera;
    occlusion.camera = camera;
    const perspective = camera.isPerspectiveCamera ? 1 : 0;
    if (occlusion.ssaoMaterial.defines.PERSPECTIVE_CAMERA !== perspective) {
      occlusion.ssaoMaterial.defines.PERSPECTIVE_CAMERA = perspective;
      occlusion.ssaoMaterial.needsUpdate = true;
    }
    occlusion.ssaoMaterial.uniforms.cameraNear.value = camera.near;
    occlusion.ssaoMaterial.uniforms.cameraFar.value = camera.far;
    occlusion.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(camera.projectionMatrix);
    occlusion.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);
    if (interiorPost.width !== viewport.clientWidth || interiorPost.height !== viewport.clientHeight) {
      interiorPost.width = viewport.clientWidth;
      interiorPost.height = viewport.clientHeight;
      composer.setSize(interiorPost.width, interiorPost.height);
    }
    composer.render();
  }
  function render() {
    pickTargets = null;
    if (renderFrame !== null) {
      cancelAnimationFrame(renderFrame);
      renderFrame = null;
    }
    updateKitchenLighting();
    updateHomeLighting();
    updateStairLighting();
    updateExteriorLighting();
    const mudroomLighting = activeFloor === 'ground' && currentView.startsWith('mudroom');
    const kitchenLighting = activeFloor === 'ground' && ['kitchen', 'sink-storage', 'cooktop', 'island', 'fridge', 'prep', 'prep-kitchen', 'prep-counter', 'pantry'].includes(currentView);
    const prepLighting = ['prep', 'prep-kitchen', 'prep-counter', 'pantry'].includes(currentView);
    const exteriorDaylight = activeFloor === 'exterior' && !nightLighting;
    exteriorSun.visible = exteriorDaylight;
    scene.background = exteriorDaylight ? outdoorSky : indoorBackground;
    scene.backgroundIntensity = exteriorDaylight ? 0.25 : 1;
    scene.environment = exteriorDaylight ? outdoorReflection.texture : null;
    scene.environmentIntensity = exteriorDaylight ? 0.15 : 1;
    ambientLight.intensity = exteriorDaylight ? 0.55 : nightLighting ? 0.5 : 2.5;
    studioFill.intensity = exteriorDaylight ? 0 : nightLighting ? 250 : 650;
    studioFill.visible = !exteriorDaylight;
    renderer.toneMappingExposure = exteriorDaylight ? 0.95 : nightLighting ? 0.75 : 1.25;
    mudroomKeyLight.visible = mudroomLighting;
    kitchenKeyLight.visible = kitchenLighting;
    kitchenKeyLight.position.set(prepLighting ? 40.5 : 29, 8.6, prepLighting ? 12 : 13);
    kitchenKeyLight.target.position.set(prepLighting ? 48.5 : 35, 2.5, prepLighting ? 8 : 17);
    renderer.shadowMap.enabled = mudroomLighting || exteriorDaylight;
    renderer.shadowMap.type = mudroomLighting ? THREE.VSMShadowMap : THREE.PCFSoftShadowMap;
    scene.updateMatrixWorld();
    updateVehicleDoorControls();
    positionPlanDimensions();
    updateRenderResolution();
    if ((mudroomLighting || kitchenLighting) && !orbitInteracting) renderInterior();
    else renderer.render(scene, camera);
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
    place(downloadedSofa, layout.downloadedSofa ?? null);
    place(sectional, layout.sectional ?? null);
    place(familySectional, layout.familySectional ? [0, 0, 0] : null);
    place(referenceLounge, layout.referenceLounge ? referenceLounge.userData.centerOffset : null);
    place(familyLiving, layout.familyZone ? [0, 0, 0] : null);
    if (layout.familyZone) {
      familyOttoman.position.x = layout.familySectional ? 6.0666667 : familyLiving.userData.ottoman.x;
      familyOttoman.position.z = familyLiving.userData.ottoman.z + (layout.familySectional ? 1.5 : 0);
      for (const part of familyLiving.children.filter((child) => child.name.startsWith('Family living textured side table') || child === readingLamp)) {
        part.visible = !layout.familySectional;
        part.traverse((child) => { child.userData.livingLayoutHidden = layout.familySectional; });
      }
    }
    loungeChairs.forEach((chair, index) => place(chair, layout.chairs[index]));
    livingArmchairs.forEach((chair, index) => place(chair, layout.armchairs?.[index] ?? null));
    [cornerOttoman, readingOttoman].forEach((ottoman, index) => {
      ottoman.visible = layout.id === 'centered' && loungeChairs[index].visible;
      ottoman.traverse((part) => { part.userData.livingLayoutHidden = !ottoman.visible; });
    });
    viewport.dataset.livingLayout = layout.id;
    buildWalkObstacles();
    if (showLiving) setView('living');
  }

  applyLivingLayout(livingLayouts[0], false);
  const initialParameters = new URLSearchParams(window.location.search);
  roomDimensionsInput.checked = initialParameters.get('dimensions') !== '0';
  const initialView = initialParameters.get('view');
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
    status.textContent = replacement ? 'Saved first-floor layout: structure only. Furniture, cabinetry, fixtures and tours are hidden, not coordinated. Stairs stay fixed; upstairs and exterior remain the original concepts.' : '';
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
  UpstairsLayout.resolve(groundBaseline, savedGroundLayout);
  if (savedGroundLayout.rooms.length || savedGroundLayout.walls.length) {
    previewGround(savedGroundLayout);
    if (initialView && Object.hasOwn(presets, initialView)) setView(initialView);
  }
  islandLightsInput.disabled = false;
  nightLightingInput.disabled = false;
  nightLightingInput.addEventListener('change', () => {
    if (nightLightingInput.checked && !nightLighting) daytimeIslandLights = islandLightsInput.checked;
    nightLighting = nightLightingInput.checked;
    islandLightsInput.checked = nightLighting ? true : daytimeIslandLights;
    render();
  });
  furnitureInput.disabled = false;
  furnitureInput.addEventListener('change', () => {
    const show = furnitureInput.checked;
    groundFurnitureLayer.contents.visible = show;
    roomFurnitureLayer.contents.visible = show;
    nestedFurniture.forEach((object) => { object.visible = show; });
    upstairsFurniture.forEach((object) => { object.visible = show; });
    exteriorFurniture.forEach((object) => { object.visible = show; });
    render();
  });
  navigationButtons.forEach((button) => { button.disabled = button.dataset.navigation === 'walk' && (activeFloor === 'exterior' || (activeFloor === 'ground' && Boolean(groundLayoutPreview))); });
}
