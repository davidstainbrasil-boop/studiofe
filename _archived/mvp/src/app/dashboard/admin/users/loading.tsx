export default function AdminUsersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-1 h-4 w-60 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-64 animate-pulse rounded bg-muted" />
        <div className="h-9 w-28 animate-pulse rounded bg-muted" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="h-10 border-b bg-muted/40" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-36 animate-pulse rounded bg-muted" />
            <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
            <div className="ml-auto h-8 w-8 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
