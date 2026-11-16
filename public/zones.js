/* Zonas de Colombia: datos y fuentes verificadas. */
var SRC = {
  gradiente: [T('Britannica · Clima de Colombia (0,6 °C por cada 100 m)'), 'https://www.britannica.com/place/Colombia/Climate'],
  paramoChingaza: [T('U. del Rosario · Páramos de Chingaza y cambio climático'), 'https://research-hub.urosario.edu.co/display/bfe5d808-7701-4ec7-acea-1cc49b9507c3'],
  iriParamo: [T('IRI, Columbia University · Páramos y cambio climático'), 'https://iri.columbia.edu/news/climate-change-threatens-a-fragile-ecosystem-in-the-andes'],
  crw: [T('NOAA Coral Reef Watch · umbral de blanqueamiento'), 'https://coralreefwatch.noaa.gov/product/5km/tutorial/crw10a_dhw_product.php'],
  ideamPpt: [T('IDEAM · Glaciares de Colombia (2025)'), 'https://ipromolatinoamericano.condesan.org/wp-content/uploads/2025/11/PPT-Andres-Cruz_Glaciares-de-Colombia.pdf'],
  ideamTabla: [T('IDEAM · Evolución del área glaciar'), 'https://ideam.gov.co/file-download/download/public/8803'],
  radioNal24: [T('Radio Nacional · IDEAM y El Niño (2026)'), 'https://radionacional.co/actualidad/medio-ambiente/fenomeno-de-el-nino-aceleraria-derretimiento-de-glaciares-en-colombia'],
  bluSI: ['Blu Radio · Santa Isabel (IDEAM)', 'https://www.bluradio.com/medio-ambiente/este-nevado-de-colombia-esta-a-punto-de-desaparecer-le-quedarian-unos-5-anos-segun-ideam-so35'],
  pnnNevados: [T('Parques Nacionales · PNN Los Nevados'), 'https://old.parquesnacionales.gov.co/portal/wp-content/uploads/2017/12/Descripcion-PNN-Los-Nevados.pdf'],
  minAmbNev: ['MinAmbiente · Los Nevados (2024)', 'https://www.minambiente.gov.co/?p=64126'],
  afpSierra: ['Radio Nacional / AFP · Sierra Nevada', 'https://radionacional.co/noticias-colombia/sierra-nevada-de-santa-marta-en-riesgo-por-cambio-climatico-y-violencia'],
  afpUnesco: ['Buenos Aires Times / AFP · Sierra Nevada', 'https://batimes.com.ar/news/amp/latin-america/indigenous-colombians-fret-as-sacred-mountain-glaciers-melt.phtml'],
  iota: [T('El País · Iota en Providencia'), 'https://www.elpais.com.co/colombia/dos-muertos-y-un-desaparecido-el-balance-del-paso-de-iota-por-providencia.html'],
  coral: [T('Revista de Biología Tropical · Acropora palmata en San Andrés'), 'https://revistas.ucr.ac.cr/index.php/rrbt/article/view/6958'],
  cgsmTiempo: ['El Tiempo · Ciénaga Grande', 'https://www.eltiempo.com/colombia/otras-ciudades/cinco-males-de-la-cienaga-grande-de-santa-marta-42090'],
  cgsmMin: [T('MinAmbiente · Manglar de la Ciénaga Grande'), 'https://www.minambiente.gov.co/?p=3278'],
  cgsmSpringer: ['Wetlands (Springer) · Ciénaga Grande', 'https://link.springer.com/doi/10.1007/s13157-018-1024-7'],
  defor24: [T('MinAmbiente · Deforestación 2024'), 'https://www.minambiente.gov.co/?p=77345'],
  deforSerie: [T('MinAmbiente / IDEAM · Serie de deforestación'), 'https://visionamazonia.minambiente.gov.co/content/uploads/2025/08/PPT-rueda-de-prensa-deforestaci%C3%B3n-2024-1.pdf'],
  deforAmaz: [T('La República · Amazonía 2022–2023'), 'https://www.larepublica.co/responsabilidad-social/la-deforestacion-y-tala-de-bosques-otro-de-los-retos-de-colombia-para-encarar-2025-4039433'],
  deforAfp: [T('The Week / AFP · Amazonía 2024'), 'https://www.theweek.in/wire-updates/international/2025/08/01/fes47-amazon-deforestation.html'],
  silla: [T('La Silla Vacía · Bosques de la Amazonía'), 'https://www.lasillavacia.com/silla-amazonia/amazonia-en-breve/cifra-de-deforestacion-en-la-amazonia-en-2024-la-mas-alta-del-gobierno-petro/'],
  chiri: ['Cancillería · Chiribiquete', 'https://www.cancilleria.gov.co/en/node/26719'],
  chiriArte: [T('TVN / EFE · Pinturas de Chiribiquete'), 'https://www.tvn-2.com/entretenimiento/cultura/pictogramas-chiribiquete-muestran-reconocimiento-unesco_1_1363298.html'],
  chingaza: [T('Alcaldía de Bogotá · Chingaza y Sumapaz'), 'https://bogota.gov.co/mi-ciudad/ambiente/dia-de-los-parques-nacionales-naturales-de-colombia'],
  racion: [T('El Tiempo · Un año de racionamiento'), 'https://www.eltiempo.com/bogota/un-ano-de-racionamiento-ahora-que-viene-para-bogota-3443834'],
  racionNivel: [T('Acueducto / Alcaldía de Bogotá · Agua en 2024'), 'https://bogota.gov.co/racionamiento-agua-bogota/el-agua-en-bogota/'],
  sumapaz: [T('El Espectador · Páramos cerca de Bogotá'), 'https://www.elespectador.com/bogota/tres-paramos-que-se-pueden-visitar-cerca-de-bogota-article-902112/'],
  paramos: [T('Mongabay / El Búho · Páramos de Colombia'), 'https://elbuho.pe/?p=399832'],
  lloro: [T('EarthRef · Lluvias del Chocó'), 'https://earthref.org/ERR/20448'],
  natgeo: [T('National Geographic · País más lluvioso'), 'https://www.nationalgeographicla.com/medio-ambiente/2023/05/cual-es-el-pais-donde-mas-llueve'],
  defor25: [T('El Espectador · Deforestación 2025 (IDEAM)'), 'https://www.elespectador.com/ambiente/amazonas/crecio-la-deforestacion-en-colombia-en-2025-el-pais-perdio-119000-hectareas/'],
  defor25dep: [T('Mongabay · Deforestación 2025 por departamento'), 'https://es.mongabay.com/short-article/2026/08/colombia-deforestacion-aumento-2025-amazonia-informe/'],
  finRacion: [T('NTN24 · Fin del racionamiento en Bogotá'), 'https://www.ntn24.com/noticias-actualidad/alcalde-de-bogota-anuncio-el-fin-del-racionamiento-de-agua-tras-un-ano-de-la-medida-en-la-capital-colombiana-549832'],
  nino26: [T('MinAmbiente · IDEAM declara El Niño (2026)'), 'https://www.minambiente.gov.co/ideam-confirma-el-fenomeno-de-el-nino-y-ungrd-articula-preparacion-para-afrontar-sus-efectos/'],
  aqGbd: ['World Bank / GBD vía IndexMundi · PM2.5 Colombia', 'https://www.indexmundi.com/facts/colombia/particle-pollution'],
  aqIqCol: [T('IQAir · Calidad del aire en Colombia'), 'https://www.iqair.com/af/air-quality/colombia'],
  aqIqBog: ['IQAir · Bogotá', 'https://www.iqair.com/colombia/bogota-dc/bogota'],
  aqIq22: [T('IQAir · Informe mundial 2022'), 'https://www.iqair.com/dl/pdf-reports/2022/2022_World_Air_Quality_Report_US.pdf'],
  aqGp21: ['Greenpeace / IQAir · Bogotá 2021', 'https://www.greenpeace.org/static/planet4-colombia-stateless/2022/05/6521e020-la-carga-de-la-contaminacion-del-aire-en-bogota-colombia-2021.pdf'],
  aqPf23: ['Portafolio · IQAir 2023', 'https://www.portafolio.co/sostenibilidad/paises-con-la-peor-calidad-de-aire-en-que-posicion-esta-colombia-ranking-de-iqair-605628'],
  aqPf24: ['Portafolio · IQAir 2024', 'https://www.portafolio.co/internacional/las-ciudades-capitales-con-la-peor-calidad-de-aire-de-america-latina-626247'],
  aqSem24: ['Semana · IQAir 2024', 'https://www.semana.com/economia/articulo/la-contaminacion-de-aire-en-colombia-sigue-poniendo-en-riesgo-la-salud-publica/202523/'],
  aqIq25: ['Colombia One · IQAir 2025', 'https://m.colombiaone.com/wordpress/c/6/i/213912/global-pollution-rankings-2025-where-does-colombia-stand'],
  normaCol: [T('CVC · Resolución 2254 de 2017'), 'https://calidadaire.cvc.gov.co/sites/default/files/2025-02/Informe%20Calidad%20Aire%20Anual%202024_0.pdf'],
  ersst: ['NOAA ERSSTv5', 'https://www.ncei.noaa.gov/products/extended-reconstructed-sst']
};

