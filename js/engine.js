'use strict';
/* =========================================================================
   Motor de simulación: rutas, plazos, precios, aduanas, CO₂ y seguimiento
   ========================================================================= */

const toRad = x => x * Math.PI / 180;
function distKm(a, b) {
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}
const NUMF1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
const NUMF2 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });
const fmtW = g => g < 1000 ? Math.round(g) + ' g' : NUMF2.format(g / 1000) + ' kg';
const fmtCm = v => NUMF1.format(v) + ' cm';
const fmtKm = k => k < 10 ? NUMF1.format(k) + ' km' : Math.round(k).toLocaleString('es-ES') + ' km';
function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const round2 = v => Math.round(v * 100) / 100;

const MODE_LABEL = { van: 'Furgoneta', truck: 'Camión', plane: 'Avión', ship: 'Barco' };
const MODE_IC = { van: '🚐', truck: '🚛', plane: '✈️', ship: '🚢' };
const ZONE_LABEL_NAC = { prov: 'Provincial / local', pen: 'Peninsular', bal: 'Baleares', inter: 'Interinsular', can: 'Canarias', ceme: 'Ceuta y Melilla' };
const ZONE_LABEL_INT = { 1: 'Zona 1 · Portugal, Andorra y Gibraltar', 2: 'Zona 2 · Unión Europea', 3: 'Zona 3 · Resto de Europa',
  4: 'Zona 4 · Magreb y Norteamérica', 5: 'Zona 5 · Latinoamérica y Caribe', 6: 'Zona 6 · Asia, África y Oceanía' };
const TRACK_LABEL = { none: 'Sin seguimiento', partial: 'Seguimiento parcial', full: 'Seguimiento completo' };

/* ---------------- Geografía española ---------------- */
function regionOf(c) {
  if (c.cc !== 'ES') return null;
  const p = c.prov;
  if (p === '07') return 'BAL';
  if (p === '35' || p === '38') return 'CAN';
  if (p === '51') return 'CEU';
  if (p === '52') return 'MEL';
  return 'PEN';
}
function ctaOf(c) {
  const r = regionOf(c);
  if (r === 'BAL') return 'PMI';
  if (r === 'CAN') return c.prov === '35' ? 'LPA' : 'TFN';
  if (r === 'CEU') return 'CEU';
  if (r === 'MEL') return 'MLN';
  let best = 'MAD', bd = Infinity;
  for (const [id, cta] of Object.entries(CTAS)) {
    if (cta.region !== 'PEN') continue;
    const d = distKm(c, cta);
    if (d < bd) { bd = d; best = id; }
  }
  return best;
}
function nationalZone(o, d) {
  const ro = regionOf(o), rd = regionOf(d);
  if (ro === 'PEN' && rd === 'PEN') return o.prov === d.prov ? 'prov' : 'pen';
  if (ro === 'CAN' || rd === 'CAN') return ro === rd ? (o.island === d.island ? 'prov' : 'inter') : 'can';
  if (['CEU', 'MEL'].includes(ro) || ['CEU', 'MEL'].includes(rd)) return ro === rd ? 'prov' : 'ceme';
  return ro === rd ? (o.island === d.island ? 'prov' : 'inter') : 'bal';
}

/* ---------------- Contexto ---------------- */
function buildCtx(s) {
  const o = CITY[s.origin], d = CITY[s.dest];
  const domestic = d.cc === 'ES';
  const country = COUNTRIES[d.cc];
  const ro = regionOf(o), rd = domestic ? regionOf(d) : null;
  const zone = domestic ? nationalZone(o, d) : country.z;
  let dims, g;
  if (s.cat === 'carta') { dims = { l: +s.letter.l || 0, w: +s.letter.w || 0, h: (+s.letter.t || 0) / 10 }; g = +s.letter.g || 0; }
  else if (s.cat === 'postal') { dims = { l: +s.postal.l || 0, w: +s.postal.w || 0, h: 0.05 }; g = +s.postal.g || 0; }
  else { dims = { l: +s.pack.l || 0, w: +s.pack.w || 0, h: +s.pack.h || 0 }; g = (+s.pack.kg || 0) * 1000; }
  const sorted = [dims.l, dims.w, dims.h].sort((a, b) => b - a);
  const sum = sorted[0] + sorted[1] + sorted[2];
  const girth = sorted[0] + 2 * (sorted[1] + sorted[2]);
  const realKg = g / 1000;
  const volKg = s.cat === 'paquete' ? dims.l * dims.w * dims.h / 6000 : 0;
  const billKg = Math.max(realKg, volKg);
  const content = s.cat === 'postal' ? 'docs' : s.cat === 'carta' ? (s.letterContent || 'docs') : s.content;
  const goods = content !== 'docs';
  const special = r => ['CAN', 'CEU', 'MEL'].includes(r);
  const customsDom = domestic && ro !== rd && (special(ro) || special(rd)) && goods;
  const customsIntl = !domestic && !country.eu && goods;
  const inNormRange = sorted[0] >= 14 && sorted[1] >= 9 && sorted[0] <= 23.5 && sorted[1] <= 12;
  const letterNorm = s.cat !== 'paquete' && inNormRange && sorted[2] <= 0.5 && g <= 20;
  let shipDate = new Date(`${s.date}T${s.time || '10:00'}`);
  if (isNaN(shipDate)) shipDate = new Date();
  return { s, o, d, domestic, country, ro, rd, zone, dims, sorted, sum, girth, g, realKg, volKg, billKg, content, goods,
    customsDom, customsIntl, letterNorm, shipDate, opts: s.opts, value: Math.max(0, +s.value || 0), cat: s.cat, distance: distKm(o, d) };
}
function servicesFor(ctx) { return SERVICES.filter(x => x.cat === ctx.cat && x.scope === (ctx.domestic ? 'nac' : 'int')); }
function fitsCitypaq(ctx) { return ctx.sorted.every((v, i) => v <= CITYPAQ_MAX[i]) && ctx.g <= 15000; }
function deliveryOf(svc, ctx) { return (svc.cat === 'paquete' && ctx.domestic && !svc.today) ? ctx.opts.delivery : 'domicilio'; }

