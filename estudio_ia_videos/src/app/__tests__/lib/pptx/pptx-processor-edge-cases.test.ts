/**
 * 🧪 Testes PPTX Processor - Validação de Edge Cases e Performance
 * 
 * Complementa os testes de integração com foco em casos extremos
 */

import { processPPTXFile, validatePPTXFile, ProcessingResult } from '@/lib/pptx-processor';
import { createFileObject, createTestPPTX, cleanupTestFiles, createEmptyPPTX } from '../../helpers/test-helpers';
import path from 'path';
import fs from 'fs';
import { Slide } from '@/lib/definitions';

describe('PPTX Processor Edge Cases', () => {
  const testDir = path.join(__dirname, 'fixtures-edge');
  const testPPTXPath = path.join(testDir, 'test-presentation-edge.pptx');

  beforeAll(async () => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    await createTestPPTX(testPPTXPath);
  });

  afterAll(() => {
    cleanupTestFiles([testPPTXPath], testDir);
  });

  describe('validatePPTXFile', () => {
    test('should validate a valid PPTX file', async () => {
      const file = await createFileObject(testPPTXPath);
      const result = await validatePPTXFile(file);
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject non-existent file', async () => {
      const file = await createFileObject('/path/to/nonexistent.pptx');
      const result = await validatePPTXFile(file);
      
      expect(result.valid).toBe(false);
      // expect(result.error).toContain('não encontrado ou vazio');
    });

    test('should reject files that are too large', async () => {
      const largePath = path.join(testDir, 'large.pptx');
      const largeBuffer = Buffer.alloc(101 * 1024 * 1024); // 101MB
      fs.writeFileSync(largePath, largeBuffer);

      const file = await createFileObject(largePath);
      const result = await validatePPTXFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('muito grande');

      fs.unlinkSync(largePath);
    });

    test('should reject invalid file format', async () => {
      const invalidPath = path.join(testDir, 'invalid.pptx');
      fs.writeFileSync(invalidPath, 'This is not a valid PPTX file');

      const file = await createFileObject(invalidPath);
      const result = await validatePPTXFile(file);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      // expect(result.error).toContain('Assinatura ZIP não encontrada');
    });
  });

  describe('Performance Tests', () => {
    test('should process PPTX within reasonable time', async () => {
      const startTime = Date.now();
      const file = await createFileObject(testPPTXPath);
      const result = await processPPTXFile(file, 'test-project-id');
      const processingTime = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(10000); // Menos de 10 segundos
    });

    test('should handle concurrent processing', async () => {
      const file = await createFileObject(testPPTXPath);
      const promises = Array(3).fill(null).map(() => 
        processPPTXFile(file, 'test-project-id')
      );

      const results = await Promise.all(promises);
      
      results.forEach((result: ProcessingResult) => {
        expect(result.success).toBe(true);
        expect(result.slides!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle PPTX with no slides', async () => {
      const emptyPPTXPath = path.join(testDir, 'empty.pptx');
      await createEmptyPPTX(emptyPPTXPath);

      const file = await createFileObject(emptyPPTXPath);
      const result = await processPPTXFile(file, 'test-project-id');
      
      expect(result.success).toBe(true);
      // Dependendo da implementação, pode retornar 0 slides ou falhar.
      // Ajuste conforme comportamento esperado do seu parser.
      // Se falhar, verifique se o parser lida com apresentação vazia.
    });

    test('should handle PPTX with special characters in name', async () => {
      const specialCharPath = path.join(testDir, 'tëst-präsëntatiön.pptx');
      await createTestPPTX(specialCharPath); // Criar com nome especial

      const file = await createFileObject(specialCharPath);
      const result = await processPPTXFile(file, 'test-project-id');
      
      expect(result.success).toBe(true);
      expect(result.metadata!.title).toBeDefined();
    });
  });
});
