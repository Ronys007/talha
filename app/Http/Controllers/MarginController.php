<?php

namespace App\Http\Controllers;

use App\Models\BusinessProfile;
use App\Models\Inventory;
use App\Models\Invoice;
use App\Models\PurchaseOrder;
use App\Models\Quotation;
use App\Models\SalesOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class MarginController extends Controller
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

    public function index(Request $request)
    {
        $ownerId = $this->getOwnerId();
        $ownerIds = $this->getStoreUserIds();

        // Load recent Invoices and Purchase Bills to choose from
        $invoices = Invoice::whereIn('user_id', $ownerIds)
            ->with('items')
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        $purchases = PurchaseOrder::whereIn('user_id', $ownerIds)
            ->with('items')
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        $inventory = Inventory::whereIn('user_id', $ownerIds)
            ->select('id', 'item', 'selling_price as price', 'qty as quantity', 'code as barcode', 'unit')
            ->get();

        $businessProfile = BusinessProfile::where('user_id', $ownerId)->first();

        return Inertia::render('Margin/Index', [
            'invoices' => $invoices,
            'purchases' => $purchases,
            'inventoryList' => $inventory,
            'businessProfile' => $businessProfile,
        ]);
    }

    public function createQuotationFromMargin(Request $request)
    {
        $userId = $this->getOwnerId();
        $ownerIds = $this->getStoreUserIds();

        $validated = $request->validate([
            'customer_name' => 'required|string',
            'customer_phone' => 'nullable|string',
            'customer_email' => 'nullable|email',
            'customer_address' => 'nullable|string',
            'applied_margin_percent' => 'nullable|numeric',
            'applied_margin_amount' => 'nullable|numeric',
            'subtotal' => 'required|numeric',
            'total_tax' => 'nullable|numeric',
            'total_amount' => 'required|numeric',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric',
            'items.*.unit' => 'nullable|string',
            'items.*.cost_price' => 'nullable|numeric',
            'items.*.rate' => 'required|numeric',
            'items.*.tax_rate' => 'nullable|numeric',
            'items.*.amount' => 'required|numeric',
            'items.*.margin_percent' => 'nullable|numeric',
        ]);

        $next = Quotation::whereIn('user_id', $ownerIds)->count() + 1;
        $qtNum = 'QT-' . date('Y') . '-' . str_pad($next, 4, '0', STR_PAD_LEFT);

        DB::transaction(function () use ($validated, $userId, $qtNum) {
            $quotation = Quotation::create([
                'user_id' => $userId,
                'quotation_number' => $qtNum,
                'quotation_date' => date('Y-m-d'),
                'valid_until' => date('Y-m-d', strtotime('+30 days')),
                'customer_name' => $validated['customer_name'],
                'customer_phone' => $validated['customer_phone'] ?? null,
                'customer_email' => $validated['customer_email'] ?? null,
                'customer_address' => $validated['customer_address'] ?? null,
                'status' => 'Pending',
                'subtotal' => $validated['subtotal'],
                'total_discount' => 0,
                'taxable_amount' => $validated['subtotal'],
                'total_tax' => $validated['total_tax'] ?? 0,
                'total_amount' => $validated['total_amount'],
                'applied_margin_percent' => $validated['applied_margin_percent'] ?? 0,
                'applied_margin_amount' => $validated['applied_margin_amount'] ?? 0,
                'notes' => $validated['notes'] ?? 'Generated from Margin Calculator markup.',
            ]);

            $quotation->items()->createMany($validated['items']);
        });

        return redirect()->route('quotations.index')->with('success', "Marked-up Quotation #{$qtNum} created successfully!");
    }

    public function updateInventoryItemPrice(Request $request)
    {
        $ownerIds = $this->getStoreUserIds();
        $validated = $request->validate([
            'item_name' => 'required|string',
            'new_price' => 'required|numeric|min:0',
        ]);

        $item = Inventory::whereIn('user_id', $ownerIds)
            ->where('item', trim($validated['item_name']))
            ->first();

        if ($item) {
            $item->selling_price = $validated['new_price'];
            $item->save();
            return back()->with('success', "Inventory selling price for {$item->item} updated to ₹{$validated['new_price']}.");
        }

        return back()->withErrors(['item_name' => "Item '{$validated['item_name']}' not found in inventory."]);
    }
}
