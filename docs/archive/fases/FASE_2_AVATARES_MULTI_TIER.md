# FASE 2: AVATARES HIPER-REALISTAS (ENGINE MULTI-TIER)
**Duração:** 4 semanas (08/02 - 07/03)
**Prioridade:** ALTA 🔥
**Objetivo:** Sistema de avatares com 4 níveis de qualidade

---

## 📊 Visão Geral da Fase

### Objetivos
1. ✅ Implementar 4 tiers de qualidade (Placeholder → Standard → High → Hyperreal)
2. ✅ Integrar D-ID real (substituir mock)
3. ✅ Integrar ReadyPlayerMe para avatares 3D
4. ✅ Preparar pipeline Audio2Face + UE5
5. ✅ Sistema de fallback inteligente

### Stack Tecnológico
- **D-ID API** - Avatares 2D fotorealistas
- **HeyGen API** - Avatares profissionais (já existe)
- **ReadyPlayerMe** - Avatares 3D customizáveis
- **Audio2Face** - Animação facial hiper-realista
- **Unreal Engine 5** - Renderização cinematográfica

---

## Week 4: Arquitetura Multi-Tier (já documentada em PLANO_IMPLEMENTACAO_COMPLETO.md)

Veja linhas 425-850 do arquivo principal para:
- Quality Tier System
- Avatar Quality Negotiator
- Provider Health Checks

---

## Week 5: D-ID Integration (Real Implementation)

### Dia 21-22: D-ID Service Complete

**Arquivos:**
- ✅ `/src/lib/services/avatar/did-service-real.ts` (já criado)
- [ ] `/src/lib/services/avatar/did-webhook-handler.ts`
- [ ] `/src/app/api/avatar/did/create/route.ts`
- [ ] `/src/app/api/avatar/did/status/[id]/route.ts`
- [ ] `/src/app/api/avatar/did/webhook/route.ts`

**Código: did-webhook-handler.ts**
```typescript
import { logger } from '@/lib/logger'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export interface DIDWebhookPayload {
  id: string
  status: 'done' | 'error'
  result_url?: string
  error?: {
    kind: string
    description: string
  }
  created_at: string
  duration?: number
}

export class DIDWebhookHandler {
  /**
   * Processa webhook do D-ID
   */
  async handleWebhook(payload: DIDWebhookPayload): Promise<void> {
    try {
      logger.info('Processing D-ID webhook', {
        talkId: payload.id,
        status: payload.status
      })

      const supabase = createServerSupabaseClient()

      // Atualizar render job no banco
      const { error: updateError } = await supabase
        .from('render_jobs')
        .update({
          status: payload.status === 'done' ? 'completed' : 'failed',
          result_url: payload.result_url,
          error_message: payload.error?.description,
          completed_at: new Date().toISOString(),
          metadata: {
            did_talk_id: payload.id,
            duration: payload.duration
          }
        })
        .eq('external_id', payload.id)
        .eq('provider', 'did')

      if (updateError) {
        throw updateError
      }

      // Se completado com sucesso, fazer download e upload para storage
      if (payload.status === 'done' && payload.result_url) {
        await this.downloadAndStoreVideo(payload.id, payload.result_url)
      }

      // Notificar usuário
      await this.notifyUser(payload.id, payload.status)

    } catch (error) {
      logger.error('Failed to process D-ID webhook', error as Error, {
        payload
      })
      throw error
    }
  }

  private async downloadAndStoreVideo(
    talkId: string,
    videoUrl: string
  ): Promise<string> {
    const supabase = createServerSupabaseClient()

    // Download do D-ID
    const videoResponse = await fetch(videoUrl)
    const videoBuffer = await videoResponse.arrayBuffer()

    // Upload para Supabase Storage
    const fileName = `avatars/did-${talkId}.mp4`
    const { data, error } = await supabase.storage
      .from('videos')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true
      })

    if (error) throw error

    // Obter URL público
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName)

    // Atualizar render job com URL permanente
    await supabase
      .from('render_jobs')
      .update({ result_url: publicUrl })
      .eq('external_id', talkId)

    return publicUrl
  }

  private async notifyUser(talkId: string, status: string): Promise<void> {
    const supabase = createServerSupabaseClient()

    // Buscar job e usuário
    const { data: job } = await supabase
      .from('render_jobs')
      .select('user_id, project_id')
      .eq('external_id', talkId)
      .single()

    if (!job) return

    // Criar notificação
    await supabase.from('notifications').insert({
      user_id: job.user_id,
      type: status === 'done' ? 'avatar_complete' : 'avatar_failed',
      title: status === 'done'
        ? 'Avatar concluído!'
        : 'Falha ao gerar avatar',
      message: status === 'done'
        ? 'Seu avatar falante está pronto para visualização.'
        : 'Houve um erro ao processar seu avatar. Tente novamente.',
      metadata: {
        talk_id: talkId,
        project_id: job.project_id
      }
    })
  }

  /**
   * Valida signature do webhook (segurança)
   */
  validateSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto')
    const secret = process.env.DID_WEBHOOK_SECRET!

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return signature === expectedSignature
  }
}
```

