import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listExpenses, deleteExpense } from "../api/expenses";
import type { Expense } from "../types";
import { formatMoney, formatDate } from "../lib/format";
import { getErrorMessage } from "../api/client";

export default function Expenses() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listExpenses()
      .then(setExpenses)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense entry? This cannot be undone.")) return;
    try {
      await deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isAdmin ? "All Expenses" : "My Expenses"}
          </h1>
          {!isAdmin && (
            <p className="text-sm text-[var(--color-muted)] mt-1">
              Entries you've logged. Contact an admin to make changes.
            </p>
          )}
        </div>
        <Link
          to="/expenses/new"
          className="bg-[var(--color-ink)] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Add Expense
        </Link>
      </div>

      <div className="mt-6 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-sm text-[var(--color-muted)]">Loading…</p>
        ) : error ? (
          <p className="px-6 py-8 text-sm text-[var(--color-debit-text)]">{error}</p>
        ) : expenses.length === 0 ? (
          <p className="px-6 py-8 text-sm text-[var(--color-muted)]">
            No expenses yet. Add the first one to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-[var(--color-muted)] border-b border-[var(--color-border)]">
                  <th className="px-6 py-3 font-medium">#</th>
                  <th className="px-6 py-3 font-medium">Item</th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium">Cash</th>
                  <th className="px-6 py-3 font-medium">Momo</th>
                  <th className="px-6 py-3 font-medium">Total</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  {isAdmin && <th className="px-6 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {expenses.map((e, i) => (
                  <tr key={e.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-6 py-3.5 text-[var(--color-muted)]">{i + 1}</td>
                    <td className="px-6 py-3.5 font-medium">{e.item}</td>
                    <td className="px-6 py-3.5 text-[var(--color-muted)]">{e.description || "—"}</td>
                    <td className="px-6 py-3.5 tabular-nums">{formatMoney(e.amountCash)}</td>
                    <td className="px-6 py-3.5 tabular-nums">{formatMoney(e.amountMomo)}</td>
                    <td className="px-6 py-3.5 tabular-nums font-medium">{formatMoney(e.total)}</td>
                    <td className="px-6 py-3.5 text-[var(--color-muted)]">{formatDate(e.date)}</td>
                    {isAdmin && (
                      <td className="px-6 py-3.5">
                        <div className="flex gap-2">
                          <Link
                            to={`/expenses/${e.id}/edit`}
                            className="border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs hover:bg-[var(--color-canvas)] transition-colors"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(e.id)}
                            className="border border-[var(--color-debit-text)] text-[var(--color-debit-text)] rounded-lg px-3 py-1.5 text-xs hover:bg-[var(--color-debit-bg)] transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
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
