<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'parent_id',
        'is_locked',
        'trial_ends_at',
    ];

    public function parent()
    {
        return $this->belongsTo(User::class, 'parent_id');
    }

    public function staff()
    {
        return $this->hasMany(User::class, 'parent_id');
    }

    public function getStoreOwnerIdAttribute(): int
    {
        if ($this->isStaff() && $this->parent_id) {
            return (int) $this->parent_id;
        }
        return (int) $this->id;
    }

    public function isStaff(): bool
    {
        return $this->role === 'staff';
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin' || empty($this->role);
    }
    
    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function getEffectiveOwnerId(): int
    {
        if ($this->isSuperAdmin()) {
            $switchedId = 0;
            if (request()?->hasSession()) {
                $switchedId = (int) request()->session()->get('view_as_admin_id');
            } elseif (app()->bound('session')) {
                try {
                    $switchedId = (int) session('view_as_admin_id');
                } catch (\Throwable $e) {
                    $switchedId = 0;
                }
            }
            if ($switchedId > 0) {
                return $switchedId;
            }
            return (int) $this->id;
        }

        if ($this->isStaff() && $this->parent_id) {
            return (int) $this->parent_id;
        }

        return (int) $this->id;
    }

    public function getEffectiveStoreUserIds(): array
    {
        $ownerId = $this->getEffectiveOwnerId();

        if ($ownerId <= 0) {
            return [(int) $this->id];
        }

        // Include the store owner and ONLY their actual staff (role = 'staff' and parent_id = ownerId)
        $ids = self::where('id', $ownerId)
            ->orWhere(function ($q) use ($ownerId) {
                $q->where('parent_id', $ownerId)->where('role', 'staff');
            })
            ->pluck('id')
            ->map(fn($v) => (int) $v)
            ->toArray();

        return !empty($ids) ? $ids : [$ownerId];
    }

    public function isTrialExpired(): bool
    {
        if ($this->isSuperAdmin()) {
            return false;
        }

        return $this->trial_ends_at !== null && now()->gt($this->trial_ends_at);
    }

    public function getDaysLeftInTrialAttribute(): ?int
    {
        if (! $this->trial_ends_at) {
            return null;
        }

        if ($this->isTrialExpired()) {
            return 0;
        }

        return (int) ceil(now()->diffInSeconds($this->trial_ends_at, false) / 86400);
    }

    public function getHoursLeftInTrialAttribute(): ?float
    {
        if (! $this->trial_ends_at) {
            return null;
        }

        if ($this->isTrialExpired()) {
            return 0;
        }

        $minutes = now()->diffInMinutes($this->trial_ends_at, false);
        return round($minutes / 60, 1);
    }

    public function getTrialRemainingFormattedAttribute(): string
    {
        if (! $this->trial_ends_at) {
            return 'Unlimited / Lifetime';
        }

        if ($this->isTrialExpired()) {
            return 'Expired';
        }

        $diffInSeconds = now()->diffInSeconds($this->trial_ends_at, false);
        if ($diffInSeconds <= 0) {
            return 'Expired';
        }

        $hours = floor($diffInSeconds / 3600);
        $minutes = floor(($diffInSeconds % 3600) / 60);

        if ($hours > 48) {
            $days = floor($hours / 24);
            $remHours = $hours % 24;
            return "{$days}d {$remHours}h left";
        }

        if ($hours > 0) {
            return "{$hours}h {$minutes}m left";
        }

        return "{$minutes}m left";
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'trial_ends_at' => 'datetime',
            'is_locked' => 'boolean',
        ];
    }
}
