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
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->decimal('subtotal', 12, 2)->default(0)->after('tax_rate');
            $table->decimal('gross_discount', 12, 2)->default(0)->after('subtotal');
            $table->decimal('round_off', 8, 2)->default(0)->after('total_gst');
        });

        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->decimal('discount_amount', 12, 2)->nullable()->after('discount_percent');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table) {
            $table->dropColumn('discount_amount');
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropColumn(['subtotal', 'gross_discount', 'round_off']);
        });
    }
};
