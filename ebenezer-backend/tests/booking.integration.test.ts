// tests/booking.integration.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app";
import { resetDb, createTestUser, createTestRoom } from "./helpers";

beforeEach(resetDb);

// Takes an explicit `now` reference so two calls used together for the same
// interval (e.g. checkIn/expectedCheckOut) derive from one shared timestamp
// instead of two independent `Date.now()` reads a few ms apart — that gap
// would otherwise push an exact N-night stay to N+1 nights (computeNights
// rounds any partial night up, by design).
function isoDaysFromNow(now: number, days: number) {
  return new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
}

describe("bookings API", () => {
  it("checks a guest in: creates guest+booking+payments, occupies the room", async () => {
    const { token } = await createTestUser("WORKER");
    const room = await createTestRoom({ roomNumber: "301", pricePerNight: 20000 });
    const now = Date.now();

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        roomId: room.id,
        guest: { fullName: "Jean Paul", phone: "0788000000" },
        checkIn: isoDaysFromNow(now, 0),
        expectedCheckOut: isoDaysFromNow(now, 2),
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
    const now = Date.now();

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        roomId: room.id,
        guest: { fullName: "Alice" },
        checkIn: isoDaysFromNow(now, 0),
        expectedCheckOut: isoDaysFromNow(now, 1),
        amountCash: 0,
        amountMomo: 0,
      });

    expect(res.status).toBe(409);
  });

  it("flags a booking as OVERDUE once expectedCheckOut has passed", async () => {
    const { token } = await createTestUser("WORKER");
    const room = await createTestRoom({ roomNumber: "302", pricePerNight: 20000 });
    const now = Date.now();

    const created = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        roomId: room.id,
        guest: { fullName: "Overdue Guest" },
        checkIn: isoDaysFromNow(now, -3),
        expectedCheckOut: isoDaysFromNow(now, -1),
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
    const now = Date.now();

    const created = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        roomId: room.id,
        guest: { fullName: "David" },
        checkIn: isoDaysFromNow(now, 0),
        expectedCheckOut: isoDaysFromNow(now, 1),
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
    const now = Date.now();

    await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${worker.token}`)
      .send({
        roomId: room.id,
        guest: { fullName: "Worker's Guest" },
        checkIn: isoDaysFromNow(now, 0),
        expectedCheckOut: isoDaysFromNow(now, 1),
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
    const now = Date.now();

    const created = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        roomId: room.id,
        guest: { fullName: "Mistake Entry" },
        checkIn: isoDaysFromNow(now, 0),
        expectedCheckOut: isoDaysFromNow(now, 1),
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
