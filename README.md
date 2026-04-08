# Swan Lake Country Club

A full-featured club management web application for Swan Lake CC — handling tee time bookings, memberships, billing, counter operations, and POS integration.

---

## Feature Overview

| Area | Features |
|------|----------|
| **Public Site** | Tee time booking, membership signup, equipment rental, anonymous payments |
| **Admin Panel** | Tee sheet management, member roster, billing, renewals, config |
| **Counter / Desk** | PWA-installable kiosk mode, NFC member check-in, screen wake lock |
| **Billing** | Bar tabs, cart storage, invoices, custom charges, POS auto-import |
| **POS Integration** | Square and Toast webhook receivers for automatic charge creation |
| **PWA** | Installable on iOS and Android, service worker, offline support |

---

## Tech Stack

- **Framework**: Next.js 15 (App Router, React Server Components)
- **Database**: PostgreSQL (Neon serverless) via `pg` pool
- **Auth**: NextAuth v5 (credentials + OAuth), JWT sessions with isAdmin claim
- **Styling**: Tailwind CSS with custom Swan Lake theme colors
- **Deployment**: Render (web service), auto-deploy on push to `main`
- **PWA**: Web App Manifest + Service Worker (`public/sw.js`)

---

## Public Site

### Tee Time Booking (`/tee-times`)

Members and guests can book tee times without logging in.

- Select date, time slot, number of players, holes (9 or 18)
- Optional equipment rental (pull cart, power cart, clubs)
- Payment collected at time of booking via Stripe
- Confirmation email sent automatically
- Walk-ins can be added by admin without an email address

### Membership Signup (`/join`)

- Choose membership type (Individual, Family, Senior, Junior, Corporate)
- Collect member info, emergency contact, payment
- Membership record created with `payment_status = 'pending'`
- Admin marks as paid on the Billing page

---

## Admin Panel (`/admin`)

Access requires an admin account. The **Admin** link appears in the navigation header for admin users only.

### Tee Sheet (`/admin/tee-sheet`)

Visual tee sheet showing all time slots for the selected date.

- **Click an open slot** — add a walk-in booking (name, phone, players, holes, notes; email optional)
- **Click a booked slot** — view booking details with three actions:
  - **Check In** — marks the player as arrived
  - **Edit** — modify any booking detail inline
  - **Cancel** — removes the booking
- Date navigation to view any day
- Color-coded slots: open, booked (gold), checked-in (green)

### Members (`/admin/members`)

- Full member roster with search
- View membership details, expiry dates, payment status
- Filter by membership type or status

### Billing (`/admin/billing`)

Three-tab billing dashboard:

#### Tab 1: Charges & Tabs

- View all open charges (bar tabs, cart storage, invoices, other)
- **Add Charge** button opens a form:
  - Member name (required), email, membership ID (optional — for walk-in customers)
  - Charge type: bar tab, cart storage, invoice, other
  - Description, amount, internal notes
- Per-row actions: **Mark Paid** / **Void**
- Toggle to show All charges vs. Open only

#### Tab 2: Pending Payments

- Memberships awaiting payment (`payment_status = 'pending'`)
- **Mark Paid** button per row to confirm receipt

#### Tab 3: Renewals Due

- Members expiring within 60 days
- Bulk select to charge renewal fees or send reminder emails
- Per-row charge or email actions

### Config (`/admin/config`)

Site-wide configuration stored in the database — no rebuild required when settings change:

- Club name, address, phone, email
- Tee time interval, first/last tee time, advance booking window
- Cart storage fee amount, rental prices
- POS system selection (Square / Toast / None)
- Square webhook key, Toast webhook secret

---

## Desk / Counter Mode (`/desk`)

A full-screen kiosk application designed for staff at the pro shop counter.

### Features

- **Screen Wake Lock** — display stays on automatically while desk view is open; re-acquired on tab focus
- **NFC Member Check-In** — tap NFC card or fob to look up member and check them in to their tee time
- **Member Search** — manual name or member number lookup
- **Quick Actions** — add charges, check booking status

### PWA Installation

The app is installable as a native app on any device:

**iOS (iPhone/iPad)**:
1. Open the site in Safari
2. Tap the Share button (box with arrow)
3. Choose "Add to Home Screen"
4. Launch from home screen — runs full-screen with no browser chrome

**Android (Chrome)**:
1. Open the site in Chrome
2. An install banner appears after 30 seconds — tap Install
3. Or use the browser menu → "Add to Home Screen"

**Desktop (Chrome/Edge)**:
- An install icon appears in the address bar

Once installed, app shortcuts provide direct access to:
- Staff Counter (`/desk`)
- Book Tee Time (`/tee-times`)
- Admin Panel (`/admin`)