/* Medio de transporte principal del servicio */
function svcMode(svc, ctx) {
  if (ctx.domestic) return svc.air ? 'air' : 'sea';
  if (ctx.zone === 1) return 'road';
  if (svc.id === 'paq_int_eco' && ctx.country.road) return 'road';
  return 'air';
}

/* ---------------- Ruta ---------------- */
function buildRoute(svc, ctx) {
  const nodes = [], legs = [];
  const mode = svcMode(svc, ctx);
  const o = ctx.o, d = ctx.d;
  const N = (key, name, lat, lng, type, desc) => ({ key, name, lat, lng, type, desc: desc || '' });
  const push = (n, legMode) => {
    const last = nodes[nodes.length - 1];
    if (last && last.key === n.key) return;
    if (last) legs.push({ mode: legMode, km: distKm(last, n) });
    nodes.push(n);
  };
  const ctaN = id => N('cta:' + id, CTAS[id].name, CTAS[id].lat, CTAS[id].lng, 'cta', 'Clasificación automatizada, lectura de código y consolidación por destino');
  const arrN = (a, key, desc) => N(key, a[0], a[1], a[2], a[3], desc);
  const descOf = t => t === 'airport' ? 'Consolidación en sacas y carga en bodega del avión' : 'Carga en contenedor y embarque en buque';
  const longMode = m => m === 'air' ? 'plane' : 'ship';

  function penPath(a, b) {
    if (a === b) { push(ctaN(b), 'truck'); return; }
    const A = CTAS[a], B = CTAS[b], M = CTAS.MAD, dab = distKm(A, B);
    if (a !== 'MAD' && b !== 'MAD' && dab > 400 && distKm(A, M) + distKm(M, B) < 1.3 * dab) push(ctaN('MAD'), 'truck');
    push(ctaN(b), 'truck');
  }
  function gwFor(cta, m) { const g = GATEWAYS[GW_KEY[cta]]; return g[m === 'air' ? 'air' : 'sea'] || g.sea || g.air; }
  function customsNode(at, key, where) {
    return N(key, 'Aduana · ' + where, at.lat + 0.03, at.lng + 0.03, 'customs',
      'Despacho aduanero (DUA): Canarias, Ceuta y Melilla están fuera del territorio IVA de la UE');
  }
  function leaveIsland(cur, m, withCustoms, transfer) {
    const gw = gwFor(cur, m);
    push(arrN(gw.isl, 'gwi:' + gw.isl[0], descOf(gw.isl[3])), 'van');
    const main = arrN(gw.main, 'gwm:' + gw.main[0], gw.main[3] === 'airport' ? 'Descarga y traslado al centro de tratamiento' : 'Desembarque del contenedor');
    push(main, gw.isl[3] === 'airport' ? 'plane' : 'ship');
    if (withCustoms) push(customsNode(main, 'cus:' + main.key, 'importación en Península'), 'van');
    if (transfer) { main.desc = 'Transbordo directo a la conexión con destino'; return gw.cta; }
    push(ctaN(gw.cta), 'truck');
    return gw.cta;
  }
  function enterIsland(cur, dc, m, withCustoms, transfer) {
    const gw = gwFor(dc, m);
    if (!transfer) {
      penPath(cur, gw.cta);
      push(arrN(gw.main, 'gwm:' + gw.main[0], descOf(gw.main[3])), 'truck');
    }
    const isl = arrN(gw.isl, 'gwi:' + gw.isl[0], 'Llegada y descarga');
    push(isl, gw.main[3] === 'airport' ? 'plane' : 'ship');
    if (withCustoms) push(customsNode(isl, 'cus:' + isl.key, 'importación en ' + (CTAS[dc].region === 'CAN' ? 'Canarias' : CTAS[dc].region === 'CEU' ? 'Ceuta' : 'Melilla')), 'van');
    push(ctaN(dc), 'van');
  }

  // 1) Origen
  const pickup = ctx.opts.pickup && svc.cat === 'paquete';
  push(pickup
    ? N('start', 'Recogida a domicilio · ' + o.name, o.lat, o.lng, 'home', 'Un cartero recoge el envío en tu domicilio')
    : N('start', 'Oficina de admisión · ' + o.name, o.lat + 0.004, o.lng - 0.004, 'office', 'Admisión, pesaje, franqueo y etiquetado'));
  let cur = ctaOf(o);
  const secondaryO = o.island && CTAS[cur].island && o.island !== CTAS[cur].island;
  push(ctaN(cur), secondaryO ? longMode(mode === 'road' ? 'sea' : mode) : 'van');

  let dcNode;
  if (ctx.domestic) {
    const dc = ctaOf(d);
    const ro = CTAS[cur].region, rd = CTAS[dc].region;
    if (cur !== dc) {
      if (ro === 'PEN' && rd === 'PEN') penPath(cur, dc);
      else if (ro === rd) push(ctaN(dc), longMode(mode));
      else {
        const transfer = ro !== 'PEN' && rd !== 'PEN' && gwFor(cur, mode).main[0] === gwFor(dc, mode).main[0];
        if (ro !== 'PEN') cur = leaveIsland(cur, mode, ctx.customsDom && rd === 'PEN', transfer);
        if (rd !== 'PEN') enterIsland(cur, dc, mode, ctx.customsDom, transfer);
        else penPath(cur, dc);
      }
    }
    const secondaryD = d.island && CTAS[dc].island && d.island !== CTAS[dc].island;
    dcNode = N('dc', 'Unidad de reparto · ' + d.name, d.lat - 0.006, d.lng + 0.006, 'delivery', 'Preparación de la ruta del cartero');
    push(dcNode, secondaryD ? longMode(mode) : 'van');
  } else {
    const C = ctx.country;
    const hub = N('hub', C.hub[0], C.hub[1], C.hub[2], ctx.customsIntl ? 'customs' : 'hub',
      ctx.customsIntl ? 'Llegada al país, control aduanero e impuestos de importación' : 'Recepción por el operador postal de destino y clasificación nacional');
    const ro = CTAS[cur].region;
    const exportDesc = ctx.customsIntl ? ' · Declaración de exportación (salida de la UE)' : '';
    if (mode === 'road') {
      if (ro !== 'PEN') cur = leaveIsland(cur, 'sea', false);
      const bws = C.b.map(k => N('border:' + k, BORDERS[k][0], BORDERS[k][1], BORDERS[k][2], 'border', 'Paso fronterizo por carretera' + exportDesc));
      const A = CTAS[cur], M = CTAS.MAD;
      if (cur !== 'MAD' && distKm(A, M) + distKm(M, bws[0]) < 1.25 * distKm(A, bws[0])) push(ctaN('MAD'), 'truck');
      bws.forEach(b => push(b, 'truck'));
      push(hub, 'truck');
    } else {
      if (ro !== 'PEN') cur = leaveIsland(cur, ro === 'CEU' ? 'sea' : 'air', false);
      const useBCN = cur === 'BCN';
      if (!useBCN && cur !== 'MAD') push(ctaN('MAD'), 'truck');
      const ex = EXCHANGE[useBCN ? 'BCN' : 'MAD'];
      const exch = N('exch', ex[0], ex[1], ex[2], 'airport', 'Oficina de cambio internacional: sacas por país de destino' + exportDesc);
      push(exch, 'van');
      if (distKm(exch, hub) > 8500 && C.hub[2] > 40) push(N('transit', DOHA[0], DOHA[1], DOHA[2], 'transit', 'Transbordo a vuelo de conexión'), 'plane');
      push(hub, 'plane');
    }
    const dh = distKm(hub, d);
    dcNode = N('dc', 'Unidad de reparto · ' + d.name, d.lat - 0.006, d.lng + 0.006, 'delivery', 'Operador postal local: preparación del reparto');
    push(dcNode, dh > 700 ? 'plane' : dh > 40 ? 'truck' : 'van');
  }

  // Último tramo
  const del = deliveryOf(svc, ctx);
  let end;
  if (del === 'oficina') end = N('end', 'Oficina de destino · ' + d.name, d.lat + 0.006, d.lng - 0.006, 'office', 'El destinatario lo recoge con DNI o código de recogida (15 días)');
  else if (del === 'citypaq') end = N('end', 'Citypaq · ' + d.name, d.lat + 0.006, d.lng - 0.006, 'locker', 'Taquilla automática 24 h: recogida con el código recibido por SMS/email');
  else if (svc.cat !== 'paquete' && !svc.sign) end = N('end', 'Buzón del destinatario · ' + d.name, d.lat, d.lng, 'home', 'Depósito en el buzón domiciliario');
  else if (svc.id === 'paq_ligero' && ctx.sorted[2] <= 3) end = N('end', 'Buzón del destinatario · ' + d.name, d.lat, d.lng, 'home', 'Cabe por la ranura del buzón (≤ 3 cm): se entrega sin necesidad de estar en casa');
  else end = N('end', 'Domicilio del destinatario · ' + d.name, d.lat, d.lng, 'home', svc.sign ? 'Entrega en mano con firma digital' : 'Entrega a domicilio');
  push(end, 'van');
  return { nodes, legs, mode, delivery: del };
}

