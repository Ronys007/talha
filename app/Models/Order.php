<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $table = "order_b_s"; // Keep existing table name
    protected $fillable = ['user_id', 'mode', 'customer', 'gst', 'gst_number', 'discount', 'discount_divisor', 'total_price'];

    /**
     * Get the user that owns this order.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class, 'order_b_s_id');
    }

}
