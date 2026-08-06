import { Role } from "@prisma/client";
import { prisma } from "../config/db";
import { hashPassword } from "../utils/hash";
import { AppError } from "../middleware/error.middleware";

const userSafeSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  createdAt: true,
};

export async function listUsers() {
  return prisma.user.findMany({
    select: userSafeSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function createUser(input: {
  fullName: string;
  email: string;
  password: string;
  role?: Role;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError("A user with this email already exists", 409);
  }

  const hashed = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      password: hashed,
      role: input.role ?? "WORKER",
    },
    select: userSafeSelect,
  });
}

export async function deleteUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError("User not found", 404);
  }
  if (user.role === "ADMIN") {
    throw new AppError("Cannot delete an admin account", 400);
  }
  await prisma.user.delete({ where: { id } });
}
