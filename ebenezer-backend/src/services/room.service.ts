import { prisma } from "../config/db";
import { AppError } from "../middleware/error.middleware";
import type { RoomStatus } from "@prisma/client";

export interface RoomInput {
  roomNumber: string;
  type?: string | null;
  pricePerNight: number;
}

export interface RoomUpdateInput extends Partial<RoomInput> {
  status?: RoomStatus;
}

export async function listRooms() {
  return prisma.room.findMany({ orderBy: { roomNumber: "asc" } });
}

export async function getRoom(id: string) {
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) throw new AppError("Room not found", 404);
  return room;
}

export async function createRoom(input: RoomInput) {
  return prisma.room.create({
    data: {
      roomNumber: input.roomNumber,
      type: input.type ?? null,
      pricePerNight: input.pricePerNight,
    },
  });
}

export async function updateRoom(id: string, input: RoomUpdateInput) {
  const existing = await prisma.room.findUnique({ where: { id } });
  if (!existing) throw new AppError("Room not found", 404);

  return prisma.room.update({
    where: { id },
    data: {
      ...(input.roomNumber && { roomNumber: input.roomNumber }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.pricePerNight !== undefined && { pricePerNight: input.pricePerNight }),
      ...(input.status && { status: input.status }),
    },
  });
}
