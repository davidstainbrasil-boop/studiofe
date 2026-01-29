# FASE 2: Quick Start Guide

**Status**: ✅ **PRONTO PARA USO**
**Integração**: Phase 1 + Phase 2 completas

---

## 🚀 Start em 3 Minutos

### 1. Validar Instalação

```bash
# Testar Phase 1 + Phase 2
node test-avatar-integration.mjs

# Resultado esperado:
# ✓ Phase 1 (Lip-Sync): OPERATIONAL
# ✓ Phase 2 (Avatares): IMPLEMENTED
# 🎉 SUCCESS: Phase 2 Integration Tests PASSED
```

### 2. Exemplo Básico (TypeScript)

```typescript
import { AvatarLipSyncIntegration } from '@/lib/avatar/avatar-lip-sync-integration'

// Criar integração
const integration = new AvatarLipSyncIntegration()

// Gerar animação de avatar
const animation = await integration.generateAvatarAnimation({
  text: "Olá, bem-vindo ao curso de JavaScript!",
  avatarConfig: {
    quality: 'STANDARD',      // PLACEHOLDER | STANDARD | HIGH
    emotion: 'happy',         // neutral | happy | sad | angry
    enableBlinks: true,
    enableBreathing: true,
    fps: 30
  }
})

console.log(`✓ Animação gerada: ${animation.frames.length} frames`)
console.log(`✓ Duração: ${animation.duration}s`)
console.log(`✓ Provider: ${animation.metadata.provider}`)
```

### 3. Rendering com Orchestrator

```typescript
import { AvatarRenderOrchestrator } from '@/lib/avatar/avatar-render-orchestrator'

const orchestrator = new AvatarRenderOrchestrator({
  enableFallback: true
})

// Renderizar vídeo
const result = await orchestrator.render(
  { animation, resolution: '1080p', outputFormat: 'mp4' },
  { available: 10, used: 0, limit: 100 } // User credits
)

console.log(`Job ID: ${result.jobId}`)
console.log(`Status: ${result.status}`)

// Verificar progresso
const status = await orchestrator.getJobStatus(result.jobId)
console.log(`Progress: ${status.progress}%`)
```

---

## 📊 Quality Tiers

| Tier | Credits | Speed | Use Case |
|------|---------|-------|----------|
| **PLACEHOLDER** | 0 | <1s | Desenvolvimento |
| **STANDARD** | 1/30s | ~45s | Produção normal |
| **HIGH** | 3/30s | ~3min | Qualidade premium |
| **HYPERREAL** | 10/30s | ~20min | Cinematográfico |

---

## 🔧 Exemplos Rápidos

### Preview Rápido (Grátis)

```typescript
const preview = await integration.generatePreview(
  "Teste rápido",
  { emotion: 'neutral' }
)
// Pronto em <1 segundo, 0 créditos
```

### Com Emoção

```typescript
const happyAvatar = await integration.generateAvatarAnimation({
  text: "Parabéns pelo progresso!",
  avatarConfig: {
    quality: 'STANDARD',
    emotion: 'happy',
    emotionIntensity: 0.8  // 0-1
  }
})
```

### Exportar para Diferentes Formatos

```typescript
// JSON (para web)
const json = integration.exportAnimation(animation, 'json')

// USD (para Unreal/Unity)
const usd = integration.exportAnimation(animation, 'usd')

// FBX data (para editores 3D)
const fbx = integration.exportAnimation(animation, 'fbx')
```

### Otimizar Animação

```typescript
// Remove frames redundantes
const optimized = await integration.optimizeAnimation(animation, 0.001)

console.log(`Original: ${animation.frames.length} frames`)
console.log(`Optimized: ${optimized.frames.length} frames`)
console.log(`Reduction: ${((1 - optimized.frames.length / animation.frames.length) * 100).toFixed(1)}%`)
```

---

## 🛠️ Providers Disponíveis

### Placeholder (Local)
```typescript
quality: 'PLACEHOLDER'
credits: 0
speed: <1 second
use: Desenvolvimento e testes
```

