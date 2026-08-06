interface BadgeProps {
  tone: "credit" | "debit" | "admin" | "user";
  children: React.ReactNode;
}

const toneClasses: Record<BadgeProps["tone"], string> = {
  credit: "bg-[var(--color-credit-bg)] text-[var(--color-credit-text)]",
  debit: "bg-[var(--color-debit-bg)] text-[var(--color-debit-text)]",
  admin: "bg-[var(--color-badge-admin-bg)] text-[var(--color-badge-admin-text)]",
  user: "bg-[var(--color-badge-user-bg)] text-[var(--color-badge-user-text)]",
};

export default function Badge({ tone, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
