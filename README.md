# DeadMan ⚡ — Automated Incident Response System

> *"Production fires don't wait. Neither does DeadMan."*

DeadMan is a production-grade, full-stack Automated Incident Response System designed for engineers who deal with real incidents at 2 AM. Think NASA mission control crossed with a Bloomberg terminal — powerful, precise, and trustworthy.

---

## 🚀 Live Demo

**[deadman.onrender.com](https://deadman.onrender.com)** — Deploy your own in minutes!

---

## ✨ Features

- **Real-time Incident Feed** — Live WebSocket updates when incidents are triggered
- **Smart Runbook Builder** — Drag-and-drop React Flow canvas to build automated response playbooks
- **Situation Reports** — Auto-generated terminal-style typewriter reports for post-mortems
- **Analytics Dashboard** — MTTR trends, severity breakdowns, source distributions
- **Multi-Source Ingestion** — Accept alerts from Grafana, Datadog, Prometheus, PagerDuty, or manual entry
- **Background Jobs** — BullMQ-powered async runbook execution with retry logic
- **Dual Theme** — Light mode (white bg) / Dark mode (pure black bg) with persistent toggle
- **Fully Containerized** — Docker & Docker Compose for local dev and production

---

## 🖥️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript 5, Tailwind CSS |
| **Animations** | Framer Motion, custom keyframe animations |
| **Charts** | Recharts (MTTR, severity bar, source pie) |
| **Canvas** | React Flow (runbook builder) |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | MongoDB 7 (via Mongoose 9) |
| **Queue** | BullMQ (backed by Redis) — graceful fallback to in-memory |
| **Real-time** | Socket.io (bidirectional events) |
| **UI Library** | Radix UI (Dialog, Dropdown, Tabs, Toast, Switch, Select, Tooltip) |
| **Notifications** | Slack Webhooks, PagerDuty, GitHub Actions |
| **Deployment** | Docker, Docker Compose, Render |

---

## 🎨 Design System

### Colors

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| **Background** | `#FFFFFF` | `#000000` |
| **Surface** | `rgba(0,0,0,0.02)` | `rgba(255,255,255,0.02)` |
| **Border** | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.05)` |
| **Text** | `#0F172A` | `#C8CDD8` |
| **Muted** | `#64748B` | `#5A6785` |
| **Cyan (brand)** | `#00D4FF` | `#00D4FF` |
| **Cyan Light** | `#006680` | `#006680` |
| **Danger** | `#FF3B5C` | `#FF3B5C` |
| **Warning** | `#FFB020` | `#FFB020` |
| **Success** | `#00E5A0` | `#00E5A0` |

### Typography

- **Headings**: Syne (sans-serif)
- **Body**: Inter (sans-serif)
- **Code**: JetBrains Mono (monospace)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB 7+
- Redis 7+ (optional — falls back to in-memory store)
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
npm run dev       # Starts on port 3001
```
> The app auto-seeds with realistic demo data on first run. If MongoDB is unavailable, it falls back to the in-memory store.

**Frontend:**
```bash
cd frontend
npm install
npm run dev       # Starts on port 3000
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 🎯 5-Minute Interview Demo Flow

Designed for software engineering interviews at top-tier companies.

### Step 1: Dashboard
- Navigate to `/dashboard`
- See live metric cards: Active Incidents, MTTR, Runbooks Active, Actions Today
- Real-time incident feed with WebSocket connection indicator (green pulsing dot)

### Step 2: Trigger a Test Incident
- Click **[Test Webhook]** in the header
- Sends a fake Grafana-style alert to the backend
- Watch the new incident appear *instantly* in the feed via WebSocket
- Toast notification confirms the incident was created

### Step 3: Incident Details
- Click on any incident → view severity badge, source, service, timestamps
- **Execution Timeline** — step-by-step runbook progress with status indicators
- **Situation Report** — click to generate a terminal-style typewriter report

### Step 4: Analytics
- Navigate to `/analytics`
- MTTR trend line chart (30-day rolling)
- Incidents by severity (stacked bar chart)
- Source distribution (pie chart)
- Per-day incident breakdown table

### Step 5: Runbook Builder
- Navigate to `/runbooks`
- Click **[Edit]** on any runbook or **[New Runbook]**
- Drag step types from the left panel onto the React Flow canvas
- Connect nodes, configure steps, save
- Click **[Test Run]** for a dry-run execution

---

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

---

## 📂 Project Structure

