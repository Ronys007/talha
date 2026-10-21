<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\Order;
use App\Models\Transaction;

class DataExportController extends Controller
{
    // JSON File Export For Orders
    public function export()
    {
        // Fetch data with related items for authenticated user
        $orders = Order::where('user_id', auth()->id())
                      ->with('items')
                      ->get();

        // Process each order to calculate updated balance
        foreach ($orders as $order) {
            $transactions = Transaction::where('order_b_s_id', $order->id)
                ->where('user_id', auth()->id())
                ->orderBy('created_at', 'asc')
                ->get();

            $updatedBalance = $order->total_price;

            foreach ($transactions as $transaction) {
                if ($transaction->type === 'credit') {
                    $updatedBalance += $transaction->amount;
                } else if ($transaction->type === 'receive') {
                    $updatedBalance -= $transaction->amount;
                }
            }

            $order->updated_balance = $updatedBalance;
        }

        // Convert to JSON
        $jsonData = $orders->toJson();

        // Define file path under storage/app
        $filePath = 'public/orders.json';

        // Save to file
        Storage::disk('local')->put($filePath, $jsonData);

        return response()->json(['message' => 'JSON file exported successfully']);
    }
}