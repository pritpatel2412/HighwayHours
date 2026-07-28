# MASTER PROMPT — Paste this entire thing into Cursor

You are building a full-stack **Trip Planner + ELD Log Generator** web app for a job assessment. Read this entire prompt before writing any code. Follow it exactly — accuracy of the hours-of-service (HOS) logic and UI/UX quality are both graded.

## 1. What this app does (objective)

The app takes 4 inputs from a driver and produces a route + auto-filled FMCSA daily driver logs.

**Inputs (a form):**
- Current location (address/city, geocode to lat/lng)
- Pickup location (address/city, geocode to lat/lng)
- Dropoff location (address/city, geocode to lat/lng)
- Current Cycle Used (Hrs) — hours already accumulated in the driver's rolling 70-hour/8-day cycle before this trip starts

**Outputs:**
1. A **map** showing the full route (current → pickup → dropoff) with markers for every stop: fuel stops, rest breaks, pickup, dropoff, and each daily off-duty/sleeper period.
2. A route summary: total distance, total driving time, number of days, list of stops with reason/duration/mile-marker.
3. One or more **Daily Log Sheets** — visually rendered as the actual FMCSA "Driver's Daily Log" 24-hour grid (four rows: Off Duty / Sleeper Berth / Driving / On Duty Not Driving), correctly filled in with a plotted line across the grid for every status change, remarks with city/state at each change of duty status, and the totals column on the right adding to 24. Generate **one log sheet per 24-hour period** of the trip — a multi-day trip must produce multiple sheets, each downloadable/printable (PNG or PDF).

## 2. Hard assumptions (stated in the assessment — do not deviate)

- Property-carrying driver, using the **70-hour/8-day** cycle (not 60/7).
- **No adverse driving conditions exception** — do not add the +2hr adverse-weather extension anywhere.
- No short-haul exceptions — treat every trip as standard long-haul, full RODS (record of duty status) required.
- Must fuel **at least once every 1,000 miles** — insert a fuel stop logged as **On Duty (Not Driving)**, 30 minutes duration, every 1,000 miles of the route.
- **1 hour On Duty (Not Driving)** at the pickup location, and **1 hour On Duty (Not Driving)** at the dropoff location.
- No sleeper berth split-duty complexity needed — model the required daily rest as a single 10-consecutive-hour **Off Duty** period (simpler and still 100% compliant with §395.3(a)(1)). Do not implement the sleeper-berth pairing/split provision — it's optional complexity not required by the assumptions.

## 3. HOS / ELD simulation algorithm (implement exactly this — this is the core grading criterion)

Treat this as a discrete event simulation over the whole trip, producing a list of `DutyEvent { status, start_datetime, end_datetime, location, remark }` where `status` is one of `OFF_DUTY`, `SLEEPER_BERTH` (unused per assumption above, but keep the enum for schema completeness), `DRIVING`, `ON_DUTY_NOT_DRIVING`.

**Constants (from 49 CFR 395, confirmed in the attached FMCSA guide):**
- `MAX_DRIVING_PER_SHIFT = 11` hours
- `MAX_DUTY_WINDOW = 14` hours (consecutive hours from start of shift in which the 11 driving hours must be completed; once elapsed, no more driving until reset)
- `REQUIRED_BREAK_AFTER = 8` cumulative driving hours → must take a **30-minute** break (off duty or on-duty-not-driving) before driving further
- `REQUIRED_OFF_DUTY = 10` consecutive hours to reset the 11-hr/14-hr clocks
- `CYCLE_LIMIT = 70` hours on-duty in a rolling 8-day window
- `RESTART_HOURS = 34` consecutive hours off duty to reset the 70-hour cycle back to zero (only invoke if the trip's on-duty accumulation would exceed 70 hours given the user's "Current Cycle Used" input — if the trip cannot be completed within the remaining cycle hours without a 34-hr restart, insert one and clearly flag it in the output)

