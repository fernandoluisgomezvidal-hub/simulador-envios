'use strict';
/* =========================================================================
   Interfaz: formulario, mapa, animación y pestañas de resultados
   ========================================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const fmtE = v => EUR.format(v);
const DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtD = d => { d = new Date(d); return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
const fmtT = d => { d = new Date(d); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const fmtDT = d => `${fmtD(d)} · ${fmtT(d)}`;
const fmtLong = d => { const s = new Date(d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }); return s[0].toUpperCase() + s.slice(1); };
const fmtH = h => h < 1 ? Math.max(1, Math.round(h * 60)) + ' min' : h < 48 ? NUMF1.format(h) + ' h' : NUMF1.format(h / 24) + ' días';
const fmtCO2 = g => g < 1000 ? Math.round(g) + ' g' : NUMF2.format(g / 1000) + ' kg';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const NODE_IC = { office: '🏤', home: '🏠', cta: '🏭', airport: '🛫', port: '⚓', border: '🛂', customs: '🛃', hub: '🌐', delivery: '📮', locker: '🗄️', transit: '🔄' };
const MODE_COLOR = { van: 'var(--c-van)', truck: 'var(--c-truck)', plane: 'var(--c-plane)', ship: 'var(--c-ship)' };
const MODE_HEX = () => { const cs = getComputedStyle(document.documentElement); return { van: cs.getPropertyValue('--c-van').trim(), truck: cs.getPropertyValue('--c-truck').trim(), plane: cs.getPropertyValue('--c-plane').trim(), ship: cs.getPropertyValue('--c-ship').trim() }; };

/* ---------------- Estado ---------------- */
function nowParts() { const d = new Date(); return { date: ymd(d), time: fmtT(d) }; }
function defaultState() {
  const n = nowParts();
  return {
    origin: 'es-madrid', dest: 'fr-paris', cat: 'paquete',
    letter: { preset: 'dl', l: 22, w: 11, t: 2, g: 15 },
    postal: { preset: 'std', l: 14.8, w: 10.5, g: 4 },
    pack: { preset: 'm', l: 35, w: 25, h: 15, kg: 3 },
    content: 'ropa', letterContent: 'docs', value: 60,
    opts: { insure: false, insured: 150, ack: false, cod: false, codAmount: 50, pickup: false, saturday: false, box: 'none', delivery: 'domicilio' },
    date: n.date, time: n.time, priority: 50, selected: null, tab: 'servicios', clickMode: 'dest'
  };
}
function deepMerge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') deepMerge(a[k], b[k]); else if (k in a) a[k] = b[k]; } return a; }
function loadState() {
  const st = defaultState();
  try {
    const m = location.hash.match(/s=([^&]+)/);
    if (m) return sanitize(deepMerge(st, JSON.parse(decodeURIComponent(escape(atob(m[1]))))));
  } catch (e) { /* enlace inválido */ }
  try {
    const raw = localStorage.getItem('simEnvios.v1');
    if (raw) { const saved = JSON.parse(raw); const n = nowParts(); deepMerge(st, saved); st.date = n.date; st.time = n.time; }
  } catch (e) { /* sin almacenamiento */ }
  return sanitize(st);
}
function sanitize(st) {
  if (!CITY[st.origin] || CITY[st.origin].cc !== 'ES') st.origin = 'es-madrid';
  if (!CITY[st.dest]) st.dest = 'fr-paris';
  if (!['carta', 'postal', 'paquete'].includes(st.cat)) st.cat = 'paquete';
  return st;
}
let saveTimer;
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem('simEnvios.v1', JSON.stringify(state)); } catch (e) { /* ignorar */ } }, 300);
}
const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
const setPath = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };

const state = loadState();
let sim = null;

/* ---------------- Combos de ciudad ---------------- */
function cityLabel(c) { return c.cc === 'ES' ? `${c.name}` : `${c.name}, ${COUNTRIES[c.cc].n}`; }
function cityFlag(c) { return COUNTRIES[c.cc].f; }
function citySub(c) {
  if (c.cc === 'ES') { const r = regionOf(c); return `${PROVINCES[c.prov]}${r !== 'PEN' ? ' · ' + { BAL: 'Baleares', CAN: 'Canarias', CEU: 'Ceuta', MEL: 'Melilla' }[r] : ''}`; }
  const C = COUNTRIES[c.cc]; return `${C.n} · Zona ${C.z}${C.eu ? ' · UE' : ''}`;
}
function makeCombo(rootSel, key, getList) {
  const root = $(rootSel), input = $('input', root), list = $('.combo-list', root);
  let items = [], active = 0;
  const show = () => { input.value = cityLabel(CITY[state[key]]); root.dataset.flag = cityFlag(CITY[state[key]]); };
  function render() {
    list.innerHTML = items.length ? items.map((c, i) => `<div class="opt ${i === active ? 'active' : ''}" data-id="${c.id}" role="option">
      <span class="flag">${cityFlag(c)}</span><span class="opt-main">${esc(c.name)}</span><span class="opt-sub">${esc(citySub(c))}</span></div>`).join('')
      : '<div class="opt empty">Sin resultados. Prueba con otra ciudad o país.</div>';
    const el = list.children[active]; if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }
  function open(q) {
    const nq = norm(q.trim());
    items = getList().filter(c => !nq || norm(c.name).includes(nq) || norm(COUNTRIES[c.cc].n).includes(nq) || (c.prov && norm(PROVINCES[c.prov]).includes(nq)));
    items.sort((a, b) => (norm(a.name).startsWith(nq) ? 0 : 1) - (norm(b.name).startsWith(nq) ? 0 : 1));
    items = items.slice(0, 60); active = 0; render(); root.classList.add('open');
  }
  function pick(id) { root.classList.remove('open'); setCity(key, id); input.blur(); }
  input.addEventListener('focus', () => { input.select(); open(''); });
  input.addEventListener('input', () => open(input.value));
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { active = Math.min(items.length - 1, active + 1); render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { active = Math.max(0, active - 1); render(); e.preventDefault(); }
    else if (e.key === 'Enter') { if (items[active]) pick(items[active].id); e.preventDefault(); }
    else if (e.key === 'Escape') { root.classList.remove('open'); input.blur(); }
  });
  input.addEventListener('blur', () => setTimeout(() => { root.classList.remove('open'); show(); }, 150));
  list.addEventListener('mousedown', e => { const o = e.target.closest('.opt[data-id]'); if (o) { e.preventDefault(); pick(o.dataset.id); } });
  show();
  return { show };
}
let comboO, comboD;
function setCity(key, id) {
  const wasDomestic = CITY[state.dest].cc === 'ES';
  state[key] = id;
  if (key === 'origin') { $('#cpOrigin').value = ''; $('#cpHint').textContent = ''; }
  comboO.show(); comboD.show();
  const isDomestic = CITY[state.dest].cc === 'ES';
  if (wasDomestic !== isDomestic) renderOpts();
  recompute(true);
}

/* ---------------- Bloques dinámicos del formulario ---------------- */
function presetChips(presets, cur, group) {
  return `<div class="chips">${Object.entries(presets).map(([k, p]) =>
    `<button class="chip ${cur === k ? 'on' : ''}" data-preset-group="${group}" data-preset="${k}">${esc(p.n)}</button>`).join('')}
    <button class="chip ${cur === 'custom' ? 'on' : ''}" data-preset-group="${group}" data-preset="custom">Personalizado</button></div>`;
}
const numField = (label, bind, unit, step = 'any', min = 0) =>
  `<div class="field num"><label>${label}</label><div class="unit-in"><input type="number" inputmode="decimal" step="${step}" min="${min}" data-bind="${bind}" data-custom="1"><span>${unit}</span></div></div>`;

