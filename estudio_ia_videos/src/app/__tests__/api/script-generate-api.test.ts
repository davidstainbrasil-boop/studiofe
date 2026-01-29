
import { POST } from '@/app/api/script/generate/route';
import { ScriptGenerator } from '@/lib/scripting/script-generator';
import { NextRequest } from 'next/server';
import { mockAstSimple } from '../lib/scripting/mocks/ast.mock';
import { v4 as uuidv4 } from 'uuid';

// Mock do ScriptGenerator
jest.mock('@/lib/scripting/script-generator');

const mockScriptGenerator = ScriptGenerator as jest.MockedClass<typeof ScriptGenerator>;

describe('POST /api/script/generate', () => {

  beforeEach(() => {
    mockScriptGenerator.prototype.generate.mockClear();
  });

  it('deve gerar um roteiro com sucesso e retornar o resultado', async () => {
    // Arrange - use valid UUID for projectId
    const projectId = uuidv4();
    const mockScript = { projectId, scenes: [], title: 'Test', metadata: { totalScenes: 0, createdAt: '' } };
    mockScriptGenerator.prototype.generate.mockReturnValue(mockScript);

    const request = new NextRequest('http://localhost/api/script/generate', {
      method: 'POST',
      body: JSON.stringify({ projectId, pptxAst: mockAstSimple }),
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body).toEqual(mockScript);
    expect(mockScriptGenerator.prototype.generate).toHaveBeenCalledWith({ projectId, pptxAst: mockAstSimple });
  });

  it('deve retornar erro 400 se projectId ou pptxAst estiverem ausentes', async () => {
    // Teste 1: Sem projectId - Zod returns validation error
    let request = new NextRequest('http://localhost/api/script/generate', {
      method: 'POST',
      body: JSON.stringify({ pptxAst: mockAstSimple }),
    });
    let response = await POST(request);
    let body = await response.json();
    expect(response.status).toBe(400);
    // Zod returns 'Required' as the error message for missing fields
    expect(body.error).toBeDefined();

    // Teste 2: Sem pptxAst
    request = new NextRequest('http://localhost/api/script/generate', {
      method: 'POST',
      body: JSON.stringify({ projectId: uuidv4() }),
    });
    response = await POST(request);
    body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();

    expect(mockScriptGenerator.prototype.generate).not.toHaveBeenCalled();
  });

  it('deve retornar erro 400 se projectId não for UUID válido', async () => {
    const request = new NextRequest('http://localhost/api/script/generate', {
      method: 'POST',
      body: JSON.stringify({ projectId: 'invalid-project-id', pptxAst: mockAstSimple }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('ID de projeto inválido');
  });

  it('deve retornar erro 500 se o gerador falhar', async () => {
    // Arrange - use valid UUID
    const projectId = uuidv4();
    const errorMessage = 'Falha na geração do roteiro.';
    mockScriptGenerator.prototype.generate.mockImplementation(() => {
      throw new Error(errorMessage);
    });

    const request = new NextRequest('http://localhost/api/script/generate', {
      method: 'POST',
      body: JSON.stringify({ projectId, pptxAst: mockAstSimple }),
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(body.error).toBe(errorMessage);
    expect(mockScriptGenerator.prototype.generate).toHaveBeenCalledWith({ projectId, pptxAst: mockAstSimple });
  });
});
