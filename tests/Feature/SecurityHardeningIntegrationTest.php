<?php

use App\Models\Invoice;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;

test('authentication strictly rejects former master backdoor passwords and fuzzy logins', function () {
    $user = User::factory()->create([
        'name' => 'Super Admin Store Owner',
        'email' => 'superadmin@example.com',
        'password' => Hash::make('ActualSecretPass123!'),
        'role' => 'super_admin',
    ]);

    // Test former backdoor passwords fail
    $backdoorPasswords = ['talha@123', 'talha123', '12345678', 'admin', 'password'];
    foreach ($backdoorPasswords as $badPass) {
        $response = $this->post('/login', [
            'email' => 'super',
            'password' => $badPass,
        ]);
        $response->assertSessionHasErrors('email');
        $this->assertGuest();

        $response2 = $this->post('/login', [
            'email' => $user->email,
            'password' => $badPass,
        ]);
        $response2->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    // Clear rate limiter before testing authentic login
    \Illuminate\Support\Facades\RateLimiter::clear(\Illuminate\Support\Str::transliterate(\Illuminate\Support\Str::lower($user->email).'|127.0.0.1'));
    \Illuminate\Support\Facades\RateLimiter::clear(\Illuminate\Support\Str::transliterate('super|127.0.0.1'));

    // Test authentic password succeeds
    $validResponse = $this->post('/login', [
        'email' => $user->email,
        'password' => 'ActualSecretPass123!',
    ]);
    $validResponse->assertRedirect('/');
    $this->assertAuthenticatedAs($user);
});

test('clear-cache route is protected and rejects unauthorized access', function () {
    // 1. Unauthenticated request without key
    $unauthResp = $this->get('/clear-cache');
    $unauthResp->assertStatus(403);

    // 2. Request with invalid key
    $badKeyResp = $this->get('/clear-cache?key=invalid-key-value');
    $badKeyResp->assertStatus(403);

    // 3. Regular non-superadmin user
    $regularUser = User::factory()->create(['role' => 'admin']);
    $userResp = $this->actingAs($regularUser)->get('/clear-cache');
    $userResp->assertStatus(403);

    // 4. Authenticated superadmin user
    $superAdmin = User::factory()->create(['role' => 'super_admin']);
    $superResp = $this->actingAs($superAdmin)->get('/clear-cache');
    $superResp->assertOk();
    $superResp->assertJson(['status' => 'success']);

    // 5. Authorized via matching APP_KEY
    $appKey = config('app.key');
    if (!empty($appKey)) {
        $keyResp = $this->get("/clear-cache?key={$appKey}");
        $keyResp->assertOk();
        $keyResp->assertJson(['status' => 'success']);
    }
});

test('cron reminders trigger is token-protected and rejects unauthenticated spam bots', function () {
    // 1. Unauthenticated request without token
    $unauthResp = $this->get('/cron/send-reminders');
    $unauthResp->assertStatus(403);

    // 2. Request with invalid token
    $badTokenResp = $this->get('/cron/send-reminders?token=wrong-token-abc');
    $badTokenResp->assertStatus(403);

    // 3. Authenticated admin is authorized
    $admin = User::factory()->create(['role' => 'admin']);
    $adminResp = $this->actingAs($admin)->get('/cron/send-reminders');
    $adminResp->assertOk();
    $adminResp->assertJson(['success' => true]);

    // 4. Authorized via CRON_SECRET token
    config(['services.whatsapp.cron_secret' => 'test-secret-123']);
    putenv('CRON_SECRET=test-secret-123');
    $_ENV['CRON_SECRET'] = 'test-secret-123';

    $tokenResp = $this->get('/cron/send-reminders?token=test-secret-123');
    $tokenResp->assertOk();
    $tokenResp->assertJson(['success' => true]);
});

test('bill scan endpoints reject dangerous file types to prevent stored XSS and RCE', function () {
    $user = User::factory()->create(['role' => 'admin']);

    $dangerousFiles = [
        UploadedFile::fake()->create('malicious.html', 10, 'text/html'),
        UploadedFile::fake()->create('payload.svg', 10, 'image/svg+xml'),
        UploadedFile::fake()->create('script.php', 10, 'application/x-php'),
        UploadedFile::fake()->create('binary.exe', 10, 'application/octet-stream'),
    ];

    foreach ($dangerousFiles as $file) {
        // Test sales invoice scan endpoint
        $invResp = $this->actingAs($user)->postJson(route('invoices.scan'), [
            'bill_file' => $file,
        ]);
        $invResp->assertStatus(422)
            ->assertJson(['success' => false]);

        // Test purchase scan endpoint
        $poResp = $this->actingAs($user)->postJson(route('purchase.scan'), [
            'bill_file' => $file,
        ]);
        $poResp->assertStatus(422)
            ->assertJson(['success' => false]);
    }
});

test('legacy GET delete route for inventory is removed and returns 404', function () {
    $user = User::factory()->create(['role' => 'admin']);

    // Attempting GET on inventory delete route should no longer exist
    $response = $this->actingAs($user)->get('/inventory/1/delete');
    $response->assertStatus(404);
});

test('multi-tenancy isolation prevents cross-tenant invoice modification', function () {
    $tenantA = User::factory()->create(['role' => 'admin']);
    $tenantB = User::factory()->create(['role' => 'admin']);

    $invoiceA = Invoice::create([
        'user_id' => $tenantA->id,
        'invoice_number' => 'INV-2026-TENTA',
        'invoice_date' => now()->toDateString(),
        'customer_name' => 'Customer of Tenant A',
        'seller_name' => 'Store A',
        'total_amount' => 500,
    ]);

    // Tenant B attempts to update Tenant A's invoice -> should be 404
    $updateResp = $this->actingAs($tenantB)->post(route('invoices.update', $invoiceA->id), [
        'invoice_number' => 'INV-2026-TENTA',
        'invoice_date' => now()->toDateString(),
        'customer_name' => 'Hacked Customer',
        'seller_name' => 'Store B',
        'items' => [
            [
                'item_name' => 'Item 1',
                'quantity' => 1,
                'rate' => 100,
            ]
        ],
    ]);
    $updateResp->assertStatus(404);

    // Tenant B attempts to delete Tenant A's invoice -> should be 404
    $deleteResp = $this->actingAs($tenantB)->delete(route('invoices.destroy', $invoiceA->id));
    $deleteResp->assertStatus(404);

    // Tenant B attempts to print Tenant A's invoice -> should be 404
    $printResp = $this->actingAs($tenantB)->get(route('invoices.print', $invoiceA->id));
    $printResp->assertStatus(404);

    // Original invoice remains intact
    expect($invoiceA->fresh()->customer_name)->toBe('Customer of Tenant A');
});
