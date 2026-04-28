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

**Toast POS webhook** (`/api/webhooks/toast/route.ts`): **Implemented.**
- Verifies HMAC-SHA256 signature (`Toast-Signature: t=...,v1=...` header) using `toast_webhook_secret` from DB
- Handles `CHECK_CLOSED` events only; all other event types return `{ ok: true, skipped: true }`
- Validates `restaurantGuid` against `toast_location_guid` if configured
- Matches tab name against active memberships (exact full-name match, then partial last-name match)
- Inserts into `member_charges` with `source='toast'`, `charge_type='bar_tab'`, `external_id='toast-<check_guid>'`
- Deduplicates via UNIQUE constraint on `external_id` — safe to retry webhook delivery
- Unmatched tabs create standalone charges (no `membership_id`) so no charges are lost
- Configure in Admin → Settings → Toast POS; set webhook URL in Toast Partner Portal: `POST /api/webhooks/toast`

---

## Authentication

- NextAuth v5 (Auth.js)
- Providers: Credentials (email/password, bcrypt), Google OAuth, Apple Sign In
- Google/Apple credentials read from DB at runtime (NOT env vars) — require server restart to take effect
- Edge-safe split: `auth.config.ts` (no DB, used by middleware) + `auth.ts` (full Node.js config)
- Middleware protects `/admin/*` and `/settings/*` — checks JWT only
- Admin layout does DB lookup (`isAdminEmail()`) for actual role verification
- JWT callback refreshes name/email from DB on every token refresh so profile changes reflect immediately
- Session shape: `{ user: { id, name, email, image, isAdmin } }`
- Default admin on fresh DB: `admin@swanlakecc.com` / `admin`

---

## Database

