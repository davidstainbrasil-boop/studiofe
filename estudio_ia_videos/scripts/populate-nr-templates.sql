-- Script para popular templates NR no banco de dados local
-- Execute com: psql -U mvp_admin -d mvp_videos_db -f populate-nr-templates.sql

-- Limpar templates existentes
DELETE FROM nr_templates;

-- Inserir templates NR completos
INSERT INTO nr_templates (
  id, nr_number, title, description, slide_count, duration_seconds, 
  template_config, created_at, updated_at
) VALUES 
-- NR-01 - Disposições Gerais
(
  gen_random_uuid(), 
  'NR-01', 
  'Disposições Gerais e Gerenciamento de Riscos Ocupacionais',
  'Estabelece disposições gerais, campo de aplicação, termos e definições comuns às Normas Regulamentadoras.',
  8, 
  480,
  '{
    "themeColor": "#2563EB",
    "fontFamily": "Inter",
    "slides": [
      {"title": "Introdução à NR-01", "content": "O que são as Normas Regulamentadoras", "narration": "Bem-vindos ao curso sobre NR-01. Vamos conhecer as disposições gerais das normas regulamentadoras."},
      {"title": "Campo de Aplicação", "content": "Aplicável a todas as empresas e empregados CLT", "narration": "A NR-01 se aplica a todas as organizações e empregados regidos pela CLT."},
      {"title": "Responsabilidades", "content": "Deveres do empregador e do empregado", "narration": "Vamos conhecer as responsabilidades de empregadores e empregados."},
      {"title": "GRO - Gerenciamento de Riscos", "content": "Programa de Gerenciamento de Riscos Ocupacionais", "narration": "O GRO é fundamental para a gestão da segurança no trabalho."},
      {"title": "PGR - Programa de Gerenciamento de Riscos", "content": "Documentação e implementação do PGR", "narration": "O PGR documenta e implementa as ações de gestão de riscos."},
      {"title": "Inventário de Riscos", "content": "Identificação e avaliação de riscos ocupacionais", "narration": "O inventário de riscos identifica e avalia todos os perigos no ambiente de trabalho."},
      {"title": "Plano de Ação", "content": "Medidas de prevenção e controle", "narration": "O plano de ação define as medidas para prevenir e controlar os riscos."},
      {"title": "Conclusão", "content": "Resumo e próximos passos", "narration": "Parabéns! Você concluiu o módulo sobre NR-01."}
    ]
  }'::jsonb,
  NOW(),
  NOW()
),

-- NR-05 - CIPA
(
  gen_random_uuid(),
  'NR-05',
  'Comissão Interna de Prevenção de Acidentes (CIPA)',
  'Define as diretrizes para a constituição e funcionamento da CIPA.',
  7,
  420,
  '{
    "themeColor": "#06B6D4",
    "fontFamily": "Inter",
    "slides": [
      {"title": "O que é a CIPA", "content": "Comissão Interna de Prevenção de Acidentes", "narration": "A CIPA é a Comissão Interna de Prevenção de Acidentes e Assédio."},
      {"title": "Objetivo da CIPA", "content": "Prevenir acidentes e doenças do trabalho", "narration": "O objetivo principal é prevenir acidentes e doenças relacionadas ao trabalho."},
      {"title": "Composição", "content": "Representantes do empregador e dos empregados", "narration": "A CIPA é composta por representantes indicados pelo empregador e eleitos pelos empregados."},
      {"title": "Atribuições", "content": "Identificar riscos, propor medidas, fiscalizar", "narration": "As principais atribuições incluem identificar riscos e propor medidas de prevenção."},
      {"title": "Eleição da CIPA", "content": "Processo eleitoral democrático", "narration": "A eleição da CIPA deve ser democrática e transparente."},
      {"title": "Treinamento", "content": "Capacitação dos membros da CIPA", "narration": "Todos os membros devem receber treinamento específico."},
      {"title": "Conclusão", "content": "Importância da participação ativa", "narration": "A participação ativa de todos é fundamental para o sucesso da CIPA."}
    ]
  }'::jsonb,
  NOW(),
  NOW()
),

