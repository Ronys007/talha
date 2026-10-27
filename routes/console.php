<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// Automatically send WhatsApp payment reminders daily at 12:25 PM (IST) for sales invoices due within 3 days
Schedule::command('invoices:send-due-reminders')
    ->dailyAt('12:25')
    ->timezone('Asia/Kolkata');

// Automatically send WhatsApp purchase reminders daily at 12:30 PM (IST) to merchant for supplier bills due within 3 days
Schedule::command('purchases:send-due-reminders')
    ->dailyAt('12:30')
    ->timezone('Asia/Kolkata');