/* ---------------- Calendario ---------------- */
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function easterSunday(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
const holidayCache = {};
function holidaysOf(y) {
  if (holidayCache[y]) return holidayCache[y];
  const m = new Map();
  [['01-01', 'Año Nuevo'], ['01-06', 'Epifanía del Señor'], ['05-01', 'Fiesta del Trabajo'], ['08-15', 'Asunción de la Virgen'],
   ['10-12', 'Fiesta Nacional de España'], ['11-01', 'Todos los Santos'], ['12-06', 'Día de la Constitución'],
   ['12-08', 'Inmaculada Concepción'], ['12-25', 'Navidad']].forEach(([md, n]) => m.set(`${y}-${md}`, n));
  const gf = easterSunday(y); gf.setDate(gf.getDate() - 2); m.set(ymd(gf), 'Viernes Santo');
  return (holidayCache[y] = m);
}
const holidayName = d => holidaysOf(d.getFullYear()).get(ymd(d));
function isBiz(d, sat) { const w = d.getDay(); if (w === 0 || (w === 6 && !sat)) return false; return !holidayName(d); }
function nextBiz(d, sat) { const x = new Date(d); do { x.setDate(x.getDate() + 1); } while (!isBiz(x, sat)); return x; }
function addBiz(d, n, sat) { let x = new Date(d); for (let i = 0; i < n; i++) x = nextBiz(x, sat); return x; }
const setHM = (d, h, m) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
const isPeak = d => (d.getMonth() === 10 && d.getDate() >= 24) || d.getMonth() === 11;
function skippedReason(d) {
  const hn = holidayName(d);
  if (hn) return `festivo nacional (${hn})`;
  if (d.getDay() === 0) return 'domingo';
  if (d.getDay() === 6) return 'sábado';
  return 'fuera del horario de oficina';
}

function daysFor(svc, ctx) {
  const r = svc.days[ctx.zone];
  if (!r) return null;
  let [a, b] = r;
  if (ctx.customsDom) b += 1;
  if (ctx.customsIntl) b += ctx.zone >= 5 ? 2 : 1;
  if (isPeak(ctx.shipDate)) { if (svc.scope === 'int') a += 1; b += 1; }
  return [a, b];
}

function timing(svc, ctx, range) {
  const sat = !!(svc.saturday && ctx.opts.saturday);
  const notes = [];
  let t = new Date(ctx.shipDate);
  const pickup = ctx.opts.pickup && svc.cat === 'paquete';
  if (pickup) {
    if (isBiz(t, false) && t.getHours() < 9) t = setHM(t, 11, 0);
    else { t = setHM(nextBiz(t, false), 11, 0); notes.push('La recogida a domicilio se programa para la mañana del siguiente día hábil.'); }
  } else {
    const mins = t.getHours() * 60 + t.getMinutes();
    if (!isBiz(t, false) || mins > 20 * 60 + 30) {
      notes.push(`El ${fmtDayShort(t)} es ${skippedReason(t)}: la admisión pasa al siguiente día hábil.`);
      t = setHM(nextBiz(t, false), 8, 30);
    } else if (mins < 8 * 60 + 30) t = setHM(t, 8, 30);
  }
  const admit = new Date(t);
  const cutoff = svc.today ? 13 : 14;
  let dispatch = setHM(admit, 0, 0);
  if (admit.getHours() * 60 + admit.getMinutes() >= cutoff * 60) {
    dispatch = setHM(nextBiz(admit, false), 0, 0);
    notes.push(`Admitido después de las ${cutoff}:00: sale en la expedición del siguiente día hábil.`);
  }
  const [mn, mx] = range;
  const prob = mn + Math.round((mx - mn) * 0.34);
  const dMin = addBiz(dispatch, mn, sat), dMax = addBiz(dispatch, mx, sat), dProb = addBiz(dispatch, prob, sat);
  const h = hashStr(ctx.d.id + svc.id);
  const del = deliveryOf(svc, ctx);
  let hm;
  if (svc.today) hm = [19, 30];
  else if (del !== 'domicilio') hm = [10, 0];
  else if (svc.cat !== 'paquete') hm = [10 + (h % 3), (h >> 3) % 60];
  else if (svc.id.includes('premium')) hm = [9 + (h % 4), (h >> 3) % 60];
  else hm = [10 + (h % 8), (h >> 3) % 60];
  const T1 = setHM(dProb, hm[0], hm[1]);
  let depart0 = svc.today ? new Date(Math.max(+admit + 30 * 60e3, +setHM(dispatch, 10, 0))) : setHM(dispatch, 18, 30);
  if (depart0 <= admit) depart0 = new Date(+admit + 3600e3);
  if (T1 <= depart0) T1.setTime(+depart0 + 3 * 3600e3);
  // Festivos atravesados
  const crossed = [];
  for (let x = new Date(dispatch); x <= dMax; x.setDate(x.getDate() + 1)) { const hn = holidayName(x); if (hn && x.getDay() !== 0 && !(x.getDay() === 6 && !sat)) crossed.push(`${fmtDayShort(x)} (${hn})`); }
  if (crossed.length) notes.push('Festivos nacionales en el periodo (no hay reparto): ' + crossed.join(', ') + '.');
  if (isPeak(ctx.shipDate)) notes.push('Campaña de Black Friday y Navidad: se añade margen por el aumento de volumen.');
  if (sat) notes.push('Entrega en sábado activada: el sábado cuenta como día de reparto.');
  return { admit, dispatch, dMin, dMax, dProb, T1, depart0, prob, notes, sat, cutoff };
}
function fmtDayShort(d) { return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }); }

