'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..', 'assets', 'models');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8').replace(/^\uFEFF/, ''));
const ids = new Set();
const inventory = new Map();
const checkedFiles = new Set();
let bytes = 0;
let models = 0;
const providers = {};

function localFile(relative) {
  assert.equal(typeof relative, 'string');
  assert.ok(!path.isAbsolute(relative) && !relative.split(/[\\/]/).includes('..'), `Unsafe asset path: ${relative}`);
  return path.join(root, ...relative.split('/'));
}

function checkDocument(document, entry, embeddedBytes = 0) {
  assert.equal(document.asset.version, '2.0', entry);
  assert.ok(document.meshes?.length > 0, `No meshes: ${entry}`);
  assert.ok(document.scenes?.length > 0, `No scenes: ${entry}`);
  for (const resource of [...(document.buffers || []), ...(document.images || [])]) {
    if (resource.uri) {
      if (resource.uri.startsWith('data:')) continue;
      assert.ok(!/^[a-z]+:/i.test(resource.uri), `Remote dependency: ${entry}: ${resource.uri}`);
      const relative = path.posix.join(path.posix.dirname(entry), decodeURIComponent(resource.uri));
      const target = localFile(relative);
      assert.ok(inventory.has(relative), `Undeclared dependency: ${relative}`);
      assert.ok(fs.existsSync(target), `Missing dependency: ${relative}`);
      if (resource.byteLength) assert.equal(fs.statSync(target).size, resource.byteLength, relative);
    } else if (resource.byteLength) {
      assert.ok(embeddedBytes >= resource.byteLength, `Truncated embedded buffer: ${entry}`);
    }
  }
}

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.assetCount, manifest.assets.length);
for (const asset of manifest.assets) {
  for (const file of asset.files) {
    if (inventory.has(file.path)) assert.deepEqual(inventory.get(file.path), file, `Inconsistent shared resource: ${file.path}`);
    inventory.set(file.path, file);
  }
}
for (const asset of manifest.assets) {
  assert.ok(!ids.has(asset.id), `Duplicate ID: ${asset.id}`);
  ids.add(asset.id);
  assert.ok(['CC0-1.0', 'CC-BY-3.0', 'CC-BY-4.0'].includes(asset.license), asset.id);
  assert.ok(asset.source.startsWith('https://') && asset.licenseUrl.startsWith('https://'), asset.id);
  if (asset.license.startsWith('CC-BY-')) assert.ok(asset.attribution?.length > 20, `Missing attribution: ${asset.id}`);
  if (asset.licenseFile) assert.match(fs.readFileSync(localFile(asset.licenseFile), 'utf8'), /CC0|Creative Commons Zero/);
  assert.ok(inventory.has(asset.entry), `Undeclared model: ${asset.entry}`);
  for (const file of asset.files) {
    if (checkedFiles.has(file.path)) continue;
    checkedFiles.add(file.path);
    const content = fs.readFileSync(localFile(file.path));
    assert.equal(content.length, file.bytes, file.path);
    assert.equal(crypto.createHash('sha256').update(content).digest('hex'), file.sha256, file.path);
    bytes += content.length;
  }
  const data = fs.readFileSync(localFile(asset.entry));
  if (asset.entry.endsWith('.glb')) {
    assert.equal(data.readUInt32LE(0), 0x46546c67, asset.entry);
    assert.equal(data.readUInt32LE(4), 2, asset.entry);
    assert.equal(data.readUInt32LE(8), data.length, asset.entry);
    let document;
    let embeddedBytes = 0;
    for (let offset = 12; offset < data.length;) {
      const length = data.readUInt32LE(offset);
      const type = data.readUInt32LE(offset + 4);
      assert.ok(offset + 8 + length <= data.length, `Truncated chunk: ${asset.entry}`);
      assert.equal(length % 4, 0, asset.entry);
      if (type === 0x4e4f534a) document = JSON.parse(data.subarray(offset + 8, offset + 8 + length).toString('utf8'));
      if (type === 0x004e4942) embeddedBytes += length;
      offset += 8 + length;
    }
    assert.ok(document, `Missing GLB JSON: ${asset.entry}`);
    checkDocument(document, asset.entry, embeddedBytes);
  } else {
    assert.ok(asset.entry.endsWith('.gltf'), asset.entry);
    checkDocument(JSON.parse(data.toString('utf8')), asset.entry);
  }
  models++;
  providers[asset.provider] = (providers[asset.provider] || 0) + 1;
}
assert.equal(bytes, manifest.totalBytes);
console.log(`Verified ${models} models and ${inventory.size} files; ${(bytes / 1024 / 1024).toFixed(1)} MiB.`);
console.log(`All model headers, local dependencies, byte counts, SHA-256 hashes and license records passed.`);
console.log(JSON.stringify(providers));
