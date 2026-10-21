<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\Receipt;
use App\Models\Credit;
use App\Models\Transaction;
use Inertia\Inertia;

class AccountController extends Controller
{
    public function show($id)
    {
        $order = Order::where('id', $id)
            ->where('user_id', auth()->id())
            ->with(['items.inventory'])
            ->firstOrFail();

        $transactions = Transaction::where('order_b_s_id', $id)
            ->where('user_id', auth()->id())
            ->orderBy('created_at', 'asc')
            ->get();

        return Inertia::render('Account/Show', compact('order', 'transactions'));
    }

    public function addReceipt($id, Request $request)
    {
        $request->validate([
            'receive' => 'required|numeric',
            'text'    => 'nullable|string',
        ]);

        $order = Order::where('id', $id)->where('user_id', auth()->id())->firstOrFail();

        $receipt = new Receipt();
        $receipt->user_id      = auth()->id();
        $receipt->mode         = $order->mode ?? 'standard';
        $receipt->order_b_s_id = $id;
        $receipt->receive      = $request->input('receive');
        $receipt->text         = $request->input('text');
        $receipt->save();

        $transaction = new Transaction();
        $transaction->user_id      = auth()->id();
        $transaction->mode         = $order->mode ?? 'standard';
        $transaction->order_b_s_id = $id;
        $transaction->type         = 'receive';
        $transaction->amount       = $receipt->receive;
        $transaction->text         = $receipt->text;
        $transaction->save();

        return back()->with('success', 'Payment received successfully.');
    }

    public function addCredit($id, Request $request)
    {
        $request->validate([
            'credit' => 'required|numeric',
            'text'   => 'nullable|string',
        ]);

        $order = Order::where('id', $id)->where('user_id', auth()->id())->firstOrFail();

        $credit = new Credit();
        $credit->user_id      = auth()->id();
        $credit->mode         = $order->mode ?? 'standard';
        $credit->order_b_s_id = $id;
        $credit->credit       = $request->input('credit');
        $credit->text         = $request->input('text');
        $credit->save();

        $transaction = new Transaction();
        $transaction->user_id      = auth()->id();
        $transaction->mode         = $order->mode ?? 'standard';
        $transaction->order_b_s_id = $id;
        $transaction->type         = 'credit';
        $transaction->amount       = $credit->credit;
        $transaction->text         = $credit->text;
        $transaction->save();

        return back()->with('success', 'Credit added successfully.');
    }

    public function deleteCredit($id)
    {
        $transaction = Transaction::where('id', $id)
            ->where('user_id', auth()->id())
            ->where('type', 'credit')
            ->first();

        if ($transaction) {
            Credit::where('order_b_s_id', $transaction->order_b_s_id)
                ->where('user_id', auth()->id())
                ->where('credit', $transaction->amount)
                ->first()?->delete();
            $transaction->delete();
        }

        return back()->with('success', 'Credit deleted successfully.');
    }

    public function deleteReceipt($id)
    {
        $transaction = Transaction::where('id', $id)
            ->where('user_id', auth()->id())
            ->where('type', 'receive')
            ->first();

        if ($transaction) {
            Receipt::where('order_b_s_id', $transaction->order_b_s_id)
                ->where('user_id', auth()->id())
                ->where('receive', $transaction->amount)
                ->first()?->delete();
            $transaction->delete();
        }

        return back()->with('success', 'Receipt deleted successfully.');
    }
}
