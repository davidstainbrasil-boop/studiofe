---
description: 'Mostra o status atual do projeto — features completas, pendentes, próximas prioridades.'
---

# Status do Projeto

Leia os arquivos de controle e apresente um relatório claro.

## Execute:

```bash
pwd
cat claude-progress.txt
cat feature_list.json
git log --oneline -10
```

## Apresente:

```
📊 STATUS DO PROJETO: [nome]
════════════════════════════════

✅ Features completas: X/Y (Z%)
🔴 Features pendentes: N

Por categoria:
  setup:       X/Y ✅
  core:        X/Y
  ui:          X/Y
  api:         X/Y
  auth:        X/Y
  integration: X/Y
  testing:     X/Y
  polish:      X/Y

🎯 Próximas 3 features a implementar:
  #ID — [descrição] (prioridade: X)
  #ID — [descrição] (prioridade: X)
  #ID — [descrição] (prioridade: X)

📝 Última sessão: [resumo]
⏱️  Estimativa: ~N sessões restantes

🏥 Health: [projeto funcional / com problemas]
```

NÃO implemente nada — apenas reporte o status.
