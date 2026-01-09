/**
 * 🧪 Testes para Theme Parser
 */

import { PPTXThemeParser, extractPPTXTheme, themeToCSS } from '@lib/pptx/parsers/theme-parser';

describe('PPTXThemeParser', () => {
  let parser: PPTXThemeParser;

  beforeEach(() => {
    parser = new PPTXThemeParser();
  });

  describe('generateCSSVariables', () => {
    it('should generate CSS variables from theme', () => {
      const mockTheme = {
        name: 'Test Theme',
        colors: [
          { name: 'accent1', value: '#4F81BD', rgb: '79,129,189' },
          { name: 'dark1', value: '#000000', rgb: '0,0,0' },
        ],
        fonts: {
          majorFont: { typeface: 'Calibri Light' },
          minorFont: { typeface: 'Calibri' },
        },
        colorScheme: {
          dark1: '#000000',
          light1: '#FFFFFF',
          dark2: '#1F497D',
          light2: '#EEECE1',
          accent1: '#4F81BD',
          accent2: '#C0504D',
          accent3: '#9BBB59',
          accent4: '#8064A2',
          accent5: '#4BACC6',
          accent6: '#F79646',
          hyperlink: '#0000FF',
          followedHyperlink: '#800080',
        },
      };

      const cssVars = parser.generateCSSVariables(mockTheme);

      expect(cssVars['--theme-accent1']).toBe('#4F81BD');
      expect(cssVars['--theme-accent1-rgb']).toBe('79,129,189');
      expect(cssVars['--theme-dark1']).toBe('#000000');
      expect(cssVars['--theme-font-heading']).toBe('Calibri Light');
      expect(cssVars['--theme-font-body']).toBe('Calibri');
    });
  });

  describe('themeToCSS', () => {
    it('should convert theme to CSS string', () => {
      const mockTheme = {
        name: 'Test Theme',
        colors: [
          { name: 'accent1', value: '#4F81BD', rgb: '79,129,189' },
        ],
        fonts: {
          majorFont: { typeface: 'Arial' },
          minorFont: { typeface: 'Verdana' },
        },
        colorScheme: {
          dark1: '#000000',
          light1: '#FFFFFF',
          dark2: '#1F497D',
          light2: '#EEECE1',
          accent1: '#4F81BD',
          accent2: '#C0504D',
          accent3: '#9BBB59',
          accent4: '#8064A2',
          accent5: '#4BACC6',
          accent6: '#F79646',
          hyperlink: '#0000FF',
          followedHyperlink: '#800080',
        },
      };

      const css = themeToCSS(mockTheme);

      expect(css).toContain('--theme-accent1: #4F81BD;');
      expect(css).toContain('--theme-font-heading: Arial;');
      expect(css).toContain('--theme-font-body: Verdana;');
    });
  });

  describe('extractTheme error handling', () => {
    it('should return error for invalid buffer', async () => {
      const invalidBuffer = Buffer.from('not a valid pptx');
      const result = await parser.extractTheme(invalidBuffer);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return error for empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = await parser.extractTheme(emptyBuffer);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('extractPPTXTheme', () => {
  it('should be a function', () => {
    expect(typeof extractPPTXTheme).toBe('function');
  });

  it('should handle invalid input gracefully', async () => {
    const result = await extractPPTXTheme(Buffer.from('invalid'));
    expect(result.success).toBe(false);
  });
});
