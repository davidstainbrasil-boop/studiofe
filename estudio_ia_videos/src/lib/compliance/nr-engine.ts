/**
 * NR Compliance Engine - IMPLEMENTAÇÃO REAL
 * Motor de verificação de conformidade com Normas Regulamentadoras
 * Baseado em análise de palavras-chave e tópicos obrigatórios
 * Suporta 15 NRs principais
 */

export type NRCode = 
  | 'NR-01' | 'NR-05' | 'NR-06' | 'NR-07' | 'NR-09' 
  | 'NR-10' | 'NR-11' | 'NR-12' | 'NR-13' | 'NR-15'
  | 'NR-17' | 'NR-18' | 'NR-23' | 'NR-33' | 'NR-35';

export interface ComplianceResult {
  nr: string;
  nrName: string;
  status: 'compliant' | 'non_compliant' | 'warning';
  score: number;
  finalScore: number;
  requirementsMet: number;
  requirementsTotal: number;
  recommendations: string[];
  criticalPoints: string[];
  aiAnalysis: string;
  aiScore: number;
  confidence: number;
}

const NR_NAMES: Record<NRCode, string> = {
  'NR-01': 'Disposições Gerais e Gerenciamento de Riscos',
  'NR-05': 'Comissão Interna de Prevenção de Acidentes (CIPA)',
  'NR-06': 'Equipamento de Proteção Individual (EPI)',
  'NR-07': 'Programa de Controle Médico de Saúde Ocupacional (PCMSO)',
  'NR-09': 'Avaliação e Controle das Exposições Ocupacionais',
  'NR-10': 'Segurança em Instalações e Serviços em Eletricidade',
  'NR-11': 'Transporte, Movimentação, Armazenagem e Manuseio de Materiais',
  'NR-12': 'Segurança no Trabalho em Máquinas e Equipamentos',
  'NR-13': 'Caldeiras, Vasos de Pressão e Tubulações',
  'NR-15': 'Atividades e Operações Insalubres',
  'NR-17': 'Ergonomia',
  'NR-18': 'Segurança e Saúde na Indústria da Construção',
  'NR-23': 'Proteção Contra Incêndios',
  'NR-33': 'Segurança e Saúde no Trabalho em Espaços Confinados',
  'NR-35': 'Trabalho em Altura'
};

// Definição de Regras Reais por NR
interface NRRequirement {
  id: string;
  description: string;
  keywords: string[];
  critical: boolean;
}

