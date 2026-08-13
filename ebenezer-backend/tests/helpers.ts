import { prisma } from "../src/config/db";
import { signToken } from "../src/utils/jwt";
import type { Role, RoomStatus } from "@prisma/client";

export async function resetDb() {
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.guest.deleteMany();
  await prisma.room.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.user.deleteMany();
}

let counter = 0;

export async function createTestUser(role: Role = "WORKER") {
  counter += 1;
  const user = await prisma.user.create({
    data: {
      fullName: `Test ${role} ${counter}`,
      email: `test-${role.toLowerCase()}-${counter}@example.com`,
      password: "unused-in-tests",
      role,
    },
  });
  const token = signToken({ id: user.id, role: user.role });
  return { user, token };
}

export async function createTestRoom(overrides: Partial<{
  roomNumber: string;
  type: string;
  pricePerNight: number;
  status: RoomStatus;
}> = {}) {
  counter += 1;
  return prisma.room.create({
    data: {
      roomNumber: overrides.roomNumber ?? `T${counter}`,
      type: overrides.type ?? "Standard",
      pricePerNight: overrides.pricePerNight ?? 20000,
      status: overrides.status ?? "AVAILABLE",
    },
  });
}
