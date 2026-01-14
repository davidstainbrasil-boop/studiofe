# 🔧 Fix: Erro MIME Type 400 - Webpack Assets

## 🚨 Problema Identificado

```
Failed to load resource: the server responded with a status of 400 ()
Refused to execute script from 'https://cursostecno.com.br/_next/static/chunks/webpack-*.js' 
because its MIME type ('text/html') is not executable
```

**Causa Raiz:** Arquivos estáticos do Next.js não estão sendo servidos corretamente pela Vercel devido a:
1. Configuração incorreta do `vercel.json`
2. Falta de headers adequados para arquivos JavaScript
3. Possível problema com build ou cache

---

## ✅ Correções Aplicadas

### 1. Criado `vercel.json` correto

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "outputDirectory": ".next",
  "regions": ["gru1"],
  "headers": [
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/javascript; charset=utf-8"
        }
      ]
    }
  ]
}
```

### 2. Atualizado `next.config.mjs`

- Adicionado `assetPrefix` para produção
- Melhorada resolução de módulos webpack
- Configuração explícita de headers para assets

---

## 🚀 Passos para Deploy/Correção

### Opção A: Re-deploy pela Vercel Dashboard

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto `estudio_ia_videos`
3. Vá em **Settings > General**
4. **Root Directory:** Defina como `estudio_ia_videos`
5. **Framework Preset:** Next.js
6. **Build Command:** `npm run build`
7. **Output Directory:** `.next`
8. Salve as alterações
9. Vá em **Deployments** → Clique nos 3 pontos do último deploy → **Redeploy**

### Opção B: Re-deploy via CLI

```bash
cd /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos

# Limpar cache local
rm -rf .next
rm -rf node_modules/.cache

# Rebuild
npm run build

# Deploy
vercel --prod --force

# Ou com confirmação
vercel deploy --prod --yes
```

### Opção C: Force Clean Build na Vercel

```bash
# Via Vercel CLI com flags de limpeza
vercel --prod --force --no-cache

# Ou via API (requer VERCEL_TOKEN)
curl -X POST "https://api.vercel.com/v1/deployments" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "estudio_ia_videos",
    "gitSource": {
      "type": "github",
      "ref": "main",
      "repoId": "<YOUR_REPO_ID>"
    },
    "target": "production"
  }'
```

---

## 🔍 Validação Pós-Deploy

### 1. Testar Arquivos Estáticos

```bash
# Deve retornar 200 e Content-Type: application/javascript
curl -I https://cursostecno.com.br/_next/static/chunks/webpack-*.js

# Verificar se retorna JavaScript válido (não HTML)
curl https://cursostecno.com.br/_next/static/chunks/main-*.js | head -n 5
```

### 2. Verificar Console do Browser

```javascript
// Abra DevTools > Console
// NÃO deve haver erros de MIME type
// Verificar Network tab: todos os .js devem ter status 200
```

### 3. Lighthouse/Performance

```bash
# Score deve ser > 90
npx lighthouse https://cursostecno.com.br --view
```

---

## 🐛 Troubleshooting Adicional

### Se o erro persistir:

#### 1. Verificar Variáveis de Ambiente na Vercel

```bash
vercel env ls

# Necessárias:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY (Production)
```

#### 2. Limpar Cache da Vercel

Dashboard > Project Settings > Advanced > Clear Cache

#### 3. Verificar Build Logs

```bash
vercel logs <deployment-url> --follow
```

Procure por:
- ❌ `Error: Cannot find module`
- ❌ `ENOENT: no such file or directory`
- ❌ `webpack build failed`

#### 4. Rollback para Deploy Anterior (se necessário)

```bash
# Listar deployments
vercel list

# Promover deployment anterior
vercel promote <deployment-url>
```

---

## 📋 Checklist Final

- [ ] `vercel.json` atualizado na raiz do projeto Next.js
- [ ] `next.config.mjs` com `assetPrefix` e headers corretos
- [ ] Root Directory configurado como `estudio_ia_videos` na Vercel
- [ ] Build local funciona sem erros (`npm run build`)
- [ ] Re-deploy realizado com sucesso
- [ ] Validação de arquivos estáticos retornando 200
- [ ] Console do browser sem erros de MIME type
- [ ] Site carregando corretamente

---

## 🆘 Suporte Adicional

Se o problema persistir após todos os passos:

1. **Verificar DNS/CDN:**
   - Limpar cache do Cloudflare (se aplicável)
   - Verificar se o domínio está apontando corretamente

2. **Contato Vercel Support:**
   - https://vercel.com/support
   - Incluir deployment URL e logs de erro

3. **Alternativa Temporária:**
   ```bash
   # Deploy em novo projeto para isolar problema
   vercel --name estudio-ia-videos-test
   ```

---

## 📝 Notas Técnicas

- **MIME Type Error:** Ocorre quando o servidor retorna HTML (página de erro 400) ao invés do arquivo JavaScript
- **Status 400:** Indica que o Vercel não encontrou o arquivo ou houve erro na build
- **Solução:** Garantir que a estrutura de pastas e configuração do Next.js está correta para a Vercel

**Arquivos Críticos:**
- `estudio_ia_videos/vercel.json` (NOVO)
- `estudio_ia_videos/next.config.mjs` (ATUALIZADO)
- `estudio_ia_videos/package.json` (build scripts)

---

**Última Atualização:** 14/01/2026  
**Status:** Correções aplicadas, aguardando re-deploy
