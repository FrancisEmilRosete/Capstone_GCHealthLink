<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class StudentProfileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id' => Str::ulid(),
            'student_number' => fake()->numberBetween(2023, 2026) . fake()->unique()->numerify('#####'),
            'first_name' => fake()->randomElement(['Juan', 'Maria', 'Jose', 'Luz', 'Antonio', 'Teresita', 'Francisco', 'Carmelita', 'Pedro', 'Rosario', 'Manuel', 'Corazon', 'Eduardo', 'Joy', 'Grace', 'Mark', 'Paul', 'Rhea', 'Lito', 'Boyet', 'Marites', 'Junjun', 'Nenita', 'Crisanto', 'Lourdes']),
            'last_name' => fake()->randomElement(['Dela Cruz', 'Garcia', 'Reyes', 'Ramos', 'Mendoza', 'Santos', 'Flores', 'Gonzales', 'Bautista', 'Villanueva', 'Fernandez', 'Cruz', 'De Leon', 'Ocampo', 'Tolentino', 'Domingo', 'Gomez', 'Aquino', 'Navarro', 'Mercado', 'Soriano', 'Perez', 'Castro', 'Rivera']),
            'mi' => fake()->randomLetter(),
            'course_dept' => fake()->randomElement(['CCS', 'CAHS', 'CBA', 'CEAS', 'CHTM']),
            'course' => fake()->randomElement(['BSCS', 'BSIT', 'BSN', 'BSBA']),
            'year_level' => fake()->randomElement(['YR_1', 'YR_2', 'YR_3', 'YR_4']),
            'civil_status' => fake()->randomElement(['Single', 'Married']),
            'age' => fake()->numberBetween(18, 25),
            'sex' => fake()->randomElement(['Male', 'Female']),
            'birthday' => fake()->dateTimeBetween('-25 years', '-18 years')->format('Y-m-d'),
            'present_address' => fake()->address(),
            'tel_number' => fake()->phoneNumber(),
            'emergency_contact_name' => fake()->randomElement(['Ricardo', 'Elena', 'Roberto', 'Carmen', 'Felipe', 'Rosita']) . ' ' . fake()->randomElement(['Dela Cruz', 'Garcia', 'Reyes', 'Santos', 'Bautista']),
            'emergency_relationship' => fake()->randomElement(['Parent', 'Sibling', 'Guardian']),
            'emergency_contact_address' => fake()->address(),
            'emergency_contact_tel_number' => fake()->phoneNumber(),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
