<?php

namespace App\Services;

use App\Models\BusinessProfile;
use App\Models\Invoice;
use App\Models\PurchaseOrder;
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
        $url = config('services.whatsapp.sidecar_url');
        if (empty($url) || $url === 'http://127.0.0.1:3001') {
            $url = env('WHATSAPP_SIDECAR_URL') ?: $url;
        }
        $this->sidecarUrl = rtrim($url ?: 'http://127.0.0.1:3001', '/');

        // Automatically upgrade remote HTTP URLs to HTTPS
        // Remote hosts (Hostinger, Cloudflare, Koyeb, Render) always enforce SSL and redirect HTTP to HTTPS with 301,
        // which causes cURL/Guzzle to drop POST bodies or convert POST to GET, resulting in 404s.
        if (!$this->isLocalSidecar() && str_starts_with($this->sidecarUrl, 'http://')) {
            $this->sidecarUrl = 'https://' . substr($this->sidecarUrl, 7);
        }

        $secret = config('services.whatsapp.secret');
        if (empty($secret) || $secret === 'vama_secret_change_me_in_prod') {
            $secret = env('WHATSAPP_SIDECAR_SECRET') ?: $secret;
        }
        $this->secret = $secret ?: 'vama_secret_change_me_in_prod';

        $this->dailyLimit = (int) (config('services.whatsapp.daily_broadcast_limit') ?: env('WHATSAPP_DAILY_BROADCAST_LIMIT', 150));
    }

    /**
     * Resolve effective store owner ID from a given user ID or the current user.
     */
    public function resolveOwnerId(?int $userId = null): int
    {
        if ($userId !== null && $userId > 0) {
            $u = User::find($userId);
            if ($u && method_exists($u, 'getEffectiveOwnerId')) {
                return (int) $u->getEffectiveOwnerId();
            }
            return $userId;
        }

        $user = auth()->user();
        if ($user && method_exists($user, 'getEffectiveOwnerId')) {
            $ownerId = (int) $user->getEffectiveOwnerId();
            if ($ownerId > 0) {
                return $ownerId;
            }
        }

        return (int) (auth()->id() ?? 1);
    }

    /**
     * Resolve session identifier for a merchant
     */
    public function getSessionId(?int $merchantId = null): string
    {
        $ownerId = $this->resolveOwnerId($merchantId);
        return "merchant_{$ownerId}";
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
     * Check if the configured sidecar points to a local host
     */
    public function isLocalSidecar(): bool
    {
        $host = parse_url($this->sidecarUrl, PHP_URL_HOST) ?? '';
        return in_array($host, ['localhost', '127.0.0.1', '::1', '0.0.0.0', '']);
    }

    /**
     * Ensure the Node.js Baileys sidecar process is running; auto-launch if stopped (local environments only).
     */
    public function ensureSidecarRunning(): void
    {
        if (app()->environment('testing') || !$this->isLocalSidecar()) {
            return;
        }

        try {
            $response = Http::timeout(1)->get("{$this->sidecarUrl}/health");
            if ($response->successful()) {
                return;
            }
        } catch (\Throwable $e) {
            // Service not responding, proceed to auto-launch
        }

        $basePath = base_path('whatsapp-service');
        $serverScript = $basePath . DIRECTORY_SEPARATOR . 'server.js';
        if (!file_exists($serverScript)) {
            return;
        }

        try {
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                pclose(popen("start /B cmd /C \"cd /d \"{$basePath}\" && node server.js\"", "r"));
            } else {
                exec("cd \"{$basePath}\" && node server.js > /dev/null 2>&1 &");
            }
            usleep(600000); // 600ms grace period for Express to bind
        } catch (\Throwable $e) {
            Log::warning("Failed to auto-spawn Baileys sidecar: " . $e->getMessage());
        }
    }

    /**
     * Get live connection status from the Baileys Node.js sidecar
     */
    public function getSessionStatus(?int $merchantId = null): array
    {
        $sessionId = $this->getSessionId($merchantId);

        if (app()->environment('testing')) {
            return [
                'success' => true,
                'sessionId' => $sessionId,
                'status' => 'connected',
                'phone' => '919876543210',
                'qr' => null,
                'lastActive' => now()->toIso8601String(),
                'sidecar_url' => $this->sidecarUrl,
            ];
        }

        if ($this->isLocalSidecar()) {
            $this->ensureSidecarRunning();
        }

        // In-memory caching for 30s to avoid hammering sidecar during batch reminder dispatch
        static $statusCache = [];
        $cacheKey = "sess_status_{$sessionId}";
        if (isset($statusCache[$cacheKey]) && (time() - $statusCache[$cacheKey]['time']) < 30) {
            return $statusCache[$cacheKey]['data'];
        }

        try {
            $response = Http::withHeaders([
                'X-Whatsapp-Secret' => $this->secret,
            ])->timeout(20)->get("{$this->sidecarUrl}/sessions/{$sessionId}/status");

            if ($response->successful()) {
                $data = $response->json();
                $actualSessionId = $data['sessionId'] ?? $sessionId;
                $status = $data['status'] ?? 'disconnected';

                $result = [
                    'success' => true,
                    'sessionId' => $actualSessionId,
                    'status' => $status,
                    'phone' => $data['phone'] ?? null,
                    'qr' => $data['qr'] ?? null,
                    'lastActive' => $data['lastActive'] ?? null,
                    'sidecar_url' => $this->sidecarUrl,
                ];
                $statusCache[$cacheKey] = ['time' => time(), 'data' => $result];
                return $result;
            }

            $errMsg = $response->json('error') ?? "Sidecar returned HTTP " . $response->status();
            $result = [
                'success' => false,
                'sessionId' => $sessionId,
                'status' => 'disconnected',
                'phone' => null,
                'qr' => null,
                'lastActive' => null,
                'error' => $errMsg,
                'sidecar_url' => $this->sidecarUrl,
            ];
            $statusCache[$cacheKey] = ['time' => time(), 'data' => $result];
            return $result;
        } catch (\Throwable $e) {
            Log::warning("WhatsApp sidecar getSessionStatus error [{$sessionId}]: " . $e->getMessage());
            return [
                'success' => false,
                'sessionId' => $sessionId,
                'status' => 'disconnected',
                'phone' => null,
                'qr' => null,
                'lastActive' => null,
                'error' => 'Sidecar unreachable (' . $e->getMessage() . ')',
                'sidecar_url' => $this->sidecarUrl,
            ];
        }
    }

    /**
     * Request a fresh connection & QR code from Baileys sidecar
     */
    public function connectSession(?int $merchantId = null): array
    {
        if ($this->isLocalSidecar()) {
            $this->ensureSidecarRunning();
        }
        $sessionId = $this->getSessionId($merchantId);

        try {
            $response = Http::withHeaders([
                'X-Whatsapp-Secret' => $this->secret,
            ])->timeout(15)->post("{$this->sidecarUrl}/sessions/{$sessionId}/connect");

            if ($response->successful()) {
                $data = $response->json();
                $data['sidecar_url'] = $this->sidecarUrl;
                return $data;
            }

            $errMsg = $response->json('error') ?? "Sidecar returned HTTP " . $response->status();
            return [
                'success' => false,
                'sessionId' => $sessionId,
                'status' => 'disconnected',
                'error' => $errMsg,
                'sidecar_url' => $this->sidecarUrl,
            ];
        } catch (\Throwable $e) {
            Log::error("WhatsApp sidecar connectSession error [{$sessionId}]: " . $e->getMessage());
            return [
                'success' => false,
                'sessionId' => $sessionId,
                'status' => 'disconnected',
                'error' => 'Sidecar unreachable (' . $e->getMessage() . ')',
                'sidecar_url' => $this->sidecarUrl,
            ];
        }
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
        ?string $recipientName = null,
        ?int $purchaseOrderId = null
    ): array {
        $formattedPhone = $this->formatPhoneNumber($phone);
        $storedPhone = preg_replace('/\D+/', '', $phone) ?: $formattedPhone;
        $ownerId = $this->resolveOwnerId($merchantId);
        $sessionId = $this->getSessionId($ownerId);
        $waMeUrl = $this->generateWaMeFallbackUrl($formattedPhone, $message);

        // Attempt automated delivery via sidecar (strictly for this specific merchant's session)
        $status = $this->getSessionStatus($ownerId);
        $isSidecarConnected = ($status['success'] && ($status['status'] ?? '') === 'connected');
        $targetSession = $sessionId;

        if ($isSidecarConnected) {
            try {
                $response = Http::withHeaders([
                    'X-Whatsapp-Secret' => $this->secret,
                ])->timeout(25)->post("{$this->sidecarUrl}/sessions/{$targetSession}/send-message", [
                    'phone' => $formattedPhone,
                    'message' => $message,
                ]);

                if ($response->successful() && ($response->json()['success'] ?? false)) {
                    $messageId = $response->json()['messageId'] ?? null;
                    $log = WhatsappMessageLog::create([
                        'user_id' => $ownerId,
                        'trigger_type' => $triggerType,
                        'invoice_id' => $invoiceId,
                        'purchase_order_id' => $purchaseOrderId,
                        'recipient_name' => $recipientName,
                        'recipient_phone' => $storedPhone,
                        'message' => $message,
                        'status' => 'sent',
                        'message_id' => $messageId,
                        'wa_me_url' => $waMeUrl,
                        'sent_at' => now(),
                    ]);

                    return [
                        'success' => true,
                        'mode' => 'automated',
                        'status' => 'sent',
                        'messageId' => $messageId,
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
            'purchase_order_id' => $purchaseOrderId,
            'recipient_name' => $recipientName,
            'recipient_phone' => $storedPhone,
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
        ?string $recipientName = null,
        ?int $purchaseOrderId = null
    ): array {
        $formattedPhone = $this->formatPhoneNumber($phone);
        $storedPhone = preg_replace('/\D+/', '', $phone) ?: $formattedPhone;
        $ownerId = $this->resolveOwnerId($merchantId);
        $sessionId = $this->getSessionId($ownerId);
        $waMeUrl = $this->generateWaMeFallbackUrl($formattedPhone, $caption);

        $status = $this->getSessionStatus($ownerId);
        $targetSession = $sessionId;
        if ($status['success'] && ($status['status'] ?? '') === 'connected') {
            try {
                $lower = strtolower($fileName);
                $mime = 'application/octet-stream';
                if (str_ends_with($lower, '.pdf')) {
                    $mime = 'application/pdf';
                } elseif (str_ends_with($lower, '.png')) {
                    $mime = 'image/png';
                } elseif (str_ends_with($lower, '.jpg') || str_ends_with($lower, '.jpeg')) {
                    $mime = 'image/jpeg';
                } elseif (str_ends_with($lower, '.webp')) {
                    $mime = 'image/webp';
                } elseif (str_ends_with($lower, '.gif')) {
                    $mime = 'image/gif';
                } elseif (str_ends_with($lower, '.docx')) {
                    $mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                } elseif (str_ends_with($lower, '.doc')) {
                    $mime = 'application/msword';
                } elseif (str_ends_with($lower, '.xlsx')) {
                    $mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                } elseif (str_ends_with($lower, '.xls')) {
                    $mime = 'application/vnd.ms-excel';
                }

                $payload = [
                    'phone' => $formattedPhone,
                    'fileName' => $fileName,
                    'caption' => $caption,
                    'mimetype' => $mime,
                ];

                if (str_starts_with($fileUrlOrBase64, 'http://') || str_starts_with($fileUrlOrBase64, 'https://')) {
                    $payload['mediaUrl'] = $fileUrlOrBase64;
                } else {
                    $payload['base64File'] = $fileUrlOrBase64;
                }

                $response = Http::withHeaders([
                    'X-Whatsapp-Secret' => $this->secret,
                ])->timeout(40)->post("{$this->sidecarUrl}/sessions/{$targetSession}/send-message", $payload);

                if ($response->successful() && ($response->json()['success'] ?? false)) {
                    $messageId = $response->json()['messageId'] ?? null;
                    $log = WhatsappMessageLog::create([
                        'user_id' => $ownerId,
                        'trigger_type' => $triggerType,
                        'invoice_id' => $invoiceId,
                        'purchase_order_id' => $purchaseOrderId,
                        'recipient_name' => $recipientName,
                        'recipient_phone' => $storedPhone,
                        'message' => $caption . " [Attached: {$fileName}]",
                        'status' => 'sent',
                        'message_id' => $messageId,
                        'wa_me_url' => $waMeUrl,
                        'sent_at' => now(),
                    ]);

                    return [
                        'success' => true,
                        'mode' => 'automated',
                        'status' => 'sent',
                        'messageId' => $messageId,
                        'wa_me_url' => $waMeUrl,
                        'log_id' => $log->id,
                    ];
                }
            } catch (\Throwable $e) {
                Log::warning("Exception during Baileys sendDocument: " . $e->getMessage());
            }
        }

        return $this->sendText($phone, $caption, $merchantId, $triggerType, $invoiceId, $recipientName, $purchaseOrderId);
    }

    /**
     * Generate Base64 encoded PNG for a QR code from text/URL.
     */
    public function generateQrCodeBase64(string $text, int $size = 400): string
    {
        $encoded = urlencode($text);

        // 1. Try local sidecar endpoint first
        try {
            $res = Http::withHeaders(['X-Whatsapp-Secret' => $this->secret])
                ->timeout(3)
                ->get("{$this->sidecarUrl}/qr?text={$encoded}");
            if ($res->successful() && strlen($res->body()) > 80) {
                return base64_encode($res->body());
            }
        } catch (\Throwable $e) {}

        // 2. High-reliability fallback: api.qrserver.com
        try {
            $res = Http::timeout(5)->get("https://api.qrserver.com/v1/create-qr-code/?size={$size}x{$size}&margin=10&data={$encoded}");
            if ($res->successful() && strlen($res->body()) > 80) {
                return base64_encode($res->body());
            }
        } catch (\Throwable $e) {}

        // 3. Fallback: quickchart.io
        try {
            $res = Http::timeout(5)->get("https://quickchart.io/qr?size={$size}&text={$encoded}");
            if ($res->successful() && strlen($res->body()) > 80) {
                return base64_encode($res->body());
            }
        } catch (\Throwable $e) {}

        return '';
    }

    /**
     * Replace template placeholders with real invoice and merchant data
     */
    public function renderTemplate(string $template, array $data): string
    {
        $greetings = ['Hello', 'Dear Customer', 'Hi', 'Greetings'];
        $randomGreeting = $greetings[array_rand($greetings)];

        // 1. Build payment section dynamically (QR notice instead of raw plain text UPI ID)
        $hasUpi = !empty($data['upi_id']) || !empty($data['upi_link']);
        $due = (float) ($data['balance_due'] ?? 0);
        $paymentSection = '';
        if ($due > 0 && $hasUpi) {
            $paymentSection = "\n\n💳 *Payment QR Code:* (Attached below - scan with GPay/PhonePe/Paytm to pay)";
        }

        // 2. Build review section dynamically (QR notice instead of raw review link)
        $hasReview = !empty($data['google_review_link']) && filter_var($data['google_review_link'], FILTER_VALIDATE_URL);
        $reviewSection = '';
        if ($hasReview) {
            $reviewSection = "\n\n⭐ *Google Review QR:* (Attached below - scan to rate us on Google)";
        }

        $replacements = [
            '{customer_name}' => $data['customer_name'] ?? 'Customer',
            '{shop_name}' => $data['shop_name'] ?? 'Our Store',
            '{invoice_no}' => $data['invoice_no'] ?? '',
            '{due_date}' => !empty($data['due_date']) ? date('d M Y', strtotime($data['due_date'])) : 'Upon Receipt',
            '{total_amount}' => isset($data['total_amount']) ? number_format((float) str_replace(',', '', (string) $data['total_amount']), 2) : '0.00',
            '{paid_amount}' => isset($data['paid_amount']) ? number_format((float) str_replace(',', '', (string) $data['paid_amount']), 2) : '0.00',
            '{balance_due}' => isset($data['balance_due']) ? number_format((float) str_replace(',', '', (string) $data['balance_due']), 2) : '0.00',
            '{recorded_amount}' => isset($data['recorded_amount']) ? number_format((float) str_replace(',', '', (string) $data['recorded_amount']), 2) : '0.00',
            '{settled_note}' => $data['settled_note'] ?? '',
            '{invoice_link}' => $data['invoice_link'] ?? '',
            '{upi_link}' => '',
            '{google_review_link}' => '',
            '{payment_section}' => $paymentSection,
            '{review_section}' => $reviewSection,
            '{greeting}' => $data['greeting'] ?? $randomGreeting,
            // Purchase Bill Specific Placeholders
            '{user_name}' => $data['user_name'] ?? ($data['shop_name'] ?? 'Merchant'),
            '{supplier_name}' => $data['supplier_name'] ?? 'Supplier',
            '{bill_number}' => $data['bill_number'] ?? ($data['invoice_no'] ?? ''),
            '{purchase_number}' => $data['purchase_number'] ?? '',
            '{days_left_text}' => $data['days_left_text'] ?? '',
        ];

        $rendered = strtr($template, $replacements);

        // When a bill is fully settled ($due <= 0.001 or marked as paid), remove any Due Date line
        if ($due <= 0.001) {
            $rendered = preg_replace('/(\r?\n)[^\r\n]*(?:Payment\s+)?Due\s+Date[^\r\n]*/i', '', $rendered);
        }

        // Clean up legacy explicit tag mentions if UPI or Google Review is not configured
        if (!$hasUpi) {
            $rendered = preg_replace('/(\r?\n)?.*(?:Quick UPI Pay|⚡ Direct UPI Pay Link|UPI|Payment QR Code).*(\r?\n)?/i', '', $rendered);
        }
        if (!$hasReview) {
            $rendered = preg_replace('/(\r?\n)?.*(?:rate us on Google|Review Us on Google|Google Review).*(\r?\n)?/i', '', $rendered);
        }

        $rendered = preg_replace("/\n{3,}/", "\n\n", $rendered);

        return trim($rendered);
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
            'due_date' => $invoice->due_date ? (is_string($invoice->due_date) ? $invoice->due_date : $invoice->due_date->format('Y-m-d')) : null,
            'total_amount' => $total,
            'paid_amount' => $paid,
            'balance_due' => $due,
            'invoice_link' => $publicUrl,
            'upi_link' => $upiLink,
            'google_review_link' => $reviewLink,
        ];
    }

    /**
     * Generate PDF binary content for an Invoice
     */
    public function generateInvoicePdf(Invoice $invoice): string
    {
        $invoice->loadMissing(['items']);
        $ownerId = $this->resolveOwnerId($invoice->user_id);
        $businessProfile = BusinessProfile::where('user_id', $ownerId)->first();

        /** @var \Barryvdh\DomPDF\PDF $pdf */
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('invoices.pdf', [
            'invoice' => $invoice,
            'businessProfile' => $businessProfile,
        ])->setPaper('a4', 'portrait');

        return $pdf->output();
    }

    /**
     * Send Invoice as an official PDF document with message, UPI payment link, and Google Review link
     */
    public function sendInvoiceDocument(Invoice $invoice, string $triggerType = 'bill_created'): array
    {
        if (empty($invoice->customer_phone)) {
            return [
                'success' => false,
                'status' => 'failed',
                'error' => 'Customer phone number is missing from this invoice.',
            ];
        }

        $ownerId = $this->resolveOwnerId($invoice->user_id);

        // Automatic smart template selection based on payment status
        $resolvedTrigger = $triggerType;
        if ($triggerType === 'bill_created') {
            if ($invoice->status === 'Paid') {
                $resolvedTrigger = 'bill_paid';
            }
        } elseif ($triggerType === 'bill_updated') {
            if ($invoice->status === 'Paid') {
                $resolvedTrigger = 'bill_paid';
            } elseif ($invoice->status === 'Partially Paid' || ((float)($invoice->paid_amount ?? 0) > 0 && (float)$invoice->total_amount > (float)($invoice->paid_amount ?? 0))) {
                $resolvedTrigger = 'partial_payment';
            }
        }

        $template = $this->getTemplate($ownerId, $resolvedTrigger);
        $msgData = $this->buildInvoiceMessageData($invoice);
        $caption = $this->renderTemplate($template->message, $msgData);
        $fileName = "Invoice_{$invoice->invoice_number}.pdf";
        $logTriggerType = $triggerType;

        try {
            $pdfBytes = $this->generateInvoicePdf($invoice);
            $base64Pdf = base64_encode($pdfBytes);

            // 1. Dispatch official invoice / statement PDF document with invoice details caption
            $sendDocResult = $this->sendDocument(
                phone: $invoice->customer_phone,
                fileUrlOrBase64: $base64Pdf,
                fileName: $fileName,
                caption: $caption,
                merchantId: $ownerId,
                triggerType: $logTriggerType,
                invoiceId: $invoice->id,
                recipientName: $invoice->customer_name
            );

            $due = max(0, (float) ($invoice->total_amount - ($invoice->paid_amount ?? 0)));
            $profile = BusinessProfile::where('user_id', $ownerId)->first();

            // 2. Dispatch Native UPI Payment QR Code image if balance due > 0 and merchant has UPI ID
            if ($due > 0.01 && !empty($profile?->upi_id)) {
                try {
                    $shopName = $invoice->seller_name ?: ($profile->business_name ?: 'Store');
                    $upiUrl = $this->generateUpiPayUrl($profile->upi_id, $shopName, $due, $invoice->invoice_number);
                    $qrBase64 = $this->generateQrCodeBase64($upiUrl);
                    if (!empty($qrBase64)) {
                        $qrCaption = "💳 *Payment QR Code - Invoice #{$invoice->invoice_number}*\n"
                            . "💰 *Amount Due:* ₹" . number_format($due, 2) . "\n"
                            . "👉 Scan with Google Pay, PhonePe, Paytm, or BHIM to pay directly.";

                        $this->sendDocument(
                            phone: $invoice->customer_phone,
                            fileUrlOrBase64: $qrBase64,
                            fileName: "Payment_QR_{$invoice->invoice_number}.png",
                            caption: $qrCaption,
                            merchantId: $ownerId,
                            triggerType: 'payment_qr',
                            invoiceId: $invoice->id,
                            recipientName: $invoice->customer_name
                        );
                    }
                } catch (\Throwable $e) {
                    Log::warning("Failed to dispatch payment QR code for invoice #{$invoice->id}: " . $e->getMessage());
                }
            }

            // 3. Dispatch Google Review QR Code image (Multiple scans allowed) if configured
            if (!empty($profile?->google_review_url) && filter_var($profile->google_review_url, FILTER_VALIDATE_URL)) {
                try {
                    $reviewQrBase64 = $this->generateQrCodeBase64($profile->google_review_url);
                    if (!empty($reviewQrBase64)) {
                        $shopName = $invoice->seller_name ?: ($profile->business_name ?: 'Our Store');
                        $reviewCaption = "⭐ *Google Review QR Code - {$shopName}*\n"
                            . "Thank you for choosing us! Please scan this QR code with your camera to rate and review us on Google.";

                        $this->sendDocument(
                            phone: $invoice->customer_phone,
                            fileUrlOrBase64: $reviewQrBase64,
                            fileName: "Google_Review_QR_{$invoice->invoice_number}.png",
                            caption: $reviewCaption,
                            merchantId: $ownerId,
                            triggerType: 'review_qr',
                            invoiceId: $invoice->id,
                            recipientName: $invoice->customer_name
                        );
                    }
                } catch (\Throwable $e) {
                    Log::warning("Failed to dispatch review QR code for invoice #{$invoice->id}: " . $e->getMessage());
                }
            }

            return $sendDocResult;
        } catch (\Throwable $e) {
            Log::warning("PDF generation or WhatsApp document sending failed for invoice #{$invoice->id}: " . $e->getMessage());
            // Graceful fallback to text message
            return $this->sendText(
                phone: $invoice->customer_phone,
                message: $caption,
                merchantId: $ownerId,
                triggerType: $logTriggerType,
                invoiceId: $invoice->id,
                recipientName: $invoice->customer_name
            );
        }
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
     * Resolve the authentic phone number for the user/merchant.
     * Prioritizes the user's BusinessProfile phone if set and valid (not dummy 9000000001).
     * If dummy or empty, dynamically fetches the active connected WhatsApp phone from the sidecar session.
     */
    public function resolveUserPhone(int $userId): ?string
    {
        $ownerId = $this->resolveOwnerId($userId);
        $profile = BusinessProfile::where('user_id', $ownerId)->first();
        if (!$profile) {
            $storeIds = User::find($ownerId)?->getEffectiveStoreUserIds() ?? [$ownerId];
            $profile = BusinessProfile::whereIn('user_id', $storeIds)->whereNotNull('phone')->first();
        }
        $profilePhone = trim($profile?->phone ?? '');

        // Check if profile phone is a real non-dummy number
        $cleanDigits = preg_replace('/\D+/', '', $profilePhone);
        $isDummy = empty($cleanDigits)
            || preg_match('/^900000000[0-9]$/', $cleanDigits)
            || preg_match('/^0+$/', $cleanDigits)
            || preg_match('/^1234567890$/', $cleanDigits);

        if (!$isDummy && strlen($cleanDigits) >= 10) {
            return $this->formatPhoneNumber($cleanDigits);
        }

        // Try getting the connected WhatsApp phone from the live sidecar session
        try {
            $status = $this->getSessionStatus($ownerId);
            if (!empty($status['phone'])) {
                $connectedPhone = $this->formatPhoneNumber($status['phone']);
                // Proactively auto-sync this real phone to BusinessProfile if it was dummy or empty
                if ($profile && ($isDummy || empty($profilePhone))) {
                    $profile->phone = substr($connectedPhone, -10);
                    $profile->save();
                }
                return $connectedPhone;
            }
        } catch (\Throwable $e) {
            Log::warning("Could not fetch session status to resolve phone: " . $e->getMessage());
        }

        // Check user model phone
        $user = User::find($ownerId);
        if ($user && !empty($user->phone)) {
            $uDigits = preg_replace('/\D+/', '', $user->phone);
            if (strlen($uDigits) >= 10) {
                return $this->formatPhoneNumber($uDigits);
            }
        }

        // Check seller_phone on recent invoices
        $recentSellerPhone = Invoice::where('user_id', $ownerId)->whereNotNull('seller_phone')->latest()->value('seller_phone');
        if (!empty($recentSellerPhone)) {
            $sDigits = preg_replace('/\D+/', '', $recentSellerPhone);
            if (strlen($sDigits) >= 10 && !preg_match('/^900000000[0-9]$/', $sDigits)) {
                return $this->formatPhoneNumber($sDigits);
            }
        }

        // Fallback to profile phone if it has at least some digits
        if (!empty($cleanDigits) && strlen($cleanDigits) >= 10) {
            return $this->formatPhoneNumber($cleanDigits);
        }

        return null;
    }

    /**
     * Build standard message data bundle from a PurchaseOrder model
     */
    public function buildPurchaseReminderData(PurchaseOrder $order, ?User $user = null, ?float $recordedAmount = null): array
    {
        $ownerId = $this->resolveOwnerId($order->user_id);
        $profile = BusinessProfile::where('user_id', $ownerId)->first();
        $targetUser = $user ?: User::find($ownerId);

        $adminName = 'Merchant';
        if ($profile && !empty(trim($profile->business_name)) && trim($profile->business_name) !== 'Super Admin') {
            $adminName = trim($profile->business_name);
        } elseif ($targetUser && !empty(trim($targetUser->name)) && trim($targetUser->name) !== 'Super Admin') {
            $adminName = trim($targetUser->name);
        }

        $total = (float) $order->total_amount;
        $isPaidStatus = strtolower((string) $order->status) === 'paid';
        $paid = $isPaidStatus ? $total : (float) ($order->paid_amount ?? 0);
        $due = $isPaidStatus ? 0 : max(0, $total - $paid);
        if ($paid >= $total) {
            $due = 0;
            $paid = $total;
        }

        $daysLeft = null;
        $daysLeftText = 'Due soon';
        if ($order->due_date) {
            $dueDate = \Carbon\Carbon::parse($order->due_date)->startOfDay();
            $diff = \Carbon\Carbon::today()->diffInDays($dueDate, false);
            $daysLeft = $diff;
            if ($diff > 1) {
                $daysLeftText = "{$diff} days left";
            } elseif ($diff === 1) {
                $daysLeftText = "1 day left (Due tomorrow)";
            } elseif ($diff === 0) {
                $daysLeftText = "Due Today!";
            } else {
                $daysLeftText = abs($diff) . " days overdue";
            }
        }

        $purchaseNumber = $order->purchase_number ?: 'PUR-' . str_pad((string) $order->id, 6, '0', STR_PAD_LEFT);
        $settledNote = $due <= 0.001 ? '(Fully Settled 🎉)' : '';

        return [
            'user_name' => $adminName,
            'shop_name' => $adminName,
            'supplier_name' => $order->supplier_name ?: 'Supplier',
            'bill_number' => $order->po_number ?: $purchaseNumber,
            'purchase_number' => $purchaseNumber,
            'invoice_no' => $order->po_number ?: $purchaseNumber,
            'due_date' => $order->due_date ? (\Carbon\Carbon::parse($order->due_date)->format('d M Y')) : 'N/A',
            'days_left' => $daysLeft,
            'days_left_text' => $daysLeftText,
            'total_amount' => $total,
            'paid_amount' => $paid,
            'balance_due' => $due,
            'recorded_amount' => $recordedAmount !== null ? $recordedAmount : $paid,
            'settled_note' => $settledNote,
        ];
    }

    /**
     * Generate PDF binary content for a Purchase Order / Statement
     */
    public function generatePurchasePdf(PurchaseOrder $order): string
    {
        $order->loadMissing(['items']);
        $ownerId = $this->resolveOwnerId($order->user_id);
        $businessProfile = BusinessProfile::where('user_id', $ownerId)->first();
        $user = User::find($ownerId);

        /** @var \Barryvdh\DomPDF\PDF $pdf */
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('purchases.pdf', [
            'order' => $order,
            'businessProfile' => $businessProfile,
            'user' => $user,
        ])->setPaper('a4', 'portrait');

        return $pdf->output();
    }

    /**
     * Send Purchase Bill Due Reminder to the User itself (attached PDF statement + WhatsApp notification)
     */
    public function sendPurchaseReminderDocument(PurchaseOrder $order, ?string $targetPhone = null): array
    {
        $ownerId = $this->resolveOwnerId($order->user_id);
        $user = User::find($ownerId);
        $phone = $targetPhone ?: $this->resolveUserPhone($ownerId);

        if (empty($phone)) {
            return [
                'success' => false,
                'status' => 'failed',
                'error' => "User phone number is not configured in Business Profile and no connected WhatsApp was found.",
            ];
        }

        $template = $this->getTemplate($ownerId, 'purchase_reminder');
        $msgData = $this->buildPurchaseReminderData($order, $user);
        $caption = $this->renderTemplate($template->message, $msgData);
        $fileName = "Purchase_Statement_{$msgData['bill_number']}.pdf";

        try {
            $pdfBytes = $this->generatePurchasePdf($order);
            $base64Pdf = base64_encode($pdfBytes);

            return $this->sendDocument(
                phone: $phone,
                fileUrlOrBase64: $base64Pdf,
                fileName: $fileName,
                caption: $caption,
                merchantId: $ownerId,
                triggerType: 'purchase_reminder',
                invoiceId: null,
                recipientName: $msgData['user_name'],
                purchaseOrderId: $order->id
            );
        } catch (\Throwable $e) {
            Log::warning("Purchase PDF generation or WhatsApp sending failed for PO #{$order->id}: " . $e->getMessage());
            return $this->sendText(
                phone: $phone,
                message: $caption,
                merchantId: $ownerId,
                triggerType: 'purchase_reminder',
                invoiceId: null,
                recipientName: $msgData['user_name'],
                purchaseOrderId: $order->id
            );
        }
    }

    /**
     * Send Purchase Payment Recorded Notification to the User itself (attached PDF statement + WhatsApp notification)
     */
    public function sendPurchasePaymentRecordedDocument(PurchaseOrder $order, float $paymentAmount, ?string $targetPhone = null): array
    {
        $ownerId = $order->user_id;
        $user = User::find($ownerId);
        $phone = $targetPhone ?: $this->resolveUserPhone($ownerId);

        if (empty($phone)) {
            return [
                'success' => false,
                'status' => 'failed',
                'error' => "User phone number is not configured in Business Profile and no connected WhatsApp was found.",
            ];
        }

        $template = $this->getTemplate($ownerId, 'purchase_payment_recorded');
        $msgData = $this->buildPurchaseReminderData($order, $user, $paymentAmount);
        $caption = $this->renderTemplate($template->message, $msgData);
        $fileName = "Purchase_Payment_Voucher_{$msgData['bill_number']}.pdf";

        try {
            $pdfBytes = $this->generatePurchasePdf($order);
            $base64Pdf = base64_encode($pdfBytes);

            return $this->sendDocument(
                phone: $phone,
                fileUrlOrBase64: $base64Pdf,
                fileName: $fileName,
                caption: $caption,
                merchantId: $ownerId,
                triggerType: 'purchase_payment_recorded',
                invoiceId: null,
                recipientName: $msgData['user_name'],
                purchaseOrderId: $order->id
            );
        } catch (\Throwable $e) {
            Log::warning("Purchase PDF generation or WhatsApp sending failed for recorded payment on PO #{$order->id}: " . $e->getMessage());
            return $this->sendText(
                phone: $phone,
                message: $caption,
                merchantId: $ownerId,
                triggerType: 'purchase_payment_recorded',
                invoiceId: null,
                recipientName: $msgData['user_name'],
                purchaseOrderId: $order->id
            );
        }
    }

    /**
     * Recall a previously sent WhatsApp message (Delete for Everyone)
     */
    public function recallMessage(WhatsappMessageLog $log): array
    {
        if (empty($log->message_id)) {
            return [
                'success' => false,
                'error' => 'This message cannot be recalled because no WhatsApp message ID was recorded (or it was sent via wa.me link).',
            ];
        }

        if ($log->status === 'recalled') {
            return [
                'success' => true,
                'message' => 'This message has already been recalled.',
            ];
        }

        $sessionId = $this->getSessionId($log->user_id);
        $formattedPhone = $this->formatPhoneNumber($log->recipient_phone);

        try {
            $response = Http::withHeaders([
                'X-Whatsapp-Secret' => $this->secret,
            ])->timeout(12)->post("{$this->sidecarUrl}/sessions/{$sessionId}/recall-message", [
                'phone' => $formattedPhone,
                'messageId' => $log->message_id,
            ]);

            if ($response->successful() && ($response->json()['success'] ?? false)) {
                $log->update([
                    'status' => 'recalled',
                    'recalled_at' => now(),
                ]);

                return [
                    'success' => true,
                    'message' => 'Message successfully recalled (Deleted for Everyone) on WhatsApp.',
                ];
            }

            $errMsg = $response->json('error') ?? "Sidecar returned HTTP " . $response->status();
            return [
                'success' => false,
                'error' => $errMsg,
            ];
        } catch (\Throwable $e) {
            Log::error("Failed to recall WhatsApp message #{$log->id}: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Unable to connect to WhatsApp sidecar: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Calculate remaining broadcast quota for the current merchant for today (resets daily at midnight)
     */
    public function getRemainingDailyBroadcastQuota(?int $merchantId = null): int
    {
        $ownerId = $merchantId ?? (auth()->user()?->getEffectiveOwnerId() ?? auth()->id() ?? 1);
        
        // Reset daily at midnight (12:00 AM) in Indian Standard Time (Asia/Kolkata)
        $startOfToday = now('Asia/Kolkata')->startOfDay()->setTimezone('UTC');

        $sentToday = WhatsappMessageLog::where('user_id', $ownerId)
            ->where('trigger_type', 'broadcast')
            ->where('created_at', '>=', $startOfToday)
            ->whereIn('status', ['sent', 'fallback_link'])
            ->count();

        return max(0, $this->dailyLimit - $sentToday);
    }
}


