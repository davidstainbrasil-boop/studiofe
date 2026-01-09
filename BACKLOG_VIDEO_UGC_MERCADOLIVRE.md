# 🎬 Product Backlog - Sistema de Vídeos UGC para Mercado Livre

**Projeto:** Automação de Vídeos UGC para E-commerce  
**Plataforma Alvo:** Mercado Livre  
**Data:** 06 de Janeiro de 2026  
**Stack Recomendada:** Node.js (TypeScript) + Python (processamento de mídia)

---

## 📋 Visão do Produto

Sistema automatizado para criar vídeos estilo UGC (User Generated Content) para anúncios do Mercado Livre, transformando:
- **Script de texto** → Narração com voz AI
- **Imagens de produtos** → Sequência visual animada
- **Tudo sincronizado** → Vídeo final com legendas

---

## 🏗️ Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE PRODUÇÃO                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  📝 Script     🖼️ Imagens      🎙️ TTS         🎬 Composição            │
│     │              │              │                │                    │
│     ▼              ▼              ▼                ▼                    │
│  ┌──────┐    ┌──────────┐   ┌──────────┐    ┌──────────┐              │
│  │Parser│    │ Loader   │   │ElevenLabs│    │  FFmpeg  │              │
│  │Texto │    │ Imagens  │   │ ou Edge  │    │ + Canvas │              │
│  └──┬───┘    └────┬─────┘   └────┬─────┘    └────┬─────┘              │
│     │             │              │                │                    │
│     └─────────────┴──────────────┴────────────────┘                    │
│                           │                                            │
│                           ▼                                            │
│                    ┌──────────────┐                                    │
│                    │ Video Final  │                                    │
│                    │   .mp4       │                                    │
│                    └──────────────┘                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Product Backlog Ordenado por Prioridade

---

## 🔴 FASE 1: FUNDAÇÃO (Sprint 1-2)

### US-001: Estrutura Base do Projeto ✅ CONCLUÍDA
**Prioridade:** P0 - Crítico  
**Complexidade:** M (3 pontos)  
**Estimativa:** 1 dia  
**Status:** ✅ IMPLEMENTADA

> **Como** desenvolvedor,  
> **Preciso** ter a estrutura base do projeto configurada  
> **Para** começar a implementar as funcionalidades

**Tarefas Técnicas:**
```
✅ Inicializar projeto Node.js com TypeScript
✅ Configurar ESLint + Prettier  
✅ Criar estrutura de pastas
✅ Configurar scripts npm
✅ Criar .env.example com variáveis necessárias
```

**Estrutura de Pastas:**
```
ugc-video-generator/
├── src/
│   ├── core/           # Lógica principal
│   ├── services/       # Integrações externas
│   ├── utils/          # Utilitários
│   ├── templates/      # Templates de vídeo
│   └── types/          # TypeScript types
├── assets/
│   ├── fonts/          # Fontes para legendas
│   ├── music/          # Músicas de fundo
│   └── overlays/       # Elementos visuais
├── input/              # Pasta de entrada
│   ├── scripts/        # Scripts de texto
│   └── products/       # Imagens de produtos
├── output/             # Vídeos gerados
├── temp/               # Arquivos temporários
└── config/             # Configurações
```

**Bibliotecas Node.js:**
| Biblioteca | Versão | Propósito |
|------------|--------|-----------|
| `typescript` | ^5.x | Tipagem estática |
| `tsx` | ^4.x | Execução TS direto |
| `dotenv` | ^16.x | Variáveis de ambiente |
| `zod` | ^3.x | Validação de schemas |
| `winston` | ^3.x | Logging estruturado |
| `commander` | ^12.x | CLI interface |

**Definition of Done:**
- [ ] `npm run dev` executa sem erros
- [ ] `npm run build` gera bundle
- [ ] Estrutura de pastas criada
- [ ] TypeScript strict mode ativo

---

### US-002: Parser de Script de Texto
**Prioridade:** P0 - Crítico  
**Complexidade:** P (2 pontos)  
**Estimativa:** 0.5 dia

