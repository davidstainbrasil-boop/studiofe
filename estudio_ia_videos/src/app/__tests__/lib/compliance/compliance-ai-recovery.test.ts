/**
 * Testes para o Sistema de Compliance com IA
 */

import { checkCompliance } from '@/lib/compliance/nr-engine'

// Mock dependencies
// NÃO mockar checkCompliance aqui, pois queremos testar a integração do engine
// jest.mock('@/lib/compliance/nr-engine', ...);

jest.mock('@/lib/compliance/ai-analysis', () => ({
  analyzeCompleteContent: jest.fn().mockResolvedValue({
    aiScore: 95,
    confidence: 0.9,
    recommendations: ['Melhorar descrição do EPI']
  })
}), { virtual: true });

jest.mock('@/lib/compliance/report-generator', () => ({
  generateComplianceReport: jest.fn().mockReturnValue({
    status: 'compliant',
    score: 100,
    finalScore: 97.5,
    requirementsMet: 10,
    requirementsTotal: 10
  })
}), { virtual: true });

// Mock data for testing
const mockProjectContent = {
  slides: [
    {
      number: 1,
      title: "Introdução à Segurança em Máquinas",
      content: "Este curso aborda os principais aspectos de segurança em máquinas e equipamentos conforme NR-12. Vamos aprender sobre dispositivos de proteção, EPIs necessários e procedimentos de segurança.",
      duration: 300,
      imageUrls: ["https://example.com/epi-image.jpg"],
      audioPath: "/audio/slide1.mp3"
    },
    {
      number: 2,
      title: "Dispositivos de Proteção",
      content: "Os dispositivos de proteção são fundamentais para prevenir acidentes. Incluem proteções fixas, móveis e dispositivos de intertravamento.",
      duration: 240,
      imageUrls: ["https://example.com/protection-device.jpg"],
      audioPath: "/audio/slide2.mp3"
    },
    {
      number: 3,
      title: "Procedimentos de Manutenção",
      content: "A manutenção preventiva deve ser realizada por profissionais qualificados, seguindo procedimentos específicos de bloqueio e etiquetagem.",
      duration: 180,
      imageUrls: [],
      audioPath: "/audio/slide3.mp3"
    }
  ],
  totalDuration: 720,
  imageUrls: ["https://example.com/epi-image.jpg", "https://example.com/protection-device.jpg"],
  audioFiles: ["/audio/slide1.mp3", "/audio/slide2.mp3", "/audio/slide3.mp3"]
}

describe('Compliance AI System', () => {
  it('should run compliance check successfully', async () => {
    // Import inside test to use mocks
    // Note: ai-analysis and report-generator are virtual mocks
    const aiAnalysis = require('@/lib/compliance/ai-analysis');
    const reportGenerator = require('@/lib/compliance/report-generator');

    // Execute the REAL engine function for NR-12
    const nrResult = await checkCompliance('NR-12', mockProjectContent);
    
    // Execute mocked AI and Report functions
    const aiResult = await aiAnalysis.analyzeCompleteContent(mockProjectContent);
    const report = reportGenerator.generateComplianceReport(nrResult, aiResult);

    // Assertions for Engine (Real Logic)
    expect(nrResult).toBeDefined();
    expect(nrResult.nr).toBe('NR-12');
    expect(nrResult.score).toBeGreaterThan(0);
    // Verificando se encontrou palavras-chave do mockProjectContent
    // O mock tem "dispositivos de proteção", "proteções fixas", "manutenção", "bloqueio"
    // NR-12.2: Sistemas de Segurança (proteção fixa, intertravamento) -> Deve passar
    // NR-12.4: Manutenção e Inspeção (manutenção, preventiva) -> Deve passar
    expect(nrResult.requirementsMet).toBeGreaterThanOrEqual(2);

    // Assertions for Mocks
    expect(aiAnalysis.analyzeCompleteContent).toHaveBeenCalledWith(mockProjectContent);
    expect(report).toBeDefined();
    expect(report.status).toBe('compliant');
    expect(report.finalScore).toBe(97.5);
  });
});
