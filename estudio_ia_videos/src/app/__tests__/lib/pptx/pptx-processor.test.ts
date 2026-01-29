
import { PptxProcessor } from '@/lib/pptx/pptx-processor';
import { SupabaseClient } from '@supabase/supabase-js';
import * as advancedProcessor from '@/lib/pptx/pptx-processor-advanced';

// Mock JSZip
jest.mock('jszip', () => ({
  loadAsync: jest.fn().mockResolvedValue({
    files: {},
    file: jest.fn()
  })
}));

// Mock processAdvancedPPTX
jest.mock('@/lib/pptx/pptx-processor-advanced', () => ({
  processAdvancedPPTX: jest.fn()
}));

// Mock do cliente Supabase
const mockSupabaseClient = {
  storage: {
    from: jest.fn().mockReturnThis(),
    download: jest.fn(),
  },
};

describe('PptxProcessor', () => {
  let processor: PptxProcessor;

  beforeEach(() => {
    // Resetar mocks antes de cada teste
    jest.clearAllMocks();
    processor = new PptxProcessor(mockSupabaseClient as unknown as SupabaseClient);
  });

  it('deve processar um arquivo .pptx com sucesso', async () => {
    // Arrange
    const storagePath = 'path/to/test.pptx';
    const mockFileContent = 'fake-pptx-content';
    const mockFileBuffer = Buffer.from(mockFileContent);
    const mockBlob = new Blob([mockFileBuffer]);
    const mockParsedAst = [
      { id: 1, content: 'slide 1', layout: 'Title' },
      { id: 2, content: 'slide 2', layout: 'Content' }
    ];

    mockSupabaseClient.storage.from('uploads').download.mockResolvedValueOnce({
      data: mockBlob,
      error: null,
    });
    
    (advancedProcessor.processAdvancedPPTX as jest.Mock).mockResolvedValueOnce(mockParsedAst);

    // Act
    const result = await processor.process({ storagePath });

    // Assert
    expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('uploads');
    expect(mockSupabaseClient.storage.from('uploads').download).toHaveBeenCalledWith(storagePath);
    expect(advancedProcessor.processAdvancedPPTX).toHaveBeenCalled();
    // Verifica que o processo foi executado e retornou uma estrutura válida
    expect(result).toBeDefined();
    expect(result.slideCount).toBe(2);
    expect(result.content).toEqual(mockParsedAst);
  });

  it('deve lançar um erro se o download do arquivo falhar', async () => {
    // Arrange
    const storagePath = 'path/to/nonexistent.pptx';
    const mockError = new Error('File not found');

    mockSupabaseClient.storage.from('uploads').download.mockResolvedValueOnce({
      data: null,
      error: mockError,
    });

    // Act & Assert
    await expect(processor.process({ storagePath })).rejects.toThrow(
      `Não foi possível encontrar ou baixar o arquivo do storage: ${storagePath}`
    );
    expect(advancedProcessor.processAdvancedPPTX).not.toHaveBeenCalled();
  });

  it('deve lançar um erro se o parsing do arquivo falhar', async () => {
    // Arrange
    const storagePath = 'path/to/corrupted.pptx';
    const mockFileContent = 'corrupted-data';
    const mockFileBuffer = Buffer.from(mockFileContent);
    const mockBlob = new Blob([mockFileBuffer]);
    const mockError = new Error('Parsing failed');

    mockSupabaseClient.storage.from('uploads').download.mockResolvedValueOnce({
      data: mockBlob,
      error: null,
    });
    (advancedProcessor.processAdvancedPPTX as jest.Mock).mockRejectedValueOnce(mockError);

    // Act & Assert
    await expect(processor.process({ storagePath })).rejects.toThrow(
      'Falha ao fazer o parsing do conteúdo do arquivo .pptx.'
    );
  });
});
