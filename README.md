# HighwayHours

Trip Planner + ELD Log Generator — a full-stack web app that plans FMCSA-compliant routes and generates Driver's Daily Log sheets for property-carrying drivers under the 70-hour/8-day cycle.

## Stack

- **Backend:** Django 5 + Django REST Framework, Python 3.11+
- **Frontend:** React (Vite) + Tailwind CSS + react-leaflet
- **Database:** PostgreSQL via Neon
- **Routing:** OSRM (public demo server, no API key)
- **Geocoding:** Nominatim (OpenStreetMap)

## Project structure

```
HighwayHours/
├── backend/          # Django API
├── frontend/         # React SPA
├── .env.example      # Backend env template (see backend/.env.example)
└── README.md
```

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Neon PostgreSQL connection string

### Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your DATABASE_URL and DJANGO_SECRET_KEY

python manage.py migrate
python manage.py runserver
```

API runs at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:8000

npm run dev
```

App runs at `http://localhost:5173`.

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `DJANGO_SECRET_KEY` | Yes | Django secret key |
| `DEBUG` | No | `True` for local dev |
| `ALLOWED_HOSTS` | No | Comma-separated hosts |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated frontend URLs |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Backend API base URL |

## HOS engine

The Hours-of-Service simulation lives in `backend/trips/hos_engine.py`. It implements a discrete-event simulation enforcing:

- 11-hour max driving per shift
- 14-hour duty window
- 30-minute break after 8 cumulative driving hours
- 10-hour off-duty reset between shifts
- 70-hour / 8-day cycle limit (with 34-hour restart when needed)
- Fuel stops every 1,000 miles (30 min on-duty not driving)
- 1-hour on-duty at pickup and dropoff

All HOS logic runs server-side; the frontend only renders results.

## API

- `POST /api/trips/` — create and compute a trip
- `GET /api/trips/{id}/` — retrieve a saved trip

## License

Assessment project — all rights reserved.
