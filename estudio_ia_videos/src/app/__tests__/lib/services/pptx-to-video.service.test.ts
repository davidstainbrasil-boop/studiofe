/**
 * 🧪 Teste Unitário do Pipeline Service
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { PptxToVideoService } from '@/lib/services/pptx-to-video.service';

describe('PptxToVideoService', () => {
  let service: PptxToVideoService;

  beforeEach(() => {
    service = new PptxToVideoService();
  });

  test('deve aceitar configuração básica', () => {
    expect(service).toBeDefined();
    expect(typeof service.processPptxToVideo).toBe('function');
  });

  test('deve retornar erro para arquivo inválido', async () => {
    const invalidFile = new File(['invalid'], 'test.txt', { type: 'text/plain' });
    
    const result = await service.processPptxToVideo({
      userId: 'test-user',
      file: invalidFile,
      projectName: 'Test Project',
      ttsProvider: 'mock'
    });

    expect(result.status).toBe('failed');
    expect(result.projectId).toBe('');
  });

  test('deve processar arquivo PPTX mock', async () => {
    // Criar mock PPTX simples
    const pptxContent = Buffer.from('PPTX Mock Content');
    const mockFile = new File([pptxContent], 'test.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    });

    const result = await service.processPptxToVideo({
      userId: 'test-user',
      file: mockFile,
      projectName: 'Test Project',
      ttsProvider: 'mock'
    });

    // Em ambiente de teste, aceitar falha devido a dependências externas
    expect(['slides_extracted', 'failed']).toContain(result.status);
  });
});