(function () {
'use strict';

/* ---------- utilidades ---------- */
var $ = function (s) { return document.querySelector(s); };
var NFS = {};
function fmt(x, d) {
  if (!NFS[d]) NFS[d] = new Intl.NumberFormat('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
  return NFS[d].format(x);
}
function sfmt(x, d) { return (x > 0 ? '+' : x < 0 ? '−' : '') + fmt(Math.abs(x), d); }
function pfmt(p) { return p < 0.001 ? '< 0,001' : '= ' + fmt(p, 3); }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

/* ---------- estadística ---------- */
function lgamma(z) {
  var c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  var x = c[0];
  for (var i = 1; i < 9; i++) x += c[i] / (z + i);
  var t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
function betacf(a, b, x) {
  var FPMIN = 1e-300, qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  var h = d;
  for (var m = 1; m <= 300; m++) {
    var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    var del = d * c; h *= del;
    if (Math.abs(del - 1) < 3e-14) break;
  }
  return h;
}
function ibeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  var bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}
function pT(t, df) { return ibeta(df / (df + t * t), df / 2, 0.5); } // bilateral
function tCrit(df) {
  var lo = 0, hi = 100;
  for (var i = 0; i < 70; i++) { var m = (lo + hi) / 2; if (pT(m, df) > 0.05) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
function erfc(x) {
  var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
function pN(z) { return Math.min(1, erfc(Math.abs(z) / Math.SQRT2)); }
function mannKendall(X, Y) {
  var n = Y.length, S = 0, i, j;
  for (i = 0; i < n - 1; i++) for (j = i + 1; j < n; j++) { var d = Y[j] - Y[i]; S += d > 0 ? 1 : d < 0 ? -1 : 0; }
  var v = n * (n - 1) * (2 * n + 5) / 18;
  var z = S > 0 ? (S - 1) / Math.sqrt(v) : S < 0 ? (S + 1) / Math.sqrt(v) : 0;
  return { S: S, z: z, p: pN(z) };
}
function analyze(xs, ys) {
  var X = [], Y = [], i, j;
  for (i = 0; i < xs.length; i++) if (isFinite(ys[i]) && isFinite(xs[i])) { X.push(xs[i]); Y.push(ys[i]); }
  var n = X.length;
  if (n < 6) return null;
  var mx = 0, my = 0, sxx = 0, sxy = 0, sse = 0;
  for (i = 0; i < n; i++) { mx += X[i]; my += Y[i]; }
  mx /= n; my /= n;
  for (i = 0; i < n; i++) { sxx += (X[i] - mx) * (X[i] - mx); sxy += (X[i] - mx) * (Y[i] - my); }
  var b = sxy / sxx, a = my - b * mx;
  for (i = 0; i < n; i++) { var e = Y[i] - (a + b * X[i]); sse += e * e; }
  var df = n - 2, se = Math.sqrt(sse / df / sxx), t = b / se;
  var p = pT(Math.abs(t), df), tc = tCrit(df);
  var mk = mannKendall(X, Y);
  var slopes = [];
  for (i = 0; i < n - 1; i++) for (j = i + 1; j < n; j++) if (X[j] !== X[i]) slopes.push((Y[j] - Y[i]) / (X[j] - X[i]));
  slopes.sort(function (u, w) { return u - w; });
  var h = slopes.length >> 1;
  var sen = slopes.length % 2 ? slopes[h] : (slopes[h - 1] + slopes[h]) / 2;
  return { n: n, a: a, b: b, p: p, lo: b - tc * se, hi: b + tc * se, pmk: mk.p, z: mk.z, sen: sen, x0: X[0], x1: X[n - 1] };
}

/* ---------- capas y eventos ---------- */
var SEA = ['sst', 'anom', 'trend'];
var LAYERS = {
  sst: { name: 'Temperatura del mar', title: 'Temperatura superficial del mar · promedio anual', desc: 'Qué tan caliente está la superficie del océano. Los tonos amarillos y rojos son aguas cálidas; los azules y morados, aguas frías. La tierra firme se ve con la imagen satelital Blue Marble de NASA.', unit: '°C', src: 'NOAA ERSSTv5: mediciones de barcos, boyas y flotadores Argo, en celdas de 4°. Es la misma base oceánica que usa NASA GISTEMP.', range: [1970, 2021] },
  anom: { name: 'Anomalía del mar', title: 'Anomalía de la temperatura del mar', desc: 'Cuánto más caliente (rojo) o más frío (azul) estuvo el mar ese año, comparado con el promedio de 1971 a 2000. Así se ven fenómenos como El Niño.', unit: '°C frente a 1971–2000', src: 'NOAA ERSSTv5, promedio anual en celdas de 4°.', range: [1970, 2021] },
  trend: { name: 'Tendencia', title: '¿Dónde cambia? Tendencia de la temperatura del mar', desc: 'Cada celda muestra cuánto cambió la temperatura del mar por década en el periodo elegido. Rojo: se calienta; azul: se enfría. El gris indica que el cambio no es significativo (Mann-Kendall, p ≥ 0,05).', unit: '°C por década', src: 'Calculado en tu navegador a partir de NOAA ERSSTv5: regresión lineal y prueba de Mann-Kendall en cada celda.', range: [1970, 2021] },
  global: { name: 'Temperatura global', title: 'Temperatura global del planeta · NASA GISTEMP v4', desc: 'Promedio de tierra y océano de todo el planeta, comparado con 1951–1980. El panel de la derecha analiza la serie global; el globo muestra la anomalía del mar de cada año.', unit: '°C frente a 1951–1980', src: 'NASA Goddard Institute for Space Studies (GISTEMP v4), promedio anual global hasta 2025.', range: [1880, 2026] }
};
var LINKS = {
  sst: [['Fuente: NOAA ERSSTv5', 'https://www.ncei.noaa.gov/products/extended-reconstructed-sst'], ['Más datos: NASA Giovanni', 'https://giovanni.gsfc.nasa.gov/giovanni/']],
  global: [['Fuente: NASA GISTEMP', 'https://data.giss.nasa.gov/gistemp/'], ['Más datos: NASA Giovanni', 'https://giovanni.gsfc.nasa.gov/giovanni/']]
};
LINKS.anom = LINKS.sst; LINKS.trend = LINKS.sst;

var EVENTS = [
  { y: 1883, L: ['global'], t: 'Erupción del Krakatoa', d: 'La ceniza del volcán, en Indonesia, enfrió el planeta durante algunos años.', ll: [105.4, -6.1] },
  { y: 1972, L: SEA, t: 'El Niño 1972–1973', d: 'Un El Niño fuerte calentó el Pacífico ecuatorial y contribuyó al colapso de la pesca de anchoveta en Perú.', ll: [-115, 0] },
  { y: 1976, L: SEA, t: 'Cambio de régimen del Pacífico', d: 'Entre 1976 y 1977 el Pacífico Norte pasó a una fase cálida que duró décadas.', ll: [-150, 35] },
  { y: 1982, L: SEA, t: 'El Niño 1982–1983', d: 'Uno de los El Niño más fuertes del siglo XX.', ll: [-110, 0] },
  { y: 1988, L: SEA, t: 'La Niña 1988–1989', d: 'Una La Niña fuerte enfrió el Pacífico ecuatorial.', ll: [-130, 0] },
  { y: 1991, L: ['global', 'anom'], t: 'Erupción del Pinatubo', d: 'El volcán, en Filipinas, lanzó aerosoles que enfriaron el planeta en 1992.', ll: [120.35, 15.13] },
  { y: 1997, L: SEA, t: 'El Niño 1997–1998', d: 'Un El Niño extremo. En 1998 ocurrió el primer blanqueamiento masivo de corales a escala mundial.', ll: [-110, 0] },
  { y: 1998, L: ['global'], t: '1998, año récord', d: 'El Niño 1997–1998 llevó la temperatura global a un récord para su época.', ll: [-110, 0] },
  { y: 2010, L: SEA, t: 'La Niña 2010–2011', d: 'Una La Niña fuerte, con lluvias extremas en Colombia y Australia.', ll: [-140, 0] },
  { y: 2014, L: SEA, t: '«The Blob»', d: 'Ola de calor marina en el Pacífico nororiental durante 2014 y 2015.', ll: [-145, 45] },
  { y: 2015, L: SEA, t: 'El Niño 2015–2016', d: 'Uno de los El Niño más fuertes registrados.', ll: [-120, 0] },
  { y: 2016, L: SEA.concat(['global']), t: 'Récord global y Gran Barrera de Coral', d: '2016 fue el año más cálido registrado hasta entonces, y la Gran Barrera de Coral sufrió un blanqueamiento masivo.', ll: [147, -18] },
  { y: 2020, L: ['global'], t: '2020 empata con 2016', d: 'Según NASA, 2020 empató con 2016 como el año más cálido registrado hasta ese momento.', ll: [-30, 20] },
  { y: 2021, L: SEA, t: 'La Niña 2020–2022', d: 'Tres temporadas seguidas de La Niña en el Pacífico.', ll: [-140, 0] },
  { y: 2023, L: ['global'], t: '2023, nuevo récord', d: 'El año más cálido registrado hasta entonces.', ll: [-30, 20] },
  { y: 2024, L: ['global'], t: '2024, el año más cálido registrado', d: 'Superó a 2023 según NASA GISTEMP.', ll: [-30, 20] },
  { y: 2025, L: ['global'], t: '2025, empatado con 2023', d: 'Según NASA, 2025 quedó prácticamente empatado con 2023 como el segundo año más cálido, detrás de 2024.', ll: [-30, 20] },
  { y: 2026, L: SEA.concat(['global']), t: 'El Niño 2026–2027', d: 'En octubre, el IDEAM de Colombia lo declaró con intensidad fuerte a muy fuerte.', ll: [-120, 0] }
];

/* ---------- estado ---------- */
var S = {
  layer: 'sst', year: 2026, period: [1970, 2021], sel: null, onlySig: false,
  done: [false, false, false], auto: true, playing: false,
  focus: 'world', zone: null, zoneTab: 'resumen', upZone: '',
  clouds: true, showData: true,
  reduceMotion: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
};
var D, NLAT, NLON, Y0, NY, clim, anomQ, step, cells = [], polys = [], centers = [], kToI = {}, land, borders, gistemp, colombia;
var colors = [], trendB = null, trendP = null;

var scales = {
  sst: d3.scaleSequential(d3.interpolateTurbo).domain([-2, 31]),
  anom: d3.scaleDiverging(function (t) { return d3.interpolateRdBu(1 - t); }).domain([-2, 0, 2]),
  trend: d3.scaleDiverging(function (t) { return d3.interpolateRdBu(1 - t); }).domain([-0.5, 0, 0.5])
};
scales.global = scales.anom;

function b64(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
function anomAt(y, k) { var q = anomQ[(y - Y0) * NLAT * NLON + k]; return q === -128 ? NaN : q * step; }
function valAt(y, k) { return clim[k] / 100 + anomAt(y, k); }
function hasYear(y) { return y >= Y0 && y < Y0 + NY; }

/* ---------- globo ---------- */
var canvas = $('#globe'), ctx = canvas.getContext('2d');
var W = 0, H = 0, dpr = 1, stars = [];
var proj = d3.geoOrthographic().clipAngle(90).precision(0.6);
var path = d3.geoPath(proj, ctx);
var rot = [75, -8], zoomK = 1, pending = false;
var graticule = d3.geoGraticule10();

/* ---------- WebGL: Tierra satelital ---------- */
var bg = $('#bg'), bctx = bg.getContext('2d'), glc = $('#gl');
var CLIMA = null, GL = null, glProg = null, glU = {}, glTex = {}, glReady = false, dataTexDirty = true, cloudShift = 0;
var VS = '#version 300 es\nin vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
var FS = [
  '#version 300 es',
  'precision highp float;',
  'uniform sampler2D uEarth, uWater, uClouds, uData, uLand;',
  'uniform vec4 uLandBox; uniform float uLandAlpha;',
  'uniform vec2 uCenter; uniform float uR; uniform vec2 uRot;',
  'uniform float uCloudShift, uCloudAlpha, uDataAlpha, uHasData;',
  'out vec4 outColor;',
  'const float PI = 3.14159265359;',
  'vec4 sampleSeam(sampler2D t, float u, float v){',
  '  float uA = fract(u); float uB = fract(u + 0.5) - 0.5;',
  '  float uu = fwidth(uA) < fwidth(uB) - 0.0001 ? uA : uB;',
  '  return texture(t, vec2(uu, v));',
  '}',
  'void main(){',
  '  vec2 q = (gl_FragCoord.xy - uCenter) / uR;',
  '  float d2 = dot(q, q);',
  '  if (d2 > 1.0) { outColor = vec4(0.0); return; }',
  '  float z = sqrt(1.0 - d2);',
  '  float cp = cos(uRot.y), sp = sin(uRot.y);',
  '  float x = z * cp + q.y * sp;',
  '  float zz = q.y * cp - z * sp;',
  '  float lon = atan(q.x, x) - uRot.x;',
  '  float lat = asin(clamp(zz, -1.0, 1.0));',
  '  float u = lon / (2.0 * PI) + 0.5; float v = 0.5 - lat / PI;',
  '  vec3 col = sampleSeam(uEarth, u, v).rgb;',
  '  float water = sampleSeam(uWater, u, v).r;',
  '  if (uHasData > 0.5) {',
  '    float ld = mod(degrees(lon) + 361.0, 360.0) / 360.0;',
  '    float la = (89.0 - degrees(lat)) / 176.0;',
  '    if (la >= 0.0 && la <= 1.0) {',
  '      vec4 dc = texture(uData, vec2(ld, la));',
  '      if (dc.a > 0.01) col = mix(col, dc.rgb / dc.a, min(dc.a, 1.0) * uDataAlpha * smoothstep(0.3, 0.7, water));',
  '    }',
  '  }',
  '  if (uLandAlpha > 0.0) {',
  '    float lonD = mod(degrees(lon) + 540.0, 360.0) - 180.0;',
  '    vec2 luv = vec2((lonD - uLandBox.x) / uLandBox.z, (uLandBox.y - degrees(lat)) / uLandBox.w);',
  '    if (luv.x >= 0.0 && luv.x <= 1.0 && luv.y >= 0.0 && luv.y <= 1.0) {',
  '      vec4 lc = texture(uLand, luv);',
  '      if (lc.a > 0.01) {',
  '        float lum = dot(col, vec3(0.299, 0.587, 0.114));',
  '        vec3 tint = (lc.rgb / lc.a) * (0.55 + 1.1 * lum);',
  '        col = mix(col, tint, min(lc.a, 1.0) * uLandAlpha * (1.0 - smoothstep(0.3, 0.7, water)));',
  '      }',
  '    }',
  '  }',
  '  float cl = sampleSeam(uClouds, u + uCloudShift, v).r;',
  '  col = mix(col, vec3(0.97), cl * uCloudAlpha);',
  '  vec3 n = vec3(q, z);',
  '  vec3 L = normalize(vec3(-0.45, 0.5, 0.75));',
  '  float diff = max(dot(n, L), 0.0);',
  '  col *= 0.42 + 0.7 * diff;',
  '  vec3 Hh = normalize(L + vec3(0.0, 0.0, 1.0));',
  '  col += pow(max(dot(n, Hh), 0.0), 60.0) * water * 0.22;',
  '  col = mix(col, vec3(0.45, 0.72, 1.0), pow(1.0 - z, 3.0) * 0.55);',
  '  outColor = vec4(col, 1.0);',
  '}'
].join('\n');
function initGL() {
  try {
    GL = glc.getContext('webgl2', { premultipliedAlpha: false, antialias: true, alpha: true });
    if (!GL) return false;
    var sh = function (type, src) {
      var o = GL.createShader(type); GL.shaderSource(o, src); GL.compileShader(o);
      if (!GL.getShaderParameter(o, GL.COMPILE_STATUS)) throw new Error(GL.getShaderInfoLog(o));
      return o;
    };
    glProg = GL.createProgram();
    GL.attachShader(glProg, sh(GL.VERTEX_SHADER, VS)); GL.attachShader(glProg, sh(GL.FRAGMENT_SHADER, FS));
    GL.linkProgram(glProg);
    if (!GL.getProgramParameter(glProg, GL.LINK_STATUS)) throw new Error(GL.getProgramInfoLog(glProg));
    GL.useProgram(glProg);
    var buf = GL.createBuffer(); GL.bindBuffer(GL.ARRAY_BUFFER, buf);
    GL.bufferData(GL.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), GL.STATIC_DRAW);
    var loc = GL.getAttribLocation(glProg, 'p'); GL.enableVertexAttribArray(loc); GL.vertexAttribPointer(loc, 2, GL.FLOAT, false, 0, 0);
    ['uEarth', 'uWater', 'uClouds', 'uData', 'uLand', 'uLandBox', 'uLandAlpha', 'uCenter', 'uR', 'uRot', 'uCloudShift', 'uCloudAlpha', 'uDataAlpha', 'uHasData'].forEach(function (n) { glU[n] = GL.getUniformLocation(glProg, n); });
    glTex.data = GL.createTexture();
    GL.bindTexture(GL.TEXTURE_2D, glTex.data);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR); GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.REPEAT); GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
    glTex.land = GL.createTexture();
    GL.bindTexture(GL.TEXTURE_2D, glTex.land);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR); GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
    GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE); GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
    return true;
  } catch (e) { GL = null; return false; }
}
function loadTexture(url, unit) {
  return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.blob(); })
    .then(function (b) { return createImageBitmap(b); })
    .then(function (img) {
      var t = GL.createTexture();
      GL.activeTexture(GL.TEXTURE0 + unit); GL.bindTexture(GL.TEXTURE_2D, t);
      GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, img);
      GL.generateMipmap(GL.TEXTURE_2D);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, GL.LINEAR_MIPMAP_LINEAR);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, GL.LINEAR);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_S, GL.REPEAT);
      GL.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
      var ext = GL.getExtension('EXT_texture_filter_anisotropic');
      if (ext) GL.texParameterf(GL.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, GL.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
      return t;
    });
}
function updateDataTex() {
  if (!GL || !D) return;
  var buf = new Uint8Array(NLAT * NLON * 4);
  for (var i = 0; i < cells.length; i++) {
    var c = colors[i];
    if (!c || c === '#26323d') continue;
    var rgb = d3.rgb(c), o = cells[i] * 4;
    buf[o] = rgb.r; buf[o + 1] = rgb.g; buf[o + 2] = rgb.b; buf[o + 3] = 255;
  }
  GL.activeTexture(GL.TEXTURE3); GL.bindTexture(GL.TEXTURE_2D, glTex.data);
  GL.pixelStorei(GL.UNPACK_ALIGNMENT, 1);
  GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, NLON, NLAT, 0, GL.RGBA, GL.UNSIGNED_BYTE, buf);
  if (CLIMA) {
    var lb = new Uint8Array(CLIMA.nx * CLIMA.ny * 4);
    CLIMA.v.forEach(function (v, j) {
      if (v === null) return;
      var c2 = d3.rgb(scales.sst(v));
      lb[j * 4] = c2.r; lb[j * 4 + 1] = c2.g; lb[j * 4 + 2] = c2.b; lb[j * 4 + 3] = 255;
    });
    GL.activeTexture(GL.TEXTURE4); GL.bindTexture(GL.TEXTURE_2D, glTex.land);
    GL.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, CLIMA.nx, CLIMA.ny, 0, GL.RGBA, GL.UNSIGNED_BYTE, lb);
  }
  dataTexDirty = false;
}
function drawGL(R, cx, cy) {
  if (dataTexDirty) updateDataTex();
  GL.viewport(0, 0, glc.width, glc.height);
  GL.clearColor(0, 0, 0, 0); GL.clear(GL.COLOR_BUFFER_BIT);
  GL.useProgram(glProg);
  GL.uniform1i(glU.uEarth, 0); GL.uniform1i(glU.uWater, 1); GL.uniform1i(glU.uClouds, 2); GL.uniform1i(glU.uData, 3);
  GL.uniform2f(glU.uCenter, cx * dpr, (H - cy) * dpr);
  GL.uniform1f(glU.uR, R * dpr);
  GL.uniform2f(glU.uRot, rot[0] * Math.PI / 180, rot[1] * Math.PI / 180);
  GL.uniform1f(glU.uCloudShift, cloudShift);
  GL.uniform1f(glU.uCloudAlpha, S.clouds ? (S.focus === 'colombia' ? 0.22 : 0.38) : 0);
  GL.uniform1f(glU.uDataAlpha, S.showData ? 0.9 : 0);
  GL.uniform1f(glU.uHasData, D ? 1 : 0);
  GL.uniform1i(glU.uLand, 4);
  if (CLIMA) GL.uniform4f(glU.uLandBox, CLIMA.lon0, CLIMA.lat1, CLIMA.nx * CLIMA.res, CLIMA.ny * CLIMA.res);
  GL.uniform1f(glU.uLandAlpha, CLIMA && S.showData && S.layer === 'sst' ? 0.85 : 0);
  GL.activeTexture(GL.TEXTURE0); GL.bindTexture(GL.TEXTURE_2D, glTex.earth);
  GL.activeTexture(GL.TEXTURE1); GL.bindTexture(GL.TEXTURE_2D, glTex.water);
  GL.activeTexture(GL.TEXTURE2); GL.bindTexture(GL.TEXTURE_2D, glTex.clouds);
  GL.activeTexture(GL.TEXTURE3); GL.bindTexture(GL.TEXTURE_2D, glTex.data);
  GL.activeTexture(GL.TEXTURE4); GL.bindTexture(GL.TEXTURE_2D, glTex.land);
  GL.drawArrays(GL.TRIANGLE_STRIP, 0, 4);
}

