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
                'title' => 'New Bill Created (नया बिल)',
                'message' => "Namaste {customer_name} ji! 🙏\n\nAapka bill generate ho gaya hai from *{shop_name}*.\n🧾 Invoice No: *{invoice_no}*\n💰 Total Amount: *₹{total_amount}*\n💳 Paid Amount: *₹{paid_amount}*\n⏳ Balance Due: *₹{balance_due}*\n\n📄 View & Download Bill:\n{invoice_link}\n\n⚡ Quick UPI Pay:\n{upi_link}\n\n⭐ Please rate us on Google:\n{google_review_link}\n\nThank you for shopping with us! Have a great day ahead! 😊",
            ],
            'bill_updated' => [
                'title' => 'Bill Updated / Revised (संशोधित बिल)',
                'message' => "Namaste {customer_name} ji! 🙏\n\nAapka bill update kar diya gaya hai by *{shop_name}*.\n🧾 Revised Invoice No: *{invoice_no}*\n💰 Updated Total: *₹{total_amount}*\n💳 Paid Amount: *₹{paid_amount}*\n⏳ Revised Balance Due: *₹{balance_due}*\n\n📄 View Updated Bill:\n{invoice_link}\n\n⚡ Quick UPI Pay:\n{upi_link}\n\nKisi bhi sahayata ke liye sampark karein. Thank you!",
            ],
            'payment_reminder' => [
                'title' => 'Payment Reminder (उधारी वसूली रिमाइंडर)',
                'message' => "Namaste {customer_name} ji! 🙏\n\nYeh *{shop_name}* ki taraf se aapke pending bill ka gentle payment reminder hai.\n🧾 Invoice No: *{invoice_no}*\n⏳ Pending Balance Due: *₹{balance_due}*\n\nAap neeche diye gaye link se UPI ke dwara turant aasan bhugtan kar sakte hain:\n⚡ Direct UPI Pay Link:\n{upi_link}\n\n📄 View Bill Summary:\n{invoice_link}\n\nAgar aap already bhugtan kar chuke hain toh kripya is sandesh ko ignore karein. Dhanyawad!",
            ],
            'custom' => [
                'title' => 'Festival & Customer Broadcast (फेस्टिवल व नया ऑफर)',
                'message' => "{greeting} {customer_name} ji! 🌸\n\nHumare *{shop_name}* par vishesh offers aur naya stock uplabdh hai!\n\nVisiting card & Address: {shop_name}\nContact us for exciting discounts and best deals!\n\nThank you for being our valued customer!",
            ],
        ];
    }
}
