/* Detectives de la Tierra · Datos sobre el mapa con calles
   Al acercarse mucho, el globo se cambia por un mapa satelital con calles (Leaflet).
   Este módulo pinta encima los mismos datos de los botones MAR, AIRE, MÁS y COMPARAR:
   - AIRE y COMPARAR (entre años): cada departamento con su color, nombre y valor al pasar el cursor; tocar lo abre.
   - MAR, anomalía y tendencia: las celdas de 4° del mar con su color.
   Los nombres de ciudades y calles quedan por encima de los colores para poder leerlos. */
(function () {
  var DT = window.DT, M = DT && DT.M;
  if (!M) return;
  var S = DT.S, SAT = DT.SAT, fmt = DT.fmt, sfmt = DT.sfmt, esc = DT.esc;
  var pane = null, rnd = null, depLayer = null, cellLayer = null, lastKey = '', lastMap = null;
  var OPACITY = 0.5;

  function ensure() {
    if (lastMap === SAT.map) return;
    lastMap = SAT.map; depLayer = cellLayer = null; lastKey = '';
    // capa propia entre la imagen satelital (200) y los nombres/calles (400)
    pane = SAT.map.createPane('datos'); pane.style.zIndex = 350;
    rnd = L.canvas({ pane: 'datos', padding: 0.3 });
  }
  function unitFor(layer) { return layer === 'trend' ? ' °C por década' : ' °C'; }
  function cellText(i, layer) {
    var v = DT.cellValue(i, layer);
    if (!isFinite(v)) return 'Sin datos';
    var name = { sst: 'Temperatura del mar', anom: 'Diferencia con lo normal', trend: 'Cambio cada 10 años', cmp: 'Cambio entre los dos años' }[layer] || 'Valor';
    return '<b>' + name + '</b><br>' + (layer === 'sst' ? fmt(v, 1) : sfmt(v, 2)) + unitFor(layer) + (layer === 'trend' || layer === 'cmp' ? '' : ' · ' + DT.mapYear());
  }
  function depMode() {
    var diff = M.colDiff ? M.colDiff() : null;
    if (diff) return { kind: 'diff', diff: diff };
    if (S.layer === 'air' && M.dep.status === 'ok') return { kind: 'air' };
    return { kind: 'outline' };
  }
  function depStyle(mode) {
    return function (f) {
      var id = f.properties.id, col = null;
      if (mode.kind === 'diff') { var r = mode.diff.byId[id]; col = r ? r.col : null; }
      else if (mode.kind === 'air') { var v = M.depValue(id, S.year); col = v === null ? null : DT.scales.air(v); }
      var sel = S.dep === id;
      return { renderer: rnd, color: sel ? '#fbbf24' : 'rgba(255,255,255,0.75)', weight: sel ? 3.5 : 1.2, fillColor: col || '#000', fillOpacity: col ? OPACITY : 0, opacity: 1 };
    };
  }
  function depTip(mode) {
    return function (layer) {
      var id = layer.feature.properties.id, d = M.dep.byId[id], t = '<b>' + esc(d.name) + '</b>';
      if (mode.kind === 'diff') { var r = mode.diff.byId[id]; if (r) t += '<br>' + (r.d >= 0 ? 'Se calentó ' : 'Se enfrió ') + sfmt(r.d, 2) + ' °C (' + r.a + ' → ' + r.b + ')'; }
      else { var v = M.depValue(id, S.year); if (v !== null) t += '<br>🌡 Aire ' + fmt(v, 1) + ' °C · ' + M.depYear(S.year); }
      return t + '<br><small>Toca para ver más</small>';
    };
  }
  function build() {
    var mode = depMode(), cellsOn = mode.kind === 'outline' && ['sst', 'anom', 'trend', 'cmp'].indexOf(S.layer) >= 0;
    var key = [S.layer, S.year, S.dep, mode.kind, mode.diff ? mode.diff.key : '', cellsOn, DT.colors.length, S.period.join('-'), S.onlySig].join('|');
    if (key === lastKey) return;
    lastKey = key;
    if (depLayer) { SAT.map.removeLayer(depLayer); depLayer = null; }
    if (cellLayer) { SAT.map.removeLayer(cellLayer); cellLayer = null; }
    // celdas del mar
    if (cellsOn && DT.D) {
      var cols = DT.colors, cen = DT.centers, list = [], layer = S.layer;
      for (var i = 0; i < cen.length; i++) {
        var c = cols[i]; if (!c || c === '#26323d' || c === '#3a4652') continue;
        var lon = ((cen[i][0] + 540) % 360) - 180, lat = cen[i][1];
        if (lon < -125 || lon > -20 || lat < -45 || lat > 45) continue;   // solo alrededor de América
        var r = L.rectangle([[lat - 2, lon - 2], [lat + 2, lon + 2]], { renderer: rnd, stroke: false, fillColor: c, fillOpacity: OPACITY + 0.1 });
        (function (ii) { r.bindTooltip(function () { return cellText(ii, layer); }, { sticky: true }); })(i);
        list.push(r);
      }
      cellLayer = L.layerGroup(list).addTo(SAT.map);
    }
    // departamentos (siempre se ven sus bordes)
    if (M.dep.geo) {
      depLayer = L.geoJSON(M.dep.geo, {
        pane: 'datos', style: depStyle(mode),
        onEachFeature: function (f, l) {
          l.bindTooltip(depTip(mode), { sticky: true, direction: 'top', offset: [0, -8] });
          l.on('mouseover', function () { if (S.dep !== f.properties.id) l.setStyle({ weight: 2.6, color: '#ffffff' }); });
          l.on('mouseout', function () { depLayer && depLayer.resetStyle(l); });
          l.on('click', function () { M.selectDep(f.properties.id); });
        }
      }).addTo(SAT.map);
    }
  }
  function tick() {
    if (!S.flat || !SAT.map || SAT.mode !== 'leaflet' || !window.L) return;
    ensure(); build();
  }
  setInterval(tick, 250);
  M.flatRefresh = function () { lastKey = ''; tick(); };
})();
