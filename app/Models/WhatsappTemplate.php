<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WhatsappTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get default templates for a user
     */
    public static function getDefaultTemplates(): array
    {
        return [
            'bill_created' => [
                'title' => 'New Invoice (Professional)',
                'message' => "Dear {customer_name},\n\nThank you for choosing *{shop_name}*.\nPlease find your invoice *#{invoice_no}* attached above as a PDF document.\n\n🧾 *Invoice Summary:*\n• Total Amount: *₹{total_amount}*\n• Paid Amount: *₹{paid_amount}*\n• Balance Due: *₹{balance_due}*{review_section}\n\nThank you for your business! Have a great day.",
            ],
            'bill_paid' => [
                'title' => 'Payment Received Receipt (Paid)',
                'message' => "Dear {customer_name},\n\nThank you for choosing *{shop_name}*.\nWe have received your full payment for invoice *#{invoice_no}*. Please find your official receipt attached above as a PDF.\n\n🧾 *Payment Receipt:*\n• Total Amount: *₹{total_amount}*\n• Paid Amount: *₹{paid_amount}*\n• Balance Due: *₹0.00* (Fully Paid){review_section}\n\nWe truly appreciate your prompt payment and support!",
            ],
            'bill_updated' => [
                'title' => 'Revised Invoice (Updated)',
                'message' => "Dear {customer_name},\n\nYour invoice *#{invoice_no}* with *{shop_name}* has been updated. Please find the revised invoice attached above as a PDF.\n\n🧾 *Updated Summary:*\n• Total Amount: *₹{total_amount}*\n• Amount Paid: *₹{paid_amount}*\n• Balance Due: *₹{balance_due}*{review_section}\n\nPlease feel free to reach out if you have any questions.",
            ],
            'partial_payment' => [
                'title' => 'Partial Payment Received & Balance Due',
                'message' => "Dear {customer_name},\n\nWe have received your partial payment for invoice *#{invoice_no}* with *{shop_name}*. Please find your updated invoice & statement attached above as a PDF.\n\n🧾 *Payment & Balance Summary:*\n• Total Invoice Amount: *₹{total_amount}*\n• Total Amount Received: *₹{paid_amount}*\n• Remaining Balance Due: *₹{balance_due}*\n• Payment Due Date: *{due_date}*\n\nKindly clear the remaining balance on or before the due date. Thank you for your business!",
            ],
            'payment_reminder' => [
                'title' => 'Payment Reminder (Due / Vasooli)',
                'message' => "Dear {customer_name},\n\nThis is a friendly reminder regarding your pending payment for invoice *#{invoice_no}* from *{shop_name}*. The invoice document is attached above for your reference.\n\n🧾 *Outstanding Summary:*\n• Total Amount: *₹{total_amount}*\n• Amount Paid: *₹{paid_amount}*\n• Balance Due: *₹{balance_due}*\n• Payment Due Date: *{due_date}*\n\nKindly process the payment on or before the due date. If you have already made this payment, please disregard this notice. Thank you!",
            ],
            'purchase_reminder' => [
                'title' => 'Purchase Bill Due Reminder (To Pay Supplier)',
                'message' => "🔔 *Purchase Payment Reminder*\n\nHello *{user_name}*,\nThis is a reminder that payment for supplier bill *#{bill_number}* ({supplier_name}) is due soon.\n\n📦 *Purchase Bill Details:*\n• Supplier / Vendor: *{supplier_name}*\n• Supplier Invoice: *#{bill_number}*\n• Purchase Ref: *{purchase_number}*\n• Total Bill Amount: *₹{total_amount}*\n• Amount Paid: *₹{paid_amount}*\n• Balance Due to Supplier: *₹{balance_due}*\n• Payment Due Date: *{due_date}* ({days_left_text})\n\nPlease ensure this payment is fulfilled to {supplier_name} on or before the due date. The purchase payment statement is attached above.",
            ],
            'purchase_payment_recorded' => [
                'title' => 'Purchase Payment Recorded (To Supplier)',
                'message' => "🧾 *Supplier Payment Recorded*\n\nHello *{user_name}*,\nA payment of *₹{recorded_amount}* has been recorded for supplier bill *#{bill_number}* ({supplier_name}).\n\n📦 *Updated Supplier Balance:*\n• Supplier / Vendor: *{supplier_name}*\n• Supplier Invoice: *#{bill_number}*\n• Total Bill Amount: *₹{total_amount}*\n• Total Paid to Date: *₹{paid_amount}*\n• Remaining Balance Due: *₹{balance_due}* {settled_note}\n• Payment Due Date: *{due_date}*\n\nPlease find your updated purchase voucher & statement attached above as a PDF document.",
            ],
            'custom' => [
                'title' => 'Customer Broadcast & Offers',
                'message' => "Hello {customer_name},\n\nGreetings from *{shop_name}*!\n\nWe are delighted to share our latest collections and exclusive special offers with you.\n\nVisit us or get in touch for details and best pricing.\n\nThank you for being our valued customer!",
            ],
        ];
    }
}
