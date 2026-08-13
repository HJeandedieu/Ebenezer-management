import { prisma } from "../config/db";
import { listBookingsByCheckInDate, listOverdueBookings } from "./booking.service";

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

// The reception/manager "what's happening today" screen: bookings checked in
// today, today's expenses, room occupancy right now, and guests overdue right now.
export async function getDailySummary(dateStr?: string) {
  const day = dateStr ? new Date(dateStr) : new Date();
  const dateOnly = day.toISOString().slice(0, 10);
  const expenseRange = { gte: startOfDay(day), lte: endOfDay(day) };

  const [bookings, expenses, totalUsers, rooms, overdueBookings] = await Promise.all([
    listBookingsByCheckInDate(dateOnly),
    prisma.expense.findMany({
      where: { date: expenseRange },
      include: { createdBy: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
    prisma.room.findMany(),
    listOverdueBookings(),
  ]);

  const totalIncome = bookings.reduce((sum, b) => sum + b.amountPaid, 0);
  const totalExpenses = expenses.reduce((sum: number, e) => sum + Number(e.total), 0);
  const roomsTotal = rooms.length;
  const roomsOccupied = rooms.filter((r) => r.status === "OCCUPIED").length;

  return {
    date: dateOnly,
    totalUsers,
    totalBookings: bookings.length,
    totalIncome,
    totalExpenses,
    netIncome: totalIncome - totalExpenses,
    roomsTotal,
    roomsOccupied,
    occupancyRate: roomsTotal === 0 ? 0 : Math.round((roomsOccupied / roomsTotal) * 100),
    overdueCount: overdueBookings.length,
    overdueBookings,
    bookings,
    expenses,
  };
}