function resize() {
  var r = canvas.getBoundingClientRect();
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = r.width; H = r.height;
  [canvas, bg, glc].forEach(function (cv) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); });
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  var rnd = d3.randomLcg(42);
  stars = d3.range(320).map(function () { return [rnd() * W, rnd() * H, rnd() * 1.3 + 0.2, rnd() * 0.6 + 0.2, rnd() * 6.28]; });
  requestDraw();
}
function requestDraw() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(function () { pending = false; draw(); });
}
function radius() { return Math.min(W, H) * 0.41 * zoomK; }
function draw() {
  if (!W) return;
  var R = radius(), cx = W / 2, cy = H / 2 + 8, t = performance.now() / 1000;
  proj.scale(R).translate([cx, cy]).rotate(rot);
  // fondo: estrellas que titilan y halo de atmósfera
  bctx.clearRect(0, 0, W, H);
  bctx.fillStyle = '#fff';
  stars.forEach(function (s) { bctx.globalAlpha = s[3] * (0.7 + 0.3 * Math.sin(t * 1.3 + s[4])); bctx.fillRect(s[0], s[1], s[2], s[2]); });
  bctx.globalAlpha = 1;
  var g = bctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.16);
  g.addColorStop(0, 'rgba(110,175,255,0.55)'); g.addColorStop(0.4, 'rgba(80,140,255,0.18)'); g.addColorStop(1, 'rgba(80,140,255,0)');
  bctx.fillStyle = g; bctx.beginPath(); bctx.arc(cx, cy, R * 1.16, 0, 2 * Math.PI); bctx.fill();

  var sat = GL && glReady;
  if (sat) drawGL(R, cx, cy);
  ctx.clearRect(0, 0, W, H);
  if (!sat) {
    ctx.beginPath(); path({ type: 'Sphere' }); ctx.fillStyle = '#0a1726'; ctx.fill();
  }
  if (D) {
    if (!sat) {
      var center = [-rot[0], -rot[1]];
      ctx.lineWidth = 0.7;
      for (var i = 0; i < cells.length; i++) {
        if (d3.geoDistance(centers[i], center) > 1.64) continue;
        ctx.beginPath(); path(polys[i]);
        ctx.fillStyle = colors[i]; ctx.strokeStyle = colors[i];
        ctx.fill(); ctx.stroke();
      }
      ctx.beginPath(); path(land); ctx.fillStyle = '#030406'; ctx.fill();
    }
    ctx.beginPath(); path(borders); ctx.strokeStyle = sat ? 'rgba(255,255,255,0.32)' : 'rgba(140,170,200,0.28)'; ctx.lineWidth = sat ? 0.6 : 0.5; ctx.stroke();
    if (!sat) { ctx.beginPath(); path(land); ctx.strokeStyle = 'rgba(170,200,230,0.6)'; ctx.lineWidth = 0.7; ctx.stroke(); }
  }
  ctx.beginPath(); path(graticule); ctx.strokeStyle = sat ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.5; ctx.stroke();
  if (D && colombia && S.focus === 'colombia') drawColombia();
  if (S.sel !== null && S.layer !== 'global') {
    var c = centers[S.sel];
    if (d3.geoDistance(c, [-rot[0], -rot[1]]) < Math.PI / 2) {
      ctx.beginPath(); path(polys[S.sel]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
      var p = proj(c), pr = 11 + 3 * Math.sin(t * 3);
      ctx.beginPath(); ctx.arc(p[0], p[1], pr, 0, 2 * Math.PI); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }
  ctx.beginPath(); path({ type: 'Sphere' }); ctx.strokeStyle = 'rgba(150,200,255,0.45)'; ctx.lineWidth = 1; ctx.stroke();
}
/* animación continua: nubes, estrellas y pulso del punto elegido */
var lastT = performance.now();
(function loop(now) {
  var dt = Math.min(100, now - lastT); lastT = now;
  if (S.clouds) cloudShift = (cloudShift + dt * 0.0000045) % 1;
  if (!S.reduceMotion) requestDraw();
  requestAnimationFrame(loop);
})(lastT);

function cellAt(lon, lat) {
  var r = Math.floor((D.lats[0] + 2 - lat) / 4);
  if (r < 0 || r >= NLAT) return null;
  var l = ((lon % 360) + 360) % 360;
  var c = Math.floor(((l - (D.lons[0] - 2)) % 360 + 360) % 360 / 4) % NLON;
  var k = r * NLON + c;
  return k in kToI ? kToI[k] : null;
}

/* ---------- colores ---------- */
function mapYear() { return clamp(S.year, Y0, Y0 + NY - 1); }
function cellValue(i, layer) {
  var k = cells[i], y = S.year;
  if (layer === 'trend') return trendB ? trendB[i] : NaN;
  y = mapYear();
  if (!hasYear(y)) return NaN;
  return layer === 'sst' ? valAt(y, k) : anomAt(y, k);
}
function computeTrends() {
  var a = Math.max(S.period[0], Y0), b = Math.min(S.period[1], Y0 + NY - 1);
  var n = b - a + 1;
  trendB = new Float32Array(cells.length); trendP = new Float32Array(cells.length);
  if (n < 6) { trendB.fill(NaN); trendP.fill(1); return; }
  var xs = d3.range(a, b + 1), ys = new Float64Array(n), up = 0, dn = 0, ns = 0;
  var mx = (a + b) / 2, sxx = 0;
  xs.forEach(function (x) { sxx += (x - mx) * (x - mx); });
  for (var i = 0; i < cells.length; i++) {
    var k = cells[i], my = 0, sxy = 0;
    for (var j = 0; j < n; j++) { ys[j] = anomAt(a + j, k); my += ys[j]; }
    my /= n;
    for (j = 0; j < n; j++) sxy += (xs[j] - mx) * (ys[j] - my);
    trendB[i] = sxy / sxx * 10;
    trendP[i] = mannKendall(xs, ys).p;
    var w = Math.cos(centers[i][1] * Math.PI / 180);
    if (trendP[i] >= 0.05) ns += w; else if (trendB[i] > 0) up += w; else dn += w;
  }
  var tot = up + dn + ns, pu = Math.round(up / tot * 100), pd = Math.round(dn / tot * 100), pn = 100 - pu - pd;
  $('#sUp').style.width = pu + '%'; $('#sNs').style.width = pn + '%'; $('#sDn').style.width = pd + '%';
  $('#tUp').textContent = '↑ ' + pu + ' % se calienta'; $('#tNs').textContent = pn + ' % sin cambio claro'; $('#tDn').textContent = '↓ ' + pd + ' % se enfría';
}
function recolor() {
  var layer = S.layer === 'upload' ? 'sst' : S.layer, sc = scales[layer];
  colors = new Array(cells.length);
  for (var i = 0; i < cells.length; i++) {
    var v = cellValue(i, layer === 'global' ? 'anom' : layer);
    if (!isFinite(v)) { colors[i] = '#26323d'; continue; }
    var col = sc(v);
    if (layer === 'trend' && trendP[i] >= 0.05) col = S.onlySig ? '#3a4652' : d3.interpolateRgb(col, '#4a5663')(0.65);
    colors[i] = col;
  }
  dataTexDirty = true;
  requestDraw();
}

/* ---------- leyenda ---------- */
function legend() {
  var layer = S.layer, sc = scales[layer], dom = sc.domain(), lo = dom[0], hi = dom[dom.length - 1];
  var cv = $('#legBar'), c2 = cv.getContext('2d');
  for (var x = 0; x < cv.width; x++) { c2.fillStyle = sc(lo + (hi - lo) * x / (cv.width - 1)); c2.fillRect(x, 0, 1, cv.height); }
  var th = $('#thumb'), c3 = th.getContext('2d');
  for (x = 0; x < th.width; x++) { c3.fillStyle = sc(lo + (hi - lo) * x / (th.width - 1)); c3.fillRect(x, 0, 1, th.height); }
  var d = layer === 'sst' ? 0 : 1;
  $('#legTicks').innerHTML = [lo, (lo + hi) / 2, hi].map(function (v) { return '<span>' + (layer === 'sst' ? fmt(v, 0) : sfmt(v, d)) + '</span>'; }).join('');
  $('#legUnit').textContent = layer === 'global' ? '°C frente a 1971–2000 (mar)' : layer === 'sst' ? '°C · mar: ERSSTv5 · tierra de Colombia: WorldClim' : LAYERS[layer].unit;
}
function showHover(v, text) {
  var sc = scales[S.layer], dom = sc.domain(), lo = dom[0], hi = dom[dom.length - 1];
  var mk = $('#legMk');
  if (v === null || !isFinite(v)) { mk.style.display = 'none'; $('#hoverVal').textContent = text || ''; return; }
  mk.style.display = 'block';
  mk.style.left = (clamp((v - lo) / (hi - lo), 0, 1) * 100) + '%';
  $('#hoverVal').textContent = text;
}

/* ---------- nombres de lugares ---------- */
function oceanName(lon, lat) {
  if (lat > 66) return 'Océano Ártico';
  if (lat < -58) return 'Océano Austral';
  if (lon > -98 && lon < -81 && lat > 18 && lat < 31) return 'Golfo de México';
  if (lon > -88 && lon < -60 && lat > 9 && lat < 22) return 'Mar Caribe';
  if (lon > -6 && lon < 36 && lat > 30 && lat < 46) return 'Mar Mediterráneo';
  var ocean;
  if (lon >= 20 && lon <= 147 && lat < 25 && !(lon > 100 && lat > -8)) ocean = 'Océano Índico';
  else if (lat >= 30) ocean = (lon > -100 && lon < 20) ? 'Océano Atlántico' : 'Océano Pacífico';
  else if (lat >= 8) ocean = (lon > -89 && lon < 20) ? 'Océano Atlántico' : 'Océano Pacífico';
  else ocean = (lon > -70 && lon < 20) ? 'Océano Atlántico' : 'Océano Pacífico';
  if (ocean === 'Océano Índico') return ocean;
  return ocean + (lat >= 0 ? ' Norte' : ' Sur');
}
function coordText(lon, lat) {
  return '≈ ' + fmt(Math.abs(lat), 0) + '° ' + (lat >= 0 ? 'N' : 'S') + ', ' + fmt(Math.abs(lon), 0) + '° ' + (lon >= 0 ? 'E' : 'O');
}

/* ---------- gráfica ---------- */
function chartSVG(xs, ys, res, o) {
  var w = 316, h = 160, m = { l: 34, r: 8, t: 8, b: 20 };
  var X = d3.scaleLinear().domain(d3.extent(xs)).range([m.l, w - m.r]);
  var vals = ys.filter(isFinite);
  if (o.zero) vals = vals.concat([0]);
  var ext = d3.extent(vals), pad = (ext[1] - ext[0]) * 0.1 || 1;
  var Y = d3.scaleLinear().domain([ext[0] - pad, ext[1] + pad]).range([h - m.b, m.t]).nice();
  var svg = d3.create('svg').attr('viewBox', '0 0 ' + w + ' ' + h).attr('role', 'img').attr('aria-label', o.aria || 'Serie de tiempo');
  if (o.period) {
    svg.append('rect').attr('x', X(o.period[0])).attr('width', Math.max(0, X(o.period[1]) - X(o.period[0]))).attr('y', m.t).attr('height', h - m.b - m.t).attr('fill', 'rgba(92,200,255,0.08)');
  }
  var yt = Y.ticks(4), ystep = yt.length > 1 ? yt[1] - yt[0] : 1, ydec = ystep >= 1 ? 0 : ystep >= 0.1 ? 1 : ystep >= 0.01 ? 2 : 3;
  yt.forEach(function (t) {
    svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', Y(t)).attr('y2', Y(t)).attr('stroke', t === 0 && o.zero ? '#56718a' : '#1f3a52').attr('stroke-dasharray', t === 0 && o.zero ? '3 3' : null);
    svg.append('text').attr('x', m.l - 4).attr('y', Y(t) + 3).attr('text-anchor', 'end').attr('font-size', 9).attr('fill', '#9fb6c8').text(fmt(t, ydec));
  });
  X.ticks(5).forEach(function (t) {
    svg.append('text').attr('x', X(t)).attr('y', h - 6).attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', '#9fb6c8').text(Math.round(t));
  });
  var line = d3.line().defined(function (d) { return isFinite(d[1]); }).x(function (d) { return X(d[0]); }).y(function (d) { return Y(d[1]); });
  var pts = xs.map(function (x, i) { return [x, ys[i]]; });
  svg.append('path').attr('d', line(pts)).attr('fill', 'none').attr('stroke', '#7f97ab').attr('stroke-width', xs.length > 200 ? 1 : 1.4);
  if (xs.length <= 160) {
    pts.forEach(function (d) { if (isFinite(d[1])) svg.append('circle').attr('cx', X(d[0])).attr('cy', Y(d[1])).attr('r', 1.8).attr('fill', '#cfe0ec'); });
  }
  if (res) {
    var sig = res.p < 0.05;
    svg.append('line').attr('x1', X(res.x0)).attr('x2', X(res.x1)).attr('y1', Y(res.a + res.b * res.x0)).attr('y2', Y(res.a + res.b * res.x1))
      .attr('stroke', res.b > 0 ? '#ff7a59' : '#5cb7ff').attr('stroke-width', 3).attr('stroke-linecap', 'round').attr('stroke-dasharray', sig ? null : '6 5');
  }
  if (o.marker !== undefined && o.marker >= X.domain()[0] && o.marker <= X.domain()[1]) {
    svg.append('line').attr('x1', X(o.marker)).attr('x2', X(o.marker)).attr('y1', m.t).attr('y2', h - m.b).attr('stroke', '#fff').attr('stroke-width', 1.2);
  }
  return svg.node().outerHTML;
}

/* ---------- veredicto ---------- */
function verdictHTML(res, o) {
  if (!res) return '<p class="verdict">No hay suficientes datos en este periodo (se necesitan al menos 6 valores).</p>';
  var per = o.per, dec = o.dec, unit = o.unit, k = o.k || 10, perL = o.perLabel || 'por década', short = k === 10 ? '/ déc.' : '/ año';
  var bk = res.b * k, up = res.b > 0;
  var s1 = res.p < 0.05, s2 = res.pmk < 0.05, sig = s1 && s2;
  var col = o.colors ? (up ? o.colors[0] : o.colors[1]) : (up ? '#ff7a59' : '#5cb7ff');
  var gauge = clamp(-Math.log10(Math.max(res.p, 1e-12)) / 4 * 100, 2, 98);
  var badge = sig ? ['Significativa', '#14532d', '#dcfce7'] : (s1 || s2) ? ['Dudosa', '#713f12', '#fde68a'] : ['No significativa', '#334155', '#e6eef5'];
  var sentence = sig
    ? o.subject + (up ? ' sube ' : ' baja ') + fmt(Math.abs(bk), dec) + ' ' + unit + ' ' + perL + ' entre ' + per + '. Las dos pruebas coinciden: es muy poco probable que este cambio sea casualidad.'
    : (s1 || s2)
      ? 'Las pruebas no coinciden (una da p < 0,05 y la otra no). Toma este resultado con cautela o prueba con un periodo más largo.'
      : 'No hay evidencia suficiente de una tendencia lineal entre ' + per + ': el cambio podría ser variabilidad natural o no seguir una recta. A veces hace falta un periodo más largo.';
  var tests = [['Regresión lineal (prueba t)', res.p], ['Mann-Kendall', res.pmk]].map(function (t) {
    var ok = t[1] < 0.05;
    return '<div><span class="ok" style="background:' + (ok ? '#22c55e' : '#64748b') + '">' + (ok ? '✓' : '✕') + '</span>' + t[0] + '<span class="p">p ' + pfmt(t[1]) + '</span></div>';
  }).join('');
  return '' +
    '<div class="row" style="justify-content:space-between"><span class="lbl">Veredicto · ' + esc(per) + '</span><span class="badge" style="background:' + badge[1] + ';color:' + badge[2] + '">' + badge[0] + '</span></div>' +
    '<div class="row" style="gap:10px"><span class="big" style="color:' + col + '">' + (up ? '↑ ' : '↓ ') + sfmt(bk, dec) + '</span><span class="src" style="line-height:1.25">' + esc(unit) + '<br>' + perL + '</span></div>' +
    '<div class="grid2">' +
      '<div class="kpi"><div class="k">Cambio total del periodo</div><div class="v">' + sfmt(res.b * (res.x1 - res.x0), dec) + ' ' + esc(unit) + '</div></div>' +
      '<div class="kpi"><div class="k">IC 95 % ' + perL + '</div><div class="v">' + sfmt(res.lo * k, dec) + ' a ' + sfmt(res.hi * k, dec) + '</div></div>' +
      '<div class="kpi"><div class="k">Pendiente de Sen</div><div class="v">' + sfmt(res.sen * k, dec) + ' ' + short + '</div></div>' +
      '<div class="kpi"><div class="k">Datos usados</div><div class="v">' + res.n + '</div></div>' +
    '</div>' +
    '<div><div class="src">Medidor de evidencia</div><div class="gauge"><div class="tr"></div><div class="th"></div><div class="kn" style="left:' + gauge.toFixed(1) + '%"></div></div><div class="gl"><span>Azar</span><span>p = 0,05</span><span>Muy fuerte</span></div></div>' +
    '<div class="tests">' + tests + '</div>' +
    '<p class="verdict">' + esc(sentence) + '</p>';
}

/* ---------- panel de análisis ---------- */
function renderAnalysis() {
  var box = $('#analysis');
  if (S.zone) { renderZone(); return; }
  if (S.layer === 'global') {
    var xs = gistemp.map(function (d) { return d[0]; }), ys = gistemp.map(function (d) { return d[1]; });
    var px = [], py = [];
    xs.forEach(function (x, i) { if (x >= S.period[0] && x <= S.period[1]) { px.push(x); py.push(ys[i]); } });
    var res = analyze(px, py);
    var yv = gistemp.filter(function (d) { return d[0] === S.year; })[0];
    $('#aTitle').textContent = 'Planeta Tierra';
    $('#aSub').textContent = 'NASA GISTEMP v4 · anomalía frente a 1951–1980';
    $('#aBody').innerHTML =
      (yv ? '<div class="row" style="align-items:baseline;gap:10px"><span class="big" style="color:' + (yv[1] > 0 ? '#ff7a59' : '#5cb7ff') + '">' + sfmt(yv[1], 2) + ' °C</span><span class="src">en ' + S.year + '</span></div>'
        : '<div class="src">' + S.year + ' aún no termina: NASA publica el promedio anual en enero. El último año completo es ' + gistemp[gistemp.length - 1][0] + '.</div>') +
      '<div class="chart">' + chartSVG(xs, ys, res, { zero: true, marker: S.year, period: S.period, aria: 'Temperatura global de 1880 a ' + gistemp[gistemp.length - 1][0] }) + '</div>' +
      verdictHTML(res, { per: S.period[0] + '–' + S.period[1], dec: 2, unit: '°C', subject: 'La temperatura global' });
    box.hidden = false;
    return;
  }
  if (S.sel === null) { box.hidden = true; return; }
  var k = cells[S.sel], c = centers[S.sel], useVal = S.layer === 'sst';
  var a = Math.max(S.period[0], Y0), b = Math.min(S.period[1], Y0 + NY - 1);
  var allX = d3.range(Y0, Y0 + NY), allY = allX.map(function (y) { return useVal ? valAt(y, k) : anomAt(y, k); });
  var px2 = d3.range(a, b + 1), py2 = px2.map(function (y) { return useVal ? valAt(y, k) : anomAt(y, k); });
  var r2 = analyze(px2, py2);
  var cur = hasYear(S.year) ? allY[S.year - Y0] : NaN;
  $('#aTitle').textContent = oceanName(c[0], c[1]);
  $('#aSub').textContent = coordText(c[0], c[1]) + ' · celda de 4° × 4°';
  $('#aBody').innerHTML =
    (isFinite(cur) ? '<div class="row" style="align-items:baseline;gap:10px"><span class="big" style="color:' + (useVal ? scales.sst(cur) : (cur > 0 ? '#ff7a59' : '#5cb7ff')) + '">' + (useVal ? fmt(cur, 1) : sfmt(cur, 2)) + ' °C</span><span class="src">' + (useVal ? 'promedio de ' : 'anomalía en ') + S.year + '</span></div>'
      : '<div class="src">Para ' + S.year + ' no hay dato del mar en el archivo incluido (llega hasta ' + (Y0 + NY - 1) + ').</div>') +
    '<div class="chart">' + chartSVG(allX, allY, r2, { zero: !useVal, marker: S.year, period: [a, b], aria: 'Serie anual de temperatura del mar en el punto' }) + '</div>' +
    verdictHTML(r2, { per: a + '–' + b, dec: 2, unit: '°C', subject: 'Aquí, la temperatura del mar' });
  box.hidden = false;
}

/* ---------- interfaz ---------- */
function setStep(i) { if (!S.done[i]) { S.done[i] = true; renderSteps(); } }
function renderSteps() {
  var all = S.done.concat([S.done[0] && S.done[1] && S.done[2] && !$('#analysis').hidden]);
  var cur = all.indexOf(false);
  var txt = ['Elige una capa en la barra de arriba', 'Toca un punto del mar o una zona de Colombia', 'Mueve la línea de tiempo o pulsa ▶', 'Lee el veredicto en el panel derecho'];
  $('#steps').innerHTML = txt.map(function (t, i) {
    return '<li class="' + (all[i] ? 'done' : i === cur ? 'cur' : '') + '"><span class="n">' + (all[i] ? '✓' : i + 1) + '</span>' + t + '</li>';
  }).join('');
}
function fillPeriod() {
  var r = LAYERS[S.layer].range, opts = d3.range(r[0], r[1] + 1).map(function (y) { return '<option>' + y + '</option>'; }).join('');
  $('#pStart').innerHTML = opts; $('#pEnd').innerHTML = opts;
  $('#pStart').value = S.period[0]; $('#pEnd').value = S.period[1];
}
var LAST_YEAR = 2026;
function tlRange() { return [S.focus === 'colombia' ? 1970 : LAYERS[S.layer].range[0], LAST_YEAR]; }
function currentEvents() {
  if (S.focus === 'colombia') return COL_EVENTS.filter(function (e) { return !S.zone || e.z.indexOf(S.zone) >= 0; });
  return EVENTS.filter(function (e) { return e.L.indexOf(S.layer) >= 0; });
}
function setupTimeline() {
  var r = tlRange(), inp = $('#year');
  inp.min = r[0]; inp.max = r[1]; S.year = clamp(S.year, r[0], r[1]); inp.value = S.year;
  var span = r[1] - r[0];
  var dec = d3.range(Math.ceil(r[0] / 10) * 10, r[1] + 1, span > 80 ? 20 : 10);
  var tk = [r[0]].concat(dec.filter(function (d) { return d - r[0] > span * 0.06 && r[1] - d > span * 0.06; })).concat([r[1]]);
  $('#ticks').innerHTML = tk.map(function (y) { return '<span>' + y + '</span>'; }).join('');
  var dots = $('#dots');
  dots.innerHTML = '';
  currentEvents().filter(function (e) { return e.y >= r[0] && e.y <= r[1]; }).forEach(function (e) {
    var b = document.createElement('button');
    b.style.left = ((e.y - r[0]) / span * 100) + '%';
    b.title = e.y + ' · ' + e.t;
    b.setAttribute('aria-label', 'Ir a ' + e.y + ': ' + e.t);
    b.addEventListener('click', function () { setYear(e.y, true); });
    dots.appendChild(b);
  });
}
function renderEvents() {
  var evs = currentEvents().filter(function (e) { return e.y === S.year; });
  var card = $('#eventCard');
  if (!evs.length) { card.hidden = true; return; }
  card.innerHTML = evs.map(function (e, i) {
    return '<div class="e"><div><b>' + e.y + ' · ' + esc(e.t) + '</b><p>' + esc(e.d) + '</p></div><button data-ev="' + i + '">Ver en el globo</button></div>';
  }).join('');
  card.hidden = false;
  card.querySelectorAll('button[data-ev]').forEach(function (b) {
    b.addEventListener('click', function () {
      var e = evs[+b.getAttribute('data-ev')];
      if (S.focus === 'colombia') flyTo(e.ll, false, Math.max(zoomK, 6.2)); else flyTo(e.ll, true);
    });
  });
}
function renderTitles() {
  var L = LAYERS[S.layer];
  $('#layerTitle').textContent = L.title;
  var t;
  if (S.layer === 'trend') t = 'Periodo ' + Math.max(S.period[0], Y0) + '–' + Math.min(S.period[1], Y0 + NY - 1);
  else if (!hasYear(S.year)) t = S.year + (S.year === LAST_YEAR ? ' (en curso)' : '') + ' · mar: último dato, ' + mapYear();
  else t = 'Promedio de enero a diciembre de ' + S.year;
  if (S.focus === 'colombia') t = 'Colombia · ' + t;
  $('#layerDate').textContent = t;
  $('#datePill').textContent = 'Año ' + S.year;
  canvas.setAttribute('aria-label', 'Globo terrestre: ' + L.title + ', ' + S.year + '. Arrastra para girar y toca un punto para analizarlo.');
}
function renderInfo() {
  var L = LAYERS[S.layer];
  $('#infoTitle').textContent = L.name;
  $('#infoDesc').textContent = L.desc;
  $('#infoSrc').textContent = L.src;
  $('#trendBox').style.display = S.layer === 'trend' ? 'flex' : 'none';
  $('#infoLinks').innerHTML = (LINKS[S.layer] || []).map(function (l) { return '<a href="' + l[1] + '" target="_blank" rel="noopener">› ' + esc(l[0]) + '</a>'; }).join('');
  renderSteps();
}
function refresh() {
  renderTitles(); renderEvents(); recolor();
  renderAnalysis(); renderSteps();
  if (S.focus === 'colombia') renderZoneTemps();
  renderYearTable();
}
function setYear(y, user) {
  S.year = y; $('#year').value = y;
  if (user) setStep(2);
  refresh();
}
function setLayer(id, user) {
  if (id === 'upload') { $('#upZone').textContent = S.zone ? ' · ' + zoneById(S.zone).short : ''; openOverlay('#uploadView'); if (user) setStep(0); return; }
  var prevRange = LAYERS[S.layer].range;
  S.layer = id;
  document.querySelectorAll('.tool').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-layer') === id)); });
  var r = LAYERS[id].range;
  if (prevRange[0] !== r[0] || prevRange[1] !== r[1]) {
    S.period = id === 'global' ? [1970, 2025] : [1970, 2021];
    S.year = clamp(S.year, tlRange()[0], tlRange()[1]);
  }
  if (user) setStep(0);
  fillPeriod(); setupTimeline(); legend(); renderInfo();
  if (id === 'trend' || !trendB) computeTrends();
  refresh();
}

/* ---------- animación ---------- */
var playTimer = null;
function speedMs() { return [1400, 1000, 700, 450, 280, 160][+$('#speed').value - 1]; }
function setPlaying(on) {
  S.playing = on;
  clearInterval(playTimer); playTimer = null;
  $('#play').setAttribute('aria-label', on ? 'Pausar' : 'Reproducir');
  $('#playIc').innerHTML = on ? '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>' : '<path d="M7 4.5v15l13-7.5z"/>';
  if (on) {
    var r = tlRange();
    if (S.year >= r[1]) setYear(r[0], true);
    playTimer = setInterval(function () {
      var r2 = tlRange();
      if (S.year >= r2[1]) { setPlaying(false); return; }
      setYear(S.year + 1, true);
    }, speedMs());
  }
}
var autoRaf = null;
function autoSpin() {
  if (!S.auto) return;
  rot[0] += 0.06; requestDraw();
  autoRaf = requestAnimationFrame(autoSpin);
}
function stopAuto() { S.auto = false; if (autoRaf) cancelAnimationFrame(autoRaf); autoRaf = null; var b = $('#spinBtn'); if (b) b.setAttribute('aria-pressed', 'false'); }
function startAuto() { if (S.auto) return; S.auto = true; var b = $('#spinBtn'); if (b) b.setAttribute('aria-pressed', 'true'); autoSpin(); }
function flyTo(ll, select, zTo) {
  stopAuto();
  var z0 = zoomK, z1 = zTo || zoomK;
  var from = rot.slice(), to = [-ll[0], -ll[1]];
  var dl = ((to[0] - from[0]) % 360 + 540) % 360 - 180;
  to[0] = from[0] + dl;
  var it = d3.interpolate(from, to), t0 = performance.now();
  (function tick(now) {
    var t = Math.min(1, (now - t0) / 900), e = d3.easeCubicInOut(t);
    rot = it(e); zoomK = z0 + (z1 - z0) * e; $('#zoom').value = zoomK; requestDraw();
    if (t < 1) requestAnimationFrame(tick);
    else if (select && S.layer !== 'global') {
      var i = cellAt(ll[0], ll[1]);
      if (i !== null) { S.sel = i; setStep(1); renderAnalysis(); renderSteps(); requestDraw(); }
    }
  })(t0);
}

/* ---------- eventos de puntero ---------- */
var drag = null;
function evPos(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function geoAt(pt) {
  var g = proj.invert(pt);
  if (!g || !isFinite(g[0])) return null;
  if (d3.geoDistance(g, [-rot[0], -rot[1]]) > Math.PI / 2 - 0.01) return null;
  return g;
}
canvas.addEventListener('pointerdown', function (e) {
  canvas.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, rot: rot.slice(), moved: false };
  stopAuto();
});
canvas.addEventListener('pointermove', function (e) {
  if (drag) {
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;
    var k = 0.28 / zoomK;
    rot = [drag.rot[0] + dx * k, clamp(drag.rot[1] - dy * k, -85, 85)];
    requestDraw();
    return;
  }
  hover(evPos(e));
});
canvas.addEventListener('pointerup', function (e) {
  if (drag && !drag.moved) pick(evPos(e));
  drag = null;
});
canvas.addEventListener('pointerleave', function () { showHover(null, ''); });
canvas.addEventListener('wheel', function (e) {
  e.preventDefault(); stopAuto();
  setZoom(zoomK * Math.exp(-e.deltaY * 0.0012));
}, { passive: false });
canvas.addEventListener('keydown', function (e) {
  var k = { ArrowLeft: [-6, 0], ArrowRight: [6, 0], ArrowUp: [0, -6], ArrowDown: [0, 6] }[e.key];
  if (k) { e.preventDefault(); stopAuto(); rot = [rot[0] + k[0], clamp(rot[1] + k[1], -85, 85)]; requestDraw(); }
  if (e.key === '+' || e.key === '=') setZoom(zoomK * 1.2);
  if (e.key === '-') setZoom(zoomK / 1.2);
  if (e.key === 'Enter') pick([W / 2, H / 2 + 8]);
});
function setZoom(z) { zoomK = clamp(z, 0.8, 14); $('#zoom').value = zoomK; requestDraw(); }
function hover(pt) {
  if (!D) return;
  if (S.focus === 'colombia') {
    var mz = markerAt(pt);
    canvas.style.cursor = mz ? 'pointer' : '';
    if (mz) { showHover(null, zoneById(mz).n + '. ' + zoneById(mz).name + ' · toca para ver la ficha'); return; }
  }
  var g = geoAt(pt);
  if (!g) { showHover(null, ''); return; }
  var lv = landAt(g[0], g[1]);
  if (lv !== null && S.layer === 'sst') { showHover(lv, 'Aire: ' + fmt(lv, 1) + ' °C de promedio anual · ' + coordText(g[0], g[1])); return; }
  var i = cellAt(g[0], g[1]);
  if (i === null) { showHover(null, 'Tierra firme · sin datos del mar'); return; }
  var layer = S.layer === 'global' ? 'anom' : S.layer, v = cellValue(i, layer);
  if (!isFinite(v)) { showHover(null, 'Sin datos para este año'); return; }
  var txt = layer === 'sst' ? fmt(v, 1) + ' °C' : layer === 'anom' ? sfmt(v, 2) + ' °C' : sfmt(v, 2) + ' °C/década' + (trendP[i] >= 0.05 ? ' (no signif.)' : '');
  showHover(v, txt + ' · ' + coordText(g[0], g[1]));
}
function pick(pt) {
  if (S.focus === 'colombia') { var mz = markerAt(pt); if (mz) { selectZone(mz); return; } }
  var g = geoAt(pt);
  if (!g) return;
  if (S.focus === 'colombia' && LIVE.status === 'ok' && landAt(g[0], g[1]) !== null) {
    showHover(null, 'Consultando la temperatura actual…');
    fetch(API_BASE + '/api/temperatura?lat=' + g[1].toFixed(3) + '&lon=' + g[0].toFixed(3))
      .then(function (r) { return r.json(); })
      .then(function (p) { showHover(p.temperatura_c, p.temperatura_c === null || p.temperatura_c === undefined ? 'Sin dato en este punto' : 'Ahora: ' + fmt(p.temperatura_c, 1) + ' °C' + (p.descripcion ? ' · ' + p.descripcion : '') + ' · ' + coordText(g[0], g[1])); })
      .catch(function () { showHover(null, 'No se pudo consultar ese punto'); });
    return;
  }
  var i = cellAt(g[0], g[1]);
  if (i === null) { showHover(null, 'Toca un punto del mar: en tierra firme no hay datos'); return; }
  if (S.layer === 'global') setLayer('anom', false);
  S.sel = i; S.zone = null; setStep(1); renderZoneList(); setupTimeline(); renderEvents();
  renderAnalysis(); renderSteps(); requestDraw();
}

/* ---------- Colombia: zonas ---------- */
function zoneById(id) { return ZONES.filter(function (z) { return z.id === id; })[0]; }
function bboxPoly(b) { return { type: 'Polygon', coordinates: [[[b[0], b[3]], [b[2], b[3]], [b[2], b[1]], [b[0], b[1]], [b[0], b[3]]]] }; }
function markers() {
  var m = [];
  ZONES.forEach(function (z) { m.push({ id: z.id, ll: z.ll, z: z, side: z.side || 'right', sea: 'sanandres' }); if (z.ll2) m.push({ id: z.id, ll: z.ll2, z: z, side: z.side2 || 'right', sea: 'caribe' }); });
  return m;
}
function markerAt(pt) {
  var center = [-rot[0], -rot[1]], best = null, bd = 18;
  markers().forEach(function (m) {
    if (d3.geoDistance(m.ll, center) > Math.PI / 2 - 0.05) return;
    var p = proj(m.ll), d = Math.hypot(p[0] - pt[0], p[1] - pt[1]);
    if (d < bd) { bd = d; best = m.id; }
  });
  return best;
}
function drawColombia() {
  var center = [-rot[0], -rot[1]];
  ctx.beginPath(); path(colombia); ctx.fillStyle = 'rgba(251,191,36,0.07)'; ctx.fill();
  ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.6; ctx.stroke();
  if (S.zone) {
    var zz = zoneById(S.zone);
    [zz.bbox, zz.bbox2].forEach(function (b) {
      if (!b) return;
      ctx.beginPath(); path(bboxPoly(b)); ctx.setLineDash([5, 3]); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.setLineDash([]);
    });
  }
  ctx.textBaseline = 'middle';
  markers().forEach(function (m) {
    if (d3.geoDistance(m.ll, center) > Math.PI / 2 - 0.05) return;
    var p = proj(m.ll), on = S.zone === m.id, r = on ? 13 : 11;
    if (on) { ctx.beginPath(); ctx.arc(p[0], p[1], r + 4, 0, 2 * Math.PI); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * Math.PI); ctx.fillStyle = '#fbbf24'; ctx.fill();
    ctx.strokeStyle = '#1a1300'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#1a1300'; ctx.font = '700 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(String(m.z.n), p[0], p[1] + 0.5);
    if (zoomK >= 2.2) {
      var tx = p[0] + r + 5, ty = p[1], al = 'left';
      if (m.side === 'left') { tx = p[0] - r - 5; al = 'right'; }
      if (m.side === 'below') { tx = p[0]; ty = p[1] + r + 10; al = 'center'; }
      ctx.font = '600 12px Inter, system-ui, sans-serif'; ctx.textAlign = al;
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(m.z.short, tx, ty);
      ctx.fillStyle = on ? '#fde68a' : '#ffffff'; ctx.fillText(m.z.short, tx, ty);
      var mt = markerTemp(m);
      if (mt) {
        var ty2 = ty + 15;
        var lbl = fmt(mt.v, 1) + ' °C ' + mt.kind;
        ctx.font = '700 13px Inter, system-ui, sans-serif';
        var tw = ctx.measureText(lbl).width, bx = al === 'left' ? tx - 4 : al === 'right' ? tx - tw - 4 : tx - tw / 2 - 4;
        ctx.fillStyle = 'rgba(5,10,20,0.82)';
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx, ty2 - 9, tw + 8, 18, 5); else ctx.rect(bx, ty2 - 9, tw + 8, 18); ctx.fill();
        ctx.strokeStyle = scales.sst(mt.v); ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = d3.color(scales.sst(mt.v)).brighter(0.6).formatHex(); ctx.fillText(lbl, tx, ty2 + 0.5);
      }
      var lp = liveForMarker(m);
      if (lp) {
        var ty3 = ty + (mt ? 35 : 15), l3 = '● Ahora ' + fmt(lp.temperatura_c, 1) + ' °C';
        ctx.font = '700 13px Inter, system-ui, sans-serif';
        var tw3 = ctx.measureText(l3).width, bx3 = al === 'left' ? tx - 4 : al === 'right' ? tx - tw3 - 4 : tx - tw3 / 2 - 4;
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx3, ty3 - 9, tw3 + 8, 18, 5); else ctx.rect(bx3, ty3 - 9, tw3 + 8, 18); ctx.fill();
        ctx.fillStyle = '#b91c1c'; ctx.fillText(l3, tx, ty3 + 0.5);
      }
    }
  });
}
/* ---------- tiempo real (API propia + Google Weather) ---------- */
var LIVE = { data: null, status: 'idle', at: null, err: '' };
var API_BASE = String(window.DT_API || '').replace(/\/$/, '');
var LIVE_NAMES = { sanandres: 'San Andrés', caribe: 'Ciénaga Grande de Santa Marta' };
function fetchLive() {
  LIVE.status = 'loading'; renderLive();
  fetch(API_BASE + '/api/zonas', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (j) {
      if (!j || !j.puntos) throw new Error('respuesta inválida');
      LIVE.data = j; LIVE.status = 'ok'; LIVE.at = new Date();
      renderLive(); requestDraw(); if (S.zone) renderZone(); renderYearTable();
    })
    .catch(function (e) { LIVE.status = 'off'; LIVE.err = e.message; renderLive(); renderYearTable(); });
}
function livePoints(zoneId) {
  return LIVE.data ? LIVE.data.puntos.filter(function (p) { return p.zona === zoneId && p.temperatura_c !== null && p.temperatura_c !== undefined; }) : [];
}
function liveForMarker(m) {
  var pts = livePoints(m.id);
  if (m.id === 'caribe') pts = pts.filter(function (p) { return p.nombre === LIVE_NAMES[m.sea]; });
  return pts[0] || null;
}
function renderLive() {
  var st = $('#liveStatus');
  if (!st) return;
  var src = LIVE.data && LIVE.data.puntos.filter(function (p) { return p.fuente; })[0];
  st.textContent = LIVE.status === 'loading' ? 'Consultando la API…'
    : LIVE.status === 'ok' ? 'Actualizado a las ' + LIVE.at.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) + (src ? ' · ' + src.fuente : '')
    : LIVE.status === 'off' ? 'No disponible en esta vista: la vista previa bloquea servidores externos. Aparece al publicar la app con su API (Cloud Run).'
    : 'Toca «Actualizar» para consultar.';
}
setInterval(function () { if (S.focus === 'colombia' && LIVE.status === 'ok') fetchLive(); }, 10 * 60 * 1000);
var ZTP = {
  nevados: [[-75.32, 4.89], [-75.37, 4.82], [-75.33, 4.66]],
  sierra: [[-73.69, 10.84]],
  amazonia: [[-74.5, 1.0], [-72.6, 0.6], [-72.64, 2.57]],
  chingaza: [[-73.75, 4.6], [-74.3, 3.9]],
  choco: [[-76.65, 5.69], [-76.53, 5.5]]
};
function landAt(lon, lat) {
  if (!CLIMA) return null;
  var c = Math.floor((lon - CLIMA.lon0) / CLIMA.res), r = Math.floor((CLIMA.lat1 - lat) / CLIMA.res);
  if (c < 0 || r < 0 || c >= CLIMA.nx || r >= CLIMA.ny) return null;
  var v = CLIMA.v[r * CLIMA.nx + c];
  return v === null || v === undefined ? null : v;
}
function zoneTemp(id, seaKey) {
  if (id === 'caribe') {
    var zz = SSTZ[seaKey || 'sanandres'], y = clamp(S.year, 1970, 1969 + zz.v.length);
    return { v: zz.v[y - 1970], kind: 'mar', note: 'temperatura del mar en ' + y + ' (NOAA ERSSTv5)' };
  }
  var vals = (ZTP[id] || []).map(function (p) { return landAt(p[0], p[1]); }).filter(function (v) { return v !== null; });
  if (!vals.length) return null;
  return { v: d3.mean(vals), kind: 'aire', note: 'temperatura media del aire 1950–2000 (WorldClim), en celdas de ~55 km' };
}
function markerTemp(m) { return zoneTemp(m.id, m.sea); }
function renderZoneTemps() {
  var box = $('#ztemps');
  if (!box || !CLIMA) return;
  var rows = ZONES.map(function (z) { return { z: z, t: zoneTemp(z.id) }; }).filter(function (r) { return r.t; });
  rows.sort(function (a, b) { return b.t.v - a.t.v; });
  box.innerHTML = rows.map(function (r) {
    return '<button class="trow" data-zone="' + r.z.id + '"><span class="tn">' + r.z.n + '. ' + esc(r.z.short) + '</span><span class="tb"><span style="width:' + clamp(r.t.v / 30 * 100, 4, 100) + '%;background:' + scales.sst(r.t.v) + '"></span></span><span class="tv">' + fmt(r.t.v, 1) + ' °C</span></button>';
  }).join('') + '<div class="src">Aire: WorldClim (promedio 1950–2000, celdas de ~55 km). Caribe: temperatura del mar de ' + clamp(S.year, 1970, 2021) + '.</div>';
  box.querySelectorAll('[data-zone]').forEach(function (b) { b.addEventListener('click', function () { selectZone(b.getAttribute('data-zone')); }); });
}
function renderZoneList() {
  renderZoneTemps();
  var box = $('#zlist');
  if (!box) return;
  box.innerHTML = ZONES.map(function (z) {
    return '<button class="zitem" data-zone="' + z.id + '" aria-pressed="' + (S.zone === z.id) + '"><span class="num">' + z.n + '</span><span><b>' + esc(z.short) + '</b><small>' + esc(z.where) + '</small></span></button>';
  }).join('');
  box.querySelectorAll('[data-zone]').forEach(function (b) { b.addEventListener('click', function () { selectZone(b.getAttribute('data-zone')); }); });
}
function selectZone(id) {
  var z = zoneById(id);
  S.zone = id; S.sel = null; S.zoneTab = 'resumen';
  setStep(1); renderZoneList(); setupTimeline(); renderEvents();
  flyTo(z.ll2 ? [(z.ll[0] + z.ll2[0]) / 2, (z.ll[1] + z.ll2[1]) / 2] : z.ll, false, z.ll2 ? 5.2 : 9.5);
  renderAnalysis(); renderSteps();
}
function setFocus(f) {
  S.focus = f;
  document.querySelectorAll('[data-focus]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-focus') === f)); });
  $('#zoneBox').hidden = f !== 'colombia';
  if (f === 'colombia') {
    S.sel = null;
    if (S.layer === 'global') setLayer('anom', false);
    if (S.layer !== 'sst') setLayer('sst', false);
    if (LIVE.status === 'idle') fetchLive();
    flyTo([-74, 4.6], false, 6.2);
  } else {
    S.zone = null;
    flyTo([-75, 8], false, 1);
    S.year = clamp(S.year, tlRange()[0], tlRange()[1]);
  }
  renderZoneList(); setupTimeline(); refresh();
}
var PALETTE = ['#5cc8ff', '#fbbf24', '#f472b6', '#a3e635'];
function chartMulti(names) {
  var w = 316, h = 170, m = { l: 34, r: 8, t: 8, b: 20 };
  var all = []; names.forEach(function (n) { all = all.concat(GLACIER[n]); });
  var X = d3.scaleLinear().domain([1850, 2024]).range([m.l, w - m.r]);
  var Y = d3.scaleLinear().domain([0, d3.max(all, function (d) { return d[1]; }) * 1.08]).range([h - m.b, m.t]).nice();
  var svg = d3.create('svg').attr('viewBox', '0 0 ' + w + ' ' + h).attr('role', 'img').attr('aria-label', 'Área glaciar de ' + names.join(', ') + ' desde 1850');
  Y.ticks(4).forEach(function (t) {
    svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', Y(t)).attr('y2', Y(t)).attr('stroke', '#1f3a52');
    svg.append('text').attr('x', m.l - 4).attr('y', Y(t) + 3).attr('text-anchor', 'end').attr('font-size', 9).attr('fill', '#9fb6c8').text(fmt(t, 0));
  });
  [1850, 1900, 1950, 2000, 2024].forEach(function (t) {
    svg.append('text').attr('x', X(t)).attr('y', h - 6).attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', '#9fb6c8').text(t);
  });
  names.forEach(function (n, i) {
    var pts = GLACIER[n];
    svg.append('path').attr('d', d3.line().x(function (d) { return X(d[0]); }).y(function (d) { return Y(d[1]); })(pts)).attr('fill', 'none').attr('stroke', PALETTE[i]).attr('stroke-width', 2.2);
    pts.forEach(function (d) { svg.append('circle').attr('cx', X(d[0])).attr('cy', Y(d[1])).attr('r', 3).attr('fill', PALETTE[i]); });
  });
  return svg.node().outerHTML;
}
function glacierBlock(names) {
  var legend = names.map(function (n, i) { return '<span><i style="background:' + PALETTE[i] + '"></i>' + esc(n) + '</span>'; }).join('');
  var rows = names.map(function (n) {
    var p = GLACIER[n], a = p[0], b = p[p.length - 1];
    return '<tr><td>' + esc(n) + '</td><td>' + fmt(a[1], 1) + '</td><td>' + fmt(b[1], 2) + ' <span class="src">(' + b[0] + ')</span></td><td style="color:#ff9b7a;font-weight:700">−' + fmt((1 - b[1] / a[1]) * 100, 1) + ' %</td></tr>';
  }).join('');
  return '<div class="blk"><h3>Área glaciar (km²) desde 1850</h3><div class="chart">' + chartMulti(names) + '</div><div class="legrow">' + legend + '</div>' +
    '<table class="mini"><thead><tr><th>Glaciar</th><th>≈1850</th><th>Último dato</th><th>Pérdida</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div class="src">Fuente: IDEAM. Las décadas de 1950, 1980 y 1990 se dibujan en su punto medio. Con tan pocos puntos irregulares no se aplican pruebas de tendencia: la pérdida es evidente en la tabla. <a href="' + SRC.ideamTabla[1] + '" target="_blank" rel="noopener">Tabla IDEAM</a> · <a href="' + SRC.ideamPpt[1] + '" target="_blank" rel="noopener">Datos 2022–2024</a></div></div>';
}
function sstBlock(key) {
  var zz = SSTZ[key], xs = d3.range(1970, 1970 + zz.v.length), ys = zz.v;
  var res = analyze(xs, ys);
  return '<div class="blk"><h3>Temperatura del mar · ' + esc(zz.name) + '</h3><div class="chart">' + chartSVG(xs, ys, res, { marker: S.year, aria: 'Temperatura del mar ' + zz.name }) + '</div>' +
    verdictHTML(res, { per: '1970–2021', dec: 2, unit: '°C', subject: 'La temperatura del mar' }) +
    '<div class="src">Promedio anual de NOAA ERSSTv5 en una ' + esc(zz.cell) + '.</div></div>';
}
function deforBlock() {
  var xs = DEFOR.map(function (d) { return d[0]; }), ys = DEFOR.map(function (d) { return d[1]; });
  var res = analyze(xs, ys);
  var w = 316, h = 170, m = { l: 40, r: 8, t: 8, b: 20 };
  var X = d3.scaleBand().domain(xs).range([m.l, w - m.r]).padding(0.18);
  var Y = d3.scaleLinear().domain([0, 240000]).range([h - m.b, m.t]);
  var svg = d3.create('svg').attr('viewBox', '0 0 ' + w + ' ' + h).attr('role', 'img').attr('aria-label', 'Deforestación anual en Colombia 2013 a ' + DEFOR[DEFOR.length - 1][0]);
  [0, 80000, 160000, 240000].forEach(function (t) {
    svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', Y(t)).attr('y2', Y(t)).attr('stroke', '#1f3a52');
    svg.append('text').attr('x', m.l - 4).attr('y', Y(t) + 3).attr('text-anchor', 'end').attr('font-size', 9).attr('fill', '#9fb6c8').text(t ? fmt(t / 1000, 0) + ' mil' : '0');
  });
  DEFOR.forEach(function (d) {
    svg.append('rect').attr('x', X(d[0])).attr('width', X.bandwidth()).attr('y', Y(d[1])).attr('height', Y(0) - Y(d[1])).attr('rx', 2).attr('fill', d[0] === 2017 ? '#f97316' : d[0] === 2023 ? '#22c55e' : '#d97706');
    if (d[0] % 2 === 1) svg.append('text').attr('x', X(d[0]) + X.bandwidth() / 2).attr('y', h - 6).attr('text-anchor', 'middle').attr('font-size', 9).attr('fill', '#9fb6c8').text("'" + String(d[0]).slice(2));
  });
  if (res) {
    var x0 = X(xs[0]) + X.bandwidth() / 2, x1 = X(xs[xs.length - 1]) + X.bandwidth() / 2;
    svg.append('line').attr('x1', x0).attr('x2', x1).attr('y1', Y(res.a + res.b * xs[0])).attr('y2', Y(res.a + res.b * xs[xs.length - 1])).attr('stroke', '#fff').attr('stroke-width', 2).attr('stroke-dasharray', res.p < 0.05 ? null : '6 5');
  }
  var dmax = DEFOR_DEP[0][1];
  var deps = DEFOR_DEP.map(function (d) {
    return '<div class="row" style="gap:8px;flex-wrap:nowrap"><span style="width:70px;font-size:12.5px">' + d[0] + '</span><span style="flex:1;height:12px;background:#24384a;border-radius:99px;overflow:hidden"><span style="display:block;height:100%;width:' + (d[1] / dmax * 100) + '%;background:#d97706"></span></span><span style="width:62px;text-align:right;font-size:12.5px">' + fmt(d[1], 0) + '</span></div>';
  }).join('');
  return '<div class="blk"><h3>Deforestación en Colombia (ha por año)</h3><div class="chart">' + chartSVG_placeholder(svg) + '</div>' +
    '<div class="legrow"><span><i style="background:#f97316"></i>Máximo 2017: 219.552 ha</span><span><i style="background:#22c55e"></i>Mínimo 2023: 79.256 ha</span></div>' +
    verdictHTML(res, { per: '2013–' + DEFOR[DEFOR.length - 1][0], dec: 0, unit: 'ha', subject: 'La deforestación', k: 1, perLabel: 'por año', colors: ['#f97316', '#22c55e'] }) +
    '<div class="src">Cifras oficiales del IDEAM (SMByC). <a href="' + SRC.deforSerie[1] + '" target="_blank" rel="noopener">Serie</a> · <a href="' + SRC.defor24[1] + '" target="_blank" rel="noopener">2024</a> · <a href="' + SRC.defor25[1] + '" target="_blank" rel="noopener">2025</a></div></div>' +
    '<div class="blk"><h3>Departamentos con más deforestación en ' + DEFOR_DEP_YEAR + ' (ha)</h3>' + deps + '<div class="src">Fuente: <a href="' + SRC.defor25dep[1] + '" target="_blank" rel="noopener">IDEAM vía Mongabay</a></div></div>';
}
function chartSVG_placeholder(svg) { return svg.node().outerHTML; }
function zoneTabHTML(z) {
  if (S.zoneTab === 'resumen') {
    return '<ul class="facts">' + z.facts.map(function (f) {
      var src = SRC[f[1]];
      return '<li>' + esc(f[0]) + ' <a href="' + src[1] + '" target="_blank" rel="noopener">' + esc(src[0]) + '</a></li>';
    }).join('') + '</ul>';
  }
  if (S.zoneTab === 'datos') {
    if (!z.data.length) return '<p class="verdict">Para esta zona aún no hay una serie incluida en la app. En la pestaña «Investiga con NASA» tienes el recuadro exacto y las variables para descargar la lluvia de GPM y analizarla aquí mismo.</p>';
    return z.data.map(function (d) {
      if (d.indexOf('glacier:') === 0) return glacierBlock(d.slice(8).split(','));
      if (d.indexOf('sst:') === 0) return sstBlock(d.slice(4));
      if (d === 'defor') return deforBlock();
      return '';
    }).join('');
  }
  if (S.zoneTab === 'investiga') {
    var boxes = [z.bbox].concat(z.bbox2 ? [z.bbox2] : []);
    var bx = boxes.map(function (b, i) {
      var txt = b.join(', ');
      return '<div class="lbl">' + (boxes.length > 1 ? (i ? 'Ciénaga Grande' : 'San Andrés y Providencia') : 'Recuadro de la zona') + ' · oeste, sur, este, norte</div><div class="row" style="flex-wrap:nowrap"><div class="code" style="flex:1">' + txt + '</div><button class="btn" data-copy="' + txt + '">Copiar</button></div>';
    }).join('');
    return '<div class="blk">' + bx + '<div class="src">Pega el recuadro en la casilla «Region» de Giovanni.</div></div>' +
      '<div class="blk"><div class="lbl">Variables recomendadas</div><div class="vars">' + z.vars.map(function (v) { return '<div><b>' + esc(v[0]) + '</b> · ' + esc(v[1]) + '</div>'; }).join('') + '</div></div>' +
      '<div class="blk"><ol class="howto"><li>Abre <a href="https://giovanni.gsfc.nasa.gov/giovanni/" target="_blank" rel="noopener">NASA Giovanni</a> y elige <b>Time Series, Area-Averaged</b>.</li><li>Pega el recuadro, elige la variable y las fechas (por ejemplo 2001–2025).</li><li>Descarga el CSV y analízalo aquí.</li></ol><button class="btn gold" data-up>Analizar un CSV de esta zona</button></div>';
  }
  var evs = COL_EVENTS.filter(function (e) { return e.z.indexOf(z.id) >= 0; });
  return '<div class="evlist">' + evs.map(function (e, i) {
    return '<button data-evy="' + i + '"><span class="yr">' + e.y + '</span><span><b>' + esc(e.t) + '</b><small>' + esc(e.d) + '</small></span></button>';
  }).join('') + '</div><div class="src">Toca un evento para ir a ese año en la línea de tiempo.</div>';
}
function renderZone() {
  var z = zoneById(S.zone);
  $('#aTitle').textContent = z.n + '. ' + z.name;
  $('#aSub').textContent = z.where;
  var tabs = [['resumen', 'Resumen'], ['datos', 'Datos'], ['investiga', 'Investiga'], ['eventos', 'Eventos']];
  $('#aBody').innerHTML =
    '<div class="chips">' + z.chips.map(function (c) { return '<div class="chip"><b>' + esc(c[0]) + '</b><span>' + esc(c[1]) + '</span></div>'; }).join('') + '</div>' +
    (function () {
      var t1 = zoneTemp(z.id, 'sanandres'), t2 = z.ll2 ? zoneTemp(z.id, 'caribe') : null;
      if (!t1) return '';
      var bar = function (t, lab) { return '<div class="row" style="gap:8px;flex-wrap:nowrap"><span style="font-size:12.5px;width:96px">' + lab + '</span><span class="tb" style="flex:1"><span style="width:' + clamp(t.v / 30 * 100, 4, 100) + '%;background:' + scales.sst(t.v) + '"></span></span><b style="color:' + scales.sst(t.v) + '">' + fmt(t.v, 1) + ' °C</b></div>'; };
      return '<div class="kpi" style="display:flex;flex-direction:column;gap:6px"><div class="k">Temperatura de la zona</div>' +
        (t2 ? bar(t1, 'San Andrés') + bar(t2, 'Ciénaga Grande') : bar(t1, t1.kind === 'mar' ? 'Mar' : 'Aire')) +
        '<div class="src">' + esc(t1.note) + '.</div></div>';
    })() +
    (function () {
      var lp = livePoints(z.id);
      if (!lp.length) return LIVE.status === 'off' ? '<div class="kpi"><div class="k">Ahora mismo</div><div class="src">La temperatura en tiempo real aparece cuando la app se publica con su API (Google Weather).</div></div>' : '';
      return '<div class="kpi" style="display:flex;flex-direction:column;gap:6px"><div class="k">Ahora mismo · ' + esc(lp[0].fuente || '') + '</div>' + lp.map(function (p) {
        return '<div class="row" style="gap:8px;flex-wrap:nowrap">' + (p.icono ? '<img src="' + esc(p.icono) + '" alt="" width="26" height="26" onerror="this.remove()">' : '') +
          '<span style="flex:1;font-size:12.5px">' + esc(p.nombre) + (p.descripcion ? '<br><span class="src">' + esc(p.descripcion) + (p.humedad_pct !== null && p.humedad_pct !== undefined ? ' · humedad ' + p.humedad_pct + ' %' : '') + '</span>' : '') + '</span>' +
          '<b style="font-size:18px;color:' + scales.sst(p.temperatura_c) + '">' + fmt(p.temperatura_c, 1) + ' °C</b></div>' +
          (p.aire && p.aire.ica !== null && p.aire.ica !== undefined ? '<div class="src">Aire: ' + esc(p.aire.categoria || '') + ' (ICA ' + p.aire.ica + ')</div>' : '') +
          (p.sensacion_c !== null && p.sensacion_c !== undefined ? '<div class="src">Sensación térmica ' + fmt(p.sensacion_c, 1) + ' °C' + (p.max_24h_c !== null && p.max_24h_c !== undefined ? ' · máx. 24 h ' + fmt(p.max_24h_c, 1) + ' °C · mín. ' + fmt(p.min_24h_c, 1) + ' °C' : '') + '</div>' : '');
      }).join('') + '</div>';
    })() +
    '<div class="tabs" role="tablist">' + tabs.map(function (t) { return '<button role="tab" data-tab="' + t[0] + '" aria-selected="' + (S.zoneTab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
    '<div class="tabbody" role="tabpanel">' + zoneTabHTML(z) + '</div>';
  var body = $('#aBody');
  body.querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { S.zoneTab = b.getAttribute('data-tab'); renderZone(); }); });
  body.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var txt = b.getAttribute('data-copy');
      try {
        navigator.clipboard.writeText(txt).then(function () { b.textContent = '¡Copiado!'; }, function () { b.textContent = 'Selecciónalo'; });
      } catch (e) { b.textContent = 'Selecciónalo'; }
    });
  });
  var up = body.querySelector('[data-up]');
  if (up) up.addEventListener('click', function () { setLayer('upload', true); });
  var evs = COL_EVENTS.filter(function (e) { return e.z.indexOf(z.id) >= 0; });
  body.querySelectorAll('[data-evy]').forEach(function (b) {
    b.addEventListener('click', function () { var e = evs[+b.getAttribute('data-evy')]; setYear(e.y, true); flyTo(e.ll, false, Math.max(zoomK, 6.2)); });
  });
  $('#analysis').hidden = false;
}
document.querySelectorAll('[data-focus]').forEach(function (b) { b.addEventListener('click', function () { setFocus(b.getAttribute('data-focus')); }); });
$('#liveBtn').addEventListener('click', fetchLive);

