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
    protected $signature = 'invoices:send-due-reminders {--dry-run : Run without actually sending WhatsApp messages}';

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
        $today = Carbon::today();
        $isDryRun = $this->option('dry-run');

        $this->info("Scanning invoices for automatic WhatsApp payment reminders (Target: Due in <= 3 days or Overdue)...");

        // Find all invoices that:
        // 1. Are not fully paid or cancelled
        // 2. Have balance due > 0 (using COALESCE to avoid NULL arithmetic issues)
        // 3. Have a customer phone number
        // 4. Due date (or invoice date) is within reminder window (due in <= 3 days or overdue up to 30 days)
        $invoices = Invoice::whereNotIn('status', ['Paid', 'Cancelled', 'cancelled'])
            ->whereNotNull('customer_phone')
            ->whereRaw('TRIM(customer_phone) != ""')
            ->whereRaw('(total_amount - COALESCE(paid_amount, 0)) > 0.01')
            ->get();

        $eligibleInvoices = $invoices->filter(function (Invoice $invoice) use ($today) {
            $dueDateStr = $invoice->due_date ?: $invoice->invoice_date;
            if (!$dueDateStr) {
                return false;
            }

            $dueDate = Carbon::parse($dueDateStr)->startOfDay();
            // diffInDays: positive if dueDate is in the future/today, negative if past (overdue)
            $diffDays = $today->diffInDays($dueDate, false);

            // Remind if due in <= 3 days, due today, or overdue up to 30 days
            return ($diffDays <= 3 && $diffDays >= -30);
        });

        $this->info("Found {$eligibleInvoices->count()} invoices within the due/overdue reminder window.");

        $sentCount = 0;
        $skippedCount = 0;

        foreach ($eligibleInvoices as $invoice) {
            $dueDateStr = $invoice->due_date ?: $invoice->invoice_date;
            $dueDate = Carbon::parse($dueDateStr)->startOfDay();
            $diffDays = $today->diffInDays($dueDate, false);

            $statusText = $diffDays > 0 ? "{$diffDays} day(s) left until due" : ($diffDays === 0 ? "due TODAY" : abs($diffDays) . " day(s) OVERDUE");

            // Avoid duplicate reminder on the same calendar day for the same invoice
            $alreadySentToday = WhatsappMessageLog::where('invoice_id', $invoice->id)
                ->where('trigger_type', 'payment_reminder')
                ->whereDate('created_at', $today)
                ->whereIn('status', ['sent', 'fallback_link'])
                ->exists();

            if ($alreadySentToday) {
                $this->line("Skipping Invoice #{$invoice->invoice_number} - already notified today.");
                $skippedCount++;
                continue;
            }

            $this->info("Dispatching reminder for Invoice #{$invoice->invoice_number} ({$invoice->customer_name}) - {$statusText} (Due Date: {$dueDate->format('d M Y')})");

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
                    $this->warn("! Reminder queued/fallback for {$invoice->customer_phone}: " . ($result['error'] ?? 'fallback link generated'));
                }
            } catch (\Throwable $e) {
                Log::error("Failed auto reminder for Invoice #{$invoice->id}: " . $e->getMessage());
                $this->error("Error sending reminder for Invoice #{$invoice->id}: " . $e->getMessage());
            }

            // Anti-ban gentle sleep between automated reminder dispatches
            usleep(500000); // 500ms
        }

        $this->info("Auto-reminder routine completed: {$sentCount} sent, {$skippedCount} skipped.");
        return 0;
    }
}
