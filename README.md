# Detectives de la Tierra

Plataforma para explorar, comparar y entender cómo cambia la temperatura del planeta y de Colombia (NASA Space Apps).

**Inicio rápido (sin llaves):**

```bash
npm install
npm run datos     # descarga los datos de NASA: zonas y departamentos (unos minutos, una sola vez)
npm start         # abre http://localhost:8080
```

## Qué incluye

| Botón | Qué hace | Datos |
|---|---|---|
| Buscador | Escribe un departamento (con o sin tildes) y el mapa vuela hasta él | Natural Earth |
| MAR | Temperatura del mar alrededor de Colombia (y en MÁS: anomalía y tendencia) | NOAA ERSSTv5 (1970–2021) |
| AIRE | Temperatura del aire, promedio anual por departamento | NASA POWER (MERRA-2) |
| COMPARAR | Entre años (mapa de diferencias por departamento) y entre regiones (2 a 4, con resumen y hallazgo principal) | Los mismos datos |
| MÁS → Mis datos | Sube un CSV (fecha, valor) y la app calcula la tendencia | Tus datos |

Nada se inventa: si una fuente no tiene un año o una región, la app lo dice. La temperatura de la superficie terrestre (MODIS LST) aún no está incluida.

## Estructura

- `server.js` · servidor y API · `historico.mjs` / `departamentos.mjs` · descarga de datos de NASA
- `public/app.js` · globo, capas y línea de tiempo · `public/js/` · módulos: `datos.js`, `comparar.js`, `colombia.js`, `global.js`, `buscar.js`, `graficas.js`
- `public/data/` · datos (`departamentos.json` e `historico.json` se generan con `npm run datos`)

# API de temperatura en tiempo real

Servidor pequeño en Node.js que:

1. Consulta la **Weather API** (temperatura, sensación térmica, humedad y descripción del clima) y la **Air Quality API** (índice de calidad del aire, categoría y PM2.5) de Google Maps Platform.
2. Guarda la llave de Google en el servidor, para que nunca quede expuesta en la página.
3. Sirve la app web (`public/`) en el mismo dominio, así que el globo puede pedir `/api/...` sin problemas de CORS.

Si no hay llave de Google, o Google falla, usa **Open-Meteo** como respaldo (gratis y sin llave). Lo puedes desactivar con `FALLBACK_OPEN_METEO=false`.

## Endpoints

| Ruta | Qué devuelve |
|---|---|
| `GET /api/temperatura?lat=4.71&lon=-74.07` | Condiciones actuales en un punto |
| `GET /api/aire?lat=4.71&lon=-74.07` | Calidad del aire actual (índice, categoría y PM2.5) |
| `GET /api/zonas` | Temperatura y calidad del aire actuales en los puntos de las 6 zonas de Colombia |
| `GET /api/historico` | Promedio anual por zona: temperatura del aire (NASA POWER, desde 1981) y PM2.5 (CAMS, desde 2023) |
| `GET /api/ciudades` | Temperatura del aire ahora en 40 ciudades del mundo (Open-Meteo) |
| `GET /api/salud` | Si la llave de Google está configurada |

Ejemplo de respuesta de `/api/temperatura`:

```json
{
  "lat": 4.71, "lon": -74.07,
  "temperatura_c": 14.2, "sensacion_c": 13.5, "humedad_pct": 82,
  "descripcion": "Parcialmente nublado",
  "icono": "https://maps.gstatic.com/weather/v1/partly_cloudy.svg",
  "es_de_dia": true, "max_24h_c": 19.1, "min_24h_c": 8.4,
  "hora": "2026-11-14T16:05:00Z",
  "fuente": "Google Maps Platform · Weather API",
  "en_cache": false
}
```

## 1. Crear la llave de Google (una sola vez)

