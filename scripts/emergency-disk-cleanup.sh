#!/usr/bin/env bash
# Emergency disk cleanup script for EC2 with severe space constraints
set -euo pipefail

echo "==> Current disk usage:"
df -h /

echo ""
echo "==> Stopping all Docker containers..."
docker stop $(docker ps -aq) 2>/dev/null || true

echo ""
echo "==> Removing all containers..."
docker rm -f $(docker ps -aq) 2>/dev/null || true

echo ""
echo "==> Removing all images..."
docker rmi -f $(docker images -aq) 2>/dev/null || true

echo ""
echo "==> Removing all volumes..."
docker volume rm -f $(docker volume ls -q) 2>/dev/null || true

echo ""
echo "==> Pruning Docker system..."
docker system prune -a -f --volumes || true

echo ""
echo "==> Stopping Docker daemon..."
sudo systemctl stop docker

echo ""
echo "==> Removing Docker overlay2 directory..."
sudo rm -rf /var/lib/docker/overlay2/*

echo ""
echo "==> Cleaning apt cache..."
sudo apt-get clean
sudo apt-get autoclean

echo ""
echo "==> Cleaning old logs..."
sudo journalctl --vacuum-time=1d
sudo find /var/log -type f -name "*.log" -exec truncate -s 0 {} \;
sudo find /var/log -type f -name "*.gz" -delete

echo ""
echo "==> Removing npm cache..."
rm -rf ~/.npm
sudo rm -rf /root/.npm

echo ""
echo "==> Starting Docker daemon..."
sudo systemctl start docker

echo ""
echo "==> Final disk usage:"
df -h /

echo ""
echo "==> Disk cleanup complete!"
echo "WARNING: All Docker images and containers were removed."
echo "You need to pull and start your application again."