var SSTZ = {
  sanandres: { name: T('Mar alrededor de San Andrés'), cell: T('celda de 2° centrada en 12° N, 82° O'), v: [27.98, 27.56, 27.79, 27.97, 27.55, 27.47, 27.51, 27.83, 27.99, 27.89, 28.06, 28.08, 27.92, 28.38, 27.8, 27.68, 27.77, 28.33, 28.12, 27.74, 28.0, 27.98, 28.09, 28.14, 28.01, 28.33, 27.98, 28.05, 28.54, 27.98, 27.82, 27.89, 28.09, 28.32, 28.22, 28.43, 28.3, 28.33, 28.08, 28.16, 28.55, 28.28, 28.25, 28.3, 28.36, 28.54, 28.82, 28.63, 28.35, 28.42, 28.82, 28.46] },
  caribe: { name: T('Caribe frente a la Sierra Nevada y la Ciénaga Grande'), cell: T('celda de 2° centrada en 12° N, 74° O'), v: [27.65, 27.19, 27.13, 27.64, 27.02, 26.99, 26.92, 27.3, 27.59, 27.49, 27.58, 27.83, 27.33, 27.7, 27.34, 27.14, 27.2, 27.83, 27.76, 27.18, 27.36, 27.24, 27.39, 27.62, 27.37, 27.85, 27.48, 27.29, 28.03, 27.81, 27.45, 27.5, 27.6, 27.94, 27.85, 28.26, 27.94, 27.98, 27.68, 27.65, 28.4, 27.97, 27.75, 27.99, 27.81, 27.89, 28.37, 28.19, 27.76, 27.81, 28.42, 28.04] },
  pacifico: { name: T('Pacífico frente al Chocó'), cell: T('celda de 2° centrada en 6° N, 78° O'), v: [27.26, 26.77, 27.38, 27.31, 27.04, 26.93, 26.76, 26.91, 27.12, 27.42, 27.3, 27.09, 27.42, 28.11, 27.19, 26.6, 26.91, 27.87, 27.39, 27.0, 27.36, 27.45, 27.57, 27.34, 27.03, 27.34, 27.16, 27.83, 28.02, 26.93, 26.98, 27.13, 27.43, 27.74, 27.48, 27.57, 27.73, 27.72, 27.56, 27.4, 27.97, 27.48, 27.64, 27.59, 28.18, 28.24, 27.87, 27.84, 27.76, 27.89, 27.88, 27.77] }
};

