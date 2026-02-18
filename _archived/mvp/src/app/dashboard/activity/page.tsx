'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  FileText,
  Video,
  Upload,
  LogIn,
  Settings,
  Trash2,
  Eye,
  Clock,
} from 'lucide-react';
import useSWR from 'swr';
import { useState } from 'react';
import { formatRelativeTime } from '@/lib/utils';

// ---- Types ----

interface ActivityEvent {
  id: string;
  eventType: string;
  eventData: Record<string, unknown> | null;
  sessionId: string | null;
  createdAt: string;
}

interface EventTypeCount {
  type: string;
  count: number;
}

interface ActivityResponse {
  success: boolean;
  data: ActivityEvent[];
  eventTypes: EventTypeCount[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ---- Icon map ----

const eventIcons: Record<string, React.ElementType> = {
  project_created: FileText,
  project_updated: Settings,
  project_deleted: Trash2,
  project_viewed: Eye,
  render_started: Video,
  render_completed: Video,
  render_failed: Video,
  render_cancelled: Video,
  pptx_uploaded: Upload,
  login: LogIn,
  logout: LogIn,
  page_view: Eye,
};

const eventLabels: Record<string, string> = {
  project_created: 'Projeto criado',
  project_updated: 'Projeto atualizado',
  project_deleted: 'Projeto excluído',
  project_viewed: 'Projeto visualizado',
  render_started: 'Render iniciado',
  render_completed: 'Render concluído',
  render_failed: 'Render falhou',
  render_cancelled: 'Render cancelado',
  pptx_uploaded: 'PPTX enviado',
  login: 'Login',
  logout: 'Logout',
  page_view: 'Página visualizada',
};

function formatEventType(type: string): string {
  return eventLabels[type] || type.replace(/_/g, ' ');
}

function getEventIcon(type: string): React.ElementType {
  return eventIcons[type] || Activity;
}

const eventColors: Record<string, string> = {
  project_created: 'text-green-600',
  project_deleted: 'text-red-600',
  render_started: 'text-blue-600',
  render_completed: 'text-green-600',
  render_failed: 'text-red-600',
  render_cancelled: 'text-yellow-600',
  login: 'text-primary',
};

// ---- Page ----

export default function ActivityPage() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', '30');
  if (typeFilter !== 'all') params.set('type', typeFilter);

  const { data, error, isLoading } = useSWR<ActivityResponse>(
    `/api/activity?${params.toString()}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 p-6">
            <Activity className="h-10 w-10 text-amber-500" />
            <p className="text-lg font-semibold">Erro ao carregar atividade</p>
            <p className="text-sm text-muted-foreground text-center">
              {error.message || 'Não foi possível carregar o histórico de atividades.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const events = data?.data ?? [];
  const eventTypes = data?.eventTypes ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, totalPages: 0, limit: 30 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" /> Atividade
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Histórico de todas as suas ações na plataforma
          </p>
        </div>
      </div>

      {/* Top summary + filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {eventTypes.map((et) => (
                <SelectItem key={et.type} value={et.type}>
                  {formatEventType(et.type)} ({et.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Badge variant="outline">
          {meta.total} {meta.total === 1 ? 'evento' : 'eventos'}
        </Badge>
      </div>

      {/* Event summary cards */}
      {eventTypes.length > 0 && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {eventTypes.slice(0, 5).map((et) => {
            const Icon = getEventIcon(et.type);
            return (
              <Card
                key={et.type}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => { setTypeFilter(et.type); setPage(1); }}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-bold">{et.count}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatEventType(et.type)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Clock className="mx-auto h-8 w-8 mb-3" />
              <p>Nenhuma atividade registrada.</p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-0">
                {events.map((event, idx) => {
                  const Icon = getEventIcon(event.eventType);
                  const color = eventColors[event.eventType] || 'text-muted-foreground';
                  const eventDataObj = event.eventData as Record<string, unknown> | null;
                  const projectName = eventDataObj?.projectName as string | undefined;
                  const details = eventDataObj?.details as string | undefined;

                  return (
                    <div key={event.id} className="relative flex items-start gap-4 py-3 pl-1">
                      {/* Dot on the line */}
                      <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background border ${color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">
                            {formatEventType(event.eventType)}
                          </p>
                          {projectName && (
                            <Badge variant="outline" className="text-xs font-normal">
                              {projectName}
                            </Badge>
                          )}
                        </div>
                        {details && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {details}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground/60 mt-1">
                          {formatRelativeTime(new Date(event.createdAt))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {meta.page} de {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              Próxima <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
