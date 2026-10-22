'use strict';
/* =========================================================================
   Cualquier lugar del mundo: búsqueda (Photon), clic en el mapa y ubicación
   (Nominatim), clasificación del lugar y países sin datos propios.
   ========================================================================= */

const EU_CC = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','MC','SM','VA']);
const Z1_CC = new Set(['PT','AD','GI']);
const Z3_CC = new Set(['GB','CH','NO','IS','TR','UA','RS','RU','AL','BA','BY','MD','ME','MK','XK','LI','FO','GL','SJ','GG','JE','IM','GE','AM','AZ']);
const Z4_CC = new Set(['MA','DZ','TN','LY','MR','EH','US','CA','PM','BM']);
const Z5_CC = new Set(['MX','GT','BZ','SV','HN','NI','CR','PA','CU','DO','HT','JM','BS','BB','TT','PR','AG','DM','GD','KN','LC','VC','AW','CW','BQ','SX','KY','TC','VG','VI','AI','MS','GP','MQ','BL','MF','GF','CO','VE','EC','PE','BO','CL','AR','UY','PY','BR','GY','SR','FK']);
const OUTSIDE_VAT = new Set(['GP','MQ','GF','RE','YT','BL','MF','PM','NC','PF','WF','FO','GL']); // territorios con aduana aunque dependan de un país UE
const regionNames = (() => { try { return new Intl.DisplayNames(['es'], { type: 'region' }); } catch (e) { return null; } })();
const flagOf = cc => /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)) : '🌊';

/* País sin ficha propia: se le asigna zona, IVA medio y el centro de intercambio más cercano */
function ensureCountry(cc, near) {
  if (COUNTRIES[cc]) return COUNTRIES[cc];
  if (!cc) {
    COUNTRIES[''] = { cc: '', n: 'Aguas internacionales', f: '🌊', z: 6, eu: false, hub: null, vat: 0, road: false, b: null, dm: 0, gift: 0, maxKg: 30, fee: 0, notes: [], sea: true };
    return COUNTRIES[''];
  }
  const eu = EU_CC.has(cc) && !OUTSIDE_VAT.has(cc);
  const z = Z1_CC.has(cc) ? 1 : EU_CC.has(cc) ? 2 : Z3_CC.has(cc) ? 3 : Z4_CC.has(cc) ? 4 : Z5_CC.has(cc) ? 5 : 6;
  let best = null, bd = Infinity;
  Object.values(COUNTRIES).forEach(c => { if (!c.hub) return; const d = distKm(near, { lat: c.hub[1], lng: c.hub[2] }); if (d < bd) { bd = d; best = c; } });
  const n = (regionNames && regionNames.of(cc)) || cc;
  COUNTRIES[cc] = {
    cc, n, f: flagOf(cc), z, eu, vat: 15, road: false, b: null, dm: 0, gift: 0, maxKg: 20, fee: 8, generic: true,
    hub: [`Centro de intercambio regional (vía ${best.n})`, best.hub[1], best.hub[2]],
    notes: [`${n} no tiene ficha propia en el simulador: se usan plazos, impuestos y límites medios de su zona y el centro de intercambio internacional más próximo.`]
  };
  return COUNTRIES[cc];
}

/* Tipo de lugar a partir de las etiquetas de OpenStreetMap */
function classify(key, value, hasTown) {
  if (key === 'place' && ['sea', 'ocean'].includes(value)) return 'sea';
  if (key === 'natural' && ['water', 'bay', 'strait', 'reef', 'coastline'].includes(value)) return 'sea';
  if (key === 'natural' && ['peak', 'volcano', 'ridge', 'mountain_range', 'glacier', 'saddle', 'cliff', 'arete'].includes(value)) return 'mountain';
  if (key === 'place' && ['city', 'town', 'suburb', 'quarter', 'neighbourhood', 'borough', 'city_block'].includes(value)) return 'city';
  if (key === 'place' && ['village', 'hamlet', 'isolated_dwelling', 'farm', 'allotments'].includes(value)) return 'village';
  if (key === 'place' && ['locality', 'island', 'islet', 'archipelago', 'region', 'state', 'county', 'country'].includes(value)) return hasTown ? 'village' : 'remote';
  if (['natural', 'landuse', 'leisure', 'boundary'].includes(key)) return hasTown ? 'village' : 'remote';
  return hasTown ? 'city' : 'remote';
}
const KIND_LABEL = { city: 'Población', village: 'Zona rural', remote: 'Zona remota', mountain: 'Montaña', sea: 'Mar', place: 'Dirección' };
const KIND_IC = { city: '🏙️', village: '🏡', remote: '🏜️', mountain: '⛰️', sea: '🌊', place: '📍' };

