<?php

declare(strict_types=1);

namespace App\Models;

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
            'allergy_enc'                       => 'encrypted',
            'asthma_enc'                        => 'encrypted',
            'chicken_pox_enc'                   => 'encrypted',
            'diabetes_enc'                      => 'encrypted',
            'dysmenorrhea_enc'                  => 'encrypted',
            'epilepsy_seizure_enc'              => 'encrypted',
            'heart_disorder_enc'                => 'encrypted',
            'hepatitis_enc'                     => 'encrypted',
            'hypertension_enc'                  => 'encrypted',
            'measles_enc'                       => 'encrypted',
            'mumps_enc'                         => 'encrypted',
            'anxiety_disorder_enc'              => 'encrypted',
            'panic_attack_hyperventilation_enc' => 'encrypted',
            'pneumonia_enc'                     => 'encrypted',
            'ptb_primary_complex_enc'           => 'encrypted',
            'typhoid_fever_enc'                 => 'encrypted',
            'covid19_enc'                       => 'encrypted',
            'urinary_tract_infection_enc'       => 'encrypted',
            'has_past_operation_enc'            => 'encrypted',
            'operation_nature_and_date_enc'     => 'encrypted',
        ];
    }

    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(StudentProfile::class);
    }
}
