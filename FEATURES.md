# Swan Lake CC — Feature Inventory

This file is the authoritative record of what is implemented. Update it whenever features are added, changed, or removed. Claude reads this at the start of each session to avoid README drift.

---

## Payment Processors

**Square** (primary):
- Credit/debit card via Square hosted checkout
- Google Pay + Apple Pay via Square Web Payments SDK (`SquareWalletButtons.tsx`)
- Card on File (`cardsApi.createCard`) for membership auto-renewal
- Charges via `paymentsApi.createPayment`
- Credentials stored in DB (`square_access_token`, `square_application_id`, `square_location_id`, `square_environment`)
- Client reads config at runtime from DB — no `NEXT_PUBLIC_` env vars needed; browser config served via `/api/config/public`

**QuickBooks** (invoice / ACH):
- OAuth flow, invoice creation
- Credentials in DB (`quickbooks_client_id`, `quickbooks_client_secret`, `quickbooks_redirect_uri`, `quickbooks_environment`)

**Stripe**: NOT present. Was never implemented. Any README reference to Stripe is incorrect.

**Square POS webhook** (`/api/webhooks/square`): Directory stub exists, no implementation yet.

**Toast POS webhook** (`/api/webhooks/toast`): Directory stub exists, no implementation yet.

---

## Authentication

- NextAuth v5 (Auth.js)
- Providers: Credentials (email/password, bcrypt), Google OAuth, Apple Sign In
- Google/Apple credentials read from DB at runtime (NOT env vars) — require server restart to take effect
- Edge-safe split: `auth.config.ts` (no DB, used by middleware) + `auth.ts` (full Node.js config)
- Middleware protects `/admin/*` — checks JWT only
- Admin layout does DB lookup (`isAdminEmail()`) for actual role verification
- Session shape: `{ user: { id, name, email, image, isAdmin } }`
- Default admin on fresh DB: `admin@swanlakecc.com` / `admin`

---

## Database

- SQLite via `better-sqlite3`, WAL mode
- File: `swan-lake.db` in project root
- Migrations in `src/lib/db/index.ts` (run automatically on startup)
- Dev seed: `npm run db:setup` (`src/lib/db/setup.ts`)

### Tables

| Table | Purpose |
|-------|---------|
| `users` | Registered accounts (id, email, name, password_hash) |
| `admin_users` | Emails with admin access (id, email, added_by, created_at) |
| `site_config` | Key/value store for all operational settings |
| `tee_times` | Booked tee time slots |
| `memberships` | Member records with payment and NFC info |
| `events` | Club events (public + private) |
| `event_registrations` | Event sign-ups |
| `tournaments` | Tournament definitions |
| `tournament_entries` | Individual player registrations |
| `tournament_teams` | Teams formed after draw |
| `equipment` | Physical inventory (carts, buggies, clubs) |
| `member_charges` | Bar tabs, cart storage, invoices, other charges |
| `checkins` | Desk check-in log (NFC, member search, walk-in, tee time) |

---

## Site Configuration (site_config keys)

All editable via Admin → Settings. No rebuild needed.

### Course Operation
| Key | Default | Notes |
|-----|---------|-------|
| `course_open` | `true` | Enables/disables online booking |
| `booking_days_ahead` | `7` | How far ahead guests can book |
| `green_fee_9_holes` | `25` | Display only |
| `green_fee_18_holes` | `35` | Display only |
| `cart_fee_per_9` | `10` | Per cart per 9 holes |
| `buggy_fee` | `5` | Per buggy per round |
| `clubs_fee` | `15` | Per set per round |
| `personal_cart_drop_fee` | `15` | Per day |
| `cart_storage_fee` | `250` | Per season, used in billing |
| `contact_phone` | `(218) 885-3543` | |
| `contact_email` | `golf@swanlakecc.com` | |
| `season_start` | `05-01` | **MM-DD format** — enforced on bookings |
| `season_end` | `10-31` | **MM-DD format** — enforced on bookings |
| `tee_time_open` | `07:00` | Filters booking grid |
| `tee_time_close` | `17:48` | Overridden by sunset cutoff if earlier |
| `clubhouse_open` | `06:00` | Display only |
| `clubhouse_close` | `20:00` | Display only |
| `sunset_cutoff_enabled` | `true` | Auto-close N hrs before sunset |
| `sunset_cutoff_hours` | `2` | Hours before sunset to stop bookings |
| `course_latitude` | `47.72` | Used for sunset calculation |
| `course_longitude` | `-93.01` | Used for sunset calculation |

