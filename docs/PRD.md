# Moneyger - Product Requirements Document

Version 1.0. Self-contained build spec for an agentic AI. The goal is to recreate the app from scratch using only this file. Follow sections in order. Every section is normative unless marked "Optional".

---

## 1. Product overview

- **Name:** Moneyger
- **Category:** Personal finance, zero-based envelope budgeting
- **Platform:** Installable Progressive Web App. Mobile-first with iOS home-screen parity. Desktop works as a single-column responsive web app with an optional left sidebar on large screens
- **Offline:** Fully offline. All data lives in the browser IndexedDB via Dexie. No authentication, no server accounts, no cloud sync in v1
- **Inspiration:** Moneyger Budgeting v4.0 Google Sheet. Methodology and math must not drift from zero-based envelope budgeting
- **Feel:** Calm, trustworthy, native-feeling on iOS. Numbers are unmistakable. Destructive actions are discoverable but never accidental

### Mental model the user holds

1. Income lands in a pool called **Available to Budget** (ATB)
2. The user **moves money** from ATB into **categories** (envelopes)
3. Spending from a category drives its **Available** balance down
4. Categories live inside **groups** (Monthly Bills, Savings, Discretionary)
5. Every category has an optional **goal** with progress

---

## 2. Users

- **Primary:** self-taught budgeters migrating off the Moneyger Google Sheet. Comfortable with envelope budgeting, averse to spreadsheets on mobile
- **Secondary:** new budgeters. They see a welcome screen and a guided first-run
- **Context:** one-handed phone use, 10 seconds to log a transaction at checkout

---

## 3. Tech stack (must use)

- **Build:** Vite 7, React 19, TypeScript 6
- **Styling:** Tailwind CSS v4 with CSS-first `@theme` tokens. No `tailwind.config.js`. Token file at `src/styles/index.css`
- **Routing:** React Router v7 in library mode (`createBrowserRouter`)
- **State:** Dexie 4 for persistence. `dexie-react-hooks` (`useLiveQuery`) for reactive reads
- **Forms:** React Hook Form 7 with Zod 4 resolvers
- **UI primitives:** Radix UI (Dialog as bottom sheet, Tabs, Dropdown Menu, Context Menu)
- **Charts:** Recharts 3 (lazy-loaded per route)
- **Motion:** `motion` library (Framer Motion successor)
- **Gestures:** `@use-gesture/react`
- **Icons:** `lucide-react`, 20 to 22 px, stroke width 2
- **Toasts:** `sonner`
- **Command palette:** `cmdk`
- **Dates:** `date-fns`
- **Hotkeys:** `react-hotkeys-hook`
- **PWA:** `vite-plugin-pwa` with Workbox, `@vite-pwa/assets-generator`
- **Tests:** Vitest 4, `@testing-library/react`, `fake-indexeddb`, `jsdom`
- **Lint/format:** ESLint 10 flat config, Prettier 3 with `prettier-plugin-tailwindcss`
- **Package manager:** pnpm

Paths are aliased: `@` points to `src`. Enforce in `tsconfig` and `vite.config.ts`.

---

## 4. Repository layout

```
src/
  app/              layout shell, router, theme provider, PWA update prompt
  routes/           route components (thin, delegate to features)
  features/         feature modules per domain (forms, repos, schemas)
    accounts/
    categories/
    groups/
    net-worth/
    transactions/
    transfers/
  components/       ui primitives, layout, shared widgets
    ui/             button, field, sheet, segmented, toaster, command-palette
    layout/         app-header, tab-bar, sidebar, page-header, page-transition
    budget/         dashboard helpers, category-inspector, goal-builder
    dashboard/
    transactions/
    illustrations/
  db/               Dexie schema, instance, hooks
  hooks/            reusable hooks (haptics, hotkeys, large-screen, etc.)
  lib/              budget-math, goals, reports, backup, format, dates, cn
  styles/           index.css (tokens) and motion.ts
tests/              Vitest setup + math tests
public/             static assets, PWA icon source
docs/               PRD, UX handoff
```

---

## 5. Data model

All data persists in IndexedDB under database name `moneyger-pwa`, version 2.

### 5.1 TypeScript types

