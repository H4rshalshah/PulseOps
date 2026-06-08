# DeadMan ⚡ — Automated Incident Response System

> *"Production fires don't wait. Neither does DeadMan."*

DeadMan is a production-grade, full-stack Automated Incident Response System designed for engineers who deal with real incidents at 2 AM. Think NASA mission control crossed with a Bloomberg terminal — powerful, precise, and trustworthy.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB 7+
- Redis 7+ (optional for BullMQ)
- Docker & Docker Compose (optional)

### Option 1: Run with Docker

```bash
docker-compose up -d
```

This starts MongoDB, Redis, backend (port 3001), and frontend (port 3000).

### Option 2: Run Locally

**Backend:**
```bash
cd backend
npm install
npm run migrate   # Create database tables
npm run seed      # Load demo data (50 incidents, 8 runbooks, etc.)
npm run dev       # Start on port 3001
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev       # Start on port 3000
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🎯 5-Minute Interview Demo Flow

This demo is designed for software engineering interviews at Amazon/Google. It showcases the full capabilities of DeadMan.

### Step 1: Open Dashboard
- Navigate to `/dashboard`
- See live metric cards: Active Incidents, MTTR, Runbooks Active, Actions Today
- Real-time incident feed with WebSocket connection indicator

### Step 2: Trigger a Test Incident
- Click **[Test Webhook]** button in header
- This sends a fake Grafana-style alert to the backend
- Watch the new incident appear *instantly* in the feed via WebSocket
- A toast notification confirms the incident was created

### Step 3: View Incident Details
- Click on the new incident
- See: severity badge, source, service name, timestamps
- View the **Execution Timeline** — step-by-step runbook progress
- Generate a **Situation Report** with terminal-style typewriter effect

### Step 4: Analyze Metrics
- Navigate to `/analytics`
- MTTR trend line chart (30 days)
- Incidents by severity (stacked bar chart)
- Incident source distribution (pie chart)
- Per-day incident breakdown

### Step 5: Explore the Runbook Builder
- Navigate to `/runbooks`
- Click **[Edit]** on any runbook or **[New Runbook]**
- Drag step types from the left panel onto the React Flow canvas
- Connect nodes, configure steps, save the runbook
- Click **[Test Run]** for a dry-run execution

### Key Talking Points
- **Architecture**: Real-time WebSocket updates, BullMQ job queue for async execution, MongoDB for persistence
- **Design decisions**: Dry-run mode for safe testing, universal webhook ingestion, audit trail for compliance
- **Resilience**: Exponential backoff on BullMQ jobs, graceful degradation without Redis, error boundaries everywhere

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Grafana    │     │   Datadog    │     │  Prometheus  │
│   (Alert)    │     │   (Alert)    │     │   (Alert)    │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │ POST /api/webhooks/ingest
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Express Backend                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Incidents│  │ Runbooks │  │  Runbook Executor    │  │
│  │  CRUD    │  │  CRUD    │  │  (Core Engine)       │  │
│  └──────────┘  └──────────┘  └──────────┬───────────┘  │
│  ┌──────────┐  ┌──────────┐             │              │
│  │Analytics │  │Settings  │     BullMQ  │              │
│  │  Routes  │  │  Routes  │     Worker  │              │
│  └──────────┘  └──────────┘             │              │
│  ┌──────────────────────────────────────┘              │
│  │  Socket.io  ◄──── WebSocket (real-time)             │
│  └─────────────────────────────────────────────────────┘
                          │
              ┌───────────┴────────────┐
              ▼                        ▼
        ┌──────────┐           ┌──────────────┐
        │ MongoDB  │           │    Redis     │
        │  (Data)  │           │  (Queue/Cache)│
        └──────────┘           └──────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │   Next.js Frontend     │
              │   (React + Tailwind)   │
              │   + Socket.io Client   │
              └────────────────────────┘
```

## 🗄️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript 5, Tailwind CSS |
| **State/UI** | Framer Motion, Recharts, React Flow |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | MongoDB 7 (via Mongoose) |
| **Queue** | BullMQ (backed by Redis) |
| **Real-time** | Socket.io |
| **Auth** | Integration-ready (Slack, PagerDuty, GitHub) |
| **Deployment** | Docker, Docker Compose |

