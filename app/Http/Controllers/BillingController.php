<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Inventory;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Stichoza\GoogleTranslate\GoogleTranslate;

class BillingController extends Controller
{
    private function getOwnerId(): int
    {
        return (int) (auth()->user()?->store_owner_id ?? auth()->id());
    }

    public function index()
    {
        return Inertia::render('Billing/Index');
    }

    // Paginated JSON for infinite scroll
    public function data(Request $request)
    {
        $ownerId = $this->getOwnerId();
        $perPage = 50;
        $cursor  = $request->input('cursor');
        $search  = $request->input('search', '');
        $mode = $request->input('mode', 'standard');
        if (!in_array($mode, ['standard', 'barcode'])) {
            $mode = 'standard';
        }

        $query = Order::where('user_id', $ownerId)
            ->where('mode', $mode)
            ->with(['items.inventory'])
            ->when($search, fn($q) => $q->where('customer', 'LIKE', "%{$search}%"))
            ->orderBy('id', 'desc');

        if ($cursor) {
            $query->where('id', '<', $cursor);
        }

        $orders  = $query->limit($perPage + 1)->get();
        $hasMore = $orders->count() > $perPage;
        if ($hasMore) $orders = $orders->take($perPage);

        // Calculate balance for each order efficiently
        $billIds = $orders->pluck('id');
        $txns = Transaction::whereIn('order_b_s_id', $billIds)
            ->where('user_id', $ownerId)
            ->get(['order_b_s_id', 'type', 'amount'])
            ->groupBy('order_b_s_id');

        foreach ($orders as $order) {
            $combinedData = $txns->get($order->id, collect());
            $balance = (float) $order->total_price;
            foreach ($combinedData as $data) {
                if ($data->type === 'credit') $balance += (float) $data->amount;
                else if ($data->type === 'receive') $balance -= (float) $data->amount;
            }
            $order->updated_balance = $balance;
            $order->items_count = $order->items->count();
        }

        return response()->json([
            'data'       => $orders->map(fn($o) => [
                'id'               => $o->id,
                'mode'             => $o->mode,
                'customer'         => $o->customer,
                'gst'              => $o->gst,
                'gst_number'       => $o->gst_number,
                'discount'         => $o->discount,
                'discount_divisor' => $o->discount_divisor,
                'total_price'      => $o->total_price,
                'updated_balance'  => $o->updated_balance,
                'items_count'      => $o->items_count,
                'items'            => $o->items->map(fn($i) => [
                    'code'             => $i->code,
                    'item_name'        => $i->item_name ?? ($i->inventory?->item ?? $i->code),
                    'item'             => $i->item_name ?? ($i->inventory?->item ?? $i->code),
                    'quantity'         => $i->quantity,
                    'selling_price'    => $i->selling_price,
                    'discount_percent' => $i->discount_percent ?? 0,
                    'inventory_qty'    => $i->inventory?->qty ?? 0, // current stock
                ]),
                'created_at'       => $o->created_at,
            ]),
            'nextCursor' => $hasMore ? $orders->last()?->id : null,
            'hasMore'    => $hasMore,
        ]);
    }

