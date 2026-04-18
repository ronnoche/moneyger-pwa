# Aspire Budget PWA - UX/UI Handoff

Single-source brief for the AI Product Designer. Covers what the app is, who it serves, how it behaves, and every screen's affordances, actions, and states. Use it to redesign the UI/UX without reading source code.

---

## 1. Product snapshot

- **Name:** Aspire Budget PWA
- **Category:** Personal finance, zero-based envelope budgeting
- **Platform:** Installable PWA, mobile-first, iOS home-screen priority. Also works on desktop as a responsive single-column web app
- **Offline:** Fully offline. All data lives locally in IndexedDB (Dexie). No auth, no accounts, no cloud
- **Inspiration:** Aspire Budgeting v4.0 Google Sheet. The methodology and math must not drift
- **Current status:** Phase 3 complete. Core CRUD, dashboard with month navigation, reports, net worth, backup/restore, theme toggle

### Mental model the user holds

1. Income lands in a pool called **Available to Budget** (ATB)
2. The user **moves money** from ATB into **categories** (envelopes)
3. Spending from a category drives its **Available** balance down
4. Categories live inside **groups** (Monthly Bills, Savings, Discretionary)
5. Every category can have a **goal** that shows progress

### Success feel

- "Boring calm and trustworthy." Numbers should be unmistakable. The user should never fear pressing a button
- Native on iOS: large tap targets, safe-area respect, bottom sheets over modal dialogs, swipe to delete
- Zero onboarding noise. One screen explains the idea, then the user builds their own structure

---

## 2. Users and context

- Primary: self-taught budgeters migrating from the Aspire Google Sheet. Comfortable with envelope budgeting, hate spreadsheets on mobile
- Secondary: new budgeters. They get the 4-step onboarding
- Context: checking phone mid-checkout, 10 seconds to log a transaction. Assume one-handed use

---

## 3. Design constraints


| Area          | Constraint                                                                                                             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Screen width  | Optimize for 360-414 CSS px. Max content width `max-w-xl` (576 px)                                                     |
| Touch targets | Minimum 44x44 CSS px, preferred 48 px                                                                                  |
| Safe areas    | `env(safe-area-inset-*)` respected top and bottom (notch and home bar)                                                 |
| Input         | Numeric keyboards for money (`inputmode="decimal"`), native date pickers                                               |
| Offline       | No loading spinners from network. "Loading" is only Dexie hydration, usually sub-100 ms                                |
| Performance   | Lighthouse PWA >= 95, main JS chunk <= 100 KB gz, charts lazy per route                                                |
| Accessibility | WCAG AA contrast, visible focus, `aria-label` on icon-only buttons                                                     |
| iOS quirks    | `overscroll-behavior-y: none` on root, `-webkit-tap-highlight-color: transparent`, `apple-mobile-web-app-capable` meta |


---

## 4. Tech surface (what the designer can assume)

- React 19 + TypeScript
- Tailwind CSS v4 with a custom `@theme` token set (see section 5)
- Radix UI primitives: Dialog (used as bottom sheet), Tabs, Dropdown Menu
- Lucide icons (line icons, 20-22 px typical)
- Recharts for the net-worth line chart
- React Hook Form + Zod for forms
- Dexie for data
- Date handling via `date-fns`

Design can assume any Tailwind utility, custom CSS keyframes, and Lucide icons. Avoid proprietary assets unless the designer provides SVG.

---

## 5. Current brand and token inventory

Tokens are defined in `src/styles/index.css`. Treat them as the baseline. The designer should either re-skin these tokens or propose a full new palette with semantic mappings.

### Color tokens (current)


| Token        | Hex       | Used for                                         |
| ------------ | --------- | ------------------------------------------------ |
| `brand-50`   | `#f0fdf4` | Not in use yet, reserved                         |
| `brand-500`  | `#22c55e` | Progress bar fill, net-worth net line            |
| `brand-600`  | `#16a34a` | Primary button, active nav, money positive, FAB  |
| `brand-700`  | `#15803d` | Primary button pressed state                     |
| `ink-50`     | `#f8fafc` | App background (light)                           |
| `ink-100`    | `#f1f5f9` | Row pressed state, stat cards                    |
| `ink-200`    | `#e2e8f0` | Borders, dividers, progress track                |
| `ink-400`    | `#94a3b8` | Zero-amount text, chevrons                       |
| `ink-500`    | `#64748b` | Labels, secondary text                           |
| `ink-700`    | `#334155` | Strong secondary text, ghost button text         |
| `ink-800`    | `#1e293b` | Card background (dark mode)                      |
| `ink-900`    | `#0f172a` | Body text (light), background (dark)             |
| `danger-500` | `#ef4444` | Danger button pressed                            |
| `danger-600` | `#dc2626` | Negative money, destructive swipe action, errors |


