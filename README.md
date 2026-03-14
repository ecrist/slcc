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

### Events
- Public events calendar with filtering by type (tournament, league, clinic, social)
- Online registration with party size selection
- Real-time spot availability

### Authentication
- **Sign in with Google** and **Sign in with Apple** via NextAuth.js v5
- Session-aware header with the user's first name and **Gravatar** avatar (SHA-256, falls back to mystery-person silhouette)
- Tee time booking requires an active session
- Persistent "← Back to swanlakecc.com" link keeps users oriented

### Admin Dashboard
- Protected route — only emails in the `admin_users` database table can access `/admin`
- Manage tee time reservations (view, cancel — cancels the entire group booking)
- Manage memberships and payment status
- Manage events and registrations
- Unauthenticated users are redirected to the login page; authenticated non-admins are redirected home

### Settings & Configuration
- **Admin users** — add and remove admin accounts via `/admin/settings`; changes take effect immediately
- **Site configuration** — all operational settings are stored in the database and editable through the web UI with no rebuild required:
  - Course open / closed (pause online bookings instantly)
  - Booking window (how many days ahead guests can book)
  - Green fees and cart rental fee
  - Contact phone and email
  - Season start and end dates
- **Initial admin** — `INITIAL_ADMIN_EMAIL` in `.env.local` seeds the first admin on a fresh database and always retains access as a recovery mechanism, even if removed from the admin table

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

Open `.env.local` and fill in the values. At minimum, to run locally you need:

```
AUTH_SECRET=<any random string for local dev>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Everything else (Square, QuickBooks, Google OAuth, Apple Sign In) can be left as placeholders during local development — those features will show configuration errors instead of crashing.

See the [Environment Variables](#environment-variables) section below for the full reference.

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

All variables live in `.env.local`. Variables prefixed `NEXT_PUBLIC_` are sent to the browser.

### Auth.js

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | Random secret for signing session tokens. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |

### Google OAuth

Create credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client IDs → Web application.

Authorized redirect URI: `https://book.swanlakecc.com/api/auth/callback/google`

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |

### Apple Sign In

Create a Services ID at [Apple Developer](https://developer.apple.com/account/resources/identifiers/list/serviceId) with Sign In with Apple enabled.

Return URL: `https://book.swanlakecc.com/api/auth/callback/apple`

| Variable | Description |
|----------|-------------|
| `APPLE_ID` | Services ID (e.g. `com.swanlakecc.book`) |
| `APPLE_SECRET` | Full contents of the `.p8` private key file |

### Square

Get credentials from [Square Developer Dashboard](https://developer.squareup.com/apps).

| Variable | Description |
|----------|-------------|
| `SQUARE_ACCESS_TOKEN` | Server-side access token |
| `SQUARE_APPLICATION_ID` | App ID (also set as `NEXT_PUBLIC_SQUARE_APPLICATION_ID`) |
| `SQUARE_LOCATION_ID` | Location ID (also set as `NEXT_PUBLIC_SQUARE_LOCATION_ID`) |
| `SQUARE_ENVIRONMENT` | `sandbox` or `production` (also set as `NEXT_PUBLIC_SQUARE_ENVIRONMENT`) |
| `NEXT_PUBLIC_SQUARE_APPLICATION_ID` | Same as `SQUARE_APPLICATION_ID` — used by Google Pay / Apple Pay in the browser |
| `NEXT_PUBLIC_SQUARE_LOCATION_ID` | Same as `SQUARE_LOCATION_ID` |
| `NEXT_PUBLIC_SQUARE_ENVIRONMENT` | Same as `SQUARE_ENVIRONMENT` |

### QuickBooks

Get credentials from [Intuit Developer](https://developer.intuit.com).

| Variable | Description |
|----------|-------------|
| `QUICKBOOKS_CLIENT_ID` | OAuth client ID |
| `QUICKBOOKS_CLIENT_SECRET` | OAuth client secret |
| `QUICKBOOKS_REDIRECT_URI` | `https://book.swanlakecc.com/api/payments/quickbooks/callback` |
| `QUICKBOOKS_ENVIRONMENT` | `sandbox` or `production` |

### Admin Access

| Variable | Description |
|----------|-------------|
| `INITIAL_ADMIN_EMAIL` | Email address of the first admin. Seeded into the `admin_users` table on first run. Always grants admin access as a recovery fallback — use `/admin/settings` to manage all other admins after initial setup. |

### App

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | Full URL of the app (e.g. `https://book.swanlakecc.com`) |

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
