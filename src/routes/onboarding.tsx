import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useDrag } from '@use-gesture/react';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { inputClass } from '@/components/ui/field';
import { EnvelopeDemo } from '@/components/illustrations/envelope-demo';
import { markOnboardingComplete } from '@/lib/onboarding';
import { createGroup } from '@/features/groups/repo';
import { createCategory } from '@/features/categories/repo';
import { createAccount } from '@/features/accounts/repo';
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
  const [busy, setBusy] = useState(false);

  const steps = useMemo(
    () => [
      <StepExplain key="explain" />,
      <StepGroup
        key="group"
        value={groupName}
        onChange={setGroupName}
      />,
      <StepFinish
        key="finish"
        categoryName={categoryName}
        accountName={accountName}
        onCategory={setCategoryName}
        onAccount={setAccountName}
      />,
    ],
    [groupName, categoryName, accountName],
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
    const trimmedGroup = groupName.trim();
    const trimmedCategory = categoryName.trim();
    const trimmedAccount = accountName.trim();
    if (!trimmedGroup || !trimmedCategory || !trimmedAccount) {
      toast.error('All fields are required');
      haptics.error();
      return;
    }
    setBusy(true);
    try {
      const group = await createGroup({ name: trimmedGroup });
      await createCategory({
        groupId: group.id,
        name: trimmedCategory,
        type: 'expense',
        goalType: 'none',
        goalAmount: 0,
        goalDueDate: null,
      });
      await createAccount({ name: trimmedAccount, isCreditCard: false });
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
            className="absolute inset-0 flex flex-col pt-8"
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
            disabled={step === 1 && !groupName.trim()}
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
              !categoryName.trim() || !accountName.trim() || !groupName.trim()
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
        <EnvelopeDemo />
      </div>
      <h1 className="mt-6 text-2xl font-semibold">Give every dollar a job.</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
        You assign income to envelopes. Spend from envelopes. Whatever's left is
        waiting for its next job. Nothing untracked.
      </p>
    </div>
  );
}

function StepGroup({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-semibold">Name your first group.</h1>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
        Groups bundle related categories. Monthly Bills, Savings, Fun Money.
      </p>
      <label className="mt-6 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        Group name
      </label>
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, 'mt-2 text-base')}
        placeholder="Monthly Bills"
      />
    </div>
  );
}

function StepFinish({
  categoryName,
  accountName,
  onCategory,
  onAccount,
}: {
  categoryName: string;
  accountName: string;
  onCategory: (v: string) => void;
  onAccount: (v: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-semibold">Add a category and an account.</h1>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-fg-muted)]">
        One envelope to hold money. One account where the money actually lives.
        You can add more later.
      </p>

      <label className="mt-6 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        First category
      </label>
      <input
        value={categoryName}
        onChange={(e) => onCategory(e.target.value)}
        className={cn(inputClass, 'mt-2 text-base')}
        placeholder="Rent"
      />

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        First account
      </label>
      <input
        value={accountName}
        onChange={(e) => onAccount(e.target.value)}
        className={cn(inputClass, 'mt-2 text-base')}
        placeholder="Checking"
      />
    </div>
  );
}
