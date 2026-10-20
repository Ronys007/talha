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
        Schema::table('whatsapp_broadcasts', function (Blueprint $table) {
            $table->string('image_path')->nullable()->after('message_template');
            $table->string('recipient_mode', 20)->default('filter')->after('filter_type');
            $table->mediumText('custom_numbers')->nullable()->after('recipient_mode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('whatsapp_broadcasts', function (Blueprint $table) {
            $table->dropColumn(['image_path', 'recipient_mode', 'custom_numbers']);
        });
    }
};
