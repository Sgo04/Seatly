'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatTime, getStatusColor } from '@/lib/utils';
import AdminLayout from '@/components/admin/AdminLayout';
import type { Reservation, Guest } from '@/types/database';

interface DashboardStats {
  totalToday: number;
  seated: number;
  noShows: number;
  upcoming: number;
  vipToday: number;
}

export default function DashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<DashboardStats>({ totalToday: 0, seated: 0, noShows: 0, upcoming: 0, vipToday: 0 });
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    // Get today's reservations
    const { data: todayRes } = await supabase
      .from('reservations')
      .select('*')
      .eq('date', today)
      .order('time', { ascending: true });

    const reservations = todayRes || [];
    setReservations(reservations);

    // Get VIP guests who have reservations today
    const guestIds = reservations.map(r => r.guest_id).filter(Boolean);
    let vipCount = 0;
    if (guestIds.length > 0) {
      const { count } = await supabase
        .from('guests')
        .select('id', { count: 'exact', head: true })
        .in('id', guestIds)
        .eq('is_vip', true);
      vipCount = count || 0;
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setStats({
      totalToday: reservations.length,
      seated: reservations.filter(r => r.status === 'seated').length,
      noShows: reservations.filter(r => r.status === 'no_show').length,
      upcoming: reservations.filter(r => r.status === 'confirmed' && r.time >= currentTime).length,
      vipToday: vipCount,
    });

    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('reservations').update({ status }).eq('id', id);
    if (error) {
      alert('Failed to update reservation status. Please try again.');
      return;
    }
    fetchDashboard();
  }

  const statCards = [
    { label: 'Total Reservations', value: stats.totalToday, color: 'bg-blue-50 text-blue-700' },
    { label: 'Currently Seated', value: stats.seated, color: 'bg-green-50 text-green-700' },
    { label: 'Upcoming', value: stats.upcoming, color: 'bg-purple-50 text-purple-700' },
    { label: 'No-Shows', value: stats.noShows, color: 'bg-amber-50 text-amber-700' },
    { label: 'VIP Guests Today', value: stats.vipToday, color: 'bg-pink-50 text-pink-700' },
  ];

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Today&apos;s overview — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>

      {loading ? (
        <div className="animate-pulse text-gray-400">Loading dashboard...</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {statCards.map(card => (
              <div key={card.label} className={`rounded-xl p-4 ${card.color}`}>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-sm opacity-75 mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Today's reservations */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Today&apos;s Reservations</h2>
            </div>

            {reservations.length === 0 ? (
              <p className="px-6 py-12 text-center text-gray-400">No reservations today</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Time</th>
                      <th className="px-6 py-3">Guest</th>
                      <th className="px-6 py-3">Party</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Requests</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reservations.map(res => (
                      <tr key={res.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium">{formatTime(res.time)}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{res.guest_name}</p>
                          <p className="text-xs text-gray-400">{res.guest_phone}</p>
                        </td>
                        <td className="px-6 py-4 text-sm">{res.party_size}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(res.status)}`}>
                            {res.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                          {res.special_requests || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            {res.status === 'confirmed' && (
                              <>
                                <button onClick={() => updateStatus(res.id, 'seated')} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition">Seat</button>
                                <button onClick={() => updateStatus(res.id, 'no_show')} className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition">No-Show</button>
                                <button onClick={() => updateStatus(res.id, 'cancelled')} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition">Cancel</button>
                              </>
                            )}
                            {res.status === 'seated' && (
                              <button onClick={() => updateStatus(res.id, 'completed')} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition">Complete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
