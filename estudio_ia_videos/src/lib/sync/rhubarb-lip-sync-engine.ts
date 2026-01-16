import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import { logger } from '@/lib/logger'
import { Phoneme, LipSyncResult } from './types/phoneme.types'

const execAsync = promisify(exec)

export class RhubarbLipSyncEngine {
  private tempDir = '/tmp/rhubarb'
  // Adjusted path to where we moved the binary
  private rhubarbPath = '/root/rhubarb/bin/rhubarb'

  constructor() {
    this.ensureTempDir()
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true })
    } catch (error) {
      logger.error('Failed to create temp directory', error as Error)
    }
  }

  /**
   * Gera phonemas a partir de arquivo de áudio
   */
  async generatePhonemes(
    audioPath: string,
    dialogText?: string
  ): Promise<LipSyncResult> {
    try {
      const outputPath = path.join(this.tempDir, `${Date.now()}.json`)

      // Construir comando Rhubarb
      let command = `${this.rhubarbPath} -f json -o ${outputPath}`

      // Adicionar diálogo se fornecido (melhora precisão)
      if (dialogText) {
        const dialogFile = path.join(this.tempDir, `${Date.now()}.txt`)
        await fs.writeFile(dialogFile, dialogText, 'utf-8')
        command += ` --dialogFile ${dialogFile}`
      }

      command += ` ${audioPath}`

      logger.info('Running Rhubarb Lip-Sync', { command })

      // Executar Rhubarb
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000 // 60 segundos timeout
      })

      if (stderr) {
        logger.warn('Rhubarb stderr output', { stderr })
      }

      // Ler resultado
      const resultJson = await fs.readFile(outputPath, 'utf-8')
      const result = JSON.parse(resultJson)

      // Converter para nosso formato
      const phonemes = this.convertRhubarbToPhonemes(result.mouthCues)

      // Limpar arquivos temporários
      await fs.unlink(outputPath).catch(() => {})
      if (dialogText) {
        await fs.unlink(path.join(this.tempDir, `${Date.now()}.txt`)).catch(() => {})
      }

      return {
        phonemes,
        duration: result.metadata.duration,
        metadata: {
          mouthCueCount: result.mouthCues.length,
          recognizer: result.metadata.soundFile,
          dialog: dialogText
        }
      }
    } catch (error) {
      logger.error('Failed to generate phonemes with Rhubarb', error as Error)
      throw new Error(`Rhubarb lip-sync failed: ${(error as Error).message}`)
    }
  }

  /**
   * Converte output Rhubarb para phonemas com visemes
   */
  private convertRhubarbToPhonemes(mouthCues: any[]): Phoneme[] {
    const phonemes: Phoneme[] = []

    for (let i = 0; i < mouthCues.length; i++) {
      const cue = mouthCues[i]
      const nextCue = mouthCues[i + 1]

      const time = cue.start
      const duration = nextCue ? nextCue.start - cue.start : 0.1
      const rhubarbShape = cue.value

      phonemes.push({
        time,
        duration,
        phoneme: rhubarbShape,
        viseme: this.mapRhubarbToViseme(rhubarbShape),
        intensity: this.calculateIntensity(rhubarbShape)
      })
    }

    return phonemes
  }

  /**
   * Mapeia shapes do Rhubarb para visemes 3D (ARKit compatível)
   */
  private mapRhubarbToViseme(rhubarbShape: string): string {
    const mapping: Record<string, string> = {
      'A': 'aa',        // Open mouth (father, palm)
      'B': 'PP',        // Lips together (people, maybe)
      'C': 'E',         // Slightly open (see, feet)
      'D': 'aa',        // Open (day, made)
      'E': 'O',         // Rounded (though, show)
      'F': 'U',         // Very rounded (you, new)
      'G': 'FF',        // Upper teeth on lower lip (off, photo)
      'H': 'TH',        // Tongue between teeth (think, bath)
      'X': 'sil'        // Silence
    }

    return mapping[rhubarbShape] || 'sil'
  }

  /**
   * Calcula intensidade baseada no tipo de phonema
   */
  private calculateIntensity(rhubarbShape: string): number {
    const intensityMap: Record<string, number> = {
      'A': 1.0,    // Totalmente aberto
      'B': 0.3,    // Lábios fechados
      'C': 0.5,    // Levemente aberto
      'D': 0.8,    // Bem aberto
      'E': 0.7,    // Arredondado
      'F': 0.6,    // Muito arredondado
      'G': 0.4,    // Dentes no lábio
      'H': 0.5,    // Língua entre dentes
      'X': 0.0     // Silêncio
    }

    return intensityMap[rhubarbShape] || 0.5
  }

  /**
   * Pré-processa áudio para melhor qualidade de análise
   */
  async preprocessAudio(inputPath: string): Promise<string> {
    const outputPath = path.join(this.tempDir, `preprocessed-${Date.now()}.wav`)

    // Normalizar áudio: 16kHz, mono, 16-bit PCM
    const command = `ffmpeg -i ${inputPath} -ar 16000 -ac 1 -sample_fmt s16 ${outputPath}`

    await execAsync(command)

    return outputPath
  }
}
