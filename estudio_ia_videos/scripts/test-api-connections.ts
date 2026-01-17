/**
 * API Connection Test Script
 * Tests D-ID, HeyGen, and Azure Speech API connections
 * 
 * Run with: npx tsx scripts/test-api-connections.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local explicitly
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function testDID() {
  console.log('\n🎭 Testing D-ID API...');
  
  const apiKey = process.env.DID_API_KEY;
  if (!apiKey) {
    console.log('  ❌ DID_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.d-id.com/credits', {
      headers: {
        'Authorization': `Basic ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('  ✅ D-ID Connected!');
      console.log(`  💰 Credits: ${data.remaining || 'N/A'}`);
      return true;
    } else {
      const error = await response.text();
      console.log(`  ❌ D-ID Error: ${response.status} - ${error}`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ D-ID Connection Error: ${(error as Error).message}`);
    return false;
  }
}

async function testHeyGen() {
  console.log('\n🎬 Testing HeyGen API...');
  
  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) {
    console.log('  ❌ HEYGEN_API_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.heygen.com/v2/user/remaining_quota', {
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('  ✅ HeyGen Connected!');
      console.log(`  💰 Quota: ${JSON.stringify(data.data?.remaining_quota || 'N/A')}`);
      return true;
    } else {
      const error = await response.text();
      console.log(`  ❌ HeyGen Error: ${response.status} - ${error}`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ HeyGen Connection Error: ${(error as Error).message}`);
    return false;
  }
}

async function testAzureSpeech() {
  console.log('\n🎤 Testing Azure Speech API...');
  
  const apiKey = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'brazilsouth';
  
  if (!apiKey) {
    console.log('  ❌ AZURE_SPEECH_KEY not configured');
    return false;
  }

  try {
    // Test by getting voices list
    const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey
      }
    });

    if (response.ok) {
      const voices = await response.json();
      const ptBrVoices = voices.filter((v: any) => v.Locale === 'pt-BR');
      console.log('  ✅ Azure Speech Connected!');
      console.log(`  🎙️ Total voices: ${voices.length}, PT-BR voices: ${ptBrVoices.length}`);
      return true;
    } else {
      const error = await response.text();
      console.log(`  ❌ Azure Speech Error: ${response.status} - ${error}`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Azure Speech Connection Error: ${(error as Error).message}`);
    return false;
  }
}

async function testFFmpeg() {
  console.log('\n🎥 Testing FFmpeg...');
  
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync('ffmpeg -version | head -1');
    console.log(`  ✅ FFmpeg: ${stdout.trim()}`);
    return true;
  } catch (error) {
    console.log(`  ❌ FFmpeg not found: ${(error as Error).message}`);
    return false;
  }
}

async function testRhubarb() {
  console.log('\n👄 Testing Rhubarb Lip-Sync...');
  
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync('/root/rhubarb/bin/rhubarb --version');
    console.log(`  ✅ Rhubarb: ${stdout.trim()}`);
    return true;
  } catch (error) {
    console.log(`  ❌ Rhubarb not found: ${(error as Error).message}`);
    return false;
  }
}

async function main() {
  console.log('================================================');
  console.log('🔌 API Connection Tests');
  console.log('================================================');

  const results = {
    'D-ID': await testDID(),
    'HeyGen': await testHeyGen(),
    'Azure Speech': await testAzureSpeech(),
    'FFmpeg': await testFFmpeg(),
    'Rhubarb': await testRhubarb(),
  };

  console.log('\n================================================');
  console.log('📊 Summary:');
  console.log('================================================');
  
  let allPassed = true;
  for (const [name, passed] of Object.entries(results)) {
    console.log(`  ${passed ? '✅' : '❌'} ${name}`);
    if (!passed) allPassed = false;
  }

  console.log('\n');
  
  if (allPassed) {
    console.log('🎉 All systems operational! Ready for video generation.');
  } else {
    console.log('⚠️ Some services need attention. Check details above.');
  }

  process.exit(allPassed ? 0 : 1);
}

main();
