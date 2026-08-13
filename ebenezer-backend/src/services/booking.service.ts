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

    // Update the room status before creating the booking (with its included room
    // snapshot) so the returned booking reflects the room's post-transaction state.
    await tx.room.update({ where: { id: room.id }, data: { status: "OCCUPIED" } });

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
    // Update the room status first so the booking's included room snapshot
    // (fetched below) reflects the post-transaction CLEANING state.
    await tx.room.update({ where: { id: booking.roomId }, data: { status: "CLEANING" } });
    const result = await tx.booking.update({
      where: { id },
      data: { actualCheckOut, status: "CHECKED_OUT" },
      include: bookingInclude,
    });
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
