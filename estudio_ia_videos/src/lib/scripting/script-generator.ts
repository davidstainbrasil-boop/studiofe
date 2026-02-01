
import { Script, Scene } from '@/types/video-script';
import { logger } from '@/lib/monitoring/logger';
import { 
  PPTXAstNode, 
  PPTXPresentationNode,
  PPTXSlideNode,
  isSlideNode,
  extractTextFromNode,
  findNodeByType
} from '@/lib/pptx/types/pptx-ast.types';

// Tipos de entrada
export interface ScriptGeneratorOptions {
  projectId: string;
  pptxAst: PPTXPresentationNode;
}

/**
 * Gera um roteiro de vídeo (Script) a partir de uma AST de PPTX.
 */
export class ScriptGenerator {
  /**
   * Transforma a AST de um arquivo PPTX em um roteiro estruturado.
   * @param options - Opções contendo o ID do projeto e a AST.
   * @returns Um objeto Script.
   */
  public generate(options: ScriptGeneratorOptions): Script {
    const { projectId, pptxAst } = options;
    logger.info(`Iniciando geração de roteiro para o projeto: ${projectId}`);

    const scenes: Scene[] = this.createScenesFromAst(pptxAst);

    const script: Script = {
      projectId,
      title: pptxAst.properties?.title || 'Roteiro sem Título',
      scenes,
      metadata: {
        totalScenes: scenes.length,
        createdAt: new Date().toISOString(),
      },
    };

    logger.info(`Roteiro gerado com ${script.metadata.totalScenes} cenas.`);
    return script;
  }

  /**
   * Itera sobre a AST para criar uma cena para cada slide.
   */
  private createScenesFromAst(ast: PPTXPresentationNode): Scene[] {
    if (!ast.children || !Array.isArray(ast.children)) {
      logger.warn('AST inválida: a propriedade "children" não foi encontrada ou não é um array.');
      return [];
    }

    const slideNodes = ast.children.filter((node): node is PPTXSlideNode => isSlideNode(node));

    return slideNodes.map((slideNode: PPTXSlideNode, index: number) => {
      const titleNode = findNodeByType(slideNode, 'title');
      const bodyNode = findNodeByType(slideNode, 'body');
      const notesNode = findNodeByType(slideNode, 'notes');

      const title = titleNode ? extractTextFromNode(titleNode) : undefined;
      const body = bodyNode ? extractTextFromNode(bodyNode) : undefined;
      const speakerNotes = notesNode ? extractTextFromNode(notesNode) : undefined;

      // A narração prioriza as notas do apresentador. Se não houver, usa o corpo do slide.
      const narration = speakerNotes || body || title || 'Cena sem texto.';

      return {
        sceneNumber: index + 1,
        narration,
        title,
        body,
        speakerNotes,
      };
    });
  }
}
