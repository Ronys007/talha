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

        $this->info("Scanning invoices for automatic WhatsApp payment reminders (Target: Due in <= 3 days)...");

        // Find all invoices that:
        // 1. Are not fully paid or cancelled
        // 2. Have balance due > 0
        // 3. Have a valid due_date
        // 4. Have a customer phone number
        // 5. Due date is within the 3-day reminder window (due in 3 days, 2 days, 1 day, or today: 0 <= diffInDays <= 3)
        $invoices = Invoice::whereNotIn('status', ['Paid', 'Cancelled', 'cancelled'])
            ->whereNotNull('due_date')
            ->whereNotNull('customer_phone')
            ->whereRaw('TRIM(customer_phone) != ""')
            ->whereRaw('(total_amount - paid_amount) > 0.01')
            ->get();

        $eligibleInvoices = $invoices->filter(function (Invoice $invoice) use ($today) {
            $dueDate = Carbon::parse($invoice->due_date)->startOfDay();
            
            // If due date has already passed, standard overdue applies; 
            // the user specifically requested: "if the amount is due and min 3 days left automatic reminder send to customer whatsapp to all 3 days by reminding the date to pay its dues"
            // Days remaining: 3, 2, 1, 0 (due date)
            $diffDays = $today->diffInDays($dueDate, false); // positive if dueDate is today or future, negative if past

            return ($diffDays >= 0 && $diffDays <= 3);
        });

        $this->info("Found {$eligibleInvoices->count()} invoices within the 3-day due reminder window.");

        $sentCount = 0;
        $skippedCount = 0;

        foreach ($eligibleInvoices as $invoice) {
            $dueDate = Carbon::parse($invoice->due_date)->startOfDay();
            $daysLeft = $today->diffInDays($dueDate, false);

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

            $this->info("Dispatching reminder for Invoice #{$invoice->invoice_number} ({$invoice->customer_name}) - {$daysLeft} day(s) left until due date: {$invoice->due_date->format('d M Y')}");

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