/* Reparte el tiempo entre tramos (tiempos reales) y esperas en nodos (holgura) */
const SPEED = { van: 30, truck: 70, plane: 780, ship: 28 };
const LEG_FIXED = { van: 0.3, truck: 0.8, plane: 2.5, ship: 1.5 };
const PROC = { office: 4, home: 1, cta: 5, airport: 6, port: 8, border: 1, customs: 30, hub: 8, delivery: 10, locker: 0, transit: 3 };
function schedule(route, tm) {
  const legH = route.legs.map(l => l.km / SPEED[l.mode] + LEG_FIXED[l.mode]);
  const sumLegs = legH.reduce((a, b) => a + b, 0);
  const avail = (tm.T1 - tm.depart0) / 36e5;
  let scale = 1, slack = avail - sumLegs;
  if (slack < 0.2 * avail) { scale = 0.8 * avail / sumLegs; slack = 0.2 * avail; }
  const last = route.nodes.length - 1;
  const w = route.nodes.map((n, i) => (i === 0 || i === last) ? 0 : (PROC[n.type] || 3));
  const W = w.reduce((a, b) => a + b, 0) || 1;
  const arr = [+tm.admit], dep = [+tm.depart0];
  for (let i = 1; i <= last; i++) {
    arr[i] = dep[i - 1] + legH[i - 1] * scale * 36e5;
    dep[i] = arr[i] + slack * w[i] / W * 36e5;
  }
  arr[last] = +tm.T1; dep[last] = +tm.T1;
  return { arr, dep, legH: legH.map(h => h * scale) };
}

