/* Detectives de la Tierra · Comparador
   A. Entre años: qué cambió entre un año inicial y uno final (océanos, departamentos de Colombia o planeta).
   D. Entre regiones: 2 a 4 regiones lado a lado en el mismo periodo.
   Todo sale de los datos de la app; el resumen del "analista" se arma solo con esos números. */
(function () {
  var DT = window.DT, M = DT && DT.M;
  if (!M) return;
  var S = DT.S, fmt = DT.fmt, sfmt = DT.sfmt, esc = DT.esc, clamp = DT.clamp;
  var $ = function (s) { return document.querySelector(s); };
  S.tool = null;
  S.cmp = { tab: 'regiones', scope: 'colombia', a: 1981, b: 2025, smooth: false, regs: ['dep:ant', 'dep:lag'], per: null, region: 'Todos los océanos' };
  var prevLayer = null, lastPack = null;

  /* ---------- capa del globo: cambio entre dos años ---------- */
  DT.LAYERS.cmp = { q: '¿Qué cambió entre dos años?', hint: ['🔵 se enfrió', '🔴 se calentó'], name: 'Cambio entre años', title: 'Cambio de la temperatura del mar entre dos años', desc: 'Rojo: el mar estaba más caliente en el año final. Azul: más frío.', unit: '°C de diferencia', src: 'NOAA ERSSTv5 · diferencia entre los dos años elegidos', range: [1970, 2021] };
  DT.LINKS.cmp = DT.LINKS.sst;
  DT.scales.cmp = d3.scaleDiverging(function (t) { return d3.interpolateRdBu(1 - t); }).domain([-2, 0, 2]);
  function yv(y, k) {
    if (!S.cmp.smooth) return DT.valAt(y, k);
    var v = [], i;
    for (i = y - 1; i <= y + 1; i++) if (DT.hasYear(i)) { var x = DT.valAt(i, k); if (isFinite(x)) v.push(x); }
    return v.length ? d3.mean(v) : NaN;
  }
  DT.HOOKS.cell.cmp = function (i, k) { var r = yearsOcean(); return yv(r[1], k) - yv(r[0], k); };
  DT.HOOKS.legend.cmp = function () {
    var sc = DT.scales.cmp, dom = sc.domain(), cv = $('#legBar'), c2 = cv.getContext('2d');
    for (var x = 0; x < cv.width; x++) { c2.fillStyle = sc(dom[0] + (dom[2] - dom[0]) * x / (cv.width - 1)); c2.fillRect(x, 0, 1, cv.height); }
    $('#legTicks').innerHTML = '<span>' + sfmt(dom[0], 1) + '</span><span>0</span><span>' + sfmt(dom[2], 1) + '</span>';
    var r = yearsOcean();
    $('#legUnit').textContent = '°C · ' + r[1] + ' menos ' + r[0] + ' (mar, NOAA ERSSTv5)';
  };
  function yearsOcean() {
    var lo = DT.Y0, hi = DT.Y0 + DT.NY - 1;
    return [clamp(Math.min(S.cmp.a, S.cmp.b), lo, hi), clamp(Math.max(S.cmp.a, S.cmp.b), lo, hi)];
  }
  function updateScale() {
    var v = [];
    DT.cells.forEach(function (k, i) { var d = DT.HOOKS.cell.cmp(i, k); if (isFinite(d)) v.push(Math.abs(d)); });
    v.sort(d3.ascending);
    var m = Math.max(0.5, Math.ceil((d3.quantile(v, 0.98) || 1) * 2) / 2);
    DT.scales.cmp.domain([-m, 0, m]);
  }

  /* ---------- análisis entre años ---------- */
  function wmean(list, y) {
    if (!S.cmp.smooth) return M.oceanMean(list, y);
    var v = []; for (var i = y - 1; i <= y + 1; i++) if (DT.hasYear(i)) v.push(M.oceanMean(list, i)); return d3.mean(v);
  }
  function analyzeOceans() {
    var r = yearsOcean(), a = r[0], b = r[1], oc = M.oceanCells(), all = oc['Todos los océanos'];
    var A = wmean(all, a), B = wmean(all, b);
    var up = 0, up05 = 0, tot = 0, hotA = 0, hotB = 0;
    all.forEach(function (c) {
      var d = yv(b, c[1]) - yv(a, c[1]);
      if (!isFinite(d)) return;
      tot += c[2]; if (d > 0) up += c[2]; if (d > 0.5) up05 += c[2];
      if (DT.anomAt(a, c[1]) > 1) hotA += c[2];
      if (DT.anomAt(b, c[1]) > 1) hotB += c[2];
    });
    var regs = M.OCEANS.map(function (o) {
      var l = oc[o]; if (!l.length) return null;
      var d = wmean(l, b) - wmean(l, a), s = M.series('oc:' + o), sl = M.slice(s, a, b);
      return { name: o, d: d, res: DT.analyze(sl.xs, sl.ys) };
    }).filter(Boolean).sort(function (x, y) { return y.d - x.d; });
    var sAll = M.series('oc:Todos los océanos'), slA = M.slice(sAll, a, b), res = DT.analyze(slA.xs, slA.ys);
    return { scope: 'oceanos', a: a, b: b, req: [S.cmp.a, S.cmp.b], A: A, B: B, d: B - A, pUp: up / tot, pUp05: up05 / tot, hotA: hotA / tot, hotB: hotB / tot, regs: regs, res: res, series: sAll };
  }
  function analyzeColombia() {
    if (M.dep.status !== 'ok') return { scope: 'colombia', missing: true };
    var ys = M.dep.data.years, lo = ys[0], hi = ys[ys.length - 1];
    var a = clamp(Math.min(S.cmp.a, S.cmp.b), lo, hi), b = clamp(Math.max(S.cmp.a, S.cmp.b), lo, hi);
    var w = function (s, y) { return S.cmp.smooth ? M.meanIn(s, y - 1, y + 1) : M.valueAt(s, y); };
    var regs = M.depList().map(function (d) {
      var s = M.series('dep:' + d.id); if (!s) return null;
      var va = w(s, a), vb = w(s, b); if (va === null || vb === null) return null;
      var sl = M.slice(s, a, b);
      return { id: d.id, name: d.name, A: va, B: vb, d: vb - va, res: DT.analyze(sl.xs, sl.ys), anomB: M.anomaly(s, b) };
    }).filter(Boolean).sort(function (x, y) { return y.d - x.d; });
    var nUp = regs.filter(function (r) { return r.d > 0; }).length, nSig = regs.filter(function (r) { return r.res && r.res.p < 0.05 && r.res.pmk < 0.05 && r.res.b > 0; }).length;
    return { scope: 'colombia', a: a, b: b, req: [S.cmp.a, S.cmp.b], regs: regs, meanD: d3.mean(regs, function (r) { return r.d; }), nUp: nUp, nSig: nSig, lo: lo, hi: hi };
  }
  function analyzePlanet() {
    var s = M.series('planeta'), lo = s.xs[0], hi = M.lastYear(s);
    var a = clamp(Math.min(S.cmp.a, S.cmp.b), lo, hi), b = clamp(Math.max(S.cmp.a, S.cmp.b), lo, hi);
    var w = function (y) { return S.cmp.smooth ? M.meanIn(s, y - 1, y + 1) : M.valueAt(s, y); };
    var sl = M.slice(s, a, b);
    var warm = sl.xs.reduce(function (best, x, i) { return best === null || sl.ys[i] > best[1] ? [x, sl.ys[i]] : best; }, null);
    // década con mayor subida (pendiente de 10 años)
    var bestDec = null;
    for (var y = a; y + 9 <= b; y++) { var r = DT.analyze(d3.range(y, y + 10), d3.range(y, y + 10).map(function (x) { return M.valueAt(s, x); })); if (r && (!bestDec || r.b > bestDec[1])) bestDec = [y, r.b]; }
    return { scope: 'planeta', a: a, b: b, req: [S.cmp.a, S.cmp.b], A: w(a), B: w(b), d: w(b) - w(a), res: DT.analyze(sl.xs, sl.ys), warm: warm, bestDec: bestDec, series: s };
  }

  /* ---------- el analista: hallazgos solo con los números calculados ---------- */
  function eventsIn(a, b) { return DT.EVENTS.filter(function (e) { return (e.y === a || e.y === b) && e.y <= 2025; }); }
  function findings(R) {
    var F = [], src;
    var gap = R.req && (R.req[0] !== Math.min(R.a, R.b) || R.req[1] !== Math.max(R.a, R.b));
    if (R.scope === 'oceanos') {
      src = 'NOAA ERSSTv5 (1970–2021), promedio anual por área';
      F.push({ t: 'obs', title: 'El océano ' + (R.d >= 0 ? 'se calentó ' : 'se enfrió ') + fmt(Math.abs(R.d), 2) + ' °C', text: 'Comparando ' + R.a + ' con ' + R.b + ', la temperatura media de la superficie de los océanos pasó de ' + fmt(R.A, 2) + ' °C a ' + fmt(R.B, 2) + ' °C.', vals: [['Diferencia', sfmt(R.d, 2) + ' °C'], ['Superficie más cálida', fmt(R.pUp * 100, 0) + ' %']], src: src });
      var top = R.regs[0], bot = R.regs[R.regs.length - 1];
      F.push({ t: 'obs', title: 'Donde más cambió: ' + top.name, text: top.name + ' cambió ' + sfmt(top.d, 2) + ' °C; ' + bot.name + ' es la región con el cambio ' + (bot.d < 0 ? 'más frío (' : 'más pequeño (') + sfmt(bot.d, 2) + ' °C).', vals: [[top.name, sfmt(top.d, 2) + ' °C'], [bot.name, sfmt(bot.d, 2) + ' °C']], src: src });
      F.push({ t: 'obs', title: 'Áreas con anomalía mayor a +1 °C', text: 'En ' + R.a + ' el ' + fmt(R.hotA * 100, 1) + ' % del océano estaba más de 1 °C por encima de su promedio 1971–2000; en ' + R.b + ', el ' + fmt(R.hotB * 100, 1) + ' %.', vals: [[String(R.a), fmt(R.hotA * 100, 1) + ' %'], [String(R.b), fmt(R.hotB * 100, 1) + ' %']], src: src });
      if (R.res) F.push(trendFinding(R.res, 'La temperatura media del océano', R.a + '–' + R.b, src));
    } else if (R.scope === 'colombia') {
      src = M.dep.data.fuente;
      var t = R.regs[0], l = R.regs[R.regs.length - 1];
      F.push({ t: 'obs', title: R.nUp + ' de ' + R.regs.length + ' departamentos están más cálidos', text: 'En promedio, el aire de los departamentos cambió ' + sfmt(R.meanD, 2) + ' °C entre ' + R.a + ' y ' + R.b + '.', vals: [['Cambio promedio', sfmt(R.meanD, 2) + ' °C'], ['Tendencia significativa al alza', R.nSig + ' departamentos']], src: src });
      F.push({ t: 'obs', title: 'Mayor cambio: ' + t.name, text: t.name + ' pasó de ' + fmt(t.A, 1) + ' a ' + fmt(t.B, 1) + ' °C (' + sfmt(t.d, 2) + '). El menor cambio fue en ' + l.name + ' (' + sfmt(l.d, 2) + ' °C).', vals: [[t.name, sfmt(t.d, 2) + ' °C'], [l.name, sfmt(l.d, 2) + ' °C']], src: src });
    } else {
      src = 'NASA GISTEMP v4 (anomalía frente a 1951–1980)';
      F.push({ t: 'obs', title: 'El planeta ' + (R.d >= 0 ? 'está ' + fmt(R.d, 2) + ' °C más cálido' : 'está ' + fmt(-R.d, 2) + ' °C más frío'), text: 'La anomalía global pasó de ' + sfmt(R.A, 2) + ' °C en ' + R.a + ' a ' + sfmt(R.B, 2) + ' °C en ' + R.b + '.', vals: [['Diferencia', sfmt(R.d, 2) + ' °C'], ['Año más cálido del periodo', R.warm ? R.warm[0] + ' (' + sfmt(R.warm[1], 2) + ' °C)' : '—']], src: src });
      if (R.bestDec) F.push({ t: 'obs', title: 'Década de mayor subida: ' + R.bestDec[0] + '–' + (R.bestDec[0] + 9), text: 'En esos 10 años la temperatura global subió a un ritmo de ' + sfmt(R.bestDec[1] * 10, 2) + ' °C por década, el más rápido dentro del periodo elegido.', vals: [['Ritmo', sfmt(R.bestDec[1] * 10, 2) + ' °C/déc.']], src: src });
      if (R.res) F.push(trendFinding(R.res, 'La temperatura global', R.a + '–' + R.b, src));
    }
    var ev = eventsIn(R.a, R.b);
    if (ev.length && R.scope !== 'colombia') F.push({ t: 'ctx', title: 'Contexto de esos años', text: ev.map(function (e) { return e.y + ': ' + e.t; }).join(' · ') + '. Un año suelto puede verse más caliente o más frío por estos fenómenos; por eso conviene mirar también la tendencia de todo el periodo.', vals: [], src: 'Eventos registrados en la línea de tiempo de la app' });
    if (gap) F.push({ t: 'gap', title: 'Ajusté el periodo a los datos disponibles', text: 'Pediste ' + Math.min(R.req[0], R.req[1]) + '–' + Math.max(R.req[0], R.req[1]) + ', pero esta fuente solo tiene datos para ' + R.a + '–' + R.b + '. No se rellenaron los años que faltan.', vals: [], src: '' });
    if (S.cmp.smooth) F.push({ t: 'gap', title: 'Promedio de 3 años', text: 'Cada año se calculó como el promedio de ese año con el anterior y el siguiente, para reducir el efecto de un año extremo.', vals: [], src: '' });
    return F;
  }
  function trendFinding(res, subject, per, src) {
    var sig = res.p < 0.05 && res.pmk < 0.05;
    return { t: sig ? 'obs' : 'int', title: sig ? 'Tendencia ' + (res.b > 0 ? 'al alza' : 'a la baja') + ' significativa' : 'Sin tendencia clara', text: sig ? subject + ' cambió ' + sfmt(res.b * 10, 2) + ' °C por década entre ' + per + ' y las dos pruebas estadísticas coinciden (p < 0,05).' : 'Entre ' + per + ' las pruebas no muestran una tendencia lineal clara (puede ser variabilidad natural o un periodo corto).', vals: [['Ritmo', sfmt(res.b * 10, 2) + ' °C/déc.'], ['p (regresión / Mann-Kendall)', DT.pfmt(res.p) + ' / ' + DT.pfmt(res.pmk)]], src: src };
  }
  var TAG = { obs: ['Dato observado', '#14532d', '#bbf7d0'], int: ['Interpretación', '#1e3a8a', '#bfdbfe'], ctx: ['Posible explicación', '#713f12', '#fde68a'], gap: ['Limitación', '#3f3f46', '#e4e4e7'] };
  M.findingHTML = function (f) {
    var tg = TAG[f.t] || TAG.obs;
    return '<div class="finding"><div class="row" style="justify-content:space-between;gap:6px"><b>' + esc(f.title) + '</b><span class="tag" style="background:' + tg[1] + ';color:' + tg[2] + '">' + tg[0] + '</span></div>' +
      '<p>' + esc(f.text) + '</p>' + (f.vals && f.vals.length ? '<div class="fvals">' + f.vals.map(function (v) { return '<span><small>' + esc(v[0]) + '</small>' + esc(v[1]) + '</span>'; }).join('') + '</div>' : '') +
      (f.src ? '<div class="src">Fuente: ' + esc(f.src) + '</div>' : '') + '</div>';
  };

  /* ---------- interfaz ---------- */
  function yearOpts(lo, hi, sel) { var h = ''; for (var y = lo; y <= hi; y++) h += '<option' + (y === sel ? ' selected' : '') + '>' + y + '</option>'; return h; }
  function scopeRange() {
    if (S.cmp.scope === 'oceanos') return [DT.Y0, DT.Y0 + DT.NY - 1];
    if (S.cmp.scope === 'colombia') return M.dep.status === 'ok' ? [M.dep.data.years[0], M.dep.data.years[M.dep.data.years.length - 1]] : [1981, 2025];
    var s = M.series('planeta'); return [s.xs[0], M.lastYear(s)];
  }
  function header() {
    return '<div class="seg cmp-tabs" role="tablist"><button data-ct="tiempo" aria-pressed="' + (S.cmp.tab === 'tiempo') + '">⏱ Entre años</button><button data-ct="regiones" aria-pressed="' + (S.cmp.tab === 'regiones') + '">⇄ Entre regiones</button></div>';
  }
  function renderTiempo() {
    var r = scopeRange();
    var html = header() +
      '<div class="cmp-form"><label>Qué comparar<select id="cScope">' +
      '<option value="colombia"' + (S.cmp.scope === 'colombia' ? ' selected' : '') + '>Departamentos de Colombia · temperatura del aire</option>' +
      '<option value="oceanos"' + (S.cmp.scope === 'oceanos' ? ' selected' : '') + '>Mar · temperatura del agua (mapa de cambio)</option></select></label>' +
      '<div class="row" style="gap:6px;flex-wrap:nowrap"><label>Año inicial<select id="cA">' + yearOpts(r[0], r[1], clamp(S.cmp.a, r[0], r[1])) + '</select></label><span style="padding-top:16px">→</span><label>Año final<select id="cB">' + yearOpts(r[0], r[1], clamp(S.cmp.b, r[0], r[1])) + '</select></label></div>' +
      '<label class="chkl"><input type="checkbox" id="cSmooth"' + (S.cmp.smooth ? ' checked' : '') + '> Usar promedio de 3 años (reduce el efecto de un año extremo)</label></div>';
    var R;
    if (S.cmp.scope === 'oceanos') R = analyzeOceans();
    else if (S.cmp.scope === 'colombia') R = analyzeColombia();
    else R = analyzePlanet();
    if (R.missing) {
      html += '<div class="note">Aún no están los datos de temperatura del aire por departamento. Se generan con <b>npm run departamentos</b> en la carpeta del proyecto (NASA POWER, unos minutos) y aparecen aquí solos. No se muestran valores inventados.</div>';
      lastPack = null;
      return html;
    }
    var F = findings(R);
    lastPack = { tipo: 'comparacion_entre_años', alcance: S.cmp.scope, años: [R.a, R.b], hallazgos: F.map(function (f) { return { tipo: f.t, titulo: f.title, texto: f.text, valores: f.vals, fuente: f.src }; }) };
    // nivel 1: tarjetas
    if (R.scope === 'oceanos') {
      html += '<div class="mcards">' + M.card(String(R.a), fmt(R.A, 2) + ' °C', 'océano promedio') + M.card(String(R.b), fmt(R.B, 2) + ' °C', 'océano promedio') + M.card('Cambio', sfmt(R.d, 2) + ' °C', fmt(R.pUp * 100, 0) + ' % más cálido', R.d > 0 ? '#ff7a59' : '#5cb7ff') + '</div>';
      var topReg = R.regs[0].name;
      html += '<div class="chart">' + M.multiChart([R.series, M.series('oc:' + topReg)].map(function (s, i) { var sl = M.slice(s, R.a, R.b); return { xs: s.xs, ys: s.ys, res: DT.analyze(sl.xs, sl.ys), name: s.name }; }), { marks: [R.a, R.b], band: [R.a, R.b], aria: 'Temperatura media del océano y de ' + topReg }) + '</div>' +
        '<div class="leg"><span style="color:' + M.COLORS[0] + '">━ Todos los océanos</span><span style="color:' + M.COLORS[1] + '">━ ' + esc(topReg) + ' (mayor cambio)</span></div>' +
        '<div class="lbl">Cambio por región ' + R.a + '→' + R.b + '</div><div class="chart">' + M.barChart(R.regs.map(function (g) { return [g.name.replace('Océano ', ''), g.d]; }), { unit: ' °C', aria: 'Cambio por región oceánica' }) + '</div>';
    } else if (R.scope === 'colombia') {
      html += '<div class="mcards">' + M.card('Cambio promedio', sfmt(R.meanD, 2) + ' °C', R.a + ' → ' + R.b, R.meanD > 0 ? '#ff7a59' : '#5cb7ff') + M.card('Más cálidos', R.nUp + ' / ' + R.regs.length, 'departamentos') + M.card('Al alza significativa', String(R.nSig), 'departamentos') + '</div>' +
        '<div class="lbl">Cambio por departamento' + (R.regs.length > 12 ? ' · los 8 mayores y los 4 menores' : '') + '</div><div class="chart">' + M.barChart((R.regs.length > 12 ? R.regs.slice(0, 8).concat(R.regs.slice(-4)) : R.regs).map(function (g) { return [g.name, g.d]; }), { unit: ' °C', aria: 'Cambio por departamento' }) + '</div>' +
        '<div class="src">El mapa colorea cada departamento según su cambio.</div>';
    } else {
      html += '<div class="mcards">' + M.card(String(R.a), sfmt(R.A, 2) + ' °C', 'anomalía global') + M.card(String(R.b), sfmt(R.B, 2) + ' °C', 'anomalía global') + M.card('Cambio', sfmt(R.d, 2) + ' °C', '', R.d > 0 ? '#ff7a59' : '#5cb7ff') + '</div>' +
        '<div class="chart">' + M.multiChart([{ xs: R.series.xs, ys: R.series.ys, res: R.res }], { marks: [R.a, R.b], band: [R.a, R.b], aria: 'Temperatura global' }) + '</div>';
    }
    // resumen del analista
    html += '<div class="lbl" style="margin-top:4px">Resumen del analista</div>' + F.slice(0, 2).map(M.findingHTML).join('') +
      '<details class="more"><summary>Ver todos los hallazgos (' + F.length + ')</summary>' + F.slice(2).map(M.findingHTML).join('') + '</details>';
    return html;
  }

  function regionPicker(idx, key) {
    var groups = {};
    M.regions().forEach(function (r) { (groups[r.group] = groups[r.group] || []).push(r); });
    return '<select data-ri="' + idx + '">' + (key ? '' : '<option value="">+ Agregar región…</option>') + Object.keys(groups).map(function (g) {
      return '<optgroup label="' + esc(g) + '">' + groups[g].map(function (r) { return '<option value="' + esc(r.key) + '"' + (r.key === key ? ' selected' : '') + '>' + esc(r.name) + '</option>'; }).join('') + '</optgroup>';
    }).join('') + '</select>';
  }
  // recuadro de resumen: valor de cada región, diferencia y el hallazgo principal (calculado con los datos)
  function summaryBox(stats, a, b, mixed) {
    var ok = stats.filter(function (t) { return t.mean !== null; });
    if (ok.length < 2) return '';
    var hot = ok.slice().sort(function (x, y) { return y.mean - x.mean; }), A = ok[0], B = ok[1];
    var vals = ok.map(function (t) {
      return '<div class="sbv" style="border-color:' + M.COLORS[t.i] + '"><span style="color:' + M.COLORS[t.i] + '">' + esc(t.s.name) + '</span><b>' + (t.s.anomaly ? sfmt(t.mean, 2) : fmt(t.mean, 1)) + ' °C</b><small>promedio ' + a + '–' + b + '</small></div>';
    }).join('');
    var diff = A.mean - B.mean, words = [];
    if (!mixed) {
      var gap = hot[0].mean - hot[hot.length - 1].mean;
      words.push(gap < 0.05 ? 'Tuvieron casi la misma temperatura media entre ' + a + ' y ' + b + '.' : '<b>' + esc(hot[0].s.name) + '</b> fue en promedio <b>' + fmt(gap, 1) + ' °C más ' + (hot[0].s.anomaly ? 'cálido frente a lo normal' : 'cálido') + '</b> que ' + esc(hot[hot.length - 1].s.name) + ' entre ' + a + ' y ' + b + '.');
    }
    var tr = ok.filter(function (t) { return t.res; }).sort(function (x, y) { return y.res.b - x.res.b; });
    if (tr.length >= 2) {
      var f = tr[0], s = tr[tr.length - 1], dd = (f.res.b - s.res.b) * 10;
      words.push(Math.abs(dd) < 0.02 ? 'Las dos cambiaron a un ritmo muy parecido.' : esc(f.s.name) + ' ' + (f.res.b > 0 ? 'se calentó' : 'se enfrió') + ' más rápido: <b>' + sfmt(f.res.b * 10, 2) + ' °C</b> cada 10 años, frente a ' + sfmt(s.res.b * 10, 2) + ' °C en ' + esc(s.s.name) + '.');
    }
    if (mixed) words.push('Una es mar y otra aire: compara cómo cambian, no sus valores.');
    return '<div class="sumbox"><div class="sbvals">' + vals + '</div>' +
      (ok.length === 2 && !mixed ? '<div class="sbdiff">Diferencia (' + esc(A.s.name) + ' − ' + esc(B.s.name) + '): <b>' + sfmt(diff, 2) + ' °C</b></div>' : '') +
      '<div class="sbfind"><span>💡 Hallazgo principal</span>' + words.join(' ') + '</div></div>';
  }
  function renderRegiones() {
    var list = S.cmp.regs.map(M.series).filter(Boolean);
    var lo = d3.max(list, function (s) { return s.xs[0]; }) || 1981, hi = d3.min(list, function (s) { return M.lastYear(s); }) || 2021;
    if (!S.cmp.per) S.cmp.per = [lo, hi];
    var a = clamp(S.cmp.per[0], lo, hi), b = clamp(S.cmp.per[1], lo, hi); if (b - a < 5) { a = lo; b = hi; }
    var html = header() + '<div class="cmp-form"><div class="lbl">Regiones (2 a 4)</div>' +
      S.cmp.regs.map(function (k, i) { return '<div class="row rpick"><span class="dot" style="background:' + M.COLORS[i] + '"></span>' + regionPicker(i, k) + (S.cmp.regs.length > 2 ? '<button class="iconbtn" data-rdel="' + i + '" aria-label="Quitar">✕</button>' : '') + '</div>'; }).join('') +
      (S.cmp.regs.length < 4 ? '<div class="row rpick"><span class="dot"></span>' + regionPicker(S.cmp.regs.length, '') + '</div>' : '') +
      '<div class="row" style="gap:6px;flex-wrap:nowrap"><label>Desde<select id="rA">' + yearOpts(lo, hi, a) + '</select></label><label>Hasta<select id="rB">' + yearOpts(lo, hi, b) + '</select></label></div></div>';
    if (list.length < 2) { lastPack = null; return html + '<div class="note">Elige al menos dos regiones con datos.' + (M.dep.status !== 'ok' ? ' Los departamentos aparecen cuando se generen sus datos (npm run departamentos).' : '') + '</div>'; }
    var kinds = {}; list.forEach(function (s) { kinds[s.kind] = 1; });
    var mixed = Object.keys(kinds).length > 1;
    var stats = list.map(function (s, i) {
      var sl = M.slice(s, a, b), res = DT.analyze(sl.xs, sl.ys), last = M.valueAt(s, b), mean = M.meanIn(s, a, b);
      return { s: s, i: i, res: res, last: last, mean: mean, anom: M.anomaly(s, b), change: res ? res.sen * (b - a) : null };
    });
    html += summaryBox(stats, a, b, mixed) +
      '<div class="chart">' + M.multiChart(stats.map(function (t) { return { xs: t.s.xs, ys: t.s.ys, res: t.res, name: t.s.name, color: M.COLORS[t.i] }; }), { x: [a, b], aria: 'Comparación de regiones', title: mixed ? 'Temperatura de cada región' : 'Temperatura media anual', varName: list[0].anomaly ? 'Diferencia con lo normal' : mixed ? 'Temperatura (mar y aire)' : list[0].kind === 'mar' ? 'Temperatura del mar' : 'Temperatura del aire a 2 m', unit: '°C' }) + '</div>' +
      '<details class="more"><summary>Ver estadísticas detalladas</summary><div class="rcards">' + stats.map(function (t) {
        var col = M.COLORS[t.i];
        return '<div class="rcard" style="border-color:' + col + '"><b style="color:' + col + '">' + esc(t.s.name) + '</b>' +
          '<div class="r"><span>' + (t.s.anomaly ? 'Anomalía ' : 'Promedio ') + b + '</span><b>' + (t.last === null ? '—' : (t.s.anomaly ? sfmt(t.last, 2) : fmt(t.last, 1)) + ' °C') + '</b></div>' +
          '<div class="r"><span>Tendencia</span><b>' + (t.res ? sfmt(t.res.b * 10, 2) + ' °C/déc.' : '—') + '</b></div>' +
          '<div class="r"><span>Cambio ' + a + '–' + b + '</span><b>' + (t.change === null ? '—' : sfmt(t.change, 2) + ' °C') + '</b></div>' +
          (t.s.anomaly ? '' : '<div class="r"><span>Anomalía ' + b + '</span><b>' + (t.anom === null ? '—' : sfmt(t.anom, 2) + ' °C') + '</b></div>') + M.sigIcon(t.res) + '<div class="src">' + esc(t.s.kind === 'mar' ? 'Mar' : t.s.kind === 'aire' ? 'Aire a 2 m' : 'Planeta') + '</div></div>';
      }).join('') + '</div>';
    // diferencias clave automáticas
    var F = [], valid = stats.filter(function (t) { return t.res; }), src = list.map(function (s) { return s.src; }).filter(function (v, i, arr) { return arr.indexOf(v) === i; }).join(' · ');
    if (valid.length >= 2) {
      var fast = valid.slice().sort(function (x, y) { return y.res.b - x.res.b; });
      var tie = Math.abs(fast[0].res.b - fast[fast.length - 1].res.b) * 10 < 0.01;
      F.push({ t: 'obs', title: tie ? 'Ritmo de cambio muy parecido' : fast[0].s.name + ' se calienta más rápido', text: fast[0].s.name + ' cambia ' + sfmt(fast[0].res.b * 10, 2) + ' °C por década, frente a ' + sfmt(fast[fast.length - 1].res.b * 10, 2) + ' °C en ' + fast[fast.length - 1].s.name + ' (' + a + '–' + b + ').', vals: fast.map(function (t) { return [t.s.name, sfmt(t.res.b * 10, 2) + ' °C/déc.']; }), src: src });
      if (!mixed && !list[0].anomaly) {
        var hot = stats.slice().sort(function (x, y) { return y.mean - x.mean; });
        F.push({ t: 'obs', title: 'Diferencia de temperatura media: ' + fmt(hot[0].mean - hot[hot.length - 1].mean, 1) + ' °C', text: hot[0].s.name + ' promedió ' + fmt(hot[0].mean, 1) + ' °C y ' + hot[hot.length - 1].s.name + ' ' + fmt(hot[hot.length - 1].mean, 1) + ' °C entre ' + a + ' y ' + b + '.', vals: hot.map(function (t) { return [t.s.name, fmt(t.mean, 1) + ' °C']; }), src: src });
      }
      var sigs = valid.filter(function (t) { return t.res.p < 0.05 && t.res.pmk < 0.05; }).map(function (t) { return t.s.name; });
      F.push({ t: sigs.length ? 'obs' : 'int', title: sigs.length ? 'Tendencia significativa en ' + sigs.length + ' de ' + valid.length : 'Ninguna tendencia es significativa', text: sigs.length ? 'Pasan las dos pruebas (p < 0,05): ' + sigs.join(', ') + '.' : 'En este periodo ninguna región muestra una tendencia que pase las dos pruebas.', vals: [], src: '' });
    }
    if (mixed) F.push({ t: 'gap', title: 'Ojo: variables distintas', text: 'Estás comparando temperatura del mar con temperatura del aire (o la anomalía global). Se pueden comparar sus tendencias, pero no sus valores absolutos.', vals: [], src: '' });
    lastPack = { tipo: 'comparacion_entre_regiones', periodo: [a, b], regiones: stats.map(function (t) { return { nombre: t.s.name, variable: t.s.kind, unidad: t.s.unit, promedio: t.mean, ultimo: t.last, tendencia_por_decada: t.res ? t.res.b * 10 : null, p_regresion: t.res ? t.res.p : null, p_mann_kendall: t.res ? t.res.pmk : null, fuente: t.s.src }; }), hallazgos: F.map(function (f) { return { tipo: f.t, titulo: f.title, texto: f.text, valores: f.vals }; }) };
    html += '<div class="lbl">Diferencias más relevantes</div>' + F.map(M.findingHTML).join('') + '</details>';
    return html;
  }

  function render() {
    $('#aTitle').textContent = 'Comparar';
    $('#aSub').textContent = S.cmp.tab === 'tiempo' ? 'Qué cambió entre dos años' : 'Dos o más regiones, mismo periodo';
    var box = $('#analysis'); box.hidden = false; box.classList.add('wide');
    $('#aBody').innerHTML = S.cmp.tab === 'tiempo' ? renderTiempo() : renderRegiones();
    wire();
    $('#aClose') && ($('#aClose').hidden = false);
  }
  function apply() {
    if (S.cmp.tab === 'tiempo' && S.cmp.scope === 'oceanos') {
      if (DT.S.layer !== 'cmp') { prevLayer = prevLayer || DT.S.layer; DT.setLayer('cmp'); }
      updateScale(); DT.legend(); DT.recolor(); DT.renderTitles();
      $('#layerDate').textContent = 'Diferencia ' + yearsOcean().join(' → ');
    } else if (DT.S.layer === 'cmp') { DT.setLayer(prevLayer || 'sst'); prevLayer = null; }
    if (S.cmp.tab === 'tiempo' && S.cmp.scope === 'colombia' && S.focus !== 'colombia') DT.setFocus('colombia');
    render(); DT.legend(); DT.requestDraw();
    var r = S.cmp.scope === 'oceanos' ? yearsOcean() : [Math.min(S.cmp.a, S.cmp.b), Math.max(S.cmp.a, S.cmp.b)];
    $('#layerTitle').textContent = S.cmp.tab === 'tiempo' ? '¿Qué cambió entre ' + r[0] + ' y ' + r[1] + '?' : '¿En qué se diferencian estas regiones?';
    if (S.cmp.scope === 'colombia' && S.cmp.tab === 'tiempo') $('#layerDate').textContent = 'Colombia · rojo: el aire se calentó · azul: se enfrió';
  }
  function wire() {
    var q = function (s) { return $('#aBody').querySelector(s); };
    $('#aBody').querySelectorAll('[data-ct]').forEach(function (b) { b.addEventListener('click', function () { S.cmp.tab = b.getAttribute('data-ct'); apply(); }); });
    if (q('#cScope')) q('#cScope').addEventListener('change', function (e) { S.cmp.scope = e.target.value; var r = scopeRange(); S.cmp.a = clamp(S.cmp.a, r[0], r[1]); S.cmp.b = clamp(S.cmp.b, r[0], r[1]); apply(); });
    if (q('#cA')) q('#cA').addEventListener('change', function (e) { S.cmp.a = +e.target.value; apply(); });
    if (q('#cB')) q('#cB').addEventListener('change', function (e) { S.cmp.b = +e.target.value; apply(); });
    if (q('#cSmooth')) q('#cSmooth').addEventListener('change', function (e) { S.cmp.smooth = e.target.checked; apply(); });
    if (q('#rA')) q('#rA').addEventListener('change', function (e) { S.cmp.per = [+e.target.value, S.cmp.per[1]]; render(); });
    if (q('#rB')) q('#rB').addEventListener('change', function (e) { S.cmp.per = [S.cmp.per[0], +e.target.value]; render(); });
    $('#aBody').querySelectorAll('[data-ri]').forEach(function (s) {
      s.addEventListener('change', function () { var i = +s.getAttribute('data-ri'); if (!s.value) return; S.cmp.regs[i] = s.value; S.cmp.per = null; render(); });
    });
    $('#aBody').querySelectorAll('[data-rdel]').forEach(function (b) { b.addEventListener('click', function () { S.cmp.regs.splice(+b.getAttribute('data-rdel'), 1); S.cmp.per = null; render(); }); });
  }

  /* el comparador ocupa el panel derecho mientras esté abierto */
  DT.HOOKS.analysis.unshift(function () { if (S.tool !== 'cmp') { $('#analysis').classList.remove('wide'); return false; } render(); return true; });
  DT.HOOKS.close.push(function () { if (S.tool !== 'cmp') return false; M.closeCompare(); return true; });
  DT.HOOKS.refresh.push(function () { if (S.tool === 'cmp' && DT.S.layer === 'cmp') { updateScale(); DT.legend(); } });

  /* departamentos coloreados por su cambio (comparador de Colombia) */
  DT.HOOKS.legend.override = function () {
    if (S.tool !== 'cmp' || S.cmp.tab !== 'tiempo' || S.cmp.scope !== 'colombia' || M.dep.status !== 'ok') return null;
    var R = analyzeColombia(); if (R.missing) return null;
    var mx = d3.max(R.regs, function (r) { return Math.abs(r.d); }) || 1, sc = d3.scaleDiverging(function (t) { return d3.interpolateRdBu(1 - t); }).domain([-mx, 0, mx]);
    var cv = $('#legBar'), c2 = cv.getContext('2d');
    for (var x = 0; x < cv.width; x++) { c2.fillStyle = sc(-mx + 2 * mx * x / (cv.width - 1)); c2.fillRect(x, 0, 1, cv.height); }
    $('#legTicks').innerHTML = '<span>' + sfmt(-mx, 1) + '</span><span>0</span><span>' + sfmt(mx, 1) + '</span>';
    $('#legUnit').textContent = 'Cambio de temperatura del aire (°C) · ' + R.a + ' → ' + R.b;
    $('#legMk') && ($('#legMk').style.display = 'none');
    return ['🔵 se enfrió', '🔴 se calentó'];
  };
  DT.HOOKS.draw.push(function (ctx, path) {
    if (S.tool !== 'cmp' || S.cmp.tab !== 'tiempo' || S.cmp.scope !== 'colombia' || M.dep.status !== 'ok' || !M.dep.geo) return;
    var R = analyzeColombia(); if (R.missing) return;
    var mx = d3.max(R.regs, function (r) { return Math.abs(r.d); }) || 1, sc = d3.scaleDiverging(function (t) { return d3.interpolateRdBu(1 - t); }).domain([-mx, 0, mx]);
    var byId = {}; R.regs.forEach(function (r) { byId[r.id] = r.d; });
    M.dep.geo.features.forEach(function (f) {
      var v = byId[f.properties.id]; if (v === undefined) return;
      ctx.beginPath(); path(f); ctx.fillStyle = sc(v); ctx.globalAlpha = 0.72; ctx.fill(); ctx.globalAlpha = 1;
    });
  });

  M.openCompare = function (opts) {
    opts = opts || {};
    S.tool = 'cmp';
    if (opts.tab) S.cmp.tab = opts.tab;
    if (opts.regs) { S.cmp.regs = opts.regs.slice(0, 4); S.cmp.per = null; }
    if (opts.scope) S.cmp.scope = opts.scope;
    document.querySelectorAll('[data-mod=cmp]').forEach(function (b) { b.setAttribute('aria-pressed', 'true'); });
    document.querySelector('#stage').classList.add('tooling');
    apply();
  };
  M.closeCompare = function () {
    S.tool = null;
    document.querySelectorAll('[data-mod=cmp]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    if (DT.S.layer === 'cmp') { DT.setLayer(prevLayer || 'sst'); prevLayer = null; }
    $('#analysis').classList.remove('wide');
    document.querySelector('#stage').classList.remove('tooling');
    DT.renderAnalysis(); DT.legend(); DT.requestDraw();
  };
  M.comparePack = function () { return lastPack; };
  M.analyzeOceans = function (a, b) { var s = S.cmp.scope, aa = S.cmp.a, bb = S.cmp.b, sm = S.cmp.smooth; S.cmp.a = a; S.cmp.b = b; S.cmp.smooth = false; var R = analyzeOceans(); S.cmp.a = aa; S.cmp.b = bb; S.cmp.smooth = sm; return R; };
  M.findings = findings;
})();