**Código: /api/avatar/did/create/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { DIDServiceReal } from '@/lib/services/avatar/did-service-real'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  projectId: z.string().uuid(),
  sourceImage: z.string().url(),
  text: z.string().min(1).optional(),
  audioUrl: z.string().url().optional(),
  voice: z.string().optional(),
  settings: z.object({
    fluent: z.boolean().optional(),
    padAudio: z.number().optional(),
    stitch: z.boolean().optional()
  }).optional()
}).refine(
  data => data.text || data.audioUrl,
  { message: 'Either text or audioUrl required' }
)

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validar input
    const body = await request.json()
    const validation = schema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error },
        { status: 400 }
      )
    }

    const { projectId, sourceImage, text, audioUrl, voice, settings } = validation.data

    // Verificar ownership do projeto
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Verificar créditos do usuário
    const { data: userProfile } = await supabase
      .from('users')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (!userProfile || userProfile.credits < 1) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 }
      )
    }

    // Criar webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/avatar/did/webhook`

    // Criar talk no D-ID
    const didService = new DIDServiceReal()
    const talkId = await didService.createTalk({
      sourceImage,
      text,
      audioUrl,
      voice,
      settings,
      webhookUrl
    })

    // Registrar job no banco
    const { data: job } = await supabase
      .from('render_jobs')
      .insert({
        user_id: user.id,
        project_id: projectId,
        type: 'avatar',
        provider: 'did',
        status: 'processing',
        external_id: talkId,
        settings: {
          sourceImage,
          text: text?.substring(0, 100), // Apenas preview
          voice
        }
      })
      .select()
      .single()

    // Debitar crédito
    await supabase
      .from('users')
      .update({ credits: userProfile.credits - 1 })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        talkId,
        status: 'processing',
        estimatedTime: 60 // segundos
      }
    })

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to create D-ID avatar',
        message: (error as Error).message
      },
      { status: 500 }
    )
  }
}
```

**Código: /api/avatar/did/webhook/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { DIDWebhookHandler } from '@/lib/services/avatar/did-webhook-handler'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text()
    const signature = request.headers.get('x-did-signature') || ''

    // Validar signature
    const handler = new DIDWebhookHandler()
    const isValid = handler.validateSignature(payload, signature)

    if (!isValid) {
      logger.warn('Invalid D-ID webhook signature', {
        signature,
        ip: request.headers.get('x-forwarded-for')
      })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Processar webhook
    const data = JSON.parse(payload)
    await handler.handleWebhook(data)

    return NextResponse.json({ success: true })

  } catch (error) {
    logger.error('D-ID webhook processing failed', error as Error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
```

---

## Week 6: ReadyPlayerMe Integration (3D Avatars)