/* ---------------- Evaluación (elegibilidad) ---------------- */
function evaluate(svc, ctx, route) {
  const reasons = [], warns = [];
  const L = svc.limits, c = ctx.country, S = ctx.sorted;
  if (!ctx.domestic && c.suspended) reasons.push(`Admisión suspendida actualmente con destino ${c.n}`);
  if (!svc.days[ctx.zone] && !svc.today) reasons.push('No disponible para esta zona');
  if (svc.today) {
    if (ctx.o.id !== ctx.d.id) reasons.push('Solo para envíos dentro de la misma ciudad');
    else if (!TODAY_CITIES.has(ctx.o.name)) reasons.push('Disponible solo en grandes ciudades');
  }
  if (L.maxG && ctx.g > L.maxG) reasons.push(`Peso ${fmtW(ctx.g)} > máximo ${fmtW(L.maxG)}`);
  if (!ctx.domestic && svc.cat === 'paquete' && ctx.g > c.maxKg * 1000) reasons.push(`${c.n} admite como máximo ${c.maxKg} kg`);
  if (L.maxL && S[0] > L.maxL) reasons.push(`Lado mayor ${fmtCm(S[0])} > ${L.maxL} cm`);
  if (L.maxW && S[1] > L.maxW) reasons.push(`Ancho ${fmtCm(S[1])} > ${L.maxW} cm`);
  if (L.maxSum && ctx.sum > L.maxSum) reasons.push(`Suma de lados ${fmtCm(ctx.sum)} > ${L.maxSum} cm`);
  if (L.maxGirth && ctx.girth > L.maxGirth) reasons.push(`Largo + contorno ${fmtCm(ctx.girth)} > ${L.maxGirth} cm`);
  if (L.maxT && S[2] > L.maxT) reasons.push(`Grosor ${fmtCm(S[2])} > ${L.maxT} cm: envíalo como paquete`);
  if (L.minL && (S[0] < L.minL || S[1] < L.minW)) reasons.push(`Inferior al tamaño mínimo (${L.minL}×${L.minW} cm)`);
  if (ctx.g <= 0 || S[0] <= 0) reasons.push('Indica medidas y peso');
  // Opciones requeridas
  const o = ctx.opts;
  if (o.cod && svc.cat === 'paquete' && ctx.domestic && !svc.cod) reasons.push('No admite reembolso (contra reembolso)');
  if (o.insure && !svc.ins) reasons.push('No admite seguro / valor declarado');
  if (o.ack && !svc.ack) reasons.push('No ofrece aviso de recibo');
  const del = deliveryOf(svc, ctx);
  if (del === 'citypaq') {
    if (!svc.citypaq) reasons.push('No disponible para entrega en Citypaq');
    else if (!fitsCitypaq(ctx)) reasons.push('No cabe en una taquilla Citypaq (máx. 61×44×41 cm y 15 kg)');
  }
  // Contenido y transporte
  const usesAir = route.legs.some(l => l.mode === 'plane');
  if (ctx.content === 'cosmetica' && usesAir) reasons.push('Perfumes y aerosoles inflamables no pueden viajar en avión');
  if (ctx.content === 'electronica' && usesAir) warns.push('Baterías de litio: solo instaladas en el equipo, nunca sueltas.');
  if (ctx.content === 'medicamentos' && !ctx.domestic) warns.push('Medicamentos: muchos destinos los prohíben; requiere receta y uso personal.');
  if (ctx.content === 'alimentos' && ctx.customsIntl) warns.push('Alimentos fuera de la UE: declaración detallada y posibles controles sanitarios.');
  if (svc.cat === 'carta' && ctx.goods && (ctx.customsIntl || ctx.customsDom)) warns.push('Mercancía en un sobre: necesita declaración de aduanas CN22.');
  if (o.insure && svc.ins) {
    const maxIns = ctx.domestic ? 3000 : 2000;
    if (+o.insured > maxIns) warns.push(`El valor asegurado máximo es ${maxIns.toLocaleString('es-ES')} €.`);
  }
  if (o.saturday && svc.cat === 'paquete' && ctx.domestic && !svc.saturday) warns.push('La entrega en sábado solo está disponible con Paq Premium.');
  return { ok: reasons.length === 0, reasons, warns };
}

