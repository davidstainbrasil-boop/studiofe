cat > .agent/RUNBOOK.md <<'MD'
# RUNBOOK — Loop de execução contínua

## Loop (sempre nessa ordem)
1) Pegar o próximo item marcado [ ] no BACKLOG
2) Criar branch: feat/<fase>-<tarefa>
3) Implementar mudança mínima (PR pequeno)
4) Rodar gates locais (ou script de validação)
5) Atualizar STATUS.md com evidência
6) Abrir PR
7) Só depois pegar o próximo

## Regras
- 1 PR = 1 tarefa do backlog
- Proibido “melhorar arquitetura” fora do escopo
- Proibido mock fora de development
- Se gate falhar: corrigir no mesmo PR
MD
