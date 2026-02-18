# PRECHECK T1 — Schema de cena e jobs

Objetivo: validar ambiente de staging antes de aplicar migrations.

## Checklist rápido
- [ ] Workspace correto confirmado
- [ ] Ambiente alvo = staging confirmado nominalmente
- [ ] Conexão DB válida
- [ ] Storage acessível
- [ ] Fila/Redis acessível
- [ ] Variáveis mínimas presentes

## Variáveis mínimas
- `DIRECT_DATABASE_URL`
- `REDIS_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (apenas server-side)

## Evidência esperada
- Registro em `logs.txt` com resultado de cada validação
- Atualização de `metrics.json` com timestamp
- Atualização de `LATEST_HANDOFF.md` para status `em execução` (ou `bloqueado`)

## Critério de abortar
Se DB ou storage não validar, não executar migration.
Marcar task como `bloqueado` e registrar causa única.
