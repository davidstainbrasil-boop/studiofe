#!/usr/bin/env node

/**
 * Test Azure Speech SDK Connection
 * Verifica se as credenciais Azure estão corretas e funcionais
 */

const sdk = require('microsoft-cognitiveservices-speech-sdk');
require('dotenv').config({ path: '../estudio_ia_videos/.env.local' });

const AZURE_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_REGION = process.env.AZURE_SPEECH_REGION;

console.log('🔍 Testing Azure Speech SDK Connection...\n');

console.log('Configuration:');
console.log('  Region:', AZURE_REGION);
console.log('  Key:', AZURE_KEY ? `${AZURE_KEY.substring(0, 8)}...` : 'NOT SET');
console.log('');

if (!AZURE_KEY || !AZURE_REGION) {
  console.error('❌ ERROR: Azure credentials not configured!');
  console.error('   Please set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in .env.local');
  process.exit(1);
}

// Test 1: Create Speech Config
console.log('Test 1: Creating Speech Config...');
try {
  const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION);
  console.log('✅ Speech Config created successfully');
} catch (error) {
  console.error('❌ Failed to create Speech Config:', error.message);
  process.exit(1);
}

// Test 2: Simple TTS
console.log('\nTest 2: Testing Text-to-Speech with Visemes...');

const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_KEY, AZURE_REGION);
speechConfig.speechSynthesisVoiceName = 'pt-BR-FranciscaNeural';

// Null audio config (don't play audio)
const audioConfig = sdk.AudioConfig.fromDefaultSpeakerOutput();
const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

const testText = 'Olá mundo, este é um teste de sincronização labial.';
let visemeCount = 0;

console.log(`  Synthesizing: "${testText}"`);

// Listen for viseme events
synthesizer.visemeReceived = (s, e) => {
  visemeCount++;
  if (visemeCount <= 3) {
    console.log(`  ✓ Viseme ${visemeCount}: ID=${e.visemeId}, Offset=${(e.audioOffset / 10000000).toFixed(3)}s`);
  }
};

synthesizer.speakTextAsync(
  testText,
  (result) => {
    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
      console.log(`✅ Synthesis completed!`);
      console.log(`   Audio data: ${result.audioData.byteLength} bytes`);
      console.log(`   Visemes captured: ${visemeCount}`);
      console.log('');

      if (visemeCount > 0) {
        console.log('🎉 SUCCESS! Azure Speech SDK is working correctly!');
        console.log('');
        console.log('Next steps:');
        console.log('  1. Run: cd estudio_ia_videos && npm run dev');
        console.log('  2. Test API: curl -X POST http://localhost:3000/api/lip-sync/generate \\');
        console.log('       -H "Content-Type: application/json" \\');
        console.log('       -d \'{"text":"Olá mundo"}\'');
      } else {
        console.log('⚠️  WARNING: No visemes were captured. This is unexpected.');
      }

      synthesizer.close();
      process.exit(0);
    } else {
      console.error('❌ Synthesis failed:', result.errorDetails);
      synthesizer.close();
      process.exit(1);
    }
  },
  (error) => {
    console.error('❌ Synthesis error:', error);
    synthesizer.close();
    process.exit(1);
  }
);

// Timeout after 30 seconds
setTimeout(() => {
  console.error('❌ Timeout: Synthesis took too long');
  synthesizer.close();
  process.exit(1);
}, 30000);
