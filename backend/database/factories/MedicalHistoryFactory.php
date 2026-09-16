<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class MedicalHistoryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id' => Str::ulid(),
            'allergy_enc' => fake()->boolean() ? 'Penicillin' : null,
            'asthma_enc' => fake()->boolean() ? 'Yes, childhood' : null,
            'chicken_pox_enc' => fake()->boolean() ? 'Yes' : null,
            'diabetes_enc' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
