-- Seed data for Seatly

-- Restaurant settings
insert into restaurant_settings (name, phone, email, address) values (
  'Seatly Restaurant & Bar',
  '+1 (555) 123-4567',
  'hello@seatly.com',
  '123 Main Street, Downtown'
);

-- Tables
insert into tables (table_number, capacity, location) values
  ('T1', 2, 'window'),
  ('T2', 2, 'window'),
  ('T3', 4, 'main'),
  ('T4', 4, 'main'),
  ('T5', 4, 'main'),
  ('T6', 6, 'main'),
  ('T7', 6, 'patio'),
  ('T8', 8, 'private'),
  ('T9', 8, 'private'),
  ('T10', 12, 'private');

-- Sample guests
insert into guests (id, name, email, phone, total_visits, is_vip) values
  ('a1111111-1111-1111-1111-111111111111', 'James Wilson', 'james@example.com', '+1 (555) 100-0001', 12, true),
  ('a2222222-2222-2222-2222-222222222222', 'Sarah Chen', 'sarah@example.com', '+1 (555) 100-0002', 5, false),
  ('a3333333-3333-3333-3333-333333333333', 'Michael Brown', 'michael@example.com', '+1 (555) 100-0003', 8, true);

-- Sample guest notes
insert into guest_notes (guest_id, note, category, created_by) values
  ('a1111111-1111-1111-1111-111111111111', 'Prefers window seating', 'preference', 'system'),
  ('a1111111-1111-1111-1111-111111111111', 'Nut allergy', 'allergy', 'system'),
  ('a3333333-3333-3333-3333-333333333333', 'Birthday in March — complimentary dessert', 'birthday', 'system'),
  ('a3333333-3333-3333-3333-333333333333', 'VIP — regular since opening night', 'vip', 'system');

-- Sample reservations for today (use current_date so they always appear)
insert into reservations (booking_ref, guest_id, guest_name, guest_email, guest_phone, party_size, date, time, end_time, status, special_requests) values
  ('SLY-001', 'a1111111-1111-1111-1111-111111111111', 'James Wilson', 'james@example.com', '+1 (555) 100-0001', 2, current_date, '12:00', '13:30', 'confirmed', 'Window table please'),
  ('SLY-002', 'a2222222-2222-2222-2222-222222222222', 'Sarah Chen', 'sarah@example.com', '+1 (555) 100-0002', 4, current_date, '13:00', '14:30', 'seated', null),
  ('SLY-003', 'a3333333-3333-3333-3333-333333333333', 'Michael Brown', 'michael@example.com', '+1 (555) 100-0003', 6, current_date, '19:00', '20:30', 'confirmed', 'Birthday celebration — need cake'),
  ('SLY-004', null, 'Emily Davis', 'emily@example.com', '+1 (555) 100-0004', 2, current_date, '18:30', '20:00', 'confirmed', null),
  ('SLY-005', null, 'Robert Lee', null, '+1 (555) 100-0005', 8, current_date, '20:00', '21:30', 'confirmed', 'Business dinner');
