# Swan Lake CC — Improvement Roadmap

Comprehensive list of UI/UX improvements and missing functionality, organized by priority and area. Each item is scoped to be individually shippable.

---

## 1. Public Website — First Impressions & Polish

These are what a first-time visitor or returning member experiences. The current site is functional but feels like a developer built it for correctness, not for a guest booking a tee time on their phone.

### 1.1 Global UI Modernization

| # | Item | What's Wrong | What To Do |
|---|------|-------------|------------|
| 1 | **Page transitions & entrance animations** | Pages snap in with no motion — feels flat and dated | Add subtle fade/slide-in on page load for hero sections, cards, and content blocks (CSS animations, no heavy library needed) |
| 2 | **Loading states everywhere** | Most pages show nothing or "Loading..." text while fetching | Replace with skeleton loaders (pulse placeholders matching the layout shape) |
| 3 | **Active nav link highlighting** | Header nav links don't indicate which page you're on | Highlight current route in header nav (underline or color change) |
| 4 | **Mobile nav polish** | Hamburger menu works but opens/closes instantly | Animate the mobile menu open/close (slide-in drawer or fade) |
| 5 | **Footer upgrade** | Minimal 3-column text block, no social links | Add social media links (Facebook, Instagram), quick-nav links, and a newsletter CTA or seasonal promo area |
| 6 | **Toast notifications** | Success/error messages are inline and inconsistent across pages | Add a global toast/notification system (bottom-right stack) for all user actions |
| 7 | **Scroll-to-top button** | Long pages (rates, memberships, course) require manual scroll | Floating scroll-to-top button after scrolling down |
| 8 | **Dark mode support** | No dark mode | Not urgent, but worth considering for the PWA/desk kiosk use case |

### 1.2 Homepage (`/`)

| # | Item | What To Do |
|---|------|------------|
| 9 | **Hero image/video background** | Replace the solid gradient hero with an actual course photo or subtle video loop — this is the first thing anyone sees |
| 10 | **Seasonal banner** | Dynamic banner showing course status (open/closed), current conditions, or announcements — pulls from site_config |
| 11 | **Upcoming events preview** | Show next 2-3 upcoming events below the nav cards so visitors see what's happening |
| 12 | **Weather widget** | Small current conditions display (temp, wind) relevant to golfers — use a free weather API or just link to forecast |
| 13 | **Card entrance animations** | Stagger the 6 nav cards so they animate in one by one on first load |

### 1.3 Tee Times (`/tee-times`)

| # | Item | What's Wrong | What To Do |
|---|------|-------------|------------|
| 14 | **Time slot grid is overwhelming on mobile** | 55 tiny buttons in a column | Group slots by hour with collapsible sections, or show a compact list view on mobile |
| 15 | **Slot selection animation** | Clicking a slot just changes color — no feedback | Add a brief scale/pulse animation on select, smooth scroll to booking form |
| 16 | **Booking confirmation modal** | After booking, user gets a success message inline | Show a proper confirmation modal/card with booking summary, "Add to Calendar" link, and share option |
| 17 | **Calendar date picker** | Horizontal date buttons work but feel limiting | Add a proper calendar popup alongside the quick-pick buttons for navigating further ahead |
| 18 | **Equipment selection UX** | Dropdown counts for carts/buggies/clubs are functional but plain | Use +/- stepper buttons with icons for each equipment type |

### 1.4 Memberships (`/memberships`)

| # | Item | What To Do |
|---|------|------------|
| 19 | **Tier comparison layout** | Redesign cards as a comparison grid showing what's included in each tier side-by-side (checkmarks, perks) |
| 20 | **Purchase modal — multi-step** | Break the large modal into a step wizard: 1) Choose tier → 2) Your info → 3) Payment → 4) Confirmation |
| 21 | **New member badge/incentive callout** | The $100 gift card for new Single/Household members is buried in description text — make it a prominent badge |
| 22 | **Testimonials or member count** | Add social proof — "Join 120+ members" or a short testimonial quote |

### 1.5 Course (`/course`)

| # | Item | What To Do |
|---|------|------------|
| 23 | **Scorecard mobile view** | The 9-column table is cramped on phones — make it horizontally scrollable with a sticky first column, or switch to a card-per-hole layout on mobile |
| 24 | **Course photo gallery** | Add a photo gallery or hero image of the course — currently pure text + video |
| 25 | **Hole flyover improvements** | Add a thumbnail strip below the video so users can see what each hole looks like before clicking |

### 1.6 Events & Tournaments

