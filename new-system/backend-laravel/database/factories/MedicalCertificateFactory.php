<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class MedicalCertificateFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id' => Str::ulid(),
            'issued_by_role' => 'DOCTOR',
            'certificate_type' => fake()->randomElement(['consultation', 'physical_examination']),
            'diagnosis_findings' => fake()->randomElement([
                'Acute Pharyngitis',
                'Viral Gastroenteritis',
                'Upper Respiratory Tract Infection',
                'Tension Headache',
                'Allergic Rhinitis',
                'Dysmenorrhea',
                'Sprained Ankle'
            ]),
            'recommendations_remarks' => fake()->randomElement([
                'Rest for 2 days',
                'Take prescribed medications',
                'Hydrate properly',
                'Follow up after 1 week',
                'Avoid strenuous activities for 3 days'
            ]),
            'remarks' => fake()->randomElement([
                'Fit to attend classes',
                'Excuse from PE activities',
                'Needs bed rest',
                'Cleared for school participation'
            ]),
            'issued_at' => now(),
        ];
    }
}