> **Como** sistema,  
> **Preciso** ler e interpretar scripts de texto  
> **Para** saber o que narrar e quando mostrar cada produto

**Formato do Script (Markdown-like):**
```markdown
# Vídeo: Fone Bluetooth XYZ

## Cena 1 [produto: fone-frente.jpg] [duração: 5s]
Você está cansado de fios enrolados? Conheça o Fone XYZ!

## Cena 2 [produto: fone-case.jpg] [duração: 4s]
Com case carregador que dura até 30 horas!

## Cena 3 [produto: fone-uso.jpg] [duração: 5s]
Conexão bluetooth 5.0, pareamento instantâneo!

## CTA [background: verde-ml.png] [duração: 3s]
Compre agora no Mercado Livre! Link na descrição.
```

**Tarefas Técnicas:**
```
□ Criar interface ScriptScene
□ Implementar parser de markdown customizado
□ Extrair metadados (produto, duração, background)
□ Validar estrutura do script
□ Calcular duração total do vídeo
```

**Código Base:**
```typescript
// src/core/script-parser.ts
interface ScriptScene {
  id: string;
  type: 'product' | 'cta' | 'intro' | 'outro';
  text: string;
  productImage?: string;
  background?: string;
  duration: number; // segundos
  transitions?: {
    in: 'fade' | 'slide' | 'zoom';
    out: 'fade' | 'slide' | 'zoom';
  };
}

interface ParsedScript {
  title: string;
  scenes: ScriptScene[];
  totalDuration: number;
  metadata: {
    author?: string;
    product?: string;
    category?: string;
  };
}
```

**Bibliotecas Node.js:**
| Biblioteca | Propósito |
|------------|-----------|
| `marked` | Parser Markdown base |
| `gray-matter` | Frontmatter YAML |
| `zod` | Validação do schema |

**Definition of Done:**
- [ ] Parser lê arquivo .md
- [ ] Extrai todas as cenas corretamente
- [ ] Valida estrutura obrigatória
- [ ] Testes unitários passando

---

### US-003: Loader de Imagens de Produtos
**Prioridade:** P0 - Crítico  
**Complexidade:** P (2 pontos)  
**Estimativa:** 0.5 dia

> **Como** sistema,  
> **Preciso** carregar e validar imagens de uma pasta  
> **Para** usar nos vídeos

**Tarefas Técnicas:**
```
□ Escanear pasta de produtos
□ Validar formatos suportados (jpg, png, webp)
□ Verificar resolução mínima (1080x1080)
□ Criar thumbnails para preview
□ Mapear imagens para cenas do script
```

**Código Base:**
```typescript
// src/core/image-loader.ts
interface ProductImage {
  id: string;
  filename: string;
  path: string;
  width: number;
  height: number;
  format: 'jpg' | 'png' | 'webp';
  aspectRatio: number;
  thumbnailPath?: string;
}

interface ImageLoaderOptions {
  inputDir: string;
  minWidth: number;
  minHeight: number;
  supportedFormats: string[];
}
```

**Bibliotecas Node.js:**
| Biblioteca | Propósito |
|------------|-----------|
| `sharp` | Processamento de imagens (resize, convert) |
| `glob` | Busca de arquivos por padrão |
| `image-size` | Obter dimensões sem carregar |
| `fs-extra` | Operações de arquivo melhoradas |

**Definition of Done:**
- [ ] Lista todas imagens de uma pasta
- [ ] Valida dimensões mínimas
- [ ] Gera thumbnails automaticamente
- [ ] Rejeita formatos inválidos

---

### US-004: Geração de Áudio TTS (Text-to-Speech)
**Prioridade:** P0 - Crítico  
**Complexidade:** M (3 pontos)  
**Estimativa:** 1 dia

> **Como** sistema,  
> **Preciso** converter texto em narração de voz  
> **Para** ter o áudio do vídeo

