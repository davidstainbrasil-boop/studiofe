/**
 * 📚 Templates NR - Conteúdo REAL de Segurança do Trabalho
 * 
 * Templates com slides pré-definidos para treinamentos de NRs
 * Conteúdo técnico validado para compliance
 */

export interface NRTemplateSlide {
  order: number
  title: string
  content: string
  notes?: string
  imageKeywords?: string[]
  duration?: number // segundos
  type: 'title' | 'content' | 'quiz' | 'video' | 'summary'
}

export interface NRTemplate {
  id: string
  nr: string
  title: string
  description: string
  category: string
  duration: number // minutos estimados
  slides: NRTemplateSlide[]
  tags: string[]
  compliance: {
    version: string
    lastUpdate: string
    source: string
  }
}

// ============================================================================
// NR-06 - Equipamento de Proteção Individual (EPI)
// ============================================================================

export const NR06_TEMPLATE: NRTemplate = {
  id: 'nr06-epi-completo',
  nr: 'NR-06',
  title: 'Equipamento de Proteção Individual - EPI',
  description: 'Treinamento completo sobre uso, conservação e obrigações relacionadas a EPIs',
  category: 'Segurança Geral',
  duration: 30,
  tags: ['epi', 'segurança', 'proteção individual', 'obrigatório'],
  compliance: {
    version: 'Portaria SEPRT n.º 6.735/2020',
    lastUpdate: '2020-03-10',
    source: 'Ministério do Trabalho'
  },
  slides: [
    {
      order: 1,
      title: 'NR-06: Equipamento de Proteção Individual',
      content: 'Treinamento Obrigatório de Segurança do Trabalho',
      type: 'title',
      duration: 10
    },
    {
      order: 2,
      title: 'O que é EPI?',
      content: `Equipamento de Proteção Individual (EPI) é todo dispositivo ou produto de uso individual utilizado pelo trabalhador, destinado à proteção de riscos suscetíveis de ameaçar a segurança e a saúde no trabalho.

• Deve possuir Certificado de Aprovação (CA)
• Fornecido gratuitamente pela empresa
• Uso obrigatório quando indicado`,
      notes: 'Enfatizar que o EPI é a última barreira de proteção, após medidas coletivas',
      imageKeywords: ['epi', 'segurança', 'proteção'],
      type: 'content',
      duration: 45
    },
    {
      order: 3,
      title: 'Obrigações do Empregador',
      content: `O empregador deve:

✓ Adquirir EPI adequado ao risco de cada atividade
✓ Exigir o uso correto
✓ Fornecer somente EPIs com CA válido
✓ Orientar e treinar o trabalhador sobre uso adequado
✓ Substituir imediatamente quando danificado ou extraviado
✓ Responsabilizar-se pela higienização e manutenção periódica
✓ Comunicar ao MTE qualquer irregularidade`,
      notes: 'Destacar responsabilidade legal do empregador',
      type: 'content',
      duration: 60
    },
    {
      order: 4,
      title: 'Obrigações do Trabalhador',
      content: `O trabalhador deve:

✓ Usar o EPI fornecido, apenas para a finalidade a que se destina
✓ Responsabilizar-se pela guarda e conservação
✓ Comunicar ao empregador qualquer alteração que o torne impróprio
✓ Cumprir as determinações do empregador sobre uso adequado

⚠️ A recusa injustificada ao uso do EPI pode gerar advertência, suspensão ou demissão por justa causa`,
      notes: 'Importante: trabalhador também tem responsabilidades',
      type: 'content',
      duration: 60
    },
    {
      order: 5,
      title: 'Tipos de EPI - Proteção da Cabeça',
      content: `CAPACETE DE SEGURANÇA
• Proteção contra impactos, penetração e choque elétrico
• Classes A, B e C conforme o risco
• Deve ter jugular para trabalhos em altura

CAPUZ OU BALACLAVA
• Proteção contra respingos de produtos químicos
• Proteção térmica em ambientes frios

PROTETOR FACIAL
• Face shield para proteção contra partículas volantes`,
      imageKeywords: ['capacete segurança', 'epi cabeça'],
      type: 'content',
      duration: 45
    },
    {
      order: 6,
      title: 'Tipos de EPI - Proteção dos Olhos e Face',
      content: `ÓCULOS DE SEGURANÇA
• Lentes de policarbonato resistente a impacto
• Proteção lateral obrigatória
• Modelos com ou sem grau

PROTETOR FACIAL (FACE SHIELD)
• Para trabalhos com esmeril, serra circular
• Proteção contra respingos químicos

MÁSCARA DE SOLDA
• Filtros com tonalidades adequadas ao processo
• Modelos automáticos (auto escurecimento)`,
      imageKeywords: ['óculos segurança', 'protetor facial'],
      type: 'content',
      duration: 45
    },
    {
      order: 7,
      title: 'Tipos de EPI - Proteção Auditiva',
      content: `PROTETOR AURICULAR TIPO PLUG
• Inserção no canal auditivo
• Descartável ou reutilizável
• NRR (Nível de Redução de Ruído) indicado

PROTETOR TIPO CONCHA (ABAFADOR)
• Cobre toda a orelha
• Maior atenuação para ruídos intensos
• Indicado para uso intermitente

⚠️ Obrigatório em ambientes acima de 85 dB`,
      imageKeywords: ['protetor auricular', 'abafador ruído'],
      type: 'content',
      duration: 45
    },
    {
      order: 8,
      title: 'Tipos de EPI - Proteção Respiratória',
      content: `RESPIRADOR DESCARTÁVEL (PFF)
• PFF1: Poeiras e névoas
• PFF2: Poeiras, névoas e fumos metálicos  
• PFF3: Poeiras, névoas, fumos e radionuclídeos

RESPIRADOR COM FILTRO
• Para gases, vapores e combinações
• Filtros específicos para cada contaminante

MÁSCARA AUTÔNOMA
• Para atmosferas IPVS (Imediatamente Perigosas à Vida)
• Espaços confinados com deficiência de O₂`,
      imageKeywords: ['máscara respiratória', 'respirador'],
      type: 'content',
      duration: 60
    },
    {
      order: 9,
      title: 'Tipos de EPI - Proteção das Mãos',
      content: `LUVAS DE PROTEÇÃO

• LÁTEX/NITRÍLICA: Produtos químicos, agentes biológicos
• VAQUETA: Trabalhos gerais, abrasão
• RASPA: Soldagem, trabalhos a quente
• MALHA DE AÇO: Corte, açougues
• PVC: Produtos químicos, óleos
• ISOLANTE: Trabalhos com eletricidade

⚠️ Verificar compatibilidade com o agente de risco`,
      imageKeywords: ['luva segurança', 'proteção mãos'],
      type: 'content',
      duration: 45
    },
    {
      order: 10,
      title: 'Tipos de EPI - Proteção dos Pés',
      content: `CALÇADO DE SEGURANÇA

• BIQUEIRA DE AÇO: Impactos e compressão
• BIQUEIRA COMPOSITE: Sem metal, áreas com detector
• BOTINA: Proteção básica
• BOTA DE PVC: Umidade, produtos químicos
• BOTA DE BORRACHA: Eletricidade (isolante)
• PERNEIRA: Proteção contra cobras, respingos

✓ Deve ter CA válido
✓ Solado antiderrapante`,
      imageKeywords: ['botina segurança', 'calçado epi'],
      type: 'content',
      duration: 45
    },
    {
      order: 11,
      title: 'Conservação e Higienização',
      content: `CUIDADOS COM O EPI

✓ Limpar após cada uso
✓ Guardar em local apropriado, seco e ventilado
✓ Não modificar ou adaptar
✓ Verificar integridade antes do uso
✓ Substituir quando danificado

⚠️ EPI danificado NÃO protege!

A empresa deve fornecer local adequado para guarda e realizar higienização quando necessário.`,
      notes: 'Mostrar exemplos de EPIs danificados que não devem ser usados',
      type: 'content',
      duration: 45
    },
    {
      order: 12,
      title: 'Certificado de Aprovação (CA)',
      content: `O QUE É O CA?

O Certificado de Aprovação é o documento que comprova que o EPI foi testado e aprovado pelo Ministério do Trabalho.

✓ Todo EPI deve ter CA válido
✓ O número do CA deve estar gravado no equipamento
✓ Consulta online: https://caepi.mte.gov.br
✓ Validade: 5 anos (renovável)

⚠️ EPI sem CA ou com CA vencido é IRREGULAR`,
      imageKeywords: ['certificado aprovação', 'ca epi'],
      type: 'content',
      duration: 45
    },
    {
      order: 13,
      title: 'Quiz - Teste seus Conhecimentos',
      content: `Pergunta 1: Quem é responsável por fornecer o EPI ao trabalhador?
a) O próprio trabalhador
b) O empregador
c) O sindicato
d) O governo

Pergunta 2: O que significa a sigla CA?
a) Controle de Acesso
b) Certificado de Aprovação
c) Comprovante de Aquisição
d) Cadastro de Acidentes`,
      type: 'quiz',
      duration: 60
    },
    {
      order: 14,
      title: 'Resumo - Pontos Importantes',
      content: `✓ EPI é obrigatório quando houver risco
✓ Deve sempre ter CA válido
✓ Empregador fornece, treina e fiscaliza
✓ Trabalhador usa corretamente e conserva
✓ Substituir imediatamente se danificado
✓ EPI não substitui medidas coletivas
✓ Recusa injustificada pode gerar demissão

SEGURANÇA É RESPONSABILIDADE DE TODOS!`,
      type: 'summary',
      duration: 30
    },
    {
      order: 15,
      title: 'Obrigado!',
      content: `Treinamento NR-06 - Equipamento de Proteção Individual

Lembre-se: Use sempre seu EPI!

Em caso de dúvidas, procure o SESMT ou a CIPA da sua empresa.

Data: ___/___/______
Assinatura: _______________________`,
      type: 'title',
      duration: 10
    }
  ]
}

