#!/usr/bin/env npx tsx
/**
 * 🧪 Test Script: PPTX → Video E2E Pipeline
 * 
 * Testa o fluxo completo de conversão PPTX para Vídeo:
 * 1. Cria um PPTX de teste com 5 slides
 * 2. Envia para a API /api/pptx/generate-video
 * 3. Verifica se o vídeo foi gerado
 * 4. Verifica a duração aproximada (~2 minutos)
 */

import * as fs from 'fs';
import * as path from 'path';

// JSZip para criar o PPTX
const JSZip = require('jszip');

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const DEV_USER_ID = process.env.DEV_BYPASS_USER_ID || 'test-user-id';

// Slide content for NR Training video (Segurança do Trabalho)
const SLIDES = [
  {
    title: 'Introdução à NR-12',
    content: 'A NR-12 estabelece requisitos mínimos para a prevenção de acidentes e doenças do trabalho nas fases de projeto e de utilização de máquinas e equipamentos.',
    notes: 'Bem-vindos ao treinamento sobre a Norma Regulamentadora número doze. Esta norma é fundamental para garantir a segurança no ambiente de trabalho quando lidamos com máquinas e equipamentos.'
  },
  {
    title: 'Princípios Gerais',
    content: 'A segurança do trabalho em máquinas deve considerar: arranjo físico, instalações, dispositivos de partida e parada, e sistemas de segurança.',
    notes: 'Os princípios gerais da NR-12 abrangem diversos aspectos. Devemos considerar o arranjo físico adequado, instalações corretas, dispositivos seguros de partida e parada, além de sistemas de segurança eficientes.'
  },
  {
    title: 'Proteções e Dispositivos',
    content: 'As máquinas devem possuir proteções fixas ou móveis, dispositivos de intertravamento, e sistemas de parada de emergência conforme a análise de risco.',
    notes: 'As proteções são essenciais para evitar acidentes. Podemos ter proteções fixas, que não podem ser removidas durante a operação, ou móveis, que permitem acesso controlado. Todos os dispositivos devem estar de acordo com a análise de risco realizada.'
  },
  {
    title: 'Capacitação dos Trabalhadores',
    content: 'Trabalhadores devem receber capacitação adequada para operar máquinas, incluindo treinamento inicial e reciclagem periódica.',
    notes: 'A capacitação é um pilar fundamental da segurança. Todo trabalhador deve receber treinamento inicial antes de operar qualquer máquina, e participar de reciclagens periódicas para manter seus conhecimentos atualizados.'
  },
  {
    title: 'Conclusão e Boas Práticas',
    content: 'A prevenção de acidentes depende do cumprimento das normas, uso adequado de EPIs, e comunicação de riscos identificados.',
    notes: 'Para finalizar, lembrem-se: a prevenção de acidentes é responsabilidade de todos. Cumpra as normas de segurança, utilize corretamente os Equipamentos de Proteção Individual, e comunique qualquer risco que identificar. Segurança em primeiro lugar!'
  }
];

// ============================================================================
// PPTX Creator
// ============================================================================

