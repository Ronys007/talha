<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\PurchaseOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardStatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_stats_include_gst_breakdowns_for_counts_revenue_and_pending_balance(): void
    {
        $user = User::factory()->create();

        PurchaseOrder::create([
            'user_id' => $user->id,
            'po_number' => 'PO-GST',
            'supplier_name' => 'GST Supplier',
            'order_date' => '2026-10-08',
            'total_amount' => 118,
            'total_gst' => 18,
        ]);
        PurchaseOrder::create([
            'user_id' => $user->id,
            'po_number' => 'PO-NO-GST',
            'supplier_name' => 'Non-GST Supplier',
            'order_date' => '2026-10-09',
            'total_amount' => 50,
            'total_gst' => 0,
        ]);

        Invoice::create([
            'user_id' => $user->id,
            'invoice_number' => 'INV-GST',
            'invoice_date' => '2026-10-08',
            'status' => 'Partially Paid',
            'seller_name' => 'Seller',
            'customer_name' => 'GST Customer',
            'taxable_amount' => 100,
            'total_tax' => 18,
            'total_amount' => 118,
            'paid_amount' => 59,
        ]);
        Invoice::create([
            'user_id' => $user->id,
            'invoice_number' => 'INV-NO-GST',
            'invoice_date' => '2026-10-09',
            'status' => 'Unpaid',
            'seller_name' => 'Seller',
            'customer_name' => 'Non-GST Customer',
            'taxable_amount' => 50,
            'total_tax' => 0,
            'total_amount' => 50,
            'paid_amount' => 0,
        ]);

        PurchaseOrder::create([
            'user_id' => $user->id,
            'po_number' => 'PO-CANCELLED',
            'supplier_name' => 'Cancelled Supplier',
            'order_date' => '2026-10-10',
            'status' => 'Cancelled',
            'total_amount' => 500,
            'total_gst' => 50,
        ]);

        Invoice::create([
            'user_id' => $user->id,
            'invoice_number' => 'INV-CANCELLED',
            'invoice_date' => '2026-10-10',
            'status' => 'Cancelled',
            'seller_name' => 'Seller',
            'customer_name' => 'Cancelled Customer',
            'taxable_amount' => 100,
            'total_tax' => 18,
            'total_amount' => 118,
            'paid_amount' => 0,
        ]);

        $response = $this->actingAs($user)->getJson(route('home.stats', [
            'from' => '2026-10-01',
            'to' => '2026-10-31',
        ]));

        $response->assertOk()->assertJson([
            'totalPurchases' => 2,
            'purchasesWithGstCount' => 1,
            'purchasesWithoutGstCount' => 1,
            'totalSalesCount' => 2,
            'salesWithGstCount' => 1,
            'salesWithoutGstCount' => 1,
            'totalRevenue' => 168,
            'totalRevenueWithGst' => 118,
            'totalRevenueWithoutGst' => 50,
            'pendingBalance' => 109,
            'pendingBalanceWithGst' => 59,
            'pendingBalanceWithoutGst' => 50,
        ]);

        // Test all-time without dates
        $allResponse = $this->actingAs($user)->getJson(route('home.stats'));
        $allResponse->assertOk()->assertJson([
            'totalPurchases' => 2,
            'totalSalesCount' => 2,
            'totalRevenue' => 168,
            'pendingBalance' => 109,
        ]);
    }

    public function test_dashboard_aggregates_all_purchases_and_sales_types_including_converted_quotations_and_scans(): void
    {
        $user = User::factory()->create();

        // 1. Manual purchase (with GST)
        PurchaseOrder::create([
            'user_id' => $user->id,
            'po_number' => 'PO-MANUAL-GST',
            'supplier_name' => 'Manual Supplier',
            'order_date' => '2026-10-05',
            'status' => 'Paid',
            'total_amount' => 1000,
            'total_gst' => 180,
            'paid_amount' => 1000,
        ]);

        // 2. Uploaded / Scanned purchase (non-GST)
        PurchaseOrder::create([
            'user_id' => $user->id,
            'po_number' => 'PO-UPLOADED-NONGST',
            'supplier_name' => 'Uploaded Supplier',
            'order_date' => '2026-10-06',
            'status' => 'Pending',
            'total_amount' => 500,
            'total_gst' => 0,
            'paid_amount' => 0,
            'bill_file' => 'purchases/sample_bill.jpg',
        ]);

        // 3. Manual sales invoice (with GST, Paid)
        Invoice::create([
            'user_id' => $user->id,
            'invoice_number' => 'INV-MANUAL-GST',
            'invoice_date' => '2026-10-05',
            'status' => 'Paid',
            'seller_name' => 'Store',
            'customer_name' => 'Customer A',
            'total_amount' => 2000,
            'paid_amount' => 2000,
            'total_tax' => 200,
        ]);

        // 4. Uploaded / Scanned sales invoice (non-GST, Partially Paid)
        Invoice::create([
            'user_id' => $user->id,
            'invoice_number' => 'INV-SCANNED-NONGST',
            'invoice_date' => '2026-10-06',
            'status' => 'Partially Paid',
            'seller_name' => 'Store',
            'customer_name' => 'Customer B',
            'total_amount' => 800,
            'paid_amount' => 300,
            'total_tax' => 0,
        ]);

        // 5. Quotation converted to invoice (Unpaid, with GST)
        Invoice::create([
            'user_id' => $user->id,
            'invoice_number' => 'INV-FROM-QT',
            'invoice_date' => '2026-10-07',
            'status' => 'Unpaid',
            'seller_name' => 'Store',
            'customer_name' => 'Quotation Buyer',
            'total_amount' => 1200,
            'paid_amount' => 0,
            'total_tax' => 120,
            'notes' => 'Converted from Quotation #QT-2026-0001',
        ]);

        $response = $this->actingAs($user)->getJson(route('home.stats', ['all' => 1]));

        $response->assertOk()->assertJson([
            'totalPurchases' => 2,
            'totalSalesCount' => 3,
            'totalRevenue' => 4000.00, // 2000 + 800 + 1200
            'pendingBalance' => 1700.00, // (800 - 300 = 500) + (1200 - 0 = 1200) = 1700
        ]);
    }
}
