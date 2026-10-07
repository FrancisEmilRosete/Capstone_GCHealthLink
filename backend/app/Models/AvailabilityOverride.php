<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AvailabilityOverride extends Model
{
    protected $fillable = [
        'scope',
        'date',
        'is_available',
        'slots',
    ];

    protected $casts = [
        'date' => 'date',
        'is_available' => 'boolean',
        'slots' => 'array',
    ];
}