- PostgreSQL via `pg` (node-postgres)
- Connection via `DATABASE_URL` environment variable
- Migrations: `npm run db:migrate` (`src/lib/db/migrate.ts`) — idempotent, safe to re-run
- Uses `CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `ADD COLUMN IF NOT EXISTS`

### Tables

| Table | Purpose |
|-------|---------|
| `users` | Registered accounts (id, email, name, password_hash, phone) |
| `admin_users` | Emails with admin access (id, email, added_by, created_at) |
| `site_config` | Key/value store for all operational settings |
| `tee_times` | Booked tee time slots |
| `memberships` | Member records with payment and NFC info; `user_id` FK links to `users` |
| `events` | Club events (public + private) |
| `event_registrations` | Event sign-ups |
| `tournaments` | Tournament definitions |
| `tournament_entries` | Individual player registrations |
| `tournament_teams` | Teams formed after draw |
| `equipment` | Physical inventory (carts, buggies, clubs) |
| `member_charges` | Bar tabs, cart storage, invoices, other charges — includes `source` (manual/toast) and `external_id` (unique dedup key for Toast webhooks) |
| `checkins` | Desk check-in log (NFC, member search, walk-in, tee time) |

---

## Site Configuration (site_config keys)

All editable via Admin → Settings. No rebuild needed.

### Course Operation
| Key | Default | Notes |
|-----|---------|-------|
| `course_open` | `true` | Enables/disables online booking |
| `booking_days_ahead` | `8` | How far ahead guests can book |
| `course_auto_open_date` | (blank) | YYYY-MM-DD — auto-set `course_open=true` on this date |
| `course_auto_close_date` | (blank) | YYYY-MM-DD — auto-set `course_open=false` on this date |
| `require_login_for_booking` | `false` | When `true`, visitors must be signed in to book a tee time (enforced client + server) |
| `green_fee_9_holes` | `25` | Used in booking pricing for non-members |
| `green_fee_18_holes` | `35` | Used in booking pricing for non-members |
| `cart_storage_fee` | `250` | Per season, used in billing |
| `contact_phone` | `(218) 885-3543` | |
| `contact_email` | `golf@swanlakecc.com` | |
| `season_start` | `05-01` | **MM-DD format** — enforced on bookings |
| `season_end` | `10-31` | **MM-DD format** — enforced on bookings |
| `tee_time_open` | `07:00` | Filters booking grid |
| `tee_time_close` | (blank) | Blank = sunset-based cutoff; if set, overridden by sunset cutoff if earlier |
| `clubhouse_open` | `06:00` | Display only |
| `clubhouse_close` | `20:00` | Display only |
| `sunset_cutoff_hours` | `2` | Hours before sunset to stop bookings |
| `course_latitude` | `47.72` | Used for sunset calculation |
| `course_longitude` | `-93.01` | Used for sunset calculation |

### Cart, Equipment & Range Rates
All managed in Admin → Settings → Cart, Equipment & Range Rates. Used for booking pricing and the Rates & Fees page.

| Key | Default | Notes |
|-----|---------|-------|
| `cart_member_half_9` | `10` | Shared cart, member, 9 holes |
| `cart_member_full_9` | `17.50` | Solo cart, member, 9 holes |
| `cart_member_half_18` | `15` | Shared cart, member, 18 holes |
| `cart_member_full_18` | `25` | Solo cart, member, 18 holes |
| `cart_nonmember_half_9` | `17.50` | Shared cart, non-member, 9 holes |
| `cart_nonmember_full_9` | `30` | Solo cart, non-member, 9 holes |
| `cart_nonmember_half_18` | `25` | Shared cart, non-member, 18 holes |
| `cart_nonmember_full_18` | `40` | Solo cart, non-member, 18 holes |
| `pull_cart_fee` | `3` | Per pull cart per round |
| `club_rental_9` | `15` | Club set rental, 9 holes |
| `club_rental_18` | `20` | Club set rental, 18 holes |
| `personal_cart_drop_fee` | `15` | Daily fee for guest's own cart |

### Announcement Banner
| Key | Default | Notes |
|-----|---------|-------|
| `announcement_enabled` | `false` | Show/hide site-wide banner |
| `announcement_message` | (blank) | Banner text content |

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

- 12-minute slots, filtered by `tee_time_open`/`tee_time_close` (blank close = sunset-based)
- Party sizes 1–12; 5–8 players = 2 slots, 9–12 = 3 consecutive slots
- Concurrency: `BEGIN IMMEDIATE` transaction + unique partial index
- Guest booking allowed by default; admin toggle (`require_login_for_booking`) can gate all bookings behind sign-in
- When login is required, clicking a time slot stashes `{date, slot}` in `sessionStorage` and redirects to `/login?callbackUrl=/tee-times`; on return the modal re-opens on the original slot and date
- Confirmation email sent if email provided
- Course open/closed toggle with optional auto-open/close dates
- Configurable booking window (`booking_days_ahead`, default 8 days)
- Past time slots hidden for today; "No tee times available" shown when none remain

**Weather strip:** the `/tee-times` page shows an hourly forecast for the selected date pulled from Open-Meteo (free, no API key) — `/api/weather` proxies the call using `course_latitude`/`course_longitude` (default `47.315, -93.192` for Swan Lake CC, Pengilly, MN) and caches in memory for 30 min. The strip sits above the time-slot grid: a centered header summarizes the day (Lucide icon, label, hi/lo, precip %), and a row of per-hour cells below covers daylight hours (one hour before sunrise through sunset) with icon, temp, and precip %. When the selected date is today, the cell matching the current local hour is highlighted green and labeled "Now" so a golfer can see right where they are in the day. Hours with rain ≥50% have their precip value bolded blue.

**Add to Calendar:** the booking confirmation modal includes an "Add to Calendar" button that downloads a `.ics` file (`src/lib/calendar.ts`) — Apple/Google Calendar and Outlook all import it, with a 1-hour reminder pre-set. Duration is derived from holes (9 ≈ 2h, 18 ≈ 4.5h). The same button appears on every booking row in `/my-bookings`.

**Booking modal:**
- Opens on time slot selection (no layout shift)
- Fixed height with only the player list scrolling; hero header shows date overline + centered time (with prev/next chevrons that jump to the nearest available start for the current party size), player stepper, and 9/18-hole toggle
- Inline party-size stepper with predictive validation: the `+` button is disabled when the next slot isn't available for the current start
- Per-player entry: name, Member/Guest toggle, mutually-exclusive cart choice (Golf Cart / Pull Cart / Cart Drop), independent Club Rental
- Every player requires a name; submitting with any blank triggers a soft error state (Confirm button turns gold, label changes to "Add player name to continue" / "Add player names to continue", and missing inputs get an amber border). The banner/border do not appear until the user first tries to submit
- Player #1's name is pre-filled from the signed-in session; Member toggle is auto-checked and locked only when the session email matches an active membership
- Email and phone collected for player #1 only (the person making the booking)
- Cart pairing: riders paired 2-per-cart; shared riders pay half cart rate, solo riders pay full cart rate; rates vary by member/non-member and 9/18 holes
- Per-player pricing breakdown in the footer: each player's green fee (Included for members), attributed cart cost, pull cart, club rental, cart drop fee — summed into an estimated total
- All pricing pulled from Cart, Equipment & Range Rates settings section
- Body scroll locked while modal is open

**Availability enforcement (all server-side + reflected in UI):**
1. `course_open` = false → all bookings blocked, entire booking UI hidden
2. `course_auto_close_date` — dates on or after show "Online bookings are not available"
3. `require_login_for_booking` = true → POST returns 401 if no session; client redirects slot clicks to `/login` and restores modal on return
4. `tee_time_open` / `tee_time_close` window
5. Sunset cutoff — astronomical calculation (`src/lib/sunset.ts`, NOAA algorithm, no API key); when `tee_time_close` is blank, sunset minus `sunset_cutoff_hours` is the cutoff
6. Private events — `is_public=0` events block their time window (whole day if no start/end)
7. Equipment availability — capped by inventory minus same-day bookings

**UI slot colors:** available (white), selected start (gold), also-reserved (amber), booked (gray/strikethrough), private event (purple)

---

## My Bookings (`/my-bookings`)

Authenticated page where signed-in users review and manage their tee times. Shows upcoming bookings + the last 10 past bookings, deduplicated by `group_booking_id` so a multi-slot party shows once.

Each booking card has three actions:
- **Add to Calendar** — downloads the same `.ics` file as the booking confirmation modal (uses `group_booking_id` as the calendar UID, so re-imports update the existing event instead of duplicating).
- **Rebook next week** — links to `/tee-times?date=…&slot=…` with the booking's date + 7 days, prefilling the booking modal on the same time. The tee-times page's existing URL-param/sessionStorage handler picks it up.
- **Cancel** — confirmation modal → `DELETE /api/my-bookings?id=<id>` (auth + ownership checked; cascades to all rows of the group). Cancel is hidden for past bookings.

API: `GET /api/my-bookings` returns `{ upcoming, past }` filtered by `LOWER(player_email) = LOWER(session.user.email)`. `DELETE /api/my-bookings?id=N` rejects past dates and bookings owned by other users.

Linked from the user dropdown menu (desktop) and the mobile menu's user section. The page itself bounces unauthenticated visitors to `/login?callbackUrl=/my-bookings`.

---

## Memberships (`/memberships`)

Six tiers:
- Junior Summer Pass: $100
- Young Adult: $445
- Single: $740 (+ $100 gift card new members)
- Household: $962.50 (+ $100 gift card new members)
- Driving Range – Single: $80
- Driving Range – Household: $125

**Driving range add-on bundling:** Young Adult, Single, and Household tiers can add a driving range pass at checkout (Single: +$80, Household: +$125). Standalone range passes remain purchasable.

**Modal checkout:** Clicking a membership card opens a purchase modal (pre-filled from session) instead of inline expansion.

Season: May 1 – Oct 31 (current year).

Payment flow:
1. Google Pay / Apple Pay → Square Web Payments SDK → `/api/payments/square/process`
2. Credit card → Square → `/api/payments/square/process`
3. Invoice/ACH → QuickBooks → `/api/payments/quickbooks`

Auto-renewal: opt-in checkbox at checkout → Square Card on File stored (`square_customer_id`, `square_card_id` on membership row).

Member number format: `SLCC-YYYY-XXXXXX`

### Membership ↔ Account Linking

- `memberships.user_id` FK → `users.id` (added via migration with email-based backfill)
- Logged-in user purchases → `user_id` set automatically
- New user registration → auto-links any existing membership by email match
- Admin creates membership for unknown email → auto-creates user account with temp password, sends invite email via `sendAccountInvite()`

### Member Information Section

Below the membership cards on `/memberships`:
- **Member Days & Times** — weekly schedule table (Ladies Day, Men's League, Couples, etc.)
- **Ladies League Information** — details with PDF link

## Account Settings (`/settings`)

Authenticated users manage their profile:
- **Profile:** name, email, phone — changes reflected in header immediately via JWT refresh + `updateSession()`
- **Password:** current + new + confirm, bcrypt verified
- **Membership info:** linked membership details (member #, type, status, season, payment) or CTA to purchase
- User avatar with initials + "Member since" date

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

- Types: general, tournament, social
- `is_public = 1` → visible on public calendar, available for registration
- `is_public = 0` → **Private**: hidden from public calendar AND blocks online tee time booking during event's time window on that date (whole day if no start/end times set)
- Admin can toggle Public ↔ Private per event with one click
- Admin events page (`/api/admin/events`) shows ALL events; public `/api/events` shows only public ones
- **2026 season data:** 16 events loaded from swanlakecc.com — 11 tournaments (Spring Classic, Club Championship, Vangen, etc.) and 5 social/general (Kick-Off Dinner, Membership Meeting, Fundraiser, Aeration closure, Appreciation Day)

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

## Public Pages

### Homepage (`/`)
- 6 navigation cards in a 2×3 grid: Tee Times, Rates, Memberships (top); Course, Events, Tournaments (bottom)
- Each card has an SVG icon, title, and description

### About (`/about`)
- **Personnel:** Club Manager and Course Superintendent cards with photos, phone numbers, and year ranges
- **Board of Directors:** Table with name, position, year elected, and phone number (title inside card)
- **Contact Info:** Directions (Google Maps), email, and phone buttons

### Course (`/course`)
- **Golf Course Overview** title
- **Tee Options:** Championship, Men's, Ladies with yardage and slope/rating
- **Scorecard:** Hole-by-hole par and yardage; Holes 1 and 8 show par as "4/5" with footnote explaining separate men's/ladies par
- **Amenities:** Course features and facilities
- **Hole-By-Hole Flyover** (`src/components/HoleFlyover.tsx`): Vimeo drone video player for all 9 holes
  - Numbered tab row (1–9) with gold active indicator; arrow buttons overlaid on video sides; keyboard arrow key support
  - Hole 1 loads paused with a prominent gold play button overlay; holes 2–9 autoplay on navigation
  - Videos auto-advance to the next hole when finished; hole 9 loops back to hole 1
  - Fade transition (220 ms) between holes; fresh iframe keyed per navigation
  - Displays hole stats (par, handicap, Blue/White/Red yardage) and per-hole description text

### Rates (`/rates`)
- **Rates & Fees** title with descriptive subtitle
- **Daily Green Fees** table card (adult and youth rates) with membership CTA button below
- **Cart & Equipment Fees** section: 4 cards (9-hole carts, 18-hole carts, other cart fees, club rentals)
- **Driving Range** table card (buckets, passes)

### Tee Times (`/tee-times`)
- Booking modal with per-player equipment selection and live pricing
- Membership auto-detection for logged-in users
- See "Tee Time Booking" section above for full details

---

## UI Components

### Header (`Header.tsx`)
- Top bar: bg-swan-green-light with directions, email, phone links (desktop); phone number only on mobile
- Logo: square with rounded corners (`rounded-xl`)
- User section: initials avatar in circle → dropdown menu with Settings link and Sign Out
- No "Admin" link in nav (admin bar handles admin navigation)

### AdminBar (`AdminBar.tsx`)
- Global admin navigation bar visible on all pages for admin users
- Client component using `useSession()` and `usePathname()` for active link highlighting
- Contains all admin nav links: Dashboard, Tee Sheet, Bookings, Memberships, Billing, Tournaments, Events, Equipment, Settings, Desk Mode

### PWA Install (`PwaProvider.tsx`)
- React context (`usePwaInstall()`) exposes `{ status, install }` to the rest of the app
- `status: "android"` — captured `beforeinstallprompt` event; `install()` triggers the native add-to-home-screen prompt
- `status: "ios"` — iOS Safari (iOS Safari never fires `beforeinstallprompt`); `install()` opens an instructions modal showing the 3-step Share → Add to Home Screen flow with rendered iOS share-sheet icon
- `status: "unsupported"` — already in standalone mode, or browser can't install; the entry point is hidden
- Listens for `appinstalled` to flip back to `"unsupported"` after a successful install
- Header surfaces an "Install App" entry in both the desktop user menu and the mobile menu (visible to signed-out users on mobile too)
- Service worker registration unchanged (production-only)

### Pull-to-Refresh (`PullToRefresh.tsx`)
- Standalone-PWA only — detects via `display-mode: standalone` + iOS legacy `navigator.standalone`
- Damped pull (factor 0.5, max 140 px); threshold 80 px commits a `location.reload()`
- Translates `#ptr-page` (sibling, not parent of the spinner — preserves `position: fixed` containing block)
- Skipped when scroll position > 0 or body scroll is locked (modal open)
- Spinner sits in a fixed flex container whose height matches the page's `translateY` so it stays geometrically centered in the revealed bar at any pull distance