### Dia 23-25: ReadyPlayerMe Service

**Arquivos:**
- [ ] `/src/lib/services/avatar/readyplayerme-service.ts`
- [ ] `/src/lib/services/avatar/rpm-animator.ts`
- [ ] `/src/app/api/avatar/rpm/create/route.ts`
- [ ] `/src/app/api/avatar/rpm/render/route.ts`

**Código: readyplayerme-service.ts**
```typescript
import axios from 'axios'
import { logger } from '@/lib/logger'

export interface RPMAvatarConfig {
  photoUrl?: string
  gender?: 'male' | 'female'
  bodyType?: 'fullbody' | 'halfbody'
  customization?: {
    skinColor?: string
    hairStyle?: string
    hairColor?: string
    eyeColor?: string
    outfit?: string
  }
}

export interface RPMAvatar {
  id: string
  glbUrl: string
  thumbnailUrl: string
  metadata: {
    bodyType: string
    meshes: string[]
    morphTargets: string[]
  }
}

export class ReadyPlayerMeService {
  private apiKey = process.env.RPM_API_KEY
  private baseURL = 'https://api.readyplayer.me/v2'

  /**
   * Cria avatar a partir de foto
   */
  async createAvatarFromPhoto(photoBuffer: Buffer): Promise<RPMAvatar> {
    try {
      const formData = new FormData()
      formData.append('photo', new Blob([photoBuffer]), 'photo.jpg')
      formData.append('type', 'fullbody')

      const response = await axios.post(
        `${this.baseURL}/avatars`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      const avatarId = response.data.id

      // Aguardar processamento
      const avatar = await this.pollAvatarStatus(avatarId)

      return avatar

    } catch (error) {
      logger.error('Failed to create RPM avatar from photo', error as Error)
      throw error
    }
  }

  /**
   * Cria avatar customizado
   */
  async createCustomAvatar(config: RPMAvatarConfig): Promise<RPMAvatar> {
    try {
      const response = await axios.post(
        `${this.baseURL}/avatars`,
        {
          gender: config.gender || 'male',
          bodyType: config.bodyType || 'fullbody',
          assets: this.buildAssetsList(config.customization)
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const avatarId = response.data.id
      const avatar = await this.pollAvatarStatus(avatarId)

      return avatar

    } catch (error) {
      logger.error('Failed to create custom RPM avatar', error as Error)
      throw error
    }
  }

  /**
   * Busca avatar existente
   */
  async getAvatar(avatarId: string): Promise<RPMAvatar> {
    try {
      const response = await axios.get(
        `${this.baseURL}/avatars/${avatarId}.glb?morphTargets=ARKit`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      )

      return {
        id: avatarId,
        glbUrl: response.request.res.responseUrl,
        thumbnailUrl: `${this.baseURL}/avatars/${avatarId}.png`,
        metadata: {
          bodyType: 'fullbody',
          meshes: response.data.meshes || [],
          morphTargets: ['ARKit']
        }
      }

    } catch (error) {
      logger.error('Failed to get RPM avatar', error as Error)
      throw error
    }
  }

  /**
   * Download do modelo GLB
   */
  async downloadGLB(glbUrl: string): Promise<Buffer> {
    try {
      const response = await axios.get(glbUrl, {
        responseType: 'arraybuffer'
      })

      return Buffer.from(response.data)

    } catch (error) {
      logger.error('Failed to download GLB', error as Error)
      throw error
    }
  }

  private async pollAvatarStatus(
    avatarId: string,
    maxAttempts: number = 30
  ): Promise<RPMAvatar> {

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const avatar = await this.getAvatar(avatarId)
        return avatar
      } catch {
        // Aguardar 2s antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    throw new Error('RPM avatar creation timeout')
  }

  private buildAssetsList(customization?: RPMAvatarConfig['customization']): any[] {
    if (!customization) return []

    const assets = []

    if (customization.hairStyle) {
      assets.push({ id: customization.hairStyle, type: 'hair' })
    }

    if (customization.outfit) {
      assets.push({ id: customization.outfit, type: 'outfit' })
    }

    return assets
  }
}
```

