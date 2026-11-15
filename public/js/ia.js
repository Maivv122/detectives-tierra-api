/* Detectives de la Tierra · IA ambiental
   1) Un analista con reglas fijas calcula la respuesta SOLO con los datos de la app (siempre disponible).
   2) Si hay un modelo disponible, Claude redacta la explicación con esos mismos datos:
      · en el enlace de Claude: la capacidad «sample» del artefacto;
      · en localhost/Render: /api/ia del servidor (requiere ANTHROPIC_API_KEY).
   Nunca se inventan mediciones: si faltan datos, la respuesta lo dice. */
(function () {
  var DT = window.DT, M = DT && DT.M;
  if (!M) return;
  var S = DT.S, fmt = DT.fmt, sfmt = DT.sfmt, esc = DT.esc, clamp = DT.clamp;
  var $ = function (s) { return document.querySelector(s); };
  var LLM = { mode: null, sample: null };   // 'sample' | 'server' | null
  var SUGGEST = [
    '¿Qué cambios ha experimentado esta región durante los últimos 20 años?',
    '¿Cuál ha sido el periodo con mayor incremento de temperatura?',
    '¿Qué departamentos presentan las anomalías más significativas?',
    '¿Cómo ha cambiado la temperatura superficial del océano Atlántico?',
    '¿Qué diferencias existen entre Antioquia y La Guajira?',
    '¿Qué comportamiento se ha observado durante los últimos años?'
  ];

  /* ---------- detección de modelo ---------- */
  if (window.claude && window.claude.use) {
    window.claude.use('sample').then(function (s) { if (s) { LLM.sample = s; LLM.mode = 'sample'; LLM.name = 'Claude'; badge(); } }).catch(function () {});
  }
  fetch(DT.apiBase() + '/api/salud').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j && j.ia && !LLM.mode) { LLM.mode = 'server'; LLM.name = j.ia_proveedor || 'IA'; badge(); } }).catch(function () {});
  function badge() { var b = $('#iaMode'); if (b) b.textContent = LLM.mode ? LLM.name + ' + datos de la app · preguntas libres' : 'Analista de la app (preguntas sobre los datos)'; }

  /* ---------- entender la pregunta ---------- */
  function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,;:()]/g, ' '); }
  // primero los nombres con «océano»/«mar» (para no confundir el océano Atlántico con el departamento)
  var OCEAN_WORDS = [['oceano atlantico norte', 'Océano Atlántico Norte'], ['oceano atlantico sur', 'Océano Atlántico Sur'], ['oceano pacifico norte', 'Océano Pacífico Norte'], ['oceano pacifico sur', 'Océano Pacífico Sur'],
    ['atlantico norte', 'Océano Atlántico Norte'], ['atlantico sur', 'Océano Atlántico Sur'], ['pacifico norte', 'Océano Pacífico Norte'], ['pacifico sur', 'Océano Pacífico Sur'],
    ['oceano atlantico', 'ATL'], ['oceano pacifico', 'PAC'], ['pacifico', 'PAC'], ['indico', 'Océano Índico'], ['artico', 'Océano Ártico'], ['austral', 'Océano Austral'], ['antartico', 'Océano Austral'],
    ['mar caribe', 'Mar Caribe'], ['golfo de mexico', 'Golfo de México'], ['mediterraneo', 'Mar Mediterráneo']];
  // combina dos cuencas (p. ej. Atlántico = Norte + Sur)
  function combo(name, a, b) {
    var oc = M.oceanCells(); if (!oc) return null;
    var list = oc[a].concat(oc[b]), xs = [], ys = [];
    for (var y = DT.Y0; y < DT.Y0 + DT.NY; y++) { xs.push(y); ys.push(M.oceanMean(list, y)); }
    return { key: 'combo:' + name, name: name, kind: 'mar', unit: '°C', xs: xs, ys: ys, src: 'NOAA ERSSTv5 · temperatura superficial del mar, promedio anual por área', measured: true };
  }
  function contextSeries() {
    if (S.dep) return M.series('dep:' + S.dep);
    if (S.zone) return M.series('zona:' + S.zone + (S.zone === 'caribe' ? ':sanandres' : ''));
    if (S.sel !== null && S.sel !== undefined && DT.D) {
      var k = DT.cells[S.sel], c = DT.centers[S.sel], xs = [], ys = [];
      for (var y = DT.Y0; y < DT.Y0 + DT.NY; y++) { xs.push(y); ys.push(DT.valAt(y, k)); }
      return { key: 'cell', name: DT.oceanName(c[0], c[1]) + ' (' + DT.coordText(c[0], c[1]) + ')', kind: 'mar', unit: '°C', xs: xs, ys: ys, src: 'NOAA ERSSTv5 · celda de 4°', measured: true };
    }
    if (S.layer === 'global') return M.series('planeta');
    return null;
  }
  function entities(q) {
    var n = ' ' + norm(q) + ' ', out = [], used = n;
    var take = function (word) { var i = used.indexOf(word); if (i < 0) return false; used = used.slice(0, i) + ' '.repeat(word.length) + used.slice(i + word.length); return true; };
    var oceans = [];
    OCEAN_WORDS.forEach(function (o) {
      if (!take(o[0])) return;
      if (o[1] === 'ATL') oceans.push(combo('Océano Atlántico', 'Océano Atlántico Norte', 'Océano Atlántico Sur'));
      else if (o[1] === 'PAC') oceans.push(combo('Océano Pacífico', 'Océano Pacífico Norte', 'Océano Pacífico Sur'));
      else oceans.push(M.series('oc:' + o[1]));
    });
    // «Atlántico» suelto: si la pregunta habla del mar u océano, es el océano; si no, el departamento
    if (/\b(mar|oceano|oceanos|superficial del)\b/.test(used) && take('atlantico')) oceans.push(combo('Océano Atlántico', 'Océano Atlántico Norte', 'Océano Atlántico Sur'));
    if (!oceans.length && /\boceanos?\b/.test(used) && take('oceano')) oceans.push(M.series('oc:Todos los océanos'));
    out = out.concat(oceans);
    M.depList().slice().sort(function (a, b) { return b.name.length - a.name.length; }).forEach(function (d) {
      var w = norm(d.name).replace(' d c', '').trim();
      if (d.id === 'sap') w = 'san andres';
      if (take(' ' + w)) out.push(M.series('dep:' + d.id) || { key: 'dep:' + d.id, name: d.name, missing: true });
    });
    if (take('bogota')) out.push(M.series('dep:dc') || { key: 'dep:dc', name: 'Bogotá D.C.', missing: true });
    var Z = [['nevado', 'zona:nevados'], ['sierra nevada', 'zona:sierra'], ['chingaza', 'zona:chingaza'], ['sumapaz', 'zona:chingaza'], ['choco', 'zona:choco'], ['amazonia', 'zona:amazonia'], ['cienaga grande', 'zona:caribe:caribe']];
    Z.forEach(function (z) { if (take(z[0])) { var s = M.series(z[1]); if (s) out.push(s); } });
    if (/\b(planeta|mundo|global|tierra entera)\b/.test(n)) out.push(M.series('planeta'));
    if (/\b(esta|este|aqui|seleccionad[oa])\b/.test(n) && !out.length) { var c = contextSeries(); if (c) out.push(c); }
    return out.filter(Boolean);
  }
  function years(q) {
    var ys = (q.match(/\b(18[89]\d|19\d{2}|20[0-2]\d)\b/g) || []).map(Number);
    var m = norm(q).match(/ultim[oa]s?\s+(\d{1,3})\s+anos/);
    return { list: ys, last: m ? +m[1] : null };
  }

  /* ---------- respuestas (solo con datos) ---------- */
  function lim(s, a, b) { var r = M.range(s), lo = Math.max(a, r[0]), hi = Math.min(b, M.lastYear(s)); return [lo, hi]; }
  function windowFor(s, yr) {
    var last = M.lastYear(s);
    if (yr.list.length >= 2) return lim(s, Math.min(yr.list[0], yr.list[1]), Math.max(yr.list[0], yr.list[1]));
    if (yr.last) return lim(s, last - yr.last + 1, last);
    if (yr.list.length === 1) return lim(s, yr.list[0], last);
    return lim(s, last - 19, last);
  }
  function seriesAnswer(s, yr, q) {
    if (s.missing) return gapAnswer('No hay datos de ' + s.name, 'La temperatura del aire por departamento aún no se ha generado (npm run departamentos). No hay valores que mostrar sin inventarlos.');
    var w = windowFor(s, yr), sl = M.slice(s, w[0], w[1]), res = DT.analyze(sl.xs, sl.ys);
    var va = M.valueAt(s, w[0]), vb = M.valueAt(s, w[1]), unit = s.anomaly ? '°C (anomalía)' : '°C';
    var warm = sl.xs.reduce(function (b, x, i) { return isFinite(sl.ys[i]) && (b === null || sl.ys[i] > b[1]) ? [x, sl.ys[i]] : b; }, null);
    var A = { titulo: s.name + ': ' + (vb - va >= 0 ? '+' : '') + fmt(vb - va, 2) + ' °C entre ' + w[0] + ' y ' + w[1], valores: [], observado: [], interpretacion: [], posibles: [], limitaciones: [], fuente: s.src, chart: { series: [{ xs: s.xs, ys: s.ys, res: res }], marks: [w[0], w[1]], band: w } };
    A.explicacion = 'En ' + s.name + ' la temperatura ' + (s.kind === 'mar' ? 'del mar' : s.kind === 'aire' ? 'del aire' : 'global') + ' pasó de ' + (s.anomaly ? sfmt(va, 2) : fmt(va, 1)) + ' a ' + (s.anomaly ? sfmt(vb, 2) : fmt(vb, 1)) + ' °C. ' +
      (res ? (res.p < 0.05 && res.pmk < 0.05 ? 'La tendencia del periodo es ' + (res.b > 0 ? 'al alza' : 'a la baja') + ' y es significativa.' : 'En este periodo no hay una tendencia estadísticamente clara.') : '');
    A.valores.push(['Cambio ' + w[0] + '→' + w[1], sfmt(vb - va, 2) + ' °C']);
    if (res) A.valores.push(['Tendencia', sfmt(res.b * 10, 2) + ' °C/década']);
    if (warm) A.valores.push(['Año más cálido', warm[0] + ' (' + (s.anomaly ? sfmt(warm[1], 2) : fmt(warm[1], 1)) + ' °C)']);
    var an = M.anomaly(s, w[1]); if (an !== null && !s.anomaly) A.valores.push(['Anomalía ' + w[1], sfmt(an, 2) + ' °C vs 1991–2020']);
    A.observado.push('Valores anuales de ' + w[0] + ' a ' + w[1] + ' (' + sl.xs.length + ' años).');
    if (res) A.observado.push('Regresión: p ' + DT.pfmt(res.p) + ' · Mann-Kendall: p ' + DT.pfmt(res.pmk) + '.');
    A.interpretacion.push('Comparar solo dos años puede exagerar o esconder el cambio; la tendencia usa todos los años del periodo.');
    var ev = DT.EVENTS.filter(function (e) { return (e.y === w[0] || e.y === w[1] || (warm && e.y === warm[0])) && (s.kind !== 'aire'); });
    if (ev.length) A.posibles.push('Años con eventos registrados en la app: ' + ev.map(function (e) { return e.y + ' (' + e.t + ')'; }).join(', ') + '. Pueden influir en un año puntual; no prueban una causa.');
    var req = yr.list.length ? Math.min.apply(null, yr.list) : null;
    if (req && req < w[0]) A.limitaciones.push('Pediste desde ' + req + ', pero esta fuente empieza en ' + M.range(s)[0] + '.');
    if (yr.last && w[1] - w[0] + 1 < yr.last) A.limitaciones.push('Solo hay ' + (w[1] - w[0] + 1) + ' años disponibles en esa ventana.');
    if (!s.measured) A.limitaciones.push('Esta serie es una estimación, no una medición en la zona.');
    if (M.lastYear(s) < DT.LAST_YEAR - 1) A.limitaciones.push('El último dato de esta fuente es ' + M.lastYear(s) + '.');
    A.datos = pack([s], w);
    return A;
  }
  function bestPeriodAnswer(s) {
    var best = null;
    for (var y = s.xs[0]; y + 9 <= M.lastYear(s); y++) {
      var sl = M.slice(s, y, y + 9), r = DT.analyze(sl.xs, sl.ys);
      if (r && (!best || r.b > best[1].b)) best = [y, r];
    }
    if (!best) return gapAnswer('Pocos datos', 'No hay suficientes años para buscar la década de mayor subida.');
    var full = DT.analyze(s.xs, s.ys);
    return {
      titulo: 'Mayor subida en ' + s.name + ': ' + best[0] + '–' + (best[0] + 9),
      explicacion: 'De todas las ventanas de 10 años, la de ' + best[0] + '–' + (best[0] + 9) + ' tuvo la subida más rápida: ' + sfmt(best[1].b * 10, 2) + ' °C por década' + (full ? ', frente a ' + sfmt(full.b * 10, 2) + ' °C por década en todo el registro.' : '.'),
      valores: [['Ventana', best[0] + '–' + (best[0] + 9)], ['Ritmo en esa década', sfmt(best[1].b * 10, 2) + ' °C/déc.'], ['Ritmo de todo el registro', full ? sfmt(full.b * 10, 2) + ' °C/déc.' : '—']],
      observado: ['Se calculó la pendiente de cada ventana de 10 años seguidos.'], interpretacion: ['Diez años son pocos: una subida rápida puede incluir años de El Niño al final o de La Niña al inicio.'], posibles: [], limitaciones: [],
      fuente: s.src, chart: { series: [{ xs: s.xs, ys: s.ys, res: full }], band: [best[0], best[0] + 9], marks: [] }, datos: pack([s])
    };
  }
  function anomalyRankAnswer() {
    if (M.dep.status !== 'ok') return gapAnswer('Faltan los datos por departamento', 'Para comparar anomalías entre departamentos hay que generar departamentos.json (npm run departamentos, con NASA POWER). No se muestran valores inventados.');
    var y = M.dep.data.years[M.dep.data.years.length - 1];
    var rows = M.depList().map(function (d) { var s = M.series('dep:' + d.id); if (!s) return null; var a = M.anomaly(s, y), sl = M.slice(s, 1981, y), r = DT.analyze(sl.xs, sl.ys); return a === null ? null : { n: d.name, a: a, r: r }; }).filter(Boolean).sort(function (p, q) { return q.a - p.a; });
    var sig = rows.filter(function (r) { return r.r && r.r.p < 0.05 && r.r.pmk < 0.05 && r.r.b > 0; }).length;
    return {
      titulo: 'Anomalía más alta en ' + y + ': ' + rows[0].n + ' (' + sfmt(rows[0].a, 2) + ' °C)',
      explicacion: 'Comparado con su propio promedio 1991–2020, ' + rows[0].n + ', ' + rows[1].n + ' y ' + rows[2].n + ' tuvieron las anomalías más altas en ' + y + '. ' + sig + ' de ' + rows.length + ' departamentos tienen una tendencia al alza significativa desde 1981.',
      valores: rows.slice(0, 5).map(function (r) { return [r.n, sfmt(r.a, 2) + ' °C']; }),
      observado: ['Anomalía = temperatura de ' + y + ' menos el promedio 1991–2020 del mismo departamento.'], interpretacion: ['Una anomalía alta en un solo año no es lo mismo que una tendencia; revisa también la tendencia de cada departamento.'], posibles: [], limitaciones: [],
      fuente: M.dep.data.fuente, bars: rows.slice(0, 10).map(function (r) { return [r.n, r.a]; }), datos: { anio: y, departamentos: rows.map(function (r) { return { nombre: r.n, anomalia: +r.a.toFixed(2), tendencia_decada: r.r ? +(r.r.b * 10).toFixed(3) : null, p: r.r ? r.r.p : null, p_mk: r.r ? r.r.pmk : null }; }), fuente: M.dep.data.fuente }
    };
  }
  function compareAnswer(list, yr) {
    var miss = list.filter(function (s) { return s.missing; });
    if (miss.length) return gapAnswer('Faltan datos de ' + miss.map(function (s) { return s.name; }).join(' y '), 'La temperatura del aire por departamento aún no se ha generado (npm run departamentos). Sin esos datos no se puede comparar sin inventar valores.');
    var lo = d3.max(list, function (s) { return s.xs[0]; }), hi = d3.min(list, function (s) { return M.lastYear(s); });
    var w = yr.list.length >= 2 ? [Math.max(lo, Math.min(yr.list[0], yr.list[1])), Math.min(hi, Math.max(yr.list[0], yr.list[1]))] : yr.last ? [Math.max(lo, hi - yr.last + 1), hi] : [lo, hi];
    var st = list.map(function (s) { var sl = M.slice(s, w[0], w[1]); return { s: s, res: DT.analyze(sl.xs, sl.ys), mean: M.meanIn(s, w[0], w[1]) }; });
    var fast = st.slice().sort(function (a, b) { return (b.res ? b.res.b : -9) - (a.res ? a.res.b : -9); });
    var kinds = {}; list.forEach(function (s) { kinds[s.kind] = 1; });
    var A = {
      titulo: fast[0].res && fast[fast.length - 1].res && Math.abs(fast[0].res.b - fast[fast.length - 1].res.b) * 10 < 0.01 ? st.map(function (t) { return t.s.name; }).join(' y ') + ': ritmo de cambio muy parecido' : fast[0].s.name + ' se calienta más rápido que ' + fast[fast.length - 1].s.name,
      explicacion: 'Entre ' + w[0] + ' y ' + w[1] + ', ' + st.map(function (t) { return t.s.name + ' cambió ' + (t.res ? sfmt(t.res.b * 10, 2) + ' °C por década' : '(sin datos suficientes)') + (t.mean !== null && !t.s.anomaly ? ' con un promedio de ' + fmt(t.mean, 1) + ' °C' : ''); }).join('; ') + '.',
      valores: st.map(function (t) { return [t.s.name, (t.mean !== null && !t.s.anomaly ? fmt(t.mean, 1) + ' °C · ' : '') + (t.res ? sfmt(t.res.b * 10, 2) + ' °C/déc.' : '—')]; }),
      observado: st.map(function (t) { return t.s.name + ': ' + (t.res ? (t.res.p < 0.05 && t.res.pmk < 0.05 ? 'tendencia significativa' : 'tendencia no significativa') : 'pocos datos') + '.'; }),
      interpretacion: [], posibles: [], limitaciones: Object.keys(kinds).length > 1 ? ['Son variables distintas (mar, aire o anomalía global): compara sus tendencias, no sus valores.'] : [],
      fuente: list.map(function (s) { return s.src; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(' · '),
      chart: { series: st.map(function (t) { return { xs: t.s.xs, ys: t.s.ys, res: t.res }; }), x: w, marks: [] }, legend: list.map(function (s) { return s.name; }), datos: pack(list, w)
    };
    if (st.length === 2 && st[0].mean !== null && st[1].mean !== null && Object.keys(kinds).length === 1 && !list[0].anomaly) A.valores.push(['Diferencia de promedio', fmt(Math.abs(st[0].mean - st[1].mean), 1) + ' °C']);
    return A;
  }
  function recentAnswer(s) {
    var last = M.lastYear(s), r5 = M.meanIn(s, last - 4, last), p = M.meanIn(s, last - 24, last - 5);
    var A = seriesAnswer(s, { list: [], last: 10 });
    A.titulo = 'Últimos años en ' + s.name + ': ' + sfmt(r5 - p, 2) + ' °C frente a los 20 años anteriores';
    A.valores.unshift(['Promedio ' + (last - 4) + '–' + last, (s.anomaly ? sfmt(r5, 2) : fmt(r5, 2)) + ' °C'], ['Promedio ' + (last - 24) + '–' + (last - 5), (s.anomaly ? sfmt(p, 2) : fmt(p, 2)) + ' °C']);
    return A;
  }
  function gapAnswer(t, e) { return { titulo: t, explicacion: e, valores: [], observado: [], interpretacion: [], posibles: [], limitaciones: [e], fuente: '', gap: true }; }
  function helpAnswer() {
    return { titulo: '¿Sobre qué región o datos quieres preguntar?', explicacion: 'Puedo responder con los datos de la app: temperatura del mar por océano (1970–2021), temperatura global (1880–2025), zonas de Colombia y temperatura del aire por departamento (si ya se generaron sus datos). Nombra una región o selecciona una en el mapa y escribe «esta región».', valores: [], observado: [], interpretacion: [], posibles: [], limitaciones: [], fuente: '', gap: true };
  }
  function pack(list, w) {
    return { periodo: w || null, series: list.map(function (s) { return { nombre: s.name, variable: s.kind === 'mar' ? 'temperatura superficial del mar' : s.kind === 'aire' ? 'temperatura del aire a 2 m' : 'anomalía de temperatura global (frente a 1951–1980)', unidad: '°C', fuente: s.src, medido: s.measured !== false, anios: s.xs, valores: s.ys.map(function (v) { return isFinite(v) ? Math.round(v * 100) / 100 : null; }) }; }) };
  }
  function answer(q) {
    var n = norm(q), ents = entities(q), yr = years(q);
    if (/anomal/.test(n) && /departament/.test(n) && ents.length < 2) return anomalyRankAnswer();
    if (ents.length >= 2) return compareAnswer(ents.slice(0, 4), yr);
    var s = ents[0] || contextSeries() || (/(ocean|mar)/.test(n) ? M.series('oc:Todos los océanos') : null) || (/(temperatura|planeta|global|calent)/.test(n) ? M.series('planeta') : null);
    if (!s) return helpAnswer();
    if (/(mayor incremento|mas rapido|periodo con mayor|mayor aumento|mayor subida)/.test(n)) return bestPeriodAnswer(s);
    if (/(ultimos anos|recientes|comportamiento)/.test(n) && !yr.last) return recentAnswer(s);
    return seriesAnswer(s, yr, q);
  }

  /* ---------- explicar un resultado del comparador ---------- */
  function packAnswer(p) {
    var F = p.hallazgos || [];
    return {
      titulo: F[0] ? F[0].titulo : 'Comparación', explicacion: F.slice(0, 2).map(function (f) { return f.texto; }).join(' '),
      valores: [].concat.apply([], F.map(function (f) { return f.valores || []; })).slice(0, 6),
      observado: F.filter(function (f) { return f.tipo === 'obs'; }).map(function (f) { return f.texto; }),
      interpretacion: F.filter(function (f) { return f.tipo === 'int'; }).map(function (f) { return f.texto; }),
      posibles: F.filter(function (f) { return f.tipo === 'ctx'; }).map(function (f) { return f.texto; }),
      limitaciones: F.filter(function (f) { return f.tipo === 'gap'; }).map(function (f) { return f.texto; }),
      fuente: (F.filter(function (f) { return f.fuente; })[0] || {}).fuente || '', datos: p
    };
  }

  /* ---------- resumen de TODOS los datos de la app (para preguntas libres) ---------- */
  var _sum = null;
  document.addEventListener('dt-deps', function () { _sum = null; });
  function r2(v) { return v === null || v === undefined || !isFinite(v) ? null : Math.round(v * 100) / 100; }
  function brief(s) {
    if (!s) return null;
    var last = M.lastYear(s), full = DT.analyze(s.xs, s.ys);
    return { nombre: s.name, variable: s.kind === 'mar' ? 'temperatura del mar' : s.kind === 'aire' ? 'temperatura del aire a 2 m' : 'anomalía global', desde: s.xs[0], ultimo_anio: last, valor_ultimo_anio: r2(M.valueAt(s, last)), promedio_1981_1990: r2(M.meanIn(s, 1981, 1990)), promedio_ultimos_10: r2(M.meanIn(s, last - 9, last)), tendencia_por_decada: full ? r2(full.b * 10) : null, tendencia_significativa: full ? full.p < 0.05 && full.pmk < 0.05 : null, anio_mas_calido: s.xs.reduce(function (b, x, i) { return isFinite(s.ys[i]) && (b === null || s.ys[i] > s.ys[s.xs.indexOf(b)]) ? x : b; }, null) };
  }
  function summaryPack() {
    if (_sum) return _sum;
    var g = M.series('planeta');
    _sum = {
      nota: 'Resumen calculado por la app con sus datos reales. Úsalo para responder preguntas generales.',
      planeta: Object.assign(brief(g) || {}, { serie_por_anio: g ? g.xs.filter(function (x) { return x >= 1950; }).map(function (x) { return [x, r2(M.valueAt(g, x))]; }) : [] , fuente: 'NASA GISTEMP v4, °C frente a 1951–1980' }),
      oceanos: M.OCEANS.concat(['Todos los océanos']).map(function (o) { return brief(M.series('oc:' + o)); }).filter(Boolean),
      oceanos_fuente: 'NOAA ERSSTv5, promedio anual 1970–2021',
      departamentos_colombia: M.dep.status === 'ok' ? M.depList().map(function (d) { var b = brief(M.series('dep:' + d.id)); if (b) b.anomalia_ultimo_anio_vs_1991_2020 = r2(M.anomaly(M.series('dep:' + d.id), b.ultimo_anio)); return b; }).filter(Boolean) : 'aún no generados',
      departamentos_fuente: M.dep.status === 'ok' ? M.dep.data.fuente : null,
      zonas_colombia: DT.ZONES.map(function (z) { return brief(M.series('zona:' + z.id + (z.id === 'caribe' ? ':sanandres' : ''))); }).filter(Boolean),
      eventos_registrados: DT.EVENTS.map(function (e) { return { anio: e.y, evento: e.t }; })
    };
    return _sum;
  }
  function selection() {
    var o = { capa: S.layer, anio_en_pantalla: S.year, vista: S.focus };
    if (S.dep && M.dep.byId[S.dep]) o.departamento_seleccionado = M.dep.byId[S.dep].name;
    if (S.zone) o.zona_seleccionada = DT.zoneById(S.zone).name;
    var c = contextSeries(); if (c) o.serie_seleccionada = brief(c);
    if (M.comparePack && S.tool === 'cmp') o.comparacion_abierta = M.comparePack();
    return o;
  }
  var HISTORY = [];

  /* ---------- modelo de lenguaje (opcional) ---------- */
  var PROMPT = 'Eres el analista ambiental de "Detectives de la Tierra", una app educativa para estudiantes y público general. Responde en español sencillo, breve y amable, como si le explicaras a alguien sin conocimientos técnicos. ' +
    'Puedes responder cualquier pregunta libre. Para cifras, años, lugares y tendencias usa SOLO los datos del JSON "datos" (resumen_general, calculo_de_la_app, seleccion_actual): no inventes mediciones. ' +
    'Si la pregunta es de cultura general o un concepto (por ejemplo, qué es El Niño o qué es una anomalía), puedes explicarlo con conocimiento general, pero márcalo en "interpretacion" como explicación general, no como dato de la app. ' +
    'Si los datos no alcanzan, dilo en "limitaciones" y sugiere qué mirar en la app. Separa lo observado, la interpretación y las posibles explicaciones; nunca presentes una hipótesis como hecho. Cita la fuente de los datos que uses. ' +
    'Responde SOLO con JSON: {"titulo":"","explicacion":"2 a 4 frases sencillas","valores":[{"etiqueta":"","valor":""}],"observado":[],"interpretacion":[],"posibles_explicaciones":[],"limitaciones":[],"fuente":""}';
  function llm(q, base) {
    var datos = {
      calculo_de_la_app: base.gap ? null : { titulo: base.titulo, explicacion: base.explicacion, valores: base.valores, observado: base.observado, limitaciones: base.limitaciones },
      datos_de_la_pregunta: base.datos || null, seleccion_actual: selection(), resumen_general: summaryPack(), conversacion_previa: HISTORY.slice(-4)
    };
    if (LLM.mode === 'sample') {
      var input = PROMPT + '\n\nPregunta: ' + q + '\n\ndatos = ' + JSON.stringify(datos).slice(0, 60000);
      var call = LLM.sample.json ? LLM.sample.json(input, { modelTier: 'default' }) : LLM.sample(input, { modelTier: 'default' }).then(function (r) { var m = r.text.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null; });
      return call;
    }
    if (LLM.mode === 'server') {
      return fetch(DT.apiBase() + '/api/ia', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pregunta: q, datos: datos }) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) { return j.respuesta; });
    }
    return Promise.resolve(null);
  }
  function merge(base, r) {
    if (!r || !r.titulo) return base;
    var out = Object.assign({}, base);
    out.titulo = r.titulo; out.explicacion = r.explicacion || base.explicacion;
    if (r.valores && r.valores.length) out.valores = r.valores.map(function (v) { return Array.isArray(v) ? v : [v.etiqueta, v.valor]; });
    ['observado', 'interpretacion', 'limitaciones'].forEach(function (k) { if (r[k] && r[k].length) out[k] = r[k]; });
    if (r.posibles_explicaciones && r.posibles_explicaciones.length) out.posibles = r.posibles_explicaciones;
    if (r.fuente) out.fuente = r.fuente;
    out.byLLM = true; out.gap = false;
    return out;
  }

  /* ---------- interfaz ---------- */
  function cardHTML(q, A, pending) {
    var sec = function (k, t, cls) { return A[k] && A[k].length ? '<div class="ia-sec ' + cls + '"><b>' + t + '</b><ul>' + A[k].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' : ''; };
    var chart = '';
    if (A.chart) chart = '<div class="chart">' + M.multiChart(A.chart.series, { marks: A.chart.marks, band: A.chart.band, x: A.chart.x, aria: A.titulo }) + '</div>' + (A.legend ? '<div class="leg">' + A.legend.map(function (n, i) { return '<span style="color:' + M.COLORS[i] + '">━ ' + esc(n) + '</span>'; }).join('') + '</div>' : '');
    if (A.bars) chart = '<div class="chart">' + M.barChart(A.bars, { unit: ' °C', aria: A.titulo }) + '</div>';
    return '<div class="ia-q">' + esc(q) + '</div><div class="ia-a' + (A.gap ? ' gap' : '') + '"><div class="row" style="justify-content:space-between;gap:6px"><b class="ia-t">' + esc(A.titulo) + '</b><span class="tag" style="background:' + (A.byLLM ? '#4c1d95;color:#ddd6fe' : '#0c4a6e;color:#bae6fd') + '">' + (A.byLLM ? esc(LLM.name || 'IA') : 'Analista') + '</span></div>' +
      '<p>' + esc(A.explicacion) + '</p>' +
      (A.valores && A.valores.length ? '<div class="fvals">' + A.valores.map(function (v) { return '<span><small>' + esc(v[0]) + '</small>' + esc(v[1]) + '</span>'; }).join('') + '</div>' : '') + chart +
      '<details class="more"><summary>Cómo se llegó a esto</summary>' + sec('observado', 'Dato observado', 'o') + sec('interpretacion', 'Interpretación', 'i') + sec('posibles', 'Posibles explicaciones (no comprobadas)', 'p') + sec('limitaciones', 'Limitaciones', 'l') + '</details>' +
      (A.fuente ? '<div class="src">Fuente: ' + esc(A.fuente) + '</div>' : '') + (pending ? '<div class="src ia-wait">Claude está redactando la explicación con estos datos…</div>' : '') + '</div>';
  }
  function show(q, A) {
    var log = $('#iaLog'), el = document.createElement('div');
    el.className = 'ia-item';
    var useLLM = !!LLM.mode;
    el.innerHTML = useLLM && A.gap ? '<div class="ia-q">' + esc(q) + '</div><div class="ia-a"><div class="src ia-wait">Pensando con los datos de la app…</div></div>' : cardHTML(q, A, useLLM);
    log.appendChild(el); log.scrollTop = log.scrollHeight;
    var done = function (F) { el.innerHTML = cardHTML(q, F, false); HISTORY.push({ pregunta: q, respuesta: F.titulo + '. ' + F.explicacion }); log.scrollTop = log.scrollHeight; };
    if (useLLM) llm(q, A).then(function (r) { done(merge(A, r)); }).catch(function () { done(A); });
    else HISTORY.push({ pregunta: q, respuesta: A.titulo });
  }
  function open() { $('#iaPanel').hidden = false; document.querySelectorAll('[data-mod=ia]').forEach(function (b) { b.setAttribute('aria-pressed', 'true'); }); badge(); }
  function close() { $('#iaPanel').hidden = true; document.querySelectorAll('[data-mod=ia]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); }
  DT.IA = {
    ask: function (q) { open(); show(q, answer(q)); },
    explain: function (p) { open(); show(p.tipo === 'comparacion_entre_regiones' ? 'Explica esta comparación entre regiones' : 'Explica qué cambió entre ' + p.años.join(' y '), packAnswer(p)); },
    answer: answer, toggle: function () { if ($('#iaPanel').hidden) open(); else close(); }
  };
  function init() {
    var p = $('#iaPanel'); if (!p) return;
    $('#iaSug').innerHTML = SUGGEST.map(function (s, i) { return '<button data-sq="' + i + '">' + esc(s) + '</button>'; }).join('');
    $('#iaSug').querySelectorAll('[data-sq]').forEach(function (b) { b.addEventListener('click', function () { DT.IA.ask(SUGGEST[+b.getAttribute('data-sq')]); }); });
    $('#iaForm').addEventListener('submit', function (e) { e.preventDefault(); var v = $('#iaIn').value.trim(); if (!v) return; $('#iaIn').value = ''; DT.IA.ask(v); });
    $('#iaClose').addEventListener('click', close);
    badge();
  }
  init();
})();
