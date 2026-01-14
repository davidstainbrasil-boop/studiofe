/**
 * Visual Fidelity Test for Element Parser
 * 
 * Tests that the element-parser correctly extracts layout and styling
 * from PPTX files for high-fidelity video rendering.
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseUniversalPresentation } from '../element-parser';

describe('UniversalElementParser - Visual Fidelity', () => {
  // Use a simple test PPTX if available
  const testPptxPath = path.join(process.cwd(), 'test_files', 'sample.pptx');
  
  const hasTestFile = fs.existsSync(testPptxPath);

  (hasTestFile ? describe : describe.skip)('with real PPTX file', () => {
    let buffer: Buffer;

    beforeAll(() => {
      buffer = fs.readFileSync(testPptxPath);
    });

    it('should extract presentation with success', async () => {
      const result = await parseUniversalPresentation(buffer);
      
      expect(result.success).toBe(true);
      expect(result.slides.length).toBeGreaterThan(0);
    });

    it('should extract slide dimensions', async () => {
      const result = await parseUniversalPresentation(buffer);
      
      expect(result.metadata.dimensions.width).toBeGreaterThan(0);
      expect(result.metadata.dimensions.height).toBeGreaterThan(0);
    });

    it('should extract text elements with layout (x, y, width, height)', async () => {
      const result = await parseUniversalPresentation(buffer);
      
      const textElements = result.slides[0]?.elements.filter(e => e.type === 'text') || [];
      
      if (textElements.length > 0) {
        const firstText = textElements[0];
        
        // Check layout exists and has numeric values
        expect(firstText.layout).toBeDefined();
        expect(typeof firstText.layout.x).toBe('number');
        expect(typeof firstText.layout.y).toBe('number');
        expect(typeof firstText.layout.width).toBe('number');
        expect(typeof firstText.layout.height).toBe('number');
        
        // Values should be reasonable (not NaN or Infinity)
        expect(Number.isFinite(firstText.layout.x)).toBe(true);
        expect(Number.isFinite(firstText.layout.y)).toBe(true);
        expect(firstText.layout.width).toBeGreaterThan(0);
        expect(firstText.layout.height).toBeGreaterThan(0);
      }
    });

    it('should extract text styling (font, size, color)', async () => {
      const result = await parseUniversalPresentation(buffer);
      
      const textElements = result.slides[0]?.elements.filter(e => e.type === 'text') || [];
      
      if (textElements.length > 0) {
        const firstText = textElements[0];
        
        // Check text style exists
        if (firstText.textStyle) {
          expect(typeof firstText.textStyle.fontFamily).toBe('string');
          expect(typeof firstText.textStyle.fontSize).toBe('number');
          expect(firstText.textStyle.fontSize).toBeGreaterThan(0);
          
          // Color should be a valid hex string
          if (firstText.textStyle.color) {
            expect(firstText.textStyle.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
          }
        }
      }
    });

    it('should extract paragraphs with runs for rich text', async () => {
      const result = await parseUniversalPresentation(buffer);
      
      const textElements = result.slides[0]?.elements.filter(e => e.type === 'text') || [];
      
      if (textElements.length > 0) {
        const firstText = textElements[0];
        
        if (firstText.content.paragraphs && firstText.content.paragraphs.length > 0) {
          const para = firstText.content.paragraphs[0];
          expect(Array.isArray(para.runs)).toBe(true);
          
          if (para.runs.length > 0) {
            expect(typeof para.runs[0].text).toBe('string');
          }
        }
      }
    });

    it('should extract theme colors if present', async () => {
      const result = await parseUniversalPresentation(buffer);
      
      if (result.theme) {
        expect(result.theme.colorScheme).toBeDefined();
        expect(result.theme.colorScheme.accent1).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });

    it('should extract slide notes if present', async () => {
      const result = await parseUniversalPresentation(buffer);
      
      // At least check that notes field exists (may be undefined if no notes)
      const firstSlide = result.slides[0];
      expect(firstSlide).toBeDefined();
      // notes is optional, so just check it's string or undefined
      expect(typeof firstSlide.notes === 'string' || firstSlide.notes === undefined).toBe(true);
    });

    it('should calculate slide duration based on content', async () => {
      const result = await parseUniversalPresentation(buffer);
      
      const firstSlide = result.slides[0];
      expect(firstSlide.duration).toBeGreaterThanOrEqual(5); // minimum 5 seconds
    });
  });

  describe('without real PPTX file (mock test)', () => {
    it('should return error for invalid buffer', async () => {
      const invalidBuffer = Buffer.from('not a pptx file');
      
      const result = await parseUniversalPresentation(invalidBuffer);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
