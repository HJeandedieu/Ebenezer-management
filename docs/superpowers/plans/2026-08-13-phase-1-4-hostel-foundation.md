# Phase 1–4 Hostel Foundation (Rooms, Bookings, Check-in/out, Overdue) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat `Client` model with a real `Guest → Booking → Room` domain model, build the room-management engine, turn check-in/checkout into explicit operations, and make overdue-checkout detection automatic — the four "Critical" items at the top of the Improvements.md roadmap table.

**Architecture:** Evolve the existing Express + Prisma (PostgreSQL) backend by replacing the `Client` table with `Room`, `Guest`, `Booking`, and `Payment` tables (plus `RoomStatus`/`BookingStatus`/`PaymentMethod` enums). Checkout timing state (`IN_HOUSE` / `OVERDUE` / `ON_TIME` / `LATE`) is computed on read from `expectedCheckOut`/`actualCheckOut`, never stored, so it's always correct without a cron job. The React frontend gets a `Rooms` board (reception "what's free" view), a `BookingForm` (check-in workflow), a `Bookings` list (with a Checkout action), and an updated `Dashboard` with occupancy + overdue visibility, replacing the `Clients`/`ClientForm` pages.

**Tech Stack:** TypeScript, Express, Prisma 5 (PostgreSQL), Zod, JWT auth (existing) · React 19, Vite, React Router 7, Axios, Tailwind v4 (existing) · Vitest + Supertest (new, backend only).

**Spec:** `Improvements.md` (repo root), sections 1–4 ("fix the core domain model", "room-management engine", "reservation/check-in workflow", "overdue-checkout system"), and roadmap table Phases 1–4 ("Room management", "Booking/stay lifecycle", "Check-in/check-out", "Overdue checkout detection").

**Out of scope for this plan** (later roadmap phases — don't build these here): manager `Alert` entity (Phase 5), payment balance/PAID-PARTIAL-UNPAID status (Phase 6), financial/occupancy reporting engine (Phases 7–10), reservations calendar (Phase 9), stay extensions (doc §12), audit log (Phase 11/§15), PDF/Excel export (Phase 12). `bookingAmount` and `amountPaid` are tracked so those phases have data to build on, but no balance/PAID-status logic is added now.

## Global Constraints

- Follow existing backend conventions exactly: Zod schema in the controller, domain errors via `AppError` (from `src/middleware/error.middleware.ts`), `requireAuth` on every route, `requireRole("ADMIN")` for admin-only mutations, a single shared `prisma` instance from `src/config/db.ts`, money fields as `Decimal @db.Decimal(10, 2)` in the schema and plain `number` in service/controller code.
- Role rule carried over unchanged from the old `Client` model: **workers can create and view their own entries; only ADMIN can edit/delete.** Checkout is an operational action available to whoever can view the booking (worker on their own bookings, admin on any).
- Checkout timing state (`IN_HOUSE`/`OVERDUE`/`ON_TIME`/`LATE`) and `amountPaid` are **computed on every read**, never persisted — this is what makes overdue detection automatic (Improvements.md §4) instead of a manual/cron-driven check.
- `nights` and `bookingAmount` are always **server-computed** from `checkIn`/`expectedCheckOut`/`room.pricePerNight` — never trust a client-supplied value for these (Improvements.md §3: "System calculates nights… System calculates expected amount").
- Backend integration tests call a `resetDb()` helper that **deletes all rows** from `payments`, `bookings`, `guests`, `rooms`, `expenses`, `users` before each test. Only ever run `npm test` against the local dev database (`ebenezer-backend/.env` → `DATABASE_URL`), never one holding real guest/financial data.
- Frontend has no existing test framework (no Vitest/RTL config in `ebenezer-frontend`); this plan does not introduce one. Frontend tasks are verified with `npx tsc -b` (typecheck), `npm run lint` (oxlint), and a manual walkthrough against the running dev server — call this out explicitly in each frontend task rather than treating it as an automated test.
- Keep files split by responsibility the way the codebase already does: one service + one controller + one routes file per resource (mirrors `client.service.ts` / `client.controller.ts` / `client.routes.ts` today).

---

## File Structure

**Backend (`ebenezer-backend/`) — new:**
- `vitest.config.ts`, `tests/setup.ts`, `tests/helpers.ts` — test harness + shared fixtures
- `src/utils/booking.util.ts` (+ `.test.ts`) — pure nights/amount/checkout-status calculations
- `src/services/room.service.ts`, `src/controllers/room.controller.ts`, `src/routes/room.routes.ts` (+ `tests/room.integration.test.ts`)
- `src/services/booking.service.ts`, `src/controllers/booking.controller.ts`, `src/routes/booking.routes.ts` (+ `tests/booking.integration.test.ts`)
- `tests/dashboard.integration.test.ts`

**Backend — modified:**
- `prisma/schema.prisma` — remove `Client`, add `Room`/`Guest`/`Booking`/`Payment` + enums
- `prisma/seed.ts` — seed 5 sample rooms alongside the admin account
- `src/app.ts` — mount `room.routes`/`booking.routes`, remove `client.routes`
- `src/services/dashboard.service.ts` — bookings/occupancy/overdue instead of clients
- `package.json` — add `vitest`, `supertest`, `test` script

**Backend — deleted:** `src/services/client.service.ts`, `src/controllers/client.controller.ts`, `src/routes/client.routes.ts`

**Frontend (`ebenezer-frontend/`) — new:**
- `src/api/rooms.ts`, `src/api/bookings.ts`
- `src/pages/Rooms.tsx` — reception room board
- `src/pages/BookingForm.tsx` — check-in form
- `src/pages/Bookings.tsx` — bookings list + Checkout action

**Frontend — modified:** `src/types/index.ts`, `src/App.tsx`, `src/components/Navbar.tsx`, `src/pages/Dashboard.tsx`

**Frontend — deleted:** `src/api/clients.ts`, `src/pages/Clients.tsx`, `src/pages/ClientForm.tsx`

---

### Task 1: Backend test harness (Vitest)

**Files:**
- Modify: `ebenezer-backend/package.json`
- Create: `ebenezer-backend/vitest.config.ts`
- Create: `ebenezer-backend/tests/setup.ts`
- Create: `ebenezer-backend/tests/smoke.test.ts`

**Interfaces:**
- Produces: `npm test` (runs `vitest run`) — every later backend task relies on this existing.

- [ ] **Step 1: Install test dependencies**

Run: `cd ebenezer-backend && npm install -D vitest supertest @types/supertest`

- [ ] **Step 2: Add the `test` script**

Edit `ebenezer-backend/package.json` `scripts`:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "seed": "tsx prisma/seed.ts",
    "test": "vitest run"
  }
}
```

- [ ] **Step 3: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 15000,
    fileParallelism: false,
  },
});
```

`fileParallelism: false` matters once integration tests share one Postgres database and each calls `resetDb()` — parallel files would wipe each other's fixtures mid-test.

- [ ] **Step 4: Write `tests/setup.ts`**

```ts
import "dotenv/config";
```

- [ ] **Step 5: Write a smoke test to confirm the harness runs**

```ts
// tests/smoke.test.ts
import { describe, expect, it } from "vitest";

describe("vitest harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run it**

Run: `npm test`
Expected: 1 test file, 1 test, PASS.

- [ ] **Step 7: Commit**

```bash
git add ebenezer-backend/package.json ebenezer-backend/package-lock.json ebenezer-backend/vitest.config.ts ebenezer-backend/tests/setup.ts ebenezer-backend/tests/smoke.test.ts
git commit -m "test: add vitest harness to backend"
```

---

### Task 2: Prisma schema evolution — Room, Guest, Booking, Payment

**Files:**
- Modify: `ebenezer-backend/prisma/schema.prisma`
- Modify: `ebenezer-backend/prisma/seed.ts`
- Create: migration under `ebenezer-backend/prisma/migrations/` (generated by Prisma CLI)

**Interfaces:**
- Produces: Prisma models `Room { id, roomNumber, type, pricePerNight, status }`, `Guest { id, fullName, phone, nationality, identificationType, identificationNumber }`, `Booking { id, guestId, roomId, checkIn, expectedCheckOut, actualCheckOut, nights, bookingAmount, status, remarks, createdById }`, `Payment { id, bookingId, amount, method, reference, paidAt }`. Enums `RoomStatus`, `BookingStatus`, `PaymentMethod`. These exact field names are used by every later task.

- [ ] **Step 1: Replace the schema**

Replace the full contents of `ebenezer-backend/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  WORKER
}

enum RoomStatus {
  AVAILABLE
  OCCUPIED
  RESERVED
  CLEANING
  MAINTENANCE
}

enum BookingStatus {
  CHECKED_IN
  CHECKED_OUT
  CANCELLED
}

enum PaymentMethod {
  CASH
  MOMO
}

