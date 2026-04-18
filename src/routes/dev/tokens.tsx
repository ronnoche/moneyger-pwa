import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { spring, ease, duration } from '@/styles/motion';
import { PageHeader } from '@/components/layout/page-header';

interface Swatch {
  name: string;
  varName: string;
  value: string;
}

const brandSwatches: Swatch[] = [
  { name: 'brand-50', varName: '--color-brand-50', value: 'oklch(0.97 0.025 165)' },
  { name: 'brand-100', varName: '--color-brand-100', value: 'oklch(0.94 0.05 165)' },
  { name: 'brand-500', varName: '--color-brand-500', value: 'oklch(0.66 0.14 165)' },
  { name: 'brand-600', varName: '--color-brand-600', value: 'oklch(0.58 0.14 165)' },
  { name: 'brand-700', varName: '--color-brand-700', value: 'oklch(0.50 0.13 165)' },
];

const inkSwatches: Swatch[] = [
  { name: 'ink-50', varName: '--color-ink-50', value: 'oklch(0.99 0.003 250)' },
  { name: 'ink-100', varName: '--color-ink-100', value: 'oklch(0.97 0.004 250)' },
  { name: 'ink-200', varName: '--color-ink-200', value: 'oklch(0.92 0.005 250)' },
  { name: 'ink-300', varName: '--color-ink-300', value: 'oklch(0.86 0.006 250)' },
  { name: 'ink-400', varName: '--color-ink-400', value: 'oklch(0.60 0.010 250)' },
  { name: 'ink-500', varName: '--color-ink-500', value: 'oklch(0.55 0.010 250)' },
  { name: 'ink-700', varName: '--color-ink-700', value: 'oklch(0.35 0.012 250)' },
  { name: 'ink-800', varName: '--color-ink-800', value: 'oklch(0.24 0.010 250)' },
  { name: 'ink-900', varName: '--color-ink-900', value: 'oklch(0.16 0.008 250)' },
];

const dangerSwatches: Swatch[] = [
  { name: 'danger-500', varName: '--color-danger-500', value: 'oklch(0.68 0.20 25)' },
  { name: 'danger-600', varName: '--color-danger-600', value: 'oklch(0.60 0.21 25)' },
  { name: 'danger-bg', varName: '--color-danger-bg', value: 'light: 0.96 / dark: 0.30' },
];

const semanticSwatches: Swatch[] = [
  { name: 'positive', varName: '--color-positive', value: 'oklch(0.58 0.14 165)' },
  { name: 'positive-bg', varName: '--color-positive-bg', value: 'light: 0.96 / dark: 0.30' },
  { name: 'warning', varName: '--color-warning', value: 'oklch(0.78 0.14 75)' },
  { name: 'warning-bg', varName: '--color-warning-bg', value: 'light: 0.96 / dark: 0.32' },
  { name: 'info', varName: '--color-info', value: 'oklch(0.65 0.13 245)' },
];

const surfaceSwatches: Swatch[] = [
  { name: 'bg', varName: '--color-bg', value: 'ink-50 / ink-900' },
  { name: 'surface', varName: '--color-surface', value: '#ffffff / ink-800' },
  { name: 'surface-2', varName: '--color-surface-2', value: 'ink-100 / 0.28' },
  { name: 'border', varName: '--color-border', value: 'ink-200 / 0.10' },
  { name: 'border-strong', varName: '--color-border-strong', value: 'ink-300 / 0.16' },
  { name: 'fg', varName: '--color-fg', value: 'ink-900 / 0.95' },
  { name: 'fg-muted', varName: '--color-fg-muted', value: 'ink-500 / 0.66' },
  { name: 'fg-subtle', varName: '--color-fg-subtle', value: 'ink-400 / 0.54' },
];

const chartSwatches: Swatch[] = [
  { name: 'chart-1', varName: '--color-chart-1', value: 'brand' },
  { name: 'chart-2', varName: '--color-chart-2', value: 'amber' },
  { name: 'chart-3', varName: '--color-chart-3', value: 'red' },
  { name: 'chart-4', varName: '--color-chart-4', value: 'violet' },
  { name: 'chart-5', varName: '--color-chart-5', value: 'blue' },
  { name: 'chart-6', varName: '--color-chart-6', value: 'mint' },
];

