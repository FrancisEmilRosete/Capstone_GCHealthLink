<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});


use Illuminate\Support\Facades\Artisan;

Route::get('/run-db-seed-999', function () {
    Artisan::call('migrate:fresh', ['--seed' => true, '--force' => true]);
    return 'Database migrated and seeded successfully!';
});