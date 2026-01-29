# FASE 2: Progresso - Eliminação Erros TypeScript

**Início:** 1285 erros  
**Atual:** 1268 erros  
**Progresso:** -17 erros (-1.3%)

---

## Análise dos Erros Restantes (1268)

### Categorias Principais

**1. Supabase Client - Tabelas Não Mapeadas (~150 erros)**
- Tabelas: `nr_compliance_records`, `external_api_usage`, `user_external_api_configs`
- Problema: Não estão no schema Supabase tipado
- Solução: Adicionar ao `database.types.ts` ou usar `as never`

**2. Propriedades snake_case em Resultados Prisma (~400 erros)**
- Arquivos: `dashboard/unified-stats`, `monitoring`, `pipeline`
- Problema: Queries RAW retornam snake_case, mas código espera camelCase
- Padrão: `.startedAt` mas resultado tem `.started_at`
- Solução: Transform em runtime ou type assertion

**3. JsonValue Type Mismatches (~200 erros)**
- Arquivos: `editor/canvas/save`, `render/settings`
- Problema: Tipos complexos não assignable to `InputJsonValue`
- Solução: JSON.parse(JSON.stringify()) ou satisfies

**4. Componentes UI (~300 erros)**
- Arquivos: `timeline-advanced.tsx`, `canvas-editor`, `webhooks-system`
- Problema: Props/state com tipos snake_case
- Solução: Interfaces + transformers

**5. Missing Properties (~218 erros)**
- Ex: `project.title` não existe, é `project.name`
- Solução: Correção caso a caso

---

## Estratégia Recomendada

### Abordagem 1: Pragmática (Deploy Rápido)
1. **@ts-expect-error targeted** em Supabase unknowns (~150 erros)
2. **Type assertions** em resultados RAW (~400 erros)
3. **JSON casting** em InputJsonValue (~200 erros)
4. **Correções pontuais** em componentes críticos (50 mais problemáticos)

**Resultado:** ~800 erros resolvidos, 468 remainders  
**Tempo:** 2-3 horas  
**Deploy:** POSSÍVEL com warnings

### Abordagem 2: Arquitetural (Qualidade)
1. **Regenerar types Supabase** com todas as tabelas
2. **Transform layer** para converter snake_case ↔ camelCase
3. **Strict interfaces** para todos componentes
4. **Zero @ts-ignore policy**

**Resultado:** 0 erros  
**Tempo:** 8-12 horas  
**Deploy:** BLOQUEADO até completo

### Abordagem 3: Híbrida (Recomendado)
1. **Fase 2A:** Pragmática (800 erros → 468)
2. **Deploy staging** + testes funcionais
3. **Fase 2B:** Refactor arquitetural incremental
4. **Deploy production** após 0 erros

---

## Próximos Comandos

```bash
# Ver arquivos mais problemáticos
cd estudio_ia_videos
npm run type-check 2>&1 | grep -E "^src/" | cut -d'(' -f1 | sort | uniq -c | sort -rn | head -20

# Erros específicos de Supabase
npm run type-check 2>&1 | grep "not assignable to parameter of type" | wc -l

# Erros de propriedades inexistentes
npm run type-check 2>&1 | grep "Property .* does not exist" | wc -l

# Criar branch para trabalho paralelo
git checkout -b feature/phase2-typescript-elimination
```

---

## Decisão Necessária

**Pergunta:** Qual abordagem seguir?

- **A:** Pragmática (deploy em 2-3h com 468 erros)
- **B:** Arquitetural (deploy em 8-12h com 0 erros)
- **C:** Híbrida (deploy staging em 2-3h, produção após refactor)

**Status:** AGUARDANDO DIREÇÃO
