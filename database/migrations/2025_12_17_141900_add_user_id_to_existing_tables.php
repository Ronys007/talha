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
        // Add user_id to inventory_b_s table if column doesn't exist
        if (!Schema::hasColumn('inventory_b_s', 'user_id')) {
            Schema::table('inventory_b_s', function (Blueprint $table) {
                $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->onDelete('cascade');
            });
        }

        // Add user_id to order_b_s table if column doesn't exist
        if (!Schema::hasColumn('order_b_s', 'user_id')) {
            Schema::table('order_b_s', function (Blueprint $table) {
                $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->onDelete('cascade');
            });
        }

        // Add user_id to credit_b_s table if it exists and column doesn't exist
        if (Schema::hasTable('credit_b_s') && !Schema::hasColumn('credit_b_s', 'user_id')) {
            Schema::table('credit_b_s', function (Blueprint $table) {
                $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->onDelete('cascade');
            });
        }

        // Add user_id to receive_b_s table if it exists and column doesn't exist
        if (Schema::hasTable('receive_b_s') && !Schema::hasColumn('receive_b_s', 'user_id')) {
            Schema::table('receive_b_s', function (Blueprint $table) {
                $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->onDelete('cascade');
            });
        }

        // Add user_id to combined_data_b_s table if it exists and column doesn't exist
        if (Schema::hasTable('combined_data_b_s') && !Schema::hasColumn('combined_data_b_s', 'user_id')) {
            Schema::table('combined_data_b_s', function (Blueprint $table) {
                $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove user_id from inventory_b_s
        if (Schema::hasColumn('inventory_b_s', 'user_id')) {
            Schema::table('inventory_b_s', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            });
        }

        // Remove user_id from order_b_s
        if (Schema::hasColumn('order_b_s', 'user_id')) {
            Schema::table('order_b_s', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            });
        }

        // Remove user_id from credit_b_s
        if (Schema::hasTable('credit_b_s') && Schema::hasColumn('credit_b_s', 'user_id')) {
            Schema::table('credit_b_s', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            });
        }

        // Remove user_id from receive_b_s
        if (Schema::hasTable('receive_b_s') && Schema::hasColumn('receive_b_s', 'user_id')) {
            Schema::table('receive_b_s', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            });
        }

        // Remove user_id from combined_data_b_s
        if (Schema::hasTable('combined_data_b_s') && Schema::hasColumn('combined_data_b_s', 'user_id')) {
            Schema::table('combined_data_b_s', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            });
        }
    }
};
