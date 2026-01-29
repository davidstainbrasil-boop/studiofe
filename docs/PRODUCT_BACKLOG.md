# 📋 Product Backlog - MVP Vídeos TécnicoCursos v7

**Criado por:** PO Técnico (AI)  
**Data:** 06 de Janeiro de 2026  
**Status do Projeto:** 90% Completo (9/10 Milestones)  
**Próximo Marco:** Deploy & Go-Live (Milestone 10)

---

## 📊 Executive Summary

### Estado Atual do Sistema
| Métrica | Valor | Status |
|---------|-------|--------|
| Features Implementadas | 36/36 | ✅ 100% |
| Testes Passando | 105/105 | ✅ 100% |
| Coverage Statements | 89% | ✅ Meta: 80% |
| Coverage Functions | 100% | ✅ Meta: 90% |
| Health Score | 82/100 | ✅ Meta: 70 |
| Milestones Completos | 9/10 | 🔄 90% |

### Funcionalidades Core Implementadas ✅
- Upload e parsing de PPTX (8 parsers completos)
- Editor visual de slides com timeline multi-track
- Pipeline de renderização via BullMQ + FFmpeg
- TTS via ElevenLabs com cache
- Avatar AI via HeyGen com lip-sync
- RBAC completo (4 roles, 14 permissions)
- RLS (Row Level Security) funcional
- 70+ rotas API REST
- Sistema de webhooks
- LGPD/GDPR compliance

---

## 🎯 Product Backlog Organizado por Prioridade

---

## 🔴 PRIORIDADE ALTA (P0-P1) - Bloqueadores de Deploy

### EPIC: Deploy & Go-Live (Milestone 10)

#### US-001: Deploy em Ambiente de Staging
**Complexidade:** G (Grande)  
**Estimativa:** 3-5 dias  
**Prioridade:** P0 - Crítico

> **Como** sistema de produção,  
> **Preciso** ser deployado em ambiente de staging  
> **Para** validar funcionamento em ambiente similar a produção

**Critérios de Aceite:**
- [ ] Deploy em Vercel ou AWS funcionando
- [ ] Variáveis de ambiente de staging configuradas
- [ ] Migrations aplicadas no banco de staging
- [ ] Redis conectado e funcional
- [ ] Health check retornando OK
- [ ] URLs de staging documentadas

**Subtarefas:**
1. Configurar projeto no Vercel/AWS
2. Configurar variáveis de ambiente (Supabase staging)
3. Criar Redis cloud (Upstash ou Redis Labs)
4. Executar migrations SQL no Supabase staging
5. Configurar domínio staging (ex: staging.technicocursos.com)
6. Validar todas as rotas API em staging

---

#### US-002: Configurar CDN e Assets Estáticos
**Complexidade:** M (Média)  
**Estimativa:** 1-2 dias  
**Prioridade:** P0 - Crítico

> **Como** sistema,  
> **Preciso** servir assets através de CDN  
> **Para** garantir performance global e reduzir latência

**Critérios de Aceite:**
- [ ] CDN configurado (Cloudflare ou Vercel Edge)
- [ ] Assets estáticos servidos via CDN
- [ ] Cache headers otimizados
- [ ] Supabase Storage com CDN ativo
- [ ] Testes de latência < 200ms globalmente

---

#### US-003: Implementar Backups Automáticos
**Complexidade:** M (Média)  
**Estimativa:** 1-2 dias  
**Prioridade:** P0 - Crítico

> **Como** sistema,  
> **Preciso** ter backups automáticos do banco de dados  
> **Para** garantir recuperação de desastres

**Critérios de Aceite:**
- [ ] Backup diário automático configurado no Supabase
- [ ] Backup do Redis (AOF/RDB)
- [ ] Backup do Supabase Storage
- [ ] Procedimento de restore documentado
- [ ] Teste de restore executado com sucesso

---

#### US-004: Security Audit OWASP
**Complexidade:** G (Grande)  
**Estimativa:** 2-3 dias  
**Prioridade:** P0 - Crítico

