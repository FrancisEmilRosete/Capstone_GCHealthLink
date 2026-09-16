<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class AuditLogFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id' => Str::ulid(),
            'user_role' => fake()->randomElement(['STUDENT', 'CLINIC_STAFF', 'ADMIN']),
            'action_type' => fake()->randomElement(['LOGIN', 'VIEW_RECORD', 'UPDATE_RECORD', 'DISPENSE_MEDICINE']),
            'description' => fake()->randomElement([
                'User logged into the system.',
                'Viewed student medical records.',
                'Updated the physical examination results.',
                'Dispensed medicine to a student.',
                'Exported clinic reports.'
            ]),
            'action' => fake()->randomElement(['Login', 'View', 'Update', 'Dispense', 'Export']),
            'target_id' => Str::ulid(),
            'ip_address' => fake()->ipv4(),
            'metadata' => json_encode(['browser' => 'Chrome']),
            'timestamp' => now(),
        ];
    }
}