```ts
export type CategoryType = 'expense' | 'sinking_fund';
export type TxnStatus = 'cleared' | 'pending' | 'reconciled';

export type GoalCadence =
  | 'none'
  | 'monthly_funding'
  | 'target_balance'
  | 'target_by_date'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';

export interface Group {
  id: string;
  name: string;
  sortOrder: number;
  isArchived: boolean;
}

export interface Category {
  id: string;
  groupId: string;
  name: string;
  type: CategoryType;
  goalType: GoalCadence;
  goalAmount: number;
  goalDueDate: string | null;       // ISO yyyy-mm-dd
  goalRecurring: boolean | null;
  goalStartMonth: string | null;    // ISO yyyy-mm
  sortOrder: number;
  isArchived: boolean;
}

export interface Account {
  id: string;
  name: string;
  isCreditCard: boolean;
  isArchived: boolean;
}

export interface Transaction {
  id: string;
  date: string;        // ISO yyyy-mm-dd
  outflow: number;     // positive number, mutually exclusive with inflow
  inflow: number;      // positive number
  categoryId: string;  // domain id OR the sentinel 'available_to_budget'
  accountId: string;
  memo: string;
  status: TxnStatus;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}

export interface Transfer {
  id: string;
  date: string;
  amount: number;              // always positive
  fromCategoryId: string;      // domain id OR 'available_to_budget'
  toCategoryId: string;        // domain id OR 'available_to_budget'
  memo: string;
  createdAt: string;
  updatedAt: string;
  syncedAt: string | null;
}

export interface NetWorthEntry {
  id: string;
  date: string;
  amount: number;
  category: string;            // freeform label per row
  type: 'asset' | 'debt';
  notes: string;
}

export interface AutoAssignHistoryEntry {
  id: string;
  appliedAt: string;
  presetId: string;
  scopeMonth: string;          // yyyy-mm
  totalAmount: number;
  moveCount: number;
  transferIds: string[];
  scope: 'all' | 'selected';
  scopedCategoryIds: string[] | null;
  revertedAt: string | null;
}

export interface BudgetNote {
  id: string;
  content: string;
  updatedAt: string;
}

export interface SyncLog {
  id: string;
  entityType: 'transaction' | 'transfer' | 'category' | 'account' | 'group' | 'net_worth';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: unknown;
  createdAt: string;
  syncedAt: string | null;
  error: string | null;
}
```

### 5.2 Dexie schema

- Version 1 stores: `groups`, `categories`, `accounts`, `transactions`, `transfers`, `netWorthEntries`, `syncLogs`
- Version 2 adds: `autoAssignHistory`, `budgetNotes` and backfills `goalRecurring` and `goalStartMonth` on categories

Indexes per store:

- `groups: id, sortOrder, isArchived`
- `categories: id, groupId, sortOrder, isArchived`
- `accounts: id, isArchived`
- `transactions: id, date, categoryId, accountId, status`
- `transfers: id, date, fromCategoryId, toCategoryId`
- `netWorthEntries: id, date, type`
- `syncLogs: id, entityType, syncedAt, createdAt`
- `autoAssignHistory: id, appliedAt, presetId, scopeMonth`
- `budgetNotes: id, updatedAt`

Utilities:

- `newId()` returns `crypto.randomUUID()`
- `nowISO()` returns `new Date().toISOString()`

### 5.3 Sentinel ID

- `AVAILABLE_TO_BUDGET = 'available_to_budget'` is a reserved pseudo-category id. Use it as source or destination in transfers and as `categoryId` on income transactions

---

## 6. Math specification (authoritative)

All math is pure and lives in `src/lib/budget-math.ts`. Currency is stored as numbers. Round to 2 decimals only at render or when persisting auto-assign output.

### 6.1 Category Available (all-time)

```
available(cat) =
    sum(txn.inflow  where categoryId == cat)
  - sum(txn.outflow where categoryId == cat)
  + sum(transfer.amount where toCategoryId   == cat)
  - sum(transfer.amount where fromCategoryId == cat)
```

### 6.2 Category Activity for a month

```
activity(cat, month) =
    sum(txn.outflow where categoryId == cat and date in month)
  - sum(txn.inflow  where categoryId == cat and date in month)
```

Activity is outflow-dominant (spending is a positive activity number).

### 6.3 Category Budgeted for a month

```
budgeted(cat, month) =
    sum(transfer.amount where toCategoryId   == cat and date in month)
  - sum(transfer.amount where fromCategoryId == cat and date in month)
```

### 6.4 Available to Budget (ATB)

Apply the same formula as category Available, using the sentinel id `available_to_budget`.

### 6.5 Account balances

```
accountSettled(acc) =
    sum(txn.inflow  where accountId == acc and status != 'pending')
  - sum(txn.outflow where accountId == acc and status != 'pending')

accountPending(acc) =
    sum(txn.inflow  where accountId == acc and status == 'pending')
  - sum(txn.outflow where accountId == acc and status == 'pending')
```

### 6.6 Goal progress

Return `{ pct, target, needed, perMonth }` clamped to `[0, 1]` for `pct`.

- `monthly_funding`: pct = budgetedThisMonth / goalAmount. needed = max(0, goalAmount - budgetedThisMonth). perMonth = goalAmount
- `target_balance`: pct = availableNow / goalAmount. needed = max(0, goalAmount - availableNow). perMonth = null
- `target_by_date`: monthsRemaining = max(1, diffMonths(dueDate, today) + 1). remaining = max(0, goalAmount - availableNow). perMonth = remaining / monthsRemaining. pct = availableNow / goalAmount
- `none`: return null

