<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class PhysicalExaminationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id' => Str::ulid(),
            'year_level' => fake()->randomElement(['YR_1', 'YR_2', 'YR_3', 'YR_4']),
            'exam_date' => fake()->dateTimeBetween('-1 year', 'now')->format('Y-m-d'),
            'bp' => '120/80',
            'cr' => '80',
            'rr' => '16',
            'temp' => '36.5',
            'weight' => fake()->numberBetween(50, 90) . ' kg',
            'height' => fake()->numberBetween(150, 190) . ' cm',
            'bmi' => '22.5',
            'visual_acuity' => '20/20',
            'skin' => 'Normal',
            'heent' => 'Normal',
            'chest_lungs' => 'Clear',
            'heart' => 'Regular',
            'abdomen' => 'Soft',
            'extremities' => 'Normal',
            'others' => null,
            'examined_by' => fake()->name(),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
