<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Quotation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'quotation_number',
        'quotation_date',
        'valid_until',
        'customer_name',
        'customer_phone',
        'customer_email',
        'customer_address',
        'customer_gst',
        'status',
        'converted_invoice_id',
        'subtotal',
        'gross_discount',
        'total_discount',
        'taxable_amount',
        'total_tax',
        'total_amount',
        'applied_margin_percent',
        'applied_margin_amount',
        'notes',
        'terms',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'gross_discount' => 'decimal:2',
        'total_discount' => 'decimal:2',
        'taxable_amount' => 'decimal:2',
        'total_tax' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'applied_margin_percent' => 'decimal:2',
        'applied_margin_amount' => 'decimal:2',
    ];

    public function items()
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'converted_invoice_id');
    }

    /**
     * Generate a collision-proof sequential quotation number for given owner(s).
     * Format: QT-YYYY-XXXX
     */
    public static function generateNextNumber(array|int $ownerIds): string
    {
        $ownerIds = is_array($ownerIds) ? $ownerIds : [$ownerIds];
        $year = date('Y');
        $prefix = "QT-{$year}-";

        $existingNumbers = static::whereIn('user_id', $ownerIds)
            ->where('quotation_number', 'like', "{$prefix}%")
            ->pluck('quotation_number');

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
                ->where('quotation_number', $candidate)
                ->exists();
            if (!$exists) {
                return $candidate;
            }
            $nextSeq++;
        } while (true);
    }
}