export default function DevTokens() {
  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 py-4 pb-24">
      <PageHeader title="Design tokens" />

      <Section title="Brand" hint="Composed teal-green. Primary CTAs, active nav, positive money.">
        <SwatchGrid swatches={brandSwatches} />
      </Section>

      <Section title="Ink" hint="Cool neutral scale. Text, borders, muted surfaces.">
        <SwatchGrid swatches={inkSwatches} />
      </Section>

      <Section title="Danger" hint="Destructive actions, overspent, debt.">
        <SwatchGrid swatches={dangerSwatches} />
      </Section>

      <Section title="Semantic" hint="Financial signaling beyond brand/danger.">
        <SwatchGrid swatches={semanticSwatches} />
      </Section>

      <Section
        title="Surface"
        hint="Remap in .dark. Use these instead of raw ink-* for theme-aware components."
      >
        <SwatchGrid swatches={surfaceSwatches} />
      </Section>

      <Section title="Chart" hint="Categorical palette, color-blind tested.">
        <SwatchGrid swatches={chartSwatches} />
      </Section>

      <Section title="Typography" hint="System font stack with tabular numerals.">
        <TypographyShowcase />
      </Section>

      <Section title="Radii" hint="Keep the existing scale. 12px is the default.">
        <RadiiShowcase />
      </Section>

      <Section title="Shadows" hint="Layered, low-opacity. FAB shadow is brand-tinted.">
        <ShadowsShowcase />
      </Section>

      <Section title="Motion" hint="Tap each card to replay. Springs for physics, tweens for color.">
        <MotionShowcase />
      </Section>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-[color:var(--color-fg-muted)]">{hint}</p>
      </div>
      {children}
    </section>
  );
}

