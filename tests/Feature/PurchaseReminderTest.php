<?php

namespace Tests\Feature;

use App\Models\PurchaseOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PurchaseReminderTest extends TestCase
{
    use RefreshDatabase;

    public function test_partial_supplier_payment_remains_visible_in_purchase_reminders(): void
    {
        $user = User::factory()->create();
        $purchase = $this->createPurchase($user, 'PO-REMINDER-1001');

        $this->actingAs($user)
            ->post(route('purchase-reminders.record-payment'), [
                'id' => $purchase->id,
                'amount' => 40,
            ])
            ->assertSessionHasNoErrors();

        $purchase->refresh();
        $this->assertSame(40.0, (float) $purchase->paid_amount);
        $this->assertSame('Pending', $purchase->status);

        $this->actingAs($user)
            ->get(route('purchase-reminders.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('PurchaseReminders/Index')
                ->where('bills.0.bill_number', 'PO-REMINDER-1001')
                ->where('bills.0.paid_amount', 40)
                ->where('bills.0.balance_due', 60)
                ->where('bills.0.is_partially_paid', true)
                ->where('bills.0.is_paid', false)
            );
    }

    public function test_supplier_payment_cannot_exceed_remaining_balance(): void
    {
        $user = User::factory()->create();
        $purchase = $this->createPurchase($user, 'PO-REMINDER-1002');

        $this->actingAs($user)->post(route('purchase-reminders.record-payment'), [
            'id' => $purchase->id,
            'amount' => 40,
        ])->assertSessionHasNoErrors();

        $this->post(route('purchase-reminders.record-payment'), [
            'id' => $purchase->id,
            'amount' => 61,
        ])->assertSessionHasErrors('amount');

        $this->assertSame(40.0, (float) $purchase->fresh()->paid_amount);
    }

    public function test_full_payment_settles_the_remaining_purchase_balance_and_saves_paid_date(): void
    {
        $user = User::factory()->create();
        $purchase = $this->createPurchase($user, 'PO-REMINDER-1003');

        $this->actingAs($user)->post(route('purchase-reminders.record-payment'), [
            'id' => $purchase->id,
            'amount' => 40,
            'payment_date' => '2026-10-10',
        ])->assertSessionHasNoErrors();

        $this->post(route('purchase-reminders.record-payment'), [
            'id' => $purchase->id,
            'amount' => 60,
            'payment_date' => '2026-10-16',
        ])->assertSessionHasNoErrors();

        $purchase->refresh();
        $this->assertSame(100.0, (float) $purchase->paid_amount);
        $this->assertSame('Paid', $purchase->status);
        $this->assertSame('2026-10-16', $purchase->paid_at->format('Y-m-d'));

        $this->get(route('purchase-reminders.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('bills.0.is_paid', true)
                ->where('bills.0.balance_due', 0)
                ->where('bills.0.paid_at', '2026-10-16')
            );
    }

    public function test_purchase_mark_as_paid_sets_paid_date_and_full_amount(): void
    {
        $user = User::factory()->create();
        $purchase = $this->createPurchase($user, 'PO-REMINDER-1004');

        $this->actingAs($user)->post(route('purchase-reminders.mark-as-paid'), [
            'id' => $purchase->id,
            'payment_date' => '2026-10-14',
        ])->assertSessionHasNoErrors();

        $purchase->refresh();
        $this->assertSame(100.0, (float) $purchase->paid_amount);
        $this->assertSame('Paid', $purchase->status);
        $this->assertSame('2026-10-14', $purchase->paid_at->format('Y-m-d'));
    }

    private function createPurchase(User $user, string $number): PurchaseOrder
    {
        return PurchaseOrder::create([
            'user_id' => $user->id,
            'po_number' => $number,
            'supplier_name' => 'Reminder Test Supplier',
            'order_date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'status' => 'Pending',
            'total_amount' => 100,
            'paid_amount' => 0,
        ]);
    }
}
