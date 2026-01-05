import { OpenAI } from 'openai'

export interface SubtitleItem {
  id: string
  text: string
  startTime: number // seconds
  endTime: number // seconds
}

export class TranscriptionService {
  private static instance: TranscriptionService

  private constructor() {}

  public static getInstance(): TranscriptionService {
    if (!TranscriptionService.instance) {
      TranscriptionService.instance = new TranscriptionService()
    }
    return TranscriptionService.instance
  }

  /**
   * Generates subtitles for a given audio segment.
   * In a full production env, this would call OpenAI Whisper.
   * For this MVP, if we have the script text, we can align it.
   * Or we perform a "Smart Mock" that splits the text based on duration.
   */
  async generateSubtitles(audioUrl: string, duration: number, existingScriptText?: string): Promise<SubtitleItem[]> {
    // 1. If we have real OpenAI Key, we COULD call Whisper here.
    // const apiKey = process.env.OPENAI_API_KEY
    // if (apiKey) { ... }

    // 2. Fallback / MVP: Generate timed subtitles from the script text
    if (existingScriptText) {
      return this.generateFromScript(existingScriptText, duration)
    }

    // 3. Generic Fallback
    return this.generateGenericSubtitles(duration)
  }

  private generateFromScript(text: string, totalDuration: number): SubtitleItem[] {
    // Basic algorithm: Split by sentence/comma and distribute time proportionally
    // This is a heuristic for the MVP to make it look "aligned" without real STT
    
    // Split by sentence endings or roughly 5-10 words
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text]
    const subtitles: SubtitleItem[] = []
    
    const timePerChar = totalDuration / text.length
    let currentTime = 0

    sentences.forEach((sentence, index) => {
      // Clean sentence
      const cleanText = sentence.trim()
      if (!cleanText) return

      // Further split long sentences for readability (max 50 chars roughly)
      const fragments = this.splitLongSentence(cleanText, 50)
      
      fragments.forEach((fragment, fIndex) => {
        const duration = fragment.length * timePerChar
        
        subtitles.push({
          id: `sub-${Date.now()}-${index}-${fIndex}`,
          text: fragment,
          startTime: currentTime,
          endTime: currentTime + duration
        })

        currentTime += duration
      })
    })

    return subtitles
  }

  private splitLongSentence(sentence: string, maxLength: number): string[] {
    if (sentence.length <= maxLength) return [sentence]
    
    const words = sentence.split(' ')
    const parts: string[] = []
    let currentPart = ''

    words.forEach(word => {
      if ((currentPart + word).length > maxLength) {
        parts.push(currentPart.trim())
        currentPart = word + ' '
      } else {
        currentPart += word + ' '
      }
    })
    if (currentPart.trim()) parts.push(currentPart.trim())
    
    return parts
  }

  private generateGenericSubtitles(duration: number): SubtitleItem[] {
    const subtitles: SubtitleItem[] = []
    const segmentDuration = 3 // 3 seconds per subtitle
    const segments = Math.ceil(duration / segmentDuration)
    
    const dummyTexs = [
      "Nesta aula técnica...",
      "Vamos aprender sobre segurança.",
      "O procedimento correto é essencial.",
      "Verifique sempre os equipamentos.",
      "A norma NR-35 especifica que...",
      "O uso do cinto é obrigatório.",
      "Mantenha a atenção total.",
      "Evite riscos desnecessários.",
      "Reporte qualquer anomalia.",
      "A segurança vem em primeiro lugar."
    ]

    for (let i = 0; i < segments; i++) {
        subtitles.push({
            id: `gen-sub-${i}`,
            text: dummyTexs[i % dummyTexs.length],
            startTime: i * segmentDuration,
            endTime: Math.min((i + 1) * segmentDuration, duration)
        })
    }
    
    return subtitles
  }
}
