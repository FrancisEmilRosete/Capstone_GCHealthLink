<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * HealthAdvisoryResource
 *
 * Transforms a HealthAdvisory model into a consistent API response.
 * Includes a severity_level helper for frontend badge rendering.
 *
 * @mixin \App\Models\HealthAdvisory
 */
class HealthAdvisoryResource extends JsonResource
{
    /**
     * Maps DB severity strings to numeric priority levels for the frontend
     * (1 = lowest/INFO, 3 = highest/CRITICAL).
     */
    private const SEVERITY_LEVELS = [
        'INFO'     => 1,
        'WARNING'  => 2,
        'CRITICAL' => 3,
    ];

    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'title'           => $this->title,
            'message'         => $this->message,
            'target_dept'     => $this->target_dept ?? 'ALL',
            'severity'        => $this->severity,
            'severity_level'  => self::SEVERITY_LEVELS[$this->severity] ?? 1,
            'created_at'      => $this->created_at?->toISOString(),
            'updated_at'      => $this->updated_at?->toISOString(),

            // Conditionally-loaded creator relation
            'created_by' => $this->whenLoaded('creator', fn () =>
                new UserResource($this->creator)
            ),
        ];
    }
}
