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
/* Ganchos para los módulos (js/*.js): comparador, explorador de Colombia, exploración global e IA */
var HOOKS = { analysis: [], pick: [], hover: [], draw: [], refresh: [], focus: [], close: [], cell: {}, legend: {} };
var LAYERS = {
  sst: { q: '¿Qué tan caliente está el mar?', hint: ['🔵 agua fría', '🔴 agua caliente'], name: 'Temperatura del mar', title: 'Temperatura superficial del mar · promedio anual', desc: 'Qué tan caliente está la superficie del océano. Los tonos amarillos y rojos son aguas cálidas; los azules y morados, aguas frías. La tierra firme se ve con la imagen satelital Blue Marble de NASA.', unit: '°C', src: 'NOAA ERSSTv5: mediciones de barcos, boyas y flotadores Argo, en celdas de 4°. Es la misma base oceánica que usa NASA GISTEMP.', range: [1970, 2021] },
  anom: { q: '¿El mar está más caliente de lo normal?', hint: ['🔵 más frío de lo normal', '🔴 más caliente de lo normal'], name: 'Anomalía del mar', title: 'Anomalía de la temperatura del mar', desc: 'Cuánto más caliente (rojo) o más frío (azul) estuvo el mar ese año, comparado con el promedio de 1971 a 2000. Así se ven fenómenos como El Niño.', unit: '°C frente a 1971–2000', src: 'NOAA ERSSTv5, promedio anual en celdas de 4°.', range: [1970, 2021] },
  trend: { q: '¿Dónde se está calentando el mar?', hint: ['🔵 se enfría', '🔴 se calienta'], name: 'Tendencia', title: '¿Dónde cambia? Tendencia de la temperatura del mar', desc: 'Cada celda muestra cuánto cambió la temperatura del mar por década en el periodo elegido. Rojo: se calienta; azul: se enfría. El gris indica que el cambio no es significativo (Mann-Kendall, p ≥ 0,05).', unit: '°C por década', src: 'Calculado en tu navegador a partir de NOAA ERSSTv5: regresión lineal y prueba de Mann-Kendall en cada celda.', range: [1970, 2021] },
  global: { q: '¿Cuánto se ha calentado el planeta?', hint: ['🔵 más frío que antes', '🔴 más caliente que antes'], name: 'Temperatura global', title: 'Temperatura global del planeta · NASA GISTEMP v4', desc: 'Promedio de tierra y océano de todo el planeta, comparado con 1951–1980. El panel de la derecha analiza la serie global; el globo muestra la anomalía del mar de cada año.', unit: '°C frente a 1951–1980', src: 'NASA Goddard Institute for Space Studies (GISTEMP v4), promedio anual global hasta 2025.', range: [1880, 2026] }
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
  done: [false, false, false], auto: false, playing: false,
  focus: 'world', zone: null, zoneTab: 'resumen', relief: false, upZone: '',
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
  'uniform sampler2D uEarth, uWater, uClouds, uData, uLand, uTopo;',
  'uniform float uRelief, uHypso;',
  'vec3 hyp(float t){',
  '  t = clamp(t * 1.5, 0.0, 1.0);',
  '  vec3 c = mix(vec3(0.18,0.42,0.23), vec3(0.44,0.60,0.27), smoothstep(0.0, 0.05, t));',
  '  c = mix(c, vec3(0.79,0.71,0.42), smoothstep(0.05, 0.16, t));',
  '  c = mix(c, vec3(0.64,0.45,0.24), smoothstep(0.16, 0.36, t));',
  '  c = mix(c, vec3(0.48,0.31,0.18), smoothstep(0.36, 0.60, t));',
  '  c = mix(c, vec3(0.86,0.83,0.78), smoothstep(0.60, 0.82, t));',
  '  return mix(c, vec3(1.0), smoothstep(0.82, 1.0, t));',
  '}',
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
  '  if (d2 > 1.0) {',
  '    float rr = sqrt(d2);',
  '    float g = 1.0 - smoothstep(1.0, 1.07, rr);',   // halo de atmósfera alrededor del planeta
  '    outColor = vec4(0.38, 0.66, 1.0, g * g * 0.55); return;',
  '  }',
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
  '  if (uHypso > 0.0) {',
  '    float hh = sampleSeam(uTopo, u, v).r;',
  '    float lum0 = dot(col, vec3(0.299, 0.587, 0.114));',
  '    vec3 hc = hyp(hh) * (0.62 + 0.9 * lum0);',
  '    col = mix(col, hc, uHypso * 0.85 * (1.0 - smoothstep(0.3, 0.7, water)));',
  '  }',
  '  float cl = sampleSeam(uClouds, u + uCloudShift, v).r;',
  '  col = mix(col, vec3(0.97), cl * uCloudAlpha);',
  '  vec3 n = vec3(q, z);',
  '  vec3 nb = n;',
  '  if (uRelief > 0.0) {',
  // relieve: normal perturbada con el gradiente de la altura en pantalla (bump mapping)
  '    float du = 1.5 / 2048.0, dv = 1.5 / 1024.0;',
  '    float hE = sampleSeam(uTopo, u + du, v).r, hW = sampleSeam(uTopo, u - du, v).r;',
  '    float hN = sampleSeam(uTopo, u, v - dv).r, hS = sampleSeam(uTopo, u, v + dv).r;',
  '    float cl = max(cos(lat), 0.05);',
  '    float sE = (hE - hW) / (2.0 * du * 2.0 * PI * cl), sN = (hN - hS) / (2.0 * dv * PI);',
  '    float Lw = lon + uRot.x, sl = sin(lat);',
  '    float dxE = -sin(Lw);',
  '    vec3 east = normalize(vec3(cos(Lw), dxE * sp, dxE * cp));',
  '    float dxN = -sl * cos(Lw);',
  '    vec3 north = normalize(vec3(-sl * sin(Lw), dxN * sp + cos(lat) * cp, dxN * cp - cos(lat) * sp));',
  '    float landK = 1.0 - smoothstep(0.3, 0.7, water);',
  '    nb = normalize(n - uRelief * landK * (sE * east + sN * north));',
  '    if (dot(nb, nb) < 0.5) nb = n;',
  '  }',
  '  vec3 L = normalize(vec3(-0.45, 0.5, 0.75));',
  '  float diff = max(dot(nb, L), 0.0);',
  '  float diff0 = max(dot(n, L), 0.0);',
  '  col *= 0.30 + 0.85 * diff;',
  '  col *= 0.85 + 0.15 * smoothstep(0.0, 0.25, diff0);',
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
    ['uEarth', 'uWater', 'uClouds', 'uData', 'uLand', 'uTopo', 'uRelief', 'uHypso', 'uLandBox', 'uLandAlpha', 'uCenter', 'uR', 'uRot', 'uCloudShift', 'uCloudAlpha', 'uDataAlpha', 'uHasData'].forEach(function (n) { glU[n] = GL.getUniformLocation(glProg, n); });
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
  GL.uniform1f(glU.uCloudAlpha, S.clouds && !S.relief ? (S.focus === 'colombia' ? 0.22 : 0.38) : 0);
  GL.uniform1f(glU.uDataAlpha, S.showData && !S.relief ? 0.9 : 0);
  GL.uniform1f(glU.uHasData, D ? 1 : 0);
  GL.uniform1i(glU.uLand, 4);
  if (CLIMA) GL.uniform4f(glU.uLandBox, CLIMA.lon0, CLIMA.lat1, CLIMA.nx * CLIMA.res, CLIMA.ny * CLIMA.res);
  GL.uniform1f(glU.uLandAlpha, CLIMA && S.showData && !S.relief && S.layer === 'sst' && S.focus === 'colombia' ? 0.85 : 0);   // en Mundo, Colombia se ve igual que los demás países
  GL.activeTexture(GL.TEXTURE0); GL.bindTexture(GL.TEXTURE_2D, glTex.earth);
  GL.activeTexture(GL.TEXTURE1); GL.bindTexture(GL.TEXTURE_2D, glTex.water);
  GL.activeTexture(GL.TEXTURE2); GL.bindTexture(GL.TEXTURE_2D, glTex.clouds);
  GL.activeTexture(GL.TEXTURE3); GL.bindTexture(GL.TEXTURE_2D, glTex.data);
  GL.activeTexture(GL.TEXTURE4); GL.bindTexture(GL.TEXTURE_2D, glTex.land);
  GL.uniform1i(glU.uTopo, 5);
  GL.uniform1f(glU.uRelief, glTex.topo ? (S.relief ? (zoomK > 3 ? 0.26 : 0.14) : S.focus === 'colombia' ? 0.14 : 0.07) : 0);
  GL.uniform1f(glU.uHypso, glTex.topo && S.relief ? 1 : 0);   // relieve exagerado ~20–30 veces para que se note
  if (glTex.topo) { GL.activeTexture(GL.TEXTURE5); GL.bindTexture(GL.TEXTURE_2D, glTex.topo); }
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
  if (S.relief) drawLandforms();
  if (D && colombia && S.focus === 'colombia') drawColombia();
  for (var hk = 0; hk < HOOKS.draw.length; hk++) HOOKS.draw[hk](ctx, path, proj, R);
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
  if (HOOKS.cell[layer]) return HOOKS.cell[layer](i, k);
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
function legendRelief() {
  var cv = $('#legBar'), c2 = cv.getContext('2d');
  var stops = [[0, '#2e6b3a'], [0.05, '#709945'], [0.16, '#c9b56b'], [0.36, '#a3733d'], [0.6, '#7a4f2e'], [0.82, '#dbd4c7'], [1, '#ffffff']];
  var gr = c2.createLinearGradient(0, 0, cv.width, 0); stops.forEach(function (s2) { gr.addColorStop(s2[0], s2[1]); });
  c2.fillStyle = gr; c2.fillRect(0, 0, cv.width, cv.height);
  $('#legUnit').textContent = 'Relieve · altura del terreno (NASA), exagerada para que se note';
  $('#legTicks').innerHTML = '<span>Llanura</span><span>Montaña</span><span>Cumbres</span>';
}
function legend() {
  if (S.relief) return legendRelief();
  if (HOOKS.legend.override) { var ow = HOOKS.legend.override(); if (ow) { $('#legWords').innerHTML = '<span>' + ow[0] + '</span><span>' + ow[1] + '</span>'; return; } }
  if (HOOKS.legend[S.layer]) { var r = HOOKS.legend[S.layer](); legWords(); return r; }
  var layer = S.layer, sc = scales[layer], dom = sc.domain(), lo = dom[0], hi = dom[dom.length - 1];
  var cv = $('#legBar'), c2 = cv.getContext('2d');
  for (var x = 0; x < cv.width; x++) { c2.fillStyle = sc(lo + (hi - lo) * x / (cv.width - 1)); c2.fillRect(x, 0, 1, cv.height); }
  var th = $('#thumb'), c3 = th.getContext('2d');
  for (x = 0; x < th.width; x++) { c3.fillStyle = sc(lo + (hi - lo) * x / (th.width - 1)); c3.fillRect(x, 0, 1, th.height); }
  var d = layer === 'sst' ? 0 : 1;
  $('#legTicks').innerHTML = [lo, (lo + hi) / 2, hi].map(function (v) { return '<span>' + (layer === 'sst' ? fmt(v, 0) : sfmt(v, d)) + '</span>'; }).join('');
  legWords();
  $('#legUnit').textContent = layer === 'global' ? 'Mar: diferencia con lo normal (°C)' : layer === 'sst' ? (S.focus === 'colombia' ? 'Temperatura (°C) · mar y tierra' : 'Temperatura del agua (°C)') : layer === 'anom' ? 'Diferencia con lo normal (°C)' : layer === 'trend' ? 'Cambio cada 10 años (°C)' : LAYERS[layer].unit;
}
function legWords() {
  var L = LAYERS[S.layer], el = $('#legWords');
  if (!el) return;
  var h = S.relief ? ['🟢 llanura', '⛰️ montaña'] : S.layer === 'air' ? ['🔵 aire más fresco', '🔴 aire más caliente'] : S.layer === 'cmp' ? null : (L && L.hint) || null;
  el.innerHTML = h ? '<span>' + h[0] + '</span><span>' + h[1] + '</span>' : '';
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
  if (window.G) return G.line([{ name: o.name || 'Serie', xs: xs, ys: ys }], { unit: o.unit, varName: o.varName || (o.zero ? 'Diferencia con lo normal' : 'Temperatura'), marker: o.marker, band: o.period, zero: o.zero, aria: o.aria, title: o.title, freq: o.freq, legend: !!o.name });
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
  var head = sig ? (up ? ['📈', 'Sí, se está calentando'] : ['📉', 'Sí, se está enfriando']) : (s1 || s2) ? ['🤔', 'Puede que esté cambiando, pero no es seguro'] : ['➖', 'No hay un cambio claro'];
  if (o.colors || o.neutral) head = sig ? (up ? ['📈', 'Sí, está aumentando'] : ['📉', 'Sí, está disminuyendo']) : head;
  return '<div class="plain"><span class="pe">' + head[0] + '</span><div><b>' + head[1] + '</b><span>' + (sig || s1 || s2 ? sfmt(bk, dec) + ' ' + esc(unit) + ' ' + (k === 10 ? 'cada 10 años' : 'por año') + ' · ' : '') + esc(per) + '</span></div></div>' +
    '<details class="more tech"><summary>Detalle técnico (estadística)</summary>' +
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
    '<p class="verdict">' + esc(sentence) + '</p></details>';
}

/* ---------- panel de análisis ---------- */
function renderAnalysis() {
  var box = $('#analysis');
  for (var h = 0; h < HOOKS.analysis.length; h++) if (HOOKS.analysis[h]()) return;
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
      '<div class="chart">' + chartSVG(xs, ys, res, { zero: true, varName: 'Diferencia con lo normal', title: 'Temperatura del planeta', marker: S.year, period: S.period, aria: 'Temperatura global de 1880 a ' + gistemp[gistemp.length - 1][0] }) + '</div>' +
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
  var yShow = hasYear(S.year) ? S.year : mapYear(), cur = allY[yShow - Y0];
  $('#aTitle').textContent = oceanName(c[0], c[1]);
  $('#aSub').textContent = coordText(c[0], c[1]) + ' · celda de 4° × 4°';
  $('#aBody').innerHTML =
    (isFinite(cur) ? '<div class="row" style="align-items:baseline;gap:10px"><span class="big" style="color:' + (useVal ? scales.sst(cur) : (cur > 0 ? '#ff7a59' : '#5cb7ff')) + '">' + (useVal ? '🌊 ' + fmt(cur, 1) : sfmt(cur, 2)) + ' °C</span><span class="src">' + (useVal ? 'temperatura del agua en ' : (cur >= 0 ? 'más caliente' : 'más frío') + ' de lo normal en ') + yShow + '</span></div>'
      : '<div class="src">No hay dato del mar en este punto.</div>') +
    '<div class="chart">' + chartSVG(allX, allY, r2, { zero: !useVal, varName: useVal ? 'Temperatura del mar' : 'Diferencia con lo normal', title: 'Temperatura del mar en este punto', marker: S.year, period: [a, b], aria: 'Serie anual de temperatura del mar en el punto' }) + '</div>' +
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
    return '<div class="e"><div><b>📍 ' + e.y + ' · ' + esc(e.t) + '</b></div><button data-ev="' + i + '">Ver</button></div>';
  }).join('');
  card.hidden = false;
  clearTimeout(renderEvents._t);
  renderEvents._t = setTimeout(function () { card.hidden = true; }, 9000);   // aviso breve: se oculta solo
  card.querySelectorAll('button[data-ev]').forEach(function (b) {
    b.addEventListener('click', function () {
      var e = evs[+b.getAttribute('data-ev')];
      if (S.focus === 'colombia') flyTo(e.ll, false, Math.max(zoomK, 6.2)); else flyTo(e.ll, true);
    });
  });
}
function renderTitles() {
  var L = LAYERS[S.layer];
  $('#layerTitle').textContent = L.q || L.title;
  var t;
  if (S.layer === 'trend') t = 'Cambio entre ' + Math.max(S.period[0], Y0) + ' y ' + Math.min(S.period[1], Y0 + NY - 1);
  else if (!hasYear(S.year) && S.layer !== 'global') t = 'Mostrando ' + mapYear() + ' (el dato más reciente)';
  else t = 'Año ' + S.year;
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
  $('#periodBox').style.display = S.layer === 'air' || S.layer === 'cmp' ? 'none' : '';
  $('#infoLinks').innerHTML = (LINKS[S.layer] || []).map(function (l) { return '<a href="' + l[1] + '" target="_blank" rel="noopener">› ' + esc(l[0]) + '</a>'; }).join('');
  renderSteps();
}
function refresh() {
  renderTitles(); renderEvents(); recolor();
  renderAnalysis(); renderSteps();
  if (S.focus === 'colombia') renderZoneTemps();
  renderYearTable();
  HOOKS.refresh.forEach(function (f) { f(); });
}
function setYear(y, user) {
  S.year = y; $('#year').value = y;
  if (user) setStep(2);
  refresh();
}
function setLayer(id, user) {
  if (id === 'upload') { $('#upZone').textContent = S.zone ? ' · ' + zoneById(S.zone).short : ''; openOverlay('#uploadView'); if (user) setStep(0); return; }
  if (!LAYERS[id]) return;
  var prevRange = LAYERS[S.layer].range;
  S.layer = id;
  document.querySelectorAll('.tool[data-layer]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-layer') === id)); });
  var r = LAYERS[id].range;
  if (prevRange[0] !== r[0] || prevRange[1] !== r[1]) {
    S.period = id === 'global' ? [1970, 2025] : id === 'air' ? [1981, 2025] : [1970, 2021];
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
var flyId = 0;
function cancelFly() { flyId++; }
function flyTo(ll, select, zTo) {
  stopAuto();
  if (S.flat) exitFlat(Math.min(zoomK, FLAT_K - 1));
  var z0 = zoomK, z1 = zTo || zoomK;
  var from = rot.slice(), to = [-ll[0], -ll[1]];
  var dl = ((to[0] - from[0]) % 360 + 540) % 360 - 180;
  to[0] = from[0] + dl;
  var it = d3.interpolate(from, to), t0 = performance.now(), id = ++flyId;
  // vuelo suave: si el destino está lejos, la cámara se aleja un poco a mitad de camino (como un avión)
  var dist = d3.geoDistance([-from[0], -from[1]], ll), bump = clamp(dist * 3.2, 0, 0.45);
  var dur = clamp(650 + dist * 2600, 700, 1300);
  (function tick(now) {
    if (id !== flyId) return;   // otra selección empezó: esta animación se cancela
    var t = Math.min(1, (now - t0) / dur), e = d3.easeCubicInOut(t);
    rot = it(e); zoomK = (z0 + (z1 - z0) * e) * (1 - bump * Math.sin(Math.PI * t)); $('#zoom').value = zoomK; requestDraw();
    if (t < 1) requestAnimationFrame(tick);
    else if (zoomK >= FLAT_K && !S.flat) { if (S.zone) enterFlat(S.zone); else enterFlat(null, [-rot[1], -rot[0]]); }
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
/* toque: un dedo arrastra el globo; dos dedos (pellizco) acercan o alejan hacia el punto entre los dedos;
*/
var touches = {}, pinch = null;
function nTouches() { return Object.keys(touches).length; }
function pinchInfo() {
  var p = Object.keys(touches).map(function (k) { return touches[k]; });
  var r = canvas.getBoundingClientRect();
  return { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), mid: [(p[0].x + p[1].x) / 2 - r.left, (p[0].y + p[1].y) / 2 - r.top] };
}
// iPhone/iPad (Safari): el navegador intenta agrandar TODA la página con dos dedos.
// Se bloquea ese zoom de página y se usa su gesto (scale) para acercar solo el mapa.
var IOS_GESTURE = 'ongesturestart' in window;
function pinchStart(mid) { syncProj(); return { k0: zoomK, g: geoAt(mid) }; }
function pinchTo(P, z, mid) {
  if (z >= FLAT_K) { setZoom(z); return false; }   // pasa al mapa con calles
  zoomK = clamp(z, 0.8, 14); $('#zoom').value = zoomK;
  if (P.g) {   // mantiene bajo los dedos el mismo lugar del mapa
    syncProj();
    var g1 = geoAt(mid);
    if (g1) rot = [rot[0] + (g1[0] - P.g[0]), clamp(rot[1] + (g1[1] - P.g[1]), -85, 85)];
  }
  requestDraw();
  return true;
}
var gest = null;
document.addEventListener('gesturestart', function (e) {
  e.preventDefault();
  if (e.target !== canvas || S.flat) return;
  cancelFly(); stopAuto(); drag = null;
  var r = canvas.getBoundingClientRect();
  gest = pinchStart([e.clientX - r.left, e.clientY - r.top]);
}, { passive: false });
document.addEventListener('gesturechange', function (e) {
  e.preventDefault();
  if (!gest) return;
  var r = canvas.getBoundingClientRect();
  if (!pinchTo(gest, gest.k0 * e.scale, [e.clientX - r.left, e.clientY - r.top])) gest = null;
}, { passive: false });
document.addEventListener('gestureend', function (e) { e.preventDefault(); gest = null; }, { passive: false });
// sobre el mapa, ningún gesto de dos dedos debe mover o agrandar la página
canvas.addEventListener('touchstart', function (e) { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
canvas.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
function syncProj() { proj.scale(radius()).translate([W / 2, H / 2 + 8]).rotate(rot); }
canvas.addEventListener('pointerdown', function (e) {
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  touches[e.pointerId] = { x: e.clientX, y: e.clientY };
  cancelFly(); stopAuto();
  if (nTouches() === 2) {            // empieza el pellizco: se cancela el arrastre y el toque
    drag = null;
    if (IOS_GESTURE) { pinch = { ios: true }; return; }   // en iPhone lo maneja gesturechange
    var pi = pinchInfo(), P = pinchStart(pi.mid);
    pinch = { d0: pi.d || 1, k0: P.k0, g: P.g };
    return;
  }
  if (nTouches() > 2) return;
  drag = { x: e.clientX, y: e.clientY, rot: rot.slice(), moved: false };
});
canvas.addEventListener('pointermove', function (e) {
  if (touches[e.pointerId]) touches[e.pointerId] = { x: e.clientX, y: e.clientY };
  if (pinch && nTouches() >= 2) {
    if (pinch.ios) return;
    var pi = pinchInfo();
    if (!pinchTo(pinch, pinch.k0 * pi.d / pinch.d0, pi.mid)) { pinch = null; touches = {}; }
    return;
  }
  if (drag) {
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;
    var k = 0.28 / zoomK;
    rot = [drag.rot[0] + dx * k, clamp(drag.rot[1] - dy * k, -85, 85)];
    requestDraw();
    return;
  }
  if (e.pointerType === 'mouse') hover(evPos(e));
});
function endPointer(e) {
  var wasPinch = !!pinch;
  delete touches[e.pointerId];
  if (wasPinch) {
    if (nTouches() < 2) pinch = null;
    // si queda un dedo, sigue arrastrando desde donde está (sin saltos)
    var rest = Object.keys(touches);
    drag = rest.length === 1 ? { x: touches[rest[0]].x, y: touches[rest[0]].y, rot: rot.slice(), moved: true } : null;
    return;
  }
  if (e.type === 'pointerup' && drag && !drag.moved) {
    pick(evPos(e));
  }
  drag = null;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
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
var FLAT_K = 8;   // desde este acercamiento el globo se cambia por el mapa satelital con calles (nítido)
function setZoom(z) {
  if (S.flat) {
    if (z < FLAT_K) { exitFlat(z); return; }
    if (SAT.map) satSetZoom(kToZ(z));
    return;
  }
  if (z >= FLAT_K && W) { zoomK = FLAT_K; enterFlat(null, [-rot[1], -rot[0]], kToZ(Math.min(z, 14))); return; }
  zoomK = clamp(z, 0.8, 14); $('#zoom').value = zoomK; requestDraw();
}
function hover(pt) {
  if (!D) return;
  var g0 = geoAt(pt);
  for (var h = 0; h < HOOKS.hover.length; h++) if (HOOKS.hover[h](pt, g0)) return;
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
  if (S.focus === 'colombia' && colPinAt(pt)) { flyTo(COL_CENTER, false, 6.2); return; }
  var g0 = geoAt(pt);
  for (var h = 0; h < HOOKS.pick.length; h++) if (HOOKS.pick[h](pt, g0)) return;
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
var COL_FAR = 3.6;   // con menos acercamiento, Colombia se ve como un solo punto (para no amontonar las zonas)
function colFar() { return zoomK < COL_FAR; }
function colPinAt(pt) {
  if (!colFar() || d3.geoDistance(COL_CENTER, [-rot[0], -rot[1]]) > Math.PI / 2 - 0.05) return false;
  var p = proj(COL_CENTER); return Math.hypot(p[0] - pt[0], p[1] - pt[1]) < 26;
}
var COL_CENTER = [-73.3, 4.3];
function markerAt(pt) {
  if (colFar()) return null;
  var center = [-rot[0], -rot[1]], best = null, bd = 18;
  markers().forEach(function (m) {
    if (d3.geoDistance(m.ll, center) > Math.PI / 2 - 0.05) return;
    var p = proj(m.ll), d = Math.hypot(p[0] - pt[0], p[1] - pt[1]);
    if (d < bd) { bd = d; best = m.id; }
  });
  return best;
}
/* ---------- relieve: montañas, cordilleras y llanuras ---------- */
// [nombre, lon, lat, tipo]  m = montaña/cordillera · p = llanura · v = valle · d = desierto/meseta
var LANDFORMS_WORLD = [
  ['Cordillera de los Andes', -68.5, -20, 'm'], ['Montañas Rocosas', -110, 44, 'm'], ['Sierra Madre', -104, 24, 'm'], ['Himalaya', 84, 28.5, 'm'],
  ['Meseta del Tíbet', 88, 33.5, 'd'], ['Alpes', 10, 46.4, 'm'], ['Montes Urales', 59.5, 58, 'm'], ['Montes Apalaches', -80, 38, 'm'],
  ['Llanura amazónica', -62, -5, 'p'], ['Grandes Llanuras', -100, 40, 'p'], ['Llanos del Orinoco', -67, 7.5, 'p'], ['La Pampa', -62.5, -35, 'p'],
  ['Llanura siberiana', 76, 62, 'p'], ['Desierto del Sahara', 5, 23, 'd'], ['Montes Atlas', -5, 32, 'm'], ['Montañas Etíopes', 39, 9, 'm'],
  ['Montes Zagros', 50, 31, 'm'], ['Gran Cordillera Divisoria', 148, -27, 'm']
];
var LANDFORMS_COL = [
  ['Cordillera Occidental', -75.9, 7.2, 'm', 'right'], ['Cordillera Central', -75.6, 3.6, 'm', 'left'], ['Cordillera Oriental', -73.55, 5.9, 'm'],
  ['Serranía del Perijá', -72.95, 9.9, 'm'], ['Serranía de La Macarena', -74.15, 2.55, 'm', 'left'], ['Serranía del Baudó', -77.1, 6.15, 'm', 'right'],
  ['Macizo Colombiano', -76.35, 1.55, 'm'], ['Valle del Magdalena', -74.8, 7.6, 'v', 'left'], ['Valle del Cauca', -76.05, 4.3, 'v', 'right'],
  ['Llanos Orientales', -70.6, 4.8, 'p'], ['Llanura amazónica', -71.6, -0.6, 'p'], ['Llanura del Caribe', -75.2, 9.4, 'p'],
  ['Llanura del Pacífico', -77.2, 2.7, 'p', 'right'], ['Desierto de La Guajira', -72.0, 11.7, 'd']
];
var LF_STYLE = { m: ['#fcd9a8', '▲ '], p: ['#bbf7d0', ''], v: ['#a5f3fc', '◡ '], d: ['#fde68a', ''] };
function drawLandforms() {
  var center = [-rot[0], -rot[1]], list = zoomK >= 3 ? LANDFORMS_COL : LANDFORMS_WORLD;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  list.forEach(function (f) {
    if (d3.geoDistance([f[1], f[2]], center) > Math.PI / 2 - 0.12) return;
    var p = proj([f[1], f[2]]), st = LF_STYLE[f[3]];
    ctx.font = (f[3] === 'm' ? '700 ' : 'italic 600 ') + (zoomK >= 3 ? '13px' : '12px') + ' Inter, system-ui, sans-serif';
    var txt = st[1] + f[0];
    ctx.textAlign = f[4] || 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(txt, p[0], p[1]);
    ctx.fillStyle = st[0]; ctx.fillText(txt, p[0], p[1]);
  });
}
function drawColombia() {
  var center = [-rot[0], -rot[1]];
  // Colombia en verde claro
  ctx.beginPath(); path(colombia); if (!S.relief) { ctx.fillStyle = 'rgba(134,239,172,0.42)'; ctx.fill(); }
  ctx.save(); ctx.shadowColor = 'rgba(74,222,128,0.9)'; ctx.shadowBlur = 10;
  ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2.4; ctx.stroke(); ctx.restore();
  ctx.strokeStyle = '#f0fdf4'; ctx.lineWidth = 0.8; ctx.stroke();
  if (S.zone) {
    var zz = zoneById(S.zone);
    [zz.bbox, zz.bbox2].forEach(function (b) {
      if (!b) return;
      ctx.beginPath(); path(bboxPoly(b)); ctx.setLineDash([5, 3]); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.setLineDash([]);
    });
  }
  ctx.textBaseline = 'middle';
  if (colFar()) {
    // vista lejana: un solo punto «Colombia» que invita a acercarse
    if (d3.geoDistance(COL_CENTER, center) > Math.PI / 2 - 0.05) return;
    var cp = proj(COL_CENTER);
    ctx.beginPath(); ctx.arc(cp[0], cp[1], 16, 0, 2 * Math.PI); ctx.fillStyle = '#fbbf24'; ctx.fill(); ctx.strokeStyle = '#1a1300'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#1a1300'; ctx.font = '800 13px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('6', cp[0], cp[1] + 0.5);
    var tl = 'Colombia · toca para acercarte';
    ctx.font = '700 13px Inter, system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(tl, cp[0] + 22, cp[1]); ctx.fillStyle = '#fff'; ctx.fillText(tl, cp[0] + 22, cp[1]);
    return;
  }
  markers().forEach(function (m) {
    if (d3.geoDistance(m.ll, center) > Math.PI / 2 - 0.05) return;
    var p = proj(m.ll), on = S.zone === m.id, r = on ? 13 : 11;
    if (on) { ctx.beginPath(); ctx.arc(p[0], p[1], r + 4, 0, 2 * Math.PI); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 2 * Math.PI); ctx.fillStyle = '#fbbf24'; ctx.fill();
    ctx.strokeStyle = '#1a1300'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#1a1300'; ctx.font = '700 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(String(m.z.n), p[0], p[1] + 0.5);
    if (zoomK >= 2.2 && !S.relief && S.layer !== 'air' && !S.dep) {   // mapa limpio: sin nombres de zonas en modo aire o con un departamento elegido
      var tx = p[0] + r + 5, ty = p[1], al = 'left';
      if (m.side === 'left') { tx = p[0] - r - 5; al = 'right'; }
      if (m.side === 'below') { tx = p[0]; ty = p[1] + r + 10; al = 'center'; }
      ctx.font = '600 12px Inter, system-ui, sans-serif'; ctx.textAlign = al;
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(m.z.short, tx, ty);
      ctx.fillStyle = on ? '#fde68a' : '#ffffff'; ctx.fillText(m.z.short, tx, ty);
      var ht = yearTemp(m.id, m.sea, S.year), ha = yearAir(m.id, m.sea, S.year);
      var mt = null;
      if (!S.relief && S.layer !== 'air' && !(S.tool === 'cmp' && S.cmp && S.cmp.tab === 'tiempo' && S.cmp.scope === 'colombia')) {
        var pill = function (txt, col, yy) {
          ctx.font = '700 12.5px Inter, system-ui, sans-serif';
          var w2 = ctx.measureText(txt).width, x2 = al === 'left' ? tx - 4 : al === 'right' ? tx - w2 - 4 : tx - w2 / 2 - 4;
          ctx.fillStyle = 'rgba(5,10,20,0.85)';
          ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x2, yy - 9, w2 + 8, 18, 5); else ctx.rect(x2, yy - 9, w2 + 8, 18); ctx.fill();
          ctx.strokeStyle = col; ctx.lineWidth = 1.3; ctx.stroke();
          ctx.fillStyle = '#ffffff'; ctx.fillText(txt, tx, yy + 0.5);
        };
        if (S.ym === 'cambio') {
          var wz = warming(m.id, m.sea, Math.min(S.year, LAST_YEAR - 1));
          if (wz) pill((wz.d >= 0 ? '🔺 ' : '🔻 ') + sfmt(wz.d, 1) + ' °C desde los 80', catOfAnom(wz.d)[2], ty + 15);
          return;
        }
        if (S.ym === 'aire') {
          var acat = ha ? catOf(AIR_CATS, ha.v) : null;
          if (ha) pill('Aire ' + acat[1].toLowerCase(), acat[2], ty + 15);
        } else {
          var tShow = ht || (S.year === LAST_YEAR ? yearTemp(m.id, m.sea, LAST_YEAR - 1) : null);
          if (tShow) pill('🌡 ' + fmt(tShow.v, 0) + ' °C' + (tShow.live ? ' ahora' : ''), scales.sst(tShow.v), ty + 15);
        }
      }
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
      var lp = null;
      if (lp) {
        var ty3 = ty + (HIST ? 55 : mt ? 35 : 15), l3 = '● Ahora ' + fmt(lp.temperatura_c, 1) + ' °C';
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
/* ---------- historia anual por zona (NASA POWER + CAMS) ---------- */
var HIST = null;
var PT_NAME = { nevados: 'Nevado del Ruiz', sierra: 'Sierra Nevada de Santa Marta', amazonia: 'San José del Guaviare', chingaza: 'Páramo de Chingaza', choco: 'Quibdó', sanandres: 'San Andrés', caribe: 'Ciénaga Grande de Santa Marta' };
function loadHist() {
  _wc = {};
  var tryUrl = function (u) { return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); };
  tryUrl('data/historico.json').catch(function () { return tryUrl(API_BASE + '/api/historico'); })
    .then(function (j) { if (j && j.puntos && j.puntos.length) { HIST = j; _wc = {}; refresh(); } })
    .catch(function () { /* sin historia por zona: la app sigue funcionando */ });
}
function histPoint(zoneId, sea) {
  if (!HIST) return null;
  var name = zoneId === 'caribe' ? PT_NAME[sea || 'sanandres'] : PT_NAME[zoneId];
  return HIST.puntos.filter(function (p) { return p.nombre === name; })[0] || null;
}
function histTemp(pt, y) {
  if (!pt || !pt.temp) return null;
  var v = pt.temp[y];
  if (v === undefined || v === null) return null;
  if (pt._base === undefined) {
    var b = []; for (var yy = 1991; yy <= 2020; yy++) if (pt.temp[yy] !== undefined) b.push(pt.temp[yy]);
    pt._base = b.length >= 20 ? d3.mean(b) : null;
  }
  return { v: v, anom: pt._base === null ? null : v - pt._base };
}
function histAir(pt, y) {
  if (!pt || !pt.aire || !pt.aire[y]) return null;
  return pt.aire[y];
}
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
  var yt = yearTemp(id, seaKey, S.year);
  if (yt) return { v: yt.v, kind: id === 'caribe' ? 'mar' : 'aire', note: S.year + ' · ' + yt.src };
  if (id === 'caribe') {
    var zz = SSTZ[seaKey || 'sanandres'], y = clamp(S.year, 1970, 1969 + zz.v.length);
    return { v: zz.v[y - 1970], kind: 'mar', note: 'temperatura del mar en ' + y + ' (NOAA ERSSTv5)' };
  }
  var vals = (ZTP[id] || []).map(function (p) { return landAt(p[0], p[1]); }).filter(function (v) { return v !== null; });
  if (!vals.length) return null;
  return { v: d3.mean(vals), kind: 'aire', note: 'temperatura media del aire 1950–2000 (WorldClim), en celdas de ~55 km' };
}
function markerTemp(m) { return zoneTemp(m.id, m.sea); }
/* ---------- promedio anual por zona: dato de NASA POWER/CAMS si está; si no, estimación ---------- */
function gAnom(y) { var g = gistemp && gistemp.filter(function (d) { return d[0] === y; })[0]; return g ? g[1] : null; }
var _gb = {};
function gMean(a, b) { var k = a + '-' + b; if (_gb[k] === undefined) _gb[k] = d3.mean(gistemp.filter(function (d) { return d[0] >= a && d[0] <= b; }), function (d) { return d[1]; }); return _gb[k]; }
function landClim(id) {
  var vals = (ZTP[id] || []).map(function (p) { return landAt(p[0], p[1]); }).filter(function (v) { return v !== null; });
  return vals.length ? d3.mean(vals) : null;
}
var _sb = {};
function seaBase(k) { if (_sb[k] === undefined) _sb[k] = d3.mean(SSTZ[k].v.slice(1991 - 1970, 2021 - 1970)); return _sb[k]; }
function yearTemp(id, sea, y) {
  var hp = histPoint(id, sea), ht = histTemp(hp, y);
  if (ht) return { v: ht.v, anom: ht.anom, src: 'NASA POWER (MERRA-2) · medido en la zona' };
  if (y === LAST_YEAR) {
    var lp = liveForMarker({ id: id, sea: sea || 'sanandres' });
    return lp ? { v: lp.temperatura_c, anom: null, live: true, src: 'Ahora mismo (Google Weather)' } : null;
  }
  if (!gistemp) return null;
  if (id === 'caribe') {
    var k = sea || 'sanandres', zz = SSTZ[k], i = y - 1970;
    if (i >= 0 && i < zz.v.length) return { v: zz.v[i], anom: zz.v[i] - seaBase(k), src: 'Temperatura del mar · NOAA ERSSTv5' };
    var g1 = gAnom(y); if (g1 === null || y < 1970) return null;
    var a1 = g1 - gMean(1991, 2020);
    return { v: seaBase(k) + a1, anom: a1, est: true, src: 'Estimado: mar 1991–2020 + anomalía global NASA GISTEMP' };
  }
  var b = landClim(id), g = gAnom(y);
  if (b === null || g === null) return null;
  return { v: b + (g - gMean(1950, 2000)), anom: g - gMean(1991, 2020), est: true, src: 'Estimado: clima de la zona (WorldClim) + anomalía de NASA GISTEMP' };
}
/* ---------- impacto del calentamiento por zona ---------- */
var LAPSE = 0.6;   // °C que baja la temperatura por cada 100 m de altura (Britannica)
var MOUNTAIN = { nevados: 1, sierra: 1, chingaza: 1 };
function zoneSeries(id, sea) {
  var xs = [], ys = [];
  for (var y = 1981; y < LAST_YEAR; y++) { var t = yearTemp(id, sea, y); if (t && !t.live) { xs.push(y); ys.push(t.v); } }
  return { xs: xs, ys: ys, measured: !!histPoint(id, sea) };
}
var _wc = {};
function warming(id, sea, y) {
  var key = id + (sea || '') + (HIST ? 'h' : 'e');
  if (!_wc[key]) {
    var se = zoneSeries(id, sea), b = [];
    se.xs.forEach(function (x, i) { if (x <= 1990) b.push(se.ys[i]); });
    _wc[key] = { base: b.length >= 5 ? d3.mean(b) : null, se: se };
  }
  var w = _wc[key];
  if (w.base === null) return null;
  // promedio de los 5 años que terminan en y (suaviza años sueltos como El Niño)
  var v = [];
  w.se.xs.forEach(function (x, i) { if (x <= y && x > y - 5) v.push(w.se.ys[i]); });
  if (v.length < 3) return null;
  var d = d3.mean(v) - w.base;
  return { d: d, m: MOUNTAIN[id] ? d / LAPSE * 100 : null, est: !w.se.measured, from: Math.max(y - 4, w.se.xs[0]), to: Math.min(y, w.se.xs[w.se.xs.length - 1]) };
}
var AIR_REF = { chingaza: 1 };   // índice en AIR_ROWS: Chingaza usa Bogotá; el resto, el promedio nacional
function airSeries(row, y) {
  var v = AIR_ROWS[row].v;
  if (v[y]) return { v: v[y][0], ref: v[y][1] };
  var ys = Object.keys(v).map(Number).sort(function (a, b) { return a - b; }), lo = null, hi = null;
  ys.forEach(function (k) { if (k < y) lo = k; if (k > y && hi === null) hi = k; });
  if (lo === null || hi === null) return null;
  return { v: v[lo][0] + (v[hi][0] - v[lo][0]) * (y - lo) / (hi - lo), interp: true };
}
function yearAir(id, sea, y) {
  var ha = histAir(histPoint(id, sea), y);
  if (ha) return { v: ha.v, parcial: ha.parcial, src: 'Copernicus CAMS · medido en la zona' };
  if (y === LAST_YEAR) {
    var lp = liveForMarker({ id: id, sea: sea || 'sanandres' });
    return lp && lp.aire && lp.aire.pm25 !== undefined && lp.aire.pm25 !== null ? { v: lp.aire.pm25, live: true, src: 'Ahora mismo (Google Air Quality)' } : null;
  }
  var row = AIR_REF[id] !== undefined ? AIR_REF[id] : 0, r = airSeries(row, y);
  if (!r && row) { row = 0; r = airSeries(0, y); }
  if (!r) return null;
  return { v: r.v, est: true, interp: r.interp, src: (row ? 'Referencia: Bogotá' : 'Referencia: promedio de Colombia') + (r.interp ? ' (interpolado)' : '') };
}
function renderZoneTemps() {
  var box = $('#ztemps');
  if (!box || !CLIMA) return;
  var rows = ZONES.map(function (z) { return { z: z, t: zoneTemp(z.id) }; }).filter(function (r) { return r.t; });
  rows.sort(function (a, b) { return b.t.v - a.t.v; });
  box.innerHTML = rows.map(function (r) {
    return '<button class="trow" data-zone="' + r.z.id + '"><span class="tn">' + r.z.n + '. ' + esc(r.z.short) + '</span><span class="tb"><span style="width:' + clamp(r.t.v / 30 * 100, 4, 100) + '%;background:' + scales.sst(r.t.v) + '"></span></span><span class="tv">' + fmt(r.t.v, 1) + ' °C</span></button>';
  }).join('') + '<div class="src">' + (HIST ? 'Temperatura media de ' + S.year + ' en cada zona (NASA POWER).' : 'Promedio de ' + S.year + '. Tierra: clima de la zona (WorldClim) ajustado con la anomalía del año (NASA GISTEMP). Caribe: temperatura del mar (NOAA ERSSTv5).') + '</div>';
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
  S.zone = id; S.sel = null; S.zoneTab = 'impacto';
  if (!$('#ytable').classList.contains('collapsed')) $('#ytToggle').click();   // más espacio para la ficha de la zona
  setStep(1); renderZoneList(); setupTimeline(); renderEvents();
  flyTo(z.ll2 ? [(z.ll[0] + z.ll2[0]) / 2, (z.ll[1] + z.ll2[1]) / 2] : z.ll, false, z.ll2 ? 5.2 : 9.5);
  renderAnalysis(); renderSteps();
}
function setFocus(f) {
  S.focus = f;
  HOOKS.focus.forEach(function (h) { h(f); });
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
  if (S.relief) legendRelief(); else if (S.layer === 'sst') $('#legUnit').textContent = f === 'colombia' ? '°C · mar: ERSSTv5 · tierra de Colombia: WorldClim' : '°C · temperatura del mar: NOAA ERSSTv5';
  dataTexDirty = true;
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
  return '<div class="blk"><h3>Temperatura del mar · ' + esc(zz.name) + '</h3><div class="chart">' + chartSVG(xs, ys, res, { marker: S.year, varName: 'Temperatura del mar', aria: 'Temperatura del mar ' + zz.name }) + '</div>' +
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
function cite(k) { var s2 = SRC[k]; return ' <a href="' + s2[1] + '" target="_blank" rel="noopener">' + esc(s2[0]) + '</a>'; }
function mountainSVG(top, shift, bands, noTop) {
  // bands: [[desde, hasta, nombre, color]] en metros
  var W = 340, H = 210, y0 = 600, y1 = Math.max(top, 4800) + 200;
  var Y = function (m) { return H - 18 - (m - y0) / (y1 - y0) * (H - 30); };
  var peak = 'M20,' + (H - 18) + ' L150,' + Y(top) + ' L175,' + (Y(top) + 6) + ' L320,' + (H - 18) + ' Z';
  var clipId = 'mc' + Math.round(Math.random() * 1e6);
  var g = '<defs><clipPath id="' + clipId + '"><path d="' + peak + '"/></clipPath></defs>';
  var draw = function (dx, sh, op) {
    return '<g clip-path="url(#' + clipId + ')" opacity="' + op + '">' + bands.map(function (b) {
      var a1 = Y(Math.min(b[1] + sh, y1)), a0 = Y(b[0] + sh);
      return '<rect x="0" y="' + a1 + '" width="' + W + '" height="' + Math.max(0, a0 - a1) + '" fill="' + b[3] + '"/>';
    }).join('') + '</g>';
  };
  var labels = bands.map(function (b) {
    var ym = Y((b[0] + Math.min(b[1], top)) / 2);
    return ym > 10 && ym < H - 20 ? '<text x="232" y="' + (ym + 4) + '" font-size="10.5" fill="#e6eef5">' + esc(b[2]) + '</text>' : '';
  }).join('');
  var lines = bands.slice(1).map(function (b) {
    var a = Y(b[0]), c = Y(b[0] + shift);
    return '<line x1="70" x2="226" y1="' + a + '" y2="' + a + '" stroke="#e6eef5" stroke-dasharray="3 3" stroke-width="0.8" opacity="0.6"/>' +
      (shift > 5 ? '<path d="M120,' + a + ' L120,' + (c + 4) + '" stroke="#ff7a59" stroke-width="2" marker-end="url(#ar)"/>' : '');
  }).join('');
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Franjas de clima de la montaña subiendo ' + Math.round(shift) + ' m">' +
    '<defs><marker id="ar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#ff7a59"/></marker></defs>' + g +
    draw(0, shift, 1) + '<path d="' + peak + '" fill="none" stroke="#cbd5e1" stroke-width="1.2"/>' + lines + labels +
    '<text x="8" y="16" font-size="11" fill="#ff7a59" font-weight="700">▲ cada franja subió ' + fmt(shift, 0) + ' m</text><text x="8" y="30" font-size="10" fill="#94a3b8">línea punteada = límite en los años 80</text>' +
    (noTop ? '' : '<text x="150" y="' + (Y(top) - 6) + '" font-size="10.5" fill="#cbd5e1" text-anchor="middle">' + fmt(top, 0) + ' m</text>') + '</svg>';
}
function impactHTML(z) {
  var sea = z.id === 'caribe' ? 'sanandres' : null;
  var se = zoneSeries(z.id, sea), out = '';
  var w = warming(z.id, sea, Math.min(S.year, LAST_YEAR - 1)), wLast = warming(z.id, sea, LAST_YEAR - 1);
  var recent = (function () { var v = []; se.xs.forEach(function (x, i) { if (x >= 2016) v.push(se.ys[i]); }); var b = []; se.xs.forEach(function (x, i) { if (x <= 1990) b.push(se.ys[i]); }); return v.length && b.length ? d3.mean(v) - d3.mean(b) : null; })();
  if (se.xs.length > 6) {
    var res = analyze(se.xs, se.ys);
    out += '<div class="blk"><h3>¿Cuánto se ha calentado?</h3>' +
      '<div class="grid2"><div class="kpi"><div class="k">Últimos 10 años frente a los 80</div><div class="v" style="color:#ff7a59">' + (recent !== null ? sfmt(recent, 2) + ' °C' : '—') + '</div></div>' +
      '<div class="kpi"><div class="k">' + (w ? 'Promedio ' + w.from + '–' + w.to + ' frente a los 80' : 'Tendencia') + '</div><div class="v">' + (w ? sfmt(w.d, 2) + ' °C' : '—') + '</div></div></div>' +
      '<div class="chart">' + chartSVG(se.xs, se.ys, res, { marker: S.year, varName: 'Temperatura media anual', aria: 'Temperatura anual en ' + z.short }) + '</div>' +
      verdictHTML(res, { per: se.xs[0] + '–' + se.xs[se.xs.length - 1], dec: 2, unit: '°C', subject: 'La temperatura' }) +
      '<div class="src">' + (se.measured ? 'Temperatura media anual del aire medida en la zona (NASA POWER, MERRA-2).' : 'Estimado: clima de la zona (WorldClim) + anomalía anual de NASA GISTEMP. Con «npm run historico» pasa a ser medido.') + '</div></div>';
  }
  var dT = recent !== null ? Math.max(recent, 0) : 0, shift = dT / LAPSE * 100;
  if (z.id === 'nevados') {
    out += '<div class="blk"><h3>El clima sube la montaña</h3><p class="verdict">La temperatura baja unos 0,6 °C por cada 100 m de altura' + cite('gradiente') + '. Con ' + sfmt(dT, 2) + ' °C más, cada franja de clima queda unos <b>' + fmt(shift, 0) + ' m más arriba</b>: el páramo y el superpáramo suben y el glaciar se queda sin el frío que necesita en la parte baja.</p>' +
      mountainSVG(5321, shift, [[600, 2800, 'Bosque andino', '#166534'], [2800, 3300, 'Bosque altoandino', '#15803d'], [3300, 4100, 'Páramo', '#a3a34a'], [4100, 4800, 'Superpáramo', '#8b7d6b'], [4800, 6000, 'Glaciar', '#e0f2fe']]) +
      '<div class="src">Franjas aproximadas; la flecha muestra el desplazamiento por el calentamiento medido.</div></div>' +
      '<div class="blk"><h3>Los glaciares se están yendo</h3>' + impactRows([['Nevado del Ruiz', 'Nevado del Ruiz'], ['Nevado Santa Isabel', 'Santa Isabel'], ['Nevado del Tolima', 'Tolima']]) +
      '<p class="verdict">Mientras la zona se calentaba, el Santa Isabel perdió casi todo su hielo y su glaciar Conejeras desapareció en 2024. Menos glaciar y páramo significa menos agua guardada para los más de 3 millones de personas que dependen del parque.</p><div class="src">IDEAM' + cite('ideamPpt') + cite('bluSI') + cite('minAmbNev') + '</div></div>';
  } else if (z.id === 'sierra') {
    out += '<div class="blk"><h3>El clima sube la montaña</h3><p class="verdict">Con ' + sfmt(dT, 2) + ' °C más, las franjas de clima suben unos <b>' + fmt(shift, 0) + ' m</b>' + cite('gradiente') + '. En la montaña costera más alta del mundo, eso empuja páramos y cultivos hacia arriba y deja a los glaciares sin frío.</p>' +
      mountainSVG(5775, shift, [[600, 2500, 'Bosque', '#166534'], [2500, 3300, 'Bosque altoandino', '#15803d'], [3300, 4100, 'Páramo', '#a3a34a'], [4100, 4900, 'Superpáramo', '#8b7d6b'], [4900, 6200, 'Glaciar', '#e0f2fe']]) + '</div>' +
      '<div class="blk"><h3>Glaciares de la Sierra</h3>' + impactRows([['Sierra Nevada de Santa Marta', 'Sierra Nevada']]) +
      '<p class="verdict">Las heladas de madrugada y el calor del mediodía arruinan cosechas, y en enero de 2024 Santa Marta llegó a un récord de 40 °C.</p><div class="src">' + cite('ideamPpt') + cite('afpSierra') + '</div></div>';
  } else if (z.id === 'chingaza') {
    out += '<div class="blk"><h3>El páramo se queda sin espacio</h3><p class="verdict">Con ' + sfmt(dT, 2) + ' °C más, el clima de páramo sube unos <b>' + fmt(shift, 0) + ' m</b>' + cite('gradiente') + '. Como la montaña se acaba, el páramo no tiene hacia dónde subir y se encoge; las especies tienen que buscar zonas más altas' + cite('iriParamo') + '.</p>' +
      mountainSVG(4000, shift, [[600, 2800, 'Bosque andino', '#166534'], [2800, 3200, 'Bosque altoandino', '#15803d'], [3200, 4200, 'Páramo', '#a3a34a']], true) + '</div>' +
      '<div class="blk"><h3>Y eso es agua para Bogotá</h3><div class="grid2"><div class="kpi"><div class="k">Agua de Bogotá que sale de Chingaza</div><div class="v">≈ 70 %</div></div><div class="kpi"><div class="k">Páramo de Chingaza que dejaría de ser apto (2041–2060, época seca)</div><div class="v">39–52 %</div></div></div>' +
      '<p class="verdict">El páramo funciona como una esponja que guarda y suelta el agua. Con más calor y menos lluvia, en 2024 el embalse bajó a 16,97 % y Bogotá tuvo un año de racionamiento.</p><div class="src">' + cite('chingaza') + cite('paramoChingaza') + cite('racionNivel') + '</div></div>';
  } else if (z.id === 'caribe') {
    var sz = SSTZ.sanandres, sx = sz.v.map(function (_, i) { return 1970 + i; }), sres = analyze(sx, sz.v);
    out += '<div class="blk"><h3>El mar se calienta y el coral se blanquea</h3><div class="chart">' + chartSVG(sx, sz.v, sres, { marker: S.year, varName: 'Temperatura del mar', aria: 'Temperatura del mar en San Andrés' }) + '</div>' +
      verdictHTML(sres, { per: '1970–2021', dec: 2, unit: '°C', subject: 'La temperatura del mar en San Andrés' }) +
      '<p class="verdict">Los corales se estresan cuando el agua pasa 1 °C por encima de su máximo habitual de verano' + cite('crw') + '. Cada décima de calentamiento de fondo hace más fácil cruzar ese umbral en las olas de calor: en 2023 un blanqueamiento masivo mató casi todo el coral cuerno de alce de Little Reef.</p>' +
      '<div class="grid2"><div class="kpi"><div class="k">Cobertura de coral, 1995</div><div class="v">≈ 45 %</div></div><div class="kpi"><div class="k">Cobertura de coral, 2024</div><div class="v" style="color:#ff7a59">1,13 %</div></div></div><div class="src">NOAA ERSSTv5 ·' + cite('coral') + '</div></div>';
  } else if (z.id === 'amazonia') {
    out += '<div class="blk"><h3>Calor y deforestación</h3>' + deforBlock() + '<p class="verdict">La selva enfría el aire al transpirar agua. Más calor y menos bosque significan suelos más secos y más riesgo de incendios en la temporada seca.</p></div>';
  } else if (z.id === 'choco') {
    out += '<div class="blk"><h3>Una de las zonas más lluviosas del planeta</h3><p class="verdict">Aquí llueven entre 8.000 y 13.000 mm al año' + cite('lloro') + '. El calentamiento se suma a una región muy húmeda: para ver si la lluvia también está cambiando, usa la pestaña «Investiga» y descarga la lluvia de NASA GPM.</p></div>';
  }
  return out || '<p class="verdict">Aún no hay datos de temperatura para esta zona.</p>';
}
function impactRows(pairs) {
  return pairs.map(function (p) {
    var g = GLACIER[p[0]]; if (!g) return '';
    var a = g.filter(function (d) { return d[0] === 1985; })[0], b = g[g.length - 1];
    var pct = (b[1] - a[1]) / a[1] * 100;
    return '<div class="row" style="gap:8px;flex-wrap:nowrap;margin:4px 0"><span style="width:92px;font-size:12.5px">' + esc(p[1]) + '</span>' +
      '<span class="tb" style="flex:1;position:relative"><span style="width:100%;background:#334155"></span><span style="position:absolute;left:0;top:0;bottom:0;width:' + clamp(b[1] / a[1] * 100, 1, 100) + '%;background:#7dd3fc;border-radius:3px"></span></span>' +
      '<span style="white-space:nowrap;text-align:right;font-size:12px">' + fmt(a[1], 2) + ' → ' + fmt(b[1], 2) + ' km² <b style="color:#ff7a59">' + sfmt(pct, 0) + ' %</b></span></div>';
  }).join('') + '<div class="src">Área glaciar 1985 → ' + 'último dato. Barra: lo que queda.</div>';
}
function histBlock(z) {
  var keys = z.id === 'caribe' ? ['sanandres', 'caribe'] : [null];
  return keys.map(function (k) {
    var pt = histPoint(z.id, k);
    if (!pt) return '';
    var ys = Object.keys(pt.temp).map(Number).sort(function (a, b) { return a - b; });
    var h2 = '';
    if (ys.length > 6) {
      var vs = ys.map(function (y) { return pt.temp[y]; }), res = analyze(ys, vs);
      h2 += '<div class="blk"><h3>Temperatura del aire · ' + esc(pt.nombre) + '</h3><div class="chart">' + chartSVG(ys, vs, res, { marker: S.year, varName: 'Temperatura del aire', aria: 'Temperatura anual en ' + pt.nombre }) + '</div>' +
        verdictHTML(res, { per: ys[0] + '–' + ys[ys.length - 1], dec: 2, unit: '°C', subject: 'La temperatura del aire' }) +
        '<div class="src">' + esc(HIST.fuentes.temperatura) + '.</div></div>';
    }
    var ay = Object.keys(pt.aire || {}).map(Number).sort(function (a, b) { return a - b; });
    if (ay.length) {
      h2 += '<div class="blk"><h3>Calidad del aire (PM2.5) · ' + esc(pt.nombre) + '</h3>' + ay.map(function (y) {
        var a = pt.aire[y], c = catOf(AIR_CATS, a.v);
        return '<div class="row" style="gap:8px;flex-wrap:nowrap"><span style="width:62px;font-size:12.5px">' + y + (a.parcial ? '*' : '') + '</span><span class="tb" style="flex:1"><span style="width:' + clamp(a.v / 35 * 100, 4, 100) + '%;background:' + c[2] + '"></span></span><span style="width:70px;text-align:right;font-size:12.5px">' + fmt(a.v, 1) + ' µg/m³</span>' + badge(c) + '</div>';
      }).join('') + '<div class="src">' + esc(HIST.fuentes.aire) + '. * año en curso.</div></div>';
    }
    return h2;
  }).join('');
}
function zoneTabHTML(z) {
  if (S.zoneTab === 'impacto') return impactHTML(z);
  if (S.zoneTab === 'resumen') {
    return '<ul class="facts">' + z.facts.map(function (f) {
      var src = SRC[f[1]];
      return '<li>' + esc(f[0]) + ' <a href="' + src[1] + '" target="_blank" rel="noopener">' + esc(src[0]) + '</a></li>';
    }).join('') + '</ul>';
  }
  if (S.zoneTab === 'datos') {
    var histHTML = histBlock(z);
    if (!z.data.length && histHTML) return histHTML;
    if (!z.data.length) return '<p class="verdict">Para esta zona aún no hay una serie incluida en la app. En la pestaña «Investiga con NASA» tienes el recuadro exacto y las variables para descargar la lluvia de GPM y analizarla aquí mismo.</p>';
    return z.data.map(function (d) {
      if (d.indexOf('glacier:') === 0) return glacierBlock(d.slice(8).split(','));
      if (d.indexOf('sst:') === 0) return sstBlock(d.slice(4));
      if (d === 'defor') return deforBlock();
      return '';
    }).join('') + histHTML;
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
  var tabs = [['impacto', 'Impacto'], ['resumen', 'Resumen'], ['datos', 'Datos'], ['investiga', 'Investiga'], ['eventos', 'Eventos']];
  $('#aBody').innerHTML =
    '<button class="btn gold zsat" id="zSatBtn">🛰 Ver la zona en satélite (zoom)</button>' +
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
  $('#zSatBtn').addEventListener('click', function () { openSat(z.id); });
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
S.ym = 'temp';
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
  if (S.focus === 'colombia') {
    var order = [['nevados'], ['sierra'], ['caribe', 'sanandres'], ['caribe', 'caribe'], ['amazonia'], ['chingaza'], ['choco']];
    var zr = order.map(function (o) {
      var z = zoneById(o[0]), pt = histPoint(o[0], o[1]), nm = o[0] === 'caribe' ? PT_NAME[o[1]] : z.short;
      if (S.ym === 'cambio') {
        var w2 = warming(o[0], o[1], Math.min(y, LAST_YEAR - 1)), c3 = w2 ? catOfAnom(w2.d) : null;
        return '<tr><td>' + z.n + '. ' + esc(nm) + (w2 && w2.m !== null ? '<small>Las franjas de clima ' + (w2.m >= 0 ? 'subieron ' : 'bajaron ') + fmt(Math.abs(w2.m), 0) + ' m</small>' : '') + '</td><td class="v">' + (w2 ? sfmt(w2.d, 2) + ' °C' : '—') + '</td><td>' + (c3 ? badge(c3) : badge([0, 'Sin dato', '#334155'])) + '</td></tr>';
      }
      if (S.ym === 'aire') {
        var a2 = yearAir(o[0], o[1], y);
        return '<tr><td>' + z.n + '. ' + esc(nm) + (a2 ? '<small>' + esc(a2.src) + '</small>' : '') + '</td><td class="v">' + (a2 ? fmt(a2.v, 1) + ' µg/m³' : '—') + '</td><td>' + (a2 ? badge(catOf(AIR_CATS, a2.v)) + (a2.parcial ? '<small>año parcial</small>' : '') : badge([0, 'Sin dato', '#334155'])) + '</td></tr>';
      }
      var t2 = yearTemp(o[0], o[1], y), c2 = t2 && t2.anom !== null ? catOfAnom(t2.anom) : null;
      return '<tr><td>' + z.n + '. ' + esc(nm) + (t2 ? '<small>' + (t2.anom !== null ? sfmt(t2.anom, 2) + ' °C frente a 1991–2020 · ' : '') + esc(t2.src) + '</small>' : '') + '</td><td class="v">' + (t2 ? fmt(t2.v, 1) + ' °C' : '—') + '</td><td>' + (c2 ? badge(c2) : badge([0, 'Sin dato', '#334155'])) + '</td></tr>';
    }).join('');
    html += '<div class="yt-sub">Zonas de Colombia · promedio de ' + y + '</div><table class="yt"><thead><tr><th>Zona</th><th style="text-align:right">' + (S.ym === 'aire' ? 'PM2.5' : S.ym === 'cambio' ? 'Cambio' : 'Temp. media') + '</th><th>Condición</th></tr></thead><tbody>' + zr + '</tbody></table>';
    if (S.ym === 'cambio') html += '<div class="src">Cuánto más caliente estuvieron los 5 años hasta ' + Math.min(y, LAST_YEAR - 1) + ' que el promedio 1981–1990 de cada zona (5 años para que un solo año de El Niño no engañe). En las montañas, cada 0,6 °C de calentamiento equivale a que el clima «sube» unos 100 m (' + srcLink('gradiente') + '): plantas, cultivos y animales tienen que subir con él. Toca una zona y abre «Impacto» para ver qué significa allí.</div>';
    else html += HIST ? '<div class="src">' + esc(S.ym === 'aire' ? HIST.fuentes.aire + '. Disponible desde 2023.' : HIST.fuentes.temperatura + '. Disponible desde 1981; la condición compara con el promedio 1991–2020 de cada zona.') + '</div>'
      : '<div class="src">' + (S.ym === 'aire' ? 'Promedio anual de PM2.5 (desde 1990). Las zonas usan la medición más cercana disponible: Bogotá para Chingaza y el promedio de Colombia para las demás. Con <b>npm run historico</b> cada zona pasa a tener su propio dato (Copernicus CAMS).' : 'Promedio anual (1970–2025). Tierra: clima de la zona ajustado con la anomalía del año de NASA GISTEMP; Caribe: temperatura del mar medida (NOAA ERSSTv5). Con <b>npm run historico</b> cada zona pasa a tener su dato medido (NASA POWER).') + '</div>';
    html += '<div class="yt-sub">Referencia</div>';
  }
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
  } else if (S.ym === 'cambio' && S.focus !== 'colombia') {
    html += '<div class="src">Entra a <b>Colombia</b> para ver cuánto se ha calentado cada zona y qué le está pasando.</div>';
  } else if (S.ym === 'cambio') {
    html = html.replace('<div class="yt-sub">Referencia</div>', '');
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
document.querySelectorAll('[data-ym]').forEach(function (b) { b.addEventListener('click', function () { S.ym = b.getAttribute('data-ym'); renderYearTable(); requestDraw(); }); });
$('#ytToggle').addEventListener('click', function () {
  var t = $('#ytable'), c = t.classList.toggle('collapsed');
  $('#stage').classList.toggle('has-yt', !c);
  this.setAttribute('aria-expanded', String(!c));
  this.setAttribute('aria-label', c ? 'Expandir tabla' : 'Contraer tabla');
  this.innerHTML = c ? '<svg class="ic" width="16" height="16" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>' : '<svg class="ic" width="16" height="16" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
});

/* ---------- controles ---------- */
document.querySelectorAll('.tool[data-layer]').forEach(function (b) {
  b.addEventListener('click', function () { setLayer(b.getAttribute('data-layer'), true); });
});
$('#year').addEventListener('input', function (e) { setYear(+e.target.value, true); });
$('#play').addEventListener('click', function () { setPlaying(!S.playing); });
$('#speed').addEventListener('input', function () { if (S.playing) setPlaying(true); });
$('#latest').addEventListener('click', function () { setPlaying(false); setYear(tlRange()[1], true); });
$('#zoom').addEventListener('input', function (e) { stopAuto(); setZoom(+e.target.value); });
$('#zIn').addEventListener('click', function () { if (S.flat && SAT.map) satSetZoom(satGetZoom() + 1); else setZoom(zoomK * 1.25); });
$('#zOut').addEventListener('click', function () { if (S.flat && SAT.map) satSetZoom(satGetZoom() - 1); else setZoom(zoomK / 1.25); });
$('#aClose').addEventListener('click', function () { for (var h = 0; h < HOOKS.close.length; h++) if (HOOKS.close[h]()) return; S.sel = null; S.zone = null; $('#analysis').hidden = true; renderZoneList(); setupTimeline(); renderEvents(); renderSteps(); requestDraw(); });
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
// Fechas aceptadas: 2010 · 2010-03 · 2010-03-15 · 2010/03/15 · 15/03/2010 · 15-03-2010 · 03/2010 · 2010-03-15T00:00
function parseDate(s) {
  s = String(s).replace(/"/g, '').trim();
  var m = /^(\d{4})(?:[-\/.](\d{1,2}))?(?:[-\/.](\d{1,2}))?(?:[T ].*)?$/.exec(s), y, mo = null, d = 1;
  if (m) { y = +m[1]; mo = m[2] ? +m[2] : null; d = m[3] ? +m[3] : 1; }
  else if ((m = /^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})(?:[T ].*)?$/.exec(s))) { d = +m[1]; mo = +m[2]; y = +m[3]; if (mo > 12 && d <= 12) { var t = d; d = mo; mo = t; } }
  else if ((m = /^(\d{1,2})[-\/.](\d{4})$/.exec(s))) { mo = +m[1]; y = +m[2]; }
  else return null;
  if (y < 1800 || y > 2200) return null;
  if (mo !== null && (mo < 1 || mo > 12)) return null;
  if (d < 1 || d > 31) return null;
  return { t: mo === null ? y + 0.5 : y + (mo - 1) / 12 + (d - 1) / 365.25, mo: mo, y: y };
}
function parseNum(txt, delim) {
  var t = String(txt).replace(/"/g, '').trim();
  if (!t) return NaN;
  if (delim === ';' || /^-?\d+,\d+$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');   // coma decimal (Excel en español)
  return /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(t) ? parseFloat(t) : NaN;
}
function parseCSV(text) {
  var lines = text.replace(/^﻿/, '').replace(/\r/g, '').split('\n');
  var info = { unit: '', title: '', fill: null, name: '' }, rows = [], header = null, bad = [], fills = 0, dataLike = 0;
  lines.forEach(function (raw, ln) {
    var line = raw.trim();
    if (!line || line[0] === '#') return;
    var delim = line.indexOf('\t') >= 0 ? '\t' : (line.indexOf(';') >= 0 && line.indexOf(',') < 0) ? ';' : (line.indexOf(';') >= 0 && /\d,\d/.test(line)) ? ';' : ',';
    var parts = splitLine(line, delim), k = parts[0].toLowerCase().replace(/"/g, '');
    if (/^unit/.test(k)) { info.unit = parts.slice(1).join(' ').replace(/"/g, '').trim(); return; }
    if (/^fill value/.test(k)) { info.fill = parseNum(parts[1], ','); return; }
    if (/^title/.test(k)) { info.title = parts.slice(1).join(', ').replace(/"/g, '').trim(); return; }
    var d = parseDate(parts[0]);
    if (d) {
      dataLike++;
      var v = parts.length >= 2 ? parseNum(parts[1], delim) : NaN;
      if (!isFinite(v)) { bad.push(ln + 1); return; }
      if ((info.fill !== null && Math.abs(v - info.fill) < 1e-6) || v <= -9000 || v >= 9.9e30) { fills++; return; }
      rows.push({ t: d.t, mo: d.mo, v: v });
    } else if (parts.length >= 2 && !rows.length) header = parts;
    else if (rows.length) { dataLike++; bad.push(ln + 1); }
  });
  if (header && header[1]) {
    info.name = header[1].replace(/"/g, '').replace(/^mean_/, '').replace(/_/g, ' ');
    var hm = /\(([^)]+)\)|\[([^\]]+)\]/.exec(header[1]); if (hm && !info.unit) info.unit = hm[1] || hm[2];
  }
  rows.sort(function (a, b) { return a.t - b.t; });
  // fechas repetidas: se promedian
  var dup = 0, merged = [];
  rows.forEach(function (r) { var l = merged[merged.length - 1]; if (l && Math.abs(l.t - r.t) < 1e-9) { l.sum += r.v; l.n++; dup++; } else merged.push({ t: r.t, mo: r.mo, sum: r.v, n: 1 }); });
  rows = merged.map(function (r) { return { t: r.t, mo: r.mo, v: r.sum / r.n }; });
  return { info: info, rows: rows, bad: bad, fills: fills, dup: dup, dataLike: dataLike };
}
var upData = null;
function upStatus(kind, text) {
  var el = $('#upStatus'); if (!el) return;
  el.className = 'upstatus ' + kind; el.innerHTML = text; el.hidden = !text;
}
function freqOf(rows) {
  var st = d3.median(d3.pairs(rows, function (a, b) { return b.t - a.t; }));
  return st < 0.01 ? 'diaria' : st < 0.1 ? 'mensual' : st < 0.4 ? 'estacional' : st < 1.6 ? 'anual' : 'irregular';
}
var MESES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function tLabel(r) { var y = Math.floor(r.t); return r.mo ? MESES_C[r.mo - 1] + ' ' + y : String(y); }
function renderUpload() {
  var out = $('#upOut');
  if (!upData) return;
  var rows = upData.rows, info = upData.info;
  var skipped = upData.bad.length ? '<li>' + upData.bad.length + ' fila(s) no se pudieron leer (líneas ' + upData.bad.slice(0, 6).join(', ') + (upData.bad.length > 6 ? '…' : '') + ').</li>' : '';
  if (upData.fills) skipped += '<li>' + upData.fills + ' valor(es) marcados como “sin dato” se ignoraron.</li>';
  if (upData.dup) skipped += '<li>' + upData.dup + ' fecha(s) repetidas se promediaron.</li>';
  if (rows.length < 6) {
    $('#deseaRow').style.display = 'none';
    upStatus('err', '❌ Error: datos insuficientes');
    out.innerHTML = '<div class="uperr"><b>No hay suficientes datos para analizar.</b><p>Encontré <b>' + rows.length + '</b> fila(s) válidas con fecha y valor; se necesitan al menos 6.</p>' + (skipped ? '<ul>' + skipped + '</ul>' : '') +
      '<p>El archivo debe tener dos columnas: <b>fecha</b> (por ejemplo 2010, 2010-03 o 15/03/2010) y <b>valor</b> (número). Puede venir de Giovanni de NASA o de Excel guardado como CSV.</p></div>';
    return;
  }
  var freq = freqOf(rows), monthly = freq === 'mensual' && rows.every(function (r) { return r.mo !== null; });
  $('#deseaRow').style.display = monthly ? 'flex' : 'none';
  var ys = rows.map(function (r) { return r.v; }), xs = rows.map(function (r) { return r.mo === null ? Math.floor(r.t) : r.t; });   // datos anuales: el año exacto
  var desea = monthly && $('#desea').checked;
  if (desea) {
    var sum = d3.range(12).map(function () { return 0; }), cnt = sum.slice();
    rows.forEach(function (r) { sum[r.mo - 1] += r.v; cnt[r.mo - 1]++; });
    var mean = d3.mean(ys);
    ys = rows.map(function (r) { return r.v - sum[r.mo - 1] / cnt[r.mo - 1] + mean; });
  }
  var res = analyze(xs, ys);
  var span = Math.floor(xs[0]) + '–' + Math.floor(xs[xs.length - 1]);
  var unit = info.unit || '';
  var mag = d3.max(ys, Math.abs) || 1, dec = mag >= 100 ? 1 : mag >= 1 ? 2 : 4;
  var iMax = d3.maxIndex(rows, function (r) { return r.v; }), iMin = d3.minIndex(rows, function (r) { return r.v; });
  var u = unit ? ' ' + esc(unit) : '';
  out.innerHTML =
    '<div class="upsum"><div class="k">Resumen de tus datos</div><b>' + esc(info.name || 'Serie cargada') + '</b>' + (info.title ? '<div class="src">' + esc(info.title) + '</div>' : '') +
    '<div class="upgrid"><span>Datos válidos</span><b>' + rows.length + '</b><span>Periodo</span><b>' + tLabel(rows[0]) + ' – ' + tLabel(rows[rows.length - 1]) + '</b><span>Frecuencia</span><b>' + freq + '</b><span>Unidad</span><b>' + (unit ? esc(unit) : 'no indicada') + '</b>' +
    '<span>Promedio</span><b>' + fmt(d3.mean(rows, function (r) { return r.v; }), dec) + u + '</b><span>Máximo</span><b>' + fmt(rows[iMax].v, dec) + u + ' (' + tLabel(rows[iMax]) + ')</b><span>Mínimo</span><b>' + fmt(rows[iMin].v, dec) + u + ' (' + tLabel(rows[iMin]) + ')</b></div>' +
    (skipped ? '<ul class="upwarn">' + skipped + '</ul>' : '') + '</div>' +
    '<div class="chart" style="margin:10px 0">' + chartSVG(xs, ys, res, { aria: 'Serie de tiempo cargada', title: info.name || 'Tus datos', varName: info.name || 'Valor', unit: unit, freq: freq + (desea ? ' · sin el ciclo de las estaciones' : ''), name: info.name || 'Tus datos' }) + '</div>' +
    verdictHTML(res, { per: span, dec: dec, unit: unit || 'unidades', subject: 'La variable', neutral: !/°\s*C|^K$|kelvin|celsius|deg/i.test(unit) });
  upStatus('ok', '✅ Análisis finalizado · ' + rows.length + ' datos' + (upData.bad.length || upData.fills ? ' · ' + (upData.bad.length + upData.fills) + ' descartados' : ''));
  setStep(1); setStep(2);
}
function readFile(f) {
  if (!f) return;
  upData = null; $('#upOut').innerHTML = ''; $('#deseaRow').style.display = 'none';
  var ext = (/\.([a-z0-9]+)$/i.exec(f.name) || [])[1] || '';
  ext = ext.toLowerCase();
  var kb = f.size < 1024 ? f.size + ' B' : (f.size / 1024).toFixed(1).replace('.', ',') + ' KB';
  if (['csv', 'txt', 'tsv'].indexOf(ext) < 0) {
    upStatus('err', '❌ Formato no compatible');
    $('#upOut').innerHTML = '<div class="uperr"><b>«' + esc(f.name) + '» no es un archivo de texto con datos.</b><p>Usa un archivo <b>.csv</b>, <b>.txt</b> o <b>.tsv</b>. Si tienes un Excel (.xlsx), ábrelo y elige <i>Guardar como → CSV</i>.</p></div>';
    return;
  }
  if (f.size === 0) { upStatus('err', '❌ Archivo vacío'); $('#upOut').innerHTML = '<div class="uperr"><b>«' + esc(f.name) + '» está vacío</b> (0 bytes). Revisa que hayas guardado los datos antes de subirlo.</div>'; return; }
  if (f.size > 20 * 1024 * 1024) { upStatus('err', '❌ Archivo demasiado grande'); $('#upOut').innerHTML = '<div class="uperr">El archivo pesa ' + kb + '. El máximo es 20 MB.</div>'; return; }
  upStatus('busy', '📄 Archivo cargado: <b>' + esc(f.name) + '</b> (' + kb + ') · ⏳ Analizando…');
  var r = new FileReader();
  r.onload = function () {
    var txt = String(r.result);
    if (/\u0000/.test(txt.slice(0, 4000)) || (txt.slice(0, 4000).match(/�/g) || []).length > 20) {
      upStatus('err', '❌ Formato no compatible');
      $('#upOut').innerHTML = '<div class="uperr"><b>El contenido no es texto</b> aunque el nombre termine en .' + esc(ext) + '. Puede ser una imagen o un Excel renombrado. Guarda los datos como CSV.</div>';
      return;
    }
    if (!txt.trim()) { upStatus('err', '❌ Archivo vacío'); $('#upOut').innerHTML = '<div class="uperr"><b>«' + esc(f.name) + '» no tiene datos</b> (solo espacios o líneas en blanco).</div>'; return; }
    setTimeout(function () {
      try { upData = parseCSV(txt); renderUpload(); }
      catch (err) { upStatus('err', '❌ Error al analizar'); $('#upOut').innerHTML = '<div class="uperr">Ocurrió un error leyendo el archivo: ' + esc(err.message) + '</div>'; }
    }, 30);
  };
  r.onerror = function () { upStatus('err', '❌ Error'); $('#upOut').innerHTML = '<div class="uperr">No se pudo leer el archivo.</div>'; };
  r.readAsText(f);
}
$('#file').addEventListener('change', function (e) { readFile(e.target.files[0]); e.target.value = ''; });   // permite volver a elegir el mismo archivo
$('#desea').addEventListener('change', renderUpload);
var drop = $('#drop');
['dragenter', 'dragover'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
drop.addEventListener('drop', function (e) { readFile(e.dataTransfer.files[0]); });

/* ---------- carga ---------- */
resize(); renderSteps();
if (initGL()) {
  Promise.all([loadTexture('data/earth.jpg', 0), loadTexture('data/water.jpg', 1), loadTexture('data/clouds.jpg', 2)])
    .then(function (t) { glTex.earth = t[0]; glTex.water = t[1]; glTex.clouds = t[2]; glReady = true; dataTexDirty = true; requestDraw(); })
    .catch(function () { glReady = false; });
  loadTexture('data/topo.png', 5).then(function (t) { glTex.topo = t; requestDraw(); }).catch(function () {});   // relieve (NASA, vía three-globe)
}
$('#reliefBtn').addEventListener('click', function () {
  S.relief = !S.relief; this.setAttribute('aria-pressed', String(S.relief));
  legend(); requestDraw();
});
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
    setFocus('colombia');   // la app se enfoca solo en Colombia
    if (S.year === LAST_YEAR) fetchLive();
    loadHist();
  })
  .catch(function (err) {
    $('#loading').textContent = 'No se pudieron cargar los datos: ' + err.message;
  });
/* ---------- vista satelital con calles (Google Maps si hay llave; si no, Leaflet + Esri) ---------- */
var SAT = { mode: null, map: null, base: null, labels: null, layer: 'esri', zone: null, errors: 0, ok: 0, marks: [], gInfo: null, modis: null, labelsOn: true, cfg: null };
var SAT_PLACES = {
  nevados: [['Toda la zona', null], ['Nevado del Ruiz', [4.892, -75.324, 13]], ['Nevado Santa Isabel', [4.818, -75.369, 13]], ['Nevado del Tolima', [4.659, -75.33, 13]], ['Manizales', [5.068, -75.517, 13]]],
  sierra: [['Toda la zona', null], ['Picos nevados', [10.84, -73.69, 12]], ['Santa Marta', [11.24, -74.2, 13]]],
  caribe: [['San Andrés y Providencia', 'bbox'], ['San Andrés', [12.55, -81.72, 13]], ['Providencia', [13.36, -81.37, 13]], ['Ciénaga Grande', 'bbox2']],
  amazonia: [['Toda la zona', null], ['San José del Guaviare', [2.57, -72.64, 13]], ['Chiribiquete', [0.6, -72.6, 9]]],
  chingaza: [['Toda la zona', null], ['Páramo de Chingaza', [4.63, -73.72, 12]], ['Bogotá', [4.65, -74.1, 12]], ['Páramo de Sumapaz', [3.9, -74.3, 11]]],
  choco: [['Toda la zona', null], ['Quibdó y río Atrato', [5.69, -76.65, 13]], ['Costa Pacífica', [5.5, -77.3, 10]]]
};
function modisDate() { var y = clamp(Math.min(S.year, LAST_YEAR), 2001, LAST_YEAR); return y + '-01-15'; }
function modisURL(z, x, y) { return 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/' + modisDate() + '/GoogleMapsCompatible_Level9/' + z + '/' + y + '/' + x + '.jpg'; }
function satConfig() {
  if (SAT.cfg) return Promise.resolve(SAT.cfg);
  var ctl = window.AbortController ? new AbortController() : null;
  if (ctl) setTimeout(function () { ctl.abort(); }, 3000);
  return fetch(API_BASE + '/api/config', ctl ? { signal: ctl.signal } : {}).then(function (r) { return r.ok ? r.json() : {}; })
    .catch(function () { return {}; }).then(function (c) { SAT.cfg = c || {}; return SAT.cfg; });
}
function loadGoogle(key) {
  if (window.google && google.maps) return Promise.resolve();
  return new Promise(function (ok, bad) {
    window.__gmReady = ok;
    var sc = document.createElement('script');
    sc.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(key) + '&v=weekly&language=es&region=CO&callback=__gmReady';
    sc.async = true; sc.onerror = bad; document.head.appendChild(sc);
    setTimeout(function () { bad(new Error('timeout')); }, 9000);
  });
}
function satNote(html) { var n = $('#satNote'); n.hidden = !html; if (html) n.innerHTML = html; }
/* --- Leaflet (respaldo sin llave) --- */
function lfWatch(layer) {
  layer.on('tileload', function () { SAT.ok++; satNote(''); });
  layer.on('tileerror', function () {
    SAT.errors++;
    if (SAT.errors > 6 && SAT.ok === 0) satNote('<b>Esta vista no puede cargar imágenes satelitales.</b><br>La vista previa de Claude bloquea las imágenes de otros sitios. Abre la app en tu computador (<b>localhost:8080</b>) o en su enlace de Render y aquí verás el satélite con calles.');
  });
  return layer;
}
function lfInit(center, zoom) {
  SAT.mode = 'leaflet';
  SAT.map = L.map('flatMap', { zoomControl: false, worldCopyJump: true, minZoom: 3, zoomSnap: 0.25, center: center, zoom: zoom });
  SAT.map.on('zoomend', satZoomed);
  var ref = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/';
  SAT.labels = L.layerGroup([
    lfWatch(L.tileLayer(ref + 'World_Transportation/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, pane: 'overlayPane' })),
    lfWatch(L.tileLayer(ref + 'World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, pane: 'overlayPane' }))
  ]).addTo(SAT.map);
  L.control.scale({ imperial: false }).addTo(SAT.map);
}
/* --- Google Maps --- */
function gInit(center, zoom) {
  SAT.mode = 'google';
  SAT.map = new google.maps.Map($('#flatMap'), {
    center: { lat: center[0], lng: center[1] }, zoom: Math.round(zoom), mapTypeId: 'hybrid', gestureHandling: 'greedy', isFractionalZoomEnabled: true,
    mapTypeControl: true, mapTypeControlOptions: { position: google.maps.ControlPosition.LEFT_BOTTOM },
    streetViewControl: true, streetViewControlOptions: { position: google.maps.ControlPosition.LEFT_BOTTOM },
    zoomControl: false, fullscreenControl: false, rotateControl: true, scaleControl: true
  });
  SAT.map.addListener('zoom_changed', satZoomed);
  SAT.gInfo = new google.maps.InfoWindow();
  SAT.modis = new google.maps.ImageMapType({ getTileUrl: function (c, z) { return z > 9 ? null : modisURL(z, c.x, c.y); }, tileSize: new google.maps.Size(256, 256), maxZoom: 9, name: 'NASA MODIS' });
}
function satSetBase(kind) {
  SAT.layer = kind;
  document.querySelectorAll('[data-sl]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-sl') === kind)); });
  if (SAT.mode === 'google') {
    SAT.map.overlayMapTypes.clear();
    if (kind === 'modis') {
      SAT.modis = new google.maps.ImageMapType({ getTileUrl: function (c, z) { return z > 9 ? null : modisURL(z, c.x, c.y); }, tileSize: new google.maps.Size(256, 256), maxZoom: 9, name: 'NASA MODIS' });
      SAT.map.overlayMapTypes.push(SAT.modis);
      if (SAT.map.getZoom() > 9) SAT.map.setZoom(9);
      SAT.map.setOptions({ maxZoom: 9 });
    } else SAT.map.setOptions({ maxZoom: null });
    return;
  }
  if (SAT.base) SAT.map.removeLayer(SAT.base);
  SAT.base = kind === 'modis'
    ? lfWatch(L.tileLayer(modisURL('{z}', '{x}', '{y}').replace('%7Bz%7D', '{z}'), { maxNativeZoom: 9, maxZoom: 12, attribution: 'NASA EOSDIS GIBS · MODIS Terra, ' + modisDate() }))
    : lfWatch(L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 18, maxZoom: 19, attribution: 'Imágenes © Esri, Maxar, Earthstar Geographics' }));
  SAT.base.addTo(SAT.map); SAT.base.bringToBack();
  if (kind === 'modis' && SAT.map.getZoom() > 11) SAT.map.setZoom(10);
}
function satView(lat, lon, zoom) {
  if (SAT.layer === 'modis') zoom = Math.min(zoom, 9);
  if (SAT.mode === 'google') { SAT.map.panTo({ lat: lat, lng: lon }); SAT.map.setZoom(zoom); }
  else SAT.map.flyTo([lat, lon], zoom, { duration: 1.4 });
}
function satBounds(b) {
  if (SAT.mode === 'google') SAT.map.fitBounds({ south: b[1], west: b[0], north: b[3], east: b[2] }, 20);
  else SAT.map.flyToBounds([[b[1], b[0]], [b[3], b[2]]], { duration: 1.2, padding: [20, 20] });
}
function satGo(z, place) {
  var t = place[1];
  if (t === null || t === 'bbox' || t === 'bbox2') satBounds(t === 'bbox2' ? z.bbox2 : z.bbox);
  else satView(t[0], t[1], t[2]);
}
function satPopup(id, sea, name) {
  var y = Math.min(S.year, LAST_YEAR - 1), t = yearTemp(id, sea, y), a = yearAir(id, sea, Math.min(S.year, LAST_YEAR)), w = warming(id, sea, y);
  return '<div class="sat-pop" style="min-width:190px"><b>' + esc(name) + '</b>' +
    '<div class="r"><span>Temperatura ' + y + '</span><b>' + (t ? fmt(t.v, 1) + ' °C' : '—') + '</b></div>' +
    (w ? '<div class="r"><span>Frente a los años 80</span><b style="color:#e8590c">' + sfmt(w.d, 2) + ' °C</b></div>' : '') +
    '<div class="r"><span>PM2.5</span><b>' + (a ? fmt(a.v, 1) + ' µg/m³' : '—') + '</b></div></div>';
}
function satClearMarks() {
  SAT.marks.forEach(function (m) { if (SAT.mode === 'google') m.setMap(null); else SAT.map.removeLayer(m); });
  SAT.marks = [];
}
function satDrawZone(z) {
  satClearMarks();
  [z.bbox, z.bbox2].forEach(function (b) {
    if (!b) return;
    SAT.marks.push(SAT.mode === 'google'
      ? new google.maps.Rectangle({ map: SAT.map, bounds: { south: b[1], west: b[0], north: b[3], east: b[2] }, strokeColor: '#fbbf24', strokeWeight: 2, fillOpacity: 0, clickable: false })
      : L.rectangle([[b[1], b[0]], [b[3], b[2]]], { color: '#fbbf24', weight: 2, dashArray: '6 4', fill: false, interactive: false }).addTo(SAT.map));
  });
  var pts = z.id === 'caribe' ? [['sanandres', 12.58, -81.70, 'San Andrés'], ['caribe', 10.85, -74.45, 'Ciénaga Grande de Santa Marta']] : [[null, z.ll[1], z.ll[0], z.short]];
  if (z.id !== 'caribe') { var hp = histPoint(z.id); if (hp) pts = [[null, hp.lat, hp.lon, hp.nombre]]; }
  pts.forEach(function (p) {
    var html = satPopup(z.id, p[0], p[3]);
    if (SAT.mode === 'google') {
      var mk = new google.maps.Marker({ map: SAT.map, position: { lat: p[1], lng: p[2] }, title: p[3],
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#fbbf24', fillOpacity: 1, strokeColor: '#1a1300', strokeWeight: 2 } });
      mk.addListener('click', function () { SAT.gInfo.setContent('<div style="color:#0b1d2c">' + html + '</div>'); SAT.gInfo.open({ map: SAT.map, anchor: mk }); });
      SAT.marks.push(mk);
    } else SAT.marks.push(L.circleMarker([p[1], p[2]], { radius: 9, color: '#1a1300', weight: 2, fillColor: '#fbbf24', fillOpacity: 1 }).bindPopup(html).addTo(SAT.map));
  });
}
function satEnsure(center, zoom) {
  if (SAT.map) {
    if (SAT.mode === 'leaflet') setTimeout(function () { SAT.map.invalidateSize(); }, 50);
    return Promise.resolve();
  }
  return satConfig().then(function (c) {
    if (c.mapsKey) return loadGoogle(c.mapsKey).then(function () { gInit(center, zoom); }).catch(function () { lfInit(center, zoom); });
    lfInit(center, zoom);
  }).then(function () { satSetBase(SAT.layer); });
}
/* conversión entre el acercamiento del globo (zoomK) y el nivel de zoom del mapa web (Mercator) */
function kToZ(k) { var R = Math.min(W, H) * 0.41 * k; return Math.log2(2 * Math.PI * R / 256); }
function zToK(z) { return 256 * Math.pow(2, z) / (2 * Math.PI) / (Math.min(W, H) * 0.41); }
function satGetZoom() { return SAT.map.getZoom(); }
function satSetZoom(z) { if (SAT.mode === 'google') SAT.map.setZoom(z); else SAT.map.setZoom(z); }
function satCenter() { var c = SAT.map.getCenter(); return SAT.mode === 'google' ? [c.lat(), c.lng()] : [c.lat, c.lng]; }
function satZoomed() {
  if (!S.flat || SAT._busy) return;
  var z = satGetZoom(), k = zToK(z);
  if (k < FLAT_K - 0.3) { exitFlat(k); return; }
  $('#zoom').value = Math.min(14, k);
}
// Pasa del globo al mapa satelital con calles (de una zona, o en el punto `at` = [lat, lon])
function enterFlat(id, at, zoom) {
  if (!window.L && !(window.google && google.maps)) return;
  var z = id ? zoneById(id) : null;
  S.flat = true; stopAuto();
  $('#stage').classList.add('flat');
  $('#flatMap').hidden = false; $('#flatBar').hidden = false;
  var center = at || [z.ll[1], z.ll[0]];
  zoom = zoom || kToZ(FLAT_K + 1.5);
  SAT._busy = true;
  satEnsure(center, zoom).then(function () {
    if (SAT.mode === 'leaflet') SAT.map.invalidateSize();
    var places = z ? (SAT_PLACES[id] || [['Toda la zona', null]]) : ZONES.map(function (zz) { return [zz.n + '. ' + zz.short, null, zz.id]; });
    $('#satPlaces').innerHTML = places.map(function (p, i) { return '<button data-sp="' + i + '">' + esc(p[0]) + '</button>'; }).join('');
    $('#satPlaces').querySelectorAll('[data-sp]').forEach(function (b) {
      b.addEventListener('click', function () {
        $('#satPlaces').querySelectorAll('[data-sp]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        var p = places[+b.getAttribute('data-sp')];
        SAT._busy = true;
        if (z) satGo(z, p); else { var zz = zoneById(p[2]); satDrawZone(zz); satGo(zz, ['', zz.ll2 ? 'bbox' : null]); }
        setTimeout(function () { SAT._busy = false; }, 1600);
      });
    });
    if (z) satDrawZone(z); else if (S.zone) satDrawZone(zoneById(S.zone)); else satClearMarks();
    if (z && !at) satGo(z, places[0]); else satView(center[0], center[1], zoom);
    setTimeout(function () { SAT._busy = false; }, 1600);
  });
}
// Vuelve al globo en el mismo punto
function exitFlat(k) {
  if (!S.flat) return;
  var c = SAT.map ? satCenter() : [-rot[1], -rot[0]];
  S.flat = false;
  $('#stage').classList.remove('flat');
  $('#flatMap').hidden = true; $('#flatBar').hidden = true; satNote('');
  rot = [-c[1], -c[0]];
  zoomK = clamp(k || FLAT_K - 1, 0.8, FLAT_K - 0.5); $('#zoom').value = zoomK; requestDraw();
}
function openSat(id) { enterFlat(id); }
document.querySelectorAll('[data-sl]').forEach(function (b) { b.addEventListener('click', function () { if (SAT.map) satSetBase(b.getAttribute('data-sl')); }); });
$('#satLabels').addEventListener('click', function () {
  if (!SAT.map) return;
  SAT.labelsOn = !SAT.labelsOn; this.setAttribute('aria-pressed', String(SAT.labelsOn));
  if (SAT.mode === 'google') SAT.map.setMapTypeId(SAT.labelsOn ? 'hybrid' : 'satellite');
  else if (SAT.labelsOn) SAT.labels.addTo(SAT.map); else SAT.map.removeLayer(SAT.labels);
});
$('#satClose').addEventListener('click', function () { exitFlat(FLAT_K - 1.5); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.flat) exitFlat(FLAT_K - 1.5); });

/* ---------- interfaz para los módulos ---------- */
window.DT = {
  S: S, HOOKS: HOOKS, LAYERS: LAYERS, LINKS: LINKS, scales: scales, EVENTS: EVENTS, LAST_YEAR: LAST_YEAR,
  get D() { return D; }, get Y0() { return Y0; }, get NY() { return NY; }, get cells() { return cells; }, get centers() { return centers; },
  get gistemp() { return gistemp; }, get colombia() { return colombia; }, get HIST() { return HIST; }, get zoomK() { return zoomK; }, get rot() { return rot; },
  get W() { return W; }, get H() { return H; }, get trendP() { return trendP; },
  valAt: valAt, anomAt: anomAt, hasYear: hasYear, cellAt: cellAt, cellValue: cellValue, mapYear: mapYear, oceanName: oceanName, coordText: coordText,
  analyze: analyze, mannKendall: mannKendall, chartSVG: chartSVG, verdictHTML: verdictHTML, fmt: fmt, sfmt: sfmt, pfmt: pfmt, esc: esc, clamp: clamp,
  catOf: catOf, catOfAnom: catOfAnom, badge: badge, AIR_CATS: AIR_CATS, TA_CATS: TA_CATS,
  refresh: refresh, recolor: recolor, legend: legend, requestDraw: requestDraw, renderAnalysis: renderAnalysis, setLayer: setLayer, setYear: setYear,
  setFocus: setFocus, flyTo: flyTo, setupTimeline: setupTimeline, renderInfo: renderInfo, renderTitles: renderTitles, showHover: showHover, stopAuto: stopAuto,
  project: function (ll) { return proj(ll); }, visible: function (ll) { return d3.geoDistance(ll, [-rot[0], -rot[1]]) < Math.PI / 2 - 0.02; },
  markerAt: markerAt, colFar: colFar, geoAt: geoAt, landAt: landAt, zoneSeries: zoneSeries, PT_NAME: PT_NAME, SSTZ: SSTZ,
  zoneById: zoneById, ZONES: ZONES, yearTemp: yearTemp, yearAir: yearAir, histPoint: histPoint, warming: warming, selectZone: selectZone,
  apiBase: function () { return API_BASE; }, live: function () { return LIVE; }, fillPeriod: fillPeriod,
  setZoomK: function (z) { setZoom(z); }, cancelFly: cancelFly, closeZone: function () { S.zone = null; renderZoneList(); setupTimeline(); renderAnalysis(); }
};
document.dispatchEvent(new Event('dt-ready'));
})();
