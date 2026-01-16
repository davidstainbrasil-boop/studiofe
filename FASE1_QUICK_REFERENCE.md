# FASE 1: QUICK REFERENCE CARD 🚀

**Para desenvolvedores que precisam usar o lip-sync rapidamente**

---

## ⚡ Setup em 3 Comandos

```bash
# 1. Instalar tudo
./scripts/setup-fase1-lip-sync.sh

# 2. Configurar Azure
echo 'AZURE_SPEECH_KEY="sua-chave"' >> estudio_ia_videos/.env.local

# 3. Testar
cd estudio_ia_videos && npm run dev
```

---

## 📡 API Endpoints

### Gerar Lip-Sync
```bash
POST /api/lip-sync/generate
Content-Type: application/json

{
  "text": "Seu texto aqui",
  "voice": "pt-BR-FranciscaNeural",
  "emotion": "happy",
  "fps": 30
}

# Response
{
  "animation": { frames: [...], duration: 3.5, fps: 30 },
  "provider": "azure",
  "cached": false,
  "processingTime": 1523
}
```

### Checar Status
```bash
GET /api/lip-sync/generate

# Response
{
  "status": "operational",
  "providers": { azure: true, rhubarb: true },
  "cache": { hits: 120, misses: 30, hitRate: 0.8 }
}
```

---

## 💻 Uso Programático

### Geração Simples
```typescript
import { LipSyncOrchestrator } from '@/lib/sync/lip-sync-orchestrator';

const orchestrator = new LipSyncOrchestrator();
const result = await orchestrator.generateLipSync({
  text: 'Hello world'
});

console.log(result.provider); // 'azure' ou 'rhubarb'
console.log(result.result.phonemes); // Array de phonemas
```

### Com Facial Animation
```typescript
import { FacialAnimationEngine } from '@/lib/avatar/facial-animation-engine';

const engine = new FacialAnimationEngine();
const animation = await engine.createAnimation(lipSyncResult.result, {
  fps: 30,
  emotion: 'happy',
  enableBlinks: true
});

// animation.frames = [{ time: 0, weights: {...}, headRotation: {...} }, ...]
```

### Remotion Component
```tsx
import { LipSyncAvatar } from '@/components/remotion/LipSyncAvatar';

<LipSyncAvatar
  animation={facialAnimation}
  avatarSrc="/avatar.png"
  width={512}
  height={512}
  x={100}
  y={50}
/>
```

---

## 🎛️ Opções Principais

### Vozes (Azure)
```typescript
'pt-BR-FranciscaNeural'  // Português BR (feminina)
'pt-BR-AntonioNeural'    // Português BR (masculina)
'en-US-JennyNeural'      // Inglês US (feminina)
```

### Emoções
```typescript
'neutral' | 'happy' | 'sad' | 'angry' | 'surprised'
```

### FPS
```typescript
24  // Cinema (leve)
30  // Padrão (recomendado)
60  // Alta qualidade (pesado)
```

---

## 🐛 Troubleshooting

### Erro: "Azure credentials not found"
```bash
echo 'AZURE_SPEECH_KEY="sua-chave"' >> .env.local
```

### Erro: "Rhubarb not found"
```bash
./scripts/setup-fase1-lip-sync.sh
```

### Erro: "Redis connection failed"
```bash
# Linux
sudo systemctl start redis-server

# macOS
brew services start redis
```

---

## 📊 Performance Targets

| Métrica | Target |
|---------|--------|
| Latência (Azure) | <2s para 30s áudio |
| Latência (Rhubarb) | <5s para 30s áudio |
| Cache hit rate | >40% |
| Memory usage | <500MB |

---

## 🔗 Links Rápidos

- **Guia Completo:** [FASE1_GUIA_USO.md](FASE1_GUIA_USO.md)
- **Status:** [FASE1_IMPLEMENTACAO_PROGRESSO.md](FASE1_IMPLEMENTACAO_PROGRESSO.md)
- **Plano Original:** [PLANO_IMPLEMENTACAO_COMPLETO.md](PLANO_IMPLEMENTACAO_COMPLETO.md)

---

## 📁 Arquivos Principais

```
src/lib/sync/
  lip-sync-orchestrator.ts      ← Coordinator principal

src/lib/avatar/
  facial-animation-engine.ts    ← Gerador de animação

src/components/remotion/
  LipSyncAvatar.tsx             ← Componente Remotion

src/app/api/lip-sync/
  generate/route.ts             ← API endpoint
```

---

**Atualizado:** 16/01/2026
**Versão:** 1.0.0
