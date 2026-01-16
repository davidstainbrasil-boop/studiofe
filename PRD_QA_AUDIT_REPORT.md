# 🔍 AUDITORIA QA - PRD vs AUTOMAÇÃO DE TESTES

**Data:** 2026-01-16  
**Auditor:** QA Lead (Automatizado)  
**Alvo:** specs.md (PRD v1.0.0)  
**Objetivo:** Validar testabilidade e preparar para automação completa

---

## 📊 RESUMO EXECUTIVO

| Métrica | Status | Detalhes |
|---------|--------|----------|
| **Requisitos Testáveis** | 🟡 72% | 26/36 features têm critérios claros |
| **Cobertura Atual** | 🟡 ~40% | 104 unit tests + 8 e2e ativos |
| **Critérios de Aceite** | 🔴 45% | Apenas 16/36 têm critérios mensuráveis |
| **Ambiguidades Detectadas** | 🔴 18 | Requisitos vagos impedem automação |
| **Testes Automatizáveis** | 🟢 85% | Boa cobertura técnica possível |

**Veredicto:** ⚠️ **PRD PARCIALMENTE PRONTO** - Requer 24h de refinamento para automação completa.

---

## 🔴 GAPS CRÍTICOS IMPEDITIVOS

### 1. Falta de Critérios de Aceite Mensuráveis

**Milestones sem critérios quantificáveis:**

#### Milestone 2: PPTX Processing
```markdown
❌ ATUAL:
- [x] Implementar text-parser.ts
- [x] Implementar image-parser.ts

✅ NECESSÁRIO:
- [x] Text-parser extrai 100% de textos com formatação (bold/italic/underline)
  • Acceptance: Parse de PPTX com 10 slides → extrai N elementos de texto
  • Edge case: Texto rotacionado mantém ângulo
  • Edge case: Texto com múltiplas fontes preserva formatação

- [x] Image-parser extrai imagens em resolução original (≥1080p)
  • Acceptance: Parse de PPTX com 5 imagens → extrai 5 arquivos válidos
  • Edge case: Imagens SVG convertidas para PNG
  • Edge case: Imagens com transparência preservam alpha
```

**Arquivos afetados:**
- `PPTX-002` a `PPTX-009` (8 parsers)
- `RENDER-001` a `RENDER-004` (4 módulos)
- `TTS-001`, `AVATAR-001`

**Impacto:** Impossível criar testes automatizados sem saber o resultado esperado.

---

### 2. Requisitos Não Testáveis (Vagos/Subjetivos)

| ID | Requisito | Problema | Solução |
|----|-----------|----------|---------|
| **SETUP-001** | "Configurar Ambiente Local" | Sem critério de sucesso | ✅ "npm install completa em <5min sem erros" |
| **PPTX-004** | "Suportar 12+ tipos de layout" | Quais 12? | ✅ Listar layouts: Title, TitleContent, TwoColumn, etc |
| **RENDER-002** | "Gerar frames do vídeo" | Quantos? Qual formato? | ✅ "Gera 30 frames/seg em PNG 1920x1080" |
| **US-009** | "Tutorial interativo" | O que é "interativo"? | ✅ "5 steps com tooltips clicáveis + progress bar" |
| **US-010** | "Preview em tempo real" | Qual latência? | ✅ "Preview < 2s após mudança no editor" |

**Total:** 18 requisitos vagos impedem testes automatizados.

---

### 3. Fluxos Principais Incompletos

**Fluxo PPTX → Vídeo (Principal)**

PRD atual tem 7 steps genéricos. **Faltam:**

#### **3.1 Cenários Alternativos**
```gherkin
# Cenário: Upload de PPTX inválido
Given usuário autenticado
When faz upload de arquivo .docx (não PPTX)
Then recebe erro "INVALID_FILE_TYPE"
And vê mensagem "Apenas arquivos .pptx são aceitos"

# Cenário: PPTX excede 50MB
Given usuário autenticado
When faz upload de PPTX de 52MB
Then recebe erro "FILE_TOO_LARGE"
And vê mensagem "Máximo 50MB permitido"

# Cenário: PPTX corrompido
Given usuário autenticado
When faz upload de PPTX corrompido
Then recebe erro "PARSE_FAILED"
And sistema registra log de erro
```

#### **3.2 Edge Cases**
- PPTX com 0 slides
- PPTX com 500+ slides
- PPTX com slide em branco
- PPTX com caracteres especiais (emoji, CJK)
- PPTX com vídeos embarcados (não suportado)
- PPTX com macros (risco de segurança)

