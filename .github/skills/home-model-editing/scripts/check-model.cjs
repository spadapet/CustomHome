'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..', '..', '..', '..');
const testDirectory = path.join(root, 'tests');
const testFiles = fs.readdirSync(testDirectory).filter((name) => name.endsWith('.test.cjs')).sort();
const selectors = [...new Set(process.argv.slice(2))];
const selected = selectors.length ? selectors.map((name) => {
  if (!/^[a-z0-9-]+$/.test(name) || !testFiles.includes(`${name}.test.cjs`)) throw new Error(`Unknown test suite "${name}". Available: ${testFiles.map((file) => file.replace('.test.cjs', '')).join(', ')}`);
  return `${name}.test.cjs`;
}) : testFiles;

if (!selected.length) throw new Error('No test suites were found.');

function run(args, label) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    throw new Error(`${label} failed (${result.signal || result.status}).`);
  }
  return result.stdout;
}

const scripts = fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isFile() && /\.(?:js|cjs|mjs)$/.test(entry.name)).map((entry) => entry.name);
for (const file of [...scripts, __filename]) run(['--check', file], file);

let total = 0;
const results = [];
for (const file of selected) {
  const output = run([path.join(testDirectory, file)], file);
  const count = output.match(/^# tests (\d+)\r?$/m);
  const failures = output.match(/^# fail (\d+)\r?$/m);
  if (!count || !failures || Number(failures[1]) !== 0) {
    process.stderr.write(output);
    throw new Error(`${file} did not report a successful TAP summary.`);
  }
  total += Number(count[1]);
  results.push(`${file}: ${count[1]} passed`);
}

console.log(`Syntax checked: ${scripts.length + 1} JavaScript files\n${results.join('\n')}\nTotal: ${total} tests passed in ${selected.length} suites.`);
