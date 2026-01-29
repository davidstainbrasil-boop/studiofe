# Phase 2 Avatar System - Provider Integration Guide

**Version**: 1.0.0
**Last Updated**: 2026-01-18
**Status**: Production Ready

## Overview

The Avatar System integrates with multiple rendering providers to offer different quality tiers. This guide explains how each provider works, configuration requirements, and troubleshooting tips.

---

## Provider Architecture

```
AvatarRenderOrchestrator
    ↓
Quality Tier Selection
    ↓
┌─────────────┬──────────────┬──────────────────┬────────────────┐
│             │              │                  │                │
Placeholder   D-ID           HeyGen             Ready Player Me
Adapter       Adapter        Adapter            Adapter
    ↓             ↓              ↓                  ↓
Local         D-ID API       HeyGen API         Remotion+Three.js
Remotion      (POST /talks)  (POST /avatars)    (GLB Rendering)
```

---

## Provider: PLACEHOLDER (Local Remotion)

### Overview

- **Quality Tier**: PLACEHOLDER
- **Credits**: 0
- **Rendering Time**: <1 second
- **Provider**: Local (Remotion)
- **Use Case**: Rapid prototyping, UI previews, testing

### How It Works

1. Receives blend shape animation frames
2. Renders simple placeholder video with Remotion
3. Returns immediate result (no async processing)
4. No external API calls

### Configuration

**No configuration required** - works out of the box.

### Implementation

**File**: `estudio_ia_videos/src/lib/avatar/providers/placeholder-adapter.ts`

```typescript
export class PlaceholderAdapter implements AvatarProvider {
  quality = AvatarQuality.PLACEHOLDER;
  estimatedTime = 1; // seconds
  creditsPerSecond = 0;

  async render(animation: FacialAnimation, config: AvatarConfig): Promise<RenderResult> {
    // Render locally with Remotion
    const composition = 'PlaceholderAvatar';
    const inputProps = {
      frames: animation.frames,
      duration: animation.duration,
      emotion: config.emotion,
    };

    // Synchronous render (mock for now)
    return {
      status: 'completed',
      videoUrl: 'data:video/mp4;base64,...',
      provider: 'placeholder',
    };
  }
}
```

### Testing

```bash
bash test-avatar-placeholder.sh
```

**Expected Output**:

```
✓ Placeholder tier functional
✓ Animation frames generated
✓ Render time: <1s
✓ Credits used: 0
```

### Troubleshooting

| Issue          | Cause                       | Solution                        |
| -------------- | --------------------------- | ------------------------------- |
| Slow rendering | CPU overload                | Reduce resolution or FPS        |
| Missing frames | Animation generation failed | Check BlendShapeController logs |

---

## Provider: D-ID (Cloud - STANDARD Tier)

### Overview

- **Quality Tier**: STANDARD
- **Credits**: 1 per video
- **Rendering Time**: ~45 seconds
- **Provider**: D-ID API
- **Use Case**: Professional courses, marketing videos

### How It Works

1. Sends audio + avatar image to D-ID API
2. D-ID generates photorealistic talking avatar
3. Polls for job completion (async)
4. Returns final video URL from D-ID CDN

### Configuration

**Environment Variables**:

```bash
DID_API_KEY=your_did_api_key_here
DID_API_URL=https://api.d-id.com
```

**Get API Key**:

1. Sign up at https://studio.d-id.com/
2. Navigate to **Settings > API Keys**
3. Create new API key
4. Copy to `.env.local`

### Implementation

**File**: `estudio_ia_videos/src/lib/services/avatar/did-service-real.ts`

```typescript
export class DIDService {
  private apiKey: string;
  private baseUrl = 'https://api.d-id.com';

  async createVideo(params: AvatarGenerationParams): Promise<string> {
    // 1. Upload audio (if not already hosted)
    const audioUrl = await this.uploadAudio(params.audioUrl);

    // 2. Create talk
    const response = await fetch(`${this.baseUrl}/talks`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_url: params.sourceImageUrl || 'default-avatar.jpg',
        script: {
          type: 'audio',
          audio_url: audioUrl,
        },
        config: {
          result_format: 'mp4',
          fluent: true,
          pad_audio: 0,
        },
      }),
    });

    const { id } = await response.json();
    return id; // Job ID
  }

  async getStatus(jobId: string): Promise<AvatarGenerationResult> {
    const response = await fetch(`${this.baseUrl}/talks/${jobId}`, {
      headers: {
        Authorization: `Basic ${this.apiKey}`,
      },
    });

    const data = await response.json();

    return {
      jobId,
      status: this.mapStatus(data.status),
      videoUrl: data.result_url,
      cost: 1,
    };
  }

  private mapStatus(didStatus: string): JobStatus {
    const mapping = {
      created: 'pending',
      started: 'processing',
      done: 'completed',
      error: 'failed',
    };
    return mapping[didStatus] || 'pending';
  }
}
```

