<?php

namespace App\Http\Controllers;

use App\Models\BusinessProfile;
use App\Models\Customer;
use App\Models\DeliveryChallan;
use App\Models\DeliveryChallanItem;
use App\Models\Inventory;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Quotation;
use App\Models\QuotationItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class QuotationController extends Controller
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

    public function index()
    {
        $ownerId = $this->getOwnerId();
        $ownerIds = $this->getStoreUserIds();

        $quotations = Quotation::whereIn('user_id', $ownerIds)
            ->with('items')
            ->orderBy('created_at', 'desc')
            ->get();

        $challans = DeliveryChallan::whereIn('user_id', $ownerIds)
            ->with('items')
            ->orderBy('created_at', 'desc')
            ->get();

        $customers = Customer::whereIn('user_id', $ownerIds)->orderBy('name')->get();
        $inventory = Inventory::whereIn('user_id', $ownerIds)->select('id', 'item', 'selling_price as price', 'code as barcode', 'unit')->get();
        $businessProfile = BusinessProfile::where('user_id', $ownerId)->first();

        // Invoices with items for quick 1-click Delivery Challan generation
        $invoices = Invoice::whereIn('user_id', $ownerIds)
            ->with('items')
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        return Inertia::render('Quotations/Index', [
            'quotations' => $quotations,
            'challans' => $challans,
            'customers' => $customers,
            'inventoryList' => $inventory,
            'invoices' => $invoices,
            'businessProfile' => $businessProfile,
        ]);
    }

    public function store(Request $request)
    {
        $userId = $this->getOwnerId();
        $ownerIds = $this->getStoreUserIds();

        if (!$request->filled('quotation_number')) {
            $request->merge(['quotation_number' => Quotation::generateNextNumber($ownerIds)]);
        }

        // Convert empty strings to null for nullable fields so email and date validation don't fail
        if ($request->input('customer_email') === '') {
            $request->merge(['customer_email' => null]);
        }
        if ($request->input('valid_until') === '') {
            $request->merge(['valid_until' => null]);
        }

        // Clean & calculate item amounts and totals
        if ($request->has('items') && is_array($request->items)) {
            $items = [];
            $subtotal = 0;
            $totalTax = 0;
            foreach ($request->items as $it) {
                $q = max(0.001, (float) ($it['quantity'] ?? 1));
                $r = (float) ($it['rate'] ?? 0);
                $disc = (float) ($it['discount_percent'] ?? 0);
                $taxR = (float) ($it['tax_rate'] ?? 0);
                $taxable = max(0, ($q * $r) - (($q * $r * $disc) / 100));
                $tax = ($taxable * $taxR) / 100;
                $amt = isset($it['amount']) && is_numeric($it['amount']) ? (float) $it['amount'] : ($taxable + $tax);

                $it['quantity'] = $q;
                $it['rate'] = $r;
                $it['discount_percent'] = $disc;
                $it['tax_rate'] = $taxR;
                $it['amount'] = round($amt, 2);
                $items[] = $it;

                $subtotal += $taxable;
                $totalTax += $tax;
            }
            $request->merge(['items' => $items]);

            $grossDisc = max(0, (float) ($request->input('gross_discount') ?? 0));
            $taxableAfterGross = max(0, $subtotal - $grossDisc);
            if ($grossDisc > 0 && $subtotal > 0) {
                $totalTax = round($totalTax * ($taxableAfterGross / $subtotal), 2);
            }

            if (!$request->filled('subtotal') || (float) $request->input('subtotal') <= 0) {
                $request->merge(['subtotal' => round($subtotal, 2)]);
            }
            $request->merge(['taxable_amount' => round($taxableAfterGross, 2)]);
            $request->merge(['total_tax' => round($totalTax, 2)]);
            $request->merge(['gross_discount' => round($grossDisc, 2)]);
            if (!$request->filled('total_amount') || (float) $request->input('total_amount') <= 0) {
                $request->merge(['total_amount' => round($taxableAfterGross + $totalTax, 2)]);
            }
        }

        $validated = $request->validate([
            'quotation_number' => 'required|string',
            'quotation_date' => 'required|date',
            'valid_until' => 'nullable|date',
            'customer_name' => 'required|string',
            'customer_phone' => 'nullable|string',
            'customer_email' => 'nullable|email',
            'customer_address' => 'nullable|string',
            'customer_gst' => 'nullable|string',
            'status' => 'required|string|in:Pending,Accepted,Converted,Rejected',
            'subtotal' => 'nullable|numeric|min:0',
            'gross_discount' => 'nullable|numeric|min:0',
            'total_discount' => 'nullable|numeric|min:0',
            'taxable_amount' => 'nullable|numeric|min:0',
            'total_tax' => 'nullable|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            'applied_margin_percent' => 'nullable|numeric',
            'applied_margin_amount' => 'nullable|numeric',
            'notes' => 'nullable|string',
            'terms' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.hsn_sac' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit' => 'nullable|string',
            'items.*.rate' => 'required|numeric|min:0',
            'items.*.discount_percent' => 'nullable|numeric|min:0|max:100',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
            'items.*.amount' => 'required|numeric|min:0',
            'items.*.cost_price' => 'nullable|numeric',
            'items.*.margin_percent' => 'nullable|numeric',
        ]);

        $validated['user_id'] = $userId;

        DB::transaction(function () use ($validated) {
            $quotation = Quotation::create(\Illuminate\Support\Arr::except($validated, ['items']));
            $quotation->items()->createMany($validated['items']);
        });

        return redirect()->route('quotations.index')->with('success', "Quotation #{$validated['quotation_number']} created.");
    }

    public function update(Request $request, $id)
    {
        $ownerIds = $this->getStoreUserIds();
        $quotation = Quotation::whereIn('user_id', $ownerIds)->findOrFail($id);

        if ($request->input('customer_email') === '') {
            $request->merge(['customer_email' => null]);
        }
        if ($request->input('valid_until') === '') {
            $request->merge(['valid_until' => null]);
        }

        if ($request->has('items') && is_array($request->items)) {
            $items = [];
            $subtotal = 0;
            $totalTax = 0;
            foreach ($request->items as $it) {
                $q = max(0.001, (float) ($it['quantity'] ?? 1));
                $r = (float) ($it['rate'] ?? 0);
                $disc = (float) ($it['discount_percent'] ?? 0);
                $taxR = (float) ($it['tax_rate'] ?? 0);
                $taxable = max(0, ($q * $r) - (($q * $r * $disc) / 100));
                $tax = ($taxable * $taxR) / 100;
                $amt = isset($it['amount']) && is_numeric($it['amount']) ? (float) $it['amount'] : ($taxable + $tax);

                $it['quantity'] = $q;
                $it['rate'] = $r;
                $it['discount_percent'] = $disc;
                $it['tax_rate'] = $taxR;
                $it['amount'] = round($amt, 2);
                $items[] = $it;

                $subtotal += $taxable;
                $totalTax += $tax;
            }
            $request->merge(['items' => $items]);

            $grossDisc = max(0, (float) ($request->input('gross_discount') ?? 0));
            $taxableAfterGross = max(0, $subtotal - $grossDisc);
            if ($grossDisc > 0 && $subtotal > 0) {
                $totalTax = round($totalTax * ($taxableAfterGross / $subtotal), 2);
            }

            if (!$request->filled('subtotal') || (float) $request->input('subtotal') <= 0) {
                $request->merge(['subtotal' => round($subtotal, 2)]);
            }
            $request->merge(['taxable_amount' => round($taxableAfterGross, 2)]);
            $request->merge(['total_tax' => round($totalTax, 2)]);
            $request->merge(['gross_discount' => round($grossDisc, 2)]);
            if (!$request->filled('total_amount') || (float) $request->input('total_amount') <= 0) {
                $request->merge(['total_amount' => round($taxableAfterGross + $totalTax, 2)]);
            }
        }

        $validated = $request->validate([
            'quotation_number' => 'required|string',
            'quotation_date' => 'required|date',
            'valid_until' => 'nullable|date',
            'customer_name' => 'required|string',
            'customer_phone' => 'nullable|string',
            'customer_email' => 'nullable|email',
            'customer_address' => 'nullable|string',
            'customer_gst' => 'nullable|string',
            'status' => 'required|string|in:Pending,Accepted,Converted,Rejected',
            'subtotal' => 'nullable|numeric|min:0',
            'gross_discount' => 'nullable|numeric|min:0',
            'total_discount' => 'nullable|numeric|min:0',
            'taxable_amount' => 'nullable|numeric|min:0',
            'total_tax' => 'nullable|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            'applied_margin_percent' => 'nullable|numeric',
            'applied_margin_amount' => 'nullable|numeric',
            'notes' => 'nullable|string',
            'terms' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.hsn_sac' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit' => 'nullable|string',
            'items.*.rate' => 'required|numeric|min:0',
            'items.*.discount_percent' => 'nullable|numeric|min:0|max:100',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
            'items.*.amount' => 'required|numeric|min:0',
            'items.*.cost_price' => 'nullable|numeric',
            'items.*.margin_percent' => 'nullable|numeric',
        ]);

        DB::transaction(function () use ($quotation, $validated) {
            $quotation->update(\Illuminate\Support\Arr::except($validated, ['items']));
            $quotation->items()->delete();
            $quotation->items()->createMany($validated['items']);
        });

        return redirect()->route('quotations.index')->with('success', "Quotation #{$quotation->quotation_number} updated.");
    }

    public function destroy($id)
    {
        $ownerIds = $this->getStoreUserIds();
        $quotation = Quotation::whereIn('user_id', $ownerIds)->findOrFail($id);

        $quotation->items()->delete();
        $quotation->delete();

        return redirect()->route('quotations.index')->with('success', 'Quotation deleted successfully.');
    }

    // ── 1-Click Convert Quotation to Tax Invoice ─────────────────────
    public function convertToInvoice($id)
    {
        $userId = $this->getOwnerId();
        $ownerIds = $this->getStoreUserIds();
        $quotation = Quotation::whereIn('user_id', $ownerIds)->with('items')->findOrFail($id);

        if ($quotation->status === 'Converted' && $quotation->converted_invoice_id) {
            return back()->with('error', "Quotation #{$quotation->quotation_number} has already been converted to an invoice.");
        }

        $businessProfile = BusinessProfile::where('user_id', $userId)->first();
        $user = auth()->user();

        $invNum = Invoice::generateNextNumber($ownerIds);

        DB::transaction(function () use ($quotation, $userId, $ownerIds, $businessProfile, $user, $invNum) {
            $invoice = Invoice::create([
                'user_id' => $userId,
                'invoice_number' => $invNum,
                'invoice_date' => date('Y-m-d'),
                'due_date' => date('Y-m-d', strtotime('+15 days')),
                'status' => 'Unpaid',
                'tax_type' => 'intra_state',
                'seller_name' => $businessProfile->business_name ?? $user->name,
                'seller_address' => $businessProfile->address ?? '',
                'seller_gst_number' => $businessProfile->gst_number ?? '',
                'seller_phone' => $businessProfile->phone ?? '',
                'seller_state' => $businessProfile->state ?? '',
                'customer_name' => $quotation->customer_name,
                'customer_phone' => $quotation->customer_phone,
                'customer_address' => $quotation->customer_address,
                'customer_gst_number' => $quotation->customer_gst,
                'subtotal' => $quotation->subtotal,
                'total_discount' => $quotation->total_discount,
                'taxable_amount' => $quotation->taxable_amount,
                'cgst_amount' => round($quotation->total_tax / 2, 2),
                'sgst_amount' => round($quotation->total_tax / 2, 2),
                'igst_amount' => 0,
                'total_tax' => $quotation->total_tax,
                'round_off' => 0,
                'total_amount' => $quotation->total_amount,
                'paid_amount' => 0,
                'notes' => "Converted from Quotation #{$quotation->quotation_number}. " . ($quotation->notes ?? ''),
                'terms' => $quotation->terms,
            ]);

            foreach ($quotation->items as $it) {
                $halfGst = round((float) $it->tax_rate / 2, 2);
                $taxAmt = ($it->rate * $it->quantity * $it->tax_rate / 100);

                // Match with inventory item by item name or code within this store
                $inv = Inventory::whereIn('user_id', $ownerIds)
                    ->where(function ($q) use ($it) {
                        $q->where('item', trim($it->description));
                        if (!empty($it->hsn_sac)) {
                            $q->orWhere('code', trim($it->hsn_sac));
                        }
                    })
                    ->first();

                $invId = $inv ? $inv->id : null;
                $rowSubtotal = (float) $it->rate * (float) $it->quantity;
                $rowDiscount = ($rowSubtotal * (float) $it->discount_percent) / 100;

                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'inventory_id' => $invId,
                    'item_name' => $it->description,
                    'hsn_sac' => $it->hsn_sac,
                    'quantity' => $it->quantity,
                    'unit' => $it->unit ?: 'PCS',
                    'rate' => $it->rate,
                    'discount_percent' => $it->discount_percent,
                    'discount_amount' => round($rowDiscount, 2),
                    'taxable_value' => round(max(0, $rowSubtotal - $rowDiscount), 2),
                    'gst_rate' => $it->tax_rate,
                    'cgst_rate' => $halfGst,
                    'cgst_amount' => round($taxAmt / 2, 2),
                    'sgst_rate' => $halfGst,
                    'sgst_amount' => round($taxAmt / 2, 2),
                    'igst_rate' => 0,
                    'igst_amount' => 0,
                    'total_amount' => $it->amount,
                ]);

                if ($inv) {
                    $inv->decrement('qty', (float) $it->quantity);
                }
            }

            $quotation->status = 'Converted';
            $quotation->converted_invoice_id = $invoice->id;
            $quotation->save();
        });

        return redirect()->route('invoices.index')->with('success', "Quotation #{$quotation->quotation_number} converted into Tax Invoice #{$invNum}!");
    }

    // ── Delivery Challan / Driver Challan CRUD ───────────────────────
    public function storeChallan(Request $request)
    {
        $userId = $this->getOwnerId();
        $ownerIds = $this->getStoreUserIds();

        if (!$request->filled('challan_number')) {
            $next = DeliveryChallan::whereIn('user_id', $ownerIds)->count() + 1;
            $request->merge(['challan_number' => 'DC-' . date('Y') . '-' . str_pad($next, 4, '0', STR_PAD_LEFT)]);
        }

        $validated = $request->validate([
            'challan_number' => 'required|string',
            'challan_date' => 'required|date',
            'customer_name' => 'required|string',
            'customer_phone' => 'nullable|string',
            'delivery_address' => 'nullable|string',
            'driver_name' => 'nullable|string',
            'driver_phone' => 'nullable|string',
            'vehicle_number' => 'nullable|string',
            'transporter_name' => 'nullable|string',
            'eway_bill_no' => 'nullable|string',
            'dispatch_time' => 'nullable|string',
            'status' => 'required|string|in:Dispatched,In Transit,Delivered,Returned',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit' => 'nullable|string',
            'items.*.packages' => 'nullable|integer',
            'items.*.remarks' => 'nullable|string',
        ]);

        $validated['user_id'] = $userId;

        DB::transaction(function () use ($validated) {
            $challan = DeliveryChallan::create(\Illuminate\Support\Arr::except($validated, ['items']));
            $challan->items()->createMany($validated['items']);
        });

        return redirect()->route('quotations.index')->with('success', "Driver Challan #{$validated['challan_number']} created.");
    }

    public function updateChallan(Request $request, $id)
    {
        $ownerIds = $this->getStoreUserIds();
        $challan = DeliveryChallan::whereIn('user_id', $ownerIds)->findOrFail($id);

        $validated = $request->validate([
            'challan_number' => 'required|string',
            'challan_date' => 'required|date',
            'customer_name' => 'required|string',
            'customer_phone' => 'nullable|string',
            'delivery_address' => 'nullable|string',
            'driver_name' => 'nullable|string',
            'driver_phone' => 'nullable|string',
            'vehicle_number' => 'nullable|string',
            'transporter_name' => 'nullable|string',
            'eway_bill_no' => 'nullable|string',
            'dispatch_time' => 'nullable|string',
            'status' => 'required|string|in:Dispatched,In Transit,Delivered,Returned',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.unit' => 'nullable|string',
            'items.*.packages' => 'nullable|integer',
            'items.*.remarks' => 'nullable|string',
        ]);

        DB::transaction(function () use ($challan, $validated) {
            $challan->update(\Illuminate\Support\Arr::except($validated, ['items']));
            $challan->items()->delete();
            $challan->items()->createMany($validated['items']);
        });

        return redirect()->route('quotations.index')->with('success', "Delivery Challan #{$challan->challan_number} updated.");
    }

    public function destroyChallan($id)
    {
        $ownerIds = $this->getStoreUserIds();
        $challan = DeliveryChallan::whereIn('user_id', $ownerIds)->findOrFail($id);

        $challan->items()->delete();
        $challan->delete();

        return redirect()->route('quotations.index')->with('success', 'Delivery Challan deleted.');
    }
}
