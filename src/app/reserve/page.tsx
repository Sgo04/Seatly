'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatTime, generateTimeSlots, getDayName, generateBookingRef, calculateEndTime, normalizeTime } from '@/lib/utils';
import type { RestaurantSettings, Table } from '@/types/database';

interface AvailabilityResult {
  available: boolean;
  suggestedTime?: string;
  suggestedTable?: Table;
}

export default function ReservePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsError, setSettingsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Form state
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase.from('restaurant_settings').select('*').single();
      if (error || !data) {
        setSettingsError(true);
        setLoading(false);
        return;
      }
      setSettings(data);
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split('T')[0]);
      setLoading(false);
    }
    fetchSettings();
  }, [supabase]);

  const [closedDay, setClosedDay] = useState(false);

  // Update time slots when date or settings change
  useEffect(() => {
    if (!settings || !date) return;
    const dayName = getDayName(date);
    const hours = settings.opening_hours[dayName];
    if (hours && hours.open && hours.close) {
      setClosedDay(false);
      let slots = generateTimeSlots(hours.open, hours.close, settings.default_dining_duration_minutes);

      // Filter out past time slots if booking for today
      const today = new Date().toISOString().split('T')[0];
      if (date === today) {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        slots = slots.filter(slot => slot > currentTime);
      }

      setTimeSlots(slots);
      if (slots.length > 0) setTime(slots[0]);
      else { setTime(''); setAvailability(null); }
    } else {
      setClosedDay(true);
      setTimeSlots([]);
      setTime('');
      setAvailability(null);
    }
  }, [date, settings]);

  // Check availability when date/time/party size/settings changes
  const checkAvailability = useCallback(async () => {
    if (!date || !time || !partySize || !settings) return;
    setCheckingAvailability(true);
    setAvailability(null);

    const duration = settings.default_dining_duration_minutes;
    const endTime = calculateEndTime(time, duration);

    // Get all tables that fit the party size
    const { data: tables } = await supabase
      .from('tables')
      .select('*')
      .eq('is_active', true)
      .gte('capacity', partySize)
      .order('capacity', { ascending: true });

    if (!tables || tables.length === 0) {
      setAvailability({ available: false });
      setCheckingAvailability(false);
      return;
    }

    // Get existing reservations that overlap with requested time
    const { data: existingReservations } = await supabase
      .from('reservations')
      .select('*, table_assignments(table_id)')
      .eq('date', date)
      .in('status', ['confirmed', 'seated']);

    // Find which tables are available (no overlapping reservation)
    const occupiedTableIds = new Set<string>();
    if (existingReservations) {
      for (const res of existingReservations) {
        const resTime = normalizeTime(res.time);
        const resEndTime = normalizeTime(res.end_time);
        const overlaps = time < resEndTime && endTime > resTime;
        if (overlaps && res.table_assignments) {
          for (const ta of res.table_assignments as { table_id: string }[]) {
            occupiedTableIds.add(ta.table_id);
          }
        }
      }
    }

    const availableTables = tables.filter(t => !occupiedTableIds.has(t.id));

    if (availableTables.length > 0) {
      setAvailability({ available: true, suggestedTable: availableTables[0] });
    } else {
      // Try to suggest nearest available time
      let suggestedTime: string | undefined;
      for (const slot of timeSlots) {
        if (slot === time) continue;
        const slotEnd = calculateEndTime(slot, duration);
        let slotAvailable = false;
        for (const table of tables) {
          let tableOccupied = false;
          if (existingReservations) {
            for (const res of existingReservations) {
              const resTime = normalizeTime(res.time);
              const resEndTime = normalizeTime(res.end_time);
              const overlaps = slot < resEndTime && slotEnd > resTime;
              if (overlaps && res.table_assignments) {
                for (const ta of res.table_assignments as { table_id: string }[]) {
                  if (ta.table_id === table.id) tableOccupied = true;
                }
              }
            }
          }
          if (!tableOccupied) {
            slotAvailable = true;
            break;
          }
        }
        if (slotAvailable) {
          suggestedTime = slot;
          break;
        }
      }
      setAvailability({ available: false, suggestedTime });
    }
    setCheckingAvailability(false);
  }, [date, time, partySize, settings, supabase, timeSlots]);

  useEffect(() => {
    if (!date || !time || !partySize || !settings) return;
    checkAvailability();
  }, [date, time, partySize, settings, checkAvailability]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!availability?.available) {
      setError('No tables available for the selected time. Please choose a different time.');
      return;
    }

    if (!name || !phone) {
      setError('Please fill in all required fields.');
      return;
    }

    // Basic phone validation
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 7) {
      setError('Please enter a valid phone number.');
      return;
    }

    setSubmitting(true);

    try {
      const duration = settings?.default_dining_duration_minutes || 90;
      const endTime = calculateEndTime(time, duration);
      const bookingRef = generateBookingRef();

      // Find or create guest
      let guestId: string | null = null;
      if (email) {
        const { data: existingGuest } = await supabase
          .from('guests')
          .select('id, total_visits')
          .eq('email', email)
          .maybeSingle();

        if (existingGuest) {
          guestId = existingGuest.id;
          // Don't increment total_visits here — it should be incremented when status becomes 'completed'
          await supabase
            .from('guests')
            .update({ name, phone })
            .eq('id', existingGuest.id);
        }
      }

      if (!guestId) {
        const { data: newGuest } = await supabase
          .from('guests')
          .insert({ name, email: email || null, phone, total_visits: 0 })
          .select('id')
          .single();
        if (newGuest) guestId = newGuest.id;
      }

      // Create reservation
      const { data: reservation, error: resError } = await supabase
        .from('reservations')
        .insert({
          guest_id: guestId,
          booking_ref: bookingRef,
          guest_name: name,
          guest_email: email || null,
          guest_phone: phone,
          party_size: partySize,
          date,
          time,
          duration_minutes: duration,
          end_time: endTime,
          special_requests: specialRequests || null,
          status: 'confirmed',
        })
        .select('id')
        .single();

      if (resError) throw resError;

      // Auto-assign best-fit table
      if (reservation && availability.suggestedTable) {
        await supabase.from('table_assignments').insert({
          reservation_id: reservation.id,
          table_id: availability.suggestedTable.id,
        });
      }

      // Redirect to confirmation
      router.push(`/reservation/confirmation?ref=${bookingRef}`);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (settingsError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <h1 className="text-2xl font-serif font-bold text-gray-900 mb-4">Unable to Load</h1>
        <p className="text-gray-500 mb-8">We couldn&apos;t load restaurant settings. Please try again later.</p>
        <Link href="/" className="text-primary-600 hover:text-primary-700 font-medium">Back to Home</Link>
      </div>
    );
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + (settings?.booking_lead_days || 30) * 86400000).toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif text-gray-900">Seatly</Link>
          <span className="text-sm text-gray-400">Reserve a Table</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">Make a Reservation</h1>
        <p className="text-gray-500 mb-8">Choose your preferred date, time, and party size.</p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Date, Time, Party Size */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-800">Booking Details</h2>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  min={minDate}
                  max={maxDate}
                  onChange={e => setDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <select
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  required
                >
                  {timeSlots.length === 0 && (
                    <option value="">No available times</option>
                  )}
                  {timeSlots.map(slot => (
                    <option key={slot} value={slot}>{formatTime(slot)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Party Size</label>
                <select
                  value={partySize}
                  onChange={e => setPartySize(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  required
                >
                  {Array.from({ length: settings?.max_party_size || 12 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Closed day notice */}
            {closedDay && (
              <div className="text-sm px-4 py-3 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                The restaurant is closed on this day. Please select another date.
              </div>
            )}

            {/* No times left today */}
            {!closedDay && timeSlots.length === 0 && date === new Date().toISOString().split('T')[0] && (
              <div className="text-sm px-4 py-3 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                No more available time slots for today. Please select a future date.
              </div>
            )}

            {/* Availability indicator */}
            {checkingAvailability && (
              <p className="text-sm text-gray-400 animate-pulse">Checking availability...</p>
            )}
            {availability && !checkingAvailability && (
              <div className={`text-sm px-4 py-3 rounded-lg ${availability.available ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {availability.available ? (
                  <>Table available for {partySize} {partySize === 1 ? 'guest' : 'guests'} at {formatTime(time)}.</>
                ) : (
                  <>
                    No tables available for this time and party size.
                    {availability.suggestedTime && (
                      <button
                        type="button"
                        onClick={() => setTime(availability.suggestedTime!)}
                        className="ml-2 underline font-medium hover:text-red-800"
                      >
                        Try {formatTime(availability.suggestedTime)} instead?
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Guest Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-gray-800">Your Information</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  pattern="[+]?[0-9\s\-\(\)]{7,}"
                  title="Please enter a valid phone number (at least 7 digits)"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
              <textarea
                value={specialRequests}
                onChange={e => setSpecialRequests(e.target.value)}
                placeholder="Any dietary requirements, special occasions, seating preferences..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting || !availability?.available}
            className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-lg"
          >
            {submitting ? 'Booking...' : 'Confirm Reservation'}
          </button>
        </form>
      </main>
    </div>
  );
}
