<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Migration: Create lab_results table — Prisma: LabResult */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lab_results', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->ulid('student_profile_id');
            $table->date('date');
            $table->date('date_received')->nullable();

            // CBC
            $table->string('hgb', 30)->nullable();
            $table->string('hct', 30)->nullable();
            $table->string('wbc', 30)->nullable();
            $table->string('plt_ct', 30)->nullable();
            $table->string('blood_type', 10)->nullable();

            // Urinalysis
            $table->string('glucose_sugar', 30)->nullable();
            $table->string('protein', 30)->nullable();

            // Chest X-ray
            $table->enum('xray_result', ['NORMAL', 'ABNORMAL'])->nullable();
            $table->text('xray_findings_enc')->nullable();    // encrypted at model layer

            $table->text('others_enc')->nullable();           // encrypted at model layer

            $table->timestamps();

            $table->foreign('student_profile_id')
                  ->references('id')->on('student_profiles')->cascadeOnDelete();

            $table->index(['student_profile_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lab_results');
    }
};
