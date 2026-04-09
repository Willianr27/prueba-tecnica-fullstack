import type { ReactNode } from 'react';

type IconName = 'radar' | 'inbox' | 'alert';

interface EmptyStateProps {
  iconName?: IconName;
  title: string;
  description: string;
  hint?: string;
  action?: ReactNode;
}

export function EmptyState({
  iconName = 'radar',
  title,
  description,
  hint,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
      <Icon name={iconName} />
      <h3 className="mt-4 text-base font-medium text-white/80">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-white/50">{description}</p>
      {hint && <p className="mt-3 text-xs text-white/40">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function Icon({ name }: { name: IconName }) {
  const common = 'h-12 w-12 text-white/30';
  if (name === 'radar') {
    return (
      <svg
        className={common}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M19.07 4.93A10 10 0 1 1 5 19" />
        <path d="M12 12l4-4" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    );
  }
  if (name === 'alert') {
    return (
      <svg
        className={common}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
    );
  }
  return (
    <svg
      className={common}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}