/* ---------------- Precio ---------------- */
function bandPrice(bands, prices, v) { for (let i = 0; i < bands.length; i++) if (v <= bands[i] + 1e-9) return { price: prices[i], upTo: bands[i] }; return null; }
function priceFor(svc, ctx) {
  const P = svc.pricing, lines = [];
  let base = 0, baseLabel = '';
  const grp = ctx.zone <= 3 ? 'eu' : 'w';
  if (P.type === 'letterNac') {
    const g = ctx.letterNorm ? ctx.g : Math.max(ctx.g, 20.1);
    const b = bandPrice(LETTER_BANDS_NAC, P.prices, g) || { price: P.prices.at(-1), upTo: 2000 };
    base = b.price; baseLabel = `Tarifa ${svc.name.toLowerCase()} · hasta ${fmtW(b.upTo)}${ctx.letterNorm ? ' (normalizada)' : ' (no normalizada)'}`;
  } else if (P.type === 'letterInt') {
    const g = ctx.letterNorm ? ctx.g : Math.max(ctx.g, 20.1);
    const b = bandPrice(LETTER_BANDS_INT, LETTER_INT_PRICES[grp], g) || { price: LETTER_INT_PRICES[grp].at(-1), upTo: 2000 };
    base = b.price; baseLabel = `Carta ${grp === 'eu' ? 'Europa' : 'resto del mundo'} · hasta ${fmtW(b.upTo)}`;
    if (P.add[grp]) lines.push({ label: svc.id.includes('cert') ? 'Suplemento certificado internacional' : 'Suplemento urgente internacional', amount: P.add[grp] });
  } else if (P.type === 'postal') {
    base = ctx.domestic ? P.eu : P[grp]; baseLabel = `Franqueo postal ${ctx.domestic ? 'nacional' : grp === 'eu' ? 'Europa' : 'resto del mundo'}`;
  } else if (P.type === 'bandsKg') {
    const t = P.table[ctx.zone] || P.table[Object.keys(P.table)[0]];
    const b = bandPrice(P.bands, t, ctx.billKg) || { price: t.at(-1), upTo: P.bands.at(-1) };
    base = b.price; baseLabel = `${svc.name} · tramo hasta ${NUMF2.format(b.upTo)} kg`;
  } else if (P.type === 'linearKg') {
    const t = P.table[ctx.zone] || P.table[Object.keys(P.table)[0]];
    const kg = Math.max(1, Math.ceil(ctx.billKg - 1e-9));
    base = t[0]; baseLabel = `${svc.name} · primer kg`;
    if (kg > 1) lines.push({ label: `${kg - 1} kg adicional${kg > 2 ? 'es' : ''} × ${NUMF2.format(t[1])} €`, amount: (kg - 1) * t[1] });
  }
  lines.unshift({ label: baseLabel, amount: base });
  const o = ctx.opts;
  const isPack = svc.cat === 'paquete';
  if (o.insure && svc.ins) {
    const v = Math.min(+o.insured || 0, ctx.domestic ? 3000 : 2000);
    const covered = svc.insIncl ? Math.max(0, v - svc.insIncl) : v;
    if (covered > 0) lines.push({ label: `Seguro / valor declarado (${v.toLocaleString('es-ES')} €)`, amount: Math.max(1.5, covered * 0.01) });
    else lines.push({ label: `Seguro incluido hasta ${svc.insIncl} €`, amount: 0 });
  }
  if (o.ack && svc.ack) lines.push({ label: isPack ? 'Prueba de entrega / aviso de recibo' : 'Aviso de recibo', amount: ctx.domestic ? 1.45 : 1.75 });
  if (o.cod && isPack && ctx.domestic && svc.cod) lines.push({ label: `Reembolso (${(+o.codAmount || 0).toLocaleString('es-ES')} € a cobrar)`, amount: 2.6 + 0.015 * (+o.codAmount || 0) });
  if (o.pickup && isPack) lines.push({ label: 'Recogida a domicilio', amount: ctx.domestic ? 3.5 : 6 });
  if (o.saturday && svc.saturday) lines.push({ label: 'Entrega en sábado', amount: 4.95 });
  if (isPack && o.box && o.box !== 'none') lines.push({ label: 'Embalaje: ' + BOXES[o.box][0], amount: BOXES[o.box][1] });
  const del = deliveryOf(svc, ctx);
  if (del === 'oficina' && isPack) lines.push({ label: 'Entrega en oficina elegida (descuento)', amount: -0.6 });
  if (del === 'citypaq' && isPack) lines.push({ label: 'Entrega en Citypaq (descuento)', amount: -0.9 });
  const subtotal = round2(lines.reduce((a, l) => a + l.amount, 0));
  let vatRate = 0, vatNote = '';
  if (svc.vat && ctx.domestic && !['CAN', 'CEU', 'MEL'].includes(ctx.ro) && !['CAN', 'CEU', 'MEL'].includes(ctx.rd)) vatRate = 21;
  else if (svc.cat !== 'paquete' && ctx.domestic) vatNote = 'Exento de IVA (servicio postal universal)';
  else if (!ctx.domestic) vatNote = 'Exento de IVA (servicio de exportación)';
  else vatNote = 'Sin IVA peninsular (Canarias, Ceuta o Melilla)';
  const vat = round2(subtotal * vatRate / 100);
  return { lines: lines.map(l => ({ ...l, amount: round2(l.amount) })), subtotal, vatRate, vat, vatNote, total: round2(subtotal + vat) };
}

/* ---------------- CO₂ ---------------- */
const CO2F = { van: 0.55, truck: 0.09, plane: 1.05, ship: 0.02 }; // kg CO₂ por t·km
function co2(route, kg) {
  const t = Math.max(kg, 0.05) / 1000, by = {};
  let total = 0;
  route.legs.forEach(l => { const g = t * l.km * CO2F[l.mode] * 1000; total += g; by[l.mode] = (by[l.mode] || 0) + g; });
  return { g: total, by };
}