    public function store(Request $request)
    {
        $ownerId = $this->getOwnerId();
        DB::beginTransaction();
        try {
            $mode = $request->input('mode', 'standard');
            if (!in_array($mode, ['standard', 'barcode'])) {
                $mode = 'standard';
            }

            $items = $request->input('items', []);
            if (empty($items) || !is_array($items)) {
                $errMsg = 'No items found in the bill.';
                if ($request->wantsJson() || $request->ajax()) {
                    return response()->json(['error' => $errMsg], 422);
                }
                return back()->with('error', $errMsg);
            }

            $order = Order::create([
                'user_id'          => $ownerId,
                'mode'             => $mode,
                'customer'         => $request->customer,
                'gst'              => 0,
                'gst_number'       => null,
                'discount'         => 0,
                'discount_divisor' => $request->discount_divisor ?? null,
                'total_price'      => $request->total_price,
            ]);

            foreach ($items as $item) {
                if (!empty($item['code'])) {
                    $inventoryItem = Inventory::where('code', $item['code'])
                        ->where('user_id', $ownerId)
                        ->where('mode', $mode)
                        ->first();

                    if ($inventoryItem && $inventoryItem->qty >= $item['quantity']) {
                        $order->items()->create([
                            'mode'             => $mode,
                            'code'             => $item['code'],
                            'item_name'        => $item['item_name'] ?? null,
                            'quantity'         => $item['quantity'],
                            'selling_price'    => $item['selling_price'],
                            'discount_percent' => $item['discount_percent'] ?? 0,
                        ]);
                        $inventoryItem->qty -= $item['quantity'];
                        $inventoryItem->save();
                    } else {
                        DB::rollBack();
                        $errMsg = 'Insufficient quantity for item: ' . ($item['item_name'] ?? $item['code']) . ($inventoryItem ? ' (Available: ' . $inventoryItem->qty . ')' : ' (Not found in inventory)');
                        if ($request->wantsJson() || $request->ajax()) {
                            return response()->json(['error' => $errMsg], 422);
                        }
                        return back()->with('error', $errMsg);
                    }
                } else {
                    $order->items()->create([
                        'mode'             => $mode,
                        'code'             => null,
                        'item_name'        => $item['item_name'] ?? null,
                        'quantity'         => $item['quantity'],
                        'selling_price'    => $item['selling_price'],
                        'discount_percent' => $item['discount_percent'] ?? 0,
                    ]);
                }
            }

            DB::commit();
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['success' => true, 'id' => $order->id]);
            }
            return back()->with('success', 'Bill created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating bill: ' . $e->getMessage());
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['error' => $e->getMessage()], 422);
            }
            return back()->with('error', 'Error creating bill: ' . $e->getMessage());
        }
    }

    public function delete(Request $request, $id)
    {
        $ownerId = $this->getOwnerId();
        DB::beginTransaction();
        try {
            $order = Order::where('id', $id)
                ->where('user_id', $ownerId)
                ->with('items')
                ->firstOrFail();

            foreach ($order->items as $item) {
                $inv = Inventory::where('code', $item->code)
                    ->where('user_id', $ownerId)
                    ->where('mode', $order->mode)
                    ->first();
                if ($inv) { $inv->qty += $item->quantity; $inv->save(); }
            }

            $order->items()->delete();
            $order->delete();
            DB::commit();

            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['success' => true]);
            }
            return back()->with('delete', 'Bill deleted successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting bill: ' . $e->getMessage());
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['error' => $e->getMessage()], 422);
            }
            return back()->with('error', 'Error deleting bill: ' . $e->getMessage());
        }
    }

    public function update(Request $request, $id)
    {
        $ownerId = $this->getOwnerId();
        DB::beginTransaction();
        try {
            $order = Order::where('id', $id)
                ->where('user_id', $ownerId)
                ->with('items')
                ->firstOrFail();

            $mode = $order->mode ?? 'standard';

            // Restore old inventory
            foreach ($order->items as $item) {
                $inv = Inventory::where('code', $item->code)
                    ->where('user_id', $ownerId)
                    ->where('mode', $mode)
                    ->first();
                if ($inv) { $inv->qty += $item->quantity; $inv->save(); }
            }
            $order->items()->delete();

            $order->update([
                'customer'         => $request->customer,
                'gst'              => 0,
                'gst_number'       => null,
                'discount'         => 0,
                'discount_divisor' => $request->discount_divisor ?? null,
                'total_price'      => $request->total_price,
            ]);

            if (!$request->has('items') || empty($request->items)) {
                DB::rollBack();
                $errMsg = 'No items found.';
                if ($request->wantsJson() || $request->ajax()) {
                    return response()->json(['error' => $errMsg], 422);
                }
                return back()->with('error', $errMsg);
            }

            foreach ($request->items as $itemData) {
                if (!empty($itemData['code'])) {
                    $inv = Inventory::where('code', $itemData['code'])
                        ->where('user_id', $ownerId)
                        ->where('mode', $mode)
                        ->first();
                    if ($inv && $inv->qty >= $itemData['quantity']) {
                        OrderItem::create([
                            'order_b_s_id'     => $order->id,
                            'mode'             => $mode,
                            'code'             => $itemData['code'],
                            'item_name'        => $itemData['item_name'] ?? null,
                            'quantity'         => $itemData['quantity'],
                            'selling_price'    => $itemData['selling_price'],
                            'discount_percent' => $itemData['discount_percent'] ?? 0,
                        ]);
                        $inv->qty -= $itemData['quantity'];
                        $inv->save();
                    } else {
                        DB::rollBack();
                        $errMsg = 'Insufficient quantity for: ' . ($itemData['item_name'] ?? $itemData['code']) . ($inv ? ' (Available: ' . $inv->qty . ')' : ' (Not found in inventory)');
                        if ($request->wantsJson() || $request->ajax()) {
                            return response()->json(['error' => $errMsg], 422);
                        }
                        return back()->with('error', $errMsg);
                    }
                } else {
                    OrderItem::create([
                        'order_b_s_id'     => $order->id,
                        'mode'             => $mode,
                        'code'             => null,
                        'item_name'        => $itemData['item_name'] ?? null,
                        'quantity'         => $itemData['quantity'],
                        'selling_price'    => $itemData['selling_price'],
                        'discount_percent' => $itemData['discount_percent'] ?? 0,
                    ]);
                }
            }

            DB::commit();
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['success' => true]);
            }
            return back()->with('success', 'Bill updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['error' => $e->getMessage()], 422);
            }
            return back()->with('error', 'Error updating bill: ' . $e->getMessage());
        }
    }

    public function print($id)
    {
        $ownerId = $this->getOwnerId();
        $order = Order::where('id', $id)
            ->where('user_id', $ownerId)
            ->with(['items.inventory'])
            ->firstOrFail();

        // Attach item name and image to each order item for the print view
        $order->items->each(function ($item) use ($ownerId) {
            $inv = $item->inventory;
            if (!$inv && !empty($item->code)) {
                $inv = Inventory::where('code', $item->code)->where('user_id', $ownerId)->first();
            }
            if (!$inv && !empty($item->item_name)) {
                $inv = Inventory::where('item', $item->item_name)->where('user_id', $ownerId)->first();
            }
            $item->item_name  = $item->item_name ?? ($inv?->item ?? $item->code);
            $item->image_url  = $inv?->image
                ? asset('storage/' . $inv->image)
                : null;
        });

        // ── Build ledger: all bills for this customer in same mode ────────────
        $allBills = Order::where('user_id', $ownerId)
            ->where('mode', $order->mode)
            ->where('customer', $order->customer)
            ->orderBy('created_at', 'asc')
            ->get();

        // Pre-load transactions for all these bills at once
        $billIds = $allBills->pluck('id');
        $txns = Transaction::whereIn('order_b_s_id', $billIds)
            ->where('user_id', $ownerId)
            ->get()
            ->groupBy('order_b_s_id');

        $runningBalance = 0;
        $ledger = $allBills->map(function ($b) use ($txns, &$runningBalance, $order) {
            $bTxns   = $txns->get($b->id, collect());
            $credits  = $bTxns->where('type', 'credit')->sum('amount');
            $received = $bTxns->where('type', 'receive')->sum('amount');
            $balance  = $b->total_price + $credits - $received;
            $runningBalance += $balance;

            $displayReceived = $received - $credits;

            return [
                'id'              => $b->id,
                'created_at'      => $b->created_at,
                'total_price'     => $b->total_price,
                'received'        => $displayReceived,
                'bill_balance'    => $balance,       // balance on this specific bill
                'running_balance' => $runningBalance, // cumulative outstanding
                'is_current'      => $b->id === $order->id,
            ];
        });

        return Inertia::render('Billing/Print', [
            'order'  => $order,
            'ledger' => $ledger,
        ]);
    }

    public function search(Request $request)
    {
        $ownerId = $this->getOwnerId();
        $query = trim($request->input('query', ''));
        $mode  = $request->input('mode', 'standard');
        if (!in_array($mode, ['standard', 'barcode'])) {
            $mode = 'standard';
        }

        if (empty($query)) {
            return response()->json([]);
        }

        $items = Inventory::where('user_id', $ownerId)
            ->where('mode', $mode)
            ->where(function ($q) use ($query) {
                $q->where('code', $query)
                  ->orWhere('code', 'LIKE', "{$query}%")
                  ->orWhere('code', 'LIKE', "%{$query}%")
                  ->orWhere('item', 'LIKE', "%{$query}%");
            })
            ->orderByRaw("CASE WHEN code = ? THEN 1 WHEN code LIKE ? THEN 2 ELSE 3 END", [$query, "{$query}%"])
            ->limit(20)
            ->get();

        return response()->json($items->map(fn($item) => [
            'id'            => $item->id,
            'code'          => $item->code,
            'item'          => $item->item,
            'qty'           => $item->qty,
            'selling_price' => $item->selling_price,
            'image'         => $item->image ? asset('storage/' . $item->image) : null,
        ]));
    }
}
