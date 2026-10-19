<?php

namespace Tests\Feature;

use App\Models\BusinessProfile;
use App\Models\Inventory;
use App\Models\Invoice;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceInventoryConsistencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_sequential_invoice_number_generation_avoids_collisions_when_invoices_are_deleted(): void
    {
        $user = User::factory()->create();
        $year = date('Y');

        // Create 3 invoices
        Invoice::create([
            'user_id' => $user->id,
            'invoice_number' => "INV-{$year}-0001",
            'invoice_date' => date('Y-m-d'),
            'status' => 'Paid',
            'seller_name' => 'Store',
            'customer_name' => 'Customer 1',
        ]);
        $inv2 = Invoice::create([
            'user_id' => $user->id,
            'invoice_number' => "INV-{$year}-0002",
            'invoice_date' => date('Y-m-d'),
            'status' => 'Paid',
            'seller_name' => 'Store',
            'customer_name' => 'Customer 2',
        ]);
        Invoice::create([
            'user_id' => $user->id,
            'invoice_number' => "INV-{$year}-0003",
            'invoice_date' => date('Y-m-d'),
            'status' => 'Paid',
            'seller_name' => 'Store',
            'customer_name' => 'Customer 3',
        ]);

        // Delete invoice #2
        $inv2->delete();

        // The next generated number must NOT collide with INV-YYYY-0003
        $next = Invoice::generateNextNumber([$user->id]);
        $this->assertSame("INV-{$year}-0004", $next);
    }

    public function test_quotation_conversion_creates_unpaid_invoice_and_deducts_inventory(): void
    {
        $user = User::factory()->create();
        $inventory = Inventory::create([
            'user_id' => $user->id,
            'code' => 'SKU-CSB-01',
            'item' => 'Cotton Shirt Blue',
            'qty' => 50,
            'unit' => 'PCS',
            'selling_price' => 500,
        ]);

        $quotation = Quotation::create([
            'user_id' => $user->id,
            'quotation_number' => 'QT-' . date('Y') . '-0001',
            'quotation_date' => date('Y-m-d'),
            'customer_name' => 'Retail Buyer',
            'status' => 'Pending',
            'subtotal' => 1000,
            'total_tax' => 50,
            'total_amount' => 1050,
        ]);

        QuotationItem::create([
            'quotation_id' => $quotation->id,
            'description' => 'Cotton Shirt Blue',
            'quantity' => 5,
            'unit' => 'PCS',
            'rate' => 200,
            'tax_rate' => 5,
            'amount' => 1050,
        ]);

        $response = $this->actingAs($user)->post(route('quotations.convert', $quotation->id));
        $response->assertRedirect(route('invoices.index'));

        // Refresh models
        $quotation->refresh();
        $inventory->refresh();

        $this->assertSame('Converted', $quotation->status);
        $this->assertNotNull($quotation->converted_invoice_id);

        $invoice = Invoice::with('items')->find($quotation->converted_invoice_id);
        $this->assertNotNull($invoice);
        $this->assertSame('Unpaid', $invoice->status);
        $this->assertSame(0.0, (float) $invoice->paid_amount);

        // Inventory should have decremented from 50 to 45
        $this->assertSame(45.0, (float) $inventory->qty);
        $this->assertSame($inventory->id, $invoice->items[0]->inventory_id);
    }

    public function test_invoice_update_restores_old_stock_before_applying_new_quantities(): void
    {
        $user = User::factory()->create();
        $inventory = Inventory::create([
            'user_id' => $user->id,
            'code' => 'SKU-FT-01',
            'item' => 'Formal Trousers',
            'qty' => 20,
            'unit' => 'PCS',
            'selling_price' => 1000,
        ]);

        // Create initial invoice with 4 units
        $response = $this->actingAs($user)->post(route('invoices.store'), [
            'invoice_number' => 'INV-' . date('Y') . '-0001',
            'invoice_date' => date('Y-m-d'),
            'customer_name' => 'Jane Doe',
            'seller_name' => 'Vama Store',
            'status' => 'Paid',
            'tax_type' => 'intra_state',
            'items' => [
                [
                    'inventory_id' => $inventory->id,
                    'item_name' => 'Formal Trousers',
                    'quantity' => 4,
                    'rate' => 1000,
                    'gst_rate' => 5,
                ],
            ],
        ]);
        $response->assertSessionHasNoErrors();

        $inventory->refresh();
        // Initial stock 20 - 4 = 16
        $this->assertSame(16.0, (float) $inventory->qty);

        $invoice = Invoice::where('user_id', $user->id)->firstOrFail();

        // Now update invoice to 6 units
        $response = $this->actingAs($user)->put(route('invoices.update', $invoice->id), [
            'invoice_number' => $invoice->invoice_number,
            'invoice_date' => date('Y-m-d'),
            'customer_name' => 'Jane Doe',
            'seller_name' => 'Vama Store',
            'status' => 'Paid',
            'tax_type' => 'intra_state',
            'items' => [
                [
                    'inventory_id' => $inventory->id,
                    'item_name' => 'Formal Trousers',
                    'quantity' => 6,
                    'rate' => 1000,
                    'gst_rate' => 5,
                ],
            ],
        ]);
        $response->assertSessionHasNoErrors();

        $inventory->refresh();
        // Correct stock after update: 20 - 6 = 14 (NOT 20 - 4 - 6 = 10!)
        $this->assertSame(14.0, (float) $inventory->qty);
    }

    public function test_duplicate_invoice_number_is_rejected_by_validation(): void
    {
        $user = User::factory()->create();

        Invoice::create([
            'user_id' => $user->id,
            'invoice_number' => 'INV-TEST-DUP-01',
            'invoice_date' => date('Y-m-d'),
            'status' => 'Paid',
            'seller_name' => 'Store',
            'customer_name' => 'Customer A',
        ]);

        $response = $this->actingAs($user)->post(route('invoices.store'), [
            'invoice_number' => 'INV-TEST-DUP-01',
            'invoice_date' => date('Y-m-d'),
            'customer_name' => 'Customer B',
            'seller_name' => 'Store',
            'items' => [
                [
                    'item_name' => 'Item X',
                    'quantity' => 1,
                    'rate' => 100,
                ],
            ],
        ]);

        $response->assertSessionHasErrors('invoice_number');
    }
}
