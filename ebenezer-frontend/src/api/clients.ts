import { api } from "./client";
import type { Client } from "../types";

export interface ClientInput {
  date: string;
  roomNo: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  amountCash: number;
  amountMomo: number;
  remarks?: string | null;
}

export async function listClients(date?: string) {
  const { data } = await api.get<Client[]>("/clients", { params: date ? { date } : {} });
  return data;
}

export async function createClient(input: ClientInput) {
  const { data } = await api.post<Client>("/clients", input);
  return data;
}

export async function updateClient(id: string, input: Partial<ClientInput>) {
  const { data } = await api.put<Client>(`/clients/${id}`, input);
  return data;
}

export async function deleteClient(id: string) {
  await api.delete(`/clients/${id}`);
}
