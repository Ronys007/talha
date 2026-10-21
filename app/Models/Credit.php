<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Credit extends Model
{
    use HasFactory;

    protected $table = "credit_b_s";
    protected $fillable = ['user_id', 'mode', 'order_b_s_id', 'credit', 'text'];

    /**
     * Get the user that owns this credit.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the order associated with this credit.
     */
    public function order()
    {
        return $this->belongsTo(Order::class, 'order_b_s_id');
    }
}
