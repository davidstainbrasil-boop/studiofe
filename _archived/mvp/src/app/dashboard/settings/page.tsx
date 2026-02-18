'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import useSWR from 'swr';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Máximo 100 caracteres'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function SettingsPage() {
  const { data: profile, mutate } = useSWR('/api/me', fetcher);
  const user = profile?.data;

  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    defaultValues: { name: '' },
  });

  // Sync form when data loads
  useEffect(() => {
    if (user?.name) {
      reset({ name: user.name });
    }
  }, [user?.name, reset]);

  const onSubmit = async (data: ProfileFormData) => {
    const parsed = profileSchema.safeParse(data);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Dados inválidos');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Falha ao salvar' }));
        throw new Error(err.error || 'Falha ao salvar');
      }
      mutate();
      toast.success('Perfil atualizado com sucesso');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie seu perfil e preferências da conta.
        </p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Informações básicas da sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ''} disabled />
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado por aqui.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                {...register('name', {
                  required: 'Nome é obrigatório',
                  minLength: { value: 1, message: 'Nome é obrigatório' },
                  maxLength: { value: 100, message: 'Máximo 100 caracteres' },
                })}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={saving || !isDirty}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              {isDirty && (
                <p className="text-xs text-muted-foreground">Alterações não salvas</p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Plan info */}
      <Card>
        <CardHeader>
          <CardTitle>Plano</CardTitle>
          <CardDescription>Seu plano e uso atual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Plano atual</span>
            <Badge variant="secondary" className="capitalize">
              {user?.planTier || 'free'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Projetos</span>
            <span className="text-sm font-medium">{user?._count?.projects ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Renders</span>
            <span className="text-sm font-medium">{user?._count?.renderJobs ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Membro desde</span>
            <span className="text-sm text-muted-foreground">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('pt-BR')
                : '—'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Danger zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
          <CardDescription>Ações irreversíveis. Tenha cuidado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Excluir conta</p>
              <p className="text-xs text-muted-foreground">
                Remove permanentemente todos os seus dados e projetos.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setDeleteEmail('');
                setDeleteOpen(true);
              }}
            >
              Excluir conta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Excluir conta permanentemente
            </DialogTitle>
            <DialogDescription>
              Esta ação é <strong>irreversível</strong>. Todos os seus projetos,
              vídeos renderizados e dados serão permanentemente removidos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-sm">
              Para confirmar, digite seu email:{' '}
              <strong className="select-all">{user?.email}</strong>
            </p>
            <Input
              placeholder="Digite seu email para confirmar"
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={
                deleting ||
                deleteEmail.toLowerCase() !== (user?.email || '').toLowerCase()
              }
              onClick={async () => {
                setDeleting(true);
                try {
                  const res = await fetch('/api/me', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ confirmEmail: deleteEmail }),
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({ error: 'Falha ao excluir' }));
                    throw new Error(err.error || 'Falha ao excluir conta');
                  }
                  toast.success('Conta excluída com sucesso. Redirecionando...');
                  setDeleteOpen(false);
                  // Redirect to home after short delay
                  setTimeout(() => router.push('/'), 1500);
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : 'Erro ao excluir conta'
                  );
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir conta permanentemente'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
