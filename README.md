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

- `pnpm dev` — Vite only (`http://localhost:5173`). **Does not** run Netlify Functions; `/.netlify/functions/*` is unavailable.
- `pnpm dlx netlify dev` — full local stack: Netlify Dev on **`http://localhost:8888`**, Vite behind the proxy, and `netlify/functions` loaded from the repo root `.env`. Use this for Google sign-in, Sheets sync, and the registry function.
- `pnpm build` — typecheck + production build
- `pnpm preview` — serve the production build
- `pnpm test` — run Vitest in watch mode
- `pnpm test:run` — run Vitest once (CI)
- `pnpm lint` — ESLint
- `pnpm format` — Prettier
- `pnpm pwa-assets` — regenerate icons from `public/icon-source.svg`

## Local development

1. **Node:** use the version in `.nvmrc` (22).
2. **Dependencies:** `pnpm install`
3. **Environment:** copy `.env.example` to `.env` and fill values (see [Google Auth + Sheets Sync](#google-auth--sheets-sync)). Netlify Dev injects server-only vars from `.env` into functions.
4. **Start:** from the repo root run:

   ```bash
   pnpm dlx netlify dev
   ```

   Open **`http://localhost:8888`**. Vite’s own port (often `5173`) still runs in the background; browse **only** through `8888` so the app origin, redirects, and `/.netlify/functions/*` paths match production.

For UI-only work without OAuth or sync, `pnpm dev` on port `5173` is enough.

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

Google sign-in runs through two Netlify Functions:

- `/.netlify/functions/google-oauth-exchange` exchanges the auth code for tokens
- `/.netlify/functions/google-oauth-refresh` refreshes access tokens

All Sheets writes go through a server proxy:

- `/.netlify/functions/sheets-sync` verifies the caller's Google access token
  with `oauth2/v3/userinfo`, then forwards the write to your Apps Script
  endpoint. The Apps Script shared secret never leaves the server.

### 1) Google Cloud setup

- Create or use a Google Cloud project
- Configure `OAuth consent screen` (Testing mode is fine)
- Create an OAuth `Web application` client
- Register **authorized redirect URIs** (one full URL per line, no typos, no extra path segments). This app’s route is **`/auth/callback` only** — not `.../api/auth/callback/google` (that pattern is for other frameworks).
  - `http://localhost:8888/auth/callback` (local `netlify dev`)
  - `http://localhost:5173/auth/callback` (plain `vite` dev)
  - `https://<your-netlify-site>.netlify.app/auth/callback` (e.g. `...moneyger-pwa...`)
  - `https://<your-custom-domain>/auth/callback` if you use a custom domain in front of Netlify
- Register **authorized JavaScript origins** (scheme + host + port only, no path): e.g. `http://localhost:8888` (local `netlify dev`), `http://localhost:5173` (plain Vite), `https://<site>.netlify.app`, `https://<custom-domain>`
- Add QA accounts to `OAuth consent screen -> Test users`

### 2) Environment variables

See `.env.example` for the full list and client vs server boundary.

Client-safe (prefix `VITE_`, baked into the browser bundle):

- `VITE_GOOGLE_CLIENT_ID`

Server-only (Netlify function env, never sent to the browser):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `APPS_SCRIPT_URL`
- `APPS_SCRIPT_SECRET`
- `GOOGLE_ALLOWED_EMAILS` (optional comma-separated allowlist)

### 3) Local QA

- Follow [Local development](#local-development) (`pnpm dlx netlify dev`, open `http://localhost:8888`)
- Click `Sign in with Google`
- After callback, the session is persisted in `localStorage`
- Sync buttons in `Settings -> Data` call the proxy with the user's bearer token
