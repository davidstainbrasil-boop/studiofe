# 🎯 PLANO DE AÇÃO ALINHADO COM AGENTS.md

**Data:** 2026-01-13  
**Formato:** Seguindo regras obrigatórias de `AGENTS.md`  
**Baseado em:** Código existente analisado

---

## 🔴 PRIORIDADE CRÍTICA - ANÁLISE TÉCNICA DETALHADA

### 1. TypeScript Build Errors Ignorados 🔴

**[ANÁLISE]**
- **Arquivo:** `estudio_ia_videos/next.config.mjs`
- **Linha:** 9
- **Estado atual:** `ignoreBuildErrors: true` está ativo
- **Problema real:** 
  - Erros de tipo TypeScript são ignorados durante o build
  - Bugs de tipo podem passar para produção
  - Código pode quebrar em runtime sem aviso prévio
  - Violação de type safety do TypeScript

**[MUDANÇA]**
- **O que será alterado:** 
  - Linha 9: `ignoreBuildErrors: true` → `ignoreBuildErrors: false`
- **Por quê:** 
  - Garantir type safety em produção
  - Detectar erros de tipo antes do deploy
  - Melhorar qualidade e confiabilidade do código
- **Impacto:** 
  - Build pode falhar inicialmente até erros serem corrigidos
  - Necessário corrigir todos os erros TypeScript antes de remover flag

**[CRITÉRIO DE ACEITE]**
- Executar `npm run type-check` e obter 0 erros
- Build de produção (`npm run build`) completa sem erros de tipo
- Remover flag `ignoreBuildErrors: true`
- Validar que aplicação funciona corretamente após correções

---

### 2. ESLint Ignorado em Build 🔴

**[ANÁLISE]**
- **Arquivo:** `estudio_ia_videos/next.config.mjs`
- **Linha:** 12
- **Estado atual:** `ignoreDuringBuilds: true` está ativo
- **Problema real:**
  - Problemas de lint não são detectados no build
  - Código com problemas de qualidade pode ser deployado
  - Padrões de código inconsistentes não são bloqueados

**[MUDANÇA]**
- **O que será alterado:**
  - Linha 12: `ignoreDuringBuilds: true` → `ignoreDuringBuilds: false`
- **Por quê:**
  - Garantir qualidade de código consistente
  - Detectar problemas de lint antes do deploy
  - Manter padrões de código do projeto
- **Impacto:**
  - Build pode falhar até problemas de lint serem corrigidos
  - Necessário corrigir todos os problemas ESLint

**[CRITÉRIO DE ACEITE]**
- Executar `npm run lint` e obter 0 erros/warnings
- Build de produção completa sem erros de lint
- Remover flag `ignoreDuringBuilds: true`
- Validar que código segue padrões do projeto

---

### 3. Rotas Admin Sem Verificação de Admin 🔴

**[ANÁLISE]**
- **Arquivo:** `estudio_ia_videos/src/app/api/admin/cleanup/route.ts`
- **Linhas:** 30-31, 88-93
- **Estado atual:** 
  - Função `verifyAdmin()` existe mas não é chamada adequadamente
  - TODO comentado: "Check if user is admin"
  - Rotas permitem acesso a usuários autenticados não-admin
- **Problema real:**
  - Rotas `/api/admin/*` podem ser acessadas por usuários não-admin
  - Risco de segurança: operações administrativas expostas
  - Verificação inconsistente entre rotas admin

**Código existente encontrado:**
- `estudio_ia_videos/src/lib/auth/auth-middleware.ts` - função `withAuth()` com suporte `requireAdmin: true` ✅
- Múltiplas implementações de `verifyAdmin()` inconsistentes em diferentes arquivos

**[MUDANÇA]**
- **O que será alterado:**
  - Criar helper centralizado `requireAdmin()` em `estudio_ia_videos/src/lib/auth/admin-middleware.ts`
  - Aplicar em todas as rotas `/api/admin/*`:
    - `estudio_ia_videos/src/app/api/admin/cleanup/route.ts` (linhas 30, 88)
    - `estudio_ia_videos/src/app/api/admin/environment/route.ts` (linha 34)
    - `estudio_ia_videos/src/app/api/analytics/system/route.ts` (linha 34)
  - Remover TODOs de verificação de admin
