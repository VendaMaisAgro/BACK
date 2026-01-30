#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/vendamaisagro}"     # onde o repo está clonado na EC2
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"  # se BACK for raiz, remova "BACK/"
ENV_FILE="${ENV_FILE:-.env}"

echo "==> Deploy starting..."
echo "APP_DIR=$APP_DIR | BRANCH=$BRANCH"

cd "$APP_DIR"

echo "==> Git update"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"


echo "==> Prisma migrate deploy"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm app npx prisma migrate deploy

echo "==> Build & start app"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build app

echo "==> Cleanup old images"
docker image prune -f || true

echo "==> Status"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo "==> Deploy finished."
