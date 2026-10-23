<?php

namespace Tests\Feature;

use App\Models\BusinessProfile;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\Invoice;
use App\Models\PurchaseOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DataImportTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
        ]);

        BusinessProfile::create([
            'user_id' => $this->admin->id,
            'business_name' => 'Test Business',
            'state' => 'Maharashtra',
            'gst_number' => '27ABCDE1234F1Z5',
        ]);
    }

    public function test_inventory_template_download()
    {
        $response = $this->actingAs($this->admin)->get('/inventory/import/template');
        $response->assertStatus(200);
        $this->assertStringContainsString('Item Name', $response->streamedContent());
    }

    public function test_inventory_import_creates_and_updates_items()
    {
        $payload = [
            'mode' => 'standard',
            'duplicate_action' => 'update',
            'items' => [
                [
                    'item' => 'Logitech Wireless Mouse',
                    'code' => 'M-100',
                    'qty' => 50,
                    'unit' => 'PCS',
                    'selling_price' => 499.00,
                ],
                [
                    'item' => 'USB Keyboard',
                    'code' => '', // should auto-generate
                    'qty' => 20,
                    'unit' => 'PCS',
                    'selling_price' => 750.00,
                ],
            ],
        ];

        $response = $this->actingAs($this->admin)->postJson('/inventory/import', $payload);
        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'summary' => [
                'created' => 2,
                'updated' => 0,
                'skipped' => 0,
            ],
        ]);

        $this->assertDatabaseHas('inventory_b_s', [
            'user_id' => $this->admin->id,
            'item' => 'Logitech Wireless Mouse',
            'code' => 'M-100',
            'qty' => 50,
        ]);

        // Now test updating duplicate
        $updatePayload = [
            'mode' => 'standard',
            'duplicate_action' => 'update',
            'items' => [
                [
                    'item' => 'Logitech Wireless Mouse',
                    'qty' => 25,
                    'unit' => 'PCS',
                    'selling_price' => 550.00,
                ],
            ],
        ];

        $updateResponse = $this->actingAs($this->admin)->postJson('/inventory/import', $updatePayload);
        $updateResponse->assertStatus(200);
        $updateResponse->assertJson([
            'success' => true,
            'summary' => [
                'created' => 0,
                'updated' => 1,
            ],
        ]);

        $this->assertDatabaseHas('inventory_b_s', [
            'user_id' => $this->admin->id,
            'item' => 'Logitech Wireless Mouse',
            'qty' => 75, // 50 + 25
            'selling_price' => 550.00,
        ]);
    }

    public function test_purchase_template_download()
    {
        $response = $this->actingAs($this->admin)->get('/purchase/import/template');
        $response->assertStatus(200);
        $this->assertStringContainsString('Bill Number', $response->streamedContent());
    }

    public function test_purchase_import_creates_orders_and_syncs_inventory()
    {
        $payload = [
            'sync_inventory' => true,
            'duplicate_action' => 'skip',
            'orders' => [
                [
                    'po_number' => 'BILL-2026-99',
                    'supplier_name' => 'Supreme Distributors',
                    'gst_number' => '27AAACS1234E1Z1',
                    'supplier_phone' => '9876543210',
                    'order_date' => '2026-10-20',
                    'tax_rate' => 18,
                    'status' => 'Received',
                    'items' => [
                        [
                            'description' => 'HDMI Cable 2m',
                            'hsn_sac' => '8544',
                            'quantity' => 10,
                            'rate' => 150,
                            'per' => 'PCS',
                        ],
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($this->admin)->postJson('/purchase/import', $payload);
        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'summary' => [
                'created' => 1,
            ],
        ]);

        $this->assertDatabaseHas('purchase_orders', [
            'user_id' => $this->admin->id,
            'po_number' => 'BILL-2026-99',
            'supplier_name' => 'Supreme Distributors',
            'is_inventory_synced' => true,
        ]);

        // Check stock was added to inventory
        $this->assertDatabaseHas('inventory_b_s', [
            'user_id' => $this->admin->id,
            'item' => 'HDMI Cable 2m',
            'qty' => 10,
        ]);
    }

    public function test_invoices_template_download()
    {
        $response = $this->actingAs($this->admin)->get('/invoices/import/template');
        $response->assertStatus(200);
        $this->assertStringContainsString('Invoice Number', $response->streamedContent());
    }

    public function test_invoices_import_creates_invoice_and_customer()
    {
        $payload = [
            'sync_inventory' => false,
            'create_customers' => true,
            'duplicate_action' => 'skip',
            'invoices' => [
                [
                    'invoice_number' => 'INV-IMP-001',
                    'invoice_date' => '2026-10-22',
                    'customer_name' => 'Kailash Enterprises',
                    'customer_phone' => '9988776655',
                    'customer_gst_number' => '27XYZAB9876C1Z3',
                    'customer_address' => 'Andheri West, Mumbai',
                    'place_of_supply' => 'Maharashtra',
                    'status' => 'Paid',
                    'items' => [
                        [
                            'item_name' => 'Custom Branding Stamp',
                            'hsn_sac' => '9611',
                            'quantity' => 2,
                            'rate' => 450,
                            'unit' => 'PCS',
                            'gst_rate' => 18,
                        ],
                    ],
                ],
            ],
        ];

        $response = $this->actingAs($this->admin)->postJson('/invoices/import', $payload);
        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'summary' => [
                'created' => 1,
                'customers_created' => 1,
            ],
        ]);

        $this->assertDatabaseHas('invoices', [
            'user_id' => $this->admin->id,
            'invoice_number' => 'INV-IMP-001',
            'customer_name' => 'Kailash Enterprises',
            'status' => 'Paid',
        ]);

        $this->assertDatabaseHas('customers', [
            'user_id' => $this->admin->id,
            'name' => 'Kailash Enterprises',
            'phone' => '9988776655',
        ]);
    }
}