- **Por quê:**
  - Garantir segurança: apenas admins podem acessar rotas administrativas
  - Padronizar verificação de admin em todo o projeto
  - Eliminar inconsistências entre rotas
- **Impacto:**
  - Usuários não-admin receberão 403 Forbidden em rotas admin
  - Melhora segurança do sistema
  - Requer testes de autorização

**[CRITÉRIO DE ACEITE]**
- Helper `requireAdmin()` criado e testado
- Todas as rotas `/api/admin/*` verificam admin antes de processar
- Testes de autorização passam (usuário não-admin recebe 403)
- TODOs de verificação de admin removidos
- Documentação atualizada

---

### 4. Variáveis de Ambiente Sem Validação 🔴

**[ANÁLISE]**
- **Arquivos:** 30 arquivos com `process.env.XXX!` (71 ocorrências)
- **Exemplos encontrados:**
  - `estudio_ia_videos/src/app/api/monitoring/route.ts` - linhas 54-55
  - `estudio_ia_videos/src/lib/supabase/server.ts` - múltiplas ocorrências
  - `estudio_ia_videos/src/app/api/auth/auto-login/route.ts` - linhas 70-71
- **Estado atual:** 
  - Uso de `!` (non-null assertion) assume que variável existe
  - Não há validação prévia
  - Script de validação existe (`scripts/validate-env.ts`) mas não é executado no startup
- **Problema real:**
  - Aplicação pode crashar em runtime se variável não estiver configurada
  - Erros silenciosos: aplicação inicia mas falha depois
  - Dificulta debugging de problemas de configuração

**[MUDANÇA]**
- **O que será alterado:**
  - Criar helper `getRequiredEnv(key: string): string` em `estudio_ia_videos/src/lib/env.ts`
  - Substituir todos os `process.env.XXX!` por `getRequiredEnv('XXX')`
  - Adicionar validação no startup (`estudio_ia_videos/src/instrumentation.ts` ou `_app.tsx`)
  - Usar script existente `scripts/validate-env.ts` no startup
- **Por quê:**
  - Detectar variáveis faltantes no startup (fail-fast)
  - Mensagens de erro claras indicando variável faltante
  - Prevenir crashes em runtime
  - Melhorar experiência de desenvolvimento
- **Impacto:**
  - Aplicação não inicia se variáveis obrigatórias faltarem
  - Mensagens de erro mais claras
  - Requer configuração completa de variáveis

**[CRITÉRIO DE ACEITE]**
- Helper `getRequiredEnv()` criado e testado
- Todas as ocorrências de `process.env.XXX!` substituídas
- Validação executa no startup da aplicação
- Aplicação falha com mensagem clara se variável obrigatória faltar
- Documentação de variáveis obrigatórias atualizada

---

### 5. Função RPC `exec_sql` - Auditoria de Segurança 🔴

**[ANÁLISE]**
- **Arquivo:** `scripts/create-exec-sql.sql`
- **Estado atual:** 
  - Função existe e permite execução de SQL dinâmico
  - `SECURITY DEFINER` com privilégios elevados
  - Usada em 112+ scripts diferentes
  - Documentação de segurança existe (`scripts/SECURITY_RPC_EXEC_SQL.md`)
- **Problema real:**
  - Risco de segurança crítico se não configurada corretamente
  - Permite execução arbitrária de SQL
  - Necessário verificar se permissões estão restritas corretamente

**[MUDANÇA]**
- **O que será alterado:**
  - Executar script de verificação de `scripts/SECURITY_RPC_EXEC_SQL.md`
  - Verificar permissões no banco de dados (deve ser apenas `service_role`)
  - Garantir que não há políticas RLS expondo a função
  - Considerar migração para Supabase Migrations (longo prazo)
- **Por quê:**
  - Garantir segurança: apenas `service_role` pode executar
  - Prevenir execução arbitrária de SQL por usuários não autorizados
  - Documentar uso correto da função
- **Impacto:**
  - Se permissões estiverem incorretas, pode ser vulnerabilidade crítica
  - Requer acesso ao banco de dados para verificação
  - Pode exigir ajustes de permissões

**[CRITÉRIO DE ACEITE]**
- Script de verificação executado com sucesso
- Permissões verificadas: apenas `service_role` pode executar
- Sem políticas RLS expondo a função
- Documentação de segurança atualizada
- Uso da função documentado e restrito a scripts administrativos

