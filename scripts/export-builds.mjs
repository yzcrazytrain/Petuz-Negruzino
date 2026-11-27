import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const IMAGES_DIR = path.join(ROOT, 'src', 'assets', 'images');
const DOWNLOADS_DIR = path.join(ROOT, 'public', 'downloads');
const ELECTRON_DIR = path.join(ROOT, 'desktop-electron');

const DIST_HTML_PATH = path.join(DIST_DIR, 'index.html');
if (!fs.existsSync(DIST_HTML_PATH)) {
  throw new Error('dist/index.html not found. Run `npm run build` first.');
}

fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

let html = fs.readFileSync(DIST_HTML_PATH, 'utf8');

// 1. Inline compiled CSS stylesheets
const cssLinkRegex = /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
html = html.replace(cssLinkRegex, (match, href) => {
  if (/^https?:\/\//i.test(href)) {
    // Keep external font links optional; do not fail offline
    return match;
  }
  const cleanHref = href.replace(/^\.?\//, '');
  const cssPath = path.join(DIST_DIR, cleanHref);
  if (!fs.existsSync(cssPath)) return match;
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  return `<style>\n${cssContent}\n</style>`;
});

// 2. Load all game artwork & PBR macro photos as base64 data URIs
const imageDataMap = new Map();
if (fs.existsSync(IMAGES_DIR)) {
  for (const file of fs.readdirSync(IMAGES_DIR)) {
    const ext = path.extname(file).toLowerCase();
    const mime =
      ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.png'
          ? 'image/png'
          : ext === '.webp'
            ? 'image/webp'
            : null;
    if (!mime) continue;
    const raw = fs.readFileSync(path.join(IMAGES_DIR, file));
    const dataUri = `data:${mime};base64,${raw.toString('base64')}`;
    imageDataMap.set(`/src/assets/images/${file}`, dataUri);
  }
}

// 3. Inline compiled JS module bundle with base64-embedded images
const scriptRegex = /<script\s+[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;
let inlinedScripts = 0;
let embeddedImageCount = 0;

html = html.replace(scriptRegex, (match, src) => {
  const cleanSrc = src.replace(/^\.?\//, '');
  const jsPath = path.join(DIST_DIR, cleanSrc);
  if (!fs.existsSync(jsPath)) return match;
  let jsContent = fs.readFileSync(jsPath, 'utf8');

  for (const [assetPath, dataUri] of imageDataMap.entries()) {
    if (jsContent.includes(assetPath)) {
      jsContent = jsContent.split(assetPath).join(dataUri);
      embeddedImageCount += 1;
    }
  }

  // Escape </script so inline HTML parser never terminates the tag prematurely
  const safeJs = jsContent.replace(/<\/script/gi, '<\\/script');
  inlinedScripts += 1;
  return `<script type="module">\n${safeJs}\n</script>`;
});

if (inlinedScripts === 0) {
  throw new Error('No module script found in dist/index.html to inline.');
}

// 4. Write standalone offline HTML copy + Electron app.html
fs.mkdirSync(ELECTRON_DIR, { recursive: true });
const standaloneHtmlPath = path.join(DOWNLOADS_DIR, 'NEGRUZINO.html');
const electronAppHtmlPath = path.join(ELECTRON_DIR, 'app.html');
fs.writeFileSync(standaloneHtmlPath, html, 'utf8');
fs.writeFileSync(electronAppHtmlPath, html, 'utf8');

// 5. Package Electron Desktop .EXE project as a clean ZIP archive
const zipPath = path.join(DOWNLOADS_DIR, 'NEGRUZINO-Desktop-EXE-Project.zip');
const pyScript = `
import os, zipfile, sys
src_dir = sys.argv[1]
out_zip = sys.argv[2]
allowed = ['package.json', 'main.cjs', 'app.html', 'build-exe.bat', 'README.txt']
with zipfile.ZipFile(out_zip, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
    for name in allowed:
        full = os.path.join(src_dir, name)
        if os.path.exists(full):
            zf.write(full, arcname=f'NEGRUZINO-Desktop/{name}')
`;
const zipScriptArgs = ['-c', pyScript, ELECTRON_DIR, zipPath];
let zipped = false;
for (const pyBin of process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python']) {
  try {
    execFileSync(pyBin, zipScriptArgs, { stdio: 'inherit' });
    zipped = true;
    break;
  } catch {
    // try next Python binary name
  }
}
if (!zipped) {
  throw new Error('Python is required to package NEGRUZINO-Desktop-EXE-Project.zip');
}

// 6. Mirror downloads into dist/downloads so both Vite dev and production builds serve them
const distDownloadsDir = path.join(DIST_DIR, 'downloads');
fs.mkdirSync(distDownloadsDir, { recursive: true });
fs.copyFileSync(standaloneHtmlPath, path.join(distDownloadsDir, 'NEGRUZINO.html'));
fs.copyFileSync(zipPath, path.join(distDownloadsDir, 'NEGRUZINO-Desktop-EXE-Project.zip'));

const htmlSizeMb = (fs.statSync(standaloneHtmlPath).size / (1024 * 1024)).toFixed(2);
const zipSizeMb = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(2);
const remainingExternalRefs = (html.match(/\/src\/assets\/images\//g) || []).length;

console.log(
  `[export-builds] OK: NEGRUZINO.html (${htmlSizeMb} MB, ${embeddedImageCount} images embedded, ${remainingExternalRefs} external refs left)`
);
console.log(`[export-builds] OK: NEGRUZINO-Desktop-EXE-Project.zip (${zipSizeMb} MB)`);
