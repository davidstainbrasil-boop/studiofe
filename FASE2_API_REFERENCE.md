# Phase 2 Avatar System - API Reference

**Version**: 1.0.0
**Last Updated**: 2026-01-18
**Status**: Production Ready

## Overview

The Avatar System provides a multi-tier video generation service that converts text into avatar videos with realistic lip-sync, facial expressions, and professional rendering quality.

## Architecture

```
User Request (Text)
    ↓
Avatar API (/api/v2/avatars/*)
    ↓
AvatarRenderOrchestrator
    ↓
Quality Tier Selection
    ↓
┌────────────┬──────────────┬─────────────────┐
│            │              │                 │
Placeholder  D-ID/HeyGen    Ready Player Me
(0 credits)  (1 credit)     (3 credits)
    ↓
Final Video URL
```

## Quality Tiers

| Tier        | Provider         | Credits | Time  | Quality      | Use Case                    |
| ----------- | ---------------- | ------- | ----- | ------------ | --------------------------- |
| PLACEHOLDER | Local (Remotion) | 0       | <1s   | Preview      | Quick prototyping, previews |
| STANDARD    | D-ID / HeyGen    | 1       | ~45s  | Professional | Most courses, marketing     |
| HIGH        | Ready Player Me  | 3       | ~120s | Premium 3D   | High-end courses, demos     |
| HYPERREAL   | UE5 / Audio2Face | 10      | ~300s | Cinematic    | Future (not implemented)    |

---

## API Endpoints

### 1. Render Avatar Video

**Endpoint**: `POST /api/v2/avatars/render`

**Description**: Creates an avatar video with text-to-speech and lip-sync animation.

**Headers**:

```http
Content-Type: application/json
x-user-id: <user-id>
Authorization: Bearer <token> (optional)
```

**Request Body**:

```typescript
{
  text: string;              // Required: Text for the avatar to speak
  quality?: AvatarQuality;   // Optional: PLACEHOLDER | STANDARD | HIGH | HYPERREAL (default: STANDARD)
  emotion?: Emotion;         // Optional: neutral | happy | sad | angry | surprised (default: neutral)
  voiceId?: string;          // Optional: Voice ID for TTS (e.g., "pt-BR-FranciscaNeural")
  sourceImageUrl?: string;   // Optional: RPM avatar URL for HIGH tier
  audioUrl?: string;         // Optional: Pre-generated audio URL (bypasses TTS)
  metadata?: Record<string, any>; // Optional: Provider-specific metadata
}
```

**Example Request (STANDARD tier with D-ID)**:

```bash
curl -X POST http://localhost:3000/api/v2/avatars/render \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "text": "Olá! Bem-vindo ao nosso curso de programação avançada.",
    "quality": "STANDARD",
    "emotion": "happy",
    "voiceId": "pt-BR-FranciscaNeural"
  }'
```

**Example Request (HIGH tier with Ready Player Me)**:

```bash
curl -X POST http://localhost:3000/api/v2/avatars/render \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "text": "Vamos aprender sobre inteligência artificial.",
    "quality": "HIGH",
    "emotion": "neutral",
    "sourceImageUrl": "https://models.readyplayer.me/65a8dba831b23abb4f401bae.glb",
    "voiceId": "pt-BR-AntonioNeural"
  }'
```

**Response (202 Accepted)**:

```json
{
  "success": true,
  "jobId": "rpm-1737257234567-abc123",
  "status": "pending",
  "estimatedTime": 120,
  "provider": "ready-player-me",
  "creditsUsed": 3,
  "message": "Avatar render job created successfully"
}
```

**Error Response (400 Bad Request)**:

```json
{
  "success": false,
  "error": "Invalid Ready Player Me URL. Expected format: https://models.readyplayer.me/[avatarId].glb"
}
```

**Error Response (402 Payment Required)**:

```json
{
  "success": false,
  "error": "Insufficient credits. Required: 3, Available: 1"
}
```

---

### 2. Generate Avatar Animation (Async)

