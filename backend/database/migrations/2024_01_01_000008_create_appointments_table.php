<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Migration: Create appointments table — Prisma: Appointment */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->ulid('student_profile_id');
            $table->date('preferred_date');
            $table->string('preferred_time', 20);
            $table->string('service_type')->default('Medical Consultation');
            $table->text('symptoms');
            // Statuses: WAITING | IN_PROGRESS | COMPLETED | CANCELLED
            $table->string('status', 20)->default('WAITING');
            $table->timestamps();

            $table->foreign('student_profile_id')
                  ->references('id')->on('student_profiles');

            $table->index(['student_profile_id', 'preferred_date']);
            $table->index(['status', 'preferred_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
