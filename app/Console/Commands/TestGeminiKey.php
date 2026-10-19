<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class TestGeminiKey extends Command
{
    protected $signature = 'gemini:test';
    protected $description = 'Test Gemini API key configuration and connectivity';

    public function handle()
    {
        $this->info('===============================================');
        $this->info('  VAMA INVOICE - GEMINI API DIAGNOSTIC UTILITY ');
        $this->info('===============================================');

        $isCached = file_exists(base_path('bootstrap/cache/config.php'));
        $this->line('1. Config Cache: ' . ($isCached ? '<fg=yellow>CACHED (Run "php artisan config:clear" to refresh)</>' : '<fg=green>NOT CACHED (Direct .env read)</>'));

        $configKey = config('services.gemini.api_key');
        $envKey = env('GEMINI_API_KEY');
        
        $this->line('2. config("services.gemini.api_key"): ' . ($configKey ? '<fg=green>Found (' . substr($configKey, 0, 8) . '...)</>' : '<fg=red>NULL / EMPTY</>'));
        $this->line('3. env("GEMINI_API_KEY"): ' . ($envKey ? '<fg=green>Found (' . substr($envKey, 0, 8) . '...)</>' : '<fg=yellow>NULL (Normal when config is cached)</>'));

        // Check .env directly
        $envFile = base_path('.env');
        $fileKey = null;
        if (file_exists($envFile)) {
            $content = file_get_contents($envFile);
            if (preg_match('/^GEMINI_API_KEY\s*=\s*(.*)$/m', $content, $matches)) {
                $fileKey = trim(trim($matches[1]), "\"'");
            }
        }
        $this->line('4. .env File on disk: ' . ($fileKey ? '<fg=green>Found (' . substr($fileKey, 0, 8) . '...)</>' : '<fg=red>Missing GEMINI_API_KEY line in .env</>'));

        $activeKey = $configKey ?: $fileKey ?: $envKey;

        if (! $activeKey) {
            $this->error("\n❌ ERROR: No Gemini API Key found in .env or config cache!");
            $this->warn("To fix this, add the following line to your .env file:");
            $this->line("GEMINI_API_KEY=your_gemini_api_key_here\n");
            $this->warn("Then run:\nphp artisan config:clear\nphp artisan config:cache\n");
            return 1;
        }

        $this->info("\n5. Testing Google Gemini API Connection...");
        try {
            $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={$activeKey}";
            $response = Http::timeout(6)->post($endpoint, [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => 'Hello, reply with 1 word: OK'],
                        ],
                    ],
                ],
            ]);

            if ($response->successful()) {
                $this->info("✅ SUCCESS: Gemini API key is valid and connected successfully!");
                $reply = $response->json('candidates.0.content.parts.0.text');
                $this->line("API Response: " . trim($reply ?? 'OK'));
                return 0;
            }

            $errMsg = $response->json('error.message') ?: ('HTTP Status ' . $response->status());
            $this->error("❌ GEMINI API ERROR (Status {$response->status()}):");
            $this->line($errMsg);
            return 1;
        } catch (\Throwable $e) {
            $this->error("❌ NETWORK/CONNECTION ERROR: " . $e->getMessage());
            return 1;
        }
    }
}
