#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CANONICAL_DOMAIN="cursostecno.com.br"

FORBIDDEN_PATTERNS=(
  'treinx\.abacusai\.app'
  'tecnicocursos-videos\.vercel\.app'
  'estudioiavideos-j59rbi1bm-tecnocursos\.vercel\.app'
  'estudioiavideos-lpu9uiny6-tecnocursos\.vercel\.app'
  'estudioiavideos-tecnocursos\.vercel\.app'
  'estudioiavideos\.vercel\.app'
  '\[YOUR_DOMAIN\]\.vercel\.app'
  'seu-dominio\.vercel\.app'
)

RG_EXCLUDES=(
  --glob '!**/archive/**'
  --glob '!**/.next/**'
  --glob '!**/node_modules/**'
  --glob '!**/.git/**'
  --glob '!tmp/**'
  --glob '!**/.tmp/**'
)

echo "🔎 Validando consistência de domínio de produção (${CANONICAL_DOMAIN})..."
echo ""

has_error=0

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  if matches=$(rg -n --hidden "${RG_EXCLUDES[@]}" "$pattern" .); then
    has_error=1
    echo "❌ Encontrado padrão proibido: ${pattern}"
    echo "${matches}"
    echo ""
  fi
done

REQUIRED_CHECKS=(
  'estudio_ia_videos/src/app/.env.example|NEXT_PUBLIC_APP_URL=https://cursostecno.com.br'
  'estudio_ia_videos/src/app/.env.example|NEXTAUTH_URL=https://cursostecno.com.br'
  'estudio_ia_videos/public/robots.txt|Sitemap: https://cursostecno.com.br/sitemap.xml'
  'estudio_ia_videos/public/sitemap.xml|<loc>https://cursostecno.com.br/</loc>'
  'docs/api-spec.json|"url": "https://cursostecno.com.br"'
  'docs/api-docs.html|https://cursostecno.com.br'
)

for check in "${REQUIRED_CHECKS[@]}"; do
  file="${check%%|*}"
  expected="${check#*|}"

  if ! rg -q --fixed-strings "$expected" "$file"; then
    has_error=1
    echo "❌ Valor obrigatório não encontrado em ${file}: ${expected}"
  fi
done

if [[ "$has_error" -ne 0 ]]; then
  echo ""
  echo "🚫 Falha na validação de domínio de produção."
  exit 1
fi

echo "✅ Domínio de produção consistente: ${CANONICAL_DOMAIN}"
