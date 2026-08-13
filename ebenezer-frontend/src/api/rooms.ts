import { api } from "./client";
import type { Room, RoomStatus } from "../types";

export interface RoomInput {
  roomNumber: string;
  type?: string | null;
  pricePerNight: number;
}

export async function listRooms() {
  const { data } = await api.get<Room[]>("/rooms");
  return data;
}

export async function createRoom(input: RoomInput) {
  const { data } = await api.post<Room>("/rooms", input);
  return data;
}

export async function updateRoom(id: string, input: Partial<RoomInput & { status: RoomStatus }>) {
  const { data } = await api.put<Room>(`/rooms/${id}`, input);
  return data;
}
