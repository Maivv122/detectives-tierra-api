// Temperatura del aire por departamento de Colombia y malla para el mapa.
//  · Fuente: NASA POWER, temperatura del aire a 2 m (T2M), modelo MERRA-2 de NASA, promedio anual desde 1981.
//  · Método: se pide la serie de cada celda de la malla de MERRA-2 (0,5° de latitud × 0,625° de longitud)
//    cuyo centro cae dentro de Colombia. El valor de un departamento es el promedio de sus celdas.
//    Si un departamento es más pequeño que una celda (p. ej. San Andrés o Quindío), se usa
//    la celda de su punto central y se marca con "celdas: 0" para que la app lo explique.
//  · Límites de departamentos: Natural Earth (dominio público), simplificados.
import fs from 'node:fs';
import path from 'node:path';
import { powerT2M } from './historico.mjs';

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inGeom(lon, lat, g) {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  return polys.some((rings) => rings.reduce((acc, r) => (inRing(lon, lat, r) ? !acc : acc), false));
}
function bbox(g) {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  let b = [180, 90, -180, -90];
  for (const rings of polys) for (const [x, y] of rings[0]) b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)];
  return b;
}
// Punto interior: el centro de la caja si cae dentro; si no, el punto de la caja más cercano al centro que caiga dentro.
function interior(g) {
  const b = bbox(g), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  if (inGeom(cx, cy, g)) return [cx, cy];
  let best = null, bd = Infinity;
  for (let x = b[0]; x <= b[2]; x += (b[2] - b[0]) / 30) for (let y = b[1]; y <= b[3]; y += (b[3] - b[1]) / 30) {
    if (!inGeom(x, y, g)) continue;
    const d = (x - cx) ** 2 + (y - cy) ** 2;
    if (d < bd) { bd = d; best = [x, y]; }
  }
  return best || [cx, cy];
}
const r3 = (v) => Math.round(v * 1000) / 1000;

export async function buildDepartamentos({ log = () => {}, geoFile, concurrencia = 3 } = {}) {
  const geo = JSON.parse(fs.readFileSync(geoFile, 'utf8'));
  const deps = geo.features.map((f) => ({ id: f.properties.id, name: f.properties.name, g: f.geometry }));
  // Celdas de MERRA-2 (0,5° × 0,625°) con centro dentro de algún departamento
  const cells = [];
  for (let lat = -4.5; lat <= 13.5; lat += 0.5) for (let lon = -82.5; lon <= -66.25; lon += 0.625) {
    const d = deps.find((dd) => inGeom(lon, lat, dd.g));
    if (d) cells.push({ lat: r3(lat), lon: r3(lon), dep: d.id });
  }
  // Departamentos sin ninguna celda: su punto interior, ajustado a la celda de MERRA-2 más cercana
  for (const d of deps) {
    if (cells.some((c) => c.dep === d.id)) continue;
    const [x, y] = interior(d.g);
    cells.push({ lat: r3(Math.round(y * 2) / 2), lon: r3(Math.round(x / 0.625) * 0.625), dep: d.id, extra: true });
  }
  log(`Celdas a consultar: ${cells.length} (puede tardar unos minutos)`);
  let done = 0, fails = 0, i = 0;
  async function worker() {
    while (i < cells.length) {
      const c = cells[i++];
      try { c.temp = await powerT2M(c.lat, c.lon); }
      catch (e) { c.temp = {}; c.error = e.message; fails++; }
      done++;
      if (done % 20 === 0 || done === cells.length) log(`  ${done}/${cells.length} celdas${fails ? ` · ${fails} con error` : ''}`);
      await pause(150);
    }
  }
  await Promise.all(Array.from({ length: concurrencia }, worker));

  const years = [...new Set(cells.flatMap((c) => Object.keys(c.temp || {}).map(Number)))].sort((a, b) => a - b);
  const out = deps.map((d) => {
    const mine = cells.filter((c) => c.dep === d.id && Object.keys(c.temp).length);
    const inside = mine.filter((c) => !c.extra);
    const use = inside.length ? inside : mine;
    const temp = {};
    for (const y of years) {
      const v = use.map((c) => c.temp[y]).filter((x) => x !== undefined);
      if (v.length && v.length >= use.length * 0.8) temp[y] = Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100;
    }
    return { id: d.id, name: d.name, celdas: inside.length, temp };
  });
  return {
    generado: new Date().toISOString(),
    fuente: 'NASA POWER · temperatura del aire a 2 m (T2M), modelo MERRA-2, promedio anual',
    metodo: 'Promedio de las celdas de MERRA-2 (0,5° × 0,625°, unos 55 × 70 km) cuyo centro cae dentro de cada departamento. Si un departamento es más pequeño que una celda, se usa la celda de su punto central.',
    limites: 'Natural Earth (dominio público)',
    years,
    deps: out,
    malla: cells.filter((c) => !c.extra && Object.keys(c.temp).length).map((c) => ({ lat: c.lat, lon: c.lon, dep: c.dep, t: years.map((y) => (c.temp[y] === undefined ? null : Math.round(c.temp[y] * 10) / 10)) }))
  };
}

export function geoFileDefault(dir) { return path.join(dir, 'public', 'data', 'departamentos.geojson'); }