1. Entra a [Google Cloud Console](https://console.cloud.google.com/) y crea o elige un proyecto.
2. Activa la facturación del proyecto. Google exige una tarjeta, pero hay una cuota mensual gratuita.
3. En **APIs y servicios → Biblioteca**, busca **Weather API** y pulsa **Habilitar**. Haz lo mismo con **Air Quality API**.
4. En **APIs y servicios → Credenciales**, crea una **llave de API**.
5. Restríngela a la **Weather API** y la **Air Quality API**, para que no se pueda usar en otra cosa.

## 2. Probar en tu computador

```bash
npm install
GOOGLE_WEATHER_API_KEY=TU_LLAVE npm start
# abre http://localhost:8080
```

En Windows (PowerShell):

```powershell
$env:GOOGLE_WEATHER_API_KEY="TU_LLAVE"; npm start
```

## 2a. Mapa satelital con calles (Google Maps)

Al tocar «Ver la zona en satélite» (o al hacer zoom al máximo en el globo) se abre un mapa satelital con calles, como Google Maps.

- **Con llave de Google**: se usa Google Maps (satélite + calles + lugares + Street View).
  1. En Google Cloud → APIs y servicios → Biblioteca, activa **Maps JavaScript API**.
  2. Crea una llave **nueva** (no uses la del clima) y en «Restricciones de la aplicación» elige **Sitios web** con `http://localhost:8080/*` y, cuando la publiques, `https://TU-APP.onrender.com/*`. En «Restricciones de API» deja solo Maps JavaScript API.
  3. Copia `.env.example` como `.env` y pon la llave en `GOOGLE_MAPS_API_KEY`. En Render, agrégala en Environment.
  4. Reinicia el servidor (`Ctrl + C` y `npm start`).
- **Sin llave**: el mapa usa imágenes de Esri con calles y nombres, sin costo y sin configurar nada.

Esta llave sí llega al navegador (Google Maps funciona así); por eso debe estar restringida por sitio web.

## 2b. Generar la historia por zona (recomendado)

Para que el mapa de Colombia muestre el promedio de temperatura y de calidad del aire de cada año en cada zona:

```bash
npm run historico
```

Tarda uno o dos minutos y crea `public/data/historico.json` con:

- **Temperatura**: promedio anual de la temperatura del aire a 2 m (NASA POWER, reanálisis MERRA-2), de 1981 al año pasado. La condición (Más cálido, Más frío…) compara cada año con el promedio 1991–2020 de esa zona.
- **Calidad del aire**: promedio anual de PM2.5 (Copernicus CAMS vía Open-Meteo), desde 2023; el año en curso aparece como parcial.

Ninguna de las dos fuentes pide llave. Si no corren el script, el servidor arma la historia la primera vez que alguien pide `/api/historico` y la guarda. Si quieren ver los datos dentro de la vista previa de claude.ai, envíen ese `historico.json` y lo incrusto.

## 3. Publicar en Google Cloud Run

Desde esta carpeta, con la [CLI de gcloud](https://cloud.google.com/sdk/docs/install) instalada:

```bash
gcloud run deploy detectives-tierra \
  --source . \
  --region us-east1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_WEATHER_API_KEY=TU_LLAVE
```

Cloud Run te devuelve una URL pública (`https://detectives-tierra-xxxx.run.app`). Esa URL ya es la app completa con la temperatura en tiempo real.

Para no dejar la llave a la vista, puedes guardarla en Secret Manager y usar `--set-secrets GOOGLE_WEATHER_API_KEY=NOMBRE_DEL_SECRETO:latest` en lugar de `--set-env-vars`.

## Variables de entorno

| Variable | Por defecto | Para qué sirve |
|---|---|---|
| `GOOGLE_WEATHER_API_KEY` | — | Llave de la Weather API |
| `CACHE_MINUTES` | `30` | Minutos que se reutiliza una consulta del mismo punto |
| `FALLBACK_OPEN_METEO` | `true` | Usar Open-Meteo si no hay llave o si Google falla |
| `CORS_ORIGIN` | `*` | Dominio que puede llamar la API desde otro sitio |
| `PORT` | `8080` | Puerto (Cloud Run lo asigna solo) |

## Cuidar la cuota gratuita

La caché de 30 minutos hace que `/api/zonas` gaste como máximo 7 llamadas de cada API cada media hora, y solo cuando alguien tiene la app abierta. Con la app abierta todo el mes serían unas 10.000 llamadas. Si la van a dejar encendida en una pantalla, suban `CACHE_MINUTES` a 60.

## ¿Por qué no funciona dentro de claude.ai?

La vista previa de la app en claude.ai bloquea las conexiones a servidores externos. Allí el panel «Tiempo real» lo indica, y todo lo demás funciona igual. Al publicarla en Cloud Run, la app y la API quedan en el mismo dominio y la temperatura en vivo aparece sola.
