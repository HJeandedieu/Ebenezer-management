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
