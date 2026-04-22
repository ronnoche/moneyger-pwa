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
