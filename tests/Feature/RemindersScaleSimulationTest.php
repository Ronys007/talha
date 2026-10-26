<?php

namespace Tests\Feature;

use App\Models\BusinessProfile;
use App\Models\Invoice;
use App\Models\PurchaseOrder;
use App\Models\User;
use App\Models\WhatsappMessageLog;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class RemindersScaleSimulationTest extends TestCase
{
    use RefreshDatabase;

    public function test_payment_reminders_scale_simulation_with_thousands_of_invoices(): void
    {
        $today = Carbon::now(config('app.timezone', 'Asia/Kolkata'))->startOfDay();

        $user = User::factory()->create();
        BusinessProfile::create([
            'user_id' => $user->id,
            'business_name' => 'Scale Test Enterprise',
            'phone' => '9876543210',
            'email' => 'admin@scaletest.com',
        ]);

        $invoices = [];
        $expectedEligibleCount = 0;
        $expectedSkippedCount = 50;

        // 1. Ineligible: Due in 5 to 30 days in future (diff > 3) -> 500 invoices
        for ($i = 1; $i <= 500; $i++) {
            $daysFuture = ($i % 25) + 5; // 5 to 29 days
            $invoices[] = [
                'user_id' => $user->id,
                'invoice_number' => "INV-FUTURE-{$i}",
                'invoice_date' => $today->copy()->subDays(5)->toDateString(),
                'due_date' => $today->copy()->addDays($daysFuture)->toDateString(),
                'status' => 'Unpaid',
                'seller_name' => 'Scale Test Enterprise',
                'customer_name' => "Customer Future {$i}",
                'customer_phone' => '919876543210',
                'total_amount' => 1000.00,
                'paid_amount' => 0.00,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // 2. ELIGIBLE: Due in 3 days (diff = 3) -> 100 invoices
        for ($i = 1; $i <= 100; $i++) {
            $invoices[] = [
                'user_id' => $user->id,
                'invoice_number' => "INV-DUE3-{$i}",
                'invoice_date' => $today->copy()->subDays(10)->toDateString(),
                'due_date' => $today->copy()->addDays(3)->toDateString(),
                'status' => 'Unpaid',
                'seller_name' => 'Scale Test Enterprise',
                'customer_name' => "Customer Due3 {$i}",
                'customer_phone' => '919876543210',
                'total_amount' => 1500.00,
                'paid_amount' => 0.00,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $expectedEligibleCount++;
        }

        // 3. ELIGIBLE: Due in 2 days (diff = 2) -> 100 invoices
        for ($i = 1; $i <= 100; $i++) {
            $invoices[] = [
                'user_id' => $user->id,
                'invoice_number' => "INV-DUE2-{$i}",
                'invoice_date' => $today->copy()->subDays(10)->toDateString(),
                'due_date' => $today->copy()->addDays(2)->toDateString(),
                'status' => 'Unpaid',
                'seller_name' => 'Scale Test Enterprise',
                'customer_name' => "Customer Due2 {$i}",
                'customer_phone' => '919876543210',
                'total_amount' => 2000.00,
                'paid_amount' => 500.00,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $expectedEligibleCount++;
        }

        // 4. ELIGIBLE: Due in 1 day (diff = 1) -> 100 invoices
        for ($i = 1; $i <= 100; $i++) {
            $invoices[] = [
                'user_id' => $user->id,
                'invoice_number' => "INV-DUE1-{$i}",
                'invoice_date' => $today->copy()->subDays(10)->toDateString(),
                'due_date' => $today->copy()->addDays(1)->toDateString(),
                'status' => 'Unpaid',
                'seller_name' => 'Scale Test Enterprise',
                'customer_name' => "Customer Due1 {$i}",
                'customer_phone' => '919876543210',
                'total_amount' => 2500.00,
                'paid_amount' => 0.00,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $expectedEligibleCount++;
        }

        // 5. ELIGIBLE: Due TODAY (diff = 0) -> 100 invoices
        for ($i = 1; $i <= 100; $i++) {
            $invoices[] = [
                'user_id' => $user->id,
                'invoice_number' => "INV-TODAY-{$i}",
                'invoice_date' => $today->copy()->subDays(10)->toDateString(),
                'due_date' => $today->toDateString(),
                'status' => 'Unpaid',
                'seller_name' => 'Scale Test Enterprise',
                'customer_name' => "Customer Today {$i}",
                'customer_phone' => '919876543210',
                'total_amount' => 3000.00,
                'paid_amount' => 0.00,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $expectedEligibleCount++;
        }

        // 6. ELIGIBLE: Overdue 5 days (diff = -5) -> 100 invoices
        for ($i = 1; $i <= 100; $i++) {
            $invoices[] = [
                'user_id' => $user->id,
                'invoice_number' => "INV-OVERDUE5-{$i}",
                'invoice_date' => $today->copy()->subDays(20)->toDateString(),
                'due_date' => $today->copy()->subDays(5)->toDateString(),
                'status' => 'Unpaid',
                'seller_name' => 'Scale Test Enterprise',
                'customer_name' => "Customer Overdue {$i}",
                'customer_phone' => '919876543210',
                'total_amount' => 1200.00,
                'paid_amount' => 200.00,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $expectedEligibleCount++;
        }

        // 7. ELIGIBLE: Overdue exactly 30 days (diff = -30) -> 100 invoices
        for ($i = 1; $i <= 100; $i++) {
            $invoices[] = [
                'user_id' => $user->id,
                'invoice_number' => "INV-OVERDUE30-{$i}",
                'invoice_date' => $today->copy()->subDays(40)->toDateString(),
                'due_date' => $today->copy()->subDays(30)->toDateString(),
                'status' => 'Unpaid',
                'seller_name' => 'Scale Test Enterprise',
                'customer_name' => "Customer Overdue30 {$i}",
                'customer_phone' => '919876543210',
                'total_amount' => 800.00,
                'paid_amount' => 0.00,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $expectedEligibleCount++;
        }

        // 8. Ineligible: Overdue > 30 days (e.g. 35 days) -> 200 invoices
        for ($i = 1; $i <= 200; $i++) {
            $invoices[] = [
                'user_id' => $user->id,
                'invoice_number' => "INV-PAST35-{$i}",
                'invoice_date' => $today->copy()->subDays(50)->toDateString(),
                'due_date' => $today->copy()->subDays(35)->toDateString(),
                'status' => 'Unpaid',
                'seller_name' => 'Scale Test Enterprise',
                'customer_name' => "Customer Past35 {$i}",
                'customer_phone' => '919876543210',
                'total_amount' => 1000.00,
                'paid_amount' => 0.00,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // 9. Ineligible: Paid invoices -> 300 invoices
        for ($i = 1; $i <= 300; $i++) {
            $invoices[] = [
                'user_id' => $user->id,
                'invoice_number' => "INV-PAID-{$i}",
                'invoice_date' => $today->copy()->subDays(10)->toDateString(),
                'due_date' => $today->toDateString(),
                'status' => 'Paid',
                'seller_name' => 'Scale Test Enterprise',
                'customer_name' => "Customer Paid {$i}",
                'customer_phone' => '919876543210',
                'total_amount' => 1000.00,
                'paid_amount' => 1000.00,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // 10. Ineligible: Fully settled but status not yet marked Paid (balance = 0) -> 200 invoices
        for ($i = 1; $i <= 200; $i++) {
            $invoices[] = [
                'user_id' => $user->id,
                'invoice_number' => "INV-BALZERO-{$i}",
                'invoice_date' => $today->copy()->subDays(10)->toDateString(),
                'due_date' => $today->toDateString(),
                'status' => 'Unpaid',
                'seller_name' => 'Scale Test Enterprise',
                'customer_name' => "Customer BalZero {$i}",
                'customer_phone' => '919876543210',
                'total_amount' => 500.00,
                'paid_amount' => 500.00,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // 11. Ineligible: Missing customer phone -> 200 invoices
        for ($i = 1; $i <= 200; $i++) {
            $invoices[] = [
                'user_id' => $user->id,
                'invoice_number' => "INV-NOPHONE-{$i}",
                'invoice_date' => $today->copy()->subDays(10)->toDateString(),
                'due_date' => $today->toDateString(),
                'status' => 'Unpaid',
                'seller_name' => 'Scale Test Enterprise',
                'customer_name' => "Customer NoPhone {$i}",
                'customer_phone' => '',
                'total_amount' => 1000.00,
                'paid_amount' => 0.00,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // 12. ELIGIBLE: Null due_date, but invoice_date is 2 days ago (fallback to invoice_date) -> 100 invoices
        for ($i = 1; $i <= 100; $i++) {
            $invoices[] = [
                'user_id' => $user->id,
                'invoice_number' => "INV-NULLDUE-{$i}",
                'invoice_date' => $today->copy()->subDays(2)->toDateString(),
                'due_date' => null,
                'status' => 'Unpaid',
                'seller_name' => 'Scale Test Enterprise',
                'customer_name' => "Customer NullDue {$i}",
                'customer_phone' => '919876543210',
                'total_amount' => 950.00,
                'paid_amount' => 0.00,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $expectedEligibleCount++;
        }

        // Bulk insert in chunks of 500
        foreach (array_chunk($invoices, 500) as $chunk) {
            Invoice::insert($chunk);
        }

        $totalInvoicesCreated = count($invoices);
        $this->assertGreaterThanOrEqual(2100, $totalInvoicesCreated);

        // 13. Create 50 invoices that are eligible but ALREADY SENT today with status='sent' -> must be skipped
        $alreadySentIds = [];
        for ($i = 1; $i <= 50; $i++) {
            $sentInvoice = Invoice::create([
                'user_id' => $user->id,
                'invoice_number' => "INV-ALREADY-SENT-{$i}",
                'invoice_date' => $today->copy()->subDays(5)->toDateString(),
                'due_date' => $today->copy()->addDays(1)->toDateString(),
                'status' => 'Unpaid',
                'seller_name' => 'Scale Test Enterprise',
                'customer_name' => "Customer Already Sent {$i}",
                'customer_phone' => '919876543210',
                'total_amount' => 1200.00,
                'paid_amount' => 0.00,
            ]);
            $alreadySentIds[] = $sentInvoice->id;
            WhatsappMessageLog::create([
                'user_id' => $user->id,
                'invoice_id' => $sentInvoice->id,
                'trigger_type' => 'payment_reminder',
                'recipient_name' => $sentInvoice->customer_name,
                'recipient_phone' => $sentInvoice->customer_phone,
                'status' => 'sent',
                'message' => 'Payment reminder test',
                'created_at' => $today->copy()->addHours(2),
            ]);
            $expectedEligibleCount++;
        }

        // 14. Create 50 invoices that previously had status='fallback_link' -> MUST NOT BE SKIPPED, MUST BE RETRIED
        for ($i = 1; $i <= 50; $i++) {
            $fallbackInvoice = Invoice::create([
                'user_id' => $user->id,
                'invoice_number' => "INV-PREV-FALLBACK-{$i}",
                'invoice_date' => $today->copy()->subDays(5)->toDateString(),
                'due_date' => $today->copy()->addDays(2)->toDateString(),
                'status' => 'Unpaid',
                'seller_name' => 'Scale Test Enterprise',
                'customer_name' => "Customer Fallback {$i}",
                'customer_phone' => '919876543210',
                'total_amount' => 1400.00,
                'paid_amount' => 0.00,
            ]);
            WhatsappMessageLog::create([
                'user_id' => $user->id,
                'invoice_id' => $fallbackInvoice->id,
                'trigger_type' => 'payment_reminder',
                'recipient_name' => $fallbackInvoice->customer_name,
                'recipient_phone' => $fallbackInvoice->customer_phone,
                'status' => 'fallback_link',
                'message' => 'Fallback link earlier today',
                'created_at' => $today->copy()->addHours(1),
            ]);
            $expectedEligibleCount++;
        }

        $memStart = memory_get_usage(true);

        // Run the command in dry-run mode
        $exitCode = Artisan::call('invoices:send-due-reminders', ['--dry-run' => true]);
        $output = Artisan::output();

        $memEnd = memory_get_usage(true);
        $memDiffMb = round(($memEnd - $memStart) / 1024 / 1024, 2);

        $this->assertSame(0, $exitCode);
        $this->assertStringContainsString("Found {$expectedEligibleCount} eligible invoices", $output);
        $this->assertStringContainsString("{$expectedSkippedCount} skipped", $output);

        // Expected sent in dry run = total eligible - skipped
        $expectedSentCount = $expectedEligibleCount - $expectedSkippedCount;
        $this->assertStringContainsString("{$expectedSentCount} sent", $output);

        // Assert memory remained lightweight (< 25MB increase) despite scanning thousands of rows
        $this->assertLessThan(25, $memDiffMb, "Memory increased by {$memDiffMb} MB, which is too high for shared hosting.");
    }

    public function test_purchase_reminders_scale_simulation_with_thousands_of_orders(): void
    {
        $today = Carbon::now(config('app.timezone', 'Asia/Kolkata'))->startOfDay();

        $user = User::factory()->create();
        BusinessProfile::create([
            'user_id' => $user->id,
            'business_name' => 'Purchase Scale Test Store',
            'phone' => '9876543210',
            'email' => 'admin@purchasetest.com',
        ]);

        $orders = [];
        $expectedEligibleCount = 0;

        // 1. Ineligible: Due in 10 to 40 days in future -> 400 orders
        for ($i = 1; $i <= 400; $i++) {
            $orders[] = [
                'user_id' => $user->id,
                'po_number' => "PO-FUT-{$i}",
                'supplier_name' => "Supplier Future {$i}",
                'order_date' => $today->copy()->subDays(5)->toDateString(),
                'due_date' => $today->copy()->addDays(10 + ($i % 20))->toDateString(),
                'status' => 'Pending',
                'total_amount' => 5000.00,
                'paid_amount' => 0.00,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // 2. ELIGIBLE: Due in 3 days -> 80 orders
        for ($i = 1; $i <= 80; $i++) {
            $orders[] = [
                'user_id' => $user->id,
                'po_number' => "PO-DUE3-{$i}",
                'supplier_name' => "Supplier Due3 {$i}",
                'order_date' => $today->copy()->subDays(10)->toDateString(),
                'due_date' => $today->copy()->addDays(3)->toDateString(),
                'status' => 'Pending',
                'total_amount' => 6000.00,
                'paid_amount' => 0.00,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $expectedEligibleCount++;
        }

        // 3. ELIGIBLE: Due in 1 day -> 80 orders
        for ($i = 1; $i <= 80; $i++) {
            $orders[] = [
                'user_id' => $user->id,
                'po_number' => "PO-DUE1-{$i}",
                'supplier_name' => "Supplier Due1 {$i}",
                'order_date' => $today->copy()->subDays(10)->toDateString(),
                'due_date' => $today->copy()->addDays(1)->toDateString(),
                'status' => 'Pending',
                'total_amount' => 7000.00,
                'paid_amount' => 1000.00,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $expectedEligibleCount++;
        }

        // 4. ELIGIBLE: Due today -> 80 orders
        for ($i = 1; $i <= 80; $i++) {
            $orders[] = [
                'user_id' => $user->id,
                'po_number' => "PO-TODAY-{$i}",
                'supplier_name' => "Supplier Today {$i}",
                'order_date' => $today->copy()->subDays(10)->toDateString(),
                'due_date' => $today->toDateString(),
                'status' => 'Pending',
                'total_amount' => 8000.00,
                'paid_amount' => 0.00,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            $expectedEligibleCount++;
        }

        // 5. Ineligible: Fully paid -> 200 orders
        for ($i = 1; $i <= 200; $i++) {
            $orders[] = [
                'user_id' => $user->id,
                'po_number' => "PO-PAID-{$i}",
                'supplier_name' => "Supplier Paid {$i}",
                'order_date' => $today->copy()->subDays(10)->toDateString(),
                'due_date' => $today->toDateString(),
                'status' => 'Paid',
                'total_amount' => 4000.00,
                'paid_amount' => 4000.00,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        // 6. Ineligible: Overdue by > 30 days -> 200 orders
        for ($i = 1; $i <= 200; $i++) {
            $orders[] = [
                'user_id' => $user->id,
                'po_number' => "PO-OLD-{$i}",
                'supplier_name' => "Supplier Old {$i}",
                'order_date' => $today->copy()->subDays(60)->toDateString(),
                'due_date' => $today->copy()->subDays(35)->toDateString(),
                'status' => 'Pending',
                'total_amount' => 4000.00,
                'paid_amount' => 0.00,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        foreach (array_chunk($orders, 400) as $chunk) {
            PurchaseOrder::insert($chunk);
        }

        $exitCode = Artisan::call('purchases:send-due-reminders', ['--dry-run' => true]);
        $output = Artisan::output();

        $this->assertSame(0, $exitCode);
        $this->assertStringContainsString("Found {$expectedEligibleCount} eligible purchase orders", $output);
        $this->assertStringContainsString("{$expectedEligibleCount} sent", $output);
    }

    public function test_web_cron_endpoint_supports_dry_run_and_authentication(): void
    {
        $cronSecret = env('CRON_SECRET', 'test_secret_token');
        config(['app.cron_secret' => $cronSecret]);

        // Unauthorized request without token
        $response = $this->getJson('/cron/send-reminders');
        $response->assertStatus(403);
        $response->assertJson([
            'success' => false,
            'error' => 'Unauthorized: Missing or invalid cron authorization token.',
        ]);

        // Authorized request with token & dry_run=1
        $response = $this->getJson("/cron/send-reminders?token={$cronSecret}&dry_run=1");
        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'mode' => 'dry_run',
        ]);
        $this->assertArrayHasKey('sales_reminders', $response->json());
        $this->assertArrayHasKey('purchase_reminders', $response->json());
    }
}
