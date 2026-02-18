# T4 — Smoke REAL Avatar Scenes

## Objetivo

Validar execução operacional do contrato `POST + GET /api/avatar-scenes` com **2 avatares** e **4 turnos** em runtime real.

## Execução

```bash
T4_PROJECT_ID=<uuid-do-projeto> npm run run:t4:avatar-scenes
```

Fluxo do comando:

- `npm run precheck:t4:avatar-scenes`
- `npm run smoke:t4:avatar-scenes` (somente se precheck passar)

Variáveis opcionais:

- `T4_SMOKE_BASE_URL` (default: `http://127.0.0.1:3000`)
- `T4_SCENE_ID`
- `T4_SCENE_NAME`
- `T4_AUTH_BEARER`
- `T4_AUTH_COOKIE`
- `T4_USER_ID` (somente ambiente dev com `SKIP_AUTH=true`)

## Critério de sucesso

- `request-response.json` contém POST e GET com status 2xx.
- `metrics.json` contém `success: true` e `status: "completed"`.
- `artifact.txt` registra `projectId`, `sceneId`, `turns=4` e 2 participantes.

## Estado atual

- Bloqueado no host atual por dependências de sandbox ausentes: `rg`, `bwrap`, `socat`.
- Assim que disponíveis, executar o comando único de execução para fechar Gate REAL.