Extended cadences (`weekly`, `monthly`, `yearly`, `custom`) live in `src/lib/goals.ts` via `normalizeGoal` and `neededThisMonth`. Mirror the logic there. Legacy `target_balance` normalizes to cadence `none`.

### 6.7 Reports

- **Spending report** groups transactions in a date range by category and by group. Net = outflow - inflow. Sort descending by net
- **Net worth series** walks each month with at least one entry, keeps the latest amount per `(type, category)` pair, and emits `{ month, label, assets, debts, net }` points. The chart needs 2 or more months of data before rendering

### 6.8 Auto-assign presets

Presets produce a list of moves `{ categoryId, amount }`. Positive amount moves from ATB into the category. Negative amount pulls back to ATB. After computing moves, cap total by ATB using `capByATB`. Persist resulting transfers and an `AutoAssignHistoryEntry`. A revert emits opposite-direction transfers and marks `revertedAt`.

Required presets:

- **Fill goals this month:** fund each category up to `neededThisMonth`
- **Fund monthly goals:** only categories with cadence `monthly_funding`
- **Even split across selected:** divide scoped amount evenly
- **Repeat last month:** mirror transfers from the previous month

Scope options:

- `all` active categories
- `selected` subset via `scopedCategoryIds`

---

## 7. Routing

Use `createBrowserRouter`. Every route sits under a single `RootLayout`. Lazy-load heavy routes (budget, accounts, reports, onboarding, settings subpages, dev).

```
/                                Dashboard
/transactions                    Transactions list
/transactions/new                New transaction form
/transactions/:id/edit           Edit transaction form
/budget                          Move Money (transfer form)
/reports                         Reports hub with tabs (Spending, Net Worth)
/accounts                        Accounts list
/accounts/:id                    Account register
/more                            More hub
/settings                        Settings hub
/settings/groups                 Manage groups
/settings/categories             Manage categories
/settings/accounts               Manage accounts
/settings/appearance             Theme preference
/settings/data                   Export / Import / Reset
/onboarding                      First-run welcome
/dev/tokens                      Design token preview (dev only)
/dev/components                  Component gallery (dev only)
/dev/auto-assign                 Auto-assign sandbox (dev only)
*                                Redirect to /
```

### 7.1 Root layout rules

- Read `useIsEmpty()` from `src/db/hooks.ts` (groups + categories + accounts all empty). If `undefined`, render a splash screen
- If empty and the route is not `/onboarding` and not under `/settings`, redirect to `/onboarding`
- If the route is `/onboarding` and the DB is populated and `isOnboardingComplete()` returns true, redirect to `/`
- Hide both `AppHeader` and `TabBar` on `/onboarding`
- On large screens (>= 1024 CSS px), render a persistent left `Sidebar` and hide the mobile `AppHeader`/`TabBar`
- Mount `Toaster`, `CommandPalette`, `ShortcutHelp`, `PwaUpdate`, `InstallPrompt` at root

### 7.2 Bottom tab bar (mobile)

5 equal cells. Labels always visible. Respect bottom safe area.


| Icon              | Label        | Target          |
| ----------------- | ------------ | --------------- |
| `LayoutDashboard` | Dashboard    | `/`             |
| `ListOrdered`     | Transactions | `/transactions` |
| `ArrowLeftRight`  | Budget       | `/budget`       |
| `BarChart3`       | Reports      | `/reports`      |
| `Menu`            | More         | `/more`         |


Active state uses `brand-600` light, `brand-500` dark. Inactive uses `ink-500` light, `ink-400` dark.

---

## 8. Design tokens

Source of truth: `src/styles/index.css`. Tailwind v4 tokens via `@theme`. Dark mode through a `.dark` class on `<html>`.

### 8.1 Color tokens (OKLCH)

```
--color-brand-50   oklch(0.97 0.025 165)
--color-brand-100  oklch(0.94 0.05  165)
--color-brand-500  oklch(0.66 0.14  165)
--color-brand-600  oklch(0.58 0.14  165)
--color-brand-700  oklch(0.50 0.13  165)

--color-ink-50   oklch(0.99 0.003 250)
--color-ink-100  oklch(0.97 0.004 250)
--color-ink-200  oklch(0.92 0.005 250)
--color-ink-300  oklch(0.86 0.006 250)
--color-ink-400  oklch(0.60 0.010 250)
--color-ink-500  oklch(0.55 0.010 250)
--color-ink-700  oklch(0.35 0.012 250)
--color-ink-800  oklch(0.24 0.010 250)
--color-ink-900  oklch(0.16 0.008 250)

--color-danger-500  oklch(0.68 0.20 25)
--color-danger-600  oklch(0.60 0.21 25)
--color-danger-bg   oklch(0.96 0.04 25)

--color-positive     oklch(0.58 0.14 165)
--color-positive-bg  oklch(0.96 0.04 165)
--color-warning      oklch(0.78 0.14 75)
--color-warning-bg   oklch(0.96 0.05 75)
--color-info         oklch(0.65 0.13 245)

--color-bg             oklch(0.99 0.003 250)
--color-surface        #ffffff
--color-surface-2      oklch(0.97 0.004 250)
--color-border         oklch(0.92 0.005 250)
--color-border-strong  oklch(0.86 0.006 250)
--color-fg             oklch(0.16 0.008 250)
--color-fg-muted       oklch(0.55 0.010 250)
--color-fg-subtle      oklch(0.60 0.010 250)

--color-chart-1  oklch(0.58 0.14 165)
--color-chart-2  oklch(0.70 0.15 75)
--color-chart-3  oklch(0.62 0.20 25)
--color-chart-4  oklch(0.55 0.18 295)
--color-chart-5  oklch(0.58 0.10 245)
--color-chart-6  oklch(0.72 0.10 165)
```

