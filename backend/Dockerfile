FROM php:8.3-cli

# Install dependencies
RUN apt-get update && apt-get install -y \
    git curl zip unzip libpng-dev libonig-dev libxml2-dev libzip-dev \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Build context may be repo root (monorepo) or backend/ — copy backend into /app
COPY backend /app
WORKDIR /app

# Remove any existing composer.lock to avoid version conflicts
RUN rm -f composer.lock

# Install dependencies WITHOUT running scripts (to avoid artisan issues)
RUN composer update --no-dev --optimize-autoloader --no-interaction --no-scripts

# Now run the post-install scripts manually (artisan file exists now)
RUN composer run-script post-autoload-dump || true

# Set permissions
RUN chmod -R 775 storage bootstrap/cache 2>/dev/null || true
RUN mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache storage/logs

# Inline entrypoint so build never depends on docker-entrypoint.sh in context
RUN set -e; \
  echo '#!/bin/bash' > /docker-entrypoint.sh; \
  echo 'set -e' >> /docker-entrypoint.sh; \
  echo 'echo "=== Environment Debug ==="' >> /docker-entrypoint.sh; \
  echo 'echo "DB_HOST: $DB_HOST" "DB_PORT: $DB_PORT" "APP_KEY set: $([ -n \"$APP_KEY\" ] && echo yes || echo no)"' >> /docker-entrypoint.sh; \
  echo 'echo "=== Running database migrations ==="' >> /docker-entrypoint.sh; \
  echo 'php artisan migrate --force 2>&1 || echo "Migration failed"' >> /docker-entrypoint.sh; \
  echo 'echo "=== Seeding database ==="' >> /docker-entrypoint.sh; \
  echo 'php artisan db:seed --force 2>&1 || echo "Seeding skipped"' >> /docker-entrypoint.sh; \
  echo 'php artisan config:clear 2>&1 || true' >> /docker-entrypoint.sh; \
  echo 'php artisan cache:clear 2>&1 || true' >> /docker-entrypoint.sh; \
  echo 'echo "=== Starting Laravel server ==="' >> /docker-entrypoint.sh; \
  echo 'exec php artisan serve --host=0.0.0.0 --port=8080' >> /docker-entrypoint.sh; \
  chmod +x /docker-entrypoint.sh

EXPOSE 8080

CMD ["/docker-entrypoint.sh"]
