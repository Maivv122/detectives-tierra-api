# Earth Detectives (Detectives de la Tierra)

Web platform to explore how temperature has changed in Colombia using NASA and NOAA data. You can search for a department, move through the years, compare regions and upload your own data to look for trends.

Project developed for the NASA Space Apps Challenge 2026, in the challenge about trends in Earth science data.

Live demo: https://detectives-tierra-api.onrender.com

The platform is available in English and Spanish.

## Motivation

Climate data from NASA and NOAA is public, but working with it usually requires downloading large files and knowing how to process them. Most students, teachers and people outside research never get to see what that data says about their own region.

We wanted a tool where anyone can open a map, pick a department of Colombia and get a clear answer: how much it has warmed, since when, and whether the change is statistically significant. Every value shown comes from a cited source. When a source does not cover a year or a region, the platform says so instead of estimating it.

## Features

- Globe with satellite imagery that switches to a street-level satellite map when you zoom in. The data layers stay visible at every zoom level.
- Search for any of the 33 departments of Colombia (accents are optional). The map moves to the department, highlights it and opens its information.
- Layers for sea surface temperature, air temperature by department, anomaly (difference from normal) and trend per decade.
- Timeline to move through the years or play them as an animation, with climate events such as El Niño and La Niña marked.
- Department view with a short summary, the current year's temperature, the difference from normal, the rate of change and the change since the 1980s, plus its full history chart.
- Comparison between years, where each department is colored by how much it warmed or cooled, and a ranking.
- Comparison between 2 to 4 regions, with the value of each one, the difference and a main finding calculated from the data.
- Interactive charts with exact values on hover, series that can be hidden, period buttons (all, last 30 years, last 10 years), zoom by dragging over the chart and a switch between lines and bars.
- Data upload: a CSV file with date and value columns (for example from NASA Giovanni or Excel). The platform validates the file, shows a summary and tests for a trend. Empty, incompatible or incomplete files get a specific message.
- Responsive design with pinch to zoom on phones.

## Results

Using the NASA POWER air temperature data by department:

- Between 1981 and 2025, 32 of the 33 departments of Colombia got warmer, with an average increase of 0.71 °C.
- Norte de Santander and Vichada show the largest increases, above 1.2 °C.
- La Guajira is on average about 4.3 °C warmer than Antioquia, but Antioquia is warming faster.

## Data sources

| Data | Source | Period |
|---|---|---|
| Sea surface temperature (4° cells) | NOAA ERSSTv5 | 1970 to 2021 |
| Air temperature at 2 m by department | NASA POWER (MERRA-2) | 1981 to 2025 |
| Global temperature | NASA GISTEMP v4 | 1880 to 2025 |
| Department boundaries | Natural Earth | |
| Satellite imagery | NASA Blue Marble, Esri World Imagery, NASA GIBS (MODIS) | |
| Current temperature | Open-Meteo (Google Weather optional) | Live |

The value of each department is the average of the MERRA-2 cells (about 55 x 70 km) whose center falls inside the department.

## Methods

- Anomaly: difference between the value of a year and the reference average.
- Trend: slope of a linear regression, expressed per decade, with its 95 % confidence interval and the Sen slope.
- Significance: a trend is considered clear only when both the regression t-test and the Mann-Kendall test give p < 0.05. If not, the platform reports that the change could be natural variability.

The statistical details are available in each view but kept collapsed so the main result is easy to read.

## Technologies

- Frontend: HTML, CSS and JavaScript, d3.js for the globe projection and the charts, WebGL2 for the satellite globe, Leaflet for the street map.
- Backend: Node.js with Express. It serves the application and a small API for the current temperature, with an in-memory cache.
- Hosting: Render. Source code on GitHub.

## Running locally

Requirements: Node.js 18 or newer and Git.

```bash
git clone https://github.com/Maivv122/detectives-tierra-api.git
cd detectives-tierra-api
npm install
npm start
```

Then open http://localhost:8080.

The data files are already included in the repository. To download them again from NASA (it takes a few minutes):

```bash
npm run datos
```

The project works without API keys. Optional settings can be added in a `.env` file, using `.env.example` as a template:

| Variable | Use |
|---|---|
| `GOOGLE_WEATHER_API_KEY` | Current temperature from Google Weather. Without it, Open-Meteo is used. |
| `GOOGLE_MAPS_API_KEY` | Google Maps for the street map. Without it, Esri imagery is used. It should be restricted by website. |
| `CACHE_MINUTES` | Minutes a current temperature query is reused (default 30). |
| `PORT` | Server port (default 8080). |

The `.env` file is not uploaded to the repository.

## Deployment

The application is deployed on Render as a Web Service:

- Build command: `npm install`
- Start command: `npm start`

New versions are published from Render with Manual Deploy, Deploy latest commit (or automatically if Auto-Deploy is enabled). On the free plan the service sleeps after 15 minutes without visits and takes around a minute to start again.

## Project structure

```
server.js            Express server and API
scripts/             Scripts that download the NASA data (npm run datos)
public/
  index.html
  app.js             Globe, layers, timeline, statistics and data upload
  zones.js           Study zones, sources and events
  data/              Climate data and boundaries
  js/
    i18n.js          English and Spanish
    buscar.js        Department search
    colombia.js      Departments on the map and their information
    comparar.js      Comparison between years and between regions
    datos.js         Regions and data series
    graficas.js      Interactive charts
    plano.js         Data over the street map
```

## API

| Route | Returns |
|---|---|
| `GET /api/temperatura?lat=4.71&lon=-74.07` | Current conditions at a point |
| `GET /api/zonas` | Current conditions at the study zones |
| `GET /api/historico` | Annual average for each study zone |
| `GET /api/salud` | Server status |

## Team

| Name | Role |
|---|---|
| | |
| | |
| | |

## Acknowledgments

Data from NASA (POWER, GISTEMP, GIBS, Blue Marble), NOAA (ERSSTv5), Natural Earth, Esri and Open-Meteo. Information about the study zones comes from IDEAM and the sources cited in the platform.

## Español

Detectives de la Tierra es una plataforma web para explorar cómo ha cambiado la temperatura en Colombia con datos de NASA y NOAA. Permite buscar un departamento, recorrer los años, comparar regiones y subir datos propios para buscar tendencias. Fue desarrollada para el NASA Space Apps Challenge 2026.

Para usarla en español se usa el botón de idioma en la barra superior. Para ejecutarla localmente: `npm install`, luego `npm start`, y abrir http://localhost:8080.
