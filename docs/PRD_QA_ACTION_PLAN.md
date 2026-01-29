# 🎯 PLANO DE AÇÃO QA - PRD TESTÁVEL

**Objetivo:** Tornar PRD 100% testável em 24h  
**Status Atual:** 72% testável → Meta: 100%  
**Responsável:** QA Lead + Product Owner

---

## ⚡ QUICK START (15min)

```bash
# 1. Ler auditoria completa
cat PRD_QA_AUDIT_REPORT.md

# 2. Ver patches prontos
cat PRD_TESTABILITY_PATCH.md

# 3. Iniciar aplicação
# Seguir cronograma abaixo
```

---

## 📅 CRONOGRAMA DETALHADO (24h)

### DIA 1 - MANHÃ (4h) - CRITÉRIOS DE ACEITE

#### 09:00-10:30 | PPTX Parsers (8 módulos)

**Tarefa:** Refinar PPTX-002 a PPTX-009

**Processo:**
1. Abrir `specs.md` seção 6.4
2. Para cada parser (text, image, layout, notes, theme, animation, table, shape):
   - Copiar template de `PRD_TESTABILITY_PATCH.md` PATCH 1
   - Substituir exemplo genérico por real
   - Adicionar 5 edge cases específicos
   - Definir SLA (tempo de parse)

**Output:**
```markdown
✅ PPTX-002: Text Parser (critérios mensuráveis)
✅ PPTX-003: Image Parser (critérios mensuráveis)
✅ PPTX-004: Layout Parser (critérios mensuráveis)
✅ PPTX-005: Notes Parser (critérios mensuráveis)
✅ PPTX-006: Theme Parser (critérios mensuráveis)
✅ PPTX-007: Animation Parser (critérios mensuráveis)
✅ PPTX-008: Table Parser (critérios mensuráveis)
✅ PPTX-009: Shape Parser (critérios mensuráveis)
```

**Validação:**
- [ ] Cada requisito tem Given/When/Then
- [ ] Cada requisito tem 5+ edge cases
- [ ] Cada requisito tem SLA (p50, p95)

---

#### 10:30-11:00 | COFFEE BREAK ☕

---

#### 11:00-13:00 | Render Pipeline (8 módulos)

**Tarefa:** Refinar RENDER-001 a RENDER-008

**Processo igual ao bloco anterior.**

**Output:**
```markdown
✅ RENDER-001: Job Manager (critérios mensuráveis)
✅ RENDER-002: Frame Generator (critérios mensuráveis)
✅ RENDER-003: FFmpeg Executor (critérios mensuráveis)
✅ RENDER-004: Video Uploader (critérios mensuráveis)
✅ RENDER-005: Start Endpoint (critérios mensuráveis)
✅ RENDER-006: Jobs List Endpoint (critérios mensuráveis)
✅ RENDER-007: Progress Endpoint (critérios mensuráveis)
✅ RENDER-008: Cancel Endpoint (critérios mensuráveis)
```

---

### DIA 1 - TARDE (4h) - CONTRATOS DE API

#### 14:00-16:00 | Definir Schemas OpenAPI

**Tarefa:** Criar contratos para 10 rotas principais

**Rotas prioritárias:**
1. `POST /api/pptx/upload`
2. `POST /api/pptx/parse`
3. `POST /api/render/start` ✅ (exemplo pronto em PATCH 2)
4. `GET /api/render/jobs` ✅ (exemplo pronto em PATCH 2)
5. `GET /api/render/progress`
6. `POST /api/render/cancel`
7. `POST /api/tts/generate`
8. `POST /api/avatar/generate`
9. `GET /api/health`
10. `GET /api/analytics/usage-stats`

**Processo:**
1. Criar pasta `openspec/api-contracts/`
2. Para cada rota:
   - Copiar template de PATCH 2
   - Adaptar request/response schema
   - Definir códigos de erro (400, 401, 403, 404, 429)
   - Adicionar exemplos

**Output:**
```yaml
openspec/api-contracts/
├── pptx.yml          # upload + parse
├── render.yml        # start + jobs + progress + cancel
├── tts.yml           # generate
├── avatar.yml        # generate
├── health.yml        # health check
└── analytics.yml     # usage-stats
```

**Validação:**
- [ ] Request schema com required/optional
- [ ] Response schema para 2xx e 4xx/5xx
- [ ] Exemplos para cada endpoint

---

#### 16:00-18:00 | Gerar TypeScript Types