| # | Item | What To Do |
|---|------|------------|
| 26 | **Event cards redesign** | Current cards are flat list items — redesign with cover images (or placeholder golf graphics), larger date badges, and better typography |
| 27 | **Event registration → modal** | Move inline registration form into a modal so the event list stays clean |
| 28 | **Tournament leaderboard polish** | Add podium-style top-3 display, alternating row colors, player avatars/initials, and expand/collapse for team details |
| 29 | **Tournament bracket/draw visualization** | For match play, show an actual bracket. For team events, show the draw result as a visual grid |
| 30 | **"Add to Calendar" for events** | Generate .ics file download or Google Calendar link from event details |

### 1.7 Auth & Account

| # | Item | What To Do |
|---|------|------------|
| 31 | **Forgot password flow** | Currently missing entirely — add email-based password reset (send token link, verify, update) |
| 32 | **Password show/hide toggle** | Add eye icon toggle on all password fields (login, register, settings) |
| 33 | **Password strength indicator** | Show strength bar on registration and password change |
| 34 | **Email verification** | Send verification email on registration, show "verify your email" banner until confirmed |
| 35 | **Settings — membership management** | Let members view charge history, download receipts, and manage auto-renewal (toggle on/off, update card) from their settings page |
| 36 | **Profile photo upload** | Allow users to upload a profile photo instead of just showing initials |

### 1.8 Rates (`/rates`)

| # | Item | What To Do |
|---|------|------------|
| 37 | **Interactive rate cards** | Add hover/expand animations, maybe a "compare" feature between member and non-member rates |
| 38 | **Dynamic pricing from DB** | Rates are currently hardcoded in the page — pull from site_config so admins can update without code changes |

### 1.9 About (`/about`)

| # | Item | What To Do |
|---|------|------------|
| 39 | **Board table mobile layout** | Convert table to stacked cards on mobile for better readability |
| 40 | **Embedded map** | Add a small Google Maps embed in the contact section instead of just a link |

---

## 2. Admin Portal — Operational Efficiency

The admin portal works but feels like a prototype. Admins running a busy golf course need speed, bulk actions, and at-a-glance information.

### 2.1 Admin Dashboard (`/admin`)

| # | Item | What To Do |
|---|------|------------|
| 41 | **Real dashboard with KPIs** | Replace the 3 basic cards with a proper dashboard: today's bookings count, revenue this week/month, active members, pending payments, upcoming events, recent check-ins, course status |
| 42 | **Quick actions panel** | Add buttons for common tasks: "New Booking", "Add Charge", "Check Course Status" without navigating away |
| 43 | **Activity feed** | Show recent activity (new bookings, cancellations, payments, check-ins) as a live feed |
| 44 | **Auto-refresh** | Dashboard should poll or use SSE to stay current without manual refresh |

### 2.2 Tee Sheet (`/admin/tee-sheet`)

| # | Item | What To Do |
|---|------|------------|
| 45 | **Drag-and-drop rebooking** | Allow admins to drag a booking to a different time slot |
| 46 | **Bulk check-in** | Select multiple bookings and check them all in at once (e.g., a foursome walking in together) |
| 47 | **Print tee sheet** | "Print Today's Sheet" button with a clean print-optimized layout |
| 48 | **Color legend** | Add a small legend explaining what each color means — new staff won't know |
| 49 | **Week/multi-day view** | Option to see the full week at a glance, not just one day at a time |

### 2.3 Remove Redundant "Manage Tee Times" Page

| # | Item | What To Do |
|---|------|------------|
| 50 | **Merge into Tee Sheet** | `/admin/tee-times` is a plain table duplicate of the tee sheet. Merge any unique functionality (if any) into the tee sheet page and remove the redundant page, or repurpose it as a searchable booking log across all dates |

### 2.4 Memberships (`/admin/memberships`)

| # | Item | What To Do |
|---|------|------------|
| 51 | **Sortable columns** | Click column headers to sort by name, type, amount, status, date |
| 52 | **CSV export** | "Export to CSV" button for the current filtered view |
| 53 | **Member detail drawer/page** | Click a member row to see full detail: profile, charge history, payment history, check-in history, NFC status, notes |
| 54 | **Bulk actions** | Select multiple members → mark paid, send email, export |
| 55 | **Search** | Search members by name, email, or member number |

### 2.5 Billing (`/admin/billing`)

| # | Item | What To Do |
|---|------|------------|
| 56 | **Charge editing** | Allow editing charge amount, description, and type after creation (not just mark paid/void) |
| 57 | **Member charge history** | Click a member name to see all their charges in a side panel |
| 58 | **Aging report** | Add a tab or view showing overdue charges grouped by 30/60/90 days |
| 59 | **Batch export** | Export charges to CSV for QuickBooks import |
| 60 | **Receipt generation** | Generate and email a receipt/statement for a charge or group of charges |

### 2.6 Events (`/admin/events`)

