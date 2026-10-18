# Database Schema

PostgreSQL. There is no single `schema.sql` in this repo — the live schema is the result of a base schema (users/courts/bookings/memberships/payments/ball_boy_assignments + their enum types) plus the migrations in `backend/migrations/`, applied in order. This document reflects the **current, live schema** (verified against a `pg_dump` snapshot).

## Migration history

| File | Adds |
|---|---|
| `001_guest_bookings.sql` | Makes `bookings.user_id` and `payments.user_id` nullable (guest checkout); adds `bookings.guest_name`, `bookings.guest_phone`; adds `'guest'` to the `booked_by_role` enum; adds `payments.booking_id` |
| `002_partner_notifications.sql` | Adds `bookings.with_partner` (boolean); creates the `notifications` table |
| `003_predictions.sql` | Creates `prediction_models` and `prediction_forecasts` tables + an index |
| `008_password_reset_tokens.sql` | Creates the hashed, expiring, single-use `password_reset_tokens` table |

## Enum types

| Enum | Values |
|---|---|
| `user_role` | `member`, `coach`, `ballboy`, `admin` |
| `court_status` | `available`, `maintenance` |
| `membership_type` | `monthly`, `half_yearly`, `yearly` |
| `membership_status` | `active`, `expired`, `pending` |
| `booking_status` | `confirmed`, `cancelled` |
| `booked_by_role` | `member`, `coach`, `admin`, `guest` |
| `payment_status` | `pending`, `successful`, `failed` |

## Tables

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | serial | PK |
| `name` | varchar(100) | not null |
| `email` | varchar(100) | not null, unique |
| `password` | varchar(255) | not null (bcrypt hash) |
| `role` | user_role | default `member` |
| `phone` | varchar(20) | |
| `avatar` | varchar(255) | |
| `created_at` | timestamp | default now |

### `password_reset_tokens`
| Column | Type | Notes |
|---|---|---|
| `id` | serial | PK |
| `user_id` | integer | FK to `users(id)` with cascade delete |
| `token_hash` | char(64) | unique SHA-256 digest; raw token is sent only by email |
| `expires_at` | timestamptz | 30 minutes after issuance |
| `used_at` | timestamptz | null until successful reset |
| `created_at` | timestamptz | default now |

### `courts`
| Column | Type | Notes |
|---|---|---|
| `id` | serial | PK |
| `name` | varchar(50) | not null, unique |
| `status` | court_status | default `available` |

### `bookings`
| Column | Type | Notes |
|---|---|---|
| `id` | serial | PK |
| `court_id` | integer | not null, FK → `courts(id)` |
| `user_id` | integer | **nullable** (null for guest bookings), FK → `users(id)` ON DELETE CASCADE |
| `coach_id` | integer | FK → `users(id)` ON DELETE SET NULL — the coach playing in/assigned to this session |
| `date` | date | not null |
| `start_time` | time | not null |
| `end_time` | time | not null |
| `status` | booking_status | default `confirmed` |
| `booked_by` | booked_by_role | default `member` — who initiated the booking |
| `created_at` | timestamp | default now |
| `guest_name` | varchar(255) | set only for guest bookings |
| `guest_phone` | varchar(20) | set only for guest bookings |
| `with_partner` | boolean | not null, default false — true if the member is bringing their own partner (triggers ball-boy auto-assignment instead of coach matching) |

### `memberships`
| Column | Type | Notes |
|---|---|---|
| `id` | serial | PK |
| `user_id` | integer | not null, FK → `users(id)` ON DELETE CASCADE |
| `type` | membership_type | not null |
| `amount` | numeric(10,2) | not null |
| `start_date` | date | not null |
| `end_date` | date | not null |
| `status` | membership_status | default `pending` |
| `payment_reference` | varchar(150) | |
| `created_at` | timestamp | default now |

### `payments`
| Column | Type | Notes |
|---|---|---|
| `id` | serial | PK |
| `user_id` | integer | **nullable** (null for guest payments), FK → `users(id)` ON DELETE CASCADE |
| `membership_id` | integer | FK → `memberships(id)` ON DELETE SET NULL |
| `amount` | numeric(10,2) | not null |
| `reference` | varchar(150) | payment gateway transaction reference |
| `status` | payment_status | default `pending` |
| `created_at` | timestamp | default now |
| `booking_id` | integer | FK → `bookings(id)` — set for guest-booking payments, null for membership payments |

A payment row is tied to **either** a `membership_id` (membership purchase) **or** a `booking_id` (guest court payment), never both.

### `ball_boy_assignments`
| Column | Type | Notes |
|---|---|---|
| `id` | serial | PK |
| `ball_boy_id` | integer | not null, FK → `users(id)` ON DELETE CASCADE |
| `booking_id` | integer | not null, FK → `bookings(id)` ON DELETE CASCADE |
| `assigned_at` | timestamp | default now |

Unique constraint on (`ball_boy_id`, `booking_id`).

### `notifications`
| Column | Type | Notes |
|---|---|---|
| `id` | serial | PK |
| `user_id` | integer | not null, FK → `users(id)` ON DELETE CASCADE — the recipient |
| `type` | varchar(30) | e.g. `coach_assigned`, `member_matched`, `ballboy_reminder` |
| `message` | text | not null |
| `booking_id` | integer | FK → `bookings(id)` ON DELETE CASCADE |
| `is_read` | boolean | not null, default false |
| `created_at` | timestamp | default now |

### `prediction_models`
Stores the latest trained linear-regression snapshot per metric (used for the admin dashboard's KPI cards).

| Column | Type | Notes |
|---|---|---|
| `id` | serial | PK |
| `metric` | varchar(30) | unique — `daily`, `weekly`, `monthly`, `peak_hours`, or `court_utilization` |
| `slope` | double precision | regression slope (null for multi-model metrics) |
| `intercept` | double precision | regression intercept |
| `r_squared` | double precision | goodness of fit |
| `sample_size` | integer | number of data points the model was trained on |
| `extra` | jsonb | for `peak_hours`/`court_utilization`: an array of per-hour or per-court sub-models |
| `trained_at` | timestamp | default now |

### `prediction_forecasts`
The generated forecast rows for each trained metric.

| Column | Type | Notes |
|---|---|---|
| `id` | serial | PK |
| `metric` | varchar(30) | indexed |
| `period_label` | varchar(50) | e.g. `2026-08-15`, `2026-W30`, `2026-08`, `Court 3`, `14:00` |
| `period_date` | date | nullable — set for date-based metrics, null for court/hour rankings |
| `predicted_value` | double precision | not null |
| `created_at` | timestamp | default now |

## Relationships at a glance

```
users ─┬─< bookings (user_id — the member/guest, nullable)
       ├─< bookings (coach_id — assigned coach, nullable)
       ├─< memberships
       ├─< payments (user_id, nullable)
       ├─< ball_boy_assignments (ball_boy_id)
       └─< notifications

courts ─< bookings

bookings ─┬─< payments (booking_id — guest payments only)
          ├─< ball_boy_assignments (booking_id)
          └─< notifications (booking_id)

memberships ─< payments (membership_id — membership payments only)
```
