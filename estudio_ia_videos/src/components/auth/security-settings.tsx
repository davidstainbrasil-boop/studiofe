'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { ShieldCheck, Key, Smartphone, Clock, AlertCircle, CheckCircle2, Loader2, Settings as SettingsIcon } from 'lucide-react';
import { getBrowserClient } from '@lib/supabase/browser';
import { logger } from '@lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@components/ui/alert';
import { Separator } from '@components/ui/separator';
import { TwoFactorSetup } from './two-factor-auth';
import { Switch } from '@components/ui/switch';
import { Label } from '@components/ui/label';

interface SecuritySettingsProps {
  userId: string;
}

interface Session {
  id: string;
  ip?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

export function SecuritySettings({ userId }: SecuritySettingsProps) {
  const supabase = getBrowserClient();
  const [isLoading, setIsLoading] = useState(true);
  const [has2FA, setHas2FA] = useState(false);
  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSecurityStatus();
  }, []);

  async function loadSecurityStatus() {
    setIsLoading(true);
    setError(null);

    try {
      // Verificar se 2FA está ativo
      const { data: factors } = await supabase.auth.mfa.listFactors();
      setHas2FA(factors?.totp && factors.totp.length > 0);

      // Buscar sessões ativas
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Em produção, buscar do banco de dados
        // Por enquanto, apenas a sessão atual
        setSessions([{
          id: 'current',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);
      }

      logger.info('Security status loaded', { has2FA });
    } catch (err) {
      logger.error('Failed to load security status', err instanceof Error ? err : new Error(String(err)));
      setError('Erro ao carregar configurações de segurança');
    } finally {
      setIsLoading(false);
    }
  }

  async function disable2FA() {
    if (!confirm('Tem certeza que deseja desabilitar a autenticação de 2 fatores?')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      
      if (factors?.totp && factors.totp.length > 0) {
        for (const factor of factors.totp) {
          const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
          if (error) throw error;
        }
      }

      setHas2FA(false);
      setSuccess('2FA desabilitado com sucesso');
      logger.info('2FA disabled');
    } catch (err) {
      logger.error('Failed to disable 2FA', err instanceof Error ? err : new Error(String(err)));
      setError('Erro ao desabilitar 2FA');
    } finally {
      setIsLoading(false);
    }
  }

  async function revokeSession(sessionId: string) {
    if (!confirm('Deseja encerrar esta sessão?')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Em produção, implementar revoke no backend
      await supabase.auth.signOut();
      setSuccess('Sessão encerrada');
    } catch (err) {
      logger.error('Failed to revoke session', err instanceof Error ? err : new Error(String(err)));
      setError('Erro ao encerrar sessão');
    } finally {
      setIsLoading(false);
    }
  }

  if (showSetup2FA) {
    return (
      <TwoFactorSetup
        onComplete={() => {
          setShowSetup2FA(false);
          setHas2FA(true);
          setSuccess('2FA configurado com sucesso!');
        }}
        onCancel={() => setShowSetup2FA(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Mensagens */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50 text-green-900">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Autenticação de 2 Fatores */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <CardTitle>Autenticação de 2 Fatores</CardTitle>
            </div>
            {has2FA && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Ativo
              </div>
            )}
          </div>
          <CardDescription>
            Adicione uma camada extra de segurança à sua conta
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Por que usar 2FA?</AlertTitle>
            <AlertDescription>
              A autenticação de dois fatores (2FA) adiciona uma camada extra de segurança, exigindo um código do seu celular além da senha.
            </AlertDescription>
          </Alert>

          {isLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : has2FA ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium">Aplicativo Autenticador</div>
                    <div className="text-sm text-muted-foreground">
                      Configurado e ativo
                    </div>
                  </div>
                </div>
                <Button variant="destructive" size="sm" onClick={disable2FA}>
                  Desabilitar
                </Button>
              </div>

              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  <strong>Códigos de recuperação:</strong> Certifique-se de ter guardado seus códigos de recuperação em um local seguro.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="mb-4 text-sm text-muted-foreground">
                  Configure a autenticação de dois fatores usando um aplicativo autenticador como:
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Google Authenticator
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Microsoft Authenticator
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Authy
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    1Password
                  </li>
                </ul>
              </div>

              <Button onClick={() => setShowSetup2FA(true)} className="w-full">
                <Smartphone className="mr-2 h-4 w-4" />
                Habilitar 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Sessões Ativas */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Sessões Ativas</CardTitle>
          </div>
          <CardDescription>
            Gerencie os dispositivos conectados à sua conta
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <div className="font-medium">Sessão Atual</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(session.created_at).toLocaleString('pt-BR')}
                  </div>
                </div>
                {session.id !== 'current' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeSession(session.id)}
                  >
                    Encerrar
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Outras Configurações */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <CardTitle>Outras Configurações</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificações de login</Label>
              <div className="text-sm text-muted-foreground">
                Receba alertas quando sua conta for acessada
              </div>
            </div>
            <Switch />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Detecção de dispositivos suspeitos</Label>
              <div className="text-sm text-muted-foreground">
                Alerta quando houver acesso de novo dispositivo
              </div>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
