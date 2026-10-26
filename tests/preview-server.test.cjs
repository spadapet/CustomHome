'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { createPreviewServer } = require('../preview-server.cjs');
const layout = require('../upstairs-layout.js');
const { getUpstairsDefaultPlan } = require('../floor-plan-upstairs.js');
const { getGroundFloorDefaultPlan } = require('../floor-plan-ground.js');
const baseline = getUpstairsDefaultPlan(layout.stairOpening());

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'customhome-preview-test-'));
  const file = path.join(root, 'upstairs-layout.json');
  await fs.writeFile(file, layout.serialize(layout.empty()));
  await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><title>Preview test</title>');
  const server = createPreviewServer({ root });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(root, { recursive: true });
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  return {
    root, file, origin,
    update: (document, expected = layout.empty(), headers = {}) => fetch(`${origin}/api/upstairs-layout`, {
      method: 'PUT',
      headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ layout: document, expected })
    })
  };
}

test('preview serves current project files with correct MIME, no cache and HEAD support', async (t) => {
  const { origin } = await fixture(t);
  const response = await fetch(origin);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(await response.text(), /Preview test/);
  const head = await fetch(origin, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
});

test('autosave validates, persists and confirms the exact layout without leaving temporary files', async (t) => {
  const { root, file, origin, update } = await fixture(t);
  const document = layout.editRoom(baseline, layout.empty(), 'Bedroom 2', { w: 14 });
  const response = await update(document);
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).layout, document);
  assert.equal(await fs.readFile(file, 'utf8'), layout.serialize(document));
  assert.deepEqual(await (await fetch(`${origin}/upstairs-layout.json`)).json(), document);
  assert.deepEqual((await fs.readdir(root)).sort(), ['index.html', 'upstairs-layout.json']);
});