### API Limits

- **Rate Limit**: 10 requests/minute
- **Concurrent Jobs**: 5 per account
- **Max Video Length**: 5 minutes
- **Max File Size**: 50 MB (audio)

### Testing

```bash
bash test-avatar-standard-did.sh
```

**Expected Output**:

```
✓ D-ID API accessible
✓ Job created: talk-abc123
✓ Status: processing
✓ Render time: ~45s
✓ Credits used: 1
✓ Video URL: https://d-id-talks-prod.s3.amazonaws.com/...
```

### Troubleshooting

| Issue                   | Cause                 | Solution                              |
| ----------------------- | --------------------- | ------------------------------------- |
| 401 Unauthorized        | Invalid API key       | Check DID_API_KEY in .env             |
| 429 Rate Limited        | Too many requests     | Implement exponential backoff         |
| 503 Service Unavailable | D-ID servers down     | Use fallback to HeyGen or Placeholder |
| Job stuck in "started"  | D-ID processing issue | Wait 2 minutes, then retry            |

### Cost Optimization

- **Cache audio files**: Reuse audio URLs when possible
- **Batch requests**: Queue multiple jobs during off-peak hours
- **Fallback strategy**: Use Placeholder for previews, D-ID for final

---

## Provider: HeyGen (Cloud - STANDARD Tier)

### Overview

- **Quality Tier**: STANDARD
- **Credits**: 1 per video
- **Rendering Time**: ~45 seconds
- **Provider**: HeyGen API
- **Use Case**: Backup for D-ID, professional videos

### How It Works

1. Sends script + avatar ID to HeyGen API
2. HeyGen generates realistic avatar video
3. Polls for job completion
4. Returns final video URL from HeyGen CDN

### Configuration

**Environment Variables**:

```bash
HEYGEN_API_KEY=your_heygen_api_key_here
HEYGEN_API_URL=https://api.heygen.com/v2
```

**Get API Key**:

1. Sign up at https://www.heygen.com/
2. Navigate to **API** tab in dashboard
3. Generate API key
4. Copy to `.env.local`

### Implementation

**File**: `estudio_ia_videos/src/lib/heygen-service.ts`

```typescript
export class HeyGenService {
  private apiKey: string;
  private baseUrl = 'https://api.heygen.com/v2';

  async createVideo(params: AvatarGenerationParams): Promise<string> {
    const response = await fetch(`${this.baseUrl}/video/generate`, {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: params.sourceImageUrl || 'default_avatar_id',
              avatar_style: 'normal',
            },
            voice: {
              type: 'text',
              input_text: params.text,
              voice_id: params.voiceId || 'en-US-JennyNeural',
            },
          },
        ],
        dimension: {
          width: 1920,
          height: 1080,
        },
        aspect_ratio: '16:9',
      }),
    });

    const { video_id } = await response.json();
    return video_id;
  }

  async getStatus(jobId: string): Promise<AvatarGenerationResult> {
    const response = await fetch(`${this.baseUrl}/video/${jobId}`, {
      headers: {
        'X-Api-Key': this.apiKey,
      },
    });

    const data = await response.json();

    return {
      jobId,
      status: data.status === 'completed' ? 'completed' : 'processing',
      videoUrl: data.video_url,
      cost: 1,
    };
  }
}
```

### API Limits

- **Rate Limit**: 10 requests/minute
- **Concurrent Jobs**: 3 per account
- **Max Video Length**: 10 minutes
- **Credits**: Billed per second of video

### Testing

```bash
bash test-avatar-standard-heygen.sh
```

### Troubleshooting

| Issue               | Cause                 | Solution                     |
| ------------------- | --------------------- | ---------------------------- |
| Invalid avatar_id   | Avatar not found      | Use valid HeyGen avatar ID   |
| Voice not supported | Invalid voice_id      | Check HeyGen voice list      |
| Quota exceeded      | Monthly limit reached | Upgrade plan or use fallback |

---

## Provider: Ready Player Me (Cloud - HIGH Tier)

### Overview

- **Quality Tier**: HIGH
- **Credits**: 3 per video
- **Rendering Time**: ~120 seconds
- **Provider**: Ready Player Me + Remotion
- **Use Case**: Premium 3D avatars, customized characters

### How It Works

1. Fetches GLB model from Ready Player Me CDN
2. Applies 52 ARKit blend shapes for lip-sync
3. Renders with Three.js + Remotion (local)
4. Processes async via BullMQ
5. Uploads final video to CDN

### Configuration

**No API key required** - RPM models are publicly accessible via CDN.