**Tarefas Técnicas:**
```
□ Integrar com API de TTS (ElevenLabs ou Edge-TTS)
□ Gerar áudio para cada cena
□ Detectar duração real do áudio
□ Ajustar velocidade se necessário
□ Cache de áudios gerados (evitar re-gerar)
```

**Providers Suportados:**
| Provider | Qualidade | Custo | Latência |
|----------|-----------|-------|----------|
| **ElevenLabs** | ⭐⭐⭐⭐⭐ | $5/100k chars | ~2s |
| **Edge-TTS** | ⭐⭐⭐⭐ | Grátis | ~1s |
| **Google TTS** | ⭐⭐⭐⭐ | $4/1M chars | ~1s |
| **Amazon Polly** | ⭐⭐⭐⭐ | $4/1M chars | ~1s |

**Código Base:**
```typescript
// src/services/tts-service.ts
interface TTSOptions {
  text: string;
  voice: string;
  speed?: number; // 0.5 - 2.0
  pitch?: number;
  outputPath: string;
}

interface TTSResult {
  audioPath: string;
  duration: number; // segundos
  wordTimestamps?: WordTimestamp[]; // para legendas
}

interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}
```

**Bibliotecas Node.js:**
| Biblioteca | Propósito |
|------------|-----------|
| `elevenlabs` | SDK oficial ElevenLabs |
| `edge-tts` | Microsoft Edge TTS (grátis) |
| `@google-cloud/text-to-speech` | Google Cloud TTS |
| `fluent-ffmpeg` | Detectar duração do áudio |

**Bibliotecas Python (alternativa):**
| Biblioteca | Propósito |
|------------|-----------|
| `edge-tts` | TTS grátis Microsoft |
| `elevenlabs` | SDK Python |
| `pydub` | Manipulação de áudio |

**Definition of Done:**
- [ ] Gera áudio MP3 a partir de texto
- [ ] Suporta pelo menos 2 providers
- [ ] Retorna duração precisa
- [ ] Fallback automático se provider falhar

---

## 🟠 FASE 2: COMPOSIÇÃO DE VÍDEO (Sprint 3-4)

### US-005: Motor de Composição de Frames
**Prioridade:** P0 - Crítico  
**Complexidade:** G (8 pontos)  
**Estimativa:** 3 dias

> **Como** sistema,  
> **Preciso** criar frames de vídeo a partir de imagens e texto  
> **Para** montar o vídeo final

**Tarefas Técnicas:**
```
□ Criar canvas com resolução correta (1080x1920 vertical)
□ Renderizar imagem do produto centralizada
□ Adicionar overlay de texto/legenda
□ Aplicar animações básicas (zoom, pan)
□ Gerar sequência de frames PNG
```

**Formatos de Saída (Mercado Livre):**
| Formato | Resolução | Uso |
|---------|-----------|-----|
| **Vertical (9:16)** | 1080x1920 | Stories, Reels |
| **Quadrado (1:1)** | 1080x1080 | Feed ML |
| **Horizontal (16:9)** | 1920x1080 | YouTube |

**Código Base:**
```typescript
// src/core/frame-composer.ts
interface FrameComposerOptions {
  width: number;
  height: number;
  fps: number;
  backgroundColor: string;
}

interface FrameElement {
  type: 'image' | 'text' | 'shape' | 'overlay';
  position: { x: number; y: number };
  size: { width: number; height: number };
  animation?: Animation;
  content: string | Buffer;
}

interface Animation {
  type: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'fade';
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}
```

**Bibliotecas Node.js:**
| Biblioteca | Propósito |
|------------|-----------|
| `canvas` (node-canvas) | Renderização 2D |
| `sharp` | Composição de imagens |
| `fabric` | Canvas avançado com objetos |
| `konva` | Alternativa ao fabric |

**Bibliotecas Python:**
| Biblioteca | Propósito |
|------------|-----------|
| `Pillow` | Processamento de imagens |
| `opencv-python` | Composição avançada |
| `moviepy` | Composição de vídeo direto |

