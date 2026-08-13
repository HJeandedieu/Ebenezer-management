import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listBookings, checkoutBooking, deleteBooking } from "../api/bookings";
import type { Booking, CheckoutStatus } from "../types";
import { formatMoney, formatDateTime } from "../lib/format";
import { getErrorMessage } from "../api/client";
import Badge from "../components/Badge";

const CHECKOUT_TONE: Record<CheckoutStatus, "available" | "occupied" | "warn" | "neutral"> = {
  IN_HOUSE: "occupied",
  OVERDUE: "warn",
  ON_TIME: "available",
  LATE: "warn",
};

export default function Bookings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listBookings()
      .then(setBookings)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCheckout(id: string) {
    setActingId(id);
    try {
      const updated = await checkoutBooking(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setActingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this booking? This cannot be undone.")) return;
    try {
      await deleteBooking(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{isAdmin ? "All Bookings" : "My Bookings"}</h1>
          {!isAdmin && (
            <p className="text-sm text-[var(--color-muted)] mt-1">
              Bookings you've checked in. Contact an admin to make corrections.
            </p>
          )}
        </div>
        <Link
          to="/bookings/new"
          className="bg-[var(--color-ink)] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + New Check-in
        </Link>
      </div>

      <div className="mt-6 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-sm text-[var(--color-muted)]">Loading…</p>
        ) : error ? (
          <p className="px-6 py-8 text-sm text-[var(--color-debit-text)]">{error}</p>
        ) : bookings.length === 0 ? (
          <p className="px-6 py-8 text-sm text-[var(--color-muted)]">
            No bookings yet. Check in the first guest to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-[var(--color-muted)] border-b border-[var(--color-border)]">
                  <th className="px-6 py-3 font-medium">Guest</th>
                  <th className="px-6 py-3 font-medium">Room</th>
                  <th className="px-6 py-3 font-medium">Check-in</th>
                  <th className="px-6 py-3 font-medium">Expected Checkout</th>
                  <th className="px-6 py-3 font-medium">Nights</th>
                  <th className="px-6 py-3 font-medium">Paid</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-6 py-3.5 font-medium">{b.guest.fullName}</td>
                    <td className="px-6 py-3.5">{b.room.roomNumber}</td>
                    <td className="px-6 py-3.5 text-[var(--color-muted)]">{formatDateTime(b.checkIn)}</td>
                    <td className="px-6 py-3.5 text-[var(--color-muted)]">{formatDateTime(b.expectedCheckOut)}</td>
                    <td className="px-6 py-3.5">{b.nights}</td>
                    <td className="px-6 py-3.5 tabular-nums">{formatMoney(b.amountPaid)}</td>
                    <td className="px-6 py-3.5">
                      <Badge tone={CHECKOUT_TONE[b.checkoutStatus]}>{b.checkoutStatus}</Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex gap-2">
                        {b.status === "CHECKED_IN" && (
                          <button
                            onClick={() => handleCheckout(b.id)}
                            disabled={actingId === b.id}
                            className="border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs hover:bg-[var(--color-canvas)] transition-colors disabled:opacity-60"
                          >
                            {actingId === b.id ? "Checking out…" : "Checkout"}
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(b.id)}
                            className="border border-[var(--color-debit-text)] text-[var(--color-debit-text)] rounded-lg px-3 py-1.5 text-xs hover:bg-[var(--color-debit-bg)] transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
