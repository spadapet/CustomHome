'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

test('house design agent is discoverable and links to current project workflows', () => {
  const file = path.join(root, '.github', 'agents', 'house-design.agent.md');
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /^---\r?\nname: House Design\r?\ndescription: "[^"\r\n]+"\r?\nuser-invocable: true\r?\n---/);
  assert.match(text, /elevations/);
  assert.match(text, /Do not push without explicit authorization/);
  assert.match(text, /not a licensed architect/);
  assert.match(text, /a canvas existing does not prove/i);
  for (const [, link] of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    assert.ok(fs.existsSync(path.resolve(path.dirname(file), link)), `Agent link: ${link}`);
  }
});

test('project skills have matching names, valid simple frontmatter and resolvable local links', () => {
  for (const name of ['home-model-editing', 'home-model-publishing']) {
    const file = path.join(root, '.github', 'skills', name, 'SKILL.md');
    const text = fs.readFileSync(file, 'utf8');
    const frontmatter = text.match(/^---\r?\nname: ([a-z0-9-]+)\r?\ndescription: '([^'\r\n]+)'\r?\n---\r?\n/);
    assert.ok(frontmatter, `${name} has valid name/description YAML frontmatter`);
    assert.equal(frontmatter[1], name);
    assert.ok(frontmatter[2].length <= 1024 && frontmatter[2].includes('Use when'));
    for (const [, link] of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) assert.ok(fs.existsSync(path.resolve(path.dirname(file), link)), `${name}: ${link}`);
  }
});

test('project instructions and README link to existing guidance and the bundled validator', () => {
  for (const relative of ['README.md', path.join('.github', 'copilot-instructions.md')]) {
    const file = path.join(root, relative);
    const text = fs.readFileSync(file, 'utf8');
    for (const [, link] of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (/^https?:/.test(link)) continue;
      const [target] = link.split(/[?#]/, 1);
      assert.ok(fs.existsSync(path.resolve(path.dirname(file), target)), `${relative}: ${link}`);
    }
  }
  assert.ok(fs.existsSync(path.join(root, '.github', 'skills', 'home-model-editing', 'scripts', 'check-model.cjs')));
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

test('model validator rejects an unknown suite instead of reporting an empty success', () => {
  const runner = path.join(root, '.github', 'skills', 'home-model-editing', 'scripts', 'check-model.cjs');
  const result = spawnSync(process.execPath, [runner, 'not-an-existing-suite'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown test suite/);
});
