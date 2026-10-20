<?php

namespace App\Jobs;

use App\Models\BusinessProfile;
use App\Models\WhatsappBroadcast;
use App\Models\WhatsappBroadcastLog;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendSingleBroadcastMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $logId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $logId)
    {
        $this->logId = $logId;
    }

    /**
     * Execute the job.
     */
    public function handle(WhatsAppService $whatsAppService): void
    {
        $log = WhatsappBroadcastLog::with('broadcast')->find($this->logId);
        if (!$log || !$log->broadcast) {
            return;
        }

        $broadcast = $log->broadcast;

        // If broadcast has been cancelled or paused by merchant, skip sending
        if (in_array($broadcast->status, ['cancelled', 'paused'])) {
            $log->update([
                'status' => 'skipped',
                'error_message' => "Broadcast was {$broadcast->status}",
            ]);
            return;
        }

        try {
            $imageBase64 = null;
            $imageName = null;
            if (!empty($broadcast->image_path)) {
                $fullPath = storage_path('app/public/' . $broadcast->image_path);
                if (file_exists($fullPath)) {
                    $imageBase64 = base64_encode(file_get_contents($fullPath));
                    $imageName = $broadcast->file_name ?: basename($fullPath);
                }
            }

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
            } else {
                $broadcast->increment('failed_count');
            }
        } catch (\Throwable $e) {
            Log::error("SendSingleBroadcastMessageJob error [log:{$this->logId}]: " . $e->getMessage());

            $log->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ]);

            $broadcast->increment('failed_count');
        }

        // Check if all recipients for this broadcast have completed
        $pendingCount = WhatsappBroadcastLog::where('broadcast_id', $broadcast->id)
            ->where('status', 'pending')
            ->count();

        if ($pendingCount === 0 && $broadcast->status === 'processing') {
            $broadcast->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);
        }
    }
}