**Environment Variables**:

```bash
RPM_CDN_URL=https://models.readyplayer.me
REMOTION_WORKERS=2  # Parallel rendering workers
```

### Implementation

**File**: `estudio_ia_videos/src/lib/services/avatar/ready-player-me-service.ts`

```typescript
export class ReadyPlayerMeService {
  private validateRPMUrl(url: string): boolean {
    const parsed = new URL(url);
    return (
      (parsed.hostname === 'models.readyplayer.me' || parsed.hostname === 'api.readyplayer.me') &&
      parsed.pathname.endsWith('.glb')
    );
  }

  async createVideo(params: AvatarGenerationParams): Promise<string> {
    // 1. Validate RPM URL
    if (!this.validateRPMUrl(params.sourceImageUrl)) {
      throw new Error('Invalid RPM URL format');
    }

    // 2. Fetch GLB metadata
    const glbMetadata = await this.fetchGLBMetadata(params.sourceImageUrl);

    // 3. Extract blend shape frames
    const blendShapeFrames = params.metadata?.blendShapeFrames || [];

    // 4. Queue Remotion render job
    const jobId = `rpm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    await addVideoJob({
      jobId,
      composition: 'RPMAvatar',
      inputProps: {
        avatarUrl: params.sourceImageUrl,
        audioUrl: params.audioUrl,
        blendShapeFrames,
        fps: 30,
        cameraPosition: [0, 1.6, 2],
        cameraTarget: [0, 1.6, 0],
      },
    });

    return jobId;
  }
}
```

### Remotion Component

**File**: `estudio_ia_videos/src/app/remotion/components/RPMAvatarWithLipSync.tsx`

```typescript
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function AvatarMesh({ avatarUrl, blendShapeFrames }) {
  const currentFrame = useCurrentFrame();
  const meshRef = useRef<THREE.Mesh>(null);
  const gltf = useLoader(GLTFLoader, avatarUrl);

  useFrame(() => {
    if (!meshRef.current || !blendShapeFrames.length) return;

    const frameIndex = Math.floor(currentFrame);
    const frame = blendShapeFrames[frameIndex];

    // Apply blend shape weights to morph targets
    Object.entries(frame.weights).forEach(([shapeName, weight]) => {
      const morphIndex = morphTargetDictionary[shapeName];
      meshRef.current.morphTargetInfluences[morphIndex] = weight;
    });
  });

  return <primitive object={gltf.scene} />;
}
```

### Creating Custom Avatars

1. **Visit**: https://readyplayer.me/
2. **Customize**: Choose appearance, clothing, accessories
3. **Export**: Click "Generate Avatar" → Get GLB URL
4. **Format**: `https://models.readyplayer.me/[avatarId].glb`
5. **Use**: Pass URL to `sourceImageUrl` parameter

**Example Avatar URLs**:

- Male: `https://models.readyplayer.me/65a8dba831b23abb4f401bae.glb`
- Female: `https://models.readyplayer.me/65b7c1234efa5bcc3d501abf.glb`

### Testing

```bash
bash test-avatar-high-rpm.sh
```

**Expected Output**:

```
✓ RPM URL valid: https://models.readyplayer.me/65a8dba831b23abb4f401bae.glb
✓ GLB metadata fetched (size: 2.4 MB)
✓ Blend shape frames: 105
✓ Job created: rpm-1737257234567-abc123
✓ Render time: ~120s
✓ Credits used: 3
✓ Video quality: 1920x1080 @ 30fps
```

### Performance Optimization

- **Cache GLB models**: Store downloaded models locally (future)
- **Reduce polygon count**: Use RPM's "Low Poly" export option
- **Parallel rendering**: Process multiple jobs concurrently (REMOTION_WORKERS=2)

### Troubleshooting

| Issue                | Cause                   | Solution                                |
| -------------------- | ----------------------- | --------------------------------------- |
| 404 GLB not found    | Invalid avatar ID       | Generate new avatar at readyplayer.me   |
| Slow rendering       | High polygon count      | Use Low Poly export option              |
| Missing blend shapes | GLB lacks morph targets | Ensure RPM avatar has facial rig        |
| Out of memory        | GLB too large (>10MB)   | Compress textures or use simpler avatar |

---

## Fallback System

### How Fallback Works

If a provider fails after retries, the system automatically falls back to a lower tier:

```
HIGH (RPM) → STANDARD (D-ID/HeyGen) → PLACEHOLDER
```

### Configuration

**File**: `estudio_ia_videos/src/lib/avatar/avatar-render-orchestrator.ts`

