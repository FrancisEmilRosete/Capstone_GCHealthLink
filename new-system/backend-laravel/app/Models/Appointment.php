<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Appointment extends Model
{
    use HasFactory;

    use HasUlids;

    // Valid appointment statuses
    const STATUS_WAITING        = 'WAITING';
    const STATUS_PENDING        = 'PENDING';
    const STATUS_IN_PROGRESS    = 'IN_PROGRESS';
    const STATUS_FOR_DISPENSING = 'FOR_DISPENSING';
    const STATUS_COMPLETED      = 'COMPLETED';
    const STATUS_CANCELLED      = 'CANCELLED';

    protected $fillable = [
        'student_profile_id',
        'preferred_date',
        'preferred_time',
        'service_type',
        'symptoms',
        'status',
        'cancellation_reason',
    ];

    protected function casts(): array
    {
        return ['preferred_date' => 'date'];
    }

    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(StudentProfile::class);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    public function isActive(): bool
    {
        return in_array($this->status, [
            self::STATUS_WAITING,
            self::STATUS_PENDING,
            self::STATUS_IN_PROGRESS,
            self::STATUS_FOR_DISPENSING,
        ], true);
    }
}
