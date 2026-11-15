// Detectives de la Tierra · API de temperatura en tiempo real
// Usa la Weather API de Google Maps Platform (y Open-Meteo como respaldo opcional)
// y además sirve la app web desde ./public, en el mismo dominio.

import express from 'express';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lee las llaves de un archivo .env (si existe) para no tener que escribirlas en cada npm start.
try {
  const envTxt = (await import('node:fs')).readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envTxt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* sin .env: se usan las variables del sistema */ }

const GOOGLE_KEY = process.env.GOOGLE_WEATHER_API_KEY || '';
const CACHE_MIN = Number(process.env.CACHE_MINUTES || 30);       // 30 min: cuida la cuota gratuita
const FALLBACK = (process.env.FALLBACK_OPEN_METEO || 'true') !== 'false';
const PORT = Number(process.env.PORT || 8080);

import { PUNTOS } from './puntos.mjs';
import { buildHistorico } from './historico.mjs';
import fs from 'node:fs/promises';
export { PUNTOS };

/* ---------- caché en memoria ---------- */
const cache = new Map();
function cacheGet(k) {
  const e = cache.get(k);
  if (e && Date.now() - e.t < CACHE_MIN * 60000) return e.v;
  return null;
}
function cacheSet(k, v) { cache.set(k, { t: Date.now(), v }); }

/* ---------- proveedores ---------- */
async function fromGoogle(lat, lon) {
  const u = new URL('https://weather.googleapis.com/v1/currentConditions:lookup');
  u.searchParams.set('key', GOOGLE_KEY);
  u.searchParams.set('location.latitude', String(lat));
  u.searchParams.set('location.longitude', String(lon));
  u.searchParams.set('languageCode', 'es');
  u.searchParams.set('unitsSystem', 'METRIC');
  const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`Google Weather respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  const wc = d.weatherCondition || {};
  const hist = d.currentConditionsHistory || {};
  return {
    temperatura_c: d.temperature?.degrees ?? null,
    sensacion_c: d.feelsLikeTemperature?.degrees ?? null,
    humedad_pct: d.relativeHumidity ?? null,
    descripcion: wc.description?.text ?? null,
    icono: wc.iconBaseUri ? `${wc.iconBaseUri}.svg` : null,
    es_de_dia: d.isDaytime ?? null,
    max_24h_c: hist.maxTemperature?.degrees ?? null,
    min_24h_c: hist.minTemperature?.degrees ?? null,
    hora: d.currentTime ?? new Date().toISOString(),
    fuente: 'Google Maps Platform · Weather API'
  };
}

const WMO = { 0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado', 45: 'Niebla', 48: 'Niebla con escarcha', 51: 'Llovizna ligera', 53: 'Llovizna', 55: 'Llovizna intensa', 61: 'Lluvia ligera', 63: 'Lluvia', 65: 'Lluvia intensa', 80: 'Chubascos ligeros', 81: 'Chubascos', 82: 'Chubascos fuertes', 95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta fuerte con granizo' };
async function fromOpenMeteo(lat, lon) {
  const u = new URL('https://api.open-meteo.com/v1/forecast');
  u.searchParams.set('latitude', String(lat));
  u.searchParams.set('longitude', String(lon));
  u.searchParams.set('current', 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day');
  u.searchParams.set('timezone', 'auto');
  const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`Open-Meteo respondió ${r.status}`);
  const c = (await r.json()).current || {};
  return {
    temperatura_c: c.temperature_2m ?? null,
    sensacion_c: c.apparent_temperature ?? null,
    humedad_pct: c.relative_humidity_2m ?? null,
    descripcion: WMO[c.weather_code] ?? null,
    icono: null,
    es_de_dia: c.is_day === undefined ? null : c.is_day === 1,
    max_24h_c: null,
    min_24h_c: null,
    hora: c.time ?? new Date().toISOString(),
    fuente: 'Open-Meteo (respaldo)'
  };
}

/* ---------- calidad del aire ---------- */
const hex = (c) => {
  if (!c) return null;
  const f = (x) => Math.round((x ?? 0) <= 1 ? (x ?? 0) * 255 : x).toString(16).padStart(2, '0');
  return `#${f(c.red)}${f(c.green)}${f(c.blue)}`;
};
async function airFromGoogle(lat, lon) {
  const r = await fetch(`https://airquality.googleapis.com/v1/currentConditions:lookup?key=${encodeURIComponent(GOOGLE_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: { latitude: lat, longitude: lon }, extraComputations: ['POLLUTANT_CONCENTRATION', 'DOMINANT_POLLUTANT_CONCENTRATION'], languageCode: 'es' }),
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) throw new Error(`Google Air Quality respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  const idx = (d.indexes || []).find((i) => i.code === 'uaqi') || (d.indexes || [])[0] || {};
  const pm = (d.pollutants || []).find((p) => p.code === 'pm25');
  return {
    ica: idx.aqi ?? null,
    ica_nombre: idx.displayName ?? 'Universal AQI',
    categoria: idx.category ?? null,
    color: hex(idx.color),
    contaminante_dominante: idx.dominantPollutant ?? null,
    pm25_ugm3: pm?.concentration?.value ?? null,
    hora: d.dateTime ?? new Date().toISOString(),
    fuente: 'Google Maps Platform · Air Quality API'
  };
}
const AQI_US = [[50, 'Buena', '#15803d'], [100, 'Moderada', '#a16207'], [150, 'Dañina para grupos sensibles', '#c2410c'], [200, 'Dañina', '#b91c1c'], [300, 'Muy dañina', '#7e22ce'], [Infinity, 'Peligrosa', '#7f1d1d']];
async function airFromOpenMeteo(lat, lon) {
  const u = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  u.searchParams.set('latitude', String(lat));
  u.searchParams.set('longitude', String(lon));
  u.searchParams.set('current', 'pm2_5,us_aqi');
  const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`Open-Meteo aire respondió ${r.status}`);
  const c = (await r.json()).current || {};
  const aqi = c.us_aqi ?? null;
  const cat = aqi === null ? null : AQI_US.find((x) => aqi <= x[0]);
  return {
    ica: aqi, ica_nombre: 'US AQI', categoria: cat ? cat[1] : null, color: cat ? cat[2] : null,
    contaminante_dominante: null, pm25_ugm3: c.pm2_5 ?? null,
    hora: c.time ?? new Date().toISOString(), fuente: 'Open-Meteo (respaldo)'
  };
}
export async function aire(lat, lon) {
  const key = `a:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cacheGet(key);
  if (hit) return { ...hit, en_cache: true };
  let v, errGoogle = null;
  if (GOOGLE_KEY) {
    try { v = await airFromGoogle(lat, lon); } catch (e) { errGoogle = e; }
  }
  if (!v) {
    if (!FALLBACK) throw errGoogle || new Error('Falta la variable GOOGLE_WEATHER_API_KEY');
    v = await airFromOpenMeteo(lat, lon);
    if (errGoogle) v.aviso = 'Google no respondió; se usó el respaldo.';
  }
  cacheSet(key, v);
  return { ...v, en_cache: false };
}

export async function temperatura(lat, lon) {
  const key = `t:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cacheGet(key);
  if (hit) return { ...hit, en_cache: true };
  let v, errGoogle = null;
  if (GOOGLE_KEY) {
    try { v = await fromGoogle(lat, lon); } catch (e) { errGoogle = e; }
  }
  if (!v) {
    if (!FALLBACK) throw errGoogle || new Error('Falta la variable GOOGLE_WEATHER_API_KEY');
    v = await fromOpenMeteo(lat, lon);
    if (errGoogle) v.aviso = 'Google no respondió; se usó el respaldo.';
  }
  v = { lat: Number(lat.toFixed(4)), lon: Number(lon.toFixed(4)), ...v };
  cacheSet(key, v);
  return { ...v, en_cache: false };
}