### Typography

- Font stack: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif`
- Money is always `font-variant-numeric: tabular-nums`
- Heading scale in use: `text-2xl` (ATB, hero), `text-lg` (page title on Onboarding), `text-base` (sheet title), `text-sm` (body), `text-xs` (meta), `text-[11px]` (caps labels, nav text)

### Radii

- `rounded-lg` (8 px): small buttons, filter chips, form inputs
- `rounded-xl` (12 px): cards, list groups, primary buttons
- `rounded-2xl` (16 px): top corners of bottom sheets
- `rounded-full`: FAB, progress bars, swipe drag handle, step badges

### Elevation

- Cards use `shadow-sm` over `bg-white / dark:bg-ink-800`
- FAB uses `shadow-lg`
- Header uses `backdrop-blur` + translucent bg, sticky
- Tab bar uses `backdrop-blur` + translucent bg, fixed

### Motion (keyframes defined in CSS)

- `aspire-fade-in` 180 ms ease-out
- `aspire-fade-out` 150 ms ease-in
- `aspire-slide-up` 220 ms `cubic-bezier(0.32, 0.72, 0, 1)` (used for sheet enter)
- `aspire-slide-down` 180 ms same easing (sheet exit)

The designer may propose new motion tokens but should keep durations <= 250 ms for everyday transitions to stay iOS-native feeling.

---

## 6. Information architecture

### Route map

```
/                                Dashboard                       (Tab: Dashboard)
/transactions                    Transactions list               (Tab: Transactions)
/transactions/new                New transaction form
/transactions/:id/edit           Edit transaction form
/budget                          Move Money (transfer form)      (Tab: Budget)
/reports                         Reports (tabs: Spending, Net Worth)  (Tab: Reports)
/accounts                        Accounts list
/accounts/:id                    Account register
/more                            More hub                        (Tab: More)
/settings                        Settings hub
/settings/groups                 Manage groups
/settings/categories             Manage categories
/settings/accounts               Manage accounts
/settings/appearance             Theme toggle
/settings/data                   Export / Import / Reset
/onboarding                      First-run welcome (shown when DB empty)
*                                Redirect to /
```

### Primary navigation (bottom tab bar, 5 tabs)


| Icon              | Label        | Target          | Notes                     |
| ----------------- | ------------ | --------------- | ------------------------- |
| `LayoutDashboard` | Dashboard    | `/`             | Default                   |
| `ListOrdered`     | Transactions | `/transactions` |                           |
| `ArrowLeftRight`  | Budget       | `/budget`       | Move Money screen         |
| `BarChart3`       | Reports      | `/reports`      |                           |
| `Menu`            | More         | `/more`         | Holds Accounts + Settings |


Tab bar is fixed, full-width, `h-14` rows, 11 px labels stacked under 22 px icons. Active tab uses `brand-600` (light) or `brand-500` (dark). Inactive uses `ink-500` / `ink-400`.

### Secondary navigation

- **Header:** sticky, displays ATB label + value, no title. No back button here. Acts as persistent balance readout, not chrome
- **Page headers:** in-screen `PageHeader` component (back button + title + optional action). Used on all non-tab pages (forms, registers, settings detail, reports)

### Chrome visibility rules

- `/onboarding` hides both header and tab bar (fullscreen welcome)
- All other routes show header + tab bar

---

## 7. Domain vocabulary and what the user should see

The designer must preserve these terms exactly. They map to Aspire's spreadsheet conventions.


| Concept               | UI label                                                         | Meaning                                                                          |
| --------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Available to Budget   | "Available to Budget"                                            | Unallocated pool. Income lands here. Shown in header                             |
| Group                 | "Group"                                                          | Folder for categories. E.g. "Monthly Bills"                                      |
| Category              | "Category"                                                       | Envelope. Has a balance, optional goal                                           |
| Category type         | "Expense" or "Sinking fund"                                      | Sinking fund accumulates toward a goal; expense is monthly spend                 |
| Account               | "Account"                                                        | Where money physically lives (checking, savings, credit card)                    |
| Transaction           | "Transaction"                                                    | Money in or out of an account                                                    |
| Direction             | "Outflow" / "Inflow"                                             | Segmented control on transaction form                                            |
| Transfer (move money) | "Move Money"                                                     | Reallocates dollars between ATB and categories. Does not change account balances |
| Goal types            | "Monthly funding" / "Target balance" / "Target by date" / "None" | How a category's goal is evaluated                                               |
| Status                | "Cleared" / "Pending" / "Reconciled"                             | Transaction status. Pending separates settled vs pending balances on accounts    |
| Net worth entry       | "Asset" or "Debt"                                                | Manual monthly-ish snapshot items                                                |
| Activity              | "Activity"                                                       | Sum of a category's outflows minus inflows in the viewed month                   |
| Budgeted              | "Budgeted"                                                       | Sum of transfers into the category in the viewed month                           |
| Available             | "Available"                                                      | All-time category balance (budgeted + inflows - outflows)                        |


The word **Budget** is overloaded: the tab opens Move Money. Consider this when renaming labels.

---

## 8. Global chrome components

### AppHeader (sticky top)

- Full-width bar with `backdrop-blur`, translucent background
- Left cluster:
  - Tiny uppercase label "Available to Budget" (`text-[11px]`, letter-spaced)
  - Large tabular number below (`text-2xl`, semibold)
- **Color rules for ATB number:**
  - Positive -> `brand-600` (light) / `brand-500` (dark)
  - Zero -> neutral `ink-700` / `ink-200`
  - Negative -> `danger-600` / `danger-500`
  - Loading -> `ink-400` placeholder `--`
- No right-side actions yet. Design opportunity: add a month selector or a notification pip

### TabBar (fixed bottom)

- 5 equal-width cells, labels always visible
- Icon on top, label under. Stroke width 2
- Active state: color change only. No pill, no indicator bar. The designer can propose a more expressive active state as long as it stays subtle
- Respects bottom safe area via `safe-pb`

### PageHeader (in-screen)

- Layout: `[< back]   Title   [action slot]`
- Back button uses `ChevronLeft`, navigates to prop `backTo` or `history.back()`
- Action slot accepts any node; commonly a "New" button or a "Delete" ghost button
- Title is `text-lg font-semibold`

### FloatingAdd (Dashboard only)

- 56 px circular button, bottom-right, `brand-600` bg, white `Plus` icon
- Offset by safe-area + tab bar height
- Hit target is fully circular

---

## 9. Shared components (design system primitives)

### Button

Variants: `primary`, `secondary`, `ghost`, `danger`. Sizes: `md` (48 h, rounded-xl, semibold), `sm` (36 h, rounded-lg, medium). All include active-state background shift, no hover effects on mobile. Disabled reduces opacity to 50.

### Segmented control

Grid of 2-4 equal cells, `h-11`, rounded container with border, active cell is `brand-600` + white. Used for:

- Outflow / Inflow on transaction form
- Expense / Sinking fund on category form
- Date range presets on Spending (4 cells)
- By category / By group (2 cells)
- Theme preference (list style, not segmented, but similar semantics)

### Field (form field wrapper)

Each field renders a label above the control, error text below, optional hint text. Inputs use `inputClass` shared utility. Errors are `danger-600`. Hints are `ink-500`.

### MoneyInput

Text input with `inputmode="decimal"`, tabular numerals, right-aligned is NOT currently used but could be considered. Accepts strings; parsing happens on submit.

### Sheet (bottom sheet)

- Radix Dialog styled as rounded-top bottom sheet
- Covers overlay at `bg-black/50`
- Slides up / down. Drag-handle visual at top (`h-1 w-10` pill)
- Optional title and description
- Content area is scrollable if tall
- Used for: category detail (from dashboard row), add/edit category form, filters sheet (not yet), add net worth entry, category picker (via nested sheet)

### SwipeRow

- Horizontal swipe-left on a list row reveals a red delete button (88 px wide)
- Threshold: swipe past 44 px to "stick" open. Tap the revealed button to confirm
- No Undo toast yet (design opportunity)
- Used on: transactions list, account register, categories list, groups list, accounts list, net worth entries list

### CategoryPicker

- Full-width button that opens a bottom sheet of selectable rows
- Includes a special **"Available to Budget"** pseudo-row when `includeAvailableToBudget` is true
- Groups the categories under their group name
- Currently no search box. Design opportunity: add one when list gets long

### MonthNav (dashboard only so far)

- 3-column row: left chevron, center pill with calendar icon and month label, right chevron
- Tap center pill to jump back to current month when viewing another month. Disabled when already current
- Only controls the dashboard view for now. The designer should consider propagating this to Transactions and Reports for consistency

### ProgressBar

- 4 px tall track, rounded full
- Fill is `brand-500` (goal progress) or `danger-500` (overspent variants in spending rows)
- No text overlay; target amount shown separately

### Stat card (small)

- 3-up grid inside the category sheet: Available, Activity, Budgeted
- Each stat: tiny caps label + bold tabular number, on `ink-100` / `ink-800` tinted background

---

## 10. Gestures and motion inventory


| Gesture                | Where                                         | Behavior                                                         |
| ---------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| Tap                    | Everywhere                                    | Standard                                                         |
| Horizontal drag left   | List rows with `SwipeRow`                     | Reveals delete action. Snap open at threshold, snap closed below |
| Tap outside sheet      | Any open Sheet                                | Dismiss                                                          |
| Pull down inside sheet | Not implemented                               | Design opportunity: pull-to-dismiss                              |
| Pull to refresh        | Not implemented and not needed (offline data) | Skip                                                             |
| Long press             | Not used                                      | Design opportunity for reorder                                   |


---

## 11. Screen catalog

Each entry documents: purpose, when user lands here, key info displayed, affordances, actions, states, and edge cases.

### 11.1 Onboarding (`/onboarding`)

- **Purpose:** First-run welcome. Shown automatically when groups, categories, and accounts are all empty
- **Layout:** Full-height, top-aligned heading block, bottom-pinned primary CTA
- **Content:**
  - H1 "Welcome to Aspire"
  - Subcopy explaining zero-based envelope budgeting
  - Numbered 4-step list (cards): Create a group -> Add categories -> Add an account -> Record income
- **Affordances:**
  - Primary button "Get started in Settings" navigates to `/settings/groups`
- **States:** Single state. No loading or error
- **Edge cases:** If user manually visits `/onboarding` after having data, it still renders (no redirect). Consider redirecting to `/` when data exists
- **Design opportunity:** Add illustrations, soft gradient background, personality without compromising clarity

### 11.2 Dashboard (`/`)

- **Purpose:** Scan all categories, pick one to act on
- **Layout:**
  1. MonthNav row
  2. For each group: caps label, then rounded card containing rows of categories
  3. Floating add button at bottom-right
  4. Bottom sheet appears when a category row is tapped
- **Category row:**
  - Left: category name (1 line truncated)
  - Under the name: goal progress bar (only if goal set)
  - Right: **Available** amount, tabular numerals. Color rules:
    - Negative -> `danger-600`
    - Zero -> `ink-400`
    - Positive -> neutral text color
- **Category detail sheet (opened by tapping row):**
  - Title: category name
  - 3-up stats: Available, Activity (viewed month), Budgeted (viewed month)
  - Goal card (if goal set): target amount, progress bar, "X needed per month" hint when relevant
  - Two actions: "Move money" (to `/budget`) and "New transaction" (to `/transactions/new`)
- **Affordances:**
  - MonthNav chevrons and center pill
  - Entire category row is tappable
  - FAB for "New transaction"
  - Sheet close via drag handle, tap outside, or Escape
- **States:**
  - Loading: `Loading...` line
  - Empty (no groups): inline card linking to `/settings/groups`
  - Empty group (no categories): grey "No categories" row inside the group card
- **Edge cases:**
  - Month navigation only affects Activity + Budgeted + goal math; Available stays all-time by design
  - ATB in header is all-time regardless of month
- **Design opportunity:** Dashboard currently has no summary strip besides the header. Consider a hero stat card (month income, month spent, month saved) or a compact totals band under MonthNav

### 11.3 Transactions list (`/transactions`)

- **Purpose:** Browse and edit all transactions
- **Layout:**
  - PageHeader with right-side "New" button
  - Filters toggle button (chip with filter icon and active count)
  - Collapsible filter panel (account select, category select, from/to date, Clear filters button)
  - Date-grouped list. Header is "Thu, Apr 16, 2026" style. Each row inside a rounded card
- **Row:**
  - Main line: category name (or "Available to Budget")
  - Sub line: account name, optional memo, "Pending" chip if status is pending
  - Amount right-aligned, tabular. Inflow shows `+$X` in `brand-600`, outflow shows `-$X` in neutral
  - Entire row is a Link to `/transactions/:id/edit`
  - Swipe left to delete
- **States:**
  - Loading
  - Empty: "No transactions yet." when no records exist
  - Empty after filter: same copy; design opportunity to differentiate
- **Design opportunity:**
  - Filter panel is inline and a bit heavy. Could become a bottom sheet
  - Consider a running "Month spent" summary at the top
  - Add search

### 11.4 Transaction form (`/transactions/new` and `/transactions/:id/edit`)

- **Purpose:** Create or edit a transaction
- **Layout (top to bottom):**
  1. PageHeader "New transaction" / "Edit transaction". Edit version has a Delete action in the right slot
  2. Outflow / Inflow segmented control (required, drives affordances of the rest)
  3. Amount (MoneyInput)
  4. Date (native date input, defaults to today on new)
  5. Account (select)
  6. Category (CategoryPicker; includes ATB pseudo-row, with a hint under it when direction is Inflow: "Income typically goes to Available to Budget.")
  7. Status (select: Cleared / Pending / Reconciled, default Cleared)
  8. Memo (text input)
  9. Full-width primary submit: "Save" / "Create"
- **Affordances:**
  - Segmented control
  - CategoryPicker opens a sheet
- **States:**
  - Validation errors render inline under the field
  - `isSubmitting` disables the submit
- **Edge cases:**
  - Deleting an edit-target prompts a native confirm dialog
  - Form navigates back on success (`navigate(-1)`)
- **Design opportunity:**
  - Put amount above direction toggle? A huge numeric keypad is common in best-in-class finance apps (Copilot, YNAB). A dedicated numeric keypad could replace the system keyboard
  - Consider making the Account and Category pickers more prominent (cards with current selection visible)

### 11.5 Move Money (`/budget`)

- **Purpose:** Transfer dollars between ATB and categories (or between two categories). Does not move money between accounts
- **Layout:**
  1. PageHeader "Move Money"
  2. Helper paragraph explaining no account impact
  3. From category (CategoryPicker, defaults to ATB). Hint under field: "Available: $X" reflecting selected source
  4. To category (CategoryPicker)
  5. Amount (MoneyInput)
  6. Date (defaults today)
  7. Memo
  8. Submit: "Move money"
- **Validation:** From and To cannot be the same. Amount must be positive
- **Edge cases:** After submit, navigates to `/` (replace)
- **Design opportunity:**
  - Treat From and To as large visual cards with the available balance shown on the source in a prominent style
  - Add "Quick amounts" chips (25, 50, 100, Fill to goal)

### 11.6 Accounts list (`/accounts`)

- **Purpose:** See each account's settled balance at a glance
- **Layout:**
  - PageHeader with `backTo="/more"`
  - Rounded card list
  - Row: account name + type (Cash / Credit card) + optional "Pending $X" sub line. Right: settled balance, chevron right
  - Tap row -> account register
- **States:**
  - Loading
  - Empty: inline link to `/settings/accounts`
- **Design opportunity:**
  - Show a total-net row at top (sum of settled balances)
  - Credit cards could use a distinct visual treatment (pill, chip, or subtle color difference)

### 11.7 Account register (`/accounts/:id`)

- **Purpose:** Transaction history for a single account with running balance
- **Layout:**
  - PageHeader shows account name
  - Rows sorted newest first. Each row: category name top, date + memo sub line, amount right side with running balance shown in small grey text under it
  - Swipe left to delete
  - Tap row to edit the transaction
- **States:**
  - Loading
  - Empty: "No transactions yet."
  - Account not found: redirect to `/accounts`
- **Design opportunity:**
  - Add a sticky running balance header (current balance) and a mini sparkline
  - Filter by date range or status

### 11.8 Reports - Spending tab (`/reports`)

- **Purpose:** See where money went in a chosen range
- **Layout:**
  - PageHeader "Reports"
  - Radix Tabs with two equal buttons: Spending | Net Worth. Active tab gets `brand-600` background
  - Preset row: 4 equal cells (This month, Last month, This year, Custom)
  - If Custom: two native date pickers (From, To)
  - Summary card: caps label "Net spent", big tabular number, small "Out X · In Y" line
  - Grouping toggle: By category | By group (2-cell segmented)
  - List of rows, sorted by net descending. Each row: label + net amount (negative nets in `brand-600`, positive in default), plus a horizontal bar whose width is relative to the max net in the list. Bar color: `brand-500` if outflow-dominant, `danger-500` if inflow-dominant (this is inverted from natural finance color logic and is a known debt to address)
- **States:**
  - Loading
  - Empty: "No transactions in this range yet."
- **Design opportunity:**
  - Add a horizontal bar chart by group and a donut by category
  - Fix color semantics: Outflow = red, Inflow / saved = green. Currently inverted
  - Add export of the current report

### 11.9 Reports - Net Worth tab (`/reports` tab 2)

- **Purpose:** Track net worth over time
- **Layout:**
  - Summary card: "Latest net worth" caps label, big number, "Assets X · Debts Y" sub line
  - Recharts `LineChart` with 3 series: Net (green), Assets (blue), Debts (red). X axis is month labels (e.g. "Apr 26"). Y axis uses compact formatter (1.2M, 50k)
  - Entries header: caps label + "Add entry" button
  - Entries list: each entry shows label, date and type (Asset/Debt) and optional note, amount right aligned. Debt rendered as `-$X` in `danger-600`. Swipe to delete
  - Add-entry bottom sheet: Date, Type (select), Label, Amount, Notes
- **States:**
  - Chart requires >= 2 months of data. Below that: "Log at least two months of entries to see the chart."
  - No entries: inline copy + Add entry button
- **Design opportunity:**
  - Area fill under Net line
  - Toggle series visibility by tapping legend
  - Inline edit / tap-to-edit an entry (currently delete-only)

### 11.10 More (`/more`)

- **Purpose:** Hub for lower-frequency destinations
- **Layout:** Simple card list with two rows: Accounts, Settings
- **Design opportunity:** Add About, Help, Changelog, Feedback. Possibly surface the app version

### 11.11 Settings (`/settings`)

- **Purpose:** Manage the data structure and app behavior
- **Layout:** Two sections as rounded card lists
  - **Budget**: Groups (count), Categories (count), Accounts (count)
  - **App**: Appearance (shows current preference e.g. "system"), Data
- **Design opportunity:**
  - Add a "What's new" or "Tips" card
  - Add a developer/diagnostics row (Lighthouse, service worker status) gated behind a tap-7-times gesture

### 11.12 Settings > Groups (`/settings/groups`)

- **Purpose:** Create, rename, archive groups
- **Behavior:**
  - "Add group" inline input at top
  - Each row has an inline-edit rename
  - Swipe left to archive (archiving a group cascades to its categories)
- **Design opportunity:** Reorder via drag handle (currently sorted by `sortOrder` but no UI)

### 11.13 Settings > Categories (`/settings/categories`)

- **Purpose:** Create, edit, archive categories
- **Layout:** Grouped by group, each group has an "Add" button, then rows showing name and sub line like "Expense · Monthly · $500"
- **Add/Edit sheet:**
  - Name
  - Type segmented: Expense | Sinking fund
  - Goal select: None / Monthly funding / Target balance / Target by date
  - If goal != none: Goal amount
  - If goal == target_by_date: Due date
  - Cancel / Save buttons
- **Validation:** Name required. Goal amount > 0 when goal is set. Due date required for target_by_date
- **Design opportunity:**
  - Goal types deserve clearer labels with short explanations ("Fund $X every month", "Save up to $X", "Save $X by March 2027")
  - Preview of how the goal will look on the dashboard card as the user configures it

### 11.14 Settings > Accounts (`/settings/accounts`)

- **Purpose:** Create and archive accounts
- **Layout:** Add form with Name + `isCreditCard` checkbox, then rows of existing accounts with swipe-to-archive
- **Design opportunity:**
  - Account type beyond credit card vs cash (checking, savings, investment, loan)
  - Starting balance input on creation so the user doesn't need a synthetic transaction

### 11.15 Settings > Appearance (`/settings/appearance`)

- **Purpose:** Toggle theme preference
- **Layout:** 3-option radio-like list: System, Light, Dark. Selected row shows `Check` icon on the right and `brand-600` text
- **Behavior:** Preference stored in localStorage (`aspire:theme`). Class `.dark` applied to `<html>` pre-hydration to avoid flash
- **Design opportunity:**
  - Add live preview tiles
  - Add accent color options (would require more tokens)

### 11.16 Settings > Data (`/settings/data`)

- **Purpose:** Export, import, reset
- **Layout:** Three cards
  - **Export:** "Download a JSON backup of everything in this app." Primary button "Export backup"
  - **Import:** Explanation of Merge vs Replace. Two secondary buttons
  - **Reset:** Warning copy. Danger button "Reset all data" with native confirm dialog
- **Status line:** Bottom shows success (in `brand-600`) or error (in `danger-600`)
- **Design opportunity:**
  - Confirmation modal instead of a browser `confirm()`
  - Show last-export timestamp
  - Separate "import and replace" into a distinct flow with a big friction-adding confirm step

---

## 12. Key flows

### 12.1 First-run setup

```
Launch empty app
 -> Onboarding (/onboarding)
 -> Tap "Get started in Settings"
 -> /settings/groups
    -> add first group "Monthly Bills"
 -> navigate manually to /settings/categories
    -> tap "Add" in group, create "Rent" with goal Monthly funding $2000
 -> /settings/accounts
    -> add "Checking"
 -> /
    -> dashboard is no longer empty. FAB prompts to record income
