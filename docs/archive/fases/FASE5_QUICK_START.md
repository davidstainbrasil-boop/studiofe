# FASE 5: QUICK START GUIDE ⚡

**Get started with Premium Integrations in 5 minutes**

---

## 🚀 5-Minute Setup

### Step 1: Configure API Keys (2 min)

Add to your `.env.local`:

```bash
# Unreal Engine 5 (MetaHuman)
UE5_API_KEY=your_key_here

# NVIDIA Audio2Face
AUDIO2FACE_API_KEY=your_key_here

# ElevenLabs Voice Cloning
ELEVENLABS_API_KEY=your_key_here

# Azure Translator (if not already configured)
AZURE_TRANSLATOR_KEY=your_key_here
AZURE_TRANSLATOR_REGION=eastus
```

### Step 2: Test the Features (3 min)

```bash
# Run Phase 5 integration tests
node test-fase5-integration.mjs

# Expected: ✅ 34/34 tests pass
```

---

## 📚 Feature Quick Starts

### 1. MetaHuman Rendering (UE5)

**Use Case**: Hyper-realistic avatar videos

```typescript
import { MetaHumanAdapter } from '@/lib/avatar/providers/metahuman-adapter'

const adapter = new MetaHumanAdapter()
const result = await adapter.render(facialAnimation, {
  metaHumanId: 'MH_001_Male_Adult',
  quality: 'HIGH', // or 'HYPERREAL'
  renderSettings: {
    resolution: '1080p',
    fps: 30
  }
})

console.log(result.videoUrl)
```

**Cost**: 3 credits/second (HIGH), 10 credits/second (HYPERREAL)

---

### 2. Audio2Face Neural Lip-Sync

**Use Case**: Enhanced lip-sync with emotion detection

```typescript
import { Audio2FaceEngine } from '@/lib/sync/audio2face-engine'

const engine = new Audio2FaceEngine('premium')
const lipSync = await engine.generateLipSync('audio.mp3', {
  text: 'Hello world',
  emotion: 'happy'
})

console.log(lipSync.visemes) // High-quality visemes
console.log(lipSync.emotions) // Detected emotions
```

**Cost**: 1-5 credits/second (standard/premium/ultra)

---

### 3. Multi-Language Videos

**Use Case**: Generate videos in 10+ languages

```typescript
import { multiLanguageSystem } from '@/lib/i18n/multi-language-system'

const result = await multiLanguageSystem.generateMultiLanguageVideos({
  sourceText: 'Welcome to our platform',
  sourceLanguage: 'en-US',
  targetLanguages: ['pt-BR', 'es-ES', 'fr-FR'],
  generateSubtitles: true
})

result.videos.forEach(v => {
  console.log(`${v.language}: ${v.videoUrl}`)
})
```

**Supported Languages**: Portuguese, English, Spanish, French, German, Italian, Japanese, Chinese, Korean, Arabic

---

### 4. Custom Voice Cloning

**Use Case**: Clone any voice for narration

```typescript
import { customVoiceCloningSystem } from '@/lib/voice/custom-voice-cloning'

// Step 1: Clone voice
const clone = await customVoiceCloningSystem.cloneVoice({
  name: 'My Custom Voice',
  audioSamples: ['sample1.mp3', 'sample2.mp3'],
  category: 'professional'
})

// Step 2: Wait for training (auto-polls)
// clone.status will change from 'training' to 'ready'

// Step 3: Synthesize
const audio = await customVoiceCloningSystem.synthesize({
  text: 'This is my cloned voice',
  voiceId: clone.voiceId
})

console.log(audio.audioUrl)
```

**Cost**: 100 credits for training, 1 credit per 1000 characters for synthesis

---

### 5. Interactive Videos

**Use Case**: Add quizzes, hotspots, CTAs to videos