**Endpoint**: `POST /api/v2/avatars/generate`

**Description**: Generates facial animation data (blend shapes) without rendering. Useful for preview or custom rendering pipelines.

**Request Body**:

```typescript
{
  text: string;              // Required: Text for lip-sync
  emotion?: Emotion;         // Optional: Emotional state
  voiceId?: string;          // Optional: Voice for TTS
  audioUrl?: string;         // Optional: Pre-generated audio
  enableBlinks?: boolean;    // Optional: Add automatic blinking (default: true)
  enableBreathing?: boolean; // Optional: Add breathing motion (default: true)
  enableHeadMovement?: boolean; // Optional: Add head movement (default: true)
}
```

**Example Request**:

```bash
curl -X POST http://localhost:3000/api/v2/avatars/generate \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "text": "Este é um teste de animação facial.",
    "emotion": "happy",
    "enableBlinks": true,
    "enableBreathing": true,
    "enableHeadMovement": true
  }'
```

**Response (200 OK)**:

```json
{
  "success": true,
  "animation": {
    "frames": [
      {
        "frame": 0,
        "timestamp": 0,
        "weights": {
          "jawOpen": 0.0,
          "mouthSmileLeft": 0.3,
          "mouthSmileRight": 0.3,
          "eyeBlinkLeft": 0.0,
          "eyeBlinkRight": 0.0
        }
      },
      {
        "frame": 1,
        "timestamp": 0.033,
        "weights": {
          "jawOpen": 0.2,
          "mouthSmileLeft": 0.3,
          "mouthSmileRight": 0.3
        }
      }
    ],
    "duration": 3.5,
    "fps": 30,
    "totalFrames": 105,
    "metadata": {
      "emotion": "happy",
      "blendShapeCount": 52,
      "provider": "rhubarb"
    }
  }
}
```

---

### 3. Get Job Status

**Endpoint**: `GET /api/v2/avatars/status/:jobId`

**Description**: Checks the status of a rendering job.

**Parameters**:

- `jobId` (path): Job ID returned from `/render` endpoint

**Example Request**:

```bash
curl http://localhost:3000/api/v2/avatars/status/rpm-1737257234567-abc123 \
  -H "x-user-id: user-123"
```

**Response (200 OK) - Pending**:

```json
{
  "success": true,
  "jobId": "rpm-1737257234567-abc123",
  "status": "pending",
  "progress": 0,
  "provider": "ready-player-me",
  "creditsUsed": 3,
  "createdAt": "2026-01-18T10:00:00Z",
  "estimatedTimeRemaining": 120
}
```

**Response (200 OK) - Processing**:

```json
{
  "success": true,
  "jobId": "rpm-1737257234567-abc123",
  "status": "processing",
  "progress": 45,
  "provider": "ready-player-me",
  "creditsUsed": 3,
  "createdAt": "2026-01-18T10:00:00Z",
  "estimatedTimeRemaining": 66
}
```

**Response (200 OK) - Completed**:

```json
{
  "success": true,
  "jobId": "rpm-1737257234567-abc123",
  "status": "completed",
  "progress": 100,
  "videoUrl": "https://cdn.example.com/videos/rpm-1737257234567-abc123.mp4",
  "provider": "ready-player-me",
  "creditsUsed": 3,
  "createdAt": "2026-01-18T10:00:00Z",
  "completedAt": "2026-01-18T10:02:00Z",
  "duration": 120,
  "metadata": {
    "resolution": "1920x1080",
    "fps": 30,
    "fileSize": 15728640,
    "duration": 3.5
  }
}
```

**Response (200 OK) - Failed**:

```json
{
  "success": false,
  "jobId": "rpm-1737257234567-abc123",
  "status": "failed",
  "error": "GLB model download failed: 404 Not Found",
  "provider": "ready-player-me",
  "creditsUsed": 0,
  "createdAt": "2026-01-18T10:00:00Z",
  "failedAt": "2026-01-18T10:00:15Z"
}
```

---

## Data Models

### AvatarQuality

