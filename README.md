# Seatly — Restaurant Reservation & Guest Management

A full-stack MVP for restaurant table reservations and guest management, built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

**Customer-facing:**
- Restaurant landing page
- Online reservation form with real-time availability checking
- Date, time, and party size selection
- Automatic table assignment
- Booking confirmation with reference code
- Suggests alternative times when preferred slot is unavailable

**Admin / Staff:**
- Secure login (Supabase Auth)
- Dashboard with today's stats (reservations, seated, no-shows, upcoming, VIPs)
- Reservation management with status updates (confirm, seat, complete, cancel, no-show)
- Table assignment and management
- Guest profiles with visit history
- Guest notes (allergies, preferences, VIP, birthday)
- Configurable restaurant settings (hours, dining duration, max party size)

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Database & Auth:** Supabase
- **Deployment:** Vercel-ready

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)

### 1. Clone and install

```bash
cd Seatly
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Then run `supabase/seed.sql` to populate sample data
4. Go to **Project Settings > API** and copy:
   - Project URL
   - `anon` public key

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Create an admin user

In your Supabase dashboard, go to **Authentication > Users** and create a new user with email/password. This will be your admin login.

### 5. Run the development server

```bash
npm run dev
```

Visit:
- **Customer site:** http://localhost:3000
- **Reserve a table:** http://localhost:3000/reserve
- **Admin login:** http://localhost:3000/admin/login
- **Admin dashboard:** http://localhost:3000/admin/dashboard

## Project Structure

```
src/
├── app/
│   ├── page.tsx                        # Landing page
│   ├── reserve/page.tsx                # Reservation form
│   ├── reservation/confirmation/       # Booking confirmation
│   ├── admin/
│   │   ├── login/page.tsx              # Staff login
│   │   ├── dashboard/page.tsx          # Dashboard with stats
│   │   ├── reservations/page.tsx       # Reservation management
│   │   ├── guests/page.tsx             # Guest profiles & notes
│   │   ├── tables/page.tsx             # Table management
│   │   └── settings/page.tsx           # Restaurant settings
│   └── api/
│       └── availability/route.ts       # Availability check API
├── components/
│   └── admin/
│       └── AdminLayout.tsx             # Sidebar layout
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # Browser Supabase client
│   │   ├── server.ts                   # Server Supabase client
│   │   └── middleware.ts               # Auth middleware
│   └── utils.ts                        # Helpers (time, dates, etc.)
├── types/
│   └── database.ts                     # TypeScript types
└── middleware.ts                        # Next.js middleware (auth guard)
supabase/
├── schema.sql                          # Database schema
└── seed.sql                            # Sample data
```

## Database Schema

| Table                | Purpose                              |
|----------------------|--------------------------------------|
| `restaurant_settings`| Single-row config (hours, name, etc)|
| `tables`             | Physical tables with capacity        |
| `guests`             | Guest profiles with visit tracking   |
| `guest_notes`        | Notes attached to guests             |
| `reservations`       | All bookings with status tracking    |
| `table_assignments`  | Links reservations to tables         |

## Reservation Logic

- Availability is calculated based on party size, time slot, dining duration, and existing bookings
- Tables are matched by smallest-fit-first (smallest table that fits the party)
- Time overlap detection prevents double-booking
- Default dining duration is 90 minutes (configurable)
- If no table is available, the system suggests the nearest valid time slot

## Deploy to Vercel

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Deploy
