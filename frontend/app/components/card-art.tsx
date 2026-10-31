import { useId } from "react";

type Props = {
  /** Gradient start and end colors. */
  from: string;
  to: string;
  /** Changes the little landscape so a row of cards doesn't look copy-pasted. */
  variant?: number;
  /** Stack count shown as a red "×N" badge. */
  qty?: number;
  className?: string;
};

// A stand-in for card artwork, used only in the marketing mockups on the home
// page so they don't need real (copyrighted) card images.
export function CardArt({ from, to, variant = 0, qty, className = "" }: Props) {
  const raw = useId();
  const id = raw.replace(/[^a-zA-Z0-9]/g, "");
  const sunX = 34 + (variant % 3) * 16;
  const ridge = 78 + ((variant * 7) % 14);

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 100 140"
        aria-hidden="true"
        className="block h-full w-full overflow-hidden rounded-[7px] border border-white/10 bg-black"
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>
        <rect x="7" y="9" width="86" height="80" rx="4" fill={`url(#${id})`} />
        <circle cx={sunX} cy="34" r="12" fill="#fff" opacity="0.35" />
        <path
          d={`M7 89 L30 ${ridge - 20} L52 ${ridge - 6} L74 ${ridge - 26} L93 ${ridge - 4} L93 89 Z`}
          fill="#000"
          opacity="0.35"
        />
        <rect x="7" y="98" width="86" height="9" rx="2" fill="#fff" opacity="0.92" />
        <rect x="7" y="112" width="60" height="5" rx="2" fill="#fff" opacity="0.35" />
        <rect x="7" y="122" width="74" height="5" rx="2" fill="#fff" opacity="0.2" />
      </svg>
      {qty ? (
        <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-background bg-brand px-1 text-[11px] font-bold text-white">
          ×{qty}
        </span>
      ) : null}
    </div>
  );
}
