import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  listUsersHandler,
  createUserHandler,
  deleteUserHandler,
} from "../controllers/user.controller";

const router = Router();

// Every route here is admin-only: only the admin manages worker accounts.
router.use(requireAuth, requireRole("ADMIN"));

router.get("/", listUsersHandler);
router.post("/", createUserHandler);
router.delete("/:id", deleteUserHandler);

export default router;
