
import { POST } from '@/app/api/pptx/process/route';
import { PPTXProcessorReal } from '@/lib/pptx/pptx-processor-real';
import { storageSystem } from '@/lib/storage-system-real';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/pptx/pptx-processor-real', () => ({
  PPTXProcessorReal: {
    extract: jest.fn()
  }
}));

jest.mock('@/lib/storage-system-real', () => ({
  storageSystem: {
    download: jest.fn()
  }
}));

describe('POST /api/pptx/process', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve processar um arquivo com sucesso e retornar o resultado', async () => {
    // Arrange
    const storagePath = 'pptx/user/project/file.pptx';
    const mockBuffer = Buffer.from('fake-content');
    
    (storageSystem.download as jest.Mock).mockResolvedValue(mockBuffer);
    
    const mockExtractResult = { 
        success: true, 
        slides: [{ title: 'Slide 1', content: 'Content' }], 
        metadata: { title: 'Test' },
        timeline: {}
    };
    (PPTXProcessorReal.extract as jest.Mock).mockResolvedValue(mockExtractResult);

    const request = new NextRequest('http://localhost/api/pptx/process', {
      method: 'POST',
      body: JSON.stringify({ storagePath }),
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.slideCount).toBe(1);
    expect(body.content).toEqual(mockExtractResult.slides);
    
    expect(storageSystem.download).toHaveBeenCalledWith({ bucket: 'uploads', path: storagePath });
    expect(PPTXProcessorReal.extract).toHaveBeenCalledWith(mockBuffer, 'project'); // Extracted from path
  });

  it('deve retornar erro 400 se storagePath não for fornecido', async () => {
    // Arrange
    const request = new NextRequest('http://localhost/api/pptx/process', {
      method: 'POST',
      body: JSON.stringify({}), // Corpo vazio
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('A propriedade "storagePath" é obrigatória.');
    expect(storageSystem.download).not.toHaveBeenCalled();
  });

  it('deve retornar erro 500 se o download falhar', async () => {
    // Arrange
    const storagePath = 'pptx/user/project/file.pptx';
    const errorMessage = 'Falha no download.';
    (storageSystem.download as jest.Mock).mockRejectedValue(new Error(errorMessage));

    const request = new NextRequest('http://localhost/api/pptx/process', {
      method: 'POST',
      body: JSON.stringify({ storagePath }),
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(body.error).toBe(errorMessage);
  });
});
