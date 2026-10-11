<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    use HasFactory;
    
    protected $table = "order_items_b_s"; // Keep existing table name
    protected $fillable = ['order_b_s_id', 'mode', 'code', 'item_name', 'selling_price', 'discount_percent', 'quantity'];

    public function order()
    {
        return $this->belongsTo(Order::class, 'order_b_s_id');
    }

    // Join to inventory to resolve item name from code
    public function inventory()
    {
        return $this->belongsTo(Inventory::class, 'code', 'code');
    }
}
