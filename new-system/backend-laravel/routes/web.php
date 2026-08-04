<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/run-db-seed-999', function () {
    try {
        Artisan::call('db:seed', ['--force' => true]);

        return 'Database successfully seeded with initial data!';
    } catch (\Throwable $e) {
        return '<strong>Seeding Error:</strong> ' . $e->getMessage();
    }
});
