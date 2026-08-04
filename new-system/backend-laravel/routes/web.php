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
                'name'              => 'Nurse Admin',
                'password'          => Hash::make('password123'),
                'role'              => 'CLINIC_STAFF',
                'clinic_staff_type' => 'NURSE',
            ]
        );

        return "Success! User created: " . $user->email;
    } catch (\Throwable $e) {
        return '<strong>Database Error:</strong> ' . $e->getMessage();
    }
});


