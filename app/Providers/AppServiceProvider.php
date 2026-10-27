<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (config('app.env') === 'production' || request()->server('HTTP_X_FORWARDED_PROTO') === 'https') {
            URL::forceScheme('https');
        }

        // Failsafe: Prevent white-screens in production when a stray public/hot file exists
        // If accessed in production or from an external domain, ensure Vite loads built production assets
        $host = request()->getHost();
        $isLocalHost = in_array($host, ['127.0.0.1', 'localhost', '::1'], true);

        if (config('app.env') === 'production' || ! $isLocalHost) {
            $hotPath = public_path('hot');
            if (file_exists($hotPath)) {
                @unlink($hotPath);
            }
        }

        // Automatic WhatsApp Daily Reminder Heartbeat Runner (for Shared Hosting)
        // Automatically triggers the daily reminder dispatches once per day after 12:25 PM (Sales) and 12:30 PM (Purchases) IST
        // completely in the background without needing any manual human interaction or button clicks.
        if (!app()->runningInConsole() && !app()->runningUnitTests()) {
            app()->terminating(function () {
                try {
                    $now = \Carbon\Carbon::now('Asia/Kolkata');
                    $todayDate = $now->toDateString();

                    // 1. Sales reminders: after 1:50 PM IST (13:50)
                    $isPastSalesTime = ($now->hour > 13) || ($now->hour === 13 && $now->minute >= 50);
                    if ($isPastSalesTime) {
                        $salesCacheKey = "whatsapp_auto_sales_reminders_{$todayDate}";
                        $lock = \Illuminate\Support\Facades\Cache::lock("lock_{$salesCacheKey}", 60);
                        if ($lock->get()) {
                            if (!\Illuminate\Support\Facades\Cache::has($salesCacheKey)) {
                                \Illuminate\Support\Facades\Cache::put($salesCacheKey, true, now()->addHours(4));
                                \Illuminate\Support\Facades\Artisan::call('invoices:send-due-reminders');
                            }
                            $lock->release();
                        }
                    }

                    // 2. Purchase reminders: after 1:51 PM IST (13:51)
                    $isPastPurchaseTime = ($now->hour > 13) || ($now->hour === 13 && $now->minute >= 51);
                    if ($isPastPurchaseTime) {
                        $purchaseCacheKey = "whatsapp_auto_purchase_reminders_{$todayDate}";
                        $lock = \Illuminate\Support\Facades\Cache::lock("lock_{$purchaseCacheKey}", 60);
                        if ($lock->get()) {
                            if (!\Illuminate\Support\Facades\Cache::has($purchaseCacheKey)) {
                                \Illuminate\Support\Facades\Cache::put($purchaseCacheKey, true, now()->addHours(4));
                                \Illuminate\Support\Facades\Artisan::call('purchases:send-due-reminders');
                            }
                            $lock->release();
                        }
                    }
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning("Heartbeat automated reminders error: " . $e->getMessage());
                }
            });
        }
    }
}