model User {
  id        String   @id @default(uuid())
  fullName  String
  email     String   @unique
  password  String
  role      Role     @default(WORKER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  bookings Booking[]
  expenses Expense[]

  @@map("users")
}

model Room {
  id            String     @id @default(uuid())
  roomNumber    String     @unique
  type          String?
  pricePerNight Decimal    @default(0) @db.Decimal(10, 2)
  status        RoomStatus @default(AVAILABLE)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  bookings Booking[]

  @@map("rooms")
}

model Guest {
  id                   String   @id @default(uuid())
  fullName             String
  phone                String?
  nationality          String?
  identificationType   String?
  identificationNumber String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  bookings Booking[]

  @@map("guests")
}

// One booking = one guest's stay in one room, from check-in to (eventual) checkout.
model Booking {
  id               String        @id @default(uuid())
  guestId          String
  guest            Guest         @relation(fields: [guestId], references: [id])
  roomId           String
  room             Room          @relation(fields: [roomId], references: [id])
  checkIn          DateTime
  expectedCheckOut DateTime
  actualCheckOut   DateTime?
  nights           Int
  bookingAmount    Decimal       @default(0) @db.Decimal(10, 2)
  status           BookingStatus @default(CHECKED_IN)
  remarks          String?

  payments Payment[]

  createdBy   User     @relation(fields: [createdById], references: [id])
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("bookings")
}

// One row per cash/MoMo payment recorded against a booking.
model Payment {
  id        String        @id @default(uuid())
  bookingId String
  booking   Booking       @relation(fields: [bookingId], references: [id])
  amount    Decimal       @db.Decimal(10, 2)
  method    PaymentMethod
  reference String?
  paidAt    DateTime      @default(now())
  createdAt DateTime      @default(now())

  @@map("payments")
}

// One row per digitized "Daily Expenses" entry (supplies, etc.)
model Expense {
  id          String   @id @default(uuid())
  date        DateTime @db.Date
  item        String
  description String?
  amountCash  Decimal  @default(0) @db.Decimal(10, 2)
  amountMomo  Decimal  @default(0) @db.Decimal(10, 2)
  total       Decimal  @default(0) @db.Decimal(10, 2)
  remarks     String?

  createdBy   User     @relation(fields: [createdById], references: [id])
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("expenses")
}
```

- [ ] **Step 2: Generate and apply the migration**

Run: `cd ebenezer-backend && npx prisma migrate dev --name rooms_guests_bookings_payments`
Expected: migration created under `prisma/migrations/`, applied to the local dev database, Prisma Client regenerated. This **drops the `clients` table** — confirm the prompt (there is no production data yet, only the seeded admin user).

- [ ] **Step 3: Seed sample rooms**

Add to `ebenezer-backend/prisma/seed.ts` (keep the existing admin-creation logic, add this alongside it):

```ts
const ROOMS: { roomNumber: string; type: string; pricePerNight: number }[] = [
  { roomNumber: "101", type: "Standard", pricePerNight: 20000 },
  { roomNumber: "102", type: "Standard", pricePerNight: 20000 },
  { roomNumber: "103", type: "Deluxe", pricePerNight: 30000 },
  { roomNumber: "104", type: "Deluxe", pricePerNight: 30000 },
  { roomNumber: "105", type: "Suite", pricePerNight: 45000 },
];

async function seedRooms() {
  for (const room of ROOMS) {
    await prisma.room.upsert({
      where: { roomNumber: room.roomNumber },
      update: {},
      create: room,
    });
  }
  console.log(`Seeded ${ROOMS.length} rooms`);
}
```

Call it from `main()`:

```ts
async function main() {
  // ...existing admin-creation block stays as-is...
  await seedRooms();
}
```

- [ ] **Step 4: Run the seed and verify manually**

Run: `npm run seed`
Expected: `Seeded 5 rooms` logged (plus the admin line). Run `npx prisma studio`, open the `rooms` table, confirm 5 rows with `status = AVAILABLE`. Close Prisma Studio.

- [ ] **Step 5: Commit**

```bash
git add ebenezer-backend/prisma
git commit -m "feat: replace Client model with Room/Guest/Booking/Payment schema"
```

---

### Task 3: Booking calculation utilities

**Files:**
- Create: `ebenezer-backend/src/utils/booking.util.ts`
- Test: `ebenezer-backend/src/utils/booking.util.test.ts`

**Interfaces:**
- Produces: `computeNights(checkIn: Date, expectedCheckOut: Date): number`, `computeBookingAmount(nights: number, pricePerNight: number): number`, `computeCheckoutStatus(booking: { expectedCheckOut: Date; actualCheckOut: Date | null }, now: Date): CheckoutStatus`, `type CheckoutStatus = "IN_HOUSE" | "OVERDUE" | "ON_TIME" | "LATE"`. Used by `booking.service.ts` and `dashboard.service.ts` in later tasks.

- [ ] **Step 1: Write the failing tests**

```ts
// src/utils/booking.util.test.ts
import { describe, expect, it } from "vitest";
import { computeNights, computeBookingAmount, computeCheckoutStatus } from "./booking.util";

describe("computeNights", () => {
  it("counts whole nights between check-in and expected checkout", () => {
    const checkIn = new Date("2026-08-12T14:00:00Z");
    const expectedCheckOut = new Date("2026-08-15T10:00:00Z");
    expect(computeNights(checkIn, expectedCheckOut)).toBe(3);
  });

  it("rounds a partial night up", () => {
    const checkIn = new Date("2026-08-12T14:00:00Z");
    const expectedCheckOut = new Date("2026-08-13T10:00:00Z");
    expect(computeNights(checkIn, expectedCheckOut)).toBe(1);
  });

  it("never returns less than 1 night", () => {
    const checkIn = new Date("2026-08-12T14:00:00Z");
    const expectedCheckOut = new Date("2026-08-12T15:00:00Z");
    expect(computeNights(checkIn, expectedCheckOut)).toBe(1);
  });
});

describe("computeBookingAmount", () => {
  it("multiplies nights by the room rate", () => {
    expect(computeBookingAmount(3, 20000)).toBe(60000);
  });
});

describe("computeCheckoutStatus", () => {
  const expectedCheckOut = new Date("2026-08-13T10:00:00Z");

  it("is IN_HOUSE when still before expected checkout and not checked out", () => {
    const now = new Date("2026-08-13T09:00:00Z");
    expect(computeCheckoutStatus({ expectedCheckOut, actualCheckOut: null }, now)).toBe("IN_HOUSE");
  });

  it("is OVERDUE when past expected checkout and not checked out", () => {
    const now = new Date("2026-08-13T11:00:00Z");
    expect(computeCheckoutStatus({ expectedCheckOut, actualCheckOut: null }, now)).toBe("OVERDUE");
  });

  it("is ON_TIME when actual checkout was at or before expected", () => {
    const actualCheckOut = new Date("2026-08-13T09:45:00Z");
    const now = new Date("2026-08-13T12:00:00Z");
    expect(computeCheckoutStatus({ expectedCheckOut, actualCheckOut }, now)).toBe("ON_TIME");
  });

  it("is LATE when actual checkout was after expected", () => {
    const actualCheckOut = new Date("2026-08-13T11:37:00Z");
    const now = new Date("2026-08-13T12:00:00Z");
    expect(computeCheckoutStatus({ expectedCheckOut, actualCheckOut }, now)).toBe("LATE");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- booking.util`
Expected: FAIL — `booking.util.ts` doesn't exist yet.

- [ ] **Step 3: Implement**

```ts
// src/utils/booking.util.ts
export type CheckoutStatus = "IN_HOUSE" | "OVERDUE" | "ON_TIME" | "LATE";

const MS_PER_NIGHT = 1000 * 60 * 60 * 24;

export function computeNights(checkIn: Date, expectedCheckOut: Date): number {
  const diff = expectedCheckOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.ceil(diff / MS_PER_NIGHT));
}

export function computeBookingAmount(nights: number, pricePerNight: number): number {
  return nights * pricePerNight;
}

export function computeCheckoutStatus(
  booking: { expectedCheckOut: Date; actualCheckOut: Date | null },
  now: Date
): CheckoutStatus {
  if (booking.actualCheckOut) {
    return booking.actualCheckOut.getTime() <= booking.expectedCheckOut.getTime() ? "ON_TIME" : "LATE";
  }
  return now.getTime() > booking.expectedCheckOut.getTime() ? "OVERDUE" : "IN_HOUSE";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- booking.util`
Expected: 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add ebenezer-backend/src/utils/booking.util.ts ebenezer-backend/src/utils/booking.util.test.ts
git commit -m "feat: add pure booking calculation utilities"
```

---

### Task 4: Room service, controller, routes

**Files:**
- Create: `ebenezer-backend/tests/helpers.ts`
- Create: `ebenezer-backend/src/services/room.service.ts`
- Create: `ebenezer-backend/src/controllers/room.controller.ts`
- Create: `ebenezer-backend/src/routes/room.routes.ts`
- Modify: `ebenezer-backend/src/app.ts`
- Test: `ebenezer-backend/tests/room.integration.test.ts`

**Interfaces:**
- Consumes: `prisma` from `../src/config/db`, `signToken` from `../src/utils/jwt` (Task 2 schema).
- Produces: `tests/helpers.ts` exports `resetDb(): Promise<void>`, `createTestUser(role?: "ADMIN" | "WORKER"): Promise<{ user, token: string }>`, `createTestRoom(overrides?): Promise<Room>` — every later integration test task reuses these verbatim. `room.service.ts` exports `listRooms`, `getRoom(id)`, `createRoom(input)`, `updateRoom(id, input)`. Routes mounted at `/api/rooms`.

- [ ] **Step 1: Write shared test helpers**

```ts
// tests/helpers.ts
import { prisma } from "../src/config/db";
import { signToken } from "../src/utils/jwt";
import type { Role, RoomStatus } from "@prisma/client";

export async function resetDb() {
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.room.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.user.deleteMany();
}

let counter = 0;

export async function createTestUser(role: Role = "WORKER") {
  counter += 1;
  const user = await prisma.user.create({
    data: {
      fullName: `Test ${role} ${counter}`,
      email: `test-${role.toLowerCase()}-${counter}@example.com`,
      password: "unused-in-tests",
      role,
    },
  });
  const token = signToken({ id: user.id, role: user.role });
  return { user, token };
}

export async function createTestRoom(overrides: Partial<{
  roomNumber: string;
  type: string;
  pricePerNight: number;
  status: RoomStatus;
}> = {}) {
  counter += 1;
  return prisma.room.create({
    data: {
      roomNumber: overrides.roomNumber ?? `T${counter}`,
      type: overrides.type ?? "Standard",
      pricePerNight: overrides.pricePerNight ?? 20000,
      status: overrides.status ?? "AVAILABLE",
    },
  });
}
```

- [ ] **Step 2: Write the failing integration test**

```ts
// tests/room.integration.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app";
import { resetDb, createTestUser } from "./helpers";

beforeEach(resetDb);

describe("rooms API", () => {
  it("lets a worker list rooms but not create one", async () => {
    const { token } = await createTestUser("WORKER");

    const create = await request(app)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${token}`)
      .send({ roomNumber: "201", pricePerNight: 25000 });
    expect(create.status).toBe(403);

    const list = await request(app).get("/api/rooms").set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body).toEqual([]);
  });

  it("lets an admin create and update a room", async () => {
    const { token } = await createTestUser("ADMIN");

    const create = await request(app)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${token}`)
      .send({ roomNumber: "201", type: "Standard", pricePerNight: 25000 });
    expect(create.status).toBe(201);
    expect(create.body.status).toBe("AVAILABLE");

    const update = await request(app)
      .put(`/api/rooms/${create.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "MAINTENANCE" });
    expect(update.status).toBe(200);
    expect(update.body.status).toBe("MAINTENANCE");
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/rooms");
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- room.integration`
Expected: FAIL — `/api/rooms` doesn't exist (404s), or import errors for `room.service`/`room.controller`/`room.routes`.

- [ ] **Step 4: Implement the service**

```ts
// src/services/room.service.ts
import { prisma } from "../config/db";
import { AppError } from "../middleware/error.middleware";
import type { RoomStatus } from "@prisma/client";

export interface RoomInput {
  roomNumber: string;
  type?: string | null;
  pricePerNight: number;
}

export interface RoomUpdateInput extends Partial<RoomInput> {
  status?: RoomStatus;
}

export async function listRooms() {
  return prisma.room.findMany({ orderBy: { roomNumber: "asc" } });
}

export async function getRoom(id: string) {
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) throw new AppError("Room not found", 404);
  return room;
}

export async function createRoom(input: RoomInput) {
  return prisma.room.create({
    data: {
      roomNumber: input.roomNumber,
      type: input.type ?? null,
      pricePerNight: input.pricePerNight,
    },
  });
}

export async function updateRoom(id: string, input: RoomUpdateInput) {
  const existing = await prisma.room.findUnique({ where: { id } });
  if (!existing) throw new AppError("Room not found", 404);

  return prisma.room.update({
    where: { id },
    data: {
      ...(input.roomNumber && { roomNumber: input.roomNumber }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.pricePerNight !== undefined && { pricePerNight: input.pricePerNight }),
      ...(input.status && { status: input.status }),
    },
  });
}
```

- [ ] **Step 5: Implement the controller**

```ts
// src/controllers/room.controller.ts
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as roomService from "../services/room.service";

const roomSchema = z.object({
  roomNumber: z.string().min(1),
  type: z.string().nullable().optional(),
  pricePerNight: z.number().nonnegative(),
});

const updateRoomSchema = roomSchema.partial().extend({
  status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING", "MAINTENANCE"]).optional(),
});

export async function listRoomsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await roomService.listRooms());
  } catch (err) {
    next(err);
  }
}

