// Generates thousands of fables and checks that every template filled cleanly.
const assert = require('assert');
const E = require('../js/fables.js');

let count = 0;
for (let seed = 1; seed <= 2000; seed++) {
  for (const lesson of E.lessons) {
    const f = E.generate({ seed, lesson: lesson.id });
    const text = E.toPlainText(f);
    assert.ok(!/[{}]|undefined|'|"/.test(text), `seed ${seed} ${lesson.id} has a template error`);
    assert.strictEqual(f.sections.length, 8);
    assert.ok(f.moral && f.application);
    count++;
  }
}
const a = E.generate({ seed: 99, lesson: 'honesty', kind: 'fox', name: 'Tucker' });
const b = E.generate({ seed: 99, lesson: 'honesty', kind: 'fox', name: 'Tucker' });
assert.deepStrictEqual(a, b, 'same seed and settings give the same fable');
assert.strictEqual(a.hero.name, 'Tucker');
console.log(`ok: ${count} fables generated cleanly`);
