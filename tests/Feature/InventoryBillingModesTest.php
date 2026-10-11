<?php

use App\Models\Inventory;
use App\Models\Order;
use App\Models\User;

test('admin can manage inventory and 12-item bills in both modes', function () {
    $admin = User::factory()->create([
        'email' => 'admin@gmail.com',
        'role' => 'admin',
    ]);

    $this->actingAs($admin);

    $this->get('/inventory')->assertOk();
    $this->get('/billing')->assertOk();

    foreach (['standard', 'barcode'] as $mode) {
        $prefix = $mode === 'standard' ? 'STD' : 'BAR';
        $inventoryIds = [];
        $billItems = [];

        for ($index = 1; $index <= 12; $index++) {
            $code = sprintf('%s-TEST-%02d', $prefix, $index);
            $itemName = sprintf('%s Test Item %02d', ucfirst($mode), $index);

            $this->post('/inventory', [
                'mode' => $mode,
                'item' => $itemName,
                'code' => $code,
                'qty' => 10,
                'selling_price' => 100,
            ])->assertSessionHas('success');

            $inventory = Inventory::query()
                ->where('user_id', $admin->id)
                ->where('mode', $mode)
                ->where('code', $code)
                ->firstOrFail();

            $inventoryIds[] = $inventory->id;
            $billItems[] = [
                'code' => $code,
                'item_name' => $itemName,
                'quantity' => 2,
                'selling_price' => 100,
                'discount_percent' => 0,
            ];
        }

        $this->getJson("/inventory/data?mode={$mode}")
            ->assertOk()
            ->assertJsonCount(12, 'data')
            ->assertJsonPath('data.0.mode', $mode);

        $this->getJson("/inventory/check-name?mode={$mode}&name=" . urlencode(ucfirst($mode) . ' Test Item 01'))
            ->assertOk()
            ->assertJsonPath('exists', true)
            ->assertJsonStructure(['unique_code']);

        $this->post("/inventory/{$inventoryIds[0]}", [
            'mode' => $mode,
            'item' => ucfirst($mode) . ' Updated Item 01',
            'code' => $prefix . '-TEST-01',
            'qty' => 10,
            'selling_price' => 100,
        ])->assertSessionHas('success');

        $this->getJson("/billing/search?mode={$mode}&query=" . urlencode($prefix . '-TEST-01'))
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.code', $prefix . '-TEST-01');

        $createResponse = $this->postJson('/billing', [
            'mode' => $mode,
            'customer' => ucfirst($mode) . ' Test Customer',
            'total_price' => 2400,
            'items' => $billItems,
        ])->assertOk()
            ->assertJsonPath('success', true);

        $orderId = $createResponse->json('id');
        $order = Order::with('items')->findOrFail($orderId);

        expect($order->mode)->toBe($mode)
            ->and($order->items)->toHaveCount(12)
            ->and($order->items->pluck('mode')->unique()->all())->toBe([$mode]);

        foreach ($inventoryIds as $inventoryId) {
            expect((float) Inventory::findOrFail($inventoryId)->qty)->toBe(8.0);
        }

        $this->getJson("/billing/data?mode={$mode}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.mode', $mode)
            ->assertJsonPath('data.0.items_count', 12);

        $updatedItems = array_map(function (array $item): array {
            $item['quantity'] = 3;

            return $item;
        }, $billItems);

        $this->postJson("/billing/{$orderId}", [
            'customer' => ucfirst($mode) . ' Updated Customer',
            'total_price' => 3600,
            'items' => $updatedItems,
        ])->assertOk()
            ->assertJsonPath('success', true);

        $order->refresh()->load('items');
        expect($order->customer)->toBe(ucfirst($mode) . ' Updated Customer')
            ->and($order->items)->toHaveCount(12)
            ->and((float) $order->total_price)->toBe(3600.0);

        foreach ($inventoryIds as $inventoryId) {
            expect((float) Inventory::findOrFail($inventoryId)->qty)->toBe(7.0);
        }

        $this->deleteJson("/billing/{$orderId}")
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('order_b_s', ['id' => $orderId]);
        foreach ($inventoryIds as $inventoryId) {
            expect((float) Inventory::findOrFail($inventoryId)->qty)->toBe(10.0);
        }

        $this->delete("/inventory/{$inventoryIds[0]}")
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('inventory_b_s', ['id' => $inventoryIds[0]]);
        $this->getJson("/inventory/data?mode={$mode}")
            ->assertOk()
            ->assertJsonCount(11, 'data');
    }
});
