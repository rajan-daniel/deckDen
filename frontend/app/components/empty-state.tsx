type Props = {
  title: string;
  icon?: React.ReactNode;
};

export function CardStackIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
    >
      <rect x="5" y="7" width="12" height="15" rx="1.5" />
      <path d="M8 7V4.5A1.5 1.5 0 0 1 9.5 3h9A1.5 1.5 0 0 1 20 4.5v13a1.5 1.5 0 0 1-1.5 1.5H16" />
    </svg>
  );
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function ZoomIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
    >
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path strokeLinecap="round" d="M13 13l4.5 4.5M8.5 6v5M6 8.5h5" />
    </svg>
  );
}

/* Content only — no background/border of its own. Meant to sit centered
   inside a .tray-body so the tray's surface stays constant whether it's
   showing this placeholder or a full grid of cards. */
export function EmptyState({ title, icon }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 text-center px-6">
      {icon ?? <CardStackIcon className="h-7 w-7 text-neutral-600" />}
      <p className="text-sm text-neutral-500">{title}</p>
    </div>
  );
}
