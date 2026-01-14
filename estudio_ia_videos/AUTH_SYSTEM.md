# 🔐 Sistema de Autenticação Melhorado

## Visão Geral

Sistema de autenticação completo e moderno implementado com Supabase Auth, incluindo:

- ✅ Login/Registro com email e senha
- ✅ OAuth (Google e GitHub)
- ✅ Recuperação de senha
- ✅ Autenticação de 2 fatores (2FA/TOTP)
- ✅ Remember Me
- ✅ Validação de senha forte
- ✅ Quick Login (desenvolvimento)
- ✅ Mensagens de erro amigáveis
- ✅ Design responsivo e moderno

## 📁 Estrutura de Arquivos

```
src/
├── app/
│   ├── login/
│   │   └── page.tsx                    # Página de login principal
│   ├── register/
│   │   └── page.tsx                    # Página de registro
│   ├── auth/
│   │   ├── callback/
│   │   │   └── route.ts                # Callback OAuth
│   │   ├── forgot-password/
│   │   │   └── page.tsx                # Recuperação de senha
│   │   └── reset-password/
│   │       └── page.tsx                # Redefinir senha
│   └── api/auth/
│       ├── login/route.ts              # API de login
│       ├── logout/route.ts             # API de logout
│       └── refresh/route.ts            # Refresh token
│
└── components/auth/
    ├── enhanced-auth-form.tsx          # Formulário principal (login/registro)
    ├── forgot-password-form.tsx        # Formulário de recuperação
    ├── reset-password-form.tsx         # Formulário de redefinição
    └── two-factor-auth.tsx             # Componentes 2FA
```

## 🚀 Funcionalidades

### 1. Login Aprimorado

**Arquivo:** `src/components/auth/enhanced-auth-form.tsx`

**Recursos:**
- Validação em tempo real com Zod
- Mensagens de erro contextuais
- Campo "Lembrar-me" com localStorage
- Alternância entre login e registro
- Quick login para desenvolvimento (3 roles: Admin, Editor, Viewer)

**Uso:**
```tsx
import { EnhancedAuthForm } from '@components/auth/enhanced-auth-form';

<EnhancedAuthForm mode="login" />
```

### 2. OAuth Social Login

Suporte para Google e GitHub OAuth:

```tsx
// O componente já inclui botões OAuth
<Button onClick={signInWithGoogle}>
  <Chrome className="mr-2 h-4 w-4" />
  Google
</Button>
```

**Configuração necessária:**
1. Configurar OAuth no Supabase Dashboard
2. Adicionar redirect URLs: `http://localhost:3000/auth/callback`
3. Configurar credenciais OAuth (Google/GitHub)

### 3. Recuperação de Senha

**Fluxo:**
1. Usuário solicita recuperação em `/auth/forgot-password`
2. Email enviado com link de recuperação
3. Link redireciona para `/auth/reset-password`
4. Usuário define nova senha
5. Redirecionamento para login

**Componente:**
```tsx
import { ForgotPasswordForm } from '@components/auth/forgot-password-form';

<ForgotPasswordForm />
```

### 4. Validação de Senha Forte

Requisitos obrigatórios:
- ✅ Mínimo 8 caracteres
- ✅ Pelo menos 1 letra maiúscula
- ✅ Pelo menos 1 letra minúscula
- ✅ Pelo menos 1 número
- ✅ Pelo menos 1 caractere especial

**Indicador visual:**
- Barra de progresso colorida (vermelho → amarelo → verde)
- Checklist com status de cada requisito

### 5. Autenticação de 2 Fatores (2FA)

**Componentes:**
- `TwoFactorSetup`: Configuração inicial do 2FA
- `TwoFactorVerify`: Verificação no login

**Setup Flow:**
1. Usuário habilita 2FA nas configurações
2. QR Code gerado para scan com app autenticador
3. Código de verificação requerido
4. 10 códigos de recuperação fornecidos
5. 2FA ativado

**Uso:**
```tsx
import { TwoFactorSetup, TwoFactorVerify } from '@components/auth/two-factor-auth';

// Configuração
<TwoFactorSetup
  onComplete={() => console.log('2FA configurado')}
  onCancel={() => console.log('Cancelado')}
/>

// Verificação no login
<TwoFactorVerify
  onSuccess={() => console.log('Verificado')}
  onCancel={() => console.log('Cancelado')}
/>
```

**Apps Autenticadores Recomendados:**
- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password

### 6. Remember Me

