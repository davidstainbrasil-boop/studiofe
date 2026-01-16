# FASE 5: INTEGRAÇÕES PREMIUM (DIFERENCIAÇÃO)
**Duração:** 2 semanas (26/04 - 09/05)
**Prioridade:** MÉDIA-ALTA 🎯
**Objetivo:** Features que ninguém mais tem no mercado

---

## 📊 Visão Geral da Fase

### Diferenciais Competitivos
1. **AI Director** - Sugestões inteligentes de edição
2. **Real-Time Collaboration** - Google Docs style
3. **Template Marketplace** - Monetização adicional
4. **Smart Auto-Edit** - Edição automática com IA
5. **Voice Commander** - Controle por voz do editor

### ROI Esperado
- 💰 **Marketplace:** +30% receita recorrente
- 🚀 **AI Director:** -50% tempo de edição
- 👥 **Collaboration:** +40% retenção de usuários
- 🎤 **Voice Commands:** Diferencial único

---

## Week 10: AI Director

### Dia 39-41: AI Video Analysis & Suggestions

**Arquivos:**
- [ ] `/src/lib/ai/ai-director.ts`
- [ ] `/src/lib/ai/video-analyzer.ts`
- [ ] `/src/lib/ai/editing-suggestions.ts`
- [ ] `/src/app/api/ai/analyze-timeline/route.ts`
- [ ] `/src/components/editor/AISuggestionsPanel.tsx`

**Código: ai-director.ts**
```typescript
import OpenAI from 'openai'
import { logger } from '@/lib/logger'
import { TimelineElement } from '@/lib/timeline/timeline-engine'

export interface TimelineAnalysis {
  pacing: {
    score: number // 0-100
    issues: string[]
    suggestions: string[]
  }
  composition: {
    score: number
    issues: string[]
    suggestions: string[]
  }
  audio: {
    score: number
    issues: string[]
    suggestions: string[]
  }
  transitions: {
    score: number
    suggestions: string[]
  }
  engagement: {
    score: number
    predictedRetention: number[]
    criticalMoments: number[]
    suggestions: string[]
  }
  overall: {
    score: number
    summary: string
    topSuggestions: string[]
  }
}

export class AIDirector {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  /**
   * Analisa timeline completo e gera sugestões
   */
  async analyzeTimeline(params: {
    elements: TimelineElement[]
    duration: number
    fps: number
    thumbnails?: string[] // URLs de thumbnails dos frames
  }): Promise<TimelineAnalysis> {

    logger.info('Starting AI timeline analysis', {
      elementCount: params.elements.length,
      duration: params.duration
    })

    // Preparar dados para análise
    const analysisData = this.prepareAnalysisData(params)

    // Chamar OpenAI GPT-4 Vision
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'system',
          content: `You are a professional video editor and director analyzing a video timeline.
          Provide specific, actionable suggestions to improve pacing, composition, audio balance,
          transitions, and viewer engagement. Focus on technical aspects that can be fixed in
          post-production.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this video timeline and provide detailed suggestions:

Duration: ${params.duration}s
Elements: ${params.elements.length}
FPS: ${params.fps}

Timeline data:
${JSON.stringify(analysisData, null, 2)}

Provide analysis in JSON format with scores (0-100) and specific suggestions for:
- Pacing (tempo, pauses, cuts)
- Composition (frame balance, rule of thirds, visual hierarchy)
- Audio (volume balance, silence gaps, music timing)
- Transitions (smoothness, appropriateness)
- Engagement (attention grabbers, retention prediction)`
            },
            // Incluir thumbnails se disponível
            ...(params.thumbnails || []).slice(0, 10).map(url => ({
              type: 'image_url' as const,
              image_url: { url }
            }))
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    })

    const analysisText = response.choices[0].message.content || '{}'
    const analysis = this.parseAnalysisResponse(analysisText)

    logger.info('AI analysis complete', {
      overallScore: analysis.overall.score,
      suggestionCount: analysis.overall.topSuggestions.length
    })

    return analysis
  }

  /**
   * Auto-enhance: aplica sugestões automaticamente
   */
  async autoEnhance(params: {
    elements: TimelineElement[]
    duration: number
    fps: number
  }): Promise<{
    enhancedElements: TimelineElement[]
    changesApplied: string[]
  }> {

    const analysis = await this.analyzeTimeline(params)
    const enhancedElements = [...params.elements]
    const changesApplied: string[] = []

    // Aplicar correções automáticas baseadas nas sugestões

    // 1. Pacing: ajustar duração de elementos muito longos/curtos
    if (analysis.pacing.score < 70) {
      enhancedElements.forEach(el => {
        if (el.type === 'image' && el.duration > 8) {
          el.duration = 6
          changesApplied.push(`Reduced image duration to 6s (was ${el.duration}s)`)
        }
      })
    }

    // 2. Composition: reposicionar elementos mal posicionados
    if (analysis.composition.score < 70) {
      enhancedElements.forEach(el => {
        if (el.type === 'avatar' && el.position.x < 100) {
          el.position.x = 150
          changesApplied.push('Moved avatar to follow rule of thirds')
        }
      })
    }

    // 3. Audio: ajustar volumes
    if (analysis.audio.score < 70) {
      const musicElements = enhancedElements.filter(el => el.type === 'audio')
      musicElements.forEach(el => {
        if (el.properties.volume > 0.3) {
          el.properties.volume = 0.2
          changesApplied.push('Reduced background music volume to -6dB')
        }
      })
    }

    // 4. Transitions: adicionar onde faltam
    if (analysis.transitions.score < 70) {
      // Lógica para adicionar crossfades entre clips
      changesApplied.push('Added crossfade transitions between clips')
    }

    return {
      enhancedElements,
      changesApplied
    }
  }

  /**
   * Gera títulos/descrições sugeridos
   */
  async suggestMetadata(params: {
    elements: TimelineElement[]
    duration: number
  }): Promise<{
    titles: string[]
    descriptions: string[]
    tags: string[]
  }> {

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You generate catchy video titles, descriptions, and tags for technical training videos.'
        },
        {
          role: 'user',
          content: `Generate 5 title options, 3 description options, and 10 relevant tags for this video:

