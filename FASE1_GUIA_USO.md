# FASE 1: GUIA DE USO - LIP-SYNC PROFISSIONAL

**Data:** 16/01/2026
**Status:** ✅ Implementado e pronto para uso
**Audiência:** Desenvolvedores e QA

---

## 🚀 Quick Start (5 minutos)

### 1. Instalação

```bash
# Execute o script de setup
cd /root/_MVP_Video_TecnicoCursos_v7
./scripts/setup-fase1-lip-sync.sh

# Configure suas credenciais Azure
nano estudio_ia_videos/.env.local
# Adicione: AZURE_SPEECH_KEY="sua-chave-aqui"
```

### 2. Teste Rápido

```bash
# Iniciar servidor
cd estudio_ia_videos
npm run dev

# Em outro terminal, teste a API
curl -X POST http://localhost:3000/api/lip-sync/generate \
  -H "Content-Type: application/json" \
  -d '{"text":"Olá mundo","voice":"pt-BR-FranciscaNeural"}'
```

---

## 📖 Exemplos de Uso

### Exemplo 1: Geração Simples (Texto para Lip-Sync)

```typescript
// Cliente TypeScript
const response = await fetch('/api/lip-sync/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Bem-vindo ao nosso curso',
    voice: 'pt-BR-FranciscaNeural',
    emotion: 'happy',
    emotionIntensity: 0.6,
    enableBlinks: true,
    enableBreathing: true,
    enableHeadMovement: true,
    fps: 30
  })
});

const data = await response.json();

// data.animation contém a animação facial completa
console.log('Frames gerados:', data.animation.frames.length);
console.log('Provider usado:', data.provider); // 'azure' ou 'rhubarb'
console.log('Do cache?', data.cached);
```

### Exemplo 2: Processamento Assíncrono (Background)

```typescript
// Enfileirar job
const response = await fetch('/api/lip-sync/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'Texto longo para processar em background...',
    async: true // ← Job será processado em background
  })
});

const { jobId } = await response.json();
console.log('Job ID:', jobId);

// Polling do status
const checkStatus = async () => {
  const statusResp = await fetch(`/api/lip-sync/status/${jobId}`);
  const status = await statusResp.json();

  console.log('Status:', status.status); // 'waiting', 'active', 'completed', 'failed'
  console.log('Progresso:', status.progress + '%');

  if (status.status === 'completed') {
    console.log('Animação:', status.result);
  }
};

// Polling a cada 2 segundos
const interval = setInterval(async () => {
  await checkStatus();
  // Parar quando completado
}, 2000);
```

### Exemplo 3: Upload de Áudio Customizado

```typescript
// Converter áudio para base64
const audioFile = document.getElementById('audioInput').files[0];
const audioBuffer = await audioFile.arrayBuffer();
const audioBase64 = btoa(
  String.fromCharCode(...new Uint8Array(audioBuffer))
);

// Enviar para processamento
const response = await fetch('/api/lip-sync/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    audioBase64: audioBase64,
    dialogText: 'Texto opcional para melhorar precisão' // ← Opcional
  })
});
```

### Exemplo 4: Uso com Remotion

```tsx
import { Composition } from 'remotion';
import { LipSyncAvatar } from '@/components/remotion/LipSyncAvatar';

// Em seu Remotion Root.tsx
export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="AvatarWithLipSync"
        component={AvatarWithLipSyncScene}
        durationInFrames={300} // 10 segundos @ 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};

// Componente da cena
const AvatarWithLipSyncScene = () => {
  // Animação pré-gerada via API
  const animation = useFacialAnimation();

  return (
    <AbsoluteFill>
      <LipSyncAvatar
        animation={animation}
        avatarSrc="/avatars/instructor.png"
        avatarType="2d"
        width={512}
        height={512}
        x={704} // Centralizado (1920-512)/2
        y={284}
        scale={1.0}
        debug={false}
      />
    </AbsoluteFill>
  );
};
```

### Exemplo 5: Uso Programático (Servidor)

