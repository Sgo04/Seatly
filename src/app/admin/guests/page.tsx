'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDateShort } from '@/lib/utils';
import AdminLayout from '@/components/admin/AdminLayout';
import type { GuestWithNotes, GuestNote } from '@/types/database';

const NOTE_CATEGORIES = ['general', 'allergy', 'preference', 'vip', 'birthday'] as const;

export default function GuestsPage() {
  const supabase = createClient();
  const [guests, setGuests] = useState<GuestWithNotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<GuestWithNotes | null>(null);
  const [newNote, setNewNote] = useState('');
  const [noteCategory, setNoteCategory] = useState<string>('general');

  useEffect(() => {
    fetchGuests();
  }, []);

  async function fetchGuests() {
    setLoading(true);
    const { data } = await supabase
      .from('guests')
      .select('*, guest_notes(*)')
      .order('updated_at', { ascending: false });
    setGuests(data || []);
    setLoading(false);
  }

  async function toggleVip(guest: GuestWithNotes) {
    await supabase.from('guests').update({ is_vip: !guest.is_vip }).eq('id', guest.id);
    fetchGuests();
    if (selectedGuest?.id === guest.id) {
      setSelectedGuest({ ...selectedGuest, is_vip: !guest.is_vip });
    }
  }

  async function addNote() {
    if (!selectedGuest || !newNote.trim()) return;
    const { error } = await supabase.from('guest_notes').insert({
      guest_id: selectedGuest.id,
      note: newNote.trim(),
      category: noteCategory,
      created_by: 'admin',
    });
    if (error) { alert('Failed to add note.'); return; }
    setNewNote('');
    setNoteCategory('general');
    // Refresh selected guest
    const { data } = await supabase
      .from('guests')
      .select('*, guest_notes(*)')
      .eq('id', selectedGuest.id)
      .single();
    if (data) {
      setSelectedGuest(data);
      fetchGuests();
    }
  }

  async function deleteNote(noteId: string) {
    const { error } = await supabase.from('guest_notes').delete().eq('id', noteId);
    if (error) { alert('Failed to delete note.'); return; }
    if (selectedGuest) {
      const { data } = await supabase
        .from('guests')
        .select('*, guest_notes(*)')
        .eq('id', selectedGuest.id)
        .single();
      if (data) {
        setSelectedGuest(data);
        fetchGuests();
      }
    }
  }

  const filteredGuests = guests.filter(g => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.email?.toLowerCase().includes(q) ||
      g.phone?.toLowerCase().includes(q)
    );
  });

  function categoryBadge(cat: string) {
    switch (cat) {
      case 'allergy': return 'bg-red-100 text-red-700';
      case 'preference': return 'bg-blue-100 text-blue-700';
      case 'vip': return 'bg-purple-100 text-purple-700';
      case 'birthday': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Guests</h1>
          <p className="text-gray-500 text-sm mt-1">Manage guest profiles and notes</p>
        </div>
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full sm:w-80 focus:ring-2 focus:ring-primary-500 outline-none"
        />
      </div>

      <div className="flex gap-6">
        {/* Guest list */}
        <div className="flex-1">
          {loading ? (
            <div className="animate-pulse text-gray-400">Loading guests...</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200">
              {filteredGuests.length === 0 ? (
                <p className="px-6 py-12 text-center text-gray-400">No guests found</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filteredGuests.map(guest => (
                    <button
                      key={guest.id}
                      onClick={() => setSelectedGuest(guest)}
                      className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition ${selectedGuest?.id === guest.id ? 'bg-primary-50' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {guest.name}
                            {guest.is_vip && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">VIP</span>}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {guest.email || 'No email'} · {guest.phone || 'No phone'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-700">{guest.total_visits} visits</p>
                          {guest.last_visit_at && (
                            <p className="text-xs text-gray-400">Last: {formatDateShort(guest.last_visit_at.split('T')[0])}</p>
                          )}
                        </div>
                      </div>
                      {guest.guest_notes && guest.guest_notes.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {guest.guest_notes.slice(0, 3).map(note => (
                            <span key={note.id} className={`text-xs px-2 py-0.5 rounded-full ${categoryBadge(note.category)}`}>
                              {note.category}
                            </span>
                          ))}
                          {guest.guest_notes.length > 3 && (
                            <span className="text-xs text-gray-400">+{guest.guest_notes.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Guest detail panel */}
        {selectedGuest && (
          <div className="w-96 bg-white rounded-xl border border-gray-200 p-6 sticky top-6 self-start">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{selectedGuest.name}</h2>
              <button
                onClick={() => toggleVip(selectedGuest)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition ${selectedGuest.is_vip ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {selectedGuest.is_vip ? 'VIP' : 'Mark VIP'}
              </button>
            </div>

            <div className="space-y-3 text-sm mb-6">
              <div><span className="text-gray-500">Email:</span> <span className="ml-2">{selectedGuest.email || '—'}</span></div>
              <div><span className="text-gray-500">Phone:</span> <span className="ml-2">{selectedGuest.phone || '—'}</span></div>
              <div><span className="text-gray-500">Total Visits:</span> <span className="ml-2 font-medium">{selectedGuest.total_visits}</span></div>
              {selectedGuest.last_visit_at && (
                <div><span className="text-gray-500">Last Visit:</span> <span className="ml-2">{formatDateShort(selectedGuest.last_visit_at.split('T')[0])}</span></div>
              )}
            </div>

            {/* Notes */}
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Notes</h3>

              {selectedGuest.guest_notes && selectedGuest.guest_notes.length > 0 ? (
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {selectedGuest.guest_notes.map((note: GuestNote) => (
                    <div key={note.id} className="flex items-start gap-2 text-sm">
                      <span className={`shrink-0 mt-0.5 text-xs px-2 py-0.5 rounded-full ${categoryBadge(note.category)}`}>
                        {note.category}
                      </span>
                      <span className="flex-1 text-gray-700">{note.note}</span>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="shrink-0 text-xs text-gray-400 hover:text-red-500"
                        title="Delete note"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 mb-4">No notes yet</p>
              )}

              {/* Add note */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={noteCategory}
                    onChange={e => setNoteCategory(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs outline-none"
                  >
                    {NOTE_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    onKeyDown={e => e.key === 'Enter' && addNote()}
                  />
                </div>
                <button
                  onClick={addNote}
                  disabled={!newNote.trim()}
                  className="w-full py-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-200 text-white disabled:text-gray-400 text-sm font-medium rounded-lg transition"
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
