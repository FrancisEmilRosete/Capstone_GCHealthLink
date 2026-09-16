<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LabResult extends Model
{
    use HasFactory;

    use HasUlids;

    protected $fillable = [
        'student_profile_id', 'date', 'date_received',
        'hgb', 'hct', 'wbc', 'plt_ct', 'blood_type',
        'glucose_sugar', 'protein',
        'xray_result', 'xray_findings_enc', 'others_enc',
    ];

    protected function casts(): array
    {
        return [
            'date'              => 'date',
            'date_received'     => 'date',
            'xray_findings_enc' => 'encrypted',
            'others_enc'        => 'encrypted',
        ];
    }

    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(StudentProfile::class);
    }
}
