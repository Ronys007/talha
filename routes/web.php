<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\InventoryController;

// Redirect root to dashboard or login
Route::match(['get', 'post'], '/', function () {
    return auth()->check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
});

Route::middleware('auth')->group(function () {

    // ==================== Home / Dashboard ====================
    Route::match(['get', 'post'], '/dashboard', [HomeController::class, 'index'])->name('dashboard');
    Route::get('/home', fn () => redirect()->route('dashboard'))->name('home');
    Route::match(['get', 'post'], '/dashboard/stats', [HomeController::class, 'stats'])->name('home.stats');

    // ==================== Purchase Management ====================
    Route::get('/purchase', [\App\Http\Controllers\PurchaseController::class, 'index'])->name('purchase.index');
    Route::post('/purchase/scan', [\App\Http\Controllers\PurchaseController::class, 'scan'])->name('purchase.scan');
    Route::post('/purchase', [\App\Http\Controllers\PurchaseController::class, 'store'])->name('purchase.store');
    Route::match(['post', 'put', 'patch'], '/purchase/{id}', [\App\Http\Controllers\PurchaseController::class, 'update'])->name('purchase.update');
    Route::delete('/purchase/{id}', [\App\Http\Controllers\PurchaseController::class, 'destroy'])->name('purchase.destroy');
    Route::patch('/purchase/{id}/status', [\App\Http\Controllers\PurchaseController::class, 'updateStatus'])->name('purchase.update-status');

    // ==================== Quotations & Delivery / Driver Challan (Vyapar style) ====================
    Route::get('/quotations', [\App\Http\Controllers\QuotationController::class, 'index'])->name('quotations.index');
    Route::post('/quotations', [\App\Http\Controllers\QuotationController::class, 'store'])->name('quotations.store');
    Route::match(['post', 'put', 'patch'], '/quotations/{id}', [\App\Http\Controllers\QuotationController::class, 'update'])->name('quotations.update');
    Route::delete('/quotations/{id}', [\App\Http\Controllers\QuotationController::class, 'destroy'])->name('quotations.destroy');
    Route::post('/quotations/{id}/convert-to-invoice', [\App\Http\Controllers\QuotationController::class, 'convertToInvoice'])->name('quotations.convert');
    Route::post('/delivery-challans', [\App\Http\Controllers\QuotationController::class, 'storeChallan'])->name('challans.store');
    Route::match(['post', 'put', 'patch'], '/delivery-challans/{id}', [\App\Http\Controllers\QuotationController::class, 'updateChallan'])->name('challans.update');
    Route::delete('/delivery-challans/{id}', [\App\Http\Controllers\QuotationController::class, 'destroyChallan'])->name('challans.destroy');

    // ==================== Margin & Bill Markup (Vyapar style) ====================
    Route::get('/margin', [\App\Http\Controllers\MarginController::class, 'index'])->name('margin.index');
    Route::post('/margin/create-quotation', [\App\Http\Controllers\MarginController::class, 'createQuotationFromMargin'])->name('margin.create-quotation');
    Route::post('/margin/update-item-price', [\App\Http\Controllers\MarginController::class, 'updateInventoryItemPrice'])->name('margin.update-item-price');

    // ==================== Sales Reminders (Customer Payment Reminders) ====================
    Route::get('/sales-reminders', [\App\Http\Controllers\PaymentReminderController::class, 'index'])->name('sales-reminders.index');
    Route::post('/sales-reminders/record-payment', [\App\Http\Controllers\PaymentReminderController::class, 'recordPayment'])->name('sales-reminders.record-payment');
    Route::post('/sales-reminders/mark-as-paid', [\App\Http\Controllers\PaymentReminderController::class, 'markAsPaid'])->name('sales-reminders.mark-as-paid');
    Route::post('/sales-reminders/update-due-date', [\App\Http\Controllers\PaymentReminderController::class, 'updateDueDate'])->name('sales-reminders.update-due-date');
    Route::get('/payment-reminders', [\App\Http\Controllers\PaymentReminderController::class, 'index'])->name('reminders.index');
    Route::post('/payment-reminders/record-payment', [\App\Http\Controllers\PaymentReminderController::class, 'recordPayment'])->name('reminders.record-payment');
    Route::post('/payment-reminders/mark-as-paid', [\App\Http\Controllers\PaymentReminderController::class, 'markAsPaid'])->name('reminders.mark-as-paid');
    Route::post('/payment-reminders/update-due-date', [\App\Http\Controllers\PaymentReminderController::class, 'updateDueDate'])->name('reminders.update-due-date');

    // ==================== Purchase Reminders (Supplier Payment Reminders) ====================
    Route::get('/purchase-reminders', [\App\Http\Controllers\PurchaseReminderController::class, 'index'])->name('purchase-reminders.index');
    Route::post('/purchase-reminders/record-payment', [\App\Http\Controllers\PurchaseReminderController::class, 'recordPayment'])->name('purchase-reminders.record-payment');
    Route::post('/purchase-reminders/mark-as-paid', [\App\Http\Controllers\PurchaseReminderController::class, 'markAsPaid'])->name('purchase-reminders.mark-as-paid');
    Route::post('/purchase-reminders/update-due-date', [\App\Http\Controllers\PurchaseReminderController::class, 'updateDueDate'])->name('purchase-reminders.update-due-date');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // ==================== Tax Invoices (Sales) ====================
    Route::get('/invoices', [\App\Http\Controllers\InvoiceController::class, 'index'])->name('invoices.index');
    Route::post('/invoices/scan', [\App\Http\Controllers\InvoiceController::class, 'scan'])->name('invoices.scan');
    Route::get('/invoices/search-inventory', [\App\Http\Controllers\InvoiceController::class, 'searchInventory'])->name('invoices.search-inventory');
    Route::post('/invoices', [\App\Http\Controllers\InvoiceController::class, 'store'])->name('invoices.store');
    Route::match(['post', 'put', 'patch'], '/invoices/{id}', [\App\Http\Controllers\InvoiceController::class, 'update'])->name('invoices.update');
    Route::delete('/invoices/{id}', [\App\Http\Controllers\InvoiceController::class, 'destroy'])->name('invoices.destroy');
    Route::delete('/customers/{id}', [\App\Http\Controllers\InvoiceController::class, 'destroyCustomer'])->name('customers.destroy');
    Route::get('/invoices/{id}/print', [\App\Http\Controllers\InvoiceController::class, 'print'])->name('invoices.print');

    // ==================== Admin Only Routes ====================
    Route::middleware('admin')->group(function () {
        // Inventory Management
        Route::get('/inventory', [InventoryController::class, 'index'])->name('inventory.index');
        Route::get('/inventory/data', [InventoryController::class, 'data'])->name('inventory.data');
        Route::get('/inventory/check-name', [InventoryController::class, 'checkName'])->name('inventory.check-name');
        Route::post('/inventory', [InventoryController::class, 'store'])->name('inventory.store');
        Route::match(['post', 'put', 'patch'], '/inventory/{id}', [InventoryController::class, 'update'])->name('inventory.update');
        Route::delete('/inventory/{id}', [InventoryController::class, 'destroy'])->name('inventory.destroy');

        // Legacy Routes (backward compat)
        Route::get('/inventoryB', [InventoryController::class, 'index']);
        Route::get('/inventory/{id}/delete', [InventoryController::class, 'legacyDelete']);
    });

    // ==================== Super Admin Routes ====================
    Route::middleware('auth')->group(function () {
        Route::get('/super-admin', [\App\Http\Controllers\SuperAdminController::class, 'index'])->name('superadmin.index');
        Route::post('/super-admin/switch-admin', [\App\Http\Controllers\SuperAdminController::class, 'switchAdmin'])->name('superadmin.switch');
        Route::post('/super-admin/admin', [\App\Http\Controllers\SuperAdminController::class, 'storeAdmin'])->name('superadmin.store');
        Route::post('/super-admin/lock/{id}', [\App\Http\Controllers\SuperAdminController::class, 'toggleLock'])->name('superadmin.lock');
        Route::post('/super-admin/trial/{id}', [\App\Http\Controllers\SuperAdminController::class, 'updateTrial'])->name('superadmin.trial');
        Route::post('/super-admin/password/{id}', [\App\Http\Controllers\SuperAdminController::class, 'updatePassword'])->name('superadmin.password');
        Route::put('/super-admin/admin/{id}', [\App\Http\Controllers\SuperAdminController::class, 'updateAdmin'])->name('superadmin.update');
        Route::delete('/super-admin/admin/{id}', [\App\Http\Controllers\SuperAdminController::class, 'destroy'])->name('superadmin.destroy');
    });

    // ==================== WhatsApp Automation Hub ====================
    Route::get('/whatsapp', [\App\Http\Controllers\WhatsAppController::class, 'index'])->name('whatsapp.index');
    Route::get('/whatsapp/session/status', [\App\Http\Controllers\WhatsAppController::class, 'getSessionStatus'])->name('whatsapp.session.status');
    Route::post('/whatsapp/session/connect', [\App\Http\Controllers\WhatsAppController::class, 'connectSession'])->name('whatsapp.session.connect');
    Route::delete('/whatsapp/session/logout', [\App\Http\Controllers\WhatsAppController::class, 'logoutSession'])->name('whatsapp.session.logout');
    Route::post('/whatsapp/session/test', [\App\Http\Controllers\WhatsAppController::class, 'sendTest'])->name('whatsapp.session.test');
    Route::post('/whatsapp/templates', [\App\Http\Controllers\WhatsAppController::class, 'saveTemplates'])->name('whatsapp.templates.save');
    Route::post('/whatsapp/profile', [\App\Http\Controllers\WhatsAppController::class, 'saveProfile'])->name('whatsapp.profile.save');
    Route::post('/whatsapp/broadcasts', [\App\Http\Controllers\WhatsAppController::class, 'createBroadcast'])->name('whatsapp.broadcasts.create');
    Route::post('/whatsapp/broadcasts/{id}/pause', [\App\Http\Controllers\WhatsAppController::class, 'pauseBroadcast'])->name('whatsapp.broadcasts.pause');
    Route::post('/whatsapp/broadcasts/{id}/resume', [\App\Http\Controllers\WhatsAppController::class, 'resumeBroadcast'])->name('whatsapp.broadcasts.resume');
    Route::post('/whatsapp/broadcasts/{id}/step', [\App\Http\Controllers\WhatsAppController::class, 'stepBroadcast'])->name('whatsapp.broadcasts.step');
    Route::post('/whatsapp/broadcasts/{id}/cancel', [\App\Http\Controllers\WhatsAppController::class, 'cancelBroadcast'])->name('whatsapp.broadcasts.cancel');
    Route::post('/whatsapp/send-invoice/{id}', [\App\Http\Controllers\WhatsAppController::class, 'sendInvoiceNotification'])->name('whatsapp.send.invoice');
    Route::post('/whatsapp/send-reminder/{id}', [\App\Http\Controllers\WhatsAppController::class, 'sendPaymentReminder'])->name('whatsapp.send.reminder');
    Route::post('/whatsapp/send-purchase-reminder/{id}', [\App\Http\Controllers\WhatsAppController::class, 'sendPurchaseReminder'])->name('whatsapp.send.purchase-reminder');
    Route::post('/whatsapp/messages/{id}/recall', [\App\Http\Controllers\WhatsAppController::class, 'recallMessage'])->name('whatsapp.messages.recall');
});