/* Área glaciar (km²). IDEAM: siglo XIX (≈1850), décadas de 1950, 1980 y 1990, 2022 y 2024. */
var GLACIER = {
  'Nevado del Ruiz': [[1850, 47.5], [1955, 21.0], [1985, 18.7], [1995, 14.1], [2022, 7.68], [2024, 7.17]],
  'Nevado Santa Isabel': [[1850, 27.8], [1955, 9.40], [1985, 6.40], [1995, 5.30], [2022, 0.29], [2024, 0.16]],
  'Nevado del Tolima': [[1850, 8.6], [1955, 2.70], [1985, 1.60], [1995, 1.18], [2022, 0.49]],
  'Sierra Nevada de Santa Marta': [[1850, 81.6], [1955, 20.4], [1985, 16.1], [1995, 12.2], [2022, 5.30], [2024, 4.84]],
  'Total Colombia': [[1850, 349], [1955, 109], [1985, 91], [1995, 67.81], [2010, 47], [2021, 34.20], [2022, 33.09], [2024, 30.83]]
};

/* Deforestación nacional (ha/año), IDEAM. */
var DEFOR = [[2013, 116128], [2014, 137341], [2015, 123841], [2016, 177764], [2017, 219552], [2018, 197159], [2019, 158894], [2020, 171685], [2021, 174103], [2022, 123517], [2023, 79256], [2024, 113608], [2025, 119483]];
var DEFOR_DEP = [['Caquetá', 30414], ['Meta', 22554]];
var DEFOR_DEP_YEAR = 2025;

