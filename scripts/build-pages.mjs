/**
 * Build the standalone calculator for GitHub Pages.
 * Publish only explicitly referenced local CSS/JS and index.html.
 * No source tests, node_modules, uploads or local project files are deployed.
 */
import { readFile, copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = resolve(root, 'dist');
const html = await readFile(join(root, 'index.html'), 'utf8');

// Relative URLs work at both / and /<repository>/ on GitHub Pages.
const refs = [...html.matchAll(/(?:src|href)=["'](\.\/[^"']+)["']/g)].map(m => m[1]);
const assets = new Set();
for (const ref of refs) {
  const asset = ref.slice(2);
  if (!/^[a-zA-Z0-9._/-]+$/.test(asset) ||
      asset.startsWith('/') || asset.split('/').includes('..') ||
      !['.css', '.js'].includes(extname(asset))) {
    throw new Error('Unexpected local asset URL: ' + ref);
  }
  assets.add(asset);
}
if (assets.size === 0 || ![...assets].some(f => f.endsWith('.js')) ||
    ![...assets].some(f => f.endsWith('.css'))) {
  throw new Error('Missing local CSS or JavaScript asset references in index.html');
}
await mkdir(destination, { recursive: true });
await copyFile(join(root, 'index.html'), join(destination, 'index.html'));
for (const asset of [...assets].sort()) {
  await mkdir(dirname(join(destination, asset)), { recursive: true });
  await copyFile(join(root, asset), join(destination, asset));
}
await writeFile(join(destination, '.nojekyll'), '', 'utf8');
// Never publish stale or unexpected files if dist already existed locally.
// GitHub Actions runs from a clean checkout, but local incremental builds are checked too.
const allowed = new Set(['index.html', '.nojekyll', ...assets]);
async function verifyStagedFiles(folder, prefix = '') {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const relative = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) {
      if (![...allowed].some(path => path.startsWith(relative + '/'))) {
        throw new Error('Unexpected directory in Pages artifact: ' + relative);
      }
      await verifyStagedFiles(join(folder, entry.name), relative);
    } else if (!entry.isFile() || !allowed.has(relative)) {
      throw new Error('Unexpected file in Pages artifact: ' + relative);
    }
  }
}
await verifyStagedFiles(destination);
console.log('GitHub Pages: dist/index.html + ' + assets.size + ' local assets, no development files');
