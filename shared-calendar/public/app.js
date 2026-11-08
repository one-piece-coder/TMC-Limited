'use strict';

const $ = (s) => document.querySelector(s);
const state = { user: null, users: [], events: [], cursor: startOfMonth(new Date()), editingId: null };

// ---------- date helpers ----------
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function parseIso(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`;
}
function fmtDate(s) { return parseIso(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }
function occursOn(e, day) { return e.date <= day && day <= (e.endDate || e.date); }
function sortEvents(a, b) {
  return a.date.localeCompare(b.date) || (a.allDay === b.allDay ? 0 : a.allDay ? -1 : 1) || a.start.localeCompare(b.start);
}
function colorFor(user) {
  const i = state.users.indexOf(user);
  return `var(--u${(i < 0 ? 0 : i) % 4})`;
}

// ---------- api ----------
async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/login') { showLogin(); throw new Error('Signed out'); }
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

// ---------- auth ----------
function showLogin() {
  $('#app').hidden = true;
  $('#login').hidden = false;
  $('#loginForm [name=name]').focus();
}

$('#loginForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = ev.target;
  $('#loginError').textContent = '';
  try {
    await api('/api/login', { method: 'POST', body: { name: f.name.value, password: f.password.value } });
    f.reset();
    await boot();
  } catch (err) { $('#loginError').textContent = err.message; }
});

$('#logout').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' }).catch(() => {});
  if (stream) stream.close();
  showLogin();
});

// ---------- rendering ----------
function render() {
  const c = state.cursor;
  $('#monthLabel').textContent = c.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const grid = $('#grid');
  grid.innerHTML = '';
  const first = new Date(c.getFullYear(), c.getMonth(), 1 - c.getDay());
  const todayIso = iso(new Date());
  const weeks = Math.ceil((c.getDay() + new Date(c.getFullYear(), c.getMonth() + 1, 0).getDate()) / 7);

  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
    const day = iso(d);
    const cell = document.createElement('div');
    cell.className = 'day' + (d.getMonth() !== c.getMonth() ? ' other' : '') + (day === todayIso ? ' today' : '');
    cell.dataset.date = day;
    cell.setAttribute('role', 'button');
    cell.setAttribute('aria-label', `${fmtDate(day)} — add event`);
    cell.tabIndex = 0;

    const num = document.createElement('div');
    num.className = 'num';
    num.textContent = d.getDate();
    cell.append(num);

    const dayEvents = state.events.filter((e) => occursOn(e, day)).sort(sortEvents);
    const max = 3;
    dayEvents.slice(0, max).forEach((e) => cell.append(chip(e)));
    if (dayEvents.length > max) {
      const more = document.createElement('div');
      more.className = 'more';
      more.textContent = `+${dayEvents.length - max} more`;
      cell.append(more);
    }
    grid.append(cell);
  }
  renderAgenda();
}

function chip(e) {
  const el = document.createElement('div');
  el.className = 'chip ' + e.type;
  el.style.setProperty('--c', colorFor(e.createdBy));
  el.title = `${e.title}${e.allDay ? '' : ' · ' + fmtTime(e.start)} (added by ${e.createdBy})`;
  if (!e.allDay) { const b = document.createElement('b'); b.textContent = fmtTime(e.start); el.append(b); }
  el.append(document.createTextNode(e.title));
  el.dataset.id = e.id;
  return el;
}

function renderAgenda() {
  const list = $('#agendaList');
  list.innerHTML = '';
  const today = iso(new Date());
  const upcoming = state.events.filter((e) => (e.endDate || e.date) >= today).sort(sortEvents).slice(0, 30);
  if (!upcoming.length) {
    list.innerHTML = '<li class="empty">Nothing coming up. Click any day to add something.</li>';
    return;
  }
  for (const e of upcoming) {
    const li = document.createElement('li');
    li.style.setProperty('--c', colorFor(e.createdBy));
    li.dataset.id = e.id;
    const range = e.endDate && e.endDate !== e.date ? `${fmtDate(e.date)} – ${fmtDate(e.endDate)}` : fmtDate(e.date);
    const time = e.allDay ? 'All day' : fmtTime(e.start) + (e.end ? '–' + fmtTime(e.end) : '');
    li.innerHTML = `<div class="when"></div><div class="what"></div><div class="when where"></div>`;
    li.querySelector('.when').textContent = `${range} · ${time}`;
    li.querySelector('.what').textContent = e.title;
    if (e.type === 'appointment') {
      const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = 'Appt'; li.querySelector('.what').append(tag);
    }
    li.querySelector('.where').textContent = [e.location, `by ${e.createdBy}`].filter(Boolean).join(' · ');
    list.append(li);
  }
}

function renderLegend() {
  $('#legend').innerHTML = '';
  for (const u of state.users) {
    const s = document.createElement('span');
    const i = document.createElement('i'); i.style.background = colorFor(u);
    s.append(i, document.createTextNode(u === state.user ? `${u} (you)` : u));
    $('#legend').append(s);
  }
}

// ---------- dialog ----------
const dialog = $('#dialog');
const form = $('#eventForm');

function openDialog({ date, event } = {}) {
  form.reset();
  $('#formError').textContent = '';
  state.editingId = event ? event.id : null;
  $('#dialogTitle').textContent = event ? 'Edit' : 'New event';
  $('#deleteBtn').hidden = !event;
  const e = event || { type: 'event', date: date || iso(new Date()), endDate: '', allDay: false, start: '09:00', end: '10:00' };
  form.type.value = e.type;
  form.title.value = e.title || '';
  form.date.value = e.date;
  form.endDate.value = e.endDate && e.endDate !== e.date ? e.endDate : '';
  form.allDay.checked = !!e.allDay;
  form.start.value = e.start || '';
  form.end.value = e.end || '';
  form.location.value = e.location || '';
  form.notes.value = e.notes || '';
  $('#meta').textContent = event
    ? `Added by ${event.createdBy}` + (event.updatedBy !== event.createdBy || event.updatedAt !== event.createdAt
      ? ` · last edited by ${event.updatedBy} ${new Date(event.updatedAt).toLocaleString()}` : '')
    : '';
  syncAllDay();
  dialog.showModal();
  form.title.focus();
}
function syncAllDay() { form.querySelector('.times').hidden = form.allDay.checked; }
form.allDay.addEventListener('change', syncAllDay);
form.type.forEach?.((r) => r.addEventListener('change', () => {
  if (!state.editingId) $('#dialogTitle').textContent = r.value === 'appointment' ? 'New appointment' : 'New event';
}));

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const body = {
    type: form.type.value, title: form.title.value, date: form.date.value, endDate: form.endDate.value,
    allDay: form.allDay.checked, start: form.start.value, end: form.end.value,
    location: form.location.value, notes: form.notes.value,
  };
  try {
    $('#saveBtn').disabled = true;
    if (state.editingId) await api(`/api/events/${state.editingId}`, { method: 'PUT', body });
    else await api('/api/events', { method: 'POST', body });
    dialog.close();
    await loadEvents();
  } catch (err) { $('#formError').textContent = err.message; }
  finally { $('#saveBtn').disabled = false; }
});

$('#deleteBtn').addEventListener('click', async () => {
  if (!state.editingId || !confirm('Delete this from the shared calendar?')) return;
  try {
    await api(`/api/events/${state.editingId}`, { method: 'DELETE' });
    dialog.close();
    await loadEvents();
  } catch (err) { $('#formError').textContent = err.message; }
});
$('#cancelBtn').addEventListener('click', () => dialog.close());

// ---------- interactions ----------
function findEvent(id) { return state.events.find((e) => e.id === id); }

$('#grid').addEventListener('click', (ev) => {
  const c = ev.target.closest('.chip');
  if (c) return openDialog({ event: findEvent(c.dataset.id) });
  const day = ev.target.closest('.day');
  if (day) openDialog({ date: day.dataset.date });
});
$('#grid').addEventListener('keydown', (ev) => {
  const day = ev.target.closest('.day');
  if (day && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); openDialog({ date: day.dataset.date }); }
});
$('#agendaList').addEventListener('click', (ev) => {
  const li = ev.target.closest('li[data-id]');
  if (li) openDialog({ event: findEvent(li.dataset.id) });
});
$('#addBtn').addEventListener('click', () => openDialog());
$('#prev').addEventListener('click', () => { state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() - 1, 1); render(); });
$('#next').addEventListener('click', () => { state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + 1, 1); render(); });
$('#today').addEventListener('click', () => { state.cursor = startOfMonth(new Date()); render(); });

// ---------- live sync ----------
let stream = null;
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3000);
}
function connectStream() {
  if (stream) stream.close();
  stream = new EventSource('/api/stream');
  stream.onmessage = async (m) => {
    const msg = JSON.parse(m.data);
    await loadEvents();
    if (msg.by !== state.user) toast(`${msg.by} ${msg.kind} an item`);
  };
}

async function loadEvents() {
  state.events = await api('/api/events');
  render();
}

async function boot() {
  try {
    const me = await api('/api/me');
    state.user = me.user;
    state.users = me.users;
  } catch { return; }
  $('#login').hidden = true;
  $('#app').hidden = false;
  renderLegend();
  await loadEvents();
  connectStream();
}
boot();