```typescript
// src/app/api/custom-video/route.ts
import { LipSyncOrchestrator } from '@/lib/sync/lip-sync-orchestrator';
import { FacialAnimationEngine } from '@/lib/avatar/facial-animation-engine';

export async function POST(request: Request) {
  const { script } = await request.json();

  // 1. Gerar lip-sync
  const orchestrator = new LipSyncOrchestrator();
  const lipSync = await orchestrator.generateLipSync({
    text: script,
    voice: 'pt-BR-FranciscaNeural'
  });

  // 2. Gerar animação facial
  const animationEngine = new FacialAnimationEngine();
  const animation = await animationEngine.createAnimation(
    lipSync.result,
    {
      fps: 60, // Alta qualidade
      enableBlinks: true,
      enableBreathing: true,
      emotion: 'neutral'
    }
  );

  // 3. Otimizar (reduzir tamanho)
  const optimized = animationEngine.optimizeAnimation(animation, 0.01);

  // 4. Exportar para Unreal Engine
  const usdData = animationEngine.exportToUSD(optimized);

  return Response.json({
    animation: optimized,
    exports: {
      json: animationEngine.exportToJSON(optimized),
      usd: usdData,
      fbx: animationEngine.exportToFBXData(optimized)
    }
  });
}
```

---

## 🎨 Opções de Configuração

### Vozes Disponíveis (Azure)

```typescript
// Português do Brasil
'pt-BR-FranciscaNeural'  // Feminina (recomendada)
'pt-BR-AntonioNeural'    // Masculina

// Português de Portugal
'pt-PT-FernandaNeural'   // Feminina
'pt-PT-DuarteNeural'     // Masculina

// Inglês
'en-US-JennyNeural'      // Feminina
'en-US-GuyNeural'        // Masculina
```

### Emoções

```typescript
type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised';

// Exemplo
{
  emotion: 'happy',
  emotionIntensity: 0.7  // 0-1 (0 = sem emoção, 1 = máxima intensidade)
}
```

### FPS (Frames Por Segundo)

```typescript
// Escolha baseada no caso de uso
fps: 24  // Cinema (mais leve)
fps: 30  // Padrão (balanceado) ← Recomendado
fps: 60  // Alta qualidade (mais pesado)
```

### Providers

```typescript
// Escolha manual do provider
{
  preferredProvider: 'azure'    // Melhor qualidade (cloud)
  preferredProvider: 'rhubarb'  // Offline (gratuito)
  preferredProvider: 'mock'     // Fallback de teste
}

// Padrão: fallback automático (azure → rhubarb → mock)
```

---

## 🧪 Testing

### Executar Testes

```bash
cd estudio_ia_videos

# Todos os testes de lip-sync
npm test -- src/__tests__/lib/avatar
npm test -- src/__tests__/lib/sync

# Teste específico
npm test -- blend-shape-controller.test.ts

# Com coverage
npm test -- --coverage src/__tests__/lib/avatar
```

### Verificar Instalação

```bash
# Verificar Rhubarb
rhubarb --version

# Verificar Redis
redis-cli ping  # Deve retornar "PONG"

# Verificar Azure (via API)
curl http://localhost:3000/api/lip-sync/generate

# Resposta esperada:
# {
#   "success": true,
#   "status": "operational",
#   "providers": {
#     "azure": true,
#     "rhubarb": true,
#     "mock": true
#   },
#   "cache": { "hits": 0, "misses": 0, ... }
# }
```

---

## 🐛 Troubleshooting

### Problema: "Azure credentials not found"

**Solução:**
```bash
# Verificar .env.local
cat estudio_ia_videos/.env.local | grep AZURE

# Deve mostrar:
# AZURE_SPEECH_KEY="sua-chave-aqui"
# AZURE_SPEECH_REGION="eastus"

# Se vazio, editar:
nano estudio_ia_videos/.env.local
```

### Problema: "Rhubarb not found"

**Solução:**
```bash
# Verificar instalação
which rhubarb

# Se não encontrado, reinstalar
./scripts/setup-fase1-lip-sync.sh
```

### Problema: "Redis connection failed"

**Solução:**
```bash
# Iniciar Redis
# Linux:
sudo systemctl start redis-server

# macOS:
brew services start redis

# Verificar
redis-cli ping  # Deve retornar "PONG"
```

### Problema: "Provider 'azure' failed"

**Causa:** Credenciais inválidas ou quota excedida

**Solução:**
```bash
# 1. Verificar credenciais
echo $AZURE_SPEECH_KEY

# 2. Testar conexão
curl -X GET "https://eastus.api.cognitive.microsoft.com/sts/v1.0/issuetoken" \
  -H "Ocp-Apim-Subscription-Key: $AZURE_SPEECH_KEY"

# 3. Se falhar, sistema usa Rhubarb automaticamente
```

### Problema: Performance lenta