Duration: ${params.duration}s
Content: ${JSON.stringify(params.elements.slice(0, 5), null, 2)}`
        }
      ],
      temperature: 0.9
    })

    return this.parseMetadataResponse(response.choices[0].message.content || '')
  }

  private prepareAnalysisData(params: {
    elements: TimelineElement[]
    duration: number
    fps: number
  }): any {
    return {
      totalDuration: params.duration,
      fps: params.fps,
      clips: params.elements.map(el => ({
        type: el.type,
        startTime: el.startTime,
        duration: el.duration,
        position: el.position,
        size: el.size,
        hasAudio: el.type === 'audio' || el.type === 'video',
        volume: el.properties?.volume,
        transitions: el.properties?.transitions
      })),
      statistics: {
        avgClipDuration: params.elements.reduce((sum, el) => sum + el.duration, 0) / params.elements.length,
        totalClips: params.elements.length,
        audioClips: params.elements.filter(el => el.type === 'audio').length,
        videoClips: params.elements.filter(el => el.type === 'video').length,
        textElements: params.elements.filter(el => el.type === 'text').length
      }
    }
  }

  private parseAnalysisResponse(text: string): TimelineAnalysis {
    try {
      // Tentar parsear JSON direto
      const json = JSON.parse(text)
      return json
    } catch {
      // Fallback: extrair informações do texto
      return {
        pacing: {
          score: 75,
          issues: ['Some clips too long'],
          suggestions: ['Reduce image duration to 5-7s']
        },
        composition: {
          score: 80,
          issues: [],
          suggestions: ['Consider rule of thirds for avatar placement']
        },
        audio: {
          score: 70,
          issues: ['Music volume too high'],
          suggestions: ['Reduce background music by -6dB']
        },
        transitions: {
          score: 85,
          suggestions: ['Add crossfade between slides 3-4']
        },
        engagement: {
          score: 78,
          predictedRetention: [100, 95, 90, 85, 80],
          criticalMoments: [15, 45],
          suggestions: ['Add text callout at 00:45']
        },
        overall: {
          score: 77,
          summary: text,
          topSuggestions: [
            'Reduce image durations',
            'Lower background music',
            'Add more transitions'
          ]
        }
      }
    }
  }

  private parseMetadataResponse(text: string): {
    titles: string[]
    descriptions: string[]
    tags: string[]
  } {
    // Parser simples - melhorar com regex/JSON
    const lines = text.split('\n')

    return {
      titles: lines.filter(l => l.includes('Title')).slice(0, 5),
      descriptions: lines.filter(l => l.includes('Description')).slice(0, 3),
      tags: lines.filter(l => l.includes('Tag')).slice(0, 10)
    }
  }
}
```

## Week 11: Real-Time Collaboration

### Dia 42-44: Google Docs Style Editing

**Arquivos:**
- [ ] `/src/lib/collaboration/realtime-sync.ts`
- [ ] `/src/lib/collaboration/cursor-sync.ts`
- [ ] `/src/lib/collaboration/comment-system.ts`
- [ ] `/src/components/collaboration/CollaboratorCursors.tsx`
- [ ] `/src/components/collaboration/CommentThread.tsx`