---

## Transactional Email (Nodemailer)

All sends are fire-and-forget (`.catch(() => {})`). Silently skips if `smtp_host` not configured.

Emails sent for:
- Tee time booking confirmation (slots, equipment, date/time)
- Membership purchase receipt (member number, tier, amount, season dates)
- Tournament registration confirmation
- Membership renewal reminder (link to renew)
- Account invite (when admin creates membership for non-existing user)

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
| GET/PATCH | `/api/user/settings` | User profile + linked membership info (auth required) |
| GET | `/api/my-bookings` | Logged-in user's upcoming + past tee times |
| DELETE | `/api/my-bookings?id=N` | Cancel a booking (owner only, future dates only) |
| GET | `/api/weather` | 10-day forecast from Open-Meteo for the configured course coords (in-memory cached 30 min) |
| POST | `/api/auth/register` | Create user account (auto-links memberships by email) |

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

Three are required:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | PostgreSQL connection string — `postgresql://user:pass@host/dbname` |
| `AUTH_SECRET` | 32-byte base64 string — `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Full app URL, e.g. `https://slcc.secure-computing.net` |

Everything else is in the database.

---

## Deployment & Environments

Hosted on a single Vultr VM (Ubuntu 24.04 LTS, 2 vCPU / 4 GB / 80 GB NVMe). Three live environments share the VM, each with its own PostgreSQL database, PM2 process, and nginx vhost.

