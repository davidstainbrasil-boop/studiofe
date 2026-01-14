
import { PPTXParser } from '../pptx-parser';
import JSZip from 'jszip';
import { logger } from '@lib/logger';

// Mock JSZip
jest.mock('jszip', () => ({
  loadAsync: jest.fn()
}));

// Mock logger
jest.mock('@lib/logger', () => {
    const mockLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    };
    return {
        logger: mockLogger,
        Logger: jest.fn(() => mockLogger)
    };
}, { virtual: true });

describe('PPTXParser', () => {
  let parser: PPTXParser;
  const mockLoadAsync = JSZip.loadAsync as jest.Mock;

  beforeEach(() => {
    parser = new PPTXParser();
    jest.clearAllMocks();
  });

  const createMockZip = (files: Record<string, string>) => {
    return {
      file: (path: string | RegExp) => {
        if (path instanceof RegExp) {
            // Find matches in keys
            const matches = Object.keys(files).filter(k => path.test(k));
            return matches.map(k => ({
                async: jest.fn().mockResolvedValue(files[k])
            }));
        }
        if (files[path]) {
          return {
            async: jest.fn().mockResolvedValue(files[path])
          };
        }
        return null;
      }
    };
  };

  it('should parse valid PPTX structure correctly', async () => {
    // Arrange
    const mockFiles = {
      'docProps/core.xml': `
        <cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
           <dc:title>Test Presentation</dc:title>
           <dc:creator>Test Author</dc:creator>
        </cp:coreProperties>
      `,
      'ppt/presentation.xml': `
        <p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:sldIdLst>
            <p:sldId id="256" r:id="rId1"/>
          </p:sldIdLst>
        </p:presentation>
      `,
      'ppt/slides/slide1.xml': `
        <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:cSld>
            <p:spTree>
               <p:sp>
                 <p:txBody>
                   <a:p>
                     <a:r>
                       <a:t>Slide Title</a:t>
                     </a:r>
                   </a:p>
                   <a:p>
                     <a:r>
                       <a:t>Hello World</a:t>
                     </a:r>
                   </a:p>
                 </p:txBody>
               </p:sp>
            </p:spTree>
          </p:cSld>
        </p:sld>
      `
    };

    mockLoadAsync.mockResolvedValue(createMockZip(mockFiles));
    
    // Act
    const buffer = Buffer.from('dummy');
    const result = await parser.parsePPTX(buffer);

    // Assert
    expect(result.metadata.title).toBe('Test Presentation');
    expect(result.metadata.author).toBe('Test Author');
    expect(result.metadata.slideCount).toBe(1);
    expect(result.slides).toHaveLength(1);
    // Verify no errors logged
    expect(logger.warn).not.toHaveBeenCalled();
    
    // Debug info if failing
    if (result.slides.length > 0 && result.slides[0].content === '') {
        console.log('Result:', JSON.stringify(result, null, 2));
    }

    expect(result.slides[0].content).toContain('Hello World');
  });

  it('should handle missing presentation.xml gracefully', async () => {
       // Arrange
       const mockFiles = {
           'docProps/core.xml': '<xml></xml>'
       }; // No ppt/presentation.xml
       
       mockLoadAsync.mockResolvedValue(createMockZip(mockFiles));

       // Act & Assert
       await expect(parser.parsePPTX(Buffer.from('dummy')))
         .rejects.toThrow('presentation.xml not found');
  });
});