---

## Billing & Charges

### Charge Types

| Type | Description |
|------|-------------|
| `bar_tab` | Food and beverage charges from the clubhouse bar |
| `cart_storage` | Monthly or annual cart storage fees |
| `invoice` | General invoices for services or events |
| `other` | Miscellaneous charges |

### Charge Lifecycle

1. **Created** — manually via Admin → Billing, or automatically via POS webhook
2. **Open** — default status, visible on the Charges tab
3. **Paid** — marked by staff; `paid_at` timestamp recorded
4. **Voided** — cancelled without payment

Charges can be linked to a member account (`membership_id`) or created standalone for walk-in customers.

---

## POS Integration

Charges are created automatically when sales close at the point-of-sale system.

### Square Integration

1. In Admin → Config, set **POS System** to Square and paste your **Square Webhook Signature Key**
2. In your Square Dashboard, add a webhook pointing to:
   `https://your-domain.com/api/webhooks/square`
3. Subscribe to: `payment.completed`, `order.created`, `order.updated`

**Behavior**:
- When a payment completes with member metadata in the order, a `bar_tab` charge is created automatically
- If the order ID matches an existing open charge in notes, that charge is marked paid

### Toast Integration

1. In Admin → Config, set **POS System** to Toast and paste your **Toast Webhook Secret**
2. In Toast Partner Portal, point webhooks to:
   `https://your-domain.com/api/webhooks/toast`
3. Subscribe to: `CHECK_CLOSED`, `ORDER_CLOSED`

**Behavior**:
- When a check closes, the member name on the tab is used to look up their account
- A `bar_tab` charge is created with the check total
- Duplicate checks (same Toast GUID) are ignored automatically

### Adding Other POS Systems

The webhook architecture is extensible. Any POS that can send HMAC-signed HTTP POST events can be integrated by adding a route under `src/app/api/webhooks/`.

---

## Database Schema

Key tables:

| Table | Purpose |
|-------|---------|
| `memberships` | Member records, type, status, expiry, payment_status |
| `tee_times` | Booked slots, player info, check-in status |
| `member_charges` | Bar tabs, cart fees, invoices; linked to membership or standalone |
| `site_config` | Key/value store for all admin-configurable settings |
| `tournaments` | Tournament definitions and registration |
| `events` | Club events and announcements |

### member_charges table

```sql
id              SERIAL PRIMARY KEY
membership_id   INTEGER REFERENCES memberships(id)  -- nullable for walk-ins
member_name     TEXT NOT NULL
member_email    TEXT
charge_type     TEXT   -- 'bar_tab' | 'cart_storage' | 'invoice' | 'other'
description     TEXT NOT NULL
amount          REAL NOT NULL
status          TEXT   -- 'open' | 'paid' | 'voided'
notes           TEXT
created_by      TEXT   -- admin email who created the charge
paid_at         TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
```

---

## Membership Types

| Type | Description |
|------|-------------|
| Individual | Single adult member |
| Family | Member + spouse/partner + dependents under 25 |
| Senior | 65+ individual |
| Junior | Under 25 |
| Corporate | Business membership with multiple named players |

Status values: `active`, `pending`, `expired`, `cancelled`

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://user:pass@host/db`) |
| `AUTH_SECRET` | Random 32-byte base64 string for session signing |
| `NEXTAUTH_URL` | Full URL of your deployment (e.g. `https://your-app.onrender.com`) |
| `AUTH_TRUST_HOST` | Set to `true` when behind a reverse proxy (required on Render) |
| `STRIPE_SECRET_KEY` | Stripe secret key for payment processing |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (used in browser) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `SENDGRID_API_KEY` | SendGrid key for transactional email |
| `FROM_EMAIL` | Sender address (e.g. `noreply@swanlakecc.com`) |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Square webhook HMAC key (if using Square POS) |
| `TOAST_WEBHOOK_SECRET` | Toast webhook HMAC secret (if using Toast POS) |

Generate `AUTH_SECRET`:
```bash
openssl rand -base64 32
```

---

## Deployment (Render + Neon)

### Database — Neon

