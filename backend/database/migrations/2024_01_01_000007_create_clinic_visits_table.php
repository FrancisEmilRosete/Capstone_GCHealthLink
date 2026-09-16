<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Migration: Create clinic_visits & visit_medicines tables — Prisma: ClinicVisit, VisitMedicine */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clinic_visits', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->ulid('student_profile_id');
            $table->ulid('handled_by_id');

            $table->date('visit_date');
            $table->string('visit_time', 20)->nullable();
            $table->text('chief_complaint_enc')->nullable();   // encrypted at model layer
            $table->string('concern_tag')->default('General Consultation');

            $table->timestamps();

            $table->foreign('student_profile_id')
                  ->references('id')->on('student_profiles')->cascadeOnDelete();

            $table->foreign('handled_by_id')
                  ->references('id')->on('users')->restrictOnDelete();

            $table->index(['student_profile_id', 'visit_date']);
            $table->index(['handled_by_id', 'visit_date']);
            $table->index(['concern_tag', 'visit_date']);
        });

        Schema::create('visit_medicines', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->ulid('visit_id');
            $table->ulid('inventory_id');
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->string('status', 20)->default('PRESCRIBED'); // PRESCRIBED|DISPENSED|CANCELLED
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('visit_id')
                  ->references('id')->on('clinic_visits')->cascadeOnDelete();

            $table->foreign('inventory_id')
                  ->references('id')->on('inventories')->restrictOnDelete();

            $table->index('visit_id');
            $table->index('inventory_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visit_medicines');
        Schema::dropIfExists('clinic_visits');
    }
};
