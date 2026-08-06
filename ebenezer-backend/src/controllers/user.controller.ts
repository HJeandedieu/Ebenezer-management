import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as userService from "../services/user.service";

const createUserSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "WORKER"]).optional(),
});

export async function listUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await userService.listUsers());
  } catch (err) {
    next(err);
  }
}

export async function createUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createUserSchema.parse(req.body);
    res.status(201).json(await userService.createUser(input));
  } catch (err) {
    next(err);
  }
}

export async function deleteUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await userService.deleteUser(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
