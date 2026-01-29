# Blueprint de Transformação Profissional

Este documento contém todos os artefatos solicitados para elevar o nível do projeto **mvp-video-tecnico-cursos-v7**.

---

## 1. Estrutura de Pastas e Arquivos (Seção B)

Abaixo está a estrutura de diretórios recomendada, adotando uma arquitetura limpa e escalável baseada em domínios dentro de `src/`.

**Caminho Base:** `/root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/`

```text
/root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/
├── .github/
│   └── workflows/
│       └── ci-cd.yml           # Workflow Principal
├── .husky/                     # Hooks de git
├── public/                     # Assets estáticos
├── scripts/                    # Scripts de manutenção
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Rotas de Autenticação
│   │   ├── (dashboard)/        # Área logada
│   │   ├── api/                # Rotas de API
│   │   ├── layout.tsx          # Root Layout
│   │   └── globals.css         # Estilos Globais
│   ├── components/
│   │   ├── ui/                 # Componentes Base (Botões, Inputs)
│   │   ├── layout/             # Header, Sidebar
│   │   └── features/           # Componentes de Negócio
│   ├── config/                 # Configurações (env, constants)
│   ├── hooks/                  # Custom Hooks
│   ├── lib/                    # Utilitários e Clients
│   ├── services/               # Camada de Dados/API
│   ├── store/                  # Gerenciamento de Estado
│   ├── types/                  # Tipos TypeScript Globais
│   └── middleware.ts           # Middleware Next.js
├── .eslintrc.json
├── .prettierrc
├── components.json             # Shadcn config
├── next.config.mjs
├── package.json
└── tailwind.config.ts
```

---

## 2. Design System Premium (Seção C)

Configuração para uma UI moderna e consistente.

#### **Arquivo:** `/root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        heading: ["var(--font-heading)", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
```

#### **Arquivo:** `/root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
    --font-sans: 'Inter', sans-serif;
    --font-heading: 'Outfit', sans-serif;
  }
 
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

---

## 3. Lint, Prettier e Husky

#### **Arquivo:** `/root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/.eslintrc.json`

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "plugins": ["@typescript-eslint", "unused-imports"],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-explicit-any": "warn",
    "unused-imports/no-unused-imports": "error",
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
  }
}
```

#### **Arquivo:** `/root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100,
  "trailingComma": "all"
}
```

---

## 4. Workflow GitHub Actions (CI/CD) (Seção E)

#### **Arquivo:** `/root/_MVP_Video_TecnicoCursos_v7/.github/workflows/ci-cd.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  validate:
    name: Validate Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: './estudio_ia_videos/package-lock.json'
      
      - name: Install dependencies
        run: cd estudio_ia_videos && npm ci

      - name: Lint
        run: cd estudio_ia_videos && npm run lint

      - name: Type Check
        run: cd estudio_ia_videos && npm run type-check

      - name: Unit Tests
        run: cd estudio_ia_videos && npm run test:ci

  security:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Audit
        run: cd estudio_ia_videos && npm audit --audit-level=high

  deploy-staging:
    name: Deploy Staging
    needs: [validate, security]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel (Placeholder)
        run: echo "Deploying to Vercel Staging..."
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}

  deploy-production:
    name: Deploy Production
    needs: [validate, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel (Production)
        run: echo "Deploying to Vercel Production..."
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

---

## 5. Documentação (Seção F)

#### **Arquivo:** `/root/_MVP_Video_TecnicoCursos_v7/README.md`

```markdown
# 🎬 MVP Video Técnico Cursos

Plataforma profissional "All-in-One" para criação de vídeos técnicos com IA.

## Tecnologias
- **Frontend**: Next.js 14, TailwindCSS, Shadcn/ui
- **Backend/DB**: Supabase, PostgreSQL
- **AI/Video**: Remotion, ElevenLabs, OpenAI

## Começando

1. **Inst Instalar**: `npm install` (dentro de `estudio_ia_videos`)
2. **Configurar**: Copie `.env.example` para `.env.local`
3. **Rodar**: `npm run dev`

## Qualidade e CI/CD
Este projeto usa GitHub Actions para garantir qualidade. Execute `npm run lint` e `npm run test` antes de commitar.
```

#### **Arquivo:** `/root/_MVP_Video_TecnicoCursos_v7/docs/CONTRIBUTING.md`

```markdown
# Guia de Contribuição

1. Faça um Fork do projeto.
2. Crie uma branch para sua feature (`git checkout -b feat/nova-feature`).
3. Commit suas mudanças seguindo Conventional Commits (`git commit -m "feat: adiciona novo componente"`).
4. Abra um Pull Request.
```

---

## 6. Cabeçalhos de Segurança (Seção G)

#### **Arquivo:** `/root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https:;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self';
    connect-src 'self' https:;
    frame-src 'self' https:;
    object-src 'none';
    base-uri 'self';
    upgrade-insecure-requests;
  `;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader.replace(/\s{2,}/g, ' ').trim());

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set('Content-Security-Policy', cspHeader.replace(/\s{2,}/g, ' ').trim());
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

## 7. Performance (Seção H)

#### **Arquivo:** `/root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/next.config.mjs`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};
export default nextConfig;
```

---

## 8. Checklist Final (I)

Use este conteúdo para uma Issue no GitHub.

```markdown
# 🚀 Roadmap de Transformação Profissional

- [ ] **Setup Inicial**: Configurar ESLint, Prettier e Husky.
- [ ] **Migração de Estrutura**: Mover código para pasta `src/` e organizar por features.
- [ ] **Design System**: Implementar TailwindCSS e variáveis de tema.
- [ ] **CI/CD**: Configurar GitHub Actions para Lint, Test e Build.
- [ ] **Segurança**: Adicionar Middleware com CSP e Headers de segurança.
- [ ] **Documentação**: Atualizar README e criar CONTRIBUTING.md.
- [ ] **Performance**: Ativar otimização de imagens e monitoramento de bundle.
- [ ] **Auditoria**: Executar `npm audit` e corrigir vulnerabilidades críticas.
```
