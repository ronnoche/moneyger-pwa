import type { Transition } from 'motion/react';

export const spring = {
  default: { type: 'spring', stiffness: 300, damping: 30, mass: 1 } as const,
  snappy: { type: 'spring', stiffness: 500, damping: 35, mass: 0.8 } as const,
  gentle: { type: 'spring', stiffness: 180, damping: 26, mass: 1 } as const,
  bouncy: { type: 'spring', stiffness: 400, damping: 14, mass: 1 } as const,
} satisfies Record<string, Transition>;

export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  in: [0.64, 0, 0.78, 0] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  ios: [0.32, 0.72, 0, 1] as const,
};

export const duration = {
  instant: 0.12,
  fast: 0.18,
  base: 0.24,
  slow: 0.36,
};

export type SpringPreset = keyof typeof spring;
export type EasePreset = keyof typeof ease;
export type DurationPreset = keyof typeof duration;
