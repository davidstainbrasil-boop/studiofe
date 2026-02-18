'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, MoreHorizontal, Shield, CreditCard } from 'lucide-react';
import useSWR from 'swr';
import { useState } from 'react';
import { formatRelativeTime } from '@/lib/utils';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface UserData {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  planTier: string;
  roles: string[];
  createdAt: string;
  _count: { projects: number; renderJobs: number };
}

const planLabels: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  moderator: 'bg-orange-100 text-orange-800',
  user: 'bg-gray-100 text-gray-800',
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editPlan, setEditPlan] = useState('');
  const [saving, setSaving] = useState(false);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) params.set('search', search);

  const { data, error, isLoading, mutate } = useSWR(
    `/api/admin/users?${params.toString()}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const users: UserData[] = data?.data ?? [];
  const meta = data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 };

  const openEditDialog = (user: UserData) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditPlan(user.planTier);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setSaving(true);

    try {
      const changes: Record<string, string> = {};
      if (editRole !== editingUser.role) changes.role = editRole;
      if (editPlan !== editingUser.planTier) changes.planTier = editPlan;

      if (Object.keys(changes).length === 0) {
        setEditingUser(null);
        return;
      }

      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Falha ao salvar' }));
        throw new Error(err.error || 'Falha ao salvar');
      }

      mutate();
      setEditingUser(null);
      toast.success('Usuário atualizado com sucesso');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gerenciar Usuários</h1>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-9"
        />
      </div>

      {error && (
        <Card>
          <CardContent className="p-4 text-destructive text-center">
            Erro ao carregar usuários. Verifique suas permissões.
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-12 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && users.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum usuário encontrado.
          </CardContent>
        </Card>
      )}

      {!isLoading && users.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Projetos</TableHead>
                  <TableHead>Renders</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {(user.name || user.email).slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.name || 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={roleColors[user.role] || ''}
                      >
                        {user.role}
                      </Badge>
                      {user.roles.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {user.roles.map((role: string) => (
                            <Badge key={role} variant="outline" className="text-[10px]">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {planLabels[user.planTier] || user.planTier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{user._count.projects}</TableCell>
                    <TableCell className="text-sm">{user._count.renderJobs}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(new Date(user.createdAt))}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            <Shield className="mr-2 h-3 w-3" />
                            Editar Role & Plano
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-muted-foreground text-xs"
                            onClick={() => {
                              navigator.clipboard.writeText(user.id);
                              toast.success('ID copiado');
                            }}
                          >
                            Copiar ID
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span className="flex items-center text-sm text-muted-foreground px-3">
            Página {page} de {meta.totalPages} ({meta.total} total)
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              {editingUser?.name || editingUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role do Sistema
              </label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Plano
              </label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveUser} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
