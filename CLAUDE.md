# GigWorker Peak Time Optimizer — Claude Context

## Project Overview
Full-stack app that helps gig delivery drivers (Uber, DoorDash, Lyft, Instacart) find their highest-earning time windows using two prediction layers:
- **Layer 1:** FastAPI math — aggregates shift data, ranks top $/hr windows
- **Layer 2:** Base44 AI agent — natural language recommendations on top of the math

## Stack
- **Frontend:** Next.js 14 (App Router), Tailwind CSS, TypeScript — `frontend/`
- **Backend:** FastAPI (Python), Motor (async MongoDB) — `backend/`
- **Database:** MongoDB Atlas — cluster: `PeakPay`, database: `peakpay`
- **Auth:** Google OAuth 2.0 via next-auth (UI) + FastAPI JWT (API)
- **AI Agent:** Base44 Superagent

## Repo Structure
```
hackathon/
├── backend/
│   ├── main.py              # FastAPI app entry point, CORS, lifespan
│   ├── config.py            # Pydantic settings (reads .env)
│   ├── database.py          # Motor client, index creation
│   ├── auth.py              # JWT sign/verify, bearer scheme
│   ├── analytics.py         # Layer 1 peak window math + peak_cache rebuild
│   ├── models.py            # Pydantic v2 schemas
│   ├── seed.py              # 3 users + 30 shifts seed script
│   ├── requirements.txt
│   └── routes/
│       ├── auth_routes.py       # /auth/google, /auth/google/callback, /auth/me
│       ├── shift_routes.py      # POST /shifts, GET /shifts
│       ├── analytics_routes.py  # /peak-times, /earnings/summary, /peak-cache/update
│       ├── agent_routes.py      # /agent/driver-summary, /agent/save-insight, /agent/latest-insight
│       └── user_routes.py       # PATCH /users/{user_id}
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx              # Redirects → /dashboard
    │   │   ├── login/page.tsx        # Google sign-in button
    │   │   ├── dashboard/page.tsx    # Summary cards, heatmap, AI insight
    │   │   ├── log-shift/page.tsx    # Shift logging form
    │   │   ├── history/page.tsx      # Shift history table
    │   │   ├── profile/page.tsx      # Name, email (read-only), city (editable)
    │   │   ├── auth/callback/page.tsx
    │   │   └── api/
    │   │       ├── auth/[...nextauth]/route.ts
    │   │       └── agent/
    │   │           ├── latest-insight/route.ts  # Server proxy (adds agent key)
    │   │           └── refresh/route.ts          # Triggers insight generation
    │   ├── components/
    │   │   ├── Navbar.tsx
    │   │   ├── PeakHeatmap.tsx   # 7×24 color grid
    │   │   └── InsightCard.tsx   # AI insight display + refresh button
    │   ├── lib/
    │   │   ├── api.ts            # All fetch helpers (uses FastAPI JWT cookie)
    │   │   └── auth.ts           # Cookie get/set/clear helpers
    │   └── middleware.ts         # Protects all routes except /login, /auth/*
    └── package.json
```

## MongoDB Collections
- **users** — identified by `oauth_sub` (Google subject ID), never by email
- **shifts** — `earnings_per_hour`, `day_of_week`, `hour_of_day` auto-derived on write
- **peak_cache** — community aggregates by city+platform+day+hour, rebuilt on startup + every 50 shifts
- **agent_insights** — AI-generated recommendations saved by the Base44 agent

## Auth Flow
1. User clicks "Sign in with Google" → next-auth → Google consent
2. next-auth callback → `/auth/callback` page
3. Frontend redirects to FastAPI `/auth/google`
4. FastAPI exchanges code → gets `oauth_sub` from Google
5. FastAPI upserts user by `oauth_sub` (NEVER by email)
6. FastAPI issues signed JWT `{user_id, oauth_sub}` → redirects to frontend with `?token=`
7. Frontend stores JWT in `api_token` cookie → all API calls use this JWT
8. next-auth session token is NOT used for API calls — only for the OAuth UI flow

## Key Rules
- Identity key is always `oauth_sub` — never use email for auth/lookup
- Passwords are never stored
- `AGENT_API_KEY` header required for all `/agent/*` endpoints
- Personal peak data requires 5+ shifts; otherwise falls back to community `peak_cache`
- `earnings_per_hour = (earnings + tips) / hours_worked` — always auto-calculated on write

## Environment Variables

### backend/.env
```
MONGODB_URI=mongodb+srv://brandonb77706_db_user:<password>@peakpay.0vflkcg.mongodb.net/peakpay?retryWrites=true&w=majority&appName=PeakPay
JWT_SECRET=<32+ char secret>
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
AGENT_API_KEY=<shared secret with Base44>
FRONTEND_URL=http://localhost:3000
```

### frontend/.env.local
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<32+ char secret>
GOOGLE_CLIENT_ID=<same as backend>
GOOGLE_CLIENT_SECRET=<same as backend>
NEXT_PUBLIC_API_URL=http://localhost:8000
AGENT_API_KEY=<same as backend>
```

## Running Locally
```bash
# Backend
cd backend && source venv/bin/activate
uvicorn main:app --reload --port 8000

# Seed DB (first time only)
python seed.py

# Frontend
cd frontend
npm run dev
```

## Common Commands
```bash
# Install backend deps
pip install -r requirements.txt

# Install frontend deps
npm install

# Rebuild peak cache manually
curl -X POST http://localhost:8000/peak-cache/update -H "Authorization: Bearer <token>"

# View API docs
open http://localhost:8000/docs
```

## Base44 Agent Config
- Tool 1: GET `/agent/driver-summary?user_id=` with header `x-agent-api-key`
- Tool 2: POST `/agent/save-insight` with header `x-agent-api-key`
- System prompt is documented in README.md
- Refresh endpoint: `frontend/src/app/api/agent/refresh/route.ts` — replace placeholder with real Base44 webhook call

## Known Issues / Notes
- macOS SSL fix: run `/Applications/Python\ 3.12/Install\ Certificates.command` if you get SSL errors connecting to Atlas
- `tlsAllowInvalidCertificates=true` can be added to MONGODB_URI for local dev only — remove before deploying
- The `api_token` cookie is JS-accessible (not httpOnly) so Next.js middleware can read it — consider moving to httpOnly in production via a server-side session
