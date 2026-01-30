FROM php:8.3-cli

# Install dependencies
RUN apt-get update && apt-get install -y \
    git curl zip unzip libpng-dev libonig-dev libxml2-dev libzip-dev \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy ALL application files first
COPY . .

# Debug: List files to verify artisan exists
RUN ls -la && ls -la artisan || echo "artisan not found"

# Remove any existing composer.lock to avoid version conflicts
RUN rm -f composer.lock

# Install dependencies WITHOUT running scripts (to avoid artisan issues)
RUN composer update --no-dev --optimize-autoloader --no-interaction --no-scripts

# Now run the post-install scripts manually (artisan file exists now)
RUN composer run-script post-autoload-dump || true

# Set permissions
RUN chmod -R 775 storage bootstrap/cache 2>/dev/null || true
RUN mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache storage/logs

EXPOSE 8080

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8080"]
