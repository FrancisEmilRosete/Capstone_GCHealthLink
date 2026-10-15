#!/bin/sh
# Container entrypoint for Render (no shell access needed).
# Runs on every deploy/restart: clears caches, migrates, seeds, then serves.
set -e

php artisan config:clear
php artisan optimize:clear

php artisan migrate --force

# Idempotent reference-data seeders (previously in the Dockerfile CMD)
php artisan db:seed --class=CourseSeeder --force
php artisan db:seed --class=ClinicStaffSeeder --force

php artisan config:cache
php artisan route:cache

# Start the web server. Base image is php:8.2-cli (no Apache/FPM), so we use
# artisan serve. `exec` makes PHP PID 1 so it receives Render's stop signals.
exec php artisan serve --host=0.0.0.0 --port="${PORT:-8000}"
