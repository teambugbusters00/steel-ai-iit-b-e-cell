# steel-ai-iit-b-e-cell

A small full-stack demo that simulates an industrial steel plant dashboard (frontend + Express backend, optional MongoDB storage).

**This README** contains quick commands to run the backend and frontend locally, how to build for production, and a simple ASCII diagram that explains how the pieces interact.

**Project layout (important paths)**
- `client/` – React + Vite frontend
- `server/` – Express backend, WebSocket `/ws`, API at `/api/*`
- `server/storage.ts` – in-memory `MemStorage` (default) and optional `MongoStorage` when `USE_MONGODB=true` and `MONGODB_URI` is provided
- `vercel.json` – Vercel deployment configuration (bundles `dist/index.js`, serves `dist/public`)

**Quick Start — Development (recommended)**

Open a PowerShell terminal in the project root (where `package.json` is located):

```powershell
Set-Location -LiteralPath 'c:\Users\vijayjoping\vs code\eco stell ai\EcoSteelAI-1\EcoSteelAI-1'
npm install
# Start dev server (Express + Vite middleware serving client)
npm run dev
```

- The dev server starts the backend and uses Vite middleware to serve the client with HMR.
- Default server port: `5000` (override with `$env:PORT='4000'` before running).

If you want the backend only (no Vite dev client) you can run the server entry directly:

```powershell
$env:NODE_ENV='development'; $env:USE_MONGODB='true'; npx tsx server/index-dev.ts
```

To run without MongoDB in dev (use in-memory simulation):

```powershell
$env:USE_MONGODB='false'; npm run dev
```

**Build & Run (Production)**

```powershell
Set-Location -LiteralPath 'c:\Users\vijayjoping\vs code\eco stell ai\EcoSteelAI-1\EcoSteelAI-1'
npm install
npm run build
npm run start
```

- `npm run build` runs `vite build` and bundles the server (`esbuild`) into `dist/index.js` and places client build into `dist/public`.
- `npm run start` runs the bundled server `node dist/index.js`.

**Vercel deployment notes**
- `vercel.json` expects the server bundle at `dist/index.js` and static assets under `dist/public`.
- Before deploying to Vercel, set the environment variables (in Vercel dashboard or using `vercel env add`): `MONGODB_URI` (if using Mongo), any API keys, and `NODE_ENV=production` if needed.

**Environment variables**
- `USE_MONGODB` – `true` to enable `MongoStorage` (default dev script sets it to `true`), `false` to use in-memory simulation.
- `MONGODB_URI` – MongoDB connection string for production or when `USE_MONGODB=true`.
- `PORT` – port to listen on (default `5000`).

**Simple Architecture (ASCII diagram)**

```
Browser (client)
	|-- HTTP GET / -> served by Express (dev: Vite middleware -> client/index.html)
	|-- WebSocket wss://127.0.0.1:5000/ws  <---- WebSocket connection used for live updates
	|-- HTTP API calls -> /api/furnaces, /api/sensors, /api/alerts, etc.

Backend (Express)
	- Routes: /api/* (REST)
	- WebSocket server at /ws (pushes realtime updates every 2s)
	- Background simulator updates sensors/furnaces and writes to storage

Storage (switchable)
	- MemStorage (in-memory seeded demo data)  <-- used by default and when `USE_MONGODB=false`
	- MongoStorage (Mongoose models)  <-- used if `USE_MONGODB=true` and `MONGODB_URI` connects

Dev flow:
	npm run dev -> starts Express + Vite middleware -> frontend served with HMR
	Express background sim -> updates storage -> WebSocket pushes updates -> client updates UI

Prod flow:
	npm run build -> client build in dist/public + server bundle dist/index.js
	npm run start -> runs `node dist/index.js` -> serves static files from `dist/public` and API from same server
```

**How real-time data is provided**
- The backend has a background simulation (see `server/routes.ts`) that updates furnaces, sensors and KPI values every 2s.
- The server opens a WebSocket (`/ws`) and sends an `update` packet containing `furnaces`, `sensors` and `kpis`.
- The client subscribes to `/ws` and updates the dashboard UI in real time.

If you'd like, I can also:
- add a visual diagram image file (`docs/architecture.png`) and embed it in this `README.md`, or
- create a short `RUNNING.md` with troubleshooting steps for database and Vercel deploys.

---

If you want me to add a PNG/SVG diagram file and reference it here, say which style you prefer (simple box diagram or flowchart) and I'll add it.

