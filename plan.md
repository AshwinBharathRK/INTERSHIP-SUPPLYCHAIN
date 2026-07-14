# plan.md — Enterprise AI Supply Chain Digital Twin Platform

## 1) Objectives
- Replace the FARM template with a premium enterprise Supply Chain Digital Twin: live simulation + real seeded data + advanced analytics + AI Copilot.
- Ensure **all UI metrics/visuals/predictions** are computed from MongoDB-backed seeded + simulated data (no hardcoded KPIs).
- Deliver 9-page information architecture with cinematic dark theme, motion system, interactive MapLibre+deck.gl map, and R3F 3D warehouse.
- Prove the hardest core in isolation first (LLM + seed + simulation + ML) via a single **test_core.py** and do not proceed until it passes.

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation) ✅ (must pass before UI build)
**User stories (POC):**
1. As a platform operator, I can seed a realistic global supply chain dataset (real cities/ports + products + 12mo daily demand) into MongoDB.
2. As an operator, I can run a simulation tick that moves shipments along waypoint routes and updates inventory.
3. As an operator, I can see reorders trigger when inventory drops below reorder point and become new shipments.
4. As an analyst, I can run forecasting/optimization on the seeded history and get non-NaN, explainable outputs.
5. As a user, I can send a question to the AI Copilot (Emergent LLM key) and receive a valid response.

**Steps:**
- Websearch quick playbook: best practices for (a) Holt-Winters in statsmodels, (b) deck.gl animated paths, (c) FastAPI SSE.
- Backend refactor skeleton (minimal but real):
  - `backend/app/main.py` FastAPI app + CORS + router mounting.
  - `backend/app/db.py` Motor client, collection helpers, indexes.
  - `backend/app/seed.py` deterministic seed generator:
    - Real-world nodes (ports/cities/warehouses) with true coordinates.
    - Products catalog (category, unit cost/weight/volume) + supplier catalog.
    - 12+ months daily demand per product×warehouse (trend+seasonality+noise).
  - `backend/app/sim/engine.py` asyncio tick engine:
    - Shipment state machine (planned→in_transit→arrived), waypoint interpolation.
    - Inventory consumption by demand, replenishment on arrival.
    - Reorder policy -> creates purchase order + shipment.
    - Event generation (depart/arrive/stockout-risk/delay).
  - `backend/app/ml/forecast.py` Holt-Winters + CI; `ml/inventory.py` (EOQ, safety stock, reorder point, days-of-supply); `ml/risk.py` supplier risk scoring.
  - `backend/app/ai/copilot.py` Emergent LLM wrapper (context injection from live KPIs).
- Create **single** `backend/test_core.py` validating:
  1) LLM call returns non-empty text (uses `EMERGENT_LLM_KEY`).
  2) Seed inserts entities + demand history into Mongo with expected counts.
  3) Simulation tick progresses shipments, updates inventory, triggers reorder, emits events.
  4) ML outputs sane values (forecast length, non-negative, no NaNs; EOQ/SS/ABC non-empty; risk scores bounded).
- Run pytest until green; only then proceed.

### Phase 2 — V1 App Build (Full-stack MVP with premium UI)
**User stories (V1):**
1. As an exec, I can open Command Center and see live KPIs + event stream update as the simulation runs.
2. As a logistics manager, I can inspect the Global Network Map and click shipments/nodes to see live status and risk.
3. As a warehouse manager, I can explore a 3D warehouse and visually spot low-stock zones by color.
4. As a planner, I can open Demand Forecasting and generate a product forecast with confidence bands.
5. As a planner, I can open Inventory & Optimization and export actionable recommendations to CSV.

**Backend (API surface + streaming):**
- Routes (all backed by Mongo + simulation state):
  - `/api/health`, `/api/seed` (idempotent), `/api/sim/start|pause|speed`, `/api/sim/state`.
  - `/api/kpis` (global + per node), `/api/events` (poll) + `/api/events/stream` (SSE).
  - `/api/nodes`, `/api/routes`, `/api/shipments` (+ single shipment), `/api/inventory`.
  - `/api/ml/forecast`, `/api/ml/optimization`, `/api/ml/risk`, `/api/analytics/abc|sankey|heatmap`.
  - `/api/ai/chat` (Copilot with structured context).
