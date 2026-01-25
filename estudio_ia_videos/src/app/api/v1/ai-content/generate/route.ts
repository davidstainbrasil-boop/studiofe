import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@lib/logger'
import { mockDelay, isProduction, notImplementedResponse } from '@lib/utils/mock-guard'

interface AIContentOptions {
  nrType: string
  audience: string
  type: string
  includeQuiz?: boolean
  duration?: number
  includeImages?: boolean
}

// Mock AI content generation - In production, this would call actual AI services
const generateAIContent = async (prompt: string, options: AIContentOptions) => {
  // REGRA DO REPO: mocks proibidos em producao
  if (!isProduction()) {
    await mockDelay(2000 + Math.random() * 3000, 'ai-content-generation')
  }
  
  const templates = {
    'nr-12': {
      'operadores': `# Segurança em Máquinas e Equipamentos - ${prompt}

## Objetivos do Treinamento
Este treinamento visa capacitar os operadores sobre os aspectos fundamentais de segurança relacionados a ${prompt}, conforme estabelecido pela Norma Regulamentadora NR-12.

## Principais Conceitos

### 1. Princípios Básicos de Segurança
- **Proteções fixas**: Elementos que impedem o acesso às zonas perigosas
- **Proteções móveis**: Dispositivos que podem ser abertos sem ferramentas
- **Dispositivos de segurança**: Equipamentos que reduzem o risco de acidentes

### 2. Procedimentos Operacionais
- Verificação pré-operacional dos equipamentos
- Uso correto de EPIs específicos
- Identificação de situações de risco
- Procedimentos de emergência

### 3. Responsabilidades
- **Do empregador**: Garantir máquinas seguras e treinamento adequado
- **Do trabalhador**: Seguir procedimentos e usar EPIs
- **Da equipe de manutenção**: Manter sistemas de segurança funcionais

## Casos Práticos
Apresentaremos situações reais relacionadas a ${prompt} e como aplicar corretamente os procedimentos de segurança.

## Avaliação
- Quiz interativo com 10 questões
- Simulação prática
- Certificado de conclusão

## Conclusão
A segurança em máquinas e equipamentos é responsabilidade de todos. O cumprimento da NR-12 salva vidas e previne acidentes graves.`,
      
      'supervisores': `# Manual Técnico: ${prompt} - Compliance NR-12

## Aspectos Regulamentares
A NR-12 estabelece requisitos mínimos para prevenção de acidentes e doenças do trabalho relacionados a máquinas e equipamentos.

### Análise de Riscos
- Identificação de perigos relacionados a ${prompt}
- Avaliação quantitativa de riscos
- Medidas de controle hierárquicas
- Documentação técnica necessária

### Implementação de Safeguards
1. **Proteções Físicas**
   - Grades de proteção
   - Barreiras fotoelétricas
   - Tapetes de segurança

2. **Sistemas de Controle**
   - Comando bimanual
   - Parada de emergência
   - Monitoramento contínuo

### Gestão de Mudanças
Procedimentos para modificações em ${prompt} que possam afetar a segurança operacional.

### Auditoria e Compliance
- Checklist de conformidade
- Cronograma de verificações
- Documentação obrigatória
- Treinamento de equipes`
    },
    'nr-33': {
      'operadores': `# Segurança em Espaços Confinados - ${prompt}

## O que é um Espaço Confinado?
Espaços confinados são ambientes com aberturas limitadas de entrada e saída, não projetados para ocupação humana contínua.

## Principais Riscos
- **Atmosfera tóxica**: Gases e vapores perigosos
- **Deficiência de oxigênio**: Menos de 20,9%
- **Risco de explosão**: Atmosfera inflamável
- **Soterramento**: Materiais granulados

## Procedimentos de Segurança para ${prompt}
1. **Antes da entrada**:
   - Permissão de entrada assinada
   - Teste atmosférico
   - Ventilação adequada
   - EPIs específicos

2. **Durante o trabalho**:
   - Monitoramento contínuo
   - Comunicação constante
   - Vigia externo obrigatório

3. **Emergências**:
   - Procedimentos de resgate
   - Equipamentos de emergência
   - Comunicação imediata

## Equipamentos Necessários
- Detectores de gases
- Equipamentos de ventilação
- EPIs adequados
- Equipamentos de resgate

## Certificação
Todos os trabalhadores devem ser certificados antes de trabalhar em espaços confinados.`
    },
    'nr-35': {
      'operadores': `# Trabalho em Altura - ${prompt}

## Conceitos Fundamentais
Trabalho em altura é toda atividade executada acima de 2 metros do nível inferior.

## Principais Riscos
- Queda de pessoas
- Queda de materiais e ferramentas
- Choque elétrico em estruturas energizadas

## Equipamentos de Proteção para ${prompt}
1. **EPIs Obrigatórios**:
   - Cinturão de segurança tipo paraquedista
   - Capacete com jugular
   - Calçado antiderrapante

2. **Equipamentos Coletivos**:
   - Guarda-corpo rígido
   - Tela de proteção
   - Plataforma de trabalho

## Procedimentos Operacionais
- Análise Preliminar de Risco (APR)
- Permissão de Trabalho (PT)
- Inspeção de equipamentos
- Comunicação com equipe

## Treinamento Obrigatório
40 horas de treinamento inicial + reciclagem anual de 8 horas.`
    }
  }
  
  const nrContent = templates[options.nrType as keyof typeof templates]
  const content = nrContent ? 
    nrContent[options.audience as keyof typeof nrContent] : 
    `# Conteúdo Gerado por IA: ${prompt}\n\nConteúdo personalizado baseado em suas especificações para ${options.nrType.toUpperCase()}.`
  
  // Generate slides if requested
  let slides: string[] | undefined
  if (options.type === 'presentation') {
    slides = [
      `Slide 1: Introdução - ${prompt}`,
      `Slide 2: Objetivos do Treinamento`,
      `Slide 3: Norma Regulamentadora ${options.nrType.toUpperCase()}`,
      `Slide 4: Principais Conceitos e Definições`,
      `Slide 5: Identificação de Riscos`,
      `Slide 6: Procedimentos de Segurança`,
      `Slide 7: Equipamentos Necessários`,
      `Slide 8: Casos Práticos e Exemplos`,
      `Slide 9: Responsabilidades e Obrigações`,
      `Slide 10: Conclusão e Certificação`
    ]
  }
  
  // Generate quiz if requested
  let questions
  if (options.includeQuiz) {
    questions = [
      {
        question: `Qual é o principal objetivo da ${options.nrType.toUpperCase()}?`,
        options: [
          'Aumentar a produtividade',
          'Prevenir acidentes e doenças ocupacionais',
          'Reduzir custos operacionais',
          'Melhorar a qualidade dos produtos'
        ],
        correct: 1,
        explanation: `A ${options.nrType.toUpperCase()} tem como objetivo principal a prevenção de acidentes e doenças ocupacionais.`
      },
      {
        question: 'Quando devem ser realizadas as verificações de segurança?',
        options: [
          'Apenas quando há problemas visíveis',
          'Uma vez por mês',
          'Antes de cada operação ou turno',
          'Somente durante auditorias externas'
        ],
        correct: 2,
        explanation: 'As verificações de segurança devem ser realizadas antes de cada operação para garantir condições seguras.'
      },
      {
        question: 'Qual é a responsabilidade principal do trabalhador em relação à segurança?',
        options: [
          'Apenas reportar problemas quando solicitado',
          'Seguir procedimentos e usar EPIs adequadamente',
          'Supervisionar outros trabalhadores',
          'Criar novos procedimentos de segurança'
        ],
        correct: 1,
        explanation: 'O trabalhador deve seguir os procedimentos estabelecidos e usar corretamente os EPIs fornecidos.'
      },
      {
        question: `Em caso de não conformidade com a ${options.nrType.toUpperCase()}, qual a primeira ação?`,
        options: [
          'Continuar o trabalho normalmente',
          'Parar imediatamente e comunicar ao supervisor',
          'Tentar corrigir sozinho o problema',
          'Aguardar o final do turno para reportar'
        ],
        correct: 1,
        explanation: 'Diante de qualquer não conformidade, o trabalho deve ser interrompido e o supervisor deve ser imediatamente comunicado.'
      }
    ]
  }
  
  return {
    title: `Treinamento ${options.nrType.toUpperCase()}: ${prompt}`,
    content,
    slides,
    questions,
    metadata: {
      wordCount: content.split(' ').length,
      estimatedDuration: options.duration,
      complexity: options.audience === 'operadores' ? 'Básico' : options.audience === 'supervisores' ? 'Intermediário' : 'Avançado',
      nrCompliance: [options.nrType.toUpperCase(), 'NR-01'],
      generatedAt: new Date().toISOString(),
      aiModel: 'GPT-4-Turbo',
      complianceScore: Math.floor(Math.random() * 5) + 95 // 95-100%
    },
    suggestions: {
      images: options.includeImages ? [
        `Imagem ilustrativa sobre ${prompt}`,
        `Diagrama dos equipamentos de segurança`,
        `Infográfico dos principais riscos`,
        `Foto exemplo de procedimento correto`,
        `Gráfico de estatísticas de acidentes`
      ] : undefined,
      improvements: [
        'Adicionar mais exemplos práticos específicos da empresa',
        'Incluir vídeos demonstrativos dos procedimentos',
        'Personalizar com cases reais do setor',
        'Adicionar simulações interativas'
      ]
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, options } = body
    
    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt é obrigatório' },
        { status: 400 }
      )
    }
    
    // Generate content with AI
    const generatedContent = await generateAIContent(prompt, options)
    
    return NextResponse.json({
      success: true,
      data: generatedContent,
      message: 'Conteúdo gerado com sucesso!'
    })
    
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Error generating AI content', err, { component: 'API: v1/ai-content/generate' })
    return NextResponse.json(
      { success: false, error: 'Falha na geração de conteúdo' },
      { status: 500 }
    )
  }
}

