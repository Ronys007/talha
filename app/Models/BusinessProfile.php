<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BusinessProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'business_name',
        'address',
        'city',
        'state',
        'pincode',
        'gst_number',
        'phone',
        'email',
        'pan_number',
        'upi_id',
        'google_review_url',
        'terms_and_conditions',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
