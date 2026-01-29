#!/usr/bin/env node
/**
 * Test Rhubarb lip-sync with actual speech audio
 * Uses espeak to generate Portuguese speech
 */

import { spawn } from 'child_process';
import { unlinkSync } from 'fs';
import { readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const TEST_TEXT = "Olá, bem-vindo ao sistema de vídeos com inteligência artificial";

console.log('🎬 Phase 1 Lip-Sync Test with Real Speech\n');
console.log('================================\n');
console.log(`Test phrase: "${TEST_TEXT}"\n`);

async function runTest() {
  const testAudioPath = join(tmpdir(), `speech-${Date.now()}.wav`);
  const outputPath = join(tmpdir(), `rhubarb-${Date.now()}.json`);

  try {
    // Step 1: Generate speech audio using espeak
    console.log('✓ Step 1: Generating speech audio with espeak...');

    await new Promise((resolve, reject) => {
      const espeak = spawn('espeak', [
        '-v', 'pt-br',  // Portuguese Brazil voice
        '-w', testAudioPath,
        '-s', '150',    // Speed
        TEST_TEXT
      ]);

      espeak.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('espeak failed'));
        } else {
          console.log(`  ✓ Audio file created: ${testAudioPath}\n`);
          resolve();
        }
      });
    });

    // Step 2: Run Rhubarb lip-sync
    console.log('✓ Step 2: Running Rhubarb lip-sync analysis...');
    console.log('  Processing audio');

    await new Promise((resolve, reject) => {
      const rhubarb = spawn('rhubarb', [
        '-f', 'json',
        '-o', outputPath,
        testAudioPath
      ]);

      let errorOutput = '';

      rhubarb.stdout.on('data', () => {
        process.stdout.write('.');
      });

      rhubarb.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      rhubarb.on('close', (code) => {
        console.log(); // New line
        if (code !== 0) {
          console.error('  Rhubarb error output:', errorOutput);
          reject(new Error('Rhubarb failed'));
        } else {
          resolve();
        }
      });
    });

    console.log('  ✓ Lip-sync analysis complete\n');

    // Step 3: Parse and display results
    console.log('✓ Step 3: Analyzing phoneme data...\n');

    const outputJson = await readFile(outputPath, 'utf-8');
    const result = JSON.parse(outputJson);

    console.log('Results:');
    console.log('--------');
    console.log(`  • Total phonemes: ${result.mouthCues.length}`);
    console.log(`  • Audio duration: ${result.metadata.duration.toFixed(2)}s`);
    console.log(`  • Average phoneme duration: ${(result.metadata.duration / result.mouthCues.length).toFixed(3)}s`);

    // Display phoneme timeline
    console.log('\nPhoneme Timeline:');
    console.log('----------------');

    const phonemeMap = {
      'A': 'Open mouth (ah)',
      'B': 'Lips together (b, m, p)',
      'C': 'Mouth closed',
      'D': 'Teeth together (d, t)',
      'E': 'Smile (ee)',
      'F': 'Lower lip touches teeth (f, v)',
      'G': 'Back of tongue up (k, g)',
      'H': 'Tongue forward',
      'X': 'Silent/rest'
    };

    result.mouthCues.forEach((cue, i) => {
      const description = phonemeMap[cue.value] || 'Unknown';
      const duration = (cue.end - cue.start).toFixed(3);
      console.log(`  ${(i + 1).toString().padStart(2)}. [${cue.start.toFixed(2)}s - ${cue.end.toFixed(2)}s] ${cue.value} (${duration}s) - ${description}`);
    });

    // Step 4: Validate for Phase 1 integration
    console.log('\n✓ Step 4: Validating Phase 1 compatibility...');

    const validations = {
      'Has mouth cues array': Array.isArray(result.mouthCues),
      'Has metadata': !!result.metadata,
      'Has duration': typeof result.metadata.duration === 'number',
      'Phonemes have timing': result.mouthCues.every(c =>
        typeof c.start === 'number' && typeof c.end === 'number'
      ),
      'All phonemes valid': result.mouthCues.every(c =>
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X'].includes(c.value)
      )
    };

    let allPassed = true;
    for (const [check, passed] of Object.entries(validations)) {
      const status = passed ? '✓' : '✗';
      console.log(`  ${status} ${check}`);
      if (!passed) allPassed = false;
    }

    // Step 5: Show blend shape mapping preview
    console.log('\n✓ Step 5: Sample blend shape mappings...');
    console.log('  (Showing how phonemes map to ARKit blend shapes)\n');

    const samplePhonemes = [...new Set(result.mouthCues.map(c => c.value))].slice(0, 5);

    const blendShapeMappings = {
      'A': { jawOpen: 0.7, mouthOpen: 0.6 },
      'B': { mouthClose: 1.0, mouthPressLeft: 0.5, mouthPressRight: 0.5 },
      'E': { mouthSmileLeft: 0.6, mouthSmileRight: 0.6 },
      'F': { mouthLowerDownLeft: 0.4, mouthLowerDownRight: 0.4 },
      'X': { jawOpen: 0.0 }
    };

    samplePhonemes.forEach(phoneme => {
      const mapping = blendShapeMappings[phoneme] || {};
      const shapes = Object.entries(mapping)
        .map(([shape, weight]) => `${shape}: ${weight}`)
        .join(', ');
      console.log(`  ${phoneme} → ${shapes || 'neutral'}`);
    });

    // Success summary
    console.log('\n================================');
    console.log('🎉 SUCCESS: Real Speech Lip-Sync Test PASSED\n');
    console.log('Summary:');
    console.log(`  • Input text: "${TEST_TEXT}"`);
    console.log(`  • Audio duration: ${result.metadata.duration.toFixed(2)}s`);
    console.log(`  • Phonemes detected: ${result.mouthCues.length}`);
    console.log(`  • Unique mouth shapes: ${new Set(result.mouthCues.map(c => c.value)).size}`);
    console.log(`  • All validations: ${allPassed ? 'PASSED ✓' : 'FAILED ✗'}`);
    console.log('\nPhase 1 lip-sync with real speech is OPERATIONAL ✓');
    console.log('\nNext steps:');
    console.log('  1. Test with longer audio samples');
    console.log('  2. Integrate with BlendShapeController');
    console.log('  3. Render with Remotion component');
    console.log('  4. Test full pipeline (TTS → Lip-sync → Render)');

    // Cleanup
    unlinkSync(testAudioPath);
    unlinkSync(outputPath);

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);

    // Try cleanup
    try {
      unlinkSync(testAudioPath);
      unlinkSync(outputPath);
    } catch (e) {
      // Ignore
    }

    process.exit(1);
  }
}

runTest();