### Email (SMTP — Nodemailer)
`smtp_host`, `smtp_port`, `smtp_secure`, `smtp_user`, `smtp_pass`, `smtp_from`

### Square
`square_access_token` (secret), `square_application_id`, `square_location_id`, `square_environment`

### QuickBooks
`quickbooks_client_id`, `quickbooks_client_secret` (secret), `quickbooks_redirect_uri`, `quickbooks_environment`

### OAuth
`google_client_id`, `google_client_secret` (secret), `apple_id`, `apple_secret` (secret)

### Security
`cron_secret` — shared secret for `POST /api/admin/billing/renew?secret=…`

---

## Tee Time Booking (`/tee-times`)

- 12-minute slots, 07:00–17:48 (55 total), filtered by `tee_time_open`/`tee_time_close`
- Party sizes 1–12; 5–8 players = 2 slots, 9–12 = 3 consecutive slots
- Concurrency: `BEGIN IMMEDIATE` transaction + unique partial index
- Guest booking allowed (no login required)
- Confirmation email sent if email provided

**Availability enforcement (all server-side + reflected in UI):**
1. `course_open` = false → all bookings blocked
2. Season dates (MM-DD comparison against date's month-day)
3. `tee_time_open` / `tee_time_close` window
4. Sunset cutoff — astronomical calculation (`src/lib/sunset.ts`, NOAA algorithm, no API key)
5. Private events — `is_public=0` events block their time window (whole day if no start/end)
6. Equipment availability — capped by inventory minus same-day bookings

**UI slot colors:** available (white), selected start (gold), also-reserved (amber), booked (gray/strikethrough), private event (purple)

---

## Memberships (`/memberships`)

Six tiers:
- Junior Summer Pass: $100
- Young Adult: $445
- Single: $740 (+ $100 gift card new members)
- Household: $962.50 (+ $100 gift card new members)
- Driving Range – Single: $80
- Driving Range – Household: $125

Season: May 1 – Oct 31 (current year).

Payment flow:
1. Google Pay / Apple Pay → Square Web Payments SDK → `/api/payments/square/process`
2. Credit card → Square → `/api/payments/square/process`
3. Invoice/ACH → QuickBooks → `/api/payments/quickbooks`

Auto-renewal: opt-in checkbox at checkout → Square Card on File stored (`square_customer_id`, `square_card_id` on membership row).

Member number format: `SLCC-YYYY-XXXXXX`

---

## Recurring Billing (`/admin/billing`)

Three tabs:
1. **Charges & Tabs** — manual charges (bar_tab, cart_storage, cart_drop, invoice, other), mark paid/void
2. **Pending Payments** — memberships with `payment_status='pending'`, mark paid
3. **Renewals Due** — members expiring within 30 days; bulk charge (Square card-on-file) or send reminder emails

Cron endpoint: `POST /api/admin/billing/renew?secret=CRON_SECRET`

---

## Tournaments (`/tournaments`, `/admin/tournaments`)

**Formats:** `luck_of_the_draw`, `stroke_play`, `stableford`, `scramble`, `best_ball`, `match_play`

**Status workflow:** `registration_open` → `registration_closed` → `draw_complete` → `scoring` → `completed` (or `cancelled`)

**Draw** (luck_of_the_draw / scramble / best_ball):
- Admin triggers → entries shuffled with `ORDER BY RANDOM()`
- Teams of configurable size (2, 3, or 4)
- Leftovers distributed across existing teams (no undersized final team)
- Bulk tee time assignment: start time + interval + starting hole

**Scoring:** gross + net per team, auto-ranked, place assigned. Public leaderboard once scoring begins.

**Public registration:** `/tournaments/[id]` — name, email, phone, handicap. Confirmation email sent.

---

## Events (`/events`, `/admin/events`)

- Types: general, tournament, league, clinic, social
- `is_public = 1` → visible on public calendar, available for registration
- `is_public = 0` → **Private**: hidden from public calendar AND blocks online tee time booking during event's time window on that date (whole day if no start/end times set)
- Admin can toggle Public ↔ Private per event with one click
- Admin events page (`/api/admin/events`) shows ALL events; public `/api/events` shows only public ones

---

## Equipment Inventory (`/admin/equipment`)

Types: `cart`, `buggy`, `clubs`
Statuses: `available`, `out_of_service`, `maintenance`

Fields: type, identifier, status, service_notes, make, model, year, serial_number, color, seats, fuel_type (electric/gas/push), battery_year, hours_reading, last_service_date

Availability affects tee time booking — only `status='available'` units count toward the pool.

Seeded dev data: 4 electric carts (Club Car, E-Z-GO), 2 gas carts (Yamaha), 4 push buggies (Clicgear, Sun Mountain, Bag Boy), 3 club sets (Callaway, Wilson).

---

## Desk / Kiosk Mode (`/desk`)

Full-screen staff terminal. No auth required (internal use).

- **Auto-refresh**: 30-second polling
- **Screen Wake Lock**: keeps display on (`WakeLock.tsx`)
- **Today's tee times**: grouped list, click to toggle check-in, shows equipment booked
- **NFC check-in**: HID keyboard capture + Web NFC API (Chrome/Android)
- **Member search**: name/email lookup (≥2 chars, debounced)
- **Walk-in logging**: manual form (name, players, holes, equipment)
- **Recent check-ins**: last 5–10 entries with type indicator
- **Stats bar**: reservations today, checked in, walk-ins, NFC check-ins

NFC cards: UUID token stored on membership (`nfc_token`). iOS uses tap-to-open URL `/desk/nfc/[token]`. Admin generates/regenerates tokens at `/admin/memberships`.

---

## Transactional Email (Nodemailer)

All sends are fire-and-forget (`.catch(() => {})`). Silently skips if `smtp_host` not configured.

Emails sent for:
- Tee time booking confirmation (slots, equipment, date/time)
- Membership purchase receipt (member number, tier, amount, season dates)
- Tournament registration confirmation
- Membership renewal reminder (link to renew)

---

## PWA / Offline

- Manifest: `public/manifest.json` — standalone display, theme `#2d6a4f`
- Service worker: `public/sw.js` — caches static assets and key pages
- `/offline` fallback page shown when navigation fails offline
- `/desk` and `/tee-times` readable offline after first visit
- Data writes (bookings, payments) require a connection
- Wake Lock API used in kiosk mode

---

## API Routes Summary

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tee-times` | Slots + availability + season + sunset + private events |
| POST | `/api/tee-times` | Book (enforces all availability rules) |
| DELETE | `/api/tee-times` | Cancel booking |
| GET | `/api/memberships` | Membership tiers |
| POST | `/api/memberships` | Create membership |
| GET | `/api/events` | Public events only |
| POST | `/api/events/[id]/register` | Event registration |
| GET | `/api/tournaments` | Public tournaments |
| GET | `/api/tournaments/[id]` | Tournament + entries + teams |
| POST | `/api/tournaments/[id]/enter` | Register for tournament |
| DELETE | `/api/tournaments/[id]/enter` | Withdraw |
| GET | `/api/config/public` | Square app ID + location ID for browser |
| POST | `/api/auth/register` | Create user account |

### Admin (require admin session)
| Method | Path | Description |
|--------|------|-------------|
| GET/PUT | `/api/admin/settings` | Read/write site_config |
| GET/POST/DELETE | `/api/admin/users` | Admin user management |
| GET/POST/PATCH/DELETE | `/api/admin/events` | All events including private |
| GET | `/api/admin/tee-sheet` | Full tee sheet for date |
| GET/POST/PUT/DELETE | `/api/admin/tee-times` | Booking management |
| GET/POST/PUT/DELETE | `/api/admin/equipment` | Equipment inventory |
| GET/POST | `/api/admin/billing/renew` | Preview/process renewals (also cron-safe with `?secret=`) |
| GET/POST/PATCH | `/api/admin/charges` | Member charges |
| PATCH | `/api/admin/charges/[id]` | Mark paid/void |
| GET/POST | `/api/admin/memberships/nfc` | NFC token management |
| POST | `/api/admin/tournaments/[id]/draw` | Run blind draw |
| PUT | `/api/admin/tournaments/[id]/scores` | Bulk score entry |
| POST | `/api/admin/tournaments/[id]/tee-times` | Bulk tee time assignment |

### Desk / Kiosk (no auth — internal)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/desk/today` | Today's tee times, check-ins, stats |
| GET | `/api/desk/nfc/[token]` | Look up member by NFC token |
| PUT | `/api/desk/tee-times/[id]` | Toggle check-in |
| POST | `/api/desk/checkin` | Log check-in (any type) |
| GET | `/api/desk/member` | Member search |

### Payments
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payments/square` | Square hosted checkout |
| POST | `/api/payments/square/process` | Process Web Payments token (+ card-on-file) |
| POST | `/api/payments/quickbooks` | QuickBooks invoice/ACH |

---

## Environment Variables

Only two are required:

| Variable | Value |
|----------|-------|
| `AUTH_SECRET` | 32-byte base64 string — `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Full app URL, e.g. `https://book.swanlakecc.com` |

Everything else is in the database.