Dark mode overrides:

```
.dark {
  --color-bg             oklch(0.16 0.008 250)
  --color-surface        oklch(0.24 0.010 250)
  --color-surface-2      oklch(0.28 0.010 250)
  --color-border         oklch(1 0 0 / 0.10)
  --color-border-strong  oklch(1 0 0 / 0.16)
  --color-fg             oklch(0.95 0.005 250)
  --color-fg-muted       oklch(0.66 0.010 250)
  --color-fg-subtle      oklch(0.54 0.010 250)
  --color-positive-bg    oklch(0.30 0.06 165)
  --color-danger-bg      oklch(0.30 0.07 25)
  --color-warning-bg     oklch(0.32 0.08 75)
}
```

### 8.2 Typography

- Sans: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter Variable', system-ui, sans-serif`
- Mono: `'Geist Mono', ui-monospace, 'SF Mono', monospace`
- Enable `font-feature-settings: 'cv11', 'ss01', 'ss03', 'tnum'` on `html`
- Money always uses tabular numerals
- Heading scale: `text-2xl` hero, `text-lg` page title, `text-base` sheet title, `text-sm` body, `text-xs` meta, `text-[11px]` caps labels and nav

Hero amount utility:

```css
@utility text-amount {
  font-size: 3.5rem;
  line-height: 3.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  font-family: var(--font-mono);
}
```

### 8.3 Radii

- `rounded-lg` (8): small buttons, chips, inputs
- `rounded-xl` (12): cards, list groups, primary buttons
- `rounded-2xl` (16): bottom sheet top corners
- `rounded-full`: FAB, progress bars, pills, drag handle

### 8.4 Shadows (defined on `@theme`)

`--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-fab`, `--shadow-sheet`. Use the brand-tinted FAB shadow on the dashboard FAB.

### 8.5 Safe areas

Provide 4 utilities:

```css
@utility safe-pt { padding-top: max(env(safe-area-inset-top), 0.75rem); }
@utility safe-pb { padding-bottom: max(env(safe-area-inset-bottom), 0.75rem); }
@utility safe-pl { padding-left: max(env(safe-area-inset-left), 1rem); }
@utility safe-pr { padding-right: max(env(safe-area-inset-right), 1rem); }
```

### 8.6 Motion keyframes

- `moneyger-fade-in` 180 ms ease-out
- `moneyger-fade-out` 150 ms ease-in
- `moneyger-slide-up` 220 ms `cubic-bezier(0.32, 0.72, 0, 1)` (sheet enter)
- `moneyger-slide-down` 180 ms `cubic-bezier(0.32, 0.72, 0, 1)` (sheet exit)

Keep everyday transitions under 250 ms. Reusable helpers in `src/styles/motion.ts`.

### 8.7 Focus

`*:focus-visible` gets a 2 px `brand-600` outline with 2 px offset and 4 px radius. No default focus on plain `:focus`.

---

## 9. Global chrome components

### 9.1 AppHeader (mobile sticky top)

- Backdrop-blurred translucent bar
- Left cluster
  - Tiny caps label "Available to Budget" at `text-[11px]`
  - Large tabular number at `text-2xl font-semibold` below
- ATB number color
  - Positive: `brand-600` light, `brand-500` dark
  - Zero: `ink-700` light, `ink-200` dark
  - Negative: `danger-600` light, `danger-500` dark
  - Loading: `ink-400` with placeholder `--`
- No right-side actions in v1

### 9.2 Sidebar (desktop only)

- Persistent left nav on `min-width: 1024px`
- Same 5 destinations as the tab bar plus Settings
- Collapsible state stored in `localStorage` (`moneyger:sidebar.collapsed`)
- Shows ATB value at the top

### 9.3 PageHeader (in-screen)

- Layout: `[< back]   Title   [action slot]`
- Back uses `ChevronLeft`. If `backTo` prop is set, navigate to it. Otherwise call `history.back()`
- Title is `text-lg font-semibold`
- Action slot accepts any node (New button, Delete ghost button, etc.)