var ZONES = [
  {
    id: 'nevados', n: 1, name: T('Los Nevados y páramos del Eje Cafetero'), short: 'Los Nevados', where: T('Ruiz, Santa Isabel y Tolima · Caldas, Risaralda, Quindío y Tolima'),
    ll: [-75.35, 4.8], side: 'below', bbox: [-75.6, 4.5, -75.1, 5.1], color: '#e0f2fe',
    chips: [[T('30,8 km²'), T('de glaciares le quedaban a Colombia en 2024')], ['−99,4 %', T('de área perdió el Santa Isabel desde 1850')], [T('+3 millones'), T('de personas reciben agua del parque')]],
    facts: [
      [T('Colombia pasó de 33,09 km² de glaciares en 2022 a 30,8 km² en 2024, una pérdida mayor que la tendencia de las cuatro décadas anteriores.'), 'radioNal24'],
      [T('El Santa Isabel perdió cerca del 45 % de su hielo entre 2022 y 2024 (de 0,29 a 0,16 km²); su glaciar más emblemático, Conejeras, ya se extinguió.'), 'bluSI'],
      [T('Desde mediados del siglo XIX el Ruiz perdió el 84 % de su área glaciar y el Tolima el 94 %.'), 'ideamPpt'],
      [T('El parque tiene bosque altoandino, páramo, superpáramo y glaciares, con cóndor andino, oso de anteojos, danta de montaña, periquito de los nevados y frailejones.'), 'pnnNevados'],
      [T('El Parque Nacional Natural Los Nevados suministra agua a más de 3 millones de personas en Caldas, Quindío, Risaralda y Tolima.'), 'minAmbNev']
    ],
    data: ['glacier:Nevado del Ruiz,Nevado Santa Isabel,Nevado del Tolima'],
    vars: [[T('Temperatura del aire a 2 m'), 'MERRA-2 (M2TMNXSLV)'], [T('Lluvia mensual'), 'GPM IMERG (GPM_3IMERGM)'], [T('Vegetación NDVI'), 'MODIS Terra (MOD13C2)'], [T('Humedad del suelo'), 'GLDAS Noah']]
  },
  {
    id: 'sierra', n: 2, name: 'Sierra Nevada de Santa Marta', short: 'Sierra Nevada', where: T('Magdalena, La Guajira y Cesar'),
    ll: [-73.35, 10.65], bbox: [-74.3, 10.3, -73.0, 11.4], color: '#ede9fe',
    chips: [[T('5.775 m'), T('la montaña costera más alta del mundo')], ['−94 %', T('de área glaciar desde 1850')], ['4 pueblos', T('arhuaco, wiwa, kogui y kankuamo')]],
    facts: [
      [T('Es el sistema montañoso costero más alto del mundo (5.775 m), donde conviven los pueblos arhuaco, wiwa, kogui y kankuamo.'), 'afpSierra'],
      [T('Su área glaciar pasó de 81,6 km² a mediados del siglo XIX a 5,3 km² en 2022 y 4,84 km² en 2024.'), 'ideamPpt'],
      [T('En 2022 la UNESCO reconoció el conocimiento ancestral de sus cuatro pueblos como patrimonio inmaterial de la humanidad.'), 'afpUnesco'],
      [T('En enero de 2024 Santa Marta registró un récord de 40 °C; las heladas de madrugada y el calor del mediodía arruinan cosechas en la Sierra.'), 'afpSierra']
    ],
    data: ['glacier:Sierra Nevada de Santa Marta', 'sst:caribe'],
    vars: [[T('Temperatura del aire a 2 m'), 'MERRA-2 (M2TMNXSLV)'], [T('Lluvia mensual'), 'GPM IMERG (GPM_3IMERGM)'], [T('Vegetación NDVI'), 'MODIS Terra (MOD13C2)'], [T('Evapotranspiración'), 'GLDAS Noah']]
  },
  {
    id: 'caribe', n: 3, name: T('Caribe marino y costero'), short: T('Caribe marino'), where: T('San Andrés y Providencia · Ciénaga Grande de Santa Marta'),
    ll: [-81.6, 12.9], ll2: [-74.6, 10.85], side2: 'left', bbox: [-82.0, 12.3, -81.2, 13.5], bbox2: [-74.8, 10.6, -74.2, 11.1], color: '#cffafe',
    chips: [['Cat. 5', T('Iota, primer huracán de esa categoría en Colombia')], ['45 % → 1 %', T('cobertura de coral cuerno de alce, 1995–2024')], [T('39.699 ha'), T('de manglar recuperado en la Ciénaga (2020)')]],
    facts: [
      [T('El 16 de noviembre de 2020 Iota fue el primer huracán categoría 5 en golpear a Colombia y afectó cerca del 98 % de la infraestructura de Providencia.'), 'iota'],
      [T('En Little Reef (San Andrés) la cobertura de coral, dominada por cuerno de alce, cayó de ~45 % en 1995 a 1,13 % en 2024; el blanqueamiento masivo de 2023 causó una mortalidad casi total.'), 'coral'],
      [T('En la Ciénaga Grande murieron 25.400 de 52.000 ha de manglar entre 1956 y 1999, al interrumpirse el flujo de agua dulce y salada.'), 'cgsmTiempo'],
      [T('Es posiblemente el humedal con la mayor mortalidad de manglar registrada por cambios hidrológicos e hipersalinidad.'), 'cgsmSpringer'],
      [T('Entre 2017 y 2020 se recuperaron más de 6.000 ha de manglar, hasta 39.699 ha, el registro más alto en la Ciénaga.'), 'cgsmMin']
    ],
    data: ['sst:sanandres', 'sst:caribe'],
    vars: [[T('Temperatura del mar'), 'MODIS-Aqua (SST)'], [T('Clorofila-a'), 'MODIS-Aqua'], [T('Lluvia mensual'), 'GPM IMERG (GPM_3IMERGM)']]
  },
  {
    id: 'amazonia', n: 4, name: T('Amazonía: Caquetá, Guaviare y Chiribiquete'), short: T('Amazonía'), where: T('Caquetá, Guaviare, Meta y Putumayo'),
    ll: [-73.2, 1.2], bbox: [-75.5, -1.0, -71.0, 3.0], color: '#dcfce7',
    chips: [[T('119.483 ha'), T('deforestadas en Colombia en 2025')], ['65 %', T('de esa pérdida ocurrió en la Amazonía')], [T('4,27 M ha'), T('protegidas en Chiribiquete')]],
    facts: [
      [T('En 2025 Colombia perdió 119.483 ha de bosque, un 5,2 % más que en 2024; la Amazonía sumó 77.805 ha.'), 'defor25'],
      [T('Caquetá (30.414 ha) y Meta (22.554 ha) fueron los departamentos con más deforestación en 2025.'), 'defor25dep'],
      [T('En 2024 Colombia deforestó 113.608 ha; aumentó en Caquetá (25.263 ha), Meta (21.107), Guaviare (16.908) y Putumayo (5.443).'), 'defor24'],
      [T('Más de 77.000 ha se perdieron en la Amazonía en 2024: el 65 % de toda la pérdida de bosque del país.'), 'deforAfp'],
      [T('En la Amazonía se talaron 71.185 ha en 2022 y 44.274 ha en 2023, una caída del 38 % en un año.'), 'deforAmaz'],
      [T('Cerca del 65,6 % de los bosques del país (39 millones de ha) está en la Amazonía.'), 'silla'],
      [T('En 2018 Chiribiquete fue declarado patrimonio mixto por la UNESCO y ampliado a 4.268.095 ha.'), 'chiri'],
      [T('Sus tepuyes guardan más de 75.000 pinturas rupestres.'), 'chiriArte']
    ],
    data: ['defor'],
    vars: [[T('Vegetación NDVI'), 'MODIS Terra (MOD13C2)'], [T('Lluvia mensual'), 'GPM IMERG (GPM_3IMERGM)'], [T('Evapotranspiración'), 'GLDAS Noah'], [T('Temperatura del aire a 2 m'), 'MERRA-2 (M2TMNXSLV)']]
  },
  {
    id: 'chingaza', n: 5, name: T('Páramos de Chingaza y Sumapaz'), short: T('Chingaza y Sumapaz'), where: T('Cundinamarca, Meta y Bogotá'),
    ll: [-73.75, 4.6], bbox: [-74.6, 3.6, -73.5, 4.9], color: '#fef3c7',
    chips: [['70 %', T('del agua de Bogotá sale del sistema Chingaza')], ['16,97 %', T('nivel mínimo de Chingaza en 2024')], [T('333.420 ha'), T('tiene el páramo de Sumapaz')]],
    facts: [
      [T('El sistema Chingaza, con los embalses de Chuza y San Rafael, aporta cerca del 70 % del agua de Bogotá.'), 'chingaza'],
      [T('El racionamiento empezó el 11 de abril de 2024, tras El Niño y la falta de lluvias.'), 'racion'],
      [T('Se levantó el sábado 12 de abril de 2025, cuando se recuperaron los embalses del sistema Chingaza.'), 'finRacion'],
      [T('En octubre de 2026 el IDEAM declaró El Niño, de intensidad fuerte a muy fuerte, con 83 % de probabilidad de seguir así hasta marzo de 2027.'), 'nino26'],
      [T('En 2024 el embalse llegó a 16,97 % de llenado, el nivel más bajo desde que el sistema funciona (mediados de los 80).'), 'racionNivel'],
      [T('Sumapaz es considerado el páramo más grande del mundo: 333.420 ha, de las cuales 142.112 están en el parque nacional.'), 'sumapaz'],
      [T('Colombia tiene la mayor extensión de páramos del mundo, unos 2,9 millones de ha.'), 'paramos']
    ],
    data: [],
    vars: [[T('Lluvia mensual'), 'GPM IMERG (GPM_3IMERGM)'], [T('Humedad del suelo'), 'GLDAS Noah'], [T('Temperatura del aire a 2 m'), 'MERRA-2 (M2TMNXSLV)']]
  },
  {
    id: 'choco', n: 6, name: T('Chocó biogeográfico'), short: 'Chocó', where: T('Chocó · costa Pacífica'),
    ll: [-76.6, 5.6], side: 'left', bbox: [-77.6, 4.0, -76.2, 7.0], color: '#dbeafe',
    chips: [[T('+12.700 mm'), T('de lluvia al año en Lloró')], [T('3.240 mm'), T('promedio anual de Colombia')], [T('Pocas estaciones'), T('el satélite GPM llena vacíos')]],
    facts: [
      [T('El Chocó recibe entre 8.000 y 13.000 mm de lluvia al año; Lloró superó los 12.700 mm (1952–1960).'), 'lloro'],
      [T('Colombia es el país con más lluvia del mundo: unos 3.240 mm al año en promedio.'), 'natgeo']
    ],
    data: ['sst:pacifico'],
    vars: [[T('Lluvia mensual'), 'GPM IMERG (GPM_3IMERGM)'], [T('Lluvia diaria'), 'GPM IMERG (GPM_3IMERGDF)'], [T('Humedad del suelo'), 'GLDAS Noah']]
  }
];