**Código: rpm-animator.ts** (Three.js Server-Side Rendering)
```typescript
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { Phoneme } from '@/lib/sync/types/phoneme.types'
import { BlendShapeController } from '@/lib/avatar/blend-shape-controller'
import { createCanvas } from 'canvas'
import { logger } from '@/lib/logger'

export class RPMAnimator {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private avatar: THREE.Group | null = null
  private mixer: THREE.AnimationMixer | null = null

  constructor(width: number = 1920, height: number = 1080) {
    // Setup Three.js scene
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x00ff00) // Chroma key

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    this.camera.position.set(0, 1.6, 2)
    this.camera.lookAt(0, 1.6, 0)

    // Renderer headless
    const canvas = createCanvas(width, height)
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas as any,
      antialias: true,
      alpha: true
    })
    this.renderer.setSize(width, height)

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 5, 5)
    this.scene.add(directionalLight)
  }

  /**
   * Carrega modelo GLB
   */
  async loadAvatar(glbBuffer: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader()

      loader.parse(
        glbBuffer.buffer,
        '',
        (gltf) => {
          this.avatar = gltf.scene
          this.scene.add(this.avatar)

          // Setup animation mixer
          if (gltf.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(this.avatar)
          }

          logger.info('RPM avatar loaded', {
            meshCount: gltf.scene.children.length,
            animationCount: gltf.animations.length
          })

          resolve()
        },
        reject
      )
    })
  }

  /**
   * Renderiza frame com lip-sync
   */
  renderFrame(phonemes: Phoneme[], time: number): Buffer {
    if (!this.avatar) {
      throw new Error('Avatar not loaded')
    }

    // Encontrar phonema ativo
    const activePhoneme = phonemes.find(p =>
      time >= p.time && time < p.time + p.duration
    )

    // Aplicar blend shapes
    if (activePhoneme) {
      this.applyBlendShapes(activePhoneme)
    }

    // Renderizar
    this.renderer.render(this.scene, this.camera)

    // Extrair frame como buffer
    const canvas = this.renderer.domElement as any
    return canvas.toBuffer('image/png')
  }

  /**
   * Aplica blend shapes do phonema ao avatar
   */
  private applyBlendShapes(phoneme: Phoneme): void {
    if (!this.avatar) return

    const controller = new BlendShapeController()
    controller.applyViseme(phoneme.viseme, phoneme.intensity)
    const weights = controller.getWeights()

    // Aplicar aos morph targets
    this.avatar.traverse((child) => {
      if (child instanceof THREE.Mesh && child.morphTargetInfluences) {
        Object.entries(weights).forEach(([name, value]) => {
          const index = child.morphTargetDictionary?.[name]
          if (index !== undefined) {
            child.morphTargetInfluences[index] = value
          }
        })
      }
    })
  }

  /**
   * Renderiza vídeo completo
   */
  async renderVideo(
    phonemes: Phoneme[],
    duration: number,
    fps: number = 30
  ): Promise<Buffer[]> {
    const frames: Buffer[] = []
    const frameCount = Math.floor(duration * fps)

    for (let i = 0; i < frameCount; i++) {
      const time = i / fps
      const frame = this.renderFrame(phonemes, time)
      frames.push(frame)

      // Log progresso
      if (i % 30 === 0) {
        logger.info(`Rendering frame ${i}/${frameCount}`)
      }
    }

    return frames
  }

  dispose(): void {
    this.renderer.dispose()
    this.scene.clear()
  }
}
```

---

## Week 7: Audio2Face + Unreal Engine Pipeline

### Dia 26-28: Audio2Face Integration

**Arquivos:**
- [ ] `/src/lib/services/avatar/audio2face-client.ts`
- [ ] `/src/lib/services/avatar/audio2face-pipeline.ts`
- [ ] `/src/app/api/avatar/a2f/process/route.ts`

