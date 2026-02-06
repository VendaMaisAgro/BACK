#!/usr/bin/env bash
set -euo pipefail

echo "======================================"
echo "🧹 EC2 Cleanup Script - VendaMais Agro"
echo "======================================"
echo ""

# Function to print disk usage
print_disk_usage() {
    echo "📊 Disk Usage:"
    df -h / | grep -v Filesystem
    echo ""
}

echo "🔍 BEFORE cleanup:"
print_disk_usage

echo "🐳 Docker System Stats:"
docker system df || true
echo ""

echo "🗑️  Removing Puppeteer cache..."
rm -rf /home/ubuntu/.cache/puppeteer || true

# 1. Stop containers (to release locks)
echo "⏸️  Stopping Docker containers..."
docker compose -f /home/ubuntu/BACK/docker-compose.prod.yml down || true

# 2. Clean Docker completely
echo "🐳 Cleaning Docker system..."
echo "  - Removing stopped containers..."
docker container prune -f || true
echo "  - Removing dangling images..."
docker image prune -f || true
echo "  - Removing unused images (older than 24h)..."
docker image prune -a -f --filter "until=24h" || true
echo "  - Removing unused volumes..."
docker volume prune -f || true
echo "  - Removing build cache..."
docker builder prune -a -f || true

# 3. Clean system logs
echo "📋 Cleaning system logs..."
sudo journalctl --vacuum-size=50M
sudo journalctl --vacuum-time=3d

# 4. Clean APT cache
echo "📦 Cleaning APT cache..."
sudo apt-get clean
sudo apt-get autoclean
sudo apt-get autoremove -y

# 5. Clean old logs
echo "🗑️  Removing old log files..."
sudo find /var/log -type f -name "*.gz" -delete || true
sudo find /var/log -type f -name "*.1" -delete || true
sudo find /var/log -type f -name "*.old" -delete || true

# 6. Clean temp files
echo "🗂️  Cleaning temporary files..."
sudo rm -rf /tmp/* || true
sudo rm -rf /var/tmp/* || true

# 7. Create SWAP if not exists
if ! swapon --show | grep -q '/swapfile'; then
    echo "💾 Creating SWAP (2GB)..."
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
    echo "✅ SWAP created and enabled"
else
    echo "✅ SWAP already exists"
fi

echo ""
echo "🔍 AFTER cleanup:"
print_disk_usage

echo "🐳 Docker System Stats After Cleanup:"
docker system df || true

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📌 Next steps:"
echo "1. Run the deploy script: ./scripts/deploy-back.sh"
echo "   OR"
echo "2. Go to GitHub Actions: https://github.com/VendaMaisAgro/BACK/actions"
echo "3. Click 'Re-run all jobs' on the latest workflow"
echo ""
