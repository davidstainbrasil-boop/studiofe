# Decisões Técnicas (registro)

> Data base: 2026-01-07

## DEC-001 — Remover `~lib/*` e acoplamento com `../lib` (raiz)

1. **Contexto**
   1. Rotas `estudio_ia_videos/app/api/v1/video-jobs/*` dependiam de `~lib/*` → `../lib/*`.
   2. Isso cria acoplamento “cross-repo” e impede previsibilidade (imports resolvem fora da app).

2. **Decisão**
   1. Remover `~lib/*` do `estudio_ia_videos/tsconfig.json`.
   2. Criar bounded-context **local** `@lib/video-jobs/*` em `estudio_ia_videos/app/lib/video-jobs/*`.
   3. Migrar rotas v1/video-jobs para dependerem exclusivamente desse módulo.

3. **Consequências**
   1. Menos risco de “import fantasma” resolver para a raiz.
   2. Contratos de API ficam versionáveis dentro do app.

---

## DEC-002 — Eliminar fallback ambíguo em TS `paths`

1. **Problema**
   1. `@/lib/*` e `@/components/*` tinham múltiplos destinos (fallback), criando ambiguidades.

2. **Decisão**
   1. `@/*` continua sendo o alias principal para `estudio_ia_videos/app/*`.
   2. `@lib/*` é o alias explícito para `estudio_ia_videos/app/lib/*`.
   3. Fallbacks foram substituídos por aliases específicos `@shared-*`.

3. **Consequência**
   1. Um import mapeia para exatamente um local.

---

## DEC-003 — Padronizar tsconfig do subtree `estudio_ia_videos/app`

1. **Problema**
   1. `estudio_ia_videos/app/tsconfig.json` tinha `strict=false` e includes inválidos (referia pastas que não existem ali).

2. **Decisão**
   1. Fazer `extends` de `estudio_ia_videos/tsconfig.json`.
   2. Ligar `strict=true` e aliases locais para ESLint/type-aware tooling.

---

## DEC-004 — Adotar `src/app` e `src/lib` como base operacional

1. **Contexto**
   1. O código atual está em `estudio_ia_videos/src/*` (App Router em `src/app` e domínio em `src/lib`).
   2. A documentação ainda referenciava `estudio_ia_videos/app/*`, gerando divergência operacional.

2. **Decisão**
   1. Tratar `estudio_ia_videos/src/app` como raiz do App Router.
   2. Tratar `estudio_ia_videos/src/lib` como base dos módulos e serviços.
   3. Atualizar documentação de arquitetura para refletir essa estrutura.

3. **Consequências**
   1. Aliases e regras de importação devem apontar para `src/*`.
   2. A validação arquitetural passa a considerar `src/app/**` como escopo de rotas.

---

## DEC-005 — Expor parsers PPTX em `src/lib/pptx/*` via wrappers

1. **Contexto**
   1. Os parsers reais vivem em `estudio_ia_videos/src/lib/pptx/parsers/*`.
   2. Referencias externas esperam imports em `@/lib/pptx/layout-parser` e `@/lib/pptx/notes-parser`.

2. **Decisao**
   1. Criar wrappers em `estudio_ia_videos/src/lib/pptx/layout-parser.ts` e `estudio_ia_videos/src/lib/pptx/notes-parser.ts`.
   2. Reexportar classes e tipos dos parsers internos sem duplicar logica.

3. **Consequencias**
   1. Import paths canonicamente estaveis para consumidores externos.
   2. Manter implementacao centralizada em `parsers/*`.

---

## Observação operacional (Codacy/MCP)

Durante esta sessão, o analisador automático falhou com `wsl --status` (indicando ambiente do MCP inconsistente com Linux). A organização segue, mas é recomendado corrigir o MCP para garantir análise contínua em CI/local.