**Tarefa:** Converter OpenAPI → TypeScript

```bash
# Instalar ferramenta
npm install -D openapi-typescript

# Gerar types
npx openapi-typescript openspec/api-contracts/render.yml -o src/types/api/render.types.ts
npx openapi-typescript openspec/api-contracts/pptx.yml -o src/types/api/pptx.types.ts
# ... repetir para todos
```

**Output:**
```typescript
// src/types/api/render.types.ts (auto-gerado)
export interface RenderStartRequest {
  projectId: string;
  config: {
    resolution: "720p" | "1080p" | "4k";
    codec: "h264" | "h265" | "vp9";
    fps: 30 | 60;
    avatar?: { id: string; position: string };
  };
}

export interface RenderStartResponse {
  jobId: string;
  status: "queued";
  position: number;
  estimatedTime: number;
}
```

**Validação:**
- [ ] Types compilam sem erro
- [ ] Importar em route handlers
- [ ] Usar Zod.infer<> para validação

---

### DIA 2 - MANHÃ (4h) - SLAS E EDGE CASES

#### 09:00-11:00 | Definir SLAs

**Tarefa:** Preencher tabela de performance

**Processo:**
1. Abrir PATCH 3 (SLAs)
2. Para cada operação:
   - Estimar tempo baseado em testes atuais
   - Adicionar margem 30% (produção é mais lento)
   - Definir p50, p95, p99

**Output:**
```markdown
### 14. SERVICE LEVEL AGREEMENTS (SLAs)

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| POST /api/pptx/upload (10MB) | 2s | 5s | 8s |
| POST /api/pptx/parse (20 slides) | 5s | 10s | 15s |
| ... (15 rotas)
```

**Validação:**
- [ ] 15 operações com SLA definido
- [ ] SLAs realistas (testar localmente)

---

#### 11:00-13:00 | Documentar Edge Cases

**Tarefa:** Listar 50+ cenários edge

**Categorias:**
1. PPTX Processing (15 casos)
2. Render Pipeline (15 casos)
3. Auth & Security (10 casos)
4. Rate Limiting (5 casos)
5. Storage & Upload (5 casos)

**Processo:**
1. Copiar PATCH 5 (Edge Cases)
2. Revisar cada caso
3. Adicionar novos casos específicos do projeto

**Output:**
```markdown
### 15. EDGE CASES E TRATAMENTO DE ERROS

#### 15.1 PPTX Processing
| Cenário | Comportamento | Status HTTP | Error Code |
| PPTX com 0 slides | Erro "EMPTY_PPTX" | 400 | PPTX_EMPTY |
| ... (50+ casos)
```

**Validação:**
- [ ] 50+ edge cases documentados
- [ ] Cada caso tem HTTP status + error code
- [ ] Cada caso tem comportamento esperado

---

### DIA 2 - TARDE (4h) - RBAC E FIXTURES

#### 14:00-15:00 | Matriz RBAC

**Tarefa:** Preencher matriz 4×14

**Processo:**
1. Copiar PATCH 4 (Matriz RBAC)
2. Validar cada permissão por role
3. Definir "own only" onde aplicável

**Output:**
```markdown
### Matriz de Permissões (56 combinações)

| Permissão | admin | editor | viewer | instructor |
| create_project | ✅ | ✅ | ❌ | ✅ |
| ... (14 permissões)
```

**Validação:**
- [ ] Matriz completa 4×14
- [ ] "own only" claramente marcado
- [ ] Lógica consistente (viewer não pode editar)

---

#### 15:00-16:00 | Test Fixtures

**Tarefa:** Documentar arquivos de teste

**Processo:**
1. Listar arquivos PPTX existentes em `test_files/`
2. Criar novos se necessário
3. Documentar características de cada arquivo

**Output:**
```markdown
### 16. TEST FIXTURES

| Arquivo | Slides | Tamanho | Características |
| test-simple.pptx | 3 | 50KB | Texto + imagens básicas |
| test-large.pptx | 100 | 5MB | Stress test |
| ... (10 arquivos)
```

**Validação:**
- [ ] 10 arquivos PPTX documentados
- [ ] Cada arquivo com propósito claro
- [ ] Seed SQL para database

---

#### 16:00-17:00 | Criar Seed SQL

**Tarefa:** Script de seed para testes

