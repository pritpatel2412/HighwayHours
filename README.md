# 🚛 HighwayHours — FMCSA ELD Trip Planner & Daily Log Generator

HighwayHours is an FMCSA § 395 compliant **Trip Planner and Electronic Logging Device (ELD) Log Generator** web application. It converts 4 simple driver inputs into an optimized route, interactive map, chronological itinerary, and visually accurate 24-hour FMCSA daily driver log grid sheets downloadable as PDF or PNG documents.

---

## 🌟 Key Features

1. **Smart HOS § 395 Discrete-Event Simulation Engine**:
   - **11-Hour Driving Limit**: Automatically caps continuous driving per shift.
   - **14-Hour Duty Window**: Enforces the 14-consecutive-hour window from shift start.
   - **30-Minute Rest Break**: Mandatory break after 8 cumulative driving hours.
   - **10-Consecutive-Hour Off-Duty Reset**: Inserts full 10-hr off-duty resets at interpolated lat/lng points along the route.
   - **34-Hour Cycle Restart**: Triggers a 34-hr off-duty restart when the driver's accumulated 70-hr / 8-day cycle limit would be exceeded, resetting the cycle counter to 0.0 hrs.
   - **1,000-Mile Fuel Stops**: Automatically places 30-minute On-Duty (Not Driving) fuel stops every 1,000 route miles.
   - **Pickup & Dropoff Duties**: Includes 1-hour On-Duty (Not Driving) time at both pickup and dropoff locations.

2. **Visual FMCSA 24-Hour Daily Log Sheet Generator**:
   - Renders SVG log sheets matching the official FMCSA "Driver's Daily Log" format.
   - 4 Status Rows: Off Duty, Sleeper Berth, Driving, On Duty (Not Driving).
   - Continuous stepped line representing quarter-hour precision status changes.
   - Remarks row displaying reverse-geocoded city/state locations for duty status changes.
   - Right-hand totals column verifying that daily logged hours sum to exactly **24.00 hours**.
   - Multi-day trip handling with individual day tabs and stacked all-days view.

3. **Interactive Route Map & Itinerary**:
   - Leaflet + OpenStreetMap interactive map with route polyline and custom color-coded stop pins.
   - Chronological timeline with mile markers, arrival timestamps, and duration badges.

4. **PDF & PNG Log Export**:
   - One-click client-side export to printable landscape PDF or high-resolution PNG image (`html2canvas` + `jspdf`).

---

## 🛠️ Tech Stack

* **Backend**: Django 5.0, Django REST Framework (DRF), Python 3.11, PostgreSQL via **Neon** (`dj-database-url`).
* **Frontend**: React (Vite), TypeScript, Tailwind CSS, Leaflet (`react-leaflet`), Lucide Icons, `html2canvas`, `jspdf`.
* **Routing & Geocoding**: OSRM API (route geometry/distance) & OpenStreetMap Nominatim (address geocoding and city/state reverse geocoding with database caching).

---

## 🚀 Environment Variables (`.env`)

Create `.env` inside the `/backend` directory:

```env
DATABASE_URL=postgresql://user:password@ep-host.neon.tech/neondb?sslmode=require
DJANGO_SECRET_KEY=your-django-secret-key
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,.render.com
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://your-vercel-app.vercel.app
OSRM_BASE_URL=https://router.project-osrm.org
NOMINATIM_USER_AGENT=HighwayHoursELDPlanner/1.0
```

---

## 💻 Local Development Setup

### 1. Backend Setup (Django)
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py test trips --keepdb
python manage.py runserver 8000
```

### 2. Frontend Setup (React / Vite)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🌐 Production Deployment Guide

### Backend Deployment (Render / Railway)
- **Service Type**: Web Service (Python 3.11)
- **Build Command**: `cd backend && pip install -r requirements.txt && python manage.py migrate --noinput`
- **Start Command**: `cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
- **Environment Variables**: Add `DATABASE_URL`, `DJANGO_SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`.

### Frontend Deployment (Vercel)
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**: Set `VITE_API_BASE_URL` to your deployed backend URL.

---

## 🧪 Testing

To execute the unit test suite verifying HOS rules, fuel stops, 10-hr resets, 34-hr restarts, and 24-hr daily log total validation:

```bash
cd backend
python manage.py test trips --keepdb
```