## 📂 Project Structure

```
deadman/
├── frontend/                  # Next.js 14 App Router
│   ├── app/                   # Pages (dashboard, incidents, runbooks, analytics, settings)
│   ├── components/            # React components (layout, incidents, runbooks, dashboard, ui)
│   ├── lib/                   # API client, Socket.io client, TypeScript types
│   └── hooks/                 # Custom React hooks
├── backend/                   # Express API server
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   ├── controllers/       # Request/response logic
│   │   ├── services/          # Business logic (RunbookExecutor, SituationReport, etc.)
│   │   ├── models/            # Database models
│   │   ├── workers/           # BullMQ background workers
│   │   ├── websocket/         # Socket.io server
│   │   └── db/                # Connection, migrations, seed
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🔌 API Endpoints

### Incidents
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/incidents` | List incidents (filterable) |
| POST | `/api/incidents` | Create incident |
| GET | `/api/incidents/:id` | Get incident details |
| PATCH | `/api/incidents/:id` | Update incident |
| DELETE | `/api/incidents/:id` | Delete incident |
| POST | `/api/incidents/:id/resolve` | Mark resolved |
| POST | `/api/incidents/:id/situation-report` | Generate report |

### Runbooks
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/runbooks` | List runbooks |
| POST | `/api/runbooks` | Create runbook |
| GET | `/api/runbooks/:id` | Get runbook |
| PUT | `/api/runbooks/:id` | Update runbook |
| DELETE | `/api/runbooks/:id` | Delete runbook |
| POST | `/api/runbooks/:id/execute` | Execute runbook |
| POST | `/api/runbooks/:id/test` | Dry-run test |

### Webhooks
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/webhooks/ingest` | Universal alert receiver |
| GET | `/api/webhooks/logs` | Recent webhook payloads |

### Analytics & More
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/analytics/mttr` | MTTR data points |
| GET | `/api/analytics/summary` | Dashboard metrics |
| GET | `/api/analytics/incidents-by-day` | Daily breakdown |
| GET | `/api/health` | Service health check |

## 🌐 WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `incident:new` | Server → Client | New incident created |
| `incident:updated` | Server → Client | Incident status changed |
| `step:update` | Server → Client | Runbook step progress |
| `monitor:status` | Server → Client | Health check result |
| `incident:subscribe` | Client → Server | Join incident room |
| `dashboard:subscribe` | Client → Server | Join global feed |

## 📊 Database Schema

- **incidents** — Core incident records with severity, status, source, MTTR, and situation reports
- **runbooks** — Automated response runbooks with JSONB steps array
- **action_executions** — Audit log for every runbook step executed
- **monitors** — Health check endpoint configuration
- **settings** — Key-value configuration for integrations
- **webhook_logs** — Incoming webhook payload history

## 🎨 Design System

- **Colors**: Dark theme (#0A0C10 bg, #111318 surface, #1E2330 border)
- **Accents**: Cyan (#00D4FF), Danger (#FF3B5C), Warning (#FFB020), Success (#00E5A0)
- **Fonts**: JetBrains Mono (code), Syne (headings), Inter (body)
- **Animations**: Framer Motion throughout (page transitions, pulse rings, typewriter)
- **Light mode**: Toggleable via ThemeToggle (persists to localStorage)

## 📝 Environment Variables

Create `backend/.env`:
```
PORT=3001
MONGO_URI=mongodb://localhost:27017/deadman
REDIS_URL=redis://localhost:6379
SLACK_WEBHOOK_URL=
GITHUB_TOKEN=
PAGERDUTY_API_KEY=
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## 🧪 Seed Data

Run `npm run seed` in the backend to load:
- 50 past incidents (30 days span, varying severity)
- 8 pre-built runbooks (503 Fix, High Memory, DB Exhausted, etc.)
- 200+ action execution records
- 5 health check monitors

## 🤝 Social

- GitHub: [@H4rshalshah](https://github.com/H4rshalshah)
- LinkedIn: [H4rshal](https://www.linkedin.com/in/h4rshal/)
- Twitter: [@H4rshalshah](https://x.com/H4rshalshah)

---

Built with ❤️ for engineers who keep the internet running.
