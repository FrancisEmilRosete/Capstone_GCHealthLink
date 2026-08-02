<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class HealthAdvisoryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id' => Str::ulid(),
            'title' => fake()->randomElement([
                'Upcoming Flu Vaccination Drive',
                'Campus Clinic Temporary Closure',
                'COVID-19 Health Protocols Update',
                'Dengue Outbreak Alert',
                'Annual Physical Exam Schedule',
                'Mental Health Awareness Seminar'
            ]),
            'message' => fake()->randomElement([
                'Please be informed that the clinic will be conducting a free flu vaccination drive next week at the main lobby.',
                'The school clinic will be closed this Friday afternoon for staff training. For medical emergencies, please proceed to the nearest hospital.',
                'A gentle reminder to all students and staff to follow basic health protocols inside the campus to prevent the spread of seasonal flu.',
                'Please be advised to wear mosquito repellent and report any stagnant water to the maintenance department as a precaution against Dengue.',
                'All first-year students are required to undergo their annual physical examination starting next month. Please check your schedule.',
            ]),
            'target_dept' => fake()->randomElement(['ALL', 'CCS', 'CAHS']),
            'severity' => fake()->randomElement(['INFO', 'WARNING', 'CRITICAL']),
            'created_by' => Str::ulid(), // We will override this in seeder
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
