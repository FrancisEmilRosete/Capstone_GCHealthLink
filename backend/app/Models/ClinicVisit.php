<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * ClinicVisit Eloquent Model
 *
 * @property string      $id
 * @property string      $student_profile_id
 * @property string      $handled_by_id
 * @property \Carbon\Carbon $visit_date
 * @property string|null $visit_time
 * @property string|null $chief_complaint_enc   (auto-decrypted by Eloquent cast)
 * @property string      $concern_tag
 */
class ClinicVisit extends Model
{
    use HasFactory;

    use HasUlids;

    protected $fillable = [
        'student_profile_id',
        'handled_by_id',
        'visit_date',
        'visit_time',
        'chief_complaint_enc',
        'concern_tag',
    ];

    protected function casts(): array
    {
        return [
            'visit_date'         => 'date',
            'chief_complaint_enc' => 'encrypted',  // at-rest field-level encryption
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(StudentProfile::class);
    }

    public function handledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by_id');
    }

    public function dispensedMedicines(): HasMany
    {
        return $this->hasMany(VisitMedicine::class, 'visit_id');
    }
}
