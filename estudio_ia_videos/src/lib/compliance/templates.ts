/**
 * NR Templates - Modelos de conformidade para Normas Regulamentadoras
 */

import type { NRCode } from './nr-engine';

export interface NRTemplate {
  code: NRCode;
  name: string;
  version: string;
  lastUpdated: Date;
  requirements: NRRequirement[];
  topics: string[];
  keywords: string[];
}

export interface NRRequirement {
  id: string;
  description: string;
  mandatory: boolean;
  weight: number;
}

const NR_TEMPLATES: Map<NRCode, NRTemplate> = new Map([
  ['NR-01', {
    code: 'NR-01',
    name: 'Disposições Gerais e Gerenciamento de Riscos Ocupacionais',
    version: '2020',
    lastUpdated: new Date('2020-09-01'),
    requirements: [
      { id: 'NR01-1', description: 'Programa de Gerenciamento de Riscos (PGR)', mandatory: true, weight: 10 },
      { id: 'NR01-2', description: 'Inventário de riscos', mandatory: true, weight: 8 },
      { id: 'NR01-3', description: 'Plano de ação', mandatory: true, weight: 8 },
      { id: 'NR01-4', description: 'Treinamentos previstos', mandatory: true, weight: 7 },
      { id: 'NR01-5', description: 'Direitos e deveres', mandatory: false, weight: 5 }
    ],
    topics: ['PGR', 'GRO', 'Direitos', 'Deveres', 'Riscos'],
    keywords: ['gerenciamento', 'risco', 'ocupacional', 'trabalhador']
  }],
  ['NR-06', {
    code: 'NR-06',
    name: 'Equipamento de Proteção Individual - EPI',
    version: '2018',
    lastUpdated: new Date('2018-07-01'),
    requirements: [
      { id: 'NR06-1', description: 'Definição de EPI', mandatory: true, weight: 10 },
      { id: 'NR06-2', description: 'Responsabilidades do empregador', mandatory: true, weight: 10 },
      { id: 'NR06-3', description: 'Responsabilidades do trabalhador', mandatory: true, weight: 10 },
      { id: 'NR06-4', description: 'Lista de EPIs por risco', mandatory: true, weight: 8 },
      { id: 'NR06-5', description: 'Certificado de Aprovação (CA)', mandatory: true, weight: 8 },
      { id: 'NR06-6', description: 'Uso, guarda e conservação', mandatory: false, weight: 5 }
    ],
    topics: ['EPI', 'Capacete', 'Luvas', 'Óculos', 'Protetor auricular', 'Calçado'],
    keywords: ['proteção', 'individual', 'equipamento', 'segurança']
  }],
  ['NR-10', {
    code: 'NR-10',
    name: 'Segurança em Instalações e Serviços em Eletricidade',
    version: '2016',
    lastUpdated: new Date('2016-05-01'),
    requirements: [
      { id: 'NR10-1', description: 'Medidas de controle de risco elétrico', mandatory: true, weight: 10 },
      { id: 'NR10-2', description: 'Habilitação e capacitação', mandatory: true, weight: 10 },
      { id: 'NR10-3', description: 'Procedimentos de trabalho', mandatory: true, weight: 9 },
      { id: 'NR10-4', description: 'Documentação das instalações', mandatory: true, weight: 8 },
      { id: 'NR10-5', description: 'Proteção contra incêndio e explosão', mandatory: true, weight: 8 }
    ],
    topics: ['Eletricidade', 'Choque', 'Arco elétrico', 'Habilitação'],
    keywords: ['elétrico', 'eletricidade', 'choque', 'tensão', 'corrente']
  }],
  ['NR-12', {
    code: 'NR-12',
    name: 'Segurança no Trabalho em Máquinas e Equipamentos',
    version: '2019',
    lastUpdated: new Date('2019-10-01'),
    requirements: [
      { id: 'NR12-1', description: 'Arranjo físico e instalações', mandatory: true, weight: 10 },
      { id: 'NR12-2', description: 'Dispositivos de partida, acionamento e parada', mandatory: true, weight: 10 },
      { id: 'NR12-3', description: 'Sistemas de segurança', mandatory: true, weight: 10 },
      { id: 'NR12-4', description: 'Manutenção e inspeção', mandatory: true, weight: 8 },
      { id: 'NR12-5', description: 'Sinalização', mandatory: true, weight: 7 }
    ],
    topics: ['Máquinas', 'Equipamentos', 'Proteção', 'Comando'],
    keywords: ['máquina', 'equipamento', 'proteção', 'zona de perigo']
  }],
  ['NR-18', {
    code: 'NR-18',
    name: 'Segurança e Saúde no Trabalho na Indústria da Construção',
    version: '2020',
    lastUpdated: new Date('2020-01-01'),
    requirements: [
      { id: 'NR18-1', description: 'PCMAT ou PGR', mandatory: true, weight: 10 },
      { id: 'NR18-2', description: 'Áreas de vivência', mandatory: true, weight: 9 },
      { id: 'NR18-3', description: 'Proteção contra quedas', mandatory: true, weight: 10 },
      { id: 'NR18-4', description: 'Andaimes e plataformas', mandatory: true, weight: 9 },
      { id: 'NR18-5', description: 'Escavações e fundações', mandatory: true, weight: 8 }
    ],
    topics: ['Construção civil', 'PCMAT', 'Andaimes', 'Escavação'],
    keywords: ['construção', 'obra', 'andaime', 'escavação', 'fundação']
  }],
  ['NR-35', {
    code: 'NR-35',
    name: 'Trabalho em Altura',
    version: '2019',
    lastUpdated: new Date('2019-08-01'),
    requirements: [
      { id: 'NR35-1', description: 'Planejamento e organização', mandatory: true, weight: 10 },
      { id: 'NR35-2', description: 'Capacitação e treinamento', mandatory: true, weight: 10 },
      { id: 'NR35-3', description: 'Equipamentos de proteção contra quedas', mandatory: true, weight: 10 },
      { id: 'NR35-4', description: 'Análise de risco e PT', mandatory: true, weight: 9 },
      { id: 'NR35-5', description: 'Procedimentos de emergência', mandatory: true, weight: 9 }
    ],
    topics: ['Altura', 'Queda', 'Cinto', 'Talabarte', 'Ancoragem'],
    keywords: ['altura', 'queda', 'cinto', 'ancoragem', 'talabarte']
  }]
]);

/**
 * Obtém o template de uma NR específica
 */
export function getNRTemplate(nr: NRCode): NRTemplate | undefined {
  return NR_TEMPLATES.get(nr);
}

/**
 * Lista todas as NRs disponíveis
 */
export function getAllNRs(): NRCode[] {
  return Array.from(NR_TEMPLATES.keys());
}

/**
 * Obtém todos os templates
 */
export function getAllTemplates(): NRTemplate[] {
  return Array.from(NR_TEMPLATES.values());
}

export const nrTemplates = {
  getNRTemplate,
  getAllNRs,
  getAllTemplates
};
