<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Inventory extends Model
{
    use HasFactory;

    use HasUlids;

    protected $fillable = [
        'item_name', 'reorder_threshold',
        'dosage_value', 'form_dosage', 'unit', 'category',
    ];

    protected function casts(): array
    {
        return ['reorder_threshold' => 'integer'];
    }

    public function batches(): HasMany
    {
        return $this->hasMany(InventoryBatch::class);
    }

    public function dispensedIn(): HasMany
    {
        return $this->hasMany(VisitMedicine::class);
    }

    /**
     * Aggregate total current stock across all batches.
     * Useful for low-stock alerts without a raw DB query each time.
     */
    public function getTotalStockAttribute(): int
    {
        return $this->batches->sum('current_stock');
    }

    public function isBelowReorderThreshold(): bool
    {
        return $this->total_stock <= $this->reorder_threshold;
    }
}
