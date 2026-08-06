import { api } from "./client";
import type { DailySummary } from "../types";

export async function getDailySummary(date?: string) {
  const { data } = await api.get<DailySummary>("/dashboard/summary", {
    params: date ? { date } : {},
  });
  return data;
}
