<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class InventoryBatchFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id' => Str::ulid(),
            'batch_number' => 'BATCH-' . fake()->unique()->numerify('#####'),
            'current_stock' => fake()->numberBetween(50, 200),
            'expiration_date' => fake()->dateTimeBetween('+1 month', '+2 years')->format('Y-m-d'),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
