'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const layout = require('./upstairs-layout.js');
const { getUpstairsDefaultPlan } = require('./floor-plan-upstairs.js');
const { getGroundFloorDefaultPlan } = require('./floor-plan-ground.js');

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function reply(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(value));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size <= 1000000) chunks.push(chunk);
      else chunks.length = 0;
    });
    request.on('end', () => {
      if (size > 1000000) reject(new RequestError(413, 'Layout request must be smaller than 1 MB.'));
      else {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (error) { reject(new RequestError(400, `Invalid layout JSON: ${error.message}`)); }
      }
    });
    request.on('error', reject);
    request.on('aborted', () => reject(new RequestError(400, 'Layout request was interrupted.')));
  });
}

function inside(root, file) {
  const relative = path.relative(root, file);
  return !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`);
}

function createPreviewServer({ root = __dirname } = {}) {
  const plans = {
    '/api/upstairs-layout': { baseline: getUpstairsDefaultPlan(layout.stairOpening()), file: 'upstairs-layout.json' },
    '/api/ground-layout': { baseline: getGroundFloorDefaultPlan(), file: 'ground-layout.json' }
  };
  let writes = Promise.resolve();
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.md': 'text/plain; charset=utf-8' };

  async function persist(body, { baseline, file }) {
    const layoutFile = path.join(root, file);
    if (!body || Object.keys(body).some((key) => !['layout', 'expected'].includes(key))) throw new RequestError(400, 'Send the new layout and its expected saved version.');
    try {
      layout.resolve(baseline, body.layout);
      layout.resolve(baseline, body.expected);
    } catch (error) { throw new RequestError(400, error.message); }
    const current = JSON.parse(await fs.readFile(layoutFile, 'utf8'));
    layout.resolve(baseline, current);
    if (layout.serialize(current) === layout.serialize(body.layout)) return { layout: current };
    if (layout.serialize(current) !== layout.serialize(body.expected)) throw new RequestError(409, 'The project layout changed in another tab or editor. Reload before making more edits; your current edit was not saved.');
    const text = layout.serialize(body.layout);
    const temporary = `${layoutFile}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, text, { flag: 'wx' });
      await fs.rename(temporary, layoutFile);
    } catch (error) {
      await fs.rm(temporary, { force: true });
      throw error;
    }
    if (await fs.readFile(layoutFile, 'utf8') !== text) throw new RequestError(409, 'The layout changed during save verification. Your edit is not confirmed saved; reload before continuing.');
    return { layout: body.layout };
  }

  async function handle(request, response) {
    const port = server.address().port;
    const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
    if (!hosts.includes(request.headers.host)) throw new RequestError(403, 'Use the local preview address.');
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (Object.hasOwn(plans, url.pathname)) {
      if (request.method !== 'PUT') throw new RequestError(405, 'Use PUT to automatically save a layout.');
      if (!hosts.some((host) => request.headers.origin === `http://${host}`) || request.headers['sec-fetch-site'] === 'cross-site') throw new RequestError(403, 'Layout updates must come from the local designer.');
      if (request.headers['content-type']?.split(';')[0].trim() !== 'application/json') throw new RequestError(415, 'Layout updates require application/json.');
      const body = await readBody(request);
      const operation = writes.then(() => persist(body, plans[url.pathname]));
      writes = operation.catch((error) => console.error('Layout autosave rejected:', error.message));
      reply(response, 200, await operation);
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) throw new RequestError(405, 'Only the layout endpoints accept changes.');
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); }
    catch (error) { throw new RequestError(400, `Invalid preview path: ${error.message}`); }
    if (pathname.split(/[\\/]/).some((part) => part.startsWith('.'))) throw new RequestError(404, 'Preview file not found.');
    const file = path.resolve(root, ...(pathname === '/' ? ['index.html'] : pathname.split(/[\\/]/).filter(Boolean)));
    if (!inside(root, file)) throw new RequestError(404, 'Preview file not found.');
    let resolved, contents;
    try {
      resolved = await fs.realpath(file);
      if (!inside(await fs.realpath(root), resolved)) throw new RequestError(404, 'Preview file not found.');
      contents = await fs.readFile(resolved);
    } catch (error) {
      if (['ENOENT', 'EISDIR', 'ENOTDIR'].includes(error.code)) throw new RequestError(404, 'Preview file not found.');
      throw error;
    }
    response.writeHead(200, { 'Content-Type': types[path.extname(resolved).toLowerCase()] ?? 'application/octet-stream', 'Content-Length': contents.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : contents);
  }

  const server = http.createServer((request, response) => {
    handle(request, response).catch((error) => {
      if (!error.status) console.error('Preview request failed:', error);
      reply(response, error.status ?? 500, { error: error.status ? error.message : 'Project save/preview failed. Check the preview server console; the edit is not confirmed saved.' });
    });
  });
  server.requestTimeout = 15000;
  return server;
}

if (require.main === module) {
  const server = createPreviewServer();
  server.on('error', (error) => { console.error('Could not start the preview server:', error.message); process.exitCode = 1; });
  server.listen(4173, '127.0.0.1', () => console.log('Home preview with automatic project saving: http://127.0.0.1:4173/floor-plan-3d.html?view=upstairs'));
}

module.exports = { createPreviewServer };
