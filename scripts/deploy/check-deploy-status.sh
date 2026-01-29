#!/bin/bash

# 📊 Status Check - Deployment Vercel

set -euo pipefail

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 VERIFICAÇÃO DE STATUS - MIME Fix Deploy"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# URLs de verificação
DEPLOYMENT_URL="https://estudioiavideos-lpu9uiny6-tecnocursos.vercel.app"
PROD_URL="https://estudioiavideos-tecnocursos.vercel.app"
CUSTOM_DOMAIN_URL="https://cursostecno.com.br"
DASHBOARD="https://vercel.com/tecnocursos/estudio_ia_videos/deployments"

# Chunk conhecido em falha atual (pode ser sobrescrito via KNOWN_CHUNK="webpack-*.js")
KNOWN_CHUNK=${KNOWN_CHUNK:-"webpack-f3e7a65396ba9db2.js"}

echo "📋 Informações do Deploy:"
echo "   ID: 66oCAfgorRqEHTXVTELP1WUEPgp5"
echo "   URL Preview: $DEPLOYMENT_URL"
echo "   URL Prod: $PROD_URL"
echo "   Domínio Custom: $CUSTOM_DOMAIN_URL"
echo ""

report_chunk() {
    local label="$1"
    local base_url="$2"
    local chunk_path="$3"
    local description="$4"

    local target_url
    target_url="${base_url%/}${chunk_path}"

    if [[ "$chunk_path" != /* ]]; then
        target_url="${base_url%/}/$chunk_path"
    fi

    local response
    if ! response=$(curl -s -D - -o /dev/null --max-time 10 "$target_url" 2>/dev/null); then
        echo "      ⚠️  Falha ao requisitar $description ($target_url)"
        return
    fi

    local status_line content_type status_code
    status_line=$(echo "$response" | head -n 1)
    status_code=$(echo "$status_line" | awk '{print $2}')
    content_type=$(echo "$response" | grep -i '^Content-Type:' | head -n 1 | cut -d' ' -f2-)

    echo "      ↳ $description"
    echo "         URL: $target_url"
    echo "         Status: ${status_code:-desconhecido}"
    echo "         Content-Type: ${content_type:-não informado}"

    if [[ "${status_code:-}" != "200" ]]; then
        echo "         ⚠️  Esperado 200, recebido $status_code"
    fi

    if [[ -n "${content_type}" ]] && ! echo "$content_type" | grep -qi 'application/javascript'; then
        echo "         ⚠️  Content-Type incorreto (esperado application/javascript)"
    fi
}

check_site() {
    local label="$1"
    local url="$2"

    echo "🔍 Testando $label..."

    local body_file
    body_file=$(mktemp)

    local http_code
    if ! http_code=$(curl -s -o "$body_file" -w "%{http_code}" --max-time 15 "$url" 2>/dev/null); then
        http_code="erro"
    fi

    case "$http_code" in
        200)
            echo "   ✅ Status: 200 OK"
            echo "   🎉 ${label} respondendo normalmente"

            local chunk_path
            chunk_path=$(grep -oP '/_next/static/chunks/(?:webpack|main|app|framework|pages)-[a-zA-Z0-9_-]+\\.js' "$body_file" | head -n 1 || true)

            if [[ -n "$chunk_path" ]]; then
                report_chunk "$label" "$url" "$chunk_path" "Chunk detectado automaticamente ($chunk_path)"
            else
                echo "      ⚠️  Nenhum chunk encontrado no HTML (a página pode não ter carregado o bundle)"
            fi

            if [[ -n "$KNOWN_CHUNK" ]]; then
                report_chunk "$label" "$url" "/_next/static/chunks/$KNOWN_CHUNK" "Chunk monitorado ($KNOWN_CHUNK)"
            fi
            ;;
        401)
            echo "   🔒 Status: 401 (Deploy privado ou em progresso)"
            echo "   📊 Verifique no dashboard: $DASHBOARD"
            ;;
        404)
            echo "   ❌ Status: 404 (Deploy não encontrado ou falhou)"
            echo "   📊 Verifique no dashboard: $DASHBOARD"
            ;;
        timeout)
            echo "   ⏱️  Timeout (pode estar buildando ainda)"
            echo "   📊 Verifique no dashboard: $DASHBOARD"
            ;;
        *)
            echo "   ⚠️  Status: $http_code"
            echo "   📊 Verifique no dashboard: $DASHBOARD"
            ;;
    esac

    rm -f "$body_file"
    echo ""
}

check_site "deployment preview" "$DEPLOYMENT_URL"
check_site "deploy Vercel (produção)" "$PROD_URL"
check_site "domínio personalizado" "$CUSTOM_DOMAIN_URL"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 AÇÕES NECESSÁRIAS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Abra o dashboard:"
echo "   $DASHBOARD"
echo ""
echo "2. Verifique o deployment com ID: 66oCAfgorRqEHTXVTELP1WUEPgp5"
echo ""
echo "3. Status possíveis:"
echo "   ⏳ Building - Aguarde conclusão (5-10 min)"
echo "   ✅ Ready - Execute: ./validate-mime-fix.sh"
echo "   ❌ Error - Configure Root Directory e Redeploy"
echo ""
echo "4. Se necessário, configure Root Directory:" 
echo "   https://vercel.com/tecnocursos/estudio_ia_videos/settings"
echo "   Root Directory: estudio_ia_videos"
echo ""
echo "5. Utilize a variável KNOWN_CHUNK para monitorar hashes específicos (ex.: KNOWN_CHUNK=webpack-abc123.js ./check-deploy-status.sh)"
echo ""
