'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

function checkLocalLinks(file, text) {
  for (const [, link] of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    if (/^https?:/.test(link)) continue;
    const [target] = link.split(/[?#]/, 1);
    assert.ok(fs.existsSync(path.resolve(path.dirname(file), target)), `${path.relative(root, file)}: ${link}`);
  }
}

function readCustomization(file) {
  const text = fs.readFileSync(file, 'utf8');
  const header = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  assert.ok(header, `${file}: YAML frontmatter is required`);
  assert.doesNotMatch(header[1], /\t/, `${file}: no YAML tabs`);
  const fields = new Map();
  for (const line of header[1].split(/\r?\n/)) {
    const field = line.match(/^([a-zA-Z-]+): (.+)$/);
    assert.ok(field, `${file}: expected simple single-line frontmatter: ${line}`);
    assert.ok(!fields.has(field[1]), `${file}: duplicate field ${field[1]}`);
    fields.set(field[1], field[2]);
  }
  const description = fields.get('description');
  assert.ok(description, `${file}: description is required`);
  assert.match(description, /^(?:"[^"\r\n]+"|'[^'\r\n]+')$/, `${file}: quote descriptions`);
  assert.ok(description.length - 2 <= 1024 && description.includes('Use when'), `${file}: meaningful discovery description`);
  checkLocalLinks(file, text);
  return { text, fields };
}

test('house design agent is discoverable and links to current project workflows', () => {
  const file = path.join(root, '.github', 'agents', 'house-design.agent.md');
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /^---\r?\nname: House Design\r?\ndescription: "[^"\r\n]+"\r?\nuser-invocable: true\r?\n---/);
  assert.match(text, /elevations/);
  assert.match(text, /Do not push without explicit authorization/);
  assert.match(text, /not a licensed architect/);
  assert.match(text, /a canvas existing does not prove/i);
  checkLocalLinks(file, text);
});

test('project skills have matching names, valid simple frontmatter and resolvable local links', () => {
  const directory = path.join(root, '.github', 'skills');
  const names = fs.readdirSync(directory, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name);
  for (const required of ['home-model-editing', 'home-model-publishing', 'home-model-verification', 'home-product-research', 'home-space-planning']) {
    assert.ok(names.includes(required), `Required skill: ${required}`);
  }
  for (const name of names) {
    const { text, fields } = readCustomization(path.join(directory, name, 'SKILL.md'));
    assert.match(name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(name.length <= 64);
    assert.equal(fields.get('name'), name);
    assert.ok(text.split(/\r?\n/).length < 500, `${name}: keep the workflow focused`);
  }
});

test('all agents have discoverable metadata and research/review roles are read-only', () => {
  const directory = path.join(root, '.github', 'agents');
  const files = fs.readdirSync(directory).filter(name => name.endsWith('.agent.md'));
  const names = new Set();
  for (const file of files) {
    const { fields } = readCustomization(path.join(directory, file));
    const name = fields.get('name');
    assert.ok(name && !names.has(name), `${file}: unique agent name`);
    names.add(name);
    assert.equal(fields.get('user-invocable'), 'true', `${file}: available in agent picker`);
    assert.ok(!fields.has('model') && !fields.has('reasoning-effort'), `${file}: respect client model preferences`);
  }
  for (const [file, tools] of [
    ['home-design-review.agent.md', '[read, search]'],
    ['home-product-research.agent.md', '[read, search, web]']
  ]) {
    const { text, fields } = readCustomization(path.join(directory, file));
    assert.equal(fields.get('tools'), tools, `${file}: least-privilege tools`);
    assert.equal(fields.get('agents'), '[]', `${file}: no nested delegation`);
    assert.match(text, /Do not edit files/i);
    assert.match(text, /do not[^.]*publish/i);
  }
});

test('adopted space planning retains attribution and is wired into design, editing and review', () => {
  const directory = path.join(root, '.github', 'skills', 'home-space-planning');
  const { text } = readCustomization(path.join(directory, 'SKILL.md'));
  assert.match(text, /Adapted from Roomsmith/);
  assert.match(text, /github\.com\/Rumeasiyan\/roomsmith\/tree\/[a-f0-9]{40}/);
  assert.match(text, /spatial thesis/);
  assert.match(text, /occupied\/pulled out/);
  assert.match(text, /continuous route/);
  assert.match(text, /If it does not fit, change the design/);
  assert.match(text, /Fix at the source/);
  assert.match(text, /Instructions alone do not repair existing placements/);
  assert.match(text, /Do not claim construction, structural or code approval/);
  const license = fs.readFileSync(path.join(directory, 'LICENSE'), 'utf8');
  assert.match(license, /^MIT License/);
  assert.match(license, /Copyright \(c\) 2026 Rumeasiyan/);
  assert.match(license, /The above copyright notice and this permission notice/);
  assert.match(license, /THE SOFTWARE IS PROVIDED "AS IS"/);
  for (const relative of [
    '.github/agents/house-design.agent.md',
    '.github/agents/home-design-review.agent.md',
    '.github/skills/home-model-editing/SKILL.md',
    '.github/copilot-instructions.md',
    'README.md'
  ]) {
    const file = path.join(root, relative);
    const content = fs.readFileSync(file, 'utf8');
    assert.match(content, /\]\([^)\r\n]*home-space-planning\/SKILL\.md\)/, `${relative}: discoverable planning workflow`);
    checkLocalLinks(file, content);
  }
});

test('file instructions are scoped, linked and cover the intended repository surfaces', () => {
  const directory = path.join(root, '.github', 'instructions');
  const expected = new Map([
    ['model-geometry.instructions.md', 'floor-plan-ground.js'],
    ['viewer-behavior.instructions.md', 'floor-plan-3d.js'],
    ['model-tests.instructions.md', 'tests/**/*.cjs'],
    ['design-documentation.instructions.md', '**/*.html']
  ]);
  const files = fs.readdirSync(directory).filter(name => name.endsWith('.instructions.md'));
  for (const file of expected.keys()) assert.ok(files.includes(file), `Required scoped instructions: ${file}`);
  for (const file of files) {
    const { fields } = readCustomization(path.join(directory, file));
    const scope = fields.get('applyTo');
    assert.ok(scope, `${file}: explicit file scope`);
    assert.match(scope, /^"[^"\r\n]+"$/, `${file}: quoted applyTo patterns`);
    const patterns = scope.slice(1, -1).split(',').map(pattern => pattern.trim());
    assert.ok(patterns.every(pattern => pattern && !['**', '**/*', '*'].includes(pattern)), `${file}: no catch-all scope`);
    if (expected.has(file)) assert.ok(patterns.includes(expected.get(file)), `${file}: intended surface`);
    for (const pattern of patterns) {
      if (!pattern.includes('*')) assert.ok(fs.existsSync(path.join(root, pattern)), `${file}: existing scoped path ${pattern}`);
    }
  }
});

test('project instructions and README link to existing guidance and the bundled validator', () => {
  for (const relative of ['README.md', path.join('.github', 'copilot-instructions.md')]) {
    const file = path.join(root, relative);
    const text = fs.readFileSync(file, 'utf8');
    checkLocalLinks(file, text);
  }
  assert.ok(fs.existsSync(path.join(root, '.github', 'skills', 'home-model-editing', 'scripts', 'check-model.cjs')));
});

test('viewer guidance preserves the compact model-first preference and current defaults', () => {
  const project = fs.readFileSync(path.join(root, '.github', 'copilot-instructions.md'), 'utf8');
  const viewer = fs.readFileSync(path.join(root, '.github', 'instructions', 'viewer-behavior.instructions.md'), 'utf8');
  assert.match(project, /one-word UI labels/);
  assert.match(project, /Windows, Area and Size compact and visible/);
  assert.match(viewer, /live\s+window count visible/);
  assert.match(viewer, /tooltips or closed\s+optional details/);
  assert.match(viewer, /Day with Night unchecked/);
  const editing = fs.readFileSync(path.join(root, '.github', 'skills', 'home-model-editing', 'SKILL.md'), 'utf8');
  assert.match(editing, /short, preferably one-word labels/);
  assert.match(editing, /Area, 1st, 2nd and Size visible in the compact footer/);
  assert.match(viewer, /labeled 1st\s+and 2nd with sq ft units/);
});

test('project instructions and both skills preserve the minimal viewer requirement', () => {
  for (const relative of [
    path.join('.github', 'copilot-instructions.md'),
    path.join('.github', 'skills', 'home-model-editing', 'SKILL.md'),
    path.join('.github', 'skills', 'home-model-publishing', 'SKILL.md')
  ]) {
    const text = fs.readFileSync(path.join(root, relative), 'utf8');
    assert.match(text, /minimal and model-first/);
    assert.match(text, /unrequested banners, slogans, badges/);
    assert.match(text, /duplicate menus or links/);
    assert.match(text, /visible garage-door explanation banner/);
  }
});

test('specialist workflows distinguish browser evidence and sourced facts from approval', () => {
  const verification = readCustomization(path.join(root, '.github', 'skills', 'home-model-verification', 'SKILL.md')).text;
  assert.match(verification, /Update scene world matrices/);
  assert.match(verification, /Sample door\/drawer motion through its range/);
  assert.match(verification, /reload the unmodified served script/);
  assert.match(verification, /not visual verification/);
  const research = readCustomization(path.join(root, '.github', 'skills', 'home-product-research', 'SKILL.md')).text;
  assert.match(research, /retrieval date/);
  assert.match(research, /Do not send private owner photos, plans, code or credentials/);
  assert.match(research, /do not edit the design/);
  assert.match(research, /not every exterior texture license/);
});

test('model validator rejects an unknown suite instead of reporting an empty success', () => {
  const runner = path.join(root, '.github', 'skills', 'home-model-editing', 'scripts', 'check-model.cjs');
  const result = spawnSync(process.execPath, [runner, 'not-an-existing-suite'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown test suite/);
});

test('model validator reports test counts independently of the parent reporter selection', () => {
  const runner = path.join(root, '.github', 'skills', 'home-model-editing', 'scripts', 'check-model.cjs');
  const result = spawnSync(process.execPath, ['--test-reporter=spec', runner, 'floor-grid'], {
    cwd: root,
    encoding: 'utf8'
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /floor-grid\.test\.cjs: [1-9]\d* passed/);
  assert.match(result.stdout, /Total: [1-9]\d* tests passed in 1 suites\./);
});