/* ---------- servidor ---------- */
export const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  next();
});

// Llave de Google Maps para el mapa con calles. Va al navegador, así que debe ser una llave
// SEPARADA y restringida por sitio web (HTTP referrer) en Google Cloud.
app.get('/api/config', (req, res) => {
  res.json({ mapsKey: process.env.GOOGLE_MAPS_API_KEY || '' });
});

app.get('/api/salud', (req, res) => {
  res.json({ ok: true, google: Boolean(GOOGLE_KEY), respaldo_open_meteo: FALLBACK, cache_minutos: CACHE_MIN });
});

app.get('/api/temperatura', async (req, res) => {
  const lat = Number(req.query.lat), lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ error: 'Envía lat (-90 a 90) y lon (-180 a 180). Ejemplo: /api/temperatura?lat=4.71&lon=-74.07' });
  }
  try {
    res.json(await temperatura(lat, lon));
  } catch (e) {
    res.status(502).json({ error: 'No se pudo obtener la temperatura', detalle: e.message });
  }
});

app.get('/api/aire', async (req, res) => {
  const lat = Number(req.query.lat), lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ error: 'Envía lat (-90 a 90) y lon (-180 a 180). Ejemplo: /api/aire?lat=4.71&lon=-74.07' });
  }
  try {
    res.json(await aire(lat, lon));
  } catch (e) {
    res.status(502).json({ error: 'No se pudo obtener la calidad del aire', detalle: e.message });
  }
});

