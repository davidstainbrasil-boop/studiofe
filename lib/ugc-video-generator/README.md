# UGC Video Generator

🎬 **Gerador de vídeos UGC automatizado para e-commerce (Mercado Livre)**

Transforma scripts de texto em vídeos com narração, legendas e transições.

## 🚀 Quick Start

```bash
# 1. Instalar dependências do Node
npm install

# 2. Instalar edge-tts (TTS gratuito)
pip install edge-tts

# 3. Compilar TypeScript
npm run build

# 4. Testar o pipeline
npm run test:pipeline

# 5. Usar a CLI
npm run cli -- parse input/scripts/smartwatch-exemplo.md
npm run cli -- tts input/scripts/smartwatch-exemplo.md
```

## 📋 Comandos CLI

```bash
# Ver estrutura de um script
ugc-video parse <script.md>

# Gerar áudios TTS
ugc-video tts <script.md> [-o output/audio] [-v pt-BR-AntonioNeural]

# Listar vozes disponíveis
ugc-video voices

# Listar presets de vídeo
ugc-video presets

# Criar projeto de exemplo
ugc-video init meu-produto
```

## 📝 Formato do Script

```markdown
---
product: Nome do Produto
voice: pt-BR-FranciscaNeural
---

# Título do Vídeo

## Cena 1 - Intro [duração: 4s]
Texto da narração para esta cena.

## Cena 2 - Produto [produto: imagem.jpg] [duração: 5s]
Mais texto de narração com imagem associada.

## Cena 3 - CTA [duração: 5s]
Compre agora! Link na descrição!
```

## 🎙️ Vozes Brasileiras (pt-BR)

| Voz | Tipo | Uso Recomendado |
|-----|------|-----------------|
| pt-BR-FranciscaNeural | Feminina | Energética, vendas |
| pt-BR-LeticiaNeural | Feminina | Calma, profissional |
| pt-BR-ThalitaNeural | Feminina | Jovem, dinâmica |
| pt-BR-AntonioNeural | Masculina | Confiante, persuasivo |
| pt-BR-FabioNeural | Masculina | Amigável, casual |

## 📁 Estrutura do Projeto

```
ugc-video-generator/
├── src/
│   ├── core/
│   │   └── script-parser.ts    # Parser de scripts Markdown
│   ├── services/
│   │   └── tts-service.ts      # Serviço de Text-to-Speech
│   ├── types/
│   │   └── index.ts            # Tipos TypeScript
│   ├── cli.ts                  # Interface de linha de comando
│   ├── index.ts                # Entry point
│   └── test-pipeline.ts        # Teste funcional
├── input/
│   └── scripts/                # Scripts de entrada
├── output/
│   ├── audio/                  # Áudios gerados
│   └── videos/                 # Vídeos finais
├── package.json
└── tsconfig.json
```

## 🛠️ Tecnologias

- **Node.js 20+** - Runtime
- **TypeScript 5** - Linguagem
- **edge-tts** - TTS gratuito (Microsoft Azure voices)
- **FFmpeg** - Processamento de vídeo
- **Sharp** - Processamento de imagens
- **Commander** - CLI framework
- **Zod** - Validação de schemas

## 📊 Pipeline de Renderização

```
1. Script (.md) → Parse → ScriptScene[]
2. Cenas → TTS (edge-tts) → Áudios (.mp3)
3. Áudios → Duração real → Sincronização
4. Imagens → Sharp → Frames processados
5. Frames + Áudios → FFmpeg → Vídeo (.mp4)
6. Vídeo → Legendas (SRT) → Vídeo final
```

## ⚡ Status do Desenvolvimento

- [x] Parser de scripts Markdown
- [x] Serviço TTS com edge-tts
- [x] CLI básica
- [x] Tipos TypeScript
- [ ] Gerador de frames
- [ ] Pipeline FFmpeg
- [ ] Sistema de legendas
- [ ] Templates visuais
- [ ] Preview em tempo real

## 📄 Licença

MIT © 2024
