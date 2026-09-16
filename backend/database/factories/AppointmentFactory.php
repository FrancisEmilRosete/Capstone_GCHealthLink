<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class AppointmentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id' => Str::ulid(),
            'preferred_date' => fake()->dateTimeBetween('now', '+1 month')->format('Y-m-d'),
            'preferred_time' => fake()->time('H:i'),
            'service_type' => fake()->randomElement(['Medical Consultation', 'Dental Consultation']),
            'symptoms' => fake()->randomElement([
                'Experiencing mild fever and headache for the past 2 days.',
                'Routine dental checkup and cleaning.',
                'Severe toothache in the lower right molar.',
                'Persistent cough and sore throat.',
                'Stomach ache and feeling nauseous after meals.',
                'Consultation for skin rash and allergies.',
                'Requesting a medical certificate for PE class.',
                'Follow-up checkup for previous prescription.'
            ]),
            'status' => fake()->randomElement(['WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
