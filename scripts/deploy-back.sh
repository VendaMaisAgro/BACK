#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/vendamaisagro}"
BRANCH="${BRANCH:-main}"
IMAGE_NAME="${IMAGE_NAME:-ghcr.io/vendamaisagro/back:latest}"

echo "==> Deploy starting..."
echo "APP_DIR=$APP_DIR | BRANCH=$BRANCH | IMAGE=$IMAGE_NAME"

cd "$APP_DIR"

echo "==> Git update"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> Pull latest Docker image"
docker pull "$IMAGE_NAME"

echo "==> Prisma migrate deploy"
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy

echo "==> Start app"
docker compose -f docker-compose.prod.yml up -d app

echo "==> Cleanup old images"
docker image prune -f || true

echo "==> Status"
docker compose -f docker-compose.prod.yml ps

echo "==> Deploy finished."
