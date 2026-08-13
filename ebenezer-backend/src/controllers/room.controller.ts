import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as roomService from "../services/room.service";

const roomSchema = z.object({
  roomNumber: z.string().min(1),
  type: z.string().nullable().optional(),
  pricePerNight: z.number().nonnegative(),
});

const updateRoomSchema = roomSchema.partial().extend({
  status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING", "MAINTENANCE"]).optional(),
});

export async function listRoomsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await roomService.listRooms());
  } catch (err) {
    next(err);
  }
}

export async function getRoomHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await roomService.getRoom(req.params.id));
  } catch (err) {
    next(err);
  }
}

export async function createRoomHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = roomSchema.parse(req.body);
    res.status(201).json(await roomService.createRoom(input));
  } catch (err) {
    next(err);
  }
}

export async function updateRoomHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateRoomSchema.parse(req.body);
    res.json(await roomService.updateRoom(req.params.id, input));
  } catch (err) {
    next(err);
  }
}
