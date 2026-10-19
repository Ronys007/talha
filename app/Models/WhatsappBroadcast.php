<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WhatsappBroadcast extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'message_template',
        'filter_type',
        'status',
        'total_recipients',
        'sent_count',
        'failed_count',
        'scheduled_at',
        'completed_at',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'completed_at' => 'datetime',
        'total_recipients' => 'integer',
        'sent_count' => 'integer',
        'failed_count' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function logs()
    {
        return $this->hasMany(WhatsappBroadcastLog::class, 'broadcast_id');
    }
}
