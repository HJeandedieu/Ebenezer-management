import { api } from "./client";
import type { Expense } from "../types";

export interface ExpenseInput {
  date: string;
  item: string;
  description?: string | null;
  amountCash: number;
  amountMomo: number;
  remarks?: string | null;
}

export async function listExpenses(date?: string) {
  const { data } = await api.get<Expense[]>("/expenses", { params: date ? { date } : {} });
  return data;
}

export async function createExpense(input: ExpenseInput) {
  const { data } = await api.post<Expense>("/expenses", input);
  return data;
}

export async function updateExpense(id: string, input: Partial<ExpenseInput>) {
  const { data } = await api.put<Expense>(`/expenses/${id}`, input);
  return data;
}

export async function deleteExpense(id: string) {
  await api.delete(`/expenses/${id}`);
}
