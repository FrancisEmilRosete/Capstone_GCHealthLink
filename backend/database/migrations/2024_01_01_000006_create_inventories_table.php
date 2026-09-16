<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Migration: Create inventory & inventory_batches tables — Prisma: Inventory, InventoryBatch */
return new class extends Migration
{
    public function up(): void
    {
        // inventory must exist before clinic_visits references it via visit_medicines
        Schema::create('inventories', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->string('item_name')->unique();
            $table->unsignedSmallInteger('reorder_threshold');
            $table->string('dosage_value', 50)->nullable();
            $table->string('form_dosage', 100)->nullable();
            $table->string('unit', 50);
            $table->enum('category', ['MEDICINE', 'DENTAL'])->default('MEDICINE');
            $table->timestamps();

            $table->index('item_name');
            $table->index('category');
        });

        Schema::create('inventory_batches', function (Blueprint $table): void {
            $table->ulid('id')->primary();
            $table->ulid('inventory_id');
            $table->string('batch_number', 100);
            $table->unsignedInteger('current_stock');
            $table->date('expiration_date')->nullable();
            $table->timestamps();

            $table->foreign('inventory_id')
                  ->references('id')->on('inventories')->cascadeOnDelete();

            $table->index('inventory_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_batches');
        Schema::dropIfExists('inventories');
    }
};
