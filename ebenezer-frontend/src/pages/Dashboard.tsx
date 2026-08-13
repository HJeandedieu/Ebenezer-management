import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getDailySummary } from "../api/dashboard";
import type { DailySummary } from "../types";
import { formatMoney, formatDateTime, toDateInputValue } from "../lib/format";
import { getErrorMessage } from "../api/client";
import StatCard from "../components/StatCard";
import Badge from "../components/Badge";

export default function Dashboard() {
  const { user } = useAuth();
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDailySummary(date)
      .then((data) => !cancelled && setSummary(data))
      .catch((err) => !cancelled && setError(getErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">Welcome back, {user?.fullName}</p>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5 text-[var(--color-muted)]">Date</label>
          <input
            type="date"
            value={date}
            max={toDateInputValue(new Date())}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-2 text-sm outline-none focus:border-[var(--color-ink)]"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 text-sm text-[var(--color-debit-text)]">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-10 text-sm text-[var(--color-muted)]">Loading summary…</p>
      ) : summary ? (
        <>
          {summary.overdueCount > 0 && (
            <div className="mt-6 rounded-xl border border-[var(--color-debit-text)] bg-[var(--color-debit-bg)] px-6 py-4">
              <p className="text-sm font-semibold text-[var(--color-debit-text)]">
                Attention required — {summary.overdueCount} overdue{" "}
                {summary.overdueCount === 1 ? "guest" : "guests"}
              </p>
              <ul className="mt-2 space-y-1">
                {summary.overdueBookings.map((b) => (
                  <li key={b.id} className="text-sm text-[var(--color-debit-text)]">
                    Room {b.room.roomNumber} — {b.guest.fullName} — expected checkout{" "}
                    {formatDateTime(b.expectedCheckOut)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard label="Total Income" value={formatMoney(summary.totalIncome)} accent="in" />
            <StatCard label="Total Expenses" value={formatMoney(summary.totalExpenses)} accent="out" />
            <StatCard label="Net Income" value={formatMoney(summary.netIncome)} />
            <StatCard
              label="Occupancy"
              value={`${summary.occupancyRate}% (${summary.roomsOccupied}/${summary.roomsTotal})`}
            />
          </div>

          <section className="mt-10 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)]">
            <div className="px-6 py-5 border-b border-[var(--color-border)]">
              <h2 className="font-semibold">Checked in Today</h2>
            </div>
            {summary.bookings.length === 0 ? (
              <p className="px-6 py-8 text-sm text-[var(--color-muted)]">No check-ins recorded for this date.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-[var(--color-muted)] border-b border-[var(--color-border)]">
                      <th className="px-6 py-3 font-medium">Guest</th>
                      <th className="px-6 py-3 font-medium">Room</th>
                      <th className="px-6 py-3 font-medium">Nights</th>
                      <th className="px-6 py-3 font-medium">Paid</th>
                      <th className="px-6 py-3 font-medium">Logged by</th>
                      <th className="px-6 py-3 font-medium">Check-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.bookings.map((b) => (
                      <tr key={b.id} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="px-6 py-3.5">{b.guest.fullName}</td>
                        <td className="px-6 py-3.5">{b.room.roomNumber}</td>
                        <td className="px-6 py-3.5">{b.nights}</td>
                        <td className="px-6 py-3.5 tabular-nums">{formatMoney(b.amountPaid)}</td>
                        <td className="px-6 py-3.5 text-[var(--color-muted)]">{b.createdBy.fullName}</td>
                        <td className="px-6 py-3.5 text-[var(--color-muted)]">{formatDateTime(b.checkIn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-8 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)]">
            <div className="px-6 py-5 border-b border-[var(--color-border)]">
              <h2 className="font-semibold">Expenses</h2>
            </div>
            {summary.expenses.length === 0 ? (
              <p className="px-6 py-8 text-sm text-[var(--color-muted)]">No expenses recorded for this date.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-[var(--color-muted)] border-b border-[var(--color-border)]">
                      <th className="px-6 py-3 font-medium">Item</th>
                      <th className="px-6 py-3 font-medium">Type</th>
                      <th className="px-6 py-3 font-medium">Amount</th>
                      <th className="px-6 py-3 font-medium">Logged by</th>
                      <th className="px-6 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.expenses.map((e) => (
                      <tr key={e.id} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="px-6 py-3.5">{e.item}</td>
                        <td className="px-6 py-3.5">
                          <Badge tone="debit">Debit</Badge>
                        </td>
                        <td className="px-6 py-3.5 tabular-nums">{formatMoney(e.total)}</td>
                        <td className="px-6 py-3.5 text-[var(--color-muted)]">{e.createdBy.fullName}</td>
                        <td className="px-6 py-3.5 text-[var(--color-muted)]">{formatDateTime(e.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
