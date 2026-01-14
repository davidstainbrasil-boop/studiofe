# Arquitetura do Processador PPTX

## Visão Geral

O módulo `pptx-processor` é responsável por ingerir arquivos PowerPoint e transformá-los em estruturas de dados utilizáveis pelo motor de renderização de vídeo.

## Componentes

### 1. `PptxProcessor` (Fachada)
- **Localização**: `src/lib/pptx/pptx-processor.ts`
- **Função**: Ponto de entrada principal. Orquestra o download do arquivo (via Supabase Storage) e delega o parsing.
- **Métodos Principais**:
  - `process(options)`: Executa o fluxo completo.

### 2. `processAdvancedPPTX` (Orquestrador)
- **Localização**: `src/lib/pptx/pptx-processor-advanced.ts`
- **Função**: Coordena os parsers especializados para montar o objeto `AdvancedSlideData`.
- **Estratégia**:
  1. Parse básico da estrutura XML (slides, IDs).
  2. Iteração sobre cada slide.
  3. Chamada de parsers específicos (Image, Notes, etc).

### 3. Parsers Especializados
Localizados em `src/lib/pptx/parsers/`:

- **`PPTXTextParser`**:
  - Usa `fast-xml-parser` para navegar na árvore XML do slide (`p:spTree`).
  - Extrai texto de `p:txBody` > `a:p` > `a:r` > `a:t`.
  - Suporta texto simples e CDATA.

- **`PPTXImageParser`**:
  - Analisa arquivos de relacionamento (`_rels/slideX.xml.rels`).
  - Identifica targets do tipo `image`.
  - Extrai binários de `ppt/media/`.
  - Retorna imagens em Base64 (Data URI) prontas para uso no frontend/render.

- **`PPTXNotesParser`**:
  - Identifica relacionamento com `notesSlide`.
  - Extrai texto das notas do orador, fundamental para o TTS (Text-to-Speech).

## Fluxo de Dados

```mermaid
graph TD
    A[Arquivo .pptx] --> B[JSZip Load]
    B --> C[PPTXParser (Base Structure)]
    C --> D{Iterar Slides}
    D --> E[PPTXTextParser]
    D --> F[PPTXImageParser]
    D --> G[PPTXNotesParser]
    E & F & G --> H[AdvancedSlideData]
    H --> I[Banco de Dados / Render Queue]
```

## Extensibilidade

Para adicionar suporte a **Animações**:
1. Criar `src/lib/pptx/parsers/animation-parser.ts`.
2. Ler a tag `p:timing` no XML do slide.
3. Mapear para a interface `AdvancedAnimation`.
4. Integrar em `processAdvancedPPTX`.
