---
description: 'Implementa uma integração completa com API externa — service, tipos, error handling, retry'
---

Implemente uma integração REAL e COMPLETA com a API especificada.

## Checklist obrigatório:

1. **Pesquise a API** — Use #fetch para ler a documentação se tiver URL
2. **Crie os tipos** — Interface para request e response em `src/types/`
3. **Crie o service** — Em `src/services/` com:
   - Axios instance dedicada com baseURL e timeout
   - Interceptors para auth e logging
   - Funções tipadas para cada endpoint
   - Retry com exponential backoff (3 tentativas)
   - Tratamento de TODOS os status HTTP relevantes
4. **Crie o hook (se React)** — Custom hook em `src/hooks/` que usa o service
5. **Rode validação** — `tsc --noEmit` e `npm run lint`

## Regras ABSOLUTAS:

- ❌ ZERO código mock ou placeholder
- ❌ ZERO `any` no TypeScript
- ❌ ZERO secrets hardcoded (use process.env)
- ✅ Error handling real em cada chamada
- ✅ Tipos completos para request E response
- ✅ Rate limiting quando a API exigir
