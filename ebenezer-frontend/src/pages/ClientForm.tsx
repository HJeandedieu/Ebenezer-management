import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createClient, updateClient, listClients } from "../api/clients";
import { getErrorMessage } from "../api/client";
import { formatMoney, toDateInputValue } from "../lib/format";
import { TextField } from "../components/FormField";

function toDateTimeLocal(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export default function ClientForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [roomNo, setRoomNo] = useState("");
  const [guestName, setGuestName] = useState("");
  const [checkIn, setCheckIn] = useState(toDateTimeLocal(new Date().toISOString()));
  const [checkOut, setCheckOut] = useState("");
  const [nights, setNights] = useState(1);
  const [amountCash, setAmountCash] = useState(0);
  const [amountMomo, setAmountMomo] = useState(0);
  const [remarks, setRemarks] = useState("");

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    // No single-fetch-by-id call is wired up on this page yet, so pull the
    // list and find it — fine at this scale, easy to swap for a GET /:id later.
    listClients()
      .then((clients) => {
        const c = clients.find((x) => x.id === id);
        if (!c) throw new Error("Client entry not found");
        setDate(toDateInputValue(new Date(c.date)));
        setRoomNo(c.roomNo);
        setGuestName(c.guestName);
        setCheckIn(toDateTimeLocal(c.checkIn));
        setCheckOut(toDateTimeLocal(c.checkOut));
        setNights(c.nights);
        setAmountCash(Number(c.amountCash));
        setAmountMomo(Number(c.amountMomo));
        setRemarks(c.remarks ?? "");
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
        roomNo,
        guestName,
        checkIn: new Date(checkIn).toISOString(),
        checkOut: new Date(checkOut).toISOString(),
        nights,
        amountCash,
        amountMomo,
        remarks: remarks || null,
      };
      if (isEdit && id) {
        await updateClient(id, payload);
      } else {
        await createClient(payload);
      }
      navigate("/clients");
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
          {isEdit ? "Edit Client" : "Add New Client"}
        </h1>
        <Link
          to="/clients"
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
            label="Guest Name"
            required
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Jane Uwase"
          />
          <TextField
            label="Room No"
            required
            value={roomNo}
            onChange={(e) => setRoomNo(e.target.value)}
            placeholder="12"
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <TextField
            label="Date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <TextField
            label="Length of Stay (nights)"
            type="number"
            min={1}
            required
            value={nights}
            onChange={(e) => setNights(Number(e.target.value))}
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <TextField
            label="Check-in"
            type="datetime-local"
            required
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
          <TextField
            label="Check-out"
            type="datetime-local"
            required
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
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
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Save Client"}
        </button>
      </form>
    </div>
  );
}
