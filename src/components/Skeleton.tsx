/** Reusable skeleton placeholders for loading states. */

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded h-4 ${className}`} />;
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

/** Skeleton that mimics a stat card (icon + number + label). */
export function SkeletonCard() {
  return (
    <div className="card animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <SkeletonBlock className="h-8 w-8" />
        <div className="text-right space-y-1">
          <SkeletonBlock className="h-7 w-12 ml-auto" />
          <SkeletonLine className="w-20 ml-auto" />
        </div>
      </div>
      <SkeletonLine className="w-24 h-5 mb-1" />
      <SkeletonLine className="w-40" />
    </div>
  );
}

/** Skeleton for a table — configurable rows and columns. */
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden animate-fade-in">
      <div className="bg-gray-200 skeleton-shimmer h-12" />
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3">
            {Array.from({ length: cols }, (_, c) => (
              <SkeletonLine
                key={c}
                className={c === 0 ? "w-24" : c === 1 ? "flex-1" : "w-16"}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for the admin dashboard. */
export function SkeletonDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <SkeletonLine className="w-48 h-8 mb-2" />
        <SkeletonLine className="w-72" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonTable rows={5} cols={3} />
        <SkeletonTable rows={5} cols={3} />
      </div>
    </div>
  );
}

/** Skeleton for the tee-time slot grid. */
export function SkeletonSlotGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-fade-in">
      {Array.from({ length: 20 }, (_, i) => (
        <SkeletonBlock key={i} className="h-12" />
      ))}
    </div>
  );
}
