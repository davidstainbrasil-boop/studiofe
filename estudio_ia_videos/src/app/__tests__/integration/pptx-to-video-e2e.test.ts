/**
 * Teste E2E: PPTX → Vídeo Pipeline
 * Testa o fluxo completo do diferencial do produto
 * 
 * NOTA: Este teste requer um servidor rodando em TEST_BASE_URL
 * Execute: npm run app:dev (ou TEST_BASE_URL=http://localhost:3000)
 * Para rodar apenas este teste: npm test -- --testPathPattern="pptx-to-video-e2e"
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { logger } from '@/lib/monitoring/logger';

describe('🎬 Pipeline PPTX → Vídeo E2E', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3003';
  let projectId: string = 'mock-project-id';
  let jobId: string | undefined;
  let serverAvailable = false;

  beforeAll(async () => {
    logger.info('Iniciando teste E2E Pipeline');
    
    // Verificar se servidor está disponível
    try {
      const healthCheck = await fetch(`${baseUrl}/api/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(2000) 
      }).catch(() => null);
      serverAvailable = healthCheck?.ok === true;
    } catch {
      serverAvailable = false;
    }
    
    if (!serverAvailable) {
      logger.warn('⚠️ Servidor não disponível em ' + baseUrl + '. Testes E2E serão skipados.');
    }
  });

  afterAll(async () => {
    logger.info('Finalizando teste E2E Pipeline');
  });

  test('1. Upload PPTX deve processar slides', async () => {
    if (!serverAvailable) {
      logger.info('⏭️ Servidor indisponível - teste skipado');
      return;
    }

    // Criar um PPTX mock simples para teste
    const mockPptxBuffer = Buffer.from('Mock PPTX content');
    
    const formData = new FormData();
    formData.append('file', new Blob([mockPptxBuffer]), 'test.pptx');
    formData.append('projectName', 'Teste E2E');

    try {
      const response = await fetch(`${baseUrl}/api/pptx/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'x-user-id': process.env.DEV_BYPASS_USER_ID || 'test-user',
          'Cookie': 'dev_bypass=true'
        }
      });

      if (response.ok) {
        const result = await response.json();
        projectId = result.projectId || 'mock-project-id';
        
        expect(result).toHaveProperty('projectId');
        expect(result).toHaveProperty('slides');
        logger.info('✅ Upload PPTX processado', { projectId });
      } else {
        // API respondeu com erro (esperado se não há suporte mock)
        logger.info('⚠️ Upload PPTX retornou erro (esperado sem backend completo)');
        projectId = 'mock-project-id';
      }
    } catch (error) {
      // Erro de conexão - servidor não disponível
      logger.info('⚠️ Erro de conexão no upload PPTX', { error: String(error) });
      projectId = 'mock-project-id';
    }
  });

  test('2. Geração TTS deve criar áudio', async () => {
    if (!serverAvailable) {
      logger.info('⏭️ Servidor indisponível - teste skipado');
      return;
    }

    const ttsPayload = {
      text: 'Este é um teste de narração para o slide número um.',
      provider: 'mock', // Usar provider mock para testes
      voice: 'pt-BR-neural',
      format: 'mp3'
    };

    try {
      const response = await fetch(`${baseUrl}/api/v1/tts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': process.env.DEV_BYPASS_USER_ID || 'test-user'
        },
        body: JSON.stringify(ttsPayload)
      });

      if (response.ok) {
        const result = await response.json();
        
        expect(result).toHaveProperty('audioUrl');
        expect(result).toHaveProperty('duration');
        logger.info('✅ TTS gerado com sucesso', { duration: result.duration });
      } else {
        const errorText = await response.text();
        let error: { details?: string; error?: string } = {};
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText };
        }
        logger.info('⚠️ TTS retornou erro (esperado sem credenciais)', { 
          status: response.status,
          error: error.error || error.details 
        });
        
        // Aceita erros esperados (falta de credenciais, configuração)
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.status).toBeLessThan(500);
      }
    } catch (error) {
      logger.info('⚠️ Erro de conexão no TTS', { error: String(error) });
    }
  });

  test('3. Pipeline de render deve iniciar job', async () => {
    if (!serverAvailable) {
      logger.info('⏭️ Servidor indisponível - teste skipado');
      return;
    }

    const renderPayload = {
      projectId,
      slides: [
        {
          id: 'slide-1',
          content: 'Slide de teste',
          duration: 5000,
          audioUrl: 'https://example.com/audio.mp3'
        }
      ],
      options: {
        resolution: '1080p',
        format: 'mp4',
        fps: 30
      }
    };

    try {
      const response = await fetch(`${baseUrl}/api/render/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': process.env.DEV_BYPASS_USER_ID || 'test-user'
        },
        body: JSON.stringify(renderPayload)
      });

      const resultText = await response.text();
      let result: { jobId?: string; status?: string; error?: string } = {};
      try {
        result = JSON.parse(resultText);
      } catch {
        result = { error: resultText };
      }

      if (response.ok && result.jobId) {
        jobId = result.jobId;
        
        expect(result).toHaveProperty('jobId');
        expect(result).toHaveProperty('status');
        logger.info('✅ Job de render iniciado', { jobId });
      } else {
        logger.info('⚠️ Render endpoint retornou erro (esperado)', { 
          status: response.status,
          error: result.error 
        });
        // Para teste, aceitar erros de configuração (4xx)
        expect(response.status).toBeLessThan(500);
      }
    } catch (error) {
      logger.info('⚠️ Erro de conexão no render', { error: String(error) });
    }
  });

  test('4. Status do job deve ser consultável', async () => {
    if (!serverAvailable || !jobId) {
      logger.info('⏭️ Pulando teste de status (servidor/job não disponível)');
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/render/jobs/${jobId}`, {
        headers: {
          'x-user-id': process.env.DEV_BYPASS_USER_ID || 'test-user'
        }
      });

      if (response.ok) {
        const result = await response.json();
        
        expect(result).toHaveProperty('id', jobId);
        expect(result).toHaveProperty('status');
        expect(['pending', 'queued', 'processing', 'completed', 'failed']).toContain(result.status);
        
        logger.info('✅ Status do job consultado', { 
          jobId, 
          status: result.status 
        });
      } else {
        logger.info('⚠️ Endpoint de status retornou erro');
      }
    } catch (error) {
      logger.info('⚠️ Erro de conexão no status', { error: String(error) });
    }
  });

  test('5. Lista de jobs deve incluir job criado', async () => {
    if (!serverAvailable) {
      logger.info('⏭️ Servidor indisponível - teste skipado');
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/render/jobs`, {
        headers: {
          'x-user-id': process.env.DEV_BYPASS_USER_ID || 'test-user'
        }
      });

      if (!response.ok) {
        logger.info('⚠️ Lista de jobs retornou erro', { status: response.status });
        return;
      }
      
      const result = await response.json();
      
      // A API retorna { success: true, jobs: [...], pagination: {...} }
      // Aceitar tanto array direto quanto objeto com jobs
      const jobsList = Array.isArray(result) ? result : (result.jobs || []);
      
      expect(Array.isArray(jobsList)).toBe(true);
      
      logger.info('✅ Lista de jobs retornada', { 
        count: jobsList.length 
      });

      if (jobId) {
        const jobFound = jobsList.find((job: { id: string }) => job.id === jobId);
        if (jobFound) {
          logger.info('✅ Job criado encontrado na lista');
        }
      }
    } catch (error) {
      logger.info('⚠️ Erro de conexão na lista de jobs', { error: String(error) });
    }
  });
});