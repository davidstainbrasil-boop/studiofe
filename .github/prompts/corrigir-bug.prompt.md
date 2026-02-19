---
description: 'Diagnostica e corrige um bug — encontra causa raiz antes de aplicar fix'
---

Diagnostique e corrija o bug descrito.

## Workflow OBRIGATÓRIO:

1. **Reproduza** — Entenda exatamente o que está errado
2. **Leia o stack trace** — Se houver, analise do fim para o início
3. **Localize** — Encontre o arquivo e linha do problema
4. **Analise dependências** — Use `#usages` para ver quem chama esse código
5. **Identifique a causa raiz** — Não o sintoma, a CAUSA
6. **Corrija** — Aplique o fix MÍNIMO necessário
7. **Teste** — Rode `npm test`, `tsc --noEmit`, `npm run lint`
8. **Explique** — Descreva o que causou o bug e como foi corrigido

## Regras:

- NUNCA aplique fix sem entender a causa raiz
- NUNCA refatore código que não está relacionado ao bug
- Se for um workaround, diga explicitamente
- Corrija o mínimo necessário
- Se o fix pode quebrar outra coisa, avise