**Definition of Done:**
- [ ] Gera frames 1080x1920
- [ ] Posiciona imagem do produto
- [ ] Aplica zoom suave (Ken Burns)
- [ ] Exporta sequência PNG

---

### US-006: Geração de Legendas Sincronizadas
**Prioridade:** P1 - Alta  
**Complexidade:** M (5 pontos)  
**Estimativa:** 2 dias

> **Como** sistema,  
> **Preciso** gerar legendas sincronizadas com o áudio  
> **Para** que o vídeo funcione sem som (autoplay ML)

**Tarefas Técnicas:**
```
□ Transcrever áudio com timestamps (word-level)
□ Dividir em chunks de 2-4 palavras
□ Gerar arquivo SRT/VTT
□ Estilizar legendas (fonte, cor, contorno)
□ Burn-in legendas nos frames
```

**Estilo de Legenda UGC:**
```
┌────────────────────────────────────┐
│                                    │
│         [IMAGEM PRODUTO]           │
│                                    │
│    ┌──────────────────────────┐    │
│    │   VOCÊ PRECISA DESSE    │    │
│    │       PRODUTO!          │    │
│    └──────────────────────────┘    │
│                                    │
└────────────────────────────────────┘

Estilo: Fonte bold, fundo semi-transparente
        Palavras-chave em destaque (cor diferente)
        Animação: palavra por palavra
```

**Código Base:**
```typescript
// src/core/subtitle-generator.ts
interface SubtitleStyle {
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  strokeColor: string;
  strokeWidth: number;
  position: 'top' | 'center' | 'bottom';
  animation: 'none' | 'word-by-word' | 'typewriter' | 'pop';
}

interface SubtitleSegment {
  text: string;
  startTime: number;
  endTime: number;
  words?: WordTiming[];
  style?: Partial<SubtitleStyle>;
}
```

**Bibliotecas Node.js:**
| Biblioteca | Propósito |
|------------|-----------|
| `whisper-node` | Transcrição com timestamps |
| `subtitle` | Parser/Writer SRT/VTT |
| `canvas` | Renderizar texto nos frames |
| `openai` (Whisper API) | Transcrição cloud |

**Bibliotecas Python:**
| Biblioteca | Propósito |
|------------|-----------|
| `openai-whisper` | Transcrição local |
| `pysrt` | Manipulação SRT |
| `faster-whisper` | Whisper otimizado |

**Definition of Done:**
- [ ] Gera SRT a partir do áudio
- [ ] Legendas sincronizadas palavra a palavra
- [ ] Estilo visual UGC aplicado
- [ ] Preview das legendas funcional

---

### US-007: Encoding de Vídeo com FFmpeg
**Prioridade:** P0 - Crítico  
**Complexidade:** M (5 pontos)  
**Estimativa:** 2 dias

> **Como** sistema,  
> **Preciso** combinar frames + áudio em vídeo MP4  
> **Para** ter o produto final

**Tarefas Técnicas:**
```
□ Combinar sequência de frames em vídeo
□ Adicionar trilha de áudio (narração)
□ Adicionar música de fundo (opcional)
□ Encoding H.264 otimizado para web
□ Gerar thumbnail automático
```

**Configurações Recomendadas Mercado Livre:**
```bash
ffmpeg -framerate 30 \
  -i frames/frame_%04d.png \
  -i audio/narration.mp3 \
  -i audio/background_music.mp3 \
  -filter_complex "[1:a]volume=1.0[narration];[2:a]volume=0.15[music];[narration][music]amix=inputs=2:duration=first[aout]" \
  -map 0:v -map "[aout]" \
  -c:v libx264 -preset medium -crf 23 \
  -c:a aac -b:a 192k \
  -pix_fmt yuv420p \
  -movflags +faststart \
  -y output/video_final.mp4
```

**Bibliotecas Node.js:**
| Biblioteca | Propósito |
|------------|-----------|
| `fluent-ffmpeg` | Wrapper FFmpeg |
| `ffmpeg-static` | FFmpeg binário bundled |
| `@ffmpeg/ffmpeg` | FFmpeg WASM (browser) |

