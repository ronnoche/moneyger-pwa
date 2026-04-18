import { useEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { motion, useAnimation, useMotionValue } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { haptics } from '@/lib/haptics';
import { spring } from '@/styles/motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export interface SwipeAction {
  label: string;
  icon: LucideIcon;
  onInvoke: () => unknown;
  tone?: 'danger' | 'brand' | 'neutral';
}

interface SwipeRowProps {
  children: ReactNode;
  className?: string;
  rightActions?: SwipeAction[];
  leftActions?: SwipeAction[];
  onDelete?: () => unknown;
  deleteLabel?: string;
}

const ACTION_WIDTH = 88;
const THRESHOLD = 44;

function toneClasses(tone: SwipeAction['tone'] | undefined): string {
  switch (tone) {
    case 'brand':
      return 'bg-brand-600 text-white';
    case 'neutral':
      return 'bg-[color:var(--color-ink-700)] text-white';
    case 'danger':
    default:
      return 'bg-danger-600 text-white';
  }
}

export function SwipeRow({
  children,
  className,
  rightActions,
  leftActions,
  onDelete,
  deleteLabel = 'Delete',
}: SwipeRowProps) {
  const reducedMotion = useReducedMotion();

  const effectiveRight: SwipeAction[] =
    rightActions && rightActions.length
      ? rightActions
      : onDelete
        ? [
            {
              label: deleteLabel,
              icon: Trash2,
              tone: 'danger',
              onInvoke: onDelete,
            },
          ]
        : [];
  const effectiveLeft: SwipeAction[] = leftActions ?? [];

  const rightReveal = effectiveRight.length * ACTION_WIDTH;
  const leftReveal = effectiveLeft.length * ACTION_WIDTH;

  const x = useMotionValue(0);
  const controls = useAnimation();
  const draggingRef = useRef(false);
  const startX = useRef(0);
  const startOffset = useRef(0);
  const lastHapticState = useRef<'center' | 'left' | 'right'>('center');
  const [isOpen, setIsOpen] = useState<'center' | 'left' | 'right'>('center');

  useEffect(() => {
    const unsub = x.on('change', (value) => {
      const state: 'center' | 'left' | 'right' =
        value <= -THRESHOLD ? 'right' : value >= THRESHOLD ? 'left' : 'center';
      if (state !== lastHapticState.current) {
        if (state !== 'center') haptics.light();
        lastHapticState.current = state;
      }
    });
    return () => unsub();
  }, [x]);

  function snapTo(target: number, next: 'center' | 'left' | 'right') {
    setIsOpen(next);
    lastHapticState.current = next;
    if (reducedMotion) {
      x.set(target);
      return;
    }
    void controls.start({ x: target, transition: spring.snappy });
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    startX.current = e.clientX;
    startOffset.current = x.get();
    controls.stop();
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const dx = e.clientX - startX.current;
    const next = clamp(startOffset.current + dx, -rightReveal, leftReveal);
    x.set(next);
  }

  function handlePointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const value = x.get();
    if (value <= -THRESHOLD && rightReveal > 0) {
      snapTo(-rightReveal, 'right');
    } else if (value >= THRESHOLD && leftReveal > 0) {
      snapTo(leftReveal, 'left');
    } else {
      snapTo(0, 'center');
    }
  }

  async function invoke(action: SwipeAction) {
    snapTo(0, 'center');
    await action.onInvoke();
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {effectiveRight.length > 0 && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex">
          {effectiveRight.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => invoke(a)}
              aria-label={a.label}
              style={{
                width: ACTION_WIDTH,
                pointerEvents: isOpen === 'right' ? 'auto' : 'none',
              }}
              className={cn(
                'flex items-center justify-center gap-1',
                toneClasses(a.tone),
              )}
            >
              <a.icon size={18} strokeWidth={1.75} />
              <span className="text-sm font-medium">{a.label}</span>
            </button>
          ))}
        </div>
      )}

      {effectiveLeft.length > 0 && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex">
          {effectiveLeft.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => invoke(a)}
              aria-label={a.label}
              style={{
                width: ACTION_WIDTH,
                pointerEvents: isOpen === 'left' ? 'auto' : 'none',
              }}
              className={cn(
                'flex items-center justify-center gap-1',
                toneClasses(a.tone),
              )}
            >
              <a.icon size={18} strokeWidth={1.75} />
              <span className="text-sm font-medium">{a.label}</span>
            </button>
          ))}
        </div>
      )}

      <motion.div
        style={{ x }}
        animate={controls}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="relative bg-[color:var(--color-surface)]"
      >
        {children}
      </motion.div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
