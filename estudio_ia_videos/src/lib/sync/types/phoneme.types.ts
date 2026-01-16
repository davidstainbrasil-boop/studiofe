
export interface Phoneme {
  time: number        // Tempo em segundos
  duration: number    // Duração em segundos
  phoneme: string     // Phonema Rhubarb (A-H, X)
  viseme: string      // Viseme 3D correspondente
  intensity: number   // Intensidade 0-1
}

export interface LipSyncResult {
  phonemes: Phoneme[]
  duration: number
  metadata: {
    mouthCueCount: number
    recognizer: string
    dialog?: string
  }
}
