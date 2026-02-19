---
description: 'Continua o desenvolvimento incremental. Lê progresso, escolhe próxima feature, implementa, testa, commita. Use em TODAS as sessões depois do /iniciar-projeto.'
---

# Continuar Desenvolvimento Incremental

Você está retomando o trabalho em um projeto que usa o sistema de progresso incremental.

## Passo 1: Orientação (OBRIGATÓRIO)

Execute AGORA, antes de qualquer outra coisa:

```bash
pwd
cat claude-progress.txt
git log --oneline -20
```

Depois leia `feature_list.json` para ver features pendentes.

## Passo 2: Health Check

```bash
bash init.sh
```

Se algo estiver quebrado → corrija PRIMEIRO → commite o fix → só depois continue.

## Passo 3: Escolher Feature

Do `feature_list.json`, escolha a feature de maior prioridade que:

- Tem `"passes": false`
- Tem todas as `"dependencies"` com `"passes": true`
- Tem `"priority": "critical"` (ou a maior disponível)

Anuncie: "Vou implementar Feature #X: [descrição]"

## Passo 4: Implementar

- Código REAL, funcional, pronto para produção
- Zero mocks, zero placeholders, zero TODOs
- TypeScript strict, error handling, tipos completos
- Siga padrões do código existente

## Passo 5: Testar

Siga os `steps` da feature no JSON. Além disso:

- `tsc --noEmit` → zero erros
- `npm run lint` → zero erros
- `npm test` → todos passando
- Teste manual end-to-end
- Verifique que features anteriores não quebraram

## Passo 6: Registrar

1. No `feature_list.json`: mude `"passes": false` → `"passes": true`
2. Atualize `"completed_features"` no topo
3. Git commit: `git add -A && git commit -m "feat: implement feature #X - [descrição]"`
4. Atualize `claude-progress.txt` com detalhes da sessão

## Regras

- APENAS 1-2 features por sessão
- NUNCA remova/edite features no JSON (só mude `passes`)
- NUNCA declare projeto completo sem verificar feature_list
- SEMPRE deixe o projeto em estado funcional ao encerrar
- Se o contexto estiver acabando → commite WIP com notas claras
