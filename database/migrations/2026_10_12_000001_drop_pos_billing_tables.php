<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('combined_data_b_s');
        Schema::dropIfExists('receive_b_s');
        Schema::dropIfExists('credit_b_s');
        Schema::dropIfExists('order_items_b_s');
        Schema::dropIfExists('order_b_s');
        Schema::dropIfExists('order_a_s');
        Schema::dropIfExists('inventory_a_s');
    }

    public function down(): void
    {
        throw new \RuntimeException('The POS billing tables and their data cannot be restored by rolling back this migration.');
    }
};
