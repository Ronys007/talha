<?php

use App\Models\Invoice;
use App\Models\User;

test('invoice sequential numbering is collision-proof per user', function () {
    $user = User::factory()->create();
    $year = date('Y');

    $firstNum = Invoice::generateNextNumber($user->id);
    expect($firstNum)->toBe("INV-{$year}-0001");

    // Create an invoice with this number
    $inv1 = Invoice::create([
        'user_id' => $user->id,
        'invoice_number' => $firstNum,
        'invoice_date' => now()->toDateString(),
        'customer_name' => 'Test Customer 1',
        'seller_name' => 'Store',
        'total_amount' => 100,
    ]);

    $secondNum = Invoice::generateNextNumber($user->id);
    expect($secondNum)->toBe("INV-{$year}-0002");

    $inv2 = Invoice::create([
        'user_id' => $user->id,
        'invoice_number' => $secondNum,
        'invoice_date' => now()->toDateString(),
        'customer_name' => 'Test Customer 2',
        'seller_name' => 'Store',
        'total_amount' => 200,
    ]);

    // Check that invoice_hash is automatically generated with 24 characters
    expect($inv1->invoice_hash)->not->toBeEmpty();
    expect(strlen($inv1->invoice_hash))->toBe(24);
    expect($inv2->invoice_hash)->not->toBeEmpty();
    expect(strlen($inv2->invoice_hash))->toBe(24);
    expect($inv1->invoice_hash)->not->toBe($inv2->invoice_hash);
});
