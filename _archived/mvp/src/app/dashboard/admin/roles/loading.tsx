import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function AdminRolesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-1 h-4 w-60 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded bg-muted" />
      </div>

      {/* Role cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-5 w-16 animate-pulse rounded bg-muted" />
                <div className="h-5 w-16 animate-pulse rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
