import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { calculateEndTime } from '@/lib/utils';

/**
 * GET /api/availability?date=YYYY-MM-DD&time=HH:mm&partySize=N
 *
 * Checks if a table is available for the given date, time, and party size.
 * Returns available tables and, if none, suggests the nearest available time.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const time = searchParams.get('time');
  const partySize = Number(searchParams.get('partySize'));

  if (!date || !time || !partySize) {
    return NextResponse.json({ error: 'Missing required parameters: date, time, partySize' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // Get dining duration from settings
  const { data: settings } = await supabase
    .from('restaurant_settings')
    .select('default_dining_duration_minutes, opening_hours')
    .single();

  const duration = settings?.default_dining_duration_minutes || 90;
  const endTime = calculateEndTime(time, duration);

  // Get tables that can seat the party
  const { data: tables } = await supabase
    .from('tables')
    .select('*')
    .eq('is_active', true)
    .gte('capacity', partySize)
    .order('capacity', { ascending: true });

  if (!tables || tables.length === 0) {
    return NextResponse.json({
      available: false,
      message: `No tables can accommodate a party of ${partySize}`,
    });
  }

  // Get reservations for the date that could conflict
  const { data: reservations } = await supabase
    .from('reservations')
    .select('*, table_assignments(table_id)')
    .eq('date', date)
    .in('status', ['confirmed', 'seated']);

  // Determine which tables are occupied during the requested window
  const occupiedTableIds = new Set<string>();
  if (reservations) {
    for (const res of reservations) {
      const overlaps = time < res.end_time && endTime > res.time;
      if (overlaps) {
        for (const ta of (res.table_assignments || []) as { table_id: string }[]) {
          occupiedTableIds.add(ta.table_id);
        }
      }
    }
  }

  const availableTables = tables.filter(t => !occupiedTableIds.has(t.id));

  if (availableTables.length > 0) {
    return NextResponse.json({
      available: true,
      tables: availableTables,
      suggestedTable: availableTables[0],
    });
  }

  // No tables available at this time — find next available slot
  return NextResponse.json({
    available: false,
    message: 'No tables available for this time slot',
  });
}
