FROM php:8.3-cli

# Install dependencies
RUN apt-get update && apt-get install -y \
    git curl zip unzip libpng-dev libonig-dev libxml2-dev libzip-dev \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy composer files
COPY composer.json ./

# Install PHP dependencies (fresh install, no lock file)
RUN composer install --no-dev --optimize-autoloader --no-interaction --ignore-platform-reqs

# Copy all other files
COPY . .

# Set permissions
RUN chmod -R 775 storage bootstrap/cache 2>/dev/null || true

# Create storage directories
RUN mkdir -p storage/framework/sessions storage/framework/views storage/framework/cache storage/logs

EXPOSE 8080

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8080"]
