<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryBatch extends Model
{
    use HasFactory;

    use HasUlids;

    protected $fillable = [
        'inventory_id', 'batch_number', 'current_stock', 'expiration_date',
    ];

    protected function casts(): array
    {
        return [
            'current_stock'   => 'integer',
            'expiration_date' => 'date',
        ];
    }

    public function inventory(): BelongsTo
    {
        return $this->belongsTo(Inventory::class);
    }

    public function isExpired(): bool
    {
        return $this->expiration_date !== null && $this->expiration_date->isPast();
    }

    public function isExpiringSoon(int $withinDays = 30): bool
    {
        return $this->expiration_date !== null
            && $this->expiration_date->isFuture()
            && $this->expiration_date->diffInDays(now()) <= $withinDays;
    }
}
