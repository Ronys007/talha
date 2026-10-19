<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('inventory_b_s')->where('mode', 'qr')->update(['mode' => 'barcode']);
        DB::table('order_b_s')->where('mode', 'qr')->update(['mode' => 'barcode']);
        DB::table('order_items_b_s')->where('mode', 'qr')->update(['mode' => 'barcode']);
        DB::table('credit_b_s')->where('mode', 'qr')->update(['mode' => 'barcode']);
        DB::table('receive_b_s')->where('mode', 'qr')->update(['mode' => 'barcode']);
        DB::table('combined_data_b_s')->where('mode', 'qr')->update(['mode' => 'barcode']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('inventory_b_s')->where('mode', 'barcode')->update(['mode' => 'qr']);
        DB::table('order_b_s')->where('mode', 'barcode')->update(['mode' => 'qr']);
        DB::table('order_items_b_s')->where('mode', 'barcode')->update(['mode' => 'qr']);
        DB::table('credit_b_s')->where('mode', 'barcode')->update(['mode' => 'qr']);
        DB::table('receive_b_s')->where('mode', 'barcode')->update(['mode' => 'qr']);
        DB::table('combined_data_b_s')->where('mode', 'barcode')->update(['mode' => 'qr']);
    }
};