/* Eventos de Colombia, filtrados por zona. */
var COL_EVENTS = [
  { y: 1977, z: ['chingaza'], t: T('Nace el PNN Chingaza'), d: T('Chingaza se declara Parque Nacional Natural; hoy aporta cerca del 70 % del agua de Bogotá.'), ll: [-73.75, 4.6] },
  { y: 1985, z: ['nevados'], t: T('Erupción del Nevado del Ruiz'), d: T('El 13 de noviembre los lahares del volcán arrasaron Armero.'), ll: [-75.32, 4.89] },
  { y: 1995, z: ['caribe'], t: T('Rehabilitación de la Ciénaga Grande'), d: T('Se reabren caños para devolver agua dulce y bajar la salinidad que mató el manglar.'), ll: [-74.45, 10.85] },
  { y: 2010, z: ['nevados', 'sierra', 'caribe', 'amazonia', 'chingaza', 'choco'], t: 'La Niña 2010–2011', d: T('Lluvias extremas e inundaciones en gran parte de Colombia.'), ll: [-74, 5] },
  { y: 2015, z: ['nevados', 'sierra', 'amazonia', 'chingaza'], t: 'El Niño 2015–2016', d: T('Uno de los El Niño más fuertes registrados: sequía e incendios.'), ll: [-74, 5] },
  { y: 2017, z: ['amazonia'], t: T('Pico de deforestación'), d: T('Colombia registra su máximo: 219.552 ha deforestadas.'), ll: [-73.2, 1.2] },
  { y: 2018, z: ['amazonia'], t: T('Chiribiquete, patrimonio mixto'), d: T('La UNESCO lo inscribe y el parque se amplía a 4.268.095 ha.'), ll: [-72.6, 0.6] },
  { y: 2020, z: ['caribe'], t: T('Huracán Iota'), d: T('Primer categoría 5 en Colombia: cerca del 98 % de la infraestructura de Providencia afectada.'), ll: [-81.37, 13.35] },
  { y: 2022, z: ['sierra'], t: T('Saber ancestral, patrimonio de la humanidad'), d: T('La UNESCO reconoce el conocimiento de los cuatro pueblos de la Sierra Nevada.'), ll: [-73.7, 10.8] },
  { y: 2022, z: ['nevados', 'sierra'], t: T('Glaciares: 33,09 km²'), d: T('Área glaciar total de Colombia a inicios de 2022, según el IDEAM.'), ll: [-75.35, 4.8] },
  { y: 2023, z: ['caribe'], t: T('Blanqueamiento masivo de corales'), d: T('Mortalidad casi total del coral cuerno de alce en Little Reef, San Andrés.'), ll: [-81.7, 12.55] },
  { y: 2023, z: ['amazonia'], t: T('Mínimo histórico de deforestación'), d: T('Colombia deforesta 79.256 ha, la cifra más baja registrada.'), ll: [-73.2, 1.2] },
  { y: 2024, z: ['nevados'], t: T('Se extingue el glaciar Conejeras'), d: T('El Santa Isabel baja a 0,16 km² y el país a 30,8 km² de glaciares.'), ll: [-75.37, 4.82] },
  { y: 2024, z: ['sierra'], t: T('Récord de 40 °C en Santa Marta'), d: T('Calor récord en enero junto a la Sierra Nevada.'), ll: [-74.2, 11.24] },
  { y: 2024, z: ['chingaza'], t: T('Racionamiento de agua en Bogotá'), d: T('Desde el 11 de abril, con el sistema Chingaza en su nivel más bajo.'), ll: [-73.75, 4.6] },
  { y: 2024, z: ['amazonia'], t: T('Repunte de la deforestación'), d: T('113.608 ha en el país; Caquetá lidera con 25.263 ha.'), ll: [-74.5, 1.0] },
  { y: 2025, z: ['chingaza'], t: T('Fin del racionamiento en Bogotá'), d: T('Se levanta el 12 de abril, un año después de empezar, al recuperarse el sistema Chingaza.'), ll: [-73.75, 4.6] },
  { y: 2025, z: ['amazonia'], t: T('Deforestación 2025: 119.483 ha'), d: T('Sube 5,2 % frente a 2024; la Amazonía concentra el 65 %.'), ll: [-74.5, 1.0] },
  { y: 2026, z: ['nevados', 'sierra', 'caribe', 'amazonia', 'chingaza', 'choco'], t: T('El IDEAM declara El Niño 2026–2027'), d: T('El 8 de octubre se declara oficialmente, con intensidad fuerte a muy fuerte; podría durar hasta marzo de 2027.'), ll: [-74, 5] }
];

