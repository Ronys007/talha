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
        Schema::create('credit_b_s', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_b_s_id')->constrained('order_b_s')->onDelete('cascade');
            $table->integer('credit');
            $table->string('text')->nullable();;
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('credit_b_s');
    }
};
