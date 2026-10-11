<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\DataExportController;

// Redirect root to dashboard or login
Route::get('/', function () {
    return auth()->check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
});

Route::middleware('auth')->group(function () {

    // ==================== Home ====================
    Route::get('/dashboard', [HomeController::class, 'index'])->name('dashboard');
    Route::get('/dashboard/stats', [HomeController::class, 'stats'])->name('home.stats');
    Route::get('/dashboard/barcode-items', [HomeController::class, 'barcodeItems'])->name('home.barcode-items');

    // ==================== Profile Management ====================
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // ==================== Billing Management (Admin & Staff) ====================
    Route::get('/billing', [BillingController::class, 'index'])->name('billing.index');
    Route::get('/billing/data', [BillingController::class, 'data'])->name('billing.data');
    Route::post('/billing', [BillingController::class, 'store'])->name('billing.store');
    Route::post('/billing/{id}', [BillingController::class, 'update'])->name('billing.update');
    Route::delete('/billing/{id}', [BillingController::class, 'delete'])->name('billing.delete');
    Route::get('/billing/{id}/print', [BillingController::class, 'print'])->name('billing.print');
    Route::get('/billing/search', [BillingController::class, 'search'])->name('billing.search');

    // ==================== Admin Only Routes ====================
    Route::middleware('admin')->group(function () {
        // Inventory Management
        Route::get('/inventory', [InventoryController::class, 'index'])->name('inventory.index');
        Route::get('/inventory/data', [InventoryController::class, 'data'])->name('inventory.data');
        Route::get('/inventory/check-name', [InventoryController::class, 'checkName'])->name('inventory.check-name');
        Route::post('/inventory', [InventoryController::class, 'store'])->name('inventory.store');
        Route::post('/inventory/{id}', [InventoryController::class, 'update'])->name('inventory.update');
        Route::delete('/inventory/{id}', [InventoryController::class, 'destroy'])->name('inventory.destroy');

        // Account Management
        Route::get('/account/{id}', [AccountController::class, 'show'])->name('account.show');
        Route::post('/account/{id}/receipt', [AccountController::class, 'addReceipt'])->name('account.receipt');
        Route::post('/account/{id}/credit', [AccountController::class, 'addCredit'])->name('account.credit');
        Route::delete('/account/credit/{id}', [AccountController::class, 'deleteCredit'])->name('account.credit.delete');
        Route::delete('/account/receipt/{id}', [AccountController::class, 'deleteReceipt'])->name('account.receipt.delete');

        // Data Export
        Route::get('/export', [DataExportController::class, 'export'])->name('export');

        // Legacy Routes (backward compat)
        Route::get('/inventoryB', [InventoryController::class, 'index']);
        Route::get('/billing/{id}/delete', [BillingController::class, 'delete']);
        Route::get('/inventory/{id}/delete', [InventoryController::class, 'legacyDelete']);
        Route::get('/account/credit/{id}/delete', [AccountController::class, 'deleteCredit']);
        Route::get('/account/receipt/{id}/delete', [AccountController::class, 'deleteReceipt']);
    });
});

require __DIR__.'/auth.php';
