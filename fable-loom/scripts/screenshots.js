// Captures App Store screenshots at Apple's required sizes:
//   iPhone 6.9" display: 1320×2868   iPad 13" display: 2064×2752
// Usage: node scripts/screenshots.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const DEVICES = [
  { dir: 'iphone-6.9', viewport: { width: 440, height: 956 }, scale: 3 },
  { dir: 'ipad-13', viewport: { width: 1032, height: 1376 }, scale: 2 }
];
const SAMPLE_SHELF = [
  ['courage', 'fox', 5], ['patience', 'tortoise', 317], ['honesty', 'crow', 334], ['teamwork', 'ant', 351],
  ['generosity', 'bear', 368], ['kindness', 'elephant', 385], ['prudence', 'owl', 402], ['gratitude', 'hare', 419]
];

(async () => {
  const browser = await chromium.launch();
  for (const d of DEVICES) {
    const out = path.join(root, 'appstore/screenshots', d.dir);
    fs.mkdirSync(out, { recursive: true });
    const page = await browser.newPage({ viewport: d.viewport, deviceScaleFactor: d.scale, hasTouch: true, isMobile: true });
    await page.goto('file://' + path.join(root, 'index.html'));
    await page.evaluate((shelf) => {
      const items = shelf.map(([lesson, kind, seed]) => {
        const f = FableEngine.generate({ seed, lesson, kind });
        return { title: f.title, lessonName: f.lesson.name, params: { seed, lesson, kind, name: '' } };
      });
      localStorage.setItem('fable-loom-shelf', JSON.stringify(items));
    }, SAMPLE_SHELF);
    await page.goto('file://' + path.join(root, 'index.html') + '#fable-5-courage-fox');
    await page.reload();
    await page.evaluate(() => {
      document.documentElement.classList.add('native');
      document.getElementById('btn-link').textContent = 'Share';   // as the button reads in the iOS app
    });
    await page.waitForTimeout(900);

    const shot = async (name, selector, offset) => {
      await page.evaluate(([sel, off]) => {
        const el = sel ? document.querySelector(sel) : null;
        window.scrollTo(0, el ? el.getBoundingClientRect().top + window.scrollY - off : 0);
      }, [selector, offset]);
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(out, name) });
    };
    await shot('1-window.png', d.dir === 'ipad-13' ? null : '.tale h2', 24);
    await shot('2-story.png', '.tale p.section:nth-of-type(4)', 24);
    // On iPad the moral and the shelf fit on one screen, so the shelf shot covers both.
    if (d.dir !== 'ipad-13') await shot('3-moral.png', '.moral', 120);
    await shot('4-shelf.png', '#bookshelf', d.dir === 'ipad-13' ? 700 : 160);
    if (d.dir !== 'ipad-13') await shot('5-choose.png', null, 0);
    await page.emulateMedia({ colorScheme: 'dark' });
    await shot(d.dir === 'ipad-13' ? '5-dark.png' : '6-dark.png', d.dir === 'ipad-13' ? null : '.window', 140);
    await page.close();
  }
  await browser.close();
  console.log('Screenshots written to appstore/screenshots/');
})();
