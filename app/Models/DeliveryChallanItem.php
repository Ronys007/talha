<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeliveryChallanItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'delivery_challan_id',
        'description',
        'quantity',
        'unit',
        'packages',
        'remarks',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'packages' => 'integer',
    ];

    public function deliveryChallan()
    {
        return $this->belongsTo(DeliveryChallan::class);
    }
}
