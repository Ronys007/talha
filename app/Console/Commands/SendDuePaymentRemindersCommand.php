<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\WhatsappMessageLog;
use App\Services\WhatsAppService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendDuePaymentRemindersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'invoices:send-due-reminders {--dry-run : Run without actually sending WhatsApp messages} {--force : Send reminder even if already sent today}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically send WhatsApp payment reminders for invoices with outstanding dues when 3 days or fewer remain before the due date, including on the due date.';

    /**
     * Execute the console command.
     */
    public function handle(WhatsAppService $whatsAppService)
    {
        $today = Carbon::now(config('app.timezone', 'Asia/Kolkata'))->startOfDay();
        $isDryRun = (bool) $this->option('dry-run');
        $isForce = (bool) $this->option('force');

        $this->info("Scanning invoices for automatic WhatsApp payment reminders (Target: Due in <= 3 days or Overdue)...");

        // Calculate date boundaries for high-performance SQL push-down:
        // Window: Overdue up to 30 days (-30) to Due in 3 days (+3)
        $minDueDate = $today->copy()->subDays(30)->toDateString();
        $maxDueDate = $today->copy()->addDays(3)->toDateString();

        // High-scale SQL query push-down:
        // 1. Not Paid or Cancelled
        // 2. Customer phone is present and not blank
        // 3. Balance due > 0.01 (total_amount - paid_amount)
        // 4. Effective due date (COALESCE(due_date, invoice_date)) is between -30 days and +3 days
        $query = Invoice::whereNotIn('status', ['Paid', 'Cancelled', 'cancelled'])
            ->whereNotNull('customer_phone')
            ->whereRaw('TRIM(customer_phone) != ""')
            ->whereRaw('(total_amount - COALESCE(paid_amount, 0)) > 0.01')
            ->whereRaw('COALESCE(due_date, invoice_date) BETWEEN ? AND ?', [$minDueDate, $maxDueDate])
            ->orderBy('id');

        $totalMatching = (clone $query)->count();
        $this->info("Found {$totalMatching} eligible invoices within reminder window ({$minDueDate} to {$maxDueDate}).");

        if ($totalMatching === 0) {
            $this->info("No invoices require payment reminders today.");
            return 0;
        }

        $sentCount = 0;
        $skippedCount = 0;
        $failedCount = 0;

        // Process in chunks of 100 to prevent PHP memory exhaustion at scale (1,000s of entries)
        $query->chunkById(100, function ($invoices) use ($today, $isDryRun, $isForce, $whatsAppService, &$sentCount, &$skippedCount, &$failedCount) {
            foreach ($invoices as $invoice) {
                $dueDateStr = $invoice->due_date ?: $invoice->invoice_date;
                $dueDate = Carbon::parse($dueDateStr)->startOfDay();
                // diffInDays: positive if dueDate is in the future/today, negative if past (overdue)
                $diffDays = $today->diffInDays($dueDate, false);

                // Re-verify exact bounds (<= 3 days remaining and >= -30 days overdue)
                if ($diffDays > 3 || $diffDays < -30) {
                    continue;
                }

                $balanceDue = round((float)$invoice->total_amount - (float)($invoice->paid_amount ?? 0), 2);
                $statusText = $diffDays > 0 ? "{$diffDays} day(s) left until due" : ($diffDays === 0 ? "due TODAY" : abs($diffDays) . " day(s) OVERDUE");

                // Avoid duplicate reminder on the same calendar day for the same invoice, unless forced.
                // NOTE: We only consider status = 'sent' as a completed reminder. If previous run was fallback_link,
                // we allow retrying automated delivery when Baileys is back online.
                if (!$isForce) {
                    $alreadySentToday = WhatsappMessageLog::where('invoice_id', $invoice->id)
                        ->where('trigger_type', 'payment_reminder')
                        ->whereDate('created_at', $today->toDateString())
                        ->where('status', 'sent')
                        ->exists();

                    if ($alreadySentToday) {
                        $this->line("Skipping Invoice #{$invoice->invoice_number} - already notified today.");
                        $skippedCount++;
                        continue;
                    }
                }

                // Strict Security: Verify that the specific owner account (Admin or Super Admin) has their own WhatsApp connected
                $ownerId = $whatsAppService->resolveOwnerId($invoice->user_id);
                $sessionStatus = $whatsAppService->getSessionStatus($ownerId);
                if (!$sessionStatus['success'] || ($sessionStatus['status'] ?? '') !== 'connected') {
                    $this->warn("Skipping Invoice #{$invoice->invoice_number} - Store Owner (User ID {$ownerId}) has not linked their WhatsApp account. Auto-reminders will not send from an unlinked account.");
                    $skippedCount++;
                    continue;
                }

                $this->info("Dispatching reminder for Invoice #{$invoice->invoice_number} ({$invoice->customer_name}) - {$statusText} (Due Date: {$dueDate->format('d M Y')}, Due: ₹{$balanceDue})");

                if ($isDryRun) {
                    $sentCount++;
                    continue;
                }

                try {
                    $result = $whatsAppService->sendInvoiceDocument($invoice, 'payment_reminder');
                    if (($result['status'] ?? '') === 'sent' || ($result['success'] ?? false)) {
                        $sentCount++;
                        $this->info("✓ Reminder sent to {$invoice->customer_phone} ({$invoice->customer_name}).");
                    } else {
                        $this->warn("! Reminder fallback for {$invoice->customer_phone}: " . ($result['error'] ?? 'fallback link generated'));
                    }
                } catch (\Throwable $e) {
                    $failedCount++;
                    Log::error("Failed auto reminder for Invoice #{$invoice->id}: " . $e->getMessage());
                    $this->error("Error sending reminder for Invoice #{$invoice->id}: " . $e->getMessage());
                }

                // Anti-ban gentle sleep between automated reminder dispatches
                usleep(300000); // 300ms
            }
        });

        $this->info("Auto-reminder routine completed: {$sentCount} sent, {$skippedCount} skipped, {$failedCount} failed.");
        return 0;
    }
}
