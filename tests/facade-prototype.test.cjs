'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('facade rendering study is opt-in and preserves the default exterior pipeline', () => {
  const viewer = fs.readFileSync(require.resolve('../assets/js/floor-plan-3d.js'), 'utf8');
  const exterior = fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'), 'utf8');
  assert.match(viewer, /get\('prototype'\) === 'facade'/);
  assert.match(exterior, /facadePrototype = false/);
  assert.match(exterior, /opacity: 0\.28, depthWrite: false, ior: 1\.5/);
  assert.match(exterior, /new THREE\.InstancedMesh\(geometry, prototypeBrickFinish, wallBricks\.length\)/);
  assert.match(exterior, /new THREE\.InstancedBufferAttribute\(shifts, 2\)/);
  assert.match(exterior, /jointInches: 0\.25/);
  assert.match(exterior, /entryCastStone\.normalMap = null/);
  assert.match(exterior, /part\.scale\.x \*= 0\.55/);
  assert.match(exterior, /Prototype instanced ivory clay brick faces/);
  assert.match(exterior, /new THREE\.InstancedMesh/);
  assert.match(exterior, /Prototype interior room backing/);
  assert.match(exterior, /Prototype linen curtain fold/);
  assert.match(viewer, /shadow\.mapSize\.set\(4096, 4096\)/);
  assert.match(viewer, /Math\.min\(16, renderer\.capabilities\.getMaxAnisotropy\(\)\)/);
  assert.match(viewer, /if \(\(mudroomLighting \|\| kitchenLighting\) && !orbitInteracting\) renderInterior\(\)/);
});

test('prototype clay grain is deterministic, subtly varied and has no colored marble veins', () => {
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'), 'utf8');
  const start = source.indexOf('  function prototypeGrainTexture()');
  const end = source.indexOf('  const prototypeGrain =', start);
  let pixels;
  const context = {
    document: { createElement() { return { getContext() { return {
      createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
      putImageData(image) { pixels = image.data; }
    }; } }; } },
    THREE: { CanvasTexture: class { constructor(image) { this.image = image; } }, RepeatWrapping: 1 }
  };
  vm.runInNewContext(source.slice(start, end) + '\nprototypeGrainTexture();', context);
  const first = pixels.slice();
  let minimum = 255, maximum = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    assert.equal(pixels[index], pixels[index + 1]);
    assert.equal(pixels[index], pixels[index + 2]);
    assert.equal(pixels[index + 3], 255);
    minimum = Math.min(minimum, pixels[index]);
    maximum = Math.max(maximum, pixels[index]);
  }
  assert.ok(minimum >= 220 && maximum <= 250);
  assert.ok(maximum - minimum >= 15, 'Fine grain must not be a flat color');
  vm.runInNewContext('prototypeGrainTexture();', context);
  assert.deepEqual(pixels, first);
});

test('prototype gutters have a five-inch open section, end caps and matched corner miters', () => {
  const source = fs.readFileSync(require.resolve('../assets/js/floor-plan-exterior.js'), 'utf8');
  const start = source.indexOf('  function prototypeGutter('), end = source.indexOf('  function renderRoofEnvelope(', start);
  class Geometry {
    setAttribute(name, value) { this[name] = value; }
    computeVertexNormals() {}
  }
  const context = { gutterFinish: { clone: () => ({}) }, THREE: {
    Vector2: class { constructor(x,y) { this.x=x; this.y=y; } },
    ShapeUtils: { triangulateShape: () => [[0,1,2]] },
    BufferGeometry: Geometry, Float32BufferAttribute: class { constructor(array) { this.array=array; } },
    Mesh: class { constructor(geometry,material) { this.geometry=geometry; this.material=material; } }, DoubleSide: 2
  } };
  vm.runInNewContext(source.slice(start,end), context);
  const parent = { children: [], add(p) { this.children.push(p); } };
  const mesh = context.prototypeGutter(parent,[0,10,0],[10,10,0]);
  assert.equal(mesh.userData.widthInches,5);
  assert.equal(mesh.userData.heightInches,3.5);
  const positions = mesh.geometry.position.array;
  const zs = positions.filter((_,i)=>i%3===2), ys = positions.filter((_,i)=>i%3===1);
  assert.ok(Math.abs(Math.max(...zs)-Math.min(...zs)-5/12)<1e-6);
  assert.ok(Math.abs(Math.max(...ys)-Math.min(...ys)-3.5/12)<1e-6);
  const corner = context.prototypeGutter(parent,[0,10,0],[10,10,0],[{start:[0,10,-10],end:[0,10,0]}]);
  assert.equal(corner.userData.miteredCorners,1);
  const vertices = corner.geometry.position.array;
  assert.ok(vertices.some((x,i)=>i%3===0 && x > 0.4 && x < 0.5 && vertices[i+2] < -0.4));
});
