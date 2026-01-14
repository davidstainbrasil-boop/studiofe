cat > .agent/BACKLOG.md <<'MD'
# BACKLOG — GO-LIVE MVP Vídeos TécnicoCursos v7

## FASE 1 — PIPELINE REAL (bloqueante)
- [x] F1.1 TTS: substituir mock em lib/tts/tts-service.ts (REAL - ElevenLabs/Azure/edge-tts)
- [x] F1.2 TTS: implementar engine real em lib/tts/engine-manager.ts (REAL - delega para tts-service)
- [ ] F1.3 TTS: bloquear/implementar azure provider mock (lib/tts/providers/azure.ts:33)
- [x] F1.4 API: corrigir /api/tts/generate (retorna só áudio real)
- [ ] F1.5 Worker: valida ffmpeg no boot
- [x] F1.6 Worker: valida edge-tts/elevenlabs no boot (script: validate-tts-dependencies.ts)

## FASE 2 — CONFIABILIDADE
- [ ] F2.1 Render start: evitar job órfão (DB + enqueue com compensação)
- [ ] F2.2 Worker: stuck detector (processing infinito)
- [ ] F2.3 Worker: retry upload final + estado failed_upload

## FASE 3 — WORKER COMO SERVIÇO
- [ ] F3.1 Subir worker via PM2/systemd/Docker
- [ ] F3.2 Auto-restart + logs persistentes + healthcheck

## FASE 4 — SEGURANÇA
- [ ] F4.1 Remover bypass x-user-id em produção
- [ ] F4.2 Bloquear USE_MOCK_* fora de development

## FASE 5 — GATE FINAL
- [ ] F5.1 E2E: PPTX → Parse → TTS real → Render → Storage → Download toca com áudio
MD
