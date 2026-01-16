-- 🔒 Script de Verificação de Segurança da Função exec_sql
-- Execute este script no Supabase SQL Editor para verificar a configuração de segurança

-- ============================================
-- 1. VERIFICAR PERMISSÕES DA FUNÇÃO
-- ============================================
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE 
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_type,
  array_to_string(p.proacl, ', ') as permissions,
  CASE 
    WHEN p.proacl IS NULL THEN '⚠️ SEM RESTRIÇÕES - PERIGOSO!'
    WHEN array_to_string(p.proacl, ', ') LIKE '%public%' THEN '🚨 ACESSO PÚBLICO - CRÍTICO!'
    WHEN array_to_string(p.proacl, ', ') LIKE '%anon%' THEN '🚨 ACESSO ANON - CRÍTICO!'
    WHEN array_to_string(p.proacl, ', ') LIKE '%authenticated%' THEN '⚠️ ACESSO AUTENTICADO - PERIGOSO!'
    ELSE '✅ Configuração parece segura'
  END as security_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'exec_sql';

-- ============================================
-- 2. VERIFICAR GRANTS ESPECÍFICOS
-- ============================================
SELECT 
  grantee,
  privilege_type,
  CASE 
    WHEN grantee = 'public' THEN '🚨 CRÍTICO: Acesso público!'
    WHEN grantee = 'anon' THEN '🚨 CRÍTICO: Acesso anônimo!'
    WHEN grantee = 'authenticated' THEN '⚠️ PERIGOSO: Acesso autenticado!'
    WHEN grantee = 'service_role' THEN '✅ OK: Apenas service_role'
    ELSE '⚠️ Verificar: ' || grantee
  END as status
FROM information_schema.routine_privileges
WHERE routine_schema = 'public' 
  AND routine_name = 'exec_sql'
ORDER BY 
  CASE 
    WHEN grantee = 'public' THEN 1
    WHEN grantee = 'anon' THEN 2
    WHEN grantee = 'authenticated' THEN 3
    ELSE 4
  END;

-- ============================================
-- 3. VERIFICAR POLÍTICAS RLS (deve retornar 0)
-- ============================================
SELECT 
  COUNT(*) as rls_policies_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Nenhuma política RLS (correto)'
    ELSE '⚠️ ' || COUNT(*) || ' política(s) RLS encontrada(s)'
  END as status
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename LIKE '%exec_sql%';

-- ============================================
-- 4. RESUMO E RECOMENDAÇÕES
-- ============================================
DO $$
DECLARE
  public_access BOOLEAN;
  anon_access BOOLEAN;
  authenticated_access BOOLEAN;
  service_role_access BOOLEAN;
BEGIN
  -- Verificar acesso público
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema = 'public' 
      AND routine_name = 'exec_sql'
      AND grantee = 'public'
  ) INTO public_access;
  
  -- Verificar acesso anon
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema = 'public' 
      AND routine_name = 'exec_sql'
      AND grantee = 'anon'
  ) INTO anon_access;
  
  -- Verificar acesso authenticated
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema = 'public' 
      AND routine_name = 'exec_sql'
      AND grantee = 'authenticated'
  ) INTO authenticated_access;
  
  -- Verificar acesso service_role
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routine_privileges
    WHERE routine_schema = 'public' 
      AND routine_name = 'exec_sql'
      AND grantee = 'service_role'
  ) INTO service_role_access;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUMO DE SEGURANÇA DA FUNÇÃO exec_sql';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Acesso público: %', CASE WHEN public_access THEN '🚨 CRÍTICO!' ELSE '✅ OK' END;
  RAISE NOTICE 'Acesso anon: %', CASE WHEN anon_access THEN '🚨 CRÍTICO!' ELSE '✅ OK' END;
  RAISE NOTICE 'Acesso authenticated: %', CASE WHEN authenticated_access THEN '⚠️ PERIGOSO!' ELSE '✅ OK' END;
  RAISE NOTICE 'Acesso service_role: %', CASE WHEN service_role_access THEN '✅ OK' ELSE '⚠️ Verificar' END;
  RAISE NOTICE '========================================';
  
  IF public_access OR anon_access THEN
    RAISE WARNING '🚨 AÇÃO IMEDIATA NECESSÁRIA: Revogar acesso público/anônimo!';
    RAISE NOTICE 'Execute: REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM PUBLIC, anon;';
  END IF;
  
  IF authenticated_access THEN
    RAISE WARNING '⚠️ RECOMENDAÇÃO: Revogar acesso authenticated para maior segurança';
    RAISE NOTICE 'Execute: REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM authenticated;';
  END IF;
  
  IF NOT service_role_access THEN
    RAISE NOTICE 'Execute: GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;';
  END IF;
END $$;
