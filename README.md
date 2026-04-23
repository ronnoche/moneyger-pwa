# Moneyger

Zero-based envelope budgeting, offline-first, installable on iOS.

## Stack

- Vite + React 19 + TypeScript
- Tailwind v4 (CSS-first theme)
- React Router v7 (library mode)
- Dexie + dexie-react-hooks
- React Hook Form + Zod
- Recharts, date-fns, Lucide, Radix (piecemeal)
- vite-plugin-pwa
- Vitest

## Scripts

- `pnpm dev` — local dev server
- `pnpm build` — typecheck + production build
- `pnpm preview` — serve the production build
- `pnpm test` — run Vitest in watch mode
- `pnpm test:run` — run Vitest once (CI)
- `pnpm lint` — ESLint
- `pnpm format` — Prettier
- `pnpm pwa-assets` — regenerate icons from `public/icon-source.svg`

## Project Layout

```
src/
  app/              layout shell + router
  routes/           thin route components
  features/         feature modules (forms, repos, schemas) - Phase 2+
  components/       ui/, layout/, shared
  db/               Dexie schema, instance, hooks
  lib/              budget-math, format, dates, cn
  sync/             Phase 4
  styles/           index.css with Tailwind theme
tests/              Vitest setup + budget-math.test.ts
public/             static assets, PWA icon source
```

## Phases

- Phase 0: stack and structure (done)
- Phase 1: scaffold, math, tests, empty-state onboarding (current)
- Phase 2: full transaction/move-money/accounts screens
- Phase 3: reports, settings editors, polish, Netlify deploy
- Phase 4: Google Sheets sync

## Data Model

See `src/db/schema.ts`. All category goals use a discriminated `goalType` field:
`none | monthly_funding | target_balance | target_by_date`.

## First Run

No seed data. The app redirects to `/onboarding` until the user creates at
least one group, one category, and one account.

## Google Auth + Sheets Sync

The app now supports syncing backup records into Google Sheets through a
Netlify Function at `/.netlify/functions/sheets-sync`.

### 1) Google Cloud setup

- Create or use a Google Cloud project
- Enable `Google Sheets API`
- Configure `OAuth consent screen`
- Create an OAuth `Web application` client for your site domains
- Create a service account and generate a JSON key
- Share the target Google Sheet with the service account email (Editor)

### 2) Environment variables

Set these in Netlify and local `.env` for testing:

- `VITE_GOOGLE_CLIENT_ID` (frontend OAuth client id)
- `GOOGLE_CLIENT_ID` (same OAuth client id, used by server token checks)
- `GOOGLE_SHEETS_ID` (spreadsheet id from the sheet URL)
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (keep `\n` in the value)
- `GOOGLE_SHEETS_TAB` (optional, default `Records`)
- `GOOGLE_ALLOWED_EMAILS` (optional comma-separated allowlist)

### 3) App flow

- Open `Settings -> Data`
- Sign in with Google
- Click `Sync to Google Sheets`
- Each sync appends one row per record to the configured sheet tab
