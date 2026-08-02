<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * AppointmentResource
 *
 * Transforms an Appointment model into a consistent, typed API response.
 * Used by AppointmentController for all CRUD responses.
 *
 * @mixin \App\Models\Appointment
 */
class AppointmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'studentProfileId' => $this->student_profile_id,
            'preferredDate'    => $this->preferred_date?->toDateString(),
            'preferredTime'    => $this->preferred_time,
            'serviceType'      => $this->service_type,
            'symptoms'         => $this->symptoms,
            'status'           => $this->status,
            'isActive'         => $this->isActive(),
            'createdAt'        => $this->created_at?->toISOString(),
            'updatedAt'        => $this->updated_at?->toISOString(),

            // Conditionally-loaded relations
            'studentProfile' => $this->whenLoaded('studentProfile', fn () =>
                new StudentProfileResource($this->studentProfile)
            ),
        ];
    }
}
