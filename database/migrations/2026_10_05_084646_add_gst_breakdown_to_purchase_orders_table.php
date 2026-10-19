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
            $afterCol = Schema::hasColumn('purchase_orders', 'gst_number') ? 'gst_number' : 'total_amount';
            $table->decimal('cgst', 10, 2)->default(0)->nullable()->after($afterCol);
            $table->decimal('sgst', 10, 2)->default(0)->nullable()->after('cgst');
            $table->decimal('igst', 10, 2)->default(0)->nullable()->after('sgst');
            $table->decimal('total_gst', 10, 2)->default(0)->nullable()->after('igst');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropColumn(['cgst', 'sgst', 'igst', 'total_gst']);
        });
    }
};
