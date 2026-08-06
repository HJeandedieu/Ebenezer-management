import { prisma } from "../config/db";
import { AppError } from "../middleware/error.middleware";
import { JwtPayload } from "../types";

export interface ExpenseInput {
  date: string;
  item: string;
  description?: string | null;
  amountCash: number;
  amountMomo: number;
  remarks?: string | null;
}

function toDecimalTotal(cash: number, momo: number) {
  return cash + momo;
}

export async function listExpenses(user: JwtPayload, dateFilter?: string) {
  return prisma.expense.findMany({
    where: {
      ...(user.role === "WORKER" ? { createdById: user.id } : {}),
      ...(dateFilter ? { date: new Date(dateFilter) } : {}),
    },
    include: { createdBy: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getExpense(user: JwtPayload, id: string) {
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { createdBy: { select: { id: true, fullName: true } } },
  });

  if (!expense) throw new AppError("Expense entry not found", 404);
  if (user.role === "WORKER" && expense.createdById !== user.id) {
    throw new AppError("You do not have permission to view this entry", 403);
  }

  return expense;
}

export async function createExpense(user: JwtPayload, input: ExpenseInput) {
  return prisma.expense.create({
    data: {
      date: new Date(input.date),
      item: input.item,
      description: input.description ?? null,
      amountCash: input.amountCash,
      amountMomo: input.amountMomo,
      total: toDecimalTotal(input.amountCash, input.amountMomo),
      remarks: input.remarks ?? null,
      createdById: user.id,
    },
  });
}

// Admin-only, same view-only rule as clients applies to workers.
export async function updateExpense(id: string, input: Partial<ExpenseInput>) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw new AppError("Expense entry not found", 404);

  const cash = input.amountCash ?? Number(existing.amountCash);
  const momo = input.amountMomo ?? Number(existing.amountMomo);

  return prisma.expense.update({
    where: { id },
    data: {
      ...(input.date && { date: new Date(input.date) }),
      ...(input.item && { item: input.item }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.amountCash !== undefined && { amountCash: input.amountCash }),
      ...(input.amountMomo !== undefined && { amountMomo: input.amountMomo }),
      total: toDecimalTotal(cash, momo),
      ...(input.remarks !== undefined && { remarks: input.remarks }),
    },
  });
}

export async function deleteExpense(id: string) {
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) throw new AppError("Expense entry not found", 404);
  await prisma.expense.delete({ where: { id } });
}
