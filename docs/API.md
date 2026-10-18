# API Reference

Base URL: `http://localhost:5000/api` (hardcoded in the frontend's `axios.js`).

**Auth**: unless noted "no auth", every endpoint requires an `Authorization: Bearer <token>` header. Tokens are issued by `/auth/login` or `/auth/register` and carry `{id, email, role, name}`. `checkRole('admin')` etc. restricts an endpoint to specific roles (see `backend/src/middleware/auth.js`).

---

## Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | none | Create a member/coach/ballboy account. Sends a welcome email (non-blocking). Returns `{token, user}`. |
| POST | `/login` | none | Verify email/password. Returns `{token, user}`. |
| POST | `/forgot-password` | none | Body `{email}`. Rate-limited; returns a generic response and emails a 30-minute reset link for matching accounts using configured SMTP. |
| POST | `/reset-password` | none | Body `{token, new_password}`. Rate-limited; consumes a single-use reset link and updates the password. |
| GET | `/me` | required | Current user's profile. |
| PUT | `/profile` | required | Update `name`/`phone`; returns a freshly-signed token. |
| PUT | `/password` | required | Change password (verifies current password first, min 6 chars for the new one). |

## Courts — `/api/courts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | none | List all courts. |
| GET | `/availability?date=YYYY-MM-DD` | none | Hour-by-hour (06:00–21:00) × court grid for a date, each cell marked `available`/`booked`/`past`. Powers `CourtTable.jsx`. |

## Bookings — `/api/bookings`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | required | Create a booking. Body: `{court_id, date, start_time, end_time, target_user_id?, with_partner?}`. Rejects past slots and double-bookings; enforces member (active membership required, ≤2 hours, 1 concurrent court) and coach (≤2 concurrent courts) rules. If a **member books alone** (`with_partner` false/omitted), a coach is auto-matched and both are notified — response includes `coach: {id, name} | null`. |
| GET | `/my` | required | Bookings where the caller is the member or the assigned coach. |
| PUT | `/:id/cancel` | required | Cancel a booking (members can only cancel their own); sends a cancellation email. |
| GET | `/all?date_from&date_to&search&status` | admin | All bookings, filterable. |

## Memberships — `/api/memberships`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/my` | required | Caller's current/latest membership. |
| POST | `/activate` | member | Directly activates a membership (used by the demo payment path) — expires any current active membership, inserts the new one + a successful payment row, sends an email. Prices: monthly 30,000 / half-yearly 75,000 / yearly 150,000 RWF; durations 30/182/365 days. |
| GET | `/stats` | admin | Active membership count, breakdown by type, total revenue. |

## Payments — `/api/payments`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/initiate` | member | Starts a mobile-money membership payment. If Africa's Talking isn't configured, activates the membership immediately ("demo mode"); otherwise returns a pending transaction awaiting the webhook. |
| POST | `/callback` | none (AT webhook) | Africa's Talking payment-status callback. On success, confirms whichever pending transaction (membership purchase or guest booking) matches the `transactionId`. |
| GET | `/status/:transactionId` | required | Frontend polling endpoint for a pending membership payment. |
| POST | `/guest-initiate` | none | Starts a guest court payment (flat 5,000 RWF). Body: `{court_id, date, start_time, end_time, guest_name, guest_phone}`. Demo mode confirms immediately. |
| GET | `/guest-status/:transactionId` | none | Frontend polling endpoint for a pending guest booking payment. |

## Admin — `/api/admin`

All routes require `admin` role.

| Method | Path | Description |
|---|---|---|
| GET | `/members` | List members (supports `search`, `membership_status` filters). |
| GET | `/members/:id` | One member's profile + latest membership + full booking history. |
| GET | `/coaches` | List coaches. |
| GET | `/ballboys` | List ball boys. |
| POST | `/users` | Create a coach/ballboy/member account (admin-created; default password `Tennis@123` if none given). |
| DELETE | `/users/:id` | Delete a user (admins cannot be deleted). |
| POST | `/assign-ballboy` | Manually assign a ball boy to a confirmed booking (replaces any prior assignment for that pair). |
| GET | `/analytics?date_from&date_to` | Dashboard stats: bookings, members, revenue (membership + guest breakdown), court usage, recent activity. |

## Ball boy — `/api/ballboy`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/assignments` | ballboy | The caller's assignments, joined with booking/court/member info. |

## Notifications — `/api/notifications`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/my` | required | Last 30 notifications for the caller + unread count. Polled every 15s by the navbar bell. |
| PUT | `/:id/read` | required | Mark one notification as read. |

## Predictions — `/api/predictions`

All routes require `admin` role. Powers the "Reservation Forecast" admin page.

| Method | Path | Description |
|---|---|---|
| GET | `/` | Returns persisted `prediction_models` + a summary: predicted bookings tomorrow/next 7/14 days, peak hour, trending court, and live-computed predicted revenue for the same horizons. Auto-trains if no model exists yet. |
| POST | `/train` | Body: `{metric?, horizon?}`. Retrains one metric (`daily`/`weekly`/`monthly`/`peak_hours`/`court_utilization`) with an optional custom horizon, or all metrics with defaults if no body given. Persists the result and returns the refreshed summary (same shape as `GET /`). |
| GET | `/forecast?metric&horizon&court_id&hour&type` | **Live** (not cached) forecast for one metric. `type` is `bookings` (default) or `revenue`. `court_id`/`hour` narrow the underlying data (e.g. one court's daily trend, or revenue at a specific hour). Returns `{metric, type, historical, predicted, filters}`. |
| GET | `/point?metric&date\|month&court_id&hour&type` | Predicted value at one exact date (daily) or month (monthly) — powers the "show peak on graph" marker. |

### How the forecasting works

`backend/src/services/linearRegression.js` implements ordinary least squares from scratch (no ML library). `predictionService.js` aggregates historical `bookings`/`payments` data (optionally filtered by court/hour, optionally as revenue instead of counts), fits a regression, and projects forward. `peak_hours` and `court_utilization` fit one regression per hour-of-day / per-court bucket and rank the results. Trained snapshots are persisted to `prediction_models`/`prediction_forecasts` (used by the KPI summary cards); the interactive chart/table on the admin page always recomputes live so filters apply instantly without a retrain step.

## Background jobs

`backend/src/services/reminderScheduler.js` runs every minute (`node-cron`). It finds confirmed bookings with `with_partner=true` starting within the next 15 minutes that have no ball boy yet, auto-assigns the most-idle available ball boy, creates a notification, and sends an SMS reminder.
