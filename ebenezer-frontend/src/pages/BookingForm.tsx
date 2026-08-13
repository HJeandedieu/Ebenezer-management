import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createBooking } from "../api/bookings";
import { listRooms } from "../api/rooms";
import type { Room } from "../types";
import { getErrorMessage } from "../api/client";
import { formatMoney } from "../lib/format";
import { TextField, SelectField } from "../components/FormField";

function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export default function BookingForm() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);

  const [roomId, setRoomId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [checkIn, setCheckIn] = useState(toDateTimeLocal(new Date()));
  const [expectedCheckOut, setExpectedCheckOut] = useState(toDateTimeLocal(addDays(new Date(), 1)));
  const [amountCash, setAmountCash] = useState(0);
  const [amountMomo, setAmountMomo] = useState(0);
  const [remarks, setRemarks] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRooms()
      .then((data) => {
        setRooms(data);
        const firstAvailable = data.find((r) => r.status === "AVAILABLE");
        if (firstAvailable) setRoomId(firstAvailable.id);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setRoomsLoading(false));
  }, []);

  const availableRooms = rooms.filter((r) => r.status === "AVAILABLE");
  const selectedRoom = rooms.find((r) => r.id === roomId);

  const nights = useMemo(() => {
    const start = new Date(checkIn).getTime();
    const end = new Date(expectedCheckOut).getTime();
    if (!start || !end || end <= start) return 0;
    return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  }, [checkIn, expectedCheckOut]);

  const expectedAmount = selectedRoom ? nights * Number(selectedRoom.pricePerNight) : 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await createBooking({
        roomId,
        guest: { fullName, phone: phone || null },
        checkIn: new Date(checkIn).toISOString(),
        expectedCheckOut: new Date(expectedCheckOut).toISOString(),
        amountCash,
        amountMomo,
        remarks: remarks || null,
      });
      navigate("/bookings");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (roomsLoading) {
    return <p className="text-sm text-[var(--color-muted)]">Loading…</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">New Check-in</h1>
        <Link
          to="/bookings"
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
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Uwase"
          />
          <TextField
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="078xxxxxxx"
          />
        </div>

        <SelectField label="Room" required value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          <option value="" disabled>
            {availableRooms.length === 0 ? "No rooms available" : "Select a room"}
          </option>
          {availableRooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.roomNumber} — {room.type ?? "Standard"} ({formatMoney(room.pricePerNight)}/night)
            </option>
          ))}
        </SelectField>

        <div className="grid grid-cols-2 gap-5">
          <TextField
            label="Check-in"
            type="datetime-local"
            required
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
          <TextField
            label="Expected Checkout"
            type="datetime-local"
            required
            value={expectedCheckOut}
            onChange={(e) => setExpectedCheckOut(e.target.value)}
          />
        </div>

        <div className="rounded-lg bg-[var(--color-canvas)] px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-[var(--color-muted)]">
            {nights} night{nights === 1 ? "" : "s"} · Expected amount
          </span>
          <span className="font-semibold tabular-nums">{formatMoney(expectedAmount)}</span>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <TextField
            label="Amount Paid — Cash"
            type="number"
            min={0}
            step="0.01"
            value={amountCash}
            onChange={(e) => setAmountCash(Number(e.target.value))}
          />
          <TextField
            label="Amount Paid — Momo"
            type="number"
            min={0}
            step="0.01"
            value={amountMomo}
            onChange={(e) => setAmountMomo(Number(e.target.value))}
          />
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
          disabled={saving || !roomId}
          className="bg-[var(--color-ink)] text-white rounded-lg px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {saving ? "Checking in…" : "Confirm Check-in"}
        </button>
      </form>
    </div>
  );
}
