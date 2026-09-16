<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ClinicVisitFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id' => Str::ulid(),
            'visit_date' => fake()->dateTimeBetween('-1 year', 'now')->format('Y-m-d'),
            'visit_time' => fake()->time('H:i'),
            'chief_complaint_enc' => fake()->randomElement([
                json_encode(['chiefComplaint' => 'Patient complains of severe headache and mild fever for 2 days.', 'diagnosis' => 'Viral fever', 'treatmentProvided' => 'Rest, hydration, and Paracetamol.']),
                json_encode(['chiefComplaint' => 'Experiencing stomach ache and nausea after eating.', 'diagnosis' => 'Food poisoning', 'treatmentProvided' => 'Prescribed antacids and advised rest.']),
                json_encode(['chiefComplaint' => 'Persistent cough and sore throat.', 'diagnosis' => 'Upper respiratory tract infection', 'treatmentProvided' => 'Cough syrup and lozenges.']),
                json_encode(['chiefComplaint' => 'Sprained ankle during physical education class.', 'diagnosis' => 'Mild ankle sprain', 'treatmentProvided' => 'Cold compress and pain relievers.']),
            ]),
            'concern_tag' => fake()->randomElement(['Headache', 'Fever', 'Stomach Ache', 'General Consultation']),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
