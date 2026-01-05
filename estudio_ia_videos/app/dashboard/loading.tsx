import { Skeleton } from "@/components/ui/skeleton"
import { GlassCard } from "@/components/ui/glass-card"

export default function Loading() {
    return (
        <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <GlassCard className="h-[400px]">
                    <Skeleton className="h-full w-full" />
                </GlassCard>
                <GlassCard className="h-[400px]">
                    <Skeleton className="h-full w-full" />
                </GlassCard>
            </div>
        </div>
    )
}
