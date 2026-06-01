#!/usr/bin/env sh
set -eu

echo "Starting ICMS Ecologico Nova Iguacu backend..."

if [ "${INSTALL_DEPS_ON_START:-true}" = "true" ]; then
  echo "Installing dependencies..."
  npm install
fi

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  if [ "${PRISMA_MIGRATION_MODE:-dev}" = "deploy" ]; then
    echo "Running Prisma migrations in deploy mode..."
    npx prisma migrate deploy
  else
    echo "Running Prisma migrations in dev mode..."
    npx prisma migrate dev
  fi
fi

if [ "${RUN_SEEDS:-false}" = "true" ]; then
  SEED_FILE="${SEED_SQL_PATH:-seeds/nova-iguacu.seed.sql}"

  if [ -f "$SEED_FILE" ]; then
    echo "Running seed SQL: $SEED_FILE"
    npx prisma db execute --file "$SEED_FILE" --schema prisma/schema.prisma
  else
    echo "Seed file not found: $SEED_FILE. Skipping seeds."
  fi
fi

echo "Launching server on port ${PORT:-3000}..."
if [ -f "dist/server.js" ]; then
  exec node dist/server.js
fi

exec npm run dev