```typescript
import { interactiveVideoEngine } from '@/lib/interactive/interactive-video-engine'

// Create interactive video
const video = await interactiveVideoEngine.createVideo({
  title: 'Training Video',
  videoUrl: '/videos/training.mp4',
  duration: 180
})

// Add quiz at 1 minute
await interactiveVideoEngine.addElement(video.id, {
  type: 'quiz',
  timestamp: 60,
  position: { x: 50, y: 50, width: 400, height: 300 },
  content: {
    question: 'What is the main benefit?',
    options: [
      { id: 'a', text: 'Speed', correct: true },
      { id: 'b', text: 'Cost', correct: false }
    ],
    correctFeedback: 'Correct!',
    incorrectFeedback: 'Try again!'
  },
  action: {
    type: 'pause',
    pauseOnDisplay: true
  }
})

// Track user session
const session = await interactiveVideoEngine.startSession(video.id, 'user-123')
```

**Available Elements**: hotspot, button, quiz, cta, branch, form, annotation

---

### 6. Advanced Analytics

**Use Case**: Business intelligence and reporting

```typescript
import { advancedAnalyticsSystem } from '@/lib/analytics/advanced-analytics-system'

// Get dashboard data
const metrics = await advancedAnalyticsSystem.calculateMetrics({
  start: new Date('2026-01-01'),
  end: new Date('2026-01-31')
})

console.log('Total Views:', metrics.videoMetrics.totalViews)
console.log('Completion Rate:', metrics.videoMetrics.completionRate)
console.log('Quiz Avg Score:', metrics.engagementMetrics.avgQuizScore)
console.log('Total Revenue:', metrics.revenueMetrics.totalRevenue)

// Generate report with insights
const report = await advancedAnalyticsSystem.generateReport({
  period: { start, end },
  type: 'monthly',
  includeInsights: true,
  includeRecommendations: true
})

console.log(report.insights) // Auto-generated insights
console.log(report.recommendations) // Actionable recommendations
```

**Metric Categories**: Video, User, Engagement, Performance, Revenue

---

### 7. Webhook System

**Use Case**: Real-time event notifications

```typescript
import { webhookSystem } from '@/lib/webhooks/webhook-system'

// Create webhook
const webhook = await webhookSystem.createWebhook({
  url: 'https://myapp.com/webhooks/events',
  events: ['video.completed', 'video.failed', 'job.completed']
})

console.log('Webhook Secret:', webhook.secret)

// On your webhook endpoint:
app.post('/webhooks/events', (req, res) => {
  const signature = req.headers['x-webhook-signature']

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', webhook.secret)
    .update(JSON.stringify(req.body))
    .digest('hex')

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // Process event
  console.log('Event:', req.body.event)
  console.log('Data:', req.body.data)

  res.json({ success: true })
})
```

**Available Events**: 18+ events (video.*, avatar.*, job.*, user.*, payment.*, analytics.*, quiz.*, interaction.*)

---

## 🔗 API Endpoints

### Multi-Language

```http
POST /api/i18n/translate
POST /api/video/multi-language
GET /api/i18n/languages
```

### Voice Cloning

```http
POST /api/voice/clone
POST /api/voice/synthesize
GET /api/voice/list
DELETE /api/voice/{voiceId}
```

### Interactive Videos

```http
POST /api/interactive/videos
POST /api/interactive/videos/{id}/elements
POST /api/interactive/sessions/{id}/interactions
GET /api/interactive/videos/{id}/analytics
```

### Analytics

```http
GET /api/analytics/dashboard?start={date}&end={date}
POST /api/analytics/reports
GET /api/analytics/metrics
```

### Webhooks

```http
POST /api/webhooks
GET /api/webhooks
DELETE /api/webhooks/{id}
GET /api/webhooks/{id}/deliveries
```

### MetaHuman

```http
POST /api/v2/avatars/render/metahuman
GET /api/v2/avatars/render/metahuman/{jobId}/status
```

### Audio2Face

