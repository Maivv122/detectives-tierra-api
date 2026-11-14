// Detectives de la Tierra · API de temperatura en tiempo real
// Usa la Weather API de Google Maps Platform (y Open-Meteo como respaldo opcional)
// y además sirve la app web desde ./public, en el mismo dominio.

import express from 'express';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GOOGLE_KEY = process.env.GOOGLE_WEATHER_API_KEY || '';
const CACHE_MIN = Number(process.env.CACHE_MINUTES || 30);       // 30 min: cuida la cuota gratuita
const FALLBACK = (process.env.FALLBACK_OPEN_METEO || 'true') !== 'false';
const PORT = Number(process.env.PORT || 8080);

// Puntos que representan cada zona de Colombia en la app.
export const PUNTOS = [
  { zona: 'nevados', nombre: 'Nevado del Ruiz', lat: 4.892, lon: -75.324 },
  { zona: 'sierra', nombre: 'Sierra Nevada de Santa Marta', lat: 10.84, lon: -73.69 },
  { zona: 'caribe', nombre: 'San Andrés', lat: 12.58, lon: -81.70 },
  { zona: 'caribe', nombre: 'Ciénaga Grande de Santa Marta', lat: 10.85, lon: -74.45 },
  { zona: 'amazonia', nombre: 'San José del Guaviare', lat: 2.57, lon: -72.64 },
  { zona: 'chingaza', nombre: 'Páramo de Chingaza', lat: 4.63, lon: -73.72 },
  { zona: 'choco', nombre: 'Quibdó', lat: 5.69, lon: -76.65 }
];

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

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  app.listen(PORT, () => {
    console.log(`Detectives de la Tierra en http://localhost:${PORT}`);
    if (!GOOGLE_KEY) console.log('Aviso: sin GOOGLE_WEATHER_API_KEY; se usará Open-Meteo como respaldo.');
  });
}
