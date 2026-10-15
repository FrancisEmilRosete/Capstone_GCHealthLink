<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\SafeEncrypted;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * MedicalHistory Eloquent Model
 *
 * The `encrypted` cast uses Laravel's built-in AES-256-CBC encryption
 * (powered by APP_KEY) for at-rest field-level encryption.
 *
 * NOTE: This is SEPARATE from the AES-256-GCM transport encryption.
 * The flow is: GCM (transport) → Controller → cast:encrypted (storage).
 * Data is decrypted when read from the DB and re-encrypted before storage.
 */
class MedicalHistory extends Model
{
    use HasFactory;

    use HasUlids;

    protected $fillable = [
        'student_profile_id',
        'allergy_enc', 'asthma_enc', 'chicken_pox_enc',
        'diabetes_enc', 'dysmenorrhea_enc', 'epilepsy_seizure_enc',
        'heart_disorder_enc', 'hepatitis_enc', 'hypertension_enc',
        'measles_enc', 'mumps_enc', 'anxiety_disorder_enc',
        'panic_attack_hyperventilation_enc', 'pneumonia_enc',
        'ptb_primary_complex_enc', 'typhoid_fever_enc', 'covid19_enc',
        'urinary_tract_infection_enc', 'has_past_operation_enc',
        'operation_nature_and_date_enc',
    ];

    /**
     * The `encrypted` cast tells Eloquent to:
     *  - Encrypt the value with APP_KEY before writing to the database
     *  - Decrypt the value with APP_KEY after reading from the database
     *
     * The *_enc column names are preserved for clarity (they signal
     * that the DB column holds ciphertext, not plaintext).
     */
    protected function casts(): array
    {
        return [
            'allergy_enc'                       => SafeEncrypted::class,
            'asthma_enc'                        => SafeEncrypted::class,
            'chicken_pox_enc'                   => SafeEncrypted::class,
            'diabetes_enc'                      => SafeEncrypted::class,
            'dysmenorrhea_enc'                  => SafeEncrypted::class,
            'epilepsy_seizure_enc'              => SafeEncrypted::class,
            'heart_disorder_enc'                => SafeEncrypted::class,
            'hepatitis_enc'                     => SafeEncrypted::class,
            'hypertension_enc'                  => SafeEncrypted::class,
            'measles_enc'                       => SafeEncrypted::class,
            'mumps_enc'                         => SafeEncrypted::class,
            'anxiety_disorder_enc'              => SafeEncrypted::class,
            'panic_attack_hyperventilation_enc' => SafeEncrypted::class,
            'pneumonia_enc'                     => SafeEncrypted::class,
            'ptb_primary_complex_enc'           => SafeEncrypted::class,
            'typhoid_fever_enc'                 => SafeEncrypted::class,
            'covid19_enc'                       => SafeEncrypted::class,
            'urinary_tract_infection_enc'       => SafeEncrypted::class,
            'has_past_operation_enc'            => SafeEncrypted::class,
            'operation_nature_and_date_enc'     => SafeEncrypted::class,
        ];
    }

    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(StudentProfile::class);
    }
}
