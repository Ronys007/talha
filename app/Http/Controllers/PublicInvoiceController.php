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

        return Inertia::render('PublicInvoice/Show', [
            'invoice' => $invoice,
            'businessProfile' => $businessProfile,
            'summary' => [
                'shop_name' => $shopName,
                'total_amount' => $total,
                'paid_amount' => $paid,
                'balance_due' => $due,
                'google_review_url' => $businessProfile?->google_review_url ?? null,
                'public_url' => $invoice->getPublicUrl(),
            ],
        ]);
    }

    /**
     * Public invoice payment URL - redirects directly to the official online invoice
     */
    public function pay($hash)
    {
        $invoice = Invoice::where('invoice_hash', $hash)->firstOrFail();
        return redirect()->to(url('/i/' . $invoice->invoice_hash));
    }
}
