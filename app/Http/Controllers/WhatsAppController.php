<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessWhatsappBroadcastJob;
use App\Models\BusinessProfile;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\WhatsappBroadcast;
use App\Models\WhatsappBroadcastLog;
use App\Models\WhatsappMessageLog;
use App\Models\WhatsappTemplate;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class WhatsAppController extends Controller
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

    /**
     * WhatsApp Automation Hub Dashboard
     */
    public function index(Request $request, WhatsAppService $whatsAppService)
    {
        $ownerId = $this->getOwnerId();
        $ownerIds = $this->getStoreUserIds();

        // 1. Session status
        $sessionStatus = $whatsAppService->getSessionStatus($ownerId);

        // 2. Templates (ensure defaults exist)
        $defaults = WhatsappTemplate::getDefaultTemplates();
        $templates = [];
        foreach ($defaults as $type => $defaultData) {
            $templates[$type] = $whatsAppService->getTemplate($ownerId, $type);
        }

        // 3. Merchant business profile (UPI ID, Google Review URL)
        $profile = BusinessProfile::where('user_id', $ownerId)->first();

        // 4. Broadcast campaigns
        $broadcasts = WhatsappBroadcast::where('user_id', $ownerId)
            ->withCount(['logs as pending_count' => fn($q) => $q->where('status', 'pending')])
            ->orderBy('created_at', 'desc')
            ->take(15)
            ->get();

        // 5. Message logs
        $logs = WhatsappMessageLog::where('user_id', $ownerId)
            ->orderBy('created_at', 'desc')
            ->paginate(20)
            ->withQueryString();

        // 6. Quota and Stats
        $remainingQuota = $whatsAppService->getRemainingDailyBroadcastQuota($ownerId);
        $dailyLimit = (int) config('services.whatsapp.daily_broadcast_limit', 150);
        $usedToday = max(0, $dailyLimit - $remainingQuota);

        $customerCount = Customer::whereIn('user_id', $ownerIds)->count();
        $pendingBillsCount = Invoice::whereIn('user_id', $ownerIds)
            ->whereNotIn('status', ['Paid', 'Cancelled', 'cancelled'])
            ->whereRaw('(total_amount - paid_amount) > 0.01')
            ->count();

        return Inertia::render('WhatsApp/Index', [
            'sessionStatus' => $sessionStatus,
            'templates' => $templates,
            'profile' => [
                'business_name' => $profile?->business_name ?? auth()->user()?->name ?? 'Store',
                'upi_id' => $profile?->upi_id ?? '',
                'google_review_url' => $profile?->google_review_url ?? '',
            ],
            'broadcasts' => $broadcasts,
            'logs' => $logs,
            'quota' => [
                'daily_limit' => $dailyLimit,
                'used_today' => $usedToday,
                'remaining' => $remainingQuota,
            ],
            'customerStats' => [
                'total_customers' => $customerCount,
                'pending_bills_count' => $pendingBillsCount,
            ],
        ]);
    }

    /**
     * Poll endpoint for live QR code & connection updates
     */
    public function getSessionStatus(WhatsAppService $whatsAppService)
    {
        $ownerId = $this->getOwnerId();
        $status = $whatsAppService->getSessionStatus($ownerId);
        return response()->json($status);
    }

    /**
     * Connect or request fresh QR
     */
    public function connectSession(WhatsAppService $whatsAppService)
    {
        $ownerId = $this->getOwnerId();
        $result = $whatsAppService->connectSession($ownerId);
        return back()->with('success', 'WhatsApp connection initiated. Scan the QR code with WhatsApp.');
    }

    /**
     * Logout and wipe session
     */
    public function logoutSession(WhatsAppService $whatsAppService)
    {
        $ownerId = $this->getOwnerId();
        $whatsAppService->logoutSession($ownerId);
        return back()->with('success', 'WhatsApp session logged out and cleared successfully.');
    }

    /**
     * Send test message
     */
    public function sendTest(Request $request, WhatsAppService $whatsAppService)
    {
        $request->validate([
            'phone' => 'required|string',
            'message' => 'required|string',
        ]);

        $ownerId = $this->getOwnerId();
        $result = $whatsAppService->sendText(
            phone: $request->phone,
            message: $request->message,
            merchantId: $ownerId,
            triggerType: 'test',
            invoiceId: null,
            recipientName: 'Test Recipient'
        );

        if ($result['status'] === 'sent') {
            return back()->with('success', 'Test message delivered automatically via WhatsApp sidecar!');
        }

        return back()->with([
            'success' => 'Test message ready! If sidecar is offline, click the fallback link below.',
            'wa_me_url' => $result['wa_me_url'] ?? null,
        ]);
    }

    /**
     * Save templates and merchant UPI / Google Review settings
     */
    public function saveTemplates(Request $request, WhatsAppService $whatsAppService)
    {
        $ownerId = $this->getOwnerId();

        $request->validate([
            'upi_id' => 'nullable|string|max:100',
            'google_review_url' => 'nullable|url|max:500',
            'templates' => 'required|array',
            'templates.*.message' => 'required|string',
            'templates.*.title' => 'nullable|string',
        ]);

        // 1. Update BusinessProfile
        BusinessProfile::updateOrCreate(
            ['user_id' => $ownerId],
            [
                'business_name' => auth()->user()?->name ?? 'Store',
                'upi_id' => $request->input('upi_id'),
                'google_review_url' => $request->input('google_review_url'),
            ]
        );

        // 2. Update Templates
        foreach ($request->templates as $type => $data) {
            WhatsappTemplate::updateOrCreate(
                ['user_id' => $ownerId, 'type' => $type],
                [
                    'title' => $data['title'] ?? ucfirst(str_replace('_', ' ', $type)),
                    'message' => $data['message'],
                    'is_active' => true,
                ]
            );
        }

        return back()->with('success', 'WhatsApp templates and payment settings saved successfully.');
    }

    /**
     * Create and queue a Broadcast Campaign
     */
    public function createBroadcast(Request $request, WhatsAppService $whatsAppService)
    {
        $ownerId = $this->getOwnerId();

        $request->validate([
            'title' => 'required|string|max:150',
            'message_template' => 'required|string',
            'filter_type' => 'required|in:all,pending_balance,inactive_30,inactive_60',
        ]);

        $broadcast = WhatsappBroadcast::create([
            'user_id' => $ownerId,
            'title' => $request->title,
            'message_template' => $request->message_template,
            'filter_type' => $request->filter_type,
            'status' => 'scheduled',
            'scheduled_at' => now(),
        ]);

        // Dispatch background processing job with anti-ban queue delays
        ProcessWhatsappBroadcastJob::dispatch($broadcast->id);

        return back()->with('success', "Broadcast campaign '{$broadcast->title}' launched in the background with anti-ban throttling!");
    }

    /**
     * Pause an active broadcast campaign
     */
    public function pauseBroadcast($id)
    {
        $ownerId = $this->getOwnerId();
        $broadcast = WhatsappBroadcast::where('id', $id)->where('user_id', $ownerId)->firstOrFail();

        $broadcast->update(['status' => 'paused']);
        return back()->with('success', "Broadcast campaign '{$broadcast->title}' paused.");
    }

    /**
     * Cancel a broadcast campaign
     */
    public function cancelBroadcast($id)
    {
        $ownerId = $this->getOwnerId();
        $broadcast = WhatsappBroadcast::where('id', $id)->where('user_id', $ownerId)->firstOrFail();

        $broadcast->update(['status' => 'cancelled']);
        WhatsappBroadcastLog::where('broadcast_id', $broadcast->id)
            ->where('status', 'pending')
            ->update(['status' => 'skipped', 'error_message' => 'Campaign cancelled by merchant']);

        return back()->with('success', "Broadcast campaign '{$broadcast->title}' cancelled.");
    }

    /**
     * Send Invoice Notification (Trigger: New Bill or Manual 1-click)
     */
    public function sendInvoiceNotification($id, WhatsAppService $whatsAppService)
    {
        $ownerIds = $this->getStoreUserIds();
        $invoice = Invoice::whereIn('user_id', $ownerIds)->where('id', $id)->firstOrFail();

        if (empty($invoice->customer_phone)) {
            return back()->with('error', 'Customer phone number is missing from this invoice.');
        }

        $template = $whatsAppService->getTemplate($invoice->user_id, 'bill_created');
        $data = $whatsAppService->buildInvoiceMessageData($invoice);
        $message = $whatsAppService->renderTemplate($template->message, $data);

        $result = $whatsAppService->sendText(
            phone: $invoice->customer_phone,
            message: $message,
            merchantId: $invoice->user_id,
            triggerType: 'bill_created',
            invoiceId: $invoice->id,
            recipientName: $invoice->customer_name
        );

        if ($result['status'] === 'sent') {
            return back()->with('success', "Invoice notification sent to {$invoice->customer_name} via WhatsApp!");
        }

        return back()->with([
            'success' => "WhatsApp link generated! Click to send via WhatsApp Web/App.",
            'wa_me_url' => $result['wa_me_url'] ?? null,
        ]);
    }

    /**
     * Send Payment Reminder (Vasooli Trigger)
     */
    public function sendPaymentReminder($id, WhatsAppService $whatsAppService)
    {
        $ownerIds = $this->getStoreUserIds();
        $invoice = Invoice::whereIn('user_id', $ownerIds)->where('id', $id)->firstOrFail();

        if (empty($invoice->customer_phone)) {
            return back()->with('error', 'Customer phone number is missing from this invoice.');
        }

        $template = $whatsAppService->getTemplate($invoice->user_id, 'payment_reminder');
        $data = $whatsAppService->buildInvoiceMessageData($invoice);
        $message = $whatsAppService->renderTemplate($template->message, $data);

        $result = $whatsAppService->sendText(
            phone: $invoice->customer_phone,
            message: $message,
            merchantId: $invoice->user_id,
            triggerType: 'payment_reminder',
            invoiceId: $invoice->id,
            recipientName: $invoice->customer_name
        );

        if ($result['status'] === 'sent') {
            return back()->with('success', "Payment reminder sent to {$invoice->customer_name} via WhatsApp!");
        }

        return back()->with([
            'success' => "Payment reminder ready! Click to open WhatsApp.",
            'wa_me_url' => $result['wa_me_url'] ?? null,
        ]);
    }
}
