# 📚 Exemplos de Uso - Sistema de Avatares

Esta pasta contém exemplos práticos de como usar o sistema completo de geração de avatares com IA.

---

## 🎯 Exemplos Disponíveis

### 1. **Básico** (`avatar-basic-usage.ts`)

Demonstra o uso mais simples do sistema.

```bash
# Rodar exemplo
npx tsx examples/avatar-basic-usage.ts
```

**O que faz**:
- Gera animação de avatar a partir de texto
- Usa PLACEHOLDER (grátis, rápido)
- Mostra estatísticas básicas

**Use quando**: Você quer testar rapidamente o sistema.

---

### 2. **Emoções** (`avatar-with-emotions.ts`)

Demonstra como usar diferentes emoções nos avatares.

```bash
# Rodar exemplo
npx tsx examples/avatar-with-emotions.ts
```

**O que faz**:
- Gera 4 cenas com diferentes emoções
- Happy, sad, surprised, neutral
- Calcula custos para cada cena

**Use quando**: Você precisa de avatares expressivos.

---

### 3. **Pipeline Completo** (`avatar-full-pipeline.ts`)

Demonstra o fluxo end-to-end completo.

```bash
# Rodar exemplo
npx tsx examples/avatar-full-pipeline.ts
```

**O que faz**:
- Pipeline completo: texto → animação → rendering
- Validação de qualidade
- Otimização de frames
- Export para múltiplos formatos
- Cálculo de custos
- Inicialização de rendering

**Use quando**: Você quer entender o sistema completo.

---

## 🚀 Como Rodar os Exemplos

### Pré-requisitos

```bash
# 1. Instalar dependências
cd estudio_ia_videos
npm install

# 2. Instalar tsx (TypeScript executor)
npm install -g tsx

# 3. Verificar que Phase 1 está funcionando
cd ..
node test-avatar-integration.mjs
```

### Rodar Todos os Exemplos

```bash
# Exemplo 1: Básico
npx tsx examples/avatar-basic-usage.ts

# Exemplo 2: Emoções
npx tsx examples/avatar-with-emotions.ts

# Exemplo 3: Pipeline Completo
npx tsx examples/avatar-full-pipeline.ts
```

---

## 📖 Conceitos Importantes

### Quality Tiers

| Tier | Provider | Speed | Cost | Use Case |
|------|----------|-------|------|----------|
| PLACEHOLDER | Local | <1s | FREE | Desenvolvimento |
| STANDARD | D-ID | ~45s | 1 cr | Produção |
| HIGH | RPM | ~3min | 3 cr | Premium |

### Emotions

- **neutral** - Rosto neutro
- **happy** - Sorrindo, feliz
- **sad** - Triste, cabisbaixo
- **angry** - Bravo, zangado
- **surprised** - Surpreso, admirado
- **fear** - Com medo
- **disgust** - Desgosto, nojo

### Micro-Animations

- **enableBlinks** - Piscar de olhos natural
- **enableBreathing** - Respiração sutil
- **enableHeadMovement** - Movimento de cabeça

---

## 🎓 Tutoriais Passo a Passo

### Tutorial 1: Primeira Animação

```typescript
import { AvatarLipSyncIntegration } from '@/lib/avatar/avatar-lip-sync-integration'

// 1. Criar integração
const integration = new AvatarLipSyncIntegration()

// 2. Gerar animação
const animation = await integration.generateAvatarAnimation({
  text: "Olá mundo!",
  avatarConfig: {
    quality: 'PLACEHOLDER',  // Grátis!
    emotion: 'happy',
    fps: 30
  }
})

// 3. Ver resultado
console.log(`Frames: ${animation.frames.length}`)
console.log(`Duração: ${animation.duration}s`)
```

### Tutorial 2: Validação e Otimização

```typescript
// Validar qualidade
const validation = integration.validateAnimation(animation)

if (!validation.isValid) {
  console.error('Erros:', validation.errors)
}

// Otimizar (remover frames redundantes)
const optimized = await integration.optimizeAnimation(animation)

console.log(`Redução: ${((1 - optimized.frames.length / animation.frames.length) * 100).toFixed(1)}%`)
```

### Tutorial 3: Rendering com Provider

```typescript
import { AvatarRenderOrchestrator } from '@/lib/avatar/avatar-render-orchestrator'

const orchestrator = new AvatarRenderOrchestrator({
  enableFallback: true  // Fallback automático
})

// Calcular custo
const cost = orchestrator.calculateRenderCost(animation.duration, 'STANDARD')
console.log(`Custo: ${cost.credits} créditos`)

// Renderizar
const result = await orchestrator.render(
  { animation, resolution: '1080p' },
  { available: 10, used: 0, limit: 100 }  // User credits
)

console.log(`Job ID: ${result.jobId}`)
```

---

## 🔧 Customização

### Alterar FPS

```typescript
// FPS mais alto = mais suave, mas maior tamanho
const animation = await integration.generateAvatarAnimation({
  text: "Teste",
  avatarConfig: {
    quality: 'PLACEHOLDER',
    fps: 60  // Default é 30
  }
})
```

### Intensidade da Emoção

```typescript
// Emoção sutil
const subtle = await integration.generateAvatarAnimation({
  text: "Teste",
  avatarConfig: {
    quality: 'PLACEHOLDER',
    emotion: 'happy',
    emotionIntensity: 0.3  // 0-1, default 0.5
  }
})

// Emoção intensa
const intense = await integration.generateAvatarAnimation({
  text: "Teste",
  avatarConfig: {
    quality: 'PLACEHOLDER',
    emotion: 'happy',
    emotionIntensity: 0.9  // Muito feliz!
  }
})
```

### Preview Rápido

```typescript
// Preview super rápido (FPS reduzido, sem head movement)
const preview = await integration.generatePreview("Teste rápido", {
  emotion: 'neutral'
})

// Pronto em <1 segundo!
```

---

## 📊 Benchmarks

### Performance (testado em servidor de desenvolvimento)

| Exemplo | Tempo | Frames | Tamanho |
|---------|-------|--------|---------|
| Básico (10s áudio) | ~500ms | 300 | ~150KB |
| Emoções (4 cenas) | ~2s | 120 | ~60KB |
| Pipeline Completo | ~1s | 450 | ~220KB |

*Usando PLACEHOLDER provider*

---

## 🐛 Troubleshooting

### "Module not found"

```bash
# Certifique-se de estar no diretório correto
cd estudio_ia_videos
npm install
```

### "Rhubarb not found"

```bash
# Instalar Rhubarb (veja FASE1_QUICK_REFERENCE.md)
# Ou execute:
../test-avatar-integration.mjs
```

### "TypeScript errors"

```bash
# Compilar TypeScript
npm run build
```

---

## 📚 Próximos Passos

Depois de rodar estes exemplos, confira:

1. **[FASE2_QUICK_START.md](../FASE2_QUICK_START.md)** - Guia de início rápido
2. **[FASE2_IMPLEMENTATION_COMPLETE.md](../FASE2_IMPLEMENTATION_COMPLETE.md)** - Docs técnica
3. **[README_FASE1_FASE2.md](../README_FASE1_FASE2.md)** - Índice mestre

---

## 🎯 Desafios

Experimente criar seus próprios exemplos:

1. **Avatar Multi-Língua**: Gere avatares em PT-BR, EN-US, ES-ES
2. **Sequência de Emoções**: Crie uma história com transições emocionais
3. **Compare Providers**: Teste PLACEHOLDER vs STANDARD vs HIGH
4. **Otimização Máxima**: Reduza frames ao máximo sem perder qualidade

---

**Divirta-se explorando o sistema!** 🚀
