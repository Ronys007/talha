<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'invoice_number',
        'invoice_hash',
        'invoice_date',
        'due_date',
        'status',
        'tax_type',
        'seller_name',
        'seller_address',
        'seller_gst_number',
        'seller_phone',
        'seller_state',
        'customer_name',
        'customer_address',
        'customer_gst_number',
        'customer_phone',
        'customer_state',
        'place_of_supply',
        'subtotal',
        'gross_discount',
        'total_discount',
        'taxable_amount',
        'cgst_amount',
        'sgst_amount',
        'igst_amount',
        'total_tax',
        'round_off',
        'total_amount',
        'paid_amount',
        'payment_qr_scans',
        'paid_at',
        'notes',
        'terms',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'paid_at' => 'date',
        'subtotal' => 'decimal:2',
        'gross_discount' => 'decimal:2',
        'total_discount' => 'decimal:2',
        'taxable_amount' => 'decimal:2',
        'cgst_amount' => 'decimal:2',
        'sgst_amount' => 'decimal:2',
        'igst_amount' => 'decimal:2',
        'total_tax' => 'decimal:2',
        'round_off' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(InvoiceItem::class);
    }

    /**
     * Generate a collision-proof sequential invoice number for given owner(s).
     * Format: INV-YYYY-XXXX
     */
    public static function generateNextNumber(array|int $ownerIds): string
    {
        $ownerIds = is_array($ownerIds) ? $ownerIds : [$ownerIds];
        $year = date('Y');
        $prefix = "INV-{$year}-";

        $existingNumbers = static::whereIn('user_id', $ownerIds)
            ->where('invoice_number', 'like', "{$prefix}%")
            ->pluck('invoice_number');

        $maxNum = 0;
        foreach ($existingNumbers as $num) {
            $suffix = substr($num, strlen($prefix));
            if (is_numeric($suffix)) {
                $maxNum = max($maxNum, (int) $suffix);
            }
        }

        $nextSeq = $maxNum + 1;
        do {
            $candidate = $prefix . str_pad($nextSeq, 4, '0', STR_PAD_LEFT);
            $exists = static::whereIn('user_id', $ownerIds)
                ->where('invoice_number', $candidate)
                ->exists();
            if (!$exists) {
                return $candidate;
            }
            $nextSeq++;
        } while (true);
    }

    protected static function booted()
    {
        static::creating(function ($invoice) {
            if (empty($invoice->invoice_hash)) {
                $invoice->invoice_hash = \Illuminate\Support\Str::random(24);
            }
        });
    }

    public function getPublicUrl(): string
    {
        if (empty($this->invoice_hash)) {
            $this->invoice_hash = \Illuminate\Support\Str::random(24);
            $this->saveQuietly();
        }
        return url('/i/' . $this->invoice_hash);
    }
}