/* ---------- tabla por año: calidad del aire y temperatura ---------- */
S.ym = 'aire';
var AIR_CATS = [[5, 'Cumple guía OMS', '#15803d'], [10, 'Aceptable', '#4d7c0f'], [15, 'Moderada', '#a16207'], [25, 'Dañina a largo plazo', '#c2410c'], [35, 'Mala', '#b91c1c'], [Infinity, 'Muy mala', '#7f1d1d']];
var TA_CATS = [[-0.5, 'Mucho más frío', '#1d4ed8'], [-0.15, 'Más frío', '#2563eb'], [0.15, 'Normal', '#475569'], [0.5, 'Más cálido', '#c2410c'], [1.0, 'Mucho más cálido', '#b91c1c'], [Infinity, 'Extremo', '#7f1d1d']];
var TABS_CATS = [[10, 'Frío', '#1d4ed8'], [18, 'Fresco', '#0e7490'], [24, 'Templado', '#4d7c0f'], [30, 'Cálido', '#c2410c'], [Infinity, 'Muy caluroso', '#b91c1c']];
function catOf(list, v) { for (var i = 0; i < list.length; i++) if (v <= list[i][0] || (list[i][0] === Infinity)) return list[i]; return list[list.length - 1]; }
function catOfAnom(v) { for (var i = 0; i < TA_CATS.length; i++) if (v < TA_CATS[i][0]) return TA_CATS[i]; return TA_CATS[TA_CATS.length - 1]; }
function badge(c) { return '<span class="cat" style="background:' + c[2] + '">' + esc(c[1]) + '</span>'; }
function srcLink(k) { var s2 = SRC[k]; return s2 ? '<a href="' + s2[1] + '" target="_blank" rel="noopener">' + esc(s2[0]) + '</a>' : ''; }
function sstAnom(key, y) {
  var zz = SSTZ[key], i = y - 1970;
  if (i < 0 || i >= zz.v.length) return null;
  var base = d3.mean(zz.v.slice(1, 31));
  return zz.v[i] - base;
}
function liveRowsHTML(kind) {
  if (!LIVE.data) {
    return '<tr><td colspan="3"><small>' + (LIVE.status === 'off' ? 'Los datos en vivo aparecen al publicar la app con su API (Google Weather y Air Quality).' : LIVE.status === 'loading' ? 'Consultando la API…' : 'Toca «Actualizar» en el panel de Colombia o activa el modo COLOMBIA.') + '</small></td></tr>';
  }
  return LIVE.data.puntos.map(function (p) {
    if (kind === 'temp') {
      if (p.temperatura_c === null || p.temperatura_c === undefined) return '<tr><td>' + esc(p.nombre) + '</td><td class="v">—</td><td>' + badge([0, 'Sin dato', '#334155']) + '</td></tr>';
      return '<tr><td>' + esc(p.nombre) + '<small>' + esc(p.descripcion || '') + '</small></td><td class="v">' + fmt(p.temperatura_c, 1) + ' °C</td><td>' + badge(catOf(TABS_CATS, p.temperatura_c)) + '</td></tr>';
    }
    var a = p.aire;
    if (!a || a.ica === null || a.ica === undefined) return '<tr><td>' + esc(p.nombre) + '</td><td class="v">—</td><td>' + badge([0, 'Sin dato', '#334155']) + '</td></tr>';
    return '<tr><td>' + esc(p.nombre) + '<small>' + (a.pm25_ugm3 !== null && a.pm25_ugm3 !== undefined ? 'PM2.5 ' + fmt(a.pm25_ugm3, 1) + ' µg/m³ ahora' : '') + '</small></td><td class="v">ICA ' + a.ica + '</td><td>' + badge([0, a.categoria || '—', a.color || '#334155']) + '</td></tr>';
  }).join('');
}
function renderYearTable() {
  var y = S.year, box = $('#ytBody');
  if (!box) return;
  $('#ytYear').textContent = y + (y === LAST_YEAR ? ' · en curso' : '');
  document.querySelectorAll('[data-ym]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-ym') === S.ym)); });
  var html = '';
  if (S.ym === 'aire') {
    var rows = AIR_ROWS.map(function (r) {
      var d = r.v[y];
      if (!d) return '<tr><td>' + esc(r.name) + '</td><td class="v">—</td><td>' + badge([0, 'Sin dato', '#334155']) + '</td></tr>';
      return '<tr><td>' + esc(r.name) + '<small>' + srcLink(d[1]) + '</small></td><td class="v">' + fmt(d[0], 1) + ' µg/m³</td><td>' + badge(catOf(AIR_CATS, d[0])) + '</td></tr>';
    }).join('');
    if (y === LAST_YEAR) html += '<div class="src">' + y + ' aún no termina: los promedios anuales se publican el año siguiente.</div>';
    else html += '<table class="yt"><thead><tr><th>Lugar</th><th style="text-align:right">PM2.5 anual</th><th>Condición</th></tr></thead><tbody>' + rows + '</tbody></table>';
    if (y === LAST_YEAR) html += '<div class="yt-sub">Ahora mismo · Google Air Quality</div><table class="yt"><tbody>' + liveRowsHTML('aire') + '</tbody></table>';
    var airLab = ['≤5', '5–10', '10–15', '15–25', '25–35', '>35'];
    html += '<div class="yt-legend">' + AIR_CATS.map(function (c, i) { return '<span class="cat" style="background:' + c[2] + '" title="' + esc(c[1]) + '">' + airLab[i] + '</span>'; }).join('') + '</div>' +
      '<div class="src">Promedio anual de PM2.5. Condición según la guía de la OMS de 2021 (5 µg/m³) y sus metas intermedias; la norma anual de Colombia es 25 µg/m³ (' + srcLink('normaCol') + '). Hasta 2017: exposición modelada (GBD); desde 2018: estaciones (IQAir). Los métodos no son iguales.</div>';
  } else {
    var g = gistemp.filter(function (d) { return d[0] === y; })[0];
    var trow = function (name, a, note) {
      if (a === null || a === undefined) return '<tr><td>' + name + '</td><td class="v">—</td><td>' + badge([0, 'Sin dato', '#334155']) + '</td></tr>';
      return '<tr><td>' + name + '<small>' + note + '</small></td><td class="v">' + sfmt(a, 2) + ' °C</td><td>' + badge(catOfAnom(a)) + '</td></tr>';
    };
    var rowsT = trow('Planeta', g ? g[1] : null, 'NASA GISTEMP · frente a 1951–1980') +
      trow('Mar · San Andrés', sstAnom('sanandres', y), 'NOAA ERSSTv5 · frente a 1971–2000') +
      trow('Mar · Caribe (Santa Marta)', sstAnom('caribe', y), 'NOAA ERSSTv5 · frente a 1971–2000') +
      trow('Mar · Pacífico (Chocó)', sstAnom('pacifico', y), 'NOAA ERSSTv5 · frente a 1971–2000');
    if (y === LAST_YEAR) html += '<div class="src">' + y + ' aún no termina: el promedio anual se publica el año siguiente.</div>';
    else html += '<table class="yt"><thead><tr><th>Lugar</th><th style="text-align:right">Anomalía</th><th>Condición</th></tr></thead><tbody>' + rowsT + '</tbody></table>';
    if (y === LAST_YEAR) html += '<div class="yt-sub">Ahora mismo · Google Weather</div><table class="yt"><tbody>' + liveRowsHTML('temp') + '</tbody></table>';
    html += '<div class="yt-legend">' + TA_CATS.map(function (c) { return '<span class="cat" style="background:' + c[2] + '">' + esc(c[1]) + '</span>'; }).join('') + '</div>' +
      '<div class="src">Anomalía: cuánto más cálido o frío fue el año frente al promedio de referencia. «Normal» es ±0,15 °C. El mar llega hasta 2021 y el planeta hasta 2025; en ' + LAST_YEAR + ' se muestra la temperatura en vivo.</div>';
  }
  box.innerHTML = html;
}
document.querySelectorAll('[data-ym]').forEach(function (b) { b.addEventListener('click', function () { S.ym = b.getAttribute('data-ym'); renderYearTable(); }); });
$('#ytToggle').addEventListener('click', function () {
  var t = $('#ytable'), c = t.classList.toggle('collapsed');
  $('#stage').classList.toggle('has-yt', !c);
  this.setAttribute('aria-expanded', String(!c));
  this.setAttribute('aria-label', c ? 'Expandir tabla' : 'Contraer tabla');
  this.innerHTML = c ? '<svg class="ic" width="16" height="16" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>' : '<svg class="ic" width="16" height="16" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
});

