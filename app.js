/* Doodle Steps app logic */
(() => {
const $ = id => document.getElementById(id);
const LEVELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const CATS = { animals: 'Animals', vehicles: 'Vehicles', food: 'Food', nature: 'Nature', fantasy: 'Fantasy', people: 'People', things: 'Things' };
const STAR = '<svg class="star" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8z"/></svg>';
const HEART = '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.6-9.3-9A5.3 5.3 0 0 1 12 6.2 5.3 5.3 0 0 1 21.3 12C19 16.4 12 21 12 21z" fill="currentColor"/></svg>';
const COLORS = [['Dark', '#1f2a44'], ['Red', '#ff5a5a'], ['Orange', '#ffa032'], ['Yellow', '#ffd93b'], ['Green', '#4fc26b'], ['Blue', '#3d8bff'], ['Purple', '#a86cff'], ['Pink', '#ff8fc2'], ['Brown', '#9c6b3f'], ['Grey', '#9aa3b5']];

/* ---------- saved state ---------- */
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('ds:' + k)) ?? d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ds:' + k, JSON.stringify(v)); } catch (e) {} }
};
let done = store.get('done', {});
let favs = store.get('favs', {});
let drawings = store.get('drawings', {});

/* ---------- helpers ---------- */
const stepMarkup = s => s.draw.join('');
const allMarkup = (L, cls = '') => L.steps.filter(s => !s.guide).map(s => `<g class="${cls}">${stepMarkup(s)}</g>`).join('');
const thumb = L => `<svg class="art" viewBox="0 0 300 300">${allMarkup(L)}</svg>`;
const starCount = () => Object.keys(done).length;

/* ---------- home ---------- */
let level = 'all', cat = 'all';
function renderCats() {
  const seen = new Set(LESSONS.map(l => l.category));
  $('cats').innerHTML = `<button type="button" data-cat="all" class="on">All</button>` +
    Object.entries(CATS).filter(([k]) => seen.has(k)).map(([k, v]) => `<button type="button" data-cat="${k}">${v}</button>`).join('');
  $('cats').querySelectorAll('button').forEach(b => b.onclick = () => { cat = b.dataset.cat; $('cats').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); renderGrid(); });
}
function renderGrid() {
  const list = LESSONS.filter(l => (level === 'all' || (level === 'fav' ? favs[l.id] : l.level === level)) && (cat === 'all' || l.category === cat));
  $('grid').innerHTML = list.map(L => `
    <div class="card" role="button" tabindex="0" data-id="${L.id}">
      ${done[L.id] ? STAR : ''}
      <button class="heart ${favs[L.id] ? 'on' : ''}" type="button" data-fav="${L.id}" aria-label="Favourite">${HEART}</button>
      <div class="thumb">${thumb(L)}</div>
      <div class="name"><span>${L.name}</span><i class="lvl ${L.level}"></i></div>
      <div class="steps">${L.steps.length} steps</div>
    </div>`).join('');
  $('empty').hidden = list.length > 0;
  $('grid').querySelectorAll('.card').forEach(c => {
    const open = () => openLesson(c.dataset.id);
    c.onclick = e => { if (!e.target.closest('.heart')) open(); };
    c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
  });
  $('grid').querySelectorAll('.heart').forEach(b => b.onclick = e => { e.stopPropagation(); toggleFav(b.dataset.fav); });
  $('starCount').textContent = starCount();
}
function toggleFav(id) { favs[id] ? delete favs[id] : favs[id] = true; store.set('favs', favs); renderGrid(); if (cur && cur.id === id) $('favBtn').classList.toggle('on', !!favs[id]); }
function renderDaily() {
  const day = Math.floor(Date.now() / 864e5);
  const L = LESSONS[day % LESSONS.length];
  $('daily').innerHTML = `<div class="thumb">${thumb(L)}</div><div class="txt"><div class="eyebrow">Picture of the day</div><h2>${L.name}</h2><p>${LEVELS[L.level]} · ${L.steps.length} steps · ${L.blurb || ''}</p></div>`;
  $('daily').onclick = () => openLesson(L.id);
}
$('levels').querySelectorAll('button').forEach(b => b.onclick = () => { level = b.dataset.level; $('levels').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); renderGrid(); });

