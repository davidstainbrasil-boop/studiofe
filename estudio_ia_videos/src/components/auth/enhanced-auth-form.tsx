'use client';

import * as React from 'react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  Loader2,
  AlertCircle,
  Shield,
  User,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Github,
  Chrome,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { logger } from '@lib/logger';
import { getBrowserClient } from '@lib/supabase/browser';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@components/ui/card';
import { Separator } from '@components/ui/separator';
import { Checkbox } from '@components/ui/checkbox';

// Validação de senha forte
const passwordSchema = z.string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Pelo menos 1 letra maiúscula')
  .regex(/[a-z]/, 'Pelo menos 1 letra minúscula')
  .regex(/[0-9]/, 'Pelo menos 1 número')
  .regex(/[^A-Za-z0-9]/, 'Pelo menos 1 caractere especial');

const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter pelo menos 6 caracteres' }),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: passwordSchema,
  confirmPassword: z.string(),
  fullName: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  acceptTerms: z.boolean().refine(val => val === true, 'Você deve aceitar os termos'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

interface EnhancedAuthFormProps {
  mode?: 'login' | 'register';
}

// Indicador de força da senha
function PasswordStrengthIndicator({ password }: { password: string }) {
  const checks = [
    { test: password.length >= 8, label: '8+ caracteres' },
    { test: /[A-Z]/.test(password), label: 'Letra maiúscula' },
    { test: /[a-z]/.test(password), label: 'Letra minúscula' },
    { test: /[0-9]/.test(password), label: 'Número' },
    { test: /[^A-Za-z0-9]/.test(password), label: 'Caractere especial' },
  ];

  const strength = checks.filter(c => c.test).length;
  const color = strength <= 2 ? 'bg-red-500' : strength <= 3 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded ${i < strength ? color : 'bg-muted'}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-1">
            {check.test ? (
              <CheckCircle2 className="h-3 w-3 text-green-600" />
            ) : (
              <XCircle className="h-3 w-3 text-muted-foreground" />
            )}
            <span className={check.test ? 'text-green-600' : 'text-muted-foreground'}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EnhancedAuthForm({ mode = 'login' }: EnhancedAuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getBrowserClient();

  const [currentMode, setCurrentMode] = useState<'login' | 'register'>(mode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isDev = process.env.NODE_ENV === 'development';
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const trialParam = searchParams.get('trial') === 'true';
  const planParam = searchParams.get('plan');
  
  // Build callback URL with trial params
  const buildCallbackUrl = () => {
    let url = `${window.location.origin}/auth/callback`;
    const params = new URLSearchParams();
    
    if (trialParam) params.set('trial', 'true');
    if (planParam) params.set('plan', planParam);
    params.set('next', redirectUrl);
    
    return `${url}?${params.toString()}`;
  };

  // Form para login
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  // Form para registro
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      acceptTerms: false,
    },
  });

  const currentForm = currentMode === 'login' ? loginForm : registerForm;
  const watchPassword = registerForm.watch('password');

  // Login com email/senha
  async function onLoginSubmit(data: LoginFormData) {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      setSuccess('Login realizado com sucesso!');

      // Atualizar preferências de remember me
      if (data.rememberMe) {
        localStorage.setItem('remember_email', data.email);
      } else {
        localStorage.removeItem('remember_email');
      }

      setTimeout(() => {
        router.push(redirectUrl);
        router.refresh();
      }, 500);
    } catch (err) {
      logger.error('Login error', err instanceof Error ? err : new Error(String(err)));
      setError(err instanceof Error ? err.message : 'Email ou senha incorretos');
    } finally {
      setIsLoading(false);
    }
  }

  // Registro de novo usuário
  async function onRegisterSubmit(data: RegisterFormData) {
    setIsLoading(true);
    setError(null);

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
          },
          emailRedirectTo: buildCallbackUrl(),
        },
      });

      if (error) throw error;

      if (authData.user && !authData.session) {
        // Email de confirmação enviado
        setSuccess('Conta criada! Verifique seu email para confirmar o cadastro.');
      } else if (authData.user && authData.session) {
        // Conta criada e já logado (confirmação de email desabilitada)
        // Inicializar trial se parâmetros existirem
        if (trialParam || planParam) {
          try {
            await fetch('/api/billing/init-trial', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: authData.user.id,
                plan: planParam || 'pro',
                trialDays: 7,
              }),
            });
          } catch (e) {
            console.error('Error initializing trial:', e);
          }
        }
        
        setSuccess('Conta criada com sucesso!');
        setTimeout(() => {
          router.push(trialParam ? '/dashboard?trial=activated' : '/dashboard');
          router.refresh();
        }, 1000);
      }
    } catch (err) {
      logger.error('Register error', err instanceof Error ? err : new Error(String(err)));
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  }

  // Login com OAuth (Google)
  async function signInWithGoogle() {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: buildCallbackUrl(),
        },
      });

      if (error) throw error;
    } catch (err) {
      logger.error('Google OAuth error', err instanceof Error ? err : new Error(String(err)));
      setError('Erro ao autenticar com Google');
      setIsLoading(false);
    }
  }

  // Login com GitHub
  async function signInWithGithub() {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: buildCallbackUrl(),
        },
      });

      if (error) throw error;
    } catch (err) {
      logger.error('GitHub OAuth error', err instanceof Error ? err : new Error(String(err)));
      setError('Erro ao autenticar com GitHub');
      setIsLoading(false);
    }
  }

  // Quick login para desenvolvimento
  async function quickLogin(email: string, password: string) {
    setIsLoading(true);
    setError(null);

    try {
      loginForm.setValue('email', email);
      loginForm.setValue('password', password);
      await onLoginSubmit({ email, password, rememberMe: false });
    } catch (err) {
      setError('Falha no quick login');
      setIsLoading(false);
    }
  }

  React.useEffect(() => {
    // Restaurar email se remember me estava ativado
    const rememberedEmail = localStorage.getItem('remember_email');
    if (rememberedEmail && currentMode === 'login') {
      loginForm.setValue('email', rememberedEmail);
      loginForm.setValue('rememberMe', true);
    }
  }, [currentMode, loginForm]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">
          {currentMode === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
        </CardTitle>
        <CardDescription>
          {currentMode === 'login'
            ? 'Entre com suas credenciais para acessar o estúdio'
            : 'Preencha os dados abaixo para criar sua conta'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Mensagens de erro/sucesso */}
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

        {/* OAuth Buttons - Premium Style */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={signInWithGoogle}
            disabled={isLoading}
            className="h-11 bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200 group"
          >
            <Chrome className="mr-2 h-4 w-4 text-[#4285F4] group-hover:scale-110 transition-transform" />
            <span className="font-medium">Google</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={signInWithGithub}
            disabled={isLoading}
            className="h-11 bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200 group"
          >
            <Github className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
            <span className="font-medium">GitHub</span>
          </Button>
        </div>

        {/* Divisor Premium */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-card px-4 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              Ou continue com email
            </span>
          </div>
        </div>

        {/* Login Form */}
        {currentMode === 'login' && (
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-9"
                  {...loginForm.register('email')}
                  disabled={isLoading}
                />
              </div>
              {loginForm.formState.errors.email && (
                <p className="text-xs text-red-600">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  {...loginForm.register('password')}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-xs text-red-600">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={loginForm.watch('rememberMe')}
                onCheckedChange={(checked) => loginForm.setValue('rememberMe', checked as boolean)}
              />
              <Label
                htmlFor="rememberMe"
                className="text-sm font-normal cursor-pointer"
              >
                Lembrar-me neste dispositivo
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        )}

        {/* Register Form */}
        {currentMode === 'register' && (
          <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome completo"
                  className="pl-9"
                  {...registerForm.register('fullName')}
                  disabled={isLoading}
                />
              </div>
              {registerForm.formState.errors.fullName && (
                <p className="text-xs text-red-600">{registerForm.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-9"
                  {...registerForm.register('email')}
                  disabled={isLoading}
                />
              </div>
              {registerForm.formState.errors.email && (
                <p className="text-xs text-red-600">{registerForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  {...registerForm.register('password')}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {registerForm.formState.errors.password && (
                <p className="text-xs text-red-600">{registerForm.formState.errors.password.message}</p>
              )}
              {watchPassword && <PasswordStrengthIndicator password={watchPassword} />}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  {...registerForm.register('confirmPassword')}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {registerForm.formState.errors.confirmPassword && (
                <p className="text-xs text-red-600">{registerForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="acceptTerms"
                checked={registerForm.watch('acceptTerms')}
                onCheckedChange={(checked) => registerForm.setValue('acceptTerms', checked as boolean)}
              />
              <Label
                htmlFor="acceptTerms"
                className="text-sm font-normal cursor-pointer leading-tight"
              >
                Aceito os{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  termos de uso
                </Link>
                {' '}e{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  política de privacidade
                </Link>
              </Label>
            </div>
            {registerForm.formState.errors.acceptTerms && (
              <p className="text-xs text-red-600">{registerForm.formState.errors.acceptTerms.message}</p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar conta'
              )}
            </Button>
          </form>
        )}

        {/* Quick Login (Dev Only) */}
        {isDev && currentMode === 'login' && (
          <div className="space-y-2">
            <Separator />
            <p className="text-xs text-center text-muted-foreground">Desenvolvimento - Quick Login</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => quickLogin('admin@mvpvideo.test', 'senha123')}
                disabled={isLoading}
              >
                <Shield className="mr-1 h-3 w-3" />
                Admin
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => quickLogin('editor@mvpvideo.test', 'senha123')}
                disabled={isLoading}
              >
                <User className="mr-1 h-3 w-3" />
                Editor
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => quickLogin('viewer@mvpvideo.test', 'senha123')}
                disabled={isLoading}
              >
                <Eye className="mr-1 h-3 w-3" />
                Viewer
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-center text-muted-foreground">
          {currentMode === 'login' ? (
            <>
              Não tem uma conta?{' '}
              <button
                type="button"
                onClick={() => setCurrentMode('register')}
                className="text-primary hover:underline font-medium"
              >
                Criar conta
              </button>
            </>
          ) : (
            <>
              Já tem uma conta?{' '}
              <button
                type="button"
                onClick={() => setCurrentMode('login')}
                className="text-primary hover:underline font-medium"
              >
                Fazer login
              </button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
