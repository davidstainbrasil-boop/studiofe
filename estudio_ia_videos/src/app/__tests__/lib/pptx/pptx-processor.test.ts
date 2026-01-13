
import { PptxProcessor } from '@/lib/pptx/pptx-processor';
import { SupabaseClient } from '@supabase/supabase-js';
import { parseOffice } from 'officeparser';

// Mock da biblioteca officeparser
jest.mock('officeparser', () => ({
  parseOffice: jest.fn(),
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
    const mockParsedAst = { type: 'root', children: [], slides: [{id: 1}, {id: 2}] };

    mockSupabaseClient.storage.from('uploads').download.mockResolvedValueOnce({
      data: mockBlob,
      error: null,
    });
    (parseOffice as jest.Mock).mockResolvedValueOnce(mockParsedAst);

    // Act
    const result = await processor.process({ storagePath });

    // Assert
    expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('uploads');
    expect(mockSupabaseClient.storage.from('uploads').download).toHaveBeenCalledWith(storagePath);
    expect(parseOffice).toHaveBeenCalledWith(mockFileBuffer);
    expect(result).toEqual({
      slideCount: 2,
      content: mockParsedAst,
    });
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
    expect(parseOffice).not.toHaveBeenCalled();
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
    (parseOffice as jest.Mock).mockRejectedValueOnce(mockError);

    // Act & Assert
    await expect(processor.process({ storagePath })).rejects.toThrow(
      'Falha ao fazer o parsing do conteúdo do arquivo .pptx.'
    );
  });
});
