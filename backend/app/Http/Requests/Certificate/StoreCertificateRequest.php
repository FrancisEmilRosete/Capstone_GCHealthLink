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

    protected function prepareForValidation(): void
    {
        $data = [];
        
        if ($this->has('studentIdentifier')) {
            $student = \App\Models\StudentProfile::where('student_number', $this->input('studentIdentifier'))->first();
            if ($student) {
                $data['student_profile_id'] = $student->id;
            }
        }
        
        if ($this->has('certificateType')) {
            $type = $this->input('certificateType');
            if ($type === 'CONSULTATION') {
                $data['certificate_type'] = \App\Models\MedicalCertificate::TYPE_CONSULTATION;
            } elseif ($type === 'PHYSICAL_EXAM') {
                $data['certificate_type'] = \App\Models\MedicalCertificate::TYPE_PHYSICAL_EXAMINATION;
            } else {
                $data['certificate_type'] = strtolower($type);
            }
        } elseif ($this->has('certificate_type')) {
            $type = $this->input('certificate_type');
            if ($type === 'CONSULTATION') {
                $data['certificate_type'] = \App\Models\MedicalCertificate::TYPE_CONSULTATION;
            } elseif ($type === 'PHYSICAL_EXAM') {
                $data['certificate_type'] = \App\Models\MedicalCertificate::TYPE_PHYSICAL_EXAMINATION;
            }
        }
        
        if ($this->has('diagnosisFindings')) {
            $data['diagnosis_findings'] = $this->input('diagnosisFindings');
        }
        
        if ($this->has('recommendationsRemarks')) {
            $data['recommendations_remarks'] = $this->input('recommendationsRemarks');
        }

        if (!empty($data)) {
            $this->merge($data);
        }
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
