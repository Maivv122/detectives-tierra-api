/* Detectives de la Tierra · Explorador de Colombia por departamentos (+ capa «Temperatura del aire»)
   Datos: NASA POWER (T2M, MERRA-2) promediados por departamento con «npm run departamentos».
   Si el archivo aún no existe, se muestran los límites y un aviso, nunca valores inventados. */
(function () {
  var DT = window.DT, M = DT && DT.M;
  if (!M) return;
  var S = DT.S, fmt = DT.fmt, sfmt = DT.sfmt, esc = DT.esc, clamp = DT.clamp;
  var $ = function (s) { return document.querySelector(s); };
  S.dep = null; S.depOpen = false;
  var QUICK = ['ant', 'cun', 'dc', 'vac', 'lag', 'atl', 'bol', 'san', 'met', 'ama'];
  var live = {};

  /* ---------- capa: temperatura del aire ---------- */
  DT.LAYERS.air = { name: 'Temperatura del aire', title: 'Temperatura del aire a 2 m', desc: 'Aire, no mar: cada variable tiene su propia escala y fuente. En Colombia, promedio anual por departamento; en el mundo, la temperatura de ahora en ciudades.', unit: '°C', src: 'Colombia: NASA POWER (MERRA-2), promedio anual desde 1981. Mundo: temperatura actual (Open-Meteo), solo con el servidor de la app.', range: [1981, 2026] };
  DT.LINKS.air = [['Fuente: NASA POWER', 'https://power.larc.nasa.gov/'], ['Ciudades ahora: Open-Meteo', 'https://open-meteo.com/']];
  DT.scales.air = d3.scaleSequential(d3.interpolateTurbo).domain([-10, 45]);
  DT.HOOKS.cell.air = function () { return NaN; };   // el mar no se colorea en esta capa
  M.depYear = function (y) {
    if (M.dep.status !== 'ok') return null;
    var ys = M.dep.data.years; return clamp(y, ys[0], ys[ys.length - 1]);
  };
  M.depValue = function (id, y) {
    var d = M.dep.byId[id]; if (!d || !d.temp) return null;
    var v = d.temp[M.depYear(y)]; return v === undefined ? null : v;
  };

  /* ---------- dibujo en el globo ---------- */
  var hoverDep = null, pulseT0 = 0;
  var tip = document.createElement('div'); tip.className = 'deptip'; tip.hidden = true;
  document.addEventListener('DOMContentLoaded', function () {});
  (document.querySelector('#stage') || document.body).appendChild(tip);
  DT.HOOKS.draw.push(function (ctx, path) {
    if (S.focus !== 'colombia' || !M.dep.geo || DT.colFar()) return;
    var cmpCol = S.tool === 'cmp' && S.cmp.tab === 'tiempo' && S.cmp.scope === 'colombia';
    var paint = S.layer === 'air' && M.dep.status === 'ok' && !cmpCol, sc = DT.scales.air;
    M.dep.geo.features.forEach(function (f) {
      var id = f.properties.id;
      ctx.beginPath(); path(f);
      if (paint) { var v = M.depValue(id, S.year); if (v !== null) { ctx.fillStyle = sc(v); ctx.globalAlpha = S.dep && S.dep !== id ? 0.55 : 0.8; ctx.fill(); ctx.globalAlpha = 1; } }
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 0.7; ctx.stroke();
    });
    // departamento bajo el cursor: borde blanco
    if (hoverDep && hoverDep !== S.dep && M.dep.byId[hoverDep]) { ctx.beginPath(); path(M.dep.byId[hoverDep].f); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke(); }
    // departamento seleccionado: brillo dorado + un pulso suave al llegar
    if (S.dep && M.dep.byId[S.dep]) {
      var f2 = M.dep.byId[S.dep].f;
      ctx.beginPath(); path(f2);
      ctx.fillStyle = 'rgba(251,191,36,0.14)'; ctx.fill();
      ctx.save(); ctx.shadowColor = 'rgba(251,191,36,0.95)'; ctx.shadowBlur = 14; ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
      var tp = (performance.now() - pulseT0) / 1400;
      if (tp < 1) {
        ctx.beginPath(); path(f2); ctx.strokeStyle = 'rgba(251,191,36,' + (1 - tp).toFixed(2) + ')'; ctx.lineWidth = 3 + tp * 14; ctx.stroke();
        requestAnimationFrame(DT.requestDraw);
      }
      // nombre del seleccionado: una etiqueta discreta
      var c = d3.geoCentroid(f2);
      if (DT.visible(c)) {
        var p = DT.project(c), v2 = M.depValue(S.dep, S.year), t = M.dep.byId[S.dep].name + (S.layer === 'air' && v2 !== null ? ' · ' + fmt(v2, 1) + ' °C' : '');
        ctx.font = '700 13px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        var w = ctx.measureText(t).width + 16;
        ctx.fillStyle = 'rgba(5,10,20,0.85)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(p[0] - w / 2, p[1] - 12, w, 24, 12); else ctx.rect(p[0] - w / 2, p[1] - 12, w, 24); ctx.fill();
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillText(t, p[0], p[1] + 0.5);
      }
    }
    // nombres solo con bastante acercamiento y solo si caben dentro del departamento (nunca amontonados)
    if (DT.zoomK >= 6.8 && (paint || cmpCol)) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 11px Inter, system-ui, sans-serif';
      var placed = [];
      M.dep.geo.features.forEach(function (f) {
        if (f.properties.id === S.dep) return;
        var c = d3.geoCentroid(f); if (!DT.visible(c)) return;
        var b = path.bounds(f), bw = b[1][0] - b[0][0], bh = b[1][1] - b[0][1], t = f.properties.name, tw = ctx.measureText(t).width;
        if (tw + 8 > bw || bh < 22) return;
        var pp = DT.project(c), box = [pp[0] - tw / 2 - 4, pp[1] - 8, pp[0] + tw / 2 + 4, pp[1] + 8];
        if (placed.some(function (q) { return !(box[2] < q[0] || box[0] > q[2] || box[3] < q[1] || box[1] > q[3]); })) return;
        placed.push(box);
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(t, pp[0], pp[1]); ctx.fillStyle = 'rgba(248,250,252,0.9)'; ctx.fillText(t, pp[0], pp[1]);
      });
    }
  });
  function showTip(pt, html) {
    var st = document.querySelector('#globe').getBoundingClientRect(), sg = (document.querySelector('#stage') || document.body).getBoundingClientRect();
    tip.innerHTML = html; tip.hidden = false;
    tip.style.left = (st.left - sg.left + pt[0] + 14) + 'px'; tip.style.top = (st.top - sg.top + pt[1] + 14) + 'px';
  }
  function hideTip() { tip.hidden = true; if (hoverDep) { hoverDep = null; DT.requestDraw(); } }
  M.hideDepTip = hideTip;
  document.querySelector('#globe').addEventListener('mouseleave', hideTip);
  DT.HOOKS.hover.push(function (pt, g) {
    if (S.focus !== 'colombia' || !g || DT.colFar() || DT.markerAt(pt)) { hideTip(); return false; }
    var id = M.depAt(g[0], g[1]); if (!id) { hideTip(); return false; }
    if (hoverDep !== id) { hoverDep = id; DT.requestDraw(); }
    var v = M.depValue(id, S.year), d = M.dep.byId[id];
    showTip(pt, '<b>' + esc(d.name) + '</b>' + (v !== null ? '<span>🌡 ' + fmt(v, 1) + ' °C · ' + M.depYear(S.year) + '</span>' : '') + '<small>Toca para ver más</small>');
    DT.showHover(S.layer === 'air' ? v : null, '');
    $('#globe').style.cursor = 'pointer';
    return true;
  });
  DT.HOOKS.pick.push(function (pt, g) {
    if (S.focus !== 'colombia' || !g || DT.colFar() || DT.markerAt(pt)) return false;
    var id = M.depAt(g[0], g[1]); if (!id) return false;
    hideTip(); selectDep(id); return true;   // igual que desde el buscador: vuela y resalta
  });

  /* ---------- panel del departamento ---------- */
  function selectDep(id, fly) {
    S.dep = id; S.zone = null; S.sel = null; S.depOpen = false; pulseT0 = performance.now() + 700;
    if (M.onDepSelected) M.onDepSelected(id);
    if (S.tool === 'cmp' && M.closeCompare) M.closeCompare();
    M.collapseYT();
    renderQuick();
    if (fly !== false) {
      // zoom para que el departamento ocupe cerca de la mitad de la pantalla (sin pasar al mapa de calles)
      var f = M.dep.byId[id].f, c = d3.geoCentroid(f), b = d3.geoBounds(f), span = Math.max(b[1][0] - b[0][0], (b[1][1] - b[0][1]) * 1.15, 0.4) * Math.PI / 180;
      var zk = clamp(0.5 / (0.41 * span), 4.2, 7.6);
      if (window.innerWidth > 900) c = [c[0] + (0.17 * Math.min(DT.W, DT.H)) / (0.41 * Math.min(DT.W, DT.H) * zk) * 180 / Math.PI, c[1]];   // deja espacio para el panel derecho
      DT.flyTo(c, false, zk);
    }
    DT.renderAnalysis(); DT.requestDraw();
    if (DT.live().status === 'ok' && !live[id]) {
      var c2 = d3.geoCentroid(M.dep.byId[id].f);
      live[id] = { status: 'cargando' };
      fetch(DT.apiBase() + '/api/temperatura?lat=' + c2[1].toFixed(3) + '&lon=' + c2[0].toFixed(3)).then(function (r) { return r.json(); })
        .then(function (p) { live[id] = { status: 'ok', t: p.temperatura_c, desc: p.descripcion, fuente: p.fuente }; if (S.dep === id) DT.renderAnalysis(); })
        .catch(function () { live[id] = { status: 'off' }; });
    }
  }
  M.selectDep = selectDep;
  function rankOf(id, key, y) {
    var rows = M.depList().map(function (d) { var s = M.series('dep:' + d.id); if (!s) return null; var sl = M.slice(s, 1981, y), r = DT.analyze(sl.xs, sl.ys); return r ? [d.id, r.b] : null; }).filter(Boolean).sort(function (a, b) { return b[1] - a[1]; });
    for (var i = 0; i < rows.length; i++) if (rows[i][0] === id) return [i + 1, rows.length];
    return null;
  }
  function renderDep() {
    var d = M.dep.byId[S.dep];
    $('#aTitle').textContent = d.name;
    $('#aSub').textContent = 'Departamento de Colombia · temperatura del aire';
    var box = $('#analysis'); box.hidden = false;
    var s = M.series('dep:' + d.id), html = '';
    var lv = live[d.id];
    if (!s) {
      html = '<div class="note">Aún no están los datos de temperatura del aire por departamento. Se generan con <b>npm run departamentos</b> en la carpeta del proyecto (NASA POWER) y aparecen aquí solos. No se muestran valores inventados.</div>';
    } else {
      var y = M.depYear(S.year), last = M.lastYear(s), v = M.valueAt(s, y), an = M.anomaly(s, y), cat = an !== null ? DT.catOfAnom(an) : null;
      var full = DT.analyze(s.xs, s.ys), b80 = M.meanIn(s, 1981, 1990), rec = M.meanIn(s, last - 9, last), rk = rankOf(d.id, 'trend', last);
      var note = S.year > last ? '<div class="src">' + S.year + ' aún no tiene promedio anual; se muestra ' + last + ', el último año completo.</div>' : '';
      var sigUp = full && full.p < 0.05 && full.pmk < 0.05, dd = rec !== null && b80 !== null ? rec - b80 : null;
      html += '<div class="plain"><span class="pe">' + (sigUp ? (full.b > 0 ? '📈' : '📉') : '➖') + '</span><div><b>' + (sigUp ? (full.b > 0 ? 'Se está calentando' : 'Se está enfriando') : 'Sin un cambio claro') + '</b><span>' + (dd !== null ? 'Hoy el aire está ' + sfmt(dd, 1) + ' °C ' + (dd >= 0 ? 'más caliente' : 'más frío') + ' que en los años 80' : '') + '</span></div></div>' +
        '<div class="mcards c4">' +
        M.card('🌡 Temperatura ' + y, v === null ? '—' : fmt(v, 1) + ' °C', 'promedio del año', v === null ? null : DT.scales.air(v)) +
        M.card('Frente a lo normal', an === null ? '—' : sfmt(an, 1) + ' °C', cat ? DT.badge(cat) : '') +
        M.card('Ritmo', full ? sfmt(full.b * 10, 2) + ' °C' : '—', 'cada 10 años', full && full.b > 0 ? '#ff7a59' : '#5cb7ff') +
        M.card('Desde los años 80', dd !== null ? sfmt(dd, 1) + ' °C' : '—', 'más ' + (dd !== null && dd < 0 ? 'frío' : 'caliente')) + '</div>' + note +
        (lv && lv.status === 'ok' && lv.t !== null && lv.t !== undefined ? '<div class="nowrow">● Ahora mismo en el centro del departamento: <b>' + fmt(lv.t, 1) + ' °C</b>' + (lv.desc ? ' · ' + esc(lv.desc) : '') + '</div>' : '') +
        '<div class="row" style="gap:6px"><button class="btn" id="dDetail" aria-expanded="' + S.depOpen + '">' + (S.depOpen ? '▾ Ocultar gráfica' : '📊 Ver gráfica') + '</button><button class="btn" id="dCmp">⇄ Comparar</button></div>';
      if (S.depOpen) {
        html += '<div class="chart">' + DT.chartSVG(s.xs, s.ys, full, { marker: y, varName: 'Temperatura del aire a 2 m', title: 'Temperatura media anual en ' + d.name, name: d.name, aria: 'Temperatura del aire en ' + d.name }) + '</div>' +
          DT.verdictHTML(full, { per: s.xs[0] + '–' + last, dec: 2, unit: '°C', subject: 'En ' + d.name + ' la temperatura del aire' });
        var warmest = s.xs.reduce(function (bb, x, i) { return bb === null || s.ys[i] > bb[1] ? [x, s.ys[i]] : bb; }, null);
        html += '<div class="mcards">' + M.card('Año más cálido', String(warmest[0]), fmt(warmest[1], 1) + ' °C') + (rk ? M.card('Ranking de calentamiento', rk[0] + '.º de ' + rk[1], 'departamentos, desde 1981') : '') + M.card('Celdas promediadas', String(s.celdas || 1), s.celdas ? 'de ~55 × 70 km' : 'departamento menor que una celda') + '</div>' +
          '<div class="src"><b>Fuente:</b> ' + esc(s.src) + '. <b>Método:</b> ' + esc(s.method || '') + ' <b>Datos generados:</b> ' + esc((s.generado || '').slice(0, 10)) + '. Límites: Natural Earth.</div>';
      }
    }
    $('#aBody').innerHTML = html;
    var q = function (x) { return $('#aBody').querySelector(x); };
    if (q('#dDetail')) q('#dDetail').addEventListener('click', function () { S.depOpen = !S.depOpen; renderDep(); });
    if (q('#dCmp')) q('#dCmp').addEventListener('click', function () { var other = d.id === 'lag' ? 'ant' : 'lag'; M.openCompare({ tab: 'regiones', regs: ['dep:' + d.id, 'dep:' + other] }); });
  }
  DT.HOOKS.analysis.push(function () {
    if (S.zone) S.dep = null;
    if (!S.dep || S.focus !== 'colombia' || !M.dep.byId[S.dep]) return false;
    renderDep(); return true;
  });
  DT.HOOKS.close.push(function () { if (!S.dep || S.tool === 'cmp') return false; S.dep = null; if (M.onDepSelected) M.onDepSelected(null); $('#analysis').hidden = true; renderQuick(); DT.requestDraw(); return true; });
  DT.HOOKS.focus.push(function (f) { if (f !== 'colombia') S.dep = null; });
  DT.HOOKS.refresh.push(function () {
    if (S.layer !== 'air') return;
    DT.legend();
    var y = M.depYear(S.year);
    $('#layerDate').textContent = S.focus === 'colombia' ? (M.dep.status === 'ok' ? 'Colombia · promedio anual de ' + y + (S.year > y ? ' (último año completo)' : '') + ' por departamento' : 'Colombia · faltan los datos por departamento') : 'Mundo · temperatura del aire ahora en ciudades';
  });

  /* ---------- accesos rápidos en el panel izquierdo ---------- */
  function renderQuick() {
    var box = $('#depBox'); if (!box || !M.dep.geo) return;
    box.innerHTML = '<div class="lbl">Departamentos</div><div class="dchips">' + QUICK.filter(function (id) { return M.dep.byId[id]; }).map(function (id) {
      return '<button data-dep="' + id + '" aria-pressed="' + (S.dep === id) + '">' + esc(M.dep.byId[id].name.replace(' D.C.', '')) + '</button>';
    }).join('') + '</div><select id="depAll" aria-label="Todos los departamentos"><option value="">Todos los departamentos…</option>' +
      M.depList().map(function (d) { return '<option value="' + d.id + '"' + (S.dep === d.id ? ' selected' : '') + '>' + esc(d.name) + '</option>'; }).join('') + '</select>' +
      (M.dep.status !== 'ok' ? '<div class="src">Los valores por departamento aparecen al generar <b>departamentos.json</b> (npm run departamentos).</div>' : '<div class="src">Toca un departamento en el mapa o elige uno aquí.</div>');
    box.querySelectorAll('[data-dep]').forEach(function (b) { b.addEventListener('click', function () { selectDep(b.getAttribute('data-dep')); }); });
    box.querySelector('#depAll').addEventListener('change', function (e) { if (e.target.value) selectDep(e.target.value); });
  }
  document.addEventListener('dt-deps', renderQuick);
  DT.HOOKS.focus.push(function () { setTimeout(renderQuick, 0); });
  M.renderDepQuick = renderQuick;

  /* ---------- leyenda de la capa de aire ---------- */
  DT.HOOKS.legend.air = function () {
    var sc = DT.scales.air, dom = sc.domain(), cv = $('#legBar'), c2 = cv.getContext('2d');
    for (var x = 0; x < cv.width; x++) { c2.fillStyle = sc(dom[0] + (dom[1] - dom[0]) * x / (cv.width - 1)); c2.fillRect(x, 0, 1, cv.height); }
    $('#legTicks').innerHTML = '<span>' + fmt(dom[0], 0) + '</span><span>' + fmt((dom[0] + dom[1]) / 2, 0) + '</span><span>' + fmt(dom[1], 0) + '</span>';
    $('#legUnit').textContent = S.focus === 'colombia' ? '°C · aire a 2 m, promedio ' + (M.depYear(S.year) || '') + ' (NASA POWER)' : '°C · aire ahora en ciudades (Open-Meteo)';
  };
})();
