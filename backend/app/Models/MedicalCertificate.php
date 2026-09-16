<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicalCertificate extends Model
{
    use HasFactory;

    use HasUlids;

    public $timestamps  = false;
    const CREATED_AT    = 'issued_at';
    const UPDATED_AT    = null;

    const TYPE_CONSULTATION        = 'consultation';
    const TYPE_PHYSICAL_EXAMINATION = 'physical_examination';

    protected $fillable = [
        'student_profile_id', 'issued_by_id', 'issued_by_role',
        'certificate_type', 'diagnosis_findings',
        'recommendations_remarks', 'remarks',
    ];

    protected function casts(): array
    {
        return ['issued_at' => 'datetime'];
    }

    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(StudentProfile::class);
    }

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by_id');
    }
}
