<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Inventory extends Model
{
    use HasFactory;
    
    protected $table = "inventory_b_s";
    protected $fillable = ['user_id', 'mode', 'item', 'code', 'qty', 'unit', 'selling_price', 'image'];

    /**
     * Compatibility aliases for price, quantity, and barcode
     */
    public function getPriceAttribute()
    {
        return $this->selling_price;
    }

    public function setPriceAttribute($value)
    {
        $this->attributes['selling_price'] = $value;
    }

    public function getQuantityAttribute()
    {
        return $this->qty;
    }

    public function setQuantityAttribute($value)
    {
        $this->attributes['qty'] = $value;
    }

    public function getBarcodeAttribute()
    {
        return $this->code;
    }

    public function setBarcodeAttribute($value)
    {
        $this->attributes['code'] = $value;
    }

    /**
     * Get the user that owns this inventory.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
