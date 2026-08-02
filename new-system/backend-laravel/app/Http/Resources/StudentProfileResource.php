<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'studentNumber'  => $this->student_number,
            'firstName'      => $this->first_name,
            'lastName'       => $this->last_name,
            'mi'             => $this->mi,
            'fullName'       => $this->full_name,
            'courseDept'     => $this->course_dept,
            'course'         => $this->course,
            'yearLevel'      => $this->year_level,
            'civilStatus'    => $this->civil_status,
            'age'            => $this->age,
            'sex'            => $this->sex,
            'birthday'       => $this->birthday?->toDateString(),
            'presentAddress' => $this->present_address,
            'telNumber'      => $this->tel_number,
            'emergencyContact' => [
                'name'         => $this->emergency_contact_name,
                'relationship' => $this->emergency_relationship,
                'address'      => $this->emergency_contact_address,
                'telNumber'    => $this->emergency_contact_tel_number,
            ],
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),

            // Conditionally-loaded relations
            'medicalHistory'       => $this->whenLoaded('medicalHistory'),
            'physicalExaminations' => $this->whenLoaded('physicalExaminations'),
            'labResults'           => $this->whenLoaded('labResults'),
            'clinicVisits'         => ClinicVisitResource::collection($this->whenLoaded('clinicVisits')),
            'appointments'         => $this->whenLoaded('appointments'),
            'medicalCertificates'  => $this->whenLoaded('medicalCertificates'),
        ];
    }
}