/* ---------- lesson ---------- */
let cur = null, step = 0, playing = null;
const art = $('art'), board = $('board'), stage = $('stage');
function openLesson(id) {
  cur = LESSONS.find(l => l.id === id); step = 0; stopPlay();
  $('home').hidden = true; $('homeTop').hidden = true; $('lesson').hidden = false;
  $('lessonName').textContent = cur.name;
  $('lessonLevel').textContent = LEVELS[cur.level]; $('lessonLevel').className = 'badge ' + cur.level;
  $('favBtn').classList.toggle('on', !!favs[id]);
  $('cheer').classList.remove('show'); $('nextBtn').disabled = false;
  setMode('watch'); resetZoom();
  strokes = drawings[id] ? drawings[id].map(s => ({ ...s })) : []; redrawPad();
  renderStep(); window.scrollTo(0, 0);
  try { history.replaceState(null, '', '#' + id); } catch (e) {}
}
function closeLesson() { stopPlay(); $('lesson').hidden = true; $('home').hidden = false; $('homeTop').hidden = false; cur = null; renderGrid(); try { history.replaceState(null, '', ' '); } catch (e) {} }
function renderStep(animate = true) {
  const n = cur.steps.length; let html = '';
  cur.steps.forEach((s, i) => {
    let cls = i < step ? 'done' : i === step ? 'now' : 'soon';
    if (s.guide) cls = i <= step ? 'guideline' : 'soon';
    if (cls === 'soon' && i !== step + 1) return;
    html += `<g class="${cls}">${stepMarkup(s)}</g>`;
  });
  art.innerHTML = html;
  const now = art.querySelector('.now, .guideline:last-of-type');
  if (animate && now && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    now.querySelectorAll('*').forEach((el, k) => { try { const L = el.getTotalLength(); if (L > 0) { el.style.strokeDasharray = L; el.style.strokeDashoffset = L; el.style.animation = `draw ${Math.min(1.2, .3 + L / 300)}s ease ${k * .25}s forwards`; } } catch (e) {} });
  }
  const s = cur.steps[step];
  $('stepNo').textContent = step + 1; $('hintText').textContent = s.hint;
  $('dots').innerHTML = cur.steps.map((_, i) => `<i class="${i < step ? 'past' : i === step ? 'on' : ''}"></i>`).join('');
  $('prevBtn').disabled = step === 0;
  $('nextBtn').textContent = step === n - 1 ? 'Finished!' : 'Next ▶';
}
function next() {
  if (step < cur.steps.length - 1) { step++; renderStep(); }
  else { finish(); }
}
function finish() {
  stopPlay();
  done[cur.id] = true; store.set('done', done);
  art.innerHTML = allMarkup(cur, 'done');
  $('cheerText').textContent = ['You did it!', 'Beautiful!', 'What a great artist!', 'Wow, amazing!'][starCount() % 4];
  $('cheer').classList.add('show'); $('nextBtn').disabled = true;
  $('cheer').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
$('nextBtn').onclick = () => { stopPlay(); next(); };
$('prevBtn').onclick = () => { stopPlay(); if (step > 0) { step--; $('nextBtn').disabled = false; $('cheer').classList.remove('show'); renderStep(); } };
$('backBtn').onclick = closeLesson;
$('favBtn').onclick = () => toggleFav(cur.id);
$('cheerDraw').onclick = () => { setMode('draw'); step = cur.steps.length - 1; renderStep(false); $('cheer').classList.remove('show'); $('board').scrollIntoView({ behavior: 'smooth' }); };
$('cheerNext').onclick = () => { const i = LESSONS.indexOf(cur); openLesson(LESSONS[(i + 1) % LESSONS.length].id); };
function stopPlay() { if (playing) { clearInterval(playing); playing = null; $('playBtn').textContent = '▶ Play'; } }
$('playBtn').onclick = () => {
  if (playing) return stopPlay();
  if ($('nextBtn').disabled) { step = 0; $('nextBtn').disabled = false; $('cheer').classList.remove('show'); renderStep(); }
  $('playBtn').textContent = '❚❚ Pause';
  playing = setInterval(() => { if (step < cur.steps.length - 1) { step++; renderStep(); } else stopPlay(); }, 2800);
};

/* ---------- watch / draw mode ---------- */
let mode = 'watch', guide = 'faint';
function setMode(m) {
  mode = m; board.classList.toggle('draw', m === 'draw'); $('tools').hidden = m !== 'draw';
  $('modeWatch').classList.toggle('on', m === 'watch'); $('modeDraw').classList.toggle('on', m === 'draw');
  if (m === 'draw') { stopPlay(); }
}
$('modeWatch').onclick = () => setMode('watch');
$('modeDraw').onclick = () => setMode('draw');
$('guideBtn').onclick = () => {
  guide = guide === 'faint' ? 'on' : guide === 'on' ? 'off' : 'faint';
  board.classList.remove('g-on', 'g-off'); if (guide !== 'faint') board.classList.add('g-' + guide);
  $('guideBtn').textContent = 'Guide: ' + guide;
};

/* ---------- drawing pad ---------- */
const pad = $('pad'), ctx = pad.getContext('2d');
let strokes = [], live = null, tool = 'pencil', color = COLORS[0][1], size = 4;
$('swatches').innerHTML = COLORS.map(([n, c], i) => `<button class="swatch ${i === 0 ? 'on' : ''}" type="button" data-c="${c}" style="background:${c}" aria-label="${n}"></button>`).join('');
$('swatches').querySelectorAll('.swatch').forEach(b => b.onclick = () => { $('swatches').querySelectorAll('.swatch').forEach(x => x.classList.toggle('on', x === b)); color = b.dataset.c; if (tool === 'eraser') pickTool('pencil'); });
document.querySelectorAll('.tool[data-tool]').forEach(b => b.onclick = () => pickTool(b.dataset.tool));
function pickTool(t) { tool = t; document.querySelectorAll('.tool[data-tool]').forEach(x => x.classList.toggle('on', x.dataset.tool === t)); }
$('size').oninput = e => size = +e.target.value;
function strokeStyle(st) {
  const W = pad.width;
  if (st.tool === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.strokeStyle = '#000'; ctx.lineWidth = W * .012 * st.size; ctx.globalAlpha = 1; }
  else if (st.tool === 'crayon') { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = st.color; ctx.lineWidth = W * .006 * st.size; ctx.globalAlpha = .85; }
  else { ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = st.color; ctx.lineWidth = W * .0022 * st.size; ctx.globalAlpha = 1; }
}
function drawStroke(st) {
  const W = pad.width; strokeStyle(st); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
  const p = st.pts; if (p.length === 1) { ctx.moveTo(p[0][0] * W, p[0][1] * W); ctx.lineTo(p[0][0] * W + .01, p[0][1] * W); }
  else { ctx.moveTo(p[0][0] * W, p[0][1] * W); for (let i = 1; i < p.length - 1; i++) { const mx = (p[i][0] + p[i + 1][0]) / 2 * W, my = (p[i][1] + p[i + 1][1]) / 2 * W; ctx.quadraticCurveTo(p[i][0] * W, p[i][1] * W, mx, my); } const l = p[p.length - 1]; ctx.lineTo(l[0] * W, l[1] * W); }
  ctx.stroke();
}
function redrawPad() { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.clearRect(0, 0, pad.width, pad.height); strokes.forEach(drawStroke); if (live) drawStroke(live); }
function saveStrokes() { if (!cur) return; if (strokes.length) drawings[cur.id] = strokes; else delete drawings[cur.id]; store.set('drawings', drawings); }
$('undoBtn').onclick = () => { strokes.pop(); redrawPad(); saveStrokes(); };
$('clearBtn').onclick = () => { strokes = []; redrawPad(); saveStrokes(); };

/* pointer handling: one finger draws (draw mode), two fingers pinch/pan */
let zoom = { s: 1, x: 0, y: 0 }, pointers = new Map(), pinch = null;
function applyZoom() { stage.style.transform = `translate(${zoom.x}px,${zoom.y}px) scale(${zoom.s})`; $('zoomReset').hidden = zoom.s === 1 && !zoom.x && !zoom.y; }
function resetZoom() { zoom = { s: 1, x: 0, y: 0 }; applyZoom(); }
$('zoomReset').onclick = resetZoom;
function norm(e) { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }
board.addEventListener('pointerdown', e => {
  board.setPointerCapture(e.pointerId); pointers.set(e.pointerId, e);
  if (pointers.size === 2) { if (live) { live = null; redrawPad(); } const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), cx: (a.clientX + b.clientX) / 2, cy: (a.clientY + b.clientY) / 2, z: { ...zoom } }; return; }
  if (mode === 'draw' && pointers.size === 1) { live = { tool, color, size, pts: [norm(e)] }; redrawPad(); }
});
board.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId)) return; pointers.set(e.pointerId, e);
  if (pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()]; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), cx = (a.clientX + b.clientX) / 2, cy = (a.clientY + b.clientY) / 2;
    const r = board.getBoundingClientRect(); const ox = pinch.cx - r.left, oy = pinch.cy - r.top;
    const s = Math.min(4, Math.max(1, pinch.z.s * d / pinch.d)); const k = s / pinch.z.s;
    zoom.s = s; zoom.x = ox - (ox - pinch.z.x) * k + (cx - pinch.cx); zoom.y = oy - (oy - pinch.z.y) * k + (cy - pinch.cy);
    zoom.x = Math.min(0, Math.max(r.width * (1 - s), zoom.x)); zoom.y = Math.min(0, Math.max(r.height * (1 - s), zoom.y));
    applyZoom(); return;
  }
  if (live) { live.pts.push(norm(e)); redrawPad(); }
});
const up = e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; if (live && pointers.size === 0) { strokes.push(live); live = null; redrawPad(); saveStrokes(); } };
board.addEventListener('pointerup', up); board.addEventListener('pointercancel', up);
board.addEventListener('dblclick', resetZoom);

