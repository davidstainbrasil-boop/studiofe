
import { POST } from '@/app/api/pptx/process/route';
import { PptxProcessor } from '@/lib/pptx/pptx-processor';
import { NextRequest } from 'next/server';

// Mock do PptxProcessor
jest.mock('@/lib/pptx/pptx-processor');

const mockPptxProcessor = PptxProcessor as jest.MockedClass<typeof PptxProcessor>;

describe('POST /api/pptx/process', () => {

  beforeEach(() => {
    mockPptxProcessor.prototype.process.mockClear();
  });

  it('deve processar um arquivo com sucesso e retornar o resultado', async () => {
    // Arrange
    const storagePath = 'valid/path/to/file.pptx';
    const mockProcessResult = { slideCount: 10, content: { foo: 'bar' } };
    mockPptxProcessor.prototype.process.mockResolvedValue(mockProcessResult);

    const request = new NextRequest('http://localhost/api/pptx/process', {
      method: 'POST',
      body: JSON.stringify({ storagePath }),
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toEqual(mockProcessResult);
    expect(mockPptxProcessor.prototype.process).toHaveBeenCalledWith({ storagePath });
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
    expect(mockPptxProcessor.prototype.process).not.toHaveBeenCalled();
  });

  it('deve retornar erro 500 se o processador falhar', async () => {
    // Arrange
    const storagePath = 'path/that/will/fail.pptx';
    const errorMessage = 'Falha no processamento.';
    mockPptxProcessor.prototype.process.mockRejectedValue(new Error(errorMessage));

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
    expect(mockPptxProcessor.prototype.process).toHaveBeenCalledWith({ storagePath });
  });
});
