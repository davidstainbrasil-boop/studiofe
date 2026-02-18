'use client';

import { useNotifications, Notification } from '@/hooks/use-notifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  Check,
  CheckCheck,
  FolderOpen,
  UserPlus,
  Video,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

const typeIcons: Record<string, React.ElementType> = {
  project_created: FolderOpen,
  collaborator_added: UserPlus,
  render_completed: Video,
  render_failed: AlertTriangle,
  system_notice: Info,
};

const typeLabels: Record<string, string> = {
  project_created: 'Projeto Criado',
  collaborator_added: 'Colaborador',
  render_completed: 'Render Concluído',
  render_failed: 'Render Falhou',
  system_notice: 'Sistema',
};

const typeBadgeVariants: Record<string, string> = {
  project_created: 'bg-blue-100 text-blue-800',
  collaborator_added: 'bg-purple-100 text-purple-800',
  render_completed: 'bg-green-100 text-green-800',
  render_failed: 'bg-red-100 text-red-800',
  system_notice: 'bg-gray-100 text-gray-800',
};

type FilterType = 'all' | 'unread' | string;

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, isLoading } = useNotifications(50);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    if (filter === 'unread') {
      filtered = filtered.filter((n) => !n.read);
    } else if (filter !== 'all') {
      filtered = filtered.filter((n) => n.type === filter);
    }
    return filtered;
  }, [notifications, filter]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    const unreadIds = filteredNotifications.filter((n) => !n.read).map((n) => n.id);
    setSelectedIds(new Set(unreadIds));
  };

  const handleMarkSelected = async () => {
    if (selectedIds.size === 0) return;
    await markAsRead(Array.from(selectedIds));
    setSelectedIds(new Set());
    toast.success(`${selectedIds.size} notificação(ões) marcada(s) como lida(s)`);
  };

  const handleMarkAll = async () => {
    await markAsRead();
    setSelectedIds(new Set());
    toast.success('Todas as notificações marcadas como lidas');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Notificações</h1>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Notificações</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} não lida{unreadCount > 1 ? 's' : ''}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkSelected}>
              <Check className="mr-1 h-3 w-3" />
              Marcar {selectedIds.size} selecionada(s)
            </Button>
          )}
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAll}>
              <CheckCheck className="mr-1 h-3 w-3" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={(val) => setFilter(val)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="unread">Não lidas</SelectItem>
            <Separator className="my-1" />
            <SelectItem value="project_created">Projetos Criados</SelectItem>
            <SelectItem value="collaborator_added">Colaboradores</SelectItem>
            <SelectItem value="render_completed">Renders Concluídos</SelectItem>
            <SelectItem value="render_failed">Renders com Falha</SelectItem>
            <SelectItem value="system_notice">Sistema</SelectItem>
          </SelectContent>
        </Select>

        {filteredNotifications.some((n) => !n.read) && (
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Selecionar não lidas
          </Button>
        )}

        <span className="text-sm text-muted-foreground ml-auto">
          {filteredNotifications.length} notificação(ões)
        </span>
      </div>

      {/* Table */}
      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhuma notificação</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === 'all'
                ? 'Você não tem notificações ainda.'
                : 'Nenhuma notificação com esse filtro.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={
                        filteredNotifications.filter((n) => !n.read).length > 0 &&
                        filteredNotifications
                          .filter((n) => !n.read)
                          .every((n) => selectedIds.has(n.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) selectAll();
                        else setSelectedIds(new Set());
                      }}
                    />
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="min-w-[200px]">Notificação</TableHead>
                  <TableHead className="text-right">Quando</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotifications.map((n) => {
                  const Icon = typeIcons[n.type] || Bell;
                  return (
                    <TableRow
                      key={n.id}
                      className={n.read ? 'opacity-60' : ''}
                      onClick={() => {
                        if (!n.read) {
                          markAsRead([n.id]);
                        }
                      }}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {!n.read && (
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={selectedIds.has(n.id)}
                            onChange={() => toggleSelect(n.id)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {n.read ? (
                          <Badge variant="secondary" className="text-xs">Lida</Badge>
                        ) : (
                          <Badge variant="default" className="text-xs">Nova</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <Badge
                            variant="secondary"
                            className={typeBadgeVariants[n.type] || ''}
                          >
                            {typeLabels[n.type] || n.type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {n.message}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(n.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
