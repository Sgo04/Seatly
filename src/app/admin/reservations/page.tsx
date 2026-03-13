'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatTime, getStatusColor, normalizeTime, calculateEndTime } from '@/lib/utils';
import AdminLayout from '@/components/admin/AdminLayout';
import type { Reservation, Table, ReservationStatus } from '@/types/database';

export default function ReservationsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [assignModalRes, setAssignModalRes] = useState<Reservation | null>(null);

  useEffect(() => {
    fetchData();
  }, [filterDate, filterStatus]);

  async function fetchData() {
    setLoading(true);
    let query = supabase
      .from('reservations')
      .select('*, table_assignments(table_id, tables(table_number, capacity))')
      .eq('date', filterDate)
      .order('time', { ascending: true });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data } = await query;
    setReservations(data || []);

    const { data: tablesData } = await supabase.from('tables').select('*').eq('is_active', true).order('table_number');
    setTables(tablesData || []);

    setLoading(false);
  }

  async function updateStatus(id: string, status: ReservationStatus) {
    setUpdatingId(id);
    const { error } = await supabase.from('reservations').update({ status }).eq('id', id);
    if (error) {
      alert('Failed to update status. Please try again.');
      setUpdatingId(null);
      return;
    }

    // If completing a reservation, increment guest visit count
    if (status === 'completed') {
      const res = reservations.find(r => r.id === id);
      if (res?.guest_id) {
        const { data: guest } = await supabase
          .from('guests')
          .select('id, total_visits')
          .eq('id', res.guest_id)
          .single();
        if (guest) {
          await supabase.from('guests').update({
            total_visits: guest.total_visits + 1,
            last_visit_at: new Date().toISOString(),
          }).eq('id', guest.id);
        }
      }
    }

    setUpdatingId(null);
    fetchData();
  }

  async function assignTable(reservationId: string, tableId: string) {
    // Remove existing assignment
    const { error: deleteError } = await supabase.from('table_assignments').delete().eq('reservation_id', reservationId);
    if (deleteError) {
      alert('Failed to update table assignment. Please try again.');
      return;
    }
    // Create new assignment
    const { error } = await supabase.from('table_assignments').insert({ reservation_id: reservationId, table_id: tableId });
    if (error) {
      alert('Failed to assign table. Please try again.');
      return;
    }
    setAssignModalRes(null);
    fetchData();
  }

  // Get tables that are occupied during the modal reservation's time window
  function getOccupiedTableIds(): Set<string> {
    const occupied = new Set<string>();
    if (!assignModalRes) return occupied;

    const resTime = normalizeTime(assignModalRes.time);
    const resEndTime = normalizeTime(assignModalRes.end_time);

    for (const r of reservations) {
      if (r.id === assignModalRes.id) continue;
      if (!['confirmed', 'seated'].includes(r.status)) continue;
      const rTime = normalizeTime(r.time);
      const rEnd = normalizeTime(r.end_time);
      const overlaps = resTime < rEnd && resEndTime > rTime;
      if (overlaps) {
        const assignments = ((r as Reservation & { table_assignments?: { table_id: string }[] }).table_assignments || []);
        for (const ta of assignments) {
          occupied.add(ta.table_id);
        }
      }
    }
    return occupied;
  }

  function getAssignedTable(res: Reservation & { table_assignments?: { table_id: string; tables?: { table_number: string; capacity: number } }[] }) {
    if (res.table_assignments && res.table_assignments.length > 0) {
      return res.table_assignments[0].tables;
    }
    return null;
  }

  const statuses: ReservationStatus[] = ['confirmed', 'seated', 'completed', 'cancelled', 'no_show'];

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Reservations</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all bookings</p>
        </div>
        <div className="flex gap-3">
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="all">All Statuses</option>
            {statuses.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse text-gray-400">Loading reservations...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          {reservations.length === 0 ? (
            <p className="px-6 py-12 text-center text-gray-400">No reservations found for this date</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-6 py-3">Ref</th>
                    <th className="px-6 py-3">Time</th>
                    <th className="px-6 py-3">Guest</th>
                    <th className="px-6 py-3">Party</th>
                    <th className="px-6 py-3">Table</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Requests</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reservations.map((res) => {
                    const assignedTable = getAssignedTable(res as Reservation & { table_assignments?: { table_id: string; tables?: { table_number: string; capacity: number } }[] });
                    return (
                      <tr key={res.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-xs font-mono text-gray-500">{res.booking_ref}</td>
                        <td className="px-6 py-4 text-sm font-medium">
                          {formatTime(res.time)}
                          <span className="block text-xs text-gray-400">to {formatTime(res.end_time)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{res.guest_name}</p>
                          <p className="text-xs text-gray-400">{res.guest_phone}</p>
                        </td>
                        <td className="px-6 py-4 text-sm">{res.party_size}</td>
                        <td className="px-6 py-4">
                          {assignedTable ? (
                            <span className="text-sm font-medium text-gray-700">{assignedTable.table_number}</span>
                          ) : (
                            <button
                              onClick={() => setAssignModalRes(res)}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                            >
                              Assign
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(res.status)}`}>
                            {res.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate">
                          {res.special_requests || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {res.status === 'confirmed' && (
                              <>
                                <button disabled={updatingId === res.id} onClick={() => updateStatus(res.id, 'seated')} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50">Seat</button>
                                <button disabled={updatingId === res.id} onClick={() => updateStatus(res.id, 'no_show')} className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 disabled:opacity-50">No-Show</button>
                                <button disabled={updatingId === res.id} onClick={() => updateStatus(res.id, 'cancelled')} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50">Cancel</button>
                              </>
                            )}
                            {res.status === 'seated' && (
                              <button disabled={updatingId === res.id} onClick={() => updateStatus(res.id, 'completed')} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50">Complete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Table Assignment Modal */}
      {assignModalRes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setAssignModalRes(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">
              Assign Table — {assignModalRes.guest_name} (Party of {assignModalRes.party_size})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(() => {
                const occupiedIds = getOccupiedTableIds();
                const availableTables = tables
                  .filter(t => t.capacity >= assignModalRes.party_size)
                  .map(table => ({ ...table, isOccupied: occupiedIds.has(table.id) }));

                if (availableTables.length === 0) {
                  return <p className="text-sm text-gray-400 py-4 text-center">No tables can fit this party size</p>;
                }

                return availableTables.map(table => (
                  <button
                    key={table.id}
                    onClick={() => !table.isOccupied && assignTable(assignModalRes.id, table.id)}
                    disabled={table.isOccupied}
                    className={`w-full text-left px-4 py-3 border rounded-lg transition ${
                      table.isOccupied
                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:bg-primary-50 hover:border-primary-200'
                    }`}
                  >
                    <span className="font-medium">{table.table_number}</span>
                    <span className="text-gray-500 text-sm ml-2">
                      Seats {table.capacity}{table.location ? ` · ${table.location}` : ''}
                    </span>
                    {table.isOccupied && (
                      <span className="text-xs text-red-500 ml-2">(occupied)</span>
                    )}
                  </button>
                ));
              })()}
            </div>
            <button
              onClick={() => setAssignModalRes(null)}
              className="mt-4 w-full py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
