'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatDate, formatTime } from '@/lib/utils';
import type { Reservation } from '@/types/database';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const bookingRef = searchParams.get('ref');
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReservation() {
      if (!bookingRef) { setLoading(false); return; }
      const supabase = createClient();
      const { data } = await supabase
        .from('reservations')
        .select('*')
        .eq('booking_ref', bookingRef)
        .single();
      if (data) setReservation(data);
      setLoading(false);
    }
    fetchReservation();
  }, [bookingRef]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <h1 className="text-2xl font-serif font-bold text-gray-900 mb-4">Reservation Not Found</h1>
        <p className="text-gray-500 mb-8">We couldn&apos;t find a reservation with that reference.</p>
        <Link href="/reserve" className="text-primary-600 hover:text-primary-700 font-medium">
          Make a New Reservation
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold font-serif text-gray-900">Seatly</Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-16 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">Reservation Confirmed!</h1>
        <p className="text-gray-500 mb-8">Your table has been reserved. Here are your booking details.</p>

        <div className="bg-white rounded-xl border border-gray-200 p-6 text-left space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Booking Reference</span>
            <span className="text-lg font-bold font-mono text-primary-600">{reservation.booking_ref}</span>
          </div>
          <hr className="border-gray-100" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium">{formatDate(reservation.date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Time</p>
              <p className="font-medium">{formatTime(reservation.time)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Party Size</p>
              <p className="font-medium">{reservation.party_size} {reservation.party_size === 1 ? 'Guest' : 'Guests'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{reservation.guest_name}</p>
            </div>
          </div>
          {reservation.special_requests && (
            <>
              <hr className="border-gray-100" />
              <div>
                <p className="text-sm text-gray-500">Special Requests</p>
                <p className="text-gray-700">{reservation.special_requests}</p>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm font-medium"
          >
            Back to Home
          </Link>
          <Link
            href="/reserve"
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition text-sm font-medium"
          >
            Make Another Reservation
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