```typescript
async render(request: RenderRequest): Promise<RenderResult> {
  try {
    // Try primary provider
    return await this.providers.get(request.quality).render(request);
  } catch (error) {
    logger.warn('Primary provider failed, attempting fallback', {
      originalQuality: request.quality,
      error: error.message
    });

    // Fallback to lower tier
    const fallbackQuality = this.getFallbackTier(request.quality);
    return await this.providers.get(fallbackQuality).render(request);
  }
}

private getFallbackTier(quality: AvatarQuality): AvatarQuality {
  const fallbackMap = {
    [AvatarQuality.HIGH]: AvatarQuality.STANDARD,
    [AvatarQuality.STANDARD]: AvatarQuality.PLACEHOLDER,
    [AvatarQuality.PLACEHOLDER]: AvatarQuality.PLACEHOLDER
  };
  return fallbackMap[quality];
}
```

### Testing Fallback

```bash
# Disable D-ID temporarily
export DID_API_KEY=invalid_key

# Request STANDARD tier
bash test-avatar-standard-did.sh

# Expected: Fallback to PLACEHOLDER
# Output: "⚠ Fallback triggered: STANDARD → PLACEHOLDER"
```

---

## Circuit Breaker Pattern

The system implements circuit breaker to prevent cascading failures:

```typescript
class CircuitBreaker {
  private failureCount = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  async execute(fn: () => Promise<any>): Promise<any> {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= 5) {
      this.state = 'OPEN';
      setTimeout(() => {
        this.state = 'HALF_OPEN';
        this.failureCount = 0;
      }, 60000); // 1 minute cooldown
    }
  }
}
```

**Usage**:

```typescript
const didCircuitBreaker = new CircuitBreaker();
await didCircuitBreaker.execute(() => didService.createVideo(params));
```

---

## Monitoring and Metrics

### Recommended Metrics to Track

1. **Provider Success Rate**:

   ```sql
   SELECT provider,
          COUNT(*) as total_jobs,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
          (successful * 100.0 / total_jobs) as success_rate
   FROM video_jobs
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY provider;
   ```

2. **Average Rendering Time**:

   ```sql
   SELECT provider,
          quality_tier,
          AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_seconds
   FROM video_jobs
   WHERE status = 'completed'
   GROUP BY provider, quality_tier;
   ```

3. **Fallback Frequency**:
   ```sql
   SELECT
     SUM(CASE WHEN metadata->>'fallback_triggered' = 'true' THEN 1 ELSE 0 END) as fallback_count,
     COUNT(*) as total_jobs,
     (fallback_count * 100.0 / total_jobs) as fallback_rate
   FROM video_jobs
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

### Alerting Rules

- **Alert**: Success rate < 95% for any provider
- **Alert**: Average rendering time > 2x expected
- **Alert**: Fallback rate > 10%
- **Alert**: Circuit breaker OPEN for > 5 minutes

---

## Cost Comparison

| Provider        | Credits/Video | Render Time | Quality      | Best For                  |
| --------------- | ------------- | ----------- | ------------ | ------------------------- |
| Placeholder     | 0             | <1s         | Low          | Prototyping, previews     |
| D-ID            | 1             | ~45s        | Professional | Standard courses          |
| HeyGen          | 1             | ~45s        | Professional | Standard courses (backup) |
| Ready Player Me | 3             | ~120s       | Premium 3D   | High-end content          |

**Monthly Cost Estimate (1000 videos)**:

- Placeholder: $0
- D-ID/HeyGen: ~$50 (assuming $0.05/credit)
- Ready Player Me: ~$150

---

## Best Practices

1. **Use Placeholder for Development**: Save credits during testing
2. **Implement Caching**: Cache blend shape animations for repeated text
3. **Monitor Provider Health**: Track success rates and fallback frequency
4. **Load Balance**: Distribute load between D-ID and HeyGen
5. **Optimize Avatar Models**: Use compressed GLB files for RPM (<5MB)

---

## Support and Debugging

### Debug Logs

**Enable verbose logging**:

```bash
export LOG_LEVEL=debug
export DEBUG_AVATAR_PROVIDERS=true
```

**Check logs**:

```bash
tail -f /var/log/avatar-worker.log
```

### Common Issues

| Symptom            | Likely Cause        | Check                       |
| ------------------ | ------------------- | --------------------------- |
| All jobs failing   | API keys missing    | Verify .env.local           |
| Slow rendering     | Queue backed up     | Check BullMQ dashboard      |
| Poor video quality | Wrong tier selected | Use HIGH for premium        |
| High costs         | No caching          | Implement animation caching |

### Provider Status Pages

- **D-ID**: https://status.d-id.com/
- **HeyGen**: https://status.heygen.com/
- **Ready Player Me**: https://status.readyplayer.me/

---

**Last Updated**: 2026-01-18
**Document Version**: 1.0.0
**Phase**: 2 (Complete)
