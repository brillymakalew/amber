# Ember — Daily Calorie & Weight Tracker

Mobile-first web app. Node.js + Express, native SQLite (Node built-in node:sqlite, requires Node 22+), Docker.
Animated particle field, draw-on SVG trend charts, glassy ember-themed UI.

## Run with Docker (recommended)
```bash
docker compose up --build
```
Open http://localhost:3000 — data persists in the `tracker-data` volume.

## Run locally
```bash
npm install      # just express, no native build
npm start
```

## Features
- Log calories + weight per day (date picker, same-day overwrite/upsert)
- Animated stat cards: avg kcal, current weight, weight change
- Toggleable trend chart (calories / weight) with animated line draw + glowing dots
- History list with delete
- Input validation, persistent native SQLite DB

## Structure
- `src/server.js` — Express API + SQLite (`/api/entries`, `/api/stats`)
- `public/index.html` — full self-contained mobile-first UI
- `Dockerfile`, `docker-compose.yml` — containerization with persistent volume