export async function getRoomHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await roomService.getRoom(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function createRoomHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = roomSchema.parse(req.body);
    res.status(201).json(await roomService.createRoom(input));
  } catch (err) {
    next(err);
  }
}

export async function updateRoomHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateRoomSchema.parse(req.body);
    res.json(await roomService.updateRoom(req.params.id, input));
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 6: Implement the routes**

```ts
// src/routes/room.routes.ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  listRoomsHandler,
  getRoomHandler,
  createRoomHandler,
  updateRoomHandler,
} from "../controllers/room.controller";

const router = Router();

router.use(requireAuth);

// Everyone (admin + worker) can see the room board to pick a room at check-in.
router.get("/", listRoomsHandler);
router.get("/:id", getRoomHandler);

// Admin-only: adding rooms and changing status/rates is a management action.
router.post("/", requireRole("ADMIN"), createRoomHandler);
router.put("/:id", requireRole("ADMIN"), updateRoomHandler);

export default router;
```

- [ ] **Step 7: Mount the routes**

Edit `ebenezer-backend/src/app.ts` — add the import and mount line (leave `clientRoutes` in place for now; it's removed in Task 5):

```ts
import roomRoutes from "./routes/room.routes";
```

```ts
app.use("/api/rooms", roomRoutes);
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- room.integration`
Expected: 3 tests PASS.

- [ ] **Step 9: Commit**

```bash
git add ebenezer-backend/tests/helpers.ts ebenezer-backend/tests/room.integration.test.ts ebenezer-backend/src/services/room.service.ts ebenezer-backend/src/controllers/room.controller.ts ebenezer-backend/src/routes/room.routes.ts ebenezer-backend/src/app.ts
git commit -m "feat: add room management API"
```

---

### Task 5: Booking service, controller, routes (check-in / checkout) — replaces Client API

**Files:**
- Create: `ebenezer-backend/src/services/booking.service.ts`
- Create: `ebenezer-backend/src/controllers/booking.controller.ts`
- Create: `ebenezer-backend/src/routes/booking.routes.ts`
- Modify: `ebenezer-backend/src/app.ts`
- Test: `ebenezer-backend/tests/booking.integration.test.ts`
- Delete: `ebenezer-backend/src/services/client.service.ts`
- Delete: `ebenezer-backend/src/controllers/client.controller.ts`
- Delete: `ebenezer-backend/src/routes/client.routes.ts`

**Interfaces:**
- Consumes: `computeNights`, `computeBookingAmount`, `computeCheckoutStatus` from `../utils/booking.util` (Task 3); `resetDb`, `createTestUser`, `createTestRoom` from `../tests/helpers` (Task 4).
- Produces: `booking.service.ts` exports `listBookings(user, dateFilter?)`, `listBookingsByCheckInDate(dateStr)`, `listOverdueBookings()`, `getBooking(user, id)`, `createBooking(user, input)`, `checkoutBooking(user, id, input)`, `updateBooking(id, input)`, `deleteBooking(id)`. `listBookingsByCheckInDate` and `listOverdueBookings` are consumed directly by `dashboard.service.ts` in Task 6. Every returned booking has `checkoutStatus: CheckoutStatus` and `amountPaid: number` attached. Routes mounted at `/api/bookings`, with `POST /api/bookings/:id/checkout` as the dedicated checkout operation (Improvements.md §11: "make checkout an actual operation").

- [ ] **Step 1: Write the failing integration test**

```ts
// tests/booking.integration.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app";
import { resetDb, createTestUser, createTestRoom } from "./helpers";

beforeEach(resetDb);

function isoDaysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

describe("bookings API", () => {
  it("checks a guest in: creates guest+booking+payments, occupies the room", async () => {
    const { token } = await createTestUser("WORKER");
    const room = await createTestRoom({ roomNumber: "301", pricePerNight: 20000 });

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        roomId: room.id,
        guest: { fullName: "Jean Paul", phone: "0788000000" },
        checkIn: isoDaysFromNow(0),
        expectedCheckOut: isoDaysFromNow(2),
        amountCash: 30000,
        amountMomo: 10000,
      });

    expect(res.status).toBe(201);
    expect(res.body.nights).toBe(2);
    expect(res.body.bookingAmount).toBe("40000");
    expect(res.body.amountPaid).toBe(40000);
    expect(res.body.checkoutStatus).toBe("IN_HOUSE");
    expect(res.body.room.status).toBe("OCCUPIED");
    expect(res.body.guest.fullName).toBe("Jean Paul");

    const roomRes = await request(app).get(`/api/rooms/${room.id}`).set("Authorization", `Bearer ${token}`);
    expect(roomRes.body.status).toBe("OCCUPIED");
  });

  it("refuses to book a room that isn't AVAILABLE", async () => {
    const { token } = await createTestUser("WORKER");
    const room = await createTestRoom({ status: "MAINTENANCE" });

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        roomId: room.id,
        guest: { fullName: "Alice" },
        checkIn: isoDaysFromNow(0),
        expectedCheckOut: isoDaysFromNow(1),
        amountCash: 0,
        amountMomo: 0,
      });

    expect(res.status).toBe(409);
  });

  it("flags a booking as OVERDUE once expectedCheckOut has passed", async () => {
    const { token } = await createTestUser("WORKER");
    const room = await createTestRoom({ roomNumber: "302", pricePerNight: 20000 });

    const created = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        roomId: room.id,
        guest: { fullName: "Overdue Guest" },
        checkIn: isoDaysFromNow(-3),
        expectedCheckOut: isoDaysFromNow(-1),
        amountCash: 20000,
        amountMomo: 0,
      });
    expect(created.status).toBe(201);
    expect(created.body.checkoutStatus).toBe("OVERDUE");

    const overdue = await request(app).get("/api/bookings/overdue").set("Authorization", `Bearer ${token}`);
    expect(overdue.status).toBe(200);
    expect(overdue.body.map((b: { id: string }) => b.id)).toContain(created.body.id);
  });

  it("checks a guest out: sets actualCheckOut, status, and puts the room into CLEANING", async () => {
    const { token } = await createTestUser("WORKER");
    const room = await createTestRoom({ roomNumber: "303", pricePerNight: 20000 });

    const created = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        roomId: room.id,
        guest: { fullName: "David" },
        checkIn: isoDaysFromNow(0),
        expectedCheckOut: isoDaysFromNow(1),
        amountCash: 20000,
        amountMomo: 0,
      });

    const checkout = await request(app)
      .post(`/api/bookings/${created.body.id}/checkout`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(checkout.status).toBe(200);
    expect(checkout.body.status).toBe("CHECKED_OUT");
    expect(checkout.body.actualCheckOut).not.toBeNull();
    expect(checkout.body.room.status).toBe("CLEANING");

    const again = await request(app)
      .post(`/api/bookings/${created.body.id}/checkout`)
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(again.status).toBe(409);
  });

  it("scopes a worker's booking list to their own entries, but admin sees all", async () => {
    const worker = await createTestUser("WORKER");
    const admin = await createTestUser("ADMIN");
    const room = await createTestRoom({ roomNumber: "304", pricePerNight: 20000 });

    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${worker.token}`)
      .send({
        roomId: room.id,
        guest: { fullName: "Worker's Guest" },
        checkIn: isoDaysFromNow(0),
        expectedCheckOut: isoDaysFromNow(1),
        amountCash: 20000,
        amountMomo: 0,
      });

    const workerList = await request(app).get("/api/bookings").set("Authorization", `Bearer ${worker.token}`);
    expect(workerList.body).toHaveLength(1);

    const adminList = await request(app).get("/api/bookings").set("Authorization", `Bearer ${admin.token}`);
    expect(adminList.body).toHaveLength(1);
  });

  it("only lets an admin delete a booking, freeing the room", async () => {
    const { token } = await createTestUser("ADMIN");
    const room = await createTestRoom({ roomNumber: "305", pricePerNight: 20000 });

    const created = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        roomId: room.id,
        guest: { fullName: "Mistake Entry" },
        checkIn: isoDaysFromNow(0),
        expectedCheckOut: isoDaysFromNow(1),
        amountCash: 0,
        amountMomo: 0,
      });

    const del = await request(app)
      .delete(`/api/bookings/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(204);

    const roomRes = await request(app).get(`/api/rooms/${room.id}`).set("Authorization", `Bearer ${token}`);
    expect(roomRes.body.status).toBe("AVAILABLE");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- booking.integration`
Expected: FAIL — `/api/bookings` doesn't exist yet.

- [ ] **Step 3: Implement the service**

```ts
// src/services/booking.service.ts
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { AppError } from "../middleware/error.middleware";
import { JwtPayload } from "../types";
import { computeNights, computeBookingAmount, computeCheckoutStatus } from "../utils/booking.util";

export interface CreateBookingInput {
  roomId: string;
  guest: {
    fullName: string;
    phone?: string | null;
    nationality?: string | null;
    identificationType?: string | null;
    identificationNumber?: string | null;
  };
  checkIn: string;
  expectedCheckOut: string;
  amountCash: number;
  amountMomo: number;
  remarks?: string | null;
}

export interface UpdateBookingInput {
  roomId?: string;
  checkIn?: string;
  expectedCheckOut?: string;
  remarks?: string | null;
}

export interface CheckoutInput {
  actualCheckOut?: string;
}

const bookingInclude = {
  guest: true,
  room: true,
  payments: true,
  createdBy: { select: { id: true, fullName: true } },
} as const;

type BookingWithRelations = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

function withComputed(booking: BookingWithRelations) {
  const now = new Date();
  const amountPaid = booking.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  return {
    ...booking,
    amountPaid,
    checkoutStatus: computeCheckoutStatus(booking, now),
  };
}

export async function listBookings(user: JwtPayload, dateFilter?: string) {
  const bookings = await prisma.booking.findMany({
    where: {
      ...(user.role === "WORKER" ? { createdById: user.id } : {}),
      ...(dateFilter
        ? { checkIn: { gte: new Date(`${dateFilter}T00:00:00`), lte: new Date(`${dateFilter}T23:59:59.999`) } }
        : {}),
    },
    include: bookingInclude,
    orderBy: { createdAt: "desc" },
  });
  return bookings.map(withComputed);
}

// Admin-scope helper used by dashboard.service.ts — no role filtering, one calendar day of check-ins.
export async function listBookingsByCheckInDate(dateStr: string) {
  const bookings = await prisma.booking.findMany({
    where: {
      checkIn: { gte: new Date(`${dateStr}T00:00:00`), lte: new Date(`${dateStr}T23:59:59.999`) },
    },
    include: bookingInclude,
    orderBy: { createdAt: "desc" },
  });
  return bookings.map(withComputed);
}

// The heart of Improvements.md §4 — no cron job, just "is anyone past expectedCheckOut right now".
export async function listOverdueBookings() {
  const bookings = await prisma.booking.findMany({
    where: { status: "CHECKED_IN", actualCheckOut: null, expectedCheckOut: { lt: new Date() } },
    include: bookingInclude,
    orderBy: { expectedCheckOut: "asc" },
  });
  return bookings.map(withComputed);
}

export async function getBooking(user: JwtPayload, id: string) {
  const booking = await prisma.booking.findUnique({ where: { id }, include: bookingInclude });
  if (!booking) throw new AppError("Booking not found", 404);
  if (user.role === "WORKER" && booking.createdById !== user.id) {
    throw new AppError("You do not have permission to view this booking", 403);
  }
  return withComputed(booking);
}

export async function createBooking(user: JwtPayload, input: CreateBookingInput) {
  const room = await prisma.room.findUnique({ where: { id: input.roomId } });
  if (!room) throw new AppError("Room not found", 404);
  if (room.status !== "AVAILABLE") {
    throw new AppError(`Room ${room.roomNumber} is not available (status: ${room.status})`, 409);
  }

  const checkIn = new Date(input.checkIn);
  const expectedCheckOut = new Date(input.expectedCheckOut);
  if (expectedCheckOut <= checkIn) {
    throw new AppError("Expected checkout must be after check-in", 400);
  }

  const nights = computeNights(checkIn, expectedCheckOut);
  const bookingAmount = computeBookingAmount(nights, Number(room.pricePerNight));

  const payments: { amount: number; method: "CASH" | "MOMO" }[] = [];
  if (input.amountCash > 0) payments.push({ amount: input.amountCash, method: "CASH" });
  if (input.amountMomo > 0) payments.push({ amount: input.amountMomo, method: "MOMO" });

  const booking = await prisma.$transaction(async (tx) => {
    const guest = await tx.guest.create({ data: input.guest });

    const created = await tx.booking.create({
      data: {
        guestId: guest.id,
        roomId: room.id,
        checkIn,
        expectedCheckOut,
        nights,
        bookingAmount,
        remarks: input.remarks ?? null,
        createdById: user.id,
        payments: { create: payments },
      },
      include: bookingInclude,
    });

    await tx.room.update({ where: { id: room.id }, data: { status: "OCCUPIED" } });

    return created;
  });

  return withComputed(booking);
}

export async function checkoutBooking(user: JwtPayload, id: string, input: CheckoutInput) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new AppError("Booking not found", 404);
  if (user.role === "WORKER" && booking.createdById !== user.id) {
    throw new AppError("You do not have permission to check out this booking", 403);
  }
  if (booking.status === "CHECKED_OUT") {
    throw new AppError("Booking is already checked out", 409);
  }

  const actualCheckOut = input.actualCheckOut ? new Date(input.actualCheckOut) : new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.booking.update({
      where: { id },
      data: { actualCheckOut, status: "CHECKED_OUT" },
      include: bookingInclude,
    });
    await tx.room.update({ where: { id: booking.roomId }, data: { status: "CLEANING" } });
    return result;
  });

  return withComputed(updated);
}

// Admin-only correction (e.g. wrong room/dates typed at check-in) — blocked once checked out.
export async function updateBooking(id: string, input: UpdateBookingInput) {
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) throw new AppError("Booking not found", 404);
  if (existing.status === "CHECKED_OUT") {
    throw new AppError("Cannot edit a booking that has already checked out", 409);
  }

  const checkIn = input.checkIn ? new Date(input.checkIn) : existing.checkIn;
  const expectedCheckOut = input.expectedCheckOut ? new Date(input.expectedCheckOut) : existing.expectedCheckOut;
  const nights = computeNights(checkIn, expectedCheckOut);

  let bookingAmount: number | undefined;
  if (input.roomId || input.checkIn || input.expectedCheckOut) {
    const room = await prisma.room.findUnique({ where: { id: input.roomId ?? existing.roomId } });
    if (!room) throw new AppError("Room not found", 404);
    bookingAmount = computeBookingAmount(nights, Number(room.pricePerNight));
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      ...(input.roomId && { roomId: input.roomId }),
      ...(input.checkIn && { checkIn }),
      ...(input.expectedCheckOut && { expectedCheckOut }),
      nights,
      ...(bookingAmount !== undefined && { bookingAmount }),
      ...(input.remarks !== undefined && { remarks: input.remarks }),
    },
    include: bookingInclude,
  });

  return withComputed(updated);
}

export async function deleteBooking(id: string) {
  const existing = await prisma.booking.findUnique({ where: { id } });
  if (!existing) throw new AppError("Booking not found", 404);

  await prisma.$transaction(async (tx) => {
    await tx.payment.deleteMany({ where: { bookingId: id } });
    await tx.booking.delete({ where: { id } });
    if (existing.status === "CHECKED_IN") {
      await tx.room.update({ where: { id: existing.roomId }, data: { status: "AVAILABLE" } });
    }
  });
}
```

- [ ] **Step 4: Implement the controller**

```ts
// src/controllers/booking.controller.ts
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as bookingService from "../services/booking.service";

const guestSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  identificationType: z.string().nullable().optional(),
  identificationNumber: z.string().nullable().optional(),
});

const createBookingSchema = z.object({
  roomId: z.string().min(1),
  guest: guestSchema,
  checkIn: z.string(),
  expectedCheckOut: z.string(),
  amountCash: z.number().nonnegative(),
  amountMomo: z.number().nonnegative(),
  remarks: z.string().nullable().optional(),
});

const updateBookingSchema = z.object({
  roomId: z.string().min(1).optional(),
  checkIn: z.string().optional(),
  expectedCheckOut: z.string().optional(),
  remarks: z.string().nullable().optional(),
});

const checkoutSchema = z.object({
  actualCheckOut: z.string().optional(),
});

export async function listBookingsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    res.json(await bookingService.listBookings(req.user!, date));
  } catch (err) {
    next(err);
  }
}

export async function listOverdueBookingsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await bookingService.listOverdueBookings());
  } catch (err) {
    next(err);
  }
}

export async function getBookingHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await bookingService.getBooking(req.user!, req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function createBookingHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createBookingSchema.parse(req.body);
    res.status(201).json(await bookingService.createBooking(req.user!, input));
  } catch (err) {
    next(err);
  }
}

export async function checkoutBookingHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = checkoutSchema.parse(req.body);
    res.json(await bookingService.checkoutBooking(req.user!, req.params.id, input));
  } catch (err) {
    next(err);
  }
}

export async function updateBookingHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateBookingSchema.parse(req.body);
    res.json(await bookingService.updateBooking(req.params.id, input));
  } catch (err) {
    next(err);
  }
}

export async function deleteBookingHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await bookingService.deleteBooking(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 5: Implement the routes**

```ts
// src/routes/booking.routes.ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  listBookingsHandler,
  listOverdueBookingsHandler,
  getBookingHandler,
  createBookingHandler,
  checkoutBookingHandler,
  updateBookingHandler,
  deleteBookingHandler,
} from "../controllers/booking.controller";

