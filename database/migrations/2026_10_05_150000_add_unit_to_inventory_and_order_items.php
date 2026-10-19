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
        if (Schema::hasTable('inventory_b_s') && !Schema::hasColumn('inventory_b_s', 'unit')) {
            Schema::table('inventory_b_s', function (Blueprint $table) {
                $table->string('unit', 50)->nullable()->default('PCS')->after('qty');
            });
        }

        if (Schema::hasTable('order_items_b_s') && !Schema::hasColumn('order_items_b_s', 'unit')) {
            Schema::table('order_items_b_s', function (Blueprint $table) {
                $table->string('unit', 50)->nullable()->default('PCS')->after('quantity');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('inventory_b_s') && Schema::hasColumn('inventory_b_s', 'unit')) {
            Schema::table('inventory_b_s', function (Blueprint $table) {
                $table->dropColumn('unit');
            });
        }

        if (Schema::hasTable('order_items_b_s') && Schema::hasColumn('order_items_b_s', 'unit')) {
            Schema::table('order_items_b_s', function (Blueprint $table) {
                $table->dropColumn('unit');
            });
        }
    }
};
