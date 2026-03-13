'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import type { RestaurantSettings } from '@/types/database';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function SettingsPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [diningDuration, setDiningDuration] = useState(90);
  const [maxPartySize, setMaxPartySize] = useState(12);
  const [bookingLeadDays, setBookingLeadDays] = useState(30);
  const [hours, setHours] = useState<Record<string, { open: string; close: string }>>({});

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('restaurant_settings').select('*').single();
      if (data) {
        setSettings(data);
        setName(data.name);
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setAddress(data.address || '');
        setDiningDuration(data.default_dining_duration_minutes);
        setMaxPartySize(data.max_party_size);
        setBookingLeadDays(data.booking_lead_days);
        setHours(data.opening_hours);
      }
      setLoading(false);
    }
    fetchSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaved(false);

    const { error } = await supabase
      .from('restaurant_settings')
      .update({
        name,
        phone: phone || null,
        email: email || null,
        address: address || null,
        default_dining_duration_minutes: diningDuration,
        max_party_size: maxPartySize,
        booking_lead_days: bookingLeadDays,
        opening_hours: hours,
      })
      .eq('id', settings.id);

    setSaving(false);
    if (error) {
      alert('Failed to save settings. Please try again.');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function updateHour(day: string, field: 'open' | 'close', value: string) {
    setHours(prev => {
      const existing = prev[day] || { open: '', close: '' };
      return {
        ...prev,
        [day]: { ...existing, [field]: value },
      };
    });
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="animate-pulse text-gray-400">Loading settings...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure restaurant details and operating hours</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        {/* Restaurant Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Restaurant Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
        </div>

        {/* Booking Config */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Booking Configuration</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dining Duration (min)</label>
              <input
                type="number"
                value={diningDuration}
                onChange={e => setDiningDuration(Number(e.target.value))}
                min={30}
                max={300}
                step={15}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Party Size</label>
              <input
                type="number"
                value={maxPartySize}
                onChange={e => setMaxPartySize(Number(e.target.value))}
                min={1}
                max={50}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booking Lead Days</label>
              <input
                type="number"
                value={bookingLeadDays}
                onChange={e => setBookingLeadDays(Number(e.target.value))}
                min={1}
                max={365}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Opening Hours */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Opening Hours</h2>
          <div className="space-y-3">
            {DAYS.map(day => (
              <div key={day} className="flex items-center gap-4">
                <span className="w-24 text-sm font-medium text-gray-700 capitalize">{day}</span>
                <input
                  type="time"
                  value={hours[day]?.open || ''}
                  onChange={e => updateHour(day, 'open', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="time"
                  value={hours[day]?.close || ''}
                  onChange={e => updateHour(day, 'close', e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">Settings saved!</span>}
        </div>
      </form>
    </AdminLayout>
  );
}