```typescript
enum AvatarQuality {
  PLACEHOLDER = 'PLACEHOLDER', // Local rendering, 0 credits, <1s
  STANDARD = 'STANDARD', // D-ID/HeyGen, 1 credit, ~45s
  HIGH = 'HIGH', // Ready Player Me, 3 credits, ~120s
  HYPERREAL = 'HYPERREAL', // UE5/Audio2Face, 10 credits, ~300s (not implemented)
}
```

### Emotion

```typescript
enum Emotion {
  NEUTRAL = 'neutral',
  HAPPY = 'happy',
  SAD = 'sad',
  ANGRY = 'angry',
  SURPRISED = 'surprised',
  DISGUSTED = 'disgusted',
  FEARFUL = 'fearful',
  CONTEMPT = 'contempt',
}
```

### JobStatus

```typescript
enum JobStatus {
  PENDING = 'pending', // Job queued but not started
  PROCESSING = 'processing', // Job is being rendered
  COMPLETED = 'completed', // Job finished successfully
  FAILED = 'failed', // Job failed with error
}
```

### BlendShapeFrame

```typescript
interface BlendShapeFrame {
  frame: number; // Frame index (0-based)
  timestamp: number; // Time in seconds
  weights: {
    // ARKit blend shape weights (0.0 - 1.0)
    [key: string]: number; // e.g., "jawOpen": 0.5, "mouthSmileLeft": 0.3
  };
}
```

### AvatarGenerationParams

```typescript
interface AvatarGenerationParams {
  userId: string;
  text?: string;
  audioUrl?: string;
  sourceImageUrl?: string; // RPM avatar URL for HIGH tier
  quality: AvatarQuality;
  emotion?: Emotion;
  voiceId?: string;
  metadata?: {
    blendShapeFrames?: BlendShapeFrame[];
    [key: string]: any;
  };
}
```

---

## Integration Examples

### Example 1: Simple Text-to-Avatar (STANDARD Tier)

```javascript
// 1. Request avatar render
const response = await fetch('/api/v2/avatars/render', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': 'user-123',
  },
  body: JSON.stringify({
    text: 'Olá! Vamos começar nossa aula.',
    quality: 'STANDARD',
    emotion: 'happy',
    voiceId: 'pt-BR-FranciscaNeural',
  }),
});

const { jobId } = await response.json();

// 2. Poll for status
const pollStatus = async () => {
  const statusResponse = await fetch(`/api/v2/avatars/status/${jobId}`, {
    headers: { 'x-user-id': 'user-123' },
  });

  const { status, videoUrl } = await statusResponse.json();

  if (status === 'completed') {
    console.log('Video ready:', videoUrl);
    return videoUrl;
  } else if (status === 'failed') {
    throw new Error('Rendering failed');
  } else {
    // Wait and retry
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return pollStatus();
  }
};

const videoUrl = await pollStatus();
```

### Example 2: Custom Avatar with Ready Player Me (HIGH Tier)

```javascript
// 1. Create RPM avatar at https://readyplayer.me/
// 2. Get GLB URL: https://models.readyplayer.me/[avatarId].glb

const response = await fetch('/api/v2/avatars/render', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': 'user-123',
  },
  body: JSON.stringify({
    text: 'Bem-vindo ao futuro da educação online.',
    quality: 'HIGH',
    sourceImageUrl: 'https://models.readyplayer.me/65a8dba831b23abb4f401bae.glb',
    emotion: 'neutral',
    voiceId: 'pt-BR-AntonioNeural',
  }),
});

const { jobId, estimatedTime } = await response.json();
console.log(`Job ${jobId} will take ~${estimatedTime}s`);
```

### Example 3: Preview with Animation Data

```javascript
// Generate animation data without rendering
const response = await fetch('/api/v2/avatars/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': 'user-123',
  },
  body: JSON.stringify({
    text: 'Preview this animation',
    emotion: 'happy',
    enableBlinks: true,
  }),
});

const { animation } = await response.json();

// Use animation.frames for preview in UI
console.log(`Animation has ${animation.totalFrames} frames at ${animation.fps} fps`);
animation.frames.forEach((frame) => {
  console.log(`Frame ${frame.frame}: jawOpen=${frame.weights.jawOpen}`);
});
```

