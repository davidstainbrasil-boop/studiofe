
/**
 * Representa uma única cena no roteiro de vídeo.
 * Cada cena corresponde tipicamente a um slide ou a uma parte de um slide.
 */
export interface Scene {
  sceneNumber: number;
  /** O texto principal que será narrado durante esta cena. */
  narration: string;
  /** O texto que apareceu como título no slide. */
  title?: string;
  /** O texto que apareceu como corpo principal no slide. */
  body?: string;
  /** Notas do apresentador associadas ao slide, que podem guiar a narração. */
  speakerNotes?: string;
  /** Imagens ou outros recursos visuais associados a esta cena. */
  visuals?: { type: 'image' | 'video'; storagePath: string }[];
}

/**
 * Representa o roteiro completo de um vídeo, composto por uma sequência de cenas.
 */
export interface Script {
  projectId: string;
  title: string;
  scenes: Scene[];
  metadata: {
    totalScenes: number;
    estimatedDurationSeconds?: number; // A ser calculado posteriormente
    createdAt: string;
  };
}