/* ---------------- Aduanas ---------------- */
function customsInfo(ctx, shipping) {
  const c = ctx.country, out = { kind: 'none', title: '', forms: [], notes: [], taxes: null };
  if (ctx.domestic) {
    if (!ctx.customsDom) {
      const sp = ['CAN', 'CEU', 'MEL'];
      if (ctx.ro !== ctx.rd && (sp.includes(ctx.ro) || sp.includes(ctx.rd))) {
        out.kind = 'docs'; out.title = 'Documentos: sin trámites aduaneros';
        out.notes.push('Los documentos sin valor comercial no requieren DUA entre la Península y Canarias, Ceuta o Melilla.');
      } else { out.kind = 'none'; out.title = 'Envío nacional sin aduanas'; out.notes.push('Origen y destino están en el mismo territorio fiscal: no hay trámites aduaneros.'); }
      return out;
    }
    out.kind = 'dua'; out.title = 'Despacho aduanero (DUA)';
    out.forms = ['DUA de exportación e importación (lo tramita el operador postal como representante aduanero)', 'Factura o declaración del valor y naturaleza del contenido', 'NIF/NIE del remitente y del destinatario'];
    const rd = ctx.rd;
    const [taxName, rate] = rd === 'CAN' ? ['IGIC', 7] : (rd === 'CEU' || rd === 'MEL') ? ['IPSI', 4] : ['IVA', 21];
    const thr = 150;
    const taxable = ctx.value > thr;
    const tax = taxable ? round2((ctx.value + shipping) * rate / 100) : 0;
    const fee = ctx.value > 22 ? 4.9 : 0;
    out.taxes = { name: taxName, rate, thr, vat: tax, duty: 0, fee, total: round2(tax + fee) };
    out.notes.push(`Canarias, Ceuta y Melilla están fuera del territorio IVA de la UE: los envíos de mercancía con la Península pasan aduana.`);
    out.notes.push(`Envíos entre particulares sin carácter comercial de hasta ${thr} € suelen estar exentos de ${taxName} (orientativo).`);
    return out;
  }
  if (c.eu) {
    out.kind = 'eu'; out.title = 'Envío intracomunitario: sin aduanas';
    out.notes.push('Dentro del mercado único de la UE no hay declaración de aduanas ni aranceles.');
    if (ctx.goods) out.notes.push('Si vendes a particulares de otros países UE por encima de 10.000 €/año, debes aplicar el IVA del país de destino (régimen OSS/IOSS).');
    out.notes.push(...c.notes);
    return out;
  }
  if (!ctx.goods) {
    out.kind = 'docs'; out.title = 'Documentos: sin aranceles';
    out.forms = ['Etiqueta CN22 marcando «Documentos» (sin valor comercial)'];
    out.notes.push('Los documentos no pagan impuestos de importación.');
    out.notes.push(...c.notes);
    return out;
  }
  out.kind = 'intl'; out.title = 'Envío fuera de la UE: requiere aduanas';
  const form = (ctx.value <= 425 && ctx.g <= 2000) ? 'CN22' : 'CN23';
  out.form = form;
  out.forms = [`Declaración de aduana ${form} (${form === 'CN22' ? 'valor ≤ 425 € y peso ≤ 2 kg' : 'valor > 425 € o peso > 2 kg'})`,
    'Factura comercial (si se trata de una venta) o proforma', 'Descripción detallada y código arancelario (HS) de cada artículo',
    'Datos completos del destinatario: teléfono y email (la aduana puede contactarle)'];
  const isGift = ctx.content === 'regalo';
  const thr = isGift && c.gift ? c.gift : c.dm;
  let vat = 0, duty = 0, fee = 0;
  if (ctx.value > thr) {
    const dutyRate = Math.max(CONTENTS[ctx.content].duty, c.dutyFloor || 0);
    duty = round2(ctx.value * dutyRate / 100);
    vat = round2((ctx.value + shipping + duty) * c.vat / 100);
    fee = (vat + duty) > 0 ? c.fee : 0;
    out.dutyRate = dutyRate;
  }
  out.taxes = { name: 'IVA/impuesto local', rate: c.vat, thr, vat, duty, fee, total: round2(vat + duty + fee) };
  out.notes.push('Exportación desde la UE: el envío sale con declaración de exportación y, si es una venta, sin IVA español.');
  out.notes.push('Los impuestos de destino los paga normalmente el destinatario al recibir el envío (DAP).');
  out.notes.push(...c.notes);
  return out;
}

function packagingTips(ctx) {
  const t = [];
  if (ctx.cat === 'carta') {
    t.push('Escribe la dirección del destinatario en el centro y el remitente en la esquina superior izquierda o en el reverso.');
    if (!ctx.letterNorm) t.push('Tu sobre no es «normalizado»: pasa a la tarifa siguiente. Para pagar menos: máx. 23,5×12 cm, 5 mm y 20 g.');
    if (ctx.sorted[2] > 0.5) t.push('Si contiene objetos rígidos, usa un sobre acolchado y marca «No doblar».');
  } else if (ctx.cat === 'postal') {
    t.push('Deja libre la mitad derecha del reverso para la dirección y el sello.');
    t.push('Las postales con relieves, pegatinas o formas irregulares pueden tener recargo.');
  } else {
    t.push('Usa una caja resistente y rellena los huecos (papel, cartón, burbujas) para que el contenido no se mueva.');
    t.push('Cierra con cinta de embalar en forma de «H» y retira etiquetas antiguas de la caja.');
    if (ctx.volKg > ctx.realKg) t.push(`Se cobra por volumen (${NUMF2.format(ctx.volKg)} kg vol.): una caja más ajustada te ahorraría dinero.`);
    if (ctx.content === 'electronica') t.push('Protege la electrónica con doble caja y apaga el dispositivo antes de enviarlo.');
    if (ctx.content === 'cosmetica') t.push('Envuelve los líquidos en bolsas cerradas y coloca los frascos de pie.');
    if (ctx.content === 'alimentos') t.push('Solo productos envasados y no perecederos; incluye la lista de ingredientes si va fuera de la UE.');
    if (ctx.realKg > 15) t.push('Más de 15 kg: indica «Pesado» y considera repartirlo en dos bultos para reducir el riesgo de daños.');
  }
  if (ctx.customsIntl || ctx.customsDom) t.push('Pega la declaración de aduanas en un sobre transparente en el exterior del envío.');
  return t;
}