```http
POST /api/lip-sync/audio2face
GET /api/lip-sync/audio2face/{jobId}/status
```

---

## 💰 Pricing Cheat Sheet

| Feature | Cost | Notes |
|---------|------|-------|
| MetaHuman HIGH | 3 credits/sec | 1080p @ 30fps |
| MetaHuman HYPERREAL | 10 credits/sec | 4K @ 60fps, ray tracing |
| Audio2Face Standard | 1 credit/sec | Basic lip-sync |
| Audio2Face Premium | 3 credits/sec | + emotion, blinks |
| Audio2Face Ultra | 5 credits/sec | + micro-expressions |
| Voice Cloning Training | 100 credits | One-time per voice |
| Voice Synthesis | 1 credit/1K chars | Using cloned voice |
| Translation | 0.1 credits/1K chars | Any language pair |
| Interactive Elements | Free | No credit cost |
| Webhooks | Free | No credit cost |
| Analytics | Free | No credit cost |

---

## 🎯 Common Use Cases

### Use Case 1: Enterprise Training Video

**Goal**: Multi-language training with interactive quizzes

```typescript
// 1. Generate in 3 languages
const videos = await multiLanguageSystem.generateMultiLanguageVideos({
  sourceText: trainingScript,
  sourceLanguage: 'en-US',
  targetLanguages: ['pt-BR', 'es-ES', 'zh-CN']
})

// 2. Add interactive quiz
await interactiveVideoEngine.addElement(videos.videos[0].videoId, {
  type: 'quiz',
  timestamp: 120,
  content: { /* quiz */ }
})

// 3. Setup webhook for completion tracking
await webhookSystem.createWebhook({
  url: 'https://lms.company.com/webhooks',
  events: ['quiz.completed', 'video.completed']
})
```

**Cost**: ~300 credits (translation + TTS + avatars + quizzes)

---

### Use Case 2: Marketing Video with Custom Voice

**Goal**: High-quality promo video with founder's voice

```typescript
// 1. Clone founder's voice
const voice = await customVoiceCloningSystem.cloneVoice({
  name: "Founder Voice",
  audioSamples: ['interview1.mp3', 'podcast.mp3'],
  category: 'professional'
})

// 2. Generate video with MetaHuman
const result = await metahuman.render(lipSync, {
  metaHumanId: 'MH_Executive_Male',
  quality: 'HYPERREAL',
  renderSettings: { resolution: '4k', fps: 60 }
})

// 3. Track performance
const analytics = await advancedAnalyticsSystem.calculateMetrics(period)
```

**Cost**: ~800 credits (voice training + synthesis + HYPERREAL rendering)

---

### Use Case 3: Educational Content Pipeline

**Goal**: Auto-generate courses from text

```typescript
// 1. Generate videos with Audio2Face
const lipSync = await audio2face.generateLipSync(audioFile, {
  model: 'premium',
  emotion: 'calm'
})

// 2. Add interactive elements
await interactiveVideoEngine.addElement(videoId, {
  type: 'cta',
  timestamp: 180,
  content: {
    title: 'Download Resources',
    url: '/resources/lesson-1'
  }
})

// 3. Multi-language versions
const translations = await multiLanguageSystem.generateMultiLanguageVideos({
  sourceText: lessonText,
  targetLanguages: ['pt-BR', 'es-ES']
})
```

**Cost**: ~200 credits per lesson

---

## 🧪 Testing

### Quick Test: All Features

```bash
# Run comprehensive test suite
node test-fase5-integration.mjs

# Expected output:
# ✅ Testes passaram: 34
# ❌ Testes falharam: 0
# 📈 Taxa de sucesso: 100.0%
```

### Individual Feature Tests

