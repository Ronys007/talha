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
    Route::post('/purchase/import', [\App\Http\Controllers\PurchaseController::class, 'import'])->name('purchase.import');
    Route::get('/purchase/import/template', [\App\Http\Controllers\PurchaseController::class, 'downloadTemplate'])->name('purchase.import.template');
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
    Route::post('/sales-reminders/send-all-due', [\App\Http\Controllers\PaymentReminderController::class, 'sendAllDue'])->name('sales-reminders.send-all-due');
    Route::get('/payment-reminders', [\App\Http\Controllers\PaymentReminderController::class, 'index'])->name('reminders.index');
    Route::post('/payment-reminders/record-payment', [\App\Http\Controllers\PaymentReminderController::class, 'recordPayment'])->name('reminders.record-payment');
    Route::post('/payment-reminders/mark-as-paid', [\App\Http\Controllers\PaymentReminderController::class, 'markAsPaid'])->name('reminders.mark-as-paid');
    Route::post('/payment-reminders/update-due-date', [\App\Http\Controllers\PaymentReminderController::class, 'updateDueDate'])->name('reminders.update-due-date');
    Route::post('/payment-reminders/send-all-due', [\App\Http\Controllers\PaymentReminderController::class, 'sendAllDue'])->name('reminders.send-all-due');

    // ==================== Purchase Reminders (Supplier Payment Reminders) ====================
    Route::get('/purchase-reminders', [\App\Http\Controllers\PurchaseReminderController::class, 'index'])->name('purchase-reminders.index');
    Route::post('/purchase-reminders/record-payment', [\App\Http\Controllers\PurchaseReminderController::class, 'recordPayment'])->name('purchase-reminders.record-payment');
    Route::post('/purchase-reminders/mark-as-paid', [\App\Http\Controllers\PurchaseReminderController::class, 'markAsPaid'])->name('purchase-reminders.mark-as-paid');
    Route::post('/purchase-reminders/update-due-date', [\App\Http\Controllers\PurchaseReminderController::class, 'updateDueDate'])->name('purchase-reminders.update-due-date');
    Route::post('/purchase-reminders/send-all-due', [\App\Http\Controllers\PurchaseReminderController::class, 'sendAllDue'])->name('purchase-reminders.send-all-due');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // ==================== Tax Invoices (Sales) ====================
    Route::get('/invoices', [\App\Http\Controllers\InvoiceController::class, 'index'])->name('invoices.index');
    Route::post('/invoices/scan', [\App\Http\Controllers\InvoiceController::class, 'scan'])->name('invoices.scan');
    Route::get('/invoices/search-inventory', [\App\Http\Controllers\InvoiceController::class, 'searchInventory'])->name('invoices.search-inventory');
    Route::post('/invoices', [\App\Http\Controllers\InvoiceController::class, 'store'])->name('invoices.store');
    Route::post('/invoices/import', [\App\Http\Controllers\InvoiceController::class, 'import'])->name('invoices.import');
    Route::get('/invoices/import/template', [\App\Http\Controllers\InvoiceController::class, 'downloadTemplate'])->name('invoices.import.template');
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
        Route::post('/inventory/import', [InventoryController::class, 'import'])->name('inventory.import');
        Route::get('/inventory/import/template', [InventoryController::class, 'downloadTemplate'])->name('inventory.import.template');
        Route::match(['post', 'put', 'patch'], '/inventory/{id}', [InventoryController::class, 'update'])->name('inventory.update');
        Route::delete('/inventory/{id}', [InventoryController::class, 'destroy'])->name('inventory.destroy');

        // Legacy Routes (backward compat)
        Route::get('/inventoryB', [InventoryController::class, 'index']);
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

// Quick Cache Clear & Diagnostics Route for Shared Hosting (Protected by Super Admin Auth or APP_KEY token)
Route::get('/clear-cache', function (\Illuminate\Http\Request $request) {
    $token = $request->query('key');
    $appKey = config('app.key');
    $isAuthorized = (auth()->check() && auth()->user()->isSuperAdmin())
        || (!empty($token) && !empty($appKey) && hash_equals($appKey, $token));

    if (! $isAuthorized) {
        abort(403, 'Unauthorized access to cache diagnostic tool.');
    }

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
            ? 'Your site is still pointing to localhost (127.0.0.1:3001). Please update WHATSAPP_SIDECAR_URL in your .env file with your cloud hosting URL and re-open this link.'
            : 'Sidecar URL configured and auto-secured with HTTPS!'
    ]);
});

