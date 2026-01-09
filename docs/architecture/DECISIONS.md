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

## Observação operacional (Codacy/MCP)

Durante esta sessão, o analisador automático falhou com `wsl --status` (indicando ambiente do MCP inconsistente com Linux). A organização segue, mas é recomendado corrigir o MCP para garantir análise contínua em CI/local.