---

## 🟡 PRIORIDADE ALTA - ANÁLISE TÉCNICA DETALHADA

### 6. Console.log em Produção 🟡

**[ANÁLISE]**
- **Estatísticas:** 1.413 ocorrências em 216 arquivos
- **Estado atual:**
  - Muitos `console.log` ainda presentes no código
  - Sistema de logger profissional existe (`estudio_ia_videos/src/lib/logger.ts`) ✅
  - Script de migração existe (`scripts/migrate-console-to-logger.ts`) ✅
  - `removeConsole` configurado no Next.js (linha 34 de `next.config.mjs`) ✅
- **Problema real:**
  - Logs não estruturados dificultam debugging
  - Performance degradada em produção
  - Informações sensíveis podem vazar nos logs

**[MUDANÇA]**
- **O que será alterado:**
  - Executar `npm run migrate:console-to-logger`
  - Verificar arquivos críticos manualmente após migração
  - Garantir que `removeConsole` está ativo em produção
- **Por quê:**
  - Logs estruturados facilitam debugging e monitoramento
  - Melhor performance em produção
  - Logs centralizados e pesquisáveis
- **Impacto:**
  - Logs migrados para formato estruturado
  - Melhor observabilidade do sistema

**[CRITÉRIO DE ACEITE]**
- Script de migração executado com sucesso
- Console.log reduzido para <50 ocorrências (apenas casos especiais)
- Logs estruturados usando logger profissional
- Validação manual de arquivos críticos concluída

---

### 7. Catch Vazios Silenciosos 🟡

**[ANÁLISE]**
- **Estatísticas:** 12 arquivos com `.catch(() => {})`
- **Arquivos encontrados:**
  - `estudio_ia_videos/src/lib/video/cache.ts`
  - `estudio_ia_videos/src/lib/supabase/storage.ts`
  - `estudio_ia_videos/src/lib/legacy-import/pdf-processor.ts`
  - E mais 9 arquivos...
- **Estado atual:** 
  - Erros são silenciosamente ignorados sem logging
  - Dificulta debugging de problemas
- **Problema real:**
  - Erros passam despercebidos
  - Dificulta troubleshooting
  - Pode indicar problemas que precisam ser corrigidos

**[MUDANÇA]**
- **O que será alterado:**
  - Adicionar `logger.warn()` em cada `.catch(() => {})`
  - Considerar se erro deve ser propagado ao invés de ignorado
  - Adicionar contexto útil nos logs
- **Por quê:**
  - Visibilidade de erros que estão sendo ignorados
  - Melhor debugging e troubleshooting
  - Decisão consciente sobre ignorar vs propagar erros
- **Impacto:**
  - Logs mais informativos
  - Possível aumento de logs de warning
  - Melhor observabilidade

**[CRITÉRIO DE ACEITE]**
- Todos os `.catch(() => {})` têm logging mínimo
- Logs incluem contexto útil (componente, operação)
- Decisão documentada sobre ignorar vs propagar
- Validação de que erros críticos não estão sendo ignorados

---

## 📋 RESUMO DE IMPLEMENTAÇÃO

### Ordem de Execução Recomendada

1. **Dia 1:** Item 4 (Variáveis de Ambiente) - Base para outros
2. **Dia 2:** Item 3 (Rotas Admin) - Segurança crítica
3. **Dia 3:** Item 5 (RPC exec_sql) - Auditoria de segurança
4. **Dia 4-5:** Item 1 (TypeScript) - Corrigir erros gradualmente
5. **Dia 6-7:** Item 2 (ESLint) - Corrigir problemas de lint
6. **Semana 2:** Item 6 (Console.log) e Item 7 (Catch vazios)

### Validação Contínua

Cada item deve ser validado antes de prosseguir:
- ✅ Código compila sem erros
- ✅ Testes passam (quando aplicável)
- ✅ Funcionalidade testada manualmente
- ✅ Documentação atualizada

---

**Formato:** Este documento segue o formato obrigatório de `AGENTS.md`:
- ✅ Análise baseada em código existente
- ✅ Evidências citadas (arquivo, linha, função)
- ✅ Estado atual declarado (REAL/MOCK/PARCIAL)
- ✅ Mudanças específicas e técnicas
- ✅ Critérios de aceite mensuráveis
