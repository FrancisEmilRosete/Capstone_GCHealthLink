<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * User Eloquent Model
 *
 * Prisma mapping:
 *   model User → App\Models\User
 *   passwordHash → password  (column renamed to Laravel convention)
 *   clinicStaffType → clinic_staff_type
 *
 * @property string              $id
 * @property string              $role              STUDENT|CLINIC_STAFF|ADMIN
 * @property string|null         $clinic_staff_type NURSE|DOCTOR|DENTIST
 * @property string              $email
 * @property string              $password
 * @property string|null         $qr_token
 * @property \Carbon\Carbon|null $qr_token_issued_at
 * @property \Carbon\Carbon|null $qr_token_expires_at
 * @property \Carbon\Carbon      $created_at
 * @property \Carbon\Carbon      $updated_at
 */
class User extends Authenticatable
{
    use HasApiTokens, HasUlids, Notifiable, HasFactory;

    protected $fillable = [
        'role',
        'clinic_staff_type',
        'email',
        'password',
        'qr_token',
        'qr_token_issued_at',
        'qr_token_expires_at',
    ];

    protected $hidden = [
        'password',
        'qr_token',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'qr_token_issued_at'  => 'datetime',
            'qr_token_expires_at' => 'datetime',
            'password'            => 'hashed',    // auto-hashes on assignment
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function studentProfile(): HasOne
    {
        return $this->hasOne(StudentProfile::class);
    }

    public function handledVisits(): HasMany
    {
        return $this->hasMany(ClinicVisit::class, 'handled_by_id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function issuedCertificates(): HasMany
    {
        return $this->hasMany(MedicalCertificate::class, 'issued_by_id');
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    public function isStudent(): bool
    {
        return $this->role === 'STUDENT';
    }

    public function isClinicStaff(): bool
    {
        return $this->role === 'CLINIC_STAFF';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'ADMIN';
    }

    public function isDoctor(): bool
    {
        return $this->clinic_staff_type === 'DOCTOR';
    }

    public function isNurse(): bool
    {
        return $this->clinic_staff_type === 'NURSE';
    }

    public function isDentist(): bool
    {
        return $this->clinic_staff_type === 'DENTIST';
    }
}