// ============================================================================
// NR-35 - Trabalho em Altura
// ============================================================================

export const NR35_TEMPLATE: NRTemplate = {
  id: 'nr35-altura-completo',
  nr: 'NR-35',
  title: 'Trabalho em Altura',
  description: 'Treinamento sobre requisitos mínimos de proteção para trabalho em altura',
  category: 'Trabalho em Altura',
  duration: 40,
  tags: ['altura', 'queda', 'cinto segurança', 'andaime'],
  compliance: {
    version: 'Portaria MTE n.º 1.113/2016',
    lastUpdate: '2016-09-21',
    source: 'Ministério do Trabalho'
  },
  slides: [
    {
      order: 1,
      title: 'NR-35: Trabalho em Altura',
      content: 'Requisitos Mínimos para Proteção do Trabalhador',
      type: 'title',
      duration: 10
    },
    {
      order: 2,
      title: 'O que é Trabalho em Altura?',
      content: `Considera-se trabalho em altura toda atividade executada acima de 2,00 metros do nível inferior, onde haja risco de queda.

EXEMPLOS:
• Trabalho em telhados
• Montagem de estruturas
• Trabalho em andaimes
• Trabalho em escadas
• Manutenção de fachadas
• Trabalho em postes

⚠️ Queda de altura é uma das principais causas de morte no trabalho!`,
      imageKeywords: ['trabalho altura', 'andaime', 'segurança'],
      type: 'content',
      duration: 60
    },
    {
      order: 3,
      title: 'Responsabilidades do Empregador',
      content: `O empregador deve:

✓ Garantir implementação das medidas de proteção
✓ Assegurar realização da Análise de Risco (AR)
✓ Assegurar realização da Permissão de Trabalho (PT)
✓ Desenvolver procedimento operacional
✓ Assegurar avaliação prévia das condições do local
✓ Garantir que todo trabalho seja supervisionado
✓ Assegurar organização e arquivamento da documentação`,
      type: 'content',
      duration: 60
    },
    {
      order: 4,
      title: 'Responsabilidades do Trabalhador',
      content: `O trabalhador deve:

✓ Cumprir as disposições legais e regulamentares
✓ Colaborar com o empregador na implementação da NR
✓ Interromper atividades com evidência de risco grave e iminente
✓ Zelar pela sua segurança e de outras pessoas
✓ Participar dos treinamentos obrigatórios

⚠️ DIREITO DE RECUSA: O trabalhador pode interromper o trabalho sempre que constatar evidências de riscos graves!`,
      type: 'content',
      duration: 45
    },
    {
      order: 5,
      title: 'Capacitação e Treinamento',
      content: `TREINAMENTO INICIAL
• Carga horária mínima: 8 horas
• Teórico e prático
• Conteúdo programático definido na NR

TREINAMENTO PERIÓDICO
• A cada 2 anos
• Carga horária mínima: 8 horas

TREINAMENTO EVENTUAL
• Quando houver mudança de procedimentos
• Após acidente ou afastamento superior a 90 dias`,
      type: 'content',
      duration: 45
    },
    {
      order: 6,
      title: 'Planejamento do Trabalho',
      content: `Todo trabalho em altura deve ser planejado:

1. ANÁLISE DE RISCO (AR)
   • Identificar os riscos
   • Avaliar a probabilidade e consequências
   • Definir medidas de controle

2. PERMISSÃO DE TRABALHO (PT)
   • Documento formal de autorização
   • Descreve o serviço, local, data e responsáveis
   • Válida para cada execução

3. PROCEDIMENTO OPERACIONAL
   • Passo a passo da atividade
   • Medidas de segurança específicas`,
      type: 'content',
      duration: 60
    },
    {
      order: 7,
      title: 'Sistemas de Proteção contra Quedas',
      content: `SISTEMA DE PROTEÇÃO COLETIVA (SPC)
• Guarda-corpo
• Redes de proteção
• Plataformas de trabalho

SISTEMA DE PROTEÇÃO INDIVIDUAL (SPI)
• Cinturão de segurança tipo paraquedista
• Talabarte com absorvedor de energia
• Trava-quedas
• Linha de vida

⚠️ O SPC tem prioridade sobre o SPI!`,
      imageKeywords: ['cinto paraquedista', 'linha de vida', 'trava quedas'],
      type: 'content',
      duration: 60
    },
    {
      order: 8,
      title: 'Cinturão de Segurança Tipo Paraquedista',
      content: `CARACTERÍSTICAS:
• 5 pontos de ancoragem
• Argola dorsal para conexão do trava-quedas
• Argolas laterais para posicionamento
• Fitas ajustáveis nas pernas e peito

INSPEÇÃO ANTES DO USO:
✓ Verificar costuras
✓ Verificar fivelas e conectores
✓ Verificar desgaste nas fitas
✓ Verificar data de validade

⚠️ Nunca usar cinturão danificado!`,
      imageKeywords: ['cinturão paraquedista', 'cinto segurança altura'],
      type: 'content',
      duration: 45
    },
    {
      order: 9,
      title: 'Talabarte e Absorvedor de Energia',
      content: `TALABARTE
• Elemento de conexão entre cinturão e ancoragem
• Comprimento máximo: 0,90m (simples) ou 1,80m (duplo Y)

ABSORVEDOR DE ENERGIA
• Reduz a força de impacto em caso de queda
• Obrigatório em trabalhos acima de 2m
• Limite de força: 6 kN

TALABARTE DUPLO "Y"
• Permite deslocamento mantendo sempre um ponto conectado
• Ideal para trabalho em estruturas`,
      imageKeywords: ['talabarte', 'absorvedor energia'],
      type: 'content',
      duration: 45
    },
    {
      order: 10,
      title: 'Pontos de Ancoragem',
      content: `O ponto de ancoragem deve:

✓ Ser dimensionado por profissional habilitado
✓ Suportar carga mínima de 15 kN
✓ Estar situado acima da cintura do trabalhador
✓ Ser independente da estrutura de sustentação do trabalho

TIPOS DE ANCORAGEM:
• Estrutural (vigas, pilares)
• Linha de vida (cabo ou trilho)
• Dispositivos retráteis

⚠️ Nunca improvisar pontos de ancoragem!`,
      type: 'content',
      duration: 45
    },
    {
      order: 11,
      title: 'Escadas - Uso Seguro',
      content: `ESCADA PORTÁTIL:
• Fixar no topo e na base
• Manter as duas mãos livres para subir
• Não exceder limite de peso
• Ultrapassar 1m acima do nível de acesso

ESCADA DE MÃO:
• Ângulo de apoio: 75° (1:4)
• Piso estável e nivelado
• Não usar em superfícies escorregadias

⚠️ Escada NÃO é posto de trabalho!
    Use apenas para acesso`,
      imageKeywords: ['escada segurança', 'uso escada'],
      type: 'content',
      duration: 45
    },
    {
      order: 12,
      title: 'Andaimes - Requisitos',
      content: `MONTAGEM:
• Por trabalhadores capacitados
• Conforme projeto ou manual do fabricante
• Sobre base firme e nivelada

PROTEÇÃO:
• Guarda-corpo em todos os lados abertos
• Rodapé de no mínimo 20 cm
• Plataforma completa (sem vãos)

INSPEÇÃO:
• Diária antes do uso
• Após intempéries
• Documentada em checklist`,
      imageKeywords: ['andaime', 'andaime tubular'],
      type: 'content',
      duration: 60
    },
    {
      order: 13,
      title: 'Condições Impeditivas',
      content: `NÃO realizar trabalho em altura quando:

❌ Ventos superiores a 40 km/h
❌ Tempestades ou ameaça de descarga atmosférica  
❌ Iluminação insuficiente
❌ Superfícies escorregadias
❌ Trabalhador apresentar sintomas de:
   • Tontura ou vertigem
   • Efeito de medicamentos
   • Uso de álcool ou drogas

⚠️ Em caso de dúvida, NÃO EXECUTE o trabalho!`,
      type: 'content',
      duration: 45
    },
    {
      order: 14,
      title: 'Procedimentos de Emergência',
      content: `PLANO DE RESGATE:
• Deve existir ANTES do início do trabalho
• Pessoal treinado e equipamentos disponíveis
• Resgate em no máximo 10 minutos

TRAUMA DE SUSPENSÃO:
• Trabalhador suspenso pode sofrer síncope
• Posição ereta dificulta retorno venoso
• Resgate rápido é vital

PRIMEIROS SOCORROS:
• Chamar socorro especializado
• Manter vias aéreas livres
• Não movimentar vítima com suspeita de lesão`,
      type: 'content',
      duration: 45
    },
    {
      order: 15,
      title: 'Resumo - Pontos Críticos',
      content: `✓ Trabalho em altura: acima de 2 metros
✓ Análise de Risco e Permissão de Trabalho obrigatórias
✓ Treinamento de 8 horas, reciclagem a cada 2 anos
✓ Priorizar proteção coletiva
✓ Cinturão tipo paraquedista com talabarte duplo
✓ Ponto de ancoragem adequado (15 kN)
✓ Nunca improvisar, sempre planejar
✓ Conhecer e respeitar condições impeditivas

EM CASO DE DÚVIDA, NÃO EXECUTE!`,
      type: 'summary',
      duration: 30
    },
    {
      order: 16,
      title: 'Obrigado!',
      content: `Treinamento NR-35 - Trabalho em Altura

Sua segurança depende de você!

Data: ___/___/______
Assinatura: _______________________

Instrutor: _______________________`,
      type: 'title',
      duration: 10
    }
  ]
}