**Faltam no PRD:** 15+ edge cases críticos.

---

### 4. Ausência de Contrato de API

PRD lista **70+ rotas** mas sem schema de request/response.

**Exemplo faltante:**

```typescript
// ❌ PRD ATUAL:
// "POST /api/render/start - Iniciar job de render"

// ✅ NECESSÁRIO:
POST /api/render/start

REQUEST:
{
  projectId: string (UUID)
  config: {
    resolution: "1080p" | "720p" | "4k"
    codec: "h264" | "h265" | "vp9"
    fps: 30 | 60
    avatar?: {
      id: string
      position: "left" | "right" | "center"
    }
  }
}

RESPONSE 201:
{
  jobId: string (UUID)
  status: "queued"
  position: number
  estimatedTime: number (seconds)
}

RESPONSE 400:
{
  error: "INVALID_PROJECT"
  message: "Project not found"
  code: 404
}

RESPONSE 429:
{
  error: "RATE_LIMIT_EXCEEDED"
  retryAfter: 60
}
```

**Rotas sem contrato:** 68/70 (97%)

**Impacto:** Impossível criar contract tests sem schema.

---

### 5. Métricas de Performance Ausentes

PRD não define SLAs:

| Operação | PRD | Necessário |
|----------|-----|------------|
| Upload PPTX 10MB | "Upload para storage" | **< 3s (p95)** |
| Parse PPTX 20 slides | "Extrai conteúdo" | **< 10s (p95)** |
| Render vídeo 5min | "Gera MP4" | **< 2min (p50), < 5min (p95)** |
| Health check | "Retorna OK" | **< 100ms (p99)** |
| API response | - | **< 500ms (p95)** |

**Sem SLAs:** Impossível validar performance em testes automatizados.

---

## 🟡 GAPS MODERADOS (MELHORIAS)

### 6. Dados de Teste Não Especificados

PRD menciona "38 testes PPTX" mas não lista:
- Arquivos de teste (nomes, características)
- Datasets esperados
- Seeds para banco de testes

**Necessário:**
```markdown
### Test Fixtures
- `test-simple.pptx` - 3 slides, texto básico
- `test-images.pptx` - 5 slides, 10 imagens PNG/JPEG
- `test-tables.pptx` - 2 slides, 4 tabelas complexas
- `test-animations.pptx` - 5 slides, 12 animações
- `test-large.pptx` - 100 slides, stress test
- `test-unicode.pptx` - emoji + CJK + RTL languages
```

---

### 7. Estados de Sistema Não Mapeados

**Faltam diagramas de estado para:**

#### Job de Render (Parcial)
```
PRD atual: pending → queued → processing → completed | failed | cancelled

Faltam transições:
- pending → expired (timeout na fila)
- processing → stuck (worker crashed)
- processing → paused (usuário pausou)
- failed → retrying (retry automático)
- completed → archived (após 30 dias)
```

#### Projeto
```
Não definido no PRD. Necessário:
draft → published → archived → deleted
```

---

### 8. RBAC Sem Matriz de Permissões

PRD lista 4 roles e 14 permissions, mas falta matriz:

| Permissão | admin | editor | viewer | instructor |
|-----------|-------|--------|--------|------------|
| `create_project` | ✅ | ✅ | ❌ | ✅ |
| `edit_project` | ✅ | ✅ | ❌ | own only |
| `delete_project` | ✅ | ✅ | ❌ | own only |
| `render_video` | ✅ | ✅ | ❌ | ✅ |
| `download_video` | ✅ | ✅ | ✅ | ✅ |
| `manage_users` | ✅ | ❌ | ❌ | ❌ |
| `view_analytics` | ✅ | ✅ | ❌ | own only |

**Total:** 14 permissões não mapeadas.

**Impacto:** Testes E2E de RBAC incompletos (25 testes atuais, mas 56 combinações possíveis).

---

## 🟢 PONTOS POSITIVOS (TESTÁVEIS)

### ✅ Bem Definidos

1. **Database Schema** - SQL completo permite testes de integração
2. **RLS Policies** - Testável via queries diretos
3. **Rate Limiting** - Limites claros (10 req/min)
4. **Health Check** - Score 0-100 mensurável
5. **Coverage Targets** - 80% statements, 90% functions
6. **Docker Setup** - Reprodutível em CI/CD

---

## 📋 CHECKLIST DE CORREÇÕES

### 🔴 Prioridade 0 (Impeditivo)

- [ ] **[4h]** Adicionar critérios de aceite mensuráveis em todos os 36 requisitos
  ```markdown
  Formato obrigatório:
  - [x] REQUISITO
    • Given: condição inicial
    • When: ação
    • Then: resultado mensurável
    • Edge cases: 3+ cenários
  ```