### 9.4 FloatingAdd (Dashboard only)

- 56 px circular. Bottom-right. `brand-600` background. White `Plus` icon
- `shadow-fab`
- Offset by safe-area plus tab bar height
- `aria-label="New transaction"`

---

## 10. Shared UI primitives

Build these under `src/components/ui/` and keep them unstyled-at-rest friendly. All must pass WCAG AA contrast in both themes.

### 10.1 Button

Variants: `primary`, `secondary`, `ghost`, `danger`. Sizes: `md` (48 h, `rounded-xl`, semibold), `sm` (36 h, `rounded-lg`, medium). Active-state background shift. No hover treatments on touch. Disabled at 50 percent opacity.

### 10.2 Segmented control

Grid of 2 to 4 equal cells, `h-11`, rounded container with border. Active cell is `brand-600` on white. Used for Outflow/Inflow, Expense/Sinking fund, date presets, and grouping toggle.

### 10.3 Field (form wrapper)

Label above the control. Error text below. Optional hint text. Shared input class. Errors in `danger-600`. Hints in `ink-500`.

### 10.4 MoneyInput

Text input with `inputmode="decimal"`, tabular numerals. Accepts strings. Parse on submit via `src/lib/expression.ts` which supports `+`, `-`, `*`, `/` and parentheses.

### 10.5 Sheet (bottom sheet)

- Radix Dialog styled as rounded-top sheet
- Overlay `bg-black/50`
- Slides up and down. Drag-handle pill at top (`h-1 w-10`)
- Optional title and description
- Scrollable content area
- Used for category detail, add/edit forms, filters, net worth entry, category picker

### 10.6 SwipeRow

- Horizontal left drag reveals a red Delete button (88 px wide)
- Snap open past 44 px. Snap closed below
- Emits a deferred delete with a 5-second undo via `sonner`
- Used on transactions, account register, categories, groups, accounts, net worth entries

### 10.7 CategoryPicker

- Full-width button opens a bottom sheet of rows grouped by group
- Optional pseudo-row "Available to Budget" (controlled by `includeAvailableToBudget` prop)
- Keyboard and VoiceOver friendly

### 10.8 MonthNav

- 3-column row: left chevron, center pill with calendar icon and month label, right chevron
- Center pill jumps back to the current month. Disabled when already current
- Used on Dashboard. Exposed as a shared hook for Reports and Transactions in later phases

### 10.9 ProgressBar

- 4 px tall, `rounded-full`, track `ink-200` light / `ink-700` dark
- Fill `brand-500` for goal progress, `danger-500` for overspent variants

### 10.10 Stat card

- Used inside the category sheet in a 3-up grid: Available, Activity, Budgeted
- Each stat has a caps label plus a bold tabular number on `ink-100` / `ink-800` tinted background

### 10.11 Toaster

Mount the `sonner` Toaster at root. Success toasts are neutral. Error toasts use danger color. Swipe-to-delete emits a toast with an Undo action for 5 seconds.

### 10.12 CommandPalette

`cmdk` palette triggered by `Cmd+K` or `Ctrl+K`. Lists top destinations, recent transactions, and actions (New transaction, Move money, Export backup).

### 10.13 ShortcutHelp

Sheet listing all hotkeys. Triggered by `?`.

---

## 11. Screens

Each entry lists purpose, layout, affordances, states, and edge cases.

### 11.1 Onboarding (`/onboarding`)

- **Purpose:** first-run welcome shown when groups, categories, and accounts are all empty
- **Layout:** full height. Top heading block. 4-step numbered card list. Bottom-pinned primary CTA
- **Copy:**
  - H1 "Welcome to Moneyger"
  - Sub: explain zero-based envelope budgeting in two sentences
  - Steps: Create a group - Add categories - Add an account - Record income
- **Actions:** Primary button "Get started in Settings" navigates to `/settings/groups`. Call `markOnboardingComplete()` when the user leaves this screen with data present
- **States:** single state
- **Edge case:** if the user visits `/onboarding` after populating data and completing it, the root layout redirects to `/`

### 11.2 Dashboard (`/`)

- **Purpose:** scan all categories, pick one to act on
- **Layout:**
  1. MonthNav row at the top
  2. For each group: caps label, then a rounded card containing category rows
  3. Floating add button bottom-right
  4. Bottom sheet opens when a row is tapped
- **Row content:**
  - Left: category name (1 line truncated)
  - Under name: goal progress bar if a goal is set
  - Right: Available amount in tabular numerals
    - Negative: `danger-600`
    - Zero: `ink-400`
    - Positive: default fg
- **Category detail sheet:**
  - Title = category name
  - 3-up stats: Available, Activity (viewed month), Budgeted (viewed month)
  - Goal card (when set): target amount, progress bar, "X needed per month" hint when applicable
  - Two actions: "Move money" to `/budget`, "New transaction" to `/transactions/new`