> **Como** sistema,  
> **Preciso** passar por auditoria de segurança OWASP  
> **Para** garantir que não existem vulnerabilidades críticas

**Critérios de Aceite:**
- [ ] Scan OWASP ZAP executado
- [ ] Nenhuma vulnerabilidade crítica (0 Critical)
- [ ] Vulnerabilidades High < 3
- [ ] XSS protegido
- [ ] CSRF protegido
- [ ] SQL Injection protegido
- [ ] Headers de segurança configurados
- [ ] Relatório de auditoria documentado

---

#### US-005: Performance Testing com K6
**Complexidade:** M (Média)  
**Estimativa:** 2 dias  
**Prioridade:** P1 - Alta

> **Como** sistema,  
> **Preciso** ser testado sob carga  
> **Para** garantir estabilidade com múltiplos usuários simultâneos

**Critérios de Aceite:**
- [ ] Scripts K6 criados para rotas críticas
- [ ] Teste com 100 usuários simultâneos
- [ ] Teste com 500 requests/segundo
- [ ] P95 latência < 500ms
- [ ] 0% erro rate sob carga normal
- [ ] Gargalos identificados e documentados

---

#### US-006: Configurar Monitoramento 24/7
**Complexidade:** M (Média)  
**Estimativa:** 1-2 dias  
**Prioridade:** P0 - Crítico

> **Como** time de operações,  
> **Preciso** ter monitoramento contínuo  
> **Para** detectar e resolver problemas rapidamente

**Critérios de Aceite:**
- [ ] Sentry configurado para erros de produção
- [ ] Alertas configurados (email, Slack)
- [ ] DataDog ou similar para métricas de infra
- [ ] Dashboard de monitoramento criado
- [ ] Runbooks para incidentes documentados
- [ ] SLA definido (99.9% uptime)

---

#### US-007: Deploy em Produção
**Complexidade:** M (Média)  
**Estimativa:** 1 dia  
**Prioridade:** P0 - Crítico

> **Como** sistema,  
> **Preciso** ser deployado em produção  
> **Para** estar disponível para usuários finais

**Critérios de Aceite:**
- [ ] Ambiente de produção isolado de staging
- [ ] DNS configurado (app.technicocursos.com)
- [ ] SSL/TLS válido
- [ ] Variáveis de ambiente de produção
- [ ] Migrations aplicadas em produção
- [ ] Smoke tests passando em produção
- [ ] Rollback plan documentado

---

#### US-008: Soft Launch com 100 Usuários Beta
**Complexidade:** P (Pequena)  
**Estimativa:** 1 semana (observação)  
**Prioridade:** P1 - Alta

> **Como** negócio,  
> **Preciso** validar o sistema com usuários reais  
> **Para** coletar feedback antes do lançamento geral

**Critérios de Aceite:**
- [ ] 100 usuários beta cadastrados
- [ ] Canal de feedback configurado
- [ ] Métricas de uso coletadas
- [ ] Bugs reportados priorizados
- [ ] Ajustes de UX implementados
- [ ] Go/No-Go decision documentada

---

## 🟠 PRIORIDADE MÉDIA (P2) - Melhorias de Produto

### EPIC: Otimização de UX

#### US-009: Onboarding Guiado para Novos Usuários
**Complexidade:** M (Média)  
**Estimativa:** 2-3 dias  
**Prioridade:** P2

> **Como** novo usuário,  
> **Preciso** de um tutorial interativo  
> **Para** entender rapidamente como usar o sistema

**Critérios de Aceite:**
- [ ] Tour guiado no primeiro acesso
- [ ] Tooltips explicativos em features-chave
- [ ] Projeto de exemplo pré-criado
- [ ] Vídeo tutorial de 2 minutos
- [ ] Skip option para usuários avançados

---

#### US-010: Preview de Vídeo em Tempo Real
**Complexidade:** G (Grande)  
**Estimativa:** 4-5 dias  
**Prioridade:** P2

> **Como** editor,  
> **Preciso** visualizar preview do vídeo antes de renderizar  
> **Para** validar resultado sem gastar recursos de render

