<?php

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Encrypt sensitive columns at rest.
 *
 * 1. Widens VARCHAR columns to TEXT (Laravel ciphertext is ~200+ chars).
 * 2. Encrypts any existing plaintext values in place so the new
 *    `encrypted` model casts can read them. Idempotent: values that
 *    already decrypt are skipped.
 */
return new class extends Migration
{
    /** @var array<string, string[]> */
    private array $columns = [
        'student_profiles' => [
            'present_address', 'tel_number', 'emergency_contact_name',
            'emergency_relationship', 'emergency_contact_address',
            'emergency_contact_tel_number',
        ],
        'physical_examinations' => [
            'skin', 'heent', 'chest_lungs', 'heart', 'abdomen', 'extremities', 'others',
        ],
        'appointments'         => ['symptoms', 'cancellation_reason'],
        'medical_certificates' => ['diagnosis_findings', 'recommendations_remarks', 'remarks'],
        'messages'             => ['body'],
    ];

    /** Columns that were VARCHAR and must become TEXT. */
    private array $widen = [
        'student_profiles'      => true,
        'physical_examinations' => true,
        'appointments'          => ['cancellation_reason'],
    ];

    public function up(): void
    {
        foreach ($this->widen as $table => $cols) {
            if (!Schema::hasTable($table)) continue;
            $cols = $cols === true ? $this->columns[$table] : $cols;
            Schema::table($table, function (Blueprint $t) use ($cols) {
                foreach ($cols as $c) {
                    $t->text($c)->nullable()->change();
                }
            });
        }

        $this->transform(function (string $value): ?string {
            try {
                Crypt::decryptString($value);
                return null; // already encrypted
            } catch (DecryptException) {
                return Crypt::encryptString($value);
            }
        });
    }

    public function down(): void
    {
        $this->transform(function (string $value): ?string {
            try {
                return Crypt::decryptString($value);
            } catch (DecryptException) {
                return null;
            }
        });
        // Column types are intentionally left as TEXT (lossless).
    }

    private function transform(callable $fn): void
    {
        foreach ($this->columns as $table => $cols) {
            if (!Schema::hasTable($table)) continue;

            DB::table($table)->orderBy('id')->chunkById(200, function ($rows) use ($table, $cols, $fn) {
                foreach ($rows as $row) {
                    $updates = [];
                    foreach ($cols as $c) {
                        $v = $row->{$c} ?? null;
                        if ($v === null || $v === '') continue;
                        $new = $fn((string) $v);
                        if ($new !== null) $updates[$c] = $new;
                    }
                    if ($updates) {
                        DB::table($table)->where('id', $row->id)->update($updates);
                    }
                }
            });
        }
    }
};
