<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * MedicalCertificateResource
 *
 * Transforms a MedicalCertificate model into a consistent API response.
 * Note: MedicalCertificate uses issued_at instead of created_at/updated_at.
 *
 * @mixin \App\Models\MedicalCertificate
 */
class MedicalCertificateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                     => $this->id,
            'studentProfileId'       => $this->student_profile_id,
            'issuedById'             => $this->issued_by_id,
            'issuedByRole'           => $this->issued_by_role,
            'certificateType'        => $this->certificate_type,
            'diagnosisFindings'      => $this->diagnosis_findings,
            'recommendationsRemarks' => $this->recommendations_remarks,
            'remarks'                => $this->remarks,
            'issuedAt'               => $this->issued_at?->toISOString(),

            // Conditionally-loaded relations
            'studentProfile' => $this->whenLoaded('studentProfile', fn () =>
                new StudentProfileResource($this->studentProfile)
            ),
            'issuedBy' => $this->whenLoaded('issuedBy', fn () =>
                new UserResource($this->issuedBy)
            ),
        ];
    }
}
