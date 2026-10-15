FROM php:8.2-cli

# Install system packages and PHP PostgreSQL extensions
RUN apt-get update && apt-get install -y \
    git zip unzip libpq-dev \
    && docker-php-ext-configure pgsql -with-pgsql=/usr/local/pgsql \
    && docker-php-ext-install pdo pdo_pgsql pgsql

# Copy Composer from the official container
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY . .

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader

# Startup script (migrations, seeders, caches, server).
# sed strips CRLF in case the file was saved on Windows.
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

# Expose port and launch Laravel
EXPOSE 8000
CMD ["./start.sh"]
