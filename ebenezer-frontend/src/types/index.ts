export type Role = "ADMIN" | "WORKER";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface Client {
  id: string;
  date: string;
  roomNo: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  amountCash: string;
  amountMomo: string;
  total: string;
  remarks: string | null;
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
  totalClients: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  clients: Client[];
  expenses: Expense[];
}
