<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\StudentProfile;
use App\Models\MedicalHistory;
use App\Models\PhysicalExamination;
use App\Models\LabResult;
use App\Models\Appointment;
use App\Models\MedicalDocument;
use App\Models\MedicalCertificate;
use App\Models\Inventory;
use App\Models\InventoryBatch;
use App\Models\ClinicVisit;
use App\Models\VisitMedicine;
use App\Models\AuditLog;
use App\Models\HealthAdvisory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 0. Create Specific System Users
        $admin = User::factory()->create([
            'role' => 'ADMIN',
            'email' => 'admin@gordoncollege.edu.ph',
        ]);
        
        $nurse = User::factory()->create([
            'role' => 'CLINIC_STAFF',
            'clinic_staff_type' => 'NURSE',
            'email' => 'nurse@gordoncollege.edu.ph',
        ]);

        $doctor = User::factory()->create([
            'role' => 'CLINIC_STAFF',
            'clinic_staff_type' => 'DOCTOR',
            'email' => 'doctor@gordoncollege.edu.ph',
        ]);

        $dental = User::factory()->create([
            'role' => 'CLINIC_STAFF',
            'clinic_staff_type' => 'DENTIST',
            'email' => 'dental@gordoncollege.edu.ph',
        ]);

        $student = User::factory()->create([
            'role' => 'STUDENT',
            'clinic_staff_type' => null,
            'email' => 'student@gordoncollege.edu.ph',
        ]);

        // 1. Create Staff Users (5 random users)
        $staffUsers = User::factory()->count(5)->create([
            'role' => 'CLINIC_STAFF',
            'clinic_staff_type' => 'NURSE'
        ]);

        // 2. Create Student Users (5 random users)
        $studentUsers = User::factory()->count(5)->create([
            'role' => 'STUDENT',
            'clinic_staff_type' => null
        ]);

        // Include the specific student in the students collection for seeding profiles
        $studentUsers->push($student);
        $staffUsers->push($nurse, $doctor, $dental);

        // 3. Create StudentProfiles (1 per student user)
        $profiles = [];
        foreach ($studentUsers as $user) {
            $profiles[] = StudentProfile::factory()->create([
                'user_id' => $user->id
            ]);
        }

        // 4. Create MedicalHistory, PhysicalExamination, LabResult, Appointment, MedicalDocument
        // exactly 5 per model linked to the student profiles (1 per profile)
        foreach ($profiles as $profile) {
            MedicalHistory::factory()->create([
                'student_profile_id' => $profile->id
            ]);
            
            PhysicalExamination::factory()->create([
                'student_profile_id' => $profile->id
            ]);
            
            LabResult::factory()->create([
                'student_profile_id' => $profile->id
            ]);
            
            Appointment::factory()->create([
                'student_profile_id' => $profile->id
            ]);
            
            MedicalDocument::factory()->create([
                'student_profile_id' => $profile->id
            ]);
            
            MedicalCertificate::factory()->create([
                'student_profile_id' => $profile->id,
                'issued_by_id' => $staffUsers->random()->id
            ]);
        }

        // 5. Create Inventory (Specific common Philippine medicines)
        $medicineData = [
            ['item_name' => 'Paracetamol (Biogesic)', 'category' => 'MEDICINE', 'dosage_value' => '500mg', 'form_dosage' => 'Tablet'],
            ['item_name' => 'Ibuprofen (Advil/Medicol)', 'category' => 'MEDICINE', 'dosage_value' => '200mg', 'form_dosage' => 'Tablet'],
            ['item_name' => 'Mefenamic Acid (Dolfenal)', 'category' => 'MEDICINE', 'dosage_value' => '500mg', 'form_dosage' => 'Tablet'],
            ['item_name' => 'Loperamide (Diatabs)', 'category' => 'MEDICINE', 'dosage_value' => '2mg', 'form_dosage' => 'Capsule'],
            ['item_name' => 'Cetirizine (Alnix)', 'category' => 'MEDICINE', 'dosage_value' => '10mg', 'form_dosage' => 'Tablet'],
            ['item_name' => 'Carbocisteine (Solmux)', 'category' => 'MEDICINE', 'dosage_value' => '500mg', 'form_dosage' => 'Capsule'],
            ['item_name' => 'Aluminum Magnesium Hydroxide (Kremil-S)', 'category' => 'MEDICINE', 'dosage_value' => '178mg', 'form_dosage' => 'Tablet'],
            ['item_name' => 'Dental Syringe', 'category' => 'DENTAL', 'dosage_value' => 'N/A', 'form_dosage' => 'Equipment'],
            ['item_name' => 'Lidocaine', 'category' => 'DENTAL', 'dosage_value' => '2%', 'form_dosage' => 'Carpule'],
            ['item_name' => 'Amoxicillin', 'category' => 'MEDICINE', 'dosage_value' => '500mg', 'form_dosage' => 'Capsule'],
        ];

        $inventories = collect();
        foreach ($medicineData as $med) {
            $inventories->push(Inventory::factory()->create($med));
        }

        // 6. Create InventoryBatches (1 per inventory)
        foreach ($inventories as $inventory) {
            InventoryBatch::factory()->create([
                'inventory_id' => $inventory->id
            ]);
        }

        // 7. Create ClinicVisit (5 visits)
        $visits = [];
        foreach ($profiles as $profile) {
            $visits[] = ClinicVisit::factory()->create([
                'student_profile_id' => $profile->id,
                'handled_by_id' => $staffUsers->random()->id
            ]);
        }

        // 8. Create VisitMedicine (5 dispenses)
        foreach ($visits as $visit) {
            VisitMedicine::factory()->create([
                'visit_id' => $visit->id,
                'inventory_id' => $inventories->random()->id
            ]);
        }

        // 9. Create AuditLogs (5 logs)
        foreach ($staffUsers as $staff) {
            AuditLog::factory()->create([
                'user_id' => $staff->id,
                'user_role' => $staff->role,
                'action_type' => 'LOGIN'
            ]);
        }

        // 10. Create HealthAdvisory (5 advisories)
        foreach ($staffUsers as $staff) {
            HealthAdvisory::factory()->create([
                'created_by' => $staff->id
            ]);
        }
    }
}
