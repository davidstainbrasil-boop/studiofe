---
description: 'Refatora código mantendo a mesma funcionalidade — melhora legibilidade, performance e tipagem'
---

Refatore o código especificado mantendo a mesma funcionalidade.

## Workflow:

1. **Leia o código** — Entenda completamente o que ele faz
2. **Identifique usos** — Use `#usages` para ver onde é importado/usado
3. **Rode testes ANTES** — `npm test` para garantir baseline
4. **Refatore** — Aplique as melhorias necessárias
5. **Rode testes DEPOIS** — Confirme que nada quebrou
6. **Type check** — `tsc --noEmit`

## Melhorias em ordem de prioridade:

1. Remover `any` e adicionar tipos corretos
2. Extrair lógica duplicada para funções reutilizáveis
3. Simplificar condicionais complexas
4. Melhorar nomes de variáveis e funções
5. Adicionar error handling onde falta
6. Remover código morto
7. Otimizar performance (se necessário)

## Regras:

- NUNCA mude o comportamento externo
- NUNCA refatore código que não foi pedido
- Se não existirem testes, CRIE testes antes de refatorar
- Mantenha todos os imports funcionando
- Se renomear exports, atualize TODOS os imports