**Bibliotecas Python:**
| Biblioteca | Propósito |
|------------|-----------|
| `ffmpeg-python` | Wrapper FFmpeg |
| `moviepy` | Edição de vídeo alto nível |

**Definition of Done:**
- [ ] Gera MP4 com frames + áudio
- [ ] Música de fundo mixada
- [ ] Codec H.264 compatível
- [ ] Tamanho < 50MB (limite ML)

---

## 🟡 FASE 3: TEMPLATES E UX (Sprint 5-6)

### US-008: Sistema de Templates de Vídeo
**Prioridade:** P1 - Alta  
**Complexidade:** M (5 pontos)  
**Estimativa:** 2 dias

> **Como** usuário,  
> **Preciso** escolher templates pré-definidos  
> **Para** criar vídeos rapidamente sem conhecimento técnico

**Templates Propostos:**
| Template | Descrição | Uso Ideal |
|----------|-----------|-----------|
| **ML Clássico** | Fundo verde ML, produto central | Eletrônicos |
| **Lifestyle** | Produto em contexto, cores suaves | Moda, Casa |
| **Urgência** | Cores vibrantes, countdown | Promoções |
| **Review** | Estilo avaliação, estrelas | Qualquer |
| **Comparativo** | Antes/Depois, lado a lado | Beleza |

**Estrutura do Template:**
```typescript
// src/templates/template-schema.ts
interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  
  // Configurações visuais
  resolution: { width: number; height: number };
  backgroundColor: string;
  accentColor: string;
  
  // Elementos
  layout: {
    productArea: { x: number; y: number; width: number; height: number };
    textArea: { x: number; y: number; width: number; height: number };
    logoArea?: { x: number; y: number; width: number; height: number };
  };
  
  // Estilos
  fonts: {
    title: FontStyle;
    body: FontStyle;
    cta: FontStyle;
  };
  
  // Animações padrão
  animations: {
    productEntrance: Animation;
    textEntrance: Animation;
    transition: Animation;
  };
  
  // Assets incluídos
  assets: {
    overlays: string[];
    music: string[];
    sounds: string[];
  };
}
```

**Definition of Done:**
- [ ] 5 templates funcionais
- [ ] Preview de cada template
- [ ] Customização de cores
- [ ] Assets incluídos

---

### US-009: CLI Interativo
**Prioridade:** P1 - Alta  
**Complexidade:** M (3 pontos)  
**Estimativa:** 1 dia

> **Como** usuário,  
> **Preciso** de uma interface de linha de comando amigável  
> **Para** criar vídeos sem programar

**Comandos:**
```bash
# Criar vídeo a partir de script
ugc-video create --script ./meu-script.md --output ./video.mp4

# Criar com template específico
ugc-video create --script ./script.md --template ml-classico

# Listar templates disponíveis
ugc-video templates list

# Preview sem gerar vídeo final
ugc-video preview --script ./script.md

# Modo interativo (wizard)
ugc-video wizard
```

**Bibliotecas Node.js:**
| Biblioteca | Propósito |
|------------|-----------|
| `commander` | Parser de argumentos |
| `inquirer` | Prompts interativos |
| `ora` | Spinners de loading |
| `chalk` | Cores no terminal |
| `cli-progress` | Barra de progresso |
| `figlet` | ASCII art no banner |

**Definition of Done:**
- [ ] Todos os comandos funcionais
- [ ] Help text completo
- [ ] Modo wizard interativo
- [ ] Barra de progresso durante render

---

### US-010: Interface Web (Opcional)
**Prioridade:** P2 - Média  
**Complexidade:** G (8 pontos)  
**Estimativa:** 4 dias

> **Como** usuário não-técnico,  
> **Preciso** de uma interface web  
> **Para** criar vídeos pelo navegador

**Telas:**
1. **Dashboard** - Listar vídeos criados
2. **Editor** - Escrever/colar script
3. **Upload** - Arrastar imagens
4. **Preview** - Visualizar antes de gerar
5. **Export** - Baixar vídeo final

