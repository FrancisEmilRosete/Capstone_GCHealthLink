<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ClinicStaffSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $staffMembers = [
            ['name' => 'Dr. Smith', 'position' => 'Physician'],
            ['name' => 'Dr. Jones', 'position' => 'Dentist'],
            ['name' => 'Nurse Joy', 'position' => 'Nurse'],
        ];
        
        foreach ($staffMembers as $staff) {
            \App\Models\ClinicStaff::firstOrCreate(['name' => $staff['name']], $staff);
        }
    }
}
