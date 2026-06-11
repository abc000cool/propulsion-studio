# Propulsion System Architecture Studio

Modular aerospace propulsion design platform with live analysis, mission suitability, cost estimates, and design comparison.

## Quick start (no install)

1. Double-click **`start.bat`** or **`Launch Propulsion Studio.bat`**
2. Browser opens at **http://localhost:5173**
3. Click **Start Designing** or **How to Use** for the guided overlay
4. **OR** Visit: https://abc000cool.github.io/propulsion-studio/

Uses bundled Node from Cursor if system Node is not installed.

## Quick start (Vite + React — recommended for development)

Install [Node.js LTS](https://nodejs.org/), then:

```bash
cd propulsion-studio
npm install
npm run dev
```

This runs the React + `@xyflow/react` workspace (see `src-vite/` when scaffold is complete). Until then, the default **`js/app.js`** app is served by `server.mjs`.

## Features

- **9 propulsion families** with component libraries
- **Partial UI updates** — workspace stays mounted; metrics/costs update without resetting drag
- **Meaningful connections** — topology validation affects efficiency and warnings
- **Propellant & environment presets** (LOX/RP-1, LOX/LH₂, vacuum / sea-level)
- **Mission fit chips** in the workspace + full mission view
- **Cost breakdown** — per-component hardware + propellant estimates
- **Save / Update / Save As** for library designs
- **Compare** with mini architecture diagrams + mission scores
- **Export** JSON, PNG (diagram), PDF report
- **Auto-layout** — left-to-right flow with auto-connect
- **Animated How to Use guide** on the homepage

## Physics assumptions

See **[docs/PHYSICS.md](docs/PHYSICS.md)** for equations, limits, and economic model scope.

## Project structure

```
propulsion-studio/
├── index.html          # App shell
├── server.mjs          # Static server + auto-open browser
├── js/
│   ├── app.js          # Main UI (partial updates)
│   ├── store.js        # State + persistence
│   ├── data/           # Categories, components, propellants, economics
│   ├── engine/         # Analysis, topology, missions, costs
│   └── ui/guide.js     # How-to overlay
├── css/main.css
├── docs/PHYSICS.md
└── package.json        # Optional Vite/React toolchain
```

## Tests

```bash
node js/tests/validate.mjs
```

## Troubleshooting

- **Blank page** — Hard refresh (`Ctrl+Shift+R`). Check browser console for import errors.
- **Port in use** — Close other apps on 5173 or `set PORT=5174` then `node server.mjs`.