- **FAB:** opens `/transactions/new`
- **States:**
  - Loading: inline "Loading..." line
  - Empty (no groups): inline card linking to `/settings/groups`
  - Empty group: greyed "No categories" row inside the group card
- **Edge cases:**
  - Month navigation only affects Activity, Budgeted, goal math. Available is all-time by design
  - ATB in the header is all-time regardless of viewed month

### 11.3 Transactions list (`/transactions`)

- **Purpose:** browse and edit transactions
- **Layout:**
  - PageHeader with right-side "New" button
  - Filters toggle chip with filter icon and active count
  - Collapsible filter panel (account select, category select, from/to date, Clear filters)
  - Date-grouped list. Date header format "Thu, Apr 16, 2026"
- **Row:**
  - Main line: category name or "Available to Budget"
  - Sub line: account name, optional memo, "Pending" chip when status is pending
  - Amount right-aligned, tabular
    - Inflow: `+$X` in `brand-600`
    - Outflow: `-$X` default fg
  - Whole row is a Link to `/transactions/:id/edit`
  - Swipe left to delete with undo toast
- **States:** loading, empty, empty after filter

### 11.4 Transaction form (`/transactions/new`, `/transactions/:id/edit`)

- **Purpose:** create or edit a transaction
- **Top to bottom:**
  1. PageHeader "New transaction" or "Edit transaction". Edit variant has a Delete ghost button in the action slot
  2. Outflow / Inflow segmented control (required)
  3. Amount via MoneyInput (supports arithmetic expressions)
  4. Date (native date input, defaults to today)
  5. Account select
  6. Category via CategoryPicker with ATB pseudo-row. Hint under field when direction is Inflow: "Income typically goes to Available to Budget."
  7. Status select: Cleared, Pending, Reconciled (default Cleared)
  8. Memo text input
  9. Full-width submit: "Save" or "Create"
- **Validation (Zod):** direction required, amount > 0, account required, category required, date valid ISO
- **Behavior:**
  - On success call `navigate(-1)`
  - Delete prompts a themed confirmation sheet (not native confirm)
- **Edge cases:** cached "last used account" via a hook so new forms pre-fill

### 11.5 Move Money (`/budget`)

- **Purpose:** transfer dollars between ATB and categories or between two categories. No account impact
- **Layout:**
  1. PageHeader "Move Money"
  2. Helper paragraph
  3. From category (CategoryPicker, defaults to ATB). Sub-hint "Available: $X" reflects the source balance
  4. To category (CategoryPicker)
  5. Amount via MoneyInput
  6. Date (defaults today)
  7. Memo
  8. Submit "Move money"
- **Validation:** From and To differ. Amount > 0
- **Behavior:** on success navigate to `/` with `replace: true`

### 11.6 Accounts list (`/accounts`)

- **Purpose:** see each account's settled balance
- **Layout:**
  - PageHeader with `backTo="/more"`
  - Rounded card list. Row: account name, type label (Cash or Credit card), optional "Pending $X" sub line. Right: settled balance, chevron
  - Tap row opens `/accounts/:id`
- **States:** loading, empty links to `/settings/accounts`

### 11.7 Account register (`/accounts/:id`)

- **Purpose:** transaction history for an account with a running balance
- **Layout:**
  - PageHeader shows the account name
  - Rows sorted newest first. Row shows category name on top, date and memo on the sub line, amount right-aligned with running balance in small grey text below
  - Swipe left to delete. Tap row to edit
- **Edge case:** unknown account id redirects to `/accounts`

### 11.8 Reports - Spending tab (`/reports`)

- **Purpose:** see where money went in a chosen range
- **Layout:**
  - PageHeader "Reports"
  - Radix Tabs with two buttons: Spending, Net Worth. Active tab gets `brand-600` background
  - Preset row: 4 equal cells (This month, Last month, This year, Custom)
  - Custom: two native date pickers (From, To)
  - Summary card: caps label "Net spent", big tabular number, "Out X - In Y" sub line
  - Grouping toggle: By category, By group (2-cell segmented)
  - Row list sorted by net descending. Row label + net amount + horizontal bar width relative to max in the list
- **Color semantics:** outflow-dominant rows use `danger-500` bar. Inflow-dominant rows use `brand-500` bar. Match money tints (red for outflow, green for inflow) - this differs from the legacy inversion noted in `docs/ux-handoff.md` section 15

### 11.9 Reports - Net Worth tab

- **Purpose:** track net worth over time
- **Layout:**
  - Summary card: "Latest net worth" caps label, big number, "Assets X - Debts Y" sub line
  - Recharts `LineChart` with 3 series (Net in `chart-1` green, Assets in `chart-5` blue, Debts in `chart-3` red). X axis month labels "Apr 26". Y axis compact formatter (1.2M, 50k)
  - Entries header with caps label and "Add entry" button
  - Entries list: label, date, type chip, optional note, amount. Debts render as `-$X` in `danger-600`. Swipe to delete
  - Add-entry sheet: Date, Type (select Asset or Debt), Label, Amount, Notes
