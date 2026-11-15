// Uso: npm run historico
// Descarga la historia anual de temperatura (NASA POWER) y PM2.5 (CAMS) de cada zona
// y la guarda en public/data/historico.json para que la app la muestre en el mapa.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHistorico } from '../historico.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, '..', 'public', 'data', 'historico.json');
const data = await buildHistorico({ log: (m) => console.log('·', m) });
await fs.writeFile(out, JSON.stringify(data));
const ok = data.puntos.map((p) => `${p.nombre}: ${Object.keys(p.temp).length} años de temperatura, ${Object.keys(p.aire).length} de aire${p.error_temp || p.error_aire ? ' (con errores)' : ''}`);
console.log('\nListo →', out, '\n' + ok.join('\n'));
