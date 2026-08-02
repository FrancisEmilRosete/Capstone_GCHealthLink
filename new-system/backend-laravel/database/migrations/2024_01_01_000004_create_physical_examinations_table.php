<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Migration: Create physical_examinations table — Prisma: PhysicalExamination */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('physical_examinations', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->ulid('student_profile_id');
            $table->enum('year_level', ['YR_1', 'YR_2', 'YR_3', 'YR_4']);
            $table->date('exam_date');

            // Vitals and exam findings
            $table->string('bp', 30)->nullable();
            $table->string('cr', 30)->nullable();
            $table->string('rr', 30)->nullable();
            $table->string('temp', 30)->nullable();
            $table->string('weight', 30)->nullable();
            $table->string('height', 30)->nullable();
            $table->string('bmi', 30)->nullable();
            $table->string('visual_acuity', 50)->nullable();
            $table->string('skin')->nullable();
            $table->string('heent')->nullable();
            $table->string('chest_lungs')->nullable();
            $table->string('heart')->nullable();
            $table->string('abdomen')->nullable();
            $table->string('extremities')->nullable();
            $table->string('others')->nullable();
            $table->string('examined_by')->nullable();

            $table->timestamps();

            $table->foreign('student_profile_id')
                  ->references('id')->on('student_profiles')->cascadeOnDelete();

            $table->index(['student_profile_id', 'year_level', 'exam_date'], 'phys_exam_student_year_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('physical_examinations');
    }
};
