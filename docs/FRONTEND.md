# Frontend Reference

React 19 + Vite + React Router v7 + Tailwind CSS. No TypeScript — plain `.jsx`.

## Routes

Defined in `frontend/src/App.jsx`. Every non-public route is wrapped in `ProtectedRoute` (`frontend/src/components/ProtectedRoute.jsx`), which redirects to `/login` if not authenticated, or to `/` if the logged-in user's role isn't in the route's allowed list.

| Path | Component | Roles |
|---|---|---|
| `/` | `pages/Home.jsx` | public |
| `/login` | `pages/Login.jsx` | public |
| `/register` | `pages/Register.jsx` | public |
| `/about` | `pages/About.jsx` | public |
| `/booking` | `pages/PublicBooking.jsx` | public — court availability + **guest booking flow** (pick a slot, pay 5,000 RWF via mobile money, no account needed) |
| `/membership` | `pages/Membership.jsx` | public |
| `/member` | `pages/member/MemberDashboard.jsx` | member |
| `/member/book` | `pages/member/MemberBooking.jsx` | member — the main booking flow, including the "playing with a partner" checkbox |
| `/member/membership` | `pages/member/MemberMembership.jsx` | member |
| `/member/stats` | `pages/member/MemberStats.jsx` | member |
| `/coach` | `pages/coach/CoachDashboard.jsx` | coach |
| `/coach/book` | `pages/coach/CoachBooking.jsx` | coach |
| `/coach/stats` | `pages/coach/CoachStats.jsx` | coach |
| `/ballboy` | `pages/ballboy/BallBoyDashboard.jsx` | ballboy |
| `/ballboy/assignments` | `pages/ballboy/BallBoyAssignments.jsx` | ballboy |
| `/ballboy/courts` | `pages/ballboy/BallBoyDashboard.jsx` (reused) | ballboy |
| `/admin` | `pages/admin/AdminDashboard.jsx` | admin |
| `/admin/bookings` | `pages/admin/AdminBookings.jsx` | admin |
| `/admin/members` | `pages/admin/AdminMembers.jsx` | admin |
| `/admin/coaches` | `pages/admin/AdminCoaches.jsx` (`AdminCoaches` export) | admin |
| `/admin/ballboys` | `pages/admin/AdminCoaches.jsx` (`AdminBallBoys` export) | admin |
| `/admin/analytics` | `pages/admin/AdminAnalytics.jsx` | admin |
| `/admin/predictions` | `pages/admin/Prediction.jsx` | admin — reservation & revenue forecasting |
| `/admin/schedule` | `pages/admin/AdminSchedule.jsx` | admin |
| `/profile` | `pages/Profile.jsx` | member, coach (shared page) |
| `*` | redirects to `/` | — |

`AdminCoaches.jsx` exports **two** components (`AdminCoaches`, `AdminBallBoys`) from one file — both wrap a shared internal `UserManagement` component parameterized by role.

## Shared components (`frontend/src/components/`)

| File | Purpose |
|---|---|
| `CourtTable.jsx` | Fetches `/courts/availability` and renders the hour × court grid. Supports `readOnly` (view-only), `disabled` (no active membership), and an `onSelect` callback for picking a slot. Used by the public booking page, member/coach booking pages. |
| `DashboardLayout.jsx` | Shared layout (`Navbar` + `Sidebar` + content area) for every authenticated dashboard page. |
| `Navbar.jsx` | Top nav bar. Also defines and renders the notification bell (polls `/notifications/my` every 15s, unread badge, dropdown, mark-as-read on click). |
| `Sidebar.jsx` | Role-based nav links (different link sets for member/coach/ballboy/admin), shows the user's avatar initial/name/role, logout button. |
| `ProtectedRoute.jsx` | Route guard — see [Routes](#routes) above. |
| `ImageSlider.jsx` | Auto-rotating hero banner on the public Home page. |

## State & API layer

- **`frontend/src/context/AuthContext.jsx`** — `AuthProvider` / `useAuth()`. Holds the current `user` (persisted to `localStorage`), exposes `login`, `register`, `logout`.
- **`frontend/src/api/axios.js`** — a single shared axios instance, `baseURL: 'http://localhost:5000/api'` (hardcoded, not environment-driven). Request interceptor attaches the JWT from `localStorage`; response interceptor clears storage and redirects to `/login` on a 401.

No global state library (Redux/Zustand/etc.) — each page fetches its own data via `api.get(...)` in a `useEffect`, following the same pattern throughout.

## Conventions used throughout the pages

- Every dashboard page is wrapped in `<DashboardLayout>`.
- Tailwind utility classes plus a few custom classes (`.card`, `.btn-primary`, `.btn-outline`, `.input`) for consistent styling.
- Charts use `recharts` with a shared color palette `['#1a5276', '#2980b9', '#f39c12', '#27ae60', '#9b59b6', '#e74c3c']` (see `AdminAnalytics.jsx`, `Prediction.jsx`).
- Toasts (`react-hot-toast`) for success/error feedback on form submissions.
- Polling (`setInterval` in a `useEffect`) is the pattern used for anything needing near-live updates: notification bell (15s), guest/membership payment status while awaiting a mobile-money confirmation (5s, up to 2 minutes).
