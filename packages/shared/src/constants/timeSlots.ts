/**
 * Unified time slot constants shared across the app.
 * Start hours only — end time is computed dynamically from cart duration.
 */

/** Fixed slot start hours (24-h). */
export const SLOT_START_HOURS = [9, 11, 14, 16, 18] as const;
export type SlotStartHour = (typeof SLOT_START_HOURS)[number];

/** Format a total-minutes value as "9 AM", "2:30 PM", etc. */
function _fmtMin(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return m === 0
    ? `${display} ${period}`
    : `${display}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Returns a human-readable slot label, e.g.:
 *   getSlotLabel(9, 120)  → "9 AM - 11 AM"
 *   getSlotLabel(9, 90)   → "9 AM - 10:30 AM"
 *   getSlotLabel(14, 150) → "2 PM - 4:30 PM"
 */
export function getSlotLabel(startHour: number, durationMinutes: number): string {
  return `${_fmtMin(startHour * 60)} - ${_fmtMin(startHour * 60 + durationMinutes)}`;
}

/**
 * Returns a compact duration string, e.g.:
 *   formatDuration(60)  → "1h"
 *   formatDuration(90)  → "1h 30min"
 *   formatDuration(45)  → "45 min"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

// ─── Legacy exports (kept for any existing consumers) ────────────────────────
/** @deprecated Use SLOT_START_HOURS + getSlotLabel instead. */
export const TIME_SLOTS = [
  '9 AM - 11 AM',
  '11 AM - 1 PM',
  '2 PM - 4 PM',
  '4 PM - 6 PM',
  '6 PM - 8 PM',
] as const;

export type TimeSlot = (typeof TIME_SLOTS)[number];

/** @deprecated Use SLOT_START_HOURS + getSlotLabel instead. */
export const SLOT_HOURS: Record<string, number> = {
  '9 AM - 11 AM': 9,
  '11 AM - 1 PM': 11,
  '2 PM - 4 PM': 14,
  '4 PM - 6 PM': 16,
  '6 PM - 8 PM': 18,
};
