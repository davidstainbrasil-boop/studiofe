---
description: 'Faz uma auditoria completa do projeto — estrutura, dependências, tipos, segurança, performance'
---

Faça uma auditoria completa deste projeto.

## Verificações:

### 1. Estrutura

- Listar estrutura de pastas
- Verificar organização (components, services, hooks, types separados?)
- Identificar arquivos órfãos ou não utilizados

### 2. Dependências

- `npm audit` para vulnerabilidades
- `npm outdated` para dependências desatualizadas
- Identificar dependências não utilizadas
- Verificar se há conflitos de versão

### 3. TypeScript

- `tsc --noEmit` — listar todos os erros
- Buscar por `any` no codebase: `grep -r ": any" src/`
- Verificar tsconfig.json (strict mode?)

### 4. Código

- Buscar `console.log` em produção
- Buscar `TODO`, `FIXME`, `HACK`
- Buscar catches vazios: `catch {}`
- Verificar se há secrets hardcoded

### 5. Testes

- Cobertura atual: `npm test -- --coverage`
- Identificar módulos sem testes

### 6. Performance

- Bundle size se for frontend
- Identificar imports pesados
- Verificar lazy loading

## Output:

```
📊 RELATÓRIO DE AUDITORIA
========================
✅ OK: [itens corretos]
⚠️ ATENÇÃO: [itens que precisam de melhoria]
🔴 CRÍTICO: [itens que precisam de correção urgente]

📋 PLANO DE AÇÃO (priorizado):
1. ...
2. ...
```
