// Uso: npm run departamentos
// Descarga de NASA POWER la temperatura del aire de cada celda de Colombia y calcula el promedio
// anual de cada departamento. Guarda public/data/departamentos.json (lo usa el explorador de Colombia).
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDepartamentos } from '../departamentos.mjs';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(dir, 'public', 'data', 'departamentos.json');
const data = await buildDepartamentos({ log: (m) => console.log('·', m), geoFile: path.join(dir, 'public', 'data', 'departamentos.geojson') });
await fs.writeFile(out, JSON.stringify(data));
const sin = data.deps.filter((d) => !Object.keys(d.temp).length).map((d) => d.name);
console.log(`\nListo → ${out}\n${data.deps.length} departamentos · ${data.malla.length} celdas · años ${data.years[0]}–${data.years[data.years.length - 1]}` + (sin.length ? `\nSin datos: ${sin.join(', ')} (vuelve a correr el comando)` : ''));
