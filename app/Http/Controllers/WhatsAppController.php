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
use Illuminate\Support\Facades\DB;
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
        $pendingBalanceSum = (float) Invoice::whereIn('user_id', $ownerIds)
            ->whereNotIn('status', ['Paid', 'Cancelled', 'cancelled'])
            ->whereRaw('(total_amount - paid_amount) > 0.01')
            ->sum(DB::raw('total_amount - paid_amount'));

        $totalSentLogs = WhatsappMessageLog::where('user_id', $ownerId)
            ->where('status', 'sent')
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
                'total_sent' => $totalSentLogs,
            ],
            'customerStats' => [
                'total_customers' => $customerCount,
                'pending_bills_count' => $pendingBillsCount,
                'pending_balance_sum' => $pendingBalanceSum,
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
    public function connectSession(Request $request, WhatsAppService $whatsAppService)
    {
        $ownerId = $this->getOwnerId();
        $result = $whatsAppService->connectSession($ownerId);

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json($result);
        }

        if (!($result['success'] ?? false)) {
            $msg = $result['error'] ?? 'Failed to connect to WhatsApp sidecar service.';
            if (!empty($result['sidecar_url'])) {
                $msg .= " (Sidecar: {$result['sidecar_url']})";
            }
            return back()->with('error', $msg);
        }

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
            return back()->with('success', '✓ Test message sent to WhatsApp');
        }

        return back()->with('error', 'WhatsApp not connected. Scan QR code in WhatsApp Hub.');
    }

    /**
     * Save templates and merchant UPI / Google Review settings
     */
    public function saveTemplates(Request $request, WhatsAppService $whatsAppService)
    {
        if (!auth()->user()?->isSuperAdmin()) {
            abort(403, 'Unauthorized. Only Super Admin can modify Billing & UPI Templates.');
        }

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
            'recipient_mode' => 'required|in:filter,custom',
            'filter_type' => 'nullable|in:all,pending_balance,inactive_30,inactive_60',
            'custom_numbers' => 'nullable|string',
            'image' => 'nullable|file|mimes:jpeg,png,jpg,webp,gif,pdf,doc,docx,xls,xlsx,zip|max:15360',
        ]);

        $recipientMode = $request->input('recipient_mode', 'filter');
        $cleanNumbers = [];

        if ($recipientMode === 'custom') {
            $raw = (string) $request->input('custom_numbers', '');
            $items = preg_split('/[\r\n,;]+/', $raw);
            foreach ($items as $item) {
                $c = preg_replace('/\D+/', '', trim($item));
                if (strlen($c) === 10 && in_array(substr($c, 0, 1), ['6', '7', '8', '9'])) {
                    $c = '91' . $c;
                }
                if (strlen($c) >= 10 && strlen($c) <= 15) {
                    $cleanNumbers[$c] = true;
                }
            }

            $totalClean = count($cleanNumbers);
            if ($totalClean === 0) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'custom_numbers' => 'Please enter at least 1 valid mobile number (10 to 15 digits).',
                ]);
            }

            if ($totalClean > 150) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'custom_numbers' => "You entered {$totalClean} numbers. A maximum of 150 recipients is allowed per broadcast campaign.",
                ]);
            }
        }

        $imagePath = null;
        $originalFileName = null;
        if ($request->hasFile('image')) {
            $uploaded = $request->file('image');
            $originalFileName = $uploaded->getClientOriginalName();
            $imagePath = $uploaded->store('broadcasts', 'public');
        }

        $broadcast = WhatsappBroadcast::create([
            'user_id' => $ownerId,
            'title' => $request->title,
            'message_template' => $request->message_template,
            'image_path' => $imagePath,
            'file_name' => $originalFileName,
            'recipient_mode' => $recipientMode,
            'custom_numbers' => $recipientMode === 'custom' ? implode("\n", array_keys($cleanNumbers)) : null,
            'filter_type' => $request->filter_type ?? 'all',
            'status' => 'scheduled',
            'scheduled_at' => now(),
        ]);

        // Launch background processing runner immediately with full binary path & working directory
        $this->spawnBroadcastRunner((int) $broadcast->id);

        return back()->with('success', "Broadcast campaign '{$broadcast->title}' launched in the background!");
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
     * Resume / Run an active broadcast campaign
     */
    public function resumeBroadcast($id)
    {
        $ownerId = $this->getOwnerId();
        $broadcast = WhatsappBroadcast::where('id', $id)->where('user_id', $ownerId)->firstOrFail();

        $broadcast->update(['status' => 'processing']);

        $this->spawnBroadcastRunner((int) $broadcast->id);

        return back()->with('success', "Broadcast campaign '{$broadcast->title}' resumed.");
    }

    /**
     * AJAX step runner for active broadcast progress
     */
    public function stepBroadcast($id)
    {
        $ownerId = $this->getOwnerId();
        $broadcast = WhatsappBroadcast::where('id', $id)->where('user_id', $ownerId)->first();
        if (!$broadcast || in_array($broadcast->status, ['completed', 'cancelled', 'paused'])) {
            return response()->json([
                'status' => $broadcast?->status ?? 'not_found',
                'remaining' => 0,
                'sent_count' => $broadcast?->sent_count ?? 0,
                'total_recipients' => $broadcast?->total_recipients ?? 0,
            ]);
        }

        // Run next batch of recipients
        try {
            \Illuminate\Support\Facades\Artisan::call('whatsapp:process-broadcast', [
                'broadcastId' => $broadcast->id,
                '--limit' => 2,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("stepBroadcast error on #{$broadcast->id}: " . $e->getMessage());
        }

        $broadcast->refresh();
        $remaining = WhatsappBroadcastLog::where('broadcast_id', $broadcast->id)
            ->where('status', 'pending')
            ->count();

        return response()->json([
            'status' => $broadcast->status,
            'sent_count' => $broadcast->sent_count,
            'failed_count' => $broadcast->failed_count,
            'total_recipients' => $broadcast->total_recipients,
            'remaining' => $remaining,
        ]);
    }

    /**
     * Robust background execution of WhatsApp broadcast console command
     */
    private function spawnBroadcastRunner(int $broadcastId): void
    {
        $php = defined('PHP_BINARY') && file_exists(PHP_BINARY) ? PHP_BINARY : 'C:\\xampp\\php\\php.exe';
        if (!file_exists($php)) {
            $php = 'php';
        }
        $artisan = base_path('artisan');
        $baseDir = base_path();

        try {
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                $cmd = "cmd.exe /c \"cd /d " . escapeshellarg($baseDir) . " && " . escapeshellarg($php) . " " . escapeshellarg($artisan) . " whatsapp:process-broadcast " . (int) $broadcastId . " > NUL 2>&1\"";
                @pclose(popen("start /B " . $cmd, "r"));
            } else {
                $cmd = escapeshellarg($php) . " " . escapeshellarg($artisan) . " whatsapp:process-broadcast " . (int) $broadcastId . " > /dev/null 2>&1 &";
                @exec($cmd);
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Could not spawn background process for broadcast #{$broadcastId}: " . $e->getMessage());
        }
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

        $result = $whatsAppService->sendInvoiceDocument($invoice, 'bill_created');

        if (($result['status'] ?? '') === 'sent') {
            return back()->with('success', "✓ Invoice sent to {$invoice->customer_name} on WhatsApp");
        }

        if (!empty($result['wa_me_url'])) {
            return back()->with('success', "WhatsApp message ready for {$invoice->customer_name}")
                         ->with('wa_me_url', $result['wa_me_url']);
        }

        return back()->with('error', "WhatsApp is not connected. Please connect in WhatsApp Hub.");
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

        $result = $whatsAppService->sendInvoiceDocument($invoice, 'payment_reminder');

        if (($result['status'] ?? '') === 'sent') {
            return back()->with('success', "✓ Payment reminder sent to {$invoice->customer_name} on WhatsApp");
        }

        if (!empty($result['wa_me_url'])) {
            return back()->with('success', "Payment reminder ready for {$invoice->customer_name}")
                         ->with('wa_me_url', $result['wa_me_url']);
        }

        return back()->with('error', "WhatsApp is not connected. Please connect in WhatsApp Hub.");
    }

    /**
     * Send Purchase Bill Due Reminder to the User itself (payment fulfillment reminder)
     */
    public function sendPurchaseReminder($id, WhatsAppService $whatsAppService)
    {
        $ownerIds = $this->getStoreUserIds();
        $order = \App\Models\PurchaseOrder::whereIn('user_id', $ownerIds)->where('id', $id)->firstOrFail();

        $userPhone = $whatsAppService->resolveUserPhone($order->user_id);

        if (empty($userPhone)) {
            return back()->with('error', 'Phone number missing. Please configure Business Profile or link WhatsApp.');
        }

        $result = $whatsAppService->sendPurchaseReminderDocument($order, $userPhone);

        if (($result['status'] ?? '') === 'sent' || ($result['mode'] ?? '') === 'automated') {
            return back()->with('success', "✓ Purchase reminder sent to WhatsApp (+{$userPhone})");
        }

        if (($result['status'] ?? '') === 'fallback_link' || !empty($result['wa_me_url'])) {
            return back()->with('success', "WhatsApp reminder ready (+{$userPhone})")->with('wa_me_url', $result['wa_me_url'] ?? null);
        }

        return back()->with('error', "WhatsApp failed: " . ($result['error'] ?? 'Please check WhatsApp Hub.'));
    }
}
