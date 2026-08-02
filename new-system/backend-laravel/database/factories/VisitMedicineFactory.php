<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class VisitMedicineFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id' => Str::ulid(),
            'quantity' => fake()->numberBetween(1, 5),
            'status' => 'DISPENSED',
            'created_at' => now(),
        ];
    }
}
