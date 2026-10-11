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
        // 1. inventory_b_s table
        Schema::table('inventory_b_s', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_b_s', 'mode')) {
                $table->string('mode', 20)->default('standard')->after('user_id');
            }
            if (!Schema::hasColumn('inventory_b_s', 'selling_price')) {
                $table->decimal('selling_price', 10, 2)->nullable()->default(0.00)->after('qty');
            }
        });

        // 2. order_b_s table
        Schema::table('order_b_s', function (Blueprint $table) {
            if (!Schema::hasColumn('order_b_s', 'mode')) {
                $table->string('mode', 20)->default('standard')->after('user_id');
            }
            if (!Schema::hasColumn('order_b_s', 'discount_divisor')) {
                $table->unsignedTinyInteger('discount_divisor')->nullable()->after('discount');
            }
        });

        // 3. order_items_b_s table
        Schema::table('order_items_b_s', function (Blueprint $table) {
            if (!Schema::hasColumn('order_items_b_s', 'mode')) {
                $table->string('mode', 20)->default('standard')->after('order_b_s_id');
            }
        });

        // 4. credit_b_s table
        if (Schema::hasTable('credit_b_s')) {
            Schema::table('credit_b_s', function (Blueprint $table) {
                if (!Schema::hasColumn('credit_b_s', 'mode')) {
                    $table->string('mode', 20)->default('standard')->after('user_id');
                }
            });
        }

        // 5. receive_b_s table
        if (Schema::hasTable('receive_b_s')) {
            Schema::table('receive_b_s', function (Blueprint $table) {
                if (!Schema::hasColumn('receive_b_s', 'mode')) {
                    $table->string('mode', 20)->default('standard')->after('user_id');
                }
            });
        }

        // 6. combined_data_b_s table
        if (Schema::hasTable('combined_data_b_s')) {
            Schema::table('combined_data_b_s', function (Blueprint $table) {
                if (!Schema::hasColumn('combined_data_b_s', 'mode')) {
                    $table->string('mode', 20)->default('standard')->after('user_id');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_b_s', function (Blueprint $table) {
            if (Schema::hasColumn('inventory_b_s', 'mode')) $table->dropColumn('mode');
            if (Schema::hasColumn('inventory_b_s', 'selling_price')) $table->dropColumn('selling_price');
        });

        Schema::table('order_b_s', function (Blueprint $table) {
            if (Schema::hasColumn('order_b_s', 'mode')) $table->dropColumn('mode');
            if (Schema::hasColumn('order_b_s', 'discount_divisor')) $table->dropColumn('discount_divisor');
        });

        Schema::table('order_items_b_s', function (Blueprint $table) {
            if (Schema::hasColumn('order_items_b_s', 'mode')) $table->dropColumn('mode');
        });

        if (Schema::hasTable('credit_b_s')) {
            Schema::table('credit_b_s', function (Blueprint $table) {
                if (Schema::hasColumn('credit_b_s', 'mode')) $table->dropColumn('mode');
            });
        }

        if (Schema::hasTable('receive_b_s')) {
            Schema::table('receive_b_s', function (Blueprint $table) {
                if (Schema::hasColumn('receive_b_s', 'mode')) $table->dropColumn('mode');
            });
        }

        if (Schema::hasTable('combined_data_b_s')) {
            Schema::table('combined_data_b_s', function (Blueprint $table) {
                if (Schema::hasColumn('combined_data_b_s', 'mode')) $table->dropColumn('mode');
            });
        }
    }
};