- **States:** requires >= 2 months of entries to render the chart. Below that show "Log at least two months of entries to see the chart."

### 11.10 More (`/more`)

Simple card list with two rows: Accounts, Settings. Room for About, Help, and Feedback later.

### 11.11 Settings (`/settings`)

Two sections of rounded card lists.

- Budget: Groups (count), Categories (count), Accounts (count)
- App: Appearance (current preference), Data

### 11.12 Settings > Groups (`/settings/groups`)

- Add group inline input at top
- Row supports inline rename
- Swipe left to archive. Archiving a group cascades `isArchived = true` onto its categories

### 11.13 Settings > Categories (`/settings/categories`)

- Grouped by group
- Each group has an Add button
- Row sub line like "Expense - Monthly - $500"
- Add/Edit sheet fields:
  - Name
  - Type segmented: Expense, Sinking fund
  - Goal select: None, Monthly funding, Target balance, Target by date
  - If goal is set: Goal amount
  - If goal is target_by_date: Due date
  - Cancel / Save
- Validation: name required, goal amount > 0 when goal is set, due date required for `target_by_date`
- Archive via swipe

### 11.14 Settings > Accounts (`/settings/accounts`)

- Add form: Name + `isCreditCard` checkbox
- Swipe to archive

### 11.15 Settings > Appearance (`/settings/appearance`)

- 3-option list: System, Light, Dark. Selected row shows `Check` icon and `brand-600` text
- Preference persisted in `localStorage` under `moneyger:theme`. Class `.dark` applied to `<html>` pre-hydration via an inline script to avoid flash

### 11.16 Settings > Data (`/settings/data`)

- **Export:** "Export backup" primary button downloads a JSON file named `moneyger-backup-YYYY-MM-DD.json`
- **Import:** two secondary buttons (Merge, Replace). Same JSON shape as export
- **Reset:** danger button with themed confirmation sheet

---

## 12. First-run flow and onboarding state

- `useIsEmpty()` subscribes to `groups`, `categories`, `accounts` counts and returns `true` when all three are empty, `false` otherwise, `undefined` while loading
- Global redirect: empty DB and not on `/onboarding` or `/settings/`* forces `/onboarding`
- `localStorage` key `moneyger:onboarding.complete` tracks completion. Set to `'1'` when the user leaves onboarding with data present
- A guided 3-step inline form (create first group, first category, first account) is the preferred polish path. The minimum viable onboarding is the text welcome screen plus the CTA

---

## 13. Backup and restore

Version 1 JSON schema:

```json
{
  "version": 1,
  "exportedAt": "2026-04-20T12:00:00Z",
  "data": {
    "groups": [],
    "categories": [],
    "accounts": [],
    "transactions": [],
    "transfers": [],
    "netWorthEntries": []
  }
}
```

- `exportBackup()` reads all tables and returns the object
- `downloadBackup(backup)` triggers a blob download
- `importBackup(file, mode)` parses, coerces, and in a single Dexie transaction either `clear()` all target tables (replace) or leaves them (merge), then `bulkPut` every collection
- `resetAllData()` clears every domain table plus `syncLogs` in one transaction
- `coerceBackup` validates version and the presence of each array. Throws with a human-readable message otherwise

---

## 14. Hotkeys

Use `react-hotkeys-hook`. Register globally via `useAppHotkeys`.

- `g d` go to Dashboard
- `g t` go to Transactions
- `g b` go to Budget
- `g r` go to Reports
- `g m` go to More
- `n` new transaction
- `m` move money
- `Cmd+K` or `Ctrl+K` open command palette
- `?` open shortcut help

Show the shortcut cheat sheet in the sidebar footer on desktop.

---

## 15. Accessibility and input rules

- Every icon-only button has an `aria-label`
- Focus is visible via the `focus-visible` token defined in section 8.7
- Minimum tap target 44 by 44 CSS px. Preferred 48 px
- Money inputs use `inputmode="decimal"` to force the numeric keypad
- Dates and selects stay native for platform keyboard support
- Chart data exposes a text summary in an `aria-live` region

---

## 16. Performance budget

- Lighthouse PWA score >= 95
- Main JS chunk <= 100 KB gzipped
- Charts lazy-loaded per route
- Manual chunks in `vite.config.ts` split `recharts`, `motion`, `react-router`, `dexie`, `@radix-ui`, `react-hook-form + zod`, `cmdk`, `sonner`, `@use-gesture`, `date-fns`
- Dexie hydration usually completes under 100 ms

---

## 17. PWA configuration

`vite-plugin-pwa` with:

