-- Seatly: Restaurant Reservation & Guest Management
-- Run this in your Supabase SQL editor to set up the database

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Restaurant settings (single-row config)
create table restaurant_settings (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'Seatly Restaurant',
  phone text,
  email text,
  address text,
  -- Opening hours stored as JSON: { "monday": { "open": "11:00", "close": "22:00" }, ... }
  opening_hours jsonb not null default '{
    "monday":    { "open": "11:00", "close": "22:00" },
    "tuesday":   { "open": "11:00", "close": "22:00" },
    "wednesday": { "open": "11:00", "close": "22:00" },
    "thursday":  { "open": "11:00", "close": "22:00" },
    "friday":    { "open": "11:00", "close": "23:00" },
    "saturday":  { "open": "10:00", "close": "23:00" },
    "sunday":    { "open": "10:00", "close": "21:00" }
  }'::jsonb,
  default_dining_duration_minutes int not null default 90,
  max_party_size int not null default 12,
  booking_lead_days int not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tables in the restaurant
create table tables (
  id uuid primary key default uuid_generate_v4(),
  table_number text not null unique,
  capacity int not null,
  location text, -- e.g. 'patio', 'main', 'private'
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Guest profiles (created from reservation data or manually)
create table guests (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  total_visits int not null default 0,
  last_visit_at timestamptz,
  is_vip boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Notes attached to guests (allergies, preferences, etc.)
create table guest_notes (
  id uuid primary key default uuid_generate_v4(),
  guest_id uuid not null references guests(id) on delete cascade,
  note text not null,
  category text not null default 'general', -- 'allergy', 'preference', 'vip', 'birthday', 'general'
  created_by text, -- admin name or 'system'
  created_at timestamptz not null default now()
);

-- Reservations
create table reservations (
  id uuid primary key default uuid_generate_v4(),
  guest_id uuid references guests(id) on delete set null,
  booking_ref text not null unique,
  guest_name text not null,
  guest_email text,
  guest_phone text not null,
  party_size int not null,
  date date not null,
  time time not null,
  duration_minutes int not null default 90,
  end_time time not null, -- computed: time + duration
  special_requests text,
  status text not null default 'confirmed',
  -- status: 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Table assignments for reservations
create table table_assignments (
  id uuid primary key default uuid_generate_v4(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  table_id uuid not null references tables(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique(reservation_id, table_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_reservations_date on reservations(date);
create index idx_reservations_status on reservations(status);
create index idx_reservations_booking_ref on reservations(booking_ref);
create index idx_guests_email on guests(email);
create index idx_guests_phone on guests(phone);
create index idx_guest_notes_guest_id on guest_notes(guest_id);
create index idx_table_assignments_reservation on table_assignments(reservation_id);
create index idx_table_assignments_table on table_assignments(table_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table restaurant_settings enable row level security;
alter table tables enable row level security;
alter table guests enable row level security;
alter table guest_notes enable row level security;
alter table reservations enable row level security;
alter table table_assignments enable row level security;

-- Public read for restaurant settings (customers need opening hours)
create policy "Public can read settings" on restaurant_settings
  for select using (true);

-- Public read for tables (for availability checking)
create policy "Public can read tables" on tables
  for select using (true);

-- Public can read reservations they created (by booking ref - handled via API)
create policy "Public can read reservations" on reservations
  for select using (true);

-- Public can insert reservations (booking flow)
create policy "Public can create reservations" on reservations
  for insert with check (true);

-- Public can read guests (for lookup during booking)
create policy "Public can read guests" on guests
  for select using (true);

-- Public can insert guests (created during booking)
create policy "Public can create guests" on guests
  for insert with check (true);

-- Authenticated users (admin) can do everything
create policy "Admin full access settings" on restaurant_settings
  for all using (auth.role() = 'authenticated');

create policy "Admin full access tables" on tables
  for all using (auth.role() = 'authenticated');

create policy "Admin full access guests" on guests
  for all using (auth.role() = 'authenticated');

create policy "Admin full access guest_notes" on guest_notes
  for all using (auth.role() = 'authenticated');

create policy "Public can read guest_notes" on guest_notes
  for select using (true);

create policy "Admin full access reservations" on reservations
  for all using (auth.role() = 'authenticated');

create policy "Admin full access table_assignments" on table_assignments
  for all using (auth.role() = 'authenticated');

create policy "Public can read table_assignments" on table_assignments
  for select using (true);

create policy "Public can create table_assignments" on table_assignments
  for insert with check (true);

-- Allow public to update guests (for incrementing visit count during booking)
create policy "Public can update guests" on guests
  for update using (true);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_restaurant_settings_updated
  before update on restaurant_settings
  for each row execute function update_updated_at();

create trigger trg_guests_updated
  before update on guests
  for each row execute function update_updated_at();

create trigger trg_reservations_updated
  before update on reservations
  for each row execute function update_updated_at();