**Código: audio2face-client.ts** (gRPC Client)
```typescript
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import { logger } from '@/lib/logger'
import path from 'path'

export interface A2FProcessRequest {
  audioPath: string
  rigPath: string // USD file do avatar
  settings?: {
    emotionStrength?: number
    smoothing?: number
    enableEyeBlinks?: boolean
    enableHeadMovement?: boolean
  }
}

export interface A2FProcessResult {
  jobId: string
  status: 'processing' | 'completed' | 'failed'
  animationPath?: string
  error?: string
}

export class Audio2FaceClient {
  private client: any
  private endpoint: string

  constructor() {
    this.endpoint = process.env.AUDIO2FACE_GRPC_ENDPOINT || 'localhost:50051'
    this.initializeClient()
  }

  private async initializeClient() {
    // Carregar proto definitions
    const PROTO_PATH = path.join(__dirname, 'protos', 'audio2face.proto')

    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    })

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any
    const Audio2Face = protoDescriptor.nvidia.audio2face.Audio2FaceService

    this.client = new Audio2Face(
      this.endpoint,
      grpc.credentials.createInsecure()
    )
  }

  /**
   * Envia áudio para processamento
   */
  async processAudio(request: A2FProcessRequest): Promise<string> {
    return new Promise((resolve, reject) => {
      this.client.ProcessAudio(
        {
          audio_path: request.audioPath,
          rig_path: request.rigPath,
          emotion_strength: request.settings?.emotionStrength || 1.0,
          smoothing: request.settings?.smoothing || 0.8,
          enable_eye_blinks: request.settings?.enableEyeBlinks ?? true,
          enable_head_movement: request.settings?.enableHeadMovement ?? true
        },
        (error: any, response: any) => {
          if (error) {
            logger.error('Audio2Face processing failed', error)
            reject(error)
          } else {
            resolve(response.job_id)
          }
        }
      )
    })
  }

  /**
   * Verifica status do job
   */
  async getJobStatus(jobId: string): Promise<A2FProcessResult> {
    return new Promise((resolve, reject) => {
      this.client.GetJobStatus(
        { job_id: jobId },
        (error: any, response: any) => {
          if (error) {
            reject(error)
          } else {
            resolve({
              jobId,
              status: response.status,
              animationPath: response.animation_path,
              error: response.error
            })
          }
        }
      )
    })
  }

  /**
   * Aguarda conclusão do processamento
   */
  async waitForCompletion(
    jobId: string,
    maxWaitTime: number = 600000, // 10 minutos
    pollInterval: number = 2000
  ): Promise<A2FProcessResult> {
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getJobStatus(jobId)

      if (status.status === 'completed') {
        return status
      }

      if (status.status === 'failed') {
        throw new Error(`Audio2Face job failed: ${status.error}`)
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    throw new Error('Audio2Face job timeout')
  }

  /**
   * Cancela job em processamento
   */
  async cancelJob(jobId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.CancelJob(
        { job_id: jobId },
        (error: any) => {
          if (error) reject(error)
          else resolve()
        }
      )
    })
  }
}
```

