# Swan Lake Country Club — Online Services Portal

Online booking, membership, billing, and club management portal for [Swan Lake Country Club](https://www.swanlakecc.com) in Pengilly, Minnesota. Designed to run on a subdomain such as `book.swanlakecc.com`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS (custom Swan Lake theme) |
| Database | SQLite via `better-sqlite3` (WAL mode) |
| Auth | NextAuth.js v5 — credentials, Google OAuth, Apple Sign In |
| Email | Nodemailer (SMTP) |
| Payments | Square SDK + Web Payments SDK; QuickBooks Payments |
| Process manager | PM2 |
| Web server | nginx |

---

## Features

### Tee Time Booking (`/tee-times`)

- Browse available times for any date within the configured booking window
- 12-minute slots from first to last tee time (configurable)
- Party sizes 1–12; large parties automatically reserve 2–3 consecutive slots
- Concurrency-safe: `BEGIN IMMEDIATE` transaction + unique partial index prevent double-booking
- Optional equipment rental per booking: power carts, walking buggies, club sets, personal cart drop

**Availability rules (all configurable in Admin → Settings):**

| Rule | Config key | Default |
|------|-----------|---------|
| Season open date | `season_start` (MM-DD) | `05-01` |
| Season close date | `season_end` (MM-DD) | `10-31` |
| First tee time | `tee_time_open` | `07:00` |
| Last tee time | `tee_time_close` | `17:48` |
| Sunset cutoff | `sunset_cutoff_enabled` | `true` |
| Hours before sunset | `sunset_cutoff_hours` | `2` |
| Course coordinates | `course_latitude` / `course_longitude` | Pengilly, MN |

The sunset cutoff uses a pure astronomical calculation (no API key) — the last available slot updates daily based on the actual sunset time for the configured coordinates. It only applies if it falls *earlier* than `tee_time_close`, so special events like twilight golf can be enabled by toggling `sunset_cutoff_enabled` off or extending `tee_time_close`.

**Private event blocking:** any event marked as Private in Admin → Events blocks online tee time bookings during the event's time window on that date. Affected slots show as "Private Event" in purple on the booking grid.

### Memberships (`/memberships`)

Six tiers matching current Swan Lake CC pricing:

| Tier | Price |
|------|-------|
| Junior Summer Pass (18 and under) | $100 |
| Young Adult (19–29) | $445 |
| Single | $740 *(+ $100 gift card for new members)* |
| Household | $962.50 *(+ $100 gift card for new members)* |
| Driving Range Pass – Single | $80 |
| Driving Range Pass – Household | $125 |

Payment options: Google Pay, Apple Pay, credit/debit card (Square), or invoice/ACH (QuickBooks).

Members can opt in to **auto-renewal** at checkout — card is tokenized via Square Card on File, never stored raw.

### Tournaments (`/tournaments`)

Six formats:

- **Luck of the Draw** — individual entry, admin runs blind random draw to form teams
- **Scramble** — captain's choice; same draw algorithm
- **Best Ball** — team play; draw assigns teams
- **Stroke Play** — individual gross/net scoring
- **Stableford** — individual points scoring
- **Match Play** — head-to-head

Admin tools: run/re-run draw, bulk-assign tee times to teams, inline score entry, auto-ranked leaderboard. Leftover players distributed evenly rather than leaving an undersized team.

### Events (`/events`)

- Public events calendar with type filtering (tournament, league, clinic, social)
- Online registration with party size and real-time spot tracking
- **Private events** — hidden from public calendar; blocks tee time booking during event hours

### Transactional Email

Automatic confirmations sent via SMTP (Nodemailer) for:

- Tee time bookings
- Membership purchases
- Tournament registrations
- Membership renewal reminders

Configured in Admin → Settings. Silently skips if `smtp_host` is not set.

### Recurring Membership Billing (`/admin/billing`)

- Lists memberships expiring within 30 days
- Shows which have a card on file ("auto-renewal ready") vs. not
- Bulk select → charge saved cards and create new membership record for next season
- "Send Renewal Reminders" emails members without a card on file
- Cron-safe: `POST /api/admin/billing/renew?secret=CRON_SECRET` for automated scheduling

---

## Admin Panel (`/admin`)

| Section | Description |
|---------|-------------|
| **Tee Sheet** | Visual day view — all 55 slots, color-coded by status, click to check in or cancel |
| **Bookings** | Tabular list of all tee time reservations, filter by date |
| **Memberships** | Full member roster, payment status, NFC card management |
| **Billing** | Bulk renewal processing, manual charges, renewal reminders |
| **Tournaments** | Create events, manage entries, run draws, assign tee times, enter scores |
| **Events** | Create/edit/delete events; toggle Public ↔ Private with one click |
| **Equipment** | Full inventory with make, model, year, serial, color, seats, fuel type, battery year, hours, last service |
| **Settings** | All site configuration in the database — no rebuild required |

### Tee Sheet

- Color-coded: open (gray), booked (gold), checked-in (teal), multi-slot group (purple), cancelled (red), private event (purple badge)
- Click any booked slot: name, contact, players, holes, equipment, notes
- Check in, edit, or cancel directly from the panel
- Date navigation with prev/next and date picker

### Settings (`/admin/settings`)

All configuration is stored in the database. Sections:

- **Course Operation** — open/closed, booking window, green fees, cart fees, season dates, tee time hours, clubhouse hours, sunset cutoff, course coordinates
- **Email (SMTP)** — host, port, credentials, from address
- **Square Payments** — access token, app ID, location ID, environment
- **QuickBooks Payments** — client credentials, redirect URI, environment
- **Google Sign In** — OAuth client ID and secret
- **Apple Sign In** — Services ID and private key
- **Security** — cron secret for billing automation

Changes take effect immediately without a server restart, except OAuth credentials (Google/Apple) which require a restart.

---

## Desk / Counter Mode (`/desk`)

Full-screen kiosk for the pro shop counter. Installable as a PWA on any device.

- **Screen Wake Lock** — display stays on while open
- **NFC Member Check-In** — tap card/fob to look up member and check in to tee time
- **Member Search** — manual lookup by name or member number

**PWA installation:** iOS → Safari Share → Add to Home Screen. Android/Desktop → Chrome install prompt or address bar icon.

---

## Environment Variables

Only two variables are required in `.env.local`:

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | Random secret for signing session tokens. Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Full URL of the app, e.g. `https://book.swanlakecc.com` |

All other configuration (SMTP, Square, QuickBooks, Google/Apple OAuth, fees, hours) is managed through Admin → Settings.

---

## Development Setup

```bash
# Install dependencies
npm install --legacy-peer-deps

# Copy env template and set AUTH_SECRET + NEXTAUTH_URL
cp .env.local.example .env.local

# Seed development database (creates swan-lake.db with sample data)
npm run db:setup

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Default admin account:** `admin@swanlakecc.com` / `admin`
Log in, add your own email as an admin at `/admin/settings`, then remove the default account.

---

## Production Deployment (PM2 + nginx)

```bash
# Build
npm run build

# Start with PM2
pm2 start npm --name swan-lake -- start
pm2 save
pm2 startup

# nginx proxy to port 3000
# SSL via Let's Encrypt / certbot
```

The SQLite database file (`swan-lake.db`) lives in the project root. Back it up regularly — WAL mode is enabled for safe concurrent reads.

---

## Project Structure

```
src/
  app/
    page.tsx                    # Homepage
    tee-times/page.tsx          # Public booking grid
    memberships/page.tsx        # Membership tiers + checkout
    tournaments/                # Public tournament list + detail
    events/page.tsx             # Public events calendar
    login/page.tsx              # Sign in (credentials + OAuth)
    register/page.tsx           # Account creation
    admin/
      layout.tsx                # Server auth guard
      page.tsx                  # Dashboard stats
      tee-sheet/page.tsx        # Visual tee sheet
      tee-times/page.tsx        # Bookings table
      memberships/page.tsx      # Member roster + NFC
      billing/page.tsx          # Billing dashboard
      tournaments/              # Tournament management
      events/page.tsx           # Event management
      equipment/page.tsx        # Equipment inventory
      settings/page.tsx         # Site configuration
    desk/                       # Counter/kiosk mode
    api/
      tee-times/route.ts        # Public booking API (season + sunset enforced)
      memberships/route.ts      # Membership purchase
      tournaments/              # Public tournament endpoints
      events/route.ts           # Public events
      config/public/route.ts    # Non-sensitive Square config for browser
      admin/
        tee-sheet/              # Admin tee sheet data
        tee-times/              # Edit/cancel bookings
        memberships/            # NFC management
        billing/renew/          # Renewal processing + cron endpoint
        tournaments/            # Draw, scores, tee time assignment
        events/                 # Admin event CRUD (all events incl. private)
        equipment/              # Equipment CRUD
        settings/               # site_config read/write
        users/                  # Admin user management
      payments/
        square/                 # Hosted checkout + Web Payments token processing
        square/process/         # Card-on-file + save card
        quickbooks/             # QuickBooks invoice
      desk/                     # Desk/kiosk APIs
  components/
    Header.tsx
    Footer.tsx
    SquareWalletButtons.tsx     # Google Pay / Apple Pay (fetches config at runtime)
  lib/
    db/
      index.ts                  # SQLite connection, schema, migrations, config seeding
      setup.ts                  # Dev seed script
    admin.ts                    # isAdminEmail(), getConfigValue()
    email.ts                    # SMTP transactional email
    sunset.ts                   # Astronomical sunset calculation (no API key)
    square/client.ts            # Square client (reads credentials from DB)
    types.ts                    # Shared types, MEMBERSHIP_TYPES, TEE_TIME_SLOTS
  auth.ts                       # NextAuth config (Node.js — DB-backed providers)
  auth.config.ts                # Edge-safe auth config (middleware only)
  middleware.ts                 # Redirects unauthenticated users from /admin
```

---

## API Reference

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tee-times?date=YYYY-MM-DD` | Slots, equipment, season info, sunset cutoff, private event blocks |
| POST | `/api/tee-times` | Book a tee time |
| DELETE | `/api/tee-times?id=` | Cancel a booking |
| GET | `/api/memberships` | Membership tiers |
| POST | `/api/memberships` | Create membership record |
| GET | `/api/tournaments` | Upcoming tournaments |
| GET | `/api/tournaments/[id]` | Tournament detail with entries and teams |
| POST | `/api/tournaments/[id]/enter` | Register for a tournament |
| DELETE | `/api/tournaments/[id]/enter` | Withdraw from a tournament |
| GET | `/api/events` | Upcoming public events |
| POST | `/api/events/[id]/register` | Register for an event |
| GET | `/api/config/public` | Square app ID / location ID for browser |

### Admin Endpoints (require admin session)

| Method | Path | Description |
|--------|------|-------------|
| GET/PUT | `/api/admin/settings` | Read/write site_config |
| GET/POST/DELETE | `/api/admin/users` | Admin user management |
| GET/POST/PATCH/DELETE | `/api/admin/events` | Full event management including private events |
| GET/PUT | `/api/admin/tee-sheet?date=` | All slots for tee sheet view |
| GET/POST/PUT/DELETE | `/api/admin/tee-times` | Booking management |
| GET/POST/PUT/DELETE | `/api/admin/equipment` | Equipment inventory |
| GET/POST | `/api/admin/billing/renew` | Preview/process membership renewals |
| POST | `/api/admin/tournaments/[id]/draw` | Run blind draw |
| PUT | `/api/admin/tournaments/[id]/scores` | Bulk score entry |
| POST | `/api/admin/tournaments/[id]/tee-times` | Bulk tee time assignment |
