# Ebenezer Special Home — Backend

Express + TypeScript + Prisma (PostgreSQL) API for the lodging management system.

## Setup

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL, JWT_SECRET, etc.
npx prisma migrate dev --name init
npm run seed               # creates the first admin account from .env
npm run dev                 # starts on http://localhost:4000
```

## Auth model

- `POST /api/auth/login` returns `{ token, user: { role, ... } }`. The frontend
  reads `user.role` to route to the admin or worker view — there's no separate
  admin login screen.
- Every other route requires `Authorization: Bearer <token>`.
- Only ADMIN can hit `/api/users` (create/list/delete worker accounts).

## Roles & permissions

| Action                          | Admin | Worker                    |
|----------------------------------|-------|----------------------------|
| Create booking / expense entry   | ✅    | ✅                          |
| View / check out bookings        | ✅ all | ✅ all (any worker can check out any booking, for cross-shift handoff) |
| View expense entries             | ✅ all | ✅ only their own          |
| Edit / delete entries            | ✅    | ❌                          |
| Manage rooms                     | ✅    | ❌                          |
| Manage worker accounts           | ✅    | ❌                          |
| Daily summary / dashboard        | ✅    | ❌                          |

## Endpoints

- `POST /api/auth/login`
- `GET/POST /api/users`, `DELETE /api/users/:id` (admin only)
- `GET/POST /api/rooms`, `PUT /api/rooms/:id` (edit = admin only)
- `GET/POST /api/bookings`, `GET /api/bookings/overdue`, `POST /api/bookings/:id/checkout`,
  `PUT/DELETE /api/bookings/:id` (edit/delete = admin only)
- `GET/POST /api/expenses`, `GET /api/expenses/:id`, `PUT/DELETE /api/expenses/:id` (edit/delete = admin only)
- `GET /api/dashboard/summary?date=YYYY-MM-DD` (admin only) — today's bookings,
  room occupancy, overdue guests, and expenses/income totals

## Testing

`npm test` runs the integration test suite (Vitest + Supertest) against
whatever database `DATABASE_URL` points at — there is no separate test
database. Every test file calls `resetDb()` in a `beforeEach`, which deletes
**all rows** from `payments`, `bookings`, `guests`, `rooms`, `expenses`, and
`users` before each test runs.

**Never point `DATABASE_URL` at a database containing real data when running
`npm test`.** `resetDb()` refuses to run unless the URL contains `localhost`
or `127.0.0.1` as a guard, but that only protects against pointing at an
obviously remote host — it will still happily wipe a local dev database with
real seeded/manual data in it (this has happened once already, during manual
verification). Use a dedicated local database for running tests.

## Data model

`Room` = a physical room (room number, type, price per night, status —
`AVAILABLE` / `OCCUPIED` / `CLEANING`).

`Guest` = the person staying (full name, phone, nationality, ID type/number).

`Booking` = one stay: links a `Guest` to a `Room`, with check-in,
expected/actual checkout, **nights**, booking amount, remarks, and status
(`CHECKED_IN` / `CHECKED_OUT`). This replaces the old paper-register `Client`
row — the "Daily Income" section is now derived from bookings and their
payments instead of being entered directly.

`Payment` = one cash or momo payment applied to a `Booking` (a booking can
have both a cash and a momo payment, e.g. a split payment).

`Expense` = one row from the "Daily Expenses" section (date, item,
description, cash, momo, total, remarks).

Bookings and expenses are both tied to the worker (`createdBy`) who logged
them.
