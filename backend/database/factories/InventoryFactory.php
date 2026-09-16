<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class InventoryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id' => Str::ulid(),
            'item_name' => fake()->unique()->word() . ' Medicine',
            'reorder_threshold' => fake()->numberBetween(10, 50),
            'dosage_value' => '500mg',
            'form_dosage' => 'Tablet',
            'unit' => 'pcs',
            'category' => fake()->randomElement(['MEDICINE', 'DENTAL']),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
