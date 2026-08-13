import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listRooms, updateRoom } from "../api/rooms";
import type { Room, RoomStatus } from "../types";
import { formatMoney } from "../lib/format";
import { getErrorMessage } from "../api/client";
import Badge from "../components/Badge";
import { useAuth } from "../context/AuthContext";

const STATUS_TONE: Record<RoomStatus, "available" | "occupied" | "warn" | "neutral"> = {
  AVAILABLE: "available",
  OCCUPIED: "occupied",
  RESERVED: "neutral",
  CLEANING: "neutral",
  MAINTENANCE: "warn",
};

export default function Rooms() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listRooms()
      .then(setRooms)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleMarkReady(id: string) {
    setActingId(id);
    try {
      await updateRoom(id, { status: "AVAILABLE" });
      load();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setActingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Rooms</h1>
        <Link
          to="/bookings/new"
          className="bg-[var(--color-ink)] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + New Check-in
        </Link>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-[var(--color-muted)]">Loading…</p>
      ) : error ? (
        <p role="alert" className="mt-8 text-sm text-[var(--color-debit-text)]">
          {error}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div key={room.id} className="bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-5">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">{room.roomNumber}</span>
                <Badge tone={STATUS_TONE[room.status]}>{room.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-[var(--color-muted)]">{room.type ?? "Standard"}</p>
              <p className="mt-3 text-sm tabular-nums">{formatMoney(room.pricePerNight)} / night</p>
              {isAdmin && (room.status === "CLEANING" || room.status === "MAINTENANCE") && (
                <button
                  onClick={() => handleMarkReady(room.id)}
                  disabled={actingId === room.id}
                  className="mt-4 border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs hover:bg-[var(--color-canvas)] transition-colors disabled:opacity-60"
                >
                  {actingId === room.id ? "Marking ready…" : "Mark Ready"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
