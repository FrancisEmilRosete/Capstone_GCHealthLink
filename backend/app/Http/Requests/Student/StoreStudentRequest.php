<?php

declare(strict_types=1);

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;

class StoreStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Only CLINIC_STAFF and ADMIN can create student profiles
        return $this->user()?->isClinicStaff() || $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            // Account fields
            'email'    => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],

            // Profile fields
            'student_number' => ['required', 'string', 'max:50', 'unique:student_profiles,student_number'],
            'first_name'     => ['required', 'string', 'max:100'],
            'last_name'      => ['required', 'string', 'max:100'],
            'mi'             => ['nullable', 'string', 'max:5'],
            'course_dept'    => ['required', 'string', 'in:CAHS,CBA,CCS,CEAS,CHTM'],
            'course'         => ['nullable', 'string', 'max:50'],
            'year_level'     => ['nullable', 'string', 'in:YR_1,YR_2,YR_3,YR_4'],
            'civil_status'   => ['nullable', 'string', 'max:30'],
            'age'            => ['nullable', 'integer', 'min:15', 'max:99'],
            'sex'            => ['nullable', 'string', 'in:Male,Female,Prefer not to say'],
            'birthday'       => ['nullable', 'date'],
            'present_address'=> ['nullable', 'string', 'max:255'],
            'tel_number'     => ['nullable', 'string', 'max:20'],

            // Emergency contact
            'emergency_contact_name'      => ['nullable', 'string', 'max:150'],
            'emergency_relationship'      => ['nullable', 'string', 'max:50'],
            'emergency_contact_address'   => ['nullable', 'string', 'max:255'],
            'emergency_contact_tel_number'=> ['nullable', 'string', 'max:20'],
        ];
    }
}
