import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({ title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-cream-200 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect x="6" y="8" width="20" height="18" rx="3" stroke="#b3ab9e" strokeWidth="1.5"/>
            <path d="M11 14h10M11 18h6" stroke="#b3ab9e" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M20 4l4 4-4 4" stroke="#c49572" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-sand-300/60" />
        <div className="absolute -bottom-1 -left-2 w-2 h-2 rounded-full bg-cream-300" />
      </div>
      <h3 className="font-display text-xl font-light text-ink-800 mb-2">{title}</h3>
      <p className="text-sm text-ink-400 max-w-xs leading-relaxed mb-6">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
