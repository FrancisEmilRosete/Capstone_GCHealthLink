<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Migration: Create health_advisories, medical_documents, medical_certificates */
return new class extends Migration
{
    public function up(): void
    {
        // HealthAdvisory
        Schema::create('health_advisories', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->string('title');
            $table->text('message');
            $table->string('target_dept')->default('ALL')->nullable(); // e.g. BSCS | ALL
            $table->string('severity', 20)->default('INFO'); // INFO | WARNING | CRITICAL
            $table->ulid('created_by');                // FK to users.id
            $table->timestamps();

            $table->foreign('created_by')
                  ->references('id')->on('users')->restrictOnDelete();
        });

        // MedicalDocument (digital records upload)
        Schema::create('medical_documents', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->ulid('student_profile_id');
            $table->string('file_name');
            $table->string('file_url');
            $table->string('document_type', 50)->default('PHYSICAL_EXAM');
            $table->timestamp('uploaded_at')->useCurrent();

            $table->foreign('student_profile_id')
                  ->references('id')->on('student_profiles');
        });

        // MedicalCertificate
        Schema::create('medical_certificates', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->ulid('student_profile_id');
            $table->ulid('issued_by_id');
            $table->string('issued_by_role', 20)->default('DOCTOR');

            // Maps Prisma MedicalCertificateType enum
            $table->enum('certificate_type', ['consultation', 'physical_examination'])
                  ->default('consultation');

            $table->text('diagnosis_findings')->nullable();
            $table->text('recommendations_remarks')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamp('issued_at')->useCurrent();

            $table->foreign('student_profile_id')
                  ->references('id')->on('student_profiles');

            $table->foreign('issued_by_id')
                  ->references('id')->on('users');

            $table->index(['student_profile_id', 'issued_at']);
            $table->index(['issued_by_id', 'issued_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_certificates');
        Schema::dropIfExists('medical_documents');
        Schema::dropIfExists('health_advisories');
    }
};
