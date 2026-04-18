import { AnimatePresence, motion } from 'motion/react';
import { useLocation, useOutlet } from 'react-router';
import { usePreviousLocation } from '@/hooks/use-previous-location';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { duration, ease } from '@/styles/motion';

export function PageTransition() {
  const outlet = useOutlet();
  const location = useLocation();
  const { direction } = usePreviousLocation();
  const reduced = useReducedMotion();

  const x = direction === 'back' ? -24 : 24;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={reduced ? { opacity: 0 } : { opacity: 0, x }}
        animate={{
          opacity: 1,
          x: 0,
          transition: {
            duration: reduced ? duration.instant : duration.base,
            ease: ease.ios,
          },
        }}
        exit={
          reduced
            ? { opacity: 0, transition: { duration: duration.instant } }
            : {
                opacity: 0,
                x: -x,
                transition: { duration: duration.fast, ease: ease.ios },
              }
        }
        className="min-h-full"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