function makePlace({ lat, lng, cc, name, kind, near, postcode, sub }) {
  cc = (cc || '').toUpperCase();
  const p = { id: `geo:${lat.toFixed(4)},${lng.toFixed(4)}`, cc, name: name || 'Punto seleccionado', lat, lng, kind: kind || 'place', near: near || '', sub: sub || '', geo: true };
  if (cc === 'ES') {
    const pc = String(postcode || '').slice(0, 2);
    let nearest = null, bd = Infinity;
    ES_CITIES.forEach(c => { const d = distKm(p, c); if (d < bd) { bd = d; nearest = c; } });
    p.prov = PROVINCES[pc] ? pc : nearest.prov;
    const sameProv = ES_CITIES.filter(c => c.prov === p.prov);
    let isl = null, bi = Infinity;
    sameProv.forEach(c => { const d = distKm(p, c); if (d < bi) { bi = d; isl = c; } });
    p.island = isl && isl.island ? isl.island : null;
  }
  ensureCountry(cc, p);
  return p;
}
function registerPlace(p) { if (p && p.id && (p.geo || !CITY[p.id])) CITY[p.id] = p; return p; }

/* Búsqueda de texto: Photon (OpenStreetMap), apto para autocompletar */
async function searchPlaces(q, signal) {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=12&lang=default`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('search');
  const j = await res.json();
  const seen = new Set();
  return j.features.map(f => {
    const pr = f.properties, [lng, lat] = f.geometry.coordinates;
    const town = pr.city || pr.town || pr.village || pr.district;
    const kind = classify(pr.osm_key, pr.osm_value, !!town || ['city', 'town'].includes(pr.type));
    const name = pr.name || [pr.street, pr.housenumber].filter(Boolean).join(' ') || town || pr.county || pr.state || 'Lugar';
    const sub = [town && town !== name ? town : null, pr.county && pr.county !== name ? pr.county : null, pr.state && pr.state !== name ? pr.state : null, pr.country].filter(Boolean).join(', ');
    return makePlace({ lat, lng, cc: pr.countrycode, name, kind, near: town || pr.county || '', postcode: pr.postcode, sub });
  }).filter(p => { const k = p.name + p.sub; if (seen.has(k)) return false; seen.add(k); return true; });
}

/* Punto exacto (clic en el mapa o GPS): Nominatim inverso */
async function reversePlace(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1&accept-language=es`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('reverse');
  const j = await res.json();
  if (j.error || !j.address || !j.address.country_code) {
    return makePlace({ lat, lng, cc: '', name: seaName(lat, lng), kind: 'sea', sub: 'Aguas abiertas, sin dirección postal' });
  }
  const a = j.address;
  const town = a.city || a.town || a.village || a.hamlet || a.isolated_dwelling;
  let kind = classify(j.category, j.type, !!town);
  if (kind === 'city' && !(a.city || a.town)) kind = 'village';
  if (j.category === 'place' && ['village', 'hamlet', 'isolated_dwelling', 'farm'].includes(j.type)) kind = 'village';
  // Sin calle, barrio ni caserío cerca del punto: es campo abierto, monte o desierto
  const settled = a.road || a.house_number || a.hamlet || a.neighbourhood || a.suburb || a.isolated_dwelling || a.farm || a.quarter;
  if (!settled && ['city', 'village', 'place'].includes(kind)) kind = 'remote';
  const name = j.name || (a.road ? [a.road, a.house_number].filter(Boolean).join(' ') : '') || town || a.municipality || a.county || a.state || 'Punto seleccionado';
  const sub = [town && town !== name ? town : null, a.county || a.state_district, a.state, a.country].filter(Boolean).join(', ');
  return makePlace({ lat, lng, cc: a.country_code, name, kind, near: town || a.municipality || a.county || '', postcode: a.postcode, sub });
}
function seaName(lat, lng) {
  if (lat < -60) return 'Océano Austral';
  if (lat > 66) return 'Océano Ártico';
  if (lng > -6 && lng < 36 && lat > 30 && lat < 46) return 'Mar Mediterráneo';
  if (lng >= 20 && lng <= 120 && lat < 30) return 'Océano Índico';
  if (lng > -100 && lng < 20) return 'Océano Atlántico';
  return 'Océano Pacífico';
}
