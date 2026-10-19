<?php

namespace App\Http\Controllers;

use App\Models\Inventory;
use App\Models\Invoice;
use App\Models\PurchaseOrder;
use Inertia\Inertia;

class HomeController extends Controller
{
    private function validatedDateRange(\Illuminate\Http\Request $request): array
    {
        $dates = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
        ]);

        if (!empty($dates['from']) && !empty($dates['to']) && $dates['to'] < $dates['from']) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'to' => 'The end date must be on or after the start date.',
            ]);
        }

        if ($request->boolean('all')) {
            $dates['from'] = null;
            $dates['to'] = null;
            return $dates;
        }

        if (empty($dates['from']) && empty($dates['to'])) {
            $dates['from'] = now()->startOfMonth()->toDateString();
            $dates['to'] = now()->toDateString();
        }

        return $dates;
    }

    private function getStatsForMode(array $userIds, string $mode, ?string $fromDate = null, ?string $toDate = null)
    {
        $purchaseQuery = PurchaseOrder::whereIn('user_id', $userIds)
            ->whereNotIn('status', ['Cancelled', 'cancelled']);
        if ($fromDate) {
            $purchaseQuery->where(function ($q) use ($fromDate) {
                $q->whereDate('order_date', '>=', $fromDate)
                  ->orWhere(function ($sub) use ($fromDate) {
                      $sub->whereNull('order_date')->whereDate('created_at', '>=', $fromDate);
                  });
            });
        }
        if ($toDate) {
            $purchaseQuery->where(function ($q) use ($toDate) {
                $q->whereDate('order_date', '<=', $toDate)
                  ->orWhere(function ($sub) use ($toDate) {
                      $sub->whereNull('order_date')->whereDate('created_at', '<=', $toDate);
                  });
            });
        }

        // Direct count of ALL purchases (manual, uploaded, GST, non-GST)
        $totalPurchases = (clone $purchaseQuery)->count();

        $purchasesWithGstQuery = (clone $purchaseQuery)->where(function ($q) {
            $q->where('total_gst', '>', 0)
              ->orWhere('cgst', '>', 0)
              ->orWhere('sgst', '>', 0)
              ->orWhere('igst', '>', 0)
              ->orWhere('tax_rate', '>', 0);
        });
        $purchasesWithGstCount = $purchasesWithGstQuery->count();
        $purchasesWithoutGstCount = max(0, $totalPurchases - $purchasesWithGstCount);

        $totalItems = Inventory::whereIn('user_id', $userIds)
            ->where('mode', $mode)
            ->count();

        $invoiceQuery = Invoice::whereIn('user_id', $userIds)
            ->whereNotIn('status', ['Cancelled', 'cancelled']);
        if ($fromDate) {
            $invoiceQuery->where(function ($q) use ($fromDate) {
                $q->whereDate('invoice_date', '>=', $fromDate)
                  ->orWhere(function ($sub) use ($fromDate) {
                      $sub->whereNull('invoice_date')->whereDate('created_at', '>=', $fromDate);
                  });
            });
        }
        if ($toDate) {
            $invoiceQuery->where(function ($q) use ($toDate) {
                $q->whereDate('invoice_date', '<=', $toDate)
                  ->orWhere(function ($sub) use ($toDate) {
                      $sub->whereNull('invoice_date')->whereDate('created_at', '<=', $toDate);
                  });
            });
        }

        $invoices = (clone $invoiceQuery)->get([
            'id',
            'taxable_amount',
            'cgst_amount',
            'sgst_amount',
            'igst_amount',
            'total_tax',
            'total_amount',
            'paid_amount',
            'status',
        ]);

        $salesWithGst = $invoices->filter(function ($invoice) {
            return (float) $invoice->total_tax > 0
                || (float) $invoice->cgst_amount > 0
                || (float) $invoice->sgst_amount > 0
                || (float) $invoice->igst_amount > 0;
        });
        $salesWithoutGst = $invoices->reject(function ($invoice) {
            return (float) $invoice->total_tax > 0
                || (float) $invoice->cgst_amount > 0
                || (float) $invoice->sgst_amount > 0
                || (float) $invoice->igst_amount > 0;
        });

        // Direct count of ALL sales invoices (manual, uploaded, GST, non-GST, quotation converted to invoice)
        $totalSalesCount = $invoices->count();
        $salesWithGstCount = $salesWithGst->count();
        $salesWithoutGstCount = max(0, $totalSalesCount - $salesWithGstCount);

        // Sum of all sales invoices total_amount (GST, non-GST, quotation converted to invoice, manual, uploaded)
        $totalRevenue = (float) $invoices->sum('total_amount');
        $totalRevenueWithGst = (float) $salesWithGst->sum('total_amount');
        $totalRevenueWithoutGst = (float) $salesWithoutGst->sum('total_amount');

        // Sum of all pending balances across all sales invoices
        $pendingBalanceWithGst = 0;
        $pendingBalanceWithoutGst = 0;
        $totalPendingBalance = 0;

        foreach ($invoices as $invoice) {
            $total = (float) $invoice->total_amount;
            $statusLower = strtolower(trim((string) $invoice->status));
            $isPaid = ($statusLower === 'paid');
            $paid = $isPaid ? $total : min($total, max(0, (float) ($invoice->paid_amount ?? 0)));
            $due = max(0, $total - $paid);
            if ($due <= 0.001) {
                $due = 0;
            }

            if ($due > 0) {
                $totalPendingBalance += $due;
                $hasGst = ((float) $invoice->total_tax > 0
                    || (float) $invoice->cgst_amount > 0
                    || (float) $invoice->sgst_amount > 0
                    || (float) $invoice->igst_amount > 0);

                if ($hasGst) {
                    $pendingBalanceWithGst += $due;
                } else {
                    $pendingBalanceWithoutGst += $due;
                }
            }
        }
        $pendingBalance = $totalPendingBalance;

        $firstInvoiceDate = Invoice::whereIn('user_id', $userIds)
            ->whereNotIn('status', ['Cancelled', 'cancelled'])
            ->min(\Illuminate\Support\Facades\DB::raw('COALESCE(invoice_date, created_at)'));
        $firstPurchaseDate = PurchaseOrder::whereIn('user_id', $userIds)
            ->whereNotIn('status', ['Cancelled', 'cancelled'])
            ->min(\Illuminate\Support\Facades\DB::raw('COALESCE(order_date, created_at)'));
        $earliestDate = collect([$firstInvoiceDate, $firstPurchaseDate])
            ->filter()
            ->map(fn ($d) => substr((string) $d, 0, 10))
            ->min() ?? now()->startOfMonth()->toDateString();

        return [
            'totalPurchases' => $totalPurchases,
            'purchasesWithGstCount' => $purchasesWithGstCount,
            'purchasesWithoutGstCount' => $purchasesWithoutGstCount,
            'totalItems'     => $totalItems,
            'totalOrders'    => $totalSalesCount,
            'totalSalesCount' => $totalSalesCount,
            'salesWithGstCount' => $salesWithGstCount,
            'salesWithoutGstCount' => $salesWithoutGstCount,
            'totalRevenue'   => round($totalRevenue, 2),
            'totalRevenueWithGst' => round($totalRevenueWithGst, 2),
            'totalRevenueWithoutGst' => round($totalRevenueWithoutGst, 2),
            'pendingBalance' => round($pendingBalance, 2),
            'pendingBalanceWithGst' => round($pendingBalanceWithGst, 2),
            'pendingBalanceWithoutGst' => round($pendingBalanceWithoutGst, 2),
            'mode'           => $mode,
            'fromDate'       => $fromDate,
            'toDate'         => $toDate,
            'earliestDate'   => $earliestDate,
        ];
    }

    private function getStoreUserIds(): array
    {
        return auth()->user()?->getEffectiveStoreUserIds() ?? [auth()->id()];
    }

    public function index(\Illuminate\Http\Request $request)
    {
        $dates = $this->validatedDateRange($request);
        $userIds = $this->getStoreUserIds();
        $mode = $request->input('mode', 'standard');
        if (!in_array($mode, ['standard', 'barcode'])) {
            $mode = 'standard';
        }

        $user = auth()->user();
        $isSuperAdmin = $user && $user->isSuperAdmin();
        $adminData = null;
        $switchedAdmin = null;

        if ($isSuperAdmin) {
            $switchedAdminId = session('view_as_admin_id');
            if ($switchedAdminId) {
                $target = \App\Models\User::find($switchedAdminId);
                if ($target) {
                    $switchedAdmin = [
                        'id' => $target->id,
                        'name' => $target->name,
                        'email' => $target->email,
                    ];
                }
            }

            $allAdmins = \App\Models\User::where(function ($query) {
                $query->where('role', 'admin')->orWhereNull('role');
            })->where('id', '!=', $user->id)->orderBy('id', 'desc')->get();

            $totalAdmins = $allAdmins->count();
            $lockedOrExpiredAdmins = $allAdmins->filter(fn ($a) => $a->is_locked || $a->isTrialExpired())->count();
            $activeAdmins = $totalAdmins - $lockedOrExpiredAdmins;

            $adminData = [
                'admins' => $allAdmins->map(fn ($a) => [
                    'id' => $a->id,
                    'name' => $a->name,
                    'email' => $a->email,
                    'role' => $a->role ?? 'admin',
                    'is_locked' => (bool) $a->is_locked,
                    'trial_ends_at' => $a->trial_ends_at ? $a->trial_ends_at->format('Y-m-d H:i') : null,
                    'is_trial_expired' => $a->isTrialExpired(),
                    'days_left' => $a->days_left_in_trial,
                    'hours_left' => $a->hours_left_in_trial,
                    'trial_remaining_text' => $a->trial_remaining_formatted,
                    'created_at' => $a->created_at ? $a->created_at->format('Y-m-d') : null,
                ])->values(),
                'totalAdmins' => $totalAdmins,
                'activeAdmins' => $activeAdmins,
                'lockedAdmins' => $lockedOrExpiredAdmins,
                'switchedAdmin' => $switchedAdmin,
            ];
        }

        $recentPurchases = \App\Models\PurchaseOrder::whereIn('user_id', $userIds)
            ->whereNotIn('status', ['Cancelled', 'cancelled'])
            ->with('items')
            ->orderBy('created_at', 'desc')
            ->take(6)
            ->get();

        $recentInventory = \App\Models\Inventory::whereIn('user_id', $userIds)
            ->where('mode', $mode)
            ->orderBy('id', 'desc')
            ->take(6)
            ->get();

        $recentInvoices = Invoice::whereIn('user_id', $userIds)
            ->whereNotIn('status', ['Cancelled', 'cancelled'])
            ->orderByRaw('COALESCE(invoice_date, created_at) desc')
            ->orderBy('id', 'desc')
            ->take(6)
            ->get(['id', 'invoice_number', 'invoice_date', 'customer_name', 'total_amount', 'status']);

        $stats = $this->getStatsForMode($userIds, $mode, $dates['from'] ?? null, $dates['to'] ?? null);

        return Inertia::render('Dashboard', [
            'stats' => $stats,
            'dateRange' => [
                'from' => $dates['from'] ?? '',
                'to' => $dates['to'] ?? '',
            ],
            'earliestDate' => $stats['earliestDate'] ?? '',
            'adminData' => $adminData,
            'isSuperAdmin' => $isSuperAdmin,
            'switchedAdmin' => $switchedAdmin,
            'recentPurchases' => $recentPurchases,
            'recentInventory' => $recentInventory,
            'recentInvoices' => $recentInvoices,
        ]);
    }

    public function stats(\Illuminate\Http\Request $request)
    {
        $dates = $this->validatedDateRange($request);
        $userIds = $this->getStoreUserIds();
        $mode = $request->input('mode', 'standard');
        if (!in_array($mode, ['standard', 'barcode'])) {
            $mode = 'standard';
        }

        return response()->json($this->getStatsForMode($userIds, $mode, $dates['from'] ?? null, $dates['to'] ?? null));
    }


}