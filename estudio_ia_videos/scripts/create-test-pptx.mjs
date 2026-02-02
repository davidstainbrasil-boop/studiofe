#!/usr/bin/env node
/**
 * 📄 Criar PPTX de Teste para E2E
 * Gera um arquivo PPTX real com 5 slides sobre NR-12
 */

import PptxGenJS from 'pptxgenjs';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Conteúdo dos slides - Treinamento NR-12
const SLIDES = [
  {
    title: 'Introdução à NR-12',
    content: [
      'A NR-12 estabelece requisitos mínimos para prevenção de acidentes',
      'Aplica-se a máquinas e equipamentos em todas as fases',
      'Fundamental para segurança do trabalhador'
    ],
    notes: 'Bem-vindos ao treinamento sobre a Norma Regulamentadora número doze. Esta norma é fundamental para garantir a segurança no ambiente de trabalho quando lidamos com máquinas e equipamentos industriais.'
  },
  {
    title: 'Princípios Gerais de Segurança',
    content: [
      'Arranjo físico adequado das instalações',
      'Dispositivos de partida, acionamento e parada',
      'Sistemas de segurança e proteções',
      'Manutenção preventiva e corretiva'
    ],
    notes: 'Os princípios gerais da NR-12 abrangem diversos aspectos. Devemos considerar o arranjo físico adequado, instalações corretas, dispositivos seguros de partida e parada, além de sistemas de segurança eficientes.'
  },
  {
    title: 'Proteções e Dispositivos de Segurança',
    content: [
      'Proteções fixas permanentes',
      'Proteções móveis com intertravamento',
      'Botões de parada de emergência',
      'Sensores e barreiras de luz'
    ],
    notes: 'As proteções são essenciais para evitar acidentes. Podemos ter proteções fixas, que não podem ser removidas durante a operação, ou móveis, que permitem acesso controlado. Os botões de emergência devem estar sempre acessíveis.'
  },
  {
    title: 'Capacitação dos Trabalhadores',
    content: [
      'Treinamento inicial obrigatório',
      'Reciclagem periódica dos conhecimentos',
      'Documentação e registro de treinamentos',
      'Habilitação para operação de máquinas específicas'
    ],
    notes: 'A capacitação é um pilar fundamental da segurança. Todo trabalhador deve receber treinamento inicial antes de operar qualquer máquina, e participar de reciclagens periódicas para manter seus conhecimentos atualizados.'
  },
  {
    title: 'Conclusão e Boas Práticas',
    content: [
      'Cumpra todas as normas de segurança',
      'Use corretamente os EPIs fornecidos',
      'Comunique riscos identificados',
      'Segurança é responsabilidade de todos!'
    ],
    notes: 'Para finalizar, lembrem-se: a prevenção de acidentes é responsabilidade de todos. Cumpra as normas de segurança, utilize corretamente os Equipamentos de Proteção Individual, e comunique qualquer risco que identificar. Segurança sempre em primeiro lugar!'
  }
];

async function createTestPPTX() {
  console.log('📄 Criando PPTX de teste com 5 slides...\n');

  const pptx = new PptxGenJS();
  
  // Configurações do documento
  pptx.title = 'Treinamento NR-12 - Segurança em Máquinas';
  pptx.author = 'Estúdio IA Vídeos';
  pptx.subject = 'Treinamento de Segurança do Trabalho';
  pptx.company = 'TécnicoCursos';
  
  // Layout padrão
  pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
  pptx.layout = 'WIDE';

  // Criar cada slide
  for (let i = 0; i < SLIDES.length; i++) {
    const slideData = SLIDES[i];
    const slide = pptx.addSlide();
    
    // Background gradiente
    slide.background = { 
      color: i % 2 === 0 ? '1a1a2e' : '16213e'
    };

    // Título
    slide.addText(slideData.title, {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 1,
      fontSize: 36,
      fontFace: 'Arial',
      color: 'FFFFFF',
      bold: true,
      align: 'center'
    });

    // Conteúdo em bullets
    const bullets = slideData.content.map(text => ({
      text,
      options: { bullet: true, color: 'E0E0E0', fontSize: 24 }
    }));

    slide.addText(bullets, {
      x: 0.5,
      y: 2,
      w: '90%',
      h: 4,
      fontFace: 'Arial',
      color: 'E0E0E0',
      paraSpaceAfter: 12
    });

    // Número do slide
    slide.addText(`${i + 1} / ${SLIDES.length}`, {
      x: 11,
      y: 6.8,
      w: 2,
      h: 0.5,
      fontSize: 14,
      color: '888888',
      align: 'right'
    });

    // Notas do apresentador (para narração)
    slide.addNotes(slideData.notes);

    console.log(`  ✓ Slide ${i + 1}: ${slideData.title}`);
  }

  // Salvar arquivo
  const outputPath = path.join(__dirname, '..', 'test-nr12-training.pptx');
  
  await pptx.writeFile({ fileName: outputPath });
  
  console.log(`\n✅ PPTX criado com sucesso!`);
  console.log(`   📁 Arquivo: ${outputPath}`);
  
  // Verificar tamanho
  const stats = fs.statSync(outputPath);
  console.log(`   📊 Tamanho: ${Math.round(stats.size / 1024)} KB`);
  console.log(`   📑 Slides: ${SLIDES.length}`);
  
  return outputPath;
}

createTestPPTX().catch(console.error);