function renderSize() {
  const b = $('#sizeBlock');
  if (state.cat === 'carta') {
    b.innerHTML = presetChips(LETTER_PRESETS, state.letter.preset, 'letter') +
      `<div class="grid4">${numField('Largo', 'letter.l', 'cm')}${numField('Ancho', 'letter.w', 'cm')}${numField('Grosor', 'letter.t', 'mm', '1')}${numField('Peso', 'letter.g', 'g', '1')}</div>
       <div class="size-viz"><div id="viz"></div><div class="size-info" id="sizeInfo"></div></div>`;
  } else if (state.cat === 'postal') {
    b.innerHTML = presetChips(POSTAL_PRESETS, state.postal.preset, 'postal') +
      `<div class="grid3">${numField('Largo', 'postal.l', 'cm')}${numField('Ancho', 'postal.w', 'cm')}${numField('Peso', 'postal.g', 'g', '1')}</div>
       <div class="size-viz"><div id="viz"></div><div class="size-info" id="sizeInfo"></div></div>`;
  } else {
    b.innerHTML = presetChips(PACK_PRESETS, state.pack.preset, 'pack') +
      `<div class="grid4">${numField('Largo', 'pack.l', 'cm')}${numField('Ancho', 'pack.w', 'cm')}${numField('Alto', 'pack.h', 'cm')}${numField('Peso', 'pack.kg', 'kg', '0.1')}</div>
       <div class="size-viz"><div id="viz"></div><div class="size-info" id="sizeInfo"></div></div>`;
  }
  bindInputs(b);
  $$('[data-preset]', b).forEach(btn => btn.addEventListener('click', () => {
    const g = btn.dataset.presetGroup, k = btn.dataset.preset;
    const src = { letter: LETTER_PRESETS, postal: POSTAL_PRESETS, pack: PACK_PRESETS }[g];
    if (k !== 'custom') { const { n, ...vals } = src[k]; Object.assign(state[g], vals); if (g === 'pack' && BOXES[k] && state.opts.box !== 'none') state.opts.box = k; }
    state[g].preset = k; renderSize(); recompute();
  }));
}

function renderOpts() {
  const b = $('#optsBlock');
  const domestic = CITY[state.dest].cc === 'ES';
  const isPack = state.cat === 'paquete';
  let contentOpts = '';
  const contentKey = state.cat === 'carta' ? 'letterContent' : 'content';
  if (state.cat === 'carta') {
    contentOpts = ['docs', 'regalo', 'otros'].map(k => `<option value="${k}">${CONTENTS[k].n}</option>`).join('');
  } else if (isPack) contentOpts = Object.entries(CONTENTS).map(([k, c]) => `<option value="${k}">${c.n}</option>`).join('');
  const showValue = state.cat !== 'postal' && state[contentKey] !== 'docs';
  const o = state.opts;
  if (!isPack || !domestic) o.delivery = isPack && domestic ? o.delivery : 'domicilio';
  b.innerHTML = `
    ${state.cat !== 'postal' ? `<div class="grid2">
      <div class="field"><label>Contenido</label><select data-bind="${contentKey}" data-rerender="opts">${contentOpts}</select></div>
      ${showValue ? `<div class="field"><label>Valor del contenido</label><div class="unit-in"><input type="number" min="0" step="1" data-bind="value"><span>€</span></div></div>` : '<div class="field muted-box">Sin valor comercial</div>'}
    </div>` : '<p class="hint">Las postales se consideran correspondencia sin valor comercial.</p>'}
    ${isPack && domestic ? `<div class="field"><label>Entrega</label><div class="seg" role="radiogroup">
      ${[['domicilio', '🏠 Domicilio'], ['oficina', '🏤 Oficina'], ['citypaq', '🗄️ Citypaq']].map(([v, l]) =>
        `<label><input type="radio" name="del" value="${v}" data-bind="opts.delivery">${l}</label>`).join('')}</div></div>` : ''}
    <div class="toggles">
      ${state.cat !== 'postal' ? toggle('opts.insure', 'Seguro / valor declarado', '1 % del valor (mín. 1,50 €)', o.insure ? `<div class="unit-in sm"><input type="number" min="0" step="10" data-bind="opts.insured"><span>€</span></div>` : '') : ''}
      ${state.cat !== 'postal' ? toggle('opts.ack', isPack ? 'Prueba de entrega' : 'Aviso de recibo', 'Justificante firmado de la entrega') : ''}
      ${isPack && domestic ? toggle('opts.cod', 'Contra reembolso', 'El destinatario paga al recibir', o.cod ? `<div class="unit-in sm"><input type="number" min="0" step="1" data-bind="opts.codAmount"><span>€</span></div>` : '') : ''}
      ${isPack ? toggle('opts.pickup', 'Recogida a domicilio', domestic ? '+3,50 €' : '+6,00 €') : ''}
      ${isPack && domestic ? toggle('opts.saturday', 'Entrega en sábado', 'Solo Paq Premium · +4,95 €') : ''}
    </div>
    ${isPack ? `<div class="field"><label>Embalaje</label><select data-bind="opts.box">${Object.entries(BOXES).map(([k, [n, p]]) => `<option value="${k}">${n}${p ? ' · ' + fmtE(p) : ''}</option>`).join('')}</select></div>` : ''}`;
  bindInputs(b);
}
function toggle(bind, title, sub, extra = '') {
  return `<div class="tg"><label><input type="checkbox" data-bind="${bind}" data-rerender="opts"><span class="sw"></span><span class="tg-t"><b>${title}</b><small>${sub}</small></span></label>${extra}</div>`;
}