```
deadman/
├── frontend/                  # Next.js 14 App Router
│   ├── app/                   # Pages (dashboard, incidents, runbooks, analytics, settings, landing)
│   ├── components/            # React components
│   │   ├── dashboard/         #   MetricCard, IncidentTimeline, MTTRChart
│   │   ├── incidents/         #   IncidentCard, IncidentFeed, SituationReport, StatusBadge
│   │   ├── layout/            #   Header, Sidebar, ThemeToggle
│   │   ├── runbooks/          #   RunbookBuilder, StepNode
│   │   └── ui/                #   Logo, PulseRing, TerminalText, ToastContainer
│   ├── hooks/                 # useIncidents, useToast, useWebSocket
│   └── lib/                   # API client, Socket.io client, TypeScript types
├── backend/                   # Express API server
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   ├── controllers/       # Request/response logic
│   │   ├── services/          # Business logic (GitHub, Incident, Notification, RunbookExecutor, SituationReport)
│   │   ├── models/            # Mongoose models (Incident, Runbook, AuditLog, Operational)
│   │   ├── workers/           # BullMQ background workers
│   │   ├── websocket/         # Socket.io server
│   │   ├── config/            # Config from env vars
│   │   └── db/                # Connection, in-memory store, seed data, migrations
│   └── Dockerfile
├── docker-compose.yml         # Full stack with MongoDB + Redis
└── README.md
```

---

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
| POST | `/api/incidents/:id/situation-report` | Generate AI summary report |

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

### Analytics & Health
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/analytics/mttr` | MTTR data points |
| GET | `/api/analytics/summary` | Dashboard metrics |
| GET | `/api/analytics/incidents-by-day` | Daily breakdown |
| GET | `/api/health` | Service health check |

---

## 🌐 WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `incident:new` | Server → Client | New incident created |
| `incident:updated` | Server → Client | Incident status changed |
| `step:update` | Server → Client | Runbook step progress |
| `monitor:status` | Server → Client | Health check result |
| `incident:subscribe` | Client → Server | Join incident room |
| `dashboard:subscribe` | Client → Server | Join global feed |

---

## 📦 Deployment

### Deploy to Render

1. **Push to GitHub**:
   ```bash
   git push -u origin main
   ```

2. **Backend Web Service** (Docker):
   - Connect your GitHub repo
   - Root Directory: `backend`
   - Runtime: Docker
   - Add env vars: `MONGO_URI`, `PORT=10000`, `NODE_ENV=production`
   - Health check: `/api/health`

3. **Frontend Web Service** (Docker):
   - Connect same repo
   - Root Directory: `frontend`
   - Runtime: Docker
   - Add env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`

4. **MongoDB**: Use [MongoDB Atlas](https://www.mongodb.com/atlas) free tier
5. **Redis** (optional): Use [Redis Cloud](https://redis.com/try-free/) free tier

### Environment Variables

**Backend** (`backend/.env`):
```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/deadman
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:3000
SLACK_WEBHOOK_URL=
GITHUB_TOKEN=
PAGERDUTY_API_KEY=
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

---

## 🧪 Seed Data

The app auto-seeds with realistic demo data when it starts (falls back to in-memory store if no MongoDB):

- **12 realistic incident scenarios** — CPU spikes, DB pool exhaustion, SSL expiry, memory leaks, DNS failures, etc.
- **4 runbook templates** — High CPU Auto-Remediation, Database Connection Recovery, Service Health Check & Restart, SSL Certificate Renewal
- **18 extra resolved incidents** — For analytics charts (30-day spread)
- **10+ action execution records** — With realistic success/failure distribution
- **5 health check monitors** — With recent check timestamps
- **15 webhook log entries** — From random sources
- **7 settings** — Slack, GitHub, PagerDuty integration configs

---

## 🔐 Key Design Decisions

- **Graceful degradation** — Works with or without MongoDB and Redis (falls back to in-memory store)
- **Dry-run mode** — Safe testing of runbooks before enabling them in production
- **Universal webhook ingestion** — Accepts alerts from any monitoring system
- **Audit trail** — Every runbook step execution is logged in action_executions
- **Code splitting** — Heavy chart/Runbook libraries lazy-loaded via `next/dynamic`

---

## 📄 License

MIT © [H4rshalshah](https://github.com/H4rshalshah)

---

## 🤝 Connect

- **GitHub**: [@H4rshalshah](https://github.com/H4rshalshah)
- **LinkedIn**: [H4rshal](https://www.linkedin.com/in/h4rshal/)
- **Twitter/X**: [@H4rshalshah](https://x.com/H4rshalshah)

---

Built with ❤️ for engineers who keep the internet running.
