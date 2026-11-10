'use strict';

/* =========================================================
   Meal Planner — breakfast / lunch / dinner, day/week/month,
   with an automatic meal generator. Data is kept in localStorage.
   ========================================================= */

const SLOTS = ['breakfast', 'lunch', 'dinner'];
const SLOT_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const STORE_KEY = 'mealPlanner.v1';

// [name, types (b/l/d), vegetarian, quick (<= 30 min)]
const DEFAULT_MEALS = [
  // Breakfast
  ['Scrambled eggs & toast', 'b', 1, 1],
  ['Overnight oats', 'b', 1, 1],
  ['Greek yogurt parfait', 'b', 1, 1],
  ['Avocado toast', 'b', 1, 1],
  ['Pancakes', 'b', 1, 0],
  ['Waffles with berries', 'b', 1, 0],
  ['Breakfast burrito', 'bl', 0, 1],
  ['Veggie omelette', 'b', 1, 1],
  ['Banana smoothie bowl', 'b', 1, 1],
  ['Bagel & cream cheese', 'b', 1, 1],
  ['French toast', 'b', 1, 0],
  ['Bacon, eggs & hash browns', 'b', 0, 0],
  ['Oatmeal with apples & cinnamon', 'b', 1, 1],
  ['Breakfast sandwich', 'b', 0, 1],
  ['Shakshuka', 'bd', 1, 0],
  ['Peanut butter banana toast', 'b', 1, 1],
  ['Chia pudding', 'b', 1, 1],
  ['Huevos rancheros', 'b', 1, 0],
  ['Egg muffin cups', 'b', 1, 0],
  ['Granola & milk', 'b', 1, 1],
  // Lunch
  ['Turkey club sandwich', 'l', 0, 1],
  ['Chicken Caesar salad', 'l', 0, 1],
  ['Tomato soup & grilled cheese', 'l', 1, 1],
  ['Chicken wrap', 'l', 0, 1],
  ['Quinoa power bowl', 'l', 1, 1],
  ['Tuna salad sandwich', 'l', 0, 1],
  ['Caprese panini', 'l', 1, 1],
  ['Chicken noodle soup', 'ld', 0, 0],
  ['Greek salad with pita', 'l', 1, 1],
  ['Burrito bowl', 'ld', 0, 1],
  ['BLT', 'l', 0, 1],
  ['Hummus & veggie wrap', 'l', 1, 1],
  ['Cobb salad', 'l', 0, 1],
  ['Lentil soup', 'ld', 1, 0],
  ['Chicken quesadilla', 'ld', 0, 1],
  ['Egg salad sandwich', 'l', 1, 1],
  ['Asian chicken salad', 'l', 0, 1],
  ['Black bean soup', 'ld', 1, 0],
  ['Pasta salad', 'l', 1, 1],
  ['Sushi bowl', 'l', 0, 1],
  // Dinner
  ['Spaghetti bolognese', 'd', 0, 0],
  ['Chicken stir-fry', 'd', 0, 1],
  ['Tacos', 'ld', 0, 1],
  ['Baked salmon & roasted vegetables', 'd', 0, 1],
  ['Homemade pizza', 'd', 1, 0],
  ['Beef chili', 'd', 0, 0],
  ['Chicken fajitas', 'd', 0, 1],
  ['Vegetable curry with rice', 'd', 1, 0],
  ['Grilled steak & potatoes', 'd', 0, 0],
  ['Teriyaki chicken & rice', 'd', 0, 1],
  ['Shrimp scampi', 'd', 0, 1],
  ['Lasagna', 'd', 0, 0],
  ['Mushroom risotto', 'd', 1, 0],
  ['Burgers & sweet potato fries', 'd', 0, 0],
  ['Pork chops & applesauce', 'd', 0, 0],
  ['Chicken Alfredo', 'd', 0, 1],
  ['Stuffed bell peppers', 'd', 0, 0],
  ['Veggie fried rice', 'ld', 1, 1],
  ['Sheet-pan chicken & veggies', 'd', 0, 0],
  ['Beef & broccoli', 'd', 0, 1],
  ['Eggplant parmesan', 'd', 1, 0],
  ['Fish tacos', 'd', 0, 1],
  ['Roast chicken', 'd', 0, 0],
  ['Pad thai', 'd', 0, 1],
  ['Chickpea & spinach stew', 'd', 1, 1],
  ['Meatloaf & mashed potatoes', 'd', 0, 0],
  ['Pesto pasta with peas', 'ld', 1, 1],
  ['BBQ pulled pork sandwiches', 'd', 0, 0],
  ['Black bean enchiladas', 'd', 1, 0],
  ['Lemon garlic shrimp & orzo', 'd', 0, 1],
];