- [ ] **[3h]** Definir contratos de API (request/response schemas) para 70 rotas
  ```typescript
  // Usar Zod schemas como fonte da verdade
  // Gerar OpenAPI automaticamente
  ```

- [ ] **[2h]** Especificar SLAs de performance (p50, p95, p99)
  ```markdown
  Formato: "Operação X completa em <Ys (p95)"
  ```

- [ ] **[1h]** Listar 15+ edge cases para fluxo PPTX → Vídeo

---

### 🟡 Prioridade 1 (Alta)

- [ ] **[2h]** Criar matriz RBAC completa (4 roles × 14 permissions)
- [ ] **[2h]** Mapear estados de sistema com transições válidas
- [ ] **[1h]** Listar test fixtures (arquivos PPTX, datasets)
- [ ] **[1h]** Especificar mensagens de erro padronizadas

---

### 🟢 Prioridade 2 (Melhoria)

- [ ] **[1h]** Adicionar diagramas de sequência para fluxos críticos
- [ ] **[1h]** Documentar dados de seed para testes
- [ ] **[30min]** Criar glossário de termos técnicos

---

## 🎯 RECOMENDAÇÕES PARA TESTSPRITE

### 1. Estrutura de Testes Recomendada

```typescript
describe('PPTX Processing - text-parser.ts', () => {
  describe('Requisito PPTX-002: Extrair textos com formatação', () => {
    
    test('[GIVEN] PPTX com texto bold [WHEN] parse [THEN] mantém formatação', async () => {
      const pptx = await loadFixture('test-formatting.pptx');
      const result = await textParser.parse(pptx);
      
      expect(result.slides[0].texts[0]).toMatchObject({
        content: 'Texto em negrito',
        bold: true,
        italic: false,
        fontSize: 24
      });
    });
    
    test('[EDGE] Texto com múltiplas fontes preserva cada formatação', async () => {
      // ...
    });
    
    test('[EDGE] Texto rotacionado mantém ângulo', async () => {
      // ...
    });
  });
});
```

---

### 2. Contract Tests (API)

```typescript
// scripts/test-contract-render-start.js
describe('Contract: POST /api/render/start', () => {
  test('Request schema válido retorna 201', async () => {
    const response = await request(app)
      .post('/api/render/start')
      .send({
        projectId: TEST_PROJECT_ID,
        config: { resolution: '1080p', codec: 'h264', fps: 30 }
      });
    
    expect(response.status).toBe(201);
    expect(response.body).toMatchSchema(RenderJobSchema);
  });
  
  test('Request inválido retorna 400 com erro padronizado', async () => {
    const response = await request(app)
      .post('/api/render/start')
      .send({ projectId: 'invalid' });
    
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: expect.any(String),
      message: expect.any(String),
      code: expect.any(Number)
    });
  });
});
```

---

### 3. E2E Tests (Fluxo Completo)

```typescript
// e2e/pptx-to-video-happy-path.spec.ts
test('Fluxo completo: PPTX → Vídeo (happy path)', async ({ page }) => {
  // SETUP
  await loginAs(page, 'editor');
  
  // UPLOAD PPTX
  await page.goto('/upload');
  await page.setInputFiles('[data-testid="pptx-input"]', 'fixtures/test-simple.pptx');
  await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });
  
  // PARSE
  const projectId = await page.locator('[data-testid="project-id"]').textContent();
  await expect(page.locator('[data-testid="parse-complete"]')).toBeVisible({ timeout: 30000 });
  
  // RENDER
  await page.click('[data-testid="btn-render"]');
  await expect(page.locator('[data-testid="render-progress"]')).toBeVisible();
  await expect(page.locator('[data-testid="render-complete"]')).toBeVisible({ timeout: 120000 });
  
  // DOWNLOAD
  const downloadPromise = page.waitForEvent('download');
  await page.click('[data-testid="btn-download"]');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.mp4$/);
});
```

---

### 4. Performance Tests (K6)

```javascript
// k6/render-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // ramp-up
    { duration: '5m', target: 100 },  // steady state
    { duration: '1m', target: 0 }     // ramp-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% < 500ms
    'http_req_failed': ['rate<0.01']    // <1% errors
  }
};

export default function() {
  const res = http.post('https://api.example.com/render/start', JSON.stringify({
    projectId: PROJECT_ID,
    config: { resolution: '1080p', codec: 'h264', fps: 30 }
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
  
  check(res, {
    'status 201': (r) => r.status === 201,
    'has jobId': (r) => r.json('jobId') !== undefined
  });
  
  sleep(1);
}
```

