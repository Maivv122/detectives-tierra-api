/* Detectives de la Tierra · Gráficas interactivas
   G.line(series, opciones) devuelve el HTML de una gráfica con:
   título, variable y unidad, ejes con nombre, periodo, leyenda (toca para ocultar/mostrar una serie),
   valores clave, tooltip con el valor exacto al pasar el cursor, botones de periodo,
   zoom arrastrando sobre la gráfica y cambio entre líneas y barras. */
(function () {
  var G = window.G = {}, REG = {}, N = 0;
  var COLORS = ['#5cc8ff', '#fbbf24', '#f472b6', '#a3e635'];
  G.COLORS = COLORS;
  var W = 360, H = 210, MG = { l: 44, r: 12, t: 14, b: 34 };

  function nf(v, d) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    var t = v.toFixed(d).replace('-', '−'); return window.LANG === 'en' ? t : t.replace('.', ',');
  }
  function sf(v, d) { return (v > 0 ? '+' : '') + nf(v, d); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pts(s, dom) { var r = []; s.xs.forEach(function (x, i) { if (x >= dom[0] && x <= dom[1] && isFinite(s.ys[i]) && s.ys[i] !== null) r.push([x, s.ys[i]]); }); return r; }
  function decFor(span) { return span >= 20 ? 0 : span >= 2 ? 1 : span >= 0.2 ? 2 : 3; }
  function trend(p) {
    if (p.length < 6 || !window.DT || !DT.analyze) return null;
    return DT.analyze(p.map(function (d) { return d[0]; }), p.map(function (d) { return d[1]; }));
  }

  G.line = function (series, o) {
    o = o || {};
    series = series.filter(function (s) { return s && s.xs && s.xs.length; });
    if (!series.length) return T('<p class="note">No hay datos para dibujar.</p>');
    var all = []; series.forEach(function (s) { s.xs.forEach(function (x, i) { if (isFinite(s.ys[i]) && s.ys[i] !== null) all.push(x); }); });
    if (!all.length) return T('<p class="note">No hay datos para dibujar.</p>');
    var full = d3.extent(all), id = 'g' + (++N);
    var st = REG[id] = {
      id: id, series: series.map(function (s, i) { return { name: s.name || 'Serie ' + (i + 1), xs: s.xs, ys: s.ys, color: s.color || COLORS[i % COLORS.length] }; }),
      frac: all.some(function (x) { return x % 1 !== 0; }), o: o, full: full, dom: o.x ? [Math.max(full[0], o.x[0]), Math.min(full[1], o.x[1])] : full.slice(), hidden: {}, type: 'line'
    };
    if (st.dom[1] - st.dom[0] < 2) st.dom = full.slice();
    return '<figure class="gx" id="' + id + '">' + inner(st) + '</figure>';
  };

  function inner(st) {
    var o = st.o, unit = o.unit === undefined ? '°C' : o.unit, varName = o.varName || T('Temperatura'), dom = st.dom;
    var vis = st.series.filter(function (s) { return !st.hidden[s.name]; });
    var span = st.full[1] - st.full[0];
    var head = (o.title ? '<div class="gt">' + esc(o.title) + '</div>' : '') +
      '<div class="gs">' + esc(varName) + (unit && varName.indexOf(unit) < 0 ? ' (' + esc(unit) + ')' : '') + ' · ' + xl(st, dom[0]) + '–' + xl(st, dom[1]) + (o.freq ? ' · ' + esc(o.freq) : '') + '</div>';
    var per = [[T('Todo'), st.full]];
    if (span > 35) per.push([T('Últimos 30 años'), [st.full[1] - 29, st.full[1]]]);
    if (span > 15) per.push([T('Últimos 10 años'), [st.full[1] - 9, st.full[1]]]);
    var isFull = dom[0] === st.full[0] && dom[1] === st.full[1];
    var tools = '<div class="gtools">' + per.map(function (p) {
      var on = Math.round(p[1][0]) === Math.round(dom[0]) && Math.round(p[1][1]) === Math.round(dom[1]);
      return '<button data-gper="' + p[1][0] + ',' + p[1][1] + '" class="' + (on ? 'on' : '') + '">' + p[0] + '</button>';
    }).join('') + (!isFull && !per.some(function (p) { return Math.round(p[1][0]) === Math.round(dom[0]) && Math.round(p[1][1]) === Math.round(dom[1]); }) ? '<button data-gper="' + st.full.join(',') + T('" class="on">↺ Quitar zoom</button>') : '') +
      '<span class="gsep"></span><button data-gtype="line" class="' + (st.type === 'line' ? 'on' : '') + T('" title="Ver como líneas en el tiempo">📈 Líneas</button><button data-gtype="bars" class="') + (st.type === 'bars' ? 'on' : '') + '" title="' + (st.series.length > 1 ? T('Comparar el promedio de cada región') : T('Ver cada año como una barra')) + T('">📊 Barras</button></div>');
    var leg = st.series.length > 1 || o.legend ? '<div class="gleg">' + st.series.map(function (s) {
      var off = st.hidden[s.name];
      return '<button data-gser="' + esc(s.name) + '" class="' + (off ? 'off' : '') + '" aria-pressed="' + !off + T('" title="Toca para ') + (off ? T('mostrar') : T('ocultar')) + '"><i style="background:' + s.color + '"></i>' + esc(s.name) + '</button>';
    }).join('') + '</div>' : '';
    var svg = st.type === 'bars' ? (st.series.length > 1 ? barsCompare(st, vis, unit) : barsYears(st, vis[0] || st.series[0], unit)) : lines(st, vis, unit, varName);
    return head + tools + '<div class="gplot">' + svg + '</div>' + leg + keys(st, vis, unit) +
      T('<div class="ghint">Pasa el cursor (o el dedo) para ver los valores · arrastra sobre la gráfica para acercar un periodo</div><div class="gtip" hidden></div>');
  }

  function yScale(vis, dom, o) {
    var v = [];
    vis.forEach(function (s) { pts(s, dom).forEach(function (d) { v.push(d[1]); }); });
    if (o.zero) v.push(0);
    if (!v.length) v = [0, 1];
    var ex = d3.extent(v), pad = (ex[1] - ex[0]) * 0.1 || 1;
    return d3.scaleLinear().domain([ex[0] - pad, ex[1] + pad]).nice().range([H - MG.b, MG.t]);
  }
  function axes(X, Y, unit, varName, o) {
    var out = '', yt = Y.ticks(5), step = yt.length > 1 ? yt[1] - yt[0] : 1, yd = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
    yt.forEach(function (t) {
      var z = t === 0 && o.zero;
      out += '<line x1="' + MG.l + '" x2="' + (W - MG.r) + '" y1="' + Y(t) + '" y2="' + Y(t) + '" stroke="' + (z ? '#7b93a8' : '#1f3a52') + '"' + (z ? ' stroke-dasharray="4 3"' : '') + '/>' +
        '<text x="' + (MG.l - 5) + '" y="' + (Y(t) + 3) + '" text-anchor="end" class="gtk">' + nf(t, yd) + '</text>';
    });
    if (X) X.ticks(6).filter(function (t) { return t % 1 === 0; }).forEach(function (t) { out += '<text x="' + X(t) + '" y="' + (H - MG.b + 13) + '" text-anchor="middle" class="gtk">' + t + '</text>'; });
    out += '<text x="' + ((MG.l + W - MG.r) / 2) + '" y="' + (H - 4) + T('" text-anchor="middle" class="gax">Año</text>');
    out += '<text transform="translate(11,' + ((MG.t + H - MG.b) / 2) + ') rotate(-90)" text-anchor="middle" class="gax">' + esc(varName.length > 26 ? varName.slice(0, 25) + '…' : varName) + (unit && varName.indexOf(unit) < 0 ? ' (' + esc(unit) + ')' : '') + '</text>';
    return out;
  }
  function lines(st, vis, unit, varName) {
    var o = st.o, dom = st.dom, X = d3.scaleLinear().domain(dom).range([MG.l, W - MG.r]), Y = yScale(vis, dom, o);
    st.X = X; st.Y = Y;
    var out = '';
    if (o.band) { var b0 = Math.max(o.band[0], dom[0]), b1 = Math.min(o.band[1], dom[1]); if (b1 > b0) out += '<rect x="' + X(b0) + '" width="' + (X(b1) - X(b0)) + '" y="' + MG.t + '" height="' + (H - MG.b - MG.t) + '" fill="rgba(92,200,255,0.08)"/>'; }
    out += axes(X, Y, unit, varName, o);
    var ln = d3.line().x(function (d) { return X(d[0]); }).y(function (d) { return Y(d[1]); });
    vis.forEach(function (s) {
      var p = pts(s, dom); if (!p.length) return;
      var many = p.length > 150;
      out += '<path d="' + ln(p) + '" fill="none" stroke="' + s.color + '" stroke-width="' + (many ? 1.2 : 2) + '" stroke-linejoin="round"/>';
      if (!many && p.length <= 60) p.forEach(function (d) { out += '<circle cx="' + X(d[0]) + '" cy="' + Y(d[1]) + '" r="1.9" fill="' + s.color + '"/>'; });
      var r = trend(p);
      if (r) out += '<line x1="' + X(p[0][0]) + '" x2="' + X(p[p.length - 1][0]) + '" y1="' + Y(r.a + r.b * p[0][0]) + '" y2="' + Y(r.a + r.b * p[p.length - 1][0]) + '" stroke="' + s.color + '" stroke-width="1.6" stroke-dasharray="6 4" opacity="0.85"/>';
    });
    // máximo y mínimo cuando hay una sola serie visible
    if (vis.length === 1) {
      var p1 = pts(vis[0], dom);
      if (p1.length > 2) {
        var mx = p1.reduce(function (a, d) { return d[1] > a[1] ? d : a; }), mn = p1.reduce(function (a, d) { return d[1] < a[1] ? d : a; }), dd = decFor(Y.domain()[1] - Y.domain()[0]) + 1;
        [[mx, T('máx'), -7], [mn, T('mín'), 13]].forEach(function (k) {
          var x = X(k[0][0]), anc = x > W - 70 ? 'end' : x < MG.l + 40 ? 'start' : 'middle';
          out += '<circle cx="' + x + '" cy="' + Y(k[0][1]) + '" r="3.6" fill="none" stroke="#fff" stroke-width="1.4"/><text x="' + x + '" y="' + (Y(k[0][1]) + k[2]) + '" text-anchor="' + anc + '" class="gan">' + k[1] + ' ' + nf(k[0][1], dd) + ' (' + xl(st, k[0][0]) + ')</text>';
        });
      }
    }
    if (o.marks) o.marks.forEach(function (y) { if (y >= dom[0] && y <= dom[1]) out += '<line x1="' + X(y) + '" x2="' + X(y) + '" y1="' + MG.t + '" y2="' + (H - MG.b) + '" stroke="#fff" stroke-dasharray="3 2"/><text x="' + X(y) + '" y="' + (MG.t - 3) + '" text-anchor="middle" class="gtk" fill="#fff">' + y + '</text>'; });
    if (o.marker !== undefined && o.marker >= dom[0] && o.marker <= dom[1]) out += '<line x1="' + X(o.marker) + '" x2="' + X(o.marker) + '" y1="' + MG.t + '" y2="' + (H - MG.b) + '" stroke="rgba(255,255,255,0.55)" stroke-width="1"/>';
    out += '<line class="gcross" x1="0" x2="0" y1="' + MG.t + '" y2="' + (H - MG.b) + '" stroke="#fff" stroke-width="1" visibility="hidden"/><g class="gdots"></g><rect class="gbrush" x="0" width="0" y="' + MG.t + '" height="' + (H - MG.b - MG.t) + '" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" visibility="hidden"/>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || varName) + '">' + out + '</svg>';
  }
  // una barra por año: arriba del promedio en rojo, abajo en azul
  function barsYears(st, s, unit) {
    var o = st.o, dom = st.dom, p = pts(s, dom);
    if (st.frac) p = d3.rollups(p, function (v) { return d3.mean(v, function (d) { return d[1]; }); }, function (d) { return Math.floor(d[0]); }).sort(function (a, b) { return a[0] - b[0]; });
    var X = d3.scaleBand().domain(p.map(function (d) { return d[0]; })).range([MG.l, W - MG.r]).padding(0.15);
    var base = o.zero ? 0 : d3.mean(p, function (d) { return d[1]; });
    var Y = yScale([s], dom, o);
    st.X = { band: X, inv: function (px) { var i = Math.floor((px - MG.l) / X.step()); return p[Math.max(0, Math.min(p.length - 1, i))] ? p[Math.max(0, Math.min(p.length - 1, i))][0] : null; } };
    st.Y = Y;
    var out = axes(null, Y, unit, o.varName || T('Temperatura'), o);
    var tk = d3.scaleLinear().domain(dom).ticks(6).filter(function (t) { return t % 1 === 0; });
    tk.forEach(function (t) { if (X(t) !== undefined) out += '<text x="' + (X(t) + X.bandwidth() / 2) + '" y="' + (H - MG.b + 13) + '" text-anchor="middle" class="gtk">' + t + '</text>'; });
    out += '<line x1="' + MG.l + '" x2="' + (W - MG.r) + '" y1="' + Y(base) + '" y2="' + Y(base) + '" stroke="#cbd5e1" stroke-dasharray="3 3"/>' +
      '<text x="' + (W - MG.r) + '" y="' + (Y(base) - 4) + '" text-anchor="end" class="gan">' + (o.zero ? T('lo normal') : T('promedio ') + nf(base, 1)) + '</text>';
    p.forEach(function (d) {
      var up = d[1] >= base, y0 = Y(base), y1 = Y(d[1]);
      out += '<rect x="' + X(d[0]) + '" width="' + Math.max(1, X.bandwidth()) + '" y="' + Math.min(y0, y1) + '" height="' + Math.max(0.6, Math.abs(y1 - y0)) + '" fill="' + (up ? '#ff7a59' : '#5cb7ff') + '"/>';
    });
    out += '<line class="gcross" x1="0" x2="0" y1="' + MG.t + '" y2="' + (H - MG.b) + '" stroke="#fff" stroke-width="1" visibility="hidden"/><g class="gdots"></g><rect class="gbrush" x="0" width="0" y="' + MG.t + '" height="' + (H - MG.b - MG.t) + '" fill="rgba(251,191,36,0.18)" stroke="#fbbf24" visibility="hidden"/>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + T('" role="img" aria-label="Barras por año">') + out + '</svg>';
  }
  // varias regiones: barra con el promedio del periodo de cada una (misma escala)
  function barsCompare(st, vis, unit) {
    st.X = null;
    var rows = vis.map(function (s) { var p = pts(s, st.dom); return { s: s, v: p.length ? d3.mean(p, function (d) { return d[1]; }) : null }; }).filter(function (r) { return r.v !== null; });
    if (!rows.length) return T('<p class="note">No hay datos en este periodo.</p>');
    var rh = 30, h = rows.length * rh + 34, lo = Math.min(0, d3.min(rows, function (r) { return r.v; })), hi = Math.max(0, d3.max(rows, function (r) { return r.v; }));
    var X = d3.scaleLinear().domain([lo, hi]).nice().range([130, W - 50]), out = '';
    X.ticks(4).forEach(function (t) { out += '<line x1="' + X(t) + '" x2="' + X(t) + '" y1="4" y2="' + (h - 26) + '" stroke="#1f3a52"/><text x="' + X(t) + '" y="' + (h - 14) + '" text-anchor="middle" class="gtk">' + nf(t, 0) + '</text>'; });
    out += '<text x="' + ((130 + W - 50) / 2) + '" y="' + (h - 2) + T('" text-anchor="middle" class="gax">Promedio ') + Math.round(st.dom[0]) + '–' + Math.round(st.dom[1]) + (unit ? ' (' + esc(unit) + ')' : '') + '</text>';
    rows.forEach(function (r, i) {
      var y = 6 + i * rh;
      out += '<text x="124" y="' + (y + 15) + '" text-anchor="end" class="gname">' + esc(r.s.name.length > 20 ? r.s.name.slice(0, 19) + '…' : r.s.name) + '</text>' +
        '<rect x="' + Math.min(X(0), X(r.v)) + '" y="' + (y + 3) + '" width="' + Math.max(1, Math.abs(X(r.v) - X(0))) + '" height="' + (rh - 10) + '" rx="3" fill="' + r.s.color + '"><title>' + esc(r.s.name) + ': ' + nf(r.v, 2) + ' ' + esc(unit) + '</title></rect>' +
        '<text x="' + (Math.max(X(0), X(r.v)) + 4) + '" y="' + (y + 15) + '" class="gval">' + nf(r.v, 1) + ' ' + esc(unit) + '</text>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + h + T('" role="img" aria-label="Promedio de cada región">') + out + '</svg>';
  }
  // valores clave en lenguaje sencillo
  function keys(st, vis, unit) {
    var rows = vis.map(function (s) {
      var p = pts(s, st.dom); if (!p.length) return '';
      var r = trend(p), first = p[0], last = p[p.length - 1], d = decFor(Math.abs(last[1]) + 1) > 1 ? 2 : 1;
      var mx = p.reduce(function (a, q) { return q[1] > a[1] ? q : a; }), mn = p.reduce(function (a, q) { return q[1] < a[1] ? q : a; });
      var words = r ? (Math.abs(r.b * 10) < 0.005 ? T('casi no cambia') : (r.b > 0 ? 'sube ' : 'baja ') + nf(Math.abs(r.b * 10), 2) + ' ' + unit + T(' cada 10 años')) + (r.p < 0.05 && r.pmk < 0.05 ? '' : T(' (no es seguro)')) : T('pocos datos para una tendencia');
      return '<div class="gk"><b style="color:' + s.color + '">' + esc(s.name) + '</b>' +
        '<span>' + xl(st, first[0]) + ': <b>' + nf(first[1], d) + '</b></span><span>' + xl(st, last[0]) + ': <b>' + nf(last[1], d) + '</b></span>' +
        T('<span>Máx: <b>') + nf(mx[1], d) + '</b> (' + xl(st, mx[0]) + T(')</span><span>Mín: <b>') + nf(mn[1], d) + '</b> (' + xl(st, mn[0]) + ')</span>' +
        T('<span class="gtr">Tendencia: ') + words + '</span></div>';
    }).join('');
    return rows ? '<div class="gkeys">' + rows + '</div>' : '';
  }

  var MES = window.LANG === 'en' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var MESL = window.LANG === 'en' ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] : ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function dateLabel(x, st) {
    if (!st.frac || st.X.band || x % 1 === 0.5) return String(Math.floor(x)) + (st.X.band && st.frac ? T(' (promedio del año)') : '');
    var y = Math.floor(x), m = Math.min(11, Math.floor((x - y) * 12 + 1e-6));
    return (st.X.band === undefined && st.long ? MESL : MES)[m] + ' ' + y;
  }
  function xl(st, x) { return st.frac ? dateLabel(x, { frac: true, X: {} }) : String(Math.round(x)); }
  function rerender(id) { var el = document.getElementById(id); if (el && REG[id]) el.innerHTML = inner(REG[id]); }
  G.rerender = rerender;

  /* ---------- interacción (un solo juego de eventos para todas las gráficas) ---------- */
  function figOf(t) { var f = t && t.closest ? t.closest('.gx') : null; return f && REG[f.id] ? f : null; }
  function svgX(fig, ev) { var sv = fig.querySelector('.gplot svg'), r = sv.getBoundingClientRect(); return (ev.clientX - r.left) * (W / r.width); }
  function yearAt(st, px) {
    if (!st.X) return null;
    if (st.X.inv) return st.X.inv(px);
    var v = st.X.invert(Math.max(MG.l, Math.min(W - MG.r, px)));
    return st.frac ? v : Math.round(v);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-gper],[data-gtype],[data-gser]'); if (!b) return;
    var fig = figOf(b); if (!fig) return;
    var st = REG[fig.id];
    if (b.hasAttribute('data-gper')) st.dom = b.getAttribute('data-gper').split(',').map(Number).map(function (v, i) { return i ? Math.min(v, st.full[1]) : Math.max(v, st.full[0]); });
    if (b.hasAttribute('data-gtype')) st.type = b.getAttribute('data-gtype');
    if (b.hasAttribute('data-gser')) {
      var n = b.getAttribute('data-gser'), visible = st.series.filter(function (s) { return !st.hidden[s.name]; }).length;
      if (!st.hidden[n] && visible <= 1) return;   // siempre queda al menos una
      st.hidden[n] = !st.hidden[n];
    }
    rerender(fig.id);
  });
  var drag = null;
  document.addEventListener('pointerdown', function (e) {
    var fig = figOf(e.target); if (!fig || !e.target.closest('.gplot')) return;
    var st = REG[fig.id]; if (!st.X) return;
    drag = { fig: fig, x0: svgX(fig, e) };
  });
  document.addEventListener('pointermove', function (e) {
    var fig = drag ? drag.fig : figOf(e.target);
    document.querySelectorAll('.gx .gtip:not([hidden])').forEach(function (t) { if (!fig || t.parentNode !== fig) { t.hidden = true; var c = t.parentNode.querySelector('.gcross'); if (c) c.setAttribute('visibility', 'hidden'); var d = t.parentNode.querySelector('.gdots'); if (d) d.innerHTML = ''; } });
    if (!fig || (!drag && !e.target.closest('.gplot'))) return;
    var st = REG[fig.id]; if (!st.X) return;
    var px = svgX(fig, e), yr = yearAt(st, px);
    if (drag) {
      var br = fig.querySelector('.gbrush'), a = Math.max(MG.l, Math.min(drag.x0, px)), b = Math.min(W - MG.r, Math.max(drag.x0, px));
      if (b - a > 4) { br.setAttribute('x', a); br.setAttribute('width', b - a); br.setAttribute('visibility', 'visible'); }
    }
    showTip(fig, st, yr, e);
  });
  document.addEventListener('pointerup', function (e) {
    if (!drag) return;
    var fig = drag.fig, st = REG[fig.id], px = svgX(fig, e), x0 = drag.x0; drag = null;
    if (Math.abs(px - x0) > 14) {
      var a = yearAt(st, Math.min(px, x0)), b = yearAt(st, Math.max(px, x0));
      if (a !== null && b !== null && b - a >= (st.frac ? 1 : 3)) { st.dom = [a, b]; rerender(fig.id); return; }
    }
    var br = fig.querySelector('.gbrush'); if (br) br.setAttribute('visibility', 'hidden');
  });
  function showTip(fig, st, yr, e) {
    var tip = fig.querySelector('.gtip'), cross = fig.querySelector('.gcross'), dots = fig.querySelector('.gdots');
    if (yr === null || !tip) return;
    var vis = st.series.filter(function (s) { return !st.hidden[s.name]; }), unit = st.o.unit === undefined ? '°C' : st.o.unit, rows = [], dh = '';
    var cx = st.X.band ? st.X.band(yr) + st.X.band.bandwidth() / 2 : st.X(yr);
    var tol = st.frac && !st.X.band ? 0.08 : 0.6, xr = yr;
    vis.forEach(function (s) {
      var best = -1, bd = 1e9;
      s.xs.forEach(function (x, k) { var d = Math.abs(x - yr); if (d < bd && isFinite(s.ys[k]) && s.ys[k] !== null) { bd = d; best = k; } });
      if (best < 0 || bd > tol) return;
      var v = s.ys[best]; xr = s.xs[best];
      if (st.X.band && st.frac) { var yy = Math.floor(yr), vv = []; s.xs.forEach(function (x, k) { if (Math.floor(x) === yy && isFinite(s.ys[k])) vv.push(s.ys[k]); }); v = vv.length ? d3.mean(vv) : v; xr = yy; }
      rows.push([s, v]);
      if (!st.X.band) dh += '<circle cx="' + st.X(xr) + '" cy="' + st.Y(v) + '" r="4" fill="' + s.color + '" stroke="#fff" stroke-width="1.5"/>';
    });
    if (!st.X.band) cx = st.X(xr);
    if (!rows.length) { tip.hidden = true; return; }
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
    dots.innerHTML = dh;
    var d = Math.abs(rows[0][1]) < 1 ? 3 : 2;
    var diff = rows.length === 2 ? T('<div class="gtd">Diferencia: <b>') + sf(rows[0][1] - rows[1][1], 2) + ' ' + esc(unit) + '</b></div>' : '';
    tip.innerHTML = '<div class="gty">' + dateLabel(xr, st) + '</div>' + rows.map(function (r) { return '<div><i style="background:' + r[0].color + '"></i>' + esc(r[0].name) + ': <b>' + nf(r[1], d) + ' ' + esc(unit) + '</b></div>'; }).join('') + diff;
    tip.hidden = false;
    var fr = fig.getBoundingClientRect(), x = e.clientX - fr.left + 12, y = e.clientY - fr.top + 12;
    if (x + tip.offsetWidth > fr.width) x = e.clientX - fr.left - tip.offsetWidth - 12;
    tip.style.left = Math.max(0, x) + 'px'; tip.style.top = y + 'px';
  }
})();
