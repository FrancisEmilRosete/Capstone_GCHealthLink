<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Create users table
 *
 * Prisma source: model User
 * Changes from Prisma:
 *  - id: cuid() → CHAR(26) ULID (Eloquent HasUlids trait) — ULIDs are
 *    sortable and URL-safe; swap to uuid() if you prefer UUIDs.
 *  - role / clinicStaffType / yearLevel → MySQL ENUM columns
 *  - passwordHash renamed to password (Laravel convention, same data)
 *  - qrToken stored as TEXT, nullable
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table): void {
            $table->ulid('id')->primary();

            $table->enum('role', ['STUDENT', 'CLINIC_STAFF', 'ADMIN'])->default('STUDENT');
            $table->enum('clinic_staff_type', ['NURSE', 'DOCTOR', 'DENTIST'])->nullable();

            $table->string('email')->unique();
            $table->string('password');           // stores the bcrypt/argon2 hash

            $table->text('qr_token')->nullable();
            $table->timestamp('qr_token_issued_at')->nullable();
            $table->timestamp('qr_token_expires_at')->nullable();

            $table->timestamps();                 // created_at, updated_at

            $table->index(['role', 'clinic_staff_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
