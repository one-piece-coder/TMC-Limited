// Copies the web app into www/, the folder Capacitor packages into the iOS app.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
const items = ['index.html', 'privacy.html', 'css', 'js', 'fonts'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const item of items) {
  fs.cpSync(path.join(root, item), path.join(out, item), { recursive: true });
}
console.log('Built www/ with', items.join(', '));
