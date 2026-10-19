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
        // 1. Saved Business (Seller) Profiles
        Schema::create('business_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('business_name');
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('pincode', 20)->nullable();
            $table->string('gst_number', 50)->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('email')->nullable();
            $table->string('pan_number', 50)->nullable();
            $table->string('bank_name')->nullable();
            $table->string('bank_account_number')->nullable();
            $table->string('bank_ifsc', 50)->nullable();
            $table->string('bank_branch')->nullable();
            $table->text('terms_and_conditions')->nullable();
            $table->timestamps();

            $table->unique('user_id');
        });

        // 2. Tax Invoices Table
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('invoice_number');
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->string('status', 50)->default('Paid'); // Paid, Unpaid, Partially Paid
            $table->string('tax_type', 50)->default('intra_state'); // intra_state (CGST+SGST) or inter_state (IGST)

            // Seller Snapshot
            $table->string('seller_name');
            $table->text('seller_address')->nullable();
            $table->string('seller_gst_number', 50)->nullable();
            $table->string('seller_phone', 50)->nullable();
            $table->string('seller_state', 100)->nullable();

            // Customer (Buyer) Details
            $table->string('customer_name');
            $table->text('customer_address')->nullable();
            $table->string('customer_gst_number', 50)->nullable();
            $table->string('customer_phone', 50)->nullable();
            $table->string('customer_state', 100)->nullable();
            $table->string('place_of_supply', 100)->nullable();

            // Financial Calculations
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('total_discount', 12, 2)->default(0);
            $table->decimal('taxable_amount', 12, 2)->default(0);
            $table->decimal('cgst_amount', 12, 2)->default(0);
            $table->decimal('sgst_amount', 12, 2)->default(0);
            $table->decimal('igst_amount', 12, 2)->default(0);
            $table->decimal('total_tax', 12, 2)->default(0);
            $table->decimal('round_off', 8, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);

            $table->text('notes')->nullable();
            $table->text('terms')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'invoice_number']);
        });

        // 3. Invoice Items Table
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->unsignedBigInteger('inventory_id')->nullable();
            $table->string('item_name');
            $table->string('hsn_sac', 50)->nullable();
            $table->decimal('quantity', 10, 3)->default(1);
            $table->string('unit', 50)->default('PCS');
            $table->decimal('rate', 12, 2)->default(0);
            $table->decimal('discount_percent', 5, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('taxable_value', 12, 2)->default(0);
            $table->decimal('gst_rate', 5, 2)->default(0);
            $table->decimal('cgst_rate', 5, 2)->default(0);
            $table->decimal('cgst_amount', 12, 2)->default(0);
            $table->decimal('sgst_rate', 5, 2)->default(0);
            $table->decimal('sgst_amount', 12, 2)->default(0);
            $table->decimal('igst_rate', 5, 2)->default(0);
            $table->decimal('igst_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->timestamps();

            $table->index(['invoice_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('business_profiles');
    }
};
