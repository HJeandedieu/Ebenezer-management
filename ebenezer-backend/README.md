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
| Create client / expense entry    | ✅    | ✅                          |
| View client / expense entries    | ✅ all | ✅ only their own          |
| Edit / delete entries            | ✅    | ❌                          |
| Manage worker accounts           | ✅    | ❌                          |
| Daily summary / dashboard        | ✅    | ❌                          |

## Endpoints

- `POST /api/auth/login`
- `GET/POST /api/users`, `DELETE /api/users/:id` (admin only)
- `GET/POST /api/clients`, `GET /api/clients/:id`, `PUT/DELETE /api/clients/:id` (edit/delete = admin only)
- `GET/POST /api/expenses`, `GET /api/expenses/:id`, `PUT/DELETE /api/expenses/:id` (edit/delete = admin only)
- `GET /api/dashboard/summary?date=YYYY-MM-DD` (admin only) — clients + expenses for that day, plus income/expense totals

## Data model

`Client` = one digitized row from the "Daily Income" section of the paper
register (date, room no, guest name, check-in, check-out, **nights**, cash,
momo, total, remarks).

`Expense` = one row from the "Daily Expenses" section (date, item,
description, cash, momo, total, remarks).

Both are tied to the worker (`createdBy`) who logged them.
