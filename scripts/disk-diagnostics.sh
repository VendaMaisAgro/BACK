#!/usr/bin/env bash
# Script de diagnóstico detalhado para investigar uso de disco no EC2
set -euo pipefail

echo "=========================================="
echo "🔍 DIAGNÓSTICO DE DISCO - VendaMais Agro"
echo "=========================================="
echo ""
date
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# 1. RESUMO GERAL DO DISCO
print_header "📊 RESUMO GERAL DO DISCO"
df -h /
echo ""
AVAILABLE_KB=$(df / | tail -1 | awk '{print $4}')
AVAILABLE_GB=$((AVAILABLE_KB / 1024 / 1024))
USED_PERCENT=$(df / | tail -1 | awk '{print $5}' | tr -d '%')

if [ "$USED_PERCENT" -gt 80 ]; then
    echo -e "${RED}⚠️  ALERTA: Disco usando mais de 80% ($USED_PERCENT%)${NC}"
elif [ "$USED_PERCENT" -gt 60 ]; then
    echo -e "${YELLOW}⚡ ATENÇÃO: Disco usando $USED_PERCENT%${NC}"
else
    echo -e "${GREEN}✅ Uso de disco normal: $USED_PERCENT%${NC}"
fi

# 2. ESPAÇO USADO POR DOCKER
print_header "🐳 ANÁLISE DOCKER"

echo "📈 Docker System Summary:"
docker system df -v 2>/dev/null || echo "Erro ao obter informações do Docker"
echo ""

echo "📦 Imagens Docker (ordenadas por tamanho):"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | sort -k3 -h || true
echo ""

echo "🔢 Contagem de Imagens:"
TOTAL_IMAGES=$(docker images -q | wc -l)
DANGLING_IMAGES=$(docker images -f "dangling=true" -q | wc -l)
echo "  Total de imagens: $TOTAL_IMAGES"
echo "  Imagens dangling (não usadas): $DANGLING_IMAGES"
echo ""

echo "📦 Containers (todos):"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Size}}" || true
echo ""

echo "💾 Volumes Docker:"
docker volume ls -q | wc -l | xargs echo "  Total de volumes:"
docker volume ls || true
echo ""

echo "🏗️  Build Cache:"
docker system df -v 2>/dev/null | grep -A5 "Build Cache" || true

# 3. DIRETÓRIOS DOCKER
print_header "📁 DIRETÓRIOS DOCKER"

if [ -d /var/lib/docker ]; then
    echo "Tamanho dos diretórios Docker:"
    sudo du -sh /var/lib/docker/* 2>/dev/null | sort -h || echo "Erro ao analisar /var/lib/docker"
    echo ""
    echo "Total /var/lib/docker:"
    sudo du -sh /var/lib/docker 2>/dev/null || true
fi

# 4. LOGS DO SISTEMA
print_header "📋 LOGS DO SISTEMA"

echo "Tamanho do journalctl:"
sudo journalctl --disk-usage 2>/dev/null || true
echo ""

echo "Top 10 maiores arquivos de log:"
sudo find /var/log -type f -exec du -h {} + 2>/dev/null | sort -rh | head -10 || true

# 5. CACHE E TEMPORÁRIOS
print_header "🗂️  CACHE E ARQUIVOS TEMPORÁRIOS"

echo "Cache do NPM:"
du -sh ~/.npm 2>/dev/null || echo "  ~/.npm não encontrado"
sudo du -sh /root/.npm 2>/dev/null || echo "  /root/.npm não encontrado"
echo ""

echo "Cache do Puppeteer:"
du -sh ~/.cache/puppeteer 2>/dev/null || echo "  Não encontrado em ~/.cache/puppeteer"
du -sh /home/ubuntu/.cache/puppeteer 2>/dev/null || echo "  Não encontrado em /home/ubuntu/.cache/puppeteer"
echo ""

echo "Diretórios /tmp e /var/tmp:"
du -sh /tmp 2>/dev/null || true
du -sh /var/tmp 2>/dev/null || true

# 6. APT CACHE
print_header "📦 APT CACHE"
du -sh /var/cache/apt/archives 2>/dev/null || true

# 7. MAIORES DIRETÓRIOS NA RAIZ
print_header "📊 TOP 20 MAIORES DIRETÓRIOS EM /"
echo "Analisando... (pode demorar alguns segundos)"
sudo du -h --max-depth=2 / 2>/dev/null | sort -rh | head -20 || true

# 8. INODES (arquivos pequenos podem esgotar inodes)
print_header "📊 ANÁLISE DE INODES"
df -i /

# 9. SWAP
print_header "💾 MEMÓRIA SWAP"
swapon --show || echo "Nenhum SWAP configurado"
free -h

# 10. RESUMO E RECOMENDAÇÕES
print_header "📋 RESUMO E RECOMENDAÇÕES"

echo "Espaço disponível: ${AVAILABLE_GB}GB (${AVAILABLE_KB}KB)"
echo ""

if [ "$DANGLING_IMAGES" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Você tem $DANGLING_IMAGES imagens dangling que podem ser removidas${NC}"
fi

if [ "$TOTAL_IMAGES" -gt 5 ]; then
    echo -e "${YELLOW}⚠️  Você tem $TOTAL_IMAGES imagens Docker. Considere manter apenas as necessárias${NC}"
fi

JOURNALCTL_SIZE=$(sudo journalctl --disk-usage 2>/dev/null | grep -oP '\d+\.\d+[GM]' || echo "0")
echo "📋 Logs do sistema (journalctl): $JOURNALCTL_SIZE"

echo ""
echo "=========================================="
echo "✅ Diagnóstico completo!"
echo "=========================================="
echo ""
echo "💡 Próximos passos recomendados:"
echo "1. Se o disco está >80% cheio, execute: ./scripts/cleanup-ec2.sh"
echo "2. Se persistir, execute: ./scripts/emergency-disk-cleanup.sh"
echo "3. Considere aumentar o volume EBS do EC2"
echo ""