app.get('/api/zonas', async (req, res) => {
  const out = await Promise.all(PUNTOS.map(async (p) => {
    let t = {}, a = null;
    try { t = await temperatura(p.lat, p.lon); } catch (e) { t = { error: e.message }; }
    try { a = await aire(p.lat, p.lon); } catch (e) { a = { error: e.message }; }
    return { ...p, ...t, aire: a };
  }));
  res.json({ actualizado: new Date().toISOString(), puntos: out });
});

/* ---------- aire ahora en ciudades del mundo (una sola consulta a Open-Meteo) ---------- */
const CIUDADES = [
  ['Madrid', 40.42, -3.7], ['Sevilla', 37.39, -5.98], ['Lisboa', 38.72, -9.14], ['París', 48.86, 2.35], ['Londres', 51.51, -0.13],
  ['Roma', 41.9, 12.5], ['Atenas', 37.98, 23.73], ['Berlín', 52.52, 13.4], ['Moscú', 55.76, 37.62], ['Reikiavik', 64.15, -21.94],
  ['El Cairo', 30.04, 31.24], ['Lagos', 6.52, 3.38], ['Nairobi', -1.29, 36.82], ['Johannesburgo', -26.2, 28.05], ['Riad', 24.71, 46.68],
  ['Dubái', 25.2, 55.27], ['Delhi', 28.61, 77.21], ['Bombay', 19.08, 72.88], ['Pekín', 39.9, 116.4], ['Tokio', 35.68, 139.69],
  ['Bangkok', 13.76, 100.5], ['Yakarta', -6.21, 106.85], ['Sídney', -33.87, 151.21], ['Perth', -31.95, 115.86], ['Auckland', -36.85, 174.76],
  ['Anchorage', 61.22, -149.9], ['Los Ángeles', 34.05, -118.24], ['Phoenix', 33.45, -112.07], ['Toronto', 43.65, -79.38], ['Nueva York', 40.71, -74.01],
  ['Miami', 25.76, -80.19], ['Ciudad de México', 19.43, -99.13], ['Bogotá', 4.71, -74.07], ['Barranquilla', 10.96, -74.8], ['Lima', -12.05, -77.04],
  ['Manaos', -3.12, -60.02], ['São Paulo', -23.55, -46.63], ['Buenos Aires', -34.6, -58.38], ['Santiago', -33.45, -70.67], ['Ushuaia', -54.8, -68.3]
];
app.get('/api/ciudades', async (req, res) => {
  const hit = cacheGet('ciudades');
  if (hit) return res.json({ ...hit, en_cache: true });
  try {
    const u = new URL('https://api.open-meteo.com/v1/forecast');
    u.searchParams.set('latitude', CIUDADES.map((c) => c[1]).join(','));
    u.searchParams.set('longitude', CIUDADES.map((c) => c[2]).join(','));
    u.searchParams.set('current', 'temperature_2m');
    u.searchParams.set('timezone', 'UTC');
    const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
    const arr = [].concat(await r.json());
    const v = {
      actualizado: new Date().toISOString(),
      fuente: 'Open-Meteo · temperatura del aire a 2 m, ahora',
      ciudades: CIUDADES.map((c, i) => ({ n: c[0], lat: c[1], lon: c[2], t: arr[i]?.current?.temperature_2m ?? null, hora: arr[i]?.current?.time ?? null }))
    };
    cacheSet('ciudades', v);
    res.json({ ...v, en_cache: false });
  } catch (e) {
    res.status(502).json({ error: 'No se pudo consultar la temperatura de las ciudades', detalle: e.message });
  }
});

/* ---------- historia anual por zona ---------- */
const HIST_FILE = path.join(__dirname, 'public', 'data', 'historico.json');
let histMem = null, histBuilding = null;
app.get('/api/historico', async (req, res) => {
  try {
    if (histMem && Date.now() - histMem.t < 24 * 3600 * 1000) return res.json(histMem.v);
    try {
      const v = JSON.parse(await fs.readFile(HIST_FILE, 'utf8'));
      histMem = { t: Date.now(), v };
      return res.json(v);
    } catch { /* no hay archivo: se construye */ }
    histBuilding = histBuilding || buildHistorico().finally(() => { histBuilding = null; });
    const v = await histBuilding;
    histMem = { t: Date.now(), v };
    fs.writeFile(HIST_FILE, JSON.stringify(v)).catch(() => {});
    res.json(v);
  } catch (e) {
    res.status(502).json({ error: 'No se pudo construir la historia por zona', detalle: e.message });
  }
});

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  app.listen(PORT, () => {
    console.log(`Detectives de la Tierra en http://localhost:${PORT}`);
    if (!GOOGLE_KEY) console.log('Aviso: sin GOOGLE_WEATHER_API_KEY; se usará Open-Meteo como respaldo.');
  });
}
