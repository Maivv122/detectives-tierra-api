# Detectives de la Tierra · API de temperatura en tiempo real

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
