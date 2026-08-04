<?php

declare(strict_types=1);

namespace App\Http\Requests\Appointment;

use Illuminate\Foundation\Http\FormRequest;

class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Students create their own; staff can create on behalf of a student
        return true;
    }

    protected function prepareForValidation(): void
    {
        $user = $this->user();
        if ($user && $user->isStudent() && $user->studentProfile && !$this->has('student_profile_id')) {
            $this->merge([
                'student_profile_id' => $user->studentProfile->id,
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'student_profile_id' => ['required', 'ulid', 'exists:student_profiles,id'],
            'preferred_date'     => ['required', 'date', 'after_or_equal:today'],
            'preferred_time'     => ['required', 'string', 'max:20'],
            'service_type'       => ['nullable', 'string', 'max:100'],
            'symptoms'           => ['required', 'string', 'max:2000'],
        ];
    }
}
