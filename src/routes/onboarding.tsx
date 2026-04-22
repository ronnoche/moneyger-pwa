import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useDrag } from '@use-gesture/react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { inputClass } from '@/components/ui/field';
import { MoneyInput } from '@/components/money-input';
import { BucketDemo } from '@/components/illustrations/bucket-demo';
import { markOnboardingComplete } from '@/lib/onboarding';
import { createGroup } from '@/features/groups/repo';
import { createCategory } from '@/features/categories/repo';
import { createAccount } from '@/features/accounts/repo';
import { parseMoneyInput } from '@/lib/format';
import { toast } from '@/lib/toast';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/cn';
import { spring, ease, duration } from '@/styles/motion';

type Step = 0 | 1 | 2;

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [groupName, setGroupName] = useState('Monthly Bills');
  const [categoryName, setCategoryName] = useState('Rent');
  const [accountName, setAccountName] = useState('Checking');
  const [isCreditCard, setIsCreditCard] = useState(false);
  const [accountBalance, setAccountBalance] = useState('');
  const [busy, setBusy] = useState(false);

  const bucketValid =
    groupName.trim() !== '' && categoryName.trim() !== '';

  const steps = useMemo(
    () => [
      <StepExplain key="explain" />,
      <StepBucket
        key="bucket"
        groupName={groupName}
        categoryName={categoryName}
        onGroupName={setGroupName}
        onCategoryName={setCategoryName}
      />,
      <StepFinish
        key="finish"
        accountName={accountName}
        accountBalance={accountBalance}
        isCreditCard={isCreditCard}
        onAccount={setAccountName}
        onAccountBalance={setAccountBalance}
        onIsCreditCard={setIsCreditCard}
      />,
    ],
    [
      groupName,
      categoryName,
      accountName,
      accountBalance,
      isCreditCard,
    ],
  );

  function go(next: Step) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    haptics.light();
  }

  function handleSkip() {
    markOnboardingComplete();
    navigate('/', { replace: true });
  }

  const bind = useDrag(
    ({ last, movement: [mx], velocity: [vx], cancel }) => {
      if (!last) return;
      const threshold = 60;
      const fast = vx > 0.5;
      if ((mx < -threshold || (mx < 0 && fast)) && step < 2) {
        go((step + 1) as Step);
        cancel();
      } else if ((mx > threshold || (mx > 0 && fast)) && step > 0) {
        go((step - 1) as Step);
        cancel();
      }
    },
    { axis: 'x', filterTaps: true },
  );

  async function handleFinish() {
    if (busy) return;
    const trimmedAccount = accountName.trim();
    if (!bucketValid) {
      toast.error('Fill in the bucket and bucket list.');
      haptics.error();
      return;
    }
    if (!trimmedAccount) {
      toast.error('Account name is required.');
      haptics.error();
      return;
    }
    if (accountBalance.trim() === '') {
      toast.error('Enter the current balance of your account.');
      haptics.error();
      return;
    }
    const parsedBalance = parseMoneyInput(accountBalance);
    if (!Number.isFinite(parsedBalance)) {
      toast.error('Invalid account balance.');
      haptics.error();
      return;
    }
    setBusy(true);
    try {
      const group = await createGroup({ name: groupName.trim() });
      await createCategory({
        groupId: group.id,
        name: categoryName.trim(),
        type: 'expense',
        goalType: 'none',
        goalAmount: 0,
        goalDueDate: null,
      });
      const openingBalance = isCreditCard
        ? -Math.abs(parsedBalance)
        : parsedBalance;
      await createAccount({
        name: trimmedAccount,
        isCreditCard,
        openingBalance,
      });
      markOnboardingComplete();
      haptics.confirm();
      navigate('/transactions/new?direction=inflow&category=atb', {
        replace: true,
      });
    } catch (err) {
      console.error(err);
      toast.error('Could not finish setup. Try again.');
      haptics.error();
      setBusy(false);
    }
  }

  return (
    <div className="safe-pt safe-pl safe-pr safe-pb mx-auto flex min-h-dvh max-w-xl flex-col px-6 py-6 text-[color:var(--color-fg)]">
      <div className="flex items-center justify-between">
        <Dots count={3} active={step} />
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm text-[color:var(--color-fg-muted)] active:text-[color:var(--color-fg)] px-2 py-1"
        >
          Skip
        </button>
      </div>

      <div
        {...bind()}
        className="relative flex-1 touch-pan-y overflow-hidden"
      >
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={step}
            custom={direction}
            variants={{
              enter: (d: 1 | -1) => ({ x: d * 60, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: 1 | -1) => ({ x: d * -60, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: spring.default,
              opacity: { duration: duration.fast, ease: ease.out },
            }}
            className="absolute inset-0 flex flex-col justify-center overflow-y-auto py-6"
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="pt-4">
        {step < 2 ? (
          <Button
            className="w-full"
            onClick={() => go((step + 1) as Step)}
            disabled={step === 1 && !bucketValid}
          >
            Next
            <ChevronRight size={18} strokeWidth={1.75} />
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={handleFinish}
            loading={busy}
            disabled={
              !accountName.trim() ||
              !bucketValid ||
              accountBalance.trim() === ''
            }
          >
            Record your first income
          </Button>
        )}
      </div>
    </div>
  );
}

function Dots({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex items-center gap-1.5" role="tablist">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          role="tab"
          aria-selected={i === active}
          className={cn(
            'h-1.5 rounded-full transition-all',
            i === active
              ? 'w-6 bg-[color:var(--color-brand-600)]'
              : 'w-1.5 bg-[color:var(--color-border-strong)]',
          )}
        />
      ))}
    </div>
  );
}

