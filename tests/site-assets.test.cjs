'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createPreviewServer } = require('../preview-server.cjs');
const root = path.resolve(__dirname, '..');

function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.')) return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : [file];
  });
}

function localTarget(reference, base) {
  if (/^(?:[a-z]+:|\/\/|#)/i.test(reference)) return null;
  const pathname = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
  return pathname.startsWith('/') ? path.join(root, pathname) : path.resolve(base, pathname);
}

test('browser assets are organized without loose scripts, styles, layouts or images', () => {
  const loose = fs.readdirSync(root).filter(name => /\.(?:js|css|json|png|jpe?g|webp|svg|pdf)$/i.test(name));
  assert.deepEqual(loose, []);
  assert.ok(fs.readdirSync(path.join(root, 'assets'), { withFileTypes: true }).every(entry => entry.isDirectory()));
  for (const directory of ['css', 'data', 'documents', 'js', 'images/exterior', 'images/interiors', 'images/plans', 'images/references', 'models', 'textures', 'videos']) {
    assert.ok(fs.statSync(path.join(root, 'assets', directory)).isDirectory(), directory);
  }
});

test('every page asset, local script import and fixed viewer asset resolves after relocation', () => {
  const pages = files(root).filter(file => file.endsWith('.html') && !file.includes(`${path.sep}.git${path.sep}`));
  let checked = 0;
  function check(reference, base, source) {
    const target = localTarget(reference, base);
    if (!target || !/\.(?:js|css|json|svg|png|jpe?g|webp|pdf|mp4|vtt|gltf|glb|hdr)$/i.test(target)) return;
    assert.ok(fs.existsSync(target) && fs.statSync(target).isFile(), `${path.relative(root, source)}: ${reference}`);
    checked++;
  }
  for (const page of pages) {
    const text = fs.readFileSync(page, 'utf8');
    for (const match of text.matchAll(/\b(?:src|href|poster)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      check(match[1] ?? match[2], path.dirname(page), page);
    }
    for (const match of text.matchAll(/\bsrcset\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      const references = match[1] ?? match[2];
      if (references.startsWith('data:')) continue;
      for (const reference of references.split(',')) check(reference.trim().split(/\s+/, 1)[0], path.dirname(page), page);
    }
  }
  for (const file of files(path.join(root, 'assets', 'js'))) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\b(?:require(?:\.resolve)?|import)\(\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      check(match[1], path.dirname(file), file);
    }
    for (const match of text.matchAll(/['"`](assets\/[^'"`$]+)['"`]/g)) check(match[1], root, file);
  }
  for (const file of files(path.join(root, 'assets', 'css'))) {
    for (const match of fs.readFileSync(file, 'utf8').matchAll(/url\(\s*['"]?([^'")\s]+)/g)) check(match[1], path.dirname(file), file);
  }
  assert.ok(pages.length > 20 && checked > 100, 'Check the actual site, not an empty fixture');
});

test('relocated scripts, styles and layouts serve fresh with correct MIME and exact contents', async t => {
  const server = createPreviewServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const resources = [
    ...fs.readdirSync(path.join(root, 'assets', 'js')).map(name => [`assets/js/${name}`, 'text/javascript']),
    ...fs.readdirSync(path.join(root, 'assets', 'css')).map(name => [`assets/css/${name}`, 'text/css']),
    ['assets/data/ground-layout.json', 'application/json'],
    ['assets/data/upstairs-layout.json', 'application/json']
  ];
  for (const [file, mime] of resources) {
    const response = await fetch(`${origin}/${file}`);
    assert.equal(response.status, 200, file);
    assert.ok(response.headers.get('content-type').startsWith(mime), file);
    assert.equal(response.headers.get('cache-control'), 'no-store', file);
    assert.equal(await response.text(), fs.readFileSync(path.join(root, file), 'utf8'), file);
  }
  const image = await fetch(`${origin}/assets/images/exterior/exterior-palette-options.svg`);
  assert.equal(image.status, 200);
  assert.equal(image.headers.get('cache-control'), 'no-cache');
  assert.ok(image.headers.get('etag'));
});