function bindInputs(root) {
  $$('[data-bind]', root).forEach(el => {
    const path = el.dataset.bind, v = getPath(state, path);
    if (el.type === 'checkbox') el.checked = !!v;
    else if (el.type === 'radio') el.checked = el.value === v;
    else el.value = v ?? '';
    const ev = (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio') ? 'change' : 'input';
    el.addEventListener(ev, () => {
      setPath(state, path, el.type === 'checkbox' ? el.checked : el.value);
      if (el.dataset.custom) {
        const g = path.split('.')[0];
        if (state[g].preset !== 'custom') { state[g].preset = 'custom'; $$(`[data-preset-group="${g}"]`).forEach(c => c.classList.toggle('on', c.dataset.preset === 'custom')); }
      }
      if (el.dataset.rerender === 'opts') renderOpts();
      recompute();
    });
  });
}

/* ---------------- Visualización del tamaño ---------------- */
function renderViz(ctx) {
  const viz = $('#viz'); if (!viz) return;
  const { l, w, h } = ctx.dims;
  const isFlat = ctx.cat !== 'paquete';
  const L = Math.max(l, 0.1), W = Math.max(w, 0.1), H = Math.max(h, 0.05);
  const s = Math.min(130 / Math.max(L, W, H), 7);
  const px = { l: L * s, w: W * s, h: Math.max(H * s, isFlat ? 2 : 4) };
  const face = (cls, wpx, hpx, tf) => `<div class="face ${cls}" style="width:${wpx}px;height:${hpx}px;margin:${-hpx / 2}px 0 0 ${-wpx / 2}px;transform:${tf}"></div>`;
  viz.innerHTML = `<div class="scene ${isFlat ? 'flat' : ''}"><div class="cube">
    ${face('fr', px.l, px.h, `translateZ(${px.w / 2}px)`)}${face('bk', px.l, px.h, `rotateY(180deg) translateZ(${px.w / 2}px)`)}
    ${face('rt', px.w, px.h, `rotateY(90deg) translateZ(${px.l / 2}px)`)}${face('lt', px.w, px.h, `rotateY(-90deg) translateZ(${px.l / 2}px)`)}
    ${face('tp', px.l, px.w, `rotateX(90deg) translateZ(${px.h / 2}px)`)}${face('bt', px.l, px.w, `rotateX(-90deg) translateZ(${px.h / 2}px)`)}
  </div></div><div class="viz-dims">${NUMF1.format(l)} × ${NUMF1.format(w)} × ${isFlat ? NUMF1.format(h * 10) + ' mm' : NUMF1.format(h) + ' cm'}</div>`;
  const info = $('#sizeInfo');
  const tags = [];
  if (ctx.cat === 'paquete') {
    tags.push(`<div class="kv"><span>Peso real</span><b>${fmtW(ctx.g)}</b></div>`);
    tags.push(`<div class="kv"><span>Peso volumétrico</span><b>${NUMF2.format(ctx.volKg)} kg</b></div>`);
    tags.push(`<div class="kv hl"><span>Peso facturable</span><b>${Math.max(1, Math.ceil(ctx.billKg - 1e-9))} kg</b></div>`);
    tags.push(`<div class="kv"><span>Suma de lados</span><b>${fmtCm(ctx.sum)}</b></div>`);
    tags.push(`<div class="tagline">${fitsCitypaq(ctx) ? '<span class="tag ok">Cabe en Citypaq</span>' : '<span class="tag no">No cabe en Citypaq</span>'}
      ${ctx.sorted[2] <= 3 && ctx.g <= 2000 ? '<span class="tag ok">Cabe por el buzón</span>' : ''}
      ${ctx.volKg > ctx.realKg ? '<span class="tag warn">Se cobra por volumen</span>' : ''}</div>`);
    tags.push(`<p class="hint">Peso volumétrico = largo × ancho × alto / 6.000. Se cobra el mayor de los dos.</p>`);
  } else {
    const norm_ = ctx.letterNorm;
    const fmt = norm_ ? 'Normalizada' : (ctx.sorted[0] <= 35.3 && ctx.sorted[1] <= 25 && ctx.sorted[2] <= 2) ? 'No normalizada (formato grande)' : 'Voluminosa / pequeño paquete';
    tags.push(`<div class="kv hl"><span>Formato</span><b>${fmt}</b></div>`);
    tags.push(`<div class="kv"><span>Peso</span><b>${fmtW(ctx.g)}</b></div>`);
    tags.push(`<div class="tagline">${norm_ ? '<span class="tag ok">Tarifa mínima</span>' : '<span class="tag warn">Recargo por formato</span>'}</div>`);
    tags.push(`<p class="hint">Normalizada: entre 14×9 y 23,5×12 cm, hasta 5 mm de grosor y 20 g.</p>`);
  }
  info.innerHTML = tags.join('');
}

/* ---------------- Mapa ---------------- */
let map, tiles, routeLayer, mover, lastSig = '', lastBounds = null;
function isDark() { return document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches); }
function initMap() {
  map = L.map('map', { zoomControl: true, worldCopyJump: false, minZoom: 1, attributionControl: true }).setView([40.2, -3.7], 5);
  setTiles();
  routeLayer = L.layerGroup().addTo(map);
  // Al girar el móvil o redimensionar la ventana, recolocar la ruta
  let rzT;
  new ResizeObserver(() => { clearTimeout(rzT); rzT = setTimeout(() => { map.invalidateSize(); if (lastBounds) map.fitBounds(lastBounds, { maxZoom: 11, animate: false }); }, 120); }).observe($('#map'));
  map.on('click', e => {
    const pool = state.clickMode === 'origin' ? ES_CITIES : ALL_CITIES;
    let best = null, bd = Infinity;
    pool.forEach(c => { const d = distKm({ lat: e.latlng.lat, lng: e.latlng.lng }, c); if (d < bd) { bd = d; best = c; } });
    if (best && bd < 900) { setCity(state.clickMode === 'origin' ? 'origin' : 'dest', best.id); toast(`${state.clickMode === 'origin' ? 'Origen' : 'Destino'}: ${cityLabel(best)}`); }
    else toast('No hay ninguna ciudad cerca de ese punto');
  });
}
function setTiles() {
  if (tiles) map.removeLayer(tiles);
  tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19, className: 'base-tiles' }).addTo(map);
}
function gcPoints(a, b, n = 64) {
  const p1 = toRad(a.lat), l1 = toRad(a.lng), p2 = toRad(b.lat), l2 = toRad(b.lng);
  const d = 2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
  if (d < 1e-6) return [[a.lat, a.lng], [b.lat, b.lng]];
  const out = []; let prev = null;
  for (let i = 0; i <= n; i++) {
    const f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * 180 / Math.PI;
    let lng = Math.atan2(y, x) * 180 / Math.PI;
    if (prev !== null) { while (lng - prev > 180) lng -= 360; while (lng - prev < -180) lng += 360; }
    prev = lng; out.push([lat, lng]);
  }
  return out;
}
function arcPoints(a, b, bend, n = 40) {
  const mx = (a.lat + b.lat) / 2, my = (a.lng + b.lng) / 2, dx = b.lat - a.lat, dy = b.lng - a.lng;
  const c = { lat: mx - dy * bend, lng: my + dx * bend };
  const out = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * a.lat + 2 * u * t * c.lat + t * t * b.lat, u * u * a.lng + 2 * u * t * c.lng + t * t * b.lng]); }
  return out;
}
function legCoords(a, b, mode) {
  const d = distKm(a, b);
  if (mode === 'plane') return d > 2500 ? gcPoints(a, b) : arcPoints(a, b, 0.18);
  if (mode === 'ship') return arcPoints(a, b, 0.1);
  return [[a.lat, a.lng], [b.lat, b.lng]];
}
function drawRoute(r, force) {
  const sig = r.route.nodes.map(n => n.key + n.type).join('|') + r.route.legs.map(l => l.mode).join('');
  routeLayer.clearLayers();
  const col = MODE_HEX();
  const nodes = r.route.nodes;
  anim.legs = r.route.legs.map((l, i) => {
    const coords = legCoords(nodes[i], nodes[i + 1], l.mode);
    const style = { color: col[l.mode], weight: l.mode === 'van' ? 3 : 4, opacity: .9, dashArray: l.mode === 'plane' ? '8 8' : l.mode === 'ship' ? '2 8' : null, lineCap: 'round' };
    L.polyline(coords, { ...style, weight: style.weight + 5, color: '#000', opacity: .08, dashArray: null }).addTo(routeLayer);
    L.polyline(coords, style).addTo(routeLayer).bindTooltip(`${MODE_IC[l.mode]} ${MODE_LABEL[l.mode]} · ${fmtKm(l.km)} · ${fmtH(r.sch.legH[i])}`, { sticky: true });
    return { coords, mode: l.mode };
  });
  nodes.forEach((n, i) => {
    const end = i === 0 ? 'a' : i === nodes.length - 1 ? 'b' : '';
    const html = end ? `<div class="pin pin-${end}">${end.toUpperCase()}</div>` : `<div class="nmk t-${n.type}">${NODE_IC[n.type] || '•'}</div>`;
    L.marker([n.lat, n.lng], { icon: L.divIcon({ className: 'nmk-wrap', html, iconSize: end ? [30, 38] : [28, 28], iconAnchor: end ? [15, 36] : [14, 14] }), zIndexOffset: end ? 1000 : 0 })
      .bindPopup(`<div class="pop"><div class="pop-ic">${NODE_IC[n.type] || ''}</div><b>${esc(n.name)}</b><p>${esc(n.desc)}</p>
        <div class="pop-t">Llegada: ${fmtDT(r.sch.arr[i])}${i < nodes.length - 1 && i > 0 ? `<br>Salida: ${fmtDT(r.sch.dep[i])}` : ''}</div></div>`)
      .addTo(routeLayer);
  });
  mover = L.marker([nodes[0].lat, nodes[0].lng], { icon: L.divIcon({ className: 'mover-wrap', html: '<div class="mover">📦</div>', iconSize: [34, 34], iconAnchor: [17, 17] }), zIndexOffset: 2000, interactive: false }).addTo(routeLayer);
  if (sig !== lastSig || force) {
    const pts = anim.legs.flatMap(l => l.coords);
    lastBounds = L.latLngBounds(pts).pad(0.15);
    map.fitBounds(lastBounds, { maxZoom: 11, animate: true });
    lastSig = sig;
  }
  setupAnim(r);
}