const router = Router();

router.use(requireAuth);

// Static path before ":id" so "overdue" isn't swallowed as a booking id.
router.get("/overdue", listOverdueBookingsHandler);
router.get("/", listBookingsHandler);
router.get("/:id", getBookingHandler);
router.post("/", createBookingHandler);
router.post("/:id/checkout", checkoutBookingHandler);

router.put("/:id", requireRole("ADMIN"), updateBookingHandler);
router.delete("/:id", requireRole("ADMIN"), deleteBookingHandler);

export default router;
```

- [ ] **Step 6: Swap routes in `app.ts` — remove client routes, mount booking routes**

Replace the full contents of `ebenezer-backend/src/app.ts`:

```ts
import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import roomRoutes from "./routes/room.routes";
import bookingRoutes from "./routes/booking.routes";
import expenseRoutes from "./routes/expense.routes";
import dashboardRoutes from "./routes/dashboard.routes";

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
```

- [ ] **Step 7: Delete the old Client backend files**

```bash
git rm ebenezer-backend/src/services/client.service.ts ebenezer-backend/src/controllers/client.controller.ts ebenezer-backend/src/routes/client.routes.ts
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test`
Expected: all suites (smoke, booking.util, room.integration, booking.integration) PASS.

- [ ] **Step 9: Commit**

```bash
git add ebenezer-backend/src ebenezer-backend/tests
git commit -m "feat: add booking check-in/checkout API, remove Client API"
```

---

### Task 6: Dashboard — occupancy + overdue visibility

**Files:**
- Modify: `ebenezer-backend/src/services/dashboard.service.ts`
- Test: `ebenezer-backend/tests/dashboard.integration.test.ts`

**Interfaces:**
- Consumes: `listBookingsByCheckInDate`, `listOverdueBookings` from `../services/booking.service` (Task 5).
- Produces: `getDailySummary(dateStr?)` now returns `{ date, totalUsers, totalBookings, totalIncome, totalExpenses, netIncome, roomsTotal, roomsOccupied, occupancyRate, overdueCount, overdueBookings, bookings, expenses }`. `dashboard.controller.ts` is unchanged (still just calls the service) — frontend Task 11 consumes this exact shape.

- [ ] **Step 1: Write the failing integration test**

```ts
// tests/dashboard.integration.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app";
import { resetDb, createTestUser, createTestRoom } from "./helpers";

function isoDaysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

beforeEach(resetDb);

describe("dashboard summary", () => {
  it("reports today's bookings, occupancy, and overdue count", async () => {
    const admin = await createTestUser("ADMIN");
    const roomA = await createTestRoom({ roomNumber: "401", pricePerNight: 20000 });
    await createTestRoom({ roomNumber: "402", pricePerNight: 20000 });

    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        roomId: roomA.id,
        guest: { fullName: "Today Guest" },
        checkIn: isoDaysFromNow(0),
        expectedCheckOut: isoDaysFromNow(2),
        amountCash: 20000,
        amountMomo: 0,
      });

    const roomB = await createTestRoom({ roomNumber: "403", pricePerNight: 20000 });
    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${admin.token}`)
      .send({
        roomId: roomB.id,
        guest: { fullName: "Overdue Guest" },
        checkIn: isoDaysFromNow(-3),
        expectedCheckOut: isoDaysFromNow(-1),
        amountCash: 20000,
        amountMomo: 0,
      });

    const res = await request(app)
      .get(`/api/dashboard/summary?date=${todayDateOnly()}`)
      .set("Authorization", `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalBookings).toBe(1); // only "Today Guest" checked in today
    expect(res.body.roomsTotal).toBe(3);
    expect(res.body.roomsOccupied).toBe(2);
    expect(res.body.occupancyRate).toBe(67);
    expect(res.body.overdueCount).toBe(1);
    expect(res.body.overdueBookings[0].guest.fullName).toBe("Overdue Guest");
    expect(res.body.totalIncome).toBe(20000); // only today's booking counts toward today's income
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- dashboard.integration`
Expected: FAIL — response body doesn't have `roomsTotal`/`occupancyRate`/`overdueBookings` yet (still shaped around `clients`).

- [ ] **Step 3: Implement**

Replace the full contents of `ebenezer-backend/src/services/dashboard.service.ts`:

```ts
import { prisma } from "../config/db";
import { listBookingsByCheckInDate, listOverdueBookings } from "./booking.service";

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

// The reception/manager "what's happening today" screen: bookings checked in
// today, today's expenses, room occupancy right now, and guests overdue right now.
export async function getDailySummary(dateStr?: string) {
  const day = dateStr ? new Date(dateStr) : new Date();
  const dateOnly = day.toISOString().slice(0, 10);
  const expenseRange = { gte: startOfDay(day), lte: endOfDay(day) };

  const [bookings, expenses, totalUsers, rooms, overdueBookings] = await Promise.all([
    listBookingsByCheckInDate(dateOnly),
    prisma.expense.findMany({
      where: { date: expenseRange },
      include: { createdBy: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
    prisma.room.findMany(),
    listOverdueBookings(),
  ]);

  const totalIncome = bookings.reduce((sum, b) => sum + b.amountPaid, 0);
  const totalExpenses = expenses.reduce((sum: number, e) => sum + Number(e.total), 0);
  const roomsTotal = rooms.length;
  const roomsOccupied = rooms.filter((r) => r.status === "OCCUPIED").length;

  return {
    date: dateOnly,
    totalUsers,
    totalBookings: bookings.length,
    totalIncome,
    totalExpenses,
    netIncome: totalIncome - totalExpenses,
    roomsTotal,
    roomsOccupied,
    occupancyRate: roomsTotal === 0 ? 0 : Math.round((roomsOccupied / roomsTotal) * 100),
    overdueCount: overdueBookings.length,
    overdueBookings,
    bookings,
    expenses,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all suites PASS, including the new `dashboard.integration` suite.

- [ ] **Step 5: Update the backend README**

Edit `ebenezer-backend/README.md` — replace the "Data model" and "Endpoints" sections' `Client` references with `Room`/`Guest`/`Booking`/`Payment`, and add `GET/POST /api/rooms`, `PUT /api/rooms/:id`, `GET/POST /api/bookings`, `GET /api/bookings/overdue`, `POST /api/bookings/:id/checkout`, `PUT/DELETE /api/bookings/:id`.

- [ ] **Step 6: Commit**

```bash
git add ebenezer-backend/src/services/dashboard.service.ts ebenezer-backend/tests/dashboard.integration.test.ts ebenezer-backend/README.md
git commit -m "feat: dashboard reports occupancy and overdue bookings"
```

---

### Task 7: Frontend types + API modules

**Files:**
- Modify: `ebenezer-frontend/src/types/index.ts`
- Create: `ebenezer-frontend/src/api/rooms.ts`
- Create: `ebenezer-frontend/src/api/bookings.ts`
- Delete: `ebenezer-frontend/src/api/clients.ts`

**Interfaces:**
- Produces: types `Room`, `Guest`, `Payment`, `Booking`, `RoomStatus`, `BookingStatus`, `CheckoutStatus`, updated `DailySummary` (mirrors Task 6's backend response). `api/rooms.ts` exports `listRooms()`, `createRoom(input)`, `updateRoom(id, input)`. `api/bookings.ts` exports `listBookings(date?)`, `getBooking(id)`, `createBooking(input)`, `checkoutBooking(id, actualCheckOut?)`, `deleteBooking(id)`. Every later frontend task imports from these.

- [ ] **Step 1: Replace `src/types/index.ts`**

```ts
export type Role = "ADMIN" | "WORKER";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "CLEANING" | "MAINTENANCE";

export interface Room {
  id: string;
  roomNumber: string;
  type: string | null;
  pricePerNight: string;
  status: RoomStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Guest {
  id: string;
  fullName: string;
  phone: string | null;
  nationality: string | null;
  identificationType: string | null;
  identificationNumber: string | null;
}

export type PaymentMethod = "CASH" | "MOMO";

export interface Payment {
  id: string;
  amount: string;
  method: PaymentMethod;
  reference: string | null;
  paidAt: string;
}

export type CheckoutStatus = "IN_HOUSE" | "OVERDUE" | "ON_TIME" | "LATE";
export type BookingStatus = "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";

export interface Booking {
  id: string;
  guest: Guest;
  room: Room;
  checkIn: string;
  expectedCheckOut: string;
  actualCheckOut: string | null;
  nights: number;
  bookingAmount: string;
  status: BookingStatus;
  checkoutStatus: CheckoutStatus;
  amountPaid: number;
  remarks: string | null;
  payments: Payment[];
  createdBy: { id: string; fullName: string };
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  item: string;
  description: string | null;
  amountCash: string;
  amountMomo: string;
  total: string;
  remarks: string | null;
  createdBy: { id: string; fullName: string };
  createdAt: string;
}

export interface DailySummary {
  date: string;
  totalUsers: number;
  totalBookings: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  roomsTotal: number;
  roomsOccupied: number;
  occupancyRate: number;
  overdueCount: number;
  overdueBookings: Booking[];
  bookings: Booking[];
  expenses: Expense[];
}
```

- [ ] **Step 2: Write `src/api/rooms.ts`**

```ts
import { api } from "./client";
import type { Room, RoomStatus } from "../types";

export interface RoomInput {
  roomNumber: string;
  type?: string | null;
  pricePerNight: number;
}

export async function listRooms() {
  const { data } = await api.get<Room[]>("/rooms");
  return data;
}

export async function createRoom(input: RoomInput) {
  const { data } = await api.post<Room>("/rooms", input);
  return data;
}

export async function updateRoom(id: string, input: Partial<RoomInput & { status: RoomStatus }>) {
  const { data } = await api.put<Room>(`/rooms/${id}`, input);
  return data;
}
```

- [ ] **Step 3: Write `src/api/bookings.ts`**

```ts
import { api } from "./client";
import type { Booking } from "../types";

export interface CreateBookingInput {
  roomId: string;
  guest: {
    fullName: string;
    phone?: string | null;
    nationality?: string | null;
    identificationType?: string | null;
    identificationNumber?: string | null;
  };
  checkIn: string;
  expectedCheckOut: string;
  amountCash: number;
  amountMomo: number;
  remarks?: string | null;
}

export async function listBookings(date?: string) {
  const { data } = await api.get<Booking[]>("/bookings", { params: date ? { date } : {} });
  return data;
}

export async function getBooking(id: string) {
  const { data } = await api.get<Booking>(`/bookings/${id}`);
  return data;
}

export async function createBooking(input: CreateBookingInput) {
  const { data } = await api.post<Booking>("/bookings", input);
  return data;
}

export async function checkoutBooking(id: string, actualCheckOut?: string) {
  const { data } = await api.post<Booking>(`/bookings/${id}/checkout`, { actualCheckOut });
  return data;
}

export async function deleteBooking(id: string) {
  await api.delete(`/bookings/${id}`);
}
```

- [ ] **Step 4: Delete the old Client API module**

```bash
git rm ebenezer-frontend/src/api/clients.ts
```

- [ ] **Step 5: Typecheck**

Run: `cd ebenezer-frontend && npx tsc -b`
Expected: errors in `src/pages/Clients.tsx`, `src/pages/ClientForm.tsx`, `src/pages/Dashboard.tsx` (they still import the now-removed `Client` type / `clients` API) — that's expected, those pages are replaced in Tasks 8–11. Confirm the *new* files (`types/index.ts`, `api/rooms.ts`, `api/bookings.ts`) themselves have no errors by checking the error list doesn't mention them.

- [ ] **Step 6: Commit**

```bash
git add ebenezer-frontend/src/types/index.ts ebenezer-frontend/src/api/rooms.ts ebenezer-frontend/src/api/bookings.ts
git commit -m "feat: add Room/Booking types and API client, remove Client API"
```

---

### Task 8: Rooms page — reception board

**Files:**
- Create: `ebenezer-frontend/src/pages/Rooms.tsx`

**Interfaces:**
- Consumes: `listRooms` from `../api/rooms` (Task 7), `Room`/`RoomStatus` types (Task 7), existing `Badge` component.
- Produces: default export `Rooms` page component. Wired into routing in Task 11.

- [ ] **Step 1: Add a `room` Badge tone**

Edit `ebenezer-frontend/src/components/Badge.tsx` — extend the tone union and map so room statuses render distinctly from the existing credit/debit/admin/user tones:

```tsx
interface BadgeProps {
  tone: "credit" | "debit" | "admin" | "user" | "available" | "occupied" | "warn" | "neutral";
  children: React.ReactNode;
}

const toneClasses: Record<BadgeProps["tone"], string> = {
  credit: "bg-[var(--color-credit-bg)] text-[var(--color-credit-text)]",
  debit: "bg-[var(--color-debit-bg)] text-[var(--color-debit-text)]",
  admin: "bg-[var(--color-badge-admin-bg)] text-[var(--color-badge-admin-text)]",
  user: "bg-[var(--color-badge-user-bg)] text-[var(--color-badge-user-text)]",
  available: "bg-[var(--color-credit-bg)] text-[var(--color-credit-text)]",
  occupied: "bg-[var(--color-badge-admin-bg)] text-[var(--color-badge-admin-text)]",
  warn: "bg-[var(--color-debit-bg)] text-[var(--color-debit-text)]",
  neutral: "bg-[var(--color-badge-user-bg)] text-[var(--color-badge-user-text)]",
};
```

(Leave the rest of the file — the component body reading `toneClasses[tone]` — unchanged.)

- [ ] **Step 2: Write `src/pages/Rooms.tsx`**

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listRooms } from "../api/rooms";
import type { Room, RoomStatus } from "../types";
import { formatMoney } from "../lib/format";
import { getErrorMessage } from "../api/client";
import Badge from "../components/Badge";

const STATUS_TONE: Record<RoomStatus, "available" | "occupied" | "warn" | "neutral"> = {
  AVAILABLE: "available",
  OCCUPIED: "occupied",
  RESERVED: "neutral",
  CLEANING: "neutral",
  MAINTENANCE: "warn",
};

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listRooms()
      .then(setRooms)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Rooms</h1>
        <Link
          to="/bookings/new"
          className="bg-[var(--color-ink)] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + New Check-in
        </Link>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-[var(--color-muted)]">Loading…</p>
      ) : error ? (
        <p role="alert" className="mt-8 text-sm text-[var(--color-debit-text)]">
          {error}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div key={room.id} className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-5">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">{room.roomNumber}</span>
                <Badge tone={STATUS_TONE[room.status]}>{room.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{room.type ?? "Standard"}</p>
              <p className="mt-3 text-sm tabular-nums">{formatMoney(room.pricePerNight)} / night</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: no new errors attributable to `Rooms.tsx` or `Badge.tsx` (the Task 7 errors in `Clients.tsx`/`ClientForm.tsx`/`Dashboard.tsx` still exist and are expected until Tasks 9–11).

- [ ] **Step 4: Commit**

```bash
git add ebenezer-frontend/src/pages/Rooms.tsx ebenezer-frontend/src/components/Badge.tsx
git commit -m "feat: add Rooms reception board page"
```

---

### Task 9: BookingForm page — check-in workflow (replaces ClientForm)

**Files:**
- Create: `ebenezer-frontend/src/pages/BookingForm.tsx`
- Delete: `ebenezer-frontend/src/pages/ClientForm.tsx`

**Interfaces:**
- Consumes: `createBooking` from `../api/bookings`, `listRooms` from `../api/rooms` (Task 7), `TextField`/`SelectField` from `../components/FormField`.
- Produces: default export `BookingForm` page component. Wired into routing in Task 11.

- [ ] **Step 1: Write `src/pages/BookingForm.tsx`**

```tsx
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createBooking } from "../api/bookings";
import { listRooms } from "../api/rooms";
import type { Room } from "../types";
import { getErrorMessage } from "../api/client";
import { formatMoney } from "../lib/format";
import { TextField, SelectField } from "../components/FormField";

function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export default function BookingForm() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  const [roomId, setRoomId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [checkIn, setCheckIn] = useState(toDateTimeLocal(new Date()));
  const [expectedCheckOut, setExpectedCheckOut] = useState(toDateTimeLocal(addDays(new Date(), 1)));
  const [amountCash, setAmountCash] = useState(0);
  const [amountMomo, setAmountMomo] = useState(0);
  const [remarks, setRemarks] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRooms()
      .then((data) => {
        setRooms(data);
        const firstAvailable = data.find((r) => r.status === "AVAILABLE");
        if (firstAvailable) setRoomId(firstAvailable.id);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setRoomsLoading(false));
  }, []);

  const availableRooms = rooms.filter((r) => r.status === "AVAILABLE");
  const selectedRoom = rooms.find((r) => r.id === roomId);

  const nights = useMemo(() => {
    const start = new Date(checkIn).getTime();
    const end = new Date(expectedCheckOut).getTime();
    if (!start || !end || end <= start) return 0;
    return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  }, [checkIn, expectedCheckOut]);

  const expectedAmount = selectedRoom ? nights * Number(selectedRoom.pricePerNight) : 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await createBooking({
        roomId,
        guest: { fullName, phone: phone || null },
        checkIn: new Date(checkIn).toISOString(),
        expectedCheckOut: new Date(expectedCheckOut).toISOString(),
        amountCash,
        amountMomo,
        remarks: remarks || null,
      });
      navigate("/bookings");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (roomsLoading) {
    return <p className="text-sm text-[var(--color-muted)]">Loading…</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">New Check-in</h1>
        <Link
          to="/bookings"
          className="border border-[var(--color-border)] rounded-lg px-4 py-2 text-sm hover:bg-[var(--color-card)] transition-colors"
        >
          ← Back
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-2xl bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-8 space-y-5"
      >
        <div className="grid grid-cols-2 gap-5">
          <TextField
            label="Guest Name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Uwase"
          />
          <TextField
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="078xxxxxxx"
          />
        </div>

        <SelectField label="Room" required value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          <option value="" disabled>
            {availableRooms.length === 0 ? "No rooms available" : "Select a room"}
          </option>
          {availableRooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.roomNumber} — {room.type ?? "Standard"} ({formatMoney(room.pricePerNight)}/night)
            </option>
          ))}
        </SelectField>

        <div className="grid grid-cols-2 gap-5">
          <TextField
            label="Check-in"
            type="datetime-local"
            required
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
          <TextField
            label="Expected Checkout"
            type="datetime-local"
            required
            value={expectedCheckOut}
            onChange={(e) => setExpectedCheckOut(e.target.value)}
          />
        </div>

        <div className="rounded-lg bg-[var(--color-canvas)] px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-[var(--color-muted)]">
            {nights} night{nights === 1 ? "" : "s"} · Expected amount
          </span>
          <span className="font-semibold tabular-nums">{formatMoney(expectedAmount)}</span>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <TextField
            label="Amount Paid — Cash"
            type="number"
            min={0}
            step="0.01"
            value={amountCash}
            onChange={(e) => setAmountCash(Number(e.target.value))}
          />
          <TextField
            label="Amount Paid — Momo"
            type="number"
            min={0}
            step="0.01"
            value={amountMomo}
            onChange={(e) => setAmountMomo(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            placeholder="Optional notes"
            className="w-full rounded-lg border border-[var(--color-border)] px-3.5 py-2.5 text-sm placeholder:text-[var(--color-muted-2)] focus:border-[var(--color-ink)] outline-none transition-colors"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-[var(--color-debit-text)]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !roomId}
          className="bg-[var(--color-ink)] text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {saving ? "Checking in…" : "Confirm Check-in"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Delete the old ClientForm page**

```bash
git rm ebenezer-frontend/src/pages/ClientForm.tsx
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: no errors from `BookingForm.tsx`; `Clients.tsx`/`Dashboard.tsx` errors remain until Tasks 10–11; `ClientForm.tsx` no longer appears in the error list since it's deleted.

- [ ] **Step 4: Commit**

```bash
git add ebenezer-frontend/src/pages/BookingForm.tsx
git commit -m "feat: add check-in booking form, remove ClientForm"
```

---

### Task 10: Bookings page — list + Checkout action (replaces Clients)

**Files:**
- Create: `ebenezer-frontend/src/pages/Bookings.tsx`
- Delete: `ebenezer-frontend/src/pages/Clients.tsx`

**Interfaces:**
- Consumes: `listBookings`, `checkoutBooking`, `deleteBooking` from `../api/bookings` (Task 7), `Booking`/`CheckoutStatus` types.
- Produces: default export `Bookings` page component. Wired into routing in Task 11.

- [ ] **Step 1: Write `src/pages/Bookings.tsx`**

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listBookings, checkoutBooking, deleteBooking } from "../api/bookings";
import type { Booking, CheckoutStatus } from "../types";
import { formatMoney, formatDateTime } from "../lib/format";
import { getErrorMessage } from "../api/client";
import Badge from "../components/Badge";

const CHECKOUT_TONE: Record<CheckoutStatus, "available" | "occupied" | "warn" | "neutral"> = {
  IN_HOUSE: "occupied",
  OVERDUE: "warn",
  ON_TIME: "available",
  LATE: "warn",
};

export default function Bookings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listBookings()
      .then(setBookings)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCheckout(id: string) {
    setActingId(id);
    try {
      const updated = await checkoutBooking(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setActingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this booking? This cannot be undone.")) return;
    try {
      await deleteBooking(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{isAdmin ? "All Bookings" : "My Bookings"}</h1>
          {!isAdmin && (
            <p className="text-sm text-[var(--color-muted)] mt-1">
              Bookings you've checked in. Contact an admin to make corrections.
            </p>
          )}
        </div>
        <Link
          to="/bookings/new"
          className="bg-[var(--color-ink)] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + New Check-in
        </Link>
      </div>

      <div className="mt-6 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-sm text-[var(--color-muted)]">Loading…</p>
        ) : error ? (
          <p className="px-6 py-8 text-sm text-[var(--color-debit-text)]">{error}</p>
        ) : bookings.length === 0 ? (
          <p className="px-6 py-8 text-sm text-[var(--color-muted)]">
            No bookings yet. Check in the first guest to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-[var(--color-muted)] border-b border-[var(--color-border)]">
                  <th className="px-6 py-3 font-medium">Guest</th>
                  <th className="px-6 py-3 font-medium">Room</th>
                  <th className="px-6 py-3 font-medium">Check-in</th>
                  <th className="px-6 py-3 font-medium">Expected Checkout</th>
                  <th className="px-6 py-3 font-medium">Nights</th>
                  <th className="px-6 py-3 font-medium">Paid</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-6 py-3.5 font-medium">{b.guest.fullName}</td>
                    <td className="px-6 py-3.5">{b.room.roomNumber}</td>
                    <td className="px-6 py-3.5 text-[var(--color-muted)]">{formatDateTime(b.checkIn)}</td>
                    <td className="px-6 py-3.5 text-[var(--color-muted)]">{formatDateTime(b.expectedCheckOut)}</td>
                    <td className="px-6 py-3.5">{b.nights}</td>
                    <td className="px-6 py-3.5 tabular-nums">{formatMoney(b.amountPaid)}</td>
                    <td className="px-6 py-3.5">
                      <Badge tone={CHECKOUT_TONE[b.checkoutStatus]}>{b.checkoutStatus}</Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex gap-2">
                        {b.status === "CHECKED_IN" && (
                          <button
                            onClick={() => handleCheckout(b.id)}
                            disabled={actingId === b.id}
                            className="border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs hover:bg-[var(--color-canvas)] transition-colors disabled:opacity-60"
                          >
                            {actingId === b.id ? "Checking out…" : "Checkout"}
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(b.id)}
                            className="border border-[var(--color-debit-text)] text-[var(--color-debit-text)] rounded-lg px-3 py-1.5 text-xs hover:bg-[var(--color-debit-bg)] transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete the old Clients page**

```bash
git rm ebenezer-frontend/src/pages/Clients.tsx
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: no errors from `Bookings.tsx`; only `Dashboard.tsx` (Task 11) and `App.tsx`/`Navbar.tsx` (still referencing deleted pages) remain.

- [ ] **Step 4: Commit**

```bash
git add ebenezer-frontend/src/pages/Bookings.tsx
git commit -m "feat: add Bookings list with checkout action, remove Clients page"
```

---

### Task 11: Wire routing/nav + update Dashboard

**Files:**
- Modify: `ebenezer-frontend/src/App.tsx`
- Modify: `ebenezer-frontend/src/components/Navbar.tsx`
- Modify: `ebenezer-frontend/src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `Rooms` (Task 8), `BookingForm` (Task 9), `Bookings` (Task 10), `DailySummary`/`Booking` types (Task 7).
- Produces: fully wired app — `/rooms`, `/bookings`, `/bookings/new` routes; nav links; dashboard showing occupancy + overdue banner + today's bookings table.

- [ ] **Step 1: Update `src/App.tsx`**

```tsx
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Rooms from "./pages/Rooms";
import Bookings from "./pages/Bookings";
import BookingForm from "./pages/BookingForm";
import Expenses from "./pages/Expenses";
import ExpenseForm from "./pages/ExpenseForm";
import Users from "./pages/Users";
import AddUser from "./pages/AddUser";

function LoginOrRedirect() {
  const { user } = useAuth();
  if (user) return <Navigate to={user.role === "ADMIN" ? "/dashboard" : "/bookings"} replace />;
  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginOrRedirect />} />

        <Route element={<ProtectedRoute allow={["ADMIN"]} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/users/new" element={<AddUser />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/bookings/new" element={<BookingForm />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/expenses/new" element={<ExpenseForm />} />
          <Route path="/expenses/:id/edit" element={<ExpenseForm />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Update `src/components/Navbar.tsx`**

Replace the `<nav>` block's links (keep the rest of the file — `handleLogout`, header markup — unchanged):

```tsx
<nav className="flex items-center gap-7">
  {user?.role === "ADMIN" && (
    <NavLink to="/dashboard" className={linkClass}>
      Dashboard
    </NavLink>
  )}
  <NavLink to="/rooms" className={linkClass}>
    Rooms
  </NavLink>
  <NavLink to="/bookings" className={linkClass}>
    Bookings
  </NavLink>
  <NavLink to="/expenses" className={linkClass}>
    Expenses
  </NavLink>
  {user?.role === "ADMIN" && (
    <NavLink to="/users" className={linkClass}>
      Users
    </NavLink>
  )}

  <button
    onClick={handleLogout}
    className="text-sm border border-[var(--color-debit-text)] text-[var(--color-debit-text)] rounded-lg px-3.5 py-1.5 hover:bg-[var(--color-debit-bg)] transition-colors"
  >
    Logout
  </button>
</nav>
```

- [ ] **Step 3: Replace `src/pages/Dashboard.tsx`**

```tsx
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getDailySummary } from "../api/dashboard";
import type { DailySummary } from "../types";
import { formatMoney, formatDateTime, toDateInputValue } from "../lib/format";
import { getErrorMessage } from "../api/client";
import StatCard from "../components/StatCard";
import Badge from "../components/Badge";

export default function Dashboard() {
  const { user } = useAuth();
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDailySummary(date)
      .then((data) => !cancelled && setSummary(data))
      .catch((err) => !cancelled && setError(getErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">Welcome back, {user?.fullName}</p>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5 text-[var(--color-muted)]">Date</label>
          <input
            type="date"
            value={date}
            max={toDateInputValue(new Date())}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-2 text-sm outline-none focus:border-[var(--color-ink)]"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 text-sm text-[var(--color-debit-text)]">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-10 text-sm text-[var(--color-muted)]">Loading summary…</p>
      ) : summary ? (
        <>
          {summary.overdueCount > 0 && (
            <div className="mt-6 rounded-xl border border-[var(--color-debit-text)] bg-[var(--color-debit-bg)] px-6 py-4">
              <p className="text-sm font-semibold text-[var(--color-debit-text)]">
                Attention required — {summary.overdueCount} overdue{" "}
                {summary.overdueCount === 1 ? "guest" : "guests"}
              </p>
              <ul className="mt-2 space-y-1">
                {summary.overdueBookings.map((b) => (
                  <li key={b.id} className="text-sm text-[var(--color-debit-text)]">
                    Room {b.room.roomNumber} — {b.guest.fullName} — expected checkout{" "}
                    {formatDateTime(b.expectedCheckOut)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard label="Total Income" value={formatMoney(summary.totalIncome)} accent="in" />
            <StatCard label="Total Expenses" value={formatMoney(summary.totalExpenses)} accent="out" />
            <StatCard label="Net Income" value={formatMoney(summary.netIncome)} />
            <StatCard
              label="Occupancy"
              value={`${summary.occupancyRate}% (${summary.roomsOccupied}/${summary.roomsTotal})`}
            />
          </div>

          <section className="mt-10 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)]">
            <div className="px-6 py-5 border-b border-[var(--color-border)]">
              <h2 className="font-semibold">Checked in Today</h2>
            </div>
            {summary.bookings.length === 0 ? (
              <p className="px-6 py-8 text-sm text-[var(--color-muted)]">No check-ins recorded for this date.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-[var(--color-muted)] border-b border-[var(--color-border)]">
                      <th className="px-6 py-3 font-medium">Guest</th>
                      <th className="px-6 py-3 font-medium">Room</th>
                      <th className="px-6 py-3 font-medium">Nights</th>
                      <th className="px-6 py-3 font-medium">Paid</th>
                      <th className="px-6 py-3 font-medium">Logged by</th>
                      <th className="px-6 py-3 font-medium">Check-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.bookings.map((b) => (
                      <tr key={b.id} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="px-6 py-3.5">{b.guest.fullName}</td>
                        <td className="px-6 py-3.5">{b.room.roomNumber}</td>
                        <td className="px-6 py-3.5">{b.nights}</td>
                        <td className="px-6 py-3.5 tabular-nums">{formatMoney(b.amountPaid)}</td>
                        <td className="px-6 py-3.5 text-[var(--color-muted)]">{b.createdBy.fullName}</td>
                        <td className="px-6 py-3.5 text-[var(--color-muted)]">{formatDateTime(b.checkIn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-8 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)]">
            <div className="px-6 py-5 border-b border-[var(--color-border)]">
              <h2 className="font-semibold">Expenses</h2>
            </div>
            {summary.expenses.length === 0 ? (
              <p className="px-6 py-8 text-sm text-[var(--color-muted)]">No expenses recorded for this date.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-[var(--color-muted)] border-b border-[var(--color-border)]">
                      <th className="px-6 py-3 font-medium">Item</th>
                      <th className="px-6 py-3 font-medium">Type</th>
                      <th className="px-6 py-3 font-medium">Amount</th>
                      <th className="px-6 py-3 font-medium">Logged by</th>
                      <th className="px-6 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.expenses.map((e) => (
                      <tr key={e.id} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="px-6 py-3.5">{e.item}</td>
                        <td className="px-6 py-3.5">
                          <Badge tone="debit">Debit</Badge>
                        </td>
                        <td className="px-6 py-3.5 tabular-nums">{formatMoney(e.total)}</td>
                        <td className="px-6 py-3.5 text-[var(--color-muted)]">{e.createdBy.fullName}</td>
                        <td className="px-6 py-3.5 text-[var(--color-muted)]">{formatDateTime(e.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc -b && npm run lint`
Expected: both clean — no remaining references to `Client`, `clients.ts`, `Clients.tsx`, or `ClientForm.tsx` anywhere in `src/`.

- [ ] **Step 5: Manual walkthrough (no automated frontend tests exist — see Global Constraints)**

Run, in two terminals: `cd ebenezer-backend && npm run dev` and `cd ebenezer-frontend && npm run dev`. In the browser:
1. Log in as the seeded admin.
2. Visit `/rooms` — confirm the 5 seeded rooms show, all `AVAILABLE`.
3. Click **+ New Check-in**, fill in a guest, pick a room, submit — confirm redirect to `/bookings` and the new row appears with `checkoutStatus: IN_HOUSE`.
4. Revisit `/rooms` — confirm that room now shows `OCCUPIED`.
5. On `/bookings`, click **Checkout** on that booking — confirm its status flips to `CHECKED_OUT` and the room becomes `CLEANING` on `/rooms`.
6. Visit `/dashboard` — confirm occupancy, income, and the "Checked in Today" table reflect the booking just created.
7. Create a booking with `expectedCheckOut` in the past (e.g. edit the request in devtools, or temporarily set the datetime-local field to yesterday) and confirm it shows `OVERDUE` on `/bookings` and appears in the dashboard's "Attention required" banner.

- [ ] **Step 6: Commit**

```bash
git add ebenezer-frontend/src/App.tsx ebenezer-frontend/src/components/Navbar.tsx ebenezer-frontend/src/pages/Dashboard.tsx
git commit -m "feat: wire rooms/bookings routing and update dashboard"
```

---

## Self-Review Notes

- **Spec coverage:** §1 (domain model split) → Task 2. §2 (room engine + statuses) → Tasks 2, 4, 8. §3 (check-in workflow: pick room → dates → computed nights/amount → payment → confirm → room OCCUPIED) → Task 5 (`createBooking`) + Task 9 (`BookingForm`). §4 (automatic overdue, no manual check) → Task 3 (`computeCheckoutStatus`) + Task 5 (`listOverdueBookings`, `/api/bookings/overdue`) + Task 11 (dashboard banner). §11 (checkout as its own operation, ON_TIME/LATE/OVERDUE three states) → Task 3 + Task 5 (`POST /:id/checkout`) + Task 10. Roadmap table Phases 1–4 map 1:1 onto Tasks 2/4 (rooms), 5 (booking lifecycle + check-in/out), 3+5 (overdue).
- **Explicitly deferred, not silently dropped:** Alerts (Phase 5), payment balance/PAID status (Phase 6 — `amountPaid` exists but no `PAID`/`PARTIALLY_PAID`/`UNPAID` enum), reporting engine and occupancy trend graphs (Phases 7–10), reservations calendar / booking-ahead-of-arrival (Phase 9 — this plan's `createBooking` = immediate check-in, not a future reservation), stay extensions (§12), audit log (§15), PDF/Excel export (§16). Each is called out in "Out of scope" at the top so a later plan can pick it up without re-discovering the boundary.
- **Type consistency check:** `CheckoutStatus` (`booking.util.ts`) is used identically in `booking.service.ts`'s `withComputed`, `dashboard.service.ts`, and mirrored in the frontend `types/index.ts`. `RoomStatus` values (`AVAILABLE`/`OCCUPIED`/`RESERVED`/`CLEANING`/`MAINTENANCE`) match across the Prisma enum, `room.controller.ts`'s Zod enum, and the frontend `RoomStatus` type. `Booking` field names (`checkIn`, `expectedCheckOut`, `actualCheckOut`, `nights`, `bookingAmount`, `amountPaid`, `checkoutStatus`) are identical across schema, service, controller test assertions, and frontend type/pages.

---

## Execution Handoff

Two execution options:

1. **Subagent-Driven (recommended, and what was requested)** — dispatch a fresh subagent per task above, in order (Task 2 depends on Task 1; Task 4 depends on Tasks 2–3; Task 5 depends on Tasks 2–4; Task 6 depends on Task 5; Task 7 depends on Task 6's response shape; Tasks 8–10 depend on Task 7; Task 11 depends on Tasks 8–10). Review between tasks.
2. **Inline Execution** — execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.
