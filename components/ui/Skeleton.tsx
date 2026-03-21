export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="skeleton h-4 w-32 rounded-lg" />
          <div className="skeleton h-3 w-20 rounded-lg" />
        </div>
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      <div className="skeleton h-3 w-full rounded-lg" />
      <div className="skeleton h-3 w-3/4 rounded-lg" />
    </div>
  );
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card p-4 space-y-2">
          <div className="skeleton h-8 w-12 rounded-lg" />
          <div className="skeleton h-3 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default function Skeleton({ className }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}