---

## Error Handling

### Common Errors

| Status | Error                    | Cause               | Solution                                             |
| ------ | ------------------------ | ------------------- | ---------------------------------------------------- |
| 400    | Invalid RPM URL          | Malformed GLB URL   | Use format: `https://models.readyplayer.me/[id].glb` |
| 400    | Missing text or audioUrl | No content provided | Provide either `text` or `audioUrl`                  |
| 400    | Invalid quality tier     | Unknown tier        | Use: PLACEHOLDER, STANDARD, HIGH                     |
| 402    | Insufficient credits     | Not enough credits  | Purchase credits or use lower tier                   |
| 404    | Job not found            | Invalid jobId       | Check jobId from render response                     |
| 500    | Provider error           | External API failed | Fallback system will retry automatically             |
| 503    | Service unavailable      | BullMQ queue full   | Retry after delay                                    |

### Retry Strategy

The system implements automatic retries with exponential backoff:

1. **D-ID/HeyGen**: 3 retries with 5s/10s/20s delays
2. **Ready Player Me**: 2 retries with 10s/30s delays
3. **Fallback**: If primary provider fails after retries, system falls back to lower tier

---

## Rate Limits

| Tier        | Max Concurrent Jobs | Max Queue Size | Rate Limit |
| ----------- | ------------------- | -------------- | ---------- |
| PLACEHOLDER | Unlimited           | N/A            | Unlimited  |
| STANDARD    | 5 per user          | 50 global      | 10 req/min |
| HIGH        | 2 per user          | 20 global      | 5 req/min  |

---

## Webhook Notifications (Future)

**Coming Soon**: Webhook support for job completion notifications.

```json
POST <your-webhook-url>
{
  "event": "avatar.render.completed",
  "jobId": "rpm-1737257234567-abc123",
  "status": "completed",
  "videoUrl": "https://cdn.example.com/videos/rpm-1737257234567-abc123.mp4",
  "timestamp": "2026-01-18T10:02:00Z"
}
```

---

## Best Practices

### 1. Choose the Right Tier

- **PLACEHOLDER**: Use for rapid prototyping and UI previews
- **STANDARD**: Use for most production content (best cost/quality ratio)
- **HIGH**: Use for premium content, custom avatars, marketing materials

### 2. Optimize Text Length

- **Ideal**: 2-3 sentences (10-30 seconds of speech)
- **Maximum**: 5 minutes of speech (300 seconds)
- **Reason**: Longer videos consume more credits and rendering time

### 3. Implement Polling with Exponential Backoff

```javascript
const poll = async (jobId, delay = 2000, maxDelay = 30000) => {
  const status = await checkStatus(jobId);

  if (status === 'completed' || status === 'failed') {
    return status;
  }

  await new Promise((resolve) => setTimeout(resolve, delay));
  return poll(jobId, Math.min(delay * 1.5, maxDelay), maxDelay);
};
```

### 4. Cache Animations

If using the same text repeatedly, cache the blend shape data from `/generate` endpoint.

### 5. Handle Errors Gracefully

```javascript
try {
  const result = await renderAvatar(params);
  return result;
} catch (error) {
  if (error.status === 402) {
    // Fallback to lower tier
    return renderAvatar({ ...params, quality: 'STANDARD' });
  }
  throw error;
}
```

---

## Support

- **Documentation**: See [FASE2_PROVIDER_GUIDE.md](./FASE2_PROVIDER_GUIDE.md)
- **Testing**: See [FASE2_TESTING.md](./FASE2_TESTING.md)
- **Status**: See [FASE2_FINAL_STATUS.md](./FASE2_FINAL_STATUS.md)
- **Issues**: Check logs at `/var/log/avatar-worker.log`

---

**Last Updated**: 2026-01-18
**API Version**: 2.0.0
**Phase**: 2 (Complete)
