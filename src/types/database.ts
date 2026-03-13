export interface RestaurantSettings {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  opening_hours: Record<string, { open: string; close: string }>;
  default_dining_duration_minutes: number;
  max_party_size: number;
  booking_lead_days: number;
  created_at: string;
  updated_at: string;
}

export interface Table {
  id: string;
  table_number: string;
  capacity: number;
  location: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Guest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  total_visits: number;
  last_visit_at: string | null;
  is_vip: boolean;
  created_at: string;
  updated_at: string;
}

export interface GuestNote {
  id: string;
  guest_id: string;
  note: string;
  category: 'allergy' | 'preference' | 'vip' | 'birthday' | 'general';
  created_by: string | null;
  created_at: string;
}

export type ReservationStatus = 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';

export interface Reservation {
  id: string;
  guest_id: string | null;
  booking_ref: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string;
  party_size: number;
  date: string;
  time: string;
  duration_minutes: number;
  end_time: string;
  special_requests: string | null;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
}

export interface TableAssignment {
  id: string;
  reservation_id: string;
  table_id: string;
  assigned_at: string;
}

// Extended types with joins
export interface ReservationWithTable extends Reservation {
  table_assignments?: (TableAssignment & { tables?: Table })[];
}

export interface GuestWithNotes extends Guest {
  guest_notes?: GuestNote[];
}
