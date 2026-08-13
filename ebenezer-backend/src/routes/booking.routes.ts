// src/routes/booking.routes.ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import {
  listBookingsHandler,
  listOverdueBookingsHandler,
  getBookingHandler,
  createBookingHandler,
  checkoutBookingHandler,
  updateBookingHandler,
  deleteBookingHandler,
} from "../controllers/booking.controller";

const router = Router();

router.use(requireAuth);

// Static path before ":id" so "overdue" isn't swallowed as a booking id.
router.get("/overdue", listOverdueBookingsHandler);
router.get("/", listBookingsHandler);
router.get("/:id", getBookingHandler);
router.post("/", createBookingHandler);
router.post("/:id/checkout", checkoutBookingHandler);

router.put("/:id", requireRole("ADMIN"), updateBookingHandler);
router.delete("/:id", requireRole("ADMIN"), deleteBookingHandler);

export default router;