```typescript
// Test MetaHuman
import { MetaHumanAdapter } from '@/lib/avatar/providers/metahuman-adapter'
const adapter = new MetaHumanAdapter()
console.log(adapter.quality) // 'HYPERREAL'

// Test Audio2Face
import { Audio2FaceEngine } from '@/lib/sync/audio2face-engine'
const engine = new Audio2FaceEngine('premium')
console.log(engine.features) // ['lip-sync', 'emotion', 'blinks', 'head-movement']

// Test Multi-Language
import { multiLanguageSystem } from '@/lib/i18n/multi-language-system'
const langs = multiLanguageSystem.getSupportedLanguages()
console.log(langs.length) // 10

// Test Voice Cloning
import { customVoiceCloningSystem } from '@/lib/voice/custom-voice-cloning'
const stats = await customVoiceCloningSystem.getVoiceLibraryStats()
console.log(stats.totalVoices)

// Test Interactive
import { interactiveVideoEngine } from '@/lib/interactive/interactive-video-engine'
const video = await interactiveVideoEngine.createVideo({ /* config */ })
console.log(video.id)

// Test Analytics
import { advancedAnalyticsSystem } from '@/lib/analytics/advanced-analytics-system'
const stats = advancedAnalyticsSystem.getLanguageStats()
console.log(stats.totalLanguages) // 10

// Test Webhooks
import { webhookSystem } from '@/lib/webhooks/webhook-system'
const webhook = await webhookSystem.createWebhook({ /* config */ })
console.log(webhook.secret)
```

---

## 🔧 Troubleshooting

### MetaHuman Issues

**Problem**: UE5 API key invalid
```bash
Error: MetaHuman validation failed: Invalid API key
```

**Solution**: Check `UE5_API_KEY` in `.env.local`

---

### Audio2Face Issues

**Problem**: Model not found
```bash
Error: Audio2Face model 'ultra' not available
```

**Solution**: Verify your API plan supports ultra model, or use 'premium'

---

### Voice Cloning Issues

**Problem**: Training timeout
```bash
Error: Voice training timed out after 5 minutes
```

**Solution**:
- Check audio quality (should be clear, no background noise)
- Use 3-5 samples for faster training
- Ensure samples are 10-30 seconds each

---

### Translation Issues

**Problem**: Language not supported
```bash
Error: Language 'pt-PT' not found
```

**Solution**: Use supported language codes (see `SUPPORTED_LANGUAGES` array)

---

### Webhook Issues

**Problem**: Signature verification failed
```bash
Error: Invalid webhook signature
```

**Solution**:
```typescript
// Correct signature generation:
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload)) // Important: stringify first
  .digest('hex')
```

---

## 📖 Documentation

- **Full Documentation**: [FASE5_IMPLEMENTATION_COMPLETE.md](./FASE5_IMPLEMENTATION_COMPLETE.md)
- **API Reference**: See "Documentação de APIs" section in full doc
- **Architecture**: See "Arquitetura Técnica" section in full doc
- **Integration Guide**: See "Integração com Phases 1-4" section

---

## 🚀 Next Steps

1. **Configure API Keys** (5 min)
2. **Run Tests** (2 min)
3. **Try Examples Above** (10 min)
4. **Read Full Documentation** (30 min)
5. **Build Your First Feature** (1 hour)

---

## 💡 Pro Tips

1. **Start with HIGH quality** before HYPERREAL to save credits during testing
2. **Use Audio2Face Standard** for development, Premium for production
3. **Batch translate** multiple texts at once to save API calls
4. **Voice cloning works best** with 3-5 high-quality audio samples
5. **Interactive elements** are free - add them generously!
6. **Webhooks** enable real-time integrations - use them for critical events
7. **Analytics** are automatically tracked - just query the data

---

## 📞 Support

For issues or questions:
- Check troubleshooting section above
- Review full documentation
- Check test suite for working examples
- Open GitHub issue with details

---

**Phase 5 Status**: ✅ PRODUCTION-READY

**Get Started Now**: `node test-fase5-integration.mjs`

---

*Last Updated: 2026-01-17*
