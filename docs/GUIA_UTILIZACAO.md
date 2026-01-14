# Guia de Utilização - Módulo PPTX

Este guia descreve como utilizar o sistema de processamento de vídeos a partir de apresentações PowerPoint (PPTX).

## Visão Geral

O sistema permite fazer upload de arquivos `.pptx`, extrair seu conteúdo (texto, imagens, notas) e converter automaticamente em vídeos técnicos narrados.

## Fluxo de Trabalho

### 1. Upload de Arquivo

1. Acesse o Painel de Controle.
2. Clique em **"Novo Projeto"** > **"Importar PPTX"**.
3. Arraste ou selecione seu arquivo `.pptx`.
   - **Tamanho Máximo**: 50MB
   - **Formatos**: .pptx (Microsoft PowerPoint 2007+)

### 2. Processamento Automático

O sistema processará o arquivo em segundo plano:
- **Extração de Texto**: Títulos e corpo dos slides.
- **Extração de Imagens**: Imagens embutidas são extraídas e otimizadas.
- **Extração de Notas**: Notas do apresentador são convertidas em roteiro para narração (TTS).

### 3. Revisão e Edição

Após o processamento, você será redirecionado para o **Editor de Slides**:

- **Ajuste de Roteiro**: Edite o texto das notas na aba "Roteiro" para refinar a narração.
- **Seleção de Avatar**: Escolha um apresentador virtual para o slide.
- **Layout**: Verifique se as imagens foram posicionadas corretamente.

### 4. Renderização

1. Clique em **"Renderizar Vídeo"**.
2. Acompanhe o progresso na barra de status.
3. O vídeo final estará disponível para download ou publicação.

## Funcionalidades Avançadas

### Extração de Imagens
O sistema identifica automaticamente imagens dentro dos slides. Se uma imagem não for extraída corretamente:
- Verifique se ela não é um "Grupo" ou "SmartArt" no PowerPoint.
- Tente salvar a imagem como arquivo (PNG/JPG) e reinseri-la no slide.

### Notas de Orador
As notas são fundamentais para a narração automática.
- Use pontuação correta para garantir uma fala natural do Avatar.
- Evite abreviações técnicas desconhecidas.

## Suporte

Em caso de falhas no processamento:
1. Verifique se o arquivo PPTX não está corrompido.
2. Tente "Salvar Como" uma nova versão do arquivo no PowerPoint.
3. Contate o suporte técnico com o ID do projeto.