/* ---------- controles ---------- */
document.querySelectorAll('.tool').forEach(function (b) {
  b.addEventListener('click', function () { setLayer(b.getAttribute('data-layer'), true); });
});
$('#year').addEventListener('input', function (e) { setYear(+e.target.value, true); });
$('#play').addEventListener('click', function () { setPlaying(!S.playing); });
$('#speed').addEventListener('input', function () { if (S.playing) setPlaying(true); });
$('#latest').addEventListener('click', function () { setPlaying(false); setYear(tlRange()[1], true); });
$('#zoom').addEventListener('input', function (e) { stopAuto(); setZoom(+e.target.value); });
$('#zIn').addEventListener('click', function () { setZoom(zoomK * 1.25); });
$('#zOut').addEventListener('click', function () { setZoom(zoomK / 1.25); });
$('#aClose').addEventListener('click', function () { S.sel = null; S.zone = null; $('#analysis').hidden = true; renderZoneList(); setupTimeline(); renderEvents(); renderSteps(); requestDraw(); });
$('#collapse').addEventListener('click', function () {
  var p = $('#info'), c = p.classList.toggle('collapsed');
  this.setAttribute('aria-expanded', String(!c));
  this.innerHTML = c ? '<svg class="ic" width="18" height="18" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>' : '<svg class="ic" width="18" height="18" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>';
});
function onPeriod() {
  var a = +$('#pStart').value, b = +$('#pEnd').value;
  if (b - a < 5) { b = Math.min(a + 5, LAYERS[S.layer].range[1]); a = b - 5; $('#pStart').value = a; $('#pEnd').value = b; }
  S.period = [a, b];
  if (S.layer !== 'global') computeTrends();
  refresh();
}
$('#pStart').addEventListener('change', onPeriod);
$('#pEnd').addEventListener('change', onPeriod);
$('#onlySig').addEventListener('change', function (e) { S.onlySig = e.target.checked; recolor(); });
$('#helpBtn').addEventListener('click', function () { openOverlay('#helpView'); });
var lastFocus = null;
function openOverlay(sel) { lastFocus = document.activeElement; var o = $(sel); o.hidden = false; var c = o.querySelector('[data-close]'); if (c) c.focus(); }
function closeOverlays() { document.querySelectorAll('.overlay').forEach(function (o) { o.hidden = true; }); if (lastFocus) lastFocus.focus(); }
document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', closeOverlays); });
document.querySelectorAll('.overlay').forEach(function (o) { o.addEventListener('click', function (e) { if (e.target === o) closeOverlays(); }); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeOverlays(); });
window.addEventListener('resize', resize);

