import { Card, CardContent } from '@/components/ui/card';
import { Bell } from 'lucide-react';

export default function NotificationsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Notificações</h1>
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-12 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
