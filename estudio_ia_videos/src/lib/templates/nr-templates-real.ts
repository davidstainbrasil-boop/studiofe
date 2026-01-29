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
// Export All Templates
// ============================================================================

export const NR_TEMPLATES: NRTemplate[] = [
  NR06_TEMPLATE,
  NR35_TEMPLATE,
  NR10_TEMPLATE
]

export const NR_TEMPLATES_MAP: Record<string, NRTemplate> = {
  'nr06-epi-completo': NR06_TEMPLATE,
  'nr35-altura-completo': NR35_TEMPLATE,
  'nr10-eletricidade-basico': NR10_TEMPLATE
}

export function getTemplateByNR(nr: string): NRTemplate | undefined {
  return NR_TEMPLATES.find(t => t.nr.toLowerCase() === nr.toLowerCase())
}

export function getTemplateById(id: string): NRTemplate | undefined {
  return NR_TEMPLATES_MAP[id]
}

export default NR_TEMPLATES
