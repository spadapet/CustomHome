'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(require.resolve('../floor-plan-3d.js'), 'utf8');
const exterior = fs.readFileSync(require.resolve('../floor-plan-exterior.js'), 'utf8');

test('bundled exterior scans have separate local color, normal and roughness JPG resources', () => {
  const directory = path.join(__dirname, '..', 'assets', 'textures', 'exterior');
  for (const file of ['brick_wall_001_diffuse_1k.jpg', 'brick_wall_001_nor_gl_1k.jpg', 'brick_wall_001_rough_1k.jpg', 'stone_wall_diff_1k.jpg', 'stone_wall_nor_gl_1k.jpg', 'stone_wall_rough_1k.jpg', 'grass_ground_diff_1k.jpg', 'grass_ground_nor_gl_1k.jpg', 'grass_ground_rough_1k.jpg']) {
    const bytes = fs.readFileSync(path.join(directory, file));
    assert.ok(bytes.length > 10000, file);
    assert.equal(bytes.readUInt16BE(0), 0xffd8, `${file}: actual JPEG, not an error response`);
  }
  const sky = fs.readFileSync(path.join(directory, 'kloppenheim_06_puresky_1k.hdr'));
  assert.ok(sky.length > 100000);
  assert.equal(sky.subarray(0, 10).toString('ascii'), '#?RADIANCE');
  for (const suffix of ['diff', 'nor_gl', 'rough']) {
    const bytes = fs.readFileSync(path.join(directory, `roof_slates_03_${suffix}_1k.jpg`));
    assert.equal(bytes.readUInt16BE(0), 0xffd8);
    assert.ok(bytes.length > 10000);
  }
  assert.match(source, /texture\.colorSpace = index === 0 \? THREE\.SRGBColorSpace : THREE\.NoColorSpace/);
  assert.match(source, /textureLoader\.loadAsync\(`assets\/textures\/exterior/);
  assert.match(exterior, /Object\.assign\(frontBrick, masonryMaps\.brick, \{ map: brickColor, bumpMap: null \}\)/);
  assert.match(exterior, /for \(const key of \['normalMap', 'roughnessMap'\]\)/);
  assert.match(exterior, /brick\[key\]\.repeat\.copy\(brick\.map\.repeat\)/);
  assert.match(source, /outdoorSky\.mapping = THREE\.EquirectangularReflectionMapping/);
});

test('exterior daylight has one bounded directional shadow pass without changing Night or interior lighting', () => {
  assert.match(source, /const exteriorSun = new THREE\.DirectionalLight/);
  assert.match(source, /exteriorSun\.shadow\.mapSize\.set\(2048, 2048\)/);
  assert.match(source, /const exteriorDaylight = activeFloor === 'exterior' && !nightLighting/);
  assert.match(source, /exteriorSun\.visible = exteriorDaylight/);
  assert.match(source, /renderer\.shadowMap\.enabled = mudroomLighting \|\| exteriorDaylight/);
  assert.match(source, /studioFill\.intensity = exteriorDaylight \? 0 : nightLighting \? 325 : 650/);
});