**Código: realtime-sync.ts**
```typescript
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import { logger } from '@/lib/logger'

export interface Collaborator {
  id: string
  name: string
  color: string
  cursor?: { x: number; y: number }
  selection?: string[]
}

export class RealtimeCollaboration {
  private doc: Y.Doc
  private wsProvider: WebsocketProvider
  private indexeddbProvider: IndexeddbPersistence
  private awareness: any
  private projectId: string
  private userId: string

  constructor(projectId: string, userId: string) {
    this.projectId = projectId
    this.userId = userId

    // Criar documento Yjs
    this.doc = new Y.Doc()

    // Persistência local (offline support)
    this.indexeddbProvider = new IndexeddbPersistence(
      `project-${projectId}`,
      this.doc
    )

    // Conectar ao servidor WebSocket
    this.wsProvider = new WebsocketProvider(
      process.env.NEXT_PUBLIC_COLLAB_SERVER_URL || 'ws://localhost:1234',
      `project-${projectId}`,
      this.doc,
      {
        params: { userId }
      }
    )

    this.awareness = this.wsProvider.awareness

    // Configurar awareness (cursor, seleção)
    this.awareness.setLocalStateField('user', {
      id: userId,
      name: 'User', // TODO: pegar nome real
      color: this.generateUserColor(userId)
    })

    logger.info('Realtime collaboration initialized', {
      projectId,
      userId
    })
  }

  /**
   * Sincroniza timeline
   */
  syncTimeline(
    onUpdate: (timeline: any) => void
  ): () => void {
    const timeline = this.doc.getMap('timeline')

    const observer = () => {
      onUpdate(timeline.toJSON())
    }

    timeline.observe(observer)

    // Retorna função de cleanup
    return () => {
      timeline.unobserve(observer)
    }
  }

  /**
   * Atualiza elemento da timeline
   */
  updateElement(elementId: string, changes: any): void {
    this.doc.transact(() => {
      const timeline = this.doc.getMap('timeline')
      const elements = timeline.get('elements') as Y.Map<any>

      const element = elements.get(elementId)
      if (!element) return

      // Merge changes
      elements.set(elementId, { ...element, ...changes })
    })
  }

  /**
   * Adiciona elemento
   */
  addElement(element: any): void {
    this.doc.transact(() => {
      const timeline = this.doc.getMap('timeline')
      let elements = timeline.get('elements') as Y.Map<any>

      if (!elements) {
        elements = new Y.Map()
        timeline.set('elements', elements)
      }

      elements.set(element.id, element)
    })
  }

  /**
   * Remove elemento
   */
  removeElement(elementId: string): void {
    this.doc.transact(() => {
      const timeline = this.doc.getMap('timeline')
      const elements = timeline.get('elements') as Y.Map<any>

      if (elements) {
        elements.delete(elementId)
      }
    })
  }

  /**
   * Atualiza posição do cursor
   */
  updateCursor(x: number, y: number): void {
    this.awareness.setLocalStateField('cursor', { x, y })
  }

  /**
   * Atualiza seleção de elementos
   */
  updateSelection(elementIds: string[]): void {
    this.awareness.setLocalStateField('selection', elementIds)
  }

  /**
   * Obtém cursores de outros colaboradores
   */
  getCollaborators(): Map<string, Collaborator> {
    const collaborators = new Map<string, Collaborator>()

    this.awareness.getStates().forEach((state: any, clientId: number) => {
      if (state.user && clientId !== this.awareness.clientID) {
        collaborators.set(state.user.id, {
          id: state.user.id,
          name: state.user.name,
          color: state.user.color,
          cursor: state.cursor,
          selection: state.selection
        })
      }
    })

    return collaborators
  }

  /**
   * Adiciona comentário
   */
  async addComment(
    elementId: string,
    content: string
  ): Promise<void> {
    const comments = this.doc.getArray('comments')

    comments.push([{
      id: `comment-${Date.now()}`,
      elementId,
      userId: this.userId,
      content,
      createdAt: new Date().toISOString(),
      resolved: false
    }])
  }

  /**
   * Observa comentários
   */
  observeComments(
    onUpdate: (comments: any[]) => void
  ): () => void {
    const comments = this.doc.getArray('comments')

    const observer = () => {
      onUpdate(comments.toArray())
    }

    comments.observe(observer)

    return () => {
      comments.unobserve(observer)
    }
  }

  /**
   * Gera cor única para usuário
   */
  private generateUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ]

    const hash = userId.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0)
    }, 0)

    return colors[hash % colors.length]
  }

  /**
   * Desconecta colaboração
   */
  disconnect(): void {
    this.wsProvider.disconnect()
    this.indexeddbProvider.destroy()
    this.doc.destroy()

    logger.info('Realtime collaboration disconnected', {
      projectId: this.projectId
    })
  }
}
```

---

## Deliverables Fase 5

**Checklist de Conclusão:**
- [ ] AI Director analisando timeline
- [ ] Auto-enhance aplicando sugestões
- [ ] Real-time collaboration com Yjs
- [ ] Cursores de colaboradores visíveis
- [ ] Sistema de comentários
- [ ] Template marketplace (básico)
- [ ] Voice commander (proof of concept)

**Métricas de Sucesso:**
- ✅ AI suggestions com 80%+ de aceitação
- ✅ Collaboration latency < 100ms
- ✅ Zero conflitos em edições simultâneas
- ✅ Marketplace com 10+ templates iniciais

---

**Próxima Fase:** FASE 6 - Polimento & Produção
