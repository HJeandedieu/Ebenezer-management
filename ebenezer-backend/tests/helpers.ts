import { prisma } from "../src/config/db";
import { env } from "../src/config/env";
import { signToken } from "../src/utils/jwt";
import type { Role, RoomStatus } from "@prisma/client";

export async function resetDb() {
  // Safety guard: this wipes every row in these tables before EVERY test. It has
  // already fired against the shared dev DB once by accident (wiped the seeded
  // admin). Refuse to run unless DATABASE_URL is clearly a local database.
  if (!env.databaseUrl.includes("localhost") && !env.databaseUrl.includes("127.0.0.1")) {
    throw new Error(
      "resetDb() refused to run: DATABASE_URL does not point at localhost/127.0.0.1. " +
        "Tests destroy all data in the target database — never point DATABASE_URL at a " +
        "shared or production database when running `npm test`.",
    );
  }

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