function SwatchGrid({ swatches }: { swatches: Swatch[] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {swatches.map((s) => (
        <div
          key={s.name}
          className="overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]"
        >
          <div
            className="h-16"
            style={{ background: `var(${s.varName})` }}
            aria-hidden
          />
          <div className="px-3 py-2">
            <div className="text-xs font-mono">{s.name}</div>
            <div className="truncate text-[11px] text-[color:var(--color-fg-muted)]">
              {s.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TypographyShowcase() {
  return (
    <div className="space-y-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        text-[11px] / caps / 600
      </p>
      <p className="text-xs text-[color:var(--color-fg-muted)]">text-xs / 12 / 400 - meta</p>
      <p className="text-sm">text-sm / 14 / 400 - body</p>
      <p className="text-base">text-base / 16 / 400 - default UI</p>
      <p className="text-lg font-semibold">text-lg / 18 / 600 - page headers</p>
      <p className="text-xl font-semibold tabular-nums">text-xl / 22 / 600 · $1,234.56</p>
      <p className="text-2xl font-semibold tabular-nums">text-2xl / 28 / 600 · $12,345.67</p>
      <p className="text-3xl font-semibold tabular-nums">text-3xl / 36 / 600 · $98,765.43</p>
      <div className="pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          text-amount (hero)
        </p>
        <p className="text-amount">$2,450.00</p>
      </div>
      <div className="pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          font-mono
        </p>
        <p className="font-mono">0123456789 · -$123.45</p>
      </div>
    </div>
  );
}

function RadiiShowcase() {
  const radii = [
    { name: 'lg', cls: 'rounded-lg', px: 8 },
    { name: 'xl', cls: 'rounded-xl', px: 12 },
    { name: '2xl', cls: 'rounded-2xl', px: 16 },
    { name: 'full', cls: 'rounded-full', px: '∞' },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {radii.map((r) => (
        <div key={r.name} className="space-y-1 text-center">
          <div
            className={`${r.cls} h-16 w-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)]`}
          />
          <div className="text-xs font-mono">{r.name}</div>
          <div className="text-[11px] text-[color:var(--color-fg-muted)]">{r.px}</div>
        </div>
      ))}
    </div>
  );
}

function ShadowsShowcase() {
  const shadows = [
    { name: 'xs', style: { boxShadow: 'var(--shadow-xs)' } },
    { name: 'sm', style: { boxShadow: 'var(--shadow-sm)' } },
    { name: 'md', style: { boxShadow: 'var(--shadow-md)' } },
    { name: 'lg', style: { boxShadow: 'var(--shadow-lg)' } },
    { name: 'fab', style: { boxShadow: 'var(--shadow-fab)', background: 'var(--color-brand-600)' } },
    { name: 'sheet', style: { boxShadow: 'var(--shadow-sheet)' } },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 p-2">
      {shadows.map((s) => (
        <div key={s.name} className="space-y-2 text-center">
          <div
            className="mx-auto h-16 w-full rounded-xl bg-[color:var(--color-surface)]"
            style={s.style}
          />
          <div className="text-xs font-mono">{s.name}</div>
        </div>
      ))}
    </div>
  );
}

function MotionShowcase() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <SpringDemo name="default" preset={spring.default} />
        <SpringDemo name="snappy" preset={spring.snappy} />
        <SpringDemo name="gentle" preset={spring.gentle} />
        <SpringDemo name="bouncy" preset={spring.bouncy} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <EaseDemo name="out" curve={ease.out as unknown as number[]} />
        <EaseDemo name="in" curve={ease.in as unknown as number[]} />
        <EaseDemo name="inOut" curve={ease.inOut as unknown as number[]} />
        <EaseDemo name="ios" curve={ease.ios as unknown as number[]} />
      </div>
      <DurationTable />
    </div>
  );
}

function SpringDemo({
  name,
  preset,
}: {
  name: string;
  preset: { type: 'spring'; stiffness: number; damping: number; mass: number };
}) {
  const [key, setKey] = useState(0);
  return (
    <button
      type="button"
      onClick={() => setKey((k) => k + 1)}
      className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 text-left"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-mono">spring.{name}</span>
        <span className="text-[10px] text-[color:var(--color-fg-muted)]">tap to replay</span>
      </div>
      <div className="relative h-10 overflow-hidden rounded-lg bg-[color:var(--color-surface-2)]">
        <AnimatePresence>
          <motion.div
            key={key}
            initial={{ x: 0 }}
            animate={{ x: '100%' }}
            transition={preset}
            className="absolute left-0 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[color:var(--color-brand-600)]"
            style={{ marginLeft: -24 }}
          />
        </AnimatePresence>
      </div>
      <div className="mt-2 text-[10px] text-[color:var(--color-fg-muted)]">
        stiffness {preset.stiffness} · damping {preset.damping} · mass {preset.mass}
      </div>
    </button>
  );
}

function EaseDemo({ name, curve }: { name: string; curve: number[] }) {
  const [key, setKey] = useState(0);
  return (
    <button
      type="button"
      onClick={() => setKey((k) => k + 1)}
      className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3 text-left"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-mono">ease.{name}</span>
        <span className="text-[10px] text-[color:var(--color-fg-muted)]">tap to replay</span>
      </div>
      <div className="relative h-10 overflow-hidden rounded-lg bg-[color:var(--color-surface-2)]">
        <AnimatePresence>
          <motion.div
            key={key}
            initial={{ x: 0 }}
            animate={{ x: '100%' }}
            transition={{ duration: 0.6, ease: curve as [number, number, number, number] }}
            className="absolute left-0 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-[color:var(--color-info)]"
            style={{ marginLeft: -24 }}
          />
        </AnimatePresence>
      </div>
      <div className="mt-2 text-[10px] text-[color:var(--color-fg-muted)]">
        cubic-bezier({curve.join(', ')})
      </div>
    </button>
  );
}

function DurationTable() {
  return (
    <div className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-3">
      <div className="mb-2 text-xs font-mono">duration (seconds)</div>
      <ul className="grid grid-cols-2 gap-y-1 text-xs tabular-nums">
        <li>
          <span className="text-[color:var(--color-fg-muted)]">instant</span>{' '}
          {duration.instant.toFixed(2)}s
        </li>
        <li>
          <span className="text-[color:var(--color-fg-muted)]">fast</span>{' '}
          {duration.fast.toFixed(2)}s
        </li>
        <li>
          <span className="text-[color:var(--color-fg-muted)]">base</span>{' '}
          {duration.base.toFixed(2)}s
        </li>
        <li>
          <span className="text-[color:var(--color-fg-muted)]">slow</span>{' '}
          {duration.slow.toFixed(2)}s
        </li>
      </ul>
    </div>
  );
}
