<?php

namespace App\Jobs;

use App\Models\BusinessProfile;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\User;
use App\Models\WhatsappBroadcast;
use App\Models\WhatsappBroadcastLog;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessWhatsappBroadcastJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $broadcastId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $broadcastId)
    {
        $this->broadcastId = $broadcastId;
    }

    /**
     * Execute the job.
     */
    public function handle(WhatsAppService $whatsAppService): void
    {
        $broadcast = WhatsappBroadcast::find($this->broadcastId);
        if (!$broadcast || in_array($broadcast->status, ['cancelled', 'completed'])) {
            return;
        }

        $broadcast->update(['status' => 'processing']);

        $owner = User::find($broadcast->user_id);
        $ownerIds = $owner ? $owner->getEffectiveStoreUserIds() : [$broadcast->user_id];
        $profile = BusinessProfile::where('user_id', $broadcast->user_id)->first();
        $shopName = $profile?->business_name ?: ($owner?->name ?: 'Our Store');

        // Step 1: Collect recipients based on filter_type
        $recipients = $this->resolveRecipients($broadcast->filter_type, $ownerIds);

        if (empty($recipients)) {
            $broadcast->update([
                'status' => 'completed',
                'total_recipients' => 0,
                'completed_at' => now(),
            ]);
            return;
        }

        $totalRecipients = count($recipients);
        $broadcast->update(['total_recipients' => $totalRecipients]);

        // Step 2: Check daily safety cap (Anti-Ban Guard)
        $remainingQuota = $whatsAppService->getRemainingDailyBroadcastQuota($broadcast->user_id);
        $greetings = ['Namaste', 'Hello', 'Dear', 'Pranam', 'Hi'];

        $accumulatedSeconds = 0;
        $queuedCount = 0;

        foreach ($recipients as $recipient) {
            $customerName = trim($recipient['name'] ?? 'Customer');
            $phone = trim($recipient['phone'] ?? '');

            if (empty($phone)) {
                continue;
            }

            // If safety cap reached, mark as skipped to protect WhatsApp number
            if ($queuedCount >= $remainingQuota) {
                WhatsappBroadcastLog::create([
                    'broadcast_id' => $broadcast->id,
                    'user_id' => $broadcast->user_id,
                    'customer_id' => $recipient['id'] ?? null,
                    'customer_name' => $customerName,
                    'phone' => $phone,
                    'message' => $broadcast->message_template,
                    'status' => 'skipped',
                    'error_message' => 'Daily safety quota reached (150 msgs/day cap). Skipped to prevent WhatsApp ban.',
                ]);
                continue;
            }

            // Anti-spam personalization: randomize greetings & unique message body
            $randomGreeting = $greetings[array_rand($greetings)];
            $personalizedMessage = $whatsAppService->renderTemplate($broadcast->message_template, [
                'customer_name' => $customerName,
                'shop_name' => $shopName,
                'balance_due' => number_format((float) ($recipient['balance_due'] ?? 0), 2),
                'greeting' => $randomGreeting,
                'google_review_link' => $profile?->google_review_url ?: '',
            ]);

            $log = WhatsappBroadcastLog::create([
                'broadcast_id' => $broadcast->id,
                'user_id' => $broadcast->user_id,
                'customer_id' => $recipient['id'] ?? null,
                'customer_name' => $customerName,
                'phone' => $phone,
                'message' => $personalizedMessage,
                'status' => 'pending',
            ]);

            // Anti-Ban Delay: Random 18 to 45 seconds gap between each dispatch
            $delayStep = rand(18, 45);
            $accumulatedSeconds += $delayStep;

            SendSingleBroadcastMessageJob::dispatch($log->id)
                ->delay(now()->addSeconds($accumulatedSeconds));

            $queuedCount++;
        }

        if ($queuedCount === 0 && $totalRecipients > 0) {
            $broadcast->update([
                'status' => 'paused',
                'completed_at' => now(),
            ]);
        }
    }

    /**
     * Resolve customer list based on campaign filter
     */
    protected function resolveRecipients(string $filterType, array $ownerIds): array
    {
        $customersQuery = Customer::whereIn('user_id', $ownerIds)
            ->whereNotNull('phone')
            ->where('phone', '!=', '');

        $results = [];

        switch ($filterType) {
            case 'pending_balance':
                // Find customers with pending invoices
                $unpaidInvoices = Invoice::whereIn('user_id', $ownerIds)
                    ->whereNotIn('status', ['Paid', 'Cancelled', 'cancelled'])
                    ->whereRaw('(total_amount - paid_amount) > 0.01')
                    ->get();

                $customerBalances = [];
                foreach ($unpaidInvoices as $inv) {
                    $cPhone = preg_replace('/\D+/', '', $inv->customer_phone ?? '');
                    if (!empty($cPhone)) {
                        $due = max(0, (float) $inv->total_amount - (float) ($inv->paid_amount ?? 0));
                        if (!isset($customerBalances[$cPhone])) {
                            $customerBalances[$cPhone] = [
                                'id' => null,
                                'name' => $inv->customer_name ?: 'Customer',
                                'phone' => $inv->customer_phone,
                                'balance_due' => 0,
                            ];
                        }
                        $customerBalances[$cPhone]['balance_due'] += $due;
                    }
                }
                $results = array_values($customerBalances);
                break;

            case 'inactive_30':
                // Customers who haven't had an invoice in past 30 days
                $thirtyDaysAgo = now()->subDays(30)->toDateString();
                $recentCustomerPhones = Invoice::whereIn('user_id', $ownerIds)
                    ->where('invoice_date', '>=', $thirtyDaysAgo)
                    ->pluck('customer_phone')
                    ->filter()
                    ->map(fn($p) => preg_replace('/\D+/', '', $p))
                    ->unique()
                    ->toArray();

                $allCustomers = $customersQuery->get();
                foreach ($allCustomers as $c) {
                    $clean = preg_replace('/\D+/', '', $c->phone ?? '');
                    if ($clean && !in_array($clean, $recentCustomerPhones)) {
                        $results[] = [
                            'id' => $c->id,
                            'name' => $c->name,
                            'phone' => $c->phone,
                            'balance_due' => 0,
                        ];
                    }
                }
                break;

            case 'inactive_60':
                // Customers who haven't had an invoice in past 60 days
                $sixtyDaysAgo = now()->subDays(60)->toDateString();
                $recentCustomerPhones = Invoice::whereIn('user_id', $ownerIds)
                    ->where('invoice_date', '>=', $sixtyDaysAgo)
                    ->pluck('customer_phone')
                    ->filter()
                    ->map(fn($p) => preg_replace('/\D+/', '', $p))
                    ->unique()
                    ->toArray();

                $allCustomers = $customersQuery->get();
                foreach ($allCustomers as $c) {
                    $clean = preg_replace('/\D+/', '', $c->phone ?? '');
                    if ($clean && !in_array($clean, $recentCustomerPhones)) {
                        $results[] = [
                            'id' => $c->id,
                            'name' => $c->name,
                            'phone' => $c->phone,
                            'balance_due' => 0,
                        ];
                    }
                }
                break;

            case 'all':
            default:
                $customers = $customersQuery->get();
                $seenPhones = [];
                foreach ($customers as $c) {
                    $clean = preg_replace('/\D+/', '', $c->phone ?? '');
                    if ($clean && !isset($seenPhones[$clean])) {
                        $seenPhones[$clean] = true;
                        $results[] = [
                            'id' => $c->id,
                            'name' => $c->name,
                            'phone' => $c->phone,
                            'balance_due' => 0,
                        ];
                    }
                }
                break;
        }

        return $results;
    }
}
