interface StatCardProps {
  label: string;
  value: string;
  accent?: "in" | "out" | "none";
}

export default function StatCard({ label, value, accent = "none" }: StatCardProps) {
  const borderColor =
    accent === "in"
      ? "var(--color-money-in)"
      : accent === "out"
      ? "var(--color-money-out)"
      : "var(--color-border)";

  return (
    <div
      className="bg-[var(--color-card)] rounded-xl border p-6"
      style={{ borderColor: "var(--color-border)", borderTopColor: borderColor, borderTopWidth: accent !== "none" ? "3px" : "1px" }}
    >
      <p className="text-xs tracking-wide uppercase text-[var(--color-muted)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
