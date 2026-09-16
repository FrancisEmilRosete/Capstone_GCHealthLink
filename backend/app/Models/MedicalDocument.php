<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicalDocument extends Model
{
    use HasFactory;

    use HasUlids;

    public $timestamps  = false;
    const CREATED_AT    = 'uploaded_at';
    const UPDATED_AT    = null;

    protected $fillable = [
        'student_profile_id', 'file_name', 'file_url', 'document_type',
    ];

    protected function casts(): array
    {
        return ['uploaded_at' => 'datetime'];
    }

    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(StudentProfile::class);
    }
}
