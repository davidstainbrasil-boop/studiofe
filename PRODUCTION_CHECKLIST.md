# Checklist de Produção — Estúdio IA de Vídeos

Este checklist descreve dependências, variáveis e status atual do que é **REAL**, **BLOQUEADO** ou **ROADMAP** com base no código existente.  
Objetivo: garantir que o sistema funcione **ou falhe claramente** em produção.

## 1) Ambiente & Runtime

- [ ] Node.js >= 20 (`package.json` exige `>=20.0.0`)
- [ ] `npm install`
- [ ] `npm run build`
- [ ] `npm run type-check`

## 2) Variáveis de Ambiente Obrigatórias

**Core (Supabase / Auth / DB)**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**AI / Roteiro**

- `OPENAI_API_KEY` (roteiros via `/api/ai/generate-script`)

**TTS**

- `TTS_PROVIDER` (`elevenlabs`, `azure`, `edge-tts`)
- `ELEVENLABS_API_KEY` (se `TTS_PROVIDER=elevenlabs`)
- `AZURE_TTS_KEY` ou `AZURE_SPEECH_KEY` (se `TTS_PROVIDER=azure`)
- `AZURE_TTS_REGION` ou `AZURE_SPEECH_REGION` (se `TTS_PROVIDER=azure`)

**Legendas / Tradução**

- `TRANSLATION_PROVIDER` (`deepl` ou `google`)
- `DEEPL_API_KEY` (se `TRANSLATION_PROVIDER=deepl`)
- `GOOGLE_TRANSLATE_API_KEY` (se `TRANSLATION_PROVIDER=google`)
- `SUBTITLES_BUCKET` (opcional, default `subtitles`)

**Avatares**

- `HEYGEN_API_KEY` (HeyGen)
- `DID_API_KEY` (D-ID)

**Stock Media**

- `PEXELS_API_KEY` **ou** `PIXABAY_API_KEY` (busca de mídia em `/api/projects/create-from-script`)

**Email**

- `RESEND_API_KEY`
- `EMAIL_FROM`

**Billing**

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_ENTERPRISE_PRICE_ID`

**Queue / Cache**

- `REDIS_URL`

**Storage (S3/Cloudfront se utilizado)**

- `AWS_S3_BUCKET`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

> Referência adicional: `PRODUCTION_ENV_TEMPLATE.md`

## 3) Dependências Externas e Impacto se Ausentes

- **Supabase (DB/Storage/Auth)** → APIs de projetos, templates e uploads falham.
- **OpenAI** → geração de roteiro falha com erro explícito.
- **ElevenLabs/Azure** → TTS falha com erro explícito.
- **DeepL/Google Translate** → tradução de legendas falha com erro explícito.
- **HeyGen/D-ID** → render de avatar falha com erro explícito.
- **Pexels/Pixabay** → criação de projeto via script falha (sem mídia de stock).
- **Resend** → envio de email falha com erro explícito.
- **Stripe** → checkout/billing falha com erro explícito.
- **Redis** → fila e rate limiting falham (render/queue).
- **S3/Storage** → upload de mídia falha.

## 4) Status Atual (READY / BLOCKED / ROADMAP)

### READY (produção com dependências configuradas)

- **Geração de roteiro**: `/api/ai/generate-script` (OpenAI)
- **Criação de projeto via script**: `/api/projects/create-from-script` (Supabase + Stock Media)
- **Templates NR (DB)**: `/api/v1/templates/nr-smart` (dados reais do banco)
- **TTS**: `/api/tts/generate` (ElevenLabs/Azure/edge-tts)
- **Render queue real**: `/api/render/start` (usa fila/DB reais)
- **Export MP4**: `/api/export/mp4` (job real + fila + storage)
- **Transcrição real**: `/api/subtitles/transcribe` (Whisper OpenAI/local)
- **Tradução de legendas**: `TranscriptionService.translateTranscription` (DeepL/Google)
- **Webhooks**: `/api/webhooks/*` (persistência e entrega real)

### BLOCKED (dev-only ou mock desativado em produção)

- `/api/ai/generate` (mock)
- `/api/ai/detect-scenes` (mock)
- `/api/voice-cloning/generate` (dev-only)
- `/api/v1/avatar/generate` (mock)
- `/api/avatars/*` (endpoints legados mock: `render`, `3d/render`, `sync`, `generate-speech`)
- `/api/pipeline/integrated` (mock)
- `/api/remotion/render` (mock)
- `/api/placeholder/*` (placeholder)
- `/api/system/metrics` (mock)
- `/api/v1/analytics/*` (business-intelligence, content-analysis; export avançado)
- `/api/v1/ai-content*` e `/api/v1/ai-assistant/analyze` (mock)
- `/api/v1/enterprise-integration` (mock)
- `/api/v1/collaboration/*` (mock)
- Histórico de métricas em `/api/analytics/system-metrics?includeHistory=true` (mock)

### ROADMAP (existe referência mas não implementado)

- Render hiper-realista (UE5/Audio2Face) completo
- Remotion render em produção (desativado por build)

## 5) Observações de Segurança

- Qualquer serviço sem chave/API **falha explicitamente** em produção.
- Mocks permanecem **apenas** em `NODE_ENV=development`.
