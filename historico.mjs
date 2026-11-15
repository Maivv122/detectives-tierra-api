// Construye la historia anual por zona:
//  · Temperatura del aire a 2 m: NASA POWER (modelo MERRA-2 de NASA), promedio anual desde 1981.
//  · Calidad del aire: PM2.5 promedio anual de CAMS global (Copernicus) vía Open-Meteo, desde 2023.
import { PUNTOS } from './puntos.mjs';

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 150)}`);
      return await r.json();
    } catch (e) { last = e; await pause(1500 * (i + 1)); }
  }
  throw last;
}

export async function powerT2M(lat, lon, start = 1981, end = new Date().getFullYear() - 1) {
  const u = new URL('https://power.larc.nasa.gov/api/temporal/monthly/point');
  u.searchParams.set('parameters', 'T2M');
  u.searchParams.set('community', 'RE');
  u.searchParams.set('latitude', String(lat));
  u.searchParams.set('longitude', String(lon));
  u.searchParams.set('start', String(start));
  u.searchParams.set('end', String(end));
  u.searchParams.set('format', 'JSON');
  let d;
  try { d = await getJSON(u); }
  catch (e) {
    // POWER publica el año anterior con retraso: si falla, se intenta un año antes.
    u.searchParams.set('end', String(end - 1));
    d = await getJSON(u);
  }
  const t = d?.properties?.parameter?.T2M || {};
  const fill = d?.header?.fill_value ?? -999;
  const months = {}, annual = {};
  for (const [k, v] of Object.entries(t)) {
    if (v === null || v === fill || v <= -900) continue;
    const y = +k.slice(0, 4), m = +k.slice(4, 6);
    if (m === 13) annual[y] = v;
    else (months[y] = months[y] || []).push(v);
  }
  for (const [y, arr] of Object.entries(months)) {
    if (annual[y] === undefined && arr.length === 12) annual[y] = arr.reduce((a, b) => a + b, 0) / 12;
  }
  const out = {};
  for (const [y, v] of Object.entries(annual)) out[y] = Math.round(v * 100) / 100;
  return out;
}

const iso = (d) => d.toISOString().slice(0, 10);
export async function camsPM25(lat, lon, year) {
  const now = new Date();
  const start = `${year}-01-01`;
  const end = year === now.getUTCFullYear() ? iso(new Date(now.getTime() - 86400000)) : `${year}-12-31`;
  const u = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  u.searchParams.set('latitude', String(lat));
  u.searchParams.set('longitude', String(lon));
  u.searchParams.set('hourly', 'pm2_5');
  u.searchParams.set('start_date', start);
  u.searchParams.set('end_date', end);
  u.searchParams.set('domains', 'cams_global');
  u.searchParams.set('timezone', 'UTC');
  const d = await getJSON(u);
  const vals = (d?.hourly?.pm2_5 || []).filter((v) => v !== null && v !== undefined && Number.isFinite(v));
  const hours = (Date.parse(end) - Date.parse(start)) / 3600000 + 24;
  if (!vals.length) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return { v: Math.round(mean * 10) / 10, cobertura: Math.round((vals.length / hours) * 100) / 100, parcial: year === now.getUTCFullYear() };
}

export async function buildHistorico({ log = () => {}, desdeAire = 2023 } = {}) {
  const yNow = new Date().getUTCFullYear();
  const puntos = [];
  for (const p of PUNTOS) {
    log(`Temperatura · ${p.nombre}`);
    let temp = {}, errT = null;
    try { temp = await powerT2M(p.lat, p.lon); } catch (e) { errT = e.message; }
    const aire = {};
    let errA = null;
    for (let y = desdeAire; y <= yNow; y++) {
      log(`Aire ${y} · ${p.nombre}`);
      try {
        const r = await camsPM25(p.lat, p.lon, y);
        if (r && (r.cobertura >= 0.75 || r.parcial)) aire[y] = r;
      } catch (e) { errA = e.message; }
      await pause(300);
    }
    puntos.push({ ...p, temp, aire, ...(errT ? { error_temp: errT } : {}), ...(errA ? { error_aire: errA } : {}) });
  }
  return {
    generado: new Date().toISOString(),
    fuentes: {
      temperatura: 'NASA POWER · temperatura del aire a 2 m (T2M), modelo MERRA-2, promedio anual',
      aire: 'Copernicus CAMS global vía Open-Meteo · PM2.5 promedio anual'
    },
    puntos
  };
}
