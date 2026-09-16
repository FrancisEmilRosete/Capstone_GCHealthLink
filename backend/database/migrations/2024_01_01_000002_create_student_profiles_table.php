<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Create student_profiles table
 * Prisma source: model StudentProfile
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_profiles', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->ulid('user_id')->unique();

            // Demographics
            $table->string('student_number')->unique();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('mi', 10)->nullable();
            $table->string('course_dept');          // e.g. CAHS, CBA, CCS …
            $table->string('course')->nullable();    // e.g. BSCS, BSN …
            $table->enum('year_level', ['YR_1', 'YR_2', 'YR_3', 'YR_4'])->nullable();
            $table->string('civil_status')->nullable();
            $table->unsignedSmallInteger('age')->nullable();
            $table->string('sex', 20)->nullable();
            $table->date('birthday')->nullable();
            $table->string('present_address')->nullable();
            $table->string('tel_number', 50)->nullable();

            // Emergency contact
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_relationship')->nullable();
            $table->string('emergency_contact_address')->nullable();
            $table->string('emergency_contact_tel_number', 50)->nullable();

            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['last_name', 'first_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_profiles');
    }
};
