'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, Copy, Download, Key } from 'lucide-react';
import { logger } from '@lib/logger';
import { getBrowserClient } from '@lib/supabase/browser';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@components/ui/card';
import { Separator } from '@components/ui/separator';
import QRCode from 'qrcode';

const setupSchema = z.object({
  verificationCode: z.string().length(6, 'O código deve ter 6 dígitos'),
});

const verifySchema = z.object({
  code: z.string().length(6, 'O código deve ter 6 dígitos'),
});

type SetupFormData = z.infer<typeof setupSchema>;
type VerifyFormData = z.infer<typeof verifySchema>;

interface TwoFactorSetupProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

interface TwoFactorVerifyProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * Componente para configurar 2FA pela primeira vez
 */
export function TwoFactorSetup({ onComplete, onCancel }: TwoFactorSetupProps) {
  const supabase = getBrowserClient();
  const [step, setStep] = useState<'generate' | 'verify' | 'complete'>('generate');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const form = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      verificationCode: '',
    },
  });

  // Gerar QR Code e secret
  useEffect(() => {
    if (step === 'generate') {
      generateTOTP();
    }
  }, [step]);

  async function generateTOTP() {
    setIsLoading(true);
    setError(null);

    try {
      // Enroll no MFA
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });

      if (error) throw error;

      if (!data) {
        throw new Error('Falha ao gerar código 2FA');
      }

      // Gerar QR Code
      const qrCode = await QRCode.toDataURL(data.totp.qr_code);
      setQrCodeUrl(qrCode);
      setSecret(data.totp.secret);

      logger.info('2FA TOTP generated', { factorId: data.id });
    } catch (err) {
      logger.error('2FA setup error', err instanceof Error ? err : new Error(String(err)));
      setError('Erro ao configurar 2FA. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmitVerification(data: SetupFormData) {
    setIsLoading(true);
    setError(null);

    try {
      // Verificar o código TOTP
      const { data: factors } = await supabase.auth.mfa.listFactors();
      
      if (!factors || factors.totp.length === 0) {
        throw new Error('Nenhum fator 2FA encontrado');
      }

      const factorId = factors.totp[0].id;

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: data.verificationCode,
      });

      if (verifyError) throw verifyError;

      // Gerar códigos de recuperação (simulado - em produção, gere no backend)
      const codes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );
      setRecoveryCodes(codes);

      setStep('complete');
      logger.info('2FA setup completed');
    } catch (err) {
      logger.error('2FA verification error', err instanceof Error ? err : new Error(String(err)));
      setError('Código inválido. Verifique e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(secret);
  }

  function downloadRecoveryCodes() {
    const blob = new Blob([recoveryCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (step === 'complete') {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-center">2FA Ativado!</CardTitle>
          <CardDescription className="text-center">
            Sua conta agora está mais segura
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <Key className="h-4 w-4" />
            <AlertTitle>Códigos de recuperação</AlertTitle>
            <AlertDescription>
              Guarde estes códigos em um local seguro. Você pode usá-los para acessar sua conta caso perca o acesso ao aplicativo autenticador.
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {recoveryCodes.map((code, i) => (
                <div key={i} className="p-2 bg-background rounded">
                  {code}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={downloadRecoveryCodes}
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar códigos
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigator.clipboard.writeText(recoveryCodes.join('\n'))}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar
            </Button>
          </div>
        </CardContent>

        <CardFooter>
          <Button className="w-full" onClick={onComplete}>
            Concluir
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurar Autenticação de 2 Fatores</CardTitle>
        <CardDescription>
          Adicione uma camada extra de segurança à sua conta
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Passo 1: Mostrar QR Code */}
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Escaneie o QR Code</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Use um aplicativo autenticador como Google Authenticator, Authy ou Microsoft Authenticator
            </p>
            
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : qrCodeUrl ? (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
              </div>
            ) : null}
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2">Ou digite manualmente</h3>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                {secret}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={copySecret}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Passo 2: Verificar código */}
          <div>
            <h3 className="font-semibold mb-2">2. Digite o código de 6 dígitos</h3>
            <form onSubmit={form.handleSubmit(onSubmitVerification)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Código de verificação</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest"
                  {...form.register('verificationCode')}
                  disabled={isLoading}
                  autoFocus
                />
                {form.formState.errors.verificationCode && (
                  <p className="text-xs text-red-600">
                    {form.formState.errors.verificationCode.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Verificar'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Componente para verificar 2FA no login
 */
export function TwoFactorVerify({ onSuccess, onCancel }: TwoFactorVerifyProps) {
  const supabase = getBrowserClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      code: '',
    },
  });

  async function onSubmit(data: VerifyFormData) {
    setIsLoading(true);
    setError(null);

    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      
      if (!factors || factors.totp.length === 0) {
        throw new Error('2FA não configurado');
      }

      const factorId = factors.totp[0].id;

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: data.code,
      });

      if (verifyError) throw verifyError;

      logger.info('2FA verification successful');
      onSuccess?.();
    } catch (err) {
      logger.error('2FA verification error', err instanceof Error ? err : new Error(String(err)));
      setError('Código inválido. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-center">Verificação de 2 Fatores</CardTitle>
        <CardDescription className="text-center">
          Digite o código de 6 dígitos do seu aplicativo autenticador
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="code">Código de verificação</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              className="text-center text-2xl tracking-widest"
              {...form.register('code')}
              disabled={isLoading}
              autoFocus
            />
            {form.formState.errors.code && (
              <p className="text-xs text-red-600">{form.formState.errors.code.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar'
              )}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancelar
              </Button>
            )}
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Perdeu acesso ao autenticador?</p>
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => {/* TODO: Implementar recovery codes */}}
            >
              Usar código de recuperação
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
