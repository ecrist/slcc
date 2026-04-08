# Claude Instructions — Swan Lake CC

## Feature Inventory

**Always read `FEATURES.md` before editing `README.md` or making any claims about what is or isn't implemented.** It is the authoritative record of every feature, API route, config key, DB table, and known stub/gap. Do not rely on README.md alone — it has drifted from reality before.

When a feature is added, changed, or removed, update **both** `README.md` and `FEATURES.md` in the same commit.

## Commits

- No `Co-Authored-By: Claude` lines — ever.
- Commit messages should explain *why*, not just *what*.

## Documentation

- README.md and FEATURES.md must stay in sync with the code.
- Do not document things that aren't implemented. Known stubs (Toast POS webhook, Square POS webhook) are noted in FEATURES.md — do not present them as working features.

## Known Facts (do not contradict without verifying)

- **Database**: PostgreSQL via `pg` (node-postgres). `DATABASE_URL` env var required. Migrations: `npm run db:migrate`. NOT SQLite.
- **Payments**: Square (cards, Google Pay, Apple Pay, card-on-file) and QuickBooks (ACH/invoice). **Stripe is not present and was never implemented.**
- **Email**: Nodemailer over SMTP. NOT SendGrid.
- **Deployment**: PM2 + nginx. NOT Render or any cloud PaaS.
- **Config**: Almost everything lives in the `site_config` DB table, editable via Admin → Settings. Only `AUTH_SECRET` and `NEXTAUTH_URL` are required in `.env.local`.
- **Auth**: NextAuth v5. Edge-safe split between `auth.config.ts` (middleware) and `auth.ts` (Node.js). OAuth credentials are read from the DB at runtime and require a server restart to take effect.
- **PWA and offline support** are fully implemented (`public/sw.js`, `public/manifest.json`, `/app/offline/`, `WakeLock.tsx`). Do not remove this from documentation.
- **`toast` in `desk/page.tsx`** is a UI notification component, not the Toast POS system.
- **Toast POS webhook** (`/api/webhooks/toast/route.ts`): fully implemented — HMAC-SHA256 verification, CHECK_CLOSED handling, member name matching, dedup via `external_id`. Square POS webhook (`/api/webhooks/square`) is still a stub.
- **`member_charges`** has `source` (manual/toast) and `external_id` (unique dedup) columns added via migration.

## Workflow Preferences

- Keep changes minimal and focused — do not refactor or clean up surrounding code unless asked.
- Run `npm run build` to verify changes compile before committing.
- When the build passes, commit and push in the same step unless told otherwise.
