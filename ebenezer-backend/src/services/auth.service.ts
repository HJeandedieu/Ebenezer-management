import { prisma } from "../config/db";
import { comparePassword } from "../utils/hash";
import { signToken } from "../utils/jwt";
import { AppError } from "../middleware/error.middleware";

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    throw new AppError("Invalid email or password", 401);
  }

  // The token carries the role, so the frontend/API can decide
  // admin vs worker routing purely from what login returns.
  const token = signToken({ id: user.id, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  };
}
