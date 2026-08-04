<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/run-db-seed-999', function () {
    try {
        Artisan::call('migrate', ['--force' => true]);

        $user = User::updateOrCreate(
            ['email' => 'nurse@gordoncollege.edu.ph'],
            [
                'password' => Hash::make('password123'),
                'role' => 'nurse',
            ]
        );

        return 'Migration complete. Default nurse user created/updated successfully.';
    } catch (\Throwable $e) {
        return '<strong>Database Error:</strong> ' . $e->getMessage();
    }
});

