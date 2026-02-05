# Relatório de Correção - Erros Sentry 403 Forbidden

**Data:** 2026-02-04  
**Status:** ✅ RESOLVIDO

---

## 🔍 PROBLEMA IDENTIFICADO

### 1. Sentry 403 Forbidden ✅ RESOLVIDO
```
POST https://o123456.ingest.sentry.io/api/789012/envelope/ 403 (Forbidden)
```

**Causa:** Credenciais FAKE/PLACEHOLDER configuradas em `.env.local`
```bash
SENTRY_DSN="https://a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6@o123456.ingest.sentry.io/789012"
```

### 2. Endpoint `/api/pptx/upload` retornando 500 ✅ RESOLVIDO
**Causa:** UserId inválido (`'dev-user-123'`) não era um UUID válido para campo `@db.Uuid` no Prisma/Postgres

**Stack de erros:**
```
PrismaClientKnownRequestError: Error creating UUID, 
invalid character: expected [0-9a-fA-F-], found 'v' at 3
```

---

## ✅ CORREÇÕES APLICADAS

### 1. Desabilitação do Sentry em Desenvolvimento

#### Arquivo: `estudio_ia_videos/.env.local`
```bash
# ANTES
SENTRY_DSN="https://a1b2c3d4...@o123456.ingest.sentry.io/789012"
NEXT_PUBLIC_SENTRY_DSN="https://a1b2c3d4...@o123456.ingest.sentry.io/789012"

# DEPOIS
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DISABLED=true
NEXT_PUBLIC_SENTRY_DISABLED=true
```

### 2. Suporte à Variável `SENTRY_DISABLED`

#### Arquivo: `estudio_ia_videos/.env.local`
```bash
# ANTES
SENTRY_DSN="https://a1b2c3d4...@o123456.ingest.sentry.io/789012"
NEXT_PUBLIC_SENTRY_DSN="https://a1b2c3d4...@o123456.ingest.sentry.io/789012"

# DEPOIS
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DISABLED=true
NEXT_PUBLIC_SENTRY_DISABLED=true
```

### 2. Suporte à Variável `SENTRY_DISABLED`

#### Arquivo: `estudio_ia_videos/src/lib/monitoring/sentry.client.ts`
```typescript
const SENTRY_DISABLED = process.env.NEXT_PUBLIC_SENTRY_DISABLED === 'true' || 
                       process.env.SENTRY_DISABLED === 'true';

export function initSentry() {
  if (sentryInitialized) {
    return;
  }

  if (SENTRY_DISABLED) {
    console.log('ℹ️ Sentry desabilitado via SENTRY_DISABLED=true');
    return;
  }

  if (!SENTRY_DSN) {
    console.warn('⚠️ SENTRY_DSN não configurado - monitoramento desabilitado');
    return;
  }
  // ...
}
```

#### Arquivo: `estudio_ia_videos/src/lib/monitoring/sentry.server.ts`
```typescript
export function initSentry() {
  if (sentryInitialized) {
    return;
  }

  if (process.env.SENTRY_DISABLED === 'true') {
    console.log('ℹ️ Sentry desabilitado via SENTRY_DISABLED=true');
    return;
  }

  if (!SENTRY_DSN) {
    console.warn('⚠️ SENTRY_DSN não configurado - monitoramento desabilitado');
    return;
  }
  // ...
}
```

### 3. Correção do UserId de Bypass

**Problema:** `'dev-user-123'` não é UUID válido
**Solução:** Usar UUID real: `'00000000-0000-0000-0000-000000000001'`

#### Arquivo: `estudio_ia_videos/src/app/api/pptx/upload/route.ts`
```typescript
// ANTES
const bypassId = process.env.DEV_BYPASS_USER_ID || 'dev-user-123';

// DEPOIS
const bypassId = process.env.DEV_BYPASS_USER_ID || '00000000-0000-0000-0000-000000000001';
```

### 4. Criação do Usuário de Bypass no Banco

