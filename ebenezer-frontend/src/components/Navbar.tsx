import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors ${
      isActive ? "text-[var(--color-ink)] font-medium" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
    }`;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="bg-[var(--color-card)] border-b border-[var(--color-border)]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight">Ebenezer<span className="text-[var(--color-muted)]">App</span></span>

        <nav className="flex items-center gap-7">
          {user?.role === "ADMIN" && (
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
          )}
          <NavLink to="/clients" className={linkClass}>
            Clients
          </NavLink>
          <NavLink to="/expenses" className={linkClass}>
            Expenses
          </NavLink>
          {user?.role === "ADMIN" && (
            <NavLink to="/users" className={linkClass}>
              Users
            </NavLink>
          )}

          <button
            onClick={handleLogout}
            className="text-sm border border-[var(--color-debit-text)] text-[var(--color-debit-text)] rounded-lg px-3.5 py-1.5 hover:bg-[var(--color-debit-bg)] transition-colors"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
