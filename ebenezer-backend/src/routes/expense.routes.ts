import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  listExpensesHandler,
  getExpenseHandler,
  createExpenseHandler,
  updateExpenseHandler,
  deleteExpenseHandler,
} from "../controllers/expense.controller";

const router = Router();

router.use(requireAuth);

router.get("/", listExpensesHandler);
router.get("/:id", getExpenseHandler);
router.post("/", createExpenseHandler);

router.put("/:id", requireRole("ADMIN"), updateExpenseHandler);
router.delete("/:id", requireRole("ADMIN"), deleteExpenseHandler);

export default router;