/* ---------- mis datos (CSV de Giovanni) ---------- */
function splitLine(line, delim) {
  var out = [], cur = '', q = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (ch === '"') q = !q;
    else if (ch === delim && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map(function (s) { return s.trim(); });
}
function parseDate(s) {
  var m = /^(\d{4})(?:[-\/](\d{1,2}))?(?:[-\/](\d{1,2}))?(?:[T ]|$)/.exec(s.replace(/"/g, '').trim());
  if (!m) return null;
  var y = +m[1];
  if (y < 1800 || y > 2200) return null;
  var mo = m[2] ? +m[2] : null, d = m[3] ? +m[3] : 1;
  if (mo !== null && (mo < 1 || mo > 12)) return null;
  return { t: mo === null ? y + 0.5 : y + (mo - 1) / 12 + (d - 1) / 365.25, mo: mo };
}
function parseCSV(text) {
  var lines = text.replace(/^﻿/, '').replace(/\r/g, '').split('\n');
  var info = { unit: '', title: '', fill: null, name: '' }, rows = [], header = null;
  lines.forEach(function (raw) {
    var line = raw.trim();
    if (!line) return;
    var delim = line.indexOf('\t') >= 0 ? '\t' : (line.indexOf(';') >= 0 && line.indexOf(',') < 0) ? ';' : (line.indexOf(';') >= 0 && /\d,\d/.test(line)) ? ';' : ',';
    var parts = splitLine(line, delim), k = parts[0].toLowerCase();
    if (/^unit/.test(k)) { info.unit = parts.slice(1).join(' ').trim(); return; }
    if (/^fill value/.test(k)) { info.fill = parseFloat(parts[1]); return; }
    if (/^title/.test(k)) { info.title = parts.slice(1).join(', ').trim(); return; }
    var d = parseDate(parts[0]);
    if (d && parts.length >= 2) {
      var v = parseFloat(String(parts[1]).replace(delim === ';' ? ',' : '\u0000', '.'));
      if (!isFinite(v) || (info.fill !== null && Math.abs(v - info.fill) < 1e-6) || v <= -9000 || v >= 9.9e30) return;
      rows.push({ t: d.t, mo: d.mo, v: v });
    } else if (parts.length >= 2 && !rows.length) header = parts;
  });
  if (header && header[1]) info.name = header[1].replace(/^mean_/, '').replace(/_/g, ' ');
  rows.sort(function (a, b) { return a.t - b.t; });
  return { info: info, rows: rows };
}
var upData = null;
function renderUpload() {
  var out = $('#upOut');
  if (!upData) return;
  var rows = upData.rows, info = upData.info;
  if (rows.length < 6) { out.innerHTML = '<p class="err">No encontré suficientes datos (fecha, valor) en el archivo. Revisa que sea el CSV de una serie de tiempo de Giovanni.</p>'; $('#deseaRow').style.display = 'none'; return; }
  var monthly = rows.every(function (r) { return r.mo !== null; }) && d3.median(d3.pairs(rows, function (a, b) { return b.t - a.t; })) < 0.1;
  $('#deseaRow').style.display = monthly ? 'flex' : 'none';
  var ys = rows.map(function (r) { return r.v; }), xs = rows.map(function (r) { return r.t; });
  var desea = monthly && $('#desea').checked;
  if (desea) {
    var sum = d3.range(12).map(function () { return 0; }), cnt = sum.slice();
    rows.forEach(function (r) { sum[r.mo - 1] += r.v; cnt[r.mo - 1]++; });
    var mean = d3.mean(ys);
    ys = rows.map(function (r) { return r.v - sum[r.mo - 1] / cnt[r.mo - 1] + mean; });
  }
  var res = analyze(xs, ys);
  var span = Math.floor(xs[0]) + '–' + Math.floor(xs[xs.length - 1]);
  var unit = info.unit || 'unidades';
  var mag = d3.max(ys, Math.abs) || 1, dec = mag >= 100 ? 1 : mag >= 1 ? 2 : 4;
  out.innerHTML =
    '<div class="kpi"><div class="k">Variable</div><div class="v">' + esc(info.name || 'Serie cargada') + '</div><div class="src">' + esc(info.title || '') + '</div><div class="src">' + rows.length + ' datos · ' + span + (monthly ? ' · mensual' : '') + ' · ' + esc(unit) + '</div></div>' +
    '<div class="chart" style="margin:10px 0">' + chartSVG(xs, ys, res, { aria: 'Serie de tiempo cargada' }) + '</div>' +
    verdictHTML(res, { per: span, dec: dec, unit: unit, subject: 'La variable' });
  setStep(1); setStep(2);
}
function readFile(f) {
  if (!f) return;
  var r = new FileReader();
  r.onload = function () { upData = parseCSV(String(r.result)); renderUpload(); };
  r.onerror = function () { $('#upOut').innerHTML = '<p class="err">No se pudo leer el archivo.</p>'; };
  r.readAsText(f);
}
$('#file').addEventListener('change', function (e) { readFile(e.target.files[0]); });
$('#desea').addEventListener('change', renderUpload);
var drop = $('#drop');
['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
drop.addEventListener('drop', function (e) { readFile(e.dataTransfer.files[0]); });

/* ---------- carga ---------- */
resize(); if (!S.reduceMotion) autoSpin(); else S.auto = false; renderSteps();
if (initGL()) {
  Promise.all([loadTexture('data/earth.jpg', 0), loadTexture('data/water.jpg', 1), loadTexture('data/clouds.jpg', 2)])
    .then(function (t) { glTex.earth = t[0]; glTex.water = t[1]; glTex.clouds = t[2]; glReady = true; dataTexDirty = true; requestDraw(); })
    .catch(function () { glReady = false; });
}
$('#cloudBtn').addEventListener('click', function () { S.clouds = !S.clouds; this.setAttribute('aria-pressed', String(S.clouds)); requestDraw(); });
$('#dataBtn').addEventListener('click', function () { S.showData = !S.showData; this.setAttribute('aria-pressed', String(S.showData)); requestDraw(); });
$('#spinBtn').addEventListener('click', function () { if (S.auto) stopAuto(); else startAuto(); });
Promise.all([fetch('data/sst.json').then(function (r) { return r.json(); }), fetch('data/geo.json').then(function (r) { return r.json(); }), fetch('data/clima_col.json').then(function (r) { return r.json(); }).catch(function () { return null; })])
  .then(function (res) {
    CLIMA = res[2];
    D = res[0];
    NLAT = D.nlat; NLON = D.nlon; Y0 = D.years[0]; NY = D.years[1] - D.years[0] + 1; step = D.anomStep;
    clim = new Int16Array(b64(D.clim).buffer); anomQ = new Int8Array(b64(D.anom).buffer);
    gistemp = D.gistemp;
    for (var r = 0; r < NLAT; r++) for (var c = 0; c < NLON; c++) {
      var k = r * NLON + c;
      if (clim[k] === -32768) continue;
      var lat1 = D.lats[r] + 2, lat0 = D.lats[r] - 2, lon0 = D.lons[c] - 2, lon1 = D.lons[c] + 2;
      kToI[k] = cells.length;
      cells.push(k);
      polys.push({ type: 'Polygon', coordinates: [[[lon0, lat1], [lon1, lat1], [lon1, lat0], [lon0, lat0], [lon0, lat1]]] });
      var lc = D.lons[c] > 180 ? D.lons[c] - 360 : D.lons[c];
      centers.push([lc, D.lats[r]]);
    }
    land = res[1].land;
    borders = res[1].borders;
    colombia = res[1].colombia;
    $('#loading').remove();
    setLayer('sst', false);
    if (S.year === LAST_YEAR) fetchLive();
  })
  .catch(function (err) {
    $('#loading').textContent = 'No se pudieron cargar los datos: ' + err.message;
  });
})();
