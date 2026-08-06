import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  listClientsHandler,
  getClientHandler,
  createClientHandler,
  updateClientHandler,
  deleteClientHandler,
} from "../controllers/client.controller";

const router = Router();

router.use(requireAuth);

// Workers: view own entries + create new ones (filling the form for a new guest).
router.get("/", listClientsHandler);
router.get("/:id", getClientHandler);
router.post("/", createClientHandler);

// Admin only: editing/deleting entries.
router.put("/:id", requireRole("ADMIN"), updateClientHandler);
router.delete("/:id", requireRole("ADMIN"), deleteClientHandler);

export default router;