**Bibliotecas (se usar web):**
| Biblioteca | Propósito |
|------------|-----------|
| `Next.js` | Framework React |
| `Tailwind CSS` | Estilização |
| `React Dropzone` | Upload de arquivos |
| `Video.js` | Player de preview |

---

## 🟢 FASE 4: FUNCIONALIDADES AVANÇADAS (Sprint 7+)

### US-011: Integração com API do Mercado Livre
**Prioridade:** P2 - Média  
**Complexidade:** G (8 pontos)  
**Estimativa:** 3 dias

> **Como** vendedor,  
> **Preciso** importar dados do produto direto do ML  
> **Para** não digitar informações manualmente

**Funcionalidades:**
```
□ Autenticação OAuth2 com ML
□ Buscar produto por ID/URL
□ Importar título, descrição, preço
□ Baixar imagens do anúncio
□ Gerar script automaticamente a partir dos dados
```

**API Mercado Livre:**
```typescript
// src/services/mercadolivre-service.ts
interface MLProduct {
  id: string;
  title: string;
  price: number;
  currency: string;
  pictures: MLPicture[];
  description: string;
  attributes: MLAttribute[];
  seller: MLSeller;
}

async function fetchProductFromML(itemId: string): Promise<MLProduct>;
async function downloadProductImages(product: MLProduct): Promise<string[]>;
async function generateScriptFromProduct(product: MLProduct): Promise<string>;
```

**Bibliotecas:**
| Biblioteca | Propósito |
|------------|-----------|
| `mercadolibre` | SDK não oficial |
| `axios` | Requisições HTTP |
| `p-queue` | Rate limiting |

---

### US-012: Geração de Script com IA
**Prioridade:** P2 - Média  
**Complexidade:** M (5 pontos)  
**Estimativa:** 2 dias

> **Como** vendedor,  
> **Preciso** que a IA escreva o roteiro  
> **Para** criar vídeos ainda mais rápido

**Prompt Base:**
```
Você é um copywriter especialista em vídeos UGC para e-commerce.
Crie um roteiro de vídeo de 30 segundos para o seguinte produto:

Produto: {titulo}
Preço: R$ {preco}
Características: {atributos}

O roteiro deve:
- Ter 4-5 cenas curtas
- Usar linguagem persuasiva e informal
- Incluir CTA no final
- Formato: [CENA X] [duração] - Texto da narração
```

**Bibliotecas:**
| Biblioteca | Propósito |
|------------|-----------|
| `openai` | GPT-4 API |
| `anthropic` | Claude API |
| `langchain` | Orquestração LLM |

---

### US-013: Biblioteca de Músicas de Fundo
**Prioridade:** P3 - Baixa  
**Complexidade:** P (2 pontos)  
**Estimativa:** 1 dia

> **Como** criador,  
> **Preciso** escolher músicas de fundo  
> **Para** deixar o vídeo mais dinâmico

**Categorias:**
- Energética (promoções, urgência)
- Suave (lifestyle, moda)
- Corporativa (B2B, serviços)
- Trending (sons virais)

**Fontes de Músicas Royalty-Free:**
- Pixabay Music
- Mixkit
- YouTube Audio Library
- Epidemic Sound (pago)

---

### US-014: Efeitos Visuais e Transições
**Prioridade:** P3 - Baixa  
**Complexidade:** M (5 pontos)  
**Estimativa:** 2 dias

> **Como** criador,  
> **Preciso** de efeitos visuais  
> **Para** tornar o vídeo mais profissional

**Efeitos:**
- Zoom Ken Burns (lento zoom in/out)
- Glitch (estilo tech)
- Partículas (confete, brilho)
- Shake (chamar atenção)
- Split screen (comparativo)

---

### US-015: Batch Processing (Lote)
**Prioridade:** P2 - Média  
**Complexidade:** M (5 pontos)  
**Estimativa:** 2 dias

