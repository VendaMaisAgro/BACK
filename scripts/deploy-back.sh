#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/BACK}"
BRANCH="${BRANCH:-main}"
IMAGE_NAME="${IMAGE_NAME:-ghcr.io/vendamaisagro/back:latest}"

echo "==> Deploy starting..."
echo "APP_DIR=$APP_DIR | BRANCH=$BRANCH | IMAGE=$IMAGE_NAME"

cd "$APP_DIR"

# Git update não é mais necessário - a imagem Docker já contém o código
# echo "==> Git update"
# git fetch origin
# git checkout "$BRANCH"
# git pull --ff-only origin "$BRANCH"

echo "==> Check disk space"
AVAILABLE_SPACE=$(df / | tail -1 | awk '{print $4}')
echo "Available space: ${AVAILABLE_SPACE}KB"

# Preventive cleanup to ensure space for new image
echo "==> Preventive cleanup (before pull)"
docker container prune -f || true
docker image prune -f || true
docker image prune -a -f --filter "until=24h" || true

echo "==> Pull latest Docker image"
docker pull "$IMAGE_NAME"

echo "==> Resolve failed migrations (if any)"
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate resolve --applied 20251020152709_add_seller_approved_to_sale || true

echo "==> Prisma migrate deploy"
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy

echo "==> Kill any processes using port 5000"
sudo lsof -ti :5000 | xargs -r sudo kill || true

echo "==> Start app"
docker compose -f docker-compose.prod.yml up -d app

echo "==> Cleanup old images and containers"
docker container prune -f || true
docker image prune -a -f || true
docker volume prune -f || true
docker builder prune -f || true

echo "==> Status"
docker compose -f docker-compose.prod.yml ps

echo "==> Deploy finished."
