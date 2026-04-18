import { useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import { Button, IconButton } from '@/components/ui/button';
import { MoneyInput } from '@/components/money-input';
import { SwipeRow } from '@/components/swipe-row';
import { AmountDisplay } from '@/components/ui/amount-display';
import { Skeleton, SkeletonRows } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { Numpad } from '@/components/ui/numpad';
import { toast } from '@/lib/toast';
import { PageHeader } from '@/components/layout/page-header';
import { Field } from '@/components/ui/field';

export default function DevComponents() {
  const [open, setOpen] = useState(false);
  const [destructiveOpen, setDestructiveOpen] = useState(false);
  const [typedOpen, setTypedOpen] = useState(false);
  const [amount, setAmount] = useState(1234.56);
  const [padValue, setPadValue] = useState(0);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24">
      <PageHeader title="Components" />

      <Section title="Button variants">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
      </Section>

      <Section title="Button sizes & states">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Icon buttons">
        <div className="flex items-center gap-3">
          <IconButton
            aria-label="Add"
            icon={<Plus size={20} strokeWidth={1.75} />}
          />
          <IconButton
            aria-label="Edit"
            size="sm"
            variant="secondary"
            icon={<Pencil size={16} strokeWidth={1.75} />}
          />
          <IconButton
            aria-label="Delete"
            variant="danger"
            icon={<Trash2 size={20} strokeWidth={1.75} />}
          />
          <IconButton
            aria-label="Favorite"
            variant="ghost"
            icon={<Star size={20} strokeWidth={1.75} />}
          />
        </div>
      </Section>

      <Section title="AmountDisplay">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <AmountDisplay value={1234.56} tone="positive" size="md" />
            <AmountDisplay value={-42.5} tone="negative" size="md" />
            <AmountDisplay value={0} size="md" />
          </div>
          <AmountDisplay value={amount} size="hero" animate tone="auto" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setAmount(amount + 100)}>
              +100
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setAmount(amount - 100)}
            >
              -100
            </Button>
          </div>
        </div>
      </Section>

      <Section title="MoneyInput (inline, expression on = or Enter)">
        <Field label="Type 12.50+3 then press =">
          <MoneyInput defaultValue="" />
        </Field>
      </Section>

      <Section title="Numpad (auto-decimal, 1234 = $12.34)">
        <div className="rounded-xl border border-[color:var(--color-border)] overflow-hidden">
          <div className="p-6 flex justify-center bg-[color:var(--color-bg)]">
            <AmountDisplay value={padValue} size="hero" tone="neutral" />
          </div>
          <Numpad value={padValue} onChange={setPadValue} />
        </div>
      </Section>

      <Section title="SwipeRow (single delete)">
        <div className="rounded-xl border border-[color:var(--color-border)] overflow-hidden">
          <SwipeRow onDelete={() => toast.success('Deleted')}>
            <div className="px-4 py-4">Swipe left to reveal delete</div>
          </SwipeRow>
        </div>
      </Section>

      <Section title="SwipeRow (multi-action + left actions)">
        <div className="rounded-xl border border-[color:var(--color-border)] overflow-hidden">
          <SwipeRow
            leftActions={[
              {
                label: 'Assign',
                icon: Check,
                tone: 'brand',
                onInvoke: () => toast.info('Assigned'),
              },
            ]}
            rightActions={[
              {
                label: 'Edit',
                icon: Pencil,
                tone: 'neutral',
                onInvoke: () => toast.info('Edit'),
              },
              {
                label: 'Delete',
                icon: Trash2,
                tone: 'danger',
                onInvoke: () => toast.error('Deleted'),
              },
            ]}
          >
            <div className="px-4 py-4">Swipe left or right</div>
          </SwipeRow>
        </div>
      </Section>

      <Section title="Skeleton">
        <div className="space-y-3">
          <Skeleton width={180} height={24} />
          <Skeleton width={120} height={16} />
          <SkeletonRows count={3} />
        </div>
      </Section>

      <Section title="EmptyState illustrations">
        <div className="grid gap-6 sm:grid-cols-2">
          <EmptyState
            kind="envelopes"
            title="No categories yet"
            description="Set up groups and categories to start budgeting."
            action={<Button size="sm">Add a group</Button>}
          />
          <EmptyState
            kind="receipt"
            title="No transactions"
            description="Log your first transaction."
          />
          <EmptyState
            kind="coin-purse"
            title="No accounts"
            description="Add your first account."
          />
          <EmptyState
            kind="mountain"
            title="No goals yet"
            description="Set a target on any category to track progress."
          />
          <EmptyState
            kind="search"
            title="No results"
            description="Try a different filter or query."
          />
        </div>
      </Section>

      <Section title="Toasts (Sonner)">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => toast.success('Saved', 'Your changes were saved.')}
          >
            Success
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toast.info('Info', { description: 'Heads up.' })}
          >
            Info
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => toast.error('Error', 'Something went wrong.')}
          >
            Error
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              toast.withUndo('Transaction deleted', {
                label: 'Undo',
                onUndo: () => toast.success('Restored'),
              })
            }
          >
            With Undo
          </Button>
        </div>
      </Section>

      <Section title="ConfirmSheet">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setOpen(true)}>
            Simple confirm
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setDestructiveOpen(true)}
          >
            Destructive
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setTypedOpen(true)}
          >
            Typed confirmation
          </Button>
        </div>
        <ConfirmSheet
          open={open}
          onOpenChange={setOpen}
          title="Apply changes?"
          description="You can undo within 5 seconds."
          onConfirm={() => toast.success('Applied')}
        />
        <ConfirmSheet
          open={destructiveOpen}
          onOpenChange={setDestructiveOpen}
          title="Delete this item?"
          description="This cannot be undone."
          destructive
          confirmLabel="Delete"
          onConfirm={() => toast.error('Deleted')}
        />
        <ConfirmSheet
          open={typedOpen}
          onOpenChange={setTypedOpen}
          title="Reset all data"
          description="This will wipe every budget, transaction, and account."
          destructive
          confirmLabel="Reset everything"
          typedConfirmation="RESET"
          onConfirm={() => toast.error('Reset complete')}
        />
      </Section>

      <Section title="CommandPalette">
        <p className="text-sm text-[color:var(--color-fg-muted)]">
          Press{' '}
          <kbd className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-1.5 py-0.5 font-mono text-xs">
            Cmd / Ctrl
          </kbd>
          +
          <kbd className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] px-1.5 py-0.5 font-mono text-xs">
            K
          </kbd>{' '}
          to open the command palette.
        </p>
      </Section>

      <Section title="Tokens">
        <p className="text-sm text-[color:var(--color-fg-muted)]">
          Color scales, typography, shadows, motion curves:{' '}
          <a
            href="/dev/tokens"
            className="inline-flex items-center gap-1 text-[color:var(--color-brand-600)] underline"
          >
            /dev/tokens
            <ArrowUpRight size={14} strokeWidth={1.75} />
          </a>
        </p>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        {title}
      </h2>
      <div className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
        {children}
      </div>
    </section>
  );
}