test('walkthrough video and captions have native playback MIME types and HEAD lengths', async (t) => {
  const { origin, root } = await fixture(t);
  for (const [file, content, mime] of [['tour.mp4', 'test-video', 'video/mp4'], ['tour.vtt', 'WEBVTT\n\n', 'text/vtt; charset=utf-8']]) {
    await fs.writeFile(path.join(root, file), content);
    const response = await fetch(`${origin}/${file}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), mime);
    assert.equal(await response.text(), content);
    const head = await fetch(`${origin}/${file}`, { method: 'HEAD' });
    assert.equal(head.headers.get('content-type'), mime);
    assert.equal(Number(head.headers.get('content-length')), Buffer.byteLength(content));
    assert.equal(await head.text(), '');
  }
});

test('video byte ranges support seeking, suffixes and explicit invalid-range errors', async (t) => {
  const { origin, root } = await fixture(t);
  await fs.writeFile(path.join(root, 'tour.mp4'), '0123456789');
  for (const [range, content, contentRange] of [
    ['bytes=0-3', '0123', 'bytes 0-3/10'],
    ['bytes=7-', '789', 'bytes 7-9/10'],
    ['bytes=-4', '6789', 'bytes 6-9/10'],
    ['bytes=-99', '0123456789', 'bytes 0-9/10'],
    ['bytes=8-99', '89', 'bytes 8-9/10']
  ]) {
    const response = await fetch(`${origin}/tour.mp4`, { headers: { Range: range } });
    assert.equal(response.status, 206, range);
    assert.equal(response.headers.get('content-type'), 'video/mp4');
    assert.equal(response.headers.get('accept-ranges'), 'bytes');
    assert.equal(response.headers.get('content-range'), contentRange);
    assert.equal(Number(response.headers.get('content-length')), content.length);
    assert.equal(await response.text(), content);
  }
  for (const range of ['bytes=10-', 'bytes=5-2', 'bytes=-0', 'bytes=-', 'bytes=0-0,2-2', 'bytes=9007199254740992-', 'invalid']) {
    const response = await fetch(`${origin}/tour.mp4`, { headers: { Range: range } });
    assert.equal(response.status, 416, range);
    assert.equal(response.headers.get('content-range'), 'bytes */10');
    assert.ok((await response.json()).error);
  }
  const full = await fetch(`${origin}/tour.mp4`, { headers: { Range: 'bytes=0-3', 'If-Range': '"unknown"' } });
  assert.equal(full.status, 200, 'No cache validator is available to confirm If-Range');
  assert.equal(await full.text(), '0123456789');
  const head = await fetch(`${origin}/tour.mp4`, { method: 'HEAD', headers: { Range: 'bytes=0-3' } });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-length'), '10');
  assert.equal(await head.text(), '');
});

test('invalid geometry/schema and stair overlap never change project data', async (t) => {
  const { file, update } = await fixture(t);
  const linen = baseline.rooms.find((room) => room.name === 'Linen (relocated)');
  const invalid = [
    { version: 2, rooms: [], walls: [] },
    { version: 1, rooms: [{ ...linen, x: 6 }], walls: [] },
    { version: 1, rooms: [], walls: [{ name: 'Bedroom 2 north', x1: 31, z1: 10, x2: 33, z2: 10, thickness: 0.35 }] }
  ];
  for (const document of invalid) {
    const response = await update(document);
    assert.equal(response.status, 400);
    assert.ok((await response.json()).error);
    assert.equal(await fs.readFile(file, 'utf8'), layout.serialize(layout.empty()));
  }
});

test('concurrent stale saves cannot overwrite each other and confirmed retries are idempotent', async (t) => {
  const { file, update } = await fixture(t);
  const a = layout.editRoom(baseline, layout.empty(), 'Bedroom 2', { w: 14 });
  const b = layout.editRoom(baseline, layout.empty(), 'Bedroom 2', { w: 15 });
  const responses = await Promise.all([update(a), update(b)]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 409]);
  const winner = (await responses.find((response) => response.status === 200).json()).layout;
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), winner);
  const retry = await update(winner);
  assert.equal(retry.status, 200);
  assert.deepEqual((await retry.json()).layout, winner);
});

test('writes require local origin, JSON, PUT and the dedicated endpoint', async (t) => {
  const { origin, file, update } = await fixture(t);
  assert.equal((await update(layout.empty(), layout.empty(), { Origin: 'https://example.com' })).status, 403);
  assert.equal((await update(layout.empty(), layout.empty(), { Origin: '' })).status, 403);
  const invalidHost = await new Promise((resolve, reject) => {
    const request = http.request(origin, { headers: { Host: 'not-local.example' } }, (response) => { response.resume(); resolve(response.statusCode); });
    request.on('error', reject);
    request.end();
  });
  assert.equal(invalidHost, 403);
  assert.equal((await update(layout.empty(), layout.empty(), { 'Content-Type': 'text/plain' })).status, 415);
  assert.equal((await fetch(`${origin}/api/upstairs-layout`)).status, 405);
  assert.equal((await fetch(`${origin}/upstairs-layout.json`, { method: 'PUT', body: '{}' })).status, 405);
  assert.equal(await fs.readFile(file, 'utf8'), layout.serialize(layout.empty()));
});

test('malformed and oversized requests fail explicitly without changing the file', async (t) => {
  const { origin, file } = await fixture(t);
  const update = (body) => fetch(`${origin}/api/upstairs-layout`, { method: 'PUT', headers: { Origin: origin, 'Content-Type': 'application/json' }, body });
  assert.equal((await update('{bad')).status, 400);
  assert.equal((await update(' '.repeat(1000001))).status, 413);
  assert.equal(await fs.readFile(file, 'utf8'), layout.serialize(layout.empty()));
});

test('private paths and escaped paths are not served', async (t) => {
  const { origin, root } = await fixture(t);
  await fs.mkdir(path.join(root, '.private'));
  await fs.writeFile(path.join(root, '.private', 'test.json'), '{"private":true}');
  for (const suffix of ['/.private/test.json', '/%2e%2e%5cescape.json', '/missing.html']) {
    assert.equal((await fetch(`${origin}${suffix}`)).status, 404);
  }
});

test('first-floor saves persist independently, reject invalid edits and protect concurrent changes', async (t) => {
  const { origin, root, file, update } = await fixture(t);
  const groundFile = path.join(root, 'ground-layout.json');
  await fs.writeFile(groundFile, layout.serialize(layout.empty()));
  const ground = getGroundFloorDefaultPlan();
  const a = layout.editRoom(ground, layout.empty(), 'Living room', { w: 14.2 });
  const b = layout.editRoom(ground, layout.empty(), 'Living room', { w: 15.2 });
  const save = (document, expected = layout.empty(), headers = {}) => fetch(`${origin}/api/ground-layout`, {
    method: 'PUT', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ layout: document, expected })
  });
  assert.equal((await save(a, layout.empty(), { Origin: 'https://example.com' })).status, 403);
  const results = await Promise.all([save(a), save(b)]);
  assert.deepEqual(results.map((response) => response.status).sort(), [200, 409]);
  const winner = (await results.find((response) => response.ok).json()).layout;
  assert.deepEqual(JSON.parse(await fs.readFile(groundFile, 'utf8')), winner);
  assert.deepEqual(await (await fetch(`${origin}/ground-layout.json`)).json(), winner);
  assert.equal((await save(winner)).status, 200);
  assert.equal((await save({ version: 2, rooms: [], walls: [] }, winner)).status, 400);
  assert.equal((await fetch(`${origin}/api/ground-layout`)).status, 405);
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), layout.empty());
  const upstairsEdit = layout.editRoom(baseline, layout.empty(), 'Bedroom 2', { w: 14 });
  assert.equal((await update(upstairsEdit)).status, 200);
  assert.deepEqual(JSON.parse(await fs.readFile(groundFile, 'utf8')), winner);
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), upstairsEdit);
});
