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
    }
}
