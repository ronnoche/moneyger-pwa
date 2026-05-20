-- ============================================================================
-- Supabase Auth migration: add user_id + RLS to all synced tables.
-- Run this in Supabase SQL Editor. Safe to re-run (uses IF NOT EXISTS).
--
-- BEFORE running:
--   1. Create your user account via the app's "Sign up" flow (or Auth dashboard).
--   2. Note your user UUID from Authentication → Users.
--   3. If you already have data in these tables, set BACKFILL_USER_ID below
--      to your UUID. Otherwise leave it as NULL and skip the backfill block.
-- ============================================================================

-- --- 1. Add user_id columns ----------------------------------------------------
ALTER TABLE public.groups            ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.categories        ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.accounts          ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.transactions      ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.transfers         ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."netWorthEntries" ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- --- 2. (OPTIONAL) Backfill existing rows to your user -----------------------
-- Uncomment and set the UUID before running.
-- DO $$
-- DECLARE backfill_uid uuid := '00000000-0000-0000-0000-000000000000'; -- <-- your auth.users.id
-- BEGIN
--   UPDATE public.groups            SET user_id = backfill_uid WHERE user_id IS NULL;
--   UPDATE public.categories        SET user_id = backfill_uid WHERE user_id IS NULL;
--   UPDATE public.accounts          SET user_id = backfill_uid WHERE user_id IS NULL;
--   UPDATE public.transactions      SET user_id = backfill_uid WHERE user_id IS NULL;
--   UPDATE public.transfers         SET user_id = backfill_uid WHERE user_id IS NULL;
--   UPDATE public."netWorthEntries" SET user_id = backfill_uid WHERE user_id IS NULL;
-- END $$;

-- --- 3. Enforce NOT NULL (run only after backfill, or if tables are empty) ---
ALTER TABLE public.groups            ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.categories        ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.accounts          ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.transactions      ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.transfers         ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public."netWorthEntries" ALTER COLUMN user_id SET NOT NULL;

-- --- 4. Indexes for fast per-user queries ------------------------------------
CREATE INDEX IF NOT EXISTS idx_groups_user            ON public.groups(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user        ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user          ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user      ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transfers_user         ON public.transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_networth_user          ON public."netWorthEntries"(user_id);

-- --- 5. Enable Row Level Security --------------------------------------------
ALTER TABLE public.groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."netWorthEntries" ENABLE ROW LEVEL SECURITY;

-- --- 6. Policies: each user sees + mutates only their own rows ---------------
-- Helper macro: drop-then-create so this script is idempotent.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['groups','categories','accounts','transactions','transfers','netWorthEntries']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "own_select" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "own_insert" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "own_update" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "own_delete" ON public.%I', t);

    EXECUTE format('CREATE POLICY "own_select" ON public.%I FOR SELECT USING (user_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY "own_insert" ON public.%I FOR INSERT WITH CHECK (user_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY "own_update" ON public.%I FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', t);
    EXECUTE format('CREATE POLICY "own_delete" ON public.%I FOR DELETE USING (user_id = auth.uid())', t);
  END LOOP;
END $$;

-- ============================================================================
-- Done. Verify:
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';
--   SELECT * FROM pg_policies WHERE schemaname='public';
-- ============================================================================
