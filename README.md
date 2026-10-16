# Tennis Court Booking System

A full-stack court reservation platform for a tennis club: members, coaches, ball boys, and admins each get a role-specific dashboard, court bookings are conflict-checked in real time, and the system automatically matches solo players with a coach, schedules ball-boy reminders for partner sessions, and forecasts future demand and revenue using linear regression.

## Features

- **Role-based accounts** — member, coach, ball boy, admin, each with their own dashboard and permissions.
- **Court booking** — hourly slot grid (06:00–21:00, 6 courts), conflict prevention, member/coach booking-limit rules.
- **Guest checkout** — non-members can book and pay per session (5,000 RWF) via mobile money, no account required.
- **Memberships** — monthly / half-yearly / yearly plans, paid via mobile money (Africa's Talking), auto-renewal-aware pricing.
- **Auto coach matching** — a member booking alone is automatically paired with an available coach; both get notified.
- **Auto ball-boy assignment** — a member booking "with a partner" gets a ball boy auto-assigned and reminded 15 minutes before the session (background cron job).
- **In-app notifications** — bell icon with unread count, polled live.
- **Admin analytics** — revenue, court usage, membership breakdown, recent activity.
- **Reservation & revenue forecasting** — a from-scratch linear regression engine predicts daily/weekly/monthly booking volume, peak hours, court utilization trends, and revenue, with admin-configurable date/hour/court filters and forecast horizon.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router v7, Tailwind CSS, Recharts, Axios, react-hot-toast |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Payments / SMS | Africa's Talking (mobile money + SMS), with a "demo mode" fallback when unconfigured |
| Email | Nodemailer (falls back to an auto-created Ethereal test inbox in development) |
| Scheduling | node-cron (ball-boy reminder job) |
| Process management | PM2 (see `ecosystem.config.js`) |

## Project structure

```
tennis-system/
├── backend/
│   ├── src/
│   │   ├── server.js            # Express app entry point, route mounting
│   │   ├── config/db.js         # PostgreSQL pool (pg) with mysql2-style ? placeholders
│   │   ├── routes/              # One file per resource, see docs/API.md
│   │   ├── controllers/         # Route handlers
│   │   ├── services/            # Reusable business logic (email, SMS, payments,
│   │   │                        # regression/prediction, notifications, cron)
│   │   └── middleware/auth.js   # JWT auth + role-check middleware
│   ├── migrations/              # SQL migrations, applied in order (001, 002, 003...)
│   ├── backups/                 # pg_dump snapshots
│   └── .env                     # Backend configuration (see below)
├── frontend/
│   └── src/
│       ├── pages/                # public/, member/, coach/, ballboy/, admin/
│       ├── components/           # Navbar, Sidebar, CourtTable, ProtectedRoute, ...
│       ├── context/AuthContext.jsx
│       └── api/axios.js          # Shared API client
├── docs/                        # Detailed documentation (see below)
└── ecosystem.config.js          # PM2 config for running both apps
```

## Documentation

- [`docs/DATABASE.md`](docs/DATABASE.md) — full schema: tables, columns, enums, relationships, migration history.
- [`docs/API.md`](docs/API.md) — every backend endpoint, grouped by resource, with auth requirements and behavior.
- [`docs/FRONTEND.md`](docs/FRONTEND.md) — every route, which role can access it, and the shared component/context layer.
- [`RENDER.md`](RENDER.md) — deploy the app from GitHub to Render.

## Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)

## Setup

1. **Install dependencies** from the repository root:
   ```
   npm ci
   npm ci --prefix backend
   ```

2. **Create a PostgreSQL database** and configure `backend/.env` with its connection settings. Running `npm start --prefix backend` creates the base schema from `database/schema.sql` and applies numbered migrations automatically. For local development, the Vite server proxies `/api` calls to `http://localhost:5000`.

3. **Configure environment variables** — `JWT_SECRET` and `DB_PASSWORD` are required. `FRONTEND_URL` can be set to your frontend origin when hosting the frontend separately; the Render Blueprint serves the frontend and API on one origin.

## Running

**Development (two terminals from the repository root):**
```
npm run dev                    # http://localhost:5173
npm run dev --prefix backend  # http://localhost:5000
```

For an online deployment, follow [`RENDER.md`](RENDER.md).

## Environment variables

Set in `backend/.env`:

| Variable | Purpose |
|---|---|
| `PORT` | Backend server port (default 5000) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | PostgreSQL connection |
| `JWT_SECRET` | Secret for signing/verifying login tokens |
| `FRONTEND_URL` | Allowed CORS origin |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` | SMTP config; if `EMAIL_HOST` is blank, emails go to an auto-created Ethereal test inbox (link printed to console) instead of being sent for real |
| `AT_USERNAME`, `AT_API_KEY`, `AT_PRODUCT_NAME` | Africa's Talking mobile money + SMS; if `AT_API_KEY` is unset/placeholder, payments and SMS run in "demo mode" (instant success, logged to console) instead of hitting the real API |

The frontend uses `/api` by default, which works for Render's single-origin deployment. To point it at a separate API host, set `VITE_API_URL` during the frontend build.

## First administrator login

On a fresh database, `database/schema.sql` seeds `ericnd8@gmail.com` with the initial password `123456e`. Change it after the first login.
