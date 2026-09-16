<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Migration: Create audit_logs table — Prisma: AuditLog */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->ulid('user_id')->nullable();

            $table->string('user_role', 30)->nullable();
            $table->string('action_type', 50)->default('OTHER');
            $table->string('description')->default('Legacy Action');

            // Legacy field — retained to avoid data loss during migration
            $table->string('action')->nullable();

            $table->string('target_id', 26)->nullable();  // ULID of the affected record
            $table->ipAddress('ip_address')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('timestamp')->useCurrent();

            $table->foreign('user_id')
                  ->references('id')->on('users')->nullOnDelete();

            $table->index(['user_id', 'timestamp']);
            $table->index(['user_role', 'timestamp']);
            $table->index(['action_type', 'timestamp']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
