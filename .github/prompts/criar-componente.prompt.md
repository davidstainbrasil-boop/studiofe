---
description: 'Cria um componente React completo com TypeScript, Tailwind, e testes'
---

Crie um componente React completo seguindo os padrões do projeto.

## O que criar:

### Componente (.tsx)

- Componente funcional com export default
- Props tipadas com interface
- Tailwind CSS para estilização
- Estados de loading, error, empty quando aplicável
- Acessibilidade básica (aria-labels, roles, semântica)

### Teste (.test.tsx)

- Render sem erros
- Interações do usuário (click, input, etc.)
- Estados visuais (loading, error, empty, success)
- Props opcionais vs obrigatórias

### Checklist:

- [ ] TypeScript strict (zero `any`)
- [ ] Props documentadas com JSDoc se complexas
- [ ] Responsivo (mobile-first com Tailwind)
- [ ] Acessível (teclado, screen reader)
- [ ] Testes passando
- [ ] `tsc --noEmit` sem erros
