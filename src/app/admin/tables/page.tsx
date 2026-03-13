'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatTime } from '@/lib/utils';
import AdminLayout from '@/components/admin/AdminLayout';
import type { Table, Reservation } from '@/types/database';

interface TableWithStatus extends Table {
  currentStatus: 'available' | 'reserved' | 'occupied';
  currentReservation?: Reservation;
}

export default function TablesPage() {
  const supabase = createClient();
  const [tables, setTables] = useState<TableWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  // Form state
  const [formNumber, setFormNumber] = useState('');
  const [formCapacity, setFormCapacity] = useState(2);
  const [formLocation, setFormLocation] = useState('main');

  useEffect(() => {
    fetchTables();
  }, []);

  async function fetchTables() {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const { data: tablesData } = await supabase
      .from('tables')
      .select('*')
      .order('table_number');

    const { data: reservations } = await supabase
      .from('reservations')
      .select('*, table_assignments(table_id)')
      .eq('date', today)
      .in('status', ['confirmed', 'seated']);

    const tablesWithStatus: TableWithStatus[] = (tablesData || []).map(table => {
      let currentStatus: 'available' | 'reserved' | 'occupied' = 'available';
      let currentReservation: Reservation | undefined;

      if (reservations) {
        for (const res of reservations) {
          const assignments = (res.table_assignments || []) as { table_id: string }[];
          const isAssigned = assignments.some(a => a.table_id === table.id);
          if (!isAssigned) continue;

          if (res.status === 'seated') {
            currentStatus = 'occupied';
            currentReservation = res;
            break;
          }
          // If confirmed and time overlaps with current time
          if (res.time <= currentTime && res.end_time > currentTime) {
            currentStatus = 'reserved';
            currentReservation = res;
          } else if (res.time > currentTime && currentStatus === 'available') {
            currentStatus = 'reserved';
            currentReservation = res;
          }
        }
      }

      return { ...table, currentStatus, currentReservation };
    });

    setTables(tablesWithStatus);
    setLoading(false);
  }

  async function handleSaveTable(e: React.FormEvent) {
    e.preventDefault();
    const { error } = editingTable
      ? await supabase.from('tables').update({ table_number: formNumber, capacity: formCapacity, location: formLocation }).eq('id', editingTable.id)
      : await supabase.from('tables').insert({ table_number: formNumber, capacity: formCapacity, location: formLocation });
    if (error) {
      alert(`Failed to save table: ${error.message}`);
      return;
    }
    resetForm();
    fetchTables();
  }

  async function toggleActive(table: Table) {
    const { error } = await supabase.from('tables').update({ is_active: !table.is_active }).eq('id', table.id);
    if (error) { alert('Failed to update table.'); return; }
    fetchTables();
  }

  async function deleteTable(id: string) {
    if (!confirm('Are you sure you want to delete this table?')) return;
    const { error } = await supabase.from('tables').delete().eq('id', id);
    if (error) { alert('Failed to delete table. It may have active reservations.'); return; }
    fetchTables();
  }

  function startEdit(table: Table) {
    setEditingTable(table);
    setFormNumber(table.table_number);
    setFormCapacity(table.capacity);
    setFormLocation(table.location || 'main');
    setShowAddForm(true);
  }

  function resetForm() {
    setShowAddForm(false);
    setEditingTable(null);
    setFormNumber('');
    setFormCapacity(2);
    setFormLocation('main');
  }

  function statusBadge(status: string) {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-700 border-green-200';
      case 'reserved': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'occupied': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  }

  function cardBorderColor(status: string) {
    switch (status) {
      case 'available': return 'border-green-200';
      case 'reserved': return 'border-blue-200';
      case 'occupied': return 'border-red-200';
      default: return 'border-gray-200';
    }
  }

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Tables</h1>
          <p className="text-gray-500 text-sm mt-1">Manage restaurant tables and view statuses</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddForm(true); }}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition"
        >
          + Add Table
        </button>
      </div>

      {/* Add/Edit form */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{editingTable ? 'Edit Table' : 'Add New Table'}</h2>
          <form onSubmit={handleSaveTable} className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Table Number</label>
              <input
                type="text"
                value={formNumber}
                onChange={e => setFormNumber(e.target.value)}
                placeholder="T11"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
              <input
                type="number"
                value={formCapacity}
                onChange={e => setFormCapacity(Number(e.target.value))}
                min={1}
                max={20}
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={formLocation}
                onChange={e => setFormLocation(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="main">Main</option>
                <option value="window">Window</option>
                <option value="patio">Patio</option>
                <option value="private">Private</option>
              </select>
            </div>
            <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition">
              {editingTable ? 'Update' : 'Add'}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse text-gray-400">Loading tables...</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map(table => (
            <div
              key={table.id}
              className={`bg-white rounded-xl border p-5 transition ${!table.is_active ? 'opacity-50' : ''} ${cardBorderColor(table.currentStatus)}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold">{table.table_number}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge(table.currentStatus)}`}>
                  {table.currentStatus}
                </span>
              </div>
              <div className="text-sm text-gray-500 space-y-1 mb-4">
                <p>Seats {table.capacity} · {table.location || 'main'}</p>
                {table.currentReservation && (
                  <p className="text-gray-700 font-medium">
                    {table.currentReservation.guest_name} · {formatTime(table.currentReservation.time)}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(table)} className="text-xs text-gray-500 hover:text-gray-700">Edit</button>
                <button onClick={() => toggleActive(table)} className="text-xs text-gray-500 hover:text-gray-700">
                  {table.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => deleteTable(table.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
