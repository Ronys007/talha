<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Inventory extends Model
{
    use HasFactory;
    
    protected $table = "inventory_b_s";
    protected $fillable = ['user_id', 'mode', 'item', 'code', 'qty', 'selling_price', 'image'];

    /**
     * Get the user that owns this inventory.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

}
