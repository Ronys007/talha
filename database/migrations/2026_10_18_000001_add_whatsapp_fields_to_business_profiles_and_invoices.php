<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use App\Models\Invoice;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('business_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('business_profiles', 'upi_id')) {
                $table->string('upi_id', 100)->nullable()->after('bank_branch');
            }
            if (!Schema::hasColumn('business_profiles', 'google_review_url')) {
                $table->text('google_review_url')->nullable()->after('upi_id');
            }
        });

        Schema::table('invoices', function (Blueprint $table) {
            if (!Schema::hasColumn('invoices', 'invoice_hash')) {
                $table->string('invoice_hash', 64)->nullable()->unique()->after('invoice_number');
            }
        });

        // Generate hashes for existing invoices if empty
        Invoice::whereNull('invoice_hash')->cursor()->each(function ($inv) {
            $inv->invoice_hash = Str::random(24);
            $inv->saveQuietly();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('business_profiles', function (Blueprint $table) {
            $table->dropColumn(['upi_id', 'google_review_url']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn('invoice_hash');
        });
    }
};
