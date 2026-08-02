<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: Create messages table
 *
 * Supports role-based messaging between:
 *   - Students → Clinic Staff (Nurse, Doctor, Dentist)
 *   - Clinic Staff → Students (reply only)
 *
 * Students CANNOT message other students (enforced at controller level).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table): void {
            $table->ulid('id')->primary();

            $table->ulid('sender_id');
            $table->ulid('recipient_id');

            $table->text('body');
            $table->boolean('is_read')->default(false);

            $table->timestamps();

            $table->foreign('sender_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            $table->foreign('recipient_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            // Index for fast thread lookups
            $table->index(['sender_id', 'recipient_id']);
            $table->index(['recipient_id', 'is_read']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
