import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { getDailySummaryHandler } from "../controllers/dashboard.controller";

const router = Router();

// Admin-only: "view all clients received in the day + income/expense stats"
router.get("/summary", requireAuth, requireRole("ADMIN"), getDailySummaryHandler);

export default router;