- Ensure indexes + query limits; add response models; consistent IDs.

**Frontend (design system + 9 pages + motion):**
- Establish design guidelines (tokens, typography, spacing, glass panels, aurora background, focus states).
- App shell:
  - Left rail nav + top bar with simulation controls (play/pause/speed, sim clock).
  - Global command palette + AI Copilot drawer.
  - Skeleton loaders, empty/error states.
- Pages (React.lazy per route):
  1) Command Center (KPIs, event feed, mini map, charts).
  2) Global Network Map (MapLibre + deck.gl: nodes + arcs/paths + animated shipments).
  3) 3D Warehouse Digital Twin (R3F racks/bins bound to occupancy; hover/click inspect).
  4) Inventory & Optimization (table, ABC, EOQ/SS, stockout risk, CSV export).
  5) Demand Forecasting Studio (select node/product; forecast chart w/ CI; compare to actual).
  6) Suppliers & Risk (supplier table, risk factors, map highlight).
  7) Shipments & Logistics (timeline, ETA, delay prediction, filters).
  8) Analytics (sankey, treemap, heatmap seasonality).
  9) AI Copilot (full page + suggested prompts + citations to platform metrics).
- Data layer:
  - React Query for caching/polling; SSE hook for events.
  - Central typed API client; `data-testid` for key interactions.
- End Phase 2: run testing_agent_v3 (backend + frontend), fix failures.

### Phase 3 — Enterprise Depth + Polish
**User stories (polish):**
1. As a user, I can scrub simulation time and see map/3D/charts animate smoothly without jank.
2. As an analyst, I can open Explainability panels that show why a risk/stockout/delay prediction is high.
3. As a planner, I can save and compare scenarios (baseline vs faster lead time vs higher safety stock).
4. As an operator, I can filter events by severity and export incident reports.
5. As a user, I can navigate on mobile/tablet with responsive panels and accessible controls.

**Steps:**
- Advanced viz completion + performance:
  - Force-directed network graph + sankey refinements + treemap + heatmaps.
  - Deck.gl performance tuning (binary attrs, memoization) + viewport-based throttling.
  - R3F instancing for bins/racks; LOD; reduce re-renders.
- AI improvements:
  - Better structured context injection (top KPIs, at-risk SKUs, delayed lanes).
  - Add “Recommended actions” feed with deterministic rules + LLM narrative.
- Operational hardening:
  - Seed idempotency + versioning, simulation recovery, safer background tasks.
  - CSV exports for inventory, shipments, suppliers, events.
- End Phase 3: full testing_agent_v3 run; fix until clean.

### Phase 4 — Finalization
**User stories (final):**
1. As a demo viewer, I can open the app and it self-seeds + starts sim with zero manual setup.
2. As a stakeholder, I can trust that every KPI/chart is traceable to real DB queries.
3. As a user, I can use the Copilot to answer “why” questions with grounded metrics.
4. As a user, I can share/export analytics views for reporting.
5. As QA, I can run the full test suite and get green consistently.

**Steps:**
- Final UX pass: micro-interactions, transitions, accessibility audit, responsive.
- Production build verification (frontend build, backend start, no console errors).
- Add minimal docs: run instructions, env vars, seed/sim notes.

## 3) Next Actions
1. Create backend module skeleton (`app/`), implement seed generator and simulation engine.
2. Add ML modules (forecast/EOQ/ABC/risk) and Copilot wrapper.
3. Write and run `backend/test_core.py` until all assertions pass.
4. Only then implement API routes + frontend shell and pages with lazy loading.

## 4) Success Criteria
- `pytest -q` passes for `test_core.py` proving: seed + simulation + ML + LLM integration.
- App has 9 functional pages; no dead buttons; CSV exports work.
- Live simulation updates map, KPIs, event stream, shipments, and 3D occupancy in near real-time.
- AI outputs are grounded in live data (shows referenced KPIs/at-risk items) and never uses hardcoded dashboard numbers.
- Performance: smooth interactions; no major UI jank; production build succeeds.