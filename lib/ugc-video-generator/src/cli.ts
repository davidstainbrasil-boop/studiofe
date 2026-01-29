#!/usr/bin/env node
/**
 * 🎬 UGC Video Generator - CLI
 * Gerador de vídeos UGC para e-commerce
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { scriptParser } from './core/script-parser';
import { ttsService, RECOMMENDED_VOICES, BRAZILIAN_VOICES } from './services/tts-service';
import { VIDEO_PRESETS } from './types';

const VERSION = '1.0.0';

// ============================================
// CLI SETUP
// ============================================

const program = new Command();

program
  .name('ugc-video')
  .description('🎬 Gerador de vídeos UGC para e-commerce')
  .version(VERSION);

// ============================================
// COMANDO: parse - Analisar script
// ============================================

program
  .command('parse <script>')
  .description('Analisar script e mostrar estrutura')
  .option('-v, --verbose', 'Mostrar detalhes completos')
  .action(async (scriptPath: string, options: { verbose?: boolean }) => {
    const spinner = ora('Analisando script...').start();

    try {
      const absolutePath = path.resolve(scriptPath);
      const script = await scriptParser.parseFile(absolutePath);
      const validation = scriptParser.validate(script);

      spinner.succeed('Script analisado!');

      console.log('\n' + chalk.bold.blue('📝 Estrutura do Script'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`  Título: ${chalk.cyan(script.title)}`);
      console.log(`  Cenas: ${chalk.yellow(script.scenes.length)}`);
      console.log(`  Duração estimada: ${chalk.green(script.totalDuration + 's')}`);
      
      if (script.metadata.product) {
        console.log(`  Produto: ${script.metadata.product}`);
      }
      if (script.metadata.voice) {
        console.log(`  Voz: ${script.metadata.voice}`);
      }

      console.log('\n' + chalk.bold.blue('🎬 Cenas'));
      console.log(chalk.gray('─'.repeat(50)));

      for (const scene of script.scenes) {
        const typeColor = {
          intro: chalk.magenta,
          product: chalk.blue,
          feature: chalk.cyan,
          cta: chalk.green,
          outro: chalk.gray,
        }[scene.type] || chalk.white;

        console.log(`  ${chalk.yellow(scene.id)} [${typeColor(scene.type)}] (${scene.duration}s)`);
        
        if (options.verbose) {
          console.log(chalk.gray(`    "${scene.text}"`));
          if (scene.productImage) {
            console.log(chalk.gray(`    📷 ${scene.productImage}`));
          }
        } else {
          console.log(chalk.gray(`    "${scene.text.substring(0, 60)}..."`));
        }
      }

      // Validação
      console.log('\n' + chalk.bold.blue('✅ Validação'));
      console.log(chalk.gray('─'.repeat(50)));
      
      if (validation.valid) {
        console.log(chalk.green('  ✓ Script válido e pronto para renderização'));
      } else {
        for (const error of validation.errors) {
          console.log(chalk.red(`  ✗ ${error}`));
        }
      }

    } catch (error) {
      spinner.fail('Erro ao analisar script');
      console.error(chalk.red(error instanceof Error ? error.message : 'Erro desconhecido'));
      process.exit(1);
    }
  });

// ============================================
// COMANDO: tts - Gerar áudio
// ============================================

program
  .command('tts <script>')
  .description('Gerar áudios TTS para todas as cenas')
  .option('-o, --output <dir>', 'Diretório de saída', './output/audio')
  .option('-v, --voice <voice>', 'Voz a usar', RECOMMENDED_VOICES.female_energetic)
  .action(async (scriptPath: string, options: { output: string; voice: string }) => {
    const spinner = ora('Iniciando geração de áudio...').start();

    try {
      // Verificar edge-tts
      const installed = await ttsService.checkInstallation();
      if (!installed) {
        spinner.fail('edge-tts não está instalado');
        console.log(chalk.yellow('\n📦 Instale com: pip install edge-tts'));
        process.exit(1);
      }

      // Parse script
      spinner.text = 'Analisando script...';
      const script = await scriptParser.parseFile(path.resolve(scriptPath));

      // Criar diretório de saída
      const outputDir = path.resolve(options.output);
      await fs.ensureDir(outputDir);

      spinner.succeed(`Gerando áudio para ${script.scenes.length} cenas...`);
      console.log(chalk.gray(`  Voz: ${options.voice}`));
      console.log(chalk.gray(`  Saída: ${outputDir}`));
      console.log('');

      // Gerar áudio para cada cena
      let successCount = 0;
      let totalDuration = 0;

      for (const scene of script.scenes) {
        const sceneSpinner = ora(`  ${scene.id}: "${scene.text.substring(0, 40)}..."`).start();

        const result = await ttsService.generateAudio({
          text: scene.text,
          voice: options.voice,
          outputPath: path.join(outputDir, `${scene.id}.mp3`),
        });

        if (result.success) {
          sceneSpinner.succeed(`  ${scene.id}: ${result.duration.toFixed(2)}s`);
          successCount++;
          totalDuration += result.duration;
        } else {
          sceneSpinner.fail(`  ${scene.id}: ${result.error}`);
        }
      }

      // Resumo
      console.log('\n' + chalk.bold.blue('📊 Resumo'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`  Áudios gerados: ${chalk.green(successCount)}/${script.scenes.length}`);
      console.log(`  Duração total: ${chalk.cyan(totalDuration.toFixed(2) + 's')}`);
      console.log(`  Arquivos em: ${chalk.gray(outputDir)}`);

    } catch (error) {
      spinner.fail('Erro ao gerar áudio');
      console.error(chalk.red(error instanceof Error ? error.message : 'Erro desconhecido'));
      process.exit(1);
    }
  });

// ============================================
// COMANDO: voices - Listar vozes
// ============================================

program
  .command('voices')
  .description('Listar vozes brasileiras disponíveis')
  .action(() => {
    console.log(chalk.bold.blue('\n🎙️ Vozes Brasileiras (pt-BR)'));
    console.log(chalk.gray('─'.repeat(60)));

    console.log(chalk.bold('\n⭐ Recomendadas para UGC:'));
    console.log(`  ${chalk.green('Feminina energética')}: pt-BR-FranciscaNeural`);
    console.log(`  ${chalk.green('Feminina calma')}: pt-BR-LeticiaNeural`);
    console.log(`  ${chalk.green('Feminina jovem')}: pt-BR-ThalitaNeural`);
    console.log(`  ${chalk.blue('Masculina confiante')}: pt-BR-AntonioNeural`);
    console.log(`  ${chalk.blue('Masculina amigável')}: pt-BR-FabioNeural`);

    console.log(chalk.bold('\n📋 Todas as vozes:'));
    
    const females = BRAZILIAN_VOICES.filter(v => v.gender === 'Female');
    const males = BRAZILIAN_VOICES.filter(v => v.gender === 'Male');

    console.log(chalk.magenta('\n  Femininas:'));
    for (const voice of females) {
      console.log(`    ${voice.shortName}`);
    }

    console.log(chalk.cyan('\n  Masculinas:'));
    for (const voice of males) {
      console.log(`    ${voice.shortName}`);
    }

    console.log(chalk.gray('\n💡 Uso: ugc-video tts script.md --voice pt-BR-AntonioNeural'));
  });

// ============================================
// COMANDO: presets - Listar presets de vídeo
// ============================================

program
  .command('presets')
  .description('Listar presets de vídeo disponíveis')
  .action(() => {
    console.log(chalk.bold.blue('\n📺 Presets de Vídeo'));
    console.log(chalk.gray('─'.repeat(60)));

    for (const [name, config] of Object.entries(VIDEO_PRESETS)) {
      console.log(`\n  ${chalk.cyan(name)}:`);
      console.log(`    Resolução: ${config.width}x${config.height}`);
      console.log(`    FPS: ${config.fps}`);
      console.log(`    Qualidade: ${config.quality}`);
    }

    console.log(chalk.gray('\n💡 Recomendado para Mercado Livre: vertical_hd (1080x1920)'));
  });

// ============================================
// COMANDO: init - Criar projeto de exemplo
// ============================================

program
  .command('init [name]')
  .description('Criar estrutura de projeto de exemplo')
  .action(async (name?: string) => {
    const projectName = name || 'meu-produto-ugc';
    const projectDir = path.resolve(projectName);

    const spinner = ora(`Criando projeto: ${projectName}`).start();

    try {
      // Criar estrutura
      await fs.ensureDir(path.join(projectDir, 'scripts'));
      await fs.ensureDir(path.join(projectDir, 'images'));
      await fs.ensureDir(path.join(projectDir, 'audio'));
      await fs.ensureDir(path.join(projectDir, 'output'));

      // Criar script de exemplo
      const exampleScript = `---
product: Fone Bluetooth XYZ
author: Vendedor
template: default
voice: pt-BR-FranciscaNeural
---

# Fone Bluetooth XYZ - O Melhor Custo-Benefício

## Cena 1 - Intro [duração: 4s]
Você ainda está usando fone com fio? Esquece isso! Conhece o Fone XYZ?

## Cena 2 - Problema [produto: fone-antigo.jpg] [duração: 5s]
Fios enrolando, quebrando, atrapalhando seus treinos e seu dia a dia.

## Cena 3 - Solução [produto: fone-xyz-hero.jpg] [duração: 5s]
O Fone XYZ é totalmente sem fio, com bateria de 40 horas e som cristalino.

## Cena 4 - Feature 1 [produto: fone-xyz-case.jpg] [duração: 4s]
Case carregador portátil que cabe no bolso. Carrega 5 vezes!

## Cena 5 - Feature 2 [produto: fone-xyz-water.jpg] [duração: 4s]
À prova d'água! Usa no treino, na chuva, sem preocupação.

## Cena 6 - Social Proof [duração: 4s]
Mais de 10 mil clientes satisfeitos. Nota 4.8 no Mercado Livre!

## Cena 7 - CTA [duração: 5s]
Aproveita agora! Frete grátis e 12x sem juros. Link na descrição!
`;

      await fs.writeFile(
        path.join(projectDir, 'scripts', 'produto.md'),
        exampleScript
      );

      // Criar README
      const readme = `# ${projectName}

## 🎬 Projeto UGC Video

### Comandos

\`\`\`bash
# Ver estrutura do script
ugc-video parse scripts/produto.md

# Gerar áudios
ugc-video tts scripts/produto.md -o audio/

# Listar vozes disponíveis
ugc-video voices
\`\`\`

### Estrutura

- \`scripts/\` - Scripts em Markdown
- \`images/\` - Imagens dos produtos
- \`audio/\` - Áudios gerados pelo TTS
- \`output/\` - Vídeos finais

### Próximos passos

1. Edite \`scripts/produto.md\` com seu conteúdo
2. Adicione imagens em \`images/\`
3. Execute \`ugc-video tts scripts/produto.md\`
4. Execute \`ugc-video render scripts/produto.md\`
`;

      await fs.writeFile(path.join(projectDir, 'README.md'), readme);

      spinner.succeed(`Projeto criado: ${projectDir}`);
      
      console.log(chalk.gray('\n📁 Estrutura:'));
      console.log(`  ${projectDir}/`);
      console.log('    ├── scripts/');
      console.log('    │   └── produto.md');
      console.log('    ├── images/');
      console.log('    ├── audio/');
      console.log('    ├── output/');
      console.log('    └── README.md');
      
      console.log(chalk.green('\n✅ Próximos passos:'));
      console.log(`  cd ${projectName}`);
      console.log('  ugc-video parse scripts/produto.md');
      console.log('  ugc-video tts scripts/produto.md');

    } catch (error) {
      spinner.fail('Erro ao criar projeto');
      console.error(chalk.red(error instanceof Error ? error.message : 'Erro desconhecido'));
      process.exit(1);
    }
  });

// ============================================
// MAIN
// ============================================

program.parse();
