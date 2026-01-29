
export interface Phoneme {
  time: number        // Tempo em segundos
  duration: number    // Duração em segundos
  phoneme: string     // Phonema Rhubarb (A-H, X)
  viseme: string      // Viseme 3D correspondente
  intensity: number   // Intensidade 0-1
}

export interface LipSyncResult {
  visemes: any[] // Adicionado para compatibilidade com Audio2FaceEngine
  phonemes?: Phoneme[] // Opcional se usar visemes diretos
  duration: number
  fps?: number
  metadata: {
    provider?: string // Adicionado
    model?: string // Adicionado
    processingTime?: number // Adicionado
    confidence?: number // Adicionado
    blendShapeCount?: number // Adicionado
    frameCount?: number // Adicionado
    mouthCueCount?: number // Opcional
    recognizer?: string // Opcional
    dialog?: string
    [key: string]: unknown; // Allow additional metadata properties
  }
}