**Critérios de Aceite:**
- [ ] Player de preview no editor
- [ ] Preview de 30 segundos grátis
- [ ] Transições visíveis no preview
- [ ] Áudio TTS audível no preview
- [ ] Posição do avatar visualizável

---

#### US-011: Drag & Drop Melhorado no Timeline
**Complexidade:** M (Média)  
**Estimativa:** 2-3 dias  
**Prioridade:** P2

> **Como** editor,  
> **Preciso** de uma timeline mais intuitiva  
> **Para** organizar clips com facilidade

**Critérios de Aceite:**
- [ ] Snap to grid no drag
- [ ] Resize de clips funcional
- [ ] Zoom na timeline
- [ ] Undo/Redo funcionando
- [ ] Keyboard shortcuts

---

### EPIC: Features Avançadas de Vídeo

#### US-012: Múltiplas Resoluções de Output
**Complexidade:** M (Média)  
**Estimativa:** 2 dias  
**Prioridade:** P2

> **Como** sistema,  
> **Preciso** suportar múltiplas resoluções  
> **Para** atender diferentes plataformas (YouTube, Instagram, etc)

**Critérios de Aceite:**
- [ ] 1080p (Full HD) - Padrão
- [ ] 720p (HD) - Opção econômica
- [ ] 4K (UHD) - Premium
- [ ] 9:16 (Vertical) - Stories/Reels
- [ ] 1:1 (Quadrado) - Feed Instagram

---

#### US-013: Biblioteca de Músicas de Fundo
**Complexidade:** M (Média)  
**Estimativa:** 2-3 dias  
**Prioridade:** P2

> **Como** editor,  
> **Preciso** adicionar música de fundo aos vídeos  
> **Para** tornar os cursos mais envolventes

**Critérios de Aceite:**
- [ ] 50+ músicas royalty-free
- [ ] Categorias por mood/tema
- [ ] Ajuste de volume independente
- [ ] Fade in/out automático
- [ ] Licença de uso documentada

---

#### US-014: Sistema de Legendas Automáticas
**Complexidade:** G (Grande)  
**Estimativa:** 4-5 dias  
**Prioridade:** P2

> **Como** sistema,  
> **Preciso** gerar legendas automaticamente  
> **Para** atender requisitos de acessibilidade

**Critérios de Aceite:**
- [ ] Transcrição automática do TTS
- [ ] Sincronização palavra por palavra
- [ ] Export em formato SRT/VTT
- [ ] Edição manual de legendas
- [ ] Burn-in de legendas no vídeo (opcional)

---

### EPIC: Integrações Externas

#### US-015: Integração com LMS (Moodle/Totara)
**Complexidade:** G (Grande)  
**Estimativa:** 5-7 dias  
**Prioridade:** P2

> **Como** empresa de SST,  
> **Preciso** publicar vídeos diretamente no LMS  
> **Para** automatizar fluxo de treinamento

**Critérios de Aceite:**
- [ ] API de integração LTI
- [ ] Export SCORM 1.2/2004
- [ ] Tracking de conclusão
- [ ] Notas/certificados
- [ ] Documentação de integração

---

#### US-016: Integração com Google Drive/OneDrive
**Complexidade:** M (Média)  
**Estimativa:** 2-3 dias  
**Prioridade:** P2

> **Como** usuário,  
> **Preciso** importar PPTX direto do cloud storage  
> **Para** evitar download/upload manual

**Critérios de Aceite:**
- [ ] OAuth com Google
- [ ] OAuth com Microsoft
- [ ] File picker nativo
- [ ] Import direto para o sistema
- [ ] Sync de alterações

---

## 🟢 PRIORIDADE BAIXA (P3) - Nice to Have

### EPIC: Features Futuras

#### US-017: Editor de Avatar Customizado
**Complexidade:** GG (Muito Grande)  
**Estimativa:** 2-3 semanas  
**Prioridade:** P3

> **Como** instrutor,  
> **Preciso** criar avatar personalizado  
> **Para** ter um apresentador único para minha empresa