```sql
-- test_files/seed-test-data.sql

-- 4 usuários (1 por role)
INSERT INTO users (id, email, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@test.com', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'editor@test.com', 'editor'),
  ('00000000-0000-0000-0000-000000000003', 'viewer@test.com', 'viewer'),
  ('00000000-0000-0000-0000-000000000004', 'instructor@test.com', 'instructor');

-- 5 projetos em estados diferentes
INSERT INTO projects (id, user_id, status) VALUES
  ('10000000-0000-0000-0000-000000000001', '...', 'draft'),
  ('10000000-0000-0000-0000-000000000002', '...', 'published'),
  ('10000000-0000-0000-0000-000000000003', '...', 'archived');

-- 10 jobs em estados diferentes
-- ...
```

**Validação:**
- [ ] Script roda sem erro
- [ ] Cria dados para todos os roles
- [ ] Cria dados para todos os estados de job

---

#### 17:00-18:00 | Diagrama de Estados

**Tarefa:** Documentar transições válidas

**Processo:**
1. Copiar PATCH 7 (Estados)
2. Validar cada transição
3. Adicionar triggers e validações

**Output:**
```markdown
### Render Job State Machine

[Diagrama Mermaid]

**Transições Válidas:**
| De | Para | Trigger | Validação |
| pending | queued | Sistema | Projeto existe |
| ... (20 transições)
```

**Validação:**
- [ ] Diagrama completo e correto
- [ ] Todas as transições documentadas
- [ ] Condições de validação claras

---

## ✅ CHECKLIST FINAL

Após 24h, validar:

### Requisitos Mensuráveis
- [ ] 36/36 requisitos têm critérios Given/When/Then
- [ ] 36/36 requisitos têm 3+ edge cases
- [ ] 36/36 requisitos têm SLA (quando aplicável)

### Contratos de API
- [ ] 10 rotas principais com OpenAPI completo
- [ ] TypeScript types gerados
- [ ] Zod schemas alinhados com OpenAPI

### Performance
- [ ] 15 operações com SLA definido (p50, p95, p99)
- [ ] Thresholds configurados em K6

### Edge Cases
- [ ] 50+ cenários documentados
- [ ] Cada cenário com HTTP status + error code

### RBAC
- [ ] Matriz 4×14 completa
- [ ] 56 combinações testadas

### Test Fixtures
- [ ] 10 arquivos PPTX documentados
- [ ] Seed SQL funcional
- [ ] Mock APIs (ElevenLabs, HeyGen)

### Estados de Sistema
- [ ] Diagrama de estados do Render Job
- [ ] Transições válidas documentadas

---

## 🚀 APÓS CONCLUSÃO

### 1. Aplicar no PRD
```bash
# Backup
cp specs.md specs.md.v1.0.0

# Aplicar patches
# (manual ou via script)
```

### 2. Integrar TestSprite
```bash
# Configurar MCP TestSprite
# Gerar testes automaticamente baseado no PRD refinado
```

### 3. Rodar Auditoria Novamente
```bash
# Verificar se atingiu 100%
cat PRD_QA_AUDIT_REPORT.md | grep "Requisitos Testáveis"
# Espera: 100%
```

### 4. Implementar Testes Faltantes
```bash
# Priorizar testes de alta cobertura
npm run test:contract
npm run test:e2e:rbac
npm run test:performance
```

---

## 📊 MÉTRICAS DE PROGRESSO

Rastrear diariamente:

| Dia | Requisitos Testáveis | Rotas com Contrato | Edge Cases |
|-----|---------------------|-------------------|------------|
| Antes | 72% (26/36) | 3% (2/70) | 10 |
| Dia 1 | 85% (31/36) | 15% (10/70) | 30 |
| Dia 2 | 100% (36/36) | 15% (10/70) | 50+ |

**Meta Final:** 100% / 15% / 50+

---

## 🎯 RESULTADO ESPERADO

**PRD v1.1.0 (Testável):**
- ✅ 100% dos requisitos testáveis automaticamente
- ✅ Contratos de API para rotas críticas
- ✅ SLAs definidos e mensuráveis
- ✅ 50+ edge cases documentados
- ✅ Matriz RBAC completa
- ✅ Test fixtures prontos
- ✅ Integração com TestSprite possível

**Benefícios:**
1. Testes automatizados completos via TestSprite
2. Redução de bugs em produção
3. QA mais eficiente (automação vs manual)
4. Deploy com confiança (coverage alto)
5. Onboarding de novos devs mais rápido

---

**Documento criado:** 2026-01-16  
**Tempo estimado:** 24h  
**Prioridade:** Alta (bloqueia automação de testes)
