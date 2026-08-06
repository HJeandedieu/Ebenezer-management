import { api } from "./client";
import type { AuthUser, Role } from "../types";

export async function listUsers() {
  const { data } = await api.get<AuthUser[]>("/users");
  return data;
}

export async function createUser(input: {
  fullName: string;
  email: string;
  password: string;
  role: Role;
}) {
  const { data } = await api.post<AuthUser>("/users", input);
  return data;
}

export async function deleteUser(id: string) {
  await api.delete(`/users/${id}`);
}
