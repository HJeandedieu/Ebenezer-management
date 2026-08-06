import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listUsers, deleteUser } from "../api/users";
import type { AuthUser } from "../types";
import { formatDate } from "../lib/format";
import { getErrorMessage } from "../api/client";
import Badge from "../components/Badge";
import { useAuth } from "../context/AuthContext";

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    listUsers()
      .then(setUsers)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this worker account? This cannot be undone.")) return;
    try {
      await deleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">All Users</h1>
        <Link
          to="/users/new"
          className="bg-[var(--color-ink)] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Add User
        </Link>
      </div>

      <div className="mt-6 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        {loading ? (
          <p className="px-6 py-8 text-sm text-[var(--color-muted)]">Loading…</p>
        ) : error ? (
          <p className="px-6 py-8 text-sm text-[var(--color-debit-text)]">{error}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-[var(--color-muted)] border-b border-[var(--color-border)]">
                  <th className="px-6 py-3 font-medium">#</th>
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-6 py-3.5 text-[var(--color-muted)]">{i + 1}</td>
                    <td className="px-6 py-3.5 font-medium">{u.fullName}</td>
                    <td className="px-6 py-3.5 text-[var(--color-muted)]">{u.email}</td>
                    <td className="px-6 py-3.5">
                      <Badge tone={u.role === "ADMIN" ? "admin" : "user"}>
                        {u.role === "ADMIN" ? "Admin" : "Worker"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-[var(--color-muted)]">
                      {u.createdAt ? formatDate(u.createdAt) : "—"}
                    </td>
                    <td className="px-6 py-3.5">
                      {u.role !== "ADMIN" ? (
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="border border-[var(--color-debit-text)] text-[var(--color-debit-text)] rounded-lg px-3 py-1.5 text-xs hover:bg-[var(--color-debit-bg)] transition-colors"
                        >
                          Delete
                        </button>
                      ) : (
                        <span className="text-xs text-[var(--color-muted-2)]">
                          {u.id === currentUser?.id ? "You" : "—"}
                        </span>
                      )}
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
