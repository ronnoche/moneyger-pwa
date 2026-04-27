# Cursor Agent Prompt — Moneyger × YNAB Spec Alignment

> Paste the contents below (everything between the `=== BEGIN ===` and `=== END ===` markers) into Cursor's Agent input. The prompt is self-contained; do not edit it before running unless you understand the constraints in §0.

---

```
=== BEGIN CURSOR AGENT PROMPT ===

You are operating inside the Moneyger PWA repo as an autonomous senior engineer. Your job is to align the existing codebase with a canonical YNAB-derived specification, working in small atomic steps with verification between each. Do not ask clarifying questions — every constraint you need is in this prompt. If the prompt and the code disagree, the prompt wins. If the prompt and reality (the actual code on disk) disagree, the code wins until you have changed it.

────────────────────────────────────────────────────────────────────────
§0. NON-NEGOTIABLE CONSTRAINTS (violating any of these = revert)
────────────────────────────────────────────────────────────────────────
C1. NO bank sync, NO Direct Import, NO OAuth-to-bank, NO Plaid/Teller/SaltEdge. Manual entry only.
C2. NO multi-user, NO shared budgeting, NO household members. One user per app instance.
C3. ONE user = ONE Google account. The only remote storage is the user's own Google Sheets / Google Drive (existing `netlify/functions/google-oauth-*.mjs` + `sheets-sync.mjs` + `src/lib/sync.ts`). Do not introduce a backend database.
C4. Account types are a CLOSED SET of FOUR categories with these subtypes only:
      - Cash:     checking | savings | cash
      - Credit:   credit_card | line_of_credit
      - Loan:     mortgage | auto_loan | student_loan | personal_loan | medical_debt | other_debt
      - Tracking: asset | liability
    Do not add bank-linked or institution-linked variants.
C5. CRUD-only architecture. Do not refactor to event-sourcing, CQRS, or any new state-management library. Keep Dexie 4 + `useLiveQuery` + repo functions.
C6. Preserve existing user data. Every schema change MUST ship as a Dexie `version().upgrade()` migration in `src/db/db.ts`. Never drop a table or rename a field destructively. Add new fields with safe defaults; deprecate old fields by leaving them in place until a follow-up migration removes them.
C7. Stack is fixed: Vite 7, React 19, TypeScript 6, Tailwind 4, React Router v7, Dexie 4, React Hook Form + Zod, Radix, motion, sonner, date-fns. Do not introduce new top-level dependencies without justification recorded in your plan.
C8. All money values are stored as JS numbers in major units (e.g. 12.34) and rounded to 2 decimals via the existing `round2` helpers. Do NOT introduce milliunits. Do NOT introduce a Money/Decimal class unless gap analysis proves rounding error is corrupting reconciled balances — and even then, propose first.
C9. No UI framework swaps. Keep Tailwind v4 `@theme` tokens in `src/styles/index.css`.
C10. Tests must run under Vitest 4 + `fake-indexeddb` + `jsdom`. New logic with branching MUST have unit tests in `src/lib/**/*.test.ts` or `tests/**`.

────────────────────────────────────────────────────────────────────────
§1. CANONICAL SPEC (compressed from 4 Notion PRDs — this IS the source of truth)
────────────────────────────────────────────────────────────────────────

§1.1 ARCHITECTURE PILLARS
P1 Accounts are the foundation; every transaction anchors to one.
P2 Categories & Targets are the structure; money is pre-allocated into named buckets.
P3 Assignment & Reconciliation is the discipline loop.

§1.2 ACCOUNTS — Add Account PRD
- Four categories, each with budget behavior:
    Cash      → on_budget = true,  contributes to Ready to Assign (RTA) on opening balance
    Credit    → on_budget = true,  does NOT contribute to RTA; creates a paired Credit Card Payment category
    Loan      → on_budget = false, debt-payoff tracking only, no category column in register
    Tracking  → on_budget = false, net-worth only
- Required fields on create: nickname (non-empty) + type (one of the closed set).
- Optional: opening balance (defaults $0; negative valid for credit/loan; for cash, negative is allowed but must surface a type-aware warning per F12 below).
- Add Account state machine:
    IDLE → MODAL_OPEN → UNLINKED_FORM → FORM_VALID → SAVING → SUCCESS → IDLE
    SUCCESS → MODAL_OPEN (Add Another); ANY → IDLE on X.
- Edge cases:
    - Empty nickname → Next disabled.
    - No type selected → Next disabled.
    - Empty balance → treat as $0.
    - Negative balance on cash account → save but warn (Moneyger differentiator F12).
    - Duplicate name + type → soft-warn before save (F6).
    - Page refresh mid-flow → modal dismissed; draft persistence is a Moneyger differentiator (F5) — implement via session-scoped form state.
- Linked-account flows are OUT OF SCOPE (constraint C1).

§1.3 CATEGORIES, GROUPS & TARGETS — Categories PRD
- Hierarchy: Budget → CategoryGroup → Category → MonthCategory (one row per category per month) → Target (0..1).
- Target frequency × behavior matrix (canonical):
    Weekly  : I need {amount} every {Sun..Sat} | next month: Set Aside Another | Refill Up To
    Monthly : I need {amount} by {1..31|LastDay} | next month: Set Aside Another | Refill Up To
    Yearly  : I need {amount} by {MM/DD/YYYY} | next year: Set Aside Another | Refill Up To
    Custom  : amount + behavior (Set Aside | Fill Up To | Have a Balance Of) + due date + Repeat (off|every N month/year)
- Constraint: "Have a Balance Of" is Custom-exclusive; Repeat MUST be OFF for Have-a-Balance-Of.
- Core formulas:
    Available = CarriedOver + AssignedThisMonth − SpentThisMonth
    RTA       = Σ(cash account balances) + Σ(credit inflows that hit RTA) − Σ(category assigned)
    GroupAvailable = Σ(category Available within group)
- "Needed this month" by behavior:
    SET_ASIDE_ANOTHER (weekly):  weeks_in_month × weekly_amount, ignores current balance
    SET_ASIDE_ANOTHER (monthly): full target, ignores current balance
    SET_ASIDE_ANOTHER (yearly):  full_year_target / 12 (or proportional), ignores balance
    REFILL_UP_TO      (monthly): max(0, target − available)
    REFILL_UP_TO      (yearly):  max(0, (yearly_target − available) / months_remaining_in_year)
    HAVE_A_BALANCE_OF (custom):  max(0, (target − available) / months_remaining_to_due_date)
    FILL_UP_TO        (custom):  max(0, target − available)
- Color/state machine for category Available:
    GREEN  Available > 0, target met OR no target
    YELLOW Available < amount_needed (underfunded) OR credit overspending
    GRAY   Available = 0
    RED    Available < 0 from cash spending (cash overspending)
- Target states: NO_TARGET | UNDERFUNDED | MET | OVERFUNDED | SNOOZED
- Business rules:
    R1  Assigned ≥ 0; negatives blocked (per Categories PRD §5 R1; conflicts with Reconcile PRD §4A which permits negatives — RESOLVE by following Categories PRD: assigned amounts are non-negative; "moving money back" is a transfer, not a negative assignment).
    R2  RTA may go negative (per Reconcile PRD §6A) — this overrides Categories R2. Show loud red warning; do not block.
    R3  One target per category at a time.
    R5  Have-a-Balance-Of is Custom-only.
    R7  Deleting a category WITH transactions requires a re-homing dialog (block until transactions reassigned).
    R8  Hidden categories retain balance + target.
    R9  Monthly rollover: at month boundary, current Available becomes CarriedOver for next month.
    R10 Overfunding does NOT auto-return; user must run Reduce Overfunding preset.

§1.4 ASSIGNMENT — Reconciliation & Assigning Money PRD
- All 8 Auto-Assign modes:
    1. Underfunded            — fund each goal-bearing category by `needed_this_month`, priority by due date then sort_order, cap at RTA.
    2. Assigned Last Month    — copy previous month's assigned per category.
    3. Spent Last Month       — assigned = previous month spending per category.
    4. Average Assigned (3mo) — mean of last 3 months' assigned.
    5. Average Spent    (3mo) — mean of last 3 months' spent.
    6. Reduce Overfunding     — for each category where Available > target, return (Available − target) to RTA.
    7. Reset Available  (web) — set every category Available to $0 by adjusting assigned.
    8. Reset Assigned   (web) — clear all assigned to $0, returning everything to RTA.
- Recent Moves history + Cmd+Z undo for assignments.
- Filter tabs: All | Underfunded | Overfunded | Money Available | Snoozed.
- Snooze a target for current month (Zzz icon; excluded from Underfunded count).

§1.5 RECONCILIATION — Reconcile PRD
- Transaction states: UNCLEARED → CLEARED (C) → RECONCILED (R, locked).
- Reconcile flow:
    1. User clicks Reconcile on an account register.
    2. Prompt: "Is your current balance $X.XX?" (X.XX = system cleared balance).
    3. Yes → all cleared txns transition C→R, lock applied, last_reconciled_at = now.
    4. No → user enters true bank balance → system shows gap = userBalance − clearedBalance.
       - User clears any newly-cleared pending txns (live-recompute gap).
       - If gap remains → "Create Adjustment" creates a single transaction:
            payee = "Reconciliation Balance Adjustment"
            categoryId = AVAILABLE_TO_BUDGET (treated as inflow/outflow to RTA)
            amount = gap, status = cleared
         then commits the reconcile (C→R on all cleared incl. adjustment).
- Locked (R) transactions:
    - Editing a locked txn requires explicit warning + confirmation; on confirm, lock is removed (txn returns to C).
    - Lock is never auto-removed.
    - Moneyger differentiator F4: implement a 24-hour reversible window where the user can undo the entire reconcile event (revert R→C in bulk, delete adjustment if any). After 24h the lock is permanent.
- Reconcile is per-account, never multi-account.

§1.6 STORAGE & SYNC
- Local: IndexedDB via Dexie (`moneyger-pwa`, currently version 2).
- Remote: Google Sheets / Google Drive via the user's own Google account, through `src/lib/sync.ts` and the Netlify functions in `netlify/functions/`. No other remote.

────────────────────────────────────────────────────────────────────────
§2. STARTING STATE OF THE CODEBASE (verify, don't trust)
────────────────────────────────────────────────────────────────────────
The following is a HYPOTHESIS based on a prior survey. Your first job (§3) is to verify each item by reading the actual files. Mark each ✅ confirmed / ⚠️ partially correct / ❌ wrong before proceeding.

Hypothesised facts:
H-A1 `src/db/schema.ts` defines `Account` with only `isCreditCard: boolean` — there is NO four-category type enum, NO Loan or Tracking support. Gap vs §1.2.
H-A2 `Account` has no `last_reconciled_at`, no `on_budget`, no `account_category`.
H-C1 `Category.goalType` is one of `none | monthly_funding | target_balance | target_by_date | weekly | monthly | yearly | custom`. There is NO explicit `behavior` field separating Set-Aside-Another vs Refill-Up-To vs Fill-Up-To vs Have-a-Balance-Of. Gap vs §1.3.
H-C2 `goalRecurring` and `goalStartMonth` exist but are inconsistently applied; `normalizeGoal()` in `src/lib/goals.ts` collapses all to `cadence` only.
H-C3 There is no per-month `MonthCategory` row; "Available" in `src/lib/budget-math.ts#categoryAvailable` is a LIFETIME sum, not month-bounded. Monthly rollover (R9) is therefore not implemented as snapshots — it is implicit through a transfer history. Verify whether this satisfies §1.3 formulas under all edge cases.
H-T1 `Transaction.status` enum is `cleared | pending | reconciled` (good), but there is no `reconciledAt`, no `lockedAt`, no reconciliation-event entity. Gap vs §1.5.
H-T2 There is no Reconcile UI route. Account register at `src/routes/accounts/register.tsx` shows status pills only.
H-AA1 Auto-Assign presets in `src/lib/auto-assign/presets.ts` implement: underfunded, assignedLastMonth, spentLastMonth, averageAssigned, averageSpent, resetAvailable, resetAssigned. MISSING: `reduceOverfunding`. Gap vs §1.4 mode 6.
H-AA2 `src/db/schema.ts#AutoAssignHistoryEntry` exists; revert support is in `src/hooks/use-revert-auto-assign.ts`. Verify that single-edit undo (Cmd+Z) is also wired (per Reconcile PRD §3A flow 6).
H-AA3 No filter tabs (All/Underfunded/Overfunded/Money Available/Snoozed) in the budget view.
H-AA4 No snooze field on Category; no snooze UI.
H-CR1 Credit Card Payment category auto-creation on Credit account create is NOT implemented. `createAccount` in `src/features/accounts/repo.ts` only optionally seeds an opening-balance transaction.
H-CR2 Credit overspending vs cash overspending is not differentiated in color/state logic.
H-G1 Group archive cascades to categories (`src/features/groups/repo.ts#archiveGroup`) but there is no transaction re-homing dialog before category deletion. Gap vs R7.

(End hypothesis list. Add to it as you find more.)

────────────────────────────────────────────────────────────────────────
§3. WORKFLOW (you will execute these phases in order)
────────────────────────────────────────────────────────────────────────

PHASE A — DISCOVERY (read-only)
  A1. Map the system. Open every file under `src/db`, `src/features/**`, `src/lib/budget-math.ts`, `src/lib/goals.ts`, `src/lib/auto-assign/**`, `src/routes/accounts/**`, `src/routes/budget/**`, `src/routes/transactions/**`, `src/routes/settings/**`, `src/components/budget/**`, `src/components/account-sheet.tsx`. Build a System Map with:
        - Domain entities (with field lists copied from the actual code).
        - Where business logic lives (file:line for each rule in §1).
        - Data flow for the four critical user actions:
            (a) opening-balance income → RTA
            (b) assigning money to a category
            (c) spending from a cash account
            (d) spending from a credit account
            (e) reconciling an account
  A2. Verify each H-* hypothesis in §2; output a confirmation table. Add new rows for anything you find.
  A3. STOP and emit Output #1 (System Understanding Summary) and Output #2 (Extracted Rules — repeat §1 in your own words, normalized as deterministic rules).

PHASE B — COMPARISON & GAPS
  B1. For each domain below, produce a side-by-side comparison (current vs spec):
        - Account types & on-budget/RTA contribution
        - Category targets (frequency × behavior)
        - "Needed this month" math (per behavior)
        - Available color states + cash vs credit overspending
        - Auto-Assign modes (all 8)
        - Recent Moves / Undo
        - Filter tabs + Snooze
        - Reconciliation flow + locks + adjustment txn
        - Credit Card Payment category
        - Loan account behavior (off-budget)
        - Tracking account behavior (off-budget, net-worth only)
        - Monthly rollover
        - Editing/deleting past + reconciled transactions
        - Category delete with transactions (re-homing)
  B2. Emit Output #3 (Behavioral Comparison) and Output #4 (Gap Analysis Table) using EXACTLY this gap-row format:

        ID | Domain | Gap | Current Behavior (file:line) | Expected Behavior (§ref) | Root Cause | Impact (H/M/L)

PHASE C — PLAN
  C1. For each gap, produce an Implementation Task with EXACTLY these fields:

        TASK-### | Title | Files to modify | Data-model changes | Logic changes | Migration plan | Tests to add | Risk | Depends on (TASK-###) | Estimated atomic-step count

  C2. Order tasks topologically. Foundation first (schema + migration), then domain logic (math), then presets, then UI, then UX polish.
  C3. Emit Output #5 (Step-by-Step Execution Plan) and Output #6 (Atomic Implementation Tasks).

PHASE D — EXECUTE (one task at a time, atomically)
  For each TASK-### in order:
    D1. Restate the task and the acceptance criteria.
    D2. If schema changes are involved:
          - Add a NEW Dexie `version().upgrade()` block in `src/db/db.ts` (do not mutate existing version blocks).
          - Bump version monotonically.
          - In the upgrade callback, populate new fields with safe defaults derived from existing rows (e.g. `account.type = isCreditCard ? 'credit_card' : 'checking'`; `account.account_category = derive(account.type)`; `account.on_budget = isCash || isCredit`).
          - Keep the legacy field (e.g. `isCreditCard`) until a later cleanup task removes it; mark it `@deprecated` in the type.
    D3. Implement the change with the smallest possible diff.
    D4. Add/update unit tests under `src/lib/**/*.test.ts` or `tests/**`. Required coverage:
          - Every formula in §1.3 has a numerical test.
          - Every Auto-Assign preset has a test for: (i) happy path, (ii) RTA cap, (iii) zero-history, (iv) snoozed-excluded.
          - Reconcile flow has tests for: matching balance, mismatch with adjustment, locked-edit warning path, 24h-reversible undo.
    D5. Run `pnpm test:run` and `pnpm lint`. If either fails, FIX BEFORE PROCEEDING.
    D6. Run `pnpm build` to confirm TypeScript compiles. Do not silence type errors with `any` or `@ts-ignore`.
    D7. Self-check against the Validation Checklist (§4). Update it.
    D8. Commit the task as a single atomic commit with message:
          `feat(moneyger): TASK-### <title> [aligns with §<spec ref>]`

PHASE E — VALIDATION
  E1. After all tasks, run the full Validation Checklist (§4) end-to-end.
  E2. Emit Output #7 (Validation Checklist with pass/fail per item).
  E3. Emit Output #8 (Known Risks).

────────────────────────────────────────────────────────────────────────
§4. MANDATORY VALIDATION CHECKLIST
────────────────────────────────────────────────────────────────────────
Functional — Accounts
  [ ] Account create flow accepts exactly the four categories (Cash/Credit/Loan/Tracking) and rejects free-text.
  [ ] Selecting a Cash subtype → opening balance ADDS to RTA.
  [ ] Selecting a Credit subtype → opening balance does NOT change RTA; a paired "Credit Card Payment: <Account Name>" category is auto-created in a "Credit Card Payments" group (created if missing).
  [ ] Selecting a Loan or Tracking subtype → opening balance does NOT change RTA; account does not appear in RTA-contributing balances.
  [ ] Loan & Tracking accounts have no category column in their register (or display read-only "—").
  [ ] Type-aware balance warning fires for: negative cash balance, positive loan balance, positive credit balance.
  [ ] Duplicate-name+type warning surfaces before save and is dismissible.
  [ ] Draft persistence: closing the modal without saving and reopening within the same session restores form state.

Functional — Categories & Targets
  [ ] Category model has BOTH `goalFrequency` (weekly|monthly|yearly|custom) AND `goalBehavior` (set_aside_another|refill_up_to|fill_up_to|have_a_balance_of).
  [ ] Have-a-Balance-Of is rejected at save time for non-Custom frequency.
  [ ] Repeat=ON is rejected at save time for Have-a-Balance-Of.
  [ ] `neededThisMonth` returns the exact value from §1.3 for each (frequency, behavior) cell.
  [ ] Available state machine renders correct color: GREEN/YELLOW/GRAY/RED including credit-overspending YELLOW.
  [ ] Snooze toggle on a category for current month sets Zzz icon, excludes from Underfunded count, and clears at month boundary.
  [ ] Filter tabs present and functional: All | Underfunded | Overfunded | Money Available | Snoozed.
  [ ] Deleting a category with ≥1 transaction shows a re-homing dialog and blocks deletion until reassigned.
  [ ] Hidden category preserves balance + target.
  [ ] Negative assigned input is blocked at the input layer.

Functional — Assignment
  [ ] All 8 Auto-Assign modes selectable; Reduce Overfunding actually returns excess to RTA.
  [ ] Auto-Assign Underfunded prioritizes by goal due date (due-soonest-first), then sort order.
  [ ] Auto-Assign caps at RTA; never produces negative RTA via preset.
  [ ] Manual assignment CAN drive RTA negative (loud red warning, no block).
  [ ] Cmd+Z undoes the last single assignment (not just preset application).
  [ ] Recent Moves popover lists last N assignments with timestamp.

Functional — Reconciliation
  [ ] Reconcile button visible on every Cash & Credit account register.
  [ ] Matching-balance flow transitions all C→R and stamps `lastReconciledAt`.
  [ ] Mismatch flow lets user clear pending and recomputes gap live.
  [ ] Create-Adjustment produces ONE transaction with payee="Reconciliation Balance Adjustment", category=AVAILABLE_TO_BUDGET, status=cleared, amount = gap.
  [ ] Locked (R) transaction edit shows confirmation modal; on confirm, status drops to C and lock is removed.
  [ ] 24-hour reversible window: a "Undo reconcile" affordance appears for 24h after reconcile and reverts R→C and removes any auto-created adjustment.

Functional — Money Math (unit tests)
  [ ] §1.3 formulas covered by tests, including edge values: $0 target, partial month, due-date in past, available > target.
  [ ] Cash overspending in month M deducts from M+1 RTA on rollover.
  [ ] Credit overspending in month M creates Credit Overspending tracked separately and does NOT deduct from RTA.

Non-functional
  [ ] `pnpm test:run` passes; coverage on `src/lib/**` and `src/features/**` does not drop.
  [ ] `pnpm lint` clean (no new warnings).
  [ ] `pnpm build` passes with no new `any` or `@ts-ignore`.
  [ ] All schema changes ship as upgrade migrations; opening the app on a v2 DB silently upgrades to the new version with all data intact.
  [ ] No new top-level dependencies (or, if added, justified in §6 Risks).

Constraints
  [ ] No bank-sync code path was added.
  [ ] No multi-user code path was added.
  [ ] Only Google Sheets/Drive remote sync remains.

────────────────────────────────────────────────────────────────────────
§5. EDGE CASES THAT MUST BE EXPLICITLY HANDLED
────────────────────────────────────────────────────────────────────────
EC-01 Overspend a cash category in month M → next month's RTA reduced by overspend on rollover.
EC-02 Overspend a credit category in month M → Credit Overspending tracked per account; RTA unaffected; payment category surfaces required payment.
EC-03 Delete a Credit account that has a paired payment category and balance → block with re-homing or transfer-to-RTA prompt.
EC-04 Edit a reconciled transaction's amount → confirmation modal, lock removed, account cleared balance recomputed.
EC-05 Reconcile with $0 cleared balance and $0 entered → succeeds with no adjustment.
EC-06 Reconcile with negative entered balance for credit account → valid; adjustment created if gap.
EC-07 Page refresh mid-reconcile → modal dismissed, no transactions modified, no partial locks. Verify with a test that mocks reload.
EC-08 Custom target with Repeat OFF, due date passed → shows MET/done; no auto-reset; not surfaced in Underfunded.
EC-09 Custom target with Repeat ON, due date passes → new period starts, amount resets.
EC-10 Yearly target, Refill Up To, available > yearly target → category MET; Reduce Overfunding can return excess.
EC-11 Auto-Assign Underfunded with insufficient RTA → funds in priority order (due date asc, then sort_order) until RTA = 0; never negative.
EC-12 User assigns more than RTA manually → RTA goes negative (red), no block.
EC-13 Loan account with positive balance entered → warn (logically inconsistent) but allow.
EC-14 Tracking account balance change → does NOT touch RTA, only net worth.
EC-15 Hide category with $50 balance → moves to Hidden group; balance preserved; RTA unchanged.
EC-16 Drag category to a new group → preserves its balance, target, and history.
EC-17 Navigate to past month → read-only; current-month edits unaffected.
EC-18 Multi-device via GSheets sync, two clients edit same MonthCategory → last-write-wins per existing sync.ts; surface conflict toast (Moneyger differentiator F11) — IF this is in scope, otherwise mark as deferred and document.

────────────────────────────────────────────────────────────────────────
§6. OUTPUT FORMAT (STRICT — emit in this exact order)
────────────────────────────────────────────────────────────────────────
You MUST emit, in chat, between phases:

  Output #1  System Understanding Summary       (after Phase A1–A2)
  Output #2  Extracted Rules from Notion (normalized) (after Phase A)
  Output #3  Behavioral Comparison (current vs expected) (after Phase B1)
  Output #4  Gap Analysis Table                (after Phase B2)
  Output #5  Step-by-Step Execution Plan       (after Phase C2)
  Output #6  Atomic Implementation Tasks       (after Phase C2)
  Output #7  Validation Checklist with pass/fail (after Phase E1)
  Output #8  Known Risks                       (after Phase E3)

Between Phase D tasks, emit a one-line progress entry of the form:
  `[D-EXEC] TASK-### <title> — <files changed> — tests <added/updated> — checklist <delta>`

Do not emit anything between tasks except the progress entry, the diff, and the test results.

────────────────────────────────────────────────────────────────────────
§7. STYLE RULES
────────────────────────────────────────────────────────────────────────
- Smallest possible diff per task. No drive-by refactors.
- Preserve existing public function signatures unless the task explicitly changes them.
- Type narrowly. No `any`. No `as unknown as`.
- For new enums/unions, define a single source of truth in `src/db/schema.ts` and re-export.
- Co-locate new tests next to the unit they cover (`foo.ts` + `foo.test.ts`).
- New UI must use existing primitives in `src/components/ui/**` and tokens in `src/styles/index.css`.
- No console.log left in committed code.
- Follow existing repo formatting; run `pnpm format` if you touch formatting.

────────────────────────────────────────────────────────────────────────
§8. KNOWN AMBIGUITIES (resolve as instructed; do not ask the user)
────────────────────────────────────────────────────────────────────────
AMB-1 Categories PRD says "Assigned ≥ 0; negatives blocked" while Reconcile PRD says "Negative assignments allowed (moves money back to RTA)". RESOLUTION: Treat assignment as non-negative; "moving money back" is implemented as a Transfer from category → AVAILABLE_TO_BUDGET, matching the existing Moneyger transfer model.
AMB-2 RTA may go negative (Reconcile PRD §6A) vs RTA cannot (Categories PRD §5 R2). RESOLUTION: Follow Reconcile PRD — RTA may go negative via manual assignment; Auto-Assign presets MUST NOT.
AMB-3 Reconcile lock permanence vs Moneyger F4 reversibility window. RESOLUTION: Implement the 24-hour reversible window as a Moneyger differentiator.
AMB-4 Credit Card Payment category vs current ATB/transfer model. RESOLUTION: Auto-create a category named `Credit Card Payment: <AccountName>` in a `Credit Card Payments` group (created lazily). Spending from a Credit account contributes to that category's required payment via existing transfer/transaction primitives — no new entity.
AMB-5 Per-month MonthCategory snapshot vs current lifetime-sum model. RESOLUTION: Stay with the current model (lifetime sum + month-bounded views via `categoryActivityForMonth` / `categoryBudgetedForMonth`) unless gap analysis proves rollover/locking semantics cannot be expressed without a snapshot. If a snapshot becomes necessary, propose first via a TASK-### planning entry before implementing.

────────────────────────────────────────────────────────────────────────
§9. DEFINITION OF DONE
────────────────────────────────────────────────────────────────────────
- Every item in §4 Validation Checklist passes.
- All 8 Auto-Assign modes are selectable and produce correct moves.
- Reconcile flow works end-to-end including 24h reversible undo.
- All four account categories (Cash/Credit/Loan/Tracking) are first-class with correct on-budget behavior.
- Targets have explicit (frequency × behavior) and `neededThisMonth` matches §1.3 for all combinations.
- `pnpm test:run`, `pnpm lint`, `pnpm build` all clean.
- No constraint in §0 has been violated.
- Output #8 enumerates remaining risks and any deferred Moneyger differentiators (F1–F15) with rationale.

Begin now with Phase A1.

=== END CURSOR AGENT PROMPT ===
```