const NR_RULES: Record<NRCode, NRRequirement[]> = {
  'NR-01': [
    { id: '1.1', description: 'Gerenciamento de Riscos Ocupacionais (GRO)', keywords: ['GRO', 'gerenciamento de riscos', 'riscos ocupacionais'], critical: true },
    { id: '1.2', description: 'Programa de Gerenciamento de Riscos (PGR)', keywords: ['PGR', 'programa', 'inventário de riscos'], critical: true },
    { id: '1.3', description: 'Direito de Recusa', keywords: ['direito de recusa', 'risco grave', 'iminente'], critical: false }
  ],
  'NR-05': [
    { id: '5.1', description: 'Composição da CIPA', keywords: ['CIPA', 'comissão interna', 'representantes'], critical: true },
    { id: '5.2', description: 'Atribuições dos Membros', keywords: ['atribuições', 'identificar riscos', 'investigar acidentes'], critical: true },
    { id: '5.3', description: 'Treinamento dos Cipeiros', keywords: ['treinamento', 'cipeiros', 'capacitação', '20 horas'], critical: true },
    { id: '5.4', description: 'Reuniões Mensais', keywords: ['reunião', 'ata', 'mensal'], critical: false }
  ],
  'NR-06': [
    { id: '6.1', description: 'Definição de EPI', keywords: ['EPI', 'equipamento de proteção', 'individual'], critical: true },
    { id: '6.2', description: 'Fornecimento Gratuito', keywords: ['gratuito', 'sem custo', 'empregador'], critical: true },
    { id: '6.3', description: 'Uso Adequado e Conservação', keywords: ['uso adequado', 'conservação', 'limpeza', 'guarda'], critical: true },
    { id: '6.4', description: 'Certificado de Aprovação (CA)', keywords: ['CA', 'certificado de aprovação', 'válido'], critical: true }
  ],
  'NR-07': [
    { id: '7.1', description: 'PCMSO Obrigatório', keywords: ['PCMSO', 'programa', 'saúde ocupacional'], critical: true },
    { id: '7.2', description: 'Exames Médicos', keywords: ['exame', 'admissional', 'periódico', 'demissional', 'ASO'], critical: true },
    { id: '7.3', description: 'Atestado de Saúde Ocupacional (ASO)', keywords: ['ASO', 'atestado', 'aptidão'], critical: true },
    { id: '7.4', description: 'Médico Coordenador', keywords: ['médico coordenador', 'médico do trabalho'], critical: false }
  ],
  'NR-09': [
    { id: '9.1', description: 'Identificação de Agentes', keywords: ['agentes físicos', 'agentes químicos', 'agentes biológicos', 'identificação'], critical: true },
    { id: '9.2', description: 'Avaliação Quantitativa', keywords: ['avaliação', 'quantitativa', 'limites de exposição', 'LEO'], critical: true },
    { id: '9.3', description: 'Medidas de Controle', keywords: ['medidas de controle', 'eliminação', 'neutralização'], critical: true }
  ],
  'NR-10': [
    { id: '10.1', description: 'Prontuário das Instalações Elétricas', keywords: ['prontuário', 'diagrama unifilar', 'esquemas'], critical: true },
    { id: '10.2', description: 'Medidas de Controle (Desenergização)', keywords: ['desenergização', 'seccionamento', 'bloqueio', 'impedimento'], critical: true },
    { id: '10.3', description: 'Aterramento Temporário', keywords: ['aterramento', 'terra', 'equipotencialização'], critical: true },
    { id: '10.4', description: 'Zona de Risco e Zona Controlada', keywords: ['zona de risco', 'zona controlada', 'distância de segurança'], critical: true }
  ],
  'NR-11': [
    { id: '11.1', description: 'Normas para Operação de Elevadores e Guindastes', keywords: ['elevador', 'guindaste', 'içamento', 'carga'], critical: true },
    { id: '11.2', description: 'Transporte Manual de Cargas', keywords: ['transporte manual', 'peso máximo', 'ergonomia'], critical: true },
    { id: '11.3', description: 'Empilhadeiras', keywords: ['empilhadeira', 'operador habilitado', 'CNH'], critical: true },
    { id: '11.4', description: 'Armazenagem', keywords: ['armazenagem', 'empilhamento', 'peso', 'estabilidade'], critical: false }
  ],
  'NR-12': [
    { id: '12.1', description: 'Arranjo Físico e Instalações', keywords: ['arranjo físico', 'circulação', 'piso'], critical: false },
    { id: '12.2', description: 'Sistemas de Segurança', keywords: ['sistema de segurança', 'proteção fixa', 'proteção móvel', 'intertravamento'], critical: true },
    { id: '12.3', description: 'Dispositivos de Parada de Emergência', keywords: ['parada de emergência', 'botão de emergência', 'monitorado'], critical: true },
    { id: '12.4', description: 'Manutenção e Inspeção', keywords: ['manutenção', 'inspeção', 'preventiva'], critical: false }
  ],
  'NR-13': [
    { id: '13.1', description: 'Inspeção de Segurança de Caldeiras', keywords: ['caldeira', 'inspeção', 'pressão', 'vapor'], critical: true },
    { id: '13.2', description: 'Vasos de Pressão', keywords: ['vaso de pressão', 'prontuário', 'inspeção periódica'], critical: true },
    { id: '13.3', description: 'Tubulações', keywords: ['tubulação', 'fluido', 'identificação'], critical: false },
    { id: '13.4', description: 'Operador Habilitado', keywords: ['operador', 'treinamento', 'habilitação', 'caldeireiro'], critical: true }
  ],
  'NR-15': [
    { id: '15.1', description: 'Limites de Tolerância', keywords: ['limite de tolerância', 'insalubridade', 'exposição'], critical: true },
    { id: '15.2', description: 'Agentes Insalubres', keywords: ['ruído', 'calor', 'radiação', 'agente químico', 'insalubre'], critical: true },
    { id: '15.3', description: 'Adicional de Insalubridade', keywords: ['adicional', 'grau máximo', 'grau médio', 'grau mínimo'], critical: false },
    { id: '15.4', description: 'Eliminação ou Neutralização', keywords: ['eliminação', 'neutralização', 'EPI', 'EPC'], critical: true }
  ],
  'NR-17': [
    { id: '17.1', description: 'Análise Ergonômica do Trabalho (AET)', keywords: ['AET', 'análise ergonômica', 'ergonomia'], critical: true },
    { id: '17.2', description: 'Mobiliário do Posto de Trabalho', keywords: ['mobiliário', 'cadeira', 'mesa', 'monitor', 'postura'], critical: true },
    { id: '17.3', description: 'Condições Ambientais de Trabalho', keywords: ['iluminação', 'temperatura', 'ruído', 'conforto térmico'], critical: false },
    { id: '17.4', description: 'Trabalho com Máquinas e Equipamentos', keywords: ['ritmo de trabalho', 'pausa', 'descanso'], critical: false }
  ],
  'NR-18': [
    { id: '18.1', description: 'Programa de Condições e Meio Ambiente de Trabalho (PCMAT)', keywords: ['PCMAT', 'obras', 'construção', 'PGR'], critical: true },
    { id: '18.2', description: 'Áreas de Vivência', keywords: ['vivência', 'sanitário', 'refeitório', 'vestiário'], critical: true },
    { id: '18.3', description: 'Andaimes e Plataformas', keywords: ['andaime', 'plataforma', 'escada', 'guarda-corpo'], critical: true },
    { id: '18.4', description: 'Escavações', keywords: ['escavação', 'escoramento', 'taludes'], critical: true }
  ],
  'NR-23': [
    { id: '23.1', description: 'Proteção Contra Incêndio', keywords: ['incêndio', 'fogo', 'proteção', 'combate'], critical: true },
    { id: '23.2', description: 'Saídas de Emergência', keywords: ['saída de emergência', 'rota de fuga', 'sinalização'], critical: true },
    { id: '23.3', description: 'Extintores', keywords: ['extintor', 'mangueira', 'hidrante', 'sprinkler'], critical: true },
    { id: '23.4', description: 'Brigada de Incêndio', keywords: ['brigada', 'brigadista', 'treinamento', 'simulado'], critical: false }
  ],
  'NR-33': [
    { id: '33.1', description: 'Definição de Espaço Confinado', keywords: ['espaço confinado', 'ventilação insuficiente', 'entrada limitada'], critical: true },
    { id: '33.2', description: 'Gestão de SST em Espaços Confinados', keywords: ['permissão de entrada', 'PET', 'vigia', 'supervisor'], critical: true },
    { id: '33.3', description: 'Avaliação Atmosférica', keywords: ['atmosfera', 'oxigênio', 'explosividade', 'gases tóxicos'], critical: true },
    { id: '33.4', description: 'Capacitação para Espaços Confinados', keywords: ['trabalhador autorizado', 'vigia', 'supervisor de entrada', 'treinamento 16h'], critical: true }
  ],
  'NR-35': [
    { id: '35.1', description: 'Análise de Risco (AR) e Permissão de Trabalho (PT)', keywords: ['análise de risco', 'AR', 'permissão de trabalho', 'PT'], critical: true },
    { id: '35.2', description: 'Sistema de Proteção Contra Quedas', keywords: ['proteção contra quedas', 'cinto', 'talabarte', 'ancoragem'], critical: true },
    { id: '35.3', description: 'Emergência e Salvamento', keywords: ['emergência', 'salvamento', 'resgate', 'primeiros socorros'], critical: true },
    { id: '35.4', description: 'Capacitação e Treinamento', keywords: ['capacitação', 'treinamento', '8 horas'], critical: true }
  ]
};