/* Calidad del aire: PM2.5 promedio anual (µg/m³). [valor, fuente]. */
var AIR_ROWS = [
  { name: T('Colombia · promedio nacional'), v: {
    1990: [20.38, 'aqGbd'], 1995: [20.01, 'aqGbd'], 2000: [20.05, 'aqGbd'], 2005: [21.28, 'aqGbd'], 2010: [21.50, 'aqGbd'], 2011: [21.37, 'aqGbd'], 2012: [20.54, 'aqGbd'], 2013: [19.22, 'aqGbd'], 2014: [18.34, 'aqGbd'], 2015: [17.30, 'aqGbd'], 2016: [16.58, 'aqGbd'], 2017: [16.53, 'aqGbd'],
    2018: [13.90, 'aqIqCol'], 2019: [14.61, 'aqIqCol'], 2021: [14.1, 'aqIq22'], 2022: [15.5, 'aqIq22'], 2024: [13.8, 'aqSem24'], 2025: [11.1, 'aqIq25'] } },
  { name: 'Bogotá', v: { 2017: [15.7, 'aqIqCol'], 2018: [13.9, 'aqIqCol'], 2019: [13.1, 'aqIqBog'], 2021: [13.7, 'aqGp21'], 2023: [13.4, 'aqPf23'], 2024: [13.4, 'aqPf24'], 2025: [10.0, 'aqIq25'] } },
  { name: 'Medellín', v: { 2025: [13.4, 'aqIq25'] } }
];
