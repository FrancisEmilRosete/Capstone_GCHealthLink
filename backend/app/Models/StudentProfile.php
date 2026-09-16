<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * StudentProfile Eloquent Model
 *
 * @property string $id
 * @property string $user_id
 * @property string $student_number
 * @property string $first_name
 * @property string $last_name
 * @property string $course_dept
 */
class StudentProfile extends Model
{
    use HasFactory;

    use HasUlids;

    protected $fillable = [
        'user_id', 'student_number', 'first_name', 'last_name', 'mi',
        'course_dept', 'course', 'year_level', 'civil_status', 'age',
        'sex', 'birthday', 'present_address', 'tel_number',
        'emergency_contact_name', 'emergency_relationship',
        'emergency_contact_address', 'emergency_contact_tel_number',
    ];

    protected function casts(): array
    {
        return [
            'birthday'  => 'date',
            'age'       => 'integer',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function medicalHistory(): HasOne
    {
        return $this->hasOne(MedicalHistory::class);
    }

    public function physicalExaminations(): HasMany
    {
        return $this->hasMany(PhysicalExamination::class);
    }

    public function labResults(): HasMany
    {
        return $this->hasMany(LabResult::class);
    }

    public function clinicVisits(): HasMany
    {
        return $this->hasMany(ClinicVisit::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function medicalDocuments(): HasMany
    {
        return $this->hasMany(MedicalDocument::class);
    }

    public function medicalCertificates(): HasMany
    {
        return $this->hasMany(MedicalCertificate::class);
    }

    // -------------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------------

    /** Full name helper: "De La Cruz, Maria A." */
    public function getFullNameAttribute(): string
    {
        $mi = $this->mi ? " {$this->mi}." : '';
        return "{$this->last_name}, {$this->first_name}{$mi}";
    }
}