export async function checkCompliance(
  nr: NRCode,
  content: unknown,
  useAi: boolean = false
): Promise<ComplianceResult> {
  // 1. Extrair texto do conteúdo
  let textToAnalyze = '';
  
  if (typeof content === 'string') {
    textToAnalyze = content.toLowerCase();
  } else if (Array.isArray(content)) {
    // Suporte para array de slides
    textToAnalyze = content.map((slide: any) => 
      `${slide.title || ''} ${slide.content || ''} ${slide.notes || ''}`
    ).join(' ').toLowerCase();
  } else if (typeof content === 'object' && content !== null) {
    textToAnalyze = JSON.stringify(content).toLowerCase();
  }

  const nrRules = NR_RULES[nr] || [];
  const totalRules = nrRules.length;
  let metRules = 0;
  const recommendations: string[] = [];
  const criticalPoints: string[] = [];
  
  // 2. Analisar Regras
  if (totalRules === 0) {
    // Fallback se NR não estiver mapeada
    return {
      nr,
      nrName: NR_NAMES[nr] || nr,
      status: 'warning',
      score: 0,
      finalScore: 0,
      requirementsMet: 0,
      requirementsTotal: 0,
      recommendations: ['Norma ainda não mapeada no motor de compliance'],
      criticalPoints: [],
      aiAnalysis: 'Regras não definidas.',
      aiScore: 0,
      confidence: 0
    };
  }

  nrRules.forEach(rule => {
    // Verifica se alguma palavra-chave da regra está presente
    const found = rule.keywords.some(keyword => textToAnalyze.includes(keyword.toLowerCase()));
    
    if (found) {
      metRules++;
    } else {
      recommendations.push(`Faltou abordar: ${rule.description} (Palavras-chave: ${rule.keywords.join(', ')})`);
      if (rule.critical) {
        criticalPoints.push(`CRÍTICO: O tópico obrigatório "${rule.description}" não foi detectado.`);
      }
    }
  });

  // 3. Calcular Score
  const rawScore = totalRules > 0 ? (metRules / totalRules) * 100 : 0;
  
  // Penalidade por conteúdo muito curto
  let scoreModifier = 1.0;
  if (textToAnalyze.length < 200) {
    recommendations.push('ATENÇÃO: Conteúdo extremamente curto. Pode ser insuficiente para um treinamento técnico.');
    scoreModifier = 0.5;
  } else if (textToAnalyze.length < 1000) {
    scoreModifier = 0.9;
  }

  const finalScore = Math.round(rawScore * scoreModifier);

  // 4. Determinar Status
  let status: 'compliant' | 'non_compliant' | 'warning' = 'non_compliant';
  if (finalScore >= 90 && criticalPoints.length === 0) {
    status = 'compliant';
  } else if (finalScore >= 70) {
    status = 'warning';
  }

  // 5. Simular/Integrar AI complementar se solicitado
  // (Aqui mantemos uma string descritiva, mas baseada nos dados reais analisados)
  const aiAnalysisText = `Análise Realizada: Detectamos ${metRules} de ${totalRules} tópicos obrigatórios da ${nr}. ` +
    (criticalPoints.length > 0 ? `Foram encontrados ${criticalPoints.length} pontos críticos ausentes.` : 'Cobertura de tópicos críticos está completa.');

  return {
    nr,
    nrName: NR_NAMES[nr] || nr,
    status,
    score: Math.round(rawScore),
    finalScore,
    requirementsMet: metRules,
    requirementsTotal: totalRules,
    recommendations,
    criticalPoints,
    aiAnalysis: aiAnalysisText,
    aiScore: finalScore, // Em um futuro com GPT-4, isso seria uma segunda opinião
    confidence: textToAnalyze.length > 500 ? 0.95 : 0.6 // Confiança cai se tiver pouco texto
  };
}

export const nrEngine = {
  checkCompliance
};
