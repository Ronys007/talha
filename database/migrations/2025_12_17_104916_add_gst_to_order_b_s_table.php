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
        Schema::table('order_b_s', function (Blueprint $table) {
            $table->string('gst')->nullable()->after('customer');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_b_s', function (Blueprint $table) {
            $table->dropColumn('gst');
        });
    }
};