```

Design note: step-by-step guidance currently ends at "Get started". A smarter flow would walk the user through groups -> categories -> accounts -> first income in sequence without dropping them into raw settings.

### 12.2 Log an expense

```
Dashboard
 -> FAB
 -> /transactions/new
 -> (direction defaults to Outflow)
    amount, date=today, account=last used, category (picker), status=Cleared, memo
 -> Save
 -> back to previous screen (dashboard)
 -> category Available updates, month Activity updates
```

### 12.3 Log income

```
FAB
 -> /transactions/new
 -> switch to Inflow
    amount, account, category = Available to Budget (hinted)
 -> Save
 -> ATB in header updates
```

### 12.4 Allocate money (zero-based)

```
Header shows ATB > 0
 -> Tap Budget tab
 -> /budget
 -> From = Available to Budget (default)
    To = category
    amount
 -> Move money
 -> /
    -> ATB drops, category Available rises, Budgeted for month rises
```

### 12.5 Review goal progress

```
Dashboard
 -> MonthNav sets the month
 -> tap category row
 -> sheet opens with Available / Activity / Budgeted and goal card
 -> optional: Move money or New transaction
```

### 12.6 Run a spending report

```
Tab: Reports
 -> Spending tab is default
 -> pick preset (or Custom + dates)
 -> toggle By category / By group
 -> scan the list and totals