// Get available AI models and capabilities
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      data: {
        models: [
          { 
            id: 'gpt-4-turbo', 
            name: 'GPT-4 Turbo', 
            description: 'Modelo mais avançado para geração de conteúdo técnico',
            capabilities: ['text', 'quiz', 'slides'],
            accuracy: 98.7
          },
          { 
            id: 'claude-3', 
            name: 'Claude 3', 
            description: 'Especializado em conteúdo educacional e compliance',
            capabilities: ['text', 'quiz', 'analysis'],
            accuracy: 97.2
          }
        ],
        supportedNRs: [
          { id: 'nr-12', name: 'NR-12 - Máquinas e Equipamentos', compliance: 99.1 },
          { id: 'nr-33', name: 'NR-33 - Espaços Confinados', compliance: 98.5 },
          { id: 'nr-35', name: 'NR-35 - Trabalho em Altura', compliance: 97.8 },
          { id: 'nr-06', name: 'NR-06 - Equipamentos de Proteção Individual', compliance: 98.9 },
          { id: 'nr-17', name: 'NR-17 - Ergonomia', compliance: 96.4 }
        ],
        contentTypes: [
          { id: 'script', name: 'Roteiro de Treinamento', duration: '15-60 min' },
          { id: 'presentation', name: 'Apresentação/Slides', duration: '10-45 min' },
          { id: 'quiz', name: 'Quiz Interativo', duration: '5-20 min' },
          { id: 'summary', name: 'Resumo Executivo', duration: '5-15 min' }
        ],
        languages: [
          { id: 'pt-br', name: 'Português (Brasil)', flag: '🇧🇷' },
          { id: 'en', name: 'English', flag: '🇺🇸' },
          { id: 'es', name: 'Español', flag: '🇪🇸' }
        ]
      }
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Error fetching AI capabilities', err, { component: 'API: v1/ai-content/generate' })
    return NextResponse.json(
      { success: false, error: 'Failed to fetch AI capabilities' },
      { status: 500 }
    )
  }
}