**Simulation steps:**
1. Geocode all 3 locations. Get driving route + distance + duration for leg 1 (current→pickup) and leg 2 (pickup→dropoff) from the routing API (see §4).
2. Build a flat timeline of "required activity" in order: drive to pickup → 1hr on-duty (pickup) → drive to dropoff (inserting fuel stops every 1000 cumulative route miles as 30-min on-duty-not-driving events) → 1hr on-duty (dropoff).
3. Walk this timeline hour-by-hour (or minute-by-minute) allocating it into duty periods, enforcing all constants above in this precedence:
   - Never let cumulative driving in the current shift exceed 11 hours before forcing a 10-hour off-duty reset.
   - Never let elapsed time since shift start exceed 14 hours while still driving — if the 14-hour window is about to be exceeded, stop driving, log remaining planned activity as on-duty-not-driving is not applicable (can't drive), and force the 10-hour reset.
   - Insert a 30-minute break the first time cumulative driving in the shift hits 8 hours, before continuing to drive.
   - Track cumulative on-duty hours in the rolling 8-day / 70-hour window (starting from `current_cycle_used_hrs` input). If projected on-duty time would exceed 70, insert a 34-hour restart before continuing and reset the rolling counter to 0.
   - Every time a shift ends (11hr driving used, or 14hr window elapsed, or end of day), insert exactly one `OFF_DUTY` event of `REQUIRED_OFF_DUTY` (10) hours before the next `DRIVING` event, at whatever location the driver has reached along the route at that point (interpolate lat/lng along the route line for the remark's location string).
4. Split the resulting full timeline into **24-hour calendar periods** starting at the trip's start time-of-day baseline (use the same start clock time each "day" like the paper log, matching the home-terminal time convention described in the FMCSA guide) — this produces the list of daily logs.
5. For every status change, record a `remark` with the **nearest city/state** (reverse-geocode the interpolated point) exactly as the FMCSA log instructs (e.g., "Springfield, MO" or highway+mile marker if between cities) — reuse this in both the map stop list and the log sheet remarks row.

Write this as a well-isolated, unit-testable Python module (`hos_engine.py` or similar) in the Django backend — no HOS math in the frontend. Add unit tests covering: a short same-day trip (no reset needed), a trip that requires exactly one 10-hr reset, a trip long enough to need a 34-hr restart, and a trip that crosses a 1,000-mile fuel threshold mid-leg.

## 4. Tech stack & integrations

- **Backend:** Django + Django REST Framework, Python 3.11+.
- **Frontend:** React (Vite), Tailwind CSS for styling. Use `react-leaflet` + `Leaflet` with OpenStreetMap tiles for the map (free, no API key needed).
- **Routing/geocoding (free, no paid key required):**
  - Use **OSRM's public demo routing server** (`https://router.project-osrm.org`) for route geometry/distance/duration between the 3 points, OR **OpenRouteService** free-tier API (requires a free signup for an API key — if you use this, put the key in backend `.env`, never hardcode it, never expose it to the frontend).
  - Use **Nominatim** (OpenStreetMap, `https://nominatim.openstreetmap.org`) for geocoding addresses → lat/lng and reverse-geocoding lat/lng → city/state for remarks. Respect Nominatim's usage policy (set a descriptive `User-Agent` header, add a small delay/cache to avoid rate-limiting, and cache geocoded results in the DB so repeat lookups don't re-hit the API).
- **Database:** PostgreSQL via **Neon** (I already have a Neon connection string — read it from an environment variable `DATABASE_URL` in `.env`, wired into Django `settings.py` via `dj-database-url` or `psycopg2` + manual parsing. Do not use SQLite anywhere, including local dev — connect straight to Neon so behavior matches production).
- **LLM (optional, only if you use one):** If you add any natural-language feature (e.g., a plain-English trip summary, or an assistant that explains why a stop was scheduled), use the **Groq API free tier** (`llama-3.1-8b-instant` or similar free Groq model) via their OpenAI-compatible endpoint. Key goes in backend `.env` as `GROQ_API_KEY`, called server-side only. This is optional polish, not required for the core grading criteria — do not let it block core HOS/map functionality.
- **Log sheet rendering:** Render the daily log grid as an SVG or HTML5 Canvas component in React, matching the real FMCSA grid layout: header fields (date, total miles, carrier name, truck/trailer #), the 4-row 24-hour graph grid with a continuous stepped line showing status at every hour/quarter-hour, a Remarks row below with city/state labels at each duty-status change, and a totals column on the right that sums to 24.00 hours. Provide a "Download as PDF" or "Download as PNG" button per sheet (use `html2canvas` + `jspdf`, or render server-side with a Python library like `svglib`/`reportlab` if you prefer backend generation — either is fine, pick one and make it robust).

## 5. Backend API design

Design clean DRF endpoints, roughly:
- `POST /api/trips/` — body: `{ current_location, pickup_location, dropoff_location, current_cycle_used }` → creates a `Trip`, runs the full pipeline (geocode → route → HOS simulation → log generation), and returns the full result (route geometry, stops list, and daily logs) in one response.
- `GET /api/trips/{id}/` — retrieve a previously computed trip (persist trips + their computed logs in Postgres so results are reload-able, not recomputed each time the page refreshes).
- Model it properly: `Trip`, `RouteStop`, `DutyEvent`, `DailyLog` (or embed DutyEvent/DailyLog as JSON fields on Trip if that's simpler — your call, but persist enough to reconstruct the UI on reload without recomputation).

## 6. Frontend requirements

- One clean landing page: a form for the 4 inputs, client-side validation (required fields, cycle hours between 0–70), a "Plan Trip" button with a loading state while the backend computes.
- Results view: map at the top (route line + colored markers per stop type — driving leg, fuel stop, rest/off-duty, pickup, dropoff), a scrollable stop-by-stop itinerary list below it, then the generated daily log sheets stacked below that, each clearly labeled "Day 1", "Day 2", etc.
- This is graded on **design quality**, not just function — use a real design system (Tailwind + thoughtful spacing/typography/color, not default browser styling), make it responsive (usable on mobile), add empty/loading/error states, and don't ship anything that looks like a bare unstyled prototype.

## 7. Environment & secrets

Create `.env.example` (committed) and `.env` (gitignored) in the backend with:
```
DATABASE_URL=<neon connection string I will provide>
OPENROUTESERVICE_API_KEY=<only if you use ORS instead of OSRM>
GROQ_API_KEY=<only if you add an LLM feature>
DJANGO_SECRET_KEY=<generate one>
DEBUG=False
ALLOWED_HOSTS=<set for deployed backend host>
CORS_ALLOWED_ORIGINS=<deployed frontend URL>
```
Never commit real secrets. Add a proper `.gitignore` (Python + Node + `.env` + `__pycache__` + `node_modules` + build artifacts) at the very start, before the first commit.

## 8. Deployment

- **Frontend:** deploy to Vercel (React/Vite app).
- **Backend:** Django needs a real server process — deploy it to **Render.com** (free tier, easiest for Django+Postgres) or **Railway**. Do not try to force Django onto Vercel serverless — use Vercel only for the React static frontend and point it at the Render/Railway backend URL via an environment variable (`VITE_API_BASE_URL`).
- Confirm CORS is configured so the deployed frontend can call the deployed backend.
- After deployment, do a full manual end-to-end test on the **live hosted URLs** (not just localhost) with a real multi-day trip (e.g., a trip long enough to require 2+ log sheets and at least one fuel stop) before considering this done.

## 9. Git workflow (follow this strictly throughout the whole build)

- Initialize the git repo and push an initial commit (scaffolding + `.gitignore`) to GitHub **before** writing feature code.
- Work in small, complete increments. After you finish implementing and **manually verifying** each of the following units of functionality, `git add -A && git commit -m "<clear message>" && git push` immediately — do not batch multiple unrelated features into one commit, and do not leave working code uncommitted at the end of a step:
  1. Project scaffolding (Django project + DRF + Neon connection working; React+Vite+Tailwind scaffolding) → commit/push
  2. Geocoding + routing integration (backend can take 3 addresses and return a route + distance) → commit/push
  3. HOS simulation engine + its unit tests passing → commit/push
  4. Trip API endpoint wired end-to-end (form → backend → JSON result) → commit/push
  5. Map rendering on frontend with real route + stops → commit/push
  6. Daily log sheet rendering (visually matches the FMCSA grid) → commit/push
  7. Multi-day trip handling (multiple log sheets generated correctly) → commit/push
  8. PDF/PNG export of log sheets → commit/push
  9. Styling/UX pass across the whole app → commit/push
  10. Deployment configs (Render/Railway backend, Vercel frontend) working on live URLs → commit/push
- Keep the `main` branch always in a working, non-broken state — never push something that fails to run.

## 10. Definition of done (check every box before calling this finished)

- [ ] All 4 inputs accepted, validated, and geocoded correctly
- [ ] Route computed and rendered on an interactive map with distinct markers for every stop type
- [ ] HOS simulation correctly enforces: 11-hr driving limit, 14-hr duty window, 30-min break after 8hrs driving, 10-hr reset between shifts, 70-hr/8-day cycle limit factoring in the user's "current cycle used" input, and 34-hr restart when the cycle would otherwise be exceeded
- [ ] Fuel stops inserted every 1,000 miles as 30-min on-duty-not-driving events
- [ ] 1-hour on-duty-not-driving logged at both pickup and dropoff
- [ ] One correctly-filled daily log sheet generated per 24-hour period, visually matching the real FMCSA grid, with correct totals summing to 24 hours and correct city/state remarks at every status change
- [ ] Multi-day trips produce multiple, correctly sequential log sheets
- [ ] Log sheets downloadable as PDF or PNG
- [ ] Trips persist in Neon Postgres and reload without recomputation
- [ ] Frontend is polished, responsive, and has loading/error/empty states — no bare/unstyled UI
- [ ] Backend deployed and reachable on a public URL (Render/Railway)
- [ ] Frontend deployed and reachable on a public Vercel URL, correctly calling the deployed backend
- [ ] Full end-to-end test performed on the live hosted URLs with a multi-day example trip
- [ ] GitHub repo is public/shareable, has clean incremental commit history per §9, and a README explaining setup, env vars, and how the HOS engine works

Start now: scaffold the repo, set up `.gitignore`, connect to the Neon database I've provided, and begin with step 1 of the git workflow above. Ask me for the Neon connection string and, if you choose OpenRouteService or Groq, tell me exactly which env vars you need from me before you need them — don't block on speculative secrets you might not end up using.