# sgbus

A modern, mobile-first Singapore bus tracker. Live arrivals, GPS-based nearby stops, an interactive map, and starred favorites — powered by LTA DataMall and free CARTO basemaps.

Built with Next.js 16 (App Router), React 19, Tailwind v4, MapLibre GL, and TypeScript. Installable as a PWA.

## Stack

- **Frontend**: Next.js 16, React 19, Tailwind v4, lucide-react
- **Map**: MapLibre GL JS via `react-map-gl/maplibre`, CARTO Dark Matter raster tiles (no API key, free for non-commercial use)
- **Data**: [LTA DataMall](https://datamall.lta.gov.sg/) BusArrival v3 (live arrivals + bus GPS) + bundled stop dataset in `public/stops.json` (~5,072 stops)
- **Storage**: `localStorage` for favorites + recent searches (no DB)
- **Deploy target**: Vercel

## Local development

```bash
npm install
cp .env.example .env.local      # then fill in your LTA AccountKey
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## LTA API key

1. Register at [datamall.lta.gov.sg](https://datamall.lta.gov.sg/) — it's free.
2. **Confirm the email LTA sends you.** Until you click the confirmation link, the key returns `HTTP 401` for every request.
3. Copy the `AccountKey` from the confirmation email into `.env.local`:
   ```
   LTA_ACCOUNT_KEY=your_key_here
   ```
4. Restart the dev server.

If the key is missing or returns 401, the app falls back to **sample data** so the UI still works. You'll see "Sample data — LTA key inactive" in the status strip on the stop page.

## Routes

| Route | What it does |
|---|---|
| `/` | Search by stop code or street name; jump to recent stops. |
| `/stop/[code]` | Live arrivals for a stop, refreshing every 30s. |
| `/nearby` | GPS-based list of the 15 closest stops. |
| `/map` | All stops on an interactive map with clustering, live bus positions for the selected stop. |
| `/favorites` | Stops you've starred, with live arrivals for each. |
| `/api/arrivals/[code]` | Server-side proxy to LTA `BusArrival v3`, never exposes your key. |

## Stops dataset

`public/stops.json` is bundled with the repo so the map and nearby work instantly without an LTA round-trip. To refresh it from LTA, you can re-run the LTA `BusStops` endpoint (paginated, ~5,200 entries) and normalize to `{ code, lat, lng, name }`.

## Production build

```bash
npm run build
npm run start
```

Deploy to Vercel: connect this repo, set `LTA_ACCOUNT_KEY` as an environment variable, push to `main`.

## Caveats / non-goals

- No bus routing or trip planning (LTA's PT Routing API requires SLA).
- No realtime push (every 30s polling is fine for arrivals at a single stop).
- Offline support is intentionally minimal — favorites + stops list cache only; arrivals always need network.
