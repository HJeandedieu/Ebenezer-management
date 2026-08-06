import { prisma } from "../config/db";

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

// Returns clients + expenses for the given day, plus totals — this is the
// "admin views all clients received today, and income/expense stats" screen.
export async function getDailySummary(dateStr?: string) {
  const day = dateStr ? new Date(dateStr) : new Date();
  const range = { gte: startOfDay(day), lte: endOfDay(day) };

  const [clients, expenses, totalUsers] = await Promise.all([
    prisma.client.findMany({
      where: { date: range },
      include: { createdBy: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.expense.findMany({
      where: { date: range },
      include: { createdBy: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
  ]);

  const totalIncome = clients.reduce((sum: number, c) => sum + Number(c.total), 0);
  const totalExpenses = expenses.reduce((sum: number, e) => sum + Number(e.total), 0);

  return {
    date: day.toISOString().slice(0, 10),
    totalUsers,
    totalClients: clients.length,
    totalIncome,
    totalExpenses,
    netIncome: totalIncome - totalExpenses,
    clients,
    expenses,
  };
}
