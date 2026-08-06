# Ebenezer Special Home — Frontend

React + TypeScript + Vite + Tailwind v4. Matches the FinanceApp reference
layout: cream background, white cards, black buttons, green/red money accents.

## Setup

```bash
npm install
cp .env.example .env      # point VITE_API_URL at your running backend
npm run dev                 # http://localhost:5173
```

Requires the backend running (see ebenezer-backend/README.md) with at least
one seeded admin account to log in with.

## Structure

```
src/
  api/          axios calls per resource (auth, users, clients, expenses, dashboard)
  components/   Navbar, Badge, StatCard, ProtectedRoute, FormField
  context/      AuthContext — holds the logged-in user + token in localStorage
  pages/        Login, Dashboard, Clients/ClientForm, Expenses/ExpenseForm, Users/AddUser
  types/        shared TS types mirroring the backend models
  lib/format.ts money/date formatting helpers
```

## Role behavior

- Login doesn't ask "admin or worker" — the JWT's role decides where you land
  (`/dashboard` for admin, `/clients` for worker) and which nav links show.
- Workers can create client/expense entries and view only their own; no
  edit/delete buttons render for them (and the backend rejects those calls
  even if attempted directly).
- Admin-only pages (`/dashboard`, `/users`, `/users/new`) redirect non-admins
  to `/clients`.

## Currency

Amounts are formatted as `RWF 12,000` in `src/lib/format.ts` — change the
`formatMoney` function there if you'd rather use a different currency label.
