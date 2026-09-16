<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * UserResource — serialises the authenticated user.
 * Sensitive fields (password, qr_token) are intentionally excluded.
 */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'email'           => $this->email,
            'role'            => $this->role,
            'clinicStaffType' => $this->clinic_staff_type,
            'createdAt'       => $this->created_at?->toISOString(),
            'studentProfile'  => $this->whenLoaded('studentProfile', fn () =>
                new StudentProfileResource($this->studentProfile)
            ),
        ];
    }
}
