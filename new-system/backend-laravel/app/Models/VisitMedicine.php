<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** VisitMedicine — pivot between ClinicVisit and Inventory */
class VisitMedicine extends Model
{
    use HasFactory;

    use HasUlids;

    public $timestamps = false;  // only has created_at; set manually
    const CREATED_AT = 'created_at';
    const UPDATED_AT = null;

    protected $fillable = [
        'visit_id',
        'inventory_id',
        'quantity',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'quantity'   => 'integer',
            'created_at' => 'datetime',
        ];
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(ClinicVisit::class, 'visit_id');
    }

    public function inventory(): BelongsTo
    {
        return $this->belongsTo(Inventory::class);
    }
}