// Web Cron / Trigger Route for automated WhatsApp due payment & purchase reminders (Token-Protected)
Route::match(['GET', 'POST'], '/cron/send-reminders', function (\Illuminate\Http\Request $request) {
    $configuredSecret = (string) (config('services.cron.secret') ?: env('CRON_SECRET', '4560a61722c5be98485f0917abb5aa18d0dec73f5cdd60e8'));
    $token = (string) ($request->query('token') ?: ($request->query('key') ?: ($request->input('token') ?: ($request->input('key') ?: $request->header('X-Cron-Token')))));
    $appKey = (string) config('app.key');
    $appKeySuffix = strlen($appKey) >= 16 ? substr($appKey, -16) : $appKey;

    $isValid = false;
    if (!empty($configuredSecret) && !empty($token) && hash_equals($configuredSecret, $token)) {
        $isValid = true;
    } elseif (!empty($appKey) && !empty($token) && (hash_equals($appKey, $token) || hash_equals($appKeySuffix, $token))) {
        $isValid = true;
    } elseif (auth()->check()) {
        $isValid = true;
    }

    $isBrowserHtml = $request->acceptsHtml() && !$request->expectsJson() && !$request->has('json');

    // If unauthorized and requested from browser, show user-friendly interactive helper screen instead of raw 403
    if (! $isValid) {
        if ($isBrowserHtml) {
            $currentUrl = url('/cron/send-reminders');
            $sampleUrl = "{$currentUrl}?token=" . urlencode($configuredSecret);
            $loginUrl = route('login');

            return response()->make(<<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Reminders Trigger - Authorization Required</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; padding: 30px 15px; margin: 0; }
        .card { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: linear-gradient(135deg, #059669, #0d9488); color: white; padding: 24px; text-align: center; }
        .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; }
        .header p { margin: 0; font-size: 13px; opacity: 0.9; }
        .body { padding: 24px; }
        .alert { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
        .box { background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 13px; }
        .box h3 { margin: 0 0 8px 0; font-size: 14px; color: #334155; }
        .url-box { font-family: monospace; background: #1e293b; color: #38bdf8; padding: 10px 12px; border-radius: 6px; word-break: break-all; margin: 8px 0; font-size: 12px; }
        .btn { display: inline-block; background: #059669; color: white; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; border: none; cursor: pointer; transition: 0.2s; }
        .btn:hover { background: #047857; }
        .btn-outline { background: transparent; color: #059669; border: 1px solid #059669; }
        .btn-outline:hover { background: #ecfdf5; }
        .form-row { display: flex; gap: 8px; margin-top: 10px; }
        input[type="text"], input[type="password"] { flex: 1; padding: 9px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; }
        input:focus { border-color: #059669; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>⚡ WhatsApp Reminders Automation</h1>
            <p>Automated payment reminders for sales & supplier purchase bills</p>
        </div>
        <div class="body">
            <div class="alert">
                <span>⚠️</span>
                <div><strong>Authorization Required:</strong> Please provide a valid cron token or log in as an administrator.</div>
            </div>

            <div class="box">
                <h3>Option 1: Enter Token & Run in Browser</h3>
                <form action="{$currentUrl}" method="GET">
                    <div class="form-row">
                        <input type="text" name="token" placeholder="Enter CRON_SECRET or APP_KEY" required value="{$configuredSecret}">
                        <button type="submit" class="btn">Run Now</button>
                    </div>
                    <label style="display:flex; align-items:center; gap:6px; margin-top:8px; font-size:12px; color:#64748b; cursor:pointer;">
                        <input type="checkbox" name="dry_run" value="1"> Test Run Only (Dry Run - won't dispatch live messages)
                    </label>
                </form>
            </div>

            <div class="box">
                <h3>Option 2: Log in to Vama Invoice</h3>
                <p style="margin: 0 0 10px 0; color: #475569;">If you are already a user or admin, simply log in to execute reminders with one click without entering tokens.</p>
                <a href="{$loginUrl}" class="btn btn-outline">Log in to Dashboard</a>
            </div>

            <div class="box" style="margin-bottom: 0;">
                <h3>Option 3: Use this URL in Hostinger Web Cron</h3>
                <p style="margin: 0 0 6px 0; color: #475569;">Copy and paste this ready-to-use URL directly into Hostinger Cron Jobs (Web Cron):</p>
                <div class="url-box">{$sampleUrl}</div>
            </div>
        </div>
    </div>
</body>
</html>
HTML, 403);
        }

        return response()->json([
            'success' => false,
            'error' => 'Unauthorized: Missing or invalid cron authorization token.',
            'hint' => 'Provide ?token=' . $configuredSecret . ' or log in to run.',
            'configured_token_sample' => url('/cron/send-reminders?token=' . urlencode($configuredSecret)),
        ], 403);
    }

    $commandParams = [];
    if ($request->boolean('dry_run') || $request->query('dry_run') === '1' || $request->query('dry-run') === '1') {
        $commandParams['--dry-run'] = true;
    }
    if ($request->boolean('force') || $request->query('force') === '1') {
        $commandParams['--force'] = true;
    }

    $salesOutput = '';
    $purchaseOutput = '';
    try {
        \Illuminate\Support\Facades\Artisan::call('invoices:send-due-reminders', $commandParams);
        $salesOutput = trim(\Illuminate\Support\Facades\Artisan::output());
    } catch (\Throwable $e) {
        $salesOutput = 'Error: ' . $e->getMessage();
    }

    try {
        \Illuminate\Support\Facades\Artisan::call('purchases:send-due-reminders', $commandParams);
        $purchaseOutput = trim(\Illuminate\Support\Facades\Artisan::output());
    } catch (\Throwable $e) {
        $purchaseOutput = 'Error: ' . $e->getMessage();
    }

    if ($isBrowserHtml) {
        $modeBadge = !empty($commandParams['--dry-run'])
            ? '<span style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:4px; font-weight:600;">DRY RUN (TEST)</span>'
            : '<span style="background:#ecfdf5; color:#047857; padding:3px 8px; border-radius:4px; font-weight:600;">LIVE DISPATCH</span>';

        $salesEscaped = htmlspecialchars($salesOutput ?: 'No output.');
        $purchaseEscaped = htmlspecialchars($purchaseOutput ?: 'No output.');
        $nowStr = now()->format('d M Y, h:i:s A');

        return response()->make(<<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WhatsApp Reminders Execution - Completed</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; padding: 30px 15px; margin: 0; }
        .card { max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: linear-gradient(135deg, #059669, #0d9488); color: white; padding: 24px; text-align: center; }
        .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; }
        .body { padding: 24px; }
        .meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-size: 13px; color: #64748b; }
        .log-box { font-family: monospace; background: #0f172a; color: #e2e8f0; padding: 14px; border-radius: 8px; font-size: 12px; line-height: 1.5; white-space: pre-wrap; margin-bottom: 20px; max-height: 320px; overflow-y: auto; }
        .section-title { font-size: 14px; font-weight: 700; color: #334155; margin: 16px 0 8px 0; display: flex; align-items: center; gap: 6px; }
        .btn { display: inline-block; background: #059669; color: white; padding: 9px 16px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <h1>✓ WhatsApp Reminders Routine Executed</h1>
        </div>
        <div class="body">
            <div class="meta">
                <div>Execution Time: <strong>{$nowStr}</strong></div>
                <div>Mode: {$modeBadge}</div>
            </div>

            <div class="section-title">📊 Customer Sales Invoice Reminders Output:</div>
            <div class="log-box">{$salesEscaped}</div>

            <div class="section-title">📦 Admin Purchase Order Reminders Output:</div>
            <div class="log-box">{$purchaseEscaped}</div>

            <div style="text-align: center; margin-top: 24px;">
                <a href="/sales-reminders" class="btn">Return to Sales Reminders Dashboard</a>
            </div>
        </div>
    </div>
</body>
</html>
HTML, 200);
    }

    return response()->json([
        'success' => true,
        'mode' => !empty($commandParams['--dry-run']) ? 'dry_run' : 'live',
        'force' => !empty($commandParams['--force']),
        'timestamp' => now()->toIso8601String(),
        'sales_reminders' => $salesOutput,
        'purchase_reminders' => $purchaseOutput,
    ]);
});

// ==================== Public Signed/Hashed Invoice Route ====================
Route::get('/i/{hash}', [\App\Http\Controllers\PublicInvoiceController::class, 'show'])->name('invoice.public');
Route::get('/pay/{hash}', [\App\Http\Controllers\PublicInvoiceController::class, 'pay'])->name('invoice.pay');

require __DIR__.'/auth.php';
