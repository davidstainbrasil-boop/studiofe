
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { logger } from '@/lib/logger'

const execAsync = promisify(exec)

export class AudioPreprocessor {
  static async preprocess(inputPath: string, outputDir: string): Promise<string> {
    const outputPath = path.join(outputDir, `preprocessed-${Date.now()}.wav`)

    // Normalizar áudio: 16kHz, mono, 16-bit PCM (Required for Rhubarb)
    // -y to overwrite
    const command = `ffmpeg -y -i ${inputPath} -ar 16000 -ac 1 -sample_fmt s16 ${outputPath}`

    try {
        await execAsync(command)
        return outputPath
    } catch (error) {
        logger.error('Audio preprocessing failed', error as Error)
        throw error
    }
  }
}
