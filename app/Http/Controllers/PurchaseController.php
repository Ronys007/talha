<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PurchaseController extends Controller
{
    private function getOwnerId(): int
    {
        $owner = (int) (auth()->user()?->getEffectiveOwnerId() ?? 0);
        if ($owner > 0) {
            return $owner;
        }
        return (int) (auth()->id() ?? 0);
    }

    private function getStoreUserIds(): array
    {
        $ids = auth()->user()?->getEffectiveStoreUserIds() ?? [];
        if (empty($ids) || $ids === [-1]) {
            return [$this->getOwnerId()];
        }
        return $ids;
    }

    private function getScanUsage(): array
    {
        $user = auth()->user();
        $isSuperAdmin = $user && $user->isSuperAdmin();
        $limit = 100;
        $startOfMonth = now()->startOfMonth();
        $endOfMonth = now()->endOfMonth();

        if ($isSuperAdmin) {
            $usedThisMonth = \App\Models\AiScanLog::where('user_id', $user->id)
                ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
                ->count();
        } else {
            $storeIds = $this->getStoreUserIds();
            $usedThisMonth = \App\Models\AiScanLog::whereIn('user_id', $storeIds)
                ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
                ->count();
        }

        return [
            'used' => $usedThisMonth,
            'limit' => $limit,
            'remaining' => $isSuperAdmin ? null : max(0, $limit - $usedThisMonth),
            'isSuperAdmin' => (bool) $isSuperAdmin,
            'hasReachedLimit' => !$isSuperAdmin && ($usedThisMonth >= $limit),
            'monthName' => now()->format('F Y'),
        ];
    }

    public function index()
    {
        $ownerIds = $this->getStoreUserIds();
        $orders = \App\Models\PurchaseOrder::whereIn('user_id', $ownerIds)
            ->with('items')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Purchase/Index', [
            'purchaseOrders' => $orders,
            'scanUsage' => $this->getScanUsage(),
        ]);
    }

    public function scan(Request $request, \App\Services\InvoiceLlmService $llmService)
    {
        $scanUsage = $this->getScanUsage();
        if ($scanUsage['hasReachedLimit']) {
            return response()->json([
                'success' => false,
                'message' => "Monthly AI invoice scan limit of {$scanUsage['limit']} reached for this month ({$scanUsage['monthName']}). SuperAdmin has unlimited scan capacity. Please enter bills manually or contact SuperAdmin.",
                'scan_usage' => $scanUsage,
            ], 429);
        }

        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'bill_file' => 'required|file|max:25600',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first('bill_file') ?: 'Uploaded file is invalid or too large.',
            ], 422);
        }

        try {
            $extracted = $llmService->scan($request->file('bill_file'));

            // Ensure subtotal, gross_discount and round_off are available at root level
            if (isset($extracted['financial_summary']) && is_array($extracted['financial_summary'])) {
                $extracted['subtotal'] = $extracted['subtotal'] ?? $extracted['financial_summary']['subtotal'] ?? null;
                $extracted['gross_discount'] = $extracted['gross_discount'] ?? $extracted['financial_summary']['gross_discount'] ?? $extracted['financial_summary']['discount'] ?? null;
                $extracted['round_off'] = $extracted['round_off'] ?? $extracted['financial_summary']['round_off'] ?? null;
            }

            // Record scan log safely
            try {
                $ownerId = $this->getOwnerId();
                $logUserId = $ownerId > 0 ? $ownerId : (int) (auth()->id() ?? 1);
                \App\Models\AiScanLog::create([
                    'user_id' => $logUserId,
                ]);
            } catch (\Throwable $logEx) {
                \Illuminate\Support\Facades\Log::warning('Could not record ai_scan_log: ' . $logEx->getMessage());
            }

            // Re-fetch updated usage counter
            $updatedUsage = $this->getScanUsage();

            // Check if this invoice number has already been added by this user
            $invoiceNumber = trim((string) ($extracted['po_number'] ?? $extracted['invoice_number'] ?? ''));
            $ownerIds = $this->getStoreUserIds();

            $existing = null;
            if ($invoiceNumber !== '') {
                $existing = \App\Models\PurchaseOrder::whereIn('user_id', $ownerIds)
                    ->where(function ($q) use ($invoiceNumber) {
                        $q->where('po_number', $invoiceNumber)
                          ->orWhere('po_number', 'like', $invoiceNumber);
                    })
                    ->first();
            }

            $storedBillPath = null;
            try {
                if ($request->hasFile('bill_file')) {
                    $storedBillPath = $request->file('bill_file')->store('purchases', 'public');
                }
            } catch (\Throwable $fileEx) {
                \Illuminate\Support\Facades\Log::warning('Could not pre-store scanned bill: ' . $fileEx->getMessage());
            }

            return response()->json([
                'success' => true,
                'data' => $extracted,
                'bill_file' => $storedBillPath,
                'scan_usage' => $updatedUsage,
                'is_duplicate' => $existing !== null,
                'duplicate_order' => $existing ? [
                    'id' => $existing->id,
                    'invoice_number' => $existing->po_number,
                    'supplier_name' => $existing->supplier_name,
                    'order_date' => $existing->order_date,
                    'total_amount' => $existing->total_amount,
                    'status' => $existing->status,
                ] : null,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Invoice scan failed', ['message' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function store(Request $request)
    {
        // Auto-sanitize financial amounts (strip commas, symbols)
        foreach (['total_amount', 'subtotal', 'gross_discount', 'round_off'] as $numField) {
            if ($request->has($numField) && $request->input($numField) !== null && $request->input($numField) !== '') {
                $raw = str_replace([',', '₹', 'Rs', 'Rs.', ' '], '', (string) $request->input($numField));
                $request->merge([$numField => is_numeric($raw) ? (float) $raw : 0]);
            }
        }

        // Auto-sanitize and normalize items array
        if ($request->has('items') && is_array($request->items)) {
            $cleanedItems = [];
            foreach ($request->items as $item) {
                if (! is_array($item)) continue;

                $qty = isset($item['quantity']) && is_numeric($item['quantity']) ? (float) $item['quantity'] : 1;
                $rate = isset($item['rate']) && is_numeric($item['rate']) ? (float) $item['rate'] : 0;
                $amt = isset($item['amount']) && is_numeric($item['amount']) ? (float) $item['amount'] : ($qty * $rate);

                $disc = null;
                if (isset($item['discount_percent']) && is_numeric($item['discount_percent'])) {
                    $disc = (float) $item['discount_percent'];
                }

                $discAmt = null;
                if (isset($item['discount_amount']) && is_numeric($item['discount_amount'])) {
                    $discAmt = (float) $item['discount_amount'];
                }

                $hsn = isset($item['hsn_sac']) && ! in_array($item['hsn_sac'], ['', 'null', null], true) ? trim((string) $item['hsn_sac']) : null;
                $desc = isset($item['description']) && trim((string) $item['description']) !== '' ? trim((string) $item['description']) : 'Item';

                $cleanedItems[] = [
                    'description' => $desc,
                    'hsn_sac' => $hsn,
                    'quantity' => max(0.001, $qty),
                    'rate' => max(0, $rate),
                    'per' => isset($item['per']) && ! in_array($item['per'], ['', 'null', null], true) ? trim((string) $item['per']) : 'PC',
                    'discount_percent' => $disc,
                    'discount_amount' => $discAmt,
                    'amount' => max(0, $amt),
                ];
            }
            $request->merge(['items' => $cleanedItems]);
        }

        $userId = $this->getOwnerId();
        if ($userId <= 0) {
            return back()->with('error', 'Please switch to an admin store from the topbar before creating purchase orders.');
        }
        $invoiceNum = trim((string) $request->po_number);

        // Check if same invoice already added by user
        if ($invoiceNum !== '') {
            $existing = \App\Models\PurchaseOrder::whereIn('user_id', $this->getStoreUserIds())
                ->where('po_number', $invoiceNum)
                ->first();

            if ($existing) {
                return back()->withErrors([
                    'po_number' => "Invoice #{$invoiceNum} has already been added on " . ($existing->order_date ? date('d M Y', strtotime($existing->order_date)) : 'a previous date') . " (Supplier: {$existing->supplier_name}, Total: ₹" . number_format($existing->total_amount, 2) . "). The same invoice cannot be added twice.",
                ]);
            }
        }

        $validated = $request->validate([
            'po_number' => 'required|string',
            'supplier_name' => 'required|string',
            'gst_number' => 'nullable|string',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'subtotal' => 'nullable|numeric|min:0',
            'gross_discount' => 'nullable|numeric|min:0',
            'cgst' => 'nullable|numeric|min:0',
            'sgst' => 'nullable|numeric|min:0',
            'igst' => 'nullable|numeric|min:0',
            'total_gst' => 'nullable|numeric|min:0',
            'round_off' => 'nullable|numeric',
            'order_date' => 'required|date',
            'status' => 'required|string|in:Pending,Approved,Received,Cancelled',
            'total_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
            'bill_file' => $request->hasFile('bill_file') ? 'file|mimes:jpeg,jpg,png,webp,pdf|max:20480' : 'nullable',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.hsn_sac' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.rate' => 'required|numeric|min:0',
            'items.*.per' => 'nullable|string',
            'items.*.discount_percent' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
            'items.*.amount' => 'required|numeric|min:0',
        ]);

        $storedPath = null;
        try {
            $order = DB::transaction(function () use ($request, $validated, $userId, &$storedPath) {
                if ($request->hasFile('bill_file')) {
                    $storedPath = $request->file('bill_file')->store('purchases', 'public');
                    if (! $storedPath) {
                        throw new \RuntimeException('The purchase bill could not be stored.');
                    }
                    $validated['bill_file'] = $storedPath;
                } elseif ($request->filled('bill_file') && is_string($request->input('bill_file'))) {
                    $filePath = trim($request->input('bill_file'));
                    if (Storage::disk('public')->exists($filePath)) {
                        $validated['bill_file'] = $filePath;
                    }
                }

                $validated['user_id'] = $userId;

                $status = $validated['status'] ?? 'Pending';
                // Sync to inventory if status is Received or if sync_inventory is checked
                $shouldSync = ($status === 'Received') || $request->boolean('sync_inventory', false);
                $validated['is_inventory_synced'] = $shouldSync;

                $order = \App\Models\PurchaseOrder::create(\Illuminate\Support\Arr::except($validated, ['items']));
                $order->purchase_number = 'PUR-' . str_pad((string) $order->id, 6, '0', STR_PAD_LEFT);
                $order->save();
                $order->items()->createMany($validated['items']);

                if ($shouldSync) {
                    $this->syncOrderItemsToInventory($order, $userId);
                }

                return $order;
            });
        } catch (\Throwable $exception) {
            if (is_string($storedPath)) {
                Storage::disk('public')->delete($storedPath);
            }
            throw $exception;
        }

        return back()->with('success', 'Purchase Invoice created successfully.');
    }

    public function update(Request $request, $id)
    {
        $userId = $this->getOwnerId();
        $ownerIds = $this->getStoreUserIds();
        $isSuperAdmin = auth()->user()?->isSuperAdmin();

        $orderQuery = \App\Models\PurchaseOrder::with('items')->where('id', $id);
        if (!$isSuperAdmin) {
            $orderQuery->where(function ($q) use ($ownerIds) {
                $q->whereIn('user_id', $ownerIds)->orWhereNull('user_id');
            });
        }
        $order = $orderQuery->firstOrFail();

        // Auto-sanitize financial amounts (strip commas, symbols)
        foreach (['total_amount', 'subtotal', 'gross_discount', 'round_off'] as $numField) {
            if ($request->has($numField) && $request->input($numField) !== null && $request->input($numField) !== '') {
                $raw = str_replace([',', '₹', 'Rs', 'Rs.', ' '], '', (string) $request->input($numField));
                $request->merge([$numField => is_numeric($raw) ? (float) $raw : 0]);
            }
        }

        // Auto-sanitize and normalize items array
        if ($request->has('items') && is_array($request->items)) {
            $cleanedItems = [];
            foreach ($request->items as $item) {
                if (! is_array($item)) continue;

                $qty = isset($item['quantity']) && is_numeric($item['quantity']) ? (float) $item['quantity'] : 1;
                $rate = isset($item['rate']) && is_numeric($item['rate']) ? (float) $item['rate'] : 0;
                $amt = isset($item['amount']) && is_numeric($item['amount']) ? (float) $item['amount'] : ($qty * $rate);

                $disc = null;
                if (isset($item['discount_percent']) && is_numeric($item['discount_percent'])) {
                    $disc = (float) $item['discount_percent'];
                }

                $discAmt = null;
                if (isset($item['discount_amount']) && is_numeric($item['discount_amount'])) {
                    $discAmt = (float) $item['discount_amount'];
                }

                $hsn = isset($item['hsn_sac']) && ! in_array($item['hsn_sac'], ['', 'null', null], true) ? trim((string) $item['hsn_sac']) : null;
                $desc = isset($item['description']) && trim((string) $item['description']) !== '' ? trim((string) $item['description']) : 'Item';

                $cleanedItems[] = [
                    'description' => $desc,
                    'hsn_sac' => $hsn,
                    'quantity' => max(0.001, $qty),
                    'rate' => max(0, $rate),
                    'per' => isset($item['per']) && ! in_array($item['per'], ['', 'null', null], true) ? trim((string) $item['per']) : 'PC',
                    'discount_percent' => $disc,
                    'discount_amount' => $discAmt,
                    'amount' => max(0, $amt),
                ];
            }
            $request->merge(['items' => $cleanedItems]);
        }

        // Check if invoice number already taken on another invoice
        $invoiceNum = trim((string) $request->po_number);
        if ($invoiceNum !== '') {
            $existing = \App\Models\PurchaseOrder::whereIn('user_id', $ownerIds)
                ->where('po_number', $invoiceNum)
                ->where('id', '!=', $order->id)
                ->first();

            if ($existing) {
                return back()->withErrors([
                    'po_number' => "Invoice #{$invoiceNum} already exists on another purchase order (Supplier: {$existing->supplier_name}, Total: ₹" . number_format($existing->total_amount, 2) . ").",
                ]);
            }
        }

        $validated = $request->validate([
            'po_number' => 'required|string',
            'supplier_name' => 'required|string',
            'gst_number' => 'nullable|string',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'subtotal' => 'nullable|numeric|min:0',
            'gross_discount' => 'nullable|numeric|min:0',
            'cgst' => 'nullable|numeric|min:0',
            'sgst' => 'nullable|numeric|min:0',
            'igst' => 'nullable|numeric|min:0',
            'total_gst' => 'nullable|numeric|min:0',
            'round_off' => 'nullable|numeric',
            'order_date' => 'required|date',
            'status' => 'required|string|in:Pending,Approved,Received,Cancelled',
            'total_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
            'bill_file' => $request->hasFile('bill_file') ? 'file|mimes:jpeg,jpg,png,webp,pdf|max:20480' : 'nullable',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.hsn_sac' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.rate' => 'required|numeric|min:0',
            'items.*.per' => 'nullable|string',
            'items.*.discount_percent' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
            'items.*.amount' => 'required|numeric|min:0',
        ]);

        $storedPath = null;
        try {
            DB::transaction(function () use ($request, $validated, $order, $userId, &$storedPath) {
                // If previous items were synced to inventory, revert them first
                if ($order->is_inventory_synced) {
                    $this->revertOrderItemsFromInventory($order, $userId);
                    $order->is_inventory_synced = false;
                }

                if ($request->hasFile('bill_file')) {
                    $storedPath = $request->file('bill_file')->store('purchases', 'public');
                    if (! $storedPath) {
                        throw new \RuntimeException('The purchase bill could not be stored.');
                    }
                    if ($order->bill_file && Storage::disk('public')->exists($order->bill_file)) {
                        Storage::disk('public')->delete($order->bill_file);
                    }
                    $validated['bill_file'] = $storedPath;
                } elseif ($request->filled('bill_file') && is_string($request->input('bill_file'))) {
                    $filePath = trim($request->input('bill_file'));
                    if (Storage::disk('public')->exists($filePath)) {
                        $validated['bill_file'] = $filePath;
                    }
                } elseif ($request->has('bill_file') && ($request->input('bill_file') === null || $request->input('bill_file') === '' || $request->input('bill_file') === 'null')) {
                    // Explicitly removed file by user
                    if ($order->bill_file && Storage::disk('public')->exists($order->bill_file)) {
                        Storage::disk('public')->delete($order->bill_file);
                    }
                    $validated['bill_file'] = null;
                } else {
                    // Keep existing bill file (do not overwrite)
                    unset($validated['bill_file']);
                }

                $status = $validated['status'] ?? 'Pending';
                $shouldSync = ($status === 'Received') || $request->boolean('sync_inventory', false);
                $validated['is_inventory_synced'] = $shouldSync;

                // Update order attributes
                $order->update(\Illuminate\Support\Arr::except($validated, ['items']));

                // Replace items
                $order->items()->delete();
                $order->items()->createMany($validated['items']);

                // If should sync, sync the updated items to inventory
                if ($shouldSync) {
                    $order->refresh();
                    $this->syncOrderItemsToInventory($order, $userId);
                }
            });
        } catch (\Throwable $exception) {
            if (is_string($storedPath)) {
                Storage::disk('public')->delete($storedPath);
            }
            throw $exception;
        }

        return back()->with('success', "Invoice #{$order->po_number} updated successfully.");
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|string|in:Pending,Approved,Received,Cancelled',
        ]);

        $userId = $this->getOwnerId();
        $ownerIds = $this->getStoreUserIds();
        $isSuperAdmin = auth()->user()?->isSuperAdmin();

        $orderQuery = \App\Models\PurchaseOrder::with('items')->where('id', $id);
        if (!$isSuperAdmin) {
            $orderQuery->where(function ($q) use ($ownerIds) {
                $q->whereIn('user_id', $ownerIds)->orWhereNull('user_id');
            });
        }
        $order = $orderQuery->firstOrFail();

        $oldStatus = $order->status;
        $newStatus = $request->status;

        if ($oldStatus === $newStatus) {
            return back();
        }

        $syncedChanged = false;

        DB::transaction(function () use ($order, $userId, $newStatus, &$syncedChanged) {
            if ($newStatus === 'Received' && ! $order->is_inventory_synced) {
                $this->syncOrderItemsToInventory($order, $userId);
                $order->is_inventory_synced = true;
                $syncedChanged = true;
            } elseif ($newStatus !== 'Received' && $order->is_inventory_synced) {
                $this->revertOrderItemsFromInventory($order, $userId);
                $order->is_inventory_synced = false;
                $syncedChanged = true;
            }

            $order->status = $newStatus;
            $order->save();
        });

        $syncMsg = '';
        if ($newStatus === 'Received') {
            $syncMsg = ' Stock added to inventory.';
        } elseif ($syncedChanged && ! $order->is_inventory_synced) {
            $syncMsg = ' Stock deducted from inventory as order is no longer Received.';
        }

        return back()->with('success', "Order #{$order->po_number} status updated to {$newStatus}.{$syncMsg}");
    }

    public function destroy($id)
    {
        $userId = $this->getOwnerId();
        $ownerIds = $this->getStoreUserIds();
        $isSuperAdmin = auth()->user()?->isSuperAdmin();

        $orderQuery = \App\Models\PurchaseOrder::with('items')->where('id', $id);
        if (!$isSuperAdmin) {
            $orderQuery->where(function ($q) use ($ownerIds) {
                $q->whereIn('user_id', $ownerIds)->orWhereNull('user_id');
            });
        }
        $order = $orderQuery->firstOrFail();

        DB::transaction(function () use ($order, $userId) {
            if ($order->is_inventory_synced) {
                $this->revertOrderItemsFromInventory($order, $userId);
            }

            if ($order->bill_file) {
                Storage::disk('public')->delete($order->bill_file);
            }

            $order->delete();
        });

        return back()->with('delete', 'Purchase Order deleted successfully.');
    }

    private function syncOrderItemsToInventory($order, int $userId): void
    {
        $order->loadMissing('items');
        foreach ($order->items as $item) {
            $itemName = trim($item->description ?? '');
            if ($itemName === '') continue;

            $hsn = ! empty($item->hsn_sac) ? trim((string) $item->hsn_sac) : null;
            $qty = max(0.001, (float) ($item->quantity ?? 1));
            $price = max(0, (float) ($item->rate ?? 0));
            $unit = ! empty($item->per) ? strtoupper(trim((string) $item->per)) : 'PCS';

            $existingItem = \App\Models\Inventory::where('user_id', $userId)
                ->where('mode', 'standard')
                ->whereRaw('LOWER(item) = LOWER(?)', [$itemName])
                ->first();

            if ($existingItem) {
                $existingItem->qty = (float) $existingItem->qty + $qty;
                if ($price > 0) {
                    $existingItem->selling_price = $price;
                }
                if (! empty($unit)) {
                    $existingItem->unit = $unit;
                }
                if ($hsn && (empty($existingItem->code) || strlen($existingItem->code) < 4)) {
                    $codeTaken = \App\Models\Inventory::where('user_id', $userId)
                        ->where('code', $hsn)
                        ->where('id', '!=', $existingItem->id)
                        ->exists();
                    if (! $codeTaken) {
                        $existingItem->code = $hsn;
                    }
                }
                $existingItem->save();
            } else {
                $code = $hsn;
                if (! $code) {
                    $code = (string) rand(10000, 99999);
                    while (\App\Models\Inventory::where('user_id', $userId)->where('code', $code)->exists()) {
                        $code = (string) rand(10000, 99999);
                    }
                } else {
                    if (\App\Models\Inventory::where('user_id', $userId)->where('code', $code)->exists()) {
                        $counter = 1;
                        $candidate = $hsn . '-' . $counter;
                        while (\App\Models\Inventory::where('user_id', $userId)->where('code', $candidate)->exists()) {
                            $counter++;
                            $candidate = $hsn . '-' . $counter;
                        }
                        $code = $candidate;
                    }
                }

                \App\Models\Inventory::create([
                    'user_id' => $userId,
                    'mode' => 'standard',
                    'item' => $itemName,
                    'code' => $code,
                    'qty' => $qty,
                    'unit' => $unit,
                    'selling_price' => $price,
                ]);
            }
        }
    }

    private function revertOrderItemsFromInventory($order, int $userId): void
    {
        $order->loadMissing('items');
        foreach ($order->items as $item) {
            $itemName = trim($item->description ?? '');
            if ($itemName === '') continue;

            $qty = max(0.001, (float) ($item->quantity ?? 1));

            $existingItem = \App\Models\Inventory::where('user_id', $userId)
                ->where('mode', 'standard')
                ->whereRaw('LOWER(item) = LOWER(?)', [$itemName])
                ->first();

            if ($existingItem) {
                $existingItem->qty = max(0, (float) $existingItem->qty - $qty);
                $existingItem->save();
            }
        }
    }
}
