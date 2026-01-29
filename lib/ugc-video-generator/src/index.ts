/**
 * 🎬 UGC Video Generator - Entry Point
 */

export { ScriptParser, scriptParser, type ParsedScript, type ScriptScene } from './core/script-parser';
export { TTSService, ttsService, BRAZILIAN_VOICES, RECOMMENDED_VOICES, type TTSResult, type TTSOptions } from './services/tts-service';
export * from './types';

// ============================================
// QUICK START FUNCTIONS
// ============================================

import { scriptParser } from './core/script-parser';
import { ttsService } from './services/tts-service';
import path from 'path';
import fs from 'fs-extra';

/**
 * Parse e gera áudio para um script em um único passo
 */
export async function processScript(
  scriptPath: string,
  options?: {
    voice?: string;
    outputDir?: string;
  }
): Promise<{
  script: import('./core/script-parser').ParsedScript;
  audioResults: Map<string, import('./services/tts-service').TTSResult>;
}> {
  // Parse do script
  const script = await scriptParser.parseFile(scriptPath);
  
  // Validar
  const validation = scriptParser.validate(script);
  if (!validation.valid) {
    throw new Error(`Script inválido: ${validation.errors.join(', ')}`);
  }

  // Configurar diretório de saída
  const outputDir = options?.outputDir || './temp/audio';
  await fs.ensureDir(outputDir);

  // Gerar áudios
  const audioResults = new Map<string, import('./services/tts-service').TTSResult>();
  
  for (const scene of script.scenes) {
    const result = await ttsService.generateAudio({
      text: scene.text,
      voice: options?.voice,
      outputPath: path.join(outputDir, `${scene.id}.mp3`),
    });
    
    audioResults.set(scene.id, result);
    
    // Atualizar duração real da cena
    if (result.success) {
      scene.audioPath = result.audioPath;
      scene.actualDuration = result.duration;
    }
  }

  return { script, audioResults };
}

/**
 * Verificar dependências do sistema
 */
export async function checkDependencies(): Promise<{
  edgeTTS: boolean;
  ffmpeg: boolean;
  ffprobe: boolean;
}> {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  const check = async (cmd: string): Promise<boolean> => {
    try {
      await execAsync(cmd);
      return true;
    } catch {
      return false;
    }
  };

  return {
    edgeTTS: await check('edge-tts --version'),
    ffmpeg: await check('ffmpeg -version'),
    ffprobe: await check('ffprobe -version'),
  };
}
