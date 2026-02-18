import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function RenderJobsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-4 w-72 animate-pulse rounded bg-muted" />
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-12 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-36 animate-pulse rounded bg-muted" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="h-10 border-b bg-muted/40" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 border-b p-4">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-5 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="ml-auto h-8 w-8 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