/* ---------------- Seguimiento (eventos) ---------------- */
function buildEvents(route, sch, svc) {
  const ev = [], n = route.nodes, last = n.length - 1;
  const add = (t, title, detail, i, kind) => ev.push({ t, title, detail, i, kind: kind || n[i].type });
  n.forEach((node, i) => {
    const a = sch.arr[i], dp = sch.dep[i], leg = route.legs[i], next = n[i + 1];
    if (i === 0) add(a, node.type === 'home' ? 'Recogido en domicilio' : 'Admitido', `${node.name}. Pesado, franqueado y etiquetado.`, i);
    else if (i === last) {
      const tt = node.type === 'office' ? 'Disponible para recoger en oficina' : node.type === 'locker' ? 'Depositado en Citypaq' :
        node.name.startsWith('Buzón') ? 'Entregado en buzón' : 'Entregado';
      add(a, tt, node.desc, i, 'done');
    } else {
      switch (node.type) {
        case 'cta': add(a, 'Llegada a centro de tratamiento', node.name, i); add(a + (dp - a) * 0.35, 'En clasificación', 'Lectura óptica de la dirección y asignación de ruta', i); break;
        case 'airport': add(a, 'En aeropuerto', node.name + ' · ' + node.desc, i); break;
        case 'port': add(a, 'En puerto', node.name + ' · ' + node.desc, i); break;
        case 'border': add(a, 'Cruce de frontera', node.name, i); break;
        case 'transit': add(a, 'En tránsito internacional', node.name, i); break;
        case 'customs':
          add(a, node.key === 'hub' ? 'Llegada al país de destino · En aduana' : 'En aduana', node.name, i);
          add(a + (dp - a) * 0.85, 'Liberado por aduana', 'Despacho completado: el envío continúa', i); break;
        case 'hub': add(a, 'Llegada al país de destino', node.name + ' · recibido por el operador postal local', i); break;
        case 'delivery': add(a, 'En unidad de reparto', node.name, i); break;
        default: add(a, 'En tránsito', node.name, i);
      }
    }
    if (next) {
      if (node.type === 'delivery') {
        const tt = next.type === 'office' ? 'En traslado a la oficina de destino' : next.type === 'locker' ? 'En traslado al Citypaq' : 'En reparto';
        add(Math.max(dp, sch.arr[i + 1] - 3 * 3600e3), tt, svc.cat === 'paquete' ? 'El cartero lleva tu envío en su ruta de hoy' : 'Incluido en la ruta de reparto del cartero', i, 'out');
      } else add(dp, `Salida hacia ${next.name}`, `${MODE_IC[leg.mode]} ${MODE_LABEL[leg.mode]} · ${fmtKm(leg.km)}`, i, leg.mode);
    }
  });
  ev.sort((x, y) => x.t - y.t);
  // Visibilidad para el cliente según el nivel de seguimiento
  const lastEs = Math.max(n.findIndex(x => x.key === 'exch' || x.key.startsWith('border:')), 0);
  ev.forEach((e, k) => {
    e.visible = svc.track === 'full' ? true : svc.track === 'none' ? false :
      (e.i <= lastEs || e.kind === 'done' || e.kind === 'out' || (e.i === n.findIndex(x => x.key === 'hub')));
  });
  return ev;
}

/* ---------------- Simulación completa ---------------- */
function simulate(s) {
  const ctx = buildCtx(s);
  const results = servicesFor(ctx).map(svc => {
    const route = buildRoute(svc, ctx);
    const ev = evaluate(svc, ctx, route);
    const range = daysFor(svc, ctx) || [0, 0];
    const tm = timing(svc, ctx, range);
    const price = priceFor(svc, ctx);
    const sch = schedule(route, tm);
    const km = route.legs.reduce((a, l) => a + l.km, 0);
    return { svc, ok: ev.ok, reasons: ev.reasons, warns: ev.warns, range, tm, prob: tm.prob, price, route, sch, km, co2: co2(route, ctx.billKg || ctx.realKg) };
  });
  const ok = results.filter(r => r.ok);
  let best = null, cheapest = null, fastest = null;
  if (ok.length) {
    const pMin = Math.min(...ok.map(r => r.price.total)), pMax = Math.max(...ok.map(r => r.price.total));
    const dMin = Math.min(...ok.map(r => +r.tm.T1)), dMax = Math.max(...ok.map(r => +r.tm.T1));
    const w = (+s.priority || 0) / 100;
    ok.forEach(r => {
      const pn = (r.price.total - pMin) / ((pMax - pMin) || 1), dn = (+r.tm.T1 - dMin) / ((dMax - dMin) || 1);
      r.score = (1 - w) * pn + w * dn - (r.svc.track === 'full' ? 0.06 : 0) - (r.svc.sign ? 0.02 : 0);
    });
    best = ok.reduce((a, b) => b.score < a.score ? b : a);
    cheapest = ok.reduce((a, b) => b.price.total < a.price.total ? b : a);
    fastest = ok.reduce((a, b) => (+b.tm.T1 < +a.tm.T1 || (+b.tm.T1 === +a.tm.T1 && b.price.total < a.price.total)) ? b : a);
  }
  const selected = results.find(r => r.ok && r.svc.id === s.selected) || best || results[0];
  return { ctx, results, best, cheapest, fastest, selected };
}
