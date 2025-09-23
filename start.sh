#!/bin/bash

# 🏫 EECM - Sistema Disciplinar - Inicializar WAHA
# Script para subir o container WhatsApp HTTP API

echo "🚀 Iniciando WAHA (WhatsApp HTTP API) para EECM Jupiara..."

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando! Inicie o Docker Desktop primeiro."
    exit 1
fi

# Criar diretório para sessões se não existir
mkdir -p ./waha-sessions

# Parar container existente (se houver)
echo "🔄 Parando containers anteriores..."
docker-compose down

# Subir o container
echo "📦 Subindo container WAHA..."
docker-compose up -d

# Aguardar inicialização
echo "⏱️  Aguardando inicialização (15 segundos)..."
sleep 15

# Verificar status
if docker ps | grep -q "eecm-waha"; then
    echo "✅ WAHA rodando com sucesso!"
    echo ""
    echo "📋 PRÓXIMOS PASSOS:"
    echo "1. Acesse: http://localhost:3000"
    echo "2. Teste a API: curl -X GET http://localhost:3000/api/sessions -H 'X-Api-Key: EECM_JUPIARA_2024_SUPER_SECRETA_KEY'"
    echo "3. Para criar sessão WhatsApp, execute:"
    echo "   curl -X POST http://localhost:3000/api/sessions -H 'X-Api-Key: EECM_JUPIARA_2024_SUPER_SECRETA_KEY' -H 'Content-Type: application/json' -d '{\"name\":\"eecm-disciplinar\"}'"
    echo ""
    echo "📱 QR Code aparecerá nos logs: docker-compose logs -f"
    echo ""
    echo "🔗 Documentação: https://waha.devlike.pro"
else
    echo "❌ Erro ao iniciar WAHA!"
    echo "📋 Verificar logs: docker-compose logs"
    exit 1
fi