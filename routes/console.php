<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// Automatically send WhatsApp payment reminders daily at 11:15 AM (IST) for sales invoices due within 3 days
Schedule::command('invoices:send-due-reminders')
    ->dailyAt('11:15')
    ->timezone(config('app.timezone', 'Asia/Kolkata'));

// Automatically send WhatsApp purchase reminders daily at 11:30 AM (IST) to merchant for supplier bills due within 3 days
Schedule::command('purchases:send-due-reminders')
    ->dailyAt('11:30')
    ->timezone(config('app.timezone', 'Asia/Kolkata'));

