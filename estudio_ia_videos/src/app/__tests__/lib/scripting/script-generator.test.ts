
import { ScriptGenerator } from '@/lib/scripting/script-generator';
import { mockAstComplex, mockAstSimple, mockAstWithSpeakerNotes } from './mocks/ast.mock';

describe('ScriptGenerator', () => {
  let generator: ScriptGenerator;

  beforeEach(() => {
    generator = new ScriptGenerator();
  });

  it('deve criar um roteiro básico a partir de uma AST simples', () => {
    const script = generator.generate({ projectId: 'test-project', pptxAst: mockAstSimple });

    expect(script.projectId).toBe('test-project');
    expect(script.title).toBe('Título da Apresentação');
    expect(script.scenes).toHaveLength(1);
    expect(script.metadata.totalScenes).toBe(1);

    const scene1 = script.scenes[0];
    expect(scene1.sceneNumber).toBe(1);
    expect(scene1.title).toBe('Título do Slide 1');
    expect(scene1.body).toBe('Este é o corpo do slide.');
    // Como não há notas, a narração deve ser o corpo
    expect(scene1.narration).toBe('Este é o corpo do slide.');
    expect(scene1.speakerNotes).toBeUndefined();
  });

  it('deve priorizar as notas do apresentador para a narração', () => {
    const script = generator.generate({ projectId: 'notes-project', pptxAst: mockAstWithSpeakerNotes });

    expect(script.scenes).toHaveLength(1);
    const scene1 = script.scenes[0];
    expect(scene1.narration).toBe('Esta é a nota do apresentador. Deve ser usada como narração.');
    expect(scene1.speakerNotes).toBe('Esta é a nota do apresentador. Deve ser usada como narração.');
    expect(scene1.title).toBe('Slide com Notas');
    expect(scene1.body).toBe('Conteúdo principal do slide.');
  });

  it('deve lidar com uma AST complexa com múltiplos slides', () => {
    const script = generator.generate({ projectId: 'complex-project', pptxAst: mockAstComplex });

    expect(script.scenes).toHaveLength(3);
    expect(script.metadata.totalScenes).toBe(3);

    // Slide 1: Título e corpo
    expect(script.scenes[0].title).toBe('Slide 1: Título');
    expect(script.scenes[0].narration).toBe('Corpo do slide 1.');

    // Slide 2: Apenas título
    expect(script.scenes[1].title).toBe('Slide 2: Apenas Título');
    expect(script.scenes[1].body).toBeUndefined();
    expect(script.scenes[1].narration).toBe('Slide 2: Apenas Título');

    // Slide 3: Com notas
    expect(script.scenes[2].title).toBe('Slide 3: Com Notas');
    expect(script.scenes[2].narration).toBe('Narração do slide 3 vinda das notas.');
    expect(script.scenes[2].speakerNotes).toBe('Narração do slide 3 vinda das notas.');
  });

  it('deve lidar com slides sem texto', () => {
    const mockAstEmptySlide = {
      type: 'presentation',
      children: [{ type: 'slide', children: [] }],
    };
    const script = generator.generate({ projectId: 'empty-slide-project', pptxAst: mockAstEmptySlide });

    expect(script.scenes).toHaveLength(1);
    expect(script.scenes[0].narration).toBe('Cena sem texto.');
  });

  it('deve retornar um roteiro vazio se a AST for inválida', () => {
    const script = generator.generate({ projectId: 'invalid-ast', pptxAst: { invalid: true } });
    expect(script.scenes).toHaveLength(0);
    expect(script.metadata.totalScenes).toBe(0);
  });
});