// ============================================================================
// NR-10 - Segurança em Instalações e Serviços em Eletricidade
// ============================================================================

export const NR10_TEMPLATE: NRTemplate = {
  id: 'nr10-eletricidade-basico',
  nr: 'NR-10',
  title: 'Segurança em Instalações Elétricas - Básico',
  description: 'Treinamento básico de segurança para trabalhos com eletricidade',
  category: 'Eletricidade',
  duration: 40,
  tags: ['eletricidade', 'choque elétrico', 'desenergização', 'bloqueio'],
  compliance: {
    version: 'Portaria MTb n.º 598/2004',
    lastUpdate: '2004-12-07',
    source: 'Ministério do Trabalho'
  },
  slides: [
    {
      order: 1,
      title: 'NR-10: Segurança em Eletricidade',
      content: 'Curso Básico de Segurança - 40 horas',
      type: 'title',
      duration: 10
    },
    {
      order: 2,
      title: 'Riscos em Instalações Elétricas',
      content: `PRINCIPAIS RISCOS:

⚡ CHOQUE ELÉTRICO
   • Contato direto ou indireto
   • Pode causar parada cardíaca

🔥 ARCO ELÉTRICO  
   • Queimaduras graves
   • Explosão de equipamentos

🔥 INCÊNDIO
   • Curto-circuito
   • Sobrecarga
   
⚠️ OUTROS RISCOS
   • Campos eletromagnéticos
   • Quedas de altura
   • Explosões em atmosferas explosivas`,
      imageKeywords: ['risco elétrico', 'choque elétrico'],
      type: 'content',
      duration: 60
    },
    {
      order: 3,
      title: 'Efeitos da Corrente no Corpo Humano',
      content: `A corrente elétrica que atravessa o corpo causa:

• 1 mA: Limiar de percepção (formigamento)
• 10 mA: Contração muscular (não consegue soltar)
• 30 mA: Paralisia respiratória
• 75 mA: Fibrilação ventricular
• 4 A: Parada cardíaca definitiva

FATORES QUE INFLUENCIAM:
• Intensidade da corrente
• Trajeto pelo corpo
• Tempo de exposição
• Resistência do corpo (seco/molhado)`,
      type: 'content',
      duration: 60
    },
    {
      order: 4,
      title: 'Medidas de Controle - Desenergização',
      content: `PROCEDIMENTO DE DESENERGIZAÇÃO:

1. SECCIONAMENTO
   Abertura do circuito por dispositivo de manobra

2. IMPEDIMENTO DE REENERGIZAÇÃO
   Bloqueio mecânico + sinalização

3. CONSTATAÇÃO DE AUSÊNCIA DE TENSÃO
   Detector de tensão adequado

4. INSTALAÇÃO DE ATERRAMENTO TEMPORÁRIO
   Equipotencialização e escoamento de cargas

5. PROTEÇÃO DOS ELEMENTOS ENERGIZADOS
   Barreiras, anteparos, invólucros

6. SINALIZAÇÃO DE IMPEDIMENTO
   Identificação clara do circuito`,
      imageKeywords: ['bloqueio elétrico', 'lockout tagout'],
      type: 'content',
      duration: 90
    },
    {
      order: 5,
      title: 'Trabalho em Instalações Energizadas',
      content: `SÓ É PERMITIDO quando:
• Desenergização gera riscos adicionais
• Impossibilidade técnica comprovada
• Necessidade de serviços contínuos

REQUISITOS:
✓ Procedimento específico aprovado
✓ Profissionais autorizados e capacitados
✓ EPIs e EPCs adequados
✓ Supervisão por profissional habilitado
✓ Análise de Risco documentada

TÉCNICAS:
• Ao contato (com luvas isolantes)
• À distância (com vara de manobra)
• Linha viva (potencial)`,
      type: 'content',
      duration: 60
    },
    {
      order: 6,
      title: 'Equipamentos de Proteção',
      content: `EPI PARA TRABALHOS ELÉTRICOS:

• Luvas isolantes de borracha (classe adequada)
• Manga isolante
• Calçado de segurança isolante
• Capacete de segurança classe B
• Óculos de proteção contra arco
• Vestimenta antichama (FR)

EPC - EQUIPAMENTO COLETIVO:

• Tapete isolante
• Manta isolante
• Detector de tensão
• Aterramento temporário
• Barreiras e sinalização`,
      imageKeywords: ['luva isolante', 'epi elétrico'],
      type: 'content',
      duration: 60
    },
    {
      order: 7,
      title: 'Sinalização de Segurança',
      content: `TIPOS DE SINALIZAÇÃO:

🔴 PERIGO - ALTA TENSÃO
   Cor vermelha, formato triangular

⚡ RISCO DE CHOQUE ELÉTRICO
   Símbolo da seta em triângulo

🚫 PROIBIDO
   Entrada em áreas restritas

ℹ️ INFORMAÇÃO
   Procedimentos e identificação

ETIQUETAS DE BLOQUEIO:
• Nome do executante
• Data e hora
• Motivo do bloqueio
• Previsão de liberação`,
      imageKeywords: ['sinalização elétrica', 'perigo alta tensão'],
      type: 'content',
      duration: 45
    },
    {
      order: 8,
      title: 'Primeiros Socorros - Choque Elétrico',
      content: `EM CASO DE CHOQUE ELÉTRICO:

1. NÃO TOQUE NA VÍTIMA se ainda estiver em contato com a fonte

2. DESLIGUE A ENERGIA
   Disjuntor, chave geral, ou remova o plugue

3. AFASTE A VÍTIMA DA FONTE
   Use material isolante (madeira seca, borracha)

4. CHAME O RESGATE (192/193)

5. INICIE RCP se necessário
   • Verificar consciência e respiração
   • 30 compressões x 2 ventilações

⚠️ A vítima pode parecer bem e ter parada cardíaca horas depois!`,
      imageKeywords: ['primeiros socorros', 'rcp'],
      type: 'content',
      duration: 60
    },
    {
      order: 9,
      title: 'Quiz - Conhecimentos',
      content: `1. Qual a principal causa de morte por choque elétrico?
a) Queimaduras
b) Fibrilação ventricular
c) Paralisia respiratória

2. Quantas etapas tem o procedimento de desenergização?
a) 4 etapas
b) 5 etapas  
c) 6 etapas

3. O trabalho em instalações energizadas é permitido?
a) Nunca
b) Sempre, com EPI
c) Apenas em casos específicos previstos na NR`,
      type: 'quiz',
      duration: 60
    },
    {
      order: 10,
      title: 'Resumo',
      content: `✓ Eletricidade pode matar - respeite os riscos
✓ Priorizar sempre a desenergização
✓ Seguir os 6 passos rigorosamente
✓ Usar EPIs e EPCs adequados
✓ Nunca trabalhar sozinho
✓ Conhecer primeiros socorros
✓ Qualquer dúvida = NÃO executar

ELETRICIDADE NÃO PERDOA IMPRUDÊNCIA!`,
      type: 'summary',
      duration: 30
    }
  ]
}

