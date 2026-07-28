/**
 * Unified time slot constants shared across the app.
 * Format: '9 AM - 11 AM' (2-hour blocks)
 */
export const TIME_SLOTS = [
  '9 AM - 11 AM',
  '11 AM - 1 PM',
  '2 PM - 4 PM',
  '4 PM - 6 PM',
  '6 PM - 8 PM',
] as const;

export type TimeSlot = (typeof TIME_SLOTS)[number];

/**
 * Maps each slot label to the starting hour (24-hour format).
 */
export const SLOT_HOURS: Record<string, number> = {
  '9 AM - 11 AM': 9,
  '11 AM - 1 PM': 11,
  '2 PM - 4 PM': 14,
  '4 PM - 6 PM': 16,
  '6 PM - 8 PM': 18,
};
