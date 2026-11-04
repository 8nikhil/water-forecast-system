# 💻 AquaPulse Frontend — Water Intelligence Web Platform

Modern, responsive web dashboard and interactive analytics suite built with **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS**.

---

## 🌊 Overview

AquaPulse delivers predictive water demand intelligence, automated leak detection, and conservation roadmaps for municipal authorities, agricultural operators, and residents.

### 🌟 Key Views & Modules

1. **Homepage (`LandingView.tsx`):**
   - Clean, light-themed humanized presentation inspired by modern water tech platforms.
   - Live savings calculator for both city utility and agricultural acreage scales.
   - Thematic groundwater & handpump resilience showcase.
2. **Municipal & Residential Overview (`DashboardView.tsx`):**
   - Real-time consumption telemetry, reservoir levels, DMA distribution pressure, and operational alerts.
3. **AI Demand Forecasting (`ForecastingView.tsx`):**
   - 14-day recursive and 30-day seasonal demand projections with 95% confidence bands and climatic elasticity.
4. **Conservation & Wastage Analytics (`ConservationView.tsx`):**
   - Night-flow anomaly detection, Non-Revenue Water (NRW) loss breakdown, and prioritized intervention roadmaps.
5. **Weather Impact & Climatic Elasticity (`WeatherImpactView.tsx`):**
   - Temperature demand sensitivity, automated precipitation delays, and irrigation optimization.
6. **Machine Learning Model Diagnostics (`ModelMetricsView.tsx`):**
   - Residual distribution charts, feature importance ranking, and multi-model benchmark matrices.

---

## 📁 Directory Structure

```
frontend/
├── public/
│   ├── images/               # High-resolution water and conservation imagery
│   ├── favicon.svg           # Custom AquaPulse droplet icon
│   └── icons.svg
├── src/
│   ├── components/           # Reusable UI widgets (Navbar, Alerts, SimulatorModal, RoleSwitch)
│   ├── services/             # Axios API client connecting to FastAPI backend
│   ├── types/                # Strict TypeScript contracts for data payloads
│   ├── views/                # 7 specialized platform views
│   ├── App.tsx               # Root application router and layout shell
│   ├── index.css             # Tailwind base & custom light theme styling
│   └── main.tsx              # React DOM mounting entrypoint
├── index.html                # HTML5 template with Plus Jakarta Sans & Inter fonts
├── package.json              # NPM dependencies & scripts
├── tailwind.config.js        # Custom Tailwind utility extensions
├── vite.config.ts            # Vite bundler configuration & backend API proxy
└── README.md                 # This file
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Runs the local Vite HMR server on `http://localhost:5173`.

### 3. Run Typecheck
```bash
npm run typecheck
```

### 4. Build for Production
```bash
npm run build
```
Compiles and tree-shakes static assets into `frontend/dist/`.
