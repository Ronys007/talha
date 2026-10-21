<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $table = "combined_data_b_s";
    protected $fillable = ['user_id', 'mode', 'order_b_s_id', 'type', 'amount', 'text'];

    /**
     * Get the user that owns this transaction.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the order associated with this transaction.
     */
    public function order()
    {
        return $this->belongsTo(Order::class, 'order_b_s_id');
    }
}
