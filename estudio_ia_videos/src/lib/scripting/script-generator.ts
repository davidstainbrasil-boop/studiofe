
import { Script, Scene } from '@/types/video-script';
import { logger } from '@/lib/monitoring/logger';

// Tipos de entrada
export interface ScriptGeneratorOptions {
  projectId: string;
  pptxAst: any; // O AST do officeparser
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
  private createScenesFromAst(ast: any): Scene[] {
    if (!ast.children || !Array.isArray(ast.children)) {
      logger.warn('AST inválida: a propriedade "children" não foi encontrada ou não é um array.');
      return [];
    }

    const slideNodes = ast.children.filter((node: any) => node.type === 'slide');

    return slideNodes.map((slideNode: any, index: number) => {
      const titleNode = this.findNodeByType(slideNode, 'title');
      const bodyNode = this.findNodeByType(slideNode, 'body');
      const notesNode = this.findNodeByType(slideNode, 'notes');

      const title = titleNode ? this.extractTextFromNode(titleNode) : undefined;
      const body = bodyNode ? this.extractTextFromNode(bodyNode) : undefined;
      const speakerNotes = notesNode ? this.extractTextFromNode(notesNode) : undefined;

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

  /**
   * Extrai todo o texto de um nó e seus filhos, concatenando-o.
   */
  private extractTextFromNode(node: any): string {
    let text = '';
    if (node.value) {
      text += node.value;
    }
    if (node.children && Array.isArray(node.children)) {
      text += node.children.map((child: any) => this.extractTextFromNode(child)).join(' ');
    }
    return text.trim();
  }

  /**
   * Encontra o primeiro nó de um tipo específico dentro de um nó pai.
   */
  private findNodeByType(parentNode: any, type: string): any | undefined {
    if (!parentNode.children || !Array.isArray(parentNode.children)) {
      return undefined;
    }
    return parentNode.children.find((child: any) => child.subtype === type);
  }
}
