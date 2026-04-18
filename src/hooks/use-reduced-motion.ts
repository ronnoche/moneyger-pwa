import { useReducedMotion as useMotionReducedMotion } from 'motion/react';

export function useReducedMotion(): boolean {
  const pref = useMotionReducedMotion();
  return pref === true;
}
