import { motion } from 'motion/react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const BILLS = [
  { id: 0, x: 30, delay: 0 },
  { id: 1, x: 90, delay: 0.4 },
  { id: 2, x: 150, delay: 0.8 },
  { id: 3, x: 210, delay: 1.2 },
];

export function EnvelopeDemo() {
  const reduced = useReducedMotion();
  return (
    <svg
      viewBox="0 0 260 180"
      width="100%"
      height="180"
      aria-hidden="true"
      className="text-[color:var(--color-ink-400)]"
    >
      <defs>
        <linearGradient id="billFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--color-brand-600)" stopOpacity="1" />
        </linearGradient>
      </defs>

      <rect
        x="16"
        y="112"
        width="228"
        height="52"
        rx="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M16 116 L130 160 L244 116"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="34"
        y="98"
        width="192"
        height="44"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      {BILLS.map((b) => (
        <motion.g
          key={b.id}
          initial={{ y: -72, x: b.x, opacity: 0, rotate: -8 }}
          animate={
            reduced
              ? { y: 96, opacity: 1, rotate: 0 }
              : {
                  y: [-72, 96, 96],
                  opacity: [0, 1, 0],
                  rotate: [-8, 0, 0],
                }
          }
          transition={
            reduced
              ? { duration: 0 }
              : {
                  duration: 2.4,
                  times: [0, 0.6, 1],
                  delay: b.delay,
                  repeat: Infinity,
                  repeatDelay: 1.4,
                  ease: [0.22, 1, 0.36, 1],
                }
          }
        >
          <rect
            x={-18}
            y={-10}
            width={36}
            height={20}
            rx={2}
            fill="url(#billFill)"
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontSize={10}
            fontWeight="600"
            fill="white"
          >
            $
          </text>
        </motion.g>
      ))}
    </svg>
  );
}
