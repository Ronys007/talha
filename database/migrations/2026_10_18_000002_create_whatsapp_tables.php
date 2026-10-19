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
        // 1. WhatsApp Templates
        Schema::create('whatsapp_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('type', 50); // bill_created, bill_updated, payment_reminder, custom
            $table->string('title');
            $table->text('message');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'type']);
        });

        // 2. WhatsApp Broadcast Campaigns
        Schema::create('whatsapp_broadcasts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('title');
            $table->text('message_template');
            $table->string('filter_type', 50)->default('all'); // all, pending_balance, inactive_30, inactive_60
            $table->string('status', 30)->default('draft'); // draft, scheduled, processing, completed, paused, cancelled
            $table->unsignedInteger('total_recipients')->default(0);
            $table->unsignedInteger('sent_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });

        // 3. Broadcast Logs (per recipient in campaign)
        Schema::create('whatsapp_broadcast_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('broadcast_id')->constrained('whatsapp_broadcasts')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->string('customer_name')->nullable();
            $table->string('phone', 30);
            $table->text('message');
            $table->string('status', 30)->default('pending'); // pending, sent, failed, skipped
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['broadcast_id', 'status']);
            $table->index(['user_id', 'sent_at']);
        });

        // 4. WhatsApp Message Logs (all outgoing messages across app)
        Schema::create('whatsapp_message_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('trigger_type', 50)->default('direct'); // bill_created, bill_updated, payment_reminder, broadcast, test
            $table->unsignedBigInteger('invoice_id')->nullable();
            $table->string('recipient_name')->nullable();
            $table->string('recipient_phone', 30);
            $table->text('message');
            $table->string('status', 30)->default('sent'); // sent, failed, fallback_link
            $table->text('wa_me_url')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'trigger_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_message_logs');
        Schema::dropIfExists('whatsapp_broadcast_logs');
        Schema::dropIfExists('whatsapp_broadcasts');
        Schema::dropIfExists('whatsapp_templates');
    }
};
