<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id' => Str::ulid(),
            'role' => 'STUDENT',
            'email' => fake()->unique()->safeEmail(),
            'password' => '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
            'qr_token' => Str::random(32),
            'qr_token_issued_at' => now(),
            'qr_token_expires_at' => now()->addDays(30),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
