#!/usr/bin/env tsx
/**
 * Validate TTS Dependencies
 * Verifica se os providers TTS estão configurados e disponíveis
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ValidationResult {
  name: string;
  available: boolean;
  error?: string;
  version?: string;
}

async function checkCommand(command: string): Promise<{ available: boolean; version?: string; error?: string }> {
  try {
    const { stdout } = await execAsync(command);
    return { available: true, version: stdout.trim() };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkEdgeTTS(): Promise<ValidationResult> {
  const result = await checkCommand('edge-tts --version');
  return {
    name: 'edge-tts (Free)',
    available: result.available,
    version: result.version,
    error: result.error,
  };
}

async function checkElevenLabs(): Promise<ValidationResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    return {
      name: 'ElevenLabs (Premium)',
      available: false,
      error: 'ELEVENLABS_API_KEY not configured',
    };
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': apiKey },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        name: 'ElevenLabs (Premium)',
        available: true,
        version: `API OK - User: ${data.subscription?.tier || 'unknown'}`,
      };
    }

    return {
      name: 'ElevenLabs (Premium)',
      available: false,
      error: `API error: ${response.status}`,
    };
  } catch (error) {
    return {
      name: 'ElevenLabs (Premium)',
      available: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkAzure(): Promise<ValidationResult> {
  const apiKey = process.env.AZURE_TTS_KEY || process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_TTS_REGION || process.env.AZURE_SPEECH_REGION;

  if (!apiKey || !region) {
    return {
      name: 'Azure TTS (Premium)',
      available: false,
      error: 'Azure credentials not configured',
    };
  }

  try {
    const response = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    });

    if (response.ok) {
      return {
        name: 'Azure TTS (Premium)',
        available: true,
        version: `Region: ${region}`,
      };
    }

    return {
      name: 'Azure TTS (Premium)',
      available: false,
      error: `API error: ${response.status}`,
    };
  } catch (error) {
    return {
      name: 'Azure TTS (Premium)',
      available: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkFFmpeg(): Promise<ValidationResult> {
  const result = await checkCommand('ffmpeg -version');
  return {
    name: 'FFmpeg (Required)',
    available: result.available,
    version: result.version?.split('\n')[0],
    error: result.error,
  };
}

async function main() {
  console.log('🔍 Validando dependências TTS...\n');

  const checks = await Promise.all([
    checkEdgeTTS(),
    checkElevenLabs(),
    checkAzure(),
    checkFFmpeg(),
  ]);

  let hasErrors = false;
  let hasAtLeastOneTTS = false;

  for (const check of checks) {
    const icon = check.available ? '✅' : '❌';
    console.log(`${icon} ${check.name}`);
    
    if (check.available) {
      console.log(`   Version: ${check.version}`);
      if (check.name.includes('edge-tts') || check.name.includes('ElevenLabs') || check.name.includes('Azure')) {
        hasAtLeastOneTTS = true;
      }
    } else {
      console.log(`   Error: ${check.error}`);
      if (check.name.includes('FFmpeg')) {
        hasErrors = true;
      }
    }
    console.log('');
  }

  console.log('📊 Resumo:');
  console.log(`   - FFmpeg: ${checks.find(c => c.name.includes('FFmpeg'))?.available ? 'OK' : 'MISSING (CRITICAL!)'}`);
  console.log(`   - TTS Providers: ${hasAtLeastOneTTS ? 'OK (at least one available)' : 'NONE AVAILABLE'}`);
  console.log('');

  if (hasErrors) {
    console.error('❌ CRITICAL: FFmpeg is required but not found!');
    console.error('   Install: apt-get install ffmpeg (Ubuntu/Debian)');
    process.exit(1);
  }

  if (!hasAtLeastOneTTS) {
    console.error('⚠️  WARNING: No TTS provider available!');
    console.error('   Install edge-tts: pip install edge-tts');
    console.error('   Or configure: ELEVENLABS_API_KEY or AZURE_TTS_KEY');
    process.exit(1);
  }

  console.log('✅ All dependencies OK!\n');
  console.log('💡 Provider priority:');
  console.log(`   1. ${process.env.TTS_PROVIDER || 'edge-tts'} (from TTS_PROVIDER env)`);
  console.log('   2. edge-tts (fallback if primary fails)');
}

main().catch(console.error);