| # | Item | What To Do |
|---|------|------------|
| 61 | **Edit events** | Currently can only create or delete — add full edit capability |
| 62 | **View registrations** | Show who registered for each event, with contact info and party size |
| 63 | **Event cancellation workflow** | Cancel an event and optionally notify all registered attendees via email |
| 64 | **Calendar view** | Show events on an actual calendar grid (month view) in addition to the list |

### 2.7 Tournaments (`/admin/tournaments`)

| # | Item | What To Do |
|---|------|------------|
| 65 | **Inline tournament editing** | Edit tournament details (dates, fees, capacity) without deleting and recreating |
| 66 | **Entry management from list** | Show entry count and quick-view entries without navigating to detail page |
| 67 | **Participant notifications** | Send email to all registered participants (updates, reminders, results) |
| 68 | **Score entry UX** | Improve the scoring interface — larger touch targets, running totals, auto-advance between teams |

### 2.8 Equipment (`/admin/equipment`)

| # | Item | What To Do |
|---|------|------------|
| 69 | **Service history log** | Track maintenance history per item (date, what was done, by whom) |
| 70 | **Maintenance alerts** | Flag equipment approaching service intervals (by hours or date) |
| 71 | **Usage tracking** | Show how often each piece of equipment is booked |

### 2.9 Reports (`/admin/reports`)

| # | Item | What To Do |
|---|------|------------|
| 72 | **Charts and graphs** | Add visual charts (bar, line, pie) instead of just tables — daily booking volume, revenue trends, membership growth |
| 73 | **CSV/PDF export** | Export any report view to CSV or PDF |
| 74 | **Drill-down** | Click a member or date in a report to see detail |
| 75 | **Booking & revenue report** | Add a report for tee time bookings (volume, revenue by day/week/month) |
| 76 | **Seasonal comparison** | Compare this season vs. last season |

### 2.10 Settings (`/admin/settings`)

| # | Item | What To Do |
|---|------|------------|
| 77 | **"Test Connection" buttons** | Add test buttons for SMTP (send test email), Square (verify credentials), QuickBooks (verify OAuth) |
| 78 | **Audit log** | Show who changed which setting and when |
| 79 | **Announcements/Banner editor** | Let admins set a site-wide banner message (course closed for weather, special event, etc.) without touching code |

### 2.11 Admin Global UX

| # | Item | What To Do |
|---|------|------------|
| 80 | **Consistent loading skeletons** | Replace all "Loading..." text with skeleton loaders matching the page layout |
| 81 | **Confirmation dialogs** | Add "Are you sure?" confirmation before destructive actions (delete event, void charge, cancel booking) |
| 82 | **Admin search** | Global search in the admin bar — search members, bookings, charges, events across all sections |
| 83 | **Keyboard shortcuts** | Common actions: `N` for new, `S` for save, `Esc` to close modals |
| 84 | **Responsive admin tables** | Tables on admin pages collapse poorly on tablets — add horizontal scroll or card view on smaller screens |

---

## 3. Technical & Infrastructure

| # | Item | What To Do |
|---|------|------------|
| 85 | **Dynamic rates from DB** | Rates page currently hardcodes prices — move all rates to site_config so admins can update from Settings |
| 86 | **Forgot password API + email** | Backend: token generation, storage, expiry, verification, password update endpoint |
| 87 | **Email verification flow** | Backend: verification token on registration, verify endpoint, resend capability |
| 88 | **Announcement/banner system** | New site_config keys for banner text + enabled flag, rendered in layout |
| 89 | **Image upload** | Profile photos and event images need a file upload solution (local disk or S3-compatible) |
| 90 | **Audit logging table** | New `audit_log` table tracking admin actions (who, what, when, old value, new value) |

---

## Suggested Priority Order

**Phase 1 — Quick Wins (high impact, low effort):**
Items 1-3, 6, 13, 16, 31-32, 38, 41, 61, 79-81

These are the changes that will make the biggest visual and functional difference with the least code. Entrance animations, skeleton loaders, active nav states, toast notifications, forgot password, the dashboard upgrade, event editing, and confirmation dialogs.

**Phase 2 — Core UX Upgrades:**
Items 4-5, 9-11, 14-15, 17-20, 26-27, 30, 35, 37, 39-40, 44-48, 50-55, 77, 82, 84-86

Homepage hero, tee time mobile UX, membership wizard, event card redesign, tee sheet improvements, member detail views, sortable/exportable tables, and the settings test buttons.

**Phase 3 — Feature Completions:**
Items 21-25, 28-29, 33-36, 56-60, 62-68, 69-76, 78, 83, 87-90

Charge editing, tournament bracket visualization, full reporting with charts, service history tracking, audit logging, email verification, and image uploads.

---

*Last updated: 2026-04-15*
