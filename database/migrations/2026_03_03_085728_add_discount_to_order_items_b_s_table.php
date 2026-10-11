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
        Schema::table('order_items_b_s', function (Blueprint $table) {
            $table->string('item_name')->nullable()->after('code');
            $table->decimal('discount_percent', 5, 2)->default(0)->after('selling_price');
            $table->string('code')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_items_b_s', function (Blueprint $table) {
            $table->dropColumn(['item_name', 'discount_percent']);
            // Reverting `code` change requires knowing its original state or doctrine/dbal depending on Laravel version, skipping reverse for simplicity.
        });
    }
};