```sql
INSERT INTO auth.users (
  id, 
  email, 
  encrypted_password, 
  email_confirmed_at, 
  raw_user_meta_data, 
  created_at, 
  updated_at, 
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001', 
  'dev-bypass@estudio.ai', 
  '$2a$10$dev', 
  NOW(), 
  '{"name": "Dev Bypass User"}', 
  NOW(), 
  NOW(), 
  'authenticated'
) ON CONFLICT (id) DO NOTHING;
```

### 5. Correção da Geração de ProjectId

**Problema:** UUID gerado com `randomUUID()` causava conflito com `@db.Uuid`
**Solução:** Deixar o Postgres gerar o UUID via `uuid_generate_v4()`

#### Arquivo: `estudio_ia_videos/src/app/api/pptx/upload/route.ts`
```typescript
// ANTES
if (isNewProject) {
  projectId = randomUUID();
}
await prisma.projects.create({
  data: {
    id: projectId,  // UUID manual
    userId: user.id,
    // ...
  }
});

// DEPOIS
const createdProject = await prisma.projects.create({
  data: {
    // Removido: id: projectId
    userId: user.id,
    // ...
  }
});
projectId = createdProject.id;  // UUID gerado pelo DB
```

---

## 📊 VALIDAÇÃO

### Servidor Next.js
```bash
✅ Servidor iniciado com sucesso na porta 3001
✅ Health check: "healthy"
✅ Sem erros 403 do Sentry nos logs
✅ Endpoint /api/pptx/upload funcionando
```

### Teste de Upload PPTX
```bash
$ curl -X POST http://localhost:3001/api/pptx/upload \
  -F "file=@./estudio_ia_videos/dummy.pptx" \
  -H "x-user-id: dev-user-123" | jq

{
  "storagePath": "pptx/.../dummy.pptx",
  "fileName": "dummy.pptx",
  "fileSize": 6,
  "fileType": "application/octet-stream",
  "projectId": "8a039762-5fee-41f5-b90f-057d189650f5",
  "slidesCount": 0
}
```

---

## 🔧 COMO ATIVAR O SENTRY EM PRODUÇÃO

1. **Criar projeto no Sentry.io**
   - Acesse: https://sentry.io/
   - Crie um novo projeto Next.js
   - Copie o DSN fornecido

2. **Configurar variáveis de ambiente**
   ```bash
   # .env.production
   SENTRY_DSN="https://SEU_DSN_REAL@sentry.io/projeto"
   NEXT_PUBLIC_SENTRY_DSN="https://SEU_DSN_REAL@sentry.io/projeto"
   SENTRY_DISABLED=false
   NEXT_PUBLIC_SENTRY_DISABLED=false
   SENTRY_ENVIRONMENT="production"
   ```

3. **Verificar logs**
   ```bash
   # Console do navegador deve mostrar:
   ✅ Sentry client inicializado
   ```

---

## 📋 PRÓXIMOS PASSOS

### ✅ Problemas Resolvidos
1. ✅ Sentry 403 corrigido
2. ✅ UUID inválido corrigido  
3. ✅ Usuário de bypass criado
4. ✅ Upload PPTX funcional

### ⚠️ Observações
- Arquivo de teste `dummy.pptx` está vazio (6 bytes) → `slidesCount: 0`
- Para testar com PPTX real, use arquivo válido

---

## 📝 CRITÉRIO DE ACEITE

- [x] Erros 403 do Sentry eliminados
- [x] Código suporta `SENTRY_DISABLED=true`
- [x] Servidor Next.js funcional
- [x] Health check retorna "healthy"
- [x] Endpoint `/api/pptx/upload` testado com sucesso
- [x] UUID de bypass válido criado
- [x] Projeto criado no banco com UUID correto

---

## 🔗 ARQUIVOS MODIFICADOS

1. `/root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/.env.local`
2. `/root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/lib/monitoring/sentry.client.ts`
3. `/root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/lib/monitoring/sentry.server.ts`
4. `/root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos/src/app/api/pptx/upload/route.ts`
5. Banco de dados: Criado usuário `00000000-0000-0000-0000-000000000001`

---

**Relatório gerado automaticamente - MVP Vídeos TécnicoCursos v7**
