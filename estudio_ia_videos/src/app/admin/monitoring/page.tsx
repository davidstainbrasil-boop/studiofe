import { RateLimitDashboard } from '@components/admin/rate-limit-dashboard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'

export default function AdminMonitoringPage() {
    return (
        <div className="container mx-auto p-6">
            <Tabs defaultValue="rate-limits" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="rate-limits">Rate Limits</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="errors">Errors</TabsTrigger>
                </TabsList>

                <TabsContent value="rate-limits" className="space-y-4">
                    <RateLimitDashboard />
                </TabsContent>

                <TabsContent value="performance">
                    <div className="text-center py-12 text-muted-foreground">
                        Performance monitoring dashboard - Coming soon
                    </div>
                </TabsContent>

                <TabsContent value="errors">
                    <div className="text-center py-12 text-muted-foreground">
                        Error tracking dashboard - Coming soon
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
