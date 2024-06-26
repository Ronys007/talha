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
        Schema::create('order_a_s', function (Blueprint $table) {
            $table->id();
            $table->string('custname');
            $table->string('item');
            $table->integer('hsn');
            $table->integer('qty');
            $table->float('price');
            $table->float('totalprice');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_a_s');
    }
};
