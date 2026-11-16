/* Detectives de la Tierra · Exploración global
   · Escalas dinámicas (ajustadas a los datos visibles) o fijas, para no recortar valores extremos.
   · Temperatura del aire AHORA en ciudades del mundo (servidor de la app → Open-Meteo).
   · Clic en cualquier punto de tierra: temperatura del aire actual en ese punto.
   · Accesos rápidos a continentes y océanos. */
(function () {
  var DT = window.DT, M = DT && DT.M;
  if (!M) return;
  var S = DT.S, fmt = DT.fmt, sfmt = DT.sfmt, esc = DT.esc, clamp = DT.clamp;
  var $ = function (s) { return document.querySelector(s); };
  S.dynScale = false; S.pt = null;
  var FIXED = { sst: [-2, 32], air: [-10, 45] };
  DT.scales.sst.domain(FIXED.sst);

  /* ---------- escalas ---------- */
  function applyScales() {
    var before = String(DT.scales.sst.domain()) + '|' + String(DT.scales.air.domain());
    applyScales0();
    return before !== String(DT.scales.sst.domain()) + '|' + String(DT.scales.air.domain());
  }
  function applyScales0() {
    if (S.layer === 'sst') {
      var dom = FIXED.sst;
      if (S.dynScale && DT.D) {
        var v = []; DT.cells.forEach(function (k, i) { var x = DT.cellValue(i, 'sst'); if (isFinite(x)) v.push(x); });
        v.sort(d3.ascending);
        dom = [Math.floor(d3.quantile(v, 0.01)), Math.ceil(d3.max(v))];
      }
      DT.scales.sst.domain(dom);
    }
    if (S.layer === 'air') {
      var d2 = FIXED.air;
      if (S.dynScale) {
        var vals = [];
        if (S.focus === 'colombia' && M.dep.status === 'ok') M.depList().forEach(function (d) { var x = M.depValue(d.id, S.year); if (x !== null) vals.push(x); });
        if (S.focus !== 'colombia' && CITIES.data) CITIES.data.forEach(function (c) { if (c.t !== null) vals.push(c.t); });
        if (vals.length > 1) d2 = [Math.floor(d3.min(vals)), Math.ceil(d3.max(vals))];
      }
      DT.scales.air.domain(d2);
    }
  }
  // refresh() colorea antes de llamar a los ganchos: si la escala cambió, se vuelve a colorear
  DT.HOOKS.refresh.unshift(function () { if (applyScales() && S.layer === 'sst') DT.recolor(); if (S.layer === 'sst' || S.layer === 'air') DT.legend(); });

  /* ---------- ciudades del mundo: aire ahora ---------- */
  var CITIES = { data: null, status: 'idle', at: 0 };
  function loadCities() {
    if (CITIES.status === 'cargando' || (CITIES.status === 'ok' && Date.now() - CITIES.at < 30 * 60000)) return;
    CITIES.status = 'cargando';
    fetch(DT.apiBase() + '/api/ciudades').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { CITIES.data = j.ciudades; CITIES.fuente = j.fuente; CITIES.hora = j.actualizado; CITIES.status = 'ok'; CITIES.at = Date.now(); DT.refresh(); })
      .catch(function () { CITIES.status = 'off'; renderScaleBox(); });
  }
  M.cities = CITIES;
  DT.HOOKS.refresh.push(function () { if (S.layer === 'air' && S.focus !== 'colombia') loadCities(); renderScaleBox(); });
  DT.HOOKS.draw.push(function (ctx) {
    if (S.layer !== 'air' || S.focus === 'colombia' || !CITIES.data) return;
    var sc = DT.scales.air, showLabel = DT.zoomK >= 1.5;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    CITIES.data.forEach(function (c) {
      if (c.t === null || !DT.visible([c.lon, c.lat])) return;
      var p = DT.project([c.lon, c.lat]);
      ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, 2 * Math.PI); ctx.fillStyle = sc(c.t); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#000'; ctx.stroke();
      var t = (showLabel ? c.n + ' ' : '') + fmt(c.t, 0) + '°';
      ctx.font = '700 11.5px Inter, system-ui, sans-serif';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(t, p[0] + 9, p[1]); ctx.fillStyle = '#fff'; ctx.fillText(t, p[0] + 9, p[1]);
    });
  });
  DT.HOOKS.hover.push(function (pt, g) {
    if (S.layer !== 'air' || S.focus === 'colombia') return false;
    if (!CITIES.data) { if (g) DT.showHover(null, T('Toca para consultar la temperatura del aire ahora · ') + DT.coordText(g[0], g[1])); return !!g; }
    for (var i = 0; i < CITIES.data.length; i++) {
      var c = CITIES.data[i]; if (c.t === null || !DT.visible([c.lon, c.lat])) continue;
      var p = DT.project([c.lon, c.lat]);
      if (Math.hypot(p[0] - pt[0], p[1] - pt[1]) < 9) { DT.showHover(c.t, c.n + ': ' + fmt(c.t, 1) + T(' °C ahora (aire a 2 m)')); return true; }
    }
    if (g) { DT.showHover(null, T('Toca para consultar la temperatura del aire ahora · ') + DT.coordText(g[0], g[1])); return true; }
    return false;
  });

  /* ---------- clic en tierra firme (fuera del modo Colombia): aire ahora en ese punto ---------- */
  DT.HOOKS.pick.push(function (pt, g) {
    if (!g || S.focus === 'colombia' || S.tool === 'cmp') return false;
    if (DT.cellAt(g[0], g[1]) !== null && S.layer !== 'air') return false;   // el mar lo maneja el panel de siempre
    S.pt = { lon: g[0], lat: g[1], status: 'cargando' }; S.sel = null;
    DT.renderAnalysis();
    fetch(DT.apiBase() + '/api/temperatura?lat=' + g[1].toFixed(3) + '&lon=' + g[0].toFixed(3)).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (p) { if (S.pt && S.pt.lon === g[0]) { S.pt.status = 'ok'; S.pt.t = p.temperatura_c; S.pt.desc = p.descripcion; S.pt.fuente = p.fuente; S.pt.hum = p.humedad_pct; DT.renderAnalysis(); } })
      .catch(function () { if (S.pt && S.pt.lon === g[0]) { S.pt.status = 'off'; DT.renderAnalysis(); } });
    return true;
  });
  DT.HOOKS.analysis.push(function () {
    if (!S.pt || S.zone || S.dep || S.sel !== null) { S.pt = null; return false; }
    var p = S.pt, inCol = M.depAt(p.lon, p.lat);
    $('#aTitle').textContent = T('Punto seleccionado');
    $('#aSub').textContent = DT.coordText(p.lon, p.lat) + T(' · temperatura del aire');
    var body = p.status === 'cargando' ? T('<div class="src">Consultando la temperatura actual…</div>')
      : p.status === 'ok' && p.t !== null && p.t !== undefined
        ? '<div class="mcards">' + M.card(T('Aire ahora'), fmt(p.t, 1) + ' °C', p.desc ? esc(p.desc) : '', DT.scales.air(p.t)) + (p.hum !== undefined && p.hum !== null ? M.card(T('Humedad'), fmt(p.hum, 0) + ' %', '') : '') + T('</div><div class="src">Fuente: ') + esc(p.fuente || T('servidor de la app')) + '. Es la temperatura de este momento, no un promedio anual.</div>'
        : T('<div class="note">La temperatura del aire en tiempo real necesita el servidor de la app (localhost o Render). Aquí no hay conexión con él, así que no se muestra ningún valor.</div>');
    if (inCol) body += T('<button class="btn" id="ptDep">Ver el departamento: ') + esc(M.dep.byId[inCol].name) + '</button>';
    $('#aBody').innerHTML = body;
    $('#analysis').hidden = false;
    var b = $('#ptDep'); if (b) b.addEventListener('click', function () { S.pt = null; DT.setFocus('colombia'); M.selectDep(inCol); });
    return true;
  });
  DT.HOOKS.close.push(function () { if (!S.pt) return false; S.pt = null; $('#analysis').hidden = true; return true; });

  /* ---------- accesos rápidos ---------- */
  var PLACES = [
    [T('Continentes'), [[T('América del Sur'), -60, -15, 2.2], [T('América del Norte'), -100, 45, 2], [T('Europa'), 15, 50, 2.6], [T('África'), 20, 3, 2], ['Asia', 90, 40, 1.8], [T('Oceanía'), 140, -25, 2.2], [T('Antártida'), 0, -80, 2]]],
    [T('Océanos y mares'), [['Océano Pacífico', -150, 0, 1.4], ['Océano Atlántico', -30, 15, 1.6], ['Océano Índico', 80, -20, 1.8], ['Océano Ártico', 0, 85, 1.8], ['Mar Caribe', -75, 15, 3.2], ['Mar Mediterráneo', 18, 37, 3.4]]],
    [T('Lugares'), [['Colombia', -73.5, 4.5, 'col'], [T('España'), -3.7, 40.2, 4], [T('Gran Barrera de Coral'), 147, -18, 4], [T('Pacífico ecuatorial (El Niño)'), -120, 0, 2.2]]]
  ];
  function renderScaleBox() {
    var box = $('#scaleBox'); if (!box) return;
    var showScale = S.layer === 'sst' || S.layer === 'air';
    box.innerHTML = showScale ? '<label class="chkl"><input type="checkbox" id="dynScale"' + (S.dynScale ? ' checked' : '') + T('> Ajustar los colores a los valores que se ven</label>') : '';
    var ds = box.querySelector('#dynScale');
    if (ds) ds.addEventListener('change', function (e) { S.dynScale = e.target.checked; DT.refresh(); });
  }
  document.addEventListener('dt-deps', renderScaleBox);
  DT.HOOKS.focus.push(function () { setTimeout(renderScaleBox, 0); });
  setTimeout(renderScaleBox, 0);
})();