/* ---------- save picture ---------- */
$('saveBtn').onclick = async () => {
  const out = document.createElement('canvas'); out.width = out.height = 1200; const o = out.getContext('2d');
  o.fillStyle = '#fff'; o.fillRect(0, 0, 1200, 1200);
  if (guide !== 'off') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="1200" height="1200"><g color="#1f2a44" fill="none" stroke="#1f2a44" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="${guide === 'faint' ? .25 : 1}"><style>.shade{fill:#1f2a44;stroke:none;opacity:.14}.guideline{display:none}</style>${allMarkup(cur)}</g></svg>`;
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await new Promise(r => { img.onload = r; img.onerror = r; }); o.drawImage(img, 0, 0);
  }
  o.drawImage(pad, 0, 0);
  const url = out.toDataURL('image/png'); $('saveImg').src = url; $('saveLink').href = url; $('saveLink').download = cur.id + '-drawing.png'; $('saveModal').hidden = false;
};
$('saveClose').onclick = () => $('saveModal').hidden = true;

/* ---------- progress ---------- */
$('progressBtn').onclick = () => {
  const by = l => LESSONS.filter(x => x.level === l), dn = l => by(l).filter(x => done[x.id]).length;
  $('progressBody').innerHTML = `<div class="prog-row"><span>Stars earned</span><b>${starCount()} / ${LESSONS.length}</b></div>` +
    Object.entries(LEVELS).map(([k, v]) => `<div class="prog-row"><span>${v}</span><b>${dn(k)} / ${by(k).length}</b></div>`).join('') +
    `<div class="prog-row"><span>Drawings saved on this device</span><b>${Object.keys(drawings).length}</b></div>`;
  $('progressModal').hidden = false;
};
$('progressClose').onclick = () => $('progressModal').hidden = true;
document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.hidden = true; }));

/* ---------- boot ---------- */
renderCats(); renderDaily(); renderGrid();
const h = location.hash.slice(1); if (h && LESSONS.some(l => l.id === h)) openLesson(h);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
