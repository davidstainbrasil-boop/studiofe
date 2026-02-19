---
description: 'Inicializa um novo projeto com o sistema de agentes autônomos. Cria feature_list.json, claude-progress.txt, init.sh, e faz commit inicial. Use na PRIMEIRA sessão de qualquer projeto novo.'
---

# Iniciar Projeto com Sistema de Agentes Autônomos

Você está iniciando um novo projeto com o sistema de progresso incremental. Siga TODOS os passos abaixo.

## Contexto do Sistema

Este projeto usa um sistema onde:

- **feature_list.json** = Roadmap completo com TODAS as features (cada uma com `passes: false`)
- **claude-progress.txt** = Diário de bordo entre sessões de agentes
- **init.sh** = Script idempotente para inicializar o ambiente
- Cada sessão futura implementa 1-2 features, testa, commita, e registra progresso

## Seu Trabalho Agora

### 1. Analisar o Pedido

- Leia o pedido do usuário com atenção total
- Se já existe código no projeto, explore com `ls -la`, `tree -L 2`, `cat`
- Identifique: stack, framework, banco de dados, APIs externas

### 2. Criar feature_list.json

Decomponha o projeto INTEIRO em features granulares. Regras:

- Formato JSON (modelo respeita mais que Markdown)
- Cada feature independente e testável
- Ordenadas por dependência (infra → core → UI → polish)
- Mínimo: 20 features para projeto simples, 50+ para médio, 100+ para complexo
- TODAS começam com `"passes": false`
- Steps de teste claros (como um QA humano testaria)

```json
{
  "project_name": "Nome",
  "created_at": "DATA",
  "description": "Descrição do projeto",
  "total_features": N,
  "completed_features": 0,
  "features": [
    {
      "id": 1,
      "category": "setup|core|ui|api|auth|integration|testing|polish",
      "priority": "critical|high|medium|low",
      "description": "Descrição específica da feature",
      "steps": ["Como testar passo 1", "Como testar passo 2"],
      "dependencies": [],
      "passes": false
    }
  ]
}
```

### 3. Criar claude-progress.txt

Diário de bordo com:

- Status geral (total/completas/pendentes)
- Stack do projeto
- Como iniciar o ambiente
- Registro da sessão de inicialização
- Notas para o próximo agent

### 4. Criar/Adaptar init.sh

Script idempotente que:

- Verifica requisitos (node, git, etc.)
- Instala dependências
- Configura banco (se houver)
- Copia .env.example → .env (se houver)
- Roda type check e testes

### 5. Setup do Projeto (se novo)

Se o projeto é novo:

- Crie estrutura de pastas
- Configure package.json, tsconfig.json
- Instale dependências essenciais
- NÃO implemente features — apenas o esqueleto

### 6. Git Commit

```bash
git init  # se ainda não é um repo
git add -A
git commit -m "chore: initialize project with agent system

- feature_list.json: X features decomposed
- claude-progress.txt: session tracking
- init.sh: environment setup
- Basic project structure"
```

### 7. Reportar ao Usuário

Informe:

- Quantas features foram identificadas
- Categorias (ex: 5 setup, 12 core, 8 UI, etc.)
- Estimativa de sessões (1-3 features por sessão)
- Instrução: "Nas próximas sessões, use o agent **Coding** ou simplesmente diga 'continue o projeto' para fazer progresso incremental"

## ⚠️ IMPORTANTE

- NÃO implemente features nesta sessão
- SEJA exaustivo no feature_list — é melhor ter demais do que de menos
- O JSON deve ser VÁLIDO
- Cada feature deve ter steps de teste CLAROS
