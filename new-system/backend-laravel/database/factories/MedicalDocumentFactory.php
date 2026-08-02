<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class MedicalDocumentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id' => Str::ulid(),
            'file_name' => 'document_' . Str::random(5) . '.pdf',
            'file_url' => 'documents/fake_path_' . Str::random(5) . '.pdf',
            'document_type' => fake()->randomElement(['PHYSICAL_EXAM', 'LAB_RESULT', 'MED_CERT']),
            // Note: MedicalDocument uses uploaded_at for CREATED_AT, no UPDATED_AT
            'uploaded_at' => now(),
        ];
    }
}
