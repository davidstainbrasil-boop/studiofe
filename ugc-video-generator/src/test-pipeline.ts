/**
 * 🧪 Teste do TTS + Parser
 * Executa o fluxo completo de parse e geração de áudio
 */

import { scriptParser } from './core/script-parser.js';
import { ttsService, RECOMMENDED_VOICES } from './services/tts-service.js';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🎬 UGC Video Generator - Teste Funcional\n');

  // 1. Verificar dependências
  console.log('📋 Verificando dependências...');
  
  const edgeTTSInstalled = await ttsService.checkInstallation();
  console.log(`  edge-tts: ${edgeTTSInstalled ? '✅ Instalado' : '❌ NÃO instalado'}`);
  
  if (!edgeTTSInstalled) {
    console.log('\n⚠️  edge-tts não está instalado.');
    console.log('   Instale com: pip install edge-tts');
    console.log('   Ou: pip3 install edge-tts');
    console.log('\n   Continuando apenas com o parse do script...\n');
  }

  // 2. Parse do script de exemplo
  console.log('\n📝 Parsing do script de exemplo...');
  
  const scriptPath = path.join(__dirname, '../input/scripts/smartwatch-exemplo.md');
  
  if (!await fs.pathExists(scriptPath)) {
    console.error(`❌ Script não encontrado: ${scriptPath}`);
    process.exit(1);
  }

  const script = await scriptParser.parseFile(scriptPath);
  
  console.log(`\n  Título: ${script.title}`);
  console.log(`  Cenas: ${script.scenes.length}`);
  console.log(`  Duração estimada: ${script.totalDuration}s`);
  console.log(`  Voz configurada: ${script.metadata.voice}`);

  // 3. Validação
  console.log('\n✅ Validação do script...');
  const validation = scriptParser.validate(script);
  
  if (validation.valid) {
    console.log('  Script válido!');
  } else {
    console.log('  Erros encontrados:');
    validation.errors.forEach(e => console.log(`    - ${e}`));
  }

  // 4. Mostrar cenas
  console.log('\n🎬 Cenas do script:');
  console.log('─'.repeat(60));
  
  for (const scene of script.scenes) {
    console.log(`\n  [${scene.id}] ${scene.type.toUpperCase()} (${scene.duration}s)`);
    console.log(`  Texto: "${scene.text.substring(0, 80)}..."`);
    if (scene.productImage) {
      console.log(`  Imagem: ${scene.productImage}`);
    }
  }

  // 5. Gerar áudios (se edge-tts instalado)
  if (edgeTTSInstalled) {
    console.log('\n\n🎙️ Gerando áudios TTS...');
    console.log('─'.repeat(60));
    
    const outputDir = path.join(__dirname, '../output/audio');
    await fs.ensureDir(outputDir);
    
    let totalDuration = 0;
    let successCount = 0;

    for (const scene of script.scenes) {
      console.log(`\n  Processando ${scene.id}...`);
      
      const result = await ttsService.generateAudio({
        text: scene.text,
        voice: script.metadata.voice || RECOMMENDED_VOICES.female_energetic,
        outputPath: path.join(outputDir, `${scene.id}.mp3`),
      });

      if (result.success) {
        console.log(`  ✅ ${result.audioPath} (${result.duration.toFixed(2)}s)`);
        totalDuration += result.duration;
        successCount++;
      } else {
        console.log(`  ❌ Erro: ${result.error}`);
      }
    }

    // Resumo
    console.log('\n\n📊 Resumo da Geração:');
    console.log('─'.repeat(60));
    console.log(`  Áudios gerados: ${successCount}/${script.scenes.length}`);
    console.log(`  Duração total real: ${totalDuration.toFixed(2)}s`);
    console.log(`  Diretório: ${outputDir}`);
    
    if (successCount === script.scenes.length) {
      console.log('\n🎉 SUCESSO! Todos os áudios foram gerados.');
      console.log('   Próximo passo: Implementar geração de frames e renderização.\n');
    }
  }

  console.log('\n✨ Teste concluído!\n');
}

// Executar
main().catch(console.error);
