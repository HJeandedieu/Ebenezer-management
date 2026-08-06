import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/client";

export default function Login() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const user = await login(email, password);
      // Role decides the landing page — no separate admin login flow.
      navigate(user.role === "ADMIN" ? "/dashboard" : "/clients");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-canvas)] px-4">
      <div className="w-full max-w-md bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] shadow-sm p-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Ebenezer<span className="text-[var(--color-muted)]">App</span>
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted)]">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-[var(--color-border)] px-3.5 py-2.5 text-sm placeholder:text-[var(--color-muted-2)] focus:border-[var(--color-ink)] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-[var(--color-border)] px-3.5 py-2.5 text-sm placeholder:text-[var(--color-muted-2)] focus:border-[var(--color-ink)] outline-none transition-colors"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-[var(--color-debit-text)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-ink)] text-white rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
