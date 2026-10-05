<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CourseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $courses = [
            ['code' => 'BSCS', 'name' => 'Bachelor of Science in Computer Science'],
            ['code' => 'BSIT', 'name' => 'Bachelor of Science in Information Technology'],
            ['code' => 'BSN', 'name' => 'Bachelor of Science in Nursing'],
            ['code' => 'BSBA', 'name' => 'Bachelor of Science in Business Administration'],
        ];
        
        foreach ($courses as $course) {
            \App\Models\Course::firstOrCreate(['code' => $course['code']], $course);
        }
    }
}
