# 🔧 CORRIGIR CONEXÃO DATABASE (5 MINUTOS)

**Data**: 2026-01-17 19:50
**Problema**: Database connection bloqueada entre Vercel → Supabase
**Solução**: Usar connection pooling (porta 6543 em vez de 5432)

---

## 🎯 PROBLEMA IDENTIFICADO

### Status Atual:
```json
{
  "status": "unhealthy",
  "error": "Can't reach database server at db.imwqhvidwunnsvyrltkb.supabase.co:5432"
}
```

### Causa:
Vercel (serverless) precisa usar **connection pooling** do Supabase, não conexão direta.

### Solução:
Trocar porta **5432** (direct) por **6543** (pooled) + parâmetro `?pgbouncer=true`

---

## ✅ URLS CORRETAS

### DATABASE_URL (Para Vercel - COM POOLING):
```
postgresql://postgres:gW6bd7xtTO4QtJY4@db.imwqhvidwunnsvyrltkb.supabase.co:6543/postgres?pgbouncer=true
```
**Porta**: 6543 (pooling)
**Parâmetro**: ?pgbouncer=true

### DIRECT_DATABASE_URL (Para Migrations - SEM POOLING):
```
postgresql://postgres:gW6bd7xtTO4QtJY4@db.imwqhvidwunnsvyrltkb.supabase.co:5432/postgres
```
**Porta**: 5432 (direct)
**Uso**: Apenas para `prisma migrate`

---

## 🚀 OPÇÃO 1: Via Vercel Dashboard (MAIS FÁCIL)

### Passo a Passo:

1. **Acesse Vercel Dashboard**
   ```
   https://vercel.com/tecnocursos/estudio_ia_videos/settings/environment-variables
   ```

2. **Encontre DATABASE_URL**
   - Procure por "DATABASE_URL" na lista
   - Clique no ícone de editar (lápis)

3. **Atualize o Valor**
   - Cole a nova URL COM pooling:
   ```
   postgresql://postgres:gW6bd7xtTO4QtJY4@db.imwqhvidwunnsvyrltkb.supabase.co:6543/postgres?pgbouncer=true
   ```

4. **Salve**
   - Clique "Save"
   - Confirme que quer atualizar

5. **Redeploy**
   - Vá para: https://vercel.com/tecnocursos/estudio_ia_videos
   - Clique em "Redeploy" no deployment mais recente
   - OU vá em "Deployments" → ⋮ → "Redeploy"

6. **Aguarde** (2-3 minutos)
   - Build vai rodar novamente
   - Nova variável será aplicada

7. **Teste**
   ```bash
   curl https://estudioiavideos.vercel.app/api/health
   ```
   - Esperado: `"status": "healthy"`

---

## 💻 OPÇÃO 2: Via Vercel CLI

### Comandos:

```bash
cd /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos

# 1. Remover variável antiga
vercel env rm DATABASE_URL production

# 2. Adicionar nova (com pooling)
echo "postgresql://postgres:gW6bd7xtTO4QtJY4@db.imwqhvidwunnsvyrltkb.supabase.co:6543/postgres?pgbouncer=true" | vercel env add DATABASE_URL production

# 3. Redeploy
vercel --prod

# 4. Aguardar 2-3 min

# 5. Testar
curl https://estudioiavideos.vercel.app/api/health
```

---

## 🔍 OPÇÃO 3: Via Supabase Dashboard

Se preferir ver no Supabase:

1. **Acesse Supabase**
   ```
   https://supabase.com/dashboard/project/imwqhvidwunnsvyrltkb
   ```

2. **Vá para Settings → Database**

3. **Connection String**
   - Procure por "Connection Pooling"
   - Deve mostrar porta 6543
   - Copie a URL completa

4. **Use essa URL no Vercel**
   - Siga Opção 1 ou 2 acima

---

## ✅ COMO VALIDAR QUE FUNCIONOU

