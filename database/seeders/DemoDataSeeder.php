<?php

namespace Database\Seeders;

use App\Models\BusinessProfile;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\Invoice;
use App\Models\PurchaseOrder;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('SUPERADMIN_EMAIL', 'ronysinghb2b@vamalabs.in');
        $user = User::where('email', $email)->where('role', 'super_admin')->first();

        if (!$user) {
            throw new RuntimeException('Create or configure the Super Admin account before adding demo data.');
        }

        DB::transaction(function () use ($user): void {
            BusinessProfile::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'business_name' => 'Demo Trading Company',
                    'address' => '100 Market Road',
                    'city' => 'Pune',
                    'state' => 'Maharashtra',
                    'pincode' => '411001',
                    'gst_number' => '27AABCU9603R1ZM',
                    'phone' => '9000000001',
                    'email' => 'demo-business@example.test',
                    'terms_and_conditions' => 'Demo data only.',
                ]
            );

            $customer = Customer::firstOrCreate(
                ['user_id' => $user->id, 'email' => 'demo-customer@example.test'],
                [
                    'name' => 'Aarav Demo Stores',
                    'address' => '25 Sample Street',
                    'city' => 'Pune',
                    'state' => 'Maharashtra',
                    'pincode' => '411002',
                    'gst_number' => '27AABCU9603R1ZN',
                    'phone' => '9000000002',
                ]
            );

            $products = [];
            foreach ([
                ['DEMO-001', 'Demo Office Chair', 18, 'PCS', 2400],
                ['DEMO-002', 'Demo LED Desk Lamp', 35, 'PCS', 850],
                ['DEMO-003', 'Demo A4 Paper Ream', 50, 'PCS', 320],
            ] as [$code, $name, $quantity, $unit, $price]) {
                $products[$code] = Inventory::firstOrCreate(
                    ['user_id' => $user->id, 'code' => $code],
                    [
                        'mode' => 'standard',
                        'item' => $name,
                        'qty' => $quantity,
                        'unit' => $unit,
                        'selling_price' => $price,
                    ]
                );
            }

            $invoiceRows = [
                [
                    'number' => 'DEMO-INV-001',
                    'date' => now()->subDays(2),
                    'due' => now()->addDays(28),
                    'status' => 'Paid',
                    'customer' => 'Aarav Demo Stores',
                    'product' => 'DEMO-001',
                    'quantity' => 1,
                    'rate' => 2400,
                    'taxable' => 2400,
                    'cgst' => 216,
                    'sgst' => 216,
                    'total' => 2832,
                    'paid' => 2832,
                ],
                [
                    'number' => 'DEMO-INV-002',
                    'date' => now()->subDay(),
                    'due' => now()->addDays(29),
                    'status' => 'Unpaid',
                    'customer' => 'Northstar Demo Supplies',
                    'product' => 'DEMO-002',
                    'quantity' => 2,
                    'rate' => 850,
                    'taxable' => 1700,
                    'cgst' => 153,
                    'sgst' => 153,
                    'total' => 2006,
                    'paid' => 0,
                ],
            ];

            foreach ($invoiceRows as $row) {
                $invoice = Invoice::firstOrCreate(
                    ['user_id' => $user->id, 'invoice_number' => $row['number']],
                    [
                        'invoice_date' => $row['date']->toDateString(),
                        'due_date' => $row['due']->toDateString(),
                        'status' => $row['status'],
                        'tax_type' => 'intra_state',
                        'seller_name' => 'Demo Trading Company',
                        'seller_address' => '100 Market Road, Pune, Maharashtra 411001',
                        'seller_gst_number' => '27AABCU9603R1ZM',
                        'seller_phone' => '9000000001',
                        'seller_state' => 'Maharashtra',
                        'customer_name' => $row['customer'],
                        'customer_address' => '25 Sample Street, Pune',
                        'customer_gst_number' => '27AABCU9603R1ZN',
                        'customer_phone' => '9000000002',
                        'customer_state' => 'Maharashtra',
                        'place_of_supply' => 'Maharashtra',
                        'subtotal' => $row['taxable'],
                        'gross_discount' => 0,
                        'total_discount' => 0,
                        'taxable_amount' => $row['taxable'],
                        'cgst_amount' => $row['cgst'],
                        'sgst_amount' => $row['sgst'],
                        'igst_amount' => 0,
                        'total_tax' => $row['cgst'] + $row['sgst'],
                        'round_off' => 0,
                        'total_amount' => $row['total'],
                        'paid_amount' => $row['paid'],
                        'notes' => 'DEMO DATA — sample invoice for testing.',
                        'terms' => 'Demo data only.',
                    ]
                );

                if ($invoice->wasRecentlyCreated) {
                    $inventory = $products[$row['product']];
                    $invoice->items()->create([
                        'inventory_id' => $inventory->id,
                        'item_name' => $inventory->item,
                        'hsn_sac' => '9403',
                        'quantity' => $row['quantity'],
                        'unit' => $inventory->unit,
                        'rate' => $row['rate'],
                        'discount_percent' => 0,
                        'discount_amount' => 0,
                        'taxable_value' => $row['taxable'],
                        'gst_rate' => 18,
                        'cgst_rate' => 9,
                        'cgst_amount' => $row['cgst'],
                        'sgst_rate' => 9,
                        'sgst_amount' => $row['sgst'],
                        'igst_rate' => 0,
                        'igst_amount' => 0,
                        'total_amount' => $row['total'],
                    ]);
                }
            }

            $purchase = PurchaseOrder::firstOrCreate(
                ['user_id' => $user->id, 'po_number' => 'DEMO-PO-001'],
                [
                    'supplier_name' => 'Sample Wholesale Supplier',
                    'supplier_phone' => '9000000003',
                    'gst_number' => '27AABCU9603R1ZP',
                    'tax_rate' => 18,
                    'subtotal' => 5000,
                    'gross_discount' => 0,
                    'cgst' => 450,
                    'sgst' => 450,
                    'igst' => 0,
                    'total_gst' => 900,
                    'round_off' => 0,
                    'order_date' => now()->subDays(3)->toDateString(),
                    'due_date' => now()->addDays(27)->toDateString(),
                    'status' => 'Pending',
                    'is_inventory_synced' => false,
                    'total_amount' => 5900,
                    'paid_amount' => 0,
                    'notes' => 'DEMO DATA — sample purchase order for testing.',
                ]
            );

            if ($purchase->wasRecentlyCreated) {
                $purchase->items()->create([
                    'description' => 'Demo Office Chair',
                    'hsn_sac' => '9403',
                    'quantity' => 2,
                    'rate' => 2500,
                    'per' => 'PCS',
                    'discount_percent' => 0,
                    'discount_amount' => 0,
                    'amount' => 5000,
                ]);
            }
        });

        $this->command?->info('Demo data is ready: 3 inventory items, 2 sales invoices, 1 purchase order, and 1 customer.');
    }
}