```

### 12.7 Log a net-worth snapshot

```
Tab: Reports -> Net Worth
 -> tap "Add entry"
 -> sheet: date, type, label, amount, notes
 -> Save
 -> chart appears after 2+ months of entries
```

### 12.8 Backup and restore

```
More -> Settings -> Data
 -> Export backup -> downloads JSON file
 (later) -> Import -> Merge or Replace
```

### 12.9 Switch theme

```
More -> Settings -> Appearance -> pick System / Light / Dark
```

---

## 13. State inventory

The designer must produce visuals for each state per screen.

### Loading

- Appears briefly during IDB hydration
- Current pattern: inline `Loading...` text
- **Opportunity:** Shimmer skeletons for list cards and the ATB header

### Empty

- Dashboard: no groups, no categories within a group
- Transactions: no results, vs no results after filters
- Accounts list: no accounts
- Account register: no transactions
- Reports Spending: no txns in range
- Reports Net Worth: 0 entries vs 1 entry (chart needs 2+)
- Settings Groups / Categories / Accounts: no records yet
- **Opportunity:** Friendly illustrations, a single clear CTA, short plain English copy

### Error

- App-wide: `ErrorBoundary` screen with message, Dismiss, Reload
- Form: inline error under the field
- Import: status line turns `danger-600`
- **Opportunity:** Toast notifications for success/failure, undo on delete

### Success

- Currently silent (navigation serves as confirmation)
- **Opportunity:** Small success toasts ("Transaction saved", "Backup downloaded") tied to the safe-area

---

## 14. Accessibility and input baselines

- Every icon-only button has an `aria-label` (FAB, swipe delete, chevrons)
- Focus is visible via browser default; designer should propose a branded focus ring that works in both themes
- Contrast check needed for `ink-400` labels on `ink-100` backgrounds
- Native inputs are kept for date and select for platform keyboards
- Money inputs use `inputmode="decimal"` to surface the numeric keyboard
- `select` elements are native. The designer may propose custom pickers but be aware of keyboard support cost
- No voice-over labels yet for chart data. Opportunity: offer a text summary as an `aria-live` region

---

## 15. Known pain points and design opportunities

Ranked by impact.

1. **Color semantics for money are inconsistent.** Positive money and "good progress" both use green (`brand-`*). Spending bars invert this. Lock a rule: green = money-in / remaining, red = money-out / overspent / debt, neutral ink = balances
2. **Onboarding drops users into raw settings.** Replace with a guided 3-step in-app form that creates the first group/category/account inline
3. **No empty-state illustrations.** Everything is text. A thin illustrated set (3-5 scenes) would elevate the feel without weight
4. **Dashboard hero is ATB only.** Add a month summary strip (Income, Spent, Left to assign)
5. **No reorder UX.** Groups and categories have `sortOrder` but no drag handle
6. **Filter panel on Transactions is cramped.** Move to a bottom sheet with pill-style chips and a summary of active filters
7. **Transaction form lacks hierarchy.** Amount should be hero. Consider a numeric keypad layout
8. **Confirm dialogs use native `confirm()`.** Replace with themed confirmation sheets
9. **No toasts or undo.** Swipe-to-delete is destructive. Add Undo for 5 seconds
10. **Spending tab bar color.** The red `danger-500` bar next to a green amount is confusing; unify to one of the two meaning systems described in #1
11. **Month navigation lives only on Dashboard.** Reports and Transactions should accept a shared month context
12. **Net worth chart has 3 series with no toggles and no fill.** Consider area under Net plus a control to hide Assets/Debts

---

## 16. Branding hooks the designer should respect

Things the new visual language must preserve:

- **Zero-based math visibility:** ATB is always visible, always accurate, always interpretable at a glance
- **Number legibility:** tabular numerals everywhere, never center-aligned numbers, never abbreviate amounts in lists (only in axes)
- **Destructive visual language:** red is reserved for destructive or overspent. Do not use red for brand accent
- **No cluttered chrome:** the header is light, the tab bar is discreet. Don't add decorative elements that compete with data
- **Safe areas always respected**

Things the designer can freely change:

- Palette (as long as semantic mapping is kept: brand vs ink vs danger and ATB rules)
- Typography (but keep a tabular feature for money)
- Illustration and empty-state personality
- Motion choreography for sheets, swipes, row reveals
- Card elevation language (could use borders instead of shadows, for example)
- Active-tab treatment (pill, underline, color)

---

## 17. Explicitly out of scope (do not design yet)

- Bank sync / account aggregation
- Multi-currency and FX
- Bill reminders and local notifications
- Shared budgets and collaboration
- Reports beyond Spending and Net Worth (no cash flow, no forecasting)
- Transfers between accounts (we only transfer between categories)
- Photo attachments / receipts
- Tags / labels / projects

These may arrive in later phases; designing for them now will create dead UI.

---

## 18. Suggested deliverables for the Product Designer

To hand back something actionable, produce:

1. Updated color + typography tokens mapping to the semantic roles above (brand, ink scale, danger, ATB states)
2. Redesigned components: Button, Segmented control, Field/Input, MoneyInput, SwipeRow, Sheet, CategoryPicker, ProgressBar, Stat card, PageHeader, TabBar, FAB
3. Empty-state illustrations for: Dashboard empty, Transactions empty, Accounts empty, Net Worth empty, "after-filter" empty
4. High-fi mocks for every route listed in Section 6, covering empty / loading / populated states, in both light and dark modes
5. Motion spec for: sheet open/close, swipe-to-delete reveal, FAB tap, tab switch, month nav change, success toast
6. Optional: a compact "brand voice" note (one page) covering tone (calm, blunt, mentor-like), do/don't words, and number-formatting rules

---

## 19. Source map (if the designer wants to poke around)


| Topic                | File                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| Tokens and keyframes | `src/styles/index.css`                                                                                        |
| Tab bar and header   | `src/components/layout/tab-bar.tsx`, `src/components/layout/app-header.tsx`                                   |
| Shared primitives    | `src/components/ui/button.tsx`, `src/components/ui/field.tsx`, `src/components/ui/sheet.tsx`                  |
| SwipeRow             | `src/components/swipe-row.tsx`                                                                                |
| Month nav            | `src/components/month-nav.tsx`                                                                                |
| Category picker      | `src/components/category-picker.tsx`                                                                          |
| Dashboard            | `src/routes/dashboard.tsx`                                                                                    |
| Transactions         | `src/routes/transactions/list.tsx`, `src/routes/transactions/form.tsx`                                        |
| Move money           | `src/routes/budget/move-money.tsx`                                                                            |
| Accounts             | `src/routes/accounts/list.tsx`, `src/routes/accounts/register.tsx`                                            |
| Reports              | `src/routes/reports/index.tsx`, `src/routes/reports/spending-tab.tsx`, `src/routes/reports/net-worth-tab.tsx` |
| More / Settings      | `src/routes/more.tsx`, `src/routes/settings/*.tsx`                                                            |
| Onboarding           | `src/routes/onboarding.tsx`                                                                                   |
| Error boundary       | `src/components/error-boundary.tsx`                                                                           |
| Theme                | `src/app/theme.tsx`, `src/app/use-theme.ts`, `src/app/theme-context.ts`                                       |


---

End of brief.