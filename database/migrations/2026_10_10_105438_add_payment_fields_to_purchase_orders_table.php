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
            if (!Schema::hasColumn('purchase_orders', 'due_date')) {
                $table->date('due_date')->nullable()->after('order_date');
            }
            if (!Schema::hasColumn('purchase_orders', 'paid_amount')) {
                $table->decimal('paid_amount', 12, 2)->default(0)->after('total_amount');
            }
            if (!Schema::hasColumn('purchase_orders', 'supplier_phone')) {
                $table->string('supplier_phone', 30)->nullable()->after('supplier_name');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('purchase_orders', 'due_date')) {
                $cols[] = 'due_date';
            }
            if (Schema::hasColumn('purchase_orders', 'paid_amount')) {
                $cols[] = 'paid_amount';
            }
            if (Schema::hasColumn('purchase_orders', 'supplier_phone')) {
                $cols[] = 'supplier_phone';
            }
            if (!empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};
