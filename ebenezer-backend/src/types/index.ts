import { Role } from "@prisma/client";

export interface JwtPayload {
  id: string;
  role: Role;
}

// Augment Express's Request with the authenticated user, set by auth.middleware
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export interface ApiError {
  message: string;
  details?: unknown;
}
