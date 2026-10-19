<?php

namespace Tests\Feature;

use App\Models\PurchaseOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PurchaseTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_saves_a_purchase_order_with_its_bill_image_and_decimal_item_quantity(): void
    {
        Storage::fake('public');

        $bill = UploadedFile::fake()->create('supplier-bill.jpg', 1024, 'image/jpeg');
        $this->actingAs(User::factory()->create())
            ->post(route('purchase.store'), [
                'po_number' => 'PO-TEST-1001',
                'supplier_name' => 'Test Supplier',
                'order_date' => '2026-10-04',
                'status' => 'Pending',
                'total_amount' => '25.50',
                'items' => [
                    [
                        'description' => 'Test item',
                        'hsn_sac' => '1234',
                        'quantity' => '1.500',
                        'rate' => '17.00',
                        'per' => 'PC',
                        'discount_percent' => '0',
                        'amount' => '25.50',
                    ],
                ],
                'bill_file' => $bill,
            ]);

        $order = PurchaseOrder::with('items')->where('po_number', 'PO-TEST-1001')->firstOrFail();

        $this->assertNotEmpty($order->bill_file);
        $this->assertSame('PUR-' . str_pad((string) $order->id, 6, '0', STR_PAD_LEFT), $order->purchase_number);
        $this->assertCount(1, $order->items);
        $this->assertSame(1.5, (float) $order->items[0]->quantity);
        Storage::disk('public')->assertExists($order->bill_file);
    }
}
