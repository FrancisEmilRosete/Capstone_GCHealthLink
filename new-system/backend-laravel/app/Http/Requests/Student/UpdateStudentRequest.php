<?php

declare(strict_types=1);

namespace App\Http\Requests\Student;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isClinicStaff() || $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        $profileId = $this->route('student'); // ULID from route model binding

        return [
            'first_name'     => ['sometimes', 'string', 'max:100'],
            'last_name'      => ['sometimes', 'string', 'max:100'],
            'mi'             => ['nullable', 'string', 'max:5'],
            'course_dept'    => ['sometimes', 'string', 'in:CAHS,CBA,CCS,CEAS,CHTM'],
            'course'         => ['nullable', 'string', 'max:50'],
            'year_level'     => ['nullable', 'string', 'in:YR_1,YR_2,YR_3,YR_4'],
            'civil_status'   => ['nullable', 'string', 'max:30'],
            'age'            => ['nullable', 'integer', 'min:15', 'max:99'],
            'sex'            => ['nullable', 'string', 'in:Male,Female,Prefer not to say'],
            'birthday'       => ['nullable', 'date'],
            'present_address'=> ['nullable', 'string', 'max:255'],
            'tel_number'     => ['nullable', 'string', 'max:20'],

            'emergency_contact_name'       => ['nullable', 'string', 'max:150'],
            'emergency_relationship'       => ['nullable', 'string', 'max:50'],
            'emergency_contact_address'    => ['nullable', 'string', 'max:255'],
            'emergency_contact_tel_number' => ['nullable', 'string', 'max:20'],

            // student_number must remain unique, ignoring the current record
            'student_number' => [
                'sometimes',
                'string',
                'max:50',
                Rule::unique('student_profiles', 'student_number')->ignore($profileId),
            ],
        ];
    }
}
