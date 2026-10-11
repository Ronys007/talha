<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Receipt extends Model
{
    use HasFactory;
    
    protected $table = "receive_b_s";
    protected $fillable = ['user_id', 'mode', 'order_b_s_id', 'receive', 'text'];

    /**
     * Get the user that owns this receipt.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the order associated with this receipt.
     */
    public function order()
    {
        return $this->belongsTo(Order::class, 'order_b_s_id');
    }
}