**Código: audio2face-pipeline.ts**
```typescript
import { Audio2FaceClient } from './audio2face-client'
import { UnrealEngineClient } from './unreal-engine-client'
import { logger } from '@/lib/logger'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export class Audio2FacePipeline {
  private a2fClient: Audio2FaceClient
  private ueClient: UnrealEngineClient

  constructor() {
    this.a2fClient = new Audio2FaceClient()
    this.ueClient = new UnrealEngineClient()
  }

  /**
   * Pipeline completo: Audio → Animation → Render
   */
  async processHyperRealAvatar(params: {
    audioPath: string
    avatarRigPath: string
    userId: string
    projectId: string
  }): Promise<string> {

    const supabase = createServerSupabaseClient()

    try {
      // 1. Criar render job
      const { data: job } = await supabase
        .from('render_jobs')
        .insert({
          user_id: params.userId,
          project_id: params.projectId,
          type: 'avatar',
          provider: 'audio2face',
          status: 'processing',
          settings: {
            audioPath: params.audioPath,
            rigPath: params.avatarRigPath
          }
        })
        .select()
        .single()

      // 2. Processar com Audio2Face
      logger.info('Starting Audio2Face processing', { jobId: job.id })

      const a2fJobId = await this.a2fClient.processAudio({
        audioPath: params.audioPath,
        rigPath: params.avatarRigPath,
        settings: {
          emotionStrength: 1.0,
          smoothing: 0.8,
          enableEyeBlinks: true,
          enableHeadMovement: true
        }
      })

      // Aguardar processamento A2F
      const a2fResult = await this.a2fClient.waitForCompletion(a2fJobId)

      if (!a2fResult.animationPath) {
        throw new Error('Audio2Face did not produce animation')
      }

      // 3. Renderizar com Unreal Engine
      logger.info('Starting Unreal Engine rendering', { jobId: job.id })

      const ueJobId = await this.ueClient.renderAnimation({
        animationPath: a2fResult.animationPath,
        quality: 'cinematic',
        resolution: '1920x1080',
        fps: 30
      })

      // Aguardar render
      const ueResult = await this.ueClient.waitForCompletion(ueJobId)

      if (!ueResult.videoUrl) {
        throw new Error('Unreal Engine did not produce video')
      }

      // 4. Fazer upload para storage permanente
      const finalUrl = await this.uploadToStorage(ueResult.videoUrl, job.id)

      // 5. Atualizar job
      await supabase
        .from('render_jobs')
        .update({
          status: 'completed',
          result_url: finalUrl,
          completed_at: new Date().toISOString()
        })
        .eq('id', job.id)

      logger.info('Hyperreal avatar completed', {
        jobId: job.id,
        videoUrl: finalUrl
      })

      return finalUrl

    } catch (error) {
      logger.error('Audio2Face pipeline failed', error as Error)
      throw error
    }
  }

  private async uploadToStorage(
    temporaryUrl: string,
    jobId: string
  ): Promise<string> {
    const supabase = createServerSupabaseClient()

    // Download do vídeo temporário
    const videoResponse = await fetch(temporaryUrl)
    const videoBuffer = await videoResponse.arrayBuffer()

    // Upload para Supabase Storage
    const fileName = `avatars/hyperreal-${jobId}.mp4`
    const { data, error } = await supabase.storage
      .from('videos')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true
      })

    if (error) throw error

    // URL público
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(fileName)

    return publicUrl
  }
}
```

### Dia 29-30: Unreal Engine Integration

**Arquivos:**
- [ ] `/src/lib/services/avatar/unreal-engine-client.ts`
- [ ] `/docker/unreal-render-server/Dockerfile`
- [ ] `/docker/unreal-render-server/server.py`

