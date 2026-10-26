<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
    ],

    'whatsapp' => [
        'sidecar_url' => env('WHATSAPP_SIDECAR_URL', 'http://127.0.0.1:3001'),
        'secret' => env('WHATSAPP_SIDECAR_SECRET', 'vama_secret_change_me_in_prod'),
        'daily_broadcast_limit' => (int) env('WHATSAPP_DAILY_BROADCAST_LIMIT', 150),
    ],

    'cron' => [
        'secret' => env('CRON_SECRET', '4560a61722c5be98485f0917abb5aa18d0dec73f5cdd60e8'),
    ],

];
