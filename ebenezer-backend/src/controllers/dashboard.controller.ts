import { Request, Response, NextFunction } from "express";
import * as dashboardService from "../services/dashboard.service";

export async function getDailySummaryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    res.json(await dashboardService.getDailySummary(date));
  } catch (err) {
    next(err);
  }
}
