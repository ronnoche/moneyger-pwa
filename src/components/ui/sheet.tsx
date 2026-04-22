import * as Dialog from '@radix-ui/react-dialog';
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion, useAnimation } from 'motion/react';
import { useDrag } from '@use-gesture/react';
import { cn } from '@/lib/cn';
import { haptics } from '@/lib/haptics';
import { spring, duration, ease } from '@/styles/motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

const DISMISS_VELOCITY = 0.5;
const DISMISS_FRACTION = 0.3;

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: SheetProps) {
  const reduced = useReducedMotion();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: duration.fast, ease: ease.out }}
                className="fixed inset-0 z-40 bg-black/50"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount onOpenAutoFocus={() => haptics.light()}>
              <motion.div
                initial={reduced ? { opacity: 0 } : { y: '100%' }}
                animate={
                  reduced
                    ? { opacity: 1, transition: { duration: duration.instant } }
                    : { y: 0, transition: spring.default }
                }
                exit={
                  reduced
                    ? { opacity: 0, transition: { duration: duration.instant } }
                    : { y: '100%', transition: spring.snappy }
                }
                className={cn(
                  'safe-pb fixed inset-x-0 bottom-0 z-50 mx-auto max-w-xl rounded-t-2xl bg-[color:var(--color-surface)] px-4 pb-4 pt-3 shadow-[var(--shadow-sheet)] outline-none',
                  className,
                )}
              >
                <SheetInner
                  reduced={reduced}
                  title={title}
                  description={description}
                  onDismiss={() => onOpenChange(false)}
                >
                  {children}
                </SheetInner>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}

interface SheetInnerProps {
  reduced: boolean;
  title?: string;
  description?: string;
  onDismiss: () => void;
  children: ReactNode;
}

function SheetInner({
  reduced,
  title,
  description,
  onDismiss,
  children,
}: SheetInnerProps) {
  const controls = useAnimation();
  const ref = useRef<HTMLDivElement | null>(null);

  const bind = useDrag(
    ({ down, movement: [, my], velocity: [, vy] }) => {
      if (reduced) return;
      const clamped = Math.max(0, my);
      if (down) {
        void controls.start({ y: clamped, transition: { duration: 0 } });
        return;
      }
      const height = ref.current?.offsetHeight ?? 400;
      const shouldDismiss =
        clamped > height * DISMISS_FRACTION || vy > DISMISS_VELOCITY;
      if (shouldDismiss) {
        onDismiss();
      } else {
        void controls.start({ y: 0, transition: spring.snappy });
      }
    },
    { axis: 'y', pointer: { touch: true }, from: () => [0, 0] },
  );

  return (
    <motion.div ref={ref} animate={controls} initial={false} style={{ y: 0 }}>
      <div
        {...bind()}
        aria-hidden
        className="mx-auto mb-3 flex h-6 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
      >
        <div className="h-1 w-10 rounded-full bg-[color:var(--color-ink-300)] dark:bg-[color:var(--color-border-strong)]" />
      </div>
      {title && (
        <Dialog.Title className="mb-1 text-base font-semibold">{title}</Dialog.Title>
      )}
      {description && (
        <Dialog.Description className="mb-3 text-sm text-ink-500">
          {description}
        </Dialog.Description>
      )}
      {children}
    </motion.div>
  );
}
