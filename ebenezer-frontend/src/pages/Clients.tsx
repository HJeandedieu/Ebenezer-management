import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { listClients, deleteClient } from "../api/clients";
import type { Client } from "../types";
import { formatMoney, formatDate } from "../lib/format";
import { getErrorMessage } from "../api/client";

export default function Clients() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listClients()
      .then(setClients)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this client entry? This cannot be undone.")) return;
    try {
      await deleteClient(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isAdmin ? "All Clients" : "My Clients"}
          </h1>
          {!isAdmin && (
            <p className="text-sm text-[var(--color-muted)] mt-1">
              Entries you've logged. Contact an admin to make changes.
            </p>
          )}
        </div>
        <Link
          to="/clients/new"
          className="bg-[var(--color-ink)] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Add Client
        </Link>
      </div>

      <div className="mt-6 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-sm text-[var(--color-muted)]">Loading…</p>
        ) : error ? (
          <p className="px-6 py-8 text-sm text-[var(--color-debit-text)]">{error}</p>
        ) : clients.length === 0 ? (
          <p className="px-6 py-8 text-sm text-[var(--color-muted)]">
            No clients yet. Add the first one to get started.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-[var(--color-muted)] border-b border-[var(--color-border)]">
                  <th className="px-6 py-3 font-medium">#</th>
                  <th className="px-6 py-3 font-medium">Guest</th>
                  <th className="px-6 py-3 font-medium">Room</th>
                  <th className="px-6 py-3 font-medium">Check-in</th>
                  <th className="px-6 py-3 font-medium">Check-out</th>
                  <th className="px-6 py-3 font-medium">Nights</th>
                  <th className="px-6 py-3 font-medium">Cash</th>
                  <th className="px-6 py-3 font-medium">Momo</th>
                  <th className="px-6 py-3 font-medium">Total</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  {isAdmin && <th className="px-6 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {clients.map((c, i) => (
                  <tr key={c.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-6 py-3.5 text-[var(--color-muted)]">{i + 1}</td>
                    <td className="px-6 py-3.5 font-medium">{c.guestName}</td>
                    <td className="px-6 py-3.5">{c.roomNo}</td>
                    <td className="px-6 py-3.5 text-[var(--color-muted)]">{formatDate(c.checkIn)}</td>
                    <td className="px-6 py-3.5 text-[var(--color-muted)]">{formatDate(c.checkOut)}</td>
                    <td className="px-6 py-3.5">{c.nights}</td>
                    <td className="px-6 py-3.5 tabular-nums">{formatMoney(c.amountCash)}</td>
                    <td className="px-6 py-3.5 tabular-nums">{formatMoney(c.amountMomo)}</td>
                    <td className="px-6 py-3.5 tabular-nums font-medium">{formatMoney(c.total)}</td>
                    <td className="px-6 py-3.5 text-[var(--color-muted)]">{formatDate(c.date)}</td>
                    {isAdmin && (
                      <td className="px-6 py-3.5">
                        <div className="flex gap-2">
                          <Link
                            to={`/clients/${c.id}/edit`}
                            className="border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs hover:bg-[var(--color-canvas)] transition-colors"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(c.id)}
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
