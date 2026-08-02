<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Create medical_histories table
 * Prisma source: model MedicalHistory
 *
 * All *Enc columns store AES-256-GCM ciphertext (application-level encryption).
 * Laravel's built-in Eloquent cast `encrypted` handles this per-column.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_histories', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->ulid('student_profile_id')->unique();

            // Sensitive medical checklist — encrypted at the Eloquent model layer
            $table->text('allergy_enc')->nullable();
            $table->text('asthma_enc')->nullable();
            $table->text('chicken_pox_enc')->nullable();
            $table->text('diabetes_enc')->nullable();
            $table->text('dysmenorrhea_enc')->nullable();
            $table->text('epilepsy_seizure_enc')->nullable();
            $table->text('heart_disorder_enc')->nullable();
            $table->text('hepatitis_enc')->nullable();
            $table->text('hypertension_enc')->nullable();
            $table->text('measles_enc')->nullable();
            $table->text('mumps_enc')->nullable();
            $table->text('anxiety_disorder_enc')->nullable();
            $table->text('panic_attack_hyperventilation_enc')->nullable();
            $table->text('pneumonia_enc')->nullable();
            $table->text('ptb_primary_complex_enc')->nullable();
            $table->text('typhoid_fever_enc')->nullable();
            $table->text('covid19_enc')->nullable();
            $table->text('urinary_tract_infection_enc')->nullable();
            $table->text('has_past_operation_enc')->nullable();
            $table->text('operation_nature_and_date_enc')->nullable();

            $table->timestamps();

            $table->foreign('student_profile_id')
                  ->references('id')->on('student_profiles')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_histories');
    }
};