| Environment | Branch | URL | Port | Database |
|-------------|--------|-----|------|----------|
| Production | `main` | `https://slcc.secure-computing.net` | 3000 | `swanlake` |
| Boxfort (dev) | `boxfort` | `https://boxfort.secure-computing.net` | 3001 | `swanlake_boxfort` |
| Gorilla (dev) | `gorilla` | `https://gorilla.secure-computing.net` | 3002 | `swanlake_gorilla` |

The domain is Cloudflare-proxied. The raw server IP (`45.63.69.172` / `slcc-real.secure-computing.net`) is used for `DEPLOY_HOST` in GitHub Actions secrets so SSH bypasses Cloudflare.

### CI/CD pipeline (GitHub Actions)

Every push to `main`, `boxfort`, or `gorilla` runs:

1. **Type Check** — `tsc --noEmit` on a GitHub runner
2. **Tests** — 22 unit + integration tests against an ephemeral postgres:16 container
3. **Deploy** — SSH to the VM → `git pull` → `npm ci` → `npm run build` → `npm run db:migrate` → `pm2 reload` (zero-downtime)

Deploy only runs if both type check and tests pass.

**Manual trigger:** GitHub → Actions → Deploy → Run workflow → select branch. The `branch` input overrides the branch the workflow was triggered on, so you can re-deploy any environment without pushing a commit.

