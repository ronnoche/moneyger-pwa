import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement>;

const commonProps: SVGProps<SVGSVGElement> = {
  width: 160,
  height: 160,
  viewBox: '0 0 160 160',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const DOT = 'fill-[color:var(--color-brand-500)]';

export function EnvelopesIllustration(props: Props) {
  return (
    <svg {...commonProps} className="text-[color:var(--color-ink-400)]" {...props}>
      <rect x="24" y="56" width="96" height="60" rx="4" />
      <path d="M24 60 L72 96 L120 60" />
      <rect x="40" y="40" width="96" height="60" rx="4" />
      <path d="M40 44 L88 80 L136 44" />
      <circle cx="132" cy="44" r="5" className={DOT} stroke="none" />
    </svg>
  );
}

export function ReceiptIllustration(props: Props) {
  return (
    <svg {...commonProps} className="text-[color:var(--color-ink-400)]" {...props}>
      <path d="M48 24 L112 24 L112 136 L104 128 L96 136 L88 128 L80 136 L72 128 L64 136 L56 128 L48 136 Z" />
      <path d="M64 52 L96 52" />
      <path d="M64 68 L96 68" />
      <path d="M64 84 L88 84" />
      <circle cx="104" cy="100" r="10" className={DOT} stroke="none" />
      <path d="M99 100 L103 104 L110 97" stroke="white" strokeWidth="2" />
    </svg>
  );
}

export function CoinPurseIllustration(props: Props) {
  return (
    <svg {...commonProps} className="text-[color:var(--color-ink-400)]" {...props}>
      <path d="M36 60 Q36 40 80 40 Q124 40 124 60" />
      <rect x="28" y="60" width="104" height="72" rx="12" />
      <circle cx="80" cy="96" r="12" />
      <circle cx="80" cy="96" r="3" className={DOT} stroke="none" />
      <path d="M70 36 L80 24 L90 36" />
    </svg>
  );
}

export function MountainIllustration(props: Props) {
  return (
    <svg {...commonProps} className="text-[color:var(--color-ink-400)]" {...props}>
      <path d="M16 128 L64 56 L96 96 L112 72 L144 128 Z" />
      <path d="M64 56 L64 20" />
      <path d="M64 20 L88 28 L64 36" className={DOT} fill="currentColor" stroke="none" />
      <path d="M16 128 L144 128" />
    </svg>
  );
}

export function MagnifierCrossedIllustration(props: Props) {
  return (
    <svg {...commonProps} className="text-[color:var(--color-ink-400)]" {...props}>
      <circle cx="72" cy="72" r="32" />
      <path d="M96 96 L128 128" />
      <path d="M52 72 L92 72" />
      <circle cx="120" cy="44" r="5" className={DOT} stroke="none" />
    </svg>
  );
}
