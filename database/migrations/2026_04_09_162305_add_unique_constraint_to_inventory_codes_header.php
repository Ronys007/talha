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
        // Fix known duplicate for Bear cap (79655) before applying constraint
        \Illuminate\Support\Facades\DB::table('inventory_b_s')
            ->where('user_id', 2)
            ->where('item', 'Bear cap (210)')
            ->where('code', '79655')
            ->update(['code' => '79655-B']);

        Schema::table('inventory_b_s', function (Blueprint $table) {
            $table->unique(['user_id', 'code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_b_s', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'code']);
        });
    }
};
