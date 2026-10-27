<?php

namespace Tests\Feature;

use App\Jobs\ProcessWhatsappBroadcastJob;
use App\Jobs\SendSingleBroadcastMessageJob;
use App\Models\BusinessProfile;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\User;
use App\Models\WhatsappBroadcast;
use App\Models\WhatsappBroadcastLog;
use App\Models\WhatsappMessageLog;
use App\Models\WhatsappTemplate;
use App\Services\WhatsAppService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class WhatsAppFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.whatsapp.sidecar_url' => 'http://127.0.0.1:3001']);
        config(['services.whatsapp.secret' => 'test_secret']);
        config(['services.whatsapp.daily_broadcast_limit' => 150]);
    }

    public function test_whatsapp_hub_loads_for_authenticated_user(): void
    {
        $user = User::factory()->create();

        Http::fake([
            'http://127.0.0.1:3001/sessions/*' => Http::response([
                'success' => true,
                'status' => 'disconnected',
                'phone' => null,
                'qr' => null,
            ], 200),
        ]);

        $this->actingAs($user)
            ->get(route('whatsapp.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('WhatsApp/Index')
                ->has('sessionStatus')
                ->has('templates')
                ->has('quota')
                ->has('profile')
            );
    }

    public function test_public_invoice_view_accessible_without_auth(): void
    {
        $user = User::factory()->create();
        $profile = BusinessProfile::create([
            'user_id' => $user->id,
            'business_name' => 'Shree Vama Traders',
            'upi_id' => 'vama@okhdfcbank',
            'google_review_url' => 'https://g.page/r/test/review',
        ]);

        $invoice = Invoice::create([
            'user_id' => $user->id,
            'invoice_number' => 'INV-2026-TEST1',
            'invoice_date' => '2026-10-18',
            'seller_name' => 'Shree Vama Traders',
            'customer_name' => 'Rajesh Sharma',
            'customer_phone' => '9876543210',
            'subtotal' => 1000,
            'taxable_amount' => 1000,
            'total_tax' => 180,
            'total_amount' => 1180,
            'paid_amount' => 180,
            'status' => 'Partially Paid',
        ]);

        $this->assertNotEmpty($invoice->invoice_hash);

        $response = $this->get(route('invoice.public', ['hash' => $invoice->invoice_hash]));
        $response->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('PublicInvoice/Show')
                ->where('invoice.invoice_number', 'INV-2026-TEST1')
                ->where('summary.balance_due', 1000)
                ->where('summary.shop_name', 'Shree Vama Traders')
            );
    }

    public function test_whatsapp_service_falls_back_to_wame_url_when_sidecar_offline(): void
    {
        $user = User::factory()->create();

        Http::fake([
            '*/sessions/*' => Http::response(null, 500),
        ]);

        $service = app(WhatsAppService::class);
        $result = $service->sendText(
            phone: '9876543210',
            message: 'Namaste Rajesh ji! Aapka bill generate ho gaya hai.',
            merchantId: $user->id,
            triggerType: 'bill_created'
        );

        $this->assertTrue($result['success']);
        $this->assertSame('fallback', $result['mode']);
        $this->assertStringContainsString('https://wa.me/919876543210?text=', $result['wa_me_url']);

        $this->assertDatabaseHas('whatsapp_message_logs', [
            'user_id' => $user->id,
            'recipient_phone' => '9876543210',
            'status' => 'fallback_link',
            'trigger_type' => 'bill_created',
        ]);
    }

    public function test_whatsapp_service_sends_automated_message_when_connected(): void
    {
        $user = User::factory()->create();
        $service = app(WhatsAppService::class);
        $sessionId = $service->getSessionId($user->id);

        Http::fake([
            "*/sessions/{$sessionId}/status" => Http::response([
                'success' => true,
                'status' => 'connected',
                'phone' => '919876543210',
            ], 200),
            "*/sessions/{$sessionId}/send-message" => Http::response([
                'success' => true,
                'messageId' => 'WAMID-1234567890',
            ], 200),
        ]);
        $result = $service->sendText(
            phone: '9876543210',
            message: 'Hello automated test!',
            merchantId: $user->id,
            triggerType: 'direct'
        );

        $this->assertTrue($result['success']);
        $this->assertSame('automated', $result['mode']);
        $this->assertSame('sent', $result['status']);
        $this->assertSame('WAMID-1234567890', $result['messageId']);

        $this->assertDatabaseHas('whatsapp_message_logs', [
            'user_id' => $user->id,
            'recipient_phone' => '9876543210',
            'status' => 'sent',
        ]);
    }

    public function test_broadcast_campaign_queues_and_throttles_with_randomized_delay(): void
    {
        Queue::fake([SendSingleBroadcastMessageJob::class]);

        $user = User::factory()->create();

        // Seed 3 customers
        Customer::create(['user_id' => $user->id, 'name' => 'Rahul', 'phone' => '9876500001']);
        Customer::create(['user_id' => $user->id, 'name' => 'Amit', 'phone' => '9876500002']);
        Customer::create(['user_id' => $user->id, 'name' => 'Sneha', 'phone' => '9876500003']);

        $broadcast = WhatsappBroadcast::create([
            'user_id' => $user->id,
            'title' => 'Diwali Festive Sale',
            'message_template' => 'Namaste {customer_name}! Special 20% discount at {shop_name}.',
            'filter_type' => 'all',
            'status' => 'scheduled',
        ]);

        $job = new ProcessWhatsappBroadcastJob($broadcast->id);
        $job->handle(app(WhatsAppService::class));

        $broadcast->refresh();
        $this->assertSame(3, $broadcast->total_recipients);
        $this->assertSame('processing', $broadcast->status);

        // Verify 3 separate jobs were dispatched with anti-ban delay
        $this->assertDatabaseCount('whatsapp_broadcast_logs', 3);
    }

    public function test_invoice_creation_triggers_whatsapp_notification(): void
    {
        $user = User::factory()->create();

        Http::fake([
            '*/sessions/*' => Http::response(null, 500),
        ]);

        $payload = [
            'invoice_number' => 'INV-2026-WA001',
            'invoice_date' => '2026-10-18',
            'due_date' => '2026-10-25',
            'status' => 'Unpaid',
            'seller_name' => 'Vama Fashion Store',
            'customer_name' => 'Sunil Gupta',
            'customer_phone' => '9822000000',
            'items' => [
                [
                    'item_name' => 'Cotton Shirt',
                    'quantity' => 2,
                    'rate' => 500,
                    'gst_rate' => 5,
                ]
            ],
            'notify_whatsapp' => true,
        ];

        $response = $this->actingAs($user)->post(route('invoices.store'), $payload);
        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('invoices.index'));

        $this->assertDatabaseHas('invoices', [
            'user_id' => $user->id,
            'invoice_number' => 'INV-2026-WA001',
        ]);

        $this->assertDatabaseHas('whatsapp_message_logs', [
            'user_id' => $user->id,
            'recipient_phone' => '9822000000',
            'trigger_type' => 'bill_created',
        ]);
    }

    public function test_invoice_update_triggers_whatsapp_notification(): void
    {
        $user = User::factory()->create();

        $invoice = Invoice::create([
            'user_id' => $user->id,
            'invoice_number' => 'INV-2026-WA002',
            'invoice_date' => '2026-10-18',
            'status' => 'Unpaid',
            'seller_name' => 'Vama Fashion Store',
            'customer_name' => 'Sunil Gupta',
            'customer_phone' => '9822000000',
            'subtotal' => 1000,
            'total_amount' => 1050,
            'taxable_amount' => 1000,
        ]);

        Http::fake([
            '*/sessions/*' => Http::response(null, 500),
        ]);

        $updatePayload = [
            'invoice_number' => 'INV-2026-WA002',
            'invoice_date' => '2026-10-18',
            'due_date' => '2026-10-28',
            'status' => 'Partially Paid',
            'paid_amount' => 500,
            'seller_name' => 'Vama Fashion Store',
            'customer_name' => 'Sunil Gupta',
            'customer_phone' => '9822000000',
            'items' => [
                [
                    'item_name' => 'Cotton Shirt Premium',
                    'quantity' => 2,
                    'rate' => 600,
                    'gst_rate' => 5,
                ]
            ],
            'notify_whatsapp' => true,
        ];

        $response = $this->actingAs($user)->post(route('invoices.update', $invoice->id), $updatePayload);
        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('invoices.index'));

        $this->assertDatabaseHas('whatsapp_message_logs', [
            'user_id' => $user->id,
            'recipient_phone' => '9822000000',
            'trigger_type' => 'bill_updated',
        ]);
    }
}