> **Como** vendedor com muitos produtos,  
> **Preciso** gerar vídeos em lote  
> **Para** escalar produção

**Funcionalidades:**
```
□ Ler CSV/Excel com lista de produtos
□ Processar em paralelo (workers)
□ Fila de processamento
□ Relatório de conclusão
□ Retry automático em falhas
```

---

### US-016: Analytics e Otimização
**Prioridade:** P3 - Baixa  
**Complexidade:** M (5 pontos)  
**Estimativa:** 2 dias

> **Como** vendedor,  
> **Preciso** saber quais vídeos performam melhor  
> **Para** otimizar próximas criações

**Métricas:**
- Duração média dos vídeos
- Templates mais usados
- Tempo de geração
- Taxa de sucesso/erro

---

## 📊 Resumo do Backlog

| Fase | User Stories | Complexidade | Estimativa |
|------|--------------|--------------|------------|
| **Fase 1: Fundação** | US-001 a US-004 | 10 pontos | ~3 dias |
| **Fase 2: Composição** | US-005 a US-007 | 18 pontos | ~7 dias |
| **Fase 3: Templates/UX** | US-008 a US-010 | 16 pontos | ~7 dias |
| **Fase 4: Avançado** | US-011 a US-016 | 30 pontos | ~12 dias |
| **TOTAL** | 16 US | 74 pontos | ~29 dias |

---

## 🛠️ Stack Técnica Recomendada

### Opção A: Full Node.js (Recomendado)
```json
{
  "runtime": "Node.js 20+",
  "language": "TypeScript 5+",
  "core": {
    "sharp": "Processamento de imagens",
    "canvas": "Renderização 2D",
    "fluent-ffmpeg": "Encoding de vídeo",
    "elevenlabs": "TTS premium",
    "edge-tts": "TTS gratuito"
  },
  "cli": {
    "commander": "CLI parser",
    "inquirer": "Prompts interativos",
    "ora": "Loading spinners"
  },
  "web": {
    "next.js": "Framework web (opcional)",
    "tailwindcss": "Estilização"
  }
}
```

### Opção B: Híbrido Node.js + Python
```json
{
  "orchestration": "Node.js (TypeScript)",
  "media_processing": "Python",
  "python_libs": {
    "moviepy": "Composição de vídeo",
    "Pillow": "Imagens",
    "openai-whisper": "Transcrição",
    "edge-tts": "TTS gratuito"
  }
}
```

---

## 🚀 Próximos Passos

1. **Semana 1:** Implementar US-001 a US-004 (fundação)
2. **Semana 2:** Implementar US-005 a US-007 (composição)
3. **Semana 3:** Primeiro vídeo completo funcional
4. **Semana 4:** Templates e CLI (US-008, US-009)
5. **Mês 2:** Features avançadas conforme demanda

---

## 📝 Exemplo de Uso Final

```bash
# 1. Criar script
cat > meu-produto.md << 'EOF'
# Vídeo: Fone Bluetooth Premium

## Cena 1 [produto: fone1.jpg] [duração: 5s]
Cansado de fones que descarregam rápido?

## Cena 2 [produto: fone2.jpg] [duração: 4s]
O Fone XYZ tem 40 horas de bateria!

## Cena 3 [produto: fone3.jpg] [duração: 4s]
Cancelamento de ruído ativo para foco total.

## CTA [background: ml-verde.png] [duração: 3s]
Garanta o seu agora! Link na bio.
EOF

# 2. Colocar imagens na pasta
cp *.jpg ./input/products/

# 3. Gerar vídeo
ugc-video create \
  --script ./meu-produto.md \
  --template ml-classico \
  --voice "pt-BR-FranciscaNeural" \
  --output ./output/fone-bluetooth.mp4

# 4. Resultado
# ✅ Vídeo gerado: ./output/fone-bluetooth.mp4
# 📊 Duração: 16 segundos
# 📦 Tamanho: 8.2 MB
```

---

*Backlog criado em 06/01/2026*  
*Versão 1.0*