/* ---------------- Animación ---------------- */
const anim = { p: 0, playing: false, last: 0, segs: [], legs: [], r: null };
function setupAnim(r) {
  anim.r = r;
  const n = r.route.nodes.length, segs = [];
  for (let i = 0; i < n; i++) {
    if (i > 0 && i < n - 1) segs.push({ kind: 'wait', i, t0: r.sch.arr[i], t1: r.sch.dep[i], w: 0.6 });
    if (i < n - 1) segs.push({ kind: 'leg', i, t0: r.sch.dep[i], t1: r.sch.arr[i + 1], w: 1 + Math.sqrt(r.route.legs[i].km) / 12 });
  }
  const W = segs.reduce((a, s) => a + s.w, 0);
  let acc = 0; segs.forEach(s => { s.p0 = acc / W; acc += s.w; s.p1 = acc / W; });
  anim.segs = segs;
  anim.legs.forEach(l => { const cum = [0]; for (let k = 1; k < l.coords.length; k++) cum.push(cum[k - 1] + Math.hypot(l.coords[k][0] - l.coords[k - 1][0], l.coords[k][1] - l.coords[k - 1][1])); l.cum = cum; });
  setProgress(anim.p);
}
function along(leg, f) {
  const tot = leg.cum.at(-1) || 1, target = f * tot;
  let k = 1; while (k < leg.cum.length - 1 && leg.cum[k] < target) k++;
  const seg = (leg.cum[k] - leg.cum[k - 1]) || 1, t = (target - leg.cum[k - 1]) / seg;
  const a = leg.coords[k - 1], b = leg.coords[k];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
function setProgress(p) {
  anim.p = Math.min(1, Math.max(0, p));
  const r = anim.r; if (!r || !mover) return;
  $('#animRange').value = Math.round(anim.p * 1000);
  const nodes = r.route.nodes;
  let txt, ic = '📦', time;
  if (anim.p <= 0) { mover.setLatLng([nodes[0].lat, nodes[0].lng]); time = r.sch.arr[0]; txt = `${nodes[0].type === 'home' ? 'Recogido' : 'Admitido'} en ${nodes[0].name}`; }
  else if (anim.p >= 1) { const e = nodes.at(-1); mover.setLatLng([e.lat, e.lng]); time = r.sch.arr.at(-1); ic = '✅'; txt = `Entregado · ${e.name}`; }
  else {
    const s = anim.segs.find(x => anim.p >= x.p0 && anim.p <= x.p1) || anim.segs.at(-1);
    const f = (anim.p - s.p0) / ((s.p1 - s.p0) || 1);
    time = s.t0 + (s.t1 - s.t0) * f;
    if (s.kind === 'leg') {
      const leg = anim.legs[s.i]; mover.setLatLng(along(leg, f)); ic = MODE_IC[leg.mode];
      txt = `En ${MODE_LABEL[leg.mode].toLowerCase()} hacia ${nodes[s.i + 1].name}`;
    } else { const n = nodes[s.i]; mover.setLatLng([n.lat, n.lng]); ic = NODE_IC[n.type]; txt = `${n.type === 'customs' ? 'En aduana' : 'En'} · ${n.name}`; }
  }
  const el = mover.getElement(); if (el) el.querySelector('.mover').textContent = ic;
  const day = Math.floor((setHM(new Date(time), 0, 0) - setHM(new Date(r.sch.arr[0]), 0, 0)) / 864e5);
  $('#animStatus').innerHTML = `<b>${fmtDT(time)}</b><span class="dim"> · día ${day}</span><br>${esc(txt)}`;
}
function playToggle(force) {
  anim.playing = force !== undefined ? force : !anim.playing;
  if (anim.playing && anim.p >= 1) anim.p = 0;
  $('#btnPlay').innerHTML = anim.playing ? '⏸ Pausa' : '▶ Simular viaje';
  anim.last = performance.now();
  if (anim.playing) requestAnimationFrame(tick);
}
function tick(now) {
  if (!anim.playing) return;
  const dt = now - anim.last; anim.last = now;
  setProgress(anim.p + dt / (+$('#animSpeed').value));
  if (anim.p >= 1) { playToggle(false); return; }
  requestAnimationFrame(tick);
}
function jumpToTime(t) {
  const s = anim.segs.find(x => t >= x.t0 && t <= x.t1);
  if (!s) { setProgress(t >= anim.r.sch.arr.at(-1) ? 1 : 0); return; }
  setProgress(s.p0 + (s.p1 - s.p0) * ((t - s.t0) / ((s.t1 - s.t0) || 1)));
}

/* ---------------- Recalcular y pintar ---------------- */
function recompute(forceFit) {
  sim = simulate(state);
  const ctx = sim.ctx;
  renderViz(ctx);
  renderMeta(ctx);
  renderHero();
  if (sim.selected) drawRoute(sim.selected, forceFit === true);
  renderTab();
  $$('#types button').forEach(b => b.classList.toggle('on', b.dataset.cat === state.cat));
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === state.tab));
  const t = sim.selected?.tm;
  $('#dateHint').innerHTML = t ? `Admisión: <b>${fmtDT(t.admit)}</b> · Expedición: <b>${fmtD(t.dispatch)}</b> (corte ${t.cutoff}:00)` : '';
  saveState();
}
function renderMeta(ctx) {
  const zoneTxt = ctx.domestic ? `Nacional · ${ZONE_LABEL_NAC[ctx.zone]}` : ZONE_LABEL_INT[ctx.zone];
  const tags = [];
  if (ctx.domestic) { if (ctx.customsDom) tags.push('<span class="tag warn">Aduana DUA</span>'); }
  else tags.push(ctx.country.eu ? '<span class="tag ok">UE · sin aduanas</span>' : '<span class="tag warn">Fuera de la UE · aduanas</span>');
  if (!ctx.domestic && ctx.country.suspended) tags.push('<span class="tag no">Servicio suspendido</span>');
  $('#routeMeta').innerHTML = `<div class="rm-line"><span>${cityFlag(ctx.o)} ${esc(ctx.o.name)}</span><span class="rm-arrow">→</span><span>${cityFlag(ctx.d)} ${esc(ctx.d.name)}</span></div>
    <div class="rm-sub">${zoneTxt} · ${fmtKm(ctx.distance)} en línea recta</div><div class="tagline">${tags.join('')}</div>`;
}