### GitHub Actions secrets required

| Secret | Value |
|--------|-------|
| `DEPLOY_HOST` | Server IP or non-proxied hostname (`slcc-real.secure-computing.net`) |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | ED25519 private key — `cat /home/deploy/.ssh/actions_deploy` on the server |

### Initial server provisioning

```bash
# Fresh VM — run once as root
bash deploy/server-setup.sh

# Dev environments — run once as root after server-setup.sh
bash deploy/branch-setup.sh
```

`server-setup.sh` installs Node 22, PostgreSQL, nginx, PM2, certbot, and UFW; generates SSH key pairs; writes `.env.local`; prints next steps.

`branch-setup.sh` provisions both dev environments: creates databases, clones the correct branch, installs, builds, starts PM2, and writes nginx vhosts.

### nginx configs

| File | Purpose |
|------|---------|
| `deploy/nginx.conf` | Production SSL vhost (port 443 → 3000) |
| `deploy/nginx-boxfort.conf` | Boxfort SSL vhost (port 443 → 3001) |
| `deploy/nginx-gorilla.conf` | Gorilla SSL vhost (port 443 → 3002) |

All use `listen 443 ssl http2` syntax (nginx 1.24 on Ubuntu 24.04 — `http2 on;` directive requires nginx ≥ 1.25.1).

### Adding a third dev environment

1. Pick a name and port (e.g. `feature-x` / `3003`)
2. On the server as root: create the DB, app dir, `.env.local`, clone the branch, build, start PM2, write nginx vhost, issue SSL cert
3. Add the branch to `on.push.branches` and the `if` condition in `deploy-branch` in `.github/workflows/deploy.yml`
4. Create and push the branch: `git checkout -b feature-x && git push -u origin feature-x`
