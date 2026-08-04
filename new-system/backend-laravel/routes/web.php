<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/run-db-seed-999', function () {
    try {
        Artisan::call('migrate:fresh', ['--seed' => true, '--force' => true]);

        return 'Database wiped, re-migrated, and seeded successfully!';
    } catch (\Throwable $e) {
        return '<strong>Seeding Error:</strong> ' . $e->getMessage();
    }
});
