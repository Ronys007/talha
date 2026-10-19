<?php

namespace App\Http\Controllers;

use Illuminate\Validation\ValidationException;
use App\Models\BusinessProfile;
use App\Models\PurchaseOrder;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PurchaseReminderController extends Controller
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
        $today = date('Y-m-d');

        $bills = [];

        // Purchase Invoices (Supplier Bills)
        $orders = PurchaseOrder::whereIn('user_id', $ownerIds)
            ->whereNotIn('status', ['Cancelled', 'cancelled'])
            ->with('items')
            ->orderBy('created_at', 'desc')
            ->get();

        foreach ($orders as $po) {
            $total = (float) $po->total_amount;
            $isPaid = (strtolower((string) $po->status) === 'paid');
            $paid = $isPaid ? $total : max(0, (float) ($po->paid_amount ?? 0));
            $due = max(0, $total - $paid);
            if ($due <= 0.001 && $total > 0) {
                $isPaid = true;
            }

            $dueDate = $po->due_date ? date('Y-m-d', strtotime($po->due_date)) : $po->order_date;
            $diffDays = (int) floor((strtotime($today) - strtotime($dueDate)) / 86400);

            $bills[] = [
                'id' => $po->id,
                'source' => 'purchase',
                'bill_number' => $po->po_number,
                'purchase_number' => $po->purchase_number ?: 'PUR-' . str_pad((string) $po->id, 6, '0', STR_PAD_LEFT),
                'bill_date' => $po->order_date,
                'due_date' => $dueDate,
                'paid_at' => $po->paid_at ? date('Y-m-d', strtotime($po->paid_at)) : ($isPaid ? date('Y-m-d', strtotime($po->updated_at ?: $po->order_date)) : null),
                'supplier_name' => $po->supplier_name ?: 'Unknown Supplier',
                'supplier_phone' => $po->supplier_phone ?: '',
                'supplier_gst' => $po->gst_number ?: '',
                'total_amount' => $total,
                'paid_amount' => $paid,
                'balance_due' => $due,
                'is_partially_paid' => $paid > 0 && $due > 0,
                'overdue_days' => $diffDays,
                'is_paid' => $isPaid,
                'status' => $isPaid ? 'Paid' : ($diffDays > 0 ? 'Overdue' : ($diffDays === 0 ? 'Due Today' : 'Upcoming')),
                'items' => ($po->items ?? collect())->map(function ($it) {
                    return [
                        'item_name' => $it->description ?: 'Item',
                        'quantity' => (float) $it->quantity,
                        'unit' => $it->per ?: 'PCS',
                        'rate' => (float) $it->rate,
                        'total_amount' => (float) $it->amount,
                    ];
                })->values()->toArray(),
            ];
        }

        // Summary calculations
        $totalPayable = 0;
        $totalOverdue = 0;
        $overdueCount = 0;
        $dueTodayCount = 0;

        foreach ($bills as $b) {
            if (!$b['is_paid'] && $b['balance_due'] > 0) {
                $totalPayable += $b['balance_due'];
                if ($b['overdue_days'] > 0) {
                    $totalOverdue += $b['balance_due'];
                    $overdueCount++;
                } elseif ($b['overdue_days'] === 0) {
                    $dueTodayCount++;
                }
            }
        }

        $businessProfile = BusinessProfile::where('user_id', $ownerId)->first();
        $ownerUser = \App\Models\User::find($ownerId);
        $user = auth()->user();

        // Resolve Admin / Business Name (avoiding literal 'Super Admin')
        $adminName = 'Admin';
        if ($businessProfile && !empty(trim($businessProfile->business_name)) && trim($businessProfile->business_name) !== 'Super Admin') {
            $adminName = trim($businessProfile->business_name);
        } elseif ($ownerUser && !empty(trim($ownerUser->name)) && trim($ownerUser->name) !== 'Super Admin') {
            $adminName = trim($ownerUser->name);
        }

        return Inertia::render('PurchaseReminders/Index', [
            'bills' => $bills,
            'summary' => [
                'total_payable' => $totalPayable,
                'total_overdue' => $totalOverdue,
                'overdue_count' => $overdueCount,
                'due_today_count' => $dueTodayCount,
                'total_bills' => count($bills),
            ],
            'business' => [
                'name' => $adminName,
                'phone' => $businessProfile->phone ?? '',
                'email' => $businessProfile->email ?? ($ownerUser?->email ?? ($user->email ?? '')),
                'address' => $businessProfile->address ?? '',
                'gstin' => $businessProfile->gst_number ?? '',
                'upi_id' => $businessProfile->bank_account_number ?? '',
                'bank_name' => $businessProfile->bank_name ?? '',
                'ifsc' => $businessProfile->bank_ifsc ?? '',
            ],
        ]);
    }

    public function updateDueDate(Request $request)
    {
        $ownerIds = $this->getStoreUserIds();

        $validated = $request->validate([
            'id' => 'required|integer',
            'due_date' => 'required|date',
        ]);

        $po = PurchaseOrder::whereIn('user_id', $ownerIds)->findOrFail($validated['id']);
        $po->due_date = $validated['due_date'];
        $po->save();

        return back()->with('success', "Payment due date for Purchase Order #{$po->po_number} updated to {$validated['due_date']}.");
    }

    public function recordPayment(Request $request)
    {
        $ownerIds = $this->getStoreUserIds();

        $validated = $request->validate([
            'id' => 'required|integer',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'nullable|date',
        ]);

        $po = PurchaseOrder::whereIn('user_id', $ownerIds)->findOrFail($validated['id']);
        $totalAmount = (float) $po->total_amount;
        $currentPaid = strtolower((string) $po->status) === 'paid'
            ? $totalAmount
            : max(0, (float) ($po->paid_amount ?? 0));
        $remaining = max(0, $totalAmount - $currentPaid);

        if ($remaining <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'This purchase invoice is already fully paid.',
            ]);
        }

        $paymentAmount = (float) $validated['amount'];
        if ($paymentAmount > $remaining) {
            throw ValidationException::withMessages([
                'amount' => 'The payment amount cannot exceed the remaining balance of ₹' . number_format($remaining, 2) . '.',
            ]);
        }

        $paymentDate = !empty($validated['payment_date']) ? $validated['payment_date'] : date('Y-m-d');
        $po->paid_amount = round($currentPaid + $paymentAmount, 2);
        if ($po->paid_amount >= $totalAmount) {
            $po->status = 'Paid';
            $po->paid_at = $paymentDate;
        }
        $po->save();

        return back()->with('success', "Supplier payment recorded for PO #{$po->po_number} on {$paymentDate}! Paid ₹" . number_format($paymentAmount, 2));
    }

    public function markAsPaid(Request $request)
    {
        $ownerIds = $this->getStoreUserIds();

        $validated = $request->validate([
            'id' => 'required|integer',
            'payment_date' => 'nullable|date',
        ]);

        $po = PurchaseOrder::whereIn('user_id', $ownerIds)->findOrFail($validated['id']);
        $paymentDate = !empty($validated['payment_date']) ? $validated['payment_date'] : date('Y-m-d');

        $po->paid_amount = (float) $po->total_amount;
        $po->status = 'Paid';
        $po->paid_at = $paymentDate;
        $po->save();

        return back()->with('success', "Purchase Order #{$po->po_number} marked as Paid on {$paymentDate}.");
    }
}
