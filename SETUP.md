# Tennis Court Reservation & Analytics System — Setup Guide

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS + Recharts + Flutterwave
- **Backend**: Node.js + Express + JWT
- **Database**: MySQL

---

## 1. Database Setup

1. Open MySQL (XAMPP, MySQL Workbench, or command line)
2. Run the SQL schema:
   ```
   mysql -u root -p < database/schema.sql
   ```
   Or paste the contents of `database/schema.sql` directly into MySQL Workbench.

3. This creates:
   - `tennis_system` database
   - All tables (users, courts, bookings, memberships, payments, ball_boy_assignments)
   - 6 courts (Court 1 – Court 6)
   - Default admin account

---

## 2. Backend Configuration

Edit `backend/.env`:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=        ← your MySQL password (leave blank if none)
DB_NAME=tennis_system
JWT_SECRET=tennis_secret_key_2024_secure
FRONTEND_URL=http://localhost:5173
```

---

## 3. Flutterwave Payment Setup

1. Go to https://dashboard.flutterwave.com and create a free account
2. Navigate to **Settings → API** and copy your **Test Public Key**
3. Open `frontend/src/pages/member/MemberMembership.jsx`
4. Replace this line:
   ```js
   const FLW_PUBLIC_KEY = 'FLWPUBK_TEST-SANDBOXDEMOKEY-X';
   ```
   With your actual test key:
   ```js
   const FLW_PUBLIC_KEY = 'FLWPUBK_TEST-xxxxxxxxxxxxxxxx-X';
   ```

### Flutterwave Test Card (Sandbox)
| Field    | Value              |
|----------|--------------------|
| Card No  | 5531 8866 5214 2950|
| CVV      | 564                |
| Expiry   | 09/32              |
| PIN      | 3310               |
| OTP      | 12345              |

---

## 4. Start the Application

### Option A: Double-click `start.bat`
This starts both backend and frontend automatically.

### Option B: Manual start
Open two terminal windows:

**Terminal 1 – Backend:**
```
cd backend
npm run dev
```

**Terminal 2 – Frontend:**
```
cd frontend
npm run dev
```

Then open: **http://localhost:5173**

---

## 5. Test Accounts

| Role          | Email                    | Password   |
|---------------|--------------------------|------------|
| Administrator | admin@tennis.com         | Admin@123  |
| Member        | Register via /register   | —          |
| Coach         | Add via Admin → Coaches  | Tennis@123 |
| Ball Boy      | Add via Admin → Ball Boys| Tennis@123 |

---

## 6. System Features by Role

### Member
- Register and login
- Pay membership via Flutterwave (Monthly/Half-Yearly/Yearly)
- View membership card on dashboard
- Book courts (requires active membership)
- Cancel bookings
- View statistics and charts

### Coach
- Login (added by admin)
- Book courts without membership requirement
- View session history and statistics

### Ball Boy
- Login (added by admin)
- View court availability
- View assigned bookings

### Administrator
- Full booking management
- Assign ball boys to bookings
- Add/delete coaches and ball boys
- View member accounts and their bookings
- Analytics dashboard with charts
- View club schedule

---

## 7. Membership Prices

| Plan         | Price (RWF) | Duration    |
|--------------|-------------|-------------|
| Monthly      | 30,000      | 30 days     |
| Half-Yearly  | 75,000      | 6 months    |
| Yearly       | 150,000     | 1 year      |

---

## 8. Court Availability Logic

- 6 courts shown in a table grid (hours 06:00 – 21:00)
- **Green "Book"** = available slot
- **Red "Booked"** = already reserved
- **"—"** = past time slot
- Members must have active membership to book
- Admin and coaches can book freely
