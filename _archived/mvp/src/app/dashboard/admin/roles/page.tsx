'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Shield, Plus } from 'lucide-react';
import useSWR from 'swr';
import { useState } from 'react';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface RoleData {
  id: string;
  name: string;
  description: string | null;
  permissions: Array<{ id: string; name: string; description: string | null }>;
  usersCount: number;
  createdAt: string;
}

export default function AdminRolesPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/roles', fetcher, {
    revalidateOnFocus: false,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const roles: RoleData[] = data?.data ?? [];

  const handleCreateRole = async () => {
    if (!roleName.trim()) {
      toast.error('Nome do role é obrigatório');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleName.trim(),
          description: roleDescription.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Falha ao criar role' }));
        throw new Error(err.error || 'Falha ao criar role');
      }

      mutate();
      setCreateOpen(false);
      setRoleName('');
      setRoleDescription('');
      toast.success('Role criado com sucesso');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar role');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Permissões e Roles</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Criar Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Role</DialogTitle>
              <DialogDescription>
                Defina um nome e descrição para o novo role.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="role-name">Nome</Label>
                <Input
                  id="role-name"
                  placeholder="ex: editor, reviewer..."
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-desc">Descrição (opcional)</Label>
                <Textarea
                  id="role-desc"
                  placeholder="O que esse role pode fazer..."
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateRole} disabled={creating || !roleName.trim()}>
                {creating ? 'Criando...' : 'Criar Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4 text-destructive text-center">
            Erro ao carregar roles. Verifique suas permissões de admin.
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && roles.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum role criado</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Crie roles para organizar permissões dos usuários.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && roles.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {role.name}
                  </CardTitle>
                  <Badge variant="secondary">{role.usersCount} usuários</Badge>
                </div>
                {role.description && (
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                )}
              </CardHeader>
              <CardContent>
                {role.permissions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem permissões atribuídas</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map((perm) => (
                      <Badge key={perm.id} variant="outline" className="text-xs">
                        {perm.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
