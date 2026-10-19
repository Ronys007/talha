<?php

namespace App\Services;

use App\Models\BusinessProfile;
use App\Models\Invoice;
use App\Models\User;
use App\Models\WhatsappMessageLog;
use App\Models\WhatsappTemplate;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    protected string $sidecarUrl;
    protected string $secret;
    protected int $dailyLimit;

    public function __construct()
    {
        $this->sidecarUrl = rtrim(config('services.whatsapp.sidecar_url', 'http://127.0.0.1:3001'), '/');
        $this->secret = config('services.whatsapp.secret', 'vama_secret_change_me_in_prod');
        $this->dailyLimit = (int) config('services.whatsapp.daily_broadcast_limit', 150);
    }

    /**
     * Resolve session identifier for a merchant
     */
    public function getSessionId(?int $merchantId = null): string
    {
        if ($merchantId === null) {
            $user = auth()->user();
            if ($user && method_exists($user, 'getEffectiveOwnerId')) {
                $merchantId = (int) $user->getEffectiveOwnerId();
            } else {
                $merchantId = (int) (auth()->id() ?? 1);
            }
        }
        return "merchant_{$merchantId}";
    }

    /**
     * Format a phone number to standard Indian international format (e.g., 91XXXXXXXXXX)
     */
    public function formatPhoneNumber(string $phone): string
    {
        $clean = preg_replace('/\D+/', '', $phone);
        if (strlen($clean) === 10) {
            return '91' . $clean;
        }
        if (strlen($clean) === 11 && str_starts_with($clean, '0')) {
            return '91' . substr($clean, 1);
        }
        return $clean;
    }

    /**
     * Generate 100% free 1-click wa.me URL fallback
     */
    public function generateWaMeFallbackUrl(string $phone, string $message): string
    {
        $formatted = $this->formatPhoneNumber($phone);
        return 'https://wa.me/' . $formatted . '?text=' . rawurlencode($message);
    }

    /**
     * Generate instant UPI deep link for phone payment apps (GPay, PhonePe, Paytm, BHIM)
     */
    public function generateUpiPayUrl(string $upiId, string $merchantName, float $amount, string $invoiceNo = ''): string
    {
        if (empty(trim($upiId))) {
            return '';
        }

        $pa = trim($upiId);
        $pn = rawurlencode(trim($merchantName ?: 'Merchant'));
        $am = number_format(max(0, $amount), 2, '.', '');
        $tn = rawurlencode('Payment for Inv ' . $invoiceNo);

        return "upi://pay?pa={$pa}&pn={$pn}&am={$am}&cu=INR&tn={$tn}";
    }

    /**
     * Get live connection status from the Baileys Node.js sidecar
     */
    public function getSessionStatus(?int $merchantId = null): array
    {
        $sessionId = $this->getSessionId($merchantId);

        try {
            $response = Http::withHeaders([
                'X-Whatsapp-Secret' => $this->secret,
            ])->timeout(5)->get("{$this->sidecarUrl}/sessions/{$sessionId}/status");

            if ($response->successful()) {
                $data = $response->json();
                return [
                    'success' => true,
                    'sessionId' => $sessionId,
                    'status' => $data['status'] ?? 'disconnected',
                    'phone' => $data['phone'] ?? null,
                    'qr' => $data['qr'] ?? null,
                    'lastActive' => $data['lastActive'] ?? null,
                ];
            }
        } catch (\Throwable $e) {
            Log::warning("WhatsApp sidecar getSessionStatus error [{$sessionId}]: " . $e->getMessage());
        }

        return [
            'success' => false,
            'sessionId' => $sessionId,
            'status' => 'disconnected',
            'phone' => null,
            'qr' => null,
            'lastActive' => null,
            'error' => 'Sidecar service is not reachable',
        ];
    }

    /**
     * Request a fresh connection & QR code from Baileys sidecar
     */
    public function connectSession(?int $merchantId = null): array
    {
        $sessionId = $this->getSessionId($merchantId);

        try {
            $response = Http::withHeaders([
                'X-Whatsapp-Secret' => $this->secret,
            ])->timeout(8)->post("{$this->sidecarUrl}/sessions/{$sessionId}/connect");

            if ($response->successful()) {
                return $response->json();
            }
        } catch (\Throwable $e) {
            Log::error("WhatsApp sidecar connectSession error [{$sessionId}]: " . $e->getMessage());
        }

        return [
            'success' => false,
            'sessionId' => $sessionId,
            'status' => 'disconnected',
            'error' => 'Unable to connect to WhatsApp sidecar service',
        ];
    }

    /**
     * Disconnect and clear session
     */
    public function logoutSession(?int $merchantId = null): array
    {
        $sessionId = $this->getSessionId($merchantId);

        try {
            $response = Http::withHeaders([
                'X-Whatsapp-Secret' => $this->secret,
            ])->timeout(6)->delete("{$this->sidecarUrl}/sessions/{$sessionId}/logout");

            if ($response->successful()) {
                return $response->json();
            }
        } catch (\Throwable $e) {
            Log::warning("WhatsApp sidecar logoutSession error [{$sessionId}]: " . $e->getMessage());
        }

        return [
            'success' => true,
            'sessionId' => $sessionId,
            'status' => 'disconnected',
        ];
    }

    /**
     * Smart Hybrid Send Text Message:
     * Attempts automated delivery via Baileys sidecar if connected.
     * If disconnected or failed, immediately falls back to pre-filled wa.me URL at ₹0 cost.
     */
    public function sendText(
        string $phone,
        string $message,
        ?int $merchantId = null,
        string $triggerType = 'direct',
        ?int $invoiceId = null,
        ?string $recipientName = null
    ): array {
        $sessionId = $this->getSessionId($merchantId);
        $ownerId = $merchantId ?? (auth()->user()?->getEffectiveOwnerId() ?? auth()->id() ?? 1);
        $waMeUrl = $this->generateWaMeFallbackUrl($phone, $message);

        // Attempt automated delivery via sidecar
        $status = $this->getSessionStatus($merchantId);
        $isSidecarConnected = ($status['success'] && ($status['status'] ?? '') === 'connected');

        if ($isSidecarConnected) {
            try {
                $response = Http::withHeaders([
                    'X-Whatsapp-Secret' => $this->secret,
                ])->timeout(12)->post("{$this->sidecarUrl}/sessions/{$sessionId}/send-message", [
                    'phone' => $phone,
                    'message' => $message,
                ]);

                if ($response->successful() && ($response->json()['success'] ?? false)) {
                    $log = WhatsappMessageLog::create([
                        'user_id' => $ownerId,
                        'trigger_type' => $triggerType,
                        'invoice_id' => $invoiceId,
                        'recipient_name' => $recipientName,
                        'recipient_phone' => $phone,
                        'message' => $message,
                        'status' => 'sent',
                        'wa_me_url' => $waMeUrl,
                        'sent_at' => now(),
                    ]);

                    return [
                        'success' => true,
                        'mode' => 'automated',
                        'status' => 'sent',
                        'messageId' => $response->json()['messageId'] ?? null,
                        'wa_me_url' => $waMeUrl,
                        'log_id' => $log->id,
                    ];
                }

                $err = $response->json()['error'] ?? 'Sidecar send failed';
                Log::warning("Baileys sidecar send failed: {$err}");
            } catch (\Throwable $e) {
                Log::warning("Exception during Baileys sendText: " . $e->getMessage());
            }
        }

        // Hybrid Fallback: Log as fallback_link and provide instant wa.me link
        $log = WhatsappMessageLog::create([
            'user_id' => $ownerId,
            'trigger_type' => $triggerType,
            'invoice_id' => $invoiceId,
            'recipient_name' => $recipientName,
            'recipient_phone' => $phone,
            'message' => $message,
            'status' => 'fallback_link',
            'wa_me_url' => $waMeUrl,
            'error_message' => $isSidecarConnected ? 'Sidecar send failed, fell back to wa.me' : 'Sidecar not connected, generated wa.me fallback',
            'sent_at' => null,
        ]);

        return [
            'success' => true,
            'mode' => 'fallback',
            'status' => 'fallback_link',
            'wa_me_url' => $waMeUrl,
            'log_id' => $log->id,
            'message' => 'WhatsApp opened via 1-click fallback link',
        ];
    }

    /**
     * Send Document / PDF via Baileys sidecar with fallback to wa.me text link
     */
    public function sendDocument(
        string $phone,
        string $fileUrlOrBase64,
        string $fileName,
        string $caption = '',
        ?int $merchantId = null,
        string $triggerType = 'direct',
        ?int $invoiceId = null,
        ?string $recipientName = null
    ): array {
        $sessionId = $this->getSessionId($merchantId);
        $ownerId = $merchantId ?? (auth()->user()?->getEffectiveOwnerId() ?? auth()->id() ?? 1);
        $waMeUrl = $this->generateWaMeFallbackUrl($phone, $caption);

        $status = $this->getSessionStatus($merchantId);
        if ($status['success'] && ($status['status'] ?? '') === 'connected') {
            try {
                $payload = [
                    'phone' => $phone,
                    'fileName' => $fileName,
                    'caption' => $caption,
                    'mimetype' => str_ends_with(strtolower($fileName), '.pdf') ? 'application/pdf' : 'application/octet-stream',
                ];

                if (str_starts_with($fileUrlOrBase64, 'http://') || str_starts_with($fileUrlOrBase64, 'https://')) {
                    $payload['mediaUrl'] = $fileUrlOrBase64;
                } else {
                    $payload['base64File'] = $fileUrlOrBase64;
                }

                $response = Http::withHeaders([
                    'X-Whatsapp-Secret' => $this->secret,
                ])->timeout(20)->post("{$this->sidecarUrl}/sessions/{$sessionId}/send-message", $payload);

                if ($response->successful() && ($response->json()['success'] ?? false)) {
                    $log = WhatsappMessageLog::create([
                        'user_id' => $ownerId,
                        'trigger_type' => $triggerType,
                        'invoice_id' => $invoiceId,
                        'recipient_name' => $recipientName,
                        'recipient_phone' => $phone,
                        'message' => $caption . " [Attached: {$fileName}]",
                        'status' => 'sent',
                        'wa_me_url' => $waMeUrl,
                        'sent_at' => now(),
                    ]);

                    return [
                        'success' => true,
                        'mode' => 'automated',
                        'status' => 'sent',
                        'messageId' => $response->json()['messageId'] ?? null,
                        'wa_me_url' => $waMeUrl,
                        'log_id' => $log->id,
                    ];
                }
            } catch (\Throwable $e) {
                Log::warning("Exception during Baileys sendDocument: " . $e->getMessage());
            }
        }

        return $this->sendText($phone, $caption, $merchantId, $triggerType, $invoiceId, $recipientName);
    }

    /**
     * Replace template placeholders with real invoice and merchant data
     */
    public function renderTemplate(string $template, array $data): string
    {
        $greetings = ['Namaste', 'Hello', 'Dear', 'Pranam', 'Vanakkam'];
        $randomGreeting = $greetings[array_rand($greetings)];

        $replacements = [
            '{customer_name}' => $data['customer_name'] ?? 'Customer',
            '{shop_name}' => $data['shop_name'] ?? 'Our Store',
            '{invoice_no}' => $data['invoice_no'] ?? '',
            '{total_amount}' => isset($data['total_amount']) ? number_format((float) $data['total_amount'], 2) : '0.00',
            '{paid_amount}' => isset($data['paid_amount']) ? number_format((float) $data['paid_amount'], 2) : '0.00',
            '{balance_due}' => isset($data['balance_due']) ? number_format((float) $data['balance_due'], 2) : '0.00',
            '{invoice_link}' => $data['invoice_link'] ?? '',
            '{upi_link}' => $data['upi_link'] ?? '',
            '{google_review_link}' => $data['google_review_link'] ?? '',
            '{greeting}' => $data['greeting'] ?? $randomGreeting,
        ];

        return strtr($template, $replacements);
    }

    /**
     * Build standard message data bundle from an Invoice model
     */
    public function buildInvoiceMessageData(Invoice $invoice): array
    {
        $ownerId = $invoice->user_id;
        $profile = BusinessProfile::where('user_id', $ownerId)->first();
        $shopName = $invoice->seller_name ?: ($profile?->business_name ?: 'Store');

        $total = (float) $invoice->total_amount;
        $paid = (float) ($invoice->paid_amount ?? 0);
        $due = max(0, $total - $paid);

        $publicUrl = $invoice->getPublicUrl();
        $upiLink = '';
        if ($due > 0 && !empty($profile?->upi_id)) {
            $upiLink = $this->generateUpiPayUrl($profile->upi_id, $shopName, $due, $invoice->invoice_number);
        }

        $reviewLink = !empty($profile?->google_review_url) ? trim($profile->google_review_url) : '';

        return [
            'customer_name' => $invoice->customer_name ?: 'Valued Customer',
            'shop_name' => $shopName,
            'invoice_no' => $invoice->invoice_number,
            'total_amount' => $total,
            'paid_amount' => $paid,
            'balance_due' => $due,
            'invoice_link' => $publicUrl,
            'upi_link' => $upiLink ?: $publicUrl,
            'google_review_link' => $reviewLink ?: 'Thank you for your support!',
        ];
    }

    /**
     * Get or create template for user
     */
    public function getTemplate(int $userId, string $type): WhatsappTemplate
    {
        $template = WhatsappTemplate::where('user_id', $userId)->where('type', $type)->first();
        if (!$template) {
            $defaults = WhatsappTemplate::getDefaultTemplates();
            $default = $defaults[$type] ?? [
                'title' => ucfirst(str_replace('_', ' ', $type)),
                'message' => "Hello {customer_name}! From {shop_name}. Invoice {invoice_no}, Due: {balance_due}",
            ];

            $template = WhatsappTemplate::create([
                'user_id' => $userId,
                'type' => $type,
                'title' => $default['title'],
                'message' => $default['message'],
                'is_active' => true,
            ]);
        }
        return $template;
    }

    /**
     * Calculate remaining broadcast quota for the current merchant in the last 24h
     */
    public function getRemainingDailyBroadcastQuota(?int $merchantId = null): int
    {
        $ownerId = $merchantId ?? (auth()->user()?->getEffectiveOwnerId() ?? auth()->id() ?? 1);
        $sentToday = WhatsappMessageLog::where('user_id', $ownerId)
            ->where('trigger_type', 'broadcast')
            ->where('created_at', '>=', now()->subHours(24))
            ->whereIn('status', ['sent', 'fallback_link'])
            ->count();

        return max(0, $this->dailyLimit - $sentToday);
    }
}
