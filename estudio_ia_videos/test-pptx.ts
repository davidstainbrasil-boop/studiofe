import * as fs from 'fs';
import { PPTXParserAdvanced } from './src/lib/pptx-parser-advanced';

async function test() {
  try {
    const buffer = fs.readFileSync('./dummy.pptx');
    console.log('File loaded, size:', buffer.length);

    const parser = new PPTXParserAdvanced();
    const result = await parser.parse(buffer);
    console.log('Parse success!');
    console.log('Slides:', result.slides?.length);
    console.log('Images:', result.images?.length);
    console.log('Metadata:', result.metadata);

    if (result.slides?.length > 0) {
      console.log('First slide:', JSON.stringify(result.slides[0], null, 2).substring(0, 300));
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack?.substring(0, 800));
  }
}

test();