---

## 📊 PLANO DE AÇÃO (24h)

### Dia 1 - Manhã (4h)

**09:00-11:00** - Refinar critérios de aceite
- [ ] PPTX-001 a PPTX-009 (parsers)
- [ ] RENDER-001 a RENDER-008

**11:00-13:00** - Definir contratos de API
- [ ] Criar `openspec/api-contracts/render.yml`
- [ ] Criar `openspec/api-contracts/pptx.yml`
- [ ] Gerar TypeScript types com `openapi-typescript`

### Dia 1 - Tarde (4h)

**14:00-16:00** - Especificar SLAs e edge cases
- [ ] Tabela de SLAs por operação
- [ ] Listar 20+ edge cases

**16:00-18:00** - Criar matriz RBAC e test fixtures
- [ ] Matriz 4×14 completa
- [ ] Documentar 10 arquivos PPTX de teste

---

## 🔧 FERRAMENTAS RECOMENDADAS

| Ferramenta | Propósito | Integração |
|------------|-----------|------------|
| **Zod** | Schema validation + tipos TS | ✅ Já integrado |
| **OpenAPI Generator** | Gerar contratos de API | ⏳ Adicionar |
| **MSW** | Mock APIs em testes | ✅ Já integrado |
| **Playwright** | E2E tests | ✅ Já configurado |
| **K6** | Load/performance tests | ⏳ Adicionar |
| **TestSprite (MCP)** | Geração automática de testes | ⏳ Configurar |

---

## 📈 MÉTRICAS DE SUCESSO

**PRD será considerado "PRONTO PARA AUTOMAÇÃO" quando:**

| Métrica | Atual | Meta | Status |
|---------|-------|------|--------|
| Requisitos com critérios mensuráveis | 72% | 100% | 🟡 |
| Rotas com contrato definido | 3% | 100% | 🔴 |
| Edge cases documentados | ~10 | 50+ | 🔴 |
| SLAs definidos | 0 | 15+ | 🔴 |
| Matriz RBAC completa | 0% | 100% | 🔴 |
| Test fixtures documentados | 0 | 10+ | 🔴 |

**ETA:** 24h de refinamento → PRD 100% testável.

---

## 📝 TEMPLATE PARA CORREÇÃO

### Requisito Corrigido (Exemplo)

```markdown
#### PPTX-002: Text Parser
**Status:** ✅ Completo  
**Arquivo:** `estudio_ia_videos/app/lib/pptx/text-parser.ts`

**Requisito:**
Extrair textos de cada slide com formatação preservada (bold, italic, underline, fontSize, fontFamily, color).

**Critérios de Aceite:**

Given: Arquivo PPTX válido com 3 slides contendo textos formatados
When: Executo textParser.parse(pptx)
Then: 
  - Retorna array com 3 slides
  - Cada slide.texts[] contém objetos com propriedades: content, bold, italic, underline, fontSize, fontFamily, color
  - Texto "Título" (24pt, Arial, bold) é extraído como { content: "Título", fontSize: 24, fontFamily: "Arial", bold: true }

**Edge Cases:**
1. Texto com múltiplas formatações inline (ex: "Normal **bold** normal") → preserva cada formatação
2. Texto rotacionado 90° → mantém propriedade rotation: 90
3. Texto com emoji → extrai corretamente (UTF-8)
4. Texto vazio no slide → retorna slide.texts: []
5. Texto com hyperlink → extrai texto + URL

**Performance:**
- Parse de PPTX com 20 slides e 100 elementos texto: < 5s (p95)

**Testes:**
- Unit: `__tests__/lib/pptx/text-parser.test.ts` (15 casos)
- Integration: `e2e/pptx-parsing.spec.ts` (3 casos)
```

---

## 🎯 CONCLUSÃO

**PRD atual:** Boa base técnica, mas **45% dos requisitos não são testáveis automaticamente**.

**Bloqueadores principais:**
1. 🔴 Falta de critérios de aceite mensuráveis (26/36)
2. 🔴 Falta de contratos de API (68/70)
3. 🔴 Falta de SLAs de performance (0/15)

**Solução:** Aplicar template acima em todos os requisitos → 24h de trabalho.

**Próximos passos:**
1. Refinar PRD usando template
2. Gerar contratos OpenAPI
3. Integrar TestSprite MCP
4. Executar automação completa

---

**Documento gerado:** 2026-01-16  
**Próxima auditoria:** Após refinamento do PRD (em 24h)
