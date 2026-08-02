<?php

declare(strict_types=1);

namespace App\Http\Requests\Certificate;

use App\Models\MedicalCertificate;
use Illuminate\Foundation\Http\FormRequest;

class StoreCertificateRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Only doctors, nurses, and dentists can issue certificates
        return $this->user()?->isClinicStaff();
    }

    public function rules(): array
    {
        return [
            'student_profile_id'      => ['required', 'ulid', 'exists:student_profiles,id'],
            'certificate_type'        => [
                'required',
                'string',
                'in:' . implode(',', [
                    MedicalCertificate::TYPE_CONSULTATION,
                    MedicalCertificate::TYPE_PHYSICAL_EXAMINATION,
                ]),
            ],
            'diagnosis_findings'      => ['nullable', 'string', 'max:5000'],
            'recommendations_remarks' => ['nullable', 'string', 'max:5000'],
            'remarks'                 => ['nullable', 'string', 'max:2000'],
        ];
    }
}
