/**
 * Generate minimal test PPTX file for E2E testing
 * Creates a 2-slide presentation with simple text content
 */

const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '../e2e/fixtures/test-presentation.pptx');

async function generateTestPPTX() {
    const pptx = new PptxGenJS();

    // Slide 1: Title slide
    const slide1 = pptx.addSlide();
    slide1.background = { color: '2C3E50' };
    slide1.addText('E2E Test Presentation', {
        x: 0.5,
        y: 1.5,
        w: 9,
        h: 1.5,
        fontSize: 44,
        color: 'FFFFFF',
        bold: true,
        align: 'center',
    });
    slide1.addText('Automated Video Generation Test', {
        x: 0.5,
        y: 3.5,
        w: 9,
        h: 0.75,
        fontSize: 24,
        color: 'ECF0F1',
        align: 'center',
    });

    // Slide 2: Content slide
    const slide2 = pptx.addSlide();
    slide2.background = { color: '34495E' };
    slide2.addText('Test Content', {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 1,
        fontSize: 36,
        color: 'FFFFFF',
        bold: true,
    });
    slide2.addText([
        { text: 'This is an automated test to validate:', options: { breakLine: true, color: 'ECF0F1' } },
        { text: '• PPTX file upload and processing', options: { breakLine: true, color: 'ECF0F1' } },
        { text: '• Slide extraction to database', options: { breakLine: true, color: 'ECF0F1' } },
        { text: '• Video rendering pipeline', options: { breakLine: true, color: 'ECF0F1' } },
        { text: '• Storage persistence', options: { breakLine: true, color: 'ECF0F1' } },
    ], {
        x: 0.5,
        y: 2,
        w: 9,
        h: 3,
        fontSize: 20,
    });

    // Slide 3: Conclusion slide
    const slide3 = pptx.addSlide();
    slide3.background = { color: '16A085' };
    slide3.addText('Test Complete', {
        x: 0.5,
        y: 2,
        w: 9,
        h: 1.5,
        fontSize: 40,
        color: 'FFFFFF',
        bold: true,
        align: 'center',
    });
    slide3.addText('If you see this as a video, the pipeline works!', {
        x: 0.5,
        y: 3.75,
        w: 9,
        h: 0.75,
        fontSize: 18,
        color: 'ECF0F1',
        align: 'center',
    });

    // Write to file
    await pptx.writeFile({ fileName: outputPath });

    const stats = fs.statSync(outputPath);
    console.log(`✓ Generated test PPTX: ${outputPath}`);
    console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`  Slides: 3`);
}

generateTestPPTX().catch(console.error);
