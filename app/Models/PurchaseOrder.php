<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'po_number',
        'purchase_number',
        'supplier_name',
        'gst_number',
        'tax_rate',
        'subtotal',
        'gross_discount',
        'cgst',
        'sgst',
        'igst',
        'total_gst',
        'round_off',
        'order_date',
        'status',
        'is_inventory_synced',
        'total_amount',
        'notes',
        'bill_file',
        'due_date',
        'paid_amount',
        'paid_at',
        'supplier_phone',
    ];

    protected $casts = [
        'order_date' => 'date',
        'due_date' => 'date',
        'paid_at' => 'date',
        'is_inventory_synced' => 'boolean',
    ];

    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }
}