function badgeFor(r) {
  const b = [];
  if (sim.best === r) b.push('<span class="badge rec">★ Recomendado</span>');
  if (sim.fastest === r) b.push('<span class="badge fast">⚡ Más rápido</span>');
  if (sim.cheapest === r) b.push('<span class="badge cheap">💶 Más barato</span>');
  return b.join('');
}
function renderHero() {
  const r = sim.selected, ctx = sim.ctx, h = $('#hero');
  if (!sim.results.some(x => x.ok)) {
    const reasons = [...new Set(sim.results.flatMap(x => x.reasons))];
    h.innerHTML = `<div class="hero-empty"><div class="he-ic">🚫</div><div><h3>Ningún servicio admite este envío</h3>
      <ul>${reasons.slice(0, 6).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="hint">Prueba a reducir peso o medidas, cambiar el tipo de envío o desactivar opciones que no admita el destino.</p></div></div>`;
    return;
  }
  const t = r.tm;
  const sameDay = ymd(t.dMin) === ymd(t.dMax);
  h.innerHTML = `<div class="hero-main">
      <div class="hero-svc"><span class="svc-ic big">${r.svc.icon}</span><div><div class="eyebrow">Servicio seleccionado</div><h3>${esc(r.svc.name)}</h3><div class="badges">${badgeFor(r)}</div></div></div>
      <div class="hero-date"><div class="eyebrow">${r.route.delivery === 'domicilio' ? 'Entrega estimada' : 'Disponible para recoger'}</div>
        <div class="big-date">${fmtLong(t.dProb)}</div>
        <div class="dim">${r.svc.today ? 'Hoy por la tarde' : `hacia las ${fmtT(t.T1)}`} · ${sameDay ? 'plazo garantizado' : `entre el ${fmtD(t.dMin)} y el ${fmtD(t.dMax)}`}</div></div>
      <div class="hero-price"><div class="eyebrow">Precio estimado</div><div class="big-price">${fmtE(r.price.total)}</div><div class="dim">${r.price.vatRate ? 'IVA incluido' : esc(r.price.vatNote)}</div></div>
    </div>
    <div class="stats">
      <div class="stat"><span>Plazo</span><b>${r.range[0] === r.range[1] ? (r.range[0] === 0 ? 'Mismo día' : r.range[0] + ' día' + (r.range[0] > 1 ? 's' : '')) : `${r.range[0]}–${r.range[1]} días`}</b><small>hábiles</small></div>
      <div class="stat"><span>Recorrido</span><b>${fmtKm(r.km)}</b><small>${r.route.nodes.length - 1} tramos</small></div>
      <div class="stat"><span>Transporte</span><b>${[...new Set(r.route.legs.map(l => l.mode))].map(m => MODE_IC[m]).join(' ')}</b><small>${[...new Set(r.route.legs.map(l => MODE_LABEL[l.mode]))].join(', ')}</small></div>
      <div class="stat"><span>Seguimiento</span><b>${r.svc.track === 'full' ? '📍 Completo' : r.svc.track === 'partial' ? '📍 Parcial' : '— No'}</b><small>${r.svc.sign ? 'Entrega con firma' : 'Sin firma'}</small></div>
      <div class="stat"><span>Huella CO₂</span><b>${fmtCO2(r.co2.g)}</b><small>≈ ${NUMF1.format(r.co2.g / 120)} km en coche</small></div>
    </div>
    ${r.warns.length || t.notes.length ? `<div class="notes">${r.warns.map(w => `<div class="note warn">⚠️ ${esc(w)}</div>`).join('')}${t.notes.map(n => `<div class="note">ℹ️ ${esc(n)}</div>`).join('')}</div>` : ''}`;
}

/* ---------------- Pestañas ---------------- */
function renderTab() {
  const f = { servicios: tabServices, ruta: tabRoute, seguimiento: tabTracking, coste: tabCost, aduanas: tabCustoms, zonas: tabZones }[state.tab] || tabServices;
  $('#tabBody').innerHTML = f();
  if (state.tab === 'servicios') $$('#tabBody [data-svc]').forEach(b => b.addEventListener('click', () => { if (b.classList.contains('off')) return; state.selected = b.dataset.svc; anim.p = 0; recompute(); }));
  if (state.tab === 'seguimiento') {
    $$('#tabBody [data-t]').forEach(b => b.addEventListener('click', () => { playToggle(false); jumpToTime(+b.dataset.t); $('#map').scrollIntoView({ behavior: 'smooth', block: 'center' }); }));
    const cb = $('#showInternal'); if (cb) cb.addEventListener('change', () => { state.showInternal = cb.checked; renderTab(); });
  }
  if (state.tab === 'ruta') $$('#tabBody [data-t]').forEach(b => b.addEventListener('click', () => { playToggle(false); jumpToTime(+b.dataset.t); $('#map').scrollIntoView({ behavior: 'smooth', block: 'center' }); }));
}

