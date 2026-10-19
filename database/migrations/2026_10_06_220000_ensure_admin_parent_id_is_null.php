<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Admins and SuperAdmins should never have a parent_id (they are independent store owners, not staff)
        DB::table('users')
            ->where(function ($query) {
                $query->where('role', 'admin')
                    ->orWhere('role', 'super_admin')
                    ->orWhereNull('role');
            })
            ->update(['parent_id' => null]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reversal needed
    }
};
