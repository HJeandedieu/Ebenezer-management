import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";
import Navbar from "./Navbar";

export default function ProtectedRoute({ allow }: { allow?: Role[] }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(user.role)) return <Navigate to="/bookings" replace />;

  return (
    <div className="min-h-screen bg-[var(--color-canvas)]">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
