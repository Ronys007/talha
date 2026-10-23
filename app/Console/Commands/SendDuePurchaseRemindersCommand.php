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
    protected $signature = 'purchases:send-due-reminders {--dry-run : Run without actually sending WhatsApp messages}';

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
        $today = Carbon::today();
        $isDryRun = $this->option('dry-run');

        $this->info("Scanning purchase orders for automatic WhatsApp payment reminders to admin (Window: Due in <= 3 days or Overdue)...");

        // Find all purchase orders that:
        // 1. Are not fully paid or cancelled
        // 2. Have balance due > 0
        $orders = PurchaseOrder::whereNotIn('status', ['Paid', 'Cancelled', 'cancelled'])
            ->whereRaw('(total_amount - COALESCE(paid_amount, 0)) > 0.01')
            ->get();

        $eligibleOrders = $orders->filter(function (PurchaseOrder $order) use ($today) {
            $dueDateStr = $order->due_date ?: ($order->order_date ?: $order->created_at);
            if (!$dueDateStr) return false;

            $dueDate = Carbon::parse($dueDateStr)->startOfDay();
            // Days remaining: positive if future/today, negative if past (overdue)
            $diffDays = $today->diffInDays($dueDate, false);

            return ($diffDays <= 3 && $diffDays >= -30);
        });

        $this->info("Found {$eligibleOrders->count()} purchase orders within the due/overdue reminder window.");

        $sentCount = 0;
        $skippedCount = 0;

        foreach ($eligibleOrders as $order) {
            $dueDateStr = $order->due_date ?: ($order->order_date ?: $order->created_at);
            $dueDate = Carbon::parse($dueDateStr)->startOfDay();
            $diffDays = $today->diffInDays($dueDate, false);
            $billNo = $order->po_number ?: ($order->purchase_number ?: "PO-{$order->id}");

            // Find merchant user phone number using resolved owner ID
            $ownerId = $whatsAppService->resolveOwnerId($order->user_id);
            $userPhone = $whatsAppService->resolveUserPhone($ownerId);

            if (empty($userPhone)) {
                $this->warn("Skipping PO #{$billNo} - Merchant (User ID {$ownerId}) does not have a configured phone or connected WhatsApp session.");
                $skippedCount++;
                continue;
            }

            // Avoid duplicate reminder on the same calendar day for the same purchase order
            $alreadySentToday = WhatsappMessageLog::where('purchase_order_id', $order->id)
                ->where('trigger_type', 'purchase_reminder')
                ->whereDate('created_at', $today)
                ->whereIn('status', ['sent', 'fallback_link'])
                ->exists();

            if ($alreadySentToday) {
                $this->line("Skipping PO #{$billNo} - already notified today.");
                $skippedCount++;
                continue;
            }

            $statusText = $diffDays > 0 ? "{$diffDays} day(s) left" : ($diffDays === 0 ? "due TODAY" : abs($diffDays) . " day(s) OVERDUE");
            $this->info("Dispatching reminder for PO #{$billNo} (Supplier: {$order->supplier_name}) to admin phone {$userPhone} - {$statusText} (Due Date: {$dueDate->format('d M Y')}).");

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
                    $this->warn("! Reminder queued/fallback for PO #{$billNo}: " . ($result['error'] ?? 'fallback link generated'));
                }
            } catch (\Throwable $e) {
                Log::error("Failed auto purchase reminder for PO #{$order->id}: " . $e->getMessage());
                $this->error("Error sending reminder for PO #{$order->id}: " . $e->getMessage());
            }

            // Anti-ban gentle sleep between automated reminder dispatches
            usleep(500000); // 500ms
        }

        $this->info("Purchase auto-reminder routine completed: {$sentCount} sent, {$skippedCount} skipped.");
        return 0;
    }
}
