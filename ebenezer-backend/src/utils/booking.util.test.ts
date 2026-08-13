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
