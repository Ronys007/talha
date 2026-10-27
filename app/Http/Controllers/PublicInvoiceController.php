<?php

namespace App\Http\Controllers;

use App\Models\BusinessProfile;
use App\Models\Invoice;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PublicInvoiceController extends Controller
{
    public function show($hash, WhatsAppService $whatsAppService)
    {
        $invoice = Invoice::where('invoice_hash', $hash)
            ->with(['items'])
            ->firstOrFail();

        $businessProfile = BusinessProfile::where('user_id', $invoice->user_id)->first();
        $shopName = $invoice->seller_name ?: ($businessProfile?->business_name ?: 'Store');

        $total = (float) $invoice->total_amount;
        $paid = (float) ($invoice->paid_amount ?? 0);
        $due = max(0, $total - $paid);

        $upiPayUrl = '';
        if ($due > 0 && !empty($businessProfile?->upi_id)) {
            $upiPayUrl = $whatsAppService->generateUpiPayUrl(
                $businessProfile->upi_id,
                $shopName,
                $due,
                $invoice->invoice_number
            );
        }

        return Inertia::render('PublicInvoice/Show', [
            'invoice' => $invoice,
            'businessProfile' => $businessProfile,
            'summary' => [
                'shop_name' => $shopName,
                'total_amount' => $total,
                'paid_amount' => $paid,
                'balance_due' => $due,
                'upi_id' => $businessProfile?->upi_id ?? null,
                'upi_pay_url' => $upiPayUrl,
                'google_review_url' => $businessProfile?->google_review_url ?? null,
                'public_url' => $invoice->getPublicUrl(),
            ],
        ]);
    }

    /**
     * Dynamic Payment QR Destination (Strict 2-Scan Limit Enforcement)
     */
    public function pay($hash, WhatsAppService $whatsAppService)
    {
        $invoice = Invoice::where('invoice_hash', $hash)->firstOrFail();
        $businessProfile = BusinessProfile::where('user_id', $invoice->user_id)->first();
        $shopName = $invoice->seller_name ?: ($businessProfile?->business_name ?: 'Store');

        $total = (float) $invoice->total_amount;
        $paid = (float) ($invoice->paid_amount ?? 0);
        $due = max(0, $total - $paid);

        $cacheKey = "invoice_qr_scans_{$invoice->id}";
        $dbScans = (int) ($invoice->payment_qr_scans ?? 0);
        $cachedScans = (int) \Illuminate\Support\Facades\Cache::get($cacheKey, 0);
        $currentScans = max($dbScans, $cachedScans);

        // Security check: Only allow 2 scans
        if ($currentScans >= 2) {
            return response()->make(view('public.qr_limit_reached', [
                'invoice' => $invoice,
                'shopName' => $shopName,
                'businessProfile' => $businessProfile,
                'due' => $due,
            ]), 403);
        }

        // Increment scan count in DB and Cache
        $newScans = $currentScans + 1;
        try {
            $invoice->payment_qr_scans = $newScans;
            $invoice->save();
        } catch (\Throwable $e) {}
        \Illuminate\Support\Facades\Cache::put($cacheKey, $newScans, now()->addDays(60));

        $upiPayUrl = '';
        if ($due > 0 && !empty($businessProfile?->upi_id)) {
            $upiPayUrl = $whatsAppService->generateUpiPayUrl(
                $businessProfile->upi_id,
                $shopName,
                $due,
                $invoice->invoice_number
            );
        }

        return response()->make(view('public.pay_intent', [
            'invoice' => $invoice,
            'shopName' => $shopName,
            'businessProfile' => $businessProfile,
            'due' => $due,
            'upiId' => $businessProfile?->upi_id ?? '',
            'upiPayUrl' => $upiPayUrl,
            'currentScan' => $newScans,
            'maxScans' => 2,
        ]));
    }
}