// Quick Cache Clear & Diagnostics Route for Shared Hosting (Publicly accessible to easily fix cached config)
Route::get('/clear-cache', function () {
    try {
        \Illuminate\Support\Facades\Artisan::call('optimize:clear');
    } catch (\Throwable $e) {}

    $cacheFiles = [
        base_path('bootstrap/cache/config.php'),
        base_path('bootstrap/cache/routes-v7.php'),
        base_path('bootstrap/cache/services.php'),
        base_path('bootstrap/cache/packages.php'),
    ];
    foreach ($cacheFiles as $file) {
        if (file_exists($file)) {
            @unlink($file);
        }
    }

    $envSidecarUrl = env('WHATSAPP_SIDECAR_URL');
    $sidecarUrl = config('services.whatsapp.sidecar_url') ?: $envSidecarUrl;
    $sidecarUrl = rtrim($sidecarUrl ?: 'http://127.0.0.1:3001', '/');

    // Auto-normalize remote host to https
    $isLocal = in_array(parse_url($sidecarUrl, PHP_URL_HOST), ['localhost', '127.0.0.1', '::1', '0.0.0.0', '']);
    if (!$isLocal && str_starts_with($sidecarUrl, 'http://')) {
        $sidecarUrl = 'https://' . substr($sidecarUrl, 7);
    }

    // Live ping sidecar
    $sidecarHealth = 'Untested';
    if (!empty($sidecarUrl)) {
        try {
            $resp = \Illuminate\Support\Facades\Http::timeout(3)->get("{$sidecarUrl}/health");
            if ($resp->successful()) {
                $sidecarHealth = 'Online & Ready (' . $resp->json('service', 'ok') . ')';
            } else {
                $sidecarHealth = 'Returned HTTP ' . $resp->status();
            }
        } catch (\Throwable $hErr) {
            $sidecarHealth = 'Unreachable (' . $hErr->getMessage() . ')';
        }
    }

    // Check DomPDF status
    $dompdfClassExists = class_exists('\Barryvdh\DomPDF\Facade\Pdf');
    $pdfStatus = 'Not installed (run: composer require barryvdh/laravel-dompdf)';
    if ($dompdfClassExists) {
        try {
            $testPdf = \Barryvdh\DomPDF\Facade\Pdf::loadHTML('<p>Invoice Test</p>')->output();
            $pdfStatus = 'Ready (' . strlen($testPdf) . ' bytes generated)';
        } catch (\Throwable $pdfErr) {
            $pdfStatus = 'Error generating PDF: ' . $pdfErr->getMessage();
        }
    }

    return response()->json([
        'status' => 'success',
        'message' => 'Cache files removed and config refreshed successfully!',
        'env_sidecar_url' => $envSidecarUrl,
        'active_sidecar_url' => $sidecarUrl,
        'sidecar_health' => $sidecarHealth,
        'pdf_generator_status' => $pdfStatus,
        'hint' => ($sidecarUrl === 'http://127.0.0.1:3001' || empty($sidecarUrl))
            ? 'Your site is still pointing to localhost (127.0.0.1:3001). Please update WHATSAPP_SIDECAR_URL in your .env file with your cloud hosting URL (e.g. https://aquamarine-horse-881573.hostingersite.com) and re-open this link.'
            : 'Sidecar URL configured and auto-secured with HTTPS!'
    ]);
});

// ==================== Public Signed/Hashed Invoice Route ====================
Route::get('/i/{hash}', [\App\Http\Controllers\PublicInvoiceController::class, 'show'])->name('invoice.public');

require __DIR__.'/auth.php';
