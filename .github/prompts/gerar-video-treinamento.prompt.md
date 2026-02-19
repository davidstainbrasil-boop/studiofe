---
description: 'Gera vídeo de treinamento a partir de PPTX — configura narração, avatar, e exportação'
---

Gere um vídeo de treinamento profissional a partir de um arquivo PPTX, configurando todo o pipeline de conteúdo.

## Pipeline Completo:

### 1. Análise do PPTX

- Fazer parse dos slides com `lib/pptx/`
- Extrair textos, imagens, notas do apresentador
- Validar formato e número de slides
- Gerar preview das thumbnails

### 2. Script de Narração

- Se o PPTX tem notas do apresentador: usar como base da narração
- Se não tem notas: gerar script a partir do conteúdo dos slides
- Revisar script para linguagem clara e profissional
- Dividir narração por slide com timing estimado

### 3. Configuração de Voz (TTS)

- Selecionar provider adequado ao plano do usuário:
  - **Free:** Edge TTS (vozes Microsoft — pt-BR-FranciscaNeural, pt-BR-AntonioNeural)
  - **Pro:** ElevenLabs (vozes premium com expressividade)
  - **Business:** Google Cloud TTS (vozes neurais enterprise)
- Gerar áudio de narração para cada slide
- Verificar duração total e ajustar velocidade se necessário

### 4. Avatar (opcional)

- Se o usuário selecionou avatar:
  - **HeyGen:** Enviar áudio via API, receber vídeo do avatar falando
  - **Avatar local:** Renderizar com Three.js + lip-sync
- Posicionar avatar sobre o slide (canto inferior direito é padrão)
- Sincronizar labial com o áudio

### 5. Timeline e Transições

- Montar timeline: slide + áudio + avatar por segmento
- Aplicar transições entre slides (fade, slide, dissolve)
- Adicionar intro/outro se configurado no template
- Incluir marca d'água se plano Free

### 6. Enviar para Render

- Criar job no BullMQ com toda a configuração
- Monitorar status: `pending → queued → processing → completed`
- Retornar URL do vídeo finalizado ao usuário

## Configurações de Exportação:

```
RESOLUÇÃO: 1920x1080 (Full HD) | 1280x720 (HD) | 3840x2160 (4K — Business)
FORMATO: MP4 (H.264) | WebM (VP9)
FPS: 30
BITRATE: auto (baseado na resolução)
LEGENDAS: SRT opcional via lib/subtitles/
```

## Template NR (se aplicável):

- Se o treinamento é sobre NR (NR-06, NR-10, NR-12, NR-35, etc.):
  - Usar template `nr-templates/` com slides padrão de compliance
  - Incluir charges horárias e certificações necessárias
  - Adicionar logotipo da empresa se disponível

## Output esperado:

```
SLIDES PARSEADOS: [quantidade] slides extraídos
SCRIPT: Narração de [X] palavras / [Y] minutos estimados
VOZ: [provider] — [nome da voz]
AVATAR: [tipo] — [posição]
RESOLUÇÃO: [resolução selecionada]
STATUS: Job criado — ID: [job_id]
URL: [url do vídeo quando pronto]
```
