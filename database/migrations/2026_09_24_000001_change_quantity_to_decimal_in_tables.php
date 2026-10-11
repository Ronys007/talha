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
        if (Schema::hasTable('order_items_b_s')) {
            Schema::table('order_items_b_s', function (Blueprint $table) {
                $table->decimal('quantity', 10, 2)->default(1)->change();
                $table->decimal('selling_price', 10, 2)->change();
            });
        }

        if (Schema::hasTable('inventory_b_s')) {
            Schema::table('inventory_b_s', function (Blueprint $table) {
                $table->decimal('qty', 10, 2)->default(0)->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('order_items_b_s')) {
            Schema::table('order_items_b_s', function (Blueprint $table) {
                $table->integer('quantity')->change();
            });
        }

        if (Schema::hasTable('inventory_b_s')) {
            Schema::table('inventory_b_s', function (Blueprint $table) {
                $table->integer('qty')->change();
            });
        }
    }
};
