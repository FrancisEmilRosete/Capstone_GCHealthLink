<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PhysicalExamination extends Model
{
    use HasFactory;

    use HasUlids;

    protected $fillable = [
        'student_profile_id', 'year_level', 'exam_date',
        'bp', 'cr', 'rr', 'temp', 'weight', 'height', 'bmi',
        'visual_acuity', 'skin', 'heent', 'chest_lungs', 'heart',
        'abdomen', 'extremities', 'others', 'examined_by',
    ];

    protected function casts(): array
    {
        return ['exam_date' => 'date'];
    }

    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(StudentProfile::class);
    }
}
