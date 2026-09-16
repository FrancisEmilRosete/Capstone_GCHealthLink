<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClinicVisitResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'studentProfileId'    => $this->student_profile_id,
            'handledById'         => $this->handled_by_id,
            'visitDate'           => $this->visit_date?->toDateString(),
            'visitTime'           => $this->visit_time,
            'chiefComplaintEnc'   => $this->chief_complaint_enc,
            'concernTag'          => $this->concern_tag,
            'createdAt'           => $this->created_at?->toISOString(),

            'studentProfile'      => $this->whenLoaded('studentProfile', fn () =>
                new StudentProfileResource($this->studentProfile)
            ),
            'handledBy'           => $this->whenLoaded('handledBy', fn () =>
                new UserResource($this->handledBy)
            ),
            'dispensedMedicines'  => $this->whenLoaded('dispensedMedicines', fn () => 
                $this->dispensedMedicines->map(fn ($med) => [
                    'id'       => $med->id,
                    'quantity' => $med->quantity,
                    'inventory'=> $med->inventory ? [
                        'id'       => $med->inventory->id,
                        'itemName' => $med->inventory->item_name,
                        'unit'     => $med->inventory->unit,
                    ] : null,
                ])
            ),
        ];
    }
}
