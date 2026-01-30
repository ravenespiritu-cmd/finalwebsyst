FROM php:8.3-cli

# Install dependencies
RUN apt-get update && apt-get install -y \
    git curl zip unzip libpng-dev libonig-dev libxml2-dev libzip-dev \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy composer.json only (NOT composer.lock)
COPY composer.json ./

# Install dependencies fresh (creates new lock file compatible with PHP 8.3)
RUN composer update --no-dev --optimize-autoloader --no-interaction

# Copy rest of the application
COPY . .

# Remove old composer.lock if it exists and regenerate autoloader
RUN rm -f composer.lock && composer dump-autoload --optimize

# Set permissions
RUN chmod -R 775 storage bootstrap/cache 2>/dev/null || true
RUN mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache storage/logs

EXPOSE 8080

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8080"]
