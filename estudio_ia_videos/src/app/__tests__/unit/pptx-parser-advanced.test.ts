
import { PPTXParserAdvanced } from '@/lib/pptx-parser-advanced';
import JSZip from 'jszip';

describe('PPTXParserAdvanced (Real Implementation)', () => {
  let parser: PPTXParserAdvanced;

  beforeEach(() => {
    parser = new PPTXParserAdvanced();
  });

  it('should parse a valid PPTX buffer with slides and metadata', async () => {
    const zip = new JSZip();

    // 1. Create [Content_Types].xml (simplified)
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="xml" ContentType="application/xml"/>
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    </Types>`);

    // 2. Create docProps/core.xml (Metadata)
    zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:title>Test Presentation</dc:title>
      <dc:creator>Test Author</dc:creator>
    </cp:coreProperties>`);

    // 3. Create docProps/app.xml (Metadata)
    zip.file('docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
      <Application>Test App</Application>
      <Slides>1</Slides>
    </Properties>`);

    // 4. Create ppt/slides/slide1.xml
    zip.file('ppt/slides/slide1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld>
        <p:spTree>
          <p:sp>
            <p:txBody>
              <a:p>
                <a:r>
                  <a:t>Hello World</a:t>
                </a:r>
              </a:p>
            </p:txBody>
          </p:sp>
        </p:spTree>
      </p:cSld>
    </p:sld>`);

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });

    const result = await parser.parse(buffer);

    expect(result).toBeDefined();
    expect(result.metadata.title).toBe('Test Presentation');
    expect(result.metadata.author).toBe('Test Author');
    expect(result.slides).toHaveLength(1);
    expect(result.slides[0].content).toContain('Hello World');
    expect(result.slides[0].slideNumber).toBe(1);
  });

  it('should extract images correctly', async () => {
    const zip = new JSZip();
    
    // Add slide
    zip.file('ppt/slides/slide1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld><p:spTree></p:spTree></p:cSld>
    </p:sld>`);

    // Add image
    const fakeImage = Buffer.from('fake-image-content');
    zip.file('ppt/media/image1.png', fakeImage);

    // Add rels
    zip.file('ppt/slides/_rels/slide1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
    </Relationships>`);

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    const result = await parser.parse(buffer);

    expect(result.images).toHaveLength(1);
    expect(result.images[0].name).toBe('image1.png');
    expect(result.images[0].data.equals(fakeImage)).toBe(true);
    
    expect(result.slides[0].images).toContain('ppt/media/image1.png');
  });
});