### D-ID (Cloud)
```typescript
quality: 'STANDARD'
credits: 1 per 30s
speed: ~45 seconds
use: Avatares realistas profissionais
```

### HeyGen (Cloud)
```typescript
quality: 'STANDARD'
credits: 1.5 per 30s
speed: ~60 seconds
use: Alta qualidade, fallback do D-ID
```

### Ready Player Me (3D)
```typescript
quality: 'HIGH'
credits: 3 per 30s
speed: ~3 minutes
use: Avatares 3D customizados
```

---

## ⚡ Recursos Avançados

### Fallback Automático

```typescript
// Se STANDARD falhar, usa PLACEHOLDER automaticamente
const orchestrator = new AvatarRenderOrchestrator({
  enableFallback: true,
  maxRetries: 3
})

// Ordem de fallback:
// HIGH → STANDARD → PLACEHOLDER
```

### Validação de Animação

```typescript
const validation = integration.validateAnimation(animation)

if (!validation.isValid) {
  console.error('Errors:', validation.errors)
}

if (validation.warnings.length > 0) {
  console.warn('Warnings:', validation.warnings)
}
```

### Estatísticas

```typescript
const stats = integration.getAnimationStats(animation)

console.log(`Frames: ${stats.frameCount}`)
console.log(`Duration: ${stats.duration}s`)
console.log(`Quality: ${stats.quality}`)
console.log(`Provider: ${stats.provider}`)
```

### Cálculo de Custo

```typescript
const cost = orchestrator.calculateRenderCost(30, 'STANDARD')

console.log(`Credits: ${cost.credits}`)
console.log(`Time: ${cost.estimatedTime}s`)
console.log(`Provider: ${cost.provider}`)
```

---

## 📁 Estrutura de Arquivos

```
estudio_ia_videos/src/lib/avatar/
├── blend-shape-controller.ts          # 52 ARKit blend shapes
├── facial-animation-engine.ts         # Engine de animação facial
├── avatar-lip-sync-integration.ts     # Bridge Phase 1 + 2
├── avatar-render-orchestrator.ts      # Multi-provider orchestrator
└── providers/
    ├── base-avatar-provider.ts        # Interface base
    ├── placeholder-adapter.ts         # Local (grátis)
    ├── did-adapter.ts                 # D-ID API
    ├── heygen-adapter.ts              # HeyGen API
    └── rpm-adapter.ts                 # Ready Player Me
```

---

## 🧪 Testar

```bash
# Teste completo de integração
node test-avatar-integration.mjs

# Build TypeScript
cd estudio_ia_videos && npm run build

# Testes unitários
npm test
```

---

## 📚 Documentação Completa

- [FASE2_IMPLEMENTATION_COMPLETE.md](./FASE2_IMPLEMENTATION_COMPLETE.md) - Documentação completa
- [FASE1_QUICK_REFERENCE.md](./FASE1_QUICK_REFERENCE.md) - Referência Phase 1
- [FASE1_GUIA_USO.md](./FASE1_GUIA_USO.md) - Guia de uso Phase 1

---

## 🐛 Troubleshooting

### "No available provider"
→ Verifique credenciais das APIs (D-ID, HeyGen)
→ Use `PLACEHOLDER` para desenvolvimento

### "Insufficient credits"
→ Use quality tier menor (STANDARD → PLACEHOLDER)
→ Verifique saldo de créditos do usuário

### "Animation validation failed"
→ Verifique se phonemes foram gerados (Phase 1)
→ Use `validateAnimation()` para detalhes

### TypeScript errors
→ Execute `npm install` na pasta `estudio_ia_videos`
→ Execute `npm run build` para compilar

---

## 🎯 Próximos Passos

1. ✅ **Phase 1 + 2 completas** - Sistema operacional
2. 🔄 **Criar API Routes** - `/api/v2/avatars/render`
3. 🔄 **Integrar com UI** - Componentes React
4. 🔄 **Testes E2E** - Playwright/Cypress
5. 🔄 **Deploy** - Produção

---

**Status**: 🟢 **SISTEMA PRONTO PARA INTEGRAÇÃO**

_Última atualização: 2026-01-16_
