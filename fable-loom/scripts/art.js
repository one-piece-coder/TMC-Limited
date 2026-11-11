// Renders the App Store icon and the launch (splash) image from the app's own stained-glass style.
// Usage: node scripts/art.js   (uses the preinstalled Playwright/Chromium)
const { chromium } = require('playwright');
const path = require('path');
const root = path.join(__dirname, '..');

function roseWindow(size) {
  // Rose window with an open gold book at its heart, in the app's glass classes.
  const c = 50, seg = 16;
  const pt = (r, a) => `${(c + Math.cos(a) * r).toFixed(2)},${(c + Math.sin(a) * r).toFixed(2)}`;
  let ring = '', petals = '', jewels = '';
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / seg) * Math.PI * 2 - Math.PI / 2;
    ring += `<path class="${i % 2 ? 'r1' : 'b2'}" d="M${pt(36, a0)} L${pt(46, a0)} A46,46 0 0 1 ${pt(46, a1)} L${pt(36, a1)} A36,36 0 0 0 ${pt(36, a0)} Z"/>`;
    const am = (a0 + a1) / 2;
    jewels += `<circle class="gd2" cx="${(c + Math.cos(am) * 41).toFixed(2)}" cy="${(c + Math.sin(am) * 41).toFixed(2)}" r="1.9"/>`;
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    petals += `<circle class="${i % 2 ? 'v1' : 'b1'}" cx="${(c + Math.cos(a) * 22).toFixed(2)}" cy="${(c + Math.sin(a) * 22).toFixed(2)}" r="13"/>`;
  }
  const book =
    '<path class="gd" d="M50,40 C42,35 31,34 24,36 L24,64 C31,62 42,63 50,68 Z"/>' +
    '<path class="gd2" d="M50,40 C58,35 69,34 76,36 L76,64 C69,62 58,63 50,68 Z"/>' +
    '<path class="cutline" d="M29,42 C35,41 41,42 46,44 M29,48 C35,47 41,48 46,50 M29,54 C35,53 41,54 46,56 M54,44 C59,42 65,41 71,42 M54,50 C59,48 65,47 71,48 M54,56 C59,54 65,53 71,54"/>' +
    '<path class="r2" d="M58,38 L58,58 L61,55 L64,58 L64,37 Z"/>';
  return `<svg class="sg" width="${size}" height="${size}" viewBox="0 0 100 100">` +
    `<circle class="lead" cx="50" cy="50" r="49"/>` +
    `<g class="glass">${ring}<circle class="b3" cx="50" cy="50" r="35"/>${petals}<circle class="n2" cx="50" cy="50" r="17"/>${jewels}</g>` +
    `<g class="glass">${book}</g></svg>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
  await page.goto('file://' + path.join(root, 'index.html'));
  await page.waitForTimeout(400);

  // App icon: 1024×1024, full bleed, no transparency (iOS rounds the corners itself).
  await page.evaluate((svg) => {
    document.body.style.cssText = 'margin:0;padding:0;background:#163a6e';
    document.body.innerHTML =
      `<div style="width:1024px;height:1024px;display:grid;place-items:center;` +
      `background:radial-gradient(circle at 50% 45%, #2f6db3 0%, #163a6e 55%, #101c40 100%)">${svg}</div>`;
  }, roseWindow(880));
  await page.screenshot({ path: path.join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'), omitBackground: false });
  await page.screenshot({ path: path.join(root, 'appstore/icon-1024.png') });

  // Launch image: 2732×2732, shown "aspect fill", so the emblem stays in the centre.
  const page2 = await browser.newPage({ viewport: { width: 1366, height: 1366 }, deviceScaleFactor: 2 });
  await page2.goto('file://' + path.join(root, 'index.html'));
  await page2.waitForTimeout(400);
  await page2.evaluate((svg) => {
    document.body.style.cssText = 'margin:0;padding:0;background:#dfe5da';
    document.body.innerHTML =
      `<div style="width:1366px;height:1366px;display:grid;place-items:center;background:#dfe5da">` +
      `<div style="display:grid;justify-items:center;gap:22px">${svg}` +
      `<div style="font:400 54px/1 UnifrakturMaguntia, Georgia, serif;color:#1f2b25">The Fable <span style="color:#8a6418">Loom</span></div></div></div>`;
  }, roseWindow(260));
  await page2.waitForTimeout(300);
  for (const n of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    await page2.screenshot({ path: path.join(root, 'ios/App/App/Assets.xcassets/Splash.imageset', n) });
  }
  await browser.close();
})();
