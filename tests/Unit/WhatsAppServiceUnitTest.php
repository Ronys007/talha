<?php

use App\Services\WhatsAppService;

test('phone number formatting correctly converts to Indian international format', function () {
    $service = app(WhatsAppService::class);

    // 10 digits
    expect($service->formatPhoneNumber('9876543210'))->toBe('919876543210');
    expect($service->formatPhoneNumber('+91 98765-43210'))->toBe('919876543210');

    // 11 digits with leading 0
    expect($service->formatPhoneNumber('09876543210'))->toBe('919876543210');

    // Already 91 prefixed
    expect($service->formatPhoneNumber('919876543210'))->toBe('919876543210');
});

test('UPI payment URL generation creates valid deep links', function () {
    $service = app(WhatsAppService::class);

    $url = $service->generateUpiPayUrl(
        upiId: 'merchant@upi',
        merchantName: 'Vama Enterprises',
        amount: 1499.50,
        invoiceNo: 'INV-2026-0001'
    );

    expect($url)->toContain('upi://pay?');
    expect($url)->toContain('pa=merchant@upi');
    expect($url)->toContain('pn=Vama%20Enterprises');
    expect($url)->toContain('am=1499.50');
    expect($url)->toContain('cu=INR');

    // Empty UPI ID returns empty string
    expect($service->generateUpiPayUrl('', 'Store', 100))->toBe('');
});

test('WhatsApp template rendering correctly replaces all placeholders', function () {
    $service = app(WhatsAppService::class);

    $template = "Hello {customer_name}, your bill #{invoice_no} of Rs {total_amount} is due on {due_date}. Balance: Rs {balance_due}. Store: {shop_name}.";
    $data = [
        'customer_name' => 'Alice Sharma',
        'invoice_no' => 'INV-2026-0042',
        'total_amount' => '2,500.00',
        'due_date' => '2026-11-01',
        'balance_due' => '1,000.00',
        'shop_name' => 'Vama Jewels',
    ];

    $rendered = $service->renderTemplate($template, $data);

    expect($rendered)->toContain('Alice Sharma');
    expect($rendered)->toContain('INV-2026-0042');
    expect($rendered)->toContain('2,500.00');
    expect($rendered)->toContain('1,000.00');
    expect($rendered)->toContain('Vama Jewels');
    expect($rendered)->toContain('01 Nov 2026');
});