**Otimizações:**
```typescript
// 1. Reduzir FPS
{ fps: 24 }  // Ao invés de 30 ou 60

// 2. Desabilitar features opcionais
{
  enableBlinks: false,
  enableBreathing: false,
  enableHeadMovement: false
}

// 3. Otimizar animação após gerar
const optimized = animationEngine.optimizeAnimation(
  animation,
  0.02  // Threshold maior = mais frames removidos
);

// 4. Usar cache
{
  skipCache: false  // Padrão, mas garantir que está habilitado
}
```

---

## 📊 Métricas de Performance

### Benchmarks Esperados

| Métrica | Target | Como Medir |
|---------|--------|------------|
| **Latência (Azure)** | <2s para 30s áudio | `processingTime` na resposta |
| **Latência (Rhubarb)** | <5s para 30s áudio | `processingTime` na resposta |
| **Cache Hit Rate** | >40% após warm-up | GET `/api/lip-sync/generate` → `cache.hitRate` |
| **Memory Usage** | <500MB durante processamento | `docker stats` ou `top` |
| **Uptime** | >99% | Monitorar com Prometheus |

### Exemplo de Response Times

```
Input: 10s de áudio
├─ Azure: ~800ms
├─ Rhubarb: ~2.5s
└─ Cached: ~50ms

Input: 30s de áudio
├─ Azure: ~1.8s
├─ Rhubarb: ~4.2s
└─ Cached: ~100ms

Input: 60s de áudio
├─ Azure: ~3.5s
├─ Rhubarb: ~7s
└─ Cached: ~150ms
```

---

## 🔐 Segurança

### Rate Limiting

```typescript
// Já implementado nas rotas API
// Limite: 100 requisições/minuto por IP
// Exceção para requisições autenticadas: 500/minuto
```

### Validação de Input

```typescript
// Texto máximo
maxTextLength: 5000 caracteres

// Áudio máximo
maxAudioSize: 10MB
maxAudioDuration: 300s (5 minutos)

// Formatos aceitos
audioFormats: ['wav', 'mp3', 'ogg', 'webm']
```

---

## 📚 Referências

### Documentação Oficial
- [Azure Speech SDK](https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/)
- [Rhubarb Lip-Sync](https://github.com/DanielSWolf/rhubarb-lip-sync)
- [ARKit Blend Shapes](https://developer.apple.com/documentation/arkit/arfaceanchor/blendshapelocation)
- [Remotion](https://www.remotion.dev/)

### Documentos do Projeto
- [PLANO_IMPLEMENTACAO_COMPLETO.md](PLANO_IMPLEMENTACAO_COMPLETO.md) - Plano completo Fase 1
- [FASE1_IMPLEMENTACAO_PROGRESSO.md](FASE1_IMPLEMENTACAO_PROGRESSO.md) - Status da implementação
- [README_IMPLEMENTACAO.md](README_IMPLEMENTACAO.md) - Guia de início

### Código Fonte
- [src/lib/sync/](estudio_ia_videos/src/lib/sync/) - Engines de lip-sync
- [src/lib/avatar/](estudio_ia_videos/src/lib/avatar/) - Controllers de blend shapes
- [src/components/remotion/LipSyncAvatar.tsx](estudio_ia_videos/src/components/remotion/LipSyncAvatar.tsx) - Componente Remotion
- [src/app/api/lip-sync/](estudio_ia_videos/src/app/api/lip-sync/) - APIs RESTful

---

## 🎯 Casos de Uso Comuns

### 1. Curso em Vídeo com Avatar Instrutor
```typescript
// Gerar lip-sync para cada slide
const slides = [
  { text: 'Bem-vindo ao curso', duration: 3 },
  { text: 'Nesta aula vamos aprender...', duration: 5 },
  // ...
];

const animations = await Promise.all(
  slides.map(slide => generateLipSync(slide.text))
);

// Usar no Remotion para renderizar
```

### 2. Narração de eBook
```typescript
// Texto longo, processar em chunks
const chapters = splitIntoChapters(ebook);

for (const chapter of chapters) {
  await generateLipSync({
    text: chapter.content,
    async: true  // Background
  });
}
```

### 3. Chatbot com Avatar
```typescript
// Real-time lip-sync para resposta do bot
socket.on('bot-message', async (message) => {
  const lipSync = await generateLipSync({
    text: message,
    preferredProvider: 'azure'  // Mais rápido
  });

  animateAvatar(lipSync.animation);
});
```

---

**Última atualização:** 16/01/2026 14:00
**Versão:** 1.0.0
**Autor:** Equipe de Desenvolvimento

Para suporte, consulte: [FASE1_IMPLEMENTACAO_PROGRESSO.md](FASE1_IMPLEMENTACAO_PROGRESSO.md)
