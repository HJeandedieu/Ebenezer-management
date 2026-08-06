import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUser } from "../api/users";
import { getErrorMessage } from "../api/client";
import type { Role } from "../types";
import { TextField, SelectField } from "../components/FormField";

export default function AddUser() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("WORKER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await createUser({ fullName, email, password, role });
      navigate("/users");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Add New User</h1>
        <Link
          to="/users"
          className="border border-[var(--color-border)] rounded-lg px-4 py-2 text-sm hover:bg-[var(--color-card)] transition-colors"
        >
          ← Back
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-md bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-8 space-y-5"
      >
        <TextField
          label="Full Name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Uwase"
        />

        <TextField
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@ebenezer.com"
        />

        <TextField
          label="Password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 6 characters"
        />

        <SelectField label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="WORKER">Worker</option>
          <option value="ADMIN">Admin</option>
        </SelectField>

        {error && (
          <p role="alert" className="text-sm text-[var(--color-debit-text)]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[var(--color-ink)] text-white rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {saving ? "Creating…" : "Create User"}
        </button>
      </form>
    </div>
  );
}