// ============================================================================
// NR-12 - Segurança no Trabalho em Máquinas e Equipamentos
// ============================================================================

export const NR12_TEMPLATE: NRTemplate = {
  id: 'nr12-maquinas-basico',
  nr: 'NR-12',
  title: 'Segurança em Máquinas e Equipamentos',
  description: 'Treinamento sobre princípios de segurança na operação de máquinas e equipamentos',
  category: 'Máquinas e Equipamentos',
  duration: 35,
  tags: ['máquinas', 'equipamentos', 'proteção', 'operação segura'],
  compliance: {
    version: 'Portaria SEPRT n.º 916/2019',
    lastUpdate: '2019-07-30',
    source: 'Ministério do Trabalho'
  },
  slides: [
    {
      order: 1,
      title: 'NR-12: Segurança em Máquinas e Equipamentos',
      content: 'Treinamento Obrigatório - Operação Segura',
      type: 'title',
      duration: 10
    },
    {
      order: 2,
      title: 'Objetivo da NR-12',
      content: `A NR-12 estabelece medidas de prevenção para garantir a saúde e integridade física dos trabalhadores.

APLICA-SE A:
• Máquinas e equipamentos novos e usados
• Todas as fases: projeto, fabricação, importação, comercialização, exposição e cessão
• Utilização em todas as atividades econômicas

PRINCÍPIO FUNDAMENTAL:
Máquinas devem ser seguras em TODAS as fases de vida útil`,
      notes: 'Enfatizar que a norma é abrangente e preventiva',
      imageKeywords: ['máquinas industriais', 'segurança'],
      type: 'content',
      duration: 45
    },
    {
      order: 3,
      title: 'Principais Riscos',
      content: `RISCOS MECÂNICOS:
⚠️ Esmagamento
⚠️ Corte e cisalhamento  
⚠️ Enroscamento
⚠️ Agarramento
⚠️ Impacto
⚠️ Perfuração
⚠️ Abrasão
⚠️ Projeção de materiais

ZONAS DE PERIGO:
• Pontos de operação
• Mecanismos de transmissão
• Partes móveis
• Alimentação e descarga`,
      imageKeywords: ['riscos máquinas', 'zona de perigo'],
      type: 'content',
      duration: 50
    },
    {
      order: 4,
      title: 'Sistemas de Segurança',
      content: `PROTEÇÕES FIXAS:
• Envolvem completamente a zona de perigo
• Removidas apenas com ferramentas
• Devem ser robustas e duráveis

PROTEÇÕES MÓVEIS:
• Com intertravamento (interlock)
• Máquina só funciona com proteção fechada
• Ao abrir, máquina para imediatamente

DISPOSITIVOS DE SEGURANÇA:
• Cortinas de luz
• Scanners de área
• Tapetes sensíveis
• Comandos bimanuais
• Botões de emergência`,
      notes: 'Demonstrar cada tipo se possível',
      type: 'content',
      duration: 60
    },
    {
      order: 5,
      title: 'Dispositivos de Parada de Emergência',
      content: `CARACTERÍSTICAS OBRIGATÓRIAS:

✓ Cor VERMELHA com fundo AMARELO
✓ Formato cogumelo (tipo soco)
✓ Acessível a qualquer momento
✓ Não pode ser usado como partida
✓ Deve manter a máquina parada até reset manual

LOCALIZAÇÃO:
• Em cada posto de trabalho
• Nas vias de acesso
• Próximo às zonas de perigo

⚠️ NUNCA desabilite ou ignore dispositivos de emergência!`,
      imageKeywords: ['botão emergência', 'parada emergência'],
      type: 'content',
      duration: 45
    },
    {
      order: 6,
      title: 'Procedimentos Seguros de Operação',
      content: `ANTES DE OPERAR:
1. Verificar proteções e dispositivos de segurança
2. Conferir EPIs necessários
3. Avaliar condições da máquina
4. Ler procedimentos operacionais

DURANTE A OPERAÇÃO:
• Manter atenção total
• Não usar celular ou fones
• Não improvisar ferramentas
• Respeitar sinalizações
• Comunicar qualquer anomalia

APÓS A OPERAÇÃO:
• Desligar corretamente
• Limpar a área de trabalho
• Reportar problemas encontrados`,
      type: 'content',
      duration: 50
    },
    {
      order: 7,
      title: 'Manutenção Segura',
      content: `PROCEDIMENTO LOTO (Lock Out / Tag Out):

1️⃣ COMUNICAR a todos os envolvidos
2️⃣ DESLIGAR a máquina normalmente
3️⃣ ISOLAR todas as fontes de energia
4️⃣ APLICAR dispositivos de bloqueio
5️⃣ SINALIZAR com etiquetas
6️⃣ VERIFICAR energia zero
7️⃣ EXECUTAR a manutenção
8️⃣ REMOVER bloqueios (só quem instalou)

⚠️ Cada trabalhador coloca SEU PRÓPRIO cadeado!`,
      imageKeywords: ['lockout tagout', 'bloqueio máquinas'],
      type: 'content',
      duration: 55
    },
    {
      order: 8,
      title: 'EPIs Específicos para Máquinas',
      content: `PROTEÇÃO OBRIGATÓRIA:

👓 ÓCULOS DE SEGURANÇA
   Contra projeção de partículas

🧤 LUVAS ADEQUADAS
   Conforme o risco (corte, abrasão)
   ⚠️ PROIBIDO em máquinas rotativas!

👂 PROTEÇÃO AUDITIVA
   Em ambientes com ruído > 85 dB

👢 CALÇADO DE SEGURANÇA
   Com biqueira de proteção

🦺 UNIFORME SEM PARTES SOLTAS
   Evitar enroscamento`,
      type: 'content',
      duration: 45
    },
    {
      order: 9,
      title: 'Quiz - Teste seus Conhecimentos',
      content: `1. Qual a cor obrigatória do botão de emergência?
a) Azul com fundo branco
b) Vermelho com fundo amarelo
c) Verde com fundo preto

2. O que significa LOTO?
a) Loteria de Trabalho Operacional
b) Lock Out / Tag Out (Bloqueio e Etiquetagem)
c) Lista de Operações Técnicas Obrigatórias

3. Luvas podem ser usadas em máquinas rotativas?
a) Sim, sempre
b) Não, risco de enroscamento
c) Apenas luvas de couro`,
      type: 'quiz',
      duration: 60
    },
    {
      order: 10,
      title: 'Resumo Final',
      content: `LEMBRE-SE SEMPRE:

✓ Proteções existem para te proteger - NUNCA desabilite
✓ Botão de emergência é seu amigo - saiba onde está
✓ Manutenção só com máquina bloqueada
✓ EPIs corretos para cada atividade
✓ Na dúvida, PARE e pergunte
✓ Acidentes com máquinas costumam ser graves

SEGURANÇA NÃO É OPÇÃO, É OBRIGAÇÃO!`,
      type: 'summary',
      duration: 30
    }
  ]
}

