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

## Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)

## Setup

1. **Install dependencies** (run in both folders):
   ```
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Create the database** in PostgreSQL, then apply the schema. There is no single schema file — the live schema is built up from the migration files in `backend/migrations/`, applied in numeric order:
   ```
   001_guest_bookings.sql
   002_partner_notifications.sql
   003_predictions.sql
   ```
   (Run each against your new database, e.g. via `psql -f backend/migrations/001_guest_bookings.sql`, or through pgAdmin's query tool.) A base schema — `users`, `courts`, `bookings`, `memberships`, `payments`, `ball_boy_assignments` and their enum types — must exist before the migrations are applied; see `docs/DATABASE.md` for the full table definitions to recreate it if starting from scratch.

3. **Configure environment variables** — copy `backend/.env` (see [Environment variables](#environment-variables) below) and fill in your local database credentials at minimum.

## Running

**Development (two terminals):**
```
cd backend && npm run dev     # http://localhost:5000
cd frontend && npm run dev    # http://localhost:5173
```

**Via PM2 (recommended — auto-restarts on crash):**
```
pm2 start ecosystem.config.js
pm2 save
```
`ecosystem.config.js` runs the backend directly (`node src/server.js`) and the frontend via Vite's dev server (`node_modules/vite/bin/vite.js`) — this is a development setup, not a production build. For a real production deployment, run `npm run build` in `frontend/` and serve the resulting static files instead.

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

The frontend has no `.env` — its API base URL is hardcoded to `http://localhost:5000/api` in `frontend/src/api/axios.js`.

## Default accounts

An admin account is seeded via the migration/backup: `ericnd8@gmail.com`. All other seeded demo accounts (coaches, ball boys, members) use the password `1234er`.
