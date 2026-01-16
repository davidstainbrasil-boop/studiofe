# TestSprite — suíte mínima acionável (backend + gates)

Este diretório contém testes **compatíveis com TestSprite** (scripts Python executáveis) alinhados ao PRD (`/specs.md`) e às rotas reais do app.

## Pré-requisitos

- App rodando em `http://localhost:3000`
- Python 3 + `requests`

Para evitar dependência de Supabase em testes de upload, prefira iniciar com:

```bash
cd estudio_ia_videos
STORAGE_TYPE=local npm run dev
```

## Como rodar manualmente (sem TestSprite)

```bash
python3 testsprite_tests/TS000_asset_delivery_health.py
python3 testsprite_tests/TS002_public_routes_health.py
python3 testsprite_tests/TS001_pptx_upload_validation.py
python3 testsprite_tests/TS003_health_api.py
python3 testsprite_tests/TS004_render_start_negative.py
python3 testsprite_tests/TS005_404_custom_page.py
```

## O que estes testes cobrem (objetivo)

- **P0**: `TS000_asset_delivery_health.py`
  - Garante que `/_next/static/chunks/*` está servindo (sem isso, E2E/UI não hidrata).
- **P0**: `TS002_public_routes_health.py`
  - Garante que rotas públicas críticas (`/signup`, `/register`) não retornam 5xx.
- **P1**: `TS001_pptx_upload_validation.py`
  - Valida `POST /api/pptx/upload` (missing file, empty file, upload válido quando storage está configurado).
- **P1**: `TS003_health_api.py`
  - Valida `GET /api/health` (payload estruturado, 200/503).
- **P1**: `TS004_render_start_negative.py`
  - Valida erros 400/404 em `POST /api/render/start` (sem depender do pipeline completo).
- **P1**: `TS005_404_custom_page.py`
  - Valida rota inexistente retorna 404 e renderiza a página custom.

## Observações importantes (para evitar falsos positivos)

- **Não use `basic auth`**: a API do Next não usa BasicAuth por padrão.
- **Evite depender de `dev_bypass`**:
  - O bypass foi endurecido/removido em partes do sistema; onde houver bypass explícito, prefira `x-user-id`.
- **Auth real (cookies do Supabase)**: endpoints como `/api/dashboard/unified-stats` exigem sessão real e não têm bypass consistente. Para esses, use Playwright E2E ou prepare um fluxo de obtenção de sessão do Supabase para testes de API.

