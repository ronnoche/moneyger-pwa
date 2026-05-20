# Moneyger

Zero-based envelope budgeting PWA. Offline-first, installable on iOS/Android, syncs across devices via Supabase. Personal single-user app.

## Stack

- **Vite 7 + React 19 + TypeScript** — build & UI
- **Tailwind v4** — CSS-first theme
- **React Router v7** (library mode)
- **Dexie + dexie-react-hooks** — offline-first IndexedDB
- **Supabase** — PostgreSQL cloud database, cross-device sync
- **React Hook Form + Zod** — forms & validation
- **Recharts, date-fns, Lucide, Radix** — charts, dates, icons, primitives
- **vite-plugin-pwa + Workbox** — installable PWA, offline service worker
- **Vitest** — unit tests

## Local development

1. **Install deps:** `pnpm install`
2. **Environment:** copy `.env.example` → `.env` and fill in your Supabase keys
3. **Start:** `pnpm dev` → `http://localhost:5173`

That's it. No Netlify Dev required — Supabase is called directly from the client using the anon key.

## Environment variables

All client-safe (prefixed `VITE_`, baked into the browser bundle):

```env
# Google OAuth (identity / login gate)
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
VITE_OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback

# Supabase (database & cross-device sync)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-public-key
```

See `.env.example` for the full list. Add the same vars to Netlify → Site Settings → Environment Variables for production deploys.

## Supabase setup

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** → copy Project URL and `anon` key
3. In the **SQL Editor**, run the schema from `supabase/schema.sql` (or the block below)
4. RLS is disabled — this is a personal single-user app accessed via the anon key

<details>
<summary>Schema SQL</summary>

```sql
CREATE TABLE IF NOT EXISTS groups (
  id text PRIMARY KEY, name text NOT NULL DEFAULT '',
  "sortOrder" integer NOT NULL DEFAULT 0, "isArchived" boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY, "groupId" text NOT NULL DEFAULT '', name text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'expense', "goalType" text NOT NULL DEFAULT 'none',
  "goalBehavior" text, "goalAmount" numeric NOT NULL DEFAULT 0,
  "goalDueDate" text, "goalRecurring" boolean, "goalStartMonth" text,
  "snoozedUntil" text, "linkedAccountId" text,
  "sortOrder" integer NOT NULL DEFAULT 0, "isArchived" boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS accounts (
  id text PRIMARY KEY, name text NOT NULL DEFAULT '',
  "accountCategory" text NOT NULL DEFAULT 'cash', subtype text NOT NULL DEFAULT 'checking',
  "onBudget" boolean NOT NULL DEFAULT true, "lastReconciledAt" text,
  "isCreditCard" boolean NOT NULL DEFAULT false, "isArchived" boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS transactions (
  id text PRIMARY KEY, date text NOT NULL DEFAULT '',
  outflow numeric NOT NULL DEFAULT 0, inflow numeric NOT NULL DEFAULT 0,
  "categoryId" text NOT NULL DEFAULT '', "accountId" text NOT NULL DEFAULT '',
  memo text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'cleared',
  "reconciledAt" text, "reconcileEventId" text,
  "createdAt" text NOT NULL DEFAULT '', "updatedAt" text NOT NULL DEFAULT '', "syncedAt" text
);
CREATE TABLE IF NOT EXISTS transfers (
  id text PRIMARY KEY, date text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  "fromCategoryId" text NOT NULL DEFAULT '', "toCategoryId" text NOT NULL DEFAULT '',
  memo text NOT NULL DEFAULT '',
  "createdAt" text NOT NULL DEFAULT '', "updatedAt" text NOT NULL DEFAULT '', "syncedAt" text
);
CREATE TABLE IF NOT EXISTS "netWorthEntries" (
  id text PRIMARY KEY, date text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0, category text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'asset', notes text NOT NULL DEFAULT ''
);

ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE "netWorthEntries" DISABLE ROW LEVEL SECURITY;

GRANT ALL ON groups TO anon;
GRANT ALL ON categories TO anon;
GRANT ALL ON accounts TO anon;
GRANT ALL ON transactions TO anon;
GRANT ALL ON transfers TO anon;
GRANT ALL ON "netWorthEntries" TO anon;
```

</details>

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Vite dev server at `http://localhost:5173` |
| `pnpm build` | Typecheck + production build |
| `pnpm preview` | Serve the production build locally |
| `pnpm test` | Vitest in watch mode |
| `pnpm test:run` | Vitest once (CI) |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm pwa-assets` | Regenerate PWA icons from `public/icon-source.svg` |

## Project layout

```
src/
  app/          layout shell, router, providers
  auth/         login gate + session management
  routes/       thin page components
  features/     feature repos + form schemas
  components/   ui/, layout/, sync/, shared
  db/           Dexie schema, instance, hooks
  lib/          supabase client, sync engine, budget-math, utils
  styles/       index.css (Tailwind v4 theme)
netlify/
  functions/    OAuth token exchange/refresh (server-only)
tests/          Vitest setup + unit tests
```

## Sync architecture

Data is stored locally in **IndexedDB (Dexie)** for instant offline access. Every mutation is queued in a persistent **outbox**. On network reconnect or explicit sync, the outbox drains to **Supabase** via upsert. On first login, a full pull from Supabase replaces local state — this is how new devices (iPhone, iPad, Mac) pick up your data.

```
iPhone / iPad / Mac
  └── PWA (Dexie — IndexedDB, offline-first)
        ↕  outbox drain / full pull
      Supabase (PostgreSQL)
        └── hosted, always-on, free tier
```

## Data model

See `src/db/schema.ts`. Core entities: `Group → Category → Transaction`, `Account`, `Transfer`, `NetWorthEntry`. All category goals use a discriminated `goalType` field: `none | monthly_funding | target_balance | target_by_date | weekly | monthly | yearly | custom`.

## First run

No seed data. The app redirects to `/onboarding` until at least one group, one category, and one account exist.

## Deployment

Hosted on [Netlify](https://netlify.com) (free). Deploys automatically on push to `main`. Set the four env vars above in Netlify → Site Settings → Environment Variables.
