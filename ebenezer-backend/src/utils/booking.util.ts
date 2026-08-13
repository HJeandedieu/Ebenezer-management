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
