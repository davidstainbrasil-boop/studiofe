# 🔒 Segurança da Função RPC `exec_sql`

## ⚠️ AVISO CRÍTICO DE SEGURANÇA

A função `exec_sql` permite execução de SQL dinâmico com privilégios elevados (`SECURITY DEFINER`).  
**Esta função é EXTREMAMENTE PERIGOSA se não configurada corretamente.**

---

## 📋 O Que É Esta Função?

A função `exec_sql` foi criada para permitir execução de migrações de banco de dados via API do Supabase, já que não temos acesso direto ao PostgreSQL em alguns ambientes.

**Arquivo:** `scripts/create-exec-sql.sql`

```sql
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;
```

---

## 🚨 RISCOS DE SEGURANÇA

### 1. **Execução Arbitrária de SQL**
- Qualquer SQL pode ser executado
- Permite DROP TABLE, DELETE sem WHERE, etc.
- Pode comprometer toda a base de dados

### 2. **Privilégios Elevados**
- `SECURITY DEFINER` executa com privilégios do criador da função
- Geralmente isso significa privilégios de superusuário

### 3. **Exposição via API**
- Se a função RPC estiver acessível via API pública, qualquer pessoa pode executar SQL

---

## ✅ CONFIGURAÇÃO SEGURA OBRIGATÓRIA

### Passo 1: Restringir Acesso à Função RPC

Execute no Supabase SQL Editor:

```sql
-- Revogar acesso público
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM authenticated;

-- Conceder acesso APENAS para service_role
-- Nota: service_role já tem acesso por padrão, mas vamos garantir
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
```

### Passo 2: Verificar Políticas RLS

Certifique-se de que não há políticas RLS que exponham esta função:

```sql
-- Verificar se há políticas relacionadas
SELECT * FROM pg_policies WHERE tablename = 'exec_sql';
```

### Passo 3: Validar Uso Apenas em Scripts Backend

**NUNCA** chame esta função:
- ❌ Do frontend (browser)
- ❌ De rotas API públicas sem autenticação
- ❌ De código que pode ser acessado por usuários não autorizados

**SEMPRE** use apenas:
- ✅ Scripts de migração (`scripts/migrate-db.ts`)
- ✅ Scripts administrativos com `SUPABASE_SERVICE_ROLE_KEY`
- ✅ Rotas API protegidas com verificação de admin

---

## 🔍 VERIFICAÇÃO DE SEGURANÇA

### Checklist de Segurança

Execute este script para verificar a configuração:

```sql
-- 1. Verificar permissões da função
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE 
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_type,
  array_to_string(p.proacl, ', ') as permissions
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'exec_sql';

-- 2. Verificar se há políticas RLS (deve retornar 0 linhas)
SELECT COUNT(*) as rls_policies_count
FROM pg_policies 
WHERE tablename = 'exec_sql';

-- 3. Verificar grants (deve mostrar apenas service_role)
SELECT 
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' 
  AND routine_name = 'exec_sql';
```

### Resultado Esperado

- ✅ `security_type` = `SECURITY DEFINER` (correto para migrações)
- ✅ `permissions` contém apenas `service_role` ou vazio (não público)
- ✅ `rls_policies_count` = 0 (sem políticas RLS)
- ✅ `grantee` = apenas `service_role` ou nenhum (não `public`, `anon`, `authenticated`)

---

## 🛡️ ALTERNATIVAS MAIS SEGURAS

### Opção 1: Usar Migrations do Supabase (RECOMENDADO)

Em vez de `exec_sql`, use o sistema de migrations do Supabase:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Criar migration
supabase migration new nome_da_migracao

# Aplicar migrations
supabase db push
```

### Opção 2: Função Mais Restritiva

Se precisar manter `exec_sql`, crie uma versão mais restritiva:

```sql
CREATE OR REPLACE FUNCTION public.exec_sql_safe(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Bloquear comandos perigosos
  IF sql_query ~* '(DROP|DELETE\s+FROM|TRUNCATE|ALTER\s+TABLE\s+DROP)' THEN
    RAISE EXCEPTION 'Comando perigoso não permitido: %', sql_query;
  END IF;
  
  -- Permitir apenas CREATE, ALTER (sem DROP), INSERT, UPDATE, SELECT
  IF sql_query !~* '^(CREATE|ALTER\s+TABLE\s+ADD|INSERT|UPDATE|SELECT)' THEN
    RAISE EXCEPTION 'Apenas comandos seguros são permitidos';
  END IF;
  
  EXECUTE sql_query;
END;
$$;
```

### Opção 3: Remover Completamente

Se possível, **remova a função completamente** e use apenas:
- Supabase Migrations
- Acesso direto ao PostgreSQL (quando disponível)
- Scripts que não precisam de SQL dinâmico

---

## 📝 DOCUMENTAÇÃO DE USO

### Uso Correto (Backend Only)

```typescript
// ✅ CORRETO: Script de migração
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ Apenas service_role
);

// Executar migration
const { error } = await supabase.rpc('exec_sql', {
  sql_query: 'CREATE TABLE IF NOT EXISTS ...'
});
```

### Uso Incorreto (NUNCA FAZER)

```typescript
// ❌ ERRADO: Do frontend
// NUNCA faça isso!
const { data } = await supabase.rpc('exec_sql', {
  sql_query: 'DROP TABLE users' // ⚠️ PERIGOSO!
});

// ❌ ERRADO: Rota API pública
export async function POST(req: Request) {
  const { sql } = await req.json();
  // NUNCA execute SQL dinâmico de input do usuário!
  await supabase.rpc('exec_sql', { sql_query: sql });
}
```

---

## 🔄 MANUTENÇÃO

### Quando Adicionar Novas Tabelas

Se você adicionar novas tabelas ao sistema, atualize a whitelist em:
- `estudio_ia_videos/src/lib/database/index.ts` → `ALLOWED_TABLES`

### Auditoria Regular

Execute auditoria de segurança a cada 3 meses:

1. Verificar permissões da função
2. Verificar logs de uso (se disponível)
3. Revisar scripts que usam `exec_sql`
4. Considerar migração para Supabase Migrations

---

## 📞 SUPORTE

Se você encontrar problemas de segurança relacionados a esta função:

1. **Imediato:** Revogue acesso público (Passo 1 acima)
2. **Curto prazo:** Implemente função `exec_sql_safe` (Opção 2)
3. **Longo prazo:** Migre para Supabase Migrations (Opção 1)

---

**Última Atualização:** 2026-01-13  
**Próxima Revisão:** 2026-04-13
