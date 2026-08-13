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