- `registerType: 'prompt'`
- Include `favicon.svg` and `apple-touch-icon-180x180.png`
- Manifest name `Moneyger`, short name `Moneyger`, description `Zero-based envelope budgeting, offline-first.`, `theme_color` `#0f172a`, `background_color` `#0f172a`, `display: standalone`, `orientation: portrait`, categories `['finance', 'productivity']`
- Icons: 192x192, 512x512, and a 512x512 maskable
- Shortcuts: New transaction (`/transactions/new`), Move money (`/budget`), Transactions (`/transactions`)
- Workbox glob `**/*.{js,css,html,svg,png,ico}`
- Dev options enabled with `type: 'module'`

Apply iOS PWA meta tags in `index.html`:

- `apple-mobile-web-app-capable`
- `apple-mobile-web-app-status-bar-style="black-translucent"`
- `viewport-fit=cover`

---

## 18. Testing

- Place Vitest config at `vitest.config.ts`. Use `jsdom`
- Setup file installs `fake-indexeddb/auto` and `@testing-library/jest-dom`
- Required test suites:
  - `tests/budget-math.test.ts` covers every formula in section 6
  - `src/lib/goals.test.ts` covers every cadence in `normalizeGoal` and `neededThisMonth`
  - `src/lib/auto-assign.test.ts` covers each preset end to end, including revert
  - Optional perf test: `src/lib/auto-assign.perf.test.ts` seeds 500 categories and asserts total compute < 50 ms
- Run via `pnpm test` (watch) and `pnpm test:run` (CI)

---

## 19. Build, lint, format

Scripts in `package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:run": "vitest run",
  "lint": "eslint .",
  "format": "prettier --write .",
  "pwa-assets": "pwa-assets-generator --preset minimal-2023 public/icon-source.svg"
}
```

- ESLint flat config. Include `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- Prettier config: single quotes, trailing commas, no semicolons disabled (keep semicolons in code), plus `prettier-plugin-tailwindcss`
- TypeScript strict mode on. Project references in `tsconfig.json` pointing to `tsconfig.app.json` and `tsconfig.node.json`
- Node version pinned via `.nvmrc`

---

## 20. Deployment

- Netlify single-page app. `netlify.toml` should redirect all paths to `index.html` so React Router owns routing
- Build command `pnpm build`. Publish directory `dist`
- No environment variables required in v1

---

## 21. Out of scope for v1 (do not build)

- Bank sync or account aggregation
- Multi-currency and FX
- Bill reminders and local notifications
- Shared budgets and collaboration
- Reports beyond Spending and Net Worth
- Transfers between accounts (only between categories in v1)
- Photo attachments or receipts
- Tags, labels, projects
- Google Sheets sync (planned for a later phase)

---

## 22. Acceptance criteria (build is done when)

- Fresh install redirects to `/onboarding`, renders the welcome screen, and routes to `/settings/groups` on CTA
- Creating one group, one category, and one account exits the empty state
- Logging an Inflow against ATB raises the header value in real time
- Moving money from ATB to a category via `/budget` lowers ATB and raises the category's Available and Budgeted for the current month
- Logging an Outflow against a funded category lowers its Available and raises its Activity for the current month
- Dashboard MonthNav changes do not affect ATB or Available but do affect Activity, Budgeted, and goal math
- Swipe-to-delete shows a 5-second Undo toast
- Export produces a v1 JSON file. Import merge and replace both restore identical state
- Reset clears all domain tables and the app returns to onboarding
- Dark mode toggle applies without a flash on reload
- Bottom tab bar respects the iOS home bar. AppHeader respects the notch. PWA installs to the iOS home screen and opens in standalone mode
- `pnpm test:run` passes. `pnpm build` succeeds with no TypeScript errors. Lighthouse PWA score >= 95 on the preview server

---

## 23. Build order recommendation

1. Bootstrap Vite + React + TS + Tailwind v4 + ESLint + Prettier + Vitest
2. Add Dexie with schema v1 and `useLiveQuery` hooks (`useIsEmpty`, `useCategoriesWithAvailability`, etc.)
3. Implement `src/lib/budget-math.ts` with full unit tests
4. Build `AppHeader`, `TabBar`, `PageHeader`, `RootLayout`, router skeleton
5. Ship settings first: Groups, Categories, Accounts. This lets the app exit empty state
6. Build Onboarding and the empty-state redirects
7. Ship the transaction form, then the list, then the account register
8. Ship Move Money
9. Ship the Dashboard with MonthNav, category rows, detail sheet, FAB
10. Ship Reports (Spending, then Net Worth)
11. Ship Data (export, import, reset) and Appearance
12. Add PWA manifest, service worker, iOS meta, offline verification
13. Add Command palette, hotkeys, toasts, undo on delete
14. Add auto-assign presets, history, and revert
15. Add desktop Sidebar and large-screen adjustments
16. Perf pass: manual chunks, lazy routes, Lighthouse audit

---

End of PRD.

#@#