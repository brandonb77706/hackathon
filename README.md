# GigWorker Peak Time Optimizer

Helps Uber, DoorDash, Lyft, Instacart, and other gig delivery drivers find their highest-earning time windows using two prediction layers:

- **Layer 1 (FastAPI math):** Aggregates shift data, calculates avg $/hr by day and hour, ranks top earning windows. New users see community data; users with 5+ shifts see their own personalized data.
- **Layer 2 (Base44 AI agent):** Reads the structured FastAPI data and delivers natural-language recommendations including platform-switching opportunities, trend analysis, and anomaly detection.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, TypeScript |
| Backend | FastAPI (Python), Motor (async MongoDB driver) |
| Database | MongoDB |
| Auth | Google OAuth 2.0 via next-auth + FastAPI JWT |
| AI Agent | Base44 Superagent |

---

## Running Locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB running locally (`mongod`) or a MongoDB Atlas connection string

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your values

# Seed the database with sample data (optional but recommended)
python seed.py

# Start the API server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs: `http://localhost:8000/docs`.

### 2. Frontend

```bash
cd frontend
npm install

# Copy and fill in environment variables
cp .env.local.example .env.local
# Edit .env.local with your values

npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string, e.g. `mongodb://localhost:27017/gigworker` |
| `JWT_SECRET` | Secret key for signing FastAPI JWTs (min 32 chars) |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `AGENT_API_KEY` | Shared secret between FastAPI and Base44 agent |
| `FRONTEND_URL` | Frontend origin, e.g. `http://localhost:3000` |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | App URL, e.g. `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Random secret for next-auth (min 32 chars) |
| `GOOGLE_CLIENT_ID` | Same as backend |
| `GOOGLE_CLIENT_SECRET` | Same as backend |
| `NEXT_PUBLIC_API_URL` | FastAPI base URL, e.g. `http://localhost:8000` |
| `AGENT_API_KEY` | Same value as backend `AGENT_API_KEY` |

---

## Setting Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services → Credentials**
4. Click **Create Credentials → OAuth 2.0 Client IDs**
5. Application type: **Web application**
6. Add Authorized redirect URIs:
   - `http://localhost:8000/auth/google/callback` (FastAPI)
   - `http://localhost:3000/api/auth/callback/google` (next-auth)
7. Copy the **Client ID** and **Client Secret** into both `.env` files

---

## Auth Flow

```
User clicks "Sign in with Google"
  → next-auth redirects to Google consent screen
  → Google redirects to next-auth callback (/api/auth/callback/google)
  → next-auth redirects to /auth/callback page
  → Frontend redirects to FastAPI /auth/google
  → FastAPI exchanges code with Google, fetches oauth_sub
  → FastAPI upserts user by oauth_sub (never by email)
  → FastAPI issues signed JWT {user_id, oauth_sub}
  → FastAPI redirects to frontend /auth/callback?token=...
  → Frontend stores JWT in cookie, redirects to /dashboard
  → All subsequent API calls use the FastAPI JWT
```

> **Security note:** Users are identified exclusively by `oauth_sub` (Google subject ID). Email is stored for display only and is never used for authentication or identity lookups.

---

## Connecting the Base44 Agent

### 1. Add Tools in Base44

In your Base44 Superagent dashboard, add two HTTP tools:

**Tool 1: Get Driver Summary**
- URL: `https://your-api-domain.com/agent/driver-summary`
- Method: GET
- Parameters: `user_id` (string, required)
- Headers: `x-agent-api-key: YOUR_AGENT_API_KEY`

**Tool 2: Save Insight**
- URL: `https://your-api-domain.com/agent/save-insight`
- Method: POST
- Headers: `x-agent-api-key: YOUR_AGENT_API_KEY`
- Body schema:
  ```json
  {
    "user_id": "string",
    "insight_text": "string",
    "top_suggestion": "string"
  }
  ```

### 2. System Prompt

Paste this system prompt into your Base44 agent:

```
You are a peak time coach for gig delivery drivers. You have access to a driver's shift history and earnings data via the driver-summary tool. When asked for advice or when generating a weekly insight:

1. Call driver-summary to get their data
2. Look beyond simple averages — identify platform switching opportunities, time slot patterns, earnings trends over weeks, and compare their performance to community benchmarks
3. Give a single top_suggestion (one clear actionable sentence) and a fuller insight_text (3-5 sentences explaining the patterns you found and what the driver should do this week)
4. Save the insight using the save-insight tool

Be specific, use their actual numbers, and be encouraging.
```

### 3. Triggering the Agent

The "Refresh AI advice" button on the dashboard calls `/api/agent/refresh` (a Next.js server route), which currently generates a placeholder insight. Replace the body of `frontend/src/app/api/agent/refresh/route.ts` with your Base44 agent webhook call to trigger the real agent.

---

## API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/google` | Redirect to Google OAuth |
| GET | `/auth/google/callback` | Handle callback, issue JWT |
| GET | `/auth/me` | Return current user profile |

### Shifts
| Method | Path | Description |
|--------|------|-------------|
| POST | `/shifts` | Log a new shift |
| GET | `/shifts?user_id=` | Get all shifts for a user |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/peak-times?user_id=&city=` | Top 5 earning windows |
| GET | `/earnings/summary?user_id=` | Earnings summary stats |
| POST | `/peak-cache/update` | Rebuild community cache |

### Agent (requires `x-agent-api-key` header)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/agent/driver-summary?user_id=` | Structured data for AI agent |
| POST | `/agent/save-insight` | Persist AI-generated insight |
| GET | `/agent/latest-insight?user_id=` | Most recent insight for user |

---

## Seed Data

The seed script inserts 3 sample users and 30 shifts (10 per user) spread across the last 8 weeks with realistic peak patterns:

- Friday/Saturday evenings 5–10pm (highest earning)
- Weekday lunch 11am–2pm
- Sunday morning 9am–1pm
- All in **Toledo, OH** with earnings of $12–$28/hr across all 5 platforms

Run: `cd backend && python seed.py`

---

## Project Structure

```
hackathon/
├── backend/
│   ├── main.py              # FastAPI app, CORS, startup
│   ├── config.py            # Settings (pydantic-settings)
│   ├── database.py          # Motor client, indexes
│   ├── auth.py              # JWT creation/verification
│   ├── analytics.py         # Layer 1 math (peak windows, earnings)
│   ├── models.py            # Pydantic v2 schemas
│   ├── seed.py              # Sample data
│   ├── requirements.txt
│   └── routes/
│       ├── auth_routes.py
│       ├── shift_routes.py
│       ├── analytics_routes.py
│       ├── agent_routes.py
│       └── user_routes.py
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx          # Redirects to /dashboard
    │   │   ├── login/page.tsx
    │   │   ├── dashboard/page.tsx
    │   │   ├── log-shift/page.tsx
    │   │   ├── history/page.tsx
    │   │   ├── profile/page.tsx
    │   │   ├── auth/callback/page.tsx
    │   │   └── api/
    │   │       ├── auth/[...nextauth]/route.ts
    │   │       └── agent/
    │   │           ├── latest-insight/route.ts
    │   │           └── refresh/route.ts
    │   ├── components/
    │   │   ├── Navbar.tsx
    │   │   ├── PeakHeatmap.tsx
    │   │   └── InsightCard.tsx
    │   ├── lib/
    │   │   ├── api.ts            # API client helpers
    │   │   └── auth.ts           # Cookie helpers
    │   └── middleware.ts         # Route protection
    └── package.json
```
