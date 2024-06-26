<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\InventoryAController;
use App\Http\Controllers\InventoryBController;
use App\Http\Controllers\BillingController;

// Home
Route::get('/', [HomeController::class, 'index']);

// Delete routes for InventoryA and InventoryB
Route::get('/inventoryA-delete/{id}', [InventoryAController::class, 'delete'])->name('inventoryA.delete');
Route::get('/inventoryB-delete/{id}', [InventoryBController::class, 'delete'])->name('inventoryB.delete');

// InventoryA routes
Route::post('/inventoryA', [InventoryAController::class, 'store']);
Route::get('/inventoryA', [InventoryAController::class, 'view']);

// InventoryB routes
Route::post('/inventoryB', [InventoryBController::class, 'store']);
Route::get('/inventoryB', [InventoryBController::class, 'view']);

// Billing routes
Route::get('/billing', [BillingController::class, 'index']);

Route::post('/billing/storeA', [BillingController::class, 'storeA'])->name('storeA');
Route::get('/billing/deleteA/{id}', [BillingController::class, 'deleteA'])->name('deleteStoreA'); // Corrected route name

Route::post('/billing/storeB', [BillingController::class, 'storeB'])->name('storeB');
Route::get('/billing/deleteB/{id}', [BillingController::class, 'deleteB'])->name('deleteStoreB'); // Corrected route name

// Edit and Update routes

// Route::get('/inventoryA-edit/{id}',[InventoryAController::class, 'edit'])->name('inventoryA.edit');
Route::post('/inventoryA-update/{id}',[InventoryAController::class, 'update'])->name('inventoryA.update');

// Route::get('/inventoryB-edit/{id}',[InventoryBController::class, 'edit'])->name('inventoryB.edit');
Route::post('/inventoryB-update/{id}',[InventoryBController::class, 'update'])->name('inventoryB.update');

// Route::get('/billingA-editA/{id}',[BillingController::class, 'editA'])->name('billingA.editA');
Route::post('/billingA-update/{id}',[BillingController::class, 'updateA'])->name('billingA.update');

// Route::get('/billingB-editB/{id}',[BillingController::class, 'editB'])->name('billingB.editB');
Route::post('/billingB-update/{id}',[BillingController::class, 'updateB'])->name('billingB.update');
