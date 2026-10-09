const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = __dirname;
const dist = path.join(root, 'dist');
test('GitHub Pages build includes all runtime assets and excludes local data and tests', () => {
  execFileSync(process.execPath, ['scripts/build-pages.mjs'], { cwd: root });
  const index = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  assert.match(index, /Model hardware calculator/i);
  assert.ok(fs.existsSync(path.join(dist, '.nojekyll')));
  const assets = [...index.matchAll(/(?:src|href)=["']\.\/([^"']+)["']/g)].map(m => m[1]);
  assert.ok(assets.length >= 10, 'Expected all CSS and JS scripts');
  for (const asset of assets) {
    assert.ok(fs.existsSync(path.join(dist, asset)), 'Missing deployed asset ' + asset);
    assert.ok(!asset.startsWith('/'), 'Asset must be repository-relative');
  }
  for (const excluded of ['package.json', 'package-lock.json', 'README.md',
      'ui.test.mjs', 'simulator.test.cjs', 'measurement-core.test.cjs',
      'bandwidth.test.cjs', 'bandwidth-ui.test.mjs', 'node_modules',
      'scripts', '.github', '.git', '.env', '.ssh']) {
    assert.equal(fs.existsSync(path.join(dist, excluded)), false, excluded + ' must not ship');
  }
  assert.equal(assets.length, new Set(assets).size, 'Duplicate asset reference');
});
