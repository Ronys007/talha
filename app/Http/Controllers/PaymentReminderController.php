<?php

namespace App\Http\Controllers;

use App\Models\BusinessProfile;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class PaymentReminderController extends Controller
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

        // 1. Tax Invoices (Sales)
        $invoices = Invoice::whereIn('user_id', $ownerIds)
            ->whereNotIn('status', ['Cancelled', 'cancelled'])
            ->with('items')
            ->orderBy('created_at', 'desc')
            ->get();

        foreach ($invoices as $inv) {
            $total = (float) $inv->total_amount;
            $isPaid = (strtolower((string) $inv->status) === 'paid');
            $paid = $isPaid ? $total : min($total, max(0, (float) ($inv->paid_amount ?? 0)));
            $due = max(0, $total - $paid);
            if ($due <= 0.001 && $total > 0) {
                $paid = $total;
                $due = 0;
                $isPaid = true;
            }

            $dueDate = $inv->due_date ? date('Y-m-d', strtotime($inv->due_date)) : $inv->invoice_date;
            $diffDays = (int) floor((strtotime($today) - strtotime($dueDate)) / 86400);

            $bills[] = [
                'id' => $inv->id,
                'source' => 'invoice',
                'bill_number' => $inv->invoice_number,
                'bill_date' => $inv->invoice_date,
                'due_date' => $dueDate,
                'paid_at' => $inv->paid_at ? date('Y-m-d', strtotime($inv->paid_at)) : ($isPaid ? date('Y-m-d', strtotime($inv->updated_at ?: $inv->invoice_date)) : null),
                'seller_name' => (!empty(trim($inv->seller_name ?? '')) && trim($inv->seller_name) !== 'Super Admin') ? trim($inv->seller_name) : null,
                'seller_address' => $inv->seller_address ?: null,
                'seller_phone' => $inv->seller_phone ?: null,
                'seller_gst' => $inv->seller_gst_number ?: null,
                'customer_name' => $inv->customer_name ?: 'Walk-in Customer',
                'customer_phone' => $inv->customer_phone ?: '',
                'customer_email' => '',
                'total_amount' => $total,
                'paid_amount' => $paid,
                'balance_due' => $due,
                'is_partially_paid' => $paid > 0 && $due > 0,
                'overdue_days' => $diffDays,
                'is_paid' => $isPaid,
                'status' => $isPaid ? 'Received' : ($diffDays > 0 ? 'Overdue' : ($diffDays === 0 ? 'Due Today' : 'Upcoming')),
                'items' => ($inv->items ?? collect())->map(function ($it) {
                    return [
                        'item_name' => $it->item_name,
                        'quantity' => (float) $it->quantity,
                        'unit' => $it->unit ?: 'PCS',
                        'rate' => (float) $it->rate,
                        'total_amount' => (float) $it->total_amount,
                    ];
                })->values()->toArray(),
            ];
        }

        // Summary calculations
        $totalReceivable = 0;
        $totalOverdue = 0;
        $overdueCount = 0;
        $dueTodayCount = 0;
        $partialPaidCount = 0;
        $totalPartialDue = 0;

        foreach ($bills as $b) {
            if (!$b['is_paid'] && $b['balance_due'] > 0) {
                $totalReceivable += $b['balance_due'];
                if ($b['is_partially_paid']) {
                    $partialPaidCount++;
                    $totalPartialDue += $b['balance_due'];
                }
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
        } else {
            $invSeller = $invoices->first(fn($i) => !empty(trim($i->seller_name ?? '')) && trim($i->seller_name) !== 'Super Admin')?->seller_name;
            $adminName = $invSeller ?: 'Admin';
        }

        // Fill seller_name fallback for bills if needed
        foreach ($bills as &$b) {
            if (empty($b['seller_name'])) {
                $b['seller_name'] = $adminName;
            }
        }
        unset($b);

        return Inertia::render('PaymentReminders/Index', [
            'bills' => $bills,
            'summary' => [
                'total_receivable' => $totalReceivable,
                'total_overdue' => $totalOverdue,
                'overdue_count' => $overdueCount,
                'due_today_count' => $dueTodayCount,
                'partial_paid_count' => $partialPaidCount,
                'total_partial_due' => $totalPartialDue,
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

        $inv = Invoice::whereIn('user_id', $ownerIds)->findOrFail($validated['id']);
        $inv->due_date = $validated['due_date'];
        $inv->save();

        $waNotice = "";
        if (!empty($inv->customer_phone)) {
            try {
                $waService = app(\App\Services\WhatsAppService::class);
                $res = $waService->sendInvoiceDocument($inv, 'payment_reminder');
                if (($res['status'] ?? '') === 'sent') {
                    $waNotice = " & reminder sent on WhatsApp";
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("WhatsApp reminder failed on updateDueDate: " . $e->getMessage());
            }
        }

        return back()->with('success', "Due date updated to {$validated['due_date']}{$waNotice}.");
    }

    public function recordPayment(Request $request)
    {
        $ownerIds = $this->getStoreUserIds();

        $validated = $request->validate([
            'source' => 'required|string',
            'id' => 'required|integer',
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'nullable|date',
        ]);

        $inv = Invoice::whereIn('user_id', $ownerIds)->findOrFail($validated['id']);
        $totalAmount = (float) $inv->total_amount;
        $currentPaid = in_array(strtolower((string) $inv->status), ['paid', 'received'])
            ? $totalAmount
            : min($totalAmount, max(0, (float) ($inv->paid_amount ?? 0)));
        $remaining = max(0, $totalAmount - $currentPaid);

        if ($remaining <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'This sales invoice is already fully received.',
            ]);
        }

        $paymentAmount = (float) $validated['amount'];
        if ($paymentAmount > $remaining) {
            throw ValidationException::withMessages([
                'amount' => 'The payment amount cannot exceed the remaining balance of ₹' . number_format($remaining, 2) . '.',
            ]);
        }

        $paymentDate = !empty($validated['payment_date']) ? $validated['payment_date'] : date('Y-m-d');
        $inv->paid_amount = round($currentPaid + $paymentAmount, 2);
        $newBalance = max(0, $totalAmount - $inv->paid_amount);

        if ($inv->paid_amount >= $totalAmount) {
            $inv->status = 'Paid';
            $inv->paid_at = $paymentDate;
        } else {
            $inv->status = 'Partially Paid';
        }
        $inv->save();

        $waNotice = "";
        if (!empty($inv->customer_phone)) {
            try {
                $waService = app(\App\Services\WhatsAppService::class);
                $trigger = ($inv->status === 'Paid') ? 'bill_paid' : 'partial_payment';
                $res = $waService->sendInvoiceDocument($inv, $trigger);
                if (($res['status'] ?? '') === 'sent') {
                    $waNotice = " & WhatsApp sent";
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("WhatsApp send failed on recordPayment: " . $e->getMessage());
            }
        }

        return back()->with('success', "Payment of ₹" . number_format($paymentAmount, 2) . " recorded{$waNotice}.");
    }

    public function markAsPaid(Request $request)
    {
        $ownerIds = $this->getStoreUserIds();

        $validated = $request->validate([
            'id' => 'required|integer',
            'payment_date' => 'nullable|date',
        ]);

        $inv = Invoice::whereIn('user_id', $ownerIds)->findOrFail($validated['id']);
        $paymentDate = !empty($validated['payment_date']) ? $validated['payment_date'] : date('Y-m-d');

        $inv->paid_amount = (float) $inv->total_amount;
        $inv->status = 'Paid';
        $inv->paid_at = $paymentDate;
        $inv->save();

        $waNotice = "";
        if (!empty($inv->customer_phone)) {
            try {
                $waService = app(\App\Services\WhatsAppService::class);
                $res = $waService->sendInvoiceDocument($inv, 'bill_paid');
                if (($res['status'] ?? '') === 'sent') {
                    $waNotice = " & WhatsApp sent";
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("WhatsApp send failed on markAsPaid: " . $e->getMessage());
            }
        }

        return back()->with('success', "Invoice #{$inv->invoice_number} marked as Paid{$waNotice}.");
    }

    public function sendAllDue(\App\Services\WhatsAppService $whatsAppService)
    {
        $ownerIds = $this->getStoreUserIds();
        $today = \Carbon\Carbon::today();

        $invoices = Invoice::whereIn('user_id', $ownerIds)
            ->whereNotIn('status', ['Paid', 'Cancelled', 'cancelled'])
            ->whereNotNull('customer_phone')
            ->whereRaw('TRIM(customer_phone) != ""')
            ->whereRaw('(total_amount - COALESCE(paid_amount, 0)) > 0.01')
            ->get();

        $eligible = $invoices->filter(function ($inv) use ($today) {
            $dueDateStr = $inv->due_date ?: $inv->invoice_date;
            if (!$dueDateStr) return false;
            $dueDate = \Carbon\Carbon::parse($dueDateStr)->startOfDay();
            $diffDays = $today->diffInDays($dueDate, false);
            return ($diffDays <= 3 && $diffDays >= -30);
        });

        if ($eligible->isEmpty()) {
            return back()->with('info', 'No pending invoices currently due within 3 days or overdue.');
        }

        $sent = 0;
        $failed = 0;
        foreach ($eligible as $inv) {
            try {
                $res = $whatsAppService->sendInvoiceDocument($inv, 'payment_reminder');
                if (($res['status'] ?? '') === 'sent' || ($res['mode'] ?? '') === 'automated') {
                    $sent++;
                } else {
                    $failed++;
                }
            } catch (\Throwable $e) {
                $failed++;
            }
        }

        $msg = "✓ Dispatched {$sent} WhatsApp payment reminder(s).";
        if ($failed > 0) {
            $msg .= " ({$failed} queued/fallback)";
        }
        return back()->with('success', $msg);
    }
}
