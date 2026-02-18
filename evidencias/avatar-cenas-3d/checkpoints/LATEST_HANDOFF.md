# LATEST_HANDOFF

```text
[HANDOFF]
Data/hora: 2025-07-18 (Sessão 90)
Fase atual: Fase 1 (Núcleo de cena e turnos)
Task atual: T8 — Score mínimo de qualidade por job
Status real: em progresso (hardening de produção concluído)
Última evidência: Hardening profundo em 14 arquivos de produção (sessões 89-90). Todos validados com 0 erros TypeScript e 0 findings Codacy.
Próxima ação atômica (<=1h): destravar sandbox do host para rodar regressão completa `npm test` e smoke tests
Bloqueios: runtime de sandbox indisponível por falta de `rg/bwrap/socat` no host
Risco imediato: ausência de execução de testes em runtime (validação estática OK)
Decisão tomada: prosseguir com hardening completo; todos os mocks/placeholders em código de produção eliminados
Rollback necessário? (sim/não): não
```

## Sessão 90 — Hardening completo de produção (11 arquivos)

### Arquivos corrigidos nesta sessão:

**Rodada 1 (8 arquivos):**
- `src/lib/video/timeline-editor.ts` — `generatePreview()` e `export()` agora executam FFmpeg real (antes retornavam dados fake sem executar)
- `src/lib/pptx/pptx-processor-advanced.ts` — `generateSlideThumbnail()` gera SVG data URI real ao invés de URL `/api/placeholder`
- `src/lib/pptx/pptx-core-parser.ts` — `extractRels()` parseia XMLs `.rels` reais via JSZip+XMLParser (antes retornava `{}`)
- `src/lib/tts/real-tts-service.ts` — fallback TTS trocado de `MOCK` para `OPENAI`
- `src/app/api/import/pptx-to-timeline-real/route.ts` — removida referência a `/placeholder.png` inexistente
- `src/lib/pptx/parsers/text-parser.ts` — 3 métodos reais de extração XML adicionados (formatting, bullets, hyperlinks)
- `src/lib/tts/slide-narration-service.ts` — documentação corrigida
- `src/lib/ai/groq-client.ts` — comentário de fallback chain corrigido (removido "→ Mock")

**Rodada 2 (3 arquivos):**
- `src/lib/media-preprocessor-real.ts` — 3 métodos placeholder substituídos por implementações reais: `preprocessImage()` usa Sharp (resize, format, quality, optimize), `preprocessVideo()` e `preprocessAudio()` usam FFmpeg com temp files (formato, qualidade, probe de duração)
- `src/lib/collab/review-workflow.ts` — `publishProject()` agora atualiza status do projeto no Supabase (antes apenas logava e retornava success)
- `src/lib/multi-tenancy/org-context.ts` — comentário "Placeholder - buscar do DB" corrigido para refletir cache in-memory real

### Validação:
- 0 erros TypeScript em todos os 11 arquivos
- 0 findings Codacy CLI em todos os 11 arquivos
- 291 erros globais são todos MD032/markdown linting em docs (não TypeScript)

## Progresso paralelo realizado
- `estudio_ia_videos/src/components/studio-unified/SceneConfigPanel.tsx`
	- Estado anterior: PARCIAL (fallback com `DEMO_SCENE_AVATARS`).
	- Alteração: removido fallback demo; painel usa apenas dados reais de `/api/avatars` e exibe vazio quando não houver avatares.
	- Efeito esperado: elimina uso de avatar fake em produção e força configuração real de catálogo.
- `estudio_ia_videos/src/app/api/avatars/route.ts`
	- Estado anterior: PARCIAL/QUEBRADO (colunas `projectId/userId/modelUrl` incompatíveis com tabela `avatars`).
	- Alteração: rota reescrita para o schema real (`name`, `provider`, `thumbnail_url`, `preview_url`, `is_public`, `is_premium`, `metadata`, etc.).
	- Efeito esperado: listagem e criação de avatares funcionais com dados persistidos de forma compatível com Supabase.
- `estudio_ia_videos/src/app/api/avatar-scenes/route.ts`
	- Estado anterior: NÃO IMPLEMENTADO.
	- Alteração: criada e evoluída API real (`GET/POST/PUT`) para persistir, consultar e atualizar turnos de diálogo por cena em `projects.metadata.studioSnapshot` com autenticação segura, rate limit e controle de acesso.
	- Efeito esperado: backend cobre ciclo completo de edição de diálogo por cena sem endpoints fake.
- `estudio_ia_videos/src/app/studio-pro/page.tsx`
	- Alteração: após salvar projeto, cenas com `avatarConfig + script` sincronizam automaticamente para `/api/avatar-scenes`.
	- Efeito esperado: seleção/configuração de avatar no Studio gera persistência operacional de diálogo no backend.
- `estudio_ia_videos/src/app/api/avatar-scenes/[sceneId]/render/route.ts`
	- Estado anterior: NÃO IMPLEMENTADO.
	- Alteração: endpoint `POST` criado e evoluído para persistir job em `render_jobs` antes do enqueue, com rollback para `failed` em erro de fila.
	- Efeito esperado: status/progresso do render por cena rastreável via banco (sem job órfão somente em fila).
