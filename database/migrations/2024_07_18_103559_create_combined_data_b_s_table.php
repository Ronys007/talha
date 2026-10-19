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
        Schema::create('combined_data_b_s', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_b_s_id')->constrained('order_b_s')->onDelete('cascade');
            $table->string('type');
            $table->integer('amount');
            $table->string('text')->nullable();;
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('combined_data_b_s');
    }
};
