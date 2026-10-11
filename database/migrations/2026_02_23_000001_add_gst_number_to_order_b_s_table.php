<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_b_s', function (Blueprint $table) {
            $table->string('gst_number')->nullable()->after('gst');
        });
    }

    public function down(): void
    {
        Schema::table('order_b_s', function (Blueprint $table) {
            $table->dropColumn('gst_number');
        });
    }
};
