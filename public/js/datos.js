/* Detectives de la Tierra · datos compartidos por los módulos
   Regiones (océanos, departamentos, zonas, planeta), series anuales y gráficas comparativas.
   Todas las series salen de archivos reales de la app; si algo no existe, se devuelve null. */
(function () {
  var DT = window.DT;
  if (!DT) return;
  var M = DT.M = {};
  var fmt = DT.fmt, sfmt = DT.sfmt, esc = DT.esc;

  /* ---------- departamentos ---------- */
  M.dep = { geo: null, data: null, byId: {}, status: 'cargando' };
  function loadJSON(u) { return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  M.depReady = Promise.all([
    loadJSON('data/departamentos_limites.json').catch(function () { return null; }),
    loadJSON('data/departamentos.json').catch(function () { return loadJSON(DT.apiBase() + '/api/departamentos').catch(function () { return null; }); })
  ]).then(function (r) {
    M.dep.geo = r[0]; M.dep.data = r[1] && r[1].deps ? r[1] : null;
    if (M.dep.geo) M.dep.geo.features.forEach(function (f) { M.dep.byId[f.properties.id] = { id: f.properties.id, name: f.properties.name, f: f }; });
    if (M.dep.data) M.dep.data.deps.forEach(function (d) { if (M.dep.byId[d.id]) { M.dep.byId[d.id].temp = d.temp; M.dep.byId[d.id].celdas = d.celdas; } });
    M.dep.status = M.dep.data ? 'ok' : 'sin-datos';
    document.dispatchEvent(new Event('dt-deps'));
    DT.requestDraw();
  });
  M.depList = function () { return Object.keys(M.dep.byId).map(function (k) { return M.dep.byId[k]; }).sort(function (a, b) { return a.name.localeCompare(b.name, 'es'); }); };
  M.depAt = function (lon, lat) {
    if (!M.dep.geo) return null;
    for (var i = 0; i < M.dep.geo.features.length; i++) if (d3.geoContains(M.dep.geo.features[i], [lon, lat])) return M.dep.geo.features[i].properties.id;
    return null;
  };

  /* ---------- regiones oceánicas (las mismas cuencas que usa el globo) ---------- */
  var OCEANS = ['Océano Atlántico Norte', 'Océano Atlántico Sur', 'Océano Pacífico Norte', 'Océano Pacífico Sur', 'Océano Índico', 'Océano Ártico', 'Océano Austral', 'Mar Caribe', 'Golfo de México', 'Mar Mediterráneo'];
  var oceanCells = null;
  M.oceanCells = function () {
    if (oceanCells || !DT.D) return oceanCells;
    oceanCells = {};
    OCEANS.forEach(function (o) { oceanCells[o] = []; });
    oceanCells['Todos los océanos'] = [];
    DT.cells.forEach(function (k, i) {
      var c = DT.centers[i], n = DT.oceanName(c[0], c[1]), w = Math.cos(c[1] * Math.PI / 180);
      if (oceanCells[n]) oceanCells[n].push([i, k, w]);
      oceanCells['Todos los océanos'].push([i, k, w]);
    });
    return oceanCells;
  };
  M.OCEANS = OCEANS;
  // promedio de la temperatura del mar de una lista de celdas, ponderado por el área (coseno de la latitud)
  M.oceanMean = function (list, y, anom) {
    var s = 0, ws = 0;
    for (var j = 0; j < list.length; j++) {
      var v = anom ? DT.anomAt(y, list[j][1]) : DT.valAt(y, list[j][1]);
      if (isFinite(v)) { s += v * list[j][2]; ws += list[j][2]; }
    }
    return ws ? s / ws : NaN;
  };

  /* ---------- catálogo de regiones ---------- */
  // clave: 'oc:<nombre>' | 'dep:<id>' | 'zona:<id>' | 'zona:caribe:<mar>' | 'planeta'
  M.regions = function () {
    // enfoque nacional: departamentos, zonas de estudio y los dos mares de Colombia
    var out = [];
    if (M.dep.status === 'ok') M.depList().forEach(function (d) { out.push({ key: 'dep:' + d.id, name: d.name, group: 'Departamentos', kind: 'aire' }); });
    DT.ZONES.forEach(function (z) {
      if (z.id === 'caribe') {
        out.push({ key: 'zona:caribe:sanandres', name: 'San Andrés (aire)', group: 'Zonas de estudio', kind: 'aire' });
        out.push({ key: 'zona:caribe:caribe', name: 'Ciénaga Grande (aire)', group: 'Zonas de estudio', kind: 'aire' });
      } else out.push({ key: 'zona:' + z.id, name: z.short, group: 'Zonas de estudio', kind: 'aire' });
    });
    [['Mar Caribe', 'Mar Caribe'], ['Océano Pacífico Norte', 'Océano Pacífico (norte)']].forEach(function (o) { out.push({ key: 'oc:' + o[0], name: o[1], group: 'Mares de Colombia', kind: 'mar' }); });
    return out;
  };
  M.regionName = function (key) { var r = M.regions().filter(function (x) { return x.key === key; })[0]; return r ? r.name : key; };

  /* serie anual de una región: { name, kind, unit, xs, ys, src, measured } o null */
  M.series = function (key) {
    if (key === 'planeta') {
      var g = DT.gistemp || [];
      return { key: key, name: 'Planeta (tierra + mar)', kind: 'global', unit: '°C frente a 1951–1980', anomaly: true, xs: g.map(function (d) { return d[0]; }), ys: g.map(function (d) { return d[1]; }), src: 'NASA GISTEMP v4', measured: true };
    }
    if (key.indexOf('oc:') === 0) {
      var oc = M.oceanCells(); if (!oc) return null;
      var list = oc[key.slice(3)]; if (!list || !list.length) return null;
      var xs = [], ys = [];
      for (var y = DT.Y0; y < DT.Y0 + DT.NY; y++) { xs.push(y); ys.push(M.oceanMean(list, y, false)); }
      return { key: key, name: key.slice(3), kind: 'mar', unit: '°C', xs: xs, ys: ys, src: 'NOAA ERSSTv5 · temperatura superficial del mar, promedio anual por área', measured: true, cells: list.length };
    }
    if (key.indexOf('dep:') === 0) {
      var d = M.dep.byId[key.slice(4)];
      if (!d || !d.temp || !Object.keys(d.temp).length) return null;
      var ks = Object.keys(d.temp).map(Number).sort(function (a, b) { return a - b; });
      return { key: key, name: d.name, kind: 'aire', unit: '°C', xs: ks, ys: ks.map(function (k) { return d.temp[k]; }), src: M.dep.data.fuente, measured: true, celdas: d.celdas, method: M.dep.data.metodo, generado: M.dep.data.generado };
    }
    if (key.indexOf('zona:') === 0) {
      var parts = key.split(':'), id = parts[1], sea = parts[2] || null;
      var se = DT.zoneSeries(id, sea);
      if (!se.xs.length) return null;
      var z = DT.zoneById(id);
      return { key: key, name: id === 'caribe' ? (sea === 'caribe' ? 'Ciénaga Grande' : 'San Andrés') : z.short, kind: 'aire', unit: '°C', xs: se.xs, ys: se.ys, src: se.measured ? 'NASA POWER · temperatura del aire a 2 m (MERRA-2)' : 'Estimado: clima de la zona (WorldClim) + anomalía de NASA GISTEMP', measured: se.measured };
    }
    return null;
  };
  M.valueAt = function (s, y) { var i = s.xs.indexOf(y); return i < 0 ? null : (isFinite(s.ys[i]) ? s.ys[i] : null); };
  M.meanIn = function (s, a, b) { var v = []; s.xs.forEach(function (x, i) { if (x >= a && x <= b && isFinite(s.ys[i])) v.push(s.ys[i]); }); return v.length ? d3.mean(v) : null; };
  M.slice = function (s, a, b) { var xs = [], ys = []; s.xs.forEach(function (x, i) { if (x >= a && x <= b) { xs.push(x); ys.push(s.ys[i]); } }); return { xs: xs, ys: ys }; };
  M.range = function (s) { return [s.xs[0], s.xs[s.xs.length - 1]]; };
  // anomalía frente al promedio 1991–2020 de la propia serie (solo si hay al menos 20 de esos 30 años)
  M.anomaly = function (s, y) {
    if (s.anomaly) return M.valueAt(s, y);
    var v = M.valueAt(s, y); if (v === null) return null;
    var b = []; s.xs.forEach(function (x, i) { if (x >= 1991 && x <= 2020 && isFinite(s.ys[i])) b.push(s.ys[i]); });
    return b.length >= 20 ? v - d3.mean(b) : null;
  };
  M.lastYear = function (s) { for (var i = s.xs.length - 1; i >= 0; i--) if (isFinite(s.ys[i])) return s.xs[i]; return null; };

  /* ---------- gráfica de varias series ---------- */
  M.COLORS = ['#5cc8ff', '#fbbf24', '#f472b6', '#a3e635'];
  M.multiChart = function (list, o) {
    o = o || {};
    if (window.G) return G.line(list.map(function (s, i) { return { name: s.name || 'Serie ' + (i + 1), xs: s.xs, ys: s.ys, color: s.color }; }), { x: o.x, band: o.band, marks: o.marks, aria: o.aria, unit: o.unit, varName: o.varName, title: o.title });
    var w = 360, h = 190, m = { l: 34, r: 8, t: 10, b: 22 };
    var xsAll = [], ysAll = [];
    list.forEach(function (s) { s.xs.forEach(function (x, i) { if (isFinite(s.ys[i])) { xsAll.push(x); ysAll.push(s.ys[i]); } }); });
    if (!xsAll.length) return '';
    var X = d3.scaleLinear().domain(o.x || d3.extent(xsAll)).range([m.l, w - m.r]);
    var ex = d3.extent(ysAll), pad = (ex[1] - ex[0]) * 0.08 || 1;
    var Y = d3.scaleLinear().domain([ex[0] - pad, ex[1] + pad]).nice().range([h - m.b, m.t]);
    var svg = d3.create('svg').attr('viewBox', '0 0 ' + w + ' ' + h).attr('role', 'img').attr('aria-label', o.aria || 'Comparación de series');
    if (o.band) svg.append('rect').attr('x', X(o.band[0])).attr('width', Math.max(0, X(o.band[1]) - X(o.band[0]))).attr('y', m.t).attr('height', h - m.b - m.t).attr('fill', 'rgba(92,200,255,0.08)');
    Y.ticks(4).forEach(function (t) {
      svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', Y(t)).attr('y2', Y(t)).attr('stroke', '#1f3a52');
      svg.append('text').attr('x', m.l - 4).attr('y', Y(t) + 3).attr('text-anchor', 'end').attr('font-size', 9).attr('fill', '#9fb6c8').text(fmt(t, Math.abs(t) < 10 && t % 1 ? 1 : 0));
    });
    X.ticks(6).forEach(function (t) { svg.append('text').attr('x', X(t)).attr('y', h - 7).attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', '#9fb6c8').text(Math.round(t)); });
    var line = d3.line().defined(function (d) { return isFinite(d[1]); }).x(function (d) { return X(d[0]); }).y(function (d) { return Y(d[1]); });
    list.forEach(function (s, k) {
      var col = s.color || M.COLORS[k % M.COLORS.length];
      svg.append('path').attr('d', line(s.xs.map(function (x, i) { return [x, s.ys[i]]; }).filter(function (d) { return d[0] >= X.domain()[0] && d[0] <= X.domain()[1]; }))).attr('fill', 'none').attr('stroke', col).attr('stroke-width', 1.8);
      if (s.res) svg.append('line').attr('x1', X(s.res.x0)).attr('x2', X(s.res.x1)).attr('y1', Y(s.res.a + s.res.b * s.res.x0)).attr('y2', Y(s.res.a + s.res.b * s.res.x1)).attr('stroke', col).attr('stroke-width', 2.6).attr('stroke-dasharray', s.res.p < 0.05 ? null : '5 4').attr('opacity', 0.75);
    });
    (o.marks || []).forEach(function (y) {
      if (y < X.domain()[0] || y > X.domain()[1]) return;
      svg.append('line').attr('x1', X(y)).attr('x2', X(y)).attr('y1', m.t).attr('y2', h - m.b).attr('stroke', '#fff').attr('stroke-width', 1.2).attr('stroke-dasharray', '3 2');
      svg.append('text').attr('x', X(y)).attr('y', m.t + 8).attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', '#fff').text(y);
    });
    return svg.node().outerHTML;
  };
  // barras horizontales con signo (para rankings de cambio)
  M.barChart = function (rows, o) {
    o = o || {};
    var w = 360, rowH = 17, m = { l: 150, r: 46 }, h = rows.length * rowH + 6;
    var mx = d3.max(rows, function (r) { return Math.abs(r[1]); }) || 1;
    var X = d3.scaleLinear().domain([-mx, mx]).range([m.l, w - m.r]);
    var svg = d3.create('svg').attr('viewBox', '0 0 ' + w + ' ' + h).attr('role', 'img').attr('aria-label', o.aria || 'Ranking');
    svg.append('line').attr('x1', X(0)).attr('x2', X(0)).attr('y1', 0).attr('y2', h).attr('stroke', '#56718a');
    rows.forEach(function (r, i) {
      var y = 3 + i * rowH, v = r[1], col = r[2] || (v >= 0 ? '#ff7a59' : '#5cb7ff');
      svg.append('text').attr('x', m.l - 6).attr('y', y + 11).attr('text-anchor', 'end').attr('font-size', 10.5).attr('fill', '#dbe7f1').text(r[0]);
      svg.append('rect').attr('x', Math.min(X(0), X(v))).attr('y', y + 2).attr('width', Math.max(1, Math.abs(X(v) - X(0)))).attr('height', rowH - 5).attr('rx', 2).attr('fill', col).append('title').text(r[0] + ': ' + sfmt(v, 2) + (o.unit || ''));
      svg.append('text').attr('x', w - m.r + 4).attr('y', y + 11).attr('font-size', 10.5).attr('fill', '#dbe7f1').text(sfmt(v, o.dec === undefined ? 2 : o.dec) + (o.unit || ''));
    });
    return svg.node().outerHTML;
  };
  M.collapseYT = function () { var t = document.querySelector('#ytable'); if (t && !t.classList.contains('collapsed')) document.querySelector('#ytToggle').click(); };
  M.card = function (k, v, sub, col) {
    return '<div class="mcard"><div class="k">' + esc(k) + '</div><div class="v"' + (col ? ' style="color:' + col + '"' : '') + '>' + v + '</div>' + (sub ? '<div class="s">' + sub + '</div>' : '') + '</div>';
  };
  M.sigIcon = function (res) {
    if (!res) return '<span class="sig ns" title="Pocos datos">sin datos suficientes</span>';
    var sig = res.p < 0.05 && res.pmk < 0.05;
    return sig ? '<span class="sig ok" title="Regresión y Mann-Kendall con p < 0,05">✓ significativa</span>' : '<span class="sig ns" title="Al menos una prueba con p ≥ 0,05">no significativa</span>';
  };
})();