**Código: unreal-engine-client.ts**
```typescript
import axios, { AxiosInstance } from 'axios'
import { logger } from '@/lib/logger'

export interface UERenderRequest {
  animationPath: string // USD animation file
  quality: 'draft' | 'preview' | 'production' | 'cinematic'
  resolution: '720p' | '1080p' | '4k'
  fps: 24 | 30 | 60
  settings?: {
    rayTracing?: boolean
    antiAliasing?: 'FXAA' | 'TAA' | 'MSAA'
    postProcessing?: boolean
  }
}

export interface UERenderResult {
  jobId: string
  status: 'queued' | 'rendering' | 'completed' | 'failed'
  progress?: number // 0-100
  videoUrl?: string
  error?: string
}

export class UnrealEngineClient {
  private client: AxiosInstance
  private endpoint: string

  constructor() {
    this.endpoint = process.env.UE5_RENDER_SERVER || 'http://localhost:8080'

    this.client = axios.create({
      baseURL: this.endpoint,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.UE5_API_KEY}`
      }
    })
  }

  /**
   * Submete job de renderização
   */
  async renderAnimation(request: UERenderRequest): Promise<string> {
    try {
      const response = await this.client.post('/render', {
        animation_path: request.animationPath,
        quality: request.quality,
        resolution: request.resolution,
        fps: request.fps,
        settings: {
          ray_tracing: request.settings?.rayTracing ?? true,
          anti_aliasing: request.settings?.antiAliasing || 'TAA',
          post_processing: request.settings?.postProcessing ?? true
        }
      })

      return response.data.job_id

    } catch (error) {
      logger.error('Failed to submit UE render job', error as Error)
      throw error
    }
  }

  /**
   * Verifica status e progresso
   */
  async getJobStatus(jobId: string): Promise<UERenderResult> {
    try {
      const response = await this.client.get(`/render/${jobId}/status`)

      return {
        jobId,
        status: response.data.status,
        progress: response.data.progress,
        videoUrl: response.data.video_url,
        error: response.data.error
      }

    } catch (error) {
      logger.error('Failed to get UE job status', error as Error)
      throw error
    }
  }

  /**
   * Aguarda conclusão do render
   */
  async waitForCompletion(
    jobId: string,
    maxWaitTime: number = 1800000, // 30 minutos
    pollInterval: number = 5000
  ): Promise<UERenderResult> {
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getJobStatus(jobId)

      logger.info('UE render progress', {
        jobId,
        progress: status.progress,
        status: status.status
      })

      if (status.status === 'completed') {
        return status
      }

      if (status.status === 'failed') {
        throw new Error(`UE render failed: ${status.error}`)
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    throw new Error('UE render timeout')
  }

  /**
   * Cancela render em progresso
   */
  async cancelRender(jobId: string): Promise<void> {
    try {
      await this.client.post(`/render/${jobId}/cancel`)
    } catch (error) {
      logger.warn('Failed to cancel UE render', { jobId, error })
    }
  }
}
```

**Docker: unreal-render-server/Dockerfile**
```dockerfile
FROM ghcr.io/epicgames/unreal-engine:5.3

# Instalar Python e dependências
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg

# Copiar server
COPY server.py /app/server.py
COPY requirements.txt /app/requirements.txt

WORKDIR /app
RUN pip3 install -r requirements.txt

# Copiar projeto Unreal
COPY AvatarRenderProject /app/AvatarRenderProject

EXPOSE 8080

CMD ["python3", "server.py"]
```

---

## Deliverables Fase 2

**Checklist de Conclusão:**
- [ ] Quality Tier System implementado
- [ ] D-ID integration completa (substituiu mock)
- [ ] D-ID webhooks funcionando
- [ ] ReadyPlayerMe integration funcionando
- [ ] Three.js SSR rendering de GLB models
- [ ] Audio2Face gRPC client
- [ ] Unreal Engine REST client
- [ ] Pipeline completo A2F → UE5
- [ ] Sistema de fallback testado
- [ ] Testes de qualidade para cada tier

**Métricas de Sucesso:**
- ✅ 4 tiers funcionando com fallback automático
- ✅ D-ID: 90% de conclusão em <60s
- ✅ RPM: avatares 3D em <5min
- ✅ A2F+UE5: qualidade cinematográfica em <30min
- ✅ Taxa de fallback <20%
- ✅ Uptime de providers >95%

**Custos Estimados:**
- D-ID: $0.10-0.20 per video
- ReadyPlayerMe: Free tier ou $49/mês
- Audio2Face: Infraestrutura própria ($500/mês)
- Unreal Engine: Licença grátis + server ($800/mês)

---

## Próximas Fases

→ **FASE 3:** Studio Profissional (consolidação de editores)
→ **FASE 4:** Renderização Distribuída (workers paralelos)
→ **FASE 5:** Integrações Premium (AI Director, collaboration)
→ **FASE 6:** Polimento & Produção
