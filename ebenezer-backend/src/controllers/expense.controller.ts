import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as expenseService from "../services/expense.service";

const expenseSchema = z.object({
  date: z.string(),
  item: z.string().min(1),
  description: z.string().nullable().optional(),
  amountCash: z.number().nonnegative(),
  amountMomo: z.number().nonnegative(),
  remarks: z.string().nullable().optional(),
});

const updateExpenseSchema = expenseSchema.partial();

export async function listExpensesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    res.json(await expenseService.listExpenses(req.user!, date));
  } catch (err) {
    next(err);
  }
}

export async function getExpenseHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await expenseService.getExpense(req.user!, req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function createExpenseHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = expenseSchema.parse(req.body);
    res.status(201).json(await expenseService.createExpense(req.user!, input));
  } catch (err) {
    next(err);
  }
}

// Route-guarded to ADMIN only — same view-only rule as clients for workers.
export async function updateExpenseHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateExpenseSchema.parse(req.body);
    res.json(await expenseService.updateExpense(req.params.id, input));
  } catch (err) {
    next(err);
  }
}

export async function deleteExpenseHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await expenseService.deleteExpense(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
