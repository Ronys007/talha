<?php

namespace App\Console\Commands;

use App\Models\BusinessProfile;
use App\Models\PurchaseOrder;
use App\Models\WhatsappMessageLog;
use App\Services\WhatsAppService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendDuePurchaseRemindersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'purchases:send-due-reminders {--dry-run : Run without actually sending WhatsApp messages} {--force : Send reminder even if already sent today}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically send WhatsApp payment reminders to the user/merchant for purchase bills when 3 days remain before the due date and daily until the due date.';

    /**
     * Execute the console command.
     */
    public function handle(WhatsAppService $whatsAppService)
    {
        $today = Carbon::now(config('app.timezone', 'Asia/Kolkata'))->startOfDay();
        $isDryRun = (bool) $this->option('dry-run');
        $isForce = (bool) $this->option('force');

        $this->info("Scanning purchase orders for automatic WhatsApp payment reminders to admin (Window: Due in <= 3 days or Overdue)...");

        // Calculate date boundaries for high-performance SQL push-down:
        // Window: Overdue up to 30 days (-30) to Due in 3 days (+3)
        $minDueDate = $today->copy()->subDays(30)->toDateString();
        $maxDueDate = $today->copy()->addDays(3)->toDateString();

        // High-scale SQL query push-down:
        // 1. Not Paid or Cancelled
        // 2. Balance due > 0.01 (total_amount - paid_amount)
        // 3. Effective due date (COALESCE(due_date, order_date)) is between -30 days and +3 days
        $query = PurchaseOrder::whereNotIn('status', ['Paid', 'Cancelled', 'cancelled'])
            ->whereRaw('(total_amount - COALESCE(paid_amount, 0)) > 0.01')
            ->whereRaw('COALESCE(due_date, order_date) BETWEEN ? AND ?', [$minDueDate, $maxDueDate])
            ->orderBy('id');

        $totalMatching = (clone $query)->count();
        $this->info("Found {$totalMatching} eligible purchase orders within reminder window ({$minDueDate} to {$maxDueDate}).");

        if ($totalMatching === 0) {
            $this->info("No purchase orders require payment reminders today.");
            return 0;
        }

        $sentCount = 0;
        $skippedCount = 0;
        $failedCount = 0;
        $ownerPhoneCache = [];

        // Process in chunks of 100 to prevent PHP memory exhaustion at scale (1,000s of entries)
        $query->chunkById(100, function ($orders) use ($today, $isDryRun, $isForce, $whatsAppService, &$sentCount, &$skippedCount, &$failedCount, &$ownerPhoneCache) {
            foreach ($orders as $order) {
                $dueDateStr = $order->due_date ?: ($order->order_date ?: $order->created_at);
                $dueDate = Carbon::parse($dueDateStr)->startOfDay();
                $diffDays = $today->diffInDays($dueDate, false);

                // Re-verify exact bounds (<= 3 days remaining and >= -30 days overdue)
                if ($diffDays > 3 || $diffDays < -30) {
                    continue;
                }

                $billNo = $order->po_number ?: ($order->purchase_number ?: "PO-{$order->id}");
                $balanceDue = round((float)$order->total_amount - (float)($order->paid_amount ?? 0), 2);

                // Find merchant user phone number using resolved owner ID with in-memory caching
                $ownerId = $whatsAppService->resolveOwnerId($order->user_id);
                if (!array_key_exists($ownerId, $ownerPhoneCache)) {
                    $ownerPhoneCache[$ownerId] = $whatsAppService->resolveUserPhone($ownerId);
                }
                $userPhone = $ownerPhoneCache[$ownerId];

                if (empty($userPhone)) {
                    $this->warn("Skipping PO #{$billNo} - Merchant (User ID {$ownerId}) does not have a configured phone or connected WhatsApp session.");
                    $skippedCount++;
                    continue;
                }

                // Strict Security: Verify that the specific owner account (Admin or Super Admin) has their own WhatsApp connected
                $sessionStatus = $whatsAppService->getSessionStatus($ownerId);
                if (!$sessionStatus['success'] || ($sessionStatus['status'] ?? '') !== 'connected') {
                    $this->warn("Skipping PO #{$billNo} - Store Owner (User ID {$ownerId}) has not linked their WhatsApp account. Auto-reminders will not send from an unlinked account.");
                    $skippedCount++;
                    continue;
                }

                // Avoid duplicate reminder on the same calendar day for the same purchase order, unless forced
                if (!$isForce) {
                    $alreadySentToday = WhatsappMessageLog::where('purchase_order_id', $order->id)
                        ->where('trigger_type', 'purchase_reminder')
                        ->whereDate('created_at', $today->toDateString())
                        ->where('status', 'sent')
                        ->exists();

                    if ($alreadySentToday) {
                        $this->line("Skipping PO #{$billNo} - already notified today.");
                        $skippedCount++;
                        continue;
                    }
                }

                $statusText = $diffDays > 0 ? "{$diffDays} day(s) left" : ($diffDays === 0 ? "due TODAY" : abs($diffDays) . " day(s) OVERDUE");
                $this->info("Dispatching reminder for PO #{$billNo} (Supplier: {$order->supplier_name}) to admin phone {$userPhone} - {$statusText} (Due Date: {$dueDate->format('d M Y')}, Due: ₹{$balanceDue}).");

                if ($isDryRun) {
                    $sentCount++;
                    continue;
                }

                try {
                    $result = $whatsAppService->sendPurchaseReminderDocument($order, $userPhone);
                    if (($result['status'] ?? '') === 'sent' || ($result['success'] ?? false)) {
                        $sentCount++;
                        $this->info("✓ Purchase reminder PDF & message sent to user {$userPhone} for PO #{$billNo}.");
                    } else {
                        $this->warn("! Reminder fallback for PO #{$billNo}: " . ($result['error'] ?? 'fallback link generated'));
                    }
                } catch (\Throwable $e) {
                    $failedCount++;
                    Log::error("Failed auto purchase reminder for PO #{$order->id}: " . $e->getMessage());
                    $this->error("Error sending reminder for PO #{$order->id}: " . $e->getMessage());
                }

                // Anti-ban gentle sleep between automated reminder dispatches
                usleep(300000); // 300ms
            }
        });

        $this->info("Purchase auto-reminder routine completed: {$sentCount} sent, {$skippedCount} skipped, {$failedCount} failed.");
        return 0;
    }
}