- `estudio_ia_videos/src/app/studio-pro/page.tsx`
	- Alteração: adicionado handler e botão `Render Cena` para disparar render da cena ativa via endpoint dedicado.
	- Efeito esperado: operador renderiza e valida diálogo de uma cena isolada diretamente na UI do Studio.
- `estudio_ia_videos/src/__tests__/api/avatars/route.test.ts`
	- Alteração: suíte criada para validar GET/POST da rota `/api/avatars` (público, validação de query, auth obrigatória e criação autenticada).
	- Observação: runner de testes do ambiente retornou “No tests found in the files”; validação estática dos arquivos segue verde.
- `estudio_ia_videos/src/components/studio-unified/AvatarLibraryPanel.tsx`
	- Estado anterior: PARCIAL (fallback demo + sem payload de drag padronizado para avatar).
	- Alteração: removido fallback demo, cards de avatar marcados como `draggable` e payload `application/x-tc-avatar` com `avatarId`, `provider`, `voiceId`, `engine` e `style`.
	- Efeito esperado: biblioteca opera com catálogo real e envia metadados suficientes para criação de elemento `avatar` no canvas.
- `estudio_ia_videos/src/app/studio-pro/page.tsx`
	- Estado anterior: PARCIAL (adição de avatar apenas por clique, sem drop no canvas).
	- Alteração: adicionado `onDragOver/onDrop` no container do canvas, parsing de payload de avatar e criação de elemento em coordenadas reais de drop.
	- Efeito esperado: fluxo UX alvo “biblioteca → arrastar → canvas” funcional em código real, sem simulação.
- `estudio_ia_videos/src/app/api/avatar-scenes/route.ts`
	- Alteração: schema de turnos ampliado para aceitar e persistir `voiceId`, `engine` (`local|premium`) e `style` por turno.
	- Efeito esperado: trilha de diálogo carrega metadados de execução/render desde a origem da cena.
- `estudio_ia_videos/src/app/studio-pro/page.tsx`
	- Alteração: `save` passou a enviar `voiceId/engine/style` de `voiceConfig/avatarConfig` no payload de turnos para `/api/avatar-scenes`.
	- Efeito esperado: vínculo automático entre seleção do avatar no canvas e contrato de turnos persistidos no backend.
- `estudio_ia_videos/src/components/studio-unified/SceneConfigPanel.tsx`
	- Alteração: integração do `ConversationBuilder` para edição de diálogos por múltiplos avatares e geração de `scene.avatarDialog.turns` normalizados.
	- Efeito esperado: UI da cena agora suporta fluxo real de 2+ avatares com múltiplos turnos, persistível no mesmo contrato de API.
- `estudio_ia_videos/src/app/studio-pro/page.tsx`
	- Alteração: sincronização de `/api/avatar-scenes` usa `scene.avatarDialog.turns` quando presente, com fallback no modelo legado de turno único.
	- Efeito esperado: persistência ponta a ponta de diálogo multi-turno sem quebrar cenas antigas.
- `estudio_ia_videos/src/app/api/avatar-scenes/route.ts`
	- Alteração: validação reforçada para bloquear sobreposição temporal entre turnos (`endMs > next.startMs`).
	- Efeito esperado: contratos inválidos de timeline são rejeitados no backend com erro 400 explícito.
- `estudio_ia_videos/src/components/studio-unified/SceneConfigPanel.tsx`
	- Alteração: antes de salvar conversa, valida conflito temporal entre turnos e bloqueia atualização de cena quando houver sobreposição.
	- Efeito esperado: prevenção precoce de erro de timeline já na UX de edição.
- `estudio_ia_videos/src/__tests__/api/avatar-scenes/route.test.ts`
	- Alteração: adicionado smoke contratual `POST + GET` validando 2 avatares e 4 turnos persistidos e recuperáveis no mesmo `sceneId`.
	- Efeito esperado: evidência automatizada de consistência do contrato T4 mesmo antes do smoke de runtime real.
- `scripts/run-t4-avatar-scenes-smoke.mjs`
	- Estado anterior: NÃO IMPLEMENTADO.
	- Alteração: criado runner oficial para `POST + GET /api/avatar-scenes`, validação de 2 avatares/4 turnos e geração automática de `request-response.json`, `metrics.json`, `logs.txt` e `artifact.txt`.
	- Efeito esperado: execução operacional padronizada para fechamento do Gate REAL da T4.
- `package.json`
	- Alteração: adicionado script `smoke:t4:avatar-scenes`.
	- Efeito esperado: execução única e reproduzível do smoke T4 via npm.
- `evidencias/avatar-cenas-3d/fase-1/T4/*`
	- Alteração: criada estrutura mínima de evidências da T4 com README operacional e artefatos base.
	- Efeito esperado: trilha de auditoria pronta para receber resultado real da execução.

## Regra de atualização
- Atualizar este arquivo no fim de cada sessão.
- Em caso de conflito, prevalece evidência técnica (job/log/artefato).
