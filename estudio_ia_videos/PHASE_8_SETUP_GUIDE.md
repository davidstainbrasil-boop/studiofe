# Phase 8: AI Features - Setup Guide

## 🎯 Overview

This guide will help you set up and configure all AI-powered features in the MVP Video TécnicoCursos platform.

## 📋 Prerequisites

Before starting, ensure you have:

- Node.js 18+ installed
- PostgreSQL database
- Redis server
- FFmpeg installed
- Python 3.8+ (for PySceneDetect)

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your API keys
nano .env.local
```

### 2. Database Setup

```bash
# Run migrations
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# Seed database (optional)
npm run db:seed
```

### 3. Install Dependencies

```bash
# Install Node packages
npm install

# Install Python dependencies for scene detection
pip install scenedetect[opencv]

# Verify FFmpeg installation
ffmpeg -version
```

### 4. Start Development Server

```bash
npm run dev
```

Navigate to `http://localhost:3000` and explore the AI features!

---

## 🤖 AI Features Configuration

### 1. Voice Cloning (ElevenLabs)

**API Key**: Get from [ElevenLabs](https://elevenlabs.io)

```bash
ELEVENLABS_API_KEY="your-api-key-here"
```

**Setup**:
1. Sign up for ElevenLabs account
2. Get API key from dashboard
3. Add to `.env.local`

**Test**:
- Navigate to `/voice-cloning-advanced`
- Upload a 30-second voice sample
- Test voice generation

---

### 2. Auto-Subtitles (OpenAI Whisper)

**API Key**: Get from [OpenAI](https://platform.openai.com)

```bash
OPENAI_API_KEY="sk-your-api-key-here"
```

**Setup**:
1. Create OpenAI account
2. Add payment method
3. Generate API key
4. Add to `.env.local`

**Integration Code** (in `lib/services/subtitle.service.ts`):

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
})

// Extract audio from video first using FFmpeg
const audioBuffer = await extractAudio(videoFile)
const audioFile = new File([audioBuffer], 'audio.mp3')

// Call Whisper API
const transcription = await openai.audio.transcriptions.create({
  file: audioFile,
  model: 'whisper-1',
  response_format: 'verbose_json',
  timestamp_granularities: ['segment']
})
```

**Test**:
- Navigate to `/auto-subtitles`
- Upload a video
- Generate subtitles
- Export in SRT/VTT format

---

### 3. Video Enhancement

#### Option A: Real-ESRGAN (Self-hosted)

**Setup**:
```bash
# Clone Real-ESRGAN
git clone https://github.com/xinntao/Real-ESRGAN.git
cd Real-ESRGAN

# Install dependencies
pip install basicsr
pip install facexlib
pip install gfpgan
pip install -r requirements.txt

# Download models
wget https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth -P weights
```

**Create API Wrapper** (`python-services/esrgan-api.py`):
```python
from flask import Flask, request, send_file
from realesrgan import RealESRGANer
import cv2

app = Flask(__name__)
upsampler = RealESRGANer(
    scale=4,
    model_path='weights/RealESRGAN_x4plus.pth'
)

@app.route('/upscale', methods=['POST'])
def upscale_video():
    video = request.files['video']
    # Process video frames
    # Return upscaled video
    pass

if __name__ == '__main__':
    app.run(port=8000)
```

#### Option B: Replicate API (Easier)

**Setup**:
```bash
REPLICATE_API_KEY="your-replicate-key"
```

**Integration**:
```typescript
import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY
})

const output = await replicate.run(
  "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
  { input: { image: videoFrame } }
)
```

**Test**:
- Navigate to `/video-enhancement`
- Upload a low-res video
- Select upscaling options
- Process and download

---

### 4. Scene Detection (PySceneDetect)

**Setup**:
```bash
# Install PySceneDetect
pip install scenedetect[opencv]

# Verify installation
scenedetect version
```

**Integration** (in `lib/services/scene-detection.service.ts`):

```typescript
import { spawn } from 'child_process'
import { writeFile } from 'fs/promises'

async function detectScenes(videoPath: string, threshold: number) {
  return new Promise((resolve, reject) => {
    const sceneDetect = spawn('scenedetect', [
      '-i', videoPath,
      'detect-content',
      '--threshold', threshold.toString(),
      'list-scenes',
      '--output', 'scenes.csv'
    ])

    sceneDetect.on('close', async (code) => {
      if (code === 0) {
        const scenes = await parseSceneCSV('scenes.csv')
        resolve(scenes)
      } else {
        reject(new Error(`scenedetect exited with code ${code}`))
      }
    })
  })
}
```

**Test**:
- Navigate to `/scene-detection`
- Upload a video
- Adjust sensitivity
- View detected scenes

---

## 📁 File Storage Configuration

### Option A: AWS S3

```bash
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="mvp-video-storage"
```

**Setup**:
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
})

async function uploadToS3(file: Buffer, key: string) {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: file
  }))
  
  return `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`
}
```

### Option B: Cloudflare R2 (Recommended - S3 compatible, no egress fees)

```bash
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="mvp-video-storage"
```

---

## 🔄 Background Job Processing

For long-running video processing tasks, use a job queue:

### Setup BullMQ

```bash
npm install bullmq ioredis
```

**Create Job Queue** (`lib/queue/video-processing.queue.ts`):

```typescript
import { Queue, Worker } from 'bullmq'
import Redis from 'ioredis'

const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
})

export const videoQueue = new Queue('video-processing', { connection })

const worker = new Worker('video-processing', async (job) => {
  const { type, videoFile, options } = job.data
  
  switch (type) {
    case 'upscale':
      return await videoEnhancementService.upscale(videoFile, options.resolution)
    case 'subtitle':
      return await subtitleService.generateSubtitles(videoFile, options.language)
    case 'scene-detect':
      return await sceneDetectionService.detectScenes(videoFile, options.sensitivity)
  }
}, { connection })
```

---

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### E2E Tests

```bash
npx playwright test
```

### Manual Testing Checklist

- [ ] Voice cloning works with 30s+ audio
- [ ] Subtitles generate for video files
- [ ] Video upscaling produces higher resolution
- [ ] Scene detection identifies transitions
- [ ] All exports download correctly
- [ ] API endpoints return proper responses

---

## 🚨 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Reset database
npx prisma migrate reset
```

### FFmpeg Not Found

```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt-get install ffmpeg

# Verify
which ffmpeg
```

### Python Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install scenedetect[opencv]
```

### API Rate Limits

- OpenAI: $5 credit on signup, then pay-as-you-go
- ElevenLabs: 10,000 characters/month free tier
- Replicate: $0.000050 per second of processing

---

## 📊 Monitoring

### Add Logging

```typescript
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info'
})

logger.info({ videoId, enhancement: 'upscale' }, 'Starting video enhancement')
```

### Add Error Tracking (Sentry)

```bash
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard -i nextjs
```

---

## 🎉 You're Ready!

All AI features are now configured and ready to use. Navigate to:

- **Dashboard**: `/dashboard`
- **AI Features Hub**: `/ai-features`
- **Voice Cloning**: `/voice-cloning-advanced`
- **Auto-Subtitles**: `/auto-subtitles`
- **Video Enhancement**: `/video-enhancement`
- **Scene Detection**: `/scene-detection`

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [ElevenLabs Docs](https://docs.elevenlabs.io)
- [Real-ESRGAN GitHub](https://github.com/xinntao/Real-ESRGAN)
- [PySceneDetect Docs](https://scenedetect.com)

---

**Need help?** Check the `/docs` folder or open an issue on GitHub.
