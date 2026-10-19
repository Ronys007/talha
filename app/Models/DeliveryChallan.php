<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeliveryChallan extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'challan_number',
        'challan_date',
        'invoice_id',
        'sales_order_id',
        'customer_name',
        'customer_phone',
        'delivery_address',
        'driver_name',
        'driver_phone',
        'vehicle_number',
        'transporter_name',
        'eway_bill_no',
        'dispatch_time',
        'status',
        'notes',
    ];

    public function items()
    {
        return $this->hasMany(DeliveryChallanItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function salesOrder()
    {
        return $this->belongsTo(SalesOrder::class);
    }
}
