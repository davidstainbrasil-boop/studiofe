# 📋 PRD — Estúdio IA Vídeos TécnicoCursos

**Versão:** 2.0  
**Data:** 01 de Fevereiro de 2026  
**Status:** Em Desenvolvimento  
**Owner:** Product Team  

---

## 📑 Índice

1. [Visão Geral](#1-visão-geral)
2. [Problema e Oportunidade](#2-problema-e-oportunidade)
3. [Público-Alvo](#3-público-alvo)
4. [Proposta de Valor](#4-proposta-de-valor)
5. [Requisitos Funcionais](#5-requisitos-funcionais)
6. [Requisitos Não-Funcionais](#6-requisitos-não-funcionais)
7. [User Stories](#7-user-stories)
8. [Fluxos de Usuário](#8-fluxos-de-usuário)
9. [Arquitetura Técnica](#9-arquitetura-técnica)
10. [Modelo de Dados](#10-modelo-de-dados)
11. [APIs e Integrações](#11-apis-e-integrações)
12. [Monetização](#12-monetização)
13. [Métricas de Sucesso](#13-métricas-de-sucesso)
14. [Roadmap](#14-roadmap)
15. [Riscos e Mitigações](#15-riscos-e-mitigações)
16. [Glossário](#16-glossário)

---

## 1. Visão Geral

### 1.1 Descrição do Produto

O **Estúdio IA Vídeos TécnicoCursos** é uma plataforma SaaS que permite criar vídeos profissionais de treinamento a partir de apresentações PowerPoint (PPTX), utilizando inteligência artificial para narração, avatares e edição automatizada.

### 1.2 Missão

> "Democratizar a criação de vídeos de treinamento corporativo, permitindo que qualquer profissional produza conteúdo audiovisual de qualidade profissional em minutos, não semanas."

### 1.3 Visão

Ser a plataforma líder no Brasil para criação automatizada de vídeos de treinamento em segurança do trabalho (NRs) e compliance corporativo até 2028.

### 1.4 Resumo Executivo

| Aspecto | Descrição |
|---------|-----------|
| **Produto** | Plataforma web de criação de vídeos com IA |
| **Mercado** | Treinamentos corporativos NR no Brasil |
| **Diferencial** | PPTX → Vídeo em minutos, não semanas |
| **Modelo** | SaaS com planos Free/Pro/Business |
| **Meta 60 dias** | 50 assinantes, R$ 5.000 MRR |
| **Meta 12 meses** | 500 assinantes, R$ 50.000 MRR |

---

## 2. Problema e Oportunidade

### 2.1 O Problema

Empresas brasileiras enfrentam desafios críticos na produção de vídeos de treinamento:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CENÁRIO ATUAL DE CRIAÇÃO DE VÍDEOS DE TREINAMENTO NR                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  💰 CUSTO ALTO                                                          │
│  ├── Produtora de vídeo: R$ 5.000 - R$ 15.000 por vídeo                │
│  ├── Equipamento próprio: R$ 20.000+ investimento inicial              │
│  └── Estúdio + ator: R$ 3.000/dia de gravação                          │
│                                                                         │
│  ⏱️ TEMPO EXCESSIVO                                                     │
│  ├── Briefing → Roteiro: 3-5 dias                                      │
│  ├── Gravação: 1-2 dias                                                │
│  ├── Edição: 5-10 dias                                                 │
│  └── Revisões: 3-7 dias                                                │
│  Total: 2-4 SEMANAS por vídeo                                          │
│                                                                         │
│  👥 DEPENDÊNCIA DE ESPECIALISTAS                                        │
│  ├── Roteirista                                                        │
│  ├── Videomaker                                                        │
│  ├── Editor de vídeo                                                   │
│  ├── Locutor profissional                                              │
│  └── Coordenador de produção                                           │
│                                                                         │
│  📋 PRESSÃO REGULATÓRIA                                                 │
│  ├── 37 NRs com atualizações frequentes                                │
│  ├── eSocial exige registros digitais                                  │
│  ├── Fiscalização intensificada (+40% multas em 2025)                  │
│  └── Prazo curto para adequação                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Dores Específicas dos Usuários

| Persona | Dor Principal | Impacto |
|---------|---------------|---------|
| **Técnico de Segurança** | "Não sei editar vídeo, mas preciso entregar treinamentos visuais" | Usa só PPT ou paga caro |
| **Consultoria SST** | "Atendo 50 clientes e não consigo escalar produção de vídeos" | Margem apertada |
| **RH/T&D** | "Orçamento não cobre produtora profissional" | Conteúdo de baixa qualidade |
| **Produtor EAD** | "Ferramentas gringas são caras e não falam português direito" | Credibilidade comprometida |

### 2.3 Oportunidade de Mercado

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TAMANHO DE MERCADO (TAM → SAM → SOM)                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TAM (Total Addressable Market)                                        │
│  Educação Digital Global: USD 95.7 bi (2030)                           │
│                                                                         │
│  SAM (Serviceable Addressable Market)                                  │
│  Treinamento Corporativo Brasil: R$ 12 bi/ano                          │
│  └── Segmento SST/NR: ~R$ 2 bi/ano                                     │
│                                                                         │
│  SOM (Serviceable Obtainable Market)                                   │
│  PMEs + Consultorias SST Brasil: ~50.000 empresas                      │
│  └── Conversão realista 1%: 500 clientes                               │
│  └── Ticket médio R$ 150/mês: R$ 900.000 ARR                           │
│                                                                         │
│  📈 DRIVERS DE CRESCIMENTO                                              │
│  ├── eSocial 2024-2026: digitalização obrigatória                      │
│  ├── Trabalho remoto: treinamentos presenciais caros                   │
│  ├── IA generativa: custos de produção despencando                     │
│  └── NR-1 atualizada: exige evidências de capacitação                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Público-Alvo

### 3.1 Personas Primárias

#### Persona 1: Carlos — Técnico de Segurança do Trabalho

```yaml
Nome: Carlos Silva
Idade: 38 anos
Cargo: Técnico de Segurança do Trabalho
Empresa: Indústria metalúrgica (200 funcionários)
Formação: Técnico em Segurança do Trabalho

Contexto:
  - Responsável por todos os treinamentos NR da empresa
  - Cria apresentações em PowerPoint com conteúdo técnico
  - Não domina edição de vídeo
  - Orçamento limitado para terceirizar

Dores:
  - "Meus PPTs são bons, mas ninguém assiste com atenção"
  - "Não tenho tempo nem skill para aprender Premiere"
  - "Chefe quer vídeos profissionais mas não libera verba"
  - "Cada NR atualizada = refazer todo o treinamento"

Objetivos:
  - Criar vídeos profissionais sem depender de outros
  - Manter compliance em dia
  - Impressionar a diretoria
  - Reduzir acidentes com treinamentos efetivos

Comportamento Digital:
  - Usa LinkedIn para networking
  - Busca templates no Google
  - Assiste tutoriais no YouTube
  - Prefere soluções "clique e pronto"

Budget:
  - Pessoal: até R$ 200/mês
  - Empresa: até R$ 500/mês (precisa aprovar)
```

#### Persona 2: Mariana — Dona de Consultoria SST

```yaml
Nome: Mariana Oliveira
Idade: 45 anos
Cargo: Sócia-proprietária
Empresa: Consultoria SST (ela + 3 técnicos)
Clientes: 50 empresas

Contexto:
  - Oferece pacote de treinamentos NR para clientes
  - Precisa personalizar vídeos com logo de cada cliente
  - Cobra por vídeo entregue
  - Margem apertada competindo com consultorias grandes

Dores:
  - "Não consigo escalar, cada vídeo demora demais"
  - "Clientes pedem revisões infinitas"
  - "Perco contratos por não ter vídeos profissionais"
  - "White-label é caro demais"

Objetivos:
  - Produzir 10+ vídeos por semana
  - Oferecer white-label para clientes
  - Aumentar margem por projeto
  - Diferenciar-se da concorrência

Comportamento Digital:
  - Muito ativa em grupos de WhatsApp de SST
  - Participa de congressos (CONEST, etc.)
  - Usa ferramentas de gestão (Notion, Trello)
  - Disposta a pagar por eficiência

Budget:
  - Até R$ 500/mês por ferramenta que resolva o problema
  - Repassa custo para cliente se necessário
```

#### Persona 3: Roberto — Coordenador de T&D

```yaml
Nome: Roberto Mendes
Idade: 52 anos
Cargo: Coordenador de Treinamento e Desenvolvimento
Empresa: Construtora (800 funcionários, 15 obras)
Equipe: 2 analistas de T&D

Contexto:
  - Gerencia LMS corporativo (Moodle)
  - Precisa de conteúdo para múltiplas obras
  - Trabalhadores com baixa escolaridade
  - Rotatividade alta = treinamento constante

Dores:
  - "Treinamento presencial é logística impossível"
  - "Vídeos longos demais, ninguém assiste"
  - "Produtora entrega em 3 semanas, preciso em 3 dias"
  - "Conteúdo fica desatualizado rápido"

Objetivos:
  - Centralizar treinamentos em vídeo
  - Padronizar conteúdo entre obras
  - Reduzir acidentes (KPI principal)
  - Comprovar treinamentos para fiscalização

Comportamento Digital:
  - Usa LMS corporativo
  - Prefere soluções enterprise
  - Precisa de relatórios para diretoria
  - Valoriza suporte e SLA

Budget:
  - R$ 2.000-5.000/mês aprovado para ferramentas
  - Decide junto com TI e Jurídico
```

### 3.2 Personas Secundárias

| Persona | Descrição | Prioridade |
|---------|-----------|------------|
| **Produtor de EAD** | Cria cursos online para vender | Média |
| **Professor/Instrutor** | Aulas híbridas pós-pandemia | Baixa |
| **Marketing Interno** | Vídeos institucionais | Baixa |

### 3.3 Anti-Personas (Quem NÃO é nosso cliente)

- ❌ **Youtubers/Influencers** — Precisam de edição criativa, não templates
- ❌ **Agências de publicidade** — Usam After Effects, Cinema4D
- ❌ **Grandes corporações (10k+ funcionários)** — Já têm produtora interna
- ❌ **Usuários que não falam português** — Foco Brasil

---

## 4. Proposta de Valor

### 4.1 Value Proposition Canvas

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PROPOSTA DE VALOR                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  JOBS TO BE DONE (O que o cliente quer realizar)                       │
│  ├── Criar vídeos de treinamento NR                                    │
│  ├── Manter compliance regulatório                                     │
│  ├── Engajar funcionários em treinamentos                              │
│  └── Comprovar capacitação para fiscalização                           │
│                                                                         │
│  PAINS (Dores atuais)                                                  │
│  ├── Processo caro e demorado                                          │
│  ├── Dependência de especialistas externos                             │
│  ├── Ferramentas complexas demais                                      │
│  └── Conteúdo em português de baixa qualidade                          │
│                                                                         │
│  GAINS (Ganhos desejados)                                              │
│  ├── Autonomia para criar vídeos                                       │
│  ├── Velocidade (horas, não semanas)                                   │
│  ├── Qualidade profissional                                            │
│  └── Custo acessível                                                   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                        NOSSA SOLUÇÃO                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PAIN RELIEVERS (Como aliviamos as dores)                              │
│  ├── Upload de PPTX → Vídeo em minutos                                 │
│  ├── Zero conhecimento de edição necessário                            │
│  ├── Interface drag-and-drop intuitiva                                 │
│  ├── TTS natural em português brasileiro                               │
│  └── Preço acessível em reais (não dólar)                              │
│                                                                         │
│  GAIN CREATORS (Como geramos ganhos)                                   │
│  ├── Templates NR prontos para usar                                    │
│  ├── Avatares IA com lip-sync realista                                 │
│  ├── Editor visual simplificado                                        │
│  ├── Export para LMS (SCORM)                                           │
│  └── Certificados de conclusão automáticos                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Unique Selling Proposition (USP)

> **"Do PowerPoint ao Vídeo Profissional em 10 Minutos"**

### 4.3 Diferenciais Competitivos

| Diferencial | Nós | Synthesia | Lumen5 | Produtora |
|-------------|-----|-----------|--------|-----------|
| **PPTX import fiel** | ✅ 100% layout | ⚠️ Parcial | ⚠️ Perde formato | ❌ Manual |
| **TTS português BR** | ✅ Nativo | ⚠️ Sotaque PT | ❌ Robótico | ✅ Locutor |
| **Templates NR** | ✅ 38 NRs | ❌ | ❌ | ⚠️ Sob demanda |
| **Preço** | R$ 97/mês | $90/mês (~R$500) | $79/mês | R$ 5.000/vídeo |
| **Tempo** | 10 minutos | 30 minutos | 20 minutos | 2-4 semanas |
| **Avatar lip-sync** | ✅ | ✅ | ❌ | ✅ |

---

## 5. Requisitos Funcionais

### 5.1 Épicos e Features

#### Épico 1: Importação e Processamento de Conteúdo

| ID | Feature | Prioridade | Status |
|----|---------|------------|--------|
| F1.1 | Upload de arquivo PPTX (drag-and-drop) | P0 | ✅ Implementado |
| F1.2 | Parser de slides (texto, imagens, layout) | P0 | ✅ Implementado |
| F1.3 | Extração de notas do apresentador | P0 | ✅ Implementado |
| F1.4 | Preservação de temas e cores | P1 | ✅ Implementado |
| F1.5 | Suporte a animações básicas | P2 | 🔄 Parcial |
| F1.6 | Import de PDF | P3 | ❌ Backlog |
| F1.7 | Import de Google Slides | P3 | ❌ Backlog |

#### Épico 2: Edição Visual

| ID | Feature | Prioridade | Status |
|----|---------|------------|--------|
| F2.1 | Timeline multi-track | P0 | ✅ Implementado |
| F2.2 | Editor de texto inline | P0 | ✅ Implementado |
| F2.3 | Reordenação de slides (drag-drop) | P0 | ✅ Implementado |
| F2.4 | Preview em tempo real | P0 | ✅ Implementado |
| F2.5 | Ajuste de duração por slide | P1 | ✅ Implementado |
| F2.6 | Transições entre slides | P1 | 🔄 Parcial |
| F2.7 | Biblioteca de música de fundo | P2 | ❌ Backlog |
| F2.8 | Efeitos sonoros | P3 | ❌ Backlog |

#### Épico 3: Narração com IA (TTS)

| ID | Feature | Prioridade | Status |
|----|---------|------------|--------|
| F3.1 | Geração de áudio a partir de texto | P0 | ✅ Implementado |
| F3.2 | Múltiplas vozes PT-BR | P0 | ✅ Implementado |
| F3.3 | Controle de velocidade de fala | P1 | ✅ Implementado |
| F3.4 | Preview de voz antes de gerar | P1 | ✅ Implementado |
| F3.5 | Ajuste de entonação/emoção | P2 | 🔄 Parcial |
| F3.6 | Upload de áudio próprio | P2 | ❌ Backlog |
| F3.7 | Clonagem de voz | P3 | ❌ Backlog |

#### Épico 4: Avatar IA

| ID | Feature | Prioridade | Status |
|----|---------|------------|--------|
| F4.1 | Galeria de avatares pré-definidos | P1 | ✅ Implementado |
| F4.2 | Lip-sync automático | P1 | ✅ Implementado |
| F4.3 | Posicionamento do avatar no frame | P1 | ✅ Implementado |
| F4.4 | Gestos e expressões básicas | P2 | 🔄 Parcial |
| F4.5 | Avatar customizado (upload foto) | P3 | ❌ Backlog |
| F4.6 | Mascote/personagem animado | P3 | ❌ Backlog |

#### Épico 5: Renderização e Export

| ID | Feature | Prioridade | Status |
|----|---------|------------|--------|
| F5.1 | Renderização em background (queue) | P0 | ✅ Implementado |
| F5.2 | Progresso em tempo real (SSE) | P0 | ✅ Implementado |
| F5.3 | Download MP4 (1080p) | P0 | ✅ Implementado |
| F5.4 | Cancelamento de render | P1 | ✅ Implementado |
| F5.5 | Export 4K | P2 | ❌ Backlog |
| F5.6 | Export SCORM para LMS | P2 | ❌ Backlog |
| F5.7 | Embed code para sites | P2 | ❌ Backlog |
| F5.8 | Geração de certificado PDF | P2 | ❌ Backlog |

#### Épico 6: Templates NR

| ID | Feature | Prioridade | Status |
|----|---------|------------|--------|
| F6.1 | Galeria de templates NR | P0 | ✅ Implementado |
| F6.2 | Templates NR-1, NR-5, NR-6, NR-10, NR-35 | P0 | ✅ Implementado |
| F6.3 | Customização de template | P1 | ✅ Implementado |
| F6.4 | Templates NR-12, NR-33, NR-18 | P1 | 🔄 Parcial |
| F6.5 | Todas as 37 NRs | P2 | ❌ Backlog |
| F6.6 | Criação de template pelo usuário | P3 | ❌ Backlog |

#### Épico 7: Autenticação e Usuários

| ID | Feature | Prioridade | Status |
|----|---------|------------|--------|
| F7.1 | Cadastro com email/senha | P0 | ✅ Implementado |
| F7.2 | Login com Google | P1 | ✅ Implementado |
| F7.3 | Recuperação de senha | P0 | ✅ Implementado |
| F7.4 | Perfil do usuário | P1 | ✅ Implementado |
| F7.5 | RBAC (admin, user, viewer) | P1 | ✅ Implementado |
| F7.6 | Workspace multi-usuário | P2 | ❌ Backlog |
| F7.7 | SSO corporativo (SAML) | P3 | ❌ Backlog |

#### Épico 8: Monetização

| ID | Feature | Prioridade | Status |
|----|---------|------------|--------|
| F8.1 | Planos Free/Pro/Business | P0 | ❌ A fazer |
| F8.2 | Checkout Stripe (cartão + PIX) | P0 | ❌ A fazer |
| F8.3 | Limites por plano (vídeos/mês) | P0 | ❌ A fazer |
| F8.4 | Paywall ao atingir limite | P0 | ❌ A fazer |
| F8.5 | Portal de billing (upgrade/cancel) | P1 | ❌ A fazer |
| F8.6 | Cupons de desconto | P2 | ❌ Backlog |
| F8.7 | Plano anual com desconto | P2 | ❌ Backlog |

#### Épico 9: Onboarding e UX

| ID | Feature | Prioridade | Status |
|----|---------|------------|--------|
| F9.1 | Landing page de vendas | P0 | ❌ A fazer |
| F9.2 | Onboarding wizard (4 steps) | P0 | ❌ A fazer |
| F9.3 | Tour guiado no editor | P1 | ❌ A fazer |
| F9.4 | Tooltips contextuais | P2 | ❌ Backlog |
| F9.5 | Central de ajuda | P2 | ❌ Backlog |
| F9.6 | Chat de suporte | P2 | ❌ Backlog |

### 5.2 Matriz de Priorização

```
                    IMPACTO NO USUÁRIO
                    Alto                Baixo
                ┌──────────────────┬──────────────────┐
         Alto   │   P0 - FAZER     │   P2 - DEPOIS    │
  IMPACTO       │   AGORA          │                  │
  NA RECEITA    │   • Stripe       │   • 4K export    │
                │   • Onboarding   │   • SCORM        │
                │   • Landing page │   • Música BG    │
                ├──────────────────┼──────────────────┤
         Baixo  │   P1 - PRÓXIMO   │   P3 - BACKLOG   │
                │                  │                  │
                │   • Mais NRs     │   • Voice clone  │
                │   • Avatar custom│   • SSO          │
                │   • Cupons       │   • Google Slides│
                └──────────────────┴──────────────────┘
```

---

## 6. Requisitos Não-Funcionais

### 6.1 Performance

| Métrica | Requisito | Atual |
|---------|-----------|-------|
| **Tempo de upload PPTX** | < 5s para 10MB | ✅ ~3s |
| **Parsing de slides** | < 10s para 50 slides | ✅ ~8s |
| **Geração TTS** | < 30s para 5 min de áudio | ✅ ~25s |
| **Render de vídeo** | < 3 min para 5 min de vídeo | ⚠️ ~4 min |
| **TTFB (Time to First Byte)** | < 200ms | ✅ ~150ms |
| **LCP (Largest Contentful Paint)** | < 2.5s | ✅ ~2s |

### 6.2 Escalabilidade

| Cenário | Requisito |
|---------|-----------|
| Usuários simultâneos | 500 (MVP), 5.000 (12 meses) |
| Jobs de render paralelos | 10 (MVP), 50 (12 meses) |
| Storage de vídeos | 1TB (MVP), 10TB (12 meses) |
| Requests/minuto | 1.000 (MVP), 10.000 (12 meses) |

### 6.3 Disponibilidade

| Métrica | Requisito |
|---------|-----------|
| Uptime | 99.5% (MVP), 99.9% (12 meses) |
| RPO (Recovery Point Objective) | 24 horas |
| RTO (Recovery Time Objective) | 4 horas |
| Backup | Diário, retenção 30 dias |

### 6.4 Segurança

| Requisito | Status |
|-----------|--------|
| HTTPS obrigatório | ✅ |
| Autenticação JWT | ✅ |
| Row Level Security (RLS) | ✅ |
| Rate limiting | ✅ |
| LGPD compliance | ✅ (export/delete data) |
| Criptografia em repouso | ✅ (Supabase) |
| Audit logging | ✅ |
| 2FA | ❌ Backlog |

### 6.5 Compatibilidade

| Plataforma | Suporte |
|------------|---------|
| Chrome 90+ | ✅ Primário |
| Firefox 90+ | ✅ Primário |
| Safari 14+ | ✅ Primário |
| Edge 90+ | ✅ Primário |
| Mobile (responsive) | ⚠️ Básico |
| IE11 | ❌ Não suportado |

### 6.6 Observabilidade

| Ferramenta | Uso |
|------------|-----|
| Sentry | Error tracking |
| Pino Logger | Application logs |
| Supabase Analytics | Database metrics |
| Vercel Analytics | Web vitals |
| BullMQ Dashboard | Queue monitoring |

---

## 7. User Stories

### 7.1 Épico: Criação de Vídeo (Core)

```gherkin
US-001: Upload de PPTX
Como um Técnico de Segurança
Quero fazer upload do meu PowerPoint existente
Para não precisar recriar o conteúdo do zero

Critérios de Aceite:
- DADO que estou na tela de novo projeto
- QUANDO arrasto um arquivo PPTX para a área de upload
- ENTÃO o arquivo é processado em < 10 segundos
- E todos os slides são extraídos com texto e imagens
- E as notas do apresentador são preservadas
- E sou redirecionado para o editor

Cenários de Erro:
- Arquivo > 50MB: mostrar mensagem "Arquivo muito grande"
- Arquivo corrompido: mostrar "Não foi possível processar"
- Formato errado: mostrar "Apenas arquivos .pptx são suportados"
```

```gherkin
US-002: Escolha de Voz para Narração
Como um usuário
Quero escolher entre diferentes vozes brasileiras
Para que a narração combine com o tom do treinamento

Critérios de Aceite:
- DADO que estou no editor de projeto
- QUANDO clico em "Configurar Voz"
- ENTÃO vejo pelo menos 3 opções de voz PT-BR
- E cada voz tem preview de áudio
- E posso ajustar velocidade (0.75x a 1.5x)
- E a seleção é salva automaticamente

Vozes Disponíveis:
- Maria (feminina, profissional, 35-45 anos)
- João (masculino, autoritário, 40-50 anos)
- Ana (feminina, amigável, 25-35 anos)
```

```gherkin
US-003: Geração de Vídeo
Como um usuário com projeto configurado
Quero gerar o vídeo final
Para ter um arquivo MP4 para usar nos treinamentos

Critérios de Aceite:
- DADO que tenho um projeto com slides e narração configurada
- QUANDO clico em "Gerar Vídeo"
- ENTÃO um job é criado e adicionado à fila
- E vejo uma barra de progresso em tempo real
- E recebo notificação quando o vídeo está pronto
- E posso baixar o arquivo MP4 (1080p, H.264)

Tempo Máximo: 5 minutos de vídeo = 3 minutos de processamento
```

### 7.2 Épico: Monetização

```gherkin
US-010: Upgrade para Plano Pro
Como um usuário Free que atingiu o limite
Quero fazer upgrade para o plano Pro
Para continuar criando vídeos

Critérios de Aceite:
- DADO que sou usuário Free e usei meu vídeo do mês
- QUANDO tento criar um novo vídeo
- ENTÃO vejo o paywall com opções de upgrade
- E vejo claramente os benefícios do Pro
- E posso pagar com cartão ou PIX
- QUANDO o pagamento é confirmado
- ENTÃO meu limite é atualizado imediatamente
- E recebo email de confirmação
```

```gherkin
US-011: Cancelamento de Assinatura
Como um assinante
Quero poder cancelar minha assinatura
Para não ser cobrado se não estiver usando

Critérios de Aceite:
- DADO que tenho uma assinatura ativa
- QUANDO acesso Configurações > Assinatura > Cancelar
- ENTÃO vejo o que vou perder ao cancelar
- E tenho opção de pausar por 1 mês em vez de cancelar
- QUANDO confirmo o cancelamento
- ENTÃO a assinatura é marcada para cancelar no fim do período
- E mantenho acesso até a data de renovação
- E não sou cobrado no próximo ciclo
```

### 7.3 Épico: Templates NR

```gherkin
US-020: Usar Template NR-35
Como um Técnico de Segurança
Quero usar um template pronto de NR-35 (Trabalho em Altura)
Para economizar tempo e garantir que o conteúdo está correto

Critérios de Aceite:
- DADO que estou na galeria de templates
- QUANDO seleciono "NR-35 - Trabalho em Altura"
- ENTÃO um novo projeto é criado com 12-15 slides pré-populados
- E os slides contêm conteúdo técnico correto e atualizado
- E posso editar qualquer texto ou imagem
- E posso adicionar ou remover slides
```

---

## 8. Fluxos de Usuário

### 8.1 Fluxo Principal: PPTX → Vídeo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUXO: PPTX → VÍDEO                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     │
│   │          │     │          │     │          │     │          │     │
│   │  LANDING │────▶│  SIGNUP  │────▶│ ONBOARD  │────▶│  UPLOAD  │     │
│   │   PAGE   │     │          │     │   QUIZ   │     │   PPTX   │     │
│   │          │     │          │     │          │     │          │     │
│   └──────────┘     └──────────┘     └──────────┘     └────┬─────┘     │
│                                                           │            │
│                                                           ▼            │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     │
│   │          │     │          │     │          │     │          │     │
│   │ DOWNLOAD │◀────│  RENDER  │◀────│  CONFIG  │◀────│  EDITOR  │     │
│   │   MP4    │     │   QUEUE  │     │   VOZ    │     │  VISUAL  │     │
│   │          │     │          │     │          │     │          │     │
│   └──────────┘     └──────────┘     └──────────┘     └──────────┘     │
│                                                                         │
│   TEMPO TOTAL ESTIMADO: 10-15 minutos (primeiro uso)                   │
│                         5-8 minutos (usuários recorrentes)             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Fluxo de Upgrade

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUXO: FREE → PRO                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     │
│   │  TENTA   │     │ PAYWALL  │     │ CHECKOUT │     │ WEBHOOK  │     │
│   │  CRIAR   │────▶│  MODAL   │────▶│  STRIPE  │────▶│ CONFIRMA │     │
│   │  VÍDEO   │     │          │     │          │     │          │     │
│   └──────────┘     └──────────┘     └──────────┘     └────┬─────┘     │
│        │                │                                  │           │
│        │                │                                  ▼           │
│        │                │                            ┌──────────┐     │
│        │           ┌────┴────┐                       │ ATUALIZA │     │
│        │           │ CANCELA │                       │  PLANO   │     │
│        │           └─────────┘                       │  NO DB   │     │
│        │                                             └────┬─────┘     │
│        ▼                                                  │           │
│   ┌──────────┐                                           │           │
│   │  VOLTA   │◀──────────────────────────────────────────┘           │
│   │ PRO DASH │                                                        │
│   └──────────┘                                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Fluxo de Renderização

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUXO: RENDER PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   FRONTEND                           BACKEND                            │
│   ────────                           ───────                            │
│                                                                         │
│   ┌──────────┐                      ┌──────────────────────────────┐   │
│   │  Clique  │─────POST─────────────▶│ POST /api/render/start      │   │
│   │  Render  │                      │ • Valida projeto             │   │
│   └──────────┘                      │ • Cria job no DB             │   │
│        │                            │ • Adiciona na fila BullMQ    │   │
│        │                            └───────────────┬──────────────┘   │
│        │                                            │                  │
│        ▼                                            ▼                  │
│   ┌──────────┐                      ┌──────────────────────────────┐   │
│   │ Progress │◀────SSE──────────────│ WORKER BullMQ                │   │
│   │  Modal   │                      │ • Gera TTS (ElevenLabs)      │   │
│   │  0%→100% │                      │ • Renderiza frames (FFmpeg)  │   │
│   └──────────┘                      │ • Faz upload (Supabase)      │   │
│        │                            │ • Emite eventos SSE          │   │
│        │                            └───────────────┬──────────────┘   │
│        ▼                                            │                  │
│   ┌──────────┐                      ┌───────────────▼──────────────┐   │
│   │ Download │◀────URL──────────────│ Signed URL do Supabase       │   │
│   │   MP4    │                      │ (válida por 1 hora)          │   │
│   └──────────┘                      └──────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Arquitetura Técnica

### 9.1 Visão Geral

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ARQUITETURA DE ALTO NÍVEL                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                           ┌─────────────┐                               │
│                           │   USUÁRIO   │                               │
│                           │   BROWSER   │                               │
│                           └──────┬──────┘                               │
│                                  │                                      │
│                                  ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         VERCEL EDGE                              │   │
│  │  ┌──────────────────────────────────────────────────────────┐   │   │
│  │  │                    NEXT.JS 14 APP                         │   │   │
│  │  │                                                           │   │   │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   │   │
│  │  │  │   PAGES     │  │   API       │  │   MIDDLEWARE    │   │   │   │
│  │  │  │  (React)    │  │  ROUTES     │  │   (Auth, Rate)  │   │   │   │
│  │  │  └─────────────┘  └──────┬──────┘  └─────────────────┘   │   │   │
│  │  │                          │                                │   │   │
│  │  └──────────────────────────┼────────────────────────────────┘   │   │
│  └─────────────────────────────┼────────────────────────────────────┘   │
│                                │                                        │
│           ┌────────────────────┼────────────────────┐                   │
│           │                    │                    │                   │
│           ▼                    ▼                    ▼                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │    SUPABASE     │  │     REDIS       │  │    WORKERS      │         │
│  │                 │  │   (Upstash)     │  │   (BullMQ)      │         │
│  │  ├── Postgres   │  │                 │  │                 │         │
│  │  ├── Auth       │  │  ├── Queue      │  │  ├── Render     │         │
│  │  ├── Storage    │  │  ├── Cache      │  │  ├── TTS        │         │
│  │  └── Realtime   │  │  └── Rate Limit │  │  └── Upload     │         │
│  │                 │  │                 │  │                 │         │
│  └─────────────────┘  └─────────────────┘  └────────┬────────┘         │
│                                                      │                  │
│                    ┌─────────────────────────────────┤                  │
│                    │                                 │                  │
│                    ▼                                 ▼                  │
│           ┌─────────────────┐               ┌─────────────────┐        │
│           │   ELEVENLABS    │               │     FFMPEG      │        │
│           │   (TTS API)     │               │   (Rendering)   │        │
│           └─────────────────┘               └─────────────────┘        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.2 Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| **Frontend** | Next.js 14 (App Router) | SSR, RSC, excelente DX |
| **Styling** | Tailwind CSS + shadcn/ui | Componentes prontos, consistência |
| **Estado** | Zustand + immer | Simples, performático |
| **Backend** | Next.js API Routes | Serverless, sem infra extra |
| **Database** | Supabase (Postgres) | RLS, Auth incluso, real-time |
| **Auth** | Supabase Auth | JWT, OAuth, fácil integração |
| **Storage** | Supabase Storage | S3-compatible, RLS por bucket |
| **Queue** | BullMQ + Redis (Upstash) | Jobs de longa duração |
| **TTS** | ElevenLabs / Azure Speech | Qualidade PT-BR |
| **Avatar** | HeyGen API | Lip-sync realista |
| **Render** | FFmpeg | Padrão da indústria |
| **Deploy** | Vercel | Zero config, edge network |
| **Monitoring** | Sentry | Error tracking |
| **Payments** | Stripe | PIX + Cartão, webhooks |

### 9.3 Estrutura de Pastas

```
estudio_ia_videos/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (marketing)/        # Landing page, pricing
│   │   ├── (pages)/            # App autenticado
│   │   ├── api/                # API Routes
│   │   │   ├── render/         # Endpoints de renderização
│   │   │   ├── pptx/           # Upload e parsing
│   │   │   ├── tts/            # Text-to-speech
│   │   │   ├── stripe/         # Webhooks e checkout
│   │   │   └── ...
│   │   └── ...
│   ├── components/             # Componentes React
│   │   ├── ui/                 # shadcn/ui base
│   │   ├── editor/             # Editor de vídeo
│   │   ├── dashboard/          # Dashboard
│   │   └── marketing/          # Landing page
│   ├── lib/                    # Lógica de negócio
│   │   ├── stores/             # Zustand stores
│   │   ├── pptx/               # Parser PPTX
│   │   ├── render/             # Pipeline de render
│   │   ├── queue/              # BullMQ config
│   │   ├── tts/                # TTS service
│   │   ├── avatar/             # Avatar engine
│   │   ├── supabase/           # DB client
│   │   └── stripe/             # Payment service
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # TypeScript types
│   └── utils/                  # Helpers
├── public/                     # Static assets
├── prisma/                     # Schema (sync com Supabase)
└── scripts/                    # Automação
```

---

## 10. Modelo de Dados

### 10.1 Diagrama ER

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MODELO DE DADOS                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐           │
│  │   USERS     │       │  PROJECTS   │       │   SLIDES    │           │
│  ├─────────────┤       ├─────────────┤       ├─────────────┤           │
│  │ id (PK)     │──┐    │ id (PK)     │──┐    │ id (PK)     │           │
│  │ email       │  │    │ user_id(FK) │◀─┘    │ project_id  │◀──────────┤
│  │ name        │  │    │ name        │       │ order       │           │
│  │ avatar_url  │  │    │ status      │       │ content     │           │
│  │ role        │  │    │ settings    │       │ notes       │           │
│  │ created_at  │  │    │ created_at  │       │ duration    │           │
│  └─────────────┘  │    └─────────────┘       └─────────────┘           │
│                   │           │                                         │
│                   │           │                                         │
│  ┌─────────────┐  │    ┌──────▼──────┐       ┌─────────────┐           │
│  │SUBSCRIPTIONS│  │    │ RENDER_JOBS │       │   ASSETS    │           │
│  ├─────────────┤  │    ├─────────────┤       ├─────────────┤           │
│  │ id (PK)     │  │    │ id (PK)     │       │ id (PK)     │           │
│  │ user_id(FK) │◀─┤    │ project_id  │◀──────│ project_id  │           │
│  │ plan        │  │    │ status      │       │ type        │           │
│  │ stripe_id   │  │    │ progress    │       │ url         │           │
│  │ status      │  │    │ output_url  │       │ metadata    │           │
│  │ videos_used │  │    │ error       │       │ created_at  │           │
│  │ period_end  │  │    │ created_at  │       └─────────────┘           │
│  └─────────────┘  │    └─────────────┘                                 │
│                   │                                                     │
│                   │    ┌─────────────┐       ┌─────────────┐           │
│                   │    │   PLANS     │       │  NR_COURSES │           │
│                   │    ├─────────────┤       ├─────────────┤           │
│                   │    │ id (PK)     │       │ id (PK)     │           │
│                   └───▶│ name        │       │ nr_number   │           │
│                        │ price       │       │ name        │           │
│                        │ video_limit │       │ description │           │
│                        │ features    │       │ template_id │           │
│                        └─────────────┘       └─────────────┘           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Tabelas Principais (SQL)

```sql
-- Usuários (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assinaturas
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  videos_used_this_month INT DEFAULT 0,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Planos
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_brl INT NOT NULL, -- em centavos
  stripe_price_id TEXT,
  video_limit INT NOT NULL, -- -1 = ilimitado
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projetos de Vídeo
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'rendering', 'completed', 'failed')),
  settings JSONB DEFAULT '{}',
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Slides
CREATE TABLE slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  content JSONB NOT NULL, -- texto, layout, imagens
  notes TEXT, -- notas do apresentador (narração)
  duration_seconds FLOAT DEFAULT 10,
  transition TEXT DEFAULT 'fade',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, order_index)
);

-- Jobs de Renderização
CREATE TABLE render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'processing', 'completed', 'failed', 'cancelled')),
  progress INT DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  output_url TEXT,
  error_message TEXT,
  config JSONB DEFAULT '{}', -- voice_id, resolution, etc
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets (imagens, áudios, vídeos)
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('image', 'audio', 'video', 'pptx')),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  size_bytes BIGINT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates NR
CREATE TABLE nr_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nr_number TEXT NOT NULL, -- NR-35, NR-10, etc
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  slides_data JSONB NOT NULL, -- conteúdo pré-configurado
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE render_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Usuário só vê seus próprios dados
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own slides" ON slides FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);
```

---

## 11. APIs e Integrações

### 11.1 APIs Internas

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/auth/signup` | POST | Criar conta |
| `/api/auth/login` | POST | Login |
| `/api/auth/logout` | POST | Logout |
| `/api/projects` | GET | Listar projetos |
| `/api/projects` | POST | Criar projeto |
| `/api/projects/[id]` | GET | Detalhes do projeto |
| `/api/projects/[id]` | PUT | Atualizar projeto |
| `/api/projects/[id]` | DELETE | Deletar projeto |
| `/api/pptx/upload` | POST | Upload e parse PPTX |
| `/api/render/start` | POST | Iniciar renderização |
| `/api/render/jobs` | GET | Listar jobs |
| `/api/render/jobs/[id]` | GET | Status do job |
| `/api/render/jobs/[id]/cancel` | POST | Cancelar job |
| `/api/render/progress` | GET (SSE) | Progresso real-time |
| `/api/tts/generate` | POST | Gerar áudio TTS |
| `/api/tts/voices` | GET | Listar vozes |
| `/api/stripe/checkout` | POST | Criar sessão checkout |
| `/api/stripe/webhook` | POST | Webhook Stripe |
| `/api/stripe/portal` | POST | URL do portal billing |

### 11.2 Integrações Externas

| Serviço | Uso | Documentação |
|---------|-----|--------------|
| **Supabase** | Auth, DB, Storage | https://supabase.com/docs |
| **ElevenLabs** | TTS em português | https://elevenlabs.io/docs |
| **Azure Speech** | TTS backup | https://docs.microsoft.com/azure/cognitive-services/speech |
| **HeyGen** | Avatar com lip-sync | https://docs.heygen.com |
| **Stripe** | Pagamentos | https://stripe.com/docs |
| **Resend** | Emails transacionais | https://resend.com/docs |
| **Sentry** | Error tracking | https://docs.sentry.io |
| **Vercel** | Deploy, Analytics | https://vercel.com/docs |

### 11.3 Contratos de API (Exemplo)

```typescript
// POST /api/render/start
interface StartRenderRequest {
  projectId: string;
  config?: {
    voiceId?: string;
    resolution?: '720p' | '1080p' | '4k';
    includeAvatar?: boolean;
    avatarPosition?: 'left' | 'right' | 'center';
  };
}

interface StartRenderResponse {
  success: boolean;
  jobId: string;
  estimatedDuration: number; // segundos
  position: number; // posição na fila
}

// GET /api/render/progress (SSE)
interface RenderProgressEvent {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep: string;
  eta?: number; // segundos restantes
  outputUrl?: string; // quando completed
  error?: string; // quando failed
}
```

---

## 12. Monetização

### 12.1 Estrutura de Planos

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PLANOS E PREÇOS                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │      FREE       │  │       PRO       │  │    BUSINESS     │         │
│  │                 │  │                 │  │                 │         │
│  │   R$ 0/mês      │  │   R$ 97/mês     │  │   R$ 297/mês    │         │
│  │                 │  │                 │  │                 │         │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤         │
│  │                 │  │                 │  │                 │         │
│  │ ✓ 1 vídeo/mês   │  │ ✓ 10 vídeos/mês │  │ ✓ Ilimitado     │         │
│  │ ✓ 720p          │  │ ✓ 1080p         │  │ ✓ 4K            │         │
│  │ ✓ 5 templates   │  │ ✓ Todos NRs     │  │ ✓ Todos NRs     │         │
│  │ ✓ TTS básico    │  │ ✓ TTS premium   │  │ ✓ TTS premium   │         │
│  │ ✗ Avatar        │  │ ✓ Avatar básico │  │ ✓ Avatar custom │         │
│  │ ✗ Suporte       │  │ ✓ Email         │  │ ✓ Prioritário   │         │
│  │ ✓ Marca d'água  │  │ ✗ Sem marca     │  │ ✓ White-label   │         │
│  │                 │  │                 │  │ ✓ API access    │         │
│  │                 │  │                 │  │ ✓ Multi-usuário │         │
│  │                 │  │                 │  │                 │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                         │
│  DESCONTO ANUAL: 20% (2 meses grátis)                                  │
│  Pro Anual: R$ 930/ano (R$ 77.50/mês)                                  │
│  Business Anual: R$ 2.850/ano (R$ 237.50/mês)                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Unit Economics

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        UNIT ECONOMICS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CUSTO POR VÍDEO (5 minutos)                                           │
│  ├── TTS ElevenLabs: ~R$ 2.00 (2.000 chars)                            │
│  ├── Avatar HeyGen: ~R$ 5.00 (1 crédito)                               │
│  ├── Render (compute): ~R$ 0.50                                        │
│  ├── Storage: ~R$ 0.10                                                 │
│  └── TOTAL: ~R$ 7.60/vídeo                                             │
│                                                                         │
│  MARGEM POR PLANO                                                       │
│  ├── Free (1 vídeo): -R$ 7.60 (custo de aquisição)                     │
│  ├── Pro (10 vídeos): R$ 97 - R$ 76 = R$ 21 (22% margem)               │
│  ├── Business (20 vídeos médio): R$ 297 - R$ 152 = R$ 145 (49%)        │
│                                                                         │
│  MÉTRICAS ALVO                                                          │
│  ├── CAC (Custo de Aquisição): < R$ 200                                │
│  ├── LTV (Lifetime Value): > R$ 1.000 (10 meses Pro)                   │
│  ├── LTV/CAC: > 5x                                                     │
│  ├── Churn mensal: < 5%                                                │
│  ├── Free→Paid conversion: > 5%                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 12.3 Projeção de Receita

| Mês | Free | Pro | Business | MRR | ARR |
|-----|------|-----|----------|-----|-----|
| 1 | 200 | 10 | 2 | R$ 1.564 | R$ 18.768 |
| 3 | 800 | 40 | 8 | R$ 6.256 | R$ 75.072 |
| 6 | 2.000 | 100 | 20 | R$ 15.640 | R$ 187.680 |
| 12 | 5.000 | 300 | 50 | R$ 43.950 | R$ 527.400 |

---

## 13. Métricas de Sucesso

### 13.1 North Star Metric

> **"Vídeos Completos por Semana"**
> 
> Meta: 500 vídeos/semana em 6 meses

### 13.2 KPIs por Categoria

#### Aquisição
| Métrica | Meta Mês 1 | Meta Mês 6 |
|---------|------------|------------|
| Visitantes LP | 2.000 | 20.000 |
| Signups | 200 | 2.000 |
| Taxa de conversão LP | 10% | 10% |

#### Ativação
| Métrica | Meta |
|---------|------|
| % que faz upload de PPTX | > 50% |
| % que completa 1º vídeo | > 30% |
| Time to first video | < 15 min |

#### Retenção
| Métrica | Meta |
|---------|------|
| DAU/MAU | > 20% |
| Churn mensal | < 5% |
| NPS | > 40 |

#### Receita
| Métrica | Meta |
|---------|------|
| Free→Paid | > 5% |
| MRR Growth | > 20%/mês |
| ARPU | > R$ 120 |

#### Referral
| Métrica | Meta |
|---------|------|
| Viral coefficient | > 0.3 |
| % via indicação | > 20% |

### 13.3 Dashboard de Métricas

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DASHBOARD MÉTRICAS (TEMPO REAL)                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │    MRR      │  │   USUARIOS  │  │   VIDEOS    │  │    NPS      │   │
│  │  R$ 4.850   │  │    234      │  │    1.247    │  │     47      │   │
│  │  ↑ 23%      │  │  ↑ 45 new   │  │  ↑ 312/sem  │  │  ↑ 5 pts    │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │
│                                                                         │
│  FUNIL DE CONVERSÃO                                                     │
│  ══════════════════════════════════════════════════════                │
│  Visitantes     ████████████████████████████  2,340   100%             │
│  Signups        █████████                      281    12%              │
│  Upload PPTX    ████                           126    5.4%             │
│  1º Vídeo       ███                            84     3.6%             │
│  Upgrade Pro    █                              7      0.3%             │
│                                                                         │
│  TOP TEMPLATES USADOS                                                   │
│  1. NR-35 Trabalho em Altura ████████████  312                         │
│  2. NR-10 Eletricidade       ████████      187                         │
│  3. NR-12 Máquinas           ██████        143                         │
│  4. NR-06 EPI                █████         98                          │
│  5. NR-05 CIPA               ████          76                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 14. Roadmap

### 14.1 Visão de 12 Meses

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ROADMAP 12 MESES                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Q1 2026 (Jan-Mar)                                                      │
│  ════════════════                                                       │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ MVP + Monetização                               │
│  • Landing page + Onboarding                                            │
│  • Stripe (PIX + Cartão)                                                │
│  • 5 templates NR                                                       │
│  • Launch beta 50 usuários                                              │
│  • Meta: R$ 5k MRR                                                      │
│                                                                         │
│  Q2 2026 (Abr-Jun)                                                      │
│  ════════════════                                                       │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ Escala + Features                               │
│  • 20 templates NR                                                      │
│  • Avatar customizado                                                   │
│  • Export SCORM                                                         │
│  • Integrações LMS (Moodle)                                             │
│  • Meta: R$ 15k MRR                                                     │
│                                                                         │
│  Q3 2026 (Jul-Set)                                                      │
│  ════════════════                                                       │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ Enterprise                                      │
│  • White-label completo                                                 │
│  • API pública                                                          │
│  • SSO (SAML)                                                           │
│  • Workspace multi-usuário                                              │
│  • Meta: R$ 30k MRR                                                     │
│                                                                         │
│  Q4 2026 (Out-Dez)                                                      │
│  ════════════════                                                       │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ Expansão                                        │
│  • App mobile (visualização)                                            │
│  • Marketplace de templates                                             │
│  • Suporte espanhol (LatAm)                                             │
│  • Parcerias com consultorias                                           │
│  • Meta: R$ 50k MRR                                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 14.2 Próximos 60 Dias (Detalhado)

| Semana | Foco | Entregas |
|--------|------|----------|
| 1-2 | Landing + Marketing | LP no ar, copy, SEO básico |
| 3 | Onboarding | Wizard 4 steps, tour guiado |
| 4-5 | Stripe | Checkout, webhook, billing portal |
| 6 | Planos + Limites | Paywall, usage tracking |
| 7 | Polish | Bug fixes, UX improvements |
| 8 | Beta Launch | 50 usuários, feedback loop |
| 9 | Iteração | Top 5 feedbacks implementados |

---

## 15. Riscos e Mitigações

### 15.1 Matriz de Riscos

```
                         PROBABILIDADE
                    Alta              Baixa
                ┌──────────────────┬──────────────────┐
         Alto   │  ⚠️ CRÍTICO       │  🟡 MONITORAR    │
  IMPACTO       │                  │                  │
                │  • API TTS cara  │  • Concorrente   │
                │  • Churn alto    │    novo          │
                │                  │  • Regulação     │
                ├──────────────────┼──────────────────┤
         Baixo  │  🟢 ACEITAR      │  ✅ IGNORAR      │
                │                  │                  │
                │  • Bugs menores  │  • Edge cases    │
                │  • Suporte lento │                  │
                │                  │                  │
                └──────────────────┴──────────────────┘
```

### 15.2 Riscos Detalhados

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| **TTS fica caro** | Alta | Alto | Negociar volume, ter Azure como backup, cache agressivo |
| **Churn > 10%** | Média | Alto | Onboarding melhor, feature discovery, health scores |
| **HeyGen descontinua API** | Baixa | Alto | Ter D-ID como fallback, considerar Rask.ai |
| **Concorrente BR surge** | Média | Médio | Mover rápido, focar em nicho NR, criar switching cost |
| **PPTX complexos quebram** | Alta | Médio | Fallback para imagens, parser incremental |
| **Stripe bloqueia conta** | Baixa | Alto | Manter compliance, documentar tudo, ter conta backup |

---

## 16. Glossário

| Termo | Definição |
|-------|-----------|
| **NR** | Norma Regulamentadora (segurança do trabalho) |
| **SST** | Saúde e Segurança do Trabalho |
| **TTS** | Text-to-Speech (conversão de texto em áudio) |
| **LMS** | Learning Management System (Moodle, etc.) |
| **SCORM** | Padrão de empacotamento de conteúdo para LMS |
| **Lip-sync** | Sincronização de movimento labial com áudio |
| **PPTX** | Formato de arquivo PowerPoint |
| **eSocial** | Sistema de escrituração digital do governo |
| **RLS** | Row Level Security (segurança por linha no DB) |
| **MRR** | Monthly Recurring Revenue |
| **ARR** | Annual Recurring Revenue |
| **CAC** | Customer Acquisition Cost |
| **LTV** | Lifetime Value |
| **NPS** | Net Promoter Score |
| **SESMT** | Serviço Especializado em Segurança e Medicina do Trabalho |

---

## Aprovações

| Papel | Nome | Data | Status |
|-------|------|------|--------|
| Product Owner | — | — | Pendente |
| Tech Lead | — | — | Pendente |
| UX Lead | — | — | Pendente |
| Stakeholder | — | — | Pendente |

---

## Histórico de Revisões

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2025-12-20 | Product Team | Versão inicial |
| 2.0 | 2026-02-01 | Product Team | Refinamento completo, monetização, roadmap |

---

*Documento gerado em 01/02/2026 — Estúdio IA Vídeos TécnicoCursos v7*