**Critérios de Aceite:**
- [ ] Upload de foto para criar avatar
- [ ] Customização de roupa/fundo
- [ ] Múltiplas expressões faciais
- [ ] Gestos de mão
- [ ] Integração com Stable Diffusion ou similar

---

#### US-018: Quiz Interativo Dentro do Vídeo
**Complexidade:** G (Grande)  
**Estimativa:** 5-7 dias  
**Prioridade:** P3

> **Como** instrutor NR,  
> **Preciso** adicionar quizzes ao vídeo  
> **Para** verificar compreensão dos alunos

**Critérios de Aceite:**
- [ ] Pausa automática para pergunta
- [ ] Multiple choice questions
- [ ] Feedback instantâneo
- [ ] Tracking de respostas
- [ ] Relatório de performance

---

#### US-019: Tradução Automática Multi-idioma
**Complexidade:** G (Grande)  
**Estimativa:** 4-5 dias  
**Prioridade:** P3

> **Como** empresa multinacional,  
> **Preciso** traduzir vídeos automaticamente  
> **Para** treinar equipes em múltiplos países

**Critérios de Aceite:**
- [ ] Tradução de texto dos slides
- [ ] TTS em múltiplos idiomas
- [ ] Legendas traduzidas
- [ ] 10+ idiomas suportados
- [ ] Revisão manual opcional

---

#### US-020: App Mobile (React Native)
**Complexidade:** GG (Muito Grande)  
**Estimativa:** 4-6 semanas  
**Prioridade:** P3

> **Como** instrutor,  
> **Preciso** visualizar e gerenciar projetos no celular  
> **Para** acompanhar renderizações em qualquer lugar

**Critérios de Aceite:**
- [ ] App iOS e Android
- [ ] Visualização de projetos
- [ ] Notificações de render completo
- [ ] Preview de vídeos
- [ ] Edição básica de slides

---

#### US-021: Marketplace de Templates
**Complexidade:** G (Grande)  
**Estimativa:** 5-7 dias  
**Prioridade:** P3

> **Como** plataforma,  
> **Preciso** de um marketplace de templates  
> **Para** que criadores monetizem seus designs

**Critérios de Aceite:**
- [ ] Upload de templates por usuários
- [ ] Sistema de review/aprovação
- [ ] Precificação flexível
- [ ] Split de receita
- [ ] Ratings e reviews

---

### EPIC: Melhorias Técnicas (Tech Debt)

#### US-022: Migração para Edge Functions
**Complexidade:** M (Média)  
**Estimativa:** 2-3 dias  
**Prioridade:** P3

> **Como** sistema,  
> **Preciso** mover lógica para edge functions  
> **Para** reduzir latência globalmente

**Critérios de Aceite:**
- [ ] Rotas de leitura no edge
- [ ] Auth verification no edge
- [ ] Latência P95 < 50ms para leituras
- [ ] Sem breaking changes

---

#### US-023: Implementar GraphQL (Opcional)
**Complexidade:** G (Grande)  
**Estimativa:** 5-7 dias  
**Prioridade:** P3

> **Como** desenvolvedor frontend,  
> **Preciso** de uma API GraphQL  
> **Para** otimizar queries e reduzir overfetching

**Critérios de Aceite:**
- [ ] Schema GraphQL definido
- [ ] Resolvers implementados
- [ ] Playground disponível
- [ ] Coexistência com REST
- [ ] Documentação completa

---

#### US-024: Cache Distribuído Multi-região
**Complexidade:** M (Média)  
**Estimativa:** 2-3 dias  
**Prioridade:** P3

> **Como** sistema,  
> **Preciso** de cache distribuído  
> **Para** servir usuários globais com baixa latência

**Critérios de Aceite:**
- [ ] Redis cluster multi-região
- [ ] Cache invalidation automática
- [ ] Hit ratio > 80%
- [ ] Fallback para origem

---

---

## 📈 Matriz de Priorização (MoSCoW)

