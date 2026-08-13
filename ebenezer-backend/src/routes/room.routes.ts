import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  listRoomsHandler,
  getRoomHandler,
  createRoomHandler,
  updateRoomHandler,
} from "../controllers/room.controller";

const router = Router();

router.use(requireAuth);

// Everyone (admin + worker) can see the room board to pick a room at check-in.
router.get("/", listRoomsHandler);
router.get("/:id", getRoomHandler);

// Admin-only: adding rooms and changing status/rates is a management action.
router.post("/", requireRole("ADMIN"), createRoomHandler);
router.put("/:id", requireRole("ADMIN"), updateRoomHandler);

export default router;
