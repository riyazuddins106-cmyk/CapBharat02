/**
 * Unified time slot constants shared across the app.
 * Start hours only — end time is computed dynamically from cart duration.
 */

/** Fixed slot start hours (24-h). @deprecated use generateTimeSlots instead */
export const SLOT_START_HOURS = [9, 11, 14, 16, 18] as const;
export type SlotStartHour = (typeof SLOT_START_HOURS)[number];

/** Format total minutes since midnight as "9 AM", "9:30 AM", "2:00 PM", etc. */
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
 * Generate dynamic 30-min (or custom interval) start-time slots.
 * Returns an array of total-minutes-since-midnight values for each valid slot.
 * A slot is valid if its end time (start + maxDurationMinutes) fits before closingHour.
 *
 * @param openingHour     Business opening hour (e.g. 8)
 * @param closingHour     Business closing hour (e.g. 20)
 * @param intervalMinutes Slot interval in minutes (default 30)
 * @param maxDurationMinutes The longest service duration — ensures jobs finish before closing
 */
export function generateTimeSlots(
  openingHour: number,
  closingHour: number,
  intervalMinutes = 30,
  maxDurationMinutes = 60,
): number[] {
  const slots: number[] = [];
  const openingMinutes = openingHour * 60;
  const closingMinutes = closingHour * 60;
  for (let m = openingMinutes; m + maxDurationMinutes <= closingMinutes; m += intervalMinutes) {
    slots.push(m);
  }
  return slots;
}

/** Format total-minutes as a start-time label: "9:00 AM", "2:30 PM" */
export function formatSlotTime(totalMinutes: number): string {
  return _fmtMin(totalMinutes);
}

/**
 * Get the full service window label shown to customers:
 *   "10:00 AM – 1:00 PM · Approx 3h"
 */
export function getServiceWindowLabel(startTotalMinutes: number, maxDurationMinutes: number): string {
  return `${_fmtMin(startTotalMinutes)} – ${_fmtMin(startTotalMinutes + maxDurationMinutes)} · Approx ${formatDuration(maxDurationMinutes)}`;
}

/**
 * Returns a human-readable slot label, e.g.:
 *   getSlotLabel(9, 120)  → "9 AM - 11 AM"
 *   getSlotLabel(9, 90)   → "9 AM - 10:30 AM"
 * @deprecated Pass totalMinutes directly; use formatSlotTime + getServiceWindowLabel instead.
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
