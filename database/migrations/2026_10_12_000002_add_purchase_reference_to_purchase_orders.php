<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->string('purchase_number')->nullable()->unique()->after('po_number');
        });

        DB::table('purchase_orders')
            ->select('id')
            ->orderBy('id')
            ->chunkById(500, function ($orders): void {
                foreach ($orders as $order) {
                    DB::table('purchase_orders')
                        ->where('id', $order->id)
                        ->whereNull('purchase_number')
                        ->update(['purchase_number' => 'PUR-' . str_pad((string) $order->id, 6, '0', STR_PAD_LEFT)]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropUnique(['purchase_number']);
            $table->dropColumn('purchase_number');
        });
    }
};