### Teste 1: Health Check
```bash
curl https://estudioiavideos.vercel.app/api/health
```

**Antes**:
```json
{
  "status": "unhealthy",
  "checks": {
    "database": {
      "status": "unhealthy",
      "error": "Can't reach database server"
    }
  }
}
```

**Depois (esperado)**:
```json
{
  "status": "healthy",
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 50
    },
    "supabase_storage": {
      "status": "healthy"
    }
  }
}
```

### Teste 2: No Browser
1. Abra: https://estudioiavideos.vercel.app
2. Faça login
3. Deve funcionar sem erros de database

---

## 📋 CHECKLIST

```
Antes de começar:
☐ Tenho acesso ao Vercel Dashboard
☐ Tenho a nova DATABASE_URL (com :6543)

Executar:
☐ Atualizar DATABASE_URL no Vercel
☐ Salvar mudança
☐ Trigger redeploy
☐ Aguardar build (2-3 min)

Validar:
☐ Testar /api/health
☐ Ver status "healthy"
☐ Testar login no site
☐ Confirmar que funciona
```

---

## 🎯 RESUMO VISUAL

### Mudança Necessária:

```diff
# ANTES (ERRADO - Porta 5432):
- DATABASE_URL=postgresql://...@db.xxx.supabase.co:5432/postgres

# DEPOIS (CORRETO - Porta 6543 + pooling):
+ DATABASE_URL=postgresql://...@db.xxx.supabase.co:6543/postgres?pgbouncer=true
```

### Por quê?
```
Vercel = Serverless = Muitas conexões simultâneas
Supabase Direct (5432) = Limite de conexões
Supabase Pooling (6543) = Conexões ilimitadas via PgBouncer
```

---

## ⚠️ IMPORTANTE

### NÃO mude DIRECT_DATABASE_URL!
```
DIRECT_DATABASE_URL continua com :5432
Ela é usada apenas para migrations
Migrations precisam de conexão direta
```

### Apenas DATABASE_URL muda:
```
✅ DATABASE_URL → :6543 (com ?pgbouncer=true)
✅ DIRECT_DATABASE_URL → :5432 (sem mudanças)
```

---

## 🚀 PRÓXIMOS PASSOS (APÓS CORREÇÃO)

Depois que o health check passar:

1. **Testar funcionalidades**
   - Login
   - Dashboard
   - Studio
   - Criar projeto

2. **Criar primeiro vídeo**
   - Acessar /studio
   - Novo projeto
   - Adicionar texto
   - Gerar vídeo

3. **Validar integração completa**
   - Upload funciona
   - Database salva
   - Storage Supabase OK
   - Render completa

---

## 💡 DICA RÁPIDA

Se tiver pressa, use **Opção 1 (Dashboard)**:
- Mais visual
- Menos chances de erro
- 5 cliques e pronto

Se preferir terminal, use **Opção 2 (CLI)**:
- Mais rápido
- 3 comandos e pronto

---

## 📊 ESTIMATIVA DE TEMPO

```
Via Dashboard:
  - Login Vercel: 30s
  - Encontrar variável: 30s
  - Editar e salvar: 1min
  - Redeploy: 2-3min
  - Testar: 30s
  Total: ~5 minutos

Via CLI:
  - Comandos: 1min
  - Redeploy: 2-3min
  - Testar: 30s
  Total: ~4 minutos
```

---

## ✅ RESULTADO ESPERADO

Após correção:

```
✅ Site: Online
✅ Frontend: Funcionando
✅ Database: Conectado
✅ Storage: Funcionando
✅ APIs: Respondendo
✅ Health: {"status":"healthy"}

Status Final: 100% OPERACIONAL 🎉
```

---

**Criado**: 2026-01-17 19:50
**Ação**: Atualizar DATABASE_URL para porta 6543
**Tempo**: 5 minutos
**Resultado**: Sistema 100% funcional