function StepExplain() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-full max-w-sm">
        <BucketDemo />
      </div>
      <h1 className="mt-6 text-2xl font-semibold">Give every dollar a job.</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
        You drop income into buckets. Spend from buckets. Whatever's left is
        waiting for its next job. Nothing untracked.
      </p>
    </div>
  );
}

function StepBucket({
  groupName,
  categoryName,
  onGroupName,
  onCategoryName,
}: {
  groupName: string;
  categoryName: string;
  onGroupName: (v: string) => void;
  onCategoryName: (v: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-semibold">Create your first bucket.</h1>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
        A bucket groups related bucket lists. Each bucket list holds money for
        one thing.
      </p>

      <div className="mt-6 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
        <label className="block text-xs font-medium text-[color:var(--color-fg-muted)]">
          Bucket name
        </label>
        <input
          autoFocus
          value={groupName}
          onChange={(e) => onGroupName(e.target.value)}
          className={cn(inputClass, 'mt-1.5 text-base')}
          placeholder="Monthly Bills"
        />

        <label className="mt-3 block text-xs font-medium text-[color:var(--color-fg-muted)]">
          Bucket list
        </label>
        <input
          value={categoryName}
          onChange={(e) => onCategoryName(e.target.value)}
          className={cn(inputClass, 'mt-1.5 text-base')}
          placeholder="Rent"
        />
      </div>

      <p className="mt-4 text-xs text-[color:var(--color-fg-muted)]">
        You can add more buckets and bucket lists later.
      </p>
    </div>
  );
}

function StepFinish({
  accountName,
  accountBalance,
  isCreditCard,
  onAccount,
  onAccountBalance,
  onIsCreditCard,
}: {
  accountName: string;
  accountBalance: string;
  isCreditCard: boolean;
  onAccount: (v: string) => void;
  onAccountBalance: (v: string) => void;
  onIsCreditCard: (v: boolean) => void;
}) {
  const balanceLabel = isCreditCard ? 'Current balance owed' : 'Current balance';
  const balanceHelp = isCreditCard
    ? 'How much you currently owe on this card. Enter 0 if paid off.'
    : 'How much is in this account right now. Enter 0 if empty.';

  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-semibold">Add your first account.</h1>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
        Where the money actually lives. You can add more later.
      </p>

      <label className="mt-6 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        First account
      </label>
      <input
        value={accountName}
        onChange={(e) => onAccount(e.target.value)}
        className={cn(inputClass, 'mt-2 text-base')}
        placeholder="Checking"
      />

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-5 w-5 rounded accent-[color:var(--color-brand-600)]"
          checked={isCreditCard}
          onChange={(e) => onIsCreditCard(e.target.checked)}
        />
        Credit card
      </label>

      <label
        htmlFor="onboarding-balance"
        className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]"
      >
        {balanceLabel}
      </label>
      <MoneyInput
        id="onboarding-balance"
        value={accountBalance}
        onChange={(e) => onAccountBalance(e.target.value)}
        className="mt-2 text-base"
        placeholder="0.00"
      />
      <p className="mt-1.5 text-xs text-[color:var(--color-fg-muted)]">
        {balanceHelp}
      </p>
    </div>
  );
}
