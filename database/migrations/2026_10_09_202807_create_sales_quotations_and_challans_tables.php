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
        // ── 1. Quotations / Estimates ─────────────────────────────────
        Schema::create('quotations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->index();
            $table->string('quotation_number');
            $table->date('quotation_date');
            $table->date('valid_until')->nullable();
            $table->string('customer_name');
            $table->string('customer_phone')->nullable();
            $table->string('customer_email')->nullable();
            $table->text('customer_address')->nullable();
            $table->string('customer_gst')->nullable();
            $table->string('status')->default('Pending'); // Pending, Accepted, Converted, Rejected
            $table->unsignedBigInteger('converted_invoice_id')->nullable();
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('total_discount', 15, 2)->default(0);
            $table->decimal('taxable_amount', 15, 2)->default(0);
            $table->decimal('total_tax', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('applied_margin_percent', 8, 2)->nullable();
            $table->decimal('applied_margin_amount', 15, 2)->nullable();
            $table->text('notes')->nullable();
            $table->text('terms')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'quotation_number']);
        });

        Schema::create('quotation_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('quotation_id')->index();
            $table->string('description');
            $table->string('hsn_sac')->nullable();
            $table->decimal('quantity', 12, 3)->default(1);
            $table->string('unit')->default('PCS');
            $table->decimal('rate', 15, 2)->default(0);
            $table->decimal('discount_percent', 8, 2)->default(0);
            $table->decimal('tax_rate', 8, 2)->default(0);
            $table->decimal('amount', 15, 2)->default(0);
            $table->decimal('cost_price', 15, 2)->nullable();
            $table->decimal('margin_percent', 8, 2)->nullable();
            $table->timestamps();

            $table->foreign('quotation_id')->references('id')->on('quotations')->onDelete('cascade');
        });

        // ── 3. Delivery Challans (Driver / Transport Challans) ─────────
        Schema::create('delivery_challans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->index();
            $table->string('challan_number');
            $table->date('challan_date');
            $table->unsignedBigInteger('invoice_id')->nullable();
            $table->unsignedBigInteger('sales_order_id')->nullable();
            $table->string('customer_name');
            $table->string('customer_phone')->nullable();
            $table->text('delivery_address')->nullable();
            $table->string('driver_name')->nullable();
            $table->string('driver_phone')->nullable();
            $table->string('vehicle_number')->nullable();
            $table->string('transporter_name')->nullable();
            $table->string('eway_bill_no')->nullable();
            $table->string('dispatch_time')->nullable();
            $table->string('status')->default('Dispatched'); // Dispatched, In Transit, Delivered, Returned
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'challan_number']);
        });

        Schema::create('delivery_challan_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('delivery_challan_id')->index();
            $table->string('description');
            $table->decimal('quantity', 12, 3)->default(1);
            $table->string('unit')->default('PCS');
            $table->integer('packages')->default(1)->nullable();
            $table->string('remarks')->nullable();
            $table->timestamps();

            $table->foreign('delivery_challan_id')->references('id')->on('delivery_challans')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('delivery_challan_items');
        Schema::dropIfExists('delivery_challans');
        Schema::dropIfExists('quotation_items');
        Schema::dropIfExists('quotations');
        Schema::dropIfExists('sales_order_items');
        Schema::dropIfExists('sales_orders');
    }
};
