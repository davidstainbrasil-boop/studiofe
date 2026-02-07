/**
 * Loading skeleton para PPTX to Video
 */
import { Skeleton } from '@/components/ui/skeleton';

export default function PPTXToVideoLoading() {
  return (
    <div className="container mx-auto py-8 max-w-5xl">
      {/* Header skeleton */}
      <div className="text-center mb-8">
        <Skeleton className="h-10 w-96 mx-auto mb-4" />
        <Skeleton className="h-5 w-64 mx-auto" />
      </div>

      {/* Steps indicator skeleton */}
      <div className="flex items-center justify-center gap-4 mb-12">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center gap-2">
            <Skeleton className="w-12 h-12 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="bg-card rounded-xl border p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <Skeleton className="w-48 h-48 rounded-lg mb-6" />
          <Skeleton className="h-6 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    </div>
  );
}