-- NR-06 - EPIs
(
  gen_random_uuid(),
  'NR-06',
  'Equipamentos de Proteção Individual (EPI)',
  'Estabelece as regras sobre fornecimento, uso e manutenção de EPIs.',
  10,
  600,
  '{
    "themeColor": "#10B981",
    "fontFamily": "Inter",
    "slides": [
      {"title": "O que é EPI", "content": "Equipamento de Proteção Individual", "narration": "EPI é todo dispositivo usado pelo trabalhador para proteção contra riscos."},
      {"title": "Quando usar EPI", "content": "Hierarquia das medidas de controle", "narration": "O EPI deve ser usado quando as medidas coletivas não eliminam os riscos."},
      {"title": "Tipos de EPIs", "content": "Proteção para cabeça, olhos, respiração, mãos, pés", "narration": "Existem EPIs para proteger diversas partes do corpo."},
      {"title": "Capacete de Segurança", "content": "Proteção contra impactos na cabeça", "narration": "O capacete protege contra quedas de objetos e impactos."},
      {"title": "Óculos de Proteção", "content": "Proteção contra partículas e respingos", "narration": "Os óculos protegem os olhos contra diversos agentes."},
      {"title": "Proteção Respiratória", "content": "Máscaras e respiradores", "narration": "A proteção respiratória é essencial em ambientes com poeiras e vapores."},
      {"title": "Luvas de Segurança", "content": "Proteção das mãos", "narration": "As luvas protegem contra cortes, produtos químicos e calor."},
      {"title": "Calçados de Segurança", "content": "Proteção dos pés", "narration": "Os calçados protegem contra quedas de objetos e perfurações."},
      {"title": "Certificado de Aprovação", "content": "CA obrigatório", "narration": "Todo EPI deve ter o Certificado de Aprovação do Ministério do Trabalho."},
      {"title": "Conclusão", "content": "Use sempre seu EPI", "narration": "Lembre-se: o EPI pode salvar sua vida!"}
    ]
  }'::jsonb,
  NOW(),
  NOW()
),

-- NR-10 - Eletricidade
(
  gen_random_uuid(),
  'NR-10',
  'Segurança em Instalações e Serviços em Eletricidade',
  'Estabelece as condições mínimas para segurança em eletricidade.',
  13,
  780,
  '{
    "themeColor": "#EAB308",
    "fontFamily": "Inter",
    "slides": [
      {"title": "Riscos Elétricos", "content": "Choque elétrico, arco elétrico, incêndio", "narration": "Os principais riscos elétricos são choque, arco elétrico e incêndio."},
      {"title": "Efeitos do Choque", "content": "Contração muscular, queimaduras, parada cardíaca", "narration": "O choque elétrico pode causar desde formigamento até a morte."},
      {"title": "Medidas de Proteção", "content": "Desenergização, bloqueio, sinalização", "narration": "A principal medida de proteção é trabalhar com equipamentos desenergizados."},
      {"title": "Zonas de Risco", "content": "Zona controlada e zona de risco", "narration": "Existem zonas de risco que determinam as distâncias de segurança."},
      {"title": "EPIs para Eletricidade", "content": "Luvas isolantes, vestimentas FR", "narration": "Os EPIs para trabalhos elétricos incluem luvas isolantes e vestimentas retardantes de chama."},
      {"title": "Procedimentos de Trabalho", "content": "APR, PT, análise de riscos", "narration": "Todo trabalho deve ser precedido de análise de riscos."},
      {"title": "Desenergização", "content": "Passos para desenergizar com segurança", "narration": "A desenergização segue um procedimento padronizado de segurança."},
      {"title": "Bloqueio e Etiquetagem", "content": "Lock-out Tag-out", "narration": "O bloqueio e etiquetagem garantem que o equipamento não será reenergizado."},
      {"title": "Trabalho em Alta Tensão", "content": "Requisitos especiais", "narration": "Trabalhos em alta tensão exigem procedimentos e EPIs específicos."},
      {"title": "Habilitação e Autorização", "content": "Treinamento obrigatório", "narration": "Somente trabalhadores habilitados e autorizados podem trabalhar com eletricidade."},
      {"title": "Situações de Emergência", "content": "Primeiros socorros, incêndio", "narration": "Todos devem saber como agir em situações de emergência elétrica."},
      {"title": "Responsabilidades", "content": "Empregador e empregado", "narration": "Tanto empregador quanto empregado têm responsabilidades na segurança elétrica."},
      {"title": "Conclusão", "content": "Eletricidade exige respeito", "narration": "Respeite sempre os procedimentos de segurança com eletricidade."}
    ]
  }'::jsonb,
  NOW(),
  NOW()
),

-- NR-12 - Máquinas e Equipamentos
(
  gen_random_uuid(),
  'NR-12',
  'Segurança no Trabalho em Máquinas e Equipamentos',
  'Define as medidas de proteção para máquinas e equipamentos.',
  12,
  720,
  '{
    "themeColor": "#DC2626",
    "fontFamily": "Inter",
    "slides": [
      {"title": "Introdução à NR-12", "content": "Segurança em máquinas e equipamentos", "narration": "A NR-12 estabelece medidas para garantir a segurança no trabalho com máquinas."},
      {"title": "Riscos Mecânicos", "content": "Esmagamento, corte, aprisionamento", "narration": "Os principais riscos em máquinas são esmagamento, corte e aprisionamento."},
      {"title": "Dispositivos de Segurança", "content": "Proteções fixas e móveis", "narration": "As proteções impedem o acesso a zonas de perigo."},
      {"title": "Sistemas de Segurança", "content": "Intertravamento, cortinas de luz", "narration": "Sistemas como intertravamento e cortinas de luz aumentam a segurança."},
      {"title": "Parada de Emergência", "content": "Botões e cabos de emergência", "narration": "Todo equipamento deve ter dispositivos de parada de emergência."},
      {"title": "Manutenção Segura", "content": "Procedimentos para manutenção", "narration": "A manutenção deve seguir procedimentos de segurança específicos."},
      {"title": "Capacitação", "content": "Treinamento de operadores", "narration": "Operadores devem receber treinamento adequado."},
      {"title": "Sinalização", "content": "Cores e símbolos de segurança", "narration": "A sinalização adequada alerta sobre os riscos."},
      {"title": "Transporte de Materiais", "content": "Equipamentos de movimentação", "narration": "Equipamentos de transporte também devem atender à NR-12."},
      {"title": "Documentação", "content": "Inventário e análise de riscos", "narration": "É obrigatório manter documentação atualizada das máquinas."},
      {"title": "Inspeções", "content": "Verificações periódicas", "narration": "Inspeções regulares garantem que os sistemas funcionam corretamente."},
      {"title": "Conclusão", "content": "Máquinas seguras, trabalhadores protegidos", "narration": "A NR-12 protege vidas quando implementada corretamente."}
    ]
  }'::jsonb,
  NOW(),
  NOW()
),