| Must Have (P0-P1) | Should Have (P2) | Could Have (P3) | Won't Have (Now) |
|-------------------|------------------|-----------------|------------------|
| Deploy Staging | Onboarding Guiado | Avatar Customizado | Realidade Virtual |
| Security Audit | Preview Real-time | Quiz Interativo | Blockchain NFT |
| Backups Auto | Múltiplas Resoluções | Multi-idioma | Desktop App |
| Monitoramento 24/7 | Legendas Auto | App Mobile | AI Gerador de Roteiro |
| Deploy Produção | Integração LMS | Marketplace | Voice Cloning Próprio |
| CDN | Músicas de Fundo | GraphQL | |
| Performance Test | Cloud Storage | Edge Functions | |
| Soft Launch 100 | Timeline Melhorado | Cache Multi-região | |

---

## 📊 Roadmap Visual

```
Q1 2026 (Jan-Mar)
├── Janeiro
│   ├── [SEMANA 1-2] Deploy Staging + Security Audit
│   ├── [SEMANA 2-3] Performance Testing + CDN
│   └── [SEMANA 3-4] Monitoramento + Deploy Produção
│
├── Fevereiro
│   ├── [SEMANA 1] Soft Launch 100 usuários
│   ├── [SEMANA 2-3] Feedback + Bug fixes
│   └── [SEMANA 3-4] Onboarding Guiado + Preview Real-time
│
└── Março
    ├── [SEMANA 1-2] Múltiplas Resoluções + Músicas
    ├── [SEMANA 2-3] Legendas Automáticas
    └── [SEMANA 4] Integração LMS (início)

Q2 2026 (Abr-Jun)
├── Integração Cloud Storage
├── Timeline Melhorado
├── Avatar Customizado (início)
└── Quiz Interativo

Q3-Q4 2026
├── Multi-idioma
├── App Mobile
├── Marketplace
└── Tech improvements
```

---

## 🏷️ Legenda de Complexidade

| Tamanho | Pontos | Tempo Estimado | Descrição |
|---------|--------|----------------|-----------|
| **P** (Pequeno) | 1-2 | 1-2 dias | Tarefa simples, bem definida |
| **M** (Médio) | 3-5 | 2-5 dias | Tarefa com alguma complexidade |
| **G** (Grande) | 8-13 | 1-2 semanas | Tarefa complexa, múltiplas partes |
| **GG** (Muito Grande) | 20+ | 3+ semanas | Epic que precisa ser quebrado |

---

## 📋 Resumo do Backlog

| Prioridade | Qtd Items | Complexidade Total | Estimativa Total |
|------------|-----------|-------------------|------------------|
| 🔴 Alta (P0-P1) | 8 | ~45 pontos | 2-3 semanas |
| 🟠 Média (P2) | 8 | ~35 pontos | 3-4 semanas |
| 🟢 Baixa (P3) | 8 | ~50 pontos | 6-8 semanas |
| **TOTAL** | **24** | **~130 pontos** | **11-15 semanas** |

---

## ✅ Definition of Done (DoD)

Uma User Story é considerada **DONE** quando:

1. ✅ Código implementado e revisado
2. ✅ Testes unitários passando (coverage mantido ≥80%)
3. ✅ Testes E2E passando (quando aplicável)
4. ✅ Zero erros TypeScript
5. ✅ Zero erros ESLint
6. ✅ Documentação atualizada
7. ✅ Deploy em staging sem erros
8. ✅ QA sign-off
9. ✅ PO acceptance

---

## 🔄 Sprint Planning Sugerido

### Sprint 1 (2 semanas) - Deploy Foundation
- US-001: Deploy Staging
- US-002: CDN
- US-003: Backups

### Sprint 2 (2 semanas) - Security & Performance
- US-004: Security Audit
- US-005: Performance Testing
- US-006: Monitoramento

### Sprint 3 (1 semana) - Go Live
- US-007: Deploy Produção
- US-008: Soft Launch

### Sprint 4+ - Melhorias contínuas
- Priorização dinâmica baseada em feedback

---

*Documento gerado em 06/01/2026 | Versão 1.0*
*Próxima revisão: Após Sprint 1*
