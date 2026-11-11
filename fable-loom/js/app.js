(function () {
  'use strict';
  const E = window.FableEngine;
  const A = window.FableArt;
  const $ = (id) => document.getElementById(id);
  const SHELF_KEY = 'fable-loom-shelf';

  const form = $('loom-form');
  const lessonSel = $('lesson');
  const kindSel = $('kind');
  const nameInput = $('hero-name');
  const tale = $('tale');
  const toast = $('toast');
  const readBtn = $('btn-read');

  let current = null;
  let shelfReady = false;
  let toastTimer = 0;

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const newSeed = () => 1 + Math.floor(Math.random() * 999999);

  E.lessons.forEach((l) => lessonSel.add(new Option(l.name, l.id)));
  E.creatures.forEach((c) => kindSel.add(new Option(cap(c), c)));

  // Rose-window preview of the chosen hero.
  const preview = $('kind-preview');
  const drawPreview = () => { preview.innerHTML = A.portrait(kindSel.value); };
  kindSel.addEventListener('change', drawPreview);
  drawPreview();

  function say(msg) {
    toast.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.textContent = ''; }, 3500);
  }

  // ---------- Shareable links: #fable-<seed>-<lesson>-<creature>[-<name>] ----------
  function hashFor(f) {
    const safeName = f.hero.custom ? f.hero.name.replace(/[^A-Za-z]/g, '') : '';
    return 'fable-' + [f.seed, f.lesson.id, f.hero.kind].concat(safeName ? [safeName] : []).join('-');
  }
  function parseHash() {
    const m = /^#fable-(\d+)-([a-z]+)-([a-z]+)(?:-([A-Za-z]+))?$/.exec(location.hash);
    return m ? { seed: Number(m[1]), lesson: m[2], kind: m[3], name: m[4] || '' } : null;
  }

  // ---------- Rendering ----------
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function show(f) {
    current = f;
    stopReading();
    tale.replaceChildren();

    tale.append(el('h2', null, f.title));
    tale.append(el('p', 'byline',
      `A fable of ${f.lesson.name.toLowerCase()}, in which ${f.hero.name} the ${f.hero.kind} faces ${f.guardian}`));

    const fig = el('figure', 'window');
    fig.innerHTML = A.plate(f);
    fig.append(el('figcaption', null,
      `The window of ${f.hero.name}: the ${f.hero.kind} in ${f.realm}, ` +
      `with ${f.companion.name} the ${f.companion.kind} at left and ${f.prize} at right`));
    tale.append(fig);

    f.sections.forEach((s, i) => {
      const p = el('p', 'section');
      if (i > 0) {
        p.append(el('span', 'rubric', s.label + '. '));
      }
      p.append(document.createTextNode(s.text));
      tale.append(p);
    });

    const moral = el('section', 'moral');
    moral.insertAdjacentHTML('beforeend', A.portrait(f.hero.kind));
    moral.append(el('h3', null, 'the moral'), el('p', null, f.moral));
    tale.append(moral);

    const lesson = el('section', 'lesson');
    lesson.append(el('h3', null, 'in your own life'), el('p', null, f.application));
    tale.append(lesson);

    $('folio-no').textContent = 'Fable No. ' + f.seed;
    $('folio-meta').textContent = `${f.lesson.name} · about ${f.minutes} min read`;
    document.title = f.title + ' · The Fable Loom';

    tale.classList.remove('fresh');
    void tale.offsetWidth;
    tale.classList.add('fresh');

    if (typeof drawShelf === 'function' && shelfReady) drawShelf();
    const h = '#' + hashFor(f);
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  function weave(seed) {
    show(E.generate({
      seed: seed || newSeed(),
      lesson: lessonSel.value,
      kind: kindSel.value,
      name: nameInput.value
    }));
  }

  function openFromParams(p) {
    lessonSel.value = E.lessons.some((l) => l.id === p.lesson) ? p.lesson : '';
    kindSel.value = E.creatures.includes(p.kind) ? p.kind : '';
    nameInput.value = p.name || '';
    drawPreview();
    show(E.generate(p));
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    weave();
    if (window.matchMedia('(max-width: 820px)').matches) {
      document.querySelector('.page').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  $('btn-again').addEventListener('click', () => {
    // Keep the same lesson and hero, tell a different tale.
    show(E.generate({
      seed: newSeed(),
      lesson: current.lesson.id,
      kind: current.hero.kind,
      name: current.hero.custom ? current.hero.name : ''
    }));
  });

  // ---------- Copying ----------
  function copy(text, done) {
    const fallback = () => {
      const ta = el('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.append(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      say(ok ? done : 'Copying is blocked here. Select the text on the page and copy it yourself.');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => say(done), fallback);
    } else {
      fallback();
    }
  }
  $('btn-copy').addEventListener('click', () => copy(E.toPlainText(current), 'Fable copied'));
  $('btn-link').addEventListener('click', () => {
    const url = location.href.split('#')[0] + '#' + hashFor(current);
    copy(url, 'Link copied. Anyone who opens it reads this same fable.');
  });

  // ---------- Reading aloud ----------
  const synth = window.speechSynthesis;
  if (synth && typeof SpeechSynthesisUtterance !== 'undefined') readBtn.hidden = false;

  function stopReading() {
    if (synth && (synth.speaking || synth.pending)) synth.cancel();
    readBtn.textContent = 'Read aloud';
  }
  readBtn.addEventListener('click', () => {
    if (synth.speaking) { stopReading(); return; }
    const text = [current.title, ...current.sections.map((s) => s.text),
      'The moral. ' + current.moral, 'In your own life. ' + current.application].join('\n\n');
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.onend = u.onerror = () => { readBtn.textContent = 'Read aloud'; };
    synth.speak(u);
    readBtn.textContent = 'Stop reading';
  });

  // ---------- The shelf (saved in this browser only) ----------
  function loadShelf() {
    try { return JSON.parse(localStorage.getItem(SHELF_KEY)) || []; } catch (err) { return []; }
  }
  function saveShelf(items) {
    try { localStorage.setItem(SHELF_KEY, JSON.stringify(items)); return true; } catch (err) { return false; }
  }
  // Each saved fable is shown as a bound book cover.
  function coverFor(it, i, justBound) {
    const f = E.generate(it.params);
    const li = el('li', 'book-slot');
    const btn = el('button', 'cover');
    btn.type = 'button';
    btn.dataset.lesson = f.lesson.id;
    if (current && current.seed === f.seed && current.lesson.id === f.lesson.id && current.hero.kind === f.hero.kind) {
      btn.classList.add('reading');
      li.append(el('span', 'ribbon', 'reading'));
    }
    if (justBound) li.classList.add('just-bound');
    btn.setAttribute('aria-label', `Read ${f.title}, a fable of ${f.lesson.name.toLowerCase()}`);

    const frame = el('span', 'cover-frame');
    frame.append(el('span', 'cover-no', 'Fable No. ' + f.seed));
    frame.append(el('span', 'cover-title', f.title));
    const art = el('span', 'cover-art');
    art.innerHTML = A.portrait(f.hero.kind);
    frame.append(art);
    frame.append(el('span', 'cover-virtue', A.virtues[f.lesson.id] || f.lesson.name));
    frame.append(el('span', 'cover-hero', `${f.hero.name} the ${f.hero.kind}`));
    btn.append(frame);
    btn.addEventListener('click', () => {
      openFromParams(it.params);
      drawShelf();
      document.querySelector('.page').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    const rm = el('button', 'remove', '×');
    rm.type = 'button';
    rm.setAttribute('aria-label', 'Remove ' + f.title + ' from the shelf');
    rm.addEventListener('click', () => {
      const next = loadShelf();
      next.splice(i, 1);
      saveShelf(next);
      drawShelf();
    });
    li.append(btn, rm);
    return li;
  }

  function drawShelf(justBoundSeed) {
    const items = loadShelf();
    const row = $('shelf-row');
    row.replaceChildren();
    items.forEach((it, i) => row.append(coverFor(it, i, it.params.seed === justBoundSeed)));
    if (!items.length) {
      const empty = el('li', 'book-slot');
      const ph = el('div', 'cover placeholder');
      ph.append(el('span', 'cover-frame', 'An empty place on the shelf. Choose Save to shelf and the fable is bound here with its own cover.'));
      empty.append(ph);
      row.append(empty);
    }
    const n = items.length;
    $('shelf-count').textContent = n ? `${n} fable${n === 1 ? '' : 's'} bound and shelved.` : 'No fables saved yet.';
    $('bookshelf-sub').textContent = n ? 'Choose a cover to read that fable again.' : 'Saved fables appear here as books.';
  }

  const shelfRow = $('shelf-row');
  const scrollShelf = (dir) => shelfRow.scrollBy({ left: dir * shelfRow.clientWidth * 0.8, behavior: 'smooth' });
  $('shelf-prev').addEventListener('click', () => scrollShelf(-1));
  $('shelf-next').addEventListener('click', () => scrollShelf(1));
  $('shelf-jump').addEventListener('click', (e) => {
    e.preventDefault();
    $('bookshelf').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('btn-save').addEventListener('click', () => {
    const items = loadShelf();
    if (items.some((it) => it.title === current.title && it.params.seed === current.seed)) {
      say('This fable is already on your shelf');
      return;
    }
    items.unshift({
      title: current.title,
      lessonName: current.lesson.name,
      params: {
        seed: current.seed, lesson: current.lesson.id, kind: current.hero.kind,
        name: current.hero.custom ? current.hero.name : ''
      }
    });
    if (!saveShelf(items.slice(0, 30))) {
      say('This browser won’t let the page save. Copy the link instead.');
      return;
    }
    say('Bound and placed on your shelf');
    drawShelf(current.seed);
    shelfRow.scrollTo({ left: 0, behavior: 'smooth' });
    $('bookshelf').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // ---------- Start ----------
  window.addEventListener('hashchange', () => {
    const p = parseHash();
    if (p && (!current || p.seed !== current.seed || p.lesson !== current.lesson.id || p.kind !== current.hero.kind)) {
      openFromParams(p);
    }
  });

  shelfReady = true;
  const fromLink = parseHash();
  if (fromLink) openFromParams(fromLink);
  else show(E.generate({ seed: 1847 }));
  drawShelf();
})();
