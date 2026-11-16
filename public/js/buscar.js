/* Detectives de la Tierra · Buscador de departamentos
   Escribe parte del nombre (con o sin tildes), elige una sugerencia y el mapa vuela hasta el departamento.
   Usa la misma función que el clic en el mapa (M.selectDep), así que el resultado es idéntico. */
(function () {
  var DT = window.DT, M = DT && DT.M;
  if (!M) return;
  var S = DT.S, fmt = DT.fmt, esc = DT.esc;
  var $ = function (s) { return document.querySelector(s); };
  var input = $('#q'), list = $('#qList'), clear = $('#qClear');
  if (!input) return;
  var items = [], active = -1;
  // nombres alternativos que la gente escribe
  var ALIAS = { dc: ['bogota', 'bogota dc', 'santa fe de bogota'], sap: ['san andres', 'providencia', 'archipielago'], nsa: ['norte de santander', 'cucuta'], vac: ['valle', 'cali'], ant: ['medellin'], atl: ['barranquilla'], bol: ['cartagena'] };
  function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function search(q) {
    var n = norm(q); if (!n) return [];
    return M.depList().map(function (d) {
      var name = norm(d.name), words = name.split(' '), score = -1;
      if (name.indexOf(n) === 0) score = 3;
      else if (words.some(function (w) { return w.indexOf(n) === 0; })) score = 2;
      else if (name.indexOf(n) >= 0) score = 1;
      (ALIAS[d.id] || []).forEach(function (a) { if (a.indexOf(n) === 0 && score < 2) score = 2; else if (a.indexOf(n) >= 0 && score < 1) score = 1; });
      return { d: d, score: score };
    }).filter(function (r) { return r.score >= 0; }).sort(function (a, b) { return b.score - a.score || a.d.name.localeCompare(b.d.name, 'es'); }).slice(0, 8).map(function (r) { return r.d; });
  }
  // resalta la parte escrita dentro del nombre
  function mark(name, q) {
    var n = norm(q), plain = norm(name), i = plain.indexOf(n);
    if (!n || i < 0) return esc(name);
    return esc(name.slice(0, i)) + '<b>' + esc(name.slice(i, i + n.length)) + '</b>' + esc(name.slice(i + n.length));
  }
  function render() {
    var q = input.value;
    clear.hidden = !q;
    if (!q.trim()) { close(); return; }
    if (!M.dep.geo) { list.innerHTML = T('<li class="qmsg">Cargando departamentos…</li>'); open(); return; }
    items = search(q); active = items.length ? 0 : -1;
    if (!items.length) {
      list.innerHTML = T('<li class="qmsg">No encontré «') + esc(q) + T('». Prueba con el nombre de un departamento, por ejemplo <b>Antioquia</b> o <b>Meta</b>.</li>');
    } else {
      var y = M.depYear ? M.depYear(S.year) : null;
      list.innerHTML = items.map(function (d, i) {
        var v = M.depValue ? M.depValue(d.id, S.year) : null;
        return '<li role="option" id="qo' + i + '" data-i="' + i + '" aria-selected="' + (i === active) + '"><span class="qn">📍 ' + mark(d.name, q) + '</span>' + (v !== null && v !== undefined ? '<span class="qv">🌡 ' + fmt(v, 1) + ' °C</span>' : '') + '</li>';
      }).join('');
      list.querySelectorAll('[data-i]').forEach(function (li) {
        li.addEventListener('mousedown', function (e) { e.preventDefault(); choose(+li.getAttribute('data-i')); });
      });
    }
    open();
  }
  function open() { list.hidden = false; input.setAttribute('aria-expanded', 'true'); }
  function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); }
  function setActive(i) {
    active = (i + items.length) % items.length;
    list.querySelectorAll('[data-i]').forEach(function (li, k) { li.setAttribute('aria-selected', String(k === active)); });
    input.setAttribute('aria-activedescendant', 'qo' + active);
  }
  function choose(i) {
    var d = items[i]; if (!d) return;
    input.value = d.name; clear.hidden = false; close(); input.blur();
    M.selectDep(d.id);
  }
  input.addEventListener('input', render);
  input.addEventListener('focus', function () { if (input.value.trim()) render(); });
  input.addEventListener('blur', function () { setTimeout(close, 120); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); if (list.hidden) render(); else setActive(active + 1); }
    else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items.length) choose(active < 0 ? 0 : active); }
    else if (e.key === 'Escape') { close(); }
  });
  clear.addEventListener('click', function () { input.value = ''; clear.hidden = true; close(); input.focus(); });
  // si el departamento se elige desde el mapa, el buscador muestra su nombre
  M.onDepSelected = function (id) { input.value = id ? M.dep.byId[id].name : ''; clear.hidden = !id; };

  /* volver a la vista de toda Colombia */
  $('#homeBtn').addEventListener('click', function () {
    S.dep = null; S.zone = null; S.sel = null; S.pt = null;
    if (S.tool === 'cmp' && M.closeCompare) M.closeCompare();
    M.onDepSelected(null);
    $('#analysis').hidden = true;
    if (M.renderDepQuick) M.renderDepQuick();
    DT.flyTo([-73.3, 4.3], false, 6.2);
    DT.renderAnalysis(); DT.requestDraw();
  });
})();