Salva o email no localStorage quando habilitado:

```tsx
// No login
if (data.rememberMe) {
  localStorage.setItem('remember_email', data.email);
}

// No carregamento
const rememberedEmail = localStorage.getItem('remember_email');
if (rememberedEmail) {
  form.setValue('email', rememberedEmail);
}
```

## 🎨 Design

### Página de Login

Layout de 2 colunas (desktop):
- **Esquerda:** Branding, features, testimonial, stats
- **Direita:** Formulário de autenticação

### Componentes UI

Todos os componentes seguem o design system:
- Shadcn/ui base
- Tailwind CSS
- Lucide icons
- Framer Motion (animações)

### Tema

- Dark mode nativo
- Gradientes modernos
- Glassmorphism
- Transições suaves

## 🔒 Segurança

### Rate Limiting

Implementado no middleware:

```typescript
// middleware.ts
const MAX_REQUESTS = 500; // por minuto
const WINDOW_SIZE = 60 * 1000; // 1 minuto
```

### Password Hashing

- Supabase usa bcrypt automaticamente
- Nunca armazene senhas em plain text

### Session Management

- Cookies HTTP-only
- Token refresh automático
- Expiração configurável

### CSRF Protection

- Tokens automáticos via Supabase
- Verificação em todas as rotas

## 📝 Schemas de Validação

### Login Schema
```typescript
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  rememberMe: z.boolean().optional(),
});
```

### Register Schema
```typescript
const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema, // Validação forte
  confirmPassword: z.string(),
  fullName: z.string().min(3),
  acceptTerms: z.boolean().refine(val => val === true),
});
```

## 🧪 Testing (Desenvolvimento)

### Quick Login

Credenciais de teste pré-configuradas:

| Role   | Email                  | Senha    |
|--------|------------------------|----------|
| Admin  | admin@mvpvideo.test    | senha123 |
| Editor | editor@mvpvideo.test   | senha123 |
| Viewer | viewer@mvpvideo.test   | senha123 |

**Uso:**
- Visível apenas em `NODE_ENV=development`
- Botões na parte inferior do form de login
- Bypass opcional via cookie `dev_bypass=true`

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Supabase Setup

1. Criar projeto no Supabase
2. Habilitar Email Auth
3. Configurar OAuth providers (opcional)
4. Configurar email templates
5. Habilitar MFA/2FA

### Middleware Config

```typescript
// middleware.ts
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

## 📊 Logs & Monitoring

Todos os eventos são logados via `@lib/logger`:

```typescript
logger.info('Login successful', { userId });
logger.error('Login failed', error, { email });
logger.warn('2FA verification failed', { attempts });
```

**Integração com Sentry (produção):**
- Erros automáticos
- Breadcrumbs de navegação
- User context

## 🚦 Fluxos de Usuário

### 1. Primeiro Acesso
```
Registro → Confirmação Email → Login → Dashboard
```

### 2. Login Existente
```
Login → (2FA?) → Dashboard
```

### 3. Esqueceu Senha
```
Forgot Password → Email → Reset → Login
```

### 4. Habilitar 2FA
```
Settings → Enable 2FA → Scan QR → Verify → Save Recovery Codes
```

## 🐛 Troubleshooting

### "Invalid login credentials"
- Verificar se email está confirmado
- Verificar se senha está correta
- Checar se Supabase está configurado

### OAuth não funciona
- Verificar redirect URLs
- Confirmar credenciais OAuth
- Testar em HTTPS (produção)

### 2FA não gera QR Code
- Verificar se MFA está habilitado no Supabase
- Instalar dependência: `npm install qrcode`

## 📦 Dependências

```json
{
  "@supabase/supabase-js": "^2.x",
  "@supabase/ssr": "^0.x",
  "zod": "^3.x",
  "react-hook-form": "^7.x",
  "@hookform/resolvers": "^3.x",
  "qrcode": "^1.x",
  "lucide-react": "^0.x"
}
```

## 🎯 Próximos Passos

- [ ] Biometria (WebAuthn)
- [ ] Login com Apple
- [ ] Login passwordless (Magic Links)
- [ ] Audit logs de sessões
- [ ] Detecção de dispositivos suspeitos
- [ ] Forçar 2FA para admins

## 📚 Referências

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Next.js Auth Guide](https://nextjs.org/docs/app/building-your-application/authentication)
- [OWASP Authentication Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

**Última atualização:** Janeiro 2026  
**Versão:** 2.0.0