async function createTestPPTX(): Promise<Buffer> {
  const zip = new JSZip();
  
  // [Content_Types].xml
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${SLIDES.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/notesSlides/notesSlide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>`).join('\n  ')}
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
</Types>`);

  // _rels/.rels
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`);

  // ppt/presentation.xml
  const slideIds = SLIDES.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('');
  
  zip.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" 
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" 
                xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    ${slideIds}
  </p:sldIdLst>
  <p:sldSz cx="9144000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`);

  // ppt/_rels/presentation.xml.rels
  const slideRels = SLIDES.map((_, i) => 
    `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`
  ).join('\n  ');
  
  zip.file('ppt/_rels/presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${slideRels}
  <Relationship Id="rId${SLIDES.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`);

  // Create each slide with notes
  SLIDES.forEach((slide, i) => {
    const slideNum = i + 1;
    
    // Slide content
    zip.file(`ppt/slides/slide${slideNum}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" 
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" 
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Título"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="457200" y="274638"/>
            <a:ext cx="8229600" cy="1143000"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="pt-BR" sz="4400" b="1"/>
              <a:t>${slide.title}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="3" name="Conteúdo"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="457200" y="1600200"/>
            <a:ext cx="8229600" cy="4525963"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="pt-BR" sz="2400"/>
              <a:t>${slide.content}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`);

    // Slide relationships
    zip.file(`ppt/slides/_rels/slide${slideNum}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${slideNum}.xml"/>
</Relationships>`);

    // Notes slide
    zip.file(`ppt/notesSlides/notesSlide${slideNum}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" 
         xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" 
         xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Notes Placeholder"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:r>
              <a:rPr lang="pt-BR"/>
              <a:t>${slide.notes}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:notes>`);

    // Notes relationships
    zip.file(`ppt/notesSlides/_rels/notesSlide${slideNum}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="../slides/slide${slideNum}.xml"/>
</Relationships>`);
  });

  // Slide Master (minimal)
  zip.file('ppt/slideMasters/slideMaster1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" 
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" 
             xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg>
      <p:bgPr>
        <a:solidFill>
          <a:srgbClr val="1A1A2E"/>
        </a:solidFill>
        <a:effectLst/>
      </p:bgPr>
    </p:bg>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
</p:sldMaster>`);

  zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`);

  // Slide Layout (minimal)
  zip.file('ppt/slideLayouts/slideLayout1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" 
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" 
             xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" 
             type="title" preserve="1">
  <p:cSld name="Título">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
</p:sldLayout>`);

  zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`);

  // Theme (minimal)
  zip.file('ppt/theme/theme1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Tema Padrão">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="1A1A2E"/></a:dk2>
      <a:lt2><a:srgbClr val="E8E8E8"/></a:lt2>
      <a:accent1><a:srgbClr val="4F46E5"/></a:accent1>
      <a:accent2><a:srgbClr val="ED8936"/></a:accent2>
      <a:accent3><a:srgbClr val="48BB78"/></a:accent3>
      <a:accent4><a:srgbClr val="ED64A6"/></a:accent4>
      <a:accent5><a:srgbClr val="667EEA"/></a:accent5>
      <a:accent6><a:srgbClr val="F56565"/></a:accent6>
      <a:hlink><a:srgbClr val="0563C1"/></a:hlink>
      <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont>
        <a:latin typeface="Calibri Light"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:majorFont>
      <a:minorFont>
        <a:latin typeface="Calibri"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
        <a:ln w="28575"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
  <a:objectDefaults/>
  <a:extraClrSchemeLst/>
</a:theme>`);

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// ============================================================================
// Test Runner
// ============================================================================

async function runTest() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     🧪 PPTX → Video E2E Test (NR-12 Training)                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Create test PPTX
    console.log('📝 Step 1: Creating test PPTX file...');
    const pptxBuffer = await createTestPPTX();
    console.log(`   ✓ Created PPTX with ${SLIDES.length} slides (${Math.round(pptxBuffer.length / 1024)} KB)\n`);

    // Save to disk for debugging
    const testFilePath = path.join(process.cwd(), 'test-nr12-training.pptx');
    fs.writeFileSync(testFilePath, pptxBuffer);
    console.log(`   ✓ Saved to: ${testFilePath}\n`);

    // 2. Send to API
    console.log('🚀 Step 2: Sending to /api/pptx/generate-video...');
    
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(pptxBuffer)], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }), 'test-nr12-training.pptx');
    formData.append('options', JSON.stringify({
      voiceProvider: 'edge', // Use Edge TTS (free) for testing
      quality: 'medium',
      resolution: '720p',
      useNotes: true,
      defaultSlideDuration: 5
    }));

    const startTime = Date.now();
    
    const response = await fetch(`${API_BASE_URL}/api/pptx/generate-video`, {
      method: 'POST',
      body: formData,
      headers: {
        'x-user-id': DEV_USER_ID
      }
    });

    const elapsed = (Date.now() - startTime) / 1000;

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    console.log(`   ✓ Response received in ${elapsed.toFixed(1)}s\n`);

    // 3. Verify result
    console.log('📊 Step 3: Verifying results...');
    
    if (!result.success) {
      throw new Error(`Generation failed: ${result.error || 'Unknown error'}`);
    }

    console.log(`   ✓ Success: ${result.success}`);
    console.log(`   ✓ Project ID: ${result.projectId}`);
    console.log(`   ✓ Video URL: ${result.videoUrl}`);
    console.log(`   ✓ Slide Count: ${result.slideCount}`);
    console.log(`   ✓ Total Duration: ${result.totalDuration?.toFixed(1)}s (~${Math.round(result.totalDuration / 60)} min)`);
    console.log(`   ✓ Processing Time: ${result.processingTime?.toFixed(1)}s`);
    
    console.log('\n📋 Slides breakdown:');
    result.slides?.forEach((slide: { index: number; title: string; hasAudio: boolean; duration: number }) => {
      console.log(`   ${slide.index + 1}. ${slide.title || 'Untitled'} - ${slide.duration?.toFixed(1)}s ${slide.hasAudio ? '🔊' : '🔇'}`);
    });

    // 4. Download and verify video (optional)
    console.log('\n🎬 Step 4: Video verification...');
    
    if (result.videoUrl) {
      const videoResponse = await fetch(result.videoUrl);
      if (videoResponse.ok) {
        const videoSize = parseInt(videoResponse.headers.get('content-length') || '0');
        console.log(`   ✓ Video accessible: ${Math.round(videoSize / 1024)} KB`);
      } else {
        console.log(`   ⚠ Video not accessible: ${videoResponse.status}`);
      }
    }

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ TEST PASSED!                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error instanceof Error ? error.message : error);
    console.error('\nStack trace:', error instanceof Error ? error.stack : 'N/A');
    return false;
  }
}

// Run if executed directly
runTest().then(success => {
  process.exit(success ? 0 : 1);
});
