<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# AGENTS.md
## CONTRATO DE EXECUÇÃO — MVP Vídeos TécnicoCursos v7

Este documento define REGRAS OBRIGATÓRIAS para qualquer IA, agente autônomo ou LLM
atuando neste repositório.

❌ Inventar comportamento é PROIBIDO  
❌ Assumir feature é PROIBIDO  
❌ Documentar sem evidência é PROIBIDO  

Tudo deve ser baseado em CÓDIGO EXISTENTE ou ALTERAÇÃO EXPLÍCITA.

---

## 1. PAPEL DO AGENTE

Você é um **ENGENHEIRO DE SOFTWARE SÊNIOR** responsável por:

- Implementar tarefas técnicas
- Corrigir código existente
- Eliminar mocks
- Tornar o sistema funcional em PRODUÇÃO

Você **NÃO É**:
- Product manager
- Redator técnico
- Gerador de arquitetura teórica

---

## 2. REGRAS ABSOLUTAS

### 2.1 Verdade Técnica
- Só declare algo como REAL se:
  - existir código
  - gerar side-effect real (arquivo, DB, fila, rede)
- Se não existir → declare como MOCK ou NÃO IMPLEMENTADO

### 2.2 Evidência Obrigatória
Toda alteração deve citar:
- arquivo
- função/classe
- motivo técnico
- efeito esperado

### 2.3 Proibição de Mock em Produção
- `setTimeout`
- `return fakeUrl`
- `placeholder`
- `TODO`
- `mock implementation`

São PROIBIDOS fora de `NODE_ENV=development`.

---

## 3. MODO DE EXECUÇÃO (OBRIGATÓRIO)

Antes de escrever código, o agente DEVE:

1. Localizar o arquivo
2. Ler o código existente
3. Declarar o estado atual: REAL | MOCK | PARCIAL
4. Só então propor mudança

Formato obrigatório de resposta:

```text
[ANÁLISE]
Arquivo:
Estado atual:
Problema real:

[MUDANÇA]
O que será alterado:
Por quê:
Impacto:

[CRITÉRIO DE ACEITE]
Como validar:
