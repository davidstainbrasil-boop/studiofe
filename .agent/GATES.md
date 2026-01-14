cat > .agent/GATES.md <<'MD'
# GATES (obrigatórios)
Um PR só passa se cumprir o gate da fase.

## Gate Fase 1 — Áudio REAL
- /api/tts/generate retorna audioUrl existente
- arquivo mp3/wav existe e é acessível
- sem setTimeout / placeholder / fakeUrl

## Gate Fase 2 — Jobs confiáveis
- não existe job preso em pending/processing sem watchdog
- falha de enqueue gera rollback ou status failed_enqueue

## Gate Fase 3 — Operação
- worker sobe sozinho após reboot
- auto-restart ativo
- logs persistem

## Gate Final
- 1 PPTX gera 1 vídeo no storage com áudio audível
MD
