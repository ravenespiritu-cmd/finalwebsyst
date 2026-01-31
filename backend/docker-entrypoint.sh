#!/bin/bash
set -e

echo "=== Environment Debug ==="
echo "DB_HOST: $DB_HOST"
echo "DB_PORT: $DB_PORT"
echo "DB_DATABASE: $DB_DATABASE"
echo "DB_USERNAME: $DB_USERNAME"
echo "APP_KEY set: $([ -n "$APP_KEY" ] && echo 'yes' || echo 'no')"

echo "=== Running database migrations ==="
php artisan migrate --force 2>&1 || echo "Migration failed"

echo "=== Seeding database ==="
php artisan db:seed --force 2>&1 || echo "Seeding skipped (already seeded)"

echo "=== Clearing cache ==="
php artisan config:clear 2>&1 || true
php artisan cache:clear 2>&1 || true

echo "=== Starting Laravel server ==="
exec php artisan serve --host=0.0.0.0 --port=8080
