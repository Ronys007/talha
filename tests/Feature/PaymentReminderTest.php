<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PaymentReminderTest extends TestCase
{
    use RefreshDatabase;

    public function test_partial_customer_payment_remains_visible_in_sales_reminders(): void
    {
        $user = User::factory()->create();
        $invoice = $this->createInvoice($user, 'INV-REMINDER-1001');

        $this->actingAs($user)
            ->post(route('reminders.record-payment'), [
                'source' => 'invoice',
                'id' => $invoice->id,
                'amount' => 40,
            ])
            ->assertSessionHasNoErrors();

        $invoice->refresh();
        $this->assertSame(40.0, (float) $invoice->paid_amount);
        $this->assertSame('Partially Paid', $invoice->status);

        $this->get(route('sales-reminders.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('PaymentReminders/Index')
                ->where('bills.0.bill_number', 'INV-REMINDER-1001')
                ->where('bills.0.paid_amount', 40)
                ->where('bills.0.balance_due', 60)
                ->where('bills.0.is_partially_paid', true)
                ->where('bills.0.is_paid', false)
            );
    }

    public function test_customer_payment_cannot_exceed_remaining_invoice_balance(): void
    {
        $user = User::factory()->create();
        $invoice = $this->createInvoice($user, 'INV-REMINDER-1002');

        $this->actingAs($user)->post(route('reminders.record-payment'), [
            'source' => 'invoice',
            'id' => $invoice->id,
            'amount' => 40,
        ])->assertSessionHasNoErrors();

        $this->post(route('reminders.record-payment'), [
            'source' => 'invoice',
            'id' => $invoice->id,
            'amount' => 61,
        ])->assertSessionHasErrors('amount');

        $this->assertSame(40.0, (float) $invoice->fresh()->paid_amount);
    }

    public function test_receiving_the_remaining_invoice_balance_marks_it_paid_and_saves_paid_date(): void
    {
        $user = User::factory()->create();
        $invoice = $this->createInvoice($user, 'INV-REMINDER-1003');

        $this->actingAs($user)->post(route('reminders.record-payment'), [
            'source' => 'invoice',
            'id' => $invoice->id,
            'amount' => 40,
            'payment_date' => '2026-10-10',
        ])->assertSessionHasNoErrors();

        $this->post(route('reminders.record-payment'), [
            'source' => 'invoice',
            'id' => $invoice->id,
            'amount' => 60,
            'payment_date' => '2026-10-15',
        ])->assertSessionHasNoErrors();

        $invoice->refresh();
        $this->assertSame(100.0, (float) $invoice->paid_amount);
        $this->assertSame('Paid', $invoice->status);
        $this->assertSame('2026-10-15', $invoice->paid_at->format('Y-m-d'));

        $this->get(route('sales-reminders.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('bills.0.is_paid', true)
                ->where('bills.0.balance_due', 0)
                ->where('bills.0.paid_at', '2026-10-15')
            );
    }

    public function test_mark_as_paid_sets_paid_date_and_full_amount(): void
    {
        $user = User::factory()->create();
        $invoice = $this->createInvoice($user, 'INV-REMINDER-1004');

        $this->actingAs($user)->post(route('sales-reminders.mark-as-paid'), [
            'id' => $invoice->id,
            'payment_date' => '2026-10-14',
        ])->assertSessionHasNoErrors();

        $invoice->refresh();
        $this->assertSame(100.0, (float) $invoice->paid_amount);
        $this->assertSame('Paid', $invoice->status);
        $this->assertSame('2026-10-14', $invoice->paid_at->format('Y-m-d'));
    }

    private function createInvoice(User $user, string $number): Invoice
    {
        return Invoice::create([
            'user_id' => $user->id,
            'invoice_number' => $number,
            'invoice_date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'status' => 'Unpaid',
            'seller_name' => 'Reminder Test Business',
            'customer_name' => 'Reminder Test Customer',
            'total_amount' => 100,
            'paid_amount' => 0,
        ]);
    }
}
