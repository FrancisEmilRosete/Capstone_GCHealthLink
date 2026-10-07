<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('availability_overrides', function (Blueprint $table) {
            $table->id();
            $table->string('scope'); // medical or dental
            $table->date('date');
            $table->boolean('is_available')->default(true);
            $table->json('slots')->nullable(); // the array of slots with capacity
            $table->timestamps();

            // Scope and date combination should be unique
            $table->unique(['scope', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('availability_overrides');
    }
};
