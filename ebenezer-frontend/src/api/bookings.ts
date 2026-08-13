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
