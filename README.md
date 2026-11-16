# 🌎 Earth Detectives · Detectives de la Tierra

**How much has Colombia warmed — and where?** Earth Detectives is an interactive web platform that turns NASA and NOAA climate records into a map anyone can explore. Search for a department, travel through time, compare regions and discover how temperature has changed across Colombia, using only real, cited data.

Built by our team for the **NASA Space Apps Challenge 2026**, for the challenge on trends in Earth science data.

🔗 **Live demo:** https://detectives-tierra-api.onrender.com
🌐 Available in **English** and **Español** (button in the top bar)

---

## The problem

Climate data is public, but it is not easy to use. NASA and NOAA publish decades of measurements, yet most people — students, teachers, local decision makers — never see what those numbers mean for *their* region. Global averages feel distant, and the tools that handle the raw files are built for specialists.

## Our solution

We built a map-first platform that answers simple questions with real data:

- *Is my department warming? By how much?*
- *Which regions changed the most since the 1980s?*
- *How do two places compare?*
- *Is the trend real or just natural variability?*

Every answer comes with its source, and every statistic is explained in plain language. When a source does not cover a year or a region, the platform says so instead of filling the gap.

## Features

| Feature | What it does |
|---|---|
| 🌍 **3D globe + street map** | A satellite globe (NASA Blue Marble) that zooms all the way into a satellite map with streets and cities. Data layers stay visible at every zoom level. |
| 🔎 **Department search** | Type any of Colombia's 33 departments (accents optional). The map flies there, highlights it and opens its profile. |
| 🌡 **Sea and air layers** | Sea surface temperature around Colombia, air temperature by department, anomaly (vs. normal) and trend per decade. |
| ⏱ **Timeline** | Move through the years or play them as an animation. Key climate events (El Niño, La Niña, records) are marked. |
| 📍 **Department profile** | A one-line verdict ("It is warming: +1.1 °C since the 1980s"), four key cards and the full history chart. |
| ⇄ **Compare** | *Between years:* the map colors each department by how much it warmed or cooled, with a ranking. *Between regions:* 2 to 4 regions side by side, with a summary box and a **main finding** computed from the data. |
| 📈 **Interactive charts** | Exact values on hover, toggle series, last 30 / 10 years, drag to zoom into a period, lines or bars, min/max marked and the trend explained in words. |
| 📂 **My data** | Upload a CSV (date, value), from NASA Giovanni or Excel. The platform validates it, summarizes it and tests for a trend, with clear messages for empty, invalid or incomplete files. |
| 📱 **Mobile friendly** | Responsive layout and pinch-to-zoom toward your fingers on Android and iPhone. |

### Some findings from the data

- Between 1981 and 2025, **32 of Colombia's 33 departments warmed**, by **+0.71 °C** on average (NASA POWER).
- Norte de Santander and Vichada show the largest increases, above **+1.2 °C**.
- La Guajira is about **4.3 °C warmer** than Antioquia on average, yet Antioquia is warming faster.

## Data sources

| Data | Source | Period |
|---|---|---|
| Sea surface temperature (4° cells) | NOAA ERSSTv5 | 1970–2021 |
| Air temperature at 2 m, by department | NASA POWER (MERRA-2 reanalysis) | 1981–2025 |
| Global temperature | NASA GISTEMP v4 | 1880–2025 |
| Department boundaries | Natural Earth | — |
| Satellite imagery | NASA Blue Marble · Esri World Imagery · NASA GIBS (MODIS) | — |
| Current temperature | Open-Meteo (Google Weather optional) | Live |

Department values are the average of the MERRA-2 cells (≈ 55 × 70 km) whose center falls inside each department.

## How the statistics work

- **Anomaly:** the difference between a year and the reference average.
- **Trend:** the slope of a linear regression, expressed per decade, with its 95 % confidence interval and Sen's slope.
- **Significance:** a trend is reported as real only when **both** the regression t-test and the **Mann-Kendall** test give p < 0.05. Otherwise the platform says the change may be natural variability.

The technical detail is always available, but folded, so the main message stays simple.

## Tech stack

- **Frontend:** HTML, CSS and vanilla JavaScript · d3.js (globe projection and charts) · WebGL2 (satellite Earth, clouds and relief) · Leaflet (street map)
- **Backend:** Node.js 18+ with Express — serves the app and a small API for live temperature, with an in-memory cache
- **Hosting:** Render (free web service), code on GitHub
- **Languages:** English and Spanish, with a built-in switch

## Run it locally

Requirements: [Node.js](https://nodejs.org) 18 or newer and [Git](https://git-scm.com).

```bash
git clone https://github.com/Maivv122/detectives-tierra-api.git
cd detectives-tierra-api
npm install
npm start          # open http://localhost:8080
```

The data files are already included. To regenerate them from NASA (takes a few minutes):

```bash
npm run datos
```

No API keys are needed. Optional keys go in a `.env` file (copy `.env.example`):

| Variable | Purpose |
|---|---|
| `GOOGLE_WEATHER_API_KEY` | Live temperature from Google Weather (otherwise Open-Meteo is used) |
| `GOOGLE_MAPS_API_KEY` | Google Maps street view (otherwise Esri imagery is used). Restrict it by website. |
| `CACHE_MINUTES` | Minutes a live query is reused (default 30) |
| `PORT` | Server port (default 8080) |

The `.env` file is never uploaded to GitHub.

## Deploy

On [Render](https://render.com): **New → Web Service**, connect this repository and use:

- Build command: `npm install`
- Start command: `npm start`

Each push to `main` can be published with **Manual Deploy → Deploy latest commit** (or automatically if Auto-Deploy is on). On the free plan the service sleeps after 15 minutes without visits and takes about a minute to wake up.

## Project structure

```
├── server.js              # Express server and API
├── scripts/               # Scripts that download NASA data (npm run datos)
└── public/
    ├── index.html
    ├── app.js             # Globe, layers, timeline, statistics, file upload
    ├── zones.js           # Study zones, sources and events
    ├── data/              # Climate data and boundaries
    └── js/
        ├── i18n.js        # English / Spanish
        ├── buscar.js      # Department search
        ├── colombia.js    # Departments on the map and their profile
        ├── comparar.js    # Compare between years and regions
        ├── datos.js       # Regions and series
        ├── graficas.js    # Interactive charts
        └── plano.js       # Data over the street map
```

### API

| Route | Returns |
|---|---|
| `GET /api/temperatura?lat=4.71&lon=-74.07` | Current conditions at a point |
| `GET /api/zonas` | Current conditions at the study zones |
| `GET /api/historico` | Annual mean per study zone |
| `GET /api/salud` | Server status |

## Team

| Name | Role |
|---|---|
| _Name_ | _Role_ |
| _Name_ | _Role_ |
| _Name_ | _Role_ |

## Acknowledgments

Data from NASA (POWER, GISTEMP, GIBS, Blue Marble), NOAA (ERSSTv5), Natural Earth, Esri and Open-Meteo. Context for the study zones comes from IDEAM and the sources cited inside the platform.

---

## Español

**Detectives de la Tierra** es una plataforma web interactiva que convierte los registros climáticos de NASA y NOAA en un mapa que cualquiera puede explorar. Permite buscar un departamento, viajar en el tiempo, comparar regiones y ver cómo ha cambiado la temperatura en Colombia, solo con datos reales y citados. La creamos en equipo para el **NASA Space Apps Challenge 2026**.

Para usarla en español, toca **🌐 Español** en la barra superior. Para correrla en tu computador: `npm install` y luego `npm start`, y abre http://localhost:8080.
