<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class LabResultFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id' => Str::ulid(),
            'date' => fake()->dateTimeBetween('-1 year', 'now')->format('Y-m-d'),
            'date_received' => fake()->dateTimeBetween('-1 year', 'now')->format('Y-m-d H:i:s'),
            'hgb' => fake()->numberBetween(12, 16) . ' g/dL',
            'hct' => fake()->numberBetween(35, 50) . '%',
            'wbc' => fake()->numberBetween(4, 11) . ' x10^9/L',
            'plt_ct' => fake()->numberBetween(150, 400) . ' x10^9/L',
            'blood_type' => fake()->randomElement(['A+', 'B+', 'O+', 'AB+', 'O-']),
            'xray_result' => fake()->randomElement(['NORMAL', 'ABNORMAL']),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