-- NR-17 - Ergonomia
(
  gen_random_uuid(),
  'NR-17',
  'Ergonomia',
  'Estabelece parâmetros para adaptação das condições de trabalho às características dos trabalhadores.',
  8,
  480,
  '{
    "themeColor": "#14B8A6",
    "fontFamily": "Inter",
    "slides": [
      {"title": "O que é Ergonomia", "content": "Adaptação do trabalho ao ser humano", "narration": "Ergonomia é a ciência que adapta o trabalho às características do trabalhador."},
      {"title": "Riscos Ergonômicos", "content": "LER/DORT, fadiga, estresse", "narration": "Os riscos ergonômicos podem causar lesões e doenças ocupacionais."},
      {"title": "Postura de Trabalho", "content": "Posições corretas e incorretas", "narration": "A postura adequada previne lesões e desconfortos."},
      {"title": "Mobiliário", "content": "Cadeiras, mesas, monitores", "narration": "O mobiliário deve ser adequado às características do trabalhador."},
      {"title": "Levantamento de Cargas", "content": "Técnicas seguras de levantamento", "narration": "O levantamento incorreto de cargas pode causar lesões na coluna."},
      {"title": "Pausas e Rodízios", "content": "Intervalos para recuperação", "narration": "Pausas regulares são essenciais para prevenir fadiga."},
      {"title": "AET - Análise Ergonômica", "content": "Avaliação das condições de trabalho", "narration": "A AET identifica e propõe melhorias nas condições de trabalho."},
      {"title": "Conclusão", "content": "Trabalho confortável e produtivo", "narration": "A ergonomia melhora a qualidade de vida e a produtividade."}
    ]
  }'::jsonb,
  NOW(),
  NOW()
),

-- NR-35 - Trabalho em Altura
(
  gen_random_uuid(),
  'NR-35',
  'Trabalho em Altura',
  'Estabelece os requisitos mínimos para trabalho em altura acima de 2 metros.',
  10,
  600,
  '{
    "themeColor": "#EF4444",
    "fontFamily": "Inter",
    "slides": [
      {"title": "O que é Trabalho em Altura", "content": "Atividades acima de 2 metros do piso", "narration": "Trabalho em altura é toda atividade executada acima de 2 metros."},
      {"title": "Riscos de Queda", "content": "Consequências de quedas de altura", "narration": "Quedas de altura são uma das principais causas de acidentes fatais."},
      {"title": "Capacitação", "content": "Treinamento obrigatório de 8 horas", "narration": "Todo trabalhador deve receber treinamento teórico e prático."},
      {"title": "Aptidão para Trabalho", "content": "ASO específico para altura", "narration": "O trabalhador deve estar apto física e mentalmente para trabalho em altura."},
      {"title": "Análise de Risco", "content": "APR e PT para cada atividade", "narration": "Toda atividade em altura deve ser precedida de análise de riscos."},
      {"title": "EPIs Obrigatórios", "content": "Cinto, talabarte, capacete", "narration": "Os EPIs essenciais são cinto de segurança, talabarte e capacete."},
      {"title": "Sistemas de Ancoragem", "content": "Pontos de ancoragem seguros", "narration": "Os pontos de ancoragem devem suportar cargas definidas."},
      {"title": "Acessos", "content": "Escadas, andaimes, plataformas", "narration": "Os sistemas de acesso devem ser seguros e adequados."},
      {"title": "Emergência e Resgate", "content": "Plano de emergência", "narration": "É obrigatório ter um plano de emergência para resgate."},
      {"title": "Conclusão", "content": "Segurança sempre em primeiro lugar", "narration": "Trabalho em altura exige planejamento e cuidado extremo."}
    ]
  }'::jsonb,
  NOW(),
  NOW()
);

-- Verificar inserção
SELECT nr_number, title, slide_count FROM nr_templates ORDER BY nr_number;