1. Create a free project at [neon.tech](https://neon.tech)
2. Copy the connection string (Settings → Connection string)
3. Set `DATABASE_URL` in your Render environment variables

### Web Service — Render

The `render.yaml` file configures the service automatically. On first deploy:

1. Push this repo to GitHub
2. On Render, create a **New Web Service** and connect your GitHub repo
3. Render detects `render.yaml` and pre-fills the configuration
4. Add all environment variables in Render → Environment
5. Click **Deploy**

**Build command** (set in Render Settings):
```
npm install --legacy-peer-deps && npm run db:migrate && npm run build
```

**Start command**:
```
npm run start
```

> Build time is approximately 5–7 minutes (npm install + migration + Next.js build). After the first deploy, npm install is cached and significantly faster.

Subsequent deploys happen automatically on every push to `main`.

### First Admin Account

After deployment:

1. Sign in or register with your email at `/login`
2. Open the Neon SQL Editor and run:
   ```sql
   INSERT INTO admin_emails (email) VALUES ('your@email.com');
   ```
3. Sign out and sign back in — the **Admin** link appears in the header

---

## Configuration Reference

All settings in Admin → Config are stored in `site_config` as key/value pairs.

| Key | Default | Description |
|-----|---------|-------------|
| `club_name` | Swan Lake CC | Display name used throughout the site |
| `tee_time_interval` | 10 | Minutes between tee times |
| `first_tee_time` | 07:00 | Opening tee time |
| `last_tee_time` | 17:00 | Last available tee time |
| `advance_booking_days` | 7 | Days ahead members can book |
| `cart_storage_fee` | 250 | Annual cart storage fee ($) |
| `pos_system` | none | `square`, `toast`, or `none` |
| `square_webhook_key` | — | Square HMAC signature key |
| `toast_webhook_secret` | — | Toast HMAC secret |

---

## Development Setup

```bash
# Install dependencies
npm install --legacy-peer-deps

# Copy env template
cp .env.example .env.local
# Edit .env.local: at minimum set DATABASE_URL and AUTH_SECRET

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
src/
  app/
    (public)/              # Public-facing pages (tee times, memberships, events)
    admin/                 # Admin panel — server-side auth guard on layout
      tee-sheet/           # Visual tee sheet with booking/edit/cancel
      billing/             # Charges, pending payments, renewals
      members/             # Member roster
      config/              # Site configuration
    desk/                  # Counter/kiosk mode (full-screen, wake lock)
    offline/               # PWA offline fallback page
    api/
      admin/               # Admin-only REST endpoints
        charges/           # GET/POST charges; PATCH [id] for status
        tee-times/         # Edit and cancel bookings
        memberships/       # Mark memberships paid
        config/            # Read/write site_config
      webhooks/
        square/            # Square POS event receiver
        toast/             # Toast POS event receiver
      tee-times/           # Public tee time booking
      memberships/         # Public membership signup
  components/
    Header.tsx             # Nav with Admin link (admin-only)
    PwaProvider.tsx        # Service worker registration + install prompt
    WakeLock.tsx           # Screen Wake Lock API wrapper
  lib/
    db/
      index.ts             # pg pool + query/queryOne/execute/withTransaction
      migrate.ts           # Schema migrations (run on deploy)
    admin.ts               # isAdminEmail() DB lookup
    email.ts               # SendGrid transactional email
  auth.ts                  # NextAuth config: jwt callback stores isAdmin
  auth.config.ts           # trustHost: true for Render proxy
  types/next-auth.d.ts     # Session type extension (isAdmin field)
public/
  manifest.json            # PWA manifest (standalone, shortcuts)
  sw.js                    # Service worker (cache strategies, offline fallback)
  icons/                   # SVG app icons (standard + maskable)
```

---

## API Reference

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tee-times` | Available slots for a date |
| POST | `/api/tee-times` | Book a tee time |
| POST | `/api/memberships` | Submit membership application |

### Admin Endpoints (require admin session)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/tee-times` | All bookings for a date |
| PATCH | `/api/admin/tee-times` | Edit booking details |
| DELETE | `/api/admin/tee-times` | Cancel a booking |
| GET | `/api/admin/charges` | List charges (filter by status) |
| POST | `/api/admin/charges` | Create a charge |
| PATCH | `/api/admin/charges/[id]` | Update charge status |
| PATCH | `/api/admin/memberships/[id]` | Mark membership paid |
| GET | `/api/admin/config` | Read site config |
| POST | `/api/admin/config` | Update site config |

### Webhook Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/webhooks/square` | HMAC-SHA256 signature |
| POST | `/api/webhooks/toast` | HMAC-SHA256 signature |

---

## Offline Support

The service worker caches key pages for offline use:

| Route | Offline behavior |
|-------|-----------------|
| `/desk` | Fully cached — works offline after first visit |
| `/tee-times` | Readable offline (no new bookings) |
| `/login` | Cached for credential entry |
| `/offline` | Fallback for uncached navigation |
| `/api/*` | Returns `{ error: "Offline" }` with 503 |

Data-write operations (payments, new bookings) require an internet connection.