function tabServices() {
  const ctx = sim.ctx;
  const cards = sim.results.map(r => {
    const sel = r === sim.selected && r.ok;
    return `<button class="svc ${sel ? 'sel' : ''} ${r.ok ? '' : 'off'}" data-svc="${r.svc.id}" ${r.ok ? '' : 'aria-disabled="true"'}>
      <div class="svc-top"><span class="svc-ic">${r.svc.icon}</span><div class="svc-tt"><div class="svc-name">${esc(r.svc.name)}</div><div class="badges">${r.ok ? badgeFor(r) : '<span class="badge no">No disponible</span>'}</div></div>
        <div class="svc-price">${r.ok ? fmtE(r.price.total) : '—'}</div></div>
      <p class="svc-desc">${esc(r.svc.desc)}</p>
      ${r.ok ? `<div class="svc-meta">
        <span>⏱ ${r.range[0] === r.range[1] ? (r.range[0] === 0 ? 'Mismo día' : r.range[0] + ' d') : r.range[0] + '–' + r.range[1] + ' d'} hábiles</span>
        <span>📅 ${fmtD(r.tm.dProb)}</span>
        <span>${r.svc.track === 'none' ? '🚫' : '📍'} ${TRACK_LABEL[r.svc.track]}</span>
        ${r.svc.sign ? '<span>✍️ Firma</span>' : ''}${r.svc.ins ? '<span>🛡️ Seguro opcional</span>' : ''}${r.svc.insIncl ? `<span>🛡️ ${r.svc.insIncl} € incl.</span>` : ''}
      </div>` : `<ul class="reasons">${r.reasons.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`}
      ${r.ok && r.warns.length ? `<div class="svc-warn">⚠️ ${esc(r.warns[0])}</div>` : ''}
    </button>`;
  }).join('');
  return `<div class="tab-head"><h3>Servicios disponibles</h3><p class="dim">${esc(cityLabel(ctx.o))} → ${esc(cityLabel(ctx.d))} · ${ctx.cat === 'paquete' ? 'Paquete de ' + fmtW(ctx.g) : ctx.cat === 'carta' ? 'Carta de ' + fmtW(ctx.g) : 'Tarjeta postal'}. Pulsa una tarjeta para ver su ruta.</p></div>
    <div class="svc-grid">${cards}</div>${scatter()}`;
}
function scatter() {
  const ok = sim.results.filter(r => r.ok);
  if (ok.length < 2) return '';
  const W = 640, H = 240, P = { l: 56, r: 24, t: 20, b: 40 };
  const t0 = Math.min(...ok.map(r => +r.tm.admit));
  const xs = ok.map(r => (r.tm.T1 - t0) / 864e5), ys = ok.map(r => r.price.total);
  const xM = Math.max(...xs) * 1.12 || 1, yM = Math.max(...ys) * 1.18 || 1;
  const X = v => P.l + v / xM * (W - P.l - P.r), Y = v => H - P.b - v / yM * (H - P.t - P.b);
  const xt = [], yt = [];
  const xs_ = Math.max(1, Math.ceil(xM / 6)); for (let v = 0; v <= xM; v += xs_) xt.push(v);
  const ystep = [1, 2, 5, 10, 20, 50, 100].find(s => yM / s <= 6) || 200; for (let v = 0; v <= yM; v += ystep) yt.push(v);
  return `<div class="chart"><div class="chart-h"><b>Precio frente a tiempo de entrega</b><span class="dim">Abajo a la izquierda = más barato y más rápido</span></div>
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de precio frente a días">
    ${yt.map(v => `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${P.l - 8}" y="${Y(v) + 4}" text-anchor="end" class="ax">${v} €</text>`).join('')}
    ${xt.map(v => `<text x="${X(v)}" y="${H - P.b + 18}" text-anchor="middle" class="ax">${v} d</text>`).join('')}
    <text x="${(W + P.l) / 2}" y="${H - 6}" text-anchor="middle" class="ax">días hasta la entrega</text>
    ${ok.map((r, i) => `<g class="pt ${r === sim.selected ? 'sel' : ''}"><circle cx="${X(xs[i])}" cy="${Y(ys[i])}" r="${r === sim.selected ? 8 : 6}"/>
      <text x="${X(xs[i]) + 11}" y="${Y(ys[i]) + 4}" class="lbl">${esc(r.svc.name.replace('Paquete Internacional', 'P. Int.').replace('Carta internacional', 'C. int.'))}</text></g>`).join('')}
  </svg></div>`;
}

function tabRoute() {
  const r = sim.selected; if (!r) return '';
  const n = r.route.nodes, L = r.route.legs;
  const byMode = {}; L.forEach((l, i) => { byMode[l.mode] = byMode[l.mode] || { km: 0, h: 0 }; byMode[l.mode].km += l.km; byMode[l.mode].h += r.sch.legH[i]; });
  const totalH = (r.sch.arr.at(-1) - r.sch.arr[0]) / 36e5;
  const rows = n.map((node, i) => {
    const stay = i > 0 && i < n.length - 1 ? (r.sch.dep[i] - r.sch.arr[i]) / 36e5 : 0;
    let html = `<div class="rs-node" data-t="${r.sch.arr[i] + 1}"><div class="rs-ic t-${node.type}">${i === 0 ? 'A' : i === n.length - 1 ? 'B' : NODE_IC[node.type]}</div>
      <div class="rs-body"><div class="rs-name">${esc(node.name)}</div><div class="rs-desc">${esc(node.desc)}</div>
      ${stay ? `<div class="rs-stay">Permanencia ≈ ${fmtH(stay)}</div>` : ''}</div>
      <div class="rs-time">${fmtD(r.sch.arr[i])}<br><b>${fmtT(r.sch.arr[i])}</b></div></div>`;
    if (i < L.length) {
      const l = L[i];
      html += `<div class="rs-leg m-${l.mode}"><span class="rs-line"></span><span>${MODE_IC[l.mode]} ${MODE_LABEL[l.mode]}</span><span>${fmtKm(l.km)}</span><span>≈ ${fmtH(r.sch.legH[i])}</span></div>`;
    }
    return html;
  }).join('');
  return `<div class="tab-head"><h3>Ruta paso a paso · ${esc(r.svc.name)}</h3><p class="dim">Pulsa cualquier punto para situarlo en el mapa.</p></div>
    <div class="route-sum">
      ${Object.entries(byMode).map(([m, v]) => `<div class="stat"><span>${MODE_IC[m]} ${MODE_LABEL[m]}</span><b>${fmtKm(v.km)}</b><small>${fmtH(v.h)} en movimiento</small></div>`).join('')}
      <div class="stat"><span>⏳ Tiempo total</span><b>${fmtH(totalH)}</b><small>de admisión a entrega</small></div>
      <div class="stat"><span>🌱 CO₂</span><b>${fmtCO2(r.co2.g)}</b><small>${Object.entries(r.co2.by).map(([m, g]) => `${MODE_IC[m]} ${fmtCO2(g)}`).join(' · ')}</small></div>
    </div>
    <div class="rsteps">${rows}</div>
    <p class="hint">El resto del tiempo corresponde a esperas operativas: clasificación, consolidación de sacas, horarios de vuelos/barcos, aduanas y planificación del reparto. Los fines de semana y festivos no hay reparto.</p>`;
}

function tabTracking() {
  const r = sim.selected; if (!r) return '';
  const ev = buildEvents(r.route, r.sch, r.svc);
  const code = `SIM${r.svc.id.split('_').map(x => x[0].toUpperCase()).join('')}${String(hashStr(state.origin + state.dest + r.svc.id + state.date) % 1e9).padStart(9, '0')}ES`;
  const showAll = state.showInternal || r.svc.track === 'none';
  const list = ev.filter(e => showAll || e.visible).slice().reverse();
  return `<div class="tab-head"><h3>Seguimiento simulado</h3><p class="dim">Así vería el envío ${r.svc.track === 'none' ? 'internamente el operador (este servicio no tiene seguimiento para el cliente)' : 'el cliente en la web de seguimiento'}.</p></div>
    <div class="trk-head"><div><div class="eyebrow">Código de envío (ficticio)</div><div class="trk-code">${code}</div></div>
      <div><div class="eyebrow">${TRACK_LABEL[r.svc.track]}</div><div>${r.svc.track === 'partial' ? 'Visible hasta la salida de España y en la entrega' : r.svc.track === 'full' ? 'Todos los eventos, con firma digital' : 'Sin eventos visibles para el cliente'}</div></div>
      ${r.svc.track !== 'none' && r.svc.track !== 'full' ? `<label class="mini-tg"><input type="checkbox" id="showInternal" ${state.showInternal ? 'checked' : ''}> Mostrar eventos internos</label>` : ''}</div>
    <ol class="trk">${list.map(e => `<li class="${e.visible ? '' : 'internal'} k-${e.kind}" data-t="${e.t}">
      <div class="trk-dot"></div><div class="trk-t"><b>${fmtD(e.t)}</b><span>${fmtT(e.t)}</span></div>
      <div class="trk-b"><div class="trk-title">${esc(e.title)}${e.visible ? '' : ' <span class="tag mini">interno</span>'}</div><div class="trk-d">${esc(e.detail)}</div></div></li>`).join('')}</ol>`;
}

function gauge(label, v, max, unit, fmt = x => NUMF1.format(x)) {
  if (!max) return '';
  const p = Math.min(100, v / max * 100), cls = p > 100 - 1e-9 && v > max ? 'over' : p > 85 ? 'near' : 'ok';
  return `<div class="gauge ${v > max ? 'over' : cls}"><div class="g-h"><span>${label}</span><b>${fmt(v)} / ${fmt(max)} ${unit}</b></div><div class="g-bar"><i style="width:${Math.min(100, p)}%"></i></div></div>`;
}
function tabCost() {
  const r = sim.selected, ctx = sim.ctx; if (!r) return '';
  const p = r.price, Lm = r.svc.limits;
  const okList = sim.results.filter(x => x.ok);
  const maxT = Math.max(...okList.map(x => x.price.total), 1);
  return `<div class="tab-head"><h3>Desglose del precio · ${esc(r.svc.name)}</h3><p class="dim">Tarifas orientativas. ${ctx.cat === 'paquete' ? `Se factura por ${Math.max(1, Math.ceil(ctx.billKg - 1e-9))} kg (${ctx.volKg > ctx.realKg ? 'peso volumétrico' : 'peso real'}).` : ''}</p></div>
  <div class="cost-grid"><div>
    <table class="bill"><tbody>${p.lines.map(l => `<tr><td>${esc(l.label)}</td><td class="num ${l.amount < 0 ? 'neg' : ''}">${fmtE(l.amount)}</td></tr>`).join('')}
      <tr class="sub"><td>Subtotal</td><td class="num">${fmtE(p.subtotal)}</td></tr>
      <tr><td>${p.vatRate ? `IVA ${p.vatRate} %` : esc(p.vatNote)}</td><td class="num">${fmtE(p.vat)}</td></tr>
      <tr class="tot"><td>Total</td><td class="num">${fmtE(p.total)}</td></tr></tbody></table>
    ${(() => { const c = customsInfo(ctx, p.total); return c.taxes && c.taxes.total > 0 ? `<div class="note warn">🛃 Además, el destinatario podría pagar ≈ <b>${fmtE(c.taxes.total)}</b> en impuestos y gestión aduanera (ver «Aduanas y normas»).</div>` : ''; })()}
  </div><div>
    <h4>Límites del servicio</h4>
    ${gauge('Peso', ctx.g / 1000, Lm.maxG / 1000, 'kg', x => NUMF2.format(x))}
    ${gauge('Lado mayor', ctx.sorted[0], Lm.maxL, 'cm')}
    ${Lm.maxSum ? gauge('Suma de lados', ctx.sum, Lm.maxSum, 'cm') : ''}
    ${Lm.maxGirth ? gauge('Largo + contorno', ctx.girth, Lm.maxGirth, 'cm') : ''}
    ${Lm.maxT ? gauge('Grosor', ctx.sorted[2], Lm.maxT, 'cm') : ''}
    <h4>Comparativa de precios</h4>
    <div class="bars">${okList.sort((a, b) => a.price.total - b.price.total).map(x => `<div class="bar-row ${x === r ? 'sel' : ''}"><span>${esc(x.svc.name)}</span><div class="bar"><i style="width:${x.price.total / maxT * 100}%"></i></div><b>${fmtE(x.price.total)}</b></div>`).join('')}</div>
  </div></div>`;
}

function tabCustoms() {
  const r = sim.selected, ctx = sim.ctx; if (!r) return '';
  const c = customsInfo(ctx, r.price.total);
  const icon = { none: '✅', eu: '🇪🇺', docs: '📄', dua: '🛃', intl: '🛃' }[c.kind];
  const tips = packagingTips(ctx);
  return `<div class="tab-head"><h3>Aduanas, documentación y normas</h3></div>
  <div class="customs ${c.kind}"><div class="cu-ic">${icon}</div><div><h4>${esc(c.title)}</h4>
    ${c.forms.length ? `<div class="sub-h">Documentación necesaria</div><ul>${c.forms.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
    ${c.taxes ? `<div class="sub-h">Estimación de impuestos en destino (pagados por el destinatario)</div>
      <table class="bill sm"><tbody>
        <tr><td>Valor declarado</td><td class="num">${fmtE(ctx.value)}</td></tr>
        <tr><td>Franquicia aproximada</td><td class="num">${c.taxes.thr ? fmtE(c.taxes.thr) : 'Sin franquicia'}</td></tr>
        ${c.taxes.duty ? `<tr><td>Arancel (~${c.dutyRate} %)</td><td class="num">${fmtE(c.taxes.duty)}</td></tr>` : ''}
        <tr><td>${esc(c.taxes.name)} (${NUMF1.format(c.taxes.rate)} %)</td><td class="num">${fmtE(c.taxes.vat)}</td></tr>
        <tr><td>Gestión aduanera</td><td class="num">${fmtE(c.taxes.fee)}</td></tr>
        <tr class="tot"><td>Total estimado</td><td class="num">${fmtE(c.taxes.total)}</td></tr></tbody></table>` : ''}
    ${c.notes.length ? `<ul class="plain">${c.notes.map(n => `<li>ℹ️ ${esc(n)}</li>`).join('')}</ul>` : ''}
  </div></div>
  <div class="two-col">
    <div class="box"><h4>🚫 Artículos prohibidos</h4><ul>${PROHIBITED.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="box"><h4>⚠️ Artículos restringidos</h4><dl>${RESTRICTED.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl></div>
  </div>
  <div class="box"><h4>📦 Consejos de preparación</h4><ul>${tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
  ${r.warns.length ? `<div class="box warnbox"><h4>Avisos para este envío</h4><ul>${r.warns.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}`;
}

function tabZones() {
  const ctx = sim.ctx;
  const cat = ctx.cat;
  const nac = SERVICES.filter(s => s.cat === cat && s.scope === 'nac' && !s.today);
  const int = SERVICES.filter(s => s.cat === cat && s.scope === 'int');
  const nz = ['prov', 'pen', 'bal', 'inter', 'can', 'ceme'];
  const cell = (s, z) => { const d = s.days[z]; return d ? (d[0] === d[1] ? `${d[0]}` : `${d[0]}–${d[1]}`) : '—'; };
  const byZone = {}; Object.values(COUNTRIES).forEach(c => { if (c.z) (byZone[c.z] = byZone[c.z] || []).push(c); });
  return `<div class="tab-head"><h3>Zonas y plazos de referencia</h3><p class="dim">Días hábiles desde la expedición, para ${cat === 'paquete' ? 'paquetes' : cat === 'carta' ? 'cartas' : 'postales'}. Tu envío actual está resaltado.</p></div>
  <div class="tbl-wrap"><table class="zt"><thead><tr><th>Nacional</th>${nz.map(z => `<th class="${ctx.domestic && ctx.zone === z ? 'cur' : ''}">${ZONE_LABEL_NAC[z]}</th>`).join('')}</tr></thead>
  <tbody>${nac.map(s => `<tr><td>${s.icon} ${esc(s.name)}</td>${nz.map(z => `<td class="${ctx.domestic && ctx.zone === z ? 'cur' : ''}">${cell(s, z)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <div class="tbl-wrap"><table class="zt"><thead><tr><th>Internacional</th>${[1, 2, 3, 4, 5, 6].map(z => `<th class="${!ctx.domestic && ctx.zone === z ? 'cur' : ''}">Zona ${z}</th>`).join('')}</tr></thead>
  <tbody>${int.map(s => `<tr><td>${s.icon} ${esc(s.name)}</td>${[1, 2, 3, 4, 5, 6].map(z => `<td class="${!ctx.domestic && ctx.zone === z ? 'cur' : ''}">${cell(s, z)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <div class="zones">${[1, 2, 3, 4, 5, 6].map(z => `<div class="zone ${!ctx.domestic && ctx.zone === z ? 'cur' : ''}"><b>${ZONE_LABEL_INT[z]}</b><div class="flags">${byZone[z].map(c => `<span title="${esc(c.n)}">${c.f} ${esc(c.n)}</span>`).join('')}</div></div>`).join('')}</div>
  <p class="hint">Fuera de la UE se suma el tiempo de aduanas (+1 a +2 días). En campaña de Navidad (24 nov – 31 dic) los plazos pueden alargarse.</p>`;
}

/* ---------------- Utilidades UI ---------------- */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
function applyTheme(t) {
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  if (map) { setTiles(); if (sim?.selected) drawRoute(sim.selected); }
}

/* ---------------- App instalable ---------------- */
let deferredInstall = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function setupPWA() {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  const btn = $('#btnInstall');
  if (!isStandalone()) btn.hidden = false;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; btn.hidden = false; });
  window.addEventListener('appinstalled', () => { btn.hidden = true; toast('¡App instalada!'); });
  btn.addEventListener('click', async () => {
    if (deferredInstall) { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; return; }
    const share = '<svg class="ios-share" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11v9h12v-9"/></svg>';
    const ua = navigator.userAgent;
    let steps;
    if (isIOS()) steps = [`Abre esta página en <b>Safari</b>.`, `Pulsa el botón <b>Compartir</b> ${share}.`, 'Elige <b>«Añadir a pantalla de inicio»</b>.', 'Pulsa <b>Añadir</b>: aparecerá el icono «Envíos» y se abrirá a pantalla completa.'];
    else if (/Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) steps = ['En la barra de menús, abre <b>Archivo</b>.', 'Elige <b>«Añadir al Dock…»</b>.', 'Pulsa <b>Añadir</b>: la app aparecerá en el Dock y en Launchpad.'];
    else if (/Firefox/.test(ua)) steps = ['Firefox de escritorio no instala apps web.', 'Abre esta dirección en <b>Chrome</b>, <b>Edge</b> o <b>Safari</b> y pulsa «Instalar app».'];
    else steps = ['Pulsa el icono de <b>instalar</b> ⊕ a la derecha de la barra de direcciones.', 'O abre el menú ⋮ y elige <b>«Instalar Simulador de Envíos»</b> (en Chrome: <i>Enviar, guardar y compartir → Instalar página como app</i>).'];
    $('#installSteps').innerHTML = `<ol>${steps.map(x => `<li>${x}</li>`).join('')}</ol>`;
    $('#installSheet').hidden = false;
  });
  $('#installClose').addEventListener('click', () => { $('#installSheet').hidden = true; });
  $('#installSheet').addEventListener('click', e => { if (e.target.id === 'installSheet') e.target.hidden = true; });
  // Navegación inferior (móvil)
  const navBtns = $$('#bottomNav button');
  navBtns.forEach(b => b.addEventListener('click', () => $('#' + b.dataset.go).scrollIntoView({ behavior: 'smooth', block: 'start' })));
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) navBtns.forEach(b => b.classList.toggle('on', b.dataset.go === en.target.id)); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navBtns.forEach(b => io.observe($('#' + b.dataset.go)));
}

/* ---------------- Inicio ---------------- */
function init() {
  comboO = makeCombo('#comboOrigin', 'origin', () => ES_CITIES);
  comboD = makeCombo('#comboDest', 'dest', () => ALL_CITIES);
  $('#btnSwap').addEventListener('click', () => {
    if (CITY[state.dest].cc !== 'ES') { toast('El origen debe estar en España: solo se intercambian rutas nacionales'); return; }
    const o = state.origin; state.origin = state.dest; setCity('dest', o);
  });
  $('#cpOrigin').addEventListener('input', e => {
    const v = e.target.value.replace(/\D/g, ''); e.target.value = v;
    const hint = $('#cpHint');
    if (v.length >= 2) {
      const p = v.slice(0, 2);
      if (PROV_CAPITAL[p]) {
        hint.textContent = `${PROVINCES[p]}`; hint.className = 'hint ok';
        if (CITY[state.origin].prov !== p) { state.origin = PROV_CAPITAL[p]; comboO.show(); recompute(true); }
      } else { hint.textContent = 'CP no válido'; hint.className = 'hint bad'; }
    } else hint.textContent = '';
  });
  const quick = ['es-barcelona', 'es-las-palmas-de-gran-canaria', 'es-palma', 'pt-lisboa', 'fr-paris', 'de-berlin', 'gb-londres', 'us-nueva-york', 'mx-ciudad-de-mexico', 'ar-buenos-aires', 'jp-tokio', 'au-sidney'];
  $('#quickDest').innerHTML = quick.map(id => `<button class="chip sm" data-q="${id}">${cityFlag(CITY[id])} ${esc(CITY[id].name)}</button>`).join('');
  $$('#quickDest [data-q]').forEach(b => b.addEventListener('click', () => setCity('dest', b.dataset.q)));
  $$('#types button').forEach(b => b.addEventListener('click', () => { state.cat = b.dataset.cat; state.selected = null; renderSize(); renderOpts(); recompute(); }));
  $$('#tabs button').forEach(b => b.addEventListener('click', () => { state.tab = b.dataset.tab; recompute(); }));
  $$('.click-mode button').forEach(b => b.addEventListener('click', () => { state.clickMode = b.dataset.mode; $$('.click-mode button').forEach(x => x.classList.toggle('on', x === b)); }));
  $$('.click-mode button').forEach(x => x.classList.toggle('on', x.dataset.mode === state.clickMode));
  bindInputs($('#whenBlock'));
  $('#btnNow').addEventListener('click', () => { const n = nowParts(); state.date = n.date; state.time = n.time; $('#inDate').value = n.date; $('#inTime').value = n.time; recompute(); });
  $('#btnPlay').addEventListener('click', () => playToggle());
  $('#animRange').addEventListener('input', e => { playToggle(false); setProgress(e.target.value / 1000); });
  $('#btnShare').addEventListener('click', async () => {
    const url = location.href.split('#')[0] + '#s=' + btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    try { await navigator.clipboard.writeText(url); toast('Enlace copiado al portapapeles'); } catch (e) { history.replaceState(null, '', url); toast('Enlace actualizado en la barra de direcciones'); }
  });
  $('#btnPrint').addEventListener('click', () => window.print());
  $('#btnTheme').addEventListener('click', () => applyTheme(isDark() ? 'light' : 'dark'));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!document.documentElement.dataset.theme) applyTheme(); });
  renderSize(); renderOpts();
  setupPWA();
  initMap();
  recompute(true);
}
document.addEventListener('DOMContentLoaded', init);
