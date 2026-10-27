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
        // Automatically triggers the daily reminder dispatches once per day after 11:15 AM IST
        // completely in the background without needing any manual human interaction or button clicks.
        if (!app()->runningInConsole() && !app()->runningUnitTests()) {
            app()->terminating(function () {
                try {
                    $now = \Carbon\Carbon::now(config('app.timezone', 'Asia/Kolkata'));
                    $isPast1115 = ($now->hour > 11) || ($now->hour === 11 && $now->minute >= 15);
                    if ($isPast1115) {
                        $todayDate = $now->toDateString();
                        $cacheKey = "whatsapp_auto_reminders_dispatched_{$todayDate}";

                        $lock = \Illuminate\Support\Facades\Cache::lock("lock_{$cacheKey}", 60);
                        if ($lock->get()) {
                            if (!\Illuminate\Support\Facades\Cache::has($cacheKey)) {
                                \Illuminate\Support\Facades\Cache::put($cacheKey, true, now()->addHours(3));
                                \Illuminate\Support\Facades\Artisan::call('invoices:send-due-reminders');
                                if (($now->hour > 11) || ($now->hour === 11 && $now->minute >= 30)) {
                                    \Illuminate\Support\Facades\Artisan::call('purchases:send-due-reminders');
                                }
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
