# 🚨 AÇÃO IMEDIATA - Erro MIME Type Production

## Problema
```
webpack-*.js: Failed to load resource (400)
MIME type 'text/html' is not executable
```

## Causa
Vercel está servindo HTML de erro ao invés dos arquivos JavaScript do Next.js.

## ✅ Correções IMPLEMENTADAS

### 1. Criado `/estudio_ia_videos/vercel.json`
- Headers corretos para arquivos JavaScript
- Content-Type: application/javascript
- Cache-Control para assets estáticos

### 2. Atualizado `/estudio_ia_videos/next.config.mjs`
- `assetPrefix` para produção
- Configuração webpack melhorada
- Headers de segurança mantidos

### 3. Build local VALIDADO
```
✅ Creating an optimized production build ... 
✅ 100+ rotas compiladas com sucesso
```

---

## 🚀 DEPLOY AGORA (Escolha uma opção)

### **Opção 1: Script Automatizado (RECOMENDADO)**
```bash
cd /root/_MVP_Video_TecnicoCursos_v7
./fix-mime-deploy.sh
```

### **Opção 2: Vercel CLI Manual**
```bash
cd /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos
rm -rf .next .vercel/output
npm run build
vercel --prod --force --yes
```

### **Opção 3: Vercel Dashboard**
1. Acesse: https://vercel.com/dashboard
2. Projeto: `estudio_ia_videos`
3. **Settings > General:**
   - Root Directory: `estudio_ia_videos` ✅
   - Framework: Next.js ✅
4. **Deployments** → Redeploy (forçar novo build)

---

## 🔍 Validação Pós-Deploy

### 1. Testar Assets (2-3 min após deploy)
```bash
# Deve retornar HTTP 200 e Content-Type correto
curl -I https://cursostecno.com.br/_next/static/chunks/main-app-*.js

# Verificar conteúdo (deve ser JavaScript, não HTML)
curl https://cursostecno.com.br/_next/static/chunks/webpack-*.js | head -c 200
```

### 2. Browser DevTools
- Abrir Console (F12)
- Verificar Network tab
- TODOS os `_next/static/**/*.js` devem ter status **200**
- NENHUM erro de MIME type

### 3. Logs em Tempo Real
```bash
vercel logs --follow
```

---

## ⚠️ Se Ainda Não Funcionar

### A. Limpar Cache da Vercel
Dashboard > Settings > Advanced > **Clear Build Cache & Redeploy**

### B. Verificar Configuração da Vercel
```bash
cd /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos
cat .vercel/project.json

# Deve conter:
# "framework": "nextjs"
# "rootDirectory": null OU "estudio_ia_videos"
```

### C. Deploy em Novo Ambiente (teste isolado)
```bash
vercel --name estudio-ia-videos-hotfix
# Testar se funciona no novo deploy
```

### D. Verificar DNS/CDN
- Se usando Cloudflare: Purge Cache
- Testar diretamente pela URL da Vercel (bypass CDN)

---

## 📊 Status Atual

| Item | Status |
|------|--------|
| Arquivos corrigidos | ✅ 2/2 |
| Build local | ✅ Funcionando |
| Deploy pendente | ⏳ Aguardando execução |
| Validação | ⏳ Após deploy |

---

## 📞 Suporte

**Logs de Build:**
```bash
vercel logs <deployment-url>
```

**Rollback (se necessário):**
```bash
vercel list
vercel promote <previous-deployment-url>
```

**Vercel Support:** https://vercel.com/support

---

**Criado:** 14/01/2026 às $(date +%H:%M)  
**Arquivos modificados:**
- ✅ `/estudio_ia_videos/vercel.json` (NOVO)
- ✅ `/estudio_ia_videos/next.config.mjs` (ATUALIZADO)
- ✅ `/fix-mime-deploy.sh` (SCRIPT DE DEPLOY)

**Próximo passo:** Executar deploy conforme opções acima

---

## 🔄 ATUALIZAÇÃO (14/01/2026 - 19:05)

### Status Atual
- ✅ Arquivos corrigidos (vercel.json + next.config.mjs)
- ✅ Build local funcionando
- ⚠️ Deployments via CLI estão sendo interrompidos
- 🔍 Deploy ID: `66oCAfgorRqEHTXVTELP1WUEPgp5`
- 🌐 URL: https://estudioiavideos-lpu9uiny6-tecnocursos.vercel.app

### ⚡ AÇÃO RECOMENDADA (DASHBOARD)

**PASSO 1:** Configure o Root Directory
1. Abra https://vercel.com/tecnocursos/estudio_ia_videos/settings
2. General > Root Directory > Edit
3. Digite: `estudio_ia_videos`
4. Save

**PASSO 2:** Verifique Build Settings
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`

**PASSO 3:** Redeploy
1. https://vercel.com/tecnocursos/estudio_ia_videos/deployments
2. Encontre deployment `66oCAfgorRqEHTXVTELP1WUEPgp5`
3. Se está "Building", aguarde conclusão
4. Se falhou, clique "Redeploy"

### 📊 Arquivos Prontos
- `/vercel.json` (raiz) - Configuração alternativa
- `/estudio_ia_videos/vercel.json` - Headers corretos
- `/estudio_ia_videos/next.config.mjs` - AssetPrefix configurado
