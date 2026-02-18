# T5 — Render local ponta a ponta (robustez)

## Objetivo

Reforçar o endpoint de render da cena para impedir enfileiramento de timeline inválida e garantir ordenação estável dos turnos.

## Alterações aplicadas

- Validação de sobreposição temporal no endpoint `POST /api/avatar-scenes/[sceneId]/render`.
- Ordenação defensiva dos turnos antes de gerar payload de fila e `slideContent`.
- Integração de geração local por turno no render (`engine=local`):
  - TTS real com `edge-tts` (`/lib/tts/edge-tts-service`),
  - lip-sync real via `LipSyncOrchestrator` (Azure/Rhubarb fallback),
  - persistência de `turnAssets` e `turnAssetsSummary` no `renderSettings` do job.
- Bloqueio explícito de enfileiramento quando nenhum turno gera asset local utilizável (HTTP 422).
- Teste de regressão cobrindo:
  - bloqueio de turnos sobrepostos (HTTP 400),
  - ordenação correta no payload enviado para fila,
  - bloqueio de render local sem assets válidos (HTTP 422).

## Execução de teste

Comando alvo:

```bash
cd estudio_ia_videos && npx jest -c jest.config.cjs src/__tests__/api/avatar-scenes/render.route.test.ts --runInBand
```

Estado atual: bloqueado por infraestrutura de sandbox no host (`rg`, `bwrap`, `socat`).
