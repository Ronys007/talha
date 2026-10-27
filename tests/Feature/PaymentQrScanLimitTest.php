<?php

namespace Tests\Feature;

use App\Models\BusinessProfile;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentQrScanLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_payment_qr_enforces_strict_two_scan_limit(): void
    {
        $user = User::factory()->create();
        BusinessProfile::create([
            'user_id' => $user->id,
            'business_name' => 'Limit Test Store',
            'upi_id' => 'teststore@upi',
            'phone' => '9876543210',
        ]);

        $invoice = Invoice::create([
            'user_id' => $user->id,
            'invoice_number' => 'INV-SCAN-TEST',
            'invoice_date' => now()->toDateString(),
            'due_date' => now()->addDays(2)->toDateString(),
            'status' => 'Unpaid',
            'seller_name' => 'Limit Test Store',
            'customer_name' => 'Rahul Verma',
            'customer_phone' => '919876543210',
            'total_amount' => 2500.00,
            'paid_amount' => 0.00,
            'payment_qr_scans' => 0,
        ]);

        $this->assertNotEmpty($invoice->invoice_hash);

        // Scan 1: Should be successful (Scan 1 of 2)
        $res1 = $this->get("/pay/{$invoice->invoice_hash}");
        $res1->assertStatus(200);
        $res1->assertSee('Scan 1 of 2 used');
        $this->assertSame(1, (int) $invoice->fresh()->payment_qr_scans);

        // Scan 2: Should be successful (Scan 2 of 2)
        $res2 = $this->get("/pay/{$invoice->invoice_hash}");
        $res2->assertStatus(200);
        $res2->assertSee('Scan 2 of 2 used');
        $this->assertSame(2, (int) $invoice->fresh()->payment_qr_scans);

        // Scan 3: Should be blocked with 403 and show Limit Reached screen
        $res3 = $this->get("/pay/{$invoice->invoice_hash}");
        $res3->assertStatus(403);
        $res3->assertSee('QR Scan Limit Reached');
        $res3->assertSee('Maximum 2 scans allowed for this payment code');
    }
}