function buildDefaultLibrary() {
  return DEFAULT_MEALS.map(([name, t, veg, quick], i) => ({
    id: 'd' + i,
    name,
    types: SLOTS.filter((s) => t.includes(s[0])),
    veg: !!veg,
    quick: !!quick,
  }));
}

/* ---------------- State ---------------- */

const state = {
  view: 'week',
  cursor: startOfDay(new Date()),
  weekStart: 0,
  plans: {},     // { 'YYYY-MM-DD': { breakfast: {name, note}, ... } }
  library: [],
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (raw) {
      state.plans = raw.plans || {};
      state.library = Array.isArray(raw.library) ? raw.library : buildDefaultLibrary();
      state.weekStart = raw.weekStart === 1 ? 1 : 0;
      if (['day', 'week', 'month'].includes(raw.view)) state.view = raw.view;
      return;
    }
  } catch (e) { /* storage blocked or corrupt — fall through to defaults */ }
  state.library = buildDefaultLibrary();
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      plans: state.plans,
      library: state.library,
      weekStart: state.weekStart,
      view: state.view,
    }));
  } catch (e) {
    toast('Could not save — browser storage is unavailable');
  }
}

/* ---------------- Date helpers ---------------- */

function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function key(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function sameDay(a, b) { return key(a) === key(b); }
function startOfWeek(d) { return addDays(d, -((d.getDay() - state.weekStart + 7) % 7)); }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function daysBetween(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
const fmt = (d, opts) => d.toLocaleDateString(undefined, opts);

function currentRange(view = state.view) {
  const c = state.cursor;
  if (view === 'day') return [c, c];
  if (view === 'week') { const s = startOfWeek(c); return [s, addDays(s, 6)]; }
  return [startOfMonth(c), endOfMonth(c)];
}

/* ---------------- Plan access ---------------- */

function getMeal(dateKey, slot) { return state.plans[dateKey]?.[slot] || null; }
function setMeal(dateKey, slot, meal) {
  if (meal && meal.name) {
    state.plans[dateKey] = state.plans[dateKey] || {};
    state.plans[dateKey][slot] = { name: meal.name, note: meal.note || '' };
  } else if (state.plans[dateKey]) {
    delete state.plans[dateKey][slot];
    if (!Object.keys(state.plans[dateKey]).length) delete state.plans[dateKey];
  }
}

/* ---------------- Rendering ---------------- */

const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function slotButton(dateKey, slot) {
  const m = getMeal(dateKey, slot);
  return `<button class="slot ${m ? 'filled' : ''}" data-slot="${slot}" data-date="${dateKey}">
    <span class="label">${SLOT_LABEL[slot]}</span>
    <span class="name ${m ? '' : 'empty'}">${m ? esc(m.name) : 'Add a meal'}</span>
    ${m && m.note ? `<span class="note">${esc(m.note)}</span>` : ''}
  </button>`;
}

function render() {
  document.querySelectorAll('.view-switch button').forEach((b) =>
    b.classList.toggle('active', b.dataset.view === state.view));

  const [from, to] = currentRange();
  const today = startOfDay(new Date());
  const title = $('#period-title');

  if (state.view === 'day') {
    title.textContent = fmt(state.cursor, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const k = key(state.cursor);
    view.innerHTML = `<div class="day-view">
      ${SLOTS.map((s) => slotButton(k, s)).join('')}
      <div class="day-tools">
        <button data-action="gen-day" class="primary">✨ Generate this day</button>
        <button data-action="clear-day" class="danger">Clear day</button>
      </div>
    </div>`;
  } else if (state.view === 'week') {
    const sameMonth = from.getMonth() === to.getMonth();
    title.textContent = sameMonth
      ? `${fmt(from, { month: 'long', day: 'numeric' })} – ${to.getDate()}, ${to.getFullYear()}`
      : `${fmt(from, { month: 'short', day: 'numeric' })} – ${fmt(to, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    view.innerHTML = `<div class="week-view">${daysBetween(from, to).map((d) => {
      const k = key(d);
      return `<section class="week-day ${sameDay(d, today) ? 'today' : ''}">
        <header><a href="#" data-goto="${k}">${fmt(d, { weekday: 'short' })}</a><span class="dnum">${fmt(d, { month: 'short', day: 'numeric' })}</span></header>
        ${SLOTS.map((s) => slotButton(k, s)).join('')}
      </section>`;
    }).join('')}</div>`;
  } else {
    title.textContent = fmt(state.cursor, { month: 'long', year: 'numeric' });
    const gridStart = startOfWeek(from);
    const gridEnd = addDays(startOfWeek(to), 6);
    const dows = daysBetween(gridStart, addDays(gridStart, 6)).map((d) =>
      `<div class="month-dow">${fmt(d, { weekday: 'short' })}</div>`).join('');
    const cells = daysBetween(gridStart, gridEnd).map((d) => {
      const k = key(d);
      const cls = [d.getMonth() !== from.getMonth() && 'other', sameDay(d, today) && 'today'].filter(Boolean).join(' ');
      const minis = SLOTS.map((s) => {
        const m = getMeal(k, s);
        return m ? `<span class="mini" data-slot="${s}" title="${SLOT_LABEL[s]}: ${esc(m.name)}">${esc(m.name)}</span>` : '';
      }).join('');
      const dots = SLOTS.map((s) => `<i data-slot="${s}" class="${getMeal(k, s) ? '' : 'off'}"></i>`).join('');
      return `<button class="month-cell ${cls}" data-goto="${k}">
        <span class="dnum">${d.getDate()}</span>${minis}<span class="dots">${dots}</span>
      </button>`;
    }).join('');
    view.innerHTML = `<div class="month-view">${dows}${cells}</div>`;
  }

  // Stats: how many slots are planned in the visible range
  const days = daysBetween(from, to);
  const filled = days.reduce((n, d) => n + SLOTS.filter((s) => getMeal(key(d), s)).length, 0);
  $('#period-stats').textContent = `${filled} / ${days.length * 3} meals planned`;
}

/* ---------------- Navigation ---------------- */

function shift(dir) {
  const c = state.cursor;
  if (state.view === 'day') state.cursor = addDays(c, dir);
  else if (state.view === 'week') state.cursor = addDays(c, 7 * dir);
  else {
    // Keep day-of-month in range when moving months
    const target = new Date(c.getFullYear(), c.getMonth() + dir, 1);
    const last = endOfMonth(target).getDate();
    state.cursor = new Date(target.getFullYear(), target.getMonth(), Math.min(c.getDate(), last));
  }
  render();
}

function setView(v) { state.view = v; save(); render(); }

/* ---------------- Meal generator ---------------- */

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/**
 * Fill each requested slot in [from, to] with a meal from the library.
 * - Respects filters (vegetarian / quick).
 * - Avoids repeating the same meal within `noRepeat` days (looking at
 *   both existing plans and meals chosen during this run).
 * - Falls back to the least-recently-used option if the library is too small.
 */
function generate({ from, to, slots, onlyEmpty = true, veg = false, quick = false, noRepeat = 5, leftovers = false }) {
  const pool = state.library.filter((m) => (!veg || m.veg) && (!quick || m.quick));
  let count = 0;
  const missing = new Set();

  // Last date (as day index) each meal name was used, seeded with plans before the range
  const lastUsed = new Map();
  const dayIndex = (d) => Math.round(d.getTime() / 86400000);
  const lookback = addDays(from, -Math.max(noRepeat, 1));
  for (const d of daysBetween(lookback, addDays(from, -1))) {
    for (const s of SLOTS) {
      const m = getMeal(key(d), s);
      if (m) lastUsed.set(m.name.toLowerCase(), dayIndex(d));
    }
  }

  for (const d of daysBetween(from, to)) {
    const k = key(d);
    const di = dayIndex(d);
    // Count meals already on this day so we don't duplicate within the day
    const todays = new Set(SLOTS.map((s) => getMeal(k, s)?.name.toLowerCase()).filter(Boolean));

    for (const slot of SLOTS) {
      const existing = getMeal(k, slot);
      if (!slots.includes(slot) || (onlyEmpty && existing)) {
        if (existing) lastUsed.set(existing.name.toLowerCase(), di);
        continue;
      }
      if (existing) todays.delete(existing.name.toLowerCase());

      // Leftovers: reuse yesterday's dinner for lunch
      if (leftovers && slot === 'lunch') {
        const y = getMeal(key(addDays(d, -1)), 'dinner');
        if (y) {
          setMeal(k, slot, { name: y.name, note: 'Leftovers' });
          todays.add(y.name.toLowerCase());
          count++;
          continue;
        }
      }

      const candidates = pool.filter((m) => m.types.includes(slot) && !todays.has(m.name.toLowerCase()));
      if (!candidates.length) { missing.add(slot); continue; }

      const fresh = candidates.filter((m) => {
        const last = lastUsed.get(m.name.toLowerCase());
        return last === undefined || di - last > noRepeat;
      });
      let choice;
      if (fresh.length) choice = pick(fresh);
      else {
        // Least recently used
        const oldest = Math.min(...candidates.map((m) => lastUsed.get(m.name.toLowerCase()) ?? -Infinity));
        choice = pick(candidates.filter((m) => (lastUsed.get(m.name.toLowerCase()) ?? -Infinity) === oldest));
      }

      setMeal(k, slot, { name: choice.name });
      lastUsed.set(choice.name.toLowerCase(), di);
      todays.add(choice.name.toLowerCase());
      count++;
    }
  }
  save();
  render();
  let msg = count ? `Generated ${count} meal${count === 1 ? '' : 's'} ✨` : 'Nothing to fill — all slots already planned';
  if (missing.size) msg += ` (no ${[...missing].join('/')} options match your filters)`;
  toast(msg);
}

function clearRange(from, to, slots = SLOTS) {
  for (const d of daysBetween(from, to)) for (const s of slots) setMeal(key(d), s, null);
  save();
  render();
}

/* ---------------- Slot editor dialog ---------------- */

const dlgSlot = $('#dlg-slot');
let editing = null;

function openSlot(dateKey, slot) {
  editing = { dateKey, slot };
  const m = getMeal(dateKey, slot);
  $('#slot-title').textContent = `${SLOT_LABEL[slot]} · ${fmt(parseKey(dateKey), { weekday: 'long', month: 'short', day: 'numeric' })}`;
  $('#slot-name').value = m?.name || '';
  $('#slot-note').value = m?.note || '';
  const options = state.library.filter((x) => x.types.includes(slot)).sort((a, b) => a.name.localeCompare(b.name));
  $('#slot-options').innerHTML = options.map((o) => `<option value="${esc(o.name)}"></option>`).join('');
  // Show a handful of random suggestions as one-tap chips
  const shuffled = options.slice().sort(() => Math.random() - 0.5).slice(0, 8);
  $('#slot-suggestions').innerHTML = shuffled.map((o) => `<button type="button" data-suggest="${esc(o.name)}">${esc(o.name)}</button>`).join('');
  dlgSlot.showModal();
  $('#slot-name').focus();
}

$('#slot-suggestions').addEventListener('click', (e) => {
  const b = e.target.closest('[data-suggest]');
  if (b) $('#slot-name').value = b.dataset.suggest;
});
$('#slot-random').addEventListener('click', () => {
  const opts = state.library.filter((x) => x.types.includes(editing.slot) && x.name !== $('#slot-name').value);
  if (opts.length) $('#slot-name').value = pick(opts).name;
});
$('#slot-clear').addEventListener('click', () => {
  setMeal(editing.dateKey, editing.slot, null);
  save(); render(); dlgSlot.close();
});
dlgSlot.addEventListener('close', () => {
  if (dlgSlot.returnValue === 'save' && editing) {
    const name = $('#slot-name').value.trim();
    setMeal(editing.dateKey, editing.slot, name ? { name, note: $('#slot-note').value.trim() } : null);
    save(); render();
  }
  dlgSlot.returnValue = '';
  editing = null;
});

/* ---------------- Generator dialog ---------------- */

const dlgGen = $('#dlg-generate');
const formGen = $('#form-generate');

function openGenerator(range = state.view) {
  formGen.range.value = range;
  const [from, to] = currentRange(range === 'custom' ? 'week' : range);
  formGen.from.value = key(from);
  formGen.to.value = key(to);
  syncCustom();
  dlgGen.showModal();
}
function syncCustom() {
  $('.custom-range', formGen).classList.toggle('show', formGen.range.value === 'custom');
}
formGen.addEventListener('change', (e) => {
  if (e.target.name === 'range') {
    syncCustom();
    if (e.target.value !== 'custom') {
      const [f, t] = currentRange(e.target.value);
      formGen.from.value = key(f); formGen.to.value = key(t);
    }
  }
});

function genRange() {
  if (formGen.range.value === 'custom') {
    if (!formGen.from.value || !formGen.to.value) return null;
    let f = parseKey(formGen.from.value), t = parseKey(formGen.to.value);
    if (f > t) [f, t] = [t, f];
    if ((t - f) / 86400000 > 366) { toast('Please choose a range of a year or less'); return null; }
    return [f, t];
  }
  return currentRange(formGen.range.value);
}
function genSlots() {
  return [...formGen.querySelectorAll('input[name=slot]:checked')].map((i) => i.value);
}

dlgGen.addEventListener('close', () => {
  if (dlgGen.returnValue !== 'go') return;
  dlgGen.returnValue = '';
  const r = genRange();
  const slots = genSlots();
  if (!r) return;
  if (!slots.length) { toast('Pick at least one meal to generate'); return; }
  generate({
    from: r[0], to: r[1], slots,
    onlyEmpty: formGen.onlyEmpty.checked,
    veg: formGen.vegetarian.checked,
    quick: formGen.quick.checked,
    noRepeat: Math.max(0, Math.min(30, parseInt(formGen.noRepeat.value, 10) || 0)),
    leftovers: formGen.leftovers.checked,
  });
});
$('#gen-clear').addEventListener('click', () => {
  const r = genRange();
  const slots = genSlots();
  if (!r || !slots.length) return;
  if (!confirm('Clear the selected meals in this range?')) return;
  clearRange(r[0], r[1], slots);
  dlgGen.close();
  toast('Cleared');
});

/* ---------------- Library dialog ---------------- */

const dlgLib = $('#dlg-library');
const formAdd = $('#form-add-meal');

function renderLibrary() {
  const q = $('#lib-search').value.trim().toLowerCase();
  const t = $('#lib-type').value;
  const items = state.library
    .filter((m) => (!q || m.name.toLowerCase().includes(q)) && (!t || m.types.includes(t)))
    .sort((a, b) => a.name.localeCompare(b.name));
  $('#lib-list').innerHTML = items.length ? items.map((m) => `<li>
      <span class="n">${esc(m.name)}${m.veg ? ' 🥦' : ''}${m.quick ? ' ⚡' : ''}</span>
      ${m.types.map((s) => `<span class="tag ${s}">${s[0].toUpperCase()}</span>`).join('')}
      <button data-del="${esc(m.id)}" aria-label="Remove ${esc(m.name)}">✕</button>
    </li>`).join('') : '<li class="muted">No meals found</li>';
}

formAdd.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = formAdd.name.value.trim();
  const types = [...formAdd.querySelectorAll('input[name=type]:checked')].map((i) => i.value);
  if (!name) return;
  if (!types.length) { toast('Choose breakfast, lunch and/or dinner'); return; }
  if (state.library.some((m) => m.name.toLowerCase() === name.toLowerCase())) { toast('That meal is already in your library'); return; }
  state.library.push({ id: 'u' + Date.now().toString(36), name, types, veg: formAdd.veg.checked, quick: formAdd.quick.checked });
  save();
  formAdd.name.value = '';
  renderLibrary();
  toast(`Added “${name}”`);
});
$('#lib-list').addEventListener('click', (e) => {
  const b = e.target.closest('[data-del]');
  if (!b) return;
  state.library = state.library.filter((m) => m.id !== b.dataset.del);
  save();
  renderLibrary();
});
$('#lib-search').addEventListener('input', renderLibrary);
$('#lib-type').addEventListener('change', renderLibrary);

/* ---------------- More / settings ---------------- */

const dlgMore = $('#dlg-more');
$('#opt-weekstart').addEventListener('change', (e) => {
  state.weekStart = Number(e.target.value);
  save(); render();
});
$('#btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ plans: state.plans, library: state.library, weekStart: state.weekStart }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `meal-plan-${key(new Date())}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('#file-import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (typeof data.plans !== 'object' || !Array.isArray(data.library)) throw new Error('bad file');
    state.plans = data.plans;
    state.library = data.library;
    if (data.weekStart === 0 || data.weekStart === 1) state.weekStart = data.weekStart;
    save(); render();
    dlgMore.close();
    toast('Backup imported');
  } catch {
    toast('That file is not a valid meal plan backup');
  }
  e.target.value = '';
});
$('#btn-reset-lib').addEventListener('click', () => {
  if (!confirm('Replace your meal library with the default meals? Your planned meals are kept.')) return;
  state.library = buildDefaultLibrary();
  save();
  toast('Default library restored');
});
$('#btn-wipe').addEventListener('click', () => {
  if (!confirm('Erase every planned meal? This cannot be undone.')) return;
  state.plans = {};
  save(); render();
  dlgMore.close();
  toast('All planned meals erased');
});

/* ---------------- Global events ---------------- */

document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
// Click on the backdrop closes a dialog
document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

document.querySelector('.view-switch').addEventListener('click', (e) => {
  const b = e.target.closest('[data-view]');
  if (b) setView(b.dataset.view);
});
$('#btn-prev').addEventListener('click', () => shift(-1));
$('#btn-next').addEventListener('click', () => shift(1));
$('#btn-today').addEventListener('click', () => { state.cursor = startOfDay(new Date()); render(); });
$('#btn-generate').addEventListener('click', () => openGenerator());
$('#btn-library').addEventListener('click', () => { renderLibrary(); dlgLib.showModal(); });
$('#btn-more').addEventListener('click', () => { $('#opt-weekstart').value = String(state.weekStart); dlgMore.showModal(); });

view.addEventListener('click', (e) => {
  const slot = e.target.closest('.slot');
  if (slot) { openSlot(slot.dataset.date, slot.dataset.slot); return; }
  const go = e.target.closest('[data-goto]');
  if (go) { e.preventDefault(); state.cursor = parseKey(go.dataset.goto); setView('day'); return; }
  const act = e.target.closest('[data-action]');
  if (act?.dataset.action === 'gen-day') {
    generate({ from: state.cursor, to: state.cursor, slots: SLOTS, onlyEmpty: true, noRepeat: 5 });
  } else if (act?.dataset.action === 'clear-day') {
    clearRange(state.cursor, state.cursor);
  }
});

// Keyboard shortcuts (ignored while typing or when a dialog is open)
document.addEventListener('keydown', (e) => {
  if (document.querySelector('dialog[open]') || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const map = { ArrowLeft: () => shift(-1), ArrowRight: () => shift(1), t: () => $('#btn-today').click(),
    d: () => setView('day'), w: () => setView('week'), m: () => setView('month'), g: () => openGenerator() };
  if (map[e.key]) { e.preventDefault(); map[e.key](); }
});

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

load();
render();
