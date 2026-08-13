import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import roomRoutes from "./routes/room.routes";
import bookingRoutes from "./routes/booking.routes";
import expenseRoutes from "./routes/expense.routes";
import dashboardRoutes from "./routes/dashboard.routes";

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
