import { format, parse, addMinutes } from 'date-fns';

/** Generate a unique booking reference like SLY-A3F8K2 */
export function generateBookingRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SLY-${code}`;
}

/** Calculate end time given start time (HH:mm) and duration in minutes */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const base = parse(startTime, 'HH:mm', new Date());
  const end = addMinutes(base, durationMinutes);
  return format(end, 'HH:mm');
}

/** Normalize time to HH:mm format for consistent comparisons */
export function normalizeTime(time: string): string {
  return time.length > 5 ? time.substring(0, 5) : time;
}

/** Format time for display: "18:30" or "18:30:00" -> "6:30 PM" */
export function formatTime(time: string): string {
  const normalized = normalizeTime(time);
  const parsed = parse(normalized, 'HH:mm', new Date());
  if (isNaN(parsed.getTime())) return time;
  return format(parsed, 'h:mm a');
}

/** Format date for display */
export function formatDate(date: string): string {
  return format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d, yyyy');
}

/** Format date short */
export function formatDateShort(date: string): string {
  return format(new Date(date + 'T00:00:00'), 'MMM d, yyyy');
}

/** Get day name from date string */
export function getDayName(date: string): string {
  return format(new Date(date + 'T00:00:00'), 'EEEE').toLowerCase();
}

/** Generate time slots between open and close times in 30-min increments */
export function generateTimeSlots(openTime: string, closeTime: string, durationMinutes: number): string[] {
  const slots: string[] = [];
  const open = parse(openTime, 'HH:mm', new Date());
  const close = parse(closeTime, 'HH:mm', new Date());
  // Last bookable slot must end before closing
  const lastSlot = addMinutes(close, -durationMinutes);

  let current = open;
  while (current <= lastSlot) {
    slots.push(format(current, 'HH:mm'));
    current = addMinutes(current, 30);
  }
  return slots;
}

/** Status badge colors */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'confirmed': return 'bg-blue-100 text-blue-800';
    case 'seated': return 'bg-green-100 text-green-800';
    case 'completed': return 'bg-gray-100 text-gray-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    case 'no_show': return 'bg-amber-100 text-amber-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

/** Cn helper for conditionally joining classnames */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
