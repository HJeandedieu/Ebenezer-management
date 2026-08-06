import { prisma } from "../config/db";
import { AppError } from "../middleware/error.middleware";
import { JwtPayload } from "../types";

export interface ClientInput {
  date: string; // ISO date
  roomNo: string;
  guestName: string;
  checkIn: string; // ISO datetime
  checkOut: string; // ISO datetime — required upfront, like the paper form
  nights: number;
  amountCash: number;
  amountMomo: number;
  remarks?: string | null;
}

function toDecimalTotal(cash: number, momo: number) {
  return cash + momo;
}

// Admin sees everything. Workers see only entries they personally created,
// and (per business rule) cannot edit or delete them — view + create only.
export async function listClients(user: JwtPayload, dateFilter?: string) {
  return prisma.client.findMany({
    where: {
      ...(user.role === "WORKER" ? { createdById: user.id } : {}),
      ...(dateFilter ? { date: new Date(dateFilter) } : {}),
    },
    include: { createdBy: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClient(user: JwtPayload, id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: { createdBy: { select: { id: true, fullName: true } } },
  });

  if (!client) throw new AppError("Client entry not found", 404);
  if (user.role === "WORKER" && client.createdById !== user.id) {
    throw new AppError("You do not have permission to view this entry", 403);
  }

  return client;
}

export async function createClient(user: JwtPayload, input: ClientInput) {
  return prisma.client.create({
    data: {
      date: new Date(input.date),
      roomNo: input.roomNo,
      guestName: input.guestName,
      checkIn: new Date(input.checkIn),
      checkOut: new Date(input.checkOut),
      nights: input.nights,
      amountCash: input.amountCash,
      amountMomo: input.amountMomo,
      total: toDecimalTotal(input.amountCash, input.amountMomo),
      remarks: input.remarks ?? null,
      createdById: user.id,
    },
  });
}

// Admin-only: workers cannot edit or delete, even their own entries.
export async function updateClient(id: string, input: Partial<ClientInput>) {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) throw new AppError("Client entry not found", 404);

  const cash = input.amountCash ?? Number(existing.amountCash);
  const momo = input.amountMomo ?? Number(existing.amountMomo);

  return prisma.client.update({
    where: { id },
    data: {
      ...(input.date && { date: new Date(input.date) }),
      ...(input.roomNo && { roomNo: input.roomNo }),
      ...(input.guestName && { guestName: input.guestName }),
      ...(input.checkIn && { checkIn: new Date(input.checkIn) }),
      ...(input.checkOut !== undefined && {
        checkOut: new Date(input.checkOut),
      }),
      ...(input.nights !== undefined && { nights: input.nights }),
      ...(input.amountCash !== undefined && { amountCash: input.amountCash }),
      ...(input.amountMomo !== undefined && { amountMomo: input.amountMomo }),
      total: toDecimalTotal(cash, momo),
      ...(input.remarks !== undefined && { remarks: input.remarks }),
    },
  });
}

export async function deleteClient(id: string) {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) throw new AppError("Client entry not found", 404);
  await prisma.client.delete({ where: { id } });
}
