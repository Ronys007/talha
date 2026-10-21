<?php

namespace App\Console\Commands;

use App\Models\BusinessProfile;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\User;
use App\Models\WhatsappBroadcast;
use App\Models\WhatsappBroadcastLog;
use App\Services\WhatsAppService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ProcessWhatsappBroadcastCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'whatsapp:process-broadcast {broadcastId? : Optional ID of the broadcast campaign} {--limit=0 : Max recipients to send in this cycle (0 for all)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process and send WhatsApp broadcast campaign messages in the background with anti-ban safety';

    /**
     * Execute the console command.
     */
    public function handle(WhatsAppService $whatsAppService): int
    {
        @set_time_limit(0);

        $broadcastId = $this->argument('broadcastId');
        $limit = (int) $this->option('limit');

        $query = WhatsappBroadcast::query();
        if (!empty($broadcastId)) {
            $query->where('id', (int) $broadcastId);
        } else {
            $query->whereIn('status', ['scheduled', 'processing']);
        }

        $broadcasts = $query->get();

        if ($broadcasts->isEmpty()) {
            $this->info('No broadcasts to process.');
            return Command::SUCCESS;
        }

        foreach ($broadcasts as $broadcast) {
            $this->processSingleBroadcast($broadcast, $whatsAppService, $limit);
        }

        return Command::SUCCESS;
    }

    protected function processSingleBroadcast(WhatsappBroadcast $broadcast, WhatsAppService $whatsAppService, int $limit = 0): void
    {
        // Refresh model
        $broadcast->refresh();

        if (in_array($broadcast->status, ['cancelled', 'completed'])) {
            return;
        }

        $broadcast->update(['status' => 'processing']);
        $this->info("Processing Broadcast #{$broadcast->id}: {$broadcast->title}");

        $owner = User::find($broadcast->user_id);
        $ownerIds = $owner ? $owner->getEffectiveStoreUserIds() : [$broadcast->user_id];
        $profile = BusinessProfile::where('user_id', $broadcast->user_id)->first();
        $shopName = $profile?->business_name ?: ($owner?->name ?: 'Our Store');

        // Check if logs already exist for this campaign
        $existingLogsCount = WhatsappBroadcastLog::where('broadcast_id', $broadcast->id)->count();

        if ($existingLogsCount === 0) {
            $recipients = $this->resolveRecipients($broadcast, $ownerIds);

            if (empty($recipients)) {
                $broadcast->update([
                    'status' => 'completed',
                    'total_recipients' => 0,
                    'completed_at' => now(),
                ]);
                $this->warn("Broadcast #{$broadcast->id} has no recipients. Marked as completed.");
                return;
            }

            $broadcast->update(['total_recipients' => count($recipients)]);
            $remainingQuota = $whatsAppService->getRemainingDailyBroadcastQuota($broadcast->user_id);
            $greetings = ['Namaste', 'Hello', 'Dear', 'Pranam', 'Hi'];
            $queued = 0;

            foreach ($recipients as $recipient) {
                $customerName = trim($recipient['name'] ?? 'Customer');
                $phone = trim($recipient['phone'] ?? '');

                if (empty($phone)) {
                    continue;
                }

                if ($queued >= $remainingQuota) {
                    WhatsappBroadcastLog::create([
                        'broadcast_id' => $broadcast->id,
                        'user_id' => $broadcast->user_id,
                        'customer_id' => $recipient['id'] ?? null,
                        'customer_name' => $customerName,
                        'phone' => $phone,
                        'message' => $broadcast->message_template,
                        'status' => 'skipped',
                        'error_message' => 'Daily safety quota reached (150 msgs/day cap). Skipped to protect WhatsApp number.',
                    ]);
                    continue;
                }

                $randomGreeting = $greetings[array_rand($greetings)];
                $due = (float) ($recipient['balance_due'] ?? 0);
                $upiLink = '';
                if (!empty($profile?->upi_id)) {
                    $upiLink = $due > 0 
                        ? $whatsAppService->generateUpiPayUrl($profile->upi_id, $shopName, $due, '') 
                        : "upi://pay?pa={$profile->upi_id}&pn=" . rawurlencode($shopName) . "&cu=INR";
                }

                $personalizedMessage = $whatsAppService->renderTemplate($broadcast->message_template, [
                    'customer_name' => $customerName,
                    'shop_name' => $shopName,
                    'balance_due' => number_format($due, 2),
                    'greeting' => $randomGreeting,
                    'upi_link' => $upiLink,
                    'google_review_link' => $profile?->google_review_url ?: '',
                ]);

                WhatsappBroadcastLog::create([
                    'broadcast_id' => $broadcast->id,
                    'user_id' => $broadcast->user_id,
                    'customer_id' => $recipient['id'] ?? null,
                    'customer_name' => $customerName,
                    'phone' => $phone,
                    'message' => $personalizedMessage,
                    'status' => 'pending',
                ]);

                $queued++;
            }
        }

        // Now process pending logs (up to limit if set)
        $pendingLogsQuery = WhatsappBroadcastLog::where('broadcast_id', $broadcast->id)
            ->where('status', 'pending')
            ->orderBy('id', 'asc');

        if ($limit > 0) {
            $pendingLogsQuery->limit($limit);
        }

        $pendingLogs = $pendingLogsQuery->get();

        $imagePath = null;
        $imageBase64 = null;
        $imageName = null;

        if (!empty($broadcast->image_path)) {
            $fullPath = storage_path('app/public/' . $broadcast->image_path);
            if (file_exists($fullPath)) {
                $imagePath = $fullPath;
                $imageBase64 = base64_encode(file_get_contents($fullPath));
                $imageName = $broadcast->file_name ?: basename($fullPath);
            }
        }

        foreach ($pendingLogs as $log) {
            // Check status before sending each message (in case user paused or cancelled)
            $broadcast->refresh();
            if (in_array($broadcast->status, ['cancelled', 'paused'])) {
                $this->warn("Broadcast #{$broadcast->id} is {$broadcast->status}. Halting execution.");
                return;
            }

            try {
                if ($imageBase64) {
                    $result = $whatsAppService->sendDocument(
                        phone: $log->phone,
                        fileUrlOrBase64: $imageBase64,
                        fileName: $imageName ?: 'Offer.jpg',
                        caption: $log->message,
                        merchantId: $broadcast->user_id,
                        triggerType: 'broadcast',
                        invoiceId: null,
                        recipientName: $log->customer_name
                    );
                } else {
                    $result = $whatsAppService->sendText(
                        phone: $log->phone,
                        message: $log->message,
                        merchantId: $broadcast->user_id,
                        triggerType: 'broadcast',
                        invoiceId: null,
                        recipientName: $log->customer_name
                    );
                }

                $status = (($result['status'] ?? '') === 'sent' || ($result['status'] ?? '') === 'fallback_link') ? 'sent' : 'failed';

                $log->update([
                    'status' => $status,
                    'sent_at' => now(),
                    'error_message' => $result['error'] ?? null,
                ]);

                if ($status === 'sent') {
                    $broadcast->increment('sent_count');
                    $this->info(" -> Sent to {$log->phone} ({$log->customer_name})");
                } else {
                    $broadcast->increment('failed_count');
                    $this->warn(" -> Failed for {$log->phone}: " . ($result['error'] ?? 'Unknown error'));
                }
            } catch (\Throwable $e) {
                Log::error("Broadcast sending error [Log #{$log->id}]: " . $e->getMessage());
                $log->update([
                    'status' => 'failed',
                    'error_message' => $e->getMessage(),
                ]);
                $broadcast->increment('failed_count');
                $this->error(" -> Exception for {$log->phone}: " . $e->getMessage());
            }

            // Throttling gap: 1s if web limit mode, 2-3s if daemon mode
            if ($limit > 0) {
                sleep(1);
            } else {
                sleep(rand(2, 3));
            }
        }

        // Check if all recipients for this broadcast have completed
        $remainingPending = WhatsappBroadcastLog::where('broadcast_id', $broadcast->id)
            ->where('status', 'pending')
            ->count();

        if ($remainingPending === 0) {
            $broadcast->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);
            $this->info("Broadcast #{$broadcast->id} completed successfully.");
        }
    }

    /**
     * Resolve customer list based on campaign filter or custom numbers
     */
    protected function resolveRecipients(WhatsappBroadcast $broadcast, array $ownerIds): array
    {
        // 1. Custom Numbers Mode
        if ($broadcast->recipient_mode === 'custom' || !empty($broadcast->custom_numbers)) {
            $raw = (string) $broadcast->custom_numbers;
            $items = preg_split('/[\r\n,;]+/', $raw);
            $numbers = [];

            // Load saved customers to enrich names if phone matches
            $savedCustomers = Customer::whereIn('user_id', $ownerIds)
                ->whereNotNull('phone')
                ->where('phone', '!=', '')
                ->get()
                ->keyBy(function ($c) {
                    $clean = preg_replace('/\D+/', '', $c->phone);
                    return strlen($clean) === 10 ? '91' . $clean : $clean;
                });

            foreach ($items as $item) {
                $trimmed = trim($item);
                if (empty($trimmed)) {
                    continue;
                }

                $clean = preg_replace('/\D+/', '', $trimmed);
                if (strlen($clean) === 10 && in_array(substr($clean, 0, 1), ['6', '7', '8', '9'])) {
                    $clean = '91' . $clean;
                }

                if (strlen($clean) >= 10 && strlen($clean) <= 15) {
                    $matchedCustomer = $savedCustomers->get($clean);
                    $numbers[$clean] = [
                        'id' => $matchedCustomer?->id,
                        'name' => $matchedCustomer?->name ?: 'Valued Customer',
                        'phone' => $clean,
                        'balance_due' => 0,
                    ];
                }
            }

            // Limit to max 150
            return array_slice(array_values($numbers), 0, 150);
        }

        // 2. Saved Segment Filters
        $customersQuery = Customer::whereIn('user_id', $ownerIds)
            ->whereNotNull('phone')
            ->where('phone', '!=', '');

        $results = [];

        switch ($broadcast->filter_type) {
            case 'pending_balance':
                $unpaidInvoices = Invoice::whereIn('user_id', $ownerIds)
                    ->whereNotIn('status', ['Paid', 'Cancelled', 'cancelled'])
                    ->whereRaw('(total_amount - paid_amount) > 0.01')
                    ->get();

                $customerBalances = [];
                foreach ($unpaidInvoices as $inv) {
                    $cPhone = preg_replace('/\D+/', '', $inv->customer_phone ?? '');
                    if (!empty($cPhone)) {
                        if (strlen($cPhone) === 10 && in_array(substr($cPhone, 0, 1), ['6', '7', '8', '9'])) {
                            $cPhone = '91' . $cPhone;
                        }
                        $due = max(0, (float) $inv->total_amount - (float) ($inv->paid_amount ?? 0));
                        if (!isset($customerBalances[$cPhone])) {
                            $customerBalances[$cPhone] = [
                                'id' => null,
                                'name' => $inv->customer_name ?: 'Customer',
                                'phone' => $cPhone,
                                'balance_due' => 0,
                            ];
                        }
                        $customerBalances[$cPhone]['balance_due'] += $due;
                    }
                }
                $results = array_values($customerBalances);
                break;

            case 'inactive_30':
                $activeCustomerNames = Invoice::whereIn('user_id', $ownerIds)
                    ->where('created_at', '>=', now()->subDays(30))
                    ->pluck('customer_name')
                    ->filter()
                    ->unique()
                    ->toArray();

                $results = $customersQuery
                    ->whereNotIn('name', $activeCustomerNames)
                    ->get(['id', 'name', 'phone'])
                    ->map(fn($c) => ['id' => $c->id, 'name' => $c->name, 'phone' => $c->phone, 'balance_due' => 0])
                    ->toArray();
                break;

            case 'inactive_60':
                $activeCustomerNames = Invoice::whereIn('user_id', $ownerIds)
                    ->where('created_at', '>=', now()->subDays(60))
                    ->pluck('customer_name')
                    ->filter()
                    ->unique()
                    ->toArray();

                $results = $customersQuery
                    ->whereNotIn('name', $activeCustomerNames)
                    ->get(['id', 'name', 'phone'])
                    ->map(fn($c) => ['id' => $c->id, 'name' => $c->name, 'phone' => $c->phone, 'balance_due' => 0])
                    ->toArray();
                break;

            case 'all':
            default:
                $results = $customersQuery
                    ->get(['id', 'name', 'phone'])
                    ->map(fn($c) => ['id' => $c->id, 'name' => $c->name, 'phone' => $c->phone, 'balance_due' => 0])
                    ->toArray();
                break;
        }

        return array_slice($results, 0, 150);
    }
}
