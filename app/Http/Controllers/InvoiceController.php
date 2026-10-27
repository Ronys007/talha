<?php

namespace App\Http\Controllers;

use App\Models\BusinessProfile;
use App\Models\Customer;
use App\Models\Inventory;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class InvoiceController extends Controller
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

    public function index(Request $request)
    {
        $ownerId = $this->getOwnerId();
        $ownerIds = $this->getStoreUserIds();

        $invoices = Invoice::whereIn('user_id', $ownerIds)
            ->with(['items'])
            ->orderBy('created_at', 'desc')
            ->get();

        $businessProfile = BusinessProfile::where('user_id', $ownerId)->first();

        // If no business profile exists yet, prefill default from user name/email
        if (!$businessProfile) {
            $user = auth()->user();
            $businessProfile = [
                'business_name' => $user->name ?? '',
                'address' => '',
                'city' => '',
                'state' => '',
                'pincode' => '',
                'gst_number' => '',
                'phone' => '',
                'email' => $user->email ?? '',
                'terms_and_conditions' => "1. Goods once sold will not be taken back or exchanged.\n2. Subject to local jurisdiction.\n3. Payment due upon receipt.",
            ];
        }

        // Available inventory items for quick selection and auto-type suggestion
        $inventoryItems = Inventory::whereIn('user_id', $ownerIds)
            ->orderBy('item', 'asc')
            ->get(['id', 'item', 'code', 'selling_price', 'qty', 'unit']);

        // Saved customers for quick selection and auto-fill
        $customers = Customer::whereIn('user_id', $ownerIds)
            ->orderBy('name', 'asc')
            ->get(['id', 'name', 'address', 'gst_number', 'phone', 'state']);

        // Next sequential invoice number
        $nextNumber = Invoice::generateNextNumber($ownerIds);

        return Inertia::render('Invoices/Index', [
            'invoices' => $invoices,
            'businessProfile' => $businessProfile,
            'inventoryItems' => $inventoryItems,
            'customers' => $customers,
            'nextInvoiceNumber' => $nextNumber,
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
            'bill_file' => 'required|file|mimes:jpeg,jpg,png,pdf,webp|max:25600',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first('bill_file') ?: 'Uploaded file is invalid or too large.',
            ], 422);
        }

        try {
            $extracted = $llmService->scan($request->file('bill_file'));

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

            $updatedUsage = $this->getScanUsage();

            $invoiceNumber = trim((string) ($extracted['invoice_number'] ?? $extracted['po_number'] ?? ''));
            $ownerIds = $this->getStoreUserIds();

            $existing = null;
            if ($invoiceNumber !== '') {
                $existing = Invoice::whereIn('user_id', $ownerIds)
                    ->where(function ($q) use ($invoiceNumber) {
                        $q->where('invoice_number', $invoiceNumber)
                          ->orWhere('invoice_number', 'like', $invoiceNumber);
                    })
                    ->first();
            }

            $storedBillPath = null;
            try {
                if ($request->hasFile('bill_file')) {
                    $storedBillPath = $request->file('bill_file')->store('invoices', 'public');
                }
            } catch (\Throwable $fileEx) {
                \Illuminate\Support\Facades\Log::warning('Could not pre-store scanned invoice: ' . $fileEx->getMessage());
            }

            return response()->json([
                'success' => true,
                'data' => $extracted,
                'bill_file' => $storedBillPath,
                'scan_usage' => $updatedUsage,
                'is_duplicate' => $existing !== null,
                'duplicate_invoice' => $existing ? [
                    'id' => $existing->id,
                    'invoice_number' => $existing->invoice_number,
                    'customer_name' => $existing->customer_name,
                    'invoice_date' => $existing->invoice_date,
                    'total_amount' => $existing->total_amount,
                    'status' => $existing->status,
                ] : null,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Sales Invoice scan failed', ['message' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function store(Request $request)
    {
        $ownerId = $this->getOwnerId();
        if ($ownerId <= 0) {
            return back()->with('error', 'Please switch to an admin store from the topbar before generating invoices.');
        }
        $ownerIds = $this->getStoreUserIds();

        $request->validate([
            'invoice_number' => [
                'required',
                'string',
                'max:100',
                Rule::unique('invoices', 'invoice_number')->where(fn ($query) => $query->whereIn('user_id', $ownerIds)),
            ],
            'invoice_date' => 'required|date',
            'customer_name' => 'required|string|max:255',
            'seller_name' => 'required|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.item_name' => 'required|string|max:255',
            'items.*.dimension' => 'nullable|string|max:100',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.rate' => 'required|numeric|min:0',
        ]);

        // Stock validation:
        // Verify quantity does not exceed actual inventory stock for items linked to inventory
        foreach ($request->items as $row) {
            $qty = max(0.001, (float) ($row['quantity'] ?? 1));
            $invId = !empty($row['inventory_id']) ? (int) $row['inventory_id'] : null;

            $inventoryItem = null;
            if ($invId) {
                $inventoryItem = Inventory::whereIn('user_id', $ownerIds)->where('id', $invId)->first();
            } elseif (!empty($row['item_name'])) {
                $inventoryItem = Inventory::whereIn('user_id', $ownerIds)
                    ->where('item', trim($row['item_name']))
                    ->first();
            }

            if ($inventoryItem && $qty > (float) $inventoryItem->qty) {
                $unitStr = $inventoryItem->unit ?: 'PCS';
                return back()->with('error', "Quantity for item '{$inventoryItem->item}' ({$qty}) exceeds actual inventory stock ({$inventoryItem->qty} {$unitStr}).")->withInput();
            }
        }

        DB::beginTransaction();
        try {
            // 1. Save / Update Seller Business Profile for future invoices
            BusinessProfile::updateOrCreate(
                ['user_id' => $ownerId],
                [
                    'business_name' => trim($request->seller_name),
                    'address' => $request->seller_address ? trim($request->seller_address) : null,
                    'city' => $request->seller_city ? trim($request->seller_city) : null,
                    'state' => $request->seller_state ? trim($request->seller_state) : null,
                    'pincode' => $request->seller_pincode ? trim($request->seller_pincode) : null,
                    'gst_number' => $request->seller_gst_number ? strtoupper(trim($request->seller_gst_number)) : null,
                    'phone' => $request->seller_phone ? trim($request->seller_phone) : null,
                    'email' => $request->seller_email ? trim($request->seller_email) : null,
                    'pan_number' => $request->seller_pan ? strtoupper(trim($request->seller_pan)) : null,
                    'terms_and_conditions' => $request->terms ? trim($request->terms) : null,
                ]
            );

            // 2. Save / Update Customer Data (Name, Address, GSTIN, Phone, State) for future reuse
            if (!empty($request->customer_name)) {
                Customer::updateOrCreate(
                    [
                        'user_id' => $ownerId,
                        'name' => trim($request->customer_name),
                    ],
                    [
                        'address' => $request->customer_address ? trim($request->customer_address) : null,
                        'gst_number' => $request->customer_gst_number ? strtoupper(trim($request->customer_gst_number)) : null,
                        'phone' => $request->customer_phone ? trim($request->customer_phone) : null,
                        'state' => $request->customer_state ? trim($request->customer_state) : null,
                    ]
                );
            }

            // 3. Calculate Totals and Breakdown
            $taxType = $request->tax_type === 'inter_state' ? 'inter_state' : 'intra_state';
            $grossDiscount = max(0, (float) ($request->gross_discount ?? 0));
            $subtotal = 0;
            $lineDiscount = 0;
            $cgstAmount = 0;
            $sgstAmount = 0;
            $igstAmount = 0;
            $totalTax = 0;

            $itemsData = [];
            foreach ($request->items as $row) {
                $qty = max(0.001, (float) ($row['quantity'] ?? 1));
                $rate = max(0, (float) ($row['rate'] ?? 0));
                $discPct = max(0, min(100, (float) ($row['discount_percent'] ?? 0)));
                $gstRate = max(0, min(100, (float) ($row['gst_rate'] ?? 0)));
                $dim = !empty($row['dimension']) ? trim($row['dimension']) : null;

                $rowSubtotal = $qty * $rate;
                $rowDiscount = ($rowSubtotal * $discPct) / 100;
                $rowTaxable = max(0, $rowSubtotal - $rowDiscount);

                $rowCgstRate = 0;
                $rowCgstAmt = 0;
                $rowSgstRate = 0;
                $rowSgstAmt = 0;
                $rowIgstRate = 0;
                $rowIgstAmt = 0;

                if ($taxType === 'inter_state') {
                    $rowIgstRate = $gstRate;
                    $rowIgstAmt = ($rowTaxable * $rowIgstRate) / 100;
                } else {
                    $rowCgstRate = $gstRate / 2;
                    $rowCgstAmt = ($rowTaxable * $rowCgstRate) / 100;
                    $rowSgstRate = $gstRate / 2;
                    $rowSgstAmt = ($rowTaxable * $rowSgstRate) / 100;
                }

                $rowTotal = $rowTaxable + $rowCgstAmt + $rowSgstAmt + $rowIgstAmt;

                $subtotal += $rowSubtotal;
                $lineDiscount += $rowDiscount;
                $cgstAmount += $rowCgstAmt;
                $sgstAmount += $rowSgstAmt;
                $igstAmount += $rowIgstAmt;
                $totalTax += ($rowCgstAmt + $rowSgstAmt + $rowIgstAmt);

                $invId = !empty($row['inventory_id']) ? (int) $row['inventory_id'] : null;
                if (!$invId && !empty($row['item_name'])) {
                    $matched = Inventory::whereIn('user_id', $ownerIds)->where('item', trim($row['item_name']))->first();
                    if ($matched) {
                        $invId = $matched->id;
                    }
                }

                $itemsData[] = [
                    'inventory_id' => $invId,
                    'item_name' => trim($row['item_name']),
                    'hsn_sac' => !empty($row['hsn_sac']) ? trim($row['hsn_sac']) : null,
                    'dimension' => $dim,
                    'quantity' => $qty,
                    'unit' => !empty($row['unit']) ? strtoupper(trim($row['unit'])) : 'PCS',
                    'rate' => $rate,
                    'discount_percent' => $discPct,
                    'discount_amount' => round($rowDiscount, 2),
                    'taxable_value' => round($rowTaxable, 2),
                    'gst_rate' => $gstRate,
                    'cgst_rate' => $rowCgstRate,
                    'cgst_amount' => round($rowCgstAmt, 2),
                    'sgst_rate' => $rowSgstRate,
                    'sgst_amount' => round($rowSgstAmt, 2),
                    'igst_rate' => $rowIgstRate,
                    'igst_amount' => round($rowIgstAmt, 2),
                    'total_amount' => round($rowTotal, 2),
                ];
            }

            // If gross discount is provided at bill level, adjust tax proportionally if applicable or adjust taxable amount
            $totalDiscount = $lineDiscount + $grossDiscount;
            $taxableAmount = max(0, $subtotal - $totalDiscount);

            // Re-scale GST if gross discount is applied post-item
            if ($grossDiscount > 0 && ($subtotal - $lineDiscount) > 0) {
                $discountRatio = max(0, 1 - ($grossDiscount / ($subtotal - $lineDiscount)));
                $cgstAmount = round($cgstAmount * $discountRatio, 2);
                $sgstAmount = round($sgstAmount * $discountRatio, 2);
                $igstAmount = round($igstAmount * $discountRatio, 2);
                $totalTax = round($cgstAmount + $sgstAmount + $igstAmount, 2);
            }

            $rawTotal = $taxableAmount + $totalTax;
            $roundedTotal = round($rawTotal);
            $roundOff = round($roundedTotal - $rawTotal, 2);

            $status = in_array($request->status, ['Paid', 'Unpaid', 'Partially Paid']) ? $request->status : 'Paid';
            $paidAmount = 0;
            $paidAt = null;
            if ($status === 'Paid') {
                $paidAmount = $roundedTotal;
                $paidAt = $request->invoice_date ?: date('Y-m-d');
            } elseif ($status === 'Partially Paid') {
                $paidAmount = max(0, min($roundedTotal, (float) ($request->paid_amount ?? 0)));
            }

            // 4. Create Invoice Record
            $invoice = Invoice::create([
                'user_id' => $ownerId,
                'invoice_number' => trim($request->invoice_number),
                'invoice_date' => $request->invoice_date,
                'due_date' => $request->due_date ?: null,
                'status' => $status,
                'tax_type' => $taxType,
                'seller_name' => trim($request->seller_name),
                'seller_address' => $request->seller_address ? trim($request->seller_address) : null,
                'seller_gst_number' => $request->seller_gst_number ? strtoupper(trim($request->seller_gst_number)) : null,
                'seller_phone' => $request->seller_phone ? trim($request->seller_phone) : null,
                'seller_state' => $request->seller_state ? trim($request->seller_state) : null,
                'customer_name' => trim($request->customer_name),
                'customer_address' => $request->customer_address ? trim($request->customer_address) : null,
                'customer_gst_number' => $request->customer_gst_number ? strtoupper(trim($request->customer_gst_number)) : null,
                'customer_phone' => $request->customer_phone ? trim($request->customer_phone) : null,
                'customer_state' => $request->customer_state ? trim($request->customer_state) : null,
                'place_of_supply' => $request->place_of_supply ? trim($request->place_of_supply) : ($request->customer_state ?: null),
                'subtotal' => round($subtotal, 2),
                'gross_discount' => round($grossDiscount, 2),
                'total_discount' => round($totalDiscount, 2),
                'taxable_amount' => round($taxableAmount, 2),
                'cgst_amount' => round($cgstAmount, 2),
                'sgst_amount' => round($sgstAmount, 2),
                'igst_amount' => round($igstAmount, 2),
                'total_tax' => round($totalTax, 2),
                'round_off' => $roundOff,
                'total_amount' => $roundedTotal,
                'paid_amount' => round($paidAmount, 2),
                'paid_at' => $paidAt,
                'notes' => $request->notes ? trim($request->notes) : null,
                'terms' => $request->terms ? trim($request->terms) : null,
            ]);

            // 5. Create Items & Deduct quantity from Inventory
            foreach ($itemsData as $it) {
                $createdItem = $invoice->items()->create($it);

                // Deduct real quantity from inventory whenever item is linked to inventory or matches name
                $inv = null;
                if (!empty($createdItem->inventory_id)) {
                    $inv = Inventory::whereIn('user_id', $ownerIds)->where('id', $createdItem->inventory_id)->first();
                }
                if (!$inv && !empty($createdItem->item_name)) {
                    $inv = Inventory::whereIn('user_id', $ownerIds)->where('item', trim($createdItem->item_name))->first();
                }
                if ($inv) {
                    $inv->decrement('qty', (float) $createdItem->quantity);
                }
            }

            DB::commit();

            $waSentDirectly = false;
            $waFailed = false;
            if ($request->boolean('notify_whatsapp') && !empty($invoice->customer_phone)) {
                try {
                    $waService = app(\App\Services\WhatsAppService::class);
                    $res = $waService->sendInvoiceDocument($invoice, 'bill_created');
                    if (($res['status'] ?? '') === 'sent') {
                        $waSentDirectly = true;
                    } else {
                        $waFailed = true;
                    }
                } catch (\Throwable $waErr) {
                    \Illuminate\Support\Facades\Log::warning("WhatsApp notification failed on store: " . $waErr->getMessage());
                }
            }

            if ($waSentDirectly) {
                return redirect()->route('invoices.index')->with('success', "Invoice #{$invoice->invoice_number} created & sent on WhatsApp");
            }

            $redirect = redirect()->route('invoices.index')->with('success', "Invoice #{$invoice->invoice_number} created successfully.");
            if ($waFailed) {
                $redirect->with('warning', "Invoice saved. WhatsApp disconnected — link in WhatsApp Hub.");
            }
            return $redirect;
        } catch (\Throwable $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to generate invoice: ' . $e->getMessage())->withInput();
        }
    }

    public function update(Request $request, $id)
    {
        $ownerIds = $this->getStoreUserIds();
        $isSuperAdmin = auth()->user()?->isSuperAdmin();

        $query = Invoice::where('id', $id)->with('items');
        if (!$isSuperAdmin) {
            $query->whereIn('user_id', $ownerIds);
        }
        $invoice = $query->firstOrFail();

        $request->validate([
            'invoice_number' => [
                'required',
                'string',
                'max:100',
                Rule::unique('invoices', 'invoice_number')->where(fn ($query) => $query->whereIn('user_id', $ownerIds))->ignore($invoice->id),
            ],
            'invoice_date' => 'required|date',
            'customer_name' => 'required|string|max:255',
            'seller_name' => 'required|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.item_name' => 'required|string|max:255',
            'items.*.dimension' => 'nullable|string|max:100',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.rate' => 'required|numeric|min:0',
        ]);

        $ownerId = $invoice->user_id;

        DB::beginTransaction();
        try {
            // Restore previous inventory stock that was deducted by old items
            foreach ($invoice->items as $oldItem) {
                $inv = null;
                if (!empty($oldItem->inventory_id)) {
                    $inv = Inventory::whereIn('user_id', $ownerIds)->where('id', $oldItem->inventory_id)->first();
                }
                if (!$inv && !empty($oldItem->item_name)) {
                    $inv = Inventory::whereIn('user_id', $ownerIds)->where('item', trim($oldItem->item_name))->first();
                }
                if ($inv) {
                    $inv->increment('qty', (float) $oldItem->quantity);
                }
            }

            // Stock validation for new items
            foreach ($request->items as $row) {
                $qty = max(0.001, (float) ($row['quantity'] ?? 1));
                $invId = !empty($row['inventory_id']) ? (int) $row['inventory_id'] : null;

                $inventoryItem = null;
                if ($invId) {
                    $inventoryItem = Inventory::whereIn('user_id', $ownerIds)->where('id', $invId)->first();
                } elseif (!empty($row['item_name'])) {
                    $inventoryItem = Inventory::whereIn('user_id', $ownerIds)
                        ->where('item', trim($row['item_name']))
                        ->first();
                }

                if ($inventoryItem && $qty > (float) $inventoryItem->qty) {
                    DB::rollBack();
                    $unitStr = $inventoryItem->unit ?: 'PCS';
                    return back()->with('error', "Quantity for item '{$inventoryItem->item}' ({$qty}) exceeds actual inventory stock ({$inventoryItem->qty} {$unitStr}).")->withInput();
                }
            }

            // Update business profile
            BusinessProfile::updateOrCreate(
                ['user_id' => $ownerId],
                [
                    'business_name' => trim($request->seller_name),
                    'address' => $request->seller_address ? trim($request->seller_address) : null,
                    'city' => $request->seller_city ? trim($request->seller_city) : null,
                    'state' => $request->seller_state ? trim($request->seller_state) : null,
                    'pincode' => $request->seller_pincode ? trim($request->seller_pincode) : null,
                    'gst_number' => $request->seller_gst_number ? strtoupper(trim($request->seller_gst_number)) : null,
                    'phone' => $request->seller_phone ? trim($request->seller_phone) : null,
                    'email' => $request->seller_email ? trim($request->seller_email) : null,
                    'pan_number' => $request->seller_pan ? strtoupper(trim($request->seller_pan)) : null,
                    'terms_and_conditions' => $request->terms ? trim($request->terms) : null,
                ]
            );

            // Save or Update Customer Details for future use
            if (!empty($request->customer_name)) {
                Customer::updateOrCreate(
                    [
                        'user_id' => $ownerId,
                        'name' => trim($request->customer_name),
                    ],
                    [
                        'address' => $request->customer_address ? trim($request->customer_address) : null,
                        'gst_number' => $request->customer_gst_number ? strtoupper(trim($request->customer_gst_number)) : null,
                        'phone' => $request->customer_phone ? trim($request->customer_phone) : null,
                        'state' => $request->customer_state ? trim($request->customer_state) : null,
                    ]
                );
            }

            $taxType = $request->tax_type === 'inter_state' ? 'inter_state' : 'intra_state';
            $grossDiscount = max(0, (float) ($request->gross_discount ?? 0));
            $subtotal = 0;
            $lineDiscount = 0;
            $cgstAmount = 0;
            $sgstAmount = 0;
            $igstAmount = 0;
            $totalTax = 0;

            $itemsData = [];
            foreach ($request->items as $row) {
                $qty = max(0.001, (float) ($row['quantity'] ?? 1));
                $rate = max(0, (float) ($row['rate'] ?? 0));
                $discPct = max(0, min(100, (float) ($row['discount_percent'] ?? 0)));
                $gstRate = max(0, min(100, (float) ($row['gst_rate'] ?? 0)));
                $dim = !empty($row['dimension']) ? trim($row['dimension']) : null;

                $rowSubtotal = $qty * $rate;
                $rowDiscount = ($rowSubtotal * $discPct) / 100;
                $rowTaxable = max(0, $rowSubtotal - $rowDiscount);

                $rowCgstRate = 0;
                $rowCgstAmt = 0;
                $rowSgstRate = 0;
                $rowSgstAmt = 0;
                $rowIgstRate = 0;
                $rowIgstAmt = 0;

                if ($taxType === 'inter_state') {
                    $rowIgstRate = $gstRate;
                    $rowIgstAmt = ($rowTaxable * $rowIgstRate) / 100;
                } else {
                    $rowCgstRate = $gstRate / 2;
                    $rowCgstAmt = ($rowTaxable * $rowCgstRate) / 100;
                    $rowSgstRate = $gstRate / 2;
                    $rowSgstAmt = ($rowTaxable * $rowSgstRate) / 100;
                }

                $rowTotal = $rowTaxable + $rowCgstAmt + $rowSgstAmt + $rowIgstAmt;

                $subtotal += $rowSubtotal;
                $lineDiscount += $rowDiscount;
                $cgstAmount += $rowCgstAmt;
                $sgstAmount += $rowSgstAmt;
                $igstAmount += $rowIgstAmt;
                $totalTax += ($rowCgstAmt + $rowSgstAmt + $rowIgstAmt);

                $invId = !empty($row['inventory_id']) ? (int) $row['inventory_id'] : null;
                if (!$invId && !empty($row['item_name'])) {
                    $matched = Inventory::whereIn('user_id', $ownerIds)->where('item', trim($row['item_name']))->first();
                    if ($matched) {
                        $invId = $matched->id;
                    }
                }

                $itemsData[] = [
                    'inventory_id' => $invId,
                    'item_name' => trim($row['item_name']),
                    'hsn_sac' => !empty($row['hsn_sac']) ? trim($row['hsn_sac']) : null,
                    'dimension' => $dim,
                    'quantity' => $qty,
                    'unit' => !empty($row['unit']) ? strtoupper(trim($row['unit'])) : 'PCS',
                    'rate' => $rate,
                    'discount_percent' => $discPct,
                    'discount_amount' => round($rowDiscount, 2),
                    'taxable_value' => round($rowTaxable, 2),
                    'gst_rate' => $gstRate,
                    'cgst_rate' => $rowCgstRate,
                    'cgst_amount' => round($rowCgstAmt, 2),
                    'sgst_rate' => $rowSgstRate,
                    'sgst_amount' => round($rowSgstAmt, 2),
                    'igst_rate' => $rowIgstRate,
                    'igst_amount' => round($rowIgstAmt, 2),
                    'total_amount' => round($rowTotal, 2),
                ];
            }

            // If gross discount is provided at bill level, adjust tax proportionally if applicable or adjust taxable amount
            $totalDiscount = $lineDiscount + $grossDiscount;
            $taxableAmount = max(0, $subtotal - $totalDiscount);

            if ($grossDiscount > 0 && ($subtotal - $lineDiscount) > 0) {
                $discountRatio = max(0, 1 - ($grossDiscount / ($subtotal - $lineDiscount)));
                $cgstAmount = round($cgstAmount * $discountRatio, 2);
                $sgstAmount = round($sgstAmount * $discountRatio, 2);
                $igstAmount = round($igstAmount * $discountRatio, 2);
                $totalTax = round($cgstAmount + $sgstAmount + $igstAmount, 2);
            }

            $rawTotal = $taxableAmount + $totalTax;
            $roundedTotal = round($rawTotal);
            $roundOff = round($roundedTotal - $rawTotal, 2);

            $status = in_array($request->status, ['Paid', 'Unpaid', 'Partially Paid']) ? $request->status : 'Paid';
            $paidAmount = 0;
            $paidAt = null;
            if ($status === 'Paid') {
                $paidAmount = $roundedTotal;
                $paidAt = $invoice->paid_at ?: ($request->invoice_date ?: date('Y-m-d'));
            } elseif ($status === 'Partially Paid') {
                $paidAmount = max(0, min($roundedTotal, (float) ($request->paid_amount ?? $invoice->paid_amount ?? 0)));
            }

            $invoice->update([
                'invoice_number' => trim($request->invoice_number),
                'invoice_date' => $request->invoice_date,
                'due_date' => $request->due_date ?: null,
                'status' => $status,
                'tax_type' => $taxType,
                'seller_name' => trim($request->seller_name),
                'seller_address' => $request->seller_address ? trim($request->seller_address) : null,
                'seller_gst_number' => $request->seller_gst_number ? strtoupper(trim($request->seller_gst_number)) : null,
                'seller_phone' => $request->seller_phone ? trim($request->seller_phone) : null,
                'seller_state' => $request->seller_state ? trim($request->seller_state) : null,
                'customer_name' => trim($request->customer_name),
                'customer_address' => $request->customer_address ? trim($request->customer_address) : null,
                'customer_gst_number' => $request->customer_gst_number ? strtoupper(trim($request->customer_gst_number)) : null,
                'customer_phone' => $request->customer_phone ? trim($request->customer_phone) : null,
                'customer_state' => $request->customer_state ? trim($request->customer_state) : null,
                'place_of_supply' => $request->place_of_supply ? trim($request->place_of_supply) : ($request->customer_state ?: null),
                'subtotal' => round($subtotal, 2),
                'gross_discount' => round($grossDiscount, 2),
                'total_discount' => round($totalDiscount, 2),
                'taxable_amount' => round($taxableAmount, 2),
                'cgst_amount' => round($cgstAmount, 2),
                'sgst_amount' => round($sgstAmount, 2),
                'igst_amount' => round($igstAmount, 2),
                'total_tax' => round($totalTax, 2),
                'round_off' => $roundOff,
                'total_amount' => $roundedTotal,
                'paid_amount' => round($paidAmount, 2),
                'paid_at' => $paidAt,
                'notes' => $request->notes ? trim($request->notes) : null,
            ]);

            // Replace items and apply new deductions
            $invoice->items()->delete();
            foreach ($itemsData as $it) {
                $createdItem = $invoice->items()->create($it);

                $inv = null;
                if (!empty($createdItem->inventory_id)) {
                    $inv = Inventory::whereIn('user_id', $ownerIds)->where('id', $createdItem->inventory_id)->first();
                }
                if (!$inv && !empty($createdItem->item_name)) {
                    $inv = Inventory::whereIn('user_id', $ownerIds)->where('item', trim($createdItem->item_name))->first();
                }
                if ($inv) {
                    $inv->decrement('qty', (float) $createdItem->quantity);
                }
            }

            DB::commit();

            $waSentDirectly = false;
            $waFailed = false;
            if ($request->boolean('notify_whatsapp') && !empty($invoice->customer_phone)) {
                try {
                    $waService = app(\App\Services\WhatsAppService::class);
                    $res = $waService->sendInvoiceDocument($invoice, 'bill_updated');
                    if (($res['status'] ?? '') === 'sent') {
                        $waSentDirectly = true;
                    } else {
                        $waFailed = true;
                    }
                } catch (\Throwable $waErr) {
                    \Illuminate\Support\Facades\Log::warning("WhatsApp notification failed on update: " . $waErr->getMessage());
                }
            }

            if ($waSentDirectly) {
                return redirect()->route('invoices.index')->with('success', "Invoice #{$invoice->invoice_number} updated & sent on WhatsApp");
            }

            $redirect = redirect()->route('invoices.index')->with('success', "Invoice #{$invoice->invoice_number} updated successfully.");
            if ($waFailed) {
                $redirect->with('warning', "Invoice updated. WhatsApp disconnected — link in WhatsApp Hub.");
            }
            return $redirect;
        } catch (\Throwable $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to update invoice: ' . $e->getMessage())->withInput();
        }
    }

    public function destroy($id)
    {
        $ownerIds = $this->getStoreUserIds();
        $isSuperAdmin = auth()->user()?->isSuperAdmin();

        $query = Invoice::where('id', $id)->with('items');
        if (!$isSuperAdmin) {
            $query->whereIn('user_id', $ownerIds);
        }
        $invoice = $query->firstOrFail();
        $num = $invoice->invoice_number;

        DB::beginTransaction();
        try {
            // Restore inventory stock for items
            foreach ($invoice->items as $item) {
                $inv = null;
                if (!empty($item->inventory_id)) {
                    $inv = Inventory::whereIn('user_id', $ownerIds)->where('id', $item->inventory_id)->first();
                }
                if (!$inv && !empty($item->item_name)) {
                    $inv = Inventory::whereIn('user_id', $ownerIds)->where('item', trim($item->item_name))->first();
                }
                if ($inv) {
                    $inv->increment('qty', (float) $item->quantity);
                }
            }

            $invoice->delete();
            DB::commit();

            return redirect()->route('invoices.index')->with('success', "Invoice #{$num} deleted successfully.");
        } catch (\Throwable $e) {
            DB::rollBack();
            return back()->with('error', 'Failed to delete invoice: ' . $e->getMessage());
        }
    }

    public function destroyCustomer($id)
    {
        $ownerIds = $this->getStoreUserIds();
        $isSuperAdmin = auth()->user()?->isSuperAdmin();

        $query = Customer::where('id', $id);
        if (!$isSuperAdmin) {
            $query->whereIn('user_id', $ownerIds);
        }
        $customer = $query->firstOrFail();
        $name = $customer->name;
        $customer->delete();

        if (request()->wantsJson() && !request()->header('X-Inertia')) {
            return response()->json([
                'success' => true,
                'message' => "Customer '{$name}' deleted successfully.",
            ]);
        }

        return back()->with('success', "Customer '{$name}' deleted successfully.");
    }

    public function print($id)
    {
        $ownerIds = $this->getStoreUserIds();
        $isSuperAdmin = auth()->user()?->isSuperAdmin();

        $query = Invoice::where('id', $id)->with(['items']);
        if (!$isSuperAdmin) {
            $query->whereIn('user_id', $ownerIds);
        }
        $invoice = $query->firstOrFail();

        $businessProfile = BusinessProfile::where('user_id', $invoice->user_id)->first();

        return Inertia::render('Invoices/Print', [
            'invoice' => $invoice,
            'businessProfile' => $businessProfile,
        ]);
    }

    public function searchInventory(Request $request)
    {
        $ownerIds = $this->getStoreUserIds();
        $q = trim($request->input('q', ''));

        $query = Inventory::whereIn('user_id', $ownerIds);

        if (!empty($q)) {
            $query->where(function ($sub) use ($q) {
                $sub->where('item', 'LIKE', "%{$q}%")
                    ->orWhere('code', 'LIKE', "%{$q}%");
            });
        }

        $items = $query->orderBy('item', 'asc')
            ->limit(25)
            ->get(['id', 'item', 'code', 'selling_price', 'qty', 'unit']);

        return response()->json($items);
    }

    public function downloadTemplate()
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="sales_import_sample.csv"',
        ];

        $callback = function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'Invoice Number', 'Invoice Date', 'Customer Name', 'Customer Phone', 'Customer GSTIN',
                'Customer Address', 'Place of Supply', 'Item Name', 'HSN SAC', 'Quantity', 'Unit',
                'Rate', 'Discount %', 'GST %', 'Total Amount', 'Paid Amount', 'Status', 'Notes'
            ]);
            // Multi-item sales invoice #INV-2026-0001
            fputcsv($handle, [
                'INV-2026-0001', '2026-10-20', 'Metro Retailers Pvt Ltd', '9820012345', '27ABCDE1234F1Z5',
                'Shop 12, Commercial Complex, Mumbai', 'Maharashtra', 'Wireless Keyboard & Mouse Combo', '8471',
                '5', 'PCS', '1499.00', '10', '18', '7952.19', '7952.19', 'Paid', 'Thank you for your order'
            ]);
            fputcsv($handle, [
                'INV-2026-0001', '2026-10-20', 'Metro Retailers Pvt Ltd', '9820012345', '27ABCDE1234F1Z5',
                'Shop 12, Commercial Complex, Mumbai', 'Maharashtra', 'USB-C Fast Charging Cable 1.5m', '8471',
                '10', 'PCS', '299.00', '5', '18', '3351.79', '3351.79', 'Paid', ''
            ]);
            // Single-item sales invoice #INV-2026-0002
            fputcsv($handle, [
                'INV-2026-0002', '2026-10-22', 'Ramesh Patel', '9988776655', '',
                'Station Road, Surat', 'Gujarat', 'Thermal Billing Paper Roll 80mm', '4811',
                '20', 'ROLL', '65.00', '0', '12', '1456.00', '1000.00', 'Partially Paid', 'Advance via GPay'
            ]);
            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function import(Request $request)
    {
        $ownerId = $this->getOwnerId();
        if ($ownerId <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'Please select or switch to an active store before importing sales invoices.',
            ], 422);
        }

        $invoices = $request->input('invoices', []);
        $syncInventory = $request->boolean('sync_inventory', false);
        $createCustomers = $request->boolean('create_customers', true);
        $duplicateAction = $request->input('duplicate_action', 'skip'); // 'skip', 'create_new'

        if (!is_array($invoices) || empty($invoices)) {
            return response()->json([
                'success' => false,
                'message' => 'No sales invoices found to import.',
            ], 422);
        }

        $businessProfile = BusinessProfile::where('user_id', $ownerId)->first();
        $sellerState = $businessProfile?->state ?? '';

        $created = 0;
        $skipped = 0;
        $customersCreated = 0;
        $totalItemsCount = 0;
        $errors = [];

        DB::transaction(function () use (
            $invoices, $ownerId, $businessProfile, $sellerState,
            $syncInventory, $createCustomers, $duplicateAction,
            &$created, &$skipped, &$customersCreated, &$totalItemsCount, &$errors
        ) {
            $ownerIds = $this->getStoreUserIds();

            foreach ($invoices as $index => $invData) {
                $invNumber = trim((string)($invData['invoice_number'] ?? ''));

                // Handle missing or duplicate invoice numbers
                $exists = false;
                if (!empty($invNumber)) {
                    $exists = Invoice::whereIn('user_id', $ownerIds)
                        ->where('invoice_number', $invNumber)
                        ->exists();
                }

                if ($exists) {
                    if ($duplicateAction === 'skip') {
                        $skipped++;
                        continue;
                    }
                    // duplicateAction === 'create_new'
                    $invNumber = Invoice::generateNextNumber($ownerIds);
                } elseif (empty($invNumber)) {
                    $invNumber = Invoice::generateNextNumber($ownerIds);
                }

                $customerName = trim((string)($invData['customer_name'] ?? 'Cash Customer'));
                if ($customerName === '') $customerName = 'Cash Customer';

                $customerPhone = !empty($invData['customer_phone']) ? trim((string)$invData['customer_phone']) : null;
                $customerGst = !empty($invData['customer_gst_number']) ? strtoupper(trim((string)$invData['customer_gst_number'])) : null;
                $customerAddress = !empty($invData['customer_address']) ? trim((string)$invData['customer_address']) : null;
                $placeOfSupply = !empty($invData['place_of_supply']) ? trim((string)$invData['place_of_supply']) : null;
                $customerState = $placeOfSupply;

                // Auto-create customer if requested and not anonymous
                if ($createCustomers && $customerName !== 'Cash Customer') {
                    $existingCustomer = Customer::whereIn('user_id', $ownerIds)
                        ->whereRaw('LOWER(name) = LOWER(?)', [$customerName])
                        ->first();

                    if (!$existingCustomer) {
                        Customer::create([
                            'user_id' => $ownerId,
                            'name' => $customerName,
                            'phone' => $customerPhone,
                            'gst_number' => $customerGst,
                            'address' => $customerAddress,
                            'state' => $customerState,
                        ]);
                        $customersCreated++;
                    }
                }

                $invoiceDate = !empty($invData['invoice_date'])
                    ? date('Y-m-d', strtotime($invData['invoice_date']))
                    : date('Y-m-d');

                $dueDate = !empty($invData['due_date'])
                    ? date('Y-m-d', strtotime($invData['due_date']))
                    : null;

                $rawItems = is_array($invData['items'] ?? null) ? $invData['items'] : [];
                if (empty($rawItems)) {
                    $rawItems = [[
                        'item_name' => 'Imported Sales Item',
                        'quantity' => 1,
                        'rate' => (float)($invData['total_amount'] ?? 0),
                        'unit' => 'PCS',
                        'gst_rate' => 0,
                    ]];
                }

                // Check intra-state vs inter-state
                $isInterState = false;
                if (!empty($sellerState) && !empty($placeOfSupply) && strcasecmp($sellerState, $placeOfSupply) !== 0) {
                    $isInterState = true;
                }

                $itemsData = [];
                $subtotal = 0;
                $totalDiscount = 0;
                $cgstAmount = 0;
                $sgstAmount = 0;
                $igstAmount = 0;

                foreach ($rawItems as $it) {
                    $itemName = trim((string)($it['item_name'] ?? 'Item'));
                    if ($itemName === '') $itemName = 'Item';

                    $qty = max(0.001, (float)($it['quantity'] ?? 1));
                    $rate = max(0, (float)($it['rate'] ?? 0));
                    $unit = !empty($it['unit']) ? strtoupper(trim((string)$it['unit'])) : 'PCS';
                    $discPct = isset($it['discount_percent']) && is_numeric($it['discount_percent']) ? (float)$it['discount_percent'] : 0;
                    $gstRate = isset($it['gst_rate']) && is_numeric($it['gst_rate']) ? (float)$it['gst_rate'] : 0;

                    $lineGross = $qty * $rate;
                    $lineDisc = round($lineGross * ($discPct / 100), 2);
                    $lineTaxable = max(0, $lineGross - $lineDisc);

                    $rowCgstRate = 0;
                    $rowSgstRate = 0;
                    $rowIgstRate = 0;
                    $rowCgstAmt = 0;
                    $rowSgstAmt = 0;
                    $rowIgstAmt = 0;

                    if ($gstRate > 0) {
                        if ($isInterState) {
                            $rowIgstRate = $gstRate;
                            $rowIgstAmt = round($lineTaxable * ($gstRate / 100), 2);
                        } else {
                            $rowCgstRate = round($gstRate / 2, 2);
                            $rowSgstRate = round($gstRate / 2, 2);
                            $rowCgstAmt = round($lineTaxable * ($rowCgstRate / 100), 2);
                            $rowSgstAmt = round($lineTaxable * ($rowSgstRate / 100), 2);
                        }
                    }

                    $rowTotalTax = $rowCgstAmt + $rowSgstAmt + $rowIgstAmt;
                    $rowTotal = $lineTaxable + $rowTotalTax;

                    // Match inventory item if available
                    $inv = Inventory::whereIn('user_id', $ownerIds)
                        ->whereRaw('LOWER(item) = LOWER(?)', [$itemName])
                        ->first();

                    $itemsData[] = [
                        'inventory_id' => $inv?->id,
                        'item_name' => $itemName,
                        'hsn_sac' => !empty($it['hsn_sac']) ? trim((string)$it['hsn_sac']) : null,
                        'quantity' => $qty,
                        'unit' => $unit,
                        'rate' => $rate,
                        'discount_percent' => $discPct,
                        'discount_amount' => $lineDisc,
                        'taxable_value' => round($lineTaxable, 2),
                        'gst_rate' => $gstRate,
                        'cgst_rate' => $rowCgstRate,
                        'cgst_amount' => $rowCgstAmt,
                        'sgst_rate' => $rowSgstRate,
                        'sgst_amount' => $rowSgstAmt,
                        'igst_rate' => $rowIgstRate,
                        'igst_amount' => $rowIgstAmt,
                        'total_amount' => round($rowTotal, 2),
                    ];

                    $subtotal += $lineGross;
                    $totalDiscount += $lineDisc;
                    $cgstAmount += $rowCgstAmt;
                    $sgstAmount += $rowSgstAmt;
                    $igstAmount += $rowIgstAmt;
                }

                $taxableAmount = max(0, $subtotal - $totalDiscount);
                $totalTax = round($cgstAmount + $sgstAmount + $igstAmount, 2);
                $rawTotal = $taxableAmount + $totalTax;
                $roundedTotal = round($rawTotal);
                $roundOff = round($roundedTotal - $rawTotal, 2);

                if (!empty($invData['total_amount']) && (float)$invData['total_amount'] > 0) {
                    $roundedTotal = (float)$invData['total_amount'];
                }

                $status = in_array($invData['status'] ?? '', ['Paid', 'Unpaid', 'Partially Paid'])
                    ? $invData['status']
                    : 'Paid';

                $paidAmount = 0;
                $paidAt = null;
                if ($status === 'Paid') {
                    $paidAmount = $roundedTotal;
                    $paidAt = $invoiceDate;
                } elseif ($status === 'Partially Paid') {
                    $paidAmount = max(0, min($roundedTotal, (float)($invData['paid_amount'] ?? 0)));
                }

                $invoice = Invoice::create([
                    'user_id' => $ownerId,
                    'invoice_number' => $invNumber,
                    'invoice_date' => $invoiceDate,
                    'due_date' => $dueDate,
                    'status' => $status,
                    'tax_type' => $isInterState ? 'inter_state' : 'intra_state',
                    'seller_name' => $businessProfile->business_name ?? 'My Business',
                    'seller_address' => $businessProfile->address ?? null,
                    'seller_gst_number' => $businessProfile->gst_number ?? null,
                    'seller_phone' => $businessProfile->phone ?? null,
                    'seller_state' => $businessProfile->state ?? null,
                    'customer_name' => $customerName,
                    'customer_address' => $customerAddress,
                    'customer_gst_number' => $customerGst,
                    'customer_phone' => $customerPhone,
                    'customer_state' => $customerState,
                    'place_of_supply' => $placeOfSupply ?: $customerState,
                    'subtotal' => round($subtotal, 2),
                    'gross_discount' => 0,
                    'total_discount' => round($totalDiscount, 2),
                    'taxable_amount' => round($taxableAmount, 2),
                    'cgst_amount' => round($cgstAmount, 2),
                    'sgst_amount' => round($sgstAmount, 2),
                    'igst_amount' => round($igstAmount, 2),
                    'total_tax' => $totalTax,
                    'round_off' => $roundOff,
                    'total_amount' => $roundedTotal,
                    'paid_amount' => round($paidAmount, 2),
                    'paid_at' => $paidAt,
                    'notes' => !empty($invData['notes']) ? trim((string)$invData['notes']) : null,
                ]);

                foreach ($itemsData as $itData) {
                    $createdItem = $invoice->items()->create($itData);

                    // If user opted to sync inventory, deduct quantity from matching inventory item
                    if ($syncInventory) {
                        $matchedInv = null;
                        if (!empty($createdItem->inventory_id)) {
                            $matchedInv = Inventory::whereIn('user_id', $ownerIds)->where('id', $createdItem->inventory_id)->first();
                        }
                        if (!$matchedInv && !empty($createdItem->item_name)) {
                            $matchedInv = Inventory::whereIn('user_id', $ownerIds)->whereRaw('LOWER(item) = LOWER(?)', [trim($createdItem->item_name)])->first();
                        }
                        if ($matchedInv) {
                            $matchedInv->decrement('qty', (float)$createdItem->quantity);
                        }
                    }
                }

                $totalItemsCount += count($itemsData);
                $created++;
            }
        });

        return response()->json([
            'success' => true,
            'message' => "Sales invoices imported successfully: {$created} invoices created, {$skipped} skipped.",
            'summary' => [
                'total_invoices' => count($invoices),
                'created' => $created,
                'skipped' => $skipped,
                'customers_created' => $customersCreated,
                'total_items' => $totalItemsCount,
                'errors' => $errors,
            ],
        ]);
    }
}