// ============================================================================
// NR-33 - Segurança e Saúde nos Trabalhos em Espaços Confinados
// ============================================================================

export const NR33_TEMPLATE: NRTemplate = {
  id: 'nr33-espaco-confinado',
  nr: 'NR-33',
  title: 'Trabalho em Espaços Confinados',
  description: 'Treinamento sobre identificação, avaliação e controle de riscos em espaços confinados',
  category: 'Espaços Confinados',
  duration: 40,
  tags: ['espaço confinado', 'atmosfera perigosa', 'resgate', 'permissão entrada'],
  compliance: {
    version: 'Portaria MTE n.º 1.409/2012',
    lastUpdate: '2012-08-29',
    source: 'Ministério do Trabalho'
  },
  slides: [
    {
      order: 1,
      title: 'NR-33: Trabalho em Espaços Confinados',
      content: 'Treinamento Obrigatório - Entrada e Trabalho Seguro',
      type: 'title',
      duration: 10
    },
    {
      order: 2,
      title: 'O que é Espaço Confinado?',
      content: `DEFINIÇÃO (NR-33):
Qualquer área ou ambiente não projetado para ocupação humana contínua, que possua meios limitados de entrada e saída, e onde exista ou possa existir atmosfera perigosa.

EXEMPLOS COMUNS:
• Tanques e vasos de pressão
• Silos e reservatórios
• Galerias e túneis
• Caixas d'água
• Poços de visita (bueiros)
• Porões de navios
• Fornos e caldeiras
• Dutos e tubulações`,
      notes: 'Mostrar fotos de exemplos reais',
      imageKeywords: ['espaço confinado', 'tanque', 'silo'],
      type: 'content',
      duration: 50
    },
    {
      order: 3,
      title: 'Por que é Perigoso?',
      content: `RISCOS ATMOSFÉRICOS:

🔴 DEFICIÊNCIA DE OXIGÊNIO (< 19,5%)
   Causa: consumo, deslocamento
   Efeito: inconsciência, morte

🟡 ENRIQUECIMENTO DE OXIGÊNIO (> 23%)
   Causa: vazamentos
   Efeito: risco de incêndio/explosão

⚫ GASES TÓXICOS
   H2S, CO, NH3, Cloro
   Efeito: intoxicação, morte

🔶 ATMOSFERA EXPLOSIVA
   Vapores, poeiras combustíveis
   LEL > 10% = PERIGO

⚠️ A maioria dos acidentes fatais em EC envolve resgate improvisado!`,
      type: 'content',
      duration: 55
    },
    {
      order: 4,
      title: 'Outros Riscos',
      content: `RISCOS FÍSICOS:
• Calor excessivo
• Ruído amplificado
• Iluminação deficiente
• Vibração

RISCOS MECÂNICOS:
• Engolfamento (grãos, líquidos)
• Equipamentos rotativos
• Queda de materiais
• Choque elétrico

RISCOS ERGONÔMICOS:
• Posturas inadequadas
• Esforço físico intenso
• Acesso difícil

RISCOS BIOLÓGICOS:
• Fungos, bactérias
• Animais peçonhentos`,
      imageKeywords: ['riscos espaço confinado'],
      type: 'content',
      duration: 45
    },
    {
      order: 5,
      title: 'Responsabilidades',
      content: `TRABALHADOR AUTORIZADO:
• Conhecer os riscos e medidas de controle
• Comunicar ao Vigia qualquer condição de risco
• Cumprir procedimentos e usar EPIs
• Pode recusar entrada se identificar risco

VIGIA:
• Permanecer FORA do espaço confinado
• Manter comunicação constante
• Controlar entrada e saída
• Acionar emergência quando necessário
• NUNCA entrar para resgatar

SUPERVISOR DE ENTRADA:
• Emitir a Permissão de Entrada e Trabalho (PET)
• Verificar medidas de controle
• Autorizar a entrada
• Encerrar a permissão`,
      type: 'content',
      duration: 50
    },
    {
      order: 6,
      title: 'Permissão de Entrada e Trabalho (PET)',
      content: `A PET É OBRIGATÓRIA e deve conter:

📋 Identificação do espaço confinado
📋 Propósito da entrada
📋 Data e duração autorizada
📋 Riscos identificados
📋 Medidas de controle
📋 Resultados de testes atmosféricos
📋 Equipamentos de resgate disponíveis
📋 Nome dos trabalhadores autorizados
📋 Assinatura do Supervisor

⚠️ Válida apenas para uma entrada
⚠️ Cancelada se condições mudarem
⚠️ Arquivar por no mínimo 1 ano`,
      imageKeywords: ['permissão entrada trabalho', 'PET'],
      type: 'content',
      duration: 55
    },
    {
      order: 7,
      title: 'Monitoramento Atmosférico',
      content: `ORDEM DE TESTE (obrigatória):

1️⃣ OXIGÊNIO (O2)
   Normal: 19,5% a 23%
   
2️⃣ GASES INFLAMÁVEIS
   Seguro: < 10% LEL
   
3️⃣ CONTAMINANTES TÓXICOS
   Conforme limites de tolerância

QUANDO MONITORAR:
✓ Antes da entrada
✓ Durante todo o trabalho
✓ Após qualquer interrupção
✓ Quando condições mudarem

⚠️ Teste em diferentes níveis (gases pesados descem, leves sobem)`,
      type: 'content',
      duration: 50
    },
    {
      order: 8,
      title: 'Equipamentos de Proteção',
      content: `EPIs OBRIGATÓRIOS:
• Capacete com jugular
• Óculos de proteção
• Luvas adequadas ao risco
• Calçado de segurança
• Cinto de segurança tipo paraquedista
• Linha de vida

EQUIPAMENTOS DE RESGATE:
• Tripé com guincho
• Trava-quedas retrátil
• Maca para espaços confinados
• Equipamento de respiração autônoma

EQUIPAMENTOS DE MEDIÇÃO:
• Detector multigás calibrado
• Explosímetro
• Oxímetro`,
      imageKeywords: ['epi espaço confinado', 'tripé resgate'],
      type: 'content',
      duration: 50
    },
    {
      order: 9,
      title: 'Procedimentos de Emergência',
      content: `SINAIS DE ALERTA:
• Comunicação interrompida
• Trabalhador não responde
• Alarme do detector de gás
• Mudança visível no ambiente

AÇÕES DO VIGIA:
1. NUNCA entre para resgatar!
2. Tente retirar com linha de vida
3. Acione emergência imediatamente
4. Mantenha área isolada
5. Aguarde equipe de resgate

⚠️ 60% DAS MORTES em EC são de pessoas tentando resgatar!

EQUIPE DE RESGATE:
• Treinada especificamente
• Equipamentos adequados
• Simulados periódicos`,
      type: 'content',
      duration: 55
    },
    {
      order: 10,
      title: 'Quiz - Avaliação',
      content: `1. O que caracteriza um espaço confinado?
a) Ambiente pequeno
b) Meios limitados de entrada/saída e risco atmosférico
c) Local subterrâneo

2. Qual a primeira medição atmosférica a ser feita?
a) Gases tóxicos
b) Gases inflamáveis
c) Oxigênio

3. O Vigia pode entrar para resgatar um trabalhador?
a) Sim, se for rápido
b) Sim, com máscara de proteção
c) Não, nunca`,
      type: 'quiz',
      duration: 60
    },
    {
      order: 11,
      title: 'Resumo Final',
      content: `REGRAS DE OURO:

✓ Sem PET válida = Sem entrada
✓ Sem teste atmosférico = Sem entrada
✓ Sem vigia = Sem entrada
✓ Sem comunicação = Saída imediata
✓ Condições mudaram = Evacuar e reavaliar
✓ Resgate improvisado = MAIS mortes

ESPAÇO CONFINADO EXIGE RESPEITO!
Sua vida depende de seguir os procedimentos.`,
      type: 'summary',
      duration: 30
    }
  ]
}

