import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createExpense, updateExpense, listExpenses } from "../api/expenses";
import { getErrorMessage } from "../api/client";
import { formatMoney, toDateInputValue } from "../lib/format";
import { TextField } from "../components/FormField";

export default function ExpenseForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [item, setItem] = useState("");
  const [description, setDescription] = useState("");
  const [amountCash, setAmountCash] = useState(0);
  const [amountMomo, setAmountMomo] = useState(0);
  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    listExpenses()
      .then((expenses) => {
        const e = expenses.find((x) => x.id === id);
        if (!e) throw new Error("Expense entry not found");
        setDate(toDateInputValue(new Date(e.date)));
        setItem(e.item);
        setDescription(e.description ?? "");
        setAmountCash(Number(e.amountCash));
        setAmountMomo(Number(e.amountMomo));
        setRemarks(e.remarks ?? "");
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        date,
        item,
        description: description || null,
        amountCash,
        amountMomo,
        remarks: remarks || null,
      };
      if (isEdit && id) {
        await updateExpense(id, payload);
      } else {
        await createExpense(payload);
      }
      navigate("/expenses");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-muted)]">Loading…</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? "Edit Expense" : "Add New Expense"}
        </h1>
        <Link
          to="/expenses"
          className="border border-[var(--color-border)] rounded-lg px-4 py-2 text-sm hover:bg-[var(--color-card)] transition-colors"
        >
          ← Back
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-2xl bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] p-8 space-y-5"
      >
        <div className="grid grid-cols-2 gap-5">
          <TextField
            label="Item"
            required
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="Toilet paper"
          />
          <TextField
            label="Date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional — what it was for"
            className="w-full rounded-lg border border-[var(--color-border)] px-3.5 py-2.5 text-sm placeholder:text-[var(--color-muted-2)] focus:border-[var(--color-ink)] outline-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <TextField
            label="Amount — Cash"
            type="number"
            min={0}
            step="0.01"
            value={amountCash}
            onChange={(e) => setAmountCash(Number(e.target.value))}
          />
          <TextField
            label="Amount — Momo"
            type="number"
            min={0}
            step="0.01"
            value={amountMomo}
            onChange={(e) => setAmountMomo(Number(e.target.value))}
          />
        </div>

        <div className="rounded-lg bg-[var(--color-canvas)] px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-[var(--color-muted)]">Total</span>
          <span className="font-semibold tabular-nums">{formatMoney(amountCash + amountMomo)}</span>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Remarks</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            placeholder="Optional notes"
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
          disabled={saving}
          className="bg-[var(--color-ink)] text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Save Expense"}
        </button>
      </form>
    </div>
  );
}
