/**
 * NR Compliance Engine - IMPLEMENTAÇÃO REAL
 * Motor de verificação de conformidade com Normas Regulamentadoras
 * Baseado em análise de palavras-chave e tópicos obrigatórios
 */

export type NRCode = 'NR-01' | 'NR-06' | 'NR-10' | 'NR-12' | 'NR-18' | 'NR-35';

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
  'NR-01': 'Disposições Gerais',
  'NR-06': 'Equipamento de Proteção Individual',
  'NR-10': 'Segurança em Instalações e Serviços em Eletricidade',
  'NR-12': 'Segurança no Trabalho em Máquinas e Equipamentos',
  'NR-18': 'Condições e Meio Ambiente de Trabalho na Indústria da Construção',
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
  'NR-06': [
    { id: '6.1', description: 'Definição de EPI', keywords: ['EPI', 'equipamento de proteção', 'individual'], critical: true },
    { id: '6.2', description: 'Fornecimento Gratuito', keywords: ['gratuito', 'sem custo', 'empregador'], critical: true },
    { id: '6.3', description: 'Uso Adequado e Conservação', keywords: ['uso adequado', 'conservação', 'limpeza', 'guarda'], critical: true },
    { id: '6.4', description: 'Certificado de Aprovação (CA)', keywords: ['CA', 'certificado de aprovação', 'válido'], critical: true }
  ],
  'NR-10': [
    { id: '10.1', description: 'Prontuário das Instalações Elétricas', keywords: ['prontuário', 'diagrama unifilar', 'esquemas'], critical: true },
    { id: '10.2', description: 'Medidas de Controle (Desenergização)', keywords: ['desenergização', 'seccionamento', 'bloqueio', 'impedimento'], critical: true },
    { id: '10.3', description: 'Aterramento Temporário', keywords: ['aterramento', 'terra', 'equipotencialização'], critical: true },
    { id: '10.4', description: 'Zona de Risco e Zona Controlada', keywords: ['zona de risco', 'zona controlada', 'distância de segurança'], critical: true }
  ],
  'NR-12': [
    { id: '12.1', description: 'Arranjo Físico e Instalações', keywords: ['arranjo físico', 'circulação', 'piso'], critical: false },
    { id: '12.2', description: 'Sistemas de Segurança', keywords: ['sistema de segurança', 'proteção fixa', 'proteção móvel', 'intertravamento'], critical: true },
    { id: '12.3', description: 'Dispositivos de Parada de Emergência', keywords: ['parada de emergência', 'botão de emergência', 'monitorado'], critical: true },
    { id: '12.4', description: 'Manutenção e Inspeção', keywords: ['manutenção', 'inspeção', 'preventiva'], critical: false }
  ],
  'NR-18': [
    { id: '18.1', description: 'Programa de Gerenciamento de Riscos (PGR)', keywords: ['PGR', 'obras', 'construção'], critical: true },
    { id: '18.2', description: 'Áreas de Vivência', keywords: ['vivência', 'sanitário', 'refeitório', 'vestiário'], critical: true },
    { id: '18.3', description: 'Trabalho em Altura e Escavação', keywords: ['escavação', 'altura', 'andaime'], critical: true }
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
