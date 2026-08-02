<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\MedicalHistory;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class StudentRegistrationController extends Controller
{
    /**
     * POST /api/students/registration/public
     * Unauthenticated public registration. Creates User + Profile + MedicalHistory
     */
    public function publicRegistration(Request $request): JsonResponse
    {
        return $this->handleRegistration($request, true);
    }

    /**
     * POST /api/students/registration
     * Authenticated registration (User exists, completing profile)
     */
    public function authenticatedRegistration(Request $request): JsonResponse
    {
        return $this->handleRegistration($request, false);
    }

    private function handleRegistration(Request $request, bool $isPublic): JsonResponse
    {
        $payload = $request->all();

        $personal = $payload['personal'] ?? [];
        $emergency = $payload['emergency'] ?? [];
        $medical = $payload['medical'] ?? [];
        $surgical = $payload['surgical'] ?? [];

        // Validate basic required fields
        if (empty($personal['studentId']) || empty($personal['firstName']) || empty($personal['lastName'])) {
            throw ValidationException::withMessages(['personal' => 'Missing required personal information']);
        }

        DB::beginTransaction();
        try {
            if ($isPublic) {
                if (empty($personal['email']) || empty($personal['password'])) {
                    throw ValidationException::withMessages(['auth' => 'Email and password are required for public registration']);
                }

                if (User::where('email', $personal['email'])->exists()) {
                    throw ValidationException::withMessages(['email' => 'Email is already registered']);
                }

                $user = User::create([
                    'email' => $personal['email'],
                    'password' => Hash::make($personal['password']),
                    'role' => 'STUDENT',
                ]);
            } else {
                $user = $request->user();
                if (!$user) {
                    throw ValidationException::withMessages(['auth' => 'User not authenticated']);
                }
            }

            if (StudentProfile::where('student_number', $personal['studentId'])->where('user_id', '!=', $user->id)->exists()) {
                throw ValidationException::withMessages(['studentId' => 'Student ID is already registered to another user']);
            }

            // Map year level from Yr. X to YR_X
            $yearLevel = $personal['yearLevel'] ?? null;
            if ($yearLevel === 'Yr. 1' || $yearLevel === '1') $yearLevel = 'YR_1';
            elseif ($yearLevel === 'Yr. 2' || $yearLevel === '2') $yearLevel = 'YR_2';
            elseif ($yearLevel === 'Yr. 3' || $yearLevel === '3') $yearLevel = 'YR_3';
            elseif ($yearLevel === 'Yr. 4' || $yearLevel === '4') $yearLevel = 'YR_4';

            // Create or Update Profile
            $profile = StudentProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'student_number' => $personal['studentId'],
                    'first_name' => $personal['firstName'],
                    'last_name' => $personal['lastName'],
                    'mi' => $personal['middleInitial'] ?? null,
                    'course_dept' => $personal['department'] ?? 'CCS',
                    'course' => $personal['course'] ?? null,
                    'year_level' => $yearLevel,
                    'civil_status' => $personal['civilStatus'] ?? null,
                    'age' => $personal['age'] ?? null,
                    'sex' => $personal['sex'] ?? null,
                    'birthday' => $personal['birthday'] ?? null,
                    'present_address' => $personal['address'] ?? null,
                    'tel_number' => $personal['contact'] ?? null,
                    
                    'emergency_contact_name' => $emergency['name'] ?? null,
                    'emergency_relationship' => $emergency['relationship'] ?? null,
                    'emergency_contact_address' => $emergency['address'] ?? null,
                    'emergency_contact_tel_number' => $emergency['contact'] ?? null,
                ]
            );

            // Create or Update Medical History
            $conditions = $medical['conditions'] ?? [];
            
            MedicalHistory::updateOrCreate(
                ['student_profile_id' => $profile->id],
                [
                    'allergy_enc' => $medical['allergies'] ?? (in_array('Allergy', $conditions) ? 'Yes' : 'No'),
                    'asthma_enc' => in_array('Asthma', $conditions) ? 'Yes' : 'No',
                    'chicken_pox_enc' => in_array('Chicken Pox', $conditions) ? 'Yes' : 'No',
                    'diabetes_enc' => in_array('Diabetes', $conditions) ? 'Yes' : 'No',
                    'dysmenorrhea_enc' => in_array('Dysmenorrhea', $conditions) ? 'Yes' : 'No',
                    'epilepsy_seizure_enc' => in_array('Epilepsy/Seizure', $conditions) ? 'Yes' : 'No',
                    'heart_disorder_enc' => in_array('Heart Disorder', $conditions) ? 'Yes' : 'No',
                    'hepatitis_enc' => in_array('Hepatitis', $conditions) ? 'Yes' : 'No',
                    'hypertension_enc' => in_array('Hypertension', $conditions) ? 'Yes' : 'No',
                    'measles_enc' => in_array('Measles', $conditions) ? 'Yes' : 'No',
                    'mumps_enc' => in_array('Mumps', $conditions) ? 'Yes' : 'No',
                    'anxiety_disorder_enc' => in_array('Anxiety Disorder', $conditions) ? 'Yes' : 'No',
                    'panic_attack_hyperventilation_enc' => in_array('Panic Attack/Hyperventilation', $conditions) ? 'Yes' : 'No',
                    'pneumonia_enc' => in_array('Pneumonia', $conditions) ? 'Yes' : 'No',
                    'ptb_primary_complex_enc' => in_array('PTB/Primary Complex', $conditions) ? 'Yes' : 'No',
                    'typhoid_fever_enc' => in_array('Typhoid Fever', $conditions) ? 'Yes' : 'No',
                    'covid19_enc' => in_array('COVID-19', $conditions) ? 'Yes' : 'No',
                    'urinary_tract_infection_enc' => in_array('Urinary Tract Infection', $conditions) ? 'Yes' : 'No',
                    
                    'has_past_operation_enc' => ($surgical['hasSurgery'] ?? false) ? 'Yes' : 'No',
                    'operation_nature_and_date_enc' => json_encode($surgical['entries'] ?? []),
                ]
            );

            AuditLog::record(
                'STUDENT_CREATE',
                "Student self-registration: {$profile->first_name} {$profile->last_name}",
                $profile->id
            );

            DB::commit();

            return response()->json(['message' => 'Registration successful', 'user_id' => $user->id], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}
