<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * InventoryResource
 *
 * Transforms an Inventory model + its InventoryBatch collection into a
 * consistent API response, including the computed total_stock aggregate.
 *
 * @mixin \App\Models\Inventory
 */
class InventoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            'itemName'         => $this->item_name,
            'category'         => $this->category,
            'unit'             => $this->unit,
            'dosageValue'      => $this->dosage_value,
            'formDosage'       => $this->form_dosage,
            'reorderThreshold' => $this->reorder_threshold,

            // Aggregated total stock across all batches
            // Populated via ->withSum('batches', 'current_stock') in the controller
            'currentStock'     => (int) ($this->batches_sum_current_stock ?? 0),
            'totalStock'       => (int) ($this->batches_sum_current_stock ?? 0),

            // True when totalStock <= reorderThreshold
            'isLowStock'       => (int) ($this->batches_sum_current_stock ?? 0)
                <= (int) $this->reorder_threshold,

            'createdAt'        => $this->created_at?->toISOString(),
            'updatedAt'        => $this->updated_at?->toISOString(),

            // Batch details — loaded when available
            'batches' => $this->whenLoaded('batches', fn () =>
                $this->batches->map(fn ($batch) => [
                    'id'             => $batch->id,
                    'batchNumber'    => $batch->batch_number,
                    'currentStock'   => $batch->current_stock,
                    'expirationDate' => $batch->expiration_date?->toDateString(),
                    'isExpired'      => $batch->expiration_date?->isPast() ?? false,
                ])
            ),
        ];
    }
}
