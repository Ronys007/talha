<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Inventory;
use App\Models\Transaction;
use Inertia\Inertia;

class HomeController extends Controller
{
    private function getStatsForMode(int $userId, string $mode)
    {
        $totalItems = Inventory::where('user_id', $userId)
            ->where('mode', $mode)
            ->count();

        $totalOrders = Order::where('user_id', $userId)
            ->where('mode', $mode)
            ->count();

        $totalRevenue = Order::where('user_id', $userId)
            ->where('mode', $mode)
            ->sum('total_price');

        $orders = Order::where('user_id', $userId)
            ->where('mode', $mode)
            ->get(['id', 'total_price']);

        $billIds = $orders->pluck('id');
        $txns = Transaction::whereIn('order_b_s_id', $billIds)
            ->where('user_id', $userId)
            ->get(['order_b_s_id', 'type', 'amount'])
            ->groupBy('order_b_s_id');

        $pendingBalance = 0;
        foreach ($orders as $order) {
            $orderTxns = $txns->get($order->id, collect());
            $balance = (float) $order->total_price;
            foreach ($orderTxns as $t) {
                if ($t->type === 'credit') $balance += (float) $t->amount;
                else if ($t->type === 'receive') $balance -= (float) $t->amount;
            }
            if ($balance > 0) $pendingBalance += $balance;
        }

        return [
            'totalItems'     => $totalItems,
            'totalOrders'    => $totalOrders,
            'totalRevenue'   => $totalRevenue,
            'pendingBalance' => round($pendingBalance, 2),
            'mode'           => $mode,
        ];
    }

    private function getOwnerId(): int
    {
        return (int) (auth()->user()?->store_owner_id ?? auth()->id());
    }

    public function index(\Illuminate\Http\Request $request)
    {
        $userId = $this->getOwnerId();
        $mode = $request->input('mode', 'standard');
        if (!in_array($mode, ['standard', 'barcode'])) {
            $mode = 'standard';
        }

        return Inertia::render('Dashboard', [
            'stats' => $this->getStatsForMode($userId, $mode),
        ]);
    }

    public function stats(\Illuminate\Http\Request $request)
    {
        $userId = $this->getOwnerId();
        $mode = $request->input('mode', 'standard');
        if (!in_array($mode, ['standard', 'barcode'])) {
            $mode = 'standard';
        }

        return response()->json($this->getStatsForMode($userId, $mode));
    }

    public function barcodeItems(\Illuminate\Http\Request $request)
    {
        $userId = $this->getOwnerId();
        $items = Inventory::where('user_id', $userId)
            ->where('mode', 'barcode')
            ->whereNotNull('code')
            ->where('code', '!=', '')
            ->orderBy('item', 'asc')
            ->get(['id', 'item', 'code', 'qty', 'selling_price', 'image']);

        return response()->json($items->map(fn($item) => [
            'id'            => $item->id,
            'item'          => $item->item,
            'code'          => $item->code,
            'qty'           => $item->qty,
            'selling_price' => $item->selling_price ? (float)$item->selling_price : 0,
            'image'         => $item->image ? asset('storage/' . $item->image) : null,
        ]));
    }
}