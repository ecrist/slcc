# Swan Lake Country Club — Online Services Portal

An online booking and membership portal for [Swan Lake Country Club](https://www.swanlakecc.com) in Pengilly, Minnesota. Built to enhance the existing Webflow site with tee time reservations, membership sign-up, and event registration — features the main site does not offer.

---

## Features

### Tee Time Booking
- Browse available times for any of the next 7 days
- 12-minute interval slots from 7:00 AM to 5:48 PM
- **Large party support** — book up to 12 players; the system automatically reserves 1, 2, or 3 consecutive slots as needed
- **Concurrency-safe** — uses SQLite `BEGIN IMMEDIATE` transactions plus a unique partial index to prevent double-booking even under simultaneous requests
- Requires sign-in to complete a booking; browsing slots is public
- Name and email pre-filled from the signed-in account

### Memberships
- Six membership tiers matching current Swan Lake CC pricing:
  - Junior Summer Pass (18 and under) — $100
  - Young Adult (19–29) — $445
  - Single — $740 *(new members receive $100 gift card)*
  - Household — $962.50 *(new members receive $100 gift card)*
  - Driving Range Pass – Single — $80
  - Driving Range Pass – Household — $125
- **Google Pay and Apple Pay** via Square Web Payments SDK — native payment sheet, no redirect
- **Credit/debit card** via Square hosted checkout
- **Invoice / ACH** via QuickBooks Payments

### Transactional Email
- Automatic email confirmations sent via SMTP (Nodemailer) for:
  - **Tee time bookings** — date, time, players, equipment booked
  - **Membership purchases** — member number, tier, amount, season dates
  - **Tournament registrations** — event details, format, entry fee
  - **Membership renewal reminders** — sent manually or auto-triggered from the billing dashboard
- Configurable via the Admin → Settings page (stored in the database, no rebuild required)
- Gracefully no-ops if SMTP is not configured (logs a warning, never crashes)

### Recurring Membership Billing
- Members can opt in to **auto-renewal** at checkout by checking "Save card for auto-renewal"
- Card tokenized with Square's Card on File API (`cardsApi.createCard`) — no raw PAN is stored
- **Admin billing dashboard** at `/admin/billing`:
  - Lists all memberships expiring within 30 days
  - Shows which have a saved card ("auto-renewal ready") vs. not
  - Select-all / bulk charge — processes saved cards and creates a new membership record for the next season
  - "Send Renewal Reminders" — emails members without a card on file with a renewal link
- Cron-safe endpoint at `POST /api/admin/billing/renew?secret=CRON_SECRET` — can be called from a cron job to auto-charge on a schedule without a browser session

### Tournaments
- Full tournament engine supporting six formats:
  - **Luck of the Draw** — individual registration, admin runs a blind random draw to create teams
  - **Scramble** — captain's choice; same draw algorithm
  - **Best Ball** — team format; draw assigns teams
  - **Stroke Play** — individual gross/net scoring
  - **Stableford** — individual points scoring
  - **Match Play** — head-to-head bracket
- **Public registration** at `/tournaments` — anyone can register; email confirmation sent on sign-up
- **Handicap entry** — optional field on registration, used for net scoring
- **Admin draw tool** (`/admin/tournaments/[id]`):
  - Run (or re-run) the blind draw with one click — shuffles players with SQLite `ORDER BY RANDOM()` and groups into teams of configurable size (2, 3, or 4)
  - Partial groups handled: leftover players distributed evenly across existing teams rather than leaving an undersized final team
  - Assign tee times to teams: pick start time, interval, and starting hole — bulk-assigns sequentially
- **Score entry** — admin enters gross and net scores per team inline; leaderboard auto-ranks and shows places
- **Status workflow**: Registration Open → Closed → Draw Complete → Scoring → Completed
- Public leaderboard and team/draw results visible on the tournament detail page once available

### Events
- Public events calendar with filtering by type (tournament, league, clinic, social)
- Online registration with party size selection
- Real-time spot availability

### Authentication
- **Sign in with Google** and **Sign in with Apple** via NextAuth.js v5
- Session-aware header with the user's first name and **Gravatar** avatar (SHA-256, falls back to mystery-person silhouette)
- Tee time booking requires an active session
- Persistent "← Back to swanlakecc.com" link keeps users oriented

### Tee Sheet (Admin)
- Visual day-view at `/admin/tee-sheet` showing all 55 tee time slots (07:00–17:48, 12-minute intervals)
- Color-coded by status: open (gray), booked (green), checked-in (teal), multi-slot group (purple), cancelled (red)
- Multi-slot group bookings are visually connected — followers labeled as continuations
- Click any booked slot to open a detail panel: name, contact, players, holes, equipment, notes
- Check-in and cancellation directly from the panel — group cancellations cancel all slots atomically
- Date navigation (prev/next day, date picker, Today button)

### Admin Dashboard
- Protected route — only emails in the `admin_users` database table can access `/admin`
- **Tee Sheet** — visual day view with check-in and cancellation
- **Bookings** — tabular list of all tee time reservations, filter by date
- Manage memberships and payment status; issue NFC member cards
- **Billing** — bulk renewal processing and reminder sending
- **Tournaments** — create, manage entries, run draws, assign tee times, enter scores
- Manage events and registrations
- Manage equipment inventory with full detail fields
- Unauthenticated users are redirected to the login page; authenticated non-admins are redirected home

### Settings & Configuration
- **Admin users** — add and remove admin accounts via `/admin/settings`; changes take effect immediately
- **Site configuration** — all operational settings are stored in the database and editable through the web UI with no rebuild required:
  - Course open / closed (pause online bookings instantly)
  - Booking window (how many days ahead guests can book)
  - Green fees and cart rental fee
  - Contact phone and email
  - Season start and end dates
- **Default admin** — a fresh database is automatically seeded with `admin@swanlakecc.com` / `admin`; log in, add your own email as an admin, then remove the default account

### Site Integration
- Matches [swanlakecc.com](https://www.swanlakecc.com) typography: **Roboto Condensed** (headings) + **Merriweather** (body)
- Designed to run on a subdomain such as `book.swanlakecc.com`
- Persistent back-link to the main site in every page header

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | SQLite via `better-sqlite3` |
| Auth | NextAuth.js v5 (Auth.js) |
| Payments | Square SDK, Square Web Payments SDK, QuickBooks |
| Process manager | PM2 |
| Web server | nginx |

---

## Local Development Setup

### Prerequisites

- Node.js 18.17 or later (22 LTS recommended)
- npm

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Only two variables are required to run the app:

```
AUTH_SECRET=<any random string for local dev>
NEXTAUTH_URL=http://localhost:3000
```

All other settings — SMTP, Square, QuickBooks, Google OAuth, Apple Sign In — are configured through **Admin → Settings** and stored in the database. No rebuild is required when credentials change.

### 3. Initialize the database

The database is created automatically on first run. To seed it with sample tee times and events:

```bash
npm run db:setup
```

This creates `swan-lake.db` in the project root.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Almost all configuration is stored in the database and edited through **Admin → Settings** — no rebuild required when credentials change. Only two variables must be in `.env.local`:

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | Random secret for signing session tokens. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `NEXTAUTH_URL` | Full URL of the app (e.g. `https://book.swanlakecc.com`). Used by NextAuth for callback URLs and by email links. |

Everything else is managed in the UI:

| Setting | Admin → Settings section |
|---------|--------------------------|
| SMTP host, port, credentials, from address | Email (SMTP) |
| Square access token, app ID, location ID, environment | Square Payments |
| QuickBooks client ID/secret, redirect URI, environment | QuickBooks Payments |
| Google OAuth client ID and secret | Google Sign In |
| Apple Sign In client ID and secret | Apple Sign In |
| Cron secret for billing auto-renewal | Security |
| Course open/closed, green fees, booking window, season dates | Course Operation |

### Notes

- OAuth credential changes (Google, Apple) require a server restart to take effect, because NextAuth reads them at startup.
- The `cron_secret` value set in Settings is used by `POST /api/admin/billing/renew?secret=…` for unattended cron job renewal processing.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout — fonts, SessionProvider, Header, Footer
│   ├── page.tsx            # Homepage (green fees, quick links to booking/memberships)
│   ├── login/
│   │   └── page.tsx        # Sign in with Google / Apple
│   ├── tee-times/
│   │   └── page.tsx        # Tee time browser and booking form
│   ├── memberships/
│   │   └── page.tsx        # Membership tiers and checkout
│   ├── events/
│   │   └── page.tsx        # Events calendar and registration
│   ├── admin/
│   │   ├── layout.tsx      # Server component — enforces auth + DB admin check
│   │   ├── page.tsx        # Dashboard with live stats
│   │   ├── tee-times/      # Manage reservations
│   │   ├── memberships/    # Manage memberships
│   │   ├── events/         # Manage events
│   │   └── settings/       # Manage admin users and site configuration
│   └── api/
│       ├── auth/[...nextauth]/route.ts   # NextAuth handler
│       ├── tee-times/route.ts            # GET/POST/DELETE tee times
│       ├── memberships/route.ts          # GET/POST memberships
│       ├── events/route.ts               # GET events
│       ├── events/[id]/register/route.ts # POST event registration
│       ├── admin/
│       │   ├── settings/route.ts         # GET/PUT site_config entries
│       │   └── users/route.ts            # GET/POST/DELETE admin_users
│       └── payments/
│           ├── square/route.ts           # Square hosted checkout link
│           ├── square/process/route.ts   # Square Web Payments SDK token processing
│           └── quickbooks/route.ts       # QuickBooks invoice
├── components/
│   ├── Header.tsx           # Sticky nav, Gravatar, sign in/out
│   ├── Footer.tsx           # Contact info, hours
│   ├── SessionProvider.tsx  # NextAuth SessionProvider wrapper
│   └── SquareWalletButtons.tsx  # Google Pay / Apple Pay buttons
├── lib/
│   ├── admin.ts             # isAdminEmail(), admin user & site config helpers
│   ├── db/
│   │   ├── index.ts         # SQLite connection, schema, migrations, config seeding
│   │   └── setup.ts         # Seed script (npm run db:setup)
│   ├── square/
│   │   └── client.ts        # Square API client singleton
│   └── types.ts             # Shared types, MEMBERSHIP_TYPES, TEE_TIME_SLOTS
├── auth.ts                  # NextAuth config (Google + Apple providers)
└── middleware.ts            # Redirects unauthenticated users away from /admin
```

---

## Tee Time Booking — How Concurrency Is Handled

The app uses three layers to prevent double-bookings:

1. **`BEGIN IMMEDIATE` transaction** — when a booking is submitted, the check-then-insert runs inside a single SQLite immediate transaction. This acquires a write lock at the start, so two simultaneous requests cannot both pass the availability check before either inserts.

2. **Unique partial index** — a database-level backstop:
   ```sql
   CREATE UNIQUE INDEX idx_tee_times_unique_active
     ON tee_times(date, time) WHERE status != 'cancelled';
   ```
   Even if application logic is somehow bypassed, the database will reject a duplicate insert with a constraint error, which the API converts to a clean 409 response.

3. **Client refresh on conflict** — if a 409 is returned, the page immediately re-fetches the booked slots so the user sees the current state and can choose a different time.

---

## Large Party Booking

Parties of more than 4 players require multiple consecutive tee time slots.

| Party size | Slots reserved |
|------------|---------------|
| 1–4 players | 1 slot |
| 5–8 players | 2 consecutive slots |
| 9–12 players | 3 consecutive slots |

The slot grid pre-disables any starting time that does not have enough free consecutive slots for the selected party size. All slots in the group are booked atomically — if any slot in the sequence is taken, the entire booking fails cleanly and the user is asked to choose a different time.

Cancelling any booking in a group cancels all slots in that group.

---

## Apple Pay Setup (Production)

Apple Pay requires domain verification before it will work:

1. Log in to [Square Developer Dashboard](https://developer.squareup.com/apps) → your app → **Apple Pay** tab
2. Register your production domain (`book.swanlakecc.com`)
3. Download the domain association file Square provides
4. Replace the placeholder:
   ```
   public/.well-known/apple-developer-merchantid-domain-association
   ```
5. Rebuild and redeploy

Apple Pay only activates in Safari on Apple devices. Google Pay activates automatically in supported browsers (Chrome, Edge, etc.) once Square credentials are live.

---

## Production Deployment

See **[SETUP.md](./SETUP.md)** for full step-by-step instructions covering:

- Installing required packages on FreeBSD 14
- Creating a dedicated app user
- Configuring all OAuth providers
- Setting up PM2 as a resilient boot service
- nginx reverse proxy with TLS
- Let's Encrypt certificate with `acme.sh`
- pf firewall rules
- Automated SQLite backups
- Zero-downtime deployment process

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server at http://localhost:3000 |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:setup` | Seed the database with sample data |
