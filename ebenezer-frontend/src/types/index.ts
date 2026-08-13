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