// ============================================================================
// NR-18 - Condições e Meio Ambiente de Trabalho na Indústria da Construção
// ============================================================================

export const NR18_TEMPLATE: NRTemplate = {
  id: 'nr18-construcao-basico',
  nr: 'NR-18',
  title: 'Segurança na Construção Civil',
  description: 'Treinamento sobre condições de segurança em canteiros de obras',
  category: 'Construção Civil',
  duration: 35,
  tags: ['construção civil', 'canteiro de obras', 'pcmat', 'proteção coletiva'],
  compliance: {
    version: 'Portaria SEPRT n.º 3.733/2020',
    lastUpdate: '2020-12-16',
    source: 'Ministério do Trabalho'
  },
  slides: [
    {
      order: 1,
      title: 'NR-18: Segurança na Construção Civil',
      content: 'Condições e Meio Ambiente de Trabalho na Indústria da Construção',
      type: 'title',
      duration: 10
    },
    {
      order: 2,
      title: 'Abrangência da NR-18',
      content: `A NR-18 se aplica a:

🏗️ Construção de edificações
🛣️ Infraestrutura (estradas, pontes)
🔧 Reformas e manutenção
🏚️ Demolições
⚡ Montagem e desmontagem de estruturas

DOCUMENTAÇÃO OBRIGATÓRIA:
• PGR - Programa de Gerenciamento de Riscos
• PCMSO - Programa de Controle Médico
• Ordem de Serviço
• Registros de treinamentos`,
      notes: 'Explicar que a NR-18 é uma das mais extensas e detalhadas',
      imageKeywords: ['construção civil', 'canteiro obras'],
      type: 'content',
      duration: 45
    },
    {
      order: 3,
      title: 'Principais Riscos na Construção',
      content: `RISCOS MAIS COMUNS:

⬇️ QUEDA DE ALTURA
   Principal causa de mortes (35%)

🧱 QUEDA DE MATERIAIS
   Sobre trabalhadores ou terceiros

⚡ CHOQUE ELÉTRICO
   Instalações provisórias

🔨 ACIDENTES COM MÁQUINAS
   Serras, betoneiras, gruas

🏗️ DESABAMENTO
   Escavações, estruturas instáveis

🌡️ CONDIÇÕES CLIMÁTICAS
   Calor, frio, chuva`,
      type: 'content',
      duration: 50
    },
    {
      order: 4,
      title: 'Proteção Contra Quedas',
      content: `SISTEMAS DE PROTEÇÃO COLETIVA:

GUARDA-CORPO:
• Altura mínima 1,20m
• Travessão intermediário
• Rodapé de 20cm

REDE DE PROTEÇÃO:
• Instalada o mais próximo do piso de trabalho
• Testada conforme normas técnicas
• Fixação resistente

PLATAFORMAS DE PROTEÇÃO:
• Primária: 1ª laje
• Secundárias: a cada 3 lajes

LINHA DE VIDA:
• Quando EPC não for viável
• Usar com cinto paraquedista`,
      imageKeywords: ['proteção queda', 'guarda corpo'],
      type: 'content',
      duration: 55
    },
    {
      order: 5,
      title: 'Escadas, Rampas e Passarelas',
      content: `ESCADAS DE MÃO:
• Comprimento máximo: 7m
• Apoio seguro (topo e base)
• Ultrapassar 1m acima do piso
• Proibido emendas improvisadas

ESCADAS DE USO COLETIVO:
• Largura mínima: 80cm
• Corrimão em ambos os lados
• Degraus uniformes

RAMPAS:
• Inclinação máxima: 30°
• Travessas a cada 40cm (se > 18°)
• Guarda-corpo lateral

PASSARELAS:
• Largura mínima: 60cm
• Guarda-corpo quando altura > 2m`,
      type: 'content',
      duration: 45
    },
    {
      order: 6,
      title: 'Escavações',
      content: `REGRAS DE SEGURANÇA:

📏 Profundidade > 1,25m:
   • Escoramento obrigatório OU
   • Taludes estáveis

🚧 ISOLAMENTO:
   • Sinalização adequada
   • Proteção contra queda de pessoas
   • Barreiras físicas

⚠️ ATENÇÃO ESPECIAL:
   • Redes subterrâneas (gás, elétrica, água)
   • Solo instável ou encharcado
   • Proximidade de edificações
   • Trânsito de máquinas

🔍 INSPEÇÃO DIÁRIA:
   Após chuvas ou vibrações significativas`,
      imageKeywords: ['escavação', 'escoramento'],
      type: 'content',
      duration: 50
    },
    {
      order: 7,
      title: 'Instalações Elétricas Provisórias',
      content: `REQUISITOS OBRIGATÓRIOS:

✓ Quadro de distribuição com DR
✓ Aterramento adequado
✓ Disjuntores dimensionados
✓ Cabos em bom estado (sem emendas)
✓ Proteção contra intempéries

PROIBIDO:
✗ Fios expostos ou desencapados
✗ Gambiarras e improvisos
✗ Conexões instáveis
✗ Sobrecarga de circuitos

MANUTENÇÃO:
• Somente por eletricista qualificado
• Inspeções periódicas documentadas`,
      type: 'content',
      duration: 45
    },
    {
      order: 8,
      title: 'EPIs na Construção Civil',
      content: `EQUIPAMENTOS OBRIGATÓRIOS:

⛑️ CAPACETE COM JUGULAR
   Em toda a obra

👢 CALÇADO DE SEGURANÇA
   Com biqueira e solado resistente

🧤 LUVAS
   Conforme a atividade

👓 ÓCULOS
   Contra projeção de partículas

🦺 CINTO DE SEGURANÇA
   Trabalho em altura (tipo paraquedista)

👂 PROTETOR AURICULAR
   Ambientes com ruído

🧪 RESPIRADOR
   Poeira, vapores, produtos químicos`,
      imageKeywords: ['epi construção', 'capacete obra'],
      type: 'content',
      duration: 45
    },
    {
      order: 9,
      title: 'Quiz - Teste seus Conhecimentos',
      content: `1. Qual a principal causa de mortes na construção?
a) Choque elétrico
b) Queda de altura
c) Soterramento

2. Altura mínima do guarda-corpo?
a) 1,00 metro
b) 1,10 metros
c) 1,20 metros

3. A partir de que profundidade a escavação precisa de escoramento?
a) 0,75 metros
b) 1,00 metro
c) 1,25 metros`,
      type: 'quiz',
      duration: 60
    },
    {
      order: 10,
      title: 'Resumo e Compromisso',
      content: `REGRAS DE SOBREVIVÊNCIA NA OBRA:

✓ Use SEMPRE o capacete
✓ Trabalho em altura = cinto + linha de vida
✓ Nunca mexa em instalações elétricas
✓ Escavações devem estar escoradas/sinalizadas
✓ Máquinas só por operadores habilitados
✓ Arrumação e limpeza = menos acidentes

A CONSTRUÇÃO CIVIL É UM DOS SETORES MAIS PERIGOSOS
Sua atenção salva sua vida!`,
      type: 'summary',
      duration: 30
    }
  ]
}

// ============================================================================
// Export All Templates
// ============================================================================

export const NR_TEMPLATES: NRTemplate[] = [
  NR06_TEMPLATE,
  NR35_TEMPLATE,
  NR10_TEMPLATE,
  NR12_TEMPLATE,
  NR33_TEMPLATE,
  NR18_TEMPLATE
]

export const NR_TEMPLATES_MAP: Record<string, NRTemplate> = {
  'nr06-epi-completo': NR06_TEMPLATE,
  'nr35-altura-completo': NR35_TEMPLATE,
  'nr10-eletricidade-basico': NR10_TEMPLATE,
  'nr12-maquinas-basico': NR12_TEMPLATE,
  'nr33-espaco-confinado': NR33_TEMPLATE,
  'nr18-construcao-basico': NR18_TEMPLATE
}

export function getTemplateByNR(nr: string): NRTemplate | undefined {
  return NR_TEMPLATES.find(t => t.nr.toLowerCase() === nr.toLowerCase())
}

export function getTemplateById(id: string): NRTemplate | undefined {
  return NR_TEMPLATES_MAP[id]
}

export default NR_TEMPLATES
