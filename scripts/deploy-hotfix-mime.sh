#!/bin/bash
# DEPLOY URGENTE - Hotfix MIME Type Errors
# Execute este script para fazer push do hotfix para produção

set -e  # Exit on error

echo "========================================="
echo "🚨 DEPLOY URGENTE - Hotfix MIME Type"
echo "========================================="
echo ""

# Verificar branch atual
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ ERRO: Você não está em main (branch atual: $CURRENT_BRANCH)"
    echo "Execute: git checkout main"
    exit 1
fi

# Mostrar último commit
echo "📋 Último commit em main:"
git log --oneline -1
echo ""

# Verificar status
echo "📊 Status do repositório:"
git status --short
echo ""

# Confirmar deploy
read -p "🚀 Fazer push para origin/main e deployar? (s/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    echo "❌ Deploy cancelado"
    exit 1
fi

echo ""
echo "⏳ Fazendo push para origin/main..."

# Tentar push
if git push origin main; then
    echo ""
    echo "✅ Push concluído com sucesso!"
    echo ""
    echo "📌 Próximos passos:"
    echo "   1. Acesse: https://vercel.com/seu-time/cursostecno/deployments"
    echo "   2. Aguarde build completar (2-5 min)"
    echo "   3. Teste: https://cursostecno.com.br"
    echo "      - F12 → Console: ZERO erros MIME type"
    echo "      - Network → CSS/JS: status 200"
    echo ""
    echo "📊 Monitoramento:"
    echo "   - Primeiros 15 min: verifique console a cada 2-3 min"
    echo "   - Sentry: erros MIME type devem cair a zero"
    echo "   - Vercel Logs: sem erros 500/502"
    echo ""
else
    EXIT_CODE=$?
    echo ""
    echo "❌ Erro ao fazer push (código: $EXIT_CODE)"
    echo ""
    echo "🔧 Possíveis soluções:"
    echo ""
    echo "1. Conflito com origin/main:"
    echo "   git pull origin main --rebase"
    echo "   git push origin main"
    echo ""
    echo "2. Sem conectividade:"
    echo "   - Verifique conexão de rede"
    echo "   - Tente: ping github.com"
    echo ""
    echo "3. Sem permissões:"
    echo "   - Verifique suas credenciais GitHub"
    echo "   - Configure: git config credential.helper store"
    echo ""
    echo "4. Deploy manual via Vercel CLI:"
    echo "   cd estudio_ia_videos"
    echo "   vercel --prod"
    echo ""
    exit $EXIT_CODE
fi

echo "========================================="
echo "✅ Deploy iniciado!"
echo "========================================="
