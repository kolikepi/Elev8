'use client';

/* ── Skeleton building blocks ─────────────────────────────────────── */

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-white/[0.06] rounded ${className}`}
    />
  );
}

/* ── Product Card Skeleton ────────────────────────────────────────── */
export function ProductCardSkeleton() {
  return (
    <div className="group">
      <div className="relative overflow-hidden bg-[#0a0a0a]">
        <Shimmer className="aspect-[3/4] rounded-none" />
      </div>
      <div className="mt-3 space-y-2">
        <Shimmer className="h-4 w-3/4" />
        <Shimmer className="h-4 w-1/3" />
        <div className="flex items-center space-x-1 pt-1">
          <Shimmer className="w-2.5 h-2.5 rounded-full" />
          <Shimmer className="w-2.5 h-2.5 rounded-full" />
          <Shimmer className="w-2.5 h-2.5 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/* ── Product Grid Skeleton (4 cards) ──────────────────────────────── */
export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ── Order Card Skeleton ──────────────────────────────────────────── */
export function OrderCardSkeleton() {
  return (
    <div className="border border-white/10 rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Shimmer className="h-5 w-36" />
          <Shimmer className="h-3 w-24" />
        </div>
        <Shimmer className="h-7 w-20 rounded-full" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <Shimmer className="h-4 w-28" />
        <Shimmer className="h-4 w-16" />
      </div>
    </div>
  );
}

/* ── Orders List Skeleton ─────────────────────────────────────────── */
export function OrdersListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <OrderCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ── Admin Table Row Skeleton ─────────────────────────────────────── */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 py-4 px-4 border-b border-white/5">
      {Array.from({ length: cols }).map((_, i) => (
        <Shimmer
          key={i}
          className={`h-4 ${
            i === 0 ? 'w-12' : i === 1 ? 'w-32' : i === cols - 1 ? 'w-20' : 'w-24'
          }`}
        />
      ))}
    </div>
  );
}

/* ── Admin Table Skeleton ─────────────────────────────────────────── */
export function AdminTableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white/5 rounded-lg overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-4 py-3 px-4 bg-white/[0.03] border-b border-white/10">
        {Array.from({ length: cols }).map((_, i) => (
          <Shimmer key={i} className={`h-3 ${i === 0 ? 'w-10' : 'w-20'}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </div>
  );
}

/* ── Stat Card Skeleton (Admin Dashboard) ─────────────────────────── */
export function StatCardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-3">
      <div className="flex items-center justify-between">
        <Shimmer className="h-3 w-20" />
        <Shimmer className="w-8 h-8 rounded" />
      </div>
      <Shimmer className="h-8 w-16" />
    </div>
  );
}

export function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ── Shop Page Full Skeleton ──────────────────────────────────────── */
export function ShopPageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-9 w-20 rounded-full" />
        ))}
      </div>
      <ProductGridSkeleton count={8} />
    </div>
  );
}
