#!/bin/sh
set -eu

echo "Initializing database..."
echo "Running Prisma generate"
npx prisma generate

echo "Applying schema (db push)"
npx prisma db push --accept-data-loss

echo "Seeding data"
npx tsx prisma/seed.ts

echo "Database initialization complete."
