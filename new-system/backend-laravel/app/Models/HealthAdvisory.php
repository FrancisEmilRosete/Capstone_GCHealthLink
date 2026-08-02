<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HealthAdvisory extends Model
{
    use HasFactory;

    use HasUlids;

    const SEVERITY_INFO     = 'INFO';
    const SEVERITY_WARNING  = 'WARNING';
    const SEVERITY_CRITICAL = 'CRITICAL';

    protected $fillable = [
        'title', 'message', 'target_dept', 'severity', 'created_by',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
